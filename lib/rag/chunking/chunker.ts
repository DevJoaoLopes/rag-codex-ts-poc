import { estimateTokens } from "./tokenizer";

export type ChunkOptions = {
  targetTokens?: number;
  overlapTokens?: number;
  minChunkTokens?: number;
};

export type TextChunk = {
  chunkText: string;
  startChar: number;
  endChar: number;
  tokenEstimate: number;
  chunkIndex: number;
};

type TextUnit = {
  text: string;
  start: number;
  end: number;
  tokenEstimate: number;
};

const DEFAULT_TARGET_TOKENS = 600;
const DEFAULT_OVERLAP_TOKENS = 80;
const DEFAULT_MIN_CHUNK_TOKENS = 200;

export function normalizeTextLight(text: string): string {
  if (!text) {
    return "";
  }

  const normalizedNewlines = text.replace(/\r\n?/g, "\n");
  const lines = normalizedNewlines.split("\n");

  const outputLines: string[] = [];
  let inCodeFence = false;
  let consecutiveEmptyOutsideFence = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (/^```/.test(trimmedLine)) {
      inCodeFence = !inCodeFence;
      outputLines.push(line);
      consecutiveEmptyOutsideFence = 0;
      continue;
    }

    if (!inCodeFence && trimmedLine.length === 0) {
      consecutiveEmptyOutsideFence += 1;
      if (consecutiveEmptyOutsideFence <= 2) {
        outputLines.push("");
      }
      continue;
    }

    consecutiveEmptyOutsideFence = 0;
    outputLines.push(line);
  }

  return outputLines.join("\n").trim();
}

export function chunkText(text: string, opts: ChunkOptions = {}): TextChunk[] {
  const targetTokens = opts.targetTokens ?? DEFAULT_TARGET_TOKENS;
  const overlapTokens = opts.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
  const minChunkTokens = opts.minChunkTokens ?? DEFAULT_MIN_CHUNK_TOKENS;

  const normalizedText = normalizeTextLight(text);
  if (!normalizedText) {
    return [];
  }

  const units = buildUnits(normalizedText, targetTokens);
  if (units.length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let startUnit = 0;
  let chunkIndex = 0;

  while (startUnit < units.length) {
    let endUnit = startUnit;
    let currentTokens = 0;

    while (endUnit < units.length) {
      const nextTokens = currentTokens + units[endUnit].tokenEstimate;
      const shouldStopAtTarget =
        currentTokens >= minChunkTokens && nextTokens > targetTokens;

      if (shouldStopAtTarget) {
        break;
      }

      currentTokens = nextTokens;
      endUnit += 1;
    }

    if (endUnit === startUnit) {
      endUnit += 1;
    }

    const startChar = units[startUnit].start;
    const endChar = units[endUnit - 1].end;
    const textSlice = normalizedText.slice(startChar, endChar);

    chunks.push({
      chunkText: textSlice,
      startChar,
      endChar,
      tokenEstimate: estimateTokens(textSlice),
      chunkIndex,
    });

    if (endUnit >= units.length) {
      break;
    }

    let nextStartUnit = endUnit;
    let overlapAccumulated = 0;
    while (
      nextStartUnit > startUnit &&
      overlapAccumulated < overlapTokens
    ) {
      nextStartUnit -= 1;
      overlapAccumulated += units[nextStartUnit].tokenEstimate;
    }

    // Garante progresso mesmo com chunks pequenos e overlap grande.
    if (nextStartUnit <= startUnit) {
      nextStartUnit = startUnit + 1;
    }

    startUnit = nextStartUnit;
    chunkIndex += 1;
  }

  return chunks;
}

function buildUnits(text: string, targetTokens: number): TextUnit[] {
  const roughUnits = splitByDoubleNewline(text);
  const units: TextUnit[] = [];

  for (const unit of roughUnits) {
    if (unit.text.trim() === "") {
      units.push(unit);
      continue;
    }

    if (unit.tokenEstimate <= targetTokens) {
      units.push(unit);
      continue;
    }

    units.push(...splitLongUnit(unit, targetTokens));
  }

  return units;
}

function splitByDoubleNewline(text: string): TextUnit[] {
  const units: TextUnit[] = [];
  const separator = /\n{2,}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = separator.exec(text)) !== null) {
    const contentStart = lastIndex;
    const contentEnd = match.index;
    if (contentEnd > contentStart) {
      const content = text.slice(contentStart, contentEnd);
      units.push(createUnit(content, contentStart, contentEnd));
    }

    const sepStart = match.index;
    const sepEnd = separator.lastIndex;
    const sep = text.slice(sepStart, sepEnd);
    units.push(createUnit(sep, sepStart, sepEnd));
    lastIndex = sepEnd;
  }

  if (lastIndex < text.length) {
    units.push(createUnit(text.slice(lastIndex), lastIndex, text.length));
  }

  return units;
}

function splitLongUnit(unit: TextUnit, targetTokens: number): TextUnit[] {
  const lineRegex = /[^\n]*\n|[^\n]+/g;
  const lines = unit.text.match(lineRegex) ?? [unit.text];
  const splitUnits: TextUnit[] = [];

  let buffer = "";
  let localStart = 0;
  let cursor = 0;

  for (const line of lines) {
    const candidate = buffer + line;
    const candidateTokens = estimateTokens(candidate);
    const hasBuffer = buffer.length > 0;

    if (hasBuffer && candidateTokens > targetTokens) {
      const globalStart = unit.start + localStart;
      const globalEnd = globalStart + buffer.length;
      splitUnits.push(createUnit(buffer, globalStart, globalEnd));
      localStart = cursor;
      buffer = line;
    } else {
      buffer = candidate;
    }

    cursor += line.length;
  }

  if (buffer.length > 0) {
    const globalStart = unit.start + localStart;
    const globalEnd = globalStart + buffer.length;
    splitUnits.push(createUnit(buffer, globalStart, globalEnd));
  }

  return splitUnits.length > 0 ? splitUnits : [unit];
}

function createUnit(text: string, start: number, end: number): TextUnit {
  return {
    text,
    start,
    end,
    tokenEstimate: estimateTokens(text),
  };
}

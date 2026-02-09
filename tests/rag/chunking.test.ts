import { describe, expect, it } from "vitest";

import { chunkText, normalizeTextLight } from "../../lib/rag/chunking/chunker";
import { estimateTokens } from "../../lib/rag/chunking/tokenizer";

function generateLongMarkdown(paragraphs = 40): string {
  const section: string[] = [];

  for (let i = 0; i < paragraphs; i += 1) {
    section.push(
      `## Section ${i + 1}\n` +
        `This is paragraph ${i + 1} with enough words to produce a stable token estimate for chunking behavior.\n` +
        `- bullet A for section ${i + 1}\n` +
        `- bullet B with extra context and details to keep content realistic.\n` +
        `\n` +
        "```ts\n" +
        `const section${i + 1} = "value";\n` +
        "```\n",
    );
  }

  return section.join("\n\n");
}

describe("chunkText", () => {
  it("gera chunks com tamanho aproximado ao target", () => {
    const source = generateLongMarkdown(35);
    const chunks = chunkText(source, {
      targetTokens: 120,
      overlapTokens: 20,
      minChunkTokens: 60,
    });

    expect(chunks.length).toBeGreaterThan(3);

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];

      if (i < chunks.length - 1) {
        expect(chunk.tokenEstimate).toBeGreaterThanOrEqual(60);
        expect(chunk.tokenEstimate).toBeLessThanOrEqual(170);
      } else {
        expect(chunk.tokenEstimate).toBeGreaterThan(0);
      }
    }
  });

  it("aplica overlap consistente entre chunks consecutivos", () => {
    const source = generateLongMarkdown(45);
    const normalized = normalizeTextLight(source);
    const overlapTokens = 24;
    const chunks = chunkText(source, {
      targetTokens: 140,
      overlapTokens,
      minChunkTokens: 70,
    });

    expect(chunks.length).toBeGreaterThan(3);

    for (let i = 1; i < chunks.length; i += 1) {
      const prev = chunks[i - 1];
      const current = chunks[i];

      expect(current.startChar).toBeLessThan(prev.endChar);

      const overlapText = normalized.slice(current.startChar, prev.endChar);
      const overlapEstimate = estimateTokens(overlapText);

      expect(overlapEstimate).toBeGreaterThanOrEqual(8);
      expect(overlapEstimate).toBeLessThanOrEqual(overlapTokens * 3);
    }
  });
});

import { ollamaFetchJson } from "./ollamaClient";

export const DEFAULT_OLLAMA_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

type OllamaEmbedResponse = {
  embeddings?: unknown;
  embedding?: unknown;
};

function toVector(value: unknown, index: number): number[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid Ollama embed response: embeddings[${index}] is not an array.`,
    );
  }

  return value.map((entry, entryIndex) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      throw new Error(
        `Invalid Ollama embed response: embeddings[${index}][${entryIndex}] is not a finite number.`,
      );
    }
    return entry;
  });
}

function parseEmbeddings(data: OllamaEmbedResponse): number[][] {
  if (Array.isArray(data.embeddings)) {
    return data.embeddings.map((vector, index) => toVector(vector, index));
  }

  if (Array.isArray(data.embedding)) {
    return [toVector(data.embedding, 0)];
  }

  throw new Error(
    'Invalid Ollama embed response: expected "embeddings" (number[][]) or "embedding" (number[]).',
  );
}

export async function embedText(
  input: string | string[],
  model = DEFAULT_OLLAMA_EMBED_MODEL,
): Promise<number[][]> {
  const data = await ollamaFetchJson<OllamaEmbedResponse>("/api/embed", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
    }),
  });

  return parseEmbeddings(data);
}

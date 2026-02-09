import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { InMemoryVectorStore, makeDocId } from "@/lib/rag/store/inMemoryVectorStore";
import { cosineSimilarity } from "@/lib/rag/retrieval/similarity";
import { retrieve } from "@/lib/rag/retrieval/retriever";

vi.mock("@/lib/ollama/embeddings", () => ({
  embedText: vi.fn(async () => [[1, 0]]),
}));

describe("similarity", () => {
  it("calculates cosine similarity for simple vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 8);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 8);
    expect(cosineSimilarity([1, 1], [1, -1])).toBeCloseTo(0, 8);
  });
});

describe("retrieve", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("respects topK, ordering and metadata filters", async () => {
    const storageDir = mkdtempSync(path.join(tmpdir(), "rag-retriever-"));
    tempDirs.push(storageDir);

    const store = new InMemoryVectorStore(storageDir);
    const docAId = makeDocId({ title: "Doc A", source: "docs/a.md" });
    const docBId = makeDocId({ title: "Doc B", source: "docs/b.md" });

    store.upsertDocuments([
      {
        id: "",
        title: "Doc A",
        source: "docs/a.md",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "",
        title: "Doc B",
        source: "docs/b.md",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    store.upsertChunks([
      {
        id: "a-0",
        docId: docAId,
        text: "A0",
        metadata: { chunkIndex: 0, tags: ["guide", "onboarding"] },
        embedding: [1, 0],
        tokenEstimate: 1,
      },
      {
        id: "a-1",
        docId: docAId,
        text: "A1",
        metadata: { chunkIndex: 1, tags: ["guide"] },
        embedding: [0.9, 0.1],
        tokenEstimate: 1,
      },
      {
        id: "b-0",
        docId: docBId,
        text: "B0",
        metadata: { chunkIndex: 0, tags: ["faq"] },
        embedding: [0, 1],
        tokenEstimate: 1,
      },
    ]);

    const results = await retrieve("onboarding", {
      topK: 1,
      source: "docs/a.md",
      tags: ["guide"],
      store,
    });

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("A0");
    expect(results[0].score).toBeGreaterThan(0.9);
  });
});

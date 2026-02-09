import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  InMemoryVectorStore,
  makeChunkId,
  makeDocId,
} from "@/lib/rag/store/inMemoryVectorStore";

describe("InMemoryVectorStore", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("persists and reloads docs/chunks from JSON storage", () => {
    const storageDir = mkdtempSync(path.join(tmpdir(), "rag-store-"));
    tempDirs.push(storageDir);

    const store = new InMemoryVectorStore(storageDir);
    const docId = makeDocId({
      title: "Guia de onboarding",
      source: "docs/onboarding.md",
    });
    const chunkId = makeChunkId(docId, 0);

    store.upsertDocuments([
      {
        id: "non-deterministic-id",
        title: "Guia de onboarding",
        source: "docs/onboarding.md",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    store.upsertChunks([
      {
        id: "another-non-deterministic-id",
        docId,
        text: "Primeiro passo: configurar ambiente.",
        metadata: { chunkIndex: 0, locale: "pt-BR" },
        embedding: [1, 0, 0],
        tokenEstimate: 6,
      },
    ]);

    const reloadedStore = new InMemoryVectorStore(storageDir);
    const reloadedChunk = reloadedStore.getChunkById(chunkId);
    expect(reloadedChunk).not.toBeNull();
    expect(reloadedChunk?.text).toBe("Primeiro passo: configurar ambiente.");

    const persistedPath = path.join(storageDir, "in-memory-vector-store.json");
    const payload = JSON.parse(readFileSync(persistedPath, "utf8")) as {
      docs: Array<{ id: string }>;
      chunks: Array<{ id: string }>;
    };

    expect(payload.docs).toHaveLength(1);
    expect(payload.chunks).toHaveLength(1);
    expect(payload.docs[0].id).toBe(docId);
    expect(payload.chunks[0].id).toBe(chunkId);
  });

  it("returns topK ordered by descending cosine similarity score", async () => {
    const storageDir = mkdtempSync(path.join(tmpdir(), "rag-store-"));
    tempDirs.push(storageDir);

    const store = new InMemoryVectorStore(storageDir);
    const docId = makeDocId({ title: "Playbook", source: "docs/playbook.md" });

    store.upsertDocuments([
      {
        id: "",
        title: "Playbook",
        source: "docs/playbook.md",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    store.upsertChunks([
      {
        id: "",
        docId,
        text: "A",
        metadata: { chunkIndex: 0 },
        embedding: [1, 0],
        tokenEstimate: 1,
      },
      {
        id: "",
        docId,
        text: "B",
        metadata: { chunkIndex: 1 },
        embedding: [0.8, 0.2],
        tokenEstimate: 1,
      },
      {
        id: "",
        docId,
        text: "C",
        metadata: { chunkIndex: 2 },
        embedding: [0, 1],
        tokenEstimate: 1,
      },
    ]);

    const results = await store.queryByEmbedding([1, 0], 2);
    expect(results).toHaveLength(2);
    expect(results[0].chunk.id).toBe(makeChunkId(docId, 0));
    expect(results[1].chunk.id).toBe(makeChunkId(docId, 1));
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });
});

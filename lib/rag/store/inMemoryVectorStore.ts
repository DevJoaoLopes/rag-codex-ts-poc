import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  ChunkRecord,
  DocRecord,
  VectorStore,
  VectorStoreFilter,
} from "@/lib/rag/store/types";

const DEFAULT_STORAGE_DIR = "./data/storage";
const STORAGE_FILE_NAME = "in-memory-vector-store.json";

type PersistedStore = {
  docs: DocRecord[];
  chunks: ChunkRecord[];
};

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function makeDocId(input: { title: string; source: string }): string {
  return stableHash(`${input.source}::${input.title}`);
}

export function makeChunkId(docId: string, chunkIndex: number): string {
  return stableHash(`${docId}::${chunkIndex}`);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function extractChunkIndex(chunk: ChunkRecord): number | null {
  const maybeIndex = chunk.metadata?.chunkIndex;
  if (typeof maybeIndex === "number" && Number.isInteger(maybeIndex)) {
    return maybeIndex;
  }
  return null;
}

export class InMemoryVectorStore implements VectorStore {
  private readonly docs = new Map<string, DocRecord>();

  private readonly chunks = new Map<string, ChunkRecord>();

  private readonly storagePath: string;

  constructor(storageDir = process.env.RAG_STORAGE_DIR ?? DEFAULT_STORAGE_DIR) {
    this.storagePath = path.join(storageDir, STORAGE_FILE_NAME);
    this.load();
  }

  upsertDocuments(docs: DocRecord[]): void {
    const now = new Date().toISOString();

    for (const doc of docs) {
      const docId = makeDocId({ title: doc.title, source: doc.source });
      const existing = this.docs.get(docId);

      this.docs.set(docId, {
        ...doc,
        id: docId,
        createdAt: existing?.createdAt ?? doc.createdAt ?? now,
        updatedAt: doc.updatedAt ?? now,
      });
    }

    this.save();
  }

  upsertChunks(chunks: ChunkRecord[]): void {
    for (const chunk of chunks) {
      const chunkIndex = extractChunkIndex(chunk);
      const chunkId =
        chunkIndex !== null ? makeChunkId(chunk.docId, chunkIndex) : chunk.id;

      this.chunks.set(chunkId, {
        ...chunk,
        id: chunkId,
      });
    }

    this.save();
  }

  async queryByEmbedding(
    embedding: number[],
    topK: number,
    filter?: VectorStoreFilter,
  ): Promise<Array<{ chunk: ChunkRecord; score: number }>> {
    if (topK <= 0) {
      return [];
    }

    const ranked = [...this.chunks.values()]
      .filter((chunk) => this.matchesFilter(chunk, filter))
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(embedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked;
  }

  getChunkById(id: string): ChunkRecord | null {
    return this.chunks.get(id) ?? null;
  }

  private matchesFilter(chunk: ChunkRecord, filter?: VectorStoreFilter): boolean {
    if (!filter) {
      return true;
    }

    if (filter.docId && chunk.docId !== filter.docId) {
      return false;
    }

    if (filter.docIds && !filter.docIds.includes(chunk.docId)) {
      return false;
    }

    if (filter.source) {
      const doc = this.docs.get(chunk.docId);
      if (!doc || doc.source !== filter.source) {
        return false;
      }
    }

    if (filter.metadata) {
      for (const [key, value] of Object.entries(filter.metadata)) {
        if (chunk.metadata[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private load(): void {
    if (!existsSync(this.storagePath)) {
      return;
    }

    const raw = readFileSync(this.storagePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedStore;

    this.docs.clear();
    this.chunks.clear();

    for (const doc of parsed.docs ?? []) {
      this.docs.set(doc.id, doc);
    }

    for (const chunk of parsed.chunks ?? []) {
      this.chunks.set(chunk.id, chunk);
    }
  }

  private save(): void {
    mkdirSync(path.dirname(this.storagePath), { recursive: true });
    const payload: PersistedStore = {
      docs: [...this.docs.values()],
      chunks: [...this.chunks.values()],
    };
    writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), "utf8");
  }
}

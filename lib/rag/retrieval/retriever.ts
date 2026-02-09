import { embedText } from "@/lib/ollama/embeddings";
import { InMemoryVectorStore } from "@/lib/rag/store/inMemoryVectorStore";
import type {
  ChunkRecord,
  VectorStore,
  VectorStoreFilter,
} from "@/lib/rag/store/types";

export type RetrieveOptions = {
  topK?: number;
  source?: string;
  tags?: string[];
  store?: VectorStore;
};

export type RetrievedChunk = {
  text: string;
  metadata: ChunkRecord["metadata"];
  score: number;
  chunkId: string;
};

function hasTags(chunk: ChunkRecord, tags?: string[]): boolean {
  if (!tags || tags.length === 0) {
    return true;
  }

  const chunkTags = chunk.metadata.tags;
  if (!Array.isArray(chunkTags)) {
    return false;
  }

  const normalized = chunkTags.filter((tag): tag is string => typeof tag === "string");
  return tags.every((tag) => normalized.includes(tag));
}

export async function retrieve(
  query: string,
  opts: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const topK = opts.topK ?? 8;
  if (topK <= 0) {
    return [];
  }

  const store = opts.store ?? new InMemoryVectorStore();

  const embeddings = await embedText(query);
  const queryEmbedding = embeddings[0];
  if (!queryEmbedding) {
    return [];
  }

  const storeFilter: VectorStoreFilter | undefined = opts.source
    ? { source: opts.source }
    : undefined;

  const candidateTopK = opts.tags?.length
    ? Math.max(topK * 4, topK)
    : topK;

  const ranked = await store.queryByEmbedding(queryEmbedding, candidateTopK, storeFilter);

  return ranked
    .filter((item) => hasTags(item.chunk, opts.tags))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => ({
      text: item.chunk.text,
      metadata: item.chunk.metadata,
      score: item.score,
      chunkId: item.chunk.id,
    }));
}

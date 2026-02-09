export type ChunkMetadata = Record<string, unknown> & {
  chunkIndex?: number;
};

export type ChunkRecord = {
  id: string;
  docId: string;
  text: string;
  metadata: ChunkMetadata;
  embedding: number[];
  tokenEstimate: number;
};

export type DocRecord = {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type VectorStoreFilter = {
  docId?: string;
  docIds?: string[];
  source?: string;
  metadata?: Record<string, string | number | boolean>;
};

export interface VectorStore {
  upsertDocuments(docs: DocRecord[]): void;
  upsertChunks(chunks: ChunkRecord[]): void;
  queryByEmbedding(
    embedding: number[],
    topK: number,
    filter?: VectorStoreFilter,
  ): Promise<Array<{ chunk: ChunkRecord; score: number }>>;
  getChunkById(id: string): ChunkRecord | null;
}

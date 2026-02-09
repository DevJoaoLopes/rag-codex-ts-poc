import { createHash } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { embedText } from "@/lib/ollama/embeddings";
import { chunkText } from "@/lib/rag/chunking/chunker";
import { InMemoryVectorStore, makeChunkId } from "@/lib/rag/store/inMemoryVectorStore";
import type { ChunkRecord, DocRecord } from "@/lib/rag/store/types";

export const DEFAULT_DOCUMENTS_DIR = "./data/documents";
export const DEFAULT_STORAGE_DIR = "./data/storage";
export const STORAGE_FILE_NAME = "in-memory-vector-store.json";

type ParsedFile = {
  absolutePath: string;
  relativePath: string;
};

export type IngestOptions = {
  dir?: string;
  reset?: boolean;
  limit?: number;
  storageDir?: string;
};

export type IngestSummary = {
  docs: number;
  chunks: number;
  storagePath: string;
};

function hashPath(relativePath: string): string {
  return createHash("sha256").update(relativePath).digest("hex");
}

async function collectDocumentFiles(rootDir: string): Promise<ParsedFile[]> {
  const rootAbsolute = path.resolve(rootDir);
  const files: ParsedFile[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!/\.(md|txt)$/i.test(entry.name)) {
        continue;
      }

      files.push({
        absolutePath,
        relativePath: path.relative(rootAbsolute, absolutePath),
      });
    }
  }

  await walk(rootAbsolute);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

async function resetStorage(storageDir: string): Promise<void> {
  const storagePath = path.join(storageDir, STORAGE_FILE_NAME);
  await rm(storagePath, { force: true });
}

export async function ingestDocuments(options: IngestOptions = {}): Promise<IngestSummary> {
  const dir = options.dir ?? DEFAULT_DOCUMENTS_DIR;
  const storageDir =
    options.storageDir ?? process.env.RAG_STORAGE_DIR ?? DEFAULT_STORAGE_DIR;

  if (options.reset) {
    await resetStorage(storageDir);
  }

  const store = new InMemoryVectorStore(storageDir);
  const files = await collectDocumentFiles(dir);
  const selectedFiles =
    typeof options.limit === "number" ? files.slice(0, options.limit) : files;

  let totalChunks = 0;
  let ingestedDocs = 0;

  for (const file of selectedFiles) {
    const rawText = await readFile(file.absolutePath, "utf8");
    const chunks = chunkText(rawText);

    if (chunks.length === 0) {
      continue;
    }

    const docId = hashPath(file.relativePath);
    const now = new Date().toISOString();
    const title = path.basename(file.relativePath);

    const doc: DocRecord = {
      id: docId,
      title,
      source: file.relativePath,
      createdAt: now,
      updatedAt: now,
    };

    const chunkRecords: ChunkRecord[] = [];

    for (const chunk of chunks) {
      const embeddings = await embedText(chunk.chunkText);
      const embedding = embeddings[0];
      if (!embedding) {
        continue;
      }

      chunkRecords.push({
        id: makeChunkId(docId, chunk.chunkIndex),
        docId,
        text: chunk.chunkText,
        embedding,
        tokenEstimate: chunk.tokenEstimate,
        metadata: {
          chunkIndex: chunk.chunkIndex,
          startChar: chunk.startChar,
          endChar: chunk.endChar,
          source: file.relativePath,
          title,
        },
      });
    }

    if (chunkRecords.length === 0) {
      continue;
    }

    store.upsertDocuments([doc]);
    store.upsertChunks(chunkRecords);

    ingestedDocs += 1;
    totalChunks += chunkRecords.length;
  }

  return {
    docs: ingestedDocs,
    chunks: totalChunks,
    storagePath: path.join(storageDir, STORAGE_FILE_NAME),
  };
}

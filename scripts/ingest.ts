import { createHash } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { embedText } from "@/lib/ollama/embeddings";
import { chunkText } from "@/lib/rag/chunking/chunker";
import { InMemoryVectorStore, makeChunkId } from "@/lib/rag/store/inMemoryVectorStore";
import type { ChunkRecord, DocRecord } from "@/lib/rag/store/types";

type CliArgs = {
  dir: string;
  reset: boolean;
  limit?: number;
};

type ParsedFile = {
  absolutePath: string;
  relativePath: string;
};

const DEFAULT_DIR = "./data/documents";
const DEFAULT_STORAGE_DIR = "./data/storage";
const STORAGE_FILE = "in-memory-vector-store.json";

function parseArgs(argv: string[]): CliArgs {
  let dir = DEFAULT_DIR;
  let reset = false;
  let limit: number | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dir") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Missing value for --dir");
      }
      dir = value;
      i += 1;
      continue;
    }

    if (arg === "--reset") {
      reset = true;
      continue;
    }

    if (arg === "--limit") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Missing value for --limit");
      }
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      limit = parsed;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dir, reset, limit };
}

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

async function resetStorageIfRequested(reset: boolean): Promise<void> {
  if (!reset) {
    return;
  }

  const storageDir = process.env.RAG_STORAGE_DIR ?? DEFAULT_STORAGE_DIR;
  const storagePath = path.join(storageDir, STORAGE_FILE);
  await rm(storagePath, { force: true });
}

async function run(): Promise<void> {
  const startedAt = Date.now();
  const { dir, reset, limit } = parseArgs(process.argv.slice(2));

  await resetStorageIfRequested(reset);

  const store = new InMemoryVectorStore();
  const files = await collectDocumentFiles(dir);
  const selectedFiles = typeof limit === "number" ? files.slice(0, limit) : files;

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

  const elapsedMs = Date.now() - startedAt;
  console.log(`docs: ${ingestedDocs}`);
  console.log(`chunks: ${totalChunks}`);
  console.log(`tempo: ${elapsedMs}ms`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

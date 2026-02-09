import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { embedText } from "@/lib/ollama/embeddings";
import {
  DEFAULT_STORAGE_DIR,
  STORAGE_FILE_NAME,
  ingestDocuments,
} from "@/lib/rag/ingest/ingestDocuments";
import { retrieve } from "@/lib/rag/retrieval/retriever";

type CliArgs = {
  reset: boolean;
};

const DEFAULT_BASE_URL = "http://localhost:11435/api";
const DEFAULT_LLM_MODEL = "llama3.1:8b";
const DEFAULT_EMBED_MODEL = "nomic-embed-text";
const SERVER_PORT = 3000;

function parseArgs(argv: string[]): CliArgs {
  let reset = false;

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    }
    if (arg === "--reset") {
      reset = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { reset };
}

function logStep(message: string): void {
  console.log(`• ${message}`);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 45_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // ignore until timeout
    }
    await delay(500);
  }

  throw new Error(`Server did not become ready at ${url}`);
}

async function stopServer(proc: ReturnType<typeof spawn> | null): Promise<void> {
  if (!proc || proc.killed) {
    return;
  }

  proc.kill("SIGTERM");

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (!proc.killed) {
        proc.kill("SIGKILL");
      }
      resolve();
    }, 5_000);

    proc.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function run(): Promise<void> {
  const { reset } = parseArgs(process.argv.slice(2));
  const baseUrl = process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL;

  logStep(`Validando Ollama em ${baseUrl}`);
  const embeddings = await embedText("smoke-test", DEFAULT_EMBED_MODEL);
  if (!embeddings[0]?.length) {
    throw new Error("Ollama embed não retornou vetor válido.");
  }

  logStep(`Ingestão em ${process.env.RAG_STORAGE_DIR ?? DEFAULT_STORAGE_DIR}`);
  const ingestSummary = await ingestDocuments({ reset });
  if (ingestSummary.chunks <= 0) {
    throw new Error("Ingestão não gerou chunks.");
  }

  const storagePath =
    ingestSummary.storagePath ||
    path.join(process.env.RAG_STORAGE_DIR ?? DEFAULT_STORAGE_DIR, STORAGE_FILE_NAME);
  const rawStorage = await readFile(storagePath, "utf8");
  const parsedStorage = JSON.parse(rawStorage) as { chunks?: unknown[] };
  if (!Array.isArray(parsedStorage.chunks) || parsedStorage.chunks.length === 0) {
    throw new Error("Storage não contém chunks persistidos.");
  }

  logStep("Executando retrieval com query de validação.");
  const hits = await retrieve("Qual é a política de férias?", { topK: 4 });
  if (hits.length === 0) {
    throw new Error("Retrieve não retornou chunks.");
  }
  if (typeof hits[0]?.score !== "number") {
    throw new Error("Retrieve não retornou score numérico.");
  }

  logStep("Subindo Next.js dev server para teste do /api/chat.");
  const devServer = spawn("pnpm", ["dev", "--", "--port", String(SERVER_PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
      NEXT_TELEMETRY_DISABLED: "1",
      OLLAMA_BASE_URL: baseUrl,
      OLLAMA_LLM_MODEL: process.env.OLLAMA_LLM_MODEL ?? DEFAULT_LLM_MODEL,
      OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL ?? DEFAULT_EMBED_MODEL,
    },
  });

  devServer.stdout?.on("data", (data) => {
    const line = data.toString().trim();
    if (line) {
      console.log(line);
    }
  });
  devServer.stderr?.on("data", (data) => {
    const line = data.toString().trim();
    if (line) {
      console.error(line);
    }
  });

  try {
    await waitForServer(`http://localhost:${SERVER_PORT}`);

    const response = await fetch(`http://localhost:${SERVER_PORT}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Qual é a política de férias?",
          },
        ],
        strictMode: true,
        topK: 8,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Falha no /api/chat: ${response.status} ${response.statusText} - ${text}`,
      );
    }

    const text = await response.text();
    if (!text.includes("Fontes")) {
      throw new Error("Resposta do /api/chat não contém seção Fontes.");
    }
    if (!/chunkId/i.test(text)) {
      throw new Error("Resposta do /api/chat não contém chunkId.");
    }

    logStep("Smoke test finalizado com sucesso.");
  } finally {
    await stopServer(devServer);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

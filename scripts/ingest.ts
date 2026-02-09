import { ingestDocuments } from "@/lib/rag/ingest/ingestDocuments";

type CliArgs = {
  dir: string;
  reset: boolean;
  limit?: number;
};

const DEFAULT_DIR = "./data/documents";

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

async function run(): Promise<void> {
  const startedAt = Date.now();
  const { dir, reset, limit } = parseArgs(process.argv.slice(2));

  const { docs, chunks } = await ingestDocuments({ dir, reset, limit });

  const elapsedMs = Date.now() - startedAt;
  console.log(`docs: ${docs}`);
  console.log(`chunks: ${chunks}`);
  console.log(`tempo: ${elapsedMs}ms`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

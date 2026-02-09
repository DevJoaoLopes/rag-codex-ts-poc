import { embedText } from "@/lib/ollama/embeddings";
import { InMemoryVectorStore } from "@/lib/rag/store/inMemoryVectorStore";

function parseArgs(argv: string[]): { question: string; topK: number } {
  if (argv.length === 0) {
    throw new Error("Usage: pnpm query -- \"sua pergunta\" [--topK 8]");
  }

  const [question, ...rest] = argv;
  let topK = 8;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--topK") {
      const value = rest[i + 1];
      if (!value) {
        throw new Error("Missing value for --topK");
      }
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--topK must be a positive integer");
      }
      topK = parsed;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { question, topK };
}

async function run(): Promise<void> {
  const { question, topK } = parseArgs(process.argv.slice(2));
  const store = new InMemoryVectorStore();

  const embeddings = await embedText(question);
  const queryEmbedding = embeddings[0];
  if (!queryEmbedding) {
    throw new Error("No embedding returned for query");
  }

  const results = await store.queryByEmbedding(queryEmbedding, topK);

  if (results.length === 0) {
    console.log("Nenhum chunk encontrado.");
    return;
  }

  for (const [index, item] of results.entries()) {
    console.log(`\n#${index + 1}`);
    console.log(`score: ${item.score.toFixed(4)}`);
    console.log(`chunkId: ${item.chunk.id}`);
    console.log(`metadata: ${JSON.stringify(item.chunk.metadata)}`);
    console.log(item.chunk.text);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

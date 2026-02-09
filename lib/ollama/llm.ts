import { ollamaFetch } from "./ollamaClient";

export const DEFAULT_OLLAMA_LLM_MODEL =
  process.env.OLLAMA_LLM_MODEL ?? "llama3.1:8b";

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export async function chatStream(
  messages: OllamaChatMessage[],
  model = DEFAULT_OLLAMA_LLM_MODEL,
): Promise<ReadableStream<Uint8Array>> {
  const response = await ollamaFetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.body) {
    throw new Error("Ollama chat response did not include a stream body.");
  }

  return response.body;
}

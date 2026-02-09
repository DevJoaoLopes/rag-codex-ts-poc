import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";

import { retrieve } from "@/lib/rag/retrieval/retriever";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11435/api";
const DEFAULT_OLLAMA_MODEL = "llama3.1:8b";

const requestSchema = z.object({
  messages: z.array(z.unknown()),
  strictMode: z.boolean().optional(),
  topK: z.number().int().min(1).max(20).optional(),
});

function buildSystemPrompt(strictMode: boolean, topK: number): string {
  if (strictMode) {
    return [
      "Você é um assistente RAG com modo estrito.",
      "Responda SOMENTE com base no conteúdo retornado pela tool `retrieve`.",
      "Se não houver fontes, diga explicitamente que não encontrou na base.",
      "Nunca invente fatos fora das fontes.",
      `Use até ${topK} chunks relevantes para responder.`,
      'Termine SEMPRE com a seção final "Fontes".',
      "Na seção Fontes, inclua source/title + chunkId e, se disponível, score.",
    ].join(" ");
  }

  return [
    "Você é um assistente RAG.",
    "Priorize a tool `retrieve` para responder.",
    'Termine SEMPRE com a seção final "Fontes".',
    "Na seção Fontes, inclua source/title + chunkId e, se disponível, score.",
  ].join(" ");
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const strictMode = parsed.data.strictMode ?? true;
    const requestTopK = parsed.data.topK ?? 8;

    const ollama = createOllama({
      baseURL: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
      compatibility: "strict",
    });

    const result = streamText({
      model: ollama(process.env.OLLAMA_LLM_MODEL ?? DEFAULT_OLLAMA_MODEL),
      system: buildSystemPrompt(strictMode, requestTopK),
      messages: await convertToModelMessages(parsed.data.messages as never[]),
      stopWhen: stepCountIs(6),
      tools: {
        retrieve: tool({
          description:
            "Busca chunks relevantes na base vetorial local para responder perguntas do usuário.",
          inputSchema: z.object({
            query: z.string().min(1),
            topK: z.number().int().min(1).max(20).optional(),
          }),
          execute: async ({ query, topK }) => {
            const hits = await retrieve(query, {
              topK: topK ?? requestTopK,
            });

            return {
              results: hits,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: parsed.data.messages as never[],
      onError: (error) => (error instanceof Error ? error.message : "Unknown error"),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

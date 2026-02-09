"use client";

import { DefaultChatTransport, UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { FormEvent, useMemo, useState } from "react";

import { SourcesPanel } from "@/app/components/SourcesPanel";

type RetrievedSource = {
  text: string;
  metadata: Record<string, unknown>;
  score: number;
  chunkId: string;
};

type ChatMessage = UIMessage<
  unknown,
  never,
  {
    retrieve: {
      input: {
        query: string;
        topK?: number;
      };
      output: {
        results: RetrievedSource[];
      };
    };
  }
>;

function extractSources(messages: ChatMessage[]): RetrievedSource[] {
  const sources: RetrievedSource[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "tool-retrieve") {
        continue;
      }

      if (part.state !== "output-available") {
        continue;
      }

      const output = part.output;
      if (!output || !Array.isArray(output.results)) {
        continue;
      }

      for (const item of output.results) {
        sources.push(item);
      }
    }
  }

  return sources;
}

function isRetrieving(messages: ChatMessage[]): boolean {
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "tool-retrieve") {
        continue;
      }
      if (part.state === "input-streaming" || part.state === "input-available") {
        return true;
      }
    }
  }
  return false;
}

export function Chat() {
  const [strictMode, setStrictMode] = useState(true);
  const [topK, setTopK] = useState(8);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatMessage>({
        api: "/api/chat",
        body: {
          strictMode,
          topK,
        },
      }),
    [strictMode, topK],
  );

  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    transport,
  });

  const sources = useMemo(() => extractSources(messages), [messages]);
  const retrieving = status === "streaming" && isRetrieving(messages);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const question = input.trim();
    if (!question) {
      return;
    }

    setInput("");
    await sendMessage({ text: question });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold text-slate-900">RAG Chat</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(event) => setStrictMode(event.target.checked)}
            />
            strictMode
          </label>

          <label className="inline-flex items-center gap-2">
            topK
            <select
              value={topK}
              onChange={(event) => setTopK(Number.parseInt(event.target.value, 10))}
              className="rounded border border-slate-300 bg-white px-2 py-1"
            >
              {[4, 6, 8, 10, 12].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <span className="text-slate-600">status: {status}</span>
          {retrieving ? <span className="text-amber-700">buscando na base...</span> : null}
        </div>
      </header>

      <div className="grid flex-1 gap-4 md:grid-cols-[1.8fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <article key={message.id} className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {message.role}
                </p>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <p key={`${message.id}-${index}`} className="whitespace-pre-wrap text-sm text-slate-900">
                        {part.text}
                      </p>
                    );
                  }

                  if (part.type === "tool-retrieve") {
                    if (part.state === "output-available") {
                      return (
                        <p key={`${message.id}-${index}`} className="text-xs text-slate-500">
                          retrieve: {part.output.results.length} chunks
                        </p>
                      );
                    }

                    return (
                      <p key={`${message.id}-${index}`} className="text-xs text-amber-700">
                        retrieve: buscando...
                      </p>
                    );
                  }

                  return null;
                })}
              </article>
            ))}
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">Envie uma pergunta para consultar a base.</p>
            ) : null}
          </div>
        </section>

        <SourcesPanel sources={sources} />
      </div>

      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Pergunte algo sobre os documentos"
          />
          <button
            type="submit"
            disabled={status !== "ready"}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            send
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error.message}</p> : null}
      </form>
    </div>
  );
}

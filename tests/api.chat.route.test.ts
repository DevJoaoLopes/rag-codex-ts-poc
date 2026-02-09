import { describe, expect, it, vi } from "vitest";

const { retrieveMock, streamTextMock } = vi.hoisted(() => ({
  retrieveMock: vi.fn(async () => [
    {
      text: "chunk",
      metadata: { source: "docs/a.md", title: "A" },
      score: 0.99,
      chunkId: "abc",
    },
  ]),
  streamTextMock: vi.fn((options: unknown) => ({
    toUIMessageStreamResponse: vi.fn(() => new Response("ok", { status: 200 })),
    _options: options,
  })),
}));

vi.mock("@/lib/rag/retrieval/retriever", () => ({
  retrieve: retrieveMock,
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<object>("ai");
  return {
    ...actual,
    streamText: streamTextMock,
    convertToModelMessages: vi.fn(async (messages) => messages),
    stepCountIs: vi.fn(() => undefined),
    tool: vi.fn((definition) => definition),
  };
});

import { retrieve } from "@/lib/rag/retrieval/retriever";
import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  it("returns 400 for invalid payload", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: "invalid" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it("wires retrieve tool execution", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "pergunta" }],
          },
        ],
        topK: 3,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(streamTextMock).toHaveBeenCalledTimes(1);

    const streamOptions = streamTextMock.mock.calls[0][0];
    await streamOptions.tools.retrieve.execute({ query: "pergunta", topK: 2 });

    expect(retrieve).toHaveBeenCalledWith("pergunta", { topK: 2 });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { embedText } from "../../lib/ollama/embeddings";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("embedText", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses embeddings for string input", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        embeddings: [[0.1, -0.2, 0.3]],
      }),
    );

    const result = await embedText("hello", "nomic-embed-text");

    expect(result).toEqual([[0.1, -0.2, 0.3]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:11435/api/embed");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({
        model: "nomic-embed-text",
        input: "hello",
      }),
    );
  });

  it("parses embeddings for array input", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        embeddings: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      }),
    );

    const result = await embedText(["a", "b"], "nomic-embed-text");

    expect(result).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it("fails with useful message when response has no embeddings field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ model: "nomic-embed-text" }));

    await expect(embedText("hello")).rejects.toThrow(
      'Invalid Ollama embed response: expected "embeddings" (number[][]) or "embedding" (number[]).',
    );
  });

  it("fails with useful message when embedding value is invalid", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        embeddings: [[0.1, "oops", 0.3]],
      }),
    );

    await expect(embedText("hello")).rejects.toThrow(
      "Invalid Ollama embed response: embeddings[0][1] is not a finite number.",
    );
  });
});

export const DEFAULT_OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11435/api";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 300;

export type OllamaRequestOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

function joinBaseAndPath(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const baseHasApiSuffix = normalizedBase.endsWith("/api");

  let normalizedPath = path.trim();
  if (baseHasApiSuffix && normalizedPath.startsWith("/api/")) {
    normalizedPath = normalizedPath.slice("/api".length);
  }
  normalizedPath = normalizedPath.replace(/^\/+/, "");

  if (!normalizedPath) {
    return normalizedBase;
  }

  return `${normalizedBase}/${normalizedPath}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function trimForError(value: string, maxLength = 400): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}...`;
}

export async function ollamaFetch(
  path: string,
  init: RequestInit = {},
  options: OllamaRequestOptions = {},
): Promise<Response> {
  const baseUrl = options.baseUrl ?? DEFAULT_OLLAMA_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const url = joinBaseAndPath(baseUrl, path);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(`Request timed out after ${timeoutMs}ms`);
    }, timeoutMs);

    try {
      const signal = init.signal
        ? AbortSignal.any([init.signal, timeoutController.signal])
        : timeoutController.signal;

      const response = await fetch(url, { ...init, signal });

      if (!response.ok) {
        const responseText = trimForError(await response.text());
        const err = new Error(
          `Ollama request failed (${response.status} ${response.statusText}) for ${path}: ${responseText || "<empty response>"}`,
        );

        if (attempt < retries && shouldRetryStatus(response.status)) {
          lastError = err;
          await delay(retryDelayMs * (attempt + 1));
          continue;
        }

        throw err;
      }

      return response;
    } catch (error) {
      const isAbortByCaller = init.signal?.aborted ?? false;
      if (isAbortByCaller) {
        throw error;
      }

      if (attempt < retries) {
        lastError = error;
        await delay(retryDelayMs * (attempt + 1));
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Ollama request failed after retries.");
}

export async function ollamaFetchJson<T>(
  path: string,
  init: RequestInit = {},
  options: OllamaRequestOptions = {},
): Promise<T> {
  const response = await ollamaFetch(path, init, options);
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse Ollama JSON response for ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

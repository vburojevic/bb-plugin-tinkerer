// Typed HTTP client for the Tinkerer Club platform API.
//
// Every procedure is `POST https://app.tinkerer.club/api/v1/<ns>/<proc>` with
// a JSON object body (`{}` when there is no input) and an `x-api-key` header.
// Success is `{ data, path }`; failure is `{ code, error, path }`, where a
// BAD_REQUEST `error` may itself be a JSON string of Zod issues.
//
// The client is pure over its inputs (key getter, fetch, clock) so it is
// testable without a network, and it owns the one small cache the plugin
// has: reads that ask for a `ttlMs` are memoized per (path, input) until the
// ttl passes, the key changes, or a matching `invalidate(prefix)` runs.

export const TINKERER_BASE_URL = "https://app.tinkerer.club";
export const TINKERER_API_BASE = `${TINKERER_BASE_URL}/api/v1`;

export type TinkererErrorCode =
  | "no_key"
  | "invalid_key"
  | "network"
  | "bad_response"
  | (string & {});

export class TinkererError extends Error {
  readonly code: TinkererErrorCode;
  readonly status: number | null;
  readonly path: string | null;
  constructor(code: TinkererErrorCode, message: string, options: { status?: number | null; path?: string | null } = {}) {
    super(message);
    this.name = "TinkererError";
    this.code = code;
    this.status = options.status ?? null;
    this.path = options.path ?? null;
  }
}

export interface CallOptions {
  /** Memoize a successful result for this long. Omit for no caching. */
  ttlMs?: number;
  signal?: AbortSignal;
}

export interface TinkererClient {
  call<T = unknown>(path: string, input: Record<string, unknown>, options?: CallOptions): Promise<T>;
  /** Drop cached entries whose path starts with `prefix` (all when omitted). */
  invalidate(prefix?: string): void;
  hasKey(): boolean;
}

export interface ClientDeps {
  getKey: () => string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface CacheEntry {
  key: string;
  expiresAt: number;
  value: unknown;
}

/** Turn a Zod issue array (as the platform serializes it) into one line. */
function flattenIssues(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const parts = parsed
      .map((issue) => {
        if (typeof issue !== "object" || issue === null) return null;
        const record = issue as { path?: unknown; message?: unknown };
        const path = Array.isArray(record.path) ? record.path.join(".") : "";
        const message = typeof record.message === "string" ? record.message : "";
        return path.length > 0 ? `${path}: ${message}` : message;
      })
      .filter((part): part is string => part !== null && part.length > 0);
    return parts.length > 0 ? parts.join("; ") : null;
  } catch {
    return null;
  }
}

export function createTinkererClient(deps: ClientDeps): TinkererClient {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();

  async function request(path: string, input: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    const key = deps.getKey();
    if (key.length === 0) {
      throw new TinkererError("no_key", "No Tinkerer Club API key is configured.");
    }
    let response: Response;
    try {
      response = await fetchImpl(`${TINKERER_API_BASE}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key },
        body: JSON.stringify(input),
        signal,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new TinkererError("network", `Could not reach app.tinkerer.club: ${message}`);
    }
    let body: unknown = null;
    const text = await response.text();
    try {
      body = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      throw new TinkererError("bad_response", `Non-JSON response (${response.status}) from ${path}`, {
        status: response.status,
      });
    }
    const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    if (response.ok && "data" in record) {
      return record.data;
    }
    const code = typeof record.code === "string" ? record.code : `HTTP_${response.status}`;
    const rawError = typeof record.error === "string" ? record.error : `Request failed (${response.status})`;
    const message = (code === "BAD_REQUEST" ? flattenIssues(rawError) : null) ?? rawError;
    const errorPath = typeof record.path === "string" ? record.path : null;
    if (response.status === 401) {
      throw new TinkererError("invalid_key", "Tinkerer Club rejected the API key.", { status: 401, path: errorPath });
    }
    throw new TinkererError(code, message, { status: response.status, path: errorPath });
  }

  return {
    hasKey: () => deps.getKey().length > 0,
    invalidate(prefix = "") {
      for (const cacheKey of cache.keys()) {
        if (cacheKey.startsWith(prefix)) cache.delete(cacheKey);
      }
    },
    async call<T>(path: string, input: Record<string, unknown>, options: CallOptions = {}): Promise<T> {
      const ttl = options.ttlMs ?? 0;
      const cacheKey = `${path}\u0000${JSON.stringify(input)}`;
      if (ttl > 0) {
        const hit = cache.get(cacheKey);
        if (hit !== undefined && hit.key === deps.getKey() && hit.expiresAt > now()) {
          return hit.value as T;
        }
      }
      const value = await request(path, input, options.signal);
      if (ttl > 0) {
        cache.set(cacheKey, { key: deps.getKey(), expiresAt: now() + ttl, value });
      }
      return value as T;
    },
  };
}

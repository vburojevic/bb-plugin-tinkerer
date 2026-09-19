import { describe, expect, it, vi } from "vitest";
import { createTinkererClient, TinkererError } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("tinkerer client", () => {
  it("posts JSON with the x-api-key header and unwraps data", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { data: { level: 7 }, path: "leaderboard.myLevel" }),
    );
    const client = createTinkererClient({ getKey: () => "tnk_test", fetchImpl });
    const result = await client.call<{ level: number }>("leaderboard/myLevel", {});
    expect(result).toEqual({ level: 7 });
    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://app.tinkerer.club/api/v1/leaderboard/myLevel");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("x-api-key")).toBe("tnk_test");
    expect(init.body).toBe("{}");
  });

  it("throws a no_key error without calling fetch when the key is missing", async () => {
    const fetchImpl = vi.fn();
    const client = createTinkererClient({ getKey: () => "", fetchImpl });
    await expect(client.call("user/getCurrentUser", {})).rejects.toMatchObject({
      code: "no_key",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalizes platform errors into TinkererError with code, status and path", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(403, { code: "FORBIDDEN", error: "Admins only", path: "admin.listMembers" }),
    );
    const client = createTinkererClient({ getKey: () => "k", fetchImpl });
    const error = await client.call("admin/listMembers", {}).catch((e) => e);
    expect(error).toBeInstanceOf(TinkererError);
    expect(error).toMatchObject({
      code: "FORBIDDEN",
      status: 403,
      message: "Admins only",
      path: "admin.listMembers",
    });
  });

  it("flattens zod-style BAD_REQUEST arrays into one readable message", async () => {
    const issues = JSON.stringify([
      { code: "invalid_value", path: ["period"], message: 'Invalid option: expected one of "today"|"week"' },
    ]);
    const fetchImpl = vi.fn(async () =>
      jsonResponse(400, { code: "BAD_REQUEST", error: issues, path: "leaderboard.githubCommits" }),
    );
    const client = createTinkererClient({ getKey: () => "k", fetchImpl });
    const error = await client.call("leaderboard/githubCommits", { period: "weekly" }).catch((e) => e);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe('period: Invalid option: expected one of "today"|"week"');
  });

  it("maps 401 to invalid_key and network failures to network", async () => {
    const unauthorized = createTinkererClient({
      getKey: () => "k",
      fetchImpl: async () => jsonResponse(401, { code: "UNAUTHORIZED", error: "nope", path: "x" }),
    });
    await expect(unauthorized.call("user/getCurrentUser", {})).rejects.toMatchObject({
      code: "invalid_key",
      status: 401,
    });
    const offline = createTinkererClient({
      getKey: () => "k",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await expect(offline.call("user/getCurrentUser", {})).rejects.toMatchObject({ code: "network" });
  });

  it("serves repeated reads from the TTL cache and expires them", async () => {
    let now = 1_000;
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: { n: 1 }, path: "p" }));
    const client = createTinkererClient({ getKey: () => "k", fetchImpl, now: () => now });
    await client.call("topic/list", {}, { ttlMs: 60_000 });
    await client.call("topic/list", {}, { ttlMs: 60_000 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    // A different input is a different cache entry.
    await client.call("topic/list", { x: 1 }, { ttlMs: 60_000 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    now += 60_001;
    await client.call("topic/list", {}, { ttlMs: 60_000 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does not cache without a ttl, and invalidate() drops matching entries", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: 1, path: "p" }));
    const client = createTinkererClient({ getKey: () => "k", fetchImpl });
    await client.call("post/timeline", {});
    await client.call("post/timeline", {});
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await client.call("post/timeline", {}, { ttlMs: 10_000 });
    client.invalidate("post/");
    await client.call("post/timeline", {}, { ttlMs: 10_000 });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("never caches errors and never caches across a key change", async () => {
    let key = "a";
    let status = 500;
    const fetchImpl = vi.fn(async () =>
      status === 500
        ? jsonResponse(500, { code: "INTERNAL_SERVER_ERROR", error: "boom", path: "p" })
        : jsonResponse(200, { data: "ok", path: "p" }),
    );
    const client = createTinkererClient({ getKey: () => key, fetchImpl });
    await expect(client.call("x/y", {}, { ttlMs: 10_000 })).rejects.toMatchObject({ status: 500 });
    status = 200;
    expect(await client.call("x/y", {}, { ttlMs: 10_000 })).toBe("ok");
    key = "b";
    await client.call("x/y", {}, { ttlMs: 10_000 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

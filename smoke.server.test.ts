// Server smoke test on the SDK fake host: settings, the poll service, RPC,
// the agent tools' guardrails, and the CLI, with the platform stubbed at fetch.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "./server";

type Route = (input: Record<string, unknown>) => unknown;

const me = { id: "u1", name: "Vedran", username: "veki", avatarImageUrl: null, gravatarUrl: null, image: null };
const post = {
  id: "p1",
  author: me,
  content: "Shipped the thing",
  publishedAt: "2026-09-19T10:00:00.000Z",
  createdAt: "2026-09-19T10:00:00.000Z",
  images: [],
  topics: [],
  linkPreviews: [],
  likeCount: 1,
  commentCount: 0,
  likedByMe: false,
  bookmarkedByMe: false,
  reactions: [],
};

function platform(overrides: Record<string, Route> = {}) {
  const calls: Array<{ path: string; input: Record<string, unknown> }> = [];
  const routes: Record<string, Route> = {
    "user/getCurrentUser": () => me,
    "notification/unreadCount": () => 2,
    "messaging/dmUnreadCount": () => 1,
    "messaging/unreadCount": () => 1,
    "topicChat/activeTopics": () => [{ slug: "codex", name: "Codex", unreadMentionCount: 1 }],
    "event/liveBanner": () => null,
    "lockIn/state": () => ({ current: null, participants: [], serverNow: "2026-09-19T10:00:00.000Z" }),
    "lockIn/todos": () => [],
    "messaging/myConversations": () => [{ id: "c1", type: "DM", otherUser: { id: "u2", name: "Fran" }, lastMessage: { content: "hej" }, unreadCount: 1 }],
    "post/timeline": () => ({ items: [post], nextCursor: null }),
    "post/create": () => post,
    "post/byId": () => post,
    "topic/list": () => [{ id: "t1", slug: "ai-llms", name: "AI & LLMs" }],
    ...overrides,
  };
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url).replace("https://app.tinkerer.club/api/v1/", "");
    const input = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ path, input });
    const headers = new Headers(init?.headers);
    if (headers.get("x-api-key") !== "tnk_test") {
      return new Response(JSON.stringify({ code: "UNAUTHORIZED", error: "nope", path }), { status: 401 });
    }
    const route = routes[path];
    if (!route) return new Response(JSON.stringify({ code: "NOT_FOUND", error: `no route ${path}`, path }), { status: 404 });
    return new Response(JSON.stringify({ data: route(input), path }), { status: 200, headers: { "content-type": "application/json" } });
  });
  return { fetchImpl, calls };
}

describe("server smoke", () => {
  let restore: (() => void) | null = null;
  beforeEach(() => {
    restore = null;
  });
  afterEach(async () => {
    restore?.();
    vi.unstubAllGlobals();
  });

  async function boot(settings: Record<string, string | number | boolean> = {}, overrides: Record<string, Route> = {}) {
    const { fetchImpl, calls } = platform(overrides);
    vi.stubGlobal("fetch", fetchImpl);
    const { bb, harness } = createFakePluginHost({ pluginId: "tinkerer", settings });
    await plugin(bb);
    restore = () => void harness.lifecycle.dispose();
    return { harness, calls, bbKv: bb.storage.kv };
  }

  it("reports a friendly not-connected status without a key and never calls the platform", async () => {
    const { harness, calls } = await boot();
    const status = (await harness.behavior.callRpc("status", null)) as { keyPresent: boolean; connected: boolean };
    expect(status).toMatchObject({ keyPresent: false, connected: false });
    expect(calls).toHaveLength(0);
    const run = await harness.behavior.runCli(["timeline"]);
    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain("No Tinkerer Club API key");
  });

  it("polls unread counts with the key, stores the snapshot, and toasts only on later increases", async () => {
    const { harness, bbKv } = await boot({ apiKey: "tnk_test" });
    const first = (await harness.behavior.callRpc("refresh", null)) as { connected: boolean; unread: { total: number } };
    expect(first.connected).toBe(true);
    expect(first.unread).toEqual({ notifications: 2, dms: 1, mentions: 1, total: 4 });
    // First observation is quiet: only the status signal.
    expect(harness.realtimeSignals.map((s) => (s.payload as { kind: string }).kind)).toEqual(["status"]);
    expect(await bbKv.get("poll-snapshot")).toMatchObject({ dms: 1 });
  });

  it("tinkerer_post previews first, then publishes on confirm when human approval is off", async () => {
    const { harness, calls } = await boot({ apiKey: "tnk_test", confirmAgentPosts: false });
    const preview = await harness.behavior.callAgentTool("tinkerer_post", { content: "hello club" });
    expect(String(preview)).toContain("Not posted");
    expect(calls.some((c) => c.path === "post/create")).toBe(false);
    const published = await harness.behavior.callAgentTool("tinkerer_post", { content: "hello club", confirm: true });
    expect(String(published)).toContain("Published post p1");
    const create = calls.find((c) => c.path === "post/create");
    expect(create?.input).toMatchObject({ content: "hello club", type: "SHORT", publish: "now", timeline: true });
  });

  it("tinkerer_call allows reads, refuses writes by default, and never exposes admin", async () => {
    const { harness, calls } = await boot({ apiKey: "tnk_test" });
    const topics = await harness.behavior.callAgentTool("tinkerer_call", { procedure: "topic/list" });
    expect(String(topics)).toContain("ai-llms");
    await expect(harness.behavior.callAgentTool("tinkerer_call", { procedure: "post/create", input: { content: "x" } })).rejects.toThrow(/write/);
    await expect(harness.behavior.callAgentTool("tinkerer_call", { procedure: "admin/listMembers" })).rejects.toThrow(/admin-only/);
    await expect(harness.behavior.callAgentTool("tinkerer_call", { procedure: "post/nope" })).rejects.toThrow(/Unknown procedure/);
    expect(calls.filter((c) => c.path.startsWith("admin/"))).toHaveLength(0);
  });

  it("bb tinkerer status --json reflects the last poll", async () => {
    const { harness } = await boot({ apiKey: "tnk_test" });
    await harness.behavior.callRpc("refresh", null);
    const run = await harness.behavior.runCli(["status", "--json"]);
    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout ?? "{}")).toMatchObject({ connected: true, unread: { dms: 1 } });
  });
});

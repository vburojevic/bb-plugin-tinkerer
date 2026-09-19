// bb-plugin-tinkerer — server entry.
//
// Wires the Tinkerer Club client (lib/client.ts), the live-state poller
// (lib/service.ts), the RPC surface the panel reads (lib/contract.ts), the
// agent tools (lib/tools.ts) and the `bb tinkerer` CLI (lib/cli.ts) into bb.
// The API key lives in a secret setting and never leaves this process.
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { buildCli } from "./lib/cli";
import { TINKERER_BASE_URL, createTinkererClient, type TinkererClient } from "./lib/client";
import { createDemoClient } from "./lib/demo";
import {
  REALTIME_CHANNEL,
  rpcContract,
  type CalendarEvent,
  type Comment,
  type ComposeInput,
  type Conversation,
  type DmMessage,
  type Badge,
  type LedgerRow,
  type LeaderboardRow,
  type LiveBanner,
  type LockInState,
  type LockInTodo,
  type Notification,
  type Post,
  type Project,
  type RealtimeSignal,
  type Topic,
  type TopicChat,
  type TopicChatMessage,
  type UserStats,
  type Author,
  type LinkPreview,
} from "./lib/contract";
import { createTinkererService } from "./lib/service";
import { buildTools } from "./lib/tools";
import { excerpt } from "./lib/format";

export type { rpcContract } from "./lib/contract";

const TTL_SHORT = 20_000;
const TTL_LONG = 5 * 60_000;
export const POST_APPROVAL_RENDERER = "post-approval";

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    apiKey: {
      type: "string",
      label: "Tinkerer Club API key",
      description: "Your personal key, starts with tnk_. Create one at app.tinkerer.club → Settings → API keys. It is stored on this machine only and every request goes out as you.",
      secret: true,
    },
    pollIntervalSeconds: {
      type: "number",
      label: "Check for updates every (seconds)",
      description: "Background cadence for unread counts, new posts, the live banner and your lock-in. 30 to 600. The panel checks every 20 seconds while it is open regardless.",
      experimental_schema: z.number().int().min(30).max(600),
      default: 60,
    },
    toasts: {
      type: "select",
      label: "Desktop toasts",
      description: "Which arrivals get a toast in bb. Unread counts always show in the sidebar.",
      options: ["messages, mentions and live", "live broadcasts only", "none"],
      default: "messages, mentions and live",
    },
    defaultTimeline: {
      type: "boolean",
      label: "New posts show on the timeline",
      description: "The composer's default. Off means a post is visible in its topics only unless you flip it for that post.",
      default: true,
    },
    confirmAgentPosts: {
      type: "boolean",
      label: "Confirm before an agent posts",
      description: "tinkerer_post opens an approval card in the thread showing the exact post. Only your click publishes.",
      default: true,
    },
    allowAgentWrites: {
      type: "boolean",
      label: "Allow agent writes via tinkerer_call",
      description: "Lets the generic tinkerer_call tool run write procedures (send, like, markRead, …). Reads are always allowed; tinkerer_post and tinkerer_lockin are unaffected.",
      default: false,
    },
  });

  let current = await settings.get();
  settings.onChange((next, prev) => {
    current = next;
    if (next.apiKey !== prev.apiKey) {
      service.reset();
      void service.refresh().catch(() => {});
    }
  });

  let disposed = false;
  const publish = (signal: RealtimeSignal) => {
    if (disposed) return;
    try {
      bb.realtime.publish(REALTIME_CHANNEL, signal);
    } catch {
      // A reload can race a late publish; the next poll republishes.
    }
  };

  // The real client, or the in-memory demo club (`bb tinkerer demo on`) for
  // screenshots and try-outs. Everything downstream holds this delegating
  // handle, so flipping the mode never restarts anything.
  const realClient = createTinkererClient({ getKey: () => current.apiKey ?? "" });
  const demoClient = createDemoClient();
  let demoMode = (await bb.storage.kv.get<boolean>("demo-mode")) === true;
  const active = (): TinkererClient => (demoMode ? demoClient : realClient);
  const client: TinkererClient = {
    hasKey: () => active().hasKey(),
    invalidate: (prefix) => active().invalidate(prefix),
    call: (path, input, options) => active().call(path, input, options),
  };
  async function setDemoMode(on: boolean) {
    demoMode = on;
    await bb.storage.kv.set("demo-mode", on);
    service.reset();
    await service.refresh();
  }
  const service = createTinkererService({
    client,
    settings: () => ({
      pollIntervalSeconds: current.pollIntervalSeconds,
      defaultTimeline: current.defaultTimeline,
      toasts: current.toasts === "none" ? "none" : current.toasts === "live broadcasts only" ? "live" : "all",
    }),
    kv: bb.storage.kv,
    publish,
    log: bb.log,
  });

  bb.background.service("poll", {
    async start(signal) {
      await service.run(signal);
    },
  });

  // ---- shared operations (panel, tools, CLI) --------------------------------

  const me = () => client.call<Author>("user/getCurrentUser", {}, { ttlMs: 10 * 60_000 });

  async function createPost(draft: ComposeInput): Promise<Post> {
    const post = await client.call<Post>("post/create", {
      content: draft.content,
      type: "SHORT",
      topicSlugs: draft.topicSlugs,
      images: [],
      timeline: draft.timeline,
      publish: draft.mode === "queue" ? "queue" : "now",
      ...(draft.projectId ? { projectId: draft.projectId } : {}),
      ...(draft.linkPreviewUrl ? { linkPreviewUrl: draft.linkPreviewUrl } : {}),
    });
    client.invalidate("post/");
    return post;
  }

  async function lockInState() {
    const [state, todos] = await Promise.all([
      client.call<LockInState>("lockIn/state", {}),
      client.call<LockInTodo[]>("lockIn/todos", {}),
    ]);
    return { state, todos };
  }
  async function lockInStart(title: string | undefined, threadId: string | undefined, byAgent: boolean) {
    await client.call("lockIn/start", title ? { title } : {});
    client.invalidate("lockIn/");
    const status = await service.refresh();
    if (byAgent) publish({ kind: "toast", tone: "info", title: `Agent started a lock-in${title ? `: ${title}` : ""}`, href: "lockin" });
    void threadId;
    return (await client.call<LockInState>("lockIn/state", {})) ?? status;
  }
  async function lockInFinish(id: string, threadId: string | undefined, byAgent: boolean) {
    await client.call("lockIn/finish", { id });
    client.invalidate("lockIn/");
    await service.refresh();
    if (byAgent) publish({ kind: "toast", tone: "success", title: "Agent finished the lock-in", href: "lockin" });
    void threadId;
    return client.call<LockInState>("lockIn/state", {});
  }
  async function lockInTodos(): Promise<LockInTodo[]> {
    client.invalidate("lockIn/");
    publish({ kind: "status" });
    return client.call<LockInTodo[]>("lockIn/todos", {});
  }
  async function addTodo(title: string) {
    await client.call("lockIn/createTodo", { id: crypto.randomUUID(), title });
    return lockInTodos();
  }
  async function completeTodo(id: string, completed: boolean) {
    await client.call("lockIn/updateTodo", { id, completed });
    return lockInTodos();
  }

  async function markNotificationsRead(ids: string[]) {
    for (const id of ids) await client.call("notification/markRead", { id });
    if (ids.length > 0) void service.refresh().catch(() => {});
  }

  async function requestPostApproval(threadId: string, draft: ComposeInput, signal: AbortSignal): Promise<boolean> {
    const result = await bb.ui.requestInput(
      {
        threadId,
        rendererId: POST_APPROVAL_RENDERER,
        title: "Post to Tinkerer Club",
        payload: draft,
        presentation: { label: { pending: "Waiting for you to approve a Tinkerer post", completed: "Answered a Tinkerer post approval" } },
        describeSubmission(value) {
          const approved = typeof value === "object" && value !== null && (value as { approved?: unknown }).approved === true;
          return { title: approved ? "Approved a Tinkerer post" : "Declined a Tinkerer post", detail: excerpt(draft.content, 200) };
        },
      },
      { signal },
    );
    return result.outcome === "submitted" && typeof result.value === "object" && result.value !== null && (result.value as { approved?: unknown }).approved === true;
  }

  /** Topics with their post counts, busiest first; the composer and the feed filter share it. */
  async function topicsWithCounts(): Promise<Topic[]> {
    const rows = await client.call<Array<Topic & { _count?: { posts?: number } }>>("topic/listWithStats", {}, { ttlMs: TTL_LONG });
    return rows
      .map((row) => ({ id: row.id, slug: row.slug, name: row.name, emoji: row.emoji ?? null, kind: row.kind, posts: row._count?.posts ?? 0 }))
      .sort((a, b) => b.posts - a.posts || a.name.localeCompare(b.name));
  }

  // ---- media proxy -----------------------------------------------------------
  // Post images and videos need the key (the platform answers 401 without it),
  // so the browser fetches them through this route. Same-origin, GET only, the
  // path is constrained to the media namespace, and Range passes through so
  // videos can seek.
  const MEDIA_PATH = /^\/api\/media\/[A-Za-z0-9/_.\-%]+$/;
  bb.http.route("GET", "/media", async (c) => {
    const p = c.req.query("p") ?? "";
    if (!MEDIA_PATH.test(p) || p.includes("..")) return c.text("Not a media path", 400);
    const key = current.apiKey ?? "";
    if (key.length === 0) return c.text("No Tinkerer Club API key configured", 401);
    const range = c.req.header("range");
    const upstream = await fetch(`${TINKERER_BASE_URL}${p}`, { headers: { "x-api-key": key, ...(range ? { range } : {}) } });
    const headers = new Headers();
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("cache-control", "private, max-age=86400");
    headers.set("x-content-type-options", "nosniff");
    return new Response(upstream.body, { status: upstream.status, headers });
  });

  // ---- RPC ------------------------------------------------------------------

  bb.rpc.register(rpcContract, {
    status: () => service.status(),
    refresh: () => service.refresh(),
    async timeline({ cursor, hashtag, topic }) {
      type Page = { items: Post[]; nextCursor?: string | null };
      const paging = { limit: 20, ...(cursor ? { cursor } : {}) };
      const page = hashtag
        ? await client.call<Page>("post/byHashtag", { slug: hashtag, ...paging }, { ttlMs: TTL_SHORT })
        : topic
          ? await client.call<Page>("post/byTopic", { slug: topic, ...paging }, { ttlMs: TTL_SHORT })
          : await client.call<Page>("post/timeline", { ...paging, supportsSparsePages: true }, { ttlMs: TTL_SHORT });
      return { items: page.items, nextCursor: page.nextCursor ?? null };
    },
    trending: () => client.call<Array<{ slug: string; postCount: number }>>("post/trendingHashtags", { days: 7, limit: 12 }, { ttlMs: TTL_LONG }),
    post: ({ id }) => client.call<Post>("post/byId", { id }, { ttlMs: TTL_SHORT }),
    async comments({ postId, cursor }) {
      const page = await client.call<{ items: Comment[]; nextCursor?: string | null }>("post/listComments", { postId, limit: 30, ...(cursor ? { cursor } : {}) });
      return { items: page.items, nextCursor: page.nextCursor ?? null };
    },
    async addComment({ postId, content }) {
      const comment = await client.call<Comment>("post/addComment", { postId, content, images: [] });
      client.invalidate("post/");
      return comment;
    },
    async like({ postId, liked }) {
      await client.call(liked ? "post/like" : "post/unlike", liked ? { postId, reaction: "❤️" } : { postId });
      client.invalidate("post/");
      return client.call<Post>("post/byId", { id: postId });
    },
    async bookmark({ postId }) {
      await client.call("post/toggleBookmark", { postId });
      client.invalidate("post/");
      return client.call<Post>("post/byId", { id: postId });
    },
    async votePoll({ postId, optionId }) {
      await client.call("post/votePoll", { postId, optionId });
      client.invalidate("post/");
      return client.call<Post>("post/byId", { id: postId });
    },
    async notifications({ cursor }) {
      const page = await client.call<{ items: Notification[]; nextCursor?: string | null }>("notification/list", { limit: 30, ...(cursor ? { cursor } : {}) });
      return { items: page.items, nextCursor: page.nextCursor ?? null };
    },
    async markNotificationRead({ id }) {
      await markNotificationsRead([id]);
      return { ok: true };
    },
    async markAllNotificationsRead() {
      await client.call("notification/markAllRead", {});
      void service.refresh().catch(() => {});
      return { ok: true };
    },
    conversations: () => client.call<Conversation[]>("messaging/myConversations", {}),
    async messages({ conversationId, cursor }) {
      const page = await client.call<{ messages: DmMessage[]; nextCursor?: string | null }>("messaging/messages/list", { conversationId, limit: 40, ...(cursor ? { cursor } : {}) });
      return { messages: page.messages, nextCursor: page.nextCursor ?? null };
    },
    sendMessage: ({ conversationId, content }) => client.call<DmMessage>("messaging/messages/send", { conversationId, content, attachments: [] }),
    async markConversationRead({ conversationId }) {
      await client.call("messaging/markRead", { conversationId });
      void service.refresh().catch(() => {});
      return { ok: true };
    },
    topicChats: () => client.call<TopicChat[]>("topicChat/activeTopics", {}, { ttlMs: TTL_SHORT }),
    async topicMessages({ slug, cursor }) {
      const page = await client.call<{ messages: TopicChatMessage[]; nextCursor?: string | null }>("topicChat/messages/list", { topicSlug: slug, limit: 40, ...(cursor ? { cursor } : {}) });
      return { messages: page.messages, nextCursor: page.nextCursor ?? null };
    },
    sendTopicMessage: ({ slug, content }) => client.call<TopicChatMessage>("topicChat/messages/send", { topicSlug: slug, content, attachments: [] }),
    async markTopicRead({ slug }) {
      await client.call("topicChat/markRead", { topicSlug: slug });
      client.invalidate("topicChat/");
      void service.refresh().catch(() => {});
      return { ok: true };
    },
    async me() {
      const user = await me();
      const [stats, wallet, collection, commits, ledger] = await Promise.all([
        client.call<UserStats>("leaderboard/userStats", { userId: user.id, includeRank: true }, { ttlMs: TTL_SHORT }),
        client.call<{ balance: number }>("shop/wallet", {}, { ttlMs: TTL_SHORT }),
        client.call<{ badges: Badge[] }>("gamification/collection", { userId: user.id }, { ttlMs: TTL_LONG }),
        client.call<{ rows: Array<{ commits: number; rank: number; user: { id: string } }> }>("leaderboard/githubCommits", { period: "week", limit: 50, offset: 0 }, { ttlMs: TTL_LONG }),
        client.call<{ rows: LedgerRow[] }>("shop/ledger", {}, { ttlMs: TTL_SHORT }),
      ]);
      const mine = commits.rows.find((row) => row.user.id === user.id);
      return {
        user,
        stats,
        balance: wallet.balance,
        badges: collection.badges,
        commitsWeek: mine ? { commits: mine.commits, rank: mine.rank } : null,
        ledger: ledger.rows.slice(0, 8),
      };
    },
    async leaderboard({ period }) {
      const rows = await client.call<LeaderboardRow[]>("leaderboard/leaderboard", { period }, { ttlMs: TTL_LONG });
      return rows.slice(0, 10);
    },
    lockIn: () => lockInState(),
    lockInStart: ({ title }) => lockInStart(title, undefined, false),
    lockInFinish: ({ id }) => lockInFinish(id, undefined, false),
    lockInTodoCreate: ({ title }) => addTodo(title),
    lockInTodoUpdate: ({ id, completed }) => completeTodo(id, completed),
    async lockInTodoDelete({ id }) {
      await client.call("lockIn/deleteTodo", { id });
      return lockInTodos();
    },
    async live() {
      const from = new Date();
      const to = new Date(from.getTime() + 7 * 86_400_000);
      const [banner, upcoming] = await Promise.all([
        client.call<LiveBanner | null>("event/liveBanner", {}, { ttlMs: TTL_SHORT }),
        client.call<CalendarEvent[]>("event/calendar", { from: from.toISOString(), to: to.toISOString() }, { ttlMs: TTL_LONG }),
      ]);
      return { banner: banner ?? null, upcoming };
    },
    async composerData() {
      const [topics, projects] = await Promise.all([topicsWithCounts(), client.call<Project[]>("project/myProjects", {}, { ttlMs: TTL_LONG })]);
      return { topics, projects };
    },
    topics: () => topicsWithCounts(),
    previewLink: ({ url }) => client.call<LinkPreview | null>("post/previewLink", { url }, { ttlMs: TTL_LONG }),
    createPost: (draft) => createPost(draft),
    async threadTitle({ threadId }) {
      try {
        const thread = await bb.sdk.threads.get({ threadId });
        return { title: thread.title ?? null };
      } catch {
        return { title: null };
      }
    },
  });

  // ---- agents ----------------------------------------------------------------

  const tools = buildTools({
    client,
    settings: () => ({ confirmAgentPosts: current.confirmAgentPosts, allowAgentWrites: current.allowAgentWrites, defaultTimeline: current.defaultTimeline }),
    requestPostApproval,
    createPost,
    lockIn: {
      state: lockInState,
      start: (title, threadId) => lockInStart(title, threadId, true),
      finish: (id, threadId) => lockInFinish(id, threadId, true),
      addTodo,
      completeTodo,
    },
    markNotificationsRead,
  });
  for (const tool of tools) {
    bb.agents.registerTool({
      name: tool.name,
      description: tool.description,
      ...(tool.instructions ? { instructions: tool.instructions } : {}),
      ...(tool.presentation ? { presentation: tool.presentation } : {}),
      parameters: tool.parameters,
      execute: (input, context) => tool.execute(input as never, context),
    });
  }

  // ---- CLI -------------------------------------------------------------------

  bb.cli.register(
    buildCli({
      client,
      status: () => service.status(),
      refresh: () => service.refresh(),
      settings: () => ({ defaultTimeline: current.defaultTimeline }),
      setDemoMode,
      isDemoMode: () => demoMode,
      createPost,
      lockIn: {
        state: lockInState,
        start: (title, threadId) => lockInStart(title, threadId, false),
        finish: (id, threadId) => lockInFinish(id, threadId, false),
        addTodo,
        completeTodo,
      },
    }),
  );

  bb.onDispose(() => {
    disposed = true;
  });
}

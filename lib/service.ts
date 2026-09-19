// The plugin's live state and its poller.
//
// One object owns everything server-side that the panel, tools and CLI read:
// the API client, the last status snapshot, and the poll loop that keeps the
// unread counts and live banner fresh. Server.ts wires it to bb; this file
// only depends on small function-shaped seams so it can be driven in tests.
import { TinkererError, type TinkererClient } from "./client";
import type { Author, LiveBanner, LockInSession, LockInState, RealtimeSignal, Status, Unread, Conversation, TopicChat } from "./contract";
import { displayName, excerpt } from "./format";
import { diffScopes, diffSignals, nextDelayMs, type PollSnapshot } from "./poll";

export interface ServiceDeps {
  client: TinkererClient;
  /** Current effective settings, re-read on every use so saves apply live. */
  settings: () => { pollIntervalSeconds: number; defaultTimeline: boolean };
  kv: { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> };
  publish: (signal: RealtimeSignal) => void;
  log: { info(message: string): void; warn(message: string): void };
}

const KV_SNAPSHOT = "poll-snapshot";
const EMPTY_UNREAD: Unread = { notifications: 0, dms: 0, mentions: 0, total: 0 };

export interface TinkererService {
  status(): Status;
  /** Poll now. Resolves with the fresh status; concurrent calls share one poll. */
  refresh(): Promise<Status>;
  run(signal: AbortSignal): Promise<void>;
  /** Forget the cached identity, e.g. after the key changed. */
  reset(): void;
}

export function createTinkererService(deps: ServiceDeps): TinkererService {
  let me: Author | null = null;
  let connected = false;
  let error: string | null = null;
  let unread: Unread = EMPTY_UNREAD;
  let live: LiveBanner | null = null;
  let lockIn: LockInSession | null = null;
  let snapshot: PollSnapshot | null = null;
  let snapshotLoaded = false;
  let failures = 0;
  let inflight: Promise<Status> | null = null;

  function status(): Status {
    const settings = deps.settings();
    return {
      keyPresent: deps.client.hasKey(),
      connected,
      error,
      me,
      unread,
      live,
      lockIn,
      pollIntervalSeconds: settings.pollIntervalSeconds,
      defaultTimeline: settings.defaultTimeline,
    };
  }

  async function describeDm(): Promise<string | undefined> {
    try {
      const conversations = await deps.client.call<Conversation[]>("messaging/myConversations", {});
      const unreadOnes = conversations.filter((c) => (c.unreadCount ?? 0) > 0);
      const first = unreadOnes[0];
      if (!first) return undefined;
      const who = first.name ?? displayName(first.otherUser);
      const text = excerpt(first.lastMessage?.content, 80);
      return text.length > 0 ? `${who}: ${text}` : who;
    } catch {
      return undefined;
    }
  }

  async function pollOnce(): Promise<void> {
    if (!deps.client.hasKey()) {
      connected = false;
      error = null;
      unread = EMPTY_UNREAD;
      live = null;
      lockIn = null;
      return;
    }
    if (!snapshotLoaded) {
      snapshotLoaded = true;
      snapshot = (await deps.kv.get<PollSnapshot>(KV_SNAPSHOT)) ?? null;
    }
    if (me === null) {
      me = await deps.client.call<Author>("user/getCurrentUser", {}, { ttlMs: 10 * 60_000 });
    }
    const [notifications, dms, messages, topics, banner, lockState, latest] = await Promise.all([
      deps.client.call<number>("notification/unreadCount", {}),
      deps.client.call<number>("messaging/dmUnreadCount", {}),
      deps.client.call<number>("messaging/unreadCount", {}),
      deps.client.call<TopicChat[]>("topicChat/activeTopics", {}),
      deps.client.call<LiveBanner | null>("event/liveBanner", {}),
      deps.client.call<LockInState>("lockIn/state", {}),
      deps.client.call<{ items: Array<{ id: string }> }>("post/timeline", { limit: 1, supportsSparsePages: true }),
    ]);
    const mentions = topics.reduce((sum, topic) => sum + (topic.unreadMentionCount ?? 0), 0);
    const topicMessages = topics.reduce((sum, topic) => sum + (topic.messageCount ?? 0), 0);
    const running = lockState.current && !lockState.current.endedAt ? lockState.current : null;
    const next: PollSnapshot = {
      notifications,
      dms,
      mentions,
      liveId: banner?.id ?? null,
      liveStartsAt: banner?.startsAt ?? null,
      latestPostId: latest.items[0]?.id ?? null,
      messages,
      topicMessages,
      lockInId: running?.id ?? null,
    };
    const signals = diffSignals(snapshot, next);
    const scopes = diffScopes(snapshot, next);
    snapshot = next;
    await deps.kv.set(KV_SNAPSHOT, next);
    connected = true;
    error = null;
    unread = { notifications, dms, mentions, total: notifications + dms + mentions };
    live = banner ?? null;
    lockIn = running;
    if (scopes.length > 0) {
      deps.client.invalidate("post/");
      deps.client.invalidate("topicChat/");
      deps.client.invalidate("event/");
      deps.publish({ kind: "changed", scopes });
    }
    for (const signal of signals) {
      if (signal.kind === "dm") {
        deps.publish({
          kind: "toast",
          tone: "info",
          title: signal.count === 1 ? "New direct message" : `${signal.count} unread direct messages`,
          description: await describeDm(),
          href: "inbox/dms",
        });
      } else if (signal.kind === "mention") {
        deps.publish({
          kind: "toast",
          tone: "info",
          title: signal.count === 1 ? "You were mentioned in a topic chat" : `${signal.count} unread mentions in topic chats`,
          href: "inbox/topics",
        });
      } else {
        deps.publish({
          kind: "toast",
          tone: "success",
          title: banner?.title ? `Live now: ${banner.title}` : "A Tinkerer broadcast is live",
          href: "live",
        });
      }
    }
  }

  async function refresh(): Promise<Status> {
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        await pollOnce();
        failures = 0;
      } catch (cause) {
        failures += 1;
        error = cause instanceof TinkererError ? cause.message : String(cause);
        if (cause instanceof TinkererError && cause.code === "invalid_key") {
          connected = false;
          me = null;
        }
        deps.log.warn(`poll failed (${failures}): ${error}`);
      } finally {
        inflight = null;
      }
      deps.publish({ kind: "status" });
      return status();
    })();
    return inflight;
  }

  /** A sleep that ends early on abort, so reload never waits out a poll interval. */
  function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      function done() {
        clearTimeout(timer);
        signal.removeEventListener("abort", done);
        resolve();
      }
      signal.addEventListener("abort", done, { once: true });
    });
  }

  return {
    status,
    reset() {
      me = null;
      connected = false;
      error = null;
      deps.client.invalidate();
    },
    refresh,
    async run(signal) {
      while (!signal.aborted) {
        await refresh();
        const base = Math.max(30, deps.settings().pollIntervalSeconds) * 1000;
        const delay = deps.client.hasKey() ? nextDelayMs(base, failures) : base;
        await sleep(delay, signal);
      }
    },
  };
}

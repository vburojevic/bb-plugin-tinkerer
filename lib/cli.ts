// `bb tinkerer …` — the shell face of the plugin, for humans and agents alike.
import { PluginCliError, cliCommand, defineCli } from "@get-bb/plugin-sdk";
import { TinkererError, type TinkererClient } from "./client";
import type { Author, ComposeInput, LockInState, LockInTodo, Notification, Post, Status, UserStats } from "./contract";
import { describePost, displayName, relativeTime } from "./format";

export interface CliDeps {
  client: TinkererClient;
  status: () => Status;
  refresh: () => Promise<Status>;
  settings: () => { defaultTimeline: boolean };
  setDemoMode: (on: boolean) => Promise<void>;
  isDemoMode: () => boolean;
  createPost: (draft: ComposeInput) => Promise<Post>;
  lockIn: {
    state: () => Promise<{ state: LockInState; todos: LockInTodo[] }>;
    start: (title: string | undefined, threadId: string | undefined) => Promise<LockInState>;
    finish: (id: string, threadId: string | undefined) => Promise<LockInState>;
    addTodo: (title: string) => Promise<LockInTodo[]>;
    completeTodo: (id: string, completed: boolean) => Promise<LockInTodo[]>;
  };
}

const json = { type: "boolean", description: "Emit machine-readable JSON" } as const;

function out(isJson: boolean, value: unknown, text: string) {
  return { exitCode: 0, stdout: isJson ? JSON.stringify(value, null, 2) : text };
}

function rethrow(cause: unknown): never {
  if (cause instanceof TinkererError) {
    if (cause.code === "no_key") {
      throw new PluginCliError("No Tinkerer Club API key is configured.", {
        code: "no_key",
        hint: "Add your key under Settings → Tinkerer, or `bb plugin config tinkerer set apiKey <key>`.",
      });
    }
    throw new PluginCliError(cause.message, { code: cause.code.toLowerCase(), exitCode: 1 });
  }
  throw cause;
}

function renderLockIn(state: LockInState, todos: LockInTodo[]): string {
  const current = state.current && !state.current.endedAt ? state.current : null;
  const lines = [
    current
      ? `Locked in${current.title ? `: ${current.title}` : ""} · started ${relativeTime(current.startedAt)} ago · ends ${new Date(current.expiresAt).toLocaleTimeString()} · id ${current.id}`
      : "No lock-in running.",
  ];
  const others = state.participants.filter((p) => p.user && p.id !== current?.id).map((p) => displayName(p.user));
  if (others.length > 0) lines.push(`Also locked in: ${others.join(", ")}`);
  lines.push(todos.length > 0 ? todos.map((t) => `[${t.completed ? "x" : " "}] ${t.id}  ${t.title}`).join("\n") : "No todos.");
  return lines.join("\n");
}

export function buildCli(deps: CliDeps) {
  return defineCli({
    name: "tinkerer",
    summary: "Tinkerer Club from the shell: status, profile, notifications, timeline, posting, search, lock-in",
    description: "Tinkerer Club is a real community; post carefully and never twice.",
    commands: {
      status: cliCommand({
        summary: "Connection, unread counts, live banner and lock-in at a glance",
        options: { json, refresh: { type: "boolean", description: "Poll the platform now instead of reading the last poll" } },
        async run(input) {
          const status = input.options.refresh ? await deps.refresh() : deps.status();
          const lines = [
            !status.keyPresent ? "Not connected: no API key configured." : status.connected ? `Connected as ${displayName(status.me)} (@${status.me?.username ?? "?"})` : `Not connected${status.error ? `: ${status.error}` : ""}`,
            `Unread: ${status.unread.notifications} notifications · ${status.unread.dms} DMs · ${status.unread.mentions} topic mentions`,
            status.live ? `Live: ${status.live.title ?? "broadcast"}` : "Live: nothing right now",
            status.lockIn ? `Lock-in: ${status.lockIn.title ?? "untitled"} until ${new Date(status.lockIn.expiresAt).toLocaleTimeString()}` : "Lock-in: none",
            `Polling every ${status.pollIntervalSeconds}s`,
          ];
          return out(input.options.json, status, lines.join("\n"));
        },
      }),
      me: cliCommand({
        summary: "Your level, sparks, progress and rank",
        options: { json },
        async run(input) {
          try {
            const me = await deps.client.call<Author>("user/getCurrentUser", {}, { ttlMs: 60_000 });
            const stats = await deps.client.call<UserStats>("leaderboard/userStats", { userId: me.id, includeRank: true });
            const wallet = await deps.client.call<{ balance: number }>("shop/wallet", {});
            const text = [
              `${displayName(me)} (@${me.username ?? "?"})`,
              `Level ${stats.level.level} ${stats.level.name} · ${stats.totalPoints} sparks all-time · ${wallet.balance} spendable`,
              stats.nextLevel ? `${stats.progress.earnedInLevel}/${stats.progress.neededForNext ?? "?"} toward level ${stats.nextLevel.level} ${stats.nextLevel.name}` : "Top level reached",
              `All-time rank ${stats.rankAllTime ?? "unranked"} · ${stats.points30d} sparks in 30 days`,
            ].join("\n");
            return out(input.options.json, { me, stats, balance: wallet.balance }, text);
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      notifs: cliCommand({
        summary: "Recent notifications, newest first",
        aliases: ["notifications", "inbox"],
        options: {
          json,
          limit: { type: "integer", min: 1, max: 50, default: 20, description: "How many to show" },
          unread: { type: "boolean", description: "Only unread notifications" },
        },
        async run(input) {
          try {
            const page = await deps.client.call<{ items: Notification[] }>("notification/list", { limit: input.options.limit });
            const items = input.options.unread ? page.items.filter((n) => !n.read) : page.items;
            const now = Date.now();
            const text = items.length > 0 ? items.map((n) => `${n.read ? "  " : "• "}${relativeTime(n.createdAt, now).padStart(4)}  ${n.title}`).join("\n") : "No notifications.";
            return out(input.options.json, items, text);
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      timeline: cliCommand({
        summary: "The latest posts on the timeline, or in one topic",
        options: {
          json,
          limit: { type: "integer", min: 1, max: 30, default: 10, description: "How many posts" },
          topic: { type: "string", description: "Topic slug to read that topic's feed instead" },
          cursor: { type: "string", description: "nextCursor from a previous page" },
        },
        async run(input) {
          try {
            const cursor = input.options.cursor ? { cursor: input.options.cursor } : {};
            const page = input.options.topic
              ? await deps.client.call<{ items: Post[]; nextCursor?: string | null }>("topic/feed", { slug: input.options.topic, includeChildren: true, limit: input.options.limit, ...cursor })
              : await deps.client.call<{ items: Post[]; nextCursor?: string | null }>("post/timeline", { limit: input.options.limit, supportsSparsePages: true, ...cursor });
            const now = Date.now();
            const text = `${page.items.map((p) => describePost(p, now)).join("\n\n") || "No posts."}${page.nextCursor ? `\n\nnextCursor: ${page.nextCursor}` : ""}`;
            return out(input.options.json, page, text);
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      post: cliCommand({
        summary: "Publish (or queue) a short post under your name",
        positionals: [{ name: "content", description: "The post body", required: true }],
        options: {
          json,
          topic: { type: "string", repeatable: true, split: ",", description: "Topic slug(s) to tag", aliases: ["topics", "t"] },
          project: { type: "string", description: "Project id to attach" },
          queue: { type: "boolean", description: "Queue instead of publishing now" },
          "no-timeline": { type: "boolean", description: "Keep it off the main timeline (topics only)" },
        },
        async run(input) {
          const draft: ComposeInput = {
            content: input.positionals.content,
            topicSlugs: input.options.topic ?? [],
            projectId: input.options.project ?? null,
            timeline: input.options["no-timeline"] ? false : deps.settings().defaultTimeline,
            mode: input.options.queue ? "queue" : "publish",
            linkPreviewUrl: null,
          };
          try {
            const post = await deps.createPost(draft);
            return out(input.options.json, post, `${draft.mode === "queue" ? "Queued" : "Published"} ${post.id}\n${describePost(post)}`);
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      search: cliCommand({
        summary: "Search members, posts, articles and chats",
        positionals: [{ name: "query", description: "What to search for", required: true }],
        options: { json },
        async run(input) {
          try {
            const result = await deps.client.call<Record<string, Array<{ id: string; title: string; subtitle?: string; href?: string }>>>("search/all", { query: input.positionals.query });
            const sections = Object.entries(result)
              .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
              .map(([section, rows]) => `${section} (${rows.length}):\n${rows.slice(0, 8).map((r) => `- ${r.title}${r.subtitle ? ` — ${r.subtitle}` : ""}${r.href ? ` https://app.tinkerer.club${r.href}` : ""}`).join("\n")}`);
            return out(input.options.json, result, sections.join("\n\n") || "No results.");
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      lockin: cliCommand({
        summary: "Show the current lock-in session and its todos",
        options: { json },
        async run(input) {
          try {
            const { state, todos } = await deps.lockIn.state();
            return out(input.options.json, { state, todos }, renderLockIn(state, todos));
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      "lockin start": cliCommand({
        summary: "Start a lock-in session",
        positionals: [{ name: "title", description: "Optional session title", variadic: true }],
        options: { json },
        async run(input, ctx) {
          try {
            const title = (input.positionals.title ?? []).join(" ").trim() || undefined;
            const state = await deps.lockIn.start(title, ctx.threadId);
            const { todos } = await deps.lockIn.state();
            return out(input.options.json, state, renderLockIn(state, todos));
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      "lockin finish": cliCommand({
        summary: "Finish the running lock-in session",
        options: { json },
        async run(input, ctx) {
          try {
            const { state } = await deps.lockIn.state();
            const current = state.current && !state.current.endedAt ? state.current : null;
            if (!current) throw new PluginCliError("No lock-in is running.", { code: "no_lockin" });
            const next = await deps.lockIn.finish(current.id, ctx.threadId);
            return out(input.options.json, next, `Finished ${current.id}.\n${renderLockIn(next, [])}`);
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      "lockin todos": cliCommand({
        summary: "List lock-in todos",
        options: { json },
        async run(input) {
          try {
            const { state, todos } = await deps.lockIn.state();
            return out(input.options.json, todos, renderLockIn(state, todos));
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      "lockin add": cliCommand({
        summary: "Add a lock-in todo",
        positionals: [{ name: "title", description: "Todo title", required: true, variadic: true }],
        options: { json },
        async run(input) {
          try {
            const todos = await deps.lockIn.addTodo(input.positionals.title.join(" "));
            const { state } = await deps.lockIn.state();
            return out(input.options.json, todos, renderLockIn(state, todos));
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
      demo: cliCommand({
        summary: "Switch the panel to a fictional club (on) or back to your account (off)",
        hidden: true,
        positionals: [{ name: "state", description: "on, off, or status", required: true }],
        options: { json },
        async run(input) {
          const state = input.positionals.state;
          if (state === "on" || state === "off") await deps.setDemoMode(state === "on");
          else if (state !== "status") throw new PluginCliError(`Expected on, off or status, got "${state}".`, { code: "bad_state" });
          const on = deps.isDemoMode();
          return out(input.options.json, { demo: on }, on ? "Demo mode on: the panel shows a fictional club." : "Demo mode off: the panel shows your account.");
        },
      }),
      "lockin done": cliCommand({
        summary: "Complete a lock-in todo",
        positionals: [{ name: "id", description: "Todo id from `bb tinkerer lockin todos`", required: true }],
        options: { json, undo: { type: "boolean", description: "Reopen it instead" } },
        async run(input) {
          try {
            const todos = await deps.lockIn.completeTodo(input.positionals.id, !input.options.undo);
            const { state } = await deps.lockIn.state();
            return out(input.options.json, todos, renderLockIn(state, todos));
          } catch (cause) {
            return rethrow(cause);
          }
        },
      }),
    },
  });
}

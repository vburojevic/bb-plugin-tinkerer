// Agent tools. Tinkerer Club is a real community of people, so every tool
// description says so, reads are cheap and writes are deliberate: posting
// needs a preview-then-confirm handshake (and, by default, a human click),
// and the generic escape hatch refuses writes unless the user opted in.
import { z } from "zod";
import { TinkererError, type TinkererClient } from "./client";
import type { Author, ComposeInput, LockInState, LockInTodo, Notification, Post, UserStats } from "./contract";
import { describePost, displayName, postUrl, relativeTime } from "./format";
import { classifyProcedure, isKnownProcedure } from "./policy";
import { PROCEDURES } from "./procedures.generated";

export interface ToolDeps {
  client: TinkererClient;
  settings: () => { confirmAgentPosts: boolean; allowAgentWrites: boolean; defaultTimeline: boolean };
  /** Ask the human in the thread; resolves true only on an explicit approve. */
  requestPostApproval: (threadId: string, draft: ComposeInput, signal: AbortSignal) => Promise<boolean>;
  createPost: (draft: ComposeInput) => Promise<Post>;
  lockIn: {
    state: () => Promise<{ state: LockInState; todos: LockInTodo[] }>;
    start: (title: string | undefined, threadId: string) => Promise<LockInState>;
    finish: (id: string, threadId: string) => Promise<LockInState>;
    addTodo: (title: string) => Promise<LockInTodo[]>;
    completeTodo: (id: string, completed: boolean) => Promise<LockInTodo[]>;
  };
  markNotificationsRead: (ids: string[]) => Promise<void>;
}

export interface ToolRegistration {
  name: string;
  description: string;
  instructions?: string;
  presentation?: { label: { pending: string; completed: string } };
  parameters: z.ZodType;
  execute(input: never, context: { threadId: string; projectId: string; signal: AbortSignal }): Promise<string>;
}

const COMMUNITY = "Tinkerer Club is a real community of people building things; the user is a member and everything you do here is visible under their name.";

function fail(cause: unknown): never {
  if (cause instanceof TinkererError) {
    if (cause.code === "no_key") throw new Error("No Tinkerer Club API key is configured. Ask the user to add one in the Tinkerer plugin settings.");
    throw new Error(`Tinkerer Club error ${cause.code}${cause.status ? ` (${cause.status})` : ""}: ${cause.message}`);
  }
  throw cause instanceof Error ? cause : new Error(String(cause));
}

function describeDraft(draft: ComposeInput): string {
  const lines = [
    "Post preview (short post):",
    "---",
    draft.content,
    "---",
    `topics: ${draft.topicSlugs.length > 0 ? draft.topicSlugs.map((s) => `#${s}`).join(" ") : "none"}`,
    `project: ${draft.projectId ?? "none"}`,
    `visibility: ${draft.timeline ? "timeline" : "topics only"} · ${draft.mode === "queue" ? "queued (spaced out by the post queue)" : "publish now"}`,
  ];
  if (draft.linkPreviewUrl) lines.push(`link preview: ${draft.linkPreviewUrl}`);
  return lines.join("\n");
}

export function buildTools(deps: ToolDeps): ToolRegistration[] {
  const tools: ToolRegistration[] = [];

  tools.push({
    name: "tinkerer_me",
    description: `Who the user is on Tinkerer Club: profile, level, sparks, progress to the next level and all-time rank. ${COMMUNITY} Read-only.`,
    presentation: { label: { pending: "Reading your Tinkerer profile", completed: "Read your Tinkerer profile" } },
    parameters: z.object({}),
    async execute() {
      try {
        const me = await deps.client.call<Author>("user/getCurrentUser", {}, { ttlMs: 60_000 });
        const stats = await deps.client.call<UserStats>("leaderboard/userStats", { userId: me.id, includeRank: true }, { ttlMs: 60_000 });
        const wallet = await deps.client.call<{ balance: number }>("shop/wallet", {}, { ttlMs: 60_000 });
        return [
          `${displayName(me)} (@${me.username ?? "?"}) · id ${me.id}`,
          `Level ${stats.level.level} ${stats.level.name} · ${stats.totalPoints} sparks all-time · ${wallet.balance} spendable`,
          stats.nextLevel
            ? `${stats.progress.earnedInLevel}/${stats.progress.neededForNext ?? "?"} toward level ${stats.nextLevel.level} ${stats.nextLevel.name} (${stats.pointsToNextLevel ?? "?"} to go)`
            : "Top level reached",
          `All-time rank: ${stats.rankAllTime ?? "unranked"} · ${stats.points30d} sparks in the last 30 days`,
        ].join("\n");
      } catch (cause) {
        return fail(cause);
      }
    },
  });

  tools.push({
    name: "tinkerer_timeline",
    description: `Recent posts from the Tinkerer Club timeline, or from one topic when \`topic\` is given (a topic slug such as ai-llms). ${COMMUNITY} Read-only; returns post ids you can cite with the ::tinkerer{post="<id>"} directive.`,
    presentation: { label: { pending: "Reading the Tinkerer timeline", completed: "Read the Tinkerer timeline" } },
    parameters: z.object({
      limit: z.number().int().min(1).max(30).default(10).describe("How many posts (1–30)."),
      cursor: z.string().optional().describe("nextCursor from a previous call, for the next page."),
      topic: z.string().optional().describe("Topic slug to read a topic feed instead of the main timeline."),
    }),
    async execute(input: { limit: number; cursor?: string; topic?: string }) {
      try {
        const page = input.topic
          ? await deps.client.call<{ items: Post[]; nextCursor?: string | null }>("topic/feed", {
              slug: input.topic,
              includeChildren: true,
              limit: input.limit,
              ...(input.cursor ? { cursor: input.cursor } : {}),
            })
          : await deps.client.call<{ items: Post[]; nextCursor?: string | null }>("post/timeline", {
              limit: input.limit,
              supportsSparsePages: true,
              ...(input.cursor ? { cursor: input.cursor } : {}),
            });
        const now = Date.now();
        const body = page.items.map((post) => describePost(post, now)).join("\n\n");
        return `${body || "No posts."}${page.nextCursor ? `\n\nnextCursor: ${page.nextCursor}` : ""}`;
      } catch (cause) {
        return fail(cause);
      }
    },
  });

  tools.push({
    name: "tinkerer_search",
    description: `Search Tinkerer Club members, posts, articles and chats. ${COMMUNITY} Read-only.`,
    presentation: { label: { pending: "Searching Tinkerer Club", completed: "Searched Tinkerer Club" } },
    parameters: z.object({ query: z.string().trim().min(1).max(200) }),
    async execute(input: { query: string }) {
      try {
        const result = await deps.client.call<Record<string, Array<{ id: string; title: string; subtitle?: string; href?: string }>>>("search/all", { query: input.query });
        const sections = Object.entries(result)
          .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
          .map(([section, rows]) => {
            const lines = rows.slice(0, 8).map((row) => `- ${row.title}${row.subtitle ? ` — ${row.subtitle}` : ""}${row.href ? ` (https://app.tinkerer.club${row.href})` : ""} [${row.id}]`);
            return `${section} (${rows.length}):\n${lines.join("\n")}`;
          });
        return sections.length > 0 ? sections.join("\n\n") : "No results.";
      } catch (cause) {
        return fail(cause);
      }
    },
  });

  tools.push({
    name: "tinkerer_notifications",
    description: `The user's Tinkerer Club notifications, newest first. ${COMMUNITY} Read-only unless \`markRead\` is true, which marks the returned notifications read.`,
    presentation: { label: { pending: "Reading Tinkerer notifications", completed: "Read Tinkerer notifications" } },
    parameters: z.object({
      limit: z.number().int().min(1).max(50).default(20),
      unreadOnly: z.boolean().default(false),
      markRead: z.boolean().default(false).describe("Mark the returned notifications as read."),
    }),
    async execute(input: { limit: number; unreadOnly: boolean; markRead: boolean }) {
      try {
        const page = await deps.client.call<{ items: Notification[]; nextCursor?: string | null }>("notification/list", { limit: input.limit });
        const items = input.unreadOnly ? page.items.filter((n) => !n.read) : page.items;
        if (input.markRead) await deps.markNotificationsRead(items.filter((n) => !n.read).map((n) => n.id));
        const now = Date.now();
        const lines = items.map((n) => `${n.read ? "  " : "• "}${relativeTime(n.createdAt, now).padStart(4)}  ${n.title}${n.link ? `  https://app.tinkerer.club${n.link}` : ""}`);
        return lines.length > 0 ? lines.join("\n") : "No notifications.";
      } catch (cause) {
        return fail(cause);
      }
    },
  });

  tools.push({
    name: "tinkerer_post",
    description: `Publish a short post to Tinkerer Club under the user's name. ${COMMUNITY} Never post without being asked, never post twice, never post filler. The first call returns a preview; call again with the same fields and confirm=true to publish. When the user's "confirm before agent posts" setting is on, the confirming call also opens an approval card in the thread and only the user's click publishes.`,
    instructions: "tinkerer_post is a two-step tool: call once for a preview, then again with confirm=true. Wait for the preview before confirming. Keep posts short, specific and in the user's voice; a link to the thing built beats a summary of it.",
    presentation: { label: { pending: "Preparing a Tinkerer post", completed: "Handled a Tinkerer post" } },
    parameters: z.object({
      content: z.string().trim().min(1).max(4000).describe("The post body. Plain text; URLs become link previews."),
      topicSlugs: z.array(z.string()).max(10).default([]).describe("Topic slugs from tinkerer_call topic/list, e.g. [\"ai-llms\"]."),
      projectId: z.string().optional().describe("One of the user's project ids (project/myProjects) to attach."),
      timeline: z.boolean().optional().describe("Show on the main timeline (default: the plugin setting)."),
      queue: z.boolean().default(false).describe("Queue instead of publishing now."),
      confirm: z.boolean().default(false).describe("Set true on the second call to publish."),
    }),
    async execute(input: { content: string; topicSlugs: string[]; projectId?: string; timeline?: boolean; queue: boolean; confirm: boolean }, context) {
      const settings = deps.settings();
      const draft: ComposeInput = {
        content: input.content,
        topicSlugs: input.topicSlugs,
        projectId: input.projectId ?? null,
        timeline: input.timeline ?? settings.defaultTimeline,
        mode: input.queue ? "queue" : "publish",
        linkPreviewUrl: null,
      };
      if (!input.confirm) {
        return `${describeDraft(draft)}\n\nNot posted. Call tinkerer_post again with the same fields and confirm=true to ${draft.mode === "queue" ? "queue" : "publish"} it.`;
      }
      try {
        if (settings.confirmAgentPosts) {
          const approved = await deps.requestPostApproval(context.threadId, draft, context.signal);
          if (!approved) return "The user declined this post. Do not retry unless they ask.";
        }
        const post = await deps.createPost(draft);
        return `${draft.mode === "queue" ? "Queued" : "Published"} post ${post.id}\n${postUrl(post)}\nCite it in chat with ::tinkerer{post="${post.id}"}`;
      } catch (cause) {
        return fail(cause);
      }
    },
  });

  tools.push({
    name: "tinkerer_lockin",
    description: `The user's Tinkerer Club lock-in session: a personal focus timer with todos. Start one named after the task, add and complete todos as you finish work, finish when done. ${COMMUNITY} Lock-in is personal state and needs no confirmation.`,
    presentation: { label: { pending: "Updating the lock-in session", completed: "Updated the lock-in session" } },
    parameters: z.object({
      action: z.enum(["status", "start", "finish", "todos", "addTodo", "completeTodo", "reopenTodo"]),
      title: z.string().trim().max(200).optional().describe("Session title for start, or todo title for addTodo."),
      todoId: z.string().optional().describe("Todo id for completeTodo / reopenTodo."),
    }),
    async execute(input: { action: string; title?: string; todoId?: string }, context) {
      try {
        const render = (state: LockInState, todos: LockInTodo[]) => {
          const current = state.current && !state.current.endedAt ? state.current : null;
          const head = current
            ? `Locked in${current.title ? `: ${current.title}` : ""} · started ${relativeTime(current.startedAt)} ago · ends ${new Date(current.expiresAt).toLocaleTimeString()} · id ${current.id}`
            : "No lock-in running.";
          const others = state.participants.filter((p) => p.user && p.id !== current?.id).map((p) => displayName(p.user)).join(", ");
          const todoLines = todos.map((t) => `[${t.completed ? "x" : " "}] ${t.id}  ${t.title}`);
          return [head, others ? `Also locked in: ${others}` : null, todoLines.length > 0 ? todoLines.join("\n") : "No todos."].filter(Boolean).join("\n");
        };
        switch (input.action) {
          case "status":
          case "todos": {
            const { state, todos } = await deps.lockIn.state();
            return render(state, todos);
          }
          case "start": {
            const state = await deps.lockIn.start(input.title, context.threadId);
            const { todos } = await deps.lockIn.state();
            return render(state, todos);
          }
          case "finish": {
            const { state } = await deps.lockIn.state();
            const current = state.current && !state.current.endedAt ? state.current : null;
            if (!current) return "No lock-in is running.";
            const next = await deps.lockIn.finish(current.id, context.threadId);
            return `Finished lock-in ${current.id}.\n${render(next, [])}`;
          }
          case "addTodo": {
            if (!input.title) throw new Error("addTodo needs a title.");
            const todos = await deps.lockIn.addTodo(input.title);
            const { state } = await deps.lockIn.state();
            return render(state, todos);
          }
          case "completeTodo":
          case "reopenTodo": {
            if (!input.todoId) throw new Error(`${input.action} needs a todoId.`);
            const todos = await deps.lockIn.completeTodo(input.todoId, input.action === "completeTodo");
            const { state } = await deps.lockIn.state();
            return render(state, todos);
          }
          default:
            throw new Error(`Unknown action ${input.action}`);
        }
      } catch (cause) {
        return fail(cause);
      }
    },
  });

  tools.push({
    name: "tinkerer_call",
    description: `Call any Tinkerer Club platform procedure by name (\`namespace/procedure\`, e.g. topic/list, project/myProjects, post/listComments) with a JSON input object. ${COMMUNITY} Read-only procedures are always allowed; write procedures (create, send, like, markRead, …) only when the user enabled "allow agent writes via tinkerer_call". Admin procedures are never available. Pass procedure="list" to list every procedure name.`,
    presentation: { label: { pending: "Calling the Tinkerer platform", completed: "Called the Tinkerer platform" } },
    parameters: z.object({
      procedure: z.string().describe("namespace/procedure, or \"list\" to see all names."),
      input: z.record(z.string(), z.unknown()).default({}).describe("JSON input object; {} when the procedure takes none."),
    }),
    async execute(input: { procedure: string; input: Record<string, unknown> }) {
      if (input.procedure === "list") {
        return PROCEDURES.filter((name) => classifyProcedure(name) !== "blocked").join("\n");
      }
      if (!isKnownProcedure(input.procedure)) {
        throw new Error(`Unknown procedure "${input.procedure}". Call tinkerer_call with procedure="list" to see the catalog.`);
      }
      const kind = classifyProcedure(input.procedure);
      if (kind === "blocked") throw new Error(`${input.procedure} is admin-only and not available.`);
      if (kind === "write" && !deps.settings().allowAgentWrites) {
        throw new Error(`${input.procedure} is a write. The user has not enabled "allow agent writes via tinkerer_call"; use tinkerer_post or tinkerer_lockin, or ask the user to enable it.`);
      }
      try {
        const result = await deps.client.call(input.procedure, input.input);
        const text = JSON.stringify(result, null, 1);
        return text.length > 60_000 ? `${text.slice(0, 60_000)}\n…(truncated; page with cursor/limit)` : text;
      } catch (cause) {
        return fail(cause);
      }
    },
  });

  return tools;
}

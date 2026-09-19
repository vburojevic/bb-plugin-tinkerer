// Which procedures an agent may reach through `tinkerer_call`.
//
// Admin-only procedures 403 for members and are never exposed. Reads are
// recognized by their final segment's verb; anything unrecognized is a write,
// which errs on the safe side: a write needs the "allow agent writes" setting.
import { PROCEDURES } from "./procedures.generated";

export type ProcedureClass = "read" | "write" | "blocked";

const BLOCKED_EXACT = new Set(["bot/catalog", "bot/status", "post/analysis", "leaderboard/recapPreview"]);

/** Final-segment names (or prefixes) that only read. */
const READ_VERBS = [
  "list",
  "get",
  "by",
  "my",
  "search",
  "count",
  "unread",
  "preview",
  "trending",
  "timeline",
  "feed",
  "tree",
  "state",
  "todos",
  "calendar",
  "live",
  "wallet",
  "ledger",
  "catalog",
  "levels",
  "leaderboard",
  "userStats",
  "githubCommits",
  "collection",
  "benefits",
  "giveaways",
  "activeTopics",
  "community",
  "all",
  "profile",
  "top",
  "typingStatus",
  "bookmarked",
  "article",
];

const KNOWN = new Set(PROCEDURES);

export function isKnownProcedure(name: string): boolean {
  return KNOWN.has(name);
}

export function classifyProcedure(name: string): ProcedureClass {
  if (name.startsWith("admin/") || BLOCKED_EXACT.has(name)) return "blocked";
  const last = name.split("/").pop() ?? "";
  const lower = last.toLowerCase();
  // `liveChat/list` reads; `liveChat/send` writes. Check the verb on the last segment only.
  for (const verb of READ_VERBS) {
    const v = verb.toLowerCase();
    if (lower === v || lower.startsWith(v)) {
      // "listMembers", "getCurrentUser", "byId", "myProjects", "searchAll" …
      // but never "listen"-style false positives: the verb must end at a
      // capital letter boundary in the original name.
      const rest = last.slice(verb.length);
      if (rest.length === 0 || /^[A-Z0-9]/.test(rest)) return "read";
    }
  }
  return "write";
}

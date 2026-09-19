// Pure polling arithmetic for the unread/live watcher. The service in
// server.ts feeds it snapshots; it decides what is worth a toast.

export interface PollSnapshot {
  notifications: number;
  dms: number;
  /** Unread @-mentions across active topic chats. */
  mentions: number;
  liveId: string | null;
  liveStartsAt: string | null;
  /** Newest timeline post id; optional so snapshots saved before it existed still load. */
  latestPostId?: string | null;
  /** Total unread across every conversation (DMs and rooms). */
  messages?: number;
  /** Sum of message counts across active topic chats: any new chat message moves it. */
  topicMessages?: number;
  /** Id of the running lock-in session, or null. */
  lockInId?: string | null;
}

export type PollSignal =
  | { kind: "dm"; count: number }
  | { kind: "mention"; count: number }
  | { kind: "live"; id: string };

export const MAX_POLL_DELAY_MS = 10 * 60_000;

/** Base interval after a success; doubles per consecutive failure, capped. */
export function nextDelayMs(baseMs: number, consecutiveFailures: number): number {
  return Math.min(MAX_POLL_DELAY_MS, baseMs * 2 ** consecutiveFailures);
}

export type ChangeScope = "timeline" | "notifications" | "messages" | "topics" | "lockin" | "live";

/** Which views have new data between two polls. Null previous = everything is new, but nothing to announce. */
export function diffScopes(previous: PollSnapshot | null, next: PollSnapshot): ChangeScope[] {
  if (previous === null) return [];
  const scopes: ChangeScope[] = [];
  if ((next.latestPostId ?? null) !== (previous.latestPostId ?? null)) scopes.push("timeline");
  if (next.notifications !== previous.notifications) scopes.push("notifications");
  if (next.dms !== previous.dms || (next.messages ?? 0) !== (previous.messages ?? 0)) scopes.push("messages");
  if (next.mentions !== previous.mentions || (next.topicMessages ?? 0) !== (previous.topicMessages ?? 0)) scopes.push("topics");
  if ((next.lockInId ?? null) !== (previous.lockInId ?? null)) scopes.push("lockin");
  if (next.liveId !== previous.liveId || next.liveStartsAt !== previous.liveStartsAt) scopes.push("live");
  return scopes;
}

/** What changed between two polls that deserves a toast. Null previous = first observation, stay quiet. */
export function diffSignals(previous: PollSnapshot | null, next: PollSnapshot): PollSignal[] {
  if (previous === null) return [];
  const signals: PollSignal[] = [];
  if (next.dms > previous.dms) signals.push({ kind: "dm", count: next.dms });
  if (next.mentions > previous.mentions) signals.push({ kind: "mention", count: next.mentions });
  if (next.liveId !== null && next.liveId !== previous.liveId) signals.push({ kind: "live", id: next.liveId });
  return signals;
}

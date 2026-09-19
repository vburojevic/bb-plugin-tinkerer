// Pure polling arithmetic for the unread/live watcher. The service in
// server.ts feeds it snapshots; it decides what is worth a toast.

export interface PollSnapshot {
  notifications: number;
  dms: number;
  /** Unread @-mentions across active topic chats. */
  mentions: number;
  liveId: string | null;
  liveStartsAt: string | null;
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

/** What changed between two polls that deserves a toast. Null previous = first observation, stay quiet. */
export function diffSignals(previous: PollSnapshot | null, next: PollSnapshot): PollSignal[] {
  if (previous === null) return [];
  const signals: PollSignal[] = [];
  if (next.dms > previous.dms) signals.push({ kind: "dm", count: next.dms });
  if (next.mentions > previous.mentions) signals.push({ kind: "mention", count: next.mentions });
  if (next.liveId !== null && next.liveId !== previous.liveId) signals.push({ kind: "live", id: next.liveId });
  return signals;
}

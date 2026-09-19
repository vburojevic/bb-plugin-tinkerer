// One shared status snapshot per window. The sidebar badge, the footer menu,
// the panel, and the toast bridge all read it; whichever mounts first loads
// it, and every realtime "status" signal reloads it once for everyone.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../server";
import { REALTIME_CHANNEL, type RealtimeSignal, type Status } from "../lib/contract";

type Rpc = ReturnType<typeof useRpc<typeof rpcContract>>;

let status: Status | null = null;
let error: string | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function load(rpc: Rpc, method: "status" | "refresh" = "status"): Promise<void> {
  if (inflight) return inflight;
  inflight = rpc
    .call(method)
    .then((next) => {
      status = next;
      error = null;
    })
    .catch((cause: unknown) => {
      error = cause instanceof Error ? cause.message : String(cause);
    })
    .finally(() => {
      inflight = null;
      emit();
    });
  return inflight;
}

export interface StatusView {
  status: Status | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStatus(): StatusView {
  const rpc = useRpc<typeof rpcContract>();
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
  );
  useEffect(() => {
    if (status === null) void load(rpc);
  }, [rpc]);
  useRealtime(
    REALTIME_CHANNEL,
    useCallback(
      (payload: unknown) => {
        if ((payload as RealtimeSignal | null)?.kind === "status") void load(rpc);
      },
      [rpc],
    ),
  );
  const refresh = useCallback(() => load(rpc, "refresh"), [rpc]);
  return { status: snapshot, error, refresh };
}

/** Tell every subscriber to re-read (after a local mutation the server also announces). */
export function invalidateStatus(rpc: Rpc): void {
  void load(rpc);
}

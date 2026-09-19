// Two always-mounted, chrome-free pieces: the unread pill in the sidebar row
// and the overlay that turns server toasts into host toasts.
import { useCallback } from "react";
import { useBbNavigate, useRealtime } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { REALTIME_CHANNEL, type RealtimeSignal } from "../lib/contract";
import { CountBadge } from "./shared";
import { PANEL_PATH } from "./Panel";
import { useStatus } from "./store";
import { useThemeAccent } from "./theme";

export function UnreadAccessory() {
  const { status } = useStatus();
  const total = status?.unread.total ?? 0;
  if (!status?.connected) return null;
  if (status.live) {
    return (
      <span className="tk-root inline-flex items-center gap-1.5">
        <span className="tk-live-dot" aria-label="Live now" />
        <CountBadge count={total} />
      </span>
    );
  }
  if (total === 0) return null;
  return (
    <span className="tk-root">
      <CountBadge count={total} />
    </span>
  );
}

/** Mounted once per window; the only place server toasts become host toasts. */
export function ToastBridge() {
  const navigate = useBbNavigate();
  useThemeAccent();
  useRealtime(
    REALTIME_CHANNEL,
    useCallback(
      (payload: unknown) => {
        const signal = payload as RealtimeSignal | null;
        if (!signal || signal.kind !== "toast") return;
        const options = {
          description: signal.description,
          action: signal.href ? { label: "Open", onClick: () => navigate.toPluginPanel(PANEL_PATH, { subPath: signal.href ?? "" }) } : undefined,
        };
        if (signal.tone === "success") toast.success(signal.title, options);
        else toast(signal.title, options);
      },
      [navigate],
    ),
  );
  return null;
}

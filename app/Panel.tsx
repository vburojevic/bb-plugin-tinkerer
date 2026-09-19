// The panel body: a tab strip, then one tab's content in a scrolling column.
// The nav panel keeps the tab in the route (`subPath`) so back/forward walk
// it; the thread side panel keeps it in state. Both render this.
import { useState, type ReactNode } from "react";
import { useBbNavigate, useRpc, useSettings } from "@get-bb/plugin-sdk/app";
import { Add01Icon, Key01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import { Composer } from "./Composer";
import { Inbox, type InboxTab } from "./Inbox";
import { Live } from "./Live";
import { LockIn } from "./LockIn";
import { Me } from "./Me";
import { Glyph } from "./shared";
import { invalidateStatus, useStatus } from "./store";
import { Timeline } from "./Timeline";

export const PANEL_PATH = "tinkerer";
export type Tab = "timeline" | "inbox" | "me" | "lockin" | "live";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "timeline", label: "Timeline" },
  { id: "inbox", label: "Inbox" },
  { id: "me", label: "Me" },
  { id: "lockin", label: "Lock-in" },
  { id: "live", label: "Live" },
];

export interface PanelRoute {
  tab: Tab;
  inbox: InboxTab;
}

export function parseSubPath(subPath: string): PanelRoute {
  const [head = "", rest = ""] = subPath.split("/");
  const tab = (TABS.some((t) => t.id === head) ? head : "timeline") as Tab;
  const inbox: InboxTab = rest === "dms" || rest === "topics" ? rest : "notifications";
  return { tab, inbox };
}

export function subPathFor(route: PanelRoute): string {
  if (route.tab === "inbox" && route.inbox !== "notifications") return `inbox/${route.inbox}`;
  return route.tab;
}

export function ConnectState() {
  const navigate = useBbNavigate();
  const { status, refresh } = useStatus();
  void navigate;
  const invalid = status?.keyPresent && status.error;
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className="tk-spark-soft mx-auto flex size-12 items-center justify-center rounded-full">
        <Glyph icon={Key01Icon} size={22} className="tk-spark-text" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">{invalid ? "Tinkerer Club rejected the key" : "Connect your Tinkerer Club account"}</h2>
      <p className="mt-1 text-sm text-muted-foreground text-balance">
        {invalid
          ? status?.error
          : "Paste your personal API key in the plugin settings. It stays on this machine; every request goes out as you."}
      </p>
      <ol className="mx-auto mt-4 max-w-xs space-y-1 text-left text-sm text-muted-foreground">
        <li>1. Open app.tinkerer.club → Settings → API keys and create a key.</li>
        <li>2. In bb, open Settings → Plugins → Tinkerer and paste it as the API key.</li>
        <li>3. Come back here; the panel connects on its own.</li>
      </ol>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          <Glyph icon={RefreshIcon} size={14} />
          Check again
        </Button>
      </div>
    </div>
  );
}

export function TabStrip({ route, onRoute, right }: { route: PanelRoute; onRoute: (next: PanelRoute) => void; right?: ReactNode }) {
  const { status } = useStatus();
  const unread = status?.unread.total ?? 0;
  return (
    <div className="flex items-center gap-1 border-b border-border px-3 py-1.5">
      <nav aria-label="Tinkerer sections" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {TABS.map((tab) => {
          const active = route.tab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onRoute({ ...route, tab: tab.id })}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
                active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.id === "inbox" && unread > 0 ? <span className="tk-count">{unread > 99 ? "99+" : unread}</span> : null}
              {tab.id === "live" && status?.live ? <span className="tk-live-dot" aria-label="Live now" /> : null}
              {tab.id === "lockin" && status?.lockIn ? <span className="size-1.5 rounded-full" style={{ background: "var(--tk-spark)" }} aria-label="Lock-in running" /> : null}
            </button>
          );
        })}
      </nav>
      {right}
    </div>
  );
}

export function NewPostButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const rpc = useRpc<typeof rpcContract>();
  return (
    <>
      <Button size="sm" className={cn("h-7 gap-1.5", className)} onClick={() => setOpen(true)}>
        <Glyph icon={Add01Icon} size={14} />
        New post
      </Button>
      <Composer open={open} onOpenChange={setOpen} onPosted={() => invalidateStatus(rpc)} />
    </>
  );
}

export function PanelBody({ route, threadId, className }: { route: PanelRoute; threadId?: string | null; className?: string }) {
  const { status, error } = useStatus();
  const { values } = useSettings();
  void values;
  if (status === null && error === null) return <div className="p-4 text-sm text-muted-foreground">Connecting…</div>;
  if (status === null || !status.keyPresent || (status.error && !status.connected)) return <ConnectState />;
  return (
    <div className={cn("mx-auto w-full max-w-2xl p-3 md:p-4", className)}>
      {route.tab === "timeline" ? <Timeline /> : null}
      {route.tab === "inbox" ? <InboxHolder route={route} /> : null}
      {route.tab === "me" ? <Me /> : null}
      {route.tab === "lockin" ? <LockIn threadId={threadId} /> : null}
      {route.tab === "live" ? <Live /> : null}
    </div>
  );
}

function InboxHolder({ route }: { route: PanelRoute }) {
  const [tab, setTab] = useState<InboxTab>(route.inbox);
  return <Inbox tab={tab} onTab={setTab} />;
}

/** The whole panel: strip + body. Used by the nav panel and the thread side panel. */
export function TinkererPanel({ route, onRoute, threadId }: { route: PanelRoute; onRoute: (next: PanelRoute) => void; threadId?: string | null }) {
  const { status } = useStatus();
  return (
    <div className="tk-root flex h-full min-h-0 flex-col">
      <TabStrip route={route} onRoute={onRoute} right={status?.connected ? <NewPostButton /> : null} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PanelBody route={route} threadId={threadId} />
      </div>
    </div>
  );
}

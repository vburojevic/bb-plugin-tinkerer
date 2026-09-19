// The panel body: a tab strip, then one tab's content in a scrolling column.
// The nav panel keeps the tab in the route (`subPath`) so back/forward walk
// it; the thread side panel keeps it in state. Both render this.
import { useState, type ReactNode } from "react";
import { UrlLink, useRpc } from "@get-bb/plugin-sdk/app";
import { Add01Icon, Key01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import { Composer } from "./Composer";
import { Inbox, type InboxTab } from "./Inbox";
import { Live } from "./Live";
import { LockIn } from "./LockIn";
import { Me } from "./Me";
import { CountBadge, Glyph, Tip } from "./shared";
import { invalidateStatus, useLiveRefresh, useStatus } from "./store";
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
  const { status, refresh } = useStatus();
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
      <ol className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm">
        <li className="flex gap-3">
          <span className="tk-spark-soft tk-spark-text flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">1</span>
          <span className="text-muted-foreground">
            Create a key on <span className="text-foreground">app.tinkerer.club</span> under Settings → API keys.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="tk-spark-soft tk-spark-text flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">2</span>
          <span className="text-muted-foreground">
            Paste it in bb under <span className="text-foreground">Settings → Plugins → Tinkerer</span>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="tk-spark-soft tk-spark-text flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">3</span>
          <span className="text-muted-foreground">Come back here. The panel connects on its own.</span>
        </li>
      </ol>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <UrlLink href="https://app.tinkerer.club/settings">Get a key</UrlLink>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void refresh()}>
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
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <Tabs value={route.tab} onValueChange={(value) => onRoute({ ...route, tab: value as Tab })} className="min-w-0 flex-1">
        <TabsList aria-label="Tinkerer sections" className="tk-chips h-8 w-full justify-start gap-0.5 rounded-none bg-transparent p-0 pb-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="tk-tab h-7 shrink-0 gap-1.5 rounded-md px-2.5 text-sm font-normal text-muted-foreground shadow-none data-[state=active]:bg-muted data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {tab.label}
              {tab.id === "inbox" ? <CountBadge count={unread} /> : null}
              {tab.id === "live" && status?.live ? <span className="tk-live-dot" aria-label="Live now" /> : null}
              {tab.id === "lockin" && status?.lockIn ? <span className="size-1.5 rounded-full" style={{ background: "var(--tk-spark)" }} aria-label="Lock-in running" /> : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {right}
    </div>
  );
}

export function NewPostButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const rpc = useRpc<typeof rpcContract>();
  return (
    <>
      <Tip label="New post">
        <Button size="sm" className={cn("tk-newpost h-7 gap-1.5", className)} onClick={() => setOpen(true)} aria-label="New post">
          <Glyph icon={Add01Icon} size={14} />
          <span className="tk-newpost-label">New post</span>
        </Button>
      </Tip>
      <Composer open={open} onOpenChange={setOpen} onPosted={() => invalidateStatus(rpc)} />
    </>
  );
}

export function PanelBody({ route, threadId, className }: { route: PanelRoute; threadId?: string | null; className?: string }) {
  const { status, error } = useStatus();
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
  // On screen means live: the server polls faster while someone is looking.
  useLiveRefresh();
  return (
    <TooltipProvider>
      <div className="tk-root flex h-full min-h-0 flex-col">
        <TabStrip route={route} onRoute={onRoute} right={status?.connected ? <NewPostButton /> : null} />
        <div className="tk-scroll min-h-0 flex-1 overflow-y-auto">
          <PanelBody route={route} threadId={threadId} />
        </div>
      </div>
    </TooltipProvider>
  );
}

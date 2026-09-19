// The connection card on the plugin's settings page, under the host-rendered
// settings form: who the key belongs to, whether it works, and the two links
// a new user needs.
import { UrlLink, useBbNavigate, useRpc } from "@get-bb/plugin-sdk/app";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import { displayName } from "../lib/format";
import { PANEL_PATH } from "./Panel";
import { UserAvatar } from "./shared";
import { useStatus } from "./store";

export function ConnectionSection() {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const { status, refresh } = useStatus();
  const [checking, setChecking] = useState(false);
  void rpc;

  const check = async () => {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  const state = !status ? "loading" : !status.keyPresent ? "no-key" : status.connected ? "ok" : "failing";
  return (
    <TooltipProvider>
      <div className="tk-root">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            {state === "ok" ? <UserAvatar author={status?.me} className="size-10" /> : <div className={cn("size-10 rounded-full", state === "failing" ? "bg-destructive/15" : "bg-muted")} aria-hidden />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                {state === "loading" ? "Checking…" : state === "no-key" ? "Not connected" : state === "ok" ? `Connected as ${displayName(status?.me)}` : "Key rejected"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {state === "no-key"
                  ? "Paste your API key above. It stays on this machine."
                  : state === "ok"
                    ? `@${status?.me?.username ?? "?"} · polling every ${status?.pollIntervalSeconds ?? 60}s · ${status?.unread.total ?? 0} unread`
                    : state === "failing"
                      ? (status?.error ?? "Tinkerer Club did not accept the key.")
                      : ""}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void check()} disabled={checking}>
              {checking ? "Checking…" : "Check now"}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <UrlLink href="https://app.tinkerer.club/settings">Get an API key on tinkerer.club</UrlLink>
            </Button>
            {state === "ok" ? (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate.toPluginPanel(PANEL_PATH, { subPath: "" })}>
                Open the Tinkerer panel
              </Button>
            ) : null}
          </div>
        </Card>
        <p className="mt-3 text-xs text-muted-foreground">
          Agents get seven tools and the <code>bb tinkerer</code> command. Posting always previews first, and with “Confirm before an agent posts” on, only your click in the thread publishes.
        </p>
      </div>
    </TooltipProvider>
  );
}

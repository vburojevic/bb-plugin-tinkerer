// The sidebar footer disclosure: four rows that answer "anything for me?"
// without opening the panel. New post opens the composer right here; the
// other rows jump to their tab.
import { useState } from "react";
import { useBbContext, useBbNavigate, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Add01Icon, InboxIcon, Timer01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import { countdown } from "../lib/format";
import { Composer } from "./Composer";
import { isLiveNow, liveUrl } from "./Live";
import { PANEL_PATH } from "./Panel";
import { CountBadge, Glyph, useNow } from "./shared";
import { invalidateStatus, useStatus } from "./store";

function Row({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const base = "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors";
  if (!onClick) return <div className={cn(base, className)}>{children}</div>;
  return (
    <button type="button" onClick={onClick} className={cn(base, "hover:bg-muted", className)}>
      {children}
    </button>
  );
}

export function FooterMenu({ dismiss }: { dismiss: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const { threadId } = useBbContext();
  const { status } = useStatus();
  const now = useNow();
  const [compose, setCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (subPath: string) => {
    dismiss();
    navigate.toPluginPanel(PANEL_PATH, { subPath });
  };

  const startLockIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let next = title.trim();
      if (!next && threadId) {
        next = (await rpc.call("threadTitle", { threadId }).catch(() => ({ title: null }))).title ?? "";
      }
      await rpc.call("lockInStart", next ? { title: next } : {});
      invalidateStatus(rpc);
      setTitle("");
      toast.success("Locked in for an hour");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not start the lock-in");
    } finally {
      setBusy(false);
    }
  };
  const finishLockIn = async () => {
    if (busy || !status?.lockIn) return;
    setBusy(true);
    try {
      await rpc.call("lockInFinish", { id: status.lockIn.id });
      invalidateStatus(rpc);
      toast.success("Lock-in finished");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not finish the lock-in");
    } finally {
      setBusy(false);
    }
  };

  if (!status || !status.keyPresent || !status.connected) {
    return (
      <div className="tk-root w-64 p-2">
        <Row onClick={() => go("")}>
          <span className="text-muted-foreground">{status?.keyPresent ? "Tinkerer Club is not answering." : "Connect your Tinkerer Club key."}</span>
        </Row>
      </div>
    );
  }

  const live = status.live && isLiveNow(status.live) ? status.live : status.live && status.live.startsAt && Date.parse(status.live.startsAt) - now < 3_600_000 ? status.live : null;
  const buckets = [
    { label: "notifications", count: status.unread.notifications, path: "inbox" },
    { label: "messages", count: status.unread.dms, path: "inbox/dms" },
    { label: "topic mentions", count: status.unread.mentions, path: "inbox/topics" },
  ].filter((b) => b.count > 0);

  return (
    <TooltipProvider>
    <div className="tk-root w-72 space-y-0.5 p-1.5">
      <Row onClick={() => setCompose(true)}>
        <Glyph icon={Add01Icon} className="text-muted-foreground" />
        New post
      </Row>

      {status.lockIn ? (
        <Row className="justify-between">
          <span className="flex min-w-0 items-center gap-2.5">
            <Glyph icon={Timer01Icon} className="tk-spark-text" />
            <span className="truncate">{status.lockIn.title ?? "Locked in"}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="tk-clock tk-spark-text text-sm tabular-nums">{countdown(status.lockIn.expiresAt, now)}</span>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={busy} onClick={() => void finishLockIn()}>
              Finish
            </Button>
          </span>
        </Row>
      ) : (
        <form
          className="flex items-center gap-1.5 px-2 py-1"
          onSubmit={(event) => {
            event.preventDefault();
            void startLockIn();
          }}
        >
          <Glyph icon={Timer01Icon} className="text-muted-foreground" />
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={threadId ? "Lock in on this thread" : "Lock in on…"} aria-label="Lock-in title" className="h-7 flex-1 text-xs" />
          <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={busy}>
            Start
          </Button>
        </form>
      )}

      {buckets.length === 0 ? (
        <Row onClick={() => go("inbox")}>
          <Glyph icon={InboxIcon} className="text-muted-foreground" />
          <span className="text-muted-foreground">Inbox is clear</span>
        </Row>
      ) : (
        buckets.map((bucket) => (
          <Row key={bucket.path} onClick={() => go(bucket.path)} className="justify-between">
            <span className="flex items-center gap-2.5">
              <Glyph icon={InboxIcon} className="text-muted-foreground" />
              {bucket.count} unread {bucket.label}
            </span>
            <CountBadge count={bucket.count} />
          </Row>
        ))
      )}

      {live ? (
        <Row
          onClick={() => {
            dismiss();
            navigate.openUrl(liveUrl(live));
          }}
          className="justify-between"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {isLiveNow(live) ? <span className="tk-live-dot ml-1 mr-1" aria-hidden /> : <span className="ml-1 mr-1 size-2 rounded-full bg-muted-foreground" aria-hidden />}
            <span className="truncate">{isLiveNow(live) ? "Live now" : "Starting soon"}: {live.title ?? "broadcast"}</span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">Join</span>
        </Row>
      ) : null}

      <Composer
        open={compose}
        onOpenChange={(open) => {
          setCompose(open);
          if (!open) dismiss();
        }}
        onPosted={() => invalidateStatus(rpc)}
      />
    </div>
    </TooltipProvider>
  );
}

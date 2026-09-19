// Live: the banner when a broadcast is on or scheduled, then the week ahead.
import { UrlLink, useRpc } from "@get-bb/plugin-sdk/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { LiveBanner } from "../lib/contract";
import { TINKERER_BASE_URL } from "../lib/client";
import { EmptyState, ErrorState, ListSkeleton, shortDateTime, useAsync } from "./shared";

export function liveUrl(banner: LiveBanner): string {
  if (banner.url) return banner.url;
  if (banner.youtubeVideoId) return `https://www.youtube.com/watch?v=${banner.youtubeVideoId}`;
  return `${TINKERER_BASE_URL}/live`;
}

export function isLiveNow(banner: LiveBanner, now = Date.now()): boolean {
  const status = (banner.broadcastStatus ?? banner.status ?? "").toString().toUpperCase();
  if (status.includes("LIVE")) return true;
  if (banner.startsAt) return Date.parse(banner.startsAt) <= now && (!banner.endsAt || Date.parse(banner.endsAt) > now);
  return false;
}

export function LiveCard({ banner, compact = false }: { banner: LiveBanner; compact?: boolean }) {
  const live = isLiveNow(banner);
  return (
    <div className={cn("rounded-lg border border-border bg-card", compact ? "p-3" : "p-4")}>
      <div className="flex items-center gap-2 text-xs">
        {live ? <span className="tk-live-dot" aria-hidden /> : null}
        <span className={cn("font-medium", live ? "text-foreground" : "text-muted-foreground")}>{live ? "Live now" : `Starts ${shortDateTime(banner.startsAt)}`}</span>
      </div>
      <div className={cn("mt-1 font-medium text-foreground", compact ? "text-sm" : "text-base")}>{banner.title ?? "Tinkerer Club broadcast"}</div>
      {banner.description && !compact ? <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{banner.description}</p> : null}
      <div className="mt-3">
        <Button asChild size="sm" variant={live ? "default" : "outline"}>
          <UrlLink href={liveUrl(banner)}>{live ? "Join the broadcast" : "Open event"}</UrlLink>
        </Button>
      </div>
    </div>
  );
}

export function Live({ className }: { className?: string }) {
  const rpc = useRpc<typeof rpcContract>();
  const data = useAsync(() => rpc.call("live"), [rpc]);
  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (data.loading || !data.data) return <ListSkeleton rows={2} />;
  const { banner, upcoming } = data.data;
  return (
    <div className={cn("space-y-5", className)}>
      {banner ? <LiveCard banner={banner} /> : <EmptyState title="Nothing is live right now">Broadcasts and live sessions show up here the moment they start.</EmptyState>}
      <section aria-labelledby="tk-upcoming">
        <h3 id="tk-upcoming" className="text-sm font-medium text-foreground">This week</h3>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No events on the calendar for the next seven days.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border/60 rounded-lg border border-border bg-card">
            {upcoming.map((event) => (
              <li key={event.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">{event.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {shortDateTime(event.startsAt)}
                    {event.type ? ` · ${event.type.toLowerCase().replace("_", " ")}` : ""}
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <UrlLink href={event.url ?? `${TINKERER_BASE_URL}/events/${event.id}`}>Details</UrlLink>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

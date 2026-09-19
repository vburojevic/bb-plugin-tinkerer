// Me: the level card is the hero (name, level, one progress bar to the next
// level), then three stat tiles, badges, the sparks ledger, and the
// leaderboard with a period switch. Numbers are tabular; labels are quiet.
import { useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { Badge as BadgeType } from "../lib/contract";
import { compactNumber, displayName, mediaUrl, relativeTime } from "../lib/format";
import { Segmented } from "./Inbox";
import { ErrorState, ListSkeleton, UserAvatar, useAsync } from "./shared";
import { useChanges } from "./store";

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums leading-tight text-foreground">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

function BadgeTile({ badge }: { badge: BadgeType }) {
  const src = mediaUrl(badge.assetPath);
  return (
    <li
      className={cn("flex flex-col items-center gap-1 rounded-md p-2 text-center", !badge.earned && "opacity-40 grayscale")}
      title={`${badge.title}${badge.description ? ` — ${badge.description}` : ""}${badge.earned ? "" : ` (${Math.round(badge.progress ?? 0)}%)`}`}
    >
      {src ? <img src={src} alt="" className="size-10 object-contain" loading="lazy" /> : <span className="size-10 rounded-full bg-muted" />}
      <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">{badge.title}</span>
    </li>
  );
}

function Leaderboard({ meId }: { meId: string | null }) {
  const rpc = useRpc<typeof rpcContract>();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const rows = useAsync(() => rpc.call("leaderboard", { period }), [rpc, period]);
  return (
    <section aria-labelledby="tk-leaderboard">
      <div className="flex items-center justify-between gap-2">
        <h3 id="tk-leaderboard" className="text-sm font-medium text-foreground">Leaderboard</h3>
        <Segmented value={period} onChange={setPeriod} items={[{ id: "daily", label: "Today" }, { id: "weekly", label: "Week" }, { id: "monthly", label: "Month" }]} />
      </div>
      <div className="mt-2">
        {rows.error ? <ErrorState message={rows.error} onRetry={rows.reload} /> : rows.loading || !rows.data ? <ListSkeleton rows={4} /> : (
          <Card asChild>
          <ol className="divide-y divide-border/60">
            {rows.data.map((row) => {
              const mine = row.user.id === meId;
              return (
                <li key={row.user.id} className={cn("flex items-center gap-2.5 px-3 py-2", mine && "tk-spark-soft")}>
                  <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{row.rank}</span>
                  <UserAvatar author={row.user} className="size-6" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{displayName(row.user)}</span>
                  {row.level ? <span className="hidden text-xs text-muted-foreground sm:inline">L{row.level.level}</span> : null}
                  <span className="text-sm tabular-nums text-foreground">{compactNumber(row.points)}</span>
                </li>
              );
            })}
          </ol>
          </Card>
        )}
      </div>
    </section>
  );
}

export function Me({ className }: { className?: string }) {
  const rpc = useRpc<typeof rpcContract>();
  const me = useAsync(() => rpc.call("me"), [rpc]);
  // Sparks move when someone reacts or comments; the notification poll tells us.
  useChanges(["notifications", "lockin"], me.reload);
  if (me.error) return <ErrorState message={me.error} onRetry={me.reload} />;
  if (me.loading || !me.data) return <ListSkeleton rows={3} tall />;
  const { user, stats, balance, badges, commitsWeek, ledger } = me.data;
  const ratio = Math.max(0, Math.min(1, stats.progress.ratio));
  const earnedBadges = badges.filter((b) => b.earned);
  const nextBadges = badges.filter((b) => !b.earned).sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)).slice(0, 4);

  return (
    <div className={cn("space-y-5", className)}>
      <Card className="p-4" role="region" aria-label="Level">
        <div className="flex items-center gap-3">
          <UserAvatar author={user} className="size-12" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold leading-tight text-foreground">{displayName(user)}</div>
            <div className="text-sm text-muted-foreground">
              Level {stats.level.level} <span className="text-foreground">{stats.level.name}</span>
              {stats.rankAllTime ? <> · #{stats.rankAllTime} all-time</> : null}
            </div>
          </div>
          <div className="text-right">
            <div className="tk-spark-text text-2xl font-semibold tabular-nums leading-none">{compactNumber(balance)}</div>
            <div className="mt-1 text-xs text-muted-foreground">sparks</div>
          </div>
        </div>
        <div className="mt-4">
          <Progress value={ratio * 100} className="tk-progress h-1.5 bg-muted" aria-label="Progress to the next level" />
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">
              {stats.progress.earnedInLevel}
              {stats.progress.neededForNext ? ` / ${stats.progress.neededForNext}` : ""} in this level
            </span>
            {stats.nextLevel ? (
              <span>
                {stats.pointsToNextLevel ?? "?"} to <span className="text-foreground">{stats.nextLevel.name}</span>
              </span>
            ) : (
              <span>Top level</span>
            )}
          </div>
        </div>
      </Card>

      <div className="tk-stats grid grid-cols-3 gap-2">
        <StatTile label="Last 30 days" value={compactNumber(stats.points30d)} hint="sparks earned" />
        <StatTile label="All-time" value={compactNumber(stats.totalPoints)} hint="sparks" />
        <StatTile label="Commits this week" value={commitsWeek ? String(commitsWeek.commits) : "—"} hint={commitsWeek ? `#${commitsWeek.rank} on GitHub` : "connect GitHub on the web"} />
      </div>

      <section aria-labelledby="tk-badges">
        <div className="flex items-baseline justify-between">
          <h3 id="tk-badges" className="text-sm font-medium text-foreground">Badges</h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {earnedBadges.length} of {badges.length}
          </span>
        </div>
        <Card asChild>
          <ul className="tk-badges mt-2 grid grid-cols-5 gap-1 p-2">
          {earnedBadges.map((badge) => (
            <BadgeTile key={badge.key} badge={badge} />
          ))}
          {nextBadges.map((badge) => (
            <BadgeTile key={badge.key} badge={badge} />
          ))}
          </ul>
        </Card>
      </section>

      {ledger.length > 0 ? (
        <section aria-labelledby="tk-ledger">
          <h3 id="tk-ledger" className="text-sm font-medium text-foreground">Recent sparks</h3>
          <Card asChild>
          <ul className="mt-2 divide-y divide-border/60">
            {ledger.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-foreground">{row.label}</span>
                <span className="text-xs text-muted-foreground">{relativeTime(row.createdAt)}</span>
                <span className={cn("w-12 text-right tabular-nums", row.amount >= 0 ? "tk-spark-text" : "text-muted-foreground")}>
                  {row.amount >= 0 ? "+" : ""}
                  {row.amount}
                </span>
              </li>
            ))}
          </ul>
          </Card>
        </section>
      ) : null}

      <Leaderboard meId={user.id} />
    </div>
  );
}

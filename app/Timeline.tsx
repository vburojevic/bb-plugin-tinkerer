// The timeline: trending chips on top, then the feed, then a quiet "more".
// A chip switches the feed to that topic; the same chip clears it.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { Post } from "../lib/contract";
import { PostCard } from "./PostCard";
import { EmptyState, ErrorState, ListSkeleton, useAsync } from "./shared";

export function TopicChips({ active, onPick }: { active: string | null; onPick: (slug: string | null) => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const trending = useAsync(() => rpc.call("trending"), [rpc]);
  // Numeric "hashtags" are list markers the platform picked up ("1." → #1); not topics.
  const chips = (trending.data ?? []).filter((row) => row.postCount > 0 && !/^\d+$/.test(row.slug)).slice(0, 10);
  if (!trending.loading && chips.length === 0 && active === null) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Trending topics">
      <Chip active={active === null} onClick={() => onPick(null)}>
        Everything
      </Chip>
      {active !== null && !chips.some((c) => c.slug === active) ? (
        <Chip active onClick={() => onPick(null)}>
          #{active}
        </Chip>
      ) : null}
      {chips.map((chip) => (
        <Chip key={chip.slug} active={active === chip.slug} onClick={() => onPick(active === chip.slug ? null : chip.slug)}>
          #{chip.slug}
          <span className="ml-1 tabular-nums opacity-60">{chip.postCount}</span>
        </Chip>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active ? "tk-spark-soft tk-spark-line text-foreground" : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function Timeline({ className }: { className?: string }) {
  const rpc = useRpc<typeof rpcContract>();
  const [topic, setTopic] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const seq = useRef(0);

  const loadFirst = useCallback(() => {
    const mine = ++seq.current;
    setPosts(null);
    setError(null);
    rpc.call("timeline", topic ? { topic } : {}).then(
      (page) => {
        if (mine !== seq.current) return;
        setPosts(page.items);
        setCursor(page.nextCursor);
      },
      (cause: unknown) => {
        if (mine !== seq.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
  }, [rpc, topic]);
  useEffect(loadFirst, [loadFirst]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await rpc.call("timeline", { cursor, ...(topic ? { topic } : {}) });
      setPosts((current) => [...(current ?? []), ...page.items.filter((p) => !current?.some((c) => c.id === p.id))]);
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadingMore(false);
    }
  };

  const replace = (fresh: Post) => setPosts((current) => current?.map((p) => (p.id === fresh.id ? fresh : p)) ?? current);

  return (
    <div className={cn("space-y-3", className)}>
      <TopicChips active={topic} onPick={setTopic} />
      {error ? (
        <ErrorState message={error} onRetry={loadFirst} />
      ) : posts === null ? (
        <ListSkeleton rows={3} tall />
      ) : posts.length === 0 ? (
        <EmptyState title={topic ? `Nothing in #${topic} yet` : "The timeline is quiet"}>{topic ? "Be the one who starts it." : "Nobody has posted lately. Ship something and tell them."}</EmptyState>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onChange={replace} />
          ))}
          {cursor ? (
            <div className="flex justify-center py-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Older posts"}
              </Button>
            </div>
          ) : (
            <p className="py-2 text-center text-xs text-muted-foreground">That is everything.</p>
          )}
        </>
      )}
    </div>
  );
}

// The timeline: a filter row (everything, one topic, or a trending hashtag),
// then the feed, then a quiet "older". Topics come from a searchable picker
// sorted by activity; hashtags are the week's trending ones.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { ArrowDown01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { Post, Topic } from "../lib/contract";
import { PostCard } from "./PostCard";
import { EmptyState, ErrorState, Glyph, ListSkeleton, useAsync } from "./shared";
import { useChanges } from "./store";

export type FeedFilter = { kind: "all" } | { kind: "hashtag"; slug: string } | { kind: "topic"; topic: Topic };

function Chip({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors",
        active ? "tk-spark-soft tk-spark-line text-foreground" : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TopicPickerChip({ topics, active, onPick }: { topics: Topic[]; active: Topic | null; onPick: (topic: Topic | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Chip active={active !== null} onClick={() => setOpen(true)}>
          {active ? (
            <>
              <span aria-hidden>{active.emoji ?? "#"}</span>
              {active.name}
            </>
          ) : (
            "Topic"
          )}
          <Glyph icon={ArrowDown01Icon} size={12} className="opacity-60" />
        </Chip>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Find a topic" />
          <CommandList className="max-h-72">
            <CommandEmpty>No topic matches.</CommandEmpty>
            <CommandGroup>
              {topics.map((topic) => (
                <CommandItem
                  key={topic.slug}
                  value={`${topic.name} ${topic.slug}`}
                  onSelect={() => {
                    onPick(topic);
                    setOpen(false);
                  }}
                  className="gap-2 text-sm"
                >
                  <span className="w-5 text-center" aria-hidden>
                    {topic.emoji ?? "#"}
                  </span>
                  <span className="flex-1 truncate">{topic.name}</span>
                  {topic.posts ? <span className="text-xs tabular-nums text-muted-foreground">{topic.posts}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function FilterRow({ filter, onFilter }: { filter: FeedFilter; onFilter: (next: FeedFilter) => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const trending = useAsync(() => rpc.call("trending"), [rpc]);
  const topics = useAsync(() => rpc.call("topics"), [rpc]);
  // Numeric "hashtags" are list markers the platform picked up ("1." → #1); not topics.
  const hashtags = (trending.data ?? []).filter((row) => row.postCount > 0 && !/^\d+$/.test(row.slug)).slice(0, 10);
  const activeHashtag = filter.kind === "hashtag" ? filter.slug : null;
  return (
    <div className="tk-chips" role="group" aria-label="Feed filter">
      <Chip active={filter.kind === "all"} onClick={() => onFilter({ kind: "all" })}>
        Everything
      </Chip>
      <TopicPickerChip topics={(topics.data ?? []).filter((t) => (t.posts ?? 0) > 0)} active={filter.kind === "topic" ? filter.topic : null} onPick={(topic) => onFilter(topic ? { kind: "topic", topic } : { kind: "all" })} />
      {filter.kind === "topic" ? (
        <Chip active={false} onClick={() => onFilter({ kind: "all" })} className="px-2" aria-label="Clear topic">
          <Glyph icon={Cancel01Icon} size={12} />
        </Chip>
      ) : null}
      {activeHashtag !== null && !hashtags.some((h) => h.slug === activeHashtag) ? (
        <Chip active onClick={() => onFilter({ kind: "all" })}>
          #{activeHashtag}
        </Chip>
      ) : null}
      {hashtags.map((chip) => (
        <Chip key={chip.slug} active={activeHashtag === chip.slug} onClick={() => onFilter(activeHashtag === chip.slug ? { kind: "all" } : { kind: "hashtag", slug: chip.slug })}>
          #{chip.slug}
          <span className="tabular-nums opacity-60">{chip.postCount}</span>
        </Chip>
      ))}
    </div>
  );
}

function feedArgs(filter: FeedFilter, cursor?: string) {
  return {
    ...(cursor ? { cursor } : {}),
    ...(filter.kind === "hashtag" ? { hashtag: filter.slug } : {}),
    ...(filter.kind === "topic" ? { topic: filter.topic.slug } : {}),
  };
}

export function Timeline({ className }: { className?: string }) {
  const rpc = useRpc<typeof rpcContract>();
  const [filter, setFilter] = useState<FeedFilter>({ kind: "all" });
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const seq = useRef(0);
  const filterKey = filter.kind === "all" ? "all" : filter.kind === "hashtag" ? `#${filter.slug}` : `topic:${filter.topic.slug}`;

  const loadFirst = useCallback(() => {
    const mine = ++seq.current;
    setPosts(null);
    setError(null);
    rpc.call("timeline", feedArgs(filter)).then(
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, filterKey]);
  useEffect(loadFirst, [loadFirst]);

  // New posts from a poll slide in at the top; what you were reading stays put.
  const mergeFresh = useCallback(() => {
    const mine = seq.current;
    rpc.call("timeline", feedArgs(filter)).then(
      (page) => {
        if (mine !== seq.current) return;
        setPosts((current) => {
          if (current === null) return page.items;
          const known = new Map(current.map((p) => [p.id, p]));
          const fresh = page.items.filter((p) => !known.has(p.id));
          const updated = current.map((p) => page.items.find((n) => n.id === p.id) ?? p);
          return [...fresh, ...updated];
        });
      },
      () => {},
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, filterKey]);
  useChanges(["timeline"], mergeFresh);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await rpc.call("timeline", feedArgs(filter, cursor));
      setPosts((current) => [...(current ?? []), ...page.items.filter((p) => !current?.some((c) => c.id === p.id))]);
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadingMore(false);
    }
  };

  const replace = (fresh: Post) => setPosts((current) => current?.map((p) => (p.id === fresh.id ? fresh : p)) ?? current);
  const emptyTitle = filter.kind === "all" ? "The timeline is quiet" : filter.kind === "hashtag" ? `Nothing tagged #${filter.slug} yet` : `Nothing in ${filter.topic.name} yet`;

  return (
    <div className={cn("space-y-3", className)}>
      <FilterRow filter={filter} onFilter={setFilter} />
      {error ? (
        <ErrorState message={error} onRetry={loadFirst} />
      ) : posts === null ? (
        <ListSkeleton rows={3} tall />
      ) : posts.length === 0 ? (
        <EmptyState title={emptyTitle}>{filter.kind === "all" ? "Nobody has posted lately. Ship something and tell them." : "Be the one who starts it."}</EmptyState>
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

// A post as bb would draw it: one quiet card, the author line as the only
// bold element, media and previews framed as inner cards, polls as bars,
// long articles folded, and a single row of low-contrast actions.
import { useState, type ReactNode } from "react";
import { UrlLink, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Bookmark01Icon, Comment01Icon, FavouriteIcon, LinkSquare02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { Comment, LinkPreview, Poll, Post } from "../lib/contract";
import { TINKERER_BASE_URL } from "../lib/client";
import { displayName, isVideoPath, mediaUrl, postMediaUrl, postUrl, relativeTime } from "../lib/format";
import { Glyph, ListSkeleton, Tip, UserAvatar, useAsync } from "./shared";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g;
/** Bodies longer than this fold behind "Show more". */
const FOLD_CHARS = 700;

/** Plain text with links made clickable; nothing else is interpreted. */
export function Linkified({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push(
      <UrlLink key={`${index}`} href={match[0]} className="underline underline-offset-2 hover:text-foreground">
        {match[0]}
      </UrlLink>,
    );
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <p className={cn("tk-prose text-sm leading-relaxed text-foreground", className)}>{parts}</p>;
}

export function LinkPreviewCard({ preview, compact = false }: { preview: LinkPreview; compact?: boolean }) {
  const image = mediaUrl(preview.imageUrl);
  let host = preview.provider ?? "";
  if (!host) {
    try {
      host = new URL(preview.url).hostname;
    } catch {
      host = preview.url;
    }
  }
  return (
    <UrlLink
      href={preview.url}
      className={cn(
        "flex overflow-hidden rounded-md border border-border bg-background text-left no-underline transition-colors hover:bg-muted",
        compact ? "flex-row" : "flex-col",
      )}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          className={cn("shrink-0 object-cover", compact ? "h-20 w-28" : "max-h-52 w-full")}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="min-w-0 flex-1 px-3 py-2">
        <span className="block truncate text-xs text-muted-foreground">{host}</span>
        {preview.title ? <span className="mt-0.5 block truncate text-sm font-medium text-foreground">{preview.title}</span> : null}
        {preview.description && !compact ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{preview.description}</span> : null}
      </span>
    </UrlLink>
  );
}

function Media({ paths, compact }: { paths: string[]; compact: boolean }) {
  const items = paths.map((path) => ({ path, url: postMediaUrl(path) })).filter((m): m is { path: string; url: string } => m.url !== null);
  if (items.length === 0) return null;
  const videos = items.filter((m) => isVideoPath(m.path));
  const images = items.filter((m) => !isVideoPath(m.path));
  return (
    <div className="mt-3 space-y-2">
      {videos.map((video) => (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video key={video.path} src={video.url} controls preload="metadata" playsInline className="max-h-96 w-full rounded-md border border-border bg-black" />
      ))}
      {images.length > 0 ? (
        <div className={cn("grid gap-1.5 overflow-hidden rounded-md", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {images.slice(0, 4).map((image) => (
            <UrlLink key={image.path} href={image.url} className="block bg-muted">
              <img src={image.url} alt="" loading="lazy" className={cn("w-full object-cover", images.length > 1 ? "aspect-[4/3]" : compact ? "max-h-64" : "max-h-[28rem]")} />
            </UrlLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PollView({ poll, postId, onChange }: { poll: Poll; postId: string; onChange?: (post: Post) => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const [busy, setBusy] = useState(false);
  const closed = poll.isEnded === true || (poll.endsAt ? Date.parse(poll.endsAt) < Date.now() : false);
  const voted = !!poll.myOptionId;
  const showResults = closed || voted || poll.resultsVisible === true;
  const total = poll.totalVoteCount ?? poll.options.reduce((sum, o) => sum + (o.voteCount ?? 0), 0);
  const vote = async (optionId: string) => {
    if (busy || closed || voted) return;
    setBusy(true);
    try {
      const fresh = await rpc.call("votePoll", { postId, optionId });
      onChange?.(fresh);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not vote");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 space-y-1.5" role="group" aria-label="Poll">
      {poll.options.map((option) => {
        const pct = Math.max(0, Math.min(100, option.percentage ?? 0));
        const mine = poll.myOptionId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={closed || voted || busy}
            onClick={() => void vote(option.id)}
            className={cn("tk-poll-bar flex w-full items-center px-3 py-1.5 text-left text-sm", !closed && !voted && "hover:border-foreground/30")}
            data-mine={mine}
            aria-pressed={mine}
          >
            {showResults ? <span className="tk-poll-fill" style={{ "--tk-ratio": pct / 100 } as React.CSSProperties} aria-hidden /> : null}
            <span className="relative z-10 min-w-0 flex-1 truncate text-foreground">
              {option.emoji ? `${option.emoji} ` : ""}
              {option.label}
            </span>
            {showResults ? <span className="relative z-10 ml-3 shrink-0 text-xs tabular-nums text-muted-foreground">{pct}%</span> : null}
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground">
        {total} {total === 1 ? "vote" : "votes"}
        {closed ? " · closed" : voted ? " · you voted" : ""}
      </p>
    </div>
  );
}

function ActionButton({ icon, label, count, active, onClick }: { icon: Parameters<typeof Glyph>[0]["icon"]; label: string; count?: number; active?: boolean; onClick?: () => void }) {
  return (
    <Tip label={label}>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground", active && "tk-spark-text hover:tk-spark-text")}
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
      >
        <Glyph icon={icon} size={15} />
        {count !== undefined && count > 0 ? <span className="tabular-nums">{count}</span> : null}
      </Button>
    </Tip>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  return (
    <li className="flex gap-2.5">
      <UserAvatar author={comment.author} className="size-6" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="font-medium text-foreground">{displayName(comment.author)}</span>
          <span className="text-muted-foreground">{relativeTime(comment.createdAt)}</span>
        </div>
        <Linkified text={comment.content} className="mt-0.5 text-[13px]" />
        {comment.images && comment.images.length > 0 ? <Media paths={comment.images} compact /> : null}
      </div>
    </li>
  );
}

function Comments({ postId, onPosted }: { postId: string; onPosted: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const comments = useAsync(() => rpc.call("comments", { postId }), [rpc, postId]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const content = draft.trim();
    if (content.length === 0 || sending) return;
    setSending(true);
    try {
      const comment = await rpc.call("addComment", { postId, content });
      comments.patch((current) => ({ ...current, items: [...current.items, comment] }));
      setDraft("");
      onPosted();
      toast.success("Comment posted");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not post the comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {comments.loading ? (
        <ListSkeleton rows={1} />
      ) : comments.error ? (
        <p className="text-xs text-muted-foreground">Comments did not load: {comments.error}</p>
      ) : comments.data && comments.data.items.length > 0 ? (
        <ul className="space-y-3">
          {comments.data.items.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No comments yet. Yours would be the first.</p>
      )}
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Reply as yourself"
          rows={1}
          className="min-h-9 flex-1 resize-none text-sm"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <Tip label="Post comment (⌘↵)">
          <Button type="submit" size="sm" variant="outline" disabled={sending || draft.trim().length === 0} aria-label="Post comment">
            <Glyph icon={SentIcon} size={15} />
          </Button>
        </Tip>
      </form>
    </div>
  );
}

export interface PostCardProps {
  post: Post;
  /** Called with the fresh post after a like / bookmark / vote round trip. */
  onChange?: (post: Post) => void;
  /** Transcript variant: tighter, no comment thread. */
  compact?: boolean;
  className?: string;
}

export function PostCard({ post, onChange, compact = false, className }: PostCardProps) {
  const rpc = useRpc<typeof rpcContract>();
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"like" | "bookmark" | "react" | null>(null);
  const [commentBump, setCommentBump] = useState(0);
  const media = post.images ?? [];
  const previews = post.linkPreviews ?? [];
  const content = (post.content ?? "").trim();
  const isArticle = post.type === "ARTICLE";
  const foldable = !expanded && (content.length > FOLD_CHARS || (isArticle && content.length > 300));
  const web = postUrl(post);
  const profile = post.author.username ? `${TINKERER_BASE_URL}/u/${post.author.username}` : null;
  const time = post.publishedAt ?? post.createdAt;

  const react = async (emoji: string) => {
    if (busy) return;
    setBusy("react");
    try {
      const on = !(post.myReactions ?? []).includes(emoji);
      onChange?.(await rpc.call("react", { postId: post.id, emoji, on }));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Tinkerer Club did not accept that");
    } finally {
      setBusy(null);
    }
  };

  const mutate = async (kind: "like" | "bookmark") => {
    if (busy) return;
    setBusy(kind);
    try {
      const fresh = kind === "like" ? await rpc.call("like", { postId: post.id, liked: !post.likedByMe }) : await rpc.call("bookmark", { postId: post.id });
      onChange?.(fresh);
      if (kind === "bookmark") toast.success(fresh.bookmarkedByMe ? "Bookmarked" : "Bookmark removed");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Tinkerer Club did not accept that");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card role="article" className={cn(compact ? "p-3" : "p-4", className)} aria-label={`Post by ${displayName(post.author)}`}>
      <header className="flex items-center gap-2.5">
        <UserAvatar author={post.author} className={compact ? "size-7" : "size-8"} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-baseline gap-1.5">
            {profile ? (
              <UrlLink href={profile} className="truncate text-sm font-medium text-foreground no-underline hover:underline">
                {displayName(post.author)}
              </UrlLink>
            ) : (
              <span className="truncate text-sm font-medium text-foreground">{displayName(post.author)}</span>
            )}
            {post.author.username ? <span className="truncate text-xs text-muted-foreground">@{post.author.username}</span> : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <time dateTime={time ?? undefined} title={time ? new Date(time).toLocaleString() : undefined}>
              {relativeTime(time)}
            </time>
            {isArticle ? (
              <>
                <span aria-hidden>·</span>
                <span>Article</span>
              </>
            ) : null}
            {post.project?.title ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{post.project.title}</span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {post.title ? <h3 className="mt-3 text-base font-semibold leading-snug text-foreground">{post.title}</h3> : null}
      {content ? (
        <div className={cn(foldable && "tk-fold")}>
          <Linkified text={content} className={cn(post.title ? "mt-1" : "mt-3", compact && "text-[13px]")} />
        </div>
      ) : null}
      {foldable ? (
        <button type="button" className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setExpanded(true)}>
          Show more
        </button>
      ) : null}

      <Media paths={media} compact={compact} />

      {previews.length > 0 && media.length === 0 ? (
        <div className="mt-3 space-y-2">
          {previews.slice(0, 2).map((preview) => (
            <LinkPreviewCard key={preview.url} preview={preview} compact={compact} />
          ))}
        </div>
      ) : null}

      {post.poll ? <PollView poll={post.poll} postId={post.id} onChange={onChange} /> : null}

      {post.topics && post.topics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.topics.map((topic) => (
            <span key={topic.slug} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {topic.emoji ? `${topic.emoji} ` : "#"}
              {topic.name ?? topic.slug}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="mt-2 -ml-2 flex items-center gap-0.5">
        <ActionButton icon={FavouriteIcon} label={post.likedByMe ? "Unlike" : "Like"} count={post.likeCount ?? undefined} active={post.likedByMe} onClick={() => void mutate("like")} />
        {compact ? (
          <ActionButton icon={Comment01Icon} label="Comments" count={post.commentCount ?? undefined} />
        ) : (
          <ActionButton icon={Comment01Icon} label={showComments ? "Hide comments" : "Show comments"} count={(post.commentCount ?? 0) + commentBump} active={showComments} onClick={() => setShowComments((open) => !open)} />
        )}
        <ActionButton icon={Bookmark01Icon} label={post.bookmarkedByMe ? "Remove bookmark" : "Bookmark"} active={post.bookmarkedByMe} onClick={() => void mutate("bookmark")} />
        {post.reactions && post.reactions.length > 0 ? (
          <span className="ml-1 flex items-center gap-1" role="group" aria-label="Reactions">
            {post.reactions.slice(0, 4).map((reaction) => {
              const mine = (post.myReactions ?? []).includes(reaction.emoji);
              return (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => void react(reaction.emoji)}
                  aria-pressed={mine}
                  aria-label={`${mine ? "Remove" : "Add"} ${reaction.emoji} reaction`}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs tabular-nums transition-colors",
                    mine ? "tk-spark-soft tk-spark-line text-foreground" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <span aria-hidden>{reaction.emoji}</span>
                  {reaction.count}
                </button>
              );
            })}
          </span>
        ) : null}
        <span className="flex-1" />
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
          <UrlLink href={web} aria-label="Open on tinkerer.club">
            <Glyph icon={LinkSquare02Icon} size={14} />
            Open
          </UrlLink>
        </Button>
      </footer>

      {showComments && !compact ? <Comments postId={post.id} onPosted={() => setCommentBump((n) => n + 1)} /> : null}
    </Card>
  );
}

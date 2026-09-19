// A post as bb would draw it: one quiet card, the author line as the only
// bold element, previews framed as a second inner card, and a single row of
// low-contrast actions that only wake up on hover.
import { useState, type ReactNode } from "react";
import { UrlLink, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Bookmark01Icon, Comment01Icon, FavouriteIcon, LinkSquare02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { Comment, LinkPreview, Post } from "../lib/contract";
import { displayName, mediaUrl, postUrl, relativeTime } from "../lib/format";
import { Glyph, ListSkeleton, UserAvatar, useAsync } from "./shared";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g;

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
  return (
    <UrlLink
      href={preview.url}
      className={cn(
        "group/preview flex overflow-hidden rounded-md border border-border bg-background text-left no-underline transition-colors hover:bg-muted",
        compact ? "flex-row" : "flex-col",
      )}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          className={cn("shrink-0 object-cover", compact ? "h-20 w-28" : "max-h-48 w-full")}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="min-w-0 flex-1 px-3 py-2">
        <span className="block truncate text-xs text-muted-foreground">{preview.provider ?? new URL(preview.url).hostname}</span>
        {preview.title ? <span className="mt-0.5 block truncate text-sm font-medium text-foreground">{preview.title}</span> : null}
        {preview.description && !compact ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{preview.description}</span> : null}
      </span>
    </UrlLink>
  );
}

function ActionButton({ icon, label, count, active, onClick }: { icon: Parameters<typeof Glyph>[0]["icon"]; label: string; count?: number; active?: boolean; onClick?: () => void }) {
  return (
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
        <Button type="submit" size="sm" variant="outline" disabled={sending || draft.trim().length === 0} aria-label="Post comment">
          <Glyph icon={SentIcon} size={15} />
        </Button>
      </form>
    </div>
  );
}

export interface PostCardProps {
  post: Post;
  /** Called with the fresh post after a like / bookmark round trip. */
  onChange?: (post: Post) => void;
  /** Transcript variant: tighter, no comment thread. */
  compact?: boolean;
  className?: string;
}

export function PostCard({ post, onChange, compact = false, className }: PostCardProps) {
  const rpc = useRpc<typeof rpcContract>();
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState<"like" | "bookmark" | null>(null);
  const [commentBump, setCommentBump] = useState(0);
  const images = (post.images ?? []).map(mediaUrl).filter((url): url is string => url !== null);
  const previews = post.linkPreviews ?? [];
  const content = (post.content ?? "").trim();
  const web = postUrl(post);

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
    <article className={cn("rounded-lg border border-border bg-card", compact ? "p-3" : "p-4", className)} aria-label={`Post by ${displayName(post.author)}`}>
      <header className="flex items-center gap-2.5">
        <UserAvatar author={post.author} className={compact ? "size-7" : "size-8"} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{displayName(post.author)}</span>
            {post.author.username ? <span className="truncate text-xs text-muted-foreground">@{post.author.username}</span> : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <time dateTime={post.publishedAt ?? post.createdAt ?? undefined}>{relativeTime(post.publishedAt ?? post.createdAt)}</time>
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
      {content ? <Linkified text={content} className={cn(post.title ? "mt-1" : "mt-3", compact && "text-[13px]")} /> : null}

      {images.length > 0 ? (
        <div className={cn("mt-3 grid gap-1.5 overflow-hidden rounded-md", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {images.slice(0, 4).map((src) => (
            <UrlLink key={src} href={src} className="block">
              <img src={src} alt="" loading="lazy" className={cn("w-full object-cover", images.length > 1 ? "aspect-[4/3]" : "max-h-96")} />
            </UrlLink>
          ))}
        </div>
      ) : null}

      {previews.length > 0 && images.length === 0 ? (
        <div className="mt-3 space-y-2">
          {previews.slice(0, 2).map((preview) => (
            <LinkPreviewCard key={preview.url} preview={preview} compact={compact} />
          ))}
        </div>
      ) : null}

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
        <ActionButton icon={FavouriteIcon} label={post.likedByMe ? "Unlike" : "Like"} count={post.likeCount} active={post.likedByMe} onClick={() => void mutate("like")} />
        {compact ? (
          <ActionButton icon={Comment01Icon} label="Comments" count={post.commentCount} />
        ) : (
          <ActionButton icon={Comment01Icon} label={showComments ? "Hide comments" : "Show comments"} count={(post.commentCount ?? 0) + commentBump} active={showComments} onClick={() => setShowComments((open) => !open)} />
        )}
        <ActionButton icon={Bookmark01Icon} label={post.bookmarkedByMe ? "Remove bookmark" : "Bookmark"} active={post.bookmarkedByMe} onClick={() => void mutate("bookmark")} />
        {post.reactions && post.reactions.length > 0 ? (
          <span className="ml-1 flex items-center gap-1 text-xs text-muted-foreground" aria-label="Reactions">
            {post.reactions.slice(0, 4).map((reaction) => (
              <span key={reaction.emoji} className="tabular-nums">
                {reaction.emoji} {reaction.count}
              </span>
            ))}
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
    </article>
  );
}

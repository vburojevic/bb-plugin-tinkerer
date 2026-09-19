// Inbox: three buckets under one segmented control. Notifications mark
// themselves read as you act on them; DMs and topic chats open in place with
// a reply box, no navigation.
import { useEffect, useState } from "react";
import { UrlLink, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { ArrowLeft01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { Author, Conversation, Notification, TopicChat } from "../lib/contract";
import { TINKERER_BASE_URL } from "../lib/client";
import { displayName, excerpt, relativeTime } from "../lib/format";
import { Linkified } from "./PostCard";
import { CountBadge, EmptyState, ErrorState, Glyph, ListSkeleton, Tip, UserAvatar, useAsync } from "./shared";
import { invalidateStatus, useChanges, useStatus } from "./store";

export type InboxTab = "notifications" | "dms" | "topics";

export function Segmented<T extends string>({ value, onChange, items, label }: { value: T; onChange: (next: T) => void; items: Array<{ id: T; label: string; count?: number | null }>; label?: string }) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)}>
      <TabsList aria-label={label} className="h-8 gap-0.5 rounded-md border border-border bg-transparent p-0.5">
        {items.map((item) => (
          <TabsTrigger key={item.id} value={item.id} className="h-full gap-1.5 rounded px-2.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none">
            {item.label}
            <CountBadge count={item.count ?? 0} />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function NotificationRow({ item, onRead }: { item: Notification; onRead: (id: string) => void }) {
  const href = item.link ? `${TINKERER_BASE_URL}${item.link}` : null;
  const body = (
    <>
      <UserAvatar author={item.actor} className="size-7" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", item.read ? "text-muted-foreground" : "text-foreground")}>{item.title}</p>
        {item.body ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{excerpt(item.body, 120)}</p> : null}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(item.createdAt)}</span>
      {!item.read ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: "var(--tk-spark)" }} aria-label="Unread" /> : null}
    </>
  );
  const className = "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted";
  return (
    <li>
      {href ? (
        <UrlLink href={href} className={cn(className, "no-underline")} onClick={() => !item.read && onRead(item.id)}>
          {body}
        </UrlLink>
      ) : (
        <button type="button" className={className} onClick={() => !item.read && onRead(item.id)}>
          {body}
        </button>
      )}
    </li>
  );
}

function Notifications() {
  const rpc = useRpc<typeof rpcContract>();
  const list = useAsync(() => rpc.call("notifications", {}), [rpc]);
  useChanges(["notifications"], list.reload);
  const [more, setMore] = useState(false);
  const unread = list.data?.items.filter((n) => !n.read).length ?? 0;

  const markRead = (id: string) => {
    list.patch((current) => ({ ...current, items: current.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    void rpc.call("markNotificationRead", { id }).then(() => invalidateStatus(rpc)).catch(() => {});
  };
  const markAll = async () => {
    try {
      await rpc.call("markAllNotificationsRead");
      list.patch((current) => ({ ...current, items: current.items.map((n) => ({ ...n, read: true })) }));
      invalidateStatus(rpc);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not mark all read");
    }
  };
  const loadMore = async () => {
    if (!list.data?.nextCursor || more) return;
    setMore(true);
    try {
      const page = await rpc.call("notifications", { cursor: list.data.nextCursor });
      list.patch((current) => ({ items: [...current.items, ...page.items], nextCursor: page.nextCursor }));
    } finally {
      setMore(false);
    }
  };

  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (list.loading || !list.data) return <ListSkeleton rows={4} />;
  if (list.data.items.length === 0) return <EmptyState title="No notifications">When someone reacts, comments or replies, it lands here.</EmptyState>;
  return (
    <div>
      {unread > 0 ? (
        <div className="mb-1 flex justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => void markAll()}>
            Mark all read
          </Button>
        </div>
      ) : null}
      <ul className="-mx-2 divide-y divide-border/60">
        {list.data.items.map((item) => (
          <NotificationRow key={item.id} item={item} onRead={markRead} />
        ))}
      </ul>
      {list.data.nextCursor ? (
        <div className="flex justify-center py-1">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void loadMore()} disabled={more}>
            {more ? "Loading…" : "Older"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ReplyBox({ placeholder, onSend }: { placeholder: string; onSend: (content: string) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await onSend(content);
      setDraft("");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not send");
    } finally {
      setSending(false);
    }
  };
  return (
    <form
      className="flex items-end gap-2 border-t border-border pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        rows={1}
        className="min-h-9 flex-1 resize-none text-sm"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send();
          }
        }}
      />
      <Tip label="Send (Enter)">
        <Button type="submit" size="sm" variant="outline" disabled={sending || draft.trim().length === 0} aria-label="Send">
          <Glyph icon={SentIcon} size={15} />
        </Button>
      </Tip>
    </form>
  );
}

function MessageList({ items, meId }: { items: Array<{ id: string; author: Author | undefined; content: string; createdAt: string; senderId?: string }>; meId: string | null }) {
  if (items.length === 0) return <p className="py-6 text-center text-xs text-muted-foreground">No messages yet.</p>;
  return (
    <ul className="space-y-3 py-1">
      {items.map((m) => {
        const mine = meId !== null && (m.senderId === meId || m.author?.id === meId);
        return (
          <li key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
            <UserAvatar author={m.author} className="size-6" />
            <div className={cn("min-w-0 max-w-[85%] rounded-lg px-3 py-2", mine ? "tk-spark-soft" : "bg-muted")}>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-medium text-foreground">{mine ? "You" : displayName(m.author)}</span>
                <span className="text-muted-foreground">{relativeTime(m.createdAt)}</span>
              </div>
              <Linkified text={m.content} className="mt-0.5 text-[13px]" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ConversationView({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const { status } = useStatus();
  const thread = useAsync(() => rpc.call("messages", { conversationId: conversation.id }), [rpc, conversation.id]);
  const [readTick, setReadTick] = useState(0);
  useChanges(["messages"], () => {
    thread.reload();
    setReadTick((n) => n + 1);
  });
  useEffect(() => {
    void rpc.call("markConversationRead", { conversationId: conversation.id }).then(() => invalidateStatus(rpc)).catch(() => {});
  }, [rpc, conversation.id, readTick]);
  const title = conversation.name ?? displayName(conversation.otherUser);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 pb-2">
        <Tip label="Back">
          <Button variant="ghost" size="icon" className="size-7" onClick={onBack} aria-label="Back to conversations">
            <Glyph icon={ArrowLeft01Icon} />
          </Button>
        </Tip>
        <UserAvatar author={conversation.otherUser} className="size-6" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {thread.error ? <ErrorState message={thread.error} onRetry={thread.reload} /> : thread.loading || !thread.data ? <ListSkeleton rows={3} /> : (
          <MessageList
            meId={status?.me?.id ?? null}
            items={[...thread.data.messages].reverse().map((m) => ({ id: m.id, author: m.sender, content: m.content ?? "", createdAt: m.createdAt, senderId: m.senderId }))}
          />
        )}
      </div>
      <ReplyBox
        placeholder={`Message ${title}`}
        onSend={async (content) => {
          const message = await rpc.call("sendMessage", { conversationId: conversation.id, content });
          thread.patch((current) => ({ ...current, messages: [message, ...current.messages] }));
        }}
      />
    </div>
  );
}

function Conversations() {
  const rpc = useRpc<typeof rpcContract>();
  const list = useAsync(() => rpc.call("conversations"), [rpc]);
  useChanges(["messages"], list.reload);
  const [open, setOpen] = useState<Conversation | null>(null);
  if (open) return <ConversationView conversation={open} onBack={() => { setOpen(null); list.reload(); }} />;
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (list.loading || !list.data) return <ListSkeleton rows={3} />;
  if (list.data.length === 0) return <EmptyState title="No conversations">Direct messages with other members show up here.</EmptyState>;
  return (
    <ul className="-mx-2 divide-y divide-border/60">
      {list.data.map((c) => {
        const unread = c.unreadCount ?? 0;
        return (
          <li key={c.id}>
            <button type="button" onClick={() => setOpen(c)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted">
              <UserAvatar author={c.otherUser} className="size-8" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={cn("truncate text-sm", unread > 0 ? "font-medium text-foreground" : "text-foreground")}>{c.name ?? displayName(c.otherUser)}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{relativeTime(c.lastMessageAt)}</span>
                </div>
                <p className={cn("truncate text-xs", unread > 0 ? "text-foreground" : "text-muted-foreground")}>{excerpt(c.lastMessage?.content, 90) || "No messages yet"}</p>
              </div>
              <CountBadge count={unread} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TopicView({ topic, onBack }: { topic: TopicChat; onBack: () => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const { status } = useStatus();
  const thread = useAsync(() => rpc.call("topicMessages", { slug: topic.slug }), [rpc, topic.slug]);
  const [readTick, setReadTick] = useState(0);
  useChanges(["topics"], () => {
    thread.reload();
    setReadTick((n) => n + 1);
  });
  useEffect(() => {
    void rpc.call("markTopicRead", { slug: topic.slug }).then(() => invalidateStatus(rpc)).catch(() => {});
  }, [rpc, topic.slug, readTick]);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 pb-2">
        <Tip label="Back">
          <Button variant="ghost" size="icon" className="size-7" onClick={onBack} aria-label="Back to topics">
            <Glyph icon={ArrowLeft01Icon} />
          </Button>
        </Tip>
        <span className="text-sm font-medium">
          {topic.emoji ? `${topic.emoji} ` : ""}
          {topic.name}
        </span>
        <span className="text-xs text-muted-foreground">#{topic.slug}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {thread.error ? <ErrorState message={thread.error} onRetry={thread.reload} /> : thread.loading || !thread.data ? <ListSkeleton rows={3} /> : (
          <MessageList
            meId={status?.me?.id ?? null}
            items={[...thread.data.messages].reverse().map((m) => ({ id: m.id, author: m.user, content: m.content ?? "", createdAt: m.createdAt, senderId: m.userId }))}
          />
        )}
      </div>
      <ReplyBox
        placeholder={`Say something in ${topic.name}`}
        onSend={async (content) => {
          const message = await rpc.call("sendTopicMessage", { slug: topic.slug, content });
          thread.patch((current) => ({ ...current, messages: [message, ...current.messages] }));
        }}
      />
    </div>
  );
}

function Topics() {
  const rpc = useRpc<typeof rpcContract>();
  const list = useAsync(() => rpc.call("topicChats"), [rpc]);
  useChanges(["topics"], list.reload);
  const [open, setOpen] = useState<TopicChat | null>(null);
  if (open) return <TopicView topic={open} onBack={() => { setOpen(null); list.reload(); }} />;
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (list.loading || !list.data) return <ListSkeleton rows={4} />;
  if (list.data.length === 0) return <EmptyState title="No active topic chats">Follow a topic on tinkerer.club and its chat appears here.</EmptyState>;
  const sorted = [...list.data].sort((a, b) => (b.unreadMentionCount ?? 0) - (a.unreadMentionCount ?? 0) || Date.parse(b.lastMessage?.createdAt ?? "") - Date.parse(a.lastMessage?.createdAt ?? ""));
  return (
    <ul className="-mx-2 divide-y divide-border/60">
      {sorted.map((t) => (
        <li key={t.slug}>
          <button type="button" onClick={() => setOpen(t)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-base" aria-hidden>
              {t.emoji ?? "#"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-sm text-foreground">{t.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{relativeTime(t.lastMessage?.createdAt)}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{excerpt(t.lastMessage?.content, 90) || `${t.messageCount ?? 0} messages`}</p>
            </div>
            <CountBadge count={t.unreadMentionCount ?? 0} label={`${t.unreadMentionCount} unread mentions`} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Inbox({ tab, onTab, className }: { tab: InboxTab; onTab: (next: InboxTab) => void; className?: string }) {
  const { status } = useStatus();
  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
      <Segmented
        label="Inbox sections"
        value={tab}
        onChange={onTab}
        items={[
          { id: "notifications", label: "Notifications", count: status?.unread.notifications },
          { id: "dms", label: "Messages", count: status?.unread.dms },
          { id: "topics", label: "Topics", count: status?.unread.mentions },
        ]}
      />
      <div className="min-h-0 flex-1">
        {tab === "notifications" ? <Notifications /> : tab === "dms" ? <Conversations /> : <Topics />}
      </div>
    </div>
  );
}

// The composer: one dialog for a short post, and nothing that is not about
// the post. The text field is the whole surface; a link preview appears when
// you paste a URL, topics are chips with a searchable picker plus suggestions
// pulled from the words you typed, and the footer holds the count ring,
// visibility, Queue, and Publish. A draft you close survives until you post
// or discard it.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { LinkPreview, Post, Topic } from "../lib/contract";
import { displayName, postUrl } from "../lib/format";
import { LinkPreviewCard } from "./PostCard";
import { Glyph, Tip, UserAvatar, useAsync } from "./shared";
import { useStatus } from "./store";

const MAX = 4000;
const MAX_TOPICS = 5;

/** The draft outlives the dialog: closing is not discarding. */
let savedDraft: { content: string; topics: string[]; timeline: boolean | null; dismissedPreview: string | null } | null = null;

function firstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/);
  return match ? match[0] : null;
}

function TopicChip({ topic, onRemove }: { topic: Topic | undefined; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} className="tk-spark-soft tk-spark-line inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs text-foreground" aria-label={`Remove topic ${topic?.name ?? ""}`}>
      <span aria-hidden>{topic?.emoji ?? "#"}</span>
      {topic?.name ?? "topic"}
      <Glyph icon={Cancel01Icon} size={11} className="opacity-70" />
    </button>
  );
}

function TopicPicker({ topics, selected, onChange, content }: { topics: Topic[]; selected: string[]; onChange: (next: string[]) => void; content: string }) {
  const [open, setOpen] = useState(false);
  const bySlug = useMemo(() => new Map(topics.map((t) => [t.slug, t])), [topics]);
  const add = (slug: string) => {
    if (selected.includes(slug) || selected.length >= MAX_TOPICS) return;
    onChange([...selected, slug]);
  };
  const remove = (slug: string) => onChange(selected.filter((s) => s !== slug));

  // Suggest topics whose name appears in the draft, busiest first.
  const suggestions = useMemo(() => {
    const haystack = content.toLowerCase();
    if (haystack.length < 3) return [];
    return topics
      .filter((t) => !selected.includes(t.slug) && t.name.length >= 3 && haystack.includes(t.name.toLowerCase()))
      .slice(0, 4);
  }, [topics, selected, content]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((slug) => (
        <TopicChip key={slug} topic={bySlug.get(slug)} onRemove={() => remove(slug)} />
      ))}
      {suggestions.map((topic) => (
        <button key={topic.slug} type="button" onClick={() => add(topic.slug)} className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground">
          <Glyph icon={PlusSignIcon} size={11} />
          <span aria-hidden>{topic.emoji ?? "#"}</span>
          {topic.name}
        </button>
      ))}
      {selected.length < MAX_TOPICS ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Add a topic">
              <Glyph icon={PlusSignIcon} size={11} />
              {selected.length === 0 && suggestions.length === 0 ? "Topic" : ""}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <Command>
              <CommandInput placeholder="Find a topic" autoFocus />
              <CommandList className="max-h-64">
                <CommandEmpty>No topic matches.</CommandEmpty>
                <CommandGroup>
                  {topics.map((topic) => (
                    <CommandItem
                      key={topic.slug}
                      value={`${topic.name} ${topic.slug}`}
                      onSelect={() => {
                        add(topic.slug);
                        setOpen(false);
                      }}
                      className="gap-2 text-sm"
                    >
                      <span className="w-5 text-center" aria-hidden>
                        {topic.emoji ?? "#"}
                      </span>
                      <span className="flex-1 truncate">{topic.name}</span>
                      {selected.includes(topic.slug) ? <span className="tk-spark-text text-xs">added</span> : topic.posts ? <span className="text-xs tabular-nums text-muted-foreground">{topic.posts}</span> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

function CountRing({ count }: { count: number }) {
  const ratio = Math.min(1, count / MAX);
  const r = 9;
  const c = 2 * Math.PI * r;
  const over = count > MAX;
  const nearly = count > MAX * 0.9;
  return (
    <span className="flex items-center gap-1.5" aria-label={`${count} of ${MAX} characters`}>
      <svg className="tk-ring size-6" viewBox="0 0 24 24" data-over={over} aria-hidden>
        <circle className="tk-ring-track" cx="12" cy="12" r={r} fill="none" strokeWidth="2" />
        <circle className="tk-ring-fill" cx="12" cy="12" r={r} fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} />
      </svg>
      {nearly ? <span className={cn("text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>{MAX - count}</span> : null}
    </span>
  );
}

export interface ComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  onPosted?: (post: Post) => void;
}

export function Composer({ open, onOpenChange, initialContent, onPosted }: ComposerProps) {
  const rpc = useRpc<typeof rpcContract>();
  const { status } = useStatus();
  const topics = useAsync(() => (open ? rpc.call("topics") : Promise.resolve([])), [rpc, open]);
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [dismissedPreview, setDismissedPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<"publish" | "queue" | null>(null);
  const previewSeq = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore the draft on open; keep it on close unless it was posted or discarded.
  useEffect(() => {
    if (!open) return;
    const draft = initialContent !== undefined ? null : savedDraft;
    setContent(initialContent ?? draft?.content ?? "");
    setSelected(draft?.topics ?? []);
    setTimeline(draft?.timeline ?? null);
    setDismissedPreview(draft?.dismissedPreview ?? null);
    setPreview(null);
    setBusy(null);
  }, [open, initialContent]);
  useEffect(() => {
    if (!open) return;
    savedDraft = content.trim().length > 0 || selected.length > 0 ? { content, topics: selected, timeline, dismissedPreview } : null;
  }, [open, content, selected, timeline, dismissedPreview]);

  const url = firstUrl(content);
  useEffect(() => {
    if (!open || !url || url === dismissedPreview) {
      setPreview(null);
      return;
    }
    const mine = ++previewSeq.current;
    const timer = window.setTimeout(() => {
      rpc
        .call("previewLink", { url })
        .then((result) => {
          if (mine === previewSeq.current) setPreview(result);
        })
        .catch(() => {
          if (mine === previewSeq.current) setPreview(null);
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [rpc, open, url, dismissedPreview]);

  const showOnTimeline = timeline ?? status?.defaultTimeline ?? true;
  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX && busy === null;
  const hasDraft = trimmed.length > 0 || selected.length > 0;

  const submit = async (mode: "publish" | "queue") => {
    if (!canSubmit) return;
    setBusy(mode);
    try {
      const post = await rpc.call("createPost", {
        content: trimmed,
        topicSlugs: selected,
        projectId: null,
        timeline: showOnTimeline,
        mode,
        linkPreviewUrl: preview ? preview.url : null,
      });
      savedDraft = null;
      toast.success(mode === "queue" ? "Queued" : "Published", { description: postUrl(post) });
      onPosted?.(post);
      onOpenChange(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Tinkerer Club did not accept the post");
      setBusy(null);
    }
  };

  const discard = () => {
    savedDraft = null;
    setContent("");
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0" hideCloseButton>
        <TooltipProvider>
        <div className="tk-scope flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <UserAvatar author={status?.me} className="size-8" />
            <div className="min-w-0 flex-1 leading-tight">
              <DialogTitle className="truncate text-sm font-medium text-foreground">{status?.me ? displayName(status.me) : "New post"}</DialogTitle>
              <DialogDescription className="truncate text-xs text-muted-foreground">{status?.me?.username ? `@${status.me.username} · posting to Tinkerer Club` : "Posting to Tinkerer Club"}</DialogDescription>
            </div>
            <Tip label="Close (draft is kept)">
              <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Close" onClick={() => onOpenChange(false)}>
                <Glyph icon={Cancel01Icon} size={14} />
              </Button>
            </Tip>
          </div>

          <Textarea
            ref={textareaRef}
            autoFocus
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What did you build, break, or learn today?"
            rows={4}
            maxLength={MAX + 500}
            className="tk-grow resize-none border-transparent bg-transparent px-1 py-1 text-[15px] leading-relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0"
            aria-label="Post content"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void submit("publish");
              }
            }}
          />

          {preview ? (
            <div className="relative">
              <LinkPreviewCard preview={preview} compact />
              <Tip label="Remove preview">
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-6 bg-background/80" aria-label="Remove link preview" onClick={() => setDismissedPreview(preview.url)}>
                  <Glyph icon={Cancel01Icon} size={12} />
                </Button>
              </Tip>
            </div>
          ) : null}

          <TopicPicker topics={topics.data ?? []} selected={selected} onChange={setSelected} content={content} />

          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            <CountRing count={trimmed.length} />
            <Select value={showOnTimeline ? "timeline" : "topics"} onValueChange={(value) => setTimeline(value === "timeline")}>
              <SelectTrigger className="h-7 w-auto gap-1 border-transparent bg-transparent px-2 text-xs text-muted-foreground shadow-none hover:text-foreground" aria-label="Visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timeline">On the timeline</SelectItem>
                <SelectItem value="topics">Topics only</SelectItem>
              </SelectContent>
            </Select>
            <span className="flex-1" />
            <span className="hidden text-xs text-muted-foreground [@media(hover:hover)]:inline">⌘↵ publishes</span>
            {hasDraft ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={discard} disabled={busy !== null}>
                Discard
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void submit("queue")} disabled={!canSubmit}>
              {busy === "queue" ? "Queuing…" : "Queue"}
            </Button>
            <Tip label="Publish (⌘↵)">
              <Button type="button" size="sm" className="h-8" onClick={() => void submit("publish")} disabled={!canSubmit}>
                {busy === "publish" ? "Publishing…" : "Publish"}
              </Button>
            </Tip>
          </div>
        </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

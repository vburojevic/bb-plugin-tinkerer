// The composer: one dialog for a short post. Content first, then topics,
// project and a link preview it finds on its own; Publish is the primary
// action and Queue the quiet alternative. Nothing here is clever — the point
// is that what you see is exactly what the club sees.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Cancel01Icon, HashtagIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { LinkPreview, Post, Topic } from "../lib/contract";
import { postUrl } from "../lib/format";
import { LinkPreviewCard } from "./PostCard";
import { Glyph, useAsync } from "./shared";
import { useStatus } from "./store";

const MAX = 4000;
const NO_PROJECT = "__none__";

function firstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/);
  return match ? match[0] : null;
}

function TopicPicker({ topics, selected, onChange }: { topics: Topic[]; selected: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const bySlug = useMemo(() => new Map(topics.map((t) => [t.slug, t])), [topics]);
  const toggle = (slug: string) => onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug].slice(0, 10));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((slug) => {
        const topic = bySlug.get(slug);
        return (
          <button key={slug} type="button" onClick={() => toggle(slug)} className="tk-spark-soft tk-spark-line inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-foreground" aria-label={`Remove topic ${topic?.name ?? slug}`}>
            {topic?.emoji ? `${topic.emoji} ` : "#"}
            {topic?.name ?? slug}
            <Glyph icon={Cancel01Icon} size={12} />
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground" aria-label="Add topics">
            <Glyph icon={HashtagIcon} size={14} />
            {selected.length === 0 ? "Topics" : "Add"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <Command>
            <CommandInput placeholder="Search topics" />
            <CommandList className="max-h-64">
              <CommandEmpty>No topic matches.</CommandEmpty>
              <CommandGroup>
                {topics.map((topic) => (
                  <CommandItem key={topic.slug} value={`${topic.name} ${topic.slug}`} onSelect={() => toggle(topic.slug)} className="gap-2 text-sm">
                    <span className="w-5 text-center" aria-hidden>
                      {topic.emoji ?? "#"}
                    </span>
                    <span className="flex-1 truncate">{topic.name}</span>
                    {selected.includes(topic.slug) ? <span className="tk-spark-text text-xs">added</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface ComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  onPosted?: (post: Post) => void;
}

export function Composer({ open, onOpenChange, initialContent = "", onPosted }: ComposerProps) {
  const rpc = useRpc<typeof rpcContract>();
  const { status } = useStatus();
  const data = useAsync(() => (open ? rpc.call("composerData") : Promise.resolve({ topics: [], projects: [] })), [rpc, open]);
  const [content, setContent] = useState(initialContent);
  const [topics, setTopics] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>(NO_PROJECT);
  const [timeline, setTimeline] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState<string | null>(null);
  const [busy, setBusy] = useState<"publish" | "queue" | null>(null);
  const previewSeq = useRef(0);

  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setTopics([]);
      setProjectId(NO_PROJECT);
      setPreview(null);
      setPreviewDismissed(null);
      setTimeline(null);
    }
  }, [open, initialContent]);

  const url = firstUrl(content);
  useEffect(() => {
    if (!url || url === previewDismissed) {
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
    }, 400);
    return () => window.clearTimeout(timer);
  }, [rpc, url, previewDismissed]);

  const showOnTimeline = timeline ?? status?.defaultTimeline ?? true;
  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX && busy === null;

  const submit = async (mode: "publish" | "queue") => {
    if (!canSubmit) return;
    setBusy(mode);
    try {
      const post = await rpc.call("createPost", {
        content: trimmed,
        topicSlugs: topics,
        projectId: projectId === NO_PROJECT ? null : projectId,
        timeline: showOnTimeline,
        mode,
        linkPreviewUrl: preview ? preview.url : null,
      });
      toast.success(mode === "queue" ? "Queued" : "Published", { description: postUrl(post) });
      onPosted?.(post);
      onOpenChange(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Tinkerer Club did not accept the post");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <div className="tk-scope flex flex-col gap-3 p-5">
          <div>
            <DialogTitle className="text-base font-semibold">New post</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Goes out under your name as {status?.me?.username ? `@${status.me.username}` : "you"}. Short post; articles are written on the web.</DialogDescription>
          </div>
          <Textarea
            autoFocus
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What did you build, break, or learn?"
            rows={5}
            maxLength={MAX + 200}
            className="min-h-32 resize-y text-sm leading-relaxed"
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
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-6 bg-background/80" aria-label="Remove link preview" onClick={() => setPreviewDismissed(preview.url)}>
                <Glyph icon={Cancel01Icon} size={12} />
              </Button>
            </div>
          ) : null}
          <TopicPicker topics={data.data?.topics ?? []} selected={topics} onChange={setTopics} />
          <div className="flex flex-wrap items-center gap-3">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-8 w-52 text-xs" aria-label="Project">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>No project</SelectItem>
                {(data.data?.projects ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={showOnTimeline} onCheckedChange={setTimeline} aria-label="Show on the timeline" />
              Show on the timeline
            </label>
            <span className={cn("ml-auto text-xs tabular-nums", trimmed.length > MAX ? "text-destructive" : "text-muted-foreground")}>
              {trimmed.length}/{MAX}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy !== null}>
              Cancel
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void submit("queue")} disabled={!canSubmit}>
              {busy === "queue" ? "Queuing…" : "Queue"}
            </Button>
            <Button type="button" size="sm" onClick={() => void submit("publish")} disabled={!canSubmit}>
              {busy === "publish" ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

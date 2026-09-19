// The approval card an agent's tinkerer_post opens in the thread composer.
// Shows exactly what would be published; Publish sends it, Decline does not.
import { useState } from "react";
import type { PluginPendingInteractionProps } from "@get-bb/plugin-sdk/app";
import { Button } from "@/components/ui/button";
import type { ComposeInput } from "../lib/contract";
import { Linkified } from "./PostCard";

function parseDraft(payload: unknown): ComposeInput | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Partial<ComposeInput>;
  if (typeof record.content !== "string") return null;
  return {
    content: record.content,
    topicSlugs: Array.isArray(record.topicSlugs) ? record.topicSlugs.filter((s): s is string => typeof s === "string") : [],
    projectId: typeof record.projectId === "string" ? record.projectId : null,
    timeline: record.timeline !== false,
    mode: record.mode === "queue" ? "queue" : "publish",
    linkPreviewUrl: typeof record.linkPreviewUrl === "string" ? record.linkPreviewUrl : null,
  };
}

export function PostApproval({ interaction, submit, cancel }: PluginPendingInteractionProps) {
  const draft = parseDraft(interaction.payload);
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const answer = async (approved: boolean) => {
    if (busy) return;
    setBusy(approved ? "approve" : "decline");
    try {
      await submit({ approved });
    } finally {
      setBusy(null);
    }
  };
  if (!draft) {
    return (
      <div className="tk-root rounded-lg border border-border bg-card p-3 text-sm">
        <p className="text-muted-foreground">The agent asked to post, but the draft could not be read.</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void cancel()}>
          Dismiss
        </Button>
      </div>
    );
  }
  return (
    <div className="tk-root rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">An agent wants to {draft.mode === "queue" ? "queue" : "publish"} this on Tinkerer Club under your name</div>
      <div className="mt-2 rounded-md border border-border bg-background p-3">
        <Linkified text={draft.content} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{draft.timeline ? "On the timeline" : "Topics only"}</span>
          {draft.topicSlugs.length > 0 ? <span>{draft.topicSlugs.map((s) => `#${s}`).join(" ")}</span> : null}
          {draft.projectId ? <span>project attached</span> : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => void answer(false)}>
          {busy === "decline" ? "Declining…" : "Decline"}
        </Button>
        <Button size="sm" disabled={busy !== null} onClick={() => void answer(true)}>
          {busy === "approve" ? "Publishing…" : draft.mode === "queue" ? "Queue it" : "Publish"}
        </Button>
      </div>
    </div>
  );
}

// `::tinkerer{post="<id>"}` — a live post card in the transcript.
//
// The directive mounts inside the assistant message's markdown. A post is a
// record of its own, so the card breaks out: the directive leaves a hidden
// marker, climbs to the enclosing timeline row, appends a host div that
// carries the plugin scope attributes (the compiled stylesheet only reaches
// descendants of a scope root), and portals the card there. Surfaces without
// a timeline row get the card inline — placement degrades, the card does not.
//
// `post` is attacker-controlled even though a model wrote it, so the id is
// matched against a strict pattern and then fetched by id, never interpolated.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRpc, type PluginMessageDirectiveProps } from "@get-bb/plugin-sdk/app";
import { Skeleton } from "@/components/ui/skeleton";
import type { rpcContract } from "../server";
import type { Post } from "../lib/contract";
import { PostCard } from "./PostCard";

declare const __BB_PLUGIN_ID__: string | undefined;

export const POST_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export function TinkererDirective({ attributes, source }: PluginMessageDirectiveProps) {
  const rpc = useRpc<typeof rpcContract>();
  const id = attributes.post ?? "";
  const valid = POST_ID_PATTERN.test(id);
  const [post, setPost] = useState<Post | null>(null);
  const [failed, setFailed] = useState(false);
  const [marker, setMarker] = useState<HTMLElement | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [inline, setInline] = useState(false);

  useEffect(() => {
    if (!valid) return;
    let alive = true;
    rpc
      .call("post", { id })
      .then((result) => {
        if (alive) setPost(result);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [rpc, id, valid]);

  useEffect(() => {
    if (!valid || marker === null) return;
    const row = marker.closest("[data-timeline-row-id]");
    if (!(row instanceof HTMLElement)) {
      setInline(true);
      return;
    }
    const node = document.createElement("div");
    node.setAttribute("data-bb-plugin-root", "");
    if (typeof __BB_PLUGIN_ID__ === "string") node.setAttribute("data-bb-plugin", __BB_PLUGIN_ID__);
    row.appendChild(node);
    setHost(node);
    setInline(false);
    return () => {
      node.remove();
      setHost(null);
    };
  }, [valid, marker]);

  if (!valid || failed) return <code className="text-xs">{source}</code>;

  const card = post === null ? (
    <Skeleton className="h-24 w-full rounded-lg" aria-label="Loading post" />
  ) : (
    <PostCard post={post} onChange={setPost} compact className="tk-stack-card border-0" />
  );

  if (inline) return <div className="tk-root my-2">{card}</div>;
  return (
    <>
      <span ref={setMarker} className="hidden" aria-hidden="true" />
      {host !== null ? createPortal(<div className="tk-root px-2 pt-2 text-sm">{card}</div>, host) : null}
    </>
  );
}

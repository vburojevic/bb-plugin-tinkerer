// Small presentation helpers shared by the panel, the CLI, and the tools.
import { TINKERER_BASE_URL } from "./client";
import type { Author, Post } from "./contract";

/** Absolute URL for a platform-relative media path (`/api/media/…`, `/badges/…`). */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${TINKERER_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

declare const __BB_PLUGIN_ID__: string | undefined;

/** Post media needs the API key, so it is fetched through the plugin's proxy route. */
export function postMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const pluginId = typeof __BB_PLUGIN_ID__ === "string" ? __BB_PLUGIN_ID__ : "tinkerer";
  return `/api/v1/plugins/${pluginId}/http/media?p=${encodeURIComponent(path)}`;
}

export function isVideoPath(path: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(path);
}

export function avatarUrl(author: Author | null | undefined): string | null {
  if (!author) return null;
  return mediaUrl(author.avatarImageUrl) ?? mediaUrl(author.image) ?? mediaUrl(author.gravatarUrl);
}

export function postUrl(post: Pick<Post, "id" | "author">): string {
  const username = post.author.username;
  return username ? `${TINKERER_BASE_URL}/u/${username}/post/${post.id}` : `${TINKERER_BASE_URL}/posts/${post.id}`;
}

export function displayName(author: Author | null | undefined): string {
  if (!author) return "Someone";
  return author.name?.trim() || (author.username ? `@${author.username}` : "Someone");
}

const UNITS: Array<[label: string, ms: number]> = [
  ["y", 365 * 86_400_000],
  ["mo", 30 * 86_400_000],
  ["d", 86_400_000],
  ["h", 3_600_000],
  ["m", 60_000],
];

/** "3m", "2h", "5d" — compact, no "ago", the timeline convention. */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const delta = Math.max(0, now - then);
  for (const [label, ms] of UNITS) {
    if (delta >= ms) return `${Math.floor(delta / ms)}${label}`;
  }
  return "now";
}

/** "24:59" countdown; "0:00" once expired. */
export function countdown(expiresAtIso: string, now: number = Date.now()): string {
  const remaining = Math.max(0, Date.parse(expiresAtIso) - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n / 1000)}k`;
}

/** One post as plain text for tools and the CLI. */
export function describePost(post: Post, now: number = Date.now()): string {
  const head = `${displayName(post.author)} (@${post.author.username ?? "?"}) · ${relativeTime(post.publishedAt ?? post.createdAt, now)} · id ${post.id}`;
  const body = (post.title ? `${post.title}\n` : "") + (post.content ?? "").trim();
  const meta: string[] = [];
  if (post.likeCount) meta.push(`${post.likeCount} likes`);
  if (post.commentCount) meta.push(`${post.commentCount} comments`);
  if (post.topics?.length) meta.push(post.topics.map((t) => `#${t.slug}`).join(" "));
  if (post.project?.title) meta.push(`project: ${post.project.title}`);
  meta.push(postUrl(post));
  return `${head}\n${body}\n${meta.join(" · ")}`;
}

/** Trim a body for lists: first line, hard cap. */
export function excerpt(text: string | null | undefined, max = 140): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

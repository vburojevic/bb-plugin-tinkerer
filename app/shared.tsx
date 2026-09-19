// Small building blocks every tab uses: the glyph wrapper, avatars, states,
// and the async hook that gives each view loading / error / data in one shape.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Author } from "../lib/contract";
import { avatarUrl, displayName } from "../lib/format";

export function Glyph({ icon, className, size = 16, label }: { icon: IconSvgElement; className?: string; size?: number; label?: string }) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={1.6}
      className={cn("shrink-0", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}

export function UserAvatar({ author, className }: { author: Author | null | undefined; className?: string }) {
  const src = avatarUrl(author);
  const name = displayName(author);
  return (
    <Avatar className={cn("size-8", className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className="text-xs font-medium">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="status" className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children ? <p className="mt-1 text-sm text-muted-foreground text-balance">{children}</p> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
      <p className="font-medium text-foreground">Tinkerer Club did not answer</p>
      <p className="mt-0.5 text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function ListSkeleton({ rows = 3, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3 rounded-lg border border-border bg-card p-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className={cn("h-3", tall ? "w-full" : "w-2/3")} />
            {tall ? <Skeleton className="h-24 w-full" /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  /** Replace the data locally after a mutation, no round trip. */
  patch: (update: (current: T) => T) => void;
}

/** Load once on mount (and whenever `deps` change); a stale response never lands. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const run = useCallback(() => {
    const mine = ++seq.current;
    setLoading(true);
    load().then(
      (result) => {
        if (mine !== seq.current) return;
        setData(result);
        setError(null);
        setLoading(false);
      },
      (cause: unknown) => {
        if (mine !== seq.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  const patch = useCallback((update: (current: T) => T) => {
    setData((current) => (current === null ? current : update(current)));
  }, []);
  return { data, error, loading, reload: run, patch };
}

/** "Sept 19, 20:30" style, local time. */
export function shortDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** A live clock tick for countdowns; re-renders every second while mounted. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// ---- shadcn-backed helpers ------------------------------------------------

/** The unread pill: a Badge in the spark tone. */
export function CountBadge({ count, label, className }: { count: number; label?: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <Badge variant="default" className={cn("tk-count border-0 px-1.5 py-0 font-semibold", className)} aria-label={label ?? `${count} unread`}>
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

/** Wrap any control with a short tooltip; icon-only buttons always get one. */
export function Tip({ label, children, side = "bottom" }: { label: string; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

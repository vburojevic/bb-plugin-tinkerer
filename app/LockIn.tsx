// Lock-in: a focus timer the club can see. The clock is the hero; todos sit
// under it; other members currently locked in are a quiet footer.
import { useEffect, useState } from "react";
import { useBbContext, useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { rpcContract } from "../server";
import type { LockInState, LockInTodo } from "../lib/contract";
import { countdown, displayName, formatDuration } from "../lib/format";
import { ErrorState, Glyph, ListSkeleton, Tip, UserAvatar, useAsync, useNow } from "./shared";
import { invalidateStatus, useChanges } from "./store";

function current(state: LockInState) {
  return state.current && !state.current.endedAt ? state.current : null;
}

function Todos({ todos, onChange }: { todos: LockInTodo[]; onChange: (next: LockInTodo[]) => void }) {
  const rpc = useRpc<typeof rpcContract>();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<LockInTodo[]>) => {
    if (busy) return;
    setBusy(true);
    try {
      onChange(await work());
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not update todos");
    } finally {
      setBusy(false);
    }
  };
  const done = todos.filter((t) => t.completed).length;
  return (
    <section aria-labelledby="tk-todos">
      <div className="flex items-baseline justify-between">
        <h3 id="tk-todos" className="text-sm font-medium text-foreground">Todos</h3>
        {todos.length > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {done} of {todos.length} done
          </span>
        ) : null}
      </div>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = title.trim();
          if (!next) return;
          void run(async () => {
            const result = await rpc.call("lockInTodoCreate", { title: next });
            setTitle("");
            return result;
          });
        }}
      >
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Next thing to do" aria-label="New todo" className="h-8 text-sm" />
        <Tip label="Add todo">
          <Button type="submit" size="sm" variant="outline" className="h-8" disabled={busy || title.trim().length === 0} aria-label="Add todo">
            <Glyph icon={PlusSignIcon} size={15} />
          </Button>
        </Tip>
      </form>
      {todos.length > 0 ? (
        <Card asChild>
        <ul className="mt-2 divide-y divide-border/60">
          {todos.map((todo) => (
            <li key={todo.id} className="group flex items-center gap-2.5 px-3 py-2">
              <Checkbox checked={todo.completed === true} onCheckedChange={(checked) => void run(() => rpc.call("lockInTodoUpdate", { id: todo.id, completed: checked === true }))} aria-label={`Mark "${todo.title}" ${todo.completed ? "not done" : "done"}`} />
              <span className={cn("min-w-0 flex-1 truncate text-sm", todo.completed ? "text-muted-foreground line-through" : "text-foreground")}>{todo.title}</span>
              <Tip label="Delete">
                <Button variant="ghost" size="icon" className="size-6 text-muted-foreground opacity-60 hover:opacity-100 focus-visible:opacity-100" aria-label={`Delete "${todo.title}"`} onClick={() => void run(() => rpc.call("lockInTodoDelete", { id: todo.id }))}>
                  <Glyph icon={Delete02Icon} size={14} />
                </Button>
              </Tip>
            </li>
          ))}
        </ul>
        </Card>
      ) : null}
    </section>
  );
}

export function LockIn({ className, threadId: explicitThreadId }: { className?: string; threadId?: string | null }) {
  const rpc = useRpc<typeof rpcContract>();
  const context = useBbContext();
  const threadId = explicitThreadId ?? context.threadId ?? null;
  const data = useAsync(() => rpc.call("lockIn"), [rpc]);
  useChanges(["lockin"], data.reload);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const now = useNow();

  // Prefill the title from the thread in view, but never over what you typed.
  useEffect(() => {
    if (!threadId || titleTouched) return;
    let alive = true;
    void rpc
      .call("threadTitle", { threadId })
      .then(({ title: next }) => {
        if (alive && next && !titleTouched) setTitle(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [rpc, threadId, titleTouched]);

  const act = async (work: () => Promise<LockInState>, done: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const state = await work();
      data.patch((existing) => ({ ...existing, state }));
      invalidateStatus(rpc);
      toast.success(done);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Tinkerer Club did not accept that");
    } finally {
      setBusy(false);
    }
  };

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (data.loading || !data.data) return <ListSkeleton rows={2} tall />;
  const session = current(data.data.state);
  const others = data.data.state.participants.filter((p) => p.id !== session?.id && p.user);

  return (
    <div className={cn("space-y-5", className)}>
      <Card className="p-4" role="region" aria-label="Lock-in session">
        {session ? (
          <div>
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Locked in for {formatDuration(now - Date.parse(session.startedAt))}</div>
                <div className="mt-0.5 truncate text-base font-medium text-foreground">{session.title ?? "Untitled session"}</div>
              </div>
              <div className="tk-clock tk-spark-text text-3xl font-semibold" aria-live="off" aria-label="Time remaining">
                {countdown(session.expiresAt, now)}
              </div>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void act(() => rpc.call("lockInFinish", { id: session.id }), "Lock-in finished")}>
                Finish
              </Button>
            </div>
            {(() => {
              const start = Date.parse(session.startedAt);
              const end = Date.parse(session.expiresAt);
              const ratio = end > start ? Math.max(0, Math.min(1, (now - start) / (end - start))) : 0;
              return (
                <div className="tk-elapsed mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label="Session elapsed">
                  <span style={{ "--tk-ratio": ratio } as React.CSSProperties} />
                </div>
              );
            })()}
          </div>
        ) : (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const next = title.trim();
              void act(() => rpc.call("lockInStart", next ? { title: next } : {}), "Locked in for an hour");
            }}
          >
            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleTouched(true);
              }}
              placeholder="What are you working on?"
              aria-label="Session title"
              className="h-9 flex-1"
              maxLength={200}
            />
            <Button type="submit" disabled={busy}>
              Start lock-in
            </Button>
          </form>
        )}
      </Card>

      <Todos todos={data.data.todos} onChange={(todos) => data.patch((existing) => ({ ...existing, todos }))} />

      {others.length > 0 ? (
        <section aria-labelledby="tk-others">
          <h3 id="tk-others" className="text-sm font-medium text-foreground">Also locked in</h3>
          <ul className="mt-2 space-y-1.5">
            {others.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 text-sm">
                <UserAvatar author={p.user} className="size-6" />
                <span className="min-w-0 flex-1 truncate text-foreground">{displayName(p.user)}</span>
                <span className="truncate text-xs text-muted-foreground">{p.title ?? ""}</span>
                <span className="tk-clock text-xs tabular-nums text-muted-foreground">{countdown(p.expiresAt, now)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

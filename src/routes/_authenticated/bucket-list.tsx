import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Heart } from "@/components/Heart";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { bucketProgress, myBucketQuery, type BucketItem } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bucket-list")({
  head: () => ({
    meta: [
      { title: "Bucket list — Aisha's journal" },
      { name: "description", content: "Your private list of dreams and things to do one day." },
      { property: "og:title", content: "Bucket list — Aisha's journal" },
      { property: "og:description", content: "Your private list of dreams and things to do one day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BucketListPage,
});

function BucketListPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const query = myBucketQuery(user.id);
  const { data: items, isLoading } = useQuery(query);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const todo = (items ?? []).filter((i) => !i.done);
  const done = (items ?? [])
    .filter((i) => i.done)
    .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const progress = bucketProgress(items ?? []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["bucket-items"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("bucket_items").insert({ user_id: user.id, title: title.trim() });
    setAdding(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    refresh();
  }

  async function toggle(item: BucketItem) {
    const next = !item.done;
    queryClient.setQueryData<BucketItem[]>(query.queryKey, (old) =>
      old?.map((i) => (i.id === item.id ? { ...i, done: next, done_at: next ? new Date().toISOString() : null } : i)),
    );
    const { error } = await supabase
      .from("bucket_items")
      .update({ done: next, done_at: next ? new Date().toISOString() : null })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else if (next) toast.success("Ticked off! 🎉");
    refresh();
  }

  async function remove(item: BucketItem) {
    const { error } = await supabase.from("bucket_items").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-20 pt-8">
      <div className="mb-6">
        <p className="font-script text-2xl text-primary">one day, I will… ♡</p>
        <h1 className="text-4xl font-semibold">Bucket list</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dreams, adventures and little goals. Tick them off as they come true.
        </p>
      </div>

      <section className="paper-card mb-6 p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-display text-2xl font-semibold">
            {progress.done} <span className="text-base font-normal text-muted-foreground">of {progress.total} done</span>
          </p>
          <p className="text-sm font-semibold text-primary">{progress.percent}%</p>
        </div>
        <Progress value={progress.percent} className="h-2.5" />
        <form onSubmit={add} className="mt-5 flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="See the northern lights…"
            maxLength={300}
            aria-label="New bucket list item"
          />
          <Button type="submit" variant="hero" disabled={adding || !title.trim()}>
            {adding ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
        </form>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      ) : !items?.length ? (
        <div className="paper-card flex flex-col items-center px-6 py-12 text-center">
          <Heart className="animate-float-heart mb-4 h-12 w-12 text-primary-glow" />
          <h2 className="text-xl font-semibold">Your list is empty</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Add the first thing you'd love to do someday.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {todo.length > 0 && (
            <ul className="space-y-2">
              {todo.map((i) => (
                <Row key={i.id} item={i} onToggle={toggle} onRemove={remove} />
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Done
              </h2>
              <ul className="space-y-2">
                {done.map((i) => (
                  <Row key={i.id} item={i} onToggle={toggle} onRemove={remove} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Row({
  item,
  onToggle,
  onRemove,
}: {
  item: BucketItem;
  onToggle: (i: BucketItem) => void;
  onRemove: (i: BucketItem) => void;
}) {
  const id = `bucket-${item.id}`;
  return (
    <li className={cn("paper-card flex items-center gap-3 px-4 py-3", item.done && "bg-secondary/60")}>
      <Checkbox
        id={id}
        checked={item.done}
        onCheckedChange={() => onToggle(item)}
        className="h-5 w-5 rounded-full"
      />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className={cn("block break-words", item.done && "text-muted-foreground line-through")}>{item.title}</span>
        {item.done && item.done_at && (
          <span className="text-xs text-primary">
            Done {new Date(item.done_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </label>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${item.title}`}
        onClick={() => onRemove(item)}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

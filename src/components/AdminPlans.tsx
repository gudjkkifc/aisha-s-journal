import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarDays, CheckCircle2, Circle, ListChecks, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatEventTime, type BucketItem, type CalendarEvent } from "@/lib/plans";

type Who = { profiles: { display_name: string; avatar_path: string | null } | null };
type AdminBucket = BucketItem & Who;
type AdminEvent = CalendarEvent & Who;

/** Admin view of every writer's bucket list and calendar plans. */
export function AdminPlans() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const [bucket, events] = await Promise.all([
        supabase.from("bucket_items").select("*, profiles(display_name, avatar_path)").order("created_at").limit(1000),
        supabase
          .from("calendar_events")
          .select("*, profiles(display_name, avatar_path)")
          .order("event_date", { ascending: false })
          .limit(1000),
      ]);
      if (bucket.error) throw bucket.error;
      if (events.error) throw events.error;
      return {
        bucket: bucket.data as unknown as AdminBucket[],
        events: events.data as unknown as AdminEvent[],
      };
    },
  });

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, { id: string; who: Who["profiles"]; bucket: AdminBucket[]; events: AdminEvent[] }>();
    const get = (id: string, who: Who["profiles"]) => {
      let p = map.get(id);
      if (!p) map.set(id, (p = { id, who, bucket: [], events: [] }));
      return p;
    };
    const match = (text: string, who: Who["profiles"]) =>
      !q || text.toLowerCase().includes(q) || (who?.display_name ?? "").toLowerCase().includes(q);
    for (const b of data?.bucket ?? []) if (match(b.title, b.profiles)) get(b.user_id, b.profiles).bucket.push(b);
    for (const e of data?.events ?? [])
      if (match(`${e.title} ${e.notes}`, e.profiles)) get(e.user_id, e.profiles).events.push(e);
    return [...map.values()].sort((a, b) => (a.who?.display_name ?? "").localeCompare(b.who?.display_name ?? ""));
  }, [data, search]);

  async function remove(table: "bucket_items" | "calendar_events", id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    toast.success("Removed");
  }

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plans, goals or writer…"
          className="rounded-full bg-card pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : !people.length ? (
        <div className="paper-card p-10 text-center text-muted-foreground">
          {search ? "Nothing matches your search." : "No one has added plans or bucket list items yet."}
        </div>
      ) : (
        <ul className="space-y-4">
          {people.map((p) => (
            <li key={p.id} className="paper-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <UserAvatar path={p.who?.avatar_path} name={p.who?.display_name} className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.who?.display_name || "Unknown writer"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.bucket.length} bucket list · {p.events.length} plans
                  </p>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" /> Bucket list
                  </h3>
                  {p.bucket.length ? (
                    <ul className="space-y-1">
                      {p.bucket.map((b) => (
                        <li key={b.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-secondary">
                          {b.done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className={b.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
                            {b.title}
                          </span>
                          <DeleteBtn label={b.title} onClick={() => remove("bucket_items", b.id)} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-2 text-sm text-muted-foreground">Nothing here.</p>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" /> Plans
                  </h3>
                  {p.events.length ? (
                    <ul className="space-y-1">
                      {p.events.map((e) => (
                        <li key={e.id} className="group flex items-start gap-2 rounded-lg px-2 py-1 hover:bg-secondary">
                          <span className="w-20 shrink-0 pt-0.5 text-xs font-semibold text-primary">
                            {format(parseISO(e.event_date), "d MMM yy")}
                          </span>
                          <span className="min-w-0 flex-1 text-sm">
                            {e.title}
                            {e.event_time && (
                              <span className="ml-1 text-xs text-muted-foreground">· {formatEventTime(e.event_time)}</span>
                            )}
                            {e.notes && <span className="block text-xs text-muted-foreground">{e.notes}</span>}
                          </span>
                          <DeleteBtn label={e.title} onClick={() => remove("calendar_events", e.id)} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-2 text-sm text-muted-foreground">Nothing here.</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeleteBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label={`Remove ${label}`}
      onClick={onClick}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

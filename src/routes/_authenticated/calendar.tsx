import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, format, isSameMonth, parseISO, subMonths } from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, Loader2, Mic, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { myEntriesQuery, type Entry } from "@/lib/journal";
import {
  dayKey,
  formatEventTime,
  groupByDay,
  monthGrid,
  myEventsQuery,
  upcomingEvents,
  type CalendarEvent,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Aisha's journal" },
      { name: "description", content: "See your journal entries by day and plan what's coming up." },
      { property: "og:title", content: "Calendar — Aisha's journal" },
      { property: "og:description", content: "See your journal entries by day and plan what's coming up." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarPage() {
  const { user } = Route.useRouteContext();
  const today = dayKey(new Date());
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(today);
  const { data: entries } = useQuery(myEntriesQuery(user.id));
  const { data: events } = useQuery(myEventsQuery(user.id));

  const entriesByDay = useMemo(() => groupByDay(entries ?? [], (e) => dayKey(e.created_at)), [entries]);
  const eventsByDay = useMemo(() => groupByDay(events ?? [], (e) => e.event_date), [events]);
  const days = monthGrid(month);
  const upcoming = upcomingEvents(events ?? [], today);

  function pick(key: string) {
    setSelected(key);
    const d = parseISO(key);
    if (!isSameMonth(d, month)) setMonth(d);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
      <div className="mb-6">
        <p className="font-script text-2xl text-primary">days &amp; plans ♡</p>
        <h1 className="text-4xl font-semibold">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hearts mark days you wrote. Pink chips are your plans.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="paper-card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-semibold">{format(month, "MMMM yyyy")}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}>
                <ChevronLeft />
              </Button>
              <Button variant="soft" size="sm" onClick={() => pick(today)}>
                Today
              </Button>
              <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = dayKey(d);
              const wrote = entriesByDay.get(key)?.length ?? 0;
              const plans = eventsByDay.get(key) ?? [];
              const inMonth = isSameMonth(d, month);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  aria-pressed={selected === key}
                  aria-label={`${format(d, "EEEE d MMMM")}${wrote ? `, ${wrote} entries` : ""}${plans.length ? `, ${plans.length} plans` : ""}`}
                  className={cn(
                    "flex min-h-16 flex-col items-start gap-1 rounded-xl border p-1.5 text-left transition-colors sm:min-h-24 sm:p-2",
                    inMonth ? "bg-card" : "bg-transparent opacity-50",
                    selected === key ? "border-primary ring-2 ring-primary/30" : "border-border/60 hover:bg-secondary",
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                        key === today && "bg-primary text-primary-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {wrote > 0 && <span className="text-xs leading-none">🩷</span>}
                  </span>
                  <span className="hidden w-full space-y-0.5 sm:block">
                    {plans.slice(0, 2).map((p) => (
                      <span key={p.id} className="block truncate rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                        {p.title}
                      </span>
                    ))}
                    {plans.length > 2 && (
                      <span className="block text-[11px] text-muted-foreground">+{plans.length - 2} more</span>
                    )}
                  </span>
                  {plans.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary sm:hidden" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <DayPanel
            userId={user.id}
            day={selected}
            entries={entriesByDay.get(selected) ?? []}
            events={eventsByDay.get(selected) ?? []}
            isPast={selected < today}
          />
          <section className="paper-card p-5">
            <h2 className="mb-3 text-lg font-semibold">Coming up</h2>
            {upcoming.length ? (
              <ul className="space-y-2">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => pick(e.event_date)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-secondary"
                    >
                      <span className="grid w-11 shrink-0 place-items-center rounded-lg bg-accent py-1 text-accent-foreground">
                        <span className="text-[10px] font-semibold uppercase">{format(parseISO(e.event_date), "MMM")}</span>
                        <span className="font-display text-lg font-semibold leading-none">{format(parseISO(e.event_date), "d")}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{e.title}</span>
                        {e.event_time && (
                          <span className="text-xs text-muted-foreground">{formatEventTime(e.event_time)}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing planned yet. Pick a day to add a plan.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function DayPanel({
  userId,
  day,
  entries,
  events,
  isPast,
}: {
  userId: string;
  day: string;
  entries: Entry[];
  events: CalendarEvent[];
  isPast: boolean;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give your plan a name first.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("calendar_events").insert({
      user_id: userId,
      title: title.trim(),
      notes: notes.trim(),
      event_date: day,
      event_time: time || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setTime("");
    setNotes("");
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    toast.success("Plan added 🩷");
  }

  async function removePlan(id: string) {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
  }

  const sorted = [...events].sort((a, b) => (a.event_time ?? "").localeCompare(b.event_time ?? ""));

  return (
    <section className="paper-card p-5">
      <p className="font-script text-xl text-primary">{format(parseISO(day), "EEEE")}</p>
      <h2 className="font-display text-2xl font-semibold">{format(parseISO(day), "d MMMM yyyy")}</h2>

      {entries.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">You wrote</h3>
          <ul className="space-y-1">
            {entries.map((en) => (
              <li key={en.id}>
                <Link
                  to="/journal/$id"
                  params={{ id: en.id }}
                  className="flex items-center gap-2 rounded-lg p-2 text-sm font-medium hover:bg-secondary hover:text-primary"
                >
                  <span>{en.mood ?? "🩷"}</span>
                  <span className="truncate">{en.title || "Untitled"}</span>
                  {(en.audio_paths?.length ?? 0) > 0 && <Mic className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plans</h3>
        {sorted.length ? (
          <ul className="space-y-2">
            {sorted.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{ev.title}</p>
                  {ev.event_time && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {formatEventTime(ev.event_time)}
                    </p>
                  )}
                  {ev.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{ev.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete plan ${ev.title}`}
                  onClick={() => removePlan(ev.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No plans on this day.</p>
        )}
      </div>

      <form onSubmit={addPlan} className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isPast ? "Add a note for this day…" : "Add a plan…"}
            maxLength={200}
            aria-label="Plan name"
          />
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-28 shrink-0"
            aria-label="Time (optional)"
          />
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Details (optional)"
          maxLength={2000}
          className="min-h-16"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="hero" size="sm" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Add plan
          </Button>
          {day === dayKey(new Date()) && (
            <Button asChild variant="soft" size="sm">
              <Link to="/journal/new">
                <PenLine /> Write today's entry
              </Link>
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

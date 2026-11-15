import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { supabase } from "@/integrations/supabase/client";

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  event_date: string; // yyyy-MM-dd
  event_time: string | null; // HH:mm[:ss]
  created_at: string;
  updated_at: string;
};

export type BucketItem = {
  id: string;
  user_id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Local calendar day for a Date or ISO timestamp, as yyyy-MM-dd. */
export function dayKey(value: Date | string): string {
  return format(typeof value === "string" ? new Date(value) : value, "yyyy-MM-dd");
}

/** Every day shown on a month page, padded to whole weeks starting on Sunday. */
export function monthGrid(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
}

export function groupByDay<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyOf(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function formatEventTime(time: string | null): string {
  if (!time) return "";
  const [h = "0", m = "00"] = time.split(":");
  return format(new Date(2000, 0, 1, Number(h), Number(m)), "p");
}

/** Plans from today onward, soonest first. */
export function upcomingEvents(events: CalendarEvent[], today: string, limit = 5) {
  return events
    .filter((e) => e.event_date >= today)
    .sort((a, b) =>
      a.event_date === b.event_date
        ? (a.event_time ?? "").localeCompare(b.event_time ?? "")
        : a.event_date.localeCompare(b.event_date),
    )
    .slice(0, limit);
}

export function bucketProgress(items: BucketItem[]) {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}

export const myEventsQuery = (userId: string) => ({
  queryKey: ["calendar-events", "mine", userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date")
      .order("event_time", { nullsFirst: true });
    if (error) throw error;
    return data as CalendarEvent[];
  },
});

export const myBucketQuery = (userId: string) => ({
  queryKey: ["bucket-items", "mine", userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bucket_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
    if (error) throw error;
    return data as BucketItem[];
  },
});

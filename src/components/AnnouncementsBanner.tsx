import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Sparkles, X } from "lucide-react";

import { announcementsQuery, SEEN_KEY, unseenAnnouncements } from "@/lib/announcements";

/** Shows new announcements and new-feature notes until the person closes them. */
export function AnnouncementsBanner() {
  const { data } = useQuery(announcementsQuery);
  const [seenAt, setSeenAt] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    try {
      setSeenAt(localStorage.getItem(SEEN_KEY));
    } catch {
      setSeenAt(null);
    }
  }, []);

  if (seenAt === undefined || !data?.length) return null;
  const items = unseenAnnouncements(data, seenAt);
  if (!items.length) return null;

  function dismiss() {
    const newest = data![0]!.created_at;
    try {
      localStorage.setItem(SEEN_KEY, newest);
    } catch {
      /* ignore */
    }
    setSeenAt(newest);
  }

  return (
    <section className="paper-card relative mb-6 space-y-3 border-primary/40 p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close announcements"
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      {items.map((a) => (
        <div key={a.id} className="flex gap-3 pr-6">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-primary">
            {a.kind === "feature" ? <Sparkles className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {a.kind === "feature" ? "New feature" : "Announcement"}
            </p>
            <p className="font-semibold">{a.title}</p>
            {a.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>}
          </div>
        </div>
      ))}
    </section>
  );
}

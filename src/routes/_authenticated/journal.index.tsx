import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Camera, ListChecks, Mic, PenLine } from "lucide-react";

import { AnnouncementsBanner } from "@/components/AnnouncementsBanner";
import { Heart } from "@/components/Heart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEntryDate, myEntriesQuery, profileQuery, useSignedUrls, type Entry } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/journal/")({
  head: () => ({
    meta: [
      { title: "My journal — Aisha's journal" },
      { name: "description", content: "All your private journal entries in one place." },
      { property: "og:title", content: "My journal — Aisha's journal" },
      { property: "og:description", content: "All your private journal entries in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JournalList,
});

function JournalList() {
  const { user } = Route.useRouteContext();
  const { data: entries, isLoading } = useQuery(myEntriesQuery(user.id));
  const { data: profile } = useQuery(profileQuery(user.id));
  const firstName = profile?.display_name?.split(" ")[0];

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-script text-2xl text-primary">hello{firstName ? `, ${firstName}` : ""} ♡</p>
          <h1 className="text-4xl font-semibold">My journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {entries ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}` : " "}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="soft">
            <Link to="/calendar">
              <CalendarDays /> Calendar
            </Link>
          </Button>
          <Button asChild variant="soft">
            <Link to="/bucket-list">
              <ListChecks /> Bucket list
            </Link>
          </Button>
          <Button asChild variant="hero">
            <Link to="/journal/new">
              <PenLine /> New entry
            </Link>
          </Button>
        </div>
      </div>

      <AnnouncementsBanner />

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : !entries?.length ? (
        <div className="paper-card flex flex-col items-center px-6 py-14 text-center">
          <Heart className="animate-float-heart mb-4 h-14 w-14 text-primary-glow" />
          <h2 className="text-2xl font-semibold">Your first page is waiting</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">
            Write a few lines about today, or add a photo you love.
          </p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/journal/new">Write my first entry</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <EntryCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const cover = entry.photo_paths[0];
  const { data: urls } = useSignedUrls(cover ? [cover] : []);
  return (
    <Link
      to="/journal/$id"
      params={{ id: entry.id }}
      className="paper-card group flex gap-4 p-4 transition-transform hover:-translate-y-0.5 sm:p-5"
    >
      {cover && (
        <div className="polaroid w-24 shrink-0 -rotate-2 self-start sm:w-28">
          {urls?.[cover] ? (
            <img src={urls[cover]} alt="" loading="lazy" className="aspect-square w-full rounded-sm object-cover" />
          ) : (
            <div className="aspect-square w-full animate-pulse rounded-sm bg-muted" />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {formatEntryDate(entry.created_at)}
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold group-hover:text-primary">
          {entry.mood && <span>{entry.mood}</span>}
          <span className="truncate">{entry.title || "Untitled"}</span>
        </h2>
        {entry.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{entry.body}</p>}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(entry.audio_paths?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Mic className="h-3.5 w-3.5" /> {entry.audio_paths.length} voice{" "}
              {entry.audio_paths.length === 1 ? "note" : "notes"}
            </span>
          )}
          {entry.photo_paths.length > 1 && (
            <span className="inline-flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" /> {entry.photo_paths.length} photos
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

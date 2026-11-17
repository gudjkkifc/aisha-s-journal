import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookHeart, Camera, ListChecks, Megaphone, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { AdminAnnouncements } from "@/components/AdminAnnouncements";
import { AdminPlans } from "@/components/AdminPlans";
import { AdminUsers } from "@/components/AdminUsers";
import { PhotoGrid } from "@/components/PhotoGrid";
import { VoiceNotes } from "@/components/VoiceNotes";
import { ReactableBody } from "@/components/ReactableBody";
import { UserAvatar } from "@/components/UserAvatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatEntryDate, removeMedia, type Entry } from "@/lib/journal";
import { allReactionsQuery } from "@/lib/reactions";

type AdminEntry = Entry & {
  profiles: { display_name: string; avatar_path: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/journal" });
  },
  head: () => ({
    meta: [
      { title: "Admin panel — Aisha's journal" },
      { name: "description", content: "Review journal entries and remove harmful content." },
      { property: "og:title", content: "Admin panel — Aisha's journal" },
      { property: "og:description", content: "Review journal entries and remove harmful content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const { data: reactions } = useQuery(allReactionsQuery);
  const [search, setSearch] = useState("");
  const [onlyPhotos, setOnlyPhotos] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["entries", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("*, profiles(display_name, avatar_path)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as AdminEntry[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (entries ?? []).filter((e) => {
      if (onlyPhotos && !e.photo_paths.length) return false;
      if (!q) return true;
      return [e.title, e.body, e.profiles?.display_name ?? ""].some((t) =>
        t.toLowerCase().includes(q),
      );
    });
  }, [entries, search, onlyPhotos]);

  const writers = new Set(entries?.map((e) => e.user_id)).size;
  const photos = entries?.reduce((n, e) => n + e.photo_paths.length, 0) ?? 0;

  async function remove(entry: AdminEntry) {
    const { error } = await supabase.from("entries").delete().eq("id", entry.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await removeMedia([...entry.photo_paths, ...(entry.audio_paths ?? [])]);
    queryClient.invalidateQueries({ queryKey: ["entries"] });
    toast.success("Entry removed");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-8">
      <div className="mb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Moderator only
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Admin panel</h1>
        <p className="mt-1 text-muted-foreground">
          Review what everyone writes and uploads. React to any line with an emoji, and remove
          anything hateful, racist or illegal.
        </p>
      </div>

      <Tabs defaultValue="entries">
        <TabsList className="mb-6 h-auto flex-wrap rounded-full bg-secondary">
          <TabsTrigger value="entries" className="rounded-full px-4">
            <BookHeart /> Entries
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-full px-4">
            <Users /> Users
          </TabsTrigger>
          <TabsTrigger value="plans" className="rounded-full px-4">
            <ListChecks /> Plans &amp; lists
          </TabsTrigger>
          <TabsTrigger value="announcements" className="rounded-full px-4">
            <Megaphone /> Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements">
          <AdminAnnouncements />
        </TabsContent>

        <TabsContent value="plans">
          <AdminPlans />
        </TabsContent>

        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="entries">
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { icon: BookHeart, label: "Entries", value: entries?.length ?? "–" },
              { icon: Users, label: "Writers", value: entries ? writers : "–" },
              { icon: Camera, label: "Photos", value: entries ? photos : "–" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="paper-card p-4">
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search words or writer…"
                className="rounded-full bg-card pl-9"
              />
            </div>
            <Button
              variant={onlyPhotos ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyPhotos((v) => !v)}
            >
              <Camera /> With photos
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : !filtered.length ? (
            <div className="paper-card p-10 text-center text-muted-foreground">
              {entries?.length
                ? "Nothing matches your search."
                : "No entries have been written yet."}
            </div>
          ) : (
            <ul className="space-y-4">
              {filtered.map((entry) => (
                <li key={entry.id} className="paper-card p-5">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      path={entry.profiles?.avatar_path}
                      name={entry.profiles?.display_name}
                      className="h-10 w-10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {entry.profiles?.display_name || "Unknown writer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatEntryDate(entry.created_at)} ·{" "}
                        {new Date(entry.created_at).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this entry?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes the entry, its photos and voice notes for{" "}
                            {entry.profiles?.display_name || "this writer"}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove(entry)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <h2 className="mt-4 flex items-center gap-2 text-xl font-semibold">
                    {entry.mood && <span>{entry.mood}</span>}
                    {entry.title || "Untitled"}
                  </h2>
                  {entry.body && (
                    <ReactableBody
                      entryId={entry.id}
                      body={entry.body}
                      reactions={(reactions ?? []).filter((r) => r.entry_id === entry.id)}
                      canReact
                      userId={user.id}
                      className="mt-2 text-sm leading-relaxed"
                    />
                  )}
                  <VoiceNotes paths={entry.audio_paths ?? []} className="mt-4" />
                  <PhotoGrid paths={entry.photo_paths} className="mt-4 sm:grid-cols-4" />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

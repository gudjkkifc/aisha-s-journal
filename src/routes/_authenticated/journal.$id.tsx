import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EntryEditor } from "@/components/EntryEditor";
import { PhotoGrid } from "@/components/PhotoGrid";
import { VoiceNotes } from "@/components/VoiceNotes";
import { ReactableBody } from "@/components/ReactableBody";
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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/auth";
import { entryQuery, formatEntryDate, removeMedia } from "@/lib/journal";
import { entryReactionsQuery } from "@/lib/reactions";

export const Route = createFileRoute("/_authenticated/journal/$id")({
  head: () => ({
    meta: [
      { title: "Journal entry — Aisha's journal" },
      { name: "description", content: "Read and edit your journal entry." },
      { property: "og:title", content: "Journal entry — Aisha's journal" },
      { property: "og:description", content: "Read and edit your journal entry." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EntryPage,
});

function EntryPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: entry, isLoading } = useQuery(entryQuery(id));
  const { data: isAdmin } = useIsAdmin();
  const { data: reactions } = useQuery(entryReactionsQuery(id));

  async function deleteEntry() {
    if (!entry) return;
    const { error } = await supabase.from("entries").delete().eq("id", entry.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await removeMedia([...entry.photo_paths, ...(entry.audio_paths ?? [])]);
    queryClient.invalidateQueries({ queryKey: ["entries"] });
    toast.success("Entry deleted");
    navigate({ to: "/journal" });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <Link to="/journal" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> My journal
      </Link>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : !entry ? (
        <div className="paper-card p-10 text-center">
          <h1 className="text-2xl font-semibold">This entry doesn't exist</h1>
          <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
        </div>
      ) : editing && entry.user_id === user.id ? (
        <EntryEditor
          userId={user.id}
          entry={entry}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["entries"] });
            setEditing(false);
          }}
        />
      ) : (
        <article className="paper-card overflow-hidden">
          <div className="p-5 sm:p-8">
            <p className="font-script text-2xl text-primary">{formatEntryDate(entry.created_at)}</p>
            <h1 className="mt-1 flex items-start gap-3 text-3xl font-semibold sm:text-4xl">
              {entry.mood && <span>{entry.mood}</span>}
              <span>{entry.title || "Untitled"}</span>
            </h1>
          </div>
          {entry.body && (
            <ReactableBody
              entryId={entry.id}
              body={entry.body}
              reactions={reactions ?? []}
              canReact={!!isAdmin}
              userId={user.id}
              className="ruled-paper border-y px-5 py-1 text-base sm:px-8"
            />
          )}
          <div className="space-y-6 p-5 sm:p-8">
            <VoiceNotes paths={entry.audio_paths ?? []} />
            <PhotoGrid paths={entry.photo_paths} />
            {entry.user_id === user.id && (
              <div className="flex flex-wrap justify-end gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:text-destructive">
                      <Trash2 /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                      <AlertDialogDescription>The writing, photos and voice notes will be gone for good.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep it</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="soft" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
              </div>
            )}
          </div>
        </article>
      )}
    </main>
  );
}

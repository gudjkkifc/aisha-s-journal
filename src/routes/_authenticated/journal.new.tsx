import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { EntryEditor } from "@/components/EntryEditor";
import { formatEntryDate } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/journal/new")({
  head: () => ({
    meta: [
      { title: "New entry — Aisha's journal" },
      { name: "description", content: "Write a new journal entry and add your photos." },
      { property: "og:title", content: "New entry — Aisha's journal" },
      { property: "og:description", content: "Write a new journal entry and add your photos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewEntry,
});

function NewEntry() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <Link to="/journal" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> My journal
      </Link>
      <p className="mb-3 font-script text-2xl text-primary">{formatEntryDate(new Date().toISOString())}</p>
      <EntryEditor
        userId={user.id}
        onCancel={() => navigate({ to: "/journal" })}
        onSaved={(entry) => {
          queryClient.invalidateQueries({ queryKey: ["entries"] });
          navigate({ to: "/journal/$id", params: { id: entry.id } });
        }}
      />
    </main>
  );
}

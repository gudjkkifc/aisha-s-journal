import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Megaphone, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { announcementsQuery } from "@/lib/announcements";
import { sendAnnouncement } from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

export function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const send = useServerFn(sendAnnouncement);
  const { data: items } = useQuery(announcementsQuery);
  const [kind, setKind] = useState<"announcement" | "feature">("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await send({ data: { kind, title: title.trim(), body: body.trim() } });
      toast.success(res.pushed ? "Sent to everyone's phone 📣" : "Posted in the app (phone notifications aren't set up yet)");
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send it");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="paper-card space-y-3 p-5">
        <p className="text-sm text-muted-foreground">
          Everyone sees this in their journal and gets a phone notification.
        </p>
        <div className="flex gap-2">
          {(
            [
              { value: "announcement", label: "Announcement", Icon: Megaphone },
              { value: "feature", label: "New feature", Icon: Sparkles },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                kind === value ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={120} aria-label="Title" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message (optional)" maxLength={1000} className="min-h-20" />
        <Button type="submit" variant="hero" disabled={busy || !title.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />} Send to everyone
        </Button>
      </form>

      <ul className="space-y-2">
        {(items ?? []).map((a) => (
          <li key={a.id} className="paper-card flex items-start gap-3 p-4">
            <span className="mt-0.5 text-primary">
              {a.kind === "feature" ? <Sparkles className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.title}</p>
              {a.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Delete ${a.title}`} onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

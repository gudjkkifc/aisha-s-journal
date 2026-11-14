import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  MAX_PHOTOS,
  MOODS,
  removeMedia,
  uploadMedia,
  useSignedUrls,
  validatePhoto,
  type Entry,
} from "@/lib/journal";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  entry?: Entry;
  onSaved: (entry: Entry) => void;
  onCancel?: () => void;
};

export function EntryEditor({ userId, entry, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [mood, setMood] = useState<string | null>(entry?.mood ?? null);
  const [keptPaths, setKeptPaths] = useState<string[]>(entry?.photo_paths ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: signed } = useSignedUrls(keptPaths);
  const previews = useMemo(() => newFiles.map((f) => URL.createObjectURL(f)), [newFiles]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const total = keptPaths.length + newFiles.length;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const problem = validatePhoto(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        continue;
      }
      accepted.push(file);
    }
    const room = MAX_PHOTOS - total;
    if (accepted.length > room) toast.error(`You can add up to ${MAX_PHOTOS} photos per entry.`);
    setNewFiles((prev) => [...prev, ...accepted.slice(0, Math.max(room, 0))]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() && !body.trim() && total === 0) {
      toast.error("Write something or add a photo first 🩷");
      return;
    }
    setSaving(true);
    const uploaded: string[] = [];
    try {
      for (const file of newFiles) uploaded.push(await uploadMedia(userId, file));
      const payload = {
        title: title.trim(),
        body: body.trim(),
        mood,
        photo_paths: [...keptPaths, ...uploaded],
      };
      const query = entry
        ? supabase.from("entries").update(payload).eq("id", entry.id).select().single()
        : supabase
            .from("entries")
            .insert({ ...payload, user_id: userId })
            .select()
            .single();
      const { data, error } = await query;
      if (error) throw error;
      if (entry) {
        const removed = entry.photo_paths.filter((p) => !keptPaths.includes(p));
        await removeMedia(removed);
      }
      toast.success(entry ? "Entry updated" : "Saved to your journal 🩷");
      onSaved(data as Entry);
    } catch (err) {
      await removeMedia(uploaded);
      toast.error(err instanceof Error ? err.message : "Couldn't save, please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="paper-card overflow-hidden">
      <div className="space-y-4 p-5 sm:p-7">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give today a title…"
          maxLength={200}
          className="h-auto border-none bg-transparent px-0 font-display text-2xl font-semibold shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 sm:text-3xl"
        />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            How are you feeling?
          </p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? null : m)}
                aria-pressed={mood === m}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full border text-xl transition-all",
                  mood === m
                    ? "scale-110 border-primary bg-accent shadow-glow"
                    : "border-border bg-card hover:bg-secondary",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Dear diary…"
        maxLength={20000}
        className="ruled-paper min-h-72 resize-y rounded-none border-x-0 px-5 py-1 text-base shadow-none focus-visible:ring-0 sm:px-7"
      />

      <div className="space-y-4 p-5 sm:p-7">
        {total > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {keptPaths.map((p) => (
              <Thumb
                key={p}
                src={signed?.[p]}
                onRemove={() => setKeptPaths((prev) => prev.filter((x) => x !== p))}
              />
            ))}
            {previews.map((src, i) => (
              <Thumb
                key={src}
                src={src}
                onRemove={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="soft"
              onClick={() => fileInput.current?.click()}
              disabled={total >= MAX_PHOTOS || saving}
            >
              <ImagePlus /> Add photos
              <span className="text-xs opacity-70">
                {total}/{MAX_PHOTOS}
              </span>
            </Button>
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="hero" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {entry ? "Save changes" : "Save entry"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Thumb({ src, onRemove }: { src?: string | undefined; onRemove: () => void }) {
  return (
    <div className="polaroid relative">
      {src ? (
        <img src={src} alt="" className="aspect-square w-full rounded-sm object-cover" />
      ) : (
        <div className="aspect-square w-full animate-pulse rounded-sm bg-muted" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

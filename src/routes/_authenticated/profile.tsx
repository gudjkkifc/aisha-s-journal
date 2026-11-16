import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, removeMedia, uploadMedia, validatePhoto } from "@/lib/journal";
import { applyHue, COLOR_PRESETS, DEFAULT_HUE, normalizeHue, swatchColor } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Aisha's journal" },
      { name: "description", content: "Update your name, profile picture and site colour." },
      { property: "og:title", content: "My profile — Aisha's journal" },
      { property: "og:description", content: "Update your name, profile picture and site colour." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user.id));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [hue, setHue] = useState(DEFAULT_HUE);

  useEffect(() => {
    if (profile) setHue(profile.theme_hue ?? DEFAULT_HUE);
  }, [profile]);

  async function saveColour(next: number) {
    const value = normalizeHue(next);
    setHue(value);
    applyHue(value);
    const { error } = await supabase
      .from("profiles")
      .update({ theme_hue: value === DEFAULT_HUE ? null : value })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      applyHue(profile?.theme_hue ?? null);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Profile saved 🩷");
  }

  async function changeAvatar(file: File | undefined) {
    if (!file) return;
    const problem = validatePhoto(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(true);
    try {
      const path = await uploadMedia(user.id, file, "avatar-");
      const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
      if (error) throw error;
      if (profile?.avatar_path) await removeMedia([profile.avatar_path]);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("New picture saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-20 pt-8">
      <h1 className="mb-6 text-4xl font-semibold">My profile</h1>
      <div className="paper-card space-y-6 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <UserAvatar path={profile?.avatar_path} name={profile?.display_name || user.email} className="h-28 w-28 border-4 text-4xl" />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              aria-label="Change profile picture"
              className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full bg-rose-gradient text-primary-foreground shadow-glow"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => changeAvatar(e.target.files?.[0])} />
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <form onSubmit={saveName} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Save
          </Button>
        </form>
      </div>

      <div className="paper-card mt-6 space-y-5 p-6 sm:p-8">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Palette className="h-5 w-5 text-primary" /> Site colour
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paint your journal any colour you like. Only you see your choice.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {COLOR_PRESETS.map((preset) => {
            const selected = hue === preset.hue;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => saveColour(preset.hue)}
                aria-pressed={selected}
                className="flex flex-col items-center gap-1.5 rounded-xl p-1 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-full border-2 border-card text-primary-foreground shadow-soft"
                  style={{ background: swatchColor(preset.hue) }}
                >
                  {selected && <Check className="h-5 w-5" />}
                </span>
                {preset.name}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <Label>Or pick your own shade</Label>
          <div
            className="h-3 rounded-full"
            style={{
              background: `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => swatchColor(i * 30)).join(", ")})`,
            }}
          />
          <Slider
            min={0}
            max={359}
            step={1}
            value={[hue]}
            onValueChange={([v = DEFAULT_HUE]) => {
              setHue(v);
              applyHue(v);
            }}
            onValueCommit={([v = DEFAULT_HUE]) => saveColour(v)}
            aria-label="Site colour"
          />
        </div>
        {hue !== DEFAULT_HUE && (
          <Button variant="outline" className="w-full" onClick={() => saveColour(DEFAULT_HUE)}>
            Back to pink 🩷
          </Button>
        )}
      </div>
    </main>
  );
}

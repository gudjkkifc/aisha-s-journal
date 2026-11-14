import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, removeMedia, uploadMedia, validatePhoto } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Aisha's journal" },
      { name: "description", content: "Update your name and profile picture." },
      { property: "og:title", content: "My profile — Aisha's journal" },
      { property: "og:description", content: "Update your name and profile picture." },
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
    </main>
  );
}

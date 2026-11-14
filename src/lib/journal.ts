import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "journal-media";
export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const MOODS = ["🩷", "😊", "🥰", "😌", "😢", "😤", "🤩", "😴"] as const;

/** Returns an error message for a file that can't be attached, or null when it's fine. */
export function validatePhoto(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return "Only photos can be added.";
  if (file.size > MAX_PHOTO_BYTES) return "Each photo must be under 10 MB.";
  return null;
}

export async function uploadMedia(userId: string, file: File, prefix = "") {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${prefix}${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeMedia(paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(MEDIA_BUCKET).remove(paths);
}

/** Private photos are shown through short-lived signed links. */
export function useSignedUrls(paths: string[]) {
  const key = [...paths].sort().join("|");
  return useQuery({
    queryKey: ["signed-urls", key],
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      return map;
    },
  });
}

export type Entry = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  mood: string | null;
  photo_paths: string[];
  created_at: string;
  updated_at: string;
};

export const myEntriesQuery = (userId: string) => ({
  queryKey: ["entries", "mine", userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Entry[];
  },
});

export const entryQuery = (id: string) => ({
  queryKey: ["entries", "one", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("entries").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as Entry | null;
  },
});

export const profileQuery = (userId: string) => ({
  queryKey: ["profile", userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export function formatEntryDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

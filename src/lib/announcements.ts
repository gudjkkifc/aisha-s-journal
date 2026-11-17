import { supabase } from "@/integrations/supabase/client";

export type Announcement = {
  id: string;
  kind: "announcement" | "feature";
  title: string;
  body: string;
  created_at: string;
};

export const SEEN_KEY = "journal-announcements-seen";

export const announcementsQuery = {
  queryKey: ["announcements"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("id, kind, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data as Announcement[];
  },
};

/** Announcements newer than the last one the person dismissed, newest first. */
export function unseenAnnouncements(items: Announcement[], seenAt: string | null, limit = 3) {
  return items.filter((a) => !seenAt || a.created_at > seenAt).slice(0, limit);
}

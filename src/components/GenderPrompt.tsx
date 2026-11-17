import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { profileQuery } from "@/lib/journal";
import { applyDark, applyHue, startingTheme, type Gender } from "@/lib/theme";

/** Asks signed-in people who haven't chosen yet; the choice sets their starting site colour. */
export function GenderPrompt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const [saving, setSaving] = useState<Gender | null>(null);

  const open = !!user && !!profile && !profile.gender;

  async function choose(gender: Gender) {
    if (!user) return;
    setSaving(gender);
    const theme = startingTheme(gender);
    const { error } = await supabase
      .from("profiles")
      .update({ gender, ...theme })
      .eq("id", user.id);
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    applyHue(theme.theme_hue);
    applyDark(theme.theme_dark);
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Welcome 🩷</DialogTitle>
          <DialogDescription className="text-center">
            Tell us a little about you. You can change your site colour anytime on your profile.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {(
            [
              { value: "female", label: "Female", emoji: "👑", note: "Pink site" },
              { value: "male", label: "Male", emoji: "🤴", note: "Black site" },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={!!saving}
              onClick={() => choose(o.value)}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-border bg-card p-4 transition hover:border-primary hover:bg-secondary disabled:opacity-60"
            >
              <span className="text-3xl">{saving === o.value ? <Loader2 className="h-8 w-8 animate-spin" /> : o.emoji}</span>
              <span className="font-semibold">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.note}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

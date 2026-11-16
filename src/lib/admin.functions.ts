import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MEDIA_BUCKET = "journal-media";

/** Admin-only: permanently deletes someone's account with all their entries, photos, voice notes and plans. */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Couldn't check your admin access.");
    if (!isAdmin) throw new Error("Only the admin can delete accounts.");
    if (data.userId === context.userId) throw new Error("You can't delete your own account.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (targetRoles?.length) throw new Error("Admin accounts can't be deleted.");

    // Remove their photos, voice notes and profile picture.
    for (let round = 0; round < 50; round++) {
      const { data: files, error } = await supabaseAdmin.storage
        .from(MEDIA_BUCKET)
        .list(data.userId, { limit: 1000 });
      if (error || !files?.length) break;
      const paths = files.map((f) => `${data.userId}/${f.name}`);
      const { error: removeError } = await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(paths);
      if (removeError) break;
    }

    // Deleting the login removes the profile, and with it every entry, plan and bucket list item.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(`Couldn't delete the account: ${error.message}`);
    return { ok: true };
  });

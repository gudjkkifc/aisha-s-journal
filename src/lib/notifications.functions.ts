import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cancelPush, sendPush, type PushKeys } from "@/lib/push.server";

function pushKeys(appId: string | undefined, apiKey: string | undefined): PushKeys | null {
  return appId && apiKey ? { appId, apiKey } : null;
}

function siteOrigin() {
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
}

/** Schedules the phone alarm for one of the caller's own plans. */
export const schedulePlanReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const keys = pushKeys(process.env["ONESIGNAL_APP_ID"], process.env["ONESIGNAL_REST_API_KEY"]);
    if (!keys) return { scheduled: false, reason: "not-configured" as const };

    const { data: event, error } = await context.supabase
      .from("calendar_events")
      .select("id, user_id, title, notes, remind_at")
      .eq("id", data.eventId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !event) throw new Error("Couldn't find that plan.");
    if (!event.remind_at || new Date(event.remind_at).getTime() < Date.now() - 60_000) {
      return { scheduled: false, reason: "past" as const };
    }

    const id = await sendPush(keys, {
      title: `⏰ ${event.title}`,
      message: event.notes?.trim() || "It's time for your plan 🩷",
      userIds: [context.userId],
      sendAfter: new Date(event.remind_at),
      url: `${siteOrigin()}/calendar`,
    });
    if (id) {
      await context.supabase.from("calendar_events").update({ reminder_push_id: id }).eq("id", event.id);
    }
    return { scheduled: !!id, reason: null };
  });

/** Cancels a plan's phone alarm (call before deleting the plan). */
export const cancelPlanReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const keys = pushKeys(process.env["ONESIGNAL_APP_ID"], process.env["ONESIGNAL_REST_API_KEY"]);
    if (!keys) return { ok: true };
    const { data: event } = await context.supabase
      .from("calendar_events")
      .select("reminder_push_id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (event?.reminder_push_id) await cancelPush(keys, event.reminder_push_id);
    return { ok: true };
  });

/** Admin only: posts an announcement or new-feature note and sends it to everyone's phone. */
export const sendAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        kind: z.enum(["announcement", "feature"]),
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Couldn't check your admin access.");
    if (!isAdmin) throw new Error("Only the admin can send announcements.");

    const { error } = await context.supabase
      .from("announcements")
      .insert({ kind: data.kind, title: data.title, body: data.body, created_by: context.userId });
    if (error) throw new Error(`Couldn't save the announcement: ${error.message}`);

    const keys = pushKeys(process.env["ONESIGNAL_APP_ID"], process.env["ONESIGNAL_REST_API_KEY"]);
    if (!keys) return { pushed: false };
    await sendPush(keys, {
      title: data.kind === "feature" ? `✨ New: ${data.title}` : `📣 ${data.title}`,
      message: data.body || data.title,
      url: `${siteOrigin()}/journal`,
    });
    return { pushed: true };
  });

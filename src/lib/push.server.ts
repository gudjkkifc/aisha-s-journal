// Server-only: sends phone notifications through OneSignal (used by Median's push add-on).
// Callers read the keys from process.env inside their handler and pass them in.

export type PushKeys = { appId: string; apiKey: string };

type PushMessage = {
  title: string;
  message: string;
  /** Page to open when the notification is tapped. */
  url?: string;
  /** Only these signed-in users (by account id); omit to send to everyone subscribed. */
  userIds?: string[];
  /** Deliver later instead of now. */
  sendAfter?: Date;
};

const API = "https://api.onesignal.com";

function authHeader(apiKey: string) {
  return apiKey.startsWith("os_v2_") ? `Key ${apiKey}` : `Basic ${apiKey}`;
}

function oneSignalTime(d: Date) {
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " GMT+0000");
}

/** Returns the scheduled notification id, or null if OneSignal didn't create one. */
export async function sendPush(keys: PushKeys, msg: PushMessage): Promise<string | null> {
  const body: Record<string, unknown> = {
    app_id: keys.appId,
    target_channel: "push",
    headings: { en: msg.title },
    contents: { en: msg.message || msg.title },
  };
  if (msg.userIds?.length) body["include_aliases"] = { external_id: msg.userIds };
  else body["included_segments"] = ["Total Subscriptions"];
  if (msg.url) body["data"] = { targetUrl: msg.url };
  if (msg.sendAfter) body["send_after"] = oneSignalTime(msg.sendAfter);

  const res = await fetch(`${API}/notifications?c=push`, {
    method: "POST",
    headers: { Authorization: authHeader(keys.apiKey), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`OneSignal send failed [${res.status}]: ${text}`);
    throw new Error(`Notification service error (${res.status})`);
  }
  try {
    const json = JSON.parse(text) as { id?: string };
    return json.id || null;
  } catch {
    return null;
  }
}

export async function cancelPush(keys: PushKeys, notificationId: string) {
  const res = await fetch(
    `${API}/notifications/${encodeURIComponent(notificationId)}?app_id=${encodeURIComponent(keys.appId)}`,
    { method: "DELETE", headers: { Authorization: authHeader(keys.apiKey) } },
  );
  if (!res.ok && res.status !== 404) {
    console.error(`OneSignal cancel failed [${res.status}]: ${await res.text()}`);
  }
}

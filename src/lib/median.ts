/**
 * Bridge to the Median Android app (the phone app wrapper). Phone notifications go through
 * Median's OneSignal add-on: we tell it who is signed in so reminders reach the right person.
 * Every function is a safe no-op in a normal browser.
 */
type MedianOneSignal = {
  login?: (externalId: string) => unknown;
  logout?: () => unknown;
  register?: () => unknown;
  info?: () => Promise<{ oneSignalId?: string; subscription?: { optedIn?: boolean } } | undefined>;
};
type MedianBridge = { onesignal?: MedianOneSignal };

declare global {
  interface Window {
    median?: MedianBridge;
  }
}

/** True when the page is running inside the Median phone app. */
export function isMedianApp(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.median || /median|gonative/i.test(navigator.userAgent);
}

/** Waits briefly for Median to inject its bridge (it can arrive just after the page loads). */
async function bridge(timeoutMs = 4000): Promise<MedianBridge | null> {
  if (!isMedianApp()) return null;
  const start = Date.now();
  while (!window.median?.onesignal) {
    if (Date.now() - start > timeoutMs) return null;
    await new Promise((r) => setTimeout(r, 200));
  }
  return window.median;
}

export async function pushLogin(userId: string) {
  try {
    const b = await bridge();
    await b?.onesignal?.login?.(userId);
  } catch {
    /* notifications are a bonus; never break the app */
  }
}

export async function pushLogout() {
  try {
    const b = await bridge(1000);
    await b?.onesignal?.logout?.();
  } catch {
    /* ignore */
  }
}

/** Shows Android's "Allow notifications?" prompt. Returns false outside the phone app. */
export async function requestPushPermission(): Promise<boolean> {
  try {
    const b = await bridge();
    if (!b?.onesignal?.register) return false;
    await b.onesignal.register();
    return true;
  } catch {
    return false;
  }
}

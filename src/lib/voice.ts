/** Voice notes: the recording itself is kept on the entry and played back later. */
export const MAX_VOICE_NOTES = 3;
export const MAX_VOICE_SECONDS = 10 * 60;

const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

/** First recording format the browser supports, or undefined to let the browser choose. */
export function pickAudioMime(isSupported: (type: string) => boolean): string | undefined {
  return PREFERRED_TYPES.find((t) => {
    try {
      return isSupported(t);
    } catch {
      return false;
    }
  });
}

export function audioExtension(mime: string): string {
  const type = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "audio/mp4" || type === "audio/aac" || type === "audio/x-m4a") return "m4a";
  if (type === "audio/ogg") return "ogg";
  if (type === "audio/mpeg") return "mp3";
  if (type === "audio/wav" || type === "audio/x-wav") return "wav";
  return "webm";
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

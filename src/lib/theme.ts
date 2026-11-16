/** Site colour: everything on the site is tinted from one colour-wheel position (hue). */
export const DEFAULT_HUE = 355; // pink
export const HUE_STORAGE_KEY = "journal-hue";

export const COLOR_PRESETS: { name: string; hue: number }[] = [
  { name: "Pink", hue: 355 },
  { name: "Coral", hue: 25 },
  { name: "Peach", hue: 55 },
  { name: "Sunshine", hue: 90 },
  { name: "Mint", hue: 165 },
  { name: "Sky", hue: 230 },
  { name: "Blue", hue: 260 },
  { name: "Lavender", hue: 300 },
];

/** Keeps any number on the colour wheel (0–359); anything unusable falls back to pink. */
export function normalizeHue(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return DEFAULT_HUE;
  return ((Math.round(n) % 360) + 360) % 360;
}

/** Applies a colour to the whole site right away and remembers it for the next visit. */
export function applyHue(hue: number | null | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (hue == null) {
    root.style.removeProperty("--hue");
    try {
      localStorage.removeItem(HUE_STORAGE_KEY);
    } catch {
      /* storage blocked */
    }
    return;
  }
  const h = normalizeHue(hue);
  root.style.setProperty("--hue", String(h));
  try {
    localStorage.setItem(HUE_STORAGE_KEY, String(h));
  } catch {
    /* storage blocked */
  }
}

/** Runs before the page paints so a returning visitor doesn't see pink flash first. */
export const EARLY_HUE_SCRIPT = `try{var h=localStorage.getItem("${HUE_STORAGE_KEY}");if(h!==null&&/^\\d{1,3}$/.test(h))document.documentElement.style.setProperty("--hue",h)}catch(e){}`;

/** CSS colour for a swatch of the given hue (matches the site's main colour). */
export function swatchColor(hue: number) {
  return `oklch(0.64 0.21 ${normalizeHue(hue + 3)})`;
}

/** "Aisha" -> "Aisha's", "James" -> "James'". Signed-out visitors (or no name yet) see "Aisha's". */
export function journalOwner(displayName: string | null | undefined, signedIn: boolean): string {
  if (!signedIn) return "Aisha's";
  const first = (displayName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first) return "My";
  return /s$/i.test(first) ? `${first}'` : `${first}'s`;
}

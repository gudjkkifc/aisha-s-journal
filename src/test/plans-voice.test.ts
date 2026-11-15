import { describe, expect, it } from "vitest";

import { bucketProgress, monthGrid, upcomingEvents, type BucketItem, type CalendarEvent } from "@/lib/plans";
import { audioExtension, formatDuration, MAX_VOICE_NOTES, MAX_VOICE_SECONDS, pickAudioMime } from "@/lib/voice";

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: crypto.randomUUID(),
  user_id: "u",
  title: "Plan",
  notes: "",
  event_date: "2026-11-15",
  event_time: null,
  created_at: "",
  updated_at: "",
  ...over,
});

const item = (done: boolean): BucketItem => ({
  id: crypto.randomUUID(),
  user_id: "u",
  title: "Goal",
  done,
  done_at: null,
  created_at: "",
  updated_at: "",
});

describe("voice notes", () => {
  it("allows up to 3 recordings of 10 minutes each per entry", () => {
    expect(MAX_VOICE_NOTES).toBe(3);
    expect(MAX_VOICE_SECONDS).toBe(600);
  });

  it("prefers webm, falling back to mp4 for Safari", () => {
    expect(pickAudioMime((t) => t.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
    expect(pickAudioMime((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickAudioMime(() => false)).toBeUndefined();
  });

  it("names files after their recording format", () => {
    expect(audioExtension("audio/webm;codecs=opus")).toBe("webm");
    expect(audioExtension("audio/mp4")).toBe("m4a");
  });

  it("shows recording length as minutes:seconds", () => {
    expect(formatDuration(65)).toBe("1:05");
  });
});

describe("calendar", () => {
  it("pads the month to whole weeks starting on Sunday", () => {
    const days = monthGrid(new Date(2026, 10, 15)); // November 2026
    expect(days[0]?.getDay()).toBe(0);
    expect(days.length % 7).toBe(0);
    expect(days.some((d) => d.getMonth() === 10 && d.getDate() === 30)).toBe(true);
  });

  it("lists upcoming plans from today on, soonest first, and skips past ones", () => {
    const list = upcomingEvents(
      [
        ev({ title: "past", event_date: "2026-11-14" }),
        ev({ title: "later", event_date: "2026-12-01" }),
        ev({ title: "today 9am", event_date: "2026-11-15", event_time: "09:00:00" }),
      ],
      "2026-11-15",
    );
    expect(list.map((e) => e.title)).toEqual(["today 9am", "later"]);
  });
});

describe("bucket list", () => {
  it("counts how many goals are ticked off", () => {
    expect(bucketProgress([item(true), item(false), item(false), item(true)])).toEqual({
      done: 2,
      total: 4,
      percent: 50,
    });
  });
});

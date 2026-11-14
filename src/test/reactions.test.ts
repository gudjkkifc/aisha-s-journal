import { describe, expect, it } from "vitest";

import { placeReactions, splitLines, type Reaction } from "@/lib/reactions";

const r = (over: Partial<Reaction>): Reaction => ({
  id: crypto.randomUUID(),
  entry_id: "e1",
  line_index: 0,
  line_text: "",
  emoji: "🩷",
  reactor_id: "admin",
  created_at: "2026-11-14T00:00:00Z",
  ...over,
});

describe("line reactions", () => {
  it("puts a reaction on the exact line it was given to", () => {
    const lines = splitLines("Hello\nToday was great\nBye");
    const { chips, orphans } = placeReactions(lines, [r({ line_index: 1, line_text: "Today was great" })]);
    expect(chips.get(1)?.[0]?.emoji).toBe("🩷");
    expect(chips.has(0)).toBe(false);
    expect(orphans).toHaveLength(0);
  });

  it("follows the line when the writer adds text above it", () => {
    const lines = splitLines("New first line\nHello\nToday was great");
    const { chips } = placeReactions(lines, [r({ line_index: 1, line_text: "Today was great" })]);
    expect(chips.get(2)?.[0]?.emoji).toBe("🩷");
    expect(chips.has(1)).toBe(false);
  });

  it("never shows a reaction next to words that were rewritten", () => {
    const lines = splitLines("Hello\nSomething different");
    const { chips, orphans } = placeReactions(lines, [r({ line_index: 1, line_text: "Today was great" })]);
    expect(chips.size).toBe(0);
    expect(orphans).toHaveLength(1);
  });

  it("counts the same emoji from several admins and marks the viewer's own", () => {
    const mine = r({ reactor_id: "me", line_text: "Hi" });
    const { chips } = placeReactions(["Hi"], [mine, r({ reactor_id: "other", line_text: "Hi" })], "me");
    expect(chips.get(0)).toEqual([{ emoji: "🩷", count: 2, mineId: mine.id }]);
  });
});

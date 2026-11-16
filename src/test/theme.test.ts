import { describe, expect, it } from "vitest";

import { DEFAULT_HUE, journalOwner, normalizeHue } from "@/lib/theme";

describe("journal title", () => {
  it("shows Aisha's journal to signed-out visitors", () => {
    expect(journalOwner("Zawadi", false)).toBe("Aisha's");
  });
  it("uses the signed-in person's first name", () => {
    expect(journalOwner("Zawadi Achieng", true)).toBe("Zawadi's");
  });
  it("writes names ending in s as James'", () => {
    expect(journalOwner("James", true)).toBe("James'");
  });
  it("falls back to My journal when there is no name", () => {
    expect(journalOwner("  ", true)).toBe("My");
  });
});

describe("site colour", () => {
  it("defaults to pink", () => {
    expect(DEFAULT_HUE).toBe(355);
    expect(normalizeHue(undefined)).toBe(355);
  });
  it("keeps any chosen colour on the wheel", () => {
    expect(normalizeHue(400)).toBe(40);
    expect(normalizeHue(-20)).toBe(340);
    expect(normalizeHue("230")).toBe(230);
  });
});

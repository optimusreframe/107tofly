import { describe, it, expect } from "vitest";
import { SRS_INTERVALS_MIN, MAX_LEVEL, nextLevel, nextDueAt } from "./srs";

describe("srs", () => {
  it("intervals are monotonically increasing", () => {
    for (let i = 1; i < SRS_INTERVALS_MIN.length; i++) {
      expect(SRS_INTERVALS_MIN[i]).toBeGreaterThan(SRS_INTERVALS_MIN[i - 1]);
    }
  });

  it("nextLevel increases on correct, clamps at MAX_LEVEL", () => {
    expect(nextLevel(0, true)).toBe(1);
    expect(nextLevel(MAX_LEVEL, true)).toBe(MAX_LEVEL);
  });

  it("nextLevel decreases on wrong, clamps at 0", () => {
    expect(nextLevel(3, false)).toBe(2);
    expect(nextLevel(0, false)).toBe(0);
  });

  it("nextDueAt shifts by interval minutes", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const due = nextDueAt(2, from);
    expect(due.getTime() - from.getTime()).toBe(SRS_INTERVALS_MIN[2] * 60_000);
  });
});

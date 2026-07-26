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

  it("nextLevel tolerates out-of-range and non-integer input", () => {
    expect(nextLevel(-3, true)).toBe(1);
    expect(nextLevel(99, false)).toBe(MAX_LEVEL - 1);
    expect(nextLevel(2.7, true)).toBe(3);
  });

  it("nextDueAt shifts by interval minutes", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const due = nextDueAt(2, from);
    expect(due.getTime() - from.getTime()).toBe(SRS_INTERVALS_MIN[2] * 60_000);
  });

  it("nextDueAt uses lowest interval at level 0 and highest at MAX_LEVEL", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(nextDueAt(0, from).getTime() - from.getTime()).toBe(SRS_INTERVALS_MIN[0] * 60_000);
    expect(nextDueAt(MAX_LEVEL, from).getTime() - from.getTime()).toBe(
      SRS_INTERVALS_MIN[MAX_LEVEL] * 60_000,
    );
  });

  it("full correct cycle reaches MAX_LEVEL in exactly MAX_LEVEL steps", () => {
    let l = 0;
    for (let i = 0; i < MAX_LEVEL; i++) l = nextLevel(l, true);
    expect(l).toBe(MAX_LEVEL);
    expect(nextLevel(l, true)).toBe(MAX_LEVEL);
  });
});

import { describe, it, expect } from "vitest";
import { evaluatePick } from "./session-eval.server";

describe("evaluatePick", () => {
  it("mcq: correct index passes", () => {
    expect(evaluatePick("mcq", { index: 2 }, 2)).toBe(true);
    expect(evaluatePick("mcq", { index: 2 }, 1)).toBe(false);
  });

  it("mcq: ignores client is_correct flag (evaluates from answer only)", () => {
    expect(evaluatePick("mcq", { index: 0 }, { index: 1, is_correct: true } as unknown)).toBe(false);
  });

  it("mcq: null/undefined answer never passes", () => {
    expect(evaluatePick("mcq", null, 0)).toBe(false);
    expect(evaluatePick("mcq", undefined, 0)).toBe(false);
  });

  it("cloze: case/space insensitive equality", () => {
    expect(evaluatePick("cloze", { text: "Class B" }, { text: "  class b " })).toBe(true);
    expect(evaluatePick("cloze", { text: "Class B" }, "class c")).toBe(false);
  });

  it("cloze: empty answer never passes even against empty pick", () => {
    expect(evaluatePick("cloze", { text: "" }, "")).toBe(false);
  });

  it("order: exact array equality", () => {
    expect(evaluatePick("order", { order: [1, 2, 3] }, { order: [1, 2, 3] })).toBe(true);
    expect(evaluatePick("order", { order: [1, 2, 3] }, { order: [3, 2, 1] })).toBe(false);
  });

  it("match: pairs object equality via JSON", () => {
    expect(evaluatePick("match", { pairs: { "0": 1, "1": 0 } }, { pairs: { "0": 1, "1": 0 } })).toBe(true);
    expect(evaluatePick("match", { pairs: { "0": 1 } }, { pairs: { "0": 0 } })).toBe(false);
  });

  it("unknown kind returns false", () => {
    // @ts-expect-error intentional
    expect(evaluatePick("bogus", { anything: 1 }, 1)).toBe(false);
  });
});

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

  it("cloze: case/space insensitive equality on text", () => {
    expect(evaluatePick("cloze", { text: "Class B" }, { text: "  class b " })).toBe(true);
    expect(evaluatePick("cloze", { text: "Class B" }, "class c")).toBe(false);
  });

  it("cloze: accepts any of blanks[]", () => {
    expect(evaluatePick("cloze", { blanks: ["VLOS", "visual line of sight"] }, "VLOS")).toBe(true);
    expect(evaluatePick("cloze", { blanks: ["VLOS", "visual line of sight"] }, "Visual Line Of Sight")).toBe(true);
    expect(evaluatePick("cloze", { blanks: ["VLOS"] }, "bvlos")).toBe(false);
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

  it("multi_select: set-equal ignores order/duplicates", () => {
    expect(evaluatePick("multi_select", { indices: [0, 2] }, { indices: [2, 0] })).toBe(true);
    expect(evaluatePick("multi_select", { indices: [0, 2] }, { indices: [0, 0, 2] })).toBe(true);
    expect(evaluatePick("multi_select", { indices: [0, 2] }, { indices: [0] })).toBe(false);
    expect(evaluatePick("multi_select", { indices: [0, 2] }, { indices: [0, 1, 2] })).toBe(false);
  });

  it("multi_select: empty answer never passes", () => {
    expect(evaluatePick("multi_select", { indices: [] }, { indices: [] })).toBe(false);
  });

  it("numeric: exact match without tolerance", () => {
    expect(evaluatePick("numeric", { value: 400 }, { value: 400 })).toBe(true);
    expect(evaluatePick("numeric", { value: 400 }, { value: 401 })).toBe(false);
  });

  it("numeric: respects tolerance both directions", () => {
    expect(evaluatePick("numeric", { value: 400, tolerance: 5 }, { value: 405 })).toBe(true);
    expect(evaluatePick("numeric", { value: 400, tolerance: 5 }, { value: 395 })).toBe(true);
    expect(evaluatePick("numeric", { value: 400, tolerance: 5 }, { value: 406 })).toBe(false);
  });

  it("numeric: non-numeric pick fails", () => {
    expect(evaluatePick("numeric", { value: 10 }, { value: "abc" })).toBe(false);
    expect(evaluatePick("numeric", { value: 10 }, null)).toBe(false);
  });

  it("truefalse: coerces common representations", () => {
    expect(evaluatePick("truefalse", { value: true }, { value: true })).toBe(true);
    expect(evaluatePick("truefalse", { value: true }, { value: "true" })).toBe(true);
    expect(evaluatePick("truefalse", { value: false }, { value: "no" })).toBe(true);
    expect(evaluatePick("truefalse", { value: true }, { value: false })).toBe(false);
  });

  it("truefalse: null/undefined pick fails", () => {
    expect(evaluatePick("truefalse", { value: true }, null)).toBe(false);
    expect(evaluatePick("truefalse", { value: true }, { value: "maybe" })).toBe(false);
  });

  it("unknown kind returns false", () => {
    // @ts-expect-error intentional
    expect(evaluatePick("bogus", { anything: 1 }, 1)).toBe(false);
  });
});

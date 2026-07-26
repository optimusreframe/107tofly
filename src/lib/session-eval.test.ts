import { describe, it, expect } from "vitest";
import { evaluatePick } from "./session-eval.server";

describe("evaluatePick", () => {
  it("mcq: correct index passes", () => {
    expect(evaluatePick("mcq", { index: 2 }, 2)).toBe(true);
    expect(evaluatePick("mcq", { index: 2 }, 1)).toBe(false);
  });

  it("mcq: ignores client is_correct flag (evaluates from answer only)", () => {
    // pick object with is_correct:true but wrong index → still false
    expect(evaluatePick("mcq", { index: 0 }, { index: 1, is_correct: true } as unknown)).toBe(false);
  });

  it("cloze: case/space insensitive equality", () => {
    expect(evaluatePick("cloze", { text: "Class B" }, { text: "  class b " })).toBe(true);
    expect(evaluatePick("cloze", { text: "Class B" }, "class c")).toBe(false);
  });

  it("order: exact array equality", () => {
    expect(evaluatePick("order", { order: [1, 2, 3] }, { order: [1, 2, 3] })).toBe(true);
    expect(evaluatePick("order", { order: [1, 2, 3] }, { order: [3, 2, 1] })).toBe(false);
  });
});

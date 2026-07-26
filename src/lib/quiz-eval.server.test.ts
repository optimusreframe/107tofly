import { describe, it, expect } from "vitest";
import { evaluateAttempt } from "./quiz-eval.server";

function mockSupabase(rows: Array<{ id: string; correct_index: number; explanation?: string; common_mistake?: string; topic?: string }>) {
  return {
    from: (_t: string) => ({
      select: (_c: string) => ({
        in: (_col: string, ids: string[]) => ({
          then: (fn: (r: { data: unknown; error: null }) => unknown) =>
            fn({ data: rows.filter((r) => ids.includes(r.id)), error: null }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof evaluateAttempt>[0];
}

// The helper above uses PromiseLike; make the chain awaitable properly.
function sb(rows: Array<{ id: string; correct_index: number; explanation?: string | null; common_mistake?: string | null; topic?: string | null }>) {
  return {
    from: () => ({
      select: () => ({
        in: async (_col: string, ids: string[]) => ({
          data: rows.filter((r) => ids.includes(r.id)),
          error: null,
        }),
      }),
    }),
  };
}

describe("evaluateAttempt", () => {
  it("returns zero for empty picks", async () => {
    const r = await evaluateAttempt(sb([]), []);
    expect(r).toEqual({ results: [], total: 0, correct: 0, score: 0 });
  });

  it("scores correctly and ignores client-provided flags", async () => {
    const rows = [
      { id: "a", correct_index: 2, explanation: "A", common_mistake: null, topic: "airspace" },
      { id: "b", correct_index: 0, explanation: null, common_mistake: "trap", topic: "weather" },
      { id: "c", correct_index: 1, explanation: null, common_mistake: null, topic: null },
    ];
    const r = await evaluateAttempt(sb(rows), [
      { question_id: "a", selected_index: 2 }, // correct
      { question_id: "b", selected_index: 3 }, // wrong
      { question_id: "c", selected_index: 1 }, // correct
    ]);
    expect(r.total).toBe(3);
    expect(r.correct).toBe(2);
    expect(r.score).toBe(67);
    expect(r.results.find((x) => x.question_id === "b")?.is_correct).toBe(false);
    expect(r.results.find((x) => x.question_id === "b")?.correct_index).toBe(0);
  });

  it("marks unknown questions as incorrect", async () => {
    const r = await evaluateAttempt(sb([]), [{ question_id: "x", selected_index: 0 }]);
    expect(r.correct).toBe(0);
    expect(r.results[0].correct_index).toBe(-1);
  });

  it("computes 100% when all correct", async () => {
    const rows = [{ id: "a", correct_index: 0 }];
    const r = await evaluateAttempt(sb(rows), [{ question_id: "a", selected_index: 0 }]);
    expect(r.score).toBe(100);
  });
});

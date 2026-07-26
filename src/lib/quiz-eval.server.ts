// Server-side authoritative quiz evaluator.
// Loads questions with the caller's Supabase client (RLS: published questions),
// compares stored correct_index to client picks, and returns per-question feedback.
// Callers MUST ignore any is_correct sent by the client.

export type EvalPick = { question_id: string; selected_index: number };
export type EvalResult = {
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  correct_index: number;
  explanation: string | null;
  common_mistake: string | null;
  topic: string | null;
};

export type EvalReturn = {
  results: EvalResult[];
  total: number;
  correct: number;
  score: number; // 0-100 rounded
};

// Minimal shape of the Supabase client we need — kept as any to avoid tight
// coupling to generated types (which vary between authenticated/admin clients).
type SB = { from: (t: string) => any };

export async function evaluateAttempt(supabase: SB, picks: EvalPick[]): Promise<EvalReturn> {
  const ids = Array.from(new Set(picks.map((p) => p.question_id)));
  if (ids.length === 0) {
    return { results: [], total: 0, correct: 0, score: 0 };
  }

  const { data, error } = await supabase
    .from("questions")
    .select("id,correct_index,explanation,common_mistake,topic,status")
    .in("id", ids);
  if (error) throw error;

  const byId = new Map<string, { correct_index: number; explanation: string | null; common_mistake: string | null; topic: string | null }>();
  for (const r of (data ?? []) as Array<Record<string, unknown>>) {
    byId.set(r.id as string, {
      correct_index: Number(r.correct_index ?? -1),
      explanation: (r.explanation as string | null) ?? null,
      common_mistake: (r.common_mistake as string | null) ?? null,
      topic: (r.topic as string | null) ?? null,
    });
  }

  const results: EvalResult[] = picks.map((p) => {
    const q = byId.get(p.question_id);
    const correct_index = q?.correct_index ?? -1;
    const is_correct = correct_index >= 0 && Number(p.selected_index) === correct_index;
    return {
      question_id: p.question_id,
      selected_index: Number(p.selected_index),
      is_correct,
      correct_index,
      explanation: q?.explanation ?? null,
      common_mistake: q?.common_mistake ?? null,
      topic: q?.topic ?? null,
    };
  });

  const total = results.length;
  const correct = results.filter((r) => r.is_correct).length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { results, total, correct, score };
}

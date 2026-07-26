// Server-side authoritative evaluator for Session Player exercises.
// Callers MUST ignore any correctness flag sent by the client.

export type ExerciseKind = "mcq" | "cloze" | "order" | "match";

export type ExerciseRow = {
  id: string;
  concept_id: string;
  kind: ExerciseKind;
  answer: unknown;
  explanation: string | null;
};

export function evaluatePick(kind: ExerciseKind, answer: unknown, pick: unknown): boolean {
  if (answer == null) return false;
  switch (kind) {
    case "mcq": {
      const correctIndex = typeof (answer as { index?: unknown }).index === "number"
        ? (answer as { index: number }).index
        : Number(answer);
      const picked = typeof pick === "number" ? pick : Number((pick as { index?: unknown })?.index);
      return Number.isFinite(correctIndex) && Number.isFinite(picked) && correctIndex === picked;
    }
    case "cloze": {
      const expected = String((answer as { text?: unknown }).text ?? answer).trim().toLowerCase();
      const got = String((pick as { text?: unknown })?.text ?? pick ?? "").trim().toLowerCase();
      return expected.length > 0 && expected === got;
    }
    case "order":
    case "match": {
      const a = JSON.stringify((answer as { order?: unknown }).order ?? answer);
      const b = JSON.stringify((pick as { order?: unknown })?.order ?? pick);
      return a === b;
    }
    default:
      return false;
  }
}

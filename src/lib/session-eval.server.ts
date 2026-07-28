// Server-side authoritative evaluator for Session Player exercises.
// Callers MUST ignore any correctness flag sent by the client.

export type ExerciseKind =
  | "mcq"
  | "cloze"
  | "order"
  | "match"
  | "multi_select"
  | "numeric"
  | "truefalse";

export type ExerciseRow = {
  id: string;
  concept_id: string;
  kind: ExerciseKind;
  answer: unknown;
  explanation: string | null;
};

function normalizeIndexSet(v: unknown): number[] {
  const arr = Array.isArray(v)
    ? v
    : Array.isArray((v as { indices?: unknown })?.indices)
      ? (v as { indices: unknown[] }).indices
      : [];
  const nums = arr
    .map((x) => (typeof x === "number" ? x : Number(x)))
    .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function coerceBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "t" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "f" || s === "0" || s === "no") return false;
  }
  if (typeof v === "object" && v !== null && "value" in (v as Record<string, unknown>)) {
    return coerceBool((v as { value: unknown }).value);
  }
  return null;
}

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
      // Accepted answers: answer.blanks[] (any match wins) OR answer.text.
      const blanks = Array.isArray((answer as { blanks?: unknown }).blanks)
        ? ((answer as { blanks: unknown[] }).blanks as unknown[])
        : [(answer as { text?: unknown }).text ?? answer];
      const got = String((pick as { text?: unknown })?.text ?? pick ?? "").trim().toLowerCase();
      if (!got) return false;
      return blanks.some((b) => {
        const expected = String(b ?? "").trim().toLowerCase();
        return expected.length > 0 && expected === got;
      });
    }
    case "order": {
      const a = JSON.stringify((answer as { order?: unknown }).order ?? answer);
      const b = JSON.stringify((pick as { order?: unknown })?.order ?? pick);
      return a === b;
    }
    case "match": {
      const a = JSON.stringify((answer as { pairs?: unknown }).pairs ?? answer);
      const b = JSON.stringify((pick as { pairs?: unknown })?.pairs ?? pick);
      return a === b;
    }
    case "multi_select": {
      const expected = normalizeIndexSet((answer as { indices?: unknown }).indices ?? answer);
      const picked = normalizeIndexSet((pick as { indices?: unknown })?.indices ?? pick);
      if (expected.length === 0) return false;
      if (expected.length !== picked.length) return false;
      for (let i = 0; i < expected.length; i++) {
        if (expected[i] !== picked[i]) return false;
      }
      return true;
    }
    case "numeric": {
      const expected = Number((answer as { value?: unknown }).value ?? answer);
      const tolRaw = (answer as { tolerance?: unknown }).tolerance;
      const tolerance = Number.isFinite(Number(tolRaw)) ? Math.abs(Number(tolRaw)) : 0;
      const got = Number((pick as { value?: unknown })?.value ?? pick);
      if (!Number.isFinite(expected) || !Number.isFinite(got)) return false;
      return Math.abs(expected - got) <= tolerance;
    }
    case "truefalse": {
      const expected = coerceBool((answer as { value?: unknown }).value ?? answer);
      const got = coerceBool((pick as { value?: unknown })?.value ?? pick);
      if (expected === null || got === null) return false;
      return expected === got;
    }
    default:
      return false;
  }
}

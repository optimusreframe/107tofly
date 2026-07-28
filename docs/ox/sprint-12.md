# Sprint 12 — Exercise Types II

## Scope
Add three new exercise interaction kinds to the Learning Engine:
- `multi_select` — pick any number of correct options (set-equal scoring).
- `numeric` — enter a number with optional ± tolerance and unit label.
- `truefalse` — binary statement judgement.

`hotspot` deferred: it requires image asset management and coordinate authoring; it belongs in its own sprint alongside the media pipeline.

## Changes
- **DB**: `ALTER TYPE public.exercise_kind ADD VALUE` for the three new kinds.
- **Evaluator** (`src/lib/session-eval.server.ts`): authoritative server-side scoring for the new kinds. `multi_select` normalises indices (dedupe + sort) so ordering and duplicates don't affect correctness. `numeric` respects `answer.tolerance` and rejects non-finite picks. `truefalse` coerces common string reps ("true"/"yes"/"1"). `cloze` now also accepts `answer.blanks[]` (any-match) in addition to legacy `answer.text`.
- **Tests** (`src/lib/session-eval.test.ts`): 16 cases covering happy paths, empty-answer safety, coercion, and tolerance edges.
- **Student UI** (`src/components/ExerciseView.tsx`): renderers for the three new kinds with the existing token-based styling (no hardcoded colors).
- **Admin UI** (`src/components/admin/ExerciseFormEditor.tsx`): structured form editors per new kind; raw-JSON fallback preserved.
- **Admin route** (`src/routes/admin.learning.tsx`): kind dropdown now lists the three new types.

## Contract notes
Payload / answer shapes authors and future code should follow:
- `multi_select`: `payload = { prompt, options: string[] }`, `answer = { indices: number[] }`.
- `numeric`: `payload = { prompt, unit? }`, `answer = { value: number, tolerance?: number }`.
- `truefalse`: `payload = { prompt }`, `answer = { value: boolean }`.

Client picks mirror the answer shape (`{ indices }`, `{ value }`) so `evaluatePick` handles both wrapped and bare inputs.

## Verification
- `bunx vitest run src/lib/session-eval.test.ts` → 16/16 pass.
- Typecheck clean.
- No changes to `session-player.functions.ts`: the DTO already omits `answer`/`explanation` pre-submit, and evaluation is delegated to `evaluatePick`, so the new kinds flow through with zero server-fn changes.

## Out of scope
- Seeding new exercises for the new kinds (authoring task, admin can create them).
- `hotspot` / image-based interactions.
- AI-assisted translation for the new payload shapes (existing translator already round-trips arbitrary JSON payloads).

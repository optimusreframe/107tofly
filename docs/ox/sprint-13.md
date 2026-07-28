# Sprint 13 — Map & Weather Lab Integration

## Scope
Wire the previously static Map Lab and Weather Lab pages into the Learning Engine backend so student activity there is real: answers logged to `session_events`, XP awarded once per UTC day per lab, daily streak touched.

## Changes
- **New server fns** (`src/lib/lab-sessions.functions.ts`):
  - `submitLabAnswer({ labId, itemId, correct, latencyMs? })` — inserts `session_events` row (`kind='answer'`, `note='lab:<labId>:<itemId>'`). Best-effort, no user-facing error on failure.
  - `completeLabChallenge({ labId, total, correct })` — idempotent per user per lab per UTC day: checks for an existing `end` event with `note='lab:<labId>:end'` since 00:00Z; if none, inserts the end event, calls `touchDailyActivity`, and adds `LAB_XP = 10` to `progress.xp`. Returns `{ score, xpAwarded, alreadyCompleted }`.
- **New component** (`src/components/LabChallenge.tsx`): reusable MCQ challenge shell with per-answer feedback, FlyCoach explanation, running progress, completion card with score / XP toast, and restart. Uses existing tokenized styles — no hardcoded colors.
- **Map Lab** (`src/routes/map-lab.tsx`): added 5-question "Airspace Challenge" (Class B shelf vs core, LAANC, Class C surface, Class E floor, Class G rules) after the existing hotspot inspector.
- **Weather Lab** (`src/routes/weather-lab.tsx`): added 5-question "METAR Challenge" (wind decoding, Part 107 visibility min, cloud separation, BR code, temp/dew spread) after the Go/No-Go card.

## Contract
- `session_events.note` uses `lab:<labId>` prefix so future analytics / mastery can filter lab traffic distinctly from unit sessions. `unit_id`, `concept_id`, and `exercise_id` are all left null for lab events.
- XP idempotency: strict per-UTC-day per-lab. Attempting to re-complete the same lab the same day returns `alreadyCompleted=true, xpAwarded=0`; the UI surfaces "ya reclamado hoy".
- Streak: only touched when XP is actually granted (first pass of the day), matching the semantics used by `endSession` / `endDailyFlight`.

## Verification
- `bunx tsgo --noEmit` → clean.
- Existing Vitest suites unaffected (no touched code path is exercised by them).
- Manual: enum kinds (`answer`, `end`) accepted; `note` column is `text` with no length constraint beyond DB default.

## Out of scope
- Concept-level mastery updates from lab answers (labs are cross-concept scenarios; wiring them into SM-2 would need per-item concept tagging — deferred).
- Authoring UI for lab items — hardcoded in the route files for now (matches the existing pattern for these labs).
- Hotspot-image exercise kind (S12 deferral still stands).

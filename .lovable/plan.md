# Sprint 2 — Learning Engine 2.0 (Foundation)

Sprint 1 (Foundation Integrity) is closed. The plan doc explicitly deferred the new educational model to Sprint 2+. This sprint lays the DB + backend + minimal UI for it, without breaking the current lesson/quiz flow.

Guardrails:
- No visual redesign (Duolingo-style comes later).
- Current `lessons`, `questions`, `flashcards`, `progress`, certificates keep working unchanged.
- Feature flag `features.session_player_enabled` (default OFF) gates the new UI.

## 1. Schema (single migration)

New tables in `public`, each with GRANTs + RLS + policies per project rules:

- `learning_units` — canonical unit of study (id, slug, locale, title, summary, order_index, lesson_id nullable link, status, translation_group_id, timestamps). Public SELECT for `status='published'`; admin write via `has_role('admin')`.
- `concepts` — atomic idea inside a unit (id, unit_id, order_index, title, body_md, locale). Public read when parent unit is published.
- `exercises` — typed practice item bound to a concept (id, concept_id, kind enum: `mcq|cloze|order|match`, payload jsonb, answer jsonb, explanation, difficulty smallint, locale). Answer/explanation NEVER exposed to anon; only `id, concept_id, kind, payload, difficulty, locale` in public DTO.
- `mastery` — per-user per-concept mastery (user_id, concept_id, level smallint 0–5, correct_streak, last_seen_at, next_due_at). RLS `auth.uid() = user_id`.
- `session_events` — append-only log of Session Player events (user_id, unit_id, concept_id, exercise_id, kind, correct, latency_ms, created_at). Insert-own only.

Seed: none. Content authoring happens later in Admin.

## 2. Server functions (all under `src/lib/`)

- `learning-units.functions.ts`: `listPublishedUnits({locale})`, `getUnitBySlug({slug,locale})` with EN fallback (mirrors lesson pattern).
- `session-player.functions.ts`:
  - `startSession({unitId})` → picks next due concepts using `mastery.next_due_at` + SRS interval table, returns exercises with **safe DTO only**.
  - `submitExercise({exerciseId, pick})` → server-side eval (reuses pattern from `quiz-eval.server.ts`), updates `mastery` (SM-2 lite: level±1, next_due_at = now + interval[level]), inserts `session_events`, awards XP via runtime-settings, creates flashcard on wrong answer.
  - `endSession({unitId})` → summary (correct, xp, mastery deltas).
- `admin-learning.functions.ts` (admin-gated): CRUD for units/concepts/exercises + AI translation reusing existing Gemini flow.

Import-graph safety: any `client.server` load stays inside handlers, per Sprint 1 rules.

## 3. Minimal UI (behind flag)

- `/learn/$unitSlug` route — Session Player MVP:
  - Card stack, one exercise at a time, immediate feedback per exercise (this is Session Player semantics, distinct from lesson quiz).
  - Progress bar, XP toast, end-of-session summary.
- Dashboard: if flag ON and any published unit exists, show "Continue learning" card linking to next due unit; otherwise unchanged.
- No admin UI in this sprint beyond raw list under `/admin/learning` (table only, create/edit deferred to Sprint 3).

## 4. Tests

- Vitest:
  - `session-eval.test.ts` — server ignores client-sent correctness; wrong pick → mastery level decreases, right pick → increases and pushes `next_due_at`.
  - `srs-schedule.test.ts` — interval table is monotonic and capped.
- Playwright smoke: with flag ON and a seeded unit fixture, start session → answer 1 right / 1 wrong → summary renders, `session_events` rows exist.

## 5. Acceptance

- Migration applies cleanly; every new public table has GRANTs + RLS + policies.
- Anon fetch of exercises never contains `answer` or `explanation`.
- Existing dashboard, lessons, practice, simulator, certificate flows unchanged when flag is OFF.
- CI green (typecheck, vitest, build, playwright smoke).

## Technical notes

- SRS interval table (minutes): `[10, 60, 360, 1440, 4320, 10080]` indexed by level 0–5.
- `mastery.level` clamps to `[0,5]`; on wrong, `level = max(0, level-1)` and `correct_streak = 0`.
- Reuse `PUBLIC_*_COLS` pattern for exercise projection.
- Feature flag read via existing `runtime-settings.server.ts` cache.
- No changes to `lessons`, `questions`, `flashcards`, `progress`, certificates schemas.

Out of scope: Daily Flight adaptive engine, Map/Weather Lab 2.0, Mission Engine, Readiness 2.0, Simulator 2.0, Duolingo visual redesign, admin authoring UI (Sprint 3).

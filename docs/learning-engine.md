# 107toFly — Learning Engine (Technical Overview)

## Scope
Authoritative rules for how the platform evaluates study progress, quiz
attempts, exam simulations, and certificate eligibility. All calculations
below run **server-side** in `createServerFn` handlers; client-provided
scores or `is_correct` flags are ignored.

## Data model (relevant tables)
- `lessons` — canonical curriculum. `status='published'`, `locale='en'` is
  the canonical set; ES rows share `translation_group_id`.
- `questions` — MCQ bank. Server-only columns: `correct_index`,
  `explanation`, `common_mistake`. Public DTO omits these.
- `quiz_attempts` — one row per submitted quiz (`mode`: practice|daily|exam,
  `attempt_type`: lesson_quiz|null).
- `quiz_answers` — per-question row: `question_id`, `selected_index`,
  server-computed `is_correct`, `time_ms`.
- `exam_simulations` — 60-question simulator submissions with
  `domain_breakdown`.
- `lesson_completions` — one row per user × lesson_slug.
- `lesson_quiz_progress` — one row per user × lesson_slug; tracks
  `best_score`, `attempts_count`, `passed`, `xp_awarded`.
- `progress` — rollup: `study_pct`, `practice_pct`, `review_pct`,
  `readiness`, `xp`, `streak`.
- `flashcards` — SRS: `due_date`, `repetitions`, `interval`, `ease`.
- `certificates` — issued credentials with `status`, `final_score`.

## Authoritative evaluation
`src/lib/quiz-eval.server.ts::evaluateAttempt(supabase, picks[])`
1. Selects `id, correct_index, explanation, common_mistake, topic` from
   `questions` for the ids in `picks`.
2. For each pick: `is_correct = correct_index >= 0 && selected_index === correct_index`.
3. Returns `{ results[], total, correct, score }` where
   `score = round(correct / total * 100)`.

Callers:
- `submitQuizAttempt` (practice/daily)
- `submitExamSimulation` (60-question exam)
- `submitLessonQuizAttempt` (per-lesson daily quiz)

Client `is_correct` in the payload is accepted for backward compatibility
but **discarded** before scoring.

## XP model
Read from `app_settings` (30 s cache via `runtime-settings.server`):
- `study.lesson_complete_xp` — first-time lesson completion.
- `study.lesson_quiz_pass_xp` — first-time lesson quiz pass (idempotent per
  lesson via `lesson_quiz_progress.xp_awarded`).
- `study.level_xp_step` — XP per level tier.

## Lesson quiz pass logic
1. Server evaluates → `score` and `passed = score >= study.quiz_pass_score`.
2. Upsert `lesson_quiz_progress`:
   - `best_score = max(prev, score)`
   - `attempts_count += 1`
   - `passed = prev.passed || passed`
   - `xp_awarded = prev.xp_awarded || (nowPassed)`
3. If `!prev.xp_awarded && nowPassed` → add `lesson_quiz_pass_xp` to
   `progress.xp`.
4. `touchDailyActivity(supabase, userId)` — streak upkeep.

## Progress rollup (`recomputeProgress`)
Dynamic totals (no hardcoded lesson count):
- `study_pct = min(100, completed / lessons_total * 100)` where
  `lessons_total` is the current published `locale='en'` lesson count
  (see `lessons-count.server.ts` and `dashboard-bundle.functions.ts`).
- `practice_pct` — quiz average across all attempts.
- `review_pct` — SRS retention proxy: `% of flashcards with repetitions ≥ 2`.
- `readiness = round(0.30*study + 0.30*quiz_avg + 0.25*best_sim +
  0.10*fc_retention + 0.05*activity)`; `passed = readiness >= study.exam_ready_score`.

## Certificate eligibility (`issueCertificate`)
All thresholds from `app_settings.certificate.*`:
- `latest exam score >= min_latest_exam_score`
- `count(exam_simulations.score >= min_latest) >= required_exam_simulations`
- `quiz average >= min_quiz_average`
- `course completion percent >= min_course_completion_percent` using the
  live `lessons` count
- Feature flag `features.certificates_enabled` must be true

If any check fails → `{ ok: false, reasons[] }`. If all pass → insert
`certificates` row with `status='active'` and `final_score = readiness`.

## Streak
`touchDailyActivity(supabase, userId)`:
- Reads `progress.streak` + `last_activity_date`.
- Same day → no-op.
- +1 day → increment; otherwise reset to 1.

## Public DTOs (no leak)
Fetchers exposed to the browser (`fetchPracticeQuestions`, `getLessonQuiz`)
project only:
`id, topic, acs_code, source, question, options, locale, translation_group_id`.
`correct_index`, `explanation`, `common_mistake` are returned **only** by
`evaluateAttempt` after a submit.

## Runtime settings cache
`runtime-settings.server.ts` reads `app_settings` on demand with a 30 s TTL
cache. Admin edits in `/admin/settings` propagate within one cache window
without a redeploy.

## Testing
- `src/lib/quiz-eval.server.test.ts` — unit tests for evaluator.
- CI: `.github/workflows/ci.yml` runs `bun run test` + `bun run build`.

## Invariants
1. No client input decides correctness. Ever.
2. Lesson counts are computed from the DB, never hardcoded.
3. XP awards for lesson quizzes are idempotent.
4. Certificates require server-verified thresholds AND the feature flag.
5. Question answer keys never ship in initial fetches.

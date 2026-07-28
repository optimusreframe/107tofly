# Sprint S11 — Session Completion Loop

## Scope
Close the Session Player and Daily Flight completion loop so that XP is actually persisted, streaks are only counted once per session, and the summary screen reflects real mastery movement.

## Problems fixed
1. **XP never persisted.** `endSession` / `endDailyFlight` computed `xpAwarded` and returned it, but the value was never written to `progress.xp`. Refreshing the summary showed "+20 XP" while the dashboard still read 0.
2. **No idempotency guard.** Remounting the summary route (or a stale client re-issuing the RPC) would re-run `touchDailyActivity` and, once XP was persisted, would keep incrementing `progress.xp`.
3. **Thin summary UI.** The completion screen did not communicate mastery movement.

## Changes
- `src/lib/session-player.functions.ts`
  - `endSession` and `endDailyFlight` now:
    - Look up the last `session_events.kind='start'` for the (user, unit) pair to bound the session window.
    - Check whether an `end` event already exists inside that window. If so, return `alreadyCompleted: true, xpAwarded: 0` and skip all side effects.
    - Otherwise insert the `end` event, call `touchDailyActivity`, and increment `progress.xp` by the computed amount (with hint penalty).
  - Return payload gains `alreadyCompleted: boolean`.
- `src/routes/learn.$unitSlug.tsx`
  - Summary type extended with `alreadyCompleted` and `masteryDeltas`.
  - Added mastery bar (average level across concepts practiced this session, 0–100%).
  - Added "already completed" state that suppresses the misleading "+XP" line.
- `src/routes/daily-flight.tsx`
  - Same summary-shape update and idempotent messaging.

## Contract
| Field              | Type    | Meaning                                                        |
| ------------------ | ------- | -------------------------------------------------------------- |
| `score`            | number  | percent correct                                                |
| `passed`           | boolean | `score >= quizPassScore` (runtime setting)                     |
| `xpAwarded`        | number  | XP actually written to `progress.xp` this call (0 if replayed) |
| `alreadyCompleted` | boolean | true when a previous `end` event closed this window            |
| `hintCount`        | number  | number of hint views (each −25% XP)                            |
| `masteryDeltas`    | array   | post-session mastery levels for the concepts practiced         |

## Non-goals (moved to later sprints)
- Full i18n keys for the summary screen — kept EN copy in place. Deferred to S12.
- Per-concept diff visualization (before → after). Current UI shows post-session average only.
- Streak animation.

## Verification
- Manual: finish a session, refresh the summary page; the DB shows a single `end` event and `progress.xp` only increments once.
- `bun run vitest run` — existing suites (`session-eval`, `srs`, `quiz-eval`) pass unchanged; the idempotency check is enforced at the DB read layer.
- Typecheck + build green.

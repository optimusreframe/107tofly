# Sprint 14 — Flight Path (Visual Learning Path)

## Scope
Give students a visual, motivational overview of their journey to Part 107. Waypoint-style progression using the real mastery data from `getMasteryOverview` — no new backend, no seed changes.

## Changes
- **New route** `src/routes/flight-path.tsx`:
  - Alternating waypoint layout (SVG-free, pure CSS) with a vertical connector line.
  - Each unit is a node with 4 states derived from mastery: `locked` (previous unit <60%), `active` (available), `in_progress` (any concept seen), `done` (avg ≥80%).
  - Mastery bar per unit + due-count hint + link into `/learn/$unitSlug`.
  - Header shows total avg mastery and a "Continuar en X" CTA pointing to the first non-done unit.
  - Destination card = Part 107 certificate with link to `/simulator`.
- Uses existing tokens only — no hardcoded colors.

## Contract
- Purely a read view over `getMasteryOverview`. No new server fn, no schema change.
- Gating is client-side visual only ("locked" is a hint, not enforcement) — the engine still lets users open any published unit directly, matching the current permissive Practice/Progress behavior.

## Verification
- `tsgo --noEmit` clean.
- Route renders empty-state, loading-state, and populated-state.
- Reuses `StudentAppShell` — nav, i18n, theme, streak badge all inherited.

## Out of scope
- Hard prerequisite enforcement (would require an engine policy decision and admin UI).
- Adding a nav entry in `StudentAppShell` — waiting for user validation before promoting it into primary nav.

# Coming Soon — Payments / Memberships / Support

Per user directive, memberships, payments and support are paused.

## What was disabled
- `src/routes/admin.users.tsx`
  - Plan filter (Select) removed from the toolbar.
  - Membership badge / status hidden in the mobile list and desktop table (replaced by a subtle "Coming soon" pill).
  - `planFilter` predicate no longer applied to the user list.
  - Drawer "Membership" section is now read-only with a dashed border, greyed-out selects, and a disabled "Coming soon" button. The `updateUserMembership` server fn still exists but is unreachable from UI.

## What was NOT touched
- `profiles.membership_plan` / `membership_status` columns remain (data intact).
- `updateUserMembership` server function remains for future re-enable.
- No pricing / upgrade / support public routes exist today; none were created.

## Re-enable checklist (future)
1. Restore the Plan filter Select in `admin.users.tsx`.
2. Restore Membership badge/status in list and table.
3. Restore Membership drawer section (remove `disabled`, put back `saveMembership` handler).
4. Ship `/pricing`, `/upgrade`, `/support` routes and wire payments.

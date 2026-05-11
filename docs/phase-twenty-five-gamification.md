# Phase 25 — Gamification Backend

This phase turns the existing UI milestone language into a Supabase-backed points and achievements foundation.

## Implemented

### Database layer

Added migration:

- `supabase/migrations/202605110002_phase_twenty_five_gamification.sql`

The migration creates:

- `app_points_ledger`
- `app_achievements`
- `app_user_achievements`

The points ledger is append-only for normal award paths and uses a unique index to prevent duplicate awards for the same user/reason/source.

### Default achievements

Seeded achievements:

- `first_points` — First Points
- `twenty_points` — Momentum Builder
- `fifty_points` — Community Contributor
- `hundred_points` — Volunteer Champion

Achievements are awarded when total points cross the configured threshold.

### Award RPCs

Added RPCs:

- `award_verified_attendance_points(p_claim_id uuid)`
- `award_training_completion_points(p_training_signup_id uuid)`
- `award_referral_points(p_referral_id uuid)`
- `award_available_points()`
- `get_my_points_summary()`
- `get_admin_points_summary()`

### Points rules

Initial point rules:

- verified or adjusted attendance: `5 points × ceiling(verified_hours)`, minimum 5 points;
- completed training: 10 points;
- accepted referral: 15 points.

These rules are server-side and idempotent.

### Frontend dashboard layer

Added frontend module:

- `assets/gamification.js`

The dashboard now gets a Volunteer points card that shows:

- total points;
- achievement count;
- next milestone guidance;
- awarded achievement chips;
- recent ledger entries.

Admins get a Points summary card that shows volunteer point totals and achievement counts.

### Loader

`assets/admin-attendance-code-view.js` now loads:

- `assets/pre-phase-urgent-fixes.js`
- `assets/referrals.js`
- `assets/gamification.js`

The gamification module performs an idempotent award backfill after sign-in and after attendance/training sync events.

## Supabase setup required

Apply the migration in Supabase:

```sql
supabase/migrations/202605110002_phase_twenty_five_gamification.sql
```

Phase 24 referrals should already be migrated before this phase if referral points are expected to work.

## Manual QA checklist

### Migration verification

1. Apply the migration.
2. Confirm the following tables exist:
   - `app_points_ledger`
   - `app_achievements`
   - `app_user_achievements`
3. Confirm default achievements are seeded.
4. Confirm the RPCs are available to authenticated users.

### Volunteer points card

1. Sign in as a volunteer.
2. Open Dashboard.
3. Confirm the Volunteer points card appears.
4. Confirm total points and recent points load without console errors.

### Attendance points

1. Use an attendance claim with `claim_status` = `verified` or `adjusted`.
2. Run `award_available_points()` or refresh the dashboard as a signed-in user.
3. Confirm `app_points_ledger` has one `attendance_verified` row.
4. Run the award again.
5. Confirm no duplicate row is created for the same claim.

### Training points

1. Mark a training signup as `completed`.
2. Run `award_available_points()`.
3. Confirm one `training_completed` row exists for that signup.
4. Re-run and confirm it is not duplicated.

### Referral points

1. Ensure Phase 24 migration is applied and at least one referral has `status = accepted`.
2. Run `award_available_points()`.
3. Confirm one `referral_accepted` row exists for the referrer.
4. Re-run and confirm it is not duplicated.

### Achievements

1. Create enough points to cross 1, 20, 50, or 100 points.
2. Confirm matching rows appear in `app_user_achievements`.
3. Confirm dashboard achievement chips render.

### Admin summary

1. Sign in as admin.
2. Open Dashboard → Admin.
3. Confirm the Points summary card appears.
4. Confirm volunteers are sorted by total points.

## Current limitations

- No admin adjustment UI yet, even though `admin_adjustment` is reserved in the ledger.
- No leaderboard page yet.
- No points notifications yet.
- Award rules are hard-coded in SQL for the pilot.
- Award backfill currently runs from the frontend by calling `award_available_points()`; a scheduled Supabase Edge Function or cron job would be cleaner for production.
- Referral conversion is not distinct from accepted referral yet.

## Roadmap impact

- Phase 26 reporting should include points and achievement exports.
- Phase 27 audit UI should include points ledger visibility.
- Phase 28 notification polish should include achievement and points notifications.
- Phase 31 admin UX refinement should add a dedicated points/achievements admin page and adjustment workflow.
- Phase 32 QA should include idempotency tests for attendance, training, and referral awards.
- Phase 33 production readiness should consider scheduled/server-side backfill instead of frontend-triggered award runs.

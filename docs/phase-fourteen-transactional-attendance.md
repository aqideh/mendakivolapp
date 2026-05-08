# Phase 14: Transactional attendance verification

Phase 14 moves admin attendance review from several loosely coupled frontend writes into a single Supabase transaction.

## Implemented scope

- Added `db/phase-fourteen-transactional-attendance.sql`.
- Added `review_attendance_claim_transactional(claim_id, action, verified_hours, admin_notes)`.
- The RPC verifies the current user is an `admin` or `super_admin`.
- The RPC locks and updates the attendance claim.
- For verified/adjusted claims, the RPC also updates the linked opportunity sign-up to `completed` and records verified hours.
- The RPC creates or updates the related attendance notification in the same database transaction.
- The frontend attendance sync adapter now attempts to use the transactional RPC for admin attendance reviews.
- If the RPC is unavailable because the migration has not been run, the frontend falls back to the existing direct attendance save path.

## Supabase setup

Run the migration after the previous phase migrations:

1. `db/phase-one-schema.sql`
2. `db/phase-eight-supabase-signups.sql`
3. `db/phase-nine-supabase-attendance.sql`
4. `db/phase-ten-supabase-training.sql`
5. `db/phase-eleven-supabase-content.sql`
6. `db/phase-twelve-supabase-notifications.sql`
7. `db/phase-thirteen-attendance-code-validation.sql`
8. `db/phase-fourteen-transactional-attendance.sql`

## Admin workflow

1. Admin reviews an attendance claim.
2. Admin chooses Verify, Adjust, Clarify, or Reject.
3. The frontend calls `review_attendance_claim_transactional`.
4. Supabase updates the attendance claim, related opportunity sign-up, and notification together.
5. The frontend reloads attendance claims, sign-ups, and notifications.

## Notes and limitations

- This phase covers attendance review only. Opportunity sign-up status review and training completion are still separate frontend-driven writes.
- Notification generation for attendance review is now transactional, but other lifecycle notification flows should eventually be moved into RPCs too.
- The local fallback remains for development and migration-not-run situations, but production should rely on the RPC path.

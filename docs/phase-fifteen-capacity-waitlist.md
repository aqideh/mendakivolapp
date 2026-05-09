# Phase 15: Capacity and waitlist enforcement

Phase 15 adds Supabase-backed capacity fields and capacity-aware opportunity sign-up/review flows.

## Implemented scope

- Added `db/phase-fifteen-capacity-waitlist.sql`.
- Added `capacity` and `waitlist_enabled` to `app_opportunities`.
- Added `app_opportunity_confirmed_count(opportunity_id)` helper.
- Added `create_opportunity_signup_with_capacity(signup_id, opportunity_id, volunteer_name)`.
- Added `review_opportunity_signup_with_capacity(signup_id, status, admin_notes)`.
- Updated Supabase opportunity loading to include capacity and waitlist settings.
- Updated Supabase opportunity saving to persist capacity and waitlist settings.
- Updated volunteer sign-up persistence to try the capacity-aware RPC when Supabase is active.
- Updated admin sign-up review persistence to try the capacity-aware RPC when Supabase is active.
- Added `Capacity` and `Enable waitlist when full` controls to the in-app admin opportunity create/edit form.

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
9. `db/phase-fifteen-capacity-waitlist.sql`

## Admin workflow

1. Sign in as an admin.
2. Go to `Dashboard -> Admin -> Admin content management`.
3. Choose `Opportunities`.
4. Create or edit an opportunity.
5. Set `Capacity`.
   - `0` means unlimited.
   - Any positive number is the maximum confirmed/completed volunteer count.
6. Enable or disable waitlist.
7. Save.

## Volunteer workflow

1. Volunteer signs in.
2. Volunteer signs up for an opportunity.
3. Supabase checks current confirmed/completed count against capacity.
4. If capacity is unlimited or not full, the sign-up remains `pending_review`.
5. If full and waitlist is enabled, the sign-up becomes `waitlisted`.
6. If full and waitlist is disabled, the sign-up becomes `declined`.

## Admin review workflow

When an admin tries to confirm a sign-up:

- If capacity is available, the sign-up is confirmed.
- If capacity is full and waitlist is enabled, the sign-up is kept/changed to waitlisted.
- If capacity is full and waitlist is disabled, the sign-up is declined.

## Notes and limitations

- This phase enforces opportunity-level capacity, not structured session-level capacity.
- Automatic promotion from waitlist when a confirmed volunteer cancels is not yet implemented.
- A future phase should move this to structured opportunity sessions with `startsAt`, `endsAt`, `defaultHours`, and session-specific capacity.

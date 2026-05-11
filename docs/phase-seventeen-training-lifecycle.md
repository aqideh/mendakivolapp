# Phase 17: Training lifecycle and capacity enforcement

Phase 17 extends training beyond simple open registration by adding waitlist/decline/no-show lifecycle states, capacity-aware registration, and admin-controlled training status updates.

## Implemented scope

- Added `db/phase-seventeen-training-lifecycle.sql`.
- Extended `training_signup_status` with:
  - `waitlisted`
  - `declined`
  - `no_show`
- Added `waitlist_enabled` to `app_training_sessions`.
- Added `app_training_registered_count(training_id)`.
- Added `create_training_signup_with_capacity(signup_id, training_id, volunteer_name)`.
- Added `review_training_signup_lifecycle(signup_id, status, admin_notes)`.
- Updated Supabase training session loading/saving to include waitlist settings.
- Updated volunteer training signup persistence to use the capacity-aware RPC when available.
- Updated admin training review persistence to use the lifecycle RPC when available.
- Updated dashboard admin training controls to support:
  - Confirm
  - Waitlist
  - Complete
  - No-show
  - Decline
- Added waitlist control to the admin training create/edit form.

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
10. `db/phase-sixteen-structured-opportunity-fields.sql`
11. `db/phase-seventeen-training-lifecycle.sql`

## Volunteer workflow

1. Volunteer signs in.
2. Volunteer signs up for a training session.
3. If capacity is available, status becomes `registered`.
4. If full and waitlist is enabled, status becomes `waitlisted`.
5. If full and waitlist is disabled, status becomes `declined`.

## Admin workflow

1. Admin opens the dashboard.
2. Admin reviews active training registrations.
3. Admin can confirm, waitlist, complete, mark no-show, or decline a training sign-up.
4. Supabase records the review state and sends the relevant lifecycle notification.

## Notes and limitations

- Automatic waitlist promotion is not implemented yet.
- Admin notes are supported in the RPC but the current UI does not yet expose a note field for each training lifecycle action.
- Training still uses a session-level table, not a reusable course catalogue plus session instances.

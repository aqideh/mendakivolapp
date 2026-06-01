# Phase 13: Real attendance-code validation

Phase 13 replaces simple 4-digit format checking with Supabase-backed facilitator-code validation for volunteer attendance check-in and check-out.

## Implemented scope

- Added `db/phase-thirteen-attendance-code-validation.sql`.
- Added `app_attendance_codes` to store active facilitator codes by opportunity.
- Added `validate_attendance_code(opportunity_id, code)` as a SECURITY DEFINER RPC so volunteers can validate a code without direct read access to the code table.
- Added `upsert_attendance_code(opportunity_id, code, label)` as an admin-only RPC for setting an opportunity's active facilitator code.
- Added `assets/attendance-code-validation.js`.
- Loaded the attendance-code validation adapter before `phase-three-attendance.js`.
- Updated check-in/check-out behaviour so the app validates the code before recording the attendance timestamp.
- Invalid facilitator codes now block check-in/check-out.
- Added a facilitator-code field to the in-app admin opportunity create/edit form.

## Supabase setup

Run the migration after the previous phase migrations:

1. `db/phase-one-schema.sql`
2. `db/phase-eight-supabase-signups.sql`
3. `db/phase-nine-supabase-attendance.sql`
4. `db/phase-ten-supabase-training.sql`
5. `db/phase-eleven-supabase-content.sql`
6. `db/phase-twelve-supabase-notifications.sql`
7. `db/phase-thirteen-attendance-code-validation.sql`

## Admin workflow

1. Sign in as an admin.
2. Go to `Dashboard -> Admin -> Admin content management`.
3. Choose `Opportunities`.
4. Create or edit an opportunity.
5. Enter a 4-digit facilitator attendance code.
6. Save.

The code is stored in `app_attendance_codes` and linked to the opportunity ID.

## Volunteer workflow

1. Volunteer signs in.
2. Volunteer opens `Dashboard -> My attendance`.
3. Volunteer taps `Check in` or `Check out`.
4. Volunteer enters the 4-digit facilitator code.
5. The app calls `validate_attendance_code`.
6. If valid, the timestamp is recorded.
7. If invalid, the app blocks the check-in/check-out and asks the volunteer to check with the facilitator.

## Notes and limitations

- Current implementation stores codes as 4-digit text. This is acceptable for the current controlled prototype but can be hardened later with hashed codes or rotating session-specific codes.
- The current model stores one or more codes per opportunity, not per structured session. Once structured opportunity sessions are implemented, codes should move from opportunity-level to session-level.
- Demo seed codes are inserted as `1234` for current opportunities. Replace them from the admin dashboard before realistic testing.
- Invalid-code attempts are not yet logged. That remains part of the future audit/reporting scope.

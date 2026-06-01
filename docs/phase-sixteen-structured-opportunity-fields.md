# Phase 16: Structured opportunity/session fields

Phase 16 adds structured opportunity fields so the app no longer has to rely only on display text such as `One-time, ~4 hrs` or `Weekends, ~2 hrs/session` for core operational logic.

## Implemented scope

- Added `db/phase-sixteen-structured-opportunity-fields.sql`.
- Added structured fields to `app_opportunities`:
  - `default_hours`
  - `starts_at`
  - `ends_at`
- Added an index on `starts_at`.
- Backfilled default hours for seeded opportunities.
- Updated the capacity-aware volunteer sign-up RPC so new sign-ups copy `default_hours` into the sign-up `hours` field.
- Updated Supabase opportunity loading/saving to include:
  - `defaultHours`
  - `startsAt`
  - `endsAt`
- Updated the in-app admin opportunity form to manage:
  - Default hours
  - Start date/time
  - End date/time
- Kept existing display fields:
  - `time`
  - `commitment`

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

## Admin workflow

1. Sign in as an admin.
2. Go to `Dashboard -> Admin -> Admin content management`.
3. Choose `Opportunities`.
4. Create or edit an opportunity.
5. Set:
   - `Default hours`
   - `Start date/time`
   - `End date/time`
6. Keep `Display time` and `Display commitment` as human-readable labels for cards and detail views.

## Notes and limitations

- The fields are still stored at opportunity level, not in a separate `opportunity_sessions` table.
- The current attendance flow still calculates actual hours from check-in/check-out timestamps. `default_hours` is used as structured opportunity metadata and copied into sign-up records.
- A later phase should move to true session records with per-session capacity, start/end times, facilitator code, and default hours.

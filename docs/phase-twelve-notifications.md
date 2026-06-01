# Phase 12: Notification system

Phase 12 adds a Supabase-backed notification layer and a top-right notification bell to the MENDAKI Volunteer Hub.

## Implemented scope

- Added `db/phase-twelve-supabase-notifications.sql`.
- Added `app_notifications` for persisted notification records.
- Added RLS policies so users can read/update their own notifications and admins can read/update admin-task notifications.
- Added `assets/notifications.js`.
- Added `assets/notifications.css`.
- Loaded the notification assets from `index.html`.
- Added a top-right bell icon in the app header after sign-in.
- Bell is grey/inactive when there are no unread notifications.
- When there are no notifications and the bell is tapped, the app shows `No new notifications`.
- When unread notifications exist, the bell shows a red count bubble.
- Added a notification dropdown with recent notifications and a `Mark all read` action.

## Notification sources

Volunteer lifecycle notifications are generated for:

- Opportunity confirmation.
- Opportunity waitlisting.
- Opportunity rejection/not selected.
- Opportunity completion after verified attendance.
- Attendance verification.
- Attendance adjustment.
- Attendance clarification request.
- Attendance rejection.
- Training completion.

Admin pending-task notifications are generated in the UI for:

- Opportunity sign-ups pending review.
- Attendance records awaiting verification.
- Training sign-ups that may need completion review.

## Supabase setup

Run the migration after the previous phase migrations:

1. `db/phase-one-schema.sql`
2. `db/phase-eight-supabase-signups.sql`
3. `db/phase-nine-supabase-attendance.sql`
4. `db/phase-ten-supabase-training.sql`
5. `db/phase-eleven-supabase-content.sql`
6. `db/phase-twelve-supabase-notifications.sql`

## Notes and limitations

- Notifications are currently created by frontend lifecycle hooks after key user/admin actions.
- Admin pending-task notifications are computed from current dashboard data and displayed in the bell; they are not yet persisted as durable task records.
- A future transactional phase should move lifecycle notification generation into database functions/RPC calls so the data update and notification creation happen together.

# Volunteer Management Expansion Foundation

This branch introduces the first five expansion layers for the MENDAKI Volunteer Hub. It keeps the current public volunteer listing intact while preparing the app for a database-backed volunteer management system.

## Phase 1 scope included

- Volunteer dashboard route and navigation.
- Sign-in/profile shell using local browser storage for demo purposes.
- Volunteer profile form.
- Placeholder dashboard statistics for verified hours, upcoming sign-ups, and completed opportunities.
- PostgreSQL/Supabase-ready schema in `db/phase-one-schema.sql`.
- Role model with only `volunteer`, `admin`, and `super_admin`.

## Phase 2 scope included

- Opportunity sign-up flow from the existing opportunity detail modal.
- Sign-up cancellation flow.
- Dashboard sections for active sign-ups and attendance preview.
- Dashboard statistics now update from local sign-up records.
- Registration now stays inside the app shell instead of only linking out to an external form.
- Sign-up lifecycle terminology: `Pending review`, `Confirmed`, `Waitlisted`, `Not selected`, `Cancelled`, and `Completed`.
- Admin sign-up review queue to confirm, waitlist, or decline opportunity sign-ups.

## Phase 3 scope included

- Volunteer attendance check-in/check-out from the dashboard.
- A single attendance button per confirmed sign-up that changes from `Check in` to `Check out` after check-in.
- 4-digit facilitator code prompt for both check-in and check-out.
- Automatic timestamp capture for check-in and check-out.
- Automatic volunteering-hours calculation from the elapsed time between both timestamps.
- Admin verification queue for completed check-out records.
- Admin review actions: verify, adjust, request clarification, and reject.
- Verified/adjusted attendance updates official completed opportunity count and verified hours.

## Phase 4 scope included

- Training page and navigation.
- Training catalogue data in `content/data.json`.
- CMS schema support for maintaining training sessions.
- Training sign-up and cancellation flow.
- Volunteer dashboard training status.
- Admin training completion queue.

## Phase 5 foundation scope included

- Shared demo data access layer in `assets/data-store.js`.
- Session, profile, opportunity sign-up, attendance, and training modules now access demo persistence through `VolunteerDataStore`.
- Direct feature-module dependency on browser storage keys has been reduced so a future backend adapter can replace the local demo implementation in one place.

## Scope intentionally not included yet

- Production authentication.
- Database connection.
- Capacity and waitlist enforcement.
- Testimonial request workflow.
- Calendar view.
- Production audit logs and notification emails.

These are intended for later phases once the database and auth provider are selected.

## Authentication and data access approach

The current implementation uses `VolunteerDataStore`, backed by `localStorage`, so the dashboard, sign-up, attendance, and training UX can be reviewed without a backend. The UI modules should continue to call the data store instead of directly reading/writing browser storage.

The current local demo keys are centralised in `assets/data-store.js`:

- `mendaki.volunteer.session.v1`
- `mendaki.volunteer.profile.v1`
- `mendaki.volunteer.signups.v1`
- `mendaki.volunteer.attendance.v1`
- `mendaki.volunteer.trainingSignups.v1`

These are not secure and should not be treated as real authentication or durable production data. Before production, replace the data store internals with backend calls and replace demo sign-in with one of the following:

- Supabase Auth.
- Organisation SSO.
- Auth0 or another identity provider.

## Role model

The app should use this role model:

| Role | Purpose |
| --- | --- |
| volunteer | Signs up, maintains profile, checks in/out for attendance, signs up for training, requests testimonials. |
| admin | Manages opportunities, sign-up confirmation, training, attendance validation, testimonials, and reports. |
| super_admin | Manages users, roles, system settings, and full audit access. |

There is no facilitator role in the app. Facilitators only provide the 4-digit attendance code at the physical volunteering opportunity; admins verify and validate submitted attendance records.

For the local demo, an admin view can be reached by signing in with an email that starts with `admin@` or contains `+admin@`. Production should use a real role claim from the auth provider/database.

## Sign-up model

Phase 2 records local opportunity sign-ups with enough shape to map onto `opportunity_signups` later:

- `opportunityId`
- `email`
- `volunteerName`
- `title`
- `type`
- `category`
- `time`
- `location`
- `commitment`
- `hours`
- `status`
- `signedUpAt`
- `reviewedAt`
- `reviewedBy`
- `confirmedAt`
- `waitlistedAt`
- `declinedAt`
- `cancelledAt`
- `completedAt`
- `verifiedHours`

Status terms:

| Internal status | UI term | Meaning |
| --- | --- | --- |
| pending_review | Pending review | Volunteer has signed up but has not been accepted yet. |
| confirmed | Confirmed | Admin accepted the volunteer for the opportunity. |
| waitlisted | Waitlisted | Volunteer is queued because a slot is not yet available. |
| declined | Not selected | Admin did not accept the volunteer for the opportunity. |
| cancelled | Cancelled | Volunteer withdrew or the sign-up was removed. |
| completed | Completed | Attendance has been verified. |

Only confirmed sign-ups are eligible for check-in/check-out. Completed sign-ups appear only after verified or adjusted attendance.

## Attendance model

Phase 3 uses a check-in/check-out + admin validation model:

1. Volunteer signs up for an opportunity.
2. Admin confirms the sign-up.
3. Volunteer arrives at the opportunity and taps `Check in`.
4. Volunteer enters the 4-digit facilitator code.
5. The system records the check-in timestamp and changes the button to `Check out`.
6. Volunteer taps `Check out` when leaving.
7. Volunteer enters the 4-digit facilitator code again.
8. The system records the check-out timestamp and calculates logged hours from the time difference.
9. The record is stored as `submitted` for admin verification.
10. Admin verifies, adjusts, rejects, or requests clarification.
11. Only `verified` or `adjusted` records contribute to official dashboard statistics and testimonials.

For production, attendance codes should be stored and compared as hashes, not plaintext.

## Training model

Phase 4 records local training sign-ups with enough shape to map onto `training_signups` later:

- `trainingId`
- `email`
- `volunteerName`
- `title`
- `date`
- `time`
- `location`
- `trainer`
- `status`
- `signedUpAt`
- `cancelledAt`
- `completedAt`

Training status is managed separately from volunteering hours. Admins mark registered training participants as completed. Completed training appears in the volunteer dashboard.

## Recommended next phase

The next highest-priority phase should replace demo admin detection and implement production-ready role checks:

1. Choose the auth provider.
2. Map authenticated users to `app_users` rows.
3. Replace email-pattern admin detection with backend role claims.
4. Restrict admin-only actions to real `admin` and `super_admin` roles.
5. Keep `VolunteerDataStore` as the single interface that the UI calls.

Before production:

1. Configure Supabase project and environment variables.
2. Run `db/phase-one-schema.sql`.
3. Replace `VolunteerDataStore` local methods with Supabase-backed methods.
4. Replace JSON opportunity/training loading with database reads while keeping JSON fallback until migration is complete.
5. Write opportunity sign-ups, attendance records, and training sign-ups to the database instead of local storage.
6. Restrict admin actions to real admin/super_admin users through database policies.

# Volunteer Management Expansion Foundation

This branch introduces the first three expansion layers for the MENDAKI Volunteer Hub. It keeps the current public volunteer listing intact while preparing the app for a database-backed volunteer management system.

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
- Local sign-up persistence using `localStorage` for demo purposes.
- Dashboard sections for active sign-ups and attendance preview.
- Dashboard statistics now update from local sign-up records.
- Registration now stays inside the app shell instead of only linking out to an external form.

## Phase 3 scope included

- Volunteer attendance self-reporting from the dashboard.
- Attendance claim creation with claimed status, claimed hours, start/end time, and volunteer notes.
- Admin verification queue for submitted attendance claims.
- Admin review actions: verify, adjust, request clarification, and reject.
- Verified/adjusted attendance updates official completed opportunity count and verified hours.
- Local attendance claim persistence using `localStorage` for demo purposes.

## Scope intentionally not included yet

- Production authentication.
- Database connection.
- Capacity and waitlist enforcement.
- Training sign-ups.
- Testimonial request workflow.
- Calendar view.
- Production audit logs and notification emails.

These are intended for later phases once the database and auth provider are selected.

## Authentication approach

The current implementation uses `localStorage` so the dashboard, sign-up, and attendance UX can be reviewed without a backend. This should be replaced before production with one of the following:

- Supabase Auth.
- Organisation SSO.
- Auth0 or another identity provider.

The local session/profile/sign-up/attendance keys are:

- `mendaki.volunteer.session.v1`
- `mendaki.volunteer.profile.v1`
- `mendaki.volunteer.signups.v1`
- `mendaki.volunteer.attendance.v1`

These are not secure and should not be treated as real authentication or durable production data.

## Role model

The app should use this role model:

| Role | Purpose |
| --- | --- |
| volunteer | Signs up, maintains profile, self-reports attendance, requests testimonials. |
| admin | Manages opportunities, training, attendance validation, testimonials, and reports. |
| super_admin | Manages users, roles, system settings, and full audit access. |

There is no facilitator role. Volunteers self-report attendance; admins verify and validate submitted claims.

For the local demo, an admin view can be reached by signing in with an email that starts with `admin@` or contains `+admin@`. Production should use a real role claim from the auth provider/database.

## Sign-up model

Phase 2 records local sign-ups with enough shape to map onto `opportunity_signups` later:

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
- `cancelledAt`
- `completedAt`
- `verifiedHours`

When a database is connected, local sign-up records should be replaced with rows in `opportunity_signups` tied to the authenticated volunteer user.

## Attendance model

Phase 3 uses a self-report + admin validation model:

1. Volunteer signs up for an opportunity.
2. Volunteer submits attendance from the dashboard.
3. The claim is stored as `submitted`.
4. Admin reviews the claim.
5. Admin verifies, adjusts, rejects, or requests clarification.
6. Only `verified` or `adjusted` claims contribute to official dashboard statistics and testimonials.

The local claim shape maps to the `attendance_claims` table in `db/phase-one-schema.sql`:

- `signupId`
- `opportunityId`
- `email`
- `volunteerName`
- `title`
- `claimedStatus`
- `claimStatus`
- `claimedStart`
- `claimedEnd`
- `claimedHours`
- `volunteerNotes`
- `verifiedHours`
- `adminNotes`
- `reviewedBy`
- `reviewedAt`

The schema separates claimed hours and verified hours intentionally.

## Recommended next phase

Phase 4 should focus on training:

1. Add training listing and detail pages.
2. Add training sign-up and cancellation.
3. Add training completion records.
4. Link required training to opportunity categories where relevant.
5. Show completed training in the volunteer dashboard.

Before production, replace the current local storage layer with real backend calls:

1. Configure Supabase project and environment variables.
2. Run `db/phase-one-schema.sql`.
3. Replace `assets/phase-one-auth.js` local session functions with Supabase Auth calls.
4. Replace JSON opportunity loading with database reads while keeping JSON fallback until migration is complete.
5. Write opportunity sign-ups and attendance claims to the database instead of local storage.
6. Restrict admin verification actions to real admin/super_admin users through database policies.

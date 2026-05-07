# Volunteer Management Expansion Foundation

This branch introduces the first two expansion layers for the MENDAKI Volunteer Hub. It keeps the current public volunteer listing intact while preparing the app for a database-backed volunteer management system.

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

## Scope intentionally not included yet

- Production authentication.
- Database connection.
- Capacity and waitlist enforcement.
- Volunteer attendance self-reporting UI.
- Admin attendance verification queue.
- Training sign-ups.
- Testimonial request workflow.
- Calendar view.

These are intended for later phases once the database and auth provider are selected.

## Authentication approach

The current implementation uses `localStorage` so the dashboard and sign-up UX can be reviewed without a backend. This should be replaced before production with one of the following:

- Supabase Auth.
- Organisation SSO.
- Auth0 or another identity provider.

The local session/profile/sign-up keys are:

- `mendaki.volunteer.session.v1`
- `mendaki.volunteer.profile.v1`
- `mendaki.volunteer.signups.v1`

These are not secure and should not be treated as real authentication or durable production data.

## Role model

The app should use this role model:

| Role | Purpose |
| --- | --- |
| volunteer | Signs up, maintains profile, self-reports attendance, requests testimonials. |
| admin | Manages opportunities, training, attendance validation, testimonials, and reports. |
| super_admin | Manages users, roles, system settings, and full audit access. |

There is no facilitator role. Volunteers will self-report attendance; admins verify and validate submitted claims.

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

When a database is connected, local sign-up records should be replaced with rows in `opportunity_signups` tied to the authenticated volunteer user.

## Attendance direction for later phases

Attendance should use a self-report + admin validation model:

1. Volunteer attends an opportunity.
2. Volunteer submits claimed attendance and claimed hours.
3. Admin reviews the claim.
4. Admin verifies, adjusts, rejects, or requests clarification.
5. Only verified or adjusted hours contribute to official dashboard statistics and testimonials.

The schema separates `claimed_hours` and `verified_hours` for this reason.

## Recommended next phase

Phase 3 should focus on attendance:

1. Add volunteer self-report attendance for completed sign-ups.
2. Create pending attendance claims.
3. Add admin verification queue.
4. Allow admin to verify, adjust, reject, or request clarification.
5. Update dashboard verified hours from verified attendance claims only.

Before production, replace the current local storage layer with real backend calls:

1. Configure Supabase project and environment variables.
2. Run `db/phase-one-schema.sql`.
3. Replace `assets/phase-one-auth.js` local session functions with Supabase Auth calls.
4. Replace JSON opportunity loading with database reads while keeping JSON fallback until migration is complete.
5. Write opportunity sign-ups to the database instead of local storage.

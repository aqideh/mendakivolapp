# Phase 1: Volunteer Management Foundation

This branch introduces the first expansion layer for the MENDAKI Volunteer Hub. It keeps the current public volunteer listing intact while preparing the app for a database-backed volunteer management system.

## Scope included

- Volunteer dashboard route and navigation.
- Sign-in/profile shell using local browser storage for demo purposes.
- Volunteer profile form.
- Placeholder dashboard statistics for verified hours, upcoming sign-ups, and completed opportunities.
- PostgreSQL/Supabase-ready schema in `db/phase-one-schema.sql`.
- Role model with only `volunteer`, `admin`, and `super_admin`.

## Scope intentionally not included yet

- Production authentication.
- Database connection.
- Real opportunity sign-ups.
- Volunteer attendance self-reporting UI.
- Admin attendance verification queue.
- Training sign-ups.
- Testimonial request workflow.
- Calendar view.

These are intended for later phases once the database and auth provider are selected.

## Authentication approach

Phase 1 uses `localStorage` so the dashboard UX can be reviewed without a backend. This should be replaced before production with one of the following:

- Supabase Auth.
- Organisation SSO.
- Auth0 or another identity provider.

The local session keys are:

- `mendaki.volunteer.session.v1`
- `mendaki.volunteer.profile.v1`

These are not secure and should not be treated as real authentication.

## Role model

The app should use this role model:

| Role | Purpose |
| --- | --- |
| volunteer | Signs up, maintains profile, self-reports attendance, requests testimonials. |
| admin | Manages opportunities, training, attendance validation, testimonials, and reports. |
| super_admin | Manages users, roles, system settings, and full audit access. |

There is no facilitator role. Volunteers will self-report attendance; admins verify and validate submitted claims.

## Attendance direction for later phases

Attendance should use a self-report + admin validation model:

1. Volunteer attends an opportunity.
2. Volunteer submits claimed attendance and claimed hours.
3. Admin reviews the claim.
4. Admin verifies, adjusts, rejects, or requests clarification.
5. Only verified or adjusted hours contribute to official dashboard statistics and testimonials.

The schema separates `claimed_hours` and `verified_hours` for this reason.

## Recommended next phase

Phase 2 should connect the current shell to a backend:

1. Configure Supabase project and environment variables.
2. Run `db/phase-one-schema.sql`.
3. Replace `assets/phase-one-auth.js` local session functions with Supabase Auth calls.
4. Replace JSON opportunity loading with database reads while keeping JSON fallback until migration is complete.
5. Add opportunity sign-up records tied to the authenticated volunteer.

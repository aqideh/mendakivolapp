# Volunteer Management Expansion Foundation

This branch introduces the first six expansion layers for the MENDAKI Volunteer Hub. It keeps the current public volunteer listing intact while preparing the app for a database-backed volunteer management system.

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

## Phase 6 authentication foundation included

- Supabase browser client is loaded from the public CDN.
- `assets/supabase-config.example.js` documents the required project URL and public anon credential.
- `assets/supabase-config.js` is ignored by Git so local/project credentials are not committed.
- `VolunteerDataStore` now detects Supabase configuration and initialises Supabase Auth when configured.
- Sign-in uses Supabase magic links when Supabase is configured.
- If Supabase is not configured, the existing local demo sign-in flow remains active.
- App roles are read from the `app_users.role` row when an authenticated Supabase user is mapped to an app user.

## Supabase setup inputs required

Create `assets/supabase-config.js` from `assets/supabase-config.example.js` and provide:

1. Supabase project URL.
2. Supabase public anon credential.
3. Auth redirect URL for local/dev deployment.
4. Auth redirect URL for production deployment.
5. Decision on magic-link-only sign-in versus password or SSO later.
6. Initial admin user emails to seed in `app_users`.

## Scope intentionally not included yet

- Full database-backed sign-up, attendance, and training persistence.
- Capacity and waitlist enforcement.
- Testimonial request workflow.
- Calendar view.
- Production audit logs and notification emails.

## Authentication and data access approach

The current implementation uses `VolunteerDataStore`. In local demo mode, it is backed by `localStorage`. When Supabase is configured, the store initialises Supabase Auth and syncs the authenticated session into the app shell. The UI modules should continue to call the data store instead of directly reading/writing browser storage or Supabase.

The current local demo keys are centralised in `assets/data-store.js`:

- `mendaki.volunteer.session.v1`
- `mendaki.volunteer.profile.v1`
- `mendaki.volunteer.signups.v1`
- `mendaki.volunteer.attendance.v1`
- `mendaki.volunteer.trainingSignups.v1`

These local keys are not secure and should not be treated as real authentication or durable production data.

## Role model

The app should use this role model:

| Role | Purpose |
| --- | --- |
| volunteer | Signs up, maintains profile, checks in/out for attendance, signs up for training, requests testimonials. |
| admin | Manages opportunities, sign-up confirmation, training, attendance validation, testimonials, and reports. |
| super_admin | Manages users, roles, system settings, and full audit access. |

There is no facilitator role in the app. Facilitators only provide the 4-digit attendance code at the physical volunteering opportunity; admins verify and validate submitted attendance records.

In local demo mode only, an admin view can still be reached by signing in with an email that starts with `admin@` or contains `+admin@`. When Supabase is configured, admin access should come from the `app_users.role` field, not the email-pattern fallback.

## Recommended next phase

The next highest-priority phase should finish production role setup:

1. Run `db/phase-one-schema.sql` in Supabase.
2. Add an auth trigger or onboarding flow to create `app_users` records for new Supabase users.
3. Seed initial `admin` and `super_admin` rows.
4. Confirm Row Level Security policies for volunteer and admin access.
5. Replace local sign-up/attendance/training persistence with Supabase-backed methods inside `VolunteerDataStore`.

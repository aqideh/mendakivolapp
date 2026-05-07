# Volunteer Management Expansion Foundation

This branch introduces the first six expansion layers for the MENDAKI Volunteer Hub. It keeps the current public volunteer listing intact while preparing the app for a database-backed volunteer management system.

## Phase 6 authentication foundation included

- Supabase browser client is loaded from the public CDN.
- `assets/supabase-config.js` contains the GitHub Pages Supabase browser configuration.
- `VolunteerDataStore` now detects Supabase configuration and initialises Supabase Auth when configured.
- Sign-in uses Supabase email/password when Supabase is configured.
- If Supabase is not configured, the existing local demo sign-in flow remains active.
- App roles are read from the `app_users.role` row when an authenticated Supabase user is mapped to an app user.
- First successful Supabase sign-in attempts to create a matching `app_users` row with role `volunteer` if one does not already exist.

## GitHub Pages Supabase configuration

Current GitHub Pages auth redirect target:

```text
https://aqideh.github.io/mendakivolapp/
```

Supabase URL configuration should include this URL in:

- Site URL
- Redirect URLs / additional redirect URLs

## Supabase test user

Create the test user in Supabase Dashboard under Authentication → Users:

- Email: `volunteer@mendaki.org.sg`
- Role in app: `volunteer`

Do not commit or document the test user's password in repository files. Set it only inside Supabase Auth.

## Role model

| Role | Purpose |
| --- | --- |
| volunteer | Signs up, maintains profile, checks in/out for attendance, signs up for training, requests testimonials. |
| admin | Manages opportunities, sign-up confirmation, training, attendance validation, testimonials, and reports. |
| super_admin | Manages users, roles, system settings, and full audit access. |

There is no facilitator role in the app. Facilitators only provide the 4-digit attendance code at the physical volunteering opportunity; admins verify and validate submitted attendance records.

In local demo mode only, an admin view can still be reached by signing in with an email that starts with `admin@` or contains `+admin@`. When Supabase is configured, admin access should come from the `app_users.role` field, not the email-pattern fallback.

## Current local demo keys

The following keys remain in `VolunteerDataStore` while sign-up, attendance, and training persistence are still local-demo backed:

- `mendaki.volunteer.session.v1`
- `mendaki.volunteer.profile.v1`
- `mendaki.volunteer.signups.v1`
- `mendaki.volunteer.attendance.v1`
- `mendaki.volunteer.trainingSignups.v1`

These local keys are not secure and should not be treated as durable production data.

## Recommended next phase

The next highest-priority phase should finish production role setup:

1. Run `db/phase-one-schema.sql` in Supabase.
2. Create the Supabase Auth test user.
3. Confirm that first sign-in creates or maps an `app_users` row.
4. Seed any future `admin` and `super_admin` rows.
5. Confirm Row Level Security policies for volunteer and admin access.
6. Replace local sign-up/attendance/training persistence with Supabase-backed methods inside `VolunteerDataStore`.

## Remaining major scopes

- Full database-backed sign-up, attendance, and training persistence.
- Real attendance-code validation.
- Transactional attendance verification.
- Capacity and waitlist enforcement.
- Testimonial request workflow.
- Calendar view.
- Production audit logs and notification emails.

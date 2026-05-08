# Volunteer Management Expansion Foundation

This branch introduces the first ten expansion layers for the MENDAKI Volunteer Hub. It keeps CMS-managed public content intact while moving opportunity, attendance, and training lifecycle data towards Supabase-backed shared persistence.

## Completed phases

### Phase 1: Dashboard foundation

- Volunteer dashboard route and navigation.
- Sign-in/profile shell.
- Volunteer profile form.
- Dashboard statistics for verified hours, upcoming confirmed opportunities, and completed opportunities.
- PostgreSQL/Supabase-ready schema in `db/phase-one-schema.sql`.
- Role model with `volunteer`, `admin`, and `super_admin`.

### Phase 2: In-app opportunity sign-ups

- Opportunity sign-up flow inside the app.
- Sign-up cancellation flow.
- Volunteer dashboard sections for active and completed opportunities.
- Admin sign-up review queue for confirming, waitlisting, or declining volunteers.
- Lifecycle terms: `Sign up`, `Pending review`, `Confirmed`, `Waitlisted`, `Not selected`, `Cancelled`, and `Completed`.

### Phase 3: Attendance check-in/check-out

- Volunteer check-in/check-out for confirmed sign-ups.
- Single attendance button that changes from `Check in` to `Check out`.
- 4-digit facilitator code prompt for both check-in and check-out.
- Timestamp capture and elapsed-hours calculation.
- Admin attendance verification queue.
- Admin verification, adjustment, clarification, and rejection flows.

### Phase 4: Training module

- Training page and navigation.
- Training session listing.
- Training sign-up and cancellation flow.
- Volunteer dashboard training status.
- Admin training completion queue.

### Phase 5: Data access layer

- Shared demo data access layer in `assets/data-store.js`.
- Session, profile, opportunity sign-up, attendance, and training modules use `VolunteerDataStore`.
- Direct feature-module dependency on browser storage keys has been reduced so a future backend adapter can replace the local demo implementation in one place.

### Phase 6: Supabase authentication and roles

- Supabase browser client is loaded from the public CDN.
- `assets/supabase-config.js` contains the GitHub Pages Supabase browser configuration.
- `VolunteerDataStore` detects Supabase configuration and initialises Supabase Auth when configured.
- Sign-in uses Supabase email/password when Supabase is configured.
- If Supabase is not configured, the existing local demo sign-in flow remains available.
- App roles are read from the `app_users.role` row when an authenticated Supabase user is mapped to an app user.
- First successful Supabase sign-in attempts to create a matching `app_users` row with role `volunteer` if one does not already exist.

### Phase 7: CMS content management

- CMS backend targets the `expansion` branch.
- CMS sections have been reorganised into clearer admin-facing groups:
  - `Manage Opportunities`
  - `Manage Training Sessions`
  - `News & Updates`
  - `Site Settings`
- Volunteer opportunities are managed from `content/opportunities.json`.
- Training sessions are managed from `content/trainings.json`.
- News items are managed from `content/news.json`.
- General site settings and about-page content remain in `content/data.json`.
- Opportunity and training status fields use dropdowns instead of free text.
- CMS fields have clearer labels, ordering, and hints for admin users.
- The public app loads opportunities and training sessions from the dedicated CMS files, with fallbacks to the legacy arrays in `content/data.json`.

### Phase 8: Supabase-backed opportunities and sign-ups

- Added `db/phase-eight-supabase-signups.sql` for shared opportunity and sign-up persistence.
- Added `app_opportunities` as a Supabase-readable opportunity table seeded from the current CMS opportunity list.
- Added `app_opportunity_signups` as the shared sign-up lifecycle table.
- Added RLS policies so volunteers can read/write their own sign-ups while admins and super admins can review all sign-ups.
- Added `assets/phase-eight-supabase.js` as the adapter layer between the existing local demo UI and Supabase tables.
- Opportunity sign-up, cancellation, admin confirm, admin waitlist, and admin decline actions are now mirrored to Supabase when Supabase is configured.
- On sign-in/auth refresh, opportunity sign-ups are loaded from Supabase and cached locally so existing dashboard, attendance, and lifecycle UI continues to render.
- Public opportunity listings can load from Supabase `app_opportunities`; if the Supabase table is empty or unavailable, the app keeps using CMS JSON content as a fallback.

### Phase 9: Supabase-backed attendance

- Added `db/phase-nine-supabase-attendance.sql` for shared attendance claim persistence.
- Added `app_attendance_claims` to store check-in/check-out timestamps, entered facilitator codes, system-calculated hours, verified hours, admin notes, and review status.
- Added RLS policies so volunteers can read/write their own attendance claims while admins and super admins can review all attendance claims.
- Added `assets/phase-nine-attendance-sync.js` as the adapter layer between the existing attendance UI and Supabase.
- Volunteer check-in and check-out actions are now mirrored to Supabase when Supabase is configured.
- Admin attendance verification, adjustment, clarification, and rejection actions are now mirrored to Supabase when Supabase is configured.
- On sign-in/auth refresh, attendance claims are loaded from Supabase and cached locally so the existing dashboard and attendance UI continues to render.
- Local browser storage remains as cache/fallback storage if the migration has not been run or Supabase is unavailable.

### Phase 10: Supabase-backed training sign-ups

- Added `db/phase-ten-supabase-training.sql` for shared training-session and training-sign-up persistence.
- Added `app_training_sessions` as a Supabase-readable training-session table seeded from the current CMS training list.
- Added `app_training_signups` as the shared training registration and completion table.
- Added RLS policies so volunteers can read/write their own training registrations while admins and super admins can review all training sign-ups.
- Added `assets/phase-ten-training-sync.js` as the adapter layer between the existing training UI and Supabase tables.
- Training sign-up, cancellation, and admin mark-completed actions are now mirrored to Supabase when Supabase is configured.
- On sign-in/auth refresh, training sign-ups are loaded from Supabase and cached locally so the existing dashboard training UI continues to render.
- Public training listings can load from Supabase `app_training_sessions`; if the Supabase table is empty or unavailable, the app keeps using CMS JSON content as a fallback.

## CMS content map

| CMS section | File | Purpose |
| --- | --- | --- |
| Manage Opportunities | `content/opportunities.json` | Public opportunity cards and detail modals. |
| Manage Training Sessions | `content/trainings.json` | Public training catalogue and training sign-up flow. |
| News & Updates | `content/news.json` | News listing and home-page news cards. |
| Site Settings | `content/data.json` | Site title, hero copy, statistics, contact details, about page, pillars, and FAQ. |

## Supabase setup order

Run these scripts in order:

1. `db/phase-one-schema.sql`
2. `db/phase-eight-supabase-signups.sql`
3. `db/phase-nine-supabase-attendance.sql`
4. `db/phase-ten-supabase-training.sql`

Then create/map test users in `app_users` and verify RLS policies by signing in as both a volunteer and an admin.

## GitHub Pages Supabase configuration

Current GitHub Pages auth redirect target:

```text
https://aqideh.github.io/mendakivolapp/
```

Supabase URL configuration should include this URL in:

- Site URL
- Redirect URLs / additional redirect URLs

## Supabase test user

Create the test user in Supabase Dashboard under Authentication -> Users:

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

The following keys remain in `VolunteerDataStore` as cache/fallback storage:

- `mendaki.volunteer.session.v1`
- `mendaki.volunteer.profile.v1`
- `mendaki.volunteer.profile.<email>.v1`
- `mendaki.volunteer.signups.v1`
- `mendaki.volunteer.attendance.v1`
- `mendaki.volunteer.trainingSignups.v1`

These local keys are not secure and should not be treated as durable production data.

## Development roadmap

### Phase 11: Notification system

- Add a top-right bell icon to the app header.
- Show the bell in a grey/inactive state when there are no unread notifications.
- When the grey bell is tapped, show a small pop-up saying there are no new notifications.
- Show a red count bubble when there are unread notifications.
- Notify volunteers about status changes, including confirmations, waitlist decisions, attendance verification, training approvals/completion, rejections, and clarification requests.
- Notify admins about pending tasks, including sign-ups awaiting review, attendance awaiting verification, training completion awaiting review, and future testimonial requests.
- Store notifications in Supabase so read/unread state persists across devices and sessions.
- Keep notification generation tied to lifecycle changes rather than hard-coded UI events.

### Phase 12: Real attendance-code validation

- Generate or assign session-specific facilitator codes.
- Validate check-in/check-out codes against stored session codes instead of only checking for a 4-digit format.
- Record invalid-code attempts for admin review or audit.

### Phase 13: Transactional attendance verification

- Ensure attendance verification updates the attendance record, related sign-up status, verified hours, and notification records together.
- Prevent partial updates where attendance is verified but the sign-up remains confirmed.
- Move this logic into database functions or RPC calls where possible.

### Phase 14: Capacity and waitlist enforcement

- Add real opportunity/session capacity fields.
- Automatically place excess sign-ups on waitlist.
- Promote waitlisted volunteers when confirmed slots become available.

### Phase 15: Structured opportunity sessions

- Add structured fields such as `startsAt`, `endsAt`, `defaultHours`, capacity, location, and facilitator code.
- Stop deriving volunteering hours or schedule logic from display copy.
- Prepare opportunity data for calendar and reporting views.

### Phase 16: Testimonial request workflow

- Allow volunteers to request testimonials based on verified completed opportunities.
- Let admins review, approve, reject, or request clarification.
- Generate notification records for testimonial workflow changes.

### Phase 17: Calendar view

- Add calendar view of opportunities and training sessions.
- Use structured session dates instead of text-only schedule fields.
- Support volunteer-specific views for confirmed opportunities and registered training.

### Phase 18: Admin reporting and audit trail

- Add admin reports for sign-ups, attendance, verified hours, training completion, testimonials, and user actions.
- Add audit logs for lifecycle changes made by admins.
- Include export-ready views where useful.

### Phase 19: QA and release hardening

- Add validation coverage for core flows.
- Add smoke-test checklist for volunteer and admin journeys.
- Improve error states, loading states, and empty states.
- Update documentation before wider rollout.

## Recommended next phase

The next highest-priority phase is Phase 11: Notification system.

## Remaining major scopes

- Notification system.
- Real attendance-code validation.
- Transactional attendance verification.
- Capacity and waitlist enforcement.
- Testimonial request workflow.
- Calendar view.
- Production audit logs and notification emails.

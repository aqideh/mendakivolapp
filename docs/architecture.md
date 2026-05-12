# Architecture Notes

Last updated: 2026-05-11

## Canonical backend schema

For the current Supabase-backed Volunteer Hub build, the `app_*` tables are canonical.

Use these tables for new app development:

- `app_users`
- `app_opportunities`
- `app_opportunity_sessions`
- `app_opportunity_signups`
- `app_attendance_claims`
- `app_training_sessions`
- `app_training_signups`
- `app_notifications`
- `app_attendance_codes`
- `app_audit_logs`
- `app_referral_codes`
- `app_referrals`
- `app_points_ledger`
- `app_achievements`
- `app_user_achievements`
- `app_notification_preferences`

The older normalized tables are currently deprecated for frontend development unless a deliberate migration is planned:

- `opportunities`
- `opportunity_sessions`
- `opportunity_signups`
- `attendance_claims`
- `trainings`
- `training_signups`

These older tables may still exist in Supabase but should not be targeted by new features. Their presence previously made it easy to inspect the wrong table and conclude that the app had no records.

## Data access direction

The app historically used many independent browser modules that read and write local cache and Supabase directly. This caused timing and rendering issues, especially in admin queues.

A first-pass data access layer now exists at:

```text
assets/data-access.js
```

It exposes:

- `window.MENDAKIDataAccess.canonicalTables`
- `window.MENDAKIDataAccess.deprecatedTables`
- `window.MENDAKIDataAccess.listOpportunitySignups()`
- `window.MENDAKIDataAccess.listAttendanceClaims()`
- `window.MENDAKIDataAccess.listTrainingSignups()`
- `window.MENDAKIDataAccess.refreshOpportunitySignups()`
- `window.MENDAKIDataAccess.refreshAttendanceClaims()`
- `window.MENDAKIDataAccess.refreshAdminQueue(area)`
- `window.MENDAKIDataAccess.adminQueueCounts()`
- `window.MENDAKIDataAccess.snapshot(domain)`

This layer currently wraps existing `VolunteerDataStore` methods rather than replacing them. Future phases should move domain persistence logic into this layer and reduce direct local cache manipulation from UI modules.

## Immediate data-access refactor target

Admin queue flows should be migrated first because they are the highest-risk area:

1. Sign-up queue reads should use `MENDAKIDataAccess.listOpportunitySignups()`.
2. Attendance queue reads should use `MENDAKIDataAccess.listAttendanceClaims()`.
3. Admin shell counters should use `MENDAKIDataAccess.adminQueueCounts()`.
4. Admin queue refreshes should use `MENDAKIDataAccess.refreshAdminQueue(area)`.
5. Queue components should show loading/error state from `MENDAKIDataAccess.snapshot(domain)`.

## Future target shape

A mature data layer should eventually expose domain APIs such as:

```js
MENDAKIDataAccess.signups.list()
MENDAKIDataAccess.signups.refresh()
MENDAKIDataAccess.signups.reviewStatus(signupId, status, options)

MENDAKIDataAccess.attendance.list()
MENDAKIDataAccess.attendance.refresh()
MENDAKIDataAccess.attendance.requestClarification(claimId, message)
MENDAKIDataAccess.attendance.submitClarification(claimId, message)
MENDAKIDataAccess.attendance.verify(claimId, options)
```

For now, the flat wrapper is intentionally minimal to avoid destabilising existing working flows.

## Operational note

Supabase table comments have been added to identify the canonical `app_*` tables and flag the older normalized tables as deprecated/unused for the current frontend.

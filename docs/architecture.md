# Architecture Notes

Last updated: 2026-06-02

## Product source-of-truth boundary

The MENDAKI Volunteer Hub is a volunteer engagement hub. It is not the authoritative production system for volunteer opportunity sign-ups.

YM Hub/Salesforce is the target and production source of truth for volunteer opportunity sign-up creation, opportunity lifecycle state, final capacity decisions, final waitlist decisions, and official volunteer opportunity records.

Supabase is the current prototype backend for this repository. It supports UI development, pilot workflows, mock data access, and exploration, but it is not the final authority for volunteer opportunity sign-ups.

Read `docs/product-intent.md` before making product or architecture changes.

## Current prototype backend schema

The current app still contains Supabase `app_*` tables and data access code. Treat these as prototype infrastructure unless a future approved architecture says otherwise.

Current prototype tables include:

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

### Opportunity sign-up table status

`app_opportunity_signups` is not authoritative production data. It should be treated as:

- prototype/pilot infrastructure from an earlier implementation phase
- legacy sign-up state used by old in-app flows
- a possible future read-only mirror of Salesforce/YM Hub data if an approved integration needs it

Do not build new in-app volunteer opportunity sign-up creation against `app_opportunity_signups` unless explicitly instructed and the product-intent docs are updated.

### In-scope Supabase prototype areas

Supabase may continue to support app-owned or prototype features such as:

- app users and roles for pilot access
- training sessions and training registrations
- attendance support flows
- news items
- notifications
- referrals
- points and achievements
- audit logs for prototype/admin actions
- operational dashboards and non-authoritative reporting

Training registrations are separate from volunteer opportunity sign-ups and may remain in-app unless the product boundary changes.

## Deprecated older normalized tables

The older normalized tables remain deprecated for frontend development unless a deliberate migration is planned:

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

It exposes prototype-era APIs such as:

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

These names reflect the older prototype implementation. Do not infer product ownership from them.

Future data access work should preserve the source-of-truth boundary:

1. Opportunity CTAs should route to YM Hub/Salesforce.
2. Opportunity sign-up reads, if needed, should come from YM Hub/Salesforce or an approved read-only mirror.
3. Supabase opportunity sign-up writes should not be treated as production behavior.
4. Training, attendance support, referrals, gamification, news, and reporting may continue to use in-app data access where documented.

## Future target architecture

A mature production architecture should use YM Hub/Salesforce as the authoritative source for opportunity sign-up lifecycle data.

Possible target patterns:

- redirect-only volunteer opportunity CTAs to YM Hub/Salesforce
- read-only display of Salesforce/YM Hub opportunity status inside this app
- approved API integration that reads volunteer-specific opportunity status from YM Hub/Salesforce
- optional Supabase read-only mirror tables fed from Salesforce/YM Hub for UI performance, dashboards, or non-authoritative reporting

Any write-back to YM Hub/Salesforce must be explicitly approved and documented before implementation.

A mature in-app data layer may still expose domain APIs for app-owned areas, for example:

```js
MENDAKIDataAccess.training.listRegistrations()
MENDAKIDataAccess.attendance.listClaims()
MENDAKIDataAccess.referrals.list()
MENDAKIDataAccess.points.listLedger()
MENDAKIDataAccess.news.list()
```

For opportunity sign-ups, prefer names that make the external boundary explicit, for example:

```js
MENDAKIDataAccess.opportunities.redirectToYmHub(opportunityId)
MENDAKIDataAccess.opportunityStatus.listFromAuthoritativeSource()
```

## Operational note

Supabase table comments may still identify prototype `app_*` tables and deprecated normalized tables. Those comments should be updated over time to reflect this product boundary: Supabase is current prototype infrastructure, while YM Hub/Salesforce is the production authority for volunteer opportunity sign-ups.

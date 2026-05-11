# MENDAKI Volunteer Hub — Development Roadmap

Last updated: after Phase 33 production-readiness groundwork implementation.

## Current status

The app is a Supabase-backed pilot/beta volunteer management app. Sveltia CMS is deprecated as the production admin path. The authoritative admin path is:

```text
Signed-in app dashboard → Admin workspace / Admin content management
```

The current app includes:

- Supabase Auth.
- Dashboard and admin tools.
- Phase 31 admin workspace tabs and filtering.
- Phase 32 QA smoke-check panel and verification SQL.
- Phase 33 production-readiness verification SQL and runbook.
- Hierarchical opportunity/session editing.
- Session-specific opportunity signups.
- Session-aware attendance validation foundation.
- Phase 29.5 attendance session guard.
- Attendance review.
- Training lifecycle with Phase 30 training session parity foundation.
- Phase 31 training parent/session management UI.
- Referrals / invite friends.
- Points and achievements.
- Reports and browser CSV exports.
- Audit history UI.
- Notification history, preferences, grouping, and routing polish.
- Admin operations/warning cards.
- Deprecated Sveltia CMS path.

The app remains pilot/beta until manual QA, Auth console settings, and production policy decisions are completed.

## Recently completed phases

### Phase 24 — Referral / Invite Friends

Implemented Supabase-backed referrals:

- Referral code generation.
- Referral links using `?ref=CODE`.
- Pending referral capture before sign-in.
- Referral acceptance after sign-in.
- Volunteer referral history.
- Admin referral tracking card.
- Duplicate/self-referral prevention at database level.

Primary files:

```text
supabase/migrations/202605110001_phase_twenty_four_referrals.sql
assets/referrals.js
docs/phase-twenty-four-referrals.md
```

### Phase 25 — Gamification Backend

Implemented backend-first points and achievements:

- `app_points_ledger`.
- `app_achievements`.
- `app_user_achievements`.
- Points for verified attendance.
- Points for completed training.
- Points for accepted referrals.
- Default achievements.
- Volunteer points card.
- Admin points summary card.

Primary files:

```text
supabase/migrations/202605110002_phase_twenty_five_gamification.sql
assets/gamification.js
docs/phase-twenty-five-gamification.md
```

### Phase 26 — Reporting and CSV Exports

Implemented admin reports and browser CSV export:

- Volunteer hours.
- Attendance verification.
- Opportunity/session participation.
- Training completion.
- Referrals.
- Points and achievements.

Primary files:

```text
supabase/migrations/202605110003_phase_twenty_six_reports.sql
assets/reports.js
docs/phase-twenty-six-reporting.md
```

### Phase 27 — Audit History UI

Implemented admin audit history viewer:

- Canonical `app_audit_logs`.
- `record_app_audit_log(...)`.
- Admin audit search RPC.
- Filter options RPC.
- Dashboard audit history card.
- Filters by date, action, entity, actor, and target.
- Details drawer.
- Metadata JSON viewer.
- CSV export.

Primary files:

```text
supabase/migrations/202605110004_phase_twenty_seven_audit_ui.sql
assets/audit-history.js
docs/phase-twenty-seven-audit-history.md
```

### Phase 28 — Notification Polish

Implemented notification preferences, history, grouping, and improved routing:

- Persistent notification preferences.
- Notification history card.
- Mark one/all read.
- Clear one/all active notifications.
- Notification grouping via `group_key`.
- `create_app_notification(...)` RPC.
- Preference-aware in-app notification creation.
- Routing for referrals, points, and achievements.

Primary files:

```text
supabase/migrations/202605110005_phase_twenty_eight_notification_polish.sql
assets/notification-polish.js
assets/notifications.js
docs/phase-twenty-eight-notification-polish.md
```

### Phase 29 — Session-Aware Attendance Validation

Implemented session-level facilitator-code validation:

- `validate_session_attendance_code(...)`.
- `get_admin_session_code_warnings()`.
- Session facilitator-code validation.
- Opportunity-level fallback only when allowed.
- Frontend inference of `sessionId` from signup cache.
- Admin warning card for sessions missing facilitator codes.

Primary files:

```text
supabase/migrations/202605110006_phase_twenty_nine_session_attendance_validation.sql
assets/attendance-code-validation.js
assets/session-attendance-validation.js
docs/phase-twenty-nine-session-attendance-validation.md
```

### Phase 29.5 — Security and Session Contract Hardening

Implemented a focused hardening pass:

- Revoked anonymous execute access from sensitive RPC families.
- Kept authenticated execute access where current app flows require it.
- Preserved database-side admin checks for admin-only RPCs.
- Hardened `validate_session_attendance_code(...)` to require authentication.
- Added `get_phase_29_5_rpc_grant_audit()` for future grant verification.
- Added an attendance check-in/out guard that requires explicit session resolution before saving attendance.
- Documented smoke checks and remaining limitations.

Primary files:

```text
supabase/migrations/202605110007_phase_twenty_nine_five_security_session_hardening.sql
assets/phase-twenty-nine-five-hardening.js
docs/phase-twenty-nine-five-security-session-hardening.md
```

Verification performed:

```sql
select *
from public.get_phase_29_5_rpc_grant_audit()
where anon_can_execute = true;
```

Expected/current result: zero rows for the targeted Phase 29.5 RPC set.

### Phase 30 — Training Session Parity

Implemented a compatibility-safe training session foundation:

- Added parent/session fields to `app_training_sessions`.
- Added `training_session_id`, `session_title`, and `completed_session_at` to `app_training_signups`.
- Added session-aware training signup RPCs and helper functions.
- Updated legacy `create_training_signup_with_capacity(...)` to delegate to the session-aware path.
- Updated admin lifecycle review and completion point metadata to carry training session context.
- Replaced parent-level signup uniqueness with session-level uniqueness.
- Added a frontend session selector and session-aware training signup layer.
- Preserved current visible training cards for existing pilot data.

Primary files:

```text
supabase/migrations/202605110008_phase_thirty_training_session_parity.sql
supabase/migrations/202605110009_phase_thirty_training_session_unique_constraint_fix.sql
assets/phase-thirty-training-session-parity.js
docs/phase-thirty-training-session-parity.md
```

### Phase 31 — Admin UX Refinement

Implemented an additive admin workspace layer:

- Admin workspace card with tabbed work areas.
- Work areas for home, content, sign-ups, attendance, training, referrals, points, reports, audit, and notifications.
- Summary tiles for active sign-ups, attendance queue, training sign-ups, and training sessions.
- Text and status filters over visible admin cards.
- Existing admin cards are classified into areas rather than removed.
- Training parent/session management UI for Phase 30 training rows.
- Training child session create/edit/delete controls.
- Confirmation prompt before deleting child training sessions.

Primary files:

```text
assets/phase-thirty-one-admin-ux.css
assets/phase-thirty-one-admin-ux.js
docs/phase-thirty-one-admin-ux-refinement.md
```

### Phase 32 — QA / Smoke Tests / Hardening

Implemented a repeatable QA baseline:

- Manual QA checklist covering auth, profile, opportunities, attendance, training, referrals, points, reports, audit, notifications, and admin workspace.
- Consolidated Supabase verification SQL that returns one result set.
- Admin-only in-app QA smoke-check panel.
- Read-only checks for required tables, Phase 30 columns/functions, Phase 29.5 anonymous grant audit, session reference integrity, admin report/audit RPC access, and operational counts.
- Live Supabase verification run passed all consolidated SQL checks.

Primary files:

```text
docs/phase-thirty-two-qa-smoke-tests.md
supabase/verification/phase32_smoke_checks.sql
assets/phase-thirty-two-qa-tools.css
assets/phase-thirty-two-qa-tools.js
```

Live verification results:

- `phase29_5_anon_rpc_grants`: pass, 0.
- `required_tables_missing`: pass, 0.
- `phase30_training_columns_missing`: pass, 0.
- `phase30_functions_missing`: pass, 0.
- `phase30_training_session_unique_index_missing`: pass, 0.
- `invalid_training_signup_session_refs`: pass, 0.
- `invalid_training_parent_refs`: pass, 0.
- `invalid_opportunity_signup_session_refs`: pass, 0.
- `invalid_attendance_claim_session_refs`: pass, 0.

### Phase 33 — Production Readiness

Implemented production-readiness groundwork:

- Ran security and performance advisor reviews.
- Added low-risk production hardening migration.
- Fixed mutable search-path warnings for `report_date_in_range`, `make_referral_code`, and `notification_category_for_type`.
- Revoked anonymous direct execution from `current_app_role`, `current_app_user_id`, and `current_app_user_is_admin`.
- Added live app-table foreign-key indexes flagged by performance advisor.
- Removed clear duplicate audit-log indexes.
- Added production-readiness verification SQL.
- Added Auth/deployment/backup/export/data-retention/remaining-advisor runbook.
- Live Phase 33 verification SQL passed all added checks.

Primary files:

```text
supabase/migrations/202605110010_phase_thirty_three_low_risk_production_hardening.sql
supabase/verification/phase33_production_readiness_checks.sql
docs/phase-thirty-three-production-readiness.md
```

Live Phase 33 verification results:

- `phase29_5_anon_rpc_grants`: pass, 0.
- `role_helpers_anon_executable`: pass, 0.
- `mutable_search_path_helpers`: pass, 0.
- `phase33_live_fk_indexes_missing`: pass, 0.
- `duplicate_audit_indexes_remaining`: pass, 0.
- `phase32_reference_integrity`: pass, 0.

Remaining manual / policy items:

- Enable leaked-password protection in Supabase Auth console.
- Confirm Auth redirect URLs and email templates in Supabase console.
- Manually QA volunteer/admin flows with separate accounts.
- Classify remaining authenticated `SECURITY DEFINER` RPCs as keep/convert/revoke/backend-only.
- Decide whether to drop or archive legacy non-`app_*` tables.
- Review/drop/recreate `volunteer_verified_hour_totals` security-definer view.
- Clean RLS initplan and multiple-permissive-policy performance warnings after role model stabilises.
- Re-evaluate unused indexes after realistic usage data.
- Delete legacy Sveltia files only after manual QA and rollback decision.

## Current recommended next work

Do not start another feature phase until manual QA and console settings are complete.

Recommended next steps:

1. Run the Phase 32 manual QA checklist with separate volunteer and admin accounts.
2. Enable leaked-password protection in Supabase Auth console.
3. Verify production Auth redirect URLs and email templates.
4. Run the in-app QA panel as admin.
5. Re-run Phase 32 and Phase 33 SQL verification.
6. Decide on legacy Sveltia deletion after QA.
7. Decide how to handle remaining authenticated `SECURITY DEFINER` RPC warnings.
8. Decide whether legacy non-`app_*` tables and `volunteer_verified_hour_totals` can be removed.

## Later follow-up items

Keep these visible but do not let them override manual QA / production settings:

- Public referral landing page.
- Referral conversion workflow.
- Email notification delivery.
- Notification analytics/delivery audit.
- Leaderboard, if policy-approved.
- Configurable points rules.
- Admin points adjustment UI.
- Report aggregation/charts.
- Saved report presets.
- Scheduled report emails.
- Exact-record notification deep links.
- Automated migration test suite.

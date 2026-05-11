# MENDAKI Volunteer Hub — Development Roadmap

Last updated: after Phase 32 QA/smoke-test baseline implementation; Phase 33 is the accepted next development phase.

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

The app remains pilot/beta and is not production-complete.

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

Context counts at verification time:

```text
opportunities: 7
opportunity_sessions: 7
opportunity_signups: 4
attendance_claims: 2
training_rows: 3
training_signups: 0
referrals: 0
points_ledger: 0
notifications: 3
audit_logs: 0
```

Known limitations:

- Volunteer-vs-admin role-permission testing still requires manual sign-in with separate accounts.
- The in-app QA panel is read-only and does not create test records.
- Browser compatibility still needs human testing.
- Supabase advisor warnings may still include known Phase 33 items.

## Accepted roadmap order

Use this order in future sessions unless a new production blocker appears:

```text
Phase 33 — Production Readiness
```

## Phase 33 — Production Readiness

Status: accepted immediate next phase.

Purpose: prepare the pilot/beta for safer production use.

Recommended scope:

- Verify Supabase Auth redirects and email templates.
- RLS/security review across all app tables and RPCs.
- Review function `SECURITY DEFINER` search paths and grants.
- Decide whether signed-in `SECURITY DEFINER` RPC warnings are acceptable, should become `SECURITY INVOKER`, or should be hidden behind stricter backend paths.
- Review and, if safe, revoke anonymous execute from helper role functions such as `current_app_role`, `current_app_user_id`, and `current_app_user_is_admin` without breaking RLS policy evaluation.
- Fix mutable `search_path` warnings for helper/report functions such as `report_date_in_range`, `make_referral_code`, and `notification_category_for_type`.
- Resolve or retire legacy non-`app_*` tables with RLS enabled and no policies.
- Review the `volunteer_verified_hour_totals` security-definer view and convert/remove it if not required.
- Enable leaked password protection when Auth settings are ready.
- Environment/config documentation.
- Backup/restore guidance.
- Deployment checklist.
- Referral link domain/redirect verification.
- Invite abuse review.
- Scheduled/server-side points backfill instead of frontend-triggered award runs.
- Export pagination/size limits.
- Data-retention policy.
- Duplicate/unused index cleanup after checking real usage.
- RLS performance lint cleanup using `(select auth.uid())`-style initplans.
- Remove obsolete demo/local fallback paths where appropriate.
- Delete legacy Sveltia files after QA:
  - `admin/index.html`;
  - `admin/config.yml`.

Dependencies:

- Phase 32 QA baseline.
- Confirmed production Supabase settings.

## Later follow-up items

Keep these visible but do not let them block Phase 33 unless they become operational blockers:

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

## Recommended next task

Start with **Phase 33 — Production Readiness**.

Reasoning:

- Phases 24–32 have added the major pilot features and a QA baseline.
- The next bottleneck is safe production operation rather than additional feature expansion.
- Phase 33 should focus on security posture, deployment configuration, cleanup, and operational guidance.

Minimum Phase 33 implementation should include:

1. Supabase advisor review and triage.
2. Auth redirect/email template verification notes.
3. RLS and RPC grant review.
4. Environment/config documentation.
5. Backup/restore and deployment checklist.
6. Export/data-retention notes.
7. Legacy Sveltia cleanup plan or deletion after manual QA confirmation.

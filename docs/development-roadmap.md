# MENDAKI Volunteer Hub — Development Roadmap

Last updated: after Phase 30 training session parity implementation; Phase 31 is the accepted next development phase.

## Current status

The app is a Supabase-backed pilot/beta volunteer management app. Sveltia CMS is deprecated as the production admin path. The authoritative admin path is:

```text
Signed-in app dashboard → Admin tools / Admin content management
```

The current app includes:

- Supabase Auth.
- Dashboard and admin tools.
- Hierarchical opportunity/session editing.
- Session-specific opportunity signups.
- Session-aware attendance validation foundation.
- Phase 29.5 attendance session guard.
- Attendance review.
- Training lifecycle with Phase 30 training session parity foundation.
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

Known limitations:

- Admin UI for creating/editing child training session rows is not yet polished.
- Training attendance is still represented by lifecycle completion, not check-in/check-out.
- Full automated regression coverage remains Phase 32.

## Accepted roadmap order

Use this order in future sessions unless a new production blocker appears:

```text
Phase 31 — Admin UX Refinement
Phase 32 — QA / Smoke Tests / Hardening
Phase 33 — Production Readiness
```

## Phase 31 — Admin UX Refinement

Status: accepted immediate next phase.

Purpose: reduce dashboard density and clarify admin work queues.

Recommended scope:

- Admin home page.
- Separate admin pages/tabs:
  - opportunities;
  - sessions;
  - sign-ups;
  - attendance;
  - training;
  - referrals;
  - points/achievements;
  - reports;
  - audit logs;
  - notifications/settings.
- Search/filter/sort in each admin area.
- Confirmation prompts for destructive or high-impact actions.
- Dedicated referral status workflow.
- Dedicated points adjustment workflow.
- Session-code warnings inside the session editor.
- Training session management UI for parent training rows and child training session instances.

Dependencies:

- Phase 30 training session parity.

## Phase 32 — QA / Smoke Tests / Hardening

Purpose: create a repeatable regression safety net.

Recommended scope:

- Manual QA checklist.
- Lightweight smoke-test script.
- Migration verification queries.
- Role-permission tests.
- Capacity/waitlist tests.
- Session-selection tests.
- Session-aware attendance tests.
- Training session-selection and session-completion tests.
- Auth tests.
- Referral attribution tests.
- Referral duplicate-prevention tests.
- Points idempotency tests.
- CSV/report export tests.
- Notification preference/grouping tests.
- Audit filtering/export tests.
- Re-run `get_phase_29_5_rpc_grant_audit()` and confirm targeted RPCs still have no anonymous execute grants.
- Confirm volunteer users cannot access admin report/audit/review/code-management RPC results.

Dependencies:

- All operational flows that need pilot confidence.

## Phase 33 — Production Readiness

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

Keep these visible but do not let them block Phase 31 unless they become operational blockers:

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

Start with **Phase 31 — Admin UX Refinement**.

Reasoning:

- Phase 30 added training session parity at the data/RPC/frontend-compatibility level.
- The next bottleneck is admin usability: creating, editing, filtering, and operating these increasingly dense workflows needs clearer pages/tabs.
- Phase 31 should include the first proper training session management UI for parent training rows and child session instances.

Minimum Phase 31 implementation should include:

1. Admin landing/home structure.
2. Split admin pages or tabs for major work queues.
3. Search/filter/sort for signups, attendance, training, referrals, points, reports, audit, and notifications.
4. Training parent/session management UI.
5. Confirmation prompts for high-impact actions.
6. Documentation and focused QA notes.

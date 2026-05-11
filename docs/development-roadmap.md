# MENDAKI Volunteer Hub — Development Roadmap

Last updated: after Phase 29 session-aware attendance validation and the accepted Phase 29.5 hardening decision.

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
- Attendance review.
- Training lifecycle.
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

Current limitation:

- Attendance flow still infers session from cached signup data rather than passing signup/session directly through the attendance flow.

## Accepted roadmap order

Use this order in future sessions unless a new production blocker appears:

```text
Phase 29.5 — Security and Session Contract Hardening
Phase 30 — Training Session Parity
Phase 31 — Admin UX Refinement
Phase 32 — QA / Smoke Tests / Hardening
Phase 33 — Production Readiness
```

## Phase 29.5 — Security and Session Contract Hardening

Status: accepted immediate next phase.

Purpose: address foundational security and session-contract issues before adding training session parity.

Why this comes before Phase 30:

- Phases 24–29 expanded privileged Supabase RPC usage across referrals, points, reports, audit logs, notifications, attendance, and admin workflows.
- Supabase advisor flagged many `SECURITY DEFINER` RPCs as executable by `anon` and/or broadly by `authenticated`.
- Client-side admin checks are not security boundaries.
- Training session parity would add more session-sensitive and permission-sensitive flows; it should not inherit unresolved opportunity/attendance contract gaps.

Recommended scope:

- Classify RPCs by access level:
  - public-safe;
  - authenticated volunteer;
  - admin-only.
- Revoke `EXECUTE` from `anon` on sensitive mutation/report/admin RPCs.
- Grant `EXECUTE` only to the roles that need each RPC.
- Add or verify database-side admin checks inside admin-only RPCs.
- Review `SECURITY DEFINER` functions for safe `search_path` handling.
- Ensure volunteer RPCs operate only on the current user’s own records.
- Tighten attendance flow so `signupId` and `sessionId` are passed explicitly instead of inferred from cached signup data.
- Prefer `validate_session_attendance_code(...)` whenever a session exists.
- Keep opportunity-level attendance-code fallback only when explicitly allowed.
- Add minimum role-permission smoke checks.

Minimum smoke checks:

- Anonymous user cannot call sensitive mutation RPCs.
- Anonymous user cannot call admin report/audit/points-review RPCs.
- Volunteer cannot call admin report/audit/review/code-management RPCs.
- Volunteer can create/cancel only their own signups.
- Volunteer can read/update only their own notifications/preferences/referrals/points summary.
- Admin can review signups and attendance.
- Correct session facilitator code is accepted.
- Wrong-session facilitator code is rejected.
- Attendance claim stores the correct `session_id`.

Non-blocking items that can remain for Phase 32/33:

- Duplicate/unused index cleanup.
- RLS performance lint cleanup using `(select auth.uid())`-style initplans.
- Legacy non-`app_*` table cleanup.
- Full Auth redirect/email template review.
- Leaked-password protection toggle.
- Legacy Sveltia file deletion.

## Phase 30 — Training Session Parity

Purpose: give training the same true session model as opportunities.

Recommended scope:

- True training session instances.
- Multi-date training support.
- Session-specific training capacity.
- Selected training session in signup.
- Training attendance/completion per session.
- Training points awarded from session-completion records.

Dependencies:

- Phase 29.5 security and session contract hardening.
- Current training lifecycle.
- Phase 25 training completion points.
- Phase 29 session-aware attendance validation pattern.

## Phase 31 — Admin UX Refinement

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

Dependencies:

- Phase 30 training session parity, unless admin UX density becomes a blocker sooner.

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
- Auth tests.
- Referral attribution tests.
- Referral duplicate-prevention tests.
- Points idempotency tests.
- CSV/report export tests.
- Notification preference/grouping tests.
- Audit filtering/export tests.

Dependencies:

- All operational flows that need pilot confidence.

## Phase 33 — Production Readiness

Purpose: prepare the pilot/beta for safer production use.

Recommended scope:

- Verify Supabase Auth redirects and email templates.
- RLS/security review across all app tables and RPCs.
- Review function `SECURITY DEFINER` search paths and grants.
- Environment/config documentation.
- Backup/restore guidance.
- Deployment checklist.
- Referral link domain/redirect verification.
- Invite abuse review.
- Scheduled/server-side points backfill instead of frontend-triggered award runs.
- Export pagination/size limits.
- Data-retention policy.
- Remove obsolete demo/local fallback paths where appropriate.
- Delete legacy Sveltia files after QA:
  - `admin/index.html`;
  - `admin/config.yml`.

Dependencies:

- Phase 32 QA baseline.
- Confirmed production Supabase settings.

## Later follow-up items

Keep these visible but do not let them block Phase 29.5 or Phase 30 unless they become operational blockers:

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

Start with **Phase 29.5 — Security and Session Contract Hardening**.

Reasoning:

- The app is still pilot/beta, so full production readiness can wait.
- However, sensitive RPC grants and session-contract gaps should be fixed before adding another session-heavy model in Phase 30.
- This should be treated as a short hardening phase, not a full roadmap pause.

Minimum Phase 29.5 implementation should include:

1. RPC access classification and grant cleanup.
2. Database-side admin checks for admin-only RPCs.
3. Explicit attendance `signupId` / `sessionId` passing.
4. Session-first attendance-code validation.
5. Focused role-permission and session-code smoke checks.

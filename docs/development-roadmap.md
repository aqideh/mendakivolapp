# MENDAKI Volunteer Hub — Development Roadmap

Last updated: after Phase 37 visible legacy admin surface retirement.

## Current status

The app is a Supabase-backed pilot/beta volunteer management app. Sveltia CMS is deprecated as the production admin path. The authoritative admin path is now:

```text
Signed-in app dashboard → Admin workspace entry → Single admin shell → Canonical workflow pages → Table queues and drawers → fallback tools only where needed
```

The current app includes:

- Supabase Auth.
- Dashboard and admin tools.
- Phase 34 single admin shell entry point and admin navigation.
- Phase 35 canonical admin pages with collapsed legacy fallback tools.
- Phase 36 table queues and detail drawers for key admin workflows.
- Phase 37 visible legacy admin surface retirement from the main dashboard.
- Phase 31 admin workspace support retained for compatibility but retired as a primary visible surface.
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

Implemented Supabase-backed referrals.

Primary files:

```text
supabase/migrations/202605110001_phase_twenty_four_referrals.sql
assets/referrals.js
docs/phase-twenty-four-referrals.md
```

### Phase 25 — Gamification Backend

Implemented backend-first points and achievements.

Primary files:

```text
supabase/migrations/202605110002_phase_twenty_five_gamification.sql
assets/gamification.js
docs/phase-twenty-five-gamification.md
```

### Phase 26 — Reporting and CSV Exports

Implemented admin reports and browser CSV export.

Primary files:

```text
supabase/migrations/202605110003_phase_twenty_six_reports.sql
assets/reports.js
docs/phase-twenty-six-reporting.md
```

### Phase 27 — Audit History UI

Implemented admin audit history viewer.

Primary files:

```text
supabase/migrations/202605110004_phase_twenty_seven_audit_ui.sql
assets/audit-history.js
docs/phase-twenty-seven-audit-history.md
```

### Phase 28 — Notification Polish

Implemented notification preferences, history, grouping, and improved routing.

Primary files:

```text
supabase/migrations/202605110005_phase_twenty_eight_notification_polish.sql
assets/notification-polish.js
assets/notifications.js
docs/phase-twenty-eight-notification-polish.md
```

### Phase 29 — Session-Aware Attendance Validation

Implemented session-level facilitator-code validation.

Primary files:

```text
supabase/migrations/202605110006_phase_twenty_nine_session_attendance_validation.sql
assets/attendance-code-validation.js
assets/session-attendance-validation.js
docs/phase-twenty-nine-session-attendance-validation.md
```

### Phase 29.5 — Security and Session Contract Hardening

Implemented a focused hardening pass and attendance session guard.

Primary files:

```text
supabase/migrations/202605110007_phase_twenty_nine_five_security_session_hardening.sql
assets/phase-twenty-nine-five-hardening.js
docs/phase-twenty-nine-five-security-session-hardening.md
```

### Phase 30 — Training Session Parity

Implemented compatibility-safe training session foundation.

Primary files:

```text
supabase/migrations/202605110008_phase_thirty_training_session_parity.sql
supabase/migrations/202605110009_phase_thirty_training_session_unique_constraint_fix.sql
assets/phase-thirty-training-session-parity.js
docs/phase-thirty-training-session-parity.md
```

### Phase 31 — Admin UX Refinement

Implemented an additive admin workspace layer. Phase 31 is now retained for compatibility and support code only; Phase 34+ is the preferred admin interface.

Primary files:

```text
assets/phase-thirty-one-admin-ux.css
assets/phase-thirty-one-admin-ux.js
docs/phase-thirty-one-admin-ux-refinement.md
```

### Phase 32 — QA / Smoke Tests / Hardening

Implemented a repeatable QA baseline.

Primary files:

```text
docs/phase-thirty-two-qa-smoke-tests.md
supabase/verification/phase32_smoke_checks.sql
assets/phase-thirty-two-qa-tools.css
assets/phase-thirty-two-qa-tools.js
```

### Phase 33 — Production Readiness

Implemented production-readiness groundwork.

Primary files:

```text
supabase/migrations/202605110010_phase_thirty_three_low_risk_production_hardening.sql
supabase/verification/phase33_production_readiness_checks.sql
docs/phase-thirty-three-production-readiness.md
```

### Phase 34 — Admin Shell Consolidation

Implemented the first phase of moving toward a single admin interface.

Primary files:

```text
assets/phase-thirty-four-admin-shell.css
assets/phase-thirty-four-admin-shell.js
docs/phase-thirty-four-admin-shell-consolidation.md
```

### Phase 35 — Canonical Admin Pages

Implemented the second phase of the single-admin-interface consolidation track.

Primary files:

```text
assets/phase-thirty-five-canonical-admin-pages.css
assets/phase-thirty-five-canonical-admin-pages.js
docs/phase-thirty-five-canonical-admin-pages.md
```

### Phase 36 — Table Queues and Detail Drawers

Implemented the third phase of the single-admin-interface consolidation track.

Primary files:

```text
assets/phase-thirty-six-admin-tables.css
assets/phase-thirty-six-admin-tables.js
docs/phase-thirty-six-admin-table-queues.md
```

### Phase 37 — Legacy Admin Surface Retirement

Implemented visible-surface retirement without deleting unique capabilities:

- Hid legacy admin cards from the main dashboard by default.
- Kept one visible dashboard-level admin entry point: Admin workspace.
- Kept legacy mutation/action tools reachable inside admin shell fallback sections.
- Marked the Phase 31 hub as retired as a visible primary admin surface.
- Added a System / QA note showing fallback legacy-surface status.
- Did not delete action cards, Phase 31 support files, Sveltia files, or legacy code paths that may still be needed for mutations.

Primary files:

```text
assets/phase-thirty-seven-legacy-surface-retirement.js
docs/phase-thirty-seven-legacy-surface-retirement.md
```

Related change:

```text
assets/phase-thirty-four-admin-shell.css
index.html
```

Known limitations:

- Some fallback tools are still required for approve/verify/update mutations.
- Drawer actions are not yet connected to Supabase RPCs.
- Legacy code still runs to generate fallback tools.
- Full deletion should wait until Phase 38+ action migration and manual QA.

## Current consolidation roadmap

The next work should continue the single-admin-interface track carefully:

```text
Phase 38 — Drawer Action Migration
```

## Phase 38 — Drawer Action Migration

Purpose: migrate safe row-level mutations from legacy cards into Phase 36 detail drawers.

Recommended scope:

- Sign-up review actions.
- Attendance verification/rejection actions.
- Training completion/no-show actions.
- Referral status workflow.
- Points adjustment workflow, if policy-approved.
- Confirmation prompts and audit metadata.

Safety rule:

```text
Do not delete fallback action tools until their drawer actions are implemented and manually QA-tested.
```

## Production/manual requirements still pending

Do not treat the app as production-complete until these are done:

1. Run the Phase 32 manual QA checklist with separate volunteer and admin accounts.
2. Enable leaked-password protection in Supabase Auth console.
3. Verify production Auth redirect URLs and email templates.
4. Run the in-app QA panel as admin.
5. Re-run Phase 32 and Phase 33 SQL verification.
6. Decide how to handle remaining authenticated `SECURITY DEFINER` RPC warnings.
7. Decide whether legacy non-`app_*` tables and `volunteer_verified_hour_totals` can be removed.

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

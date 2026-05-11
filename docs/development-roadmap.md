# MENDAKI Volunteer Hub — Development Roadmap

Last updated: after Phase 35 canonical admin pages.

## Current status

The app is a Supabase-backed pilot/beta volunteer management app. Sveltia CMS is deprecated as the production admin path. The authoritative admin path is now moving toward:

```text
Signed-in app dashboard → Admin workspace entry → Single admin shell → Canonical workflow pages
```

The current app includes:

- Supabase Auth.
- Dashboard and admin tools.
- Phase 34 single admin shell entry point and admin navigation.
- Phase 35 canonical admin pages with collapsed legacy fallback tools.
- Phase 31 admin workspace tabs and filtering retained for compatibility.
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

Implemented an additive admin workspace layer.

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

Implemented the first phase of moving toward a single admin interface:

- Added one main dashboard Admin workspace entry card.
- Added a single admin shell with left/admin navigation.
- Added pages for Home, Content, Opportunities, Sign-ups, Attendance, Training, Referrals, Points, Reports, Audit, Notifications, and System / QA.
- Mounted existing legacy admin tools into assigned shell pages.
- Hid legacy admin-card sprawl from the main dashboard while the shell is active.
- Kept legacy tools and Phase 31 compatibility layer available until purpose-built admin pages replace them.

Primary files:

```text
assets/phase-thirty-four-admin-shell.css
assets/phase-thirty-four-admin-shell.js
docs/phase-thirty-four-admin-shell-consolidation.md
```

### Phase 35 — Canonical Admin Pages

Implemented the second phase of the single-admin-interface consolidation track:

- Added canonical page renderer hook to the Phase 34 shell.
- Added canonical page layouts for Home, Content, Opportunities, Sign-ups, Attendance, Training, Referrals, Points, Reports, Audit, Notifications, and System / QA.
- Added summary tiles and preview tables for the main operational pages.
- Moved existing legacy tools behind collapsed `Show existing tools` sections.
- Formalised the rule: one workflow = one canonical owner page.

Primary files:

```text
assets/phase-thirty-five-canonical-admin-pages.css
assets/phase-thirty-five-canonical-admin-pages.js
docs/phase-thirty-five-canonical-admin-pages.md
```

Known limitations:

- Queue previews are read-only summaries, not full action tables.
- Existing legacy tools still perform many actions.
- Detail drawers are not implemented yet.
- Table-level search/filter/sort remains Phase 36.
- Some canonical pages are action-card placeholders until their legacy cards are rewritten.

## Current consolidation roadmap

The next work should continue the single-admin-interface track:

```text
Phase 36 — Table Queues and Detail Drawers
Phase 37 — Legacy Admin Surface Removal
```

## Phase 36 — Table Queues and Detail Drawers

Purpose: replace dense cards and inline forms with scalable tables, search/filter/sort, and detail drawers.

Recommended scope:

- Sign-up review table with row detail drawer and review actions.
- Attendance review table with row detail drawer and verification actions.
- Training signup/completion table with row detail drawer.
- Referral queue table.
- Points ledger table.
- Audit table refinements.
- Reusable detail drawer/action pattern.

## Phase 37 — Legacy Admin Surface Removal

Purpose: remove duplicated legacy admin surfaces after the shell, canonical pages, and table queues pass QA.

Recommended scope:

- Retire old dashboard-level admin card rendering.
- Retire Phase 31 tab/filter layer if Phase 34+ shell fully covers it.
- Demote generic admin content management to static content only.
- Remove duplicate training/session editing routes.
- Delete legacy Sveltia files only after manual QA and rollback decision:
  - `admin/index.html`;
  - `admin/config.yml`.

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

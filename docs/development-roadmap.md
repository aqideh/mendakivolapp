# MENDAKI Volunteer Hub — Development Roadmap

Last updated: after Phase 25 gamification backend implementation.

## Current status

The app is a Supabase-backed pilot/beta volunteer management app. Sveltia CMS is deprecated as the production admin path. The authoritative admin path is:

```text
Signed-in app dashboard → Admin tools / Admin content management
```

Recently completed phases include:

- Supabase Auth completion.
- Opportunity sessions and session-specific volunteer sign-up selection.
- Hierarchical opportunity editing under Admin content management.
- Referral / invite system foundation.
- Gamification backend foundation.

## Active limitations carried forward

### Referral / invite limitations

- Build a public invite landing page instead of routing referral links directly into the dashboard/app flow.
- Add referral notifications after a referral is accepted or converted.
- Add admin referral status controls for conversion/cancellation handling.
- Track abandoned invite visits or pre-signup invite starts if campaign analytics are needed.
- Add clearer anti-abuse rules beyond one referral per referred user, such as email/domain checks or admin review queues if required for production.

### Gamification limitations

- Add admin adjustment UI for points corrections.
- Add leaderboard or ranking view only after policy approval.
- Add points/achievement notifications.
- Move award backfill from frontend-triggered `award_available_points()` calls to a scheduled Supabase Edge Function, cron, or database trigger path for production.
- Make award rules configurable if the pilot needs flexible point values.
- Distinguish referral accepted vs referral converted if conversion becomes operationally meaningful.

### Session and attendance limitations

- Attendance code validation is still not fully session-specific.
- Attendance check-in/out should validate facilitator code by `session_id`, with opportunity-level fallback only where intentional.
- Admin UI should warn when a session has no facilitator code.
- QA should cover two sessions under one opportunity with different facilitator codes.

### Reporting and operational limitations

- CSV exports and reports are still missing.
- Audit history UI is still missing despite backend audit logging.
- Notification history/preferences/grouping are still incomplete.
- Training does not yet have true session-instance parity with opportunities.
- Admin dashboard remains dense and should be split into clearer pages/tabs.
- Formal smoke tests and migration verification scripts are still needed.
- Production readiness review is incomplete: RLS/security review, redirect settings, backup/restore guidance, environment documentation, and cleanup of obsolete fallback paths remain.

## Proposed upcoming phases

### Phase 26 — Reporting and CSV Exports

Purpose: give admins operational reports for the pilot.

Recommended scope:

- Volunteer hours report.
- Attendance verification report.
- Opportunity/session participation report.
- Training completion report.
- Referral report.
- Points/achievement report.
- Filters for date range, opportunity, session, training, status, volunteer, referral status, and points reason.
- Browser CSV export first.
- Supabase views/RPCs for report queries where needed.

Dependencies:

- Phase 24 referrals.
- Phase 25 points ledger.
- Current attendance/session models.

### Phase 27 — Audit History UI

Purpose: expose audit logs to admins.

Recommended scope:

- Admin audit-log card/page.
- Filters by action type, actor, entity/table, target user, and date range.
- Metadata/details drawer.
- Read-only audit display.
- Link audit events to related opportunity/session/signup/training/referral/points records where practical.

Dependencies:

- Existing audit backend.
- Admin UX refinement may later move this into a dedicated page.

### Phase 28 — Notification Polish

Purpose: make notifications more useful and reduce noise.

Recommended scope:

- Notification history page.
- Preferences.
- Group repeated notifications.
- Better read/cleared behavior.
- Clear routing from notifications to target items.
- Referral accepted/conversion notifications.
- Points awarded and achievement unlocked notifications.
- Inline alerts for relevant new opportunities.

Dependencies:

- Current notifications module.
- Phase 24 referrals.
- Phase 25 achievements.

### Phase 29 — Session-Aware Attendance Validation

Purpose: align attendance with the session model.

Recommended scope:

- Validate facilitator code by `session_id`.
- Keep opportunity-level fallback only when a session has no code and fallback is explicitly allowed.
- Ensure attendance check-in/out sends selected session.
- Add admin warning if a session has no facilitator code.
- QA cases:
  - two sessions under one opportunity with different codes;
  - wrong session code rejected;
  - attendance row stores correct `session_id`;
  - legacy opportunity-level code still works only where intended.

Dependencies:

- Phase 19 sessions.
- Phase 22 session selection.
- Current attendance claims table/session fields.

### Phase 30 — Training Session Parity

Purpose: give training the same true session model as opportunities.

Recommended scope:

- True training session instances.
- Multi-date training support.
- Session-specific training capacity.
- Selected training session in signup.
- Training attendance/completion per session.
- Training points awarded from session-completion records.

Dependencies:

- Current training lifecycle.
- Phase 25 training completion points.

### Phase 31 — Admin UX Refinement

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
  - notifications.
- Search/filter/sort in each admin area.
- Confirmation prompts for destructive or high-impact actions.
- Dedicated referral status workflow.
- Dedicated points adjustment workflow.

Dependencies:

- Existing admin cards/modules.
- Phase 24 referrals.
- Phase 25 gamification.
- Phase 26 reports.
- Phase 27 audit UI.

### Phase 32 — QA / Smoke Tests / Hardening

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
- Referral attribution and duplicate-prevention tests.
- Points idempotency tests for attendance, training, and referrals.
- CSV/report export tests.

Dependencies:

- All operational flows that need pilot confidence.

### Phase 33 — Production Readiness

Purpose: prepare the pilot/beta for safer production use.

Recommended scope:

- Verify Supabase Auth redirects and email templates.
- RLS/security review across all app tables and RPCs.
- Review function security-definer search paths and grants.
- Environment/config documentation.
- Backup/restore guidance.
- Deployment checklist.
- Referral link domain/redirect verification.
- Invite abuse review.
- Scheduled/server-side points backfill instead of frontend-triggered award runs.
- Remove obsolete demo/local fallback paths where appropriate.
- Delete legacy Sveltia files after QA:
  - `admin/index.html`;
  - `admin/config.yml`.

Dependencies:

- Phase 32 QA baseline.
- Confirmed production Supabase settings.

## Recommended next task

Start with **Phase 26 — Reporting and CSV Exports**.

Reasoning:

- Referrals and points now create operational data that admins need to inspect/export.
- Reports will expose data inconsistencies before the app goes further into pilot use.
- Report queries will also support later audit/admin UX work.

Minimum Phase 26 implementation should include:

1. Supabase report RPCs or views for hours, participation, training, referrals, and points.
2. Admin report dashboard card/page.
3. Date/status/entity filters.
4. Browser CSV export.
5. Documentation and QA checklist.

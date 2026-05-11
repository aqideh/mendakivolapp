# Phase 34 — Admin Shell Consolidation

Status: implemented as the first phase of moving toward a single admin interface.

## Purpose

Phase 34 begins replacing the messy card-based admin dashboard with one consolidated admin workspace.

This phase does **not** remove legacy admin tools yet. It creates a real admin shell and mounts existing admin tools inside assigned workflow pages so the main dashboard no longer needs to expose every admin card at once.

## Files added

```text
assets/phase-thirty-four-admin-shell.css
assets/phase-thirty-four-admin-shell.js
docs/phase-thirty-four-admin-shell-consolidation.md
```

`index.html` now loads:

```text
assets/phase-thirty-four-admin-shell.css
assets/phase-thirty-four-admin-shell.js
```

## Implemented

### Single admin entry point

Admins now get one main dashboard entry card:

```text
Admin workspace
```

The card shows summary counts and a single button:

```text
Open admin workspace
```

This is intended to replace the previous pattern where many admin cards appeared directly in the dashboard.

### Admin shell

The new admin shell contains:

```text
Home
Content
Opportunities
Sign-ups
Attendance
Training
Referrals
Points
Reports
Audit
Notifications
System / QA
```

Each page has a clear title, description, and page body.

### Legacy tool mounting

Existing admin cards are classified and moved into their assigned admin page when the shell is open.

Examples:

- admin content management → Content;
- admin attendance card → Attendance;
- admin training card and training session manager → Training;
- reports → Reports;
- audit history → Audit;
- referral tools → Referrals;
- points tools → Points;
- notification tools → Notifications;
- QA smoke checks → System / QA.

### Cleaner main dashboard

When the admin shell is active, legacy admin cards are hidden from the main dashboard and displayed only inside the shell page that owns them.

The main dashboard should now behave as:

```text
Volunteer dashboard cards
Admin workspace entry card
```

instead of:

```text
Volunteer cards
Admin content card
Attendance card
Training card
Reports card
Audit card
QA card
...many more admin cards
```

## Current limitations

This is still a bridge phase.

- Existing tools are mounted into pages; many are not yet rewritten as clean tables.
- Some workflow pages may initially be empty until legacy cards are classified or new canonical page components are built.
- The old Phase 31 admin tab/filter layer still exists underneath for compatibility, but Phase 34 is now the preferred admin interface.
- The shell does not yet deeply refactor workflows into row tables and drawers.
- Legacy admin cards should not be deleted until manual QA confirms the shell covers each workflow.

## Smoke checks

Run these after sign-in as admin:

1. Dashboard shows a single Admin workspace entry card.
2. Opening the shell shows the left admin navigation.
3. Admin Home shows summary tiles and no forms.
4. Content page contains content-related tools.
5. Training page contains the training lifecycle tools and training session manager.
6. Reports page contains reports.
7. Audit page contains audit history.
8. System / QA contains the QA smoke-check panel.
9. Back to dashboard hides the shell and returns to the volunteer dashboard.
10. Non-admin users do not see the admin entry or shell.

## Next consolidation phases

### Phase 35 — Canonical Admin Pages

Replace mounted legacy cards with purpose-built pages owned by one workflow each.

### Phase 36 — Table Queues and Detail Drawers

Convert sign-up, attendance, training, referral, points, and audit queues into tables with drawers/actions.

### Phase 37 — Legacy Admin Surface Removal

After manual QA, remove duplicated legacy cards, retire the old Phase 31 tab/filter layer, and delete obsolete Sveltia files if rollback is no longer needed.

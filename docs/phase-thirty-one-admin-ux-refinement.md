# Phase 31 — Admin UX Refinement

Status: implemented as an additive admin workspace layer after Phase 30.

## Purpose

Phase 31 reduces admin dashboard density by grouping existing admin cards into clearer work areas and adds the first dedicated training parent/session management surface built on the Phase 30 training session schema.

This phase intentionally does not delete or replace existing admin cards. It classifies and filters them so current behaviour remains available while the admin workspace becomes easier to operate.

## Files added

```text
assets/phase-thirty-one-admin-ux.css
assets/phase-thirty-one-admin-ux.js
docs/phase-thirty-one-admin-ux-refinement.md
```

`index.html` now loads:

```text
assets/phase-thirty-one-admin-ux.css
assets/phase-thirty-one-admin-ux.js
```

## Implemented

### Admin workspace hub

Added a new admin workspace card with tabs/work areas:

```text
Admin home
Content
Sign-ups
Attendance
Training
Referrals
Points
Reports
Audit
Notifications
```

The hub includes summary tiles for:

- active sign-ups;
- attendance queue;
- training sign-ups;
- training sessions.

It also includes basic global filtering:

- text search across visible admin cards;
- status filter;
- reset filters.

### Admin card classification

The Phase 31 layer classifies existing cards into admin areas using existing selectors and dataset markers. It then shows/hides admin cards based on the selected tab.

Examples:

- admin content management → Content;
- admin attendance card → Attendance;
- admin training lifecycle and Phase 31 training manager → Training;
- reports card → Reports;
- audit history card → Audit;
- referral admin card → Referrals;
- points admin card → Points;
- notification cards → Notifications;
- admin signup review card → Sign-ups.

### Training parent/session management UI

Added a dedicated training session management card for admins.

It can:

- list parent training rows;
- show child/default sessions under each parent;
- create child session instances;
- edit session details;
- delete child session rows;
- refresh training session rows from Supabase.

The form supports:

```text
session title
starts_at
ends_at
session_date fallback
time label
capacity
default hours
status
trainer
location
description
waitlist toggle
```

This works with the Phase 30 columns:

```text
parent_training_id
session_title
starts_at
ends_at
default_hours
is_session_instance
```

and continues to use the existing `app_training_sessions` table.

## Current behaviour

The new admin workspace is additive. Existing cards remain in the DOM and can still be used. Phase 31 changes how admins navigate and filter them.

The training manager is the first proper UI for parent training rows and child session instances. It writes directly to `app_training_sessions` using the Phase 30 schema.

## Smoke checks

Before Phase 32, verify:

- Admin dashboard still loads for an admin user.
- Non-admin dashboard does not show the Phase 31 admin workspace.
- Admin tabs show/hide relevant admin cards.
- Search filter hides non-matching admin cards and reset restores them.
- Status filter works for visible admin cards.
- Training manager lists existing training rows.
- Creating a child training session works.
- Editing a child training session works.
- Deleting a child training session works.
- Parent training cards still show on the public training page.
- Volunteer training signup can select the new child training session.
- Training signup stores `training_session_id`.

## Known limitations

- This is not yet a full routed admin app. It is a dashboard-tab layer over existing cards.
- Search and status filters are text-based over visible card content, not table-level server-side filters.
- Training manager deletion is direct row deletion. It warns that historical sign-ups may retain references, but there is no deep dependency preview yet.
- The old admin content management form still exists for simple training rows. The Phase 31 training manager should be used for parent/session editing.
- Full regression and role-permission tests remain Phase 32.

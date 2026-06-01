# Phase 38 — Drawer Review Action Migration

Status: implemented for the first safe set of row-level admin actions.

## Purpose

Phase 38 starts migrating admin mutations from legacy cards into the Phase 36 detail drawer. It uses existing authoritative sync/review functions rather than creating new direct database writes.

This phase focuses on common review actions only:

```text
Opportunity sign-up review
Attendance claim review
Training sign-up lifecycle review
```

## Files added / changed

```text
assets/phase-thirty-six-admin-tables.js
assets/phase-thirty-eight-drawer-review-actions.js
index.html
docs/phase-thirty-eight-drawer-review-actions.md
```

## Implemented

### Drawer action hook

`assets/phase-thirty-six-admin-tables.js` now exposes:

```js
window.MENDAKIPhase36AdminTables.currentRecord()
```

and calls:

```js
window.MENDAKIPhase38DrawerActions.renderActions(record)
```

when rendering a detail drawer.

### Opportunity sign-up review actions

For opportunity sign-up rows, the drawer can now show:

```text
Confirm
Waitlist
Decline
Reset pending
```

These actions call the existing authoritative review path:

```js
VolunteerDataStore.reviewSupabaseSignupWithCapacity(...)
```

### Attendance claim review actions

For attendance claim rows, the drawer can now show:

```text
Verify
Request clarification
Reject
```

These actions call the existing attendance save/review path:

```js
VolunteerDataStore.saveSupabaseAttendanceClaim(..., { mode: 'update', review: true })
```

For `Verify`, the drawer uses the existing verified hours where present, otherwise claimed hours, otherwise the table row hour value.

### Training sign-up lifecycle actions

For training sign-up rows, the drawer can now show:

```text
Mark completed
Mark no-show
Cancel
Reset registered
```

These actions call the existing lifecycle review path:

```js
VolunteerDataStore.saveSupabaseTrainingSignup(..., { mode: 'update', lifecycleReview: true })
```

### Confirmation and refresh

Each action:

- asks for browser confirmation;
- sets a temporary saving state on the button;
- reuses existing Supabase functions;
- refreshes opportunity sign-ups, attendance claims, training sign-ups, and notifications where functions exist;
- closes the drawer;
- remounts the active admin shell page.

## Not implemented yet

The following remain intentionally deferred:

- custom admin notes from the drawer;
- manual verified-hours adjustment from the drawer;
- referral status workflow actions;
- points adjustment workflow;
- audit-table row actions;
- bulk actions;
- server-side pagination;
- replacement of all fallback legacy tools.

## Safety notes

This phase does not add new RPCs and does not bypass existing review functions. It relies on the same app paths already used by legacy tools.

Fallback legacy tools remain available under:

```text
Show existing tools
```

until drawer actions are manually QA-tested.

## Smoke checks

After signing in as an admin:

1. Open Admin workspace.
2. Open Sign-ups.
3. Click a sign-up row.
4. Confirm drawer shows review actions.
5. Confirm/Waitlist/Decline a safe test sign-up.
6. Confirm the drawer closes and the table refreshes.
7. Open Attendance.
8. Click an attendance claim row.
9. Verify, reject, or request clarification on a safe test claim.
10. Open Training.
11. Click a training sign-up row.
12. Mark completed/no-show/cancel on a safe test sign-up.
13. Confirm fallback legacy tools remain accessible.

## Next phase

Recommended next phase:

```text
Phase 39 — Drawer Action Completion and Admin Notes
```

Focus:

- add notes input in the drawer;
- add verified-hours adjustment for attendance;
- add referral status workflow;
- add points adjustment only if policy-approved;
- hide fallback legacy tools only after drawer actions pass manual QA.

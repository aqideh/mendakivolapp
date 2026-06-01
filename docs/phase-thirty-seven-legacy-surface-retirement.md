# Phase 37 — Legacy Admin Surface Retirement

Status: implemented as visible-surface retirement, not capability removal.

## Purpose

Phase 37 reduces duplicated admin UI by removing legacy admin cards from the main dashboard view. It keeps legacy mutation tools available inside the single admin shell under collapsed fallback sections.

This follows the safety rule:

```text
Remove duplicate surfaces, not unique capabilities.
```

## Files added / changed

```text
assets/phase-thirty-four-admin-shell.css
assets/phase-thirty-seven-legacy-surface-retirement.js
index.html
docs/phase-thirty-seven-legacy-surface-retirement.md
```

## Implemented

### Legacy admin cards hidden from main dashboard

The dashboard now keeps admin-facing clutter out of the primary dashboard view. Admins should see:

```text
Volunteer dashboard cards
Admin workspace entry card
```

instead of many independent admin cards.

Hidden dashboard-level legacy surfaces include:

```text
Phase 31 admin hub
admin content management card
admin attendance card
admin training card
reports card
audit history card
referral admin card
points admin card
notification cards
QA smoke-check card
admin sign-up card
Phase 31 training manager
```

### Legacy tools retained inside admin shell fallback sections

The same cards are still available when mounted inside:

```text
Admin workspace → relevant canonical page → Show existing tools
```

This preserves mutation flows that have not yet moved into Phase 36 detail drawers.

### Phase 31 hub retired as a visible surface

The Phase 31 hub is marked as a retired visible surface. Its support code remains available for compatibility, but Phase 34+ is now the preferred admin interface.

### System / QA retirement note

The Phase 37 controller adds a System / QA note showing how many legacy surfaces remain hidden/fallback-only. This helps future sessions understand that legacy tools are intentionally retained during the transition.

## Not removed yet

Phase 37 does not delete:

- action cards that still own safe mutation controls;
- Phase 31 support files;
- Sveltia files;
- legacy database tables;
- old admin modules that are still needed by fallback tools.

## Current admin architecture

```text
Dashboard
  → Admin workspace entry
    → Single admin shell
      → Canonical pages
        → Phase 36 tables / drawers
        → Show existing tools fallback for unmigrated actions
```

## Known limitations

- Some fallback tools are still required for approve/verify/update mutations.
- Drawer actions are not yet connected to Supabase RPCs.
- Legacy code still runs to generate fallback tools.
- Full deletion should wait until Phase 38+ action migration and manual QA.

## Smoke checks

After signing in as admin:

1. Open dashboard.
2. Confirm only one admin entry point is visible: Admin workspace.
3. Confirm old standalone admin cards are not visible directly on the dashboard.
4. Open Admin workspace.
5. Visit Sign-ups, Attendance, Training, Reports, Audit, Notifications, and System / QA.
6. Expand `Show existing tools` where present.
7. Confirm existing mutation tools are still reachable.
8. Close the admin workspace and confirm the dashboard remains uncluttered.
9. Confirm non-admin users do not see the admin workspace entry.

## Next phase

Phase 38 should migrate row-level actions into detail drawers:

```text
Sign-up review actions
Attendance verification/rejection actions
Training completion/no-show actions
Referral status workflow
Points adjustment workflow, if policy-approved
```

Only after that should fallback action cards be deleted.

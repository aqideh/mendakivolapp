# Phase 36 — Table Queues and Detail Drawers

Status: implemented as the third phase of the single-admin-interface consolidation track.

## Purpose

Phase 36 replaces basic canonical-page previews with reusable admin tables and a detail drawer pattern for the main queues.

This phase is intentionally read-focused. Row-level mutations remain in collapsed legacy tools until each action can be migrated safely and tested against Supabase RPC behaviour.

## Files added / changed

```text
assets/phase-thirty-six-admin-tables.css
assets/phase-thirty-six-admin-tables.js
assets/phase-thirty-five-canonical-admin-pages.js
index.html
docs/phase-thirty-six-admin-table-queues.md
```

`index.html` now loads:

```text
assets/phase-thirty-six-admin-tables.css
assets/phase-thirty-six-admin-tables.js
```

before the Phase 35 canonical page renderer and Phase 34 shell.

## Implemented

### Reusable table layer

Added a table layer with:

- search field;
- status/type filter;
- basic sort selector;
- result counts;
- clickable rows;
- consistent status badges;
- shared empty state.

### Detail drawer

Clicking a table row opens a right-side detail drawer that shows:

- normalised record fields;
- raw source record JSON;
- a note that mutations still live in legacy tools until action migration is complete.

### Canonical pages using Phase 36 tables

The Phase 35 renderer now delegates these pages to Phase 36 where possible:

```text
Sign-ups
Attendance
Training
Referrals
Points
Audit
```

Implemented tables:

- Sign-ups: opportunity sign-up review table.
- Attendance: attendance review table.
- Training: training sign-up/session table.
- Referrals: referral queue table where local referral records are exposed.
- Points: points ledger table where local points records are exposed.
- Audit: placeholder keeps existing RPC-backed audit card as fallback until audit rows are exposed to the shared table layer.

### Legacy fallback preserved

Existing cards remain available under:

```text
Show existing tools
```

This preserves existing review/action flows while the table layer becomes the default read surface.

## Current limitations

- Row-level actions are not yet migrated into the drawer.
- Audit still depends on the existing audit card because shared audit row data is not exposed yet.
- Referral/points tables depend on existing local store helpers where available; otherwise they render empty and rely on fallback tools.
- Sorting is intentionally basic and client-side.
- Tables are suitable for pilot-scale data; server-side pagination remains a production follow-up.

## Smoke checks

After signing in as admin:

1. Open Admin workspace.
2. Open Sign-ups and confirm table appears.
3. Search/filter the Sign-ups table.
4. Click a sign-up row and confirm the drawer opens.
5. Open Attendance and confirm table appears.
6. Click an attendance row and confirm details/raw JSON appear.
7. Open Training and confirm sign-up/session table appears.
8. Open Referrals and Points; confirm table or empty state appears without errors.
9. Open Audit and confirm fallback audit card remains accessible.
10. Expand `Show existing tools` on each page and confirm legacy action cards are still available.

## Next phase

Phase 37 should remove or retire duplicated legacy admin surfaces only after manual QA confirms:

- Phase 34 shell opens reliably.
- Phase 35 canonical pages cover all workflows.
- Phase 36 tables/drawers make queues readable.
- Legacy action flows remain reachable during transition.

Phase 37 should not remove action functionality until drawer-based mutations are implemented or explicitly deferred.

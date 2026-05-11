# Phase 35 — Canonical Admin Pages

Status: implemented as the second phase of the single-admin-interface consolidation track.

## Purpose

Phase 35 makes the Phase 34 admin shell useful as the primary admin surface. Instead of showing only mounted legacy cards, the shell now renders canonical page content for each admin workflow and keeps legacy tools behind a collapsed fallback section.

This reduces clutter without prematurely deleting existing operational tools.

## Files added / changed

```text
assets/phase-thirty-five-canonical-admin-pages.css
assets/phase-thirty-five-canonical-admin-pages.js
assets/phase-thirty-four-admin-shell.js
docs/phase-thirty-five-canonical-admin-pages.md
```

`index.html` now loads:

```text
assets/phase-thirty-five-canonical-admin-pages.css
assets/phase-thirty-five-canonical-admin-pages.js
```

before:

```text
assets/phase-thirty-four-admin-shell.js
```

so the shell can call the canonical renderer.

## Implemented

### Canonical page hook

`assets/phase-thirty-four-admin-shell.js` now checks for:

```js
window.MENDAKIPhase35CanonicalAdminPages.render(area, host, context)
```

If the Phase 35 renderer handles the page, the shell uses the canonical page layout. If not, it falls back to the Phase 34 legacy-card mounting behaviour.

### Legacy tools moved behind collapsed fallback sections

For each canonical page, existing admin cards remain available under:

```text
Show existing tools
```

This keeps current functionality reachable while avoiding a large card dump as the first thing admins see.

### Canonical pages added

Phase 35 adds first-pass canonical pages for:

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

### Summary and preview patterns

The following pages now show structured summaries and previews before legacy tools:

- Home: urgent work queues and navigation cards.
- Content: content/static site ownership guidance.
- Opportunities: opportunity catalogue preview with session counts.
- Sign-ups: opportunity sign-up queue preview.
- Attendance: attendance review preview.
- Training: training programme/session preview.

Other pages receive canonical action cards and notes until full workflow tables are implemented.

## Workflow ownership rule

Phase 35 formalises this rule:

```text
One workflow = one canonical owner page
```

Ownership:

| Workflow | Canonical page |
|---|---|
| Static content/news/about/FAQ | Content |
| Opportunity parent listings | Opportunities |
| Opportunity sessions/capacity/codes | Opportunities |
| Opportunity signup review | Sign-ups |
| Attendance review/session-code operations | Attendance |
| Training programmes/sessions | Training |
| Training signups/completion | Training |
| Referral tracking/status | Referrals |
| Points/achievements | Points |
| Reports/CSV export | Reports |
| Audit search/details/export | Audit |
| Notification history/preferences | Notifications |
| QA/readiness/advisor follow-up | System / QA |

## Current limitations

Phase 35 is still not the final admin rewrite.

- Queue previews are read-only summaries, not full action tables.
- Existing legacy tools still perform many actions.
- Detail drawers are not implemented yet.
- Table-level search/filter/sort remains Phase 36.
- Some canonical pages are action-card placeholders until their legacy cards are rewritten.

## Smoke checks

After signing in as an admin:

1. Open Dashboard.
2. Open Admin workspace.
3. Confirm canonical Home page appears with summary/action cards.
4. Open Opportunities and confirm a catalogue preview appears before fallback tools.
5. Open Sign-ups and confirm queue preview appears before fallback tools.
6. Open Attendance and confirm attendance preview appears before fallback tools.
7. Open Training and confirm training preview appears before fallback tools.
8. Confirm legacy tools are collapsed behind `Show existing tools`.
9. Expand fallback tools and confirm the old cards still function.
10. Confirm non-admin users do not see the admin shell.

## Next phase

Phase 36 should implement:

```text
Table Queues and Detail Drawers
```

The priority is to replace previews and legacy cards with real tables/actions for:

- sign-ups;
- attendance;
- training signups/completion;
- referrals;
- points;
- audit.

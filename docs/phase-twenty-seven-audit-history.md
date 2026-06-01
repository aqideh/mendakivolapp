# Phase 27 — Audit History UI

This phase adds an admin-facing audit history viewer.

## Implemented

### Database layer

Added migration:

- `supabase/migrations/202605110004_phase_twenty_seven_audit_ui.sql`

The migration creates a canonical audit table if it does not already exist:

- `app_audit_logs`

It also adds RPCs:

- `record_app_audit_log(...)`
- `get_admin_audit_logs(...)`
- `get_admin_audit_filter_options()`

The read RPCs are admin-only through `current_app_user_is_admin()`.

Important: previous handoff notes mentioned an audit backend, but the repo search did not surface the exact table/function names. This phase uses `app_audit_logs` as the canonical audit table. If production Supabase already has a different audit table, map or migrate that data into `app_audit_logs`, or adapt the RPC before applying.

### Frontend audit viewer

Added module:

- `assets/audit-history.js`

Admins now get an Audit history dashboard card with:

- date filters;
- action type filter;
- entity/table filter;
- actor email filter;
- target email filter;
- row limit selector;
- result list;
- details drawer;
- metadata JSON viewer;
- CSV export.

### Loader

`assets/admin-attendance-code-view.js` now loads:

- `assets/pre-phase-urgent-fixes.js`
- `assets/referrals.js`
- `assets/gamification.js`
- `assets/reports.js`
- `assets/audit-history.js`

## Supabase setup required

Apply the migration:

```sql
supabase/migrations/202605110004_phase_twenty_seven_audit_ui.sql
```

If an older audit backend exists under another table name, reconcile it before relying on the dashboard viewer.

## Manual QA checklist

### Access control

1. Sign in as a non-admin volunteer.
2. Confirm the Audit history card is not shown.
3. Sign in as an admin.
4. Confirm the Audit history card appears.

### Audit row creation

1. From SQL or an app RPC, call `record_app_audit_log(...)` with a test event.
2. Confirm a row appears in `app_audit_logs`.
3. Open the dashboard and click Refresh.
4. Confirm the row appears in the list.

### Filters

1. Add several rows with different action/entity values.
2. Filter by action type.
3. Filter by entity type.
4. Filter by actor email.
5. Filter by target email.
6. Filter by date range.
7. Confirm results match expectations.

### Details drawer

1. Select an audit row.
2. Confirm details show action, entity, actor, target, summary, and metadata.
3. Confirm metadata renders as formatted JSON.

### CSV export

1. Load audit rows.
2. Click Export CSV.
3. Confirm a CSV downloads.
4. Confirm JSON metadata exports as a JSON string.

## Current limitations

- The viewer is read-only.
- Existing business actions are not yet comprehensively wired to call `record_app_audit_log(...)`.
- No dedicated audit page yet; the card still lives inside the dense dashboard layout.
- No deep links from audit events to related app records yet.
- No pagination beyond a 500-row limit selector.
- If production already has a differently named audit table, schema reconciliation is required.

## Roadmap impact

- Phase 28 notification polish can generate audit rows for notification preference changes.
- Phase 29 session-aware attendance validation should audit code-validation and admin review events.
- Phase 31 admin UX refinement should move audit history into a dedicated admin page.
- Phase 32 QA should include audit access-control, filtering, and CSV export tests.
- Phase 33 production readiness should review audit retention, security, and sensitive metadata handling.

# Phase 18 closure note

> Supersession note: This phase describes earlier prototype behavior and is superseded by the YM Hub/Salesforce product boundary in `docs/product-intent.md`. Opportunity sign-up creation, lifecycle state, capacity, and waitlist authority belong to YM Hub/Salesforce. Supabase opportunity sign-up writes and local/demo sign-up behavior described here are historical prototype context only unless explicitly reapproved and documented.

Phase 18 is now closed for implementation on the `expansion` branch, subject to running the SQL migrations in Supabase and completing browser QA.

## Completed scope

### Phase 18A — Auth and production access hardening

Implemented:

- Supabase sign-in mode.
- Supabase create-account mode.
- Supabase password-reset mode.
- Local demo auth preservation when Supabase is not configured.
- New Supabase users continue to default to the `volunteer` role.
- Admin/super-admin assignment remains a trusted backend/database operation, not a public UI action.

### Phase 18B — Authoritative write-path cleanup

Implemented:

- Opportunity sign-up creation waits for Supabase RPC success.
- Opportunity cancellation now uses the audited `cancel_opportunity_signup` RPC through the Phase 18 frontend guard.
- Opportunity admin review waits for Supabase RPC success.
- Training registration now waits for Supabase RPC success through the Phase 18 frontend guard.
- Training cancellation now uses the audited `cancel_training_signup` RPC.
- Training lifecycle review waits for Supabase RPC success.
- Attendance check-in/check-out now uses Supabase-mode interception and writes before local UI success.
- Attendance admin review now uses `review_attendance_claim_transactional` through Supabase-mode interception.
- Failed Supabase writes no longer silently create successful local production state for these guarded flows.

Historical note: Supabase opportunity sign-up writes listed above are no longer the product boundary. YM Hub/Salesforce owns authoritative volunteer opportunity sign-ups. Training and attendance support remain separate in-app capabilities unless the product-intent documentation changes.

Local/demo mode remains available for non-Supabase configurations.

### Phase 18C — Audit logging and admin accountability

Implemented:

- `app_audit_logs` table.
- `log_app_audit_event(...)` helper.
- Admin-only audit log read policy.
- No direct public/client audit-log insert grant.
- Audited opportunity sign-up creation, reactivation, review, and cancellation.
- Audited training sign-up creation, reactivation, review, and cancellation.
- Audited transactional attendance review.
- Audited failed attendance-code attempts.
- Audited attendance-code upsert.
- Generic admin helper for content edit audit events.
- Generic admin helper for notification audit events.

## Migration order

Run existing migrations in order through Phase 17, then run:

```sql
\i db/phase-eighteen-audit-logging.sql
\i db/phase-eighteen-completion.sql
```

## QA required before treating Phase 18 as production-ready

1. Supabase SQL migration run succeeds without enum/function conflicts.
2. Volunteer can create an account and verify/sign in.
3. Password reset email flow works with configured Supabase redirect URL.
4. Volunteer opportunity sign-up creates an audit row.
5. Volunteer opportunity cancellation creates an audit row.
6. Admin opportunity review creates an audit row and respects capacity rules.
7. Volunteer training sign-up creates an audit row.
8. Volunteer training cancellation creates an audit row.
9. Admin training lifecycle review creates an audit row and notification.
10. Attendance check-in/check-out persists to Supabase before UI success.
11. Admin attendance review is transactional and creates an audit row.
12. Failed attendance-code attempts create audit rows without storing submitted codes.
13. Non-admin users cannot query `app_audit_logs`.
14. Admin users can query `app_audit_logs`.
15. Local demo mode still works when Supabase config is disabled.

Historical QA note: opportunity sign-up QA in this list is prototype context. Current product QA should verify YM Hub/Salesforce redirect behavior and ensure no in-app opportunity sign-up creation is restored unless the product boundary changes.

## Deliberately deferred to later phases

These are no longer Phase 18 blockers:

- Admin-visible audit history UI. This belongs with admin UX/reporting work.
- Full notification preference/history polish. This belongs to the notification polish phase.
- Waitlist auto-promotion. This belongs to the waitlist automation phase.
- Proper `app_opportunity_sessions` modelling. This belongs to the session model phase.
- Referral and gamification features. These depend on stable lifecycle/audit foundations.

## Notes

The frontend completion guard lives in `assets/data-store.js` so it is registered early, before legacy local-first phase handlers. In Supabase mode it intercepts key lifecycle click/submit events and calls the authoritative RPC/table write first. In local/demo mode it does not interfere.

Do not use this historical note to justify new Supabase-backed opportunity sign-up ownership. Follow `docs/product-intent.md` and `docs/ai-development-guide.md` for current product direction.

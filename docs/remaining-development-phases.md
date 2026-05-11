# Remaining Development Phases

Last updated: 2026-05-11

This document captures the remaining development phases for the MENDAKI Volunteer Hub as of the current `expansion` branch. It is intended as a working reference for future development, QA, and production-readiness planning.

## Current state summary

The application started as a static GitHub Pages / CMS-oriented app, but the current `expansion` branch is now Supabase-backed. The repository README should be updated because it still describes the app as static-only and says there is no server-side database.

The active production-style data currently lives mainly in the `app_*` Supabase tables, including:

- `app_users`
- `app_opportunities`
- `app_opportunity_sessions`
- `app_opportunity_signups`
- `app_attendance_claims`
- `app_training_sessions`
- `app_training_signups`
- `app_notifications`
- `app_attendance_codes`
- `app_audit_logs`
- `app_referral_codes`
- `app_referrals`
- `app_points_ledger`
- `app_achievements`
- `app_user_achievements`
- `app_notification_preferences`

There are also earlier normalized tables such as `opportunities`, `opportunity_sessions`, `opportunity_signups`, `attendance_claims`, `trainings`, and `training_signups`. At the time of review, those older normalized tables existed but were not carrying active app data. This creates ambiguity and should be resolved before production hardening.

## Priority order

1. Stabilise data architecture.
2. Build a cleaner data access layer.
3. Harden admin workflows.
4. Complete the attendance lifecycle.
5. Enforce capacity and waitlist rules.
6. Clean up authentication and roles.
7. Refine the notification system.
8. Decide the training lifecycle depth.
9. Add QA checks and regression coverage.
10. Refresh documentation and deployment guidance.

---

## Phase 1: Stabilise data architecture

Decide whether the canonical backend schema is the current `app_*` table set or the older normalized table set.

### Why this matters

The current app code is mostly using `app_*` tables, while the older normalized tables still exist. If future development targets the wrong table set, the UI can appear empty even though data exists elsewhere.

### Deliverables

- Formally mark the canonical schema.
- Either keep `app_*` as canonical or migrate cleanly to the normalized tables.
- Remove, archive, or clearly document deprecated table paths.
- Update code comments where modules rely on canonical tables.
- Add a short schema ownership note to the repository.

### Recommended outcome

For speed, keep the current `app_*` tables as canonical until the app stabilises. Consider a later schema migration only after the data access layer is cleaner.

---

## Phase 2: Build a cleaner data access layer

The app currently uses many frontend modules that read and write local cached arrays and Supabase rows directly. This has been useful for quick iteration but has caused rendering and sync issues.

### Deliverables

Create a clear data access layer for:

- opportunities
- opportunity sessions
- opportunity sign-ups
- attendance claims
- training sessions
- training sign-ups
- notifications
- referrals
- gamification and points
- admin reviews

Each domain should expose predictable methods such as:

- `list...()`
- `refresh...()`
- `save...()`
- `review...()`
- `subscribe...()` or event hooks where needed

### Goals

- Components should not directly manipulate local cached arrays unless through the data layer.
- Supabase persistence and local cache refresh should follow one consistent pattern.
- Mutation functions should return structured results such as `{ ok, data, reason }`.
- Loading, empty, and error states should be explicit.

### High priority note

This should happen before any major backend migration or major UI expansion. Direct `localStorage` and Supabase access across modules makes future changes fragile.

---

## Phase 3: Harden admin workflows

The admin interface is now functional, but it needs stronger workflow handling and clearer states.

### Current admin areas

- Opportunity sign-up queue
- Attendance verification queue
- Training management
- Referral review
- Points and achievements
- Notifications
- Audit/system tools

### Deliverables

- Add visible loading states for admin queues.
- Add explicit refresh controls for sign-ups and attendance.
- Show distinct empty states for:
  - no records exist
  - filters hide records
  - user lacks admin role
  - Supabase fetch failed
- Add clearer modal copy for review decisions.
- Keep admin review actions in centered modals rather than raw drawers.
- Ensure every review action writes an audit entry.
- Ensure review buttons cannot double-submit.

### Specific sign-up queue needs

- Show status clearly: `pending_review`, `confirmed`, `waitlisted`, `declined`, `cancelled`, `completed`.
- Include opportunity/session context.
- Include capacity context once capacity enforcement is complete.

### Specific attendance queue needs

- Show whether the item is:
  - newly submitted
  - clarification requested
  - volunteer responded
  - verified
  - adjusted
  - rejected
- Make the clarification response visible to admin.
- Allow final verification after a volunteer clarification response.

---

## Phase 4: Complete attendance lifecycle

Attendance is one of the most important production flows because it affects verification, hours, points, and volunteer records.

### Target lifecycle

```text
confirmed sign-up
→ check in
→ check out
→ submitted
→ verified / adjusted / clarification_requested / rejected
→ if clarification_requested: volunteer responds
→ submitted again
→ final admin decision
→ completed sign-up + points awarded
```

### Deliverables

- Make attendance review transactional.
- Ensure attendance claim status and opportunity sign-up status update together where required.
- Prevent duplicate attendance claims for the same sign-up.
- When attendance is verified or adjusted, update:
  - attendance claim
  - sign-up completion status
  - verified hours
  - points ledger
  - achievements, if applicable
  - notification to volunteer
  - audit log
- When clarification is requested:
  - require admin message
  - notify volunteer with admin message
  - allow volunteer response
  - notify admin after volunteer response
  - return claim to `submitted` or a clearly reviewable state

### Recent progress

A clarification flow has been added:

- Admin must enter a message before requesting clarification.
- Volunteer receives a notification with the admin message.
- Volunteer can submit a clarification response.
- Response is stored on the attendance claim.

Remaining work is to add admin notification and improve admin queue display for “volunteer responded”.

---

## Phase 5: Enforce capacity and waitlist rules

The UI already exposes statuses such as Confirmed and Waitlisted. The backend should consistently enforce those states.

### Deliverables

- Define whether capacity is enforced at opportunity level, session level, or both.
- Enforce capacity during volunteer sign-up.
- Enforce capacity during admin confirmation.
- Auto-suggest waitlist if a session is full.
- Prevent over-confirming through admin actions.
- Show capacity counts in admin views.
- Decide whether waitlisted volunteers should be auto-promoted when slots open.

### Relevant statuses

- `pending_review`
- `confirmed`
- `waitlisted`
- `declined`
- `cancelled`
- `completed`

---

## Phase 6: Clean up authentication and roles

The app currently has Supabase roles, but also has legacy/demo-style role assumptions in parts of the frontend.

### Deliverables

- Remove fallback/demo admin detection before production.
- Use Supabase-backed role claims or `app_users.role` consistently.
- Keep RLS as the real enforcement layer.
- Add a controlled process to create or promote admins.
- Define role capabilities clearly.

### Suggested roles

- `volunteer`
- `admin`
- `super_admin`
- optional future role: `facilitator`

### Important note

Known-admin email auto-assignment is useful during development, but should not be the long-term production role management model.

---

## Phase 7: Refine notifications

Notifications exist and are actively used, but they need stronger templates, routing, and deduplication rules.

### Deliverables

- Define notification types and message templates.
- Add action routing for each notification type.
- Avoid duplicate notification spam.
- Ensure admin receives notifications for:
  - new opportunity sign-up
  - attendance submitted
  - volunteer clarification response
  - training sign-up or completion review
- Ensure volunteers receive notifications for:
  - sign-up confirmed
  - sign-up waitlisted
  - sign-up declined
  - attendance verified
  - attendance adjusted
  - attendance clarification requested
  - attendance rejected
  - points awarded
  - achievement unlocked
- Decide how notification preferences should apply to admin/system-critical messages.

---

## Phase 8: Decide training lifecycle depth

Training currently appears simpler than opportunity sign-ups. That may be correct, but the decision should be explicit.

### Option A: Keep training simple

Use statuses such as:

- `registered`
- `cancelled`
- `completed`
- `waitlisted`
- `declined`
- `no_show`

This is suitable if training is open registration.

### Option B: Expand training lifecycle

Add richer lifecycle support:

- approval
- capacity enforcement
- waitlist enforcement
- attendance or completion verification
- points or achievements
- admin review queue

### Recommendation

Keep the training model simple unless MENDAKI needs approval-based training registration or formal training attendance verification.

---

## Phase 9: Add QA checks and regression coverage

The app has many independent JavaScript modules. A lightweight QA process is needed to prevent regressions.

### Manual smoke test checklist

Test as volunteer:

- Sign in.
- View opportunities.
- Sign up for an opportunity.
- View pending sign-up in dashboard.
- Receive sign-up status notification.
- Check in with facilitator code.
- Check out with facilitator code.
- Respond to attendance clarification.
- View verified hours after admin review.

Test as admin:

- Sign in as admin.
- Open Admin workspace.
- View sign-up queue.
- Confirm, waitlist, and decline sign-ups.
- View attendance queue.
- Verify attendance.
- Adjust attendance hours.
- Request clarification with required message.
- Review volunteer clarification response.
- Reject attendance.
- Check audit logs and notifications.

### Automated checks to consider

- Playwright smoke tests for critical flows.
- Console error checks on page load.
- Supabase function existence checks.
- RLS policy sanity checks.
- Test data reset script.

---

## Phase 10: Refresh documentation and deployment guidance

The README is currently out of date and should be rewritten for the current Supabase-backed app.

### Deliverables

- Update `README.md` to describe:
  - Supabase setup
  - GitHub Pages deployment
  - local development
  - required tables/functions
  - admin role setup
  - cache-busting after deployment
- Add `docs/architecture.md`.
- Add `docs/admin-workflows.md`.
- Add `docs/qa-checklist.md`.
- Document database migrations and operational recovery steps.

---

## Production readiness checklist

Before production, confirm:

- [ ] Canonical schema is documented.
- [ ] Deprecated table paths are removed or clearly marked.
- [ ] Data access layer is in place.
- [ ] Admin role assignment is not demo/email-based.
- [ ] Attendance verification is transactional.
- [ ] Capacity and waitlist rules are enforced.
- [ ] Notifications are routed and deduplicated.
- [ ] Audit logs cover admin mutations.
- [ ] Smoke test checklist passes.
- [ ] README and internal docs are current.

## Highest-risk unresolved areas

1. Mixed data architecture (`app_*` tables versus older normalized tables).
2. Direct local cache manipulation across modules.
3. Attendance/sign-up transactional integrity.
4. Production-grade role management.
5. Capacity and waitlist enforcement.
6. Documentation drift.

## Suggested next task

Start with Phase 1 and Phase 2 together:

1. Declare `app_*` tables canonical for the current build.
2. Create a first-pass data access layer for sign-ups and attendance.
3. Refactor admin queues to read through that layer only.

This will reduce the likelihood of future bugs where Supabase contains records but the UI shows empty queues.

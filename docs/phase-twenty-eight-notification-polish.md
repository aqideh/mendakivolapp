# Phase 28 — Notification Polish

This phase improves notification persistence, preferences, grouping, history, and routing.

## Implemented

### Database layer

Added migration:

- `supabase/migrations/202605110005_phase_twenty_eight_notification_polish.sql`

The migration extends or creates `app_notifications` with:

- `group_key`
- `action_url`
- `metadata`

It also adds:

- `app_notification_preferences`

RPCs added:

- `get_my_notification_preferences()`
- `set_my_notification_preference(...)`
- `create_app_notification(...)`
- `get_my_notification_history(...)`
- `mark_my_notifications_read(...)`
- `clear_my_notifications(...)`

### Existing bell improvements

Updated:

- `assets/notifications.js`

Changes:

- Notification creation now tries `create_app_notification(...)` first.
- The RPC path respects notification preferences.
- Grouped notifications use `group_key` to update an existing active notification instead of creating duplicates.
- Fallback direct insert is retained for environments where the migration is not yet applied.
- Notification routing now includes referrals and points/achievements.
- Added helper methods:
  - `notifyReferralAccepted(...)`
  - `notifyPointsAwarded(...)`
  - `notifyAchievementUnlocked(...)`

### Notification history and preferences UI

Added:

- `assets/notification-polish.js`

The dashboard now gets a Notification history card with:

- notification history, including cleared/read rows;
- per-notification mark-read and clear actions;
- mark-all-read and clear-active actions;
- in-app preferences by category:
  - general;
  - opportunities;
  - attendance;
  - training;
  - referrals;
  - points and achievements;
  - admin tasks.

### Loader

`assets/admin-attendance-code-view.js` now loads:

- `assets/pre-phase-urgent-fixes.js`
- `assets/referrals.js`
- `assets/gamification.js`
- `assets/reports.js`
- `assets/audit-history.js`
- `assets/notification-polish.js`

## Supabase setup required

Apply:

```sql
supabase/migrations/202605110005_phase_twenty_eight_notification_polish.sql
```

The UI has fallback behavior, but preferences/history/grouping require this migration.

## Manual QA checklist

### Migration verification

1. Apply the migration.
2. Confirm `app_notifications` has `group_key`, `action_url`, and `metadata`.
3. Confirm `app_notification_preferences` exists.
4. Confirm all notification RPCs are available.

### Preferences

1. Sign in as a volunteer.
2. Open Dashboard.
3. Confirm Notification history card appears.
4. Disable one category, such as points.
5. Trigger or create a notification of that category through `create_app_notification(...)`.
6. Confirm in-app notification is skipped for that category.
7. Re-enable the category and confirm notifications return.

### History

1. Create several notifications for the signed-in user.
2. Confirm they appear in the bell and in the history card.
3. Mark one read from the history card.
4. Clear one notification.
5. Confirm cleared notifications remain visible in history but not in the active bell list.

### Grouping

1. Call `create_app_notification(...)` twice with the same `group_key`.
2. Confirm only one active notification remains for that group.
3. Confirm the title/message update to the latest call.

### Routing

1. Click attendance, training, opportunity, referral, and points notifications.
2. Confirm the app routes to the relevant dashboard area where possible.

### Backward compatibility

1. Temporarily test before migration on a local/dev database.
2. Confirm the old direct insert path still creates basic notifications.

## Current limitations

- Email notifications are only represented as a preference flag; no email delivery service is integrated yet.
- Notification preference categories are fixed in SQL.
- Routing is still coarse; notifications route to dashboard sections, not exact records.
- Points/referral/achievement notification helpers exist, but not every award/conversion path calls them automatically yet.
- Admin task notifications are still local synthetic notices, not persisted rows.
- No notification analytics or delivery audit yet.

## Roadmap impact

- Phase 29 session-aware attendance should trigger clearer attendance notifications for wrong-code/review outcomes where appropriate.
- Phase 31 admin UX refinement should move notification history/preferences into a dedicated settings page.
- Phase 32 QA should include notification preference, grouping, read/clear, and routing regression tests.
- Phase 33 production readiness should decide whether email notifications are required and how notification delivery should be audited.

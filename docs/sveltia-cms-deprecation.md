# Sveltia CMS deprecation

Sveltia CMS is no longer the authoritative admin surface for MENDAKI Volunteer Hub.

## Current status

The old `/admin/` route has been replaced with a static deprecation notice.

The old `admin/config.yml` file is retained only as historical reference for the previous GitHub JSON content workflow.

## Authoritative admin path

Use the signed-in app dashboard admin tools backed by Supabase:

- opportunities: `app_opportunities`
- opportunity sessions: `app_opportunity_sessions`
- training sessions: `app_training_sessions`
- news: `app_news_items`
- opportunity sign-ups: `app_opportunity_signups`
- attendance claims: `app_attendance_claims`
- notifications: `app_notifications`
- audit logs: `app_audit_logs`

## Legacy content files

The JSON files under `content/` should be treated as seed/demo fallback data only:

- `content/data.json`
- `content/opportunities.json`
- `content/trainings.json`
- `content/news.json`

Do not use Sveltia CMS or GitHub JSON edits for production content changes after Supabase is live.

## Production recommendation

After one QA pass confirms Supabase admin editing is complete, remove the legacy CMS files entirely:

- `admin/index.html`
- `admin/config.yml`

Optionally keep `content/` as read-only seed data for local demos or first-run fallback.

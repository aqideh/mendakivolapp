# MENDAKI Volunteer Hub

A mobile-first MENDAKI volunteer web app. The project is expanding from a static content prototype into an in-app volunteer platform with sign-in, dashboard workflows, Supabase-backed data, training, sign-ups, attendance, notifications, reports, and admin tools.

Sveltia CMS has been removed. Content and admin updates should be handled through the app's signed-in dashboard/admin surfaces and the Supabase-backed data layer, not through the legacy `/admin/` route or Git-based CMS configuration.

## What is included

```text
.
├── index.html                    # Public web app shell
├── assets/
│   ├── app.js                    # Data loading, routing, filters, and modals
│   ├── data-access.js            # Data access layer used by the app
│   ├── data-store.js             # Local/static data store helpers
│   ├── supabase-config.js        # Supabase client configuration
│   ├── phase-one-auth.js         # Authentication and profile flow
│   ├── session-management.js     # Session/admin session tools
│   ├── dashboard-pages.js        # Volunteer dashboard screens
│   └── styles.css                # Responsive MENDAKI-themed UI
├── content/
│   ├── data.json                 # Static baseline site content
│   ├── news.json                 # Static baseline news content
│   ├── opportunities.json        # Static baseline opportunity content
│   └── trainings.json            # Static baseline training content
└── .nojekyll                     # Disables Jekyll processing on Pages
```

## Local preview

Run a local web server from the project root. Opening `index.html` directly may block JSON loading in some browsers.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

## Content and admin model

The app now treats the signed-in dashboard/admin tools as the main editing surface. Static JSON files in `content/` remain useful as baseline or seed data, but they are no longer managed by Sveltia CMS.

Current static content files include:

- `content/data.json` for general site settings and about-page content
- `content/news.json` for news items
- `content/opportunities.json` for volunteer opportunities
- `content/trainings.json` for training sessions

When adding expansion features, update the main data access path directly rather than adding compatibility fallbacks around deprecated CMS behaviour.

## Publish to GitHub Pages

1. Push changes to the `main` branch.
2. In GitHub, configure **Settings -> Pages** for the repository's intended deployment source.
3. Keep public deployment data free of confidential or personal information.

## Notes

- Do not restore the legacy Sveltia CMS `/admin/` route.
- Do not reintroduce CMS branch configuration such as `branch: swipe` or `branch: expansion`.
- Keep opportunity, session, training, news, and attendance data models aligned with the app data access layer.
- Avoid putting confidential or personal data in public repository content.

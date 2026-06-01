# MENDAKI Volunteer Hub

A mobile-first MENDAKI volunteer engagement hub. The app supports volunteer news, training opportunities, attendance check-in support, gamification, referrals, and volunteer-manager support tools.

Volunteer opportunity sign-ups are not owned by this app. YM Hub/Salesforce is the source of truth for volunteer opportunity sign-up creation, lifecycle state, capacity, waitlist decisions, and official opportunity participation records. Volunteer opportunity calls to action should route to YM Hub/Salesforce unless the product boundary is explicitly changed and documented.

Supabase is currently prototype infrastructure for this repository. It supports pilot workflows, UI development, and mock/backend experimentation, but it is not the production authority for volunteer opportunity sign-ups.

Sveltia CMS has been removed. Content and admin updates should be handled through the app's signed-in dashboard/admin surfaces and the documented data access path, not through the legacy `/admin/` route or Git-based CMS configuration.

## Product Boundary

Read these documents before changing product behavior:

- `AGENTS.md` for short high-visibility instructions for AI agents and developers.
- `docs/product-intent.md` for the product ownership and source-of-truth boundary.
- `docs/ai-development-guide.md` for AI-assisted development rules.
- `docs/architecture.md` for the current technical architecture direction.

Do not reintroduce in-app volunteer opportunity sign-up creation unless explicitly instructed. Existing Supabase opportunity sign-up tables are prototype/legacy structures or possible future read-only mirrors, not the production source of truth.

Training registrations are separate from volunteer opportunity sign-ups and may remain in-app unless the product-intent documentation changes.

## What is included

```text
.
├── AGENTS.md                     # High-visibility AI/developer guardrails
├── index.html                    # Public web app shell
├── assets/
│   ├── app.js                    # Data loading, routing, filters, and modals
│   ├── data-access.js            # Data access layer used by the app
│   ├── data-store.js             # Local/static data store helpers
│   ├── supabase-config.js        # Prototype Supabase client configuration
│   ├── phase-one-auth.js         # Authentication and profile flow
│   ├── session-management.js     # Session/admin session tools
│   ├── dashboard-pages.js        # Volunteer dashboard screens
│   └── styles.css                # Responsive MENDAKI-themed UI
├── content/
│   ├── data.json                 # Static baseline site content
│   ├── news.json                 # Static baseline news content
│   ├── opportunities.json        # Static baseline opportunity content
│   └── trainings.json            # Static baseline training content
├── docs/
│   ├── product-intent.md         # Product ownership and source-of-truth boundary
│   ├── ai-development-guide.md   # AI-assisted development guide
│   └── architecture.md           # Architecture notes
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

The app treats signed-in dashboard/admin tools as the main editing surface for in-scope app-owned content. Static JSON files in `content/` remain useful as baseline or seed data, but they are no longer managed by Sveltia CMS.

Current static content files include:

- `content/data.json` for general site settings and about-page content
- `content/news.json` for news items
- `content/opportunities.json` for baseline opportunity display content
- `content/trainings.json` for training sessions

When adding expansion features, update the main data access path directly rather than adding compatibility fallbacks around deprecated CMS behaviour.

## Publish to GitHub Pages

1. Push changes to the `main` branch.
2. In GitHub, configure **Settings -> Pages** for the repository's intended deployment source.
3. Keep public deployment data free of confidential or personal information.

## Notes

- Do not restore the legacy Sveltia CMS `/admin/` route.
- Do not reintroduce CMS branch configuration such as `branch: swipe` or `branch: expansion`.
- Do not restore in-app volunteer opportunity sign-up creation unless explicitly requested and documented.
- Preserve YM Hub/Salesforce routing for volunteer opportunity CTAs.
- Treat Supabase as prototype infrastructure unless the product-intent docs are updated.
- Keep training, news, attendance support, referrals, gamification, and reporting aligned with the app data access layer.
- Avoid putting confidential or personal data in public repository content.

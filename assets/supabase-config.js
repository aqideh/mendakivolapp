// Copy assets/supabase-config.example.js to this file locally and fill in your Supabase project values.
// Do not commit real production keys if this repository is public.
// For GitHub Pages deployments, inject this file from CI/CD secrets or rotate the publishable key regularly.
// Row Level Security policies must remain the real security boundary.
window.MENDAKI_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
  authRedirectTo: window.location.origin + window.location.pathname
};

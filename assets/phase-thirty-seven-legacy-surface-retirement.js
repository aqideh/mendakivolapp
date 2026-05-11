(() => {
  if (window.__phaseThirtySevenLegacySurfaceRetirementInstalled) return;
  window.__phaseThirtySevenLegacySurfaceRetirementInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }

  const LEGACY_SELECTORS = [
    '[data-phase31-admin-hub]',
    '[data-admin-content-card]',
    '.admin-attendance-card',
    '.admin-training-card',
    '[data-reports-card]',
    '[data-audit-history-card]',
    '.audit-history-card',
    '[data-admin-referrals-card]',
    '.admin-referrals-card',
    '[data-admin-points-card]',
    '.admin-points-card',
    '[data-notification-history-card]',
    '.notification-history-card',
    '[data-notification-settings-card]',
    '[data-phase32-qa-card]',
    '[data-signup-dashboard-card="admin"]',
    '.admin-signup-card',
    '[data-phase31-training-manager]'
  ];

  function classifyLegacySurfaces() {
    if (!isAdmin()) return;
    document.querySelectorAll(LEGACY_SELECTORS.join(',')).forEach(card => {
      if (card.dataset.phase34Entry === 'true' || card.dataset.phase34Shell === 'true') return;
      card.dataset.adminOwned = 'true';
      card.dataset.phase37LegacySurface = 'true';
      if (card.matches('[data-phase31-admin-hub]')) {
        card.dataset.phase34Area = 'system';
        card.dataset.phase37RetiredVisibleSurface = 'true';
      }
    });
  }

  function legacySurfaceCounts() {
    const all = Array.from(document.querySelectorAll('[data-phase37-legacy-surface="true"]'));
    const byArea = all.reduce((acc, card) => {
      const area = card.dataset.phase34Area || 'unassigned';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});
    return { total: all.length, byArea };
  }

  function ensureSystemNote() {
    if (!isAdmin()) return;
    const shell = document.querySelector('[data-phase34-shell]');
    if (!shell || shell.hidden) return;
    const page = shell.querySelector('[data-phase34-page-cards]');
    if (!page || !/system/i.test(shell.textContent || '')) return;
    if (page.querySelector('[data-phase37-retirement-note]')) return;
    const counts = legacySurfaceCounts();
    const note = document.createElement('section');
    note.className = 'phase35-page-note';
    note.dataset.phase37RetirementNote = 'true';
    note.innerHTML = `
      <strong>Legacy surface retirement status</strong><br>
      ${escapeHtml(counts.total)} legacy admin surface(s) are hidden from the main dashboard and retained only inside admin-shell fallback sections.
      <br><span class="dashboard-muted">Next: migrate safe drawer actions, then remove fallback cards that no longer own unique functionality.</span>
    `;
    page.prepend(note);
  }

  function install() {
    classifyLegacySurfaces();
    ensureSystemNote();
  }

  window.MENDAKIPhase37LegacySurfaceRetirement = { install, legacySurfaceCounts };

  document.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(install, 2000);
    window.setTimeout(install, 3400);
  });
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', install);
  window.addEventListener('volunteer-signups-synced', install);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-phase34-area="system"], [data-phase34-open-admin]')) {
      window.setTimeout(install, 200);
    }
  }, true);
})();

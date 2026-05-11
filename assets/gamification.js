(() => {
  let loading = false;
  let awarding = false;
  let summary = null;
  let adminSummary = [];

  const qs = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value || '');

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function session() { return store()?.getSession?.() || null; }
  function signedIn() { return Boolean(client() && session()?.email); }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }

  async function rpc(name, args = {}) {
    const supabase = client();
    if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
    return supabase.rpc(name, args);
  }

  async function awardAvailablePoints() {
    if (!signedIn() || awarding) return null;
    awarding = true;
    try {
      const { data, error } = await rpc('award_available_points');
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Points award backfill unavailable.', error);
      return null;
    } finally {
      awarding = false;
    }
  }

  async function fetchMySummary() {
    const { data, error } = await rpc('get_my_points_summary');
    if (error) throw error;
    summary = data || null;
    return summary;
  }

  async function fetchAdminSummary() {
    if (!isAdmin()) return [];
    const { data, error } = await rpc('get_admin_points_summary');
    if (error) throw error;
    adminSummary = Array.isArray(data) ? data : [];
    return adminSummary;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function reasonLabel(reason) {
    const labels = {
      attendance_verified: 'Verified attendance',
      training_completed: 'Training completed',
      referral_accepted: 'Referral accepted',
      admin_adjustment: 'Admin adjustment'
    };
    return labels[reason] || reason || 'Points update';
  }

  function ensureVolunteerCard() {
    const layout = qs('.dashboard-layout');
    if (!layout || qs('[data-points-card]')) return qs('[data-points-card]');
    const card = document.createElement('section');
    card.className = 'dashboard-card points-card';
    card.dataset.pointsCard = 'true';
    card.dataset.dashboardCardRole = 'opportunities';
    card.innerHTML = renderVolunteerCardBody();
    const referralCard = qs('[data-referral-card]');
    if (referralCard) referralCard.insertAdjacentElement('afterend', card);
    else layout.append(card);
    return card;
  }

  function ensureAdminCard() {
    if (!isAdmin()) return null;
    const layout = qs('.dashboard-layout');
    if (!layout || qs('[data-admin-points-card]')) return qs('[data-admin-points-card]');
    const card = document.createElement('section');
    card.className = 'dashboard-card admin-points-card';
    card.dataset.adminPointsCard = 'true';
    card.dataset.dashboardCardRole = 'admin';
    card.innerHTML = renderAdminCardBody();
    layout.append(card);
    return card;
  }

  function totalPoints() {
    return Number(summary?.total_points || 0);
  }

  function renderVolunteerCardBody() {
    if (!signedIn()) {
      return `
        <div class="section-header">
          <div>
            <p class="eyebrow dark">Achievements</p>
            <h2>Volunteer points</h2>
            <p class="dashboard-muted">Sign in to view points and achievements earned from verified volunteering activity.</p>
          </div>
        </div>
        <button class="button button-primary" type="button" data-auth-open data-auth-entry>Sign in to view points</button>
      `;
    }

    const next = summary?.next_achievement && summary.next_achievement !== null ? summary.next_achievement : null;
    const recent = Array.isArray(summary?.recent_ledger) ? summary.recent_ledger : [];
    const achievements = Array.isArray(summary?.achievements) ? summary.achievements : [];
    const nextCopy = next?.points_required
      ? `${Math.max(Number(next.points_required) - totalPoints(), 0)} points to ${next.title}`
      : 'All current point milestones reached.';

    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Achievements</p>
          <h2>Volunteer points</h2>
          <p class="dashboard-muted">Points are awarded from verified attendance, completed training, and accepted referrals.</p>
        </div>
        <button class="text-button" type="button" data-points-refresh>${loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      <div class="dashboard-stat-grid">
        <div class="dashboard-stat"><strong>${escapeHtml(totalPoints())}</strong><span>Total points</span></div>
        <div class="dashboard-stat"><strong>${escapeHtml(achievements.length)}</strong><span>Achievements</span></div>
      </div>
      <p class="dashboard-muted">${escapeHtml(nextCopy)}</p>
      <div class="milestone-chip-row">
        ${achievements.length ? achievements.map(renderAchievementChip).join('') : '<span class="milestone-chip muted">No achievements yet</span>'}
      </div>
      <div class="points-ledger-list">
        <h3>Recent points</h3>
        ${recent.length ? recent.map(renderLedgerItem).join('') : '<p class="dashboard-muted">No point activity yet.</p>'}
      </div>
    `;
  }

  function renderAchievementChip(item) {
    return `<span class="milestone-chip">${escapeHtml(item.badge_label || item.title)}${item.awarded_at ? ` · ${escapeHtml(formatDate(item.awarded_at))}` : ''}</span>`;
  }

  function renderLedgerItem(item) {
    const meta = `${reasonLabel(item.reason)}${item.created_at ? ` · ${formatDate(item.created_at)}` : ''}`;
    return `
      <div class="admin-content-item">
        <span>
          <strong>${Number(item.points || 0) > 0 ? '+' : ''}${escapeHtml(item.points || 0)} points</strong>
          <span>${escapeHtml(meta)}</span>
        </span>
      </div>
    `;
  }

  function renderAdminCardBody() {
    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Admin</p>
          <h2>Points summary</h2>
          <p class="dashboard-muted">View volunteer point totals and achievement counts.</p>
        </div>
        <button class="text-button" type="button" data-points-refresh>${loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      <div class="admin-content-list page-list">
        ${adminSummary.length ? adminSummary.map(renderAdminRow).join('') : '<div class="admin-content-item"><span>No points recorded yet.</span></div>'}
      </div>
    `;
  }

  function renderAdminRow(item) {
    const name = item.full_name || item.email || 'Volunteer';
    const meta = `${Number(item.total_points || 0)} points · ${Number(item.achievement_count || 0)} achievements`;
    return `
      <div class="admin-content-item">
        <span>
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(meta)}</span>
        </span>
      </div>
    `;
  }

  function render() {
    const volunteerCard = ensureVolunteerCard();
    if (volunteerCard) volunteerCard.innerHTML = renderVolunteerCardBody();
    const adminCard = ensureAdminCard();
    if (adminCard) adminCard.innerHTML = renderAdminCardBody();
  }

  async function sync(options = {}) {
    if (!client()) {
      render();
      return;
    }
    loading = true;
    render();
    try {
      if (signedIn()) {
        if (options.award !== false) await awardAvailablePoints();
        await fetchMySummary().catch(error => console.warn('Could not fetch points summary.', error));
        await fetchAdminSummary().catch(error => console.warn('Could not fetch admin points summary.', error));
      }
    } finally {
      loading = false;
      render();
    }
  }

  function bind() {
    if (window.__gamificationBound) return;
    window.__gamificationBound = true;
    document.addEventListener('click', event => {
      const refresh = event.target.closest('[data-points-refresh]');
      if (refresh) sync({ award: true });
    }, true);
  }

  function scheduleAwardSync() {
    window.setTimeout(() => sync({ award: true }), 350);
  }

  window.MENDAKIGamification = { sync, render, awardAvailablePoints };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    window.setTimeout(() => sync({ award: true }), 1200);
  });
  window.addEventListener('volunteer-auth-ready', () => sync({ award: true }));
  window.addEventListener('volunteer-auth-changed', () => sync({ award: true }));
  window.addEventListener('volunteer-attendance-synced', scheduleAwardSync);
  window.addEventListener('volunteer-training-signups-synced', scheduleAwardSync);
  window.addEventListener('volunteer-signups-synced', () => render());
})();

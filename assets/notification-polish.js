(() => {
  let preferences = [];
  let history = [];
  let loading = false;
  let lastError = '';

  const qs = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value ?? '');

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function session() { return store()?.getSession?.() || null; }
  function signedIn() { return Boolean(client() && session()?.email); }

  function categoryLabel(category) {
    const labels = {
      general: 'General',
      opportunities: 'Opportunities',
      attendance: 'Attendance',
      training: 'Training',
      referrals: 'Referrals',
      points: 'Points and achievements',
      admin: 'Admin tasks'
    };
    return labels[category] || category || 'General';
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  async function rpc(name, args = {}) {
    const supabase = client();
    if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
    return supabase.rpc(name, args);
  }

  async function fetchPreferences() {
    const { data, error } = await rpc('get_my_notification_preferences');
    if (error) throw error;
    preferences = Array.isArray(data) ? data : [];
    return preferences;
  }

  async function fetchHistory() {
    const { data, error } = await rpc('get_my_notification_history', { p_limit: 100, p_include_cleared: true });
    if (error) throw error;
    history = Array.isArray(data) ? data : [];
    return history;
  }

  async function savePreference(category, enabled) {
    const { data, error } = await rpc('set_my_notification_preference', {
      p_category: category,
      p_in_app_enabled: Boolean(enabled),
      p_email_enabled: false
    });
    if (error) throw error;
    if (data?.ok === false) throw new Error(data.reason || 'Could not save preference.');
    await fetchPreferences();
    render();
  }

  async function markHistoryRead(id = null) {
    const args = id ? { p_notification_ids: [id] } : { p_notification_ids: null };
    await rpc('mark_my_notifications_read', args).catch(error => console.warn('Could not mark notifications read.', error));
    await sync();
    if (typeof store()?.fetchNotifications === 'function') store().fetchNotifications();
  }

  async function clearHistory(id = null) {
    const args = id ? { p_notification_ids: [id] } : { p_notification_ids: null };
    await rpc('clear_my_notifications', args).catch(error => console.warn('Could not clear notifications.', error));
    await sync();
    if (typeof store()?.fetchNotifications === 'function') store().fetchNotifications();
  }

  function ensureCard() {
    const layout = qs('.dashboard-layout');
    if (!layout || qs('[data-notification-history-card]')) return qs('[data-notification-history-card]');
    const card = document.createElement('section');
    card.className = 'dashboard-card notification-history-card';
    card.dataset.notificationHistoryCard = 'true';
    card.dataset.dashboardCardRole = 'notifications';
    card.innerHTML = renderCardBody();
    const pointsCard = qs('[data-points-card]');
    if (pointsCard) pointsCard.insertAdjacentElement('afterend', card);
    else layout.append(card);
    return card;
  }

  function renderCardBody() {
    if (!signedIn()) {
      return `
        <div class="section-header">
          <div>
            <p class="eyebrow dark">Notifications</p>
            <h2>Notification history</h2>
            <p class="dashboard-muted">Sign in to view notification history and preferences.</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Notifications</p>
          <h2>Notification history</h2>
          <p class="dashboard-muted">Review recent notifications and choose which categories appear in-app.</p>
        </div>
        <button class="text-button" type="button" data-notification-polish-refresh>${loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      ${lastError ? `<p class="dashboard-muted error">${escapeHtml(lastError)}</p>` : ''}
      <div class="notification-preferences">
        <h3>Preferences</h3>
        <div class="notification-preference-grid">
          ${preferences.length ? preferences.map(renderPreference).join('') : '<p class="dashboard-muted">Preferences unavailable until the Phase 28 migration is applied.</p>'}
        </div>
      </div>
      <div class="notification-history-actions dashboard-actions">
        <button class="button dashboard-secondary" type="button" data-notification-history-read-all ${history.length ? '' : 'disabled'}>Mark all read</button>
        <button class="button dashboard-secondary" type="button" data-notification-history-clear-all ${history.some(item => !item.cleared_at) ? '' : 'disabled'}>Clear active notifications</button>
      </div>
      <div class="admin-content-list page-list notification-history-list">
        ${history.length ? history.map(renderHistoryItem).join('') : '<div class="admin-content-item"><span>No notification history yet.</span></div>'}
      </div>
    `;
  }

  function renderPreference(item) {
    const category = item.category || 'general';
    const checked = item.in_app_enabled !== false;
    return `
      <label class="notification-preference-item">
        <input type="checkbox" data-notification-preference="${escapeHtml(category)}" ${checked ? 'checked' : ''}>
        <span><strong>${escapeHtml(categoryLabel(category))}</strong><small>Show in-app notifications</small></span>
      </label>
    `;
  }

  function renderHistoryItem(item) {
    const cleared = item.cleared_at ? ' · cleared' : '';
    const unread = item.is_read ? '' : ' unread';
    const meta = `${item.notification_type || 'general'} · ${formatDate(item.created_at)}${cleared}`;
    return `
      <div class="admin-content-item notification-history-item${unread}">
        <span>
          <strong>${escapeHtml(item.title || 'Notification')}</strong>
          <span>${escapeHtml(meta)}</span>
          <span>${escapeHtml(item.message || '')}</span>
        </span>
        <div class="signup-admin-actions">
          ${item.is_read ? '' : `<button class="button dashboard-secondary" type="button" data-notification-history-read="${escapeHtml(item.id)}">Mark read</button>`}
          ${item.cleared_at ? '' : `<button class="text-button" type="button" data-notification-history-clear="${escapeHtml(item.id)}">Clear</button>`}
        </div>
      </div>
    `;
  }

  function render() {
    const card = ensureCard();
    if (card) card.innerHTML = renderCardBody();
  }

  async function sync() {
    if (!signedIn()) {
      preferences = [];
      history = [];
      render();
      return;
    }
    loading = true;
    lastError = '';
    render();
    try {
      await fetchPreferences();
      await fetchHistory();
    } catch (error) {
      lastError = error.message || 'Could not load notification history.';
      console.warn('Notification polish sync failed.', error);
    } finally {
      loading = false;
      render();
    }
  }

  function bind() {
    if (window.__notificationPolishBound) return;
    window.__notificationPolishBound = true;
    document.addEventListener('click', event => {
      if (event.target.closest('[data-notification-polish-refresh]')) { sync(); return; }
      const read = event.target.closest('[data-notification-history-read]');
      if (read) { markHistoryRead(read.dataset.notificationHistoryRead); return; }
      const clear = event.target.closest('[data-notification-history-clear]');
      if (clear) { clearHistory(clear.dataset.notificationHistoryClear); return; }
      if (event.target.closest('[data-notification-history-read-all]')) { markHistoryRead(); return; }
      if (event.target.closest('[data-notification-history-clear-all]')) { clearHistory(); }
    }, true);
    document.addEventListener('change', event => {
      const pref = event.target.closest('[data-notification-preference]');
      if (!pref) return;
      savePreference(pref.dataset.notificationPreference, pref.checked).catch(error => {
        lastError = error.message || 'Could not save preference.';
        render();
      });
    }, true);
  }

  window.MENDAKINotificationPolish = { sync, render, fetchPreferences, fetchHistory };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    window.setTimeout(sync, 1800);
  });
  window.addEventListener('volunteer-auth-ready', sync);
  window.addEventListener('volunteer-auth-changed', sync);
})();

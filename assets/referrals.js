(() => {
  const REF_STORAGE_KEY = 'mendaki.volunteer.pendingReferralCode.v1';
  let loading = false;
  let currentCode = '';
  let myReferrals = [];
  let adminReferrals = [];

  const qs = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value || '');

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function session() { return store()?.getSession?.() || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function signedIn() { return Boolean(client() && session()?.email); }

  function exposeStoreHelpers() {
    const dataStore = store();
    if (!dataStore || dataStore.__phase40ReferralHelpersInstalled) return;
    dataStore.__phase40ReferralHelpersInstalled = true;
    dataStore.getReferrals = () => (isAdmin() ? adminReferrals : myReferrals).slice();
    dataStore.getAdminReferrals = () => adminReferrals.slice();
    dataStore.getMyReferrals = () => myReferrals.slice();
  }

  function captureReferralFromUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const hashParams = new URLSearchParams(String(window.location.hash || '').split('?')[1] || '');
    const value = params.get('ref') || params.get('referral') || hashParams.get('ref') || hashParams.get('referral') || '';
    const code = normaliseCode(value);
    if (code) localStorage.setItem(REF_STORAGE_KEY, code);
    return code;
  }

  function normaliseCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
  }

  function pendingReferralCode() {
    return normaliseCode(localStorage.getItem(REF_STORAGE_KEY) || '');
  }

  function referralLink() {
    if (!currentCode) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('ref', currentCode);
    url.hash = 'dashboard';
    return url.toString();
  }

  async function rpc(name, args = {}) {
    const supabase = client();
    if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
    return supabase.rpc(name, args);
  }

  async function ensureReferralCode() {
    const { data, error } = await rpc('ensure_my_referral_code');
    if (error) throw error;
    currentCode = String(data || '');
    return currentCode;
  }

  async function acceptPendingReferral() {
    const code = pendingReferralCode();
    if (!code || !signedIn()) return null;
    const { data, error } = await rpc('accept_referral_code', { p_code: code });
    if (error) return { ok: false, reason: error.message };
    if (data?.ok || ['already_referred', 'self_referral', 'invalid_code'].includes(data?.reason)) {
      localStorage.removeItem(REF_STORAGE_KEY);
    }
    return data;
  }

  async function fetchMyReferrals() {
    const { data, error } = await rpc('get_my_referrals');
    if (error) throw error;
    myReferrals = Array.isArray(data) ? data : [];
    return myReferrals;
  }

  async function fetchAdminReferrals() {
    if (!isAdmin()) return [];
    const { data, error } = await rpc('get_admin_referrals');
    if (error) throw error;
    adminReferrals = Array.isArray(data) ? data : [];
    return adminReferrals;
  }

  function statusLabel(status) {
    const labels = {
      accepted: 'Accepted',
      converted: 'Converted',
      cancelled: 'Cancelled',
      duplicate: 'Duplicate'
    };
    return labels[status] || status || 'Unknown';
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return '';
  }

  function displayDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function ensureVolunteerCard() {
    const layout = qs('.dashboard-layout');
    if (!layout || qs('[data-referral-card]')) return qs('[data-referral-card]');
    const card = document.createElement('section');
    card.className = 'dashboard-card referral-card';
    card.dataset.referralCard = 'true';
    card.dataset.dashboardCardRole = 'opportunities';
    card.innerHTML = renderVolunteerCardBody();
    const home = qs('[data-dashboard-app-home]');
    if (home) home.insertAdjacentElement('afterend', card);
    else layout.append(card);
    return card;
  }

  function ensureAdminCard() {
    if (!isAdmin()) return null;
    const layout = qs('.dashboard-layout');
    if (!layout || qs('[data-admin-referrals-card]')) return qs('[data-admin-referrals-card]');
    const card = document.createElement('section');
    card.className = 'dashboard-card admin-referrals-card';
    card.dataset.adminReferralsCard = 'true';
    card.dataset.dashboardCardRole = 'admin';
    card.innerHTML = renderAdminCardBody();
    layout.append(card);
    return card;
  }

  function renderVolunteerCardBody() {
    if (!signedIn()) {
      const pending = pendingReferralCode();
      return `
        <div class="section-header">
          <div>
            <p class="eyebrow dark">Invite friends</p>
            <h2>Referral invite</h2>
            <p class="dashboard-muted">${pending ? `Referral code ${escapeHtml(pending)} is saved. Sign in or create an account to accept it.` : 'Sign in to get your referral link and invite friends to volunteer with you.'}</p>
          </div>
        </div>
        <button class="button button-primary" type="button" data-auth-open data-auth-entry>Sign in to use referrals</button>
      `;
    }

    const link = referralLink();
    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Invite friends</p>
          <h2>Referral invite</h2>
          <p class="dashboard-muted">Share your referral link with friends who want to volunteer with MENDAKI.</p>
        </div>
        <button class="text-button" type="button" data-referral-refresh>${loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      <div class="referral-code-panel">
        <span>Your code</span>
        <strong>${escapeHtml(currentCode || 'Generating...')}</strong>
      </div>
      <label class="referral-link-field">
        <span class="dashboard-muted">Referral link</span>
        <input readonly value="${escapeHtml(link || '')}" data-referral-link-input>
      </label>
      <div class="dashboard-actions">
        <button class="button button-primary" type="button" data-referral-copy ${link ? '' : 'disabled'}>Copy link</button>
        <button class="button dashboard-secondary" type="button" data-referral-share ${link ? '' : 'disabled'}>Share</button>
      </div>
      <div class="referral-list">
        <h3>Your referrals</h3>
        ${myReferrals.length ? myReferrals.map(renderMyReferral).join('') : '<p class="dashboard-muted">No accepted referrals yet.</p>'}
      </div>
      <p class="dashboard-muted">Referral tracking prepares the future points system. Points are not awarded yet.</p>
    `;
  }

  function renderMyReferral(item) {
    return `
      <div class="admin-content-item">
        <span>
          <strong>${escapeHtml(item.referred_name || item.referred_email || 'Referred volunteer')}</strong>
          <span>${escapeHtml(statusLabel(item.status))}${item.accepted_at ? ` · ${escapeHtml(displayDate(item.accepted_at))}` : ''}</span>
        </span>
      </div>
    `;
  }

  function renderAdminCardBody() {
    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Admin</p>
          <h2>Referral tracking</h2>
          <p class="dashboard-muted">View accepted referrals for pilot operations and future points attribution.</p>
        </div>
        <button class="text-button" type="button" data-referral-refresh>${loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      <div class="admin-content-list page-list">
        ${adminReferrals.length ? adminReferrals.map(renderAdminReferral).join('') : '<div class="admin-content-item"><span>No referrals recorded yet.</span></div>'}
      </div>
    `;
  }

  function renderAdminReferral(item) {
    const referrer = item.referrer_name || item.referrer_email || 'Unknown referrer';
    const referred = item.referred_name || item.referred_email || 'Unknown referred user';
    const meta = `${statusLabel(item.status)} · ${item.referral_code || ''}${item.accepted_at ? ` · ${displayDate(item.accepted_at)}` : ''}`;
    return `
      <div class="admin-content-item">
        <span>
          <strong>${escapeHtml(referrer)} → ${escapeHtml(referred)}</strong>
          <span>${escapeHtml(meta)}</span>
        </span>
      </div>
    `;
  }

  function render() {
    exposeStoreHelpers();
    const volunteerCard = ensureVolunteerCard();
    if (volunteerCard) volunteerCard.innerHTML = renderVolunteerCardBody();
    const adminCard = ensureAdminCard();
    if (adminCard) adminCard.innerHTML = renderAdminCardBody();
  }

  async function sync() {
    exposeStoreHelpers();
    if (!client()) {
      render();
      return;
    }
    loading = true;
    render();
    try {
      if (signedIn()) {
        await ensureReferralCode().catch(error => console.warn('Referral code unavailable.', error));
        await acceptPendingReferral().catch(error => console.warn('Could not accept pending referral.', error));
        await fetchMyReferrals().catch(error => console.warn('Could not fetch referrals.', error));
        await fetchAdminReferrals().catch(error => console.warn('Could not fetch admin referrals.', error));
      }
    } finally {
      loading = false;
      render();
      window.dispatchEvent(new CustomEvent('mendaki-referrals-synced', { detail: { myReferrals, adminReferrals } }));
    }
  }

  async function copyReferralLink() {
    const link = referralLink();
    if (!link) return;
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link);
    else qs('[data-referral-link-input]')?.select();
  }

  async function shareReferralLink() {
    const link = referralLink();
    if (!link) return;
    if (navigator.share) {
      await navigator.share({
        title: 'Volunteer with MENDAKI',
        text: 'Join me on the MENDAKI Volunteer Hub.',
        url: link
      }).catch(() => null);
    } else {
      await copyReferralLink();
    }
  }

  function bind() {
    if (window.__referralsBound) return;
    window.__referralsBound = true;
    captureReferralFromUrl();
    document.addEventListener('click', event => {
      const copy = event.target.closest('[data-referral-copy]');
      if (copy) { copyReferralLink(); return; }
      const share = event.target.closest('[data-referral-share]');
      if (share) { shareReferralLink(); return; }
      const refresh = event.target.closest('[data-referral-refresh]');
      if (refresh) { sync(); }
    }, true);
  }

  window.MENDAKIReferrals = {
    sync,
    render,
    captureReferralFromUrl,
    getMyReferrals: () => myReferrals.slice(),
    getAdminReferrals: () => adminReferrals.slice()
  };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    exposeStoreHelpers();
    window.setTimeout(sync, 900);
  });
  window.addEventListener('volunteer-auth-ready', sync);
  window.addEventListener('volunteer-auth-changed', sync);
  window.addEventListener('volunteer-signups-synced', render);
})();

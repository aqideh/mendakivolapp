(() => {
  const OPPORTUNITY_TABLE = 'app_opportunities';
  const YM_HUB_SIGNUP_URL = 'https://www.mendaki.org.sg/login';

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function client() { return store().authState.supabase; }
  function session() { return store().getSession(); }
  function appState() { return state; }
  function isSupabaseReady() { return Boolean(client() && session()?.authUserId); }

  function requireSupabaseClient() {
    const activeClient = client();
    if (!activeClient) throw new Error('Supabase is not configured. Check assets/supabase-config.js.');
    return activeClient;
  }

  function openYmHubSignup() {
    const target = window.open(YM_HUB_SIGNUP_URL, '_blank', 'noopener');
    if (target) target.opener = null;
  }

  function rowToOpportunity(row) {
    return {
      id: row.id,
      type: row.type || 'ad-hoc',
      category: row.category || 'community-volunteering',
      title: row.title || '',
      description: row.description || '',
      requirements: row.requirements || '',
      time: row.time || '',
      location: row.location || '',
      commitment: row.commitment || '',
      status: row.status || 'Open',
      capacity: Number(row.capacity || 0),
      waitlistEnabled: row.waitlist_enabled !== false,
      defaultHours: Number(row.default_hours || 0),
      startsAt: row.starts_at || '',
      endsAt: row.ends_at || '',
      photo: row.photo || '',
      photoAlt: row.photo_alt || ''
    };
  }

  function opportunityToRow(opp) {
    return {
      id: String(opp.id),
      type: opp.type || 'ad-hoc',
      category: opp.category || 'community-volunteering',
      title: opp.title || '',
      description: opp.description || '',
      requirements: opp.requirements || '',
      time: opp.time || '',
      location: opp.location || '',
      commitment: opp.commitment || '',
      status: opp.status || 'Open',
      capacity: Number(opp.capacity || 0),
      waitlist_enabled: opp.waitlistEnabled !== false,
      default_hours: Number(opp.defaultHours || 0),
      starts_at: opp.startsAt || null,
      ends_at: opp.endsAt || null,
      photo: opp.photo || null,
      photo_alt: opp.photoAlt || null,
      source: 'app',
      updated_at: new Date().toISOString()
    };
  }

  async function fetchSupabaseOpportunities() {
    const activeClient = requireSupabaseClient();
    const { data, error } = await activeClient
      .from(OPPORTUNITY_TABLE)
      .select('id, type, category, title, description, requirements, time, location, commitment, status, capacity, waitlist_enabled, default_hours, starts_at, ends_at, photo, photo_alt')
      .order('title', { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data.map(rowToOpportunity) : [];
  }

  function refreshOpportunityViews() {
    if (typeof renderHomeOpportunities === 'function') renderHomeOpportunities();
    if (typeof renderOpportunities === 'function') renderOpportunities();
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
  }

  function renderOpportunitySyncError(error) {
    console.error('Opportunity sync failed', error);
    const message = error?.message || 'Could not load opportunities from Supabase.';
    const shell = document.querySelector('#opportunities-grid');
    const empty = document.querySelector('#opportunities-empty');
    if (shell) {
      shell.replaceChildren();
      shell.className = 'container opportunity-swipe-shell';
      const notice = document.createElement('div');
      notice.className = 'empty-state';
      notice.textContent = `Could not load opportunities from Supabase: ${message}`;
      shell.append(notice);
    }
    if (empty) empty.hidden = true;
  }

  async function applySupabaseOpportunities() {
    if (!appState().data) return { ok: false, count: 0 };
    try {
      const opportunities = await fetchSupabaseOpportunities();
      appState().data.opportunities = opportunities;
      refreshOpportunityViews();
      window.dispatchEvent(new CustomEvent('volunteer-opportunities-synced'));
      return { ok: true, count: opportunities.length };
    } catch (error) {
      renderOpportunitySyncError(error);
      throw error;
    }
  }

  async function syncOpportunityToSupabase(opp) {
    if (!client() || !session()?.email || !store().isAdmin()) return { ok: false, reason: 'Admin access required.' };
    const { error } = await client().from(OPPORTUNITY_TABLE).upsert(opportunityToRow(opp), { onConflict: 'id' });
    if (error) throw error;
    return { ok: true };
  }

  async function syncOpportunitiesToSupabase(opportunities = []) {
    if (!Array.isArray(opportunities) || !opportunities.length) return { ok: true, count: 0 };
    if (!client() || !store().isAdmin()) return { ok: false, reason: 'Admin access required.' };
    const { error } = await client().from(OPPORTUNITY_TABLE).upsert(opportunities.map(opportunityToRow), { onConflict: 'id' });
    if (error) throw error;
    return { ok: true, count: opportunities.length };
  }

  function setButtonBusy(button, busy, label = 'Saving...') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent || '';
      button.disabled = true;
      button.textContent = label;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  function showSignupNotice(message, variant = 'success') {
    if (typeof phaseTwoShowModalNotice === 'function') phaseTwoShowModalNotice(message, variant);
    else if (variant === 'error') window.alert(message);
  }

  async function cancelAuthoritativeSignup(button) {
    setButtonBusy(button, true, 'Cancelling...');
    const result = await dataAccess().cancelOpportunitySignup(button.dataset.cancelSignup);
    setButtonBusy(button, false);
    if (!result.ok) {
      showSignupNotice(`Could not cancel this sign-up: ${result.reason || 'Please try again.'}`, 'error');
      return;
    }
    showSignupNotice('Your sign-up was cancelled.');
  }

  async function reviewAuthoritativeSignup(button) {
    const signupId = button.dataset.signupId;
    const status = button.dataset.adminSignupStatus;
    if (!signupId || !status) return;
    setButtonBusy(button, true, 'Saving...');
    const result = await dataAccess().reviewOpportunitySignup(signupId, status, {});
    setButtonBusy(button, false);
    if (!result.ok) {
      window.alert(`Could not update sign-up status: ${result.reason || 'Please try again.'}`);
      return;
    }
    refreshVisibleSignupViews();
  }

  function refreshVisibleSignupViews() {
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof renderOpportunities === 'function') renderOpportunities();
  }

  async function syncSignupsAndRefresh() {
    if (!isSupabaseReady()) return;
    await dataAccess().refreshOpportunitySignups();
    refreshVisibleSignupViews();
  }

  function installOpportunityLifecycleHandlers() {
    if (window.__opportunityLifecycleHandlersInstalled) return;
    window.__opportunityLifecycleHandlersInstalled = true;
    document.addEventListener('click', event => {
      const signupButton = event.target.closest('[data-signup-opportunity], [data-ymhub-signup]');
      if (signupButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openYmHubSignup();
        return;
      }

      if (!isSupabaseReady()) return;
      const cancelButton = event.target.closest('[data-cancel-signup]');
      const adminStatusButton = event.target.closest('[data-admin-signup-status]');
      const target = cancelButton || adminStatusButton;
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (cancelButton) cancelAuthoritativeSignup(cancelButton);
      else reviewAuthoritativeSignup(adminStatusButton);
    }, true);
  }

  Object.assign(store(), {
    fetchSupabaseOpportunities,
    applySupabaseOpportunities,
    syncOpportunityToSupabase,
    syncOpportunitiesToSupabase
  });

  installOpportunityLifecycleHandlers();

  window.addEventListener('volunteer-auth-ready', () => {
    applySupabaseOpportunities().catch(() => {});
    syncSignupsAndRefresh();
  });
  window.addEventListener('volunteer-auth-changed', () => {
    applySupabaseOpportunities().catch(() => {});
    syncSignupsAndRefresh();
  });
  window.addEventListener('volunteer-signups-synced', refreshVisibleSignupViews);

  document.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(() => applySupabaseOpportunities().catch(() => {}), 120);
    window.setTimeout(syncSignupsAndRefresh, 180);
  });
})();

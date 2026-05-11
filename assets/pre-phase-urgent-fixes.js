(() => {
  let signupSessionSyncing = false;

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function currentSession() { return store()?.getSession?.() || null; }
  function appState() {
    try { return typeof state !== 'undefined' ? state : null; }
    catch (error) { return null; }
  }

  function rowToSignup(row) {
    return {
      id: row.id,
      opportunityId: String(row.opportunity_id || ''),
      sessionId: row.session_id || '',
      email: row.email || '',
      volunteerName: row.volunteer_name || 'Volunteer',
      title: row.title || '',
      type: row.type || '',
      category: row.category || '',
      time: row.time || '',
      location: row.location || '',
      commitment: row.commitment || '',
      hours: Number(row.hours || 0),
      status: row.status || 'pending_review',
      signedUpAt: row.signed_up_at || '',
      reviewedAt: row.reviewed_at || '',
      reviewedBy: row.reviewed_by_email || '',
      adminNotes: row.admin_notes || '',
      confirmedAt: row.confirmed_at || '',
      waitlistedAt: row.waitlisted_at || '',
      declinedAt: row.declined_at || '',
      cancelledAt: row.cancelled_at || '',
      completedAt: row.completed_at || '',
      verifiedHours: Number(row.verified_hours || 0),
      updatedAt: row.updated_at || ''
    };
  }

  async function fetchSignupsWithSessionIds() {
    const supabase = client();
    if (!supabase || !currentSession()?.email || signupSessionSyncing) return store()?.getOpportunitySignups?.() || [];
    signupSessionSyncing = true;
    try {
      const { data, error } = await supabase
        .from('app_opportunity_signups')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) return store()?.getOpportunitySignups?.() || [];
      const signups = Array.isArray(data) ? data.map(rowToSignup) : [];
      store()?.saveOpportunitySignups?.(signups);
      if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
      if (typeof phaseThreeRender === 'function') phaseThreeRender();
      return signups;
    } finally {
      signupSessionSyncing = false;
    }
  }

  function installSignupSessionIdPatch() {
    const api = store();
    if (!api || api.__sessionIdFetchPatched) return;
    const originalFetch = api.fetchSupabaseOpportunitySignups;
    if (typeof originalFetch !== 'function') return;
    api.__sessionIdFetchPatched = true;
    api.fetchSupabaseOpportunitySignups = async function patchedFetchSupabaseOpportunitySignups(...args) {
      await originalFetch.apply(this, args).catch(() => []);
      return fetchSignupsWithSessionIds();
    };
  }

  function installFindOpportunityPatch() {
    try {
      if (typeof findOpportunity !== 'function' || window.__stringOpportunityIdPatchInstalled) return;
      window.__stringOpportunityIdPatchInstalled = true;
      findOpportunity = function patchedFindOpportunity(id) {
        const currentState = appState();
        return currentState?.data?.opportunities?.find(item => String(item.id) === String(id));
      };
      window.findOpportunity = findOpportunity;
    } catch (error) {
      console.warn('Could not patch opportunity lookup.', error);
    }
  }

  function sessionsForOpportunity(opportunityId) {
    return (window.MENDAKIOpportunitySessions?.all?.() || window.__mendakiOpportunitySessions || [])
      .filter(item => String(item.opportunityId) === String(opportunityId));
  }

  function sessionRank(item) {
    const status = String(item.status || 'Open').toLowerCase();
    const closedPenalty = status === 'closed' ? 3 : status === 'draft' ? 2 : 0;
    if (closedPenalty) return closedPenalty;
    if (!item.startsAt) return 1;
    const time = new Date(item.startsAt).getTime();
    if (Number.isNaN(time)) return 1;
    return time >= Date.now() ? 0 : 2;
  }

  function preferredSessionForOpportunity(opportunityId) {
    const list = sessionsForOpportunity(opportunityId);
    if (!list.length) return null;
    return list.slice().sort((a, b) => {
      const rank = sessionRank(a) - sessionRank(b);
      if (rank !== 0) return rank;
      const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const aValid = Number.isFinite(aTime);
      const bValid = Number.isFinite(bTime);
      if (sessionRank(a) === 2 && aValid && bValid) return bTime - aTime;
      if (aValid !== bValid) return aValid ? -1 : 1;
      if (aValid && bValid && aTime !== bTime) return aTime - bTime;
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    })[0] || null;
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  function applyPreferredSessionOverlay() {
    const currentState = appState();
    if (!currentState?.data?.opportunities?.length) return;
    currentState.data.opportunities = currentState.data.opportunities.map(opportunity => {
      const session = preferredSessionForOpportunity(opportunity.id);
      if (!session) return opportunity;
      return {
        ...opportunity,
        sessionId: session.id,
        sessionTitle: session.title,
        startsAt: session.startsAt || opportunity.startsAt || '',
        endsAt: session.endsAt || opportunity.endsAt || '',
        defaultHours: Number(session.defaultHours || opportunity.defaultHours || 0),
        capacity: Number(session.capacity || opportunity.capacity || 0),
        waitlistEnabled: session.waitlistEnabled !== false,
        location: session.location || opportunity.location || '',
        sessionTimeLabel: session.startsAt
          ? `${formatDateTime(session.startsAt)}${session.endsAt ? ` - ${formatDateTime(session.endsAt)}` : ''}`
          : ''
      };
    });
    if (typeof renderHomeOpportunities === 'function') renderHomeOpportunities();
    if (typeof renderOpportunities === 'function') renderOpportunities();
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
  }

  function installPreferredSessionPatch() {
    const api = window.MENDAKIOpportunitySessions;
    if (!api || api.__preferredSessionPatched) return;
    api.__preferredSessionPatched = true;
    api.defaultForOpportunity = preferredSessionForOpportunity;
    api.applyOverlay = applyPreferredSessionOverlay;
    applyPreferredSessionOverlay();
  }

  function renderAdminTypePicker() {
    const workspace = document.querySelector('[data-content-workspace]');
    const back = document.querySelector('[data-content-back]');
    if (!workspace) return;
    workspace.innerHTML = `
      <section class="admin-content-step">
        <h3>What would you like to manage?</h3>
        <p>Choose one content area. Each area opens as its own page inside this module.</p>
        <div class="admin-content-choice-grid">
          <button class="admin-content-choice" type="button" data-content-type="opportunity">
            <strong>Opportunities</strong>
            <span>Create or edit volunteer opportunity listings.</span>
          </button>
          <button class="admin-content-choice" type="button" data-content-type="training">
            <strong>Training</strong>
            <span>Create or edit volunteer training sessions.</span>
          </button>
          <button class="admin-content-choice" type="button" data-content-type="news">
            <strong>News</strong>
            <span>Create or edit newsfeed items.</span>
          </button>
        </div>
      </section>
    `;
    if (back) back.hidden = true;
  }

  function installAdminHierarchyBackPatch() {
    if (window.__adminHierarchyBackPatchInstalled) return;
    window.__adminHierarchyBackPatchInstalled = true;
    document.addEventListener('click', event => {
      const back = event.target.closest('[data-content-back]');
      if (!back) return;
      if (!document.querySelector('[data-opportunity-hierarchy]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      renderAdminTypePicker();
    }, true);
  }

  function installAll() {
    installFindOpportunityPatch();
    installSignupSessionIdPatch();
    installPreferredSessionPatch();
    installAdminHierarchyBackPatch();
  }

  installAdminHierarchyBackPatch();
  document.addEventListener('DOMContentLoaded', () => window.setTimeout(installAll, 0));
  window.addEventListener('volunteer-auth-ready', () => window.setTimeout(() => {
    installAll();
    fetchSignupsWithSessionIds();
  }, 0));
  window.addEventListener('volunteer-auth-changed', () => window.setTimeout(() => {
    installAll();
    fetchSignupsWithSessionIds();
  }, 0));
  window.addEventListener('volunteer-signups-synced', () => window.setTimeout(fetchSignupsWithSessionIds, 0));
  window.addEventListener('volunteer-opportunity-sessions-synced', () => window.setTimeout(() => {
    installPreferredSessionPatch();
    applyPreferredSessionOverlay();
  }, 0));
})();

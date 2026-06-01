(() => {
  const SESSION_TABLE = 'app_opportunity_sessions';

  function store() {
    return window.VolunteerDataStore;
  }

  function client() {
    return store()?.authState?.supabase || null;
  }

  function sessionReady() {
    return Boolean(client());
  }

  function appState() {
    try {
      return typeof state !== 'undefined' ? state : null;
    } catch (error) {
      return null;
    }
  }

  function rowToSession(row) {
    return {
      id: row.id,
      opportunityId: String(row.opportunity_id || ''),
      title: row.title || '',
      startsAt: row.starts_at || '',
      endsAt: row.ends_at || '',
      defaultHours: Number(row.default_hours || 0),
      capacity: Number(row.capacity || 0),
      waitlistEnabled: row.waitlist_enabled !== false,
      facilitatorCode: row.facilitator_code || '',
      location: row.location || '',
      status: row.status || 'Open',
      source: row.source || 'app',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function currentSessions() {
    return Array.isArray(window.__mendakiOpportunitySessions)
      ? window.__mendakiOpportunitySessions
      : [];
  }

  function setSessions(sessions) {
    window.__mendakiOpportunitySessions = Array.isArray(sessions) ? sessions : [];
    window.dispatchEvent(new CustomEvent('volunteer-opportunity-sessions-synced'));
    return window.__mendakiOpportunitySessions;
  }

  function sessionsForOpportunity(opportunityId) {
    return currentSessions().filter(item => String(item.opportunityId) === String(opportunityId));
  }

  function defaultSessionForOpportunity(opportunityId) {
    return sessionsForOpportunity(opportunityId)
      .slice()
      .sort((a, b) => {
        const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) return aTime - bTime;
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      })[0] || null;
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  function enhanceOpportunityWithSession(opportunity) {
    const session = defaultSessionForOpportunity(opportunity.id);
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
  }

  function applySessionOverlay() {
    const currentState = appState();
    if (!currentState?.data?.opportunities?.length || !currentSessions().length) return;
    currentState.data.opportunities = currentState.data.opportunities.map(enhanceOpportunityWithSession);
    if (typeof renderHomeOpportunities === 'function') renderHomeOpportunities();
    if (typeof renderOpportunities === 'function') renderOpportunities();
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
  }

  async function fetchSupabaseOpportunitySessions() {
    const supabase = client();
    if (!supabase) return currentSessions();

    const { data, error } = await supabase
      .from(SESSION_TABLE)
      .select('id, opportunity_id, title, starts_at, ends_at, default_hours, capacity, waitlist_enabled, facilitator_code, location, status, source, created_at, updated_at')
      .order('starts_at', { ascending: true, nullsFirst: false });

    if (error) {
      console.warn('Could not load Supabase opportunity sessions.', error);
      return currentSessions();
    }

    const sessions = Array.isArray(data) ? data.map(rowToSession) : [];
    setSessions(sessions);
    applySessionOverlay();
    return sessions;
  }

  function patchSessionIdCaches() {
    const defaultByOpportunity = new Map(currentSessions().map(item => [String(item.opportunityId), item.id]));
    if (!defaultByOpportunity.size) return;

    const signups = store()?.getOpportunitySignups?.() || [];
    let signupsChanged = false;
    const nextSignups = signups.map(signup => {
      if (signup.sessionId || !defaultByOpportunity.has(String(signup.opportunityId))) return signup;
      signupsChanged = true;
      return { ...signup, sessionId: defaultByOpportunity.get(String(signup.opportunityId)) };
    });
    if (signupsChanged) store().saveOpportunitySignups(nextSignups);

    const claims = store()?.getAttendanceClaims?.() || [];
    let claimsChanged = false;
    const nextClaims = claims.map(claim => {
      if (claim.sessionId || !defaultByOpportunity.has(String(claim.opportunityId))) return claim;
      claimsChanged = true;
      return { ...claim, sessionId: defaultByOpportunity.get(String(claim.opportunityId)) };
    });
    if (claimsChanged) store().saveAttendanceClaims(nextClaims);
  }

  async function syncSessionsAndRefresh() {
    if (!sessionReady()) return;
    await fetchSupabaseOpportunitySessions();
    patchSessionIdCaches();
  }

  window.MENDAKIOpportunitySessions = {
    fetch: fetchSupabaseOpportunitySessions,
    all: currentSessions,
    forOpportunity: sessionsForOpportunity,
    defaultForOpportunity: defaultSessionForOpportunity,
    applyOverlay: applySessionOverlay
  };

  window.addEventListener('volunteer-auth-ready', syncSessionsAndRefresh);
  window.addEventListener('volunteer-auth-changed', syncSessionsAndRefresh);
  window.addEventListener('volunteer-opportunities-synced', syncSessionsAndRefresh);
  window.addEventListener('volunteer-opportunity-sessions-synced', patchSessionIdCaches);

  document.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(syncSessionsAndRefresh, 320);
  });
})();

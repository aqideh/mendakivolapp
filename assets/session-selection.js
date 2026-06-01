(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value || '');

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function session() { return store()?.getSession?.() || null; }
  function isReady() { return Boolean(client() && session()?.email); }
  function sessions() { return window.MENDAKIOpportunitySessions?.all?.() || window.__mendakiOpportunitySessions || []; }
  function sessionsForOpportunity(opportunityId) {
    return sessions().filter(item => String(item.opportunityId) === String(opportunityId) && String(item.status || 'Open') !== 'Closed');
  }
  function appData() {
    try { return typeof state !== 'undefined' ? state.data : null; }
    catch (error) { return null; }
  }
  function opportunityById(id) {
    return (appData()?.opportunities || []).find(item => String(item.id) === String(id));
  }
  function profile() { return store()?.getProfile?.() || {}; }

  function formatDateTime(value) {
    if (!value) return 'Date to be confirmed';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  function sessionLabel(item) {
    const title = item.title || 'Session';
    const start = formatDateTime(item.startsAt);
    const end = item.endsAt ? ` - ${formatDateTime(item.endsAt)}` : '';
    return `${title}: ${start}${end}`;
  }

  function selectedSessionId(opportunityId) {
    const input = qs(`input[name="opportunity-session-${CSS.escape(String(opportunityId))}"]:checked`);
    return input?.value || '';
  }

  function enhanceModal(opportunityId) {
    const modal = qs('#modal');
    if (!modal || modal.querySelector('[data-session-picker]')) return;
    const options = sessionsForOpportunity(opportunityId);
    if (options.length <= 1) return;
    const body = modal.querySelector('.modal-body');
    const actions = modal.querySelector('.modal-actions');
    if (!body && !actions) return;

    const picker = document.createElement('section');
    picker.className = 'opportunity-session-picker';
    picker.dataset.sessionPicker = String(opportunityId);
    picker.innerHTML = `
      <h3>Choose a session</h3>
      <p class="dashboard-muted">Select the specific date/time you want to attend.</p>
      <div class="opportunity-session-options">
        ${options.map((item, index) => `
          <label class="opportunity-session-option">
            <input type="radio" name="opportunity-session-${escapeHtml(opportunityId)}" value="${escapeHtml(item.id)}" ${index === 0 ? 'checked' : ''}>
            <span>
              <strong>${escapeHtml(item.title || `Session ${index + 1}`)}</strong>
              <span>${escapeHtml(formatDateTime(item.startsAt))}${item.endsAt ? ` - ${escapeHtml(formatDateTime(item.endsAt))}` : ''}</span>
              <span>${escapeHtml(item.location || 'Location to be confirmed')} · ${escapeHtml(item.defaultHours || 0)}h · Capacity ${escapeHtml(item.capacity || 'Unlimited')}</span>
            </span>
          </label>
        `).join('')}
      </div>
      <p class="session-selected-note" data-session-selected-note>${escapeHtml(sessionLabel(options[0]))}</p>
    `;

    (body || actions).insertAdjacentElement(body ? 'beforeend' : 'beforebegin', picker);
    qsa('input[type="radio"]', picker).forEach(input => {
      input.addEventListener('change', () => {
        const selected = options.find(item => item.id === input.value);
        const note = qs('[data-session-selected-note]', picker);
        if (note && selected) note.textContent = sessionLabel(selected);
      });
    });
  }

  function buildSignupDraft(opportunityId, selectedSession) {
    const current = session();
    const opp = opportunityById(opportunityId);
    if (!current?.email) return { ok: false, reason: 'auth_required' };
    if (!opp) return { ok: false, reason: 'not_found' };
    const existing = store().getOpportunitySignups().find(item => item.email === current.email && String(item.opportunityId) === String(opportunityId));
    return {
      ok: true,
      signup: {
        id: existing?.id || crypto.randomUUID(),
        opportunityId: String(opp.id),
        sessionId: selectedSession?.id || '',
        email: current.email,
        volunteerName: profile()?.name || current.name || 'Volunteer',
        title: opp.title || '',
        type: opp.type || '',
        category: opp.category || '',
        time: selectedSession?.startsAt ? sessionLabel(selectedSession) : opp.time,
        location: selectedSession?.location || opp.location || '',
        commitment: opp.commitment || '',
        hours: Number(selectedSession?.defaultHours || opp.defaultHours || existing?.hours || 0),
        status: 'pending_review',
        signedUpAt: existing?.signedUpAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
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

  function upsertSignup(saved) {
    const list = store().getOpportunitySignups();
    const index = list.findIndex(item => item.id === saved.id || (item.email === saved.email && String(item.opportunityId) === String(saved.opportunityId) && (!saved.sessionId || item.sessionId === saved.sessionId)));
    if (index >= 0) list[index] = saved;
    else list.push(saved);
    store().saveOpportunitySignups(list);
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
  }

  function setBusy(button, busy) {
    if (!button) return;
    if (busy) {
      button.dataset.sessionOriginalText = button.textContent || '';
      button.disabled = true;
      button.textContent = 'Signing up...';
    } else {
      button.disabled = false;
      if (button.dataset.sessionOriginalText) button.textContent = button.dataset.sessionOriginalText;
      delete button.dataset.sessionOriginalText;
    }
  }

  function showNotice(message, variant = 'success') {
    if (typeof phaseTwoShowModalNotice === 'function') phaseTwoShowModalNotice(message, variant);
    else if (variant === 'error') window.alert(message);
  }

  async function submitSessionSignup(button) {
    const opportunityId = button.dataset.signupOpportunity;
    const sessionId = selectedSessionId(opportunityId);
    if (!sessionId) return false;
    const selected = sessionsForOpportunity(opportunityId).find(item => item.id === sessionId);
    if (!selected) return false;
    const draft = buildSignupDraft(opportunityId, selected);
    if (!draft.ok) {
      if (draft.reason === 'auth_required' && typeof phaseOneOpenAuth === 'function') phaseOneOpenAuth();
      else showNotice('Could not create this sign-up. Please try again.', 'error');
      return true;
    }
    setBusy(button, true);
    const { data, error } = await client().rpc('create_opportunity_session_signup_with_capacity', {
      p_signup_id: draft.signup.id,
      p_opportunity_id: draft.signup.opportunityId,
      p_session_id: selected.id,
      p_volunteer_name: draft.signup.volunteerName
    });
    setBusy(button, false);
    if (error) {
      showNotice(`Could not create this session sign-up: ${error.message}`, 'error');
      return true;
    }
    const saved = rowToSignup(data);
    upsertSignup(saved);
    if (typeof store().fetchSupabaseOpportunitySignups === 'function') await store().fetchSupabaseOpportunitySignups().catch(() => null);
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof renderOpportunities === 'function') renderOpportunities();
    button.textContent = window.VolunteerDataStore?.statusLabels?.getStatusLabel?.(saved.status, 'signup') || saved.status;
    button.disabled = true;
    showNotice(`You signed up for ${sessionLabel(selected)}.`);
    return true;
  }

  function bind() {
    if (window.__sessionSelectionBound) return;
    window.__sessionSelectionBound = true;
    document.addEventListener('click', event => {
      const card = event.target.closest('[data-opp-id]');
      if (card) window.setTimeout(() => enhanceModal(card.dataset.oppId), 0);
    }, true);

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-signup-opportunity]');
      if (!button || !isReady()) return;
      const opportunityId = button.dataset.signupOpportunity;
      if (!selectedSessionId(opportunityId)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      submitSessionSignup(button);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', bind);
  window.addEventListener('volunteer-opportunity-sessions-synced', () => {
    const modalSignup = qs('#modal [data-signup-opportunity]');
    if (modalSignup) enhanceModal(modalSignup.dataset.signupOpportunity);
  });
})();

(() => {
  const TABLE = 'app_opportunity_sessions';
  const qs = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value || '');
  const state = { sessions: [], editingId: '' };

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function appData() {
    try { return typeof window.state !== 'undefined' ? window.state.data : (typeof state !== 'undefined' ? state.data : null); }
    catch (error) { return null; }
  }
  function opportunities() { return appData()?.opportunities || []; }

  function toLocal(row) {
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

  function toRow(value) {
    return {
      id: value.id || crypto.randomUUID(),
      opportunity_id: String(value.opportunityId || ''),
      title: value.title || null,
      starts_at: value.startsAt || null,
      ends_at: value.endsAt || null,
      default_hours: Number(value.defaultHours || 0),
      capacity: Number(value.capacity || 0),
      waitlist_enabled: value.waitlistEnabled !== false,
      facilitator_code: value.facilitatorCode || null,
      location: value.location || null,
      status: value.status || 'Open',
      source: 'app',
      updated_at: new Date().toISOString()
    };
  }

  function formatDateTime(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  async function fetchSessions() {
    const supabase = client();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('starts_at', { ascending: true, nullsFirst: false });
    if (error) {
      console.warn('Could not fetch opportunity sessions.', error);
      showNotice(`Could not fetch sessions: ${error.message}`, true);
      return state.sessions;
    }
    state.sessions = Array.isArray(data) ? data.map(toLocal) : [];
    window.__mendakiOpportunitySessions = state.sessions;
    window.dispatchEvent(new CustomEvent('volunteer-opportunity-sessions-synced'));
    render();
    return state.sessions;
  }

  function ensureCard() {
    if (!isAdmin()) return null;
    const layout = qs('.dashboard-layout');
    if (!layout) return null;
    let card = qs('[data-session-admin-card]');
    if (card) return card;
    card = document.createElement('section');
    card.className = 'dashboard-card session-admin-card';
    card.dataset.sessionAdminCard = 'true';
    card.innerHTML = `
      <div class="section-header">
        <div>
          <h2>Opportunity sessions</h2>
          <p class="dashboard-muted">Manage session dates, capacity, locations, and facilitator codes for each opportunity.</p>
        </div>
        <button class="text-button" type="button" data-session-refresh>Refresh</button>
      </div>
      <div class="session-admin-grid">
        <form class="session-form" data-session-form>
          <input type="hidden" name="id">
          <label>Opportunity<select name="opportunityId" required></select></label>
          <label>Session title<input name="title" placeholder="Optional session label"></label>
          <div class="session-form-row">
            <label>Starts at<input name="startsAt" type="datetime-local"></label>
            <label>Ends at<input name="endsAt" type="datetime-local"></label>
          </div>
          <div class="session-form-row">
            <label>Default hours<input name="defaultHours" type="number" min="0" step="0.25" value="0"></label>
            <label>Capacity<input name="capacity" type="number" min="0" step="1" value="0"></label>
          </div>
          <div class="session-form-row">
            <label>Facilitator code<input name="facilitatorCode" inputmode="numeric" pattern="\\d{4}" maxlength="4" placeholder="4-digit code"></label>
            <label>Status<select name="status"><option>Open</option><option>Closed</option><option>Draft</option></select></label>
          </div>
          <label>Location<input name="location" placeholder="Session-specific location"></label>
          <label class="session-toggle-row"><input name="waitlistEnabled" type="checkbox" checked> Enable waitlist</label>
          <div class="session-admin-actions">
            <button class="button button-primary" type="submit">Save session</button>
            <button class="button dashboard-secondary" type="button" data-session-reset>New session</button>
          </div>
          <div data-session-notice></div>
        </form>
        <div class="session-list" data-session-list></div>
      </div>
    `;
    layout.append(card);
    populateOpportunityOptions();
    return card;
  }

  function populateOpportunityOptions() {
    const select = qs('[data-session-form] select[name="opportunityId"]');
    if (!select) return;
    const current = select.value;
    select.innerHTML = opportunities().map(opp => `<option value="${escapeHtml(opp.id)}">${escapeHtml(opp.title || opp.id)}</option>`).join('');
    if (current) select.value = current;
  }

  function dateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function readForm(form) {
    const data = new FormData(form);
    return {
      id: String(data.get('id') || '').trim(),
      opportunityId: String(data.get('opportunityId') || '').trim(),
      title: String(data.get('title') || '').trim(),
      startsAt: String(data.get('startsAt') || '').trim(),
      endsAt: String(data.get('endsAt') || '').trim(),
      defaultHours: Number(data.get('defaultHours') || 0),
      capacity: Number(data.get('capacity') || 0),
      facilitatorCode: String(data.get('facilitatorCode') || '').trim(),
      location: String(data.get('location') || '').trim(),
      status: String(data.get('status') || 'Open'),
      waitlistEnabled: Boolean(data.get('waitlistEnabled'))
    };
  }

  function validateSession(value) {
    if (!value.opportunityId) return 'Choose an opportunity.';
    if (value.facilitatorCode && !/^\d{4}$/.test(value.facilitatorCode)) return 'Facilitator code must be exactly 4 digits.';
    if (value.startsAt && value.endsAt && new Date(value.endsAt) < new Date(value.startsAt)) return 'End time cannot be before start time.';
    return '';
  }

  async function saveSession(value) {
    const supabase = client();
    if (!supabase || !isAdmin()) return { ok: false, reason: 'Admin Supabase session required.' };
    const validation = validateSession(value);
    if (validation) return { ok: false, reason: validation };
    const row = toRow(value);
    const previous = value.id ? state.sessions.find(item => item.id === value.id) : null;
    const { data, error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' }).select('*').single();
    if (error) return { ok: false, reason: error.message };
    if (typeof supabase.rpc === 'function') {
      await supabase.rpc('log_content_edit', {
        p_entity_table: TABLE,
        p_entity_id: data.id,
        p_previous_state: previous || null,
        p_new_state: data,
        p_metadata: { source: 'session_management_ui', opportunity_id: data.opportunity_id }
      }).catch?.(() => null);
    }
    await fetchSessions();
    resetForm();
    return { ok: true };
  }

  async function deleteSession(id) {
    const supabase = client();
    if (!supabase || !isAdmin()) return;
    const target = state.sessions.find(item => item.id === id);
    if (!target) return;
    if (!window.confirm('Delete this session? Existing sign-ups and attendance records will keep the opportunity but lose this session link.')) return;
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) {
      showNotice(`Could not delete session: ${error.message}`, true);
      return;
    }
    await supabase.rpc('log_content_edit', {
      p_entity_table: TABLE,
      p_entity_id: id,
      p_previous_state: target,
      p_new_state: null,
      p_metadata: { source: 'session_management_ui', deleted: true }
    }).catch?.(() => null);
    await fetchSessions();
    resetForm();
  }

  async function promoteNext(sessionId, opportunityId) {
    const supabase = client();
    if (!supabase || !isAdmin()) return;
    const { data, error } = await supabase.rpc('promote_next_opportunity_waitlist', {
      p_session_id: sessionId || null,
      p_opportunity_id: String(opportunityId || '') || null
    });
    if (error) {
      showNotice(`Promotion failed: ${error.message}`, true);
      return;
    }
    if (!data) showNotice('No waitlisted volunteer was available to promote.');
    else showNotice('Promoted the next waitlisted volunteer.');
    if (typeof store()?.fetchSupabaseOpportunitySignups === 'function') await store().fetchSupabaseOpportunitySignups();
    render();
  }

  function editSession(id) {
    const item = state.sessions.find(session => session.id === id);
    const form = qs('[data-session-form]');
    if (!item || !form) return;
    state.editingId = id;
    form.id.value = item.id;
    form.opportunityId.value = item.opportunityId;
    form.title.value = item.title || '';
    form.startsAt.value = dateTimeLocal(item.startsAt);
    form.endsAt.value = dateTimeLocal(item.endsAt);
    form.defaultHours.value = item.defaultHours || 0;
    form.capacity.value = item.capacity || 0;
    form.facilitatorCode.value = item.facilitatorCode || '';
    form.location.value = item.location || '';
    form.status.value = item.status || 'Open';
    form.waitlistEnabled.checked = item.waitlistEnabled !== false;
    form.querySelector('button[type="submit"]').textContent = 'Update session';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function resetForm() {
    const form = qs('[data-session-form]');
    if (!form) return;
    state.editingId = '';
    form.reset();
    form.id.value = '';
    form.waitlistEnabled.checked = true;
    form.defaultHours.value = 0;
    form.capacity.value = 0;
    form.status.value = 'Open';
    form.querySelector('button[type="submit"]').textContent = 'Save session';
  }

  function showNotice(message, error = false) {
    const host = qs('[data-session-notice]');
    if (!host) return;
    host.innerHTML = `<div class="session-notice ${error ? 'error' : ''}">${escapeHtml(message)}</div>`;
    window.setTimeout(() => { if (host) host.innerHTML = ''; }, 2600);
  }

  function renderList() {
    const list = qs('[data-session-list]');
    if (!list) return;
    const grouped = state.sessions.slice().sort((a, b) => String(a.opportunityId).localeCompare(String(b.opportunityId)) || String(a.startsAt).localeCompare(String(b.startsAt)));
    if (!grouped.length) {
      list.innerHTML = '<div class="session-empty">No opportunity sessions yet. Create the first session from the form.</div>';
      return;
    }
    list.innerHTML = grouped.map(item => {
      const opp = opportunities().find(candidate => String(candidate.id) === String(item.opportunityId));
      return `
        <article class="session-card" data-session-id="${escapeHtml(item.id)}">
          <div class="session-card-header">
            <div>
              <h3>${escapeHtml(item.title || opp?.title || 'Opportunity session')}</h3>
              <p class="dashboard-muted">${escapeHtml(opp?.title || item.opportunityId)}</p>
            </div>
            <span class="badge ${item.status === 'Open' ? 'badge-open' : 'badge-ad-hoc'}">${escapeHtml(item.status)}</span>
          </div>
          <div class="session-meta">
            <span>Starts: ${escapeHtml(formatDateTime(item.startsAt))}</span>
            <span>Ends: ${escapeHtml(formatDateTime(item.endsAt))}</span>
            <span>${escapeHtml(item.defaultHours)}h</span>
            <span>Capacity ${escapeHtml(item.capacity || 'Unlimited')}</span>
            <span>${item.waitlistEnabled ? 'Waitlist on' : 'Waitlist off'}</span>
            ${item.facilitatorCode ? '<span>Code set</span>' : '<span>No code</span>'}
          </div>
          <p class="dashboard-muted">${escapeHtml(item.location || 'No session-specific location')}</p>
          <div class="session-card-actions">
            <button class="button dashboard-secondary" type="button" data-session-edit="${escapeHtml(item.id)}">Edit</button>
            <button class="button dashboard-secondary" type="button" data-session-promote="${escapeHtml(item.id)}" data-session-opportunity="${escapeHtml(item.opportunityId)}">Promote waitlist</button>
            <button class="text-button" type="button" data-session-delete="${escapeHtml(item.id)}">Delete</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function render() {
    const card = ensureCard();
    if (!card) return;
    populateOpportunityOptions();
    renderList();
  }

  function bind() {
    if (window.__sessionManagementBound) return;
    window.__sessionManagementBound = true;
    document.addEventListener('submit', async event => {
      const form = event.target.closest('[data-session-form]');
      if (!form) return;
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const original = submit.textContent;
      submit.disabled = true;
      submit.textContent = 'Saving...';
      const result = await saveSession(readForm(form));
      submit.disabled = false;
      submit.textContent = original;
      showNotice(result.ok ? 'Session saved.' : result.reason, !result.ok);
    });

    document.addEventListener('click', event => {
      const refresh = event.target.closest('[data-session-refresh]');
      if (refresh) { fetchSessions(); return; }
      const reset = event.target.closest('[data-session-reset]');
      if (reset) { resetForm(); return; }
      const edit = event.target.closest('[data-session-edit]');
      if (edit) { editSession(edit.dataset.sessionEdit); return; }
      const remove = event.target.closest('[data-session-delete]');
      if (remove) { deleteSession(remove.dataset.sessionDelete); return; }
      const promote = event.target.closest('[data-session-promote]');
      if (promote) { promoteNext(promote.dataset.sessionPromote, promote.dataset.sessionOpportunity); }
    });
  }

  function init() {
    bind();
    render();
    if (client() && isAdmin()) fetchSessions();
  }

  window.MENDAKISessionManagement = { fetchSessions, render };
  document.addEventListener('DOMContentLoaded', () => window.setTimeout(init, 900));
  window.addEventListener('volunteer-auth-ready', () => window.setTimeout(init, 120));
  window.addEventListener('volunteer-auth-changed', () => window.setTimeout(init, 120));
  window.addEventListener('volunteer-opportunities-synced', () => window.setTimeout(render, 120));
})();

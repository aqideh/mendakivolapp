(() => {
  const SESSION_TABLE = 'app_opportunity_sessions';
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value || '');

  const hierarchyState = {
    selectedOpportunityId: '',
    editingSessionId: ''
  };

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function workspace() { return qs('[data-content-workspace]'); }
  function appData() {
    try { return typeof state !== 'undefined' ? state.data : null; }
    catch (error) { return null; }
  }
  function opportunities() { return appData()?.opportunities || []; }
  function sessions() { return window.MENDAKIOpportunitySessions?.all?.() || window.__mendakiOpportunitySessions || []; }
  function sessionsForOpportunity(opportunityId) {
    return sessions().filter(item => String(item.opportunityId) === String(opportunityId));
  }
  function opportunityById(id) {
    return opportunities().find(item => String(item.id) === String(id));
  }

  function setBackVisible(visible) {
    const back = qs('[data-content-back]');
    if (back) back.hidden = !visible;
  }

  function formValue(form, name) {
    return String(new FormData(form).get(name) || '').trim();
  }

  function dateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function dateTimeLocalToIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function formatDateTime(value) {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  function latestRelevantDate(opp) {
    const related = sessionsForOpportunity(opp.id)
      .map(item => item.startsAt || item.endsAt)
      .filter(Boolean)
      .map(value => new Date(value))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => b - a);
    if (related.length) return related[0];
    const parentDate = opp.startsAt || opp.endsAt || '';
    if (!parentDate) return null;
    const parsed = new Date(parentDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function opportunityPeriodLabel(opp) {
    const date = latestRelevantDate(opp);
    if (!date) return 'No dated sessions yet';
    return date < new Date() ? `Past: ${formatDateTime(date.toISOString())}` : `Upcoming: ${formatDateTime(date.toISOString())}`;
  }

  function sortOpportunitiesForAdmin(items) {
    return items.slice().sort((a, b) => {
      const aDate = latestRelevantDate(a);
      const bDate = latestRelevantDate(b);
      const aPast = aDate ? aDate < new Date() : true;
      const bPast = bDate ? bDate < new Date() : true;
      if (aPast !== bPast) return aPast ? 1 : -1;
      if (aDate && bDate) return aPast ? bDate - aDate : aDate - bDate;
      if (aDate) return -1;
      if (bDate) return 1;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
  }

  async function refreshSessions() {
    if (window.MENDAKIOpportunitySessions?.fetch) {
      await window.MENDAKIOpportunitySessions.fetch().catch(() => null);
      return sessions();
    }
    const supabase = client();
    if (!supabase) return sessions();
    const { data, error } = await supabase.from(SESSION_TABLE).select('*').order('starts_at', { ascending: true, nullsFirst: false });
    if (error) return sessions();
    window.__mendakiOpportunitySessions = Array.isArray(data) ? data.map(rowToSession) : [];
    window.dispatchEvent(new CustomEvent('volunteer-opportunity-sessions-synced'));
    return sessions();
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

  function sessionToRow(value) {
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

  async function saveSession(value) {
    const supabase = client();
    if (!supabase || !isAdmin()) return { ok: false, reason: 'Admin Supabase session required.' };
    if (!value.opportunityId) return { ok: false, reason: 'Choose an opportunity.' };
    if (value.facilitatorCode && !/^\d{4}$/.test(value.facilitatorCode)) return { ok: false, reason: 'Facilitator code must be exactly 4 digits.' };
    if (value.startsAt && value.endsAt && new Date(value.endsAt) < new Date(value.startsAt)) return { ok: false, reason: 'End time cannot be before start time.' };

    const { error } = await supabase.from(SESSION_TABLE).upsert(sessionToRow(value), { onConflict: 'id' });
    if (error) return { ok: false, reason: error.message };
    await refreshSessions();
    return { ok: true };
  }

  async function deleteSession(id) {
    const supabase = client();
    if (!supabase || !isAdmin()) return { ok: false, reason: 'Admin Supabase session required.' };
    const { error } = await supabase.from(SESSION_TABLE).delete().eq('id', id);
    if (error) return { ok: false, reason: error.message };
    await refreshSessions();
    return { ok: true };
  }

  async function promoteNextSession(sessionId, opportunityId) {
    const supabase = client();
    if (!supabase || !isAdmin()) return { ok: false, reason: 'Admin Supabase session required.' };
    const { data, error } = await supabase.rpc('promote_next_opportunity_waitlist', {
      p_session_id: sessionId || null,
      p_opportunity_id: String(opportunityId || '') || null
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, promoted: Boolean(data) };
  }

  function renderOpportunityHierarchy() {
    hierarchyState.selectedOpportunityId = '';
    hierarchyState.editingSessionId = '';
    setBackVisible(true);
    const host = workspace();
    if (!host) return;
    const items = sortOpportunitiesForAdmin(opportunities());
    host.innerHTML = `
      <section class="admin-content-step" data-opportunity-hierarchy>
        <p class="eyebrow dark">Opportunities</p>
        <h3>Choose an opportunity to edit</h3>
        <p class="dashboard-muted">Manage parent opportunity details separately from dated session instances. The list includes upcoming, open, closed, and past opportunities.</p>
        <div class="admin-content-choice-grid two">
          <button class="admin-content-choice" type="button" data-opportunity-create>
            <strong>Create new opportunity</strong>
            <span>Add a parent opportunity listing, then add sessions if it has dated sign-ups.</span>
          </button>
          <button class="admin-content-choice" type="button" data-opportunity-refresh>
            <strong>Refresh opportunities and sessions</strong>
            <span>Reload Supabase content before editing.</span>
          </button>
        </div>
        <div class="admin-content-list page-list" data-opportunity-admin-list>
          ${items.length ? items.map(renderOpportunityListItem).join('') : '<div class="admin-content-item"><span>No opportunities loaded.</span></div>'}
        </div>
      </section>
    `;
  }

  function renderOpportunityListItem(opp) {
    const count = sessionsForOpportunity(opp.id).length;
    const meta = `${opp.id} · ${opp.type || 'type unset'} · ${opp.status || 'Open'} · ${opportunityPeriodLabel(opp)} · ${count} session${count === 1 ? '' : 's'}`;
    return `
      <div class="admin-content-item editable" data-opportunity-admin-item="${escapeHtml(opp.id)}">
        <span><strong>${escapeHtml(opp.title || opp.id)}</strong><span>${escapeHtml(meta)}</span></span>
        <div class="signup-admin-actions">
          <button class="button dashboard-secondary" type="button" data-opportunity-edit-details="${escapeHtml(opp.id)}">Edit details</button>
          <button class="button dashboard-secondary" type="button" data-opportunity-edit-sessions="${escapeHtml(opp.id)}">Edit sessions</button>
        </div>
      </div>
    `;
  }

  function renderOpportunityDetailsForm(opp = {}) {
    hierarchyState.selectedOpportunityId = String(opp?.id || '');
    const host = workspace();
    if (!host) return;
    host.innerHTML = `
      <section class="admin-content-step" data-opportunity-details-editor>
        <p class="eyebrow dark">${opp?.id ? 'Edit opportunity details' : 'Create opportunity'}</p>
        <h3>${escapeHtml(opp?.title || 'New opportunity')}</h3>
        <p class="dashboard-muted">These are parent listing details. Use Edit sessions for actual dated sign-up slots, session capacity, session location, and facilitator codes.</p>
        <form class="admin-content-form" data-hierarchy-opportunity-form>
          <label>ID<input name="id" required ${opp?.id ? 'readonly' : ''} value="${escapeHtml(opp?.id || '')}" placeholder="e.g. mentoring-circle-2026"></label>
          <label>Title<input name="title" required value="${escapeHtml(opp?.title || '')}"></label>
          <label>Type<select name="type"><option value="long-term" ${opp?.type === 'long-term' ? 'selected' : ''}>Long-term</option><option value="ad-hoc" ${opp?.type !== 'long-term' ? 'selected' : ''}>Ad-hoc</option></select></label>
          <label>Category<select name="category"><option value="befriender" ${opp?.category === 'befriender' ? 'selected' : ''}>Befriender</option><option value="mentor" ${opp?.category === 'mentor' ? 'selected' : ''}>Mentor</option><option value="facilitator" ${opp?.category === 'facilitator' ? 'selected' : ''}>Facilitator</option><option value="community-volunteering" ${!opp?.category || opp?.category === 'community-volunteering' ? 'selected' : ''}>Community volunteering</option></select></label>
          <label>Status<input name="status" value="${escapeHtml(opp?.status || 'Open')}"></label>
          <label>Fallback capacity<input name="capacity" type="number" min="0" value="${escapeHtml(opp?.capacity || 0)}" placeholder="Use sessions for dated capacity"></label>
          <label class="admin-content-checkbox"><input name="waitlistEnabled" type="checkbox" ${opp?.waitlistEnabled === false ? '' : 'checked'}> Fallback waitlist enabled</label>
          <label>Fallback default hours<input name="defaultHours" type="number" min="0" max="24" step="0.25" value="${escapeHtml(opp?.defaultHours || 0)}"></label>
          <label>Fallback start date/time<input name="startsAt" type="datetime-local" value="${escapeHtml(dateTimeLocal(opp?.startsAt))}"></label>
          <label>Fallback end date/time<input name="endsAt" type="datetime-local" value="${escapeHtml(dateTimeLocal(opp?.endsAt))}"></label>
          <label>Display time<input name="time" value="${escapeHtml(opp?.time || '')}" placeholder="Shown when no session time is available"></label>
          <label>Fallback location<input name="location" value="${escapeHtml(opp?.location || '')}"></label>
          <label>Display commitment<input name="commitment" value="${escapeHtml(opp?.commitment || '')}"></label>
          <label>Description<textarea name="description">${escapeHtml(opp?.description || '')}</textarea></label>
          <label>Requirements<textarea name="requirements">${escapeHtml(opp?.requirements || '')}</textarea></label>
          <div class="session-admin-actions">
            <button class="button button-primary" type="submit">${opp?.id ? 'Save details' : 'Create opportunity'}</button>
            ${opp?.id ? `<button class="button dashboard-secondary" type="button" data-opportunity-edit-sessions="${escapeHtml(opp.id)}">Edit sessions</button>` : ''}
            <button class="button dashboard-secondary" type="button" data-opportunity-list-back>Back to opportunity list</button>
          </div>
          <div class="admin-content-status" data-hierarchy-opportunity-status></div>
        </form>
      </section>
    `;
  }

  function renderSessionForm(opp, session = {}) {
    return `
      <form class="session-form" data-hierarchy-session-form>
        <input type="hidden" name="id" value="${escapeHtml(session?.id || '')}">
        <input type="hidden" name="opportunityId" value="${escapeHtml(opp.id)}">
        <label>Session title<input name="title" value="${escapeHtml(session?.title || '')}" placeholder="Optional session label"></label>
        <div class="session-form-row">
          <label>Starts at<input name="startsAt" type="datetime-local" value="${escapeHtml(dateTimeLocal(session?.startsAt))}"></label>
          <label>Ends at<input name="endsAt" type="datetime-local" value="${escapeHtml(dateTimeLocal(session?.endsAt))}"></label>
        </div>
        <div class="session-form-row">
          <label>Default hours<input name="defaultHours" type="number" min="0" step="0.25" value="${escapeHtml(session?.defaultHours || 0)}"></label>
          <label>Capacity<input name="capacity" type="number" min="0" step="1" value="${escapeHtml(session?.capacity || 0)}"></label>
        </div>
        <div class="session-form-row">
          <label>Facilitator code<input name="facilitatorCode" inputmode="numeric" pattern="\\d{4}" maxlength="4" value="${escapeHtml(session?.facilitatorCode || '')}" placeholder="4-digit code"></label>
          <label>Status<select name="status"><option ${String(session?.status || 'Open') === 'Open' ? 'selected' : ''}>Open</option><option ${session?.status === 'Closed' ? 'selected' : ''}>Closed</option><option ${session?.status === 'Draft' ? 'selected' : ''}>Draft</option></select></label>
        </div>
        <label>Location<input name="location" value="${escapeHtml(session?.location || '')}" placeholder="Session-specific location"></label>
        <label class="session-toggle-row"><input name="waitlistEnabled" type="checkbox" ${session?.waitlistEnabled === false ? '' : 'checked'}> Enable waitlist</label>
        <div class="session-admin-actions">
          <button class="button button-primary" type="submit">${session?.id ? 'Update session' : 'Create session'}</button>
          ${session?.id ? '<button class="button dashboard-secondary" type="button" data-session-new-for-opportunity>New session</button>' : ''}
        </div>
        <div class="admin-content-status" data-hierarchy-session-status></div>
      </form>
    `;
  }

  function renderOpportunitySessionsEditor(opportunityId, editingSessionId = '') {
    const opp = opportunityById(opportunityId);
    const host = workspace();
    if (!host || !opp) return;
    hierarchyState.selectedOpportunityId = String(opportunityId);
    hierarchyState.editingSessionId = String(editingSessionId || '');
    const related = sessionsForOpportunity(opportunityId).slice().sort((a, b) => String(a.startsAt || '').localeCompare(String(b.startsAt || '')));
    const editing = related.find(item => item.id === editingSessionId) || null;
    host.innerHTML = `
      <section class="admin-content-step" data-opportunity-sessions-editor>
        <p class="eyebrow dark">Edit opportunity sessions</p>
        <h3>${escapeHtml(opp.title || opp.id)}</h3>
        <p class="dashboard-muted">Sessions control the actual selectable date/time, capacity, location, facilitator code, and waitlist behavior for this opportunity.</p>
        <div class="session-admin-grid">
          ${renderSessionForm(opp, editing || {})}
          <div class="session-list" data-hierarchy-session-list>
            ${related.length ? related.map(item => renderSessionListItem(item)).join('') : '<div class="session-empty">No sessions yet. Create the first dated session from the form.</div>'}
          </div>
        </div>
        <div class="session-admin-actions">
          <button class="button dashboard-secondary" type="button" data-opportunity-edit-details="${escapeHtml(opp.id)}">Edit opportunity details</button>
          <button class="button dashboard-secondary" type="button" data-opportunity-list-back>Back to opportunity list</button>
        </div>
      </section>
    `;
  }

  function renderSessionListItem(item) {
    return `
      <article class="session-card" data-session-id="${escapeHtml(item.id)}">
        <div class="session-card-header">
          <div>
            <h3>${escapeHtml(item.title || 'Opportunity session')}</h3>
            <p class="dashboard-muted">${escapeHtml(formatDateTime(item.startsAt))}${item.endsAt ? ` - ${escapeHtml(formatDateTime(item.endsAt))}` : ''}</p>
          </div>
          <span class="badge ${item.status === 'Open' ? 'badge-open' : 'badge-ad-hoc'}">${escapeHtml(item.status || 'Open')}</span>
        </div>
        <div class="session-meta">
          <span>${escapeHtml(item.defaultHours || 0)}h</span>
          <span>Capacity ${escapeHtml(item.capacity || 'Unlimited')}</span>
          <span>${item.waitlistEnabled ? 'Waitlist on' : 'Waitlist off'}</span>
          ${item.facilitatorCode ? '<span>Code set</span>' : '<span>No code</span>'}
        </div>
        <p class="dashboard-muted">${escapeHtml(item.location || 'No session-specific location')}</p>
        <div class="session-card-actions">
          <button class="button dashboard-secondary" type="button" data-session-edit-for-opportunity="${escapeHtml(item.id)}">Edit</button>
          <button class="button dashboard-secondary" type="button" data-session-promote-for-opportunity="${escapeHtml(item.id)}">Promote waitlist</button>
          <button class="text-button" type="button" data-session-delete-for-opportunity="${escapeHtml(item.id)}">Delete</button>
        </div>
      </article>
    `;
  }

  async function saveOpportunityDetails(form) {
    const status = qs('[data-hierarchy-opportunity-status]');
    if (status) status.textContent = 'Saving...';
    const result = await store()?.saveSupabaseOpportunity?.({
      id: formValue(form, 'id'),
      title: formValue(form, 'title'),
      type: formValue(form, 'type'),
      category: formValue(form, 'category'),
      status: formValue(form, 'status') || 'Open',
      capacity: Number(formValue(form, 'capacity') || 0),
      waitlistEnabled: Boolean(new FormData(form).get('waitlistEnabled')),
      defaultHours: Number(formValue(form, 'defaultHours') || 0),
      startsAt: dateTimeLocalToIso(formValue(form, 'startsAt')),
      endsAt: dateTimeLocalToIso(formValue(form, 'endsAt')),
      time: formValue(form, 'time'),
      location: formValue(form, 'location'),
      commitment: formValue(form, 'commitment'),
      description: formValue(form, 'description'),
      requirements: formValue(form, 'requirements')
    });
    if (result?.ok) {
      if (status) status.textContent = 'Saved.';
      window.setTimeout(renderOpportunityHierarchy, 350);
    } else if (status) {
      status.textContent = `Could not save${result?.reason ? `: ${result.reason}` : '.'}`;
    }
  }

  async function saveSessionFromForm(form) {
    const status = qs('[data-hierarchy-session-status]');
    if (status) status.textContent = 'Saving...';
    const result = await saveSession({
      id: formValue(form, 'id') || undefined,
      opportunityId: formValue(form, 'opportunityId'),
      title: formValue(form, 'title'),
      startsAt: dateTimeLocalToIso(formValue(form, 'startsAt')),
      endsAt: dateTimeLocalToIso(formValue(form, 'endsAt')),
      defaultHours: Number(formValue(form, 'defaultHours') || 0),
      capacity: Number(formValue(form, 'capacity') || 0),
      facilitatorCode: formValue(form, 'facilitatorCode'),
      location: formValue(form, 'location'),
      status: formValue(form, 'status') || 'Open',
      waitlistEnabled: Boolean(new FormData(form).get('waitlistEnabled'))
    });
    if (result.ok) {
      if (status) status.textContent = 'Saved.';
      renderOpportunitySessionsEditor(formValue(form, 'opportunityId'));
    } else if (status) {
      status.textContent = `Could not save: ${result.reason}`;
    }
  }

  async function syncAndRenderOpportunityList() {
    const host = workspace();
    if (host) host.innerHTML = '<section class="admin-content-step"><h3>Loading opportunities...</h3></section>';
    if (typeof store()?.applySupabaseOpportunities === 'function') await store().applySupabaseOpportunities().catch(() => null);
    await refreshSessions();
    renderOpportunityHierarchy();
  }

  function bind() {
    if (window.__adminOpportunityHierarchyBound) return;
    window.__adminOpportunityHierarchyBound = true;

    document.addEventListener('click', async event => {
      const opportunityType = event.target.closest('[data-content-type="opportunity"]');
      if (opportunityType) {
        event.preventDefault();
        event.stopImmediatePropagation();
        syncAndRenderOpportunityList();
        return;
      }

      const back = event.target.closest('[data-content-back]');
      if (back && qs('[data-opportunity-hierarchy], [data-opportunity-details-editor], [data-opportunity-sessions-editor]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderOpportunityHierarchy();
        return;
      }

      const listBack = event.target.closest('[data-opportunity-list-back]');
      if (listBack) {
        event.preventDefault();
        renderOpportunityHierarchy();
        return;
      }

      const refresh = event.target.closest('[data-opportunity-refresh]');
      if (refresh) {
        event.preventDefault();
        syncAndRenderOpportunityList();
        return;
      }

      const create = event.target.closest('[data-opportunity-create]');
      if (create) {
        event.preventDefault();
        renderOpportunityDetailsForm({});
        return;
      }

      const editDetails = event.target.closest('[data-opportunity-edit-details]');
      if (editDetails) {
        event.preventDefault();
        const opp = opportunityById(editDetails.dataset.opportunityEditDetails);
        if (opp) renderOpportunityDetailsForm(opp);
        return;
      }

      const editSessions = event.target.closest('[data-opportunity-edit-sessions]');
      if (editSessions) {
        event.preventDefault();
        await refreshSessions();
        renderOpportunitySessionsEditor(editSessions.dataset.opportunityEditSessions);
        return;
      }

      const newSession = event.target.closest('[data-session-new-for-opportunity]');
      if (newSession) {
        event.preventDefault();
        renderOpportunitySessionsEditor(hierarchyState.selectedOpportunityId);
        return;
      }

      const editSession = event.target.closest('[data-session-edit-for-opportunity]');
      if (editSession) {
        event.preventDefault();
        renderOpportunitySessionsEditor(hierarchyState.selectedOpportunityId, editSession.dataset.sessionEditForOpportunity);
        return;
      }

      const deleteSessionButton = event.target.closest('[data-session-delete-for-opportunity]');
      if (deleteSessionButton) {
        event.preventDefault();
        if (!window.confirm('Delete this session? Existing sign-ups and attendance records may keep historical references.')) return;
        const result = await deleteSession(deleteSessionButton.dataset.sessionDeleteForOpportunity);
        if (!result.ok) window.alert(`Could not delete session: ${result.reason}`);
        renderOpportunitySessionsEditor(hierarchyState.selectedOpportunityId);
        return;
      }

      const promote = event.target.closest('[data-session-promote-for-opportunity]');
      if (promote) {
        event.preventDefault();
        const result = await promoteNextSession(promote.dataset.sessionPromoteForOpportunity, hierarchyState.selectedOpportunityId);
        window.alert(result.ok ? (result.promoted ? 'Promoted the next waitlisted volunteer.' : 'No waitlisted volunteer was available to promote.') : `Promotion failed: ${result.reason}`);
      }
    }, true);

    document.addEventListener('submit', event => {
      const opportunityForm = event.target.closest('[data-hierarchy-opportunity-form]');
      if (opportunityForm) {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveOpportunityDetails(opportunityForm);
        return;
      }

      const sessionForm = event.target.closest('[data-hierarchy-session-form]');
      if (sessionForm) {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveSessionFromForm(sessionForm);
      }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', bind);
  window.addEventListener('volunteer-auth-ready', bind);
  window.addEventListener('volunteer-auth-changed', bind);
})();

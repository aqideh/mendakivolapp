(() => {
  const NEWS_TABLE = 'app_news_items';
  const OPPORTUNITY_TABLE = 'app_opportunities';
  const TRAINING_TABLE = 'app_training_sessions';

  const contentState = {
    type: '',
    mode: '',
    editingId: ''
  };

  const contentLabels = {
    opportunity: 'opportunities',
    training: 'training',
    news: 'news'
  };

  function client() {
    return window.VolunteerDataStore?.authState?.supabase || null;
  }

  function isAdmin() {
    return Boolean(window.VolunteerDataStore?.isAdmin?.());
  }

  function appState() {
    try {
      return typeof state !== 'undefined' ? state : null;
    } catch (error) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
  }

  function bodyTextToArray(value) {
    return String(value || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }

  function arrayToBodyText(value) {
    return Array.isArray(value) ? value.join('\n') : '';
  }

  function isoToDateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = input => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function dateTimeLocalToIso(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
  }

  function rowToNews(row) {
    return {
      id: row.id,
      category: row.category || 'Announcement',
      emoji: row.emoji || '',
      title: row.title || '',
      date: row.publication_date || '',
      readTime: row.read_time || '',
      featured: Boolean(row.featured),
      body: Array.isArray(row.body) ? row.body : [],
      status: row.status || 'published'
    };
  }

  function newsToRow(item) {
    return {
      id: item.id || crypto.randomUUID(),
      category: item.category || 'Announcement',
      emoji: item.emoji || null,
      title: item.title || '',
      publication_date: item.date || new Date().toISOString().slice(0, 10),
      read_time: item.readTime || null,
      featured: Boolean(item.featured),
      body: Array.isArray(item.body) ? item.body : bodyTextToArray(item.bodyText),
      status: item.status || 'published',
      source: 'app',
      updated_at: new Date().toISOString()
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

  function trainingToRow(training) {
    return {
      id: String(training.id),
      title: training.title || '',
      description: training.description || '',
      trainer: training.trainer || null,
      session_date: training.date || null,
      time: training.time || '',
      location: training.location || '',
      capacity: Number(training.capacity || 0),
      waitlist_enabled: training.waitlistEnabled !== false,
      status: training.status || 'Open',
      required_for: Array.isArray(training.requiredFor) ? training.requiredFor : [],
      source: 'app',
      updated_at: new Date().toISOString()
    };
  }

  async function fetchSupabaseNewsItems() {
    const supabase = client();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .select('id, category, emoji, title, publication_date, read_time, featured, body, status')
      .order('publication_date', { ascending: false });

    if (error) {
      console.warn('Could not load Supabase news; using JSON fallback.', error);
      return [];
    }

    return Array.isArray(data) ? data.map(rowToNews) : [];
  }

  async function applySupabaseNewsItems() {
    const currentState = appState();
    if (!currentState?.data) return { ok: false, skipped: true };

    const news = await fetchSupabaseNewsItems();
    if (!news.length) return { ok: false, count: 0 };

    currentState.data.news = news.filter(item => item.status === 'published' || isAdmin());
    if (typeof renderHomeNews === 'function') renderHomeNews();
    if (typeof renderNewsList === 'function') renderNewsList();
    renderContentWorkspace();
    window.dispatchEvent(new CustomEvent('volunteer-news-synced'));
    return { ok: true, count: currentState.data.news.length };
  }

  async function saveSupabaseNewsItem(item) {
    const supabase = client();
    if (!supabase || !isAdmin()) return { ok: false, skipped: true };

    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .upsert(newsToRow(item), { onConflict: 'id' })
      .select('id, category, emoji, title, publication_date, read_time, featured, body, status')
      .single();

    if (error) {
      console.warn('Could not save news item.', error);
      return { ok: false, reason: error.message };
    }

    await applySupabaseNewsItems();
    return { ok: true, item: rowToNews(data) };
  }

  async function saveSupabaseOpportunity(opp) {
    const supabase = client();
    if (!supabase || !isAdmin()) return { ok: false, skipped: true };

    const { error } = await supabase
      .from(OPPORTUNITY_TABLE)
      .upsert(opportunityToRow(opp), { onConflict: 'id' });

    if (error) return { ok: false, reason: error.message };

    if (opp.facilitatorCode && typeof window.VolunteerDataStore?.upsertAttendanceCode === 'function') {
      const codeResult = await window.VolunteerDataStore.upsertAttendanceCode(opp.id, opp.facilitatorCode, 'Facilitator code');
      if (!codeResult.ok) return { ok: false, reason: codeResult.reason || 'Could not save facilitator code.' };
    }

    if (typeof window.VolunteerDataStore?.applySupabaseOpportunities === 'function') {
      await window.VolunteerDataStore.applySupabaseOpportunities();
    }
    renderContentWorkspace();
    return { ok: true };
  }

  async function saveSupabaseTrainingSession(training) {
    const supabase = client();
    if (!supabase || !isAdmin()) return { ok: false, skipped: true };

    const { error } = await supabase
      .from(TRAINING_TABLE)
      .upsert(trainingToRow(training), { onConflict: 'id' });

    if (error) return { ok: false, reason: error.message };
    if (typeof window.VolunteerDataStore?.applySupabaseTrainingSessions === 'function') {
      await window.VolunteerDataStore.applySupabaseTrainingSessions();
    }
    renderContentWorkspace();
    return { ok: true };
  }

  function formValue(form, name) {
    return String(new FormData(form).get(name) || '').trim();
  }

  function createAdminContentCard() {
    if (document.querySelector('[data-admin-content-card]')) return;
    const layout = document.querySelector('.dashboard-layout');
    if (!layout) return;

    const card = document.createElement('section');
    card.className = 'dashboard-card admin-content-card';
    card.dataset.adminContentCard = 'true';
    card.dataset.dashboardCardRole = 'admin';
    card.innerHTML = `
      <div class="admin-content-page">
        <div class="section-header admin-content-page-header">
          <div>
            <p class="eyebrow dark">Admin</p>
            <h2>Admin content management</h2>
            <p class="dashboard-muted">Create or edit Supabase-backed opportunities, training sessions, and news items.</p>
          </div>
          <button class="button dashboard-secondary" type="button" data-content-back hidden>Back</button>
        </div>
        <div class="admin-content-workspace" data-content-workspace></div>
      </div>
    `;

    layout.append(card);
  }

  function currentItems(type) {
    const currentState = appState();
    if (!currentState?.data) return [];
    if (type === 'opportunity') return currentState.data.opportunities || [];
    if (type === 'training') return currentState.data.trainings || [];
    if (type === 'news') return currentState.data.news || [];
    return [];
  }

  function findItem(type, id) {
    return currentItems(type).find(item => String(item.id) === String(id));
  }

  function optionTile(type, label, copy) {
    return `
      <button class="admin-content-choice" type="button" data-content-type="${type}">
        <strong>${label}</strong>
        <span>${copy}</span>
      </button>
    `;
  }

  function actionTile(mode, label, copy) {
    return `
      <button class="admin-content-choice" type="button" data-content-mode="${mode}">
        <strong>${label}</strong>
        <span>${copy}</span>
      </button>
    `;
  }

  function renderTypePicker() {
    contentState.type = '';
    contentState.mode = '';
    contentState.editingId = '';
    const workspace = document.querySelector('[data-content-workspace]');
    if (!workspace) return;
    workspace.innerHTML = `
      <section class="admin-content-step">
        <h3>What would you like to manage?</h3>
        <p>Choose one content area. Each area opens as its own page inside this module.</p>
        <div class="admin-content-choice-grid">
          ${optionTile('opportunity', 'Opportunities', 'Create or edit volunteer opportunity listings.')}
          ${optionTile('training', 'Training', 'Create or edit volunteer training sessions.')}
          ${optionTile('news', 'News', 'Create or edit newsfeed items.')}
        </div>
      </section>
    `;
    updateBackButton();
  }

  function renderModePicker(type) {
    contentState.type = type;
    contentState.mode = '';
    contentState.editingId = '';
    const workspace = document.querySelector('[data-content-workspace]');
    if (!workspace) return;
    workspace.innerHTML = `
      <section class="admin-content-step">
        <p class="eyebrow dark">${escapeHtml(contentLabels[type] || type)}</p>
        <h3>Create new or edit existing?</h3>
        <p>Select whether you want a blank form or a list of existing records.</p>
        <div class="admin-content-choice-grid two">
          ${actionTile('create', 'Create new', 'Open a blank form.')}
          ${actionTile('edit', 'Edit existing', 'Choose from current records.')}
        </div>
      </section>
    `;
    updateBackButton();
  }

  function renderEditList(type) {
    contentState.type = type;
    contentState.mode = 'edit';
    contentState.editingId = '';
    const workspace = document.querySelector('[data-content-workspace]');
    if (!workspace) return;
    const items = currentItems(type);
    workspace.innerHTML = `
      <section class="admin-content-step">
        <p class="eyebrow dark">Edit ${escapeHtml(contentLabels[type] || type)}</p>
        <h3>Select an item to edit</h3>
        <div class="admin-content-list page-list">
          ${items.length ? items.map(item => renderEditableItem(type, item)).join('') : '<div class="admin-content-item"><span>No records loaded.</span></div>'}
        </div>
      </section>
    `;
    updateBackButton();
  }

  function renderEditableItem(type, item) {
    const meta = type === 'news'
      ? `${item.category || 'News'} · ${item.date || ''} · ${item.status || 'published'}`
      : type === 'training'
        ? `${item.id} · ${item.date || ''} · ${item.status || 'Open'} · Capacity ${Number(item.capacity || 0) || 'unlimited'}`
        : `${item.id} · ${item.type || ''} · ${item.status || 'Open'} · Capacity ${Number(item.capacity || 0) || 'unlimited'} · Hours ${Number(item.defaultHours || 0) || 'unset'}`;
    return `
      <div class="admin-content-item editable">
        <span><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(meta)}</span></span>
        <button class="button dashboard-secondary" type="button" data-content-edit-id="${escapeHtml(item.id)}">Edit</button>
      </div>
    `;
  }

  function renderForm(type, item = null) {
    contentState.type = type;
    contentState.mode = item ? 'edit' : 'create';
    contentState.editingId = item?.id || '';
    const workspace = document.querySelector('[data-content-workspace]');
    if (!workspace) return;
    workspace.innerHTML = `
      <section class="admin-content-step">
        <p class="eyebrow dark">${item ? 'Edit' : 'Create'} ${escapeHtml(contentLabels[type] || type)}</p>
        <h3>${item ? escapeHtml(item.title) : 'New item'}</h3>
        ${type === 'opportunity' ? opportunityForm(item) : type === 'training' ? trainingForm(item) : newsForm(item)}
      </section>
    `;
    updateBackButton();
  }

  function opportunityForm(item = {}) {
    return `
      <form class="admin-content-form" data-content-form="opportunity">
        <label>ID<input name="id" required ${item?.id ? 'readonly' : ''} value="${escapeHtml(item?.id || '')}" placeholder="e.g. map-packing-day-2026"></label>
        <label>Title<input name="title" required value="${escapeHtml(item?.title || '')}"></label>
        <label>Type<select name="type"><option value="long-term" ${item?.type === 'long-term' ? 'selected' : ''}>Long-term</option><option value="ad-hoc" ${item?.type !== 'long-term' ? 'selected' : ''}>Ad-hoc</option></select></label>
        <label>Category<select name="category"><option value="befriender" ${item?.category === 'befriender' ? 'selected' : ''}>Befriender</option><option value="mentor" ${item?.category === 'mentor' ? 'selected' : ''}>Mentor</option><option value="facilitator" ${item?.category === 'facilitator' ? 'selected' : ''}>Facilitator</option><option value="community-volunteering" ${!item?.category || item?.category === 'community-volunteering' ? 'selected' : ''}>Community volunteering</option></select></label>
        <label>Status<input name="status" value="${escapeHtml(item?.status || 'Open')}"></label>
        <label>Capacity<input name="capacity" type="number" min="0" value="${escapeHtml(item?.capacity || 0)}" placeholder="0 means unlimited"></label>
        <label class="admin-content-checkbox"><input name="waitlistEnabled" type="checkbox" ${item?.waitlistEnabled === false ? '' : 'checked'}> Enable waitlist when full</label>
        <label>Default hours<input name="defaultHours" type="number" min="0" max="24" step="0.25" value="${escapeHtml(item?.defaultHours || 0)}" placeholder="e.g. 3"></label>
        <label>Start date/time<input name="startsAt" type="datetime-local" value="${escapeHtml(isoToDateTimeLocal(item?.startsAt))}"></label>
        <label>End date/time<input name="endsAt" type="datetime-local" value="${escapeHtml(isoToDateTimeLocal(item?.endsAt))}"></label>
        <label>Facilitator attendance code<input name="facilitatorCode" inputmode="numeric" maxlength="4" pattern="\\d{4}" placeholder="4-digit code for check-in/out"></label>
        <label>Display time<input name="time" value="${escapeHtml(item?.time || '')}" placeholder="Weekends, ~2 hrs/session"></label>
        <label>Location<input name="location" value="${escapeHtml(item?.location || '')}"></label>
        <label>Display commitment<input name="commitment" value="${escapeHtml(item?.commitment || '')}"></label>
        <label>Description<textarea name="description">${escapeHtml(item?.description || '')}</textarea></label>
        <label>Requirements<textarea name="requirements">${escapeHtml(item?.requirements || '')}</textarea></label>
        <button class="button button-primary" type="submit">${item?.id ? 'Save changes' : 'Create opportunity'}</button>
        <div class="admin-content-status" data-content-status="opportunity"></div>
      </form>
    `;
  }

  function trainingForm(item = {}) {
    return `
      <form class="admin-content-form" data-content-form="training">
        <label>ID<input name="id" required ${item?.id ? 'readonly' : ''} value="${escapeHtml(item?.id || '')}" placeholder="e.g. volunteer-orientation-apr"></label>
        <label>Title<input name="title" required value="${escapeHtml(item?.title || '')}"></label>
        <label>Date<input name="date" type="date" value="${escapeHtml(item?.date || '')}"></label>
        <label>Time<input name="time" value="${escapeHtml(item?.time || '')}" placeholder="10:00 AM - 12:00 PM"></label>
        <label>Location<input name="location" value="${escapeHtml(item?.location || '')}"></label>
        <label>Trainer<input name="trainer" value="${escapeHtml(item?.trainer || '')}"></label>
        <label>Capacity<input name="capacity" type="number" min="0" value="${escapeHtml(item?.capacity || 0)}"></label>
        <label class="admin-content-checkbox"><input name="waitlistEnabled" type="checkbox" ${item?.waitlistEnabled === false ? '' : 'checked'}> Enable waitlist when full</label>
        <label>Status<input name="status" value="${escapeHtml(item?.status || 'Open')}"></label>
        <label>Description<textarea name="description">${escapeHtml(item?.description || '')}</textarea></label>
        <button class="button button-primary" type="submit">${item?.id ? 'Save changes' : 'Create training'}</button>
        <div class="admin-content-status" data-content-status="training"></div>
      </form>
    `;
  }

  function newsForm(item = {}) {
    return `
      <form class="admin-content-form" data-content-form="news">
        <label>ID<input name="id" ${item?.id ? 'readonly' : ''} value="${escapeHtml(item?.id || '')}" placeholder="auto-generated if blank"></label>
        <label>Title<input name="title" required value="${escapeHtml(item?.title || '')}"></label>
        <label>Category<select name="category"><option ${item?.category === 'Announcement' ? 'selected' : ''}>Announcement</option><option ${item?.category === 'Programme' ? 'selected' : ''}>Programme</option><option ${item?.category === 'Volunteer' ? 'selected' : ''}>Volunteer</option></select></label>
        <label>Emoji<input name="emoji" value="${escapeHtml(item?.emoji || '')}" placeholder="Optional"></label>
        <label>Publication date<input name="date" type="date" value="${escapeHtml(item?.date || '')}"></label>
        <label>Read time<input name="readTime" value="${escapeHtml(item?.readTime || '')}" placeholder="2 min read"></label>
        <label>Status<select name="status"><option value="published" ${item?.status !== 'draft' ? 'selected' : ''}>Published</option><option value="draft" ${item?.status === 'draft' ? 'selected' : ''}>Draft</option></select></label>
        <label class="admin-content-checkbox"><input name="featured" type="checkbox" ${item?.featured ? 'checked' : ''}> Featured on home</label>
        <label>Body<textarea name="body" placeholder="One paragraph per line">${escapeHtml(arrayToBodyText(item?.body))}</textarea></label>
        <button class="button button-primary" type="submit">${item?.id ? 'Save changes' : 'Create news item'}</button>
        <div class="admin-content-status" data-content-status="news"></div>
      </form>
    `;
  }

  function setStatus(type, text) {
    const node = document.querySelector(`[data-content-status="${type}"]`);
    if (node) node.textContent = text || '';
  }

  function updateBackButton() {
    const back = document.querySelector('[data-content-back]');
    if (!back) return;
    back.hidden = !contentState.type;
  }

  function goBack() {
    if (contentState.mode === 'create') {
      renderModePicker(contentState.type);
      return;
    }
    if (contentState.mode === 'edit' && contentState.editingId) {
      renderEditList(contentState.type);
      return;
    }
    if (contentState.mode === 'edit') {
      renderModePicker(contentState.type);
      return;
    }
    renderTypePicker();
  }

  function renderContentWorkspace() {
    if (!document.querySelector('[data-admin-content-card]')) return;
    if (!contentState.type) renderTypePicker();
    else if (!contentState.mode) renderModePicker(contentState.type);
    else if (contentState.mode === 'edit' && !contentState.editingId) renderEditList(contentState.type);
  }

  function bindAdminContentForms() {
    if (window.__supabaseContentAdminFormsBound) return;
    window.__supabaseContentAdminFormsBound = true;

    document.addEventListener('click', event => {
      const typeButton = event.target.closest('[data-content-type]');
      if (typeButton) {
        renderModePicker(typeButton.dataset.contentType);
        return;
      }

      const modeButton = event.target.closest('[data-content-mode]');
      if (modeButton) {
        if (modeButton.dataset.contentMode === 'create') renderForm(contentState.type);
        else renderEditList(contentState.type);
        return;
      }

      const editButton = event.target.closest('[data-content-edit-id]');
      if (editButton) {
        const item = findItem(contentState.type, editButton.dataset.contentEditId);
        if (item) renderForm(contentState.type, item);
        return;
      }

      const backButton = event.target.closest('[data-content-back]');
      if (backButton) goBack();
    });

    document.addEventListener('submit', async event => {
      const form = event.target.closest('[data-content-form]');
      if (!form) return;
      event.preventDefault();

      const type = form.dataset.contentForm;
      setStatus(type, 'Saving...');
      let result;

      if (type === 'opportunity') {
        result = await saveSupabaseOpportunity({
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
          facilitatorCode: formValue(form, 'facilitatorCode'),
          time: formValue(form, 'time'),
          location: formValue(form, 'location'),
          commitment: formValue(form, 'commitment'),
          description: formValue(form, 'description'),
          requirements: formValue(form, 'requirements')
        });
      } else if (type === 'training') {
        result = await saveSupabaseTrainingSession({
          id: formValue(form, 'id'),
          title: formValue(form, 'title'),
          date: formValue(form, 'date'),
          time: formValue(form, 'time'),
          location: formValue(form, 'location'),
          trainer: formValue(form, 'trainer'),
          capacity: Number(formValue(form, 'capacity') || 0),
          waitlistEnabled: Boolean(new FormData(form).get('waitlistEnabled')),
          status: formValue(form, 'status') || 'Open',
          description: formValue(form, 'description'),
          requiredFor: []
        });
      } else if (type === 'news') {
        result = await saveSupabaseNewsItem({
          id: formValue(form, 'id') || undefined,
          title: formValue(form, 'title'),
          category: formValue(form, 'category'),
          emoji: formValue(form, 'emoji'),
          date: formValue(form, 'date'),
          readTime: formValue(form, 'readTime'),
          featured: Boolean(new FormData(form).get('featured')),
          status: formValue(form, 'status') || 'published',
          bodyText: formValue(form, 'body')
        });
      }

      if (result?.ok) {
        setStatus(type, 'Saved.');
        contentState.editingId = '';
        window.setTimeout(() => renderEditList(type), 350);
      } else {
        setStatus(type, `Could not save${result?.reason ? `: ${result.reason}` : '.'}`);
      }
    });
  }

  async function syncContent() {
    if (typeof window.VolunteerDataStore?.applySupabaseOpportunities === 'function') {
      await window.VolunteerDataStore.applySupabaseOpportunities();
    }
    if (typeof window.VolunteerDataStore?.applySupabaseTrainingSessions === 'function') {
      await window.VolunteerDataStore.applySupabaseTrainingSessions();
    }
    await applySupabaseNewsItems();
    renderContentWorkspace();
  }

  function installAdminContent() {
    createAdminContentCard();
    bindAdminContentForms();
    renderContentWorkspace();
  }

  Object.assign(window.VolunteerDataStore || {}, {
    fetchSupabaseNewsItems,
    applySupabaseNewsItems,
    saveSupabaseNewsItem,
    saveSupabaseOpportunity,
    saveSupabaseTrainingSession
  });

  document.addEventListener('DOMContentLoaded', () => {
    bindAdminContentForms();
    window.setTimeout(syncContent, 350);
    window.setTimeout(installAdminContent, 450);
  });

  window.addEventListener('volunteer-auth-ready', () => {
    syncContent();
    installAdminContent();
  });
  window.addEventListener('volunteer-auth-changed', () => {
    contentState.type = '';
    contentState.mode = '';
    contentState.editingId = '';
    syncContent();
    installAdminContent();
  });
  window.addEventListener('volunteer-news-synced', renderContentWorkspace);
})();

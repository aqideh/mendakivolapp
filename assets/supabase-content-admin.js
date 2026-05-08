(() => {
  const NEWS_TABLE = 'app_news_items';
  const OPPORTUNITY_TABLE = 'app_opportunities';
  const TRAINING_TABLE = 'app_training_sessions';

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
    renderAdminContentLists();
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
    if (typeof window.VolunteerDataStore?.applySupabaseOpportunities === 'function') {
      await window.VolunteerDataStore.applySupabaseOpportunities();
    }
    renderAdminContentLists();
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
    renderAdminContentLists();
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
      <div class="section-header">
        <div>
          <h2>Admin content management</h2>
          <p class="dashboard-muted">Create or update Supabase-backed opportunities, training sessions, and news items. CMS JSON remains fallback/static seed content only.</p>
        </div>
      </div>
      <div class="admin-content-grid">
        <section class="admin-content-panel">
          <h3>Volunteering opportunity</h3>
          <p>Use a stable unique ID. Saving an existing ID updates that opportunity.</p>
          <form class="admin-content-form" data-content-form="opportunity">
            <label>ID<input name="id" required placeholder="e.g. map-packing-day-2026"></label>
            <label>Title<input name="title" required></label>
            <label>Type<select name="type"><option value="long-term">Long-term</option><option value="ad-hoc">Ad-hoc</option></select></label>
            <label>Category<select name="category"><option value="befriender">Befriender</option><option value="mentor">Mentor</option><option value="facilitator">Facilitator</option><option value="community-volunteering">Community volunteering</option></select></label>
            <label>Status<input name="status" value="Open"></label>
            <label>Time<input name="time" placeholder="Weekends, ~2 hrs/session"></label>
            <label>Location<input name="location"></label>
            <label>Commitment<input name="commitment"></label>
            <label>Description<textarea name="description"></textarea></label>
            <label>Requirements<textarea name="requirements"></textarea></label>
            <button class="button button-primary" type="submit">Save opportunity</button>
            <div class="admin-content-status" data-content-status="opportunity"></div>
          </form>
          <div class="admin-content-list" data-content-list="opportunities"></div>
        </section>
        <section class="admin-content-panel">
          <h3>Training session</h3>
          <p>Use a stable unique slug. Saving an existing ID updates that training.</p>
          <form class="admin-content-form" data-content-form="training">
            <label>ID<input name="id" required placeholder="e.g. volunteer-orientation-apr"></label>
            <label>Title<input name="title" required></label>
            <label>Date<input name="date" type="date"></label>
            <label>Time<input name="time" placeholder="10:00 AM - 12:00 PM"></label>
            <label>Location<input name="location"></label>
            <label>Trainer<input name="trainer"></label>
            <label>Capacity<input name="capacity" type="number" min="0" value="0"></label>
            <label>Status<input name="status" value="Open"></label>
            <label>Description<textarea name="description"></textarea></label>
            <button class="button button-primary" type="submit">Save training</button>
            <div class="admin-content-status" data-content-status="training"></div>
          </form>
          <div class="admin-content-list" data-content-list="trainings"></div>
        </section>
        <section class="admin-content-panel">
          <h3>News item</h3>
          <p>Leave ID blank for a new item. Body paragraphs should be entered one per line.</p>
          <form class="admin-content-form" data-content-form="news">
            <label>ID<input name="id" placeholder="auto-generated if blank"></label>
            <label>Title<input name="title" required></label>
            <label>Category<select name="category"><option>Announcement</option><option>Programme</option><option>Volunteer</option></select></label>
            <label>Emoji<input name="emoji" placeholder="Optional"></label>
            <label>Publication date<input name="date" type="date"></label>
            <label>Read time<input name="readTime" placeholder="2 min read"></label>
            <label>Status<select name="status"><option value="published">Published</option><option value="draft">Draft</option></select></label>
            <label><span><input name="featured" type="checkbox"> Featured on home</span></label>
            <label>Body<textarea name="body" placeholder="One paragraph per line"></textarea></label>
            <button class="button button-primary" type="submit">Save news</button>
            <div class="admin-content-status" data-content-status="news"></div>
          </form>
          <div class="admin-content-list" data-content-list="news"></div>
        </section>
      </div>
    `;

    layout.append(card);
  }

  function renderAdminContentLists() {
    const currentState = appState();
    if (!currentState?.data) return;

    const opportunitiesList = document.querySelector('[data-content-list="opportunities"]');
    if (opportunitiesList) {
      opportunitiesList.innerHTML = (currentState.data.opportunities || []).slice(0, 12).map(item => `
        <div class="admin-content-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.id)} · ${escapeHtml(item.status || 'Open')}</span></div>
      `).join('') || '<div class="admin-content-item"><span>No opportunities loaded.</span></div>';
    }

    const trainingsList = document.querySelector('[data-content-list="trainings"]');
    if (trainingsList) {
      trainingsList.innerHTML = (currentState.data.trainings || []).slice(0, 12).map(item => `
        <div class="admin-content-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.id)} · ${escapeHtml(item.date || '')}</span></div>
      `).join('') || '<div class="admin-content-item"><span>No training sessions loaded.</span></div>';
    }

    const newsList = document.querySelector('[data-content-list="news"]');
    if (newsList) {
      newsList.innerHTML = (currentState.data.news || []).slice(0, 12).map(item => `
        <div class="admin-content-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.category)} · ${escapeHtml(item.date || '')}</span></div>
      `).join('') || '<div class="admin-content-item"><span>No news items loaded.</span></div>';
    }
  }

  function setStatus(type, text) {
    const node = document.querySelector(`[data-content-status="${type}"]`);
    if (node) node.textContent = text || '';
  }

  function bindAdminContentForms() {
    if (window.__supabaseContentAdminFormsBound) return;
    window.__supabaseContentAdminFormsBound = true;

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
        form.reset();
        if (type === 'opportunity') form.querySelector('[name="status"]').value = 'Open';
        if (type === 'training') {
          form.querySelector('[name="status"]').value = 'Open';
          form.querySelector('[name="capacity"]').value = '0';
        }
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
    renderAdminContentLists();
  }

  function installAdminContent() {
    createAdminContentCard();
    renderAdminContentLists();
    bindAdminContentForms();
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
    syncContent();
    installAdminContent();
  });
  window.addEventListener('volunteer-news-synced', renderAdminContentLists);
})();

(() => {
  const HOUR_GOAL = 20;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value || '');

  function session() {
    return window.VolunteerDataStore?.getSession?.() || null;
  }

  function profile() {
    return window.VolunteerDataStore?.getProfile?.() || null;
  }

  function signups() {
    return window.VolunteerDataStore?.getOpportunitySignups?.() || [];
  }

  function claims() {
    return window.VolunteerDataStore?.getAttendanceClaims?.() || [];
  }

  function trainings() {
    return window.VolunteerDataStore?.getTrainingSignups?.() || [];
  }

  function appData() {
    try {
      return typeof state !== 'undefined' ? state.data : null;
    } catch (error) {
      return null;
    }
  }

  function currentEmail() {
    return window.VolunteerDataStore?.currentEmail?.() || session()?.email || '';
  }

  function formatDateTime(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    }).format(parsed);
  }

  function parseDateFromText(value) {
    if (!value) return null;
    const iso = String(value).match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (iso) return new Date(`${iso}T09:00:00`);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function opportunityDate(opp) {
    if (opp?.startsAt) return new Date(opp.startsAt);
    if (opp?.sessionTimeLabel) return parseDateFromText(opp.sessionTimeLabel);
    return parseDateFromText(opp?.time);
  }

  function opportunityLabel(opp) {
    const date = opportunityDate(opp);
    if (date && !Number.isNaN(date.getTime())) return formatDateTime(date.toISOString());
    return opp?.time || 'Date to be confirmed';
  }

  function nextUserEvent() {
    const email = currentEmail();
    if (!email) return null;
    const opportunities = appData()?.opportunities || [];
    const confirmed = signups()
      .filter(item => item.email === email && ['confirmed', 'pending_review', 'waitlisted'].includes(item.status))
      .map(item => {
        const opp = opportunities.find(candidate => String(candidate.id) === String(item.opportunityId)) || item;
        return { ...item, date: opportunityDate(opp), label: opportunityLabel(opp) };
      })
      .sort((a, b) => (a.date?.getTime?.() || Number.MAX_SAFE_INTEGER) - (b.date?.getTime?.() || Number.MAX_SAFE_INTEGER));
    return confirmed[0] || null;
  }

  function verifiedHours() {
    const email = currentEmail();
    const fromClaims = claims()
      .filter(item => item.email === email && ['verified', 'adjusted'].includes(item.claimStatus))
      .reduce((sum, item) => sum + Number(item.verifiedHours || 0), 0);
    if (fromClaims > 0) return fromClaims;
    return signups()
      .filter(item => item.email === email && item.status === 'completed')
      .reduce((sum, item) => sum + Number(item.verifiedHours || item.hours || 0), 0);
  }

  function ensureLoadingSkeleton() {
    if (qs('[data-ui-skeleton]')) return;
    const overlay = document.createElement('div');
    overlay.className = 'ui-skeleton-overlay';
    overlay.dataset.uiSkeleton = 'true';
    overlay.innerHTML = `
      <div class="ui-skeleton-card" aria-label="Loading dashboard content">
        <div class="ui-skeleton-line title"></div>
        <div class="ui-skeleton-line medium"></div>
        <div class="ui-skeleton-line"></div>
        <div class="ui-skeleton-line short"></div>
      </div>
    `;
    document.body.append(overlay);
    window.setTimeout(() => overlay.remove(), 700);
  }

  function decorateEmptyState() {
    const copy = qs('[data-dashboard-profile-copy]');
    if (!copy || currentEmail() || qs('[data-ui-value-empty]')) return;
    const block = document.createElement('div');
    block.className = 'ui-value-empty-state';
    block.dataset.uiValueEmpty = 'true';
    block.innerHTML = `
      <strong>Start your volunteer journey in under a minute.</strong>
      <ul class="ui-quick-benefits">
        <li>✅ Save your profile and preferred volunteer type</li>
        <li>📅 Sign up for opportunities and training</li>
        <li>🏅 Track hours, milestones, and completed sessions</li>
      </ul>
      <button class="button button-primary" type="button" data-auth-open>🚀 Create your volunteer account</button>
    `;
    copy.insertAdjacentElement('afterend', block);
  }

  function decorateProfileSummary() {
    const card = qs('.dashboard-profile-card');
    if (!card || !currentEmail()) return;
    card.querySelector('[data-ui-profile-welcome]')?.remove();
    const next = nextUserEvent();
    const name = profile()?.name || session()?.name || 'Volunteer';
    const welcome = document.createElement('div');
    welcome.className = 'ui-profile-welcome';
    welcome.dataset.uiProfileWelcome = 'true';
    welcome.innerHTML = `
      <strong>Welcome back, ${escapeHtml(name)}.</strong>
      <p class="dashboard-muted">${next ? `Next: ${escapeHtml(next.label)} · ${escapeHtml(next.title || 'Opportunity')}` : 'Next: choose an opportunity to start building your volunteer record.'}</p>
    `;
    card.prepend(welcome);
  }

  function decorateProgress() {
    const statsCard = qs('#stats-title')?.closest('.dashboard-card');
    if (!statsCard || !currentEmail()) return;
    statsCard.querySelector('[data-ui-progress]')?.remove();
    const hours = verifiedHours();
    const percent = Math.min(100, Math.round((hours / HOUR_GOAL) * 100));
    const completed = signups().filter(item => item.email === currentEmail() && item.status === 'completed').length;
    const trainingCompleted = trainings().filter(item => item.email === currentEmail() && item.status === 'completed').length;
    const wrap = document.createElement('div');
    wrap.className = 'ui-progress-wrap';
    wrap.dataset.uiProgress = 'true';
    wrap.innerHTML = `
      <div class="ui-progress-label"><span>${hours.toFixed(hours % 1 ? 1 : 0)} / ${HOUR_GOAL} hours</span><span>${percent}%</span></div>
      <div class="ui-progress-track"><div class="ui-progress-bar" style="--progress:${percent}%"></div></div>
      <div class="ui-milestones">
        <span class="ui-achievement">${hours >= 5 ? '🏅' : '🔒'} 5-hour starter</span>
        <span class="ui-achievement">${completed >= 1 ? '🌱' : '🔒'} First opportunity</span>
        <span class="ui-achievement">${trainingCompleted >= 1 ? '🎓' : '🔒'} Training complete</span>
      </div>
    `;
    statsCard.append(wrap);
  }

  function statusKind(text) {
    const value = String(text || '').toLowerCase();
    if (value.includes('pending') || value.includes('review') || value.includes('registered')) return 'pending';
    if (value.includes('confirmed') || value.includes('verified')) return 'confirmed';
    if (value.includes('waitlist')) return 'waitlisted';
    if (value.includes('complete')) return 'completed';
    if (value.includes('declined') || value.includes('cancelled') || value.includes('rejected')) return 'waitlisted';
    return '';
  }

  function decorateStatusBadges() {
    qsa('.badge').forEach(badge => {
      const kind = statusKind(badge.textContent);
      if (kind) badge.dataset.uiStatus = kind;
    });
  }

  function decorateCards() {
    const opportunities = appData()?.opportunities || [];
    qsa('[data-opp-id]').forEach(card => {
      const opp = opportunities.find(item => String(item.id) === String(card.dataset.oppId));
      if (!opp || card.querySelector('[data-ui-next-meta]')) return;
      const meta = document.createElement('span');
      meta.className = 'ui-next-meta';
      meta.dataset.uiNextMeta = 'true';
      meta.textContent = `📍 Next: ${opportunityLabel(opp)}`;
      card.append(meta);
    });
    qsa('[data-signup-opportunity]').forEach(button => {
      if (!button.dataset.uiCtaApplied && !button.disabled) {
        button.dataset.uiCtaApplied = 'true';
        button.innerHTML = '<span class="ui-cta-emoji">📅 Sign up for this opportunity</span>';
      }
    });
  }

  function decorateOpportunityPage() {
    const top = qs('#page-opportunities .page-topper');
    if (!top || qs('[data-ui-opportunity-alert]')) return;
    const count = (appData()?.opportunities || []).length;
    const alert = document.createElement('div');
    alert.className = 'ui-inline-alert';
    alert.dataset.uiOpportunityAlert = 'true';
    alert.innerHTML = `
      <div><strong>${count || 'New'} volunteer opportunities are available.</strong><p class="dashboard-muted">Use search and filters to find mentoring, facilitation, or community roles.</p></div>
      <button class="button button-primary" type="button" data-ui-focus-search>🔎 Filter roles</button>
    `;
    top.insertAdjacentElement('afterend', alert);
  }

  function decorateTimeline() {
    const page = qs('#page-opportunities');
    const grid = qs('#opportunities-grid');
    if (!page || !grid || qs('[data-ui-timeline]')) return;
    const items = (appData()?.opportunities || []).slice(0, 8);
    if (!items.length) return;
    const section = document.createElement('section');
    section.className = 'container content-section';
    section.dataset.uiTimeline = 'true';
    section.innerHTML = `
      <div class="section-header"><div><h2>Upcoming timeline</h2><p class="dashboard-muted">Swipe through upcoming opportunities and choose what fits your schedule.</p></div></div>
      <div class="ui-timeline">
        ${items.map(opp => `<button class="ui-timeline-card" type="button" data-opp-id="${escapeHtml(opp.id)}"><div class="ui-timeline-date">${escapeHtml(opportunityLabel(opp))}</div><h3>${escapeHtml(opp.title)}</h3><p>${escapeHtml(opp.location || 'Location to be confirmed')}</p></button>`).join('')}
      </div>
    `;
    grid.insertAdjacentElement('beforebegin', section);
  }

  function installMobileAffordances() {
    if (!qs('[data-ui-mobile-back]')) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'ui-mobile-back';
      back.dataset.uiMobileBack = 'true';
      back.textContent = '← Back';
      back.addEventListener('click', () => {
        if (history.length > 1) history.back();
        else qs('[data-page-target="home"]')?.click();
      });
      document.body.append(back);
    }
    if (!qs('[data-ui-fab]')) {
      const fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'ui-fab';
      fab.dataset.uiFab = 'true';
      fab.setAttribute('aria-label', 'Find an opportunity');
      fab.textContent = '+';
      fab.addEventListener('click', () => qs('[data-page-target="opportunities"]')?.click());
      document.body.append(fab);
    }
  }

  function installDarkMode() {
    if (qs('[data-ui-dark-toggle]')) return;
    const actions = qs('.header-actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-dark-toggle';
    button.dataset.uiDarkToggle = 'true';
    const saved = localStorage.getItem('mendaki.ui.darkMode') === 'true';
    document.body.classList.toggle('dark-mode', saved);
    button.textContent = saved ? '☀️ Light' : '🌙 Dark';
    button.addEventListener('click', () => {
      const next = !document.body.classList.contains('dark-mode');
      document.body.classList.toggle('dark-mode', next);
      localStorage.setItem('mendaki.ui.darkMode', String(next));
      button.textContent = next ? '☀️ Light' : '🌙 Dark';
    });
    actions.append(button);
  }

  function bindUiActions() {
    if (window.__uiUpgradesBound) return;
    window.__uiUpgradesBound = true;
    document.addEventListener('click', event => {
      if (event.target.closest('[data-ui-focus-search]')) {
        qs('#opp-search')?.focus();
      }
    });
  }

  function runEnhancements() {
    decorateEmptyState();
    decorateProfileSummary();
    decorateProgress();
    decorateStatusBadges();
    decorateCards();
    decorateOpportunityPage();
    decorateTimeline();
    installMobileAffordances();
    installDarkMode();
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureLoadingSkeleton();
    bindUiActions();
    window.setTimeout(runEnhancements, 900);
  });

  ['volunteer-auth-ready', 'volunteer-auth-changed', 'volunteer-signups-synced', 'volunteer-attendance-synced', 'volunteer-training-signups-synced', 'volunteer-opportunities-synced'].forEach(eventName => {
    window.addEventListener(eventName, () => window.setTimeout(runEnhancements, 80));
  });

  const observer = new MutationObserver(() => {
    window.clearTimeout(window.__uiUpgradesTimer);
    window.__uiUpgradesTimer = window.setTimeout(runEnhancements, 120);
  });
  document.addEventListener('DOMContentLoaded', () => {
    const main = qs('#main-content');
    if (main) observer.observe(main, { childList: true, subtree: true });
  });
})();

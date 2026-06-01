(() => {
  const HOUR_GOAL = 20;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value || '');

  function session() { return window.VolunteerDataStore?.getSession?.() || null; }
  function profile() { return window.VolunteerDataStore?.getProfile?.() || null; }
  function signups() { return window.VolunteerDataStore?.getOpportunitySignups?.() || []; }
  function claims() { return window.VolunteerDataStore?.getAttendanceClaims?.() || []; }
  function trainings() { return window.VolunteerDataStore?.getTrainingSignups?.() || []; }
  function currentEmail() { return window.VolunteerDataStore?.currentEmail?.() || session()?.email || ''; }
  function displayName() { return profile()?.name || session()?.name || 'Volunteer'; }

  function parseHours(value) {
    const match = String(value || '').match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function renderedVerifiedHours() {
    const node = qs('[data-stat-hours]');
    return node ? parseHours(node.textContent) : 0;
  }

  function verifiedHours() {
    const rendered = renderedVerifiedHours();
    if (rendered > 0) return rendered;
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

  function syncProfileActions() {
    const signedIn = Boolean(currentEmail());
    const profileCard = qs('.dashboard-profile-card');
    if (!profileCard) return;
    const signIn = qs('[data-auth-entry]', profileCard);
    const signOut = qs('[data-auth-sign-out]', profileCard);
    if (signIn) {
      signIn.hidden = signedIn;
      signIn.textContent = 'Sign in';
    }
    if (signOut) {
      signOut.hidden = !signedIn;
      signOut.textContent = 'Sign out';
    }
  }

  function buildVolunteerProfileHero() {
    const card = qs('.dashboard-profile-card');
    if (!card) return null;
    let hero = qs('[data-volunteer-profile-hero]', card);
    if (!hero) {
      hero = document.createElement('div');
      hero.className = 'volunteer-profile-hero';
      hero.dataset.volunteerProfileHero = 'true';
      card.prepend(hero);
    }
    const signedIn = Boolean(currentEmail());
    hero.innerHTML = `
      <p class="eyebrow dark">Volunteer profile</p>
      <h2>${signedIn ? `Welcome back, ${escapeHtml(displayName())}` : 'Welcome to your volunteer profile'}</h2>
    `;
    return hero;
  }

  function mergeStatsIntoProfileCard() {
    const profileCard = qs('.dashboard-profile-card');
    const statsCard = qs('#stats-title')?.closest('.dashboard-card');
    if (!profileCard || !statsCard || statsCard === profileCard) return;

    let target = qs('[data-profile-stats]', profileCard);
    if (!target) {
      target = document.createElement('div');
      target.className = 'profile-stats-merged';
      target.dataset.profileStats = 'true';
    }

    const statTitle = qs('#stats-title', statsCard);
    const statGrid = qs('.dashboard-stat-grid', statsCard);
    const statMuted = qsa(':scope > .dashboard-muted, :scope > [data-stat-pending-attendance]', statsCard);
    const progress = qs('[data-ui-progress]', statsCard);

    if (statTitle && statTitle.parentElement !== target) target.append(statTitle);
    if (statGrid && statGrid.parentElement !== target) target.append(statGrid);
    statMuted.forEach(node => { if (node.parentElement !== target) target.append(node); });
    if (progress && progress.parentElement !== target) target.append(progress);

    if (!target.parentElement) profileCard.append(target);
    statsCard.hidden = true;
    statsCard.dataset.mergedIntoProfile = 'true';
  }

  function removeProfileDetailRows(card) {
    const summary = qs('[data-profile-summary]', card) || qs('.profile-summary', card);
    if (summary) {
      summary.replaceChildren();
      summary.hidden = true;
      summary.setAttribute('aria-hidden', 'true');
      summary.dataset.profileSummaryRemoved = 'true';
      summary.style.setProperty('display', 'none', 'important');
    }
    qsa('.profile-pill', card).forEach(node => node.remove());
  }

  function decorateProfileCard() {
    const card = qs('.dashboard-profile-card');
    if (!card) return;
    card.querySelector('[data-ui-profile-welcome]')?.remove();
    card.querySelector('[data-ui-value-empty]')?.remove();
    buildVolunteerProfileHero();
    const legacyHeader = qs(':scope > div:not([data-volunteer-profile-hero]):not([data-profile-stats]):not(.dashboard-actions)', card);
    if (legacyHeader) {
      legacyHeader.hidden = true;
      legacyHeader.setAttribute('aria-hidden', 'true');
      legacyHeader.style.setProperty('display', 'none', 'important');
    }
    removeProfileDetailRows(card);
    syncProfileActions();
    mergeStatsIntoProfileCard();
  }

  function decorateProgress() {
    const statsHost = qs('[data-profile-stats]') || qs('#stats-title')?.closest('.dashboard-card');
    if (!statsHost || !currentEmail()) return;
    statsHost.querySelector('[data-ui-progress]')?.remove();
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
    statsHost.append(wrap);
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
    qsa('[data-ui-next-meta]').forEach(node => node.remove());
    qsa('[data-signup-opportunity], [data-ymhub-signup]').forEach(button => {
      if (!button.dataset.uiCtaApplied && !button.disabled) {
        button.dataset.uiCtaApplied = 'true';
        button.innerHTML = '<span class="ui-cta-emoji">Sign up on YM-Hub</span>';
      }
    });
  }

  function decorateOpportunityPage() {
    const top = qs('#page-opportunities .page-topper');
    if (!top || qs('[data-ui-opportunity-alert]')) return;
    const count = (() => { try { return state?.data?.opportunities?.length || 0; } catch (_) { return 0; } })();
    const alert = document.createElement('div');
    alert.className = 'ui-inline-alert';
    alert.dataset.uiOpportunityAlert = 'true';
    alert.innerHTML = `
      <div><strong>${count || 'New'} volunteer opportunities are available.</strong><p class="dashboard-muted">Use search and filters to find mentoring, facilitation, or community roles.</p></div>
      <button class="button button-primary" type="button" data-ui-focus-search>🔎 Filter roles</button>
    `;
    top.insertAdjacentElement('afterend', alert);
  }

  function removeOpportunityTimeline() {
    qsa('[data-ui-timeline], [data-ui-next-meta]').forEach(node => node.remove());
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
      if (event.target.closest('[data-ui-focus-search]')) qs('#opp-search')?.focus();
    });
  }

  function runEnhancements() {
    decorateProfileCard();
    decorateProgress();
    decorateStatusBadges();
    decorateCards();
    decorateOpportunityPage();
    removeOpportunityTimeline();
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

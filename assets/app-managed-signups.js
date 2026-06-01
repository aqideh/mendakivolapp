const MANAGED_YM_HUB_SIGNUP_URL = 'https://www.mendaki.org.sg/login';
const MANAGED_DEMO_ROSTER_NOTE = 'DEMO ATTENDANCE ROSTER - not YM-Hub/Salesforce source of truth';

function managedSignupMake(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  });
  children.filter(Boolean).forEach(child => node.append(child));
  return node;
}

function managedSignupOpportunity(id) {
  try {
    return typeof state !== 'undefined'
      ? state.data?.opportunities?.find(item => String(item.id) === String(id))
      : null;
  } catch (error) {
    return null;
  }
}

function managedSignupOpportunities() {
  try {
    return Array.isArray(state?.data?.opportunities) ? state.data.opportunities : [];
  } catch (error) {
    return [];
  }
}

function managedSignupIcon(id) {
  const template = document.querySelector(`#${id}`);
  return template ? template.content.firstElementChild.cloneNode(true) : document.createElement('span');
}

function managedSignupBadgeClass(value = '') {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (normalized === 'long-term') return 'badge-long-term';
  if (normalized === 'ad-hoc') return 'badge-ad-hoc';
  return 'badge-open';
}

function managedSignupTypeLabel(type = '') {
  return type === 'long-term' ? 'Long-term' : 'Ad-hoc';
}

function managedOpenYmHubSignup() {
  const target = window.open(MANAGED_YM_HUB_SIGNUP_URL, '_blank', 'noopener');
  if (target) target.opener = null;
}

function managedSignupOpenOpportunityModal(id) {
  const opp = managedSignupOpportunity(id);
  const modal = document.querySelector('#modal');
  const layer = document.querySelector('#modal-layer');
  if (!opp || !modal || !layer) return;

  const actions = [
    managedSignupMake('button', {
      type: 'button',
      class: 'button button-primary',
      text: 'Sign up on YM-Hub',
      dataset: { ymhubSignup: String(id) }
    }),
    managedSignupMake('button', {
      type: 'button',
      class: 'button',
      text: 'Close',
      dataset: { closeModal: 'true' }
    })
  ];

  modal.replaceChildren(
    managedSignupMake('div', { class: 'modal-hero' }, [
      managedSignupMake('button', { type: 'button', class: 'close-button', 'aria-label': 'Close dialog', text: '×', dataset: { closeModal: 'true' } }),
      managedSignupMake('div', { class: 'hero-orb hero-orb-one' }),
      managedSignupMake('span', { class: `badge ${managedSignupBadgeClass(opp.type)}`, text: managedSignupTypeLabel(opp.type) }),
      managedSignupMake('h2', { id: 'modal-title', text: opp.title })
    ]),
    managedSignupMake('div', { class: 'modal-body' }, [
      managedSignupMake('div', { class: 'modal-meta' }, [
        managedSignupMake('span', { class: 'modal-chip' }, [managedSignupIcon('icon-clock'), document.createTextNode(opp.time || '')]),
        managedSignupMake('span', { class: 'modal-chip' }, [managedSignupIcon('icon-location'), document.createTextNode(opp.location || '')]),
        managedSignupMake('span', { class: 'modal-chip' }, [managedSignupIcon('icon-calendar'), document.createTextNode(opp.commitment || '')])
      ]),
      managedSignupMake('section', { class: 'modal-section' }, [
        managedSignupMake('h3', { text: 'About this role' }),
        managedSignupMake('p', { text: opp.description })
      ]),
      managedSignupMake('section', { class: 'modal-section' }, [
        managedSignupMake('h3', { text: 'Requirements' }),
        managedSignupMake('p', { text: opp.requirements })
      ])
    ]),
    managedSignupMake('div', { class: 'modal-actions' }, actions)
  );

  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.focus({ preventScroll: true }));
}

function managedSignupStore() {
  return window.VolunteerDataStore || null;
}

function managedSignupDataAccess() {
  return window.MENDAKIDataAccess || null;
}

function managedSignupCurrentSession() {
  return managedSignupStore()?.getSession?.() || null;
}

function managedSignupCurrentProfile() {
  return managedSignupStore()?.getProfile?.() || {};
}

function managedSignupIsAdmin() {
  return Boolean(managedSignupStore()?.isAdmin?.());
}

function managedSignupDefaultSession(oppId) {
  return window.MENDAKIOpportunitySessions?.defaultForOpportunity?.(oppId) || null;
}

function managedSignupEstimatedHours(opp, session) {
  if (Number(session?.defaultHours || 0) > 0) return Number(session.defaultHours);
  if (Number(opp?.defaultHours || 0) > 0) return Number(opp.defaultHours);
  const match = String(opp?.time || '').match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i);
  if (match) return Number(match[1]);
  return opp?.type === 'long-term' ? 2 : 4;
}

function managedSignupRefreshDemoViews() {
  window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
  if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
  if (typeof phaseThreeRender === 'function') phaseThreeRender();
  if (typeof renderOpportunities === 'function') renderOpportunities();
  if (window.MENDAKIVolunteerActions?.refreshAll) window.MENDAKIVolunteerActions.refreshAll();
}

function managedSignupUpsertLocalSignup(record) {
  const store = managedSignupStore();
  const signups = store?.getOpportunitySignups?.() || [];
  const index = signups.findIndex(item =>
    String(item.id) === String(record.id)
    || (item.email === record.email && String(item.opportunityId) === String(record.opportunityId))
  );
  if (index >= 0) signups[index] = { ...signups[index], ...record };
  else signups.unshift(record);
  store?.saveOpportunitySignups?.(signups);
  managedSignupRefreshDemoViews();
}

function managedSignupBuildDemoRecord(oppId) {
  const store = managedSignupStore();
  const session = managedSignupCurrentSession();
  const profile = managedSignupCurrentProfile();
  const opp = managedSignupOpportunity(oppId);
  if (!store || !session?.email || !opp) return null;

  const existing = (store.getOpportunitySignups?.() || []).find(item =>
    item.email === session.email && String(item.opportunityId) === String(opp.id)
  );
  const opportunitySession = managedSignupDefaultSession(opp.id);
  const now = new Date().toISOString();
  return {
    id: existing?.id || crypto.randomUUID(),
    opportunityId: String(opp.id),
    sessionId: existing?.sessionId || opportunitySession?.id || opp.sessionId || '',
    email: session.email,
    volunteerName: profile?.name || session.name || 'Demo Volunteer',
    title: opp.title || '',
    type: opp.type || '',
    category: opp.category || '',
    time: opportunitySession?.startsAt
      ? (opp.sessionTimeLabel || opp.time || '')
      : (opp.time || ''),
    location: opportunitySession?.location || opp.location || '',
    commitment: opp.commitment || '',
    hours: managedSignupEstimatedHours(opp, opportunitySession),
    status: 'confirmed',
    signedUpAt: existing?.signedUpAt || now,
    reviewedAt: now,
    reviewedBy: session.email || 'demo-admin',
    adminNotes: MANAGED_DEMO_ROSTER_NOTE,
    confirmedAt: now,
    waitlistedAt: '',
    declinedAt: '',
    cancelledAt: '',
    completedAt: '',
    verifiedHours: Number(existing?.verifiedHours || 0),
    updatedAt: now,
    demoOnly: true
  };
}

async function managedSignupPersistDemoRecord(record) {
  const store = managedSignupStore();
  const supabase = store?.authState?.supabase;
  if (!supabase || !managedSignupIsAdmin()) {
    managedSignupUpsertLocalSignup(record);
    return { ok: true, mode: 'local', signup: record };
  }

  const row = {
    id: record.id,
    opportunity_id: record.opportunityId,
    session_id: record.sessionId || null,
    volunteer_user_id: managedSignupCurrentSession()?.appUserId || null,
    email: record.email,
    volunteer_name: record.volunteerName,
    title: record.title,
    type: record.type,
    category: record.category,
    time: record.time,
    location: record.location,
    commitment: record.commitment,
    hours: record.hours,
    status: 'confirmed',
    signed_up_at: record.signedUpAt,
    reviewed_at: record.reviewedAt,
    reviewed_by_email: record.reviewedBy,
    admin_notes: record.adminNotes,
    confirmed_at: record.confirmedAt,
    waitlisted_at: null,
    declined_at: null,
    cancelled_at: null,
    completed_at: null,
    verified_hours: record.verifiedHours,
    updated_at: record.updatedAt
  };

  const { data, error } = await supabase
    .from('app_opportunity_signups')
    .upsert(row, { onConflict: 'opportunity_id,email' })
    .select('*')
    .single();
  if (error) throw error;

  const saved = managedSignupDataAccess()?.mappers?.opportunitySignupFromRow?.(data, record) || record;
  managedSignupUpsertLocalSignup({ ...saved, demoOnly: true });
  if (typeof store.fetchSupabaseOpportunitySignups === 'function') {
    await store.fetchSupabaseOpportunitySignups().catch(error => {
      console.warn('Demo roster created, but sign-up refresh failed.', error);
    });
  }
  managedSignupRefreshDemoViews();
  return { ok: true, mode: 'supabase', signup: saved };
}

function managedSignupRenderDemoRosterCard() {
  const layout = document.querySelector('#page-dashboard .dashboard-layout');
  const existing = document.querySelector('[data-demo-roster-card]');
  if (!layout || !managedSignupIsAdmin()) {
    existing?.remove();
    return;
  }

  const opportunities = managedSignupOpportunities();
  const session = managedSignupCurrentSession();
  const card = existing || document.createElement('section');
  card.className = 'dashboard-card admin-signup-card';
  card.dataset.demoRosterCard = 'true';
  card.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Attendance demo roster</h2>
        <p class="dashboard-muted">Create a confirmed demo sign-up for your current admin account. This keeps public sign-ups on YM-Hub while unlocking the attendance flow for demonstrations.</p>
      </div>
    </div>
    <form class="profile-form" data-demo-roster-form>
      <label>Opportunity
        <select name="opportunityId" ${opportunities.length ? '' : 'disabled'}>
          ${opportunities.map(opp => `<option value="${storeEscapeHtml(opp.id)}">${storeEscapeHtml(opp.title || opp.id)}</option>`).join('')}
        </select>
      </label>
      <p class="dashboard-muted">Demo volunteer: ${storeEscapeHtml(session?.email || 'Not signed in')}</p>
      <p class="dashboard-muted">Records are marked: ${storeEscapeHtml(MANAGED_DEMO_ROSTER_NOTE)}</p>
      <div class="dashboard-actions">
        <button class="button button-primary" type="submit" ${opportunities.length && session?.email ? '' : 'disabled'}>Create confirmed demo roster</button>
      </div>
      <p class="dashboard-muted" data-demo-roster-status></p>
    </form>
  `;

  if (!existing) layout.append(card);
}

function storeEscapeHtml(value) {
  return managedSignupStore()?.utils?.escapeHtml?.(value) || String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function managedSignupSetDemoRosterBusy(form, busy, message = '') {
  const button = form?.querySelector('button[type="submit"]');
  const status = form?.querySelector('[data-demo-roster-status]');
  if (button) {
    button.disabled = busy;
    button.textContent = busy ? 'Creating demo roster...' : 'Create confirmed demo roster';
  }
  if (status) status.textContent = message;
}

async function managedSignupHandleDemoRosterSubmit(form) {
  const formData = new FormData(form);
  const oppId = formData.get('opportunityId');
  const record = managedSignupBuildDemoRecord(oppId);
  if (!record) {
    managedSignupSetDemoRosterBusy(form, false, 'Could not prepare the demo roster. Check that you are signed in and an opportunity is selected.');
    return;
  }

  try {
    managedSignupSetDemoRosterBusy(form, true, 'Creating confirmed demo roster...');
    const result = await managedSignupPersistDemoRecord(record);
    const location = result.mode === 'supabase' ? 'Supabase' : 'local browser storage';
    managedSignupSetDemoRosterBusy(form, false, `Demo roster created in ${location}. The attendance card should now show this opportunity.`);
  } catch (error) {
    console.error('Could not create demo attendance roster.', error);
    managedSignupSetDemoRosterBusy(form, false, `Could not create demo roster: ${error.message || String(error)}`);
  }
}

document.addEventListener('click', event => {
  const signupButton = event.target.closest('[data-signup-opportunity], [data-ymhub-signup]');
  if (!signupButton) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  managedOpenYmHubSignup();
}, true);

document.addEventListener('click', event => {
  const oppCard = event.target.closest('[data-opp-id]');
  if (!oppCard) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  managedSignupOpenOpportunityModal(oppCard.dataset.oppId);
}, true);

document.addEventListener('submit', event => {
  const form = event.target.closest('[data-demo-roster-form]');
  if (!form) return;
  event.preventDefault();
  managedSignupHandleDemoRosterSubmit(form);
});

['DOMContentLoaded', 'volunteer-auth-ready', 'volunteer-auth-changed', 'volunteer-opportunities-synced', 'volunteer-opportunity-sessions-synced'].forEach(eventName => {
  window.addEventListener(eventName, () => window.setTimeout(managedSignupRenderDemoRosterCard, 120));
});

window.MENDAKIManagedSignups = Object.freeze({
  openYmHubSignup: managedOpenYmHubSignup,
  renderDemoRosterCard: managedSignupRenderDemoRosterCard,
  createDemoRosterForOpportunity: async opportunityId => managedSignupPersistDemoRecord(managedSignupBuildDemoRecord(opportunityId))
});

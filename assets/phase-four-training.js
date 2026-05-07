const PHASE_FOUR_TRAINING_SIGNUPS_KEY = VolunteerDataStore.keys.trainingSignups;

function phaseFourReadJson(key) {
  return VolunteerDataStore.readJson(key, null);
}

function phaseFourWriteJson(key, value) {
  return VolunteerDataStore.writeJson(key, value);
}

function phaseFourSession() {
  return VolunteerDataStore.normaliseSessionRole() || {};
}

function phaseFourProfile() {
  return VolunteerDataStore.getProfile() || {};
}

function phaseFourEmail() {
  return VolunteerDataStore.currentEmail();
}

function phaseFourIsSignedIn() {
  return VolunteerDataStore.isSignedIn();
}

function phaseFourIsAdmin() {
  return VolunteerDataStore.isAdmin();
}

function phaseFourTrainingSignups() {
  return VolunteerDataStore.getTrainingSignups();
}

function phaseFourWriteTrainingSignups(signups) {
  return VolunteerDataStore.saveTrainingSignups(signups);
}

function phaseFourAppState() {
  try {
    return typeof state !== 'undefined' ? state : null;
  } catch (error) {
    return null;
  }
}

function phaseFourTrainings() {
  return phaseFourAppState()?.data?.trainings || [];
}

function phaseFourFindTraining(id) {
  return phaseFourTrainings().find(training => String(training.id) === String(id));
}

function phaseFourEscape(value) {
  return String(value || '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function phaseFourFormatDate(value) {
  if (!value) return 'Date to be confirmed';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function phaseFourUserTrainingSignups() {
  const email = phaseFourEmail();
  return email ? phaseFourTrainingSignups().filter(item => item.email === email) : [];
}

function phaseFourSignupForTraining(trainingId) {
  if (!phaseFourIsSignedIn()) {
    if (typeof phaseOneOpenAuth === 'function') phaseOneOpenAuth();
    return { ok: false, reason: 'auth_required' };
  }

  const training = phaseFourFindTraining(trainingId);
  if (!training) return { ok: false, reason: 'not_found' };

  const email = phaseFourEmail();
  const profile = phaseFourProfile();
  const session = phaseFourSession();
  const signups = phaseFourTrainingSignups();
  const existing = signups.find(item => item.email === email && item.trainingId === trainingId);
  const record = {
    id: existing?.id || crypto.randomUUID(),
    trainingId,
    email,
    volunteerName: profile.name || session.name || 'Volunteer',
    title: training.title,
    date: training.date,
    time: training.time,
    location: training.location,
    trainer: training.trainer,
    status: 'registered',
    signedUpAt: existing?.signedUpAt || new Date().toISOString(),
    completedAt: '',
    updatedAt: new Date().toISOString()
  };

  if (existing) Object.assign(existing, record);
  else signups.push(record);
  phaseFourWriteTrainingSignups(signups);
  phaseFourRender();
  return { ok: true };
}

function phaseFourCancelTraining(trainingId) {
  const email = phaseFourEmail();
  const signups = phaseFourTrainingSignups();
  const existing = signups.find(item => item.email === email && item.trainingId === trainingId && item.status === 'registered');
  if (!existing) return { ok: false };
  existing.status = 'cancelled';
  existing.cancelledAt = new Date().toISOString();
  existing.updatedAt = new Date().toISOString();
  phaseFourWriteTrainingSignups(signups);
  phaseFourRender();
  return { ok: true };
}

function phaseFourCompleteTraining(signupId) {
  const signups = phaseFourTrainingSignups();
  const signup = signups.find(item => item.id === signupId);
  if (!signup) return;
  signup.status = 'completed';
  signup.completedAt = new Date().toISOString();
  signup.updatedAt = new Date().toISOString();
  phaseFourWriteTrainingSignups(signups);
  phaseFourRender();
}

function phaseFourMakeCard(training) {
  const email = phaseFourEmail();
  const signup = phaseFourTrainingSignups().find(item => item.email === email && item.trainingId === training.id && item.status !== 'cancelled');
  const isRegistered = signup?.status === 'registered';
  const isCompleted = signup?.status === 'completed';
  const card = document.createElement('article');
  card.className = 'training-card';
  card.innerHTML = `
    <div class="training-card-top">
      <span class="badge badge-programme">Training</span>
      <span class="badge ${training.status === 'Open' ? 'badge-open' : 'badge-ad-hoc'}">${phaseFourEscape(training.status || 'Open')}</span>
    </div>
    <h2>${phaseFourEscape(training.title)}</h2>
    <p>${phaseFourEscape(training.description)}</p>
    <div class="training-meta">
      <span>${phaseFourEscape(phaseFourFormatDate(training.date))}</span>
      <span>${phaseFourEscape(training.time || 'Time to be confirmed')}</span>
      <span>${phaseFourEscape(training.location || 'Location to be confirmed')}</span>
      <span>${phaseFourEscape(training.trainer || 'Trainer to be confirmed')}</span>
    </div>
    <div class="training-required">Recommended for: ${(training.requiredFor || []).map(item => `<span>${phaseFourEscape(item)}</span>`).join('')}</div>
    <div class="training-actions"></div>
  `;
  const actions = card.querySelector('.training-actions');
  if (isCompleted) {
    actions.append(phaseFourButton('Completed', 'button dashboard-secondary', {}, true));
  } else if (isRegistered) {
    actions.append(
      phaseFourButton('Signed up', 'button dashboard-secondary', {}, true),
      phaseFourButton('Cancel', 'text-button', { cancelTraining: training.id })
    );
  } else {
    actions.append(phaseFourButton('Sign up for training', 'button button-primary', { signupTraining: training.id }));
  }
  return card;
}

function phaseFourButton(text, className, dataset = {}, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  Object.assign(button.dataset, dataset);
  button.disabled = disabled;
  return button;
}

function phaseFourRenderTrainingPage() {
  const grid = document.querySelector('#training-grid');
  if (!grid) return;
  grid.replaceChildren();
  const trainings = phaseFourTrainings();
  if (!trainings.length) {
    const empty = document.createElement('div');
    empty.className = 'signup-empty';
    empty.textContent = 'No training sessions are currently listed.';
    grid.append(empty);
    return;
  }
  trainings.forEach(training => grid.append(phaseFourMakeCard(training)));
}

function phaseFourEnsureDashboardSections() {
  const layout = document.querySelector('.dashboard-layout');
  if (!layout || document.querySelector('[data-training-dashboard-card]')) return;

  const volunteerCard = document.createElement('section');
  volunteerCard.className = 'dashboard-card training-dashboard-card';
  volunteerCard.dataset.trainingDashboardCard = 'volunteer';
  volunteerCard.innerHTML = `
    <div class="section-header">
      <div>
        <h2>My training</h2>
        <p class="dashboard-muted">Training sessions you signed up for and completed.</p>
      </div>
      <button class="text-button" type="button" data-expansion-page-target="training">Browse training</button>
    </div>
    <div class="training-dashboard-list" data-training-dashboard-list></div>
  `;

  const adminCard = document.createElement('section');
  adminCard.className = 'dashboard-card training-dashboard-card admin-training-card';
  adminCard.dataset.trainingDashboardCard = 'admin';
  adminCard.hidden = true;
  adminCard.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Admin training completion</h2>
        <p class="dashboard-muted">Mark registered training participants as completed.</p>
      </div>
    </div>
    <div class="training-dashboard-list" data-admin-training-list></div>
  `;

  layout.append(volunteerCard, adminCard);
}

function phaseFourRenderDashboard() {
  phaseFourEnsureDashboardSections();
  const list = document.querySelector('[data-training-dashboard-list]');
  if (list) {
    list.replaceChildren();
    if (!phaseFourIsSignedIn()) {
      list.append(phaseFourEmpty('Sign in to view your training sign-ups.'));
    } else {
      const signups = phaseFourUserTrainingSignups().filter(item => item.status !== 'cancelled');
      if (!signups.length) list.append(phaseFourEmpty('No training sign-ups yet.'));
      signups.forEach(signup => list.append(phaseFourTrainingRow(signup, false)));
    }
  }

  const adminCard = document.querySelector('[data-training-dashboard-card="admin"]');
  const adminList = document.querySelector('[data-admin-training-list]');
  if (adminCard && adminList) {
    const isAdmin = phaseFourIsAdmin();
    adminCard.hidden = !isAdmin;
    adminList.replaceChildren();
    if (isAdmin) {
      const pending = phaseFourTrainingSignups().filter(item => item.status === 'registered');
      if (!pending.length) adminList.append(phaseFourEmpty('No registered training participants awaiting completion.'));
      pending.forEach(signup => adminList.append(phaseFourTrainingRow(signup, true)));
    }
  }
}

function phaseFourTrainingRow(signup, adminMode) {
  const row = document.createElement('div');
  row.className = 'training-dashboard-row';
  row.innerHTML = `
    <div>
      <strong>${phaseFourEscape(signup.title)}</strong>
      <p>${phaseFourEscape(phaseFourFormatDate(signup.date))} · ${phaseFourEscape(signup.time || '')} · ${phaseFourEscape(signup.location || '')}</p>
      ${adminMode ? `<p>${phaseFourEscape(signup.volunteerName)} · ${phaseFourEscape(signup.email)}</p>` : ''}
    </div>
    <span class="badge ${signup.status === 'completed' ? 'badge-open' : 'badge-programme'}">${phaseFourEscape(signup.status)}</span>
  `;
  if (adminMode) {
    row.append(phaseFourButton('Mark completed', 'button button-primary', { completeTraining: signup.id }));
  }
  return row;
}

function phaseFourEmpty(text) {
  const row = document.createElement('div');
  row.className = 'signup-empty';
  row.textContent = text;
  return row;
}

function phaseFourRender() {
  phaseFourRenderTrainingPage();
  phaseFourRenderDashboard();
}

function phaseFourBind() {
  document.addEventListener('click', event => {
    const trainingNav = event.target.closest('[data-expansion-page-target="training"]');
    if (trainingNav) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof phaseOneSetActivePage === 'function') phaseOneSetActivePage('training');
      phaseFourRenderTrainingPage();
      return;
    }

    const signup = event.target.closest('[data-signup-training]');
    if (signup) {
      event.preventDefault();
      phaseFourSignupForTraining(signup.dataset.signupTraining);
      return;
    }

    const cancel = event.target.closest('[data-cancel-training]');
    if (cancel) {
      event.preventDefault();
      phaseFourCancelTraining(cancel.dataset.cancelTraining);
      return;
    }

    const complete = event.target.closest('[data-complete-training]');
    if (complete) {
      event.preventDefault();
      phaseFourCompleteTraining(complete.dataset.completeTraining);
    }
  }, true);
}

document.addEventListener('DOMContentLoaded', () => {
  phaseFourBind();
  window.setTimeout(phaseFourRender, 0);
});

window.addEventListener('storage', phaseFourRender);

const PHASE_FOUR_TRAINING_SIGNUPS_KEY = VolunteerDataStore.keys.trainingSignups;

function phaseFourReadJson(key) {
  return VolunteerDataStore.readJson(key, null);
}

function phaseFourWriteJson(key, value) {
  return VolunteerDataStore.writeJson(key, value);
}

function phaseFourProfile() {
  return VolunteerDataStore.getProfile() || {};
}

function phaseFourIsSignedIn() {
  return VolunteerDataStore.isSignedIn();
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

function phaseFourFormatDate(value) {
  if (!value) return 'Date to be confirmed';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function phaseFourUserTrainingSignups() {
  const email = VolunteerDataStore.$.email();
  return email ? phaseFourTrainingSignups().filter(item => item.email === email) : [];
}

function phaseFourSignupForTraining(trainingId) {
  if (!phaseFourIsSignedIn()) {
    if (typeof phaseOneOpenAuth === 'function') phaseOneOpenAuth();
    return { ok: false, reason: 'auth_required' };
  }

  const training = phaseFourFindTraining(trainingId);
  if (!training) return { ok: false, reason: 'not_found' };

  const email = VolunteerDataStore.$.email();
  const profile = phaseFourProfile();
  const session = VolunteerDataStore.$.session();
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
  const email = VolunteerDataStore.$.email();
  const signups = phaseFourTrainingSignups();
  const existing = signups.find(item => item.email === email && item.trainingId === trainingId && ['registered', 'waitlisted'].includes(item.status));
  if (!existing) return { ok: false };
  existing.status = 'cancelled';
  existing.cancelledAt = new Date().toISOString();
  existing.updatedAt = new Date().toISOString();
  phaseFourWriteTrainingSignups(signups);
  phaseFourRender();
  return { ok: true };
}

function phaseFourUpdateTrainingStatus(signupId, status, adminNotes = '') {
  const signups = phaseFourTrainingSignups();
  const signup = signups.find(item => item.id === signupId);
  if (!signup) return;
  signup.status = status;
  signup.adminNotes = adminNotes;
  signup.reviewedBy = VolunteerDataStore.$.email() || 'admin';
  signup.reviewedAt = new Date().toISOString();
  if (status === 'completed') signup.completedAt = signup.completedAt || new Date().toISOString();
  if (['cancelled', 'declined', 'no_show'].includes(status)) signup.cancelledAt = signup.cancelledAt || new Date().toISOString();
  signup.updatedAt = new Date().toISOString();
  phaseFourWriteTrainingSignups(signups);
  phaseFourRender();
}

function phaseFourCompleteTraining(signupId) {
  phaseFourUpdateTrainingStatus(signupId, 'completed');
}

function phaseFourMakeCard(training) {
  const escapeHtml = VolunteerDataStore.utils.escapeHtml;
  const email = VolunteerDataStore.$.email();
  const signup = phaseFourTrainingSignups().find(item => item.email === email && item.trainingId === training.id && item.status !== 'cancelled');
  const isRegistered = signup?.status === 'registered';
  const isWaitlisted = signup?.status === 'waitlisted';
  const isCompleted = signup?.status === 'completed';
  const isDeclined = signup?.status === 'declined';
  const card = document.createElement('article');
  card.className = 'training-card';
  card.innerHTML = `
    <div class="training-card-top">
      <span class="badge badge-programme">Training</span>
      <span class="badge ${training.status === 'Open' ? 'badge-open' : 'badge-ad-hoc'}">${escapeHtml(training.status || 'Open')}</span>
      ${Number(training.capacity || 0) ? `<span class="badge badge-category">Capacity ${escapeHtml(training.capacity)}</span>` : ''}
    </div>
    <h2>${escapeHtml(training.title)}</h2>
    <p>${escapeHtml(training.description)}</p>
    <div class="training-meta">
      <span>${escapeHtml(phaseFourFormatDate(training.date))}</span>
      <span>${escapeHtml(training.time || 'Time to be confirmed')}</span>
      <span>${escapeHtml(training.location || 'Location to be confirmed')}</span>
      <span>${escapeHtml(training.trainer || 'Trainer to be confirmed')}</span>
    </div>
    <div class="training-required">Recommended for: ${(training.requiredFor || []).map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
    <div class="training-actions"></div>
  `;
  const actions = card.querySelector('.training-actions');
  if (isCompleted) {
    actions.append(phaseFourButton('Completed', 'button dashboard-secondary', {}, true));
  } else if (isRegistered || isWaitlisted) {
    actions.append(
      phaseFourButton(isWaitlisted ? 'Waitlisted' : 'Signed up', 'button dashboard-secondary', {}, true),
      phaseFourButton('Cancel', 'text-button', { cancelTraining: training.id })
    );
  } else if (isDeclined) {
    actions.append(phaseFourButton('Declined', 'button dashboard-secondary', {}, true));
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
        <h2>Admin training lifecycle</h2>
        <p class="dashboard-muted">Review training registrations, waitlists, completion, and no-shows.</p>
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
    const isAdmin = VolunteerDataStore.$.isAdmin();
    adminCard.hidden = !isAdmin;
    adminList.replaceChildren();
    if (isAdmin) {
      const visible = phaseFourTrainingSignups().filter(item => !['cancelled', 'completed', 'declined', 'no_show'].includes(item.status));
      if (!visible.length) adminList.append(phaseFourEmpty('No active training registrations awaiting review.'));
      visible.forEach(signup => adminList.append(phaseFourTrainingRow(signup, true)));
    }
  }
}

function phaseFourTrainingRow(signup, adminMode) {
  const escapeHtml = VolunteerDataStore.utils.escapeHtml;
  const row = document.createElement('div');
  row.className = 'training-dashboard-row';
  row.innerHTML = `
    <div>
      <strong>${escapeHtml(signup.title)}</strong>
      <p>${escapeHtml(phaseFourFormatDate(signup.date))} · ${escapeHtml(signup.time || '')} · ${escapeHtml(signup.location || '')}</p>
      ${adminMode ? `<p>${escapeHtml(signup.volunteerName)} · ${escapeHtml(signup.email)}</p>` : ''}
      ${signup.adminNotes ? `<p class="dashboard-muted">Admin note: ${escapeHtml(signup.adminNotes)}</p>` : ''}
    </div>
    <span class="badge ${VolunteerDataStore.statusBadges.getStatusBadgeClass(signup.status, 'training')}">${escapeHtml(VolunteerDataStore.statusLabels.getStatusLabel(signup.status, 'training'))}</span>
  `;
  if (adminMode) {
    const actions = document.createElement('div');
    actions.className = 'training-admin-actions';
    actions.append(
      phaseFourButton('Confirm', 'button dashboard-secondary', { trainingStatus: signup.id, trainingNextStatus: 'registered' }),
      phaseFourButton('Waitlist', 'button dashboard-secondary', { trainingStatus: signup.id, trainingNextStatus: 'waitlisted' }),
      phaseFourButton('Complete', 'button button-primary', { trainingStatus: signup.id, trainingNextStatus: 'completed' }),
      phaseFourButton('No-show', 'button dashboard-secondary', { trainingStatus: signup.id, trainingNextStatus: 'no_show' }),
      phaseFourButton('Decline', 'button dashboard-secondary', { trainingStatus: signup.id, trainingNextStatus: 'declined' })
    );
    row.append(actions);
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

    const statusButton = event.target.closest('[data-training-status]');
    if (statusButton) {
      event.preventDefault();
      phaseFourUpdateTrainingStatus(statusButton.dataset.trainingStatus, statusButton.dataset.trainingNextStatus || 'registered');
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

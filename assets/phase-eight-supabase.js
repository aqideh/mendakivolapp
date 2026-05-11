(() => {
  const SIGNUP_TABLE = 'app_opportunity_signups';
  const OPPORTUNITY_TABLE = 'app_opportunities';

  function client() {
    return window.VolunteerDataStore?.authState?.supabase || null;
  }

  function session() {
    return window.VolunteerDataStore?.getSession?.() || null;
  }

  function appState() {
    try {
      return typeof state !== 'undefined' ? state : null;
    } catch (error) {
      return null;
    }
  }

  function isSupabaseReady() {
    return Boolean(client() && session()?.authUserId);
  }

  function rowToSignup(row) {
    return {
      id: row.id,
      opportunityId: String(row.opportunity_id),
      email: row.email,
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

  function signupToRow(signup) {
    const current = session() || {};
    const now = new Date().toISOString();
    return {
      id: signup.id,
      opportunity_id: String(signup.opportunityId),
      volunteer_user_id: signup.appUserId || current.appUserId || null,
      email: signup.email || current.email || '',
      volunteer_name: signup.volunteerName || current.name || 'Volunteer',
      title: signup.title || '',
      type: signup.type || '',
      category: signup.category || '',
      time: signup.time || '',
      location: signup.location || '',
      commitment: signup.commitment || '',
      hours: Number(signup.hours || 0),
      status: signup.status || 'pending_review',
      signed_up_at: signup.signedUpAt || now,
      reviewed_at: signup.reviewedAt || null,
      reviewed_by_email: signup.reviewedBy || null,
      admin_notes: signup.adminNotes || null,
      confirmed_at: signup.confirmedAt || null,
      waitlisted_at: signup.waitlistedAt || null,
      declined_at: signup.declinedAt || null,
      cancelled_at: signup.cancelledAt || null,
      completed_at: signup.completedAt || null,
      verified_hours: Number(signup.verifiedHours || 0),
      updated_at: signup.updatedAt || now
    };
  }

  function rowToOpportunity(row) {
    return {
      id: row.id,
      type: row.type || 'ad-hoc',
      category: row.category || 'community-volunteering',
      title: row.title || '',
      description: row.description || '',
      requirements: row.requirements || '',
      time: row.time || '',
      location: row.location || '',
      commitment: row.commitment || '',
      status: row.status || 'Open',
      capacity: Number(row.capacity || 0),
      waitlistEnabled: row.waitlist_enabled !== false,
      defaultHours: Number(row.default_hours || 0),
      startsAt: row.starts_at || '',
      endsAt: row.ends_at || '',
      photo: row.photo || '',
      photoAlt: row.photo_alt || ''
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

  async function fetchSupabaseOpportunities() {
    const supabase = client();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from(OPPORTUNITY_TABLE)
      .select('id, type, category, title, description, requirements, time, location, commitment, status, capacity, waitlist_enabled, default_hours, starts_at, ends_at, photo, photo_alt')
      .order('title', { ascending: true });

    if (error) {
      console.warn('Could not load Supabase opportunities; using CMS content fallback.', error);
      return [];
    }
    return Array.isArray(data) ? data.map(rowToOpportunity) : [];
  }

  function refreshOpportunityViews() {
    if (typeof renderHomeOpportunities === 'function') renderHomeOpportunities();
    if (typeof renderOpportunities === 'function') renderOpportunities();
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
  }

  async function applySupabaseOpportunities() {
    const currentState = appState();
    if (!currentState?.data) return { ok: false, count: 0, skipped: true };
    const opportunities = await fetchSupabaseOpportunities();
    if (!opportunities.length) return { ok: false, count: 0 };
    currentState.data.opportunities = opportunities;
    refreshOpportunityViews();
    window.dispatchEvent(new CustomEvent('volunteer-opportunities-synced'));
    return { ok: true, count: opportunities.length };
  }

  async function syncOpportunityToSupabase(opp) {
    const supabase = client();
    const current = session();
    if (!supabase || !current?.email || !window.VolunteerDataStore?.isAdmin?.()) return { ok: false, skipped: true };
    const { error } = await supabase
      .from(OPPORTUNITY_TABLE)
      .upsert(opportunityToRow(opp), { onConflict: 'id' });
    if (error) {
      console.warn('Could not sync opportunity to Supabase.', error);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  }

  async function syncOpportunitiesToSupabase(opportunities = []) {
    if (!Array.isArray(opportunities) || !opportunities.length) return { ok: true, count: 0 };
    const supabase = client();
    if (!supabase || !window.VolunteerDataStore?.isAdmin?.()) return { ok: false, skipped: true };
    const { error } = await supabase
      .from(OPPORTUNITY_TABLE)
      .upsert(opportunities.map(opportunityToRow), { onConflict: 'id' });
    if (error) {
      console.warn('Could not sync opportunities to Supabase.', error);
      return { ok: false, reason: error.message };
    }
    return { ok: true, count: opportunities.length };
  }

  async function fetchSupabaseOpportunitySignups() {
    const supabase = client();
    if (!supabase || !session()?.email) return [];
    const { data, error } = await supabase
      .from(SIGNUP_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Could not load Supabase opportunity sign-ups; keeping local fallback.', error);
      return window.VolunteerDataStore.getOpportunitySignups();
    }

    const signups = Array.isArray(data) ? data.map(rowToSignup) : [];
    window.VolunteerDataStore.saveOpportunitySignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
    return signups;
  }

  async function notifySavedSignup(saved, previousStatus) {
    const notifiableStatuses = ['confirmed', 'waitlisted', 'declined', 'completed'];
    if (!notifiableStatuses.includes(saved?.status)) return;
    if (previousStatus === saved.status) return;
    if (typeof window.VolunteerDataStore?.notifyOpportunityStatusChange !== 'function') return;
    await window.VolunteerDataStore.notifyOpportunityStatusChange(saved, saved.status);
  }

  async function createSupabaseSignupWithCapacity(signup) {
    const supabase = client();
    if (!supabase || !session()?.email || !signup?.opportunityId) return { ok: false, skipped: true };

    const { data, error } = await supabase.rpc('create_opportunity_signup_with_capacity', {
      p_signup_id: signup.id || null,
      p_opportunity_id: String(signup.opportunityId),
      p_volunteer_name: signup.volunteerName || session()?.name || 'Volunteer'
    });

    if (error) {
      console.warn('Capacity-aware sign-up failed. No local sign-up was created.', error);
      return { ok: false, reason: error.message };
    }

    const saved = rowToSignup(data);
    const signups = window.VolunteerDataStore.getOpportunitySignups();
    const index = signups.findIndex(item => item.id === saved.id || (item.email === saved.email && String(item.opportunityId) === String(saved.opportunityId)));
    if (index >= 0) signups[index] = saved;
    else signups.push(saved);
    window.VolunteerDataStore.saveOpportunitySignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
    await notifySavedSignup(saved, '');
    return { ok: true, signup: saved, capacityAware: true };
  }

  async function reviewSupabaseSignupWithCapacity(signup, previousStatus) {
    const supabase = client();
    if (!supabase || !session()?.email || !signup?.id || !window.VolunteerDataStore?.isAdmin?.()) return { ok: false, skipped: true };
    if (!['confirmed', 'waitlisted', 'declined', 'pending_review'].includes(signup.status)) return { ok: false, skipped: true };

    const { data, error } = await supabase.rpc('review_opportunity_signup_with_capacity', {
      p_signup_id: signup.id,
      p_status: signup.status,
      p_admin_notes: signup.adminNotes || null
    });

    if (error) {
      console.warn('Capacity-aware sign-up review failed. No local review decision was created.', error);
      return { ok: false, reason: error.message };
    }

    const saved = rowToSignup(data);
    const signups = window.VolunteerDataStore.getOpportunitySignups();
    const index = signups.findIndex(item => item.id === saved.id);
    if (index >= 0) signups[index] = saved;
    else signups.push(saved);
    window.VolunteerDataStore.saveOpportunitySignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
    await notifySavedSignup(saved, previousStatus || '');
    return { ok: true, signup: saved, capacityAware: true };
  }

  async function saveSupabaseOpportunitySignup(signup, options = {}) {
    const supabase = client();
    if (!supabase || !session()?.email || !signup?.id) return { ok: false, skipped: true };
    const existing = window.VolunteerDataStore.getOpportunitySignups().find(item => item.id === signup.id);
    const previousStatus = options.previousStatus || existing?.status || '';

    if (options.capacityCreate === true) {
      const capacityResult = await createSupabaseSignupWithCapacity(signup);
      if (capacityResult.ok) return capacityResult;
      return capacityResult;
    }

    if (options.capacityReview === true) {
      const reviewResult = await reviewSupabaseSignupWithCapacity(signup, previousStatus);
      if (reviewResult.ok) return reviewResult;
      return reviewResult;
    }

    const row = signupToRow(signup);
    const mode = options.mode || 'upsert';
    const request = mode === 'update'
      ? supabase.from(SIGNUP_TABLE).update(row).eq('id', signup.id)
      : supabase.from(SIGNUP_TABLE).upsert(row, { onConflict: 'id' });
    const { data, error } = await request.select('*').single();

    if (error) {
      console.warn('Could not save Supabase opportunity sign-up. No local fallback was applied.', error);
      return { ok: false, reason: error.message };
    }

    const saved = rowToSignup(data);
    const signups = window.VolunteerDataStore.getOpportunitySignups();
    const index = signups.findIndex(item => item.id === saved.id);
    if (index >= 0) signups[index] = saved;
    else signups.push(saved);
    window.VolunteerDataStore.saveOpportunitySignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
    await notifySavedSignup(saved, previousStatus);
    return { ok: true, signup: saved };
  }

  function signupById(signupId) {
    return window.VolunteerDataStore.getOpportunitySignups().find(item => item.id === signupId);
  }

  function signupByOpportunityForCurrentUser(oppId) {
    const email = window.VolunteerDataStore.currentEmail();
    return window.VolunteerDataStore.getOpportunitySignups()
      .find(item => item.email === email && String(item.opportunityId) === String(oppId));
  }

  function buildSignupDraft(oppId) {
    const current = session();
    if (!current?.email) return { ok: false, reason: 'auth_required' };
    const currentState = appState();
    const opp = currentState?.data?.opportunities?.find(item => String(item.id) === String(oppId));
    if (!opp) return { ok: false, reason: 'not_found' };
    const profile = window.VolunteerDataStore.getProfile?.() || {};
    const existing = signupByOpportunityForCurrentUser(oppId);
    return {
      ok: true,
      signup: {
        id: existing?.id || crypto.randomUUID(),
        opportunityId: String(opp.id),
        email: current.email,
        volunteerName: profile?.name || current.name || 'Volunteer',
        title: opp.title,
        type: opp.type,
        category: opp.category,
        time: opp.time,
        location: opp.location,
        commitment: opp.commitment,
        hours: Number(opp.defaultHours || existing?.hours || 0),
        status: 'pending_review',
        signedUpAt: existing?.signedUpAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  function setButtonBusy(button, busy, label = 'Saving...') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent || '';
      button.disabled = true;
      button.textContent = label;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  function showSignupNotice(message, variant = 'success') {
    if (typeof phaseTwoShowModalNotice === 'function') {
      phaseTwoShowModalNotice(message, variant);
      return;
    }
    if (variant === 'error') window.alert(message);
  }

  function labelForStatus(status) {
    if (typeof phaseTwoStatusLabel === 'function') return phaseTwoStatusLabel(status);
    return status || 'Pending review';
  }

  async function refreshAfterAuthoritativeWrite() {
    await fetchSupabaseOpportunitySignups();
    refreshVisibleSignupViews();
  }

  async function createAuthoritativeSignup(button) {
    const draft = buildSignupDraft(button.dataset.signupOpportunity);
    if (!draft.ok) {
      if (draft.reason === 'auth_required' && typeof phaseOneOpenAuth === 'function') phaseOneOpenAuth();
      else showSignupNotice('Could not create this sign-up. Please try again.', 'error');
      return;
    }

    setButtonBusy(button, true, 'Signing up...');
    const result = await createSupabaseSignupWithCapacity(draft.signup);
    setButtonBusy(button, false);

    if (!result.ok) {
      showSignupNotice(`Could not create this sign-up: ${result.reason || 'database write failed'}`, 'error');
      return;
    }

    await refreshAfterAuthoritativeWrite();
    button.textContent = labelForStatus(result.signup.status);
    button.disabled = true;
    showSignupNotice(`Your sign-up is ${labelForStatus(result.signup.status).toLowerCase()}. It will appear in your dashboard.`);
  }

  async function cancelAuthoritativeSignup(button) {
    const oppId = button.dataset.cancelSignup;
    const before = signupByOpportunityForCurrentUser(oppId);
    if (!before) {
      showSignupNotice('Could not find this sign-up to cancel.', 'error');
      return;
    }

    const next = {
      ...before,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setButtonBusy(button, true, 'Cancelling...');
    const result = await saveSupabaseOpportunitySignup(next, { mode: 'update', previousStatus: before.status || '' });
    setButtonBusy(button, false);

    if (!result.ok) {
      showSignupNotice(`Could not cancel this sign-up: ${result.reason || 'database write failed'}`, 'error');
      return;
    }

    await refreshAfterAuthoritativeWrite();
    showSignupNotice('Your sign-up was cancelled.');
  }

  async function reviewAuthoritativeSignup(button) {
    const signupId = button.dataset.signupId;
    const status = button.dataset.adminSignupStatus;
    const before = signupById(signupId);
    if (!before || !status) return;

    const next = {
      ...before,
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: session()?.email || 'admin',
      updatedAt: new Date().toISOString()
    };

    setButtonBusy(button, true, 'Saving...');
    const result = await reviewSupabaseSignupWithCapacity(next, before.status || '');
    setButtonBusy(button, false);

    if (!result.ok) {
      window.alert(`Could not update sign-up status: ${result.reason || 'database write failed'}`);
      return;
    }

    await refreshAfterAuthoritativeWrite();
  }

  function installAuthoritativeSignupHandlers() {
    if (window.__phaseEightAuthoritativeSignupHandlersInstalled) return;
    window.__phaseEightAuthoritativeSignupHandlersInstalled = true;

    document.addEventListener('click', event => {
      if (!isSupabaseReady()) return;

      const signupButton = event.target.closest('[data-signup-opportunity]');
      if (signupButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        createAuthoritativeSignup(signupButton);
        return;
      }

      const cancelButton = event.target.closest('[data-cancel-signup]');
      if (cancelButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelAuthoritativeSignup(cancelButton);
        return;
      }

      const adminStatusButton = event.target.closest('[data-admin-signup-status]');
      if (adminStatusButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        reviewAuthoritativeSignup(adminStatusButton);
      }
    }, true);
  }

  function persistSignupChange(signup, options = {}) {
    if (!signup) return Promise.resolve({ ok: false, reason: 'missing_signup' });
    return saveSupabaseOpportunitySignup(signup, options).then(result => {
      if (result?.ok) return fetchSupabaseOpportunitySignups();
      return result;
    });
  }

  function installSignupPersistenceWrappers() {
    if (window.__phaseEightSignupPersistenceInstalled) return;
    if (typeof phaseTwoCreateSignup !== 'function' || typeof phaseTwoCancelSignup !== 'function' || typeof phaseTwoUpdateSignupStatus !== 'function') return;
    window.__phaseEightSignupPersistenceInstalled = true;

    const originalCreate = phaseTwoCreateSignup;
    const originalCancel = phaseTwoCancelSignup;
    const originalUpdate = phaseTwoUpdateSignupStatus;

    window.phaseTwoCreateSignup = function phaseEightCreateSignup(oppId) {
      if (isSupabaseReady()) return { ok: false, reason: 'supabase_authoritative_handler' };
      const result = originalCreate(oppId);
      if (result?.ok && result.signup) persistSignupChange(result.signup, { mode: 'upsert', capacityCreate: true });
      return result;
    };

    window.phaseTwoCancelSignup = function phaseEightCancelSignup(oppId) {
      if (isSupabaseReady()) return { ok: false, reason: 'supabase_authoritative_handler' };
      const email = window.VolunteerDataStore.currentEmail();
      const before = signupByOpportunityForCurrentUser(oppId);
      const result = originalCancel(oppId);
      if (result?.ok) {
        const signup = window.VolunteerDataStore.getOpportunitySignups()
          .find(item => item.email === email && String(item.opportunityId) === String(oppId));
        persistSignupChange(signup, { mode: 'update', previousStatus: before?.status || '' });
      }
      return result;
    };

    window.phaseTwoUpdateSignupStatus = function phaseEightUpdateSignupStatus(signupId, status) {
      if (isSupabaseReady()) return { ok: false, reason: 'supabase_authoritative_handler' };
      const before = signupById(signupId);
      const previousStatus = before?.status || '';
      const result = originalUpdate(signupId, status);
      if (result?.ok) persistSignupChange(signupById(signupId), { mode: 'update', previousStatus, capacityReview: true });
      return result;
    };
  }

  function installClickPersistenceFallback() {
    if (window.__phaseEightClickPersistenceInstalled) return;
    window.__phaseEightClickPersistenceInstalled = true;

    document.addEventListener('click', event => {
      if (isSupabaseReady()) return;
      const cancelButton = event.target.closest('[data-cancel-signup]');
      if (cancelButton) {
        const oppId = cancelButton.dataset.cancelSignup;
        const before = signupByOpportunityForCurrentUser(oppId);
        window.setTimeout(() => persistSignupChange(signupByOpportunityForCurrentUser(oppId), { mode: 'update', previousStatus: before?.status || '' }), 0);
        return;
      }

      const signupButton = event.target.closest('[data-signup-opportunity]');
      if (signupButton) {
        const oppId = signupButton.dataset.signupOpportunity;
        window.setTimeout(() => persistSignupChange(signupByOpportunityForCurrentUser(oppId), { mode: 'upsert', capacityCreate: true }), 0);
      }
    }, true);
  }

  function refreshVisibleSignupViews() {
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof renderOpportunities === 'function') renderOpportunities();
  }

  async function syncSignupsAndRefresh() {
    if (!isSupabaseReady()) return;
    await fetchSupabaseOpportunitySignups();
    refreshVisibleSignupViews();
  }

  Object.assign(window.VolunteerDataStore, {
    fetchSupabaseOpportunities,
    applySupabaseOpportunities,
    syncOpportunityToSupabase,
    syncOpportunitiesToSupabase,
    fetchSupabaseOpportunitySignups,
    saveSupabaseOpportunitySignup,
    createSupabaseSignupWithCapacity,
    reviewSupabaseSignupWithCapacity
  });
  window.phaseTwoPersistSignupChange = persistSignupChange;

  installAuthoritativeSignupHandlers();

  window.addEventListener('volunteer-auth-ready', () => {
    installSignupPersistenceWrappers();
    installClickPersistenceFallback();
    applySupabaseOpportunities();
    syncSignupsAndRefresh();
  });
  window.addEventListener('volunteer-auth-changed', () => {
    installSignupPersistenceWrappers();
    installClickPersistenceFallback();
    applySupabaseOpportunities();
    syncSignupsAndRefresh();
  });
  window.addEventListener('volunteer-signups-synced', refreshVisibleSignupViews);

  document.addEventListener('DOMContentLoaded', () => {
    installSignupPersistenceWrappers();
    installClickPersistenceFallback();
    window.setTimeout(installSignupPersistenceWrappers, 0);
    window.setTimeout(applySupabaseOpportunities, 120);
    window.setTimeout(syncSignupsAndRefresh, 180);
  });
})();

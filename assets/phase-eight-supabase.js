(() => {
  const SIGNUP_TABLE = 'app_opportunity_signups';
  const OPPORTUNITY_TABLE = 'app_opportunities';

  function client() {
    return window.VolunteerDataStore?.authState?.supabase || null;
  }

  function session() {
    return window.VolunteerDataStore?.getSession?.() || null;
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
      .select('id, type, category, title, description, requirements, time, location, commitment, status, photo, photo_alt')
      .order('title', { ascending: true });

    if (error) {
      console.warn('Could not load Supabase opportunities; using CMS content fallback.', error);
      return [];
    }
    return Array.isArray(data) ? data.map(rowToOpportunity) : [];
  }

  function refreshOpportunityViews() {
    if (typeof window.renderHomeOpportunities === 'function') window.renderHomeOpportunities();
    if (typeof window.renderOpportunities === 'function') window.renderOpportunities();
    if (typeof window.phaseTwoRenderDashboardSignups === 'function') window.phaseTwoRenderDashboardSignups();
  }

  async function applySupabaseOpportunities() {
    const opportunities = await fetchSupabaseOpportunities();
    if (!opportunities.length) return { ok: false, count: 0 };
    if (window.state?.data) {
      window.state.data.opportunities = opportunities;
      refreshOpportunityViews();
      window.dispatchEvent(new CustomEvent('volunteer-opportunities-synced'));
    }
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

  async function saveSupabaseOpportunitySignup(signup) {
    const supabase = client();
    if (!supabase || !session()?.email || !signup?.id) return { ok: false, skipped: true };
    const { data, error } = await supabase
      .from(SIGNUP_TABLE)
      .upsert(signupToRow(signup), { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.warn('Could not save Supabase opportunity sign-up; local fallback remains active.', error);
      return { ok: false, reason: error.message };
    }

    const saved = rowToSignup(data);
    const signups = window.VolunteerDataStore.getOpportunitySignups();
    const index = signups.findIndex(item => item.id === saved.id);
    if (index >= 0) signups[index] = saved;
    else signups.push(saved);
    window.VolunteerDataStore.saveOpportunitySignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
    return { ok: true, signup: saved };
  }

  function installSignupPersistenceWrappers() {
    if (window.__phaseEightSignupPersistenceInstalled) return;
    if (typeof window.phaseTwoCreateSignup !== 'function' || typeof window.phaseTwoCancelSignup !== 'function' || typeof window.phaseTwoUpdateSignupStatus !== 'function') return;
    window.__phaseEightSignupPersistenceInstalled = true;

    const originalCreate = window.phaseTwoCreateSignup;
    const originalCancel = window.phaseTwoCancelSignup;
    const originalUpdate = window.phaseTwoUpdateSignupStatus;

    window.phaseTwoCreateSignup = function phaseEightCreateSignup(oppId) {
      const result = originalCreate(oppId);
      if (result?.ok && result.signup) {
        saveSupabaseOpportunitySignup(result.signup).then(() => fetchSupabaseOpportunitySignups());
      }
      return result;
    };

    window.phaseTwoCancelSignup = function phaseEightCancelSignup(oppId) {
      const email = window.VolunteerDataStore.currentEmail();
      const result = originalCancel(oppId);
      if (result?.ok) {
        const signup = window.VolunteerDataStore.getOpportunitySignups()
          .find(item => item.email === email && String(item.opportunityId) === String(oppId));
        if (signup) saveSupabaseOpportunitySignup(signup).then(() => fetchSupabaseOpportunitySignups());
      }
      return result;
    };

    window.phaseTwoUpdateSignupStatus = function phaseEightUpdateSignupStatus(signupId, status) {
      const result = originalUpdate(signupId, status);
      if (result?.ok) {
        const signup = window.VolunteerDataStore.getOpportunitySignups().find(item => item.id === signupId);
        if (signup) saveSupabaseOpportunitySignup(signup).then(() => fetchSupabaseOpportunitySignups());
      }
      return result;
    };
  }

  function refreshVisibleSignupViews() {
    if (typeof window.phaseTwoRenderDashboardSignups === 'function') window.phaseTwoRenderDashboardSignups();
    if (typeof window.phaseThreeRender === 'function') window.phaseThreeRender();
    if (typeof window.renderOpportunities === 'function') window.renderOpportunities();
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
    saveSupabaseOpportunitySignup
  });

  window.addEventListener('volunteer-auth-ready', () => {
    installSignupPersistenceWrappers();
    applySupabaseOpportunities();
    syncSignupsAndRefresh();
  });
  window.addEventListener('volunteer-auth-changed', () => {
    installSignupPersistenceWrappers();
    applySupabaseOpportunities();
    syncSignupsAndRefresh();
  });
  window.addEventListener('volunteer-signups-synced', refreshVisibleSignupViews);

  document.addEventListener('DOMContentLoaded', () => {
    installSignupPersistenceWrappers();
    window.setTimeout(installSignupPersistenceWrappers, 0);
    window.setTimeout(applySupabaseOpportunities, 120);
    window.setTimeout(syncSignupsAndRefresh, 180);
  });
})();

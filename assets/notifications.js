(() => {
  const TABLE = 'app_notifications';
  const state = {
    notifications: [],
    open: false
  };

  function client() {
    return window.VolunteerDataStore?.authState?.supabase || null;
  }

  function session() {
    return window.VolunteerDataStore?.getSession?.() || null;
  }

  function isAdmin() {
    return Boolean(window.VolunteerDataStore?.isAdmin?.());
  }

  function currentEmail() {
    return window.VolunteerDataStore?.currentEmail?.() || session()?.email || '';
  }

  function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  function rowToNotification(row) {
    return {
      id: row.id,
      recipientEmail: row.recipient_email,
      recipientRole: row.recipient_role || 'volunteer',
      title: row.title || '',
      message: row.message || '',
      type: row.notification_type || 'general',
      relatedTable: row.related_table || '',
      relatedId: row.related_id || '',
      groupKey: row.group_key || '',
      actionUrl: row.action_url || '',
      metadata: row.metadata || {},
      isRead: Boolean(row.is_read),
      createdAt: row.created_at || '',
      readAt: row.read_at || '',
      clearedAt: row.cleared_at || ''
    };
  }

  function notificationToRow(notification) {
    return {
      recipient_email: notification.recipientEmail,
      recipient_role: notification.recipientRole || 'volunteer',
      title: notification.title,
      message: notification.message || '',
      notification_type: notification.type || 'general',
      related_table: notification.relatedTable || null,
      related_id: notification.relatedId || null,
      group_key: notification.groupKey || null,
      action_url: notification.actionUrl || null,
      metadata: notification.metadata || {},
      is_read: Boolean(notification.isRead || false)
    };
  }

  function ensureNotificationShell() {
    if (document.querySelector('[data-notification-shell]')) return;
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const shell = document.createElement('div');
    shell.className = 'notification-shell';
    shell.dataset.notificationShell = 'true';
    shell.hidden = true;
    shell.innerHTML = `
      <button class="notification-bell" type="button" data-notification-bell aria-label="Notifications">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span class="notification-count" data-notification-count>0</span>
      </button>
      <section class="notification-panel" data-notification-panel aria-label="Notifications">
        <div class="notification-panel-header">
          <strong>Notifications</strong>
          <span class="notification-panel-actions">
            <button type="button" data-notification-mark-read>Mark all read</button>
            <button type="button" data-notification-clear-all>Clear all</button>
          </span>
        </div>
        <div class="notification-list" data-notification-list></div>
      </section>
    `;
    headerActions.prepend(shell);
  }

  function showToast(message) {
    document.querySelector('[data-notification-toast]')?.remove();
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.dataset.notificationToast = 'true';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }

  function renderNotifications() {
    ensureNotificationShell();
    const shell = document.querySelector('[data-notification-shell]');
    const bell = document.querySelector('[data-notification-bell]');
    const count = document.querySelector('[data-notification-count]');
    const panel = document.querySelector('[data-notification-panel]');
    const list = document.querySelector('[data-notification-list]');
    const signedIn = Boolean(currentEmail());
    const escapeHtml = window.VolunteerDataStore.utils.escapeHtml;

    if (!shell || !bell || !count || !panel || !list) return;
    shell.hidden = !signedIn;
    if (!signedIn) return;

    const visibleNotifications = state.notifications.filter(item => !item.clearedAt);
    const unread = visibleNotifications.filter(item => !item.isRead).length;
    bell.classList.toggle('has-unread', unread > 0);
    count.textContent = unread > 99 ? '99+' : String(unread);
    panel.classList.toggle('open', state.open);

    if (!visibleNotifications.length) {
      list.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
      return;
    }

    list.innerHTML = visibleNotifications.slice(0, 20).map(item => `
      <button class="notification-item ${item.isRead ? '' : 'unread'}" type="button" data-notification-id="${escapeHtml(item.id)}">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.message)}</p>
        <time>${escapeHtml(formatTime(item.createdAt))}</time>
      </button>
    `).join('');
  }

  async function fetchNotifications() {
    const supabase = client();
    const email = currentEmail();
    if (!supabase || !email) {
      state.notifications = [];
      renderNotifications();
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .is('cleared_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Could not load notifications.', error);
      renderNotifications();
      return [];
    }

    state.notifications = Array.isArray(data) ? data.map(rowToNotification) : [];
    renderNotifications();
    return state.notifications;
  }

  async function notificationExists(notification) {
    const supabase = client();
    if (!supabase || !notification?.recipientEmail || !notification?.type || !notification?.relatedId) return false;

    const { data, error } = await supabase
      .from(TABLE)
      .select('id')
      .eq('recipient_email', notification.recipientEmail)
      .eq('notification_type', notification.type)
      .eq('related_table', notification.relatedTable || '')
      .eq('related_id', String(notification.relatedId))
      .is('cleared_at', null)
      .limit(1);

    if (error) {
      console.warn('Could not check existing notification.', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  }

  async function createNotificationViaRpc(notification) {
    const supabase = client();
    if (!supabase) return { ok: false, skipped: true };
    const groupKey = notification.groupKey || [notification.recipientEmail, notification.type, notification.relatedTable, notification.relatedId].filter(Boolean).join(':') || null;
    const { data, error } = await supabase.rpc('create_app_notification', {
      p_recipient_email: notification.recipientEmail || null,
      p_recipient_role: notification.recipientRole || 'volunteer',
      p_title: notification.title,
      p_message: notification.message || '',
      p_notification_type: notification.type || 'general',
      p_related_table: notification.relatedTable || null,
      p_related_id: notification.relatedId ? String(notification.relatedId) : null,
      p_group_key: groupKey,
      p_action_url: notification.actionUrl || null,
      p_metadata: notification.metadata || {}
    });
    if (error) return { ok: false, reason: error.message, fallback: true };
    return data?.ok === false ? { ok: false, reason: data.reason } : { ok: true, data };
  }

  async function createNotification(notification, options = {}) {
    const supabase = client();
    if (!supabase || !notification?.recipientEmail || !notification?.title) return { ok: false, skipped: true };

    const rpcResult = await createNotificationViaRpc(notification);
    if (rpcResult.ok || rpcResult.reason === 'preference_disabled') {
      await fetchNotifications();
      if (window.MENDAKINotificationPolish?.sync) window.MENDAKINotificationPolish.sync();
      return rpcResult;
    }

    if (options.dedupe !== false && await notificationExists(notification)) return { ok: true, deduped: true };

    const { error } = await supabase
      .from(TABLE)
      .insert(notificationToRow(notification));

    if (error) {
      console.warn('Could not create notification.', error);
      return { ok: false, reason: error.message };
    }

    await fetchNotifications();
    if (window.MENDAKINotificationPolish?.sync) window.MENDAKINotificationPolish.sync();
    return { ok: true };
  }

  async function updateNotifications(ids, payload) {
    const supabase = client();
    if (!supabase || !ids?.length) return { ok: false, skipped: true };
    const { error } = await supabase.from(TABLE).update(payload).in('id', ids);
    if (error) {
      console.warn('Could not update notifications.', error);
      return { ok: false, reason: error.message };
    }
    if (window.MENDAKINotificationPolish?.sync) window.MENDAKINotificationPolish.sync();
    return { ok: true };
  }

  async function markAllRead() {
    const unreadIds = state.notifications.filter(item => !item.isRead && !item.clearedAt && item.id && !String(item.id).startsWith('admin-pending-')).map(item => item.id);
    if (!unreadIds.length) {
      state.notifications = state.notifications.map(item => ({ ...item, isRead: true }));
      state.open = false;
      renderNotifications();
      return;
    }

    const now = new Date().toISOString();
    const result = await updateNotifications(unreadIds, { is_read: true, read_at: now });
    if (!result.ok) return;

    state.notifications = state.notifications.map(item => ({ ...item, isRead: true, readAt: item.readAt || now }));
    renderNotifications();
  }

  async function markOneRead(notification) {
    if (!notification || notification.isRead) return;
    const now = new Date().toISOString();
    notification.isRead = true;
    notification.readAt = now;
    if (!String(notification.id).startsWith('admin-pending-')) {
      await updateNotifications([notification.id], { is_read: true, read_at: now });
    }
    renderNotifications();
  }

  async function clearAllNotifications() {
    const visible = state.notifications.filter(item => !item.clearedAt);
    if (!visible.length) {
      showToast('No notifications to clear');
      return;
    }

    const now = new Date().toISOString();
    const persistedIds = visible.filter(item => item.id && !String(item.id).startsWith('admin-pending-')).map(item => item.id);
    if (persistedIds.length) {
      const result = await updateNotifications(persistedIds, { is_read: true, read_at: now, cleared_at: now });
      if (!result.ok) return;
    }

    state.notifications = [];
    state.open = false;
    renderNotifications();
    showToast('Notifications cleared');
  }

  function goToPage(pageName) {
    const selector = `[data-page-target="${pageName}"], [data-expansion-page-target="${pageName}"]`;
    const button = document.querySelector(selector);
    if (button) button.click();
    else window.location.hash = pageName;
  }

  function goToDashboardView(viewName) {
    goToPage('dashboard');
    window.setTimeout(() => {
      const target = document.querySelector(`[data-dashboard-view-target="${viewName}"]`);
      if (target) target.click();
    }, 120);
  }

  function routeNotification(notification) {
    if (!notification) return;
    const type = notification.type || '';
    const table = notification.relatedTable || '';

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
      return;
    }
    if (type === 'admin_task') {
      goToDashboardView('admin');
      return;
    }
    if (table === 'app_attendance_claims' || type.startsWith('attendance_')) {
      goToDashboardView(isAdmin() ? 'admin' : 'attendance');
      return;
    }
    if (table === 'app_training_signups' || type.startsWith('training_')) {
      goToDashboardView(isAdmin() ? 'admin' : 'training');
      return;
    }
    if (table === 'app_opportunity_signups' || type.startsWith('opportunity_')) {
      goToDashboardView(isAdmin() ? 'admin' : 'opportunities');
      return;
    }
    if (table === 'app_referrals' || type.startsWith('referral_')) {
      goToDashboardView('opportunities');
      return;
    }
    if (table === 'app_points_ledger' || type.startsWith('points_') || type.startsWith('achievement_')) {
      goToDashboardView('opportunities');
      return;
    }
    if (table === 'app_news_items' || type.startsWith('news_')) {
      goToPage('news');
      return;
    }
    goToDashboardView('home');
  }

  async function notifyOpportunityStatusChange(signup, status = signup?.status) {
    const labels = {
      confirmed: ['Opportunity confirmed', `You have been confirmed for ${signup?.title || 'your opportunity'}.`],
      waitlisted: ['Opportunity waitlisted', `You have been waitlisted for ${signup?.title || 'your opportunity'}.`],
      declined: ['Opportunity not selected', `Your sign-up for ${signup?.title || 'your opportunity'} was not selected.`],
      completed: ['Opportunity completed', `Your volunteering hours for ${signup?.title || 'your opportunity'} have been verified.`]
    };
    const copy = labels[status];
    if (!copy || !signup?.email || !signup?.id) return { ok: false, skipped: true };
    return createNotification({
      recipientEmail: signup.email,
      recipientRole: 'volunteer',
      title: copy[0],
      message: copy[1],
      type: `opportunity_${status}`,
      relatedTable: 'app_opportunity_signups',
      relatedId: signup.id,
      groupKey: `opportunity:${signup.id}:${status}`
    });
  }

  async function notifyAttendanceReview(claim) {
    const labels = {
      verified: ['Attendance verified', `Your attendance for ${claim?.title || 'your opportunity'} has been verified.`],
      adjusted: ['Attendance adjusted', `Your attendance hours for ${claim?.title || 'your opportunity'} have been adjusted and verified.`],
      clarification_requested: ['Attendance clarification needed', `Admin requested clarification for your attendance record: ${claim?.title || 'your opportunity'}.`],
      rejected: ['Attendance rejected', `Your attendance record for ${claim?.title || 'your opportunity'} was rejected.`]
    };
    const copy = labels[claim?.claimStatus];
    if (!copy || !claim?.email || !claim?.id) return { ok: false, skipped: true };
    return createNotification({
      recipientEmail: claim.email,
      recipientRole: 'volunteer',
      title: copy[0],
      message: copy[1],
      type: `attendance_${claim.claimStatus}`,
      relatedTable: 'app_attendance_claims',
      relatedId: claim.id,
      groupKey: `attendance:${claim.id}:${claim.claimStatus}`
    });
  }

  async function notifyTrainingCompletion(signup) {
    if (!signup?.email || signup.status !== 'completed' || !signup?.id) return { ok: false, skipped: true };
    return createNotification({
      recipientEmail: signup.email,
      recipientRole: 'volunteer',
      title: 'Training completed',
      message: `Your completion for ${signup.title || 'your training'} has been recorded.`,
      type: 'training_completed',
      relatedTable: 'app_training_signups',
      relatedId: signup.id,
      groupKey: `training:${signup.id}:completed`
    });
  }

  async function notifyReferralAccepted(referral) {
    if (!referral?.referrer_email && !referral?.referrerEmail) return { ok: false, skipped: true };
    const email = referral.referrer_email || referral.referrerEmail;
    const name = referral.referred_name || referral.referredName || referral.referred_email || referral.referredEmail || 'A referred volunteer';
    return createNotification({
      recipientEmail: email,
      recipientRole: 'volunteer',
      title: 'Referral accepted',
      message: `${name} accepted your volunteer referral.`,
      type: 'referral_accepted',
      relatedTable: 'app_referrals',
      relatedId: referral.id || referral.referral_id || '',
      groupKey: `referral:${referral.id || referral.referral_id || email}`
    });
  }

  async function notifyPointsAwarded(entry) {
    if (!entry?.volunteer_email && !entry?.email) return { ok: false, skipped: true };
    const email = entry.volunteer_email || entry.email;
    const points = Number(entry.points || 0);
    return createNotification({
      recipientEmail: email,
      recipientRole: 'volunteer',
      title: 'Points awarded',
      message: `${points > 0 ? '+' : ''}${points} volunteer points were added to your profile.`,
      type: 'points_awarded',
      relatedTable: 'app_points_ledger',
      relatedId: entry.ledger_id || entry.id || '',
      groupKey: `points:${entry.ledger_id || entry.id || email}`,
      metadata: { reason: entry.points_reason || entry.reason || '' }
    });
  }

  async function notifyAchievementUnlocked(userEmail, achievement) {
    if (!userEmail || !achievement?.id) return { ok: false, skipped: true };
    return createNotification({
      recipientEmail: userEmail,
      recipientRole: 'volunteer',
      title: 'Achievement unlocked',
      message: `You unlocked ${achievement.title || achievement.badge_label || 'a new achievement'}.`,
      type: 'achievement_unlocked',
      relatedTable: 'app_user_achievements',
      relatedId: achievement.id,
      groupKey: `achievement:${userEmail}:${achievement.id}`,
      metadata: achievement
    });
  }

  function buildAdminPendingNotifications() {
    if (!isAdmin()) return [];
    const notifications = [];
    const signups = window.VolunteerDataStore?.getOpportunitySignups?.() || [];
    const attendance = window.VolunteerDataStore?.getAttendanceClaims?.() || [];
    const training = window.VolunteerDataStore?.getTrainingSignups?.() || [];
    const pendingSignups = signups.filter(item => item.status === 'pending_review').length;
    const pendingAttendance = attendance.filter(item => item.claimStatus === 'submitted').length;
    const pendingTraining = training.filter(item => item.status === 'registered').length;

    if (pendingSignups) notifications.push({
      id: 'admin-pending-signups',
      title: 'Pending sign-up reviews',
      message: `${pendingSignups} opportunity sign-up${pendingSignups === 1 ? '' : 's'} awaiting review.`,
      type: 'admin_task',
      relatedTable: 'app_opportunity_signups',
      isRead: false,
      createdAt: new Date().toISOString()
    });
    if (pendingAttendance) notifications.push({
      id: 'admin-pending-attendance',
      title: 'Attendance awaiting verification',
      message: `${pendingAttendance} attendance record${pendingAttendance === 1 ? '' : 's'} awaiting verification.`,
      type: 'admin_task',
      relatedTable: 'app_attendance_claims',
      isRead: false,
      createdAt: new Date().toISOString()
    });
    if (pendingTraining) notifications.push({
      id: 'admin-pending-training',
      title: 'Training completion review',
      message: `${pendingTraining} training sign-up${pendingTraining === 1 ? '' : 's'} may need completion review.`,
      type: 'admin_task',
      relatedTable: 'app_training_signups',
      isRead: false,
      createdAt: new Date().toISOString()
    });
    return notifications;
  }

  function mergeAdminTasks() {
    if (!isAdmin()) return;
    const adminTasks = buildAdminPendingNotifications();
    const persisted = state.notifications.filter(item => item.type !== 'admin_task');
    state.notifications = [...adminTasks, ...persisted];
    renderNotifications();
  }

  function bindNotificationUi() {
    if (window.__notificationsUiBound) return;
    window.__notificationsUiBound = true;

    document.addEventListener('click', event => {
      const bell = event.target.closest('[data-notification-bell]');
      if (bell) {
        const visible = state.notifications.filter(item => !item.clearedAt);
        const unread = visible.filter(item => !item.isRead).length;
        if (!unread && !visible.length) {
          state.open = false;
          renderNotifications();
          showToast('No new notifications');
          return;
        }
        state.open = !state.open;
        renderNotifications();
        return;
      }

      const itemButton = event.target.closest('[data-notification-id]');
      if (itemButton) {
        const notification = state.notifications.find(item => item.id === itemButton.dataset.notificationId);
        state.open = false;
        markOneRead(notification).then(() => routeNotification(notification));
        return;
      }

      const markRead = event.target.closest('[data-notification-mark-read]');
      if (markRead) {
        markAllRead();
        return;
      }

      const clearAll = event.target.closest('[data-notification-clear-all]');
      if (clearAll) {
        clearAllNotifications();
        return;
      }

      const panel = event.target.closest('[data-notification-panel]');
      if (!panel && !event.target.closest('[data-notification-shell]')) {
        state.open = false;
        renderNotifications();
      }
    });
  }

  function bindAdminTaskRefreshHooks() {
    if (window.__notificationsAdminTaskRefreshBound) return;
    window.__notificationsAdminTaskRefreshBound = true;
    window.addEventListener('volunteer-signups-synced', mergeAdminTasks);
    window.addEventListener('volunteer-attendance-synced', mergeAdminTasks);
    window.addEventListener('volunteer-training-signups-synced', mergeAdminTasks);
  }

  async function syncNotifications() {
    ensureNotificationShell();
    await fetchNotifications();
    mergeAdminTasks();
  }

  Object.assign(window.VolunteerDataStore || {}, {
    fetchNotifications,
    createNotification,
    notifyOpportunityStatusChange,
    notifyAttendanceReview,
    notifyTrainingCompletion,
    notifyReferralAccepted,
    notifyPointsAwarded,
    notifyAchievementUnlocked,
    markAllNotificationsRead: markAllRead,
    clearAllNotifications
  });

  document.addEventListener('DOMContentLoaded', () => {
    ensureNotificationShell();
    bindNotificationUi();
    bindAdminTaskRefreshHooks();
    window.setTimeout(syncNotifications, 500);
  });

  window.addEventListener('volunteer-auth-ready', syncNotifications);
  window.addEventListener('volunteer-auth-changed', syncNotifications);
})();

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

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
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
      isRead: Boolean(row.is_read),
      createdAt: row.created_at || '',
      readAt: row.read_at || ''
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
          <button type="button" data-notification-mark-read>Mark all read</button>
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

    if (!shell || !bell || !count || !panel || !list) return;
    shell.hidden = !signedIn;
    if (!signedIn) return;

    const unread = state.notifications.filter(item => !item.isRead).length;
    bell.classList.toggle('has-unread', unread > 0);
    count.textContent = unread > 99 ? '99+' : String(unread);
    panel.classList.toggle('open', state.open);

    if (!state.notifications.length) {
      list.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
      return;
    }

    list.innerHTML = state.notifications.slice(0, 20).map(item => `
      <article class="notification-item ${item.isRead ? '' : 'unread'}">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.message)}</p>
        <time>${escapeHtml(formatTime(item.createdAt))}</time>
      </article>
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

  async function createNotification(notification) {
    const supabase = client();
    if (!supabase || !notification?.recipientEmail || !notification?.title) return { ok: false, skipped: true };

    const { error } = await supabase
      .from(TABLE)
      .insert(notificationToRow(notification));

    if (error) {
      console.warn('Could not create notification.', error);
      return { ok: false, reason: error.message };
    }

    await fetchNotifications();
    return { ok: true };
  }

  async function markAllRead() {
    const supabase = client();
    const email = currentEmail();
    if (!supabase || !email) return;

    const unreadIds = state.notifications.filter(item => !item.isRead).map(item => item.id);
    if (!unreadIds.length) {
      state.open = false;
      renderNotifications();
      return;
    }

    const { error } = await supabase
      .from(TABLE)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds);

    if (error) {
      console.warn('Could not mark notifications read.', error);
      return;
    }

    state.notifications = state.notifications.map(item => ({ ...item, isRead: true, readAt: new Date().toISOString() }));
    renderNotifications();
  }

  function adminEmailsFromSignups() {
    return [];
  }

  function notifyVolunteerForSignup(signup, status) {
    const labels = {
      confirmed: ['Opportunity confirmed', `You have been confirmed for ${signup.title}.`],
      waitlisted: ['Opportunity waitlisted', `You have been waitlisted for ${signup.title}.`],
      declined: ['Opportunity not selected', `Your sign-up for ${signup.title} was not selected.`],
      completed: ['Opportunity completed', `Your volunteering hours for ${signup.title} have been verified.`]
    };
    const copy = labels[status];
    if (!copy || !signup?.email) return;
    createNotification({
      recipientEmail: signup.email,
      recipientRole: 'volunteer',
      title: copy[0],
      message: copy[1],
      type: `opportunity_${status}`,
      relatedTable: 'app_opportunity_signups',
      relatedId: signup.id
    });
  }

  function notifyVolunteerForAttendance(claim) {
    const labels = {
      verified: ['Attendance verified', `Your attendance for ${claim.title} has been verified.`],
      adjusted: ['Attendance adjusted', `Your attendance hours for ${claim.title} have been adjusted and verified.`],
      clarification_requested: ['Attendance clarification needed', `Admin requested clarification for your attendance record: ${claim.title}.`],
      rejected: ['Attendance rejected', `Your attendance record for ${claim.title} was rejected.`]
    };
    const copy = labels[claim?.claimStatus];
    if (!copy || !claim?.email) return;
    createNotification({
      recipientEmail: claim.email,
      recipientRole: 'volunteer',
      title: copy[0],
      message: copy[1],
      type: `attendance_${claim.claimStatus}`,
      relatedTable: 'app_attendance_claims',
      relatedId: claim.id
    });
  }

  function notifyVolunteerForTraining(signup) {
    if (!signup?.email || signup.status !== 'completed') return;
    createNotification({
      recipientEmail: signup.email,
      recipientRole: 'volunteer',
      title: 'Training completed',
      message: `Your completion for ${signup.title} has been recorded.`,
      type: 'training_completed',
      relatedTable: 'app_training_signups',
      relatedId: signup.id
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
      isRead: false,
      createdAt: new Date().toISOString()
    });
    if (pendingAttendance) notifications.push({
      id: 'admin-pending-attendance',
      title: 'Attendance awaiting verification',
      message: `${pendingAttendance} attendance record${pendingAttendance === 1 ? '' : 's'} awaiting verification.`,
      type: 'admin_task',
      isRead: false,
      createdAt: new Date().toISOString()
    });
    if (pendingTraining) notifications.push({
      id: 'admin-pending-training',
      title: 'Training completion review',
      message: `${pendingTraining} training sign-up${pendingTraining === 1 ? '' : 's'} may need completion review.`,
      type: 'admin_task',
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
        const unread = state.notifications.filter(item => !item.isRead).length;
        if (!unread && !state.notifications.length) {
          state.open = false;
          renderNotifications();
          showToast('No new notifications');
          return;
        }
        state.open = !state.open;
        renderNotifications();
        return;
      }

      const markRead = event.target.closest('[data-notification-mark-read]');
      if (markRead) {
        markAllRead();
        return;
      }

      const panel = event.target.closest('[data-notification-panel]');
      if (!panel && !event.target.closest('[data-notification-shell]')) {
        state.open = false;
        renderNotifications();
      }
    });
  }

  function bindLifecycleNotificationHooks() {
    if (window.__notificationsLifecycleBound) return;
    window.__notificationsLifecycleBound = true;

    document.addEventListener('click', event => {
      const statusButton = event.target.closest('[data-admin-signup-status]');
      if (statusButton) {
        const signupId = statusButton.dataset.signupId;
        const status = statusButton.dataset.adminSignupStatus;
        window.setTimeout(() => {
          const signup = window.VolunteerDataStore?.getOpportunitySignups?.().find(item => item.id === signupId);
          notifyVolunteerForSignup(signup, status);
          mergeAdminTasks();
        }, 160);
        return;
      }

      const completeTraining = event.target.closest('[data-complete-training]');
      if (completeTraining) {
        const signupId = completeTraining.dataset.completeTraining;
        window.setTimeout(() => {
          const signup = window.VolunteerDataStore?.getTrainingSignups?.().find(item => item.id === signupId);
          notifyVolunteerForTraining(signup);
          mergeAdminTasks();
        }, 160);
      }
    }, true);

    document.addEventListener('submit', event => {
      const attendanceForm = event.target.closest('[data-attendance-review]');
      if (attendanceForm) {
        const claimId = attendanceForm.dataset.attendanceReview;
        window.setTimeout(() => {
          const claim = window.VolunteerDataStore?.getAttendanceClaims?.().find(item => item.id === claimId);
          notifyVolunteerForAttendance(claim);
          mergeAdminTasks();
        }, 180);
      }
    }, true);

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
    markAllNotificationsRead: markAllRead
  });

  document.addEventListener('DOMContentLoaded', () => {
    ensureNotificationShell();
    bindNotificationUi();
    bindLifecycleNotificationHooks();
    window.setTimeout(syncNotifications, 500);
  });

  window.addEventListener('volunteer-auth-ready', syncNotifications);
  window.addEventListener('volunteer-auth-changed', syncNotifications);
})();

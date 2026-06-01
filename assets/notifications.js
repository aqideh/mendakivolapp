(() => {
  const state = { open: false };

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function session() { return store().getSession(); }
  function isAdmin() { return store().isAdmin(); }
  function currentEmail() { return store().currentEmail() || session()?.email || ''; }
  function notifications() { return dataAccess().listNotifications(); }
  function escapeHtml(value) { return store().utils.escapeHtml(value); }

  function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
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
    if (!shell || !bell || !count || !panel || !list) return;

    shell.hidden = !signedIn;
    if (!signedIn) return;

    const visible = notifications().filter(item => !item.clearedAt);
    const unread = visible.filter(item => !item.isRead).length;
    bell.classList.toggle('has-unread', unread > 0);
    count.textContent = unread > 99 ? '99+' : String(unread);
    panel.classList.toggle('open', state.open);

    if (!visible.length) {
      list.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
      return;
    }

    list.innerHTML = visible.slice(0, 20).map(item => `
      <button class="notification-item ${item.isRead ? '' : 'unread'}" type="button" data-notification-id="${escapeHtml(item.id)}">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.message)}</p>
        <time>${escapeHtml(formatTime(item.createdAt))}</time>
      </button>
    `).join('');

    window.MENDAKINotificationPanelPolish?.sync?.();
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
    if (type === 'admin_task') return goToDashboardView('admin');
    if (table === 'app_attendance_claims' || type.startsWith('attendance_')) return goToDashboardView(isAdmin() ? 'admin' : 'attendance');
    if (table === 'app_training_signups' || type.startsWith('training_')) return goToDashboardView(isAdmin() ? 'admin' : 'training');
    if (table === 'app_opportunity_signups' || type.startsWith('opportunity_')) return goToDashboardView(isAdmin() ? 'admin' : 'opportunities');
    if (table === 'app_referrals' || type.startsWith('referral_')) return goToDashboardView('opportunities');
    if (table === 'app_points_ledger' || type.startsWith('points_') || type.startsWith('achievement_')) return goToDashboardView('opportunities');
    if (table === 'app_news_items' || type.startsWith('news_')) return goToPage('news');
    goToDashboardView('home');
  }

  async function syncNotifications() {
    ensureNotificationShell();
    if (!currentEmail()) {
      renderNotifications();
      return [];
    }
    const result = await dataAccess().fetchNotifications();
    renderNotifications();
    return result;
  }

  async function handleNotificationItem(button) {
    const notification = notifications().find(item => String(item.id) === String(button.dataset.notificationId));
    state.open = false;
    if (notification) await dataAccess().markNotificationRead(notification.id);
    renderNotifications();
    routeNotification(notification);
  }

  async function handleMarkAllRead() {
    await dataAccess().markAllNotificationsRead();
    state.open = false;
    renderNotifications();
  }

  async function handleClearAll() {
    const visible = notifications().filter(item => !item.clearedAt);
    if (!visible.length) {
      showToast('No notifications to clear');
      return;
    }
    const result = await dataAccess().clearAllNotifications();
    if (result.ok) {
      state.open = false;
      renderNotifications();
      showToast('Notifications cleared');
    }
  }

  function bindNotificationUi() {
    if (window.__notificationsUiBound) return;
    window.__notificationsUiBound = true;
    document.addEventListener('click', event => {
      const bell = event.target.closest('[data-notification-bell]');
      if (bell) {
        const visible = notifications().filter(item => !item.clearedAt);
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
        handleNotificationItem(itemButton);
        return;
      }
      if (event.target.closest('[data-notification-mark-read]')) {
        handleMarkAllRead();
        return;
      }
      if (event.target.closest('[data-notification-clear-all]')) {
        handleClearAll();
        return;
      }
      const panel = event.target.closest('[data-notification-panel]');
      if (!panel && !event.target.closest('[data-notification-shell]')) {
        state.open = false;
        renderNotifications();
      }
    });
  }

  Object.assign(window.VolunteerDataStore, {
    fetchNotifications: () => dataAccess().fetchNotifications(),
    createNotification: notification => dataAccess().createNotification(notification),
    notifyOpportunityStatusChange: (signup, status) => dataAccess().notifyOpportunityStatusChange(signup, status),
    notifyAttendanceReview: claim => dataAccess().notifyAttendanceReview(claim),
    notifyTrainingCompletion: signup => dataAccess().notifyTrainingCompletion(signup),
    notifyReferralAccepted: referral => dataAccess().notifyReferralAccepted(referral),
    notifyPointsAwarded: entry => dataAccess().notifyPointsAwarded(entry),
    notifyAchievementUnlocked: (email, achievement) => dataAccess().notifyAchievementUnlocked(email, achievement),
    markAllNotificationsRead: () => dataAccess().markAllNotificationsRead(),
    clearAllNotifications: () => dataAccess().clearAllNotifications()
  });

  document.addEventListener('DOMContentLoaded', () => {
    ensureNotificationShell();
    bindNotificationUi();
    window.setTimeout(syncNotifications, 500);
  });
  window.addEventListener('volunteer-auth-ready', syncNotifications);
  window.addEventListener('volunteer-auth-changed', syncNotifications);
  window.addEventListener('volunteer-notifications-synced', renderNotifications);
  window.addEventListener('volunteer-signups-synced', () => { dataAccess().refreshAdminTaskNotifications(); renderNotifications(); });
  window.addEventListener('volunteer-attendance-synced', () => { dataAccess().refreshAdminTaskNotifications(); renderNotifications(); });
  window.addEventListener('volunteer-training-signups-synced', () => { dataAccess().refreshAdminTaskNotifications(); renderNotifications(); });
})();

(() => {
  if (window.__notificationPanelPolishInstalled) return;
  window.__notificationPanelPolishInstalled = true;

  function addStyles() {
    if (document.querySelector('[data-notification-panel-polish-style]')) return;
    const style = document.createElement('style');
    style.dataset.notificationPanelPolishStyle = 'true';
    style.textContent = '.notification-type-pill{display:inline-flex;margin:.2rem 0 .25rem;padding:.18rem .5rem;border-radius:999px;background:rgba(55,58,54,.08);font-size:.72rem;font-weight:800}.notification-action-hint{display:block;margin-top:.25rem;color:rgba(55,58,54,.68);font-size:.76rem;font-weight:700}.notification-item[data-panel-priority="high"]{border-left:4px solid rgba(190,128,34,.72)}.notification-item[data-panel-priority="admin"]{border-left:4px solid rgba(80,96,130,.72)}';
    document.head.append(style);
  }

  function kindForText(text) {
    const value = String(text || '').toLowerCase();
    if (value.includes('clarification')) return 'Clarification';
    if (value.includes('attendance')) return 'Attendance';
    if (value.includes('opportunity') || value.includes('sign-up')) return 'Opportunity';
    if (value.includes('training')) return 'Training';
    if (value.includes('referral')) return 'Referral';
    if (value.includes('points') || value.includes('achievement')) return 'Recognition';
    if (value.includes('pending') || value.includes('review')) return 'Admin';
    return 'Update';
  }

  function hintForKind(kind) {
    if (kind === 'Clarification') return 'Open the attendance record to continue review.';
    if (kind === 'Admin') return 'Open the admin workspace to act on this queue item.';
    if (kind === 'Attendance') return 'Open attendance to view the record.';
    if (kind === 'Opportunity') return 'Open opportunities to view the sign-up.';
    if (kind === 'Training') return 'Open training to view the registration.';
    return 'Open this notification for details.';
  }

  function decorate(item) {
    if (!item || item.dataset.panelPolished === 'true') return;
    const title = item.querySelector('strong');
    const message = item.querySelector('p');
    const text = `${title?.textContent || ''} ${message?.textContent || ''}`;
    const kind = kindForText(text);
    const pill = document.createElement('span');
    pill.className = 'notification-type-pill';
    pill.textContent = kind;
    title?.insertAdjacentElement('afterend', pill);
    const hint = document.createElement('span');
    hint.className = 'notification-action-hint';
    hint.textContent = hintForKind(kind);
    item.append(hint);
    if (kind === 'Clarification') item.dataset.panelPriority = 'high';
    if (kind === 'Admin') item.dataset.panelPriority = 'admin';
    item.dataset.panelPolished = 'true';
  }

  function sync() {
    addStyles();
    document.querySelectorAll('[data-notification-id]').forEach(decorate);
  }

  function observe() {
    const list = document.querySelector('[data-notification-list]');
    if (!list || list.dataset.panelPolishObserved === 'true') return;
    list.dataset.panelPolishObserved = 'true';
    new MutationObserver(sync).observe(list, { childList: true, subtree: true });
  }

  function install() {
    addStyles();
    observe();
    sync();
  }

  window.MENDAKINotificationPanelPolish = { install, sync };
  document.addEventListener('DOMContentLoaded', () => {
    install();
    window.setTimeout(install, 700);
    window.setTimeout(install, 1600);
  });
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', install);
  window.addEventListener('volunteer-signups-synced', install);
  window.addEventListener('volunteer-attendance-synced', install);
  window.addEventListener('volunteer-training-signups-synced', install);
})();

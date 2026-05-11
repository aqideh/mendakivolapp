(() => {
  if (window.__phaseFortyTwoSessionValidationBridgeInstalled) return;
  window.__phaseFortyTwoSessionValidationBridgeInstalled = true;

  function removeStandaloneCard() {
    document.querySelector('[data-session-attendance-validation-card]')?.remove();
  }

  function appendPanel(area, host) {
    removeStandaloneCard();
    if (area !== 'system' || !host || !window.MENDAKISessionAttendanceValidation?.renderInto) return;
    const page = host.querySelector('[data-phase42-page="system"]') || host.querySelector('.phase35-page') || host;
    window.MENDAKISessionAttendanceValidation.renderInto(page);
    window.MENDAKISessionAttendanceValidation.sync?.({ render: true });
  }

  function install() {
    const tools = window.MENDAKIPhase42CanonicalAdminTools;
    if (!tools || typeof tools.render !== 'function' || tools.render.__sessionValidationBridge) return;
    const originalRender = tools.render.bind(tools);
    const wrappedRender = function bridgedPhase42Render(area, host, ...rest) {
      const result = originalRender(area, host, ...rest);
      appendPanel(area, host);
      return result;
    };
    wrappedRender.__sessionValidationBridge = true;
    tools.render = wrappedRender;
    removeStandaloneCard();
  }

  install();
  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', () => {
    install();
    removeStandaloneCard();
  });
})();

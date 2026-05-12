(() => {
  if (window.__mendakiVolunteerActionsInstalled) return;
  window.__mendakiVolunteerActionsInstalled = true;

  window.MENDAKIVolunteerActions = Object.freeze({ installed: true });
})();

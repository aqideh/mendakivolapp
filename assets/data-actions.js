(() => {
  if (window.__mendakiDataActionsInstalled) return;
  window.__mendakiDataActionsInstalled = true;

  window.MENDAKIDataActions = Object.freeze({ installed: true });
})();

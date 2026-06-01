(() => {
  // Standalone Opportunity sessions dashboard card retired.
  // Session editing now lives under:
  // Dashboard -> Admin content management -> Opportunities -> Edit sessions.
  // Keep this compatibility stub so existing script references remain harmless.
  window.MENDAKISessionManagement = window.MENDAKISessionManagement || {
    fetchSessions: () => window.MENDAKIOpportunitySessions?.fetch?.() || Promise.resolve(window.__mendakiOpportunitySessions || []),
    render: () => {}
  };
})();

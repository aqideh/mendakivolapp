(() => {
  if (window.__phaseFortyOneRenderGuardsInstalled) return;
  window.__phaseFortyOneRenderGuardsInstalled = true;

  function appState() {
    try { return typeof state !== 'undefined' ? state : null; }
    catch (_) { return null; }
  }

  function opportunitiesReady() {
    return Array.isArray(appState()?.data?.opportunities);
  }

  function clearNode(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderSafeOpportunityEmptyState() {
    const shell = document.querySelector('#opportunities-grid');
    const empty = document.querySelector('#opportunities-empty');
    if (!shell) return;
    clearNode(shell);
    shell.className = 'container opportunity-swipe-shell';
    const message = document.createElement('div');
    message.className = 'empty-state';
    message.textContent = 'Opportunities are still loading.';
    shell.append(message);
    if (empty) empty.hidden = true;
  }

  function wrap(name, fallback) {
    const original = window[name];
    if (typeof original !== 'function' || original.__phase41Guarded) return;
    const guarded = function phaseFortyOneGuardedRender(...args) {
      if (!opportunitiesReady()) {
        fallback?.();
        return;
      }
      return original.apply(this, args);
    };
    guarded.__phase41Guarded = true;
    guarded.__phase41Original = original;
    window[name] = guarded;
  }

  function install() {
    wrap('renderOpportunities', renderSafeOpportunityEmptyState);
    wrap('renderHomeOpportunities', null);
  }

  install();
  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('volunteer-opportunities-synced', install);
})();

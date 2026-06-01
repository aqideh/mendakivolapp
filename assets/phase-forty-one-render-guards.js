(() => {
  if (window.__phaseFortyOneRenderGuardsInstalled) return;
  window.__phaseFortyOneRenderGuardsInstalled = true;

  const pendingWraps = new Map();

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
    if (typeof original !== 'function') {
      pendingWraps.set(name, fallback || null);
      console.warn(`phase-forty-one-render-guards: ${name} is not available yet; will retry after dependent scripts load.`);
      return false;
    }
    if (original.__phase41Guarded) return true;
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
    pendingWraps.delete(name);
    return true;
  }

  function install() {
    wrap('renderOpportunities', renderSafeOpportunityEmptyState);
    wrap('renderHomeOpportunities', null);
  }

  function retryPendingWraps() {
    if (!pendingWraps.size) return;
    Array.from(pendingWraps.entries()).forEach(([name, fallback]) => wrap(name, fallback));
  }

  install();
  document.addEventListener('DOMContentLoaded', retryPendingWraps);
  window.addEventListener('load', retryPendingWraps);
  window.addEventListener('volunteer-opportunities-synced', retryPendingWraps);
})();

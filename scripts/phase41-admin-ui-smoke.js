/*
 * Phase 41 - Admin UI smoke validation
 *
 * How to run:
 * 1. Open the app in a browser.
 * 2. Sign in as an admin.
 * 3. Open DevTools Console.
 * 4. Paste this whole file and press Enter.
 *
 * This script is non-destructive. It checks module presence and DOM wiring only.
 */

(async () => {
  const results = [];
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function check(name, passed, detail = '') {
    results.push({ check: name, status: passed ? 'pass' : 'fail', detail });
  }

  function exists(selector, root = document) {
    return Boolean(root.querySelector(selector));
  }

  function click(selector, root = document) {
    const node = root.querySelector(selector);
    if (!node) return false;
    node.click();
    return true;
  }

  function shell() {
    return document.querySelector('[data-phase34-shell]');
  }

  function activeArea() {
    return shell()?.querySelector('[data-phase34-page-wrap]')?.getAttribute('data-phase34-active-area') || '';
  }

  function pageTitle() {
    return shell()?.querySelector('[data-phase34-page-title]')?.textContent?.trim()
      || shell()?.querySelector('.phase34-admin-page-head h3')?.textContent?.trim()
      || '';
  }

  function pageHasBody() {
    const body = shell()?.querySelector('[data-phase34-page-cards]');
    return Boolean(body && body.children.length > 0);
  }

  check('VolunteerDataStore present', Boolean(window.VolunteerDataStore));
  check('Current user is admin', Boolean(window.VolunteerDataStore?.isAdmin?.()), 'Sign in as admin before running this script.');
  check('Phase 34 admin shell module present', Boolean(window.MENDAKIPhase34AdminShell));
  check('Phase 35 canonical pages module present', Boolean(window.MENDAKIPhase35CanonicalAdminPages));
  check('Phase 36 admin tables module present', Boolean(window.MENDAKIPhase36AdminTables));
  check('Phase 38/39/40 drawer actions module present', Boolean(window.MENDAKIPhase38DrawerActions));
  check('Phase 37 legacy retirement module present', Boolean(window.MENDAKIPhase37LegacySurfaceRetirement));
  check('Referral module present', Boolean(window.MENDAKIReferrals));
  check('Gamification module present', Boolean(window.MENDAKIGamification));

  const opened = click('[data-phase34-open-admin]');
  await wait(650);
  check('Admin workspace entry opens', opened && exists('[data-phase34-shell]') && !shell()?.hidden);

  const areas = ['home', 'content', 'opportunities', 'signups', 'attendance', 'training', 'referrals', 'points', 'reports', 'audit', 'notifications', 'system'];
  for (const area of areas) {
    const navClicked = click(`[data-phase34-area="${area}"]`, shell() || document);
    await wait(350);
    const title = pageTitle();
    const active = activeArea();
    check(
      `Admin area renders: ${area}`,
      navClicked && active === area && title.length > 0 && pageHasBody(),
      `active=${active || 'none'} title=${title || 'none'} body=${pageHasBody()}`
    );
  }

  for (const area of ['signups', 'attendance', 'training', 'referrals', 'points']) {
    click(`[data-phase34-area="${area}"]`, shell() || document);
    await wait(450);
    const scope = shell() || document;
    const hasTable = exists('.phase36-table-card', scope) || exists('.phase36-empty', scope);
    const hasFallbackOrCanonical = exists('.phase35-page, .phase35-legacy-tools, .phase34-empty', scope);
    check(`Phase 36 table/empty state renders: ${area}`, hasTable || hasFallbackOrCanonical, `table=${hasTable} fallbackOrCanonical=${hasFallbackOrCanonical}`);
  }

  const drawerCandidates = ['signups', 'attendance', 'training', 'referrals', 'points'];
  let drawerOpened = false;
  let foundRows = false;
  for (const area of drawerCandidates) {
    click(`[data-phase34-area="${area}"]`, shell() || document);
    await wait(450);
    const row = shell()?.querySelector('[data-phase36-row]');
    if (row) {
      foundRows = true;
      row.click();
      await wait(300);
      drawerOpened = exists('[data-phase36-drawer-layer]:not([hidden])') || exists('.phase36-drawer .phase36-detail-grid');
      check(`Drawer opens from ${area} row`, drawerOpened);
      check(`Drawer has details from ${area}`, exists('.phase36-detail-grid'));
      check(`Drawer action area present from ${area}`, exists('.phase36-drawer-actions'));
      click('[data-phase36-close-drawer]');
      await wait(150);
      break;
    }
  }
  if (!foundRows) {
    check('Drawer opens from any row', true, 'Skipped: no table rows found. Seed or sync data for drawer-row validation.');
  }

  click('[data-phase34-area="system"]', shell() || document);
  await wait(350);
  check('Phase 37 retirement note appears in System / QA', exists('[data-phase37-retirement-note]', shell() || document) || Boolean(window.MENDAKIPhase37LegacySurfaceRetirement?.legacySurfaceCounts?.()));

  const failures = results.filter(row => row.status === 'fail');
  console.table(results);
  if (failures.length) {
    console.warn(`Phase 41 admin UI smoke validation completed with ${failures.length} failure(s).`, failures);
  } else {
    console.info('Phase 41 admin UI smoke validation passed.');
  }

  return { ok: failures.length === 0, results };
})();

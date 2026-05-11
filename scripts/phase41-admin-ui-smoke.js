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

  function exists(selector) {
    return Boolean(document.querySelector(selector));
  }

  function click(selector) {
    const node = document.querySelector(selector);
    if (!node) return false;
    node.click();
    return true;
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
  await wait(500);
  check('Admin workspace entry opens', opened && exists('[data-phase34-shell]'));

  const areas = ['home', 'content', 'opportunities', 'signups', 'attendance', 'training', 'referrals', 'points', 'reports', 'audit', 'notifications', 'system'];
  for (const area of areas) {
    const navClicked = click(`[data-phase34-area="${area}"]`);
    await wait(220);
    const pageTitle = document.querySelector('[data-phase34-page-title]')?.textContent?.trim() || '';
    check(`Admin area renders: ${area}`, navClicked && pageTitle.length > 0, pageTitle || 'No page title found.');
  }

  for (const area of ['signups', 'attendance', 'training', 'referrals', 'points']) {
    click(`[data-phase34-area="${area}"]`);
    await wait(300);
    const hasTable = exists('.phase36-table-card') || exists('.phase36-empty');
    check(`Phase 36 table/empty state renders: ${area}`, hasTable);
  }

  const drawerCandidates = ['signups', 'attendance', 'training', 'referrals', 'points'];
  let drawerOpened = false;
  for (const area of drawerCandidates) {
    click(`[data-phase34-area="${area}"]`);
    await wait(300);
    const row = document.querySelector('[data-phase36-row]');
    if (row) {
      row.click();
      await wait(250);
      drawerOpened = exists('[data-phase36-drawer-layer]:not([hidden])') || exists('.phase36-drawer');
      check(`Drawer opens from ${area} row`, drawerOpened);
      check(`Drawer has details from ${area}`, exists('.phase36-detail-grid'));
      check(`Drawer action area present from ${area}`, exists('.phase36-drawer-actions'));
      click('[data-phase36-close-drawer]');
      await wait(150);
      break;
    }
  }
  if (!drawerOpened) {
    check('Drawer opens from any row', false, 'No table rows found. Seed or sync data before this check.');
  }

  click('[data-phase34-area="system"]');
  await wait(300);
  check('Phase 37 retirement note appears in System / QA', exists('[data-phase37-retirement-note]') || Boolean(window.MENDAKIPhase37LegacySurfaceRetirement?.legacySurfaceCounts?.()));

  const failures = results.filter(row => row.status === 'fail');
  console.table(results);
  if (failures.length) {
    console.warn(`Phase 41 admin UI smoke validation completed with ${failures.length} failure(s).`, failures);
  } else {
    console.info('Phase 41 admin UI smoke validation passed.');
  }

  return { ok: failures.length === 0, results };
})();

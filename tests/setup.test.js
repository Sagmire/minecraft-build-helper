'use strict';

// First-time setup and the tour.
module.exports = async t => {
  const page = await t.open({ setup: 'keep' });

  t.check('setup opens the first time', await page.isVisible('#setupDialog h2:has-text("Welcome")'));
  await page.keyboard.press('Escape');
  t.check('Esc doesn\'t close setup by accident', await page.isVisible('#setupDialog'));
  await page.mouse.click(5, 5);
  t.check('clicking outside doesn\'t close setup', await page.isVisible('#setupDialog'));

  await page.click('#setupNextBtn');
  await page.click('.setup-option[data-value="new"]');
  t.check('experience can be picked', await page.isVisible('.setup-option.on[data-value="new"]'));
  await page.click('#setupNextBtn');
  await page.click('.setup-styles [data-value="Japanese"]');
  await page.click('.setup-styles [data-value="Castle"]');
  await page.click('.setup-styles [data-value="Castle"]');
  await page.click('#setupBackBtn');
  t.check('Back keeps the answers', await page.isVisible('.setup-option.on[data-value="new"]'));
  await page.click('#setupNextBtn');
  t.check('styles can be picked and unpicked', await page.isVisible('.setup-styles .chip.on[data-value="Japanese"]') && !(await page.isVisible('.setup-styles .chip.on[data-value="Castle"]')));
  await page.click('#setupNextBtn');
  await page.click('.setup-option[data-value="dark"]');
  t.check('picking dark shows it straight away', await page.evaluate(() => document.documentElement.dataset.theme) === 'dark');
  await page.click('#setupNextBtn');
  t.check('the last step offers the tour', await page.isVisible('#setupTourBtn'));
  await page.click('#setupTourBtn');

  const saved = await page.saved();
  t.check('setup is saved', saved.setupDone && saved.level === 'new' && saved.styles.join() === 'Japanese' && saved.theme === 'dark', saved);
  t.check('liked styles become favourite palettes', saved.favorites.sort().join() === 'cherry,japanese', saved.favorites);

  // The tour visits every tab.
  t.check('the tour starts', await page.isVisible('#tour') && (await page.textContent('#tourCount')).startsWith('1 of'));
  const total = await page.evaluate(() => TOUR_STOPS.length);
  const seen = [];
  for (let i = 0; i < total - 1; i++) {
    await page.click('#tourNextBtn');
    seen.push(await page.evaluate(() => currentTab));
    const spot = await page.$eval('#tourSpot', s => !s.classList.contains('none') && s.getBoundingClientRect().width > 0);
    if (!spot) t.check(`tour stop ${i + 2} lights something up`, false);
  }
  t.check('the tour opens every tab', ['learn', 'palettes', 'inspiration', 'planner', 'checklist'].every(tab => seen.includes(tab)), seen);
  await page.click('#tourBackBtn');
  t.check('Back goes to the previous stop', (await page.textContent('#tourCount')).startsWith(`${total - 1} of`));
  await page.click('#tourNextBtn');
  t.check('the last stop says Done', (await page.textContent('#tourNextBtn')) === 'Done');
  await page.click('#tourNextBtn');
  t.check('Done closes the tour and goes to Learn', !(await page.isVisible('#tour')) && await page.evaluate(() => currentTab) === 'learn');

  t.check('beginners get beginner tips marked ⭐ first', await page.$eval('.tip-card', c => !!c.querySelector('.badge.for-you') && c.textContent.includes('Beginner')));
  t.check('intermediate tips aren\'t marked for beginners', !(await page.isVisible('.tip-card:has(.badge.intermediate) .badge.for-you')));

  await t.reload(page);
  t.check('setup doesn\'t open again', !(await page.isVisible('#setupDialog')));

  // Again from Settings: the tour, then setup (Esc ends the tour).
  await page.click('#settingsBtn');
  await page.click('#settingsTourBtn');
  t.check('the tour can be taken again from Settings', await page.isVisible('#tour'));
  await page.keyboard.press('Escape');
  t.check('Esc ends the tour', !(await page.isVisible('#tour')));
  await page.click('#settingsBtn');
  await page.click('#settingsSetupBtn');
  t.check('setup can be run again from Settings', await page.isVisible('#setupDialog'));
  await page.click('#setupNextBtn');
  t.check('it remembers earlier answers', await page.isVisible('.setup-option.on[data-value="new"]'));
  await page.click('.setup-option[data-value="lots"]');
  for (let i = 0; i < 3; i++) await page.click('#setupNextBtn');
  await page.click('#setupNoTourBtn');
  t.check('"Start building" finishes without the tour', !(await page.isVisible('#tour')) && !(await page.isVisible('#setupDialog')));
  t.check('experienced builders get the trickier tips marked ⭐', await page.isVisible('.tip-card:has(.badge.intermediate) .badge.for-you'));

  // Starting the tour from inside a plan still shows the planner's buttons.
  await page.click('#tabs [data-tab="planner"]');
  await page.click('#newPlanBtn');
  await page.click('#settingsBtn');
  await page.click('#settingsTourBtn');
  for (let i = 0; i < 4; i++) await page.click('#tourNextBtn');
  t.check('the tour\'s planner stop works from inside a plan', await page.isVisible('#newPlanChoices') && await page.$eval('#tourSpot', s => !s.classList.contains('none')));
  await page.keyboard.press('Escape');

  // On a phone the tour fits on the screen.
  const phone = await t.open({ viewport: { width: 375, height: 700 }, setup: 'keep' });
  for (let i = 0; i < 4; i++) await phone.click('#setupNextBtn');
  await phone.click('#setupTourBtn');
  for (let i = 0; i < total; i++) {
    const fits = await phone.$eval('#tourTip', tip => {
      const r = tip.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
    });
    if (!fits) t.check(`tour stop ${i + 1} fits a phone screen`, false);
    await phone.click('#tourNextBtn');
  }
  t.check('the tour works on a phone', !(await phone.isVisible('#tour')));
};

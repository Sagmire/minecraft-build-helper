'use strict';

// The whole app: tabs, settings, light/dark, backups, offline file list and phone layout.
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./helpers');

module.exports = async t => {
  const page = await t.open();

  for (const tab of ['palettes', 'inspiration', 'planner', 'checklist', 'learn']) {
    await page.click(`#tabs [data-tab="${tab}"]`);
    t.check(`the ${tab} tab opens`, await page.isVisible(`#tab-${tab}`) && (await page.$$('main > section:not([hidden])')).length === 1);
  }
  await page.goto(page.url().replace(/#.*/, '#checklist'));
  await page.waitForSelector('body.ready');
  t.check('opening with #checklist shows that tab', await page.isVisible('#tab-checklist'));

  await page.click('#settingsBtn');
  await page.click('#settingsDialog [data-theme="dark"]');
  t.check('dark mode can be picked', await page.evaluate(() => document.documentElement.dataset.theme) === 'dark');
  await page.click('#settingsDialog [data-theme="light"]');
  t.check('light mode can be picked', await page.evaluate(() => document.documentElement.dataset.theme) === 'light');
  await page.click('#settingsDialog .close');

  // Make some things, save a backup, wipe everything, load the backup.
  await page.click('#tabs [data-tab="inspiration"]');
  await t.paste(page, '#c63');
  await page.waitForSelector('.photo-tile');
  await page.click('#tabs [data-tab="planner"]');
  await page.click('#newPlanBtn');
  await page.evaluate(() => { currentPlan().floors[0].cells[0] = 'bricks'; save(); });
  await page.click('#settingsBtn');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#saveBackupBtn')]);
  const file = await download.path();
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  t.check('the backup has the plan and the photo', backup.state.plans.length === 1 && Object.keys(backup.images).length === 1);

  await page.evaluate(() => { localStorage.clear(); clearImages(); });
  await t.reload(page);
  t.check('wiping storage empties the app', (await page.saved()) === null || !(await page.saved()).plans.length);
  t.check('with nothing saved, setup opens again', await page.isVisible('#setupDialog'));
  await page.click('#setupSkipBtn');
  await page.click('#settingsBtn');
  await page.setInputFiles('#backupFile', file);
  await page.waitForFunction(() => state.plans.length === 1);
  t.check('loading the backup brings the plan back', (await page.saved()).plans[0].floors[0].cells[0] === 'bricks');
  await page.click('#tabs [data-tab="inspiration"]');
  t.check('loading the backup brings the photo back', await page.$eval('.photo-tile img', img => img.src.startsWith('data:image/')));

  await page.click('#settingsBtn');
  await page.setInputFiles('#backupFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  t.check('a file that isn\'t a backup is refused', (await page.toast()).includes('isn\'t a Build Helper backup'));
  await page.click('#settingsDialog .close');

  // Every file the page loads is in the offline list.
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const used = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]);
  const missing = used.filter(f => !sw.includes(`'${f}'`));
  t.check('sw.js lists every file the page uses', !missing.length, missing);

  // Phones: tabs at the bottom and nothing sticking out sideways, in light and dark.
  const phone = await t.open({ viewport: { width: 375, height: 760 } });
  const navBox = await (await phone.$('#tabs')).boundingBox();
  t.check('on phones the tabs sit at the bottom', navBox.y + navBox.height >= 755);
  for (const tab of ['learn', 'palettes', 'inspiration', 'planner', 'checklist']) {
    await phone.click(`#tabs [data-tab="${tab}"]`);
    if (tab === 'inspiration') { await t.paste(phone); await phone.waitForSelector('.photo-tile'); }
    if (tab === 'planner') await phone.click('#newPlanBtn');
    t.check(`no sideways scrolling on the ${tab} tab (phone)`, await t.noSideScroll(phone));
  }
  await phone.evaluate(() => { state.theme = 'dark'; applyTheme(); });
  await phone.click('#tabs [data-tab="learn"]');
  await phone.click('[data-tip="paths"]');
  t.check('the tip window fits a phone', await phone.evaluate(() => {
    const r = document.querySelector('#tipDialog').getBoundingClientRect();
    return r.left >= 0 && r.right <= window.innerWidth;
  }));
};

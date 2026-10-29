'use strict';

// Checklist tab: ticking points, the score, tip links, saving reviews and starting over.
module.exports = async t => {
  const page = await t.open({ tab: 'checklist' });

  const missing = await page.evaluate(() => CHECKLIST.flatMap(([, items]) => items).filter(([, , tip]) => !tipById(tip)).map(([id]) => id));
  t.check('every point links to a real tip', !missing.length, missing);
  const total = await page.evaluate(() => CHECK_IDS.length);

  await page.fill('#reviewName', 'Starter house');
  await page.check('[data-check="depth"]');
  await page.check('[data-check="roof"]');
  t.check('ticking updates the score', (await page.textContent('#reviewScore')) === `2 of ${total}`);
  await t.reload(page);
  t.check('a review in progress is kept after reopening', (await page.inputValue('#reviewName')) === 'Starter house' && await page.isChecked('[data-check="roof"]'));

  await page.click('.check-item:has([data-check="texture"]) .link-btn');
  t.check('"How?" opens the matching tip', await page.isVisible('#tipDialog h2:has-text("Mix blocks for texture")'));
  await page.keyboard.press('Escape');

  await page.click('#saveReviewBtn');
  t.check('saving goes back to the top for the next build', await page.evaluate(() => scrollY) === 0);
  t.check('saving clears the list for the next build', (await page.textContent('#reviewScore')) === `0 of ${total}` && !(await page.inputValue('#reviewName')));
  t.check('the saved review is listed', (await page.textContent('.past-reviews')).includes('Starter house'));
  await page.click('.past-reviews summary');
  t.check('a saved review shows what to work on', (await page.textContent('.past-reviews .missed')).includes('flat texture'));

  await page.check('[data-check="paths"]');
  await page.click('#startOverBtn');
  t.check('Start over unticks everything', (await page.textContent('#reviewScore')) === `0 of ${total}`);

  await page.click('.past-reviews summary');
  await page.click('.past-reviews .btn.danger');
  t.check('saved reviews can be deleted', (await page.saved()).reviews.length === 0 && !(await page.isVisible('.past-reviews')));
  t.check('no stray "false" text without past reviews', !(await page.textContent('#tab-checklist')).includes('false'));
};

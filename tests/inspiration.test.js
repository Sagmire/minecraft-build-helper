'use strict';

// Inspiration tab: pasting, adding files, categories, notes, deleting with undo, the big view.
module.exports = async t => {
  const page = await t.open({ tab: 'inspiration' });

  t.check('empty board explains how to add photos', await page.isVisible('.empty:has-text("Ctrl + V")'));
  await t.paste(page, '#a53');
  await page.waitForSelector('.photo-tile');
  t.check('Ctrl + V adds a photo', (await page.$$('.photo-tile')).length === 1);
  t.check('it goes in Other when looking at everything', (await page.saved()).inspiration.items[0].category === 'Other');

  await page.click('.chips [data-value="Houses"]');
  await page.setInputFiles('#photoFiles', [await t.file(page, '#35a', 'a.png'), await t.file(page, '#3a5', 'b.png')]);
  await page.waitForFunction(() => document.querySelectorAll('.photo-tile').length === 2);
  t.check('added photos go in the category being looked at', (await page.saved()).inspiration.items.filter(i => i.category === 'Houses').length === 2);
  t.check('category chips count photos', (await page.textContent('.chips [data-value="Houses"]')).includes('(2)'));

  await page.click('.chips [data-value="All"]');
  t.check('All shows every photo', (await page.$$('.photo-tile')).length === 3);

  const first = await page.$eval('.photo-tile', e => e.dataset.photo);
  await page.selectOption(`[data-photo="${first}"] select`, 'Roofs');
  await page.fill(`[data-photo="${first}"] input`, 'Nice curved roof');
  await page.press(`[data-photo="${first}"] input`, 'Enter');
  await page.click('h1');
  const saved = (await page.saved()).inspiration.items.find(i => i.id === first);
  t.check('category and note can be changed', saved.category === 'Roofs' && saved.note === 'Nice curved roof', saved);

  await page.click('#newCategoryBtn');
  t.check('new categories can be made (and are opened)', await page.isVisible('.chips .chip.on[data-value="Test"]'));
  await t.paste(page, '#999');
  await page.waitForSelector('.photo-tile');
  t.check('pasting adds to the new category', (await page.saved()).inspiration.items[0].category === 'Test');
  await page.click('.chip-x[aria-label="Delete the Test category"]');
  const afterDelete = await page.saved();
  t.check('deleting a category moves its photos to Other', !afterDelete.inspiration.categories.includes('Test') && afterDelete.inspiration.items[0].category === 'Other');

  await page.click('.chips [data-value="All"]');
  await page.click(`[data-photo="${first}"] .photo-btn`);
  t.check('clicking a photo opens it big', await page.isVisible('#photoDialog img'));
  t.check('the big view shows the note', (await page.textContent('#photoDialog')).includes('Nice curved roof'));
  const before = parseInt(await page.textContent('#photoDialog .hint'), 10);
  await page.keyboard.press('ArrowRight');
  t.check('arrow keys go to the next photo', parseInt(await page.textContent('#photoDialog .hint'), 10) === before + 1);
  await page.keyboard.press('Escape');

  await page.click(`[data-photo="${first}"] .icon-btn.danger`);
  t.check('deleting removes the photo', (await page.$$('.photo-tile')).length === 3);
  await page.click('.toast-action');
  t.check('Undo brings it back', (await page.$$(`[data-photo="${first}"]`)).length === 1);

  await t.reload(page);
  t.check('photos are kept after reopening', (await page.$$('.photo-tile')).length === 4);
  t.check('the pictures load after reopening', await page.$eval('.photo-tile img', img => img.src.startsWith('data:image/')));

  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  });
  t.check('pasting text does nothing', (await page.$$('.photo-tile')).length === 4);
};

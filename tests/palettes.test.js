'use strict';

// Palettes tab: styles, starting from a block, favourites and "Plan a build with it".
module.exports = async t => {
  const page = await t.open({ tab: 'palettes' });

  const unknown = await page.evaluate(() => [...PALETTES.flatMap(p => p.blocks.map(([id]) => id)), ...GRADIENTS.flatMap(g => g.blocks)].filter(id => !BLOCKS[id]));
  t.check('palettes and gradients only use known blocks', !unknown.length, unknown);
  const all = (await page.$$('.palette-card')).length;
  t.check('palettes are shown', all > 5);

  await page.click('.chips [data-value="Desert"]');
  const desert = await page.$$eval('.palette-card', cards => cards.map(c => c.dataset.palette));
  t.check('style chips filter palettes', desert.length === 1 && desert[0] === 'desert', desert);
  await page.click('.chips [data-value="All"]');

  await page.fill('#blockSearch', 'Deepslate tiles');
  const withTiles = await page.$$eval('.palette-card', cards => cards.map(c => c.dataset.palette));
  t.check('starting from a block shows palettes that use it', withTiles.length > 0 && withTiles.length < all, withTiles);
  t.check('the block is highlighted', (await page.$$('.palette-blocks li.hl')).length === withTiles.length);
  await page.fill('#blockSearch', '');
  t.check('clearing the block shows everything again', (await page.$$('.palette-card')).length === all);

  await page.click('[data-palette="cabin"] .fav');
  await page.click('.chips [data-value="★ Favourites"]');
  const favs = await page.$$eval('.palette-card', cards => cards.map(c => c.dataset.palette));
  t.check('favourites show under ★ Favourites', favs.length === 1 && favs[0] === 'cabin', favs);
  await page.click('[data-palette="cabin"] .fav');
  t.check('unfavouriting empties the list with a hint', await page.isVisible('.empty:has-text("No favourites yet")'));
  await page.click('.chips [data-value="All"]');

  t.check('gradients are shown', (await page.$$('.gradient')).length > 3);

  await page.click('[data-palette="tudor"] button:has-text("Plan a build with it")');
  t.check('"Plan a build with it" opens a new plan', await page.isVisible('#planCanvas'));
  t.check('the plan uses the palette', await page.$eval('#planPalette', s => s.value) === 'tudor');
  t.check('the palette\'s wall block is picked', await page.isVisible('.tray-block.on[data-block="calcite"]'));
};

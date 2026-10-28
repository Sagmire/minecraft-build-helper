'use strict';

// Learn tab: tip cards, topics, the tip window and "Mark as learned".
module.exports = async t => {
  const page = await t.open();

  t.check('no ⭐ tips when setup was skipped', !(await page.isVisible('.badge.for-you')));
  t.check('no stray "false" text', !(await page.textContent('#tab-learn')).includes('false'));

  // Every tip picture is a proper rectangle of known blocks.
  const problems = await page.evaluate(() => TIPS.flatMap(tip => ['mistake', 'better'].flatMap(side => {
    const grid = tip[side].grid;
    const bad = [];
    if (grid.length !== 10) bad.push(`${tip.id} ${side}: ${grid.length} rows`);
    grid.forEach((row, i) => {
      if (row.length !== 16) bad.push(`${tip.id} ${side} row ${i}: ${row.length} wide`);
      for (const ch of row) if (ch !== '.' && ch !== 'z' && !BLOCKS[TIP_LEGEND[ch]]) bad.push(`${tip.id} ${side}: unknown "${ch}"`);
    });
    return bad;
  })));
  t.check('tip pictures are all 16 × 10 with known blocks', !problems.length, problems);
  const ids = await page.evaluate(() => TIPS.map(x => x.id));
  t.check('tip ids are unique', new Set(ids).size === ids.length);
  t.check('a card for every tip', (await page.$$('.tip-card')).length === ids.length);

  await page.click('.chips [data-value="Roofs"]');
  const roofCards = await page.$$eval('.tip-card', cards => cards.map(c => c.dataset.tip));
  t.check('topic chips filter the cards', roofCards.length === 1 && roofCards[0] === 'roofs', roofCards);
  await page.click('.chips [data-value="All"]');

  await page.click('[data-tip="depth"]');
  t.check('opening a card shows the tip', await page.isVisible('#tipDialog h2:has-text("Give walls depth")'));
  t.check('the tip shows a mistake and a better picture', (await page.$$('#tipDialog canvas.tip-picture')).length === 2);
  await page.click('#learnedBtn');
  t.check('marking as learned says so', (await page.textContent('#learnedBtn')).includes('Learned'));
  await page.click('#tipDialog button:has-text("Next →")');
  const next = await page.evaluate(() => TIPS[TIPS.findIndex(x => x.id === 'depth') + 1].title);
  t.check('Next goes to the next tip', await page.isVisible(`#tipDialog h2:has-text("${next}")`));
  await page.keyboard.press('Escape');

  t.check('progress counts learned tips', (await page.textContent('.progress-text')).startsWith('1 of'));
  t.check('the learned card is marked', await page.isVisible('[data-tip="depth"] .badge.learned'));
  await t.reload(page);
  t.check('learned tips are kept after reopening', (await page.saved()).learned.includes('depth'));
  t.check('setup doesn\'t come back after skipping it', !(await page.isVisible('#setupDialog')));
};

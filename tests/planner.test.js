'use strict';

// Planner tab: simple plans, turning them into 3D block plans, and the 3D block planner's
// tools, layers, mirror, hotbar, undo and redo, 3D view and saving.
module.exports = async t => {
  const page = await t.open({ tab: 'planner' });
  const plan = () => page.evaluate(() => currentPlan());
  const layer = async (n = null) => page.evaluate(i => currentPlan().layers[i ?? plannerView.layer].cells, n);
  const count = async (id = null, n = null) => (await layer(n)).filter(c => (id ? c === id : c)).length;
  // Mouse position of a grid square's centre (the grid has a band of numbers along two edges).
  const at = async (x, z) => {
    await page.$eval('#planCanvas', c => { const r = c.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight) c.scrollIntoView({ block: 'center' }); });
    const box = await (await page.$('#planCanvas')).boundingBox();
    const [n, g] = await page.evaluate(() => [currentPlan().size, GUTTER]);
    return [box.x + g + ((x + 0.5) * (box.width - g)) / n, box.y + g + ((z + 0.5) * (box.height - g)) / n];
  };
  const drag = async (from, to, button = 'left') => {
    await page.mouse.move(...(await at(...from)));
    await page.mouse.down({ button });
    await page.mouse.move(...(await at(...to)), { steps: 4 });
    await page.mouse.up({ button });
  };
  const click = async (x, z, opts) => page.mouse.click(...(await at(x, z)), opts);

  // ---------- Simple plan ----------
  t.check('the list offers both kinds of plan', await page.isVisible('#newSimplePlanBtn') && await page.isVisible('#newPlanBtn'));
  await page.click('#newSimplePlanBtn');
  t.check('a simple plan has no block grid', await page.isVisible('#planWidth') && !(await page.isVisible('#planCanvas')));
  await page.fill('#planWidth', '12');
  await page.press('#planWidth', 'Tab');
  t.check('an even width shows the odd-width tip', await page.isVisible('.sheet-tip'));
  await page.click('.sheet-tip .link-btn');
  t.check('…which opens the tip', await page.isVisible('#tipDialog h2:has-text("Use odd widths")'));
  await page.keyboard.press('Escape');
  await page.fill('#planWidth', '13');
  await page.press('#planWidth', 'Tab');
  await page.fill('#planDepth', '9');
  await page.press('#planDepth', 'Tab');
  await page.fill('#planFloors', '2');
  await page.press('#planFloors', 'Tab');
  await page.selectOption('#planStyle', 'Medieval');
  t.check('palettes in the chosen style come first', (await page.$$eval('#planPalette option', o => o.map(x => x.value)))[1] === 'medieval');
  await page.selectOption('#planPalette', 'medieval');
  t.check('the palette\'s blocks are shown', (await page.$$('.plan-sheet .palette-blocks li')).length === 5);
  t.check('a 3D size preview shows the build\'s size', await page.isVisible('.size-preview') && (await page.textContent('#sizeCaption')).includes('13 × 9 blocks and 9 high'));
  await page.fill('#todoInput', 'Pick a spot by the river');
  await page.press('#todoInput', 'Enter');
  await page.fill('#planNotes', 'Village at 120, -40');

  // Photos from the Inspiration board.
  await page.click('#pickPhotosBtn');
  t.check('with no photos, it points to Inspiration', await page.isVisible('#photoDialog .empty'));
  await page.click('#photoDialog .close');
  await page.click('#tabs [data-tab="inspiration"]');
  await t.paste(page, '#a63');
  await page.waitForSelector('.photo-tile');
  await page.click('#tabs [data-tab="planner"]');
  await page.click('#pickPhotosBtn');
  await page.click('#photoDialog .pick-photo');
  await page.click('#pickDoneBtn');
  await page.waitForSelector('.plan-photos .strip-photo');
  t.check('inspiration photos can be added to a plan', (await page.$$('.plan-photos .strip-photo')).length === 1);

  let p = await plan();
  t.check('the simple plan is saved', p.mode === 'simple' && p.width === 13 && p.depth === 9 && p.floorCount === 2 && p.style === 'Medieval' && p.paletteId === 'medieval', p);

  await page.click('#plansBackBtn');
  t.check('the list shows the simple plan', (await page.textContent('[data-plan] .card-text')).includes('Simple plan · 13 × 9, 2 floors · Medieval'));
  await page.click('[data-plan]');

  // ---------- Turning it into a 3D block plan ----------
  await page.click('#toBlocksBtn');
  p = await plan();
  t.check('it becomes a 3D block plan with a grid and a 3D view', p.mode === 'blocks' && await page.isVisible('#planCanvas') && await page.isVisible('#view3d'));
  t.check('the grid is big enough for the build', p.size === 24);
  t.check('the outline is drawn with the palette\'s base block', await count('cobblestone') === 2 * 13 + 2 * 9 - 4);
  t.check('notes, steps and photos come along', p.notes === 'Village at 120, -40' && p.todo.length === 1 && p.photoIds.length === 1);
  t.check('the palette\'s wall block is ready to place', await page.isVisible('.tray-block.on[data-block="oak_planks"]'));

  // ---------- Tools ----------
  await page.click('#plansBackBtn');
  await page.click('#newPlanBtn');
  t.check('a new 3D plan starts empty with one layer', (await plan()).layers.length === 1 && await count() === 0);

  await drag([2, 2], [11, 2]);
  t.check('the pencil draws a line without gaps', await count() === 10);
  await page.click('[data-tool="line"]');
  await drag([2, 4], [8, 10]);
  t.check('the line tool draws a straight diagonal', await count() === 17);
  await page.click('[data-tool="rect"]');
  await drag([14, 2], [17, 4]);
  t.check('the rectangle tool fills a rectangle', await count() === 17 + 12);
  await page.click('[data-tool="walls"]');
  await drag([2, 13], [8, 19]);
  t.check('the walls tool draws an outline', await count() === 29 + 24);
  await page.click('[data-tool="fill"]');
  await page.click('.tray-block[data-block="spruce_planks"]');
  t.check('picking a block keeps the tool', await page.isVisible('[data-tool="fill"][aria-pressed="true"]'));
  await click(5, 16);
  t.check('fill fills inside the walls only', await count('spruce_planks') === 25);
  await page.click('[data-tool="circle"]');
  await page.click('.tray-block[data-block="stone_bricks"]');
  await page.click('[data-tool="circle"]');
  await drag([17, 15], [20, 15]);
  const circle = await count('stone_bricks');
  t.check('the circle tool draws a ring', circle > 12 && circle < 30, circle);

  await page.click('#undoBtn');
  t.check('Undo takes the last change back', await count('stone_bricks') === 0);
  await page.click('#redoBtn');
  t.check('Redo puts it back', await count('stone_bricks') === circle);
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+y');
  t.check('Ctrl + Z and Ctrl + Y work too', await count('stone_bricks') === circle);

  await page.click('[data-tool="eraser"]');
  await click(2, 2);
  t.check('the eraser removes a block', !(await layer())[2 * 24 + 2]);
  await page.click('[data-tool="pencil"]');
  await page.mouse.move(...(await at(3, 2)));
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });
  t.check('right-click erases with any tool', !(await layer())[2 * 24 + 3]);

  await page.click('[data-tool="picker"]');
  await click(5, 16);
  t.check('the picker picks up a block from the grid', await page.evaluate(() => plannerView.block) === 'spruce_planks' && await page.isVisible('[data-tool="pencil"][aria-pressed="true"]'));
  t.check('used blocks go in the hotbar', (await page.$$('.hotbar-slot')).length >= 2);
  await page.keyboard.press('2');
  t.check('number keys pick from the hotbar', await page.evaluate(() => plannerView.block) === 'stone_bricks');
  await page.keyboard.press('r');
  t.check('letter keys pick tools', await page.isVisible('[data-tool="rect"][aria-pressed="true"]'));

  await page.click('#blockFind');
  await page.keyboard.type('glow');
  t.check('blocks can be found by name', (await page.$$eval('#blockTray .tray-block', b => b.map(x => x.dataset.block))).join() === 'glowstone');
  t.check('typing in the search box doesn\'t switch tools', await page.isVisible('[data-tool="rect"][aria-pressed="true"]'));
  await page.click('#blockTray [data-block="glowstone"]');
  await page.fill('#blockFind', '');

  // ---------- Mirror ----------
  await page.click('[data-tool="pencil"]');
  await page.click('#mirrorBtn');
  const before = await count();
  await click(1, 22);
  const l = await layer();
  t.check('mirror places the matching block on the other side', l[22 * 24 + 1] === 'glowstone' && l[22 * 24 + 22] === 'glowstone' && await count() === before + 2);
  await page.click('#mirrorBtn');
  await click(0, 0);
  const l2 = await layer();
  t.check('mirror both ways places four', ['0', '23', `${23 * 24}`, `${23 * 24 + 23}`].every(i => l2[Number(i)] === 'glowstone'));
  await page.click('#mirrorBtn');
  t.check('mirror turns off again', (await page.textContent('#mirrorBtn')).includes('Off'));

  // ---------- Layers ----------
  const ground = await count();
  await page.click('#copyLayerBtn');
  t.check('copy layer up adds a copy above and moves to it', (await plan()).layers.length === 2 && await page.evaluate(() => plannerView.layer) === 1 && await count() === ground);
  await page.click('#addLayerBtn');
  t.check('new layer above adds an empty layer', (await plan()).layers.length === 3 && await count() === 0);
  await click(0, 0);
  await page.click('#layerDownBtn');
  t.check('the layer buttons move between layers', (await page.textContent('#layerLabel')) === 'Layer 2 of 3');
  await page.keyboard.press(']');
  t.check('] goes up a layer', (await page.textContent('#layerLabel')) === 'Layer 3 of 3');
  await page.click('.more-menu summary');
  await page.click('#deleteLayerBtn');
  t.check('layers can be deleted', (await plan()).layers.length === 2);
  await page.click('.toast-action');
  t.check('…and the delete undone', (await plan()).layers.length === 3);
  t.check('materials add up every layer', (await page.textContent('.mat-total')).includes(String(ground * 2 + 1)));

  // ---------- 3D view ----------
  const faces = await page.evaluate(() => renderBuild(document.getElementById('view3d'), currentPlan(), {}));
  t.check('the 3D view draws the blocks', faces > 50, faces);
  const yaw = await page.evaluate(() => plannerView.yaw);
  await page.$eval('#view3d', c => c.scrollIntoView({ block: 'center' }));
  const box = await (await page.$('#view3d')).boundingBox();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 120, { steps: 5 });
  await page.mouse.up();
  t.check('dragging turns the 3D view', Math.abs(await page.evaluate(() => plannerView.yaw) - yaw) > 0.5);
  await page.click('#turnLeftBtn');
  await page.mouse.move(box.x + 150, box.y + 150);
  await page.mouse.wheel(0, -300);
  t.check('scrolling zooms in', await page.evaluate(() => plannerView.zoom) > 1);
  await page.click('#resetViewBtn');
  t.check('Reset goes back to the starting view', await page.evaluate(() => plannerView.zoom === 1 && plannerView.yaw === -0.7));
  await page.click('#cutAwayBox');
  await page.click('#layerDownBtn');
  t.check('"Hide layers above" works', await page.evaluate(() => renderBuild(document.getElementById('view3d'), currentPlan(), { upTo: plannerView.layer })) < faces);

  // ---------- Ruler and sizes ----------
  await page.click('#cutAwayBox');
  await page.click('[data-tool="ruler"]');
  await page.click('#layerUpBtn');
  await drag([2, 13], [8, 13]);
  t.check('dragging the ruler measures across', (await page.textContent('#planStatus')).includes('7 across'));
  await click(2, 13);
  t.check('a single click waits for a second block', (await page.textContent('#planStatus')).includes('second block'));
  await page.click('#layerDownBtn');
  await click(8, 19);
  t.check('…which can be on another layer, to measure height', (await page.textContent('#planStatus')).includes('7 across, 7 deep, 2 high'));
  await page.keyboard.press('Escape');
  t.check('Esc clears the ruler', !(await page.evaluate(() => plannerView.measure)));
  t.check('the build\'s size is shown', /Build size: \d+ wide × \d+ deep × 3 high/.test(await page.textContent('#sizeReadout')));
  const withSizes = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 300; renderBuild(c, currentPlan(), { sizes: true }); return c.toDataURL(); });
  const noSizes = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 300; renderBuild(c, currentPlan(), { sizes: false }); return c.toDataURL(); });
  t.check('the 3D view can label sizes', withSizes !== noSizes);

  // ---------- Terrain ----------
  const needed = await page.textContent('.mat-total');
  const facesBefore = await page.evaluate(() => renderBuild(document.getElementById('view3d'), currentPlan(), {}));
  await page.click('#layerDownBtn');
  await page.click('#terrainModeBtn');
  t.check('terrain mode shows terrain blocks', await page.isVisible('.bp-blocks h3:has-text("Terrain")') && await page.isVisible('#blockTray [data-block="water"]'));
  await page.click('[data-cover="grass_block"]');
  await page.click('#blockTray [data-block="water"]');
  await page.click('[data-tool="pencil"]');
  await click(20, 20);
  const terrain = await page.evaluate(() => currentPlan().layers[0].terrain);
  t.check('terrain can cover a layer and be drawn on', terrain.filter(id => id === 'grass_block').length === 24 * 24 - 1 && terrain[20 * 24 + 20] === 'water');
  t.check('terrain isn\'t counted in Blocks needed', (await page.textContent('.mat-total')) === needed);
  t.check('terrain shows in the 3D view', await page.evaluate(() => renderBuild(document.getElementById('view3d'), currentPlan(), {})) > facesBefore);
  t.check('…and can be hidden', await page.evaluate(() => renderBuild(document.getElementById('view3d'), currentPlan(), { hideTerrain: true })) === facesBefore);
  t.check('drawing terrain leaves the build alone', await count(null, 0) === ground);
  await page.click('#copyLayerBtn');
  t.check('copy layer up in terrain mode copies the terrain only', await page.evaluate(() => { const l = currentPlan().layers[1]; return l.terrain.filter(Boolean).length === 24 * 24 && !l.cells.some(Boolean); }));
  await page.click('#undoBtn');
  await page.click('#buildModeBtn');
  t.check('back in build mode the build\'s blocks show again', await page.isVisible('#planPalette'));
  await page.click('#copyLayerBtn');
  t.check('copy layer up in build mode doesn\'t copy the terrain', await page.evaluate(() => !currentPlan().layers[1].terrain.some(Boolean)));
  await page.click('#undoBtn');
  await page.click('[data-tool="eraser"]');
  await click(20, 20);
  t.check('erasing in build mode keeps the terrain', await page.evaluate(() => currentPlan().layers[0].terrain[20 * 24 + 20]) === 'water');
  await page.click('.more-menu summary');
  await page.click('#addLayerBelowBtn');
  t.check('a new layer can go below (for ground under the build)', (await plan()).layers.length === 4 && await page.evaluate(() => plannerView.layer) === 0 && await count() === 0);
  await page.click('#undoBtn');

  // ---------- Size, saving ----------
  await page.click('.more-menu summary');
  await page.selectOption('#planSize', '32');
  t.check('the grid can be made bigger, keeping the blocks', (await plan()).size === 32 && await count() === ground);
  await page.fill('#planName', 'Riverside tower');
  await page.press('#planName', 'Tab');
  await t.reload(page);
  t.check('plans are kept after reopening', await page.isVisible('[data-plan] .card-title:has-text("Riverside tower")'));
  t.check('the list shows a 3D picture of the plan', await page.isVisible('[data-plan] canvas.plan-preview'));
  await page.click('[data-plan]:has-text("Riverside tower")');
  t.check('opening it shows the same blocks', (await plan()).layers.length === 3 && await count(null, 0) === ground);
  t.check('terrain is kept after reopening', await page.evaluate(() => { const p = currentPlan(); return p.layers[0].terrain[20 * p.size + 20]; }) === 'water');
  const stored = await page.evaluate(() => localStorage.getItem('minecraftBuildHelper').length);
  t.check('plans are saved compactly', stored < 20000, stored);

  await page.click('#deletePlanBtn');
  t.check('plans can be deleted', (await page.evaluate(() => state.plans.length)) === 1);

  // Phone: blocks are a strip above the grid and nothing sticks out sideways.
  const phone = await t.open({ tab: 'planner', viewport: { width: 375, height: 760 } });
  await phone.click('#newPlanBtn');
  const strip = await (await phone.$('.bp-blocks')).boundingBox();
  const grid = await (await phone.$('#planCanvas')).boundingBox();
  t.check('on phones the blocks sit above the grid', strip.y < grid.y);
  t.check('no sideways scrolling in the 3D planner on a phone', await t.noSideScroll(phone));
};

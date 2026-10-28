'use strict';

// Planner tab: drawing, erasing, filling, undo, floors, sizes, materials, to-dos and notes.
module.exports = async t => {
  const page = await t.open({ tab: 'planner' });
  const cells = (floor = 0) => page.evaluate(f => currentPlan().floors[f].cells, floor);
  const filled = async (floor = 0) => (await cells(floor)).filter(Boolean).length;
  // Mouse position of a grid square's centre.
  const at = async (x, y) => {
    const box = await (await page.$('#planCanvas')).boundingBox();
    const n = await page.evaluate(() => currentPlan().size);
    return [box.x + ((x + 0.5) * box.width) / n, box.y + ((y + 0.5) * box.height) / n];
  };
  const drag = async (from, to, button = 'left') => {
    await page.mouse.move(...(await at(...from)));
    await page.mouse.down({ button });
    await page.mouse.move(...(await at(...to)), { steps: 3 });
    await page.mouse.up({ button });
  };

  await page.click('#newPlanBtn');
  t.check('New plan opens the editor', await page.isVisible('#planCanvas'));

  await drag([2, 2], [11, 2]);
  t.check('dragging draws a line without gaps', await filled() === 10, await filled());
  t.check('it draws with the picked block', (await cells())[2 * 24 + 2] === 'oak_planks');
  t.check('materials count the blocks', (await page.textContent('#materials [data-block="oak_planks"] .mat-count')).startsWith('10'));

  await page.click('.tray-block[data-block="cobblestone"]');
  await drag([2, 3], [2, 9]);
  await drag([11, 3], [11, 9]);
  await drag([3, 9], [10, 9]);
  t.check('a closed outline is drawn', await filled() === 32, await filled());

  await page.click('[data-tool="fill"]');
  await page.click('.tray-block[data-block="spruce_planks"]');
  await page.mouse.click(...(await at(5, 5)));
  t.check('fill fills inside the outline only', (await cells()).filter(id => id === 'spruce_planks').length === 48);
  await page.click('#undoBtn');
  t.check('Undo takes the fill back', (await cells()).filter(id => id === 'spruce_planks').length === 0);

  await page.click('[data-tool="draw"]');
  await page.mouse.move(...(await at(2, 2)));
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });
  t.check('right-click erases', !(await cells())[2 * 24 + 2]);
  await page.click('[data-tool="erase"]');
  await page.mouse.click(...(await at(3, 2)));
  t.check('the eraser erases', !(await cells())[2 * 24 + 3] && await filled() === 30);
  await page.keyboard.press('Control+z');
  t.check('Ctrl + Z undoes', (await cells())[2 * 24 + 3] === 'oak_planks');

  await page.click('#addFloorBtn');
  t.check('floors can be added', await page.isVisible('.floors .chip.on[data-value="1"]'));
  await page.click('.tray-block[data-block="glass"]');
  await page.mouse.click(...(await at(6, 2)));
  t.check('drawing goes on the floor being looked at', await filled(1) === 1 && await filled(0) === 31);
  t.check('materials add up every floor', (await page.textContent('.mat-total')).includes('32'));

  await page.click('.floors .chip[data-value="0"]');
  await page.selectOption('#planPalette', 'castle');
  t.check('picking a palette shows its blocks', (await page.$$('.tray-block')).length === 6);
  t.check('…and picks its wall block', await page.isVisible('.tray-block.on[data-block="stone_bricks"]'));

  await page.fill('#todoInput', 'Dig the foundation');
  await page.press('#todoInput', 'Enter');
  await page.fill('#todoInput', 'Build the walls');
  await page.click('#todoAddBtn');
  await page.check('.todo li:first-child input');
  await page.fill('#planNotes', 'Near spawn, by the river');
  await page.fill('#planName', 'Riverside house');
  await page.press('#planName', 'Tab');

  let plan = (await page.saved()).plans[0];
  t.check('to-dos are saved', plan.todo.length === 2 && plan.todo[0].done && !plan.todo[1].done, plan.todo);
  t.check('notes and name are saved', plan.notes === 'Near spawn, by the river' && plan.name === 'Riverside house');

  await page.selectOption('#planSize', '16');
  plan = (await page.saved()).plans[0];
  t.check('the grid can be made smaller, keeping what fits', plan.size === 16 && plan.floors[0].cells.length === 256 && plan.floors[0].cells.filter(Boolean).length === 31);
  await page.selectOption('#planSize', '48');
  t.check('…and bigger again', (await page.saved()).plans[0].floors[0].cells.length === 48 * 48);

  await page.click('.floors .chip[data-value="1"]');
  await page.click('#deleteFloorBtn');
  t.check('floors can be deleted', (await page.saved()).plans[0].floors.length === 1);

  await t.reload(page);
  t.check('the plan is kept after reopening', await page.isVisible('[data-plan] .card-title:has-text("Riverside house")'));
  t.check('the plan list shows its size and blocks', (await page.textContent('[data-plan] .card-text')).includes('48 × 48 · 1 floor · 31 blocks'));
  await page.click('[data-plan]');
  t.check('opening it shows the drawing', await filled() === 31);
  await page.click('#plansBackBtn');

  await page.click('#newPlanBtn');
  await page.click('#deletePlanBtn');
  t.check('plans can be deleted', (await page.saved()).plans.length === 1);
};

'use strict';

// 📐 Planner tab: sketch a build from above, one floor at a time, then see how many of each
// block it needs. Each plan also has a to-do list and notes.

const PLAN_SIZES = [16, 24, 32, 48];
const TOOLS = [['draw', '🖌️', 'Draw'], ['erase', '🧽', 'Erase'], ['fill', '🪣', 'Fill']];
// planId: the plan being edited (null = the list of plans). undo: earlier copies of floors.
const plannerView = { planId: null, floor: 0, tool: 'draw', block: '', showBelow: true, undo: [] };
let planStroke = null;

function normalizePlan(p) {
  if (!p || typeof p !== 'object') return null;
  const size = PLAN_SIZES.includes(Number(p.size)) ? Number(p.size) : 24;
  const floors = (Array.isArray(p.floors) && p.floors.length ? p.floors : [{}]).map(f => ({
    cells: Array.from({ length: size * size }, (_, i) => (BLOCKS[f?.cells?.[i]] ? f.cells[i] : '')),
  }));
  return {
    id: String(p.id || uid()),
    name: String(p.name || 'My build'),
    paletteId: PALETTES.some(x => x.id === p.paletteId) ? p.paletteId : '',
    size,
    floors,
    todo: (Array.isArray(p.todo) ? p.todo : []).filter(t => t?.text).map(t => ({ id: String(t.id || uid()), text: String(t.text), done: !!t.done })),
    notes: String(p.notes || ''),
    created: Number(p.created) || Date.now(),
    updated: Number(p.updated) || Date.now(),
  };
}

function currentPlan() {
  return state.plans.find(p => p.id === plannerView.planId) || null;
}

// The block to start drawing with: the palette's wall block, or oak planks.
function defaultBlock(plan) {
  const palette = PALETTES.find(p => p.id === plan.paletteId);
  return palette ? (palette.blocks.find(([, role]) => /walls/i.test(role)) || palette.blocks[0])[0] : 'oak_planks';
}

function newPlan({ paletteId = '', name = '' } = {}) {
  const plan = normalizePlan({ id: uid(), name: name || `Build ${state.plans.length + 1}`, paletteId, size: 24 });
  state.plans.unshift(plan);
  save();
  openPlan(plan.id);
}

function openPlan(id) {
  const plan = state.plans.find(p => p.id === id);
  plannerView.planId = plan ? plan.id : null;
  plannerView.floor = 0;
  plannerView.undo = [];
  plannerView.tool = 'draw';
  if (plan) plannerView.block = defaultBlock(plan);
  showTab('planner');
}

function touchPlan(plan) {
  plan.updated = Date.now();
  save();
}

function materials(plan) {
  const counts = new Map();
  for (const floor of plan.floors) for (const id of floor.cells) if (id) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
}

// "130" → "2 stacks + 2", the way you'd gather blocks in the game.
function stacks(n) {
  const full = Math.floor(n / 64);
  const rest = n % 64;
  if (!full) return '';
  return `${full} stack${full === 1 ? '' : 's'}${rest ? ` + ${rest}` : ''}`;
}

function renderPlanner() {
  const plan = currentPlan();
  if (!plan) plannerView.planId = null;
  return plan ? renderPlanEditor(plan) : renderPlanList();
}

function renderPlanList() {
  const root = document.getElementById('tab-planner');
  setContent(root,
    sectionHead('Planner', 'Sketch a build from above, one floor at a time. It counts how many blocks you\'ll need.'),
    el('div', { class: 'card-grid plan-grid' },
      el('button', { type: 'button', class: 'card new-plan', id: 'newPlanBtn', onclick: () => newPlan() },
        el('span', { class: 'new-plan-plus' }, '+'), el('strong', {}, 'New plan')),
      ...state.plans.map(plan => {
        const total = materials(plan).reduce((sum, [, n]) => sum + n, 0);
        const preview = el('canvas', { class: 'plan-preview', width: plan.size * 4, height: plan.size * 4, 'aria-hidden': 'true' });
        drawPlanPreview(plan, preview);
        return el('button', { type: 'button', class: 'card plan-card', 'data-plan': plan.id, onclick: () => openPlan(plan.id) },
          preview,
          el('span', { class: 'card-body' },
            el('strong', { class: 'card-title' }, plan.name),
            el('span', { class: 'card-text' }, `${plan.size} × ${plan.size} · ${plan.floors.length} floor${plan.floors.length === 1 ? '' : 's'} · ${total} blocks`)));
      })),
    !state.plans.length && el('p', { class: 'hint center' }, 'Tip: on the Palettes tab, "Plan a build with it" starts a plan with that palette\'s blocks.'),
  );
}

function drawPlanPreview(plan, canvas) {
  const ctx = canvas.getContext('2d');
  const cell = canvas.width / plan.size;
  ctx.fillStyle = '#e9efe3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Show each spot's top-most block, like looking down on the build.
  for (let i = 0; i < plan.size * plan.size; i++) {
    const top = [...plan.floors].reverse().find(f => f.cells[i])?.cells[i];
    if (!top) continue;
    ctx.fillStyle = BLOCKS[top].color;
    ctx.fillRect((i % plan.size) * cell, Math.floor(i / plan.size) * cell, cell, cell);
  }
}

function renderPlanEditor(plan) {
  const root = document.getElementById('tab-planner');
  if (plannerView.floor >= plan.floors.length) plannerView.floor = plan.floors.length - 1;
  const palette = PALETTES.find(p => p.id === plan.paletteId);

  setContent(root,
    el('div', { class: 'planner-top' },
      el('button', { type: 'button', class: 'btn', id: 'plansBackBtn', onclick: () => { plannerView.planId = null; renderPlanner(); } }, '← All plans'),
      el('input', {
        class: 'input plan-name', id: 'planName', value: plan.name, 'aria-label': 'Plan name',
        onchange: e => { plan.name = e.target.value.trim() || 'My build'; touchPlan(plan); },
      }),
      el('button', { type: 'button', class: 'btn danger', id: 'deletePlanBtn', onclick: () => {
        if (!confirm(`Delete the plan "${plan.name}"? This can't be undone.`)) return;
        state.plans = state.plans.filter(p => p !== plan);
        plannerView.planId = null;
        save();
        renderPlanner();
        toast('Plan deleted.');
      } }, '🗑 Delete plan')),
    el('div', { class: 'planner' },
      el('div', { class: 'planner-main' },
        el('div', { class: 'toolbar' },
          el('div', { class: 'segmented', role: 'group', 'aria-label': 'Tool' }, ...TOOLS.map(([key, icon, label]) => el('button', {
            type: 'button', 'data-tool': key, 'aria-pressed': String(plannerView.tool === key), class: plannerView.tool === key ? 'on' : '',
            onclick: () => { plannerView.tool = key; renderPlanEditor(plan); },
          }, `${icon} ${label}`))),
          el('button', { type: 'button', class: 'btn', id: 'undoBtn', disabled: !plannerView.undo.length, onclick: undoPlan, title: 'Undo (Ctrl + Z)' }, '↶ Undo'),
          el('span', { class: 'current-block' }, 'Block: ', swatch(plannerView.block), el('strong', {}, blockName(plannerView.block)))),
        el('div', { class: 'chips floors', role: 'group', 'aria-label': 'Floors' },
          ...plan.floors.map((f, i) => chip(`Floor ${i + 1}`, plannerView.floor === i, () => { plannerView.floor = i; renderPlanEditor(plan); }, String(i))),
          el('button', { type: 'button', class: 'chip add', id: 'addFloorBtn', onclick: () => {
            plan.floors.push({ cells: Array(plan.size * plan.size).fill('') });
            plannerView.floor = plan.floors.length - 1;
            touchPlan(plan);
            renderPlanEditor(plan);
          } }, '+ Add floor'),
          plan.floors.length > 1 && el('button', { type: 'button', class: 'chip remove', id: 'deleteFloorBtn', onclick: () => {
            const floor = plan.floors[plannerView.floor];
            if (floor.cells.some(Boolean) && !confirm(`Delete floor ${plannerView.floor + 1} and everything drawn on it?`)) return;
            plan.floors.splice(plannerView.floor, 1);
            plannerView.floor = Math.max(0, plannerView.floor - 1);
            plannerView.undo = [];
            touchPlan(plan);
            renderPlanEditor(plan);
          } }, `Delete floor ${plannerView.floor + 1}`)),
        el('div', { class: 'canvas-wrap', id: 'canvasWrap' }, el('canvas', { id: 'planCanvas', 'aria-label': `Floor ${plannerView.floor + 1}, seen from above` })),
        el('div', { class: 'plan-status', id: 'planStatus' }, 'Click or drag to draw. Right-click to erase.'),
        el('div', { class: 'toolbar small' },
          el('label', {}, 'Size ', el('select', {
            class: 'input small', id: 'planSize',
            onchange: e => resizePlan(plan, Number(e.target.value)),
          }, ...PLAN_SIZES.map(s => el('option', { value: s, selected: s === plan.size }, `${s} × ${s}`)))),
          plannerView.floor > 0 && el('label', { class: 'check' }, el('input', {
            type: 'checkbox', checked: plannerView.showBelow,
            onchange: e => { plannerView.showBelow = e.target.checked; drawPlan(); },
          }), ' Show floor below'),
          el('button', { type: 'button', class: 'btn small', id: 'clearFloorBtn', onclick: () => {
            const floor = plan.floors[plannerView.floor];
            if (!floor.cells.some(Boolean)) return;
            pushUndo(plan);
            floor.cells.fill('');
            touchPlan(plan);
            renderPlanEditor(plan);
            toast('Floor cleared.', { label: 'Undo', run: undoPlan });
          } }, 'Clear floor'))),
      el('aside', { class: 'planner-side' },
        el('section', { class: 'panel' },
          el('h3', {}, 'Blocks'),
          el('select', {
            class: 'input', id: 'planPalette', 'aria-label': 'Which blocks to show',
            onchange: e => {
              plan.paletteId = e.target.value;
              if (plan.paletteId) plannerView.block = defaultBlock(plan);
              touchPlan(plan);
              renderPlanEditor(plan);
            },
          },
            el('option', { value: '' }, 'All blocks'),
            ...PALETTES.map(p => el('option', { value: p.id, selected: p.id === plan.paletteId }, `Palette: ${p.name}`))),
          palette
            ? blockTray(palette.blocks.map(([id, role]) => [id, role]), plan)
            : el('div', { class: 'all-blocks' }, ...BLOCK_GROUPS.map(group => el('div', {},
              el('span', { class: 'tray-group' }, group),
              blockTray(BLOCK_LIST.filter(b => b[4] === group).map(([id]) => [id, '']), plan, true))))),
        el('section', { class: 'panel', id: 'materials' }),
        el('section', { class: 'panel' },
          el('h3', {}, 'To-do'),
          todoList(plan)),
        el('section', { class: 'panel' },
          el('h3', {}, 'Notes'),
          el('textarea', {
            class: 'input', id: 'planNotes', rows: 4, placeholder: 'Ideas, coordinates, what to build next…',
            oninput: e => { plan.notes = e.target.value; touchPlan(plan); },
          }, plan.notes)))),
  );

  setupCanvas(plan);
  renderMaterials(plan);
}

function blockTray(entries, plan, compact = false) {
  return el('div', { class: `tray${compact ? ' compact' : ''}` }, ...entries.map(([id, role]) => el('button', {
    type: 'button', class: `tray-block${id === plannerView.block ? ' on' : ''}`, 'data-block': id,
    title: blockName(id), 'aria-pressed': String(id === plannerView.block),
    onclick: () => {
      plannerView.block = id;
      if (plannerView.tool === 'erase') plannerView.tool = 'draw';
      renderPlanEditor(plan);
    },
  }, swatch(id, 'big'), !compact && el('span', { class: 'block-label' }, el('span', {}, blockName(id)), role && el('span', { class: 'role' }, role)))));
}

function renderMaterials(plan) {
  const box = document.getElementById('materials');
  if (!box) return;
  const list = materials(plan);
  const total = list.reduce((sum, [, n]) => sum + n, 0);
  setContent(box,
    el('h3', {}, 'Blocks needed'),
    list.length
      ? el('ul', { class: 'materials' },
        ...list.map(([id, n]) => el('li', { 'data-block': id },
          swatch(id), el('span', { class: 'mat-name' }, blockName(id)),
          el('span', { class: 'mat-count' }, el('strong', {}, n), stacks(n) && el('span', { class: 'hint' }, ` (${stacks(n)})`)))),
        el('li', { class: 'mat-total' }, el('span', {}, 'Total'), el('strong', {}, total)))
      : el('p', { class: 'hint' }, 'Draw on the grid and the blocks you need show up here.'));
}

function todoList(plan) {
  const input = el('input', { class: 'input', id: 'todoInput', placeholder: 'Add a step, e.g. Build the foundation', 'aria-label': 'New to-do' });
  const add = () => {
    const text = input.value.trim();
    if (!text) return;
    plan.todo.push({ id: uid(), text, done: false });
    touchPlan(plan);
    renderPlanEditor(plan);
    document.getElementById('todoInput').focus();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  return el('div', {},
    el('ul', { class: 'todo' }, ...plan.todo.map(t => el('li', { class: t.done ? 'done' : '' },
      el('label', { class: 'check' }, el('input', {
        type: 'checkbox', checked: t.done,
        onchange: e => { t.done = e.target.checked; touchPlan(plan); renderPlanEditor(plan); },
      }), el('span', {}, t.text)),
      el('button', {
        type: 'button', class: 'icon-btn', title: 'Remove', 'aria-label': `Remove ${t.text}`,
        onclick: () => { plan.todo = plan.todo.filter(x => x !== t); touchPlan(plan); renderPlanEditor(plan); },
      }, '×')))),
    el('div', { class: 'inline-add' }, input, el('button', { type: 'button', class: 'btn', id: 'todoAddBtn', onclick: add }, 'Add')));
}

// ---------- The drawing grid ----------

function setupCanvas(plan) {
  const canvas = document.getElementById('planCanvas');
  setupCanvasSize();
  const status = document.getElementById('planStatus');

  const cellAt = e => {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * plan.size);
    const y = Math.floor(((e.clientY - r.top) / r.height) * plan.size);
    return x >= 0 && y >= 0 && x < plan.size && y < plan.size ? { x, y } : null;
  };

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    const c = cellAt(e);
    if (!c) return;
    e.preventDefault();
    const erase = e.button === 2 || plannerView.tool === 'erase';
    pushUndo(plan);
    if (plannerView.tool === 'fill' && !erase) {
      fillArea(plan, c, plannerView.block);
      finishStroke(plan);
      return;
    }
    planStroke = { value: erase ? '' : plannerView.block, last: c };
    canvas.setPointerCapture(e.pointerId);
    setCell(plan, c, planStroke.value);
    drawPlan();
  });
  canvas.addEventListener('pointermove', e => {
    const c = cellAt(e);
    if (c) {
      const id = plan.floors[plannerView.floor].cells[c.y * plan.size + c.x];
      status.textContent = `Column ${c.x + 1}, row ${c.y + 1}${id ? ` · ${blockName(id)}` : ''}`;
    }
    if (!planStroke || !c) return;
    // Fill in the gap when the mouse moves fast.
    const { last } = planStroke;
    const steps = Math.max(Math.abs(c.x - last.x), Math.abs(c.y - last.y));
    for (let s = 1; s <= steps; s++) {
      setCell(plan, { x: Math.round(last.x + ((c.x - last.x) * s) / steps), y: Math.round(last.y + ((c.y - last.y) * s) / steps) }, planStroke.value);
    }
    planStroke.last = c;
    drawPlan();
  });
  const end = () => {
    if (!planStroke) return;
    planStroke = null;
    finishStroke(plan);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  drawPlan();
}

function setCell(plan, { x, y }, value) {
  plan.floors[plannerView.floor].cells[y * plan.size + x] = value;
}

function fillArea(plan, start, value) {
  const cells = plan.floors[plannerView.floor].cells;
  const n = plan.size;
  const target = cells[start.y * n + start.x];
  if (target === value) return;
  const queue = [start.y * n + start.x];
  while (queue.length) {
    const i = queue.pop();
    if (cells[i] !== target) continue;
    cells[i] = value;
    const x = i % n;
    if (x > 0) queue.push(i - 1);
    if (x < n - 1) queue.push(i + 1);
    if (i >= n) queue.push(i - n);
    if (i < n * n - n) queue.push(i + n);
  }
}

// Keeps a copy of the floor from before a change, for Undo. Changes that did nothing are dropped.
function pushUndo(plan) {
  plannerView.undo.push({ floor: plannerView.floor, cells: [...plan.floors[plannerView.floor].cells] });
  if (plannerView.undo.length > 50) plannerView.undo.shift();
}

function finishStroke(plan) {
  const last = plannerView.undo.at(-1);
  if (last && last.cells.every((id, i) => id === plan.floors[last.floor].cells[i])) plannerView.undo.pop();
  touchPlan(plan);
  drawPlan();
  renderMaterials(plan);
  const undo = document.getElementById('undoBtn');
  if (undo) undo.disabled = !plannerView.undo.length;
}

function undoPlan() {
  const plan = currentPlan();
  const last = plannerView.undo.pop();
  if (!plan || !last || !plan.floors[last.floor]) return;
  plan.floors[last.floor].cells = last.cells;
  plannerView.floor = last.floor;
  touchPlan(plan);
  renderPlanEditor(plan);
}

function resizePlan(plan, size) {
  const lost = plan.floors.some(f => f.cells.some((id, i) => id && (i % plan.size >= size || Math.floor(i / plan.size) >= size)));
  if (lost && !confirm(`Make the grid ${size} × ${size}? Blocks outside it will be removed.`)) {
    renderPlanEditor(plan);
    return;
  }
  for (const f of plan.floors) {
    const cells = Array(size * size).fill('');
    for (let y = 0; y < Math.min(size, plan.size); y++) {
      for (let x = 0; x < Math.min(size, plan.size); x++) cells[y * size + x] = f.cells[y * plan.size + x];
    }
    f.cells = cells;
  }
  plan.size = size;
  plannerView.undo = [];
  touchPlan(plan);
  renderPlanEditor(plan);
}

function drawPlan() {
  const plan = currentPlan();
  const canvas = document.getElementById('planCanvas');
  if (!plan || !canvas) return;
  const ctx = canvas.getContext('2d');
  const n = plan.size;
  const cell = canvas.width / n;
  const styles = getComputedStyle(document.documentElement);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = styles.getPropertyValue('--plan-bg');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const drawCells = cells => cells.forEach((id, i) => {
    if (id) ctx.drawImage(blockCanvas(id), (i % n) * cell, Math.floor(i / n) * cell, cell, cell);
  });
  if (plannerView.showBelow && plannerView.floor > 0) {
    ctx.globalAlpha = 0.25;
    drawCells(plan.floors[plannerView.floor - 1].cells);
    ctx.globalAlpha = 1;
  }
  drawCells(plan.floors[plannerView.floor].cells);
  // Grid lines, with a stronger line every 5 blocks to make counting easy.
  for (let i = 0; i <= n; i++) {
    ctx.fillStyle = styles.getPropertyValue(i % 5 === 0 ? '--plan-line-strong' : '--plan-line');
    const p = Math.min(Math.round(i * cell), canvas.width - 1);
    ctx.fillRect(p, 0, 1, canvas.height);
    ctx.fillRect(0, p, canvas.width, 1);
  }
}

document.addEventListener('keydown', e => {
  if (currentTab !== 'planner' || !currentPlan() || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
  if (e.target.closest?.('input, textarea, select')) return;
  e.preventDefault();
  undoPlan();
});

window.addEventListener('resize', () => {
  if (currentTab === 'planner' && currentPlan()) setupCanvasSize();
});

// Resizes the grid to fit the window without rebuilding the page.
function setupCanvasSize() {
  const plan = currentPlan();
  const canvas = document.getElementById('planCanvas');
  const wrap = document.getElementById('canvasWrap');
  if (!plan || !canvas || !wrap) return;
  // As big as fits the width and (on bigger screens) the height of the window, within limits.
  const fitHeight = window.innerWidth > 900 ? (window.innerHeight - 250) / plan.size : Infinity;
  const cell = Math.max(8, Math.min(28, Math.floor(Math.min((wrap.clientWidth || 600) / plan.size, fitHeight))));
  if (canvas.width !== cell * plan.size) {
    canvas.width = canvas.height = cell * plan.size;
    drawPlan();
  }
}

'use strict';

// 📐 Planner tab: the list of plans and the simple plan sheet. There are two kinds of plan:
// - simple: decide what to build (size, style, palette, inspiration photos, to-dos, notes)
// - 3D block plans: place every block, layer by layer, with a 3D view (block-planner.js)
// A simple plan can be turned into a 3D block plan and keeps its notes, to-dos and photos.
// Each layer of a block plan has the blocks to build (cells) and what's already there in the
// world (terrain: ground, water, trees), which isn't counted in "Blocks needed".

const PLAN_SIZES = [16, 24, 32, 48];
const MAX_LAYERS = 64;
// planId: the plan being edited (null = the list of plans). The rest is for the block planner.
const plannerView = {
  planId: null, layer: 0, tool: 'pencil', block: 'oak_planks', mirror: 0, ghost: true, cutAway: false,
  undo: [], redo: [], recent: [], search: '', yaw: -0.7, pitch: 0.6, zoom: 1,
  terrainMode: false, terrainBlock: 'grass_block', measure: null, sizes: true, hideTerrain: false,
};

function normalizePlan(p) {
  if (!p || typeof p !== 'object') return null;
  const size = PLAN_SIZES.includes(Number(p.size)) ? Number(p.size) : 24;
  // Older plans called their layers "floors".
  const raw = Array.isArray(p.layers) ? p.layers : Array.isArray(p.floors) ? p.floors : [];
  const count = (v, fallback, max) => Math.min(max, Math.max(1, Math.round(Number(v)) || fallback));
  return {
    id: String(p.id || uid()),
    name: String(p.name || 'My build'),
    mode: p.mode === 'simple' ? 'simple' : 'blocks',
    paletteId: PALETTES.some(x => x.id === p.paletteId) ? p.paletteId : '',
    style: PALETTE_STYLES.includes(p.style) ? p.style : '',
    width: count(p.width, 11, 200),
    depth: count(p.depth, 9, 200),
    floorCount: count(p.floorCount, 1, 20),
    photoIds: (Array.isArray(p.photoIds) ? p.photoIds : []).map(String),
    size,
    layers: (raw.length ? raw : [{}]).slice(0, MAX_LAYERS).map(l => ({
      cells: decodeCells(l, size, p.blocks),
      terrain: decodeCells({ rle: l?.trle, cells: l?.terrain }, size, p.blocks),
    })),
    todo: (Array.isArray(p.todo) ? p.todo : []).filter(t => t?.text).map(t => ({ id: String(t.id || uid()), text: String(t.text), done: !!t.done })),
    notes: String(p.notes || ''),
    created: Number(p.created) || Date.now(),
    updated: Number(p.updated) || Date.now(),
  };
}

// Layers are saved as runs of block numbers ("0*40,3*5,…" with the numbers pointing into the
// plan's block list), which keeps big plans small. Plain lists of block names work too.
function decodeCells(layer, size, blocks) {
  let cells = [];
  if (typeof layer?.rle === 'string' && Array.isArray(blocks)) {
    for (const run of layer.rle.split(',')) {
      if (!run) continue;
      const [index, times = '1'] = run.split('*');
      const id = blocks[Number(index)] || '';
      for (let i = 0; i < Number(times) && cells.length < size * size; i++) cells.push(id);
    }
  } else if (Array.isArray(layer?.cells)) {
    cells = layer.cells.slice(0, size * size);
  }
  return Array.from({ length: size * size }, (_, i) => (BLOCKS[cells[i]] ? cells[i] : ''));
}

function encodePlan(plan) {
  const blocks = [''];
  const index = new Map([['', 0]]);
  const pack = cells => {
    const runs = [];
    let prev = -1;
    let times = 0;
    const flush = () => { if (times) runs.push(times > 1 ? `${prev}*${times}` : `${prev}`); };
    for (const id of cells) {
      if (!index.has(id)) { index.set(id, blocks.length); blocks.push(id); }
      const i = index.get(id);
      if (i === prev) times++;
      else { flush(); prev = i; times = 1; }
    }
    flush();
    return runs.join(',');
  };
  const layers = plan.layers.map(layer => ({ rle: pack(layer.cells), trle: pack(terrainOf(layer)) }));
  return { ...plan, blocks, layers };
}

function currentPlan() {
  return state.plans.find(p => p.id === plannerView.planId) || null;
}

function emptyCells(size) {
  return Array(size * size).fill('');
}

function newLayer(size) {
  return { cells: emptyCells(size), terrain: emptyCells(size) };
}

// A layer's terrain (layers made before terrain existed get an empty one).
function terrainOf(layer) {
  if (!layer.terrain || layer.terrain.length !== layer.cells.length) layer.terrain = emptyCells(layer.cells.length);
  return layer.terrain;
}

// The block to start with: the palette's wall block, or oak planks.
function defaultBlock(plan) {
  const palette = PALETTES.find(p => p.id === plan.paletteId);
  return palette ? (palette.blocks.find(([, role]) => /walls/i.test(role)) || palette.blocks[0])[0] : 'oak_planks';
}

function newPlan({ mode = 'blocks', paletteId = '', name = '' } = {}) {
  const palette = PALETTES.find(p => p.id === paletteId);
  const plan = normalizePlan({ id: uid(), mode, name: name || `Build ${state.plans.length + 1}`, paletteId, style: palette?.style || '' });
  state.plans.unshift(plan);
  save();
  openPlan(plan.id);
}

function openPlan(id) {
  const plan = state.plans.find(p => p.id === id);
  Object.assign(plannerView, { planId: plan ? plan.id : null, layer: 0, tool: 'pencil', undo: [], redo: [], search: '', zoom: 1 });
  if (plan) plannerView.block = defaultBlock(plan);
  showTab('planner');
}

function touchPlan(plan) {
  plan.updated = Date.now();
  save();
}

function materials(plan, layers = plan.layers) {
  const counts = new Map();
  for (const layer of layers) for (const id of layer.cells) if (id) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
}

// "130" → "2 stacks + 2", the way you'd gather blocks in the game.
function stacks(n) {
  const full = Math.floor(n / 64);
  const rest = n % 64;
  if (!full) return '';
  return `${full} stack${full === 1 ? '' : 's'}${rest ? ` + ${rest}` : ''}`;
}

function planPhotos(plan) {
  return plan.photoIds.map(id => state.inspiration.items.find(i => i.id === id)).filter(Boolean);
}

function renderPlanner() {
  const plan = currentPlan();
  if (!plan) {
    plannerView.planId = null;
    return renderPlanList();
  }
  return plan.mode === 'simple' ? renderSimplePlan(plan) : renderBlockPlanner(plan);
}

// Redraws pictures that use theme colours (after switching light/dark).
function redrawPlanner() {
  const plan = currentPlan();
  if (plan?.mode === 'blocks') { drawGrid(); draw3d(); } else if (!plan) renderPlanList();
}

// ---------- The list of plans ----------

function renderPlanList() {
  const root = document.getElementById('tab-planner');
  setContent(root,
    sectionHead('Planner', 'Plan your next build. Start simple to decide what to build, or place every block in 3D.'),
    el('div', { class: 'new-plan-choices', id: 'newPlanChoices' },
      el('button', { type: 'button', class: 'card new-plan', id: 'newSimplePlanBtn', onclick: () => newPlan({ mode: 'simple' }) },
        el('span', { class: 'new-plan-icon', 'aria-hidden': 'true' }, '📝'),
        el('strong', {}, 'New simple plan'),
        el('span', { class: 'hint' }, 'Decide what to build: size, style, blocks, inspiration photos and steps.')),
      el('button', { type: 'button', class: 'card new-plan', id: 'newPlanBtn', onclick: () => newPlan({ mode: 'blocks' }) },
        el('span', { class: 'new-plan-icon', 'aria-hidden': 'true' }, '🧊'),
        el('strong', {}, 'New 3D block plan'),
        el('span', { class: 'hint' }, 'Place every block, layer by layer, and turn it around in 3D.'))),
    state.plans.length > 0 && el('h2', { class: 'subhead' }, 'Your plans'),
    el('div', { class: 'card-grid plan-grid' }, ...state.plans.map(planCard)),
  );
}

function planCard(plan) {
  const simple = plan.mode === 'simple';
  const palette = PALETTES.find(p => p.id === plan.paletteId);
  let picture;
  if (simple) {
    picture = el('span', { class: 'plan-preview simple' },
      el('span', { class: 'plan-preview-icon', 'aria-hidden': 'true' }, '📝'),
      palette && el('span', { class: 'plan-preview-blocks' }, ...palette.blocks.map(([id]) => swatch(id, 'big'))));
  } else {
    picture = el('canvas', { class: 'plan-preview', width: 300, height: 300, 'aria-hidden': 'true' });
    renderBuild(picture, plan, { ground: '#dfe8d6', line: 'rgba(0,0,0,0.08)' });
  }
  const total = materials(plan).reduce((sum, [, n]) => sum + n, 0);
  const text = simple
    ? `Simple plan · ${plan.width} × ${plan.depth}, ${plan.floorCount} floor${plan.floorCount === 1 ? '' : 's'}${plan.style ? ` · ${plan.style}` : ''}`
    : `3D plan · ${plan.layers.length} layer${plan.layers.length === 1 ? '' : 's'} · ${total} blocks`;
  return el('button', { type: 'button', class: 'card plan-card', 'data-plan': plan.id, onclick: () => openPlan(plan.id) },
    picture,
    el('span', { class: 'card-body' },
      el('strong', { class: 'card-title' }, plan.name),
      el('span', { class: 'card-text' }, text)));
}

// ---------- Parts shared by both kinds of plan ----------

function planTopBar(plan) {
  return el('div', { class: 'planner-top' },
    el('button', { type: 'button', class: 'btn', id: 'plansBackBtn', onclick: () => { plannerView.planId = null; renderPlanner(); } }, '← All plans'),
    el('input', {
      class: 'input plan-name', id: 'planName', value: plan.name, 'aria-label': 'Plan name',
      onchange: e => { plan.name = e.target.value.trim() || 'My build'; touchPlan(plan); },
    }),
    el('span', { class: 'badge plan-kind' }, plan.mode === 'simple' ? '📝 Simple plan' : '🧊 3D block plan'),
    el('button', { type: 'button', class: 'btn danger', id: 'deletePlanBtn', onclick: () => {
      if (!confirm(`Delete the plan "${plan.name}"? This can't be undone.`)) return;
      state.plans = state.plans.filter(p => p !== plan);
      plannerView.planId = null;
      save();
      renderPlanner();
      toast('Plan deleted.');
    } }, '🗑 Delete'));
}

function todoList(plan) {
  const input = el('input', { class: 'input', id: 'todoInput', placeholder: 'Add a step, e.g. Build the foundation', 'aria-label': 'New to-do' });
  const add = () => {
    const text = input.value.trim();
    if (!text) return;
    plan.todo.push({ id: uid(), text, done: false });
    touchPlan(plan);
    renderPlanner();
    document.getElementById('todoInput').focus();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  return el('div', {},
    el('ul', { class: 'todo' }, ...plan.todo.map(t => el('li', { class: t.done ? 'done' : '' },
      el('label', { class: 'check' }, el('input', {
        type: 'checkbox', checked: t.done,
        onchange: e => { t.done = e.target.checked; touchPlan(plan); renderPlanner(); },
      }), el('span', {}, t.text)),
      el('button', {
        type: 'button', class: 'icon-btn', title: 'Remove', 'aria-label': `Remove ${t.text}`,
        onclick: () => { plan.todo = plan.todo.filter(x => x !== t); touchPlan(plan); renderPlanner(); },
      }, '×')))),
    el('div', { class: 'inline-add' }, input, el('button', { type: 'button', class: 'btn', id: 'todoAddBtn', onclick: add }, 'Add')));
}

function notesBox(plan) {
  return el('textarea', {
    class: 'input', id: 'planNotes', rows: 4, placeholder: 'Ideas, coordinates, what to build next…', 'aria-label': 'Notes',
    oninput: e => { plan.notes = e.target.value; touchPlan(plan); },
  }, plan.notes);
}

// Thumbnails of the plan's inspiration photos, with a button to pick more.
function photoStrip(plan) {
  const photos = planPhotos(plan);
  return el('div', { class: 'plan-photos' },
    photos.length > 0 && el('div', { class: 'photo-strip' }, ...photos.map(item => el('span', { class: 'strip-photo', 'data-photo': item.id },
      el('button', { type: 'button', class: 'photo-btn', title: 'Open bigger', onclick: () => openPhoto(item.id, photos) },
        el('img', { src: getImage(item.imageId), alt: item.note || item.category })),
      el('button', {
        type: 'button', class: 'strip-x', title: 'Take off this plan', 'aria-label': 'Take this photo off the plan',
        onclick: () => { plan.photoIds = plan.photoIds.filter(id => id !== item.id); touchPlan(plan); renderPlanner(); },
      }, '×')))),
    el('button', { type: 'button', class: 'btn small', id: 'pickPhotosBtn', onclick: () => pickPhotos(plan) }, '🖼️ Add photos from Inspiration'));
}

function pickPhotos(plan) {
  const dialog = document.getElementById('photoDialog');
  const items = state.inspiration.items;
  setContent(dialog, el('div', { class: 'dialog-inner' },
    el('header', { class: 'dialog-head' }, el('h2', {}, 'Photos for this plan'), closeButton(dialog)),
    items.length
      ? el('div', {},
        el('p', { class: 'hint' }, 'Tap photos to add them to the plan (or take them off).'),
        el('div', { class: 'pick-grid' }, ...items.map(item => {
          const on = plan.photoIds.includes(item.id);
          return el('button', {
            type: 'button', class: `pick-photo${on ? ' on' : ''}`, 'aria-pressed': String(on), 'data-photo': item.id,
            onclick: () => {
              plan.photoIds = on ? plan.photoIds.filter(id => id !== item.id) : [...plan.photoIds, item.id];
              touchPlan(plan);
              pickPhotos(plan);
            },
          }, el('img', { src: getImage(item.imageId), alt: item.note || item.category }), on && el('span', { class: 'pick-tick' }, '✓'));
        })))
      : el('div', { class: 'empty' }, el('strong', {}, 'No inspiration photos yet.'),
        el('button', { type: 'button', class: 'btn', onclick: () => showTab('inspiration') }, 'Go to Inspiration')),
    el('footer', { class: 'dialog-foot' }, el('span'), el('button', { type: 'button', class: 'btn primary', id: 'pickDoneBtn', onclick: () => dialog.close() }, 'Done'))));
  dialog.onclose = () => { dialog.onclose = null; if (currentTab === 'planner') renderPlanner(); };
  if (!dialog.open) dialog.showModal();
}

// ---------- The simple plan sheet ----------

function renderSimplePlan(plan) {
  const root = document.getElementById('tab-planner');
  const palette = PALETTES.find(p => p.id === plan.paletteId);
  const number = (label, key, max, id) => el('label', { class: 'field small' }, label, el('input', {
    type: 'number', class: 'input', id, min: 1, max, value: plan[key],
    onchange: e => { plan[key] = Math.min(max, Math.max(1, Math.round(Number(e.target.value)) || 1)); touchPlan(plan); renderPlanner(); },
  }));
  // Palettes in the chosen style first.
  const palettes = [...PALETTES].sort((a, b) => (b.style === plan.style) - (a.style === plan.style));

  setContent(root,
    planTopBar(plan),
    el('div', { class: 'simple-plan' },
      el('section', { class: 'panel plan-sheet' },
        el('h3', {}, 'The build'),
        el('div', { class: 'sheet-row' },
          number('Width', 'width', 200, 'planWidth'),
          number('Depth', 'depth', 200, 'planDepth'),
          number('Floors', 'floorCount', 20, 'planFloors')),
        plan.width % 2 === 0 && el('p', { class: 'hint sheet-tip' }, '💡 An odd width lets the door sit right in the middle. ',
          el('button', { type: 'button', class: 'link-btn', onclick: () => openTip('odd-widths') }, 'Why? →')),
        sizePreview(plan),
        el('label', { class: 'field' }, 'Style', el('select', {
          class: 'input', id: 'planStyle',
          onchange: e => { plan.style = e.target.value; touchPlan(plan); renderPlanner(); },
        }, el('option', { value: '' }, 'Not sure yet'), ...PALETTE_STYLES.map(s => el('option', { value: s, selected: s === plan.style }, s)))),
        el('label', { class: 'field' }, 'Block palette', el('select', {
          class: 'input', id: 'planPalette',
          onchange: e => { plan.paletteId = e.target.value; touchPlan(plan); renderPlanner(); },
        }, el('option', { value: '' }, 'Not picked yet'), ...palettes.map(p => el('option', { value: p.id, selected: p.id === plan.paletteId }, `${p.name} (${p.style})`)))),
        palette
          ? el('ul', { class: 'palette-blocks' }, ...palette.blocks.map(([id, role]) => el('li', {},
            swatch(id, 'big'), el('span', { class: 'block-label' }, el('span', {}, blockName(id)), el('span', { class: 'role' }, role)))))
          : el('p', { class: 'hint' }, 'Not sure? Browse the ', el('button', { type: 'button', class: 'link-btn', onclick: () => showTab('palettes') }, 'Palettes tab'), '.')),
      el('div', { class: 'sheet-side' },
        el('section', { class: 'panel' }, el('h3', {}, 'Inspiration'), photoStrip(plan)),
        el('section', { class: 'panel' }, el('h3', {}, 'Steps'), todoList(plan)),
        el('section', { class: 'panel' }, el('h3', {}, 'Notes'), notesBox(plan)))),
    el('div', { class: 'card plan-next' },
      el('div', {},
        el('strong', {}, 'Ready to place blocks?'),
        el('p', { class: 'hint' }, 'Turn this into a 3D block plan. Your notes, steps and photos come with it, and the outline of the build is drawn for you.')),
      el('button', { type: 'button', class: 'btn primary', id: 'toBlocksBtn', onclick: () => toBlockPlan(plan) }, '🧊 Plan the blocks in 3D')),
  );
}

// A rough 3D box of the build's size with its measurements, so the numbers are easy to picture.
// Each floor is 4 blocks (a floor and 3-high walls), plus 1 for a flat roof.
function sizePreview(plan) {
  const w = Math.min(plan.width, 48);
  const d = Math.min(plan.depth, 48);
  const h = plan.floorCount * 4 + 1;
  const n = Math.max(w, d) + 4;
  const palette = PALETTES.find(p => p.id === plan.paletteId);
  const role = (pattern, fallback) => palette?.blocks.find(([, r]) => pattern.test(r))?.[0] || fallback;
  const [base, walls, roof] = [role(/base/i, 'cobblestone'), role(/walls/i, 'oak_planks'), role(/roof/i, 'dark_oak_planks')];
  const x0 = Math.floor((n - w) / 2);
  const z0 = Math.floor((n - d) / 2);
  const box = { size: n, layers: [] };
  for (let y = 0; y < h; y++) {
    const cells = emptyCells(n);
    for (let x = x0; x < x0 + w; x++) {
      for (let z = z0; z < z0 + d; z++) {
        const edge = x === x0 || z === z0 || x === x0 + w - 1 || z === z0 + d - 1;
        const pane = y % 4 === 2 && edge && (x - x0 + z - z0) % 3 === 1;
        if (y === h - 1) cells[z * n + x] = roof;
        else if (y % 4 === 0) cells[z * n + x] = base;
        else if (edge) cells[z * n + x] = pane ? 'glass' : walls;
      }
    }
    box.layers.push({ cells });
  }
  const canvas = el('canvas', { class: 'size-preview', width: 640, height: 360, role: 'img', 'aria-label': `About ${plan.width} wide, ${plan.depth} deep and ${h} high` });
  const dark = document.documentElement.dataset.theme === 'dark';
  renderBuild(canvas, box, {
    sizes: { w: plan.width, d: plan.depth, h }, dpr: 1.4,
    ground: dark ? '#262d22' : '#eef3e8', line: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', markColor: dark ? '#7cb84a' : '#4f7f2c',
    text: dark ? '#e8eee2' : '#1f2a1a', pill: dark ? '#20261d' : '#ffffff',
  });
  return el('figure', { class: 'size-figure' }, canvas,
    el('figcaption', { class: 'hint', id: 'sizeCaption' }, `About ${plan.width} × ${plan.depth} blocks and ${h} high: 4 per floor (a floor and 3-high walls) plus the roof.`));
}

// Turns a simple plan into a 3D block plan, with the build's outline drawn on the first layer.
function toBlockPlan(plan) {
  const size = PLAN_SIZES.find(s => s >= Math.max(plan.width, plan.depth) + 4) || PLAN_SIZES.at(-1);
  plan.mode = 'blocks';
  plan.size = size;
  plan.layers = [newLayer(size)];
  const palette = PALETTES.find(p => p.id === plan.paletteId);
  const base = palette ? (palette.blocks.find(([, role]) => /base/i.test(role)) || palette.blocks[0])[0] : 'cobblestone';
  const w = Math.min(plan.width, size);
  const d = Math.min(plan.depth, size);
  const x0 = Math.floor((size - w) / 2);
  const z0 = Math.floor((size - d) / 2);
  for (let x = x0; x < x0 + w; x++) {
    for (let z = z0; z < z0 + d; z++) {
      if (x === x0 || z === z0 || x === x0 + w - 1 || z === z0 + d - 1) plan.layers[0].cells[z * size + x] = base;
    }
  }
  touchPlan(plan);
  openPlan(plan.id);
  toast(`The ${w} × ${d} outline is on layer 1. Build up from there!`);
}

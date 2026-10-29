'use strict';

// 🧊 The 3D block planner: place blocks one layer (height level) at a time on a grid seen from
// above, with a 3D view beside it that can be turned around. Shape tools, mirroring, a hotbar
// of recent blocks and undo make placing blocks quick. Terrain mode draws what's already in the
// world (ground, water, trees) to plan around, and the ruler measures across and between layers.

// [key, icon, name, shortcut key, what it does]
const BLOCK_TOOLS = [
  ['pencil', '✏️', 'Pencil', 'B', 'Click to place a block, or drag to draw freely.'],
  ['line', '📏', 'Line', 'L', 'Drag to draw a straight line.'],
  ['rect', '⬛', 'Rectangle', 'R', 'Drag to fill a rectangle, like a floor.'],
  ['walls', '🔲', 'Walls', 'W', 'Drag to draw the outline of a rectangle, like the walls of a room.'],
  ['circle', '⭕', 'Circle', 'C', 'Drag from the middle outwards to draw a circle, like a tower.'],
  ['fill', '🪣', 'Fill', 'F', 'Click inside a closed shape to fill it.'],
  ['eraser', '🧽', 'Eraser', 'E', 'Click or drag to remove blocks.'],
  ['picker', '💧', 'Pick block', 'I', 'Click a block on the grid to start using it.'],
  ['ruler', '📐', 'Ruler', 'U', 'Drag to measure, or click one block, change layer, and click another to measure height too.'],
];
const MIRRORS = [['Off', ''], ['Left ↔ right', '↔'], ['Both ways', '✣']];
// Blocks for drawing what's already in the world.
const TERRAIN_BLOCKS = [
  'grass_block', 'dirt', 'coarse_dirt', 'dirt_path', 'stone', 'gravel', 'sand', 'water', 'snow', 'moss_block', 'podzol',
  'andesite', 'granite', 'diorite', 'deepslate', 'oak_log', 'oak_leaves', 'spruce_log', 'spruce_leaves', 'birch_log', 'birch_leaves',
];
const TERRAIN_COVERS = [['grass_block', '🌱 Grass'], ['water', '💧 Water'], ['sand', '🏖️ Sand'], ['stone', '🪨 Stone']];
const GUTTER = 22; // room round the grid for the column and row numbers
let gridStroke = null; // the drag in progress on the grid
let gridHover = null;
let view3dFrame = 0;

// The block being placed (terrain mode has its own).
function activeBlock() {
  return plannerView.terrainMode ? plannerView.terrainBlock : plannerView.block;
}

// The part of a layer being drawn on: the build, or the terrain in terrain mode.
function drawTarget(layer) {
  return plannerView.terrainMode ? terrainOf(layer) : layer.cells;
}

function renderBlockPlanner(plan) {
  const root = document.getElementById('tab-planner');
  const v = plannerView;
  if (v.layer >= plan.layers.length) v.layer = plan.layers.length - 1;
  if (!BLOCKS[v.block]) v.block = defaultBlock(plan);
  const tool = BLOCK_TOOLS.find(t => t[0] === v.tool);
  const block = activeBlock();

  setContent(root,
    planTopBar(plan),
    el('div', { class: `block-planner${v.terrainMode ? ' terrain-mode' : ''}` },
      el('div', { class: 'bp-tools' },
        el('div', { class: 'segmented tool-row', role: 'group', 'aria-label': 'Tools' }, ...BLOCK_TOOLS.map(([key, icon, name, keyName, help]) => el('button', {
          type: 'button', class: v.tool === key ? 'on' : '', 'data-tool': key, 'aria-pressed': String(v.tool === key),
          title: `${name} (${keyName}): ${help}`, 'aria-label': name,
          onclick: () => setTool(key),
        }, el('span', { 'aria-hidden': 'true' }, icon), el('span', { class: 'tool-name' }, name)))),
        el('button', {
          type: 'button', class: `btn${v.mirror ? ' on' : ''}`, id: 'mirrorBtn', title: 'Mirror (M): draw both sides at once, for symmetrical builds',
          onclick: () => { v.mirror = (v.mirror + 1) % MIRRORS.length; renderBlockPlanner(plan); },
        }, `🪞 Mirror: ${MIRRORS[v.mirror][0]}`),
        el('span', { class: 'undo-redo' },
          el('button', { type: 'button', class: 'btn', id: 'undoBtn', disabled: !v.undo.length, title: 'Undo (Ctrl + Z)', onclick: undoBlocks }, '↶ Undo'),
          el('button', { type: 'button', class: 'btn', id: 'redoBtn', disabled: !v.redo.length, title: 'Redo (Ctrl + Y)', onclick: redoBlocks }, '↷ Redo'))),
      el('div', { class: 'bp-hotbar' },
        el('div', { class: 'segmented mode-switch', role: 'group', 'aria-label': 'What you are drawing' },
          el('button', {
            type: 'button', id: 'buildModeBtn', class: v.terrainMode ? '' : 'on', 'aria-pressed': String(!v.terrainMode),
            title: 'Draw the blocks of your build', onclick: () => setTerrainMode(false),
          }, '🏠 Build'),
          el('button', {
            type: 'button', id: 'terrainModeBtn', class: v.terrainMode ? 'on' : '', 'aria-pressed': String(v.terrainMode),
            title: 'Draw what\'s already in your world (ground, water, trees) to plan around. (T)', onclick: () => setTerrainMode(true),
          }, '⛰️ Terrain')),
        el('span', { class: 'current-block' }, swatch(block, 'big'), el('span', {},
          el('span', { class: 'hint' }, v.terrainMode ? 'Placing terrain' : 'Placing'), el('strong', {}, blockName(block)))),
        v.recent.length > 1 && el('span', { class: 'hotbar', role: 'group', 'aria-label': 'Recent blocks' }, ...v.recent.map((id, i) => el('button', {
          type: 'button', class: `hotbar-slot${id === block ? ' on' : ''}`, 'data-block': id, title: `${blockName(id)} (${i + 1})`,
          onclick: () => setBlock(id),
        }, swatch(id, 'big'), el('span', { class: 'hotbar-key' }, i + 1))))),
      el('section', { class: 'panel bp-blocks' }, blocksPanel(plan)),
      el('section', { class: 'bp-pane bp-grid' },
        el('div', { class: 'pane-head' }, el('strong', {}, `Layer ${v.layer + 1}`), el('span', { class: 'hint' }, 'seen from above')),
        el('div', { class: 'canvas-wrap', id: 'canvasWrap' }, el('canvas', { id: 'planCanvas', 'aria-label': `Layer ${v.layer + 1}, seen from above` })),
        el('div', { class: 'plan-status', id: 'planStatus' }, statusText(tool)),
        layerBar(plan)),
      el('section', { class: 'bp-pane bp-view' },
        el('div', { class: 'pane-head' }, el('strong', {}, '3D view'), el('span', { class: 'hint' }, 'drag to turn, scroll to zoom')),
        el('div', { class: 'view-wrap', id: 'viewWrap' }, el('canvas', { id: 'view3d', 'aria-label': '3D view of the build. Drag to turn it.' })),
        el('div', { class: 'view-bar' },
          el('button', { type: 'button', class: 'btn small', id: 'turnLeftBtn', title: 'Turn left', onclick: () => turnView(-Math.PI / 4) }, '⟲'),
          el('button', { type: 'button', class: 'btn small', id: 'turnRightBtn', title: 'Turn right', onclick: () => turnView(Math.PI / 4) }, '⟳'),
          el('button', { type: 'button', class: 'btn small', title: 'Zoom in', onclick: () => zoomView(1.25) }, '＋'),
          el('button', { type: 'button', class: 'btn small', title: 'Zoom out', onclick: () => zoomView(0.8) }, '－'),
          el('button', { type: 'button', class: 'btn small', id: 'resetViewBtn', title: 'Back to the starting view', onclick: resetView }, 'Reset')),
        el('div', { class: 'view-bar' },
          viewOption('sizesBox', 'sizes', 'Show sizes'),
          viewOption('cutAwayBox', 'cutAway', 'Hide layers above'),
          viewOption('hideTerrainBox', 'hideTerrain', 'Hide terrain')))),
    el('div', { class: 'plan-extras' },
      el('section', { class: 'panel', id: 'materials' }),
      el('section', { class: 'panel' }, el('h3', {}, 'Steps'), todoList(plan)),
      el('section', { class: 'panel' }, el('h3', {}, 'Notes'), notesBox(plan), el('h3', {}, 'Inspiration'), photoStrip(plan))),
  );

  setupGrid(plan);
  setup3d();
  renderMaterials(plan);
}

function viewOption(id, key, label) {
  return el('label', { class: 'check small' }, el('input', {
    type: 'checkbox', id, checked: plannerView[key],
    onchange: e => { plannerView[key] = e.target.checked; draw3d(); },
  }), ` ${label}`);
}

function statusText(tool) {
  const v = plannerView;
  if (v.tool === 'ruler' && v.measure?.a) {
    return v.measure.b ? `📐 ${measureText(v.measure.a, v.measure.b)}` : `📐 Now click the second block (you can change layer first). Esc to cancel.`;
  }
  return `${v.terrainMode && v.tool !== 'ruler' ? '⛰️ Terrain: ' : ''}${tool[1]} ${tool[4]}`;
}

function setTool(key) {
  plannerView.tool = key;
  if (key !== 'ruler') plannerView.measure = null;
  renderPlanner();
}

function setTerrainMode(on) {
  plannerView.terrainMode = on;
  if (plannerView.tool === 'ruler' || plannerView.tool === 'picker') plannerView.tool = 'pencil';
  plannerView.measure = null;
  plannerView.search = '';
  renderPlanner();
  if (on) toast('Terrain mode: draw what\'s already in your world. It isn\'t counted in Blocks needed.');
}

function setBlock(id) {
  const v = plannerView;
  if (v.terrainMode) v.terrainBlock = id;
  else v.block = id;
  v.recent = [id, ...v.recent.filter(x => x !== id)].slice(0, 9);
  if (['eraser', 'picker', 'ruler'].includes(v.tool)) { v.tool = 'pencil'; v.measure = null; }
  renderPlanner();
}

function blocksPanel(plan) {
  const v = plannerView;
  const palette = PALETTES.find(p => p.id === plan.paletteId);
  const find = el('input', {
    type: 'search', class: 'input', id: 'blockFind', placeholder: palette || v.terrainMode ? 'Find any block…' : 'Find a block…', value: v.search,
    'aria-label': 'Find a block',
    oninput: e => { v.search = e.target.value; setContent(document.getElementById('blockTray'), trayItems(plan)); },
  });
  if (v.terrainMode) {
    return [
      el('h3', {}, '⛰️ Terrain'),
      el('p', { class: 'hint' }, 'Draw the ground, water and trees that are already there, then switch back to Build and plan around them.'),
      el('div', { class: 'cover-row' }, el('span', { class: 'hint' }, 'Cover this layer with:'),
        ...TERRAIN_COVERS.map(([id, label]) => el('button', {
          type: 'button', class: 'btn small', 'data-cover': id, onclick: () => coverLayer(plan, id),
        }, label))),
      find,
      el('div', { class: 'tray', id: 'blockTray' }, trayItems(plan)),
    ];
  }
  return [
    el('h3', {}, 'Blocks'),
    el('select', {
      class: 'input', id: 'planPalette', 'aria-label': 'Which blocks to show',
      onchange: e => {
        plan.paletteId = e.target.value;
        touchPlan(plan);
        if (plan.paletteId) setBlock(defaultBlock(plan));
        else renderPlanner();
      },
    },
      el('option', { value: '' }, 'All blocks'),
      ...PALETTES.map(p => el('option', { value: p.id, selected: p.id === plan.paletteId }, `Palette: ${p.name}`))),
    find,
    el('div', { class: 'tray', id: 'blockTray' }, trayItems(plan)),
  ];
}

// The palette's blocks (with their jobs), terrain blocks, every block by group, or the ones
// matching the search.
function trayItems(plan) {
  const v = plannerView;
  const find = v.search.trim().toLowerCase();
  const palette = PALETTES.find(p => p.id === plan.paletteId);
  const current = activeBlock();
  const item = (id, role = '') => el('button', {
    type: 'button', class: `tray-block${id === current ? ' on' : ''}`, 'data-block': id, 'aria-pressed': String(id === current),
    onclick: () => setBlock(id),
  }, swatch(id, 'big'), el('span', { class: 'block-label' }, el('span', {}, blockName(id)), role && el('span', { class: 'role' }, role)));
  if (find) {
    const found = BLOCK_LIST.filter(([, name]) => name.toLowerCase().includes(find));
    return found.length ? found.map(([id]) => item(id)) : [el('p', { class: 'hint' }, 'No blocks match.')];
  }
  if (v.terrainMode) return TERRAIN_BLOCKS.map(id => item(id));
  if (palette) return palette.blocks.map(([id, role]) => item(id, role));
  return BLOCK_GROUPS.flatMap(group => [el('span', { class: 'tray-group' }, group), ...BLOCK_LIST.filter(b => b[4] === group).map(([id]) => item(id))]);
}

// Fills the whole layer's terrain with one block (e.g. flat grass or a lake).
function coverLayer(plan, id) {
  pushUndo(plan, 'layer');
  terrainOf(plan.layers[plannerView.layer]).fill(id);
  afterChange(plan);
  toast(`Layer ${plannerView.layer + 1} covered with ${blockName(id).toLowerCase()}.`, { label: 'Undo', run: undoBlocks });
}

function layerBar(plan) {
  const v = plannerView;
  const last = plan.layers.length - 1;
  const full = plan.layers.length >= MAX_LAYERS;
  const layer = plan.layers[v.layer];
  return el('div', { class: 'layer-bar' },
    el('span', { class: 'layer-step' },
      el('button', { type: 'button', class: 'btn small', id: 'layerDownBtn', disabled: v.layer === 0, title: 'Layer below ([)', onclick: () => goLayer(v.layer - 1) }, '▼'),
      el('strong', { id: 'layerLabel' }, `Layer ${v.layer + 1} of ${plan.layers.length}`),
      el('button', { type: 'button', class: 'btn small', id: 'layerUpBtn', disabled: v.layer === last, title: 'Layer above (])', onclick: () => goLayer(v.layer + 1) }, '▲')),
    el('button', { type: 'button', class: 'btn small', id: 'addLayerBtn', disabled: full, title: 'Add an empty layer above this one', onclick: () => addLayer(plan, 'above') }, '+ New layer above'),
    el('button', {
      type: 'button', class: 'btn small', id: 'copyLayerBtn', disabled: full, onclick: () => addLayer(plan, 'copy'),
      title: v.terrainMode ? 'Add a layer above with a copy of this layer\'s terrain (for hills and cliffs)' : 'Add a layer above with a copy of this layer\'s blocks (great for walls)',
    }, '⧉ Copy layer up'),
    el('details', { class: 'more-menu' },
      el('summary', { class: 'btn small' }, 'More ▾'),
      el('div', { class: 'more-items' },
        el('label', { class: 'check' }, el('input', {
          type: 'checkbox', checked: v.ghost, id: 'ghostBox',
          onchange: e => { v.ghost = e.target.checked; drawGrid(); },
        }), ' Show the layer below faintly'),
        el('label', {}, 'Grid size ', el('select', {
          class: 'input small', id: 'planSize', onchange: e => resizePlan(plan, Number(e.target.value)),
        }, ...PLAN_SIZES.map(s => el('option', { value: s, selected: s === plan.size }, `${s} × ${s}`)))),
        el('button', { type: 'button', class: 'btn small', id: 'addLayerBelowBtn', disabled: full, title: 'For ground or water under your build', onclick: () => addLayer(plan, 'below') }, '+ New layer below'),
        el('button', { type: 'button', class: 'btn small', id: 'clearLayerBtn', onclick: () => {
          const target = drawTarget(layer);
          if (!target.some(Boolean)) return;
          pushUndo(plan, 'layer');
          target.fill('');
          afterChange(plan, true);
          toast(v.terrainMode ? 'Terrain cleared from this layer.' : 'Layer cleared.', { label: 'Undo', run: undoBlocks });
        } }, v.terrainMode ? 'Clear terrain on this layer' : 'Clear this layer'),
        plan.layers.length > 1 && el('button', { type: 'button', class: 'btn small danger', id: 'deleteLayerBtn', onclick: () => {
          pushUndo(plan, 'all');
          plan.layers.splice(v.layer, 1);
          v.layer = Math.max(0, v.layer - 1);
          v.measure = null;
          afterChange(plan, true);
          toast('Layer deleted.', { label: 'Undo', run: undoBlocks });
        } }, 'Delete this layer'))));
}

function goLayer(n) {
  const plan = currentPlan();
  if (!plan || n < 0 || n >= plan.layers.length) return;
  plannerView.layer = n;
  renderBlockPlanner(plan);
}

// where: 'above' (empty), 'copy' (above, with a copy of what's being drawn: the build, or the
// terrain in terrain mode) or 'below' (empty, under this one).
function addLayer(plan, where) {
  if (plan.layers.length >= MAX_LAYERS) return;
  pushUndo(plan, 'all');
  const layer = plan.layers[plannerView.layer];
  const added = newLayer(plan.size);
  if (where === 'copy') {
    if (plannerView.terrainMode) added.terrain = [...terrainOf(layer)];
    else added.cells = [...layer.cells];
  }
  if (where === 'below') {
    plan.layers.splice(plannerView.layer, 0, added);
    // The ruler's points stay on the same blocks.
    for (const p of [plannerView.measure?.a, plannerView.measure?.b]) if (p && p.y >= plannerView.layer) p.y++;
  } else {
    plan.layers.splice(plannerView.layer + 1, 0, added);
    plannerView.layer++;
  }
  afterChange(plan, true);
}

function resizePlan(plan, size) {
  const outside = cells => cells.some((id, i) => id && (i % plan.size >= size || Math.floor(i / plan.size) >= size));
  const lost = plan.layers.some(l => outside(l.cells) || outside(terrainOf(l)));
  if (lost && !confirm(`Make the grid ${size} × ${size}? Blocks outside it will be removed.`)) {
    renderBlockPlanner(plan);
    return;
  }
  pushUndo(plan, 'all');
  const resized = old => {
    const cells = emptyCells(size);
    for (let z = 0; z < Math.min(size, plan.size); z++) {
      for (let x = 0; x < Math.min(size, plan.size); x++) cells[z * size + x] = old[z * plan.size + x];
    }
    return cells;
  };
  for (const layer of plan.layers) {
    layer.terrain = resized(terrainOf(layer));
    layer.cells = resized(layer.cells);
  }
  plan.size = size;
  plannerView.measure = null;
  afterChange(plan, true);
}

function renderMaterials(plan) {
  const box = document.getElementById('materials');
  if (!box) return;
  const list = materials(plan);
  const total = list.reduce((sum, [, n]) => sum + n, 0);
  const onLayer = plan.layers[plannerView.layer]?.cells.filter(Boolean).length || 0;
  const size = buildBox(plan);
  const hasTerrain = plan.layers.some(l => terrainOf(l).some(Boolean));
  setContent(box,
    el('h3', {}, 'Blocks needed'),
    list.length
      ? el('ul', { class: 'materials' },
        ...list.map(([id, n]) => el('li', { 'data-block': id },
          swatch(id), el('span', { class: 'mat-name' }, blockName(id)),
          el('span', { class: 'mat-count' }, el('strong', {}, n), stacks(n) && el('span', { class: 'hint' }, ` (${stacks(n)})`)))),
        el('li', { class: 'mat-total' }, el('span', {}, 'Total'), el('strong', {}, total)),
        el('li', { class: 'hint', id: 'layerCount' }, `${onLayer} on layer ${plannerView.layer + 1}`))
      : el('p', { class: 'hint' }, 'Place blocks and the ones you need show up here.'),
    size && el('p', { class: 'size-readout', id: 'sizeReadout' },
      `📐 Build size: ${size.x1 - size.x0 + 1} wide × ${size.z1 - size.z0 + 1} deep × ${size.y1 - size.y0 + 1} high`),
    hasTerrain && el('p', { class: 'hint' }, '⛰️ Terrain isn\'t counted: it\'s already there.'));
}

// ---------- Changing blocks ----------

const copyLayers = plan => plan.layers.map(l => ({ cells: [...l.cells], terrain: [...terrainOf(l)] }));

// Keeps a copy from before a change, for Undo: one layer, or every layer for bigger changes.
function pushUndo(plan, kind) {
  const v = plannerView;
  v.undo.push(snapshotLike(plan, { kind, layer: v.layer }));
  if (v.undo.length > 40) v.undo.shift();
}

function snapshotLike(plan, entry) {
  if (entry.kind === 'all') return { kind: 'all', layer: plannerView.layer, size: plan.size, layers: copyLayers(plan) };
  const layer = plan.layers[entry.layer];
  return { kind: 'layer', layer: entry.layer, cells: [...layer.cells], terrain: [...terrainOf(layer)] };
}

function restore(plan, entry) {
  if (entry.kind === 'all') {
    plan.size = entry.size;
    plan.layers = entry.layers.map(l => ({ cells: [...l.cells], terrain: [...l.terrain] }));
  } else if (plan.layers[entry.layer]) {
    plan.layers[entry.layer].cells = [...entry.cells];
    plan.layers[entry.layer].terrain = [...entry.terrain];
  }
  plannerView.layer = Math.min(entry.layer, plan.layers.length - 1);
}

function undoBlocks() {
  const plan = currentPlan();
  const entry = plannerView.undo.pop();
  if (!plan || !entry) return;
  plannerView.redo.push(snapshotLike(plan, entry));
  restore(plan, entry);
  touchPlan(plan);
  renderBlockPlanner(plan);
}

function redoBlocks() {
  const plan = currentPlan();
  const entry = plannerView.redo.pop();
  if (!plan || !entry) return;
  plannerView.undo.push(snapshotLike(plan, entry));
  restore(plan, entry);
  touchPlan(plan);
  renderBlockPlanner(plan);
}

// After a change: drop an undo step that changed nothing, save, and redraw.
function afterChange(plan, rebuild = false) {
  const v = plannerView;
  const last = v.undo.at(-1);
  const layer = last?.kind === 'layer' && plan.layers[last.layer];
  const same = (a, b) => a.every((id, i) => id === b[i]);
  if (layer && same(last.cells, layer.cells) && same(last.terrain, terrainOf(layer))) v.undo.pop();
  else v.redo = [];
  touchPlan(plan);
  if (rebuild) return renderBlockPlanner(plan);
  drawGrid();
  schedule3d();
  renderMaterials(plan);
  document.getElementById('undoBtn').disabled = !v.undo.length;
  document.getElementById('redoBtn').disabled = !v.redo.length;
}

// The squares a shape covers, from where the drag started (a) to where it is now (b).
function shapeCells(tool, a, b) {
  const out = [];
  const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [z0, z1] = [Math.min(a.z, b.z), Math.max(a.z, b.z)];
  if (tool === 'line') {
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.z - a.z));
    for (let s = 0; s <= steps; s++) {
      const t = steps ? s / steps : 0;
      out.push({ x: Math.round(a.x + (b.x - a.x) * t), z: Math.round(a.z + (b.z - a.z) * t) });
    }
  } else if (tool === 'rect' || tool === 'walls') {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        if (tool === 'rect' || x === x0 || x === x1 || z === z0 || z === z1) out.push({ x, z });
      }
    }
  } else if (tool === 'circle') {
    const r = Math.round(Math.hypot(b.x - a.x, b.z - a.z));
    for (let x = a.x - r; x <= a.x + r; x++) {
      for (let z = a.z - r; z <= a.z + r; z++) {
        if (Math.round(Math.hypot(x - a.x, z - a.z)) === r) out.push({ x, z });
      }
    }
  }
  return out;
}

// Adds the mirrored copies of each square (when Mirror is on) and drops squares off the grid.
function withMirror(cells, n) {
  const m = plannerView.mirror;
  const all = [];
  for (const c of cells) {
    all.push(c);
    if (m >= 1) all.push({ x: n - 1 - c.x, z: c.z });
    if (m === 2) all.push({ x: c.x, z: n - 1 - c.z }, { x: n - 1 - c.x, z: n - 1 - c.z });
  }
  return all.filter(c => c.x >= 0 && c.z >= 0 && c.x < n && c.z < n);
}

function placeCells(plan, cells, value) {
  const target = drawTarget(plan.layers[plannerView.layer]);
  for (const { x, z } of withMirror(cells, plan.size)) target[z * plan.size + x] = value;
}

function fillFrom(plan, start, value) {
  const cells = drawTarget(plan.layers[plannerView.layer]);
  const n = plan.size;
  for (const s of withMirror([start], n)) {
    const target = cells[s.z * n + s.x];
    if (target === value) continue;
    const queue = [s.z * n + s.x];
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
}

// ---------- The layer grid ----------

function gridCellSize(plan, wrap) {
  // As big as fits the pane and (on big screens) the window height, within limits.
  const fitHeight = window.innerWidth > 760 ? (window.innerHeight - 300) / plan.size : Infinity;
  return Math.max(6, Math.min(28, Math.floor(Math.min(((wrap.clientWidth || 500) - GUTTER) / plan.size, fitHeight))));
}

function setupGrid(plan) {
  const canvas = document.getElementById('planCanvas');
  const wrap = document.getElementById('canvasWrap');
  canvas.width = canvas.height = GUTTER + gridCellSize(plan, wrap) * plan.size;
  const status = document.getElementById('planStatus');
  const v = plannerView;

  const cellAt = e => {
    const r = canvas.getBoundingClientRect();
    const cell = (canvas.width - GUTTER) / plan.size;
    const x = Math.floor((((e.clientX - r.left) / r.width) * canvas.width - GUTTER) / cell);
    const z = Math.floor((((e.clientY - r.top) / r.height) * canvas.height - GUTTER) / cell);
    return x >= 0 && z >= 0 && x < plan.size && z < plan.size ? { x, z } : null;
  };
  const cellId = c => {
    const layer = plan.layers[v.layer];
    const i = c.z * plan.size + c.x;
    return layer.cells[i] || terrainOf(layer)[i];
  };
  const showStatus = () => { status.textContent = statusText(BLOCK_TOOLS.find(t => t[0] === v.tool)); };

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    const c = cellAt(e);
    if (!c) return;
    e.preventDefault();
    if (v.tool === 'ruler') {
      const point = { x: c.x, y: v.layer, z: c.z };
      // A second click finishes a measurement started with a click (maybe on another layer).
      if (v.measure?.a && !v.measure.b && v.measure.waiting) v.measure = { a: v.measure.a, b: point };
      else v.measure = { a: point, b: null, dragging: true };
      canvas.setPointerCapture(e.pointerId);
      showStatus();
      drawGrid();
      schedule3d();
      return;
    }
    if (v.tool === 'picker' || e.altKey) {
      const id = cellId(c);
      if (id) { setBlock(id); toast(`Now placing ${blockName(id)}.`); }
      return;
    }
    const erase = e.button === 2 || v.tool === 'eraser';
    pushUndo(plan, 'layer');
    if (v.tool === 'fill') {
      fillFrom(plan, c, erase ? '' : activeBlock());
      afterChange(plan);
      return;
    }
    const shape = ['line', 'rect', 'walls', 'circle'].includes(v.tool) ? v.tool : null;
    gridStroke = { shape, value: erase ? '' : activeBlock(), start: c, last: c, preview: [] };
    canvas.setPointerCapture(e.pointerId);
    if (shape) gridStroke.preview = withMirror(shapeCells(shape, c, c), plan.size);
    else placeCells(plan, [c], gridStroke.value);
    drawGrid();
    schedule3d();
  });
  canvas.addEventListener('pointermove', e => {
    const c = cellAt(e);
    gridHover = c;
    if (v.measure?.dragging && c) {
      const { a } = v.measure;
      v.measure.b = c.x === a.x && c.z === a.z ? null : { x: c.x, y: v.layer, z: c.z };
      showStatus();
      schedule3d();
    } else if (c && v.tool !== 'ruler') {
      const id = cellId(c);
      status.textContent = `Column ${c.x + 1}, row ${c.z + 1}${id ? ` · ${blockName(id)}` : ''}`;
    }
    if (gridStroke && c) {
      if (gridStroke.shape) {
        gridStroke.preview = withMirror(shapeCells(gridStroke.shape, gridStroke.start, c), plan.size);
        const { start } = gridStroke;
        status.textContent = gridStroke.shape === 'circle'
          ? `Circle ${Math.round(Math.hypot(c.x - start.x, c.z - start.z)) * 2 + 1} blocks across`
          : `${Math.abs(c.x - start.x) + 1} × ${Math.abs(c.z - start.z) + 1} blocks`;
      } else {
        // Fill in the gap when the mouse moves fast.
        placeCells(plan, shapeCells('line', gridStroke.last, c), gridStroke.value);
        schedule3d();
      }
      gridStroke.last = c;
    }
    drawGrid();
  });
  const end = () => {
    if (v.measure?.dragging) {
      // A click without dragging waits for a second click.
      v.measure.dragging = false;
      v.measure.waiting = !v.measure.b;
      showStatus();
      return;
    }
    if (!gridStroke) return;
    if (gridStroke.shape) placeCells(plan, gridStroke.preview, gridStroke.value);
    gridStroke = null;
    afterChange(plan);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { gridHover = null; if (!gridStroke) drawGrid(); });
  drawGrid();
}

function drawGrid() {
  const plan = currentPlan();
  const canvas = document.getElementById('planCanvas');
  if (!plan || plan.mode !== 'blocks' || !canvas) return;
  const v = plannerView;
  const ctx = canvas.getContext('2d');
  const n = plan.size;
  const G = GUTTER;
  const cell = (canvas.width - G) / n;
  const css = getComputedStyle(document.documentElement);
  const color = name => css.getPropertyValue(name);
  const at = i => [G + (i % n) * cell, G + Math.floor(i / n) * cell];
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color('--plan-bg');
  ctx.fillRect(G, G, canvas.width - G, canvas.height - G);
  const drawCells = (cells, alpha = 1) => {
    ctx.globalAlpha = alpha;
    cells.forEach((id, i) => { if (id) ctx.drawImage(blockCanvas(id), ...at(i), cell, cell); });
    ctx.globalAlpha = 1;
  };
  const layer = plan.layers[v.layer];
  const terrain = terrainOf(layer);
  if (v.ghost && v.layer > 0) {
    const below = plan.layers[v.layer - 1];
    drawCells(below.cells.map((id, i) => id || terrainOf(below)[i]), 0.25);
  }
  // Terrain gets stripes, so it's easy to tell from the build. In terrain mode the build is faded.
  drawCells(terrain.map((id, i) => (layer.cells[i] && !v.terrainMode ? '' : id)));
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  terrain.forEach((id, i) => {
    if (!id || (layer.cells[i] && !v.terrainMode)) return;
    const [x, y] = at(i);
    ctx.moveTo(x, y + cell * 0.6); ctx.lineTo(x + cell * 0.6, y);
    ctx.moveTo(x + cell * 0.4, y + cell); ctx.lineTo(x + cell, y + cell * 0.4);
  });
  ctx.stroke();
  drawCells(layer.cells, v.terrainMode ? 0.35 : 1);
  // The shape being dragged out, before it's placed.
  if (gridStroke?.shape) {
    ctx.globalAlpha = 0.65;
    for (const { x, z } of gridStroke.preview) {
      if (gridStroke.value) ctx.drawImage(blockCanvas(gridStroke.value), G + x * cell, G + z * cell, cell, cell);
      else { ctx.fillStyle = 'rgba(200,40,40,0.5)'; ctx.fillRect(G + x * cell, G + z * cell, cell, cell); }
    }
    ctx.globalAlpha = 1;
  }
  // Grid lines, with a stronger line every 5 blocks to make counting easy.
  for (let i = 0; i <= n; i++) {
    ctx.fillStyle = color(i % 5 === 0 ? '--plan-line-strong' : '--plan-line');
    const p = Math.min(G + Math.round(i * cell), canvas.width - 1);
    ctx.fillRect(p, G, 1, canvas.height - G);
    ctx.fillRect(G, p, canvas.width - G, 1);
  }
  // Column and row numbers along the edges (1, 5, 10, …), with the one under the mouse lit up.
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const mid = G + (i + 0.5) * cell;
    for (const [axis, x, y] of [['x', mid, G / 2], ['z', G / 2, mid]]) {
      const lit = gridHover && gridHover[axis] === i;
      if (lit) {
        ctx.fillStyle = color('--primary');
        ctx.fillRect(axis === 'x' ? G + i * cell : 0, axis === 'x' ? 0 : G + i * cell, axis === 'x' ? cell : G, axis === 'x' ? G : cell);
      }
      if (lit || i === 0 || (i + 1) % 5 === 0) {
        ctx.fillStyle = lit ? color('--on-primary') : color('--muted');
        ctx.fillText(String(i + 1), x, y);
      }
    }
  }
  // Where the mirror folds.
  if (v.mirror) {
    const mid = G + (canvas.width - G) / 2;
    ctx.strokeStyle = color('--primary');
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(mid, G); ctx.lineTo(mid, canvas.height);
    if (v.mirror === 2) { ctx.moveTo(G, mid); ctx.lineTo(canvas.width, mid); }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // The ruler: its ends (on this layer) and the line between them.
  const m = v.tool === 'ruler' && v.measure;
  if (m?.a) {
    ctx.strokeStyle = color('--primary');
    ctx.fillStyle = color('--primary');
    ctx.lineWidth = 3;
    const centre = p => [G + (p.x + 0.5) * cell, G + (p.z + 0.5) * cell];
    if (m.b && m.a.y === v.layer && m.b.y === v.layer) {
      ctx.beginPath(); ctx.moveTo(...centre(m.a)); ctx.lineTo(...centre(m.b)); ctx.stroke();
    }
    for (const p of [m.a, m.b]) {
      if (!p) continue;
      const [x, y] = centre(p);
      ctx.globalAlpha = p.y === v.layer ? 1 : 0.4;
      ctx.beginPath(); ctx.arc(x, y, Math.max(3, cell / 3), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  if (gridHover && !gridStroke && v.tool !== 'ruler') {
    ctx.strokeStyle = color('--primary');
    ctx.lineWidth = 2;
    for (const { x, z } of withMirror([gridHover], n)) ctx.strokeRect(G + x * cell + 1, G + z * cell + 1, cell - 2, cell - 2);
  }
}

// ---------- The 3D view ----------

function setup3d() {
  const canvas = document.getElementById('view3d');
  const v = plannerView;
  sizeView();
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    v.yaw += (e.clientX - drag.x) * 0.01;
    v.pitch = Math.min(1.5, Math.max(0.05, v.pitch + (e.clientY - drag.y) * 0.01));
    drag = { x: e.clientX, y: e.clientY };
    schedule3d();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('dblclick', resetView);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoomView(Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
}

// The 3D view is as tall as the grid next to it, and sharp on high-resolution screens.
function sizeView() {
  const canvas = document.getElementById('view3d');
  const wrap = document.getElementById('viewWrap');
  const grid = document.getElementById('planCanvas');
  if (!canvas || !wrap) return;
  const ratio = window.devicePixelRatio || 1;
  const w = wrap.clientWidth || 400;
  const h = Math.max(240, Math.min(w, grid?.width || w));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  draw3d();
}

function schedule3d() {
  if (!view3dFrame) view3dFrame = requestAnimationFrame(() => { view3dFrame = 0; draw3d(); });
}

// The options for drawing the plan in the 3D view, from the view settings and the theme.
function view3dOptions() {
  const v = plannerView;
  const css = getComputedStyle(document.documentElement);
  return {
    yaw: v.yaw, pitch: v.pitch, zoom: v.zoom, upTo: v.cutAway ? v.layer : Infinity, mark: v.layer,
    hideTerrain: v.hideTerrain, sizes: v.sizes, measure: v.tool === 'ruler' ? v.measure : null, dpr: window.devicePixelRatio || 1,
    ground: css.getPropertyValue('--plan-bg'), line: css.getPropertyValue('--plan-line-strong'), markColor: css.getPropertyValue('--primary'),
    text: css.getPropertyValue('--text'), pill: css.getPropertyValue('--surface'),
  };
}

function draw3d() {
  const plan = currentPlan();
  const canvas = document.getElementById('view3d');
  if (!plan || plan.mode !== 'blocks' || !canvas) return;
  renderBuild(canvas, plan, view3dOptions());
}

function turnView(angle) {
  plannerView.yaw += angle;
  draw3d();
}

function zoomView(factor) {
  plannerView.zoom = Math.min(5, Math.max(0.4, plannerView.zoom * factor));
  schedule3d();
}

function resetView() {
  Object.assign(plannerView, { yaw: -0.7, pitch: 0.6, zoom: 1 });
  draw3d();
}

// ---------- Keyboard shortcuts ----------

document.addEventListener('keydown', e => {
  const plan = currentPlan();
  if (currentTab !== 'planner' || plan?.mode !== 'blocks' || document.querySelector('dialog[open]') || tour) return;
  if (e.target.closest?.('input, textarea, select')) return;
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); return e.shiftKey ? redoBlocks() : undoBlocks(); }
  if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); return redoBlocks(); }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (key === 'escape' && plannerView.measure) { plannerView.measure = null; return renderBlockPlanner(plan); }
  const tool = BLOCK_TOOLS.find(t => t[3].toLowerCase() === key);
  if (tool) return setTool(tool[0]);
  if (key === 't') return setTerrainMode(!plannerView.terrainMode);
  if (key === 'm') { plannerView.mirror = (plannerView.mirror + 1) % MIRRORS.length; return renderBlockPlanner(plan); }
  if (key === ']' || e.key === 'PageUp') { e.preventDefault(); return goLayer(plannerView.layer + 1); }
  if (key === '[' || e.key === 'PageDown') { e.preventDefault(); return goLayer(plannerView.layer - 1); }
  if (/^[1-9]$/.test(key) && plannerView.recent[Number(key) - 1]) return setBlock(plannerView.recent[Number(key) - 1]);
});

window.addEventListener('resize', () => {
  const plan = currentPlan();
  if (currentTab !== 'planner' || plan?.mode !== 'blocks') return;
  const canvas = document.getElementById('planCanvas');
  const size = GUTTER + gridCellSize(plan, document.getElementById('canvasWrap')) * plan.size;
  if (canvas.width !== size) { canvas.width = canvas.height = size; drawGrid(); }
  sizeView();
});

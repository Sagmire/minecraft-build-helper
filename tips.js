'use strict';

// 📘 Learn tab: the tip cards, and the window that opens with the full lesson.

const learnView = { topic: 'All' };

// Draws a tip picture (rows of letters, see TIP_LEGEND) onto a canvas.
function tipPicture(grid, { view = 'front', label = '' } = {}) {
  const cell = 16;
  const canvas = el('canvas', { class: 'tip-picture', width: grid[0].length * cell, height: grid.length * cell, role: 'img', 'aria-label': label });
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (view === 'front') {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#8fc4f2');
    sky.addColorStop(1, '#cfe8fb');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    if (ch === 'z') {
      ctx.fillStyle = '#2a2f36';
      ctx.fillRect(x * cell, y * cell, cell, cell);
      return;
    }
    const id = TIP_LEGEND[ch];
    if (!id) return;
    // Glass shows a dim room behind it.
    if (BLOCKS[id].kind === 'glass') {
      ctx.fillStyle = '#4b5a68';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
    ctx.drawImage(blockCanvas(id), x * cell, y * cell, cell, cell);
  }));
  return canvas;
}

// A little cottage by a pond for the banner, built from blocks the way a plan is (made once).
let heroPlan = null;
function heroScene() {
  if (heroPlan) return heroPlan;
  const n = 14;
  const layers = Array.from({ length: 9 }, () => ({ cells: Array(n * n).fill(''), terrain: Array(n * n).fill('') }));
  const put = (y, x, z, id, part = 'cells') => { layers[y][part][z * n + x] = id; };
  for (let x = 0; x < n; x++) {
    for (let z = 0; z < n; z++) {
      const pond = Math.hypot(x - 1.5, z - 12) < 2.6;
      const path = z >= 10 && (x === 6 || x === 7 - (z % 2));
      put(0, x, z, pond ? 'water' : path ? 'dirt_path' : 'grass_block', 'terrain');
    }
  }
  for (let x = 3; x <= 10; x++) for (let z = 3; z <= 9; z++) put(0, x, z, x === 3 || x === 10 || z === 3 || z === 9 ? 'cobblestone' : 'spruce_planks');
  for (let y = 1; y <= 3; y++) {
    for (let x = 3; x <= 10; x++) {
      for (let z = 3; z <= 9; z++) {
        if (!(x === 3 || x === 10 || z === 3 || z === 9)) continue;
        const corner = (x === 3 || x === 10) && (z === 3 || z === 9);
        const pane = y === 2 && !corner && ((z === 9 && (x === 4 || x === 9)) || (x === 3 && z === 6) || (x === 10 && z === 6) || (z === 3 && x === 6));
        put(y, x, z, corner || y === 3 ? 'spruce_log' : pane ? 'glass' : 'oak_planks');
      }
    }
  }
  put(1, 6, 9, ''); put(2, 6, 9, '');
  put(2, 7, 10, 'lantern');
  for (let k = 0; k < 4; k++) {
    for (let x = 2; x <= 11; x++) {
      for (let z = 2 + k; z <= 10 - k; z++) {
        const edge = z === 2 + k || z === 10 - k;
        put(4 + k, x, z, edge ? 'dark_oak_planks' : x === 3 || x === 10 ? 'oak_planks' : 'dark_oak_planks');
      }
    }
  }
  for (let y = 1; y <= 4; y++) put(y, 12, 2, 'oak_log');
  for (let y = 4; y <= 6; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if ((y === 6 && Math.abs(dx) + Math.abs(dz) > 1) || (y === 4 && dx === 0 && dz === 0)) continue;
        if (12 + dx < n) put(y, 12 + dx, 2 + dz, (dx + dz + y) % 3 ? 'oak_leaves' : 'birch_leaves', 'terrain');
      }
    }
  }
  put(1, 2, 8, 'poppy', 'terrain'); put(1, 11, 11, 'dandelion', 'terrain'); put(1, 9, 12, 'poppy', 'terrain');
  heroPlan = { size: n, layers };
  return heroPlan;
}

function renderLearn() {
  const root = document.getElementById('tab-learn');
  const learned = TIPS.filter(t => state.learned.includes(t.id)).length;
  const forYou = recommendedTips();
  // Tips picked for the player come first.
  const shown = TIPS.filter(t => learnView.topic === 'All' || t.topic === learnView.topic)
    .sort((a, b) => forYou.includes(b.id) - forYou.includes(a.id));

  const art = el('canvas', { class: 'hero-art', width: 640, height: 400, 'aria-hidden': 'true' });
  renderBuild(art, heroScene(), { yaw: -0.75, pitch: 0.5, zoom: 1.45, ground: 'rgba(0,0,0,0)', line: 'rgba(0,0,0,0)' });

  setContent(root,
    el('header', { class: 'hero' },
      el('div', {},
        el('h1', {}, 'Learn to build better'),
        el('p', { class: 'intro' }, `Each card is one trick. Open it to see a common mistake next to a better way, and how to do it.${forYou.length ? ' Cards marked ⭐ are good ones for you to start with.' : ''}`),
        el('div', { class: 'progress-row' },
          el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': TIPS.length, 'aria-valuenow': learned },
            el('span', { style: { width: `${(learned / TIPS.length) * 100}%` } })),
          el('span', { class: 'progress-text' }, `${learned} of ${TIPS.length} tips learned`))),
      art),
    chipRow(['All', ...TIP_TOPICS], learnView.topic, topic => { learnView.topic = topic; renderLearn(); }, 'Topics'),
    el('div', { class: 'card-grid tips-grid' }, ...shown.map(tip => tipCard(tip, forYou.includes(tip.id)))),
  );
}

function tipCard(tip, forYou) {
  const done = state.learned.includes(tip.id);
  return el('button', { type: 'button', class: `card tip-card${done ? ' done' : ''}`, 'data-tip': tip.id, onclick: () => openTip(tip.id) },
    el('span', { class: 'tip-thumb' }, tipPicture(tip.better.grid, { view: tip.view, label: tip.better.caption })),
    el('span', { class: 'card-body' },
      el('span', { class: 'badges' },
        el('span', { class: 'badge' }, tip.topic),
        el('span', { class: `badge ${tip.level.toLowerCase()}` }, tip.level),
        done && el('span', { class: 'badge learned' }, '✓ Learned'),
        forYou && el('span', { class: 'badge for-you' }, '⭐ For you')),
      el('strong', { class: 'card-title' }, tip.title),
      el('span', { class: 'card-text' }, tip.summary)));
}

function openTip(id) {
  const tip = tipById(id);
  if (!tip) return;
  const dialog = document.getElementById('tipDialog');
  const index = TIPS.indexOf(tip);
  const done = state.learned.includes(tip.id);
  const side = (kind, pic) => el('figure', { class: `compare ${kind}` },
    el('figcaption', { class: 'compare-label' }, kind === 'mistake' ? '✗ Common mistake' : '✓ Better'),
    tipPicture(pic.grid, { view: tip.view, label: pic.caption }),
    el('p', {}, pic.caption));

  dialog.replaceChildren(el('div', { class: 'dialog-inner' },
    el('header', { class: 'dialog-head' },
      el('div', {},
        el('span', { class: 'badges' }, el('span', { class: 'badge' }, tip.topic), el('span', { class: `badge ${tip.level.toLowerCase()}` }, tip.level)),
        el('h2', {}, tip.title)),
      closeButton(dialog)),
    el('p', { class: 'lead' }, tip.summary),
    el('div', { class: 'compare-row' }, side('mistake', tip.mistake), side('better', tip.better)),
    el('h3', {}, 'Why it works'),
    el('p', {}, tip.why),
    el('h3', {}, 'How to do it'),
    el('ol', { class: 'steps' }, ...tip.steps.map(s => el('li', {}, s))),
    el('div', { class: 'try-it' }, el('strong', {}, '🎯 Try it: '), tip.tryIt),
    el('footer', { class: 'dialog-foot' },
      el('button', { type: 'button', class: 'btn', disabled: index === 0, onclick: () => openTip(TIPS[index - 1].id) }, '← Previous'),
      el('button', { type: 'button', class: `btn ${done ? '' : 'primary'}`, id: 'learnedBtn', onclick: () => {
        state.learned = done ? state.learned.filter(x => x !== tip.id) : [...state.learned, tip.id];
        save();
        if (!done) toast(`Nice! ${state.learned.length} of ${TIPS.length} tips learned.`);
        openTip(tip.id);
        if (currentTab === 'learn') renderLearn();
      } }, done ? '✓ Learned' : 'Mark as learned'),
      el('button', { type: 'button', class: 'btn', disabled: index === TIPS.length - 1, onclick: () => openTip(TIPS[index + 1].id) }, 'Next →'))));
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.dialog-inner').scrollTop = 0;
}

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

function renderLearn() {
  const root = document.getElementById('tab-learn');
  const learned = TIPS.filter(t => state.learned.includes(t.id)).length;
  const shown = TIPS.filter(t => learnView.topic === 'All' || t.topic === learnView.topic);

  setContent(root,
    !state.welcomed && welcomeCard(),
    sectionHead('Learn to build better', 'Each card is one trick. Open it to see a common mistake next to a better way, and how to do it.'),
    el('div', { class: 'progress-row' },
      el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': TIPS.length, 'aria-valuenow': learned },
        el('span', { style: { width: `${(learned / TIPS.length) * 100}%` } })),
      el('span', { class: 'progress-text' }, `${learned} of ${TIPS.length} tips learned`)),
    chipRow(['All', ...TIP_TOPICS], learnView.topic, topic => { learnView.topic = topic; renderLearn(); }, 'Topics'),
    el('div', { class: 'card-grid tips-grid' }, ...shown.map(tipCard)),
  );
}

function welcomeCard() {
  const parts = [
    ['📘', 'Learn', 'tricks one at a time'],
    ['🎨', 'Palettes', 'blocks that go together'],
    ['🖼️', 'Inspiration', 'save pictures you like'],
    ['📐', 'Planner', 'sketch a build and count blocks'],
    ['✅', 'Checklist', 'check a finished build'],
  ];
  return el('div', { class: 'welcome' },
    el('h2', {}, 'Welcome! 👋'),
    el('p', {}, 'This app helps you build better in Minecraft. Here\'s what\'s in it:'),
    el('ul', { class: 'welcome-list' }, ...parts.map(([icon, name, text]) => el('li', {},
      el('button', { type: 'button', class: 'link-btn', onclick: () => showTab(name.toLowerCase()) }, `${icon} ${name}`), ` – ${text}`))),
    el('button', { type: 'button', class: 'btn primary', id: 'welcomeDone', onclick: () => {
      state.welcomed = true;
      save();
      renderLearn();
    } }, 'Got it'));
}

function tipCard(tip) {
  const done = state.learned.includes(tip.id);
  return el('button', { type: 'button', class: `card tip-card${done ? ' done' : ''}`, 'data-tip': tip.id, onclick: () => openTip(tip.id) },
    el('span', { class: 'tip-thumb' }, tipPicture(tip.better.grid, { view: tip.view, label: tip.better.caption })),
    el('span', { class: 'card-body' },
      el('span', { class: 'badges' },
        el('span', { class: 'badge' }, tip.topic),
        el('span', { class: `badge ${tip.level.toLowerCase()}` }, tip.level),
        done && el('span', { class: 'badge learned' }, '✓ Learned')),
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

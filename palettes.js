'use strict';

// 🎨 Palettes tab: sets of blocks that go together, by style, and texture gradients.

const paletteView = { style: 'All', block: '' };
const FAVORITES = '★ Favourites';

function renderPalettes() {
  const root = document.getElementById('tab-palettes');
  const block = BLOCK_LIST.find(([id, name]) => name.toLowerCase() === paletteView.block.trim().toLowerCase())?.[0] || '';
  const shown = PALETTES.filter(p =>
    (paletteView.style === 'All' || (paletteView.style === FAVORITES ? state.favorites.includes(p.id) : p.style === paletteView.style))
    && (!block || p.blocks.some(([id]) => id === block)));

  const search = el('input', {
    type: 'search', id: 'blockSearch', class: 'input', list: 'blockNames', placeholder: 'Start from a block, e.g. Spruce planks',
    value: paletteView.block, 'aria-label': 'Show palettes that use this block',
    oninput: e => {
      paletteView.block = e.target.value;
      // Only redraw once a real block name is typed (or the box is cleared), so typing isn't interrupted.
      const match = BLOCK_LIST.some(([, name]) => name.toLowerCase() === e.target.value.trim().toLowerCase());
      if (match || !e.target.value) {
        renderPalettes();
        const box = document.getElementById('blockSearch');
        box.focus();
        box.setSelectionRange(box.value.length, box.value.length);
      }
    },
  });

  setContent(root,
    sectionHead('Block palettes', 'Sets of blocks that look good together. Each block has a job: base, walls, frame, roof or accent.'),
    el('div', { class: 'toolbar' },
      search,
      el('datalist', { id: 'blockNames' }, ...BLOCK_LIST.map(([, name]) => el('option', { value: name })))),
    chipRow(['All', FAVORITES, ...PALETTE_STYLES], paletteView.style, style => { paletteView.style = style; renderPalettes(); }, 'Styles'),
    shown.length
      ? el('div', { class: 'card-grid palette-grid' }, ...shown.map(p => paletteCard(p, block)))
      : el('div', { class: 'empty' }, paletteView.style === FAVORITES && !block
        ? 'No favourites yet. Tap ☆ on a palette to keep it here.'
        : 'No palettes match. Try another block or style.'),
    el('h2', { class: 'subhead' }, 'Texture gradients'),
    el('p', { class: 'hint' }, 'Blocks that blend from one to the next. Scatter them across a wall, floor or path so it isn\'t one flat texture.'),
    el('div', { class: 'gradient-list' }, ...GRADIENTS.map(g => el('div', { class: 'card gradient' },
      el('strong', {}, g.name),
      el('div', { class: 'gradient-row' }, ...g.blocks.map(id => el('span', { class: 'gradient-step' }, swatch(id, 'big'), el('span', {}, blockName(id))))),
      el('span', { class: 'hint' }, g.use)))),
  );
}

function paletteCard(p, highlight) {
  const fav = state.favorites.includes(p.id);
  return el('div', { class: 'card palette-card', 'data-palette': p.id },
    el('div', { class: 'palette-head' },
      el('div', {}, el('strong', { class: 'card-title' }, p.name), el('span', { class: 'badge' }, p.style)),
      el('button', {
        type: 'button', class: `icon-btn fav${fav ? ' on' : ''}`, 'aria-pressed': String(fav),
        title: fav ? 'Remove from favourites' : 'Add to favourites', 'aria-label': fav ? 'Remove from favourites' : 'Add to favourites',
        onclick: () => {
          state.favorites = fav ? state.favorites.filter(x => x !== p.id) : [...state.favorites, p.id];
          save();
          renderPalettes();
        },
      }, fav ? '★' : '☆')),
    el('ul', { class: 'palette-blocks' }, ...p.blocks.map(([id, role]) => el('li', { class: id === highlight ? 'hl' : '' },
      swatch(id, 'big'),
      el('span', { class: 'block-label' }, el('span', {}, blockName(id)), el('span', { class: 'role' }, role))))),
    el('p', { class: 'card-text' }, p.why),
    el('div', { class: 'card-actions' },
      el('button', { type: 'button', class: 'btn', onclick: () => newPlan({ paletteId: p.id, name: `${p.name} build` }) }, '📐 Plan a build with it')));
}

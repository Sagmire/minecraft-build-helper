'use strict';

// 🖼️ Inspiration tab: a board of photos sorted into categories. Paste (Ctrl + V), drag photos
// in, or pick files. Photos live in the picture store (images.js); the board keeps their ids.

const INSPIRATION_CATEGORIES = [
  ['Houses', '🏠'], ['Castles & towers', '🏰'], ['Interiors', '🛋️'], ['Roofs', '🔺'],
  ['Details', '🔍'], ['Landscaping', '🌳'], ['Other', '✨'],
];
const ALL_PHOTOS = 'All';
const inspirationView = { category: ALL_PHOTOS };

function normalizeInspiration(x) {
  const builtIn = new Set(INSPIRATION_CATEGORIES.map(([name]) => name));
  const categories = [...new Set((Array.isArray(x?.categories) ? x.categories : [])
    .map(c => String(c).trim()).filter(c => c && c !== ALL_PHOTOS && !builtIn.has(c)))];
  const known = new Set([...builtIn, ...categories]);
  return {
    categories,
    items: (Array.isArray(x?.items) ? x.items : []).filter(i => i?.imageId).map(i => ({
      id: String(i.id || uid()),
      imageId: String(i.imageId),
      category: known.has(i.category) ? i.category : 'Other',
      note: String(i.note || ''),
      created: Number(i.created) || Date.now(),
    })),
  };
}

function inspirationCategories() {
  return [...INSPIRATION_CATEGORIES, ...state.inspiration.categories.map(c => [c, '📌'])];
}

function categoryIcon(name) {
  return inspirationCategories().find(([c]) => c === name)?.[1] || '✨';
}

// New photos go into the category being looked at ("Other" when looking at everything).
async function addInspirationFiles(files) {
  const pictures = [...files].filter(f => f.type.startsWith('image/'));
  if (!pictures.length) {
    toast('That isn\'t a picture. Copy an image first, then paste.');
    return;
  }
  const category = inspirationView.category === ALL_PHOTOS ? 'Other' : inspirationView.category;
  let added = 0;
  for (const file of pictures) {
    try {
      const imageId = addImage(await pictureFromFile(file));
      state.inspiration.items.unshift({ id: uid(), imageId, category, note: '', created: Date.now() });
      added++;
    } catch (e) {
      // Skip files the browser can't read as pictures.
    }
  }
  if (!added) {
    toast('Couldn\'t read that picture.');
    return;
  }
  save();
  if (currentTab === 'inspiration') renderInspiration();
  toast(`${added === 1 ? 'Photo' : `${added} photos`} added to ${category}.`);
}

// The Paste button: reads a picture from the clipboard (Ctrl + V works too).
async function pasteFromClipboard() {
  try {
    const items = await navigator.clipboard.read();
    const files = [];
    for (const item of items) {
      const type = item.types.find(t => t.startsWith('image/'));
      if (type) files.push(new File([await item.getType(type)], 'pasted', { type }));
    }
    if (files.length) return addInspirationFiles(files);
    toast('No picture on the clipboard. Copy an image first.');
  } catch (e) {
    toast('Press Ctrl + V to paste a picture.');
  }
}

function renderInspiration() {
  const root = document.getElementById('tab-inspiration');
  const items = state.inspiration.items;
  const shown = items.filter(i => inspirationView.category === ALL_PHOTOS || i.category === inspirationView.category);
  const fileInput = el('input', {
    type: 'file', accept: 'image/*', multiple: true, hidden: true, id: 'photoFiles',
    onchange: e => { addInspirationFiles(e.target.files); e.target.value = ''; },
  });
  const custom = new Set(state.inspiration.categories);
  const count = name => items.filter(i => i.category === name).length;

  setContent(root,
    sectionHead('Inspiration', 'Save builds you like. Copy a picture from anywhere and press Ctrl + V here, drag photos in, or use Add photos.'),
    el('div', { class: 'toolbar' },
      el('button', { type: 'button', class: 'btn primary', onclick: () => fileInput.click() }, '➕ Add photos'),
      el('button', { type: 'button', class: 'btn', id: 'pasteBtn', onclick: pasteFromClipboard }, '📋 Paste'),
      el('button', { type: 'button', class: 'btn', id: 'newCategoryBtn', onclick: addCategory }, '🏷️ New category'),
      fileInput),
    el('div', { class: 'chips', role: 'group', 'aria-label': 'Categories' },
      chip(`All (${items.length})`, inspirationView.category === ALL_PHOTOS, () => { inspirationView.category = ALL_PHOTOS; renderInspiration(); }, ALL_PHOTOS),
      ...inspirationCategories().map(([name, icon]) => el('span', { class: 'chip-wrap' },
        chip(`${icon} ${name} (${count(name)})`, inspirationView.category === name, () => { inspirationView.category = name; renderInspiration(); }, name),
        custom.has(name) && el('button', {
          type: 'button', class: 'chip-x', title: `Delete the "${name}" category`, 'aria-label': `Delete the ${name} category`,
          onclick: () => deleteCategory(name),
        }, '×')))),
    shown.length
      ? el('div', { class: 'photo-grid' }, ...shown.map(photoTile))
      : el('div', { class: 'empty drop-hint' },
        el('div', { class: 'empty-icon' }, '🖼️'),
        el('strong', {}, items.length ? 'No photos in this category yet.' : 'No photos yet.'),
        el('span', {}, 'Copy a picture (a screenshot, or one from a website) and press Ctrl + V. You can also drag photos here.')),
  );
}

function photoTile(item) {
  const index = state.inspiration.items.indexOf(item);
  return el('div', { class: 'card photo-tile', 'data-photo': item.id },
    el('button', { type: 'button', class: 'photo-btn', title: 'Open bigger', onclick: () => openPhoto(item.id) },
      el('img', { src: getImage(item.imageId), alt: item.note || item.category, loading: 'lazy' })),
    el('div', { class: 'photo-meta' },
      el('select', {
        class: 'input small', 'aria-label': 'Category',
        onchange: e => { item.category = e.target.value; save(); renderInspiration(); },
      }, ...inspirationCategories().map(([name, icon]) => el('option', { value: name, selected: name === item.category }, `${icon} ${name}`))),
      el('input', {
        class: 'input small', placeholder: 'Add a note…', value: item.note, 'aria-label': 'Note',
        onchange: e => { item.note = e.target.value.trim(); save(); },
      }),
      el('button', {
        type: 'button', class: 'icon-btn danger', title: 'Delete photo', 'aria-label': 'Delete photo',
        onclick: () => {
          state.inspiration.items.splice(index, 1);
          save();
          renderInspiration();
          let undone = false;
          toast('Photo deleted.', { label: 'Undo', run: () => {
            undone = true;
            state.inspiration.items.splice(index, 0, item);
            save();
            renderInspiration();
          } });
          // The picture itself is only removed once Undo is no longer offered.
          setTimeout(() => { if (!undone && !state.inspiration.items.some(i => i.imageId === item.imageId)) deleteImages([item.imageId]); }, 8000);
        },
      }, '🗑')));
}

function addCategory() {
  const name = (prompt('Name for the new category (e.g. Bridges, Farms, Modern):') || '').trim();
  if (!name) return;
  if (name === ALL_PHOTOS || inspirationCategories().some(([c]) => c.toLowerCase() === name.toLowerCase())) {
    toast('There\'s already a category with that name.');
    return;
  }
  state.inspiration.categories.push(name);
  inspirationView.category = name;
  save();
  renderInspiration();
}

function deleteCategory(name) {
  const n = state.inspiration.items.filter(i => i.category === name).length;
  if (!confirm(n ? `Delete the "${name}" category? Its ${n} photo${n === 1 ? '' : 's'} will move to Other.` : `Delete the "${name}" category?`)) return;
  state.inspiration.categories = state.inspiration.categories.filter(c => c !== name);
  for (const i of state.inspiration.items) if (i.category === name) i.category = 'Other';
  if (inspirationView.category === name) inspirationView.category = ALL_PHOTOS;
  save();
  renderInspiration();
}

// A bigger view of a photo, with arrows to go through the ones being shown.
function openPhoto(id) {
  const shown = state.inspiration.items.filter(i => inspirationView.category === ALL_PHOTOS || i.category === inspirationView.category);
  const index = shown.findIndex(i => i.id === id);
  const item = shown[index];
  if (!item) return;
  const dialog = document.getElementById('photoDialog');
  const go = step => openPhoto(shown[(index + step + shown.length) % shown.length].id);
  dialog.onkeydown = e => {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };
  dialog.replaceChildren(el('div', { class: 'dialog-inner photo-view' },
    el('header', { class: 'dialog-head' },
      el('span', {}, `${categoryIcon(item.category)} ${item.category}${item.note ? ` · ${item.note}` : ''}`),
      closeButton(dialog)),
    el('img', { src: getImage(item.imageId), alt: item.note || item.category }),
    shown.length > 1 && el('footer', { class: 'dialog-foot' },
      el('button', { type: 'button', class: 'btn', onclick: () => go(-1) }, '← Previous'),
      el('span', { class: 'hint' }, `${index + 1} of ${shown.length}`),
      el('button', { type: 'button', class: 'btn', onclick: () => go(1) }, 'Next →'))));
  if (!dialog.open) dialog.showModal();
}

// Ctrl + V and dragging photos in work anywhere on the Inspiration tab.
document.addEventListener('paste', e => {
  if (currentTab !== 'inspiration') return;
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  addInspirationFiles(files);
});

document.addEventListener('dragover', e => {
  if (currentTab !== 'inspiration' || !e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault();
  document.getElementById('tab-inspiration').classList.add('dropping');
});
document.addEventListener('dragleave', e => {
  if (!e.relatedTarget) document.getElementById('tab-inspiration').classList.remove('dropping');
});
document.addEventListener('drop', e => {
  if (currentTab !== 'inspiration') return;
  e.preventDefault();
  document.getElementById('tab-inspiration').classList.remove('dropping');
  if (e.dataTransfer?.files.length) addInspirationFiles(e.dataTransfer.files);
});

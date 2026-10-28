'use strict';

// The app's core: saved data, small helpers, the tabs, settings and backups. Loaded last, so
// every other file's functions are ready when it starts.

const STORE_KEY = 'minecraftBuildHelper';
const APP_VERSION = '1.0.0';

// [key, icon, label]
const TABS = [
  ['learn', '📘', 'Learn'],
  ['palettes', '🎨', 'Palettes'],
  ['inspiration', '🖼️', 'Inspiration'],
  ['planner', '📐', 'Planner'],
  ['checklist', '✅', 'Checklist'],
];
// One line about each tab, for setup.
const TAB_BLURBS = {
  Learn: 'building tricks, one at a time',
  Palettes: 'blocks that look good together',
  Inspiration: 'save pictures of builds you like',
  Planner: 'sketch a build and count the blocks',
  Checklist: 'check a finished build for things to improve',
};
const RENDERERS = {
  learn: () => renderLearn(),
  palettes: () => renderPalettes(),
  inspiration: () => renderInspiration(),
  planner: () => renderPlanner(),
  checklist: () => renderChecklist(),
};

let state = null;
let currentTab = 'learn';

// ---------- Helpers ----------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Makes an element: el('button', { class: 'btn', onclick: fn }, 'Text', otherNode).
// Attributes that are null, undefined or false are left out.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'value') node.value = value;
    else if (key === 'checked') node.checked = true;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === '') continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

// Replaces what's inside an element. Children that are null, undefined or false are left out,
// so parts can be shown with `condition && el(...)`.
function setContent(node, ...children) {
  node.replaceChildren(...children.flat().filter(c => c != null && c !== false));
}

function sectionHead(title, intro) {
  return el('header', { class: 'section-head' }, el('h1', {}, title), el('p', { class: 'intro' }, intro));
}

function chip(label, on, onclick, value = label) {
  return el('button', { type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': String(on), 'data-value': value, onclick }, label);
}

function chipRow(values, current, onPick, label) {
  return el('div', { class: 'chips', role: 'group', 'aria-label': label }, ...values.map(v => chip(v, v === current, () => onPick(v))));
}

function closeButton(dialog) {
  return el('button', { type: 'button', class: 'icon-btn close', 'aria-label': 'Close', title: 'Close', onclick: () => dialog.close() }, '✕');
}

let toastTimer = null;
// A short message at the bottom. action: { label, run } adds a button (e.g. Undo).
function toast(message, action) {
  const box = document.getElementById('toast');
  setContent(box, el('span', {}, message), action && el('button', {
    type: 'button', class: 'toast-action', onclick: () => { hideToast(); action.run(); },
  }, action.label));
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 7000 : 3000);
}

function hideToast() {
  document.getElementById('toast').classList.remove('show');
}

// ---------- Saving ----------

function defaultState() {
  return normalizeState({});
}

function normalizeState(x) {
  const strings = a => (Array.isArray(a) ? [...new Set(a.map(String))] : []);
  return {
    theme: ['light', 'dark', 'system'].includes(x?.theme) ? x.theme : 'system',
    setupDone: !!x?.setupDone,
    level: ['new', 'some', 'lots'].includes(x?.level) ? x.level : '',
    styles: strings(x?.styles).filter(s => PALETTE_STYLES.includes(s)),
    learned: strings(x?.learned).filter(id => tipById(id)),
    favorites: strings(x?.favorites).filter(id => PALETTES.some(p => p.id === id)),
    inspiration: normalizeInspiration(x?.inspiration),
    plans: (Array.isArray(x?.plans) ? x.plans : []).map(normalizePlan).filter(Boolean),
    review: normalizeReview(x?.review),
    reviews: (Array.isArray(x?.reviews) ? x.reviews : []).map(normalizeReview),
  };
}

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
  } catch (e) {
    return defaultState();
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('Couldn\'t save: the app\'s storage is full.');
  }
}

// ---------- Tabs ----------

function buildTabs() {
  document.getElementById('tabs').replaceChildren(...TABS.map(([key, icon, label]) => el('a', {
    href: `#${key}`, class: 'tab-link', 'data-tab': key,
    onclick: e => { e.preventDefault(); showTab(key); },
  }, el('span', { class: 'tab-icon', 'aria-hidden': 'true' }, icon), el('span', { class: 'tab-label' }, label))));
}

function showTab(name) {
  if (!RENDERERS[name]) name = 'learn';
  const changed = name !== currentTab;
  currentTab = name;
  for (const [key] of TABS) {
    document.getElementById(`tab-${key}`).hidden = key !== name;
    const link = document.querySelector(`#tabs [data-tab="${key}"]`);
    if (key === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  RENDERERS[name]();
  if (changed) window.scrollTo(0, 0);
}

// ---------- Look ----------

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
  const dark = state.theme === 'dark' || (state.theme === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (currentTab === 'planner') drawPlan();
}
darkQuery.addEventListener('change', () => state && applyTheme());

// ---------- Settings and backups ----------

function openSettings() {
  const dialog = document.getElementById('settingsDialog');
  const themes = [['light', '☀️ Light'], ['dark', '🌙 Dark'], ['system', '💻 Match my computer']];
  const fileInput = el('input', {
    type: 'file', accept: '.json,application/json', hidden: true, id: 'backupFile',
    onchange: e => { if (e.target.files[0]) loadBackup(e.target.files[0]); e.target.value = ''; },
  });
  dialog.replaceChildren(el('div', { class: 'dialog-inner settings' },
    el('header', { class: 'dialog-head' }, el('h2', {}, 'Settings'), closeButton(dialog)),
    el('h3', {}, 'Look'),
    el('div', { class: 'segmented', role: 'group', 'aria-label': 'Light or dark' }, ...themes.map(([key, label]) => el('button', {
      type: 'button', 'data-theme': key, class: state.theme === key ? 'on' : '', 'aria-pressed': String(state.theme === key),
      onclick: () => { state.theme = key; save(); applyTheme(); openSettings(); },
    }, label))),
    el('h3', {}, 'Backups'),
    el('p', { class: 'hint' }, 'Everything is saved on this computer automatically. Save a backup file now and then, so nothing is lost if the computer breaks, or to move your things to another computer.'),
    el('div', { class: 'card-actions' },
      el('button', { type: 'button', class: 'btn primary', id: 'saveBackupBtn', onclick: saveBackup }, '💾 Save a backup file'),
      el('button', { type: 'button', class: 'btn', id: 'loadBackupBtn', onclick: () => fileInput.click() }, '📂 Load a backup'),
      fileInput),
    el('h3', {}, 'Help'),
    el('div', { class: 'card-actions' },
      el('button', { type: 'button', class: 'btn', id: 'settingsTourBtn', onclick: () => { dialog.close(); startTour(); } }, '🧭 Take the tour'),
      el('button', { type: 'button', class: 'btn', id: 'settingsSetupBtn', onclick: () => { dialog.close(); openSetup(); } }, '👋 Run setup again')),
    el('p', { class: 'hint version' }, `Minecraft Build Helper ${APP_VERSION}`)));
  if (!dialog.open) dialog.showModal();
}

function backupData() {
  const images = {};
  for (const item of state.inspiration.items) {
    const data = getImage(item.imageId);
    if (data) images[item.imageId] = data;
  }
  return { app: 'minecraft-build-helper', version: APP_VERSION, saved: new Date().toISOString(), state, images };
}

function saveBackup() {
  const blob = new Blob([JSON.stringify(backupData())], { type: 'application/json' });
  const link = el('a', { href: URL.createObjectURL(blob), download: `build-helper-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  toast('Backup file saved.');
}

async function loadBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (e) {
    data = null;
  }
  if (data?.app !== 'minecraft-build-helper' || !data.state) {
    toast('That file isn\'t a Build Helper backup.');
    return;
  }
  if (!confirm('Load this backup? It replaces everything in the app now.')) return;
  clearImages();
  for (const [id, picture] of Object.entries(data.images || {})) storeImage(id, String(picture));
  state = normalizeState(data.state);
  plannerView.planId = null;
  save();
  applyTheme();
  document.getElementById('settingsDialog').close();
  showTab(currentTab);
  toast('Backup loaded.');
}

// ---------- Start ----------

async function start() {
  state = loadState();
  applyTheme();
  buildTabs();
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  // Clicking the dark area around a window closes it. Setup only closes with its own buttons
  // (not Esc or clicking outside), so it isn't lost by accident.
  for (const dialog of document.querySelectorAll('dialog:not(#setupDialog)')) {
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  }
  document.getElementById('setupDialog').addEventListener('cancel', e => e.preventDefault());
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
  await loadImages();
  showTab(location.hash.slice(1) || 'learn');
  if (!state.setupDone) openSetup();
  document.body.classList.add('ready');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

start();

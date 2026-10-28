'use strict';

// 👋 First-time setup: a few quick questions the first time the app opens (experience, favourite
// styles, light or dark), ending with an offer of the tour. Can be run again from Settings.

const SETUP_LEVELS = [
  ['new', '🌱', 'New to building', 'My builds are mostly simple boxes.'],
  ['some', '🏠', 'I can build a house', 'I want my builds to look nicer.'],
  ['lots', '🏰', 'I build a lot', 'Show me the trickier techniques.'],
];
const SETUP_THEMES = [['light', '☀️', 'Light'], ['dark', '🌙', 'Dark'], ['system', '💻', 'Match my computer']];
const SETUP_STEPS = ['welcome', 'level', 'styles', 'look', 'done'];
let setupView = null; // { step, level, styles } while setup is open

// Tips picked for the player's experience: beginner tips for newer builders, the rest for
// experienced ones. Learned tips drop off the list.
function recommendedTips() {
  if (!state.level) return [];
  const level = state.level === 'lots' ? 'Intermediate' : 'Beginner';
  return TIPS.filter(t => t.level === level && !state.learned.includes(t.id)).map(t => t.id);
}

function openSetup() {
  setupView = { step: 0, level: state.level, styles: [...state.styles] };
  const dialog = document.getElementById('setupDialog');
  if (!dialog.open) dialog.showModal();
  renderSetup();
}

function renderSetup() {
  const dialog = document.getElementById('setupDialog');
  const step = SETUP_STEPS[setupView.step];
  const go = n => { setupView.step = n; renderSetup(); };
  const option = (on, onclick, icon, title, text, value) => el('button', {
    type: 'button', class: `setup-option${on ? ' on' : ''}`, 'aria-pressed': String(on), 'data-value': value, onclick,
  }, el('span', { class: 'setup-icon', 'aria-hidden': 'true' }, icon), el('strong', {}, title), text && el('span', { class: 'hint' }, text));

  const body = {
    welcome: () => [
      el('div', { class: 'setup-hero', 'aria-hidden': 'true' }, el('img', { src: 'icons/icon-192.png', alt: '' })),
      el('h2', {}, 'Welcome to Build Helper!'),
      el('p', {}, 'This app helps you build better in Minecraft. It has five parts:'),
      el('ul', { class: 'setup-parts' }, ...TABS.map(([, icon, label]) => el('li', {}, `${icon} `, el('strong', {}, label), ` – ${TAB_BLURBS[label]}`))),
      el('p', { class: 'hint' }, 'Let\'s set a few things up. It takes about 30 seconds.'),
    ],
    level: () => [
      el('h2', {}, 'How much building have you done?'),
      el('p', { class: 'hint' }, 'This picks which tips to show you first. You can see every tip either way.'),
      el('div', { class: 'setup-options' }, ...SETUP_LEVELS.map(([key, icon, title, text]) =>
        option(setupView.level === key, () => { setupView.level = key; renderSetup(); }, icon, title, text, key))),
    ],
    styles: () => [
      el('h2', {}, 'Which styles do you like?'),
      el('p', { class: 'hint' }, 'Pick as many as you want (or none). Their palettes are saved as favourites.'),
      el('div', { class: 'chips setup-styles' }, ...PALETTE_STYLES.map(style => chip(style, setupView.styles.includes(style), () => {
        setupView.styles = setupView.styles.includes(style) ? setupView.styles.filter(s => s !== style) : [...setupView.styles, style];
        renderSetup();
      }))),
    ],
    look: () => [
      el('h2', {}, 'Light or dark?'),
      el('p', { class: 'hint' }, 'You can change this any time in ⚙️ Settings.'),
      el('div', { class: 'setup-options' }, ...SETUP_THEMES.map(([key, icon, title]) =>
        option(state.theme === key, () => { state.theme = key; save(); applyTheme(); renderSetup(); }, icon, title, '', key))),
    ],
    done: () => [
      el('div', { class: 'setup-hero', 'aria-hidden': 'true' }, '🎉'),
      el('h2', {}, 'All set!'),
      el('p', {}, 'Want a quick look around first? The tour shows where everything is in under a minute.'),
    ],
  }[step]();

  const last = step === 'done';
  setContent(dialog, el('div', { class: 'dialog-inner setup' },
    el('div', { class: 'setup-dots', 'aria-label': `Step ${setupView.step + 1} of ${SETUP_STEPS.length}` },
      ...SETUP_STEPS.map((s, i) => el('span', { class: i <= setupView.step ? 'on' : '' }))),
    ...body,
    el('footer', { class: 'dialog-foot' },
      last
        ? el('button', { type: 'button', class: 'btn', id: 'setupNoTourBtn', onclick: () => finishSetup(false) }, 'Start building')
        : setupView.step > 0
          ? el('button', { type: 'button', class: 'btn', id: 'setupBackBtn', onclick: () => go(setupView.step - 1) }, '← Back')
          : el('button', { type: 'button', class: 'btn', id: 'setupSkipBtn', onclick: skipSetup }, 'Skip setup'),
      last
        ? el('button', { type: 'button', class: 'btn primary', id: 'setupTourBtn', onclick: () => finishSetup(true) }, '🧭 Take the tour')
        : el('button', { type: 'button', class: 'btn primary', id: 'setupNextBtn', onclick: () => go(setupView.step + 1) },
          setupView.step === 0 ? 'Let\'s go →' : 'Next →'))));
  dialog.querySelector('#setupNextBtn, #setupTourBtn')?.focus();
}

function finishSetup(tour) {
  state.level = setupView.level;
  state.styles = setupView.styles;
  const picked = PALETTES.filter(p => state.styles.includes(p.style)).map(p => p.id);
  state.favorites = [...new Set([...state.favorites, ...picked])];
  state.setupDone = true;
  save();
  setupView = null;
  document.getElementById('setupDialog').close();
  showTab('learn');
  if (tour) startTour();
}

function skipSetup() {
  state.setupDone = true;
  save();
  setupView = null;
  document.getElementById('setupDialog').close();
  showTab(currentTab);
  toast('You can run setup or the tour any time from ⚙️ Settings.');
}

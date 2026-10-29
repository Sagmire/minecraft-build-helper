'use strict';

// 🧭 The tour: a short walkthrough that opens each tab and lights up its main part, with
// Back, Next and Skip. Offered at the end of setup, and from Settings any time after.

// Each stop opens its tab (if it has one) and points at the first of its targets that's on screen.
const TOUR_STOPS = [
  { targets: ['#tabs'], title: '🧭 Five sections', text: 'Switch between the parts of the app here. Let\'s look at each one.' },
  { tab: 'learn', targets: ['.tip-card'], title: '📘 Learn', text: 'Each card is one building trick. Open it to see a common mistake next to a better way, and how to do it. ⭐ marks good ones to start with.' },
  { tab: 'palettes', targets: ['.palette-card'], title: '🎨 Palettes', text: 'Blocks that look good together. Tap ☆ to keep a favourite, or "Plan a build with it" to use one in the Planner.' },
  { tab: 'inspiration', targets: ['#addPhotosBtn'], title: '🖼️ Inspiration', text: 'Save builds you like: copy a picture from anywhere and press Ctrl + V here, or add photos. Sort them into categories.' },
  { tab: 'planner', targets: ['#newPlanChoices'], title: '📐 Planner', text: 'Start with a simple plan to decide what to build, or a 3D block plan to place every block and turn it around to see it from all sides.' },
  { tab: 'checklist', targets: ['.check-group'], title: '✅ Checklist', text: 'Finished a build? Tick what it has. Each point links to the tip that helps with it.' },
  { targets: ['#settingsBtn'], title: '⚙️ Settings', text: 'Light or dark, backups, and this tour again. That\'s it, happy building!' },
];

let tour = null; // { index } while the tour is showing

function startTour() {
  tour = { index: 0 };
  document.getElementById('tour').hidden = false;
  showTourStop();
}

function endTour() {
  tour = null;
  document.getElementById('tour').hidden = true;
  showTab('learn');
}

function showTourStop() {
  const stop = TOUR_STOPS[tour.index];
  const last = tour.index === TOUR_STOPS.length - 1;
  // The planner stop points at the list of plans, so leave any open plan.
  if (stop.tab === 'planner') plannerView.planId = null;
  if (stop.tab && (currentTab !== stop.tab || stop.tab === 'planner')) showTab(stop.tab);
  const tip = document.getElementById('tourTip');
  setContent(tip,
    el('span', { class: 'hint', id: 'tourCount' }, `${tour.index + 1} of ${TOUR_STOPS.length}`),
    el('strong', { id: 'tourTitle' }, stop.title),
    el('p', {}, stop.text),
    el('div', { class: 'tour-actions' },
      !last && el('button', { type: 'button', class: 'link-btn', id: 'tourSkipBtn', onclick: endTour }, 'Skip tour'),
      el('span', { class: 'spacer' }),
      tour.index > 0 && el('button', { type: 'button', class: 'btn', id: 'tourBackBtn', onclick: () => moveTour(-1) }, '← Back'),
      el('button', { type: 'button', class: 'btn primary', id: 'tourNextBtn', onclick: () => moveTour(1) }, last ? 'Done' : 'Next →')));
  placeTourStop(stop);
  document.getElementById('tourNextBtn').focus();
}

function moveTour(step) {
  if (tour.index + step >= TOUR_STOPS.length) return endTour();
  tour.index = Math.max(0, tour.index + step);
  showTourStop();
}

// Lights up the stop's part of the screen and puts the tip below it (or above, if there's no room).
function placeTourStop(stop) {
  const spot = document.getElementById('tourSpot');
  const tip = document.getElementById('tourTip');
  const node = stop.targets.map(sel => document.querySelector(sel)).find(n => n && n.getBoundingClientRect().width);
  if (!node) {
    spot.classList.add('none');
    tip.style.left = `${Math.max(12, (innerWidth - tip.offsetWidth) / 2)}px`;
    tip.style.top = `${Math.max(12, (innerHeight - tip.offsetHeight) / 2)}px`;
    return;
  }
  node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = node.getBoundingClientRect();
  const pad = 6;
  // Big things (like a card on a phone) are only lit up as far as the screen goes.
  const top = Math.max(4, r.top - pad);
  const bottom = Math.min(innerHeight - 4, r.bottom + pad);
  spot.classList.remove('none');
  Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${top}px`, width: `${r.width + pad * 2}px`, height: `${bottom - top}px` });
  const below = bottom + 12;
  const above = top - 12 - tip.offsetHeight;
  const y = below + tip.offsetHeight < innerHeight ? below : above > 0 ? above : innerHeight - tip.offsetHeight - 12;
  const x = Math.min(Math.max(12, r.left + r.width / 2 - tip.offsetWidth / 2), innerWidth - tip.offsetWidth - 12);
  tip.style.left = `${x}px`;
  tip.style.top = `${Math.max(12, y)}px`;
}

document.addEventListener('keydown', e => {
  if (!tour) return;
  if (e.key === 'Escape') endTour();
  if (e.key === 'ArrowRight') moveTour(1);
  if (e.key === 'ArrowLeft') moveTour(-1);
});
window.addEventListener('resize', () => { if (tour) showTourStop(); });

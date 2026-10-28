'use strict';

// ✅ Checklist tab: a self-review for a finished build. Each point links to the tip that
// explains it. Reviews can be saved to see how builds improve over time.

// [group, [[id, text, tip id], …]]
const CHECKLIST = [
  ['Shape', [
    ['shape', 'It isn\'t just a box: it has wings, different heights or an L or T shape.', 'shape'],
    ['centred', 'The door, windows and roof peak line up (odd widths).', 'odd-widths'],
  ]],
  ['Walls', [
    ['depth', 'Walls have depth: pillars, beams or windows set back.', 'depth'],
    ['palette', 'It uses a small palette of blocks that go together.', 'palette'],
    ['texture', 'Big walls mix similar blocks instead of one flat texture.', 'texture'],
    ['contrast', 'The frame stands out against the walls.', 'contrast'],
    ['foundation', 'It sits on a foundation, not straight on the grass.', 'foundation'],
  ]],
  ['Roof', [
    ['roof', 'The roof is steep and sticks out past the walls.', 'roofs'],
  ]],
  ['Details', [
    ['windows', 'Windows have frames, sills or shutters.', 'windows'],
    ['lighting', 'Lights fit the style, and it\'s bright enough that mobs can\'t spawn.', 'lighting'],
    ['interior', 'Rooms have furniture and things to look at.', 'interiors'],
  ]],
  ['Around it', [
    ['paths', 'Paths lead to the door and look natural.', 'paths'],
    ['nature', 'Trees, bushes or flowers make it feel lived in.', 'trees'],
  ]],
];
const CHECK_IDS = CHECKLIST.flatMap(([, items]) => items.map(([id]) => id));

function normalizeReview(r) {
  return {
    id: String(r?.id || uid()),
    name: String(r?.name || ''),
    checked: (Array.isArray(r?.checked) ? r.checked : []).filter(id => CHECK_IDS.includes(id)),
    date: Number(r?.date) || Date.now(),
  };
}

function reviewMessage(score, total) {
  const part = score / total;
  if (part === 1) return 'Masterpiece! 🏆';
  if (part >= 0.75) return 'Great build! Just a little polishing left.';
  if (part >= 0.4) return 'Nice! Open the tips for the unticked ones to make it even better.';
  return 'Good start. Pick one unticked point and open its tip.';
}

function renderChecklist() {
  const root = document.getElementById('tab-checklist');
  const review = state.review;
  const score = review.checked.length;
  const total = CHECK_IDS.length;

  setContent(root,
    sectionHead('Build checklist', 'Finished a build? Go through these points to spot what could be better. Each one links to the tip that explains it.'),
    el('div', { class: 'card review' },
      el('label', { class: 'field' }, 'What did you build?', el('input', {
        class: 'input', id: 'reviewName', placeholder: 'e.g. My starter house', value: review.name,
        oninput: e => { review.name = e.target.value; save(); },
      })),
      el('div', { class: 'progress-row' },
        el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': score },
          el('span', { style: { width: `${(score / total) * 100}%` } })),
        el('span', { class: 'progress-text', id: 'reviewScore' }, `${score} of ${total}`)),
      el('p', { class: 'review-message' }, reviewMessage(score, total)),
      ...CHECKLIST.map(([group, items]) => el('fieldset', { class: 'check-group' },
        el('legend', {}, group),
        ...items.map(([id, text, tipId]) => el('div', { class: `check-item${review.checked.includes(id) ? ' done' : ''}` },
          el('label', { class: 'check' }, el('input', {
            type: 'checkbox', 'data-check': id, checked: review.checked.includes(id),
            onchange: e => {
              review.checked = e.target.checked ? [...review.checked, id] : review.checked.filter(x => x !== id);
              save();
              renderChecklist();
            },
          }), el('span', {}, text)),
          el('button', { type: 'button', class: 'link-btn', 'data-tip': tipId, onclick: () => openTip(tipId) }, 'How? →'))))),
      el('div', { class: 'card-actions' },
        el('button', { type: 'button', class: 'btn primary', id: 'saveReviewBtn', onclick: () => {
          if (!review.name.trim() && !score) {
            toast('Tick some points first.');
            return;
          }
          state.reviews.unshift(normalizeReview({ ...review, id: uid(), name: review.name.trim() || 'My build', date: Date.now() }));
          state.review = normalizeReview({});
          save();
          renderChecklist();
          toast('Review saved. Ready for your next build!');
        } }, '💾 Save review'),
        el('button', { type: 'button', class: 'btn', id: 'startOverBtn', onclick: () => {
          if (score && !confirm('Untick everything and start again?')) return;
          state.review = normalizeReview({});
          save();
          renderChecklist();
        } }, 'Start over'))),
    state.reviews.length > 0 && el('h2', { class: 'subhead' }, 'Past reviews'),
    state.reviews.length > 0 && el('ul', { class: 'past-reviews' }, ...state.reviews.map(r => {
      const missed = CHECKLIST.flatMap(([, items]) => items).filter(([id]) => !r.checked.includes(id));
      return el('li', { class: 'card' },
        el('details', {},
          el('summary', {},
            el('strong', {}, r.name),
            el('span', { class: 'hint' }, ` · ${new Date(r.date).toLocaleDateString()} · `),
            el('span', { class: 'score' }, `${r.checked.length} of ${total}`)),
          missed.length
            ? el('div', {}, el('p', { class: 'hint' }, 'To work on next time:'),
              el('ul', { class: 'missed' }, ...missed.map(([, text, tipId]) => el('li', {},
                text, ' ', el('button', { type: 'button', class: 'link-btn', onclick: () => openTip(tipId) }, 'How? →')))))
            : el('p', {}, 'Everything ticked! 🏆'),
          el('button', { type: 'button', class: 'btn small danger', onclick: () => {
            if (!confirm(`Delete the review of "${r.name}"?`)) return;
            state.reviews = state.reviews.filter(x => x !== r);
            save();
            renderChecklist();
          } }, 'Delete review')));
    })),
  );
}

# Minecraft Build Helper

An app that teaches Minecraft building tricks and good practices (vanilla JS in the browser,
packaged for Windows with Electron).

## Rules from the owner

- **Never publish an update without asking first.** Wait for an explicit "publish" before
  running any publish workflow or pushing a release tag.
- **Offer a full bug test after big updates.** When a change adds or reworks a feature, remind
  the owner before publishing that a full bug test can be run, and do it if they say yes.
- Don't open or merge pull requests without asking.
- **Keep the app simple.** The owner doesn't want so many features that it gets overwhelming.
  Prefer polishing and fixing what's there over suggesting new features.

## Working on it

- One file per tab: `tips.js` (Learn, with the tips in `tips-data.js`), `palettes.js`,
  `inspiration.js`, `planner.js` (plan list and simple plans; the 3D block planner is
  `block-planner.js` and the 3D drawing is `view3d.js`), `checklist.js`. First-time setup is `setup.js` and the tour
  is `tour.js`. Blocks, palettes and gradients are in
  `blocks.js`; `app.js` has saving, tabs, settings and backups; photos are stored by `images.js`.
- `npm test` runs every browser test in `tests/` (`npm test -- <name>` runs one file). Set
  `CHROMIUM_PATH` to use a Chromium that's already installed. GitHub runs them on every push.
- Bump the version in `package.json` and `APP_VERSION` in `app.js`, and update
  `release-notes.md` and `README.md` for user-facing changes. Add new files to `sw.js`.
- Publishing (only after the owner says "publish"): bump the version, update the notes, push to
  `main`, then push a matching tag (`git tag v1.1.0 && git push origin v1.1.0`). The workflow
  tests, builds and puts the installer on this repo's Releases page with `release-notes.md`.
- Automatic updates aren't set up yet: they need a public releases repo first.

# Minecraft Build Helper

An app that teaches Minecraft building tricks and good practices.

- **📘 Learn**: 13 tip cards, each with a "common mistake" next to a "better" picture, why it
  works, how to do it, and something to try. Mark tips as learned to track your progress.
- **🎨 Palettes**: sets of blocks that go together, by style (medieval, Japanese, modern…).
  Start from a block you like to see palettes that use it, save favourites, and see texture
  gradients for mixing blocks.
- **🖼️ Inspiration**: save pictures of builds you like. Copy a picture and press Ctrl + V,
  drag photos in, or add files, then sort them into categories (and make your own).
- **📐 Planner**: sketch a build from above, floor by floor. Draw, erase, fill and undo, then
  see how many of each block you need (in stacks). Each plan has a to-do list and notes.
- **✅ Checklist**: go through a finished build point by point. Each point links to the tip
  that explains it, and saved reviews show what to work on next time.

The first time it opens, a short setup asks about your building experience (to pick tips for
you), the styles you like (to star their palettes) and light or dark mode, then offers a quick
tour of the app. Both can be run again from ⚙️ Settings.

Light and dark mode, works on phones, and everything can be saved to a backup file (⚙️ Settings).
The Windows installer lets you choose where to install the app.

## Running it

- In a browser: open `index.html`.
- As a desktop app: `npm install`, then `npm start`.
- Tests: `npm test` (runs every test in `tests/` in a real browser).

Every push to `main` runs the tests on GitHub and builds a Windows installer you can download
from the **Actions** page.

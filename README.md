# Minecraft Build Helper

An app that teaches Minecraft building tricks and good practices.

- **📘 Learn**: 13 tip cards, each with a "common mistake" next to a "better" picture, why it
  works, how to do it, and something to try. Mark tips as learned to track your progress.
- **🎨 Palettes**: sets of blocks that go together, by style (medieval, Japanese, modern…).
  Start from a block you like to see palettes that use it, save favourites, and see texture
  gradients for mixing blocks.
- **🖼️ Inspiration**: save pictures of builds you like. Copy a picture and press Ctrl + V,
  drag photos in, or add files, then sort them into categories (and make your own).
- **📐 Planner**, two kinds of plan:
  - **Simple plan**: decide what to build. Size, floors, style, block palette, photos from your
    Inspiration board, steps and notes, with a 3D size preview showing how wide, deep and high
    it will be. When you're ready, turn it into a 3D block plan.
  - **3D block plan**: place blocks layer by layer on a grid, with a 3D view beside it that you
    can turn and zoom. Pencil, line, rectangle, walls, circle, fill, eraser and pick-block tools,
    mirror for symmetrical builds, a hotbar of recent blocks (keys 1–9), copy layer up, undo and
    redo, and a list of the blocks you need (in stacks).
  - **Rulers**: numbered grid edges, a ruler tool that measures across, deep and high (click a
    block, change layer, click another), and the build's width, depth and height on the 3D view.
  - **Terrain**: draw what's already in your world (grass, water, sand, stone, trees, hills) to
    plan around. It shows in 3D but isn't counted in the blocks you need.
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

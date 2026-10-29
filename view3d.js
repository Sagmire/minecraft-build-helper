'use strict';

// 🧊 Draws a block plan in 3D on a canvas, from any angle. No libraries: each visible block face
// is drawn as a textured shape, from the back to the front, so nearer blocks cover further ones.

// Blocks drawn smaller than a full block (torches, flowers…), and blocks you can see through.
const SMALL_BLOCKS = new Set(['torch', 'lantern', 'chain', 'poppy', 'dandelion']);
const seeThrough = id => SMALL_BLOCKS.has(id) || BLOCKS[id]?.kind === 'glass';

// Each face: which way it points, its corners (top-left, top-right, bottom-right, bottom-left so
// textures stand upright) and how much shadow it gets.
const FACES = [
  { n: [0, 1, 0], c: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], shade: 0 },
  { n: [0, -1, 0], c: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]], shade: 0.5 },
  { n: [1, 0, 0], c: [[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 1]], shade: 0.2 },
  { n: [-1, 0, 0], c: [[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]], shade: 0.2 },
  { n: [0, 0, 1], c: [[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]], shade: 0.35 },
  { n: [0, 0, -1], c: [[1, 1, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0]], shade: 0.35 },
];

// yaw: turning around (radians). pitch: how far above the build you look from (0 = side on).
function viewAngles(yaw, pitch) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return {
    // Screen x, screen y and depth (bigger = nearer) of a point.
    project: (x, y, z) => {
      const xr = x * cy - z * sy;
      const zr = x * sy + z * cy;
      return [xr, -y * cp + zr * sp, zr * cp + y * sp];
    },
    eye: [sy * cp, sp, cy * cp],
  };
}

// Draws the plan. Options: yaw, pitch, zoom, upTo (hide layers above this one), mark (outline
// this layer), ground and line colours.
function renderBuild(canvas, plan, { yaw = -0.7, pitch = 0.6, zoom = 1, upTo = Infinity, mark = -1, ground = '#e9efe3', line = 'rgba(0,0,0,0.12)', markColor = '#4f7f2c' } = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  const n = plan.size;
  const shown = Math.min(plan.layers.length, upTo + 1);
  const view = viewAngles(yaw, pitch);
  // Fit the whole plan area (at least a few layers tall) on the canvas.
  const boxH = Math.max(plan.layers.length, 4);
  const centre = [n / 2, boxH / 2, n / 2];
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (const x of [0, n]) for (const y of [0, boxH]) for (const z of [0, n]) {
    const [sx, sy] = view.project(x - centre[0], y - centre[1], z - centre[2]);
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
  }
  const scale = Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.92 * zoom;
  const offX = w / 2 - ((minX + maxX) / 2) * scale;
  const offY = h / 2 - ((minY + maxY) / 2) * scale;
  const P = (x, y, z) => {
    const [sx, sy] = view.project(x - centre[0], y - centre[1], z - centre[2]);
    return [offX + sx * scale, offY + sy * scale];
  };
  const path = pts => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };

  // The ground: the plan area with a faint grid (only the 5-block lines when zoomed far out).
  path([P(0, 0, 0), P(n, 0, 0), P(n, 0, n), P(0, 0, n)]);
  ctx.fillStyle = ground;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  const step = scale > 7 ? 1 : 5;
  ctx.beginPath();
  for (let i = 0; i <= n; i += step) {
    ctx.moveTo(...P(i, 0, 0)); ctx.lineTo(...P(i, 0, n));
    ctx.moveTo(...P(0, 0, i)); ctx.lineTo(...P(n, 0, i));
  }
  ctx.stroke();

  // Collect the faces that face us and aren't hidden behind a neighbouring block.
  const get = (x, y, z) => (x < 0 || z < 0 || x >= n || z >= n || y < 0 || y >= shown ? '' : plan.layers[y].cells[z * n + x]);
  const faces = FACES.filter(f => f.n[0] * view.eye[0] + f.n[1] * view.eye[1] + f.n[2] * view.eye[2] > 0);
  const draw = [];
  for (let y = 0; y < shown; y++) {
    const cells = plan.layers[y].cells;
    for (let i = 0; i < cells.length; i++) {
      const id = cells[i];
      if (!id) continue;
      const x = i % n;
      const z = Math.floor(i / n);
      const small = SMALL_BLOCKS.has(id);
      for (const f of faces) {
        if (!small) {
          const next = get(x + f.n[0], y + f.n[1], z + f.n[2]);
          if (next && (!seeThrough(next) || next === id)) continue;
        }
        const depth = (x + 0.5 + f.n[0] * 0.5) * view.eye[0] + (y + 0.5 + f.n[1] * 0.5) * view.eye[1] + (z + 0.5 + f.n[2] * 0.5) * view.eye[2];
        draw.push([depth, x, y, z, f, id, small]);
      }
    }
  }
  draw.sort((a, b) => a[0] - b[0]);

  for (const [, x, y, z, f, id, small] of draw) {
    const corner = ([cx, cy, cz]) => (small
      ? P(x + 0.3 + cx * 0.4, y + cy * 0.55, z + 0.3 + cz * 0.4)
      : P(x + cx, y + cy, z + cz));
    const [p0, p1, , p3] = f.c.map(corner);
    // Stretch the 16 × 16 texture onto the face (slightly oversized to hide hairline gaps).
    ctx.setTransform(p1[0] - p0[0], p1[1] - p0[1], p3[0] - p0[0], p3[1] - p0[1], p0[0], p0[1]);
    ctx.drawImage(blockCanvas(id), -0.02, -0.02, 1.04, 1.04);
    if (f.shade) {
      ctx.fillStyle = `rgba(0,0,0,${f.shade})`;
      ctx.fillRect(-0.02, -0.02, 1.04, 1.04);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // An outline round the layer being edited, so the grid and the 3D view are easy to match up.
  if (mark >= 0) {
    path([P(0, mark, 0), P(n, mark, 0), P(n, mark, n), P(0, mark, n)]);
    ctx.strokeStyle = markColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  return draw.length;
}

'use strict';

// 🧱 Blocks: names, colours and little pixel textures drawn in the page, plus the block palettes
// and texture gradients shown on the Palettes tab. Colours are close to the game's, not exact.

// [id, name, colour, texture kind, group]
const BLOCK_LIST = [
  ['oak_planks', 'Oak planks', '#a2834f', 'planks', 'Wood'],
  ['spruce_planks', 'Spruce planks', '#735531', 'planks', 'Wood'],
  ['birch_planks', 'Birch planks', '#c0af79', 'planks', 'Wood'],
  ['jungle_planks', 'Jungle planks', '#a07351', 'planks', 'Wood'],
  ['acacia_planks', 'Acacia planks', '#a85a32', 'planks', 'Wood'],
  ['dark_oak_planks', 'Dark oak planks', '#42291a', 'planks', 'Wood'],
  ['mangrove_planks', 'Mangrove planks', '#763631', 'planks', 'Wood'],
  ['cherry_planks', 'Cherry planks', '#e2b2a6', 'planks', 'Wood'],
  ['bamboo_planks', 'Bamboo planks', '#c3ad53', 'planks', 'Wood'],
  ['crimson_planks', 'Crimson planks', '#653147', 'planks', 'Wood'],
  ['warped_planks', 'Warped planks', '#2b6963', 'planks', 'Wood'],
  ['oak_log', 'Oak log', '#6d5532', 'log', 'Wood'],
  ['spruce_log', 'Spruce log', '#3b2610', 'log', 'Wood'],
  ['birch_log', 'Birch log', '#d8d7d2', 'log', 'Wood'],
  ['dark_oak_log', 'Dark oak log', '#3c2e1a', 'log', 'Wood'],
  ['cherry_log', 'Cherry log', '#36202a', 'log', 'Wood'],
  ['stripped_oak_log', 'Stripped oak log', '#b29157', 'log', 'Wood'],
  ['stripped_spruce_log', 'Stripped spruce log', '#745a34', 'log', 'Wood'],
  ['stripped_birch_log', 'Stripped birch log', '#c4b07b', 'log', 'Wood'],
  ['stripped_dark_oak_log', 'Stripped dark oak log', '#483824', 'log', 'Wood'],
  ['spruce_trapdoor', 'Spruce trapdoor', '#5a4026', 'planks', 'Wood'],
  ['bookshelf', 'Bookshelf', '#6b4e2e', 'books', 'Wood'],

  ['stone', 'Stone', '#7d7d7d', 'plain', 'Stone'],
  ['cobblestone', 'Cobblestone', '#6f6f6f', 'cobble', 'Stone'],
  ['mossy_cobblestone', 'Mossy cobblestone', '#5f6e4c', 'cobble', 'Stone'],
  ['stone_bricks', 'Stone bricks', '#8b8b8b', 'bricks', 'Stone'],
  ['mossy_stone_bricks', 'Mossy stone bricks', '#737960', 'bricks', 'Stone'],
  ['cracked_stone_bricks', 'Cracked stone bricks', '#767575', 'bricks', 'Stone'],
  ['smooth_stone', 'Smooth stone', '#9e9e9e', 'smooth', 'Stone'],
  ['andesite', 'Andesite', '#a2a2a4', 'plain', 'Stone'],
  ['polished_andesite', 'Polished andesite', '#84868a', 'smooth', 'Stone'],
  ['diorite', 'Diorite', '#bdbcbd', 'plain', 'Stone'],
  ['polished_diorite', 'Polished diorite', '#c1c1c3', 'smooth', 'Stone'],
  ['granite', 'Granite', '#956755', 'plain', 'Stone'],
  ['polished_granite', 'Polished granite', '#9a6a59', 'smooth', 'Stone'],
  ['calcite', 'Calcite', '#dfe0dc', 'plain', 'Stone'],
  ['tuff', 'Tuff', '#6c6d66', 'plain', 'Stone'],
  ['tuff_bricks', 'Tuff bricks', '#62675f', 'bricks', 'Stone'],
  ['deepslate', 'Deepslate', '#505053', 'plain', 'Stone'],
  ['cobbled_deepslate', 'Cobbled deepslate', '#4d4d50', 'cobble', 'Stone'],
  ['deepslate_bricks', 'Deepslate bricks', '#474747', 'bricks', 'Stone'],
  ['deepslate_tiles', 'Deepslate tiles', '#363637', 'tiles', 'Stone'],
  ['polished_deepslate', 'Polished deepslate', '#484849', 'smooth', 'Stone'],
  ['blackstone', 'Blackstone', '#2a2329', 'plain', 'Stone'],
  ['polished_blackstone_bricks', 'Polished blackstone bricks', '#302b32', 'bricks', 'Stone'],

  ['bricks', 'Bricks', '#966153', 'bricks', 'Bricks & clay'],
  ['mud_bricks', 'Mud bricks', '#8a6a4f', 'bricks', 'Bricks & clay'],
  ['packed_mud', 'Packed mud', '#8e6b50', 'plain', 'Bricks & clay'],
  ['sandstone', 'Sandstone', '#d8cb9b', 'smooth', 'Bricks & clay'],
  ['smooth_sandstone', 'Smooth sandstone', '#e0d6aa', 'smooth', 'Bricks & clay'],
  ['cut_sandstone', 'Cut sandstone', '#d9cd9f', 'tiles', 'Bricks & clay'],
  ['red_sandstone', 'Red sandstone', '#ba631d', 'smooth', 'Bricks & clay'],
  ['terracotta', 'Terracotta', '#985e43', 'plain', 'Bricks & clay'],
  ['white_terracotta', 'White terracotta', '#d1b2a1', 'plain', 'Bricks & clay'],
  ['quartz_block', 'Quartz block', '#ece6df', 'smooth', 'Bricks & clay'],
  ['smooth_quartz', 'Smooth quartz', '#ebe5de', 'smooth', 'Bricks & clay'],
  ['nether_bricks', 'Nether bricks', '#2c1519', 'bricks', 'Bricks & clay'],
  ['red_nether_bricks', 'Red nether bricks', '#460709', 'bricks', 'Bricks & clay'],
  ['end_stone_bricks', 'End stone bricks', '#dadea2', 'bricks', 'Bricks & clay'],
  ['prismarine', 'Prismarine', '#63a29a', 'plain', 'Bricks & clay'],
  ['dark_prismarine', 'Dark prismarine', '#335b4b', 'tiles', 'Bricks & clay'],

  ['white_concrete', 'White concrete', '#cfd5d6', 'smooth', 'Colourful'],
  ['light_gray_concrete', 'Light gray concrete', '#7d7d73', 'smooth', 'Colourful'],
  ['gray_concrete', 'Gray concrete', '#36393d', 'smooth', 'Colourful'],
  ['black_concrete', 'Black concrete', '#080a0f', 'smooth', 'Colourful'],
  ['white_wool', 'White wool', '#e9ecec', 'wool', 'Colourful'],
  ['red_wool', 'Red wool', '#a12722', 'wool', 'Colourful'],
  ['yellow_wool', 'Yellow wool', '#f8c527', 'wool', 'Colourful'],
  ['lime_wool', 'Lime wool', '#70b919', 'wool', 'Colourful'],
  ['blue_wool', 'Blue wool', '#35399d', 'wool', 'Colourful'],
  ['pink_wool', 'Pink wool', '#ed8dac', 'wool', 'Colourful'],
  ['cyan_wool', 'Cyan wool', '#158991', 'wool', 'Colourful'],

  ['copper_block', 'Copper block', '#c06c50', 'smooth', 'Metal'],
  ['exposed_copper', 'Exposed copper', '#a17e68', 'smooth', 'Metal'],
  ['weathered_copper', 'Weathered copper', '#6d9a6c', 'smooth', 'Metal'],
  ['oxidized_copper', 'Oxidized copper', '#52a284', 'smooth', 'Metal'],
  ['iron_block', 'Iron block', '#dcdcdc', 'smooth', 'Metal'],
  ['chain', 'Chain', '#3a3f4a', 'plain', 'Metal'],

  ['grass_block', 'Grass block', '#5d8c3a', 'grass', 'Nature'],
  ['dirt', 'Dirt', '#866043', 'plain', 'Nature'],
  ['coarse_dirt', 'Coarse dirt', '#77553b', 'plain', 'Nature'],
  ['dirt_path', 'Dirt path', '#947a41', 'plain', 'Nature'],
  ['gravel', 'Gravel', '#837f7e', 'cobble', 'Nature'],
  ['sand', 'Sand', '#dbcfa3', 'plain', 'Nature'],
  ['moss_block', 'Moss block', '#596e2d', 'grass', 'Nature'],
  ['podzol', 'Podzol', '#5b3d18', 'plain', 'Nature'],
  ['snow', 'Snow', '#f4f9fa', 'plain', 'Nature'],
  ['water', 'Water', '#3f76e4', 'water', 'Nature'],
  ['oak_leaves', 'Oak leaves', '#3f7a2a', 'leaves', 'Nature'],
  ['birch_leaves', 'Birch leaves', '#5a9a35', 'leaves', 'Nature'],
  ['spruce_leaves', 'Spruce leaves', '#2f5233', 'leaves', 'Nature'],
  ['azalea_leaves', 'Azalea leaves', '#5a7329', 'leaves', 'Nature'],
  ['cherry_leaves', 'Cherry leaves', '#e5adc2', 'leaves', 'Nature'],
  ['hay_bale', 'Hay bale', '#b8961c', 'log', 'Nature'],
  ['poppy', 'Poppy', '#c8302a', 'flower', 'Nature'],
  ['dandelion', 'Dandelion', '#f2d23a', 'flower', 'Nature'],

  ['glass', 'Glass', '#c8e6ef', 'glass', 'Glass & light'],
  ['torch', 'Torch', '#ffb030', 'light', 'Glass & light'],
  ['lantern', 'Lantern', '#f6c445', 'light', 'Glass & light'],
  ['glowstone', 'Glowstone', '#d4a85a', 'light', 'Glass & light'],
  ['sea_lantern', 'Sea lantern', '#d6e6e0', 'light', 'Glass & light'],
];

const BLOCKS = Object.fromEntries(BLOCK_LIST.map(([id, name, color, kind, group]) => [id, { id, name, color, kind, group }]));
const BLOCK_GROUPS = [...new Set(BLOCK_LIST.map(b => b[4]))];

function blockName(id) {
  return BLOCKS[id]?.name || id;
}

// ---------- Block palettes ----------
// Each block has a role, so people know where it goes on a build.
const PALETTES = [
  { id: 'medieval', name: 'Medieval village', style: 'Medieval',
    blocks: [['cobblestone', 'Base'], ['spruce_log', 'Frame'], ['oak_planks', 'Walls'], ['dark_oak_planks', 'Roof'], ['stone_bricks', 'Accent']],
    why: 'A stone base, dark wooden frame and warm walls: the classic village look. The dark roof ties it all together.' },
  { id: 'tudor', name: 'Tudor cottage', style: 'Medieval',
    blocks: [['stone_bricks', 'Base'], ['dark_oak_log', 'Frame'], ['calcite', 'Walls'], ['deepslate_tiles', 'Roof'], ['spruce_trapdoor', 'Shutters']],
    why: 'Strong contrast: dark beams on white walls make every line of the build stand out.' },
  { id: 'cabin', name: 'Rustic cabin', style: 'Rustic',
    blocks: [['mossy_cobblestone', 'Base'], ['spruce_log', 'Frame'], ['spruce_planks', 'Walls'], ['dark_oak_planks', 'Roof'], ['stripped_spruce_log', 'Accent']],
    why: 'Warm browns from the same wood family, with moss at the bottom so it looks like it has stood in the forest for years.' },
  { id: 'barn', name: 'Red barn', style: 'Rustic',
    blocks: [['cobblestone', 'Base'], ['stripped_birch_log', 'Trim'], ['mangrove_planks', 'Walls'], ['dark_oak_planks', 'Roof'], ['hay_bale', 'Details']],
    why: 'Red walls with pale trim is the classic farm look. Hay bales add a lived-in touch.' },
  { id: 'nordic', name: 'Nordic longhouse', style: 'Nordic',
    blocks: [['cobbled_deepslate', 'Base'], ['spruce_log', 'Frame'], ['spruce_planks', 'Walls'], ['dark_oak_planks', 'Roof'], ['moss_block', 'Roof edges']],
    why: 'Dark, heavy materials that suit snowy and cold places. Moss on the roof edges makes it look old.' },
  { id: 'castle', name: 'Stone castle', style: 'Castle',
    blocks: [['cobblestone', 'Base'], ['stone_bricks', 'Walls'], ['andesite', 'Texture'], ['mossy_stone_bricks', 'Weathering'], ['deepslate_tiles', 'Roof'], ['spruce_planks', 'Gates & floors']],
    why: 'Several greys mixed together make big castle walls look ancient instead of flat.' },
  { id: 'dark-fortress', name: 'Dark fortress', style: 'Castle',
    blocks: [['blackstone', 'Base'], ['polished_blackstone_bricks', 'Walls'], ['deepslate_bricks', 'Texture'], ['crimson_planks', 'Accent'], ['lantern', 'Light']],
    why: 'Very dark blocks with a deep red accent feel spooky. Warm lanterns stop it looking like a black blob.' },
  { id: 'japanese', name: 'Japanese house', style: 'Japanese',
    blocks: [['polished_andesite', 'Base'], ['stripped_dark_oak_log', 'Frame'], ['white_wool', 'Paper walls'], ['deepslate_tiles', 'Roof'], ['cherry_planks', 'Accent']],
    why: 'White "paper" walls in dark frames, a dark sweeping roof and a soft pink accent.' },
  { id: 'cherry', name: 'Cherry blossom', style: 'Japanese',
    blocks: [['cherry_log', 'Frame'], ['cherry_planks', 'Walls'], ['calcite', 'Trim'], ['deepslate_tiles', 'Roof'], ['cherry_leaves', 'Plants']],
    why: 'Pink wood, white trim and a dark roof. Lovely in a cherry grove.' },
  { id: 'modern', name: 'Modern house', style: 'Modern',
    blocks: [['white_concrete', 'Walls'], ['smooth_quartz', 'Trim'], ['gray_concrete', 'Accent'], ['glass', 'Windows'], ['birch_planks', 'Wood panels'], ['smooth_stone', 'Ground']],
    why: 'Clean white with big windows and one wood accent. Keep the shapes simple and boxy: that is the style.' },
  { id: 'desert', name: 'Desert town', style: 'Desert',
    blocks: [['sandstone', 'Walls'], ['cut_sandstone', 'Trim'], ['smooth_sandstone', 'Floors'], ['terracotta', 'Roof'], ['acacia_planks', 'Doors & beams']],
    why: 'Sandy colours that blend into the desert, with orange terracotta and acacia for warmth.' },
  { id: 'elven', name: 'Elven / fantasy', style: 'Fantasy',
    blocks: [['calcite', 'Walls'], ['stripped_birch_log', 'Frame'], ['birch_planks', 'Floors'], ['dark_prismarine', 'Roof'], ['moss_block', 'Plants'], ['oxidized_copper', 'Details']],
    why: 'Pale walls with blue-green roofs and old copper feel light and magical.' },
  { id: 'coastal', name: 'Beach house', style: 'Coastal',
    blocks: [['smooth_sandstone', 'Base'], ['stripped_birch_log', 'Frame'], ['birch_planks', 'Walls'], ['warped_planks', 'Accent'], ['dark_prismarine', 'Roof']],
    why: 'Light, sun-bleached wood with sea-coloured accents.' },
  { id: 'industrial', name: 'Industrial / steampunk', style: 'Industrial',
    blocks: [['bricks', 'Walls'], ['copper_block', 'Pipes & trim'], ['weathered_copper', 'Aged copper'], ['deepslate_tiles', 'Roof'], ['dark_oak_planks', 'Floors'], ['chain', 'Details']],
    why: 'Red bricks with copper that ages from orange to green. Perfect for factories and workshops.' },
];

const PALETTE_STYLES = [...new Set(PALETTES.map(p => p.style))];

// Blocks that blend from one to the next, for mixing texture into walls, floors and paths.
const GRADIENTS = [
  { name: 'Old stone wall', blocks: ['stone_bricks', 'andesite', 'cobblestone', 'mossy_cobblestone'], use: 'Walls and castles: clean at the top, mossy near the ground.' },
  { name: 'Dark stone', blocks: ['polished_deepslate', 'deepslate_tiles', 'cobbled_deepslate', 'blackstone'], use: 'Foundations and dark towers.' },
  { name: 'Wood, light to dark', blocks: ['birch_planks', 'oak_planks', 'spruce_planks', 'dark_oak_planks'], use: 'Floors and roofs that fade from light to dark.' },
  { name: 'Worn path', blocks: ['grass_block', 'dirt_path', 'coarse_dirt', 'gravel'], use: 'Paths that blend into the grass.' },
  { name: 'Sand and clay', blocks: ['smooth_sandstone', 'sandstone', 'sand', 'terracotta'], use: 'Desert builds and beaches.' },
  { name: 'Ageing copper', blocks: ['copper_block', 'exposed_copper', 'weathered_copper', 'oxidized_copper'], use: 'Roofs and pipes that look old.' },
];

// ---------- Textures ----------
// A 16×16 pixel picture for each block, made from its colour with a pattern for its kind.
const textureCanvases = new Map();
const textureUrls = new Map();
const BOOK_COLORS = ['#7a2e2a', '#2f4f7a', '#3f6b35', '#a88a3a'];

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function hashString(s) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  return h || 1;
}

function blockCanvas(id) {
  if (textureCanvases.has(id)) return textureCanvases.get(id);
  const b = BLOCKS[id] || BLOCKS.stone;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(16, 16);
  const base = hexRgb(b.color);
  const grass = hexRgb(BLOCKS.grass_block.color);
  let seed = hashString(id);
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let f = 1 + (rand() - 0.5) * 0.14;
      let alpha = 255;
      let rgb = base;
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      switch (b.kind) {
        case 'planks':
          if (y % 4 === 3) f *= 0.78;
          else if (x === (Math.floor(y / 4) * 7 + 3) % 16) f *= 0.84;
          break;
        case 'log':
          f *= x % 4 === 0 ? 0.78 : x % 4 === 2 ? 0.92 : 1;
          break;
        case 'bricks':
          if (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 7) f *= 0.72;
          break;
        case 'tiles':
          if (y % 8 === 7 || x % 8 === 7) f *= 0.7;
          break;
        case 'cobble':
          f = 1 + (rand() - 0.5) * 0.45;
          break;
        case 'smooth':
          f = 1 + (rand() - 0.5) * 0.05;
          if (x === 0 || y === 0) f *= 1.06;
          if (x === 15 || y === 15) f *= 0.9;
          break;
        case 'leaves':
          f = rand() < 0.2 ? 0.6 : 1 + (rand() - 0.5) * 0.4;
          break;
        case 'grass':
          f = 1 + (rand() - 0.5) * 0.3;
          break;
        case 'books':
          if (!(y < 2 || y > 13 || y === 7 || y === 8)) rgb = hexRgb(BOOK_COLORS[((x >> 1) + (y > 7 ? 3 : 0)) % 4]);
          if (x % 2 === 1 && !(y < 2 || y > 13 || y === 7 || y === 8)) f *= 0.8;
          break;
        case 'glass':
          alpha = edge ? 255 : (x === y + 3 || x === y + 4) ? 170 : 80;
          f = edge ? 1.02 : 1.15;
          break;
        case 'light': {
          const d = Math.hypot(x - 7.5, y - 7.5);
          f = d < 4 ? 1.3 : d < 6 ? 1.05 : 0.55;
          break;
        }
        case 'water':
          f = 1 + Math.sin((x + y * 2) / 3) * 0.08 + (rand() - 0.5) * 0.05;
          alpha = 200;
          break;
        case 'flower': {
          const d = Math.hypot(x - 7.5, y - 7.5);
          if (d >= 4.5) { rgb = grass; f = 1 + (rand() - 0.5) * 0.3; }
          else if (d < 1.5) rgb = [240, 220, 90];
          break;
        }
        default:
          f = 1 + (rand() - 0.5) * 0.2;
      }
      const i = (y * 16 + x) * 4;
      for (let c = 0; c < 3; c++) img.data[i + c] = Math.max(0, Math.min(255, Math.round(rgb[c] * f)));
      img.data[i + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  textureCanvases.set(id, canvas);
  return canvas;
}

function blockTextureUrl(id) {
  if (!textureUrls.has(id)) textureUrls.set(id, blockCanvas(id).toDataURL());
  return textureUrls.get(id);
}

// A small square picture of a block.
function swatch(id, extraClass = '') {
  return el('span', {
    class: `swatch ${extraClass}`.trim(), title: blockName(id), 'aria-hidden': 'true',
    style: { backgroundImage: `url(${blockTextureUrl(id)})` },
  });
}

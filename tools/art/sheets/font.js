// font-5x7.png — ~40 glyphs, 1-px outline BAKED IN, two colour variants.
//
// Glyph bit patterns are kept IDENTICAL to src/ui/font.js's GLYPHS table
// (duplicated here rather than imported, since this lane must not import
// from src/ — see the file header there for the citations behind each
// letterform: dotted lowercase i, T's kicked foot, flat-topped A, all read
// off 4x crops of reference/stage2-start-bonus-tally-t124.png and
// reference/stage3-night-level-t175.png). The critique's win here isn't a
// shape redesign — presentation-r5 already fixed the shapes — it's BAKING
// the 1px keyline into pixel data instead of a second fillRect pass, so a
// sheet face can `paint()` a glyph in one blit with the outline guaranteed
// pixel-exact at every scale, per font.js's own FACE seam contract.
//
// OUTLINE STYLE: a full 8-neighbour ring at native 5x7 resolution overwhelms
// this font's mostly-1px-wide strokes — tried it first (see git history of
// this file / the delivery report), and at 1:1 scale the outline colour
// outnumbers the fill colour on almost every glyph, reading as solid blocks
// rather than letters. Switched to font.js's own SHADOW_OFFSETS idiom
// instead ([1,0],[0,1],[1,1] — right+below+corner only), which is what the
// header comment there says is the ARCADE'S OWN measured technique (t116's
// SCORE digits carry black only right-and-below each stroke, never left) —
// so this is more arcade-faithful, not just a workaround. It also fits the
// inventory's 6x8 cell exactly: 5+1 wide, 7+1 tall, no margin needed on the
// left/top.
import { PixelCanvas } from '../canvas.js';
import { HUD } from '../palettes.js';

const GLYPHS = {
  0: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  1: ['..##.', '.###.', '..##.', '..##.', '..##.', '..##.', '.####'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.##..', '.....', '.##..', '.##..', '.##..', '.##..', '.##..'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..###'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  J: ['....#', '....#', '....#', '....#', '#...#', '#...#', '.###.'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
};

export const GLYPH_ORDER = Object.keys(GLYPHS);
const GLYPH_W = 5, GLYPH_H = 7;
const CELL_W = 6, CELL_H = 8; // 5+1 right shadow col, 7+1 bottom shadow row
const SHADOW_OFFSETS = [[1, 0], [0, 1], [1, 1]];

function drawGlyph(canvas, ox, oy, ch, fillHex, shadowHex) {
  const rows = GLYPHS[ch];
  // Shadow pass first (so the fill pass below always wins where they'd
  // otherwise overlap on an adjacent stroke), then the fill on top.
  for (let y = 0; y < GLYPH_H; y++) {
    for (let x = 0; x < GLYPH_W; x++) {
      if (rows[y][x] !== '#') continue;
      for (const [dx, dy] of SHADOW_OFFSETS) canvas.set(ox + x + dx, oy + y + dy, shadowHex);
    }
  }
  for (let y = 0; y < GLYPH_H; y++) {
    for (let x = 0; x < GLYPH_W; x++) {
      if (rows[y][x] === '#') canvas.set(ox + x, oy + y, fillHex);
    }
  }
}

function buildVariant(fillHex, outlineHex, label) {
  const sheet = new PixelCanvas(CELL_W * GLYPH_ORDER.length, CELL_H);
  GLYPH_ORDER.forEach((ch, i) => drawGlyph(sheet, i * CELL_W, 0, ch, fillHex, outlineHex));
  sheet.assertPalette(3, label);
  return sheet;
}

export function buildFontCreamSheet() {
  return buildVariant(HUD.cream, HUD.outline, 'font-5x7-cream');
}

export function buildFontRedSheet() {
  return buildVariant(HUD.red, HUD.outline, 'font-5x7-red');
}

// Combined sheet per the inventory: one PNG, two rows — row 0 cream-on-dark,
// row 1 red-on-light. Both rows share the same column->glyph mapping
// (GLYPH_ORDER), so a loader can index row*CELL_H + col*CELL_W either way.
export function buildFontSheet() {
  const cream = buildFontCreamSheet();
  const red = buildFontRedSheet();
  const sheet = new PixelCanvas(cream.width, CELL_H * 2);
  sheet.blit(cream, 0, 0);
  sheet.blit(red, 0, CELL_H);
  sheet.assertPalette(5, 'font-5x7');
  return sheet;
}

export { CELL_W, CELL_H, GLYPH_W, GLYPH_H };

// ============================ UNUSED. READ THIS FIRST. ============================
// R7: THIS MODULE IS DEAD CODE AND EDITING IT CHANGES NOTHING ON SCREEN.
//
// Nothing imports it, tools/art/build.js does not list it, and there is no
// src/assets/sprites/title-logo.png. The title wordmark the game actually
// draws lives in src/ui/titleFont.js (glyph outlines) and
// src/game/flow/titleScreen.js (layout and placement), which are the Player &
// HUD lane's files, not the sprite lane's.
//
// It is left in place rather than deleted because deleting another round's
// work unasked is not this lane's call -- but it is a SECOND COPY of the
// wordmark, which is the exact defect class R6 spent a day removing from the
// enemy palettes ("a drifted fallback is invisible precisely because the
// fallback only runs where nobody captures"). The two copies have ALREADY
// diverged: this file's cap height is 42 px for both words, and so is
// titleFont.js's -- but the arcade's are 47.6 and 54.1, and whoever fixes
// that must fix titleFont.js, not this.
//
// R7's measurement of the arcade's letterforms, with the operator, is in
// judging/R7/lane-sprite-art.md §4 and the hand-over spec is in
// judging/R7/ask-sprite-art.md. Either wire this module up and delete
// titleFont.js's glyphs, or delete this file -- do not edit both.
// =================================================================================
// title-logo.png — 228x91, "AFTER" / "BURNER" wordmark, one image, colours
// baked per letter (leading A blue, leading B red, rest cream), transparent
// background. Dimensions and colours per presentation-r5's corrected
// measurement (not the critique's original 280x90 guess): BURNER spans
// 71.6%W of 320 = 229px, AFTER 57.9%W; cap height 42, read off
// reference/title-screen-t74.png at its native 2.144x upscale factor.
//
// Original drawing per ARCHITECTURE.md D5 — NOT a trace of t74. The arcade
// logo is hand-calligraphed brush lettering with cut corners and variable
// stroke weight; this is a bold block-caps interpretation built from
// unioned rectangle/polygon strokes (fast, systematic, legible at this
// size), not an attempt to reproduce the calligraphy stroke-for-stroke.
// Flagged honestly in the delivery report as a simplified first pass, not
// a finished match to the brush lettering.
import { PixelCanvas } from '../canvas.js';

const CANVAS_W = 228, CANVAS_H = 91;
const CAP_H = 140; // local units; scaled to 42px cap height
const SCALE = 42 / CAP_H;
const T = 34; // stroke thickness, local units

// Each letter: { w, polys: [{pts, hole}] }. pts in local (0..w, 0..CAP_H).
const LETTERS = {
  A: {
    w: 120,
    polys: [
      { pts: [[60, 0], [120, 140], [0, 140]] },
      { pts: [[60, 34], [94, 95], [26, 95]], hole: true },
    ],
  },
  F: {
    w: 90,
    polys: [
      { pts: [[0, 0], [T, 0], [T, 140], [0, 140]] },
      { pts: [[0, 0], [90, 0], [90, T], [0, T]] },
      { pts: [[0, 55], [68, 55], [68, 55 + T], [0, 55 + T]] },
    ],
  },
  T: {
    w: 100,
    polys: [
      { pts: [[0, 0], [100, 0], [100, T], [0, T]] },
      { pts: [[33, 0], [67, 0], [67, 140], [33, 140]] },
    ],
  },
  E: {
    w: 90,
    polys: [
      { pts: [[0, 0], [T, 0], [T, 140], [0, 140]] },
      { pts: [[0, 0], [90, 0], [90, T], [0, T]] },
      { pts: [[0, 53], [74, 53], [74, 53 + T], [0, 53 + T]] },
      { pts: [[0, 140 - T], [90, 140 - T], [90, 140], [0, 140]] },
    ],
  },
  R: {
    w: 100,
    polys: [
      { pts: [[0, 0], [T, 0], [T, 140], [0, 140]] },
      { pts: [[0, 0], [88, 0], [88, T], [0, T]] },
      { pts: [[88 - T, 0], [88, 0], [88, 75], [88 - T, 75]] },
      { pts: [[0, 75 - T], [88, 75 - T], [88, 75], [0, 75]] },
      { pts: [[T, 75], [T + 36, 75], [100, 140], [100 - T, 140]] },
    ],
  },
  B: {
    w: 95,
    polys: [
      { pts: [[0, 0], [T, 0], [T, 140], [0, 140]] },
      { pts: [[0, 0], [85, 0], [85, T], [0, T]] },
      { pts: [[0, 68 - T / 2], [85, 68 - T / 2], [85, 68 + T / 2], [0, 68 + T / 2]] },
      { pts: [[0, 140 - T], [90, 140 - T], [90, 140], [0, 140]] },
      { pts: [[85 - T, 0], [85, 0], [85, 68], [85 - T, 68]] },
      { pts: [[90 - T, 68], [90, 68], [90, 140], [90 - T, 140]] },
    ],
  },
  U: {
    w: 100,
    polys: [
      { pts: [[0, 0], [T, 0], [T, 140], [0, 140]] },
      { pts: [[100 - T, 0], [100, 0], [100, 140], [100 - T, 140]] },
      { pts: [[0, 140 - T], [100, 140 - T], [100, 140], [0, 140]] },
    ],
  },
  N: {
    w: 100,
    polys: [
      { pts: [[0, 0], [T, 0], [T, 140], [0, 140]] },
      { pts: [[100 - T, 0], [100, 0], [100, 140], [100 - T, 140]] },
      { pts: [[0, 0], [T, 0], [100, 140], [100 - T, 140]] },
    ],
  },
};

const GAP = 15;

function layoutWidth(word) {
  let w = 0;
  for (const ch of word) w += LETTERS[ch].w + GAP;
  return w - GAP;
}

function drawWord(canvas, word, originX, originY, colourFor) {
  let cursor = originX;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const letter = LETTERS[ch];
    const fill = colourFor(i);
    for (const { pts, hole } of letter.polys) {
      const scaled = pts.map(([x, y]) => [cursor + x * SCALE, originY + y * SCALE]);
      canvas.polygon(scaled, hole ? null : fill);
    }
    cursor += (letter.w + GAP) * SCALE;
  }
  return cursor - GAP * SCALE;
}

const BLUE = '#0096fb';
const RED = '#ff1600';
const CREAM = '#f7f7f7'; // nearest ladder step to presentation-r5's #f5f2f6
const KEYLINE = '#000000';

export function buildTitleLogoSheet() {
  const canvas = new PixelCanvas(CANVAS_W, CANVAS_H);

  const afterW = layoutWidth('AFTER') * SCALE;
  const burnerW = layoutWidth('BURNER') * SCALE;
  const afterX = (CANVAS_W - afterW) / 2;
  const burnerX = (CANVAS_W - burnerW) / 2;

  drawWord(canvas, 'AFTER', afterX, 0, (i) => (i === 0 ? BLUE : CREAM));
  drawWord(canvas, 'BURNER', burnerX, 49, (i) => (i === 0 ? RED : CREAM));

  canvas.outline4(KEYLINE);
  canvas.assertPalette(8, 'title-logo');
  return canvas;
}

export { LETTERS, CANVAS_W, CANVAS_H };

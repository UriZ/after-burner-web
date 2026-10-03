// Display face for the AFTER BURNER title wordmark. ORIGINAL pixel art in
// the arcade's idiom (ARCHITECTURE.md D5) — these glyph grids were drawn by
// hand against a 3x crop of reference/title-screen-t74.png, not traced from
// or extracted out of any SEGA asset.
//
// WHY A SECOND FONT. judging/R4 gap 8: "the letterforms are plain blocky
// sans where the arcade's are angular/italic". The HUD's 5x7 grid cannot
// carry the title face at all — AB2's wordmark is a brush/calligraphic
// display face whose identity is in features a 5-column cell has no room
// for: strokes about a third of the letter's width, terminals cut on steep
// diagonals, small angular counters, and letters as wide as they are tall.
// 11x14 is the smallest grid that holds all four.
//
// SIZING, measured off t74 (686x480, a 2.144x upscale of the 320x224 the
// arcade board actually runs):
//   "AFTER"  x[150,546] = 57.9%W, y[109,199]  -> cap height 91 ref px
//   "BURNER" x[99,589]  = 71.6%W, y[215,329]
// 91 ref px / 2.144 = 42.4 native px of cap height -> 14 rows at scale 3.
// Advance is 13 cells * 3 = 39 native px, which puts BURNER at 231 native
// px against the measured 229 (+1%) and AFTER at 192 against 185 (+4%).
const TITLE_GLYPHS = {
  // Rounded apex arching right into a full-height right stem, crossbar at
  // 50%, splayed left leg — t74 x[150,235].
  A: [
    '....#####..',
    '...#######.',
    '..####.####',
    '..###...###',
    '.####...###',
    '.###....###',
    '.###....###',
    '.##########',
    '.##########',
    '####....###',
    '###.....###',
    '###.....###',
    '###.....###',
    '###.....###',
  ],
  // Top arm with its right end cut back on a diagonal; short middle arm.
  F: [
    '##########.',
    '###########',
    '####...####',
    '####....###',
    '####.......',
    '#########..',
    '#########..',
    '########...',
    '####.......',
    '####.......',
    '####.......',
    '####.......',
    '####.......',
    '###........',
  ],
  // Full-width head bar notched at both ends, thick stem flaring at the foot.
  T: [
    '###########',
    '###########',
    '#...####..#',
    '...####....',
    '...####....',
    '...####....',
    '...####....',
    '...####....',
    '...####....',
    '...####....',
    '...####....',
    '...####....',
    '..#####....',
    '..#####....',
  ],
  E: [
    '##########.',
    '###########',
    '####...####',
    '####.......',
    '####.......',
    '#########..',
    '#########..',
    '########...',
    '####.......',
    '####.......',
    '####....###',
    '###########',
    '##########.',
    '#########..',
  ],
  // Angular bowl over a diagonal leg kicking out to the right.
  R: [
    '#########..',
    '##########.',
    '####....###',
    '####....###',
    '####....###',
    '####...###.',
    '##########.',
    '#########..',
    '####.###...',
    '####..###..',
    '####...###.',
    '####...###.',
    '####....###',
    '###.....###',
  ],
  B: [
    '#########..',
    '##########.',
    '####....###',
    '####....###',
    '####....###',
    '##########.',
    '##########.',
    '####....###',
    '####.....##',
    '####.....##',
    '####.....##',
    '####....###',
    '##########.',
    '#########..',
  ],
  U: [
    '####...####',
    '####...####',
    '####...####',
    '####...####',
    '####...####',
    '####...####',
    '####...####',
    '####...####',
    '####...####',
    '####...####',
    '####...####',
    '.###...###.',
    '.##########',
    '..########.',
  ],
  N: [
    '####....###',
    '####....###',
    '#####...###',
    '#####...###',
    '######..###',
    '######..###',
    '###.###.###',
    '###.###.###',
    '###..######',
    '###..######',
    '###...#####',
    '###...#####',
    '###....####',
    '###....####',
  ],
};

export const TITLE_GLYPH_W = 11;
export const TITLE_GLYPH_H = 14;
const ADVANCE_CELLS = TITLE_GLYPH_W + 2; // 13 — see the sizing note above

export function titleTextWidth(text, scale) {
  const n = String(text).length;
  return n > 0 ? (n * ADVANCE_CELLS - 2) * scale : 0;
}

// Draws `text` with per-character colours: `colors[i]` overrides `base` for
// character i (t74 colours the leading A of AFTER blue and the leading B of
// BURNER red, everything else white).
export function drawTitleText(ctx, text, x, y, base, colors, scale) {
  let cursor = x;
  const s = String(text).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const rows = TITLE_GLYPHS[s[i]];
    if (rows) {
      ctx.fillStyle = (colors && colors[i]) || base;
      for (let row = 0; row < TITLE_GLYPH_H; row++) {
        // Run-length each row so a 9-cell stroke is ONE fillRect, not nine
        // abutting ones — abutting fractional-edge rects are the Canvas2D
        // seam that CLAUDE.md's "fractional positions" note is about. scale
        // is an integer here, so both edges land on integers either way,
        // but the run form also keeps this loop cheap on every redraw.
        let col = 0;
        while (col < TITLE_GLYPH_W) {
          if (rows[row][col] !== '#') { col++; continue; }
          let run = 0;
          while (col + run < TITLE_GLYPH_W && rows[row][col + run] === '#') run++;
          ctx.fillRect(
            Math.round(cursor + col * scale), Math.round(y + row * scale),
            run * scale, scale
          );
          col += run;
        }
      }
    }
    cursor += ADVANCE_CELLS * scale;
  }
}

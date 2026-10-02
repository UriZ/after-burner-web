// Tiny 3x5 bitmap font, authored pixel-by-pixel (ARCHITECTURE.md D5: no
// webfont pulls). Covers only the glyphs the HUD actually needs: digits and
// the letters in SCORE / HIT / SPEED / STAGE / throttle letter (S C O R E H
// I T P D A G M). Each glyph is 5 rows of a 3-char string, '#' = filled.
const GLYPHS = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '###', '..#', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'],
  7: ['###', '..#', '..#', '..#', '..#'],
  8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  E: ['###', '#..', '##.', '#..', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
};

const GLYPH_W = 3;
const GLYPH_H = 5;

// Draws `text` at (x, y) = top-left of the first glyph, each pixel scaled
// to `px` device pixels (canvas is already at internal 320x224 resolution,
// so px=1 is native). Returns the total width drawn, in px units, so
// callers can right-align or chain text.
export function drawText(ctx, text, x, y, color, px = 1) {
  ctx.fillStyle = color;
  let cursor = x;
  for (const ch of String(text).toUpperCase()) {
    if (ch === ' ') {
      cursor += (GLYPH_W + 1) * px;
      continue;
    }
    const rows = GLYPHS[ch];
    if (!rows) {
      cursor += (GLYPH_W + 1) * px;
      continue;
    }
    for (let row = 0; row < GLYPH_H; row++) {
      for (let col = 0; col < GLYPH_W; col++) {
        if (rows[row][col] === '#') {
          ctx.fillRect(cursor + col * px, y + row * px, px, px);
        }
      }
    }
    cursor += (GLYPH_W + 1) * px;
  }
  return cursor - x - px;
}

export function textWidth(text, px = 1) {
  const n = String(text).length;
  return n > 0 ? n * (GLYPH_W + 1) * px - px : 0;
}

export const FONT_GLYPH_HEIGHT = GLYPH_H;

import { drawText, textWidth, FONT_GLYPH_HEIGHT } from '../../ui/font.js';

// Solves the glyph scale that hits a target pixel WIDTH, instead of a
// hardcoded px constant — font.js's glyph grid changed from 3x5 to 5x7
// mid-round (jethud-dev's R4 legibility redesign) and every px constant
// tuned against the old grid silently became wrong (AFTER/BURNER rendered
// 1.5x too wide and ran off both edges of the 320px frame). Deriving px
// from the font's own per-unit width via textWidth(text, 1) keeps this file
// correct across any future glyph-grid change without a second coordinated
// edit.
function pxForWidth(text, targetWidth) {
  const unit = textWidth(text, 1);
  return unit > 0 ? targetWidth / unit : 1;
}

// Title screen. REFERENCE.md "Title screen" (MEASURED, t74): black
// background; "AFTER BURNER" in white brush-stroke letters (leading A blue
// `#0096fd`, leading B red `#ff1600`); a large lavender-sphere "II" built
// behind the text with red-hot cores; "INSERT COIN!" red at y~0.833H;
// "CREDIT n" pink bottom-left; "(c)SEGA 1987" blue bottom-right. Lettering
// block spans x~0.143-0.867W, y~0.227-0.748H.
//
// SCOPE CUT (flagged, not silently dropped): the sphere-matrix "II" build
// animation (t60-66) and the alternating BEST FIGHTERS/attract-gameplay
// cycle (§7 steps 1-2) are not implemented this round — this draws the
// settled title CARD (step 3) only, which is what `?demo=1`'s own attract
// flight already stands in for visually. The "II" is approximated as two
// plain lavender bars behind the lettering rather than the sphere-matrix
// render, which is out of scope for a 2D canvas overlay.
const BLACK = '#000000';
const WHITE = '#f4f4f4';
const BLUE_A = '#0096fd';
const RED_B = '#ff1600';
const RED_COIN = '#ff1500';
const PINK = '#dfaadd';
const BLUE_COPY = '#008bd9';
const LAVENDER = '#7e85cc';
const LAVENDER_CORE = '#ff6625';

function drawWordWithLeadColor(ctx, text, x, y, baseColor, leadColor, pxX, pxY) {
  drawText(ctx, text, x, y, baseColor, pxX, pxY);
  drawText(ctx, text[0], x, y, leadColor, pxX, pxY);
}

export function drawTitleScreen(ctx, w, h, credit = 0) {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, w, h);

  // "II" stand-in: two lavender bars with a red-hot seam, centred behind
  // the lettering block (see scope-cut note above).
  const barW = w * 0.09;
  const barY0 = h * 0.18;
  const barY1 = h * 0.78;
  ctx.fillStyle = LAVENDER;
  ctx.fillRect(w / 2 - barW * 1.3, barY0, barW, barY1 - barY0);
  ctx.fillRect(w / 2 + barW * 0.3, barY0, barW, barY1 - barY0);
  ctx.fillStyle = LAVENDER_CORE;
  ctx.fillRect(w / 2 - barW * 1.3, h * 0.42, barW, h * 0.1);
  ctx.fillRect(w / 2 + barW * 0.3, h * 0.42, barW, h * 0.1);

  // Both lines share ONE scale (reference: AFTER and BURNER are the same
  // letter size, BURNER just has one more letter) — sized off BURNER, the
  // longer word, to the measured ~0.724W lettering-block width
  // (REFERENCE.md "Title screen": x~0.143-0.867W).
  const PX = pxForWidth('BURNER', w * 0.724);
  const afterW = textWidth('AFTER', PX);
  const burnerW = textWidth('BURNER', PX);
  const y1 = h * 0.227;
  const y2 = y1 + PX * FONT_GLYPH_HEIGHT + 6;
  drawWordWithLeadColor(ctx, 'AFTER', (w - afterW) / 2, y1, WHITE, BLUE_A, PX, PX);
  drawWordWithLeadColor(ctx, 'BURNER', (w - burnerW) / 2, y2, WHITE, RED_B, PX, PX);

  const coin = 'INSERT COIN!';
  const coinPx = pxForWidth(coin, w * 0.588);
  const coinW = textWidth(coin, coinPx);
  drawText(ctx, coin, (w - coinW) / 2, h * 0.833, RED_COIN, coinPx, coinPx + 1);

  const creditText = `CREDIT ${credit}`;
  const creditPx = pxForWidth(creditText, w * 0.156);
  drawText(ctx, creditText, 6, h * 0.93, PINK, creditPx, creditPx + 0.4);

  const copy = 'SEGA 1987';
  const copyPx = pxForWidth(copy, w * 0.175);
  const copyW = textWidth(copy, copyPx);
  drawText(ctx, copy, w - 6 - copyW, h * 0.93, BLUE_COPY, copyPx, copyPx + 0.4);
}

import { drawText, textWidth, FONT_GLYPH_HEIGHT } from '../../ui/font.js';

// Transient HUD overlay cards, drawn OVER the live (still-scrolling) world —
// REFERENCE.md "Transient HUD overlays" / GAME_SPEC.md §2/§6/§7. Each
// function draws onto an already-cleared (transparent) canvas; the caller
// (src/game/flow/overlay.js) handles the clear + texture upload.
//
// Line spacing uses FONT_GLYPH_HEIGHT (not a hardcoded row count) — font.js's
// glyph grid changed from 3x5 to 5x7 mid-round and a hardcoded `*5` here
// would have silently undershot the new 7-row glyph height, the same bug
// class that briefly broke the title screen's two-line layout.

const YELLOW = '#e8c840'; // respawn-ready-gp-t207.png READY, early phase
const CYAN = '#4fe0d8'; // READY late phase / CONTINUE PLAY text
const TALLY_RED = '#e8392a'; // stage2-start-bonus-tally-t124.png "HIT COUNTS"
const TALLY_CYAN = '#4fe0d8'; // same frame, "POINTS"
const STAGE_LABEL = '#c76fb0'; // same frame, lower-centre "STAGE n" during tally

// GAME_SPEC.md §2: "respawn 'READY' text card low-center (yellow, then
// cyan)". `phase` in [0,1): under 0.6 renders yellow, at/after renders cyan.
export function drawReadyCard(ctx, w, h, phase) {
  const text = 'READY';
  const px = 3;
  const tw = textWidth(text, px);
  const color = phase < 0.6 ? YELLOW : CYAN;
  drawText(ctx, text, (w - tw) / 2, h * 0.58, color, px, px + 1);
}

// GAME_SPEC.md §6: stage-end tally — red "HIT COUNTS n" over cyan
// "POINTS m", counting up together, with the incoming stage's "STAGE n"
// label shown lower-center during the count.
export function drawTallyCard(ctx, w, h, { hitShown, pointsShown, nextStage }) {
  const px = 2.2;
  const line1 = `HIT COUNTS ${hitShown}`;
  const line2 = `POINTS ${pointsShown}`;
  const y0 = h * 0.16; // clear of the top-left SCORE/HIT HUD row (REFERENCE.md: card sits just below it)
  drawText(ctx, line1, w * 0.08, y0, TALLY_RED, px, px + 1);
  drawText(ctx, line2, w * 0.08, y0 + (px + 1) * FONT_GLYPH_HEIGHT + 3, TALLY_CYAN, px, px + 1);

  const stageText = `STAGE ${nextStage}`;
  const stagePx = 2.4;
  const stageW = textWidth(stageText, stagePx);
  drawText(ctx, stageText, (w - stageW) / 2, h * 0.62, STAGE_LABEL, stagePx, stagePx + 1);
}

// GAME_SPEC.md §2: "CONTINUE PLAY / <countdown from 10> / INSERT COIN"
// centred over the still-scrolling world.
export function drawContinueCard(ctx, w, h, countdown) {
  const px = 2.6;
  const line1 = 'CONTINUE PLAY';
  const w1 = textWidth(line1, px);
  drawText(ctx, line1, (w - w1) / 2, h * 0.34, CYAN, px, px + 1);

  const countText = String(Math.max(0, Math.ceil(countdown)));
  const countPx = 3;
  const cw = textWidth(countText, countPx);
  drawText(ctx, countText, (w - cw) / 2, h * 0.48, CYAN, countPx, countPx + 1);

  const line2 = 'INSERT COIN';
  const w2 = textWidth(line2, px);
  drawText(ctx, line2, (w - w2) / 2, h * 0.6, CYAN, px, px + 1);
}

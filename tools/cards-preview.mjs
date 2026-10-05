// Isolation harness for the game-flow cards (CLAUDE.md: "isolation harnesses
// beat in-situ measurement"). Draws ONE card onto a flat 320x224 canvas at the
// game's own internal resolution, on a background chosen so every card pixel
// is separable from it by exact colour.
//
// Reaching the real continue/READY cards in-game needs a death and a timed
// countdown, which no capture can hold still; and measuring glyph extents in
// a live frame means measuring them against sea, dither and a jet. This draws
// the authored canvas, which is what the measurement is actually about.
//
//   node tools/capture.mjs --out <dir> --page /tools/cards-preview.html \
//        --frames 1 --url-params "card=continue"
//
// card=continue|ready|tally   which card to draw (default continue)
// phase=<0..1>                drawReadyCard phase (default 0)
// bg=RRGGBB                   background fill (default ff00ff, off-palette)
import { drawReadyCard, drawTallyCard, drawContinueCard } from '../src/game/flow/cards.js';
import { GAME_W, GAME_H } from '../src/render/viewport.js';

const params = new URLSearchParams(location.search);
const canvas = document.querySelector('#screen');
canvas.width = GAME_W;
canvas.height = GAME_H;
// 3x so a reader can see the result without resampling; the capture is read
// back on the native grid by point-sampling each block's centre.
canvas.style.width = `${GAME_W * 3}px`;
canvas.style.height = `${GAME_H * 3}px`;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function draw() {
  ctx.fillStyle = `#${params.get('bg') || 'ff00ff'}`;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  const card = params.get('card') || 'continue';
  if (card === 'ready') {
    drawReadyCard(ctx, GAME_W, GAME_H, Number(params.get('phase') || 0));
  } else if (card === 'tally') {
    drawTallyCard(ctx, GAME_W, GAME_H, { hitShown: 8, pointsShown: 160000, nextStage: 2 });
  } else {
    drawContinueCard(ctx, GAME_W, GAME_H, Number(params.get('countdown') || 10));
  }
}

draw();
window.__step = () => draw();
window.__frameReady = true;

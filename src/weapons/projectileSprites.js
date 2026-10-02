import { makePixelTexture } from '../effects/pixelTexture.js';

// Projectile and lock-bracket artwork. Every colour below is a MEASURED
// sample from REFERENCE.md "Projectile palettes" (round-3 pass, 2x
// nearest-neighbour crops of 60 fps frames) — no invented hexes.

// --- Player vulcan round ---------------------------------------------------
// REFERENCE.md: "small round orange puffs, ~3-4 native px, in a loose zig-zag
// column ahead of the nose (alternating muzzles), NOT thin white tracers".
// Source t214, crop x[380,760] y[160,420] of 1028x720; samples #ffdb21
// (430,212), #ffad15 (268,350), #ff9f0c (310,282).
// See reference/stage4-vulcan-stream-t214.png.
//
// AUTHORED AS HARD 8x8 PIXELS, NOT AS ARCS. Two reasons, both measured:
//
//   * A puff renders at 3-4 native px. canvas2d's arc() is antialiased, so a
//     16x16 circle's edge texels carry partial alpha; point-sampled at that
//     size most of the sampled texels land on the soft edge and the puff
//     measured 2.5 native px instead of the authored 3.7
//     (tools/out/combat-r3-15-vulcan). Explicit opaque rectangles have no
//     soft edge to lose.
//   * 8x8 rather than 16x16 so that at 3-4 screen px each sampled texel
//     covers ~2 texels instead of ~5, which keeps the core/body/rim
//     structure visible at the size the puff is actually drawn.
//
// The three measured colours are laid out as rim / body / core:
//   . . r r r r . .
//   . r b b b b r .
//   r b b c c b b r
//   r b c c c c b r
//   r b c c c c b r
//   r b b c c b b r
//   . r b b b b r .
//   . . r r r r . .
const VULCAN_CORE = '#ffdb21';
const VULCAN_BODY = '#ffad15';
const VULCAN_RIM = '#ff9f0c';

const PUFF_ROWS = [
  '..rrrr..',
  '.rbbbbr.',
  'rbbccbbr',
  'rbccccbr',
  'rbccccbr',
  'rbbccbbr',
  '.rbbbbr.',
  '..rrrr..',
];

function drawVulcanPuff(ctx, w, h) {
  const px = w / 8;
  const colours = { r: VULCAN_RIM, b: VULCAN_BODY, c: VULCAN_CORE };
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const ch = PUFF_ROWS[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = colours[ch];
      ctx.fillRect(x * px, (y * h) / 8, px, h / 8);
    }
  }
}

// --- Enemy shot ------------------------------------------------------------
// REFERENCE.md: "larger oval fireballs, ~6-8 native px, in spaced trains of
// 4-8: pale-gold core #ffd570, orange body #ff7733, dark red rim #941114,
// salmon edge #e96c63". Source t330.
// See reference/stage7-enemy-shot-train-t330.png — the dark rim is the
// distinguishing feature against the player's vulcan puffs, so it is drawn
// as a full ring, not a shadow on one side.
const SHOT_CORE = '#ffd570';
const SHOT_BODY = '#ff7733';
const SHOT_RIM = '#941114';
const SHOT_EDGE = '#e96c63';

function drawEnemyShot(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const ell = (rx, ry, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  // Oval, wider than tall, per "oval fireballs" and the t330 crop.
  ell(w * 0.5, h * 0.44, SHOT_EDGE);
  ell(w * 0.44, h * 0.38, SHOT_RIM);
  ell(w * 0.33, h * 0.27, SHOT_BODY);
  ell(w * 0.17, h * 0.14, SHOT_CORE);
}

// --- Missile body ----------------------------------------------------------
// Small bright dart with a hot exhaust. Kept deliberately small: in
// reference/stage1-missile-salvo-t100.75.png the missile bodies are barely
// separable from their own smoke — the TRAIL is the readable element, not
// the airframe.
function drawMissile(ctx, w, h) {
  const cx = w / 2;
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(cx - 1.5, h * 0.18, 3, h * 0.5);
  ctx.fillStyle = '#9e9e9e';
  ctx.beginPath();
  ctx.moveTo(cx - 1.5, h * 0.18); ctx.lineTo(cx, h * 0.04); ctx.lineTo(cx + 1.5, h * 0.18);
  ctx.closePath(); ctx.fill();
  // Exhaust flame, same warm family as the player's nozzles.
  ctx.fillStyle = '#ffa83c';
  ctx.beginPath(); ctx.arc(cx, h * 0.74, w * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff0b8';
  ctx.beginPath(); ctx.arc(cx, h * 0.74, w * 0.1, 0, Math.PI * 2); ctx.fill();
}

// --- Muzzle flash ----------------------------------------------------------
// GAME_SPEC.md §3 / the round-3 brief: "muzzle flame at the jet". A short
// bright flare in the vulcan palette, so the gun reads as firing even when
// the rounds themselves have already travelled into depth.
function drawMuzzleFlash(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  ctx.fillStyle = VULCAN_RIM;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = VULCAN_BODY;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.15, 0, Math.PI * 2); ctx.fill();
}

// --- Lock bracket ----------------------------------------------------------
// REFERENCE.md "HUD" notes + GAME_SPEC.md §3: per-enemy lock indicators are
// DASHED corner-brackets that ride the enemy. White is used here: of the
// three stage-1 citations two are white (t116 "a white bracket on a distant
// enemy", stage1-missile-salvo-t100.75.png) and one is blue (t104
// #008cd9-#3bbaff). The blue variant is a state we have not mapped, so the
// majority stage-1 observation ships.
//
// Drawn at 32x32 with 2px strokes: at the 1.25x-enemy-span screen size the
// bracket is given in lockSystem.js, that lands the arms at 1-2 native px,
// which is what the arcade's thin dashed brackets read as.
const BRACKET_WHITE = '#f0f0f0';

function drawLockBracket(ctx, w, h) {
  const arm = w * 0.3;
  const t = 2;
  ctx.fillStyle = BRACKET_WHITE;
  const corner = (x, y, sx, sy) => {
    // Horizontal arm, DASHED: two dashes with a gap, so the bracket reads as
    // dashed rather than solid even at small scale.
    ctx.fillRect(x, y, sx * arm * 0.45, sy * t);
    ctx.fillRect(x + sx * arm * 0.6, y, sx * arm * 0.4, sy * t);
    // Vertical arm.
    ctx.fillRect(x, y, sx * t, sy * arm * 0.45);
    ctx.fillRect(x, y + sy * arm * 0.6, sx * t, sy * arm * 0.4);
  };
  // Canvas rects with negative sizes are valid and fill leftward/upward,
  // which is how the three mirrored corners are drawn from one helper.
  corner(0, 0, 1, 1);
  corner(w, 0, -1, 1);
  corner(0, h, 1, -1);
  corner(w, h, -1, -1);
}

const cache = new Map();
function cached(key, draw, w, h) {
  let tex = cache.get(key);
  if (!tex) {
    tex = makePixelTexture(draw, w, h);
    cache.set(key, tex);
  }
  return tex;
}

export const vulcanTexture = () => cached('vulcan', drawVulcanPuff, 8, 8);
export const enemyShotTexture = () => cached('shot', drawEnemyShot, 16, 14);
export const missileTexture = () => cached('missile', drawMissile, 12, 24);
export const muzzleFlashTexture = () => cached('muzzle', drawMuzzleFlash, 16, 16);
export const lockBracketTexture = () => cached('bracket', drawLockBracket, 32, 32);

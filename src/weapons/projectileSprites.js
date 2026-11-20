import { makePixelTexture } from '../effects/pixelTexture.js';

// Projectile and lock-bracket artwork. Every colour below is a MEASURED
// sample from REFERENCE.md "Projectile palettes" (round-3 pass, 2x
// nearest-neighbour crops of 60 fps frames) — no invented hexes.
//
// R7: EVERY TEXTURE HERE NOW DECLARES ITS PALETTE, and makePixelTexture
// snaps to it. `hardAlpha` alone was not enough and the enemy shot is the
// worked example: it is four concentric ellipses, so three of its four
// boundaries are antialiased against an OPAQUE fill underneath and come out
// as two-colour mixtures at alpha 255, which hardAlpha cannot see. A train
// of eight of those at 1-2 native px each put ~20 unauthored colours on a
// stage-1 frame in ~20 pixels, and Criterion A2 counts set cardinality, so
// 20 pixels cost as much as 20 000 would. See judging/R7/lane-fx.md.

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
const VULCAN_CORE = '#ffde21'; // sampled #ffdb21, snapped to the ladder
const VULCAN_BODY = '#ffad19'; // sampled #ffad15
const VULCAN_RIM = '#ff9c10'; // sampled #ff9f0c
export const VULCAN_PALETTE = [VULCAN_RIM, VULCAN_BODY, VULCAN_CORE];

// R12: the bright CORE is enlarged (12 -> 40 core texels) and the dim rim
// pulled back to the corners. The playtest read the shipped puff as "a few
// faint dots": at the 3-5 px it renders, the old 4x4-diamond core was ~1-2 px
// of brightness buried in a two-ring orange surround, so each puff read as a
// dim smudge rather than a hot tracer. The arcade's own puffs
// (reference/stage4-vulcan-stream-t214.png) read as solid bright orange
// blobs, not rings. Colours and the 3-value structure are unchanged; only how
// much of the sprite each one covers moved, so the measured palette still
// holds and the puff is simply hotter: a solid core, a one-texel body ring
// and rim only at the four corners.
const PUFF_ROWS = [
  '.rbccbr.',
  'rbccccbr',
  'bccccccb',
  'cccccccc',
  'cccccccc',
  'bccccccb',
  'rbccccbr',
  '.rbccbr.',
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
// R37 — REDRAWN FROM A 60 Hz CONSECUTIVE-DECODE LOOK AT THE t330 TRAIN
// (judging/R37/incoming-fire/: arc/t330 frames f0038-f0055, 16-frame strip
// t330-train-strip-f38-53.png, single-round 8x track t330-tracked-round-8x.png,
// and a 16-bucket colour census over all train pixels). The owner's R37 ask is
// "improve the look of incoming fire"; the look-first pass found the previous
// concentric-rings ball is NOT what the arcade draws. The measured round is
//   * LAYERED, not concentric: a dark-red CAP over the top ~third, a bright
//     PALE-PEACH body below it, with cream/near-white horizontal streaks
//     through the middle — it reads as a burning blob lit from within, under a
//     thin near-black outline. No salmon halo exists on the real round (the
//     old #e96c63 edge was video blur, dropped).
//   * BOILING: the cap's coverage swings ~40% frame-to-frame at 60 Hz (red-cap
//     pixel count 129->192->169 across one tracked round's 3 consecutive
//     frames, pale count 101->71->105) and the cap alternately merges with and
//     lifts off the body. Two authored variants + a per-shot map swap in
//     enemyShots.js reproduce that (palette-swap idiom, same as telegraph.js —
//     never an opacity ramp).
//   * TRAIL-FREE: the sky behind every tracked round is clean. No ember trail.
// Census (16-bucket modes, snapped to SEGA_LADDER): pale body #f8b888-family
// -> #f7b584; cap #880808/#981818-family — the already-measured rim #941010;
// outline #080808-#380808 -> #3a1010; cream streak #f8d898 ~ the previously
// measured core #ffd673 (kept — same source, earlier pass); mid-orange
// #f89868-family ~ the previously measured body #ff7331 (kept, now the shadow
// band). Round proportions: near-end w 34-38 x h 22-23 video px (~1.5:1), so
// the canvas is 16x12.
export const SHOT_CORE = '#ffd673'; // sampled #ffd570 — cream/gold streak
export const SHOT_BODY = '#ff7331'; // sampled #ff7733 — lower shadow band
export const SHOT_RIM = '#941010'; // sampled #941114 — the red cap
const SHOT_PALE = '#f7b584'; // R37 census mode #f8b888 — pale-peach body
const SHOT_OUTLINE = '#3a1010'; // R37 census dark family #080808-#380808
// R29 — a hot near-white centre, for READABILITY (kept: it is also what the
// census shows — the mid-band streaks run to near-white). Same hot tone the
// telegraph flare uses (telegraph.js T_HOT), so the warning glyph and the
// round it predicts share their hottest colour. Ladder-valid: ff=255, f7=247,
// ce=206 all on SEGA_LADDER (pixelTexture.js).
const SHOT_HOT = '#fff7ce';
export const SHOT_PALETTE = [SHOT_OUTLINE, SHOT_RIM, SHOT_BODY, SHOT_PALE, SHOT_CORE, SHOT_HOT];

// Explicit 16x12 pixel grids (Canvas2D ellipse() antialiases with no way to
// turn it off — the vulcan puff's explicit-grid pattern, per
// judging/R4/art-critique.md). o=outline r=cap s=shadow-orange p=pale-peach
// c=cream-streak h=hot. Variant A: cap merged onto the body (red-dominant
// frame). Variant B: cap thinner and lifted off a hotter body (pale-dominant
// frame). Flickering A<->B is the measured boil.
const SHOT_ROWS_A = [
  '....oorrrroo....',
  '..oorrrrrrrroo..',
  '.orrrrrrrrrrrro.',
  '.orrrrrrrrrrrro.',
  '.osppppppppppso.',
  'opcchhhhhhhhccpo',
  'ophhhhhhhhhhhhpo',
  'opccccccccccccpo',
  '.oppppppppppppo.',
  '.osppppppppppso.',
  '..osppppppppso..',
  '...oossssssoo...',
];
const SHOT_ROWS_B = [
  '...oorrrrrroo...',
  '..orrrrrrrrrro..',
  '..oossssssssoo..',
  '.osppppppppppso.',
  'ophhhhhhhhhhhhpo',
  'opcchhhhhhhhccpo',
  'oppccccccccccppo',
  'oppppppppppppppo',
  '.oppppppppppppo.',
  '.osppppppppppso.',
  '..osppppppppso..',
  '...oossssssoo...',
];

const SHOT_ROLES = {
  o: SHOT_OUTLINE,
  r: SHOT_RIM,
  s: SHOT_BODY,
  p: SHOT_PALE,
  c: SHOT_CORE,
  h: SHOT_HOT,
};

function drawEnemyShotRows(rows) {
  return (ctx, w, h) => {
    const pw = w / 16;
    const ph = h / 12;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        ctx.fillStyle = SHOT_ROLES[ch];
        ctx.fillRect(x * pw, y * ph, pw, ph);
      }
    }
  };
}

// --- Missile body ----------------------------------------------------------
// Small bright dart with a hot exhaust. Kept deliberately small: in
// reference/stage1-missile-salvo-t100.75.png the missile bodies are barely
// separable from their own smoke — the TRAIL is the readable element, not
// the airframe.
const MISSILE_BODY = '#e6e6e6';
const MISSILE_NOSE = '#9c9c9c';
const MISSILE_FLAME = '#ffa43a';
const MISSILE_FLAME_HOT = '#ffefb5';
export const MISSILE_PALETTE = [MISSILE_BODY, MISSILE_NOSE, MISSILE_FLAME, MISSILE_FLAME_HOT];

function drawMissile(ctx, w, h) {
  const cx = w / 2;
  // Integer rect, not `cx - 1.5`: CLAUDE.md's Canvas2D fractional-position
  // bug class. A half-covered texel on a 12-wide canvas is 8% of the width
  // and arrives as a half-transparent grey rim round the body.
  ctx.fillStyle = MISSILE_BODY;
  ctx.fillRect(Math.round(cx - 1.5), Math.round(h * 0.18), 3, Math.round(h * 0.5));
  ctx.fillStyle = MISSILE_NOSE;
  ctx.beginPath();
  ctx.moveTo(cx - 1.5, h * 0.18); ctx.lineTo(cx, h * 0.04); ctx.lineTo(cx + 1.5, h * 0.18);
  ctx.closePath(); ctx.fill();
  // R35 — a real ROCKET ENGINE flame, not a dot (owner: "add some fire to the
  // missiles, they do have an engine"). A tapering orange plume from the body's
  // tail down past the canvas bottom, with a hot pale-yellow core, so the missile
  // reads as a burning rocket in flight (the blue ribbon trail is separate).
  ctx.fillStyle = MISSILE_FLAME;
  ctx.beginPath();
  ctx.moveTo(cx - 2.3, h * 0.66);
  ctx.lineTo(cx + 2.3, h * 0.66);
  ctx.lineTo(cx + 0.6, h * 0.99);
  ctx.lineTo(cx - 0.6, h * 0.99);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MISSILE_FLAME_HOT;
  ctx.beginPath();
  ctx.moveTo(cx - 1.2, h * 0.68);
  ctx.lineTo(cx + 1.2, h * 0.68);
  ctx.lineTo(cx, h * 0.9);
  ctx.closePath();
  ctx.fill();
}

// --- Muzzle flash ----------------------------------------------------------
// GAME_SPEC.md §3 / the round-3 brief: "muzzle flame at the jet". A short
// bright flare in the vulcan palette, so the gun reads as firing even when
// the rounds themselves have already travelled into depth.
const MUZZLE_HOT = '#fff7c5';
export const MUZZLE_PALETTE = [VULCAN_RIM, VULCAN_BODY, MUZZLE_HOT];

function drawMuzzleFlash(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  ctx.fillStyle = VULCAN_RIM;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = VULCAN_BODY;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = MUZZLE_HOT;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.15, 0, Math.PI * 2); ctx.fill();
}

// --- Lock bracket bar -------------------------------------------------------
// A lock bracket is built from EIGHT of these — one bar per arm, two arms per
// corner — rather than from four L-shaped corner sprites. The reason is that
// a bracket's arm LENGTH has to scale with the box while its STROKE stays
// fixed, and a single L cannot do that: scaling an L non-uniformly shears
// one arm's thickness as it lengthens the other. Two separately-scaled bars
// can, so this is a plain white rectangle and lockSystem.js sets each bar's
// length and thickness independently.
//
// The two previous designs each got one half right and the measurement
// caught both:
//   * a 32x32 four-corner texture scaled to the whole box -> arm thickness
//     scaled with the box, so a bracket on a 25%W enemy rendered as four
//     solid white slabs (R3 judge: "heavy blocks ~4-6 native px where the
//     arcade's are thin 1-2 px"; tools/out/combat-r4-07-dens/frame-0010.png);
//   * one L at a FIXED screen size -> correct 1-2 px stroke, but the arms no
//     longer grow, so a big box became four tiny ticks floating near the
//     target. That is R4 gap 10's "four loose corners scattered near it
//     rather than brackets that enclose their target"
//     (judging/R4/evidence_brackets_ours.png).
//
// Both failed against the same arcade geometry, measured here rather than
// inferred. reference/stage1-level-flight-t116.png, the isolated white
// bracket on the distant enemy at (393-427, 197-232) of 686x480: the box is
// 35 x 35 px — SQUARE — with 1 px strokes and corner arms of 5 and 9 px,
// i.e. 14-26% of the side. reference/stage1-missile-salvo-t100.75.png, the
// bracket on the centre enemy at (490-575, 277-329) of 1028x720: box side
// ~53 px, strokes 3 px (= ~1 native px), horizontal arms 14-15 px = 27% of
// the side. So: square box, ~1 native px stroke, arms a QUARTER of the side.
// R26 — PURE WHITE, up from #efefef. The lock bracket is now TINTED PER STATE
// at render time (lockSystem.js sets each bar sprite's material.color: white
// while tracking, ramping to cyan as a lock completes). A material-colour tint
// MULTIPLIES the texture, so the texture has to be full white for the tint to
// reach its authored value — a #efefef base would darken every tint by 6%. The
// tint lives on the live sprite, not in this canvas, so fx_palette_probe (which
// reads the authored canvas) still sees a one-colour #ffffff texture. The
// owner's "see the sights" directive outranks the arcade's plain-white bracket
// (CLAUDE.md: owner outranks the measured criterion).
const BRACKET_WHITE = '#ffffff';
export const BRACKET_PALETTE = [BRACKET_WHITE];

function drawLockBar(ctx, w, h) {
  ctx.fillStyle = BRACKET_WHITE;
  ctx.fillRect(0, 0, w, h);
}

const cache = new Map();
function cached(key, draw, w, h, palette) {
  let tex = cache.get(key);
  if (!tex) {
    tex = makePixelTexture(draw, w, h, { palette });
    cache.set(key, tex);
  }
  return tex;
}

export const vulcanTexture = () => cached('vulcan', drawVulcanPuff, 8, 8, VULCAN_PALETTE);
// [capMerged, capLifted] — enemyShots.js flickers each live round between the
// two (the measured 60 Hz boil). enemyShotTexture() stays as frame A for any
// single-texture consumer (tools/fx-probe.mjs checks both frames).
export const enemyShotTextures = () => [
  cached('shotA', drawEnemyShotRows(SHOT_ROWS_A), 16, 12, SHOT_PALETTE),
  cached('shotB', drawEnemyShotRows(SHOT_ROWS_B), 16, 12, SHOT_PALETTE),
];
export const enemyShotTexture = () => enemyShotTextures()[0];
export const missileTexture = () => cached('missile', drawMissile, 12, 24, MISSILE_PALETTE);
export const muzzleFlashTexture = () => cached('muzzle', drawMuzzleFlash, 16, 16, MUZZLE_PALETTE);
export const lockBarTexture = () => cached('lockbar', drawLockBar, 4, 4, BRACKET_PALETTE);

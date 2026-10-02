import * as THREE from 'three';
import { makePixelTexture } from '../effects/pixelTexture.js';

// Enemy aircraft sprites, stage-1 liveries.
//
// GAME_SPEC.md §4 "Liveries observed": stage 1 is white/grey MiG-types.
// Two ASPECTS are needed because the stage OPENS with an overtake flight
// (2-4 enemies ahead of the player, REAR aspect with glowing nozzles,
// receding) before the main head-on echelons start — that opener is the
// first thing every stage shows and the Godot prototype never had it.
//
//   head-on: reference/ab2-arcade-closeup-enemies.jpg — round nose intake,
//            swept wings end to end, twin canted fins above the spine, low
//            horizontal stabilisers.
//   rear:    reference/stage1-missile-salvo-t100.75.png — the three grey
//            jets around the salvo are rear-aspect: swept wings, pale grey
//            airframe, two round dark nozzle rings with hot centres.
//
// ---------------------------------------------------------------------------
// EACH ASPECT HAS TWO ZOOM LEVELS, AND THAT IS NOT AN OPTIMISATION.
//
// An enemy spans 2.5 native px at spawn and 87 at fly-past. Rendering one
// 64x32 texture across that whole range fails at BOTH ends, and both
// failures were measured on captures before this design existed:
//
//   * With mipmaps (LinearMipmapLinear): the aircraft renders as a
//     translucent blue-grey GHOST at every size. Mipmapping a
//     non-premultiplied sprite averages the transparent surround into colour
//     and alpha, and this silhouette is mostly thin features, so one mip
//     level roughly halves its opacity. Measured on
//     tools/out/combat-r3-01/frame-0008.png: a 17 px enemy whose pixels were
//     all blended sky, no airframe colour present at all.
//   * With NearestFilter and no mipmaps: the far-field aircraft DISAPPEARS.
//     Point sampling a 64x32 texture at 2-6 screen px lands on transparent
//     texels. Measured on tools/out/combat-r3-05-solo: 27 of the first 80
//     frames of an approach rendered ZERO pixels, and the measured width
//     oscillated 6 -> 18 -> 6 native px while the subject was monotonically
//     approaching. That is precisely the popping that the R2 report's gap-5
//     criterion exists to catch, arriving by a different route than a frozen
//     scale table.
//
// So: a chunky FAR sprite below ~12 native px and the detailed one above,
// which is what the Super Scaler hardware did (distinct sprites per zoom
// band), and both are authored to satisfy one invariant:
//
//   THE FULL-WIDTH-BAND INVARIANT. Every texture below has a horizontal band
//   of fully opaque, wingtip-to-wingtip rows covering at least the middle
//   ~22% of its canvas height, centred on the canvas midline. Nearest
//   sampling of an H-pixel-tall render takes rows at v = (j+0.5)/H, spaced
//   1/H apart, so once H exceeds ~4.6 at least one sampled row MUST land
//   inside a 0.22-tall band: the sprite can never render narrower than its
//   quad, and measured span is exactly worldWidth/(frustum width at depth)
//   at every size. The far sprites use a band covering the middle half, so
//   the invariant holds for them down to H = 1.
//
//   Consequence for anyone editing these: do not thin the wingtips, do not
//   inset them from the canvas edge, and do not change a canvas height
//   without re-checking the band fraction. The continuous-scaling
//   measurement depends on it, not just on the absence of a scale table.
// ---------------------------------------------------------------------------

// Greyscale ladder in the same family as the player's (REFERENCE.md "Player
// jet / Structure" V = 0.98/0.90/0.82/0.75, near-black nacelles V~0.33) but
// shifted a step darker: REFERENCE.md "Enemies" notes grey MiG-type
// silhouettes "read dark against bright skies" (t116 left, t148, t186), and
// against our #009fff stage-1 sky a player-bright airframe would not.
const V90 = '#e6e6e6';
const V78 = '#c7c7c7';
const V62 = '#9e9e9e';
const V45 = '#737373';
const DARK = '#3a3a3a';
const NEAR_BLACK = '#1e1e1e';
// Nose intake / nozzle hot centre. Sampled family: the enemy nose dot in
// ab2-arcade-closeup-enemies.jpg is a red core in a dark ring; the rear
// nozzles in stage1-missile-salvo-t100.75.png are orange-hot in dark rings.
const INTAKE_RED = '#c43018';
const NOZZLE_HOT = '#ff9f2a';
const NOZZLE_CORE = '#ffe08a';

const W = 64;
const H = 32;
const FW = 16;
const FH = 8;

// Projected width, in native (320-wide frame) px, at which the detailed
// sprite takes over from the far one. Set from the invariant above: the
// detail textures' wingtip band spans rows 15-22 of 32 = 0.25 of canvas
// height, so it needs the sprite to be more than 1/0.25 = 4 px tall, i.e.
// more than 8 px wide at the 2:1 sprite aspect. 10 leaves margin for the
// non-integral row counts a non-integer sprite height produces.
export const DETAIL_SWITCH_NATIVE_PX = 10;

function enemyTexture(draw, w, h) {
  const tex = makePixelTexture(draw, w, h);
  // Asserted rather than inherited: the filtering choice is the subject of
  // the note above and a silent change in makePixelTexture would bring the
  // ghost-aircraft bug back.
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// --- Head-on approaching fighter (detail) ----------------------------------
// Wingtips span rows 15-22 (the invariant band) and columns 0 and 63.
function drawHeadOn(ctx) {
  const cx = 32;

  // Twin canted fins above the spine (closeup-enemies: clearly separated and
  // angled, not one tall rudder).
  ctx.fillStyle = V45;
  ctx.beginPath();
  ctx.moveTo(cx - 10, 3); ctx.lineTo(cx - 5, 13); ctx.lineTo(cx - 2, 13); ctx.lineTo(cx - 5, 3);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 10, 3); ctx.lineTo(cx + 5, 13); ctx.lineTo(cx + 2, 13); ctx.lineTo(cx + 5, 3);
  ctx.closePath(); ctx.fill();

  // Swept wings, wingtip to wingtip across the full canvas width. Thick at
  // the tip by design (see the invariant note) — and the arcade's enemy
  // wings are chunky slabs at this scale anyway.
  ctx.fillStyle = V78;
  ctx.beginPath();
  ctx.moveTo(cx - 7, 11); ctx.lineTo(0, 15); ctx.lineTo(0, 22); ctx.lineTo(cx - 7, 21);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 7, 11); ctx.lineTo(W, 15); ctx.lineTo(W, 22); ctx.lineTo(cx + 7, 21);
  ctx.closePath(); ctx.fill();

  // Leading-edge highlight and trailing-edge shadow: the value ladder that
  // keeps the sprite from reading as one flat fill.
  ctx.fillStyle = V90;
  ctx.beginPath();
  ctx.moveTo(cx - 7, 11); ctx.lineTo(0, 15); ctx.lineTo(0, 17); ctx.lineTo(cx - 7, 14);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 7, 11); ctx.lineTo(W, 15); ctx.lineTo(W, 17); ctx.lineTo(cx + 7, 14);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = V45;
  ctx.beginPath();
  ctx.moveTo(cx - 7, 19); ctx.lineTo(0, 20); ctx.lineTo(0, 22); ctx.lineTo(cx - 7, 21);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 7, 19); ctx.lineTo(W, 20); ctx.lineTo(W, 22); ctx.lineTo(cx + 7, 21);
  ctx.closePath(); ctx.fill();

  // Low horizontal stabilisers.
  ctx.fillStyle = V62;
  ctx.fillRect(cx - 15, 25, 10, 2);
  ctx.fillRect(cx + 5, 25, 10, 2);

  // Fuselage barrel.
  ctx.fillStyle = V78;
  ctx.fillRect(cx - 6, 9, 12, 19);
  ctx.fillStyle = V62;
  ctx.fillRect(cx + 2, 9, 4, 19); // right-side shading, one value step down
  ctx.fillStyle = V45;
  ctx.fillRect(cx - 6, 26, 12, 2); // belly shadow

  // Nose intake: dark ring with a red core, dead centre — the single
  // highest-contrast feature and what makes the head-on aspect readable at
  // 15-30 px (ab2-arcade-closeup-enemies.jpg, nose of the lower-right MiG).
  ctx.fillStyle = NEAR_BLACK;
  ctx.beginPath(); ctx.arc(cx, 18, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = DARK;
  ctx.beginPath(); ctx.arc(cx, 18, 4.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INTAKE_RED;
  ctx.beginPath(); ctx.arc(cx, 18, 2.2, 0, Math.PI * 2); ctx.fill();
}

// --- Rear-aspect receding fighter, detail (stage opener overtake flight) ----
function drawRear(ctx) {
  const cx = 32;

  ctx.fillStyle = V45;
  ctx.beginPath();
  ctx.moveTo(cx - 8, 4); ctx.lineTo(cx - 4, 13); ctx.lineTo(cx - 1, 13); ctx.lineTo(cx - 4, 4);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 8, 4); ctx.lineTo(cx + 4, 13); ctx.lineTo(cx + 1, 13); ctx.lineTo(cx + 4, 4);
  ctx.closePath(); ctx.fill();

  // Wings: tips trail upward toward the horizon, the mirror of the head-on
  // sweep, matching the receding jets in
  // reference/stage1-missile-salvo-t100.75.png. Tips span rows 14-22, inside
  // the invariant band.
  ctx.fillStyle = V78;
  ctx.beginPath();
  ctx.moveTo(cx - 7, 14); ctx.lineTo(0, 14); ctx.lineTo(0, 22); ctx.lineTo(cx - 7, 21);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 7, 14); ctx.lineTo(W, 14); ctx.lineTo(W, 22); ctx.lineTo(cx + 7, 21);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = V90;
  ctx.fillRect(1, 15, 24, 2);
  ctx.fillRect(39, 15, 24, 2);

  ctx.fillStyle = V78;
  ctx.fillRect(cx - 7, 12, 14, 12);
  ctx.fillStyle = V62;
  ctx.fillRect(cx + 1, 12, 6, 12);

  // Twin nozzles: dark rings with hot centres — the defining rear-aspect cue
  // (GAME_SPEC.md §4 "rear-aspect with glowing nozzles").
  for (const nx of [cx - 4, cx + 4]) {
    ctx.fillStyle = NEAR_BLACK;
    ctx.beginPath(); ctx.arc(nx, 19, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = NOZZLE_HOT;
    ctx.beginPath(); ctx.arc(nx, 19, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = NOZZLE_CORE;
    ctx.beginPath(); ctx.arc(nx, 19, 1.4, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = V45;
  ctx.fillRect(cx - 7, 23, 14, 1);
}

// --- Far zoom level, 16x8 --------------------------------------------------
// FULLY OPAQUE — every one of the 128 texels. This is stronger than the
// band invariant and it is deliberate: at 3-9 native px the sprite is 1-4
// screen rows tall, and when only ONE row is covered its sampled v is
// effectively arbitrary, so ANY transparent row is a frame where the
// aircraft vanishes. The first version of this texture left rows 0 and 7
// empty and that is exactly what happened — 2 dropped frames out of the ~20
// spent at 4 native px in tools/out/combat-r3-06-solo, a 1-in-8 flicker.
// Full coverage makes the measured span identically equal to the quad width
// at every size, which is what the continuous-scaling measurement needs.
//
// Reading as an aircraft is handled by VALUE, not by shape: a lighter
// full-width wing band through the middle, darker rows top and bottom, and a
// single dark nose pixel. At 3-9 px that is what AB2's distant enemies are
// (reference/stage1-level-flight-t116.png: the bracketed enemy at ~(415,210)
// is a handful of dark pixels, no silhouette).
function drawHeadOnFar(ctx) {
  ctx.fillStyle = V45;
  ctx.fillRect(0, 0, FW, FH); // base: every texel opaque
  ctx.fillStyle = V62;
  ctx.fillRect(0, 2, FW, 4); // full-width wing band, one step lighter
  ctx.fillStyle = V78;
  ctx.fillRect(5, 1, 6, 6); // fuselage
  ctx.fillStyle = DARK;
  ctx.fillRect(7, 3, 2, 2); // nose intake, the one dark accent
}

function drawRearFar(ctx) {
  ctx.fillStyle = V45;
  ctx.fillRect(0, 0, FW, FH);
  ctx.fillStyle = V62;
  ctx.fillRect(0, 2, FW, 4);
  ctx.fillStyle = V78;
  ctx.fillRect(5, 1, 6, 6);
  // Two hot nozzle pixels — at this size the glow is the only thing that
  // distinguishes a receding enemy from an approaching one, and the stage
  // opener depends on reading as receding.
  ctx.fillStyle = NOZZLE_HOT;
  ctx.fillRect(6, 3, 1, 2);
  ctx.fillRect(9, 3, 1, 2);
}

const cache = {};
const get = (key, draw, w, h) => (cache[key] ??= enemyTexture(draw, w, h));

export const enemyHeadOnTexture = () => get('headOn', drawHeadOn, W, H);
export const enemyRearTexture = () => get('rear', drawRear, W, H);
export const enemyHeadOnFarTexture = () => get('headOnFar', drawHeadOnFar, FW, FH);
export const enemyRearFarTexture = () => get('rearFar', drawRearFar, FW, FH);

// NOTE for anyone adding a zoom level: both textures above are 2:1, so
// swapping between them changes the sprite's TEXTURE and nothing about its
// quad. A level whose canvas aspect differed would show up as a height jump
// in exactly the consecutive-frame comparison the scaling criterion uses.

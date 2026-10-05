// player-f14-roll.png — 8 drawn frames of a full 360-degree barrel roll.
//
// Closes the last "one bitmap spun" case in the player sprite. The bank
// ladder became drawn poses in player-f14.js; the roll was still
// `material.rotation = q*2*PI` plus a scale-x squish on the single astern
// bitmap, which is the loudest "this is not an arcade game" signal the art
// critique names (§2.1 defect 1) and the one case where it is most visible,
// because the roll is a deliberate, watched manoeuvre.
//
// Reference: reference/stage4-barrel-roll-t222.png. What it shows that the
// spun bitmap cannot: the aircraft presents its **dorsal** surface, in a
// blue-violet colour family that appears nowhere in the astern view
// (measured ladder on PLAYER_ROLL in ../palettes.js), with the wings at full
// length rather than edge-on, and the nozzles still lit. A rotated astern
// bitmap keeps the warm greys the whole way round and gets this wrong at
// every phase except 0.
//
// MODEL. The roll is about the aircraft's longitudinal axis, which from
// astern points at the camera, so:
//   * the planform turns in the image plane by theta = phase * 360;
//   * its span foreshortens by |cos theta| — the wings go edge-on at the
//     quarter points, which is GAME_SPEC §1's "sprite narrows to a line"
//     moment, floored at 0.30 — 0.18 was tried first and is too far: the
//     wingtips compress past the point where the scan conversion keeps them
//     attached and the frame breaks into loose fragments beside a smudge.
//     0.30 still reads as an aircraft seen edge-on;
//   * the surface facing the camera crossfades from ventral to dorsal with
//     w = (1 - cos theta)/2, so frame 0 is the familiar astern aircraft and
//     frame 4 (180 deg, inverted) is the blue-violet dorsal of t222.
// Both the rotation AND the squish are BAKED IN. player.js must therefore
// drop its own `material.rotation` and its `scale.set(origX*squish, ...)`
// for the duration of the roll, or they apply twice — see
// judging/R5/ask-sprite-art.md A5.
//
// 8 frames, not the art critique §4 inventory's 6, for one concrete reason:
// at 45-degree steps all four structurally distinct phases — astern (0),
// edge-on (90), inverted dorsal (180), edge-on (270) — land exactly on a
// frame. At 60-degree steps neither edge-on moment does, so the narrowing
// the spec calls for would never actually be drawn.
//
// EIGHT colours, REFERENCE.md Criterion A's per-aircraft budget, shared
// across both surface families: keyline, three astern greys, two dorsal
// blues, two flame tones. The magenta canopy fleck is dropped here — it is
// 4 px, it is on the far side for half the roll, and spending a ninth slot
// on it would break the gate.
//
// ORIGINAL pixel art per ARCHITECTURE.md D5.
import { PixelCanvas, buildStrip } from '../canvas.js';
import { PLAYER_ROLL as R } from '../palettes.js';
import { levelOps, CELL_W, CELL_H, LOCAL_W, LOCAL_H } from './player-f14.js';

const FRAMES = 8;

// levelOps() asks for the role names the astern drawing uses. Each of the
// three sets below is drawn from the SAME eight colours, so which set a
// frame uses never changes the sheet's palette count.
const VENTRAL = {
  key: R.keyline,
  lightTop: R.greyLight,
  midNeutral: R.greyMid,
  coolDark: R.greyDark,
  deepShadow: R.greyDark,
  canopy: R.blueDark,
  flame: R.nozzleCore,
  flameCore: R.nozzleHot,
};
const DORSAL = {
  key: R.keyline,
  lightTop: R.blueLight,
  midNeutral: R.blueDark,
  coolDark: R.blueDark,
  deepShadow: R.keyline,
  canopy: R.greyDark,
  flame: R.nozzleCore,
  flameCore: R.nozzleHot,
};
// Quarter-roll: the aircraft is on its side, so the camera sees the dorsal
// top lit and the grey flank below it at once.
const EDGE = {
  key: R.keyline,
  lightTop: R.blueLight,
  midNeutral: R.greyMid,
  coolDark: R.greyDark,
  deepShadow: R.blueDark,
  canopy: R.greyDark,
  flame: R.nozzleCore,
  flameCore: R.nozzleHot,
};

const SPAN_FLOOR = 0.30;

function rollTransform(theta) {
  const k = Math.max(SPAN_FLOOR, Math.abs(Math.cos(theta)));
  const ca = Math.cos(theta);
  const sa = Math.sin(theta);
  const ox = (LOCAL_W - 1) / 2;
  const oy = (LOCAL_H - 1) / 2;
  const dx = (CELL_W - 1) / 2;
  const dy = (CELL_H - 1) / 2;
  const xf = ([x, y]) => {
    // Foreshorten ACROSS THE SPAN first, in the aircraft's own frame, then
    // turn the result. Doing it the other way round squashes the rotated
    // bounding box instead of the wings and the fins come out bent.
    const px = (x - ox) * k;
    const py = y - oy;
    return [dx + px * ca + py * sa, dy - px * sa + py * ca];
  };
  // Discs (the nozzles) are circular on the airframe; under an anisotropic
  // squeeze they become ellipses, which this primitive set cannot draw, so
  // they take the mean scale. At the quarter points that is the difference
  // between a 2 px and a 5 px nozzle, which is the right order either way.
  xf.scale = (k + 1) / 2;
  return xf;
}

function rolesFor(w) {
  if (w <= 0.4) return VENTRAL;
  if (w >= 0.6) return DORSAL;
  return EDGE;
}

function drawRollFrame(canvas, index) {
  const theta = (index / FRAMES) * Math.PI * 2;
  const w = (1 - Math.cos(theta)) / 2; // 0 = ventral/astern, 1 = dorsal
  const c = rolesFor(w);
  const xf = rollTransform(theta);
  for (const op of levelOps(c)) {
    if (op.kind === 'poly') {
      canvas.polygon(op.points.map(xf), op.hex);
    } else {
      const [cx, cy] = xf([op.x, op.y]);
      canvas.disc(cx, cy, op.r * xf.scale, op.hex);
    }
  }
  canvas.outline4(c.key);
}

export function buildPlayerF14RollSheet() {
  return buildStrip(CELL_W, CELL_H, FRAMES, drawRollFrame, {
    maxColours: 8,
    label: 'player-f14-roll',
  });
}

export { FRAMES as ROLL_FRAMES };

// player-f14.png — 9 drawn bank poses of the player F-14, astern view.
//
// ============================== R5b REWRITE ==============================
// The first version of this sheet shipped a DIFFERENT aircraft from the one
// REFERENCE.md's JET-SIL operator was satisfied against. Its level cell drew
// a pair of full-width horizontal wing planks, a detached grey nose delta
// floating above them with sky in between, and two oversized nacelle rings
// hanging below the wing line. On screen that reads as two overlapping
// airframes, which is exactly what the team lead measured on
// tools/out/dash-r5/{s1-flight,stages-level}. Meanwhile NIGHT stages looked
// correct, because night falls back to the procedural silhouette in
// src/render/spriteFactory.js (player.js skips the sheet when _night) — so
// the regression was "the sheet is a different, worse drawing", not a
// draw-path bug.
//
// This rewrite deletes that geometry. The level cell is now the SAME
// silhouette as spriteFactory.js's drawJetSilhouette() — the one checked
// against the authoritative crop (reference/stage3-night-level-t175.png,
// x[207,487] y[227,306], viewed at 4x nearest) and against REFERENCE.md's
// acceptance table — and the eight banked cells are that same planform
// rotated and foreshortened, then SCAN-CONVERTED FRESH per cell. That is
// what makes them drawn poses rather than one resampled bitmap: no cell is
// produced by resampling another, every cell lands on the pixel grid, and
// the wing/fin/nacelle footprint differs per cell.
//
// *** THIS GEOMETRY IS MIRRORED IN src/render/spriteFactory.js. ***
// drawJetSilhouette() there must stay pixel-identical to LEVEL_OPS below;
// night and the barrel roll still use it, and a divergence reintroduces
// exactly the day/night split this rewrite fixes. Change both or neither.
//
// Structure the crop shows and the numbers do not (REFERENCE.md says so in
// as many words — "the reference crop is authoritative over every number"):
// two SEPARATE nacelle pods with the fuselage visible between them; the fin
// blades rising FROM the nacelles, canted outward, with sky between blade
// and spine; wings that sweep and taper to a thin tip plank rather than
// ending as a rectangle; a magenta canopy fleck as the topmost body
// element; small ventral fins under the nozzle line.
//
// Cell is 100x72, not 100x40. Two reasons:
//   1. 40 did not match JET_H=31 in spriteFactory, so every sheet cell was
//      rendered into a quad authored for a 31-row texture and came out
//      vertically squashed by 31/40 = 0.775 — flattening an already-flat
//      drawing. Sheet and procedural buffer now share one aspect.
//   2. A planform rotated 65 degrees needs the headroom; at 40 rows the
//      hard-bank poses would clip.
// The airframe still occupies ~31 rows, so one authored pixel is still one
// native pixel on screen at the sprite's scale (worldHeight tracks JET_H).
// All poses are drawn about the CELL CENTRE, which is the sprite's anchor,
// so banking rotates the jet in place exactly as material.rotation did.
//
// ORIGINAL pixel art per ARCHITECTURE.md D5 — drawn from measurements and
// the reference crops, no SEGA sprite data copied or traced.
import { PixelCanvas, buildStrip } from '../canvas.js';
import { PLAYER, PLAYER_NIGHT } from '../palettes.js';

const CELL_W = 100;
const CELL_H = 72;
const BANK_ANGLES = [-65, -45, -25, -10, 0, 10, 25, 45, 65];

// ---------------------------------------------------------------------------
// Level planform, authored in a 100x31 local box (x 0..99, y 0..30).
//
// Anchors, all as a fraction of SPAN (=100 px here) so they can be read
// straight off REFERENCE.md's acceptance table:
//   nacelle centres   x = 35 / 65    -> nozzle-centre separation 30.0% of
//                                       span (band 25-35%, arcade 30.1%)
//   blade root centres x = 37 / 63   -> root half-separation 13.0%
//   blade top  centres x = 33.5/66.5 -> top  half-separation 16.5%
//                                       cant 16.5/13.0 = 1.269 (>=1.15,
//                                       arcade 1.23-1.29)
//   blade half-width 1.5            -> fin-pair lateral EXTENT
//                                       2*(16.5+1.5) = 36.0% of span
//                                       (band 30-40%, arcade 35.4-35.7%)
// The blades never meet — there is no spine between them — so every fin row
// holds two runs separated by >= 0.03*SPAN. The R4 shape's `fillRect` spine
// is what welded them into one bar and destroyed that statistic.
// ---------------------------------------------------------------------------
const LOCAL_W = 100;
const LOCAL_H = 31;
const CX = 50;
const ROOT_Y = 13; // fin root / nacelle-saddle top
const TOP_HALF = 16.5;
const ROOT_HALF = 13;
const BLADE_HALF_W = 1.5;
const NAC_X = [35, 65];
const NAC_Y = 25;

const bladeHalfSepAt = (y) => TOP_HALF + (ROOT_HALF - TOP_HALF) * (y / ROOT_Y);

function bladePoly(sign) {
  const s = sign;
  return [
    [CX + s * (bladeHalfSepAt(0) - BLADE_HALF_W), 0],
    [CX + s * (bladeHalfSepAt(0) + BLADE_HALF_W), 0],
    [CX + s * (bladeHalfSepAt(ROOT_Y) + BLADE_HALF_W), ROOT_Y],
    [CX + s * (bladeHalfSepAt(ROOT_Y) - BLADE_HALF_W), ROOT_Y],
  ];
}

// Palette ROLES. Eight entries, which is REFERENCE.md Criterion A's
// per-aircraft budget and what canvas.assertPalette enforces at export.
// REFERENCE.md §3 lists ten tones for the arcade jet (six airframe greys +
// keyline + canopy + two flame); at a 100 px span two of the six greys are
// never more than a one-pixel band, so lightNeutral and warmShadow are
// folded into midNeutral and deepWarmShadow rather than spending two of the
// eight slots on tones that cannot read.
function roles(p) {
  return {
    key: p.keyline,
    lightTop: p.lightTop,
    midNeutral: p.midNeutral,
    coolDark: p.coolDark,
    deepShadow: p.deepWarmShadow,
    canopy: p.canopy,
    flame: p.nozzleCore,
    flameCore: p.nozzleHot,
  };
}

// The draw program, in local coordinates. Back to front. `poly` entries are
// scan-converted; `disc` entries are hard-threshold circles whose centre is
// transformed and whose radius is scaled by the pose's foreshortening.
function levelOps(c) {
  const ops = [];
  const poly = (points, hex) => ops.push({ kind: 'poly', points, hex });
  const rect = (x, y, w, h, hex) =>
    poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], hex);
  const disc = (x, y, r, hex) => ops.push({ kind: 'disc', x, y, r, hex });

  // Fin blades: two canted, never-touching blades. Drawn first so the
  // nacelle saddle paints over their roots.
  poly(bladePoly(-1), c.coolDark);
  poly(bladePoly(+1), c.coolDark);

  // Swept, tapered wings. Root chord x=30..33 spans rows 16-22, which puts
  // it INSIDE the fuselage box below — that overlap is load-bearing, not
  // decoration: the R5b first draft attached the wings to the body through
  // a single 1 px row, and under JET-SIL's own mask (keyline #000000 fails
  // max(RGB)>30) the outer panels fell off the largest 8-connected
  // component entirely, reading SPAN 68 on a 100 px aircraft. A silhouette
  // that an operator can disconnect is a silhouette with a weak join.
  poly([[30, 16], [1, 22], [1, 25], [33, 22]], c.lightTop);
  poly([[70, 16], [98, 22], [98, 25], [66, 22]], c.lightTop);
  // Underside: the band between mid-chord and the trailing edge. Kept thin
  // on purpose — a large warm-shadow region also satisfies JET-SIL's
  // nozzle-glow hue/sat/val test and would be picked up as a false third
  // "nozzle" by the two-largest-component step.
  poly([[32, 20], [1, 24], [1, 25], [33, 22]], c.midNeutral);
  poly([[68, 20], [98, 24], [98, 25], [67, 22]], c.midNeutral);

  // Body: nacelle saddle, then the fuselage box the wings root into. One
  // connected mass — the fuselage reads as visible BETWEEN the nacelles
  // through the notch highlight, not as a literal gap (a gap would split
  // the mask into two components and JET-SIL keeps only the largest).
  poly([[NAC_X[0], ROOT_Y], [NAC_X[1], ROOT_Y], [69, 16], [31, 16]], c.midNeutral);
  poly([[31, 16], [69, 16], [72, 22], [28, 22]], c.lightTop);
  // Saddle notch: t175 shows the body dip to a point between the two pods.
  poly([[44, ROOT_Y], [56, ROOT_Y], [50, 17]], c.midNeutral);
  rect(28, 18, 44, 1, c.midNeutral); // chord break along the wing root

  // Canopy fleck — topmost body element, the only non-grey/non-orange
  // accent. REFERENCE.md's canopy-coverage bound: a fleck, never a shape.
  rect(48, 14, 4, 2, c.canopy);

  // Boat-tail: the shadowed belly between the wing roots and the pods...
  poly([[31, 20], [69, 20], [66, 25], [34, 25]], c.deepShadow);
  // ...but NOT edge to edge. The t175 crop shows a grey centre fuselage
  // running down BETWEEN the two pods, carrying a small dark notch, with
  // the shadow confined to the two bays either side of it. Painting the
  // whole bay dark (the R5b first draft) reads as a hole punched through
  // the aircraft instead of a body seen between its engines.
  poly([[44, 18], [56, 18], [54, 30], [46, 30]], c.midNeutral);
  rect(47, 21, 6, 3, c.key);

  // Ventral fins flanking the nozzles (visible in the t175 crop below the
  // nozzle line).
  poly([[NAC_X[0] - 3, 24], [NAC_X[0] - 8, 28], [NAC_X[0] - 1, 25]], c.coolDark);
  poly([[NAC_X[1] + 3, 24], [NAC_X[1] + 8, 28], [NAC_X[1] + 1, 25]], c.coolDark);

  // Nacelle pods + nozzles. The POD is airframe grey and overlaps the
  // fuselage box (rows 18-22), which is what keeps the lower third of the
  // silhouette attached: a bare flame disc inside a closed black ring is an
  // ISLAND under any brightness mask (the ring fails max(RGB)>30), and the
  // R5b first draft measured H=25 on a 31-row aircraft for exactly that
  // reason. The arcade's t175 pods are grey structures too — the black is
  // confined to the nozzle throat, which is the dark anchor of the whole
  // silhouette (art critique §2.1); the R4 sprite had soft glowing donuts
  // and no black anywhere.
  for (const nx of NAC_X) {
    disc(nx, NAC_Y - 1, 6, c.midNeutral);
    disc(nx, NAC_Y - 1, 5.2, c.coolDark);
    disc(nx, NAC_Y, 4.2, c.key);
    disc(nx, NAC_Y, 2.9, c.flame);
    disc(nx, NAC_Y, 1.2, c.flameCore);
  }
  return ops;
}

// ---------------------------------------------------------------------------
// Pose transform. A bank is a roll about the aircraft's own longitudinal
// axis, and from directly astern that axis points at the camera — so the
// planform rotates in the IMAGE PLANE and does not foreshorten in span.
// What does change with |bank| is apparent size: the arcade's hard-bank
// frames (reference/stage1-hard-bank-t98.png) show the jet at roughly 60%
// of its level span as it pulls away from the camera. SHRINK models that;
// it also keeps the rotated box inside the cell (at 65 deg the rotated
// height is 0.66*(31*cos65 + 100*sin65) = 68 < 72).
//
// Sign: cell labelled L depicts the planform rotated COUNTER-CLOCKWISE on
// screen by L degrees. player.js calls selectPoseCell with `-poseDeg`, and
// the rotation it replaces was `material.rotation = -degToRad(poseDeg)`
// (THREE's positive rotation is CCW), so cell `-poseDeg` must equal "CCW by
// -poseDeg" = "CW by poseDeg" = stick-right drops the right wing. Verified
// on a live banked capture, not from this comment alone.
// ---------------------------------------------------------------------------
const SHRINK = 0.34; // span loss at full deflection, fraction

function poseTransform(bankDeg) {
  const sev = Math.max(-1, Math.min(1, bankDeg / 65));
  const k = 1 - SHRINK * Math.abs(sev);
  const a = (bankDeg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const ox = (LOCAL_W - 1) / 2;
  const oy = (LOCAL_H - 1) / 2;
  const dx = (CELL_W - 1) / 2;
  const dy = (CELL_H - 1) / 2;
  const xf = ([x, y]) => {
    const px = (x - ox) * k;
    const py = (y - oy) * k;
    return [dx + px * ca + py * sa, dy - px * sa + py * ca];
  };
  xf.scale = k;
  return xf;
}

function drawFrame(canvas, bankDeg, palette = PLAYER) {
  const c = roles(palette);
  const xf = poseTransform(bankDeg);
  for (const op of levelOps(c)) {
    if (op.kind === 'poly') {
      canvas.polygon(op.points.map(xf), op.hex);
    } else {
      const [cx, cy] = xf([op.x, op.y]);
      canvas.disc(cx, cy, op.r * xf.scale, op.hex);
    }
  }
  // 1 px keyline grown OUTWARD, so the authored fill colours inside thin
  // features (the 3 px blades) survive — an inset keyline eats them.
  canvas.outline4(c.key);
}

export function buildPlayerF14Sheet() {
  return buildStrip(
    CELL_W,
    CELL_H,
    BANK_ANGLES.length,
    (cell, i) => drawFrame(cell, BANK_ANGLES[i], PLAYER),
    { maxColours: 8, label: 'player-f14' }
  );
}

export function buildPlayerF14NightSheet() {
  return buildStrip(
    CELL_W,
    CELL_H,
    BANK_ANGLES.length,
    (cell, i) => drawFrame(cell, BANK_ANGLES[i], PLAYER_NIGHT),
    { maxColours: 8, label: 'player-f14-night' }
  );
}

export { BANK_ANGLES, CELL_W, CELL_H, LOCAL_W, LOCAL_H, drawFrame, levelOps, roles };

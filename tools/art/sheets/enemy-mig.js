// enemy-<livery>-<aspect>.png — 64x32, 5 bank frames each, two silhouette
// families across four liveries.
//
// ============================== R5b REWRITE ==============================
// The R4 report's gap 1 ("a slab with a bullseye") was partly answered by
// the first version of this generator — the bullseye went, the airframe
// went dark — but re-judged against the reference crops this round, two of
// the four reproduction criteria still failed and a third was untested:
//
//   * criterion (b), "wings with leading edge rising >=15 degrees": the
//     REAR sheet measured 10.8 / 12.5 deg (operator: tools/art/enemysil.py,
//     least-squares fit to the topmost filled row per column outboard of
//     the fuselage). The wings were nearly flat planks.
//   * criterion (d), ">=2 distinguishable types by silhouette": there was
//     exactly ONE silhouette. Four liveries recoloured the same aeroplane.
//   * the aircraft had no FUSELAGE. Both sheets drew wings, a fin and a
//     nose/nozzle feature with nothing joining them along the flight axis,
//     which is why the head-on cell reads as a gull rather than a jet. In
//     reference/ab2-arcade-closeup-enemies.jpg (head-on MiG, lower right)
//     and reference/stage1-missile-salvo-t100.75.png (three rear-aspect
//     jets around the salvo) the single loudest shape is a slender body
//     running the whole length of the aircraft, with the wings attached to
//     its middle.
//
// So: a body on both aspects, real sweep on the rear wings, and a second
// family. The families are deliberately far apart at 15%W —
//
//   'mig'    thin high-aspect swept wings with a visible chord taper,
//            separate low tailplanes, one fin. Flown by grey (stage 1) and
//            camo (stage 2) liveries.
//   'delta'  one solid triangular wing, no tailplane, a slightly fatter
//            body and a taller fin. Flown by interceptor and prop liveries.
//
// Neither resembles the player's twin-nacelle twin-blade F-14, which is the
// other readability requirement (art critique §2.2).
//
// ============================ R8 RIM REWRITE ============================
// Every one of these four draw functions ended with `c.outline4(p.keyline)`,
// a full 8-adjacent ring of pure #000000. Measured over the exported sheets
// that produced, on ALL SIXTEEN of them (4 liveries x 2 aspects x day/night),
// a perimeter that is 100.0 % near-black and a sprite that is 20-50 % black
// by area. R7 established for the PLAYER's daylight jet that the arcade does
// not outline its aircraft at all; the enemy kept the old treatment, which is
// this project's recurring "the named object got fixed and the class did
// not" failure (R4 sprites -> sea, R5 sea -> explosion, R7 player -> enemy).
//
// Re-measured on the ENEMY rather than taken from the player's result, since
// a criterion has to be checked against the arcade before it is tuned to:
// ab2-longplay-60fps.mp4 t=104s, verified stage 1 (HUD digit read in the
// frame), one rear-aspect enemy, airframe = largest 8-connected component of
// S<0.30 & V>0.176. Topmost airframe row per column has median V 0.953,
// the interior 0.788, the bottommost row 0.661 -- lit above, shaded below --
// and the dark rim pixels are ALL around the nozzle housing, none on the
// outer perimeter (tools/out/enemy-art/ARC-t104-rimmap-5x.png).
//
// So: `outlineSouth(p.shadow)` replaces `outline4(p.keyline)`. Black survives
// where the arcade has it -- the nozzle housing and the nose intake, below.
// The sheets stay at 8 colours because the rim reuses `shadow`.
//
// ORIGINAL pixel art per ARCHITECTURE.md D5 — drawn from the measurements
// and reference crops named above, no SEGA sprite data copied or traced.
import { PixelCanvas, buildStrip } from '../canvas.js';
import { ENEMY_LIVERIES, ENEMY_FAMILY } from '../palettes.js';

const CELL_W = 64;
const CELL_H = 32;
const BANK_ANGLES = [-30, -15, 0, 15, 30];

function bladePolygon(root, tip, widthRoot, widthTip) {
  const dx = tip[0] - root[0];
  const dy = tip[1] - root[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return [
    [root[0] + nx * widthRoot * 0.5, root[1] + ny * widthRoot * 0.5],
    [root[0] - nx * widthRoot * 0.5, root[1] - ny * widthRoot * 0.5],
    [tip[0] - nx * widthTip * 0.5, tip[1] - ny * widthTip * 0.5],
    [tip[0] + nx * widthTip * 0.5, tip[1] + ny * widthTip * 0.5],
  ];
}

// Bank is modelled as it is for the player: the planform turns in the image
// plane, so the NEAR side lengthens and drops while the FAR side shortens
// and tucks toward the centreline. Every cell is scan-converted from its own
// control points, so no cell is a resampling of another.
function sides(bankDeg) {
  const s = Math.max(-1, Math.min(1, bankDeg / 30));
  return { s, near: Math.max(s, 0), far: Math.max(-s, 0) };
}

// --- MIG ---------------------------------------------------------------
// Head-on: nose at the top, wings sweeping out and DOWN, tailplanes low.
function drawMigHead(c, bankDeg, p) {
  const { s, near, far } = sides(bankDeg);
  const ax = 32 - Math.round(3 * s); // body axis, shifted by bank

  // Fuselage: a slender dart down the flight axis. This is the shape the
  // first draft was missing entirely.
  c.polygon(
    [[ax, 3], [ax + 3, 11], [ax + 2, 26], [ax - 2, 26], [ax - 3, 11]],
    p.mid
  );
  c.polygon([[ax, 3], [ax + 3, 11], [ax, 26], [ax - 3, 11]], p.dominant);

  // Fin above the spine.
  c.polygon(bladePolygon([ax, 10], [ax + Math.round(2 * s), 1], 3, 1.4), p.dominant);

  // Wings: swept out and down. Tip y is 8 rows below the root, over 27
  // columns, which is the >=15 deg leading edge criterion (b) by
  // construction (atan(8/27) = 16.5 deg) before bank foreshortening.
  const shR = [ax + 3, 13];
  const shL = [ax - 3, 13];
  const tipR = [61 - Math.round(14 * far), 21 + Math.round(3 * near)];
  const tipL = [2 + Math.round(14 * near), 21 + Math.round(3 * far)];
  // R8: BOTH wings on `dominant`. R5b split them dominant/mid as a left-right
  // lighting cue; the arcade's stage-1 enemy is lit from ABOVE, not from one
  // side (topmost airframe row median V 0.953, interior 0.788, bottommost
  // 0.661, measured at t=104s), so the chordwise specular/shadow bands are the
  // modelling and the left-right split was only moving 15 % of the sprite down
  // a rung. The bank cells still read apart because their CONTROL POINTS
  // differ, which was always the stronger cue.
  c.polygon(bladePolygon(shR, tipR, 5, 1.4), p.dominant);
  c.polygon(bladePolygon(shL, tipL, 5, 1.4), p.dominant);
  // Underside SHADOW band along each wing's trailing edge (see drawMigRear).
  c.polygon(bladePolygon([shR[0], shR[1] + 3], [tipR[0], tipR[1] + 2], 2.0, 0.8), p.shadow);
  c.polygon(bladePolygon([shL[0], shL[1] + 3], [tipL[0], tipL[1] + 2], 2.0, 0.8), p.shadow);
  // 1 px specular on the LEADING (upper) edge of each wing.
  c.line(shR[0], shR[1] - 2, tipR[0], tipR[1] - 1, p.specular);
  c.line(shL[0], shL[1] - 2, tipL[0], tipL[1] - 1, p.specular);

  // Low tailplanes — the feature that separates this family from 'delta'.
  c.polygon(bladePolygon([ax + 2, 23], [ax + 10 - Math.round(4 * far), 25], 3, 1.2), p.highlight);
  c.polygon(bladePolygon([ax - 2, 23], [ax - 10 + Math.round(4 * near), 25], 3, 1.2), p.highlight);
  c.polygon([[ax - 3, 24], [ax + 3, 24], [ax + 2, 27], [ax - 2, 27]], p.shadow);

  noseIntake(c, ax, 9, p);
  c.outlineSouth(p.rim);
}

// Rear: tail toward camera, nozzle low on the body, wings sweeping out and UP.
function drawMigRear(c, bankDeg, p) {
  const { s, near, far } = sides(bankDeg);
  const ax = 32 - Math.round(3 * s);

  c.polygon([[ax, 4], [ax + 3, 14], [ax + 3, 25], [ax - 3, 25], [ax - 3, 14]], p.mid);
  c.polygon([[ax, 4], [ax + 3, 14], [ax, 25], [ax - 3, 14]], p.dominant);

  c.polygon(bladePolygon([ax, 13], [ax + Math.round(2 * s), 2], 3, 1.4), p.dominant);

  // Root y=19 to tip y=8 over 26 columns: atan(11/26) = 23 deg of leading
  // edge, which is what the first draft's near-flat 11-12 deg missed.
  const shR = [ax + 3, 19];
  const shL = [ax - 3, 19];
  const tipR = [61 - Math.round(14 * far), 8 - Math.round(3 * near)];
  const tipL = [2 + Math.round(14 * near), 8 - Math.round(3 * far)];
  c.polygon(bladePolygon(shR, tipR, 5, 1.4), p.dominant);
  c.polygon(bladePolygon(shL, tipL, 5, 1.4), p.dominant); // R8: see drawMigHead
  // R6: an underside SHADOW band along each wing's trailing edge, and the
  // specular on the leading edge. Five airframe tones instead of four — the
  // sheet was one colour under its own 8-budget, and the dark share is what
  // the arcade carries on the underside rather than over the whole airframe.
  c.polygon(bladePolygon([shR[0], shR[1] + 2], [tipR[0], tipR[1] + 2], 2.0, 0.8), p.shadow);
  c.polygon(bladePolygon([shL[0], shL[1] + 2], [tipL[0], tipL[1] + 2], 2.0, 0.8), p.shadow);
  c.line(shR[0], shR[1] - 1, tipR[0], tipR[1] - 1, p.specular);
  c.line(shL[0], shL[1] - 1, tipL[0], tipL[1] - 1, p.specular);

  c.polygon(bladePolygon([ax + 2, 22], [ax + 10 - Math.round(4 * far), 20], 3, 1.2), p.highlight);
  c.polygon(bladePolygon([ax - 2, 22], [ax - 10 + Math.round(4 * near), 20], 3, 1.2), p.highlight);
  // Belly shadow under the fuselage.
  c.polygon([[ax - 3, 23], [ax + 3, 23], [ax + 2, 26], [ax - 2, 26]], p.shadow);

  nozzle(c, ax, 23, p);
  c.outlineSouth(p.rim);
}

// --- DELTA -------------------------------------------------------------
// One triangular wing, no tailplane, a fatter body and a taller fin.
function drawDeltaHead(c, bankDeg, p) {
  const { s, near, far } = sides(bankDeg);
  const ax = 32 - Math.round(3 * s);
  const tipRx = 61 - Math.round(16 * far);
  const tipLx = 2 + Math.round(16 * near);

  // Delta: apex at the nose, straight trailing edge. Leading-edge angle is
  // atan(17/29) = 30 deg, comfortably past criterion (b).
  // R8 NOTE: the delta halves stay on DIFFERENT rungs, unlike the mig's wings.
  // Unifying them (as the mig's were) merges the whole triangle into one
  // 8-connected single-colour component and ENEMY-SIL's compact-feature gate
  // goes 4.4 % -> 12.9 % of area against a <=12 % target on cells 0 and 4 --
  // the triangle is compact enough to pass the aspect/fill test that a swept
  // wing fails. Measured both ways; the split is load-bearing here and the
  // stage-1 lighting measurement that motivates the mig change was taken on a
  // mig-type aircraft, not on this one.
  c.polygon([[ax, 5], [tipRx, 22], [tipRx - 4, 24], [ax, 20]], p.dominant);
  c.polygon([[ax, 5], [tipLx, 22], [tipLx + 4, 24], [ax, 20]], p.mid);
  // Shadowed trailing edge of the delta (see drawMigRear's R6 note).
  c.polygon([[ax, 19], [tipRx - 1, 23], [tipRx - 4, 24], [ax, 20]], p.shadow);
  c.polygon([[ax, 19], [tipLx + 1, 23], [tipLx + 4, 24], [ax, 20]], p.shadow);
  c.line(ax, 5, tipRx, 22, p.specular);
  c.line(ax, 5, tipLx, 22, p.specular);

  c.polygon([[ax, 3], [ax + 4, 12], [ax + 3, 26], [ax - 3, 26], [ax - 4, 12]], p.highlight);
  c.polygon([[ax, 3], [ax + 4, 12], [ax, 26], [ax - 4, 12]], p.mid);
  c.polygon(bladePolygon([ax, 10], [ax + Math.round(3 * s), 1], 3.4, 1.4), p.dominant);

  noseIntake(c, ax, 9, p);
  c.outlineSouth(p.rim);
}

function drawDeltaRear(c, bankDeg, p) {
  const { s, near, far } = sides(bankDeg);
  const ax = 32 - Math.round(3 * s);
  const tipRx = 61 - Math.round(16 * far);
  const tipLx = 2 + Math.round(16 * near);

  c.polygon([[ax, 25], [tipRx, 9], [tipRx - 4, 7], [ax, 21]], p.dominant);
  c.polygon([[ax, 25], [tipLx, 9], [tipLx + 4, 7], [ax, 21]], p.mid); // see drawDeltaHead
  c.polygon([[ax, 26], [tipRx - 1, 10], [tipRx, 9], [ax, 25]], p.shadow);
  c.polygon([[ax, 26], [tipLx + 1, 10], [tipLx, 9], [ax, 25]], p.shadow);
  c.line(ax, 25, tipRx, 9, p.specular);
  c.line(ax, 25, tipLx, 9, p.specular);

  c.polygon([[ax, 3], [ax + 4, 13], [ax + 4, 26], [ax - 4, 26], [ax - 4, 13]], p.highlight);
  c.polygon([[ax, 3], [ax + 4, 13], [ax, 26], [ax - 4, 13]], p.mid);
  c.polygon(bladePolygon([ax, 12], [ax + Math.round(3 * s), 2], 3.4, 1.4), p.dominant);

  nozzle(c, ax, 23, p);
  c.outlineSouth(p.rim);
}

// --- Shared features ----------------------------------------------------
// The nose intake is a MARK, kept small on purpose: R4's version was a
// 19%-of-span red disc, "a bullseye". Outer radius 2.6 on a ~59 px span is
// 8.8%, and under tools/art/enemysil.py's compact-component gate it is a
// few per cent of silhouette area against the <=12% criterion.
//
// R8: the SIZE was fine and the STRUCTURE was inside out. Measured on the
// head-on MiG's nose in reference/ab2-arcade-closeup-enemies.jpg (4.5x
// upscale of native; this is a STAGE-2 frame and only its GEOMETRY is
// licensed here -- the camo colours stay on the camo livery, which is ledger
// row 12's rule), crop x[1080,1180] y[750,840]:
//
//     near-black housing   bbox 77x68   (merges into the camo airframe, so
//                                        this over-reads -- bound, not value)
//     red annulus          bbox 31x28   -> 6.9 native px across
//     pale core            bbox 18x19   -> 4.0 native px across, SOLID
//
// So the arcade's nose is dark OUTSIDE, red ring, pale core, and the core is
// 0.58 of the red's diameter. Ours drew the red as the OUTERMOST element with
// no dark housing at all, and then put a #000000 dot in the MIDDLE of the
// pale core -- which is why it reads as a red-rimmed eye rather than an
// intake. Dark outside, nothing black in the centre, core/red = 2.8/5.2 =
// 0.54 against the arcade's 0.58.
function noseIntake(c, x, y, p) {
  c.disc(x, y, 3.4, p.keyline); // housing, 11.5 % of a ~59 px span
  c.ring(x, y, 2.6, 1.4, p.intakeRing);
  c.disc(x, y, 1.4, p.intakeCore);
}

// R5 interfaces I2, measured on stage1-missile-salvo-t100.75.png: "near-black
// nozzle rings with a hot orange centre". The ring is thick and the orange
// is small — the dark ring has to win, or the two pods read as eyes (art
// critique §2.2: "they are insects").
//
// R8: the RATIO is now measured instead of asserted. Same t104 stage-1 enemy
// as the rim measurement above (ab2-longplay-60fps.mp4, HUD digit 1), largest
// 8-connected component of V<=0.30 for the housing and of (S>0.45 AND
// R>B+50 AND V>0.39) for the glow:
//
//     housing      39 x 38 px      orange core  19 x 20 px      ratio 2.05
//
// Span-normalised the housing is 23.5 % of that aircraft's 166 px bbox width,
// but THAT NUMBER IS NOT USED: the subject is banked (bbox aspect 1.5 against
// a level enemy's ~3), so span under-reads and 23.5 % would scale to a 14 px
// bell on our level cell. The scale-free DIAMETER RATIO is the measurement
// that survives the pose, and ours was 8 : 4.8 = 1.67 -- the glow too large
// inside too thin a ring, which is the R4 "glowing eyes" direction. 11 : 5.4
// = 2.04 reproduces the arcade's and grows the whole assembly from 12.5 % to
// 17.2 % of the cell, which is between ours and the banked bound.
function nozzle(c, x, y, p) {
  c.disc(x, y, 5.5, p.keyline);
  c.disc(x, y, 2.7, p.nozzleCore);
  c.disc(x, y, 1.1, p.nozzleHot);
}

const DRAW = {
  mig: { headOn: drawMigHead, rear: drawMigRear },
  delta: { headOn: drawDeltaHead, rear: drawDeltaRear },
};

// R6: the night ramp is the SAME drawing with five airframe tones swapped,
// generated by the same function, so a night sheet cannot drift from its day
// sheet the way the player's day and night sheets did in R5. Night exists at
// all because judging/R5/report.md's "what nobody had looked at" found that
// `if (detail && !night)` in src/entities/enemySprite.js sent EVERY stage-3
// enemy to the procedural fallback — the R5 redraw covered daylight only.
function paletteFor(livery, night) {
  const p = ENEMY_LIVERIES[livery];
  if (!night) return p;
  return { ...p, ...p.night };
}

/** Builds one 5-cell strip for a (livery, aspect, night) triple. The
 *  silhouette family is looked up from the livery, so callers never pick a
 *  family directly and the sheet file name fully determines the art. */
export function buildEnemySheet(livery, aspect, night = false) {
  const p = paletteFor(livery, night);
  const draw = DRAW[ENEMY_FAMILY[livery]][aspect];
  return buildStrip(
    CELL_W,
    CELL_H,
    BANK_ANGLES.length,
    (cell, i) => draw(cell, BANK_ANGLES[i], p),
    { maxColours: 8, label: `enemy-${livery}-${aspect}${night ? '-night' : ''}` }
  );
}

export const ENEMY_SHEET_LIVERIES = Object.keys(ENEMY_LIVERIES);
export const ENEMY_SHEET_ASPECTS = ['headOn', 'rear'];

// Back-compat names used by the previous build manifest.
export const buildEnemyMigHeadSheet = () => buildEnemySheet('grey', 'headOn');
export const buildEnemyMigRearSheet = () => buildEnemySheet('grey', 'rear');
export const ENEMY_SHEET_NIGHT = [false, true];

export { BANK_ANGLES, CELL_W, CELL_H };

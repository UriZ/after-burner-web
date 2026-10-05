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
  c.polygon(bladePolygon(shR, tipR, 5, 1.4), p.mid);
  c.polygon(bladePolygon(shL, tipL, 5, 1.4), p.dominant);
  // 1 px specular on the LEADING (upper) edge of each wing.
  c.line(shR[0], shR[1] - 2, tipR[0], tipR[1] - 1, p.specular);
  c.line(shL[0], shL[1] - 2, tipL[0], tipL[1] - 1, p.specular);

  // Low tailplanes — the feature that separates this family from 'delta'.
  c.polygon(bladePolygon([ax + 2, 23], [ax + 10 - Math.round(4 * far), 25], 3, 1.2), p.highlight);
  c.polygon(bladePolygon([ax - 2, 23], [ax - 10 + Math.round(4 * near), 25], 3, 1.2), p.mid);

  noseIntake(c, ax, 9, p);
  c.outline4(p.keyline);
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
  c.polygon(bladePolygon(shR, tipR, 5, 1.4), p.mid);
  c.polygon(bladePolygon(shL, tipL, 5, 1.4), p.dominant);
  c.line(shR[0], shR[1] + 2, tipR[0], tipR[1] + 1, p.specular);
  c.line(shL[0], shL[1] + 2, tipL[0], tipL[1] + 1, p.specular);

  c.polygon(bladePolygon([ax + 2, 22], [ax + 10 - Math.round(4 * far), 20], 3, 1.2), p.highlight);
  c.polygon(bladePolygon([ax - 2, 22], [ax - 10 + Math.round(4 * near), 20], 3, 1.2), p.mid);

  nozzle(c, ax, 23, p);
  c.outline4(p.keyline);
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
  c.polygon([[ax, 5], [tipRx, 22], [tipRx - 4, 24], [ax, 20]], p.mid);
  c.polygon([[ax, 5], [tipLx, 22], [tipLx + 4, 24], [ax, 20]], p.dominant);
  c.line(ax, 5, tipRx, 22, p.specular);
  c.line(ax, 5, tipLx, 22, p.specular);

  c.polygon([[ax, 3], [ax + 4, 12], [ax + 3, 26], [ax - 3, 26], [ax - 4, 12]], p.highlight);
  c.polygon([[ax, 3], [ax + 4, 12], [ax, 26], [ax - 4, 12]], p.mid);
  c.polygon(bladePolygon([ax, 10], [ax + Math.round(3 * s), 1], 3.4, 1.4), p.dominant);

  noseIntake(c, ax, 9, p);
  c.outline4(p.keyline);
}

function drawDeltaRear(c, bankDeg, p) {
  const { s, near, far } = sides(bankDeg);
  const ax = 32 - Math.round(3 * s);
  const tipRx = 61 - Math.round(16 * far);
  const tipLx = 2 + Math.round(16 * near);

  c.polygon([[ax, 25], [tipRx, 9], [tipRx - 4, 7], [ax, 21]], p.mid);
  c.polygon([[ax, 25], [tipLx, 9], [tipLx + 4, 7], [ax, 21]], p.dominant);
  c.line(ax, 25, tipRx, 9, p.specular);
  c.line(ax, 25, tipLx, 9, p.specular);

  c.polygon([[ax, 3], [ax + 4, 13], [ax + 4, 26], [ax - 4, 26], [ax - 4, 13]], p.highlight);
  c.polygon([[ax, 3], [ax + 4, 13], [ax, 26], [ax - 4, 13]], p.mid);
  c.polygon(bladePolygon([ax, 12], [ax + Math.round(3 * s), 2], 3.4, 1.4), p.dominant);

  nozzle(c, ax, 23, p);
  c.outline4(p.keyline);
}

// --- Shared features ----------------------------------------------------
// The nose intake is a MARK, kept small on purpose: R4's version was a
// 19%-of-span red disc, "a bullseye". Outer radius 2.6 on a ~59 px span is
// 8.8%, and under tools/art/enemysil.py's compact-component gate it is a
// few per cent of silhouette area against the <=12% criterion.
function noseIntake(c, x, y, p) {
  c.ring(x, y, 2.6, 1.7, p.intakeRing);
  c.disc(x, y, 1.5, p.intakeCore);
  c.disc(x, y, 0.6, p.keyline);
}

// R5 interfaces I2, measured on stage1-missile-salvo-t100.75.png: "near-black
// nozzle rings with a hot orange centre". The ring is thick and the orange
// is small — the dark ring has to win, or the two pods read as eyes (art
// critique §2.2: "they are insects").
function nozzle(c, x, y, p) {
  c.disc(x, y, 4.0, p.keyline);
  c.disc(x, y, 2.4, p.nozzleCore);
  c.disc(x, y, 1.0, p.nozzleHot);
}

const DRAW = {
  mig: { headOn: drawMigHead, rear: drawMigRear },
  delta: { headOn: drawDeltaHead, rear: drawDeltaRear },
};

/** Builds one 5-cell strip for a (livery, aspect) pair. The silhouette
 *  family is looked up from the livery, so callers never pick a family
 *  directly and the sheet file name fully determines the art. */
export function buildEnemySheet(livery, aspect) {
  const p = ENEMY_LIVERIES[livery];
  const draw = DRAW[ENEMY_FAMILY[livery]][aspect];
  return buildStrip(
    CELL_W,
    CELL_H,
    BANK_ANGLES.length,
    (cell, i) => draw(cell, BANK_ANGLES[i], p),
    { maxColours: 8, label: `enemy-${livery}-${aspect}` }
  );
}

export const ENEMY_SHEET_LIVERIES = Object.keys(ENEMY_LIVERIES);
export const ENEMY_SHEET_ASPECTS = ['headOn', 'rear'];

// Back-compat names used by the previous build manifest.
export const buildEnemyMigHeadSheet = () => buildEnemySheet('grey', 'headOn');
export const buildEnemyMigRearSheet = () => buildEnemySheet('grey', 'rear');

export { BANK_ANGLES, CELL_W, CELL_H };

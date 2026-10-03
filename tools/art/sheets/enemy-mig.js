// enemy-mig-head.png / enemy-mig-rear.png — 64x32, 5 bank frames each.
//
// Structural reference: reference/stage1-missile-salvo-t100.75.png (rear
// aspect, stage-1, the frame interface I2 measured — single bright-orange
// nozzle per jet, black ring, swept wings, airframe mid-grey against sky);
// reference/ab2-arcade-closeup-enemies.jpg (head-on nose/intake structure,
// though that frame's CAMO colouring is stage-2 and not used here — see
// palettes.js ENEMY comment). Original drawing per ARCHITECTURE.md D5.
//
// Deliberately single-engine / single-fin, unlike the player's twin-engine
// twin-fin F-14 silhouette (player-f14.js) — this is both structurally
// closer to a MiG profile and a readability win: enemy vs. player should
// be distinguishable by silhouette alone, not just colour.
import { PixelCanvas, buildStrip } from '../canvas.js';
import { ENEMY } from '../palettes.js';

const CELL_W = 64;
const CELL_H = 32;
const BANK_ANGLES = [-30, -15, 0, 15, 30];

function bladePolygon(root, tip, widthRoot, widthTip) {
  const dx = tip[0] - root[0], dy = tip[1] - root[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  return [
    [root[0] + nx * widthRoot * 0.5, root[1] + ny * widthRoot * 0.5],
    [root[0] - nx * widthRoot * 0.5, root[1] - ny * widthRoot * 0.5],
    [tip[0] - nx * widthTip * 0.5, tip[1] - ny * widthTip * 0.5],
    [tip[0] + nx * widthTip * 0.5, tip[1] + ny * widthTip * 0.5],
  ];
}

// --- Rear aspect -------------------------------------------------------
function rearGeometry(bankDeg) {
  const s = Math.max(-1, Math.min(1, bankDeg / 30));
  const sp = Math.max(s, 0), sn = Math.max(-s, 0);

  const nozzle = [32 - Math.round(3 * s), 19 + Math.round(1 * Math.abs(s))];
  const nozzleR = 5.4;

  const finRoot = [nozzle[0], 16];
  const finTip = [nozzle[0] + 2 + Math.round(4 * s), 3];

  const shoulderR = [nozzle[0] + 5 - Math.round(2 * sn), 15];
  const shoulderL = [nozzle[0] - 5 + Math.round(2 * sp), 15];
  const wingTipR = [62 - Math.round(15 * sn), 9 + Math.round(4 * sp)];
  const wingTipL = [2 + Math.round(15 * sp), 9 + Math.round(4 * sn)];

  return { nozzle, nozzleR, finRoot, finTip, shoulderR, shoulderL, wingTipR, wingTipL };
}

function drawRearFrame(canvas, bankDeg) {
  const g = rearGeometry(bankDeg);

  canvas.polygon(bladePolygon(g.shoulderR, g.wingTipR, 4.2, 1.2), ENEMY.midGrey);
  canvas.polygon(bladePolygon(g.shoulderL, g.wingTipL, 4.2, 1.2), ENEMY.darkDominant);
  // Bright specular stripe along each wing's leading (upper) edge, 1px.
  canvas.line(g.shoulderR[0], g.shoulderR[1] - 1, g.wingTipR[0], g.wingTipR[1] - 1, ENEMY.specular);
  canvas.line(g.shoulderL[0], g.shoulderL[1] - 1, g.wingTipL[0], g.wingTipL[1] - 1, ENEMY.specular);

  // Fin doubles as the fuselage spine — rooted low enough to be covered
  // by the nozzle disc painted next, so there is no seam between the two.
  canvas.polygon(bladePolygon(g.finRoot, g.finTip, 3.6, 1.6), ENEMY.darkDominant);

  // Single nozzle: black ring, orange core, hot centre.
  canvas.ring(g.nozzle[0], g.nozzle[1], g.nozzleR * 0.95, g.nozzleR * 0.78, ENEMY.keyline);
  canvas.disc(g.nozzle[0], g.nozzle[1], g.nozzleR * 0.72, ENEMY.lightGrey);
  canvas.disc(g.nozzle[0], g.nozzle[1], g.nozzleR * 0.5, ENEMY.nozzleCore);
  canvas.disc(g.nozzle[0], g.nozzle[1], g.nozzleR * 0.2, ENEMY.nozzleHot);

  canvas.outline4(ENEMY.keyline);
}

// --- Head-on aspect ------------------------------------------------------
function headGeometry(bankDeg) {
  const s = Math.max(-1, Math.min(1, bankDeg / 30));
  const sp = Math.max(s, 0), sn = Math.max(-s, 0);

  const nose = [32 - Math.round(3 * s), 4];
  const intake = [nose[0], 10];
  const shoulderR = [nose[0] + 6, 14 - Math.round(2 * sn)];
  const shoulderL = [nose[0] - 6, 14 - Math.round(2 * sp)];
  const wingTipR = [62 - Math.round(13 * sn), 19 + Math.round(3 * sp)];
  const wingTipL = [2 + Math.round(13 * sp), 19 + Math.round(3 * sn)];
  const finTip = [nose[0] + Math.round(2 * s), 1];

  return { nose, intake, shoulderR, shoulderL, wingTipR, wingTipL, finTip };
}

function drawHeadFrame(canvas, bankDeg) {
  const g = headGeometry(bankDeg);

  canvas.polygon(bladePolygon(g.shoulderR, g.wingTipR, 4.2, 1.2), ENEMY.midGrey);
  canvas.polygon(bladePolygon(g.shoulderL, g.wingTipL, 4.2, 1.2), ENEMY.darkDominant);
  canvas.line(g.shoulderR[0], g.shoulderR[1] + 1, g.wingTipR[0], g.wingTipR[1] + 1, ENEMY.specular);
  canvas.line(g.shoulderL[0], g.shoulderL[1] + 1, g.wingTipL[0], g.wingTipL[1] + 1, ENEMY.specular);

  // Nose/fuselage: narrow dart from nose to shoulders.
  canvas.polygon([g.nose, g.shoulderR, [g.nose[0], 15], g.shoulderL], ENEMY.midGrey);
  canvas.polygon(bladePolygon(g.nose, g.finTip, 2.4, 1.6), ENEMY.darkDominant);

  // Nose intake: small red ring, pale core — ~8% of span, per the critique's
  // correction of the old 19%-span bullseye nose.
  canvas.ring(g.intake[0], g.intake[1], 2.6, 1.7, ENEMY.intakeRing);
  canvas.disc(g.intake[0], g.intake[1], 1.5, ENEMY.intakeCore);
  canvas.disc(g.intake[0], g.intake[1], 0.6, ENEMY.keyline);

  canvas.outline4(ENEMY.keyline);
}

export function buildEnemyMigRearSheet() {
  return buildStrip(CELL_W, CELL_H, BANK_ANGLES.length, (cell, i) => {
    drawRearFrame(cell, BANK_ANGLES[i]);
  }, { maxColours: 8, label: 'enemy-mig-rear' });
}

export function buildEnemyMigHeadSheet() {
  return buildStrip(CELL_W, CELL_H, BANK_ANGLES.length, (cell, i) => {
    drawHeadFrame(cell, BANK_ANGLES[i]);
  }, { maxColours: 8, label: 'enemy-mig-head' });
}

export { BANK_ANGLES, CELL_W, CELL_H, drawRearFrame, drawHeadFrame };

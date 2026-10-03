// player-f14-night.png — night palette swap of player-f14.png, same 9 bank
// poses and geometry (imports geometryFor from player-f14.js so the
// silhouette stays pixel-identical to the verified daylight sheet — only
// colour selection differs). Palette is PLAYER_NIGHT in palettes.js: the
// exact 8 colours the team lead measured off ab2-arcade-night-banking.png
// (true native), published as interface I3's resolution. See that file's
// comment for why the nozzle reuses the two canopy magentas rather than an
// invented orange — there is no warm hue in the verified 8-colour set.
import { PixelCanvas, buildStrip } from '../canvas.js';
import { PLAYER_NIGHT as N } from '../palettes.js';
import { BANK_ANGLES, CELL_W, CELL_H, geometryFor } from './player-f14.js';

function nacelleOctagon(cx, cy, r) {
  const k = r * 0.41;
  return [
    [cx - k, cy - r], [cx + k, cy - r],
    [cx + r, cy - k], [cx + r, cy + k],
    [cx + k, cy + r], [cx - k, cy + r],
    [cx - r, cy + k], [cx - r, cy - k],
  ];
}

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

function drawFrame(canvas, bankDeg) {
  const g = geometryFor(bankDeg);

  canvas.polygon(bladePolygon(g.shoulderR, g.wingTipR, 5, 1.6), N.lightTop);
  canvas.polygon(bladePolygon(g.shoulderL, g.wingTipL, 5, 1.6), N.midNeutral);
  const wingTrailR = [[g.shoulderR[0], g.shoulderR[1] + 2], [g.wingTipR[0], g.wingTipR[1] + 2]];
  canvas.polygon(bladePolygon(wingTrailR[0], wingTrailR[1], 2.4, 0.8), N.midNeutral);
  const wingTrailL = [[g.shoulderL[0], g.shoulderL[1] + 2], [g.wingTipL[0], g.wingTipL[1] + 2]];
  canvas.polygon(bladePolygon(wingTrailL[0], wingTrailL[1], 2.4, 0.8), N.coolDark);

  canvas.polygon([
    g.nose, [g.nose[0] + 3, g.nose[1] + 5], g.shoulderR, [50, 17], g.shoulderL,
    [g.nose[0] - 3, g.nose[1] + 5],
  ], N.lightTop);

  canvas.polygon([
    [g.nacLx + g.nacLr * 0.4, g.nacLy - 1], [50, 19], [g.nacRx - g.nacRr * 0.4, g.nacRy - 1],
    [g.nacRx - g.nacRr * 0.5, g.nacRy + g.nacRr * 0.3], [50, 23],
    [g.nacLx + g.nacLr * 0.5, g.nacLy + g.nacLr * 0.3],
  ], N.deepWarmShadow);

  for (const [cx, cy, r, dir] of [[g.nacRx, g.nacRy, g.nacRr, 1], [g.nacLx, g.nacLy, g.nacLr, -1]]) {
    canvas.polygon(nacelleOctagon(cx, cy, r), N.midNeutral);
    canvas.polygon(nacelleOctagon(cx - dir * r * 0.12, cy + r * 0.18, r * 0.62), N.coolDark);
    canvas.ring(cx, cy + r * 0.12, r * 0.52, r * 0.4, N.keyline);
    canvas.disc(cx, cy + r * 0.12, r * 0.33, N.nozzleCore);
    canvas.disc(cx, cy + r * 0.12, r * 0.14, N.nozzleHot);
  }

  canvas.polygon(bladePolygon(g.finRRoot, g.finRTip, 3, 1.3), N.midNeutral);
  canvas.polygon(bladePolygon(g.finLRoot, g.finLTip, 3, 1.3), N.coolDark);

  canvas.set(g.canopy[0], g.canopy[1], N.canopy);
  canvas.set(g.canopy[0] + 1, g.canopy[1], N.canopy);

  canvas.ditherBoundary(N.lightTop, N.midNeutral);

  canvas.outline4(N.keyline);
}

export function buildPlayerF14NightSheet() {
  return buildStrip(CELL_W, CELL_H, BANK_ANGLES.length, (cell, i) => {
    drawFrame(cell, BANK_ANGLES[i]);
  }, { maxColours: 8, label: 'player-f14-night' });
}

export { drawFrame };

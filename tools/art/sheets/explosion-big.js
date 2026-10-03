// explosion-big.png — 160x160, 10 frames: the player-death starburst.
//
// Structural reference: reference/death-starburst-gp-t202.png — a dense
// yellow/white core with LONG radiating red/orange spikes in most
// directions, almost no visible "rim" band (unlike the smaller kill
// explosion, which reads more as a filled fireball). Same verified ladder
// as explosion.js (I6): #9b0204 -> #d6050b -> #f47a07 -> #f5d619 ->
// #fffff7 core (see explosion.js for why the core's V is pushed to the
// ladder's 255 rather than I6's literal #f6f6e7 — it's the same fix here).
// Shares the lobe/spike painter (tools/art/lobes.js) with explosion.js;
// see that file for why offset lobes replace concentric rings.
import { PixelCanvas, buildStrip } from '../canvas.js';
import { EXPLOSION } from '../palettes.js';
import { paintLobes, paintSpikes } from '../lobes.js';

const CELL = 160;
const CX = 80, CY = 80;

const FRAMES = [
  // 0: ignition flash
  {
    radius: 22,
    bands: [
      { t: 1.0, hex: EXPLOSION.rim },
      { t: 0.78, hex: EXPLOSION.deepRed },
      { t: 0.58, hex: EXPLOSION.orange },
      { t: 0.4, hex: EXPLOSION.hotYellow },
      { t: 0.24, hex: EXPLOSION.whiteHot },
    ],
    spikes: { angles: [10, 55, 100, 145, 190, 235, 280, 325], lenScale: 1.6, hex: EXPLOSION.hotYellow },
    dither: [[EXPLOSION.rim, EXPLOSION.deepRed], [EXPLOSION.orange, EXPLOSION.hotYellow], [EXPLOSION.hotYellow, EXPLOSION.whiteHot]],
  },
  // 1: bloom — spikes already long and dominant, per the reference's dense
  // radiating-spike look.
  {
    radius: 38,
    bands: [
      { t: 0.9, hex: EXPLOSION.deepRed },
      { t: 0.7, hex: EXPLOSION.orange },
      { t: 0.5, hex: EXPLOSION.hotYellow },
      { t: 0.3, hex: EXPLOSION.whiteHot },
    ],
    spikes: { angles: [0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336], lenScale: 1.9, hex: EXPLOSION.rim },
    dither: [[EXPLOSION.deepRed, EXPLOSION.orange], [EXPLOSION.orange, EXPLOSION.hotYellow], [EXPLOSION.hotYellow, EXPLOSION.whiteHot]],
  },
  // 2: bloom, peak spike extent.
  {
    radius: 52,
    bands: [
      { t: 0.88, hex: EXPLOSION.deepRed },
      { t: 0.7, hex: EXPLOSION.orange },
      { t: 0.5, hex: EXPLOSION.hotYellow },
      { t: 0.34, hex: EXPLOSION.whiteHot },
    ],
    spikes: { angles: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340], lenScale: 2.1, hex: EXPLOSION.rim },
    dither: [[EXPLOSION.deepRed, EXPLOSION.orange], [EXPLOSION.orange, EXPLOSION.hotYellow], [EXPLOSION.hotYellow, EXPLOSION.whiteHot]],
  },
  // 3: peak mass size, multi-lobe core (several whiteHot sub-lobes rather
  // than one disc).
  {
    radius: 56,
    bands: [
      { t: 0.9, hex: EXPLOSION.deepRed },
      { t: 0.72, hex: EXPLOSION.orange },
      { t: 0.52, hex: EXPLOSION.hotYellow },
      { t: 0.3, hex: EXPLOSION.whiteHot, dirs: [[0, 0], [-0.3, -0.2], [0.35, -0.15], [-0.1, 0.4], [0.4, 0.3]] },
    ],
    spikes: { angles: [5, 28, 50, 75, 98, 122, 148, 172, 196, 220, 245, 268, 292, 316, 340], lenScale: 2.0, hex: EXPLOSION.rim },
    dither: [[EXPLOSION.deepRed, EXPLOSION.orange], [EXPLOSION.orange, EXPLOSION.hotYellow], [EXPLOSION.hotYellow, EXPLOSION.whiteHot]],
  },
  // 4: still huge, core starting to pull back toward red/orange.
  {
    radius: 54,
    bands: [
      { t: 1.0, hex: EXPLOSION.rim },
      { t: 0.82, hex: EXPLOSION.deepRed },
      { t: 0.6, hex: EXPLOSION.orange },
      { t: 0.38, hex: EXPLOSION.hotYellow },
      { t: 0.18, hex: EXPLOSION.whiteHot, dirs: [[0.1, -0.1], [-0.2, 0.15]] },
    ],
    spikes: { angles: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330], lenScale: 1.7, hex: EXPLOSION.deepRed },
    dither: [[EXPLOSION.rim, EXPLOSION.deepRed], [EXPLOSION.deepRed, EXPLOSION.orange], [EXPLOSION.orange, EXPLOSION.hotYellow]],
  },
  // 5: fire+smoke — smoke intrudes from the top, spikes shortening.
  {
    radius: 50,
    bands: [
      { t: 1.0, hex: EXPLOSION.smoke, dirs: [[-0.3, -0.6], [-0.65, -0.2], [0.1, -0.7], [0.5, -0.4]] },
      { t: 1.0, hex: EXPLOSION.rim },
      { t: 0.78, hex: EXPLOSION.deepRed },
      { t: 0.5, hex: EXPLOSION.orange, dirs: [[0.2, 0.3], [-0.1, 0.4], [0.4, 0.15]] },
      { t: 0.26, hex: EXPLOSION.hotYellow, dirs: [[0.2, 0.3]] },
    ],
    spikes: { angles: [10, 45, 80, 280, 315, 350], lenScale: 1.4, hex: EXPLOSION.deepRed },
    dither: [[EXPLOSION.smoke, EXPLOSION.rim], [EXPLOSION.rim, EXPLOSION.deepRed], [EXPLOSION.deepRed, EXPLOSION.orange]],
  },
  // 6: fire+smoke — smoke now the majority.
  {
    radius: 46,
    bands: [
      { t: 1.0, hex: EXPLOSION.smoke, dirs: [[-0.3, -0.6], [-0.6, -0.1], [0.1, -0.6], [0.45, -0.35], [-0.5, 0.3]] },
      { t: 0.55, hex: EXPLOSION.rim, dirs: [[0.3, 0.3], [0.1, 0.5]] },
      { t: 0.32, hex: EXPLOSION.orange, dirs: [[0.3, 0.35]] },
      { t: 0.15, hex: EXPLOSION.hotYellow, dirs: [[0.3, 0.35]] },
    ],
    spikes: { angles: [40, 300], lenScale: 1.1, hex: EXPLOSION.deepRed },
    dither: [[EXPLOSION.smoke, EXPLOSION.rim], [EXPLOSION.rim, EXPLOSION.orange]],
  },
  // 7: smoke — dark mass, dying embers.
  {
    radius: 42,
    bands: [
      { t: 1.0, hex: EXPLOSION.keyline, dirs: [[-0.2, -0.5], [-0.5, 0], [0.1, -0.6], [0.4, -0.2]] },
      { t: 0.85, hex: EXPLOSION.smoke },
      { t: 0.2, hex: EXPLOSION.rim, dirs: [[0.3, 0.35]] },
    ],
    spikes: { angles: [], hex: EXPLOSION.smoke },
    dither: [[EXPLOSION.keyline, EXPLOSION.smoke], [EXPLOSION.smoke, EXPLOSION.rim]],
  },
  // 8: smoke, dissipating.
  {
    radius: 36,
    bands: [
      { t: 1.0, hex: EXPLOSION.keyline, dirs: [[-0.3, -0.3], [0.2, -0.5], [-0.5, 0.2], [0.3, 0.2]] },
      { t: 0.72, hex: EXPLOSION.smoke },
    ],
    spikes: { angles: [], hex: EXPLOSION.smoke },
    dither: [[EXPLOSION.keyline, EXPLOSION.smoke]],
  },
  // 9: final wisp.
  {
    radius: 26,
    bands: [
      { t: 1.0, hex: EXPLOSION.keyline, dirs: [[-0.3, -0.2], [0.25, -0.3], [0, 0.3]] },
      { t: 0.62, hex: EXPLOSION.smoke },
    ],
    spikes: { angles: [], hex: EXPLOSION.smoke },
    dither: [[EXPLOSION.keyline, EXPLOSION.smoke]],
  },
];

function drawFrame(canvas, frameIdx) {
  const f = FRAMES[frameIdx];
  paintLobes(canvas, CX, CY, f.radius, f.bands);
  if (f.spikes.angles.length) {
    paintSpikes(canvas, CX, CY, f.radius, f.spikes.angles, f.spikes.hex, f.spikes.lenScale, 0.1);
  }
  for (const [a, b] of f.dither) canvas.ditherBoundary(a, b);
}

export function buildExplosionBigSheet() {
  return buildStrip(CELL, CELL, FRAMES.length, (cell, i) => drawFrame(cell, i), {
    maxColours: 16, label: 'explosion-big',
  });
}

export { CELL, FRAMES, drawFrame };

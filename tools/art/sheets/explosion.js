// explosion.png — 72x72, 8 frames: flash -> bloom x3 -> fire+smoke x2 ->
// smoke x2.
//
// Structural reference: reference/ab2-arcade-huge-explosion.jpg,
// reference/death-starburst-gp-t202.png. Colour ladder is the VERIFIED one
// from judging/R5/interfaces.md I6 (supersedes the critique's own first
// draft, which it flags as sourced from a smoke mass, not a fireball):
// #9b0204 rim -> #d6050b -> #f47a07 -> #f5d619 -> #f6f6e7 white-hot core.
// Binding acceptance from I6: mean V >=0.85 (fire frames), >=40% of pixels
// above V0.95, white-hot core (S<0.25,V>0.94) >=3% of mass, brightest-decile
// SATURATION <=0.30 (ours previously: 0.67 — the "no white-hot core" defect).
//
// Built from HAND-PLACED, OFFSET lobes (each a flat-filled blob at its own
// centre, not concentric rings sharing one centre) plus radiating spike
// triangles, which is the structural fix for what the critique calls
// "a string of fried eggs" — six bullseyes sharing a centre read as discs;
// lobes offset from each other and from the spikes read as fire. Boundaries
// between adjacent colour bands are dithered per §3, never a smooth ramp,
// and this texture is never rotated at runtime (random rotation on a
// nearest-sampled texture was the other half of the old "ragged rim" defect).
import { PixelCanvas, buildStrip } from '../canvas.js';
import { EXPLOSION } from '../palettes.js';

const CELL = 72;
const CX = 36, CY = 36;

// Deterministic hand-picked lobe offsets (not runtime RNG) reused/scaled
// across frames so the fire mass keeps a consistent asymmetric identity as
// it grows and fades, the way a real animated sprite sheet would.
const LOBE_DIRS = [
  [0, 0], [-0.55, -0.35], [0.5, -0.4], [-0.35, 0.5], [0.6, 0.3],
  [-0.15, -0.7], [0.75, -0.05], [-0.7, 0.1], [0.1, 0.72],
];

function paintLobes(canvas, radius, bands) {
  // bands: array of {t, hex} where t in (0,1] scales LOBE_DIRS' offset and
  // the lobe's own radius, painted outer-to-inner (callers order darkest
  // band first). Offsets scale with radius so the mass stays coherent.
  for (const { t, hex, dirs } of bands) {
    const list = dirs ?? LOBE_DIRS;
    for (const [dx, dy] of list) {
      const cx = CX + dx * radius * 0.5;
      const cy = CY + dy * radius * 0.5;
      canvas.disc(cx, cy, radius * t, hex);
    }
  }
}

function paintSpikes(canvas, radius, angles, hex, lenScale = 1.3, widthDeg = 10) {
  for (const a of angles) {
    const rad = (a * Math.PI) / 180;
    const len = radius * lenScale;
    const tipX = CX + Math.cos(rad) * len;
    const tipY = CY + Math.sin(rad) * len;
    const perpA = rad + Math.PI / 2;
    const baseHalf = radius * 0.22;
    const b1x = CX + Math.cos(rad) * radius * 0.5 + Math.cos(perpA) * baseHalf;
    const b1y = CY + Math.sin(rad) * radius * 0.5 + Math.sin(perpA) * baseHalf;
    const b2x = CX + Math.cos(rad) * radius * 0.5 - Math.cos(perpA) * baseHalf;
    const b2y = CY + Math.sin(rad) * radius * 0.5 - Math.sin(perpA) * baseHalf;
    canvas.polygon([[b1x, b1y], [tipX, tipY], [b2x, b2y]], hex);
  }
}

const FRAMES = [
  // 0: flash — compact, white-hot dominant, short red-rim spike fringe.
  {
    radius: 13,
    bands: [
      { t: 1.0, hex: EXPLOSION.rim },
      { t: 0.8, hex: EXPLOSION.deepRed },
      { t: 0.62, hex: EXPLOSION.orange },
      { t: 0.44, hex: EXPLOSION.hotYellow },
      { t: 0.26, hex: EXPLOSION.whiteHot },
    ],
    spikes: { angles: [15, 70, 125, 180, 235, 300, 340], hex: EXPLOSION.hotYellow, lenScale: 1.6 },
    dither: [[EXPLOSION.rim, EXPLOSION.deepRed], [EXPLOSION.orange, EXPLOSION.hotYellow], [EXPLOSION.hotYellow, EXPLOSION.whiteHot]],
  },
  // 1: bloom 1 — growing fast, lobes separating, core still large.
  {
    radius: 22,
    bands: [
      { t: 1.0, hex: EXPLOSION.rim },
      { t: 0.74, hex: EXPLOSION.deepRed },
      { t: 0.68, hex: EXPLOSION.orange },
      { t: 0.5, hex: EXPLOSION.hotYellow },
      { t: 0.26, hex: EXPLOSION.whiteHot },
    ],
    spikes: { angles: [5, 55, 95, 150, 200, 250, 300, 330], hex: EXPLOSION.deepRed, lenScale: 1.5 },
    dither: [[EXPLOSION.rim, EXPLOSION.deepRed], [EXPLOSION.deepRed, EXPLOSION.orange], [EXPLOSION.orange, EXPLOSION.hotYellow], [EXPLOSION.hotYellow, EXPLOSION.whiteHot]],
  },
  // 2: bloom 2 — peak extent, biggest white-hot mass.
  {
    radius: 29,
    bands: [
      { t: 1.0, hex: EXPLOSION.rim },
      { t: 0.76, hex: EXPLOSION.deepRed },
      { t: 0.72, hex: EXPLOSION.orange },
      { t: 0.56, hex: EXPLOSION.hotYellow },
      { t: 0.34, hex: EXPLOSION.whiteHot },
    ],
    spikes: { angles: [0, 40, 85, 130, 175, 220, 265, 310, 345], hex: EXPLOSION.deepRed, lenScale: 1.45 },
    dither: [[EXPLOSION.rim, EXPLOSION.deepRed], [EXPLOSION.deepRed, EXPLOSION.orange], [EXPLOSION.orange, EXPLOSION.hotYellow], [EXPLOSION.hotYellow, EXPLOSION.whiteHot]],
  },
  // 3: bloom 3 — still near-peak size, white core starting to shrink,
  // mass leaning toward the upper-right (asymmetric decay begins).
  {
    radius: 30,
    bands: [
      { t: 1.0, hex: EXPLOSION.rim },
      { t: 0.74, hex: EXPLOSION.deepRed },
      { t: 0.68, hex: EXPLOSION.orange },
      { t: 0.5, hex: EXPLOSION.hotYellow },
      { t: 0.24, hex: EXPLOSION.whiteHot, dirs: [[0.2, -0.3], [-0.1, -0.1], [0.4, 0.1], [0.05, -0.35], [0.35, -0.1], [-0.2, 0.15]] },
    ],
    spikes: { angles: [10, 60, 110, 160, 230, 280, 330], hex: EXPLOSION.deepRed, lenScale: 1.35 },
    dither: [[EXPLOSION.rim, EXPLOSION.deepRed], [EXPLOSION.deepRed, EXPLOSION.orange], [EXPLOSION.orange, EXPLOSION.hotYellow]],
  },
  // 4: fire+smoke 1 — fire remnants lower/right, smoke rising upper/left.
  {
    radius: 27,
    bands: [
      { t: 1.0, hex: EXPLOSION.smoke, dirs: [[-0.4, -0.5], [-0.75, -0.1], [-0.2, -0.75]] },
      { t: 1.0, hex: EXPLOSION.rim },
      { t: 0.78, hex: EXPLOSION.deepRed },
      { t: 0.52, hex: EXPLOSION.orange, dirs: [[0.3, 0.3], [0.1, 0.5], [0.5, 0.1]] },
      { t: 0.3, hex: EXPLOSION.hotYellow, dirs: [[0.3, 0.3], [0.5, 0.15]] },
    ],
    spikes: { angles: [20, 70, 300, 340], hex: EXPLOSION.deepRed, lenScale: 1.2 },
    dither: [[EXPLOSION.rim, EXPLOSION.deepRed], [EXPLOSION.deepRed, EXPLOSION.orange], [EXPLOSION.orange, EXPLOSION.hotYellow], [EXPLOSION.smoke, EXPLOSION.rim]],
  },
  // 5: fire+smoke 2 — smoke now dominant, small embers remain.
  {
    radius: 27,
    bands: [
      { t: 1.0, hex: EXPLOSION.smoke, dirs: [[-0.3, -0.5], [-0.65, -0.05], [-0.1, -0.7], [0.1, -0.4], [-0.5, 0.3]] },
      { t: 0.55, hex: EXPLOSION.rim, dirs: [[0.35, 0.35], [0.15, 0.55]] },
      { t: 0.34, hex: EXPLOSION.orange, dirs: [[0.4, 0.3], [0.2, 0.5]] },
      { t: 0.18, hex: EXPLOSION.hotYellow, dirs: [[0.4, 0.3]] },
    ],
    spikes: { angles: [330], hex: EXPLOSION.deepRed, lenScale: 1.1 },
    dither: [[EXPLOSION.smoke, EXPLOSION.rim], [EXPLOSION.rim, EXPLOSION.orange]],
  },
  // 6: smoke 1 — dark smoke mass, tiny ember, fringe starting to dissipate.
  {
    radius: 25,
    bands: [
      { t: 1.0, hex: EXPLOSION.keyline, dirs: [[-0.2, -0.4], [-0.5, 0.1], [0.1, -0.6]] },
      { t: 0.9, hex: EXPLOSION.smoke },
      { t: 0.22, hex: EXPLOSION.rim, dirs: [[0.35, 0.3]] },
    ],
    spikes: { angles: [], hex: EXPLOSION.smoke, lenScale: 1 },
    dither: [[EXPLOSION.keyline, EXPLOSION.smoke], [EXPLOSION.smoke, EXPLOSION.rim]],
  },
  // 7: smoke 2 — dissipating, mostly dark, dithered into transparency.
  {
    radius: 20,
    bands: [
      { t: 1.0, hex: EXPLOSION.keyline, dirs: [[-0.3, -0.3], [0.2, -0.5], [-0.5, 0.2]] },
      { t: 0.74, hex: EXPLOSION.smoke },
    ],
    spikes: { angles: [], hex: EXPLOSION.smoke, lenScale: 1 },
    dither: [[EXPLOSION.keyline, EXPLOSION.smoke]],
  },
];

function drawFrame(canvas, frameIdx) {
  const f = FRAMES[frameIdx];
  paintLobes(canvas, f.radius, f.bands);
  if (f.spikes.angles.length) paintSpikes(canvas, f.radius, f.spikes.angles, f.spikes.hex, f.spikes.lenScale);
  for (const [a, b] of f.dither) canvas.ditherBoundary(a, b);
}

export function buildExplosionSheet() {
  return buildStrip(CELL, CELL, FRAMES.length, (cell, i) => drawFrame(cell, i), {
    maxColours: 11, label: 'explosion',
  });
}

export { CELL, FRAMES, drawFrame };

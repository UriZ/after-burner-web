// Shared "asymmetric fire lobe" painter used by explosion.js and
// explosion-big.js — see explosion.js's header for why this replaces
// concentric-ring discs (the critique's "fried eggs" defect).
const LOBE_DIRS = [
  [0, 0], [-0.55, -0.35], [0.5, -0.4], [-0.35, 0.5], [0.6, 0.3],
  [-0.15, -0.7], [0.75, -0.05], [-0.7, 0.1], [0.1, 0.72],
];

export function paintLobes(canvas, cx, cy, radius, bands) {
  for (const { t, hex, dirs } of bands) {
    const list = dirs ?? LOBE_DIRS;
    for (const [dx, dy] of list) {
      canvas.disc(cx + dx * radius * 0.5, cy + dy * radius * 0.5, radius * t, hex);
    }
  }
}

export function paintSpikes(canvas, cx, cy, radius, angles, hex, lenScale = 1.3, baseFrac = 0.22) {
  for (const a of angles) {
    const rad = (a * Math.PI) / 180;
    const len = radius * lenScale;
    const tipX = cx + Math.cos(rad) * len;
    const tipY = cy + Math.sin(rad) * len;
    const perpA = rad + Math.PI / 2;
    const baseHalf = radius * baseFrac;
    const b1x = cx + Math.cos(rad) * radius * 0.5 + Math.cos(perpA) * baseHalf;
    const b1y = cy + Math.sin(rad) * radius * 0.5 + Math.sin(perpA) * baseHalf;
    const b2x = cx + Math.cos(rad) * radius * 0.5 - Math.cos(perpA) * baseHalf;
    const b2y = cy + Math.sin(rad) * radius * 0.5 - Math.sin(perpA) * baseHalf;
    canvas.polygon([[b1x, b1y], [tipX, tipY], [b2x, b2y]], hex);
  }
}

export { LOBE_DIRS };

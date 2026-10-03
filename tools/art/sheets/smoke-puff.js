// smoke-puff.png — 16x16, 4 frames, white -> grey dissipation, dithered
// fringe. Direct application of the vulcan-puff authoring style (explicit
// pixel placement, no ctx.arc) to the element the critique calls out by
// name as "a soft white cotton ball with an anti-aliased rim" (smoke.js).
import { PixelCanvas, buildStrip } from '../canvas.js';
import { snapHexToLadder } from '../ladder.js';

const CELL = 16;
const CX = 8, CY = 8;
const GREY = [
  snapHexToLadder('#ffffff').snapped,
  snapHexToLadder('#dcdcdc').snapped,
  snapHexToLadder('#949494').snapped,
  snapHexToLadder('#525252').snapped,
];

const FRAMES = [
  { r: 6.4, core: GREY[0], mid: GREY[1] },
  { r: 6.8, core: GREY[1], mid: GREY[2] },
  { r: 6.2, core: GREY[2], mid: GREY[3] },
  { r: 5.2, core: GREY[3], mid: GREY[3] },
];

function drawFrame(canvas, idx) {
  const f = FRAMES[idx];
  // Two offset lobes (not one perfect disc) so the puff has a lumpy, not
  // perfectly-round, silhouette.
  canvas.disc(CX - 1.2, CY + 0.6, f.r, f.mid);
  canvas.disc(CX + 1.4, CY - 0.8, f.r * 0.86, f.mid);
  canvas.disc(CX, CY, f.r * 0.56, f.core);
  canvas.ditherBoundary(f.mid, f.core);
  // Dithered fringe to transparency: thin the outer ring with a Bayer
  // checkerboard rather than a hard alpha cutoff.
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      if (canvas.getHex(x, y) !== f.mid) continue;
      const d = Math.hypot(x - CX, y - CY);
      if (d > f.r * 0.82) {
        const bayer4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
        if (bayer4[y & 3][x & 3] >= 10) canvas.set(x, y, null);
      }
    }
  }
}

export function buildSmokePuffSheet() {
  return buildStrip(CELL, CELL, FRAMES.length, drawFrame, { maxColours: 4, label: 'smoke-puff' });
}

export { CELL, FRAMES, drawFrame };

// debris.png — 4x4, 3 tumble frames. Red/white chunks thrown from a kill,
// per the critique's §2.3 note: "Red/white debris chunks fly as separate
// small sprites." Explicit pixel grid, vulcan-puff style — too small for
// outline or dither to read, so this is flat 2-colour pixel placement.
import { PixelCanvas, buildStrip } from '../canvas.js';
import { EXPLOSION } from '../palettes.js';

const CELL = 4;
const WHITE = '#fffff7'; // reuse the explosion core white for a hot chunk edge
const RED = EXPLOSION.deepRed;

const FRAMES = [
  ['.RR.', 'RRRW', 'RWRR', '.RR.'],
  ['R.RR', '.RRW', 'WRR.', 'RR.R'],
  ['.WR.', 'RRRR', 'RRRR', '.RW.'],
];

export function buildDebrisSheet() {
  return buildStrip(CELL, CELL, FRAMES.length, (cell, i) => {
    cell.stamp(0, 0, FRAMES[i], { R: RED, W: WHITE });
  }, { maxColours: 2, label: 'debris' });
}

export { CELL, FRAMES };

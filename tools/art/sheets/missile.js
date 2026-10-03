// missile.png — 16x8, 3 frames: body + flame, flicker only on the flame.
// Explicit pixel grid (vulcan-puff style), horizontal silhouette — nose
// right, exhaust left, for a side-on flight sprite (distinct from
// projectileSprites.js's vertical launch-pose missile).
import { PixelCanvas, buildStrip } from '../canvas.js';
import { snapHexToLadder } from '../ladder.js';

const CELL_W = 16, CELL_H = 8;
const BODY = snapHexToLadder('#e8e8e8').snapped;
const NOSE = snapHexToLadder('#9e9e9e').snapped;
const FLAME = snapHexToLadder('#ffa83c').snapped;
const HOT = snapHexToLadder('#fff0b8').snapped;
const KEYLINE = '#000000';

const FRAMES = [
  [
    '.......NBBBBB..',
    '......NBBBBBB..',
    '..FHHNBBBBBBB..',
    '.FFHHHNBBBBBB..',
    '.FFHHHNBBBBBB..',
    '..FHHNBBBBBBB..',
    '......NBBBBBB..',
    '.......NBBBBB..',
  ],
  [
    '.......NBBBBB..',
    '......NBBBBBB..',
    '.FFHHNBBBBBBB..',
    'FFFHHHNBBBBBB..',
    'FFFHHHNBBBBBB..',
    '.FFHHNBBBBBBB..',
    '......NBBBBBB..',
    '.......NBBBBB..',
  ],
  [
    '.......NBBBBB..',
    '......NBBBBBB..',
    '..FHHNBBBBBBB..',
    '.FHHHHNBBBBBB..',
    '.FHHHHNBBBBBB..',
    '..FHHNBBBBBBB..',
    '......NBBBBBB..',
    '.......NBBBBB..',
  ],
];

export function buildMissileSheet() {
  return buildStrip(CELL_W, CELL_H, FRAMES.length, (cell, i) => {
    cell.stamp(0, 0, FRAMES[i], { B: BODY, N: NOSE, F: FLAME, H: HOT });
    cell.outline4(KEYLINE);
  }, { maxColours: 5, label: 'missile' });
}

export { CELL_W, CELL_H, FRAMES };

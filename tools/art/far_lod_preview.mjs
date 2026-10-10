#!/usr/bin/env node
// FAR-LOD PREVIEW — render the procedural far-LOD cells to PNG and re-check
// the span invariant independently of the assertion inside the module.
//
// src/entities/enemySprite.js cannot be imported in plain node: it pulls in
// three.js and sixteen .png assets through Vite. So this reads the file and
// EVALUATES THE TWO DRAW FUNCTIONS' OWN SOURCE TEXT against stub primitives.
// That is faithful by construction -- there is no second copy of the spec to
// drift -- and it is why the extraction is by function name rather than by
// re-typing the rows here.
//
// Two things are checked and both exit non-zero on failure:
//   1. FAR_FULL_ROWS really are full width in the rendered cell (the module's
//      own assertion only checks the SAMPLED-ROW arithmetic; this checks the
//      drawing actually fills them).
//   2. For every quad size the R3 model can produce, at least one opaque
//      texel is sampled in every screen column -- i.e. the measured span
//      equals the quad width. This is the R3 "enemy disappears" bug's own
//      test, the same sampling model as tools/art/sheet_visibility.py.
//
// Usage: node tools/art/far_lod_preview.mjs [--out <dir>]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PixelCanvas } from './canvas.js';

// --src lets a BEFORE/AFTER figure be built against a saved copy of an older
// enemySprite.js (e.g. `git show <rev>:src/entities/enemySprite.js`) without
// touching the tree, which other lanes are capturing from.
const SRC_PATH = process.argv.includes('--src')
  ? process.argv[process.argv.indexOf('--src') + 1]
  : 'src/entities/enemySprite.js';
const SRC = readFileSync(SRC_PATH, 'utf8');

function extract(name) {
  const i = SRC.indexOf(`function ${name}(`);
  if (i < 0) throw new Error(`${name} not found in enemySprite.js`);
  let d = 0;
  for (let j = SRC.indexOf('{', i); j < SRC.length; j++) {
    if (SRC[j] === '{') d++;
    else if (SRC[j] === '}' && --d === 0) return SRC.slice(i, j + 1);
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const fullRowsMatch = /const FAR_FULL_ROWS = (\[[^\]]*\]);/.exec(SRC);
// Pre-R9 sources have no FAR_FULL_ROWS because the cell was filled edge to
// edge; [] makes the invariant checks report what that drawing actually did.
const FULL_ROWS = fullRowsMatch ? JSON.parse(fullRowsMatch[1]) : [];
const FW = Number(/^const FW = (\d+);/m.exec(SRC)[1]);
const FH = Number(/^const FH = (\d+);/m.exec(SRC)[1]);

// Stub primitives matching src/render/spriteFactory.js's semantics.
function createPixelBuffer(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}
function fillRectHard(buf, x0, y0, w, h, hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let y = Math.round(y0); y < Math.round(y0 + h); y++) {
    for (let x = Math.round(x0); x < Math.round(x0 + w); x++) {
      if (x < 0 || y < 0 || x >= buf.width || y >= buf.height) continue;
      const i = (y * buf.width + x) * 4;
      buf.data[i] = r; buf.data[i + 1] = g; buf.data[i + 2] = b; buf.data[i + 3] = 255;
    }
  }
}

const hasFarRow = SRC.includes('function farRow(');
const body = [hasFarRow ? extract('farRow') : '',
              extract('drawHeadOnFar'), extract('drawRearFar')].join('\n');
// eslint-disable-next-line no-new-func
const make = new Function('FH', 'FW', 'FAR_FULL_ROWS', 'fillRectHard',
  `${body}; return { drawHeadOnFar, drawRearFar };`);
const { drawHeadOnFar, drawRearFar } = make(FH, FW, FULL_ROWS, fillRectHard);

const GREY = JSON.parse(readFileSync('src/assets/sprites/enemy-palettes.generated.js', 'utf8')
  .replace(/^[\s\S]*?export const ENEMY_LIVERIES = /, '').replace(/;\s*$/, '')).grey;
const pal = {
  key: GREY.keyline, rim: GREY.rim, shadow: GREY.shadow, dominant: GREY.dominant,
  mid: GREY.mid, highlight: GREY.highlight, sunlit: GREY.specular,
  nose: GREY.intakeRing, core: GREY.intakeCore, hot: GREY.nozzleCore,
};

function opaque(buf) {
  const m = [];
  for (let y = 0; y < buf.height; y++) {
    const row = [];
    for (let x = 0; x < buf.width; x++) row.push(buf.data[(y * buf.width + x) * 4 + 3] > 0);
    m.push(row);
  }
  return m;
}

let fail = 0;
const out = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1] : 'tools/out/drawing-r9';
mkdirSync(out, { recursive: true });

for (const [name, fn] of [['headon', drawHeadOnFar], ['rear', drawRearFar]]) {
  const buf = createPixelBuffer(FW, FH);
  fn(buf, pal);
  const m = opaque(buf);

  const ink = m.flat().filter(Boolean).length;
  console.log(`${name}: fill ${(100 * ink / (FW * FH)).toFixed(1)} % (${ink}/${FW * FH})`);

  for (const r of FULL_ROWS) {
    if (!m[r].every(Boolean)) {
      console.log(`  FAIL row ${r} is declared full-width and is not`);
      fail = 1;
    }
  }
  // Every row and every column must hold at least one opaque texel.
  m.forEach((row, y) => { if (!row.some(Boolean)) { console.log(`  FAIL row ${y} empty`); fail = 1; } });
  for (let x = 0; x < FW; x++) {
    if (!m.some((row) => row[x])) { console.log(`  FAIL column ${x} empty`); fail = 1; }
  }
  // R3's own model: quad w x h, nearest sampling, for every size the far LOD
  // is used at (below DETAIL_SWITCH_NATIVE_PX, 2:1 aspect).
  let worst = 100;
  for (let w = 2; w <= 10; w++) {
    const h = Math.max(1, Math.round(w / 2));
    let lit = 0, firstCol = -1, lastCol = -1;
    for (let i = 0; i < w; i++) {
      let any = false;
      for (let j = 0; j < h; j++) {
        if (m[Math.floor(((j + 0.5) * FH) / h)][Math.floor(((i + 0.5) * FW) / w)]) any = true;
      }
      if (any) { lit++; if (firstCol < 0) firstCol = i; lastCol = i; }
    }
    const span = lastCol - firstCol + 1;
    if (lit === 0) { console.log(`  FAIL ${w}x${h}: zero pixels (the R3 bug)`); fail = 1; }
    if (span !== w) { console.log(`  FAIL ${w}x${h}: span ${span} != quad width ${w}`); fail = 1; }
    worst = Math.min(worst, (100 * lit) / w);
  }
  console.log(`  span == quad width at every size 2..10 px; worst column coverage ${worst.toFixed(0)} %`);

  const c = new PixelCanvas(FW, FH);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const i = (y * FW + x) * 4;
      if (buf.data[i + 3]) {
        c.set(x, y, '#' + [0, 1, 2].map((k) => buf.data[i + k].toString(16).padStart(2, '0')).join(''));
      }
    }
  }
  writeFileSync(`${out}/far-${process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag')+1]+'-' : ''}${name}.png`, c.toPNGBuffer());
}
console.log(fail ? 'FAR-LOD: FAIL' : 'FAR-LOD: PASS');
process.exit(fail);

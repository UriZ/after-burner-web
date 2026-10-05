#!/usr/bin/env node
// Companion to tools/bracket_probe.mjs: finds banked frames that carry a lock
// bracket, writes the PNG, and writes the bracket's PREDICTED bar positions
// alongside it.
//
// The point of pairing them is that bracket_probe proved the eight bars are
// PLACED on a 16.5 x 16.5 native-px square at every roll angle to +-66.5 deg.
// So R4 gap 10's residual — a near-white component measurement reading
// "5 x 18 px, only the two left corners present" on a hard-banked frame — is a
// discrepancy between where the bars are and what reaches the screen. This
// tool puts the two side by side on the same tick so the difference can be
// cropped and looked at, which is the only thing that separates occlusion from
// clipping from mask contamination.
//
// Usage: node tools/bracket_frames.mjs --out <UNIQUE-dir> [--params 'demo=2&seed=3']

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const argv = process.argv.slice(2);
const get = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = get('--out');
if (!OUT) throw new Error('--out is required and has no default (concurrent agents)');
const PARAMS = get('--params', 'demo=2&seed=3');
const MIN_ROLL = Number(get('--min-roll', 25));
const WANT = Number(get('--frames', 6));

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 672 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${port}/?fixed=1&${PARAMS}`, { waitUntil: 'load' });
await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

const found = [];
for (let tick = 0; tick < 9000 && found.length < WANT; tick += 4) {
  // Step and read in ONE evaluate, and take the PNG from the same JS task as
  // the render — interfaces.md I25: the drawing buffer has no
  // preserveDrawingBuffer, so a separate CDP round trip can read black.
  const r = await page.evaluate(() => {
    window.__step(4);
    const b = window.__brackets();
    return {
      rollDeg: b.rollDeg,
      sets: b.sets,
      png: b.sets.length ? document.getElementById('screen').toDataURL('image/png') : null,
    };
  });
  if (!r.png) continue;
  if (Math.abs(r.rollDeg) < MIN_ROLL) continue;
  const name = `roll${r.rollDeg >= 0 ? 'p' : 'm'}${Math.abs(Math.round(r.rollDeg))}-t${tick}`;
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
  found.push({ name, tick, rollDeg: r.rollDeg, sets: r.sets });
}
fs.writeFileSync(path.join(OUT, 'brackets.json'), JSON.stringify({ PARAMS, found, errors }, null, 2));
console.log(JSON.stringify({ out: OUT, frames: found.map((f) => ({ name: f.name, rollDeg: f.rollDeg, boxes: f.sets.map((s) => `${s.boxW}x${s.boxH}`) })), errors }, null, 2));
await browser.close();
await server.close();

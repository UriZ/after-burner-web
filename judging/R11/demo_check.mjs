#!/usr/bin/env node
// Cross-area regression check for removing ACCEL_RATE.
// demoTimeline.js's own header gates the attract loop on TWO statistics -- the
// barrel-roll count per 160 s cycle and the cruise `cx sd` -- and it says in
// capitals that both depend on player.js's RATE_* and ACCEL_RATE, which it
// cannot import. Removing the ramp turns its plant from second-order into a
// pure integrator, so a proportional controller on it can no longer overshoot
// at all. That is the prediction; this measures it instead of asserting it.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function repoRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(d, 'vite.config.js'))) return d;
    d = path.dirname(d);
  }
  return process.cwd();
}
const ROOT = repoRoot(path.dirname(fileURLToPath(import.meta.url)));
const root = path.resolve(process.argv[process.argv.indexOf('--root') + 1] ?? ROOT);
const TICKS = Number(process.argv[process.argv.indexOf('--ticks') + 1] ?? 9600);

const server = await createServer({ root, configFile: path.join(root, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 672 });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/?fixed=1&demo=1&seed=3`, { waitUntil: 'load' });
await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

const xs = []; let rolls = 0; let wasRolling = false;
for (let i = 0; i < TICKS; i++) {
  const s = await page.evaluate(() => {
    window.__step(1);
    if (!window.__flowState) return { __missing: true };
    const f = window.__flowState();
    return { rolling: f.rolling, jetNdcX: f.jetNdcX, state: f.state };
  });
  if (s.__missing) { console.log('__flowState missing at tick', i); break; }
  if (s.rolling && !wasRolling) rolls++;
  wasRolling = !!s.rolling;
  if (s.jetNdcX != null) xs.push(s.jetNdcX);
}
await browser.close(); await server.close();
const pct = xs.map((v) => v * 50);
const m = pct.reduce((a, b) => a + b, 0) / pct.length;
const sd = Math.sqrt(pct.reduce((a, b) => a + (b - m) ** 2, 0) / (pct.length - 1));
console.log(`${root}\n  ticks ${xs.length}  barrel rolls ${rolls}  cx mean ${m.toFixed(2)} %W  cx sd ${sd.toFixed(2)} %W  page errors ${errors.length}`);
if (errors.length) console.log(errors.slice(0, 3));

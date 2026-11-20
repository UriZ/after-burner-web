#!/usr/bin/env node
// R37 enemy-art lane: determinism probe. Dumps per-enemy (id, pattern, depth,
// ndcX, ndcY) every 10 fixed ticks for 1800 ticks (30 s) under
// ?fixed=1&demo=2&seed=N, to prove the sprite/pose change moved ZERO enemy
// positions (same seeds -> same telemetry before/after the art change).
// Boot pattern copied from tools/capture.mjs (pinned 127.0.0.1, hmr off).
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))));
const out = process.argv[2];
const seed = process.argv[3] ?? '1';
if (!out) { console.error('usage: telemetry_probe.mjs <out.json> [seed]'); process.exit(2); }

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const url = `http://127.0.0.1:${port}/?fixed=1&demo=2&seed=${seed}`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

  const rows = [];
  for (let t = 0; t < 1800; t += 10) {
    await page.evaluate('window.__step(10)');
    const s = await page.evaluate(`(() => { const s = window.__combatStats();
      return { t: s.simTime, enemies: s.enemies.map(e => [e.id, e.pattern, e.depth.toFixed(6), e.ndcX.toFixed(6), e.ndcY.toFixed(6)]) }; })()`);
    rows.push(s);
  }
  // population assertion: a probe that saw no enemies measured nothing.
  const total = rows.reduce((a, r) => a + r.enemies.length, 0);
  if (total === 0) throw new Error('population assertion failed: zero enemies in 30 s');
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  await writeFile(out, JSON.stringify(rows));
  console.log(`${out}: ${rows.length} samples, ${total} enemy rows`);
} finally {
  await browser.close();
  await server.close();
}

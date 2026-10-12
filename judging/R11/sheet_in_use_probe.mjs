#!/usr/bin/env node
// R11 POSITIVE CONTROL: are the redrawn enemy sheets actually what the player
// sees? src/entities/enemySprite.js counts every fall-through to the
// procedural drawing and exposes the census as window.__spriteSheetStatus(),
// plus window.__spriteSheetSelfTest() which deliberately provokes one
// fall-through and checks the counter moved -- so a reported zero is a
// measured zero and not a blind counter.
//
// CLAUDE.md: "Any 'measures zero' result: crop it and LOOK once." The
// selftest is that look, in the form the instrument can take.
//
// Usage: node judging/R11/sheet_in_use_probe.mjs [--ticks 900] [--url-params "..."]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const argv = process.argv.slice(2);
const get = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d);
const ticks = Number(get('--ticks', 900));

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const url = new URL(`http://127.0.0.1:${port}/`);
const search = new URLSearchParams(get('--url-params', ''));
if (!search.has('fixed')) search.set('fixed', '1');
if (!search.has('seed')) search.set('seed', '3');
if (!search.has('invincible')) search.set('invincible', '1');
url.search = search.toString();

const browser = await puppeteer.launch({
  headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });
  const out = await page.evaluate((n) => {
    window.__step(n);
    const selftest = window.__spriteSheetSelfTest();
    const status = window.__spriteSheetStatus();
    return { selftest, status };
  }, ticks);
  const s = out.status;
  console.log(`ticks stepped        ${ticks}`);
  console.log(`selftest (control)   ${JSON.stringify(out.selftest)}`);
  console.log(`sheets expected      ${s.expected}`);
  console.log(`sheets loaded        ${s.loaded.length}`);
  console.log(`sheets failed        ${JSON.stringify(s.failed)}`);
  console.log(`sheets pending       ${JSON.stringify(s.pending)}`);
  console.log(`procedural uses      ${s.proceduralTotal}  ${JSON.stringify(s.proceduralUses)}`);
  const ok = out.selftest.detected && s.loaded.length === s.expected
    && Object.keys(s.failed).length === 0 && s.proceduralTotal === 0;
  console.log(ok ? 'PASS -- every near-field enemy on screen is the authored sheet'
    : 'FAIL -- see above');
  if (errors.length) { console.error('page errors:', errors); process.exitCode = 1; }
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}

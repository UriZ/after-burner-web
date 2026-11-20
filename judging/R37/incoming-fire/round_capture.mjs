#!/usr/bin/env node
// Capture a window around one battery round's approach on the CURRENT tree.
//   node round_capture.mjs --seed 4 --label before --out <dir>
// Same locate logic as judging/R36/death-legibility/ab_capture.mjs (single arm).
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const args = { seed: 4, out: null, label: 'cap' };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--seed') args.seed = Number(argv[++i]);
  else if (argv[i] === '--out') args.out = argv[++i];
  else if (argv[i] === '--label') args.label = argv[++i];
}

async function boot(urlParams) {
  const server = await createServer({
    root: ROOT, configFile: path.join(ROOT, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  page.on('pageerror', (e) => { console.error('PAGEERROR', e.message); process.exitCode = 2; });
  await page.goto(`http://127.0.0.1:${port}/?${urlParams}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
  return { server, browser, page };
}

async function locate(seed) {
  const ctx = await boot(`fixed=1&demo=1&seed=${seed}&invincible=1`);
  let fireTick = null;
  let prevBurst = 0;
  for (let t = 1; t <= 9000 && fireTick === null; t++) {
    const burst = await ctx.page.evaluate(() => {
      window.__step(1);
      const f = window.__fairness();
      return f.enemies
        .filter((e) => e.pattern === 'battery')
        .reduce((s, e) => s + (e.burstLeft ?? 0), 0);
    });
    if (t > 200 && prevBurst > 0 && burst === 0) fireTick = t;
    prevBurst = burst;
  }
  await ctx.browser.close();
  await ctx.server.close();
  return fireTick;
}

const fireTick = await locate(args.seed);
if (fireTick === null) { console.error('no battery round spawn found'); process.exit(1); }
const from = fireTick - 2;
const to = fireTick + 55; // ~0.9 s, covers the 0.80 s flight to the plane
await mkdir(args.out, { recursive: true });
const ctx = await boot(`fixed=1&demo=1&seed=${args.seed}&invincible=1`);
await ctx.page.evaluate((n) => window.__step(n), from - 1);
for (let t = from; t <= to; t++) {
  const png = await ctx.page.evaluate(() => {
    window.__step(1);
    return document.querySelector('#screen').toDataURL('image/png');
  });
  await writeFile(path.join(args.out, `${args.label}-t${String(t).padStart(5, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
}
await ctx.browser.close();
await ctx.server.close();
console.log(JSON.stringify({ seed: args.seed, fireTick, from, to }));

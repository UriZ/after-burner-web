#!/usr/bin/env node
// A/B: the SAME ground-battery round under OLD vs NEW ballistics. Same seed,
// same ticks (seed-mixed battery PRNG is deterministic per seed, so the
// battery spawns and fires at the identical place/time in both arms — only
// the round's flight differs). Demo pilot, invincible so the round is not
// cut short by a death. Captures a window around a located battery fire.
//
//   node ab_capture.mjs --seed 4 --out <dir>
// Pass 1 (arm=locate): find a tick where a battery's telegraph is lit, so we
// know a round leaves ~0.4 s later. Pass 2: capture both arms across that
// window.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const args = { seed: 4, out: null };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--seed') args.seed = Number(argv[++i]);
  else if (argv[i] === '--out') args.out = argv[++i];
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
  await page.goto(`http://127.0.0.1:${port}/?${urlParams}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
  return { server, browser, page };
}

// Find the tick a battery round actually SPAWNS: the tick the global
// batteryCrossings-independent signal `shotsInAir` jumps right after a battery
// burst pays out. We watch each battery's burstLeft go from >0 to 0 — that is
// the tick the round leaves the muzzle (groundBattery.update phase 2). Capture
// starts a few ticks later so the round is clear of the turret.
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

async function captureArm(seed, battery, label, fromTick, toTick, outDir) {
  const params = `fixed=1&demo=1&seed=${seed}&invincible=1` + (battery ? `&battery=${encodeURIComponent(battery)}` : '');
  const ctx = await boot(params);
  await ctx.page.evaluate((n) => window.__step(n), fromTick - 1);
  for (let t = fromTick; t <= toTick; t++) {
    const png = await ctx.page.evaluate(() => {
      window.__step(1);
      return document.querySelector('#screen').toDataURL('image/png');
    });
    await writeFile(path.join(outDir, `${label}-t${String(t).padStart(5, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
  }
  await ctx.browser.close();
  await ctx.server.close();
}

const fireTick = await locate(args.seed);
if (fireTick === null) { console.error('no battery round spawn found'); process.exit(1); }
const from = fireTick - 2; // the round has just left the muzzle
const to = fireTick + 80; // ~1.3 s window — covers the new round to the plane
await mkdir(args.out, { recursive: true });
await captureArm(args.seed, 'speed=10,spread=0.06', 'old', from, to, args.out);
await captureArm(args.seed, null, 'new', from, to, args.out);
console.log(JSON.stringify({ seed: args.seed, fireTick, from, to }));

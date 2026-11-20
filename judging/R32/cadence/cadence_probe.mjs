// Active-play close-pass cadence probe.
// Drives an ACTIVE aiming pilot (nearest enemy, proportional stick, jitter),
// fires gun + missile, and records the nearest on-screen enemy span each tick.
// Reports close-presence fractions, close-press cadence, and dwell.
//
// Usage: node cadence_probe.mjs [--seed N] [--secs S] [--jitter J] [--fire 0|1] [--url-params "..."]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = '/Users/urizonens/dev/afterburner-three';

const argv = process.argv.slice(2);
const args = { seed: 7, secs: 120, jitter: 0.5, fire: 1, urlParams: '' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seed') args.seed = Number(argv[++i]);
  else if (a === '--secs') args.secs = Number(argv[++i]);
  else if (a === '--jitter') args.jitter = Number(argv[++i]);
  else if (a === '--fire') args.fire = Number(argv[++i]);
  else if (a === '--url-params') args.urlParams = argv[++i];
}

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const url = new URL(`http://127.0.0.1:${port}/`);
const search = new URLSearchParams(args.urlParams);
search.set('fixed', '1');
if (!search.has('seed')) search.set('seed', String(args.seed));
url.search = search.toString();

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

  const ticks = Math.floor(args.secs * 60);
  const out = await page.evaluate(({ ticks, JITTER, FIRE }) => {
    // Per-tick nearest-enemy span (%W) and counts of close enemies.
    const nearestSpan = [];      // %W of nearest ON-SCREEN enemy, 0 if none
    const nearestDepth = [];
    let tgtPresentTicks = 0;     // ticks with >=1 on-screen enemy
    let gt8 = 0, gt14 = 0, gt20 = 0; // ticks with a >X%W enemy present
    const close14runs = [];      // dwell (ticks) of each contiguous >=14%W span
    let curRun = 0;
    let aliveSum = 0;
    const spanHist = {};         // nearest-span bucket histogram

    for (let i = 0; i < ticks; i++) {
      const stats = window.__combatStats ? window.__combatStats() : null;
      const sight = window.__sight ? window.__sight() : null;
      let target = null;
      let bestSpan = 0, bestDepth = 999;
      let anyGt8 = false, anyGt14 = false, anyGt20 = false;
      if (stats && stats.enemies) {
        aliveSum += stats.alive;
        for (const e of stats.enemies) {
          if (!e.onScreen) continue;
          const s = e.spanFrac * 100;
          if (s > 8) anyGt8 = true;
          if (s > 14) anyGt14 = true;
          if (s > 20) anyGt20 = true;
          if (!target || e.depth < target.depth) target = e;
          if (e.depth < bestDepth) { bestDepth = e.depth; }
          if (s > bestSpan) bestSpan = s; // largest on-screen enemy
        }
      }
      // nearest-by-depth span (what the player's eye is drawn to / aims at)
      const tgtSpan = target ? target.spanFrac * 100 : 0;
      nearestSpan.push(Number(tgtSpan.toFixed(2)));
      nearestDepth.push(target ? Number(target.depth.toFixed(1)) : null);
      if (target) tgtPresentTicks++;
      if (anyGt8) gt8++;
      if (anyGt14) gt14++;
      if (anyGt20) gt20++;
      if (anyGt14) { curRun++; } else { if (curRun > 0) close14runs.push(curRun); curRun = 0; }
      const b = tgtSpan < 2 ? '0-2' : tgtSpan < 4 ? '2-4' : tgtSpan < 8 ? '4-8'
              : tgtSpan < 14 ? '8-14' : tgtSpan < 20 ? '14-20' : '>20';
      spanHist[b] = (spanHist[b] || 0) + 1;

      // Active aim
      let sx = 0, sy = 0;
      if (target && sight) {
        const errX = target.ndcX - sight.ndcX;
        const errY = target.ndcY - sight.ndcY;
        const K = 4.0;
        const jx = JITTER * Math.sin(i * 0.9 + 1.3);
        const jy = JITTER * Math.sin(i * 1.27 + 0.4);
        sx = Math.max(-1, Math.min(1, K * errX + jx));
        sy = Math.max(-1, Math.min(1, K * errY + jy));
      }
      window.__setStick({ x: sx, y: sy, fire: FIRE === 1, missile: true, throttleIndex: 1 });
      window.__step(1);
    }
    if (curRun > 0) close14runs.push(curRun);

    const fs = window.__flowState ? window.__flowState() : null;
    const cs = window.__combatStats ? window.__combatStats() : null;
    return {
      ticks,
      tgtPresentFrac: Number((tgtPresentTicks / ticks).toFixed(3)),
      gt8Frac: Number((gt8 / ticks).toFixed(3)),
      gt14Frac: Number((gt14 / ticks).toFixed(3)),
      gt20Frac: Number((gt20 / ticks).toFixed(3)),
      meanAlive: Number((aliveSum / ticks).toFixed(2)),
      close14runsCount: close14runs.length,
      close14meanDwellS: close14runs.length ? Number((close14runs.reduce((a, b) => a + b, 0) / close14runs.length / 60).toFixed(2)) : 0,
      close14maxDwellS: close14runs.length ? Number((Math.max(...close14runs) / 60).toFixed(2)) : 0,
      close14pressPerMin: Number((close14runs.length / (ticks / 60 / 60)).toFixed(2)),
      spanHist,
      finalHits: cs ? cs.hits : null,
      finalStock: cs ? cs.missileStock : null,
      lives: fs ? fs.lives : null,
    };
  }, { ticks, JITTER: args.jitter, FIRE: args.fire });

  console.log(JSON.stringify({ seed: args.seed, secs: args.secs, fire: args.fire, jitter: args.jitter, ...out, errors }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

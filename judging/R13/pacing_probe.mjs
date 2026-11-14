#!/usr/bin/env node
// R13 pacing / presence probe (gaps 2 and 3). PASSIVE pilot (stick centred, no
// fire) so the measurement is of what the SPAWNER puts on screen, not of how an
// agent clears it. Records per tick: alive count, max enemy span, and the depth
// band of the biggest enemy. Reports:
//
//   * DEAD-STRETCH distribution — longest run of ticks with 0 enemies on
//     screen (gap 3: the defect is the 10+ s dead STRETCH).
//   * READABLE presence — fraction of ticks with >=1 enemy at >=10 %W, and the
//     fraction with an enemy dwelling at a mid readable depth near centre
//     (gap 2: the mid-range gunnery window).
//   * FLYBY events — large (>=20 %W) crossers seen (gap 3: the big close pass).
//
// Run the same build twice: default, and `?pace=baitevery=0,flyby=0,deadmax=999`
// which switches OFF every R13 feature on THIS build (the honest before arm,
// not a different build).

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SEED = arg('--seed', '7');
const PACE = arg('--pace', '');
const TICKS = Number(arg('--ticks', '7200')); // 120 s

async function boot(urlParams) {
  const server = await createServer({
    root: ROOT, configFile: path.join(ROOT, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const url = new URL('/', `http://127.0.0.1:${port}/`);
  const search = new URLSearchParams(urlParams); search.set('fixed', '1');
  url.search = search.toString();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });
  return { server, browser, page, errors };
}

async function run() {
  const params = `seed=${SEED}&invincible=1` + (PACE ? `&pace=${PACE}` : '');
  const { server, browser, page, errors } = await boot(params);
  const r = await page.evaluate(async (TICKS) => {
    let emptyRun = 0, maxEmptyRun = 0, emptyRunsOver2s = 0, emptyRunsOver1s = 0;
    let readableTicks = 0; // >=1 enemy >=10%W
    let midGunTicks = 0;   // >=1 enemy 10-22%W within |x|<0.25 (trackable gun target)
    let flybyEvents = 0, flybyActive = false; // a >=20%W crosser-ish pass
    let inReachLockTicks = 0; // >=1 enemy depth 16-88 within |x|<0.22 (bait reach)
    for (let i = 0; i < TICKS; i++) {
      window.__setStick({ x: 0, y: 0, missile: false, fire: false });
      window.__step(1);
      const s = window.__combatStats();
      const es = (s && s.enemies) ? s.enemies.filter((e) => e.onScreen) : [];
      if (es.length === 0) {
        emptyRun++;
        maxEmptyRun = Math.max(maxEmptyRun, emptyRun);
      } else {
        if (emptyRun >= 120) emptyRunsOver2s++;
        if (emptyRun >= 60) emptyRunsOver1s++;
        emptyRun = 0;
      }
      let maxSpan = 0, anyReadable = false, anyMidGun = false, anyInReachLock = false;
      for (const e of es) {
        maxSpan = Math.max(maxSpan, e.spanFrac);
        if (e.spanFrac >= 0.10) anyReadable = true;
        if (e.spanFrac >= 0.10 && e.spanFrac <= 0.22 && Math.abs(e.ndcX) < 0.25) anyMidGun = true;
        if (e.depth >= 16 && e.depth <= 88 && Math.abs(e.ndcX) < 0.22) anyInReachLock = true;
      }
      if (anyReadable) readableTicks++;
      if (anyMidGun) midGunTicks++;
      if (anyInReachLock) inReachLockTicks++;
      const big = maxSpan >= 0.20;
      if (big && !flybyActive) { flybyEvents++; flybyActive = true; }
      if (!big) flybyActive = false;
    }
    return {
      maxEmptyRunTicks: maxEmptyRun, maxEmptyRunS: +(maxEmptyRun / 60).toFixed(2),
      emptyRunsOver1s, emptyRunsOver2s,
      readableFrac: +(readableTicks / TICKS).toFixed(3),
      midGunFrac: +(midGunTicks / TICKS).toFixed(3),
      inReachLockFrac: +(inReachLockTicks / TICKS).toFixed(3),
      flybyEvents,
    };
  }, TICKS);
  await browser.close(); await server.close();
  console.log(JSON.stringify({ seed: SEED, pace: PACE || '(default)', ticks: TICKS, ...r, pageErrors: errors.slice(0, 3) }, null, 2));
}
run().catch((e) => { console.error(e); process.exit(1); });

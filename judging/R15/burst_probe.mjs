#!/usr/bin/env node
// R15 burst-rhythm probe (gaps 2 & 3). PASSIVE pilot (stick centred, no fire),
// so it measures what the SPAWNER puts on screen, not how a pilot clears it —
// the same discipline as R13's pacing_probe. The R13 probe answered "is the sky
// ever EMPTY and how often is a readable enemy present"; it could not answer the
// R15 question, which is about VARIANCE: does the CLOSE/gun-killable population
// swing between a WALL and a LULL, or sit flat.
//
// The gap-3 defect is "no wall, no lull": the arcade is a wall of planes then
// empties, ours holds a steady few. The R15 fix is variance WITHOUT inflating
// the mean. So this probe reports, per tick, two populations:
//
//   readable : enemies at >= 10 %W on screen (combat.js READABLE_SPAN_FRAC)
//   close    : enemies at >= 14 %W on screen (combat.js GUN_KILL_SPAN_FRAC) —
//              the gun-killable band, which is also the gap-2 target supply.
//
// and derives:
//   * mean/sd/peak of the close and readable counts (sd is the headline — it is
//     the "burstiness" the mean cannot show; a flat sky and a bursty sky can
//     share a mean and differ only here).
//   * WALL events: maximal runs with close-count >= wallN; their count and the
//     total wall-seconds. A wall is several close aircraft at once.
//   * LULL distribution: maximal runs with close-count == 0 (a close/gun lull,
//     NOT a fully-empty sky — specks may still be present); count, longest, and
//     total lull-seconds. The arcade empties between walls.
//   * the gap-2 SUPPLY SPLIT during walls: of the close aircraft present, how
//     many sit OFF-CENTRE (|x| > offCtr, reachable only by a sweeping/aiming
//     sight) vs near centre (a blind centred net already catches them). A wall
//     that is all dead-centre feeds the blind pilot; a wall spread across the
//     frame is what lets an aimer out-kill the blind stick.
//
// Run the same build twice for an honest A/B: default, and the `?pace=` arm that
// switches the R15 burst OFF on THIS build (burstevery=0), not a different build.

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SEED = arg('--seed', '7');
const PACE = arg('--pace', '');
const TICKS = Number(arg('--ticks', '7200')); // 120 s
const WALL_N = Number(arg('--walln', '3'));   // close-count that counts as a wall
const OFF_CTR = Number(arg('--offctr', '0.12')); // |x| beyond which a close target is off-centre
const READABLE = 0.10; // combat.js READABLE_SPAN_FRAC
const CLOSE = 0.14;    // combat.js GUN_KILL_SPAN_FRAC

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
  const r = await page.evaluate(async (TICKS, READABLE, CLOSE, WALL_N, OFF_CTR) => {
    const closeSeries = [];
    const readSeries = [];
    // wall / lull run tracking on the close population
    let wallEvents = 0, wallTicks = 0, inWall = false;
    let lullRun = 0, lullCount = 0, maxLull = 0, lullTicks = 0, lullStarted = false;
    // supply split summed over wall ticks
    let wallCloseOff = 0, wallCloseCtr = 0;
    for (let i = 0; i < TICKS; i++) {
      window.__setStick({ x: 0, y: 0, missile: false, fire: false });
      window.__step(1);
      const s = window.__combatStats();
      const es = (s && s.enemies) ? s.enemies.filter((e) => e.onScreen) : [];
      let nClose = 0, nRead = 0, off = 0, ctr = 0;
      for (const e of es) {
        if (e.spanFrac >= READABLE) nRead++;
        if (e.spanFrac >= CLOSE) {
          nClose++;
          if (Math.abs(e.ndcX) > OFF_CTR) off++; else ctr++;
        }
      }
      closeSeries.push(nClose);
      readSeries.push(nRead);
      // wall runs
      if (nClose >= WALL_N) {
        if (!inWall) { wallEvents++; inWall = true; }
        wallTicks++;
        wallCloseOff += off; wallCloseCtr += ctr;
      } else inWall = false;
      // lull runs (close == 0)
      if (nClose === 0) {
        lullRun++;
      } else {
        if (lullStarted && lullRun > 0) { lullCount++; lullTicks += lullRun; maxLull = Math.max(maxLull, lullRun); }
        lullStarted = true;
        lullRun = 0;
      }
    }
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length); };
    const peak = (a) => a.reduce((m, x) => Math.max(m, x), 0);
    const cm = mean(closeSeries), rm = mean(readSeries);
    return {
      closeMean: +cm.toFixed(3), closeSd: +sd(closeSeries).toFixed(3), closePeak: peak(closeSeries),
      closeCv: +(sd(closeSeries) / (cm || 1)).toFixed(3),
      readMean: +rm.toFixed(3), readSd: +sd(readSeries).toFixed(3), readPeak: peak(readSeries),
      readFrac: +(readSeries.filter((x) => x >= 1).length / TICKS).toFixed(3),
      wallEvents, wallSeconds: +(wallTicks / 60).toFixed(1),
      wallCloseOffPerTick: wallTicks ? +(wallCloseOff / wallTicks).toFixed(2) : 0,
      wallCloseCtrPerTick: wallTicks ? +(wallCloseCtr / wallTicks).toFixed(2) : 0,
      lullEvents: lullCount, lullMaxS: +(maxLull / 60).toFixed(2), lullTotalS: +(lullTicks / 60).toFixed(1),
    };
  }, TICKS, READABLE, CLOSE, WALL_N, OFF_CTR);
  await browser.close(); await server.close();
  console.log(JSON.stringify({ seed: SEED, pace: PACE || '(default)', ticks: TICKS, wallN: WALL_N, ...r, pageErrors: errors.slice(0, 3) }, null, 2));
}
run().catch((e) => { console.error(e); process.exit(1); });

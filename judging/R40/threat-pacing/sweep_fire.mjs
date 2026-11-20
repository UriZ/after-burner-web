#!/usr/bin/env node
// R40 threat-pacing — fire-SCHEDULE sweep. Runs `?demo=1` arms (the project's
// standard non-reactive pilot) on a frozen vite root and reports, per arm, the
// statistics the gap is phrased in:
//
//   rounds/min      VOLUME — closed by R30; an arm that moves this outside
//                   seed scatter is rejected whatever its shape.
//   trains/min      how many separate decisions that volume arrives in.
//   CV              sd/mean of inter-fire-event gaps. 0 = metronome,
//                   1.0 = Poisson, >1 = clumped. The burstiness statistic,
//                   identical operator on every arm and on the arcade side.
//   maxDroughtS     longest stretch of FLIGHT with no round leaving any enemy.
//   maxTrainN       biggest single clump (events <=1.0 s apart pooled).
//
// Polls `__fairness().shotsFired` once per tick — a cumulative counter, so a
// fire event cannot be missed between samples — plus `__flowState().state` so
// droughts are measured over flight time only (a death or tally pause is not a
// drought the player lives through). Neither hook touches the RNG
// (combat.js:505); `__combatDebug` would and is never called.
//
// Usage:
//   node sweep_fire.mjs --root <dir> --seeds 4,5,6 --seconds 90 \
//                       --arms "base:|lowfloor:fire=floor=14|tight:fire=floor=14,gapmin=0.6"
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';

function parseArgs(argv) {
  const a = { root: null, seeds: [4, 5, 6], seconds: 90, arms: [['base', '']] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--root') a.root = argv[++i];
    else if (k === '--seeds') a.seeds = argv[++i].split(',').map(Number);
    else if (k === '--seconds') a.seconds = Number(argv[++i]);
    else if (k === '--arms') a.arms = argv[++i].split('|').map((s) => {
      const i2 = s.indexOf(':');
      return [s.slice(0, i2), s.slice(i2 + 1)];
    });
    else { console.error(`unknown arg ${k}`); process.exit(2); }
  }
  if (!a.root) { console.error('--root is required'); process.exit(2); }
  return a;
}

const stat = (xs) => {
  if (!xs.length) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
  return { mean: +m.toFixed(3), sd: +sd.toFixed(3), cv: m > 0 ? +(sd / m).toFixed(3) : null };
};

async function runArm(browser, port, seed, params, seconds) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const search = new URLSearchParams('demo=1');
  search.set('fixed', '1');
  search.set('seed', String(seed));
  for (const pair of params.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    search.set(pair.slice(0, i), pair.slice(i + 1));
  }
  await page.goto(`http://127.0.0.1:${port}/?${search}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 30000 });

  const ticks = Math.round(seconds * 60);
  const fires = []; // [tickOfFlight, nRounds]
  let prev = 0;
  let flightTicks = 0;
  // Batch the per-tick reads: one evaluate per 60 ticks, stepping 1 tick at a
  // time INSIDE the page so no fire event falls between samples. (A bulk
  // __step(60) would only give the total, losing the gap structure.)
  for (let i = 0; i < ticks; i += 60) {
    const n = Math.min(60, ticks - i);
    const chunk = await page.evaluate((k) => {
      const out = [];
      for (let j = 0; j < k; j++) {
        window.__step(1);
        const f = window.__flowState();
        out.push([f.state === 'flight' ? 1 : 0, window.__fairness().shotsFired]);
      }
      return out;
    }, n);
    for (const [isFlight, cum] of chunk) {
      if (isFlight) flightTicks += 1;
      if (cum > prev) { if (isFlight) fires.push([flightTicks, cum - prev]); prev = cum; }
    }
  }
  await page.close();

  const flightS = flightTicks / 60;
  const gaps = [];
  for (let i = 1; i < fires.length; i++) gaps.push((fires[i][0] - fires[i - 1][0]) / 60);
  // Clump events <=1.0 s apart into one "train" (the player reads them as one
  // event); the gaps BETWEEN clumps are the droughts.
  const trains = [];
  let cur = null;
  for (const [t, n] of fires) {
    if (!cur || (t - cur.end) / 60 > 1.0) { cur = { start: t, end: t, n }; trains.push(cur); }
    else { cur.end = t; cur.n += n; }
  }
  const tGaps = [];
  for (let i = 1; i < trains.length; i++) tGaps.push((trains[i].start - trains[i - 1].end) / 60);
  const rounds = fires.reduce((a, f) => a + f[1], 0);
  // PEAK DENSITY — the statistic `maxTrainN` stops measuring once fire becomes
  // continuous. Pooling events <=1 s apart chains a steady stream into one
  // enormous "train", so a stream and a barrage score the same. Rounds inside
  // the worst sliding 1 s and 3 s windows do not have that failure mode: a
  // barrage puts 24 rounds in one second, a stream of the same volume puts
  // ~1. This is the burstiness number the player sentence is about.
  const windowPeak = (secs) => {
    const w = secs * 60;
    let best = 0;
    for (let i = 0; i < fires.length; i++) {
      let sum = 0;
      for (let j = i; j < fires.length && fires[j][0] - fires[i][0] < w; j++) sum += fires[j][1];
      if (sum > best) best = sum;
    }
    return best;
  };
  // Rounds per 10 s of flight — the series the playtest sentence describes.
  const bins = new Array(Math.max(1, Math.ceil(flightTicks / 600))).fill(0);
  for (const [t, n] of fires) bins[Math.floor((t - 1) / 600)] += n;
  return {
    peak1s: windowPeak(1),
    peak3s: windowPeak(3),
    emptyBins10s: bins.filter((b) => b === 0).length,
    bins,
    seed, flightS: +flightS.toFixed(1), rounds,
    roundsPerMin: +((rounds / flightS) * 60).toFixed(1),
    trains: trains.length, trainsPerMin: +((trains.length / flightS) * 60).toFixed(1),
    gapCV: stat(gaps)?.cv ?? null,
    maxDroughtS: tGaps.length ? +Math.max(...tGaps).toFixed(1) : null,
    maxTrainN: trains.length ? Math.max(...trains.map((t) => t.n)) : 0,
    medTrainN: trains.length ? trains.map((t) => t.n).sort((a, b) => a - b)[trains.length >> 1] : 0,
    errors: errors.slice(0, 3),
  };
}

const args = parseArgs(process.argv.slice(2));
const server = await createServer({
  root: args.root,
  configFile: path.join(args.root, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
  // R40: this machine runs several lanes' probes at once and load spikes made
  // CDP's default 180 s call timeout fire mid-run, killing 3-minute arms with a
  // ProtocolError. 0 = no timeout: a slow reply is slow, not a failed run.
  protocolTimeout: 0 });
const out = {};
try {
  for (const [name, params] of args.arms) {
    const runs = [];
    for (const seed of args.seeds) runs.push(await runArm(browser, port, seed, params, args.seconds));
    const tot = (f) => runs.reduce((a, r) => a + f(r), 0);
    out[name] = {
      params,
      runs,
      pooledRoundsPerMin: +((tot((r) => r.rounds) / tot((r) => r.flightS)) * 60).toFixed(1),
      pooledTrainsPerMin: +((tot((r) => r.trains) / tot((r) => r.flightS)) * 60).toFixed(1),
      meanGapCV: +(tot((r) => r.gapCV ?? 0) / runs.length).toFixed(3),
      worstDroughtS: Math.max(...runs.map((r) => r.maxDroughtS ?? 0)),
      worstTrainN: Math.max(...runs.map((r) => r.maxTrainN)),
    };
    console.error(`${name}: ${JSON.stringify(out[name].pooledRoundsPerMin)} rounds/min, ` +
      `${out[name].pooledTrainsPerMin} trains/min, CV ${out[name].meanGapCV}, ` +
      `drought ${out[name].worstDroughtS}s, worstTrain ${out[name].worstTrainN}`);
  }
  console.log(JSON.stringify({ root: args.root, seconds: args.seconds, seeds: args.seeds, arms: out }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

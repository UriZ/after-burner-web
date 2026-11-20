// kill_depth_probe_r37.mjs — R37 missile-feel lane.
//
// IDENTICAL OPERATOR to judging/R36/depth-combat/kill_depth_probe.mjs (same
// pilots, same NEAR/MID/FAR bins read at the kill tick from __killDrain),
// with exactly two additions, neither of which touches the statistic:
//   1. PATIENT TIMEOUTS. The R37 build window runs 4+ lanes' headless
//      browsers at once (load average ~600); the original's 30 s goto /
//      20 s __frameReady budgets produced three straight TimeoutErrors with
//      zero frames — an availability failure, not a measurement one.
//   2. __missileDrain rows are ALSO collected, because this lane's change
//      (the R37 intercept deadline) claims flight times land inside
//      GAME_SPEC §3's MEASURED 0.5–1.5 s band — `age` on a hit row IS the
//      launch->impact time, so the claim gets a measured sample instead of
//      a by-design assertion.
//
// Usage: node judging/R37/missile-feel/kill_depth_probe_r37.mjs \
//          [--seeds 7,42] [--secs 120]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const args = { seeds: [7, 42], secs: 120 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seeds') args.seeds = argv[++i].split(',').map(Number);
  else if (a === '--secs') args.secs = Number(argv[++i]);
}

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 1800000,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function runArm(seed, mode, secs) {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(900000);
  page.setDefaultTimeout(900000);
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}`, {
    waitUntil: 'load',
    timeout: 900000,
  });
  await page.waitForFunction('window.__frameReady === true', { timeout: 900000 });

  const out = await page.evaluate(
    async ({ ticks, mode }) => {
      const kills = [];
      const missiles = [];
      let deaths = 0;
      let prevState = null;
      let maxStage = 0;
      const CHUNK = 10;
      for (let i = 0; i < ticks; i += CHUNK) {
        let sx = 0;
        let sy = 0;
        if (mode === 'aimed') {
          const stats = window.__combatStats ? window.__combatStats() : null;
          const sight = window.__sight ? window.__sight() : null;
          let target = null;
          if (stats && stats.enemies) {
            for (const e of stats.enemies) {
              if (!e.onScreen) continue;
              if (!target || e.depth < target.depth) target = e;
            }
          }
          if (target && sight) {
            const K = 4.0;
            sx = Math.max(-1, Math.min(1, K * (target.ndcX - sight.ndcX)));
            sy = Math.max(-1, Math.min(1, K * (target.ndcY - sight.ndcY)));
          }
        }
        window.__setStick({ x: sx, y: sy, fire: true, missile: true, throttleIndex: 1 });
        window.__step(CHUNK);
        const drained = window.__killDrain ? window.__killDrain() : null;
        if (drained) for (const k of drained.kills) kills.push(k);
        const md = window.__missileDrain ? window.__missileDrain() : null;
        if (md) for (const r of md) missiles.push(r);
        const fs = window.__flowState ? window.__flowState() : null;
        if (fs) {
          if (fs.state === 'death' && prevState !== 'death') deaths += 1;
          prevState = fs.state;
          if (typeof fs.stageIndex === 'number' && fs.stageIndex > maxStage)
            maxStage = fs.stageIndex;
        }
      }
      return { kills, missiles, deaths, maxStage };
    },
    { ticks: Math.floor(secs * 60), mode },
  );
  await page.close();

  const spans = out.kills.map((k) => k.span);
  const bins = { near: 0, mid: 0, far: 0 };
  for (const s of spans) {
    if (s >= 0.12) bins.near += 1;
    else if (s >= 0.03) bins.mid += 1;
    else bins.far += 1;
  }
  const bySrc = {};
  for (const k of out.kills) bySrc[k.src] = (bySrc[k.src] ?? 0) + 1;
  const sorted = [...spans].sort((a, b) => a - b);
  const q = (p) => (sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : null);
  // Locked-hit flight times: hit rows that are NOT dry shots. `age` at the
  // crossing is launch->impact.
  const lockedHitAges = out.missiles
    .filter((r) => r.hit && !r.dry)
    .map((r) => r.age)
    .sort((a, b) => a - b);
  const aq = (p) =>
    lockedHitAges.length
      ? Number(lockedHitAges[Math.floor(p * (lockedHitAges.length - 1))].toFixed(3))
      : null;
  const launches = out.missiles.length;
  const lockedHits = lockedHitAges.length;
  return {
    seed,
    mode,
    secs,
    kills: out.kills.length,
    killsPerMin: Number(((out.kills.length * 60) / secs).toFixed(2)),
    deaths: out.deaths,
    maxStage: out.maxStage,
    bins,
    binsFrac: {
      near: Number((bins.near / Math.max(1, spans.length)).toFixed(3)),
      mid: Number((bins.mid / Math.max(1, spans.length)).toFixed(3)),
      far: Number((bins.far / Math.max(1, spans.length)).toFixed(3)),
    },
    spanP50: q(0.5),
    spanP90: q(0.9),
    bySrc,
    missileRows: launches,
    lockedHits,
    flightAgeP10: aq(0.1),
    flightAgeP50: aq(0.5),
    flightAgeP90: aq(0.9),
    flightAgeMin: lockedHitAges.length ? Number(lockedHitAges[0].toFixed(3)) : null,
    flightAgeMax: lockedHitAges.length
      ? Number(lockedHitAges[lockedHitAges.length - 1].toFixed(3))
      : null,
    errors: errors.slice(0, 3),
  };
}

const results = [];
for (const seed of args.seeds) {
  for (const mode of ['aimed', 'handsoff']) {
    const r = await runArm(seed, mode, args.secs);
    results.push(r);
    console.error(
      `seed ${seed} ${mode}: ${r.kills} kills (${r.killsPerMin}/min), ` +
        `near/mid/far ${r.bins.near}/${r.bins.mid}/${r.bins.far}, ` +
        `lockedHits ${r.lockedHits} flightP50 ${r.flightAgeP50}, deaths ${r.deaths}`,
    );
  }
}
console.log(JSON.stringify({ args, results }, null, 1));
await browser.close();
await server.close();

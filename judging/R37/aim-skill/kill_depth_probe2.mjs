// kill_depth_probe.mjs — R36 depth-combat lane.
//
// Measures WHERE kills happen (enemy span %W at the kill tick, from
// combat.js's killLog via window.__killDrain) under two pilots:
//
//   aimed    — proportional controller steering the sight onto the nearest
//              on-screen enemy, fire + missile held (the naive "point at
//              planes and shoot" posture, same controller as
//              tools/aim_lock_probe.mjs).
//   handsoff — stick centered, fire + missile held. The R36 playtest's
//              discriminating control: this arm cleared stage 2 on the
//              shipped build, which is the gap.
//
// Bins use the SAME operator as the arcade hand census
// (judging/R36/depth-combat/NOTES.md): NEAR = span >= 12 %W,
// MID = 3-12 %W, FAR = < 3 %W, read at the kill tick.
//
// Usage: node judging/R36/depth-combat/kill_depth_probe.mjs \
//          [--seeds 7,42,3] [--secs 120] [--url-params "..."]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const args = { seeds: [7, 42, 3], secs: 120, urlParams: '' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seeds') args.seeds = argv[++i].split(',').map(Number);
  else if (a === '--secs') args.secs = Number(argv[++i]);
  else if (a === '--url-params') args.urlParams = argv[++i];
}

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function runArm(seed, mode, secs, urlParams) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const search = new URLSearchParams(urlParams);
  search.set('fixed', '1');
  search.set('seed', String(seed));
  await page.goto(`http://127.0.0.1:${port}/?${search}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

  const out = await page.evaluate(
    async ({ ticks, mode }) => {
      const kills = [];
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
        const fs = window.__flowState ? window.__flowState() : null;
        if (fs) {
          if (fs.state === 'death' && prevState !== 'death') deaths += 1;
          prevState = fs.state;
          if (typeof fs.stageIndex === 'number' && fs.stageIndex > maxStage)
            maxStage = fs.stageIndex;
        }
      }
      return { kills, deaths, maxStage };
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
  const byPattern = {};
  for (const k of out.kills) byPattern[k.pattern] = (byPattern[k.pattern] ?? 0) + 1;
  const sorted = [...spans].sort((a, b) => a - b);
  const q = (p) => (sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : null);
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
    byPattern,
    errors: errors.slice(0, 3),
  };
}

const results = [];
for (const seed of args.seeds) {
  for (const mode of ['aimed', 'handsoff']) {
    const r = await runArm(seed, mode, args.secs, args.urlParams);
    results.push(r);
    console.error(
      `seed ${seed} ${mode}: ${r.kills} kills (${r.killsPerMin}/min), ` +
        `near/mid/far ${r.bins.near}/${r.bins.mid}/${r.bins.far}, ` +
        `deaths ${r.deaths}, maxStage ${r.maxStage}`,
    );
  }
}
console.log(JSON.stringify({ args, results }, null, 1));
await browser.close();
await server.close();

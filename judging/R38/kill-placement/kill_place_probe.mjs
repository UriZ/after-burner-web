// kill_place_probe.mjs — R38 kill-placement lane.
//
// Measures WHERE kills resolve RELATIVE TO THE PLAYER'S JET (screen distance
// in frame-width fractions at the kill tick), on top of the R36/R37 depth
// bins. The playtest gap is "kills explode on my own nose": the quantity that
// decides that is kill→player screen distance, which no previous probe read.
//
// Player position is reconstructed from the killLog's own sightX/sightY:
// sight = player + 0.30 NDC along screen-up, so at zero roll (the hands-off
// arm, exactly; the aimed arm approximately — its controller banks) the
// player sits at (sightX, sightY - 0.30). Stated bias: under bank the
// reconstruction under-rotates; hands-off is the arm the gap is about.
//
// Same pilots as judging/R37/aim-skill/kill_depth_probe2.mjs (aimed =
// proportional steer onto nearest on-screen enemy, fire+missile held;
// handsoff = stick centered, fire+missile held).
//
// Usage: node judging/R38/kill-placement/kill_place_probe.mjs \
//          [--seeds 7,42] [--secs 120] [--url-params "..."] [--dump out.json]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const args = { seeds: [7, 42], secs: 120, urlParams: '', dump: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seeds') args.seeds = argv[++i].split(',').map(Number);
  else if (a === '--secs') args.secs = Number(argv[++i]);
  else if (a === '--url-params') args.urlParams = argv[++i];
  else if (a === '--dump') args.dump = argv[++i];
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

  // kill→player screen distance, isotropic frame-width fractions — the same
  // unit every hit test in the project uses (x: NDC*0.5, y additionally
  // *224/320). Player reconstructed from the sight (see header).
  const aspectY = 224 / 320;
  const rows = out.kills.map((k) => {
    const px = k.sightX;
    const py = k.sightY - 0.3;
    const distP = Math.hypot((k.ndcX - px) * 0.5, (k.ndcY - py) * 0.5 * aspectY);
    return { ...k, distP: Number(distP.toFixed(4)) };
  });

  const summarize = (list) => {
    const ds = list.map((k) => k.distP).sort((a, b) => a - b);
    const q = (p) => (ds.length ? Number(ds[Math.floor(p * (ds.length - 1))].toFixed(3)) : null);
    // "on the nose" = kill centre within 0.12 fracW of the jet centre — the
    // jet spans 35.6 %W, so 0.12 is inside the drawn airframe's own footprint.
    const onNose = ds.filter((d) => d <= 0.12).length;
    return {
      n: list.length,
      onNoseFrac: list.length ? Number((onNose / list.length).toFixed(3)) : null,
      distP10: q(0.1), distP50: q(0.5), distP90: q(0.9),
    };
  };

  const gun = rows.filter((k) => k.src === 'vulcan');
  const mis = rows.filter((k) => k.src === 'missile');
  const byPattern = {};
  for (const k of gun) {
    byPattern[k.pattern] ??= [];
    byPattern[k.pattern].push(k);
  }
  const patternSummary = {};
  for (const [p, list] of Object.entries(byPattern)) patternSummary[p] = summarize(list);

  const bins = { near: 0, mid: 0, far: 0 };
  for (const k of rows) {
    if (k.span >= 0.12) bins.near += 1;
    else if (k.span >= 0.03) bins.mid += 1;
    else bins.far += 1;
  }

  return {
    seed, mode, secs,
    kills: rows.length,
    killsPerMin: Number(((rows.length * 60) / secs).toFixed(2)),
    deaths: out.deaths,
    maxStage: out.maxStage,
    bins,
    gun: summarize(gun),
    gunByPattern: patternSummary,
    missile: summarize(mis),
    rows,
    errors: errors.slice(0, 3),
  };
}

const results = [];
for (const seed of args.seeds) {
  for (const mode of ['aimed', 'handsoff']) {
    const r = await runArm(seed, mode, args.secs, args.urlParams);
    results.push(r);
    console.error(
      `seed ${seed} ${mode}: ${r.kills} kills (${r.killsPerMin}/min), deaths ${r.deaths}, ` +
        `gun n=${r.gun.n} onNose=${r.gun.onNoseFrac} distP50=${r.gun.distP50} ` +
        `missile n=${r.missile.n} onNose=${r.missile.onNoseFrac} distP50=${r.missile.distP50}`,
    );
  }
}
const slim = results.map(({ rows, ...rest }) => rest);
console.log(JSON.stringify({ args: { ...args, dump: undefined }, results: slim }, null, 1));
if (args.dump) await writeFile(args.dump, JSON.stringify({ args, results }, null, 1));
await browser.close();
await server.close();

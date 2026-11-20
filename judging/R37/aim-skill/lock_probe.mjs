// lock_probe.mjs — R37 aim-skill lane. aim_lock_probe.mjs (R27) with a
// --mode handsoff arm: stick centered, missile button HELD, so it measures
// what a PARKED stick gets from the lock system (locks formed, salvos
// launched, missile hits) under the identical instrumentation the aimed
// pilot uses. --mode aimed is byte-for-byte the R27 proportional pilot.
//
// Usage: node judging/R37/aim-skill/lock_probe.mjs \
//          [--seed N] [--secs S] [--jitter J] [--mode aimed|handsoff] [--url-params "..."]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const args = { seed: 7, secs: 20, urlParams: '', jitter: 0, mode: 'aimed' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seed') args.seed = Number(argv[++i]);
  else if (a === '--secs') args.secs = Number(argv[++i]);
  else if (a === '--jitter') args.jitter = Number(argv[++i]);
  else if (a === '--mode') args.mode = argv[++i];
  else if (a === '--url-params') args.urlParams = argv[++i];
}
if (!['aimed', 'handsoff'].includes(args.mode)) {
  throw new Error(`--mode must be aimed|handsoff, got "${args.mode}"`);
}

const server = await createServer({
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

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 30000 });

  const ticks = Math.floor(args.secs * 60);
  const out = await page.evaluate(({ ticks, JITTER, MODE }) => {
    let firstLockTick = null;
    let firstLaunchTick = null;
    let maxLocks = 0;
    let lockTickCount = 0;
    let acquiringTicks = 0;
    let hits = 0;
    let crossings = 0;
    let totalRetired = 0;
    let lockCompletions = 0; // rising edges of the held-lock count
    let prevLocks = 0;

    for (let i = 0; i < ticks; i++) {
      let sx = 0;
      let sy = 0;
      if (MODE === 'aimed') {
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
          const jx = JITTER * Math.sin(i * 0.9 + 1.3);
          const jy = JITTER * Math.sin(i * 1.27 + 0.4);
          sx = Math.max(-1, Math.min(1, K * (target.ndcX - sight.ndcX) + jx));
          sy = Math.max(-1, Math.min(1, K * (target.ndcY - sight.ndcY) + jy));
        }
      }
      window.__setStick({ x: sx, y: sy, missile: true, throttleIndex: 1 });
      window.__step(1);

      const ls = window.__lockState ? window.__lockState() : null;
      if (ls) {
        if (ls.locks > 0 && firstLockTick === null) firstLockTick = i;
        if (ls.locks > maxLocks) maxLocks = ls.locks;
        if (ls.locks > 0) lockTickCount++;
        if (ls.locks > prevLocks) lockCompletions += ls.locks - prevLocks;
        prevLocks = ls.locks;
        if (ls.acquiring !== null) acquiringTicks++;
        if (ls.inFlight > 0 && firstLaunchTick === null) firstLaunchTick = i;
      }
      if (window.__missileDrain) {
        const rows = window.__missileDrain();
        for (const r of rows) {
          totalRetired++;
          if (r.hit) hits++;
          if (r.lat !== null && r.lat !== undefined) crossings++;
        }
      }
    }
    if (window.__missileDrain) {
      const rows = window.__missileDrain();
      for (const r of rows) {
        totalRetired++;
        if (r.hit) hits++;
        if (r.lat !== null && r.lat !== undefined) crossings++;
      }
    }
    const finalStock = window.__lockState ? window.__lockState().stock : null;
    return {
      firstLockTick,
      firstLaunchTick,
      maxLocks,
      lockTickCount,
      acquiringTicks,
      lockCompletions,
      hits,
      crossings,
      totalRetired,
      hitRateCrossings: crossings ? Number((hits / crossings).toFixed(3)) : null,
      finalStock,
    };
  }, { ticks, JITTER: args.jitter, MODE: args.mode });

  console.log(JSON.stringify({ ...args, ...out, errors }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

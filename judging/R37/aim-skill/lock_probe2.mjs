// lock_probe2.mjs — lock_probe with the 7200-tick single evaluate split into
// 600-tick chunks (state parked on window.__lp between evaluates) and
// protocolTimeout raised: the single-evaluate form crashed the tab
// ('Target closed') three times in a row on the seed-7 hands-off arm while
// the same arm survives under kill_depth_probe2's chunked loop. Metrics are
// identical to lock_probe.mjs.
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
  protocolTimeout: 900000,
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
  const CHUNK = 600;
  await page.evaluate(() => {
    window.__lp = {
      firstLockTick: null, firstLaunchTick: null, maxLocks: 0,
      lockTickCount: 0, acquiringTicks: 0, lockCompletions: 0, prevLocks: 0,
      hits: 0, crossings: 0, totalRetired: 0, i: 0,
    };
  });
  for (let start = 0; start < ticks; start += CHUNK) {
    const n = Math.min(CHUNK, ticks - start);
    await page.evaluate(({ n, JITTER, MODE }) => {
      const S = window.__lp;
      for (let k = 0; k < n; k++) {
        const i = S.i++;
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
          if (ls.locks > 0 && S.firstLockTick === null) S.firstLockTick = i;
          if (ls.locks > S.maxLocks) S.maxLocks = ls.locks;
          if (ls.locks > 0) S.lockTickCount++;
          if (ls.locks > S.prevLocks) S.lockCompletions += ls.locks - S.prevLocks;
          S.prevLocks = ls.locks;
          if (ls.acquiring !== null) S.acquiringTicks++;
          if (ls.inFlight > 0 && S.firstLaunchTick === null) S.firstLaunchTick = i;
        }
        if (window.__missileDrain) {
          const rows = window.__missileDrain();
          for (const r of rows) {
            S.totalRetired++;
            if (r.hit) S.hits++;
            if (r.lat !== null && r.lat !== undefined) S.crossings++;
          }
        }
      }
    }, { n, JITTER: args.jitter, MODE: args.mode });
  }
  const out = await page.evaluate(() => {
    const S = window.__lp;
    if (window.__missileDrain) {
      const rows = window.__missileDrain();
      for (const r of rows) {
        S.totalRetired++;
        if (r.hit) S.hits++;
        if (r.lat !== null && r.lat !== undefined) S.crossings++;
      }
    }
    const finalStock = window.__lockState ? window.__lockState().stock : null;
    const { prevLocks, i, ...rest } = S;
    return {
      ...rest,
      hitRateCrossings: S.crossings ? Number((S.hits / S.crossings).toFixed(3)) : null,
      finalStock,
    };
  });

  console.log(JSON.stringify({ ...args, ...out, errors }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

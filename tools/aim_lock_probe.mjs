// aim_lock_probe.mjs — NAIVE AIM-AND-FIRE test for the missile lock.
//
// The demo weave is the pessimal case for a longer acquire (the sight never
// rests on a target). This probe instead flies the way a player who WANTS a
// missile flies: pick the nearest on-screen enemy, steer the sight onto it
// with a proportional controller, and HOLD the missile button. It reports how
// long the lock takes to form and whether missiles actually launch — the thing
// the owner's "you need to get a lock" has to still allow.
//
// Usage: node tools/aim_lock_probe.mjs [--seed N] [--secs S] [--url-params "..."]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const args = { seed: 7, secs: 20, urlParams: '', jitter: 0 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seed') args.seed = Number(argv[++i]);
  else if (a === '--secs') args.secs = Number(argv[++i]);
  else if (a === '--jitter') args.jitter = Number(argv[++i]);
  else if (a === '--url-params') args.urlParams = argv[++i];
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
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

  const ticks = Math.floor(args.secs * 60);
  const out = await page.evaluate(({ ticks, JITTER }) => {
    const log = [];
    let firstLockTick = null;
    let firstLaunchTick = null;
    let maxLocks = 0;
    let totalLaunched = 0;
    let prevInFlightPlusImpacts = 0;
    let lockTickCount = 0; // ticks with >=1 completed lock held
    let acquiringTicks = 0; // ticks with an acquisition in progress

    for (let i = 0; i < ticks; i++) {
      const stats = window.__combatStats ? window.__combatStats() : null;
      const sight = window.__sight ? window.__sight() : null;
      // Pick nearest on-screen enemy by depth.
      let target = null;
      if (stats && stats.enemies) {
        for (const e of stats.enemies) {
          if (!e.onScreen) continue;
          if (!target || e.depth < target.depth) target = e;
        }
      }
      // Proportional aim: nudge the stick to drive the sight onto the target.
      let sx = 0;
      let sy = 0;
      if (target && sight) {
        const errX = target.ndcX - sight.ndcX;
        const errY = target.ndcY - sight.ndcY;
        const K = 4.0;
        // JITTER simulates a hand-flown stick: a real player does not hold the
        // sight pixel-perfect on the target, they hover around it. Deterministic
        // (seeded by tick), no Math.random (banned in this env).
        const jx = JITTER * Math.sin(i * 0.9 + 1.3);
        const jy = JITTER * Math.sin(i * 1.27 + 0.4);
        sx = Math.max(-1, Math.min(1, K * errX + jx));
        sy = Math.max(-1, Math.min(1, K * errY + jy));
      }
      window.__setStick({ x: sx, y: sy, missile: true, throttleIndex: 1 });
      window.__step(1);

      const ls = window.__lockState ? window.__lockState() : null;
      if (ls) {
        if (ls.locks > 0 && firstLockTick === null) firstLockTick = i;
        if (ls.locks > maxLocks) maxLocks = ls.locks;
        if (ls.locks > 0) lockTickCount++;
        if (ls.acquiring !== null) acquiringTicks++;
        if (ls.inFlight > 0 && firstLaunchTick === null) firstLaunchTick = i;
        // Count launches via inFlight rising edges + impacts (missiles leave
        // flight on impact). Approximate total launched by tracking the max
        // cumulative seen.
      }
      if (i % 30 === 0 || (ls && ls.locks > 0 && log.length < 40)) {
        log.push({
          t: i,
          sight: sight ? [Number(sight.ndcX.toFixed(2)), Number(sight.ndcY.toFixed(2))] : null,
          tgt: target ? [Number(target.ndcX.toFixed(2)), Number(target.ndcY.toFixed(2)), Number(target.depth.toFixed(1))] : null,
          acq: ls ? ls.acquiring : null,
          locks: ls ? ls.locks : null,
          inFlight: ls ? ls.inFlight : null,
          stock: ls ? ls.stock : null,
        });
      }
    }
    const finalStock = window.__lockState ? window.__lockState().stock : null;
    return {
      firstLockTick,
      firstLaunchTick,
      maxLocks,
      lockTickCount,
      acquiringTicks,
      finalStock,
      log,
    };
  }, { ticks, JITTER: args.jitter });

  console.log(JSON.stringify({ seed: args.seed, secs: args.secs, ...out, errors }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

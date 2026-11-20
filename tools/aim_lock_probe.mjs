// aim_lock_probe.mjs — NAIVE AIM-AND-FIRE test for the missile lock.
//
// The demo weave is the pessimal case for a longer acquire (the sight never
// rests on a target). This probe instead flies the way a player who WANTS a
// missile flies: pick an on-screen enemy, steer the sight onto it with a
// proportional controller, hold the missile button until the lock takes, and
// RELEASE to fire. It reports how long the lock takes to form, whether
// missiles actually launch, and — the question the owner's complaint actually
// asks — whether the aircraft the pilot designated is the aircraft that dies.
//
// R40b CHANGED THE FIRE MODEL AND THIS PROBE WAS THE INSTRUMENT MISMATCH.
// Until R41 the pilot HELD the missile button for the whole run and never let
// go. Under R25's gather-timeout that still fired (a held button auto-launched
// after 0.35 s); under R40b's owner-requested HOLD-to-lock / RELEASE-to-fire it
// fires nothing, and the probe reported **0 launches** on a build whose missile
// works by hand. A guard that cannot press the button the way the game is
// played cannot gate the game. The pilot below now runs a release cadence.
//
// THE HEADLINE NUMBER IS `designatedKillRate`, not the launch count. Launch
// count says a missile left the rail; it says nothing about whether aiming
// chose the victim, which is the whole content of "aiming is bad". The pilot
// records the id of the aircraft it was pointing at when it released, and the
// kill ledger (`__killDrain`, R41 added `id`) says which aircraft actually
// died. See judging/R41/aiming2/NOTES.md.
//
// Usage: node tools/aim_lock_probe.mjs [--seed N] [--secs S] [--jitter J]
//                                      [--url-params "..."]
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
    // --- the release cadence -------------------------------------------------
    // How long the pilot will hold hoping for a lock before giving up and
    // releasing anyway. A player does not hold forever; 1.5 s is ~3.5 acquire
    // beats, generous without being a camp.
    const HOLD_MAX_TICKS = 90;
    // Ticks the button stays UP after a release. The fire is edge-triggered on
    // release, so this only has to be long enough to be unambiguous.
    const RELEASE_TICKS = 6;

    const log = [];
    let firstLockTick = null;
    let firstLaunchTick = null;
    let maxLocks = 0;
    let lockTickCount = 0; // ticks with >=1 completed lock held
    let acquiringTicks = 0; // ticks with an acquisition in progress
    let hits = 0; // missiles that detonated inside the fuse radius
    let crossings = 0; // missiles that reached their target's depth (hit OR miss)
    let totalRetired = 0; // all retired missiles (crossings + expired/notarget)
    let launches = 0; // RELEASES that actually consumed stock
    let releases = 0; // release beats, fired or not
    // Designated-target conversion. On each release the pilot writes down the
    // id it was aiming at; a kill of that id within the window below counts.
    const DESIGNATE_WINDOW_S = 4.0;
    const designated = []; // { id, tRelease, span, depth }
    let designatedKills = 0;
    let designatedExpired = 0;
    // R41: how FAR OUT the missile's victims die, so a change to the lockable
    // depth window reports what it moved instead of only what it improved.
    const missileKillSpans = [];
    const missileKillDepths = [];

    let holding = false;
    let holdTicks = 0;
    let releaseTicks = 0;
    let prevStock = null;

    for (let i = 0; i < ticks; i++) {
      const stats = window.__combatStats ? window.__combatStats() : null;
      const sight = window.__sight ? window.__sight() : null;
      // Pick the on-screen enemy NEAREST THE SIGHT — this is a pilot that aims,
      // and the probe's whole job is to price aiming. (It used to pick the
      // depth-nearest, which on this build is a blob at depth ~4 that fills the
      // screen beside the nose; chasing it taught the probe nothing about aim.)
      let target = null;
      let targetD2 = Infinity;
      if (stats && stats.enemies && sight) {
        for (const e of stats.enemies) {
          if (!e.onScreen) continue;
          const dx = (e.ndcX - sight.ndcX) * 0.5;
          const dy = (e.ndcY - sight.ndcY) * 0.5 * (224 / 320);
          const d2 = dx * dx + dy * dy;
          if (d2 < targetD2) {
            targetD2 = d2;
            target = e;
          }
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

      // Button state for THIS tick. Hold until a lock takes (plus a beat so a
      // second lock can join the salvo), or until patience runs out; then
      // release for RELEASE_TICKS.
      const lsPre = window.__lockState ? window.__lockState() : null;
      if (releaseTicks > 0) {
        holding = false;
        releaseTicks--;
      } else if (!holding) {
        holding = true;
        holdTicks = 0;
      } else {
        holdTicks++;
        const haveLock = lsPre && lsPre.locks > 0;
        if (haveLock || holdTicks >= HOLD_MAX_TICKS) {
          // Release on the NEXT tick, recording what we were pointing at.
          holding = false;
          releaseTicks = RELEASE_TICKS;
          releases++;
          if (target) {
            designated.push({
              id: target.id,
              tRelease: stats ? stats.simTime : 0,
              span: target.spanFrac,
              depth: target.depth,
              lockHeld: !!haveLock,
            });
          }
        }
      }

      window.__setStick({ x: sx, y: sy, missile: holding, throttleIndex: 1 });
      window.__step(1);

      const ls = window.__lockState ? window.__lockState() : null;
      if (ls) {
        if (ls.locks > 0 && firstLockTick === null) firstLockTick = i;
        if (ls.locks > maxLocks) maxLocks = ls.locks;
        if (ls.locks > 0) lockTickCount++;
        if (ls.acquiring !== null) acquiringTicks++;
        if (ls.inFlight > 0 && firstLaunchTick === null) firstLaunchTick = i;
        // Stock is the unambiguous launch counter: the salvo decrements it once
        // per missile, and nothing else touches it in flight.
        if (prevStock !== null && ls.stock < prevStock) launches += prevStock - ls.stock;
        prevStock = ls.stock;
      }
      // Drain the missile outcome ledger each tick so a long run cannot hit
      // the 2048 cap; accumulate hit/crossing/launch counts. Each row that
      // reached a depth crossing has lat !== null; `hit` is the fuse result.
      if (window.__missileDrain) {
        const rows = window.__missileDrain();
        for (const r of rows) {
          totalRetired++;
          if (r.hit) hits++;
          if (r.lat !== null && r.lat !== undefined) crossings++;
        }
      }
      // Did anything we designated die? Drain the kill ledger and match on id.
      if (window.__killDrain) {
        const { kills } = window.__killDrain();
        for (const k of kills) {
          if (k.src === 'missile') {
            missileKillSpans.push(k.span);
            missileKillDepths.push(k.d);
          }
          for (let j = designated.length - 1; j >= 0; j--) {
            if (designated[j].id === k.id) {
              designatedKills++;
              designated.splice(j, 1);
              break;
            }
          }
        }
      }
      const now = window.__combatStats ? window.__combatStats().simTime : 0;
      for (let j = designated.length - 1; j >= 0; j--) {
        if (now - designated[j].tRelease > DESIGNATE_WINDOW_S) {
          designatedExpired++;
          designated.splice(j, 1);
        }
      }

      if (i % 30 === 0 || (ls && ls.locks > 0 && log.length < 40)) {
        log.push({
          t: i,
          sight: sight ? [Number(sight.ndcX.toFixed(2)), Number(sight.ndcY.toFixed(2))] : null,
          tgt: target
            ? [Number(target.ndcX.toFixed(2)), Number(target.ndcY.toFixed(2)), Number(target.depth.toFixed(1))]
            : null,
          hold: holding,
          acq: ls ? ls.acquiring : null,
          locks: ls ? ls.locks : null,
          inFlight: ls ? ls.inFlight : null,
          stock: ls ? ls.stock : null,
        });
      }
    }
    // Final drain to catch any missiles retired on the last tick.
    if (window.__missileDrain) {
      const rows = window.__missileDrain();
      for (const r of rows) {
        totalRetired++;
        if (r.hit) hits++;
        if (r.lat !== null && r.lat !== undefined) crossings++;
      }
    }
    const finalStock = window.__lockState ? window.__lockState().stock : null;
    const resolved = designatedKills + designatedExpired;
    const med = (xs) => {
      if (!xs.length) return null;
      const a = xs.slice().sort((p, q) => p - q);
      return Number(a[Math.floor(a.length / 2)].toFixed(4));
    };
    return {
      firstLockTick,
      firstLaunchTick,
      maxLocks,
      lockTickCount,
      acquiringTicks,
      releases,
      launches,
      hits,
      crossings,
      totalRetired,
      // HIT RATE on a locked target: of the missiles that reached their
      // target's depth (a real engagement), how many detonated inside the
      // fuse radius. `hitRateAll` divides by every retired missile instead.
      hitRateCrossings: crossings ? Number((hits / crossings).toFixed(3)) : null,
      hitRateAll: totalRetired ? Number((hits / totalRetired).toFixed(3)) : null,
      // THE ONE THAT MATTERS: of the aircraft this pilot was pointing at when
      // it pulled the trigger, how many died within DESIGNATE_WINDOW_S.
      designatedReleases: resolved,
      designatedKills,
      designatedKillRate: resolved ? Number((designatedKills / resolved).toFixed(3)) : null,
      missileKills: missileKillSpans.length,
      // Median drawn size and depth of a missile victim: "how big was the thing
      // I killed, on my screen, when it died".
      medianMissileKillSpan: med(missileKillSpans),
      medianMissileKillDepth: med(missileKillDepths),
      finalStock,
      log,
    };
  }, { ticks, JITTER: args.jitter });

  console.log(JSON.stringify({ seed: args.seed, secs: args.secs, ...out, errors }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

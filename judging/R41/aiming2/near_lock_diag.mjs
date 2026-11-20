#!/usr/bin/env node
// R41 aiming2 — WHY DOES THE BIG ENEMY ON MY NOSE NEVER BRACKET?
//
// Diagnosis instrument for one reproduced complaint, not a gate. It flies the
// naive policy the owner flies — put the sight on the BIGGEST aircraft on
// screen, hold the missile button — and for every tick records, for that
// aircraft: its drawn span, its depth, its screen distance to the sight, and
// which of the lock's three admissibility clauses (depth-near, depth-far,
// cone) it fails. Then it reports what the system bracketed INSTEAD.
//
// Everything is read from __combatStats()/__sight()/__lockState(), the live
// hooks — no constant is read from a source comment (MEMORY: comments preserve
// stale derivations). The depth window is read from the module itself.
//
// Usage: node judging/R41/aiming2/near_lock_diag.mjs --seed 7 --secs 25

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))));

function parseArgs(argv) {
  const a = { seed: 7, secs: 25, urlParams: '' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--seed') a.seed = Number(argv[++i]);
    else if (argv[i] === '--secs') a.secs = Number(argv[++i]);
    else if (argv[i] === '--url-params') a.urlParams = argv[++i];
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const url = new URL(`http://127.0.0.1:${port}/`);
  const search = new URLSearchParams(args.urlParams);
  search.set('fixed', '1');
  search.set('seed', String(args.seed));
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
    await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });

    const out = await page.evaluate(async (secs) => {
      // The depth window and the cone come from the live module, not a comment.
      const mod = await import('/src/weapons/lockSystem.js');
      // Not exported — read the behaviour instead: ask the live LockSystem.
      const combatWin = window;
      const rows = [];
      const gunKills = [];
      const ticks = Math.round(secs * 60);
      let aimX = 0;
      let aimY = 0;
      for (let t = 0; t < ticks; t++) {
        const st = combatWin.__combatStats();
        const sight = combatWin.__sight();
        // NAIVE POLICY: steer toward the biggest aircraft on screen.
        let big = null;
        for (const e of st.enemies) {
          if (!e.onScreen) continue;
          if (!big || e.spanFrac > big.spanFrac) big = e;
        }
        if (big && sight) {
          const dx = big.ndcX - sight.ndcX;
          const dy = big.ndcY - sight.ndcY;
          aimX = Math.max(-1, Math.min(1, dx * 6));
          aimY = Math.max(-1, Math.min(1, dy * 6));
        } else {
          aimX = 0;
          aimY = 0;
        }
        const designatedId = big ? big.id : null;
        combatWin.__setStick({ x: aimX, y: aimY, fire: true, missile: true });
        combatWin.__step(1);

        // GUN ACCOUNTING. The naive hand points at the biggest aircraft and
        // presses the trigger; the question is whether THAT aircraft is what
        // dies. Kills carry their victim's id (R41) and the sight's position on
        // the tick of the kill, so "did I kill what I aimed at" and "how far
        // from my crosshair did it die" are both reads.
        if (combatWin.__killDrain) {
          const { kills } = combatWin.__killDrain();
          for (const k of kills) {
            if (k.src !== 'vulcan' && k.src !== 'gun') continue;
            const dx = (k.ndcX - k.sightX) * 0.5;
            const dy = (k.ndcY - k.sightY) * 0.5 * (224 / 320);
            gunKills.push({
              dist: Math.sqrt(dx * dx + dy * dy),
              span: k.span,
              wasDesignated: designatedId != null && k.id === designatedId,
            });
          }
        }

        const st2 = combatWin.__combatStats();
        const s2 = combatWin.__sight();
        const ls = combatWin.__lockState ? combatWin.__lockState() : null;
        if (!s2) continue;
        let b = null;
        for (const e of st2.enemies) {
          if (!e.onScreen) continue;
          if (!b || e.spanFrac > b.spanFrac) b = e;
        }
        if (!b) continue;
        const dist = (e) => {
          const dx = (e.ndcX - s2.ndcX) * 0.5;
          const dy = (e.ndcY - s2.ndcY) * 0.5 * (224 / 320);
          return Math.sqrt(dx * dx + dy * dy);
        };
        const tracked = st2.enemies.find((e) => e.id === st2.trackedId) || null;
        rows.push({
          t,
          bigSpan: b.spanFrac,
          bigDepth: b.depth,
          bigDist: dist(b),
          trackedSpan: tracked ? tracked.spanFrac : null,
          trackedDepth: tracked ? tracked.depth : null,
          trackedDist: tracked ? dist(tracked) : null,
          isBigTracked: tracked ? tracked.id === b.id : false,
          locks: st2.locks,
          nOnScreen: st2.enemies.filter((e) => e.onScreen).length,
        });
      }
      return { rows, gunKills, mod: Object.keys(mod) };
    }, args.secs);

    const rows = out.rows;
    const n = rows.length;
    const close = rows.filter((r) => r.bigSpan >= 0.10); // a real aircraft, not a speck
    const closeTracked = close.filter((r) => r.isBigTracked);
    const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : 'n/a');
    const med = (xs) => {
      if (!xs.length) return null;
      const s = xs.slice().sort((a, b) => a - b);
      return Number(s[Math.floor(s.length / 2)].toFixed(3));
    };

    console.log(JSON.stringify({
      seed: args.seed,
      secs: args.secs,
      ticks: n,
      ticksWithRealAircraftOnScreen: close.length,
      // THE HEADLINE: when a real (>=10 %W) aircraft is the thing I am pointing
      // at, how often is it the thing the game brackets?
      bigIsTracked: pct(closeTracked.length, close.length),
      medianBigSpan: med(close.map((r) => r.bigSpan)),
      medianBigDepth: med(close.map((r) => r.bigDepth)),
      medianBigDistToSight: med(close.map((r) => r.bigDist)),
      // What it bracketed instead, on the ticks it ignored my target:
      medianTrackedSpanWhenNotBig: med(
        close.filter((r) => !r.isBigTracked && r.trackedSpan != null).map((r) => r.trackedSpan)
      ),
      medianTrackedDepthWhenNotBig: med(
        close.filter((r) => !r.isBigTracked && r.trackedDepth != null).map((r) => r.trackedDepth)
      ),
      medianTrackedDistWhenNotBig: med(
        close.filter((r) => !r.isBigTracked && r.trackedDist != null).map((r) => r.trackedDist)
      ),
      ticksNothingTracked: close.filter((r) => r.trackedSpan == null).length,
      // GUN: did the aircraft I was pointing at die, and how far from the
      // crosshair did the gun's kills actually land?
      gunKills: out.gunKills.length,
      gunKillsOnDesignated: pct(
        out.gunKills.filter((k) => k.wasDesignated).length,
        out.gunKills.length
      ),
      medianGunKillDistFromSight: med(out.gunKills.map((k) => k.dist)),
      medianGunKillSpan: med(out.gunKills.map((k) => k.span)),
      maxLocks: Math.max(0, ...rows.map((r) => r.locks)),
      errors: errors.length,
    }, null, 2));
    if (errors.length) {
      for (const e of errors) console.error(' ', e);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

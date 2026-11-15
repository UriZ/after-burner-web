#!/usr/bin/env node
// R16 FIRST-LOCK DISCOVERABILITY probe — the naive pilot, not the tracker.
//
// The R13/R15 lock probes model either a PERFECT tracker (sight glued to the
// bait's exact ndc every tick — over-reads ~10×) or a BLIND stick. Neither is
// the pilot the R15 judge got stuck as: a NEW player who sees enemies up high,
// climbs TOWARD them, holds the missile, and does NOT know that a full climb
// OVERSHOOTS the lockable band (sight +0.76 sails over bait at ndcY 0.44–0.58).
// The judge flew ~15 empty passes before discovering "ease up gently, park
// mid-height." This probe measures exactly that discoverability failure so a
// fix can be shown to close it.
//
// POLICIES (missile held throughout; released briefly to fire a salvo):
//   up    : x=0, y=CLIMB held. The purest "go up to them" instinct — no
//           lateral aim at all. Hardest case; this is closest to the judge's
//           full-climb-and-overshoot.
//   climb : x steered COARSELY toward the horizontal centroid of the lockable
//           cluster (a human can see where the cluster is, left/right), y=CLIMB
//           held. Models "climb toward the enemies." The vertical overshoot is
//           the only skill gap left — exactly the gap under test. It uses the
//           cluster's centroid x only (coarse), never an individual enemy's
//           exact ndc for the fine lock, so it does NOT over-read like the
//           tracker. CLIMB defaults to 0.9 (a strong, naive climb).
//   blind : control — stick centred, missile cycled. MUST still get ~0 locks
//           (blind protection; bait sits above the rest cone).
//
// METRICS (what "discoverable" means, operationalised):
//   firstLockTick     : tick the first lock EVER forms (null if never). /60 = s.
//   passesToFirstLock : # of distinct lockable-cluster appearances ("passes")
//                       the pilot flew through BEFORE the first lock formed. A
//                       "pass" is a contiguous run of ticks with >=1 lockable
//                       candidate on screen, separated by >=0.5 s empty gaps.
//                       THIS is the judge's "~15 empty passes" number.
//   salvos, maxLocks  : as the other probes, for regression context.
//   lockablePasses    : total passes in the run (denominator).
//
// A/B a change with NO rebuild via ?pace= (bait geometry is baked, so the real
// before/after needs the two trees — git show HEAD:spawner.js — but ?pace=
// baitevery/burstevery isolate contributions). Invincible: this measures
// WEAPON reachability, not survival; the hand playtest (non-invincible) is the
// feel gate and outranks this. The probe over-reads vs a human hand ~10× on
// RATE; read the DIRECTION and the passes-to-first-lock, not the absolute rate.

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };

const SEED = arg('--seed', '7');
const PACE = arg('--pace', '');
const GUN = arg('--gun', '');
const TICKS = Number(arg('--ticks', '5400')); // 90 s at 60 Hz
const POLICY = arg('--policy', 'climb'); // up | climb | blind
const CLIMB = Number(arg('--climb', '0.9')); // naive climb magnitude (0..1)

const LOCK_DEPTH_MIN = 16;
const LOCK_DEPTH_MAX = 88;

async function boot(urlParams) {
  const server = await createServer({
    root: ROOT, configFile: path.join(ROOT, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const url = new URL('/', `http://127.0.0.1:${port}/`);
  const search = new URLSearchParams(urlParams);
  search.set('fixed', '1');
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
  const params = `seed=${SEED}&invincible=1` + (PACE ? `&pace=${PACE}` : '') + (GUN ? `&gun=${GUN}` : '');
  const { server, browser, page, errors } = await boot(params);

  const result = await page.evaluate(
    async (TICKS, POLICY, CLIMB, LOCK_DEPTH_MIN, LOCK_DEPTH_MAX) => {
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      let maxLocks = 0;
      let salvos = 0;
      let firstLockTick = null;
      let prevStock = null;

      // "pass" accounting: a pass is a contiguous run with >=1 lockable
      // candidate, separated by >= GAP empty ticks.
      const GAP = 30; // 0.5 s of empty sky ends a pass
      let inPass = false;
      let emptyRun = 0;
      let lockablePasses = 0;
      let passesBeforeFirstLock = 0;
      let holdFor = 0;

      for (let i = 0; i < TICKS; i++) {
        const s = window.__combatStats();
        const enemies = s ? s.enemies : [];
        const cand = enemies.filter((e) => e.depth >= LOCK_DEPTH_MIN && e.depth <= LOCK_DEPTH_MAX);

        // pass bookkeeping
        if (cand.length > 0) {
          emptyRun = 0;
          if (!inPass) { inPass = true; lockablePasses++; if (firstLockTick == null) passesBeforeFirstLock++; }
        } else {
          emptyRun++;
          if (inPass && emptyRun >= GAP) inPass = false;
        }

        let stick = { x: 0, y: 0, missile: false, fire: true };

        if (POLICY === 'blind') {
          holdFor += 1;
          stick.y = 0;
          stick.missile = holdFor % 66 < 60;
        } else {
          // naive climb: y held at CLIMB (the overshoot is the point).
          stick.y = CLIMB;
          if (POLICY === 'climb' && cand.length) {
            // coarse lateral steer toward the cluster centroid (a human sees
            // left/right). NO per-enemy exact-ndc vertical aim.
            let cx = 0;
            for (const e of cand) cx += e.ndcX;
            cx /= cand.length;
            stick.x = clamp(cx * 4, -1, 1);
          }
          const locks = s ? s.locks : 0;
          // naive: fire when a couple of pips are up, or nothing left to lock.
          stick.missile = !(locks >= 2 || (locks >= 1 && cand.length === 0));
        }

        window.__setStick(stick);
        window.__step(1);

        const s2 = window.__combatStats();
        if (s2) {
          maxLocks = Math.max(maxLocks, s2.locks);
          if (firstLockTick == null && s2.locks > 0) firstLockTick = i;
          if (prevStock != null && s2.missileStock < prevStock) salvos += 1;
          prevStock = s2.missileStock;
        }
      }

      return {
        firstLockTick,
        firstLockSec: firstLockTick == null ? null : +(firstLockTick / 60).toFixed(1),
        passesToFirstLock: firstLockTick == null ? null : passesBeforeFirstLock,
        lockablePasses, salvos, maxLocks,
      };
    },
    TICKS, POLICY, CLIMB, LOCK_DEPTH_MIN, LOCK_DEPTH_MAX
  );

  await browser.close();
  await server.close();
  console.log(JSON.stringify({ seed: SEED, pace: PACE || '(default)', gun: GUN || '(default)', policy: POLICY, climb: CLIMB, ticks: TICKS, ...result, pageErrors: errors.slice(0, 5) }, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });

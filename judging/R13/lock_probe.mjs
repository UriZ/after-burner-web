#!/usr/bin/env node
// R13 lock/salvo reachability probe — the blind-vs-aiming control the method
// requires (lockSystem.js's note), run on the NEW routing.
//
// The R12 judge's rank-1 finding was that a lock only forms by pinning the
// sight to the horizon strip and waiting. R13 routes lock-bait clusters that
// HOLD at a reachable posture (spawner._lockBaitWave + enemy.js loiter). This
// probe asks the two questions that decides whether that worked:
//
//   1. AIMING pilot: a closed-loop controller that drives the sight onto the
//      nearest lockable-depth enemy and holds the missile, releasing to salvo.
//      Does it now get locks and missile KILLS in normal play?
//   2. BLIND pilot: stick centred, missile cycled hold/release. Does a
//      do-nothing pilot STILL fail to rack up locks/missiles (the R11/R12
//      gain that must not regress)?
//
// Both run under ?invincible=1 so the measurement is of WEAPON reachability,
// not of how fast seed 7 kills you — the same isolation demo=2 uses. The feel
// pass (tools/playtest.mjs, non-invincible) is separate and outranks this.
//
// Determinism: fixed-step, seeded; the controller reads only sim telemetry
// (__combatStats enemies in the pitch-only basis, __fairness().playerNdc in
// the SAME basis — reach_probe.mjs's note on the two NDC bases applies). It
// touches no RNG that the sim reads (killCounts is cumulative; __combatStats
// and __fairness touch no RNG, unlike __combatDebug).

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const SEED = arg('--seed', '7');
const PACE = arg('--pace', ''); // e.g. baitevery=1
const GUN = arg('--gun', ''); // e.g. assistrad=0.09 (combat.js tunable)
const TICKS = Number(arg('--ticks', '5400')); // 90 s at 60 Hz
const POLICY = arg('--policy', 'aim'); // aim | blind

const SIGHT_Y_OFFSET = 0.30; // combat.js SIGHT_NDC_Y_OFFSET
const LOCK_DEPTH_MIN = 16;
const LOCK_DEPTH_MAX = 88;

async function boot(urlParams) {
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
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

// KNOWN-INPUT CONTROL (CLAUDE.md: validate the instrument before trusting a
// number). The whole R13 result rests on the enemy.js LOITER actually freezing
// a target in the lock band. This boots with baitevery=1, follows every enemy's
// depth over 6 s, and asserts that at least one aircraft held its depth within
// a tight band (a true freeze, not a slow pass) for >= 0.5 s while inside the
// lockable depth window — and that the SAME run with the loiter disabled shows
// no such freeze. If this fails, no lock number below is trustworthy.
async function selftest() {
  const watchHolds = async (pace) => {
    const { server, browser, page, errors } = await boot(`seed=7&invincible=1&pace=${pace}`);
    const held = await page.evaluate(async (LOCK_DEPTH_MIN, LOCK_DEPTH_MAX) => {
      const last = new Map(); // id -> {depth, stableTicks}
      let maxStableInBandS = 0;
      for (let i = 0; i < 1200; i++) { // 20 s
        window.__setStick({ x: 0, y: 0 });
        window.__step(1);
        const s = window.__combatStats();
        const seen = new Set();
        for (const e of (s?.enemies ?? [])) {
          seen.add(e.id);
          const prev = last.get(e.id);
          const inBand = e.depth >= LOCK_DEPTH_MIN && e.depth <= LOCK_DEPTH_MAX;
          if (prev && Math.abs(e.depth - prev.depth) < 0.05 && inBand) {
            prev.stable += 1;
            maxStableInBandS = Math.max(maxStableInBandS, prev.stable / 60);
          } else if (prev) {
            prev.stable = 0;
          }
          last.set(e.id, { depth: e.depth, stable: prev ? prev.stable : 0 });
        }
        for (const id of [...last.keys()]) if (!seen.has(id)) last.delete(id);
      }
      return maxStableInBandS;
    }, LOCK_DEPTH_MIN, LOCK_DEPTH_MAX);
    await browser.close(); await server.close();
    return { held, errors };
  };

  const on = await watchHolds('baitevery=1');
  const off = await watchHolds('baitevery=0,dwellfrac=0,flyby=0');
  const pass1 = on.held >= 0.5;        // loiter freezes a target in-band
  const pass2 = off.held < 0.25;        // disabled: no such freeze
  const pass3 = on.errors.length === 0 && off.errors.length === 0;
  console.log(`selftest loiter: longest in-band freeze  ON=${on.held.toFixed(2)}s  OFF=${off.held.toFixed(2)}s`);
  console.log(`  ${pass1 ? 'PASS' : 'FAIL'}  loiter holds a target in the lock band >= 0.5 s`);
  console.log(`  ${pass2 ? 'PASS' : 'FAIL'}  disabling the loiter removes the freeze (< 0.25 s)`);
  console.log(`  ${pass3 ? 'PASS' : 'FAIL'}  zero page errors`);
  process.exit(pass1 && pass2 && pass3 ? 0 : 1);
}

async function run() {
  if (POLICY === 'selftest') return selftest();
  const params = `seed=${SEED}&invincible=1` + (PACE ? `&pace=${PACE}` : '') + (GUN ? `&gun=${GUN}` : '');
  const { server, browser, page, errors } = await boot(params);

  const result = await page.evaluate(
    async (TICKS, POLICY, SIGHT_Y_OFFSET, LOCK_DEPTH_MIN, LOCK_DEPTH_MAX) => {
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      let maxLocksSeen = 0;
      let salvos = 0;
      let missileLaunches = 0;
      let prevStock = null;
      let lockTickHistogram = { '0': 0, '1': 0, '2': 0, '3+': 0 };
      let ticksWithLockableInReach = 0;

      // release cadence for the blind pilot and a safety release for aim
      let holdFor = 0;

      const startCounts = { ...(window.__killDrain().counts) };

      for (let i = 0; i < TICKS; i++) {
        const s = window.__combatStats();
        const f = window.__fairness ? window.__fairness() : null;
        const p = f ? f.playerNdc : { x: 0, y: 0 };
        const enemies = s ? s.enemies : [];

        // lockable-depth candidates
        const cand = enemies.filter((e) => e.depth >= LOCK_DEPTH_MIN && e.depth <= LOCK_DEPTH_MAX);

        let stick = { x: 0, y: 0, missile: false, fire: false };

        if (POLICY === 'blind') {
          // stick centred; cycle missile hold ~1 s on, 0.1 s off to fire.
          holdFor += 1;
          const phase = holdFor % 66;
          stick.missile = phase < 60;
          stick.fire = true; // a full loadout, like the R11 'both' arm
        } else {
          // AIMING: pick nearest-depth lockable candidate; prefer one the sight
          // can actually reach (|desiredX| within the lateral rail ~0.197).
          let target = null;
          let bestD = Infinity;
          for (const e of cand) {
            const desiredX = e.ndcX;
            if (Math.abs(desiredX) > 0.22) continue; // beyond sight's lateral reach
            if (e.depth < bestD) { bestD = e.depth; target = e; }
          }
          if (target) ticksWithLockableInReach++;
          const aim = target ?? cand[0] ?? null;
          if (aim) {
            const desX = aim.ndcX;
            const desY = aim.ndcY - SIGHT_Y_OFFSET;
            const ex = desX - p.x;
            const ey = desY - p.y;
            stick.x = clamp(ex * 6, -1, 1);
            stick.y = clamp(ey * 6, -1, 1);
          }
          stick.fire = true;
          // Hold the missile while locks can still accumulate; release to fire
          // when the salvo is worth taking or there is nothing to lock.
          const locks = s ? s.locks : 0;
          const inFlight = s ? s.missilesInFlight : 0;
          if (locks >= 3 || (locks >= 1 && !aim)) {
            stick.missile = false; // release -> salvo
          } else {
            stick.missile = true;
          }
          void inFlight;
        }

        window.__setStick(stick);
        window.__step(1);

        const s2 = window.__combatStats();
        if (s2) {
          maxLocksSeen = Math.max(maxLocksSeen, s2.locks);
          const L = s2.locks;
          lockTickHistogram[L === 0 ? '0' : L === 1 ? '1' : L === 2 ? '2' : '3+']++;
          if (prevStock != null && s2.missileStock < prevStock) {
            missileLaunches += prevStock - s2.missileStock;
            salvos += 1;
          }
          prevStock = s2.missileStock;
        }
      }

      const endCounts = window.__killDrain().counts;
      const killsBy = {};
      for (const k of new Set([...Object.keys(startCounts), ...Object.keys(endCounts)])) {
        killsBy[k] = (endCounts[k] ?? 0) - (startCounts[k] ?? 0);
      }
      return { maxLocksSeen, salvos, missileLaunches, killsBy, lockTickHistogram, ticksWithLockableInReach };
    },
    TICKS, POLICY, SIGHT_Y_OFFSET, LOCK_DEPTH_MIN, LOCK_DEPTH_MAX
  );

  await browser.close();
  await server.close();

  console.log(JSON.stringify({ seed: SEED, pace: PACE || '(default)', ticks: TICKS, policy: POLICY, ...result, pageErrors: errors.slice(0, 5) }, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });

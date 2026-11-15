#!/usr/bin/env node
// R15 missile-CONVERSION probe. The R13 lock_probe's aim arm is a perfect
// tracker that holds the sight on the bait every tick — it over-reads, and it
// hides the actual human block: you cannot HOLD the vulnerable climb continuously
// under fire. This probe models a pilot who dips the sight onto the bait, then
// JINKS away to dodge, then dips back, holding the missile button throughout and
// releasing to fire — i.e. acquisition is BROKEN into sub-LOCK_ACQUIRE_S chunks.
//
// Policies (missile held except a brief release to fire; `fire` held = full loadout):
//   jink  : aim at the nearest in-reach lockable target for AIM ticks, then jink
//           off it for JINK ticks, repeating — the realistic dodging climber.
//   hold  : aim continuously (never jinks). The upper bound; fires regardless of
//           grace, so it isolates that the mechanism works at all.
//   blind : stick centred (bait sits above the rest cone). MUST stay ~0 salvos.
//   sweep : drags the sight steadily up/down across the sky, never settling.
//           R11 requires this pilot NOT to lock; grace must not change that.
//
// A/B the GRACE on one build: `--gun lockhold=0` is the pre-R15 reset (grace off);
// default is 1.2 s (LOCK_HOLD_S). NOTE: the key is `lockhold`, NOT `lockgrace` —
// `lockgrace=0` THROWS and the run times out with no numbers (R15 judge caught this).
// Correct-key A/B (R15 judge, peek pilot): salvos 34->42, locks/salvo 2->4, missile
// kills ~flat (18 vs 19). The grace mechanism is real; the earlier "18->32 (+78%)"
// in combat-asks.md was produced under the broken key and is withdrawn.
// Determinism/provenance identical to lock_probe.mjs (fixed-step, seeded,
// invincible; reads only sim telemetry).

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SEED = arg('--seed', '7');
const PACE = arg('--pace', '');
const GUN = arg('--gun', '');
const TICKS = Number(arg('--ticks', '5400')); // 90 s
const POLICY = arg('--policy', 'jink');
const AIM = Number(arg('--aim', '12'));   // ticks aiming per cycle (0.2 s)
const JINK = Number(arg('--jink', '18')); // ticks jinking per cycle (0.3 s)

const SIGHT_Y_OFFSET = 0.30;
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
  const search = new URLSearchParams(urlParams); search.set('fixed', '1');
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
    async (TICKS, POLICY, SIGHT_Y_OFFSET, LOCK_DEPTH_MIN, LOCK_DEPTH_MAX, AIM, JINK) => {
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      let salvos = 0, launches = 0, prevStock = null, maxLocks = 0, maxAcquire = 0;
      const startCounts = { ...(window.__killDrain().counts) };
      const cycle = AIM + JINK;
      let fireCountdown = 0;

      for (let i = 0; i < TICKS; i++) {
        const s = window.__combatStats();
        const f = window.__fairness ? window.__fairness() : null;
        const p = f ? f.playerNdc : { x: 0, y: 0 };
        const enemies = s ? s.enemies : [];
        const cand = enemies.filter(
          (e) => e.depth >= LOCK_DEPTH_MIN && e.depth <= LOCK_DEPTH_MAX && Math.abs(e.ndcX) <= 0.22
        );
        let target = null, bestD = Infinity;
        for (const e of cand) if (e.depth < bestD) { bestD = e.depth; target = e; }

        let stick = { x: 0, y: 0, missile: true, fire: true };
        let fireThisTick = (i % 90 === 89); // default ~1.5 s release cadence

        if (POLICY === 'blind') {
          stick.x = 0; stick.y = 0;
        } else if (POLICY === 'sweep') {
          // CONSTANT-VELOCITY vertical sweep (triangle wave), never settling on a
          // target — the R11 adversary. A sinusoid pauses at its turnarounds and
          // dwells, which is tracking, not sweeping; this holds |dy/dt| constant.
          const ph = (i % 120) / 120 * 4; // 0..4
          stick.y = ph < 2 ? ph - 1 : 3 - ph; // -1 -> +1 -> -1, constant speed
          stick.x = 0;
        } else if (POLICY === 'peek') {
          // THE HUMAN PATTERN the hold fix is for: climb into the band BRIEFLY to
          // grab a lock, then DROP to a safe low posture to dodge, then fire ~1 s
          // later. If the completed lock does not survive the target leaving
          // during the safe window, the release fires nothing.
          const PERIOD = 150; // 2.5 s per peek
          const ph = i % PERIOD;
          if (ph < 36 && target) {
            // climb and aim (0.6 s, long enough to complete a 0.22 s lock)
            stick.x = clamp((target.ndcX - p.x) * 6, -1, 1);
            stick.y = clamp((target.ndcY - SIGHT_Y_OFFSET - p.y) * 6, -1, 1);
          } else {
            // drop to a safe, low posture (sight out of the lock band)
            stick.x = 0; stick.y = -0.8;
          }
          // fire ~1 s after the climb ends — the lock must have survived the drop
          fireThisTick = (ph === 96);
        } else {
          // jink | hold: aim at the target; jink drops off it on a duty cycle.
          const aiming = POLICY === 'hold' || (i % cycle) < AIM;
          if (aiming && target) {
            stick.x = clamp((target.ndcX - p.x) * 6, -1, 1);
            stick.y = clamp((target.ndcY - SIGHT_Y_OFFSET - p.y) * 6, -1, 1);
          } else if (!aiming) {
            // jink: shove the sight well off the target to dodge.
            stick.x = (i % (2 * cycle) < cycle) ? -0.9 : 0.9;
            stick.y = -0.6;
          }
        }

        // Release the missile button briefly to fire whatever has accumulated.
        if (fireCountdown > 0) { stick.missile = false; fireCountdown -= 1; }
        if (fireThisTick) fireCountdown = 2;

        window.__setStick(stick);
        window.__step(1);

        const ls = window.__lockState ? window.__lockState() : null;
        if (ls) {
          maxLocks = Math.max(maxLocks, ls.locks);
          if (typeof ls.acquiring === 'number') maxAcquire = Math.max(maxAcquire, ls.acquiring);
          if (prevStock != null && ls.stock < prevStock) { launches += prevStock - ls.stock; salvos += 1; }
          prevStock = ls.stock;
        }
      }

      const endCounts = window.__killDrain().counts;
      const killsBy = {};
      for (const k of new Set([...Object.keys(startCounts), ...Object.keys(endCounts)])) {
        killsBy[k] = (endCounts[k] ?? 0) - (startCounts[k] ?? 0);
      }
      return { salvos, launches, maxLocks, maxAcquire: +maxAcquire.toFixed(4), killsBy };
    },
    TICKS, POLICY, SIGHT_Y_OFFSET, LOCK_DEPTH_MIN, LOCK_DEPTH_MAX, AIM, JINK
  );
  await browser.close(); await server.close();
  console.log(JSON.stringify({ seed: SEED, pace: PACE || '(default)', gun: GUN || '(default)', policy: POLICY, aim: AIM, jink: JINK, ...result, pageErrors: errors.slice(0, 3) }, null, 2));
}
run().catch((e) => { console.error(e); process.exit(1); });

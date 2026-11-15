#!/usr/bin/env node
// R14 GUN aim-vs-blind control — the instrument the rank-1 gap needs and that
// R13's lock_probe could not provide.
//
// lock_probe.mjs's "aim" policy drives the sight onto the LOCKABLE-DEPTH band
// (16..88) for the missile, so it measures missile reachability and reads the
// GUN only incidentally — in the R14 baseline it got FEWER gun kills than a
// dead-centre stick (aim 13-17 vs blind 21), because it spends the stick on
// the far missile traffic while the blind sight sits in the near gun traffic.
// That is the wrong control for "does aiming the GUN cause gun kills".
//
// This probe isolates the GUN: both arms hold the trigger and fire NO missiles
// (missile button never pressed), so the only difference between the arms is
// where the sight points.
//
//   blind   : stick centred. The do-nothing pilot. Its gun kills are the ones
//             the traffic hands to a sight that never moves.
//   gunaim  : a closed-loop controller that drives the sight onto the nearest
//             READABLE enemy within the player's lateral reach and holds it
//             there. The perfect-tracking upper bound on an aiming pilot's gun.
//
// The gap is closed when gunaim clearly out-kills blind on the gun. It is still
// open while blind >= gunaim (a centred net catches whatever an aimer could).
//
// CAVEAT, stated up front (R13 judge): a perfect-tracking controller OVER-READS
// human play — the R13 judge measured the R13 aim probe at ~10x a human's rate.
// So gunaim is an UPPER BOUND and blind is the trustworthy arm; the headline
// the round runs on is the human agent-playtest, and this probe's job is to
// show the DIRECTION (does aiming the gun beat not aiming) and to let the blind
// floor be tracked deterministically across a change.
//
// Determinism/provenance: fixed-step, seeded, ?invincible=1 (weapon
// reachability, not seed-7 lethality). Controller reads only sim telemetry
// (__combatStats, __fairness) in the pitch-only NDC basis; it touches no RNG
// the sim reads. Mirrors lock_probe.mjs's boot rules verbatim.

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
const PACE = arg('--pace', '');
const GUN = arg('--gun', '');
const TICKS = Number(arg('--ticks', '5400')); // 90 s at 60 Hz
const POLICY = arg('--policy', 'gunaim'); // gunaim | blind | selftest

const SIGHT_Y_OFFSET = 0.30; // combat.js SIGHT_NDC_Y_OFFSET
const READABLE_SPAN = 0.10; // combat.js READABLE_SPAN_FRAC — the gun's own gate
// Lateral half-width a player can bring the sight onto: the measured NDC rail
// (ENVELOPE_X 0.733 -> +-0.2027, spawner.js) plus the assist/hit reach. Kept a
// touch under the spawner's ENGAGEABLE_HALF (0.3687) so the controller does not
// chase targets it could only clip at full deflection.
const REACH_X = 0.33;

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
// number). The controller claims it can drive the sight onto a target. This
// boots a run, and for every tick a readable target is within reach, records
// the screen distance between the SIGHT (playerNdc + 0.30 up) and that target.
// If the controller works, the median tracking error with a target present is
// small; a broken controller (wrong sign, wrong basis) leaves it large. Also
// asserts the blind arm's sight barely moves (its stick is centred).
async function selftest() {
  const measure = async (policy) => {
    const { server, browser, page, errors } = await boot(`seed=7&invincible=1`);
    const out = await page.evaluate(async (policy, SIGHT_Y_OFFSET, READABLE_SPAN, REACH_X) => {
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const errs = [];
      let sightTravel = 0; let prevSx = null;
      for (let i = 0; i < 1800; i++) { // 30 s
        const s = window.__combatStats();
        const f = window.__fairness ? window.__fairness() : null;
        const p = f ? f.playerNdc : { x: 0, y: 0 };
        const enemies = s ? s.enemies : [];
        const cand = enemies.filter((e) => e.spanFrac >= READABLE_SPAN && Math.abs(e.ndcX) <= REACH_X);
        let stick = { x: 0, y: 0, missile: false, fire: true };
        let target = null; let best = Infinity;
        for (const e of cand) { if (e.depth < best) { best = e.depth; target = e; } }
        if (policy === 'gunaim' && target) {
          const desX = target.ndcX;
          const desY = target.ndcY - SIGHT_Y_OFFSET;
          stick.x = clamp((desX - p.x) * 7, -1, 1);
          stick.y = clamp((desY - p.y) * 7, -1, 1);
        }
        window.__setStick(stick);
        window.__step(1);
        const f2 = window.__fairness ? window.__fairness() : null;
        const p2 = f2 ? f2.playerNdc : { x: 0, y: 0 };
        const sx = p2.x; const sy = p2.y + SIGHT_Y_OFFSET;
        if (prevSx != null) sightTravel += Math.abs(sx - prevSx);
        prevSx = sx;
        // tracking error against the still-nearest readable target after step
        const s2 = window.__combatStats();
        const c2 = (s2 ? s2.enemies : []).filter((e) => e.spanFrac >= READABLE_SPAN && Math.abs(e.ndcX) <= REACH_X);
        let t2 = null; let b2 = Infinity;
        for (const e of c2) { if (e.depth < b2) { b2 = e.depth; t2 = e; } }
        if (t2) {
          const dx = (t2.ndcX - sx) * 0.5;
          const dy = (t2.ndcY - sy) * 0.5 * (224 / 320);
          errs.push(Math.hypot(dx, dy));
        }
      }
      errs.sort((a, b) => a - b);
      const med = errs.length ? errs[Math.floor(errs.length / 2)] : null;
      return { medErr: med, nErr: errs.length, sightTravel };
    }, policy, SIGHT_Y_OFFSET, READABLE_SPAN, REACH_X);
    await browser.close(); await server.close();
    return { ...out, errors };
  };

  const aim = await measure('gunaim');
  const blind = await measure('blind');
  // gunaim should track: median sight-to-target error small (< 0.06 frac-width,
  // i.e. the sight is within ~one readable span of the target most of the time).
  const pass1 = aim.medErr != null && aim.medErr < 0.06;
  // blind's sight should barely travel vs gunaim's.
  const pass2 = blind.sightTravel * 3 < aim.sightTravel;
  const pass3 = aim.errors.length === 0 && blind.errors.length === 0;
  console.log(`selftest gunaim: median sight->target err = ${aim.medErr?.toFixed(4)} (n=${aim.nErr}), sightTravel ${aim.sightTravel.toFixed(1)}`);
  console.log(`selftest blind : sightTravel ${blind.sightTravel.toFixed(1)}`);
  console.log(`  ${pass1 ? 'PASS' : 'FAIL'}  gunaim holds the sight within 0.06 fracW of the nearest readable target`);
  console.log(`  ${pass2 ? 'PASS' : 'FAIL'}  blind sight travels < 1/3 of gunaim's`);
  console.log(`  ${pass3 ? 'PASS' : 'FAIL'}  zero page errors`);
  process.exit(pass1 && pass2 && pass3 ? 0 : 1);
}

async function run() {
  if (POLICY === 'selftest') return selftest();
  const params = `seed=${SEED}&invincible=1` + (PACE ? `&pace=${PACE}` : '') + (GUN ? `&gun=${GUN}` : '');
  const { server, browser, page, errors } = await boot(params);

  const result = await page.evaluate(
    async (TICKS, POLICY, SIGHT_Y_OFFSET, READABLE_SPAN, REACH_X) => {
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const startCounts = { ...(window.__killDrain().counts) };
      let ticksWithReadableInReach = 0;

      for (let i = 0; i < TICKS; i++) {
        const s = window.__combatStats();
        const f = window.__fairness ? window.__fairness() : null;
        const p = f ? f.playerNdc : { x: 0, y: 0 };
        const enemies = s ? s.enemies : [];

        // GUN ISOLATION: trigger held, missile NEVER pressed, on both arms.
        let stick = { x: 0, y: 0, missile: false, fire: true };

        // readable enemies within lateral reach
        const cand = enemies.filter((e) => e.spanFrac >= READABLE_SPAN && Math.abs(e.ndcX) <= REACH_X);
        if (cand.length) ticksWithReadableInReach++;

        if (POLICY === 'gunaim') {
          // nearest (smallest-depth) readable enemy within reach
          let target = null; let best = Infinity;
          for (const e of cand) { if (e.depth < best) { best = e.depth; target = e; } }
          if (target) {
            const desX = target.ndcX;
            const desY = target.ndcY - SIGHT_Y_OFFSET;
            stick.x = clamp((desX - p.x) * 7, -1, 1);
            stick.y = clamp((desY - p.y) * 7, -1, 1);
          }
        }
        // POLICY === 'blind' leaves the stick centred.

        window.__setStick(stick);
        window.__step(1);
      }

      const endCounts = window.__killDrain().counts;
      const killsBy = {};
      for (const k of new Set([...Object.keys(startCounts), ...Object.keys(endCounts)])) {
        killsBy[k] = (endCounts[k] ?? 0) - (startCounts[k] ?? 0);
      }
      return { killsBy, ticksWithReadableInReach };
    },
    TICKS, POLICY, SIGHT_Y_OFFSET, READABLE_SPAN, REACH_X
  );

  await browser.close();
  await server.close();

  console.log(JSON.stringify({ seed: SEED, pace: PACE || '(default)', gun: GUN || '(default)', ticks: TICKS, policy: POLICY, ...result, pageErrors: errors.slice(0, 5) }, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });

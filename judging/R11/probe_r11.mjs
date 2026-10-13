#!/usr/bin/env node
// R11 feel lane probe. Derived from tools/out/feel-r10/probe_r10.mjs (same vite
// + puppeteer boot, same one-tick-at-a-time discipline, same no-PRNG hooks).
//
// THREE DIFFERENCES FROM R10's, all of them things R10's critique asked for:
//
//  1. A `still` PILOT ARM. R10 ran `track` and `sweep`; `sweep` confounds "does
//     aiming pay" with "how many launches does a sweeping pilot get". The arm
//     that isolates the lock is a stick that is NEVER TOUCHED.
//  2. ONE TRIGGER CADENCE FOR EVERY ARM -- 40 ticks held, 5 released, so all
//     arms get the same 120 salvo opportunities in 90 s and the only thing
//     that differs is where the sight is pointing. (The missile fires on
//     RELEASE; a probe that holds the button never fires. R10's critique lost
//     three arms to exactly that and published it.)
//  3. `resp` traces the JET's ndc x AND the sight's, on consecutive ticks, with
//     the tree it ran against recorded in the output.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require2 = createRequire(import.meta.url);

// Walk up to the repo root rather than counting directories: this file is
// copied into judging/R11/ for the record and tools/out/feel-r11/ for use, and
// a hard-coded '../../..' is only right in one of those two places.
function repoRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(d, 'vite.config.js'))) return d;
    d = path.dirname(d);
  }
  return process.cwd();
}
const ROOT = repoRoot(path.dirname(fileURLToPath(import.meta.url)));

// Every arm this probe can fly. The dispatch below is a lookup, not an
// if/else chain with a fall-through, so adding a pilot means adding it here.
const PILOTS = ['still', 'track', 'reach', 'sweep'];
// R11b: WHICH WEAPONS THE ARM IS ALLOWED TO USE, and it is a first-class
// declaration because every kill statistic this lane published turned on it.
// `window.__setStick` defaults `fire` to FALSE, and the first version of this
// probe never set it -- so **every kill it could count was a missile kill by
// construction**, on arms presented as representing a player. The lane did say
// "the gun trigger is never pulled" beside its table, but stating a property is
// not the same as drawing its consequence: a pattern that is a GUN target reads
// as unengageable, and the envelope-cut "regression" was largely that.
// `both` is the default for anything claiming to represent a player.
const WEAPONS = ['both', 'missile', 'gun'];

function args() {
  const a = { mode: 'resp', out: null, params: 'invincible=1', seed: 3, root: ROOT, pilot: 'still',
              secs: 90, weapons: 'both' };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '--mode') a.mode = v[++i];
    else if (v[i] === '--out') a.out = v[++i];
    else if (v[i] === '--params') a.params = v[++i];
    else if (v[i] === '--seed') a.seed = Number(v[++i]);
    else if (v[i] === '--root') a.root = path.resolve(v[++i]);
    else if (v[i] === '--pilot') a.pilot = v[++i];
    else if (v[i] === '--secs') a.secs = Number(v[++i]);
    else if (v[i] === '--weapons') a.weapons = v[++i];
    else { console.error('unknown arg', v[i]); process.exit(2); }
  }
  // ----------------------------------------------------------------------
  // R11b -- A PILOT ARM MUST DECLARE WHAT IT ACTUALLY DID, AND AN UNKNOWN
  // NAME MUST NOT SILENTLY BECOME A DIFFERENT PILOT.
  //
  // The first version dispatched on `if track / else if sweep / else {x:0,y:0}`,
  // so **`--pilot reach` on a copy of this file without the `reach` branch ran
  // `still` and said `pilot: "reach"` in its own output.** That is exactly the
  // shape this repo has paid for before -- it does not error, it does not warn,
  // it returns plausible numbers, and it attributes them to an arm that never
  // ran. (tools/capture.mjs grew an unknown-flag guard in R10 for the same
  // reason, and this file did not inherit it.)
  //
  // WHAT HAPPENED, recorded so the fix is not mistaken for a numbers change:
  // the arm DID run in the lane's own measurements -- the recorded traces carry
  // 5 293 of 5 400 ticks with a non-zero stick against `still`'s 0 -- but the
  // copy published under judging/R11/ was taken BEFORE the branch was written,
  // so the published artefact could not reproduce the published numbers. Both
  // defects are fixed: the guard below, and the copy is re-synced.
  if (!PILOTS.includes(a.pilot)) {
    console.error(`unknown --pilot "${a.pilot}". Known: ${PILOTS.join(', ')}.`);
    console.error('Refusing to run rather than silently flying a different pilot.');
    process.exit(2);
  }
  if (!WEAPONS.includes(a.weapons)) {
    console.error(`unknown --weapons "${a.weapons}". Known: ${WEAPONS.join(', ')}.`);
    process.exit(2);
  }
  if (!a.out && a.mode !== 'selftest') { console.error('--out is REQUIRED (unique per caller)'); process.exit(2); }
  return a;
}

// --- selftest: the probe's own arithmetic on series with planted answers ----
function stats(series) {
  const d = [];
  for (let i = 1; i < series.length; i++) d.push(series[i] - series[i - 1]);
  const absd = d.map(Math.abs);
  const peak = Math.max(...absd);
  // FIRST tick within TIE of the peak, not indexOf(peak). With a pure rate
  // control every step is equal to within float noise and indexOf picks
  // whichever accumulation rounded highest -- the selftest caught exactly
  // that and reported "peaks on tick 60" for a model that peaks immediately.
  const TIE = 1e-9;
  let peakTick = 1;
  for (let i = 0; i < absd.length; i++) if (absd[i] >= peak - TIE) { peakTick = i + 1; break; }
  // t90 = first tick index at which |x - x0| >= 0.9 * |xEnd - x0|
  const x0 = series[0], xe = series[series.length - 1];
  let t90 = -1;
  for (let i = 1; i < series.length; i++) {
    if (Math.abs(series[i] - x0) >= 0.9 * Math.abs(xe - x0)) { t90 = i; break; }
  }
  return { steps: d, peakTick, peak, t90, final: xe };
}
function selftest() {
  let ok = 0, tot = 0;
  const chk = (n, c) => { tot++; if (c) ok++; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  // 1. first-order position lag: peak on tick 1
  let x = 0; const lag = [0];
  for (let i = 0; i < 60; i++) { x += (1 - x) * (1 - Math.exp(-6 / 60)); lag.push(x); }
  chk('position lag peaks on tick 1', stats(lag).peakTick === 1);
  // 2. R10's rate-with-mass model: peak LATER than tick 3
  let p = 0, vv = 0; const r = [0];
  for (let i = 0; i < 60; i++) { vv += (1 - vv) * (1 - Math.exp(-12 / 60)); p += vv / 60; r.push(p); }
  chk('rate+accel peaks after tick 3 (got ' + stats(r).peakTick + ')', stats(r).peakTick > 3);
  // 3. a PURE rate control (no mass) peaks on tick 1 and every step is equal
  const pure = [0]; for (let i = 0; i < 60; i++) pure.push(pure[i] + 1 / 60);
  const sp = stats(pure);
  chk('pure rate peaks on tick 1 (got ' + sp.peakTick + ') and all steps equal to 1e-12',
    sp.peakTick === 1 && Math.max(...sp.steps) - Math.min(...sp.steps) < 1e-12);
  // 4. t90 planted exactly
  const ramp = [0]; for (let i = 1; i <= 10; i++) ramp.push(i / 10);
  chk('t90 of a 10-tick linear ramp is tick 9 (got ' + stats(ramp).t90 + ')', stats(ramp).t90 === 9);
  // 5-7. THE GUARD ITSELF, because the defect it prevents is invisible by
  // construction: a silently-substituted pilot returns plausible numbers.
  // Re-invokes this file as a child process and checks the exit code.
  const { spawnSync } = require2('node:child_process');
  const self = fileURLToPath(import.meta.url);
  const run = (...argv) => spawnSync(process.execPath, [self, ...argv], { encoding: 'utf8' });
  const bad = run('--mode', 'combat', '--pilot', 'reaech', '--out', '/tmp/_pr11');
  chk('unknown --pilot exits non-zero (got ' + bad.status + ')', bad.status === 2);
  chk('unknown --pilot names the known set', /Known: still, track, reach, sweep/.test(bad.stderr));
  const badw = run('--mode', 'combat', '--pilot', 'reach', '--weapons', 'lasers', '--out', '/tmp/_pr11');
  chk('unknown --weapons exits non-zero (got ' + badw.status + ')', badw.status === 2);
  console.log(`probe_r11 selftest ${ok}/${tot}`);
  return ok === tot;
}

async function main() {
  const a = args();
  if (a.mode === 'selftest') process.exit(selftest() ? 0 : 1);
  await mkdir(a.out, { recursive: true });

  const server = await createServer({
    root: a.root,
    configFile: path.join(a.root, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const search = new URLSearchParams(a.params);
  search.set('fixed', '1');
  search.set('seed', String(a.seed));
  const url = `http://127.0.0.1:${port}/?${search.toString()}`;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const errors = [];
  const out = { url, mode: a.mode, root: a.root, pilot: a.pilot, seed: a.seed, rows: [], events: [], errors };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 672 });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

    const STICK = { n: { x: 0, y: 0 }, R: { x: 1, y: 0 }, L: { x: -1, y: 0 } };
    const read = async () => page.evaluate(() => {
      const f = window.__fairness ? window.__fairness() : null;
      const cs = window.__combatStats ? window.__combatStats() : null;
      return {
        px: f ? f.playerNdc.x : null, py: f ? f.playerNdc.y : null,
        sight: window.__sight ? window.__sight() : null,
        stock: cs ? cs.missileStock : null, inflight: cs ? cs.missilesInFlight : null,
        nlocks: cs ? cs.locks : null, nbrk: cs ? cs.brackets : null,
        lock: window.__lockState ? window.__lockState() : null,
      };
    });

    if (a.mode === 'resp') {
      // Every segment starts from a DETERMINISTIC zero-velocity position: a
      // rail. A rate model with no auto-centre has no other one.
      const script = [
        ['L', 240], ['n', 60],              // settle on the LEFT rail
        ['R', 40], ['n', 120],              // ONSET + release coast, mid-travel
        ['L', 240], ['n', 60],              // back to the left rail
        ['R', 240], ['n', 60],              // full rail -> rail traverse
        ['L', 240], ['n', 60],              // and back (reverse traverse)
        ['R', 20], ['L', 60], ['n', 60],    // MID-TRAVEL REVERSAL
      ];
      for (const [k, n] of script) {
        await page.evaluate((s) => window.__setStick(s), STICK[k]);
        out.events.push({ tick: out.rows.length, stick: k });
        for (let i = 0; i < n; i++) {
          await page.evaluate(() => window.__step(1));
          const r = await read();
          out.rows.push({ i: out.rows.length, k, px: r.px, py: r.py, sx: r.sight ? r.sight.ndcX : null });
        }
      }
    } else if (a.mode === 'combat') {
      const TOTAL = Math.round(a.secs * 60);
      const useGun = a.weapons === 'both' || a.weapons === 'gun';
      const useMissile = a.weapons === 'both' || a.weapons === 'missile';
      let stick = { x: 0, y: 0 };
      out.weapons = a.weapons;
      out.pilotBranchRan = a.pilot;   // audit field: what ACTUALLY flew
      for (let i = 0; i < TOTAL; i++) {
        const held = (i % 45) < 40;           // identical cadence in EVERY arm
        if (a.pilot === 'track') {
          stick = await page.evaluate(() => {
            const cs = window.__combatStats ? window.__combatStats() : null;
            const sg = window.__sight ? window.__sight() : null;
            if (!cs || !sg) return { x: 0, y: 0 };
            let best = null;
            for (const e of cs.enemies) {
              if (e.depth < 26 || e.depth > 88) continue;
              if (!best || e.depth < best.depth) best = e;
            }
            if (!best) return { x: 0, y: 0 };
            const cl = (v) => Math.max(-1, Math.min(1, v));
            return { x: cl((best.ndcX - sg.ndcX) * 3.0), y: cl((best.ndcY - sg.ndcY) * 3.0) };
          });
        } else if (a.pilot === 'reach') {
          // R11b. `track` is PURE PURSUIT: it always chases the nearest enemy,
          // even one the lateral envelope cannot reach. That policy is fine at
          // a +-34.93 %W envelope and wrong at the arcade's +-9.85, where it
          // saturates the stick against a rail and spends the engagement
          // chasing something it can never put the sight on -- so a drop in its
          // kills measures the POLICY as much as the build. This arm is the
          // control: track the nearest enemy that is actually REACHABLE
          // (inside the sight's own rail plus the lock cone), otherwise hold
          // centre and let the traffic come to you, which is what the arcade's
          // narrow envelope forces a human to do.
          stick = await page.evaluate(() => {
            const cs = window.__combatStats ? window.__combatStats() : null;
            const sg = window.__sight ? window.__sight() : null;
            if (!cs || !sg) return { x: 0, y: 0 };
            const REACH = (window.__reachNdcX ?? 0.197) + 0.166; // rail + cone
            let best = null;
            for (const e of cs.enemies) {
              if (e.depth < 26 || e.depth > 88) continue;
              if (Math.abs(e.ndcX) > REACH) continue;
              if (!best || e.depth < best.depth) best = e;
            }
            const cl = (v) => Math.max(-1, Math.min(1, v));
            if (!best) return { x: cl(-sg.ndcX * 3.0), y: 0 };
            return { x: cl((best.ndcX - sg.ndcX) * 3.0), y: cl((best.ndcY - sg.ndcY) * 3.0) };
          });
        } else if (a.pilot === 'sweep') {
          stick = { x: Math.sin(i / 70) * 0.8, y: 0.15 };
        } else {
          stick = { x: 0, y: 0 };            // `still`: the stick is NEVER touched
        }
        // The gun is HELD whenever this arm is allowed it (the vulcan is a
        // held trigger; the missile fires on RELEASE, hence the duty cycle).
        await page.evaluate((s) => window.__setStick(s), {
          ...stick,
          missile: useMissile && held,
          fire: useGun,
        });
        await page.evaluate(() => window.__step(1));
        const r = await read();
        const drained = await page.evaluate(() => ({
          msl: window.__missileDrain ? window.__missileDrain() : [],
          kills: window.__killDrain ? window.__killDrain() : null,
        }));
        out.rows.push({ i, held, sx: stick.x, px: r.px, stock: r.stock, inflight: r.inflight,
          nlocks: r.nlocks, nbrk: r.nbrk, lock: r.lock });
        if (drained.msl && drained.msl.length) out.events.push({ tick: i, outcomes: drained.msl });
        if (drained.kills && drained.kills.kills.length) {
          out.events.push({ tick: i, kills: drained.kills.kills.map((k) => k.weapon ?? k.by ?? 'x'), counts: drained.kills.counts });
        }
      }
      out.final = await page.evaluate(() => (window.__killDrain ? window.__killDrain().counts : null));
    }
  } finally {
    await browser.close();
    await server.close();
  }
  await writeFile(path.join(a.out, `${a.mode}-${a.pilot}.json`), JSON.stringify(out));
  // Print the declaration on every run, so a result can never be read without
  // knowing which pilot flew and which weapons it was allowed.
  console.log(`${a.mode}  PILOT=${a.pilot}  WEAPONS=${a.weapons}  seed=${a.seed}  ` +
    `${out.rows.length} ticks, ${out.events.length} events, ${errors.length} page errors`);
  console.log(`  root ${a.root}`);
  if (errors.length) console.log(errors.slice(0, 5));
}
main();

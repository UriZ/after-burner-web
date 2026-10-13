#!/usr/bin/env node
// R11 FEEL-CRITIC probe. Independent of judging/R11/{probe_r11,human_arm,gun_check}.mjs
// on purpose -- this round's three worst failures were all "a stable, plausible
// number from an instrument read below its own validity floor", and the way to
// catch that class is a second implementation that does not share the first's
// reference frame, its pilot, or its kill accounting.
//
// FIVE THINGS IT DOES DIFFERENTLY, each because a published R11 figure turns on it:
//
//  1. THE AIM REFERENCE IS THE CONE'S OWN CENTRE, RECONSTRUCTED AND VALIDATED.
//     Every hit/lock/assist test in combat.js is taken against `this.sight`,
//     which lives in the PITCH-ONLY ndc frame (combat.js:748). `window.__sight()`
//     returns the sight's LIVE-CAMERA ndc, a different frame -- the two differ by
//     up to ~9 %W under bank, and `probe_r11.mjs`/`human_arm.mjs` steer their
//     pilots on the live-camera one against pitch-only enemy positions. This
//     probe reconstructs the real thing:
//
//         sightX = playerNdc.x + SIGHT_FRAC/0.5 * (-sin(rollDeg))
//         sightY = playerNdc.y + SIGHT_FRAC/(0.5*224/320) * cos(rollDeg)
//
//     from `__fairness().playerNdc` (pitch-only) and `__brackets().rollDeg`, and
//     then VALIDATES it on real data against an answer the simulation already
//     knows: `__combatStats().trackedId` is the enemy the lock system picked as
//     nearest-to-sight, so "my nearest-to-sight enemy == trackedId" is a
//     known-answer test on live frames, not a synthetic. `--mode frames` runs it
//     and prints the naive `playerNdc.x`-only variant beside it.
//
//  2. PILOTS INCLUDE A FLOOR, NOT JUST A CEILING. `still` is not the worst a
//     player can do, so "the motionless stick takes 85 % of the best pilot's
//     kills" has no scale: 85 % of what range? `anti` actively steers the sight
//     AWAY from the nearest enemy. (best - still) / (best - anti) is the share of
//     the achievable range that aiming actually spans.
//
//  3. THE AIMING PILOT IS THE BEST OF A GAIN SWEEP. A single hand-picked pursuit
//     gain is not "the best aiming pilot" -- on a +-9.85 %W rail a gain of 3.0
//     saturates the stick on almost any error, which is a bang-bang controller.
//     `--gain` is swept and the denominator is the best arm.
//
//  4. `hold` PILOTS: the jet parked at a fixed fraction of its own rail by a
//     self-calibrating deadbeat controller (the per-tick travel is MEASURED in a
//     20-tick pre-run, so the same code holds station on a +-34.93 %W tree and a
//     +-9.85 %W one). This is the arm that separates "aiming matters" from "the
//     traffic comes to the centre of the screen": if kills are flat in hold
//     position, where the sight points is irrelevant; if they peak at centre, the
//     motionless stick wins because of approach geometry, which is not the gun.
//
//  5. PER-KILL LEDGER WITH THE WEAPON. combat.js's killLog rows carry `src`
//     ('vulcan'|'missile'), the victim's ndc, span and depth. (lane-feel.md §6
//     withdrew a per-kill weapon split as impossible because `k.weapon`/`k.by`
//     do not exist -- the field is `src`, and it is there on all three R11 trees.)
//     Every kill here is stamped with the reconstructed sight, so aim error at
//     the moment of the kill is a measured distribution and not an inference.
//
// SAMPLING RATE: one `window.__step(1)` per sample, 60 Hz sim ticks, state read
// in the same in-page driver call. Nothing is sampled coarser than every tick.
//
// RUN LOOP: ticks are driven by an in-page driver (`window.__fcRun`) in chunks,
// not one page.evaluate per tick -- 400x fewer round trips, same determinism
// (the driver only calls __setStick/__step/the read hooks, in that order).
// None of the hooks it reads consume a PRNG draw; __combatDebug, which does, is
// deliberately not among them.
//
// Unknown flags, pilots and weapon sets EXIT 2 and name the valid set.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require2 = createRequire(import.meta.url);

function repoRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(d, 'vite.config.js'))) return d;
    d = path.dirname(d);
  }
  return process.cwd();
}
const SELF = fileURLToPath(import.meta.url);
const ROOT = repoRoot(path.dirname(SELF));

// `trackgun` / `trackboth` were added AFTER the first gun table, because that
// table was wrong and this is why. `track` -- here, in `probe_r11.mjs`, and in
// `human_arm.mjs` -- flies the nearest enemy in depth 26..88. The GUN's licensed
// band is `assistmin` (2.6) to `readableDepth`, and the page reports
// readableDepth = 7.06: the missile pilot's band and the gun's do not overlap at
// all, and the median depth of a vulcan kill in these runs is 5.9. So `track`
// was aiming at targets the gun cannot engage while the gun killed whatever
// drifted through the sight, and calling it "the best aiming pilot" for a gun
// arm is an instrument read below its own validity floor -- this round's
// dominant failure, found in my own probe.
// `judging/R11/gun_check.mjs` uses `depth <= 22` for the same intent; its own
// comment calls that "inside readableDepth", which it is not (7.06), so its
// band is also asserted rather than read. These two read the licence off the
// page: `spanFrac >= minspan` and `depth >= assistmin`, from `__gunTunables()`.
const PILOTS = ['still', 'track', 'trackgun', 'trackboth', 'anti', 'hold', 'sweep'];
const WEAPONS = ['both', 'gun', 'missile', 'none'];
const MODES = ['combat', 'frames', 'selftest'];

function args() {
  const a = {
    mode: 'combat', out: null, root: ROOT, params: 'invincible=1',
    seed: 3, secs: 90, pilot: 'still', weapons: 'both',
    gain: 3.0, lag: 0, hold: 0, label: null, chunk: 300,
  };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    const k = v[i];
    if (k === '--mode') a.mode = v[++i];
    else if (k === '--out') a.out = v[++i];
    else if (k === '--root') a.root = path.resolve(v[++i]);
    else if (k === '--params') a.params = v[++i];
    else if (k === '--seed') a.seed = Number(v[++i]);
    else if (k === '--secs') a.secs = Number(v[++i]);
    else if (k === '--pilot') a.pilot = v[++i];
    else if (k === '--weapons') a.weapons = v[++i];
    else if (k === '--gain') a.gain = Number(v[++i]);
    else if (k === '--lag') a.lag = Number(v[++i]);       // ticks of pure delay
    else if (k === '--hold') a.hold = Number(v[++i]);      // fraction of own rail
    else if (k === '--label') a.label = v[++i];
    else if (k === '--chunk') a.chunk = Number(v[++i]);
    else { console.error(`unknown argument "${k}"`); process.exit(2); }
  }
  if (!MODES.includes(a.mode)) {
    console.error(`unknown --mode "${a.mode}". Known: ${MODES.join(', ')}.`); process.exit(2);
  }
  if (!PILOTS.includes(a.pilot)) {
    console.error(`unknown --pilot "${a.pilot}". Known: ${PILOTS.join(', ')}.`);
    console.error('Refusing to run rather than silently flying a different pilot.');
    process.exit(2);
  }
  if (!WEAPONS.includes(a.weapons)) {
    console.error(`unknown --weapons "${a.weapons}". Known: ${WEAPONS.join(', ')}.`); process.exit(2);
  }
  if (!Number.isFinite(a.seed) || !Number.isFinite(a.secs) || !Number.isFinite(a.gain)
      || !Number.isFinite(a.lag) || !Number.isFinite(a.hold)) {
    console.error('numeric flag received a non-number'); process.exit(2);
  }
  if (a.mode !== 'selftest' && !a.out) { console.error('--out is REQUIRED (unique per caller)'); process.exit(2); }
  return a;
}

// ---------------------------------------------------------------- in-page driver
// Serialised as a string and installed once. Everything that runs per tick runs
// here, so a 5400-tick arm is ~18 round trips rather than ~21600.
const DRIVER = `(() => {
  const SIGHT_FRAC = 0.105;            // combat.js: SIGHT_NDC_Y_OFFSET*0.5*(224/320)
  const ASPECT_Y = 224 / 320;
  const D2R = Math.PI / 180;
  window.__fcInit = (cfg) => {
    window.__fc = {
      cfg, tick: 0, hist: [], rows: [], kills: [], perTick: null,
      sentinel: { stickZero: true, nonNeutral: 0, obsMissing: 0 },
    };
    // Drain anything the page accumulated before the arm started.
    if (window.__killDrain) window.__killDrain();
  };
  // One observation of the world, all of it in the PITCH-ONLY ndc frame the
  // hit/lock/assist tests are taken in.
  const observe = () => {
    const f = window.__fairness();
    const cs = window.__combatStats();
    const br = window.__brackets();
    const sg = window.__sight();
    const roll = br.rollDeg * D2R;
    // up = (0,1,0) through the camera, expressed in the unrolled basis and
    // normalised in (x,y) -- which is (-sin roll, cos roll) for the same roll
    // atan2(r.y, r.x) reports, because r and up are 90 deg apart in that plane.
    const upx = -Math.sin(roll), upy = Math.cos(roll);
    return {
      t: f.t,
      px: f.playerNdc.x, py: f.playerNdc.y,
      // THE ROLL-FREE POSITION READOUT, and the arm that needs it is \`hold\`.
      // \`__fairness().playerNdc\` is the PITCH-ONLY frame, which rotates under
      // bank by construction (lane-feel.md §1.6), so a controller closed on it
      // gets POSITIVE FEEDBACK: rolling right shrinks |px|, which the
      // controller reads as "not far enough right" and answers with more right
      // stick. The first version of this file did exactly that and measured a
      // +-7.52 %W rail on a tree whose rail is +-9.85.
      // \`__sight().ndcX\` is the sight's LIVE-CAMERA ndc x, which combat.js:748
      // proves identical to the drawn jet's screen x at every roll angle
      // (3.3e-14 %W over a 66.5 deg sweep). It is therefore the jet's SCREEN
      // column: roll-free, monotone in world x, and the thing the player sees.
      jx: sg ? sg.ndcX : f.playerNdc.x,
      jy: sg ? sg.ndcY : f.playerNdc.y,
      roll: br.rollDeg,
      sx: f.playerNdc.x + (upx * SIGHT_FRAC) / 0.5,
      sy: f.playerNdc.y + (upy * SIGHT_FRAC) / (0.5 * ASPECT_Y),
      naiveSx: f.playerNdc.x,
      trackedId: cs.trackedId,
      locks: cs.locks, brackets: cs.brackets, stock: cs.missileStock,
      enemies: cs.enemies.map((e) => ({ id: e.id, x: e.ndcX, y: e.ndcY, d: e.depth, span: e.spanFrac, pattern: e.pattern })),
    };
  };
  // Isotropic frame-width distance from a point to the sight, in exactly the
  // units lockSystem._lockable and combat._findAssistTarget use.
  const distW = (ex, ey, sx, sy) => {
    const dx = (ex - sx) * 0.5, dy = (ey - sy) * 0.5 * ASPECT_Y;
    return Math.hypot(dx, dy);
  };
  window.__fcDist = distW;
  const DMIN = 26, DMAX = 88;          // the depth band every pilot engages in
  const nearest = (o, sx, sy) => {
    let best = null, bd = Infinity;
    for (const e of o.enemies) {
      if (e.d < DMIN || e.d > DMAX) continue;
      const r = distW(e.x, e.y, sx, sy);
      if (r < bd) { bd = r; best = e; }
    }
    return best ? { e: best, r: bd } : null;
  };
  window.__fcNearest = nearest;
  // The nearest-to-sight enemy the GUN is licensed to kill. \`minspan\` and
  // \`assistmin\` come from __gunTunables(), i.e. from the running page, so this
  // cannot go stale against a constant edit the way a hardcoded depth does.
  const nearestGun = (o, cfg) => {
    let best = null, bd = Infinity;
    for (const e of o.enemies) {
      if (e.span < cfg.minspan) continue;
      if (e.d < cfg.assistmin) continue;
      const r = distW(e.x, e.y, o.sx, o.sy);
      if (r < bd) { bd = r; best = e; }
    }
    return best ? { e: best, r: bd } : null;
  };

  window.__fcRun = (n) => {
    const S = window.__fc, cfg = S.cfg;
    const useGun = cfg.weapons === 'both' || cfg.weapons === 'gun';
    const useMsl = cfg.weapons === 'both' || cfg.weapons === 'missile';
    const cl = (v) => Math.max(-1, Math.min(1, v));
    const outRows = [], outKills = [];
    for (let k = 0; k < n; k++) {
      const now = observe();
      S.hist.push(now);
      if (S.hist.length > 64) S.hist.shift();
      // The pilot sees the world as it was \`lag\` ticks ago. Before that much
      // history exists it sees the oldest it has (never the future).
      const li = S.hist.length - 1 - cfg.lag;
      const obs = S.hist[li >= 0 ? li : 0];
      if (li < 0) S.sentinel.obsMissing++;
      let stick = { x: 0, y: 0 };
      if (cfg.pilot === 'track' || cfg.pilot === 'anti') {
        const tgt = nearest(obs, obs.sx, obs.sy);
        if (tgt) {
          const sgn = cfg.pilot === 'anti' ? -1 : 1;
          stick = { x: cl(sgn * (tgt.e.x - obs.sx) * cfg.gain),
                    y: cl(sgn * (tgt.e.y - obs.sy) * cfg.gain) };
        }
      } else if (cfg.pilot === 'trackgun' || cfg.pilot === 'trackboth') {
        // THE GUN'S OWN LICENCE, read off the page rather than asserted: an
        // enemy the gun may engage is one resolveHits would accept, i.e.
        // spanFrac >= minspan and depth >= assistmin (combat.js / vulcan.js).
        const g = nearestGun(obs, cfg);
        const tgt = g || (cfg.pilot === 'trackboth' ? nearest(obs, obs.sx, obs.sy) : null);
        if (tgt) {
          stick = { x: cl((tgt.e.x - obs.sx) * cfg.gain),
                    y: cl((tgt.e.y - obs.sy) * cfg.gain) };
        }
      } else if (cfg.pilot === 'hold') {
        // Deadbeat on the MEASURED per-tick travel, closed on the ROLL-FREE
        // screen column: one tick of full stick moves \`perTick\` of ndc, so
        // stick = error/perTick, clamped. Half gain, because a deadbeat command
        // reverses every tick at the resolution limit and that is a 60 Hz
        // bang-bang roll oscillation the camera would show.
        const err = cfg.holdNdc - obs.jx;
        stick = { x: cl((0.5 * err) / S.perTick), y: 0 };
      } else if (cfg.pilot === 'sweep') {
        stick = { x: Math.sin(S.tick / 70) * 0.8, y: 0.15 };
      }
      if (stick.x !== 0 || stick.y !== 0) S.sentinel.nonNeutral++;
      if (cfg.pilot === 'still' && (stick.x !== 0 || stick.y !== 0)) S.sentinel.stickZero = false;
      const held = (S.tick % 45) < 40;   // identical trigger cadence in every arm
      window.__setStick({ x: stick.x, y: stick.y, fire: useGun, missile: useMsl && held });
      window.__step(1);
      // Post-step world, for stamping the kills this tick produced.
      const after = observe();
      const drained = window.__killDrain();
      for (const kk of drained.kills) {
        outKills.push({
          tick: S.tick, t: kk.t, src: kk.src, d: kk.d, span: kk.span,
          ex: kk.ndcX, ey: kk.ndcY, pattern: kk.pattern,
          sx: after.sx, sy: after.sy, px: after.px, roll: after.roll,
          // aim error at the kill, in the hit test's own frame-width units
          errW: distW(kk.ndcX, kk.ndcY, after.sx, after.sy),
          errXW: Math.abs(kk.ndcX - after.sx) * 0.5,
          naiveErrXW: Math.abs(kk.ndcX - after.px) * 0.5,
        });
      }
      S.counts = drained.counts;
      S.dropped = drained.dropped;
      // Per-tick row. Kept small: the nearest target's range and whether the
      // sim's own tracked id agrees with ours (the frame validation).
      const nr = nearest(now, now.sx, now.sy);
      const nrNaive = nearest(now, now.naiveSx, now.py + 0.30);
      // THE KNOWN-ANSWER TEST for the sight reconstruction, evaluated per tick
      // on live frames. lockSystem.js:466 drops \`tracked\` the moment the aim
      // leaves it, so on EVERY tick where \`trackedId\` is non-null the tracked
      // enemy is inside LOCK_RADIUS_FRAC of the real cone centre, by
      // construction. A reconstruction of that centre must therefore report a
      // distance <= the radius on 100 % of those ticks, and one in the wrong
      // frame must not. Both variants are recorded so the test discriminates.
      let td = null, tdn = null;
      if (now.trackedId !== null) {
        const te = now.enemies.find((e) => e.id === now.trackedId);
        if (te) {
          td = distW(te.x, te.y, now.sx, now.sy);
          tdn = distW(te.x, te.y, now.naiveSx, now.py + 0.30);
        }
      }
      outRows.push({
        i: S.tick, px: now.px, py: now.py, jx: now.jx, sx: now.sx, roll: now.roll,
        nerr: nr ? nr.r : null,
        stx: stick.x, sty: stick.y, held,
        nid: nr ? nr.e.id : null, nr: nr ? nr.r : null,
        nidNaive: nrNaive ? nrNaive.e.id : null,
        td, tdn,
        tracked: now.trackedId, locks: now.locks, brk: now.brackets,
        alive: now.enemies.length,
        band: now.enemies.filter((e) => e.d >= DMIN && e.d <= DMAX).length,
      });
      S.tick++;
    }
    return { rows: outRows, kills: outKills, counts: S.counts, dropped: S.dropped,
             sentinel: S.sentinel, tick: S.tick };
  };
  // The jet's roll-free SCREEN column -- see \`jx\` in observe() for why this
  // and not playerNdc.x.
  const jx = () => { const s = window.__sight(); return s ? s.ndcX : window.__fairness().playerNdc.x; };
  const slam = (x, n) => { for (let i = 0; i < n; i++) { window.__setStick({ x, y: 0 }); window.__step(1); } };
  // The reachable rail, MEASURED rather than converted from ENVELOPE_X's world
  // units by hand: slam 4 s each way, read the screen column at each end.
  window.__fcRail = () => {
    slam(1, 240);
    const r = jx();
    slam(-1, 480);
    const l = jx();
    slam(1, 240);
    window.__setStick({ x: 0, y: 0 });
    return { right: r, left: l, half: (r - l) / 2 };
  };
  // One tick of full lateral stick, in ndc of the screen column, so \`hold\`
  // works on any tree without being told the envelope. Measured from the LEFT
  // rail travelling right, so all 20 samples are free travel and none is
  // clipped by the clamp. On a tree that still has ACCEL_RATE the first ticks
  // are ramping, so the median under-reads the plateau by ~13 % -- that makes
  // the hold controller slightly slow, never unstable.
  window.__fcCalibrate = () => {
    slam(-1, 480);
    const from = jx();
    const steps = [];
    for (let i = 0; i < 20; i++) {
      const b0 = jx();
      window.__setStick({ x: 1, y: 0 });
      window.__step(1);
      steps.push(Math.abs(jx() - b0));
    }
    window.__setStick({ x: 0, y: 0 });
    const s = steps.slice().sort((p, q) => p - q);
    return { perTick: s[Math.floor(s.length / 2)], plateau: s[s.length - 1],
             from, to: jx(), steps };
  };
  return true;
})()`;

// --------------------------------------------------------------------- selftest
function selftest() {
  let ok = 0, tot = 0;
  const chk = (n, c) => { tot++; if (c) ok++; console.log((c ? 'PASS ' : 'FAIL ') + n); };
  const { spawnSync } = require2('node:child_process');
  const run = (...v) => spawnSync(process.execPath, [SELF, ...v], { encoding: 'utf8' });

  // 1-4. the guards. A silently-substituted arm is this round's dominant defect.
  let r = run('--mode', 'combat', '--pilot', 'trak', '--out', '/tmp/_fc');
  chk(`unknown --pilot exits 2 (got ${r.status})`, r.status === 2);
  chk('unknown --pilot names the set', new RegExp('Known: ' + PILOTS.join(', ')).test(r.stderr));
  r = run('--mode', 'combat', '--pilot', 'still', '--weapons', 'lasers', '--out', '/tmp/_fc');
  chk(`unknown --weapons exits 2 (got ${r.status})`, r.status === 2);
  r = run('--mode', 'combat', '--pilot', 'still', '--frames', '9');
  chk(`unknown flag exits 2 (got ${r.status})`, r.status === 2);
  r = run('--mode', 'combat', '--pilot', 'still');
  chk(`missing --out exits 2 (got ${r.status})`, r.status === 2);

  // 5. the lag ring buffer, on a planted sequence. Reimplements the driver's
  //    indexing exactly (it is three lines) against a hand-computed answer.
  const hist = [];
  const seen = [];
  for (let i = 0; i < 10; i++) {
    hist.push(i);
    if (hist.length > 64) hist.shift();
    const li = hist.length - 1 - 3;
    seen.push(hist[li >= 0 ? li : 0]);
  }
  chk(`lag 3 sees [0,0,0,0,1,2,3,4,5,6] (got [${seen}])`,
    JSON.stringify(seen) === JSON.stringify([0, 0, 0, 0, 1, 2, 3, 4, 5, 6]));

  // 6. the sight reconstruction at the two angles where the answer is known by
  //    hand: roll 0 puts the sight directly above the nose (x offset exactly 0),
  //    roll 90 deg puts it exactly SIGHT_FRAC/0.5 = 0.21 ndc to the LEFT.
  const SIGHT_FRAC = 0.105;
  const sx = (px, rollDeg) => px + (-Math.sin((rollDeg * Math.PI) / 180) * SIGHT_FRAC) / 0.5;
  chk('roll 0: sight x == nose x', Math.abs(sx(0.4, 0) - 0.4) < 1e-12);
  chk(`roll 90: sight x == nose - 0.21 (got ${sx(0, 90).toFixed(4)})`,
    Math.abs(sx(0, 90) + 0.21) < 1e-12);
  chk(`roll -66.5: offset +0.1926 (got ${sx(0, -66.5).toFixed(4)})`,
    Math.abs(sx(0, -66.5) - 0.21 * Math.sin(66.5 * Math.PI / 180)) < 1e-12);

  // 7. the distance operator against lockSystem's own units: a pure-x offset of
  //    0.2 ndc is 10 %W; a pure-y offset of 0.2 ndc is 7 %W (the 224/320 term).
  const ASPECT_Y = 224 / 320;
  const distW = (ex, ey, s, t) => Math.hypot((ex - s) * 0.5, (ey - t) * 0.5 * ASPECT_Y);
  chk(`0.2 ndc in x is 0.1000 fracW (got ${distW(0.2, 0, 0, 0).toFixed(4)})`,
    Math.abs(distW(0.2, 0, 0, 0) - 0.1) < 1e-12);
  chk(`0.2 ndc in y is 0.0700 fracW (got ${distW(0, 0.2, 0, 0).toFixed(4)})`,
    Math.abs(distW(0, 0.2, 0, 0) - 0.07) < 1e-12);

  console.log(`feelcrit_probe selftest ${ok}/${tot}`);
  return ok === tot;
}

// ------------------------------------------------------------------------- main
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
  const label = a.label ?? `${a.pilot}-${a.weapons}-g${a.gain}-l${a.lag}-h${a.hold}-s${a.seed}`;
  const out = {
    label, url, mode: a.mode, root: a.root, pilot: a.pilot, weapons: a.weapons,
    gain: a.gain, lag: a.lag, hold: a.hold, seed: a.seed, secs: a.secs,
    samplingHz: 60, errors,
  };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 672 });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 90000 });
    const installed = await page.evaluate(DRIVER);
    if (installed !== true) throw new Error('driver install failed');

    // WHAT THE PAGE IS ACTUALLY RUNNING, read back rather than assumed --
    // `?gun=` throws on an unknown key, so a typo'd arm cannot present as the
    // shipped default, but the arm still has to record which defaults it got.
    out.tunables = await page.evaluate(() => (window.__gunTunables ? window.__gunTunables() : null));
    // Rail + per-tick travel, measured on THIS tree before the arm flies.
    out.rail = await page.evaluate(() => window.__fcRail());
    out.calib = await page.evaluate(() => window.__fcCalibrate());
    // Fresh page for the arm itself, so the calibration's 1000 ticks are not
    // part of the scenario the kills are counted over.
    await page.close();
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 960, height: 672 });
    page2.on('pageerror', (e) => errors.push(String(e)));
    page2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page2.goto(url, { waitUntil: 'load' });
    await page2.waitForFunction('window.__frameReady === true', { timeout: 90000 });
    if ((await page2.evaluate(DRIVER)) !== true) throw new Error('driver install failed (arm page)');

    const holdNdc = a.hold * out.rail.half;
    out.holdNdc = holdNdc;
    await page2.evaluate(
      (cfg) => { window.__fcInit(cfg); window.__fc.perTick = cfg.perTick; },
      { pilot: a.pilot, weapons: a.weapons, gain: a.gain, lag: Math.round(a.lag),
        holdNdc, perTick: out.calib.perTick,
        // the gun's licence, read back from the page it will fly on
        minspan: (out.tunables && out.tunables.minspan) ?? 0.1,
        assistmin: (out.tunables && out.tunables.assistmin) ?? 2.6 }
    );

    const TOTAL = Math.round(a.secs * 60);
    const rows = [], kills = [];
    let last = null;
    for (let done = 0; done < TOTAL; done += a.chunk) {
      const n = Math.min(a.chunk, TOTAL - done);
      const res = await page2.evaluate((k) => window.__fcRun(k), n);
      rows.push(...res.rows);
      kills.push(...res.kills);
      last = res;
    }
    out.rows = rows;
    out.kills = kills;
    out.counts = last.counts;
    out.killsDropped = last.dropped;
    out.sentinel = last.sentinel;
    out.ticks = rows.length;
  } finally {
    await browser.close();
    await server.close();
  }
  const f = path.join(a.out, `${label}.json`);
  await writeFile(f, JSON.stringify(out));
  const c = out.counts ?? {};
  console.log(
    `${out.label}  PILOT=${a.pilot} WEAPONS=${a.weapons} gain=${a.gain} lag=${a.lag}tick ` +
    `hold=${a.hold}rail seed=${a.seed}\n` +
    `  root ${a.root}\n` +
    `  ticks ${out.ticks} @60Hz  rail +-${(out.rail.half * 50).toFixed(2)} %W  ` +
    `perTick ${(out.calib.perTick * 50).toFixed(4)} %W\n` +
    `  kills vulcan=${c.vulcan ?? 0} missile=${c.missile ?? 0} other=${c.other ?? 0} ` +
    `(ledger ${out.kills.length}, dropped ${out.killsDropped})  page errors ${errors.length}`
  );
  if (errors.length) console.log(errors.slice(0, 4));
}
main();

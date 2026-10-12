#!/usr/bin/env node
// R11 FLOW lane: the attract loop's barrel rolls, COUNTED AND ATTRIBUTED.
//
// `judging/R11/demo_check.mjs` counts rolls. A count cannot say WHICH slam was
// lost, and "9 instead of 10" has at least three causes that a count cannot
// separate: a scheduled slam that never armed, a scheduled slam swallowed by a
// roll still in progress, and an UNscheduled roll stealing a cooldown. This
// logs every tick and attributes each roll to the cycle it fell in.
//
// `demoTimeline.js` schedules one slam at ROLL_SLAM_AT_S = 8.0 s into each
// CYCLE_S = 16 s cycle, so over 160 s the authored count is 10 and each one is
// expected at simTime = 8, 24, 40 ... 152 s. Time is read from the simulation
// (`window.__combatStats().simTime`) and NOT from the tick index: the attract
// loop does not start at tick 0, and attributing a roll on tick/60 silently
// shifts every cycle by the pre-flight ticks.
//
// The regime split (`phase = simTime % 16 < 11` is cruise) is the one
// demoTimeline.js's own header requires for any roam statistic -- the two
// regimes sit 10 points apart in cy by construction, so a pooled figure is a
// mixture of two populations.
//
// Every figure here is CONSECUTIVE 60 Hz: one window.__step(1) per sample, the
// state read in the same page.evaluate. Sampling rate 60 Hz, both the
// before/after arms and all seeds.
//
// Usage:
//   node judging/R11/roll_check.mjs --root <tree> --seed 3 [--ticks 9600] [--json out.json]
//   node judging/R11/roll_check.mjs --selftest
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CYCLE_S = 16;
const SLAM_AT_S = 8.0;

function repoRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(d, 'vite.config.js'))) return d;
    d = path.dirname(d);
  }
  return process.cwd();
}

// Attribute a roll's start time to the scheduled slam it belongs to: the one
// whose window it falls in. Returned as the cycle index, or null when the roll
// started further than TOL from any scheduled slam (an UNAUTHORED roll).
export function attribute(tSec, tol = 0.75) {
  const k = Math.round((tSec - SLAM_AT_S) / CYCLE_S);
  const expect = SLAM_AT_S + k * CYCLE_S;
  return Math.abs(tSec - expect) <= tol && k >= 0 ? k : null;
}

function selftest() {
  let ok = 0, fail = 0;
  const chk = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); c ? ok++ : fail++; };
  chk('t=8.0 -> cycle 0', attribute(8.0) === 0);
  chk('t=8.2 (slam segment 3) -> cycle 0', attribute(8.2) === 0);
  chk('t=24.1 -> cycle 1', attribute(24.1) === 1);
  chk('t=152.0 -> cycle 9', attribute(152.0) === 9);
  chk('t=16.0 (mid-cycle) -> unauthored', attribute(16.0) === null);
  chk('t=144.15 (R10 unauthored roll) -> unauthored', attribute(144.15) === null);
  chk('t=0.1 -> unauthored (before the first slam)', attribute(0.1) === null);
  chk('tolerance is two-sided: t=7.3 -> cycle 0', attribute(7.3) === 0);
  chk('tolerance excludes 7.0', attribute(7.0) === null);
  console.log(`selftest ${ok}/${ok + fail}`);
  return fail === 0;
}

async function main() {
  const v = process.argv.slice(2);
  if (v.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  const arg = (n, d) => (v.includes(n) ? v[v.indexOf(n) + 1] : d);
  const ROOT = repoRoot(path.dirname(fileURLToPath(import.meta.url)));
  const root = path.resolve(arg('--root', ROOT));
  const ticks = Number(arg('--ticks', 9600));
  const seed = Number(arg('--seed', 3));
  const jsonOut = arg('--json', null);
  // `demoTimeline.js`'s own header: measure the roam with deaths suppressed,
  // because a death deletes flight ticks and the surviving sample is a
  // different subset of the regime cycle every time. The same argument applies
  // to the roll count -- a slam that falls inside a death sequence is never
  // delivered -- and the arm that does NOT pass it is kept because the shipped
  // attract loop a passer-by watches does carry deaths.
  const inv = v.includes('--invincible') ? '&invincible=1' : '';

  const server = await createServer({ root, configFile: path.join(root, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const errors = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&demo=1&seed=${seed}${inv}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

  const cruise = [], canyon = [], cruiseY = [], canyonY = [], rolls = [], flicks = [], states = [];
  let wasRolling = false, lastSign = 0, lastT = 0;
  for (let i = 0; i < ticks; i++) {
    const s = await page.evaluate(() => {
      window.__step(1);
      const f = window.__flowState ? window.__flowState() : null;
      const c = window.__combatStats ? window.__combatStats() : null;
      return f ? { rolling: f.rolling, x: f.stickX, jet: f.jetNdcX, jy: f.jetNdcY,
                   state: f.state, t: c ? c.simTime : null } : null;
    });
    if (!s) { console.log('__flowState missing at tick', i); break; }
    const t = s.t ?? i / 60;
    lastT = t;
    if (!states.length || states[states.length - 1].state !== s.state) states.push({ t: +t.toFixed(3), state: s.state });
    if (s.rolling && !wasRolling) rolls.push({ t, cycle: attribute(t), state: s.state });
    wasRolling = !!s.rolling;
    // Mirror player.js's own flick rule (|x| >= 0.5 counts, else no sign) so the
    // probe can say WHICH flicks the aircraft saw without reaching into it.
    const sign = Math.abs(s.x ?? 0) >= 0.5 ? Math.sign(s.x) : 0;
    if (sign !== 0 && sign !== lastSign) { flicks.push({ t, sign }); lastSign = sign; }
    if (s.jet != null && s.state === 'flight' && !s.rolling) {
      // SCREEN fractions: cx in %W from centre, cy in %H from the top.
      const inCruise = t % CYCLE_S < 11;
      (inCruise ? cruise : canyon).push(s.jet * 50);
      (inCruise ? cruiseY : canyonY).push(50 - s.jy * 50);
    }
  }
  await browser.close(); await server.close();

  const stat = (a) => {
    if (a.length < 2) return null;
    const m = a.reduce((x, y) => x + y, 0) / a.length;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1));
    const s2 = [...a].sort((x, y) => x - y);
    const q = (p) => +s2[Math.min(s2.length - 1, Math.floor(p * s2.length))].toFixed(3);
    return { n: a.length, mean: +m.toFixed(3), sd: +sd.toFixed(3), p5: q(0.05), p95: q(0.95) };
  };
  const xs = cruise.concat(canyon);
  const n = xs.length;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  const cycles = Math.floor(lastT / CYCLE_S);
  const hit = new Set(rolls.map((r) => r.cycle).filter((c) => c !== null));
  const missing = [];
  for (let k = 0; k < cycles; k++) if (!hit.has(k)) missing.push(k);
  const unauthored = rolls.filter((r) => r.cycle === null);
  const res = {
    root, seed, ticks, cycles, invincible: !!inv, pageErrors: errors.length,
    rolls: rolls.length, authored: hit.size, missingCycles: missing,
    unauthored: unauthored.map((r) => +r.t.toFixed(3)),
    cxMeanPctW: +m.toFixed(3), cxSdPctW: +sd.toFixed(3), flightTicks: n,
    cruiseCx: stat(cruise), canyonCx: stat(canyon),
    cruiseCy: stat(cruiseY), canyonCy: stat(canyonY),
    rollTimes: rolls.map((r) => +r.t.toFixed(3)),
    stateChanges: states.length,
    flicksNearMissing: missing.map((k) => ({
      cycle: k,
      states: states.filter((q) => Math.abs(q.t - (SLAM_AT_S + k * CYCLE_S)) < 4),
      window: flicks.filter((f) => Math.abs(f.t - (SLAM_AT_S + k * CYCLE_S)) < 1.2)
        .map((f) => `${f.t.toFixed(3)}:${f.sign > 0 ? '+' : '-'}`),
    })),
  };
  console.log(JSON.stringify(res, null, 1));
  if (errors.length) console.log(errors.slice(0, 3));
  if (jsonOut) await writeFile(jsonOut, JSON.stringify({ ...res, flicks }, null, 1));
}

main();

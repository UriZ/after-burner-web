#!/usr/bin/env node
// R9 PACING lane probe.
//
// WHY IT IS NOT judge_probe_r8.mjs. That probe answers "how many aircraft
// does the spawner EMIT" and answers it three ways, which is exactly right
// for the emission question and is reused here in the same three forms. It
// does NOT answer either of the two reproductions this lane is measured
// against, and one of its fields would be silently wrong if it were used
// for them:
//
//   * `anyEnemyPct` counts a tick as "has an enemy" when `alive > 0`.
//     `alive` is the SIMULATION's list and includes aircraft off the side
//     of the frame and aircraft two native pixels wide at the vanishing
//     point. The arcade statistic it would be compared against — "the
//     arcade's sky holds no enemy aircraft at all 39.7 % of the time" — is
//     a HUMAN counting a DISPLAYED frame, whose floor is ~3 %W. Comparing
//     the two is the correct-operator-wrong-population trap. Here every
//     presence figure is computed from `onScreen && spanFrac >= floor`,
//     at FIVE floors, and the arcade-matched one is named.
//
//   * our `spanFrac` is the projected width of the sprite QUAD and the
//     arcade side is a drawn WINGSPAN. R8's feel critic measured the ratio
//     on the authored sheets: 0.969 level, 0.719-0.859 banked, ~1.18x
//     bank-weighted. So every floor is reported BOTH nominal and
//     unit-corrected (floor x 1.18), and no conclusion is quoted that
//     depends on which one is used.
//
// `?fixed=1` ALONE INJECTS NO INPUT AT ALL. Every arm installs its own
// stick, and the `idle` arm installs a deliberately empty one — that is a
// control, not a pilot, and it is labelled as one.
//
// Arms: idle | still | trk | demo.   Sweep: --pace "maxalive=6,gapmin=5,..."

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const args = process.argv.slice(2);
const argv = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) argv[args[i].slice(2)] = args[i + 1] ?? true;
}

// `arcstill`/`arctrk` fire a missile every 2.0 s instead of every 0.4 s.
// NOT cosmetic: the fast cadence is 2.5 lock-ons a second, which no arcade
// pilot approaches, and the missile carries NO span gate (the gun's
// READABLE_SPAN_FRAC does not apply to it), so a missile-spamming pilot
// removes traffic at any size and truncates the very residence this probe
// measures. The 2.0 s period is the R8 judge's own arcade-cadence arm.
const MODES = ['idle', 'still', 'trk', 'demo', 'arcstill', 'arctrk'];
// Nominal floors in `spanFrac`. 0.10 is R3's readable gate and the gate
// `vulcan.resolveHits` enforces; 0.03 is the arcade hand counters' own
// visibility floor and the one the 39.7 % empty-sky figure is quoted at.
// R9, criteria lane's ARCADE-PACING table: its arcade column is a HUMAN-READ
// DRAWN SPAN and `spanFrac` is the projected width of the sprite QUAD, which
// overstates a drawn wingspan by 1.03x level to 1.39x hard bank (~1.18x
// bank-weighted, measured on the authored sheets by R8's feel critic). So
// every gate floor is carried TWICE: nominal, and multiplied by 1.18 so the
// bin answers "what would an arcade counter have called this aircraft".
// Reporting one without the other is REFERENCE ledger row 27.
//   idx 0      1      2       3      4       5      6       7
const FLOORS = [0.0, 0.03, 0.0354, 0.05, 0.059, 0.10, 0.118, 0.15];
const I_ANY = 0, I_3 = 1, I_3D = 2, I_5 = 3, I_5D = 4, I_10 = 5, I_10D = 6;
// Same floors scaled by the quad-vs-drawn-span ratio, so a row can be read
// as "an arcade counter looking at our frame would have called this N %W".
const UNIT = 1.18;

const ARM = async (page, { mode, secs, seed, invincible, pace }) => {
  const q = new URLSearchParams();
  q.set('fixed', '1');
  q.set('seed', String(seed));
  if (invincible) q.set('invincible', '1');
  if (mode === 'demo') q.set('demo', '1');
  if (pace) q.set('pace', pace);
  const url = `http://127.0.0.1:${PORT}/?${q.toString()}`;

  const errors = [];
  const onErr = (e) => errors.push(String(e));
  const onConsole = (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  };
  page.on('pageerror', onErr);
  page.on('console', onConsole);

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 60000 });

  const TICKS = Math.round(secs * 60);
  const CHUNK = Number(argv.chunk ?? 300);

  await page.evaluate(
    (FLOORS) => {
      window.__P = {
        FLOORS,
        firstId: null,
        maxId: 0,
        idsSeen: new Set(),
        newAppearances: 0,
        prevIds: new Set(),
        ticksFlight: 0,
        ticksTotal: 0,
        aliveSum: 0,
        pendingSum: 0,
        // per floor: ticks with >=1 on-screen enemy at that floor, and the
        // summed on-screen count at that floor
        presentTicks: FLOORS.map(() => 0),
        // criteria lane's row 4: frames holding >=2 enemies at >=5 %W.
        // PER-STAGE, keyed on `stageNumber` -- the digit the HUD actually
        // draws, NOT `stageIndex` (the raw lap counter) and NOT
        // `contentStageIndex` (which of 3 palettes is rendered). The arcade
        // side of ARCADE-PACING is a count on frames whose STAGE DIGIT was
        // read, so ours has to be binned by the same quantity or the two
        // sides are matched on nothing. Reading `stageIndex` here is how the
        // digit defect survived three rounds (game.js's own note).
        byStage: {},
        twoAt5: 0,
        twoAt5d: 0,
        // the size distribution, our side of the "share below 10 %W" row:
        // every on-screen observation, binned, not just the frame maxima.
        obsTotal: 0,
        obsBelow10: 0,
        obsBelow10d: 0,
        countSum: FLOORS.map(() => 0),
        // RUN LENGTHS. The pacing complaint is a statement about RHYTHM --
        // "six to ten seconds of empty sky, then three to five seconds of a
        // formation arriving" -- and a presence PERCENTAGE cannot tell a sky
        // that empties for 8 s once a minute from one that flickers empty for
        // two ticks 240 times. Both runs are collected at the arcade-matched
        // floor (index 1 = 0.03) and at the readable floor (index 3 = 0.10).
        runs: { empty3: [], busy3: [], empty10: [], busy10: [] },
        cur: { empty3: 0, busy3: 0, empty10: 0, busy10: 0 },
        spanMaxSum: 0,
        enemyShotSum: 0,
        // fairness / volume
        shotsFired0: null,
        shotsFiredLast: 0,
        trains0: null,
        trainsLast: 0,
        hitWarnings: [],
        hitLogSeen: -1,
        deaths: 0,
        prevLives: null,
        states: {},
        stageNumbers: new Set(),
        ledgerKills: [],
        ledgerDropped: 0,
      };
    },
    FLOORS,
  );

  for (let done = 0; done < TICKS; done += CHUNK) {
    const n = Math.min(CHUNK, TICKS - done);
    await page.evaluate(
      async (n, mode, READABLE) => {
        const P = window.__P;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const pushRun = (key, v) => {
          if (v > 0) P.runs[key].push(v);
        };
        for (let i = 0; i < n; i++) {
          const cs = window.__combatStats ? window.__combatStats() : null;
          const sight = window.__sight ? window.__sight() : null;
          const stick = { x: 0, y: 0, fire: false, missile: false, throttleIndex: 1 };
          if (mode === 'still' || mode === 'arcstill') {
            stick.fire = true;
          } else if (mode === 'trk' || mode === 'arctrk') {
            stick.fire = true;
            if (cs && cs.enemies.length) {
              const sx = sight ? sight.ndcX : 0;
              const sy = sight ? sight.ndcY : 0.3;
              let best = null;
              for (const e of cs.enemies) {
                if (e.spanFrac < READABLE) continue;
                if (!best || e.depth < best.depth) best = e;
              }
              if (best) {
                stick.x = clamp((best.ndcX - sx) * 2.2, -1, 1);
                stick.y = clamp((best.ndcY - sy) * 2.2, -1, 1);
              }
            }
          }
          // missile fires on RELEASE: hold 23 ticks, release 1.
          if (mode !== 'idle' && mode !== 'demo') {
            const period = mode === 'arcstill' || mode === 'arctrk' ? 120 : 24;
            stick.missile = P.ticksTotal % period < period - 1;
          }
          if (mode !== 'demo') window.__setStick(stick);

          window.__step(1);
          P.ticksTotal++;

          const fs = window.__flowState ? window.__flowState() : null;
          if (fs) {
            P.states[fs.state] = (P.states[fs.state] ?? 0) + 1;
            P.stageNumbers.add(fs.stageNumber);
            if (P.prevLives !== null && fs.lives < P.prevLives) P.deaths++;
            P.prevLives = fs.lives;
          }
          const inFlight = !fs || fs.state === 'flight';
          const c = window.__combatStats ? window.__combatStats() : null;
          if (!c) continue;

          // --- emission, the R8 judge's three operators, unchanged ---
          const nowIds = new Set();
          for (const e of c.enemies) {
            nowIds.add(e.id);
            if (P.firstId === null || e.id < P.firstId) P.firstId = e.id;
            if (e.id > P.maxId) P.maxId = e.id;
            P.idsSeen.add(e.id);
            if (!P.prevIds.has(e.id)) P.newAppearances++;
          }
          P.prevIds = nowIds;

          if (!inFlight) continue;
          P.ticksFlight++;
          const sn = fs ? fs.stageNumber : 1;
          let S = P.byStage[sn];
          if (!S) {
            S = P.byStage[sn] = {
              ticks: 0,
              present: P.FLOORS.map(() => 0),
              count: P.FLOORS.map(() => 0),
              emptyRuns: [],
              busyRuns: [],
              curEmpty: 0,
              curBusy: 0,
            };
          }
          S.ticks++;
          P.aliveSum += c.alive;
          P.pendingSum += c.pending;

          // --- the on-screen census, which is the whole point of this probe ---
          let spanMax = 0;
          const counts = P.FLOORS.map(() => 0);
          for (const e of c.enemies) {
            if (!e.onScreen) continue;
            if (e.spanFrac > spanMax) spanMax = e.spanFrac;
            for (let f = 0; f < P.FLOORS.length; f++) {
              if (e.spanFrac >= P.FLOORS[f]) counts[f]++;
            }
          }
          P.spanMaxSum += spanMax;
          P.enemyShotSum += c.enemyShots;
          for (let f = 0; f < P.FLOORS.length; f++) {
            P.countSum[f] += counts[f];
            if (counts[f] > 0) P.presentTicks[f]++;
          }
          for (let f = 0; f < P.FLOORS.length; f++) {
            S.count[f] += counts[f];
            if (counts[f] > 0) S.present[f]++;
          }
          // run lengths at the arcade-matched DRAWN floor (index 2 = 3.54),
          // kept per stage because the rhythm is a per-stage property too.
          if (counts[2] > 0) {
            S.curBusy++;
            if (S.curEmpty) S.emptyRuns.push(S.curEmpty);
            S.curEmpty = 0;
          } else {
            S.curEmpty++;
            if (S.curBusy) S.busyRuns.push(S.curBusy);
            S.curBusy = 0;
          }
          if (counts[3] >= 2) P.twoAt5++;
          if (counts[4] >= 2) P.twoAt5d++;
          for (const e of c.enemies) {
            // The denominator is every on-screen aircraft an arcade counter
            // could have seen, i.e. the >=3 %W floor its own eye imposes --
            // not `alive`, which is mostly sub-pixel traffic.
            if (!e.onScreen || e.spanFrac < 0.03) continue;
            P.obsTotal++;
            if (e.spanFrac < 0.1) P.obsBelow10++;
            if (e.spanFrac < 0.118) P.obsBelow10d++;
          }
          // run lengths at the two floors that matter
          const has3 = counts[1] > 0;
          const has10 = counts[3] > 0;
          if (has3) {
            P.cur.busy3++;
            pushRun('empty3', P.cur.empty3);
            P.cur.empty3 = 0;
          } else {
            P.cur.empty3++;
            pushRun('busy3', P.cur.busy3);
            P.cur.busy3 = 0;
          }
          if (has10) {
            P.cur.busy10++;
            pushRun('empty10', P.cur.empty10);
            P.cur.empty10 = 0;
          } else {
            P.cur.empty10++;
            pushRun('busy10', P.cur.busy10);
            P.cur.busy10 = 0;
          }

          // --- fairness/volume, polled at 10 Hz (the hook touches no RNG) ---
          if (window.__fairness && P.ticksTotal % 6 === 0) {
            const f = window.__fairness();
            if (P.shotsFired0 === null) P.shotsFired0 = f.shotsFired;
            P.shotsFiredLast = f.shotsFired;
            if (P.trains0 === null) P.trains0 = f.telegraphsStarted;
            P.trainsLast = f.telegraphsStarted;
            // hitLog is a 256-entry RING (combat.js shift()s past that), so
            // "read from the last index I saw" silently re-reads or drops
            // entries once it wraps. Key on the entry's own `t` instead.
            for (const h of f.hitLog) {
              if (h.t <= P.hitLogSeen) continue;
              P.hitLogSeen = h.t;
              P.hitWarnings.push({
                t: h.t,
                warning: h.warning,
                inLife: h.inLifeWarning,
                announced: h.announced,
                fatal: h.fatal,
              });
            }
          }
          if (window.__killDrain && P.ticksTotal % 60 === 0) {
            const d = window.__killDrain();
            for (const k of d.kills) P.ledgerKills.push(k);
            P.ledgerDropped = d.dropped;
          }
        }
      },
      n,
      mode,
      0.1,
    );
  }

  const out = await page.evaluate(() => {
    const P = window.__P;
    if (window.__killDrain) {
      const d = window.__killDrain();
      for (const k of d.kills) P.ledgerKills.push(k);
      P.ledgerDropped = d.dropped;
    }
    // flush the open runs
    for (const k of ['empty3', 'busy3', 'empty10', 'busy10']) {
      if (P.cur[k] > 0) P.runs[k].push(P.cur[k]);
    }
    const pct = (a, b) => (b ? (100 * a) / b : null);
    const q = (arr, p) => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.min(s.length - 1, Math.floor(p * s.length))];
    };
    const lg = P.ledgerKills;
    const gun = lg.filter((k) => k.src === 'vulcan');
    const T = P.ticksFlight;
    return {
      ticksTotal: P.ticksTotal,
      ticksFlight: T,
      states: P.states,
      stageNumbers: [...P.stageNumbers].sort((a, b) => a - b),
      deaths: P.deaths,
      emit_maxid: P.maxId,
      emit_idsSeen: P.idsSeen.size,
      emit_newAppearances: P.newAppearances,
      meanAlive: T ? P.aliveSum / T : null,
      meanPending: T ? P.pendingSum / T : null,
      meanSpanMax: T ? P.spanMaxSum / T : null,
      // ENEMY FIREBALLS IN THE AIR, which is the only enemy-fire statistic
      // that can be compared to the arcade WITHOUT a time-of-flight constant
      // nobody has measured. reference/stage7-enemy-shot-train-t330.png is
      // read in enemy.js as 10-16 fireballs at once.
      meanEnemyShots: T ? P.enemyShotSum / T : null,
      floors: P.FLOORS,
      presentPct: P.presentTicks.map((v) => pct(v, T)),
      byStage: Object.fromEntries(
        Object.entries(P.byStage).map(([k, S]) => {
          if (S.curEmpty) S.emptyRuns.push(S.curEmpty);
          if (S.curBusy) S.busyRuns.push(S.curBusy);
          return [
            k,
            {
              ticks: S.ticks,
              secs: S.ticks / 60,
              // drawn-span bins: idx 2 = >=3 %W drawn, 6 = >=10 %W drawn
              readablePct: pct(S.present[6], S.ticks),
              emptyPct: S.ticks ? 100 - (100 * S.present[2]) / S.ticks : null,
              meanOnScreen3d: S.ticks ? S.count[2] / S.ticks : null,
              meanOnScreen10d: S.ticks ? S.count[6] / S.ticks : null,
              emptyRun_p50_s: q(S.emptyRuns, 0.5) === null ? null : q(S.emptyRuns, 0.5) / 60,
              emptyRun_max_s: S.emptyRuns.length ? Math.max(...S.emptyRuns) / 60 : 0,
              busyRun_p50_s: q(S.busyRuns, 0.5) === null ? null : q(S.busyRuns, 0.5) / 60,
            },
          ];
        }),
      ),
      twoAt5Pct: pct(P.twoAt5, T),
      twoAt5dPct: pct(P.twoAt5d, T),
      obsTotal: P.obsTotal,
      below10Pct: pct(P.obsBelow10, P.obsTotal),
      below10dPct: pct(P.obsBelow10d, P.obsTotal),
      meanOnScreen: P.countSum.map((v) => (T ? v / T : null)),
      // run lengths, in SECONDS
      empty3_runs_s: { n: P.runs.empty3.length, p50: q(P.runs.empty3, 0.5) / 60, p90: q(P.runs.empty3, 0.9) / 60, max: P.runs.empty3.length ? Math.max(...P.runs.empty3) / 60 : 0 },
      busy3_runs_s: { n: P.runs.busy3.length, p50: q(P.runs.busy3, 0.5) / 60, p90: q(P.runs.busy3, 0.9) / 60, max: P.runs.busy3.length ? Math.max(...P.runs.busy3) / 60 : 0 },
      empty10_runs_s: { n: P.runs.empty10.length, p50: q(P.runs.empty10, 0.5) / 60, p90: q(P.runs.empty10, 0.9) / 60, max: P.runs.empty10.length ? Math.max(...P.runs.empty10) / 60 : 0 },
      busy10_runs_s: { n: P.runs.busy10.length, p50: q(P.runs.busy10, 0.5) / 60, p90: q(P.runs.busy10, 0.9) / 60, max: P.runs.busy10.length ? Math.max(...P.runs.busy10) / 60 : 0 },
      shotsFired: P.shotsFiredLast - (P.shotsFired0 ?? 0),
      trainsStarted: P.trainsLast - (P.trains0 ?? 0),
      hits: P.hitWarnings.length,
      hits_fatal: P.hitWarnings.filter((h) => h.fatal).length,
      // The R8 contract, restated as three reads rather than one: a fatal hit
      // must have been ANNOUNCED within the life it killed, and the smallest
      // warning any of them gave is the number R8 published as 2.88 s.
      fatal_unannounced: P.hitWarnings.filter((h) => h.fatal && !h.announced).length,
      fatal_warn_min: (() => {
        const w = P.hitWarnings.filter((h) => h.fatal && h.warning !== null).map((h) => h.warning);
        return w.length ? Math.min(...w) : null;
      })(),
      fatal_inLife_min: (() => {
        const w = P.hitWarnings.filter((h) => h.fatal && h.inLife !== null).map((h) => h.inLife);
        return w.length ? Math.min(...w) : null;
      })(),
      warn_p50: q(P.hitWarnings.filter((h) => h.warning !== null).map((h) => h.warning), 0.5),
      lg_total: lg.length,
      lg_dropped: P.ledgerDropped,
      lg_gun: gun.length,
      lg_gunSpan_p50: q(gun.map((k) => k.span), 0.5),
      lg_gunSpan_sub10: pct(gun.filter((k) => k.span < 0.1).length, gun.length),
      lg_gunDepth_max: gun.length ? Math.max(...gun.map((k) => k.d)) : null,
      paceReport: window.__paceTunables ? window.__paceTunables() : null,
    };
  });

  page.off('pageerror', onErr);
  page.off('console', onConsole);
  out.url = url;
  out.errors = errors;
  return out;
};

let PORT = 0;
const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
// THE BOUND PORT, NOT THE CONFIGURED ONE, and this cost two dead arms
// before it was found. `server.config.server.port` reports what vite was
// ASKED for (vite.config.js's 5173) even when `strictPort:false` made it
// bind something else because 5173 was taken -- by another agent's vite,
// on this same tree, in this same round. The probe then drives THEIR page.
// capture.mjs's header documents exactly this failure and reads
// `httpServer.address().port` only; so does this now.
PORT = server.httpServer.address().port;

// Served-source assertion. The two conclusions this lane publishes rest on
// the gun's span gate still being live (otherwise "gun kills below the
// readable gate stay at 0 %" is vacuous) and on the spawner being the file
// the page actually loaded.
const SERVED = [
  ['/src/weapons/combat.js', 'READABLE_SPAN_FRAC = 0.1'],
  ['/src/game/spawner.js', null],
  ['/src/entities/enemy.js', null],
];
const servedHashes = {};
for (const [p, must] of SERVED) {
  const r = await fetch(`http://127.0.0.1:${PORT}${p}`);
  const t = await r.text();
  servedHashes[p] = createHash('sha256').update(t).digest('hex').slice(0, 16);
  if (must && !t.includes(must)) {
    console.error(`SERVED-CHECK FAILED: ${p} does not contain ${JSON.stringify(must)}`);
    process.exit(3);
  }
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader'],
  protocolTimeout: 0,
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 672, deviceScaleFactor: 1 });

const modes = String(argv.modes ?? 'idle,trk').split(',');
const seeds = String(argv.seeds ?? '1').split(',').map(Number);
const secs = Number(argv.secs ?? 60);
const invincible = argv.invincible !== 'false' && argv.invincible !== false;
const pace = argv.pace ? String(argv.pace) : null;

const arms = [];
for (const mode of modes) {
  if (!MODES.includes(mode)) {
    console.error(`unknown mode ${mode}; known: ${MODES.join(',')}`);
    process.exit(2);
  }
  for (const seed of seeds) {
    process.stderr.write(`[arm] ${mode} seed=${seed} secs=${secs} pace=${pace ?? '(shipped)'}\n`);
    const r = await ARM(page, { mode, secs, seed, invincible, pace });
    r.mode = mode;
    r.seed = seed;
    r.secs = secs;
    r.pace = pace;
    if (r.errors.length) {
      console.error(`ARM PRODUCED ERRORS, refusing: ${mode}/${seed}`, r.errors.slice(0, 4));
      process.exit(4);
    }
    const fs_ = r.ticksFlight / 60;
    r.emitPerS_maxid = r.emit_maxid / fs_;
    r.emitPerS_idsSeen = r.emit_idsSeen / fs_;
    r.emitPerS_newAppear = r.emit_newAppearances / fs_;
    r.killsPerS = r.lg_total / fs_;
    r.roundsPerMin = (r.shotsFired / fs_) * 60;
    arms.push(r);
    process.stderr.write(
      `       emit/s ${r.emitPerS_maxid.toFixed(3)}|${r.emitPerS_idsSeen.toFixed(3)}|${r.emitPerS_newAppear.toFixed(3)}` +
        `  alive ${r.meanAlive.toFixed(2)} pend ${r.meanPending.toFixed(2)}` +
        
        `  pres>=10D ${r.presentPct[6].toFixed(1)}%  EMPTY>=3D ${(100 - r.presentPct[2]).toFixed(1)}%` +
        `  onscr>=3D ${r.meanOnScreen[2].toFixed(2)}  two@5D ${r.twoAt5dPct.toFixed(1)}%  below10D ${r.below10dPct === null ? '-' : r.below10dPct.toFixed(1)}%` +
        `  rds/min ${r.roundsPerMin.toFixed(1)}  kills/s ${r.killsPerS.toFixed(2)}` +
        `  gunsub10 ${r.lg_gunSpan_sub10 === null ? '-' : r.lg_gunSpan_sub10.toFixed(1)}%\n`,
    );
  }
}

const outPath = argv.out ? path.resolve(ROOT, String(argv.out)) : null;
if (outPath) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify({ servedHashes, arms }, null, 2));
  process.stderr.write(`wrote ${outPath}\n`);
}

await browser.close();
await server.close();

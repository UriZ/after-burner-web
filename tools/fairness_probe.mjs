#!/usr/bin/env node
// Deaths per minute, flight-time share and enemy fire volume, read from the
// simulation's own state across a long `?demo=1` run on several seeds.
//
// WHY A SEPARATE PROBE FROM tools/combat_probe.mjs. That one polls
// `window.__combatDebug()`, whose `rngSample` field CONSUMES a draw from the
// shared PRNG — so polling it several hundred times across a 3-minute run
// perturbs the very simulation being measured, and the death count would
// depend on the sampling rate. This probe reads `window.__flowState()` and
// `window.__fairness()` only, neither of which touches the RNG. Validated:
// see --selftest below.
//
// WHAT IT COUNTS, and why each is read rather than inferred:
//   deaths        transitions of flowState.state into 'death'. NOT `lives`,
//                 which is restored to 3 by the continue path, and not
//                 pixels, which cannot distinguish the death animation from
//                 an explosion in front of the jet.
//   flight share  fraction of samples in state 'flight'. The game-feel
//                 critique's headline number.
//   shotsFired    cumulative, from combat.js. R4 gap 5 requires the death
//                 rate to come down with "enemy shot volume unchanged", so
//                 volume has to be a total over the run, not the number of
//                 shots that happen to be in the air when you look.
//   hitLog        per-hit warning time (telegraph + time of flight) and how
//                 far off the aim snapshot the shot already was.
//
// Writes nothing to disk; JSON to stdout. Usage:
//   node tools/fairness_probe.mjs --seeds 4,5,6 --seconds 180
//   node tools/fairness_probe.mjs --selftest

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TICK = 1 / 60;
// src/game/flow/flow.js RESPAWN_INVINCIBLE_S. Mirrored rather than imported
// because the probe drives the page from outside it.
const GRACE_S = 2.0;

function parseArgs(argv) {
  const args = {
    seeds: [4, 5, 6],
    seconds: 180,
    every: 6, // sample every 0.1 s
    urlParams: 'demo=1',
    selftest: false,
    trace: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seeds') args.seeds = argv[++i].split(',').map(Number);
    else if (a === '--seconds') args.seconds = Number(argv[++i]);
    else if (a === '--every') args.every = Number(argv[++i]);
    else if (a === '--url-params') args.urlParams = argv[++i];
    else if (a === '--selftest') args.selftest = true;
    else if (a === '--trace') args.trace = true;
    // interfaces.md I28: a figure needs its TREE STATE. Stamped into the JSON
    // so a published number carries it rather than relying on a report line.
    else if (a === '--tree-state') args.treeState = argv[++i];
  }
  return args;
}

async function runSeed(browser, port, seed, args) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  const search = new URLSearchParams(args.urlParams);
  search.set('fixed', '1');
  search.set('seed', String(seed));
  await page.goto(`http://localhost:${port}/?${search}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

  const samples = Math.round(args.seconds / (args.every * TICK));
  const states = Object.create(null);
  let deaths = 0;
  let prev = null;
  const lifeStarts = [];
  const deathTimes = [];
  const trace = [];
  // Mean enemy rounds in the air, for the cost side of the respawn-clear
  // decision: clearing on respawn must not quietly empty the sky, which is
  // the defect the no-clear-on-death change exists to prevent.
  let airSum = 0;
  let airN = 0;

  for (let i = 0; i < samples; i++) {
    const s = await page.evaluate((n) => {
      window.__step(n);
      const f = window.__flowState();
      const fa = window.__fairness ? window.__fairness() : null;
      return {
        state: f.state, lives: f.lives, stageIndex: f.stageIndex,
        ndc: fa?.playerNdc, air: fa?.shotsInAir,
      };
    }, args.every);
    const t = (i + 1) * args.every * TICK;
    if (args.trace && s.ndc) trace.push([Number(t.toFixed(3)), s.state, s.ndc.x, s.ndc.y]);
    states[s.state] = (states[s.state] ?? 0) + 1;
    if (s.state === 'flight' && s.air !== undefined) { airSum += s.air; airN += 1; }
    if (prev !== 'death' && s.state === 'death') {
      deaths += 1;
      deathTimes.push(Number(t.toFixed(2)));
    }
    if (prev === 'death' && s.state === 'flight') lifeStarts.push(Number(t.toFixed(2)));
    prev = s.state;
  }

  // `__volumeShim` is the escape hatch for measuring a BASELINE arm built from
  // committed `src/weapons/combat.js`, which carries no `__fairness` hook — the
  // hook is part of this lane's own work, so an A/B against committed state
  // would otherwise have no volume figure on the control side at all. The shim
  // is a four-line cumulative counter grafted into the control arm's
  // `enemyShots.spawn` (instrumentation only: no RNG, no state branch) and does
  // not exist in any tree that ships. If both are present `__fairness` wins.
  const fair = await page.evaluate(() => {
    if (window.__fairness) return window.__fairness();
    if (window.__volumeShim) return window.__volumeShim();
    return null;
  });
  await page.close();

  const lifeLens = deathTimes.map((d, i) => d - (i === 0 ? 0 : lifeStarts[i - 1]));
  const total = samples;
  const shareOf = (k) => Number((((states[k] ?? 0) / total) * 100).toFixed(2));
  const fatal = (fair?.hitLog ?? []).filter((h) => h.fatal);
  const warnings = fatal.map((h) => h.warning).filter((w) => w != null).sort((a, b) => a - b);
  const inLife = fatal.map((h) => h.inLifeWarning).filter((w) => w != null).sort((a, b) => a - b);
  // UNANNOUNCED fatal hits: the announcing flare lit before this life began,
  // so no input during the life could have avoided the round. See combat.js
  // _logHit for why this and not deaths/min is the fairness statistic. With
  // clearShots() live this must read 0; a nonzero count is a real leak and
  // `unannouncedAt` gives the times to go and look at.
  const unannounced = fatal.filter((h) => h.announced === false);
  const grace = (fair?.hitLog ?? []).filter((h) => !h.fatal);
  const graceHits = grace.length;
  // A grace-window hit that was ALSO unannounced is the defect itself, caught
  // one step before it becomes a death: a round aimed at the previous life's
  // jet, intersecting the new one, survived only because the 2.0 s window
  // happened to still be open. Splitting the two tells an argument from a
  // measurement — "the grace window is absorbing unannounced rounds" is a
  // claim, and this is its count.
  const graceUnannounced = grace.filter((h) => h.announced === false).length;

  // DEATHS PER MINUTE OF FLIGHT TIME (interfaces.md I27). R4 gap 5 never
  // named its denominator, and wall clock is the wrong one: shortening the
  // death cycle (player-feel lane, 8.5 s -> 5.2 s) puts more flight seconds
  // into the same wall minute, so identical lethality reads WORSE per wall
  // minute than it did when the criterion was drafted. Tuning to the wall
  // clock would therefore mean compensating for another lane's improvement by
  // making the game easier than the arcade.
  //
  // Flight seconds are derived from the per-tick state census below, so this
  // denominator is quantised by `--every` and nothing else. Both figures are
  // published; neither is allowed to stand alone.
  const flightSeconds = ((states.flight ?? 0) / total) * args.seconds;

  return {
    seed,
    seconds: args.seconds,
    deaths,
    deathsPerMin: Number(((deaths / args.seconds) * 60).toFixed(3)),
    flightSeconds: Number(flightSeconds.toFixed(2)),
    deathsPerFlightMin:
      flightSeconds > 0 ? Number(((deaths / flightSeconds) * 60).toFixed(3)) : null,
    deathTimes,
    lifeLengths: lifeLens.map((v) => Number(v.toFixed(2))),
    // THE RESPAWN-INTO-LIVE-FIRE METRIC (player-feel lane ask A3). A life that
    // ends inside RESPAWN_GRACE_S .. RESPAWN_GRACE_S + 1 s is one that was
    // killed by fire the player had no part in provoking — most likely a round
    // that was already in the air when they respawned. Excludes the first life
    // of each credit, which starts from a stage open, not a respawn.
    shortLives: lifeLens.filter((v, i) => i > 0 && v >= GRACE_S && v <= GRACE_S + 1.0).length,
    respawnLives: Math.max(0, lifeLens.length - 1),
    meanShotsInAir: airN ? Number((airSum / airN).toFixed(2)) : null,
    stateShare: {
      flight: shareOf('flight'),
      death: shareOf('death'),
      continue: shareOf('continue'),
      tally: shareOf('tally'),
      launch: shareOf('launch'),
      title: shareOf('title'),
    },
    shotsFired: fair?.shotsFired ?? null,
    shotsPerMin: fair ? Number(((fair.shotsFired / args.seconds) * 60).toFixed(1)) : null,
    telegraphsStarted: fair?.telegraphsStarted ?? null,
    hitsTaken: fair?.playerHitsTaken ?? null,
    fatalHitsLogged: fatal.length,
    warningMedian: warnings.length ? Number(warnings[warnings.length >> 1].toFixed(3)) : null,
    warningMin: warnings.length ? Number(warnings[0].toFixed(3)) : null,
    unannouncedFatalHits: unannounced.length,
    unannouncedAt: unannounced.map((h) => ({ t: h.t, flareLit: h.flareLit, lifeStart: h.lifeStart })),
    inLifeWarningMedian: inLife.length ? Number(inLife[inLife.length >> 1].toFixed(3)) : null,
    inLifeWarningMin: inLife.length ? Number(inLife[0].toFixed(3)) : null,
    graceWindowHits: graceHits,
    graceWindowHitsUnannounced: graceUnannounced,
    kills: fair?.hits ?? null,
    trace: args.trace ? trace : undefined,
    errors,
  };
}

// Instrument validation. Two independent checks on inputs whose answers are
// known before the probe runs:
//  1. `?invincible=1` makes checkPlayerHit always report a miss, so the death
//     count MUST be exactly 0 and the flight share ~100%. A probe that finds
//     deaths there is miscounting state transitions.
//  2. the same seed run twice MUST give identical numbers, and two different
//     seeds MUST NOT (the `seed=` param was silently ignored once already —
//     R3 caught it only because two seeds produced byte-identical output).
async function selftest(browser, port, args) {
  const inv = await runSeed(browser, port, 4, {
    ...args,
    seconds: 30,
    urlParams: 'demo=1&invincible=1',
  });
  const a1 = await runSeed(browser, port, 4, { ...args, seconds: 30 });
  const a2 = await runSeed(browser, port, 4, { ...args, seconds: 30 });
  const b = await runSeed(browser, port, 9, { ...args, seconds: 30 });
  return {
    invincibleDeathsIsZero: inv.deaths === 0,
    invincibleFlightShare: inv.stateShare.flight,
    repeatableDeaths: a1.deaths === a2.deaths && a1.shotsFired === a2.shotsFired,
    seedsDiffer: a1.shotsFired !== b.shotsFired || a1.deaths !== b.deaths,
    detail: { inv, a1, a2, b },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // hmr:false + watch:null is NOT a speed tweak, it is a correctness
  // requirement on a shared tree. With the defaults, any other agent saving
  // a source file mid-run makes Vite push a reload, puppeteer's execution
  // context is destroyed, and the run dies ~2 minutes in ("Execution context
  // was destroyed, most likely because of a navigation"). Worse, a reload
  // that did NOT kill the context would silently restart the simulation and
  // the deaths-per-minute figure would be measured over a run that began
  // again half-way through. Snapshot the tree first if the edits are in
  // files this measurement depends on.
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    if (args.selftest) {
      console.log(JSON.stringify(await selftest(browser, port, args), null, 2));
      return;
    }
    const runs = [];
    for (const seed of args.seeds) runs.push(await runSeed(browser, port, seed, args));
    const mean = (f) => runs.reduce((s, r) => s + f(r), 0) / runs.length;
    console.log(
      JSON.stringify(
        {
          urlParams: args.urlParams,
          secondsPerSeed: args.seconds,
          runs,
          meanDeathsPerMin: Number(mean((r) => r.deathsPerMin).toFixed(3)),
          // I27: pooled, not a mean of per-seed ratios. Total deaths over
          // total flight seconds is the estimator that does not weight a
          // short-flight seed the same as a long one.
          deathsPerFlightMin: Number(
            (
              (runs.reduce((s, r) => s + r.deaths, 0) /
                runs.reduce((s, r) => s + r.flightSeconds, 0)) *
              60
            ).toFixed(3)
          ),
          meanShotsPerMin: Number(mean((r) => r.shotsPerMin).toFixed(1)),
          meanFlightShare: Number(mean((r) => r.stateShare.flight).toFixed(2)),
          totalUnannouncedFatalHits: runs.reduce((s, r) => s + r.unannouncedFatalHits, 0),
          totalFatalHits: runs.reduce((s, r) => s + r.fatalHitsLogged, 0),
          totalGraceWindowHits: runs.reduce((s, r) => s + r.graceWindowHits, 0),
          totalGraceWindowHitsUnannounced: runs.reduce(
            (s, r) => s + r.graceWindowHitsUnannounced,
            0
          ),
          treeState: args.treeState ?? null,
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

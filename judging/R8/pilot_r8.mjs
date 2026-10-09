#!/usr/bin/env node
// R8 combat lane — pilot harness.
//
// WHY THIS EXISTS AND WHY IT IS COMMITTED. R7's gap 1 was found by a probe
// that lived in a scratchpad and was gone by the time the judge read the
// report; the judge had to rebuild it ("I did not use the feel critic's
// probe — it was never committed"). Two independent rebuilds agreeing is
// strong evidence, but it cost a round, so this one ships next to its report.
//
// It drives the game with a SCRIPTED PILOT rather than with ?demo=1, because
// ?demo=1 is a pure function of simTime that cannot dodge and cannot aim, and
// R7 established that it is the best case for three of four acceptance figures
// at once. Every arm below holds the trigger unless its name says otherwise.
//
// HARD-WON MECHANICS, each of which silently produced a plausible wrong
// number for somebody before it was understood:
//   * `?fixed=1` WITHOUT `?demo` injects no input at all. A capture taken
//     that way contains no weapon, no kill and no explosion. Every arm here
//     installs its own stick through window.__setStick.
//   * `combat.hits` RESETS TO 0 at every stage boundary (flow.js), so kills
//     must be accumulated as positive deltas. last-minus-first reported
//     0.372 kills/s for a pilot scoring 2.23.
//   * The MISSILE fires on RELEASE (`!holding && _wasHolding`). An arm that
//     holds the button scores zero missile kills and looks like a finding
//     about the missile.
//   * puppeteer's default protocolTimeout is 180_000 ms and an arm runs
//     inside one page.evaluate, so long arms die *depending on machine load*.
//     Pinned to 0 here, and the tick loop is chunked besides.
//   * Both ends pinned to 127.0.0.1: on macOS `localhost` resolves ::1 first
//     and a run can silently drive ANOTHER AGENT'S dev server.
//
// Every arm asserts the served source it reasons about (sha256 + a spot-check
// of the constant) and REFUSES to run if an assertion fails. Pinning is not
// proof you drove your own tree; the hash is.
//
// Usage:
//   node judging/R8/pilot_r8.mjs --selftest
//   node judging/R8/pilot_r8.mjs --modes still,vert,lat,trk --seeds 1,2,3,4 \
//        --secs 180 --out tools/out/combat-r8/<unique>/arms.json

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

// Files whose constants every conclusion in the R8 combat report rests on.
// `must` is a literal that has to appear in the SERVED text — a hash alone
// tells you the file changed, not which way.
// `must` is a literal that has to appear in the served text. A hash tells
// you the file changed; the literal tells you WHICH WAY, and it is the half
// that catches the case this round actually hit — two other lanes editing
// the shared tree while an arm runs. The R7 feel critic's own closing note:
// "a served-source assertion only covers the files you thought to name", and
// the file that moved under it (`enemySprite.js`) was not one of them. So
// this list covers every file any conclusion in lane-combat.md rests on,
// INCLUDING the two owned by other lanes that the flow and death cycle come
// from.
const SERVED_CHECK = [
  ['/src/weapons/vulcan.js', 'DEFAULT_TARGET_DEPTH = 55'],
  ['/src/weapons/combat.js', 'READABLE_SPAN_FRAC = 0.1'],
  ['/src/weapons/tunables.js', "'assistyfrac'"],
  ['/src/weapons/lockSystem.js', 'LOCK_RADIUS_FRAC = 0.22'],
  ['/src/weapons/enemyShots.js', null],
  ['/src/entities/enemy.js', 'FLY_PAST_DEPTH = 2.6'],
  ['/src/game/spawner.js', 'REACH_CEILING_NDC_Y = 0.64'],
  ['/src/entities/player.js', null],
  ['/src/game/flow/flow.js', null],
  ['/src/game/game.js', null],
];

const MODES = [
  'still', // stick dead centre, never touched. trigger + missile.
  'still2', // PLANTED FAULT: a second, independently written neutral policy.
  'vert', // vertical axis only
  'lat', // lateral axis only
  'trk', // both axes, chases the nearest READABLE target
  'trkall', // both axes, chases the nearest target of any size
  'gunonly', // still + trigger; missile button never pressed
  'msltrk', // tracking + missile; trigger never pulled
  'idle', // CONTROL: no trigger, no missile, no stick. Kills must be ~0.
  'demo', // the autopilot every other gate in this project is measured on
  // The two arms below hold the missile to the ARCADE PILOT'S OWN MEASURED
  // CONSUMPTION RATE instead of spamming it, and they exist because of a
  // measurement, not a hunch. GAME_SPEC.md §3's resupply decode gives the
  // arcade pilot's missile usage directly: stock 50 at t84 and 20 at t163
  // (30 missiles / 79 s = 0.38/s), then 70 at t167 and 22 at t253
  // (48 / 86 s = 0.56/s). So the arcade fires 0.4-0.6 missiles/s.
  // Every pilot in R6 and R7 — mine above included — pulses the button on a
  // 0.4 s duty cycle, which fires ~5/s and runs the stock dry; what then
  // caps the kill rate is flow.js's restock of 50 at every stage boundary,
  // i.e. 50 per ~32 s stage. That makes the missile's contribution a
  // property of the STOCK ECONOMY and not of the pilot's aim, and no change
  // to aiming can move it. These arms remove that confound.
  'arcstill', // stick never touched; trigger held; missile at the arcade's rate
  'arctrk', // two-axis tracking;  trigger held; missile at the arcade's rate
  'thrcyc', // arctrk + cycles the throttle L/M/H — the gap-4a arm
];

function parseArgs(argv) {
  const a = {
    modes: ['still'],
    seeds: [1],
    secs: 60,
    out: null,
    selftest: false,
    readable: 0.1,
    throttle: 1,
    chunk: 600,
    extra: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--modes') a.modes = argv[++i].split(',');
    else if (k === '--seeds') a.seeds = argv[++i].split(',').map(Number);
    else if (k === '--secs') a.secs = Number(argv[++i]);
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--readable') a.readable = Number(argv[++i]);
    else if (k === '--throttle') a.throttle = Number(argv[++i]);
    else if (k === '--chunk') a.chunk = Number(argv[++i]);
    else if (k === '--extra') a.extra = argv[++i];
    else if (k === '--selftest') a.selftest = true;
    else {
      // Unknown flags are a hard error. capture.mjs's header records what a
      // silently-dropped flag cost this project.
      console.error(`pilot_r8: unknown argument "${k}". Refusing to run.`);
      process.exit(2);
    }
  }
  for (const m of a.modes) {
    if (!MODES.includes(m)) {
      // The selftest plants exactly this fault: an unrecognised mode must be
      // REFUSED, not silently fall through to the neutral arm (which would
      // reproduce it exactly and look like a passing control).
      console.error(`pilot_r8: unknown mode "${m}". Known: ${MODES.join(',')}`);
      process.exit(2);
    }
  }
  return a;
}

// ---------------------------------------------------------------------------
// The in-page arm. Runs the whole tick loop inside the page so EVERY TICK is
// sampled: ?demo=1's regime period is exactly 16.000 s and any coarser
// sampling aliases every spread, sd and percentile it has.
// ---------------------------------------------------------------------------
function armBody(mode, ticks, readableGate, throttleIndex, startAt) {
  const s = window.__r8state;
  const stats = window.__combatStats;
  const flow = window.__flowState;
  const fair = window.__fairness;
  const drain = window.__killDrain;

  // --- stick policies. Each reads only the PREVIOUS tick's enemy list, so a
  // policy reacts to what was on screen, the way a pilot does.
  function pick(enemies, anySize) {
    let best = null;
    for (const e of enemies) {
      if (!e.onScreen) continue;
      if (!anySize && e.spanFrac < readableGate) continue;
      if (!best || e.depth < best.depth) best = e;
    }
    return best;
  }
  const K = 2.2; // proportional gain; saturates the stick ~0.45 NDC off-aim
  function clamp1(v) {
    return v < -1 ? -1 : v > 1 ? 1 : v;
  }
  // THE PILOT AIMS THE SIGHT, NOT THE JET, and that distinction is
  // load-bearing rather than pedantic. The sight sits 0.30 NDC above the
  // airframe (combat.js SIGHT_NDC_Y_OFFSET) and it is what the weapon
  // converges on, so a pilot that drove the target onto the JET's own
  // altitude would be flying 15 %H low on every pass — it would understate
  // what the stick is worth by exactly the amount the fix is trying to make
  // the stick worth. Read from the live projected sight sprites
  // (window.__sight) rather than from the constant, so it stays correct
  // under roll; the constant is only the fallback if the sight is isolated
  // off.
  function aimPoint() {
    const sg = window.__sight ? window.__sight() : null;
    if (sg) return { x: sg.ndcX, y: sg.ndcY };
    return { x: s.jetX, y: s.jetY + 0.3 };
  }
  function policy(mode, seen, tick) {
    // missile is PULSED: held for 12 ticks then released for 12. The salvo
    // fires on release (combat.js `!holding && _wasHolding`).
    const mPulse = tick % 24 < 12;
    // THE ARCADE PILOT'S OWN MISSILE RATE. 6 ticks held = 0.1 s = exactly
    // one lock (LOCK_INTERVAL_S), released, then idle for the rest of a
    // 120-tick cycle: ~1 missile per 2.0 s = 0.5/s, inside the arcade's
    // measured 0.38-0.56/s (GAME_SPEC.md §3's resupply decode: 50 at t84 ->
    // 20 at t163, and 70 at t167 -> 22 at t253). The 24-tick pulse above
    // fires ~5/s and empties the stock, which makes the missile's kill rate
    // a property of flow.js's per-stage restock rather than of the pilot.
    const arcPulse = tick % 120 < 6;
    if (mode === 'arcstill') return { x: 0, y: 0, fire: true, missile: arcPulse };
    if (mode === 'still') return { x: 0, y: 0, fire: true, missile: mPulse };
    if (mode === 'still2') {
      // Independently written. Deliberately NOT a copy of `still`: if the two
      // disagree the harness is wrong somewhere, and that is the point.
      const o = { fire: true, missile: (tick % 24) < 12 };
      o.x = 0.0;
      o.y = 0.0;
      return o;
    }
    if (mode === 'idle') return { x: 0, y: 0, fire: false, missile: false };
    if (mode === 'gunonly') return { x: 0, y: 0, fire: true, missile: false };
    const t = pick(seen, mode === 'trkall');
    const aim = aimPoint();
    const dx = t ? clamp1((t.ndcX - aim.x) * K) : 0;
    const dy = t ? clamp1((t.ndcY - aim.y) * K) : 0;
    if (mode === 'vert') return { x: 0, y: dy, fire: true, missile: mPulse };
    if (mode === 'lat') return { x: dx, y: 0, fire: true, missile: mPulse };
    if (mode === 'msltrk') return { x: dx, y: dy, fire: false, missile: mPulse };
    if (mode === 'arctrk') return { x: dx, y: dy, fire: true, missile: arcPulse };
    if (mode === 'thrcyc') {
      // The throttle-wiring arm (gap 4a). Dwells 2.0 s per detent through
      // L, M, H, M so M gets half the time and the two excursions a quarter
      // each — and crucially the pilot policy is IDENTICAL between the
      // closure=0 and closure=1 arms, so the only difference between them is
      // the constant. `?demo=1` also cycles the throttle (THROTTLE_PATTERN)
      // but barely holds the trigger, and the enemy round count depends on
      // how many shooters the player killed, so the pilot has to be fixed.
      const pattern = [0, 1, 2, 1];
      return {
        x: dx,
        y: dy,
        fire: true,
        missile: arcPulse,
        throttleIndex: pattern[Math.floor(tick / 120) % 4],
      };
    }
    return { x: dx, y: dy, fire: true, missile: mPulse }; // trk / trkall
  }

  for (let i = 0; i < ticks; i++) {
    const tick = startAt + i;
    if (mode !== 'demo') {
      // throttleIndex FIRST so a policy that drives the throttle itself
      // (thrcyc) wins over the run-wide default. The other order silently
      // pinned every arm to the default detent, which would have made the
      // gap-4a arms differ in nothing and read as "closure has no effect".
      window.__setStick({ throttleIndex, ...policy(mode, s.seen, tick) });
    }
    window.__step(1);

    const c = stats();
    const f = flow();
    const fr = fair();
    if (!c) continue;

    s.seen = c.enemies;
    s.jetX = f.jetNdcX ?? 0;
    s.jetY = f.jetNdcY ?? 0;
    s.ticks += 1;
    const flying = f.state === 'flight';
    if (flying) s.flightTicks += 1;

    // kills: positive deltas of `hits` (it resets at every stage boundary),
    // kept ONLY as a cross-check on the kill ledger below.
    if (c.hits > s.prevHits) s.hitDeltaKills += c.hits - s.prevHits;
    s.prevHits = c.hits;

    // --- the kill ledger. Direct read: weapon, size and depth per kill.
    const d = drain();
    for (const k of d.kills) {
      s.kills.push(k);
      s.bySrc[k.src] = (s.bySrc[k.src] ?? 0) + 1;
      if (k.span < readableGate) s.subReadable[k.src] = (s.subReadable[k.src] ?? 0) + 1;
    }
    s.killsDropped = d.dropped;

    // --- readable-enemy presence and droughts (flight ticks only)
    if (flying) {
      let readable = false;
      let maxSpan = 0;
      for (const e of c.enemies) {
        if (!e.onScreen) continue;
        if (e.spanFrac > maxSpan) maxSpan = e.spanFrac;
        if (e.spanFrac >= readableGate) readable = true;
      }
      if (readable) {
        s.readableTicks += 1;
        if (s.droughtRun > s.worstDrought) s.worstDrought = s.droughtRun;
        s.droughtRun = 0;
      } else {
        s.droughtRun += 1;
      }
      s.spanSum += maxSpan;
      s.aliveSum += c.alive;
      s.vulcanAirSum += c.vulcanRounds;
      if (c.vulcanRounds > s.maxVulcanAir) s.maxVulcanAir = c.vulcanRounds;
      s.enemyShotsAirSum += c.enemyShots;
      s.missileAirSum += c.missilesInFlight;
    }

    // --- enemy fire volume and fairness
    s.shotsFired = fr.shotsFired;
    s.telegraphsStarted = fr.telegraphsStarted;
    s.missCrossings = fr.missCrossings ?? 0;
    if (fr.playerHitsTaken > s.playerHitsTaken) {
      s.playerHitsTaken = fr.playerHitsTaken;
      // hitLog is capped at 256 with a shift(). Polling every tick makes
      // overflow between polls impossible; keying on `t` makes it provable.
      for (const h of fr.hitLog) {
        if (h.t <= s.lastHitT) continue;
        s.lastHitT = h.t;
        s.hits.push(h);
      }
    }
    // Throttle actually flown, read back from the flow state rather than
    // from the policy that asked for it. The gap-4a arms are a comparison
    // between two closure constants at a FIXED detent distribution, so a
    // detent that silently did not move would make the two arms identical
    // and read as "wiring the throttle has no effect".
    s.throttleTicks[f.throttleIndex] = (s.throttleTicks[f.throttleIndex] ?? 0) + 1;
    s.scrollSpeedSum += f.scrollSpeed ?? 0;
    s.stageMax = Math.max(s.stageMax, f.stageIndex);
    s.score = f.score;
    s.lives = f.lives;
    if (f.state === 'death' || f.deathPhase) s.deathTicks += 1;
  }
  return s;
}

function freshState() {
  return {
    seen: [],
    jetX: 0,
    jetY: 0,
    ticks: 0,
    flightTicks: 0,
    deathTicks: 0,
    prevHits: 0,
    hitDeltaKills: 0,
    kills: [],
    bySrc: {},
    subReadable: {},
    killsDropped: 0,
    readableTicks: 0,
    droughtRun: 0,
    worstDrought: 0,
    spanSum: 0,
    aliveSum: 0,
    vulcanAirSum: 0,
    maxVulcanAir: 0,
    enemyShotsAirSum: 0,
    missileAirSum: 0,
    shotsFired: 0,
    telegraphsStarted: 0,
    missCrossings: 0,
    playerHitsTaken: 0,
    lastHitT: -1,
    hits: [],
    stageMax: 0,
    score: 0,
    lives: 0,
    throttleTicks: {},
    scrollSpeedSum: 0,
  };
}

function q(sorted, p) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function summarise(mode, seed, st, secs, readableGate) {
  const flightS = st.flightTicks / 60;
  const spans = st.kills.map((k) => k.span).sort((a, b) => a - b);
  const depths = st.kills.map((k) => k.d).sort((a, b) => a - b);
  const gunSpans = st.kills.filter((k) => k.src === 'vulcan').map((k) => k.span).sort((a, b) => a - b);
  const gunDepths = st.kills.filter((k) => k.src === 'vulcan').map((k) => k.d).sort((a, b) => a - b);
  const n = st.kills.length;
  const sub = st.kills.filter((k) => k.span < readableGate).length;
  const fatal = st.hits.filter((h) => h.fatal);
  const warnings = st.hits.map((h) => h.warning).filter((w) => w != null).sort((a, b) => a - b);
  return {
    mode,
    seed,
    secs,
    ticks: st.ticks,
    flightTicks: st.flightTicks,
    flightS,
    flightShare: st.ticks ? st.flightTicks / st.ticks : 0,
    kills: n,
    killsFromHitDelta: st.hitDeltaKills,
    killsDropped: st.killsDropped,
    killsPerFlightS: flightS ? n / flightS : 0,
    killsPerWallS: secs ? n / secs : 0,
    bySrc: st.bySrc,
    subReadableBySrc: st.subReadable,
    subReadableShare: n ? sub / n : null,
    killSpanP50: q(spans, 0.5),
    killSpanP90: q(spans, 0.9),
    killDepthP50: q(depths, 0.5),
    killDepthP90: q(depths, 0.9),
    gunKills: gunSpans.length,
    gunSpanP50: q(gunSpans, 0.5),
    gunDepthP50: q(gunDepths, 0.5),
    gunDepthMax: gunDepths.length ? gunDepths[gunDepths.length - 1] : null,
    gunSubReadableShare: gunSpans.length
      ? gunSpans.filter((s) => s < readableGate).length / gunSpans.length
      : null,
    readableShare: st.flightTicks ? st.readableTicks / st.flightTicks : 0,
    worstDroughtS: Math.max(st.worstDrought, st.droughtRun) / 60,
    meanMaxSpan: st.flightTicks ? st.spanSum / st.flightTicks : 0,
    meanAlive: st.flightTicks ? st.aliveSum / st.flightTicks : 0,
    meanVulcanAir: st.flightTicks ? st.vulcanAirSum / st.flightTicks : 0,
    maxVulcanAir: st.maxVulcanAir,
    meanEnemyShotsAir: st.flightTicks ? st.enemyShotsAirSum / st.flightTicks : 0,
    meanMissileAir: st.flightTicks ? st.missileAirSum / st.flightTicks : 0,
    enemyShotsFired: st.shotsFired,
    enemyRoundsPerFlightMin: flightS ? (st.shotsFired / flightS) * 60 : 0,
    telegraphsStarted: st.telegraphsStarted,
    // THE pHit DENOMINATOR, and I got it wrong once in the direction that
    // halves the answer. `combat.missCrossings` is incremented by _logMiss,
    // which `checkPlayerHit` calls for EVERY round crossing the player's
    // depth plane — including the one that then hits. It is therefore a
    // count of CROSSINGS, not of misses, and
    //     pHit = playerHitsTaken / missCrossings.
    // Computed as hits/(hits+missCrossings) the `still` arm reads a clean,
    // plausible, stable 50.00 % (359 / 718) instead of its true 100.00 %
    // (359 / 359) — and a clean 50 % is exactly the shape of this project's
    // false alarms. The R7 feel critic's "1 498 = 1 498" is the same
    // quantity read correctly.
    // Known bias, from checkPlayerHit's own header: it `return`s on the
    // first round that hits, so a second round crossing on a killing tick is
    // never logged. Those dropped crossings are mostly misses, so this
    // under-counts the denominator on hit ticks ONLY and biases pHit
    // slightly UP (the comment in combat.js says it cannot, which is the
    // wrong direction; the effect is small and is not corrected here).
    missCrossings: st.missCrossings,
    playerHitsTaken: st.playerHitsTaken,
    crossings: st.missCrossings,
    pHit: st.missCrossings ? st.playerHitsTaken / st.missCrossings : null,
    hitsLogged: st.hits.length,
    unannounced: st.hits.filter((h) => !h.announced).length,
    unannouncedFatal: fatal.filter((h) => !h.announced).length,
    fatalHits: fatal.length,
    warnMin: warnings.length ? warnings[0] : null,
    warnP50: q(warnings, 0.5),
    warnMax: warnings.length ? warnings[warnings.length - 1] : null,
    stageMax: st.stageMax,
    score: st.score,
    throttleTicks: st.throttleTicks,
    throttleShare: Object.fromEntries(
      Object.entries(st.throttleTicks).map(([k, v]) => [k, Number((v / st.ticks).toFixed(4))])
    ),
    meanScrollSpeed: st.ticks ? Number((st.scrollSpeedSum / st.ticks).toFixed(3)) : 0,
  };
}

async function boot() {
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 0, // an arm runs inside one evaluate; the default is 180 s
  });
  return { server, browser, port };
}

async function assertServed(page, port) {
  const out = [];
  for (const [file, must] of SERVED_CHECK) {
    const txt = await page.evaluate(
      async (u) => (await fetch(u)).text(),
      `http://127.0.0.1:${port}${file}`
    );
    const sha = createHash('sha256').update(txt).digest('hex').slice(0, 16);
    if (must && !txt.includes(must)) {
      throw new Error(`SERVED_CHECK failed: ${file} does not contain "${must}"`);
    }
    out.push({ file, bytes: txt.length, sha });
  }
  return out;
}

async function runArm(browser, port, { mode, seed, secs, readable, throttle, chunk, extra }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const sp = new URLSearchParams(extra);
  sp.set('fixed', '1');
  sp.set('seed', String(seed));
  if (mode === 'demo') sp.set('demo', '1');
  const url = `http://127.0.0.1:${port}/?${sp.toString()}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });
  const served = await assertServed(page, port);

  await page.evaluate((fresh) => {
    window.__r8state = JSON.parse(fresh);
  }, JSON.stringify(freshState()));

  const total = Math.round(secs * 60);
  for (let done = 0; done < total; done += chunk) {
    const n = Math.min(chunk, total - done);
    await page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function('mode', 'ticks', 'gate', 'thr', 'startAt', `(${armBody.toString()})(mode,ticks,gate,thr,startAt)`),
      mode,
      n,
      readable,
      throttle,
      done
    );
  }
  const st = await page.evaluate(() => {
    const s = window.__r8state;
    return {
      ...s,
      seen: [],
      // Read back WHAT THE PAGE RAN, not what the caller meant to ask for.
      tunables: window.__gunTunables ? window.__gunTunables() : null,
      poseCensus: window.__poseCensus ? window.__poseCensus() : null,
    };
  });
  await page.close();
  if (errors.length) throw new Error(`page errors in ${mode}/seed${seed}: ${errors.join(' | ')}`);
  return {
    summary: { ...summarise(mode, seed, st, secs, readable), tunables: st.tunables, poseCensus: st.poseCensus },
    kills: st.kills,
    served,
  };
}

// ---------------------------------------------------------------------------
// SELFTEST. Every arm below has produced, or would have produced, a plausible
// wrong number for somebody. The harness refuses to report if any fails.
// ---------------------------------------------------------------------------
async function selftest() {
  const { server, browser, port } = await boot();
  const results = [];
  const fail = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    if (!ok) fail.push(name);
  };
  try {
    // 1. clock advances: 60 __step() must advance simTime by 1.000 s
    {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=1`, { waitUntil: 'load' });
      await page.waitForFunction('window.__frameReady === true');
      const dt = await page.evaluate(() => {
        const t0 = window.__combatStats().simTime;
        window.__step(60);
        return window.__combatStats().simTime - t0;
      });
      check('clock: 60 steps == 1.000 s', Math.abs(dt - 1) < 1e-6, dt.toFixed(6));
      // 2. stick moves the jet and UP IS UP
      const ud = await page.evaluate(() => {
        const read = (y) => {
          window.__setStick({ x: 0, y });
          window.__step(180);
          return window.__flowState().jetNdcY;
        };
        return [read(1), read(-1)];
      });
      check('stick: full-up is above full-down', ud[0] > ud[1], ud.map((v) => v.toFixed(3)).join(' / '));
      await page.close();
    }
    // 3. PLANTED FAULT: an unrecognised --mode must be REFUSED by the CLI,
    //    not silently fall through to the neutral arm — which would
    //    reproduce `still` exactly and read as a passing control. Run as a
    //    real child process, because the thing under test is the exit code.
    {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--modes', 'nonesuch', '--out', '/dev/null'], {
        encoding: 'utf8',
      });
      check(
        'planted fault: unknown --mode is refused with a nonzero exit',
        r.status === 2 && /unknown mode/.test(r.stderr),
        `exit ${r.status}`
      );
      const r2 = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--modes', 'still'], {
        encoding: 'utf8',
      });
      check('planted fault: a missing --out is refused', r2.status === 2, `exit ${r2.status}`);
    }
    // 4. the trigger has an effect, and 5. the kill ledger agrees with the
    //    independent hits-delta count
    {
      const fire = await runArm(browser, port, { mode: 'still', seed: 1, secs: 20, readable: 0.1, throttle: 1, chunk: 600, extra: '' });
      const idle = await runArm(browser, port, { mode: 'idle', seed: 1, secs: 20, readable: 0.1, throttle: 1, chunk: 600, extra: '' });
      check(
        'trigger has an effect: still out-kills idle',
        fire.summary.kills > idle.summary.kills,
        `${fire.summary.kills} vs ${idle.summary.kills}`
      );
      check(
        'control: an idle pilot kills nothing',
        idle.summary.kills === 0,
        String(idle.summary.kills)
      );
      check(
        'kill ledger == hits-delta count',
        fire.summary.kills === fire.summary.killsFromHitDelta,
        `${fire.summary.kills} ledger / ${fire.summary.killsFromHitDelta} delta`
      );
      check('kill ledger lost nothing', fire.summary.killsDropped === 0, String(fire.summary.killsDropped));
      check(
        'every kill carries a weapon',
        fire.summary.kills ===
          Object.entries(fire.summary.bySrc)
            .filter(([k]) => k === 'vulcan' || k === 'missile')
            .reduce((a, [, v]) => a + v, 0),
        JSON.stringify(fire.summary.bySrc)
      );
      // 6. the missile really fires (it launches on RELEASE)
      check(
        'missile pulse actually launches',
        (fire.summary.bySrc.missile ?? 0) > 0 && fire.summary.meanMissileAir > 0,
        `missile kills ${fire.summary.bySrc.missile ?? 0}, mean in air ${fire.summary.meanMissileAir.toFixed(2)}`
      );
      // 7. gunonly really silences the missile
      const g = await runArm(browser, port, { mode: 'gunonly', seed: 1, secs: 20, readable: 0.1, throttle: 1, chunk: 600, extra: '' });
      check(
        'gunonly: no missile kills, gun still firing',
        (g.summary.bySrc.missile ?? 0) === 0 && g.summary.maxVulcanAir > 0,
        `missile ${g.summary.bySrc.missile ?? 0}, max vulcan in air ${g.summary.maxVulcanAir}`
      );
      // 8. msltrk really silences the gun
      const m = await runArm(browser, port, { mode: 'msltrk', seed: 1, secs: 20, readable: 0.1, throttle: 1, chunk: 600, extra: '' });
      check(
        'msltrk: no vulcan rounds ever in the air',
        m.summary.maxVulcanAir === 0 && (m.summary.bySrc.vulcan ?? 0) === 0,
        `max vulcan in air ${m.summary.maxVulcanAir}, vulcan kills ${m.summary.bySrc.vulcan ?? 0}`
      );
      // 9. the independently-written neutral policy reproduces `still` exactly
      const s2 = await runArm(browser, port, { mode: 'still2', seed: 1, secs: 20, readable: 0.1, throttle: 1, chunk: 600, extra: '' });
      check(
        'planted-fault control: still2 reproduces still exactly',
        s2.summary.kills === fire.summary.kills,
        `${s2.summary.kills} vs ${fire.summary.kills}`
      );
      // 10. seeds differ (?seed was silently ignored until R3)
      const s3 = await runArm(browser, port, { mode: 'still', seed: 7, secs: 20, readable: 0.1, throttle: 1, chunk: 600, extra: '' });
      check('seeds differ', s3.summary.kills !== fire.summary.kills, `${fire.summary.kills} vs ${s3.summary.kills}`);
      // 11. chunking does not change the result (determinism control)
      const chunked = await runArm(browser, port, { mode: 'still', seed: 1, secs: 20, readable: 0.1, throttle: 1, chunk: 137, extra: '' });
      check(
        'chunk size does not change the result',
        chunked.summary.kills === fire.summary.kills,
        `${chunked.summary.kills} @137 vs ${fire.summary.kills} @600`
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  [${r.detail}]`);
  if (fail.length) {
    console.error(`\nSELFTEST FAILED: ${fail.join(', ')}`);
    process.exit(1);
  }
  console.log(`\nSELFTEST PASS (${results.length} arms)`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selftest) return selftest();
  if (!args.out) {
    console.error('pilot_r8: --out is REQUIRED (no default: concurrent agents sharing a path is silent corruption).');
    process.exit(2);
  }
  const { server, browser, port } = await boot();
  const rows = [];
  const allKills = {};
  let served = null;
  try {
    for (const mode of args.modes) {
      for (const seed of args.seeds) {
        const r = await runArm(browser, port, { ...args, mode, seed });
        served ??= r.served;
        rows.push(r.summary);
        allKills[`${mode}-${seed}`] = r.kills;
        const s = r.summary;
        console.log(
          `${mode.padEnd(8)} seed${seed}  kills ${String(s.kills).padStart(4)}` +
            `  ${s.killsPerFlightS.toFixed(3)}/s-flight  gun ${s.bySrc.vulcan ?? 0}` +
            `  msl ${s.bySrc.missile ?? 0}  span p50 ${((s.killSpanP50 ?? 0) * 100).toFixed(2)}%W` +
            `  subread ${((s.subReadableShare ?? 0) * 100).toFixed(1)}%` +
            `  readable ${(s.readableShare * 100).toFixed(1)}%  pHit ${((s.pHit ?? 0) * 100).toFixed(2)}%` +
            `  rnd/min ${s.enemyRoundsPerFlightMin.toFixed(1)}`
        );
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  // pooled per mode
  const pooled = {};
  for (const mode of args.modes) {
    const rs = rows.filter((r) => r.mode === mode);
    const sum = (f) => rs.reduce((a, r) => a + (f(r) ?? 0), 0);
    const kills = rs.flatMap((r) => allKills[`${mode}-${r.seed}`] ?? []);
    const spans = kills.map((k) => k.span).sort((a, b) => a - b);
    const gun = kills.filter((k) => k.src === 'vulcan');
    const gunSpans = gun.map((k) => k.span).sort((a, b) => a - b);
    const gunDepths = gun.map((k) => k.d).sort((a, b) => a - b);
    const mslDepths = kills.filter((k) => k.src === 'missile').map((k) => k.d).sort((a, b) => a - b);
    const flightS = sum((r) => r.flightS);
    pooled[mode] = {
      seeds: rs.length,
      flightS,
      wallS: sum((r) => r.secs),
      kills: kills.length,
      killsPerFlightS: flightS ? kills.length / flightS : 0,
      perSeedKillsPerFlightS: rs.map((r) => Number(r.killsPerFlightS.toFixed(4))),
      gunKills: gun.length,
      mslKills: kills.length - gun.length,
      killSpanP50: q(spans, 0.5),
      subReadableShare: spans.length ? spans.filter((s) => s < args.readable).length / spans.length : null,
      gunSpanP50: q(gunSpans, 0.5),
      gunDepthP50: q(gunDepths, 0.5),
      gunDepthMax: gunDepths.length ? gunDepths[gunDepths.length - 1] : null,
      gunSubReadableShare: gunSpans.length
        ? gunSpans.filter((s) => s < args.readable).length / gunSpans.length
        : null,
      mslDepthP50: q(mslDepths, 0.5),
      readableShare: sum((r) => r.readableShare * r.flightTicks) / sum((r) => r.flightTicks),
      worstDroughtS: Math.max(...rs.map((r) => r.worstDroughtS)),
      enemyRoundsPerFlightMin: (sum((r) => r.enemyShotsFired) / flightS) * 60,
      pHit: sum((r) => r.playerHitsTaken) / sum((r) => r.crossings),
      unannouncedFatal: sum((r) => r.unannouncedFatal),
      hitsLogged: sum((r) => r.hitsLogged),
      warnMin: Math.min(...rs.map((r) => r.warnMin ?? Infinity)),
      meanAlive: sum((r) => r.meanAlive * r.flightTicks) / sum((r) => r.flightTicks),
    };
  }
  await mkdir(path.dirname(args.out), { recursive: true });
  await writeFile(
    args.out,
    JSON.stringify({ args, served, rows, pooled, kills: allKills }, null, 1)
  );
  console.log('\n--- pooled ---');
  for (const [m, p] of Object.entries(pooled)) {
    console.log(
      `${m.padEnd(8)} ${p.killsPerFlightS.toFixed(3)}/s  gun ${p.gunKills} msl ${p.mslKills}` +
        `  span p50 ${((p.killSpanP50 ?? 0) * 100).toFixed(2)}%W  subread ${((p.subReadableShare ?? 0) * 100).toFixed(1)}%` +
        `  gun d p50 ${(p.gunDepthP50 ?? 0).toFixed(1)} max ${(p.gunDepthMax ?? 0).toFixed(1)}` +
        `  readable ${(p.readableShare * 100).toFixed(1)}%  drought ${p.worstDroughtS.toFixed(2)}s` +
        `  rnd/min ${p.enemyRoundsPerFlightMin.toFixed(1)}  pHit ${(p.pHit * 100).toFixed(2)}%`
    );
  }
  console.log('wrote', args.out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

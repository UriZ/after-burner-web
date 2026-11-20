#!/usr/bin/env node
// R40 threat-pacing — THE PER-DEATH SOURCE-VISIBILITY OPERATOR.
//
// Four consecutive fresh players have reported "the fireball came out of
// nowhere — I never saw the shot or the plane that got me", after three rounds
// (R36 size, R37 sound, R38 strobe) each verified a fix to the ROUND's pixels.
// This probe stops measuring the round and measures the FIRER.
//
// THE OPERATOR, stated so it can be argued with:
//
//   SOURCE-VISIBLE TIME of a fatal hit = the seconds, inside the window
//   [flare lit, impact], during which the enemy that fired the killing round
//   was DRAWN ON SCREEN — its projected centre inside the 320x224 frame AND
//   its drawn width >= 0.02 of frame width (6.4 px: the same readable-size
//   floor R36 applied to the fatal round itself).
//
//   A death is SOURCED iff its source-visible time is >= 1.167 s — the
//   project's standing warning floor. The claim it encodes: the player had a
//   full reaction-floor's worth of time in which the thing shooting at them
//   was something they could look at.
//
// Not "on screen at impact": that is unsatisfiable for a ground battery by
// construction, and the measurement says so rather than the operator hiding
// it. The ground scrolls 68.93 u/s while a battery round closes at 8-20 u/s,
// so a turret ALWAYS outruns its own round off the bottom of the frame. Any
// operator demanding the firer be present at impact would mark every battery
// death unsourceable forever and could never be driven to zero.
//
// HOW THE FIRER IS IDENTIFIED. The hitLog carries the killing round's launch
// NDC and depth (fromX/fromY/fromD — R36 added them). Launch position IS the
// firer's projection at the fire tick, so at the fire tick the firer is the
// roster entry nearest (fromX, fromY, fromD). The match RESIDUAL is reported
// per death: a bad attribution is visible rather than silent. The firer is
// then tracked backward to the flare and forward to impact by nearest-neighbour
// continuity within its own type, and the track is reported too (a lost track
// shows up as a short `trackedS`, not as a confident wrong number).
//
// Polls `__fairness()` once per tick — no RNG (combat.js:505).
//
// Usage:
//   node source_probe.mjs --root <dir> --seeds 4,5,6 --seconds 180 [--selftest]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';

const MIN_W = 0.02;
const FLOOR_S = 1.167;
const TELE_AIR = 1.0;
const TELE_BATTERY = 0.4;
const onScreen = (p, w) => p[0] >= 0 && p[0] <= 320 && p[1] >= 0 && p[1] <= 224 && w >= MIN_W;

function parseArgs(argv) {
  const a = { root: null, seeds: [4, 5, 6], seconds: 180, params: 'demo=1', selftest: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--root') a.root = argv[++i];
    else if (k === '--seeds') a.seeds = argv[++i].split(',').map(Number);
    else if (k === '--seconds') a.seconds = Number(argv[++i]);
    else if (k === '--params') a.params = argv[++i];
    else if (k === '--selftest') a.selftest = true;
    else { console.error(`unknown arg ${k}`); process.exit(2); }
  }
  if (!a.root) { console.error('--root is required'); process.exit(2); }
  return a;
}

async function run(browser, port, seed, args) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const search = new URLSearchParams(args.params);
  search.set('fixed', '1');
  search.set('seed', String(seed));
  await page.goto(`http://127.0.0.1:${port}/?${search}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 30000 });

  const ticks = Math.round(args.seconds * 60);
  const roster = new Map(); // tick -> enemy array
  const hits = [];
  let prevHitLen = 0;
  for (let i = 0; i < ticks; i += 60) {
    const n = Math.min(60, ticks - i);
    const chunk = await page.evaluate((k) => {
      const out = [];
      for (let j = 0; j < k; j++) {
        window.__step(1);
        const fa = window.__fairness();
        out.push({
          e: fa.enemies.map((x) => ({ t: x.type, p: x.px, d: x.d, w: x.wFrac })),
          hl: fa.hitLog.length,
          last: fa.hitLog.slice(-4),
        });
      }
      return out;
    }, n);
    chunk.forEach((s, j) => {
      const tick = i + j + 1;
      roster.set(tick, s.e);
      if (s.hl > prevHitLen) {
        for (const h of s.last.slice(-(s.hl - prevHitLen))) hits.push({ tick, h });
        prevHitLen = s.hl;
      }
    });
  }
  await page.close();

  const results = [];
  for (const { tick, h } of hits) {
    if (!h.fatal || h.warning == null) continue;
    const teleS = h.type === 'battery' ? TELE_BATTERY : TELE_AIR;
    const fireTick = tick - Math.round((h.warning - teleS) * 60);
    const flareTick = tick - Math.round(h.warning * 60);
    const want = [((h.fromX + 1) / 2) * 320, ((1 - h.fromY) / 2) * 224];
    let best = null, bestErr = Infinity;
    for (const e of roster.get(fireTick) ?? []) {
      const err = Math.hypot(e.p[0] - want[0], e.p[1] - want[1]) + Math.abs(e.d - h.fromD) * 2;
      if (err < bestErr) { bestErr = err; best = e; }
    }
    if (!best) { results.push({ tick, type: h.type, matched: false }); continue; }
    // Track the firer across [flareTick, impact] by nearest-neighbour within type.
    let visible = 0, tracked = 0;
    const walk = (from, to, step) => {
      let cur = best;
      for (let t = from; step > 0 ? t <= to : t >= to; t += step) {
        const r = roster.get(t);
        if (!r) break;
        let c = null, ce = Infinity;
        for (const e of r) {
          if (e.t !== cur.t) continue;
          const err = Math.hypot(e.p[0] - cur.p[0], e.p[1] - cur.p[1]) + Math.abs(e.d - cur.d) * 2;
          if (err < ce) { ce = err; c = e; }
        }
        if (!c || ce > 40) break;
        tracked += 1;
        if (onScreen(c.p, c.w)) visible += 1;
        cur = c;
      }
    };
    walk(fireTick - 1, Math.max(1, flareTick), -1);
    walk(fireTick, tick, 1);
    results.push({
      tick, type: h.type, matched: true, residual: +bestErr.toFixed(1),
      warning: +h.warning.toFixed(3),
      fromD: h.fromD, fromY: h.fromY,
      firePxY: +best.p[1].toFixed(1), fireW: +best.w.toFixed(3),
      sourceVisibleS: +(visible / 60).toFixed(3),
      trackedS: +(tracked / 60).toFixed(3),
      sourced: visible / 60 >= FLOOR_S - 1e-9,
      announced: h.announced,
    });
  }
  const fatal = results.filter((r) => r.matched);
  return {
    seed, fatalHits: results.length, matched: fatal.length,
    violations: fatal.filter((r) => !r.sourced).length,
    unannounced: results.filter((r) => r.announced === false).length,
    minWarning: fatal.length ? Math.min(...fatal.map((r) => r.warning)) : null,
    minSourceVisibleS: fatal.length ? Math.min(...fatal.map((r) => r.sourceVisibleS)) : null,
    byKiller: fatal.reduce((a, r) => { a[r.type] = (a[r.type] ?? 0) + 1; return a; }, {}),
    deaths: results,
    errors: errors.slice(0, 3),
  };
}

const args = parseArgs(process.argv.slice(2));
const server = await createServer({
  root: args.root,
  configFile: path.join(args.root, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
  // R40: this machine runs several lanes' probes at once and load spikes made
  // CDP's default 180 s call timeout fire mid-run, killing 3-minute arms with a
  // ProtocolError. 0 = no timeout: a slow reply is slow, not a failed run.
  protocolTimeout: 0 });
try {
  // INSTRUMENT VALIDATION on inputs whose answer is known before the run:
  //  1. ?invincible=1 makes checkPlayerHit always miss, so there must be ZERO
  //     fatal hits. An operator that scores deaths there is reading the wrong
  //     log.
  //  2. the same seed twice must be identical; two seeds must not be (the
  //     `seed=` param was silently ignored once already — R3).
  if (args.selftest) {
    const inv = await run(browser, port, 4, { ...args, seconds: 45, params: 'demo=1&invincible=1' });
    const a1 = await run(browser, port, 4, { ...args, seconds: 45 });
    const a2 = await run(browser, port, 4, { ...args, seconds: 45 });
    const b = await run(browser, port, 9, { ...args, seconds: 45 });
    console.log(JSON.stringify({
      invincibleFatalIsZero: inv.fatalHits === 0,
      repeatable: JSON.stringify(a1.deaths) === JSON.stringify(a2.deaths),
      seedsDiffer: JSON.stringify(a1.deaths) !== JSON.stringify(b.deaths),
      a1: { fatal: a1.fatalHits, viol: a1.violations, minSrc: a1.minSourceVisibleS, byKiller: a1.byKiller },
      b: { fatal: b.fatalHits, viol: b.violations, minSrc: b.minSourceVisibleS, byKiller: b.byKiller },
    }, null, 2));
  } else {
    const runs = [];
    for (const seed of args.seeds) runs.push(await run(browser, port, seed, args));
    const all = runs.flatMap((r) => r.deaths).filter((d) => d.matched);
    console.log(JSON.stringify({
      root: args.root, seconds: args.seconds, seeds: args.seeds,
      totalFatal: runs.reduce((a, r) => a + r.fatalHits, 0),
      totalMatched: all.length,
      VIOLATIONS: all.filter((d) => !d.sourced).length,
      totalUnannounced: runs.reduce((a, r) => a + r.unannounced, 0),
      minWarning: all.length ? Math.min(...all.map((d) => d.warning)) : null,
      minSourceVisibleS: all.length ? Math.min(...all.map((d) => d.sourceVisibleS)) : null,
      medSourceVisibleS: all.length ? all.map((d) => d.sourceVisibleS).sort((a, b) => a - b)[all.length >> 1] : null,
      maxResidual: all.length ? Math.max(...all.map((d) => d.residual)) : null,
      byKiller: all.reduce((a, d) => { a[d.type] = (a[d.type] ?? 0) + 1; return a; }, {}),
      runs,
    }, null, 2));
  }
} finally {
  await browser.close();
  await server.close();
}

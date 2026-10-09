#!/usr/bin/env node
// R8 JUDGE's own probe. Written from scratch; it shares no code with
// judging/R8/pilot_r8.mjs. It exists so the R8 combat lane's headline
// figures have an independent operator beside them.
//
// INDEPENDENCE, stated precisely, because "two implementations agreeing"
// is the defect class R8 itself named (two correct measurements of two
// different things that look like one thing):
//   * EMISSION is measured THREE ways per arm from one run: (a) max enemy
//     id minus the first id seen, (b) the cardinality of the set of all
//     ids ever observed, (c) the count of ids appearing in the live list
//     that were not in the previous tick's live list. (a) is the lane's
//     operator; (b) and (c) are mine. (b) and (c) can only equal (a) if
//     the counter is dense and nothing was created-then-destroyed inside
//     one tick.
//   * KILLS are inferred from the LIVE LIST, not from the lane's kill
//     ledger: an id that leaves the list is a departure, and its last
//     observed depth classifies it (near FLY_PAST_DEPTH = 2.6 -> flew
//     past; anything else -> killed). The lane's ledger is drained in the
//     same run and reported BESIDE mine, never instead of it.
//   * READABLE PRESENCE is recomputed from per-enemy spanFrac/onScreen.
//
// `?fixed=1` alone injects NO INPUT. Every arm installs its own stick.
// `combat.hits` resets at stage boundaries, so nothing here uses hits
// last-minus-first.

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

const MODES = ['still', 'trk', 'idle', 'gunonly', 'msltrk', 'arctrk', 'arcstill', 'demo'];

// ---------------------------------------------------------------------------
// The in-page arm. Everything inside here runs in the page; the accumulator
// logic is mine.
// ---------------------------------------------------------------------------
const ARM = async (page, { mode, secs, seed, invincible, gun, extra }) => {
  const q = new URLSearchParams();
  q.set('fixed', '1');
  q.set('seed', String(seed));
  if (invincible) q.set('invincible', '1');
  if (mode === 'demo') q.set('demo', '1');
  if (gun) q.set('gun', gun);
  if (extra) for (const [k, v] of Object.entries(extra)) q.set(k, v);
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

  // Fresh accumulator in the page.
  await page.evaluate(() => {
    window.__J = {
      // emission
      firstId: null,
      maxId: 0,
      idsSeen: new Set(),
      newAppearances: 0,
      prevIds: new Set(),
      lastSeen: new Map(), // id -> {d, span, ndcY}
      // departures
      departKilled: 0,
      departFlyPast: 0,
      departReceded: 0,
      killSpans: [],
      killDepths: [],
      flyPastSpans: [],
      departDepths: [], // EVERY departure, unclassified — the control reads this
      // readability
      ticksFlight: 0,
      ticksReadable: 0,
      ticksAnyEnemy: 0,
      droughtCur: 0,
      droughtMax: 0,
      aliveSum: 0,
      spanMaxSum: 0,
      // ledger (the lane's own, drained, reported beside mine)
      ledgerKills: [],
      ledgerDropped: 0,
      // flow
      stageNumbers: new Set(),
      states: {},
      ticksTotal: 0,
      deaths: 0,
      prevLives: null,
      enemyShotSum: 0,
    };
  });

  for (let done = 0; done < TICKS; done += CHUNK) {
    const n = Math.min(CHUNK, TICKS - done);
    await page.evaluate(
      async (n, mode, READABLE) => {
        const J = window.__J;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        for (let i = 0; i < n; i++) {
          // ---- decide the stick for THIS tick from last tick's state ----
          const cs = window.__combatStats ? window.__combatStats() : null;
          const sight = window.__sight ? window.__sight() : null;
          let stick = { x: 0, y: 0, fire: false, missile: false, throttleIndex: 1 };
          if (mode === 'idle') {
            // control: nothing at all
          } else if (mode === 'still' || mode === 'gunonly' || mode === 'arcstill') {
            stick.fire = true;
          } else {
            stick.fire = mode !== 'msltrk';
            // tracking: drive the SIGHT onto the nearest readable target
            if (cs && cs.enemies.length) {
              const sx = sight ? sight.ndcX : 0;
              const sy = sight ? sight.ndcY : 0.30;
              let best = null;
              for (const e of cs.enemies) {
                if (e.spanFrac < READABLE) continue;
                if (!best || e.depth < best.depth) best = e;
              }
              if (best) {
                J.__steer = (J.__steer ?? 0) + 1;
                stick.x = clamp((best.ndcX - sx) * 2.2, -1, 1);
                stick.y = clamp((best.ndcY - sy) * 2.2, -1, 1);
              }
            }
          }
          // missile: fires on RELEASE. Hold for H ticks then release.
          if (mode !== 'idle' && mode !== 'gunonly') {
            const arcade = mode === 'arctrk' || mode === 'arcstill';
            const period = arcade ? 120 : 24; // 2.0 s vs 0.4 s
            const ph = J.ticksTotal % period;
            stick.missile = ph < period - 1;
          }
          if (mode !== 'demo') window.__setStick(stick);

          window.__step(1);
          J.ticksTotal++;

          // ---- read back ----
          const fs = window.__flowState ? window.__flowState() : null;
          if (fs) {
            J.states[fs.state] = (J.states[fs.state] ?? 0) + 1;
            J.stageNumbers.add(fs.stageNumber);
            if (J.prevLives !== null && fs.lives < J.prevLives) J.deaths++;
            J.prevLives = fs.lives;
          }
          const inFlight = !fs || fs.state === 'flight';
          const c = window.__combatStats ? window.__combatStats() : null;
          if (!c) continue;

          // emission, three operators
          const nowIds = new Set();
          let spanMax = 0;
          let readable = false;
          for (const e of c.enemies) {
            nowIds.add(e.id);
            if (J.firstId === null || e.id < J.firstId) J.firstId = e.id;
            if (e.id > J.maxId) J.maxId = e.id;
            J.idsSeen.add(e.id);
            if (!J.prevIds.has(e.id)) J.newAppearances++;
            const prev = J.lastSeen.get(e.id);
            J.lastSeen.set(e.id, {
              d: e.depth,
              span: e.spanFrac,
              ndcY: e.ndcY,
              // sign of depth change on the last tick: >0 = receding
              dd: prev ? e.depth - prev.d : 0,
            });
            if (e.onScreen && e.spanFrac > spanMax) spanMax = e.spanFrac;
            if (e.onScreen && e.spanFrac >= READABLE) readable = true;
          }
          // departures: ids in prevIds that are gone now
          for (const id of J.prevIds) {
            if (nowIds.has(id)) continue;
            const ls = J.lastSeen.get(id);
            J.lastSeen.delete(id);
            if (!ls) continue;
            J.departDepths.push(Number(ls.d.toFixed(2)));
            // Three retirement routes, separated so the `idle` control can
            // validate the boundaries: an aircraft the spawner retires for
            // passing the camera is at or below FLY_PAST_DEPTH = 2.6 on its
            // last observed tick (margin 0.35 = one tick of depth travel);
            // an OVERTAKE flight recedes and is retired far away while its
            // depth is INCREASING; anything else died.
            if (ls.d <= 2.95) {
              J.departFlyPast++;
              J.flyPastSpans.push(ls.span);
            } else if (ls.dd > 0) {
              J.departReceded++;
            } else {
              J.departKilled++;
              J.killSpans.push(ls.span);
              J.killDepths.push(ls.d);
            }
          }
          J.prevIds = nowIds;

          if (inFlight) {
            J.ticksFlight++;
            J.aliveSum += c.alive;
            J.spanMaxSum += spanMax;
            J.enemyShotSum += c.enemyShots;
            if (c.alive > 0) J.ticksAnyEnemy++;
            if (readable) {
              J.ticksReadable++;
              J.droughtCur = 0;
            } else {
              J.droughtCur++;
              if (J.droughtCur > J.droughtMax) J.droughtMax = J.droughtCur;
            }
          }

          // drain the lane's ledger so nothing is lost to the 8192 cap
          if (window.__killDrain && J.ticksTotal % 60 === 0) {
            const d = window.__killDrain();
            for (const k of d.kills) J.ledgerKills.push(k);
            J.ledgerDropped = d.dropped;
          }
        }
      },
      n,
      mode,
      0.1,
    );
  }

  const out = await page.evaluate(() => {
    const J = window.__J;
    if (window.__killDrain) {
      const d = window.__killDrain();
      for (const k of d.kills) J.ledgerKills.push(k);
      J.ledgerDropped = d.dropped;
    }
    const pct = (a, b) => (b ? (100 * a) / b : null);
    const q = (arr, p) => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.min(s.length - 1, Math.floor(p * s.length))];
    };
    const lg = J.ledgerKills;
    const gun = lg.filter((k) => k.src === 'vulcan');
    const msl = lg.filter((k) => k.src === 'missile');
    return {
      ticksTotal: J.ticksTotal,
      ticksFlight: J.ticksFlight,
      states: J.states,
      deaths: J.deaths,
      stageNumbers: [...J.stageNumbers].sort((a, b) => a - b),
      // --- emission, three operators ---
      emit_maxid: J.maxId,
      emit_firstId: J.firstId,
      emit_idRange: J.maxId - (J.firstId ?? 1) + 1,
      emit_idsSeen: J.idsSeen.size,
      emit_newAppearances: J.newAppearances,
      // --- my departure-based kill inference ---
      my_killed: J.departKilled,
      my_flyPast: J.departFlyPast,
      my_receded: J.departReceded,
      departDepthHist: (() => {
        const h = {};
        for (const d of J.departDepths) {
          const b = d <= 2.95 ? 'le2.95' : d < 10 ? '2.95-10' : d < 30 ? '10-30' : d < 80 ? '30-80' : 'ge80';
          h[b] = (h[b] ?? 0) + 1;
        }
        return h;
      })(),
      my_killSpan_p50: q(J.killSpans, 0.5),
      my_killSpan_sub10: pct(J.killSpans.filter((s) => s < 0.1).length, J.killSpans.length),
      my_killDepth_max: J.killDepths.length ? Math.max(...J.killDepths) : null,
      // --- the lane's own ledger, drained in the same run ---
      lg_total: lg.length,
      lg_dropped: J.ledgerDropped,
      lg_gun: gun.length,
      lg_msl: msl.length,
      lg_gunSpan_p50: q(gun.map((k) => k.span), 0.5),
      lg_gunSpan_sub10: pct(gun.filter((k) => k.span < 0.1).length, gun.length),
      lg_gunDepth_max: gun.length ? Math.max(...gun.map((k) => k.d)) : null,
      lg_allSpan_p50: q(lg.map((k) => k.span), 0.5),
      lg_allSpan_sub10: pct(lg.filter((k) => k.span < 0.1).length, lg.length),
      lg_mslSpan_p50: q(msl.map((k) => k.span), 0.5),
      // --- readability ---
      readablePct: pct(J.ticksReadable, J.ticksFlight),
      anyEnemyPct: pct(J.ticksAnyEnemy, J.ticksFlight),
      droughtMax_s: J.droughtMax / 60,
      meanAlive: J.ticksFlight ? J.aliveSum / J.ticksFlight : null,
      meanSpanMax: J.ticksFlight ? J.spanMaxSum / J.ticksFlight : null,
      meanEnemyShots: J.ticksFlight ? J.enemyShotSum / J.ticksFlight : null,
      steerTicks: J.__steer ?? 0,
      gunTunables: window.__gunTunables ? window.__gunTunables() : null,
    };
  });

  page.off('pageerror', onErr);
  page.off('console', onConsole);
  out.url = url;
  out.errors = errors;
  return out;
};

// ---------------------------------------------------------------------------
let PORT = 0;
const server = await createServer({
  root: ROOT,
  server: { host: '127.0.0.1', port: 0, strictPort: false },
  logLevel: 'error',
});
await server.listen();
PORT = server.config.server.port || server.httpServer.address().port;

// served-source assertion: the files every conclusion rests on
const SERVED = [
  ['/src/weapons/combat.js', 'READABLE_SPAN_FRAC = 0.1'],
  ['/src/weapons/vulcan.js', 'HIT_RADIUS_SPAN_MULT = 0.5'],
  ['/src/game/spawner.js', 'MAX_ALIVE = 14'],
  ['/src/entities/enemy.js', 'FLY_PAST_DEPTH = 2.6'],
  ['/src/game/flow/flow.js', null],
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
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  protocolTimeout: 0,
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 672, deviceScaleFactor: 1 });

const modes = String(argv.modes ?? 'still,trk').split(',');
const seeds = String(argv.seeds ?? '1').split(',').map(Number);
const secs = Number(argv.secs ?? 180);
const invincible = argv.invincible !== 'false' && argv.invincible !== false;
const gun = argv.gun ? String(argv.gun) : null;

const arms = [];
for (const mode of modes) {
  if (!MODES.includes(mode)) {
    console.error(`unknown mode ${mode}; known: ${MODES.join(',')}`);
    process.exit(2);
  }
  for (const seed of seeds) {
    process.stderr.write(`[arm] ${mode} seed=${seed} secs=${secs} inv=${invincible}\n`);
    const r = await ARM(page, { mode, secs, seed, invincible, gun });
    r.mode = mode;
    r.seed = seed;
    r.secs = secs;
    if (r.errors.length) {
      console.error(`ARM PRODUCED ERRORS, refusing: ${mode}/${seed}`, r.errors.slice(0, 3));
      process.exit(4);
    }
    const flightS = r.ticksFlight / 60;
    r.emitPerS_maxid = r.emit_maxid / flightS;
    r.emitPerS_idsSeen = r.emit_idsSeen / flightS;
    r.emitPerS_newAppear = r.emit_newAppearances / flightS;
    r.killsPerS_mine = r.my_killed / flightS;
    r.killsPerS_ledger = r.lg_total / flightS;
    r.gunPerS = r.lg_gun / flightS;
    r.mslPerS = r.lg_msl / flightS;
    r.flyPastPerS = r.my_flyPast / flightS;
    arms.push(r);
    process.stderr.write(
      `       emit/s ${r.emitPerS_maxid.toFixed(3)}|${r.emitPerS_idsSeen.toFixed(3)}|${r.emitPerS_newAppear.toFixed(3)}` +
        `  kills/s ${r.killsPerS_mine.toFixed(3)}|${r.killsPerS_ledger.toFixed(3)}` +
        `  gunsub10 ${r.lg_gunSpan_sub10 === null ? '-' : r.lg_gunSpan_sub10.toFixed(1)}%` +
        `  gunDmax ${r.lg_gunDepth_max === null ? '-' : r.lg_gunDepth_max.toFixed(2)}` +
        `  readable ${r.readablePct.toFixed(1)}%  drought ${r.droughtMax_s.toFixed(2)}s` +
        `  flyPast/s ${r.flyPastPerS.toFixed(3)}\n`,
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

#!/usr/bin/env node
// R11 COMBAT lane probe: the SIGHT and the JET, in the SAME FRAME, on
// consecutive 60 Hz ticks.
//
// WHY IT EXISTS, and it is the whole point of the file. `judging/R11/probe_r11.mjs`
// traces `px = window.__fairness().playerNdc.x` for the jet and
// `window.__sight().ndcX` for the sight. Those are TWO DIFFERENT FRAMES:
//
//   playerNdc   combat.js's own field, worldToNdc in the PITCH-ONLY (unrolled)
//               basis. It is not a screen position. The jet's world offset is
//               roll-compensated by player.js, so this coordinate ROTATES with
//               the bank by construction.
//   __sight()   the sight sprite's corners projected through the LIVE (rolled)
//               camera -- a real screen position.
//   jetNdcX     game.js _playerNdc(): the player sprite's centre projected
//               through the LIVE camera -- the jet's real screen position, and
//               the only one of the three comparable with a pixel measurement
//               off the arcade.
//
// This probe reads all three every tick so the two definitions can be shown to
// differ instead of argued about (STATUS's standing rule, and the reason R10's
// +-17.5 %W and R11's +-34.93 %W are the same build).
//
// Modes
//   rails  settle on each rail and traverse rail-to-rail, consecutive ticks
//   roll   hold full stick through the world-roll saturation, consecutive ticks
//
// Usage:
//   node judging/R11/sight_probe.mjs --mode rails --root <tree> --out <dir>
//   node judging/R11/sight_probe.mjs --selftest
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function repoRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(d, 'vite.config.js'))) return d;
    d = path.dirname(d);
  }
  return process.cwd();
}
const ROOT = repoRoot(path.dirname(fileURLToPath(import.meta.url)));

// NDC -> percent of frame WIDTH. ndc x spans [-1, 1] across the frame, so one
// NDC unit is half a frame width and the half-envelope in %W is 50 * |ndc|.
const pctW = (ndc) => 50 * ndc;

function summarise(rows, key) {
  const v = rows.map((r) => r[key]).filter((x) => typeof x === 'number');
  if (!v.length) return null;
  const mn = Math.min(...v), mx = Math.max(...v);
  return { n: v.length, min: mn, max: mx, minPctW: pctW(mn), maxPctW: pctW(mx),
    centrePctW: pctW((mn + mx) / 2), halfSpanPctW: pctW((mx - mn) / 2) };
}

function selftest() {
  let ok = 0, fail = 0;
  const chk = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); c ? ok++ : fail++; };
  chk('pctW(1) == 50 %W', pctW(1) === 50);
  chk('pctW(-0.19696) == -9.848 %W', Math.abs(pctW(-0.19696) + 9.848) < 1e-3);
  const s = summarise([{ a: -0.2 }, { a: 0.2 }, { a: 0 }], 'a');
  chk('summarise half-span of +-0.2 NDC == 10 %W', Math.abs(s.halfSpanPctW - 10) < 1e-9);
  chk('summarise centre of a symmetric series == 0', Math.abs(s.centrePctW) < 1e-9);
  const t = summarise([{ a: 0.1 }, { a: 0.5 }], 'a');
  chk('summarise centre of [0.1,0.5] == 15 %W', Math.abs(t.centrePctW - 15) < 1e-9);
  chk('summarise ignores nulls', summarise([{ a: 1 }, { a: null }], 'a').n === 1);
  console.log(`selftest ${ok}/${ok + fail}`);
  return fail === 0;
}

function args() {
  const a = { mode: 'rails', out: null, params: 'invincible=1', seed: 3, root: ROOT };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '--mode') a.mode = v[++i];
    else if (v[i] === '--out') a.out = v[++i];
    else if (v[i] === '--params') a.params = v[++i];
    else if (v[i] === '--seed') a.seed = Number(v[++i]);
    else if (v[i] === '--root') a.root = path.resolve(v[++i]);
    else if (v[i] === '--selftest') a.mode = 'selftest';
    else { console.error('unknown arg', v[i]); process.exit(2); }
  }
  if (!a.out && a.mode !== 'selftest') { console.error('--out is REQUIRED (unique per caller)'); process.exit(2); }
  return a;
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
  const out = { url, mode: a.mode, root: a.root, seed: a.seed, rows: [], events: [], errors };
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
      const fs = window.__flowState ? window.__flowState() : null;
      const sg = window.__sight ? window.__sight() : null;
      return {
        jet: fs ? fs.jetNdcX : null,          // SCREEN x, live rolled camera
        jetY: fs ? fs.jetNdcY : null,
        sight: sg ? sg.ndcX : null,           // SCREEN x, live rolled camera
        sightY: sg ? sg.ndcY : null,
        unrolled: f ? f.playerNdc.x : null,   // combat.js's pitch-only frame
        roll: fs ? fs.worldRollDeg : null,
        bank: fs ? fs.bankDeg : null,
      };
    });

    const script = a.mode === 'roll'
      ? [['n', 60], ['R', 300], ['n', 120], ['L', 300], ['n', 120]]
      : [['L', 300], ['n', 120], ['R', 300], ['n', 120], ['L', 300], ['n', 120]];
    for (const [k, n] of script) {
      await page.evaluate((s) => window.__setStick(s), STICK[k]);
      out.events.push({ tick: out.rows.length, stick: k });
      for (let i = 0; i < n; i++) {
        await page.evaluate(() => window.__step(1));
        const r = await read();
        out.rows.push({ i: out.rows.length, k, ...r });
      }
    }
    // Settled-rail readings: the LAST tick of each held-stick segment, i.e.
    // after 300 consecutive ticks of one direction. Both rails, both frames.
    const seg = (idx) => out.rows[out.events[idx + 1] ? out.events[idx + 1].tick - 1 : out.rows.length - 1];
    out.summary = {
      jetScreen: summarise(out.rows, 'jet'),
      sightScreen: summarise(out.rows, 'sight'),
      playerNdcUnrolled: summarise(out.rows, 'unrolled'),
      settled: out.events.map((e, i) => ({ stick: e.stick, ...seg(i) })),
    };
  } finally {
    await browser.close();
    await server.close();
  }
  const f = path.join(a.out, `sight-${a.mode}.json`);
  await writeFile(f, JSON.stringify(out, null, 1));
  console.log('rows', out.rows.length, 'pageErrors', errors.length, '->', f);
  if (out.summary) console.log(JSON.stringify(out.summary, null, 1));
}

main();

#!/usr/bin/env node
// R9 JUDGE — MOTION probe.
//
// WHY THIS EXISTS. Nine rounds of this project have measured still frames and
// telemetry scalars. `grep -ri "has any reviewer compared motion"` over every
// judge report, both critiques, REFERENCE.md and GAME_SPEC.md returns nothing,
// and so does a grep for missile tracking / heat-seeking / lock acquisition /
// turn rate. Every gate we own can be satisfied by a game that is wrong the
// moment it moves.
//
// This probe records, for EVERY tick of a run:
//   * the full per-enemy census (id, depth, ndc, spanFrac, bank, onScreen)
//   * missilesInFlight, locks, trackedId, bracket count, hits, vulcan rounds
//   * the player's ndc, bank, world roll, and the sight's ndc
// and OPTIONALLY saves the frame PNG for every tick in a window, so the same
// run can be read as pixels and as numbers.
//
// It steps to `--skip` ticks first and then captures/records `--ticks`
// consecutive 60 Hz ticks, which is what `tools/capture.mjs --every 1` cannot
// do (its first frame is always tick 1).
//
// Stick: `--stick N` installs a CONSTANT deflection from the first recorded
// tick, and `--stickat T` delays it to tick T so input latency can be read as
// "ticks from the step that set the stick to the first step whose jet moved".
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const a = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1] ?? true;

const OUT = a.out;
if (!OUT) { console.error('--out is required (no default: concurrent agents sharing a path is silent corruption)'); process.exit(2); }
const SKIP = Number(a.skip ?? 0);
const TICKS = Number(a.ticks ?? 180);
const SHOTS = a.shots ? Number(a.shots) : 0;      // save PNG for the first N recorded ticks
const PARAMS = a.params ?? 'fixed=1&seed=1&demo=1&invincible=1';
const STICK = a.stick === undefined ? null : Number(a.stick);
const STICKAT = Number(a.stickat ?? 0);

const server = await createServer({ root: ROOT, server: { host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const PORT = server.httpServer.address().port;      // the BOUND port, not the configured one
const url = `http://127.0.0.1:${PORT}/?${PARAMS}`;
const browser = await puppeteer.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 672, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.setDefaultNavigationTimeout(120000);
for (let tryN = 1; ; tryN++) {
  try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); break; }
  catch (e) { if (tryN >= 3) throw e; console.error('goto retry ' + tryN + ': ' + e.message); }
}
await page.waitForFunction('window.__frameReady === true', { timeout: 120000 });

await mkdir(OUT, { recursive: true });
if (SKIP) await page.evaluate((n) => window.__step(n), SKIP);

const rows = [];
let stickOn = false;
for (let t = 0; t < TICKS; t++) {
  if (STICK !== null && !stickOn && t >= STICKAT) {
    await page.evaluate((s) => window.__setStick && window.__setStick(s), STICK);
    stickOn = true;
    rows.push({ tick: SKIP + t, stickSetHere: true });
  }
  await page.evaluate(() => window.__step(1));
  const s = await page.evaluate(() => ({
    combat: window.__combatStats ? window.__combatStats() : null,
    flow: window.__flowState ? window.__flowState() : null,
    sight: window.__sight ? window.__sight() : null,
    brackets: window.__brackets ? window.__brackets().length : null,
  }));
  const last = rows[rows.length - 1];
  const rec = { tick: SKIP + t + 1, ...s };
  if (last && last.stickSetHere && last.tick === SKIP + t) { rec.stickSetBefore = true; rows.pop(); }
  rows.push(rec);
  if (t < SHOTS) {
    const buf = await page.screenshot({ type: 'png' });
    await writeFile(path.join(OUT, `m-${String(SKIP + t + 1).padStart(5, '0')}.png`), buf);
  }
}
await writeFile(path.join(OUT, 'motion.json'), JSON.stringify({ url, skip: SKIP, ticks: TICKS, stick: STICK, stickAt: STICKAT, errors, rows }, null, 1));
console.log(`wrote ${OUT}/motion.json  ticks ${SKIP + 1}..${SKIP + TICKS}  pngs ${SHOTS}  errors ${errors.length}`);
await browser.close();
await server.close();

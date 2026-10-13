#!/usr/bin/env node
// R11 COMBAT lane: THE HUMAN MIDDLE, as a swept reaction delay.
//
// WHAT IS MISSING FROM THE PILOT SET AND WHY IT MATTERS NOW. `probe_r11.mjs`
// has `still` (the stick is never touched), `track` (pure pursuit, gain 3.0,
// zero latency) and `sweep` (a sinusoid that never aims). The feel lane named
// the gap itself: *"a real human is between these two arms and this probe has
// no arm for that; the honest bound is that I have measured the two ends and
// not the middle."* R11 then cut `ENVELOPE_X` 2.6 -> 0.733, which cost the
// zero-latency tracker 18 -> 11 missile kills, so "can a realistic pilot still
// lock" stopped being a curiosity.
//
// THE PARAMETER IS THE DELAY, not the policy. A policy arm (chase only what is
// reachable) answers "is this aiming law better"; a delay arm answers "how much
// latency does the lock tolerate", and latency is the thing a person actually
// has. `judging/R10/feel-critique.md` §3.4 already used a FIXED 9-tick (150 ms)
// loop delay for its aim-precision diagnostic, so 9 is a precedent to be
// consistent with rather than a convention to invent -- it is in the sweep and
// marked.
//
// Implementation: pure pursuit identical to `track`, but the stick applied on
// tick i is the one computed from the world as it was on tick i-N. Nothing
// else differs -- same gain, same depth band, same trigger cadence
// (40 ticks held, 5 released; the missile fires on RELEASE), same seed, same
// `invincible=1`, same 5 400 consecutive 60 Hz ticks. N = 0 reproduces `track`
// exactly and is run as the control rather than assumed.
//
// *** THIS ARM HAS NO ARCADE COLUMN AND MUST NOT BECOME A GATE. ***
// Nobody has measured the arcade pilot's reaction latency and nothing here
// pretends to. It can REFUTE a claim about our build -- "a realistic pilot
// cannot lock at all" is falsifiable by it -- and it cannot rank two builds,
// because with no anchor "more kills" is a DIRECTION and only a direction can
// have a sign (STATUS row 44, and the classification the feel lane added to
// the pair rule: this is a DIAGNOSTIC).
//
// Usage:
//   node judging/R11/human_arm.mjs --root <tree> --delay 9 --out <dir>
//   node judging/R11/human_arm.mjs --selftest
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

/** The delay line: what the pilot commands on tick i, given the stick it
 * computed on every tick so far. N = 0 is "act on what you see now". */
export function delayed(history, i, n) {
  const k = i - n;
  return k >= 0 ? history[k] : { x: 0, y: 0 };
}

/** The shared trigger cadence. The missile fires on RELEASE, so an arm that
 * holds the button forever never launches -- R10's critique lost three arms to
 * exactly that. */
export function held(i) {
  return i % 45 < 40;
}

function selftest() {
  let ok = 0, fail = 0;
  const chk = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); c ? ok++ : fail++; };
  const h = [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }];
  chk('delay 0 is the live command', delayed(h, 3, 0).x === 4);
  chk('delay 2 reaches back two ticks', delayed(h, 3, 2).x === 2);
  chk('before the line fills, the stick is neutral', delayed(h, 1, 9).x === 0);
  chk('delay 9 at tick 9 is tick 0', delayed([...h, ...h, ...h], 9, 9).x === 1);
  chk('trigger held on tick 0', held(0) === true);
  chk('trigger held through tick 39', held(39) === true);
  chk('trigger RELEASED on tick 40', held(40) === false);
  chk('trigger re-held on tick 45', held(45) === true);
  let rel = 0;
  for (let i = 1; i < 5400; i++) if (held(i - 1) && !held(i)) rel++;
  chk(`5400 ticks give 120 release edges (got ${rel})`, rel === 120);
  console.log(`selftest ${ok}/${ok + fail}`);
  return fail === 0;
}

async function main() {
  const v = process.argv.slice(2);
  if (v.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  const arg = (n, d) => (v.includes(n) ? v[v.indexOf(n) + 1] : d);
  const ROOT = repoRoot(path.dirname(fileURLToPath(import.meta.url)));
  const root = path.resolve(arg('--root', ROOT));
  const delay = Number(arg('--delay', 9));
  const secs = Number(arg('--secs', 90));
  const seed = Number(arg('--seed', 3));
  const out = arg('--out', null);
  if (!out) { console.error('--out is REQUIRED (unique per caller)'); process.exit(2); }
  await mkdir(out, { recursive: true });

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
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&invincible=1&seed=${seed}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

  const TOTAL = Math.round(secs * 60);
  const history = [];
  let launches = 0;
  for (let i = 0; i < TOTAL; i++) {
    const want = await page.evaluate(() => {
      const cs = window.__combatStats ? window.__combatStats() : null;
      const sg = window.__sight ? window.__sight() : null;
      if (!cs || !sg) return { x: 0, y: 0 };
      let best = null;
      for (const e of cs.enemies) {
        if (e.depth < 26 || e.depth > 88) continue;
        if (!best || e.depth < best.depth) best = e;
      }
      if (!best) return { x: 0, y: 0 };
      const cl = (q) => Math.max(-1, Math.min(1, q));
      return { x: cl((best.ndcX - sg.ndcX) * 3.0), y: cl((best.ndcY - sg.ndcY) * 3.0) };
    });
    history.push(want);
    const act = delayed(history, i, delay);
    await page.evaluate((s) => window.__setStick(s), { ...act, missile: held(i) });
    await page.evaluate(() => window.__step(1));
    const d = await page.evaluate(() => ({
      msl: window.__missileDrain ? window.__missileDrain() : [],
    }));
    if (d.msl && d.msl.length) launches += d.msl.length;
  }
  const counts = await page.evaluate(() => (window.__killDrain ? window.__killDrain().counts : null));
  await browser.close(); await server.close();
  const res = { root, seed, secs, delayTicks: delay, delayMs: +(delay * 1000 / 60).toFixed(1),
    launchesRetired: launches, counts, pageErrors: errors.length };
  console.log(JSON.stringify(res, null, 1));
  await writeFile(path.join(out, `human-d${delay}.json`), JSON.stringify(res, null, 1));
}

main();

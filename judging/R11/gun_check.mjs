#!/usr/bin/env node
// R11 COMBAT lane: does the VULCAN still need the player?
//
// `judging/R11/probe_r11.mjs --mode combat` never pulls the gun trigger (it
// holds `missile` only), so every arm it publishes reads `vulcan: 0` and the
// gun is untested by it. That matters this round because R11 cut ENVELOPE_X
// 2.6 -> 0.733: the sight's reachable half-range falls 34.93 -> 9.85 %W while
// `ASSIST_RADIUS_FRAC = 0.13` (13 %W, measured from the sight in frame-width
// units) does not move. The assist cone goes from 0.37x of the sight's entire
// reach to 1.32x of it, and a cone wider than the thing that aims it cannot
// discriminate. This measures that instead of asserting it.
//
// Two pilots, identical trigger: the gun is HELD for the whole window in both
// arms, so the only difference between them is where the sight is pointing.
//   still  the stick is never touched
//   track  flies the sight onto the nearest enemy in the gun's own depth band
// Consecutive 60 Hz: one window.__step(1) per tick, state read in the same
// page.evaluate. `invincible=1` so a death does not delete ticks from one arm
// and not the other.
//
// Usage: node judging/R11/gun_check.mjs --root <tree> --pilot still|track \
//          --secs 90 --seed 3 --out <dir>
//        node judging/R11/gun_check.mjs --selftest
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

// Share of a tracking pilot's kills that a motionless one gets. Reported as a
// ratio and NOT as a pass/fail: STATUS is explicit that higher is not better
// here and that 100 % was the defect.
export function blindShare(still, track) {
  if (track === 0) return null;
  return still / track;
}

function selftest() {
  let ok = 0, fail = 0;
  const chk = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); c ? ok++ : fail++; };
  chk('4 of 18 == 0.2222', Math.abs(blindShare(4, 18) - 4 / 18) < 1e-12);
  chk('equal arms == 1.0', blindShare(9, 9) === 1);
  chk('a blind pilot scoring nothing == 0', blindShare(0, 7) === 0);
  chk('track 0 is undefined, not Infinity', blindShare(3, 0) === null);
  console.log(`selftest ${ok}/${ok + fail}`);
  return fail === 0;
}

async function main() {
  const v = process.argv.slice(2);
  if (v.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  const arg = (n, d) => (v.includes(n) ? v[v.indexOf(n) + 1] : d);
  const ROOT = repoRoot(path.dirname(fileURLToPath(import.meta.url)));
  const root = path.resolve(arg('--root', ROOT));
  const pilot = arg('--pilot', 'still');
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
  const res = { root, pilot, seed, secs, counts: null, kills: [], errors };
  let stick = { x: 0, y: 0 };
  for (let i = 0; i < TOTAL; i++) {
    if (pilot === 'track') {
      stick = await page.evaluate(() => {
        const cs = window.__combatStats ? window.__combatStats() : null;
        const sg = window.__sight ? window.__sight() : null;
        if (!cs || !sg) return { x: 0, y: 0 };
        let best = null;
        // The gun's own licensed band: inside `readableDepth`, where combat.js
        // lets the assist and the round's reach live at all.
        for (const e of cs.enemies) {
          if (e.depth > 22) continue;
          if (!best || e.depth < best.depth) best = e;
        }
        if (!best) return { x: 0, y: 0 };
        const cl = (q) => Math.max(-1, Math.min(1, q));
        return { x: cl((best.ndcX - sg.ndcX) * 3.0), y: cl((best.ndcY - sg.ndcY) * 3.0) };
      });
    }
    await page.evaluate((s) => window.__setStick(s), { ...stick, fire: true });
    await page.evaluate(() => window.__step(1));
    const d = await page.evaluate(() => (window.__killDrain ? window.__killDrain() : null));
    if (d && d.kills && d.kills.length) {
      res.kills.push({ tick: i, by: d.kills.map((k) => k.weapon ?? k.by ?? 'x') });
      res.counts = d.counts;
    }
  }
  res.counts = await page.evaluate(() => (window.__killDrain ? window.__killDrain().counts : null)) ?? res.counts;
  await browser.close(); await server.close();
  const tally = {};
  for (const k of res.kills) for (const w of k.by) tally[w] = (tally[w] ?? 0) + 1;
  res.tally = tally;
  console.log(JSON.stringify({ root, pilot, seed, secs, tally, pageErrors: errors.length }, null, 1));
  await writeFile(path.join(out, `gun-${pilot}.json`), JSON.stringify(res, null, 1));
}

main();

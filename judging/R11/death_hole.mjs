#!/usr/bin/env node
// R11 FLOW lane: the EMPTY-SKY hole in the death sequence, measured in the
// simulation and then looked at in the pixels.
//
// The effects lane found it with a whole-frame fire/warm mask. That is the
// right instrument for "is anything on screen" and the wrong one for "did the
// phase gate fire", because a mask cannot tell an idle field from a field
// drawing something below its threshold. This reads the SAME PREDICATE the
// phase now reads -- `window.__explBusy()`, which is `explosions.busy()` --
// beside `__flowState().deathPhase`, so the hole is a count of ticks and not
// an area fraction.
//
//   HOLE TICK  ==  deathPhase === 'starburst' AND the explosion field is idle.
// In that phase the jet sprite is hidden by construction (deathSequence.js
// sets `s.visible = false` on the starburst spawn), so an idle field means
// nothing at all is drawing.
//
// `--strip` additionally screenshots every tick in a window and writes a
// contact strip, because CLAUDE.md's rule is that a "measures zero" result
// gets cropped and looked at once.
//
// Consecutive 60 Hz throughout: one window.__step(1) per sample, all state
// read in the same page.evaluate.
//
// Usage:
//   node judging/R11/death_hole.mjs --root <tree> --out <dir> [--strip]
//   node judging/R11/death_hole.mjs --selftest
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

/** Longest run of consecutive true values, and where it starts. */
export function longestRun(flags) {
  let best = 0, bestAt = -1, cur = 0;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i]) {
      cur++;
      if (cur > best) { best = cur; bestAt = i - cur + 1; }
    } else cur = 0;
  }
  return { len: best, at: bestAt };
}

/** Phase boundaries from a per-tick phase series: [{phase, from, to}]. */
export function phases(series) {
  const out = [];
  for (let i = 0; i < series.length; i++) {
    if (!out.length || out[out.length - 1].phase !== series[i]) {
      out.push({ phase: series[i], from: i, to: i });
    } else out[out.length - 1].to = i;
  }
  return out;
}

function selftest() {
  let ok = 0, fail = 0;
  const chk = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); c ? ok++ : fail++; };
  chk('no run -> 0', longestRun([false, false]).len === 0);
  chk('all true -> full length', longestRun([true, true, true]).len === 3);
  const r = longestRun([false, true, true, false, true, true, true, false]);
  chk('longest of two runs is the later one (len 3 at 4)', r.len === 3 && r.at === 4);
  chk('a run touching the end is counted', longestRun([false, true, true]).len === 2);
  chk('single-tick run counted', longestRun([false, true, false]).len === 1);
  const p = phases(['a', 'a', 'b', 'b', 'b', 'c']);
  chk('three phases segmented', p.length === 3);
  chk('second phase spans 2..4', p[1].phase === 'b' && p[1].from === 2 && p[1].to === 4);
  chk('a 13-tick hole is 0.216 s at 60 Hz', Math.abs(13 / 60 - 0.2167) < 1e-3);
  console.log(`selftest ${ok}/${ok + fail}`);
  return fail === 0;
}

async function main() {
  const v = process.argv.slice(2);
  if (v.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  const arg = (n, d) => (v.includes(n) ? v[v.indexOf(n) + 1] : d);
  const ROOT = repoRoot(path.dirname(fileURLToPath(import.meta.url)));
  const root = path.resolve(arg('--root', ROOT));
  const out = arg('--out', null);
  const ticks = Number(arg('--ticks', 600));
  const seed = Number(arg('--seed', 1));
  const at = Number(arg('--forcedeath', 2.0));
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
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&demo=2&seed=${seed}&forcedeath=${at}`,
    { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

  const rows = [];
  for (let i = 0; i < ticks; i++) {
    const r = await page.evaluate(() => {
      window.__step(1);
      const f = window.__flowState ? window.__flowState() : null;
      return {
        phase: f ? f.deathPhase : null,
        state: f ? f.state : null,
        busy: window.__explBusy ? window.__explBusy() : null,
      };
    });
    rows.push({ t: +(i / 60).toFixed(4), ...r });
  }

  const inDeath = rows.map((r) => r.phase !== null);
  const hole = rows.map((r) => r.phase === 'starburst' && r.busy === false);
  const h = longestRun(hole);
  const ph = phases(rows.map((r) => r.phase)).filter((p) => p.phase !== null);
  const res = {
    root, seed, forcedeath: at, ticks, pageErrors: errors.length,
    hasBusyHook: rows.some((r) => r.busy !== null),
    deathTicks: inDeath.filter(Boolean).length,
    deathTotalS: +(inDeath.filter(Boolean).length / 60).toFixed(4),
    holeTicks: hole.filter(Boolean).length,
    longestHoleTicks: h.len,
    longestHoleS: +(h.len / 60).toFixed(4),
    longestHoleStartsAtS: h.at < 0 ? null : rows[h.at].t,
    phases: ph.map((p) => ({ phase: p.phase, fromS: rows[p.from].t, toS: rows[p.to].t,
      lenS: +((p.to - p.from + 1) / 60).toFixed(4) })),
  };
  console.log(JSON.stringify(res, null, 1));
  if (errors.length) console.log(errors.slice(0, 3));
  await writeFile(path.join(out, 'death-hole.json'), JSON.stringify({ ...res, rows }, null, 1));

  if (v.includes('--strip')) {
    // Re-run and screenshot the window around the starburst -> tumble
    // boundary. A second run rather than screenshotting the first: grabbing a
    // PNG per tick is slow enough to matter and the run is deterministic
    // under ?fixed=1, so the two agree tick for tick.
    const sb = ph.find((p) => p.phase === 'starburst');
    const from = Math.max(0, (sb ? sb.to : 0) - 10);
    const to = Math.min(ticks - 1, (sb ? sb.to : 0) + 14);
    const p2 = await browser.newPage();
    await p2.setViewport({ width: 960, height: 672 });
    await p2.goto(`http://127.0.0.1:${port}/?fixed=1&demo=2&seed=${seed}&forcedeath=${at}`,
      { waitUntil: 'load' });
    await p2.waitForFunction('window.__frameReady === true', { timeout: 20000 });
    await mkdir(path.join(out, 'strip'), { recursive: true });
    for (let i = 0; i <= to; i++) {
      await p2.evaluate(() => window.__step(1));
      if (i >= from) {
        await p2.screenshot({ path: path.join(out, 'strip', `t${String(i).padStart(4, '0')}.png`) });
      }
    }
    console.log(`strip: ticks ${from}..${to} -> ${path.join(out, 'strip')}`);
  }
  await browser.close(); await server.close();
}

main();

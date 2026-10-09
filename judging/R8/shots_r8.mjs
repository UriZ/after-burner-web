#!/usr/bin/env node
// R8 — frames from a SCRIPTED PILOT, with the simulation's own ground truth
// for each frame written beside them.
//
// `tools/capture.mjs` cannot take these: without `?demo=1` it injects no
// input at all, so its frames contain no weapon, no kill and no explosion —
// which is exactly the defect that invalidated the evidence for R7's
// headline claim. These frames are driven by the same pilot policies the
// measurements use.
//
// It exists because of the standing rule: any "measures zero" / "100 %" /
// "doesn't move" result gets cropped and LOOKED AT once before publishing.
// The claim being checked here is "the gun now only kills aircraft the
// player can see", and a kill-size distribution cannot be read off a frame —
// so each frame is written with the span, in %W, of every live aircraft in
// it, straight out of `__combatStats`. Number next to picture.
//
// Usage: node judging/R8/shots_r8.mjs --mode arcstill --out <dir> \
//          [--ticks 600,900,1200] [--extra "gun=..."]

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const args = { mode: 'arcstill', out: null, ticks: [600, 900, 1200], extra: '', seed: 1 };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k === '--mode') args.mode = process.argv[++i];
  else if (k === '--out') args.out = process.argv[++i];
  else if (k === '--seed') args.seed = Number(process.argv[++i]);
  else if (k === '--ticks') args.ticks = process.argv[++i].split(',').map(Number);
  else if (k === '--extra') args.extra = process.argv[++i];
  else {
    console.error(`shots_r8: unknown argument "${k}". Refusing to run.`);
    process.exit(2);
  }
}
if (!args.out) {
  console.error('shots_r8: --out is REQUIRED (no default).');
  process.exit(2);
}

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
  protocolTimeout: 0,
});
const errors = [];
try {
  await mkdir(args.out, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const sp = new URLSearchParams(args.extra);
  sp.set('fixed', '1');
  sp.set('seed', String(args.seed));
  sp.set('invincible', '1');
  await page.goto(`http://127.0.0.1:${port}/?${sp.toString()}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });

  const meta = [];
  let tick = 0;
  for (const target of args.ticks) {
    // Step with the pilot driving, in the same shape the measurement harness
    // uses, so the frame is from the same flight the numbers come from.
    const res = await page.evaluate(
      (mode, n, startAt) => {
        let seen = [];
        for (let i = 0; i < n; i++) {
          const t = startAt + i;
          const arcPulse = t % 120 < 6;
          const mPulse = t % 24 < 12;
          let x = 0;
          let y = 0;
          if (mode === 'arctrk' || mode === 'trk') {
            let best = null;
            for (const e of seen) {
              if (!e.onScreen || e.spanFrac < 0.1) continue;
              if (!best || e.depth < best.depth) best = e;
            }
            if (best) {
              const sg = window.__sight ? window.__sight() : null;
              const ax = sg ? sg.ndcX : 0;
              const ay = sg ? sg.ndcY : 0.3;
              x = Math.max(-1, Math.min(1, (best.ndcX - ax) * 2.2));
              y = Math.max(-1, Math.min(1, (best.ndcY - ay) * 2.2));
            }
          }
          window.__setStick({
            x,
            y,
            fire: true,
            missile: mode.startsWith('arc') ? arcPulse : mPulse,
            throttleIndex: 1,
          });
          window.__step(1);
          const c = window.__combatStats();
          if (c) seen = c.enemies;
        }
        const c = window.__combatStats();
        const f = window.__flowState();
        return {
          png: document.querySelector('#screen').toDataURL('image/png'),
          hits: c.hits,
          alive: c.alive,
          vulcanRounds: c.vulcanRounds,
          missilesInFlight: c.missilesInFlight,
          state: f.state,
          stageIndex: f.stageIndex,
          jetNdcY: f.jetNdcY,
          enemies: c.enemies
            .filter((e) => e.onScreen)
            .map((e) => ({
              spanPctW: Number((e.spanFrac * 100).toFixed(2)),
              depth: Number(e.depth.toFixed(2)),
              ndcX: Number(e.ndcX.toFixed(3)),
              ndcY: Number(e.ndcY.toFixed(3)),
              readable: e.spanFrac >= 0.1,
            }))
            .sort((a, b) => b.spanPctW - a.spanPctW),
          tunables: window.__gunTunables(),
          poseCensus: window.__poseCensus(),
        };
      },
      args.mode,
      target - tick,
      tick
    );
    tick = target;
    const b64 = res.png.slice(res.png.indexOf(',') + 1);
    const file = path.join(args.out, `t${String(target).padStart(5, '0')}.png`);
    await writeFile(file, Buffer.from(b64, 'base64'));
    delete res.png;
    meta.push({ tick: target, file, ...res });
    const spans = res.enemies.map((e) => `${e.spanPctW}%W@d${e.depth}${e.readable ? '*' : ''}`);
    console.log(
      `t${target} state=${res.state} stage=${res.stageIndex} HIT=${res.hits} alive=${res.alive} ` +
        `rounds=${res.vulcanRounds} msl=${res.missilesInFlight}\n  on-screen: ${spans.join('  ') || '(none)'}`
    );
  }
  await writeFile(path.join(args.out, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log('wrote', args.out);
} finally {
  if (errors.length) {
    console.error(`${errors.length} page error(s):`);
    for (const e of errors) console.error(' ', e);
    process.exitCode = 1;
  }
  await browser.close();
  await server.close();
}

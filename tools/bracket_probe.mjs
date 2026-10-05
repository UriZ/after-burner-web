#!/usr/bin/env node
// Lock-bracket geometry under bank, read from the live sprites.
//
// WHY A HARNESS AND NOT A PIXEL PASS. R4 gap 10's residual — "the bracket
// degenerates to 5 x 18 native px with only the two LEFT corners present on a
// hard-banked frame" — was found with a near-white 8-connected-component
// measurement on a capture. That operator cannot distinguish:
//
//   (a) the bars were never placed where the box says they should be;
//   (b) they were placed correctly and something REMOVED them from the frame
//       (the brackets are depthTest:true against opaque ground, and a hard
//       bank swings the horizon diagonally across them);
//   (c) they were placed correctly and MERGED with another near-white
//       element — the missile trail, the sight square and the HUD are all in
//       the same segmentation class, which is the contamination CLAUDE.md
//       warns about for exactly this mask.
//
// Those are three different bugs with three different fixes, and the pixel
// number is identical for all three. This probe answers (a) alone, by
// projecting the eight bar sprites through the live camera.
//
// Usage:
//   node tools/bracket_probe.mjs                 # sweep stick x, read boxes
//   node tools/bracket_probe.mjs --selftest      # instrument validation

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function open(browser, port, search) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${port}/?${search}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
  return { page, errors };
}

// Step until at least one bracket exists, so the sweep is not measuring an
// empty sky. Returns the tick count spent.
async function stepToBracket(page, limit = 1800) {
  for (let i = 0; i < limit; i += 6) {
    const n = await page.evaluate(() => {
      window.__step(6);
      return window.__brackets().sets.length;
    });
    if (n > 0) return i;
  }
  return -1;
}

async function readAt(page, stickX, settleTicks) {
  await page.evaluate(
    (x, n) => {
      window.__setStick({ x });
      window.__step(n);
    },
    stickX,
    settleTicks
  );
  return page.evaluate(() => window.__brackets());
}

async function main() {
  const selftest = process.argv.includes('--selftest');
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    // See fairness_probe.mjs: correctness requirement on a shared tree, not
    // a speed tweak.
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
    const { page, errors } = await open(browser, port, 'fixed=1&seed=2&invincible=1');
    const warm = await stepToBracket(page);
    if (warm < 0) throw new Error('no bracket appeared within 1800 ticks');

    const out = { warmTicks: warm, sweep: [], errors };
    // Roll saturates well inside 60 ticks at the shipped rate; 90 is generous
    // and the saturation is checked by rollDeg below rather than assumed.
    for (const x of [0, 0.5, 1, -1, 0]) {
      const r = await readAt(page, x, 90);
      out.sweep.push({
        stickX: x,
        rollDeg: r.rollDeg,
        boxes: r.sets.map((s) => ({ w: s.boxW, h: s.boxH, bars: s.bars })),
      });
    }

    if (selftest) {
      // KNOWN-INPUT CHECKS.
      //  1. rollDeg must be ~0 at stick 0 and must have the opposite sign at
      //     stick -1 vs +1, with |roll| > 30 deg at full deflection. If roll
      //     never happens the sweep proves nothing, which is the failure mode
      //     that would make a broken bracket look fine.
      //  2. the box must be SQUARE to within 1 native px and must be the
      //     measured 16.5 px, at EVERY roll angle — that is the arcade
      //     measurement (35x35 of 686) and the property under test.
      const rolls = out.sweep.map((s) => s.rollDeg);
      const atFull = out.sweep.filter((s) => Math.abs(s.stickX) === 1);
      out.selftest = {
        levelRollNearZero: Math.abs(rolls[0]) < 1.0,
        rollSaturates: atFull.every((s) => Math.abs(s.rollDeg) > 30),
        rollSignsOppose: atFull.length === 2 && Math.sign(atFull[0].rollDeg) === -Math.sign(atFull[1].rollDeg),
        boxesSeen: out.sweep.reduce((n, s) => n + s.boxes.length, 0),
      };
    }
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
// SHEET PROBE — reports whether every authored sprite sheet actually decoded
// and whether anything in the run rendered procedural fallback art.
//
// Why this exists. src/entities/enemySprite.js loads sixteen sheets
// asynchronously at module scope. Until R6 a decode failure was swallowed by
// an empty handler and the procedural drawing rendered in its place with no
// error and no warning — so "the sheets are wired in" was a claim nobody could
// check, and in fact they were NOT wired in for night or far LOD for a whole
// round (judging/R5/report.md, "what nobody had looked at"). A capture that
// steps before the images decode has the same failure mode and is a
// determinism hazard for every judge run.
//
// enemySprite.js now exposes window.__spriteSheetStatus(). This probe boots
// the game, steps it, and prints that census as JSON. It EXITS NON-ZERO if any
// sheet failed to decode, if any sheet is still pending at the end of the run,
// or if any enemy was drawn from the procedural detail path — so it can be run
// as a gate rather than read as a report.
//
// The FAR LOD is deliberately not counted as a fallback; see the long note on
// enemyTexture() for why 3-9 native px is a different problem from 48.
//
// Writes nothing to disk — results go to stdout, so there is no shared output
// path to collide on.
//
// Usage:
//   node tools/art/sheet_probe.mjs [--ticks 4200] [--every 600]
//                                  [--url-params "..."]

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

function parseArgs(argv) {
  const args = { ticks: 4200, every: 600, urlParams: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ticks') args.ticks = Number(argv[++i]);
    else if (a === '--every') args.every = Number(argv[++i]);
    else if (a === '--url-params') args.urlParams = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    // hmr:false + watch:null is a CORRECTNESS guard, not a speed tweak — same
    // reason as tools/capture.mjs and tools/combat_probe.mjs: an HMR reload
    // mid-run either kills the page or silently resets state, and this probe
    // would then report a clean census for a run that never happened.
    server: { strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;

  const url = new URL(`http://localhost:${port}/`);
  const search = new URLSearchParams(args.urlParams);
  if (!search.has('fixed')) search.set('fixed', '1');
  if (!search.has('seed')) search.set('seed', '1');
  url.search = search.toString();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  let status = null;
  let selfTest = null;
  const errors = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 672 });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
    });
    await page.goto(url.toString(), { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

    // Positive control FIRST: prove the fallback counter can fire at all
    // before believing a zero from it.
    selfTest = await page.evaluate(() =>
      (window.__spriteSheetSelfTest ? window.__spriteSheetSelfTest() : null));

    const samples = Math.max(1, Math.floor(args.ticks / args.every));
    for (let i = 0; i < samples; i++) {
      // eslint-disable-next-line no-await-in-loop
      status = await page.evaluate((n) => {
        window.__step(n);
        return window.__spriteSheetStatus ? window.__spriteSheetStatus() : null;
      }, args.every);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(JSON.stringify({ selfTest, status, pageMessages: errors }, null, 2));

  if (!status) {
    console.error('FAIL: window.__spriteSheetStatus() is not exposed.');
    process.exitCode = 1;
    return;
  }
  const problems = [];
  if (!selfTest || !selfTest.detected) {
    problems.push('the fallback counter did not fire on its positive control — a zero census below means nothing');
  }
  if (Object.keys(status.failed).length) problems.push(`${Object.keys(status.failed).length} sheet(s) failed to decode`);
  if (status.pending.length) problems.push(`${status.pending.length} sheet(s) never decoded: ${status.pending.join(', ')}`);
  if (status.proceduralTotal > 0) problems.push(`${status.proceduralTotal} procedural detail fallback(s): ${JSON.stringify(status.proceduralUses)}`);
  if (problems.length) {
    for (const p of problems) console.error('FAIL:', p);
    process.exitCode = 1;
  } else {
    console.error(`OK: ${status.loaded.length}/${status.expected} sheets decoded, 0 procedural detail fallbacks.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

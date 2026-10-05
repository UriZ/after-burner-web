#!/usr/bin/env node
// Deterministic frame-sequence capture for agents/judges. Boots a Vite dev
// server (programmatic API, which itself scans for a free port starting at
// the configured 5173 — never kills anything it didn't start), drives the
// game through its ?fixed=1 manual-step hook, and saves PNGs.
//
// Every output path is caller-unique: --out has no default. Concurrent
// agents sharing a path is silent corruption, not an error
// (ARCHITECTURE.md D4; hard-won rule from the Godot sibling project).

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const args = { frames: 10, every: 1, urlParams: '', page: '/' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--frames') args.frames = Number(argv[++i]);
    else if (a === '--every') args.every = Number(argv[++i]);
    else if (a === '--url-params') args.urlParams = argv[++i];
    else if (a === '--page') args.page = argv[++i];
    else if (a === '--help') args.help = true;
    // Unknown flags are a HARD ERROR, not a shrug. This parser used to fall
    // through silently: the combat lane ran two suppression tests with
    // `--params` instead of `--url-params`, the tool accepted it, dropped the
    // parameters, defaulted to `fixed=1&seed=1`, captured a static scene with
    // none of the requested state in it, and both tests returned a clean 0 —
    // "the jet quad suppresses nothing". Re-run with the correct flag, the
    // same comparison returned 96,114 warm and 161,581 near-white pixels.
    // A plausible, stable, reproducible zero from a tool that would not say
    // it had ignored its arguments. Every false alarm this project has
    // produced looked exactly like that.
    else {
      console.error(
        `capture.mjs: unknown argument "${a}".\n` +
          'Valid: --out --frames --every --url-params --page --help\n' +
          'Refusing to run rather than silently capturing something you did not ask for.'
      );
      process.exit(2);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.out) {
    console.log(
      'Usage: node tools/capture.mjs --out <dir> [--frames N] [--every M] [--url-params "..."] [--page /path.html]\n' +
        '  --out          REQUIRED, caller-unique output directory for frame-NNNN.png\n' +
        '  --frames       number of frames to capture (default 10)\n' +
        '  --every        fixed ticks to advance between captured frames (default 1)\n' +
        '  --url-params   extra query string appended after ?fixed=1&seed=1\n' +
        '  --page         page path to load (default "/", the real game); point at a\n' +
        '                 test-harness HTML file for isolated-subject captures'
    );
    process.exit(args.help ? 0 : 1);
  }

  await mkdir(args.out, { recursive: true });

  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    // hmr:false is load-bearing, not tidiness. A capture run can span many
    // seconds of wall clock on a tree other agents are editing; an HMR
    // reload mid-run either kills the page ("Execution context was
    // destroyed") or — the dangerous case — silently resets simulation state
    // without killing it, which is how the player-feel lane got one frozen,
    // score-0 capture set that a re-run did not reproduce. A capture must
    // measure the tree as it was when the run started, not a moving target.
    server: { strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const address = server.httpServer.address();
  const port = address.port;

  const url = new URL(args.page, `http://localhost:${port}/`);
  // `fixed` and `seed` are DEFAULTS, applied only if the caller did not set
  // them. The previous form built the query as `fixed=1&seed=1${extra}`,
  // which APPENDS a second `seed` when the caller passes one in
  // --url-params — and URLSearchParams.get() returns the FIRST match, so
  // every capture ever taken with `--url-params "seed=N"` silently ran
  // seed 1. Found while checking that two different seeds produce different
  // enemy waves: seeds 7 and 8 produced byte-identical output.
  const search = new URLSearchParams(args.urlParams);
  if (!search.has('fixed')) search.set('fixed', '1');
  if (!search.has('seed')) search.set('seed', '1');
  url.search = search.toString();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 672 });

    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(url.toString(), { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

    for (let i = 0; i < args.frames; i++) {
      // Step and READ THE PIXELS IN THE SAME JS TASK. This is the fix for the
      // intermittent all-black frames (world lane, 2 of 14 on one set; 1 of 30
      // reproduced here on tl-black-a), which survived the hmr:false fix
      // because HMR was only one of two causes.
      //
      // screen.js builds `new THREE.WebGLRenderer({ canvas, antialias: false })`
      // with no `preserveDrawingBuffer`, so the drawing buffer is cleared once
      // it has been composited. The old path was:
      //     await page.evaluate(() => window.__step(n));   // renders
      //     await canvas.screenshot({ path: file });       // separate CDP trip
      // If a compositor frame landed between those two round trips the buffer
      // was already cleared and the screenshot read black — no page error, no
      // exception, just a frame of nothing. Silent wrong data, which is the
      // failure class this project keeps paying for.
      //
      // `window.__step` is synchronous (main.js: `(n) => game.step(n)`), so
      // calling toDataURL immediately after it, inside one evaluate, reads the
      // buffer before the compositor can clear it. Fixing it here rather than
      // adding preserveDrawingBuffer to screen.js keeps the game's renderer
      // flags out of it — the capture tool should not change what is rendered,
      // and screen.js belongs to another lane.
      const dataUrl = await page.evaluate((n) => {
        window.__step(n);
        return document.querySelector('#screen').toDataURL('image/png');
      }, args.every);

      const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      const file = path.join(args.out, `frame-${String(i).padStart(4, '0')}.png`);
      await writeFile(file, Buffer.from(b64, 'base64'));
      console.log('captured', file);
    }

    if (errors.length) {
      console.error(`${errors.length} page error(s) during capture:`);
      for (const e of errors) console.error(' ', e);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

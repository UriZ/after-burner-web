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
    // host is PINNED, not left to vite's default. The client below connects to
    // 127.0.0.1 explicitly; if the server were left to bind ::1 (or the
    // default), `localhost` on macOS resolves ::1 first and a run can silently
    // attach to ANOTHER AGENT'S server on a neighbouring port -- which the R6
    // feel critic hit, at the cost of a full set of arms, with plausible stable
    // numbers and no error. Pin both ends or neither is deterministic.
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const address = server.httpServer.address();
  const port = address.port;

  // 127.0.0.1, NOT localhost. Vite binds the IPv4 loopback; on macOS
  // `localhost` resolves ::1 first, so with two agents running their own
  // servers a capture can silently drive ANOTHER AGENT'S TREE. The R6 feel
  // critic hit this: it cost a full set of arms and produced plausible,
  // stable numbers with no error of any kind. Same failure class as every
  // other silent-corruption bug in this tool's history.
  const url = new URL(args.page, `http://127.0.0.1:${port}/`);
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

  // Hoisted out of the try so the `finally` dump can see it — see the
  // comment on that dump below.
  const errors = [];
  const manifest = [];
  let tick = 0;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 672 });

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
      // The same evaluate also reads the SIMULATION STATE it just rendered.
      // That is not a convenience -- it closes a silent-wrong-number class
      // that every other check in this project is blind to.
      //
      // Two readers compared "tick 1950" and disagreed by one channel value.
      // Four experiments ruled out the readback path, stepping granularity
      // and tree drift; the cause was that one run carried `?demo=1` and the
      // other did not, so the two samples were the same TICK INDEX in two
      // different populations -- the attract autopilot on stage 1 versus live
      // input still in the death cycle on stage 0. Both instruments were
      // right, both agreed with themselves, both agreed with a second
      // implementation, and both were stable on repetition. NOTHING WE RUN
      // COULD SEE IT, because a tick index looks like a reportable quantity
      // and is not one without the URL that produced it.
      //
      // `probe.mjs` logged the state it sampled and capture.mjs did not, and
      // that asymmetry is why it took four experiments instead of one. So the
      // manifest below makes a capture set self-describing: every frame
      // carries the URL, the tick and the flow state it was taken in.
      const shot = await page.evaluate((n) => {
        window.__step(n);
        const png = document.querySelector('#screen').toDataURL('image/png');
        let state = null;
        try {
          state = typeof window.__flowState === 'function' ? window.__flowState() : null;
        } catch (e) {
          state = { error: String(e) };
        }
        return { png, state };
      }, args.every);

      const b64 = shot.png.slice(shot.png.indexOf(',') + 1);
      const name = `frame-${String(i).padStart(4, '0')}.png`;
      const file = path.join(args.out, name);
      await writeFile(file, Buffer.from(b64, 'base64'));
      tick += args.every;
      manifest.push({ frame: name, tick, state: shot.state });
      const st = shot.state || {};
      // `stageNumber`, not `stage`: __flowState() exposes `stageIndex` (the
      // 0-based content index) and `stageNumber` (the digit the HUD actually
      // draws) and has no `stage` at all, so the first cut of this line
      // silently printed no stage on every frame -- the guard made the miss
      // look like an absent field rather than a typo. The HUD digit is the
      // right one to surface here because it is what a judge reads off the
      // frame it is standing next to.
      const tag = st.state ? ` [${st.state}${st.stageNumber !== undefined ? ' stage ' + st.stageNumber : ''}]` : '';
      console.log('captured', file + tag);
    }

  } finally {
    // The error dump lives in `finally`, NOT on the success path. It used to
    // sit after the capture loop, so a boot failure — the case where the page
    // errors are the entire diagnosis — presented as a bare puppeteer
    // TimeoutError on `__frameReady` with the real cause collected and then
    // thrown away. That cost the world lane a diagnosis cycle on a break in
    // another lane's file, and it had to write its own puppeteer probe to
    // recover a stack this tool already had in hand.
    // Written even on failure: a partial set still needs to say what it is.
    await writeFile(
      path.join(args.out, 'capture-manifest.json'),
      JSON.stringify({ url: url.toString(), page: args.page, every: args.every, frames: manifest }, null, 2)
    ).catch(() => {});

    if (errors.length) {
      console.error(`${errors.length} page error(s) during capture:`);
      for (const e of errors) console.error(' ', e);
      process.exitCode = 1;
    }
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

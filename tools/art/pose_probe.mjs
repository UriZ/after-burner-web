#!/usr/bin/env node
// Captures a frame AND the simulation's own pose state on the SAME tick of
// the SAME page load.
//
// Why this exists rather than running capture.mjs and combat_probe.mjs
// separately: the question "is the night jet on the authored sheet or has it
// silently fallen back to the procedural texture?" cannot be answered from
// pixels. Both paths end as one sprite with one map, and a LEVEL jet looks
// identical either way — selectPoseCell returns false on a null texture, so
// a decode failure renders a perfectly plausible aircraft. player.js exposes
// `poseSource` for exactly this, but reading it in a second process means a
// second page load, a second PRNG stream and no guarantee the two runs are
// on the same frame. One load, one tick, both facts.
//
// `hmr: false` is copied from capture.mjs deliberately. With HMR on, a file
// written by another lane mid-run either destroys the execution context or
// silently resets simulation state — which is indistinguishable, in the
// output, from a measurement.
//
// Usage:
//   node tools/art/pose_probe.mjs --out <dir> --tick 4920 [--url-params "..."]
//
// Writes <out>/frame.png and prints the flow state as JSON.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

function parseArgs(argv) {
  const args = { tick: 300, urlParams: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--tick') args.tick = Number(argv[++i]);
    else if (a === '--url-params') args.urlParams = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out) {
    console.error('--out is REQUIRED (no default: concurrent agents sharing a path is silent corruption)');
    process.exit(1);
  }
  await mkdir(args.out, { recursive: true });

  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { strictPort: false, hmr: false },
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
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 672 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(url.toString(), { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });
    await page.evaluate((n) => window.__step(n), args.tick);

    const state = await page.evaluate(() =>
      (window.__flowState ? window.__flowState() : { error: '__flowState missing' })
    );
    const canvas = await page.$('#screen');
    await canvas.screenshot({ path: path.join(args.out, 'frame.png') });

    console.log(JSON.stringify({ url: url.toString(), tick: args.tick, state }, null, 2));
    if (errors.length) {
      console.error(`${errors.length} page error(s):`);
      for (const e of errors) console.error(' ', e);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
// Reads the combat systems' internal ground truth per fixed tick and prints
// it as JSON lines. Companion to capture.mjs: that one records what the
// frame LOOKS like, this one records what the simulation BELIEVES, and the
// two together are how a visual claim gets checked without inferring state
// from pixels (an approaching echelon is one merged blob on screen for its
// first three seconds, so pixel-counting under-reports density badly).
//
// Writes nothing to disk — results go to stdout, so there is no shared
// output path to collide on. Requires `?fixed=1`, which is set here.
//
// Usage:
//   node tools/combat_probe.mjs --ticks 1200 [--every 6] [--url-params "..."]

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const args = { ticks: 600, every: 6, urlParams: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ticks') args.ticks = Number(argv[++i]);
    else if (a === '--every') args.every = Number(argv[++i]);
    else if (a === '--url-params') args.urlParams = argv[++i];
    else if (a === '--debug') args.debug = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { strictPort: false },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;

  const url = new URL(`http://localhost:${port}/`);
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
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(url.toString(), { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

    const samples = Math.floor(args.ticks / args.every);
    for (let i = 0; i < samples; i++) {
      const s = await page.evaluate(
        ({ n, debug }) => {
          window.__step(n);
          const base = window.__combatStats ? window.__combatStats() : null;
          if (!debug) return base;
          // Spawner/pacing internals come from Combat's own hook so the
          // diagnostic keeps working across game.js ownership changes.
          return {
            ...(base || {}),
            debug: window.__combatDebug ? window.__combatDebug() : null,
            flow: window.__flowState ? window.__flowState() : null,
          };
        },
        { n: args.every, debug: !!args.debug }
      );
      console.log(JSON.stringify(s));
    }
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

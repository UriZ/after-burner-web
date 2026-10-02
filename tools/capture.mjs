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
import { mkdir } from 'node:fs/promises';
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
    server: { strictPort: false },
    logLevel: 'error',
  });
  await server.listen();
  const address = server.httpServer.address();
  const port = address.port;

  const url = new URL(args.page, `http://localhost:${port}/`);
  url.search = `fixed=1&seed=1${args.urlParams ? '&' + args.urlParams : ''}`;

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
      await page.evaluate((n) => window.__step(n), args.every);
      const file = path.join(args.out, `frame-${String(i).padStart(4, '0')}.png`);
      const canvas = await page.$('#screen');
      await canvas.screenshot({ path: file });
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

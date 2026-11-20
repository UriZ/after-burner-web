#!/usr/bin/env node
// R36 death-legibility lane: replay a playtest session (seed + commands.jsonl)
// tick-exactly, find every death, attribute the killing round (air vs battery,
// from the new hitLog type/from/aim fields), and optionally capture 60 Hz
// frames across the window before each death so the round can be LOOKED at.
//
// Usage:
//   node replay_deaths.mjs --seed 7 --log <ses-commands.jsonl> --out <dir> [--capture]
//
// Pass 1 (always): steps 1 tick at a time through the whole command log,
// recording per-tick {state, score, shotsInAir}; on each flight->death
// transition, snapshots the last hitLog entry + the frozen score + the tick.
// Writes deaths.json.
// With --capture: steps again (new page, same seed/log — deterministic) and
// saves a PNG every tick across [deathTick-150, deathTick+12] for each death.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

function parseArgs(argv) {
  const a = { seed: 7, log: null, out: null, capture: false, pre: 150, post: 12 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--seed') a.seed = Number(argv[++i]);
    else if (k === '--log') a.log = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--capture') a.capture = true;
    else if (k === '--pre') a.pre = Number(argv[++i]);
    else if (k === '--post') a.post = Number(argv[++i]);
    else { console.error(`unknown arg ${k}`); process.exit(2); }
  }
  if (!a.log || !a.out) { console.error('--log and --out are required'); process.exit(2); }
  return a;
}

async function boot(seed) {
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
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
  return { server, browser, page, errors };
}

async function loadCommands(logPath) {
  const text = await readFile(logPath, 'utf8');
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

// Scan pass: 1 tick per evaluate, watching for death transitions.
async function scan(page, commands) {
  const deaths = [];
  const tickLog = []; // {tick, state, score, air}
  let prevState = null;
  for (const cmd of commands) {
    await page.evaluate((stick) => window.__setStick(stick), cmd.stick);
    const ticks = cmd.tickEnd - cmd.tickStart;
    for (let i = 0; i < ticks; i++) {
      const tick = cmd.tickStart + i + 1;
      const s = await page.evaluate(() => {
        window.__step(1);
        const f = window.__flowState();
        const fa = window.__fairness ? window.__fairness() : null;
        return {
          state: f.state,
          score: Math.floor(f.score),
          air: fa ? fa.shotsInAir : null,
          lastHit: fa && fa.hitLog.length ? fa.hitLog[fa.hitLog.length - 1] : null,
        };
      });
      tickLog.push([tick, s.state, s.score, s.air]);
      if (prevState !== 'death' && s.state === 'death') {
        deaths.push({ tick, score: s.score, hit: s.lastHit });
      }
      prevState = s.state;
    }
  }
  return { deaths, tickLog };
}

// Capture pass: re-run, saving a PNG per tick inside the requested windows.
async function capture(page, commands, windows, outDir) {
  await mkdir(outDir, { recursive: true });
  const inWindow = (t) => windows.find((w) => t >= w.from && t <= w.to);
  for (const cmd of commands) {
    await page.evaluate((stick) => window.__setStick(stick), cmd.stick);
    let t = cmd.tickStart;
    while (t < cmd.tickEnd) {
      const w = inWindow(t + 1);
      if (!w) {
        // Step in bulk to the next interesting tick (or the command end).
        const nexts = windows.map((x) => x.from).filter((f) => f > t + 1);
        const target = Math.min(cmd.tickEnd, nexts.length ? Math.min(...nexts) - 1 : cmd.tickEnd);
        const n = Math.max(1, target - t);
        await page.evaluate((k) => window.__step(k), n);
        t += n;
        continue;
      }
      const png = await page.evaluate(() => {
        window.__step(1);
        return document.querySelector('#screen').toDataURL('image/png');
      });
      t += 1;
      const file = path.join(outDir, `${w.name}-t${String(t).padStart(5, '0')}.png`);
      await writeFile(file, Buffer.from(png.split(',')[1], 'base64'));
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.out, { recursive: true });
  const commands = await loadCommands(args.log);

  let ctx = await boot(args.seed);
  const { deaths, tickLog } = await scan(ctx.page, commands);
  await ctx.browser.close();
  await ctx.server.close();

  await writeFile(
    path.join(args.out, 'deaths.json'),
    JSON.stringify({ seed: args.seed, log: args.log, deaths, errors: ctx.errors }, null, 2)
  );
  await writeFile(
    path.join(args.out, 'ticklog.json'),
    JSON.stringify(tickLog)
  );
  console.log(JSON.stringify({ seed: args.seed, deaths, errors: ctx.errors }, null, 2));

  if (args.capture && deaths.length) {
    const windows = deaths.map((d, i) => ({
      name: `death${i + 1}`,
      from: Math.max(1, d.tick - args.pre),
      to: d.tick + args.post,
    }));
    ctx = await boot(args.seed);
    await capture(ctx.page, commands, windows, path.join(args.out, 'frames'));
    await ctx.browser.close();
    await ctx.server.close();
    console.log(`frames written to ${path.join(args.out, 'frames')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

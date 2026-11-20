// nose_kill_capture.mjs — R38 kill-placement lane.
//
// 60 Hz capture of a seed-7 HANDS-OFF (centered stick, fire held) crosser
// nose-kill: pass 1 steps tick-by-tick draining the killLog to find the
// global tick of the first vulcan crosser kill after --after-tick, pass 2
// re-runs the same deterministic schedule and screenshots every tick from
// kill-15 to kill+N. The stick schedule is identical in both passes (held
// constant every tick), so the tick index transfers exactly.
//
// Usage: node judging/R38/kill-placement/nose_kill_capture.mjs \
//          --out <UNIQUE dir> [--seed 7] [--after-tick 3600] [--post 75]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const args = { seed: 7, afterTick: 3600, post: 75, pre: 15, out: null, pattern: 'crosser', minD: 0, src: 'vulcan' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--out') args.out = argv[++i];
  else if (a === '--seed') args.seed = Number(argv[++i]);
  else if (a === '--after-tick') args.afterTick = Number(argv[++i]);
  else if (a === '--post') args.post = Number(argv[++i]);
  else if (a === '--pattern') args.pattern = argv[++i];
  else if (a === '--min-d') args.minD = Number(argv[++i]);
  else if (a === '--src') args.src = argv[++i];
  else {
    console.error(`unknown arg ${a}`);
    process.exit(2);
  }
}
if (!args.out) {
  console.error('--out is REQUIRED (unique dir)');
  process.exit(1);
}
await mkdir(args.out, { recursive: true });

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function newGame() {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${args.seed}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
  return page;
}

// Pass 1: find the kill tick.
let page = await newGame();
const found = await page.evaluate(
  async ({ afterTick, pattern, minD, src }) => {
    const MAX = afterTick + 7200;
    for (let tick = 0; tick < MAX; tick += 1) {
      window.__setStick({ x: 0, y: 0, fire: true, missile: true, throttleIndex: 1 });
      window.__step(1);
      const drained = window.__killDrain ? window.__killDrain() : null;
      if (!drained) continue;
      for (const k of drained.kills) {
        if (tick > afterTick && k.src === src && k.pattern === pattern && k.d >= minD) {
          return { tick: tick + 1, kill: k };
        }
      }
    }
    return null;
  },
  { afterTick: args.afterTick, pattern: args.pattern, minD: args.minD, src: args.src },
);
await page.close();
if (!found) {
  console.error('no matching kill found');
  process.exit(1);
}
console.error(`kill at global tick ${found.tick}:`, JSON.stringify(found.kill));

// Pass 2: capture.
page = await newGame();
const start = found.tick - args.pre;
await page.evaluate(async (n) => {
  for (let i = 0; i < n; i += 1) {
    window.__setStick({ x: 0, y: 0, fire: true, missile: true, throttleIndex: 1 });
    window.__step(1);
  }
}, start);
const canvas = await page.$('canvas');
for (let i = 0; i <= args.pre + args.post; i++) {
  const buf = await canvas.screenshot({ type: 'png' });
  await writeFile(path.join(args.out, `frame-${String(i).padStart(4, '0')}.png`), buf);
  await page.evaluate(() => {
    window.__setStick({ x: 0, y: 0, fire: true, missile: true, throttleIndex: 1 });
    window.__step(1);
  });
}
await writeFile(
  path.join(args.out, 'meta.json'),
  JSON.stringify({ args, found, note: 'frame-0000 = killTick - pre' }, null, 1),
);
console.log(JSON.stringify({ out: args.out, found }, null, 1));
await page.close();
await browser.close();
await server.close();

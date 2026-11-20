// Active-play capture: drives the aim+fire pilot and screenshots a window,
// so the close-drought clip's effect is visible (it only fires in a firing
// player's drought — a demo capture would never show it).
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = '/Users/urizonens/dev/afterburner-three';
const argv = process.argv.slice(2);
const args = { seed: 7, from: 40, to: 70, every: 1.0, out: 'out', urlParams: '' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seed') args.seed = Number(argv[++i]);
  else if (a === '--from') args.from = Number(argv[++i]);
  else if (a === '--to') args.to = Number(argv[++i]);
  else if (a === '--every') args.every = Number(argv[++i]);
  else if (a === '--out') args.out = argv[++i];
  else if (a === '--url-params') args.urlParams = argv[++i];
}
fs.mkdirSync(args.out, { recursive: true });

const server = await createServer({ root: ROOT, configFile: path.join(ROOT, 'vite.config.js'), server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const port = server.httpServer.address().port;
const url = new URL(`http://127.0.0.1:${port}/`);
const search = new URLSearchParams(args.urlParams);
search.set('fixed', '1');
if (!search.has('seed')) search.set('seed', String(args.seed));
url.search = search.toString();

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 448 });
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

  const fromTick = Math.floor(args.from * 60);
  const toTick = Math.floor(args.to * 60);
  const everyTick = Math.floor(args.every * 60);
  let shot = 0;
  for (let i = 0; i < toTick; i++) {
    // Active aim + fire, same controller as the cadence probe.
    const ctl = await page.evaluate(() => {
      const stats = window.__combatStats ? window.__combatStats() : null;
      const sight = window.__sight ? window.__sight() : null;
      let target = null;
      if (stats && stats.enemies) for (const e of stats.enemies) { if (!e.onScreen) continue; if (!target || e.depth < target.depth) target = e; }
      let sx = 0, sy = 0;
      if (target && sight) {
        const K = 4.0;
        sx = Math.max(-1, Math.min(1, K * (target.ndcX - sight.ndcX)));
        sy = Math.max(-1, Math.min(1, K * (target.ndcY - sight.ndcY)));
      }
      window.__setStick({ x: sx, y: sy, fire: true, missile: true, throttleIndex: 1 });
      window.__step(1);
      return true;
    });
    if (i >= fromTick && (i - fromTick) % everyTick === 0) {
      await page.screenshot({ path: path.join(args.out, `f${String(shot).padStart(4, '0')}.png`) });
      shot++;
    }
  }
  console.log(`captured ${shot} frames to ${args.out}`);
} finally {
  await browser.close();
  await server.close();
}

#!/usr/bin/env node
// Battery legibility/lethality sweep. Runs ?demo=1 arms distinguished only by
// the ?battery= measurement override (no source edits between arms), and reads
// the battery-specific crossing census (combat.js batteryCrossings/batteryHits)
// plus deaths — the per-round battery hit probability is the estimator, deaths
// the (noisy) prediction check.
//
//   node battery_sweep.mjs --arms "speed=10,spread=0.06;speed=8,spread=0.025" \
//     --seeds 4,5,6 --seconds 120
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

const argv = process.argv.slice(2);
const args = { arms: '', seeds: [4, 5, 6], seconds: 120, every: 6 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--arms') args.arms = argv[++i];
  else if (argv[i] === '--seeds') args.seeds = argv[++i].split(',').map(Number);
  else if (argv[i] === '--seconds') args.seconds = Number(argv[++i]);
}
const arms = args.arms.split(';').filter(Boolean);

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

const results = [];
for (const arm of arms) {
  let deaths = 0, bx = 0, bh = 0, flights = 0, total = 0, fatalBattery = 0, fatalAir = 0;
  for (const seed of args.seeds) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(
      `http://127.0.0.1:${port}/?fixed=1&demo=1&seed=${seed}&battery=${encodeURIComponent(arm)}`,
      { waitUntil: 'load' }
    );
    await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
    const samples = Math.round(args.seconds / (args.every / 60));
    let prev = null;
    for (let i = 0; i < samples; i++) {
      const s = await page.evaluate((n) => {
        window.__step(n);
        return window.__flowState().state;
      }, args.every);
      if (prev !== 'death' && s === 'death') deaths += 1;
      if (s === 'flight') flights += 1;
      total += 1;
      prev = s;
    }
    const fair = await page.evaluate(() => window.__fairness());
    bx += fair.batteryCrossings; bh += fair.batteryHits;
    for (const h of fair.hitLog.filter((h) => h.fatal)) {
      if (h.type === 'battery') fatalBattery += 1; else fatalAir += 1;
    }
    if (errors.length) console.error('PAGE ERRORS', arm, seed, errors);
    await page.close();
  }
  const wallMin = (args.seconds * args.seeds.length) / 60;
  results.push({
    arm,
    deaths,
    deathsPerMin: Number((deaths / wallMin).toFixed(3)),
    fatalBattery,
    fatalAir,
    batteryCrossings: bx,
    batteryHits: bh,
    batteryPHit: bx ? Number((bh / bx).toFixed(3)) : null,
    flightShare: Number((flights / total).toFixed(3)),
  });
  console.log(JSON.stringify(results[results.length - 1]));
}
await browser.close();
await server.close();
console.log(JSON.stringify(results, null, 2));

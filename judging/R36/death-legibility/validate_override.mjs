#!/usr/bin/env node
// Instrument validation on a known input: with ?battery=speed=4, a battery
// kill's hitLog warning MUST read ~0.4 + (fromD - 5)/4 (= 1.98 s for the
// standard fromD 11.36 launch); with speed=10 it must read ~1.03 s. Runs
// ?demo=1 seed 4 for up to 150 s and prints every battery hit's warning.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const arm = process.argv[2] || 'speed=4,spread=0.035';

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/?fixed=1&demo=1&seed=4&invincible=1&battery=${encodeURIComponent(arm)}`, { waitUntil: 'load' });
await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
await page.evaluate(() => window.__step(9000)); // 150 s
const fair = await page.evaluate(() => window.__fairness());
const battery = fair.hitLog.filter((h) => h.type === 'battery');
console.log(JSON.stringify({
  arm,
  batteryHits: battery.map((h) => ({ warning: Number(h.warning.toFixed(3)), fromD: h.fromD, teleS: 0.4 })),
  batteryCrossings: fair.batteryCrossings,
  errors,
}, null, 2));
await browser.close();
await server.close();

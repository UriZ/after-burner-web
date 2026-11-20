#!/usr/bin/env node
// R36 cruise-sway verification: (1) barrel roll still runs rigid and ends
// snapped level with sway active; (2) a held bank fades sway out (no
// fighting); (3) release fades it back in. Telemetry to stdout JSONL,
// frames into --out.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = process.argv[2];
if (!OUT) {
  console.error('usage: node verify_roll_bank.mjs <out-dir>');
  process.exit(1);
}
await mkdir(OUT, { recursive: true });

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=2`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

  const log = [];
  const stepRead = async (n, tag) => {
    for (let i = 0; i < n; i++) {
      const s = await page.evaluate(() => {
        window.__step(1);
        const f = window.__flowState();
        return {
          state: f.state,
          worldRollDeg: f.worldRollDeg,
          swayGain: f.swayGain,
          swayRollDeg: f.swayRollDeg,
          rollPhase: f.rollPhase,
          rolling: f.rolling,
        };
      });
      log.push({ tag, ...s });
    }
  };
  const stick = (s) => page.evaluate((v) => window.__setStick(v), s);
  const shot = async (name) => {
    const buf = await page.screenshot();
    await writeFile(path.join(OUT, name), buf);
  };

  // Phase 1: cruise with sway up.
  await stick({ x: 0, y: 0 });
  await stepRead(150, 'cruise');
  await shot('cruise-t300.png');

  // Phase 2: barrel roll via double right-flick (rising edges <0.35s apart).
  await stick({ x: 1, y: 0 });
  await stepRead(4, 'flick1');
  await stick({ x: 0, y: 0 });
  await stepRead(6, 'gap');
  await stick({ x: 1, y: 0 });
  await stepRead(4, 'flick2');
  await stick({ x: 0, y: 0 });
  await stepRead(80, 'roll'); // roll lasts ~1.1s = 66 ticks; overshoot into recovery
  await shot('rollend-t394.png');
  await stepRead(60, 'postroll');
  await shot('postroll-t514.png');

  // Phase 3: held bank — sway must fade, player roll must own the horizon.
  await stick({ x: 1, y: 0 });
  await stepRead(90, 'bank');
  await shot('bank-held-t604.png');
  await stick({ x: 0, y: 0 });
  await stepRead(100, 'release');
  await shot('release-t754.png');

  await writeFile(path.join(OUT, 'telemetry.jsonl'), log.map((r) => JSON.stringify(r)).join('\n'));
  if (errors.length) {
    console.error('page errors:', errors);
    process.exitCode = 1;
  }

  // Assertions
  const rollTicks = log.filter((r) => r.rolling);
  const postroll = log.filter((r) => r.tag === 'postroll');
  const bankTail = log.filter((r) => r.tag === 'bank').slice(-20);
  console.log('roll ticks:', rollTicks.length);
  console.log('sway during roll (max |swayRollDeg|):', Math.max(0, ...rollTicks.map((r) => Math.abs(r.swayRollDeg))).toFixed(3));
  console.log('first 5 postroll worldRollDeg:', postroll.slice(0, 5).map((r) => r.worldRollDeg.toFixed(2)).join(', '));
  console.log('bank tail: worldRoll', bankTail[bankTail.length - 1].worldRollDeg.toFixed(1), 'swayGain', bankTail[bankTail.length - 1].swayGain.toFixed(3), 'swayRollDeg', bankTail[bankTail.length - 1].swayRollDeg.toFixed(3));
  const rel = log.filter((r) => r.tag === 'release');
  console.log('release tail: worldRoll', rel[rel.length - 1].worldRollDeg.toFixed(2), 'swayGain', rel[rel.length - 1].swayGain.toFixed(3));
} finally {
  await browser.close();
  await server.close();
}

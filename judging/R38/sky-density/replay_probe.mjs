// replay_probe.mjs — R38 sky-density lane.
// Replays a playtest session's exact commands.jsonl (deterministic ?fixed=1
// path, same seed) and logs the spawner's ground truth every N ticks:
// on-screen aircraft count (batteries excluded), max span, per-enemy
// pattern/depth/position. Purpose: identify WHICH wave pattern the playtest's
// "parked wingmen" were (s1 ticks 926-956), and extract the exact zero-enemy
// gap structure of the run the verdict describes.
//
// Usage: node judging/R38/sky-density/replay_probe.mjs <commands.jsonl> <seed> <out.json> [detailStart,detailEnd ...]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';

const cmdPath = process.argv[2];
const seed = Number(process.argv[3] ?? 7);
const outPath = process.argv[4] ?? 'replay-out.json';
const detailWindows = process.argv.slice(5).map((s) => s.split(',').map(Number));

const commands = readFileSync(cmdPath, 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((c) => !c.quit && c.stick);

const server = await createServer({
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
page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}`, { waitUntil: 'load' });
await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

const out = await page.evaluate(
  async ({ commands, detailWindows }) => {
    const SAMPLE_EVERY = 2; // ticks; 30 Hz sampling, fine enough for 1 s gaps
    const samples = [];
    const details = [];
    let tick = 0;
    for (const cmd of commands) {
      window.__setStick(cmd.stick);
      let left = cmd.tickEnd - cmd.tickStart;
      while (left > 0) {
        const n = Math.min(SAMPLE_EVERY, left);
        window.__step(n);
        tick += n;
        left -= n;
        const st = window.__combatStats ? window.__combatStats() : null;
        const fs = window.__flowState ? window.__flowState() : null;
        if (!st) continue;
        const aircraft = st.enemies.filter((e) => e.pattern !== 'battery');
        const onScreen = aircraft.filter((e) => e.onScreen);
        let maxSpan = 0;
        for (const e of onScreen) if (e.spanFrac > maxSpan) maxSpan = e.spanFrac;
        samples.push({
          tick,
          state: fs ? fs.state : null,
          stage: fs ? fs.stageNumber : null,
          n: onScreen.length,
          maxSpan: Number(maxSpan.toFixed(4)),
        });
        const inDetail = detailWindows.some(([a, b]) => tick >= a && tick <= b);
        if (inDetail) {
          details.push({
            tick,
            enemies: aircraft.map((e) => ({
              id: e.id,
              pattern: e.pattern,
              type: e.type,
              d: Number(e.depth.toFixed(2)),
              x: Number(e.ndcX.toFixed(3)),
              y: Number(e.ndcY.toFixed(3)),
              span: Number(e.spanFrac.toFixed(4)),
              onScreen: e.onScreen,
            })),
          });
        }
      }
    }
    return { samples, details, endTick: tick };
  },
  { commands, detailWindows },
);

writeFileSync(outPath, JSON.stringify(out));
console.log(`wrote ${outPath}: ${out.samples.length} samples to tick ${out.endTick}`);
await page.close();
await browser.close();
await server.close();

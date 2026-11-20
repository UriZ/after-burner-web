// val_probe.mjs — instrument validation for the R37 r32-reconcile lane.
// Same pilot/operator as judging/R36/depth-combat/presence_probe.mjs (aim-and-fire,
// K=4, no jitter, stick every 5 ticks), but every SNAP_EVERY ticks it ALSO saves a
// screenshot and records the probe's own per-sample call (largest on-screen span,
// present>=8%W boolean) so a human can hand-count the PNGs against the probe.
// Usage: node val_probe.mjs <seed> <secs> <outDir>   (cwd must be the tree to serve)
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const seed = Number(process.argv[2] ?? 7);
const secs = Number(process.argv[3] ?? 30);
const outDir = process.argv[4];
if (!outDir) throw new Error('outDir required');
fs.mkdirSync(outDir, { recursive: true });

const SNAP_EVERY = 30; // 0.5 s

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 672 });
page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}`, { waitUntil: 'load' });
await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

const ticks = Math.floor(secs * 60);
const log = [];
for (let i = 0; i < ticks; i += 5) {
  const rec = await page.evaluate(() => {
    const stats = window.__combatStats ? window.__combatStats() : null;
    const sight = window.__sight ? window.__sight() : null;
    let target = null;
    if (stats && stats.enemies) {
      for (const e of stats.enemies) {
        if (!e.onScreen) continue;
        if (!target || e.depth < target.depth) target = e;
      }
    }
    let sx = 0, sy = 0;
    if (target && sight) {
      const K = 4.0;
      sx = Math.max(-1, Math.min(1, K * (target.ndcX - sight.ndcX)));
      sy = Math.max(-1, Math.min(1, K * (target.ndcY - sight.ndcY)));
    }
    window.__setStick({ x: sx, y: sy, fire: true, missile: true, throttleIndex: 1 });
    window.__step(5);
    const st = window.__combatStats ? window.__combatStats() : null;
    const fs2 = window.__flowState ? window.__flowState() : null;
    const spans = st && st.enemies
      ? st.enemies.filter((e) => e.onScreen).map((e) => Number((e.spanFrac * 100).toFixed(2)))
      : [];
    return {
      state: fs2 ? fs2.state : null,
      maxSpan: spans.length ? Math.max(...spans) : 0,
      spans,
    };
  });
  const tick = i + 5;
  if (tick % SNAP_EVERY === 0) {
    const name = `t${String(tick).padStart(5, '0')}`;
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    log.push({ tick, ...rec, present8: rec.state === 'flight' && rec.maxSpan >= 8 });
  }
}
fs.writeFileSync(path.join(outDir, 'val_log.json'), JSON.stringify(log, null, 1));
const flight = log.filter((r) => r.state === 'flight');
console.log(JSON.stringify({
  seed, secs, snaps: log.length, flightSnaps: flight.length,
  present8Frac: Number((flight.filter((r) => r.present8).length / Math.max(1, flight.length)).toFixed(3)),
}));
await browser.close();
await server.close();

// state_probe.mjs — R38 sky-density diagnostic: where does the time go?
// Logs flow-state occupancy, deaths, stage reached, kills for one arm.
// Usage: node state_probe.mjs <secs> <seed> [extraQuery]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const secs = Number(process.argv[2] ?? 120);
const seed = Number(process.argv[3] ?? 7);
const extra = process.argv[4] ?? '';

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 672 });
page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}${extra ? '&' + extra : ''}`, {
  waitUntil: 'load',
});
await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
const out = await page.evaluate(
  async ({ ticks }) => {
    const occ = {};
    let deaths = 0;
    let prevState = null;
    let maxStage = 0;
    for (let i = 0; i < ticks; i += 5) {
      const stats = window.__combatStats ? window.__combatStats() : null;
      const sight = window.__sight ? window.__sight() : null;
      let target = null;
      if (stats && stats.enemies) {
        for (const e of stats.enemies) {
          if (!e.onScreen || e.pattern === 'battery') continue;
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
      const fs = window.__flowState ? window.__flowState() : null;
      if (!fs) continue;
      occ[fs.state] = (occ[fs.state] ?? 0) + 5;
      if (fs.state === 'death' && prevState !== 'death') deaths += 1;
      prevState = fs.state;
      if (fs.stageNumber > maxStage) maxStage = fs.stageNumber;
    }
    const f = window.__fairness ? window.__fairness() : null;
    return { occ, deaths, maxStage, kills: f ? f.killCounts : null, hits: f ? f.hits : null };
  },
  { ticks: Math.floor(secs * 60) },
);
console.log(JSON.stringify({ seed, extra, ...out }));
await page.close();
await browser.close();
await server.close();

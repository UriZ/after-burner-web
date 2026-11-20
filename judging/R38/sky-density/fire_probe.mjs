// fire_probe.mjs — R38 sky-density: enemy FIRE VOLUME and player HITS per
// FLIGHT-SECOND under a continuous-flight PINNED pilot, so the demo-timeline
// flightShare confound (which wrecks ?demo=1 deaths/min here) is removed.
//
// Pilot: the R36 aim-and-fire controller (steers sight onto nearest enemy,
// fire+missile held) — flies continuously, ~equal flightShare both arms.
// Counts: enemy shotsFired (from __fairness), telegraphsStarted, player
// hitsTaken, all per FLIGHT-second (samples where flow state == flight).
// The question this answers: did my non-firing spawner changes raise enemy
// fire volume? They cannot by construction (relief pairs + faster crossers
// never fire), and this measures it directly.
//
// Usage: node fire_probe.mjs <secs> <seeds> <label> [extraQuery]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const secs = Number(process.argv[2] ?? 120);
const seeds = (process.argv[3] ?? '7,11,3').split(',').map(Number);
const label = process.argv[4] ?? 'arm';
const extra = process.argv[5] ?? '';

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

for (const seed of seeds) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}${extra ? '&' + extra : ''}`, {
    waitUntil: 'load',
  });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
  const out = await page.evaluate(
    async ({ ticks }) => {
      let flightSamples = 0;
      let deaths = 0;
      let prevState = null;
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
        if (fs && fs.state === 'flight') flightSamples += 1;
        if (fs && fs.state === 'death' && prevState !== 'death') deaths += 1;
        if (fs) prevState = fs.state;
      }
      const f = window.__fairness ? window.__fairness() : null;
      return {
        flightSecs: (flightSamples * 5) / 60,
        deaths,
        shotsFired: f ? f.shotsFired : null,
        telegraphsStarted: f ? f.telegraphsStarted : null,
        hitsTaken: f ? f.playerHitsTaken : null,
      };
    },
    { ticks: Math.floor(secs * 60) },
  );
  const fm = Math.max(1, out.flightSecs / 60);
  console.log(
    JSON.stringify({
      label,
      seed,
      flightSecs: Number(out.flightSecs.toFixed(1)),
      shotsPerFlightMin: Number((out.shotsFired / fm).toFixed(1)),
      telegraphsPerFlightMin: Number((out.telegraphsStarted / fm).toFixed(1)),
      hitsPerFlightMin: Number((out.hitsTaken / fm).toFixed(2)),
      deaths: out.deaths,
      deathsPerFlightMin: Number((out.deaths / fm).toFixed(2)),
    }),
  );
  await page.close();
}
await browser.close();
await server.close();

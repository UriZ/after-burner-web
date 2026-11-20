// deep_traj_probe.mjs — R36: verifies the new deep-formation pass BEHAVES as
// authored: enters at mid depth, tracks the upper sky, exits the far side
// without converging on the player. Deep members are uniquely identifiable in
// __combatStats as pattern 'crosser' + type 'fighter' (_crosserWave is all
// interceptors, _flyby is a bomber). Passive invincible run, no shooting, so
// the trajectories are unperturbed.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const secs = Number(process.argv[2] ?? 150);
const seed = Number(process.argv[3] ?? 7);

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
await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}&invincible=1`, {
  waitUntil: 'load',
});
await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

const out = await page.evaluate(
  async ({ ticks }) => {
    const tracks = new Map(); // enemy id -> samples
    for (let i = 0; i < ticks; i += 5) {
      window.__setStick({ x: 0, y: 0, fire: false, missile: false, throttleIndex: 1 });
      window.__step(5);
      const st = window.__combatStats ? window.__combatStats() : null;
      if (!st || !st.enemies) continue;
      for (const e of st.enemies) {
        if (e.pattern !== 'crosser' || e.type !== 'fighter') continue;
        const key = String(e.id);
        if (!tracks.has(key)) tracks.set(key, []);
        tracks.get(key).push({
          t: i,
          d: Number(e.depth.toFixed(1)),
          x: Number(e.ndcX.toFixed(3)),
          y: Number(e.ndcY.toFixed(3)),
          w: Number(e.spanFrac.toFixed(4)),
        });
      }
    }
    const waves = [];
    for (const [key, samples] of tracks) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const minD = Math.min(...samples.map((s) => s.d));
      const maxW = Math.max(...samples.map((s) => s.w));
      const minY = Math.min(...samples.map((s) => s.y));
      const maxY = Math.max(...samples.map((s) => s.y));
      waves.push({
        id: key,
        n: samples.length,
        first,
        last,
        minDepth: minD,
        maxSpanFrac: maxW,
        pyRange: [minY, maxY],
      });
    }
    return waves;
  },
  { ticks: Math.floor(secs * 60) },
);
console.log(JSON.stringify(out, null, 1));
await browser.close();
await server.close();

// missile_traj_probe.mjs — dump ONE guided missile's full screen trajectory,
// read from the live __missiles() hook (read geometry from the live hook).
// Flies the naive aim pilot (same controller as aim_lock_probe), fires on a
// lock, and records ndcX/ndcY/depth/turn/lat per tick for the first missile
// that goes into flight, so the arc shape can be judged numerically.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const args = { seed: 7, secs: 12, jitter: 0, urlParams: '' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seed') args.seed = Number(argv[++i]);
  else if (a === '--secs') args.secs = Number(argv[++i]);
  else if (a === '--jitter') args.jitter = Number(argv[++i]);
  else if (a === '--url-params') args.urlParams = argv[++i];
}

const server = await createServer({ server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
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
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

  const ticks = Math.floor(args.secs * 60);
  const out = await page.evaluate(({ ticks, JITTER }) => {
    let traj = null; // trajectory of the first tracked missile
    let done = false;
    for (let i = 0; i < ticks && !done; i++) {
      const stats = window.__combatStats ? window.__combatStats() : null;
      const sight = window.__sight ? window.__sight() : null;
      let target = null;
      if (stats && stats.enemies) for (const e of stats.enemies) {
        if (!e.onScreen) continue;
        if (!target || e.depth < target.depth) target = e;
      }
      let sx = 0, sy = 0;
      if (target && sight) {
        const K = 4.0;
        const jx = JITTER * Math.sin(i * 0.9 + 1.3);
        const jy = JITTER * Math.sin(i * 1.27 + 0.4);
        sx = Math.max(-1, Math.min(1, K * (target.ndcX - sight.ndcX) + jx));
        sy = Math.max(-1, Math.min(1, K * (target.ndcY - sight.ndcY) + jy));
      }
      window.__setStick({ x: sx, y: sy, missile: true, throttleIndex: 1 });
      window.__step(1);
      const ms = window.__missiles ? window.__missiles() : [];
      if (ms.length) {
        // Lock onto the first missile; follow it until it leaves flight.
        if (!traj) traj = [];
        const m = ms[0];
        traj.push({
          age: m.age, d: m.depth, x: m.ndcX, y: m.ndcY,
          turn: m.turn, lat: m.lat, dead: m.dead,
          tgtX: m.tgt ? Number(m.tgt.x.toFixed(4)) : null,
          tgtY: m.tgt ? Number(m.tgt.y.toFixed(4)) : null,
          tgtD: m.tgt ? m.tgt.d : null,
        });
      } else if (traj && traj.length) {
        done = true; // the tracked missile retired
      }
    }
    return { traj };
  }, { ticks, JITTER: args.jitter });

  const t = out.traj || [];
  // Summarise the arc: total lateral screen travel, peak turn, splay extent.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, peakTurn = 0;
  for (const p of t) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    peakTurn = Math.max(peakTurn, p.turn);
  }
  console.log(JSON.stringify({
    seed: args.seed, jitter: args.jitter, n: t.length,
    xRange: [Number(minX.toFixed(3)), Number(maxX.toFixed(3))],
    yRange: [Number(minY.toFixed(3)), Number(maxY.toFixed(3))],
    xSpan: Number((maxX - minX).toFixed(3)),
    ySpan: Number((maxY - minY).toFixed(3)),
    peakTurn: Number(peakTurn.toFixed(3)),
    startLat: t.length ? t[0].lat : null,
    endLat: t.length ? t[t.length - 1].lat : null,
    samples: t.map((p) => ({ age: Number(p.age.toFixed(3)), x: Number(p.x.toFixed(3)), y: Number(p.y.toFixed(3)), d: Number(p.d.toFixed(1)), turn: Number(p.turn.toFixed(2)), lat: p.lat === null ? null : Number(p.lat.toFixed(3)), tx: p.tgtX, ty: p.tgtY })),
    errors,
  }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

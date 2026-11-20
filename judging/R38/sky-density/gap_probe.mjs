// gap_probe.mjs — R38 sky-density: empty-sky gap structure + close presence,
// PINNED PILOT (the R37 r32-reconcile mandate: the statistic is
// pilot-dominated, so any published number names its pilot).
//
// Pilot: the R36 presence_probe controller — proportional steer of the sight
// onto the nearest on-screen enemy, fire+missile held (kills ~40/min; the
// WORST case for emptiness, since a lethal pilot drains the sky fastest).
// Operators, stated:
//   * zero-aircraft: no non-battery enemy with |ndc|<=1 (spawner truth, not
//     pixels). Gap = consecutive flight-state run of zero-aircraft samples,
//     sampled every 2 ticks (30 Hz).
//   * visible-empty: no non-battery on-screen enemy with spanFrac >= 0.015
//     (~5 native px — below that an aircraft is a 1-4 px dot a player does
//     not register; the R38 playtest called a sky with only such dots
//     "totally empty").
//   * presence: >=1 on-screen enemy at spanFrac >= 0.08. NOMINAL projected
//     wingspan (70.6/depth), which is ~2x the drawn width on current art
//     (R37 r32-reconcile finding 4) — comparable across our builds, LENIENT
//     vs any arcade hand-read.
//
// Usage: node gap_probe.mjs <secs> <seeds> <label> [extraQuery]
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
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const seed of seeds) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
  await page.goto(
    `http://127.0.0.1:${port}/?fixed=1&seed=${seed}${extra ? '&' + extra : ''}`,
    { waitUntil: 'load' },
  );
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
  const out = await page.evaluate(
    async ({ ticks }) => {
      const SAMPLE = 2;
      const rows = [];
      for (let i = 0; i < ticks; i += 5) {
        // steer every 5 ticks (the R36 controller cadence), sample every 2
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
        for (let j = 0; j < 5; j += SAMPLE) {
          window.__step(SAMPLE);
          const st = window.__combatStats ? window.__combatStats() : null;
          const fs = window.__flowState ? window.__flowState() : null;
          if (!st) continue;
          const air = st.enemies.filter((e) => e.pattern !== 'battery' && e.onScreen);
          let maxSpan = 0;
          for (const e of air) if (e.spanFrac > maxSpan) maxSpan = e.spanFrac;
          rows.push({
            f: fs && fs.state === 'flight' ? 1 : 0,
            n: air.length,
            s: Number(maxSpan.toFixed(4)),
          });
        }
      }
      return rows;
    },
    { ticks: Math.floor(secs * 60) },
  );
  // analysis
  const flight = out.filter((r) => r.f);
  const frac = (pred) => flight.filter(pred).length / Math.max(1, flight.length);
  const gapRuns = (pred) => {
    const runs = [];
    let run = 0;
    for (const r of out) {
      if (r.f && pred(r)) run += 1;
      else {
        if (run) runs.push(run);
        run = 0;
      }
    }
    if (run) runs.push(run);
    return runs.map((n) => (n * 2) / 60).filter((s) => s >= 1);
  };
  const zeroGaps = gapRuns((r) => r.n === 0);
  const visGaps = gapRuns((r) => r.s < 0.015);
  console.log(
    JSON.stringify({
      label,
      seed,
      secs,
      flightSecs: Number(((flight.length * 2) / 60).toFixed(1)),
      zeroFrac: Number(frac((r) => r.n === 0).toFixed(3)),
      visEmptyFrac: Number(frac((r) => r.s < 0.015).toFixed(3)),
      presence8: Number(frac((r) => r.s >= 0.08).toFixed(3)),
      zeroGapsGe1s: zeroGaps.map((s) => Number(s.toFixed(2))),
      visGapsGe1s: visGaps.map((s) => Number(s.toFixed(2))),
      maxZeroGap: Number((Math.max(0, ...zeroGaps)).toFixed(2)),
      maxVisGap: Number((Math.max(0, ...visGaps)).toFixed(2)),
    }),
  );
  await page.close();
}
await browser.close();
await server.close();

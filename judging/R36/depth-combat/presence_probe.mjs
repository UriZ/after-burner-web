// presence_probe.mjs — R36: re-checks the R32 close-presence band after the
// depth-combat changes. Operator (same as judging/R32/cadence/): fraction of
// flight samples with >=1 on-screen enemy at span >= 8 %W, under an ACTIVE
// aim-and-fire pilot (the R32 defect arm read 7-13 %; the fix target was
// corrected R37: R32's real published figure was 0.12-0.24; arcade 0.40-0.70, stricter drawn-width operator). Samples every 5 ticks (12 Hz).
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const secs = Number(process.argv[2] ?? 120);
const seeds = (process.argv[3] ?? '7,3').split(',').map(Number);
const extraParams = process.argv[4] ?? '';

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
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}${extraParams ? '&' + extraParams : ''}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });
  const out = await page.evaluate(
    async ({ ticks }) => {
      let samples = 0;
      let present = 0;
      for (let i = 0; i < ticks; i += 5) {
        const stats = window.__combatStats ? window.__combatStats() : null;
        const sight = window.__sight ? window.__sight() : null;
        let target = null;
        if (stats && stats.enemies) {
          for (const e of stats.enemies) {
            if (!e.onScreen) continue;
            if (!target || e.depth < target.depth) target = e;
          }
        }
        let sx = 0;
        let sy = 0;
        if (target && sight) {
          const K = 4.0;
          sx = Math.max(-1, Math.min(1, K * (target.ndcX - sight.ndcX)));
          sy = Math.max(-1, Math.min(1, K * (target.ndcY - sight.ndcY)));
        }
        window.__setStick({ x: sx, y: sy, fire: true, missile: true, throttleIndex: 1 });
        window.__step(5);
        const st = window.__combatStats ? window.__combatStats() : null;
        const fs = window.__flowState ? window.__flowState() : null;
        if (!st || (fs && fs.state !== 'flight')) continue;
        samples += 1;
        if (st.enemies.some((e) => e.onScreen && e.spanFrac >= 0.08)) present += 1;
      }
      return { samples, present };
    },
    { ticks: Math.floor(secs * 60) },
  );
  console.log(
    JSON.stringify({
      seed,
      secs,
      samples: out.samples,
      presentFrac: Number((out.present / Math.max(1, out.samples)).toFixed(3)),
    }),
  );
  await page.close();
}
await browser.close();
await server.close();

// pulse_check.mjs — R36: verify the locked bracket's two-tone pulse on
// screen. Steps an aim-pilot until a lock is HELD, then samples the drawn
// bracket's bar-sprite colour (via screenshot pixels at __brackets bar
// positions) every 4 ticks for 32 ticks. Expect alternation between the
// bright cyan (#31e6ff family) and the deep blue (#008cd6 family) with an
// 8-tick phase. Saves the frames so the result can be LOOKED at.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const out = process.argv[process.argv.indexOf('--out') + 1];
if (!out || out.startsWith('--')) { console.error('--out required'); process.exit(1); }
mkdirSync(out, { recursive: true });

const server = await createServer({ server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const port = server.httpServer.address().port;
const url = `http://127.0.0.1:${port}/?fixed=1&seed=7`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

  // Fly at the nearest enemy with the button held until a lock is held.
  await page.evaluate(() => {
    window.__aimTick = (i) => {
      const stats = window.__combatStats ? window.__combatStats() : null;
      const sight = window.__sight ? window.__sight() : null;
      let target = null;
      if (stats && stats.enemies) for (const e of stats.enemies) {
        if (!e.onScreen) continue;
        if (!target || e.depth < target.depth) target = e;
      }
      let sx = 0, sy = 0;
      if (target && sight) {
        sx = Math.max(-1, Math.min(1, 4 * (target.ndcX - sight.ndcX)));
        sy = Math.max(-1, Math.min(1, 4 * (target.ndcY - sight.ndcY)));
      }
      window.__setStick({ x: sx, y: sy, missile: true, throttleIndex: 1 });
      window.__step(1);
      return window.__lockState().locks;
    };
  });
  let t = 0, locks = 0;
  while (t < 1800 && locks === 0) { locks = await page.evaluate((i) => window.__aimTick(i), t); t++; }
  if (locks === 0) { console.log('NO LOCK in 30 s'); process.exit(2); }
  // Skip past the 0.12 s confirm flash.
  for (let i = 0; i < 10; i++) await page.evaluate((i) => window.__aimTick(i), t++);

  const rows = [];
  for (let s = 0; s < 8; s++) {
    const br = await page.evaluate(() => window.__brackets());
    const ls = await page.evaluate(() => window.__lockState());
    const f = join(out, `pulse-s${s}-t${t}.png`);
    await page.screenshot({ path: f });
    rows.push({ s, t, file: f, locks: ls.locks, inFlight: ls.inFlight, bars: br.sets.map((set) => set.bars[0]) });
    for (let i = 0; i < 4; i++) await page.evaluate((i) => window.__aimTick(i), t++);
  }
  writeFileSync(join(out, 'pulse_rows.json'), JSON.stringify(rows, null, 1));
  console.log(JSON.stringify(rows.map(({ file, ...r }) => r), null, 1));
} finally {
  await browser.close();
  await server.close();
}

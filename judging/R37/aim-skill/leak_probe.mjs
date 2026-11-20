// R37 TL: instrument the never-kill crash arm — sample entity counts + heap
// every 600 ticks for 120 s sim, hands-off (centered stick, missile held),
// lock gate ON, seed 7. Finds what accumulates.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 5199, strictPort: true, hmr: false } });
await server.listen();
const browser = await puppeteer.launch({ headless: 'new', args: ['--enable-precise-memory-info'], protocolTimeout: 900000 });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await page.goto('http://127.0.0.1:5199/?fixed=1&seed=7&demo=1&debugstick=0', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__frameReady === true', { timeout: 120000 });
for (let chunk = 0; chunk < 12; chunk++) {
  const out = await page.evaluate(() => {
    // missile button held via the fixed-input hook if one exists; fall back to stats only
    window.__step(600);
    const g = window.__game ?? null;
    const c = window.__combatDebug ? window.__combatDebug() : {};
    const scene = (g && g.scene) ? g.scene.children.length : -1;
    return JSON.stringify({
      heapMB: performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      scene,
      enemies: c.enemies?.length ?? c.enemyCount ?? null,
      shots: c.enemyShots ?? null,
      killLog: c.killLogLen ?? null,
      keys: Object.keys(c).slice(0, 20),
    });
  });
  console.log(`t=${(chunk + 1) * 10}s`, out);
}
await browser.close(); await server.close();

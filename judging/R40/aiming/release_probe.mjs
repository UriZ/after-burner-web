// R40b: verify HOLD-to-lock / RELEASE-to-fire. Holds the missile button for
// HOLD ticks, releases for 6, repeats; reports stock drawdown + launches.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
const HOLD = Number(process.argv[2] ?? 40);
const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 5219, strictPort: true, hmr: false } });
await server.listen();
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 600000 });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0,160)));
await page.goto('http://127.0.0.1:5219/?fixed=1&seed=7&demo=0&invincible=1', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__frameReady === true', { timeout: 180000 });
const out = await page.evaluate(async (HOLD) => {
  const set = (o) => window.__setStick ? window.__setStick(o) : null;
  const stat = () => window.__combatStats ? window.__combatStats() : {};
  let stock0 = null, log = [];
  for (let cycle = 0; cycle < 6; cycle++) {
    set({ x: 0.05, y: 0.12, fire: false, missile: true });   // HOLD: acquire
    for (let i = 0; i < HOLD; i++) window.__step(1);
    const held = stat();
    if (stock0 === null) stock0 = held.missileStock ?? null;
    set({ x: 0.05, y: 0.12, fire: false, missile: false });  // RELEASE: fire
    for (let i = 0; i < 6; i++) window.__step(1);
    const rel = stat();
    log.push({ cycle, locksAtHoldEnd: held.locks ?? null, stockHeld: held.missileStock,
               stockAfterRelease: rel.missileStock, inFlight: rel.missilesInFlight });
  }
  return { stock0, log };
}, HOLD);
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();

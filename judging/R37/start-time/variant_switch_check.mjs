import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 60000,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
await page.goto('http://localhost:5173/?invincible=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__startupProbe === 'function' && window.__firstFrameMs != null, { timeout: 60000 });
await new Promise((r) => setTimeout(r, 600));
await page.keyboard.down('KeyZ');
await new Promise((r) => setTimeout(r, 300));
await page.keyboard.up('KeyZ');
const seen = [];
const t0 = Date.now();
let last = '';
let reloads = 0;
while (Date.now() - t0 < 50000) {
  try {
    const p = await page.evaluate(() => ({ s: window.__startupProbe().state, m: window.__musicDebug() }));
    const key = `${p.s}/v${p.m.currentVariant}/playing=${p.m.playing}`;
    if (key !== last) { seen.push({ atS: +((Date.now() - t0) / 1000).toFixed(1), key }); last = key; }
  } catch {
    reloads++; // vite HMR reload from a concurrent lane — note and continue
    await new Promise((r) => setTimeout(r, 1500));
  }
  await new Promise((r) => setTimeout(r, 300));
}
console.log(JSON.stringify({ seen, reloads, errors: errors.slice(0, 6) }, null, 1));
await browser.close();

import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: false, protocolTimeout: 60000,
  args: ['--autoplay-policy=no-user-gesture-required', '--window-size=700,550'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__startupProbe === 'function' && window.__firstFrameMs != null, { timeout: 60000 });
await new Promise((r) => setTimeout(r, 600));
await page.keyboard.down('KeyZ');
await new Promise((r) => setTimeout(r, 300));
await page.keyboard.up('KeyZ');
let best = 0, firstAt = null;
const t0 = Date.now();
while (Date.now() - t0 < 9000) {
  const p = await page.evaluate(() => ({ rms: window.__audioLevelProbe(), m: window.__musicDebug(), s: window.__startupProbe().state }));
  if (p.rms > best) best = p.rms;
  if (firstAt === null && p.rms > 0.01) firstAt = Date.now() - t0;
  await new Promise((r) => setTimeout(r, 100));
}
const fin = await page.evaluate(() => ({ m: window.__musicDebug(), s: window.__startupProbe().state }));
console.log(JSON.stringify({ peakRms: +best.toFixed(4), firstSignalMsAfterPress: firstAt, final: fin }));
await browser.close();

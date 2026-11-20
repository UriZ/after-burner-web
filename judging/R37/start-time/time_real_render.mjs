// Time the REAL buildLoop render to completion (variant 0). Node-side polling
// (short evaluates) so no CDP call outlives the protocol timeout.
import puppeteer from 'puppeteer';
const headed = process.argv.includes('--headed');
const budgetMs = Number(process.argv[2]) || 600000;
const browser = await puppeteer.launch({ headless: headed ? false : 'new',
  args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const t0 = Date.now();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__musicTiming && window.__musicTiming[0], { timeout: 60000 });
let res = null;
while (Date.now() - t0 < budgetMs) {
  res = await page.evaluate(() => window.__musicTiming[0]);
  if (res.renderMs !== null) break;
  await new Promise((r) => setTimeout(r, 1000));
}
console.log(JSON.stringify({ headed, wallMs: Date.now() - t0, result: res }));
await browser.close();

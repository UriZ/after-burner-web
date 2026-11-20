import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
  root: '/Users/urizonens/dev/afterburner-three',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 500)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=7`, { waitUntil: 'load' });
try {
  await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });
  console.log('BOOT OK: __frameReady true');
} catch {
  console.log('BOOT FAIL: __frameReady never true');
  const state = await page.evaluate(() => ({
    frameReady: window.__frameReady,
    hasStep: typeof window.__step,
  }));
  console.log(JSON.stringify(state));
}
await browser.close();
await server.close();

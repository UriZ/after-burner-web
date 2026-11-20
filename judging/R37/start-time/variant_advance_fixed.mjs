// Deterministic verification of the R37 _startTally music re-key:
// ?fixed=1&seed=1&invincible=1 lands in stage-1 flight; step across the 32 s stage-1
// boundary and the 32 s stage-2 boundary; __musicDebug tracks variant even
// muted (setState records state/variant with no ctx).
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 120000 });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?fixed=1&seed=1&invincible=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__frameReady === true, { timeout: 60000 });
const snap = () => page.evaluate(() => ({
  ...((f) => ({ state: f.state, stageNumber: f.stageNumber }))(window.__flowState()),
  variant: window.__musicDebug().currentVariant,
  musicState: window.__musicDebug().currentState,
}));
const out = {};
await page.evaluate(() => window.__step(20));
out.t0 = await snap();                       // stage 1 flight
await page.evaluate(() => window.__step(2000)); // past 32 s boundary (~33.7 s)
out.afterStage1 = await snap();              // expect stage 2, variant 1
await page.evaluate(() => window.__step(1950)); // past stage-2 boundary (~66 s)
out.afterStage2 = await snap();              // expect stage 3 (airrefuel), variant 2
console.log(JSON.stringify(out, null, 1));
await browser.close();

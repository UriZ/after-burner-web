// R37 AFTER measurement: boot -> title -> press Z -> launch -> flight, with
// music scheduler + actual signal RMS. Clean-CPU run required (no zombie
// chromes). Live mode, unmuted.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 60000,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });
await page.setViewport({ width: 960, height: 720 });
const navT0 = Date.now();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__startupProbe === 'function' && window.__firstFrameMs != null, { timeout: 60000 });
const boot = await page.evaluate(() => ({ ...window.__startupProbe(), musicTiming: window.__musicTiming || null }));
console.log('BOOT', JSON.stringify({ wallToProbeMs: Date.now() - navT0, ...boot }));

await new Promise((r) => setTimeout(r, 800));
const pressT = await page.evaluate(() => performance.now());
await page.keyboard.down('KeyZ');
await new Promise((r) => setTimeout(r, 300));
await page.keyboard.up('KeyZ');

let last = 'title';
const transitions = [];
let musicAt = null;
let firstRms = null;
const tEnd = Date.now() + 15000;
while (Date.now() < tEnd) {
  const p = await page.evaluate(() => ({
    s: window.__startupProbe(),
    m: window.__musicDebug(),
    rms: window.__audioLevelProbe ? window.__audioLevelProbe() : null,
  }));
  if (p.s.state !== last) { transitions.push({ from: last, to: p.s.state, afterPressMs: +(p.s.now - pressT).toFixed(0) }); last = p.s.state; }
  if (musicAt === null && p.m.playing) musicAt = +(p.s.now - pressT).toFixed(0);
  if (firstRms === null && p.rms !== null && p.rms > 0.01) firstRms = { afterPressMs: +(p.s.now - pressT).toFixed(0), rms: +p.rms.toFixed(4) };
  if (last === 'flight' && musicAt !== null && firstRms !== null) break;
  await new Promise((r) => setTimeout(r, 20));
}
// settle 3 s into flight, sample RMS again + variant correctness
await new Promise((r) => setTimeout(r, 3000));
const final = await page.evaluate(() => ({
  m: window.__musicDebug(), rms: window.__audioLevelProbe(), state: window.__startupProbe().state,
  musicTiming: window.__musicTiming || null,
}));
console.log('TRANSITIONS', JSON.stringify(transitions));
console.log('MUSIC_SCHED_AT_MS_AFTER_PRESS', musicAt);
console.log('FIRST_SIGNAL', JSON.stringify(firstRms));
console.log('FINAL', JSON.stringify(final));
console.log('ERRORS', JSON.stringify(errors));
await browser.close();

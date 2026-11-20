// R37 full first-start measurement, post-infra-fix baseline (ad803c9).
// Live mode (no ?fixed). Node-side polling only — no long evaluates.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 60000,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 720 });
const navT0 = Date.now();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__startupProbe === 'function' && window.__firstFrameMs != null, { timeout: 60000 });
const boot = await page.evaluate(() => ({
  ...window.__startupProbe(),
  musicTiming: window.__musicTiming || null,
  music: window.__musicDebug(),
}));
console.log('BOOT', JSON.stringify({ wallToProbe: Date.now() - navT0, ...boot }));

await new Promise((r) => setTimeout(r, 800));
const pressT = await page.evaluate(() => performance.now());
await page.keyboard.down('KeyZ');
await new Promise((r) => setTimeout(r, 250));
await page.keyboard.up('KeyZ');

// Node-side transition polling (fast at first for title->launch).
let last = 'title';
const transitions = [];
const tEnd = Date.now() + 10000;
while (Date.now() < tEnd) {
  const p = await page.evaluate(() => window.__startupProbe());
  if (p.state !== last) { transitions.push({ from: last, to: p.state, afterPressMs: +(p.now - pressT).toFixed(0) }); last = p.state; }
  if (last === 'flight') break;
  await new Promise((r) => setTimeout(r, 15));
}
console.log('TRANSITIONS', JSON.stringify(transitions));

// Music watch: up to 6 min, 1 s cadence.
const musicT0 = Date.now();
let musicResult = null;
while (Date.now() - musicT0 < 360000) {
  let snap;
  try {
    snap = await page.evaluate(() => ({
      t: performance.now(),
      music: window.__musicDebug(),
      timing: window.__musicTiming && window.__musicTiming[0],
    }));
  } catch (e) {
    musicResult = { crashed: String(e).slice(0, 120), afterPressS: +((Date.now() - musicT0) / 1000).toFixed(1) };
    break;
  }
  if (snap.music.playing) {
    musicResult = { playingAfterPressS: +((snap.t - pressT) / 1000).toFixed(1), timing: snap.timing };
    break;
  }
  await new Promise((r) => setTimeout(r, 1000));
}
if (!musicResult) {
  const final = await page.evaluate(() => ({ music: window.__musicDebug(), timing: window.__musicTiming }));
  musicResult = { neverPlayedWithin: '360s', ...final };
}
console.log('MUSIC', JSON.stringify(musicResult));
await browser.close();

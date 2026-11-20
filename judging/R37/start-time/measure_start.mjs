// R37 start-time lane: measure the real first-start path in LIVE mode
// (no ?fixed): page load -> title painted -> Z pressed -> launch -> flight.
// Uses the already-running dev server on :5173.
import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5173/';
const PRESS_DELAY_MS = Number(process.argv[3] || 1500); // let title settle first

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 720 });

const navT0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded' });

// Wait for the probe (module eval + Game ctor done).
await page.waitForFunction(() => typeof window.__startupProbe === 'function', { timeout: 30000 });
const probeReadyWall = Date.now() - navT0;

// Wait for first painted frame.
await page.waitForFunction(() => window.__firstFrameMs != null, { timeout: 10000 });

const boot = await page.evaluate(() => {
  const p = window.__startupProbe();
  const nav = performance.getEntriesByType('navigation')[0];
  return {
    gameCtorMs: p.gameCtorMs,
    firstFrameMs: p.firstFrameMs, // since time origin (nav start)
    state: p.state,
    domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
    musicTiming: window.__musicTiming || null,
  };
});

await new Promise((r) => setTimeout(r, PRESS_DELAY_MS));

// Press fire (Z) and poll the flow state every ~8 ms.
const pressT = await page.evaluate(() => performance.now());
await page.keyboard.down('KeyZ');
await new Promise((r) => setTimeout(r, 60));
await page.keyboard.up('KeyZ');

const transitions = await page.evaluate(async (tPress) => {
  const out = [];
  let last = window.__startupProbe().state;
  const t0 = performance.now();
  while (performance.now() - t0 < 15000) {
    const p = window.__startupProbe();
    if (p.state !== last) {
      out.push({ from: last, to: p.state, atMsAfterPress: p.now - tPress });
      last = p.state;
      if (p.state === 'flight') break;
    }
    await new Promise((r) => setTimeout(r, 8));
  }
  return out;
}, pressT);

const music = await page.evaluate(() => window.__musicTiming || null);

console.log(JSON.stringify({
  url: URL,
  probeReadyWallMs: probeReadyWall,
  boot,
  pressAtPerfNow: pressT,
  transitions,
  musicTimingFinal: music,
}, null, 2));

await browser.close();

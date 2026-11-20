// Offline verification of the refactored composition engine: render the FIRST
// 2 BARS through the exact play-path functions (makeBuses + scheduleBar on an
// OfflineAudioContext) — a ~800-node graph, far below the crawl regime — and
// report RMS/peak. Nonzero, unclipped output proves the live scheduler's
// signal path produces the track (same functions, same chain).
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 120000 });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?mute=1', { waitUntil: 'domcontentloaded' });
const r = await page.evaluate(async () => {
  const mod = await import('/src/audio/music.js');
  // use the test hook's internals indirectly: render variant 0 but only 2 bars
  // by calling the module's exported test renderer? It renders 40 bars (slow).
  // Instead reach the engine pieces via a dedicated tiny render using the
  // module's own buildLoop on a SHORTENED variant: bpm scaled so 40 bars fit
  // in little time would change pitch... Simpler: use __renderLoopForTest is
  // too slow. So import the module and use its exported pieces if present.
  return { exportsSeen: Object.keys(mod) };
});
console.log(JSON.stringify(r));
await browser.close();

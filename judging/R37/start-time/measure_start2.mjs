// R37 run 2: tighter transition polling (started BEFORE the keypress), plus
// long-horizon music render + playback observation. Live mode, dev server :5173.
import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5173/';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 720 });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__startupProbe === 'function', { timeout: 30000 });
await page.waitForFunction(() => window.__firstFrameMs != null, { timeout: 10000 });

const boot = await page.evaluate(() => ({
  ...window.__startupProbe(),
  music: window.__musicDebug ? window.__musicDebug() : null,
  musicTiming: window.__musicTiming,
}));

// Start the transition watcher BEFORE pressing, so title->launch is caught.
const watch = page.evaluate(async () => {
  const out = { transitions: [], musicPlayingAt: null };
  let last = window.__startupProbe().state;
  const t0 = performance.now();
  while (performance.now() - t0 < 25000) {
    const p = window.__startupProbe();
    if (p.state !== last) {
      out.transitions.push({ from: last, to: p.state, at: p.now });
      last = p.state;
    }
    if (out.musicPlayingAt === null && window.__musicDebug && window.__musicDebug().playing) {
      out.musicPlayingAt = performance.now();
    }
    if (last === 'flight' && out.musicPlayingAt !== null) break;
    await new Promise((r) => setTimeout(r, 5));
  }
  return out;
});

await new Promise((r) => setTimeout(r, 500));
const pressT = await page.evaluate(() => performance.now());
await page.keyboard.down('KeyZ');
await new Promise((r) => setTimeout(r, 60));
await page.keyboard.up('KeyZ');

const watched = await watch;

// Let the offline render finish if it hasn't; poll up to 30 s more.
const renderWait = await page.evaluate(async () => {
  const t0 = performance.now();
  while (performance.now() - t0 < 30000) {
    const t = window.__musicTiming && window.__musicTiming[0];
    if (t && t.renderMs !== null) return { renderMs: t.renderMs, graphMs: t.graphMs };
    await new Promise((r) => setTimeout(r, 100));
  }
  return { timedOut: true, timing: window.__musicTiming };
});

const finalMusic = await page.evaluate(() => window.__musicDebug());

console.log(JSON.stringify({
  boot: { gameCtorMs: boot.gameCtorMs, firstFrameMs: boot.firstFrameMs, state: boot.state,
          musicAtTitle: boot.music, musicTimingAtTitle: boot.musicTiming },
  pressAt: pressT,
  transitionsAbs: watched.transitions,
  transitionsAfterPress: watched.transitions.map((t) => ({ ...t, afterPressMs: t.at - pressT })),
  musicPlayingAtAfterPress: watched.musicPlayingAt === null ? null : watched.musicPlayingAt - pressT,
  renderWait,
  finalMusic,
}, null, 2));

await browser.close();

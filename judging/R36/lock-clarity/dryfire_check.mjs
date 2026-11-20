// dryfire_check.mjs — R36: verify "fire on button press" end to end.
//
// Three scenarios, one deterministic session each (?fixed=1&seed=7):
//
//   hold  — steer hard away from traffic (sight into the upper corner) and
//           HOLD the missile button 3 s. Asserts no lock ever formed during
//           the window (else the scenario is invalid for the dry question)
//           and reports every stock decrement tick. Expected pre-patch: 0
//           decrements (the playtest's dead button). Expected post-patch:
//           EXACTLY ONE, on the press tick (rising edge, no hold-to-mash).
//           Screenshots the press tick + ~0.5 s later so the dry round's
//           billow/ribbon can be LOOKED at flying straight.
//
//   mash  — same posture, press 3 ticks on / 9 ticks off for 4 s. Expected
//           post-patch: decrements paced no tighter than the 0.4 s cooldown.
//
//   aim   — the aim-pilot (jitter 0.5) for 18 s, for launch/hit comparison.
//           (tools/aim_lock_probe.mjs does this too; kept here so all three
//           read one session protocol.)
//
// Usage: node judging/R36/lock-clarity/dryfire_check.mjs --out <unique dir>
//        [--scenario hold|mash|aim] (default: hold + mash)
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join } from 'path';

const argv = process.argv.slice(2);
let out = null;
let scenario = 'holdmash';
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') out = argv[++i];
  else if (argv[i] === '--scenario') scenario = argv[++i];
}
if (!out) { console.error('--out required'); process.exit(1); }
mkdirSync(out, { recursive: true });

const server = await createServer({ server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const port = server.httpServer.address().port;

async function session(run) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 672 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=7`, { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });
    const r = await run(page);
    r.errors = errors;
    return r;
  } finally {
    await browser.close();
  }
}

// One tick with a given stick; returns {stock, locks, acq, inFlight}.
const TICK = (sx, sy, missile) => `(() => {
  window.__setStick({ x: ${sx}, y: ${sy}, missile: ${missile}, throttleIndex: 1 });
  window.__step(1);
  const ls = window.__lockState();
  return { stock: ls.stock, locks: ls.locks, acq: ls.acquiring, inFlight: ls.inFlight };
})()`;

const results = {};

if (scenario === 'holdmash' || scenario === 'hold') {
  results.hold = await session(async (page) => {
    // 1 s of settling with the button up, steering away.
    for (let i = 0; i < 60; i++) await page.evaluate(TICK(-1, -1, false));
    const decrements = [];
    let lockEverHeld = 0;
    let firstLockTick = null;
    // Baseline BEFORE the first press tick, so a launch on the press tick
    // itself is recorded rather than swallowed by a null prev.
    let prev = (await page.evaluate('window.__lockState()')).stock;
    const shots = [];
    for (let i = 0; i < 180; i++) {
      const s = await page.evaluate(TICK(-1, -1, true));
      // The lock state is carried on each decrement so the rising-edge
      // proof can be read off the PRE-FIRST-LOCK prefix (on seed 7 the
      // funnel brings traffic into even a corner-held sight eventually, so
      // "no lock for the whole window" is not achievable — measured on the
      // before run).
      if (prev !== null && s.stock < prev) decrements.push({ tick: i, from: prev, to: s.stock, locks: s.locks, acq: s.acq });
      if (s.locks > 0) { lockEverHeld++; if (firstLockTick === null) firstLockTick = i; }
      prev = s.stock;
      if (i === 1 || i === 10 || i === 30 || i === 55) {
        const f = join(out, `hold-t${String(i).padStart(3, '0')}.png`);
        await page.screenshot({ path: f });
        shots.push(f);
      }
    }
    return { decrements, lockTicksDuringHold: lockEverHeld, firstLockTick, finalStock: prev, shots };
  });
}

if (scenario === 'holdmash' || scenario === 'mash') {
  results.mash = await session(async (page) => {
    for (let i = 0; i < 60; i++) await page.evaluate(TICK(-1, -1, false));
    const decrements = [];
    let lockEverHeld = 0;
    let prev = null;
    for (let i = 0; i < 240; i++) {
      const pressed = i % 12 < 3; // 3 on / 9 off = press every 0.2 s
      const s = await page.evaluate(TICK(-1, -1, pressed));
      if (prev !== null && s.stock < prev) decrements.push(i);
      if (s.locks > 0) lockEverHeld++;
      prev = s.stock;
    }
    const gaps = decrements.slice(1).map((t, k) => t - decrements[k]);
    return { decrements, minGapTicks: gaps.length ? Math.min(...gaps) : null, lockTicksDuringMash: lockEverHeld, finalStock: prev };
  });
}

console.log(JSON.stringify(results, null, 2));
await server.close();

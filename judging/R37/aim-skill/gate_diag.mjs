// gate_diag.mjs — R37 aim-skill. WHERE does the aim gate open on a hands-off
// run? Logs every tick-span where __lockAim.aiming is true, with the flow
// state, plus every lock completion. Diagnostic only.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const args = { seed: 42, secs: 120 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seed') args.seed = Number(argv[++i]);
  else if (a === '--secs') args.secs = Number(argv[++i]);
}

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${args.seed}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 30000 });

  const out = await page.evaluate(async ({ ticks }) => {
    const spans = []; // {t0, t1, states:Set, maxRecent}
    let open = null;
    const lockEvents = [];
    let prevLocks = 0;
    for (let i = 0; i < ticks; i++) {
      window.__setStick({ x: 0, y: 0, fire: true, missile: true, throttleIndex: 1 });
      window.__step(1);
      const la = window.__lockAim ?? null;
      const fs = window.__flowState ? window.__flowState() : null;
      const st = fs ? fs.state : '?';
      const ls = window.__lockState ? window.__lockState() : null;
      if (ls && ls.locks > prevLocks) {
        lockEvents.push({ t: i, state: st, locks: ls.locks });
      }
      if (ls) prevLocks = ls.locks;
      if (la && la.aiming) {
        if (!open) open = { t0: i, t1: i, states: {}, maxRecent: 0 };
        open.t1 = i;
        open.states[st] = (open.states[st] ?? 0) + 1;
        if (la.recentS > open.maxRecent) open.maxRecent = la.recentS;
      } else if (open) {
        spans.push(open);
        open = null;
      }
    }
    if (open) spans.push(open);
    return { spans, lockEvents };
  }, { ticks: Math.floor(args.secs * 60) });

  console.log(JSON.stringify({ ...args, ...out, errors }, null, 1));
} finally {
  await browser.close();
  await server.close();
}

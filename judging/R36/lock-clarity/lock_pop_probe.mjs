// lock_pop_probe.mjs — R36 lock-clarity diagnosis.
//
// Flies the same naive aim-pilot as tools/aim_lock_probe.mjs (nearest enemy,
// proportional stick, missile button HELD) and, per tick, reads the drawn
// lock-bracket POPULATION (window.__lockPop, added to lockSystem.js this
// round: one row per drawn bracket with its state rank and its target's
// depth + ndc). The question it answers: when a bracket is on screen, WHERE
// is it relative to the player's jet, and which state put it there —
// tracked(0) / acquiring(1) / locked-or-in-flight(2).
//
// "Hugs the jet" operator: the jet sprite sits at ndc (0, sight.y - 0.30)
// (entities/player.js: __sight().ndcY - 0.30 == playerNdc.y). A bracket
// whose target projects within 0.35 NDC (isotropic, y through 224/320) of
// that point is counted as AT THE JET; past 0.35 it reads as "out in the
// field". Screenshots are saved on the first few at-jet rank-2 ticks so the
// number can be cropped and LOOKED at (house rule).
//
// Usage: node judging/R36/lock-clarity/lock_pop_probe.mjs --seed 42 --secs 40 \
//          --jitter 0.5 --out judging/R36/lock-clarity/<unique>
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const argv = process.argv.slice(2);
const args = { seed: 42, secs: 40, jitter: 0.5, out: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--seed') args.seed = Number(argv[++i]);
  else if (a === '--secs') args.secs = Number(argv[++i]);
  else if (a === '--jitter') args.jitter = Number(argv[++i]);
  else if (a === '--out') args.out = argv[++i];
}
if (!args.out) {
  console.error('--out <unique dir> is required');
  process.exit(1);
}
mkdirSync(args.out, { recursive: true });

const server = await createServer({
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const url = new URL(`http://127.0.0.1:${port}/`);
url.search = new URLSearchParams({ fixed: '1', seed: String(args.seed) }).toString();

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

  const ticks = Math.floor(args.secs * 60);
  // Step in chunks; after each chunk pull the per-tick log the page kept.
  const CHUNK = 60;
  const summary = {
    ticksWithBracket: 0,
    byRank: { 0: 0, 1: 0, 2: 0 }, // tick-bracket counts
    rank2AtJet: 0, // rank-2 brackets within the at-jet radius
    rank2Field: 0,
    rank1AtJet: 0,
    rank1Field: 0,
    holdTicksZeroLock: 0, // ticks holding the button with NO lock & no acquire
    stockStart: null,
    stockEnd: null,
    launches: 0,
  };
  const shots = [];
  const samples = [];
  let prevStock = null;

  for (let c = 0; c < Math.ceil(ticks / CHUNK); c++) {
    const n = Math.min(CHUNK, ticks - c * CHUNK);
    const rows = await page.evaluate(({ n, JITTER, base }) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const t = base + i;
        const stats = window.__combatStats ? window.__combatStats() : null;
        const sight = window.__sight ? window.__sight() : null;
        let target = null;
        if (stats && stats.enemies) {
          for (const e of stats.enemies) {
            if (!e.onScreen) continue;
            if (!target || e.depth < target.depth) target = e;
          }
        }
        let sx = 0;
        let sy = 0;
        if (target && sight) {
          const K = 4.0;
          const jx = JITTER * Math.sin(t * 0.9 + 1.3);
          const jy = JITTER * Math.sin(t * 1.27 + 0.4);
          sx = Math.max(-1, Math.min(1, K * (target.ndcX - sight.ndcX) + jx));
          sy = Math.max(-1, Math.min(1, K * (target.ndcY - sight.ndcY) + jy));
        }
        window.__setStick({ x: sx, y: sy, missile: true, throttleIndex: 1 });
        window.__step(1);
        const ls = window.__lockState ? window.__lockState() : null;
        const pop = window.__lockPop ?? [];
        out.push({
          t,
          jetY: sight ? sight.ndcY - 0.30 : null,
          pop,
          locks: ls ? ls.locks : 0,
          acq: ls ? ls.acquiring : null,
          inFlight: ls ? ls.inFlight : 0,
          stock: ls ? ls.stock : null,
          hold: ls ? ls.hold : null,
        });
      }
      return out;
    }, { n, JITTER: args.jitter, base: c * CHUNK });

    for (const r of rows) {
      if (r.stock !== null) {
        if (summary.stockStart === null) summary.stockStart = r.stock;
        if (prevStock !== null && r.stock < prevStock) summary.launches += prevStock - r.stock;
        prevStock = r.stock;
        summary.stockEnd = r.stock;
      }
      if (r.hold && r.locks === 0 && r.acq === null && r.inFlight === 0) summary.holdTicksZeroLock++;
      if (r.pop.length) summary.ticksWithBracket++;
      for (const b of r.pop) {
        summary.byRank[b.rank] = (summary.byRank[b.rank] ?? 0) + 1;
        if (r.jetY === null) continue;
        const dx = (b.x - 0) * 0.5;
        const dy = (b.y - r.jetY) * 0.5 * (224 / 320);
        const atJet = Math.hypot(dx, dy) <= 0.35 * 0.5; // 0.35 NDC in isotropic fracW
        if (b.rank === 2) atJet ? summary.rank2AtJet++ : summary.rank2Field++;
        if (b.rank === 1) atJet ? summary.rank1AtJet++ : summary.rank1Field++;
      }
      if (r.pop.length || r.t % 120 === 0) samples.push(r);
    }

    // Screenshot the first few ticks where a rank-2 bracket sits at the jet.
    const last = rows[rows.length - 1];
    if (
      shots.length < 6 &&
      last &&
      last.pop.some((b) => {
        if (last.jetY === null) return false;
        const dx = b.x * 0.5;
        const dy = (b.y - last.jetY) * 0.5 * (224 / 320);
        return b.rank === 2 && Math.hypot(dx, dy) <= 0.35 * 0.5;
      })
    ) {
      const f = join(args.out, `atjet-t${String(last.t).padStart(5, '0')}.png`);
      await page.screenshot({ path: f });
      shots.push(f);
    }
  }

  writeFileSync(join(args.out, 'samples.json'), JSON.stringify(samples, null, 1));
  console.log(JSON.stringify({ seed: args.seed, secs: args.secs, jitter: args.jitter, summary, shots, errors }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

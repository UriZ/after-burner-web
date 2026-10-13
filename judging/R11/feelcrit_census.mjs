#!/usr/bin/env node
// TWO CENSUSES THE KILL TABLES CANNOT ANSWER, both at 60 Hz, one tick per sample.
//
// 1. APPROACH GEOMETRY -- WHERE THE TRAFFIC CROSSES THE SCREEN.
//    "A motionless stick scores as well as an aiming one" has two completely
//    different causes with completely different fixes: the weapon is too
//    forgiving, or the traffic arrives where a motionless sight already points.
//    This records, once per enemy id, its screen x THE FIRST TICK ITS PROJECTED
//    SPAN REACHES the gun's own licence gate (`READABLE_SPAN_FRAC` = 10 %W, the
//    gate `vulcan.resolveHits` and `_findAssistTarget` both apply) -- i.e. where
//    it is when it first becomes killable. Flown by `still`, so the stick is
//    never touched, roll is identically zero and the pitch-only ndc frame IS the
//    screen frame: there is no reconstruction in this number at all.
//
// 2. SURVIVAL. Every published R11 kill figure was taken with `invincible=1`,
//    which is correct for a kill census and silent about the other half of the
//    loop. This records `playerHitsTaken` per tick with the flag OFF, so
//    "does moving keep you alive" is a measured quantity rather than an
//    assumption. Deaths are NOT suppressed here on purpose, and that is stated
//    because this round withdrew two statistics for being measured with deaths
//    on when their own preconditions required them off -- the precondition runs
//    the other way for this one: a death-rate statistic needs deaths.
//
// Unknown flags exit 2.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function repoRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(d, 'vite.config.js'))) return d;
    d = path.dirname(d);
  }
  return process.cwd();
}
const SELF = fileURLToPath(import.meta.url);
const ROOT = repoRoot(path.dirname(SELF));
const PILOTS = ['still', 'track', 'sweep'];
// `none` is a real arm, not a typo sink: it is the only way to census the
// traffic the SPAWNER authors rather than the traffic that survives the
// player's own gun, because an enemy killed before it reaches the span gate
// never registers a crossing. Unknown values still exit 2.
const WEAPONS = ['both', 'gun', 'missile', 'none'];

const a = { root: ROOT, seed: 3, secs: 90, pilot: 'still', out: null, label: null,
            params: '', gain: 3, span: 0.10, weapons: 'both' };
const v = process.argv.slice(2);
for (let i = 0; i < v.length; i++) {
  const k = v[i];
  if (k === '--root') a.root = path.resolve(v[++i]);
  else if (k === '--seed') a.seed = Number(v[++i]);
  else if (k === '--secs') a.secs = Number(v[++i]);
  else if (k === '--pilot') a.pilot = v[++i];
  else if (k === '--out') a.out = v[++i];
  else if (k === '--label') a.label = v[++i];
  else if (k === '--params') a.params = v[++i];
  else if (k === '--gain') a.gain = Number(v[++i]);
  else if (k === '--span') a.span = Number(v[++i]);
  else if (k === '--weapons') a.weapons = v[++i];
  else { console.error(`unknown argument "${k}"`); process.exit(2); }
}
if (!PILOTS.includes(a.pilot)) {
  console.error(`unknown --pilot "${a.pilot}". Known: ${PILOTS.join(', ')}.`); process.exit(2);
}
if (!WEAPONS.includes(a.weapons)) {
  console.error(`unknown --weapons "${a.weapons}". Known: ${WEAPONS.join(', ')}.`); process.exit(2);
}
if (!a.out) { console.error('--out is REQUIRED'); process.exit(2); }

const DRIVER = `(() => {
  window.__ccInit = (cfg) => { window.__cc = { cfg, tick: 0, first: {}, hits: [], rows: [] }; };
  window.__ccRun = (n) => {
    const S = window.__cc, cfg = S.cfg;
    const useGun = cfg.weapons === 'both' || cfg.weapons === 'gun';
    const useMsl = cfg.weapons === 'both' || cfg.weapons === 'missile';
    const cl = (x) => Math.max(-1, Math.min(1, x));
    const firsts = [], hits = [];
    for (let k = 0; k < n; k++) {
      const cs = window.__combatStats();
      const f = window.__fairness();
      let stick = { x: 0, y: 0 };
      if (cfg.pilot === 'track') {
        let best = null;
        for (const e of cs.enemies) {
          if (e.depth < 26 || e.depth > 88) continue;
          if (!best || e.depth < best.depth) best = e;
        }
        if (best) stick = { x: cl((best.ndcX - f.playerNdc.x) * cfg.gain),
                            y: cl((best.ndcY - (f.playerNdc.y + 0.30)) * cfg.gain) };
      } else if (cfg.pilot === 'sweep') {
        stick = { x: Math.sin(S.tick / 70) * 0.8, y: 0.15 };
      }
      for (const e of cs.enemies) {
        if (S.first[e.id] !== undefined) continue;
        if (e.spanFrac < cfg.span) continue;
        S.first[e.id] = 1;
        firsts.push({ tick: S.tick, id: e.id, pattern: e.pattern, type: e.type,
                      x: e.ndcX, y: e.ndcY, d: e.depth, span: e.spanFrac,
                      px: f.playerNdc.x, py: f.playerNdc.y });
      }
      const held = (S.tick % 45) < 40;
      window.__setStick({ x: stick.x, y: stick.y, fire: useGun, missile: useMsl && held });
      window.__step(1);
      const f2 = window.__fairness();
      hits.push(f2.playerHitsTaken);
      S.tick++;
    }
    const st = window.__flowState ? window.__flowState() : null;
    return { firsts, hitsEnd: hits[hits.length - 1], tick: S.tick, flow: st,
             counts: window.__killDrain ? window.__killDrain().counts : null };
  };
  return true;
})()`;

const server = await createServer({
  root: a.root, configFile: path.join(a.root, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const search = new URLSearchParams(a.params);
search.set('fixed', '1');
search.set('seed', String(a.seed));
const url = `http://127.0.0.1:${port}/?${search.toString()}`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const errors = [];
const label = a.label ?? `cc-${a.pilot}-s${a.seed}`;
const out = { label, url, root: a.root, pilot: a.pilot, seed: a.seed, secs: a.secs,
              spanGate: a.span, weapons: a.weapons, samplingHz: 60, errors };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 90000 });
  if ((await page.evaluate(DRIVER)) !== true) throw new Error('driver install failed');
  await page.evaluate((cfg) => window.__ccInit(cfg),
    { pilot: a.pilot, gain: a.gain, span: a.span, weapons: a.weapons });
  const TOTAL = Math.round(a.secs * 60);
  const firsts = [];
  let last = null;
  for (let done = 0; done < TOTAL; done += 300) {
    const r = await page.evaluate((n) => window.__ccRun(n), Math.min(300, TOTAL - done));
    firsts.push(...r.firsts);
    last = r;
  }
  out.firsts = firsts;
  out.hitsTaken = last.hitsEnd;
  out.flow = last.flow;
  out.counts = last.counts;
  out.ticks = last.tick;
} finally {
  await browser.close();
  await server.close();
}
await mkdir(a.out, { recursive: true });
await writeFile(path.join(a.out, `${label}.json`), JSON.stringify(out));
console.log(`${label} PILOT=${a.pilot} seed=${a.seed} params='${a.params}' ` +
  `ticks=${out.ticks}@60Hz readable-crossings=${out.firsts.length} ` +
  `hitsTaken=${out.hitsTaken} kills=${JSON.stringify(out.counts)} errors=${errors.length}`);
if (errors.length) console.log(errors.slice(0, 3));

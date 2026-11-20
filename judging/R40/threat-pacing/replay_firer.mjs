#!/usr/bin/env node
// R40 threat-pacing lane — WHO KILLED ME, AND WAS THEY EVER ON SCREEN?
//
// R36, R37 and R38 each made the fatal ROUND more visible (size, sound,
// strobe), each verified its own operator, and four consecutive fresh players
// still reported "the fireball came out of nowhere — I never saw the shot or
// the plane that got me". So this instrument stops looking at the round's
// pixels and measures the SOURCE: for every death, where was the FIRER on
// screen from the instant its flare lit until the round hit?
//
// It replays a playtest session tick-exactly from (seed + commands.jsonl) —
// the R36/R38 harness — but on every tick it also records the full
// `__fairness().enemies` roster (native-px screen position, type, telegraph,
// burstLeft) and the player's NDC. Neither __fairness nor __flowState touches
// the shared PRNG (combat.js:505 note), so polling per tick does not perturb
// the run; __combatDebug WOULD and is never called.
//
// Also records the fire SCHEDULE: the tick of every shot spawn (from the
// cumulative `shotsFired` counter rising) so inter-fire-event gaps can be
// measured on the same run.
//
// Usage:
//   node replay_firer.mjs --seed 7 --log <commands.jsonl> --out <dir> [--root <viteRoot>]
//                         [--ticks N]  (cap, for a cheap smoke run)
// Writes: deaths.json, roster.jsonl (one line per tick), fires.json.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..', '..', '..');

function parseArgs(argv) {
  const a = { seed: 7, log: null, out: null, root: DEFAULT_ROOT, ticks: Infinity, params: '' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--seed') a.seed = Number(argv[++i]);
    else if (k === '--log') a.log = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--root') a.root = argv[++i];
    else if (k === '--ticks') a.ticks = Number(argv[++i]);
    else if (k === '--params') a.params = argv[++i];
    else { console.error(`unknown arg ${k}`); process.exit(2); }
  }
  if (!a.log || !a.out) { console.error('--log and --out are required'); process.exit(2); }
  return a;
}

async function boot(root, seed, params) {
  const server = await createServer({
    root,
    configFile: path.join(root, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 0,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const extra = params ? `&${params}` : '';
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&seed=${seed}${extra}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 30000 });
  return { server, browser, page, errors };
}

async function loadCommands(logPath) {
  const text = await readFile(logPath, 'utf8');
  return text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.out, { recursive: true });
  const commands = await loadCommands(args.log);
  const ctx = await boot(args.root, args.seed, args.params);

  const deaths = [];
  const roster = []; // one entry per tick
  const fires = [];  // ticks at which shotsFired rose, with the delta
  let prevState = null;
  let prevShots = 0;
  let prevHitLen = 0;
  let stop = false;

  for (const cmd of commands) {
    if (stop) break;
    await ctx.page.evaluate((stick) => window.__setStick(stick), cmd.stick);
    const ticks = cmd.tickEnd - cmd.tickStart;
    for (let i = 0; i < ticks; i++) {
      const tick = cmd.tickStart + i + 1;
      if (tick > args.ticks) { stop = true; break; }
      const s = await ctx.page.evaluate(() => {
        window.__step(1);
        const f = window.__flowState();
        const fa = window.__fairness ? window.__fairness() : null;
        return {
          state: f.state,
          score: Math.floor(f.score),
          stageIndex: f.stageIndex,
          t: fa ? fa.t : null,
          shotsFired: fa ? fa.shotsFired : 0,
          air: fa ? fa.shotsInAir : null,
          playerNdc: fa ? fa.playerNdc : null,
          hitLen: fa ? fa.hitLog.length : 0,
          lastHits: fa ? fa.hitLog.slice(-4) : [],
          // px is [x,y] in native 320x224 — on screen iff 0<=x<=320, 0<=y<=224.
          enemies: fa ? fa.enemies.map((e) => ({
            t: e.type, p: e.px, d: e.d, w: e.wFrac, tg: e.tg, b: e.burstLeft,
          })) : [],
        };
      });
      roster.push({
        tick, t: s.t, state: s.state, stage: s.stageIndex,
        pn: s.playerNdc ? [Number(s.playerNdc.x.toFixed(4)), Number(s.playerNdc.y.toFixed(4))] : null,
        air: s.air, e: s.enemies,
      });
      if (s.shotsFired > prevShots) {
        fires.push({ tick, t: s.t, n: s.shotsFired - prevShots, state: s.state, stage: s.stageIndex });
        prevShots = s.shotsFired;
      }
      if (s.hitLen > prevHitLen) {
        for (const h of s.lastHits.slice(-(s.hitLen - prevHitLen))) {
          if (h.fatal) deaths.push({ tick, score: s.score, stage: s.stageIndex, hit: h });
        }
        prevHitLen = s.hitLen;
      }
      prevState = s.state;
    }
  }

  await ctx.browser.close();
  await ctx.server.close();

  await writeFile(path.join(args.out, 'deaths.json'),
    JSON.stringify({ seed: args.seed, log: args.log, root: args.root, deaths, errors: ctx.errors }, null, 2));
  await writeFile(path.join(args.out, 'fires.json'),
    JSON.stringify({ seed: args.seed, root: args.root, fires }, null, 2));
  await writeFile(path.join(args.out, 'roster.jsonl'),
    roster.map((r) => JSON.stringify(r)).join('\n'));
  console.log(JSON.stringify({
    seed: args.seed, ticks: roster.length, fireEvents: fires.length,
    deaths: deaths.map((d) => ({ tick: d.tick, type: d.hit.type, warning: d.hit.warning,
      fromX: d.hit.fromX, fromY: d.hit.fromY, fromD: d.hit.fromD })),
    errors: ctx.errors.slice(0, 5),
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

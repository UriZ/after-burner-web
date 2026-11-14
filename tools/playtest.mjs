#!/usr/bin/env node
// Interactive agent playtest harness. An agent PLAYS the real game in a
// closed loop: it sees frames, chooses a stick state, steps the fixed-tick
// simulation, and sees the consequence — the thing capture.mjs (scripted
// pilots only) and the probes (no eyes) cannot do. Built for the R12 method
// change: the standing playtest no longer waits on a human.
//
// Three subcommands:
//
//   serve    boot vite+puppeteer on ?fixed=1, then execute commands dropped
//            into <session>/cmd.json until --idle-timeout or a quit command.
//            Run it in the background; it never kills anything it didn't start.
//   cmd      write the next command and wait for its result; prints a one-line
//            telemetry summary and the output paths. This is the agent's verb.
//   selftest validate the closed loop on known inputs (stick moves the sight
//            in the commanded direction; trigger produces rounds; the strip
//            composites at the declared size). Run before trusting a session.
//
// Determinism & provenance: a session is seed + the command log. Every turn
// appends to <session>/commands.jsonl, so the whole interactive run is
// re-derivable and citable (seed, tick spans, inputs). No wall-clock enters
// the simulation.
//
// Reuses capture.mjs's hard-won boot rules verbatim: hmr:false, host pinned
// to 127.0.0.1 both ends, step+toDataURL inside ONE evaluate task (the
// drawing buffer is cleared across CDP round trips — the black-frame class).

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile, appendFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const THROTTLE = { L: 0, M: 1, H: 2 };

function die(msg) {
  console.error(msg);
  process.exit(2);
}

function parseArgs(argv, spec, label) {
  const args = { ...spec.defaults };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (spec.flags.includes(a)) args[a.slice(2)] = true;
    else if (spec.valued.includes(a)) args[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
    else
      die(
        `playtest.mjs ${label}: unknown argument "${a}".\n` +
          `Valid: ${[...spec.valued, ...spec.flags].join(' ')}\n` +
          'Refusing to run rather than silently doing something you did not ask for.'
      );
  }
  return args;
}

// ---------------------------------------------------------------- browser --
async function boot(urlParams) {
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const url = new URL('/', `http://127.0.0.1:${port}/`);
  const search = new URLSearchParams(urlParams || '');
  if (!search.has('fixed')) search.set('fixed', '1');
  if (!search.has('seed')) search.set('seed', '1');
  url.search = search.toString();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });
  return { server, browser, page, url: url.toString(), errors };
}

// One whole turn inside ONE evaluate (single JS task: no compositor clear,
// no interleaved state). Applies the stick, steps `ticks` in `samples`
// chunks, grabs a 320x224 thumbnail after each chunk, composites the strip,
// and reads the telemetry it just rendered.
async function runTurn(page, stick, ticks, samples) {
  return page.evaluate(
    (stick, ticks, samples) => {
      window.__setStick(stick);
      const src = document.querySelector('#screen');
      const n = Math.max(1, Math.min(samples, ticks));
      const w = 320, h = 224;
      const strip = document.createElement('canvas');
      strip.width = n * w;
      strip.height = h;
      const ctx = strip.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      let done = 0;
      for (let i = 0; i < n; i++) {
        const chunk = Math.round(((i + 1) * ticks) / n) - done;
        window.__step(chunk);
        done += chunk;
        ctx.drawImage(src, i * w, 0, w, h);
      }
      const read = (fn) => {
        try {
          return typeof window[fn] === 'function' ? window[fn]() : null;
        } catch (e) {
          return { error: String(e) };
        }
      };
      const combat = read('__combatStats');
      return {
        strip: strip.toDataURL('image/png'),
        final: src.toDataURL('image/png'),
        flow: read('__flowState'),
        sight: read('__sight'),
        combat: combat && !combat.error
          ? {
              simTime: combat.simTime,
              alive: combat.alive,
              hits: combat.hits,
              missileStock: combat.missileStock,
              locks: combat.locks,
              missilesInFlight: combat.missilesInFlight,
              vulcanRounds: combat.vulcanRounds,
              enemyShots: combat.enemyShots,
              onScreen: combat.enemies.filter((e) => e.onScreen).length,
              nearestSpanFrac: combat.enemies.reduce((a, e) => Math.max(a, e.onScreen ? e.spanFrac : 0), 0),
            }
          : combat,
        ticksRun: done,
      };
    },
    stick,
    ticks,
    samples
  );
}

function stickFromCmd(c) {
  const s = {
    x: Number(c.x ?? 0),
    y: Number(c.y ?? 0),
    fire: !!Number(c.fire ?? 0),
    missile: !!Number(c.missile ?? 0),
    throttleIndex: THROTTLE[c.throttle ?? 'M'],
  };
  if (!(s.x >= -1 && s.x <= 1) || !(s.y >= -1 && s.y <= 1)) die(`stick out of range: ${JSON.stringify(s)}`);
  if (s.throttleIndex === undefined) die(`--throttle must be L, M or H`);
  return s;
}

async function savePng(dataUrl, file) {
  await writeFile(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
}

// ------------------------------------------------------------------ serve --
async function serve(argv) {
  const args = parseArgs(
    argv,
    { defaults: { ticks: '60', samples: '6', idleTimeout: '900' }, valued: ['--session', '--url-params', '--ticks', '--samples', '--idle-timeout'], flags: [] },
    'serve'
  );
  if (!args.session) die('serve: --session <dir> is required (caller-unique, like capture.mjs --out).');
  const dir = args.session;
  await mkdir(path.join(dir, 'turns'), { recursive: true });

  const { server, browser, page, url, errors } = await boot(args.urlParams);
  let tick = 0;
  let lastId = 0;
  const sessionFile = path.join(dir, 'session.json');
  const writeSession = (status) =>
    writeFile(sessionFile, JSON.stringify({ status, url, tick, lastDone: lastId, pageErrors: errors.length, pid: process.pid }, null, 2));
  await writeSession('ready');
  console.log(`playtest serve: ready. session=${dir} url=${url}`);

  const idleMs = Number(args.idleTimeout) * 1000;
  let lastActivity = Date.now();
  try {
    for (;;) {
      if (Date.now() - lastActivity > idleMs) {
        console.log('playtest serve: idle timeout, shutting down.');
        break;
      }
      let cmd = null;
      try {
        cmd = JSON.parse(await readFile(path.join(dir, 'cmd.json'), 'utf8'));
      } catch {
        /* absent or mid-write; retry */
      }
      if (!cmd || !(cmd.id > lastId)) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      lastActivity = Date.now();
      if (cmd.quit) {
        lastId = cmd.id;
        await writeFile(path.join(dir, 'turns', `turn-${String(cmd.id).padStart(4, '0')}.json`), JSON.stringify({ id: cmd.id, quit: true }));
        console.log('playtest serve: quit command received.');
        break;
      }
      const stick = stickFromCmd(cmd);
      const ticks = Number(cmd.ticks ?? args.ticks);
      const t0 = tick;
      const r = await runTurn(page, stick, ticks, Number(args.samples));
      tick += r.ticksRun;
      const id4 = String(cmd.id).padStart(4, '0');
      await savePng(r.strip, path.join(dir, 'turns', `turn-${id4}-strip.png`));
      await savePng(r.final, path.join(dir, 'turns', `turn-${id4}-final.png`));
      const result = {
        id: cmd.id,
        stick,
        tickStart: t0,
        tickEnd: tick,
        flow: r.flow,
        sight: r.sight,
        combat: r.combat,
        pageErrors: errors.length,
      };
      await appendFile(path.join(dir, 'commands.jsonl'), JSON.stringify({ ...cmd, stick, tickStart: t0, tickEnd: tick }) + '\n');
      // Result JSON is written LAST — it is the "turn done" signal cmd polls on.
      await writeFile(path.join(dir, 'turns', `turn-${id4}.json`), JSON.stringify(result, null, 2));
      lastId = cmd.id;
      await writeSession('ready');
    }
  } finally {
    await writeSession('closed').catch(() => {});
    if (errors.length) {
      console.error(`${errors.length} page error(s):`);
      for (const e of errors) console.error(' ', e);
      process.exitCode = 1;
    }
    await browser.close();
    await server.close();
  }
}

// -------------------------------------------------------------------- cmd --
async function cmdMain(argv) {
  const args = parseArgs(
    argv,
    {
      defaults: { x: '0', y: '0', fire: '0', missile: '0', throttle: 'M', timeout: '30' },
      valued: ['--session', '--x', '--y', '--fire', '--missile', '--throttle', '--ticks', '--timeout'],
      flags: ['--quit'],
    },
    'cmd'
  );
  if (!args.session) die('cmd: --session <dir> is required.');
  const dir = args.session;

  let session;
  try {
    session = JSON.parse(await readFile(path.join(dir, 'session.json'), 'utf8'));
  } catch {
    die(`cmd: no session.json in ${dir} — is "playtest.mjs serve --session ${dir}" running?`);
  }
  if (session.status === 'closed') die('cmd: session is closed; start a new serve.');

  const existing = (await readdir(path.join(dir, 'turns')).catch(() => []))
    .map((f) => /^turn-(\d+)\.json$/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const id = (existing.length ? Math.max(...existing) : 0) + 1;
  const cmd = args.quit
    ? { id, quit: true }
    : { id, x: args.x, y: args.y, fire: args.fire, missile: args.missile, throttle: args.throttle, ...(args.ticks ? { ticks: args.ticks } : {}) };
  await writeFile(path.join(dir, 'cmd.json'), JSON.stringify(cmd));

  const resultFile = path.join(dir, 'turns', `turn-${String(id).padStart(4, '0')}.json`);
  const deadline = Date.now() + Number(args.timeout) * 1000;
  for (;;) {
    try {
      const r = JSON.parse(await readFile(resultFile, 'utf8'));
      if (r.quit) {
        console.log('quit acknowledged.');
        return;
      }
      const f = r.flow || {};
      const c = r.combat || {};
      console.log(
        `turn ${r.id}  ticks ${r.tickStart}->${r.tickEnd}  ` +
          `[${f.state ?? '?'} stage ${f.stageNumber ?? '?'}] lives ${f.lives ?? '?'} score ${f.score ?? '?'} hits ${c.hits ?? '?'}\n` +
          `  sight ${r.sight ? `(${r.sight.ndcX.toFixed(3)}, ${r.sight.ndcY.toFixed(3)})` : 'n/a'}  ` +
          `enemies on screen ${c.onScreen ?? '?'} (nearest span ${c.nearestSpanFrac !== undefined ? (c.nearestSpanFrac * 100).toFixed(1) + '%W' : '?'})  ` +
          `locks ${c.locks ?? '?'}  missiles in flight ${c.missilesInFlight ?? '?'}  stock ${c.missileStock ?? '?'}  ` +
          `enemy shots ${c.enemyShots ?? '?'}${f.deathPhase ? `  DEATH:${f.deathPhase}` : ''}\n` +
          `  strip: ${path.join(dir, 'turns', `turn-${String(id).padStart(4, '0')}-strip.png`)}\n` +
          `  final: ${path.join(dir, 'turns', `turn-${String(id).padStart(4, '0')}-final.png`)}` +
          (r.pageErrors ? `\n  PAGE ERRORS: ${r.pageErrors}` : '')
      );
      return;
    } catch {
      if (Date.now() > deadline) die(`cmd: timed out after ${args.timeout}s waiting for ${resultFile}. Check the serve process.`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }
}

// --------------------------------------------------------------- selftest --
async function selftest() {
  // invincible=1: the selftest validates MECHANICS (stick, trigger, strip) and
  // a bare idle player is dead by simTime ~8 — found by this selftest's own
  // first run, where all three input checks failed inside the death sequence.
  // Real playtests run WITHOUT it; dying is part of the game under test.
  console.log('playtest selftest: booting (seed 1, invincible)...');
  const { server, browser, page, errors } = await boot('seed=1&invincible=1');
  let pass = 0,
    fail = 0;
  const check = (name, ok, detail) => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
    ok ? pass++ : fail++;
  };
  try {
    // Warm past the launch sequence into flight.
    await runTurn(page, { x: 0, y: 0, fire: false, missile: false, throttleIndex: 1 }, 300, 1);

    // 1. Stick right moves the sight right; stick left moves it back left.
    const r0 = await runTurn(page, { x: 0, y: 0, fire: false, missile: false, throttleIndex: 1 }, 10, 1);
    const right = await runTurn(page, { x: 1, y: 0, fire: false, missile: false, throttleIndex: 1 }, 45, 1);
    check('stick right -> sight ndcX increases', !!(r0.sight && right.sight) && right.sight.ndcX > r0.sight.ndcX + 0.05, `${r0.sight?.ndcX?.toFixed(3)} -> ${right.sight?.ndcX?.toFixed(3)}`);
    const left = await runTurn(page, { x: -1, y: 0, fire: false, missile: false, throttleIndex: 1 }, 90, 1);
    check('stick left -> sight ndcX decreases', !!(left.sight && right.sight) && left.sight.ndcX < right.sight.ndcX - 0.05, `${right.sight?.ndcX?.toFixed(3)} -> ${left.sight?.ndcX?.toFixed(3)}`);

    // 2. Holding fire puts vulcan rounds in the air.
    const fire = await runTurn(page, { x: 0, y: 0, fire: true, missile: false, throttleIndex: 1 }, 30, 1);
    check('trigger held -> vulcan rounds in flight', (fire.combat?.vulcanRounds ?? 0) > 0, `rounds=${fire.combat?.vulcanRounds}`);

    // 3. Strip composites at the declared geometry and both PNGs decode.
    const t = await runTurn(page, { x: 0, y: 0, fire: false, missile: false, throttleIndex: 1 }, 24, 6);
    const stripBytes = Buffer.from(t.strip.slice(t.strip.indexOf(',') + 1), 'base64');
    check('strip is a PNG of 6 panels', stripBytes.subarray(1, 4).toString() === 'PNG' && t.strip.length > 2000, `${stripBytes.length} bytes`);
    check('turn ran the exact tick count', t.ticksRun === 24, `ticksRun=${t.ticksRun}`);

    // 4. Telemetry is live.
    check('flowState readable', !!t.flow && t.flow.state !== undefined, `state=${t.flow?.state}`);
    check('combatStats readable', !!t.combat && t.combat.simTime !== undefined, `simTime=${t.combat?.simTime?.toFixed(2)}`);
    check('zero page errors', errors.length === 0, `${errors.length}`);
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(`playtest selftest: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

// ------------------------------------------------------------------- main --
const [sub, ...rest] = process.argv.slice(2);
if (sub === 'serve') serve(rest).catch((e) => { console.error(e); process.exit(1); });
else if (sub === 'cmd') cmdMain(rest).catch((e) => { console.error(e); process.exit(1); });
else if (sub === 'selftest') selftest().catch((e) => { console.error(e); process.exit(1); });
else
  die(
    'Usage:\n' +
      '  node tools/playtest.mjs serve --session <dir> [--url-params "seed=7"] [--ticks 60] [--samples 6] [--idle-timeout 900]\n' +
      '  node tools/playtest.mjs cmd --session <dir> [--x -1..1] [--y -1..1] [--fire 0|1] [--missile 0|1] [--throttle L|M|H] [--ticks N] [--quit]\n' +
      '  node tools/playtest.mjs selftest'
  );

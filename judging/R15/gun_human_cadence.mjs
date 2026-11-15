#!/usr/bin/env node
// R15 human-CADENCE gun A/B. The R14 gun_aim_probe's aim arm re-aims EVERY tick
// (60 Hz) — a perfect tracker that the R13/R14 judges measured over-reads human
// play ~10x. This probe keeps the same two arms but throttles the aimer to a
// HUMAN decision cadence: it re-chooses a target and a stick only every
// DECISION_TICKS and HOLDS that stick between decisions, the way a hand does.
// The blind arm is unchanged (a true dead-centre stick — the trustworthy human
// floor either way).
//
// This is still not a hand on the stick (the authoritative verdict is the
// agent-playtest), but it brackets the perfect-tracker upper bound from below
// with a realistic reaction time, so the aim-vs-blind DIRECTION can be read at a
// cadence a person could actually fly.
//
// Determinism/provenance identical to gun_aim_probe.mjs: fixed-step, seeded,
// invincible (weapon reachability, not lethality). Controller reads only sim
// telemetry; it touches no RNG the sim reads.

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SEED = arg('--seed', '7');
const PACE = arg('--pace', '');
const TICKS = Number(arg('--ticks', '5400')); // 90 s
const POLICY = arg('--policy', 'gunaim'); // gunaim | blind
const DECISION_TICKS = Number(arg('--decision', '54')); // ~0.9 s reaction cadence

const SIGHT_Y_OFFSET = 0.30;
const READABLE_SPAN = 0.10;
const REACH_X = 0.33;

async function boot(urlParams) {
  const server = await createServer({
    root: ROOT, configFile: path.join(ROOT, 'vite.config.js'),
    server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null }, logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const url = new URL('/', `http://127.0.0.1:${port}/`);
  const search = new URLSearchParams(urlParams); search.set('fixed', '1');
  url.search = search.toString();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 672 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url.toString(), { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });
  return { server, browser, page, errors };
}

async function run() {
  const params = `seed=${SEED}&invincible=1` + (PACE ? `&pace=${PACE}` : '');
  const { server, browser, page, errors } = await boot(params);
  const result = await page.evaluate(
    async (TICKS, POLICY, SIGHT_Y_OFFSET, READABLE_SPAN, REACH_X, DECISION_TICKS) => {
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const startCounts = { ...(window.__killDrain().counts) };
      // The HELD stick — only replaced on a decision tick.
      let stick = { x: 0, y: 0, missile: false, fire: true };
      for (let i = 0; i < TICKS; i++) {
        if (POLICY === 'gunaim' && i % DECISION_TICKS === 0) {
          const s = window.__combatStats();
          const f = window.__fairness ? window.__fairness() : null;
          const p = f ? f.playerNdc : { x: 0, y: 0 };
          const enemies = s ? s.enemies : [];
          const cand = enemies.filter((e) => e.spanFrac >= READABLE_SPAN && Math.abs(e.ndcX) <= REACH_X);
          let target = null; let best = Infinity;
          for (const e of cand) { if (e.depth < best) { best = e.depth; target = e; } }
          stick = { x: 0, y: 0, missile: false, fire: true };
          if (target) {
            stick.x = clamp((target.ndcX - p.x) * 7, -1, 1);
            stick.y = clamp((target.ndcY - SIGHT_Y_OFFSET - p.y) * 7, -1, 1);
          }
        }
        // blind keeps the centred stick; gunaim holds its last decision.
        window.__setStick(stick);
        window.__step(1);
      }
      const endCounts = window.__killDrain().counts;
      const killsBy = {};
      for (const k of new Set([...Object.keys(startCounts), ...Object.keys(endCounts)])) {
        killsBy[k] = (endCounts[k] ?? 0) - (startCounts[k] ?? 0);
      }
      return { killsBy };
    },
    TICKS, POLICY, SIGHT_Y_OFFSET, READABLE_SPAN, REACH_X, DECISION_TICKS
  );
  await browser.close(); await server.close();
  console.log(JSON.stringify({ seed: SEED, pace: PACE || '(default)', policy: POLICY, decisionTicks: DECISION_TICKS, ...result, pageErrors: errors.slice(0, 3) }, null, 2));
}
run().catch((e) => { console.error(e); process.exit(1); });

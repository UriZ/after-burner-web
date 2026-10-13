// CONTROL for `ExplosionField.busy()` — the accessor the death sequence will
// gate a phase on.
//
// A phase gated on a predicate inherits that predicate's bugs as a soft-lock,
// so the three properties the flow lane asked for are MEASURED here rather
// than asserted in a comment:
//
//   1. it goes false, on a bound, and the bound is reported
//   2. it stays true through the RESIDUE, not just the fire
//   3. it does not mutate anything and is stable under repeated calls
//
// Driven in the page against the real `ExplosionField` with the real
// `SmokeField`, not a stub — the drain path being tested lives in
// `update(dt)` and in `SmokeField.update(dt)`.
//
//   node judging/R11/busy_control.mjs
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { strictPort: false, host: '127.0.0.1', hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({
  headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
let ok = 0;
let tot = 0;
const chk = (name, cond, got = '') => {
  tot += 1;
  ok += cond ? 1 : 0;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${got !== '' ? `   ${got}` : ''}`);
};
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/tools/fx-probe.html`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 20000 });

  const r = await page.evaluate(async () => {
    // THE APP'S OWN `three` INSTANCE, borrowed off a real sprite. Importing
    // `/node_modules/three/build/three.module.js` by path gives a SECOND
    // module instance — Vite serves the app its pre-bundled `.vite/deps` copy
    // — and a Vector3 from one instance fails `copy()` on the other. The
    // first version of this control did exactly that and died inside
    // ScreenSpace; the error was the useful kind.
    const { makeBillboard } = await import('/src/effects/pixelTexture.js');
    const mod = await import('/src/effects/explosions.js');
    const { ExplosionField } = mod;
    const V3 = makeBillboard(mod.burstTexturesForProbe()[0][0], 1).position.constructor;
    const at = () => new V3(0, 0, -20);
    // Scene and space are STUBS, deliberately. The property under test is the
    // predicate's DRAIN, which lives in `update(dt)` and `SmokeField.update`,
    // and both are the real ones; camera geometry and rendering only add ways
    // for the control to fail for reasons that are not the thing it tests.
    const scene = { add() {}, remove() {} };
    const space = { worldWidthFor: () => 1 };
    const f = new ExplosionField(scene, space);
    const rng = (() => { let s = 1; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();

    const out = { trace: [], scaleTrace: {} };
    out.idleBeforeSpawn = f.busy();
    f.spawn(at(), 20, rng, 1);
    out.busyImmediatelyAfterSpawn = f.busy();

    // purity: 50 calls must not change the answer or the field's own counts
    const before = [f.live.length, f.smoke.live.length];
    for (let i = 0; i < 50; i++) f.busy();
    out.pure = f.live.length === before[0] && f.smoke.live.length === before[1]
      && f.busy() === out.busyImmediatelyAfterSpawn;

    // drain at 60 Hz, recording when fire ends and when busy() goes false
    const dt = 1 / 60;
    let t = 0;
    let fireEnd = null;
    let busyEnd = null;
    let smokeSeen = false;
    for (let i = 0; i < 400 && busyEnd === null; i++) {
      f.update(dt);
      t += dt;
      if (f.smoke.live.length > 0) smokeSeen = true;
      if (fireEnd === null && f.live.every((e) => e.fireOut)) fireEnd = t;
      if (!f.busy()) busyEnd = t;
      if (i < 120) out.trace.push([Number(t.toFixed(4)), f.live.length, f.smoke.live.length, f.busy()]);
    }
    out.fireEnd = fireEnd;
    out.busyEnd = busyEnd;
    out.smokeSeen = smokeSeen;
    // the window in which ONLY residue is holding it true
    out.residueOnlyS = busyEnd !== null && fireEnd !== null ? busyEnd - fireEnd : null;

    // the WORST CASE over the residue's own life jitter: the puff life is
    // SMOKE_LIFE_S * (0.82 + 0.18*(1+sin(a*3+i))), so sweep the spawn
    // rotation that drives it and take the longest.
    let worst = 0;
    for (let k = 0; k < 24; k++) {
      const g = new ExplosionField(scene, space);
      const rr = (() => { let s = 7 + k * 101; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
      g.spawn(at(), 20, rr, 1);
      let tt = 0;
      for (let i = 0; i < 400 && g.busy(); i++) { g.update(dt); tt += dt; }
      if (g.busy()) { worst = Infinity; break; }
      worst = Math.max(worst, tt);
    }
    out.worstCaseS = worst;

    // clear() must resolve it immediately, which is the flow lane's escape
    const h = new ExplosionField(scene, space);
    h.spawn(at(), 20, rng, 1);
    h.update(dt * 20);
    const busyBeforeClear = h.busy();
    h.clear();
    out.clearResolves = busyBeforeClear && !h.busy();

    // a scale-2.7 spawn (deathSequence's starburst) must behave the same
    const j = new ExplosionField(scene, space);
    j.spawn(at(), 20, rng, 2.7);
    let jt = 0;
    for (let i = 0; i < 400 && j.busy(); i++) { j.update(dt); jt += dt; }
    out.scale27End = j.busy() ? null : jt;
    return out;
  });

  console.log(JSON.stringify({ ...r, trace: undefined }, null, 1));
  chk('idle before any spawn', r.idleBeforeSpawn === false);
  chk('busy on the SPAWN tick, before any update', r.busyImmediatelyAfterSpawn === true);
  chk('pure: 50 calls change nothing', r.pure === true);
  chk('residue is actually reached', r.smokeSeen === true);
  chk('goes FALSE', r.busyEnd !== null, `${r.busyEnd?.toFixed(3)} s`);
  chk('stays true through the residue, not just the fire',
    r.residueOnlyS !== null && r.residueOnlyS > 0.5,
    `fire ends ${r.fireEnd?.toFixed(3)} s, busy ends ${r.busyEnd?.toFixed(3)} s, ` +
    `residue-only window ${r.residueOnlyS?.toFixed(3)} s`);
  chk('worst case over 24 spawn rotations is bounded and under 1.4 s',
    Number.isFinite(r.worstCaseS) && r.worstCaseS < 1.4, `${r.worstCaseS?.toFixed(3)} s`);
  chk('clear() resolves it immediately', r.clearResolves === true);
  chk('scale 2.7 (deathSequence starburst) also terminates',
    r.scale27End !== null, `${r.scale27End?.toFixed(3)} s`);
  chk('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`${ok}/${tot}`);
  if (ok !== tot) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}

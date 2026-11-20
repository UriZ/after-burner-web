#!/usr/bin/env node
// Every battery PASS in a replay: when did its flare light, at what depth, at
// what depth did the round leave, how big was the turret on screen, and how
// long did the turret stay on screen AFTER the round left (i.e. could the
// player still see where the round came from)?
//
// Batteries are tracked by proximity continuity in the per-tick roster (no ids
// are exposed). `type === 'battery'` identifies them.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const onScreen = (p) => p[0] >= 0 && p[0] <= 320 && p[1] >= 0 && p[1] <= 224;

const dir = process.argv[2];
const lines = (await readFile(path.join(dir, 'roster.jsonl'), 'utf8')).split('\n').filter(Boolean);
const rows = lines.map((l) => JSON.parse(l));

// Build tracks of batteries by nearest-neighbour continuity.
const tracks = [];
let live = [];
for (const r of rows) {
  const bats = r.e.filter((e) => e.t === 'battery');
  const next = [];
  const used = new Set();
  for (const tr of live) {
    const last = tr.pts[tr.pts.length - 1];
    let best = null, be = Infinity, bi = -1;
    bats.forEach((b, i) => {
      if (used.has(i)) return;
      const err = Math.hypot(b.p[0] - last.p[0], b.p[1] - last.p[1]) + Math.abs(b.d - last.d) * 4;
      if (err < be) { be = err; best = b; bi = i; }
    });
    if (best && be < 60) {
      used.add(bi);
      tr.pts.push({ tick: r.tick, ...best, on: onScreen(best.p) });
      next.push(tr);
    } else {
      tracks.push(tr);
    }
  }
  bats.forEach((b, i) => {
    if (used.has(i)) return;
    next.push({ pts: [{ tick: r.tick, ...b, on: onScreen(b.p) }] });
  });
  live = next;
}
tracks.push(...live);

const out = [];
for (const tr of tracks) {
  const pts = tr.pts;
  const flare = pts.find((p) => p.tg > 0);
  if (!flare) { out.push({ fired: false, ticks: pts.length, firstD: pts[0].d, lastD: pts[pts.length - 1].d }); continue; }
  // The burst pays out the tick after tg hits 0.
  const burst = pts.find((p) => p.tick > flare.tick && p.b > 0) ??
                pts.find((p) => p.tick > flare.tick && p.tg === 0);
  const after = burst ? pts.filter((p) => p.tick > burst.tick) : [];
  const onAfter = after.filter((p) => p.on).length;
  out.push({
    fired: true,
    flareTick: flare.tick, flareD: flare.d, flarePx: flare.p, flareOn: flare.on, flareW: flare.w,
    fireTick: burst?.tick ?? null, fireD: burst?.d ?? null, firePx: burst?.p ?? null,
    fireOn: burst ? burst.on : null, fireW: burst?.w ?? null,
    // THE KEY NUMBER: how long the firer remains on screen after it fires.
    turretOnScreenAfterFireS: +(onAfter / 60).toFixed(3),
    trackedAfterFireS: +(after.length / 60).toFixed(3),
    lastTick: pts[pts.length - 1].tick, lastD: pts[pts.length - 1].d, lastPx: pts[pts.length - 1].p,
  });
}
const fired = out.filter((o) => o.fired);
const stat = (f) => {
  const xs = fired.map(f).filter((x) => x != null).sort((a, b) => a - b);
  if (!xs.length) return null;
  return { n: xs.length, min: +xs[0].toFixed(3), med: +xs[xs.length >> 1].toFixed(3), max: +xs[xs.length - 1].toFixed(3) };
};
console.log(JSON.stringify({
  dir: path.basename(dir),
  passes: out.length, firedPasses: fired.length, silentPasses: out.length - fired.length,
  flareDepth: stat((o) => o.flareD),
  fireDepth: stat((o) => o.fireD),
  fireWFrac: stat((o) => o.fireW),
  turretOnScreenAfterFireS: stat((o) => o.turretOnScreenAfterFireS),
  passes_detail: out,
}, null, 2));

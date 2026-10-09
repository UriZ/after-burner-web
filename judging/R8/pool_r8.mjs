#!/usr/bin/env node
// Pools one or more pilot_r8.mjs arms.json files into the report tables, and
// runs the hygiene sweep the project requires on any pooled figure:
// per-arm duplicate detection AND cross-file duplicate detection.
//
// The cross-file half is not decoration. STATUS.md's own entry: every sweep
// this project runs checks duplicates *within* a capture set and nothing
// checks *across* sets, and `tools/out/tl-verify-9-{1,2,3}` held three
// directories carrying one directory's information with every within-set
// sweep passing. The analogue here is pooling the same arm twice because two
// JSON files were produced by two invocations of the same command — so each
// (mode, seed) is hashed with its kill ledger and a repeat is REFUSED, not
// averaged.
//
// Usage: node judging/R8/pool_r8.mjs <arms.json> [more.json ...] [--gate 0.10]

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const files = [];
let gate = 0.1;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--gate') gate = Number(process.argv[++i]);
  else files.push(process.argv[i]);
}
if (!files.length) {
  console.error('usage: pool_r8.mjs <arms.json> [...] [--gate 0.10]');
  process.exit(2);
}

const rows = [];
const kills = {};
const seen = new Map();
const dupes = [];
for (const f of files) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  for (const r of d.rows) {
    const key = `${r.mode}-${r.seed}-${r.secs}`;
    const body = JSON.stringify(d.kills[`${r.mode}-${r.seed}`] ?? []);
    const h = createHash('sha256').update(body).digest('hex').slice(0, 12);
    if (seen.has(key)) {
      dupes.push({ key, files: [seen.get(key).file, f], sameContent: seen.get(key).h === h });
      continue;
    }
    seen.set(key, { file: f, h });
    rows.push({ ...r, _file: f, _hash: h });
    kills[key] = d.kills[`${r.mode}-${r.seed}`] ?? [];
  }
}
// A within-set duplicate shows up as two different (mode,seed) arms whose
// kill ledgers are byte-identical: that is the "two seeds produced
// byte-identical output" defect (?seed was silently ignored until R3).
const byHash = new Map();
for (const r of rows) {
  const l = byHash.get(r._hash) ?? [];
  l.push(`${r.mode}/${r.seed}`);
  byHash.set(r._hash, l);
}
const identical = [...byHash.values()].filter((l) => l.length > 1);

function q(a, p) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
function mean(a) {
  return a.reduce((x, y) => x + y, 0) / a.length;
}
function sem(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  const v = a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
  return Math.sqrt(v / a.length);
}

const modes = [...new Set(rows.map((r) => r.mode))];
const out = {};
for (const mode of modes) {
  const rs = rows.filter((r) => r.mode === mode);
  const k = rs.flatMap((r) => kills[`${r.mode}-${r.seed}-${r.secs}`]);
  const gun = k.filter((x) => x.src === 'vulcan');
  const msl = k.filter((x) => x.src === 'missile');
  const flightS = rs.reduce((a, r) => a + r.flightS, 0);
  const perSeed = rs.map((r) => r.killsPerFlightS);
  out[mode] = {
    seeds: rs.length,
    flightS: Number(flightS.toFixed(1)),
    wallS: rs.reduce((a, r) => a + r.secs, 0),
    kills: k.length,
    killsPerFlightS: Number((k.length / flightS).toFixed(4)),
    sem: Number(sem(perSeed).toFixed(4)),
    perSeed: perSeed.map((v) => Number(v.toFixed(3))),
    gunKills: gun.length,
    mslKills: msl.length,
    gunPerFlightS: Number((gun.length / flightS).toFixed(4)),
    mslPerFlightS: Number((msl.length / flightS).toFixed(4)),
    allSpanP50: Number((q(k.map((x) => x.span), 0.5) * 100 || 0).toFixed(2)),
    allSubReadable: Number(((k.filter((x) => x.span < gate).length / (k.length || 1)) * 100).toFixed(1)),
    gunSpanP50: Number((q(gun.map((x) => x.span), 0.5) * 100 || 0).toFixed(2)),
    gunSpanP10: Number((q(gun.map((x) => x.span), 0.1) * 100 || 0).toFixed(2)),
    gunSubReadable: Number(((gun.filter((x) => x.span < gate).length / (gun.length || 1)) * 100).toFixed(1)),
    gunDepthP50: Number((q(gun.map((x) => x.d), 0.5) || 0).toFixed(2)),
    gunDepthP90: Number((q(gun.map((x) => x.d), 0.9) || 0).toFixed(2)),
    gunDepthMax: gun.length ? Number(Math.max(...gun.map((x) => x.d)).toFixed(2)) : null,
    mslSpanP50: Number((q(msl.map((x) => x.span), 0.5) * 100 || 0).toFixed(2)),
    mslDepthP50: Number((q(msl.map((x) => x.d), 0.5) || 0).toFixed(2)),
    readableShare: Number(
      ((rs.reduce((a, r) => a + r.readableShare * r.flightTicks, 0) /
        rs.reduce((a, r) => a + r.flightTicks, 0)) * 100).toFixed(1)
    ),
    worstDroughtS: Number(Math.max(...rs.map((r) => r.worstDroughtS)).toFixed(2)),
    meanAlive: Number(
      (rs.reduce((a, r) => a + r.meanAlive * r.flightTicks, 0) /
        rs.reduce((a, r) => a + r.flightTicks, 0)).toFixed(2)
    ),
    enemyRoundsPerFlightMin: Number(
      ((rs.reduce((a, r) => a + r.enemyShotsFired, 0) / flightS) * 60).toFixed(1)
    ),
    pHit: Number(
      ((rs.reduce((a, r) => a + r.playerHitsTaken, 0) / rs.reduce((a, r) => a + r.crossings, 0)) * 100).toFixed(2)
    ),
    crossings: rs.reduce((a, r) => a + r.crossings, 0),
    playerHitsTaken: rs.reduce((a, r) => a + r.playerHitsTaken, 0),
    hitsLogged: rs.reduce((a, r) => a + r.hitsLogged, 0),
    unannounced: rs.reduce((a, r) => a + r.unannounced, 0),
    unannouncedFatal: rs.reduce((a, r) => a + r.unannouncedFatal, 0),
    warnMin: Number(Math.min(...rs.map((r) => r.warnMin ?? Infinity)).toFixed(3)),
    flightShare: Number((mean(rs.map((r) => r.flightShare)) * 100).toFixed(2)),
    stageMax: Math.max(...rs.map((r) => r.stageMax)),
  };
}

console.log('=== HYGIENE ===');
console.log(`files pooled: ${files.length}`);
console.log(`arms pooled : ${rows.length}`);
console.log(`cross-file duplicate (mode,seed,secs) keys REFUSED: ${dupes.length}`);
for (const d of dupes) console.log(`  ${d.key} in ${d.files.join(' and ')} (identical content: ${d.sameContent})`);
console.log(`byte-identical kill ledgers across different arms: ${identical.length}`);
for (const g of identical) console.log(`  ${g.join(' == ')}`);
const zeroKill = rows.filter((r) => r.kills === 0 && r.mode !== 'idle');
console.log(`arms with zero kills (excluding the idle control): ${zeroKill.length}`);
for (const r of zeroKill) console.log(`  ${r.mode}/${r.seed} in ${r._file}`);
const dropped = rows.filter((r) => r.killsDropped > 0);
console.log(`arms that dropped a kill-ledger entry: ${dropped.length}`);

console.log('\n=== PER MODE ===');
const cols = [
  'seeds', 'flightS', 'kills', 'killsPerFlightS', 'sem', 'gunPerFlightS', 'mslPerFlightS',
  'allSpanP50', 'allSubReadable', 'gunSpanP50', 'gunSubReadable', 'gunDepthP50', 'gunDepthMax',
  'mslDepthP50', 'readableShare', 'worstDroughtS', 'meanAlive', 'enemyRoundsPerFlightMin',
  'pHit', 'crossings', 'unannouncedFatal', 'warnMin', 'flightShare',
];
console.log(['mode'.padEnd(8), ...cols.map((c) => c.slice(0, 9).padStart(10))].join(''));
for (const m of modes) {
  console.log([m.padEnd(8), ...cols.map((c) => String(out[m][c]).padStart(10))].join(''));
}
const ref = out.trk ?? out.trkall;
if (out.still && ref) {
  console.log(
    `\nstill / trk = ${((out.still.killsPerFlightS / ref.killsPerFlightS) * 100).toFixed(1)} %` +
      `   (gate: <= 40 %)`
  );
}
console.log('\n=== JSON ===');
console.log(JSON.stringify(out, null, 1));

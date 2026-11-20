#!/usr/bin/env node
// Per-death FIRER-VISIBILITY operator, and the fire-schedule burstiness
// statistic. Reads replay_firer.mjs output (roster.jsonl + deaths.json +
// fires.json); computes nothing from pixels.
//
// THE OPERATOR (stated, so it can be argued with):
//   A death is SOURCED iff the enemy that fired the killing round was
//   CONTINUOUSLY on screen, drawn at >= MIN_W of frame width, for >= 1.167 s
//   (the project's standing warning floor) immediately before impact.
//   "On screen" = its projected centre lies inside the 320x224 frame with a
//   SAFE margin of 0 px (centre in frame). MIN_W = 0.02 (6.4 px of 320) — the
//   same readable-size floor R36 used for the fatal round.
//
//   The firer is identified by MATCHING the hitLog's fromX/fromY/fromD (the
//   round's launch NDC = the firer's projection at the fire tick) against the
//   roster at the fire tick: fire tick = impactTick - round_flight_ticks,
//   where round_flight = warning - teleS. Match = nearest enemy in (px,depth);
//   the match residual is REPORTED so a bad attribution is visible rather
//   than silent.
//
// Usage: node analyze_death.mjs <replayDir> [<replayDir>...]
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MIN_W = 0.02;       // readable-size floor, fraction of frame width
const FLOOR_S = 1.167;    // standing warning floor (R36/R37/R38 gate)
const TELE_AIR = 1.0;     // ENEMY_TELEGRAPH_S
const TELE_BATTERY = 0.4; // BATTERY_TELEGRAPH_S

const onScreen = (p) => p[0] >= 0 && p[0] <= 320 && p[1] >= 0 && p[1] <= 224;

function quantiles(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const q = (f) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const varr = s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length;
  return {
    n: s.length,
    min: +s[0].toFixed(3), p25: +q(0.25).toFixed(3), med: +q(0.5).toFixed(3),
    p75: +q(0.75).toFixed(3), p90: +q(0.9).toFixed(3), max: +s[s.length - 1].toFixed(3),
    mean: +mean.toFixed(3), sd: +Math.sqrt(varr).toFixed(3),
    // Burstiness: the coefficient of variation of inter-event gaps. CV = 0 is a
    // metronome, CV = 1 is Poisson (memoryless), CV > 1 is CLUMPED (long
    // droughts punctuated by bursts). Same operator both sides.
    cv: mean > 0 ? +(Math.sqrt(varr) / mean).toFixed(3) : null,
  };
}

async function one(dir) {
  const deaths = JSON.parse(await readFile(path.join(dir, 'deaths.json'), 'utf8'));
  const fires = JSON.parse(await readFile(path.join(dir, 'fires.json'), 'utf8'));
  const rosterLines = (await readFile(path.join(dir, 'roster.jsonl'), 'utf8')).split('\n').filter(Boolean);
  const roster = new Map();
  for (const l of rosterLines) { const r = JSON.parse(l); roster.set(r.tick, r); }

  const out = [];
  for (const d of deaths.deaths) {
    const h = d.hit;
    const teleS = h.type === 'battery' ? TELE_BATTERY : TELE_AIR;
    const flightS = h.warning - teleS;
    const fireTick = d.tick - Math.round(flightS * 60);
    const flareTick = d.tick - Math.round(h.warning * 60);
    // Identify the firer at the fire tick by its projection.
    const fr = roster.get(fireTick);
    const wantPx = [((h.fromX + 1) / 2) * 320, ((1 - h.fromY) / 2) * 224];
    let best = null, bestErr = Infinity;
    for (const e of (fr?.e ?? [])) {
      const err = Math.hypot(e.p[0] - wantPx[0], e.p[1] - wantPx[1]) + Math.abs(e.d - h.fromD) * 2;
      if (err < bestErr) { bestErr = err; best = e; }
    }
    // Track that same enemy backwards/forwards by nearest-neighbour continuity
    // (the roster carries no ids — track by proximity frame to frame).
    const track = [];
    let cur = best;
    for (let t = fireTick; t >= Math.max(1, fireTick - 400) && cur; t--) {
      const r = roster.get(t);
      if (!r) break;
      let c = null, ce = Infinity;
      for (const e of r.e) {
        if (e.t !== cur.t) continue;
        const err = Math.hypot(e.p[0] - cur.p[0], e.p[1] - cur.p[1]) + Math.abs(e.d - cur.d) * 2;
        if (err < ce) { ce = err; c = e; }
      }
      if (!c || ce > 40) break; // lost the track
      track.unshift({ tick: t, p: c.p, d: c.d, w: c.w, tg: c.tg, onScr: onScreen(c.p) && c.w >= MIN_W });
      cur = c;
    }
    // Forward from fire tick to impact (the firer keeps scrolling/flying).
    cur = best;
    for (let t = fireTick + 1; t <= d.tick; t++) {
      const r = roster.get(t);
      if (!r) break;
      let c = null, ce = Infinity;
      for (const e of r.e) {
        if (e.t !== cur.t) continue;
        const err = Math.hypot(e.p[0] - cur.p[0], e.p[1] - cur.p[1]) + Math.abs(e.d - cur.d) * 2;
        if (err < ce) { ce = err; c = e; }
      }
      if (!c || ce > 40) break;
      track.push({ tick: t, p: c.p, d: c.d, w: c.w, tg: c.tg, onScr: onScreen(c.p) && c.w >= MIN_W });
      cur = c;
    }
    // Continuous visible run immediately BEFORE impact (walk back from the last
    // tracked tick that is <= impact).
    let run = 0;
    for (let i = track.length - 1; i >= 0; i--) {
      if (track[i].onScr) run++; else break;
    }
    const atFire = track.find((x) => x.tick === fireTick);
    const atFlare = track.find((x) => x.tick === flareTick);
    out.push({
      dir: path.basename(dir), seed: deaths.seed, impactTick: d.tick, stage: d.stage,
      killer: h.type, warning: +h.warning.toFixed(3), flightS: +flightS.toFixed(3),
      flareTick, fireTick, matchResidual: +bestErr.toFixed(1),
      firerPxAtFlare: atFlare ? atFlare.p : null,
      firerPxAtFire: atFire ? atFire.p : null,
      firerWAtFire: atFire ? atFire.w : null,
      firerOnScreenAtFlare: atFlare ? atFlare.onScr : null,
      firerOnScreenAtFire: atFire ? atFire.onScr : null,
      firerPxAtImpact: track.length && track[track.length - 1].tick === d.tick ? track[track.length - 1].p : null,
      firerOnScreenAtImpact: track.length && track[track.length - 1].tick === d.tick ? track[track.length - 1].onScr : null,
      // THE OPERATOR'S VERDICT
      visibleRunBeforeImpactS: +(run / 60).toFixed(3),
      sourced: run / 60 >= FLOOR_S,
      trackLen: track.length,
      trackFirstTick: track.length ? track[0].tick : null,
      playerNdcAtImpact: roster.get(d.tick)?.pn ?? null,
      aim: [h.aimX, h.aimY],
    });
  }

  // Fire schedule: inter-event gaps during FLIGHT only (a death/tally pause is
  // not a drought the player experiences as one).
  const flightFires = fires.fires.filter((f) => f.state === 'flight');
  const gaps = [];
  for (let i = 1; i < flightFires.length; i++) {
    const g = (flightFires[i].tick - flightFires[i - 1].tick) / 60;
    if (g > 0 && g < 60) gaps.push(g);
  }
  // Rounds-per-10s series, for the "15 s of nothing then a 30-shot barrage" claim.
  const ticks = rosterLines.length;
  const bins = new Array(Math.ceil(ticks / 600)).fill(0);
  for (const f of flightFires) bins[Math.floor((f.tick - 1) / 600)] += f.n;

  return { deaths: out, fireGaps: quantiles(gaps), nFires: flightFires.length,
    totalRounds: flightFires.reduce((a, f) => a + f.n, 0), per10s: bins, ticks };
}

const dirs = process.argv.slice(2);
const res = {};
for (const d of dirs) res[path.basename(d)] = await one(d);
console.log(JSON.stringify(res, null, 2));

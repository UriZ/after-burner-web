// Synthesized sound effects — oscillators, noise and envelopes only, no
// recorded/ripped samples (ARCHITECTURE.md D5). Every exported `play*`
// function builds and discards a few short-lived nodes per call; nothing
// here allocates per-frame, so firing the vulcan at 12/s is cheap.
//
// Every function no-ops cleanly if the context is muted/absent — see
// engine.js header. This file never imports from outside src/audio/**.
import { ctx, master, now, noiseBuffer } from './engine.js';

function env(gainNode, start, attack, peak, decayTo, decayEnd) {
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(peak, start + attack);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(decayTo, 0.0001), decayEnd);
}

// Soft-clip waveshaper — adds harmonic grit/bite so a blast or a launch roar
// reads as "hot" rather than a clean sine whoomph. `amount` 0..1. A fresh
// node per call (so concurrent voices never share one shaper's summed input),
// but the 1k transfer curve is cached per amount bucket so rapid fire doesn't
// rebuild it each shot.
const _curveCache = new Map();
function shaperCurve(amount) {
  const key = Math.round(amount * 20);
  let curve = _curveCache.get(key);
  if (curve) return curve;
  const n = 1024;
  curve = new Float32Array(n);
  const k = amount * 60;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  _curveCache.set(key, curve);
  return curve;
}
function shaper(c, amount = 0.6) {
  const ws = c.createWaveShaper();
  ws.curve = shaperCurve(amount);
  ws.oversample = '2x';
  return ws;
}

function noiseVoice(c, buffer, filterType, freqStart, freqEnd, rampEnd) {
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freqStart, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), rampEnd);
  src.connect(filter);
  return { src, filter };
}

// --- Vulcan: rapid percussive burst, alternating muzzles -------------------
// A hard-cased arcade cannon stutter, not a laser zap: a fast pitch-dropping
// square click plus a sub-5ms noise snap. `side` (+1/-1, matches
// vulcan.js's alternating muzzle) nudges pitch ~6% so the ear can tell the
// two muzzles apart the way the zig-zag column reads visually.
export function playVulcan(side = 1) {
  const c = ctx();
  if (!c) return;
  const t = now();
  // Muzzle-distinguished body pitch (~6% apart) so the alternating muzzles
  // read as a left/right chatter, like the zig-zag round column reads visually.
  const base = side > 0 ? 330 : 310;
  const dst = master();

  // 1) CRACK — sub-5ms highpassed noise snap. The bright ignition transient
  // that makes the round read as a hit, not a hum, and that stacks into the
  // "dakka" edge when firing fast.
  const crack = c.createBufferSource();
  crack.buffer = noiseBuffer(0.03);
  const chp = c.createBiquadFilter();
  chp.type = 'highpass';
  chp.frequency.value = 3200;
  const cg = c.createGain();
  env(cg, t, 0.0005, 0.42, 0.0001, t + 0.012);
  crack.connect(chp).connect(cg).connect(dst);
  crack.start(t);
  crack.stop(t + 0.03);

  // 2) BODY — a fat, gritty pitch-dropping sawtooth: the mechanical "chug"
  // that gives the cannon weight. Run through the soft-clipper for metallic
  // bite so it rattles instead of beeping.
  const body = c.createOscillator();
  body.type = 'sawtooth';
  body.frequency.setValueAtTime(base, t);
  body.frequency.exponentialRampToValueAtTime(base * 0.42, t + 0.05);
  const bodyShape = shaper(c, 0.7);
  const bg = c.createGain();
  env(bg, t, 0.001, 0.34, 0.0001, t + 0.06);
  body.connect(bodyShape).connect(bg).connect(dst);
  body.start(t);
  body.stop(t + 0.07);

  // 3) PUNCH — a short low sine thump for the kick of each round. Kept low
  // gain and quick so 12 rounds/s read as a tight rattle, not a bass drone.
  const punch = c.createOscillator();
  punch.type = 'sine';
  punch.frequency.setValueAtTime(165, t);
  punch.frequency.exponentialRampToValueAtTime(82, t + 0.04);
  const pg = c.createGain();
  env(pg, t, 0.001, 0.3, 0.0001, t + 0.05);
  punch.connect(pg).connect(dst);
  punch.start(t);
  punch.stop(t + 0.06);
}

// --- Missile launch: whoosh + low thump -------------------------------------
export function playMissileLaunch() {
  const c = ctx();
  if (!c) return;
  const t = now();
  const dur = 0.6;
  const dst = master();

  // 1) IGNITION CHUFF — a loud, short noise burst at t0: the "whump" of the
  // motor catching. Lowpassed so it's a thick pressure hit, not a hiss.
  const chuff = c.createBufferSource();
  chuff.buffer = noiseBuffer(0.12);
  const clp = c.createBiquadFilter();
  clp.type = 'lowpass';
  clp.frequency.setValueAtTime(1800, t);
  clp.frequency.exponentialRampToValueAtTime(600, t + 0.1);
  const cg = c.createGain();
  env(cg, t, 0.002, 0.55, 0.0001, t + 0.12);
  chuff.connect(clp).connect(cg).connect(dst);
  chuff.start(t);
  chuff.stop(t + 0.14);

  // 2) ROAR — the sustained rocket body: broadband noise swept bright->dark,
  // through the soft-clipper for a gritty thrust roar that swells then trails.
  const { src, filter } = noiseVoice(c, noiseBuffer(0.7), 'bandpass', 2600, 500, t + dur);
  filter.Q.value = 0.8;
  const roarShape = shaper(c, 0.5);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.42, t + 0.08); // fast swell in
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur); // long trail out
  src.connect(filter).connect(roarShape).connect(g).connect(dst);
  src.start(t);
  src.stop(t + dur + 0.02);

  // 3) THRUST SIZZLE — a descending sawtooth sweep for the pitched "fffshOOM"
  // of the missile accelerating away, gritted to match the roar.
  const sizzle = c.createOscillator();
  sizzle.type = 'sawtooth';
  sizzle.frequency.setValueAtTime(520, t);
  sizzle.frequency.exponentialRampToValueAtTime(70, t + dur * 0.8);
  const sizShape = shaper(c, 0.4);
  const sg = c.createGain();
  env(sg, t, 0.006, 0.28, 0.0001, t + dur * 0.85);
  sizzle.connect(sizShape).connect(sg).connect(dst);
  sizzle.start(t);
  sizzle.stop(t + dur);

  // 4) LAUNCH THUMP — the low kick of the rail releasing, for weight.
  const thump = c.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(120, t);
  thump.frequency.exponentialRampToValueAtTime(42, t + 0.16);
  const tg = c.createGain();
  env(tg, t, 0.001, 0.5, 0.0001, t + 0.2);
  thump.connect(tg).connect(dst);
  thump.start(t);
  thump.stop(t + 0.22);
}

// --- Lock-on acquisition: short upward chirp --------------------------------
export function playLockOn() {
  const c = ctx();
  if (!c) return;
  const t = now();
  const dst = master();

  // A crisp arcade "ACQUIRED" confirm: two short rising blips and a longer
  // held confirm tone (a C#6-F6-A6 climb). Square carriers for bite, with a
  // tiny sine sub-octave under the final tone so the lock lands with a bit of
  // body and clearly cuts through combat — not the thin single chirp it was.
  const blips = [
    { f: 1109, st: 0.0, d: 0.05, g: 0.22 }, // C#6
    { f: 1480, st: 0.07, d: 0.05, g: 0.24 }, // F#6
    { f: 1760, st: 0.14, d: 0.16, g: 0.26 }, // A6 — held confirm
  ];
  blips.forEach(({ f, st, d, g: peak }, i) => {
    const t0 = t + st;
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.value = f;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 1.2;
    const g = c.createGain();
    env(g, t0, 0.003, peak, 0.0001, t0 + d);
    osc.connect(bp).connect(g).connect(dst);
    osc.start(t0);
    osc.stop(t0 + d + 0.02);

    // Sub-octave body under the final confirm tone for weight.
    if (i === blips.length - 1) {
      const sub = c.createOscillator();
      sub.type = 'triangle';
      sub.frequency.value = f / 2;
      const sg = c.createGain();
      env(sg, t0, 0.004, 0.12, 0.0001, t0 + d);
      sub.connect(sg).connect(dst);
      sub.start(t0);
      sub.stop(t0 + d + 0.02);
    }
  });
}

// --- Explosion: noise burst + low boom --------------------------------------
// `big` scales duration/pitch down for the player-death variant (GAME_SPEC
// §2's screen-filling starburst reads as a heavier, longer event than a
// stage-1 fighter kill).
export function playExplosion(big = false) {
  const c = ctx();
  if (!c) return;
  const t = now();
  const dur = big ? 1.1 : 0.65;
  const dst = master();

  // 1) CRACK — a bright, sub-10ms highpassed noise snap at t0: the detonation
  // edge that makes the blast arrive as a HIT, not a soft whoomph.
  const crack = c.createBufferSource();
  crack.buffer = noiseBuffer(0.04);
  const chp = c.createBiquadFilter();
  chp.type = 'highpass';
  chp.frequency.value = 2200;
  const cg = c.createGain();
  env(cg, t, 0.001, big ? 0.6 : 0.5, 0.0001, t + 0.03);
  crack.connect(chp).connect(cg).connect(dst);
  crack.start(t);
  crack.stop(t + 0.05);

  // 2) BLAST BODY — broadband noise swept bright->dark through the soft-clipper
  // for a gritty, hot roar (clean lowpass noise sounds like wind; the grit is
  // what reads as fire/debris).
  const { src, filter } = noiseVoice(c, noiseBuffer(1.2), 'lowpass', 5000, 220, t + dur);
  const blastShape = shaper(c, 0.55);
  const g = c.createGain();
  env(g, t, 0.004, big ? 0.6 : 0.46, 0.0001, t + dur);
  src.connect(filter).connect(blastShape).connect(g).connect(dst);
  src.start(t);
  src.stop(t + dur + 0.02);

  // 3) SUB BOOM — deep sine drop for the chest-thump low end, longer and
  // lower than before so the kill actually lands in the low register.
  const boom = c.createOscillator();
  boom.type = 'sine';
  const f0 = big ? 85 : 95;
  boom.frequency.setValueAtTime(f0, t);
  boom.frequency.exponentialRampToValueAtTime(f0 * 0.3, t + dur * 0.85);
  const bg = c.createGain();
  env(bg, t, 0.004, big ? 0.72 : 0.56, 0.0001, t + dur * 0.95);
  boom.connect(bg).connect(dst);
  boom.start(t);
  boom.stop(t + dur);

  // 4) PUNCH — a mid gritty saw drop fills the gap between the sub and the
  // noise so the explosion has a solid middle and reads full-range.
  const punch = c.createOscillator();
  punch.type = 'sawtooth';
  punch.frequency.setValueAtTime(big ? 220 : 260, t);
  punch.frequency.exponentialRampToValueAtTime(big ? 60 : 80, t + 0.2);
  const punchShape = shaper(c, 0.45);
  const pg = c.createGain();
  env(pg, t, 0.002, big ? 0.34 : 0.28, 0.0001, t + 0.28);
  punch.connect(punchShape).connect(pg).connect(dst);
  punch.start(t);
  punch.stop(t + 0.3);
}

// --- Enemy fly-past: doppler-ish filtered swell with a stereo sweep --------
export function playEnemyFlyPast(panFrom = -1, panTo = 1) {
  const c = ctx();
  if (!c) return;
  const t = now();
  const dur = 0.6;
  const { src, filter } = noiseVoice(c, noiseBuffer(0.7), 'bandpass', 500, 1800, t + dur * 0.5);
  filter.frequency.exponentialRampToValueAtTime(400, t + dur);
  filter.Q.value = 3;
  const g = c.createGain();
  env(g, t, 0.08, 0.18, 0.0001, t + dur);
  const pan = c.createStereoPanner();
  pan.pan.setValueAtTime(panFrom, t);
  pan.pan.linearRampToValueAtTime(panTo, t + dur);
  src.connect(filter).connect(g).connect(pan).connect(master());
  src.start(t);
  src.stop(t + dur + 0.02);
}

// --- Player death: explosion + descending wail ------------------------------
export function playPlayerDeath() {
  playExplosion(true);
  const c = ctx();
  if (!c) return;
  const t = now();
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 1.3);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1200;
  const g = c.createGain();
  env(g, t, 0.02, 0.22, 0.0001, t + 1.3);
  osc.connect(lp).connect(g).connect(master());
  osc.start(t);
  osc.stop(t + 1.35);
}

// --- Respawn "ready": two-note rising chime --------------------------------
export function playRespawnReady() {
  const c = ctx();
  if (!c) return;
  const t = now();
  const notes = [523.25, 783.99]; // C5, G5
  notes.forEach((f, i) => {
    const st = t + i * 0.14;
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.value = f;
    const g = c.createGain();
    env(g, st, 0.005, 0.18, 0.0001, st + 0.22);
    osc.connect(g).connect(master());
    osc.start(st);
    osc.stop(st + 0.24);
  });
}

// --- Tally tick: one blip per HIT counted at the stage-end tally -----------
export function playTallyTick() {
  const c = ctx();
  if (!c) return;
  const t = now();
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 1250;
  const g = c.createGain();
  env(g, t, 0.001, 0.12, 0.0001, t + 0.05);
  osc.connect(g).connect(master());
  osc.start(t);
  osc.stop(t + 0.06);
}

// --- Menu/start: short rising arpeggio (title select / coin-in) -----------
export function playMenuStart() {
  const c = ctx();
  if (!c) return;
  const t = now();
  const notes = [392, 494, 587, 784]; // G4 B4 D5 G5
  notes.forEach((f, i) => {
    const st = t + i * 0.07;
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = c.createGain();
    env(g, st, 0.005, 0.16, 0.0001, st + 0.12);
    osc.connect(g).connect(master());
    osc.start(st);
    osc.stop(st + 0.13);
  });
}

// --- Jet engine loop: filtered noise, pitch tied to speed, with an ---------
// --- afterburner swell layered on top at high speed. ------------------------
// Persistent node graph, started once and left running; setSpeed() only
// touches params, never recreates nodes (this is the one SFX that must be
// cheap per-frame, since the caller is expected to call it every tick).
let engineNodes = null;

function ensureEngine() {
  if (engineNodes) return engineNodes;
  const c = ctx();
  if (!c) return null;
  const buf = noiseBuffer(2);
  if (!buf) return null;

  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 350;
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  src.connect(filter).connect(gain).connect(master());
  src.start();

  // Afterburner layer: a brighter, higher-passed slice of the same noise
  // buffer, silent until setSpeed() swells it in near max throttle.
  const abSrc = c.createBufferSource();
  abSrc.buffer = buf;
  abSrc.loop = true;
  abSrc.playbackRate.value = 1.6;
  const abFilter = c.createBiquadFilter();
  abFilter.type = 'highpass';
  abFilter.frequency.value = 900;
  const abGain = c.createGain();
  abGain.gain.value = 0;
  abSrc.connect(abFilter).connect(abGain).connect(master());
  abSrc.start();

  engineNodes = { filter, gain, abGain };
  return engineNodes;
}

function smoothstep(lo, hi, v) {
  const x = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return x * x * (3 - 2 * x);
}

// `speedFrac`: 0..1 throttle fraction (GAME_SPEC §1's 3-state SPEED L/M/H
// maps onto this continuously, e.g. L≈0.3 M≈0.65 H≈1.0 — callers pick the
// mapping). Base noise brightens and loudens with speed; the afterburner
// swell fades in only in the top quarter of the range.
export function setEngineSpeed(speedFrac) {
  const nodes = ensureEngine();
  if (!nodes) return;
  const c = ctx();
  const s = Math.min(1, Math.max(0, speedFrac));
  const t = c.currentTime;
  const target = 150 + s * 1100;
  const vol = 0.05 + s * 0.12;
  const ab = smoothstep(0.75, 1.0, s) * 0.14;
  nodes.filter.frequency.setTargetAtTime(target, t, 0.08);
  nodes.gain.gain.setTargetAtTime(vol, t, 0.1);
  nodes.abGain.gain.setTargetAtTime(ab, t, 0.15);
}

export function stopEngine() {
  if (!engineNodes) return;
  const c = ctx();
  if (c) {
    engineNodes.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.05);
    engineNodes.abGain.gain.setTargetAtTime(0, c.currentTime, 0.05);
  }
}

// --- Inbound-shot warning: looping two-tone warble, pitch rising with -----
// --- proximity ---------------------------------------------------------
// feel-critique.md §8/§10 rank 8: "there is no sound for enemy fire, for an
// inbound shot" — the thing that kills the player arrives with no telegraph
// at all, both visually (combatfx-r5's rank-2 fix) and audibly (this). The
// arcade's physical DANGER lamp has no software substitute, so this is a
// stand-in cue, not a measured reproduction.
// Persistent node graph, same pattern as the engine loop: built once,
// touched every frame via setInboundWarning(intensity) rather than
// recreated — the caller (spawner/combat, not owned here) is expected to
// drive it every tick while any shot is approaching.
let warnNodes = null;

function ensureWarn() {
  if (warnNodes) return warnNodes;
  const c = ctx();
  if (!c) return null;
  const osc1 = c.createOscillator();
  osc1.type = 'square';
  osc1.frequency.value = 650;
  const osc2 = c.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = 650 * 1.19; // a minor third above osc1, for the two-tone warble
  const lfo = c.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 6; // warble rate, Hz
  const lfoGain = c.createGain();
  lfoGain.gain.value = 40;
  lfo.connect(lfoGain).connect(osc2.frequency);
  const gain = c.createGain();
  gain.gain.value = 0;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master());
  osc1.start();
  osc2.start();
  lfo.start();
  warnNodes = { gain, osc1, osc2 };
  return warnNodes;
}

// `intensity` 0..1: 0 = silent (nothing inbound), 1 = closest/most urgent.
// Callers should ramp this smoothly (e.g. from a shot's time-to-impact)
// rather than toggling it on/off, so the pitch rise itself reads as the
// threat closing.
export function setInboundWarning(intensity) {
  const nodes = ensureWarn();
  if (!nodes) return;
  const c = ctx();
  const s = Math.min(1, Math.max(0, intensity));
  const t = c.currentTime;
  nodes.gain.gain.setTargetAtTime(s * 0.16, t, 0.05);
  const f = 650 + s * 450;
  nodes.osc1.frequency.setTargetAtTime(f, t, 0.05);
  nodes.osc2.frequency.setTargetAtTime(f * 1.19, t, 0.05);
}

// --- Enemy fire: an incoming round that you HEAR APPROACH ------------------
// R37 (owner, first live ear-check: "improve the sound of incoming fire").
// The R34 cue was a 0.16 s blip AT THE MUZZLE — it said "something fired",
// then the round flew its whole 0.8-5 s approach in silence. Every enemy
// round in this game flies a FIXED straight line at a FIXED speed, so its
// entire future is known the instant it spawns; the caller (enemyShots.spawn)
// passes crossS (seconds until it crosses the player's plane) and flightS,
// and this schedules the full arc up front, in the arcade falling-shell
// idiom:
//   * a soft launch transient at t0 (the "it fired" read, kept from R34 but
//     quieter — the approach now carries the threat);
//   * a descending whistle that only becomes audible in the last stretch
//     before the crossing and SWELLS as it closes — pitch tied to remaining
//     flight, loudness to proximity;
//   * a hard cut at the crossing (hit or miss) — the silence is the "it
//     arrived" beat; a hit is immediately covered by the death explosion.
// Battery rounds (the R36 killers) get a DEEPER voice: a gritty falling-shell
// saw roar instead of the airy whistle, so ground fire is audibly a different
// threat from an air train.
// Per-voice peaks are kept small (<=0.2) because trains stack 4-8 voices;
// the master limiter (engine.js) catches coincident swells. Verified offline:
// judging/R37/incoming-fire/render_check.mjs (peak/RMS/no-clip + descending-
// pitch read via __renderIncomingForTest below).

// One live voice per airborne round, keyed by the caller's id so a retired
// round (hit / pass / respawn clearShots) can cut exactly its own voice.
const _incoming = new Map();
// Air voices are capped: a full train plus strays can put ~8 rounds in the
// air, and voice 9 adds mud, not information. Battery voices bypass the cap
// (the likeliest killer must never be the one silenced).
const MAX_AIR_VOICES = 6;

// Builds the voice into any context (live or Offline — the offline render
// test runs THIS code, not a copy). `out` is the destination, `noise` a
// (seconds)=>AudioBuffer for `c`. Returns the gain nodes + sources so the
// live path can cut early.
function incomingVoiceGraph(c, out, t0, { battery = false, crossS = 1.0 } = {}, noise) {
  const tCross = t0 + crossS;
  const cutEnd = tCross + 0.06;
  const sources = [];
  const gains = [];

  // 1) LAUNCH TRANSIENT at t0.
  if (battery) {
    // The shell leaving the ground gun: a low thump + lowpassed chuff.
    const thump = c.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(150, t0);
    thump.frequency.exponentialRampToValueAtTime(58, t0 + 0.14);
    const tg = c.createGain();
    env(tg, t0, 0.002, 0.22, 0.0001, t0 + 0.16);
    thump.connect(tg).connect(out);
    thump.start(t0);
    thump.stop(t0 + 0.18);
    sources.push(thump);
    gains.push(tg);
  } else {
    // Soft "it fired" tick — quieter than R34's blip; the swell is the cue.
    const blip = c.createOscillator();
    blip.type = 'triangle';
    blip.frequency.setValueAtTime(950, t0);
    blip.frequency.exponentialRampToValueAtTime(520, t0 + 0.07);
    const bg = c.createGain();
    env(bg, t0, 0.004, 0.05, 0.0001, t0 + 0.09);
    blip.connect(bg).connect(out);
    blip.start(t0);
    blip.stop(t0 + 0.11);
    sources.push(blip);
    gains.push(bg);
  }

  // 2) THE APPROACH. Audible window: battery rounds scream their whole short
  // flight; air rounds only for the last ~1.5 s (an 8-round train with 5 s
  // flights whistling end-to-end is a siren wall, not a threat cue).
  const tA = battery ? t0 : Math.max(t0, tCross - 1.5);
  const swell = (g, peak) => {
    g.gain.setValueAtTime(0.0001, tA);
    g.gain.exponentialRampToValueAtTime(peak, tCross);
    g.gain.exponentialRampToValueAtTime(0.0001, cutEnd); // the arrival cut
  };

  if (battery) {
    // Falling-shell roar: gritty saw diving an octave and a half.
    const saw = c.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(540, tA);
    saw.frequency.exponentialRampToValueAtTime(140, tCross);
    const sShape = shaper(c, 0.5);
    const sg = c.createGain();
    swell(sg, 0.2);
    saw.connect(sShape).connect(sg).connect(out);
    saw.start(tA);
    saw.stop(cutEnd + 0.03);
    sources.push(saw);
    gains.push(sg);

    const { src, filter } = noiseVoice(c, noise(0.6), 'lowpass', 2000, 600, tCross);
    const ng = c.createGain();
    swell(ng, 0.09);
    filter.connect(ng).connect(out);
    src.start(tA);
    src.stop(cutEnd + 0.03);
    sources.push(src);
    gains.push(ng);
  } else {
    // Air round: a two-osc detuned whistle (the chorus keeps a train from
    // phasing into one tone) + an air-rip noise band, all diving together.
    for (const det of [1.0, 1.013]) {
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1650 * det, tA);
      osc.frequency.exponentialRampToValueAtTime(620 * det, tCross);
      const g = c.createGain();
      swell(g, 0.085);
      osc.connect(g).connect(out);
      osc.start(tA);
      osc.stop(cutEnd + 0.03);
      sources.push(osc);
      gains.push(g);
    }
    const { src, filter } = noiseVoice(c, noise(0.5), 'bandpass', 2600, 950, tCross);
    filter.Q.value = 1.2;
    const ng = c.createGain();
    swell(ng, 0.05);
    filter.connect(ng).connect(out);
    src.start(tA);
    src.stop(cutEnd + 0.03);
    sources.push(src);
    gains.push(ng);
  }
  return { sources, gains, cutEnd };
}

export function playEnemyFire({ pan = 0, battery = false, crossS = 1.0, id = null } = {}) {
  const c = ctx();
  if (!c) return;
  if (!battery) {
    let air = 0;
    for (const v of _incoming.values()) if (!v.battery) air += 1;
    if (air >= MAX_AIR_VOICES) return;
  }
  const t = now();
  const dst = master();
  const panner = c.createStereoPanner ? c.createStereoPanner() : null;
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    panner.connect(dst);
  }
  const out = panner || dst;
  const voice = incomingVoiceGraph(c, out, t, { battery, crossS }, noiseBuffer);
  voice.battery = battery;
  if (id !== null) {
    _incoming.set(id, voice);
    // Self-clean when the scheduled arc ends uninterrupted.
    const last = voice.sources[voice.sources.length - 1];
    last.onended = () => {
      if (_incoming.get(id) === voice) _incoming.delete(id);
    };
  }
}

// The round is gone (hit the player, passed the plane, or the respawn cleared
// the sky): silence its voice in ~15 ms. Already-ended nodes throw on stop();
// that is fine and swallowed.
export function cutEnemyFire(id) {
  const voice = _incoming.get(id);
  if (!voice) return;
  _incoming.delete(id);
  const c = ctx();
  if (!c) return;
  const t = c.currentTime;
  for (const g of voice.gains) {
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.012);
    } catch { /* node already collected */ }
  }
  for (const s of voice.sources) {
    try { s.stop(t + 0.08); } catch { /* already stopped */ }
  }
}

// Offline-render hook for the verification script ONLY (mirrors
// music.js's __renderLoopForTest): renders a scenario through the SAME
// incomingVoiceGraph code plus a mirror of engine.js's master chain (0.7 gain
// + the same limiter), so the no-clip check covers what actually ships.
// Scenarios: 'battery' | 'air' | 'train' (8-round spaced train) |
// 'stack' (train + battery coinciding — the worst case the cap allows).
export async function __renderIncomingForTest(scenario = 'battery') {
  if (typeof OfflineAudioContext === 'undefined') return null;
  const dur = 4.5;
  const c = new OfflineAudioContext(2, Math.ceil(44100 * dur), 44100);
  const m = c.createGain();
  m.gain.value = 0.7;
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 4;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  m.connect(limiter);
  limiter.connect(c.destination);
  const noise = (seconds) => {
    const len = Math.max(1, Math.floor(c.sampleRate * seconds));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  };
  const spawn = (t0, opts) => incomingVoiceGraph(c, m, t0, opts, noise);
  if (scenario === 'battery') spawn(0.2, { battery: true, crossS: 0.8 });
  else if (scenario === 'air') spawn(0.2, { crossS: 2.3 });
  else {
    for (let i = 0; i < 8; i++) spawn(0.2 + i * 0.13, { crossS: 2.3 });
    if (scenario === 'stack') spawn(1.7, { battery: true, crossS: 0.8 });
  }
  return c.startRendering();
}

const HANDLERS = {
  vulcan: (opts) => playVulcan(opts.side ?? 1),
  enemyFire: (opts) => playEnemyFire(opts),
  enemyFireCut: (opts) => cutEnemyFire(opts.id),
  missileLaunch: playMissileLaunch,
  lockOn: playLockOn,
  explosion: (opts) => playExplosion(!!opts.big),
  enemyFlyPast: (opts) => playEnemyFlyPast(opts.panFrom ?? -1, opts.panTo ?? 1),
  playerDeath: playPlayerDeath,
  respawnReady: playRespawnReady,
  tallyTick: playTallyTick,
  menuStart: playMenuStart,
};

export function play(name, opts = {}) {
  const fn = HANDLERS[name];
  if (!fn) return; // unknown event name: silent no-op, never throws
  fn(opts);
}

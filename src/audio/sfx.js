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

const HANDLERS = {
  vulcan: (opts) => playVulcan(opts.side ?? 1),
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

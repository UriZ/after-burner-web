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
  const base = side > 0 ? 1100 : 1030;

  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(base * 0.45, t + 0.035);
  const g = c.createGain();
  env(g, t, 0.001, 0.22, 0.0001, t + 0.04);
  osc.connect(g).connect(master());
  osc.start(t);
  osc.stop(t + 0.05);

  const buf = noiseBuffer(0.05);
  const snap = c.createBufferSource();
  snap.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2500;
  const ng = c.createGain();
  env(ng, t, 0.001, 0.15, 0.0001, t + 0.02);
  snap.connect(hp).connect(ng).connect(master());
  snap.start(t);
  snap.stop(t + 0.02);
}

// --- Missile launch: whoosh + low thump -------------------------------------
export function playMissileLaunch() {
  const c = ctx();
  if (!c) return;
  const t = now();
  const dur = 0.45;

  const { src, filter } = noiseVoice(c, noiseBuffer(0.5), 'bandpass', 2200, 400, t + dur);
  filter.Q.value = 0.9;
  const g = c.createGain();
  env(g, t, 0.02, 0.35, 0.0001, t + dur);
  src.connect(g).connect(master());
  src.start(t);
  src.stop(t + dur + 0.02);

  const thump = c.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(110, t);
  thump.frequency.exponentialRampToValueAtTime(45, t + 0.15);
  const tg = c.createGain();
  env(tg, t, 0.001, 0.4, 0.0001, t + 0.18);
  thump.connect(tg).connect(master());
  thump.start(t);
  thump.stop(t + 0.2);
}

// --- Lock-on acquisition: short upward chirp --------------------------------
export function playLockOn() {
  const c = ctx();
  if (!c) return;
  const t = now();
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(650, t);
  osc.frequency.exponentialRampToValueAtTime(1500, t + 0.08);
  const g = c.createGain();
  env(g, t, 0.005, 0.2, 0.0001, t + 0.1);
  osc.connect(g).connect(master());
  osc.start(t);
  osc.stop(t + 0.11);
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

  const { src, filter } = noiseVoice(c, noiseBuffer(1.2), 'lowpass', 4500, 250, t + dur);
  const g = c.createGain();
  env(g, t, 0.005, big ? 0.55 : 0.4, 0.0001, t + dur);
  src.connect(g).connect(master());
  src.start(t);
  src.stop(t + dur + 0.02);

  const boom = c.createOscillator();
  boom.type = 'sine';
  const f0 = big ? 70 : 90;
  boom.frequency.setValueAtTime(f0, t);
  boom.frequency.exponentialRampToValueAtTime(f0 * 0.4, t + dur * 0.8);
  const bg = c.createGain();
  env(bg, t, 0.005, big ? 0.6 : 0.45, 0.0001, t + dur * 0.9);
  boom.connect(bg).connect(master());
  boom.start(t);
  boom.stop(t + dur);
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

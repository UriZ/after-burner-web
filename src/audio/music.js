// Original music, synthesized via paired FM oscillators (modulator ->
// carrier.frequency, classic WebAudio FM/PM technique), rendered ONCE to an
// AudioBuffer via OfflineAudioContext so steady-state playback is just a
// looping BufferSourceNode (cheap every frame thereafter).
//
// ARCHITECTURE.md D5 is binding: original composition in the Sega FM-synth
// style, NOT a transcription of any AB2 track or any other copyrighted
// melody. Everything below — the chord progression (i-VI-VII-i in A natural
// minor, a generic rock/fusion cadence, not quoted from any specific piece),
// the bass/lead rhythm patterns, and the note choices — was composed here
// algorithmically for this file; no reference audio was transcribed.
import { ctx, master, now } from './engine.js';

const BPM = 152; // uptempo, fusion-driving range
const BEAT_S = 60 / BPM;
const BAR_S = BEAT_S * 4;
const STEP_S = BAR_S / 16; // 16th-note grid

// A natural minor, root A. Extended across ~2 octaves so triadSemis() below
// can stack thirds past the 7th scale degree without special-casing wrap.
const SCALE = [0, 2, 3, 5, 7, 8, 10];
const SCALE2 = SCALE.concat(SCALE.map((s) => s + 12), SCALE.map((s) => s + 24));
const ROOT_HZ = 110; // A2, bass register

function semisToHz(root, semis) {
  return root * Math.pow(2, semis / 12);
}

// Diatonic triad built by stacking scale thirds from a scale-degree root —
// generates the same i/VI/VII triads a human voicing by ear would pick,
// without hardcoding each chord's note list separately.
function triadSemis(degree) {
  return [SCALE2[degree], SCALE2[degree + 2], SCALE2[degree + 4]];
}

// 8-bar phrase: i (Am) for 2 bars, VI (F) for 2, VII (G) for 2, i (Am) for 2 —
// scale degrees 0, 5, 6 each held two bars. A standard minor-key driving
// cadence, not borrowed from any one song.
const PHRASE_DEGREES = [0, 0, 5, 5, 6, 6, 0, 0];
const PHRASES = 5; // 5 x 8 bars @152bpm = ~63s, inside the 60-90s target
const TOTAL_BARS = PHRASES * PHRASE_DEGREES.length;

// Syncopated 16-step patterns (one bar each). Values index into a chord's
// [root, 3rd, 5th, root+12] tone list; null = rest. Deliberately NOT a
// straight arpeggio — rests create the "stutter" that reads as driving
// rather than mechanical.
const BASS_PATTERN = [0, null, 0, null, 3, null, 0, 0, null, 2, null, 0, null, 3, 0, null];
const LEAD_PATTERN = [0, null, 1, 2, null, 0, 2, null, 1, null, 2, 1, 0, null, 2, null];
const KICK_STEPS = new Set([0, 6, 8, 14]);
const HAT_STEPS = [1, 3, 5, 7, 9, 11, 13, 15];

function makeNoise(c, seconds) {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function fmNote(c, dest, { freq, start, dur, carrierType, modRatio, modIndex, gain }) {
  const carrier = c.createOscillator();
  carrier.type = carrierType;
  carrier.frequency.setValueAtTime(freq, start);
  const modulator = c.createOscillator();
  modulator.frequency.setValueAtTime(freq * modRatio, start);
  const modGain = c.createGain();
  modGain.gain.value = modIndex;
  modulator.connect(modGain).connect(carrier.frequency);
  const env = c.createGain();
  const attack = Math.min(0.015, dur * 0.3);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  carrier.connect(env).connect(dest);
  carrier.start(start);
  carrier.stop(start + dur + 0.05);
  modulator.start(start);
  modulator.stop(start + dur + 0.05);
}

function kick(c, dest, start) {
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, start);
  osc.frequency.exponentialRampToValueAtTime(48, start + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(0.9, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
  osc.connect(g).connect(dest);
  osc.start(start);
  osc.stop(start + 0.2);
}

function hat(c, dest, start, accent) {
  const src = c.createBufferSource();
  src.buffer = makeNoise(c, 0.06);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(0.22 * accent, start + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
  src.connect(hp).connect(g).connect(dest);
  src.start(start);
  src.stop(start + 0.06);
}

// Builds the full loop into an OfflineAudioContext at the real context's
// sample rate (so pitch matches exactly when the rendered buffer is later
// played through the real-time context) and resolves with the AudioBuffer.
async function buildLoop(sampleRate) {
  const length = Math.ceil(TOTAL_BARS * BAR_S * sampleRate) + sampleRate; // +1s tail for release
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OAC(2, length, sampleRate);

  const bassBus = oc.createGain();
  bassBus.gain.value = 0.5;
  bassBus.connect(oc.destination);
  const leadBus = oc.createGain();
  leadBus.gain.value = 0.35;
  leadBus.connect(oc.destination);
  const drumBus = oc.createGain();
  drumBus.gain.value = 0.6;
  drumBus.connect(oc.destination);

  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const phrase = bar % PHRASE_DEGREES.length;
    const phraseIndex = Math.floor(bar / PHRASE_DEGREES.length);
    const degree = PHRASE_DEGREES[phrase];
    const triad = triadSemis(degree);
    const toneSemis = [triad[0], triad[1], triad[2], triad[0] + 12];
    const barStart = bar * BAR_S;

    // Every other phrase, the lead jumps up an octave on the back half of
    // the phrase — a fixed (not random) intensity build across repeats so
    // the loop doesn't feel static on a second pass, still fully
    // deterministic.
    const leadOctaveUp = phraseIndex % 2 === 1 && phrase >= 4;

    for (let step = 0; step < 16; step++) {
      const t = barStart + step * STEP_S;

      const bi = BASS_PATTERN[step];
      if (bi !== null) {
        fmNote(oc, bassBus, {
          freq: semisToHz(ROOT_HZ, toneSemis[bi]),
          start: t,
          dur: STEP_S * 1.1,
          carrierType: 'sawtooth',
          modRatio: 1,
          modIndex: 18,
          gain: 0.35,
        });
      }

      const li = LEAD_PATTERN[step];
      if (li !== null) {
        const octaveShift = leadOctaveUp ? 24 : 12;
        fmNote(oc, leadBus, {
          freq: semisToHz(ROOT_HZ, toneSemis[li] + octaveShift),
          start: t,
          dur: STEP_S * 1.6,
          carrierType: 'square',
          modRatio: 2,
          modIndex: 90,
          gain: 0.22,
        });
      }

      if (KICK_STEPS.has(step)) kick(oc, drumBus, t);
      if (HAT_STEPS.includes(step)) hat(oc, drumBus, t, step === 15 ? 1.4 : 1);
    }
  }

  return oc.startRendering();
}

let musicBufferPromise = null;
let musicSource = null;
let currentState = 'off';

function renderMusicBuffer() {
  const c = ctx();
  if (!c) return Promise.resolve(null);
  if (!musicBufferPromise) {
    musicBufferPromise = buildLoop(c.sampleRate).catch(() => null);
  }
  return musicBufferPromise;
}

function stopLoop() {
  if (musicSource) {
    try {
      musicSource.stop();
    } catch {
      /* already stopped */
    }
    musicSource = null;
  }
}

function startLoop(buffer) {
  const c = ctx();
  if (!c || !buffer) return;
  stopLoop();
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const g = c.createGain();
  g.gain.value = 0.5;
  src.connect(g).connect(master());
  src.start();
  musicSource = src;
}

// Short title-screen sting: a quick rising FM figure over a held low note,
// synthesized live (no offline render — short enough that the cost doesn't
// matter, and it needs to be audible immediately on title entry).
export function playTitleSting() {
  const c = ctx();
  if (!c) return;
  const t = now();
  const holdOsc = c.createOscillator();
  holdOsc.type = 'sawtooth';
  holdOsc.frequency.value = ROOT_HZ;
  const holdGain = c.createGain();
  holdGain.gain.setValueAtTime(0.0001, t);
  holdGain.gain.exponentialRampToValueAtTime(0.3, t + 0.05);
  holdGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  holdOsc.connect(holdGain).connect(master());
  holdOsc.start(t);
  holdOsc.stop(t + 1.45);

  const run = [0, 3, 7, 12, 15];
  run.forEach((semi, i) => {
    const st = t + i * 0.09;
    fmNote(c, master(), {
      freq: semisToHz(ROOT_HZ * 2, semi),
      start: st,
      dur: 0.3,
      carrierType: 'square',
      modRatio: 2,
      modIndex: 100,
      gain: 0.2,
    });
  });
}

// `state`: 'flight' | 'title' | 'off'. 'flight' renders (once, cached) and
// loops the FM track; 'title' fires the sting once (and pre-warms the
// flight render in the background so there's no stall when flight starts);
// 'off' stops whatever is playing.
export function setState(state) {
  const c = ctx();
  if (!c) {
    currentState = state;
    return; // muted/headless: track the requested state, play nothing
  }
  if (state === currentState) return;
  currentState = state;
  stopLoop();

  if (state === 'flight') {
    renderMusicBuffer().then((buf) => {
      if (currentState !== 'flight') return; // state moved on while rendering
      startLoop(buf);
    });
  } else if (state === 'title') {
    playTitleSting();
    renderMusicBuffer(); // pre-warm; not played yet
  }
}

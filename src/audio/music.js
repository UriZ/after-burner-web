// Original flight music, synthesized via paired FM oscillators (modulator ->
// carrier.frequency, classic WebAudio FM/PM technique), rendered ONCE to an
// AudioBuffer via OfflineAudioContext so steady-state playback is just a
// looping BufferSourceNode (cheap every frame thereafter).
//
// ARCHITECTURE.md D5 / CLAUDE.md are binding: ORIGINAL composition in the Sega
// FM-synth style, NOT a transcription of any After Burner track or any other
// copyrighted melody. Everything below — the Andalusian-cadence chord
// progression (i-VII-VI-V in A minor: Am-G-F-E, the descending A-G-F-E root
// line that is one of the most common progressions in all of rock/flamenco/
// game music, not quoted from any specific piece), the lead melody, the
// bass/drum patterns and every note choice — was composed here for this file;
// no reference audio was transcribed or sampled.
//
// The goal for this track is the arcade "driving FM-rock" feel: a relentless
// hi-hat + backbeat-snare groove, a pumping low bass, bright FM brass/lead
// stabs on the offbeats, and a singable high lead with a brass-like bright
// attack and a touch of vibrato.
import { ctx, master, now } from './engine.js';

const BPM = 160; // fast, urgent — arcade flight-rock range
const BEAT_S = 60 / BPM;
const BAR_S = BEAT_S * 4;
const STEP_S = BAR_S / 16; // 16th-note grid

const ROOT_HZ = 110; // A2 — the key centre (A minor)

function semisToHz(root, semis) {
  return root * Math.pow(2, semis / 12);
}

// --- Harmony -------------------------------------------------------------
// Triad qualities as semitone intervals from the chord root.
const MIN = [0, 3, 7];
const MAJ = [0, 4, 7];

// Four-bar Andalusian cadence i-VII-VI-V (Am - G - F - E), roots walking
// down A -> G -> F -> E. The V is MAJOR (E major, carrying the G# leading
// tone) so it pulls hard back to Am — the tension/release that gives the
// loop its forward drive. Repeated to make an 8-bar phrase.
const CHORDS = [
  { root: 0, triad: MIN }, // Am  (i)
  { root: -2, triad: MAJ }, // G   (VII)
  { root: -4, triad: MAJ }, // F   (VI)
  { root: -5, triad: MAJ }, // E   (V, dominant — has G#)
];
const PROGRESSION = [0, 1, 2, 3, 0, 1, 2, 3]; // 8 bars
const PHRASES = 5; // 5 x 8 bars @160bpm = 60s loop
const TOTAL_BARS = PHRASES * PROGRESSION.length;

// --- Lead melody ---------------------------------------------------------
// A composed 8-bar line, one entry per note as [startStep, semisAboveA2,
// durationInSteps]. Sits in the E4..F5 register (semis ~19..32 above A2) so
// it sings above the bass and stabs. Notes are mostly long (half/quarter)
// so the lead reads as a tune, not an arpeggio — a descending hook on the
// Am/F bars, rising tension on the G/E bars, and a climb-and-hold turnaround
// on the final E bar that spills back into the loop top.
const MELODY = [
  // bar 0 — Am: E5 D5 C5 A4 (descending hook)
  [[0, 31, 6], [6, 29, 2], [8, 27, 4], [12, 24, 4]],
  // bar 1 — G: D5 B4 D5 E5 (rising)
  [[0, 29, 4], [4, 26, 4], [8, 29, 4], [12, 31, 4]],
  // bar 2 — F: F5 E5 C5 A4 (descending hook, higher peak)
  [[0, 32, 6], [6, 31, 2], [8, 27, 4], [12, 24, 4]],
  // bar 3 — E: B4 G# E4 G# (leans on the G# leading tone)
  [[0, 26, 4], [4, 23, 4], [8, 19, 4], [12, 23, 4]],
  // bar 4 — Am: repeat of bar 0
  [[0, 31, 6], [6, 29, 2], [8, 27, 4], [12, 24, 4]],
  // bar 5 — G: repeat of bar 1
  [[0, 29, 4], [4, 26, 4], [8, 29, 4], [12, 31, 4]],
  // bar 6 — F: repeat of bar 2
  [[0, 32, 6], [6, 31, 2], [8, 27, 4], [12, 24, 4]],
  // bar 7 — E: G# A B E5 (climb and hold into the loop)
  [[0, 23, 2], [2, 24, 2], [4, 26, 4], [8, 31, 8]],
];

// --- Bass ----------------------------------------------------------------
// Indices into each bar's [root, octave, fifth] tone list; null = rest.
// A pumping 8th-note pulse (root on the beat, octave on the "and") with a
// 16th fill into the next bar — propulsive, staccato.
const BASS_PATTERN = [0, null, 1, null, 0, null, 1, null, 0, null, 1, null, 0, 1, 2, 1];

// --- Drums ---------------------------------------------------------------
const KICK_STEPS = new Set([0, 6, 8, 14]); // rock kick: 1, &-of-2, 3, pickup
const SNARE_STEPS = new Set([4, 12]); // backbeat on 2 & 4 — the drive
// Closed hats on all 16ths for relentless speed; offbeat 8ths accented.
const HAT_ACCENT = new Set([2, 6, 10, 14]);

function makeNoise(c, seconds) {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// Paired-oscillator FM voice. Enhancements over a plain FM note:
//   - modStart/modEnd: the modulation index envelopes from bright to mellow
//     over modDecay, which is what gives FM brass/lead its characteristic
//     bright-attack-then-settle timbre.
//   - vibrato: a slow pitch LFO for a singing sustained lead.
//   - pan: stereo placement for width.
function fmNote(c, dest, opts) {
  const {
    freq,
    start,
    dur,
    carrierType = 'square',
    modRatio = 2,
    modIndex = 50,
    modEnd = modIndex,
    modDecay = dur * 0.5,
    gain = 0.2,
    attack = Math.min(0.015, dur * 0.3),
    vibratoHz = 0,
    vibratoDepth = 0,
    pan = 0,
  } = opts;

  const carrier = c.createOscillator();
  carrier.type = carrierType;
  carrier.frequency.setValueAtTime(freq, start);

  const modulator = c.createOscillator();
  modulator.frequency.setValueAtTime(freq * modRatio, start);
  const modGain = c.createGain();
  modGain.gain.setValueAtTime(Math.max(0.0001, modIndex), start);
  if (modEnd !== modIndex) {
    modGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, modEnd), start + Math.max(0.01, modDecay));
  }
  modulator.connect(modGain).connect(carrier.frequency);

  let vibOsc = null;
  if (vibratoHz > 0 && vibratoDepth > 0) {
    vibOsc = c.createOscillator();
    vibOsc.type = 'sine';
    vibOsc.frequency.value = vibratoHz;
    const vibGain = c.createGain();
    vibGain.gain.value = vibratoDepth;
    vibOsc.connect(vibGain).connect(carrier.frequency);
  }

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  let node = carrier.connect(env);
  if (pan !== 0 && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    node = env.connect(p);
  }
  node.connect(dest);

  carrier.start(start);
  carrier.stop(start + dur + 0.05);
  modulator.start(start);
  modulator.stop(start + dur + 0.05);
  if (vibOsc) {
    vibOsc.start(start);
    vibOsc.stop(start + dur + 0.05);
  }
}

function kick(c, dest, start, gain = 0.95) {
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(155, start);
  osc.frequency.exponentialRampToValueAtTime(46, start + 0.11);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
  osc.connect(g).connect(dest);
  osc.start(start);
  osc.stop(start + 0.22);
}

// Noise band for the snap + a short tonal body for the weight — a punchy
// backbeat snare that carries the rock groove.
function snare(c, dest, start, gain = 0.6) {
  const src = c.createBufferSource();
  src.buffer = makeNoise(c, 0.2);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1900;
  bp.Q.value = 0.7;
  const ng = c.createGain();
  ng.gain.setValueAtTime(gain, start);
  ng.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
  src.connect(bp).connect(ng).connect(dest);
  src.start(start);
  src.stop(start + 0.2);

  const body = c.createOscillator();
  body.type = 'triangle';
  body.frequency.setValueAtTime(185, start);
  body.frequency.exponentialRampToValueAtTime(120, start + 0.08);
  const bg = c.createGain();
  bg.gain.setValueAtTime(gain * 0.5, start);
  bg.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
  body.connect(bg).connect(dest);
  body.start(start);
  body.stop(start + 0.12);
}

function hat(c, dest, start, accent, open = false) {
  const dur = open ? 0.18 : 0.05;
  const src = c.createBufferSource();
  src.buffer = makeNoise(c, dur + 0.02);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7800;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(0.2 * accent, start + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(hp).connect(g).connect(dest);
  src.start(start);
  src.stop(start + dur + 0.02);
}

// Builds the full loop into an OfflineAudioContext at the real context's
// sample rate (so pitch matches exactly when the rendered buffer is later
// played through the real-time context) and resolves with the AudioBuffer.
async function buildLoop(sampleRate) {
  const length = Math.ceil(TOTAL_BARS * BAR_S * sampleRate) + sampleRate; // +1s tail
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OAC(2, length, sampleRate);

  // Glue compressor across the whole mix for punch and to tame the peaks of
  // a dense arrangement (kept gentle so it adds drive, not pumping).
  let sink = oc.destination;
  if (oc.createDynamicsCompressor) {
    const comp = oc.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 24;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.14;
    comp.connect(oc.destination);
    sink = comp;
  }

  const bassBus = oc.createGain();
  bassBus.gain.value = 0.6;
  // Warmth: roll off the FM buzz so the bass stays fat, not fizzy.
  const bassLP = oc.createBiquadFilter();
  bassLP.type = 'lowpass';
  bassLP.frequency.value = 2600;
  bassBus.connect(bassLP).connect(sink);

  const padBus = oc.createGain();
  padBus.gain.value = 0.13;
  padBus.connect(sink);

  const stabBus = oc.createGain();
  stabBus.gain.value = 0.28;
  stabBus.connect(sink);

  const leadBus = oc.createGain();
  leadBus.gain.value = 0.34;
  leadBus.connect(sink);

  const drumBus = oc.createGain();
  drumBus.gain.value = 0.62;
  drumBus.connect(sink);

  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const phraseBar = bar % PROGRESSION.length;
    const phraseIndex = Math.floor(bar / PROGRESSION.length);
    const chord = CHORDS[PROGRESSION[phraseBar]];
    const root = chord.root;
    const triad = chord.triad;
    const barStart = bar * BAR_S;

    // [root, octave, fifth] in the bass register.
    const bassTones = [root, root + 12, root + 7];

    // Every other phrase, lift the lead an octave on the back half — a fixed
    // (deterministic) intensity build so repeats don't feel static.
    const leadOctaveUp = phraseIndex % 2 === 1 && phraseBar >= 4;
    const leadShift = leadOctaveUp ? 12 : 0;

    // --- Pad: sustain the triad under everything (soft, slow attack).
    for (const iv of triad) {
      fmNote(oc, padBus, {
        freq: semisToHz(ROOT_HZ, root + 12 + iv),
        start: barStart,
        dur: BAR_S * 0.98,
        carrierType: 'sawtooth',
        modRatio: 1,
        modIndex: 3,
        gain: 0.2,
        attack: 0.08,
      });
    }

    for (let step = 0; step < 16; step++) {
      const t = barStart + step * STEP_S;

      // --- Bass: pumping staccato pulse.
      const bi = BASS_PATTERN[step];
      if (bi !== null) {
        fmNote(oc, bassBus, {
          freq: semisToHz(ROOT_HZ, bassTones[bi]),
          start: t,
          dur: STEP_S * 0.92,
          carrierType: 'sawtooth',
          modRatio: 1,
          modIndex: 10,
          modEnd: 4,
          modDecay: STEP_S * 0.5,
          gain: 0.4,
          pan: -0.05,
        });
      }

      // --- Stab: bright FM brass chord on the backbeat (with the snare).
      if (SNARE_STEPS.has(step)) {
        triad.forEach((iv, ci) => {
          fmNote(oc, stabBus, {
            freq: semisToHz(ROOT_HZ, root + 12 + iv),
            start: t,
            dur: STEP_S * 2.4,
            carrierType: 'square',
            modRatio: 1,
            modIndex: 60,
            modEnd: 8,
            modDecay: STEP_S * 1.2,
            gain: 0.17,
            attack: 0.006,
            pan: (ci - 1) * 0.35, // spread the triad across the stereo field
          });
        });
      }

      // --- Drums.
      if (KICK_STEPS.has(step)) kick(oc, drumBus, t, step === 0 ? 1.0 : 0.85);
      if (SNARE_STEPS.has(step)) snare(oc, drumBus, t, 0.6);
      // Closed hats every 16th (relentless drive); open hat on the final &.
      hat(oc, drumBus, t, HAT_ACCENT.has(step) ? 1.2 : 0.55, step === 15);
    }

    // --- Lead melody.
    const line = MELODY[phraseBar];
    for (const [stStep, semi, durSteps] of line) {
      const t = barStart + stStep * STEP_S;
      const dur = durSteps * STEP_S;
      const sustained = durSteps >= 3;
      fmNote(oc, leadBus, {
        freq: semisToHz(ROOT_HZ, semi + leadShift),
        start: t,
        dur: dur * 0.96,
        carrierType: 'square',
        modRatio: 2,
        modIndex: 70,
        modEnd: 22, // bright attack settling to a mellower sustain (FM brass)
        modDecay: Math.min(0.18, dur * 0.4),
        gain: 0.24,
        attack: 0.012,
        vibratoHz: sustained ? 5.5 : 0,
        vibratoDepth: sustained ? semisToHz(ROOT_HZ, semi) * 0.006 : 0,
        pan: 0.06,
      });
    }

    // --- Turnaround fill: a 16th snare roll on the last bar of each phrase.
    if (phraseBar === PROGRESSION.length - 1) {
      for (let s = 12; s < 16; s++) {
        snare(oc, drumBus, barStart + s * STEP_S, 0.28 + (s - 12) * 0.06);
      }
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

// Test-only: render the loop and hand back the AudioBuffer so an offline
// verifier can inspect duration/peak/RMS/clipping. Returns the same cached
// buffer the game plays; resolves null when muted/headless. Not used in play.
export function __renderLoopForTest() {
  return renderMusicBuffer();
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

// Short title-screen sting: a fanfare rising FM figure over a held low fifth,
// synthesized live (short enough that the cost doesn't matter, and it needs
// to be audible immediately on title entry). Uses the same A-minor material
// as the flight loop so the title and the song feel like one piece.
export function playTitleSting() {
  const c = ctx();
  if (!c) return;
  const t = now();

  // Held low power-fifth bed (A + E) for weight under the fanfare.
  [0, 7].forEach((semi) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = semisToHz(ROOT_HZ, semi);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    osc.connect(g).connect(master());
    osc.start(t);
    osc.stop(t + 1.55);
  });

  // Rising fanfare run: A C E A C (Am arpeggio up), bright FM brass.
  const run = [12, 15, 19, 24, 27];
  run.forEach((semi, i) => {
    const st = t + i * 0.085;
    fmNote(c, master(), {
      freq: semisToHz(ROOT_HZ, semi),
      start: st,
      dur: 0.34,
      carrierType: 'square',
      modRatio: 2,
      modIndex: 85,
      modEnd: 25,
      modDecay: 0.1,
      gain: 0.2,
      attack: 0.008,
    });
  });

  // Punctuating kick + snare so the title hit lands like the song's groove.
  kick(c, master(), t, 0.7);
  snare(c, master(), t + 0.34 * 2, 0.4);
}

// `state`: 'flight' | 'title' | 'off'. 'flight' renders (once, cached) and
// loops the FM track; 'title' fires the sting once (and pre-warms the flight
// render in the background so there's no stall when flight starts); 'off'
// stops whatever is playing.
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

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
import { ctx, master, now, onUnlock } from './engine.js';

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
  // bar 0 — Am: E5 D5 C5 A4 B4 C5 D5— (descend, answer back up — the hook)
  [[0, 31, 3], [3, 29, 1], [4, 27, 2], [6, 24, 2], [8, 26, 2], [10, 27, 2], [12, 29, 4]],
  // bar 1 — G: G5 E5 D5— E5 D5 B4— (lift to the G5 peak)
  [[0, 34, 2], [2, 31, 2], [4, 29, 4], [8, 31, 2], [10, 29, 2], [12, 26, 4]],
  // bar 2 — F: F5 E5 D5 C5 A4 C5 D5— (same hook shape, higher — the answer)
  [[0, 32, 3], [3, 31, 1], [4, 29, 2], [6, 27, 2], [8, 24, 2], [10, 27, 2], [12, 29, 4]],
  // bar 3 — E: B4 G#4 E5— G#4 B4 E4— (lean on the G# leading tone, resolve)
  [[0, 26, 2], [2, 23, 2], [4, 31, 4], [8, 23, 2], [10, 26, 2], [12, 19, 4]],
  // bar 4 — Am: repeat of bar 0
  [[0, 31, 3], [3, 29, 1], [4, 27, 2], [6, 24, 2], [8, 26, 2], [10, 27, 2], [12, 29, 4]],
  // bar 5 — G: repeat of bar 1
  [[0, 34, 2], [2, 31, 2], [4, 29, 4], [8, 31, 2], [10, 29, 2], [12, 26, 4]],
  // bar 6 — F: repeat of bar 2
  [[0, 32, 3], [3, 31, 1], [4, 29, 2], [6, 27, 2], [8, 24, 2], [10, 27, 2], [12, 29, 4]],
  // bar 7 — E: E4 G#4 B4 E5 G#5 E5——— (climb the E chord to the G#5 peak,
  // then hold E5 — the 5th of Am — so it spills straight into the loop top)
  [[0, 19, 1], [1, 23, 1], [2, 26, 2], [4, 31, 2], [6, 35, 2], [8, 31, 8]],
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

// --- Rhythm guitar -------------------------------------------------------
// A driving palm-muted power-chord (root + fifth) chug. This is the single
// biggest "rock energy" layer: a gritty, staccato 8th-note pulse summed into
// one amp-style waveshaper, like a down-picked rhythm guitar under the groove.
// `gain` per step; a slightly syncopated accent map gives it forward push
// rather than a flat machine-gun of equal hits.
const RHYTHM_STEPS = {
  0: 0.9, 2: 0.6, 4: 0.75, 6: 0.6, 7: 0.42, // push on the & of 2
  8: 0.9, 10: 0.6, 12: 0.75, 14: 0.6, 15: 0.5, // pickup 16th into the bar
};

// Soft-clip transfer curve for the rhythm-guitar amp (summed bus distortion).
function makeShaperCurve(amount) {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = amount * 60;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

// Bright cymbal crash at the top of each 8-bar phrase — marks the loop point
// and gives the groove a lift on the downbeat.
function crash(c, dest, start, gain = 0.5) {
  const dur = 0.6;
  const src = c.createBufferSource();
  src.buffer = makeNoise(c, dur + 0.05);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(hp).connect(g).connect(dest);
  src.start(start);
  src.stop(start + dur + 0.05);
}

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

// --- Shared composition engine ---------------------------------------------
// R37: the flight music used to be rendered ONCE into a ~60 s AudioBuffer via
// OfflineAudioContext and looped. MEASURED (R35's own render-result.txt:
// renderMs 200012-256595 per variant; re-confirmed live in
// judging/R37/start-time/ where the render never resolved within 6 minutes
// and the stage-1 music therefore never played): offline-rendering this
// ~16k-node FM graph takes 3-4+ MINUTES at ~100% of a core on this machine,
// repeated per variant at stage boundaries and on every page reload. The
// scaling probes in judging/R37/start-time/ show the crawl is intrinsic to
// thousands-of-FM-notes offline graphs (trivial graphs render ~1000x realtime)
// and is not fixable by suspend()/resume() scheduling tricks.
//
// The runtime path therefore now SCHEDULES the same composition LIVE on the
// real-time context, one bar at a time, ~2.5 s ahead: music starts the moment
// flight does, through the SAME instrument functions and the SAME
// bus/compressor chain, so it is the same track note-for-note. buildLoop
// (offline) remains ONLY for the audio-verification tooling
// (__renderLoopForTest); it is no longer on any play path.

// Per-variant timing/key/timbre SHADOW the module defaults so one routine
// plays every stage theme -- the same composition, transposed and re-tempo'd
// (how arcade soundtracks did per-stage variants). Variant 0 reproduces the
// exact owner-approved A-minor / 160 BPM track note-for-note.
function variantParams(variant) {
  const barS = (60 / variant.bpm) * 4;
  return {
    barS,
    stepS: barS / 16,
    rootHz: variant.rootHz,
    leadMod: variant.leadMod[0],
    leadModEnd: variant.leadMod[1],
  };
}

// The full mix chain (per-instrument buses -> glue compressor -> brickwall
// limiter -> dest) on ANY BaseAudioContext -- shared by the live scheduler and
// the offline test render, so both paths are the same signal path.
function makeBuses(c, dest) {
  // Glue compressor across the whole mix for punch and to tame the peaks of
  // a dense arrangement (kept gentle so it adds drive, not pumping).
  let sink = dest;
  if (c.createDynamicsCompressor) {
    // Final brickwall limiter so the rendered buffer never exceeds ~0.8 even
    // when the rhythm guitar + lead double + crash all land on a downbeat
    // (R34 added energy and the old gentle glue comp let peaks reach ~1.18).
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 1;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    limiter.connect(dest);

    // Glue compressor across the whole mix for punch and to tame the peaks of
    // a dense arrangement (kept gentle so it adds drive, not pumping).
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 24;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.14;
    comp.connect(limiter);
    sink = comp;
  }

  const bassBus = c.createGain();
  bassBus.gain.value = 0.6;
  // Warmth: roll off the FM buzz so the bass stays fat, not fizzy.
  const bassLP = c.createBiquadFilter();
  bassLP.type = 'lowpass';
  bassLP.frequency.value = 2600;
  bassBus.connect(bassLP).connect(sink);

  const padBus = c.createGain();
  padBus.gain.value = 0.1; // softened to leave room for the rhythm guitar
  padBus.connect(sink);

  // Rhythm-guitar bus: gritty power chords summed into one amp-style
  // waveshaper (so overlapping chords distort together like a real amp), then
  // a lowpass to tame the fizz into a fat crunch.
  const rhythmBus = c.createGain();
  rhythmBus.gain.value = 0.26;
  let rhythmTail = rhythmBus;
  if (c.createWaveShaper) {
    const amp = c.createWaveShaper();
    amp.curve = makeShaperCurve(0.6);
    amp.oversample = '2x';
    rhythmBus.connect(amp);
    rhythmTail = amp;
  }
  const rhythmLP = c.createBiquadFilter();
  rhythmLP.type = 'lowpass';
  rhythmLP.frequency.value = 3400;
  rhythmTail.connect(rhythmLP).connect(sink);

  const stabBus = c.createGain();
  stabBus.gain.value = 0.28;
  stabBus.connect(sink);

  const leadBus = c.createGain();
  leadBus.gain.value = 0.38; // lead pushed forward — it carries the hook
  leadBus.connect(sink);

  const drumBus = c.createGain();
  drumBus.gain.value = 0.62;
  drumBus.connect(sink);


  return { bassBus, padBus, rhythmBus, stabBus, leadBus, drumBus };
}

// One bar of the composition, scheduled onto context `c` through buses `B`
// with variant params `P`, starting at absolute context time `barStart`.
// `loopBar` indexes the authored 40-bar sequence (PHRASES x PROGRESSION);
// callers wrap, so the live scheduler reproduces exactly the sequence the
// rendered loop played, seam included.
function scheduleBar(c, B, P, loopBar, barStart) {
  const phraseBar = loopBar % PROGRESSION.length;
  const phraseIndex = Math.floor(loopBar / PROGRESSION.length);
  const chord = CHORDS[PROGRESSION[phraseBar]];
  const root = chord.root;
  const triad = chord.triad;
  
  // [root, octave, fifth] in the bass register.
  const bassTones = [root, root + 12, root + 7];

  // Every other phrase, lift the lead an octave on the back half — a fixed
  // (deterministic) intensity build so repeats don't feel static.
  const leadOctaveUp = phraseIndex % 2 === 1 && phraseBar >= 4;
  const leadShift = leadOctaveUp ? 12 : 0;

  // --- Pad: sustain the triad under everything (soft, slow attack).
  for (const iv of triad) {
    fmNote(c, B.padBus, {
      freq: semisToHz(P.rootHz, root + 12 + iv),
      start: barStart,
      dur: P.barS * 0.98,
      carrierType: 'sawtooth',
      modRatio: 1,
      modIndex: 3,
      gain: 0.2,
      attack: 0.08,
    });
  }

  for (let step = 0; step < 16; step++) {
    const t = barStart + step * P.stepS;

    // --- Bass: pumping staccato pulse.
    const bi = BASS_PATTERN[step];
    if (bi !== null) {
      fmNote(c, B.bassBus, {
        freq: semisToHz(P.rootHz, bassTones[bi]),
        start: t,
        dur: P.stepS * 0.92,
        carrierType: 'sawtooth',
        modRatio: 1,
        modIndex: 10,
        modEnd: 4,
        modDecay: P.stepS * 0.5,
        gain: 0.4,
        pan: -0.05,
      });
    }

    // --- Rhythm guitar: gritty palm-muted power fifth (root + fifth), a
    // driving staccato 8th-note chug. Short notes so the amp distortion
    // reads as a down-picked crunch, not a sustained drone.
    const rg = RHYTHM_STEPS[step];
    if (rg) {
      [root + 12, root + 19].forEach((semi, vi) => {
        fmNote(c, B.rhythmBus, {
          freq: semisToHz(P.rootHz, semi),
          start: t,
          dur: P.stepS * 1.5,
          carrierType: 'sawtooth',
          modRatio: 1,
          modIndex: 6,
          modEnd: 2,
          modDecay: P.stepS * 0.6,
          gain: 0.3 * rg,
          attack: 0.003,
          pan: vi === 0 ? -0.12 : 0.12, // widen the chord a touch
        });
      });
    }

    // --- Stab: bright FM brass chord on the backbeat (with the snare).
    if (SNARE_STEPS.has(step)) {
      triad.forEach((iv, ci) => {
        fmNote(c, B.stabBus, {
          freq: semisToHz(P.rootHz, root + 12 + iv),
          start: t,
          dur: P.stepS * 2.4,
          carrierType: 'square',
          modRatio: 1,
          modIndex: 60,
          modEnd: 8,
          modDecay: P.stepS * 1.2,
          gain: 0.17,
          attack: 0.006,
          pan: (ci - 1) * 0.35, // spread the triad across the stereo field
        });
      });
    }

    // --- Drums.
    if (KICK_STEPS.has(step)) kick(c, B.drumBus, t, step === 0 ? 1.0 : 0.85);
    if (SNARE_STEPS.has(step)) snare(c, B.drumBus, t, 0.6);
    // Closed hats every 16th (relentless drive); open hat on the final &.
    hat(c, B.drumBus, t, HAT_ACCENT.has(step) ? 1.2 : 0.55, step === 15);
    // Crash on the downbeat of each 8-bar phrase — lifts the loop top.
    if (phraseBar === 0 && step === 0) crash(c, B.drumBus, t, 0.5);
  }

  // --- Lead melody.
  const line = MELODY[phraseBar];
  for (const [stStep, semi, durSteps] of line) {
    const t = barStart + stStep * P.stepS;
    const dur = durSteps * P.stepS;
    const sustained = durSteps >= 3;
    const f = semisToHz(P.rootHz, semi + leadShift);
    fmNote(c, B.leadBus, {
      freq: f,
      start: t,
      dur: dur * 0.96,
      carrierType: 'square',
      modRatio: 2,
      modIndex: P.leadMod,
      modEnd: P.leadModEnd, // bright attack settling to a mellower sustain (FM brass)
      modDecay: Math.min(0.18, dur * 0.4),
      gain: 0.24,
      attack: 0.012,
      vibratoHz: sustained ? 5.5 : 0,
      vibratoDepth: sustained ? f * 0.006 : 0,
      pan: 0.12,
    });
    // Detuned double, panned opposite — thickens the hook into a chorused,
    // present lead instead of a thin single oscillator. Slightly mellower
    // (lower mod index) so it fills rather than fighting the main voice.
    fmNote(c, B.leadBus, {
      freq: f * 1.004,
      start: t,
      dur: dur * 0.96,
      carrierType: 'sawtooth',
      modRatio: 2,
      modIndex: Math.round(P.leadMod * 0.571), // keep the double's ratio to the lead
      modEnd: Math.round(P.leadModEnd * 0.636),
      modDecay: Math.min(0.18, dur * 0.4),
      gain: 0.13,
      attack: 0.014,
      vibratoHz: sustained ? 5.5 : 0,
      vibratoDepth: sustained ? f * 0.006 : 0,
      pan: -0.12,
    });
  }

  // --- Turnaround fill: a 16th snare roll on the last bar of each phrase.
  if (phraseBar === PROGRESSION.length - 1) {
    for (let s = 12; s < 16; s++) {
      snare(c, B.drumBus, barStart + s * P.stepS, 0.28 + (s - 12) * 0.06);
    }
  }
}

// Builds the full loop into an OfflineAudioContext at the given sample rate
// and resolves with the AudioBuffer. TEST-ONLY since R37 (see the engine note
// above): this render takes minutes on real hardware; nothing on the play
// path calls it. __renderLoopForTest keeps using it so the offline verifier
// can still inspect peak/RMS/pitch per variant.
async function buildLoop(sampleRate, variant) {
  const P = variantParams(variant);
  const length = Math.ceil(TOTAL_BARS * P.barS * sampleRate) + sampleRate; // +1s tail
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OAC(2, length, sampleRate);
  const buses = makeBuses(oc, oc.destination);
  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    scheduleBar(oc, buses, P, bar, bar * P.barS);
  }
  return oc.startRendering();
}

// --- Flight-music variants -------------------------------------------------
// The SAME FM-rock composition, re-keyed + re-tempo'd + lead-timbre-shifted per
// stage, so each level feels fresh without redesigning the owner-approved track.
// Selected by stage: variant = stage % VARIANTS.length, so the game cycles
// through them as stages advance. Variant 0 (stage 1 -> index 0) is the exact
// A-minor / 160 BPM track the owner approved; the rest are transposed siblings.
const SEMI = (s) => ROOT_HZ * Math.pow(2, s / 12);
const VARIANTS = [
  { label: 'Am-160', rootHz: SEMI(0), bpm: 160, leadMod: [70, 22] }, // original (owner-approved)
  { label: 'Cm-168', rootHz: SEMI(3), bpm: 168, leadMod: [92, 30] }, // up a minor 3rd, brighter + faster
  { label: 'Gm-150', rootHz: SEMI(-2), bpm: 150, leadMod: [50, 16] }, // down a tone, darker + slower + mellower lead
  { label: 'Dm-156', rootHz: SEMI(5), bpm: 156, leadMod: [78, 26] }, // up a fourth, higher key
];
export const __variantCount = VARIANTS.length;
export const __variantLabels = VARIANTS.map((v) => v.label);

function variantForStage(stage) {
  const n = VARIANTS.length;
  return (((stage | 0) % n) + n) % n;
}

const musicBuffers = new Map(); // variantIndex -> Promise<AudioBuffer|null>
let currentState = 'off';
let currentVariant = 0;

// TEST-ONLY since R37 (see the engine note above buildLoop): lazy per-variant
// offline render + cache, kept solely for __renderLoopForTest's verifier.
// Nothing on the play path calls this — the game schedules live instead.
function renderMusicBuffer(variantIndex = 0) {
  const c = ctx();
  if (!c) return Promise.resolve(null);
  if (!musicBuffers.has(variantIndex)) {
    // R37 measurement-only: graphMs is the SYNCHRONOUS main-thread cost of
    // building the offline node graph (buildLoop's body runs to its final
    // `return oc.startRendering()` before the promise is handed back);
    // renderMs is the off-thread offline render until the buffer resolves.
    const t0 = performance.now();
    const p = buildLoop(c.sampleRate, VARIANTS[variantIndex]).catch(() => null);
    const timing = { graphMs: performance.now() - t0, renderMs: null };
    p.then(() => {
      timing.renderMs = performance.now() - t0 - timing.graphMs;
    });
    if (typeof window !== 'undefined') {
      (window.__musicTiming || (window.__musicTiming = {}))[variantIndex] = timing;
    }
    musicBuffers.set(variantIndex, p);
  }
  return musicBuffers.get(variantIndex);
}

// Test-only (R37): render just the first N bars through the SAME
// makeBuses/scheduleBar path the live scheduler drives, into a small
// OfflineAudioContext. Small graphs render fast (the full 40-bar graph is in
// the measured minutes-long crawl regime; see buildLoop's note), so this is
// the practical machine-check that the composition engine produces real,
// unclipped signal — headless/test chromium renders no REAL-TIME audio at
// all (its real-time contexts run with no device; analyser taps read zero
// even for a bare oscillator — instrument control in
// judging/R37/start-time/analyser_control.mjs), so live audibility cannot be
// probed; this is the verifiable proxy. Not used in play.
export function __renderBarsForTest(nBars = 2, variantIndex = 0, sampleRate = 44100) {
  const P = variantParams(VARIANTS[variantIndex]);
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OAC(2, Math.ceil(nBars * P.barS * sampleRate) + sampleRate, sampleRate);
  const buses = makeBuses(oc, oc.destination);
  for (let bar = 0; bar < nBars; bar++) {
    scheduleBar(oc, buses, P, bar % TOTAL_BARS, bar * P.barS);
  }
  return oc.startRendering();
}

// Test-only: render a variant's loop (default 0) and hand back the AudioBuffer
// so an offline verifier can inspect duration/peak/RMS/clipping and diff the
// variants against each other. Returns the same cached buffer the game plays;
// resolves null when muted/headless. Not used in play.
export function __renderLoopForTest(variantIndex = 0) {
  return renderMusicBuffer(variantIndex);
}

// Test-only: snapshot of the music state machine so a smoke test can assert the
// stage->variant selection and that a loop actually starts. Not used in play.
export function __musicDebug() {
  return { currentState, currentVariant, playing: !!sched, variantForStage };
}
// R37 start-time lane: reachable from a LIVE page (no ?fixed hooks there), so
// a probe can see whether flight music is actually sounding at stage-1 open.
if (typeof window !== 'undefined') window.__musicDebug = __musicDebug;

// --- Live playback (R37) ----------------------------------------------------
// The flight track is SCHEDULED live, one bar at a time, instead of played
// from a pre-rendered buffer — see the engine note above buildLoop for the
// measured 3-4 minute offline-render cost this replaces. The lookahead is
// deliberately larger than a background tab's 1 s timer clamp, so the groove
// survives throttling; bar times are absolute from t0, so a late timer can
// only schedule late, never off-grid.
const SCHED_LOOKAHEAD_S = 2.5;
const SCHED_INTERVAL_MS = 250;
let sched = null; // { timer, musicGain, variantIndex }

function stopLoop() {
  if (sched) {
    clearInterval(sched.timer);
    try {
      // One disconnect silences every already-scheduled note at once: the
      // whole bus tree hangs off this gain. The few seconds of scheduled
      // sources still run out silently and are then GC'd — bounded by the
      // lookahead plus the longest note tail.
      sched.musicGain.disconnect();
    } catch {
      /* already disconnected */
    }
    sched = null;
  }
}

// Start the live bar scheduler for a variant. Callers gate on the context
// RUNNING (applyFlight); onUnlock re-applies after the first user gesture
// resumes a suspended context, same contract as the old buffer path.
function startScheduler(variantIndex) {
  const c = ctx();
  if (!c || c.state !== 'running') return;
  stopLoop();
  const P = variantParams(VARIANTS[variantIndex]);
  const musicGain = c.createGain();
  musicGain.gain.value = 0.5; // same playback level the looped buffer had
  musicGain.connect(master());
  const buses = makeBuses(c, musicGain);
  const t0 = c.currentTime + 0.15;
  let bar = 0;
  const pump = () => {
    while (t0 + bar * P.barS < c.currentTime + SCHED_LOOKAHEAD_S) {
      scheduleBar(c, buses, P, bar % TOTAL_BARS, t0 + bar * P.barS);
      bar++;
    }
  };
  pump();
  sched = { timer: setInterval(pump, SCHED_INTERVAL_MS), musicGain, variantIndex };
}

// (Re)start flight music for the current variant, but ONLY once the context
// is actually RUNNING. A 'flight' set while the context is still suspended
// (before the first user gesture) cannot sound; onUnlock (engine.js) calls
// this again the instant the context resumes, so the music begins cleanly
// from the unlock point. Idempotent: it no-ops unless we're in 'flight', and
// won't restart an already-running scheduler on the same variant.
function applyFlight() {
  const c = ctx();
  if (!c || currentState !== 'flight') return;
  if (sched && sched.variantIndex === currentVariant && c.state === 'running') return;
  if (c.state !== 'running') return; // still locked — wait for onUnlock
  startScheduler(currentVariant);
}

// Task 1: when the context unlocks on the first gesture, re-apply flight music
// so a loop requested while suspended actually begins playing.
onUnlock(applyFlight);

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

// `state`: 'flight' | 'title' | 'off'. `opts.stage` (a stage index, default 0)
// selects the flight VARIANT: variant = stage % VARIANTS.length. 'flight'
// starts the stage's variant on the LIVE scheduler — now if the context is
// running, else the moment it unlocks (onUnlock). Entering 'flight' on a NEW
// stage swaps to that stage's variant instantly (no render — R37). 'title'
// fires the sting once; 'off' stops whatever is playing.
export function setState(state, opts) {
  const stage = opts && typeof opts.stage === 'number' ? opts.stage : 0;
  const variant = variantForStage(stage);
  const c = ctx();
  if (!c) {
    // muted/headless: track the requested state/variant, play nothing
    currentState = state;
    if (state === 'flight') currentVariant = variant;
    return;
  }

  if (state === 'flight') {
    // Already flying this exact variant with a live scheduler -> leave it.
    if (currentState === 'flight' && currentVariant === variant && sched) return;
    currentState = 'flight';
    currentVariant = variant;
    stopLoop(); // fresh start / variant switch
    applyFlight(); // starts now if running, else waits for onUnlock
    return;
  }

  if (state === currentState) return;
  currentState = state;
  stopLoop();
  if (state === 'title') {
    // No pre-warm any more: live scheduling needs none (R37), and the old
    // render pre-warm cost ~0.3-1 s of main thread before the title painted
    // plus minutes of a saturated core after it.
    playTitleSting();
  }
  // 'off' => loop stopped; nothing else to do.
}

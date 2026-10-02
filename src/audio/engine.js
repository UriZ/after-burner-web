// WebAudio context lifecycle.
//
// Two hard constraints from the task brief / ARCHITECTURE.md D4:
//   1. Browsers block audio until a user gesture — unlocking must happen on
//      the first pointerdown/keydown without the caller having to know that.
//   2. tools/capture.mjs runs the game headless via `?fixed=1` with no
//      gesture ever, and fails the whole capture on ANY console error or
//      pageerror. Every audio call anywhere in src/audio/** must therefore
//      be a safe no-op when muted or when AudioContext doesn't exist —
//      never throw, never log.
//
// `?fixed=1` (puppeteer capture mode) implies mute by default, independent
// of a real user gesture ever happening, so captures stay silent AND
// deterministic (no audio scheduling jitter touching anything measured).
// `?mute=1` forces mute anywhere; `?mute=0` forces sound even under
// `?fixed=1` for a human who wants to hear a capture run.
const params = new URLSearchParams(location.search);
export const MUTED = params.has('mute') ? params.get('mute') !== '0' : params.has('fixed');

let _ctx = null;
let _master = null;

function init() {
  if (MUTED || _ctx || typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return; // unsupported environment — stay silent, never throw
  _ctx = new AC();
  _master = _ctx.createGain();
  _master.gain.value = 0.7;
  _master.connect(_ctx.destination);
}
init();

// Autoplay policy leaves the context running but SUSPENDED until a gesture;
// creating/scheduling nodes against a suspended context is legal and silent
// (just inaudible), so nothing else here needs to wait for this — it only
// has to happen before the player would notice silence.
if (!MUTED && typeof window !== 'undefined' && _ctx) {
  const events = ['pointerdown', 'keydown', 'touchstart'];
  const resume = () => {
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
    for (const e of events) window.removeEventListener(e, resume);
  };
  for (const e of events) window.addEventListener(e, resume, { once: true });
}

export function ctx() {
  return _ctx;
}
export function master() {
  return _master;
}
export function now() {
  return _ctx ? _ctx.currentTime : 0;
}
export function setMasterVolume(v) {
  if (_master) _master.gain.value = v;
}

// Shared white-noise source buffer, cached per duration. Every noise-based
// SFX (explosion, missile whoosh, hats, engine hiss) plays this through its
// own filter/envelope rather than rendering a fresh buffer per call — one
// buffer, many cheap BufferSourceNodes.
const _noiseCache = new Map();
export function noiseBuffer(seconds = 1) {
  if (!_ctx) return null;
  const key = seconds;
  if (_noiseCache.has(key)) return _noiseCache.get(key);
  const len = Math.max(1, Math.floor(_ctx.sampleRate * seconds));
  const buf = _ctx.createBuffer(1, len, _ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  _noiseCache.set(key, buf);
  return buf;
}

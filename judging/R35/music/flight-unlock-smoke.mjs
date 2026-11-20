// R35 MUSIC lane — pure-node smoke for the NEW paths:
//   (1) a 'flight' set while the AudioContext is SUSPENDED does NOT start the
//       loop, and the onUnlock re-apply STARTS it cleanly once a gesture
//       resumes the context (Task 1);
//   (2) setState('flight', { stage }) selects variant = stage % N, switches the
//       loop on a stage change, and never throws (Task 2).
// Minimal controllable WebAudio mock: state starts 'suspended', resume() flips
// it to 'running', and window.addEventListener captures the resume listener so
// the test can "fire a gesture". No real audio device involved.

const listeners = {};
let nodeCount = 0;
const bump = () => { nodeCount++; };

class Param {
  constructor(v = 0) { this.value = v; }
  setValueAtTime() { return this; }
  exponentialRampToValueAtTime(v) { if (v === 0) throw new Error('exp ramp to 0 (illegal)'); return this; }
  linearRampToValueAtTime() { return this; }
  setTargetAtTime() { return this; }
}
class Node {
  constructor() { bump(); }
  connect(d) { return d; }
  disconnect() {}
  start() {} stop() {}
}
const withParams = (n, params) => { for (const [k, v] of Object.entries(params)) n[k] = new Param(v); return n; };
function makeBuffer(ch, len, sr) {
  const data = Array.from({ length: ch }, () => new Float32Array(len));
  return { length: len, sampleRate: sr, numberOfChannels: ch, getChannelData: (i) => data[i] };
}
class MockCtx {
  constructor() { this.sampleRate = 48000; this.currentTime = 0; this.state = 'suspended'; this.destination = new Node(); }
  createGain() { const n = new Node(); n.gain = new Param(1); return n; }
  createOscillator() { const n = new Node(); return withParams(n, { frequency: 440, detune: 0 }); }
  createBiquadFilter() { const n = new Node(); n.type = 'lowpass'; return withParams(n, { frequency: 1000, Q: 1 }); }
  createBufferSource() { const n = new Node(); n.buffer = null; n.loop = false; return withParams(n, { playbackRate: 1 }); }
  createStereoPanner() { const n = new Node(); return withParams(n, { pan: 0 }); }
  createWaveShaper() { const n = new Node(); n.curve = null; n.oversample = 'none'; return n; }
  createDynamicsCompressor() { const n = new Node(); return withParams(n, { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 }); }
  createBuffer(ch, len, sr) { return makeBuffer(ch, len, sr); }
  resume() { this.state = 'running'; return Promise.resolve(); }
}
class MockOffline extends MockCtx {
  constructor(ch, len, sr) { super(); this.state = 'running'; this.sampleRate = sr; this._len = len; this._ch = ch; }
  startRendering() { return Promise.resolve(makeBuffer(this._ch, this._len, this.sampleRate)); }
}

globalThis.location = { search: '?mute=0' };
globalThis.window = {
  AudioContext: MockCtx,
  OfflineAudioContext: MockOffline,
  addEventListener(type, cb) { (listeners[type] ||= []).push(cb); },
  removeEventListener(type, cb) { if (listeners[type]) listeners[type] = listeners[type].filter((f) => f !== cb); },
};
globalThis.AudioContext = MockCtx;
globalThis.OfflineAudioContext = MockOffline;

const fireGesture = () => { for (const cb of [...(listeners.pointerdown || [])]) cb(); };
const flush = () => new Promise((r) => setTimeout(r, 0));

const fails = [];
const assert = (cond, label) => { if (cond) console.log(`  ok   ${label}`); else { fails.push(label); console.log(`  FAIL ${label}`); } };

const { AudioBus } = await import('../../../src/audio/index.js');
const music = await import('../../../src/audio/music.js');
const dbg = () => music.__musicDebug();

console.log(`variants: ${music.__variantCount} [${music.__variantLabels.join(', ')}]`);

// --- variant selection (stage % N), including wrap + negative ---
const vf = dbg().variantForStage;
assert(vf(0) === 0 && vf(1) === 1 && vf(2) === 2 && vf(3) === 3, 'stage->variant 0..3 identity');
assert(vf(4) === 0 && vf(5) === 1 && vf(23) === 3, 'stage->variant wraps mod N');
assert(vf(-1) === 3, 'stage->variant handles negative');

// --- Task 1: flight set while SUSPENDED must NOT be playing yet ---
try { AudioBus.music('flight', { stage: 0 }); } catch (e) { fails.push('flight set threw: ' + e.message); }
await flush();
assert(dbg().currentState === 'flight', 'state is flight after set');
assert(dbg().currentVariant === 0, 'stage 0 selected variant 0');
assert(dbg().playing === false, 'suspended: loop NOT started yet (deferred to unlock)');

// --- the gesture unlocks the context; onUnlock re-applies -> loop STARTS ---
try { fireGesture(); } catch (e) { fails.push('gesture/resume threw: ' + e.message); }
await flush(); await flush();
assert(dbg().playing === true, 'after unlock gesture: flight loop is PLAYING');

// --- Task 2: stage change switches variant + keeps playing ---
AudioBus.music('flight', { stage: 1 });
await flush();
assert(dbg().currentVariant === 1 && dbg().playing === true, 'stage 1 -> variant 1, still playing');
AudioBus.music('flight', { stage: 5 });
await flush();
assert(dbg().currentVariant === 1, 'stage 5 -> variant 1 (5 % 4)');
AudioBus.music('flight', { stage: 2 });
await flush();
assert(dbg().currentVariant === 2 && dbg().playing === true, 'stage 2 -> variant 2, still playing');

// --- off / title unchanged, no throw ---
try { AudioBus.music('off'); } catch (e) { fails.push('off threw: ' + e.message); }
assert(dbg().currentState === 'off' && dbg().playing === false, 'off stops the loop');
try { AudioBus.music('title'); } catch (e) { fails.push('title threw: ' + e.message); }
assert(dbg().currentState === 'title', 'title state set, no throw');

console.log(`\nnodes created: ${nodeCount}`);
if (fails.length) { console.log(`\n${fails.length} FAIL:\n - ${fails.join('\n - ')}`); process.exitCode = 1; }
else console.log('\nALL PASS — suspended-start deferral + unlock re-apply + per-stage variant selection all correct, no throws.');

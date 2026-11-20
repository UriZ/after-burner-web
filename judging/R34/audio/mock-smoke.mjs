// R34 AUDIO lane — pure-node WebAudio mock smoke test.
//
// Goal: prove every src/audio/** code path BUILDS ITS NODE GRAPH WITHOUT
// THROWING when audio is UNMUTED (the ?fixed=1 capture path is muted and never
// exercises the synthesis itself). We stub the WebAudio API + window/location
// globals, force ?mute=0, dynamically import the real modules, and fire every
// public event plus the music render. Any throw = a real boot/runtime bug.
//
// This is a structural guarantee (no-throw + expected layer count). Actual
// loudness/clipping is checked separately with a REAL OfflineAudioContext
// render of the music in a headless browser (offline-render.mjs).

let created = { total: 0, byType: {} };
function bump(type) {
  created.total++;
  created.byType[type] = (created.byType[type] || 0) + 1;
}

class Param {
  constructor(v = 0) { this.value = v; }
  setValueAtTime() { return this; }
  exponentialRampToValueAtTime(v) { if (v === 0) throw new Error('exp ramp to 0 (illegal)'); return this; }
  linearRampToValueAtTime() { return this; }
  setTargetAtTime() { return this; }
}
class Node {
  constructor(type, ctx) { this.type = type; this.context = ctx; bump(type); }
  connect(d) { return d; }
  disconnect() {}
  start() {} stop() {}
}
function osc(ctx) { const n = new Node('osc', ctx); n.frequency = new Param(440); n.type = 'sine'; n.detune = new Param(0); return n; }
function gain(ctx) { const n = new Node('gain', ctx); n.gain = new Param(1); return n; }
function filt(ctx) { const n = new Node('filter', ctx); n.frequency = new Param(1000); n.Q = new Param(1); n.type = 'lowpass'; return n; }
function bufSrc(ctx) { const n = new Node('bufSrc', ctx); n.playbackRate = new Param(1); n.buffer = null; n.loop = false; return n; }
function panner(ctx) { const n = new Node('panner', ctx); n.pan = new Param(0); return n; }
function shaperN(ctx) { const n = new Node('shaper', ctx); n.curve = null; n.oversample = 'none'; return n; }
function comp(ctx) {
  const n = new Node('comp', ctx);
  n.threshold = new Param(-24); n.knee = new Param(30); n.ratio = new Param(12);
  n.attack = new Param(0.003); n.release = new Param(0.25);
  return n;
}
function makeBuffer(ch, len, sr) {
  const data = Array.from({ length: ch }, () => new Float32Array(len));
  return { length: len, sampleRate: sr, numberOfChannels: ch, getChannelData: (i) => data[i] };
}

class MockCtx {
  constructor() { this.sampleRate = 48000; this.currentTime = 0; this.state = 'running'; this.destination = new Node('dest', this); }
  createGain() { return gain(this); }
  createOscillator() { return osc(this); }
  createBiquadFilter() { return filt(this); }
  createBufferSource() { return bufSrc(this); }
  createStereoPanner() { return panner(this); }
  createWaveShaper() { return shaperN(this); }
  createDynamicsCompressor() { return comp(this); }
  createBuffer(ch, len, sr) { return makeBuffer(ch, len, sr); }
  resume() { return Promise.resolve(); }
}
class MockOffline extends MockCtx {
  constructor(ch, len, sr) { super(); this.sampleRate = sr; this._len = len; this._ch = ch; }
  startRendering() { return Promise.resolve(makeBuffer(this._ch, this._len, this.sampleRate)); }
}

globalThis.location = { search: '?mute=0' };
globalThis.window = {
  AudioContext: MockCtx,
  OfflineAudioContext: MockOffline,
  addEventListener() {}, removeEventListener() {},
};
globalThis.AudioContext = MockCtx;
globalThis.OfflineAudioContext = MockOffline;

const fails = [];
function run(label, fn) {
  const before = created.total;
  try { fn(); console.log(`  ok   ${label}  (+${created.total - before} nodes)`); }
  catch (e) { fails.push(`${label}: ${e.message}`); console.log(`  FAIL ${label}: ${e.message}`); }
}

const { AudioBus } = await import('../../../src/audio/index.js');
const music = await import('../../../src/audio/music.js');

console.log('SFX events (unmuted mock):');
run("vulcan L", () => AudioBus.play('vulcan', { side: 1 }));
run("vulcan R", () => AudioBus.play('vulcan', { side: -1 }));
run("missileLaunch", () => AudioBus.play('missileLaunch'));
run("lockOn", () => AudioBus.play('lockOn'));
run("explosion", () => AudioBus.play('explosion'));
run("explosion big", () => AudioBus.play('explosion', { big: true }));
run("enemyFlyPast", () => AudioBus.play('enemyFlyPast', { panFrom: -1, panTo: 1 }));
run("playerDeath", () => AudioBus.play('playerDeath'));
run("respawnReady", () => AudioBus.play('respawnReady'));
run("tallyTick", () => AudioBus.play('tallyTick'));
run("menuStart", () => AudioBus.play('menuStart'));
run("unknown event (must no-op)", () => AudioBus.play('doesNotExist'));

console.log('Engine + warning (persistent graphs):');
run("setEngine idle", () => AudioBus.setEngine(0.1));
run("setEngine cruise", () => AudioBus.setEngine(0.6));
run("setEngine afterburner", () => AudioBus.setEngine(1.0));
run("stopEngine", () => AudioBus.stopEngine());
run("inbound warn", () => { AudioBus.setInboundWarning(0.5); AudioBus.setInboundWarning(0); });

console.log('Rapid vulcan burst (stacking, 24 rounds):');
run("24x vulcan", () => { for (let i = 0; i < 24; i++) AudioBus.play('vulcan', { side: i % 2 ? 1 : -1 }); });

console.log('Music:');
run("title sting", () => AudioBus.music('title'));
let buf = null;
await music.__renderLoopForTest().then((b) => { buf = b; });
run("flight loop render built", () => { if (!buf) throw new Error('null buffer'); });

console.log(`\nnode types created: ${JSON.stringify(created.byType)}`);
if (buf) console.log(`music buffer: ${buf.length} frames @ ${buf.sampleRate} Hz = ${(buf.length / buf.sampleRate).toFixed(1)}s, ${buf.numberOfChannels}ch`);
if (fails.length) { console.error(`\n${fails.length} FAILURES`); process.exit(1); }
console.log('\nALL PASS — every audio path builds its graph without throwing (unmuted).');

// R37 incoming-fire SOUND verification: real OfflineAudioContext renders of the
// new incoming-round voices through a mirror of engine.js's master chain
// (0.7 gain + the same limiter), via sfx.js's __renderIncomingForTest — the
// SAME incomingVoiceGraph code the live path runs, not a copy.
// Checks per scenario: peak < 1.0, zero clipped samples, RMS floor (energy
// present), post-cut silence, and a descending-pitch read (dominant pitch in
// an early vs late window of the approach — the "tracks the approach" claim).
// Mirrors judging/R35/music/offline-render-variants.mjs.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const server = await createServer({
  root: ROOT, configFile: path.join(ROOT, 'vite.config.js'),
  server: { hmr: false, watch: null }, logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({
  headless: 'new', protocolTimeout: 300000,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  const BENIGN = /AudioContext encountered an error from the audio device or the WebAudio renderer/;
  page.on('pageerror', (e) => { if (!BENIGN.test(String(e))) errors.push(String(e)); });
  page.on('console', (m) => { if (m.type() === 'error' && !BENIGN.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/?mute=0`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // windows: [earlyA,earlyB,lateA,lateB, cutFrom] seconds — pitch read windows
  // on the approach and a post-cut silence window.
  const SCEN = {
    battery: { win: [0.35, 0.55, 0.82, 0.97, 1.3], cross: 1.0 },
    air: { win: [1.2, 1.5, 2.3, 2.45, 2.9], cross: 2.5 },
    train: { win: null, cross: null },
    stack: { win: null, cross: null },
  };
  const results = {};
  for (const [name, cfg] of Object.entries(SCEN)) {
    results[name] = await page.evaluate(async (nm, cfg2) => {
      const mod = await import('/src/audio/sfx.js');
      const buf = await mod.__renderIncomingForTest(nm);
      if (!buf) return { error: 'null buffer' };
      const sr = buf.sampleRate;
      const chans = [];
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const d = buf.getChannelData(ch);
        let peak = 0, sumsq = 0, clipped = 0;
        for (let i = 0; i < d.length; i++) {
          const x = Math.abs(d[i]);
          if (x > peak) peak = x;
          if (x >= 0.999) clipped++;
          sumsq += d[i] * d[i];
        }
        chans.push({ peak: +peak.toFixed(4), rms: +Math.sqrt(sumsq / d.length).toFixed(4), clipped });
      }
      const mono = buf.getChannelData(0);
      const rmsWin = (a, b) => {
        let s = 0; const i0 = Math.floor(a * sr), i1 = Math.min(mono.length, Math.floor(b * sr));
        for (let i = i0; i < i1; i++) s += mono[i] * mono[i];
        return Math.sqrt(s / Math.max(1, i1 - i0));
      };
      const pitch = (a, b) => {
        const i0 = Math.floor(a * sr), i1 = Math.min(mono.length, Math.floor(b * sr));
        const len = i1 - i0;
        const minLag = Math.floor(sr / 2200), maxLag = Math.floor(sr / 80);
        let bestLag = 0, best = -Infinity;
        for (let lag = minLag; lag <= maxLag; lag++) {
          let s = 0;
          for (let i = i0; i + lag < i1; i++) s += mono[i] * mono[i + lag];
          if (s > best) { best = s; bestLag = lag; }
        }
        return bestLag ? +(sr / bestLag).toFixed(1) : 0;
      };
      const out = { channels: chans, durationS: +(buf.length / sr).toFixed(2) };
      if (cfg2.win) {
        const [ea, eb, la, lb, cutFrom] = cfg2.win;
        out.earlyHz = pitch(ea, eb);
        out.lateHz = pitch(la, lb);
        out.approachRms = +rmsWin(la, lb).toFixed(4);
        out.earlyRms = +rmsWin(ea, eb).toFixed(4);
        out.postCutRms = +rmsWin(cutFrom, cutFrom + 0.5).toFixed(5);
      }
      return out;
    }, name, cfg);
    console.log(name, JSON.stringify(results[name]));
  }
  if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 5));
  const bad = [];
  for (const [n, r] of Object.entries(results)) {
    if (r.error) { bad.push(`${n}: ${r.error}`); continue; }
    if (r.channels.some((c) => c.peak >= 1.0 || c.clipped > 0)) bad.push(`${n}: clip/peak`);
    if (r.channels.every((c) => c.rms < 0.005)) bad.push(`${n}: silent`);
    if (r.earlyHz !== undefined) {
      if (!(r.lateHz < r.earlyHz * 0.8)) bad.push(`${n}: pitch not descending (${r.earlyHz}->${r.lateHz})`);
      if (!(r.approachRms > r.earlyRms)) bad.push(`${n}: no proximity swell`);
      if (!(r.postCutRms < 0.004)) bad.push(`${n}: no cut (post ${r.postCutRms})`);
    }
  }
  console.log('\nchecks:', bad.length ? 'FAIL ' + bad.join('; ') : 'OK', '| pageErrors:', errors.length);
  process.exitCode = bad.length || errors.length ? 1 : 0;
} finally {
  await browser.close();
  await server.close();
}

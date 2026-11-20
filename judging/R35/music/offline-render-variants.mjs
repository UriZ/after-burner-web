// R35 MUSIC lane — REAL OfflineAudioContext render of EVERY flight-music
// variant, proving each renders with energy and no clipping AND that the
// variants are audibly DIFFERENT (duration from tempo, dominant pitch from key,
// RMS from arrangement/timbre). Headless chromium, OfflineAudioContext needs no
// user gesture. Mirrors judging/R34/audio/offline-render.mjs, extended to loop
// over __variantCount and diff the variants.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))));

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { hmr: false, watch: null },
});
await server.listen();
const port = server.config.server.port || server.httpServer.address().port;
const url = `http://localhost:${port}/?mute=0`;

const browser = await puppeteer.launch({
  headless: 'new',
  protocolTimeout: 600000, // four dense 60s offline renders + analysis > the 180s default
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  // Headless chromium has no audio output device, so the page's LIVE real-time
  // AudioContext (engine.js creates one on load under ?mute=0) emits a benign
  // device/renderer-teardown message at browser close. It is unrelated to the
  // OfflineAudioContext renders under test (those return valid buffers) and to
  // the music runtime path (no gesture here, so resume/onUnlock/setState never
  // run). Filter it so the gate reflects the renders, not the headless device.
  const BENIGN = /AudioContext encountered an error from the audio device or the WebAudio renderer/;
  const keep = (s) => !BENIGN.test(s);
  page.on('pageerror', (e) => { if (keep(String(e))) errors.push(String(e)); });
  page.on('console', (m) => { if (m.type() === 'error' && keep(m.text())) errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  const meta = await page.evaluate(async () => {
    const mod = await import('/src/audio/music.js');
    return { n: mod.__variantCount, labels: mod.__variantLabels };
  });

  // Render + analyse ONE variant per evaluate call, logging each immediately —
  // so partial results survive and chromium frees the previous render's nodes
  // between variants (one dense 60s render at a time instead of four at once).
  const renderOne = async (v) => page.evaluate(async (vi) => {
    const mod = await import('/src/audio/music.js');
    const labels = mod.__variantLabels;
    const buf = await mod.__renderLoopForTest(vi);
    if (!buf) return { v: vi, label: labels[vi], error: 'null buffer' };
    const channels = [];
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      let peak = 0, sumsq = 0, clipped = 0;
      for (let i = 0; i < d.length; i++) {
        const x = Math.abs(d[i]);
        if (x > peak) peak = x;
        if (x >= 0.999) clipped++;
        sumsq += d[i] * d[i];
      }
      channels.push({ peak: +peak.toFixed(4), rms: +Math.sqrt(sumsq / d.length).toFixed(4), clipped });
    }
    // Dominant-pitch estimate via autocorrelation on a decimated mono window
    // from a steady interior slice (2s..3s); the bass fundamental (which
    // transposes with the key) survives 4x decimation of the 44.1k signal.
    const sr = buf.sampleRate;
    const a = buf.getChannelData(0);
    const b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a;
    const D = 4, dsr = sr / D, start = Math.floor(2 * sr);
    const win = Math.min(Math.floor(1 * sr), a.length - start);
    const len = Math.floor(win / D);
    const mono = new Float32Array(len);
    for (let i = 0; i < len; i++) mono[i] = 0.5 * (a[start + i * D] + b[start + i * D]);
    const minLag = Math.max(1, Math.floor(dsr / 1000));
    const maxLag = Math.floor(dsr / 55);
    let bestLag = 0, best = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let s = 0;
      for (let i = 0; i + lag < len; i++) s += mono[i] * mono[i + lag];
      if (s > best) { best = s; bestLag = lag; }
    }
    return {
      v: vi,
      label: labels[vi],
      durationS: +(buf.length / buf.sampleRate).toFixed(2),
      sampleRate: sr,
      dominantHz: bestLag ? +(dsr / bestLag).toFixed(1) : 0,
      channels,
    };
  }, v);

  const vs = [];
  for (let v = 0; v < meta.n; v++) {
    const t0 = Date.now();
    const r = await renderOne(v);
    r.renderMs = Date.now() - t0;
    vs.push(r);
    console.log(`variant ${v} [${r.label}]:`, JSON.stringify(r));
  }
  if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 8));
  const anyErr = vs.some((x) => x.error);
  const clipOrSilent = vs.some((x) => !x.error && x.channels.some((c) => c.peak > 1.0 || c.clipped > 0 || c.rms < 0.02));

  // Audible-difference check: every variant's (duration, dominantHz) pair must
  // be distinct from every other's (tempo OR key differs for each pairing).
  let allDistinct = !anyErr;
  for (let i = 0; i < vs.length && allDistinct; i++) {
    for (let j = i + 1; j < vs.length; j++) {
      const a = vs[i], b = vs[j];
      const durDiff = Math.abs(a.durationS - b.durationS) > 0.3;
      const pitchDiff = Math.abs(a.dominantHz - b.dominantHz) > 2;
      if (!durDiff && !pitchDiff) { allDistinct = false; console.log(`NOT DISTINCT: ${a.label} vs ${b.label}`); break; }
    }
  }

  const ok = !anyErr && !clipOrSilent && allDistinct && errors.length === 0;
  console.log('\nchecks:', JSON.stringify({ anyErr, clipOrSilent, allDistinct, pageErrors: errors.length }));
  console.log(ok
    ? '\nRESULT: OK — all variants render with energy, no clipping, and each pair is audibly distinct.'
    : '\nRESULT: investigate (see checks / errors above).');
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
  await server.close();
}

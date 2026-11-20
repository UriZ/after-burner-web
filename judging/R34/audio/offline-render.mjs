// R34 AUDIO lane — REAL OfflineAudioContext render of the flight music.
//
// The mock smoke test proves no-throw; this proves the actual SIGNAL is sane:
// renders the 60s FM-rock loop via the real music.js __renderLoopForTest in a
// headless chromium (OfflineAudioContext is fully supported offline, no user
// gesture needed) and reports peak / RMS / clipped-sample count per channel.
// A healthy master-limited mix should peak < 1.0 (no hard clip) with real
// energy (RMS well above silence).
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
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  const stats = await page.evaluate(async () => {
    const mod = await import('/src/audio/music.js');
    const buf = await mod.__renderLoopForTest();
    if (!buf) return { error: 'null buffer (muted/headless ctx missing)' };
    const out = { durationS: +(buf.length / buf.sampleRate).toFixed(2), sampleRate: buf.sampleRate, channels: [] };
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      let peak = 0, sumsq = 0, clipped = 0;
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
        if (a >= 0.999) clipped++;
        sumsq += d[i] * d[i];
      }
      out.channels.push({ peak: +peak.toFixed(4), rms: +Math.sqrt(sumsq / d.length).toFixed(4), clipped });
    }
    return out;
  });

  console.log('MUSIC OFFLINE RENDER:', JSON.stringify(stats, null, 2));
  if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 8));

  const bad = stats.error
    || stats.channels.some((c) => c.peak > 1.0 || c.clipped > 0 || c.rms < 0.02);
  console.log(bad ? '\nRESULT: investigate (clip / silence / error above)' : '\nRESULT: OK — no clipping, real energy, both channels.');
} finally {
  await browser.close();
  await server.close();
}

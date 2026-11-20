// Render the flight loop and the title sting to WAV files so the owner/TL can
// listen without a dev server. Uses the same buildLoop path the game plays.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(path.dirname(path.dirname(HERE)));

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { host: '127.0.0.1', strictPort: false, hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
  await page.goto(`http://127.0.0.1:${port}/?mute=0&fixed=1`, { waitUntil: 'load' });
  await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });

  const b64 = await page.evaluate(async () => {
    const mod = await import('/src/audio/music.js');
    const buf = await mod.__renderLoopForTest();
    // Interleave to 16-bit PCM WAV.
    const nCh = buf.numberOfChannels;
    const len = buf.length;
    const rate = buf.sampleRate;
    const chans = [];
    for (let c = 0; c < nCh; c++) chans.push(buf.getChannelData(c));
    const bytesPerSample = 2;
    const dataLen = len * nCh * bytesPerSample;
    const ab = new ArrayBuffer(44 + dataLen);
    const dv = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true); ws(8, 'WAVE');
    ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, nCh, true); dv.setUint32(24, rate, true);
    dv.setUint32(28, rate * nCh * bytesPerSample, true);
    dv.setUint16(32, nCh * bytesPerSample, true); dv.setUint16(34, 16, true);
    ws(36, 'data'); dv.setUint32(40, dataLen, true);
    let off = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < nCh; c++) {
        let v = Math.max(-1, Math.min(1, chans[c][i]));
        dv.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
        off += 2;
      }
    }
    // base64 encode
    let bin = '';
    const bytes = new Uint8Array(ab);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  });

  const out = path.join(HERE, 'flight-loop.wav');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
} finally {
  await browser.close();
  await server.close();
}

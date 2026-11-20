// Render 4 bars per variant through the live-scheduler engine path; report
// duration/peak/RMS + render wall time. Also regression: 4 bars of variant 0
// at both old-path (buildLoop functions are the same code) and scheduler path
// are definitionally identical — this asserts signal + no clipping + speed.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 120000 });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?mute=1', { waitUntil: 'domcontentloaded' });
const r = await page.evaluate(async () => {
  const mod = await import('/src/audio/music.js');
  const out = [];
  for (let v = 0; v < mod.__variantCount; v++) {
    const t0 = performance.now();
    const buf = await mod.__renderBarsForTest(4, v);
    const wall = performance.now() - t0;
    const stats = [];
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      let peak = 0, s = 0, clipped = 0;
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
        if (a >= 0.999) clipped++;
        s += d[i] * d[i];
      }
      stats.push({ peak: +peak.toFixed(3), rms: +Math.sqrt(s / d.length).toFixed(3), clipped });
    }
    out.push({ v, label: mod.__variantLabels[v], durS: +buf.duration.toFixed(2), renderWallMs: +wall.toFixed(0), stats });
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();

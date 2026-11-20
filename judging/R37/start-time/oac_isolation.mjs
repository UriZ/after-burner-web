// Minimal OfflineAudioContext control: does a trivial 60s offline render
// resolve in this same headless environment? Validates the instrument before
// blaming buildLoop (CLAUDE.md measurement discipline).
import puppeteer from 'puppeteer';
const headed = process.argv.includes('--headed');
const browser = await puppeteer.launch({ headless: headed ? false : 'new',
  args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?mute=1', { waitUntil: 'domcontentloaded' });
const r = await page.evaluate(async () => {
  const out = {};
  // control 1: trivial graph, 60 s stereo
  {
    const oac = new OfflineAudioContext(2, 44100 * 60, 44100);
    const o = oac.createOscillator(); o.connect(oac.destination); o.start();
    const t0 = performance.now();
    await oac.startRendering();
    out.trivial60sMs = performance.now() - t0;
  }
  // control 2: dense graph ~ buildLoop scale (synthetic): 8000 short fm pairs
  {
    const oac = new OfflineAudioContext(2, 44100 * 60, 44100);
    for (let i = 0; i < 8000; i++) {
      const t = (i % 600) * 0.1;
      const c = oac.createOscillator(); c.type = 'square';
      const m = oac.createOscillator(); const mg = oac.createGain();
      mg.gain.value = 50; m.connect(mg).connect(c.frequency);
      const g = oac.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      c.connect(g).connect(oac.destination);
      c.start(t); c.stop(t + 0.25); m.start(t); m.stop(t + 0.25);
    }
    const t0 = performance.now();
    await oac.startRendering();
    out.dense60sMs = performance.now() - t0;
  }
  return out;
});
console.log(JSON.stringify(r), headed ? '(headed)' : '(headless)');
await browser.close();

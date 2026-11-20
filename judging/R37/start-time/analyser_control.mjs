// Instrument control: does an AnalyserNode tap read nonzero RMS from a plain
// oscillator in THIS environment (headless & headed)? And does the game's
// __audioLevelProbe read nonzero when a test tone is injected into master via
// the same page (through a parallel context)?
import puppeteer from 'puppeteer';
const headed = process.argv.includes('--headed');
const browser = await puppeteer.launch({ headless: headed ? false : 'new', protocolTimeout: 60000,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__audioLevelProbe === 'function', { timeout: 30000 });
const r = await page.evaluate(async () => {
  const out = {};
  // Control A: standalone context, osc -> analyser -> destination
  const c = new AudioContext();
  await c.resume().catch(() => {});
  out.ctrlState = c.state;
  const osc = c.createOscillator(); osc.frequency.value = 440;
  const an = c.createAnalyser(); an.fftSize = 2048;
  const g = c.createGain(); g.gain.value = 0.2;
  osc.connect(g).connect(an).connect(c.destination);
  osc.start();
  await new Promise((r) => setTimeout(r, 500));
  const buf = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(buf);
  let s = 0; for (const v of buf) s += v * v;
  out.ctrlRms = +Math.sqrt(s / buf.length).toFixed(4);
  osc.stop();
  // Control B: game's own probe right now (pre-gesture: suspended ctx)
  out.gameProbePreGesture = window.__audioLevelProbe();
  return out;
});
console.log(JSON.stringify(r), headed ? '(headed)' : '(headless)');
await browser.close();

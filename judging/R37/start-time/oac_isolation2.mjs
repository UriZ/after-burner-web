import puppeteer from 'puppeteer';
const headed = process.argv.includes('--headed');
const browser = await puppeteer.launch({ headless: headed ? false : 'new',
  args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?mute=1', { waitUntil: 'domcontentloaded' });
page.on('console', (m) => console.log('[page]', m.text()));
const r = await page.evaluate(async () => {
  const out = {};
  async function timed(label, seconds) {
    const oac = new OfflineAudioContext(2, 44100 * seconds, 44100);
    const o = oac.createOscillator(); o.connect(oac.destination); o.start();
    const t0 = performance.now();
    const p = oac.startRendering();
    const winner = await Promise.race([p.then(() => 'done'),
      new Promise((res) => setTimeout(() => res('timeout'), 20000))]);
    out[label] = winner === 'done' ? +(performance.now() - t0).toFixed(1) : 'TIMEOUT>20s';
    console.log(label, out[label]);
  }
  await timed('render1s', 1);
  await timed('render10s', 10);
  await timed('render60s', 60);
  return out;
});
console.log(JSON.stringify(r), headed ? '(headed)' : '(headless)');
await browser.close();

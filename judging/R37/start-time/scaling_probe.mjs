import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 120000 });
const page = await browser.newPage();
await page.goto('about:blank');
await page.evaluate(() => {
  window.run = async function run(N, DUR, placement) {
    const SR = 44100;
    const oac = new OfflineAudioContext(2, SR * DUR, SR);
    for (let i = 0; i < N; i++) {
      const t = placement === 'spread' ? (i / N) * (DUR - 1) : (i / N) * 0.75;
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
    const winner = await Promise.race([
      oac.startRendering().then(() => 'done'),
      new Promise((res) => setTimeout(() => res('timeout'), 45000)),
    ]);
    return `${winner} ${(performance.now() - t0).toFixed(0)}ms`;
  };
});
for (const [n, d, p] of [[1000, 60, 'spread'], [2000, 60, 'spread'], [4000, 60, 'spread'],
                         [4000, 60, 'first1s'], [4000, 10, 'spread']]) {
  const res = await page.evaluate((a, b, c) => window.run(a, b, c), n, d, p);
  console.log(`N${n} dur${d} ${p}: ${res}`);
}
await browser.close();

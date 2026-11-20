// Does incremental node creation via oc.suspend()/resume() fix the dense-graph
// offline render crawl? Same synthetic as oac_isolation control 2 (which hung
// >2.5 min when built upfront): 8000 FM pairs across 60 s.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto('about:blank');
const r = await page.evaluate(async () => {
  const SR = 44100, DUR = 60, N = 8000;
  const oac = new OfflineAudioContext(2, SR * DUR, SR);
  const addNote = (i) => {
    const t = (i % 600) * 0.1;
    const c = oac.createOscillator(); c.type = 'square';
    const m = oac.createOscillator(); const mg = oac.createGain();
    mg.gain.value = 50; m.connect(mg).connect(c.frequency);
    const g = oac.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    c.connect(g).connect(oac.destination);
    c.start(t); c.stop(t + 0.25); m.start(t); m.stop(t + 0.25);
  };
  // Incremental: add each second's notes at a suspend 0.5 s before it.
  // Notes with start time in [sec, sec+1) are added at suspend(sec - 0.5).
  const bySecond = new Map();
  for (let i = 0; i < N; i++) {
    const t = (i % 600) * 0.1;
    const sec = Math.floor(t);
    if (!bySecond.has(sec)) bySecond.set(sec, []);
    bySecond.get(sec).push(i);
  }
  // seconds 0 upfront; 1..59 via suspend.
  for (const i of (bySecond.get(0) || [])) addNote(i);
  for (let sec = 1; sec < DUR; sec++) {
    const ids = bySecond.get(sec);
    if (!ids || !ids.length) continue;
    oac.suspend(sec - 0.5).then(() => {
      for (const i of ids) addNote(i);
      oac.resume();
    });
  }
  const t0 = performance.now();
  const winner = await Promise.race([
    oac.startRendering().then(() => 'done'),
    new Promise((res) => setTimeout(() => res('timeout'), 60000)),
  ]);
  return { winner, ms: +(performance.now() - t0).toFixed(1) };
});
console.log(JSON.stringify(r));
await browser.close();

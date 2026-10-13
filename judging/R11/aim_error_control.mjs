// CONTROL for the aim-error hash in src/entities/enemy.js.
//
// The hash replaces a PRNG draw, so if it is degenerate on the inputs live
// play produces, the "aim error" is a fixed offset per aircraft and every
// train from a given enemy misses the same way. A synthetic sweep over
// (angle, age, depth) cannot show that, because in live play those three are
// narrow and correlated — the telegraph lights in a narrow depth band at a
// narrow age. R10 withdrew four instruments that passed a selftest and failed
// on real data; this one is checked on real data.
//
// It reads `aimErrorCensus` out of the SAME module instance the running game
// uses (ES modules are singletons per origin), after a long `?fixed=1` demo
// run, and chi-squares the 20-bin histogram against uniform.
//
//   node judging/R11/aim_error_control.mjs [--ticks N] [--url-params "..."]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const args = { ticks: 36000, urlParams: 'demo=1&seed=4' };
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--ticks') args.ticks = Number(process.argv[++i]);
  else if (process.argv[i] === '--url-params') args.urlParams = process.argv[++i];
  else { console.error(`unknown argument "${process.argv[i]}"`); process.exit(2); }
}

const server = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.js'),
  server: { strictPort: false, host: '127.0.0.1', hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({
  headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&${args.urlParams}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__step === "function"', { timeout: 20000 });
  // Step in chunks so one evaluate call does not hold the event loop forever.
  for (let done = 0; done < args.ticks; done += 600) {
    await page.evaluate((n) => window.__step(n), Math.min(600, args.ticks - done));
  }
  const c = await page.evaluate(async () => {
    const m = await import('/src/entities/enemy.js');
    return { n: m.aimErrorCensus.n, bins: [...m.aimErrorCensus.bins] };
  });
  const k = c.bins.length;
  const exp = c.n / k;
  const chi2 = c.bins.reduce((s, b) => s + (b - exp) ** 2 / exp, 0);
  // chi-square, 19 d.o.f.: 5 % critical 30.14, 1 % critical 36.19
  console.log(`telegraph events: ${c.n}   bins: ${c.bins.join(' ')}`);
  console.log(`expected per bin: ${exp.toFixed(1)}   chi2 = ${chi2.toFixed(2)} on 19 d.o.f.`);
  console.log(`  5 %% critical 30.14 -> ${chi2 < 30.14 ? 'UNIFORM (pass)' : 'NOT uniform (FAIL)'}`);
  console.log(`  min bin ${Math.min(...c.bins)}  max bin ${Math.max(...c.bins)}`);
  if (errs.length) { console.error('page errors:', errs); process.exitCode = 1; }
  if (c.n < 200) { console.error(`only ${c.n} events — run longer`); process.exitCode = 2; }
  if (chi2 >= 30.14) process.exitCode = 3;
} finally {
  await browser.close();
  await server.close();
}

// KILLS BY WEAPON AND BY SPAWN PATTERN — the half of the engagement question
// `judging/R11/probe_r11.mjs` cannot see.
//
// WHY IT IS NEEDED. That probe's pilot holds only the MISSILE button
// (`__setStick({...stick, missile: held})`), so every kill it counts is a
// missile kill by construction. Its headline — a tracking pilot losing 18 ->
// 11 kills after the envelope cut — is therefore a missile-lock count, and a
// pattern that is engaged with the GUN instead of the missile would read as a
// total loss there while still being perfectly fightable.
//
// `combat.js`'s own kill log already carries both facts per kill (`src` =
// vulcan | missile | other, and `pattern` = approach | crosser | overtake), so
// this reads them rather than inferring anything.
//
//   node judging/R11/kill_census.mjs --ticks 5400 --url-params "demo=2&seed=1" \
//        [--root <tree>] --out f.json
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const args = { ticks: 5400, urlParams: 'demo=2&seed=1', out: null, root: null };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--ticks') args.ticks = Number(process.argv[++i]);
  else if (a === '--url-params') args.urlParams = process.argv[++i];
  else if (a === '--out') args.out = process.argv[++i];
  else if (a === '--root') args.root = path.resolve(process.argv[++i]);
  else { console.error(`kill_census.mjs: unknown argument "${a}"`); process.exit(2); }
}
if (!args.out) { console.error('kill_census.mjs: --out is required'); process.exit(2); }
const ROOT = args.root ?? SELF;

const server = await createServer({
  root: ROOT, configFile: path.join(ROOT, 'vite.config.js'),
  server: { strictPort: false, host: '127.0.0.1', hmr: false, watch: null },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&invincible=1&${args.urlParams}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__step === "function" && typeof window.__killDrain === "function"',
    { timeout: 20000 });
  const kills = await page.evaluate(async (ticks) => {
    const out = [];
    for (let i = 0; i < ticks; i += 60) {
      window.__step(Math.min(60, ticks - i));
      const d = window.__killDrain();
      for (const k of d.kills) out.push(k);
    }
    return out;
  }, args.ticks);
  await writeFile(args.out, JSON.stringify({ root: ROOT, urlParams: args.urlParams, ticks: args.ticks, kills }));
  const tab = {};
  for (const k of kills) {
    const key = `${k.pattern}/${k.src}`;
    tab[key] = (tab[key] ?? 0) + 1;
  }
  console.log(`${args.out}: ${kills.length} kills over ${args.ticks} ticks (${(args.ticks / 60).toFixed(0)} s)`);
  for (const key of Object.keys(tab).sort()) console.log(`  ${key.padEnd(20)} ${tab[key]}`);
  if (errs.length) { console.error(`${errs.length} page error(s):`, errs.slice(0, 3)); process.exitCode = 1; }
} finally {
  await browser.close();
  await server.close();
}

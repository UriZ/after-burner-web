// VERIFY THAT A STALENESS GUARD ACTUALLY FIRES.
//
// A guard nobody has seen fire is a guard nobody knows works, and this repo's
// standing rule is that an assertion is only worth what its control is worth.
// So: patch the WITNESS (never the live constant), load the page, read the
// console, and restore the file with a byte comparison.
//
// It is deliberately generic. The R11 effects lane shipped two guards in two
// files and the next lane will ship more; the pattern is only reusable if its
// verification is too.
//
//   node judging/R11/guard_test.mjs
//       --file src/game/spawner.js --witness ENVELOPE_X_AT_MEASUREMENT --stale 2.6
//       [--match spawner.js] [--url "?fixed=1&seed=1"]
//
// `--witness` is the name of the `const NAME = <literal>;` that records WHAT
// THE FIGURES WERE MEASURED AT. Patching it simulates the live value having
// moved, without touching the live value — so the test cannot change
// behaviour even if it crashes half way.
//
// ASSERTS, in order: silent when the witness matches; EXACTLY ONE matching
// warning when it is stale; and the file byte-identical afterwards.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const args = {
  file: 'src/game/spawner.js', witness: 'ENVELOPE_X_AT_MEASUREMENT',
  stale: '2.6', match: null, url: '?fixed=1&seed=1',
};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--file') args.file = process.argv[++i];
  else if (a === '--witness') args.witness = process.argv[++i];
  else if (a === '--stale') args.stale = process.argv[++i];
  else if (a === '--match') args.match = process.argv[++i];
  else if (a === '--url') args.url = process.argv[++i];
  else { console.error(`guard_test.mjs: unknown argument "${a}"`); process.exit(2); }
}
const FILE = path.join(ROOT, args.file);
const MATCH = args.match ?? path.basename(args.file);
const saved = readFileSync(FILE, 'utf8');

const re = new RegExp(`(const\\s+${args.witness}\\s*=\\s*)([^;]+);`);
if (!re.test(saved)) {
  console.error(`guard_test.mjs: no \`const ${args.witness} = ...;\` in ${args.file}. ` +
    `FIX THE TEST rather than running it blind.`);
  process.exit(2);
}

const run = async (label) => {
  const server = await createServer({
    root: ROOT, configFile: path.join(ROOT, 'vite.config.js'),
    server: { strictPort: false, host: '127.0.0.1', hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const warns = [];
  try {
    const page = await browser.newPage();
    page.on('console', (m) => {
      if (m.type() === 'warning' || m.type() === 'warn') warns.push(m.text());
    });
    await page.goto(`http://127.0.0.1:${port}/${args.url}`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__step === "function"', { timeout: 25000 });
    await page.evaluate(() => window.__step(5));
  } finally {
    await browser.close();
    await server.close();
  }
  const hits = warns.filter((w) => w.includes(MATCH));
  console.log(`${label}: ${hits.length} matching warning(s)`);
  for (const h of hits) console.log('    ', h.slice(0, 160));
  return hits.length;
};

let ok = 0;
let tot = 0;
const chk = (name, cond) => { tot += 1; ok += cond ? 1 : 0; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`); };
try {
  const quiet = await run('witness MATCHES the live value');
  writeFileSync(FILE, saved.replace(re, `$1${args.stale};`));
  const loud = await run(`witness patched STALE (${args.stale})`);
  chk('silent when the witness matches', quiet === 0);
  chk('exactly one warning when the witness is stale', loud === 1);
} finally {
  writeFileSync(FILE, saved);
  const restored = readFileSync(FILE, 'utf8') === saved;
  chk('file restored byte-identical', restored);
  if (!restored) console.error(`!!! ${args.file} was NOT restored — fix it before doing anything else`);
}
console.log(`${ok}/${tot}`);
if (ok !== tot) process.exitCode = 1;

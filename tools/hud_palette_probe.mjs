#!/usr/bin/env node
// Drives tools/hud-probe.html and prints the HUD's authored-canvas palette
// and antialiasing statistics as a table, for a sweep of reticle attitude
// angles crossed with HUD state variants.
//
// It reads getImageData IN THE PAGE, so no PNG encode/decode sits between
// the canvas and the number — relevant because PNG round-tripping an
// un-premultiplied partial-alpha pixel can change its RGB, and partial alpha
// is the quantity under test.
//
// The page's own instrument control (`__hudProbe.selftest()`) runs FIRST and
// a failure aborts before any figure is printed. One of its five cases plants
// the exact defect being hunted (a stroked diagonal), so a clean run on the
// real HUD cannot be a blind instrument.
//
//   node tools/hud_palette_probe.mjs [--json <file>] [--states a,b] [--angles 0,15,...]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = argv[++i];
    else if (a === '--states') args.states = argv[++i].split(',');
    else if (a === '--angles') args.angles = argv[++i].split(',').map(Number);
    else {
      console.error(`hud_palette_probe.mjs: unknown argument "${a}".\n` +
        'Valid: --json <file> --states a,b --angles 0,15,30\n' +
        'Refusing to run rather than silently measuring something you did not ask for.');
      process.exit(2);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = await puppeteer.launch({
    headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://localhost:${port}/tools/hud-probe.html`, { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 10000 });

    const control = await page.evaluate(() => window.__hudProbe.selftest());
    console.log('INSTRUMENT CONTROL (tools/hud-probe.mjs selftest):');
    let ok = true;
    for (const c of control) {
      // `info: true` cases report a measurement and gate on nothing — see the
      // seam case in tools/hud-probe.mjs for why one of them has to.
      if (!c.info) ok &&= c.pass;
      const tag = c.info ? 'INFO' : (c.pass ? 'PASS' : 'FAIL');
      console.log(`  ${tag}  ${c.name}: ${JSON.stringify(c.got)}`);
    }
    if (!ok) {
      console.error('INSTRUMENT CONTROL FAILED — no figures printed.');
      process.exitCode = 1;
      return;
    }

    const palette = await page.evaluate(() => window.__hudProbe.palette);
    const states = args.states || await page.evaluate(() => window.__hudProbe.states);
    const angles = args.angles || await page.evaluate(() => window.__hudProbe.rollSweep);
    console.log(`\nHUD_PALETTE: ${palette.length} authored colours`);
    console.log(`  ${palette.join(' ')}`);
    console.log(`states: ${states.join(' ')}`);
    console.log(`angles (deg): ${angles.join(' ')}\n`);

    const rows = [];
    for (const s of states) {
      for (const a of angles) {
        rows.push(await page.evaluate((aa, ss) => window.__hudProbe.measure(aa, ss), a, s));
      }
    }

    const hdr = `${'state'.padEnd(9)}${'roll'.padStart(5)}${'ink'.padStart(7)}` +
      `${'partialA'.padStart(9)}${'nAlphas'.padStart(8)}${'colours'.padStart(8)}` +
      `${'offPal'.padStart(7)}${'offPx'.padStart(7)}${'chanVals'.padStart(9)}`;
    console.log(hdr);
    for (const r of rows) {
      console.log(
        `${r.state.padEnd(9)}${String(r.rollDeg).padStart(5)}${String(r.inkPixels).padStart(7)}` +
        `${String(r.partialAlphaCount).padStart(9)}${String(r.distinctPartialAlphas.length).padStart(8)}` +
        `${String(r.opaqueColourCount).padStart(8)}${String(r.offPaletteColours.length).padStart(7)}` +
        `${String(r.offPalettePixels).padStart(7)}${String(r.channelValues.length).padStart(9)}`
      );
    }

    const worst = rows.reduce((m, r) => (r.partialAlphaCount > m.partialAlphaCount ? r : m), rows[0]);
    const totalPartial = rows.reduce((s, r) => s + r.partialAlphaCount, 0);
    const offAll = new Map();
    for (const r of rows) for (const [h, n] of r.offPaletteColours) offAll.set(h, (offAll.get(h) || 0) + n);
    const chanAll = new Set();
    for (const r of rows) for (const v of r.channelValues) chanAll.add(v);

    console.log(`\nSUMMARY over ${rows.length} (state x angle) authored canvases`);
    console.log(`  partial-alpha pixels, total ............ ${totalPartial}`);
    console.log(`  partial-alpha pixels, worst canvas ..... ${worst.partialAlphaCount}` +
      ` (state=${worst.state} roll=${worst.rollDeg})`);
    console.log(`  distinct partial alphas, worst canvas .. ${worst.distinctPartialAlphas.length}` +
      ` ${JSON.stringify(worst.distinctPartialAlphas.slice(0, 24))}`);
    console.log(`  off-palette opaque colours, union ...... ${offAll.size}` +
      ` ${[...offAll.entries()].slice(0, 16).map(([h, n]) => `${h}x${n}`).join(' ')}`);
    console.log(`  channel values over all canvases ....... ${chanAll.size}` +
      ` ${[...chanAll].sort((a, b) => a - b).join(' ')}`);
    console.log('\nGATE  partial-alpha pixels == 0  AND  off-palette opaque colours == 0');

    if (args.json) {
      await writeFile(args.json, JSON.stringify({ palette, rows }, null, 1));
      console.log(`wrote ${args.json}`);
    }
    if (totalPartial !== 0 || offAll.size !== 0) process.exitCode = 3;
  } finally {
    if (errors.length) {
      console.error(`${errors.length} page error(s):`);
      for (const e of errors) console.error(' ', e);
      process.exitCode = 1;
    }
    await browser.close();
    await server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
// Drives tools/fx-probe.html and asserts that every composited element in
// src/effects/ and src/weapons/ renders only its own authored palette.
//
// This is the "audit the class, not the object" half of R6 gap 1. The gap was
// found by a judge measuring a whole frame three rounds after the defect
// shipped; the point of this tool is that the next element to regress is
// caught by a probe instead. `tools/hud_palette_probe.mjs` does exactly this
// for the HUD and is the model — same structure, same gate shape, same
// instrument-control-first discipline.
//
// It reads getImageData IN THE PAGE, so no PNG encode/decode sits between the
// canvas and the number: PNG round-tripping an un-premultiplied partial-alpha
// pixel can change its RGB, and partial alpha is one of the two quantities
// under test.
//
// GATE (hard, exit code 3):
//   * partial-alpha texels == 0 over every element
//   * off-declared-palette opaque texels == 0 over every element
// ADVISORY (reported, not gated):
//   * Criterion A3 per-sprite colour count: <=8 aircraft/vehicle/cloud,
//     <=16 explosion/effect (REFERENCE.md "Criterion A")
//   * channel values off REFERENCE.md's enumerated hardware ladder. Not a
//     gate because REFERENCE.md says explicitly not to make it one ("a +-1
//     level difference is visually nil ... enforce <=32 distinct values per
//     channel, and treat the table as the palette to author against"), but
//     it is the single cheapest way to keep the frame-wide A2 union inside
//     32, so a non-zero count here is worth a look.
//
//   node tools/fx_palette_probe.mjs [--json <file>]
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const A3_CEILING = { effect: 16, vehicle: 8, aircraft: 8, cloud: 8 };

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') args.json = argv[++i];
    else {
      console.error(`fx_palette_probe.mjs: unknown argument "${argv[i]}".\n` +
        'Valid: --json <file>\n' +
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
    await page.goto(`http://localhost:${port}/tools/fx-probe.html`, { waitUntil: 'load' });
    await page.waitForFunction('window.__frameReady === true', { timeout: 15000 });

    const control = await page.evaluate(() => window.__fxProbe.selftest());
    console.log('INSTRUMENT CONTROL (tools/fx-probe.mjs selftest):');
    let ok = true;
    for (const c of control) {
      ok &&= c.pass;
      console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}: ${JSON.stringify(c.got)}`);
    }
    if (!ok) {
      console.error('INSTRUMENT CONTROL FAILED — no figures printed.');
      process.exitCode = 1;
      return;
    }

    const rows = await page.evaluate(() => window.__fxProbe.rows);
    const hdr = `\n${'element'.padEnd(20)}${'size'.padStart(8)}${'px'.padStart(7)}` +
      `${'decl'.padStart(6)}${'colours'.padStart(8)}${'partialA'.padStart(9)}` +
      `${'offPal'.padStart(7)}${'chanVals'.padStart(9)}${'offLadder'.padStart(10)}${'  A3'}`;
    console.log(hdr);
    for (const r of rows) {
      const ceil = A3_CEILING[r.kind] ?? 16;
      console.log(
        `${r.name.padEnd(20)}${`${r.w}x${r.h}`.padStart(8)}${String(r.opaquePixels).padStart(7)}` +
        `${String(r.declaredCount).padStart(6)}${String(r.colours.length).padStart(8)}` +
        `${String(r.partialCount).padStart(9)}${String(r.offPalette.length).padStart(7)}` +
        `${String(r.channelValues.length).padStart(9)}${String(r.offLadder.length).padStart(10)}` +
        `  ${r.colours.length <= ceil ? 'ok' : `OVER ${ceil}`}`
      );
    }

    const totalPartial = rows.reduce((s, r) => s + r.partialCount, 0);
    const offAll = new Map();
    for (const r of rows) for (const [h, n] of r.offPalette) offAll.set(h, (offAll.get(h) ?? 0) + n);
    const chanAll = new Set();
    const ladderAll = new Set();
    for (const r of rows) {
      for (const v of r.channelValues) chanAll.add(v);
      for (const v of r.offLadder) ladderAll.add(v);
    }
    const undeclared = rows.filter((r) => r.declaredCount === 0).map((r) => r.name);
    const a3 = rows.filter((r) => r.colours.length > (A3_CEILING[r.kind] ?? 16)).map((r) => r.name);

    console.log(`\nSUMMARY over ${rows.length} authored canvases`);
    console.log(`  partial-alpha texels, total ............ ${totalPartial}`);
    console.log(`  off-palette opaque colours, union ...... ${offAll.size}` +
      ` ${[...offAll.entries()].slice(0, 16).map(([h, n]) => `${h}x${n}`).join(' ')}`);
    console.log(`  elements with NO declared palette ...... ${undeclared.length}` +
      ` ${undeclared.join(' ')}`);
    console.log(`  channel values over all elements ....... ${chanAll.size}`);
    console.log(`  of those, OFF the hardware ladder ...... ${ladderAll.size}` +
      ` ${[...ladderAll].sort((a, b) => a - b).join(' ')}`);
    console.log(`  Criterion A3 over ceiling .............. ${a3.length} ${a3.join(' ')}`);
    console.log('\nGATE  partial-alpha texels == 0  AND  off-palette opaque colours == 0' +
      '  AND  every element declares a palette');

    if (args.json) {
      await writeFile(args.json, JSON.stringify({ control, rows }, null, 1));
      console.log(`wrote ${args.json}`);
    }
    if (totalPartial !== 0 || offAll.size !== 0 || undeclared.length !== 0) process.exitCode = 3;
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

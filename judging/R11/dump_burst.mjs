// Dump the AUTHORED burst canvases (and the chunk canvases) to PNG, one file
// per [phase][arrangement], at native texel size.
//
// WHY THIS AND NOT A CAPTURE. The shape statistics this round measures
// (`fill`, `spread`, `ncomp` — judging/R11/fx_r11.py) are properties of the
// ARRANGEMENT, and in a live frame our explosion is drawn on top of the
// player's own jet with its two orange nozzle discs, which are the two
// largest competitors in the frame on our side (R10 lane-envelope §6.3) and
// which `?combatexpl=1` puts directly behind the fireball. Measuring the
// authored canvas removes every one of those: no sky, no jet, no depth, no
// resampling, no attribution question at all. CLAUDE.md: "isolation harnesses
// beat in-situ measurement".
//
// WHAT IT CANNOT SEE, and the in-situ capture is still taken for it: the
// per-tick SCHEDULE (which texture is on screen at which tick, and at what
// `grow` scale), the debris chunks' positions, and anything the compositor
// does. The schedule is read off explosions.js and stated; the rest is
// corroborated in situ.
//
//   node judging/R11/dump_burst.mjs --out <dir>
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--out') args.out = process.argv[++i];
  else {
    console.error(`dump_burst.mjs: unknown argument "${process.argv[i]}". Valid: --out <dir>`);
    process.exit(2);
  }
}
if (!args.out) {
  console.error('dump_burst.mjs: --out <dir> is required (no default, on purpose).');
  process.exit(2);
}

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

  const shots = await page.evaluate(async () => {
    const m = await import('/src/effects/explosions.js');
    const out = [];
    const toPng = (canvas) => canvas.toDataURL('image/png').split(',')[1];
    m.burstTexturesForProbe().forEach((phase, p) => phase.forEach((t, a) => {
      out.push({ name: `burst-p${p}a${a}`, w: t.image.width, h: t.image.height, png: toPng(t.image) });
    }));
    m.chunkTexturesForProbe().forEach((t, i) => {
      out.push({ name: `chunk-${i}`, w: t.image.width, h: t.image.height, png: toPng(t.image) });
    });
    return out;
  });

  await mkdir(args.out, { recursive: true });
  for (const s of shots) {
    await writeFile(path.join(args.out, `${s.name}.png`), Buffer.from(s.png, 'base64'));
    console.log(`${s.name}  ${s.w}x${s.h}`);
  }
  console.log(`wrote ${shots.length} canvases to ${args.out}`);
} finally {
  if (errors.length) {
    console.error(`${errors.length} page error(s):`);
    for (const e of errors) console.error(' ', e);
    process.exitCode = 1;
  }
  await browser.close();
  await server.close();
}

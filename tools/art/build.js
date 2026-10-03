// Build-all entry point for authored sprite sheets. Each sheet module
// exports a build*Sheet() function returning a PixelCanvas; this script
// writes the sheet to src/assets/sprites/ and a nearest-neighbour zoomed
// copy to tools/out/art-zoom/ for visual inspection against reference/.
import { buildPlayerF14Sheet } from './sheets/player-f14.js';
import { buildEnemyMigRearSheet, buildEnemyMigHeadSheet } from './sheets/enemy-mig.js';
import { buildExplosionSheet } from './sheets/explosion.js';
import { buildFontSheet } from './sheets/font.js';
import { buildExplosionBigSheet } from './sheets/explosion-big.js';
import { buildDebrisSheet } from './sheets/debris.js';
import { buildSmokePuffSheet } from './sheets/smoke-puff.js';
import { buildMissileSheet } from './sheets/missile.js';

const OUT_DIR = new URL('../../src/assets/sprites/', import.meta.url).pathname;
const ZOOM_DIR = new URL('../out/art-zoom/', import.meta.url).pathname;

const SHEETS = {
  'player-f14.png': { build: buildPlayerF14Sheet, zoom: 8 },
  'enemy-mig-rear.png': { build: buildEnemyMigRearSheet, zoom: 10 },
  'enemy-mig-head.png': { build: buildEnemyMigHeadSheet, zoom: 10 },
  'explosion.png': { build: buildExplosionSheet, zoom: 6 },
  'font-5x7.png': { build: buildFontSheet, zoom: 8 },
  'explosion-big.png': { build: buildExplosionBigSheet, zoom: 3 },
  'debris.png': { build: buildDebrisSheet, zoom: 20 },
  'smoke-puff.png': { build: buildSmokePuffSheet, zoom: 12 },
  'missile.png': { build: buildMissileSheet, zoom: 14 },
};

const only = process.argv[2];
for (const [name, { build, zoom }] of Object.entries(SHEETS)) {
  if (only && name !== only) continue;
  const sheet = build();
  const outPath = OUT_DIR + name;
  sheet.writeFile(outPath);
  const z = sheet.zoom(zoom);
  z.writeFile(ZOOM_DIR + name.replace('.png', `.zoom${zoom}x.png`));
  const colours = sheet.countColours();
  console.log(`${name}: ${sheet.width}x${sheet.height}, ${colours.size} unique colours -> ${outPath}`);
}

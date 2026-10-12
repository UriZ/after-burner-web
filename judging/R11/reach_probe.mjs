// REACHABILITY CENSUS — what fraction of the traffic the player can physically
// bring the lock cone onto, read from the simulation's own state.
//
// WHY A NEW PROBE AND NOT A PIXEL MEASUREMENT. Every quantity here is exact in
// the simulation and would be an inference from pixels: the enemy's screen x,
// its depth, and the player's own reachable NDC box. `tools/combat_probe.mjs`
// already prints the enemy half per tick; this adds the half nobody has had,
// which is the player's NDC envelope MEASURED rather than converted from
// `ENVELOPE_X`'s world units by hand.
//
//                        --- THE OPERATOR ---
//
// An enemy is ENGAGEABLE if there exists a tick of its life at which some
// player position inside the reachable NDC box puts it inside the lock cone:
//
//     exists t:  LOCK_DEPTH_MIN <= d(t) <= LOCK_DEPTH_MAX
//          and   dist( enemy.ndc(t), clamp(enemy.ndc(t), box) ) <= LOCK_RADIUS
//
// in the lock test's OWN units — `dx = dNDCx * 0.5`, `dy = dNDCy * 0.5 *
// (224/320)`, radius `LOCK_RADIUS_FRAC` — read off `lockSystem.js:_lockable`
// rather than restated, so the two cannot drift.
//
// THIS IS AN UPPER BOUND ON WHAT A PILOT CAN ACTUALLY FIGHT, and deliberately
// so. It gives the player the best position available at every instant, with
// no travel time, no reaction, and no competing target. A real pilot gets less.
// A target this operator calls unengageable cannot be engaged by anyone.
//
// THE NDC BOX IS MEASURED, NOT CONVERTED. `player.js ENVELOPE_X` is in WORLD
// units; the lock cone and the enemy path are in NDC; and this repo has
// already lost a round to two different NDC bases with near-identical names
// (`__flowState().jetNdcY` is the sprite anchor through the real camera,
// `__fairness().playerNdc` is the pitch-only basis `space.worldToNdc` uses).
// The enemy's `ndc` comes from `space`, so `playerNdc` is the one that shares
// its frame, and the box is found by driving the stick to each rail and
// reading it back.
//
//   node judging/R11/reach_probe.mjs --ticks 5400 --url-params "demo=2&seed=1" --out f.json
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF_ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const args = { ticks: 5400, urlParams: 'demo=2&seed=1', out: null, settle: 120, root: null, grid: 13 };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--ticks') args.ticks = Number(process.argv[++i]);
  else if (a === '--url-params') args.urlParams = process.argv[++i];
  else if (a === '--out') args.out = process.argv[++i];
  else if (a === '--settle') args.settle = Number(process.argv[++i]);
  // --root serves a DIFFERENT TREE, so a before/after is two pristine
  // extractions rather than one tree edited twice. `git archive <sha> | tar -x`
  // into a temp dir; the sha goes in the output and on every figure.
  else if (a === '--root') args.root = process.argv[++i];
  else if (a === '--grid') args.grid = Number(process.argv[++i]);
  else { console.error(`reach_probe.mjs: unknown argument "${a}"`); process.exit(2); }
}
if (!args.out) { console.error('reach_probe.mjs: --out is required (no default, on purpose).'); process.exit(2); }

const ROOT = args.root ? path.resolve(args.root) : SELF_ROOT;
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
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

  // ---- pass 1: the NDC envelope, measured on a separate load ---------------
  // Separate, because driving the stick to the rails perturbs the scenario and
  // the census must see the unperturbed one.
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&invincible=1&${args.urlParams.replace(/demo=\d/, 'demo=0')}`,
    { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__step === "function" && typeof window.__setStick === "function"',
    { timeout: 20000 });
  const box = await page.evaluate(async (settle, GRID_N) => {
    // BOTH NDC bases, every time. `__flowState().jetNdcX` is the sprite
    // anchor through the real camera and `__fairness().playerNdc` is the
    // pitch-only basis `space.worldToNdc` uses; this repo has already lost a
    // round to reading one and quoting the other, and the lock cone and the
    // enemy path both live in the SECOND one.
    const read = () => {
      const f = window.__fairness ? window.__fairness() : null;
      const g = window.__flowState ? window.__flowState() : null;
      const h = window.__sight ? window.__sight() : null;
      return {
        x: f?.playerNdc?.x ?? null, y: f?.playerNdc?.y ?? null,
        jetX: g?.jetNdcX ?? null, jetY: g?.jetNdcY ?? null,
        sightX: h?.x ?? h?.sight?.x ?? null,
      };
    };
    const drive = (sx, sy) => {
      window.__setStick({ x: sx, y: sy });
      window.__step(settle);
      return read();
    };
    const out = {};
    out.centre = drive(0, 0);
    out.right = drive(1, 0);
    out.left = drive(-1, 0);
    out.up = drive(0, 1);
    out.down = drive(0, -1);
    // THE REACHABLE SET IS NOT A BOX, and the four rails above are what shows
    // it. In this basis full LATERAL stick also moves the player 0.33 NDC
    // VERTICALLY, because `space.worldToNdc`'s frame rotates with the world
    // roll and a lateral input rolls the jet. So the set is sampled on a grid
    // of stick positions and carried as a point cloud; any "box" taken from
    // the four rails alone would claim corners the player cannot reach and
    // would overstate what is engageable.
    out.grid = [];
    const N = GRID_N;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const sx = -1 + (2 * i) / (N - 1);
        const sy = -1 + (2 * j) / (N - 1);
        const p = drive(sx, sy);
        out.grid.push([Number(sx.toFixed(3)), Number(sy.toFixed(3)),
          Number(p.x.toFixed(5)), Number(p.y.toFixed(5)),
          Number(p.jetX.toFixed(5)), Number(p.jetY.toFixed(5))]);
      }
    }
    window.__setStick(null);
    return out;
  }, args.settle, args.grid);
  if (!box.right) throw new Error('reach_probe: __fairness().playerNdc unavailable');

  // ---- pass 2: the census, on a clean load, stick never touched ------------
  await page.goto(`http://127.0.0.1:${port}/?fixed=1&invincible=1&${args.urlParams}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__step === "function"', { timeout: 20000 });
  const rows = await page.evaluate(async (ticks) => {
    const out = [];
    for (let i = 0; i < ticks; i++) {
      window.__step(1);
      const s = window.__combatStats();
      for (const e of s.enemies) {
        out.push([i, e.id, e.pattern, Number(e.ndcX.toFixed(5)), Number(e.ndcY.toFixed(5)),
          Number(e.depth.toFixed(4)), Number(e.spanFrac.toFixed(5))]);
      }
    }
    return out;
  }, args.ticks);

  await writeFile(args.out, JSON.stringify({
    urlParams: args.urlParams, ticks: args.ticks, root: ROOT, grid: args.grid, box, rows,
    cols: ['tick', 'id', 'pattern', 'ndcX', 'ndcY', 'depth', 'spanFrac'],
  }));
  const ids = new Set(rows.map((r) => r[1]));
  console.log(`${args.out}: ${rows.length} samples, ${ids.size} enemies, ${args.ticks} ticks`);
  console.log(`NDC box: x [${box.left.x.toFixed(4)}, ${box.right.x.toFixed(4)}]  ` +
    `y [${box.down.y.toFixed(4)}, ${box.up.y.toFixed(4)}]  centre ` +
    `(${box.centre.x.toFixed(4)}, ${box.centre.y.toFixed(4)})`);
  if (errs.length) { console.error(`${errs.length} page error(s):`, errs.slice(0, 5)); process.exitCode = 1; }
} finally {
  await browser.close();
  await server.close();
}

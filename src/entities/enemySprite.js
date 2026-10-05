import * as THREE from 'three';
import {
  createPixelBuffer,
  fillPolygonHard,
  fillRectHard,
  fillCircleHard,
  addKeyline,
  bufferToTexture,
} from '../render/spriteFactory.js';
// Real authored sheets, shipped by the pixel-artist lane
// (tools/art/sheets/enemy-mig.js): 5 bank poses per aspect, 64x32/cell.
// R5b: ONE SHEET PER LIVERY, and TWO silhouette families across them --
// 'mig' (thin high-aspect swept wings, separate tailplanes, one fin) for
// grey/camo, 'delta' (one solid triangle, no tailplane, fatter body) for
// interceptor/prop. That is R4 gap 1 criterion (d), ">=2 distinguishable
// types by silhouette at >=15%W", which four recolours of one aeroplane did
// not satisfy. Neither family resembles the player's twin-nacelle
// twin-blade F-14, which is the other readability requirement.
// Day palettes only; NIGHT still falls back to the procedural draw
// functions below.
import enemyGreyHeadSheetUrl from '../assets/sprites/enemy-grey-head.png';
import enemyGreyRearSheetUrl from '../assets/sprites/enemy-grey-rear.png';
import enemyCamoHeadSheetUrl from '../assets/sprites/enemy-camo-head.png';
import enemyCamoRearSheetUrl from '../assets/sprites/enemy-camo-rear.png';
import enemyInterceptorHeadSheetUrl from '../assets/sprites/enemy-interceptor-head.png';
import enemyInterceptorRearSheetUrl from '../assets/sprites/enemy-interceptor-rear.png';
import enemyPropHeadSheetUrl from '../assets/sprites/enemy-prop-head.png';
import enemyPropRearSheetUrl from '../assets/sprites/enemy-prop-rear.png';

// Enemy aircraft sprites.
//
// REDESIGNED R5 (art critique rank 4, §2.2 "they read as insects, and they
// are invisible"; R5 interfaces I1/I2). R4's sprite was dominant V78
// (#c7c7c7, 1.46:1 contrast against the #009fff sky) with big soft
// ctx.arc nose/nozzle discs -- "a grey slab with a bullseye" (R4 judge),
// reading as an insect with two glowing eyes at mid-distance. Two
// independent measurements corroborate the fix: the art critique's
// close-up MiG crop (dominant #102910 at V0.16, ~6:1 contrast) and
// combatfx-r5's own pass on stage1-missile-salvo-t100.75.png (I2: "the
// three stage-1 rear-aspect jets have near-black nozzle rings with a hot
// orange centre, and the airframe reads mid-grey against the sky, not
// white"). So: dark-DOMINANT airframe, small nose/nozzle cores ringed in
// black, same hard-pixel/keyline treatment as the player jet (no Canvas2D
// antialiasing feeding the colour-cardinality gate -- see the big comment
// in render/spriteFactory.js).
//
// GAME_SPEC.md §4 "Liveries observed": white/grey MiG-types (stage 1+),
// dark green/black camo (stage 2), red/orange-fuselage interceptors
// (t102.5, t172), silver/blue prop types (stage 2 open). R5 interfaces I1
// (combatfx-r5, APPROVED): export LIVERIES + enemyTexture(aspect, livery,
// detail), memoised per combination; the existing four no-arg getters stay
// as thin wrappers over enemyTexture(aspect, 'grey', detail) so nothing
// else in the tree needs to change. combatfx-r5 owns WHICH livery an enemy
// gets and WHEN; this file owns silhouettes, colours and drawing only.
//
//   head-on: reference/ab2-arcade-closeup-enemies.jpg — round nose intake,
//            swept wings end to end, twin canted fins above the spine, low
//            horizontal stabilisers.
//   rear:    reference/stage1-missile-salvo-t100.75.png — the three grey
//            jets around the salvo are rear-aspect: swept wings, dark
//            airframe, two round dark nozzle rings with hot centres.
//
// ---------------------------------------------------------------------------
// EACH ASPECT HAS TWO ZOOM LEVELS, AND THAT IS NOT AN OPTIMISATION.
//
// An enemy spans 2.5 native px at spawn and 87 at fly-past. Rendering one
// 64x32 texture across that whole range fails at BOTH ends, and both
// failures were measured on captures before this design existed:
//
//   * With mipmaps (LinearMipmapLinear): the aircraft renders as a
//     translucent blue-grey GHOST at every size. Mipmapping a
//     non-premultiplied sprite averages the transparent surround into colour
//     and alpha, and this silhouette is mostly thin features, so one mip
//     level roughly halves its opacity. Measured on
//     tools/out/combat-r3-01/frame-0008.png: a 17 px enemy whose pixels were
//     all blended sky, no airframe colour present at all.
//   * With NearestFilter and no mipmaps: the far-field aircraft DISAPPEARS.
//     Point sampling a 64x32 texture at 2-6 screen px lands on transparent
//     texels. Measured on tools/out/combat-r3-05-solo: 27 of the first 80
//     frames of an approach rendered ZERO pixels, and the measured width
//     oscillated 6 -> 18 -> 6 native px while the subject was monotonically
//     approaching. That is precisely the popping that the R2 report's gap-5
//     criterion exists to catch, arriving by a different route than a frozen
//     scale table.
//
// So: a chunky FAR sprite below ~12 native px and the detailed one above,
// which is what the Super Scaler hardware did (distinct sprites per zoom
// band), and both are authored to satisfy one invariant:
//
//   THE FULL-WIDTH-BAND INVARIANT. Every texture below has a horizontal band
//   of fully opaque, wingtip-to-wingtip rows covering at least the middle
//   ~22% of its canvas height, centred on the canvas midline. Nearest
//   sampling of an H-pixel-tall render takes rows at v = (j+0.5)/H, spaced
//   1/H apart, so once H exceeds ~4.6 at least one sampled row MUST land
//   inside a 0.22-tall band: the sprite can never render narrower than its
//   quad, and measured span is exactly worldWidth/(frustum width at depth)
//   at every size. The far sprites use a band covering the middle half, so
//   the invariant holds for them down to H = 1.
//
//   Consequence for anyone editing these: do not thin the wingtips, do not
//   inset them from the canvas edge, and do not change a canvas height
//   without re-checking the band fraction. The continuous-scaling
//   measurement depends on it, not just on the absence of a scale table.
//   (The redesign below keeps the wing rows exactly where they were;
//   only fill colours and the nose/nozzle feature sizes changed.)
// ---------------------------------------------------------------------------

const W = 64;
const H = 32;
const FW = 16;
const FH = 8;

// Projected width, in native (320-wide frame) px, at which the detailed
// sprite takes over from the far one. Set from the invariant above: the
// detail textures' wingtip band spans rows 15-22 of 32 = 0.25 of canvas
// height, so it needs the sprite to be more than 1/0.25 = 4 px tall, i.e.
// more than 8 px wide at the 2:1 sprite aspect. 10 leaves margin for the
// non-integral row counts a non-integer sprite height produces.
export const DETAIL_SWITCH_NATIVE_PX = 10;

// --- Liveries (REFERENCE.md §3 "Enemy MiG — 8 colours, dark-dominant";
// GAME_SPEC.md §4 liveries). Every hex is on the Sega 5-bit ladder (channel
// values in {0,16,25,33,41,49,58,66,74,82,91,99,107,115,123,132,140,148,
// 156,164,173,181,189,197,206,214,222,230,239,247,255}). `dominant` is the
// near-black base covering the bulk of the airframe (the single value the
// R4 critique measured at 1.46:1 contrast as #c7c7c7 and that this redesign
// exists to fix); `nose`/`core` are shared between the nose-intake annulus
// and the nozzle hot centre so the 8-colour budget covers both features.
export const LIVERIES = {
  // stage 1+, white/grey MiG-types (GAME_SPEC). Dark-dominant per I2: "the
  // airframe reads mid-grey against the sky, not white".
  grey: {
    key: '#000000',
    dominant: '#31313a',
    mid: '#4a4a52',
    highlight: '#6b6b7b',
    sunlit: '#9494a4',
    nose: '#e61000',
    core: '#f7efa5',
    hot: '#ff9c29',
    night: { dominant: '#212131', mid: '#3a3a4a', highlight: '#5b5b73', sunlit: '#7b7b94' },
  },
  // stage 2, dark green/black camo. Measured directly off
  // ab2-arcade-closeup-enemies.jpg (art-critique.md §3): dominant
  // #102910 at V0.16, ~27% of the sprite's pixels.
  camo: {
    key: '#000000',
    dominant: '#102910',
    mid: '#2d4a21',
    highlight: '#8cad31',
    sunlit: '#ce8c31',
    nose: '#e61000',
    core: '#f7efa5',
    hot: '#ff9c29',
    night: { dominant: '#102129', mid: '#213a42', highlight: '#4a6b52', sunlit: '#6b8c6b' },
  },
  // red/orange-fuselage interceptors (t102.5, t172).
  interceptor: {
    key: '#000000',
    dominant: '#4a1010',
    mid: '#8c2910',
    highlight: '#d64a19',
    sunlit: '#ef8429',
    nose: '#e61000',
    core: '#f7efa5',
    hot: '#ff9c29',
    night: { dominant: '#291021', mid: '#4a213a', highlight: '#8c4a5b', sunlit: '#ad6b74' },
  },
  // silver/blue prop types (stage 2 open).
  prop: {
    key: '#000000',
    dominant: '#313a4a',
    mid: '#525b6b',
    highlight: '#848c9c',
    sunlit: '#b5bdc5',
    nose: '#e61000',
    core: '#f7efa5',
    hot: '#ff9c29',
    night: { dominant: '#21293a', mid: '#3a425b', highlight: '#5b6b84', sunlit: '#848ca4' },
  },
};

function resolvePalette(liveryKey, night) {
  const base = LIVERIES[liveryKey] ?? LIVERIES.grey;
  if (!night) return base;
  return { ...base, dominant: base.night.dominant, mid: base.night.mid, highlight: base.night.highlight, sunlit: base.night.sunlit };
}

// --- Head-on approaching fighter (detail) ----------------------------------
// Wingtips span rows 15-22 (the invariant band) and columns 0 and 63.
function drawHeadOn(buf, pal) {
  const cx = 32;

  // Twin canted fins above the spine (closeup-enemies: clearly separated and
  // angled, not one tall rudder).
  fillPolygonHard(buf, [[cx - 10, 3], [cx - 5, 13], [cx - 2, 13], [cx - 5, 3]], pal.mid);
  fillPolygonHard(buf, [[cx + 10, 3], [cx + 5, 13], [cx + 2, 13], [cx + 5, 3]], pal.mid);

  // Swept wings, wingtip to wingtip across the full canvas width. Thick at
  // the tip by design (see the invariant note above).
  fillPolygonHard(buf, [[cx - 7, 11], [-2, 15], [-2, 22], [cx - 7, 21]], pal.dominant);
  fillPolygonHard(buf, [[cx + 7, 11], [W + 2, 15], [W + 2, 22], [cx + 7, 21]], pal.dominant);

  // Leading-edge specular stripe and trailing-edge mid-tone: the value
  // ladder that keeps the sprite from reading as one flat fill.
  fillPolygonHard(buf, [[cx - 7, 11], [0, 15], [0, 17], [cx - 7, 14]], pal.highlight);
  fillPolygonHard(buf, [[cx + 7, 11], [W, 15], [W, 17], [cx + 7, 14]], pal.highlight);
  fillPolygonHard(buf, [[cx - 7, 19], [0, 20], [0, 22], [cx - 7, 21]], pal.mid);
  fillPolygonHard(buf, [[cx + 7, 19], [W, 20], [W, 22], [cx + 7, 21]], pal.mid);

  // Low horizontal stabilisers.
  fillRectHard(buf, cx - 15, 25, 10, 2, pal.mid);
  fillRectHard(buf, cx + 5, 25, 10, 2, pal.mid);

  // Fuselage barrel.
  fillRectHard(buf, cx - 6, 9, 12, 19, pal.dominant);
  fillRectHard(buf, cx + 2, 9, 4, 19, pal.sunlit); // right-side sunlit panel
  fillRectHard(buf, cx - 6, 26, 12, 2, pal.mid); // belly

  // Nose intake: dark ring with a red annulus and a small pale core, dead
  // centre. Shrunk ~60% from R4 (outer r 6 -> 2.6, ~8% of span, matching
  // the arcade's ~8% versus R4's 19% "bullseye").
  fillCircleHard(buf, cx, 18, 2.6, pal.key);
  fillCircleHard(buf, cx, 18, 1.8, pal.nose);
  fillCircleHard(buf, cx, 18, 0.8, pal.core);
}

// --- Rear-aspect receding fighter, detail (stage opener overtake flight) ----
function drawRear(buf, pal) {
  const cx = 32;

  fillPolygonHard(buf, [[cx - 8, 4], [cx - 4, 13], [cx - 1, 13], [cx - 4, 4]], pal.mid);
  fillPolygonHard(buf, [[cx + 8, 4], [cx + 4, 13], [cx + 1, 13], [cx + 4, 4]], pal.mid);

  // Wings: tips trail upward toward the horizon, the mirror of the head-on
  // sweep, matching the receding jets in
  // reference/stage1-missile-salvo-t100.75.png. Tips span rows 14-22, inside
  // the invariant band.
  fillPolygonHard(buf, [[cx - 7, 14], [-2, 14], [-2, 22], [cx - 7, 21]], pal.dominant);
  fillPolygonHard(buf, [[cx + 7, 14], [W + 2, 14], [W + 2, 22], [cx + 7, 21]], pal.dominant);
  fillRectHard(buf, 1, 15, 24, 2, pal.highlight);
  fillRectHard(buf, 39, 15, 24, 2, pal.highlight);

  fillRectHard(buf, cx - 7, 12, 14, 12, pal.dominant);
  fillRectHard(buf, cx + 1, 12, 6, 12, pal.sunlit);

  // Twin nozzles: small discs inside BLACK rings -- I2: "near-black nozzle
  // rings with a hot orange centre". Shrunk ~60% from R4 (outer r 5 -> 2,
  // hot r 3 -> 1.2) so the dark ring wins instead of the glow, which is the
  // R4 "two glowing eyes" defect.
  for (const nx of [cx - 4, cx + 4]) {
    fillCircleHard(buf, nx, 19, 2, pal.key);
    fillCircleHard(buf, nx, 19, 1.2, pal.hot);
    fillCircleHard(buf, nx, 19, 0.5, pal.core);
  }

  fillRectHard(buf, cx - 7, 23, 14, 1, pal.mid);
}

// --- Far zoom level, 16x8 --------------------------------------------------
// FULLY OPAQUE — every one of the 128 texels. This is stronger than the
// band invariant and it is deliberate: at 3-9 native px the sprite is 1-4
// screen rows tall, and when only ONE row is covered its sampled v is
// effectively arbitrary, so ANY transparent row is a frame where the
// aircraft vanishes. The first version of this texture left rows 0 and 7
// empty and that is exactly what happened — 2 dropped frames out of the ~20
// spent at 4 native px in tools/out/combat-r3-06-solo, a 1-in-8 flicker.
// Full coverage makes the measured span identically equal to the quad width
// at every size, which is what the continuous-scaling measurement needs.
//
// Reading as an aircraft is handled by VALUE, not by shape: a lighter
// full-width wing band through the middle, darker rows top and bottom, and a
// single dark nose pixel. At 3-9 px that is what AB2's distant enemies are
// (reference/stage1-level-flight-t116.png: the bracketed enemy at ~(415,210)
// is a handful of dark pixels, no silhouette).
function drawHeadOnFar(buf, pal) {
  fillRectHard(buf, 0, 0, FW, FH, pal.dominant); // base: every texel opaque
  fillRectHard(buf, 0, 2, FW, 4, pal.mid); // full-width wing band
  fillRectHard(buf, 5, 1, 6, 6, pal.highlight); // fuselage
  fillRectHard(buf, 7, 3, 2, 2, pal.key); // nose intake, the one dark accent
}

function drawRearFar(buf, pal) {
  fillRectHard(buf, 0, 0, FW, FH, pal.dominant);
  fillRectHard(buf, 0, 2, FW, 4, pal.mid);
  fillRectHard(buf, 5, 1, 6, 6, pal.highlight);
  // Two hot nozzle pixels — at this size the glow is the only thing that
  // distinguishes a receding enemy from an approaching one, and the stage
  // opener depends on reading as receding.
  fillRectHard(buf, 6, 3, 1, 2, pal.hot);
  fillRectHard(buf, 9, 3, 1, 2, pal.hot);
}

function buildTexture(drawFn, w, h, pal, { keyline = true } = {}) {
  const buf = createPixelBuffer(w, h);
  drawFn(buf, pal);
  if (keyline) addKeyline(buf, pal.key);
  const tex = bufferToTexture(buf);
  // Asserted rather than inherited: the filtering choice is the subject of
  // the note above and a silent change in bufferToTexture would bring the
  // ghost-aircraft bug back.
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const cache = new Map();

// --- Real authored sheets (see the top-of-file import note). Loaded once,
// eagerly, at module import time -- enemyTexture() below must stay
// SYNCHRONOUS (entities/enemy.js, which this lane does not own, fetches a
// texture once at spawn time), so a sheet that hasn't finished decoding yet
// just isn't used for the enemies spawned before it resolves; the
// procedural palette is the fallback, same contract as the player's pose
// sheet in render/spriteFactory.js.
//
// FULL-WIDTH-BAND INVARIANT, re-checked against the real art: the
// procedural textures above guarantee it by construction (opaque wingtip
// band across >=22% of height); the hand-drawn sheet does NOT -- it has
// ZERO fully-opaque rows (thin blade wings, sky between them, per the
// pixel-artist lane's own comment in tools/art/sheets/enemy-mig.js). That
// looked like a direct reintroduction of the R3 "enemy disappears"
// popping bug, so before wiring this in it was checked the way that bug
// was originally found: simulating NearestFilter point-sampling (texel
// row/col = floor(v*dim) at v=(j+0.5)/render_px) over every quad size from
// 6-24 screen px (2:1 aspect) against all 5 poses of both sheets. Result:
// ZERO fully-invisible frames at any size >= the DETAIL_SWITCH_NATIVE_PX
// threshold (10px) -- the only invisible combos found at all were at W<=2
// screen px, already inside the FAR-LOD range, which does not use this
// sheet. The weaker guarantee that actually matters ("some pixel always
// samples opaque") holds without the literal full-width band because the
// real art's features (nose, wings, nozzles) are spread across both axes
// widely enough. Script: tools/out/_scratch-jet-harness (dev-report-only,
// not committed) -- re-run it if the sheet art changes shape again.
const SHEET_BANK_ANGLES = [-30, -15, 0, 15, 30];
const SHEET_CELL_W = 64;
const SHEET_CELL_H = 32;
// Keyed `${livery}|${aspect}` -- one authored sheet per combination.
const SHEET_URLS = {
  'grey|headOn': enemyGreyHeadSheetUrl,
  'grey|rear': enemyGreyRearSheetUrl,
  'camo|headOn': enemyCamoHeadSheetUrl,
  'camo|rear': enemyCamoRearSheetUrl,
  'interceptor|headOn': enemyInterceptorHeadSheetUrl,
  'interceptor|rear': enemyInterceptorRearSheetUrl,
  'prop|headOn': enemyPropHeadSheetUrl,
  'prop|rear': enemyPropRearSheetUrl,
};
const sheetImages = new Map(); // key -> HTMLImageElement once loaded
const sheetCellCache = new Map();

function loadSheetImage(key, url) {
  const loader = new THREE.ImageLoader();
  loader.load(
    url,
    (image) => { sheetImages.set(key, image); },
    undefined,
    () => { /* decode failure: stay absent, procedural fallback holds */ }
  );
}
for (const [key, url] of Object.entries(SHEET_URLS)) loadSheetImage(key, url);

// Crops one cell out of a loaded sheet image into its own hard-edged
// texture (nearest-neighbour `drawImage`, integer cell boundaries -- no
// resampling blur). Cached per (aspect, cellIndex).
function sheetCellTexture(livery, aspect, cellIndex) {
  const sheetKey = `${livery}|${aspect}`;
  const key = `${sheetKey}|${cellIndex}`;
  let tex = sheetCellCache.get(key);
  if (tex) return tex;
  const image = sheetImages.get(sheetKey);
  if (!image) return null;

  const canvas = document.createElement('canvas');
  canvas.width = SHEET_CELL_W;
  canvas.height = SHEET_CELL_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    image,
    cellIndex * SHEET_CELL_W, 0, SHEET_CELL_W, SHEET_CELL_H,
    0, 0, SHEET_CELL_W, SHEET_CELL_H
  );
  tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  sheetCellCache.set(key, tex);
  return tex;
}

function nearestBankIndex(bankDeg) {
  let best = 0;
  let bestDist = Infinity;
  SHEET_BANK_ANGLES.forEach((a, i) => {
    const dist = Math.abs(a - bankDeg);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

// R5 interfaces I1 (approved): the enemy livery API combatfx-r5 is blocked
// on. `aspect`: 'headOn' | 'rear'. `livery`: a key of LIVERIES. `detail`:
// true = near (64x32) texture, false = far (16x8) LOD. `night`: palette
// swap per-livery (REFERENCE.md "Night palette swap" / I3 — enemies get the
// same treatment as the player). `bankDeg`: optional signed bank angle
// (degrees) used ONLY to pick a cell from the real 'grey' sheet once it has
// loaded; every other livery/night/detail combination ignores it and draws
// procedurally. Memoised per (aspect, livery, detail, night, bankDeg)
// combination for the procedural path; the sheet path has its own
// per-cell cache.
export function enemyTexture(aspect, livery = 'grey', detail = true, night = false, bankDeg = 0) {
  // Real art takes priority for every combination it covers: all four
  // liveries' day-palette detail textures (night and the far LOD have no
  // sheet -- see the import note above).
  if (detail && !night) {
    const cellTex = sheetCellTexture(livery, aspect, nearestBankIndex(bankDeg));
    if (cellTex) return cellTex;
  }

  const key = `${aspect}|${livery}|${detail}|${night}`;
  let tex = cache.get(key);
  if (tex) return tex;

  const pal = resolvePalette(livery, night);
  if (detail) {
    const drawFn = aspect === 'rear' ? drawRear : drawHeadOn;
    tex = buildTexture(drawFn, W, H, pal);
  } else {
    const drawFn = aspect === 'rear' ? drawRearFar : drawHeadOnFar;
    // No keyline on the far LOD: every texel is already opaque (the
    // invariant above), so there is no boundary to outline.
    tex = buildTexture(drawFn, FW, FH, pal, { keyline: false });
  }
  cache.set(key, tex);
  return tex;
}

// Existing no-arg getters, kept as thin wrappers so nothing else in the
// tree needs to change (R5 interfaces I1). Automatically pick up the real
// 'grey' sheet's level (0deg) pose once it has loaded.
export const enemyHeadOnTexture = () => enemyTexture('headOn', 'grey', true);
export const enemyRearTexture = () => enemyTexture('rear', 'grey', true);
export const enemyHeadOnFarTexture = () => enemyTexture('headOn', 'grey', false);
export const enemyRearFarTexture = () => enemyTexture('rear', 'grey', false);

// NOTE for anyone adding a zoom level: both detail textures above are 2:1,
// and both far textures are 2:1, so swapping between livery/aspect/zoom
// never changes the sprite's TEXTURE ASPECT, only its TEXTURE. A level
// whose canvas aspect differed would show up as a height jump in exactly
// the consecutive-frame comparison the scaling criterion uses.

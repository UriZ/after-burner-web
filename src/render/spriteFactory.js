import * as THREE from 'three';
// Real authored sprite sheet, shipped by the pixel-artist lane this round
// (tools/art/sheets/player-f14.js -> src/assets/sprites/player-f14.png; 9
// drawn bank poses, 100x40/cell -- matches JET_POSE_SHEET below exactly,
// agreed from judging/R4/art-critique.md §4's inventory). A Vite static
// import, not a runtime URL string: the file is committed, so resolving it
// at bundle time is correct for both dev and `vite build`, and a missing
// file would be a build-time error here rather than a silent runtime gap --
// deliberately stricter than the original "sheet may not exist yet" design
// now that the sheet does exist. See JET_POSE_SHEET's comment for what
// still falls back to the procedural silhouette (night palette, barrel
// roll, far LOD).
import playerF14SheetUrl from '../assets/sprites/player-f14.png';
import playerF14NightSheetUrl from '../assets/sprites/player-f14-night.png';
import playerF14RollSheetUrl from '../assets/sprites/player-f14-roll.png';

// Canvas-authored pixel art, not shipped/ripped assets (ARCHITECTURE.md D5).
// NearestFilter keeps the blocky look consistent with the 320x224 internal
// render target.
export function makeCanvasSprite(draw, width, height, worldWidth) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  // Same depth-stamp correction as createJetSprite below -- see the long
  // comment there for the mechanism. Applied here too even though nothing
  // currently calls makeCanvasSprite: it is a generic sprite helper, and
  // the next caller would silently inherit the defect.
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.5 });
  const sprite = new THREE.Sprite(material);
  const worldHeight = worldWidth * (height / width);
  sprite.scale.set(worldWidth, worldHeight, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// Hard-edge (no antialiasing) pixel rasterizer.
//
// Canvas2D's ctx.fill() antialiases every path edge, and that antialiasing
// blends ACROSS the seam between two adjacent OPAQUE shapes of different
// colours, not just against transparency -- so a flat N-colour sprite
// authored with polygon fills comes out as hundreds of in-between hexes
// (judging/R4/art-critique.md measured 14,508 unique colours in one frame
// against the arcade's 138, almost all from exactly this). The project's
// effects/pixelTexture.js `hardAlpha` pass only thresholds the ALPHA
// channel, which fixes the outer rim but not an interior seam between two
// opaque fills. Writing straight into the pixel buffer with these
// integer-pixel primitives (no gradients, no ctx.fill) is the only way to
// keep a sprite on its stated palette -- this is the project's new
// <=8-colours-per-sprite gate, so it is no longer optional polish.
// Exported so entities/enemySprite.js (same lane) can share it.
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function createPixelBuffer(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function setPixel(buf, x, y, hex) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= buf.width || y >= buf.height) return;
  const [r, g, b] = hexToRgb(hex);
  const i = (y * buf.width + x) * 4;
  buf.data[i] = r;
  buf.data[i + 1] = g;
  buf.data[i + 2] = b;
  buf.data[i + 3] = 255;
}

export function fillRectHard(buf, x0, y0, w, h, hex) {
  const x1 = Math.round(x0 + w);
  const y1 = Math.round(y0 + h);
  for (let y = Math.round(y0); y < y1; y++) {
    for (let x = Math.round(x0); x < x1; x++) setPixel(buf, x, y, hex);
  }
}

// Scanline fill of a simple (non-self-intersecting) polygon. Pixel CENTRES
// (x+0.5, y+0.5) are tested against each edge pair, so a pixel is either
// fully the fill colour or untouched -- never a blend.
export function fillPolygonHard(buf, points, hex) {
  const ys = points.map((p) => p[1]);
  const yMin = Math.max(0, Math.floor(Math.min(...ys)));
  const yMax = Math.min(buf.height - 1, Math.ceil(Math.max(...ys)));
  for (let y = yMin; y <= yMax; y++) {
    const yc = y + 0.5;
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) {
        xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xStart = Math.max(0, Math.round(xs[i]));
      const xEnd = Math.min(buf.width - 1, Math.round(xs[i + 1]) - 1);
      for (let x = xStart; x <= xEnd; x++) setPixel(buf, x, y, hex);
    }
  }
}

export function fillCircleHard(buf, cx, cy, r, hex) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(buf, x, y, hex);
    }
  }
}

// Grows the silhouette by one ring of `hex` into every TRANSPARENT pixel
// 8-adjacent to an opaque one. This EXPANDS outward -- the fill pixels the
// art was actually authored in stay untouched -- so a thin 3-4px feature
// (the player's fin blades) never gets eaten down to nothing but keyline,
// and a brightness-threshold mask (e.g. REFERENCE.md's JET-SIL operator,
// V>0.12) still sees the authored fill colour inside every feature, not
// the near-black ring. (An inset/erosion-style keyline was considered and
// rejected for exactly this reason -- see createJetSprite below.)
export function addKeyline(buf, hex) {
  const { width, height, data } = buf;
  const opaque = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) opaque[i] = data[i * 4 + 3] > 0 ? 1 : 0;
  const toKey = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (opaque[y * width + x]) continue;
      let adjacent = false;
      for (let dy = -1; dy <= 1 && !adjacent; dy++) {
        for (let dx = -1; dx <= 1 && !adjacent; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (opaque[ny * width + nx]) adjacent = true;
        }
      }
      if (adjacent) toKey.push([x, y]);
    }
  }
  for (const [x, y] of toKey) setPixel(buf, x, y, hex);
}

// ONE-SIDED keyline, grown DOWNWARD only -- the mirror of PixelCanvas's
// outlineSouth() in tools/art/canvas.js, which carries the measurement that
// justifies it (the arcade's daylight jet has a #840000 shadow edge on its
// lower side and 0.0 % near-black anywhere on its rim). An empty pixel is
// marked when ANY of its three NORTHERN neighbours is opaque; three, not one,
// so the line stays unbroken across a steep diagonal.
//
// addKeyline() above is kept as-is and still used by every other sprite --
// this is a jet-only change, and the 8-adjacent full ring is correct for the
// small sprites that rely on it to read against a busy ground.
export function addUnderKeyline(buf, hex) {
  const { width, height, data } = buf;
  const opaque = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) opaque[i] = data[i * 4 + 3] > 0 ? 1 : 0;
  const toKey = [];
  for (let y = 1; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (opaque[y * width + x]) continue;
      for (const dx of [-1, 0, 1]) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (opaque[(y - 1) * width + nx]) {
          toKey.push([x, y]);
          break;
        }
      }
    }
  }
  for (const [x, y] of toKey) setPixel(buf, x, y, hex);
}

export function bufferToTexture(buf) {
  const canvas = document.createElement('canvas');
  canvas.width = buf.width;
  canvas.height = buf.height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(buf.width, buf.height);
  img.data.set(buf.data);
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  return texture;
}

// ---------------------------------------------------------------------------
// Player F-14, astern/below silhouette -- REDESIGNED R5 (art critique §1b /
// §2.1; REFERENCE.md "Silhouette discriminators, astern view").
//
// R4's shape was one solid centred bar (a `fillRect` spine welded the two
// fin blades together) with nozzles jammed against the midline -- it passed
// the *old* aspect-ratio criterion (2.478 vs arcade 2.475) while reading as
// a crab claw, not an F-14, because aspect alone cannot see WHERE the fins
// and nozzles are. The JET-SIL operator (REFERENCE.md) fixes that; this
// geometry is tuned to the operator's own worked example in the art
// critique (which the art director independently verified at 5/5), not
// reverse-engineered from the acceptance numbers alone -- every shape
// decision was checked against the authoritative crop
// (reference/stage3-night-level-t175.png, crop x[207,487] y[227,306]) by
// eye before being accepted; see the dev report for the comparison.
//
// Geometry: authored in a 100x31 LOCAL box at DISPLAY size -- one texel is
// one native pixel at the sprite's on-screen scale, so there is no rescale
// blur -- and then placed in a 100x72 texture (see JET_H below for why the
// texture is taller than the drawing).
//   - two canted blades rising from the nacelles, root half-sep 13, top
//     half-sep 16.5 (cant 1.269, inside the arcade's own 1.23-1.29);
//     NO connecting spine between them, so every fin row shows two runs.
//   - nacelle centres x=35/65 -> nozzle-centre separation 30.0% of span,
//     which is the arcade's measured 30.1% rather than merely in-band.
//   - a notched saddle between the nacelles (t175 shows the body dip to a
//     point between the two nozzle pods, not a flat bar).
//   - swept, tapered wings: full chord at the root, thin tip plank.
//   - small nozzle discs (r~3) inside black rings, small ventral fins.
//   - canopy fleck, the topmost body element.
//
// *** THIS GEOMETRY IS MIRRORED IN tools/art/sheets/player-f14.js. ***
// That module's levelOps() is the same drawing; it generates the 9-pose day
// and night sheets player.js selects in flight, while this function serves
// createJetSprite's initial texture and the pre-decode fallback. R5b shipped a
// sheet whose level cell was a DIFFERENT, much worse aircraft, which is why
// daylight showed a mangled two-airframe shape while night looked correct.
// Keeping one drawing in two files is the cost of the tools/src split, and R6
// stopped relying on discipline for it: `python3 tools/art/mirror_check.py`
// compares the anchor constants, the three polygon helpers and the drawing
// program token by token and exits non-zero on any difference. Run it after
// touching either file, and re-run JET-SIL on both.
const JET_W = 100;
// Texture/quad height. The airframe itself is 31 rows (LOCAL_H) -- the
// arcade's own SPAN/H aspect of 3.24-3.30 at a 100 px span -- but the
// texture is 72 rows so that the SHEET's hard-bank poses, which rotate that
// 100x31 planform by up to 65 degrees, fit the same quad. Sheet cell and
// procedural buffer MUST share this number: when they did not (31 here vs a
// 40-row cell) every sheet cell was squashed vertically by 31/40.
// On-screen scale is unaffected -- worldHeight tracks JET_H, so one authored
// row is the same number of screen pixels either way.
const JET_H = 72;
const JET_LOCAL_H = 31;
// NOT rounded: the sheet's poseTransform places local y=0 at
// (CELL_H-1)/2 - (LOCAL_H-1)/2 = 35.5 - 15 = 20.5, and Math.round(20.5) is 21
// in JS, so rounding here put the fallback half a pixel below the sheet cell
// it is supposed to be identical to.
const JET_DRAW_Y = (JET_H - JET_LOCAL_H) / 2; // 20.5

// Player F-14 palette (REFERENCE.md / art-critique.md §3, already snapped to
// the Sega 5-bit ladder). EIGHT tones, which is REFERENCE.md Criterion A's
// per-aircraft budget and what tools/art/canvas.js assertPalette() enforces
// on the sheet; §3 lists ten for the arcade jet, but at a 100 px span the
// two dropped greys (#b5ada5, #ad7b5a) are never wider than a 1 px band.
// Day and night share structure; night swaps every airframe tone for a
// cooler one at matching value and leaves flame and canopy alone -- the
// arcade's night jet has bright orange afterburners (measured: 279 px pass
// the JET-SIL nozzle mask on reference/stage3-night-level-t175.png crop
// x[207,487] y[227,306], modal #ff7500), so night does NOT cool the flame.
//
// *** THESE ARE THE SHEETS' PALETTES, TRANSCRIBED. ***
// Every value below is the EXACT hex present in the corresponding
// src/assets/sprites/player-f14*.png, read back out of the file, not the
// pre-snap authoring value from tools/art/palettes.js. The authoring table
// runs every colour through snapHexToLadder(), so e.g. the night nozzle is
// authored '#ff7500' and ships as '#ff7300'; writing the authoring value
// here would put the fallback one ladder step off the sheet for no visible
// reason and for a reason no later reader could guess.
//
// R5d: this table had DRIFTED, and it drifted invisibly because this path
// only renders when a sheet fails to decode. Found by criteria-fix. The
// night row was an entirely different set of blue-greys from the measured
// night palette (I3's 8 colours off ab2-arcade-night-banking.png), and its
// `flame` was '#ef7308' -- the DAYLIGHT orange -- in both day and night, so
// the '#ff7500' night-afterburner correction reached the authored sheet and
// never reached this. Two tables, two owners, one concept: the fix is to
// make this one a transcription with a stated source rather than a second
// independent set of judgements.
// R6: the V<=0.77 ceiling is retired (R5 judge gap 4; art-critique.md §3.2).
// Every airframe value here is MEASURED off reference/ab2-arcade-desert.png
// x[85,182] y[82,140] -- a TRUE-NATIVE 320x224 arcade frame, so no video
// blur -- under the achromatic mask S<0.35 AND V>0.08 (JET-SIL's own sky-mode
// form), n=672. The arcade ladder and its shares are in tools/art/palettes.js.
// Our sheet's achromatic V median is now 0.839 with a maximum of 1.000,
// against R5's 0.643 / 0.773 -- our brightest tone used to sit BELOW the
// arcade jet's median.
//
// R7 adds the two rungs the arcade spends ~29 % of its airframe on and that
// R6 did not carry at all (#f7e6b5, #ceb59c), and separates the RIM from the
// KEY. Measured area shares and the three VALUE-STAT readings are on PLAYER
// in tools/art/palettes.js, which is the authoring copy of this table.
const PLAYER_PALETTE_DAY = {
  lightTop: '#ffffef', // V1.000 -- arcade dominant (31.8% of its airframe)
  lightNeutral: '#f7e6b5', // V0.969 -- arcade SECOND tone, 23.7%
  midNeutral: '#d6d6a4', // V0.839 -- arcade mid tone, 7.5%
  warmMid: '#ceb59c', // V0.808 -- arcade, 5.5%
  coolDark: '#a48484', // V0.643 -- arcade shadow tone, 12.8%
  specular: '#ffffff', // R9. MEASURED on the arcade's own daylight jet: 6 px
  // of #ffffff plus 1 of #f7f7f7 in a 984 px airframe, 0.7 %. See PLAYER in
  // tools/art/palettes.js for the census and for why it is also what gives
  // the death hulk its missing highlight.
  canopy: '#e694f7', // REFERENCE.md's own daylight-jet 95% set
  flame: '#ef7300',
  flameCore: '#ffd600',
  key: '#000000', // nozzle throats and the engine notch ONLY
  rim: '#840000', // V0.518 -- the one-sided shadow edge, 49.5% of the
  // arcade's own rim pixels, and 222 of its 224 occurrences in the whole
  // native frame are on the aircraft.
};
// The measured night set has NO true black -- its darkest step doubles as
// the keyline, which is why `key` and `deepShadow` are the same value here.
// That is the arcade's own palette, not an economy: see REFERENCE.md's
// night-palette section and PLAYER_NIGHT in tools/art/palettes.js.
const PLAYER_PALETTE_NIGHT = {
  lightTop: '#c5d6f7',
  lightNeutral: '#a4b5e6',
  midNeutral: '#8494c5',
  warmMid: '#7384b5',
  coolDark: '#6373a4',
  specular: '#c5d6f7', // same hex as lightTop: the measured night set is 8
  // colours and carries no white, so night gains the role and no colour.
  canopy: '#c594f7',
  flame: '#ff7300',
  flameCore: '#ffd600',
  key: '#425284',
  rim: '#425284', // same hex as `key`: the measured night set has no black,
  // so R7's one-sided rim costs the night sheet no extra colour.
};

const JET_CX = 50;
// R6: see the long derivation in tools/art/sheets/player-f14.js. Every anchor
// is read off reference/stage3-night-level-t175.png x[207,487] y[227,306] with
// the ROW-RUNS operator stated there.
const JET_ROOT_Y = 18; // fin root; the fin band is 58% of H, as the arcade's is
const JET_FIN_TOP_OUT = 16.9;
const JET_FIN_TOP_IN = 14.9;
const JET_FIN_ROOT_OUT = 15.4;
const JET_FIN_ROOT_IN = 10.0; // cant = 17.1/13.3 = 1.286 (arcade 1.28)
const JET_NAC_X = [35, 65]; // nozzle-centre separation 30.0% of span
const JET_NAC_Y = 22.6;
const JET_POD_R = 6.0;
const JET_LOCAL_W = 100;
const JET_WING_ROOT_IN = 29.8;
const JET_WING_LE_ROOT_Y = 22.2;
const JET_WING_TE_ROOT_Y = 26.8;
const JET_WING_LE_TIP_Y = 18.1;
const JET_WING_TE_TIP_Y = 22.2;
const JET_WING_TIP_X = 99;

// *** bladePoly / wingPoly / podPoly and drawJetSilhouette below are MIRRORED
// *** from tools/art/sheets/player-f14.js. `tools/art/mirror_check.py`
// *** compares the two token-by-token and fails if they drift; run it after
// *** touching either. A comment saying "change both or neither" stood over
// *** this code in R5 and the two diverged anyway, shipping a different,
// *** worse daylight aircraft for a whole round.
function bladePoly(sign) {
  const s = sign;
  return [
    [JET_CX + s * JET_FIN_TOP_IN, 0],
    [JET_CX + s * JET_FIN_TOP_OUT, 0],
    [JET_CX + s * JET_FIN_ROOT_OUT, JET_ROOT_Y],
    [JET_CX + s * JET_FIN_ROOT_IN, JET_ROOT_Y],
  ];
}

function wingPoly(sign) {
  const s = sign;
  const xin = JET_CX + s * (JET_LOCAL_W / 2 - JET_WING_ROOT_IN);
  const xtip = JET_CX + s * (JET_WING_TIP_X - JET_CX);
  return [
    [xin, JET_WING_LE_ROOT_Y],
    [xtip, JET_WING_LE_TIP_Y],
    [xtip, JET_WING_TE_TIP_Y],
    [xin - s * 1, JET_WING_TE_ROOT_Y],
  ];
}

function podPoly(nx, ny, rx, ry, cut) {
  return [
    [nx - rx, ny - ry + cut], [nx - rx + cut, ny - ry],
    [nx + rx - cut, ny - ry], [nx + rx, ny - ry + cut],
    [nx + rx, ny + ry - cut], [nx + rx - cut, ny + ry],
    [nx - rx + cut, ny + ry], [nx - rx, ny + ry - cut],
  ];
}

function drawJetSilhouette(buf, pal) {
  const Y = JET_DRAW_Y;
  const poly = (points, hex) => fillPolygonHard(buf, points.map(([x, y]) => [x, y + Y]), hex);
  const rect = (x, y, w, h, hex) =>
    poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], hex);
  const c = pal;

  // Fin blades: two canted, tapered, never-touching blades. Drawn first so
  // the dorsal deck paints over their roots.
  //
  // R7 INVERTS THE BLADE'S VALUE. R6 drew the blade body in the ramp's
  // shadow tone with a one-pixel light specular. Put our cell beside
  // reference/stage3-night-level-t175.png at 4x and the arcade's blades are
  // the BRIGHT element of the aircraft — lighter than the centre body, with
  // only a thin darker lip down the inboard side. At ~140 px for the pair
  // this is also the single biggest block of shadow tone on the sprite, and
  // it is most of why #a48484 owned 23.7 % of the airframe against the
  // arcade's 12.8 %. Crop first, census second, in that order.
  poly(bladePoly(-1), c.lightNeutral);
  poly(bladePoly(+1), c.lightNeutral);
  // The blade darkens one rung toward its ROOT, where the crop shows it
  // running into the body's own shadow — the tip is the brightest part of
  // the fin, not the whole blade. This also moves ~45 px off #f7e6b5, which
  // at 30 % was the one rung sitting well above the arcade's share (23.7 %).
  for (const s of [-1, 1]) {
    poly(
      [[JET_CX + s * 16.0, 11], [JET_CX + s * 11.4, 11],
       [JET_CX + s * JET_FIN_ROOT_IN, JET_ROOT_Y], [JET_CX + s * JET_FIN_ROOT_OUT, JET_ROOT_Y]],
      c.midNeutral
    );
  }
  for (const s of [-1, 1]) {
    // The topmost 2 rows of the outer edge take the pure-white specular; the
    // rest of that edge is lightTop. Same budget note as the wing.
    poly(
      [[JET_CX + s * JET_FIN_TOP_OUT, 0], [JET_CX + s * (JET_FIN_TOP_OUT - 1), 0],
       [JET_CX + s * (JET_FIN_TOP_OUT - 1), 3], [JET_CX + s * JET_FIN_TOP_OUT, 3]],
      c.specular
    );
    // 1 px specular down the near-vertical OUTER edge.
    poly(
      [[JET_CX + s * JET_FIN_TOP_OUT, 0], [JET_CX + s * (JET_FIN_TOP_OUT - 1), 0],
       [JET_CX + s * (JET_FIN_ROOT_OUT - 1), JET_ROOT_Y], [JET_CX + s * JET_FIN_ROOT_OUT, JET_ROOT_Y]],
      c.lightTop
    );
    // ...and a 1 px shadow lip down the raked INNER edge.
    poly(
      [[JET_CX + s * JET_FIN_TOP_IN, 0], [JET_CX + s * (JET_FIN_TOP_IN + 1), 0],
       [JET_CX + s * (JET_FIN_ROOT_IN + 1), JET_ROOT_Y], [JET_CX + s * JET_FIN_ROOT_IN, JET_ROOT_Y]],
      c.coolDark
    );
  }

  // ==================== R9: WINGS AS BLADES ====================
  // Two chordwise bands on a 2.4-unit chord, not three on a 6-unit one.
  // The arcade's daylight crop (reference/ab2-arcade-desert.png at 9x,
  // tools/out/drawing-r9/arc-jet-9x.png) shows what each wing IS: one
  // white edge-lit line with a dark-red shadow line beside it, running the
  // entire length. Not a surface with an outline -- a lit edge. So:
  //
  //   leading 1.0 unit   lightTop, the brightest tone on the aircraft
  //   trailing 1.4 units coolDark, the shadow under the lit edge
  //   and canvas.outlineSouth() then lays the measured #840000 rim along
  //   the bottom of that, which is the arcade's second line.
  //
  // The root chord overlaps the pod by 0.4, which is what keeps the outer
  // panel on the largest 8-connected component -- see the JET_WING_ROOT_IN
  // comment for why that overlap is load-bearing and why it is only 0.4.
  poly(wingPoly(-1), c.lightNeutral);
  poly(wingPoly(+1), c.lightNeutral);
  for (const s of [-1, 1]) {
    const xin = JET_CX + s * (JET_LOCAL_W / 2 - JET_WING_ROOT_IN);
    const xtip = JET_CX + s * (JET_WING_TIP_X - JET_CX);
    // Leading edge: the brightest line, full length, 1 px.
    poly([[xin, JET_WING_LE_ROOT_Y], [xtip, JET_WING_LE_TIP_Y],
          [xtip, JET_WING_LE_TIP_Y + 1.0], [xin, JET_WING_LE_ROOT_Y + 1.0]], c.lightTop);
    // ONE dark edge per surface, not two, and it goes at the BOTTOM.
    //
    // This is the R9 lane's second correction and the reasoning matters more
    // than the line. arc-day-body-18x.png -- the arcade's DAYLIGHT wing root
    // at 18x -- shows three or four parallel #840000 lines striping the pale
    // surface, and I authored them as interior stripes. On the crop that
    // read as a red-lined glider, and the reason is that THE DAY FRAME IS
    // BANKED. The alternating bright/dark lines in it are what a planform
    // with bright upper surfaces and dark lower edges PRODUCES when you roll
    // it toward the camera: you see the underside of each blade between the
    // upper surfaces of its neighbours. The arcade's LEVEL frame has no
    // interior stripes at all -- bright top edge, mid body, dark bottom edge.
    //
    // So the stripes are not authored. One planform, lit top and dark
    // bottom, and poseTransform() produces the striped reading at bank for
    // free. Authoring them as well drew them twice.
    poly([[xin, JET_WING_TE_ROOT_Y - 1.2], [xtip, JET_WING_TE_TIP_Y - 1.2],
          [xtip, JET_WING_TE_TIP_Y], [xin, JET_WING_TE_ROOT_Y]], c.coolDark);
    // SPECULAR: a few pure-white pixels on the outer third of the leading
    // edge, where the arcade's own daylight jet puts its 6. Deliberately
    // short -- the role's budget is well under 2.5 % of the sheet and
    // tools/art/hulk_probe.py reports the share after every build.
    poly([[JET_CX + s * 33, JET_WING_LE_TIP_Y + 1.1], [JET_CX + s * 48, JET_WING_LE_TIP_Y + 0.1],
          [JET_CX + s * 48, JET_WING_LE_TIP_Y + 0.9], [JET_CX + s * 33, JET_WING_LE_TIP_Y + 1.9]],
         c.specular);
    // Wingtip rail: the crop ends each wing in a short deeper element set
    // off by a one-pixel break. Kept from R8, rescaled to the new chord.
    poly([[JET_CX + s * 40, JET_WING_LE_TIP_Y + 0.6], [JET_CX + s * 41, JET_WING_LE_TIP_Y + 0.5],
          [JET_CX + s * 41, JET_WING_TE_TIP_Y], [JET_CX + s * 40, JET_WING_TE_TIP_Y + 0.2]], c.coolDark);
    poly([[JET_CX + s * 41, JET_WING_LE_TIP_Y + 0.3], [JET_CX + s * 49, JET_WING_LE_TIP_Y],
          [JET_CX + s * 49, JET_WING_TE_TIP_Y - 0.1], [JET_CX + s * 41, JET_WING_TE_TIP_Y + 0.1]], c.lightTop);
  }

  // ================= R9: THE DECK MOVES DOWN 3 ROWS =================
  // This is where the fin band's 2.4x excess ink actually was. The arcade's
  // body does not appear until 58 %H (row 18 of 31): row 17 holds two runs
  // and they are both fin root, and row 18 holds a SIX-UNIT nub at the
  // centre. Ours started at 50 %H and was already 10.6 units wide inside the
  // fin band, which is 15 points of span-normalised fill per row that the
  // arcade does not spend. tools/art/rowdiff.py, rows 14-17.
  // The deck reaches |x| 12 by 65 %H, which is what puts it UNDER the fin
  // roots (|x| 11.0 .. 16.2 at JET_ROOT_Y). R8's deck stopped at |x| 11 and left
  // 5 units of sky between each blade root and the body, which is the "two
  // pale rabbit ears ... separated from the nacelles by bare sky" the R8
  // critique lists as the fins' specific defect. On the arcade's level crop
  // the blade roots run straight into the tail mass with no sky between.
  poly([[47, 18.4], [53, 18.4], [61, 20.2], [39, 20.2]], c.lightTop);
  // Shaded flanks either side of the deck -- the crop's body is three value
  // planes across, not one.
  poly([[47, 18.6], [43.4, 18.6], [39, 20.2], [44.5, 20.2]], c.midNeutral);
  poly([[53, 18.6], [56.6, 18.6], [61, 20.2], [55.5, 20.2]], c.midNeutral);
  // FIN-ROOT FILLETS. "The vertical fins read as two pale rabbit ears ...
  // separated from the nacelles by bare sky. In the arcade's astern views
  // the fins ... sit ON the nacelle tops as part of one tail mass." (R8
  // critique section 4, specific 2.) These close that sky, and they are
  // authored BELOW JET_ROOT_Y on purpose: anything at or above it widens the
  // last fin row and takes `cant` with it.
  poly([[JET_CX - JET_FIN_ROOT_OUT, JET_ROOT_Y], [JET_CX - JET_FIN_ROOT_IN, JET_ROOT_Y],
        [44.5, 20.4], [37.5, 20.4]], c.midNeutral);
  poly([[JET_CX + JET_FIN_ROOT_OUT, JET_ROOT_Y], [JET_CX + JET_FIN_ROOT_IN, JET_ROOT_Y],
        [55.5, 20.4], [62.5, 20.4]], c.midNeutral);

  // Engine bodies below the nozzles, sweeping down and INWARD -- the crop's
  // lateral run moves from |x| 20.2..5.0 between 90 %H and 97 %H, so the
  // lower aircraft closes to a V rather than ending in a bar.
  // Outer edge at |x| 21.5 (local 28.5), which is the arcade's: its rows
  // 62..77 read [-21.0..-5.0] [-4.2..+3.8] [+4.6..+20.6]. R8 and the first
  // R9 draft both stopped at |x| 19.8 and left the lower aircraft narrower
  // than the arcade's, which is the one place the row-diff says we are too
  // LIGHT (rows 29-30, -9.2 and -4.4 points).
  poly([[28.5, 25.0], [41.0, 24.0], [46.0, 30.4], [38.0, 30.4]], c.midNeutral);
  poly([[71.5, 25.0], [59.0, 24.0], [54.0, 30.4], [62.0, 30.4]], c.midNeutral);

  // Centre fuselage: widest at the wing line, tapering to a point at the
  // bottom and reaching lower than the engine bodies.
  // lightNeutral, NOT lightTop. R8 spent this whole slab -- the largest
  // single mass on the sprite -- on the brightest tone, and the R8 critique's
  // pale-area figure (ours 1 133 px against the arcade's 444) is mostly here.
  // The arcade's bright tone is reserved for EDGES: the deck, the wing
  // leading edges, the pod shells. Demoting this one polygon is ~95 px off
  // the top rung without touching the silhouette.
  poly([[39, 20.0], [61, 20.0], [59, 24.5], [41, 24.5]], c.lightNeutral);
  // ...with the dorsal centreline left bright, so the body still has a lit
  // top rather than going flat.
  poly([[46.5, 20.0], [53.5, 20.0], [52.6, 24.5], [47.4, 24.5]], c.lightTop);
  poly([[39, 20.0], [43, 20.0], [44.5, 24.5], [41, 24.5]], c.midNeutral);
  poly([[61, 20.0], [57, 20.0], [55.5, 24.5], [59, 24.5]], c.midNeutral);
  // midNeutral, with a lightTop centreline over it. R8 drew this mass -- the
  // bottom third of the aircraft -- on one bright tone and it read at native
  // as a pale lump with a red outline rather than as a body. The arcade's
  // level crop has its brightest tone only on the dorsal deck and the pod
  // shells; everything below the nozzle line is a step down.
  poly([[41, 24.5], [59, 24.5], [52.6, 30.9], [47.4, 30.9]], c.midNeutral);
  poly([[47.6, 24.5], [52.4, 24.5], [51.4, 30.6], [48.6, 30.6]], c.lightNeutral);

  // The dark slot between the engine bodies, at 76.6 %H on the crop. R8
  // shrank it from a mouth to a slot and measured why; R9 only follows it
  // down with the body it sits in. The flanking warmMid pair is the other
  // half of that fix: the arcade's slot sits in a SHADED part of the body,
  // so the step from body to black is two rungs.
  poly([[45.4, 23.0], [54.6, 23.0], [53.4, 25.2], [46.6, 25.2]], c.warmMid);
  // R9 PUTS THE SLOT ON #840000 RATHER THAN #000000, for two reasons that
  // point the same way. (1) palettes.js's own PLAYER comment records the
  // measurement: "the arcade jet has NO airframe tone darker than #635252"
  // and the daylight airframe nothing darker than #948463 OUTSIDE THE NOZZLE
  // THROATS -- so a pure-black slot in the middle of the body was off the
  // arcade's own airframe set. (2) R8 shrank this slot because a black bar
  // of maximum contrast centred between two orange glows with a magenta
  // fleck above reads as a FACE before it reads as a jet; shrinking helped
  // and did not close it. Dark red joins the line-work family that now runs
  // across the whole airframe, so it reads as structure rather than a mouth.
  poly([[46.8, 23.2], [53.2, 23.2], [52.4, 24.8], [47.6, 24.8]], c.rim);

  // ===================== R9: THE SPINE LINES =====================
  // "The interior has no panel lines. The arcade covers the airframe in dark
  // spine lines that give each surface a top and an edge. We have one dash."
  // (R8 critique section 4, specific 3.) Two 1 px lines down the engine
  // bodies, following their sweep, in the measured #840000 -- the day crop
  // shows the arcade's spine lines are the SAME dark red as its rim, not a
  // grey.
  //
  // THE MASK HAZARD, stated because it is real and it is checked rather than
  // assumed: #840000 has S=1.000 and FAILS JET-SIL's achromatic `--sky`
  // mask, so an interior line in it is a slit in the silhouette under the
  // operator this project gates on. These lines run ALONG each surface, not
  // across it, so the strips either side stay 8-connected end to end -- the
  // same reason the arcade can stripe its own wings. Verified every build
  // with tools/art/jetsil.py (SPAN must stay at the full wingspan; a severed
  // panel shows up immediately as SPAN collapsing, which is how R5b's 68-on-
  // a-100 px aircraft was caught).
  poly([[33.6, 25.4], [34.8, 25.4], [42.6, 30.4], [41.0, 30.4]], c.rim);
  poly([[66.4, 25.4], [65.2, 25.4], [57.4, 30.4], [59.0, 30.4]], c.rim);
  // The arcade's 90 %H row is three runs -- [-21.0..-5.0] [-4.2..+3.8]
  // [+4.6..+20.6] -- so the centre body IS parted from the engine bodies.
  // A pair of 1 px dark-red divisions at |x| 4.5 was the obvious way to say
  // that and it was WRONG on the crop: at native, two short marks inside a
  // pale lump read as dirt, not as a parting. The parting is carried instead
  // by the value step below (centre body lightNeutral, engine bodies
  // midNeutral) plus the two spine lines, which are long enough to read as
  // lines. Recorded rather than silently dropped -- the row-run says the
  // break is there and this is a weaker rendering of it than the arcade's.

  // Canopy fleck -- topmost body element, the only non-grey/non-orange
  // accent. REFERENCE.md's canopy-coverage bound: a fleck, never a shape.
  rect(48, 18.7, 4, 1.4, c.canopy);

  // Ventral fins, outboard of and below each pod (the crop's 89.6 %H row has
  // a separate run at |x| 16.5..23.7).
  poly([[JET_NAC_X[0] - 2, 24.4], [JET_NAC_X[0] - 7, 28.4], [JET_NAC_X[0], 25.4]], c.coolDark);
  poly([[JET_NAC_X[1] + 2, 24.4], [JET_NAC_X[1] + 7, 28.4], [JET_NAC_X[1], 25.4]], c.coolDark);

  // Nacelle pods + nozzles, LAST so they stand proud of the wing root and the
  // centre body. The POD SHELL is airframe-bright and overlaps both, which is
  // what keeps the lower third of the silhouette attached: a bare flame disc
  // inside a closed black ring is an ISLAND under any brightness mask (the
  // ring fails max(RGB)>30), and the R5b first draft measured H=25 on a
  // 31-row aircraft for exactly that reason.
  //
  // R9 holds the RING WEIGHT and shrinks the DISC. The R8 critic formed and
  // then withdrew a claim that our ring was too thin ("comparable, not a
  // defect"), so the ring is not touched as a fraction of the pod; JET_POD_R's
  // comment carries the two measurements that move the disc.
  for (const nx of JET_NAC_X) {
    // `cut` is ~0.58 of the shorter radius on every ring, the value that
    // turns a cut square into a REGULAR octagon. At ~9 px that one constant
    // is the difference between an orange disc and an orange square.
    // Wider than tall, which is the arcade's own proportion on the level
    // crop (|x| 9..21 % of span over 58..88 %H) and is also what keeps the
    // top edge out of the fin band -- see JET_NAC_Y.
    poly(podPoly(nx, JET_NAC_Y, JET_POD_R, 4.6, 2.7), c.lightTop);
    // One lit pixel row on each pod's shoulder.
    poly([[nx - 2.4, JET_NAC_Y - 4.6], [nx + 2.4, JET_NAC_Y - 4.6],
          [nx + 2.0, JET_NAC_Y - 3.8], [nx - 2.0, JET_NAC_Y - 3.8]], c.specular);
    poly(podPoly(nx, JET_NAC_Y + 0.4, JET_POD_R - 0.2, 4.5, 2.6), c.coolDark);
    poly(podPoly(nx, JET_NAC_Y, JET_POD_R - 0.5, 4.2, 2.4), c.key);
    poly(podPoly(nx, JET_NAC_Y, 3.6, 2.7, 1.6), c.flame);
    poly(podPoly(nx, JET_NAC_Y + 0.3, 1.7, 1.2, 0.7), c.flameCore);
  }
}

// The eight role names drawJetSilhouette() reads. Checked explicitly because
// the alternative is what actually happened in R6: a role was renamed in the
// drawing (`slate` -> `coolDark`, to match the sheet generator so
// tools/art/mirror_check.py could compare them) and not in these tables, and
// the only symptom was `TypeError: Cannot read properties of undefined
// (reading 'slice')` ten frames deep inside hexToRgb, at module construction,
// with the whole game failing to boot. `vite build` passes that happily --
// it is a property access, not a syntax error -- so the type checker is a
// capture, and a capture is a slow way to find a typo.
//
// R9: THIS GUARD HAS A HOLE AND IT CAUGHT ME. The list is hand-maintained, so
// it only checks the roles someone remembered to add to it. R9 added
// `specular` to the drawing and to both palette tables below -- but added it
// to the drawing FIRST, and the hand-maintained list said nothing, so the
// game booted into exactly the TypeError this comment describes. The guard
// did not fire because the guard did not know the role existed.
// `python3 tools/art/mirror_sync.py` now DERIVES this list from the drawing
// program's own text and rewrites it, and fails if any palette table in
// either file is missing a role the drawing reads. Do not hand-edit it.
const JET_PALETTE_ROLES = [
  'key', 'rim', 'lightTop', 'lightNeutral', 'midNeutral', 'warmMid', 'coolDark',
  'canopy', 'specular', 'flame', 'flameCore',
];

function buildJetTexture(pal) {
  const missing = JET_PALETTE_ROLES.filter((r) => !pal[r]);
  if (missing.length) {
    throw new Error(
      `spriteFactory: jet palette is missing role(s) ${missing.join(', ')}. ` +
      'drawJetSilhouette() and tools/art/sheets/player-f14.js roles() must ' +
      'agree on these names -- run tools/art/mirror_sync.py, which derives ' +
      'them from the drawing rather than trusting a hand-kept list.'
    );
  }
  const buf = createPixelBuffer(JET_W, JET_H);
  drawJetSilhouette(buf, pal);
  return bufferToTexture(buf);
}

export function createJetSprite(worldWidth = 2.72) {
  const dayTexture = buildJetTexture(PLAYER_PALETTE_DAY);
  const nightTexture = buildJetTexture(PLAYER_PALETTE_NIGHT);

  // alphaTest is NOT cosmetic -- it is a depth-buffer correction, measured by
  // combatfx-r5 at 239,176 native px of suppressed effects over 150 frames
  // (judging/R5/ask-combatfx.md §8). THREE.SpriteMaterial defaults
  // depthWrite:true, so without a threshold EVERY texel of this quad stamps
  // the depth buffer -- including the fully transparent margin, which is
  // most of it: the quad is 100x72 and the airframe fills ~97x31 of that,
  // so roughly 58% of the stamped area is nothing at all. The jet carries
  // renderOrder 0 and every combat element carries 6-30, so the jet stamps
  // FIRST and anything drawn after it at greater depth inside that
  // rectangle is depth-rejected in a region where the jet is invisible.
  // Explosion cores, missile trail and lock brackets were all being deleted.
  //
  // alphaTest and NOT depthWrite:false, which was the other candidate:
  // depthWrite:false additionally lets far sprites paint OVER the jet's
  // opaque body (renderOrder forces them later), which is a second bug
  // traded for the first. alphaTest keeps the silhouette occluding
  // correctly and only stops the invisible margin from stamping.
  //
  // 0.5 is safe for THIS art specifically because the authored sheets have
  // no partial alpha at all -- every pixel is written at alpha 255 or left
  // at 0 by the hard-edged rasterizer above, and the keyline is GROWN
  // outward as opaque pixels rather than feathered. Verified rather than
  // assumed: see the delivery report's edge-pixel census and the JET-SIL
  // re-run after this change.
  const material = new THREE.SpriteMaterial({
    map: dayTexture,
    transparent: true,
    alphaTest: 0.5,
  });
  const sprite = new THREE.Sprite(material);
  const worldHeight = worldWidth * (JET_H / JET_W);
  sprite.scale.set(worldWidth, worldHeight, 1);

  // Night palette swap (GAME_SPEC.md / REFERENCE.md "Night palette swap";
  // R5 interfaces I3): both textures are built once and cached on the
  // sprite so the swap is a map pointer change, not a redraw.
  sprite.userData.dayTexture = dayTexture;
  sprite.userData.nightTexture = nightTexture;
  sprite.userData.isNight = false;
  return sprite;
}

// Call from the night-stage integration point once one exists (owned by
// game.js / flow.js, outside this lane -- see the dev report for the
// required one-line call site, same pattern as Player.update's worldRoll
// parameter). No-ops if already in the requested state.
export function setJetNightPalette(sprite, isNight) {
  if (sprite.userData.isNight === isNight) return;
  sprite.userData.isNight = isNight;
  sprite.material.map = isNight ? sprite.userData.nightTexture : sprite.userData.dayTexture;
  sprite.material.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// AFTERBURNER FLAME (R13 gap 4 -- "the jet doesn't breathe fire").
//
// The arcade player F-14 trails twin orange/yellow afterburner cones from its
// nozzles through combat -- the game's signature element. On the true-native
// astern frames (reference/stage3-night-level-t175.png,
// reference/stage1-level-flight-t116.png) the exhaust reads as a BRIGHT ORANGE
// GLOWING NOZZLE DISC with a hot white-yellow core plus a short spray trailing
// aft; when the jet banks (reference/ab2-arcade-desert.png,
// ab2-arcade-night-banking.png) the same cone reads as a long bright plume
// spilling past the tail. Our shipped airframe draws the nozzle as a thick
// black `key` ring with a small orange `flame` dot inside it -- the dark ring
// dominates and there is no trailing plume at all (R11 §4's "nozzles carry the
// contrast, but as dark rings").
//
// THIS IS AN ADDITION, NOT A REPAINT. The airframe (its nozzle discs included)
// is baked into the committed pose sheets src/assets/sprites/player-f14*.png,
// generated by tools/art/sheets/player-f14.js and mirrored into
// drawJetSilhouette above under tools/art/mirror_check.py -- out of this lane,
// and not touched here. Instead the flame is a SEPARATE billboard that
// player.js childs to the jet sprite and positions over the nozzle line, in
// FRONT of the airframe (local +z), so its hot cores sit on the two nozzle
// discs -- making them glow like the arcade's instead of reading as dark dots
// -- and its cones extend aft (downward on screen in the astern view). Because
// it is its own sprite it banks, rolls, launches and hides WITH the jet (child
// visibility) regardless of which pose cell the sheet is showing, and it can
// flicker and scale with throttle, which the baked sheet cannot.
//
// NIGHT IS NOT COOLED. The measured arcade night jet keeps bright orange
// afterburners (drawJetSilhouette's palette note: 279 px pass the nozzle mask
// on the night crop, modal #ff7500), so the flame uses ONE warm palette in
// both day and night -- unlike the airframe, which swaps to cool blue-greys.
//
// sRGB: these hexes are written straight into the pixel buffer as bytes by the
// hard-edge rasterizer above (setPixel -> raw RGBA), never through
// THREE.Color(r,g,b) floats, so the double-encode class (CLAUDE.md "recurring
// bug classes", hit on sea and explosions) cannot arise here -- same path the
// airframe sheet already takes, and the texture is tagged SRGBColorSpace to
// match.
// ---------------------------------------------------------------------------
const FLAME_W = 48;
const FLAME_H = 60;
// Nozzle-core x in the flame texture. player.js scales this sprite so these
// two columns land on the airframe's nozzle centres (local x +-0.15 of the jet
// quad, = NAC_X 35/65 of a 100 px span); the gap between them keeps the plume
// reading as TWO cones, not one blob.
const FLAME_CORE_X = [12, 36];
const FLAME_TOP_Y = 3; // nozzle end; cones grow downward (aft) from here
// Warm flame ramp, hottest at the nozzle. Hot core white-yellow -> yellow ->
// orange (the airframe's own `flame` #ff7300) -> deep red at the cone tip.
// R15 polish (R14 judge: the flame was "a touch long and liquid"). The arcade
// afterburner (judging/R13/jx-afterburner-L-level.png / -H-bank.png) is CRISP:
// short fat bright teardrops at low speed, longer but still clean two-cone
// plumes at high -- yellow/orange body dominant, a THIN red rim and a short red
// tip, never a long red liquid tail. So the two inner layers are widened (they
// fill more of the cone, pushing red to a rim) and the cone is shortened/
// rounded below -- see buildFlameTexture's len/bulge and the ramp lf bumps.
const FLAME_RAMP = [
  { color: '#c42400', wf: 1.0, lf: 1.0 }, // deep red: thin rim + short tip, NOT a long tail
  { color: '#ff7300', wf: 0.82, lf: 0.9 }, // orange body (== airframe flame), now fills most of the cone
  { color: '#ffd600', wf: 0.58, lf: 0.64 }, // yellow, carried further down for a brighter read
  { color: '#fff2c5', wf: 0.34, lf: 0.36 }, // hot white-yellow core at the nozzle
];

// One nested-kite cone: a teardrop pinned at (cx, yTop) that bulges at ~24% of
// its length (R15: raised from 30% for a rounder, tighter teardrop closer to
// the arcade's) and tapers to a point. Layers are drawn largest (red) to
// smallest (white), all sharing yTop, so downstream cools red and the nozzle
// end stays white-hot. `flick` offsets the tip sideways to animate a live,
// guttering flame between frames.
function drawFlameCone(buf, cx, yTop, len, halfW, flick) {
  for (const { color, wf, lf } of FLAME_RAMP) {
    const l = len * lf;
    const hw = halfW * wf;
    const tip = flick * lf;
    fillPolygonHard(
      buf,
      [
        [cx, yTop],
        [cx - hw, yTop + l * 0.24],
        [cx + tip, yTop + l],
        [cx + hw, yTop + l * 0.24],
      ],
      color
    );
  }
}

// Builds one flame-sheet frame (both cones). `len`/`halfW`/`flick` differ per
// frame so cycling them guts and flares the plume the way the arcade's does,
// rather than just pulsing one static shape.
function buildFlameTexture({ len, halfW, flick }) {
  const buf = createPixelBuffer(FLAME_W, FLAME_H);
  for (let i = 0; i < FLAME_CORE_X.length; i++) {
    drawFlameCone(buf, FLAME_CORE_X[i], FLAME_TOP_Y, len, halfW, flick * (i === 0 ? -1 : 1));
  }
  return bufferToTexture(buf);
}

// Two authored flicker frames: a slightly longer narrower plume and a shorter,
// fatter, tip-flicked one. player.js cycles them and jitters scale on top, so
// the flame never reads as a static decal. Returns a transparent, non-depth-
// writing sprite (the airframe behind it owns the depth buffer -- see
// createJetSprite's alphaTest note) carrying the frames on userData for swap.
//
// R15 polish: both cones SHORTENED (len 50/40 -> 38/30, now 0.63/0.50 of the
// FLAME_H=60 canvas vs 0.83/0.67) and fattened (halfW 8/9.5 -> 9/10.5) so they
// read as crisp teardrops rather than a long liquid flame, and the flicker tip
// wander is halved (2.5 -> 1.4) to firm up the guttering. The throttle length
// ramp (player.js FLAME_LEN_BY_THROTTLE) is untouched, so L/M/H still open the
// plume -- this only changes the authored SHAPE the ramp scales.
export function createAfterburnerFlame() {
  const frames = [
    buildFlameTexture({ len: 38, halfW: 9, flick: 0 }),
    buildFlameTexture({ len: 30, halfW: 10.5, flick: 1.4 }),
  ];
  const material = new THREE.SpriteMaterial({
    map: frames[0],
    transparent: true,
    depthWrite: false,
    alphaTest: 0.5,
  });
  const sprite = new THREE.Sprite(material);
  // Over the jet body (renderOrder 0) but under every combat effect (6-30), so
  // explosions and tracers still draw on top of the exhaust.
  sprite.renderOrder = 1;
  sprite.userData.frames = frames;
  return sprite;
}

// ---------------------------------------------------------------------------
// Pose-selection sprite sheet (R5 item E / art critique §1b-"next": the 9
// drawn bank poses -- "a spun bitmap is the loudest single 'this is not an
// arcade game' signal in the build"). Cell size and the bank-angle ladder
// match tools/art/sheets/player-f14.js exactly (9 poses, 100x72/cell,
// -65/-45/-25/-10/0/10/25/45/65deg), which is itself judging/R4/
// art-critique.md §4's inventory. The night palette has its own sheet
// (JET_POSE_SHEET_NIGHT) and the barrel roll has its own (JET_ROLL_SHEET,
// 8 cells, below). The only thing still procedural is the FAR LOD and the
// pre-decode fallback -- see createJetSprite's day/night texture pair.
// ---------------------------------------------------------------------------
export const JET_POSE_SHEET = {
  url: playerF14SheetUrl,
  cols: 9,
  cellWidth: 100,
  // MUST equal JET_H. The sheet is sampled into the sprite's quad, which is
  // sized from JET_W/JET_H; when this was 40 against a JET_H of 31 every
  // cell rendered squashed to 77.5% height. Both are 72 now.
  cellHeight: JET_H,
  bankAnglesDeg: [-65, -45, -25, -10, 0, 10, 25, 45, 65],
};

// Same 9 poses, same geometry, night palette (tools/art/sheets/player-f14-
// night.js delegates to the daylight generator, so they cannot diverge).
// NOT yet selected by player.js: its update() short-circuits the sheet in
// night mode and uses the procedural night texture instead, which is
// correct but loses the drawn poses at night. See judging/R5/
// ask-sprite-art.md for the one-line change that lane would need to make.
export const JET_POSE_SHEET_NIGHT = {
  ...JET_POSE_SHEET,
  url: playerF14NightSheetUrl,
};

// Resolves to a loaded, nearest-filtered texture, or `null` if the sheet
// fails to decode -- callers MUST treat null as "keep the procedural
// single-bitmap + material.rotation fallback", never throw. (The sheet is a
// committed file resolved at bundle time via the static import above, so in
// practice this only returns null on a corrupt/undecodable image, not a
// missing one -- but the contract is kept null-safe regardless, since a
// FUTURE sheet this same loader points at may not exist yet.)
export function loadPoseSheetTexture(sheet = JET_POSE_SHEET) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      sheet.url,
      (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        resolve(texture);
      },
      undefined,
      () => resolve(null)
    );
  });
}

// Selects the authored cell nearest `bankDeg` (signed degrees, matching
// player.js's existing bank-pose-ladder sign convention) by setting the
// sheet texture's UV offset/repeat, and clears material.rotation -- this is
// what REPLACES the "one bitmap spun" defect (art critique rank 1b) once a
// sheet is loaded. No-op (returns false) if `sheetTexture` is null.
export function selectPoseCell(sprite, sheetTexture, sheet, bankDeg) {
  if (!sheetTexture) return false;
  let best = 0;
  let bestDist = Infinity;
  sheet.bankAnglesDeg.forEach((a, i) => {
    const dist = Math.abs(a - bankDeg);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  if (sprite.material.map !== sheetTexture) {
    sprite.material.map = sheetTexture;
    sprite.material.needsUpdate = true;
  }
  sheetTexture.repeat.set(1 / sheet.cols, 1);
  sheetTexture.offset.set(best / sheet.cols, 0);
  sprite.material.rotation = 0;
  return true;
}

// ---------------------------------------------------------------------------
// Barrel-roll sheet (tools/art/sheets/player-f14-roll.js). Same cell size and
// the same quad as JET_POSE_SHEET, so nothing about the sprite's scale
// changes when the roll starts; only which strip it samples.
//
// This is the last "one bitmap spun" case in the player sprite. The eight
// cells are drawn, not rotated: each is scan-converted from its own control
// points, and the three middle ones carry the blue-violet DORSAL palette
// measured off reference/stage4-barrel-roll-t222.png, which does not exist
// anywhere in the astern view. A spun astern bitmap stays warm grey through
// the whole manoeuvre and is wrong at every phase but zero.
//
// *** THE ROTATION AND THE SPAN SQUISH ARE BAKED INTO THE ART. *** A caller
// driving this must NOT also set material.rotation or squeeze scale.x for
// the duration of the roll, or both apply twice. selectRollCell clears
// material.rotation itself; the scale is the caller's to leave alone.
// ---------------------------------------------------------------------------
export const JET_ROLL_SHEET = {
  url: playerF14RollSheetUrl,
  cols: 8,
  cellWidth: JET_W,
  cellHeight: JET_H,
};

// `rollPhase` is 0..1 over one full 360deg roll — exactly the field
// player.js already exposes. Wraps, so 1.0 lands back on cell 0 rather than
// running off the end of the strip. Returns false on a null texture so the
// caller's existing spun-bitmap path stays as the fallback, same contract as
// selectPoseCell.
export function selectRollCell(sprite, sheetTexture, rollPhase, sheet = JET_ROLL_SHEET) {
  if (!sheetTexture) return false;
  const phase = ((rollPhase % 1) + 1) % 1;
  const cell = Math.round(phase * sheet.cols) % sheet.cols;
  if (sprite.material.map !== sheetTexture) {
    sprite.material.map = sheetTexture;
    sprite.material.needsUpdate = true;
  }
  sheetTexture.repeat.set(1 / sheet.cols, 1);
  sheetTexture.offset.set(cell / sheet.cols, 0);
  sprite.material.rotation = 0;
  return true;
}

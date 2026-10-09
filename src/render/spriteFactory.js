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
const JET_FIN_TOP_OUT = 18.2;
const JET_FIN_TOP_IN = 16.0;
const JET_FIN_ROOT_OUT = 16.1;
const JET_FIN_ROOT_IN = 10.5; // cant = 17.1/13.3 = 1.286 (arcade 1.28)
const JET_NAC_X = [35, 65]; // nozzle-centre separation 30.0% of span
const JET_NAC_Y = 22.4;
const JET_POD_R = 5.2;
const JET_LOCAL_W = 100;
const JET_WING_ROOT_IN = 31;
const JET_WING_LE_ROOT_Y = 21.0;
const JET_WING_TE_ROOT_Y = 27.0;
const JET_WING_LE_TIP_Y = 17.7;
const JET_WING_TE_TIP_Y = 20.6;
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
      [[JET_CX + s * 16.8, 11], [JET_CX + s * 11.8, 11],
       [JET_CX + s * JET_FIN_ROOT_IN, JET_ROOT_Y], [JET_CX + s * JET_FIN_ROOT_OUT, JET_ROOT_Y]],
      c.midNeutral
    );
  }
  for (const s of [-1, 1]) {
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

  // Wings: swept, tapered, RISING outboard. The root chord overlaps the
  // pods and the centre body below; that overlap is load-bearing, not
  // decoration — the R5b first draft attached the wings through a single
  // 1 px row and under JET-SIL's own mask (keyline #000000 fails
  // max(RGB)>30) the outer panels fell off the largest 8-connected
  // component, reading SPAN 68 on a 100 px aircraft.
  // The wing is drawn in THREE chordwise bands, not as one plank. On the
  // crop the leading edge is the brightest line on the aircraft, the panel
  // behind it is a step warmer, and the trailing edge is a dark lip. R6 drew
  // the whole upper surface in one tone, which is both the "flat slabs"
  // reading and ~200 px of lightTop that should have been two rungs.
  poly(wingPoly(-1), c.lightNeutral);
  poly(wingPoly(+1), c.lightNeutral);
  // Leading-edge band, the top ~45% of the chord, in the brightest tone.
  poly([[31, 21.0], [1, 17.7], [1, 19.0], [31, 23.0]], c.lightTop);
  poly([[69, 21.0], [99, 17.7], [99, 19.0], [69, 23.0]], c.lightTop);
  // Underside: the band between mid-chord and the trailing edge. Kept thin
  // on purpose — a large warm-shadow region also satisfies JET-SIL's
  // nozzle-glow hue/sat/val test and would be picked up as a false third
  // "nozzle" by the two-largest-component step.
  // R7 thins it from 3.8 root rows to 2.0, which is what leaves the mid-chord
  // to lightNeutral. R6's band ran from mid-chord all the way to the trailing
  // edge, so the "second cream" the arcade spends 23.7 % of its airframe on
  // survived only as a 0.2-row sliver and the sheet shipped 8.2 % of it.
  poly([[32, 25.0], [1, 19.8], [1, 20.6], [31, 27]], c.warmMid);
  poly([[68, 25.0], [99, 19.8], [99, 20.6], [69, 27]], c.warmMid);
  // ...and a 1 px dark trailing edge under it. On the crop the wing's last
  // row is a clear step below the underside band, and without it the wing is
  // one flat plank at native size however bright the top surface is.
  poly([[31.5, 25.9], [1, 19.95], [1, 20.6], [31, 27]], c.coolDark);
  poly([[68.5, 25.9], [99, 19.95], [99, 20.6], [69, 27]], c.coolDark);
  // Wingtip rails: the crop ends each wing in a short, slightly deeper
  // element set off from the panel by a one-pixel break.
  for (const s of [-1, 1]) {
    poly([[JET_CX + s * 40, 17.6], [JET_CX + s * 41, 17.6], [JET_CX + s * 41, 20.6], [JET_CX + s * 40, 20.6]], c.coolDark);
    poly([[JET_CX + s * 41, 17.4], [JET_CX + s * 49, 17.1], [JET_CX + s * 49, 20.5], [JET_CX + s * 41, 20.7]], c.lightTop);
  }

  // Dorsal deck between the blade roots — the body's topmost element, a
  // narrow nub at 59.7%H widening to the full 21.5% of span by 63.6%H.
  poly([[47, 15.5], [53, 15.5], [61, 19], [39, 19]], c.lightTop);
  // Shaded flanks either side of the deck — the crop's body is three value
  // planes across, not one.
  poly([[47, 15.8], [43.4, 15.8], [39, 19], [44.5, 19]], c.midNeutral);
  poly([[53, 15.8], [56.6, 15.8], [61, 19], [55.5, 19]], c.midNeutral);
  // Dark dorsal slot (the crop shows a recessed rectangle in the deck). R7
  // puts it on coolDark rather than a dedicated near-black: the arcade's
  // whole daylight airframe has NOTHING darker than #948463 outside the
  // nozzle throats, and R6's #635252 (V 0.388) was off the measured ladder
  // entirely. One fewer colour and one fewer dark pixel at the same time.
  rect(45.5, 17.4, 9, 1.4, c.coolDark);

  // Engine bodies below the nozzles, sweeping down and INWARD — the crop's
  // lateral run moves from |x| 18.5..30.5 at 85.7%H to |x| 4.6..14.2 at
  // 98.7%H, so the lower aircraft closes to a V rather than ending in a bar.
  // lightTop, not midNeutral, and the reason is a measured one rather than a
  // taste one. The arcade's airframe is 62% at V >= 0.969; ours was 31% at its
  // top tone with 40% in the mid. Promoting these two masses (~90 px) puts
  // lightTop at ~43% of the achromatic population, which is what flips the
  // NIGHT sheet's median from 0.773 to the arcade's own 0.969 while leaving
  // the DAY median at 0.839 (coolDark + midNeutral still clear 50% below it).
  // Day and night share this geometry, so role AREA is the only lever that
  // reaches both.
  // R7: lightNeutral, not lightTop. The arcade's two brightest rungs run
  // 31.8 % / 23.7 %, i.e. its second tone is nearly as big as its first;
  // R6 had 27 % / 0 %. These two masses (~90 px) are the largest single
  // block on the sprite that can carry the second rung without breaking the
  // "no unbroken slab" rule, because the pods and the fuselage cut across
  // them. Night tracks this automatically — see the ramp map in palettes.js.
  poly([[29, 23], [42, 23], [47, 30.2], [39, 30.2]], c.lightNeutral);
  poly([[71, 23], [58, 23], [53, 30.2], [61, 30.2]], c.lightNeutral);

  // Centre fuselage: widest at the wing line, tapering to a point at the
  // bottom and reaching lower than the engine bodies. Replaces R5's
  // constant-width strip.
  poly([[39, 19], [61, 19], [59, 24], [41, 24]], c.lightTop);
  poly([[39, 19], [43, 19], [44.5, 24], [41, 24]], c.midNeutral);
  poly([[61, 19], [57, 19], [55.5, 24], [59, 24]], c.midNeutral);
  // Lower fuselage in midNeutral, not lightTop: the crop shows the body below
  // the nozzle line a clear step darker than the dorsal deck, and this is also
  // the ~70 px that holds lightTop under half of the achromatic population —
  // see the ROLE AREAS note above.
  // R7 puts it on the SAME rung as the engine bodies flanking it, which is
  // what the t175 crop shows: below the nozzle line the centre body and the
  // engine bodies are one continuous mid-bright plane, parted only by the
  // dark notch. R6's comment asked for "a clear step darker than the dorsal
  // deck" and lightNeutral is exactly one step darker than the deck —
  // the step is kept, it is just the right size now.
  poly([[41, 24], [59, 24], [52.6, 30.8], [47.4, 30.8]], c.lightNeutral);
  // The dark slot between the engine bodies, at 76.6%H on the crop (a ~2.8%
  // of span gap in that row's runs), not a full-height hole.
  poly([[46.0, 22.2], [54.0, 22.2], [52.6, 25.8], [47.4, 25.8]], c.key);

  // Canopy fleck — topmost body element, the only non-grey/non-orange
  // accent. REFERENCE.md's canopy-coverage bound: a fleck, never a shape.
  rect(48, 15.8, 4, 1.6, c.canopy);

  // Ventral fins, outboard of and below each pod (the crop's 89.6%H row has
  // a separate run at |x| 16.5..23.7).
  poly([[JET_NAC_X[0] - 2, 25.5], [JET_NAC_X[0] - 7, 29.5], [JET_NAC_X[0], 26.5]], c.coolDark);
  poly([[JET_NAC_X[1] + 2, 25.5], [JET_NAC_X[1] + 7, 29.5], [JET_NAC_X[1], 26.5]], c.coolDark);

  // Nacelle pods + nozzles, LAST so they stand proud of the wing root and
  // the centre body — "separate rounded bodies" is R5 gap 7's wording and
  // the crop's row-runs agree. The POD SHELL is airframe-bright and overlaps
  // both the wing root and the body, which is what keeps the lower third of
  // the silhouette attached: a bare flame disc inside a closed black ring is
  // an ISLAND under any brightness mask (the ring fails max(RGB)>30), and
  // the R5b first draft measured H=25 on a 31-row aircraft for exactly that
  // reason. The black is confined to the nozzle throat, which is the dark
  // anchor of the whole silhouette, and the hot disc is big: on the crop the
  // orange fills ~60% of the pod's diameter, where R5 drew it at ~48%.
  //
  // R7 GROWS THE POD, AND ONLY DOWNWARD. Two independent reasons point the
  // same way. (1) The art critic: "our nacelle rings are rounded squares;
  // the arcade's are round discs, proportionally larger against the
  // fuselage, with a bright core" — and the native crop's discs are
  // unmistakable. (2) The black has to go somewhere: moving the keyline off
  // the perimeter takes ~290 px of #000000 out of the airframe mask, and the
  // reading-A window above needs 6.5-21.5 % of it back. The arcade keeps ALL
  // of its black here, so this is not a budget being balanced — it is the
  // same redistribution read off the same frame.
  //
  // The growth is strictly downward (centres shifted +0.4..+0.9, ry up, the
  // TOP edge held at ~17.8) because R6 established by measurement that a pod
  // whose top enters the fin band makes JET-SIL compute `cant` between a
  // blade and a pod and return a stable, reproducible, completely wrong
  // 1.13. `cut` is raised with the radii so the octagon stays as round as a
  // 12 px shape can be rather than turning back into a square.
  for (const nx of JET_NAC_X) {
    // `cut` is ~0.58 of the shorter radius on every ring, which is the value
    // that turns a cut square into a REGULAR octagon. R6 (and R7's first
    // draft) used ~0.4, and cropping the cell at 8x shows the result plainly:
    // the nozzles read as orange SQUARES where the arcade's read as discs.
    // At an 11 px pod that one constant is the whole difference.
    poly(podPoly(nx, JET_NAC_Y + 1.0, 6.8, 5.4, 3.1), c.lightTop);
    poly(podPoly(nx, JET_NAC_Y + 2.2, 6.4, 4.4, 2.5), c.coolDark);
    poly(podPoly(nx, JET_NAC_Y + 1.2, 5.9, 4.9, 2.8), c.key);
    // The ring is THIN and the core is BIG: on the t175 crop the black is a
    // one-to-two pixel annulus round a disc that is mostly orange, and the
    // art critic's "with a bright core" says the same. R6 drew the orange at
    // ~60 % of the pod diameter; this is ~75 %, and the hot centre with it.
    poly(podPoly(nx, JET_NAC_Y + 1.3, 4.4, 3.5, 2.0), c.flame);
    poly(podPoly(nx, JET_NAC_Y + 2.0, 2.0, 1.6, 0.9), c.flameCore);
  }

  addUnderKeyline(buf, pal.rim);
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
const JET_PALETTE_ROLES = [
  'key', 'rim', 'lightTop', 'lightNeutral', 'midNeutral', 'warmMid', 'coolDark',
  'canopy', 'flame', 'flameCore',
];

function buildJetTexture(pal) {
  const missing = JET_PALETTE_ROLES.filter((r) => !pal[r]);
  if (missing.length) {
    throw new Error(
      `spriteFactory: jet palette is missing role(s) ${missing.join(', ')}. ` +
      'drawJetSilhouette() and tools/art/sheets/player-f14.js roles() must ' +
      'agree on these ten names -- see tools/art/mirror_check.py.'
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

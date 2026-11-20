import * as THREE from 'three';
import { createPrng } from '../core/prng.js';

// Cloud banks. ARCHITECTURE.md D2: billboard sprites (THREE.Sprite),
// canvas-authored pixel art, scaled by the real perspective camera — no lit
// meshes, no manual depth-scale math.
//
// SIZE/PLACEMENT TARGETS COME FROM A RE-MEASUREMENT, NOT FROM REFERENCE.md's
// PUBLISHED #132 FIGURES. REFERENCE.md gives stage-1 banks as presence 68-69%
// of frames, width median 9.26%W / p90 21.49, height median 6.04%H, aspect
// 0.97. R5 re-ran that classifier on its own source span (ab2-longplay.mp4
// t=93-120, the STAGE_MAP-verified stage-1 span) and hand-classified all 90
// components it returns: only 11 are cloud banks. The other 79 are the launch
// carrier's superstructure, the HUD reticle's attitude line on empty sky,
// enemy airframes, missile smoke plumes, explosions, coastline/island and sea
// foam — all of which are bright and low-saturation, and the 45%H window does
// not keep the sea out because the horizon moves with pitch and roll.
// Measured over the 11 real banks (full table in judging/R5/lane-world.md):
//
//     width  %W  median 18.66   p25 10.35  p75 26.60  p90 33.24  max 42.27
//     height %H  median 22.50   p25 11.67  p75 32.92  p90 37.71  max 42.08
//     aspect     median 0.83 normalised = 1.19 in pixels
//     centre     10.0%H to 33.8%H, median 26.1%H; tops reach 2.9%H
//
// Five of the eleven are cut by the 45%H window, so those heights are lower
// bounds. That is the geometry this file is built to, and it is the R4
// judge's complaint restated: "big cumulus masses that the jet flies past;
// ours carries 1-3 small puffs."
//
// Two things make a bank read as a mass:
//
//  1. THE ART. R4's puff was five or six large smooth circles filled flat
//     white with one grey under-pass. The arcade's is neither smooth nor
//     flat. MEASURED at native 320x224 on ab2-arcade-night-banking.png
//     (cloud at y[48,90] x[58,102], 1366 px above V 0.24) and on
//     ab2-arcade-desert.png (y[92,122] x[200,232] and y[110,140] x[240,275]):
//     each cloud is a SIX-STEP palette ramp with heavy interior mottling,
//     not a two-tone blob —
//       night  #f7f7f7 46% / #e6d6e6 30% / #d6c5d6 15% / #c5b5c5 5% /
//              #b5a4b5 3% / #a494a4 <1%
//       desert #f7f7e6 40% / #f7f7b5 33% / #e6e6a4 17% / #d6d694 6% /
//              #c5c584 3.5% / #b5b573 <1%
//     i.e. about a quarter of every cloud's pixels are the darker half of
//     its ramp, scattered through the interior as cauliflower creases, and
//     the perimeter is bumpy at a 1-3 px scale rather than being a smooth
//     arc. The clouds are also STAGE-TINTED (cream on stage 2's orange sky,
//     lavender-grey on stage 3's night) — see CLOUD_PALETTES.
//
//  2. THE BANK MODEL. A bank is ONE to THREE big lobes sharing one depth,
//     offset along a shallow diagonal and overlapping by roughly half, so
//     the whole thing segments as a single component. t120's 33.24%W bank is
//     two such lobes; t106.5's 26.38%W one is a single mass with a shoulder.
//     An earlier R5 version ran up to five SMALL puffs in a horizontal row
//     to reach a 2:1 bank bbox — that bbox came from the thin sea-foam and
//     reticle components above, not from clouds.
//
// Camera constants duplicated from game.js (not imported — game.js is
// another lane's file; keep in sync if those ever change), same approach as
// ground.js's haze fix.
const CAMERA_HEIGHT = 2.2;
const CAMERA_PITCH = 0.12941440818613054;
const FOV_DEG = 55;
// Vertical band for a bank CENTRE, as a screen fraction. MEASURED on the
// eleven hand-classified arcade stage-1 cloud banks (judging/R5/lane-world.md,
// per-bank table): bbox centres run 10.0%H to 33.8%H, median 26.1%H, and five
// of the eleven are cut by the classifier's own 45%H window, so their true
// centres sit lower still. Tops reach 2.9%H (t101.5) — i.e. arcade banks run
// off the top of frame and pass BEHIND the HUD.
//
// R3/R4 held a "zero cloud/HUD-overlap" control which forced every puff's top
// edge below 0.245H. That control is RETIRED here: it contradicts the arcade
// (see reference frames t100/t105/t106/t120 — a cloud sits squarely behind
// SCORE/HIT with the glyphs rendering over it, evidence crop in the dev
// report), and holding it compressed every bank into 32-58%H, which is the
// bottom third of the arcade's own cloud band and a direct cause of gap 7.
// The HUD is composited AFTER the scene into the same low-res target
// (src/render/screen.js), so a cloud behind it cannot touch its legibility —
// verified by capture, see the dev report's contrast check.
const BANK_FRAC_LO = 0.09;
// R12 rank 7. HI raised 0.42 -> 0.50 so a bank can sit LOW in the sky, just
// above the horizon, and pass near/under the jet — the "fly past and under"
// the gestalt pass asks for. This moves TOWARD the arcade, not away: R5's
// own hand-classified banks have centres running to 33.8%H with five of the
// eleven CUT by the classifier's 45%H window (so their true centres sit
// lower still), and the climbout banks on stage1-climbout-t92.png are
// bottom-anchored masses rising from below the frame. updateBankPositions
// still clamps the centre to 0.56H so a big bank's base stays above the
// 0.625H horizon and never dips into the sea.
const BANK_FRAC_HI = 0.50;

// World Y that projects to a target screenFrac at a given z (same closed
// form as game.js's worldYForScreenFrac).
function worldYForScreenFrac(targetFrac, z) {
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV_DEG) / 2);
  const ndcY = 1 - 2 * targetFrac;
  const k = ndcY * halfTan;
  const dy = (-z * (Math.sin(CAMERA_PITCH) + k * Math.cos(CAMERA_PITCH))) / (Math.cos(CAMERA_PITCH) - k * Math.sin(CAMERA_PITCH));
  return CAMERA_HEIGHT + dy;
}

// Six-step ramps, lightest first, MEASURED at native resolution — see the
// header. 'day' has no native-resolution reference frame of its own (the
// only daylight cloud frames are 686x480 video upscales), so it takes the
// night ramp's STEP STRUCTURE — which is the arcade's own 4-bit ladder,
// n*247/15 per channel — and the measured daylight tint: on
// stage1-climbout-t92.png the cloud mass (y[260,400] x[80,300], mask V>0.59
// and S<0.35, n=30514) reads modal #fdfafe, p50 (249,246,250), p25
// (244,241,245), p2 (210,207,211) — white with a faint lavender cast and
// shading that bottoms out around the third rung.
// R6 gap 1 — CLOUDS WERE THE WHOLE REMAINING CRITERION A FAILURE, and the
// sea rebuild is what exposed it. Once the ground stopped emitting
// continuous tone, a per-region split of a six-frame stage-1 run read:
//
//   frame   sky+cloud rows [0,130)        ground rows [145,224)
//           colours / channel values      colours / channel values
//   0           17 /  23                      42 / 18
//   3           86 / 105                      41 / 18
//   4          714 / 221                      42 / 18
//
// The ground is invariant at 18 channel values on every frame; the whole
// 55 -> 753 colour / 31 -> 221 channel-value swing that fails the frame
// gate lives in the cloud sprites, and it switches on with cloud SIZE.
// Two mechanisms, both continuous-tone by construction:
//
//   1. MINIFICATION. makeCloudTexture keeps magFilter NEAREST but leaves
//      minFilter at three's mipmapped trilinear default, deliberately: R3
//      measured that nearest minification shatters a shrinking cloud into
//      12-14 disconnected components (target max 6) and crushes its width
//      to ~1.9%W against 9.26. That fix is correct and stays. But trilinear
//      blends palette rungs against each other, so a cloud smaller than its
//      texture emits arbitrary intermediate colours — which is exactly why
//      frames 0/1/2/5 (one large, magnified cloud) read 17 colours and
//      frames 3/4 (smaller, minified) read 86 and 714.
//   2. ALPHA BLENDING. The soft perimeter blends cloud against #009fff sky
//      across a one-pixel ramp, generating a fresh continuum at every edge.
//      1987 sprite hardware cannot do this at all: a sprite pixel is either
//      an opaque palette index or the transparent index. The soft edge was
//      never arcade-correct, it was a three.js default.
//
// The fix keeps the filtering (so the silhouette stays coherent) and
// removes the continuum AFTER it: snap the filtered texel to the nearest
// entry of this cloud's own 6-colour palette, and make coverage 1-bit.
// Snapping to the PALETTE rather than to the 31-rung hardware ladder is
// the stronger choice — a ladder snap would still let two palette rungs
// interpolate into a third, valid-but-unauthored rung, whereas a palette
// snap also satisfies Criterion A3 ("<=8 colours for an aircraft, vehicle
// or cloud sprite") by construction, against the arcade cloud puff's
// measured 5.
//
// The comparison runs in LINEAR working space, not sRGB. palUniform is
// built with THREE.Color's sRGB->linear decode and the texture is tagged
// SRGBColorSpace, so map_fragment hands us a decoded texel and both sides
// of the distance test are in the same space; the renderer re-encodes on
// write. Getting this backwards is this project's most-repeated bug, so it
// is verified by measurement rather than by reading: cloud pixels must come
// back EXACTLY the authored hexes, not near them.
const CLOUD_PALETTES = {
  day: ['#f7f7f7', '#e6e6f7', '#d6d6e6', '#c5c5d6', '#b5b5c5', '#a4a4b5'],
  desert: ['#f7f7e6', '#f7f7b5', '#e6e6a4', '#d6d694', '#c5c584', '#b5b573'],
  night: ['#f7f7f7', '#e6d6e6', '#d6c5d6', '#c5b5c5', '#b5a4b5', '#a494a4'],
};

// The palette as a linear-space uniform, shared by every bank's material so
// setStage() can repoint all of them with one write. Length is fixed at
// PAL_N because a GLSL array size must be a constant; every CLOUD_PALETTES
// entry is exactly that long.
const PAL_N = 6;

function makePaletteUniform(palette) {
  return {
    value: palette.map((hex) => {
      const c = new THREE.Color().setStyle(hex, THREE.SRGBColorSpace);
      return new THREE.Vector3(c.r, c.g, c.b);
    }),
  };
}

function setPaletteUniform(uniform, palette) {
  palette.forEach((hex, i) => {
    const c = new THREE.Color().setStyle(hex, THREE.SRGBColorSpace);
    uniform.value[i].set(c.r, c.g, c.b);
  });
}

// Patch three's built-in sprite shader rather than replacing the material:
// THREE.Sprite's billboarding lives in that shader's vertex stage, so a
// hand-rolled ShaderMaterial would have to reimplement it. The hook point is
// <alphatest_fragment>, which runs after <map_fragment> has sampled and
// decoded the texture into diffuseColor.
function applyArcadeSpriteQuantization(material, palUniform) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPal = palUniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `uniform vec3 uPal[${PAL_N}];\nvoid main() {`)
      .replace(
        '#include <alphatest_fragment>',
        `
        // 1-bit coverage, as the hardware has. 0.5 on the trilinear-filtered
        // alpha is a coverage threshold, so the silhouette tracks the
        // filtered shape instead of fragmenting the way a nearest-minified
        // alpha did in R3.
        if ( diffuseColor.a < 0.5 ) discard;
        diffuseColor.a = 1.0;
        vec3 qBest = uPal[0];
        float qBestD = 1e9;
        for ( int qi = 0; qi < ${PAL_N}; qi++ ) {
          vec3 qd = diffuseColor.rgb - uPal[qi];
          float qdd = dot( qd, qd );
          if ( qdd < qBestD ) { qBestD = qdd; qBest = uPal[qi]; }
        }
        diffuseColor.rgb = qBest;
        `
      );
  };
  // Changing onBeforeCompile after a material has been used requires a
  // recompile; set it before first render and three picks it up on the
  // initial program build.
  material.needsUpdate = true;
}

// Cumulus texture. AUTHORED FROM THE NATIVE-RESOLUTION REFERENCE, not from
// a shading model: ab2-arcade-desert.png and ab2-arcade-night-banking.png
// are 320x224 originals, and at 7-8x magnification an arcade cloud is
//
//   * a ROUND cauliflower mass (one blob, or two stacked and merged),
//   * filled edge to edge with a FINE 1-2 px STIPPLE of the palette ramp,
//   * with NO large coherent shadow band — the darker rungs are scattered
//     as short creases all through the interior, top included,
//   * and a soft, notched perimeter that breaks up over about one pixel.
//
// Three earlier R5 attempts missed this by building a lighting model
// instead: scattered dark discs (read as grey polka dots at bank size), then
// a shaded underside band (a grey bowl covering half the mass), then a
// nested three-band version (a beaded mid-grey necklace around a white
// core). All three are in the capture crops in judging/R5/lane-world.md.
//
// So the silhouette and the texture are authored SEPARATELY here. The
// silhouette is drawn from discs under a transform that normalises the mass
// to fill the canvas; the colour is then written PER PIXEL in texture space,
// so the stipple stays on the pixel grid (CLAUDE.md: fractional Canvas2D
// positions antialias chunky pixel art into blur).
//
// The rung populations are calibrated from the measured ramp — night
// #f7f7f7 46% / #e6d6e6 30% / #d6c5d6 15% / #c5b5c5 5% / #b5a4b5 3% /
// #a494a4 <1% — by taking PERCENTILES OF THE ACTUAL NOISE SAMPLE rather
// than cutting a nominal [0,1] range, which is the calibration mistake this
// project has now made three times (CLAUDE.md "Percentile calibration on
// fbm noise").
const RUNG_SHARES = [0.46, 0.30, 0.15, 0.05, 0.03, 0.01];

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// Two-octave value noise on an integer grid, bilinearly sampled. Gives the
// 2-3 px clumps the reference shows instead of salt-and-pepper.
function valueNoise(W, H, cell, rng) {
  const gw = Math.ceil(W / cell) + 2;
  const gh = Math.ceil(H / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const fy = y / cell;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = x / cell;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const a = g[y0 * gw + x0];
      const b = g[y0 * gw + x0 + 1];
      const c = g[(y0 + 1) * gw + x0];
      const d = g[(y0 + 1) * gw + x0 + 1];
      out[y * W + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
  }
  return out;
}

function drawCloud(ctx, W, H, rng, pal) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H * 0.5;
  const rx = W * 0.45;
  const ry = H * 0.45;

  // --- silhouette -------------------------------------------------------
  // One round mass, or two stacked/merged — both are in the desert crop.
  // Centres are placed at 0.42x the sum of the radii so the discs always
  // intersect; an earlier version let them separate and the segmentation
  // operator then saw two components, with the taller one alone setting the
  // measured aspect (0.62 against a 0.83 target).
  const lobes = [];
  const crowns = [];
  if (rng() < 0.45) {
    const rA = ry * (0.54 + rng() * 0.14);
    const rB = ry * (0.38 + rng() * 0.14);
    const d = 0.42 * (rA + rB);
    const ang = (rng() - 0.5) * 1.5; // merged pairs lean, they are not always side by side
    crowns.push({ x: cx - Math.cos(ang) * d, y: cy - Math.sin(ang) * d, r: rA });
    crowns.push({ x: cx + Math.cos(ang) * d, y: cy + Math.sin(ang) * d, r: rB });
  } else {
    crowns.push({ x: cx + (rng() - 0.5) * rx * 0.1, y: cy + (rng() - 0.5) * ry * 0.1,
                  r: ry * (0.62 + rng() * 0.12) });
  }
  for (const c of crowns) lobes.push(c);
  // Cauliflower bumps riding on each crown's own circumference, so the
  // roughening follows whatever silhouette the form produced. Putting them
  // on a ring around the texture centre instead left the two-mass form with
  // a hole through its middle.
  for (const c of crowns) {
    const n = 14 + Math.floor(rng() * 7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      lobes.push({ x: c.x + Math.cos(a) * c.r * 0.86, y: c.y + Math.sin(a) * c.r * 0.86,
                   r: c.r * (0.22 + rng() * 0.14) });
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const l of lobes) {
    if (l.x - l.r < minX) minX = l.x - l.r;
    if (l.x + l.r > maxX) maxX = l.x + l.r;
    if (l.y - l.r < minY) minY = l.y - l.r;
    if (l.y + l.r > maxY) maxY = l.y + l.r;
  }
  // Normalise the mass to fill the canvas: without this the leftover
  // transparent margin skews the on-screen aspect, and the sprite's
  // scale.x/scale.y stops being the only thing that sets it.
  const m = 0.015;
  ctx.save();
  ctx.translate(W * m, H * m);
  ctx.scale((W * (1 - 2 * m)) / (maxX - minX), (H * (1 - 2 * m)) / (maxY - minY));
  ctx.translate(-minX, -minY);
  ctx.fillStyle = '#ffffff';
  for (const l of lobes) {
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- colour, written per pixel in texture space -----------------------
  const img = ctx.getImageData(0, 0, W, H);
  const px = img.data;
  const inside = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) inside[i] = px[i * 4 + 3] > 128 ? 1 : 0;

  const n1 = valueNoise(W, H, 2.6, rng);
  const n2 = valueNoise(W, H, 6.5, rng);
  const field = new Float32Array(W * H);
  const sample = [];
  for (let i = 0; i < W * H; i++) {
    field[i] = n1[i] * 0.62 + n2[i] * 0.38;
    if (inside[i]) sample.push(field[i]);
  }
  // Percentile cuts taken from the sample itself, high value = light rung.
  sample.sort((a, b) => a - b);
  const cuts = [];
  let acc = 0;
  for (let r = RUNG_SHARES.length - 1; r > 0; r--) {
    acc += RUNG_SHARES[r];
    cuts[r] = sample[Math.min(sample.length - 1, Math.floor(acc * sample.length))];
  }
  const rgb = pal.map(hexToRgb);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!inside[i]) continue;
      // Soft, notched perimeter: an edge pixel drops out when the noise is
      // low, which breaks the outline over about one pixel the way the
      // reference does, instead of leaving a hard circle arc.
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 ||
        !inside[i - 1] || !inside[i + 1] || !inside[i - W] || !inside[i + W];
      if (edge && field[i] < cuts[2]) {
        px[i * 4 + 3] = 0;
        continue;
      }
      let rung = 0;
      for (let r = RUNG_SHARES.length - 1; r > 0; r--) {
        if (field[i] <= cuts[r]) { rung = r; break; }
      }
      const c = rgb[rung];
      px[i * 4] = c[0];
      px[i * 4 + 1] = c[1];
      px[i * 4 + 2] = c[2];
      px[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Texture resolution, chosen so the authored stipple survives to screen.
// A bank runs 25 to 135 native px wide at 320x224 (median 60): at 96x78 the
// median bank is close to 1:1, the biggest is magnified 1.4x, and the
// smallest minifies to a flat tone — which is also what a distant arcade
// cloud does. Going to 128 made the stipple finer than a screen pixel at
// typical sizes, which the mipmap then averaged into flat grey.
const TEX_W = 96;
const TEX_H = 78;

function makeCloudTexture(rng, pal) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawCloud(ctx, TEX_W, TEX_H, rng, pal);
  const texture = new THREE.CanvasTexture(canvas);
  // magFilter stays nearest (chunky look when a cloud is close/large);
  // minFilter must NOT be nearest — a distant/small cloud sprite shrinks
  // far below its texture's native size, and nearest-neighbor minification
  // aliases the multi-lobe shape into scattered disconnected pixels instead
  // of a coherent blob (found by measurement in R3: this fragmented single
  // clouds into 12-14 detected components per frame against a target max of
  // 6, and crushed measured size to ~1.9%W against a 9.26%W target).
  // Three's default (mipmapped trilinear) minFilter correctly downsamples.
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// R40 gap 5a — "A CLOUD MASS IS GLUED TO MY JET AND HIDES THE FIGHT"
// (R39 playtest rank 5; evidence judging/R39/playtest-evidence/
// s3b-t51-cloud-glued-to-jet.png).
//
// MEASURED, and the word "glued" turned out to be literally right. The
// operator is model-free: take the cloud mask on two frames 3 ticks apart,
// find the integer screen displacement that maximises their overlap (FFT
// cross-correlation), and report it in %W per second. It assumes nothing
// about approach geometry and survives clipping, merging and growth, all of
// which defeated a 1/size growth fit on the arcade footage. It recovers a
// planted displacement exactly at 1/4/7 px per frame
// (judging/R40/art-clutter/drift_rate.py --selftest).
//
//   cloud-mass screen drift        p25     p50     p75   frac < 10 %W/s
//   arcade stage-1 t90-110        16.8    37.5    65.6       0.222
//   arcade stage-1 t112-120       20.3    37.5    53.0       0.143
//   OURS, before this change       0.0     0.0     0.0       0.838
//
// Our cloud mass did not move across the screen AT ALL — median drift 0.00
// %W/s, 84 % of frame pairs under 10 — while the arcade's sweeps past at a
// median 37.5 %W/s, the same median on both spans. Two causes, both here:
//
//  1. SPEED. A cloud is a world-stationary object, and the player flies
//     through the world at stage.scrollSpeed = 68.93 world units/s — that
//     is the rate the GROUND flows past the camera. These clouds closed at
//     9.5, 7.3x slower than the world they sit in, so a bank crawled across
//     the combat band while everything else rushed by. 68.93 is not picked
//     because it is the nearest constant: it is the speed that makes a
//     cloud move with the world the player is measurably moving through,
//     and it is what lands the drift and dwell figures in the arcade's
//     bands (verified after the change, judging/R40/art-clutter/NOTES.md).
//  2. PINNED SCREEN HEIGHT — see updateBankPositions, fixed separately.
//
// Dwell, the second half of the complaint, on the combat band (rows 16..140
// of 320x224), cloud-only by differencing a full capture against a matched
// ?noclouds=1 one (cloud_only.py, 20 s of ?demo=1 at 60 Hz):
//
//                              ours before    arcade t90-110 / t112-120
//   presence (band >5% cloud)      0.458          0.225 / 0.085
//   median cloud event             1.28 s         0.45 s / 0.34 s
//   median gap between events      1.37 s         2.50 s / 3.66 s
//
// Cloud PLACEMENT was measured too and is NOT the gap: cloud-mass centroid
// 0.24-0.47 %H in the arcade against 0.36 %H here, mask top 0.07 %H on both
// sides. BANK_FRAC_LO/HI therefore do not move; only the motion does.
const WORLD_SPEED = 68.93;
// Duplicated from stage.js's scrollSpeed rather than imported — the same
// standing arrangement as the camera constants at the top of this file
// (stage.js is another lane's). Every authored stage uses this one value.
// The THROTTLE does vary the real scrollSpeed per detent, which a constant
// cannot see; update() therefore takes an optional worldSpeed argument so
// game.js can pass this.flow.scrollSpeed with a one-line change on its
// side. Logged as an ask in judging/R40/art-clutter/NOTES.md.
const SPAWN_Z = -150;
// Was -70. At 68.93 u/s a bank spawning at -70 enters the frame already
// ~15 %W wide, which pops; from -150 it arrives at ~6 %W — just under the
// arcade's measured 7.6 %W smallest bank — and grows in. Well inside the
// camera's 2000-unit far plane.
const DESPAWN_Z = 6; // past the camera

// A BANK IS ONE SPRITE. R4 and the first R5 pass built a bank from several
// overlapping puff sprites so a row of small round puffs would measure as a
// wide bbox. Two things killed that model: the wide-bbox target came from
// sea foam and reticle lines rather than clouds (see above), and at the real
// bank size every puff's own outline and own underside shading stayed
// visible through its neighbours, so a bank read as a ROW OF IDENTICAL
// PUMPKINS rather than one mass (tune-4/tune-5 capture crops). The mass is
// now authored whole in one texture, which is also how the reference reads:
// t106.5 is one mass with a shoulder, t120 two merged lobes with a single
// continuous underside.
const BANK_SLOTS = 4;

// Bank size, in world units of sprite width at spawn depth.
//
// R5 RE-TARGET. The sizes these produce used to be aimed at REFERENCE.md's
// published #132 figures (width median 9.26%W / p90 21.49, height median
// 6.04%H). Those figures are NOT cloud measurements: re-running the #132
// operator on its own source span and hand-classifying every component it
// returns (judging/R5/lane-world.md) shows only 11 of 90 are cloud banks —
// the rest are the launch carrier's superstructure, the HUD reticle's
// attitude line, enemy airframes, missile plumes, explosions, coastline and
// sea foam. Measured over the 11 real banks:
//     width  %W  median 18.66  (p25 10.35, p75 26.60, p90 33.24, max 42.27)
//     height %H  median 22.50  (p25 11.67, p75 32.92, p90 37.71, max 42.08)
//     aspect     median 0.83 normalised = 1.19 in pixels
// i.e. the arcade's banks are ~2.6x wider and ~4x taller than the published
// numbers say, which is exactly the R4 judge's complaint ("big cumulus
// masses that the jet flies past; ours carries 1-3 small puffs") stated as
// geometry. These constants are tuned to the measured-bank figures.
// R40: both scaled x1.45. Re-measuring the arcade's banks with THIS round's
// operator (largest cloud component per frame, same class and the same
// native downsample on both sides, judging/R40/art-clutter) puts the arcade
// at width p50 30.0 %W / p90 44.7 / max 67.8 on the t90-110 span and p50
// 43.4 on t112-120, where ours read p50 20.6 / max 32.8 — our banks are
// simply smaller on screen than the arcade's, before and after the motion
// fix. (This does NOT contradict R5's 18.66 %W median above: that figure is
// a median over eleven hand-classified banks at whatever depth each happened
// to be, including far ones, while this is the largest mass in frames that
// HAVE a cloud. Both are quoted here with their operators so the next reader
// can tell them apart.) 1.45x is 30.0/20.6, i.e. it closes the gap exactly
// and no further.
const BANK_BASE = 18.8;
const BANK_JITTER = 8.1;
// Bank aspect is the FINAL on-screen width/height ratio: a THREE.Sprite
// stretches its texture to fit scale.x/scale.y, so this must not be
// compounded with the canvas texture's own shape (an R3 version multiplied
// by that and skewed every cloud wider than intended). Centred on the
// measured pixel aspect 1.19.
const BANK_ASPECT_LO = 0.97;
const BANK_ASPECT_HI = 1.29;
// Low-probability large-bank tail: the measured spread is 7.6%W to 42.3%W
// around a median of 18.7, so the distribution needs a tail that does NOT
// move the typical bank.
//
// R12 rank 7 — the tail was too timid to ever reach the arcade's big banks.
// The MEASURED max is 42.27%W / 42.08%H with five of eleven heights being
// lower bounds, and the climbout banks on stage1-climbout-t92.png are the
// screen-filling masses the gestalt pass names ("you fly past and under;
// ours carries 1-3 small puffs"). BASE*2.3 = 30 world units reaches that
// measured max on screen; BASE stays 13 so the TYPICAL bank and the median
// are untouched. Chance 0.26 -> 0.30 is still a minority, so the median is
// the base bank; only the p90/max of the distribution grow, and both stay
// inside the arcade's own spread. A big bank is also biased LOW (see
// placeBank) so it reads as a mass the jet passes under, as the climbout does.
const BIG_BANK_CHANCE = 0.30;
const BIG_BANK_MULT_LO = 1.6;
const BIG_BANK_MULT_HI = 2.3;

// Bursty-bank timing (R3 gap 8), REBUILT R40.
//
// The old model was an ACTIVE/COOLDOWN pair: bring a group up, hold it for
// meanActive 2.5 s, then force every bank hidden and wait meanCooldown
// 1.15 s, giving presence = 2.5/3.65 = 0.685 to match REFERENCE.md's
// "68-69% of frames carry a bank". Two things were wrong with it once the
// clouds moved at world speed.
//
// First, the force-hide is a POP: at 9.5 u/s a bank was nowhere near the
// camera when its 1.5-3.5 s window expired, so it blinked out mid-sky. At
// 68.93 u/s a bank crosses the whole 156-unit approach in 2.26 s and leaves
// on its own, so the hide is not only unnecessary, it would cut most banks
// off before they ever arrive. Banks now despawn ONLY at DESPAWN_Z.
//
// Second, the cadence is now set by the measured GAP BETWEEN CLOUD EVENTS
// rather than by a presence ratio. Measured on the combat band at 60 Hz
// (see the WORLD_SPEED block above): the arcade's median gap between cloud
// events is 2.50 s (t90-110) and 3.66 s (t112-120), against 1.37 s here.
// GROUP_PERIOD is the interval between group spawns, drawn uniformly across
// that measured band; because a group's own visible life is ~2.3 s and only
// its last second covers much of the band, this reproduces both the gap and
// the 0.085-0.225 presence without any presence ratio being dialled in.
// SET FROM THE MEASURED GAP, not from a presence ratio. GROUP_PERIOD is the
// interval between group spawns; the quantity it has to deliver is the GAP
// between cloud events on the combat band, which the arcade puts at a median
// 2.50 s (t90-110) and 3.66 s (t112-120). A group's own coverage runs ~1.2 s
// mean (its banks are 1-3 arrivals at one depth, and a big bank crosses the
// 5 % threshold early in its approach), so the period is that plus the
// target gap. Measured at 2.5-3.7 the realised gap was 0.39 s — events ran
// nearly back to back — and presence sat at 0.594 against the arcade's
// 0.085-0.225. Lengthening the period is the only lever that moves the gap
// and the presence the same way at once, and it leaves the bank SIZE
// distribution alone, which is separately verified in band (largest-cloud
// width p25/p50/p75/p90 = 15.9/22.8/34.4/44.4 %W here against the arcade's
// re-measured 21.1/29.7/37.3/43.6 on the same operator).
const GROUP_PERIOD_MIN = 5.5;
const GROUP_PERIOD_MAX = 7.5;

// Number of BANKS brought up together. REFERENCE.md's published count
// distribution (median 1, p90 5, max 6) counts the same contaminants as its
// size figures; over the 11 hand-classified real banks the arcade's in-window
// count per frame is median 0, p90 1, max 3. Groups of 1-3 reproduce that
// without making the sky permanently empty.
function rollBankCount(rng) {
  const r = rng();
  if (r < 0.62) return 1;
  if (r < 0.90) return 2;
  return 3;
}

export function createClouds(stage, camera, seed = 1) {
  // TWO independent streams, not one shared rng(). R4 found a real bug:
  // adding one conditional draw to the per-cloud placement shifted every
  // subsequent call on a shared stream, silently perturbing the bank-timing
  // rolls that presence/count are measured against (count max swung 5->2
  // between two runs that only changed cosmetic size parameters).
  // Structural (bank timing/count, which presence/count depend on) and
  // cosmetic (per-puff position/size/aspect, which never should) stay fully
  // decoupled, so a cosmetic retune can never again move the structural
  // numbers.
  const rngStruct = createPrng(seed);
  const rngCosmetic = createPrng(seed + 7919); // offset, not derived from rngStruct's output
  const group = new THREE.Group();
  let palette = CLOUD_PALETTES[stage.cloudPalette] || CLOUD_PALETTES.day;
  const palUniform = makePaletteUniform(palette);

  const banks = [];
  for (let b = 0; b < BANK_SLOTS; b++) {
    const texture = makeCloudTexture(rngCosmetic, palette);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    applyArcadeSpriteQuantization(material, palUniform);
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    group.add(sprite);
    banks.push({ sprite, material, active: false, z: SPAWN_Z, baseFrac: 0, worldY: undefined });
  }

  // Bank centres are laid out in SECTORS across the sky rather than drawn
  // independently at random. With independent draws, banks kept colliding
  // and segmenting as one component — measured max bank width 75.00%W
  // against an arcade max of 42.27, which is two banks read as one. One bank
  // per sector guarantees the separation, and it is also what the reference
  // shows: t106 is three separate masses spread across the sky, not a pile.
  const BANK_SECTOR = 21; // world units between adjacent bank centres
  function placeBank(bank, idx, groupCount, groupOffsetX, groupZ) {
    const rng = rngCosmetic;
    // ONE DEPTH PER GROUP (R40). placeBank used to roll its own z per bank,
    // so a 2-3 bank group arrived strung out over a second or more and
    // segmented into that many separate cloud EVENTS, back to back. The
    // reference frame this grouping is modelled on (t106) is three masses
    // spread ACROSS the sky in one frame, i.e. one arrival at one depth.
    // The small per-bank jitter keeps them from being a rigid row.
    bank.z = groupZ * (0.94 + rng() * 0.12);
    // Cleared so updateBankPositions re-derives the world Y for THIS
    // placement; a bank slot is reused many times over a stage.
    bank.worldY = undefined;
    // Vertical placement across the arcade's measured band (BANK_FRAC_LO/HI).
    // baseFrac is the screen fraction the bank ENTERS at; from there it
    // parallaxes like the world-fixed object it is (see updateBankPositions).
    bank.baseFrac = BANK_FRAC_LO + rng() * (BANK_FRAC_HI - BANK_FRAC_LO);
    let w = BANK_BASE + (rng() - 0.5) * 2 * BANK_JITTER;
    if (rng() < BIG_BANK_CHANCE) {
      w *= BIG_BANK_MULT_LO + rng() * (BIG_BANK_MULT_HI - BIG_BANK_MULT_LO);
      // A big bank sits LOW (lower half of the band), so it reads as a mass
      // the jet passes under — the climbout composition — rather than a
      // giant puff floating in the top of the sky. The 0.56H clamp in
      // updateBankPositions keeps its base above the horizon.
      bank.baseFrac = Math.max(bank.baseFrac, (BANK_FRAC_LO + BANK_FRAC_HI) / 2 + rng() * (BANK_FRAC_HI - BANK_FRAC_LO) / 2);
    }
    const aspect = BANK_ASPECT_LO + rng() * (BANK_ASPECT_HI - BANK_ASPECT_LO);
    bank.sprite.scale.set(w, w / aspect, 1);
    bank.sprite.position.x =
      groupOffsetX + (idx - (groupCount - 1) / 2) * BANK_SECTOR + (rng() - 0.5) * 3.2;
    bank.sprite.visible = true;
  }
  // Lateral offset of a GROUP's centre from the flight axis, world units:
  // magnitude drawn in [LO,HI], sign drawn separately. NOT uniform about
  // zero, and that is the point.
  //
  // MEASURED R40. Where does arcade cloud mass actually sit across the
  // frame, and how do its events end? Over the cloud mask's centroid X and
  // whether the mask touches a left/right edge column:
  //
  //                          centroid X %W (p10/p50/p90)   touches a side edge
  //   arcade t90-110            0.20 / 0.35 / 0.64               0.59
  //   arcade t112-120           0.76 / 0.81 / 0.87               0.92
  //   OURS before               0.36 / 0.48 / 0.61               0.00
  //
  // Arcade cloud mass lives OFF TO THE SIDE and leaves through the side of
  // the frame in 59-92 % of cloud frames. Ours sat at dead centre (p50 0.48,
  // i.e. on the flight axis) and NEVER ONCE touched a side edge in 20 s —
  // every bank flew straight down the camera axis and grew in place. That is
  // the third and last mechanism behind "glued", and the one that keeps the
  // events long: a head-on bank stays in the combat band until it despawns,
  // where an off-axis one exits the side partway in.
  //
  // The old value was +/-6 UNIFORM, and 62 % of groups are a single bank
  // (rollBankCount), so most clouds sat within 6 units of the axis — but,
  // critically, the defect was never the magnitude. A first R40 pass set
  // this to [16,34] and overshot badly: banks exited the side of the frame
  // at depth 22-46, before they could grow, and the on-screen width p50 fell
  // to 18.8 %W against the arcade's 30.0/43.4 while peak band coverage fell
  // to 0.115 against the arcade's 0.665. The arcade's big passes come CLOSE.
  //
  // The geometry says why a small world offset is the right answer: screen
  // offset is x/(1.486 d), so the SAME x that is nearly centred at the far
  // end of the approach is at the frame edge by the time the bank is close.
  // x = 8 puts a bank's centre at 0.41 %W (small and unobtrusive) at depth
  // 62, at 0.77 %W by depth 20, and off the edge around depth 12 — where a
  // 13-unit bank is ~73 %W wide. That is the measured arcade picture: two
  // big masses flanking the jet with a clear gap between them, which is what
  // "frame the fight" means, as against the small centred blob that used to
  // sit on the jet because it was pinned to a screen row and barely moving.
  //
  // Drawn as a MAGNITUDE with a separate sign so nothing arrives exactly on
  // the axis; the lower bound is what keeps a bank from growing straight
  // over the jet, and the upper bound keeps it from leaving before it is
  // ever big.
  const GROUP_X_LO = 7;
  const GROUP_X_HI = 18;

  // A BANK IS WORLD-FIXED IN Y. R40 gap 5a, second half.
  //
  // This used to recompute world Y every tick so the bank held a constant
  // SCREEN fraction for its whole approach — the R3 fix for "clouds
  // parallax-drift upward as they come in". That fix is what made the cloud
  // mass's measured screen drift exactly 0.00 %W/s (median, p75, all of it)
  // against the arcade's 37.5: a pinned screen row is the definition of
  // glued. It also meant a bank could grow without bound while staying
  // centred in the combat band — with the R40 speed fix alone, still pinned,
  // peak band coverage hit 0.967 against the arcade's measured max 0.665.
  //
  // So world Y is now set ONCE, at placement, from the entry screen
  // fraction, and the bank parallaxes from there like the world-fixed object
  // it is: a bank above camera height rises and leaves over the top, which
  // is both correct perspective and what the arcade shows (reference
  // t101.5's bank top edge is 2.9 %H, i.e. already running off frame; banks
  // pass behind the HUD on t100/t105/t106/t120 — the HUD is composited after
  // the scene in render/screen.js, so its glyphs stay legible on top).
  //
  // The R3 complaint is not re-opened by this: at 9.5 u/s the rise was a
  // slow creep over eight seconds, which reads as a cloud climbing; at world
  // speed the whole approach takes ~2.3 s and it reads as a cloud sweeping
  // past. The entry clamp below keeps a bank's base above the 0.625H horizon
  // at the moment it appears, and since a world-fixed bank above the camera
  // only ever rises, it can never dip into the sea later.
  function updateBankPositions(bank) {
    if (bank.worldY === undefined) {
      const frac = Math.min(0.56, Math.max(0.04, bank.baseFrac));
      bank.worldY = worldYForScreenFrac(frac, bank.z);
    }
    bank.sprite.position.y = bank.worldY;
    bank.sprite.position.z = bank.z;
  }

  function hideBank(bank) {
    bank.active = false;
    bank.sprite.visible = false;
  }

  let groupTimer = rngStruct() * GROUP_PERIOD_MIN; // staggered start
  // R17 gap 1 — PER-STAGE CLOUD GATE. STAGE_MAP gives the refuel stages (5/13)
  // cloud_density 0 (clear sky), and the R16 judge costed the refuel beat's
  // cloud-filled frame directly (two big banks where the arcade's refuel base
  // has none — judging/R16/resupply-ours-vs-arcade.png). A stage opts OUT of
  // clouds with `showClouds: false`; when suppressed, every bank is hidden and
  // the spawn state machine is parked so none come up. This is deliberately
  // OPT-OUT, not keyed to STAGE_MAP's cloud_density: STAGE_MAP lists 0 for
  // stages 2-23 as well, but the three.js build has always rendered banks on
  // stages 1-4 and STATUS.md's R17 brief says not to regress them — so only the
  // stages that explicitly ask for a clear sky get one.
  let suppressed = stage.showClouds === false;
  if (suppressed) for (const bank of banks) hideBank(bank);

  return {
    group,

    // Stage-progression interface, matching ground.js/sky.js's setStage.
    // Called by src/game/flow/flow.js's _enterStage on every stage transition.
    setStage(newStage) {
      suppressed = newStage.showClouds === false;
      if (suppressed) {
        // Clear-sky stage: hide every bank and reset the spawn timer. The
        // `suppressed` gate at the top of update() is what actually keeps
        // banks from coming up; the timer reset just means the first group
        // after the stage ends is a fresh full interval rather than
        // whatever was left over. The palette is left untouched (no point
        // re-authoring textures for hidden sprites); the next cloud stage's
        // setStage re-points it.
        for (const bank of banks) hideBank(bank);
        groupTimer = GROUP_PERIOD_MIN;
        return;
      }
      const next = CLOUD_PALETTES[newStage.cloudPalette] || CLOUD_PALETTES.day;
      if (next === palette) return;
      palette = next;
      setPaletteUniform(palUniform, palette);
      for (const bank of banks) {
        bank.material.map.dispose();
        bank.material.map = makeCloudTexture(rngCosmetic, palette);
        bank.material.needsUpdate = true;
      }
    },

    // worldSpeed is the rate the world flows past the camera — the same
    // quantity ground.update() is given as scrollSpeed. game.js currently
    // calls update(dt) with one argument, so this defaults to WORLD_SPEED;
    // passing this.flow.scrollSpeed from there is a one-line change on its
    // side that makes clouds respond to the throttle. See NOTES.md.
    update(dt, worldSpeed = WORLD_SPEED) {
      // Clear-sky stages (gate above): nothing approaches, nothing spawns.
      if (suppressed) return;
      // A bank now lives until it passes the camera, and only until then.
      // The old active-window force-hide blinked banks out mid-sky; at world
      // speed a bank crosses its whole approach in ~2.3 s and leaves on its
      // own (R40, see GROUP_PERIOD_MIN/MAX).
      for (const bank of banks) {
        if (!bank.active) continue;
        bank.z += worldSpeed * dt;
        if (bank.z > DESPAWN_Z) {
          hideBank(bank);
          continue;
        }
        updateBankPositions(bank);
      }

      groupTimer -= dt;
      if (groupTimer > 0) return;

      const count = rollBankCount(rngStruct);
      const groupOffsetX = (GROUP_X_LO + rngCosmetic() * (GROUP_X_HI - GROUP_X_LO)) *
        (rngCosmetic() < 0.5 ? -1 : 1);
      const groupZ = SPAWN_Z * (0.6 + rngCosmetic() * 0.4);
      let brought = 0;
      for (const bank of banks) {
        if (brought >= count) break;
        if (bank.active) continue;
        // draws from rngCosmetic only — see createClouds() header
        placeBank(bank, brought, count, groupOffsetX, groupZ);
        updateBankPositions(bank);
        bank.active = true;
        brought++;
      }
      groupTimer = GROUP_PERIOD_MIN + rngStruct() * (GROUP_PERIOD_MAX - GROUP_PERIOD_MIN);
    },
  };
}

// Isolation-harness exports for tools/cloud-tex-preview.* only. Nothing in
// src/ imports these; they exist so the authored texture can be inspected at
// 1:1 without going through a sprite, a camera and a mipmap chain.
export const __drawCloudForPreview = drawCloud;
export const __CLOUD_PALETTES_FOR_PREVIEW = CLOUD_PALETTES;
export const __TEX_FOR_PREVIEW = { W: TEX_W, H: TEX_H };

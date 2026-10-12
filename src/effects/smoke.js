import { makePixelTexture, makeBillboard } from './pixelTexture.js';

// Smoke: the missile trail's aged TAIL puffs, and the launch billow.
//
// REFERENCE.md "Missiles / weapons visuals": the trail is a continuous
// opaque ribbon (that part is missiles.js's ribbon mesh), and "the trail's
// TAIL ages into a chain of discrete round white puffs (t226, t332, t120),
// and a launch throws large white smoke billows that briefly occlude part of
// the frame (t99.75-t101)". Both are here.
//
// A puff's brightness is not one constant: it RAMPS over the puff's life
// (`valueStart`/`valueEnd` below), and BOTH ENDPOINTS ARE PER-STAGE — see
// effects/trailPalette.js, which carries the measurement for each stage.
// Callers pass the endpoints in; this file does not know which stage it is
// drawing.
//
// The history is worth keeping, because three separate attempts each broke
// one half of it:
//   * puffs held at a flat dark 0.55 -> near-black discs against the stage-1
//     sky, reading as holes punched in it, against REFERENCE.md's explicit
//     "chain of discrete round WHITE puffs";
//   * puffs held at a flat white 0.92 -> they flooded the bright end and a
//     bright/dark quintile ratio taken from a night frame collapsed to 1.58,
//     outside the 2.2-3.2 that measurement demanded;
//   * so puffs were ramped 0.76 -> 0.17 for EVERY stage, which rendered the
//     daylight trail BLACK — R4 gap 4.
// The ratio those attempts were chasing has since been withdrawn outright:
// the frame it came from contains no smoke trail at all (see
// effects/trailPalette.js). The trail is white in every stage, so these
// endpoints are near-white in every stage and differ only ~6% between day
// and night.

// R7: THE VALUE RAMP IS PRE-BAKED INTO TEXTURES, not applied at runtime, and
// this is the third member of R6 gap 1's compositing class.
//
// What was here: `sprite.material.color.setScalar(srgbScalar(v))` with `v`
// interpolated continuously over the puff's life, plus an opacity fade after
// `fadeFrom`. The material colour MULTIPLIES the texel, so a chain of thirty
// puffs at thirty different ages put thirty different greys on screen from
// five authored ones — and then the opacity fade blended the oldest of them
// into the sky. Criterion A2 counts the UNION of channel values, so a ramp
// that looks continuous because it is continuous is the most expensive thing
// a sprite system can do.
//
// An arcade board animates smoke by stepping a sprite through authored
// frames. So: SMOKE_RAMP is the only grey ladder any smoke sprite can place,
// SMOKE_VALUES are the discrete ages the value ramp is quantised onto, and
// one texture is baked per (kind, value step) at load time. The per-tick work
// is a map swap. Colour stays white and opacity stays 1 for the sprite's
// whole life.
//
// THE RAMP IS A QUANTISATION OF THE MEASURED BAND, NOT A NEW MEASUREMENT.
// The authored ring values (0.933-1.000, stage-1 plume, see below) times the
// per-stage endpoints in effects/trailPalette.js (1.00 down to 0.86 at night)
// span 0.802-1.000, and these six greys are that span at even steps. Nothing
// here moves the mean or the minimum the measurement fixes: the extremes of
// the ramp ARE the measured extremes.
// Six rungs OF THE HARDWARE LADDER (see SEGA_LADDER in effects/pixelTexture.js),
// spanning the measured smoke band 0.80-1.00.
// SEVEN CONSECUTIVE RUNGS, 206..255. Consecutive, not evenly spaced in value,
// because the ladder is not evenly spaced: above V 0.90 the hardware has only
// THREE rungs (239, 247, 255), and that is a fact about the medium rather than
// a shortcoming of this ramp. The authored five-step plume ladder below
// (0.933 / 0.957 / 0.976 / 0.992 / 1.000) was never renderable as five
// distinct greys on this hardware — 0.957 and 0.976 are the same rung — so a
// bright puff comes back as three bands however it is authored. The arcade's
// own five-colour cloud puff (REFERENCE.md: #f7f7e6 #f7f7b5 #e6e6a4 #d6d694
// #c5c584) spans V 0.772-0.969 to get five steps, i.e. it buys them with
// RANGE, not with resolution it does not have.
//
// Area-weighted mean of the puff after snapping: 0.9685, against the measured
// stage-1 plume's 0.9674. The six-rung version this replaced read 0.9594.
const SMOKE_RAMP = ['#cecece', '#d6d6d6', '#dedede', '#e6e6e6', '#efefef', '#f7f7f7', '#ffffff'];
const RAMP_V = [0.808, 0.839, 0.871, 0.902, 0.937, 0.969, 1.000];

// Display-grey for a value, snapped to SMOKE_RAMP. makePixelTexture snaps
// again afterwards (it has to, for the antialiased seams between rings), so
// this is belt and braces on the fills themselves.
function grey(v) {
  let best = 0;
  for (let i = 1; i < RAMP_V.length; i++) {
    if (Math.abs(RAMP_V[i] - v) < Math.abs(RAMP_V[best] - v)) best = i;
  }
  return SMOKE_RAMP[best];
}

// The discrete lives a smoke sprite is allowed to have. Covers both stages'
// endpoints (daylight 1.00 -> 0.94, night 0.95 -> 0.86).
const SMOKE_VALUES = [1.00, 0.97, 0.94, 0.90, 0.86];

// The display value of the nearest SMOKE_RAMP entry. Exported because
// weapons/missiles.js's ribbon is the same smoke and has to land on the same
// ladder — otherwise the ribbon and the puffs it fades into would each pay
// their own channel values for the same grey.
export function snapSmokeValue(v) {
  let best = 0;
  for (let i = 1; i < RAMP_V.length; i++) {
    if (Math.abs(RAMP_V[i] - v) < Math.abs(RAMP_V[best] - v)) best = i;
  }
  return RAMP_V[best];
}

function nearestValueStep(v) {
  let best = 0;
  for (let i = 1; i < SMOKE_VALUES.length; i++) {
    if (Math.abs(SMOKE_VALUES[i] - v) < Math.abs(SMOKE_VALUES[best] - v)) best = i;
  }
  return best;
}

// A round puff, authored NEAR-WHITE with internal value steps and NO alpha
// falloff. Two things the first version got wrong, both visible in
// tools/out/combat-r3-23-final/frame-0015.png:
//
//   * It was built from dark greys (#3a3a3a..#b4b4b4) and then colour-scaled
//     by 0.55, so against the #009fff stage-1 sky the aged tail puffs
//     rendered as near-black discs that read as holes punched in the sky.
//     REFERENCE.md is explicit: the tail ages into "a chain of discrete
//     round WHITE puffs" (t226, t332, t120).
//   * Its outermost ring was drawn at alpha 0.55, giving a soft halo —
//     against the same measurement that says the structure is VALUE,
//     "not an alpha fade". Every ring here is fully opaque.
//
// THE LADDER IS AUTHORED AT THE BRIGHTEST STAGE AND DARKENED BY THE CALLER,
// never the reverse. The material colour MULTIPLIES the texel, so a texture
// authored dark can only ever be darkened further — the old #8f8f8f outer
// ring capped the puff at V 0.56 however white the caller asked for, which
// is 0.38 BELOW the stage-1 plume's measured p10 of 0.941 and is half of why
// R4 gap 4 could not be fixed by retuning the value ramp alone. The ring
// values below are the measured stage-1 band: mean 0.965 against the plume's
// 0.9674, minimum 0.933 against its darkest-quintile 0.933
// (reference/stage1-missile-salvo-t100.75.png — see effects/trailPalette.js
// for the full operator). Night darkens from here via `valueStart/End`.
//
// Band areas and values: 0.260 at 0.933, 0.250 at 0.957, 0.240 at 0.976,
// 0.172 at 0.992, 0.078 at 1.000 -> area-weighted mean 0.9647.
function drawSmokePuff(value) {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const ring = (r, v) => {
      ctx.fillStyle = grey(v * value);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };
    ring(w * 0.5, 0.933);
    ring(w * 0.43, 0.957);
    ring(w * 0.35, 0.976);
    ring(w * 0.25, 0.992);
    ring(w * 0.14, 1.0);
  };
}

// THE TRAIL PUFF — an AXIAL element, not a disc. R5's art critique, §4:
//
//   "The arcade's is an oriented tapering wedge ... Ours is a radially
//    symmetric ball of lobes with no axis and no taper ... our trail puffs
//    are the same sprite family as our clouds."
//
// The last clause is not literally true in code -- render/clouds.js authors
// its own stippled multi-lobe texture and nothing is shared -- and saying so
// matters, because the shared-texture reading suggests a one-line fix that
// would have changed nothing. What IS true is the thing the eye reported:
// both were round, white, soft-edged lobed masses at similar screen sizes,
// and `drawSmokePuff` above is a stack of five concentric circles. A chain of
// those, emitted every 0.055 s along a path that compresses toward the
// vanishing point, piles into a disc -- which is exactly what
// tools/out/combat-r6/base/trail-sheet.png shows: a round cumulus above the
// jet with no visible direction of travel.
//
// So this one is an ELLIPSE, authored 32x20 (aspect 0.625) with its long axis
// along the canvas x. The caller rotates it to the trail's local screen
// tangent, so the long axis lies ALONG the path and the short axis sets the
// plume's visible width. Three consequences, all of them the point:
//   * the chain has an axis even before any size ramp;
//   * neighbouring puffs overlap along the direction of travel, so the same
//     emission interval buys more column occupancy than a disc did;
//   * it cannot be mistaken for a cloud bank, which is round.
// Same five-step near-white ladder as the round puff (see the note above for
// why the ladder is authored at the brightest stage and darkened by the
// caller, never the reverse).
function drawTrailPuff(value) {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const ell = (k, v) => {
      ctx.fillStyle = grey(v * value);
      ctx.beginPath();
      ctx.ellipse(cx, cy, (w / 2) * k, (h / 2) * k, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    ell(1.0, 0.933);
    ell(0.86, 0.957);
    ell(0.7, 0.976);
    ell(0.5, 0.992);
    ell(0.28, 1.0);
  };
}

// Launch billow: a bigger, lumpier mass. In
// reference/stage1-missile-salvo-t100.75.png the launch smoke is the single
// largest element on screen (39.1%W x 50.0%H, 58% bbox fill) and is
// near-white throughout, not just at its core — the whole mass measures
// mean V 0.9674 with a darkest quintile of 0.933.
//
// Authored at the stage-1 band for the same reason the puff is: the caller
// multiplies, so this is the ceiling. The old ladder topped out at #f6f6f6
// drawn over a 0.7-alpha #9a9a9a base, which composited to roughly V 0.6-0.7
// and could not reach the measured plume however bright the caller asked.
// The alpha is gone too: the measurement says the structure is VALUE, "not
// an alpha fade", and a part-transparent white mass over the #009fff sky
// comes back BLUE, which is a saturation failure as well as a value one
// (the plume's measured mean S is 0.0504).
// R6: THE BILLOW IS A TAPERING PLUME, NOT A BALL, and this is the other half
// of the art critique's "no axis" finding. The five lobes it used to carry
// were laid out symmetrically about the canvas centre at radii 0.46/0.3/0.28/
// 0.3/0.26 on a SQUARE canvas -- a radially symmetric ball by construction,
// 30-36 %W across, and the largest single element of the trail. On
// tools/out/combat-r6/base/trail-sheet.png it is the cumulus.
//
// The arcade's launch mass is NOT square: 39.1 %W x 50.0 %H on
// reference/stage1-missile-salvo-t100.75.png (the same measurement the width
// here was already taken from -- only its height was being ignored), i.e. an
// aspect of 1.28, a column. And the plume above it tapers: the per-row width
// runs 36.2 %W at the launch end to 10.9 %W at the missile.
//
// So: a 32x42 canvas (aspect 1.3125, against the measured 1.28) with the
// lobes laid along the canvas's y axis and their radii falling monotonically
// toward the TOP, which the caller rotates to point along the launch ->
// target direction. Canvas +y is screen up at rotation 0, so the caller
// rotates by (axisAngle - pi/2).
//
// The lateral jitter is kept -- the mass has to be lumpy, it is smoke -- but
// it is now small against the taper, so no lobe can restore the circle.
function drawBillow(value) {
  return (ctx, w, h) => {
    // [centre y as a fraction of h, lateral offset in w, radius in w].
    // y runs 0 at the TOP of the canvas, so the first row is the narrow end.
    const lobes = [
      [0.10, 0.00, 0.14],
      [0.24, 0.05, 0.20],
      [0.40, -0.04, 0.27],
      [0.58, 0.04, 0.34],
      [0.76, -0.03, 0.42],
      [0.92, 0.02, 0.46],
    ];
    const shade = (v, scale) => {
      ctx.fillStyle = grey(v * value);
      for (const [ly, lx, lr] of lobes) {
        ctx.beginPath();
        ctx.arc((0.5 + lx) * w, ly * h, lr * w * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    shade(0.933, 1.0);
    shade(0.965, 0.86);
    shade(0.984, 0.64);
    shade(1.0, 0.36);
  };
}

// One texture per value step, built on first use. Each returns the array;
// callers index it with nearestValueStep().
// --- KILL SMOKE ------------------------------------------------------------
//
// THE ARCADE'S POST-KILL SMOKE IS NOT GREY AND IT IS NOT WHITE. IT IS PEACH.
//
// R9's motion pass (judging/R9/report.md §2.4) recorded "ours leaves nothing"
// after a kill against an arcade mass it could only read by eye, because it
// had no segmentation that survived stage 1's cloud banks. This lane found a
// kill it does: .reference-cache/video/ab2-longplay-60fps.mp4 at t = 99.1,
// 60 consecutive frames, the fireball detonating over OPEN SEA with no cloud
// anywhere in the frame (tools/out/envelope-r10/arc-expl-99-opensea.png —
// crop it and look; the mass grows out of the dark-red ball against flat
// #009fff). That removes the confound that defeated R9 and it settles the
// question explosions.js's PHASES note left open: the daylight explosion does
// leave a residue, and it is neither the grey the R6 art critique asked for
// nor the white of the missile trail.
//
// MEASURED, f0055 of that burst, largest component of V>0.70 AND R>B+0.04 AND
// S<0.45, n = 53 282 px = 7.20 % of the frame:
//
//   mean RGB (236, 188, 162)   V mean 0.925   S mean 0.312
//   V-ordered  p5  #cd907f   p20 #e1b5a0   p40 #ecb589
//              p60 #f3c7b2   p80 #f8be95   p95 #ffc6a3
//
// The four below are p5 / p20 / p40 / p95 snapped to SEGA_LADDER, which is
// where the four-rung ladder comes from rather than from a designer's eye.
// Area-weighted they return #efbda4 against the measurement's #ebbca2.
//
// WHAT THIS IS NOT. The arcade source is AV1-resampled 1028x720, so these are
// colours of a resampled frame, not of the hardware's own palette — there is
// no true-native daylight kill frame in this repo (REFERENCE.md's explosion
// row is still flagged UNATTRIBUTED). Snapping to the ladder is the whole of
// the defence and it is a weak one: treat the HUES as measured and the exact
// rungs as the nearest legal ones.
export const KILL_SMOKE_PALETTE = ['#ce8c7b', '#deb59c', '#efb58c', '#ffc5a4'];

// Six lumps, canvas fractions [cx, cy, r], massed low and rising — the arcade
// plume in that burst is a column, not a disc (the canvas is 32x40).
const KILL_LOBES = [
  [0.50, 0.70, 0.30], [0.30, 0.52, 0.22], [0.68, 0.48, 0.24],
  [0.44, 0.28, 0.21], [0.62, 0.80, 0.18], [0.34, 0.84, 0.16],
];

// Three AGE phases, not a value ramp. The ramp machinery below multiplies a
// grey by the caller's value, which on a coloured ladder would put a fresh
// continuum of peaches on screen — the Criterion A failure mode explosions.js
// already paid for once. Ageing here is a BAND EDIT inside the four authored
// colours: the dark rim goes first and the bright core grows, so the mass
// thins and pales without adding a colour. Each entry is [colour, radius
// scale], outermost first.
const KILL_PHASES = [
  [[0, 1.00], [1, 0.84], [2, 0.62], [3, 0.34]],
  [[0, 1.00], [1, 0.90], [2, 0.70], [3, 0.44]],
  [[1, 1.00], [2, 0.86], [3, 0.62]],
];

function drawKillSmoke(phase) {
  return (ctx, w, h) => {
    for (const [ci, scale] of KILL_PHASES[phase]) {
      ctx.fillStyle = KILL_SMOKE_PALETTE[ci];
      for (const [lx, ly, lr] of KILL_LOBES) {
        ctx.beginPath();
        ctx.arc(lx * w, ly * h, lr * w * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
}

const KINDS = {
  puff: { draw: drawSmokePuff, w: 24, h: 24 },
  trail: { draw: drawTrailPuff, w: 32, h: 20 },
  billow: { draw: drawBillow, w: 32, h: 42 },
  // `phases` marks a kind whose textures are indexed by AGE PHASE rather than
  // by SMOKE_VALUES step, and whose palette is its own.
  kill: { draw: drawKillSmoke, w: 32, h: 40, phases: 3, palette: KILL_SMOKE_PALETTE },
};
const texCache = {};
function texturesFor(kind) {
  const k = KINDS[kind];
  if (k.phases) {
    texCache[kind] ??= Array.from({ length: k.phases }, (_, p) =>
      makePixelTexture(k.draw(p), k.w, k.h, { palette: k.palette }));
    return texCache[kind];
  }
  texCache[kind] ??= SMOKE_VALUES.map((v) =>
    makePixelTexture(k.draw(v), k.w, k.h, { palette: SMOKE_RAMP }));
  return texCache[kind];
}

// Measurement-only accessor, same contract as explosions.js's: the probe
// audits the authored canvas, not whatever the field happens to be showing.
export const killSmokeTexturesForProbe = () => texturesFor('kill');
export const smokePuffTexture = (step = 0) => texturesFor('puff')[step];
export const trailPuffTexture = (step = 0) => texturesFor('trail')[step];
export const billowTexture = (step = 0) => texturesFor('billow')[step];
export { SMOKE_RAMP, SMOKE_VALUES };

// Pooled smoke sprites. Both kinds are sized in SCREEN fractions (they are
// drawn at a size that reads the same whether the missile is near or far —
// the arcade's smoke does not shrink into the vanishing point the way the
// aircraft do), so each live puff recomputes its world width from its own
// camera distance every frame.


export class SmokeField {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.live = [];
    this.pool = { puff: [], trail: [], billow: [], kill: [] };
  }

  _acquire(kind) {
    const pool = (this.pool[kind] ??= []);
    if (pool.length) return pool.pop();
    const sprite = makeBillboard(texturesFor(kind)[0], 1);
    sprite.renderOrder = kind === 'billow' ? 7 : 6;
    return sprite;
  }

  // `fracStart`/`fracEnd` are screen-width fractions and
  // `valueStart`/`valueEnd` are the ends of the puff's value ramp, quantised
  // onto SMOKE_VALUES and served as pre-baked textures (see the R7 note
  // above). `depth` is camera-space view depth — the camera is static
  // in this build, so a puff's depth is fixed at spawn and is stored rather
  // than recomputed (Euclidean distance to the camera would over-size
  // off-axis puffs by up to ~10%).
  // `rotation` (R6) is the IMAGE-PLANE angle the sprite is held at, radians,
  // CCW, 0 = the authored canvas upright. It is what gives the trail an axis:
  // an elliptical puff rotated onto the path's screen tangent reads as a
  // segment of a plume, and the same sprite without it reads as a disc. Fixed
  // for the sprite's life on purpose -- a puff is smoke the missile has
  // already left behind, so it keeps the heading it was laid down at while
  // the missile turns away from it, which is what makes a curving trail look
  // curved rather than swept.
  spawn(
    kind,
    position,
    depth,
    { life, fracStart, fracEnd, valueStart = 1, valueEnd = valueStart, rotation = 0 }
  ) {
    const sprite = this._acquire(kind);
    sprite.position.copy(position);
    sprite.material.opacity = 1;
    sprite.material.rotation = rotation;
    // White: the value lives in the texture now, so the material must not
    // scale it a second time.
    sprite.material.color.setScalar(1);
    sprite.material.map = texturesFor(kind)[KINDS[kind].phases ? 0 : nearestValueStep(valueStart)];
    this.scene.add(sprite);
    this.live.push({
      kind, sprite, age: 0, depth, life, fracStart, fracEnd, valueStart, valueEnd,
    });
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.scene.remove(p.sprite);
        this.pool[p.kind].push(p.sprite);
        this.live.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      const frac = p.fracStart + (p.fracEnd - p.fracStart) * t;
      // Map before sizeSprite: sizeSprite reads the aspect off the live map.
      const nPhase = KINDS[p.kind].phases;
      p.sprite.material.map = texturesFor(p.kind)[
        nPhase
          ? Math.min(nPhase - 1, Math.floor(t * nPhase))
          : nearestValueStep(p.valueStart + (p.valueEnd - p.valueStart) * t)
      ];
      sizeSprite(p.sprite, this.space.worldWidthFor(frac, p.depth));
      // NO OPACITY FADE. Same rule as effects/explosions.js: a sprite that
      // dissolves into the sky composites a fresh continuum on its way out,
      // and REFERENCE.md's own reading of the plume is that its structure is
      // value, "not an alpha fade". Puffs are dense and heavily overlapped, so
      // one leaving at full opacity reads as the mass thinning, not as a pop —
      // which is what effects/trailPalette.js's puffFadeFrom = 0.97 was
      // already saying with a number.
      p.sprite.material.opacity = 1;
    }
  }

  clear() {
    for (const p of this.live) {
      this.scene.remove(p.sprite);
      this.pool[p.kind].push(p.sprite);
    }
    this.live.length = 0;
  }
}

// Resize a billboard keeping its authored canvas aspect. Shared by every
// pooled-sprite system here and in src/weapons/.
export function sizeSprite(sprite, worldWidth) {
  const aspect = sprite.material.map.userData.aspect ?? 1;
  sprite.scale.set(worldWidth, worldWidth * aspect, 1);
}

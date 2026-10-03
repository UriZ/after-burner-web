import { makePixelTexture, makeBillboard } from './pixelTexture.js';
import { sizeSprite } from './smoke.js';

// Kill explosions.
//
// ---------------------------------------------------------------------------
// THE PALETTE BELOW REPLACES THE t357 ONE. Read this before retuning it.
//
// REFERENCE.md "Explosions" measures t357 (canyon fireball) at p95 #fb9352 /
// p75 #d58a1c / p50 #c25e02 / p25 #a6290f, and the R4 build hit those
// percentiles essentially exactly (judge: sat 0.879, p50 #c25e02 "exact")
// and still rendered as an orange cloud. The criterion was the problem: in
// t357 the "fireball" is a FADING SMOKE MASS in a desert-tinted frame, so it
// describes the last 200 ms of an explosion, not an explosion.
//
// Re-measured on reference/ab2-arcade-huge-explosion.jpg (181x127) with mask
// V > 0.55 AND R > B + 0.10 (warm-and-bright; the mask excludes the blue sky
// and the white cloud, and the dark debris holes inside the fireball fall
// out of it too, which is why they cost nothing below), largest 8-connected
// component, n = 10 980 px:
//
//   mean V 0.8821   median V 0.9451   mean S 0.915
//   fraction above V 0.95 = 0.453      (R4 judge, same frame: 0.477)
//   V-ordered percentiles  p5 #9e0000  p25 #c90000  p50 #f1a60c
//                          p75 #f9f647  p95 #ffba04
//   near-white core: pixels with S < 0.40 AND V > 0.90 are 3.2% of the
//   fireball at mean RGB (246, 240, 186) = #f6f0ba
//   radial profile: mean V stays >= 0.86 at EVERY radius band — the thing
//   is value-maxed almost everywhere, not a bright centre in a dark cloud.
//
// Corroborated on the stage-1 kill fireball in
// reference/stage1-missile-salvo-t100.75.png (same operator, window
// y[330,520] x[460,640], n = 7 235 px, 10.1%W x 19.2%H): mean V 0.928,
// 57.9% above V 0.95, near-white core 16.1% of area at RGB (249, 231, 192).
// A kill explosion is, if anything, HOTTER than the huge one.
//
// Two structural facts the old palette missed, both visible on a 4x crop:
//   * hue runs red at the rim (p10 0deg) -> orange mid (40deg) -> yellow hot
//     (59-69deg). The dark end is a pure deep RED, not an orange-brown.
//   * it is bright AND saturated. #ffba04 and #f9f647 are V 1.0 with S 0.98
//     and 0.72. "White-hot" here does not mean desaturated white; it means
//     value-maxed yellow with a small genuinely pale core.
// ---------------------------------------------------------------------------
//
// So: no radial gradient anywhere in this file. Each frame is a cluster of
// hard-edged overlapping lobes in the measured percentile colours, drawn
// darkest-first so the hot core sits on top; three different lobe
// arrangements are cycled during the explosion's life, which is what makes
// the mass "boil" rather than simply scale up.
// reference/death-starburst-gp-t202.png shows the same construction at
// screen-filling size, including the radiating spikes added below.

// Outer -> inner. Every hex is a measured percentile or band mean from
// ab2-arcade-huge-explosion.jpg (see the header for the operator), except
// E_ORANGE which is the stage-1 kill fireball's p25.
const E_RIM = '#9e0000'; // p5,  V 0.620 — deep red, spikes and outer edge
const E_DEEP = '#c90000'; // p25, V 0.788
const E_ORANGE = '#e4770a'; // t100.75 kill-fireball p25, V 0.894
const E_AMBER = '#f1a60c'; // p50, V 0.945
// p95, V 1.000, S 0.984. Splitting the bright band into a saturated gold
// outside and a pale yellow inside is what keeps the fireball COLOURED while
// it is bright: with #f9f647 alone owning the whole bright band the sprite
// measured mean S 0.77 against the arcade's 0.915, i.e. it was drifting
// toward lemon-and-cream. Both hexes are above V 0.95, so this trades
// nothing against the bright-fraction criterion. It also reproduces the
// measured hue ramp — rim 0deg, mid 40deg, hot 59-69deg — which a single
// bright colour cannot.
const E_GOLD = '#ffba04';
const E_YELLOW = '#f9f647'; // p75, V 0.976
const E_HOT = '#f6f0ba'; // S<0.40 & V>0.90 band mean, V 0.965 — the pale core

// Three lobe arrangements. Coordinates are canvas fractions; each entry is
// [cx, cy, r]. Deliberately irregular — a symmetric ring reads as a gradient.
const ARRANGEMENTS = [
  [
    [0.5, 0.5, 0.3], [0.28, 0.4, 0.2], [0.72, 0.36, 0.22],
    [0.38, 0.72, 0.21], [0.68, 0.68, 0.19], [0.5, 0.24, 0.17],
  ],
  [
    [0.48, 0.52, 0.29], [0.24, 0.56, 0.22], [0.74, 0.52, 0.2],
    [0.52, 0.26, 0.21], [0.4, 0.78, 0.18], [0.72, 0.76, 0.16],
  ],
  [
    [0.52, 0.48, 0.31], [0.3, 0.3, 0.21], [0.7, 0.26, 0.18],
    [0.26, 0.7, 0.2], [0.74, 0.7, 0.22], [0.5, 0.8, 0.17],
  ],
];

// Radiating spikes, the "starburst" half of the shape (clearly visible in
// death-starburst-gp-t202.png and in the t100.75 salvo kill).
//
// These carry MORE weight than "a decorative outline", and the numbers say
// so twice over. The lobe cluster alone measures 67% of its pixels above
// V 0.95 against the arcade's 45-58%, because six overlapping lobes bury
// each other's dark outer bands — an inner bright disc of one lobe paints
// over the rim of its neighbour. The spikes are the only dark area that
// nothing can overdraw, since they project past the cluster, so they are
// the lever for BOTH the bright fraction and the starburst silhouette. If
// the bright fraction drifts again, come here first — thickness (0.045w ->
// 0.058w) moved it further than any palette edit did.
const SPIKES = 11;
const SPIKE_LEN_BASE = 0.30;
const SPIKE_LEN_VAR = 0.18;
const SPIKE_HALF_W = 0.058;

// SPIKES AND LOBES GET SEPARATE TRANSFORMS, and the gap between them is the
// starburst.
//
// Everything used to share one 0.85 inset from the canvas edge, which exists
// because the lobe at (0.74, 0.70) with radius 0.22 reaches 0.96 of the
// canvas and at full size the fireball was CLIPPED to a hard vertical line
// down one side (tools/out/combat-r3-29-final/frame-0011.png). That inset is
// still needed for the lobes. Applying it to the spikes as well capped how
// far they could project: their reach and the lobe cluster's are then locked
// together, so lengthening a spike to make it visible pushed its tip off the
// canvas instead (0.64 * 0.85 = 0.544 of a half-width of 0.50 — I clipped
// them doing exactly that before measuring).
//
// Shrinking the lobe cluster independently is what lets the spikes read. At
// LOBE_INSET the cluster reaches ~0.26 of the canvas width from centre while
// spikes reach 0.30-0.48, so 11 of them project clear of the mass instead of
// being buried in it. The arcade's silhouette is mostly spike — the fireball
// on ab2-arcade-huge-explosion.jpg spans 85.1%W, far more than its lobe mass
// — and three-way against R4 and that frame
// (tools/out/combatfx-r5/evidence_explosion_r4_r5_arcade.png) the missing
// radiating points were the most obvious difference left.
//
// PEAK_FRAC is raised to compensate so the bright mass keeps its on-screen
// size: 0.30 * 0.62 = 0.186 against the old 0.225 * 0.85 = 0.191. The
// canvas also goes 48 -> 64 px: a spike projecting 0.22 of the canvas width
// is 10 texels at 48 and 14 at 64, and below ~10 it rasterises to a bump
// rather than to a point.
const LOBE_INSET = 0.62;

function drawBurst(arrangement) {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = E_RIM;
    for (let i = 0; i < SPIKES; i++) {
      const a = (i / SPIKES) * Math.PI * 2 + arrangement[0][0];
      const len = w * (SPIKE_LEN_BASE + SPIKE_LEN_VAR * Math.abs(Math.sin(i * 2.4)));
      const halfW = w * SPIKE_HALF_W;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.lineTo(cx + Math.cos(a + 0.5) * halfW, cy + Math.sin(a + 0.5) * halfW);
      ctx.lineTo(cx + Math.cos(a - 0.5) * halfW, cy + Math.sin(a - 0.5) * halfW);
      ctx.closePath();
      ctx.fill();
    }

    // Everything from here down is the lobe cluster, drawn inset so it sits
    // inside the spikes and clear of the canvas edge.
    ctx.translate(cx, cy);
    ctx.scale(LOBE_INSET, LOBE_INSET);
    ctx.translate(-cx, -cy);

    // Each value layer is drawn OFF-CENTRE within its lobe, by an offset
    // that grows as the layer shrinks. Concentric layers make every lobe a
    // ring target and the whole burst reads as a symmetric flower of discs;
    // REFERENCE.md is explicit that AB2's explosions are "boiling multi-lobe
    // masses, NOT radial gradients". The offsets are a fixed function of the
    // lobe index, not random — the whole renderer is seeded-deterministic.
    //
    // PER-LOBE SCALE JITTER IS THE SECOND HALF OF THAT. With every lobe
    // stepping through the same six radii, each lobe grows its own evenly
    // spaced concentric rim and the sprite reads as a bouquet of ringed
    // discs rather than as one mass — side by side against the t100.75 kill
    // fireball (tools/out/combatfx-r5/fx2-expl) that was the single most
    // obvious remaining difference, well before any statistic. `jitter`
    // perturbs each lobe's band radii by +-12% on a golden-angle sequence,
    // so neighbouring lobes put their colour steps in different places and
    // the boundaries between them break up. It is deterministic (a function
    // of the lobe index), which the seeded-render rule requires.
    const jitter = (i) => 0.88 + 0.24 * (((i * 0.6180339887) % 1) + 0) ** 1;
    const blobs = (fill, scale) => {
      ctx.fillStyle = fill;
      arrangement.forEach(([lx, ly, lr], i) => {
        // 0.35, not the 0.9 this started at: at 0.9 an inner bright layer
        // was displaced by nearly its own diameter and escaped the darker
        // ring it is supposed to sit inside, which inflated the bright area
        // and pulled the measured p50 up to the authored P75 value. The
        // lobes still read as asymmetric at 0.35.
        const s = scale >= 1 ? 1 : Math.min(0.98, scale * jitter(i));
        const push = (1 - s) * lr * w * 0.35;
        const a = i * 2.399; // golden-angle spread, so no two lobes shift alike
        ctx.beginPath();
        ctx.arc(lx * w + Math.cos(a) * push, ly * h + Math.sin(a) * push, lr * w * s, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    // RING RADII ARE SOLVED FROM THE TARGET AREA SHARES, not picked.
    //
    // Ring area goes as (outer^2 - inner^2), so for a lobe of unit radius
    // the cumulative area from the dark edge inward at radius r is 1 - r^2,
    // i.e. a band boundary at cumulative share c sits at r = sqrt(1 - c).
    // Solving for the shares that reproduce the measured statistics:
    //
    //   share c   r=sqrt(1-c)  band      V      lands
    //   0.12      0.938        E_RIM     0.620  p5  = #9e0000
    //   0.30      0.837        E_DEEP    0.788  p25 = #c90000
    //   0.42      0.762        E_ORANGE  0.894
    //   0.55      0.671        E_AMBER   0.945  p50 = #f1a60c
    //   0.94      0.245        E_YELLOW  0.976  p75 = #f9f647
    //   1.00      0            E_HOT     0.965  p95
    //
    // The boundary at c = 0.55 is the one that matters: everything inside it
    // is above V 0.95, so it sets the measured bright fraction at 0.45
    // against the arcade's 0.453. Area-weighted mean V works out at 0.885
    // against the arcade's 0.882. Move any radius and both move.
    //
    // E_YELLOW's band is deliberately the largest (39% of area). That is not
    // a mistake and it is the whole difference between "orange cloud" and
    // "fireball": the arcade frame is value-maxed across most of its area
    // (mean V >= 0.86 in every radius band), so the bright colour has to own
    // most of the silhouette, not sit in a small core.
    //
    // Earlier ladders measured and rejected: 1.00/0.84/0.64/0.46/0.32/0.18
    // put p50 on the authored p75 value, and 1.00/0.80/0.58/0.45/0.20/0.10
    // read a step bright once hard-alpha removed the dark antialiased rim
    // that had been padding the outer band.
    // Measured correction to the solved radii: the table above solves a
    // single disc, and six OVERLAPPING lobes bury each other's dark bands,
    // so the rendered bright fraction came out 0.67 against the authored
    // 0.45 (tools/out/combatfx-r5/fx1-expl, native scale, same mask). The
    // two bright bands are pulled in — E_YELLOW 0.671 -> 0.60, E_HOT
    // 0.245 -> 0.21 — and the spikes above carry the rest. Authored and
    // measured do NOT agree in this construction and are not meant to; the
    // table is the derivation, these are the values that land it.
    blobs(E_RIM, 1.0);
    blobs(E_DEEP, 0.938);
    blobs(E_ORANGE, 0.86);
    blobs(E_AMBER, 0.78);
    blobs(E_GOLD, 0.60);
    blobs(E_YELLOW, 0.42);

    // THE WHITE-HOT CORE IS ONE CONNECTED REGION, not one disc per lobe.
    // Drawn per-lobe it came out as six scattered pale dots, which is not
    // what either reference frame shows: on ab2-arcade-huge-explosion.jpg
    // the near-white pixels (S < 0.40, V > 0.90) are 3.2% of the fireball
    // and on the t100.75 kill fireball they are 16.1%, and in both they form
    // one ragged mass through the middle rather than a scatter. Three
    // overlapping circles clustered on the arrangement's largest lobe give
    // that without a gradient.
    const [hx, hy, hr] = arrangement[0];
    ctx.fillStyle = E_HOT;
    for (let i = 0; i < 3; i++) {
      const a = 1.9 + i * 2.399;
      ctx.beginPath();
      ctx.arc(
        hx * w + Math.cos(a) * hr * w * 0.30,
        hy * h + Math.sin(a) * hr * h * 0.30,
        hr * w * (0.34 - i * 0.05),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Ragged edge. The arcade's fireball boundary is a broken fringe of
    // small red flecks, not the clean circular rim a filled arc leaves; at
    // 4x on the t100.75 kill fireball the outline is visibly speckled for
    // its whole perimeter. The fringe is also what stops the six lobes from
    // reading as six discs where they meet the sky.
    //
    // Each fleck is placed on the CLUSTER'S OWN SILHOUETTE, found by taking
    // the support function of the lobe set in that direction (the furthest
    // any lobe reaches along it). The first version placed flecks on a
    // single lobe's rim at `lobe[2] * r`, which for the inner lobes is a
    // circle buried inside the mass — so it stippled dark red squares
    // across the hot core instead of breaking the outline
    // (tools/out/combatfx-r5/fx3-expl/frame-0003.png). A fringe has to know
    // where the edge is.
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + 0.37;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      let env = 0;
      for (const [lx, ly, lr] of arrangement) {
        const reach = (lx - 0.5) * w * dx + (ly - 0.5) * h * dy + lr * w;
        if (reach > env) env = reach;
      }
      const r = env * (0.93 + 0.1 * Math.abs(Math.sin(i * 1.7)));
      ctx.fillStyle = i % 3 === 0 ? E_DEEP : E_RIM;
      const s = w * (0.020 + 0.016 * Math.abs(Math.cos(i * 2.1)));
      ctx.fillRect(cx + dx * r - s, cy + dy * r - s, s * 2, s * 2);
    }

    // RAGGED GAPS THROUGH THE FIREBALL. The arcade's is not a solid mass: I
    // measured the non-fire pixels lying strictly inside its own silhouette
    // on ab2-arcade-huge-explosion.jpg at 20.0% of the filled silhouette,
    // and 51.4% of those read as SKY (B > R + 0.05, median RGB 88/66/244)
    // against only 7.7% genuinely dark. So they are holes you see through,
    // not drawn debris, and punching them is the honest construction.
    //
    // They are also free against the acceptance statistics: the measurement
    // mask is "warm AND bright" (V > 0.55, R > B + 0.10), so a transparent
    // texel is excluded from the fireball on our side exactly as the
    // arcade's sky pixels are on its. Holes cost silhouette AREA, not
    // percentile position.
    //
    // Two constraints on placement, both learned by arithmetic rather than
    // by capture: the centre lobe is skipped and the offset (0.45) exceeds
    // the hole radius plus the core radius (0.26 + 0.245), so no hole can
    // reach E_HOT. A hole that ate core pixels WOULD move the statistics —
    // it removes them from the mask, which lowers the measured bright
    // fraction — and that is the one number this whole palette exists to
    // hit. Kept to ~8% of area rather than the arcade's 20%: our sprite
    // renders at a third of that frame's size and perforates visibly faster.
    ctx.globalCompositeOperation = 'destination-out';
    arrangement.forEach(([lx, ly, lr], i) => {
      if (i === 0) return; // leave the central lobe's hot core intact
      const a = i * 1.107 + 0.4;
      ctx.beginPath();
      ctx.arc(
        lx * w + Math.cos(a) * lr * w * 0.45,
        ly * h + Math.sin(a) * lr * h * 0.45,
        lr * w * 0.26,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  };
}

// Debris chunk: "small red/white chunks" (t100 upper-left).
function drawChunk(ctx, w, h) {
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = E_RIM;
  ctx.fillRect(0, h / 2, w, h / 2);
}

let burstTextures = null;
let chunkTexture = null;
function bursts() {
  if (!burstTextures) {
    burstTextures = ARRANGEMENTS.map((a) => makePixelTexture(drawBurst(a), 64, 64, { hardAlpha: true }));
  }
  return burstTextures;
}

// Peak on-screen diameter of a kill explosion, as a fraction of frame width.
// REFERENCE.md measures the t357 fireball at ~23%W; GAME_SPEC.md §8 requires
// explosions to "occupy the frame generously".
const PEAK_FRAC = 0.30;
const LIFE_S = 0.75;
const BOIL_HZ = 14; // texture swaps per second

export class ExplosionField {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.live = [];
    this.pool = [];
    this.chunkPool = [];
  }

  _acquire() {
    if (this.pool.length) return this.pool.pop();
    const sprite = makeBillboard(bursts()[0], 1);
    sprite.renderOrder = 20;
    return sprite;
  }

  _acquireChunk() {
    if (this.chunkPool.length) return this.chunkPool.pop();
    chunkTexture ??= makePixelTexture(drawChunk, 4, 4, { hardAlpha: true });
    const sprite = makeBillboard(chunkTexture, 1);
    sprite.renderOrder = 21;
    return sprite;
  }

  // `scale` lets a big target (bomber) throw a bigger fireball. `depth` is
  // camera-space view depth; the camera is static in this build so it is
  // fixed for the explosion's life.
  spawn(position, depth, rng, scale = 1) {
    const sprite = this._acquire();
    sprite.position.copy(position);
    sprite.material.opacity = 1;
    sprite.material.rotation = rng() * Math.PI * 2;
    this.scene.add(sprite);

    const chunks = [];
    const n = 5 + Math.floor(rng() * 4);
    // Chunk speed is expressed in SCREEN fractions per second so debris
    // flies the same way whether the kill is near or far; converting once
    // here keeps the per-frame update a plain world-space add.
    const perSec = this.space.worldWidthFor(1, depth);
    for (let i = 0; i < n; i++) {
      const c = this._acquireChunk();
      c.position.copy(position);
      c.material.opacity = 1;
      const a = rng() * Math.PI * 2;
      const sp = (0.12 + rng() * 0.22) * perSec;
      chunks.push({ sprite: c, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
      this.scene.add(c);
    }

    this.live.push({ sprite, age: 0, depth, scale, chunks });
  }

  update(dt) {
    const texs = bursts();
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i];
      e.age += dt;
      if (e.age >= LIFE_S) {
        this.scene.remove(e.sprite);
        this.pool.push(e.sprite);
        for (const c of e.chunks) {
          this.scene.remove(c.sprite);
          this.chunkPool.push(c.sprite);
        }
        this.live.splice(i, 1);
        continue;
      }
      const t = e.age / LIFE_S;
      // Fast expansion to full size, then HOLD and collapse slightly — it
      // must not keep growing while it fades. The first version swelled
      // right through the fade, so the explosion's LARGEST frames were also
      // its most transparent, and alpha-blending a big orange mass against
      // the #009fff sky is what produced the judge's "muddy brown": mean
      // saturation 0.46 over the lifetime, against 0.82-0.83 measured at
      // peak on the isolation harness. The palette was never the problem.
      const grow = t < 0.18 ? 0.35 + (t / 0.18) * 0.65 : 1.0 - (t - 0.18) * 0.12;
      e.sprite.material.map = texs[Math.floor(e.age * BOIL_HZ) % texs.length];
      sizeSprite(e.sprite, this.space.worldWidthFor(PEAK_FRAC * e.scale * grow, e.depth));
      // Opaque for 80% of its life, then a short hard fade. The arcade's
      // explosions are sprite animations that END; they do not dissolve
      // gradually into the sky.
      e.sprite.material.opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;

      for (const c of e.chunks) {
        c.sprite.position.x += c.vx * dt;
        c.sprite.position.y += c.vy * dt;
        sizeSprite(c.sprite, this.space.worldWidthFor(0.012, e.depth));
        c.sprite.material.opacity = 1 - t;
      }
    }
  }

  clear() {
    for (const e of this.live) {
      this.scene.remove(e.sprite);
      this.pool.push(e.sprite);
      for (const c of e.chunks) {
        this.scene.remove(c.sprite);
        this.chunkPool.push(c.sprite);
      }
    }
    this.live.length = 0;
  }
}

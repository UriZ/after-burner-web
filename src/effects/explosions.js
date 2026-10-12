import { makePixelTexture, makeBillboard } from './pixelTexture.js';
import { sizeSprite, SmokeField } from './smoke.js';

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
const E_RIM = '#9c0000'; // p5,  V 0.620 — deep red, spikes and outer edge
// (measured #9e0000; R7 snapped to the ladder, 158 -> 156)
const E_DEEP = '#c50000'; // p25, V 0.788 (measured #c90000, 201 -> 197)
const E_ORANGE = '#e67310'; // t100.75 kill-fireball p25, V 0.894
// (measured #e4770a; 228->230, 119->115, 10->16)
const E_AMBER = '#efa410'; // p50, V 0.945 (measured #f1a60c)
// p95, V 1.000, S 0.984. Splitting the bright band into a saturated gold
// outside and a pale yellow inside is what keeps the fireball COLOURED while
// it is bright: with #f9f647 alone owning the whole bright band the sprite
// measured mean S 0.77 against the arcade's 0.915, i.e. it was drifting
// toward lemon-and-cream. Both hexes are above V 0.95, so this trades
// nothing against the bright-fraction criterion. It also reproduces the
// measured hue ramp — rim 0deg, mid 40deg, hot 59-69deg — which a single
// bright colour cannot.
const E_GOLD = '#ffbd00'; // measured #ffba04
const E_YELLOW = '#f7f74a'; // p75, V 0.976 (measured #f9f647)
// The near-white core. REFERENCE.md's R5 fireball pass publishes the
// brightest decile of ab2-arcade-huge-explosion.jpg as #f6f6e7 (V 0.967,
// sat 0.063) and names BRIGHTEST-DECILE SATURATION "the single sharpest
// discriminator" between a fireball and R4's orange cloud (arcade 0.06-0.25,
// R4 build 0.67). My own first value here, #f6f0ba, came from a slightly
// different mask of the same frame and measured out at 0.24-0.27 — inside
// the published <=0.30 target but at the very top of the arcade's observed
// range. Deferring to the doc's operator on the doc's own discriminator.
const E_HOT = '#f7f7e6'; // measured #f6f6e7 (1 level on two channels)

// The complete authored set. Handed to makePixelTexture, which snaps every
// surviving texel to it — see tools/fx_palette_probe.mjs and the R7 notes in
// effects/pixelTexture.js. Before this existed the burst canvas carried ~300
// unauthored colours, every one of them an antialiased seam between two of
// the seven below (#9f0000 and #9d0000 either side of E_RIM #9e0000 were the
// two most common), and `?combatexpl=1` measured 385 colours / 227 channel
// values against gates of 256 and 32.
export const EXPLOSION_PALETTE = [E_RIM, E_DEEP, E_ORANGE, E_AMBER, E_GOLD, E_YELLOW, E_HOT];

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

// Cavity radius as a fraction of the lobe radius — the dark-red interior
// structure that replaced the punched holes. See the long note in drawBurst.
// Measured consequence of the change, and the reason this is not still 0.26:
// a transparent hole sits OUTSIDE FIRE-MASK and an opaque dark-red one sits
// INSIDE it, so converting them moved the bright fraction (V > 0.95) from
// 40.7-48.6 % to 31.4-38.5 %. 0.18 halves the cavity area and lands it back
// at the R6 level. The arcade's own interior is 8.8 % non-fire of which only
// 1.8 % is genuinely dark, so less dark interior is also the more faithful
// direction, not just the one that moves the statistic.
const CAVITY_R = 0.18;

// White-hot core mask, drawn as explicit texels at the end of drawBurst (see
// the long note there). One connected ragged mass with two tongues, NOT a
// disc: REFERENCE.md records the arcade's near-white pixels as "one ragged
// mass through the middle rather than a scatter", inside a fireball that is a
// "boiling multi-lobe mass ... not a radial gradient". 41 filled cells of 99.
const CORE_MASK = [
  '...........',
  '....##.....',
  '..#####.#..',
  '.########..',
  '.#########.',
  '..#######..',
  '..#####....',
  '...##.##...',
  '...........',
];
const CORE_ROWS = CORE_MASK.length;
const CORE_COLS = CORE_MASK[0].length;

// THE PHASE LADDERS. Phase 0 is the fireball; 1 and 2 are the DECAY, and
// they replace the opacity ramp that used to end the sprite's life.
//
// R7, and the direction here was decided against the frames rather than
// against the critique. judging/R6/art-critique.md §3 asks for "a palette
// sequence ending in two or three dark smoke greys", on the strength of the
// grey mass around the starburst in reference/death-starburst-gp-t202.png.
// That frame is a DARK stage: its sky is black and its grey masses cannot be
// separated from that stage's own clouds by any operator I could write. The
// one unambiguously daylight arcade explosion in this repo,
// reference/ab2-arcade-huge-explosion.jpg, has NO grey anywhere in it — it is
// red, orange, yellow and white, and its darkest material is a deep red.
// Authoring grey smoke for a daylight stage out of a night frame is REFERENCE
// ledger row 12's defect exactly, so this decays into its OWN measured dark
// end instead: the fire goes out, deep red last. The alpha dissolve — which
// is the part an arcade board genuinely cannot do — is gone either way.
//
// Each entry is [colour, band radius], outermost first, same solved-area
// construction as phase 0 (see the long note in `blobs`). `core` is the
// white-hot texel grid; only the fireball has one.
const PHASES = [
  { core: true, spike: 1.0, bands: [[E_RIM, 1.0], [E_DEEP, 0.938], [E_ORANGE, 0.86],
    [E_AMBER, 0.78], [E_GOLD, 0.60], [E_YELLOW, 0.42]] },
  { core: false, spike: 0.78, bands: [[E_RIM, 1.0], [E_DEEP, 0.90], [E_ORANGE, 0.72],
    [E_AMBER, 0.46]] },
  { core: false, spike: 0.55, bands: [[E_RIM, 1.0], [E_DEEP, 0.78], [E_ORANGE, 0.40]] },
];

function drawBurst(arrangement, phaseIndex = 0) {
  const phase = PHASES[phaseIndex];
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = E_RIM;
    for (let i = 0; i < SPIKES; i++) {
      const a = (i / SPIKES) * Math.PI * 2 + arrangement[0][0];
      const len = w * phase.spike
        * (SPIKE_LEN_BASE + SPIKE_LEN_VAR * Math.abs(Math.sin(i * 2.4)));
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
    for (const [fill, scale] of phase.bands) blobs(fill, scale);

    // (The white-hot core used to be drawn here, as three overlapping arcs on
    // the largest lobe. It is now drawn at the very END of this function, as
    // an explicit texel grid — see CORE_MASK below for why both the position
    // and the construction had to change.)

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

    // DARK-RED CAVITIES THROUGH THE FIREBALL — formerly PUNCHED HOLES, and
    // the measurement that justified punching them does not reproduce.
    //
    // What this comment used to say: "the non-fire pixels lying strictly
    // inside its own silhouette on ab2-arcade-huge-explosion.jpg [are] 20.0%
    // of the filled silhouette, and 51.4% of those read as SKY ... So they
    // are holes you see through". judging/R6/art-critique.md §3(b) reported
    // the consequence from the other end — "the light-blue flecks inside the
    // fireball are not debris, they are the background", six of them on the
    // death starburst.
    //
    // Re-run on the same frame with the same stated operator (V > 0.55 AND
    // R > B + 0.10, largest 8-connected component, n = 10 980 px — their own
    // n, so this is the same component), filling the component's interior by
    // flooding from the border:
    //
    //   interior non-fire   1 060 px = 8.8% of the filled silhouette (not 20.0)
    //   of those, SKY-like   12.9%  = 137 px = 1.1% of the silhouette (not 51.4)
    //   of those, V <= 0.35   1.8%
    //   the dominant interior non-fire colours are #f7f3ff, #f9f8ff, #fbf4fc
    //
    // i.e. the "holes" are overwhelmingly the fireball's own NEAR-WHITE pixels,
    // which the warm mask (R > B + 0.10) rejects because white is achromatic.
    // The operator was counting its own exclusions as background. 137 sky-like
    // pixels in a 12 040 px silhouette, scattered across rows 6-121, is JPEG
    // ringing in the spike gaps, not structure. The crop agrees: at 4x the
    // arcade fireball is solid, and what reads as a hole is a white patch.
    //
    // So the cavities stay — the interior DOES have dark structure, plainly
    // visible as red streaks through the yellow — but they are drawn in
    // E_DEEP instead of punched to transparency. Same placement, same
    // silhouette, same area; the texels are now opaque and on-palette. This
    // moves the acceptance statistics (a dark warm pixel is INSIDE
    // FIRE-MASK where a transparent one was outside it), so the FIRE-MASK
    // figures are re-measured after this change rather than assumed — see
    // judging/R7/lane-fx.md.
    //
    // The centre lobe is still skipped and the 0.45 offset still exceeds the
    // cavity radius plus the core radius (0.26 + 0.245), so no cavity can
    // reach E_HOT.
    ctx.fillStyle = E_DEEP;
    arrangement.forEach(([lx, ly, lr], i) => {
      if (i === 0) return; // leave the central lobe's hot core intact
      const a = i * 1.107 + 0.4;
      ctx.beginPath();
      ctx.arc(
        lx * w + Math.cos(a) * lr * w * 0.45,
        ly * h + Math.sin(a) * lr * h * 0.45,
        lr * w * CAVITY_R,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // ---- THE WHITE-HOT CORE -------------------------------------------------
    //
    // R4 gap 11 ("explosions have no white-hot core") was reported CLOSED in
    // REFERENCE.md on the strength of a FIRE-MASK reading of 8.4-11.6% core.
    // It was not closed. Measured on tools/out/combatfx-r5b/expl, the core
    // colour E_HOT (#f6f6e7) reached the screen ZERO times — not a low
    // fraction, not a dim version, zero pixels within 40 of it anywhere in any
    // frame of a 16-frame capture, and zero pixels satisfying warm AND
    // S < 0.35 AND V > 0.90. The brightest colour the fireball actually puts
    // on screen is E_YELLOW #f9f647, a fully saturated yellow (S 0.98). Side
    // by side at 4x against ab2-arcade-huge-explosion.jpg, ours is a smooth
    // red-orange-yellow gradient and the arcade's is a lobed mass shot through
    // with white patches. The crop and the statistic agree, which is why this
    // is a bug report and not a retune.
    //
    // WHY THE OLD CONSTRUCTION PRODUCED NOTHING. Three `ctx.arc` fills on the
    // largest lobe, drawn mid-function under the LOBE_INSET scale transform.
    // Bisected with colour probes: recolouring E_AMBER renders (99-630 px per
    // frame), recolouring E_HOT renders 0, and moving the same three arcs to
    // the very end of the function — after the destination-out hole pass, so
    // nothing can erase them — still renders 0. So the arcs were not being
    // covered or punched out; they were producing no texels. Rather than keep
    // bisecting a Canvas2D path-fill under an active scale transform, the core
    // is authored the way judging/R4/art-critique.md already told this project
    // to author chunky shapes: "Canvas2D antialiases path fills with no way to
    // disable it ... the nozzle donuts, the smoke rings, the explosion lobes
    // and the enemy bullseye nose are all the same failure", with the vulcan
    // puff's explicit grid named as the pattern to copy.
    //
    // SO: an explicit texel grid, at integer texture coordinates, with the
    // transform reset first so the grid lands on the texture's own pixels
    // instead of being resampled by the 0.62 inset.
    //
    // SHAPE, not a disc. REFERENCE.md: the arcade's near-white pixels "form
    // one ragged mass through the middle rather than a scatter", and the
    // fireball is a "boiling multi-lobe mass with radial spikes, not a radial
    // gradient". The mask below is one connected ragged blob with two short
    // tongues reaching out along the lobe axis.
    //
    // SIZE: 0.27 * w, down from 0.46, AND THE DIRECTION OF THIS CHANGE IS THE
    // OPPOSITE OF WHAT TWO ROUNDS OF REPORTS SAY IT SHOULD BE. The reason is
    // that the number both of them rest on was taken with an instrument that
    // does not reproduce its own published control.
    //
    // WHAT THE REPORTS SAY. judging/R5/lane-combatfx.md recorded our core at
    // "4.1-7.8% across eight frames", under the arcade's 9.2% and over the
    // >= 5% gate, and called staying under it a knowing, deliberate trade --
    // 0.52 was tried and rejected because "the white swallows the lower half
    // of the sprite". judging/R5/art-critique.md reviewed that call and
    // endorsed it ("Yes. Hold the line"), adding that the I6 ladder was
    // measured on PEAK-FLASH frames and should be judged per phase.
    //
    // THE PER-PHASE MEASUREMENT, which is what R6 was asked to do, is in
    // tools/out/combat-r6/measure_expl_phase.py and it says the premise is
    // wrong. FIRE-MASK, verbatim from REFERENCE.md, over one whole 0.75 s
    // blast captured EVERY TICK in the ?combatexpl=1 harness with no clouds
    // and no player sprite:
    //
    //   phase        0.03-0.13 s   0.15-0.40 s   0.42-0.58 s   (40 frames)
    //   core %         28.2-29.6     27.7-32.3     28.9-31.3
    //   mean S          0.67-0.69     0.66-0.69     0.67-0.69
    //   V > 0.95 %      46.5-48.1     49.9-53.8     50.8-53.9
    //   mean V          0.862-0.873   0.872-0.880   0.872-0.880
    //
    // Against the arcade's 9.2% core / 0.846 mean S / 54.2% / 0.9055. Our
    // core is THREE TIMES the arcade's, flat across every phase, and our mean
    // saturation is 22% LOW -- which is the same fact said twice: the white
    // disc the previous value was trying not to create is already there.
    //
    // WHY THE EARLIER NUMBER WAS WRONG, and it is a criteria defect rather
    // than an arithmetic slip. REFERENCE.md publishes FIRE-MASK's control
    // figures on ab2-arcade-huge-explosion.jpg (0.9055 / 54.2% / 9.2% /
    // 0.846) but NOT the regions excluded from that 181x127 frame. Run
    // verbatim it reads core 18.2% / mean S 0.764 -- the mask walks out of
    // the fireball into the cloud wedge at the bottom left and the HUD strip
    // at the top, both of which are low-saturation and bright. Two
    // independent re-implementations have now failed on that one statistic in
    // the same direction (R5's read 13.2%, mine 18.2%, against 9.2%).
    // Excluding rows 0-14, rows 112-127 and the x<55 / y>82 cloud wedge
    // reproduces all four published figures to within 0.5 points
    // (0.9028 / 53.6% / 9.4% / 0.847), and THAT is the operator the numbers
    // above are taken with. The exclusion belongs in REFERENCE.md.
    //
    // SO: 0.27, because core area goes as side^2 and 0.46 * sqrt(9.5/30) =
    // 0.26. It is a 16-texel core inside a lobe cluster that reaches ~33
    // texels after LOBE_INSET, i.e. a hot centre rather than a mound. The
    // crop still outranks this: see tools/out/combat-r6/expl-ab.png, where
    // the 0.46 frames are a white mass with an orange fringe and the 0.27
    // frames are the lobed orange-and-yellow fireball with white patches
    // through the middle that REFERENCE.md describes.
    //
    // The art critique's per-phase argument is CORRECT and is kept: the
    // target was measured at peak flash. It simply does not rescue the old
    // value, because our core does not decay -- it is flat to within 4
    // points across all three phases, since it is an authored texel grid on
    // a texture that only cycles between three lobe arrangements.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // The decay phases have no white-hot core: the fire is going out.
    if (!phase.core) return;
    const side = 0.27 * w;
    const cell = side / CORE_COLS;
    const ox = cx - side / 2;
    const oy = cy - (side * CORE_ROWS) / CORE_COLS / 2;
    ctx.fillStyle = E_HOT;
    for (let r = 0; r < CORE_ROWS; r++) {
      for (let c = 0; c < CORE_COLS; c++) {
        if (CORE_MASK[r][c] !== '#') continue;
        // Integer device coordinates: a fractional rect is the Canvas2D
        // antialiasing trap CLAUDE.md lists as a recurring bug class here, and
        // on a 64-texel canvas a half-covered texel is 1.5% of the sprite.
        const x0 = Math.round(ox + c * cell);
        const y0 = Math.round(oy + r * cell);
        ctx.fillRect(x0, y0, Math.round(cell) || 1, Math.round(cell) || 1);
      }
    }
  };
}

// Debris chunk: "small red/white chunks" (t100 upper-left). Two of them: the
// bright chunk the kill throws, and the dark one it has cooled to by the time
// the fire is out. Swapping between them is what used to be `opacity = 1 - t`.
const CHUNK_WHITE = '#e6e6e6'; // was #e8e8e8
export const CHUNK_PALETTE = [CHUNK_WHITE, E_RIM, E_DEEP];
function drawChunk(top, bottom) {
  return (ctx, w, h) => {
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h / 2, w, h / 2);
  };
}

let burstTextures = null;
let chunkTextures = null;
// Indexed [phase][arrangement]. Phase 0 is the fireball and cycles through
// all three arrangements as it boils; the two decay phases need only one
// each, since by then the mass is collapsing rather than boiling.
function bursts() {
  burstTextures ??= PHASES.map((_, phase) =>
    ARRANGEMENTS.map((a) =>
      makePixelTexture(drawBurst(a, phase), 64, 64, { palette: EXPLOSION_PALETTE })));
  return burstTextures;
}

// Measurement-only accessors for tools/fx-probe.mjs. The probe audits the
// authored canvases, so it needs the texture arrays themselves rather than
// whatever the field happens to be showing.
export const burstTexturesForProbe = () => bursts();
export const chunkTexturesForProbe = () => chunks();

function chunks() {
  chunkTextures ??= [
    makePixelTexture(drawChunk(CHUNK_WHITE, E_RIM), 4, 4, { palette: CHUNK_PALETTE }),
    makePixelTexture(drawChunk(E_RIM, E_DEEP), 4, 4, { palette: CHUNK_PALETTE }),
  ];
  return chunkTextures;
}

// Peak on-screen diameter of a kill explosion, as a fraction of frame width.
// REFERENCE.md measures the t357 fireball at ~23%W; GAME_SPEC.md §8 requires
// explosions to "occupy the frame generously".
const PEAK_FRAC = 0.30;

// ---------------------------------------------------------------------------
// THE ENVELOPE IN TIME. R10. READ THIS BEFORE LENGTHENING ANYTHING HERE.
//
// Every palette, core-fraction, saturation and silhouette gate in this
// project scores this fireball as a PASS and all of them are right. What was
// wrong for nine rounds is how long it lasts, and no criterion had a time
// axis, so nothing could see it. R9's motion pass found it from the pixels
// (judging/R9/report.md §2.4) and R10's effects lane re-measured both sides
// at 60 Hz with a controlled operator (judging/R10/envelope_r10.py, selftest
// 18/18; judging/R10/lane-envelope.md for the table and the blind spots):
//
//                                       arcade          ours, 8725647
//   frames within 60 % of peak          4   (0.067 s)   16  (0.267 s)
//   total life, area >= 10 % of peak    8-12 (0.13-0.20 s)  41 (0.683 s)
//   area at peak + 0.100 s              0.04-0.14 x     0.51 x
//
// Arcade side: .reference-cache/video/ab2-longplay-60fps.mp4, three kills in
// the stage-1 burst at t = 95.6 (stage digit read 1 on every frame), plus
// R9's independent event at t = 99.65. Ours: ?fixed=1&seed=1&demo=2, ticks
// 300-539 captured at --every 1.
//
// THE OLD VALUES WERE LIFE_S = 0.75 WITH DECAY_FROM = 0.76, i.e. the fireball
// proper held for 0.57 s at a size that only shrank 12 % across the whole
// life. That is a PLATEAU where the arcade has a FLASH, and it is the single
// reason our explosion reads as a sticker and the arcade's reads as a
// detonation. The fire is now 16 ticks: 5 at full fire, 5 in the first decay,
// 6 in the second. 16 rather than 14 because at 14 our life10 read 7 frames
// against the arcade's 8 and 12 — UNDER the arcade on the only two of its
// events this lane could bound — and being short of the arcade is as much a
// miss as being long.
//
// WHAT THIS COSTS, HONESTLY. The R6 per-phase FIRE-MASK statistics (core %,
// mean S, V > 0.95) were taken over 0.03-0.58 s of phase 0 and the old
// DECAY_FROM existed to keep them describing the same frames. They are
// per-frame statistics of an unchanged texture, so every one of them still
// reads the same on any frame that shows phase 0 — re-measured after this
// change and unmoved — but phase 0 is now on screen for 5 ticks instead of
// 34, so a capture sampled at 0.25 s will usually MISS the fireball and catch
// a decay phase. That is a property the arcade has too. Do not "fix" a
// sampled capture that shows no white-hot core by lengthening phase 0.
const LIFE_S = 16 / 60;
// 30, up from 14: the arcade swaps its explosion sprite every SECOND frame.
// Measured on the same bursts — the fire-mask area series alternates in
// 2-frame pairs over a ground that changes on every frame, so the sprite
// animates at 30 Hz inside 60 Hz logic. At 14 Hz the new 4-tick phase 0 would
// show a single arrangement and the mass would not boil at all.
const BOIL_HZ = 30;
// Life fractions at which the fire steps down a phase: 5 ticks, then 5, then
// 6. The area decay the arcade has comes mostly from HERE rather than from
// `grow` — phase 1 drops E_YELLOW and E_GOLD and phase 2 drops E_AMBER too,
// so the fire-coloured area collapses while the mass itself keeps expanding,
// which is what a real fireball turning into smoke does.
const DECAY_FROM = 5 / 16;
const DECAY_MID = 10 / 16;

// Debris outlives the fire. It used to share LIFE_S, so shortening the fire
// by 3x would have taken the chunks with it and the kill would throw nothing.
// MUST STAY ABOVE LIFE_S: the entry is retired on this clock, and the residue
// is spawned on the fire's. Drop it below LIFE_S and the kill silently stops
// leaving smoke.
const CHUNK_LIFE_S = 0.45;

// The residue. See the KILL SMOKE block in effects/smoke.js for the arcade
// measurement behind the palette; these are the sizes and the life.
//
// Arcade: the plume reaches 7.20 % of the frame about 0.17 s after the fire
// peak and is still plainly there a second later. Ours is DELIBERATELY UNDER
// that — three puffs growing 0.09 -> 0.19 of frame width cover roughly 4-6 %
// — because the arcade figure is ONE event and its decay could not be
// separated from stage 1's cloud banks by any mask this lane could build
// (the same blind spot R9 hit). Under-shooting a number measured once is the
// cheap error; over-shooting it puts a peach mass over the sky on every kill.
const SMOKE_PUFFS = 3;
const SMOKE_LIFE_S = 0.9;
const SMOKE_FRAC_START = 0.09;
const SMOKE_FRAC_END = 0.19;

export class ExplosionField {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.live = [];
    this.pool = [];
    this.chunkPool = [];
    // Its OWN SmokeField, not combat.js's. Taking the caller's would change
    // `new ExplosionField(scene, space)`'s signature, and combat.js belongs
    // to another lane and is live this round. This one holds nothing but
    // kill residue and is updated and cleared from here.
    this.smoke = new SmokeField(scene, space);
  }

  _acquire() {
    if (this.pool.length) return this.pool.pop();
    const sprite = makeBillboard(bursts()[0][0], 1);
    sprite.renderOrder = 20;
    return sprite;
  }

  _acquireChunk() {
    if (this.chunkPool.length) return this.chunkPool.pop();
    const sprite = makeBillboard(chunks()[0], 1);
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

    const debris = [];
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
      debris.push({ sprite: c, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
      this.scene.add(c);
    }

    // `rot` and `pos` are stored rather than read back off the sprite: by
    // the time the residue is spawned the burst sprite has been returned to
    // the pool, and reading a pooled object's fields is how a reuse bug gets
    // written later.
    this.live.push({
      sprite, age: 0, depth, scale, chunks: debris, fireOut: false,
      rot: sprite.material.rotation, pos: position.clone(),
    });
  }

  // The residue, spawned on the tick the fire goes out rather than at the
  // kill: the arcade's plume is only separable from the fireball once the
  // fire has collapsed out of it.
  // NOT ONE DRAW FROM THE CALLER'S `rng`, and this is the second time this
  // project has paid for that rule. The first version took three draws per
  // puff from the shared stream; combat.js's spawner, aim and wave logic read
  // the same stream, so every draw after the first kill shifted and the
  // scenario changed — `?fixed=1&seed=1&demo=2` went from HIT 2 at tick 300
  // to HIT 0, with no error and a frame that looked perfectly plausible
  // (tools/out/envelope-r10/dbg-diff0.png). CLAUDE.md names the class:
  // "adding one conditional draw silently shifts every later draw".
  //
  // The jitter is derived instead from the rotation the explosion ALREADY
  // drew at spawn, so it is varied per kill, deterministic, and free.
  _spawnSmoke(e) {
    // THE RESIDUE DOES NOT SCALE WITH THE FIREBALL PAST 1.6, and the reason is
    // that nothing measured says it should. The sizes above come from ONE
    // arcade event — an enemy kill at an unknown target size, 7.20 % of the
    // frame. The death sequence (src/game/flow/deathSequence.js) spawns its
    // starburst at scale 2.7; carrying that into the smoke gives a puff half
    // the screen wide, i.e. an extrapolation of a single observation by a
    // factor of seven in area, and at that magnification the 32-texel canvas
    // reads as a slab rather than as pixel art. Capped at the largest thing
    // this lane actually measured.
    const sScale = Math.min(e.scale, 1.6);
    const spread = this.space.worldWidthFor(0.06 * sScale, e.depth);
    const a = e.rot;
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const p = e.pos.clone();
      p.x += Math.cos(a + i * 2.27) * spread;
      p.y += (Math.sin(a + i * 1.71) * 0.8 + 0.25) * spread;
      this.smoke.spawn('kill', p, e.depth, {
        life: SMOKE_LIFE_S * (0.82 + 0.18 * (1 + Math.sin(a * 3 + i))),
        fracStart: SMOKE_FRAC_START * sScale,
        fracEnd: SMOKE_FRAC_END * sScale,
      });
    }
  }

  update(dt) {
    const texs = bursts();
    const chunkTex = chunks();
    this.smoke.update(dt);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i];
      e.age += dt;
      // Two clocks now, because the chunks outlive the fire. The burst sprite
      // leaves the scene at LIFE_S and the entry stays until the debris is
      // done; a single clock would either hold the fireball for the chunks'
      // sake (the plateau this round removed) or retire the chunks with it.
      if (!e.fireOut && e.age >= LIFE_S) {
        e.fireOut = true;
        this.scene.remove(e.sprite);
        this.pool.push(e.sprite);
        this._spawnSmoke(e);
      }
      if (e.age >= CHUNK_LIFE_S) {
        for (const c of e.chunks) {
          this.scene.remove(c.sprite);
          this.chunkPool.push(c.sprite);
        }
        this.live.splice(i, 1);
        continue;
      }
      const t = Math.min(1, e.age / LIFE_S);
      if (e.fireOut) {
        // Fire gone; only the debris is still being driven.
        for (const c of e.chunks) {
          c.sprite.position.x += c.vx * dt;
          c.sprite.position.y += c.vy * dt;
          sizeSprite(c.sprite, this.space.worldWidthFor(0.012, e.depth));
          c.sprite.material.map = chunkTex[1];
          c.sprite.material.opacity = 1;
        }
        continue;
      }
      // R3-R6 history, kept because it constrains what may be done here: the
      // first version swelled right through an ALPHA FADE, so the largest
      // frames were also the most transparent, and alpha-blending a big
      // orange mass against #009fff produced the judge's "muddy brown" —
      // mean saturation 0.46 over the lifetime against 0.82-0.83 at peak on
      // the isolation harness. The palette was never the problem and the fade
      // is gone (see the opacity note below). Growth with a fade is the thing
      // that was wrong; growth at opacity 1 is not, and R10 restores it.
      //
      // Up in TWO TICKS, then keep expanding. R10: the old form reached full
      // size in 0.135 s and then SHRANK 12 % across the rest of the life,
      // which is the wrong sign — the arcade's mass keeps growing while its
      // fire-coloured fraction collapses into the phases below. Expanding
      // while the bands cool is what makes the thing read as a detonation
      // turning into smoke rather than as a sprite being switched off.
      const grow = t < 2 / 16 ? 0.45 + (t / (2 / 16)) * 0.55 : 1.0 + (t - 2 / 16) * 0.21;
      // R7: the LAST QUARTER OF THE LIFE IS A PALETTE SEQUENCE, not an alpha
      // ramp. See PHASES above for why it ends in deep red rather than in the
      // grey smoke judging/R6/art-critique.md asked for.
      const phase = t < DECAY_FROM ? 0 : (t < DECAY_MID ? 1 : 2);
      e.sprite.material.map = texs[phase][Math.floor(e.age * BOIL_HZ) % ARRANGEMENTS.length];
      sizeSprite(e.sprite, this.space.worldWidthFor(PEAK_FRAC * e.scale * grow, e.depth));
      // OPAQUE FOR ITS WHOLE LIFE. The arcade's explosions are sprite
      // animations that END; they do not dissolve into the sky. The old
      // `t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2` is the single largest contributor
      // to R6 gap 1's explosion arm: a big orange mass at an arbitrary alpha
      // over #009eff, blended in LINEAR space, puts a fresh continuum on
      // screen every tick. The measured cost on the committed tree was
      // `?combatexpl=1` reading up to 385 colours and 227 channel values
      // against gates of 256 and 32, with #3797f2 / #5babf3 / #5aabfc —
      // sky-and-fire mixtures — among the most numerous pixels in the frame.
      e.sprite.material.opacity = 1;

      for (const c of e.chunks) {
        c.sprite.position.x += c.vx * dt;
        c.sprite.position.y += c.vy * dt;
        sizeSprite(c.sprite, this.space.worldWidthFor(0.012, e.depth));
        // Same rule, two colours instead of a ramp: the chunk cools to dark
        // red rather than fading out. 4x4 texels each, so this is a handful
        // of pixels — and a handful of pixels is exactly what a set-cardinality
        // gate charges full price for.
        c.sprite.material.map = chunkTex[t < DECAY_FROM ? 0 : 1];
        c.sprite.material.opacity = 1;
      }
    }
  }

  clear() {
    for (const e of this.live) {
      // `fireOut` entries have ALREADY returned their burst sprite to the
      // pool. Pushing it a second time would hand the same sprite out to two
      // live explosions — a pool double-free, and silent: both would render,
      // one would win, and the other would appear to have no fireball.
      if (!e.fireOut) {
        this.scene.remove(e.sprite);
        this.pool.push(e.sprite);
      }
      for (const c of e.chunks) {
        this.scene.remove(c.sprite);
        this.chunkPool.push(c.sprite);
      }
    }
    this.smoke.clear();
    this.live.length = 0;
  }
}

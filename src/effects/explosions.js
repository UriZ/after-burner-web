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
// rather than to a point. (R11 took it to 96 — see BURST_PX — so the same
// spike is 21 texels; the argument is unchanged and the headroom is larger.)
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

// ---------------------------------------------------------------------------
// R11 — THE BREAK-UP. Read this before touching PHASES or BREAKUP below.
//
// R10 fixed this explosion's DURATION and left its SHAPE wrong, and the R10
// judge named the mechanism (judging/R10/judge-report.md §1.4): the arcade's
// fireball FRAGMENTS into a wide sparse spray of yellow and red chunks, and
// its white-hot fraction PEAKS LATE (+100 to +133 ms on three of four kills)
// because it flares again as it bursts. Ours stayed a compact lobed ball that
// only changed colour.
//
// MEASURED ON BOTH SIDES, 60 Hz consecutive, with two DIMENSIONLESS shape
// statistics so no scale matching is needed (judging/R11/fx_r11.py, selftest
// 39/39; judging/R11/lane-effects.md for the tables, the crops and the
// blind spots):
//
//   fill   = masked area / area of its own convex hull   (filled disc = 1.00)
//   spread = radius of gyration / sqrt(area/pi)          (filled disc = 0.707)
//
//   arcade, 2 stage-1 kills, t=101.67 and t=102.40, m_material, licensed lags
//     compact phase    fill 0.31-0.60   spread 0.81-1.04   components 6-20
//     BURST phase      fill 0.08-0.26   spread 1.31-2.03   components 25-88
//
//   OURS at 5e3d57e, the authored canvases themselves, same mask
//     phase 0          fill 0.565       spread 0.812       components 1
//     phase 1          fill 0.834       spread 0.721       components 1-3
//     phase 2          fill 0.851       spread 0.720       components 2
//
// BOTH STATISTICS RAN THE WRONG WAY. The arcade's fill FALLS and its spread
// RISES across the event; ours did the opposite — it got MORE disc-like as it
// aged, because the decay phases simply dropped the bright bands off a mass
// whose arrangement never changed. 0.72 is the filled-disc value to three
// decimals. We were drawing a disc and recolouring it.
//
// (The comparison is licensed against the medium: putting our own authored
// canvas through the arcade's presentation chain — nearest to 96 native px,
// bilinear to the longplay's 3.2125x, lossy re-encode — moves `fill` by
// <=0.027 and `spread` by <=0.030. The gap is 3x to 10x that.)
//
// SO PHASES 1 AND 2 ARE NO LONGER THE SAME DRAWING WITH FEWER BANDS. They are
// a RADIAL STARBURST OF SEPARATED FLECKS, which is what the arcade frames
// show at 2x (tools/out/effects-r11/ARC-residue-origin.png — nine consecutive
// 60 Hz frames of one isolated kill over open sky: ball, then a star of
// separated red flecks with a white-hot centre, then the residue). The flecks
// are drawn as integer `fillRect`s, so they antialias against nothing and
// cost no off-palette seam colours at all.
//
// AND PHASE 1 HAS A WHITE-HOT CORE AGAIN, against what this file used to
// assert two hundred lines down ("the decay phases have no white-hot core:
// the fire is going out"). That sentence is true of our sprite and false of
// the arcade's, which re-flares at +100-133 ms on three of four measured
// kills. Our phase 1 occupies +83 to +167 ms, so the re-flare lands in it by
// construction.
//
// THE CANVAS GOES 64 -> 96 TEXELS, and the reason is resolution rather than
// taste: the sprite is drawn at PEAK_FRAC 0.30 of 320 native px = 96 native
// px, so at 64 it was being UPSAMPLED 1.5x and a 2-texel fleck arrived as a
// 3-px smudge. At 96 the canvas is 1:1 with the screen at peak size and a
// fleck is a fleck. (Same argument as the 48 -> 64 step under LOBE_INSET.)
const BURST_PX = 96;

// THE BREAK-UP GEOMETRY, one entry per decay phase, all lengths as canvas
// fractions:
//
//   inner  radius inside which the CORE SCATTER sits — the dense cluster of
//          hot chunks the rays emerge from
//   reach  how far the outermost ray fleck projects
//   rays   number of radial streaks;  per  flecks per streak
//   gamma  radius law exponent: r = reach * u^gamma, u = k/(per-1) in
//          [inner/reach, 1]. >1 BUNCHES the flecks inward, which is what
//          makes a streak read as a streak instead of as four dots.
//   fleck  [inner size, outer size]
//   lumps  how many chunks in the core scatter; `lump` their size
//   core   white-hot patch size (0 = none)
//
// SOLVED FIRST, then corrected against the drawing. For flecks of area A_k at
// radius r_k:
//   fill   ~= sum(A_k) / (pi * reach^2)
//   spread ~= sqrt(sum(A_k r_k^2) / sum(A_k)) / sqrt(sum(A_k)/pi)
// against the arcade's measured burst band of fill 0.08-0.26 and spread
// 1.31-2.03 (two stage-1 kills, licensed lags, judging/R11/lane-effects.md).
// Phase 1 sits at the dense end and phase 2 at the sparse end, which is the
// order the arcade's own consecutive frames run in.
//
// TWO THINGS THE SOLVE GOT WRONG AND THE CROP CAUGHT, both recorded because
// the numbers were inside their bands while the sprite was not AB2:
//
//  1. `per` 3 AND A LINEAR RADIUS LAW DRAW CONFETTI, NOT A BURST. Three
//     flecks evenly spaced along a ray are three dots; the eye needs ~5 with
//     the inner ones close together before it joins them into a streak. The
//     statistics could not see the difference — fill 0.23 / spread 1.03 /
//     ncomp 31 is inside the arcade band either way. This is the
//     statistics-cannot-replace-artwork case in its own lane's file.
//  2. THE RE-FLARE CORE WAS THREE BIG WHITE SQUARES, 53 % of the phase-1
//     mask against the arcade's 11-41 % peak and 2-7 % typical. It read as a
//     white blob with sparks round it. It is now a small ragged scatter
//     inside the chunk cluster.
// R28: REACH PULLED IN so the break-up stays a COHESIVE mass instead of a
// sparse star of separated flecks on open sky. R11 tuned `reach` to 0.42/0.49
// to land the arcade's measured `spread` band (1.31-2.03, radius of gyration
// vs equal-area disc), but the owner and the R28 judge read the result as "red
// confetti" — the same 16 rays at a smaller reach pack the same flecks into a
// denser silhouette that reads as one bursting fireball, which is what the
// daylight reference (ab2-arcade-huge-explosion.jpg) shows. The R24
// recalibration makes that LOOK outrank the `spread` statistic.
const BREAKUP = [
  // phase 1, +83..+167 ms: the BURST. A dense hot chunk cluster with streaks
  // of fat flecks tearing out of it, and the re-flare.
  {
    inner: 0.13, reach: 0.33, rays: 16, per: 5, gamma: 1.5,
    fleck: [0.052, 0.026], lumps: 9, lump: 0.045, core: 0.065,
  },
  // phase 2, +167..+267 ms: the SPRAY. The cluster is gone, the streaks are
  // a little wider, finer and cooler, and only a trace of core is left — the
  // arcade's hot fraction falls back after its re-flare (judge §1.4: 0.051 at
  // +150 ms on event D, 0.063 on my own event F at the same lag). R28: reach
  // 0.49 -> 0.38, still the widest phase but no longer a frame-crossing scatter.
  {
    inner: 0.10, reach: 0.38, rays: 16, per: 6, gamma: 1.25,
    fleck: [0.038, 0.017], lumps: 4, lump: 0.026, core: 0.030,
  },
];

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
// Only phase 0 is a lobe cluster now; `bands` for 1 and 2 are the fleck
// colour ladders, read outermost-first (see drawBreakup).
const PHASES = [
  { core: true, spike: 1.0, bands: [[E_RIM, 1.0], [E_DEEP, 0.938], [E_ORANGE, 0.86],
    [E_AMBER, 0.78], [E_GOLD, 0.60], [E_YELLOW, 0.42]] },
];

// Fleck colours by RING, outermost first. The arcade's spray is red at the
// outside and yellow at the inside on every frame of
// tools/out/effects-r11/ARC-residue-origin.png, which is the same hue ramp
// phase 0's bands already carry (rim 0deg -> mid 40deg -> hot 59-69deg) — the
// break-up re-arranges the fireball, it does not repaint it.
// E_YELLOW IS NOT IN EITHER LADDER, and that is a measured decision rather
// than an omission. The judge's YELLOW class is `G/R > 0.62 AND R > 180`,
// which E_AMBER (0.686) and E_GOLD (0.741) are both inside — so a ladder that
// also carries E_YELLOW puts three of its five steps in one class, and the
// break-up measured 70 % yellow against the arcade's 0.05-0.34 at the same
// lag. Five steps GOLD -> AMBER -> ORANGE -> DEEP -> RIM span the same hue
// ramp (59deg -> 0deg) with one step per class.
const FLECK_RINGS = [
  [E_RIM, E_DEEP, E_ORANGE, E_AMBER, E_GOLD], // phase 1, read outermost-first
  // R28: WARMED. The old phase-2 ladder spent THREE of its four steps on the
  // two reds (E_RIM/E_DEEP/E_DEEP/E_ORANGE), which — now that the reach is
  // pulled in and the wide debris chunks are gone — was the last thing on
  // screen that still read as a "red confetti" residue (R28 judge #1). The
  // arcade's own late spray is still fire-COLOURED where it is dense; the dark
  // red is the sparse outer fringe, not the body. One deep-red tip, then orange
  // and amber keeps a red rim without a red field. Read outermost-first, so the
  // single E_DEEP owns only the coldest ray tips.
  [E_DEEP, E_ORANGE, E_ORANGE, E_AMBER],
];

function drawBurst(arrangement, phaseIndex = 0) {
  const phase = PHASES[phaseIndex];  // only phase 0 is a lobe cluster
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
    // R11: the sentence that stood here — "the decay phases have no white-hot
    // core: the fire is going out" — was refuted by the arcade on three kills
    // of four (judge-report §1.4) and the decay phases are no longer drawn by
    // this function at all. See drawBreakup, which carries the re-flare.
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
        // on the 96-texel canvas a half-covered texel is 1.0% of the sprite
        // (it was 1.5% at 64, where this note was written).
        const x0 = Math.round(ox + c * cell);
        const y0 = Math.round(oy + r * cell);
        ctx.fillRect(x0, y0, Math.round(cell) || 1, Math.round(cell) || 1);
      }
    }
  };
}

// THE BREAK-UP, phases 1 and 2. See the R11 note above BREAKUP for the
// measurement this is built against.
//
// EVERY MARK IS AN INTEGER `fillRect`. Not a stylistic choice: a `ctx.arc`
// fill antialiases against whatever is under it, and `makePixelTexture`'s
// palette snap then resolves each seam texel to one of the two colours that
// made it — which is correct but means the SHAPE of a small fleck is decided
// by a rounding rule rather than by this file. At 2-5 texels a fleck that is
// half a texel out is a different fleck. Squares at integer coordinates are
// also what the arcade's own spray is: crop
// tools/out/effects-r11/ARC-residue-origin.png at 2x and every chunk in it is
// a hard-edged rectangle of one colour.
//
// `variant` (0..2) perturbs the ray rotation and the per-ray radius jitter so
// the three cached arrangements differ; it is a pure function of the index,
// as the seeded-render rule requires.
function drawBreakup(variant, phaseIndex) {
  const g = BREAKUP[phaseIndex - 1];
  const ring = FLECK_RINGS[phaseIndex - 1];
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const px = (x, y, s, fill) => {
      // Half-open integer rect. `Math.max(1, ...)` because a fleck that
      // rounds to zero texels is a fleck that silently is not there — which
      // is how a sparse arrangement turns back into a dense one at a smaller
      // canvas size without anything failing.
      const s0 = Math.max(1, Math.round(s));
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(x - s0 / 2), Math.round(y - s0 / 2), s0, s0);
    };

    // THE CORE SCATTER — the dense cluster of hot chunks the streaks tear
    // out of. Golden-angle placement inside `inner`, so it is irregular and
    // deterministic at once (the seeded-render rule); radius grows with the
    // index so the cluster is denser at the middle.
    for (let i = 0; i < g.lumps; i++) {
      const a = i * 2.399 + variant * 0.83;
      const rr = g.inner * w * Math.sqrt((i + 0.35) / g.lumps);
      const s = g.lump * w * (1.15 - 0.5 * (i / g.lumps));
      // Weighted toward E_ORANGE rather than cycling evenly: E_AMBER and
      // E_GOLD both fall in the judge's YELLOW class (G/R 0.686 and 0.741,
      // against its 0.62 threshold), so an even cycle puts two thirds of the
      // cluster's area in one class and the sprite measures as lemon.
      px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, s,
        i % 4 === 0 ? E_GOLD : (i % 4 === 1 ? E_AMBER : E_ORANGE));
    }

    // THE STREAKS. Each is `per` flecks marching outward, shrinking, cooling
    // from the inside out — the arcade's own hue ramp read along a radius.
    const rot = 0.37 + variant * (Math.PI * 2) / (g.rays * 3);
    for (let j = 0; j < g.rays; j++) {
      const a = (j / g.rays) * Math.PI * 2 + rot;
      // Deterministic per-ray length jitter on a golden-angle sequence, so
      // neighbouring streaks do not end on a circle. A spray whose tips lie
      // on a circle reads as an ANNULUS, which is a ring and not a burst —
      // and `spread` cannot tell those apart (it reads 1.51 for an annulus,
      // squarely inside the band this is tuned to), so it is a thing only
      // the crop catches.
      const jit = 0.74 + 0.52 * (((j * 0.6180339887 + variant * 0.31) % 1));
      for (let k = 0; k < g.per; k++) {
        const u = k / (g.per - 1);
        const frac = g.inner / g.reach + (1 - g.inner / g.reach) * u ** g.gamma;
        const r = g.reach * w * frac * jit;
        const s = w * (g.fleck[0] + (g.fleck[1] - g.fleck[0]) * u);
        // `ring` is listed OUTERMOST-FIRST, so the index runs backwards along
        // the streak: the tip of a ray is the coldest thing in it and the
        // root of it is the hottest. Written the other way round first, which
        // drew a dark-red centre inside a gold halo — the arcade's own ramp
        // exactly inverted, and visible at a glance on the sheet while every
        // shape statistic stayed where it was.
        const ci = Math.min(ring.length - 1, Math.round((1 - u) * (ring.length - 1)));
        px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s, ring[ci]);
        // Every third streak drops a second, darker fleck just off-axis.
        // This is what takes `ncomp` up WITHOUT taking `fill` up: two small
        // separated marks cover the same convex hull as one.
        if (k >= 1) {
          px(cx + Math.cos(a + 0.13 * (1 + (j % 3))) * r * 0.88,
            cy + Math.sin(a + 0.13 * (1 + (j % 3))) * r * 0.88,
            s * 0.92, E_RIM);
        }
      }
    }

    // THE RE-FLARE. The arcade's white-hot fraction peaks at +100 to +133 ms
    // — INSIDE phase 1 — because the fireball flares as it bursts into its
    // debris spray (judge-report §1.4, three kills of four). Drawn last so
    // nothing covers it, as explicit integer texels for the same reason the
    // phase-0 core is: a path fill under an active transform rendered ZERO
    // texels there, and the bisection that found that is in the long note
    // above CORE_MASK.
    if (g.core <= 0) return;
    const n = phaseIndex === 1 ? 5 : 2;
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + variant * 1.1;
      const rr = g.inner * w * 0.55 * Math.sqrt((i + 0.4) / n);
      px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr,
        g.core * w * (1.2 - 0.3 * (i / n)), E_HOT);
    }
  };
}

// Debris chunk: the small fleck the kill throws, and the dark one it has
// cooled to by the time the fire is out. Swapping between them is what used
// to be `opacity = 1 - t`.
//
// R28: BIASED TO ORANGE/AMBER, NOT PURE RED-AND-WHITE. The old chunks were a
// white-over-red hot fleck cooling to red-over-dark-red, and a wide field of
// them read as "red confetti sprayed across the sky" (R28 judge #1 gap,
// confirmed by the TL looking). The arcade's post-fireball flecks are
// FIRE-COLOURED — gold/orange, with only a few dark-red fringe flecks, never a
// uniform red field and never a bright white speck. So the hot chunk is now
// gold-over-orange and the cooled one amber-over-deep-red (E_DEEP is the dark
// fringe the task allows "a few of"). Every colour is a measured member of the
// fireball palette, so the spray stays inside the same ladder the fireball
// snaps to and costs the set-cardinality gate nothing new.
export const CHUNK_PALETTE = [E_GOLD, E_AMBER, E_ORANGE, E_DEEP, E_RIM];
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
// Indexed [phase][arrangement], 3 arrangements per phase. Phase 0 is the
// fireball and cycles through the three lobe arrangements as it boils; phases
// 1 and 2 cycle through three BREAK-UP variants, which boil the same way —
// the arcade's spray is a different scatter on every frame, not one frozen
// star that scales (ARC-residue-origin.png, consecutive frames).
function bursts() {
  burstTextures ??= [
    ARRANGEMENTS.map((a) =>
      makePixelTexture(drawBurst(a, 0), BURST_PX, BURST_PX, { palette: EXPLOSION_PALETTE })),
    [0, 1, 2].map((v) =>
      makePixelTexture(drawBreakup(v, 1), BURST_PX, BURST_PX, { palette: EXPLOSION_PALETTE })),
    [0, 1, 2].map((v) =>
      makePixelTexture(drawBreakup(v, 2), BURST_PX, BURST_PX, { palette: EXPLOSION_PALETTE })),
  ];
  return burstTextures;
}

// Measurement-only accessors for tools/fx-probe.mjs. The probe audits the
// authored canvases, so it needs the texture arrays themselves rather than
// whatever the field happens to be showing.
export const burstTexturesForProbe = () => bursts();
export const chunkTexturesForProbe = () => chunks();

function chunks() {
  chunkTextures ??= [
    // hot: gold over orange. cooled: amber over deep-red (the dark fringe).
    makePixelTexture(drawChunk(E_GOLD, E_ORANGE), 4, 4, { palette: CHUNK_PALETTE }),
    makePixelTexture(drawChunk(E_AMBER, E_DEEP), 4, 4, { palette: CHUNK_PALETTE }),
  ];
  return chunkTextures;
}

// ---------------------------------------------------------------------------
// R20 — WHITE-HOT CORES FOR THE FLANK SPRAY BALLS. Read the R19 note above
// FLANK_OFFSET first; this closes the one tell it left open.
//
// THE GAP (judging/R19/judge-report.md, R20 gap 4): R19 widened the kill to a
// ~34 %W horizontal spray with flanking smoke — the right SHAPE — but the
// flanking puffs it throws are ORANGE SMOKE ONLY. The arcade's spray balls each
// carry a WHITE-HOT CORE: a bright value-maxed centre the orange wraps, the
// same hot centre the central fireball has (CORE_MASK) only smaller and
// scattered to the flanks. Without it the wide spread reads as orange cloud
// where the arcade reads as a cluster of little detonations.
//
// WHY A SEPARATE SPRITE AND NOT A RECOLOURED SMOKE PUFF. The flank puff is a
// SmokeField 'kill' puff, and its palette is the R10-settled kill-smoke orange
// the RESIDUE also uses — recolouring it would move the settled residue too,
// and the smoke itself is measured orange on daylight (ledger row 12's defect:
// do not author white daylight smoke out of a night frame). So the core is its
// OWN brief sprite dropped at the puff centre: a small white-hot blob
// (E_HOT -> E_YELLOW -> E_GOLD -> E_ORANGE) that flashes with the fire and is
// gone inside ~0.15 s, leaving the orange smoke to stand — which is the arcade's
// own order (the white-hot fraction is a flash; the orange is the residue). It
// is NOT taller and NOT wider than the puff it sits in (gap 4 is explicit —
// this is interior COLOUR, not size) and it never touches the central fireball,
// the chunks, or the smoke palette.
//
// OPAQUE FOR ITS WHOLE LIFE, LIKE THE FIREBALL AND THE CHUNKS, AND IT COOLS BY A
// TEXTURE SWAP, NOT AN ALPHA FADE. Measured on the ?combatexpl ROI, an
// alpha-faded core lifts the frame's off-ladder channel values the same way the
// fireball's old alpha fade did (the note at the fireball's `opacity = 1`): a
// hot blob at an arbitrary alpha over sky and over the orange puff paints a
// fresh continuum. So the core has TWO textures — a HOT one (white-cored) and a
// COOLED one (gold/amber/orange, no white) — and swaps hot -> cooled partway,
// exactly as the debris chunks cool chunkTex[0] -> chunkTex[1]. The cooled core
// is the smoke's own orange family, so when it is removed at life end it is
// indistinguishable from the puff it sat in and there is no bright pop.
//
// NO PRNG DRAW: spawned from the same _spawnFlankSmoke the flank puff is, whose
// per-side values are a pure function of the burst rotation — the shared
// combat.js stream must not move (CLAUDE.md, "Shared PRNG stream sequencing").
const HOT_CORE_PX = 16;
// `cool` swaps the hot interior (white/yellow) for the orange family so the
// blob reads as a cooling ball that melts into the smoke; the ragged outline is
// identical so the swap does not jump.
function drawHotCore(variant, cool) {
  return (ctx, w, h) => {
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const R = w / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const ang = Math.atan2(dy, dx);
        // A two-lobe deterministic perturbation so the blob is a RAGGED hot
        // patch, not a clean disc (REFERENCE.md: the arcade's near-white is
        // "one ragged mass", never a circle), and so the two flank cores — fed
        // variant 0 and 1 — are not mirror-identical.
        const wobble = 1 + 0.16 * Math.sin(ang * 3 + variant * 2.2)
                         + 0.09 * Math.cos(ang * 2 - variant * 1.3);
        const r = (Math.hypot(dx, dy) / R) * wobble;
        let fill = null;
        if (!cool) {
          if (r < 0.34) fill = E_HOT;          // white-hot centre
          else if (r < 0.54) fill = E_YELLOW;
          else if (r < 0.74) fill = E_GOLD;
          else if (r < 0.92) fill = E_AMBER;
          else if (r < 1.0) fill = E_ORANGE;   // blends into the orange smoke
        } else {
          if (r < 0.40) fill = E_GOLD;         // no white: cooled
          else if (r < 0.70) fill = E_AMBER;
          else if (r < 1.0) fill = E_ORANGE;
        }
        if (!fill) continue;
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  };
}
// { hot: [v0, v1], cool: [v0, v1] }.
let hotCoreTextures = null;
function hotCores() {
  hotCoreTextures ??= {
    hot: [0, 1].map((v) =>
      makePixelTexture(drawHotCore(v, false), HOT_CORE_PX, HOT_CORE_PX, { palette: EXPLOSION_PALETTE })),
    cool: [0, 1].map((v) =>
      makePixelTexture(drawHotCore(v, true), HOT_CORE_PX, HOT_CORE_PX, { palette: EXPLOSION_PALETTE })),
  };
  return hotCoreTextures;
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
// Life fractions at which the fire steps down a phase. R11: SIX ticks, then
// five, then five — the ball, the burst, the spray.
//
// Six and not five because phase 0 is now the only phase that is a lobe
// cluster, so the whole-event area maximum lives inside it and `t_rise` is
// bounded by its length: the sprite's first tick is not rendered (the kill
// spawns after that frame's draw), so a 5-tick phase 0 can rise over at most
// four frames and a 6-tick one over five. See the `grow` note in update().
//
// The boundaries also place the RE-FLARE. Phase 1 runs +100 to +183 ms of a
// 267 ms life, and the arcade's white-hot fraction peaks at +100 to +133 ms
// on three kills of four (judge-report §1.4). The core is in phase 1
// (BREAKUP[0].core) precisely so that it lands there.
//
// The area decay the arcade has comes mostly from HERE rather than from
// `grow`: phase 1 is a burst and phase 2 a spray, so the fire-coloured area
// collapses while the mass itself keeps expanding, which is what a real
// fireball turning into smoke does.
const DECAY_FROM = 6 / 16;
const DECAY_MID = 11 / 16;

// Debris outlives the fire. It used to share LIFE_S, so shortening the fire
// by 3x would have taken the chunks with it and the kill would throw nothing.
// MUST STAY ABOVE LIFE_S (0.267): the entry is retired on this clock, and the
// residue is spawned on the fire's. Drop it below LIFE_S and the kill silently
// stops leaving smoke.
//
// R28: 0.45 -> 0.30. At 0.45 s with the old fast speeds the flecks flung to
// ~0.65 screenW (~4x the fireball radius) and lingered there as a wide confetti
// field. 0.30 s is just above LIFE_S so the residue still spawns, and together
// with the slower R28 speeds (see spawn()) it keeps every fleck a SHORT spike
// near the fireball rim rather than a chunk sailing off across the sky.
const CHUNK_LIFE_S = 0.30;

// The residue. See the KILL SMOKE block in effects/smoke.js for the arcade
// measurement behind the palette; these are the sizes and the life.
//
// R11, RE-SIZED AGAINST A DIFFERENT OBJECT. R10 sized these against a plume
// measured at 7.20 % of the frame which turns out to be the GROUND-IMPACT
// column, not the post-air-kill ball (smoke.js has the crops). The ball
// itself, measured on an isolated kill over open sky at 60 Hz, has a bounding
// box of 146x138 and 168x156 px on a 1028-wide frame — 14.2 % and 16.3 % of
// frame WIDTH, at ages of about 0.09 s and 0.17 s after the fire goes out.
//
// So three puffs growing 0.085 -> 0.145 of frame width with a 0.030 offset
// span roughly 0.175 W at the end of their life, against a measured
// 0.142-0.163 W at a third of it. The offset is 0.030 and not R10's 0.060
// because at 0.060 the three puffs read as THREE BALLS where the arcade has
// one lumpy mass (OURS-before-after-FINAL.png at +233 ms, before and after).
const SMOKE_PUFFS = 3;
const SMOKE_LIFE_S = 0.9;
const SMOKE_FRAC_START = 0.085;
const SMOKE_FRAC_END = 0.145;

// ---------------------------------------------------------------------------
// R19 — THE WIDE, FLAT, FLANKED BLAST. Read this before touching the flank
// smoke or the debris below.
//
// THE GAP (judging/R18/judge-report.md gap 2, corroborated by the polish
// lane's scale-matched montage judging/R18/polish/fireball-scale-ours-vs-
// arcade.png): ours is NOT short and its core is NOT small — measured
// ~19 %W x 24 %H at peak against the arcade core's 15.6 %W x 22.8 %H, i.e.
// comparable-or-bigger. What the arcade kill has that ours did not is WIDTH:
// its total blast spans ~37.8 %W as a FLAT HORIZONTAL DEBRIS SPRAY with SMOKE
// PUFFS FLANKING the fire, where ours was a compact, near-radial puff-cluster
// ~32 %W x 32 %H. So this is a WIDTH + DEBRIS change, explicitly NOT a height
// one (do not inflate vertically — the height is measured fine) and NOT a
// colour one (R10 settled the palette; the flank smoke reuses the measured
// KILL_SMOKE palette, no new hue).
//
// WHY THE FIX LIVES OUT HERE AND NOT IN THE BURST TEXTURE. drawBurst /
// drawBreakup are tuned against two DIMENSIONLESS shape statistics and a
// palette ladder that three rounds fought over, and the burst sprite is given
// a RANDOM image-plane rotation per kill (spawn(), below) — so any "flat
// horizontal" baked into the texture would be sheared to a random angle on
// screen. The width is therefore built from elements that live in WORLD space
// and so read horizontal on screen regardless of the burst's rotation:
//   * the debris chunks, re-aimed into a tight cone about the screen x axis;
//   * two flank smoke puffs thrown left and right of the fire.
// The central fireball — the part the judge measured as already right — is
// left exactly as it was.
//
// THE FLANK SMOKE IS ORANGE, NOT WHITE, AND THAT IS A MEASURED DECISION. The
// arcade montage the 37.8 %W figure comes from is a NIGHT kill (black sky) and
// its flanking puffs read white. The one unambiguous DAYLIGHT kill in this
// repo (the isolated stage-1 air kill at longplay t=102.3-102.6,
// tools/out/effects-r11/ARC-residue-origin.png) throws NO white smoke at all —
// its residue is the saturated ORANGE ball smoke.js's KILL_SMOKE palette was
// measured from. Authoring white daylight smoke out of a night frame is
// REFERENCE ledger row 12's defect exactly (and the same trap the PHASES note
// above cites), so the flank puffs reuse the measured daylight orange. On a
// night stage the KILL palette is what it is; the shape — two puffs flanking —
// is the part that is stage-independent and is what the gap named.
//
// SIZES solved for the ~37.8 %W target: a puff centred FLANK_OFFSET from the
// blast centre with a half-width ~FLANK_FRAC_END/2 reaches
// 0.115 + 0.130*0.94/2 = ~0.18 of frame width per side -> ~36 %W tip to tip,
// overlapping the central ~+-10 %W fire into one continuous lumpy mass rather
// than reading as three separate balls (the failure _spawnSmoke's 0.030 offset
// note already paid for).
const FLANK_OFFSET = 0.115;      // each side, screen-width fraction from centre
const FLANK_FRAC_START = 0.090;
const FLANK_FRAC_END = 0.130;
const FLANK_LIFE_S = 0.42;        // spans the fire (LIFE_S 0.267) and a little past
// Debris chunk on-screen size, screen-width fraction. R19: 0.017 up from 0.012
// so the sideways streak READS as debris rather than as a dusting of single
// texels; still a handful of pixels, so the set-cardinality gate is unmoved.
const CHUNK_FRAC = 0.017;

// R20: the white-hot core dropped at each flank puff centre. START->PEAK is a
// quick flash out to roughly half the puff's width (FLANK_FRAC_END 0.130), so
// the core is a hot CENTRE the orange wraps, never a ball as wide as the puff.
// HOT_CORE_LIFE_S is well inside FLANK_LIFE_S (0.42) so the orange outlives the
// core — the arcade's order, a white flash leaving orange residue.
const HOT_CORE_FRAC_START = 0.040; // screen-width fraction at birth
const HOT_CORE_FRAC_PEAK = 0.058;
const HOT_CORE_LIFE_S = 0.15;

export class ExplosionField {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.live = [];
    this.pool = [];
    this.chunkPool = [];
    // R20: the flank spray balls' white-hot cores (see drawHotCore). Their own
    // pool and own live list because they outlive the burst sprite but die well
    // before the flank smoke, so neither existing clock fits them.
    this.cores = [];
    this.corePool = [];
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

  _acquireCore() {
    if (this.corePool.length) return this.corePool.pop();
    // renderOrder 22: above the burst (20), chunks (21) and the kill smoke
    // (SmokeField uses 6) so the hot centre sits on top of its orange puff.
    const sprite = makeBillboard(hotCores().hot[0], 1);
    sprite.renderOrder = 22;
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
      // R28: COMPACT RADIAL SPIKES, replacing R19's WIDE HORIZONTAL SPRAY.
      //
      // R19 aimed these into a wide flat +-0.4 rad HORIZONTAL cone at
      // 0.55-1.45 screenW/s and let them live 0.45 s, so they flung to ~0.65
      // screenW — roughly 4x the fireball radius — and read as "red confetti
      // sprayed across the sky" (R28 judge #1, confirmed by the TL looking).
      // The R19 width was tuned to a NIGHT arcade kill; the daylight reference
      // (reference/ab2-arcade-huge-explosion.jpg) is a COMPACT rounded fireball
      // whose debris is SHORT fire-coloured spikes radiating just past the rim,
      // and the R24 recalibration makes that LOOK outrank the width statistic.
      //
      // So: an EVEN radial angle (short spokes all round the mass, which with
      // the baked texture spikes reads as one spiky fireball) and a MUCH slower
      // speed, which with the shorter CHUNK_LIFE_S (0.30 s) holds every fleck
      // inside ~1.1x the fireball radius (max travel 0.62*0.30 = 0.186 screenW
      // against a peak fireball radius ~0.165 screenW).
      //
      // EXACTLY the same two rng() draws per chunk as R19, and the same `n`:
      // combat.js spawns from the SHARED PRNG stream (combat.js ~L1411), and
      // CLAUDE.md's "Shared PRNG stream sequencing" bug is adding or dropping a
      // draw. Only the MEANING of these two draws changed.
      const a = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.8; // even spokes + jitter
      const sp = (0.22 + rng() * 0.40) * perSec;             // 0.22..0.62 screenW/s
      debris.push({
        sprite: c,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
      });
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

    // R19: the flank smoke is thrown NOW, concurrent with the fire (the arcade
    // blast's flanking puffs sit beside the fireball, not after it — they are
    // what makes the kill read ~2x wide). Derived from the burst rotation, no
    // PRNG draw — same rule as _spawnSmoke.
    this._spawnFlankSmoke(position, depth, scale, sprite.material.rotation);
  }

  // Two orange/peach smoke puffs thrown LEFT and RIGHT of the fire, so the
  // blast reads as a wide flat mass with smoke flanking it rather than a
  // compact vertical puff. See the R19 note above FLANK_OFFSET for why these
  // are orange on daylight (measured) and why the width lives out here rather
  // than in the rotation-randomised burst texture. NO PRNG DRAW: the shared
  // stream combat.js spawns from must not move, so the per-puff variation is a
  // pure function of the burst rotation, exactly as _spawnSmoke derives its
  // jitter.
  _spawnFlankSmoke(position, depth, scale, rot) {
    const sScale = Math.min(scale, 1.6);
    const off = this.space.worldWidthFor(FLANK_OFFSET * sScale, depth);
    const dy = this.space.worldWidthFor(0.02 * sScale, depth);
    for (const side of [-1, 1]) {
      const p = position.clone();
      p.x += side * off;
      // A small deterministic vertical stagger so the two puffs are not
      // mirror-identical; keeps the mass lumpy without a draw.
      p.y += (side === 1 ? Math.sin(rot) : Math.cos(rot)) * dy;
      this.smoke.spawn('kill', p, depth, {
        life: FLANK_LIFE_S * (0.85 + 0.3 * (0.5 + 0.5 * Math.sin(rot * 2 + side))),
        fracStart: FLANK_FRAC_START * sScale,
        fracEnd: FLANK_FRAC_END * sScale,
      });
      // R20: a white-hot core at the SAME centre as the puff. variant 0/1 by
      // side so the two cores are not identical; no PRNG draw.
      this._spawnHotCore(p, depth, sScale, side === 1 ? 1 : 0);
    }
  }

  // One white-hot core sprite dropped at a flank puff's centre. See the R20
  // note above drawHotCore for why this is a separate, brief sprite rather than
  // a recolour of the settled kill smoke.
  _spawnHotCore(position, depth, sScale, variant) {
    const sprite = this._acquireCore();
    sprite.position.copy(position);
    sprite.material.map = hotCores().hot[variant];
    sprite.material.opacity = 1;
    sizeSprite(sprite, this.space.worldWidthFor(HOT_CORE_FRAC_START * sScale, depth));
    this.scene.add(sprite);
    this.cores.push({ sprite, age: 0, depth, sScale, variant });
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
    const spread = this.space.worldWidthFor(0.030 * sScale, e.depth);
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

    // R20: the flank white-hot cores. A quick flash — grow START->PEAK in the
    // first third, hold, then COOL by a texture swap (hot -> cooled orange) so
    // the hot centre blooms and melts into the orange puff. Opacity stays 1 (see
    // the drawHotCore note): the cool texture is the smoke's own orange family,
    // so removal at life end is invisible.
    const coreTex = hotCores();
    for (let i = this.cores.length - 1; i >= 0; i--) {
      const c = this.cores[i];
      c.age += dt;
      const t = c.age / HOT_CORE_LIFE_S;
      if (t >= 1) {
        this.scene.remove(c.sprite);
        this.corePool.push(c.sprite);
        this.cores.splice(i, 1);
        continue;
      }
      const grow = Math.min(1, t / 0.33);
      const frac = HOT_CORE_FRAC_START + (HOT_CORE_FRAC_PEAK - HOT_CORE_FRAC_START) * grow;
      sizeSprite(c.sprite, this.space.worldWidthFor(frac * c.sScale, c.depth));
      c.sprite.material.map = t < 0.55 ? coreTex.hot[c.variant] : coreTex.cool[c.variant];
      c.sprite.material.opacity = 1;
    }
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
          sizeSprite(c.sprite, this.space.worldWidthFor(CHUNK_FRAC, e.depth));
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
      // Up in FOUR TICKS, then keep expanding. R10: the pre-R10 form reached
      // full size in 0.135 s and then SHRANK 12 % across the rest of the
      // life, which is the wrong sign — the arcade's mass keeps growing while
      // its fire-coloured fraction collapses into the phases below. Expanding
      // while the bands cool is what makes the thing read as a detonation
      // turning into smoke rather than as a sprite being switched off.
      //
      // R11, TWO TICKS -> FIVE AND EASED, and this is a consequence of the
      // break-up rather than a retune of it. The decay phases now hold far
      // less fire-band area than the old recoloured ball did (r9 sees
      // E_ORANGE, E_AMBER and E_GOLD and neither red), so the whole-event
      // area MAXIMUM moved back off tick 5 onto tick 3 and `t_rise` fell to
      // 0.050 s — UNDER the arcade's measured 0.067-0.117 s.
      //
      // WHICH MEANS THE OLD BUILD PASSED t_rise FOR THE WRONG REASON, and it
      // is worth saying so because the number did not move when the defect
      // did: its 0.083 s came from phase 1 carrying MORE fire-band area than
      // phase 0 (series 1.68 -> 1.99 -> 2.02 across the phase boundary), i.e.
      // from the decay being brighter than the flash. That is the plateau
      // R10 removed, measured from the other end.
      //
      // The arcade's own fireball EXPANDS before it bursts — event D's masked
      // area runs 21 / 22 / 28 / 30 / 36 / 37 / 45 / 48 % of its ROI over
      // eight consecutive frames, event F's 4.4 / 5.4 / 6.6 / 7.3 / 9.6 /
      // 10.5 % over six — so a four-tick rise is the faithful shape and not
      // just the shape that lands the statistic.
      //
      // The 0.65 EXPONENT is the second half and it buys `n60`: a linear ramp
      // puts only two frames within 60 % of the peak (arcade 3-8) because the
      // area goes as grow^2 and a linear grow spends its first ticks far
      // below threshold. Easing out gives 3. Measured every way in the same
      // harness, same seed, same window: `?combatexpl=1&seed=1`, --event
      // 66,104, 60 Hz consecutive, judging/R10/envelope_r10.py:
      //
      //   ramp            t_rise   w60  n60  r100   life10
      //   2/16 linear     0.050    3    3    0.161  15
      //   4/16 linear     0.050    2    2    0.168  15
      //   5/16 linear     0.067    2    2    0.138  15
      //   5/16 ^0.65      0.067    3    3    0.138  15   <- shipped
      //   arcade, n=4     .067-.117 2-8  3-8  .036-.157  8-18
      const grow = t < 5 / 16 ? 0.45 + 0.55 * (t / (5 / 16)) ** 0.65 : 1.0 + (t - 5 / 16) * 0.21;
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
        sizeSprite(c.sprite, this.space.worldWidthFor(CHUNK_FRAC, e.depth));
        // Same rule, two colours instead of a ramp: the chunk cools to dark
        // red rather than fading out. 4x4 texels each, so this is a handful
        // of pixels — and a handful of pixels is exactly what a set-cardinality
        // gate charges full price for.
        c.sprite.material.map = chunkTex[t < DECAY_FROM ? 0 : 1];
        c.sprite.material.opacity = 1;
      }
    }
  }

  // TRUE WHILE ANY FIRE OR RESIDUE FROM ANY LIVE SPAWN IS STILL DRAWING.
  //
  // Shipped for `src/game/flow/deathSequence.js` (R11, at the TL's
  // instruction) so a death phase can end when its effect ends rather than on
  // a constant. The constants it replaces were timed against a 0.75 s
  // fireball three rounds ago, and R10's effects lane wrote down exactly what
  // would happen next: *"`FIREBALL_S` and `STARBURST_S` are no longer matched
  // to the thing they are waiting for. They happen to be covered now. If
  // either the fire or the smoke life moves again, the cover goes with it,
  // and the right fix is for the phase to end when the effect does rather
  // than on a constant that remembers a value from three rounds ago."*
  // Measured a round later at 60 Hz: 0.200 s of empty sky at the end of
  // `starburst` (judging/R11/lane-effects.md §4).
  //
  // THE THREE PROPERTIES THE FLOW LANE ASKED ABOUT, each answered rather than
  // asserted:
  //
  // 1. **DOES IT GO FALSE? YES, ON A BOUND — PROVIDED `update(dt)` KEEPS
  //    BEING CALLED.** Every registration drains on a positive clock and
  //    nothing re-arms it: a `live` entry is spliced at `age >= CHUNK_LIFE_S`
  //    (0.45 s) and each residue puff is retired by `SmokeField.update` at
  //    `age >= life`, where `life` is `SMOKE_LIFE_S * (0.82 + 0.18*(1+sin x))`
  //    and therefore lies in **0.738-1.062 s**, strictly positive for every x.
  //    The residue is spawned once, at fire-out, on a `fireOut` latch that is
  //    never cleared, so a spawn cannot re-enter the smoke path.
  //    **Worst case from `spawn()` to false: LIFE_S 0.267 + 1.062 = 1.329 s by
  //    the arithmetic, and MEASURED at 1.333 s** — one 60 Hz tick, which is
  //    the quantisation — over 24 spawn rotations driving the whole range of
  //    the life jitter, at scale 1 and at `deathSequence`'s scale 2.7.
  //    **That is the number to put the flow lane's ceiling above.**
  //    THE ONE PATH WHERE IT DOES NOT GO FALSE is a caller that stops ticking
  //    us: both arrays drain only inside `update(dt)`, so a state that hides
  //    the field without updating it holds `busy()` true indefinitely.
  //    `clear()` resolves it immediately and is the correct call on a flow
  //    transition. Stated because the TL asked for the leak paths by name.
  //
  // 2. **DOES IT COUNT RESIDUE, NOT JUST FIRE? YES, AND IT HAS TO.** On the
  //    measured death the last FIRE frame is t = 2.967 and the last frame
  //    with anything on screen is t = 3.817 — 0.85 s of the cover is residue
  //    alone. A fire-only predicate would have reported idle for most of the
  //    phase it is meant to hold open.
  //    `this.smoke` is this field's OWN `SmokeField` and holds nothing but
  //    kill residue (see the constructor note), so missile trail puffs — which
  //    live in `combat.js`'s separate field — cannot hold this true. That
  //    isolation is why the accessor can be this simple.
  //
  // 3. **IS IT CHEAP AND PURE? YES.** Two array-length reads, O(1), no
  //    allocation, no mutation, no PRNG draw. Call it every tick. It is NOT a
  //    measurement hook and does not behave like `__combatDebug()`, which
  //    consumes a draw from the shared stream.
  //
  // ALL THREE ARE MEASURED, NOT ASSERTED: `node judging/R11/busy_control.mjs`,
  // **10/10**, driving the real `ExplosionField` and the real `SmokeField`
  // (scene and space stubbed, because the drain is what is under test). It
  // pins: idle before a spawn; TRUE on the spawn tick before any update;
  // 50 calls change nothing; the residue is actually reached; it goes false at
  // 1.133 s on the nominal spawn with a **0.867 s residue-only window** after
  // the fire ends at 0.267 s; the worst case over 24 rotations is 1.333 s at
  // both scales; and `clear()` resolves it immediately.
  busy() {
    return this.live.length > 0 || this.smoke.live.length > 0 || this.cores.length > 0;
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
    for (const c of this.cores) {
      this.scene.remove(c.sprite);
      this.corePool.push(c.sprite);
    }
    this.smoke.clear();
    this.live.length = 0;
    this.cores.length = 0;
  }
}

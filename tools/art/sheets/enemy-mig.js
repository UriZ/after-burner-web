// enemy-<livery>-<aspect>.png -- 64x32, 5 bank frames each.
//
// ========================= R11 REDRAW ==================================
// The owner, twice, in their own words: "the enemy jets look very bad. this
// is a blocker." The R10 judge ranked it first of ten. The R10 art critique
// measured the defect: enemy-grey-head.png is 5.7 % of pixels darker than
// L=80 where the arcade's equivalent is 25-34 %, its head-on silhouette is a
// drooping gull with a red donut on a white mast, and its rear aspect is a
// dihedral V with an orange ball slung underneath.
//
// This is the first version of this file drawn against an ARCADE COLUMN for
// the near-aspect head-on enemy. That column did not exist until R10
// acquired it, which is why four previous rounds tuned this sheet's palette
// and never fixed its drawing.
//
// ---------------------------------------------------------------------------
// THE COLUMN, and what each half of it licenses
// ---------------------------------------------------------------------------
// SHAPE, near aspect, rolled:
//   tools/out/art-critic-r10/A-arc-headon-NATIVE-12x.png -- the arcade
//   aircraft resampled to its native-equivalent 100x64 and magnified 12x.
//   Source ab2-longplay-60fps.mp4 frame v0098 of
//     ffmpeg -nostdin -ss 127 -i <60fps> -t 4 -vsync 0 out/v%04d.png
//   stage identity read off the HUD digit (reads 2). 1028x720 = 3.2125x
//   native, so SHAPE, PROPORTION, STRUCTURE and VALUE ORDER only -- no
//   colour and no cardinality.
//
// SHAPE, mid distance, LEVEL -- this is the pose cell 2 is drawn from, and
// it is the cleanest reading in the whole column:
//   tools/out/art-critic-r10/arc-enemy-mid-4x.png. Re-measured here with
//   judging/R11/enemy_census_r11.py's geometry pass (sky = frame mode,
//   object = max-channel distance > 45, the top-right blade of a second
//   aircraft excluded by box). Native-equivalent, dividing the 4x crop of a
//   3.2125x source by 12.85:
//
//     span            73.8 n          total height      26.5 n  (2.78 : 1)
//     wing chord       4.7-5.3 n inboard, 1.9-2.2 n at the tips
//     fin              2.5 n wide, 12.8 n tall above the fuselage
//     fuselage block  ~8 n wide, 11.8 n tall, NEAR-BLACK
//     red intake      ~5 n, cream pip 2.8 n
//     near-black (L<40) 38.5 % of the aircraft, red 7.8 %
//
//   Scaled to our 64-wide cell (x0.867): height 23, wing chord 4-5 inboard
//   and 2 at the tips, fin 11 tall and 2-3 wide, fuselage 7x10, intake 4-5,
//   pip 2. Those are the numbers the draw functions below use.
//
// COLOUR, stage 1 (the `grey` livery's own stage):
//   reference/stage1-missile-salvo-t100.75.png, box x[712,800] y[238,306],
//   one rear-aspect enemy, sky = crop mode (0,158,255) L 121.8, object =
//   max-channel distance > tol. This frame is a 1028x720 upscale, so it is
//   a reading of STRUCTURE and DIRECTION, not of palette -- but a large
//   object's dark-pixel FRACTION is the sort of thing resampling blurs and
//   cannot invert. Swept over tol 25/40/60:
//
//     frac L<80   24.2 / 26.2 / 28.8 %        mean L 121.6 / 122.0 / 123.3
//     sky L 121.8  ->  dL = 0 +/- 1.5
//
//   The arcade's stage-1 enemy sits AT the sky's own luminance and a quarter
//   to a third of it is genuinely dark. It is neither a dark cut-out nor a
//   white blob. Ours was mean L 189.8, dL +67, dark 5.7 %.
//
// COLOUR, stage 2 (the `camo` livery's stage), TRUE NATIVE 320x224:
//   reference/ab2-arcade-desert.png box x[113,123] y[40,53] -- 8 colours,
//   all on the Sega ladder, 92.5 % of the aircraft in L 0-86 and 7.5 % in
//   two bright accents. Our camo sheet is already 89.7 % below L 80, so
//   camo's RAMP is left exactly as it was; only its DRAWING changes.
//
// ---------------------------------------------------------------------------
// WHY THE DARK HALF WENT MISSING -- the root cause, not just the symptom
// ---------------------------------------------------------------------------
// R8 set the grey ramp from "airframe = S<0.30 AND V>0.176, largest
// 8-connected component, eroded twice" on the t=104 stage-1 enemy and got
// 148/173/197/230/255. Both halves of that mask delete the dark:
// `V>0.176` excludes every pixel darker than L~45 BY CONSTRUCTION -- which
// is exactly the nozzle housing, the one place the same round proved the
// arcade puts its near-black -- and the double erosion then deletes the
// shaded lower edge as well. The ramp that came back was the arcade's
// AIRFRAME INTERIOR, correctly measured, and the drawing then spent all
// five of its rungs on it. That is how a sheet ends up with one black, four
// near-identical light greys and no middle.
//
// So `grey` keeps the arcade's pale interior and gets its dark mass back:
// the ramp is re-derived below from an UNMASKED census of the same class of
// subject (quintiles of the stage-1 enemy with no V floor at all).
//
// ---------------------------------------------------------------------------
// THE BANK POSES ARE A ROLL NOW, NOT A WIDTH SQUASH
// ---------------------------------------------------------------------------
// R10 critique finding 3: the five cells had bbox height pinned at 27 in all
// five poses with span 48/55/62/55/48 and cells 0 and 4 exact mirror twins.
// That is YAW -- the aircraft turning away -- not roll. A bank rotates the
// wing line: one tip rises, the other drops, the bbox gets taller, the fin
// leans with the wing, and bilateral symmetry about the vertical breaks.
// Every arcade enemy in the acquisition frames is drawn at a visible roll.
//
// Every cell below is therefore built from control points in the AIRCRAFT's
// own frame and mapped through a rigid rotation into cell space, then
// scan-converted. No cell is a resampling of another and no cell is a
// horizontal scale of another.
//
// The cell is 64x32 and that is the right shape for the extreme pose: the
// arcade's rolled near-aspect enemy has a bbox aspect of about 2:1, which is
// sin(30 deg) of its span over its span. A 60 px wing line rolled 30 deg
// needs 30 px of cell height and the tips are 2 px thick, so it fits -- but
// only just, which is why the tip chord tapers to 2 and the span is 60 and
// not 64. Measured on the built sheet: bbox height 25 / 25 / 25 / 25 / 31 px
// across the five poses and the fitted wing line lands at -29.6 / -14.9 /
// -0.0 / +14.9 / +29.5 degrees, i.e. exactly the five authored bank angles
// (judging/R11/pose_geom_r11.py).
//
// ---------------------------------------------------------------------------
// THREE SILHOUETTES, AND AN HONEST COUNT OF THEM
// ---------------------------------------------------------------------------
// Before this round all eight day sheets collapsed to FOUR drawings: the
// head sheets to two alpha planes and the rear sheets to two, with `prop`
// and `interceptor` sharing one and `grey` and `camo` sharing the other.
// A propeller type with an interceptor's silhouette is simply wrong.
//
//   'mig'    grey + camo. Straight wing bar, dark leading AND trailing edge,
//            compact near-black fuselage, one leaning fin. Drawn from the
//            arcade column above. Grey and camo SHARE this drawing on
//            purpose and it is counted as ONE drawing: the arcade's stage-1
//            white jet and its stage-2 green camo jet are the same airframe
//            in two liveries (compare arc-s1-enemy-rear2-5x.png with
//            A-arc-headon-NATIVE-12x.png).
//   'swept'  interceptor. Pronounced anhedral -- the wing line kinks DOWN
//            outboard of the root -- a longer belly and a taller, narrower
//            fin. Reads apart from 'mig' by its wing line at a glance.
//   'prop'   prop. UNMEASURED, and flagged as such: there is no arcade
//            column for a propeller type at any aspect. Straight unswept
//            wings of nearly constant chord with BLUNT tips where both jets
//            taper to a point, the propeller's swept arc drawn as a 1 px
//            ring with a hub at its centre instead of an intake, and a
//            short wide fin. Drawn from general airframe structure, NOT
//            from the arcade. See judging/R11/lane-enemy-art.md.
//
// ORIGINAL pixel art per ARCHITECTURE.md D5 -- drawn from the measurements
// and reference crops named above, no SEGA sprite data copied or traced.
import { PixelCanvas, buildStrip } from '../canvas.js';
import { ENEMY_LIVERIES, ENEMY_FAMILY } from '../palettes.js';
import { hexToRgb } from '../ladder.js';

const CELL_W = 64;
const CELL_H = 32;
// =========================== R37 POSE LADDER ================================
// Nine poses, not five. |deg| <= 30 keeps the rigid image-plane roll of the
// straight-on drawing; |deg| >= 45 is a genuinely DIFFERENT drawing — an
// OBLIQUE quarter view built from a 3D control-point projection (see
// drawOblique below). The reason is the R37 arcade pose sheet
// (judging/R37/enemy-art/arcade-poses/): at every readable size the arcade
// enemy that banks or crosses shows its PLANFORM — fuselage length on a
// diagonal, swept wings as top surfaces, fin leaning into the turn — while
// ours showed the same frontal silhouette rotated like a sticker all the way
// to the 57-degree bank clamp. The 45/57 rungs put the quarter views exactly
// where entities/enemy.js's bank signal already reaches (BANK_MAX_RAD 57 deg;
// crossers ride the clamp, gentle approaches never leave the frontal cells).
// The player sheet has used a 9-angle ladder since R7 (player-f14.js).
const BANK_ANGLES = [-57, -45, -30, -15, 0, 15, 30, 45, 57];
// Poses at or past this angle are drawn as oblique quarter views.
const OBLIQUE_MIN_DEG = 40;
// Rear-aspect sheets carry every pose TWICE: cells [0..8] with the nozzle
// glow at rest, cells [9..17] with it FLARED. Measured at 60 Hz
// (judging/R37/enemy-art/arcade-poses/flicker-tile2-t100.2.png, s1a
// f0073-f0082): the arcade afterburner glow shimmers continuously, its hot
// centre moving and resizing every 1-3 frames. Baked into the sheet rather
// than overlaid at runtime — an overlay is the R34 detached-afterburner bug
// class; the player's flame was baked into its sheet for the same reason.
const REAR_FLARE_STATES = 2;
const CX = 32;
const CY = 16;

// --- The roll ---------------------------------------------------------------
// A map from the AIRCRAFT's own frame (x along the wing, +x the right wing;
// y down the image, so +y is the belly) into cell pixels. Positive bank puts
// the right wing DOWN, which is what a right-hand roll looks like head-on.
//
// This is a rigid rotation of CONTROL POINTS followed by scan conversion, not
// a rotation of pixels: there is no resampling anywhere, so no cell can
// acquire an intermediate colour or a soft edge. (CLAUDE.md's recurring
// "Canvas2D fractional positions silently antialias chunky pixel art into
// blur" -- PixelCanvas has no blending at all, but a pixel-space rotate would
// still have produced staircase noise and duplicated runs.)
function roll(bankDeg) {
  const r = (bankDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const T = (x, y) => [CX + x * c - y * s, CY + x * s + y * c];
  T.bank = bankDeg;
  T.sin = s;
  T.cos = c;
  return T;
}

const poly = (c, T, pts, hex) => c.polygon(pts.map(([x, y]) => T(x, y)), hex);

/** A chord band of a wing, in aircraft-frame coordinates: from x0 to x1,
 *  between chord offsets yTop and yBot, where each offset may taper linearly
 *  from the root value to the tip value. */
function band(c, T, x0, x1, t0, b0, t1, b1, hex) {
  poly(c, T, [[x0, t0], [x1, t1], [x1, b1], [x0, b0]], hex);
}

/** A tapering blade (fin, prop blade, tailplane) from `root` to `tip`. */
function blade(c, T, root, tip, wRoot, wTip, hex) {
  const dx = tip[0] - root[0];
  const dy = tip[1] - root[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  poly(c, T, [
    [root[0] + nx * wRoot * 0.5, root[1] + ny * wRoot * 0.5],
    [root[0] - nx * wRoot * 0.5, root[1] - ny * wRoot * 0.5],
    [tip[0] - nx * wTip * 0.5, tip[1] - ny * wTip * 0.5],
    [tip[0] + nx * wTip * 0.5, tip[1] + ny * wTip * 0.5],
  ], hex);
}

// --- The wing ---------------------------------------------------------------
// The arcade's level head-on enemy (arc-enemy-mid-4x.png, measured above) is
// a DEAD-STRAIGHT bar whose TOP EDGE is a straight dark line across the whole
// span and whose thickness falls off from below: 5 n inboard, 2 n at the tip.
// Its value structure top to bottom is dark edge / lit surface / mid surface /
// shaded underside / dark edge, which is also the three-reading ramp R8
// measured on the stage-1 rear enemy (topmost row median V 0.953, interior
// 0.788, bottommost 0.661 -- lit above, shaded below).
//
// Drawn as five absolute rows in the aircraft frame rather than as fractions
// of a tapering chord, because a fraction of a 2 px tip chord rounds to
// nothing and the tip then loses its dark edge -- which is the one feature
// that keeps the blade reading as a blade at 12 screen px.
//
// SPAN is 60 and not 64 on purpose: see the roll note at the top of the file.
const HALF_SPAN = 30;

// WHICH EDGE IS DARK, AND WHY THE TWO ARCADE READINGS ONLY LOOK LIKE THEY
// DISAGREE. arc-enemy-mid-4x.png shows a near-black line along the TOP of the
// wing bar as well as the bottom -- but that frame is a STAGE-2 CAMO enemy
// whose whole airframe is dark, so its "dark line" is simply its own `mid`
// tone seen edge-on. On STAGE 1, measured per column over 73 columns of
// reference/stage1-missile-salvo-t100.75.png x[712,800] y[238,306] with no
// value floor and no erosion:
//
//     TOPmost airframe row    median L 174.1   (11.0 % below L 80)
//     interior                       L 132.2
//     BOTTOMmost airframe row        L  83.0   (49.3 % below L 80)
//
// Lit above, shaded below. So the bands below are assigned by ROLE, top to
// bottom highlight / mid / mid / dominant / shadow, and the LIVERY decides the
// polarity: on `grey` that paints a pale bar with a shaded underside, and on
// `camo` -- whose `mid` is L 56 and whose `highlight` is L 61 -- the same
// program paints a dark bar with dark edges, which is what the stage-2 frame
// shows. One drawing, two correct readings, rather than a drawing tuned to
// whichever frame was opened last.
// CHORD 6 at the root, 2 at the tip, thinned entirely FROM BELOW so the top
// edge is a straight line tip to tip -- which is what the arcade's bar does
// and what makes it read as one wing rather than two stuck-on triangles.
// 6 : 2 on a 60 px span is the arcade's 5.3 n : 1.9 n on 73.8 n to within half
// a pixel. The bands are stacked DOWN from the straight top edge, so each one
// automatically stops where the chord runs out.
function wing(c, T, p, { span = HALF_SPAN, root = 4, chord = 6, tipChord = 2,
  anhedral = 0, dihedral = 0, bandHex = null } = {}) {
  for (const side of [1, -1]) {
    const xr = side * root;
    const xt = side * span;
    const drop = anhedral - dihedral;
    const top = (x) => -2 + (drop * (Math.abs(x) - root)) / (span - root);
    const at = (f) => {
      const x = side * (root + (span - root) * f);
      return [x, top(x)];
    };
    const tr = top(xr);
    const tt = top(xt);
    const strip = (f, y0, y1, hex) => {
      const [xe, te] = at(f);
      band(c, T, xr, xe, tr + y0, tr + y1, te + y0, te + y1, hex);
    };
    // Planform.
    band(c, T, xr, xt, tr, tr + chord, tt, tt + tipChord, p.mid);
    // Lit upper edge, 1 px, tip to tip -- the arcade's topmost airframe row.
    strip(1, 0, 1, p.highlight);
    // ... and the outer 45 % of that edge one rung brighter. The arcade's
    // near-aspect enemy carries a 1 px highlight along ONE edge of every
    // blade, and the thinnest part of a blade is also its palest (the same
    // thing R7 found on the arcade player's wingtip). `specular` lands at
    // 4-8 % of the sheet, which is the order the arcade spends its brightest
    // value at (0.7 % on the player's native desert crop, 2.5-5 % on the
    // native camo enemy's two accents).
    const [xs, ts] = at(0.45);
    band(c, T, xs, xt, ts, ts + 1, tt, tt + 1, p.specular);
    // Shaded underside and the dark trailing edge, INBOARD only: the outer
    // third of the arcade's bar is one pixel of edge and nothing else.
    strip(0.5, chord - 2, chord - 1, p.dominant);
    // R25: a 1px dark trailing edge the WHOLE span, not just the inner third.
    // The old wing had a bright top edge and no dark bottom edge outboard, so
    // the wing faded into the sky and read as a flat grey triangle. A crisp
    // dark line tip-to-tip is what makes it read as a wing against the sky --
    // lit above, dark below, the same lit/dark structure that lifted the
    // player jet out of "flat". Drawn from the straight top edge down, so it
    // tracks the real trailing edge as the chord tapers.
    band(c, T, xr, xt, tr + chord - 1, tr + chord, tt + tipChord - 1, tt + tipChord, p.shadow);
    strip(0.22, chord - 1, chord, p.shadow);
    // R37: camo band dashes along the bar (rear aspect only — callers pass
    // bandHex there). The stage-1 arcade enemy's wing tops carry GREEN bands
    // over the white-grey airframe, read edge-on from astern as green/white
    // alternation along the span (judging/R37/enemy-art/arcade-poses/
    // pose-planform-t115.25.png; four stage-1 frames corroborate). Inboard
    // 70 % only: past that the chord has tapered to the 2 px tip where a
    // dash would eat the highlight edge that keeps the blade reading.
    if (bandHex) {
      for (const f0 of [0.10, 0.34, 0.58]) {
        const [xa, ta] = at(f0);
        const [xb, tb] = at(f0 + 0.14);
        band(c, T, xa, xb, ta + 1, ta + 3, tb + 1, tb + 3, bandHex);
      }
    }
  }
}

// --- Shared features --------------------------------------------------------
// TWIN ENGINES -- the arcade enemy's defining, scale-proof anchor (R27).
// The owner, looking at the shipped build: the enemy jets "read as ambiguous
// blobs". The cause, read straight off reference/stage1-level-flight-t116.png
// and judging/R27/crop_arcade_enemy.png: the arcade stage-1 enemy is a
// TWIN-ENGINE jet whose two BLACK engine nacelles sit side by side at the body
// centre, each cored by a bright ORANGE afterburner glow. That black-and-orange
// cluster is the one feature that survives downscaling to 3-18 % of screen
// width -- a high-contrast mass, not a thin grey line. Ours had a SINGLE central
// disc with one orange dot, so scaled down it was a grey speck with a pin of
// colour: the "blob" the owner saw.
//
// Both engines are placed in the AIRCRAFT frame (x along the wing, +x right)
// and mapped through the roll T, so the pair rolls and leans with the bank like
// the rest of the airframe -- no cell is a pixel-rotation, so no soft edges.
// The two housings overlap slightly at the centreline into one continuous dark
// engine mass (which is how the arcade reads at range), while the two hot cores
// stay separated by a dark gap so the TWIN-ness reads at medium size. Hard
// discs only (PixelCanvas does not blend) -- the engines never antialias to mush.
const ENGINE_DX = 2.8; // half the nacelle spacing, aircraft frame

// Head-on: twin intakes under the nose. R31: the old version drew two red
// discs each with a bright CREAM pip -- two eyes with pupils, side by side and
// bilaterally symmetric, which reads as a FACE at game size (the exact
// insect-face mistake the player jet's nose had, owner-flagged). The fix is to
// make the intakes read as recessed slots in a solid dark nose rather than as
// eyes: one dark intake BAND across the nose, two DIM red glints in it and NO
// bright pupil, and the cockpit canopy (drawn above) gives the nose a clear
// "top", which is what finally kills the face -- a jet has a canopy over its
// intakes, a face does not.
function noseIntake(c, T, p) {
  // Solid dark intake band across the nose -- one continuous mass, so the two
  // glints read as slots in a nose, not as two floating eyes. Mapped through T,
  // so it rolls with the airframe (no pixel-rotate, no soft edges).
  poly(c, T, [
    [-ENGINE_DX - 2.4, -2], [ENGINE_DX + 2.4, -2],
    [ENGINE_DX + 2.4, 1.4], [-ENGINE_DX - 2.4, 1.4],
  ], p.keyline);
  // R32 — ONE central red intake slot, not two symmetric discs. The two round
  // red glints read as a pair of EYES on the banking/toward-camera pose (R32
  // judge: "two red discs with dark surrounds read as eyes"). A single central
  // horizontal slot cannot read as two eyes, and it matches the arcade's own
  // single ~5px red intake (measured, header §R11). Recessed into the dark band
  // so it reads as intake geometry under the cockpit canopy, not a face.
  poly(c, T, [
    [-2.4, -1.1], [2.4, -1.1],
    [2.4, 0.3], [-2.4, 0.3],
  ], p.intakeRing);
}

// Rear: ONE afterburner. R37 REVERSES R31/R27's twin bells, on footage.
//
// R27 wrote "the arcade is two black nacelles cored by orange" and this file
// drew twin bells from it. The R37 pose sheet (judging/R37/enemy-art/
// arcade-poses/, stage identity via the HUD digit IN the frames) shows the
// opposite in every readable rear/oblique pose: pose-planform-t115.25 (dead
// astern), pose-profile-t116.0 (banking pair), pose-rearclose-t116.75 (close
// fly-past, where the bell even shows its feather segments) all carry ONE
// black bell with ONE orange core — which is exactly STATUS.md's standing
// identity rule, "the player is the twin-nozzle F-14; every enemy has one
// nozzle". The twin-orange aircraft in the frames IS the player (see
// judging/R36/look/arcade-s1/t108.png). Two side-by-side glows are also the
// bilateral two-eyes geometry behind the "face/insect" read the owner has
// rejected in four rounds — one bell kills both defects at once.
//
// Proportions from pose-planform-t115.25: dark bell mass ~0.22-0.28 of span,
// orange core ~0.11-0.13 of span, on our 60 px span -> bell r ~5.6, core
// r ~3.4. Colour from pose-rearclose-t116.75 (sampled): the core is
// RED-RIMMED orange (#a00000 ring around #f09000), not orange-on-black.
// The afterburner colours are NOT overridden at night, so the glow stays hot
// against the night sky, as the arcade's does.
//
// `flare` is the second half of the 60 Hz shimmer (REAR_FLARE_STATES above):
// the flared cell grows the core one ring and swells + recentres the hot
// pip, so alternating the two states reads as a live engine, not a lamp.
function nozzle(c, T, p, flare = false) {
  const [x, y] = T(0, 1);
  c.disc(x, y, 5.6, p.keyline);                      // the single black bell
  c.disc(x, y, flare ? 4.6 : 4.2, p.nozzleRim);      // deep-red ring
  c.disc(x, y, flare ? 3.8 : 3.2, p.nozzleCore);     // orange afterburner
  // Hot centre: small and low at rest, bigger and central when flared — the
  // pip's drift between the two states is the shimmer the footage shows.
  if (flare) c.disc(x + 0.4, y, 1.9, p.nozzleHot);
  else c.disc(x - 0.6, y + 0.5, 1.2, p.nozzleHot);
}

// A cockpit canopy on the upper fuselage spine. R31: the cue that reads the
// shape as a FIGHTER rather than an ambiguous blob, and -- head-on -- the thing
// that breaks the twin-intake bilateral symmetry so the nose stops reading as a
// face. A bright glint over a dark canopy frame, both small and sitting on the
// spine ABOVE the engine cluster, well clear of it so it never reads as a third
// core. Drawn in the aircraft frame and mapped through T like everything else.
function canopy(c, T, p, { top = -5, bot = -1 } = {}) {
  poly(c, T, [[-1.6, top], [1.6, top], [1.2, bot], [-1.2, bot]], p.keyline);
  poly(c, T, [[-1, top + 1], [1, top + 1], [0.7, bot], [-0.7, bot]], p.specular);
}

/** The fin. One rung below the wing's lit edge, with a single shaded side.
 *  R10 critique finding 2 item 3: ours was the LIGHTEST thing in the sprite,
 *  so the eye went straight to it; the arcade's is the one soft, low-contrast
 *  element and it is angled, not vertical. It leans here because it is drawn
 *  in the aircraft's frame and the whole frame rotates with the roll. */
function fin(c, T, p, { base = -5, tip = -16, lean = 1, wRoot = 4, wTip = 2 }) {
  blade(c, T, [0, base], [lean, tip], wRoot, wTip, p.mid);
  // R25: the fin reads as a proper swept stabiliser now, not a pale spike.
  // A lit leading (forward) edge and a dark trailing edge give it a top and
  // an edge -- the same one-rung-each-side modelling the wing and the player
  // tails carry. Both tracked at BOTH ends so the fin never renders forked.
  blade(c, T, [wRoot * 0.5 - 0.5, base], [lean + wTip * 0.5 - 0.5, tip],
    1, 1, p.highlight);
  blade(c, T, [-wRoot * 0.5 + 0.5, base], [lean - wTip * 0.5 + 0.5, tip],
    1, 1, p.dominant);
}

/** The fuselage, with the same lit-above / shaded-below ramp as the wing, so
 *  the two read as one lit object. NOT the darkest mass in the drawing on a
 *  pale livery: on the arcade's stage-1 enemies the body is pale grey with
 *  black PANEL LINES and the near-black is concentrated in the nozzle housing
 *  (tools/out/enemy-art-r11/s1near-B-3x.png, t = 94.8 s, HUD digit 1). The
 *  camo and prop ramps make the same program paint a dark body, which is what
 *  their stage shows. */
function fuselage(c, T, p, { halfW, top, bot, tail = 0 }) {
  poly(c, T, [[-halfW, top], [halfW, top], [halfW, bot], [-halfW, bot]], p.mid);
  poly(c, T, [[1, top], [halfW, top], [halfW, bot - 1], [1, bot - 1]], p.highlight);
  poly(c, T, [[-halfW, top], [-halfW + 1, top], [-halfW + 1, bot], [-halfW, bot]], p.dominant);
  poly(c, T, [[-halfW, bot - 2], [halfW, bot - 2], [halfW, bot], [-halfW, bot]], p.dominant);
  poly(c, T, [[-halfW, bot - 1], [halfW, bot - 1], [halfW, bot], [-halfW, bot]], p.shadow);
  if (tail) {
    poly(c, T, [[-halfW + 1, bot], [halfW - 1, bot], [1, bot + tail], [-1, bot + tail]], p.dominant);
  }
}

// --- MIG: grey + camo -------------------------------------------------------
function drawMigHead(c, T, p) {
  // Fin FIRST, so the fuselage block overlaps its root rather than the other
  // way round. R35: shortened (tip -15 -> -13) and given real lean (1 -> 2) and
  // a wider root (3.5 -> 4.2), so it reads as a swept, seated TAIL FIN instead
  // of the thin VERTICAL MAST the owner still saw against the sky -- a tall
  // thin pale upright on a 23 px aircraft is an antenna, not a tail. Compared
  // side-by-side with reference/stage1-level-flight-t116.png: the arcade
  // enemy's fin is a short raked blade seated on the rear fuselage.
  fin(c, T, p, { base: -5, tip: -13, lean: 2, wRoot: 4.2, wTip: 1.8 });
  wing(c, T, p);
  // 7 wide x 12 tall, compact and AT the wing line. The arcade's is ~8 n x
  // 11.8 n on a 73.8 n span, which is 7 x 10 on our 60 px span.
  fuselage(c, T, p, { halfW: 4, top: -6, bot: 7, tail: 2 });
  noseIntake(c, T, p);
  canopy(c, T, p, { top: -6, bot: -2 });
}

function drawMigRear(c, T, p, flare = false) {
  fin(c, T, p, { base: -5, tip: -13, lean: 2, wRoot: 4.2, wTip: 1.8 }); // R35: see drawMigHead
  wing(c, T, p, { bandHex: p.band }); // R37: green band dashes, see wing()
  // R35: slimmed (halfW 6 -> 5) so the body reads as a fuselage the engines
  // sit in, not a flat grey CRATE the width of the nacelle block. The arcade
  // enemy's body is slimmer than its engine cluster; the single black+orange
  // bell stays the loudest feature at range (R37 single-nozzle correction).
  fuselage(c, T, p, { halfW: 5, top: -5, bot: 7, tail: 3 });
  canopy(c, T, p, { top: -6, bot: -2 });
  nozzle(c, T, p, flare);
}

// --- SWEPT: interceptor -----------------------------------------------------
// Differentiated from 'mig' by its WING LINE, which is the cue that survives
// to the smallest size: the tips sit 4 px BELOW the root (anhedral), where the
// mig's bar is dead straight. Plus a taller, narrower fin and a longer belly.
function drawSweptHead(c, T, p) {
  // Taller, narrower fin than the mig keeps the interceptor distinct; R31 lifts
  // its tip width off the needle (1.6->1.8) without touching its height.
  fin(c, T, p, { base: -5, tip: -18, lean: 2, wRoot: 3, wTip: 1.8 });
  wing(c, T, p, { span: 29, root: 3, anhedral: 4 });
  fuselage(c, T, p, { halfW: 4, top: -6, bot: 10, tail: 2 });
  noseIntake(c, T, p);
  canopy(c, T, p, { top: -6, bot: -2 });
}

function drawSweptRear(c, T, p, flare = false) {
  fin(c, T, p, { base: -6, tip: -18, lean: 2, wRoot: 3, wTip: 1.8 });
  wing(c, T, p, { span: 29, root: 3, anhedral: 4, bandHex: p.band });
  fuselage(c, T, p, { halfW: 6, top: -6, bot: 8, tail: 3 });
  canopy(c, T, p, { top: -6, bot: -2 });
  nozzle(c, T, p, flare);
}

// --- PROP: prop -------------------------------------------------------------
// UNMEASURED. There is no arcade column for a propeller type at any aspect.
// GAME_SPEC.md section 4 says they exist ("silver/blue prop types, stage 2
// open") and nothing in this repo shows one at a size that can be read. What
// is drawn below is general airframe structure chosen to be unmistakably NOT
// a jet at a glance, which is the defect it exists to fix -- `prop` and
// `interceptor` shared one alpha plane until this round. It is flagged OPEN
// in judging/R11/lane-enemy-art.md and must not be treated as reproduced.
function propDisc(c, T, p) {
  // The turning blades, drawn as the ARC they sweep: a 1 px ring, not a filled
  // disc. A filled disc at this scale is R4's "bullseye" again (a 19 %-of-span
  // red ball, the single worst thing in the R4 sprite), and a blade CROSS
  // merges with the fin and the wing root into a vertical smear -- which is
  // what the first R11 draft did; cropped and looked, per the standing rule.
  // The ring crosses the wing and the fin, which is correct: the propeller is
  // in front of the whole airframe.
  const [x, y] = T(0, 0);
  c.ring(x, y, 8.6, 7.6, p.shadow);
  c.disc(x, y, 2.4, p.keyline);
  c.disc(x, y, 1.3, p.intakeRing);
}

function drawPropHead(c, T, p) {
  fin(c, T, p, { base: -5, tip: -13, lean: 0, wRoot: 5, wTip: 3 }); // short, wide
  // Straight, unswept, CONSTANT chord with square tips -- the jets both taper
  // to a point, so the blunt tip is the cue that survives to the smallest
  // size. No dihedral: the first draft raised the tips 3 px and the result was
  // a gull, which is exactly the shape R10 rank 2 exists to remove.
  wing(c, T, p, { span: 28, root: 4, chord: 5, tipChord: 4 });
  fuselage(c, T, p, { halfW: 4, top: -5, bot: 8, tail: 2 });
  propDisc(c, T, p);
}

function drawPropRear(c, T, p) {
  fin(c, T, p, { base: -5, tip: -13, lean: 0, wRoot: 5, wTip: 3 });
  wing(c, T, p, { span: 28, root: 4, chord: 5, tipChord: 4 });
  fuselage(c, T, p, { halfW: 4, top: -5, bot: 7, tail: 2 });

  // Exhaust stubs, not an afterburner: two small warm marks on the body
  // sides. The receding read has to survive (the stage opener depends on
  // it) but a prop has no nozzle bell.
  const [lx, ly] = T(-3, 2);
  const [rx, ry] = T(3, 2);
  c.disc(lx, ly, 1.5, p.keyline);
  c.disc(rx, ry, 1.5, p.keyline);
  c.disc(lx, ly, 0.9, p.nozzleCore);
  c.disc(rx, ry, 0.9, p.nozzleCore);
  propDisc(c, T, p);
}

// ======================= R37 OBLIQUE QUARTER VIEWS ==========================
// The |deg| >= 45 cells. NOT a roll of the frontal drawing: a small 3D
// control-point model (x right wing, y belly-down, z nose-forward) rolled
// about its own axis, pitched, yawed, and projected orthographically to the
// cell — then scan-converted with the same hard-pixel primitives as
// everything else (no resampling, no blending; polygon()/disc() only).
//
// What it reproduces, from the R37 arcade pose sheet:
//   * fuselage LENGTH on a diagonal — the depth cue every readable arcade
//     pose carries and no frontal cell can (pose-profile-t116.0);
//   * wing PLANFORM with camo band dashes on the top surface
//     (pose-rearoblique-t115.75: green tops while fleeing nose-up);
//   * rear aspect: the single bell + red-rimmed orange core at the tail,
//     facing the camera; head aspect: a dark nose, NO glow (the crosser at
//     the right edge of pose-s1a-t100.5 shows a dark nose and no tailpipe);
//   * the fin leaning INTO the turn.
//
// The pitch sign gives each aspect the right surface: rear poses fly
// nose-up-and-away (we see wing TOPS, as the green in the footage proves);
// head poses dive toward the player (same projection, z mirrored).
function proj3(yawDeg, pitchDeg, rollDeg, scale = 1) {
  const ya = (yawDeg * Math.PI) / 180;
  const pa = (pitchDeg * Math.PI) / 180;
  const ra = (rollDeg * Math.PI) / 180;
  const cy = Math.cos(ya), sy = Math.sin(ya);
  const cp = Math.cos(pa), sp = Math.sin(pa);
  const cr = Math.cos(ra), sr = Math.sin(ra);
  // roll about +z (body axis), then pitch about +x, then yaw about +y.
  return (x, y, z) => {
    const x1 = x * cr - y * sr;
    const y1 = x * sr + y * cr;
    const y2 = y1 * cp - z * sp;
    const z2 = y1 * sp + z * cp;
    const x3 = x1 * cy + z2 * sy;
    const z3 = -x1 * sy + z2 * cy;
    return [CX + x3 * scale, CY + y2 * scale, z3];
  };
}

function poly3(c, P, pts, hex) {
  c.polygon(pts.map(([x, y, z]) => {
    const [sx, sy] = P(x, y, z);
    return [sx, sy];
  }), hex);
}

/** Tapering blade between two PROJECTED endpoints (fin, tailplane). */
function blade3(c, P, a, b, wRoot, wTip, hex) {
  const [ax, ay] = P(...a);
  const [bx, by] = P(...b);
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  c.polygon([
    [ax + nx * wRoot * 0.5, ay + ny * wRoot * 0.5],
    [ax - nx * wRoot * 0.5, ay - ny * wRoot * 0.5],
    [bx - nx * wTip * 0.5, by - ny * wTip * 0.5],
    [bx + nx * wTip * 0.5, by + ny * wTip * 0.5],
  ], hex);
}

const mix3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// One swept wing in planform, with band dashes on the top surface.
// `geom` lets the three families keep their silhouette cues in the oblique
// cells too: sweep (tip z offset), span, tipChord fraction.
function wing3(c, P, side, p, { span = 28, sweepZ = -9, rootLe = 12, rootTe = 5,
  tipY = 0.5, tipChordF = 0.4, bandHex = null } = {}) {
  const rLe = [side * 2.5, 0, rootLe];
  const rTe = [side * 2.5, 0, rootTe];
  const chord = rootLe - rootTe;
  const tLe = [side * span, tipY, rootLe + sweepZ];
  const tTe = [side * span, tipY, rootLe + sweepZ - chord * tipChordF];
  poly3(c, P, [rLe, tLe, tTe, rTe], p.mid);
  // Lit leading edge, trailing shadow — the same one-rung-per-side modelling
  // the frontal wing bar carries.
  poly3(c, P, [rLe, tLe, mix3(tLe, tTe, 0.3), mix3(rLe, rTe, 0.3)], p.highlight);
  poly3(c, P, [mix3(rLe, rTe, 0.78), mix3(tLe, tTe, 0.78), tTe, rTe], p.shadow);
  if (bandHex) {
    for (const f0 of [0.18, 0.48, 0.78]) {
      const aLe = mix3(rLe, tLe, f0), aTe = mix3(rTe, tTe, f0);
      const bLe = mix3(rLe, tLe, f0 + 0.16), bTe = mix3(rTe, tTe, f0 + 0.16);
      poly3(c, P, [mix3(aLe, aTe, 0.25), mix3(bLe, bTe, 0.25),
        mix3(bLe, bTe, 0.75), mix3(aLe, aTe, 0.75)], bandHex);
    }
  }
}

// `family` tweaks, so the three silhouettes stay distinguishable in the
// quarter views exactly as they are in the frontal cells: the mig is the
// baseline; swept = longer belly, farther-back sweep, taller fin; prop =
// short blunt unswept wings, no afterburner, the propeller arc at the nose.
const OBLIQUE_GEOM = {
  mig: { span: 28, sweepZ: -9, tipChordF: 0.4, finTip: -10.5, nose: 26 },
  swept: { span: 27, sweepZ: -12, tipChordF: 0.3, finTip: -12.5, nose: 28 },
  prop: { span: 23, sweepZ: -1, tipChordF: 0.9, finTip: -8.5, nose: 23 },
};

function drawOblique(c, deg, p, { aspect, family, flare = false }) {
  const g = OBLIQUE_GEOM[family] ?? OBLIQUE_GEOM.mig;
  const dir = Math.sign(deg) || 1;
  const hard = Math.abs(deg) >= 55;
  const rear = aspect === 'rear';
  // z sign: rear poses fly nose AWAY (+z into the screen), head poses nose
  // TOWARD the viewer. The yaw magnitude turns the nose INTO the on-screen
  // drift for both (worked through: rear needs +dir, head needs -dir on the
  // mirrored z — one zs factor covers both).
  const zs = rear ? 1 : -1;
  // 0.86 on the hard pose: the near wingtip's projected half-height at
  // roll 42 / pitch 14 is 17.8 units against a 16-px half-cell (computed,
  // not eyeballed); 0.86 brings it to 15.3 so the raised tip renders whole
  // instead of clipping flat at the cell edge.
  const P = proj3(dir * (hard ? 38 : 24) * zs, hard ? 14 : 9,
    dir * (hard ? 42 : 30), hard ? 0.86 : 1);
  const Z = (x, y, z) => [x, y, z * zs];
  const bandHex = rear || hard ? p.band : null;

  // Far wing first (with yaw `dir`, the -dir side recedes), then fuselage,
  // then near wing over it — the occlusion order a quarter view implies.
  const wingGeom = { ...g, bandHex };
  wing3(c, (x, y, z) => P(...Z(x, y, z)), -dir, p, wingGeom);
  blade3(c, P, Z(-dir * 8.5, 0, -4), Z(-dir * 1, 0, -2), 2.5, 1.5, p.dominant);

  // Fuselage: three long faces, lit top / plain near side / shaded belly,
  // tapering to the nose; dark panel dashes down the spine (the close
  // fly-past shows them clearly).
  const nose = g.nose;
  poly3(c, P, [Z(-2.8, -2.2, -6), Z(2.8, -2.2, -6), Z(1.3, -1.0, nose), Z(-1.3, -1.0, nose)], p.highlight);
  poly3(c, P, [Z(-2.8, -2.2, -6), Z(-2.8, 2.6, -6), Z(-1.3, 1.3, nose), Z(-1.3, -1.0, nose)], p.mid);
  poly3(c, P, [Z(2.8, -2.2, -6), Z(2.8, 2.6, -6), Z(1.3, 1.3, nose), Z(1.3, -1.0, nose)], p.mid);
  poly3(c, P, [Z(-2.8, 2.6, -6), Z(2.8, 2.6, -6), Z(1.3, 1.3, nose), Z(-1.3, 1.3, nose)], p.shadow);
  for (const zd of [-2, 6, 14]) {
    poly3(c, P, [Z(-2.0, -2.1, zd), Z(2.0, -2.1, zd), Z(1.8, -1.9, zd + 1.8), Z(-1.8, -1.9, zd + 1.8)], p.dominant);
  }

  // Near wing and near tailplane over the body.
  wing3(c, (x, y, z) => P(...Z(x, y, z)), dir, p, wingGeom);
  blade3(c, P, Z(dir * 8.5, 0, -4), Z(dir * 1, 0, -2), 2.5, 1.5, p.dominant);

  // Fin, leaning into the turn (it inherits the roll through P).
  blade3(c, P, Z(0, -2.0, -3), Z(0, g.finTip, -8), 3.5, 1.6, p.mid);
  blade3(c, P, Z(0.8, -2.0, -3), Z(0.6, g.finTip + 0.5, -7.7), 1, 1, p.highlight);

  if (rear) {
    if (family === 'prop') {
      // Exhaust stubs only — a prop has no afterburner (same rule as the
      // frontal prop rear cell), plus the propeller arc at the far nose.
      const [sx, sy] = P(...Z(0, 1.2, -5));
      c.disc(sx, sy, 1.6, p.keyline);
      c.disc(sx, sy, 0.9, p.nozzleCore);
      const [nx2, ny2] = P(...Z(0, 0, nose));
      c.ring(nx2, ny2, 5.2, 4.5, p.shadow);
    } else {
      // The bell at the tail, facing the camera. Slightly smaller than the
      // dead-astern bell: seen at an angle. Same flare contract as nozzle().
      const [bx, by] = P(...Z(0, 0.6, -6.5));
      c.disc(bx, by, 4.8, p.keyline);
      c.disc(bx, by, flare ? 4.0 : 3.6, p.nozzleRim);
      c.disc(bx, by, flare ? 3.2 : 2.7, p.nozzleCore);
      if (flare) c.disc(bx + 0.4, by, 1.6, p.nozzleHot);
      else c.disc(bx - 0.5, by + 0.4, 1.0, p.nozzleHot);
    }
  } else {
    // Head aspect: dark nose, no glow. The canopy glint sits behind it on
    // the spine — the cue that reads "fighter" at a glance.
    const [nx2, ny2] = P(...Z(0, 0.2, nose));
    if (family === 'prop') {
      c.ring(nx2, ny2, 5.2, 4.5, p.shadow);
      c.disc(nx2, ny2, 1.8, p.keyline);
    } else {
      c.disc(nx2, ny2, 2.8, p.keyline);
      c.disc(nx2, ny2, 1.4, p.intakeRing);
    }
    const [cx2, cy2] = P(...Z(0, -2.0, 14));
    c.disc(cx2, cy2, 1.6, p.keyline);
    c.disc(cx2, cy2, 0.9, p.specular);
  }
}

const DRAW = {
  mig: { headOn: drawMigHead, rear: drawMigRear },
  swept: { headOn: drawSweptHead, rear: drawSweptRear },
  prop: { headOn: drawPropHead, rear: drawPropRear },
};

function paletteFor(livery, night) {
  const p = ENEMY_LIVERIES[livery];
  if (!night) return p;
  // Night: the camo band falls back to the night ramp's own shadow tone —
  // no stage-3 band colour has ever been measured (the night jets read as
  // flat blue), and reusing a ramp tone keeps the night sheets inside the
  // colour budget instead of carrying a daylight green into a night sky.
  return { ...p, ...p.night, band: p.night.shadow };
}

// --- The ramp-order invariant ----------------------------------------------
// The drawing program above assigns values by ROLE: `shadow` is the dark
// edge and the fuselage, `dominant` the shaded underside, `mid` the wing
// surface and the fin, `highlight` the lit upper surface. That only means
// the same thing on every livery if the roles are MONOTONE in luminance.
//
// They were not. Before R11 the `grey` day ramp ran
//   shadow 148 < highlight 173 < mid 197 < dominant 230 < specular 255
// and the `grey` night ramp ran shadow 29 < highlight 54 < mid 84 <
// dominant 137 < specular 195 -- i.e. the two roles the drawing uses for
// "dark edge" and "shaded underside" were the 1st and 4th BRIGHTEST rungs.
// Every other livery was already monotone, so a drawing that read correctly
// on camo, interceptor and prop inverted on the one livery the player sees
// most. Asserted here so it cannot silently come back.
function assertRampOrder(livery, p, label) {
  const L = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  const order = ['shadow', 'dominant', 'mid', 'highlight', 'specular'];
  for (let i = 1; i < order.length; i++) {
    if (L(p[order[i]]) < L(p[order[i - 1]])) {
      throw new Error(
        `[ramp] ${label}: ${order[i]} (${p[order[i]]}, L ${L(p[order[i]]).toFixed(1)}) ` +
        `is DARKER than ${order[i - 1]} (${p[order[i - 1]]}, L ${L(p[order[i - 1]]).toFixed(1)}). ` +
        'The enemy drawing program assigns value by role; a non-monotone ramp ' +
        'inverts the modelling on this livery only. See tools/art/sheets/enemy-mig.js.'
      );
    }
  }
}

/** Builds one 5-cell strip for a (livery, aspect, night) triple. The
 *  silhouette family is looked up from the livery, so callers never pick a
 *  family directly and the sheet file name fully determines the art. */
export function buildEnemySheet(livery, aspect, night = false) {
  const p = paletteFor(livery, night);
  const label = `enemy-${livery}-${aspect}${night ? '-night' : ''}`;
  assertRampOrder(livery, p, label);
  const family = ENEMY_FAMILY[livery];
  const draw = DRAW[family][aspect];
  // R37: rear sheets carry each pose twice (rest / flared glow, see
  // REAR_FLARE_STATES above): cells [0..N-1] rest, [N..2N-1] flared. Head
  // sheets have no visible tailpipe, so no flare row.
  const nPoses = BANK_ANGLES.length;
  const nCells = aspect === 'rear' ? nPoses * REAR_FLARE_STATES : nPoses;
  return buildStrip(
    CELL_W,
    CELL_H,
    nCells,
    // R8's finding is KEPT and its implementation is RETIRED, which is not
    // the same thing. The finding -- the arcade does not ring its aircraft in
    // black, it SHADES the lower edge -- survived re-measurement here
    // (topmost airframe row median L 174.1, interior L 132.2, bottommost
    // L 83.0 over 73 columns of the stage-1 enemy). R8 implemented it with
    // `outlineSouth(rim)`, which GROWS the silhouette by one row all the way
    // round the bottom. On a 23 px tall aircraft that is a 9 % fatter sprite
    // and, measured, 17-18 % of every cell spent on one tone -- and it
    // double-counts, because the wing and the fuselage now carry their own
    // shaded lower bands (`dominant` then `shadow`) INSIDE the silhouette,
    // which is what shading an edge means. Shading moved inboard; no ring,
    // no added row. `rim` stays in the palette table for the procedural
    // far-LOD path in src/entities/enemySprite.js, which still uses it.
    (cell, i) => {
      const deg = BANK_ANGLES[i % nPoses];
      const flare = aspect === 'rear' && i >= nPoses;
      if (Math.abs(deg) >= OBLIQUE_MIN_DEG) {
        drawOblique(cell, deg, p, { aspect, family, flare });
      } else {
        draw(cell, roll(deg), p, flare);
      }
    },
    // 10, not 8, for the rear sheets: the R37 footage adds two measured
    // colours there (the deep-red core rim and the green wing band — see
    // palettes.js liveryOf). Still well inside the hardware's 16-colour
    // sprite lines; the head sheets stay at the original 8.
    { maxColours: aspect === 'rear' ? 10 : 8, label }
  );
}

export const ENEMY_SHEET_LIVERIES = Object.keys(ENEMY_LIVERIES);
export const ENEMY_SHEET_ASPECTS = ['headOn', 'rear'];

// Back-compat names used by the previous build manifest.
export const buildEnemyMigHeadSheet = () => buildEnemySheet('grey', 'headOn');
export const buildEnemyMigRearSheet = () => buildEnemySheet('grey', 'rear');
export const ENEMY_SHEET_NIGHT = [false, true];

export { BANK_ANGLES, CELL_W, CELL_H, HALF_SPAN, REAR_FLARE_STATES };

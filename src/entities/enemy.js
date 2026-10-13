import * as THREE from 'three';
import { makeBillboard } from '../effects/pixelTexture.js';
import * as enemySprite from './enemySprite.js';
// Imported, not transcribed: this file's fly-past size derives from the
// camera, and cameraGeom.js exists precisely to stop that number being
// written down twice (see ENEMY_WORLD_WIDTH).
import { worldWidthAtDepth } from '../core/cameraGeom.js';

// The native frame, which is what every %W figure in this file is a fraction
// of. REFERENCE.md's measurements are all taken on it.
const NATIVE_W = 320;
const NATIVE_H = 224;

const { DETAIL_SWITCH_NATIVE_PX } = enemySprite;

// ---------------------------------------------------------------------------
// LIVERIES.
//
// GAME_SPEC.md §4 "Liveries observed" (MEASURED): white/grey MiG-types
// (stage 1+), dark green/black camo (stage 2), red/orange-fuselage
// interceptors (t102.5, t172), silver/blue prop types (stage 2 open). Night
// stages palette-swap, the same way REFERENCE.md "Night palette swap"
// records for the player airframe.
//
// WHO OWNS WHAT: src/entities/enemySprite.js belongs to the sprite-art lane
// and it draws the artwork — LIVERIES, the palettes and the two silhouette
// families are theirs. This file owns only WHICH livery each aircraft gets:
// stage, role and pattern in, a livery key plus a night flag out. The two
// lanes never both author enemy appearance.
//
// ROLE, NOT TYPE, SELECTS THE LIVERY. This is the second iteration and the
// reason for it is a measured defect, so it is worth stating.
//
// The first mapping keyed the livery off the ENEMY TYPE — `type ===
// 'interceptor'` got the `interceptor` livery. That is the obvious mapping
// and it is wrong, because `type` is a FLIGHT-MODEL choice (depth rate and
// hit points: fighter 0.7089, interceptor 0.8862, bomber 0.5908) that
// spawner.js makes for pacing reasons, not an identity. Two independent wave
// builders lean on the fast type: `_crosserWave` makes every crosser an
// interceptor because a near-field lateral pass wants to be quick, and
// `_echelonWave` rolled one in four echelon members. With the sprite lane's
// authored art now serving all four daylight liveries, that put roughly a
// third of stage 1's sky in rust-red `delta` airframes — the lead's capture
// (`tools/out/dash-r5/s1-combat/frame-0000.png`, `?demo=2&seed=1`) has four
// of them against one grey. Stage 1's arcade cast is slender swept grey jets;
// GAME_SPEC.md §4's red/orange interceptor sighting is ONE timestamp in that
// stage (t102.5), not a third of it.
//
// So spawner.js now tags each aircraft with a ROLE — 'line', 'elite' or
// 'heavy' — independently of its type, and this table maps (stage, role) to
// a livery. A stage-1 crosser can stay mechanically fast and still wear the
// grey the frames show.
//
// SILHOUETTE FAMILIES COME WITH THE LIVERY (sprite lane, R5): `grey` and
// `camo` are the `mig` family (slender body, thin high-aspect swept wings,
// separate tailplanes, one fin); `interceptor` and `prop` are the `delta`
// family (one solid triangular wing, no tailplane, fatter body, taller fin).
// So choosing a livery here chooses a SHAPE, which is what R4 gap 1
// criterion (d) — ">=2 distinguishable enemy types by silhouette" — is
// actually about. Each stage below deliberately flies both families.
const LIVERY_BY_STAGE = [
  // stage 1 (ocean): grey MiG-types as the line, red/orange interceptor
  // deltas as the rare elite (GAME_SPEC.md §4, t102.5).
  { line: 'grey', elite: 'interceptor', heavy: 'grey', overtake: 'grey', night: false },
  // stage 2 (desert/autumn): green camo MiGs as the line, interceptors as
  // the elite, and the opener's overtake flight in the silver/blue prop
  // livery ("silver/blue prop types (stage 2 open)").
  { line: 'camo', elite: 'interceptor', heavy: 'camo', overtake: 'prop', night: false },
  // stage 3: the stage-1 set under the night palette swap, NOT a separate
  // livery — GAME_SPEC.md §4 lists camo/interceptor/prop as stage identities
  // and treats night as a swap applied on top.
  { line: 'grey', elite: 'interceptor', heavy: 'grey', overtake: 'grey', night: true },
];

function liveryFor(stageIndex, role, pattern) {
  const t = LIVERY_BY_STAGE[stageIndex] ?? LIVERY_BY_STAGE[0];
  const key = (pattern === 'overtake' ? t.overtake : t[role]) ?? t.line;
  return { key, night: t.night };
}

// Shipped signature (R5 interface I1, sprite-art lane):
//   enemyTexture(aspect, livery, detail, night, bankDeg)
//   aspect 'headOn'|'rear'; livery a key of their LIVERIES
//   ('grey' | 'camo' | 'interceptor' | 'prop'); detail near/far;
//   night = per-livery palette swap.
// The feature-detection guard that stood here while I1 was in flight is gone
// at the lead's instruction now that it has landed. Note the consequence it
// was covering: resolvePalette() falls back to 'grey' for an unknown key
// rather than throwing, so a key typo in LIVERY_BY_STAGE above shows up as a
// silently un-swapped sprite, not an error. Check a stage capture after
// editing that table, not just that the page loads.
function textureFor(aspect, livery, detail, bankDeg = 0) {
  return enemySprite.enemyTexture(aspect, livery.key, detail, livery.night, bankDeg);
}

// --- R8: the authored bank poses were unreachable ------------------------
//
// `enemySprite.enemyTexture()` has taken a `bankDeg` and selected one of the
// near sheet's five bank poses since R5 interface I1. `textureFor` above did
// not pass it, so every enemy in the game was drawn on the LEVEL cell and
// FOUR OF THE FIVE AUTHORED POSES PER ASPECT WERE NEVER SELECTED BY ANYTHING.
// Flagged in R6 and again in R7; the art was built, measured and dead.
//
// THE BANK WAS ALREADY BEING SHOWN, as a pure image-plane rotation of the
// level cell (`sprite.material.rotation = this.bank`), so naively passing
// bankDeg through would have drawn a 30-degree pose AND rotated it 30
// degrees: a 60-degree apparent bank. The pose therefore carries what it can
// and the rotation carries the RESIDUAL, which is the same technique
// player.js uses for the jet (quantised drawn pose + continuous remainder)
// and keeps the bank continuous past the sheet's +-30 limit, where the
// enemy's own BANK_MAX_RAD of 57 degrees still reaches.
//
// THIS LADDER IS A MIRROR OF enemySprite.js's PRIVATE `SHEET_BANK_ANGLES`
// ([-30, -15, 0, 15, 30]) AND THAT IS A KNOWN RISK, stated rather than
// hidden: enemySprite.js belongs to the art lane and exports neither the
// table nor its nearest-index function, so the residual cannot be computed
// from the selector itself. If the art lane re-authors the sheet at a
// different ladder this mirror goes stale and the symptom is an enemy banked
// by the wrong few degrees — a visual defect, not an error. The owed fix is
// a one-line export from enemySprite.js; requested in
// judging/R8/lane-combat.md rather than reached into.
//
// WHAT IS NOT ASSUMED is whether a posed cell was actually selected. The
// sheet path is near-LOD only and silently falls back to the procedural
// drawing if a sheet has not decoded, and the procedural cache key ignores
// bankDeg — so `enemyTexture(.., bankDeg)` returns the SAME OBJECT as
// `enemyTexture(.., 0)` exactly when no posed cell was available. Comparing
// the two is a direct read of "did we get a pose", so with no sheet loaded
// this code is byte-identical in behaviour to the level-only build.
const SHEET_BANK_STEP_DEG = 15;
const SHEET_BANK_MAX_DEG = 30;

function poseDegFor(bankDeg) {
  const q = Math.round(bankDeg / SHEET_BANK_STEP_DEG) * SHEET_BANK_STEP_DEG;
  return THREE.MathUtils.clamp(q, -SHEET_BANK_MAX_DEG, SHEET_BANK_MAX_DEG);
}

// Cumulative census of which poses the game actually selected, so "the art
// is now reachable" is a read rather than a claim. Measurement-only.
export const poseCensus = { byDeg: {}, posedTicks: 0, levelOnlyTicks: 0 };

// ---------------------------------------------------------------------------
// Enemy aircraft entity.
//
// Placement is screen-path + depth (see src/effects/screenSpace.js for why).
// This file owns the two curves that ride on top of that:
//
// 1. DEPTH advances GEOMETRICALLY: `d *= exp(depthRate * dt)`. Apparent size
//    is proportional to 1/d, so a constant `depthRate` means the sprite
//    grows by a constant RATIO per second.
//
//    Chosen over constant world-velocity closure for a measured reason:
//    GAME_SPEC.md §4 requires BOTH a 4-6 s approach from first-visible dot
//    to fly-past AND a 25-30%W fly-past wingspan. Together those fix the
//    size ratio across the approach at ~35x. Under constant-velocity
//    closure a 35x 1/d ramp is almost entirely back-loaded — the enemy sits
//    under 10 px for the first 4 of 5 seconds and then explodes across the
//    last half second. Under geometric closure the same 35x spreads evenly
//    (2.06x/s), so the enemy is a readable aircraft for the last ~2.5 s,
//    which is what the reference frames show: t116, t100.75 and t330 each
//    have 2-3 enemies on screen at 15-25%W simultaneously.
//
//    It is also what the hardware did. Super Scaler zoom tables step through
//    SCALE factors, not world distances.
//
//    Honest consequence: enemy closure is NOT tied to the ground scroll rate
//    (stage.js scrollSpeed 68.93 world units/s). They cannot both hold — at
//    68.93 u/s a 5 s approach starts 345 units out, where a fighter-sized
//    sprite is 0.2 screen px, i.e. nothing. The arcade carries the same
//    inconsistency for the same reason.
//
// 2. SCREEN PATH advances with SIZE, not with time: the NDC position is
//    lerped by q = (1/d - 1/dA) / (1/dB - 1/dA). Holding a constant world
//    lateral offset would make screen offset grow exactly as 1/d, so tying
//    the path to 1/d reproduces "expanding away from the vanishing point"
//    for free while still letting the endpoints be authored from reference
//    frames. Most of the lateral travel therefore happens in the last
//    second, which is how a fly-past reads.
//
// SCALING IS CONTINUOUS BY CONSTRUCTION: no scale table, no quantisation,
// no LOD swap anywhere in this file or in enemySprite.js. The sprite's world
// size is a constant; the projection does the rest. The only discretisation
// left is rasterisation to screen pixels, whose plateau length is predicted
// exactly by the growth rate — see the dev report for the measurement that
// separates that from a frozen-scale bug (R2 report gap 5's criterion).
// ---------------------------------------------------------------------------

// Wingspan in world units. Fixes the fly-past size: at FLY_PAST_DEPTH the
// span is ENEMY_WORLD_WIDTH / (width-per-unit-depth * FLY_PAST_DEPTH) =
// 27.15 %W — the centre of REFERENCE.md "Enemies / Size at closest
// approach"'s measured 25-30 %W band (ADOPTED #105). The silhouette in
// enemySprite.js fills its canvas edge to edge, so occupied width == quad
// width and this number is the measurable one.
//
// R11: THE CAMERA TERM IS DERIVED NOW, NOT TRANSCRIBED. It stood here as the
// literal `1.4873344` with a comment asking the next agent to "re-derive if
// the camera FOV or FLY_PAST_DEPTH changes" — which is a request, not a
// mechanism, and this round watched two of those rot (spawner.js's
// REACH_CEILING_NDC_Y lost three inputs; deathSequence.js's phase lengths
// lost their effect). `core/cameraGeom.js` already EXPORTS the solver, so the
// number does not need to exist here at all. Derive where you can; guard only
// what you cannot derive — see the SPAWNER GUARD note in
// judging/R11/lane-effects.md §4B.5.
//
// It was correct when replaced: `worldWidthAtDepth(1, 320/224)` returns
// 1.4873344301478464, and 1.05 / (1.4873344 * 2.6) = 27.15 %W. The point of
// deriving it is that the NEXT camera change cannot silently invalidate it.
const WORLD_WIDTH_PER_DEPTH = worldWidthAtDepth(1, NATIVE_W / NATIVE_H);
export const ENEMY_WORLD_WIDTH = 1.05;

// Depth at which an approaching enemy is retired. This is what CAPS the
// fly-past span, so it is a fidelity constant, not a cleanup threshold:
// anything closer renders above 30%W and leaves the measured band.
export const FLY_PAST_DEPTH = 2.6;

// THE GUARD on the two lines above, and the half that a derivation alone
// cannot give you. Deriving `WORLD_WIDTH_PER_DEPTH` from cameraGeom.js means
// the camera can no longer go stale SILENTLY — but it can still go stale
// LOUDLY-IN-PRINCIPLE-AND-QUIETLY-IN-FACT, because nothing was checking that
// the result still lands in the band REFERENCE.md measured. A FOV change
// would recompute this correctly and move the fly-past span straight out of
// 25-30 %W with no symptom but a slightly wrong-sized aeroplane.
//
// Warns, never throws: a hard failure here turns a drifted constant into a
// black screen, which is worse than a drifted constant. One line, once, at
// module load. Verified to fire by `node judging/R11/guard_test.mjs --file
// src/entities/enemy.js --witness ENEMY_WORLD_WIDTH --stale 2.0`.
const FLY_PAST_SPAN_PCT_W = (100 * ENEMY_WORLD_WIDTH) / (WORLD_WIDTH_PER_DEPTH * FLY_PAST_DEPTH);
if ((FLY_PAST_SPAN_PCT_W < 25 || FLY_PAST_SPAN_PCT_W > 30) && typeof console !== 'undefined') {
  console.warn(
    `enemy.js: the fly-past span derives to ${FLY_PAST_SPAN_PCT_W.toFixed(2)} %W, outside ` +
    `REFERENCE.md "Enemies / Size at closest approach"'s measured 25-30 %W (ADOPTED #105). ` +
    `Inputs: ENEMY_WORLD_WIDTH ${ENEMY_WORLD_WIDTH}, FLY_PAST_DEPTH ${FLY_PAST_DEPTH}, ` +
    `camera width/depth ${WORLD_WIDTH_PER_DEPTH.toFixed(7)} (core/cameraGeom.js). ` +
    `One of the three moved; re-solve rather than clamping the symptom.`
  );
}

// Spawn depth for head-on approaches. 90 units puts the sprite at
// 1.05/(1.4873344*90) = 0.78%W = 2.5 px on a 320-wide frame: a visible dot,
// not a sub-pixel nothing. GAME_SPEC.md §4's "first-visible dot".
export const APPROACH_SPAWN_DEPTH = 90;

// Enemies bank INTO their drift up to ~57 degrees (REFERENCE.md "Enemies",
// ADOPTED #131: wing axis dx705/dy1080 on a 3x crop of
// ab2-arcade-closeup-enemies.jpg), rolling in and out rather than holding
// one angle. The oscillation is MULTIPLICATIVE so a non-turning enemy flies
// flat (ADOPTED, GAME_SPEC.md §4).
const BANK_MAX_RAD = THREE.MathUtils.degToRad(57);
const BANK_OSC_RAD_PER_S = 0.55;
// rad of bank per (NDC/s) of on-screen lateral travel. MEASURED on our own
// capture rather than guessed: at 0.85 the probe's peak |bank| over 30 s of
// waves was 36.5 deg, well short of REFERENCE.md's measured ~57 deg maximum.
// 1.40 puts the hardest crossers on the clamp while leaving the median near
// 3 deg, which is right — a distant enemy tracking straight in is not
// turning, and the oscillation is multiplicative so it stays flat.
const BANK_PER_NDC_VEL = 1.40;
const BANK_SLEW_RAD_PER_S = 3.2;

// THE FIRING BAND, and why its two ends are solved together with
// TELEGRAPH_S below rather than picked independently.
//
// Enemies "may only open fire once visibly close" (GAME_SPEC.md §4; shots
// appear from enemies at mid depth, t113-114, t117, t318) and stop once they
// are on top of the player. The committed band was 46..6, which satisfies
// that sentence and nothing else: at the committed 24 units/s a round fired
// from depth 6 reached the player in (6 - 1.6) / 24 = 0.18 s, and no
// telegraph can make 0.18 s dodgeable. Measured on the committed build, the
// median time of flight across all hits was 0.22 s — enemies were doing
// nearly all of their killing at point-blank range.
//
// The constraint that actually binds is TIME, not depth, and it is easy to
// get wrong because depth decays GEOMETRICALLY. A fighter spawns at
// APPROACH_SPAWN_DEPTH 90 and lives 5.00 s to FLY_PAST_DEPTH 2.6, so:
//
//   time from spawn down to depth D  = ln(90 / D) / 0.7089
//   time to cross a band D_hi..D_lo  = ln(D_hi / D_lo) / 0.7089
//   time of flight of a round from D = (D - 1.6) / 15   (enemyShots.js SPEED)
//
// A telegraph of length T has to fit in the approach ABOVE the band, and the
// train has to fit INSIDE it:
//
//   ln(90 / D_hi) / 0.7089  >=  T        (room to announce)
//   ln(D_hi / D_lo) / 0.7089 >= n * 0.18 (room to pay out n rounds)
//
// The first attempt kept D_hi = 46 and set T = 1.4 s, which fails the first
// inequality outright — only 0.944 s of approach exists above depth 46 — and
// the measured result was unmistakable: 148 trains opened across 180 s and
// delivered 12 rounds between them, a 97% volume collapse against the
// committed build's 116.7 rounds/min. Every flare lit at depth 18-22 (read
// off the per-enemy state in combat.js's __fairness hook) and the aircraft
// sank through the floor before it could fire.
//
// 52 and 24 with T = 1.0 satisfies both: 0.774 s of approach above 52 (so
// the flare lights at spawn and HOLDS for ~0.23 s, see TELEGRAPH_DEPTH_MAX),
// and 1.09 s inside the band, which at SHOT_SPACING_S 0.11 pays out a full
// 8-round train. Time of flight is 3.36 s at the top and 1.49 s at the
// floor, so the total lag between the aim snapshot and impact is 2.49-4.36 s
// — the range the displacement table under TELEGRAPH_S prices at a
// 0.10 -> 0.05 per-round hit probability.
//
// MOVE NONE OF THESE FOUR ALONE. D_hi, D_lo, T and EnemyShots' SPEED are one
// solution to the two inequalities plus a hit-probability target. Raising the
// floor buys lag and COSTS budget; slowing the round buys lag for free, which
// is why SPEED carried the last factor rather than D_lo.
const FIRE_DEPTH_MAX = 52;
const FIRE_DEPTH_MIN = 24;

// Spacing inside a shot train. The trains in
// reference/stage7-enemy-shot-train-t330.png read as ~6 fireballs strung
// across roughly a third of the frame with clear gaps between them, which at
// enemyShots.js's shot speed puts the emission interval near 0.1 s.
//
// 0.08, not 0.18. The old value was never derived from that frame — the
// comment above computed 0.1 s and the constant said 0.18 — and the gap
// matters now because the train has to fit inside the depth budget: at 0.18 s
// an 8-round train needs 1.26 s on top of the telegraph and the whole
// approach from spawn to the firing floor is 1.86 s, so the long trains were
// silently truncated to 1.4 rounds each (measured: 169 trains, 241 rounds
// across 180 s). 0.08 s puts an 8-round train at 0.56 s, which leaves a
// 0.3-0.5 s window in each aircraft's life in which it can light a flare and
// still deliver all eight — narrow enough to be worth checking (the
// __fairness hook reports rounds per train) and wide enough to hold the
// round count at the committed build's level.
const SHOT_SPACING_S = 0.08;

// The least a train may be allowed to deliver. A train that opens and is cut
// off by FIRE_DEPTH_MIN after one round spends a full telegraph of the
// concurrency budget to put a single fireball on screen, which is how the
// round count collapsed while the train count stayed at the cap. Enforced as
// a DEPTH gate when the flare lights (see update()), not by letting a
// truncated train fire below the floor.
const MIN_TRAIN_ROUNDS = 4;

// A train SWEEPS PAST the player's position rather than converging on it.
//
// reference/stage7-enemy-shot-train-t330.png shows a train strung out across
// roughly a third of the frame, not a cluster on one point. Successive shots
// in a train are offset along one direction so the burst has spread rather
// than being a laser into one pixel.
//
// 0.012, and the direction of this constant is the opposite of what it looks
// like. A WIDE rake is MORE lethal, not less, and that is worth stating
// plainly because two rounds of tuning got it backwards.
//
// The reasoning that fails: "spread the train and most of its rounds sit
// clear of the kill box, so fewer rounds hit." True and irrelevant. A death
// costs one hit, so what matters is P(the train hits AT ALL), and a train of
// n rounds spaced s apart sweeps a CAPSULE of length (n-1)*s and radius
// PLAYER_HIT_RADIUS_FRAC through the aim point. Widening s grows that
// capsule's area almost linearly, so it grows the chance the player's actual
// position at arrival falls somewhere inside it. A TIGHT train is n chances
// at one disc — which, because every round in a train shares one aim
// snapshot and they all arrive within ~0.8 s of each other, is barely more
// dangerous than a single round.
//
// That is also what makes the volume constraint satisfiable at all. R4 gap 5
// forbids cutting the round count, so the lethality has to come out of the
// number of INDEPENDENT AIM SNAPSHOTS instead: fewer, longer, tighter trains
// deliver the same fireballs per minute from fewer separate decisions about
// where the player is. See spawner.js's MAX_CONCURRENT_TRAINS.
//
// Measured confirmation of the sign: at 0.11 NDC (committed) and at 0.04 the
// per-round hit rate was 10.1% and 10.4% — unchanged — while deaths/min went
// 5.44 and 5.00. The spread was not buying anything.
//
// Not zero, because a train of coincident fireballs reads as one smear.
// 0.012 NDC over an 8-round train is 0.084 NDC = 4.2%W of aim spread; the
// visible "strung out across roughly a third of the frame" in t330 comes
// from the FIRING AIRCRAFT's own motion between rounds and from perspective,
// which at 0.11 s intervals and a 52..24 depth band is the larger effect.
const TRAIN_SWEEP_STEP_NDC = 0.012;

// ---------------------------------------------------------------------------
// AIM ERROR. Named in the R6 feel critique, asked for again by R10's effects
// lane as the one lever that decouples enemy-fire LETHALITY from enemy-fire
// SPEED, and absent until now. This is the per-train offset between the
// player's position when the flare lights and the point the train is actually
// aimed at.
//
// WHY A TRAIN NEEDS ONE AT ALL. Today the only thing that makes aimed fire
// miss is that the player MOVES between the aim snapshot and the impact:
// `pHit` is a pure read of the displacement distribution at the fairness lag
// (TELEGRAPH_S + time of flight = 3.24-6.04 s on the shipped geometry). That
// couples two things that should be independent — how fast an enemy round
// crosses the screen, which is a FIDELITY fact measured off the arcade, and
// how often it kills you, which is a BALANCE fact measured against the
// arcade's death rate. Any change to the first moves the second by the slope
// of that distribution, which is why enemyShots.js's own header says
// "MOVE NONE OF THESE FOUR ALONE".
//
// PERPENDICULAR TO THE RAKE, NOT ISOTROPIC, and that is the whole design.
// A train already sweeps a capsule of length (n-1) * TRAIN_SWEEP_STEP_NDC and
// radius PLAYER_HIT_RADIUS_FRAC along `sweep`. An error ALONG that axis
// slides the capsule along itself and barely changes the area it covers; an
// error ACROSS it moves the whole capsule off the player. So the offset is
// applied along the rake's perpendicular, which is both the efficient
// direction and the legible one: the train visibly passes to one SIDE of you
// rather than landing short or long in a way that reads as noise.
//
// IT IS NOT THE R4 RANDOM BIAS COMING BACK, and the difference is not one of
// degree. judging/R4/feel-critique.md killed a 0.22-0.85 NDC offset in a
// RANDOM DIRECTION applied to UNANNOUNCED fire: "a rake that sweeps a random
// part of the screen ... no tell, no lead you can read, and nothing you can
// learn". The telegraph is what changed: the flare still lights, still lasts
// TELEGRAPH_S, and still predicts the train's arrival TIME exactly. What the
// offset costs is a bounded amount of the flare's accuracy about WHERE, and
// at the magnitudes below the aim point stays inside the sweep the train
// already draws across the screen.
//
// NOT ONE DRAW FROM THE SHARED STREAM. CLAUDE.md's recurring bug class:
// "adding one conditional draw silently shifts every later draw", which cost
// R10's effects lane an hour on a capture that diverged at tick 300. The
// magnitude is hashed out of state the aircraft ALREADY has — the sweep angle
// `a` that was just drawn, plus its own age and depth — so AIM_ERROR_NDC = 0
// is byte-identical to the build without this term, and every arm of the
// sweep below shares one PRNG stream with the control. Verified: the
// `?demo=2&seed=1` kill at tick 707 lands on the same tick and within 1 px of
// the same screen position on both.
//
// THE VALUE IS MEASURED, and the measurement is in
// judging/R11/lane-effects.md §3. tools/fairness_probe.mjs, `?demo=1`,
// 7 seeds x 300 s per arm (~2 500 round-crossings per arm, against 43 deaths
// — the deaths are the prediction, `pHit` is the estimator; R8 interface I27).
const AIM_ERROR_NDC = 0.0;

// Deterministic hash in [0,1) of three floats. Used only to derive the aim
// error without touching the shared PRNG; it is NOT a random source and
// nothing else may use it for one. Its distribution is checked in
// judging/R11/aim_error_control.mjs (chi-square over 20 bins on 4 000
// telegraph events taken from live play, not from a synthetic sweep).
function aimHash(a, age, depth) {
  const s = Math.sin(a * 91.3458 + age * 47.0393 + depth * 13.7131) * 43758.5453123;
  return s - Math.floor(s);
}

// Measurement-only census of the hash's output ON THE INPUTS LIVE PLAY
// ACTUALLY PRODUCES. A hash that is uniform over synthetic inputs can still
// be degenerate over the narrow, correlated (angle, age, depth) triples a
// real telegraph produces — four instruments were withdrawn in R10 for
// passing a selftest and failing on real data, so this one is checked on real
// data. Read by judging/R11/aim_error_control.mjs. Same shape and the same
// zero-cost increment as `poseCensus` above; nothing in the game reads it.
export const aimErrorCensus = { n: 0, bins: new Array(20).fill(0) };

// Every train is 8 rounds — the top of GAME_SPEC.md §4's measured "trains of
// 4-8" — and the length is fixed rather than drawn for two reasons.
//
// LENGTH IS THE CHEAPEST LETHALITY REDUCTION AT CONSTANT VOLUME. Rounds per
// minute is trains/min x length, and R4 gap 5 forbids cutting the first
// factor's product. Measured on the attract path, P(a train hits at all)
// rises strongly sublinearly with length — 0.041 for a single round against
// 0.188 for eight, a 4.6x rise for 8x the rounds — because all eight share
// one aim snapshot. Lethality per round delivered therefore FALLS as trains
// get longer, by 1.7x from 1 round to 8, so the longest train the reference
// supports is the right one.
//
// EVEN, so that `k` below is always a half-integer and no round is aimed
// dead-centre on the snapshot: with an odd length the middle round lands
// exactly on the telegraphed point, a guaranteed hit on a player who did not
// move at all. The train straddles the last known position instead.
//
// Not a contradiction of "4-8": that range is per train, and
// reference/stage7-enemy-shot-train-t330.png has 10-16 fireballs in the air
// at once, which is two overlapping trains (MAX_CONCURRENT_TRAINS = 2).
const TRAIN_LENGTHS = [8];

// ---------------------------------------------------------------------------
// THE TELEGRAPH. This is the fairness contract, and it replaces a random aim
// bias that the game-feel critique correctly called an inverted one.
//
// What was here: every train's centre was displaced from the player by a
// RANDOM 0.22-0.85 NDC (11-42.5%W) in a RANDOM direction. It was added
// because aimed fire was "a guaranteed hit whenever the jet has not moved
// further than the kill radius" — but aiming AWAY from the player does not
// make fire fair, it makes it arbitrary. judging/R4/feel-critique.md: "Enemy
// fire is no longer something you dodge — it is a rake that sweeps a random
// part of the screen, and you die when you happen to be standing in it.
// There is no tell, no lead you can read, and nothing you can learn."
// Measured: 67% of flight frames had no enemy shot on screen at all, and the
// player still died 6.0 times per minute.
//
// What replaces it: fire is genuinely AIMED, and it is ANNOUNCED first. An
// enemy that wants to shoot spends TELEGRAPH_S lit up with a muzzle flare
// before anything leaves the barrel, and the shot is aimed at where the
// player was WHEN THE FLARE LIT, not at where they are when it fires. That
// single choice is what makes the tell honest: the flare predicts the
// impact point, so reacting to it works, and ignoring it is what kills you.
//
// WHAT SIZES IT. The quantity that decides whether aimed-at-a-snapshot fire
// is dodgeable is not a speed, it is the DISPLACEMENT DISTRIBUTION of the
// jet over the lag between the snapshot and the impact. Speeds were tried
// first and mislead: a median speed of 0.077 frame-widths/s implies 0.108 of
// travel over 1.4 s, comfortably past a 0.05 kill radius, and yet the jet
// was being hit on a third of aimed rounds — because the jet weaves, so the
// displacement over a 1.4 s window is far smaller than speed x time
// whenever the window straddles a turnaround.
//
// MEASURED, tools/fairness_probe.mjs --trace, ?fixed=1&demo=1&seed=4, 120 s,
// 671 flight samples at 0.1 s. Operator: displacement between two samples
// lag apart that are BOTH in state 'flight', in the hit test's own units
// (dx = dNDCx * 0.5, dy = dNDCy * 0.5 * 224/320), i.e. frame-width
// fractions, directly comparable to PLAYER_HIT_RADIUS_FRAC:
//
//   lag    p10     median   P(displacement < 0.05)
//   0.6 s  0.0094  0.0342   0.635
//   1.0 s  0.0158  0.0583   0.455
//   1.4 s  0.0238  0.0815   0.320
//   2.0 s  0.0376  0.1155   0.161
//   2.6 s  0.0532  0.1449   0.090
//
// That last column IS the per-round hit probability for a round aimed
// exactly at the snapshot, and it is the curve every constant here is
// solved against. The lag available is
//
//   lag = TELEGRAPH_S + timeOfFlight,  timeOfFlight = (d - 1.6) / 24
//
// so with firing confined to FIRE_DEPTH_MIN..FIRE_DEPTH_MAX = 16..46 the
// flight term is only 0.60-1.85 s. At TELEGRAPH_S 0.8 that put the lag at
// 1.4-2.65 s, the hit probability near 0.32 at the dangerous end, and the
// measured result was 4.5 deaths/min on seed 4 — WORSE than the 3.50 R4
// measured, because honest aim at a 1.4 s snapshot is more accurate than the
// random rake it replaced. The telegraph was doing its job; it was too short
// to pay for the accuracy it bought.
//
// 1.0 s, against the 52..24 band solved in FIRE_DEPTH_MAX/MIN above and
// enemyShots.js's 15 units/s, puts the lag at 2.49-4.36 s: a per-round hit
// probability of ~0.10 at the floor falling to ~0.05 at the top of the band,
// against the 0.32 the committed geometry was paying. The remaining margin comes from the wider
// rake above, not from firing less.
//
// 1.0 and not 1.4: 1.4 was tried, and it is the first inequality under
// FIRE_DEPTH_MAX that kills it — there is only 0.774-0.944 s of approach
// above any defensible band top, so a 1.4 s flare spends most of its life
// HELD at full brightness on a stationary-looking dot, which is both less
// informative (the pulse is what carries the timing) and more cluttered.
//
// WHY THIS IS NOT JUST "make the enemy slower to shoot". The flare is lit
// for the whole window and the aim point is frozen at the instant it lit, so
// the window is not dead time — it is the only interval in which the player
// can act on the information. A longer window is a longer promise, not a
// longer pause: volume per minute is set by the train cadence and the
// concurrency cap, both unchanged.
export const TELEGRAPH_S = 1.0;

// The flare may light while the aircraft is still OUTSIDE the firing band,
// and holds at full brightness until the band is entered.
//
// This exists because the band is short in TIME, not in depth (see the
// inequalities under FIRE_DEPTH_MAX): a flare that had to fit inside the
// band would leave nothing for the train it announces, and the measured
// symptom was exactly that — 12 rounds delivered by 148 trains. Lighting the
// flare on the approach instead costs no band time and gives the player MORE
// warning, not less.
//
// Set to APPROACH_SPAWN_DEPTH, i.e. an aircraft may light its flare from the
// moment it exists. An earlier 70 was there out of a worry about legibility
// on a distant dot, and it is the wrong worry: the flare is a FIXED-SIZE
// glyph (telegraph.js, 7-13 native px) and an approach-pattern aircraft is
// only ~7 px across even at the top of the firing band, so the flare is the
// larger of the two at every depth it is lit — it reads BETTER on the dot
// than on the aircraft. Capping it instead delays the tell to a depth where
// the round that follows can no longer be dodged.
const TELEGRAPH_DEPTH_MAX = APPROACH_SPAWN_DEPTH;

// Per-type speed/hp split ADOPTED from the prototype (`enemy_jet_2d.gd`),
// re-expressed as geometric depth rates. The prototype's 0.35/0.55/0.25
// depth-units/s imply 1.7-2.6 s lifetimes, which GAME_SPEC.md §4 itself
// flags as too fast against the measured 4-6 s approach — so the ORDERING
// is adopted (interceptor fastest, bomber slowest) and the magnitudes come
// from the measured duration instead:
//   duration = ln(APPROACH_SPAWN_DEPTH / FLY_PAST_DEPTH) / rate
//            = ln(34.6154) / rate = 3.5443 / rate
// fighter 0.7089 -> 5.00 s, interceptor 0.8862 -> 4.00 s, bomber 0.5908 ->
// 6.00 s. All three land inside the measured 4-6 s band by construction,
// with the fast and slow types sitting exactly on its ends.
export const ENEMY_TYPES = {
  fighter: { depthRate: 0.7089, hp: 1, widthScale: 1.0 },
  interceptor: { depthRate: 0.8862, hp: 1, widthScale: 0.92 },
  bomber: { depthRate: 0.5908, hp: 2, widthScale: 1.35 },
};

let nextEnemyId = 1;

export class Enemy {
  // `pattern`:
  //   'approach' — head-on, grows from the horizon and flies past. The main
  //                pattern (GAME_SPEC.md §4 "head-on echelons of 3-6").
  //   'overtake' — stage opener: starts near, REAR aspect with glowing
  //                nozzles, recedes toward the horizon while weaving;
  //                killable from behind. The first thing every arcade stage
  //                shows, and absent from the Godot prototype.
  //   'crosser'  — near-depth lateral crosser passing over the player
  //                (t118-119): slower depth change, large NDC travel.
  //
  // `ndcA`/`ndcB` are the screen positions at `depthA`/`depthB`.
  constructor({
    pattern = 'approach',
    type = 'fighter',
    ndcA = [0, -0.18],
    ndcB = [0.6, 0.2],
    depthA = APPROACH_SPAWN_DEPTH,
    depthB = FLY_PAST_DEPTH,
    weaveAmp = 0,
    weaveRate = 0,
    weavePhase = 0,
    fireDelay = 1.2,
    stageIndex = 0,
    // Visual identity, chosen by spawner.js independently of `type`. See the
    // LIVERY_BY_STAGE note at the top of this file for why these are two
    // separate axes: `type` is the flight model, `role` is who they are.
    role = 'line',
    // Which wave dispensed this aircraft. MEASUREMENT ONLY — no code branches
    // on it; see spawner.js's _nextWave for why formation geometry cannot be
    // measured without it. -1 = the stage opener and primed echelon, which are
    // pushed outside the numbered wave sequence.
    waveId = -1,
  }) {
    const spec = ENEMY_TYPES[type] ?? ENEMY_TYPES.fighter;
    this.id = nextEnemyId++;
    this.pattern = pattern;
    this.type = type;
    this.waveId = waveId;
    this.hp = spec.hp;
    this.alive = true;
    this.age = 0;

    this.ndcA = ndcA;
    this.ndcB = ndcB;
    this.depthA = depthA;
    this.depthB = depthB;
    this.d = depthA;
    this.invA = 1 / depthA;
    this.invSpan = 1 / depthB - 1 / depthA;

    this.weaveAmp = weaveAmp;
    this.weaveRate = weaveRate;
    this.weavePhase = weavePhase;

    // Sign follows the authored endpoints: the opener's depthB is FARTHER
    // than its depthA, so it recedes. One model, both directions.
    let magnitude = spec.depthRate;
    if (pattern === 'crosser') magnitude *= 0.5;
    // Openers recede at well under half rate so the stage's first seconds
    // are not empty: they are the only readable aircraft on screen until the
    // first head-on echelon completes its ~5 s approach.
    if (pattern === 'overtake') magnitude *= 0.45;
    this.depthRate = Math.sign(Math.log(depthB / depthA)) * magnitude;

    this.ndc = { x: ndcA[0], y: ndcA[1] };
    this.bank = 0;
    this.fireTimer = fireDelay;
    this.burstLeft = 0;
    this.burstCount = 0;
    this.burstTimer = 0;
    this.sweepX = 1;
    this.sweepY = 0;
    // Telegraph state. `telegraph` counts DOWN to zero and the train starts
    // when it gets there; `telegraphFrac` is 0..1 for the flare renderer in
    // weapons/combat.js. `aimX`/`aimY` are the player's NDC snapshotted at
    // the instant the flare lit — see the TELEGRAPH note above for why the
    // snapshot, not the live position, is what every shot in the train aims
    // at.
    this.telegraph = 0;
    this.telegraphFrac = 0;
    this.aimX = 0;
    this.aimY = 0;

    const rear = pattern === 'overtake';
    const aspect = rear ? 'rear' : 'headOn';
    this.role = role;
    this.livery = liveryFor(stageIndex, role, pattern);
    this.texDetail = textureFor(aspect, this.livery, true);
    this.texFar = textureFor(aspect, this.livery, false);
    this.worldWidth = ENEMY_WORLD_WIDTH * spec.widthScale;
    this.sprite = makeBillboard(this.texFar, this.worldWidth);
    this.sprite.renderOrder = 10;
    this._prevNdcX = ndcA[0];
    // `_detail` starts undefined so the first update() always runs the
    // handover and assigns a texture; `_poseDeg` likewise. `_posedCell`
    // starts false so the rotation carries the whole bank until a posed
    // cell is actually selected.
    this._poseDeg = null;
    this._posedCell = false;
  }

  // Fraction of frame width this enemy currently spans. Used by the lock
  // system to size its bracket and by hit tests as a hitbox radius.
  spanFrac(space) {
    return space.spanFrac(this.worldWidth, this.d);
  }

  // True while this aircraft is part-way through a shot train. The spawner
  // uses it to bound how many trains exist at once (see `allowNewTrain`).
  //
  // The TELEGRAPH counts as part of the train. It has to: the concurrency cap
  // exists so the player is never facing more aimed trains than they can read,
  // and a flare the player is supposed to react to is precisely the part of a
  // train that needs to be counted. Leaving it out let N enemies all light up
  // together and then fire together, which is the un-dodgeable case the cap
  // was written to prevent.
  get firingTrain() {
    return this.burstLeft > 0 || this.telegraph > 0;
  }

  // ABANDON a train in progress, used only on the respawn edge
  // (weapons/combat.js clearShots). R5's game-feel critique, §2 residual 1:
  //
  //   "clearShots() retires rounds in the air; it does not touch
  //    enemy.telegraph, burstLeft or the aim snapshot. An enemy whose flare
  //    lit at the dying jet will pay out its train into the new life, aimed
  //    at a snapshot of a jet that no longer exists -- announced:false by
  //    construction. Observed at 3 of 39 respawns. It produced 0 of 61 fatal
  //    hits in 21 minutes. It is a latent hole, not an active defect."
  //
  // It is no longer latent. On the R6 geometry a round is in the air 2.24-
  // 5.04 s instead of 1.49-3.36 s, so a train that opens just before a death
  // is still arriving well into the next life, and the same probe reads
  // 2 unannounced fatal hits in 72 (7 seeds x 300 s, seed 1 t=239.68 and
  // seed 4 t=231.43; both flares lit 3.1 s and 4.7 s before the life began).
  // Two in 72 is 2.8 %, and every one of them is a death the player could not
  // have avoided by any input -- which is the one thing the telegraph
  // contract promises cannot happen.
  //
  // `fireTimer` is left alone deliberately: the aircraft is allowed to open a
  // NEW train at the new player, announced by a new flare. What is destroyed
  // is only the promise made to a pilot who is already dead.
  abandonTrain() {
    this.telegraph = 0;
    this.telegraphFrac = 0;
    this.burstLeft = 0;
  }

  // Returns a fire request on the tick a shot leaves the aircraft, else null.
  // The caller owns the projectile pool.
  // `allowNewTrain` gates the START of a train only — an enemy already
  // mid-train always finishes it, so trains are never cut off half-way.
  // `playerNdc` is snapshotted when the telegraph lights, and every shot in
  // the resulting train is aimed at that snapshot.
  update(dt, rng, space, allowNewTrain = true, playerNdc = null, closureScale = 1) {
    this.age += dt;

    // `closureScale` is the throttle's effect on how fast the sky comes at
    // you (judging/R6/ask-flow.md A6). See spawner.js THROTTLE_CLOSURE_MULT
    // for the magnitudes and the bound they are derived from. It multiplies
    // the depth rate only; the screen path is driven by 1/d, so a wave's
    // shape through the frame is unchanged and only its TIMING moves.
    //
    // 1 at the M detent, exactly, and that is load-bearing rather than
    // tidy: every flight constant this project has MEASURED was taken from
    // footage with the throttle at M throughout, including this file's own
    // 4-6 s approach. A multiplier whose middle value is not exactly 1
    // re-bases all of them at once and no test would notice.
    this.d *= Math.exp(this.depthRate * closureScale * dt);

    // Screen path, advanced by SIZE (1/d), not by time — see the header.
    const q = THREE.MathUtils.clamp((1 / this.d - this.invA) / this.invSpan, 0, 1);
    let nx = this.ndcA[0] + (this.ndcB[0] - this.ndcA[0]) * q;
    let ny = this.ndcA[1] + (this.ndcB[1] - this.ndcA[1]) * q;
    if (this.weaveAmp > 0) {
      // Weave scales with q so a far-off enemy does not jitter across whole
      // pixels while it is 3 px wide.
      const w = Math.sin(this.age * this.weaveRate + this.weavePhase) * this.weaveAmp * q;
      nx += w;
      ny += w * 0.25;
    }
    this.ndc.x = nx;
    this.ndc.y = ny;

    space.ndcToWorld(nx, ny, this.d, this.sprite.position);

    // Zoom-level handover. Both levels share the sprite's quad and aspect,
    // so this changes the texture and nothing else — the measured span is
    // continuous across it (verified frame by frame in the solo harness).
    //
    // R8: the ASSIGNMENT moved below the bank calculation, because the
    // texture now depends on the bank (see poseDegFor). The decision is
    // still made here, unchanged, so the switch depth is untouched.
    const nativePx = space.spanFrac(this.worldWidth, this.d) * 320;
    const wantDetail = nativePx >= DETAIL_SWITCH_NATIVE_PX;

    // Bank into the on-screen drift. material.rotation is a pure image-plane
    // rotation, which is what a camera-facing billboard needs (the same
    // technique player.js uses for the jet's bank). Negative rotation drops
    // the sprite's right side, so an enemy sliding right banks right.
    const ndcVelX = dt > 0 ? (nx - this._prevNdcX) / dt : 0;
    this._prevNdcX = nx;
    // Published for the vulcan's aim lead (weapons/combat.js).
    this.ndcVelX = ndcVelX;
    const osc = 0.65 + 0.35 * Math.sin(this.age * BANK_OSC_RAD_PER_S);
    const target = THREE.MathUtils.clamp(
      -ndcVelX * BANK_PER_NDC_VEL * osc,
      -BANK_MAX_RAD,
      BANK_MAX_RAD
    );
    const step = BANK_SLEW_RAD_PER_S * dt;
    this.bank += THREE.MathUtils.clamp(target - this.bank, -step, step);

    // --- Pose selection + residual rotation (R8). See poseDegFor above. ---
    const bankDeg = (this.bank * 180) / Math.PI;
    const poseDeg = poseDegFor(bankDeg);
    if (wantDetail !== this._detail || poseDeg !== this._poseDeg) {
      this._detail = wantDetail;
      this._poseDeg = poseDeg;
      if (wantDetail) {
        const aspect = this.pattern === 'overtake' ? 'rear' : 'headOn';
        const posed = textureFor(aspect, this.livery, true, poseDeg);
        const level = textureFor(aspect, this.livery, true, 0);
        // Identity comparison, not a flag: equal means no posed cell was
        // available (the sheet has not decoded, or failed), so the level
        // texture is what is on screen and the rotation must carry the
        // whole bank — which is the pre-R8 behaviour exactly.
        this._posedCell = posed !== level;
        this.sprite.material.map = posed;
      } else {
        // The far LOD has no bank poses by declared design (enemySprite.js:
        // at 3-9 native px a transparent row is a frame where the aircraft
        // vanishes, so it is a fully opaque value-read texture). Rotation
        // carries the whole bank there.
        this._posedCell = false;
        this.sprite.material.map = this.texFar;
      }
      if (this._posedCell) {
        poseCensus.byDeg[poseDeg] = (poseCensus.byDeg[poseDeg] ?? 0) + 1;
      }
    }
    this.sprite.material.rotation = this._posedCell
      ? ((bankDeg - poseDeg) * Math.PI) / 180
      : this.bank;
    if (this._posedCell) poseCensus.posedTicks += 1;
    else poseCensus.levelOnlyTicks += 1;

    // --- Firing: TELEGRAPH, then a train of 4/6/8 shots 1.5-2 s apart
    // (GAME_SPEC.md §4 / REFERENCE.md "Projectile palettes / Enemy shots").
    // See the TELEGRAPH note at the top of this file for the fairness
    // reasoning; the three phases below are flare -> train -> cooldown.
    //
    // The flare and the train have DIFFERENT depth windows. The train is
    // confined to the measured firing band (GAME_SPEC §4: shots appear from
    // enemies at mid depth); the flare runs on the approach into it, because
    // the band is only ~1.2-1.5 s long and a flare that had to fit inside it
    // would leave no room for the train it is announcing.
    let fired = null;
    const armed = this.pattern !== 'overtake' && this.d > FIRE_DEPTH_MIN;
    if (armed) {
      if (this.telegraph > 0) {
        // Phase 1: the flare is lit and nothing has been fired yet. The aim
        // point was snapshotted when it lit and is NOT refreshed here —
        // refreshing it would make the tell a lie.
        this.telegraph -= dt;
        this.telegraphFrac = 1 - Math.max(0, this.telegraph) / TELEGRAPH_S;
        if (this.telegraph <= 0) {
          if (this.d >= FIRE_DEPTH_MAX) {
            // Flare ran out before the aircraft reached the band. HOLD it at
            // full brightness rather than dropping it and re-lighting later:
            // a tell that blinks off and on again teaches the player that it
            // means nothing. The aim snapshot is deliberately NOT refreshed
            // during the hold either, so the hold only ever adds warning.
            this.telegraph = 1e-6;
            this.telegraphFrac = 1;
          } else {
            this.telegraph = 0;
            this.telegraphFrac = 0;
            this.burstCount = TRAIN_LENGTHS[Math.floor(rng() * TRAIN_LENGTHS.length)];
            this.burstLeft = this.burstCount;
            this.burstTimer = 0;
          }
        }
      } else if (this.burstLeft > 0) {
        // Phase 2: paying out the train.
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) {
          this.burstTimer += SHOT_SPACING_S;
          this.burstLeft -= 1;
          // Index from the train's centre, so the rake is symmetric about
          // the snapshotted aim point whatever the train length — the middle
          // of a train is the dangerous part and the ends miss.
          const k = this.burstLeft - (this.burstCount - 1) / 2;
          fired = {
            ndcX: nx,
            ndcY: ny,
            depth: this.d,
            // ABSOLUTE aim, not an offset from wherever the player happens
            // to be this tick. The caller used to add these to the LIVE
            // player position, which quietly re-aimed every shot in flight's
            // worth of train at a moving target.
            aimX: this.aimX + this.sweepX * k * TRAIN_SWEEP_STEP_NDC,
            aimY: this.aimY + this.sweepY * k * TRAIN_SWEEP_STEP_NDC,
            // The un-raked snapshot, for the fairness probe in combat.js.
            snapX: this.aimX,
            snapY: this.aimY,
          };
        }
      } else {
        // Phase 3: cooling down, then light the flare.
        //
        // The flare may only light if there is DEPTH BUDGET left to announce
        // the train and then deliver MIN_TRAIN_ROUNDS of it before the
        // aircraft sinks through FIRE_DEPTH_MIN. Without this gate the
        // concurrency budget in spawner.js hands the flare to whichever
        // aircraft happens to win it, which is usually one most of the way
        // through its 5 s approach, and the train is cut off after a round or
        // two: measured, 169 trains delivered 241 rounds, 1.4 each of a
        // nominal 4-8. The budget is the aircraft's own remaining time to the
        // floor, so it is correct for all three depth rates rather than for
        // the fighter only.
        this.fireTimer -= dt;
        const budgetS = Math.log(this.d / FIRE_DEPTH_MIN) / Math.abs(this.depthRate);
        const needS = TELEGRAPH_S + (MIN_TRAIN_ROUNDS - 1) * SHOT_SPACING_S;
        if (
          this.fireTimer <= 0 &&
          allowNewTrain &&
          playerNdc &&
          this.d < TELEGRAPH_DEPTH_MAX &&
          budgetS >= needS
        ) {
          this.telegraph = TELEGRAPH_S;
          this.telegraphFrac = 0;
          this.fireTimer = 1.5 + rng() * 0.5;
          const a = rng() * Math.PI * 2;
          this.sweepX = Math.cos(a);
          this.sweepY = Math.sin(a) * 0.6; // flatter than tall, as t330 reads
          // The aim error, perpendicular to the rake. Signed and uniform on
          // [-AIM_ERROR_NDC, +AIM_ERROR_NDC]; the 0.6 on y is the same
          // flattening the sweep carries, so the offset stays in the plane
          // the train is drawn in.
          const hv = aimHash(a, this.age, this.d);
          aimErrorCensus.bins[Math.min(19, Math.floor(hv * 20))] += 1;
          aimErrorCensus.n += 1;
          const e = AIM_ERROR_NDC * (2 * hv - 1);
          this.aimX = playerNdc.x - Math.sin(a) * e;
          this.aimY = playerNdc.y + Math.cos(a) * e * 0.6;
        }
      }
    } else {
      // Past FIRE_DEPTH_MIN (or an overtake flight, which never fires): drop
      // the flare rather than leaving it lit on an aircraft that can no
      // longer shoot. Any unpaid remainder of a train goes with it — a round
      // leaving from inside FIRE_DEPTH_MIN is the point-blank case the floor
      // exists to forbid, and finishing the train would reintroduce it.
      this.telegraph = 0;
      this.telegraphFrac = 0;
      this.burstLeft = 0;
    }
    return fired;
  }

  // Out of play: past the fly-past depth (approach/crosser), shrunk to
  // nothing on the horizon (overtake), or well off the side of the frame.
  isRetired() {
    if (Math.abs(this.ndc.x) > 1.7 || Math.abs(this.ndc.y) > 1.7) return true;
    return this.depthRate < 0 ? this.d <= this.depthB : this.d >= this.depthB;
  }

  // True if this hit destroyed it.
  damage(amount = 1) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  dispose() {
    this.sprite.material.dispose();
  }
}

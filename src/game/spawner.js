import { Enemy, APPROACH_SPAWN_DEPTH, FLY_PAST_DEPTH } from '../entities/enemy.js';
import { AudioBus } from '../audio/index.js';

// Stage-1 wave choreography.
//
// GAME_SPEC.md §4 "Wave choreography" — MEASURED on stages 1/2/3/4/7:
//
//   * "Stage openers are overtake flights": 2-4 enemies at near-player depth
//     flying AHEAD of the player, rear-aspect with glowing nozzles, receding
//     toward the horizon while weaving; killable from behind (stage 1
//     t94-99). "The prototype has no such pattern; it matters because it is
//     the first thing every stage shows." -> `_openerWave()`.
//   * "Main pattern: head-on echelons of 3-6 from the horizon, loose
//     echelon/V, growing over ~4-6 s ... firing when near-mid depth, then
//     passing the camera" (t113->117, t230->236). -> `_echelonWave()`.
//   * "Occasional near-depth lateral crossers right over the player"
//     (t118-119). -> `_crosserWave()`.
//
// Density pacing ADOPTED (`spawn_pacing.gd`): dispense ONE enemy at a time
// on a 0.2-0.5 s tick with a hard cap on how many are alive, rather than
// dumping a whole wave at once. The on-screen density target is 4-6 visible
// in combat (GAME_SPEC.md §8).
//
// Every random draw here comes from the injected seeded PRNG
// (ARCHITECTURE.md D4) — no Math.random, so `?seed=N` reproduces the same
// waves frame for frame.

// Hard cap on live enemies. Was 6, chosen to hold GAME_SPEC.md §8's raw
// "4-6 enemies visible in combat" — but the R3 judge RETIRED that criterion
// because it is satisfied by counting dots: our median on-screen count was
// 5 while the median largest enemy spanned 2.0%W. The replacement criterion
// is size-qualified (>=1 enemy at >=10%W in >=60% of combat frames), and a
// 6-enemy cap cannot deliver it: an enemy is only >=10%W for the last
// ~1.4 s of its ~5 s approach, and measurement showed roughly two thirds of
// spawns are shot down before they ever get there. The density is bought
// with POPULATION and arrival spread, deliberately NOT by slowing the
// approach: the near-field growth rate is what keeps the rendered width
// changing every 2-3 frames at readable size, and easing the approach to
// buy dwell would push those plateaus straight back into the frozen-scale
// regime that gap 5 exists to prevent. 6 -> 10 -> 12 -> 14 were each
// measured; see the dev report for the trace.
const MAX_ALIVE = 14;
const DISPENSE_MIN_S = 0.14;
const DISPENSE_MAX_S = 0.34;
// Gap between waves. MEASURED on our own capture, not guessed: the first
// values (2.6-4.2 s, with the next wave's countdown gated on the previous
// wave's queue being empty) produced a median of 2.5 enemies on screen with
// troughs down to 1 over a 20 s run (tools/out/combat-r3-09-density),
// against GAME_SPEC.md §8's density target of 4-6 visible in combat. A wave
// takes 4-6 s to cross, so the gap has to be well under that and the
// countdown has to run continuously — waves must OVERLAP, which is also what
// the arcade does (t113-119 has an echelon mid-approach while crossers pass).
const WAVE_GAP_MIN_S = 0.9;
const WAVE_GAP_MAX_S = 1.6;

// ---------------------------------------------------------------------------
// THE VERTICAL DIMENSION. R5's game-feel critique ranked this #1 of twelve and
// it is the largest single defect this lane has had: "the game is played on a
// wire". Measured on this build before the fix (tools/out/combat-r6/base/,
// 3 seeds x 120 s, every tick, 269 124 on-screen enemy samples):
//
//                      | ARCADE (hand count)  | OURS (telemetry)
//   all enemies  p5/p50/p95 %H | 14.1 / 40.0 / 72.8 | 47.7 / 56.6 / 59.0
//                sd            | 19.2               | 3.9
//                top third     | 32.5 %             | 0.01 %
//   readable >=10%W p5/p50/p95 | 14.5 / 36.0 / 59.8 | 42.6 / 53.8 / 61.6
//                top third     | 47.4 %             | 0.04 %
//
// THE ARCADE SIDE IS A HAND COUNT and its operator is published in full in
// tools/out/combat-r6/arcade-vert/labels.csv: 71 frames of ab2-longplay.mp4 at
// 3.00 s over the STAGE_MAP.md-verified spans of stages 1, 4, 6, 7, 12 and 19,
// 8 frames excluded as launch/reload/transition/unreadable, every aircraft in
// the remaining 63 read off a 1.4x upscale with a %H ruler -- 83 enemy
// observations and 61 player observations. No detector: aircraft-vs-cloud-vs-
// island segmentation over arbitrary arcade grounds is the "correct operator,
// wrong population" trap that has retired nine criteria here, and a population
// of a few aircraft per frame does not need one. Its weaknesses, stated: the
// longplay pilot is an expert, so enemies die young and the sample skews
// toward newly-arrived (small, high) aircraft; spans are eyeballed to +-2-3
// points, so observations near the 10 %W line can flip; and one frame (t517,
// a five-aircraft diagonal) contributes 5 of the 19 readable observations.
// Dropping that frame moves the readable top-third share 47.4 % -> 50.0 %, so
// the headline does not depend on it.
//
// THE DIAGNOSIS, in one line that two independently MEASURED numbers give:
// the arcade's readable-size enemies sit on the SIGHT LINE, and ours sit on
// the AIRFRAME. The arcade's player reads median 49 %H, its readable enemies
// median 36 %H -- 13 points of H above him, which is exactly
// combat.js SIGHT_NDC_Y_OFFSET (0.30 NDC = 15 %H, GAME_SPEC.md §3 MEASURED).
// Ours: player median 54.8 %H, readable enemies median 53.8 %H. One point
// apart. The gun points at a part of the sky nothing flies in.
//
// So the two endpoint bands below are quantile-matched to the arcade's two
// populations: the far-field band to the <10 %W (distant) observations, which
// is where an approach spends almost all of its life, and the near-field band
// to the >=10 %W ones.
//
// WHAT IS NOT FIXED HERE, and it is half the gap: src/entities/player.js
// ENVELOPE_Y = 1.1 against ENVELOPE_X = 2.6. The arcade player's own screen
// altitude ranges 27-67 %H (sd 8.1 over 61 observations); ours ranges
// 44.7-62.6 %H (sd 6.2 over 20 970 ticks). Even with enemies arriving high
// the player cannot climb to meet them -- only the SIGHT, which leads the
// nose by 0.30, reaches up there. That file belongs to another lane and the
// ask is in judging/R6/ask-combat.md. REACH_CEILING_NDC_Y below is the clamp
// that keeps this build playable until it lands, and it is the one number in
// this block that should MOVE when it does.
const FAR_BAND = [
  // [u, ndcY] knots of the inverse CDF of the arcade's <10 %W enemy screen
  // altitude. u=0/1 are the observed min/max (2 %H and 82 %H); the rest are
  // p5/p25/p50/p75/p95 converted by ndcY = 1 - 2*(%H/100).
  [0.0, 0.96], [0.05, 0.714], [0.25, 0.364], [0.5, 0.16], [0.75, -0.24],
  [0.95, -0.454], [1.0, -0.64],
];
const NEAR_BAND = [
  // Same, for the >=10 %W observations: min 10 %H, p5 14.5, p25 21.5,
  // p50 36.0, p75 48.0, p95 59.8, max 85 %H.
  [0.0, 0.8], [0.05, 0.71], [0.25, 0.57], [0.5, 0.28], [0.75, 0.04],
  [0.95, -0.196], [1.0, -0.7],
];

// How high a wave's near-field endpoint is allowed to finish. Derived, not
// picked: the player's sight sits at playerNdcY + 0.30 and the measured
// player ndcY ceiling on this build is +0.106 (44.7 %H, the ENVELOPE_Y = 1.1
// limit), so the sight tops out at +0.406; lockSystem.js's lock radius is
// 8.3 %W, which is +-0.166 in x and, after the 224/320 aspect term the lock
// and assist tests both apply, +-0.237 in y. +0.64 is the highest an enemy
// can finish and still be engageable at all. Everything above that is an
// aircraft the player can watch and cannot touch, which is not the arcade's
// vertical dimension -- it is a different defect.
// RAISE THIS when player.js ENVELOPE_Y does: at 1.9 the ceiling is +0.82.
//
// APPLIED AT BOTH ENDS OF THE PATH, and that is a choice rather than an
// oversight. The reachability argument only really binds on `ndcB` (where a
// wave finishes, at readable size); an enemy that starts at 5 %H and descends
// into reach is fine and is what the arcade does. Clamping `ndcA` as well
// costs the far-field distribution its top tail -- our all-enemy p5 reads
// 19.2 %H against the arcade's 14.1. It is kept because the statistic it
// would improve is the one that ALREADY MATCHES: all-enemy top-third share is
// 34.9 % against the arcade's 32.5 %, so lifting the far-field cap
// overshoots a matched figure to chase a quantile. Lift it only together with
// ENVELOPE_Y, and re-measure both columns when you do.
const REACH_CEILING_NDC_Y = 0.64;
// And a floor, for the same reason in the other direction (player ndcY floor
// -0.252, sight -0.252 + 0.30 = +0.048, minus the 0.237 reach = -0.19 -- but
// an enemy BELOW the sight is still shootable by flying at it, and the arcade
// puts 23 of its 83 observations below 62.5 %H, so the floor is the arcade's
// own p95 rather than a reach bound).
const REACH_FLOOR_NDC_Y = -0.7;

// Vertical extent one wave's formation spans, as a multiple of `rake` (which
// is +-0.45). 0.30 lets a six-ship echelon run +-0.34 NDC = 34 points of H
// nose to tail, which is the t517 ladder; a flat-raked wave is still a row.
const VERTICAL_RAKE_SCALE = 0.3;

function clampReach(y) {
  return Math.max(REACH_FLOOR_NDC_Y, Math.min(REACH_CEILING_NDC_Y, y));
}

// Inverse-CDF sample from a [u, value] knot table. `u` is a draw the caller
// has already made unconditionally (the shared-PRNG rule, see _roleFor).
function bandSample(band, u) {
  for (let i = 1; i < band.length; i++) {
    if (u <= band[i][0]) {
      const [u0, v0] = band[i - 1];
      const [u1, v1] = band[i];
      return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0);
    }
  }
  return band[band.length - 1][1];
}

// Retained as the OPENER's recede target only. The overtake flight shrinks
// toward the vanishing point, and the vanishing point is a fact about the
// camera (horizon 0.6250 H = ndcY -0.250), not a choice about altitude.
const SPAWN_NDC_Y = -0.165;

// ---------------------------------------------------------------------------
// FIRE BUDGET. At most this many enemies may have a shot train in the air at
// once, with a minimum gap between train starts.
//
// GAME_SPEC.md §4 calls enemy fire "spaced TRAINS of 4-8", and
// reference/stage7-enemy-shot-train-t330.png shows ONE train crossing the
// frame. Per-enemy timers alone do not bound that: each enemy fires every
// 1.5-2 s independently, so the threat density scales with the population,
// and this round's population went from 6 to 12 to fix combat sparsity. The
// result measured on ?demo=2 was up to 19 shots converging on a
// near-stationary scripted player, who then died at t=2.9 s and again
// within ~2 s of every respawn — the demo spent most of its 33 s dead, with
// combat cleared and frozen.
//
// Bounding TRAINS rather than shots keeps the arcade's shape (a train is
// still 4-8 shots, still spaced) while making threat density independent of
// how many aircraft are on screen, which is the property that has to hold
// as the population is tuned for the size-qualified density criterion.
//
// 2 trains, 2.72 s apart. The committed build was 1 every 2.2 s, reached by
// cutting the train rate until the death rate came down; R4 gap 5 forbids
// that direction explicitly ("the fix should be lead/accuracy and hit-box,
// not fewer shots"), and it did not work anyway. An interim attempt in the
// OTHER direction — 3 trains every 0.9 s — is the one worth explaining,
// because it looked right and measured wrong.
//
// The train count is the number of INDEPENDENT DECISIONS about where the
// player is. Every round inside one train shares a single aim snapshot and
// they all arrive inside ~0.8 s of each other, so a train either misses
// wholesale or produces a death; eight rounds in one train are barely more
// dangerous than one. Rounds per minute, which is what R4 gap 5 forbids
// cutting, is train count x train length — so the lethality can be taken out
// of the first factor and put back into the second at constant volume. That
// is the whole trade: FEWER, LONGER, TIGHTER trains.
//
// Raising the train rate instead (3 every 0.9 s) tripled the number of
// independent snapshots and the death rate did not move: 5.00/min against
// the committed 5.44/min, with the per-round hit rate pinned at ~10% in both.
// The intuition it was built on — "more fire, each round individually less
// likely to land, so a continuous readable presence instead of rare lethal
// walls" — is right about presence and wrong about lethality, because
// presence is carried by rounds and lethality by snapshots.
//
// Shot presence is preserved by the other two levers: SHOT_SPACING_S 0.08 s
// and a fixed 8-round train keep 8 fireballs in the air per train, each in
// flight for 1.3-3.1 s (enemyShots.js at 15 units/s over the 52..24 firing
// band). Two overlapping trains therefore put 10-16 fireballs on screen,
// which is what reference/stage7-enemy-shot-train-t330.png actually shows.
//
// 2.72 s and not a round number: it is SET BY MEASUREMENT, to hold rounds
// per minute at the committed build's ~117. At 2.4 s the same geometry
// delivered 138.1 rounds/min, i.e. 18% MORE fire than the build this round
// has to beat — which would have made the death-rate comparison flattering
// and meaningless; at 2.85 s, once the stage-opener re-arm below put
// non-firing overtake flights back into the MAX_ALIVE budget, it fell to
// 112.1 and read as a 4% volume CUT. Re-measure and re-set this whenever the
// firing band, the shot spacing, the train length or the alive budget moves
// — it is downstream of all four.
const MAX_CONCURRENT_TRAINS = 2;
// R6: 2.46, down from 2.72, and it is the re-measurement this constant's own
// comment demands rather than a difficulty change. TWO things moved the alive
// budget this round without touching the fire budget, and each cost volume:
//
//   * the vertical-track work above -- enemies now cross the sight line, so
//     the vulcan's assist cone finally has something in it and the population
//     turns over faster (kills per 180 s per seed 9/7/15 -> 26/27/38).
//     Measured volume 126.5 -> 120.4 rounds/min on the same three seeds;
//     2.72 -> 2.59 put it back to 129.8.
//   * enemy.js abandonTrain() on the respawn edge, which cancels a train that
//     was aimed at the previous life. It is a fairness fix and it destroys
//     rounds: 129.8 -> 120.7 rounds/min over 7 seeds x 300 s.
//
// R4 gap 5 forbids buying the death rate with a volume cut, and that applies
// to volume lost as a SIDE EFFECT just as much as to volume cut on purpose --
// otherwise every fix that happens to reduce fire is a free difficulty
// reduction. So the volume is put back here, 2.59 x 120.7/127.1 = 2.46, and
// the lethality is taken out of enemyShots.js SPEED instead.
const TRAIN_START_GAP_S = 2.46;

// ---------------------------------------------------------------------------
// ROLE MIX PER STAGE — how much of each stage's sky is the elite livery.
//
// `role` is a VISUAL identity and is deliberately independent of `type`,
// which is the flight model (see src/entities/enemy.js's LIVERY_BY_STAGE
// note). They used to be the same axis and that was a real defect: two wave
// builders independently prefer the fast `interceptor` TYPE for pacing
// reasons — every crosser is one because a near-field lateral pass wants to
// be quick, and echelons rolled one in four — so once the sprite lane's
// authored art landed, a third of stage 1 was rust-red delta airframes. The
// lead's capture `tools/out/dash-r5/s1-combat/frame-0000.png` has four of
// them against one grey. Stage 1's arcade cast is slender swept grey jets.
//
// The fractions are a DIFFICULTY-AND-IDENTITY ramp, not a measurement: the
// arcade gives us single timestamps for each livery (GAME_SPEC.md §4, t102.5
// and t172 for interceptors) and no per-stage census, so this is ADOPTED. It
// is chosen so every stage shows BOTH silhouette families — the `mig` line
// aircraft and the `delta` elite — which is what R4 gap 1 criterion (d)
// asks for, while keeping each stage's dominant colour the one the frames
// show.
// ---------------------------------------------------------------------------
// THE THROTTLE, applied to enemy closure. judging/R6/ask-flow.md A6: the
// throttle is a real verb and has been since R5, but it drives ground scroll,
// engine gain and the HUD gauge and nothing else -- so the world looks faster
// and the fight does not change. This is the half of that which is combat's.
//
// M IS THE DATUM AND ITS MULTIPLIER IS EXACTLY 1. Every flight constant this
// project has MEASURED was read off footage with the throttle at M throughout
// (the criteria lane has published that as a MEASURED NEGATIVE: the pilot in
// the only stage-mapped recording never touches it, 27 samples). So L and H
// are excursions either side of a middle that must reproduce the measured
// build bit for bit, and the two outer values are ADOPTED, not measured.
//
// THE MAGNITUDES ARE BOUNDED, not chosen by feel. The obvious move is to
// reuse flow.js's THROTTLE_SCROLL_MULT [0.62, 1.0, 1.45] so the sky and the
// ground agree -- and it breaks a MEASURED criterion. An approach runs
// APPROACH_SPAWN_DEPTH -> FLY_PAST_DEPTH in ln(90/2.6)/0.7089 = 5.00 s, and
// GAME_SPEC.md §4 measures that approach at 4-6 s. Scaling the depth rate
// divides the duration:
//
//   multiplier   approach      inside the measured 4-6 s band?
//     0.62         8.06 s      NO
//     0.85         5.88 s      yes
//     1.00         5.00 s      yes  (the datum)
//     1.20         4.17 s      yes
//     1.45         3.45 s      NO
//
// So the band itself fixes the widest excursion that is allowed: >= 5/6 =
// 0.833 at L and <= 5/4 = 1.25 at H. 0.85 and 1.20 sit just inside both, and
// they are the whole range the measurement leaves available. The throttle
// therefore cannot make the sky rush at you the way it makes the ground rush
// past you; that asymmetry is already documented in enemy.js's header as
// something the arcade itself carries.
//
// ---------------------------------------------------------------------------
// AND IT IS SHIPPED INERT AT [1, 1, 1]. THE PLUMBING IS LIVE; THE EFFECT IS
// WITHDRAWN. This is a measured withdrawal, not an unfinished edit.
//
// [0.85, 1.0, 1.20] was built, run and measured (7 seeds x 300 s, the same
// instrument and arms as the SPEED sweep in enemyShots.js):
//
//                      rounds/min   deaths/min wall   pHit %
//   closure inert        130.6        2.171 +-0.249    2.481
//   closure [0.85..1.2]  121.3        2.371 +-0.260    3.030
//
// It breaks BOTH of this round's constraints at once, and the mechanism is
// the one enemy.js's "MOVE NONE OF THESE FOUR ALONE" note warns about --
// closure rate turns out to be a FIFTH member of that solution set:
//
//   * VOLUME, -7 %. The train gate needs TELEGRAPH_S + 3 x SHOT_SPACING_S of
//     depth budget above FIRE_DEPTH_MIN, and budget is ln(d/24)/|depthRate|.
//     Scaling the depth rate by 1.2 shortens the band crossing from 1.09 s
//     to 0.91 s, so fewer aircraft qualify to open a train at all. R4 gap 5
//     forbids losing enemy fire volume, side effect or not.
//   * LETHALITY, +9 %. Faster closure means a flare that lit at a given
//     depth pays out from LOWER depths, which shortens the time of flight
//     and therefore the fairness lag -- the exact quantity the SPEED sweep
//     spent the round buying.
//
// Restoring both would mean re-setting TRAIN_START_GAP_S and SPEED again,
// with the firing geometry now depending on a player input that no
// measurement covers. That is a round's work, not a line, and trading a
// measured lethality result for an unmeasured speed cue is the wrong way
// round. Left wired and inert so the next lane gets the interface, the
// bound and the measured cost, and can turn it on in one line with its eyes
// open. A half-strength [0.92, 1.0, 1.10] is the obvious next arm and was
// NOT measured.
const THROTTLE_CLOSURE_MULT = [1, 1, 1];

const ELITE_FRACTION_BY_STAGE = [0.12, 0.22, 0.30];

// Crossers are near-field lateral passes and the most visually prominent
// single aircraft in any frame, so they carry a higher elite share than the
// echelon line — one red delta crossing right over the player reads as the
// stage's elite without tinting the whole sky.
const CROSSER_ELITE_BONUS = 0.18;

export class Spawner {
  constructor(scene, space, rng) {
    this.scene = scene;
    this.space = space;
    this.rng = rng;
    this.enemies = [];
    this.pending = [];
    this.dispenseTimer = 0;
    this.waveTimer = 0;
    this.waveIndex = 0;
    this.openerDone = false;

    // `?combatsolo=1` — measurement-only: emit exactly ONE head-on fighter
    // at a time, straight up the middle, and do not emit the next until it
    // has retired. The single-subject invariant is the point: with a normal
    // wave on screen, a per-frame width measurement silently mixes two
    // enemies at different depths and manufactures scale jumps that look
    // like a frozen-scale defect but are a segmentation artefact. Never
    // read in normal play.
    // Which stage's liveries the enemies wear. Set by Combat.setStageIndex;
    // defaults to stage 1, which is what every judge capture is taken on.
    // src/entities/enemy.js owns the stage -> livery mapping.
    this.stageIndex = 0;

    this.trainGapTimer = 0;
    this.trainsStarted = 0;
    this.solo =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('combatsolo');
  }

  get aliveCount() {
    return this.enemies.length;
  }

  setStageIndex(stageIndex) {
    // A STAGE CHANGE RE-ARMS THE OPENER, and this is load-bearing rather
    // than tidy.
    //
    // GAME_SPEC.md §4 is explicit that the overtake flight is "the first
    // thing every stage shows" — not just the first stage — and cites it on
    // stages 1, 2 and 4 (t94-99, t126-128, t204). The re-arm used to live in
    // clear(), which src/game/flow/ called at every stage boundary. R5's
    // game-feel work correctly stopped clearing combat at stage boundaries
    // and on death (clearing the sky was our addition, not the arcade's), and
    // that silently took the opener with it: MEASURED on this build before
    // the fix, `?fixed=1&demo=2&seed=1` ran 90 s across three stages and
    // produced overtake aircraft ONLY in the first 5 s of stage 1 — stages 2
    // and 3 opened with no opener at all. It also meant stage 2's silver/blue
    // prop livery never appeared, because the opener is the only wave that
    // wears it; a 3-seed livery census read 0.0% prop.
    //
    // Keying the re-arm to the stage index instead makes this file own its
    // own invariant rather than depending on another lane's call order.
    // `contentStageIndex` wraps 0,1,2,0,... so a lap re-arms correctly too.
    if (stageIndex !== this.stageIndex) this.openerDone = false;
    this.stageIndex = stageIndex;
  }

  // Visual role for one aircraft. `roll` is a draw the caller has ALREADY
  // made unconditionally — passing it in rather than drawing here is the
  // CLAUDE.md shared-PRNG rule: a draw that only sometimes happens shifts
  // every later draw in the stream and makes seeds incomparable between
  // builds.
  _roleFor(roll, bonus = 0) {
    const f = (ELITE_FRACTION_BY_STAGE[this.stageIndex] ?? ELITE_FRACTION_BY_STAGE[0]) + bonus;
    return roll < f ? 'elite' : 'line';
  }

  // Returns an array of fire requests from enemies that shot this tick.
  // `playerNdc` is forwarded to each enemy so it can snapshot an aim point
  // when its telegraph lights (src/entities/enemy.js). `throttleIndex` is
  // 0/1/2 = L/M/H and scales enemy closure (THROTTLE_CLOSURE_MULT).
  update(dt, playerNdc = null, throttleIndex = 1) {
    const closure = THROTTLE_CLOSURE_MULT[throttleIndex] ?? 1;
    if (this.solo) return this._updateSolo(dt);
    if (!this.openerDone) {
      this.openerDone = true;
      // The opener is the overtake flight PLUS a primed head-on element
      // already part-way in. Without the primed element the stage opens with
      // nothing at readable size for ~5 s: the overtake flight recedes from
      // the moment it appears, and a head-on echelon spawned at the horizon
      // needs its full ~5 s approach before it is large. Measured as a 4.9 s
      // dead patch at the head of every run. The arcade's stage 1 is engaged
      // within a couple of seconds (t94-99).
      // Primed element FIRST in the queue. Dispensing is one aircraft every
      // 0.14-0.34 s, so queueing the 2-4 overtake aircraft ahead of it
      // delayed the primed element by up to 1.4 s on top of its own ~2 s
      // approach — measured as a 3.9 s hole starting at t=0.9 s, right after
      // the openers recede past readable size.
      this.pending.push(...this._primedEchelon(), ...this._openerWave());
    }

    this.dispenseTimer -= dt;
    if (this.pending.length && this.dispenseTimer <= 0 && this.enemies.length < MAX_ALIVE) {
      const cfg = this.pending.shift();
      // Stamped at dispense rather than at wave construction: a wave can sit
      // in `pending` across a stage boundary, and an aircraft should wear the
      // livery of the stage it actually flies into.
      const e = new Enemy({ ...cfg, stageIndex: this.stageIndex });
      this.scene.add(e.sprite);
      this.enemies.push(e);
      this.dispenseTimer = DISPENSE_MIN_S + this.rng() * (DISPENSE_MAX_S - DISPENSE_MIN_S);
    }

    // Runs unconditionally, so waves overlap rather than queueing strictly
    // one after another. The alive cap above is what actually limits
    // density; the queue is just a dispensing buffer.
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.pending.push(...this._nextWave());
      this.waveTimer = WAVE_GAP_MIN_S + this.rng() * (WAVE_GAP_MAX_S - WAVE_GAP_MIN_S);
    }

    this.trainGapTimer -= dt;
    const trainsActive = this.enemies.reduce((n, e) => n + (e.firingTrain ? 1 : 0), 0);
    let allowNewTrain = trainsActive < MAX_CONCURRENT_TRAINS && this.trainGapTimer <= 0;

    const fires = [];
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const wasFiring = e.firingTrain;
      const fired = e.update(dt, this.rng, this.space, allowNewTrain, playerNdc, closure);
      if (!wasFiring && e.firingTrain) {
        // This enemy just opened a train — consume the budget for this tick
        // and start the spacing gap.
        allowNewTrain = false;
        this.trainGapTimer = TRAIN_START_GAP_S;
        // Cumulative, measurement-only (combat.js's __fairness hook). A
        // train now opens with its TELEGRAPH, so this is also the count of
        // flares lit.
        this.trainsStarted += 1;
      }
      if (fired) fires.push({ enemy: e, fire: fired });
      if (!e.alive || e.isRetired()) {
        // FLY-PAST ROAR. `playEnemyFlyPast` has been a complete, enveloped,
        // stereo-panned synth with ZERO call sites since R4 (sfx.js:134,
        // registered at sfx.js:362); the R5 game-feel critique ranked it 9
        // and judging/R6/ask-flow.md A2 routed the call site here, which is
        // correct -- this is the only place that knows the despawn edge, and
        // polling for it from game.js would fire twice or on the wrong one.
        //
        // Gated on a NEAR despawn, not on every retirement. `isRetired()`
        // has three exits: past the fly-past depth, off the side of the
        // frame, and shrunk past the opener's recede target. Only the first
        // is an aircraft going over the player's head; an overtake flight
        // dwindling to a dot at the horizon must not roar, and nor must a
        // crosser that has already left the frame. `depthRate < 0` is the
        // receding case (enemy.js signs it from the authored endpoints).
        if (e.alive && e.depthRate > 0 && e.d <= e.depthB * 1.05 && Math.abs(e.ndc.x) <= 1.2) {
          const pan = Math.max(-1, Math.min(1, e.ndc.x));
          AudioBus.play('enemyFlyPast', { panFrom: pan, panTo: Math.sign(pan || 1) });
        }
        e.retired = true;
        this.scene.remove(e.sprite);
        e.dispose();
        this.enemies.splice(i, 1);
      }
    }
    return fires;
  }

  _updateSolo(dt) {
    if (!this.enemies.length) {
      const e = new Enemy({
        pattern: 'approach',
        type: 'fighter',
        depthA: APPROACH_SPAWN_DEPTH,
        depthB: FLY_PAST_DEPTH,
        // Straight up the middle so the subject never clips a frame edge
        // before reaching fly-past depth, and ends just above the player.
        ndcA: [0, SPAWN_NDC_Y],
        ndcB: [0, 0.1],
        fireDelay: 1e9, // never fires: the harness measures the airframe only
      });
      this.scene.add(e.sprite);
      this.enemies.push(e);
    }
    const e = this.enemies[0];
    e.update(dt, this.rng, this.space);
    if (!e.alive || e.isRetired()) {
      e.retired = true;
      this.scene.remove(e.sprite);
      e.dispose();
      this.enemies.length = 0;
    }
    return [];
  }

  // Remove an enemy immediately (called when something kills it, so the
  // bracket can jump on the same tick the explosion appears).
  remove(enemy) {
    const i = this.enemies.indexOf(enemy);
    if (i >= 0) {
      enemy.retired = true;
      this.scene.remove(enemy.sprite);
      enemy.dispose();
      this.enemies.splice(i, 1);
    }
  }

  _nextWave() {
    this.waveIndex += 1;
    // 3 echelons to 1 crosser pass. The crossers are "occasional" in the
    // measurement, and they are the pattern that most crowds the near field.
    // Every third wave is a crosser pass rather than every fourth: crossers
    // are near-field by construction and are the cheapest way to keep a
    // readable-size aircraft on screen between echelon arrivals.
    const specs = this.waveIndex % 3 === 0 ? this._crosserWave() : this._echelonWave();
    // WAVE IDENTITY, measurement only — nothing in the simulation branches on
    // it. Needed because "the enemies arrive in a single-file diagonal queue"
    // is a statement about a FORMATION, and a formation is a property of one
    // wave. Measured over the pooled live population it is meaningless: 3-5
    // waves are in flight at once by construction (WAVE_GAP 0.9-1.6 s against
    // a ~5 s approach), so the pooled depth spread reads 17x max/min no matter
    // how tight each formation is. That is the I9/I26 defect class — a correct
    // operator pointed at the wrong population — so the population is made
    // addressable instead of inferred.
    for (const s of specs) s.waveId = this.waveIndex;
    return this._shuffleDispenseOrder(specs);
  }

  // THE SINGLE-FILE DIAGONAL QUEUE, and why it was structural rather than a
  // tuning error.
  //
  // Measured (3 seeds, ?fixed=1&demo=1&invincible=1, every 4 ticks, 7 944
  // flight samples, 85 waves, 15 089 per-wave observations): WITHIN one wave
  // the absolute correlation between a member's depth and its screen x had
  // median 0.85, p75 0.94, and 59.3 % of observations above 0.8. A wave was
  // therefore a line of aircraft running diagonally away from the camera,
  // which is exactly the complaint.
  //
  // The cause is not the formation geometry — `depthA` is drawn independently
  // per member (0.70-1.20 x spawn depth) and is not monotonic in member index.
  // It is the DISPENSE ORDER. `pending` is a FIFO drained one aircraft every
  // 0.14-0.34 s, so member i enters the world i dispense-ticks before member
  // i+1 and has that much more depth travel behind it: depth becomes monotonic
  // in i. And i maps monotonically to the lateral slot (`ndcB: baseB + k*0.26`
  // with k = i - (n-1)/2). Two monotonic maps through the same index compose
  // into a perfect depth-vs-screen-x ordering, every wave, in the same
  // direction.
  //
  // So the fix is to break the composition, not the geometry: shuffle the
  // order the members are HANDED TO THE DISPENSER, leaving every member's
  // spec — fan-out, rake, depth spread, bomber slot, liveries — byte for byte
  // unchanged. The leading aircraft is now at a random lateral slot.
  //
  // Deliberately NOT done by compressing the depth spread, which is the other
  // way to make a wave read as a formation. That spread is what buys the
  // size-qualified density criterion (>=1 enemy at >=10%W in >=60% of combat
  // frames); it measures 84.87 % on this tree, and the comment on `depthA`
  // records that an earlier, tighter spread measured 53 %. Spending measured
  // headroom on an unmeasured impression is the trade this project has
  // retired four criteria for.
  //
  // PRNG: n-1 draws, taken unconditionally for every wave, after the wave is
  // fully built — so it cannot desynchronise draws WITHIN a wave (CLAUDE.md,
  // "Shared PRNG stream sequencing"). It does shift the stream relative to
  // older builds, so seed-for-seed comparisons against figures taken before
  // this landed are not valid; the A/B in judging/R5/lane-combatfx.md was
  // re-taken after it.
  _shuffleDispenseOrder(specs) {
    for (let i = specs.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const t = specs[i];
      specs[i] = specs[j];
      specs[j] = t;
    }
    return specs;
  }

  // --- Stage opener: overtake flight ----------------------------------------
  // Near depth, REAR aspect, receding toward the horizon while weaving.
  _openerWave() {
    const n = 2 + Math.floor(this.rng() * 3); // 2-4
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      out.push({
        pattern: 'overtake',
        type: this.rng() < 0.3 ? 'interceptor' : 'fighter',
        // Openers start CLOSE and recede slowly. They are the only thing on
        // screen for the first few seconds (the first head-on echelon needs
        // ~5 s to arrive), so if they start small and shrink there is a cold
        // open with nothing readable in frame — measured as a 4.9 s gap at
        // the head of every run.
        depthA: 4 + this.rng() * 3,
        depthB: APPROACH_SPAWN_DEPTH,
        // Starts spread across the frame near the player's altitude, and
        // converges on the vanishing point as it recedes.
        ndcA: [k * 0.42 + (this.rng() - 0.5) * 0.12, -0.02 + (this.rng() - 0.5) * 0.2],
        ndcB: [k * 0.03, SPAWN_NDC_Y],
        weaveAmp: 0.1 + this.rng() * 0.1,
        weaveRate: 1.4 + this.rng() * 1.1,
        weavePhase: this.rng() * Math.PI * 2,
      });
    }
    return out;
  }

  // Head-on element seeded part-way through its approach, used only at
  // stage open. Spawn depths are far enough out that each member still
  // appears at 2-4 native px and grows in — no pop-in at readable size.
  _primedEchelon() {
    const n = 3;
    const baseB = (this.rng() - 0.5) * 0.3;
    // Same two vertical-track draws as a normal echelon. The stage opener is
    // the first thing a player sees of every stage (GAME_SPEC.md §4), so it
    // is the worst place to leave a flat level pass.
    const baseAy = clampReach(bandSample(FAR_BAND, this.rng()));
    const baseBy = clampReach(bandSample(NEAR_BAND, this.rng()));
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      out.push({
        pattern: 'approach',
        type: 'fighter',
        role: 'line',
        depthA: 18 + this.rng() * 16,
        depthB: FLY_PAST_DEPTH,
        ndcA: [k * 0.06, baseAy + k * 0.03],
        // The per-member draw is KEPT (it is one of this wave's three
        // unconditional draws and removing it would shift the stream for no
        // gain); it now jitters around the wave's own near-field altitude
        // instead of around a fixed one.
        ndcB: [baseB + k * 0.24, clampReach(baseBy + k * 0.16 + (this.rng() - 0.5) * 0.2)],
        weaveAmp: this.rng() * 0.04,
        weaveRate: 1.1 + this.rng() * 0.9,
        weavePhase: this.rng() * Math.PI * 2,
        // The primed element NEVER fires, and now by geometry rather than by
        // a long timer. It spawns at depth 18-34 and the firing band's floor
        // is 24 (src/entities/enemy.js), so after the 1.0 s telegraph it is
        // at depth 8.8-16.7 — under the floor — whatever this delay says.
        // Kept explicit and large so the intent survives a band retune: a
        // stage opens with aircraft to shoot at, not with a train already
        // inbound (GAME_SPEC.md §4's opener is an overtake flight the player
        // kills from behind), and the old 0.9-1.7 s delay here was measured
        // killing the player at t=1.4-1.7 s on all five seeds.
        fireDelay: 1e9,
      });
    }
    return out;
  }

  // --- Main pattern: head-on echelon ---------------------------------------
  _echelonWave() {
    const n = 3 + Math.floor(this.rng() * 4); // 3-6
    // Loose echelon / V: `rake` tilts the formation so it reads as a
    // diagonal line of aircraft rather than a flat row.
    const rake = (this.rng() - 0.5) * 0.9;
    const baseB = (this.rng() - 0.5) * 0.36;
    // THE WAVE'S VERTICAL TRACK. Two draws, INDEPENDENT on purpose: `baseAy`
    // is where the wave is first visible and `baseBy` is where it passes the
    // camera, and drawing them separately is what produces approaches from
    // ABOVE (baseAy high, baseBy low -- the wave dives at you) and from BELOW
    // in the same proportion the two measured marginals imply. Correlating
    // them would make every wave a level pass again, which is the defect.
    // Only the marginals are measured; the joint is not, and independence is
    // the choice that maximises vertical travel. Stated as ADOPTED.
    const baseAy = clampReach(bandSample(FAR_BAND, this.rng()));
    const baseBy = clampReach(bandSample(NEAR_BAND, this.rng()));
    // Vertical rake, 2.5x the old value. The arcade's formations are
    // VERTICAL LADDERS as often as they are flat rows: t517 is five aircraft
    // running 10 -> 57 %H across one frame (0.47 NDC), t785 is three inside
    // 3 points of each other. `rake` already carried that variation
    // laterally; it was multiplied by 0.12 vertically, which capped a
    // six-ship echelon's vertical extent at +-0.135 NDC and made every
    // formation read as a row however it was raked.
    const vrake = rake * VERTICAL_RAKE_SCALE;
    // ONE bomber leads roughly every third echelon (R4 gap 10, "enemy
    // variety"). GAME_SPEC.md §4 names the type — "much larger dark airframe
    // at close depth that drops a round black bomb ... AND fires shot trains"
    // (stage 7, t318) — and ENEMY_TYPES has carried its 1.35x width and 2 hp
    // since R3, but nothing ever spawned one, so every aircraft in the game
    // was a fighter or an interceptor at the same size. A bomber reads as a
    // different aircraft at a glance purely on span, which is the part of
    // "at least two distinguishable silhouettes" this lane can deliver
    // without touching enemySprite.js.
    //
    // Drawn ONCE per wave, outside the member loop, deliberately: CLAUDE.md's
    // shared-PRNG rule — a conditional draw inside the loop would shift every
    // later draw by a different amount depending on how many members a wave
    // happens to have, which makes seeds incomparable between builds.
    const bomberSlot = this.rng() < 0.34 ? Math.floor(this.rng() * n) : -1;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      // The type draw happens unconditionally and is then overridden, rather
      // than being skipped for the bomber slot: a draw that only sometimes
      // happens desynchronises every later draw in the stream (CLAUDE.md,
      // "Shared PRNG stream sequencing").
      const roll = this.rng();
      // Second unconditional draw, for the VISUAL role. Separate from the
      // type roll above on purpose: a fast interceptor-type aircraft in a
      // stage-1 echelon should usually still be a grey MiG.
      const roleRoll = this.rng();
      out.push({
        pattern: 'approach',
        type: i === bomberSlot ? 'bomber' : roll < 0.25 ? 'interceptor' : 'fighter',
        // A bomber is the 'heavy' role whatever it rolled — it is already
        // visually distinct on span (1.35x) and should read as the line's
        // own big aircraft, not as an elite.
        role: i === bomberSlot ? 'heavy' : this._roleFor(roleRoll),
        // Wide per-member depth spread. At the previous 0.85-1.15 the whole
        // echelon reached the near field inside ~1.5 s of itself, so the
        // readable-size window arrived as a CLUMP followed by a gap: the
        // measured trace was 1-3 s of "big enemy present" alternating with
        // gaps of up to 4.9 s, and only 53% of frames had an enemy >=10%W
        // even with 10 alive. 0.60-1.30 strings a single echelon's arrivals
        // out over ~1.1 s of extra depth travel on top of the dispense
        // stagger — which is also what a LOOSE echelon is (GAME_SPEC.md §4),
        // aircraft at different ranges, not line abreast.
        depthA: APPROACH_SPAWN_DEPTH * (0.70 + this.rng() * 0.50),
        depthB: FLY_PAST_DEPTH,
        // Spawn points sit in a tight cluster just above the horizon — at
        // 90 units out the whole echelon is a handful of pixels wide, which
        // is how a wave first reads in the arcade.
        ndcA: [k * 0.05 + (this.rng() - 0.5) * 0.02, baseAy + k * vrake * 0.05],
        // and fans out across the frame on the way in.
        ndcB: [baseB + k * 0.26, clampReach(baseBy + k * vrake)],
        weaveAmp: this.rng() * 0.05,
        weaveRate: 1.1 + this.rng() * 0.9,
        weavePhase: this.rng() * Math.PI * 2,
        // SHORT first-fire delay, 0.1-0.4 s — down from 1.6-3.0 s, and the
        // reversal is forced by the telegraph geometry, not a difficulty
        // choice.
        //
        // An approach aircraft lives 5.0 s from depth 90 and the firing band
        // is 52..24 (src/entities/enemy.js), i.e. it is eligible to fire only
        // between t=0.77 s and t=1.86 s of its own life. A 1.6-3.0 s delay
        // therefore means the aircraft becomes willing to fire at a depth it
        // is already forbidden to fire from: measured, every flare lit at
        // depth 18-22 and 148 trains across 180 s delivered 12 rounds.
        // The delay has to be short enough that the flare — which itself
        // takes TELEGRAPH_S = 1.0 s — can light while the aircraft is still
        // above the band.
        //
        // What the old long delay was protecting against is now handled by
        // the flare rather than by silence: its comment was about a train
        // arriving within a second of the 2 s respawn invincibility expiring.
        // A train that opens with a 1.0 s pulsing flare and then needs
        // another 0.9-2.1 s of flight is announced ~2-3 s ahead, which is
        // longer than the grace window it was being hidden behind.
        fireDelay: 0.0 + this.rng() * 0.15,
      });
    }
    return out;
  }

  // --- Occasional near-depth lateral crossers -------------------------------
  _crosserWave() {
    const n = 2 + Math.floor(this.rng() * 2); // 2-3
    const dir = this.rng() < 0.5 ? -1 : 1;
    // A crosser reaches depth 3.0, so it is a READABLE-SIZE aircraft by
    // construction and belongs to the >=10 %W population -- it draws its
    // endpoints from NEAR_BAND at both ends, and the two draws being
    // independent is what makes a crosser climb across the frame or dive
    // across it rather than slide along one line. The old pair
    // (-0.1 +- 0.09 in, -0.40..-0.10 out) was a shallow downward slide at
    // the player's own altitude, every time.
    const crossAy = clampReach(bandSample(NEAR_BAND, this.rng()));
    const crossBy = clampReach(bandSample(NEAR_BAND, this.rng()));
    const out = [];
    for (let i = 0; i < n; i++) {
      const roleRoll = this.rng();
      out.push({
        pattern: 'crosser',
        type: 'interceptor',
        role: this._roleFor(roleRoll, CROSSER_ELITE_BONUS),
        depthA: 30 + this.rng() * 14,
        depthB: 3.0,
        // ndcB was dir*(1.35..1.65) — far enough off-frame that a crosser
        // left the visible area BEFORE it reached its fly-past depth.
        // Measured: only 20% of crossers ever rendered at >=10%W on screen,
        // median peak 5.9%W, so the pattern that is supposed to put a big
        // aircraft right over the player was contributing 3.2 enemy-seconds
        // of readable size out of 36 across a 33 s run. 0.80..1.00 keeps the
        // fly-past inside the frame and still exits the side afterwards.
        ndcA: [dir * (-0.45 - this.rng() * 0.2), clampReach(crossAy + (this.rng() - 0.5) * 0.18)],
        ndcB: [dir * (0.55 + this.rng() * 0.20), clampReach(crossBy + (this.rng() - 0.5) * 0.3)],
        weaveAmp: 0.03,
        weaveRate: 1.8,
        weavePhase: this.rng() * Math.PI * 2,
        // Crossers also no longer fire in practice, and this is a KNOWN
        // consequence of the band retune rather than an intent: they spawn at
        // depth 30-44 as interceptors (depth rate 0.8862), so 1.0 s of
        // telegraph puts them at depth 12-18, under the 24 floor. Left as it
        // is because GAME_SPEC.md §4 describes the crosser as a near-depth
        // fly-past pattern and says nothing about it firing, and because the
        // alternative — a pattern that fires from inside the floor — is the
        // point-blank case the floor exists to forbid. Recorded in
        // judging/R5/lane-combatfx.md as a volume source given up.
        fireDelay: 0.4 + this.rng() * 0.6,
      });
    }
    return out;
  }

  clear() {
    for (const e of this.enemies) {
      this.scene.remove(e.sprite);
      e.dispose();
    }
    this.enemies.length = 0;
    this.pending.length = 0;
    // Re-arm the opener. clear() is called at every stage boundary (and on
    // death) by src/game/flow/, and GAME_SPEC.md §4 is explicit that the
    // overtake flight is "the first thing every stage shows" — not just the
    // first. Leaving openerDone latched meant every stage after the first
    // rebuilt its sky from empty with no opener and no primed element, which
    // is a multi-second dead patch exactly where the arcade is busiest.
    this.openerDone = false;
    this.waveTimer = 0;
    this.dispenseTimer = 0;
  }
}

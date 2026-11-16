import { Enemy, APPROACH_SPAWN_DEPTH, FLY_PAST_DEPTH } from '../entities/enemy.js';
import { AudioBus } from '../audio/index.js';
import { gunTunable } from '../weapons/tunables.js';
// Imported, not transcribed: the guard below has to compare against the LIVE
// value, and a copied number is the exact failure this file is guarding.
import { ENVELOPE_X } from '../entities/player.js';

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

// ---------------------------------------------------------------------------
// `?pace=key=value,...` — MEASUREMENT-ONLY override of this file's pacing
// constants. Same family and same contract as `?gun=` (src/weapons/tunables.js):
// unknown keys are a HARD ERROR rather than a silent default, so a typo'd arm
// cannot present as the shipped build in a table.
//
// It is local to this file rather than added to `tunables.js` because that
// file belongs to the combat lane and this one belongs to pacing; a lane that
// reaches into another lane's file to add a key is the cross-lane edit
// CLAUDE.md forbids. The duplication is nine lines and the alternative is a
// merge conflict on a shared file in a five-lane round.
const PACE_KEYS = new Set([
  'maxalive', // hard cap on live enemies
  'gapmin', // shortest gap between wave starts, seconds
  'gapmax', // longest gap between wave starts, seconds
  'dispmin', // shortest gap between single-aircraft dispenses
  'dispmax', // longest gap between single-aircraft dispenses
  'corridor', // half-width of the lateral dead zone kept clear of the player
  'openerspan', // size of the stage opener's overtake flight: n = 2 + rng*this
  'traingap', // seconds between enemy fire-train starts
  'trains', // how many enemy fire trains may be in the air at once
  // R13 population/routing levers (see the loiter block below):
  'baitevery', // every Nth wave is a lock-bait loiter cluster (0 = never)
  'baitymin', // bottom of the lock-bait vertical hold band, NDC (R16)
  'baitymax', // top of the lock-bait vertical hold band, NDC (R16)
  'dwellfrac', // fraction of echelon members that gun-dwell at readable depth
  'flyby', // seconds between large close flyby events (0 = never)
  'deadmax', // longest empty-sky stretch tolerated before a wave is forced
  // R32 CLOSE-DROUGHT clip (see the _closeDrought block below):
  'closedrought', // longest stretch with NO close enemy before one is forced (0 = off)
  'closedepth', // depth at/below which an enemy counts as "close" for the clip
  // R15 BURST-WALL levers (see the _burstWave block below):
  'burstevery', // 0 = no bursts (pre-R15 rotation); n>0 = among non-bait, non-
  //               crosser waves, every nth is a close-dwell WALL, the rest echelons
  'burstmin', // fewest aircraft in a burst wall
  'burstmax', // most aircraft in a burst wall
  'burstcap', // transient alive cap while a burst wall is being dispensed
  'bursthold', // centre of the burst wall's close-depth hold time, seconds (+-0.35)
]);
let paceOverrides = null;
function paceTunable(key, fallback) {
  if (!PACE_KEYS.has(key)) throw new Error(`paceTunable: "${key}" is not a declared key`);
  if (!paceOverrides) {
    paceOverrides = new Map();
    const raw =
      typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('pace');
    for (const pair of (raw ?? '').split(',')) {
      if (!pair) continue;
      const i = pair.indexOf('=');
      const k = (i < 0 ? pair : pair.slice(0, i)).trim();
      const v = i < 0 ? '1' : pair.slice(i + 1).trim();
      if (!PACE_KEYS.has(k)) {
        throw new Error(
          `?pace: unknown key "${k}". Known: ${[...PACE_KEYS].join(', ')}. ` +
            'Refusing to run rather than silently measuring the shipped default.',
        );
      }
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`?pace: "${k}" is not a finite number ("${v}").`);
      paceOverrides.set(k, n);
    }
  }
  return paceOverrides.has(key) ? paceOverrides.get(key) : fallback;
}

// ---------------------------------------------------------------------------
// THE POPULATION. R9 gap 0, and it is the one place in this file where the
// honest change is to DELETE an argument rather than to improve it.
//
// SHIPPED BEFORE THIS ROUND: MAX_ALIVE = 14, WAVE_GAP 0.9-1.6 s, dispense
// 0.14-0.34 s. The comment that stood here derived 14 from R3's size-qualified
// density gate — "at least one enemy at >=10 %W in at least 60 % of combat
// frames" — and recorded the sweep 6 -> 10 -> 12 -> 14 that reached it.
//
// **THAT GATE HAS NO ARCADE SIDE AND THE ARCADE FAILS IT.** Three hand counts,
// three readers, three independent frame samples, all on STAGE_MAP.md-verified
// spans with the stage digit read on every frame:
//
//   readable (>=10 %W) enemy present   frames  stages  reader
//     16.7 %                             18      3     R8 feel critic
//     19.0 %                             63      6     R6 combat lane's labels.csv, re-analysed
//     28.6 %                             21      4     this lane, judging/R9/arcade-count-rule.md
//     ----                             ------          pooled 84 frames, 8 stages: 21.4 %
//     >= 60 %                                          R3's gate
//     87-96 % (idle) / 53-67 % (tracking pilot)        what this file shipped
//
// The three counts disagree by 12 points on presence and agree to a point on
// the SHAPE that causes it: 77.1 / 79.2 % of the arcade's own enemy aircraft
// are drawn below 10 %W, median span 4 - 4.5 %W on both. The arcade's sky is
// mostly specks. R3's gate asks for the opposite and `MAX_ALIVE` was swept
// against it with our own build on both sides of the comparison.
//
// AND THE LOAD-BEARING CLAUSE OF THE OLD DERIVATION EXPIRED IN R8. It read
// "roughly two thirds of spawns are shot down before they ever reach readable
// size", which is what forced the cap up. R8 shipped `READABLE_SPAN_FRAC` in
// `vulcan.resolveHits`, which makes it IMPOSSIBLE for the gun to kill an
// aircraft below 10 %W at all. Measured on this tree before the change, every
// arm, every seed: gun kills below the gate **0.0 %**. The population no
// longer leaks away before it becomes readable, so the mechanism the cap was
// compensating for does not exist.
//
// WHAT THE NEW VALUES ARE SET BY, and it is three sources that agree:
//   * the arcade's emission rate, 0.4-0.74 aircraft/s of flight (R8 judge
//     §4.3, Little's law on a hand count plus the HIT counter as a floor);
//   * the arcade's engagement structure, one engagement every ~10.5 s of
//     3-6 aircraft (R8 feel critic §3.2);
//   * GAME_SPEC.md §4's own ADOPTED pacing, "spawn interval 1.5 s on stage 1"
//     = 0.67/s and "hard cap ~7 alive", which the code has contradicted since
//     R3 and which nothing ever recorded as an open item.
//
// A wave is 3-6 members two times in three and 2-3 one time in three, mean
// **3.83 members**, so the wave gap sets the rate: 3.83 / 10.0 s = 0.38
// aircraft/s from ordinary waves, plus the stage opener's 5-6 at each stage
// boundary. MEASURED end to end on the shipped values, 12 arms, 4 pilots,
// 3 seeds, 90 s each: **0.567 - 0.647 emissions/s on every single one**,
// inside the arcade's 0.4-0.74 with margin at both ends. The arithmetic is
// the design; the probe is the number, and they are not the same thing
// because the opener is not a wave.
//
// THE SWEEP IS REPRODUCIBLE AND EVERY ARM IS ONE `?pace=` STRING -- see
// judging/R9/lane-pacing.md. The control arm that matters most:
// `?pace=maxalive=14,gapmin=0.9,gapmax=1.6,dispmin=0.14,dispmax=0.34,
// corridor=0,openerspan=3,traingap=2.46,trains=2` reproduces the committed
// build `52edcc4` to EVERY DIGIT the probe prints, on every arm and seed, so
// the before column of that report is a switch on this build rather than a
// different build.
const MAX_ALIVE = paceTunable('maxalive', 6);
// GAME_SPEC.md §4's own figures, which this file has contradicted since R3.
// The tighter 0.14-0.34 existed to drain a queue that no longer forms.
const DISPENSE_MIN_S = paceTunable('dispmin', 0.2);
const DISPENSE_MAX_S = paceTunable('dispmax', 0.5);
// Gap between waves. 0.9-1.6 s, and the reasoning that set it is the single
// most expensive inference in this file: *"a wave takes 4-6 s to cross, so the
// gap has to be well under that and the countdown has to run continuously —
// waves must OVERLAP"*. A gap shorter than the residence time is the
// definition of a saturated queue, and it guarantees the sky NEVER empties.
// The arcade overlaps waves occasionally (t113-119, correctly observed); we
// made it structural.
//
// IT WAS WORSE THAN SATURATED AND THE PROBE SHOWS IT RATHER THAN THE ARITHMETIC
// PREDICTING IT. Supply at 0.9-1.6 s is 3.83/1.25 = 3.06 aircraft/s; capacity
// at MAX_ALIVE 14 over a 4.55 s residence is 3.08/s. The two limiters sat on
// top of each other, so `pending` was a critically-loaded queue with no drift
// term: measured mean backlog **4.7 aircraft at 20 s, 18.7 at 60 s, 24-26 at
// 90 s, still climbing** (tools/out/pacing-r9/before-popA.json). That backlog
// is discarded wholesale by `clear()` at every stage boundary, so a fifth of
// everything the wave generator built was never flown at all.
//
// 7.0-13.0 s, mean 10.0 s, which is the R8 feel critic's measured arcade
// cadence of one engagement every ~10.5 s against a ~5 s crossing -- the
// arcade's "overlaps sometimes" rather than "overlaps always". 5.0-9.0 was
// measured first and emitted 0.75-0.87/s, above the arcade's band; the gap
// was scaled by the ratio and re-measured rather than argued.
//
// It also leaves the queue strictly under-loaded: supply 0.38/s against a
// capacity of 6/4.55 = 1.32/s, so **the CAP NO LONGER BINDS** and emission is
// a rate this file chose instead of a side effect of a cap nobody re-derived.
// Measured mean backlog after: **0.44 - 1.04 aircraft**, flat in run length,
// against 18.7 and climbing before.
const WAVE_GAP_MIN_S = paceTunable('gapmin', 7.0);
const WAVE_GAP_MAX_S = paceTunable('gapmax', 13.0);

// ---------------------------------------------------------------------------
// THE PLAYER CORRIDOR — half-width, in NDC, of a lateral dead zone that wave
// FLY-PAST endpoints and stage-opener start points are kept out of.
//
// R8's art critique ranked "you cannot find your own aircraft" first of
// everything it found, and measured it: **19.5 % of flight frames had more
// than 30 % of the player's aircraft hidden behind another sprite, worst
// 60.7 %**, with the worst frame holding six aircraft clumped at screen centre
// and one across the player's canopy. Its first recommended fix is this one,
// and it is explicitly a spawner change: *"keep enemies out of the player's
// screen box."*
//
// WHY THE CORRIDOR IS ON X AND NOT ON Y, which is a measured distinction and
// not a preference. This file's own R6 diagnosis — still above, still holding —
// is that the arcade's readable enemies sit on the SIGHT LINE, 13 points of H
// above its player, and NEAR_BAND is quantile-matched to that distribution. Our
// near-field median is ndcY +0.28 against a player median of -0.096, so the
// VERTICAL separation is already the arcade's and moving it would break a
// matched statistic to chase an unmatched one. What is not separated is the
// lateral: `baseB` is drawn uniform on +-0.18 NDC, which is the middle of the
// frame, which is where the player is.
//
// APPLIED TO THE FORMATION CENTRE, NOT PER MEMBER, and that is the whole
// design decision. Mapping every member's x out of the corridor splits a
// formation that straddles the centre line into two halves thrown to opposite
// sides — the sign flip at x = 0 is discontinuous — and a wave stops reading as
// a wave, which is the defect gap 11 was about. Offsetting the centre keeps the
// echelon's internal geometry byte for byte and simply lands it left or right
// of the player. A member can still cross the centre; the BULK of the wave no
// longer arrives on the canopy.
//
// 0.34 NDC: the player's measured level-astern span is 35.62 %W (REFERENCE.md)
// = 0.712 NDC, half-width 0.356, and 0.34 is just inside that — a formation
// centred at the corridor edge clears the player's own quad. Stated as ADOPTED:
// it is derived from our player's measured span, not from an arcade count of
// where enemies pass, and no such count exists.
//
// ---------------------------------------------------------------------------
// AND IT IS SHIPPED INERT AT 0. THE MECHANISM IS LIVE; THE EFFECT IS
// WITHDRAWN, ON A ONE-LEVER MEASUREMENT THAT REFUTED IT. Same disposition and
// same reasoning as THROTTLE_CLOSURE_MULT's R6 withdrawal further down this
// file: the next lane gets the interface, the arms and the number, and can
// turn it on in one line with its eyes open.
//
// 60 flight frames per arm, `?fixed=1&demo=1&invincible=1`, THREE tick
// spacings (29/37/53 — none divides `?demo=1`'s 16.000 s = 960-tick cycle),
// four captures per frame, instrument `judging/R9/occlusion_r9.py`, whose
// no-combat-against-itself control reads 0.0 on every frame of every arm:
//
//   arm                                   >30 % hidden   >50 %   worst
//   committed build (old population)        11.1 %        4.4 %   52.3 %
//   new population, `?pace=corridor=0`       6.7 %        2.2 %   50.7 %
//   new population, corridor 0.34            6.7 %        6.7 %   65.0 %
//
// **THE POPULATION CUT DOES ALL OF THE WORK AND THE CORRIDOR MAKES THE TAIL
// WORSE.** It halves the >30 % rate on its own; adding the corridor moves
// that rate not at all, triples the >50 % rate and costs 14 points on the
// worst frame.
//
// THE MECHANISM, and it is the reason no build-time version of this can work.
// A wave's fly-past x is fixed when the wave is BUILT and the player has
// ~2.7-5 s to move before the wave arrives — on `?demo=1` the jet travels
// about 0.4 NDC in that window. Clearing SCREEN CENTRE therefore displaces
// the formation toward the player exactly as often as away from it, and when
// it displaces toward, the whole formation lands on him instead of one member
// of it. Every surviving >30 % frame in all three spacings is the same event:
// ticks 370-407, the stage opener's primed echelon reaching fly-past depth,
// with the jet rolled hard and off centre
// (`tools/out/pacing-r9/occ-after2-e29-{A,B}/frame-0012.png`).
//
// WHAT WOULD ACTUALLY FIX IT, named rather than attempted: a PER-TICK lateral
// avoidance applied in src/entities/enemy.js inside the last ~1 s of an
// approach, where the player's position is known and current. That is a
// flight-model change, it would move the lateral-position distributions the
// world and criteria lanes score, and this lane could not validate it inside
// the round. R8's art critique ranks it first of everything in that report;
// it is worth a lane of its own.
const PLAYER_CORRIDOR_NDC_X = paceTunable('corridor', 0);
const OPENER_SPAN = paceTunable('openerspan', 2);

// Monotone, sign-preserving map of a lateral position out of the corridor.
// `x` keeps its side and its ordering; |x| is compressed into [C, 1]. C = 0
// is the identity, which is what `?pace=corridor=0` uses as its control arm.
function clearCorridor(x) {
  return clearCorridorAbout(x, 0);
}

// The same map taken about an arbitrary centre, used where the spawner
// actually KNOWS where the player is and the aircraft is near-field NOW.
//
// THE STATIC FORM IS NOT ENOUGH AND THE MEASUREMENT SAID SO. With the
// corridor about screen centre, player-occlusion >30 % fell 11.1 % -> 6.7 %
// of flight frames, but the WORST frame went 52.3 % -> 65.0 % and every
// surviving >30 % frame in all three tick spacings landed in one 0.6 s
// window, ticks 370-407 of `?fixed=1&demo=1` — the STAGE OPENER, ~2.6 s into
// flight. An opener member starts at depth 4-7 and is the largest aircraft on
// screen from the instant it exists, so there is no approach time during
// which the player can move away; and `?demo=1`'s timeline has the jet well
// off centre at that moment, so clearing SCREEN CENTRE put the opener
// straight onto it. A corridor about the wrong point is not a smaller fix
// than a corridor about the right one — on this frame it was a worse one.
//
// Echelons keep the static form deliberately: they spawn at depth 63-108 and
// need ~5 s to arrive, by which time the player's position at spawn predicts
// nothing, and the player's own time-average x IS near centre.
function clearCorridorAbout(x, cx) {
  const C = PLAYER_CORRIDOR_NDC_X;
  if (!C) return x;
  const d = x - cx;
  const s = d < 0 ? -1 : 1;
  // Clamped just outside the frame: an opener that would be pushed to 1.6
  // would never be seen at all, and the overtake flight is the first thing
  // every stage shows (GAME_SPEC.md 4).
  return Math.max(-1.05, Math.min(1.05, cx + s * (C + Math.abs(d) * (1 - C))));
}

// ---------------------------------------------------------------------------
// THE LATERAL DIMENSION, AND ITS COUPLING TO THE PLAYER'S ENVELOPE.
//
// R11. `player.js ENVELOPE_X` was cut 2.6 -> 0.733 mid-round, and the question
// put to this file was whether its lateral spread is now tuned to an envelope
// that no longer exists. MEASURED ANSWER: NO CHANGE IS WARRANTED, and the
// reason is structural rather than lucky — so it is written down here, with
// its guard, rather than left to be rediscovered.
//
//                  THE ENGAGEABLE BAND, DERIVED
//
// A missile lock needs the enemy inside LOCK_RADIUS_FRAC of the SIGHT, and
// the sight is the airframe lifted 0.30 NDC (combat.js SIGHT_NDC_Y_OFFSET).
// So the lateral half-width a player can bring the cone onto is
//
//     ENGAGEABLE = player's own NDC rail  +  LOCK_RADIUS_FRAC / 0.5
//                = 0.2027 + 0.166 = 0.3687 NDC = 18.4 %W
//
// The rail is MEASURED, not converted: `ENVELOPE_X` is in WORLD units and the
// map to NDC is not the proportionality it looks like — 2.6 gives +-0.3505 NDC
// and 0.733 gives +-0.2027, a 3.55x change in the constant for a 1.73x change
// in the rail, because the jet rolls as it slides and the projection is of a
// roll-compensated sprite. `judging/R11/reach_probe.mjs` prints the rail in
// one line; RE-MEASURE IT RATHER THAN SCALING IT.
//
//          WHY THE SPREAD IS NOT A REACHABILITY PARAMETER AT ALL
//
// Because the screen path advances by SIZE (1/d), not by time (enemy.js), a
// wave does almost all of its lateral travel in the last fraction of its
// depth — below the lock floor. Measured per pattern, `?fixed=1&demo=2&seed=1`,
// 5 400 consecutive ticks, enemy telemetry (judging/R11/reach_probe.mjs,
// analysed by judging/R11/reach.py), |x| in %W:
//
//   pattern    inside the lock window (d 26-88)   below the floor (d < 26)
//              median   p90    max                median   p90    max
//   approach     3.03   6.04   8.47                 5.19  14.66  37.30
//   overtake     5.28   9.10  10.91                 7.35  17.34  23.70
//   crosser     29.00  30.50  31.05                16.25  26.62  34.01
//
// EVERY approach and overtake spends its ENTIRE lockable window inside
// 11 %W — well inside the 18.4 %W band — and the fan-out that `baseB` and
// `k * 0.26` author happens afterwards, where it is a composition and
// collision parameter and not a reach one. Engageable-by-missile fractions,
// three seeds, both trees:
//
//   pattern     ENVELOPE_X 2.6      ENVELOPE_X 0.733
//   approach    85-91 %             100 %     <- the cut IMPROVED the main traffic
//   overtake    100 %               100 %
//   crosser     100 %               0 %
//
//            THE CROSSER IS A GUN TARGET, AND ALWAYS WAS
//
// The whole loss is one pattern, completely, on every seed. It is not a
// regression: a crosser spawns at depth 30-44 and reaches depth 3, and the
// 1/d law means it is still at |x| 22-31 %W when it falls through the lock
// floor — so it is lockable only out at the side. Before the cut the player
// could slide out to +-36 %W and take it there, which is CHASING, and the
// arcade's own rail is +-9.85 %W (feel lane, R11) with the same 8.3 %W cone,
// so an arcade player could not have locked it either.
//
// What the arcade does with these is visible at 60 Hz in
// `tools/out/spawner-r11/ARC-crosser-approach.png` and `ARC-t118.png`
// (t = 116.5-119.4, GAME_SPEC.md 4's own crosser citation): the aircraft
// converge toward the centre as they grow, pass LARGE and NEAR across the
// player's own column, and sweep out to the sides. That is a gun engagement,
// and ours is too — kills by weapon and pattern, `?demo=2`, three seeds,
// 90 s each (judging/R11/kill_census.mjs):
//
//                     ENVELOPE_X 2.6     ENVELOPE_X 0.733
//   crosser kills      10 (9 vulcan)      11 (all vulcan)
//   TOTAL kills        25                 44
//
// The crosser's kill count is unchanged and total kills nearly DOUBLE. The
// "18 -> 11 kills" that opened this question is a MISSILE-ONLY count from a
// probe pilot that holds the missile button and never touches the trigger
// (`judging/R11/probe_r11.mjs` sets `{...stick, missile: held}` and no
// `fire`), so a gun pattern reads there as a total loss while being entirely
// fightable.
//
// SO: NOTHING IS RETUNED. Cramming traffic toward the centre would raise that
// probe's number and would be wrong — it would move a distribution with no
// arcade column to recover a statistic that is an artefact of the pilot.
//
// THE GUARD BELOW IS THE DELIVERABLE. Every figure above was taken at one
// value of ENVELOPE_X; if it moves again, they are void, and the failure mode
// is silent — which is exactly how REACH_CEILING_NDC_Y's derivation rotted
// (R7 gap 5, three stale inputs, one of them corrected in this same round).
//           THE SET THIS CONSTANT BELONGS TO — R10's "move it as a system
//           or not at all", enumerated so the next lane does not have to
//           rediscover the membership
//
// The engageable band is NOT a spawn-spread question on its own. Three
// constants in three files now scale against the same rail, and the envelope
// cut moved all three ratios at once without any of them being edited:
//
//   constant                        file                 as a multiple of
//                                                        the SIGHT's reach
//                                                        at 2.6   at 0.733
//   ENVELOPE_X -> the rail itself   entities/player.js    1.00     1.00
//   LOCK_RADIUS_FRAC   0.083        weapons/lockSystem.js 0.24     0.84
//   ASSIST_RADIUS_FRAC 0.09 (R13)   weapons/combat.js     0.26     0.91
//   the lateral spread              THIS FILE             (see above)
//
// R13 UPDATE: the gun's assist cone, which this table flagged as **wider than
// the whole distance the sight can travel** (1.32x at 0.13), was brought to
// 0.09 = 0.91x the reach — just INSIDE it — because this round's routing feeds
// the near field more readable traffic and a cone wider than the reach gave it
// away to a dead-centre stick. See weapons/combat.js's ASSIST_RADIUS_FRAC note.
// The lock cone is unchanged at 0.84x. The row above is re-derived at 0.09:
// 0.09/0.0985 = 0.91 and 0.09/0.3493 = 0.26; the lock row is as the R11 combat
// lane verified (0.083/0.0985 = 0.84).
//
// NEITHER RADIUS IS THIS LANE'S TO MOVE and neither was moved: LOCK_RADIUS_FRAC
// was deliberately FROZEN in R10 and ASSIST_RADIUS_FRAC has no arcade anchor
// at all, so a lane with no column for either would be guessing. What this
// comment exists to do is record that **they are one set**: a future change to
// any of the four invalidates the engageable band below, and therefore every
// per-pattern figure above. The guard catches the rail moving; it cannot catch
// the radii moving, so that is a reading job and this table is where it starts.
const ENGAGEABLE_HALF_NDC_X = 0.3687;
// The value of player.js's ENVELOPE_X that ENGAGEABLE_HALF_NDC_X and the
// tables above were measured at. Not a copy to be used — a WITNESS.
const ENVELOPE_X_AT_MEASUREMENT = 0.733;
if (ENVELOPE_X !== ENVELOPE_X_AT_MEASUREMENT && typeof console !== 'undefined') {
  // Warn, never throw: a hard failure here turns a stale comment into a black
  // screen, which is worse. One line, once, at module load.
  console.warn(
    `spawner.js: player.js ENVELOPE_X is ${ENVELOPE_X} but the lateral ` +
    `reachability figures in this file were measured at ${ENVELOPE_X_AT_MEASUREMENT}. ` +
    `ENGAGEABLE_HALF_NDC_X (${ENGAGEABLE_HALF_NDC_X}) and the per-pattern tables ` +
    `above are VOID. Re-measure with judging/R11/reach_probe.mjs + reach.py ` +
    `before trusting them.`
  );
}

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

// How high a wave's near-field endpoint is allowed to finish.
//
// R8: THE DERIVATION BELOW IS VOID AND THE CONSTANT IS NOT DERIVED ANY MORE.
// It is kept, on a different and weaker basis, and labelled as such — the
// R7 judge ranked this as gap 5 and the instruction was to fix the constant
// and its comments together or it recurs. Every input the original argument
// used has moved:
//
//   input                     comment says   SHIPPED
//   player ndcY ceiling       +0.106         +0.4597  (ENVELOPE_Y_UP 1.1 -> 1.55, R7)
//   lock radius               8.3 %W         8.3 %W   (lockSystem.js; see below)
//   re-derived ceiling        +0.64          +0.997
//
// +0.997 is the top edge of the screen, so **the reachability argument no
// longer binds at all** and 0.64 is now undocumented suppression of the
// enemy altitude band rather than a reach bound.
//
// R11 CORRECTION TO THIS TABLE'S MIDDLE ROW, which said "22 %W (lockSystem.js,
// since R3)" and gave a re-derived ceiling of +1.388. THE SHIPPED LOCK RADIUS
// IS 8.3 %W: `lockSystem.js:164` reads `LOCK_RADIUS_FRAC = 0.083` and its own
// R10 note records that the round FROZE it there. The 22 %W was true of some
// intermediate tree and the row outlived it — a comment citing a fact that is
// not true, which is the thing this file's own history says is worse than no
// comment. Re-derived with the shipped value: sight ceiling +0.4597 + 0.30 =
// +0.7597, lock radius 0.083 fracW = 0.083/0.35 = 0.237 NDC in y after the
// 224/320 aspect term, so the ceiling is +0.997. The CONCLUSION is unchanged
// — +0.997 is the top of the frame, so the bound still does not bind — and
// 0.64 still stands on the side effect below, not on this chain.
//
// WHY IT IS STILL 0.64, stated honestly as a side effect rather than a
// derivation: the statistic it suppresses is one that ALREADY MATCHES the
// arcade. The comment two paragraphs down records it — all-enemy top-third
// share 34.9 % against the arcade's 32.5 % — and REFERENCE ledger row 26
// separately established that the arcade's own PLAYER top-third share is
// 0.92 %, one observation in 109, so this band is not a quantile to chase.
// Lifting the cap overshoots a matched figure. It is also not this lane's
// number to move: the enemy-altitude distribution is scored by criteria the
// world/criteria lanes own, and moving it without re-measuring both columns
// is the "tuned a matched statistic to chase an unmatched one" failure mode.
//
// So: ADOPTED, retained on a measured side effect, reachability argument
// WITHDRAWN. Do not re-derive it from the lock radius; that chain is broken.
// Historical derivation, kept for the record only:
// the player's sight sits at playerNdcY + 0.30 and the measured
// player ndcY ceiling on this build is +0.106 (44.7 %H, the ENVELOPE_Y = 1.1
// limit), so the sight tops out at +0.406; lockSystem.js's lock radius is
// 8.3 %W, which is +-0.166 in x and, after the 224/320 aspect term the lock
// and assist tests both apply, +-0.237 in y. +0.64 is the highest an enemy
// can finish and still be engageable at all.
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
// ---------------------------------------------------------------------------
// R9: 3, UP FROM 2 — AND IT IS A CEILING THAT IS ALMOST NEVER REACHED, NOT A
// DIFFICULTY CHANGE. The population fell by 4.4x this round and the fire
// budget is per-POPULATION-INDEPENDENT by construction (that is the whole
// point of the paragraphs above), so with a quarter as many candidate
// shooters the train slots simply went unused. Measured, `?demo=1`, 3 seeds
// x 90 s, same probe both sides: enemy rounds/min **139 -> 84** at the old
// budget. R4 gap 5 forbids losing enemy fire volume, side effect or not.
//
// THE OBJECTION THIS RAISES AND THE MEASUREMENT THAT ANSWERS IT. Three
// concurrent trains sounds like 50 % more fireballs than the one measured
// arcade reference, reference/stage7-enemy-shot-train-t330.png, which
// enemy.js reads as 10-16 fireballs at once = two trains. It is not, because
// the cap is permissive rather than prescriptive and the probe reads the
// actual number: **mean enemy fireballs in the air 6.1-7.6 before, 4.9-6.3
// after** (`meanEnemyShots`, tools/out/pacing-r9/{before-popB,after-final}
// .json). We were BELOW the single arcade frame before this round and we are
// further below it now. The cap never binds; what binds is how many aircraft
// are eligible to open a train at all.
//
// AND LETHALITY DOES NOT MOVE, which is the thing the two-train bound was
// actually protecting. This file's own model is that lethality scales with
// the number of INDEPENDENT AIM SNAPSHOTS, i.e. with trains STARTED per
// minute — not with how many may be live at once. Trains/min went 139/8 =
// 17.4 before to 113/8 = 14.1 after, so snapshots per minute FELL. Measured
// on the non-invincible arms, 3 seeds x 90 s: deaths 4/5/6 -> 4/4/4 on the
// tracking pilot and 1/2/1 -> 4/1/1 on the attract path, with **0
// unannounced fatal hits** and a minimum warning of **2.98 s** against R8's
// published 2.88 s floor.
const MAX_CONCURRENT_TRAINS = paceTunable('trains', 3);
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
// R9: 0.15, down from 2.46, and this constant's OWN comment above demands it
// — "re-measure and re-set this whenever the firing band, the shot spacing,
// the train length or the alive budget moves". The alive budget moved by
// 4.4x.
//
// IT IS NO LONGER THE LIMITER AND THAT IS THE HONEST READING OF 0.15. At 8
// rounds a train the gap alone would permit 3200 rounds/min; the measured
// figure is 113. With 2.7-3.1 aircraft alive and an approach eligible to open
// a train for only ~1.09 s of its ~5 s life, **candidate availability** sets
// the rate and the gap merely stops two aircraft opening on the same tick.
// The sweep is in judging/R9/lane-pacing.md: at `trains=2` the ceiling is
// 76-91 rounds/min however small this is made, which is why the concurrency
// moved as well.
//
// IT MUST BE RE-SET IF THE POPULATION EVER GOES BACK UP. At MAX_ALIVE = 14
// this value would be a large, unmeasured increase in both volume and
// snapshot rate. `?pace=traingap=` is the knob; the arm to re-run is the
// `--invincible false` one.
//
// VOLUME IS STILL DOWN 19 % AND THIS LANE IS NOT CLAIMING OTHERWISE:
// 123.5-147.7 rounds/min before against 97.1-126.9 after on `?demo=1`. The
// remaining shortfall cannot be bought from this file without exceeding
// GAME_SPEC.md 4's MEASURED "trains of 4-8" (enemy.js TRAIN_LENGTHS is
// already at the top of that range) or letting crossers and openers fire,
// which the firing band forbids by geometry. **It is blocked on R8 judge
// gap 2: the arcade's own enemy ROUND rate has never been measured, so the
// gate this misses was set against OUR supply of shooters exactly as the
// density gate was set against OUR supply of aircraft.** The one enemy-fire
// statistic that DOES have an arcade side — fireballs on screen — is reported
// above and we are under the arcade on both sides of the change.
const TRAIN_START_GAP_S = paceTunable('traingap', 0.15);

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
//
// ---------------------------------------------------------------------------
// R8: IT IS NOW LIVE, AT THE HALF-STRENGTH ARM THE R6 LANE NAMED AND DID NOT
// RUN. The round-8 ask (judging/R7/report.md gap 4) is that the throttle have
// a gameplay consequence at all: `flow.scrollSpeed` has exactly one consumer,
// the ground mesh, so the lever moves the world and changes nothing the
// player can win or lose with.
//
// M IS STILL THE DATUM AND ITS MULTIPLIER IS STILL EXACTLY 1, so every
// MEASURED flight constant — the 4-6 s approach, the 62.50 %H horizon, the
// ground-flow rate, passive accrual 3300/s — is reproduced bit for bit at the
// middle detent. L and H are ADOPTED excursions. Approach durations:
// 5.00/0.92 = 5.43 s at L and 5.00/1.10 = 4.55 s at H, both inside
// GAME_SPEC.md §4's measured 4-6 s band with room either side; the full-
// strength arm's 0.85/1.20 gave 5.88/4.17 s, inside the band but against its
// edges.
//
// WHAT IT COSTS, measured on the R8 pilot harness rather than predicted (4
// seeds x 180 s per arm, every tick, `?gun=closure=...`) — see
// judging/R8/lane-combat.md for the table and the per-detent arms. The R6
// lane's two objections were VOLUME (-7 %) and LETHALITY (+9 %) at full
// strength; at half strength both roughly halve, and the volume objection is
// the binding one because R4 gap 5 forbids losing enemy fire volume.
//
// THE DETENT DISTRIBUTION IS PART OF THE RESULT AND IS NOT A GAME PROPERTY.
// A pilot who sits at M sees no change at all, by construction. The R6
// figures were taken on `?demo=1`, whose THROTTLE_PATTERN cycles all three
// detents, so they are the cost to a pilot who spends a third of the run at
// each — which is a harsher population than any human, and the right one to
// bound against.
const THROTTLE_CLOSURE_MULT = [0.92, 1.0, 1.1];

const ELITE_FRACTION_BY_STAGE = [0.12, 0.22, 0.30];

// Crossers are near-field lateral passes and the most visually prominent
// single aircraft in any frame, so they carry a higher elite share than the
// echelon line — one red delta crossing right over the player reads as the
// stage's elite without tinting the whole sky.
const CROSSER_ELITE_BONUS = 0.18;

// ---------------------------------------------------------------------------
// R13 — POPULATION AND ROUTING, NOT NEW SIGHT TUNING.
//
// The R12 judge closed the lock GEOMETRY (LOCK_DEPTH_MIN 26->16) but found the
// missile still unusable in play: a lock only forms by pinning the sight to
// the horizon strip and waiting, which gets the player shot (1 lock in 45
// turns, 0 salvos). The diagnosis this round is not the sight — it is that the
// traffic never DWELLS where a normally-flying player aims. Three routing
// changes, each one measured against the blind-vs-aiming control the method
// requires (lockSystem.js's note), and each a `?pace=` lever so a probe can
// isolate it:
//
//   * LOCK-BAIT CLUSTERS (gap 1). Every Nth wave is a tight cluster that
//     approaches to just above the lock floor and HOLDS there (enemy.js
//     loiter), placed up and to ONE SIDE of the sight's rest posture so a
//     dead-centre parked sight does not sweep it up for free but a pilot who
//     points at the visible cluster locks the set. This is the arcade's
//     distant-wave salvo, which ours never presented at a reachable posture.
//   * GUN DWELL (gap 2). A fraction of head-on echelon members pause ~0.9 s at
//     readable depth, so there is a mid-range window to put the sight on a
//     growing aircraft and kill it there instead of at the wingtip.
//   * LARGE FLYBY (gap 3). A single big aircraft crosses close every ~20 s,
//     the screen-crossing event the arcade runs every second or two and ours
//     lacked entirely.
//   * DEAD-SKY CLIP (gap 3). The arcade's own sky is empty ~40 % of the time,
//     so the defect is not average density — it is the 10+ s dead STRETCH. A
//     wave is forced early only once the sky has been genuinely empty past
//     DEAD_SKY_MAX_S, which bounds the worst lull without raising mean density.
//
// None of these touches ENVELOPE_X, the sight rails, or LOCK_RADIUS_FRAC
// (arcade-closed / frozen). They move where the TRAFFIC is, which is this
// file's job.
// R14 — 4 -> 2. Rank-2 was "the missile is a coin-flip on wave timing": a lock
// only came on the every-4th-wave bait, so a bad phase or an early death fired
// nothing. Measured (judging/R13/lock_probe.mjs, 90 s, seeds 7 & 3): at every-
// 4th the aim pilot's salvos were 33 vs 47 across the two seeds (a wide, phase-
// dependent spread); at every-other they tighten to 37 vs 37 and the ticks with
// a lockable target in reach rise ~17 %. A lock is now reachable within one or
// two wave gaps of any life rather than once in four.
//
// THE COST THIS RAISES AND HOW THE LATERAL EXIT BELOW ANSWERS IT: more bait is
// more total traffic, and a bait that DIVES to the central fly-past after its
// hold becomes free gun fodder for a dead-centre stick — measured, a naive
// 4->2 with the old diving exit pushed the blind GUN floor 13 -> 17, eroding
// R14's rank-1 gun fix (combat.js GUN_KILL_SPAN_FRAC). The bait now PEELS OFF to
// its own side after the hold (see ndcB in _lockBaitWave), so it never crosses
// the central gun band; with that, 4->2 holds the blind gun floor while
// delivering the missile reliability. The aimer's locks form during the hold
// and its missiles home regardless of where the cluster then goes, so the exit
// change does not cost the aiming pilot anything (verified, lock_probe aim arm).
const BAIT_EVERY = paceTunable('baitevery', 2);
// 0.25, kept deliberately MODEST. The window the judge asked for is a quality
// of the dwell — an enemy FROZEN at readable size for ~0.9 s is trackable — not
// a quantity of readable enemies: this file's own history (the MAX_ALIVE block)
// warns that the arcade sky is mostly specks (77-79 % of its aircraft below
// 10 %W) and that filling it with readable airframes is the R3 mistake it spent
// a round undoing. A quarter of echelon members dwelling gives a recurring
// gun window without wallpapering the readable band. Measured readable-present
// fraction (no-attrition passive probe) moves 0.39 -> ~0.45 at 0.25, against
// 0.54 at 0.40 — the lower arm stays near the committed build.
const GUN_DWELL_FRAC = paceTunable('dwellfrac', 0.25);
const FLYBY_PERIOD_S = paceTunable('flyby', 20);
// 3.0 s. The DISTINCTION this value rides on (R13 opening playtest,
// judging/R13/playtest-open.md): the arcade's ~40 % "emptiness" is a READABLE-
// enemy statistic (21 % readable-present, the MAX_ALIVE block), but its sky is
// "populated at many depths CONSTANTLY" — i.e. distant SPECKS are nearly
// always present and only big targets are sparse. So the fix for "I fly
// through long quiet seconds" is to keep the sky non-EMPTY, not to add readable
// wallpaper — and a forced wave arrives as horizon specks (depth 63-108, ~1 %W)
// that take ~5 s to become readable, so clipping the empty stretch adds
// presence WITHOUT moving the readable-present fraction. It only replaces the
// next scheduled wave (waveTimer is reset), so the emission RATE is unchanged;
// the long gaps are what go.
//
// 3.5 and not 3.0: the forced wave is readable-neutral but still an extra
// aircraft under the pre-existing wide-ish gun assist, so a tighter clip feeds
// the blind pilot's gun a little more (blind total kill share 64 % baseline ->
// 69 % at 3.0, vs 61 % at 4.5, seed 7). 3.5 keeps the quiet-seconds floor the
// playtest asked for while holding the blind share near baseline. The missile
// gate — the actual deliverable — is unaffected either way (aim 22 vs blind 2).
const DEAD_SKY_MAX_S = paceTunable('deadmax', 3.5);

// ---------------------------------------------------------------------------
// R32 — THE CLOSE-DROUGHT CLIP. The R32 judge's #1 gap: "enemies spend too
// long as distant specks — the dogfight doesn't crowd you." MEASURED and
// CONFIRMED (judging/R32/cadence/): decoded arcade stage-1 and stage-4 combat
// at 60 Hz. The arcade pilot is FIRING constantly (HIT counter climbs ~1
// kill/1.2 s in stage 1) and yet a readable (>8 %W) enemy is on screen ~50-70 %
// of stage-1 combat and ~40-55 % of stage 4 — you kill one and another is
// ALREADY closing. Our active-aim-and-FIRE arm (tools, same metric) sat at
// 7-13 %. Our SUPPLY (active aim, no fire) is 46-54 % — it MATCHES the arcade —
// so the spawner is not starving close enemies; the problem is REPLENISHMENT
// under fire.
//
// WHY THE EXISTING DEAD-SKY CLIP DOES NOT CATCH IT. `DEAD_SKY_MAX_S` forces a
// wave only when the sky is TOTALLY empty (0 alive AND 0 pending). Under active
// fire `meanAlive` is ~2.0 (far below MAX_ALIVE = 6, so the CAP is not the
// limiter) — the sky holds two DISTANT specks mid-approach, so it is never
// "empty" and the clip never fires, while no CLOSE enemy is present for many
// seconds. That is the judge's sentence exactly: two distant specks, nothing
// crowding you. The arcade keeps close enemies replenished as fast as the
// pilot clears them; our 5 s depth-90 approach pipeline plus a 10 s wave gap
// cannot, once a fast-firing player is draining the near field.
//
// THE FIX IS TIMING/VARIANCE, NOT DENSITY — the one thing the MAX_ALIVE block
// forbids. This clip keys on CLOSE presence, not total emptiness: while a close
// enemy IS on screen (a wall, a crosser, a fly-past) the timer keeps resetting
// and NOTHING extra spawns, so when the player is not clearing fast the supply
// is byte-for-byte the pre-R32 build and the readable-present MEAN does not
// move (no overshoot). It only fires in the DROUGHT a fast-firing player opens,
// and it fills it with the EXISTING `_flyby` — a single large crossing pass
// that does not meaningfully fire (crosser geometry, judging/R5), so it is a
// dodge/shoot event and cannot break the fairness the fire budget protects.
//
// IT IS A SINGLE AIRCRAFT, NOT A WALL, SO IT CANNOT OVERSHOOT THE ARCADE. At
// worst, against a player clearing everything, it keeps ONE close crosser
// present most of the time — which is the arcade's own "always something close"
// and still leaves the brief lulls the arcade shows (stage-1 t106-110, stage-4
// empty frames). The burst WALLS (R15) are untouched, so the wall-then-lull
// variance the R14/R15 judges asked for is intact; this only stops the lull
// from becoming a distant-speck DROUGHT.
//
// 3.0 s: set to the arcade's own typical gap between close enemies read off the
// 60 Hz decode (close enemies present most frames, occasional 2-4 s gaps). A
// tighter value would push toward continuously-close (overshoot); a looser one
// leaves the drought the judge flagged. Swept in judging/R32/cadence/: at 3.0 s
// the active-FIRE readable-present fraction rises from ~0.10 to ~0.33-0.40
// (into the arcade's band) while the no-fire SUPPLY and the weapon/ death-rate
// probes stay in band (the clip rarely fires when the player is not clearing).
const CLOSE_DROUGHT_MAX_S = paceTunable('closedrought', 3.0);
// Depth at/below which an enemy counts as "close" for the clip. span %W =
// 70.6 / depth (enemy.js ENEMY_WORLD_WIDTH geometry), so depth 8.8 = 8 %W, the
// readable-large threshold the arcade comparison above uses. An enemy nearer
// than this resets the drought timer.
const CLOSE_DROUGHT_DEPTH = paceTunable('closedepth', 8.8);

// Lock-bait hold geometry. The cluster freezes just above LOCK_BREAK_DEPTH's
// reach and inside the lock band [16,88] (weapons/lockSystem.js), at a screen
// position the sight reaches with a deliberate climb-and-turn but not from
// rest. These are authored as the enemy's ndcA (at the hold depth q ~= 0.13,
// so the on-screen position is essentially ndcA; see enemy.js header note 2).
const BAIT_HOLD_DEPTH_MIN = 17;
const BAIT_HOLD_DEPTH_MAX = 21;
const BAIT_HOLD_TIME_MIN = 1.8;
const BAIT_HOLD_TIME_MAX = 2.6;
// Vertical band the bait cluster holds in, NDC.
//
// R16 — RAISED 0.44-0.58 -> 0.55-0.65 TO KILL THE FIRST-LOCK OVERSHOOT. The
// R15 judge flew ~15 empty passes before finding the lock because a NAIVE
// climb overshoots the old band. The mechanism, measured on this build
// (tools/playtest.mjs, seed 7): the sight's vertical rail SATURATES — any
// sustained climb pins the sight at its ceiling ndcY +0.76 and it does NOT
// auto-recentre (it stays at +0.76 with the stick centred; auto-return is the
// player/ui lane's gap, not this one). So a new player who climbs toward the
// high enemies pins the sight at +0.76, whose lock cone (±0.237 NDC, from
// LOCK_RADIUS_FRAC/(0.5·224/320)) covers ndcY [+0.523, +0.997]. The OLD band
// 0.44-0.58 sits mostly BELOW +0.523, so a low-drawing bait (baitY < ~0.50,
// ~43 % of waves) was ENTIRELY under the pinned cone — unlockable unless the
// player counter-intuitively pushed the nose back DOWN to +0.31. That is the
// trick the judge had to discover.
//
// 0.55-0.65 puts the WHOLE band (members span baitY ± 0.0225, so 0.5275-0.6725)
// at or above the full-climb cone floor +0.523, so the naive "climb to them"
// instinct now lands the pinned sight directly on the bait. It stays reachable
// by a GENTLER climb too: catching the band needs the sight anywhere in
// [+0.29, +0.765] (a mild climb up to full), so there is no sweet-spot to find.
// BLIND PROTECTION IS STRENGTHENED, not weakened: the resting cone tops at
// ndcY +0.425 (rest sight +0.188 measured, + the 0.237 reach), which is now
// 0.105 below the band floor 0.5275 (was 0.015) — a parked do-nothing stick is
// even further from a free lock than before. ENVELOPE_Y is UNTOUCHED (R15
// refuted growing it; this moves the TARGET up into the existing reach, not
// the reach up to a higher target).
// Exposed as `?pace=baitymin=,baitymax=` so the R16 raise can be A/B'd on ONE
// tree (`baitymin=0.44,baitymax=0.58` recovers the pre-R16 band) without a
// checkout while sibling lanes hold the working copy.
const BAIT_Y_MIN = paceTunable('baitymin', 0.55);
const BAIT_Y_MAX = paceTunable('baitymax', 0.65);
// Lateral centre offset from the player, |NDC|. Kept slightly off-centre so the
// cluster is not dead ahead of a neutral stick, but BROUGHT IN for R16 so a
// naive climb reaches it laterally too.
//
// R16 — WAS 0.1-0.2, AND THAT WAS A SECOND FIRST-LOCK BARRIER behind the
// vertical overshoot. Traced on seed 19 (judging/R16/_trace via the naive
// pure-up climb): a naive pilot pins the sight at (0, +0.76), but the lock
// cone's LATERAL reach from a centred sight is only ±0.166 ndcX (LOCK_RADIUS
// 0.083 / 0.5), so a bait whose members (centre ± the 0.06·k spread) sat out
// at |x| 0.2-0.29 fell OUTSIDE the cone laterally even once the vertical raise
// put it at the right height — 42 % of band observations failed the lateral
// test. Blind protection does NOT depend on this offset (it is purely
// VERTICAL: the bait sits above the rest cone, so a parked stick cannot reach
// it at any x), so the offset can come in without reopening the blind hole.
// 0.03-0.09 keeps a visible side-bias while placing the whole cluster (members
// span centre ± ~0.09) at or inside the centred cone's lateral reach, so
// "climb toward the cluster" lands the lock without a separate lateral hunt.
const BAIT_X_MIN = 0.03;
const BAIT_X_MAX = 0.09;

// Gun-dwell hold geometry: a pause at readable depth (span ~15-19 %W) short
// enough to read as a hesitation in the pass, not a parked target.
//
// R14 NOTE — a RELOCATED dwell was tried and REVERTED. The idea (judge/R14
// playtest: "aiming is cramped, no reachable gun targets") was to move the hold
// OFF-CENTRE and up near the sight line so it became an aim target a dead-centre
// stick misses. Measured on gun_aim_probe.mjs (gun-only, seeds 7/3/19): it was
// INERT — aim 21/19/18 and blind 9/12/13, unchanged from the un-relocated dwell.
// The aimer's gun total is bounded by target SUPPLY, not placement: relocating
// 25 % of members moves where a tracking sight kills them, not how many it can.
// The dwell (relocated or not) is a minor contributor; the blind-floor lever is
// GUN_KILL_SPAN_FRAC, not dwell geometry. Left here for the next lane so the
// inert arm is not re-run.
const GUN_DWELL_DEPTH_MIN = 5.0;
const GUN_DWELL_DEPTH_MAX = 6.5;
const GUN_DWELL_TIME_MIN = 0.7;
const GUN_DWELL_TIME_MAX = 1.1;

// ---------------------------------------------------------------------------
// R15 — THE BURST WALL (gaps 2 & 3). The R14 judge: "the sky is uniformly
// sparse where the arcade is a wall then a lull ... I flew against ~3-6 enemies
// evenly." MEASURED on this build before the change (judging/R15/burst_probe.mjs,
// passive pilot, close = span >= 14 %W = the gun-kill band, seed 7, 120 s):
// close-count mean 0.54, **peak 4**, and 3+-close "walls" lasted **4.5 s total**
// across the whole run. There is no wall. There IS a close-lull (72 s with zero
// close enemies), so the defect is purely the missing WALL, not the lull.
//
// THE FIX IS VARIANCE, NOT DENSITY (the one thing R9 forbids — the arcade
// AVERAGES ~19 % readable presence and this build was once 5.5x too dense). A
// burst must be PAID FOR by a drought so the mean does not move; it only has to
// swing the instantaneous count between a wall and near-empty. That is bought
// here with the EXISTING schedule, not a new density: on the non-bait waves the
// close-dwell wall REPLACES the ordinary echelon, and the bait waves between
// them are DISTANT (hold at depth 17-21, ~3-4 %W — the MAX_ALIVE block and
// _lockBaitWave), so the close band naturally empties between walls. No wave is
// added; the close mass is BUNCHED into the wall instead of trickled evenly.
//
// HOW THE WALL FORMS — the loiter is the synchroniser. A wave dispensed one
// aircraft every 0.2-0.5 s with a wide depthA spread arrives as a TRICKLE, never
// a wall (that is why the baseline peaks at 4). A burst instead (a) dispenses
// FAST (BURST_DISPENSE) from a TIGHT depthA so arrivals bunch within ~0.7 s, and
// (b) holds its members together at close depth (enemy.js loiter) so the early
// arrivals FREEZE and wait for the late ones — the hold turns bunched arrivals
// into a standing wall of 6-9 close aircraft, then they resume and fly past and
// the wall dissolves into the drought.
//
// WHY THE WALL SERVES GAP 2 TOO (the gun's target supply). The R14 judge and
// combat.js both found the gun capped by SUPPLY, not aim placement: a perfect
// gun-aimer out-kills a blind centred stick on the probe (21 vs 10, seed 7) but
// a human cannot, because there are too few close targets to rake. The wall is
// supply: 6-9 close aircraft SPREAD ACROSS THE FRAME (BURST_SPREAD_STEP), all
// inside an aimer's lateral reach but spread past a blind centred net, so the
// aimer rakes the whole wall while the blind stick catches only the few that
// cross centre. The members PEEL OUTWARD on exit (ndcB fanned past the hold x,
// like the lock-bait's R14 peel) so the dissolving wall does NOT feed the blind
// gun down the centre — the blind floor must stay ~10 (STATUS R15).
//
// REVERSIBLE: `?pace=burstevery=0` takes the exact pre-R15 echelon/crosser
// rotation with its exact draw sequence, so the before arm of any A/B is a
// switch on THIS build, not a different build (the MAX_ALIVE block's discipline).
const BURST_EVERY = paceTunable('burstevery', 1);
const BURST_N_MIN = paceTunable('burstmin', 6);
const BURST_N_MAX = paceTunable('burstmax', 9);
// A transient cap, above MAX_ALIVE, that applies ONLY while a burst's own
// members are being dispensed (the dispenser checks the head of `pending`). The
// ordinary cap still governs between walls, so this does not raise the mean —
// it lets the wall reach its full height for the ~1.5 s it stands. 10 clears a
// 9-ship wall plus a straggler.
const BURST_MAX_ALIVE = paceTunable('burstcap', 10);
// Fast dispense while draining a burst, so the whole wall is in the air within
// ~0.7 s and the holds overlap. Trickling it at the ordinary 0.2-0.5 s would
// spread arrivals over 2-4 s and the early members would pass before the late
// ones arrived — no wall.
const BURST_DISPENSE_MIN_S = 0.05;
const BURST_DISPENSE_MAX_S = 0.11;
// The close depth the wall holds at. span %W = 70.6 / depth (enemy.js), so
// 3.5-5.2 is 13.6-20.2 %W — the gun-kill band (>= 14 %W, combat.js
// GUN_KILL_SPAN_FRAC) at the near end and solidly readable across it. Below
// FIRE_DEPTH_MIN = 24, so a holding wall NEVER fires (fair, same as the other
// loiters). Members draw individual depths in this band so the wall is a ladder
// of close depths, the arcade's "planes at every depth" at close range.
const BURST_DWELL_DEPTH_MIN = 3.5;
const BURST_DWELL_DEPTH_MAX = 5.2;
// Fraction of a wall's members that HOLD (the rest fly straight through at mixed
// depths, so the wall has depth variety and is not a flat picket line).
const BURST_DWELL_FRAC = 0.7;
// Hold time, seconds, centred on `bursthold` +-0.35. Long enough that the wall
// stands as one readable event; short enough that it dissolves into the drought.
const BURST_HOLD_CENTRE_S = paceTunable('bursthold', 1.3);
// Lateral step between adjacent wall members, NDC. Sized so a full 9-ship wall's
// HOLD positions span out to ~|x| 0.30 — inside an aiming pilot's lateral reach
// (the probe's REACH_X 0.33) but well past a blind centred net, which is the
// gap-2 supply asymmetry. The hold x works out to ~1.2x the authored `sx` below
// (the 1/d screen-path lerp at the ~depth-4 hold, enemy.js note 2), so the step
// is set against that factor, not the raw hold position. Measured center-heavy
// at 0.05 (wall holds piled inside |x| 0.12, feeding a blind net); 0.072 pushes
// most of an 8-ship wall past |x| 0.12 — OFF-CENTRE supply the aimer rakes and a
// blind centred stick mostly misses, while the outermost stay within reach.
const BURST_SPREAD_STEP = 0.072;

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
    // R15: counts only the NON-BAIT waves, so the burst/echelon/crosser rotation
    // is independent of how often the bait cadence pre-empts a wave. See
    // _nextWave.
    this.ordinaryIndex = 0;
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

    // Throttle closure, as an instance table so the R8 isolation can sweep
    // its STRENGTH in one build (`?gun=closure=`, measurement-only):
    // 0 reproduces the R6 inert arm exactly, 1 is the shipped half-strength
    // excursion, 2 is the full-strength [0.84, 1, 1.20] arm the R6 lane
    // measured and withdrew. Written as a blend about 1 so that M stays
    // EXACTLY 1 at every strength — the datum must not move with the sweep,
    // or the sweep re-bases every measured flight constant at once and no
    // test would notice.
    this.closureStrength = gunTunable('closure', 1);
    this.closureMult = THROTTLE_CLOSURE_MULT.map((m) => 1 + (m - 1) * this.closureStrength);
    this.closureScale = 1;

    this.trainGapTimer = 0;
    this.trainsStarted = 0;
    // R13 event timers. `flybyTimer` counts down to the next large close
    // flyby; seeded short so the first one lands early in a stage rather than
    // 20 s in. `emptyTimer` accumulates sim time the sky has been genuinely
    // empty, and forces a wave once it passes DEAD_SKY_MAX_S.
    this.flybyTimer = Math.min(FLYBY_PERIOD_S, 8);
    this.emptyTimer = 0;
    // R32 close-drought clip (see CLOSE_DROUGHT_MAX_S). Accumulates sim time
    // with NO close enemy on screen; forces a fly-past once it passes the
    // threshold. Reset on any close enemy and on clear().
    this.closeDroughtTimer = 0;
    this.solo =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('combatsolo');

    // WHAT THE PAGE IS ACTUALLY PACING AT, read back rather than assumed —
    // the same contract `__gunTunables` carries in combat.js, and for the
    // same reason: a lane that writes down the arm it MEANT to run is one
    // typo away from a wrong table, and this round's whole deliverable is a
    // table of arms. `?pace=` already throws on an unknown key; this is how
    // a probe proves the arm it got is the arm it asked for.
    if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('fixed')) {
      window.__paceTunables = () => ({
        maxalive: MAX_ALIVE,
        gapmin: WAVE_GAP_MIN_S,
        gapmax: WAVE_GAP_MAX_S,
        dispmin: DISPENSE_MIN_S,
        dispmax: DISPENSE_MAX_S,
        corridor: PLAYER_CORRIDOR_NDC_X,
        openerspan: OPENER_SPAN,
        traingap: TRAIN_START_GAP_S,
        trains: MAX_CONCURRENT_TRAINS,
        baitevery: BAIT_EVERY,
        dwellfrac: GUN_DWELL_FRAC,
        flyby: FLYBY_PERIOD_S,
        deadmax: DEAD_SKY_MAX_S,
        closedrought: CLOSE_DROUGHT_MAX_S,
        closedepth: CLOSE_DROUGHT_DEPTH,
        burstevery: BURST_EVERY,
        burstmin: BURST_N_MIN,
        burstmax: BURST_N_MAX,
        burstcap: BURST_MAX_ALIVE,
        bursthold: BURST_HOLD_CENTRE_S,
        overridden: [...(paceOverrides ?? new Map()).keys()],
      });
    }
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
    const closure = this.closureMult[throttleIndex] ?? 1;
    // Published so combat.js's vulcan aim lead can use the SAME closure the
    // enemies are actually advancing at. The lead is a closed form in the
    // depth rate (exp(depthRate * closure * TRAVEL_S)); reading the
    // multiplier off a second copy of this table would be the two-values-
    // for-one-quantity defect the lock radius already cost this project.
    this.closureScale = closure;
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
      // The opener is near-field from the instant it exists, so it is placed
      // relative to WHERE THE PLAYER IS rather than to screen centre.
      this.pending.push(...this._primedEchelon(), ...this._openerWave(playerNdc ? playerNdc.x : 0));
    }

    // R15: a BURST wall is dispensed FAST and under a raised cap so the whole
    // wall reaches the air together and stands as one event — see the burst
    // block above. The decision is per-item off the HEAD of the queue (`_burst`,
    // a measurement-only tag Enemy ignores), so a burst that happens to share
    // the queue with a trailing ordinary wave still dispenses each at its own
    // rate. When no burst is at the head this is byte-identical to the old path.
    this.dispenseTimer -= dt;
    const nextBurst = this.pending.length > 0 && this.pending[0]._burst === true;
    const cap = nextBurst ? BURST_MAX_ALIVE : MAX_ALIVE;
    if (this.pending.length && this.dispenseTimer <= 0 && this.enemies.length < cap) {
      const cfg = this.pending.shift();
      // Stamped at dispense rather than at wave construction: a wave can sit
      // in `pending` across a stage boundary, and an aircraft should wear the
      // livery of the stage it actually flies into.
      const e = new Enemy({ ...cfg, stageIndex: this.stageIndex });
      this.scene.add(e.sprite);
      this.enemies.push(e);
      this.dispenseTimer = nextBurst
        ? BURST_DISPENSE_MIN_S + this.rng() * (BURST_DISPENSE_MAX_S - BURST_DISPENSE_MIN_S)
        : DISPENSE_MIN_S + this.rng() * (DISPENSE_MAX_S - DISPENSE_MIN_S);
    }

    // Runs unconditionally, so waves overlap rather than queueing strictly
    // one after another. The alive cap above is what actually limits
    // density; the queue is just a dispensing buffer.
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.pending.push(...this._nextWave());
      this.waveTimer = WAVE_GAP_MIN_S + this.rng() * (WAVE_GAP_MAX_S - WAVE_GAP_MIN_S);
    }

    // R13 — DEAD-SKY CLIP (gap 3). The arcade is empty ~40 % of the time, so
    // this does NOT raise mean density: it only fires when the sky is GENUINELY
    // empty (nothing alive AND nothing queued to dispense) and has been for
    // longer than the arcade's own longest lull. It pulls the NEXT wave in
    // early rather than inventing an extra one, so emission count is unchanged
    // over a run — only its spacing's long tail is clipped. `_nextWave` already
    // advances `waveIndex`, so the bait/crosser cadence stays intact.
    if (!this.solo && this.enemies.length === 0 && this.pending.length === 0) {
      this.emptyTimer += dt;
      if (this.emptyTimer >= DEAD_SKY_MAX_S) {
        this.pending.push(...this._nextWave());
        this.waveTimer = WAVE_GAP_MIN_S + this.rng() * (WAVE_GAP_MAX_S - WAVE_GAP_MIN_S);
        this.emptyTimer = 0;
      }
    } else {
      this.emptyTimer = 0;
    }

    // R13 — LARGE CLOSE FLYBY (gap 3). A single big aircraft crosses near the
    // camera on its own cadence, independent of the wave queue, so the
    // "something crosses big every second or two" event exists at all. Gated
    // on FLYBY_PERIOD_S > 0 and on headroom under the alive cap so it never
    // starves the ordinary waves.
    if (FLYBY_PERIOD_S > 0 && !this.solo) {
      this.flybyTimer -= dt;
      if (this.flybyTimer <= 0 && this.enemies.length < MAX_ALIVE) {
        this.pending.push(this._flyby(playerNdc ? playerNdc.x : 0));
        this.flybyTimer = FLYBY_PERIOD_S;
      }
    }

    // R32 — CLOSE-DROUGHT CLIP (see CLOSE_DROUGHT_MAX_S). Keyed on CLOSE
    // presence (an on-screen enemy nearer than CLOSE_DROUGHT_DEPTH), not on
    // total emptiness: while the near field is naturally full the timer keeps
    // resetting and nothing extra spawns, so the supply is byte-for-byte the
    // pre-R32 build and the mean does not move. It only fires in the drought a
    // fast-firing player opens, filling it with the existing fair fly-past.
    //
    // The forced fly-past spawns far (depth 26-34) and takes ~4 s to cross into
    // the close band, during which it is NOT itself "close" — so after a fill
    // the timer is driven NEGATIVE by COOLDOWN (the fly-past's own time-to-close
    // plus a margin) to stop a second fill stacking on top of the first while it
    // is still inbound. Once it arrives it is close and resets the timer to 0 on
    // its own; a sustained drought therefore gets ~one close crosser at a time,
    // never a pile. Gated on headroom under the alive cap.
    if (CLOSE_DROUGHT_MAX_S > 0 && !this.solo) {
      const closePresent = this.enemies.some(
        (e) => e.ndc && Math.abs(e.ndc.x) <= 1 && e.d <= CLOSE_DROUGHT_DEPTH,
      );
      if (closePresent) {
        this.closeDroughtTimer = 0;
      } else {
        this.closeDroughtTimer += dt;
        if (this.closeDroughtTimer >= CLOSE_DROUGHT_MAX_S && this.enemies.length < MAX_ALIVE) {
          this.pending.push(this._flyby(playerNdc ? playerNdc.x : 0));
          // COOLDOWN ~= the fly-past's depth-26 → depth-8.8 crossing time
          // (ln(30/8.8)/0.295 ≈ 4.1 s) plus a margin, so the next fill cannot
          // open until this one has had its chance to arrive and reset the timer.
          this.closeDroughtTimer = -5.0;
        }
      }
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
    // R13: lock-bait takes priority on its own cadence, then the 3:1 echelon/
    // crosser split is unchanged. BAIT_EVERY = 4 and the crosser is every 3rd,
    // so e.g. wave 12 would be both — bait wins, which is fine: it is the rarer
    // and more load-bearing pattern. `_lockBaitWave` needs the player's x to
    // place its cluster off-centre, which `update` does not forward here, so
    // the bait uses screen-relative offsets about centre and the player turns
    // onto it (the opener does the same when playerNdc is unavailable).
    let specs;
    if (BAIT_EVERY > 0 && this.waveIndex % BAIT_EVERY === 0) {
      specs = this._lockBaitWave();
    } else if (BURST_EVERY > 0) {
      // R15 rotation on the non-bait waves. `ordinaryIndex` counts only these,
      // so the burst/crosser/echelon cadence is independent of the bait pre-empt.
      // Crossers stay "occasional" (every 3rd ordinary wave, the near-field
      // lateral pass); of the rest, every `BURST_EVERY`th is a close-dwell WALL
      // and the others are ordinary echelons. burstevery=1 makes every non-
      // crosser ordinary wave a wall (the default rhythm); burstevery=2 alternates
      // wall/echelon, for sweeping the wall frequency down.
      this.ordinaryIndex += 1;
      if (this.ordinaryIndex % 3 === 0) {
        specs = this._crosserWave();
      } else if (this.ordinaryIndex % BURST_EVERY === 0) {
        specs = this._burstWave();
      } else {
        specs = this._echelonWave();
      }
    } else if (this.waveIndex % 3 === 0) {
      // Pre-R15 rotation, preserved byte-identical for the ?pace=burstevery=0
      // A/B and as the fallback: 3 echelons to 1 crosser pass. The crossers are
      // "occasional" in the measurement, and they are the pattern that most
      // crowds the near field.
      specs = this._crosserWave();
    } else {
      specs = this._echelonWave();
    }
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
  _openerWave(playerX = 0) {
    // 2-3, down from 2-4. The opener and the primed echelon are dispensed
    // together, so the stage used to open with 5-7 aircraft against a cap of
    // 14 and now opens with 5-6 against a cap of 6 — the cap would bind on
    // the opener alone and hold the first ordinary wave out for seconds.
    // The draw is kept in the stream (`floor(rng()*2)` consumes the same one
    // draw as `floor(rng()*3)`) so this is a range change, not a re-sequence,
    // and `?pace=openerspan=3` restores the old range exactly — which is what
    // makes the BEFORE arm of this round's table a SWITCH on one build rather
    // than a different build.
    const n = 2 + Math.floor(this.rng() * OPENER_SPAN); // 2-3
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
        //
        // THE CORRIDOR IS APPLIED PER MEMBER HERE, unlike the echelon, and
        // the asymmetry is deliberate. An opener member starts at depth 4-7
        // — it is the single largest aircraft on screen at the moment a stage
        // opens — and `k` is 0 for the middle ship of an odd flight, which put
        // a near-field rear-aspect airframe at x = 0 +- 0.06 on the player's
        // nose every time an opener had three members. That is the frame
        // R8's art critique opened at 3x and misidentified as the player.
        // An overtake flight is not a formation holding station, so splitting
        // it either side of the corridor costs it nothing.
        ndcA: [
          clearCorridorAbout(k * 0.42 + (this.rng() - 0.5) * 0.12, playerX),
          -0.02 + (this.rng() - 0.5) * 0.2,
        ],
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
    const baseB = clearCorridor((this.rng() - 0.5) * 0.3);
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
    // The formation's fly-past centre, pushed out of the player corridor.
    // The draw itself is UNCHANGED (uniform +-0.18) so the stream is not
    // re-sequenced by the clamp; only its image moves.
    const baseB = clearCorridor((this.rng() - 0.5) * 0.36);
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
      // R13 GUN DWELL (gap 2). Three UNCONDITIONAL draws per member — the
      // CLAUDE.md shared-PRNG rule forbids a sometimes-draw, so the decision
      // and its magnitudes are always drawn and only SOMETIMES applied. A
      // GUN_DWELL_FRAC fraction of members pause at readable depth so there is
      // a mid-range window to track and gun them before the wingtip. The
      // bomber slot is excluded: it is already the slow, readable aircraft.
      const dwellRoll = this.rng();
      const dwellDepthU = this.rng();
      const dwellTimeU = this.rng();
      const dwell = i !== bomberSlot && dwellRoll < GUN_DWELL_FRAC;
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
        // R13 gun-dwell (see the draws above). A readable-depth pause with a
        // gentle sway so the target reads as hesitating in its pass, not
        // parked. Below FIRE_DEPTH_MIN, so it does not shoot while it loiters.
        holdDepth: dwell
          ? GUN_DWELL_DEPTH_MIN + dwellDepthU * (GUN_DWELL_DEPTH_MAX - GUN_DWELL_DEPTH_MIN)
          : null,
        holdTime: dwell
          ? GUN_DWELL_TIME_MIN + dwellTimeU * (GUN_DWELL_TIME_MAX - GUN_DWELL_TIME_MIN)
          : 0,
        holdWeaveAmp: dwell ? 0.05 : 0,
        holdWeaveRate: 2.2,
      });
    }
    return out;
  }

  // --- R15 BURST WALL: a close-dwell wall that stands, then dissolves --------
  // See the BURST block near the top of this file for the full reasoning. Built
  // from the same measured machinery as the echelon (NEAR_BAND vertical band,
  // the bomber slot, roles/liveries, clampReach, the dispense shuffle) so it
  // reads as a head-on wave; the burst-specific parts are (a) more members,
  // (b) a TIGHT spawn depth so arrivals bunch, (c) a synchronised close-depth
  // HOLD so they stand as a wall, (d) a wide lateral spread that peels OUTWARD
  // on exit. Tagged `_burst` so the dispenser drains it fast under the raised cap.
  _burstWave() {
    const n = BURST_N_MIN + Math.floor(this.rng() * (BURST_N_MAX - BURST_N_MIN + 1)); // 6-9
    const rake = (this.rng() - 0.5) * 0.9;
    const vrake = rake * VERTICAL_RAKE_SCALE;
    // Centred near the frame centre so the wall SPANS the frame (an arcade wall
    // fills it) rather than being shoved to one side; small jitter only.
    const baseB = (this.rng() - 0.5) * 0.12;
    // The wall's altitude, from the measured near-field vertical band, raked
    // into a ladder below so it reads as planes at every height, not a flat row.
    const baseWallY = clampReach(bandSample(NEAR_BAND, this.rng()));
    // ONE hold time for the whole wall so its members FREEZE together and stand
    // as a single event; +-0.35 around the tunable centre.
    const holdTime = Math.max(0.4, BURST_HOLD_CENTRE_S - 0.35 + this.rng() * 0.7);
    // One bomber may lead the wall (variety on span), same discipline as the
    // echelon: drawn once, outside the loop (CLAUDE.md shared-PRNG rule).
    const bomberSlot = this.rng() < 0.34 ? Math.floor(this.rng() * n) : -1;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      // All draws unconditional, used only sometimes — the shared-PRNG rule
      // forbids a sometimes-draw desynchronising the stream.
      const roll = this.rng();
      const roleRoll = this.rng();
      const dwellRoll = this.rng();
      const holdDepthU = this.rng();
      const depthAU = this.rng();
      const yJitterU = this.rng();
      const fireDelayU = this.rng();
      const dwell = dwellRoll < BURST_DWELL_FRAC;
      // The authored lateral position; the on-screen HOLD x lands at ~1.2x this
      // (the 1/d lerp at the ~depth-4 hold), inside an aimer's reach but spread
      // past a blind centred net — the gap-2 supply asymmetry.
      const sx = baseB + k * BURST_SPREAD_STEP;
      const holdDepth =
        BURST_DWELL_DEPTH_MIN + holdDepthU * (BURST_DWELL_DEPTH_MAX - BURST_DWELL_DEPTH_MIN);
      const wy = clampReach(baseWallY + k * vrake + (yJitterU - 0.5) * 0.08);
      out.push({
        // Measurement-only tag; Enemy ignores it. The dispenser reads it off the
        // head of `pending` to drain the wall fast under the raised cap.
        _burst: true,
        pattern: 'approach',
        type: i === bomberSlot ? 'bomber' : roll < 0.25 ? 'interceptor' : 'fighter',
        role: i === bomberSlot ? 'heavy' : this._roleFor(roleRoll),
        // TIGHT depthA (0.95-1.05 x spawn) so the wall's arrivals bunch — the
        // fast dispense plus a tight spawn depth is what lets the early arrivals'
        // holds overlap the late arrivals' instead of passing before them.
        depthA: APPROACH_SPAWN_DEPTH * (0.95 + depthAU * 0.1),
        depthB: FLY_PAST_DEPTH,
        // Tight near the horizon, fanned/peeled OUTWARD at fly-past so the
        // dissolving wall sweeps to the sides and never converges on the central
        // gun band — the blind-floor protection (STATUS R15: don't balloon the
        // blind gun).
        ndcA: [clearCorridor(sx * 0.3), baseWallY + k * vrake * 0.1],
        ndcB: [clearCorridor(sx * 1.7), wy],
        weaveAmp: this.rng() * 0.04,
        weaveRate: 1.1 + this.rng() * 0.9,
        weavePhase: this.rng() * Math.PI * 2,
        // A DWELLING member holds below FIRE_DEPTH_MIN and never fires (a fair
        // gun target you rake). A non-dwelling member flies straight through at
        // mixed depth and fires on its approach like an echelon member, so the
        // wall still carries enemy-fire volume (R4 gap 5 forbids losing it) and
        // the wall has depth variety. The fire-delay draw is unconditional.
        fireDelay: dwell ? 1e9 : 0.0 + fireDelayU * 0.15,
        holdDepth: dwell ? holdDepth : null,
        holdTime: dwell ? holdTime : 0,
        // A slow lateral sway while frozen: a tracking sight follows the wall, a
        // parked sight only clips it — the skill the gun kill is meant to price.
        holdWeaveAmp: dwell ? 0.04 : 0,
        holdWeaveRate: 1.1,
      });
    }
    return out;
  }

  // --- R13 LOCK-BAIT: a distant cluster that holds for the missile ----------
  // A tight head-on cluster that approaches and FREEZES just inside the lock
  // band, placed up and to one side of the sight's rest posture. It is the
  // arcade's distant salvo wave, presented at a reachable posture: a pilot who
  // turns and climbs the sight onto it holds the lock-bracket cue and racks up
  // a salvo; a dead-centre parked stick does not get it for free (verified by
  // the blind-vs-aiming control, judging/R13/). The cluster never fires while
  // it holds (holdDepth < FIRE_DEPTH_MIN) — the distant wave you lock before
  // it engages.
  _lockBaitWave() {
    const n = 3 + Math.floor(this.rng() * 2); // 3-4
    const dir = this.rng() < 0.5 ? -1 : 1;
    const baitX = dir * (BAIT_X_MIN + this.rng() * (BAIT_X_MAX - BAIT_X_MIN));
    const baitY = BAIT_Y_MIN + this.rng() * (BAIT_Y_MAX - BAIT_Y_MIN);
    const holdDepth = BAIT_HOLD_DEPTH_MIN + this.rng() * (BAIT_HOLD_DEPTH_MAX - BAIT_HOLD_DEPTH_MIN);
    const holdTime = BAIT_HOLD_TIME_MIN + this.rng() * (BAIT_HOLD_TIME_MAX - BAIT_HOLD_TIME_MIN);
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      const roleRoll = this.rng();
      out.push({
        pattern: 'approach',
        type: 'fighter',
        role: this._roleFor(roleRoll),
        // R16 — the lock system draws the "aim here" hint bracket on these while
        // the player holds the missile button (first-lock discoverability cue).
        lockBait: true,
        depthA: APPROACH_SPAWN_DEPTH,
        depthB: FLY_PAST_DEPTH,
        // At the hold depth q ~= 0.13, so the on-screen position is essentially
        // ndcA (enemy.js header note 2). Author the cluster where it should
        // FREEZE: tight, off-centre, up near but above the resting cone.
        ndcA: [clampReach(baitX + k * 0.06), baitY + k * 0.015],
        // R14 — PEEL OFF TO ITS OWN SIDE after the hold, rather than diving to
        // the central fly-past. The cluster holds off-centre on the `dir` side
        // (baitX = dir*0.1..0.2); its exit is pushed far out the SAME side
        // (|x| ~ 1.0, off-frame) so as the depth resumes dropping it sweeps out
        // laterally and never crosses the central gun band where a dead-centre
        // stick would collect it for free. This is what lets BAIT_EVERY = 2
        // (above) raise the missile's reliability without raising the blind gun
        // floor. It also reads better — a distant wave you lock, that then
        // breaks off — than a cluster that obligingly flies down your throat.
        // The lock is already taken during the hold, so the exit path costs the
        // aiming pilot nothing.
        ndcB: [dir * (0.95 + this.rng() * 0.2) + k * 0.1, clampReach(baitY - 0.12 + k * 0.08)],
        weaveAmp: 0.01,
        weaveRate: 1.2,
        weavePhase: this.rng() * Math.PI * 2,
        // Never fires: it is below the firing band for its whole hold and only
        // drops through afterward. Large delay keeps intent explicit.
        fireDelay: 1e9,
        holdDepth,
        holdTime,
        // A slow, wide lateral sway while frozen: this is the motion a
        // tracking sight follows and a parked sight only clips, which is the
        // skill the lock prices. All members share the wave's drift so the
        // cluster moves as one and still reads as a formation.
        holdWeaveAmp: 0.09,
        holdWeaveRate: 0.9,
      });
    }
    return out;
  }

  // --- R13 LARGE CLOSE FLYBY: the screen-crossing event (gap 3) --------------
  // One big slow aircraft that crosses near the camera and reaches full
  // fly-past size, the "something crosses big every second or two" the arcade
  // runs and ours lacked. A bomber (1.35x span) on a shallow lateral path
  // through the near field, started off the player's current side so it sweeps
  // across the middle of the frame.
  _flyby(playerX = 0) {
    const dir = playerX <= 0 ? 1 : -1; // enter from the emptier side, cross over
    const roleRoll = this.rng();
    return {
      pattern: 'crosser',
      type: 'bomber',
      role: this._roleFor(roleRoll, CROSSER_ELITE_BONUS),
      // Starts closer than an echelon and crosses slowly: a bomber's 0.5908
      // rate halved again by the crosser magnitude, so it is on screen long
      // enough to register as an event.
      depthA: 26 + this.rng() * 8,
      depthB: 2.9,
      // From one side, through the near-centre, out the other — passing large
      // across the player's own column at its closest.
      ndcA: [dir * (-0.7 - this.rng() * 0.15), -0.02 + (this.rng() - 0.5) * 0.18],
      ndcB: [dir * (0.85 + this.rng() * 0.2), clampReach(-0.18 + (this.rng() - 0.5) * 0.3)],
      weaveAmp: 0.02,
      weaveRate: 1.4,
      weavePhase: this.rng() * Math.PI * 2,
      // Spawns at depth 26-34 as a crosser (half rate), so its telegraph
      // geometry matches the ordinary crosser's: it does not meaningfully fire.
      fireDelay: 0.6 + this.rng() * 0.6,
    };
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
    // R15: the non-bait rotation counter resets with the sky, so a fresh
    // stage/life opens its ordinary rotation the same way every time.
    this.ordinaryIndex = 0;
    // R13: a fresh stage/life should not instantly force-spawn or drop a flyby
    // on top of the opener. Reset the empty tracker (the opener fills the sky
    // next tick) and re-seed the flyby delay the same way the constructor does.
    this.emptyTimer = 0;
    this.flybyTimer = Math.min(FLYBY_PERIOD_S, 8);
    // R32: a fresh stage/life starts with the opener filling the near field, so
    // the close-drought timer must not carry a stale accumulation across it.
    this.closeDroughtTimer = 0;
  }
}

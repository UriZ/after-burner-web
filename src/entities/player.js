import * as THREE from 'three';
import {
  createJetSprite,
  createAfterburnerFlame,
  setJetNightPalette,
  loadPoseSheetTexture,
  selectPoseCell,
  selectRollCell,
  JET_POSE_SHEET,
  JET_POSE_SHEET_NIGHT,
  JET_ROLL_SHEET,
} from '../render/spriteFactory.js';
import { CAMERA_HEIGHT, CAMERA_PITCH } from '../core/cameraGeom.js';

// Sprite-art lane note (R5 item E): the bank-pose ladder below
// (BANK_POSE_DEG, nearestBankPoseDeg) turned out to be exactly the right
// shape of logic for picking a cell out of an authored pose sheet, and the
// pixel-artist lane has now shipped `player-f14.png` and `player-f14-night.png`
// (9 drawn poses each, render/spriteFactory.js's JET_POSE_SHEET /
// JET_POSE_SHEET_NIGHT) -- so the normal-bank `material.rotation` line below
// is replaced with `selectPoseCell` once a sheet finishes loading
// (fire-and-forget at construction; the loader is null-safe, so until then --
// or if decoding ever fails -- the original procedural rotation stays the
// fallback, never a broken frame).
//
// R5b, sprite-art's ask A2: BOTH sheets are loaded and `this._night` picks
// between them. The old `!this._night` short-circuit existed only because
// there was no night sheet, and it meant night stages banked by SPINNING one
// bitmap while day stages selected a drawn pose -- a difference in feel, not
// just in art. The per-sheet null check keeps the two failure modes
// independent: a night sheet that fails to decode falls back to the
// procedural night texture (setNight's setJetNightPalette call puts it on the
// material) without disturbing day, and vice versa.
//
// R6: the BARREL ROLL is now drawn too. `player-f14-roll.png` shipped in R5
// (8 cells, spriteFactory.js's JET_ROLL_SHEET / selectRollCell) and was left
// deliberately unwired when the stop-work arrived; update() below now selects
// a roll cell from `rollPhase` instead of spinning the procedural bitmap.
// The three middle cells carry a blue-violet DORSAL palette that does not
// exist anywhere in the astern view, which is the whole point -- a spun
// astern bitmap stays warm grey at every phase and is wrong everywhere but 0.
// Known residual, documented rather than hidden: there is no NIGHT roll sheet,
// so a roll on stage 3 draws the daylight cells. Day and night differ in hue
// at matching value (spriteFactory's PLAYER_PALETTE_NIGHT note), so this is a
// ~1.1 s hue pop, not a value pop -- and it buys the drawn manoeuvre in every
// stage instead of only in daylight. Asked for in judging/R6/ask-flow.md.

// "Jet roams a wide screen area" (ARCHITECTURE.md D7 item 2). Envelope is in
// world units at the jet's fixed depth in front of the camera.
//
// R11 -- CUT FROM 2.6, AND THE FIRST VERSION OF THIS COMMENT WAS WITHDRAWN.
//
// WHAT I PUBLISHED HERE FIRST AND RETRACTED: an arcade "player aircraft"
// envelope of +-29.5 %W, hand-digitised off 0.42-scale contact sheets, which
// said this constant passed at 1.19x and must not move. **It was reading ENEMY
// AIRCRAFT.** The combat lane challenged it; I re-read my own extreme frames at
// 1:1 and found empty sea, empty sky and a carrier deck at the three points I
// had called the player. `judging/R11/arcade_jet_x.csv` is withdrawn.
//
// THE IDENTITY TEST, since it is the reusable part: **the player's F-14 has TWO
// afterburner nozzles and every arcade enemy has ONE.** At 0.42 scale that is
// invisible and the two are not separable. I had validated my ruler's PRECISION
// (1.14 %W test-retest) and published it as if it licensed the measurement;
// precision was never the problem, identity was, and I never checked identity at
// the scale I was reading at.
//
// THE CORRECTED ARCADE COLUMN, three operators, two lanes:
//   * the arcade's SIGHT rails at **x in [415.5, 618.0] of 1028 = +-9.85 %W**
//     about 50.27 %W -- R10's [416, 618] reproduced to a tenth of a pixel by an
//     independently written detector (combat lane, stage 12, 420 CONSECUTIVE
//     60 Hz frames, 63 tracked detections, all cropped and looked at).
//   * the arcade's AIRCRAFT **tracks that sight**: nozzle-midpoint 0..+5 px from
//     the detected sight column over 12 frames at both rails; ratio 1.02 +- 0.03.
//     Corroborated independently by my own 7 reads at 1:1, which put the player
//     at 45.5 / 48.3 / 50.0 / 50.5 / 50.8 / 52.8 / 61.0 %W.
//   * so the arcade's jet half-envelope is **+-10 %W**, not +-29.5, and our
//     shipped +-34.93 %W was **3.55x too wide**. R10 gap 2 was right.
//
// 0.733 is not rounded to: it is 2.6 * 9.85/34.93, the screen fraction being
// linear in world x at a fixed depth. **MEASURED BACK on a pristine extraction
// plus this diff: sight rail +-9.85 %W, against the arcade's +-9.85.**
//
// THE COST, MEASURED AND NOT HIDDEN -- and then measured again on a second
// variable by the combat lane, which changed the conclusion.
//
// A tracking pilot's missile kills in 90 s at a fixed trigger cadence fall
// **21.7 -> 14.3, -34 %**, mean of seeds 3/5/11 on pristine extractions
// (per-seed 18->11, 27->19, 20->13; 3 of 3 down, -30 to -39 %). The combat
// lane reproduces -30 % on an independent implementation from a different
// baseline commit. **The first version of this comment said -39 % from seed 3
// alone; that was the extreme pair of two distributions with a +-4-kill
// spread.** It is NOT my probe's pursuit policy: a `reach` control arm that
// chases only what the rail can reach, and otherwise holds centre, recovers
// one kill.
//
// **THE COST IS SPECIFIC TO A PILOT WITH ZERO REACTION TIME, AND REVERSES BY
// 300 ms.** The combat lane's `human_arm.mjs` is the same pursuit law with the
// stick delayed N ticks, swept, 3 seeds (mean kills):
//
//                      0 ms    150 ms   300 ms
//   wide +-34.93 %W    20.3     16.3      5.3
//   THIS BUILD +-9.85  14.3     14.7     14.3
//
// A human has 150-300 ms. At 150 the cut costs 10 %; by 300 the WIDE rail has
// lost 74 % of its kills and this build scores nearly 3x as much. The
// mechanism is feel-critique.md §3.4's own prediction -- limit-cycle amplitude
// is `rate x lag`, which is 31 %W on the old rail and saturates harmlessly
// against a +-9.85 one. **Caveat, mine not theirs: a pure delay line is a
// pessimistic human -- real pilots lead, they do not thrash -- so the 300 ms
// row overstates the wide rail's handicap. Direction trustworthy, magnitude
// not. And there is NO ARCADE COLUMN for pilot latency, so this can refute a
// claim about our builds and must never rank them.**
//
// Residual real concern, logged rather than fixed: the engageable band is now
// the rail plus the lock cone, ~+-18 %W, against a spawner.js lateral spread
// still tuned for +-34.93. judging/R11/ask-spawner.md.
//
// COUPLINGS, CHECKED RATHER THAN ASSUMED. `spawner.js` derives only
// REACH_CEILING_NDC_Y, from ENVELOPE_**Y** -- the lateral axis is clear (grep).
// `demoTimeline.js` imports this constant and normalises its controller by it,
// so the attract wander scales with it and its gain is dimensionless; measured
// in judging/R11/ask-flow.md. `LOCK_RADIUS_FRAC` rides the sight -- see
// lockSystem.js.
//
// FOOTNOTE FOR WHOEVER RE-OPENS REFERENCE #122. Its cruise `cx sd` of 12.88 %W
// **cannot be produced by a jet confined to +-9.85 %W** -- a uniform spread over
// that rail has sd 5.7. #122 is ADOPTED from the old prototype and measures the
// PROTOTYPE's jet. The flow lane raised this as a conflict; I wrongly reported it
// closed on the withdrawn figure above. **It is open, and the arcade sight rails
// are now the better-evidenced side of it.**
export const ENVELOPE_X = 0.733;

// R7 (R6 judge gap 5). The vertical envelope is now ASYMMETRIC, and the single
// `ENVELOPE_Y = 1.1` it replaces is the clamp behind the judge's finding that
// "our pilot occupies the top third of the screen 0.00 % of 20 970 flight ticks".
//
// WHY ASYMMETRIC, which is the part that is not obvious. The arcade player's
// own screen altitude has now been hand-counted TWICE independently — 61
// observations (judging/R6/lane-combat.md, stages 1/4/6/7/12/19) and 48 more
// this round by a different reader on different stages and a different grid
// (judging/R7/lane-flow.md §2, stages 2/3/9/14/20). The two agree: their means
// are 0.69 points of H apart. Pooled, n = 109:
//
//     min 27.0   p5 36.4   p50 50.0   p95 62.0   max 67.0   sd 7.73  %H
//
// Our rails, committed, measured on this build (tools/out/flow-r7/map_probe.mjs,
// stick held to the stop until settled): full UP 35.09 %H, full DOWN 77.31 %H,
// neutral 55.60 %H. So the DOWN rail already sits **10 points past the deepest
// dive the arcade pilot was ever observed to make**, while the UP rail falls
// **8 points short of his highest climb**. There is no arcade evidence for more
// downward authority and a lot for more upward authority, so only the up rail
// moves. 1.55 is not rounded to: it is solved so full stick lands on the
// arcade's observed ceiling, and it measures back at **27.02 %H** against the
// arcade's 27.0.
//
// And the down rail is not merely unsupported, it is actively WRONG to raise,
// which a capture settles and arithmetic would not have (tools/out/flow-r7/
// rails/rails-montage.png — look at it before changing these). ui/hud.js's
// bottom strip occupies y 198..218 of 224 = 88.4..97.3 %H. The jet is ~15.5 %H
// tall, so at the committed 1.10 down rail its lower edge reaches 85.0 %H and
// clears the strip by 3.4 points; at 1.55 it is 6 points INSIDE it, and at the
// 1.90 that judging/R6/ask-combat.md asked for, the airframe's own CENTRE
// (93.91 %H) is inside the HUD band and the jet is drawn across the SPEED bar,
// the STAGE digit and the missile stock. The committed 1.10 turns out to be
// almost exactly the largest down rail that keeps the airframe clear.
//
// Upward there is headroom: at 1.55 the fin tips reach 19.3 %H against the top
// HUD row's 11.2 %H lower edge. The top band only becomes the binding
// constraint past about 2.1.
//
// Exported because src/game/spawner.js derives its own `REACH_CEILING_NDC_Y`
// from this number and its comment says in capitals to re-derive when this
// moves — three hand-synced copies of a constant is what core/cameraGeom.js
// exists to stop happening again. See judging/R7/ask-flow.md A1.
//
// R8 (R7 judge gap 5): the re-derivation was finally DONE, and it kills the
// constant rather than updating it. `tools/out/flow-r8/rails_probe.mjs`, which
// reads every input out of the source at run time instead of copying it:
//
//     player ndcY at full up stick, settled   +0.45966  (27.017 %H)
//   + combat.js SIGHT_NDC_Y_OFFSET             0.30     -> sight tops at 0.7597
//   + lockSystem.js LOCK_RADIUS_FRAC 0.22 / (0.5*224/320) = 0.6286 of y reach
//   = REACH CEILING                            1.3882 NDC
//
// NDC y runs to +1.0, so the reachability bound spawner.js's 0.64 claims to be
// is **off the top of the screen** and does not bind anywhere a player can see.
// The comment there derives it from a lock radius of 8.3 %W that is not in
// lockSystem.js (it ships 0.22 = 22 %W) and a player ceiling of +0.106 that
// this file obsoleted in R7. Measured consequence of lifting it, two seeds,
// 180 s each (`tools/out/flow-r8/enemy_alt_probe.mjs`): enemy p5 altitude
// 20.24 -> 16.16 %H (seed 1) and 18.61 -> 13.60 (seed 7) against the arcade's
// published 14.1, and top-third share 30.47 -> 31.06 and 31.98 -> 32.56
// against the arcade's 32.5. Both statistics move TOWARD the arcade.
// spawner.js is the combat lane's file — judging/R8/ask-flow.md F1.
//
// The 1.55 itself is unchanged and the probe reproduces its published rail to
// three decimals (27.017 %H against the 27.02 written above), including
// through a real KeyboardEvent on the page's own window rather than only
// through __setStick — the two agree to 0.000000 NDC.
//
// R15 — THE "SIGHT CAN'T REACH" KEYSTONE WAS REFUTED; NEITHER RAIL MOVES.
// R15 opened on the premise that both combat residuals reduce to this envelope
// being too small (sight "tops at +0.40 climbing, rests +0.30, resting cone
// +0.537", bait only grazed). That arithmetic used the STALE +0.106 player
// ceiling and assumed neutral playerNdc.y = 0. Re-measured against combat's own
// live hooks (three agents, identical numbers): at x=0, settled,
//   neutral  sight +0.188 (player -0.112), rest-cone top 0.425
//   full UP  sight +0.760 (player +0.460)  -- OVERSHOOTS the bait (0.44-0.58)
//   full DN  sight -0.246 (player -0.546),  cone bottom -0.483
// __combatDebug playerNdc.y == __flowState jetNdcY == __sight().ndcY - 0.30 to
// 5 decimals (tools/out/player-r15/measure_reach.mjs). Our sight travel (+0.76
// climb / -0.25 dive) already OVER-reaches the arcade's measured +0.62 / -0.18
// (judging/R15/playtest-open.md); growing it moves AWAY from the arcade. Locks
// and a 6-missile salvo were converted in by-eye play; the missile's real
// blocker is execution UX (climb-to-lock draws fire; hold/release is non-
// obvious) and the gun's is target supply + the span hit net -- both combat's
// lanes, not this envelope. Full working: judging/R14/combat-asks.md (corrected
// header) and judging/R15/playtest-open.md.
export const ENVELOPE_Y_UP = 1.55;
export const ENVELOPE_Y_DOWN = 1.1;

// ---------------------------------------------------------------------------
// THE FLIGHT MODEL — R10. THE ENVELOPES ABOVE ARE UNCHANGED AND STILL MEAN
// EXACTLY WHAT THEY MEANT: they are now CLAMPS rather than the targets of an
// exponential chase, and the settled position at full stick is identical to
// five decimals, so every rail measurement in the R7/R8 record still holds.
//
// WHAT CHANGED AND WHY. Until this round:
//
//     const t = 1 - Math.exp(-FOLLOW_RATE * dt);   // FOLLOW_RATE = 6.0
//     this.x += (targetX - this.x) * t;
//
// There was no velocity state in the aircraft at all. Position chased the
// stick with a 0.167 s time constant, which makes the per-tick step a
// geometric decay at exp(-6/60) = 0.8948 -- the jet is at its FASTEST on the
// first tick of every input and decelerating from then on, it cannot coast,
// and it cannot overshoot in any direction. R9 measured all of that to five
// decimal places (feel-critique.md §3): peak per-tick on tick 1 for all four
// step inputs, overshoot +0.00000 on all four.
//
// THE ARCADE'S OWN AIM POINT DOES NOT DO THAT, and this is the first
// measurement of it in the project. Tracking AB2's 1.563 %W sight glyph
// across CONSECUTIVE 60 Hz frames (judging/R10/lane-feel.md §3; the tracker
// is tools/out/feel-r10/brackets.py, whose two size modes independently
// reproduce the two published arcade HUD sizes) gives, in burstA f107-f118:
//
//     x = 548 554 560 567 573 580 586 592 599 605 ... 618   (px of 1028)
//     per-frame step = 6.2 px, DEAD CONSTANT over twelve frames
//     then f120-f122: 608 602 596 -- reversal at 6.0 px/frame, same magnitude
//
// A constant rate while held, reversing at full magnitude, is the signature
// of a RATE control -- the stick commands a speed, not a position. An
// exponential position chase cannot produce a flat velocity plateau at any
// gain. Those are the two models and the arcade's series picks one.
//
// So: the stick commands a VELOCITY (RATE_*), the velocity lags the command
// with its own time constant (ACCEL_RATE -- this is the mass), position
// integrates it, and the envelope clamps. Three consequences the old model
// could not have, all of them the thing the owner asked for:
//
//   * a CONSTANT-RATE PLATEAU in the middle of a move, which is what the
//     arcade's series shows.
//   * HOLD STATION ON RELEASE. Let the stick go and the jet stays where it is
//     instead of taking the whole move back. The rails prove the arcade does
//     this: over 151 tracked detections its sight never leaves [416, 618] of
//     1028 and its stationary holds sit ON those two values, on four stages
//     310 s apart. AB2 does not auto-centre.
//
// ---------------------------------------------------------------------------
// R11 -- THE ACCELERATION RAMP IS REMOVED, AND ONLY THE RAMP.
//
// R10 also gave the velocity a lag of its own (ACCEL_RATE = 12, a 0.083 s time
// constant) so that the jet would "build up to its travelling speed". Three
// independent 60 Hz decodes say the arcade does not do that:
//
//   onset, w1 f0098-f0103, an isolated sight glyph over empty sky
//       x  = 499.5 502.5 502.5 508.5 515.5 521.5      px of 1028
//       dx =       +3.0    0.0   +6.0  +7.0  +6.0
//   stop,  w3 f0254-f0279:  +6.0 x6, +3.5, 0.0 x18    -- ONE intermediate frame
//   reversal, w2 f0254-f0259: 0.0 -4.0 +1.0 0.0 +6.5  -- no ramp at all
//
// **No ramp longer than one frame exists anywhere in 138 consecutive-frame
// steps, across stages 1, 3, 4 and 12 and thirteen separate manoeuvres**
// (judging/R10/lane-feel.md §3 and feel-critique.md §3.1/§3.3, two operators,
// two detectors, disjoint stage populations). And the longplay is 30 Hz
// content frame-doubled to 60 -- its SCORE field changes on every SECOND video
// frame, verifiable in any consecutive decode -- so the arcade's "one frame" is
// one 30 Hz game tick, which is the shortest response a 60 Hz model can give.
//
// The cost of the ramp, measured on pristine extractions of three trees
// (feel-critique.md §3.3): onset t90 1 tick -> 12 ticks and mid-travel
// reversal t90 1 tick -> 14 ticks between 8725647 and 21c789c. ~12x slower to
// respond, ~7x slower to reverse, against an arcade that does both in one.
//
// HOLD-STATION IS NOT WHAT THE RAMP WAS BUYING, which is the thing to get
// right before deleting anything. The jet holds station because the stick
// commands a RATE and there is no auto-centre: at zero stick the commanded
// velocity is zero, so the position stops. That is a property of the rate
// model, not of the lag. With the lag gone the velocity reaches zero on the
// release tick instead of coasting ~25 px down an exp(-12*dt) tail, and the
// position still stays exactly where it was left. R10's own diagnosis was
// right and only its cure overshot.
//
// (The claim that "44 % of the displacement arrives after release" did NOT
// survive and is not what is being fixed here: it runs 52.6 -> 34.2 -> 22.2 %
// as the hold lengthens and goes to zero once the hold reaches the rail, so it
// is a property of the 0.20 s hold, not of the model. The invariant was the
// ~25 px coast. That is what goes.)
//
// RATE_X IS NOW THE ARCADE'S OWN LATERAL RATE, AND IT IS DECOUPLED FROM
// ENVELOPE_X ON PURPOSE.
//
// It used to be written `3.0 * ENVELOPE_X`, which welded two quantities that
// have separate arcade columns: cutting the envelope to the arcade's would have
// dragged the rate down to 0.305 fracW/s, BELOW the arcade's measured 0.379.
// They are different things and they are now two constants.
//
// THE ARCADE'S FIGURE, and the comment that used to stand here was REFUTED --
// corrected rather than deleted, because the next agent would otherwise
// re-derive it. It read: "that arcade figure is ONE pilot, ONE 0.3 s window, at
// an unknown stick deflection, so it is a LOWER BOUND on the arcade's maximum
// and not the maximum." It is not a lower bound: across **138 consecutive-frame
// steps, 13 manoeuvres and 3 stages** the distribution SATURATES -- 53 steps at
// +6 px/frame of 1028, 9 at +7, one at +8, nothing above, with the intermediate
// bins (+-3, +-4) holding 9 of 138. A lower bound from unknown deflections would
// spread; this is a control resting on its stop. **0.379 fracW/s (median
// non-zero 2.02 native px/frame) is the arcade's maximum.**
//
// A SECOND WITHDRAWAL, recorded because it is the trap. The first R11 comment
// here rescued our old 1.048 fracW/s by scaling the arcade's sight rate up by a
// 2.95 "jet : sight excursion ratio". **That ratio came from the withdrawn
// envelope above and is wrong -- the arcade's aircraft TRACKS its sight, ratio
// 1.02 +- 0.03.** So the arcade's sight rate is also its jet rate, our 1.048 was
// 2.76x too fast exactly as R10 said, and the rescue is void.
//
// 2.82 is solved, not picked: 0.379 fracW/s / 0.13435 fracW per world unit
// (= the measured 34.93 %W per 2.6 world units, linear at a fixed depth).
//
// MEASURED BACK, pristine extraction + this diff, consecutive 60 Hz ticks, and
// all THREE are published together because STATUS row 58 says rate, span and
// traverse time travel as a set or not at all:
//
//              sight rail      plateau          rail -> rail
//   5e3d57e    +-34.93 %W      1.034 fracW/s    45 ticks / 0.750 s
//   + R11      **+-9.85 %W**   **0.379**        **32 ticks / 0.533 s**
//   ARCADE     +-9.85 %W       0.379            ~32 ticks / 0.527 s  (derived)
//
// All three land at once, which is the strongest evidence this pair is right.
// R10 §3.4's four-arm A/B predicted 0.583 s for "RATE + ENVELOPE := arcade" and
// got it on independent grounds; we come in better because the ramp is gone too.
//
// RATE_Y is deliberately NOT decoupled and NOT retuned: there is no arcade
// column for the vertical rate at all, and the vertical envelope rests on 109
// hand-counted observations (see ENVELOPE_Y_UP). Asymmetric evidence,
// asymmetric treatment.
const RATE_X = 2.82; // world units/s at full lateral stick -- see RATE_X note
const RATE_Y_UP = 3.0 * ENVELOPE_Y_UP;
const RATE_Y_DOWN = 3.0 * ENVELOPE_Y_DOWN;

// Jet-sprite bank, R5 feel fix (feel-critique.md §3/§10 rank 3). MEASURED
// arcade behaviour: the drawn jet snaps between a quantised ladder of SIX
// bank poses (0/8.4/15.9/23.3/30.3/35.6 deg) at >=1236 deg/s, driven by the
// STICK, while the world rolls underneath it at a much slower, independent
// ~74.5 deg/s (game.js's ROLL_RATE_DEG_PER_S) — r=-0.257 correlation between
// the two in the critique's own measurement, i.e. not slaved together at
// all. We had welded jet bank to 0.8x of the slow world roll, making the
// ONE piece of instant input feedback as sluggish as the heavy one.
// The ladder is walked at a fast rate each tick and the CURRENT angle
// snapped to its nearest rung, which reproduces the "steps through discrete
// poses, doesn't ease" look and feeds the authored pose sheet directly.
//
// R5b: the target is `input.x` SCALED, not just its SIGN. The original form
// was `sign(input.x) * 35.6`, written when core/input.js was the only source
// and its x was binary — but `?demo=1`'s stick is analog, and so is any
// gamepad we ever add, so ANY non-zero deflection snapped the drawn jet to
// its 35.6 deg extreme. Found by measurement, not by reading: a jet-on/
// jet-off difference mask over seven cruise frames read a span of
// 20.27%W against the 34-38%W band, because every frame sampled was at
// full bank and the published band is a LEVEL-astern statistic. The arcade
// stick is analog too (MAME segaxbd.cpp clamps it to 0x20-0xe0), and
// REFERENCE.md's six-pose ladder is exactly what a proportional deflection
// quantises onto. Keyboard behaviour is unchanged: |x| = 1 still targets the
// top rung and still gets there in one tick.
const BANK_POSE_DEG = [0, 8.4, 15.9, 23.3, 30.3, 35.6];
const BANK_SNAP_RATE_DEG_PER_S = 1400; // comfortably over the critique's >=400 deg/s floor

function nearestBankPoseDeg(absDeg) {
  let best = BANK_POSE_DEG[0];
  let bestDist = Infinity;
  for (const step of BANK_POSE_DEG) {
    const dist = Math.abs(step - absDeg);
    if (dist < bestDist) {
      bestDist = dist;
      best = step;
    }
  }
  return best;
}

// Camera geometry, used here to cancel the camera's roll term for the player
// sprite — see the big comment in update() below. R6: these were TRANSCRIBED
// copies of game.js's constants with a "re-sync by hand if game.js retunes
// them" note attached; they are now imported from core/cameraGeom.js, which
// game.js also reads, so the two cannot drift apart any more. Behaviour is
// unchanged — the imported values are the same numbers that were written here.
const _pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), CAMERA_PITCH);
// World-space axis the camera actually rolls around: game.js composes
// camera.quaternion = pitchQuat.multiply(rollQuat), where rollQuat rotates
// around the camera's own LOCAL +Z axis (THREE convention: camera looks
// down -Z, +Z is "backward"). Conjugating that composition is equivalent
// to rotating around pitchQuat applied to (0,0,1) in WORLD space — NOT
// (0,0,-1) — by the same angle. Getting this sign/axis wrong makes the
// compensation below add to the bug instead of cancelling it; verified
// empirically, not just derived (see dev report capture/measurement).
const _rollAxisWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(_pitchQuat);
const _cameraPos = new THREE.Vector3(0, CAMERA_HEIGHT, 0);

// Jet world-space width at baseZ=-5 under the current camera (FOV 55deg,
// game.js). The analytic estimate (half-vFOV=27.5deg, visible width at
// depth 5 = 2*5*tan(27.5deg)*aspect(320/224) = 7.44 world units -> 2.7
// should give ~36.3%W) undershot in practice. MEASURED via column-run on
// real captures (own Python re-implementation of REFERENCE.md's method,
// 960px-wide frame): worldWidth=2.7 -> tools/out/jethud-r2/frame-0000.png,
// span 318px = 33.1%W, bbox aspect 3.42:1. worldWidth=2.95 ->
// tools/out/jethud-r2-tune/frame-0000.png, span 348px = 36.25%W, bbox
// aspect 3.31:1 — both inside the 34-38%W / 3.2-3.8:1 R1 acceptance band.
// RE-VERIFIED after game.js's CAMERA_PITCH flip (gap 2) and the
// consequent baseY fix (gap-2-regression, game.js commit dcdddb4):
// tools/out/jet-retune-baseY/frame-0000.png still reads 36.25%W, 3.31:1
// (coincidentally identical to pre-fix, not re-derived by luck — checked
// by direct re-measurement, not assumed) — AND centroid cy now lands at
// 55.95%H, inside REFERENCE.md's measured 52.8-58.3%H cruise band.
// RE-TUNED again for the gap-7 sprite redesign (R3): the new silhouette's
// canvas WIDTH is unchanged (76px) but a wider wing-root/wingtip shape
// measured 39.06%W at worldWidth=2.95 (tools/out/jethud-r3/jet-final),
// just outside 34-38%W. Scaled down proportionally: 2.95 * (36/39.06) =
// 2.719, re-measured at 2.72 (see dev report for the confirmed number).
// Re-derive if camera FOV/pitch or the player's baseZ/baseY change again
// (owned by game.js, outside this file).
const JET_WORLD_WIDTH = 2.72;

// Barrel roll, R5 feel fix (feel-critique.md §9/§10 rank 13: "pure
// spectacle — ship it for the look, not for i-frames", explicitly ordered
// AFTER everything above). GAME_SPEC.md §1 MEASURED: a true 360 deg rotation
// in ~1.0-1.2s, triggered by "slam the stick one way then the other"
// (ASSUMED trigger — not pinned down on footage), which SUPPRESSES world
// roll for its duration (the horizon stays level through it — that
// suppression is how footage tells a roll apart from a hard bank). Visual
// only, no i-frames (HG101: the arcade move had none either).
const ROLL_SLAM_WINDOW_S = 0.35; // max gap between the two opposite flicks that counts as a "slam"
const ROLL_SLAM_MIN_X = 0.5; // min |stick x| that counts as a flick at all (see the slam detector)
const ROLL_DURATION_S = 1.1;
const ROLL_COOLDOWN_S = 0.3; // guards against re-triggering off the same stick motion

// ---------------------------------------------------------------------------
// AFTERBURNER FLAME (R13 gap 4). The flame sprite is built in spriteFactory.js
// (createAfterburnerFlame -- see its header for the arcade reference and why
// this is a separate layer rather than a repaint of the baked airframe) and
// childed to the jet sprite here, so it banks/rolls/launches/hides WITH the
// jet. These constants place and drive it; they are tuned by eye against the
// astern arcade crops, not solved, so adjust them against a capture.
//
// Positions are in the jet sprite's LOCAL quad space (x,y in [-0.5, 0.5],
// multiplied by the parent's world scale 2.72 x ~1.957). The flame's two
// texture cones are scaled to land on the airframe's nozzle centres (local x
// +-0.15) and its hot cores pinned to the nozzle line, with the cones growing
// DOWNWARD (aft, in the astern view) as throttle opens.
const FLAME_SCALE_X = 0.46; // local scale.x -> world width ~1.25, cones at ~+-0.15
// R27b — SHORTER PLUME. 0.5 gave a long cone (up to 0.71 at full throttle);
// because the airframe's drawn nozzles move around their cell differently in
// each hand-authored bank/roll pose, a long plume's far body swung clear of the
// tail on the hard LEFT bank and mid-roll -- the residual detachment the owner
// still saw after the follow fix. A compact plume anchored at the nozzle line
// cannot visibly separate however the pose rotates, and the arcade afterburner
// is itself a short bright stub, not a liquid tail (R14 judge's "long and
// liquid" note). 0.34 keeps a clear flame without the swing.
const FLAME_BASE_SCALE_Y = 0.34; // local scale.y at mid throttle before flicker/throttle
const FLAME_TOP_LOCAL_Y = -0.02; // the flame's TOP edge is pinned here (over the nozzle discs)
const FLAME_LOCAL_Z = 0.06; // in FRONT of the airframe so the cores glow over the dark nozzle rings
// Throttle L/M/H -> plume length and intensity. The arcade afterburner visibly
// lengthens and brightens with speed; this is what makes the throttle verb
// (near-decorative until now) read on the aircraft itself. R27b trimmed the
// top end (was 1.42) so even full throttle stays a compact, attached stub.
const FLAME_LEN_BY_THROTTLE = [0.68, 1.0, 1.26];
const FLAME_OPACITY_BY_THROTTLE = [0.8, 0.92, 1.0];
const FLAME_FLICKER_FPS = 13; // frame-swap rate between the two authored cone shapes
const FLAME_JITTER_HZ = 38; // scale-jitter rate layered on top of the frame swap
const FLAME_JITTER_AMP = 0.08;
// How much of the airframe's bank the plume follows (R27 regression fix).
// R15 tuned the flame against the OLD "insect-face" sheet, whose hard-bank
// poses swung the whole jet -- nozzles included -- rigidly about the cell
// centre, so rotating the plume by the FULL bank angle kept it on the
// nozzles. R25 redrew the airframe as a real F-14 whose nozzle cluster stays
// near the cell CENTRE in every pose (the jet leans, the engines barely
// move). Against that art the full-angle swing flung the plume a third of
// the screen sideways -- the detached cone the owner reported. In the astern
// view the exhaust points away from the camera and barely crosses the screen
// when you roll, so the plume should trail aft and only LEAN with the bank.
// A barrel roll is a real 360deg image-plane spin and keeps the full rotation
// (handled by the _rollActive branch below).
// R31 — FULL follow (1.0), corrected from the R27 0.4. The pose sheet's banked
// cells are the level planform ROTATED FULLY about the cell centre (player-f14.js
// header: "banking rotates the jet in place exactly as material.rotation did"),
// so the drawn NOZZLES rotate by the full bank angle. 0.4 UNDER-rotated the
// plume, so it lagged the nozzle and tore off one side on a hard bank — the
// detachment the owner kept seeing. At 1.0 the plume tracks the nozzle exactly;
// the only thing that made full-follow look "flung" before was a LONG plume
// whose tip swung wide, which the shortened stub below (FLAME_BASE_SCALE_Y) fixes.
const FLAME_BANK_FOLLOW = 1.0;

export class Player {
  constructor({ baseY = 0, baseZ = -5 } = {}) {
    this.sprite = createJetSprite(JET_WORLD_WIDTH);
    this.baseY = baseY;
    this.baseZ = baseZ;

    // Afterburner flame (R13 gap 4). A child of the jet sprite, so it inherits
    // the jet's transform and visibility for free: it banks with the pose
    // sheet, rides the barrel roll and carrier launch, and vanishes with the
    // jet on a death/grace-flash hide without any call-site change in game.js
    // (which already adds this.sprite to the scene). Driven each tick by
    // _updateFlame; seeded here to a mid-throttle pose so the carrier-deck
    // frames (where playerControlled is false and update() is not called)
    // still show lit engines.
    this._flame = createAfterburnerFlame();
    this._flameClock = 0;
    this.sprite.add(this._flame);
    this._updateFlame(0, 1);
    // R10: THE AIRCRAFT HAS A VELOCITY NOW (see the FLIGHT MODEL note above
    // ENVELOPE_X), and that makes a plain `x` field unsafe. `x`/`y` are
    // ACCESSORS over `_x`/`_y` whose setters zero the matching velocity,
    // because two files OUTSIDE this lane write the position directly to
    // re-centre the jet -- game/flow/launchSequence.js:215 and
    // game/flow/deathSequence.js:406 -- and with momentum in the model a
    // re-centre that leaves `vx` alone hands the new life the old life's
    // velocity and slides the jet off the moment control returns. Doing it
    // here rather than asking those lanes to add two lines keeps the
    // invariant with the state it protects, and `player.x = 0` keeps meaning
    // exactly what its callers think it means.
    this._x = 0;
    this._y = 0;
    this.vx = 0; // world units/s, integrated into _x each tick
    this.vy = 0;
    this.sprite.position.set(0, baseY, baseZ);

    this._bankDeg = 0;
    this._origScaleX = this.sprite.scale.x;
    this._origScaleY = this.sprite.scale.y;

    // Slam-detection state (see ROLL_* above).
    this._clock = 0;
    this._lastFlickSign = 0;
    this._lastFlickT = -Infinity;
    this._flickHeld = false; // true while the stick is held past ROLL_SLAM_MIN_X,
    // so a flick is counted once per tap (rising edge), not every tick it is held.
    this._rollActive = false;
    this._rollT = 0;
    this._rollDir = 1;
    this._rollCooldown = 0;
    this._night = false;

    // Pose sheet (see the top-of-file note): null until loaded, after which
    // normal banking switches from spinning the procedural bitmap to
    // selecting a drawn cell. Loading is async; any enemy/frame rendered
    // before it resolves keeps using the procedural fallback, which is the
    // point of the null check in update() below.
    this._poseTexture = null;
    this._poseTextureNight = null;
    loadPoseSheetTexture(JET_POSE_SHEET).then((tex) => {
      this._poseTexture = tex;
      // Put the sheet on the sprite as soon as it decodes, rather than
      // waiting for the first update(). game.js only calls update() while
      // flow.playerControlled is true, which is FALSE for the whole ~3.5s
      // carrier launch (launchSequence.js owns the sprite transform there)
      // and false again through death/respawn -- so without this the jet is
      // drawn from the procedural bitmap for the entire opening of a fresh
      // game and switches to the sheet only once control is handed over.
      // The two drawings are the same art today, so there is no visible pop;
      // this removes the dependency on them STAYING identical, which is not
      // a property either lane can keep guaranteeing.
      this._applyLevelPose();
    });
    loadPoseSheetTexture(JET_POSE_SHEET_NIGHT).then((tex) => {
      this._poseTextureNight = tex;
      this._applyLevelPose();
    });
    // Roll sheet (R6). Same loader, same null contract: null keeps the old
    // spun-bitmap + x-squish path, so a decode failure degrades to exactly
    // the R5 behaviour rather than to a broken frame. Deliberately NOT
    // applied to the material on load -- it is only ever on the sprite for
    // the 1.1 s of a roll.
    this._rollTexture = null;
    loadPoseSheetTexture(JET_ROLL_SHEET).then((tex) => {
      this._rollTexture = tex;
    });
  }

  // Select the level (0 deg) cell of whichever sheet is currently in force.
  // No-op if that sheet has not decoded -- selectPoseCell returns false on a
  // null texture and leaves the procedural fallback alone.
  _applyLevelPose() {
    if (this._rollActive) return; // a roll owns material.rotation; do not fight it
    const { tex, sheet } = this._activeSheet();
    selectPoseCell(this.sprite, tex, sheet, 0);
  }

  _activeSheet() {
    return this._night
      ? { tex: this._poseTextureNight, sheet: JET_POSE_SHEET_NIGHT }
      : { tex: this._poseTexture, sheet: JET_POSE_SHEET };
  }

  // Read by game.js to suppress world roll for the duration (GAME_SPEC.md
  // §1: the roll "SUPPRESSES the world roll that a normal hard bank
  // produces").
  isRolling() {
    return this._rollActive;
  }

  // Measurement-only (game.js's ?fixed=1 __flowState hook). The drawn bank
  // pose in signed degrees — the number a responsiveness probe has to read,
  // because once the authored pose sheet is loaded the bank is a UV offset,
  // not a `material.rotation`, and is therefore invisible to anything
  // inspecting the sprite. `poseDeg` is the QUANTISED, drawn angle;
  // `bankDeg` is the continuous ladder-walk behind it.
  get bankDeg() {
    return this._bankDeg;
  }

  get poseDeg() {
    return Math.sign(this._bankDeg) * nearestBankPoseDeg(Math.abs(this._bankDeg));
  }

  // Roll progress 0..1, or null when not rolling — lets a probe confirm the
  // manoeuvre ran to completion rather than inferring it from `rolling`
  // flipping true for a tick.
  get rollPhase() {
    return this._rollActive ? Math.min(1, this._rollT / ROLL_DURATION_S) : null;
  }

  // R31: direction of the active barrel roll (+1/-1), read by game.js to drive
  // the WORLD roll through a full turn during the manoeuvre (owner: the horizon
  // rolls, not just the jet). 0 when not rolling.
  get rollDir() {
    return this._rollActive ? this._rollDir : 0;
  }

  // Measurement-only: which drawing path the jet is on this tick —
  // 'sheet-day' / 'sheet-night' (an authored pose cell, selected by UV
  // offset) or 'procedural' (the single bitmap spun by material.rotation).
  // Exists because the two are indistinguishable from outside: both end up
  // as one sprite with one map, and a capture of a LEVEL jet looks the same
  // either way. The claim "night banks with drawn poses, same as day"
  // (sprite-art ask A2) is otherwise only checkable by eye on a banked frame.
  get poseSource() {
    // R6: 'sheet-roll' first. During a roll the material carries the ROLL
    // strip, so the bank-sheet comparison below would report 'procedural' --
    // which is what the R6 roll capture read before this line existed, and
    // it is exactly the wrong answer: the drawn roll was working and the
    // measurement hook said it was not. (spriteRotationDeg staying at 0.0
    // through the whole roll was the only evidence the sheet path had been
    // taken, which is an inference, not a reading.)
    if (this._rollActive && this._rollTexture && this.sprite.material.map === this._rollTexture) {
      return 'sheet-roll';
    }
    const { tex } = this._activeSheet();
    if (!tex || this.sprite.material.map !== tex) return 'procedural';
    return this._night ? 'sheet-night' : 'sheet-day';
  }

  // Abandon a roll in progress and put the sprite back to a clean state.
  // REQUIRED on death, and found by measurement rather than by reading:
  // game.js only calls update() while flow.playerControlled is true, so a
  // death that lands mid-roll freezes _rollT where it was. Probed over
  // 135s x 3 seeds, one roll in two of the three runs lasted 6.33s instead
  // of 1.08 — stuck at phase 0.85 for the whole 5.2s death sequence and then
  // finishing its last 0.17s after the respawn. Three things went wrong at
  // once for that whole window: isRolling() stayed true, so game.js held the
  // world roll suppressed through a death that had nothing to do with a
  // roll; the x-squish (scale.x * 0.15 at the edge-on point) stayed applied
  // to a sprite deathSequence.js had taken over; and when the roll did
  // expire it reset scale over whatever the respawn had set.
  cancelRoll() {
    // Cut the afterburner whenever control is handed away. flow.js calls
    // cancelRoll() on death, stage-end tally and continue -- every transition
    // out of controlled flight -- and game.js then stops calling update(), so
    // _updateFlame() stops running and the flame would otherwise FREEZE on the
    // sprite: deathSequence.js tumbles this same sprite as a burnt hulk, and a
    // crisp orange plume riding a shot-down hulk is exactly the frozen-state
    // bug Player already learned the hard way with _rollT (see below). Hiding
    // here (not after the _rollActive guard, which early-returns) and showing
    // again in _updateFlame -- which only runs under control -- ties the flame
    // to the same lifecycle without any call-site change outside this file.
    this._flame.visible = false;
    if (!this._rollActive) return;
    this._rollActive = false;
    this._rollT = 0;
    this._rollCooldown = ROLL_COOLDOWN_S;
    this.sprite.scale.set(this._origScaleX, this._origScaleY, 1);
    this.sprite.material.rotation = 0;
    // R6: and put the BANK sheet back on the material. The roll strip is
    // selected by a UV window, which nothing downstream resets --
    // deathSequence.js touches rotation, colour and scale but never
    // material.map or the texture offset (checked, not assumed), so without
    // this an abandoned roll leaves the tumbling hulk, the respawn slide AND
    // the carrier launch drawing a belly-up roll cell. Same failure shape as
    // the frozen-_rollT bug this method was written for, one layer down.
    // Must come after _rollActive is cleared (_applyLevelPose self-guards).
    this._applyLevelPose();
    // Drop the slam history too: the flick that armed this roll must not be
    // able to pair with a post-respawn input and fire another one.
    this._lastFlickSign = 0;
    this._lastFlickT = -Infinity;
  }

  // Night palette swap (GAME_SPEC.md / REFERENCE.md "Night palette swap";
  // R5 interfaces I3). Called from game.js, which owns the stage index.
  //
  // Two layers, and both are needed. setJetNightPalette swaps the PROCEDURAL
  // texture, which is what the barrel roll spins and what the fallback path
  // draws; _applyLevelPose then puts the matching authored SHEET on the
  // material if it has decoded. Order matters: the palette swap writes
  // material.map, so the sheet selection has to come after it or the frame
  // of the transition renders the procedural bitmap with the previous
  // sheet's UV offset still applied. (setJetNightPalette is self-guarded on
  // sprite.userData.isNight, so repeat calls with the same flag are free --
  // game.js calls this every tick.)
  // Known, accepted edge: a barrel roll that straddles a day/night stage
  // boundary swaps to the PROCEDURAL night texture mid-spin, because
  // _applyLevelPose self-guards against running during a roll. Measured at
  // 44 ticks (0.73s) of one roll in a 135s run. Left alone deliberately —
  // the roll spins a level astern bitmap either way, and the procedural one
  // IS the level astern view, so the only thing that changes is which of two
  // equivalent drawings is being spun, in the correct palette.
  setNight(isNight) {
    if (this._night === isNight) return;
    this._night = isNight;
    setJetNightPalette(this.sprite, isNight);
    this._applyLevelPose();
  }

  // `worldRoll` (radians, 0 = level, matching REFERENCE.md's "Horizon tilt
  // when banking" sign: positive = banking right, world rotates clockwise
  // on screen) is read from the game/state object that owns the world-roll
  // feature (src/game/game.js, built in parallel this round — NOT owned by
  // this file). It is an OPTIONAL third argument so this file works
  // unmodified whether or not the caller passes it yet: omitted/undefined
  // defaults to 0 (no bank), per this round's integration note.
  //
  // REQUIRED call-site change in game.js once world roll exists there
  // (one line, in Game.update): replace
  //   this.player.update(dt, inputState);
  // with
  //   this.player.update(dt, inputState, this.worldRoll);
  // (or whatever field name the world-roll implementation lands on — see
  // the dev report for this round).
  //
  // The jet's drawn bank TRACKS the world roll, it never leads it
  // (REFERENCE.md "Player jet / Jet bank vs world roll": prototype ships
  // jet-bank = 0.8 * world roll). Sprite.material.rotation is a pure
  // image-plane rotation, independent of the 3D camera roll, which is
  // exactly what a camera-facing billboard needs here.
  //
  // R2 judge gap 10 root cause (measured this round, NOT the "billboard
  // compounding" hypothesis floated in the task brief — that was checked
  // and ruled out: material.rotation alone tracked worldRoll at a clean,
  // STABLE 0.80-0.85x through the first 30 frames of a full-deflection
  // ramp with pixel count flat at ~16500, see tools/out/jethud-r3/
  // roll-ramp). The actual bug: this sprite lives in world space and
  // game.js's camera applies pitch AND roll together, so without
  // compensation the camera's roll swings the jet's stick-driven lateral
  // envelope around SCREEN CENTRE along with the backdrop (centroid
  // measured moving 56.4%H -> 90.9%H across one held right bank, pixel
  // count dropping to 57% of neutral by saturation as it clips the bottom
  // edge). REFERENCE.md's "the whole world rotates rigidly about screen
  // centre" describes the BACKGROUND; the player's own envelope is NOT
  // supposed to be swung by it, only self-rotate (bank).
  //
  // Fix: rotate the position OFFSET from the camera around the camera's
  // pitch-only (roll-EXCLUDED) forward axis by worldRoll before handing
  // it to THREE. Quaternion algebra: camera.quaternion =
  // pitchQuat.multiply(rollQuat), so pre-rotating the offset by
  // pitchQuat*rollQuat*inverse(pitchQuat) exactly cancels the camera's own
  // roll term in the view transform, leaving the view-space (hence
  // on-screen) position identical to the worldRoll=0 case. That
  // conjugation reduces to "rotate around _rollAxisWorld by worldRoll" —
  // see the axis derivation above.
  // See the constructor: an external `player.x = 0` must also stop the jet.
  get x() { return this._x; }
  set x(v) { this._x = v; this.vx = 0; }
  get y() { return this._y; }
  set y(v) { this._y = v; this.vy = 0; }

  // Drive the afterburner flame (R13 gap 4) from throttle plus a deterministic
  // flicker. Deterministic -- the flicker is clocked off accumulated dt, never
  // Math.random -- so a ?fixed=1 judge capture is reproducible frame for frame.
  //
  // throttleIndex is 0/1/2 (L/M/H). Length and intensity both open with it,
  // which is the arcade's behaviour and the point of the gap: the throttle verb
  // now shows on the aircraft. The flame grows DOWNWARD (aft) only -- its TOP
  // edge is pinned to the nozzle line (FLAME_TOP_LOCAL_Y) so the hot cores stay
  // on the discs however long the plume gets, rather than a centre-anchored
  // scale that would pull the core up off the nozzles as it lengthens.
  _updateFlame(dt, throttleIndex) {
    // R34 — THE AFTERBURNER IS NOW BAKED INTO THE SPRITE SHEET (player-f14.js),
    // drawn at the nozzles and rotating rigidly with every bank/roll cell, so it
    // can never detach. This billboard flame (a child sprite driven by a
    // follow-the-bank formula) was the thing that kept tearing off the airframe
    // through three attempts; it is retired here. Kept hidden rather than
    // removed so the sprite tree + call sites are untouched.
    this._flame.visible = false;
    return;
    // eslint-disable-next-line no-unreachable
    this._flame.visible = true;
    this._flameClock += dt;
    const ti = throttleIndex >= 0 && throttleIndex <= 2 ? throttleIndex : 1;

    const frames = this._flame.userData.frames;
    const frameIdx = Math.floor(this._flameClock * FLAME_FLICKER_FPS) % frames.length;
    if (this._flame.material.map !== frames[frameIdx]) {
      this._flame.material.map = frames[frameIdx];
      this._flame.material.needsUpdate = true;
    }

    const jitter = 1 + FLAME_JITTER_AMP * Math.sin(this._flameClock * FLAME_JITTER_HZ);
    const scaleY = FLAME_BASE_SCALE_Y * FLAME_LEN_BY_THROTTLE[ti] * jitter;
    this._flame.scale.set(FLAME_SCALE_X, scaleY, 1);
    this._flame.material.opacity = FLAME_OPACITY_BY_THROTTLE[ti];

    // THE FLAME BANKS WITH THE AIRFRAME. The drawn pose/roll rotates the whole
    // aircraft about the sprite centre; a flame fixed vertical detaches from
    // the nozzles the instant the jet banks (the exhaust kept pointing at the
    // ground while the airframe rolled away from it). So apply the SAME rigid
    // rotation about the sprite centre: rotate the flame's centre offset by the
    // airframe's visible angle AND spin the flame about its own centre by it.
    // The visible angle matches update()'s own drawing lines -- -poseDeg for a
    // bank (selectPoseCell/material.rotation use -poseDeg), and the roll phase
    // while a barrel roll owns the airframe.
    let rotRad;
    if (this._rollActive) {
      const q = Math.min(1, this._rollT / ROLL_DURATION_S);
      rotRad = q * Math.PI * 2 * this._rollDir;
    } else {
      // +poseDeg, NOT the -poseDeg update()'s procedural fallback spins the
      // single bitmap by: the loaded pose SHEET (what actually renders) draws
      // its bank in the opposite image-plane sense, so the flame matches the
      // sheet's drawn airframe, verified by capture (a right-stick bank drops
      // the right wing and the plume trails down-right with it).
      rotRad = THREE.MathUtils.degToRad(this.poseDeg) * FLAME_BANK_FOLLOW;
    }
    // Pin the flame's TOP edge to the nozzle line at zero bank: a sprite scales
    // about its centre, so the centre sits half the (growing) height below the
    // nozzles. Rotating that centre offset about the sprite centre carries the
    // plume with the bank.
    const cy = FLAME_TOP_LOCAL_Y - scaleY / 2;
    const sin = Math.sin(rotRad);
    const cos = Math.cos(rotRad);
    this._flame.position.set(-cy * sin, cy * cos, FLAME_LOCAL_Z);
    this._flame.material.rotation = rotRad;
  }

  update(dt, input, worldRoll = 0) {
    // Commanded RATE, not commanded position. Piecewise and continuous at
    // input.y = 0 (both branches give 0), so the asymmetry costs only a gain
    // step across neutral, exactly as the envelope asymmetry did.
    const cmdVX = input.x * RATE_X;
    const cmdVY = input.y * (input.y >= 0 ? RATE_Y_UP : RATE_Y_DOWN);
    // R11: the velocity IS the command. No lag, no mass, no coast -- see the
    // ACCELERATION RAMP note above for the 138 arcade steps that say so. The
    // velocity fields stay, because the clamp below still has to be able to
    // kill the outward component and the public x/y setters still have to be
    // able to stop the jet.
    this.vx = cmdVX;
    this.vy = cmdVY;
    // `_x`/`_y`, not `x`/`y`: the public setters exist to KILL momentum on an
    // external re-centre, and integrating through them would zero the
    // velocity every tick -- which is the old first-order lag with extra
    // steps, and would pass every rail test while silently removing the
    // whole change.
    this._x += this.vx * dt;
    this._y += this.vy * dt;
    // The envelopes are the RAILS. Clamping the position and killing only the
    // OUTWARD component of the velocity is what keeps the settled full-stick
    // position identical to the committed build's -- and keeps the jet from
    // storing up momentum against a rail it is already resting on, which
    // would make the first tick of the reverse input do nothing.
    if (this._x > ENVELOPE_X) { this._x = ENVELOPE_X; if (this.vx > 0) this.vx = 0; }
    if (this._x < -ENVELOPE_X) { this._x = -ENVELOPE_X; if (this.vx < 0) this.vx = 0; }
    if (this._y > ENVELOPE_Y_UP) { this._y = ENVELOPE_Y_UP; if (this.vy > 0) this.vy = 0; }
    if (this._y < -ENVELOPE_Y_DOWN) { this._y = -ENVELOPE_Y_DOWN; if (this.vy < 0) this.vy = 0; }

    const offset = new THREE.Vector3(this.x, this.baseY + this.y - CAMERA_HEIGHT, this.baseZ);
    offset.applyAxisAngle(_rollAxisWorld, worldRoll);
    this.sprite.position.copy(offset).add(_cameraPos);

    // Afterburner burns on every controlled tick, a roll included -- driven
    // before the roll's early return below so the exhaust keeps guttering
    // through the manoeuvre.
    this._updateFlame(dt, input.throttleIndex ?? 1);

    // --- Barrel-roll slam detection -----------------------------------
    this._clock += dt;
    // A flick needs MAGNITUDE, not just a sign. `Math.sign` alone armed a roll
    // on a 0.0005 deflection, which was harmless for as long as every pilot was
    // digital (keyboard: x is -1, 0 or +1). R10's attract pilot is the build's
    // first ANALOG stick and it fired 8 unauthored rolls per 160 s cycle on a
    // wander that merely crossed centre. The authored slam is +-1, so anything
    // under half deflection is the wander, not a slam.
    // R27 — THE ARCADE TRIGGER IS A DOUBLE-TAP THE SAME WAY. The owner went to
    // barrel-roll and could not: the detector fired on a SIGN CHANGE (flick
    // left THEN right), but After Burner's roll is a double-tap in ONE
    // direction -- tap right-right to roll right, left-left to roll left. So a
    // player doing the real arcade input got a bank, never a roll. Now a flick
    // is a RISING EDGE (stick crosses into deflection from near-centre), and
    // two flicks of the SAME sign inside ROLL_SLAM_WINDOW_S roll that way. The
    // release between taps is required by construction (the edge only re-arms
    // after the stick drops back under ROLL_SLAM_MIN_X), so simply HOLDING the
    // stick over is still a bank, not a roll.
    const deflected = Math.abs(input.x) >= ROLL_SLAM_MIN_X;
    const sign = deflected ? Math.sign(input.x) : 0;
    const isNewFlick = deflected && !this._flickHeld;
    this._flickHeld = deflected;
    if (isNewFlick) {
      if (
        this._lastFlickSign === sign &&
        this._clock - this._lastFlickT <= ROLL_SLAM_WINDOW_S &&
        !this._rollActive &&
        this._rollCooldown <= 0
      ) {
        // BEFORE setting _rollActive: _applyLevelPose self-guards against
        // running during a roll (so the async sheet loaders cannot clobber
        // one in progress), so arming first would make this a no-op.
        this._applyLevelPose();
        this._rollActive = true;
        this._rollT = 0;
        this._rollDir = sign;
        // Consume the pair so a held third tap cannot immediately re-roll; the
        // cooldown below is the other half of that guard.
        this._lastFlickSign = 0;
        this._lastFlickT = -Infinity;
        // Why the level cell: a roll is triggered by a stick slam, so the
        // pose ladder is almost always at its 35.6 deg extreme when the roll
        // arms, and spinning THAT drawing double-counts the bank -- the jet
        // would enter the roll already tilted. This also makes true again
        // what this file's header claimed and the pose sheet had quietly
        // falsified: the roll spins a level astern drawing, as it did before
        // the sheet landed. It is a spun bitmap either way -- see A1 in
        // judging/R5/ask-player-feel.md for the drawn roll sequence.
      } else {
        this._lastFlickSign = sign;
        this._lastFlickT = this._clock;
      }
    }
    if (this._rollCooldown > 0) this._rollCooldown = Math.max(0, this._rollCooldown - dt);

    if (this._rollActive) {
      this._rollT += dt;
      const q = Math.min(1, this._rollT / ROLL_DURATION_S);
      // R6: drawn roll cells when the sheet has decoded. selectRollCell
      // BAKES the rotation and the span squish into the art, so the two
      // procedural effects below MUST NOT also run -- doing both applies
      // each twice (spriteFactory's JET_ROLL_SHEET header says so in
      // capitals). `_rollDir` is folded in as a phase direction so a
      // left-slam and a right-slam walk the strip opposite ways; the strip
      // is a closed 360 deg cycle, so a negative phase wraps cleanly.
      // R31: the JET still rolls its own art here (sprites are billboards and
      // do NOT inherit the camera's view-axis roll), while game.js now ALSO
      // rolls worldRoll through a full turn so the HORIZON rolls with it — the
      // two in sync give the owner's "the whole view rolls," not just the jet.
      // R34 — the jet must co-rotate RIGIDLY with the world. A camera view-axis
      // roll (game.js worldRoll) turns the world the OPPOSITE screen direction
      // to a sprite's own material.rotation, so rolling both by +q counter-rotated
      // them: the jet reached inverted while the horizon had barely tilted —
      // which read to the owner as "the barrel roll is the wrong direction." The
      // jet's own spin is negated here so it turns the same screen direction as
      // the rolled world; the two now move as one rigid barrel roll.
      const jetRollDir = -this._rollDir;
      const usedRollSheet = selectRollCell(this.sprite, this._rollTexture, q * jetRollDir);
      if (!usedRollSheet) {
        const angle = q * Math.PI * 2 * jetRollDir;
        this.sprite.material.rotation = angle;
        // Fallback only: fake the "sprite narrows to a line" edge-on moments
        // (GAME_SPEC.md §1) with a scale-x squish at the 90/270 deg points.
        const squish = Math.max(0.15, Math.abs(Math.cos(angle)));
        this.sprite.scale.set(this._origScaleX * squish, this._origScaleY, 1);
      }
      if (this._rollT >= ROLL_DURATION_S) {
        this._rollActive = false;
        this._rollCooldown = ROLL_COOLDOWN_S;
        this.sprite.scale.set(this._origScaleX, this._origScaleY, 1);
        // Put the BANK sheet (or the procedural bitmap) back on the material
        // before anything else draws. Without this the sprite keeps the roll
        // strip's UV window until the next update() happens to call
        // selectPoseCell -- and game.js stops calling update() entirely the
        // moment flow leaves 'flight', so a stage-end tally, a death or a
        // continue landing on the tick a roll ends would freeze the jet on a
        // belly-up roll cell. _applyLevelPose self-guards on _rollActive, so
        // it has to come AFTER the flag is cleared.
        this._applyLevelPose();
      }
      return;
    }

    // Jet-sprite bank: snap toward the quantised pose ladder, driven by
    // input.x, NOT worldRoll (see BANK_POSE_DEG above).
    const deflection = Math.max(-1, Math.min(1, input.x));
    const targetBankDeg = deflection * BANK_POSE_DEG[BANK_POSE_DEG.length - 1];
    const maxStep = BANK_SNAP_RATE_DEG_PER_S * dt;
    const diff = targetBankDeg - this._bankDeg;
    this._bankDeg += Math.abs(diff) <= maxStep ? diff : Math.sign(diff) * maxStep;
    const poseDeg = Math.sign(this._bankDeg) * nearestBankPoseDeg(Math.abs(this._bankDeg));
    // -poseDeg: the sheets' bank-angle ladder uses the same sign convention
    // this file's own rotation line did. Day or night sheet per _night
    // (sprite-art ask A2); selectPoseCell returns false if that sheet has
    // not decoded, and only then do we spin the procedural bitmap.
    const { tex, sheet } = this._activeSheet();
    const usedSheet = selectPoseCell(this.sprite, tex, sheet, -poseDeg);
    if (!usedSheet) {
      this.sprite.material.rotation = -THREE.MathUtils.degToRad(poseDeg);
    }
  }
}

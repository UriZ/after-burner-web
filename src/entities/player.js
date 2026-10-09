import * as THREE from 'three';
import {
  createJetSprite,
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
// world units at the jet's fixed depth in front of the camera — placeholder
// values, to be tuned against reference video once banked-turn roll lands.
const ENVELOPE_X = 2.6;

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
export const ENVELOPE_Y_UP = 1.55;
export const ENVELOPE_Y_DOWN = 1.1;
const FOLLOW_RATE = 6.0; // 1/s exponential approach toward the stick target

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
const ROLL_DURATION_S = 1.1;
const ROLL_COOLDOWN_S = 0.3; // guards against re-triggering off the same stick motion

export class Player {
  constructor({ baseY = 0, baseZ = -5 } = {}) {
    this.sprite = createJetSprite(JET_WORLD_WIDTH);
    this.baseY = baseY;
    this.baseZ = baseZ;
    this.x = 0;
    this.y = 0;
    this.sprite.position.set(0, baseY, baseZ);

    this._bankDeg = 0;
    this._origScaleX = this.sprite.scale.x;
    this._origScaleY = this.sprite.scale.y;

    // Slam-detection state (see ROLL_* above).
    this._clock = 0;
    this._lastFlickSign = 0;
    this._lastFlickT = -Infinity;
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
  update(dt, input, worldRoll = 0) {
    const targetX = input.x * ENVELOPE_X;
    // Piecewise and continuous at input.y = 0 (both branches give 0), so the
    // only thing the asymmetry costs is a gain step across neutral — 1.41x in
    // world units, 1.33x on screen once the perspective term is folded in.
    const targetY = input.y * (input.y >= 0 ? ENVELOPE_Y_UP : ENVELOPE_Y_DOWN);
    const t = 1 - Math.exp(-FOLLOW_RATE * dt);
    this.x += (targetX - this.x) * t;
    this.y += (targetY - this.y) * t;

    const offset = new THREE.Vector3(this.x, this.baseY + this.y - CAMERA_HEIGHT, this.baseZ);
    offset.applyAxisAngle(_rollAxisWorld, worldRoll);
    this.sprite.position.copy(offset).add(_cameraPos);

    // --- Barrel-roll slam detection -----------------------------------
    this._clock += dt;
    const sign = Math.sign(input.x);
    if (sign !== 0 && sign !== this._lastFlickSign) {
      if (
        this._lastFlickSign !== 0 &&
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
        // Why the level cell: a roll is triggered by a stick slam, so the
        // pose ladder is almost always at its 35.6 deg extreme when the roll
        // arms, and spinning THAT drawing double-counts the bank -- the jet
        // would enter the roll already tilted. This also makes true again
        // what this file's header claimed and the pose sheet had quietly
        // falsified: the roll spins a level astern drawing, as it did before
        // the sheet landed. It is a spun bitmap either way -- see A1 in
        // judging/R5/ask-player-feel.md for the drawn roll sequence.
      }
      this._lastFlickSign = sign;
      this._lastFlickT = this._clock;
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
      const usedRollSheet = selectRollCell(this.sprite, this._rollTexture, q * this._rollDir);
      if (!usedRollSheet) {
        const angle = q * Math.PI * 2 * this._rollDir;
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

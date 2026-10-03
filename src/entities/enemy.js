import * as THREE from 'three';
import { makeBillboard } from '../effects/pixelTexture.js';
import {
  enemyHeadOnTexture,
  enemyRearTexture,
  enemyHeadOnFarTexture,
  enemyRearFarTexture,
  DETAIL_SWITCH_NATIVE_PX,
} from './enemySprite.js';

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

// Wingspan in world units. Fixes the fly-past size: the shipped camera
// (FOV 55, aspect 320/224) shows 1.4873344 world units of width per unit of
// depth, so at FLY_PAST_DEPTH the span is
//   1.05 / (1.4873344 * 2.6) = 0.2715 = 27.2%W
// — the centre of REFERENCE.md "Enemies / Size at closest approach"'s
// measured 25-30%W band (ADOPTED #105). Re-derive if the camera FOV or
// FLY_PAST_DEPTH changes. The silhouette in enemySprite.js fills its canvas
// edge to edge, so occupied width == quad width and this number is the
// measurable one.
export const ENEMY_WORLD_WIDTH = 1.05;

// Depth at which an approaching enemy is retired. This is what CAPS the
// fly-past span, so it is a fidelity constant, not a cleanup threshold:
// anything closer renders above 30%W and leaves the measured band.
export const FLY_PAST_DEPTH = 2.6;

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

// Enemies "may only open fire once visibly close" (GAME_SPEC.md §4; shots
// appear from enemies at mid depth, t113-114, t117, t318) and stop once
// they are on top of the player.
const FIRE_DEPTH_MAX = 46;
const FIRE_DEPTH_MIN = 6;

// Spacing inside a shot train. The trains in
// reference/stage7-enemy-shot-train-t330.png read as ~6 fireballs strung
// across roughly a third of the frame with clear gaps between them, which at
// enemyShots.js's shot speed puts the emission interval near 0.1 s.
const SHOT_SPACING_S = 0.1;

// A train SWEEPS PAST the player's position rather than converging on it.
//
// reference/stage7-enemy-shot-train-t330.png shows a train strung out across
// roughly a third of the frame, not a cluster on one point — and GAME_SPEC.md
// §4's "tracked shots aimed at the player's position at fire time" cannot
// mean perfect aim, or every train would be an unavoidable kill. It nearly
// was: with shots aimed exactly at the player and a scripted demo jet that
// moves slowly, the player died 3 times in 33 s even after enemy fire volume
// was cut to the 4-6 shots t330 actually shows. Successive shots in a train
// are offset along one direction so the train rakes across the player's
// vicinity: the middle of a train is the dangerous part, the ends miss.
const TRAIN_SWEEP_STEP_NDC = 0.085;

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
  }) {
    const spec = ENEMY_TYPES[type] ?? ENEMY_TYPES.fighter;
    this.id = nextEnemyId++;
    this.pattern = pattern;
    this.type = type;
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

    const rear = pattern === 'overtake';
    this.texDetail = rear ? enemyRearTexture() : enemyHeadOnTexture();
    this.texFar = rear ? enemyRearFarTexture() : enemyHeadOnFarTexture();
    this.worldWidth = ENEMY_WORLD_WIDTH * spec.widthScale;
    this.sprite = makeBillboard(this.texFar, this.worldWidth);
    this.sprite.renderOrder = 10;
    this._prevNdcX = ndcA[0];
  }

  // Fraction of frame width this enemy currently spans. Used by the lock
  // system to size its bracket and by hit tests as a hitbox radius.
  spanFrac(space) {
    return space.spanFrac(this.worldWidth, this.d);
  }

  // True while this aircraft is part-way through a shot train. The spawner
  // uses it to bound how many trains exist at once (see `allowNewTrain`).
  get firingTrain() {
    return this.burstLeft > 0;
  }

  // Returns a fire request ({ ndcX, ndcY, depth }) on the tick a shot leaves
  // the aircraft, else null. The caller owns the projectile pool.
  // `allowNewTrain` gates the START of a train only — an enemy already
  // mid-train always finishes it, so trains are never cut off half-way.
  update(dt, rng, space, allowNewTrain = true) {
    this.age += dt;

    this.d *= Math.exp(this.depthRate * dt);

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
    const nativePx = space.spanFrac(this.worldWidth, this.d) * 320;
    const wantDetail = nativePx >= DETAIL_SWITCH_NATIVE_PX;
    if (wantDetail !== this._detail) {
      this._detail = wantDetail;
      this.sprite.material.map = wantDetail ? this.texDetail : this.texFar;
    }

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
    this.sprite.material.rotation = this.bank;

    // --- Firing: spaced TRAINS of 4-8 shots, 1.5-2 s apart (GAME_SPEC.md §4
    // / REFERENCE.md "Projectile palettes / Enemy shots").
    let fired = null;
    const canFire =
      this.pattern !== 'overtake' && this.d < FIRE_DEPTH_MAX && this.d > FIRE_DEPTH_MIN;
    if (canFire) {
      if (this.burstLeft > 0) {
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) {
          this.burstTimer += SHOT_SPACING_S;
          this.burstLeft -= 1;
          // Index from the train's centre, so the offsets are symmetric
          // about the aim point whatever the train length.
          const k = this.burstLeft - (this.burstCount - 1) / 2;
          fired = {
            ndcX: nx,
            ndcY: ny,
            depth: this.d,
            aimOffsetX: this.sweepX * k * TRAIN_SWEEP_STEP_NDC,
            aimOffsetY: this.sweepY * k * TRAIN_SWEEP_STEP_NDC,
          };
        }
      } else {
        this.fireTimer -= dt;
        if (this.fireTimer <= 0 && allowNewTrain) {
          this.burstCount = 4 + Math.floor(rng() * 5); // 4-8 shots
          this.burstLeft = this.burstCount;
          this.burstTimer = 0;
          this.fireTimer = 1.5 + rng() * 0.5;
          const a = rng() * Math.PI * 2;
          this.sweepX = Math.cos(a);
          this.sweepY = Math.sin(a) * 0.6; // flatter than tall, as t330 reads
        }
      }
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

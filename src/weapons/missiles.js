import * as THREE from 'three';
import { makeBillboard, srgbScalar } from '../effects/pixelTexture.js';
import { sizeSprite, snapSmokeValue } from '../effects/smoke.js';
import { TRAIL_DAYLIGHT, trailPaletteFor } from '../effects/trailPalette.js';
import { missileTexture } from './projectileSprites.js';

// Heat-seeking missiles and their smoke trails.
//
// GAME_SPEC.md §3 (MEASURED at t99.5-103.5): multi-lock salvo — ~6 locks on
// screen at once, 6-8 missiles in flight, launch -> impact 0.5-1.5 s, and a
// launch that "throws big white smoke billows that briefly occlude part of
// the screen".
//
// ---------------------------------------------------------------------------
// THE TRAIL IS A RIBBON MESH, NOT A PUFF CHAIN, AND IT IS BUILT IN SCREEN
// SPACE. Two reasons, both load-bearing:
//
// 1. REFERENCE.md "Missiles / weapons visuals" is explicit that the trail is
//    a "continuous opaque ribbon — 100% column occupancy ... with internal
//    VALUE structure, not an alpha fade". A chain of discrete sprites only
//    reaches 100% column occupancy if they overlap heavily, which at the
//    emission rate needed near the camera is hundreds of live sprites per
//    missile. A triangle strip is continuous by construction.
//
// 2. A world-space ribbon DEGENERATES here. The usual construction takes
//    perp = cross(segmentDirection, viewDirection) — but these missiles fly
//    almost straight into the screen, so segmentDirection is nearly parallel
//    to viewDirection and the cross product collapses toward zero, giving a
//    ribbon of random width and orientation. Building the ribbon in NDC
//    (perpendicular to the path's SCREEN tangent, thickness in screen
//    fractions, then mapped back to world through screenSpace.ndcToWorld)
//    has no such degeneracy: the only failure case is a path that projects
//    to a single point, where orientation does not matter and a fixed
//    fallback is correct.
//
// THICKNESS DIRECTION — a deliberate reading of the measurement.
// REFERENCE.md says "~16 px thick at the head tapering to a few px". Which
// end is "the head" is ambiguous in that sentence, and the two readings are
// visually opposite. reference/stage1-missile-salvo-t100.75.png settles it
// numerically: the plume's per-row width runs 10.9%W at the missile end to
// 36.2%W at the launch end (full operator in effects/trailPalette.js). So
// the ribbon is widest at its OLDEST sample and tapers toward the missile.
//
// VALUE IS PER-STAGE AND COMES FROM effects/trailPalette.js. It used to be
// two constants in this file taken from a frame that turns out to contain no
// smoke trail at all, which is what made stage 1's daylight trail black
// (R4 gap 4). Do not reintroduce a value here, and do not tune to a
// bright/dark quintile ratio: that criterion is withdrawn, and the stage-1
// plume's measured ratio is 1.07 — essentially flat.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// R10 — THE SEEKER. Until this round the whole impact condition was
//
//     const hit = target && m.depth >= target.d;
//
// with NO LATERAL TERM: the missile destroyed whatever it was locked to the
// instant its depth reached that target's depth, wherever either of them was
// on screen, and the homing above it was a direct interpolation of screen
// position with no turn-rate limit. Measured consequence (judging/R9/
// feel-critique.md §1.2): 93.8 % of launches killed, and the three that did
// not were targets that flew off the field. No manoeuvre could defeat it,
// because the outcome never consulted the target's lateral position at all.
//
// Two constants fix that, and both are anchored below rather than picked.
// ---------------------------------------------------------------------------

// PROXIMITY FUSE radius, in ISOTROPIC frame-width fractions (x in half-NDC,
// y through 224/320) -- the same unit lockSystem.js's LOCK_RADIUS_FRAC is in.
//
// ANCHOR, and it is an ADOPTION of a measured arcade quantity rather than a
// direct measurement of the arcade's own fuse, which footage cannot show:
// AB2's lock bracket is 5.15 %W square, and that is one of the most
// thoroughly measured numbers in this repo -- 5.10 %W at t116 on a 1.9 %W
// target and 5.16 %W at t100.75 on an 8.8 %W target, two frames whose targets
// differ by nearly 7x and whose brackets agree to 0.06 %W. My own detector
// (tools/out/feel-r10/brackets.py, selftest 5/5) reproduces it independently
// on frames I picked before looking: 5.16-5.45 %W across stage 1 t100.3-100.9.
// The bracket is the box the arcade itself draws to say "this target is
// engaged", so a missile that arrives inside it hits. Half of 5.15 %W is
// 2.575 %W, rounded to 0.026.
//
// THE SAME DETECTOR REPRODUCES THE ARCADE SIGHT AT 1.46-1.56 %W against its
// published 1.563 %W, which is the control that lets the bracket figure be
// quoted at all -- two published numbers out of one unvalidated-until-now
// operator, on frames chosen for neither.
const HIT_RADIUS_FRAC = 0.026;

// MAXIMUM TURN RATE, in frame-width fractions per second of LATERAL screen
// travel.
//
// WHAT THIS IS NOT. It is NOT a measurement of the arcade's own seeker. I
// tried three operators for that and all three failed (judging/R10/
// lane-feel.md §1.4): tracking the red rocket plumes gave 0.62-0.80 fracW/s
// peaks across nine tracks, and CROPPING IT AND LOOKING showed the tracked
// objects were EXPANDING FIREBALLS whose centroids wander -- three of the
// nine had zero net displacement over 0.6-0.85 s. Withdrawn. Reading flight
// times off the HIT counter failed because the counter's digit cell shares
// pixels with the sight reticle's blinking dot. Launch-to-detonation
// geometry failed because the arcade pilot holds the trigger, so a
// detonation cannot be attributed to the missile rather than the gun.
//
// SO IT IS SOLVED FROM TWO REQUIREMENTS, and the first one is the reason the
// first value I tried (0.35, adopted from the arcade SIGHT's measured sweep
// rate) was WRONG AND MEASURED SO before it shipped: at 0.35 a pilot flying
// the sight directly onto the target hit 35.0 % of crossings with a MEDIAN
// LATERAL MISS OF 0.135 -- five times the fuse radius. That is not a weapon
// that can be out-turned, it is a weapon that cannot turn.
//
//   1. THE SEEKER MUST BE ABLE TO UNDO ITS OWN LAUNCH SPLAY. A missile
//      leaves the pylon at SPLAY_NDC_X_PER_S = 1.1 NDC/s outward and
//      SPLAY_NDC_Y_PER_S = -0.7 NDC/s down (both below, both there for
//      measured reasons), which in these units is
//          hypot(1.1 * 0.5, 0.7 * 0.35) = 0.602 fracW/s
//      and it does not even start steering until HOMING_DELAY_S = 0.3 s. A
//      seeker with less authority than its own launch transient has its
//      outcome decided by the splay rather than by the target, which is the
//      same defect as the old no-limit interpolation wearing the opposite
//      sign.
//   2. IT MUST CLOSE THE LOCK CONE WITHIN THE MEASURED FLIGHT TIME. The only
//      ARCADE-ANCHORED figure for the cone is GAME_SPEC §3's ADOPTED 80 px of
//      960 = 0.083 fracW, and the measured launch->impact floor is 0.5 s:
//          0.083 / 0.5 = 0.166 fracW/s
//
//      0.602 + 0.166 = 0.768  ->  0.77
//
// Note which cone that is: the ARCADE's 8.3 %W, not lockSystem.js's shipped
// 0.22, which that file's own comment records as tuning with no arcade
// behind it. A missile locked at the edge of OUR wider cone is therefore
// marginal by construction -- it has to be flown onto the target rather than
// merely designated -- and that is the intended direction.
//
// THE CONSEQUENCE IS MEASURED, NOT ASSUMED: §1.3 of the lane report gives
// the hit rate this produces for an aiming pilot and for a blind one, and
// the two are no longer the same number.
const MAX_TURN_FRAC_PER_S = 0.77;

// A missile that has crossed its target's depth and missed goes ballistic
// (it cannot steer at something now behind it) and recedes for this long
// before it is retired. Long enough that the player SEES the shot sail past
// -- the whole point of a weapon that can miss -- and short enough that a
// wasted salvo does not leave six ribbons in the sky.
const MISS_FLYOUT_S = 0.7;

const HOMING_DELAY_S = 0.3; // ADOPTED: missiles run straight before homing
const MAX_LIFE_S = 5.0; // ADOPTED
// Speed profile. MEASURED-TO-SPEC rather than picked: GAME_SPEC.md §3 puts
// launch -> impact at 0.5-1.5 s. The first profile (12 + 60t, cap 55) with a
// 20-unit minimum lock range produced a 0.28 s impact in the probe, less
// than half the measured floor, and 10 + 34t still bottomed out at 0.33 s.
// 7 + 28t capped at 46, with lockSystem.js's 18-unit lock-break depth,
// solves to ~0.52 s against a target at the break depth and ~1.15 s against
// one at the 70-unit lock ceiling. Re-check BOTH ends if either constant
// moves — the floor is the one that keeps failing.
const V0 = 7; // world depth units/s at launch
const ACC = 28;
const V_MAX = 46;
const HOMING_GAIN = 1.7;
const MAX_DEPTH = 130;

// Wing pylons, in NDC relative to the player's sprite centre.
const PYLON_NDC_X = 0.12;
const PYLON_NDC_Y = -0.03;

// LAUNCH SPLAY. A missile leaves the pylon moving OUTWARD and down across
// the screen before the seeker pulls it in, which is why AB2's salvos read
// as a fan of curving ribbons (reference/stage1-missile-salvo-t100.75.png;
// two simultaneous wing-pylon launch flares at t177).
//
// It is also what makes the trail exist at all. The ribbon is built from the
// path's SCREEN positions, so a missile that flies dead ahead — constant NDC,
// increasing depth — has every trail sample projecting to the SAME screen
// point and renders as a dot. Measured, not hypothesised: with the straight
// phase holding NDC constant, the isolated-trail harness produced a 20 px
// grey blob with the missile sprite sitting inside it and no ribbon at all
// (tools/out/combat-r3-12-trail/frame-0290.png). The splay guarantees screen
// travel regardless of where the target is.
const SPLAY_NDC_X_PER_S = 1.1; // outward, signed by the launch pylon
const SPLAY_NDC_Y_PER_S = -0.7; // and downward, away from the sight line
const SPLAY_DECAY_PER_S = 3.0;

// How far apart the two launch-billow lobes sit ALONG the launch axis, in
// frame-width fractions. 0.17 against a lobe long axis of 0.31-0.38 keeps
// them overlapping (no gap between them) while making the union a column.
const BILLOW_LOBE_STEP_NDC = 0.17;

const MISSILE_FRAC_NEAR = 0.022;
const MISSILE_FRAC_FAR = 0.009;

// --- Ribbon ----------------------------------------------------------------
// 1.1 s, not 0.7: the ribbon is continuous by construction and the aged puff
// chain is not, so every tick of ribbon life is a tick the trail cannot
// develop a gap in. The R4 judge measured per-component column occupancy at
// 87% against a >=95% criterion, and the missing 13% is all in the puff
// chain beyond the ribbon's tail — see PUFF_INTERVAL_S.
const RIBBON_LIFE_S = 1.1;
const RIBBON_HZ = 60; // one sample per fixed tick
const MAX_SAMPLES = Math.ceil(RIBBON_LIFE_S * RIBBON_HZ) + 2;
// Screen-fraction half-thickness at the youngest and oldest sample.
// 0.024 half = 4.8%W = 15.4 px of 320 at the missile end, the centre of the
// R4 criterion's 12-20 native px head band; 0.065 half = 13%W = 41.6 px at
// the launch end. The wide end is set from the plume's own measured taper
// rather than picked: reference/stage1-missile-salvo-t100.75.png runs
// 10.9%W at the missile to 36.2%W at the launch point, and the ribbon
// carries the inner part of that while the launch billow below carries the
// outer. (The previous 1.2%W -> 3.7%W was a ninth of the measured width; it
// is the thin-grey-streak half of R4 gap 4, the black half being the value.)
const HALF_FRAC_YOUNG = 0.024;
const HALF_FRAC_OLD = 0.065;
// Cross-ribbon edge value as a fraction of the centreline, from the stage
// palette. Kept close to 1: at 0.70 the ribbon rendered as a smooth shaded
// TUBE (a wide linear ramp reads as a cylinder, which is a 3D look the
// arcade never has — see tools/out/combat-r3-13-trail/frame-0275.png).
// The value structure the night measurement describes comes from the AGE
// taper, not from the cross-section.

const NDC_Y_PER_FRAC = 2 * (320 / 224);
const FRAC_Y_PER_NDC = 0.5 * (224 / 320);

class Trail {
  constructor(scene, space) {
    this.space = space;
    this.samples = [];
    // Overwritten per launch from the stage palette; daylight is the default
    // so a Trail built outside a launch still renders as stage 1 rather than
    // as whatever the last night stage left behind.
    this.palette = TRAIL_DAYLIGHT;
    // R7: ONE SEGMENT'S SIX VERTICES ARE ITS OWN — nothing is shared with the
    // neighbouring segment — and that is what makes the ribbon flat-shaded.
    //
    // It used to be MAX_SAMPLES x 3 shared vertices with a per-vertex grey
    // ramp, and a shared vertex with vertexColors is GOURAUD INTERPOLATION:
    // the fragment shader sees a different grey at every pixel along and
    // across the ribbon, which is a continuous-tone object by construction
    // and the fourth member of R6 gap 1's compositing class. Six unshared
    // vertices per segment let each segment carry ONE colour, so the ribbon
    // renders as a chain of flat slabs stepping down a ladder — which is
    // what an arcade trail is.
    //
    // The positions written are identical; only the sharing changes. Both
    // copies of a sample's three points are computed from the same sample, so
    // the measured geometry (half-widths, occupancy, taper) is untouched.
    const positions = new Float32Array((MAX_SAMPLES - 1) * 6 * 3);
    const colors = new Float32Array((MAX_SAMPLES - 1) * 6 * 3);
    const indices = new Uint16Array((MAX_SAMPLES - 1) * 12);
    for (let i = 0; i < MAX_SAMPLES - 1; i++) {
      const a = i * 6; // L,C,R of this sample
      const b = a + 3; // L,C,R of the next
      const o = i * 12;
      // left strip
      indices[o] = a; indices[o + 1] = a + 1; indices[o + 2] = b;
      indices[o + 3] = a + 1; indices[o + 4] = b + 1; indices[o + 5] = b;
      // right strip
      indices[o + 6] = a + 1; indices[o + 7] = a + 2; indices[o + 8] = b + 1;
      indices[o + 9] = a + 2; indices[o + 10] = b + 2; indices[o + 11] = b + 1;
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false; // vertices are rewritten every frame
    this.mesh.renderOrder = 15;
    scene.add(this.mesh);
  }

  reset() {
    this.samples.length = 0;
    this.geometry.setDrawRange(0, 0);
  }

  push(ndcX, ndcY, depth) {
    this.samples.push({ ndcX, ndcY, depth, age: 0 });
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
  }

  update(dt) {
    for (const s of this.samples) s.age += dt;
    while (this.samples.length && this.samples[0].age > RIBBON_LIFE_S) this.samples.shift();
    this._rebuild();
  }

  _rebuild() {
    const n = this.samples.length;
    if (n < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }
    const pos = this.geometry.attributes.position.array;
    const col = this.geometry.attributes.color.array;
    const v = new THREE.Vector3();

    // One sample's three cross-section points, in world space, written into
    // whichever vertex slot the caller names. Both segments that touch a
    // sample get their own copy, from this one computation.
    const writeSample = (i, slot) => {
      const s = this.samples[i];
      // Screen tangent from a central difference, in isotropic
      // width-fraction coordinates.
      const prev = this.samples[Math.max(0, i - 1)];
      const next = this.samples[Math.min(n - 1, i + 1)];
      const tx = (next.ndcX - prev.ndcX) * 0.5;
      const ty = (next.ndcY - prev.ndcY) * FRAC_Y_PER_NDC;
      const len = Math.hypot(tx, ty);
      let px;
      let py;
      if (len < 1e-6) {
        // The whole visible path projects to one point: orientation is
        // arbitrary, so pick a fixed one rather than normalising noise.
        px = 0;
        py = 1;
      } else {
        px = -ty / len;
        py = tx / len;
      }
      const u = Math.min(1, s.age / RIBBON_LIFE_S);
      const half = HALF_FRAC_YOUNG + (HALF_FRAC_OLD - HALF_FRAC_YOUNG) * u;
      const offNdcX = px * half * 2;
      const offNdcY = py * half * NDC_Y_PER_FRAC;
      const base = slot * 3;
      this.space.ndcToWorld(s.ndcX - offNdcX, s.ndcY - offNdcY, s.depth, v);
      pos[base] = v.x; pos[base + 1] = v.y; pos[base + 2] = v.z;
      this.space.ndcToWorld(s.ndcX, s.ndcY, s.depth, v);
      pos[base + 3] = v.x; pos[base + 4] = v.y; pos[base + 5] = v.z;
      this.space.ndcToWorld(s.ndcX + offNdcX, s.ndcY + offNdcY, s.depth, v);
      pos[base + 6] = v.x; pos[base + 7] = v.y; pos[base + 8] = v.z;
    };

    const p = this.palette;
    for (let i = 0; i < n - 1; i++) {
      writeSample(i, i * 6);
      writeSample(i + 1, i * 6 + 3);

      // ONE GREY FOR THE WHOLE SEGMENT, snapped to effects/smoke.js's
      // SMOKE_RAMP — the same ladder the tail puffs and the launch billow
      // use, so the whole trail costs six channel values however many
      // sprites are on screen. The segment's age is taken at its midpoint.
      //
      // `edgeMult` is no longer applied. It was the cross-ribbon value ramp,
      // and a ramp across six pixels is exactly the gouraud tube this file
      // already records rejecting at 0.70 — at 0.98 it was a 2% gradient
      // whose only measurable effect was to put more greys on screen. The
      // flat slab is both the arcade reading and the cheap one.
      const u = Math.min(1, 0.5 * (this.samples[i].age + this.samples[i + 1].age) / RIBBON_LIFE_S);
      const value = srgbScalar(snapSmokeValue(p.ribbonYoung + (p.ribbonOld - p.ribbonYoung) * u));
      for (let k = 0; k < 18; k++) col[i * 18 + k] = value;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, (n - 1) * 12);
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}

// Interval between the discrete aged puffs that continue the trail past the
// ribbon's tail — REFERENCE.md: "the trail's TAIL ages into a chain of
// discrete round white puffs (t226, t332, t120)".
//
// 0.055 s, down from 0.13. This is the occupancy fix. A missile accelerates
// to V_MAX, so late in its flight successive puffs are emitted further apart
// than one puff diameter and the chain develops visible gaps — which is what
// a per-component COLUMN OCCUPANCY measurement sees, and why the R4 judge
// measured 87% against the >=95% criterion while the ribbon itself is
// continuous by construction. Halving the interval roughly halves the worst
// gap. It is not free: at a 1.0 s puff life this is ~18 live puffs per
// missile and up to ~110 across a full 6-missile salvo, so if this number
// drops further, check the sprite count before assuming it is cheap.
const PUFF_INTERVAL_S = 0.055;

export class Missiles {
  constructor(scene, space, smoke) {
    this.scene = scene;
    this.space = space;
    this.smoke = smoke;
    this.live = [];
    this.spritePool = [];
    this.trailPool = [];
    this.t = 0;
    // One row per RETIREMENT, drained by combat.js's __missileDrain. A miss
    // has to be a NUMBER in a ledger and not an absence in a kill count:
    // R9 measured "93.8 % of launches kill" by counting kills and launches
    // separately, which cannot say whether the 6.2 % were defeated or just
    // flew off the field. `lat` is the lateral miss distance at the depth
    // crossing, so every outcome carries its own reason.
    //
    // CAPPED, because NOTHING DRAINS IT IN NORMAL PLAY: __missileDrain only
    // exists under `?fixed=1`. An uncapped ledger is an unbounded array in a
    // ten-minute session for the sake of a measurement hook. Same shape and
    // the same reasoning as combat.js's `killLog` / `killsDropped`.
    this.outcomes = [];
    this.outcomesDropped = 0;
    // Set by the weapon manager; called with the enemy a missile reached.
    this.onImpact = null;
    // Stage palette for the trail/puffs/billow. Daylight until the game
    // tells us otherwise (see Combat.setStageIndex) — stage 1 is both the
    // default stage and the one every judge capture is taken on, so an
    // unwired build must look right there rather than at night.
    this.palette = TRAIL_DAYLIGHT;
  }

  setStageIndex(stageIndex) {
    this.palette = trailPaletteFor(stageIndex);
  }

  get count() {
    return this.live.length;
  }

  launch(playerNdc, target, side, rng) {
    let sprite;
    if (this.spritePool.length) sprite = this.spritePool.pop();
    else {
      sprite = makeBillboard(missileTexture(), 0.1);
      sprite.renderOrder = 16;
    }
    this.scene.add(sprite);

    const trail = this.trailPool.pop() ?? new Trail(this.scene, this.space);
    trail.reset();
    trail.palette = this.palette;
    trail.mesh.visible = true;

    const m = {
      sprite,
      trail,
      target,
      age: 0,
      depth: playerNdc.depth,
      ndcX: playerNdc.x + side * PYLON_NDC_X,
      ndcY: playerNdc.y + PYLON_NDC_Y,
      velX: side * SPLAY_NDC_X_PER_S,
      velY: SPLAY_NDC_Y_PER_S,
      puffTimer: 0,
      // R10 seeker state. `targetLost` is set by the fuse when the missile
      // crosses its target's depth outside HIT_RADIUS_FRAC -- the shot is
      // spent and the round goes ballistic from that moment.
      targetLost: false,
      missAt: 0,
      resolved: false,
      lastTurnFrac: 0,
      prevNdcX: playerNdc.x + side * PYLON_NDC_X,
      prevNdcY: playerNdc.y + PYLON_NDC_Y,
      // Seeded from the splay velocity so the first puff of a trail is
      // already aligned; overwritten every tick from the actual screen step.
      trailAngle: Math.atan2(SPLAY_NDC_Y_PER_S * FRAC_Y_PER_NDC, side * SPLAY_NDC_X_PER_S * 0.5),
    };
    this.live.push(m);

    // Launch billow: two overlapping masses at the pylon, big enough to
    // "briefly occlude part of the screen" (t99.75-t101, GAME_SPEC.md §3).
    //
    // SIZE AND LIFE ARE BOTH ACCEPTANCE NUMBERS, not taste. The R4 criterion
    // for gap 4 asks for "a launch billow >=25%W for ~1 s"; the shipped
    // 7%W -> 17-22%W over 0.42-0.56 s missed on both axes. The arcade's own
    // launch mass measures 39.1%W x 50.0%H on
    // reference/stage1-missile-salvo-t100.75.png, so 0.30-0.36%W per lobe
    // across two jittered lobes lands just under it rather than over.
    //
    // The ceiling is real though: an earlier version painted THREE 30-38%W
    // masses that merged into one cloud filling the lower third of the frame
    // and hid the trails entirely
    // (tools/out/combat-r3-12-trail/frame-0265.png). Two lobes, and a LIFE
    // short enough that the mass is gone before the next salvo — "briefly
    // occlude PART of the screen" is the target, not obscure it. (R7: it used
    // to be `fadeFrom` that did this. A fade is the one thing an arcade sprite
    // cannot do, so the mass now ends instead of dissolving.)
    //
    // R6: the billow is now a TAPERING PLUME (effects/smoke.js drawBillow) and
    // has to be ORIENTED, or the taper points in an arbitrary direction and is
    // worse than no taper. The axis is pylon -> target, which is the direction
    // the trail will actually develop in; the launch splay bends the first
    // 0.3 s of the path away from it, so taking the axis from the splay
    // velocity instead would aim the plume down and outward while the trail
    // went up. Canvas +y is screen up at rotation 0 and the narrow end is at
    // the canvas top, so the sprite is turned by (axis angle - pi/2).
    // No target (the ?combattrail harness passes a stub, and a real launch
    // always has one): fall back to straight up the sight line.
    const pos = new THREE.Vector3();
    const p = this.palette;
    const axX = ((target?.ndc?.x ?? m.ndcX) - m.ndcX) * 0.5;
    const axY = ((target?.ndc?.y ?? m.ndcY + 0.4) - m.ndcY) * FRAC_Y_PER_NDC;
    const billowRot =
      (Math.hypot(axX, axY) > 1e-6 ? Math.atan2(axY, axX) : Math.PI / 2) - Math.PI / 2;
    // The two lobes are strung ALONG the axis, not jittered laterally. They
    // used to be offset by +-0.045 x +-0.03 NDC in screen x/y, which put two
    // 30-36 %W balls side by side -- a ~50 %W mass, wider than it is tall,
    // against the arcade's 39.1 %W x 50.0 %H column. Along the axis the same
    // two lobes make one rooted plume.
    const axN = Math.hypot(axX, axY) || 1;
    const stepX = (axX / axN) * BILLOW_LOBE_STEP_NDC * 2; // NDC x per unit frac
    const stepY = (axY / axN) * BILLOW_LOBE_STEP_NDC * NDC_Y_PER_FRAC;
    for (let i = 0; i < 2; i++) {
      const jitterX = stepX * i + (rng() - 0.5) * 0.04;
      const jitterY = stepY * i + (rng() - 0.5) * 0.03;
      this.space.ndcToWorld(m.ndcX + jitterX, m.ndcY + jitterY, m.depth * 1.05, pos);
      this.smoke.spawn('billow', pos, m.depth * 1.05, {
        life: 0.95 + rng() * 0.2,
        rotation: billowRot,
        // `frac` is the SHORT (across-plume) axis now that the canvas is
        // 32x42 -- the sprite's long axis is frac * 1.3125. The arcade's
        // launch mass is 39.1 %W x 50.0 %H, so a 0.30 %W short axis puts the
        // long axis at 0.394, which is that measurement rather than a
        // square 0.30 x 0.30.
        fracStart: 0.10,
        // SHORT axis. 0.24-0.29 here puts the long axis at 0.31-0.38 and the
        // union of the two lobes, offset BILLOW_LOBE_STEP_NDC apart along it,
        // at roughly 0.25 x 0.49 -- the arcade's 39.1 %W x 50.0 %H mass is
        // 0.39 x 0.50, and the rest of its width is the ribbon and the puff
        // chain lying on the same axis. The old 0.30-0.36 was the FULL width
        // of a round sprite, so this is not a shrink: the mass is the same
        // size and a different shape.
        fracEnd: 0.24 + rng() * 0.05,
        valueStart: p.billowStart,
        valueEnd: p.billowEnd,
        // R7: no `fadeFrom`. effects/smoke.js no longer alpha-fades anything
        // (R6 gap 1's compositing class); the mass now simply ends.
      });
    }
    return m;
  }

  update(dt) {
    const pos = new THREE.Vector3();
    this.t += dt;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const m = this.live[i];
      m.age += dt;

      // Position at the START of the tick, kept for the depth-crossing
      // interpolation below. Without it the fuse would be evaluated at
      // whatever point the missile happened to land on AFTER overshooting
      // the crossing by up to v*dt = 0.77 depth units, which at a 0.026
      // radius is a decision made on the wrong side of the target.
      const x0 = m.ndcX;
      const y0 = m.ndcY;
      const d0 = m.depth;

      const v = Math.min(V_MAX, V0 + ACC * m.age);
      m.depth += v * dt;

      // Launch splay, decaying. Runs through the homing phase too so the
      // turn-in blends out of it instead of snapping.
      const decay = Math.exp(-SPLAY_DECAY_PER_S * dt);
      m.ndcX += m.velX * dt;
      m.ndcY += m.velY * dt;
      m.velX *= decay;
      m.velY *= decay;

      const target = m.target && m.target.alive && !m.targetLost ? m.target : null;
      m.lastTurnFrac = 0;
      if (target && m.age > HOMING_DELAY_S) {
        // Steer by the fraction of the REMAINING depth gap covered this
        // frame: the lateral error then closes exactly as the depth gap
        // does, which produces the visible curve into the target rather
        // than a constant-rate turn that either overshoots or never
        // arrives.
        const remain = Math.max(0.1, target.d - m.depth);
        const steer = Math.min(1, ((v * dt) / remain) * HOMING_GAIN);
        let stepX = (target.ndc.x - m.ndcX) * steer;
        let stepY = (target.ndc.y - m.ndcY) * steer;
        // R10: AND THE STEP IS CAPPED. `steer` saturates at 1 whenever
        // `remain <= 1.30` depth units, which at V_MAX is the final 0.028 s
        // -- under two ticks -- during which the two lines above SET the
        // missile's screen position equal to the target's. That is the
        // "convergence the player sees in the last two frames is not flown,
        // it is assigned" of feel-critique.md §1.1, and it is also why no
        // manoeuvre could break the lock: an unbounded interpolation always
        // arrives.
        //
        // The cap is on LATERAL SCREEN RATE in isotropic frame-width
        // fractions, which is the unit the arcade measurement is in and the
        // unit HIT_RADIUS_FRAC and LOCK_RADIUS_FRAC are in. A missile can now
        // be out-turned: a target that moves laterally faster than
        // MAX_TURN_FRAC_PER_S for long enough arrives at the crossing outside
        // the fuse radius, and the shot is wasted.
        const fx = stepX * 0.5;
        const fy = stepY * FRAC_Y_PER_NDC;
        const mag = Math.hypot(fx, fy);
        const cap = MAX_TURN_FRAC_PER_S * dt;
        if (mag > cap && mag > 0) {
          const k = cap / mag;
          stepX *= k;
          stepY *= k;
        }
        m.lastTurnFrac = Math.min(mag, cap) / dt;
        m.ndcX += stepX;
        m.ndcY += stepY;
      }

      // Screen tangent of the path THIS tick, in isotropic width-fraction
      // units (the same convention Trail._rebuild uses for its perpendicular,
      // so the ribbon and the puff chain cannot disagree about which way the
      // trail is pointing). Held when the step is degenerate rather than
      // normalising noise, for the reason given in _rebuild.
      {
        const tx = (m.ndcX - m.prevNdcX) * 0.5;
        const ty = (m.ndcY - m.prevNdcY) * FRAC_Y_PER_NDC;
        if (Math.hypot(tx, ty) > 1e-6) m.trailAngle = Math.atan2(ty, tx);
        m.prevNdcX = m.ndcX;
        m.prevNdcY = m.ndcY;
      }

      m.trail.push(m.ndcX, m.ndcY, m.depth);
      m.trail.update(dt);

      m.puffTimer -= dt;
      if (m.puffTimer <= 0) {
        m.puffTimer += PUFF_INTERVAL_S;
        this.space.ndcToWorld(m.ndcX, m.ndcY, m.depth, pos);
        this.smoke.spawn('trail', pos, m.depth, {
          life: 1.0,
          // R6. THE CHAIN NOW CARRIES THE RIBBON'S OWN TAPER instead of a
          // flat one, and this is the "size falloff along the axis" half of
          // the art critique's fix.
          //
          // It used to run 0.055 -> 0.075 of frame width over a puff's life:
          // a 1.36x ramp, against the ribbon's 2.7x (HALF_FRAC_YOUNG 0.024 ->
          // HALF_FRAC_OLD 0.065, i.e. a full thickness of 4.8 %W -> 13 %W)
          // and against the arcade plume's measured 3.3x (10.9 %W at the
          // missile -> 36.2 %W at the launch end,
          // reference/stage1-missile-salvo-t100.75.png). A chain that barely
          // tapers, laid along a path that compresses toward the vanishing
          // point, is a disc.
          //
          // These are the LONG axis of an ellipse whose canvas aspect is
          // 0.625, so the plume's visible WIDTH is 0.625x these: 0.048 ->
          // 0.130, exactly the ribbon's full thickness at both ends. The
          // chain and the ribbon are now the same wedge, and the chain's
          // extra length along the axis is what buys the column occupancy
          // that the old overlap-sized discs were buying with area.
          fracStart: 0.0768,
          fracEnd: 0.208,
          // Held at the screen tangent the missile had when this puff was
          // laid down (effects/smoke.js `rotation`).
          rotation: m.trailAngle,
          // Per-stage — near-white through its whole life in daylight, a
          // bright-to-dark ramp at night. See effects/trailPalette.js.
          valueStart: this.palette.puffStart,
          valueEnd: this.palette.puffEnd,
        });
      }

      this.space.ndcToWorld(m.ndcX, m.ndcY, m.depth, m.sprite.position);
      const q = Math.min(1, (m.depth - 5) / 45);
      sizeSprite(
        m.sprite,
        this.space.worldWidthFor(
          MISSILE_FRAC_NEAR + (MISSILE_FRAC_FAR - MISSILE_FRAC_NEAR) * q,
          m.depth
        )
      );

      // --- THE FUSE -------------------------------------------------------
      // The depth crossing is now a PROXIMITY TEST at the crossing, not an
      // unconditional kill on arrival. `d0 < target.d <= m.depth` is the
      // crossing frame; `f` is where in this tick's depth step it happened,
      // and the missile's screen position is interpolated to that instant.
      // (The target's own screen position is taken at the tick's end, which
      // is the only value available; the residual is one tick of its own
      // lateral motion and is far below the radius for every pattern the
      // spawner emits.)
      let hit = false;
      if (target && d0 < target.d && m.depth >= target.d) {
        const span = m.depth - d0;
        const f = span > 1e-6 ? (target.d - d0) / span : 1;
        const cx = x0 + (m.ndcX - x0) * f;
        const cy = y0 + (m.ndcY - y0) * f;
        const lat = Math.hypot(
          (target.ndc.x - cx) * 0.5,
          (target.ndc.y - cy) * FRAC_Y_PER_NDC
        );
        hit = lat <= HIT_RADIUS_FRAC;
        this._record({
          t: Number(this.t.toFixed(3)),
          age: Number(m.age.toFixed(4)),
          hit,
          lat: Number(lat.toFixed(5)),
          tgtD: Number(target.d.toFixed(2)),
          tgtX: Number(target.ndc.x.toFixed(4)),
          tgtY: Number(target.ndc.y.toFixed(4)),
        });
        m.resolved = true;
        if (!hit) {
          // Past it. A seeker cannot steer at something behind it, so the
          // round goes ballistic and recedes; the player watches the shot
          // they wasted leave the screen.
          m.targetLost = true;
          m.missAt = m.age;
        }
      }
      const flewOut = m.targetLost && m.age - m.missAt > MISS_FLYOUT_S;
      if (hit || flewOut || m.age > MAX_LIFE_S || m.depth > MAX_DEPTH) {
        if (!m.resolved) {
          // Retired without ever reaching a crossing: the target died to
          // something else, or flew off the field. Recorded as its own
          // outcome so the ledger's rows sum to the launches.
          m.resolved = true;
          this._record({
            t: Number(this.t.toFixed(3)),
            age: Number(m.age.toFixed(4)),
            hit: false,
            lat: null,
            reason: m.age > MAX_LIFE_S || m.depth > MAX_DEPTH ? 'expired' : 'notarget',
          });
        }
        this._retire(i, hit ? target : null);
      }
    }
  }

  _record(row) {
    if (this.outcomes.length < 2048) this.outcomes.push(row);
    else this.outcomesDropped += 1;
  }

  _retire(i, hitTarget) {
    const m = this.live[i];
    this.scene.remove(m.sprite);
    this.spritePool.push(m.sprite);
    // The ribbon is dropped immediately on impact: in the reference frames
    // the explosion replaces the trail head rather than the trail hanging in
    // the air. The aged PUFF chain already emitted stays and dissipates.
    m.trail.reset();
    m.trail.mesh.visible = false;
    this.trailPool.push(m.trail);
    this.live.splice(i, 1);
    if (hitTarget && this.onImpact) this.onImpact(hitTarget, m);
  }

  clear() {
    while (this.live.length) this._retire(this.live.length - 1, null);
  }
}

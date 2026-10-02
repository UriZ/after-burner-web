import * as THREE from 'three';
import { makeBillboard, srgbScalar } from '../effects/pixelTexture.js';
import { sizeSprite } from '../effects/smoke.js';
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
// visually opposite. reference/stage1-missile-salvo-t100.75.png settles it:
// the smoke is enormous at the launch end near the camera and narrows toward
// the missiles up-range. So the ribbon is widest at its OLDEST sample
// (~17 px) and tapers to a few px at the missile. That reading is also the
// one consistent with the measured value statistics — mean V 0.37 with a
// 2.7x bright/dark quintile ratio only works if the DARK, old end carries
// most of the area, which requires the old end to be the wide one.
// ---------------------------------------------------------------------------

const HOMING_DELAY_S = 0.3; // ADOPTED: missiles run straight before homing
const MAX_LIFE_S = 5.0; // ADOPTED
// Speed profile. MEASURED-TO-SPEC rather than picked: GAME_SPEC.md §3 puts
// launch -> impact at 0.5-1.5 s. The first profile (12 + 60t, cap 55) with a
// 20-unit minimum lock range produced a 0.28 s impact in the probe, less
// than half the measured floor. 10 + 34t capped at 48, with lockSystem.js's
// 28-unit minimum lock range, puts a near lock at ~0.6 s and a far one
// (depth 70) at ~1.05 s. Re-check both ends if either constant moves.
const V0 = 10; // world depth units/s at launch
const ACC = 34;
const V_MAX = 48;
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

const MISSILE_FRAC_NEAR = 0.022;
const MISSILE_FRAC_FAR = 0.009;

// --- Ribbon ----------------------------------------------------------------
const RIBBON_LIFE_S = 0.7;
const RIBBON_HZ = 60; // one sample per fixed tick
const MAX_SAMPLES = Math.ceil(RIBBON_LIFE_S * RIBBON_HZ) + 2;
// Screen-fraction half-thickness at the youngest and oldest sample.
// 0.0265 half = 5.3%W = 17 px of 320 at the wide end; 0.006 half = 1.2%W =
// 3.8 px at the missile.
const HALF_FRAC_YOUNG = 0.006;
const HALF_FRAC_OLD = 0.0265;
// Value ramp along the trail. REFERENCE.md "Missiles / weapons visuals":
// "continuous opaque WHITE->grey ribbon with 2.7x value taper near the
// missile", measured brightest quintile V 0.594 / darkest 0.219 = 2.71x.
// 1.0 -> 0.24 is set from BOTH published numbers rather than from the ratio
// alone: 0.24 lands the ribbon's old end on the measured darkest-quintile
// value of 0.219, and white at the young end matches
// reference/stage1-missile-salvo-t100.75.png, where the plume is near-white
// at the launch end. An earlier 1.0 -> 0.38 preserved the RATIO between the
// endpoints but left nothing in the frame genuinely dark, and the rendered
// bright/dark quintile ratio measured 1.7-1.9 — outside the required
// 2.2-3.2 — because quintiles are computed over PIXELS and the wide, old,
// dark end carries most of the area only if it is actually dark.
const V_YOUNG = 1.0;
const V_OLD = 0.24;
// Cross-ribbon edge value as a fraction of the centreline. Kept close to 1:
// at 0.70 the ribbon rendered as a smooth shaded TUBE (a 17 px-wide linear
// ramp reads as a cylinder, which is a 3D look the arcade never has — see
// tools/out/combat-r3-13-trail/frame-0275.png). At 0.88 the ribbon reads as
// a flat slab and the value structure the measurement describes comes from
// the age taper above, which is what "2.7x value taper NEAR THE MISSILE"
// actually refers to.
const EDGE_VALUE_MULT = 0.88;

const NDC_Y_PER_FRAC = 2 * (320 / 224);
const FRAC_Y_PER_NDC = 0.5 * (224 / 320);

class Trail {
  constructor(scene, space) {
    this.space = space;
    this.samples = [];
    const positions = new Float32Array(MAX_SAMPLES * 3 * 3);
    const colors = new Float32Array(MAX_SAMPLES * 3 * 3);
    const indices = new Uint16Array((MAX_SAMPLES - 1) * 12);
    for (let i = 0; i < MAX_SAMPLES - 1; i++) {
      const a = i * 3;
      const b = (i + 1) * 3;
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

    for (let i = 0; i < n; i++) {
      const s = this.samples[i];
      // Screen tangent from a central difference, in isotropic
      // width-fraction coordinates.
      const prev = this.samples[Math.max(0, i - 1)];
      const next = this.samples[Math.min(n - 1, i + 1)];
      let tx = (next.ndcX - prev.ndcX) * 0.5;
      let ty = (next.ndcY - prev.ndcY) * FRAC_Y_PER_NDC;
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
      // Authored as display greys, written into a linear vertex-colour
      // buffer — see srgbScalar's note in effects/pixelTexture.js.
      const value = srgbScalar(V_YOUNG + (V_OLD - V_YOUNG) * u);
      const edge = srgbScalar((V_YOUNG + (V_OLD - V_YOUNG) * u) * EDGE_VALUE_MULT);

      const offNdcX = px * half * 2;
      const offNdcY = py * half * NDC_Y_PER_FRAC;

      const base = i * 9;
      this.space.ndcToWorld(s.ndcX - offNdcX, s.ndcY - offNdcY, s.depth, v);
      pos[base] = v.x; pos[base + 1] = v.y; pos[base + 2] = v.z;
      this.space.ndcToWorld(s.ndcX, s.ndcY, s.depth, v);
      pos[base + 3] = v.x; pos[base + 4] = v.y; pos[base + 5] = v.z;
      this.space.ndcToWorld(s.ndcX + offNdcX, s.ndcY + offNdcY, s.depth, v);
      pos[base + 6] = v.x; pos[base + 7] = v.y; pos[base + 8] = v.z;

      col[base] = edge; col[base + 1] = edge; col[base + 2] = edge;
      col[base + 3] = value; col[base + 4] = value; col[base + 5] = value;
      col[base + 6] = edge; col[base + 7] = edge; col[base + 8] = edge;
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
const PUFF_INTERVAL_S = 0.13;

export class Missiles {
  constructor(scene, space, smoke) {
    this.scene = scene;
    this.space = space;
    this.smoke = smoke;
    this.live = [];
    this.spritePool = [];
    this.trailPool = [];
    // Set by the weapon manager; called with the enemy a missile reached.
    this.onImpact = null;
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
    };
    this.live.push(m);

    // Launch billow: three overlapping masses at the pylon, big enough to
    // "briefly occlude part of the screen" (t99.75-t101).
    // Two lobes, not three, and smaller: the first version painted three
    // 30-38%W masses that merged into one soft cloud filling the lower third
    // of the frame and hid the trails entirely
    // (tools/out/combat-r3-12-trail/frame-0265.png). "Briefly occlude part
    // of the screen" (GAME_SPEC.md §3) is the target, not obscure it.
    const pos = new THREE.Vector3();
    for (let i = 0; i < 2; i++) {
      const jitterX = (rng() - 0.5) * 0.07;
      const jitterY = (rng() - 0.5) * 0.05;
      this.space.ndcToWorld(m.ndcX + jitterX, m.ndcY + jitterY, m.depth * 1.05, pos);
      this.smoke.spawn('billow', pos, m.depth * 1.05, {
        life: 0.42 + rng() * 0.14,
        fracStart: 0.07,
        fracEnd: 0.17 + rng() * 0.05,
        valueStart: 1,
        valueEnd: 0.8,
        fadeFrom: 0.3,
      });
    }
    return m;
  }

  update(dt) {
    const pos = new THREE.Vector3();
    for (let i = this.live.length - 1; i >= 0; i--) {
      const m = this.live[i];
      m.age += dt;

      const v = Math.min(V_MAX, V0 + ACC * m.age);
      m.depth += v * dt;

      // Launch splay, decaying. Runs through the homing phase too so the
      // turn-in blends out of it instead of snapping.
      const decay = Math.exp(-SPLAY_DECAY_PER_S * dt);
      m.ndcX += m.velX * dt;
      m.ndcY += m.velY * dt;
      m.velX *= decay;
      m.velY *= decay;

      const target = m.target && m.target.alive ? m.target : null;
      if (target && m.age > HOMING_DELAY_S) {
        // Steer by the fraction of the REMAINING depth gap covered this
        // frame: the lateral error then closes exactly as the depth gap
        // does, which produces the visible curve into the target rather
        // than a constant-rate turn that either overshoots or never
        // arrives.
        const remain = Math.max(0.1, target.d - m.depth);
        const steer = Math.min(1, ((v * dt) / remain) * HOMING_GAIN);
        m.ndcX += (target.ndc.x - m.ndcX) * steer;
        m.ndcY += (target.ndc.y - m.ndcY) * steer;
      }

      m.trail.push(m.ndcX, m.ndcY, m.depth);
      m.trail.update(dt);

      m.puffTimer -= dt;
      if (m.puffTimer <= 0) {
        m.puffTimer += PUFF_INTERVAL_S;
        this.space.ndcToWorld(m.ndcX, m.ndcY, m.depth, pos);
        this.smoke.spawn('puff', pos, m.depth, {
          life: 1.0,
          fracStart: 0.04,
          fracEnd: 0.065,
          // White where the trail is young, dissipating to dark grey — see
          // the note at the top of effects/smoke.js for why this is a ramp
          // and not a constant.
          valueStart: 0.95,
          valueEnd: 0.22,
          fadeFrom: 0.82,
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

      const hit = target && m.depth >= target.d;
      if (hit || m.age > MAX_LIFE_S || m.depth > MAX_DEPTH) {
        this._retire(i, hit ? target : null);
      }
    }
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

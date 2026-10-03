import * as THREE from 'three';
import { makeBillboard } from '../effects/pixelTexture.js';
import { lockBarTexture } from './projectileSprites.js';

// Per-enemy lock brackets and the multi-lock salvo state.
//
// GAME_SPEC.md §3 "Lock-on display", element 3 (MEASURED on the t84-118
// reticle strip and the t115-118 engagement at 0.25 s):
//
//   "ONE white dashed corner-bracket rides the nearest enemy and JUMPS to
//    the next enemy the moment its target dies (t116->116.25: bracket ->
//    explosion under it, HIT +1, bracket already on the next); during a
//    salvo, MULTIPLE brackets show simultaneously (t100: ~6)."
//
// So there are two distinct populations and this file keeps them separate:
//   - the TRACKING bracket: always exactly one, on the nearest live enemy,
//     with a hysteresis margin so it does not flicker between two enemies at
//     similar range (ADOPTED);
//   - SALVO brackets: one per accumulated missile lock while the player
//     holds the missile button, up to 6.
// A bracket is drawn for the union, so an enemy that is both tracked and
// locked gets one bracket, not two.
//
// "AB2's bracket tracks the nearest threat continuously, not gated on
// crosshair hover" (behavior adopted at #49) — hence the tracking bracket
// ignores the sight entirely. Missile LOCK additionally requires the sight
// near the enemy (prototype: 80 px radius, ADOPTED), which is LOCK_RADIUS_FRAC
// below.

export const MAX_LOCKS = 6; // t100: ~6 brackets on screen at once
const LOCK_INTERVAL_S = 0.10; // locks accumulate while the button is held
// Radius around the SIGHT within which an enemy can be locked. The
// prototype's ADOPTED 80 px is on a 960-wide frame = 8.3%W; widened to 15%W
// after measurement — at 8.3%W a 1.4 s hold against a full 6-enemy wave
// accumulated only 4 locks (probe run, seed 2, t=4.1-5.0), against
// GAME_SPEC.md §3's measured "~6 dashed corner-bracket lock boxes on-screen
// at once" at t100. Measured from the sight, not from the jet: the sight IS
// the crosshair the measurement refers to. The prototype's radius is ADOPTED
// from its own tuning, not measured off the arcade, and the arcade's own
// 6-locks-at-once behaviour implies a cone this generous.
const LOCK_RADIUS_FRAC = 0.22;
// Lockable depth window. The NEAR end is a timing constraint, not a range
// limit: a target closer than ~28 units is reached in under half a second,
// below GAME_SPEC.md §3's measured 0.5-1.5 s launch->impact (the first
// version gated at 20 and the probe measured a 0.28 s impact). The far end
// is where an enemy is still a ~3 px dot, which is where the arcade's locks
// visibly happen.
const LOCK_DEPTH_MIN = 26;
const LOCK_DEPTH_MAX = 88;
// A held lock breaks once its target has closed this far — see the drop
// loop in update() for why this is a timing constraint as well as a
// behavioural one.
const LOCK_BREAK_DEPTH = 18;
// Hysteresis: a challenger must be 0.85x the incumbent's range to steal the
// tracking bracket (ADOPTED).
const TRACK_HYSTERESIS = 0.85;

// --- Bracket geometry, all MEASURED off the arcade -------------------------
//
// Source frames and operator are in weapons/projectileSprites.js's bar note.
// Summary: the box is SQUARE in pixels (t116: 35 x 35 px of 686x480), the
// stroke is ~1 native px, and each corner arm is a quarter of the box side
// (t116 5-9 px of 35 = 14-26%; t100.75 14-15 px of 53 = 27%).
//
// THE BOX IS A FIXED SCREEN SIZE. It does not scale with the target, and
// that is measured, not a simplification:
//
//   t116, bracket on a DISTANT enemy ~13 px wide (1.9%W):
//       box 35 x 35 px of 686 = 5.10%W
//   t100.75, bracket on a CLOSE enemy ~90 px wide (~8.8%W):
//       box side 53 px of 1028 = 5.16%W
//
// Two frames whose targets differ by nearly 7x in span, and the bracket is
// the same size in both to within 0.06%W. So AB2's lock bracket MARKS a
// target rather than outlining it — on the close enemy it sits around the
// fuselage and the wings run straight out through it.
//
// This replaces a 1.5x-the-enemy-span box with a 14 px floor, which at a
// 27%W fly-past produced a 130 px box whose corners sat 65 px away from the
// aircraft in every direction. That is exactly R4 gap 10's "four loose
// corners scattered near it": the corners were loose because the box was
// four times too big, not only because the arms were too short.
const BRACKET_BOX_PX = 16.5; // 5.15%W, the mean of the two measurements
// Box height / box width ON SCREEN. 1.0, not the 0.62 that shipped: a
// billboard quad that is square in world units is square in PIXELS here
// (worldWidthFor(f, d) spans f of the width, and f * 320/224 of the height,
// which is f*320 px either way), and the arcade's box measures 35 x 35.
// At 0.62 our brackets were letterboxed rectangles, which is half of why
// they read as loose corners rather than as a box around the target.
const BRACKET_BOX_ASPECT = 1.0;
// Corner arm length as a fraction of the box side, and its bounds. The upper
// bound keeps the four Ls from meeting into a closed rectangle (at 0.5 they
// touch); the lower bound keeps a minimum-size bracket legible.
const ARM_FRAC_OF_BOX = 0.25;
const ARM_MIN_PX = 2.5;
const ARM_MAX_FRAC_OF_BOX = 0.40;
// Stroke weight, native px, INDEPENDENT of box size. This is the constraint
// the previous two designs traded against arm length; with one sprite per
// arm it no longer has to be traded at all.
const STROKE_PX = 1.3;

// The sight square (GAME_SPEC.md §3's lock-display element 1): "the small
// dashed SIGHT square leading the player's nose — the aim point, always
// present in flight, separate from any lock indicator". Smaller than a lock
// bracket so the two never read as the same element.
const SIGHT_PX = 10; // of 320

export class LockSystem {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.tracked = null; // Enemy | null
    this.locks = []; // Enemy[], the salvo set
    this.lockTimer = 0;
    this.brackets = [];
    this.pool = [];
    this._wasHolding = false;

    // Cleared by the isolation harness (?combatonly without 'brackets'):
    // the brackets are near-white greyscale, the same segmentation class as
    // the smoke trail, so they have to be removable to measure the trail.
    this.bracketsVisible = true;

    this.sightCorners = this._makeCorners(29);
  }

  // `holding` is the missile button state. Returns nothing; read `locks`
  // after update and call `takeLocks()` on release.
  // `activeTargets` are enemies with a missile already in flight toward
  // them. They keep their bracket until impact: at launch the pending lock
  // set is consumed, and without this the whole cluster of brackets would
  // blink out on the very frame the salvo leaves — the probe showed exactly
  // that (6 brackets -> 1 in one tick at t=5.43), against GAME_SPEC.md §3's
  // "during a salvo, MULTIPLE brackets show simultaneously (t100: ~6)",
  // which is a description of the frames WHILE the missiles are flying.
  update(dt, enemies, playerNdc, holding, sight, activeTargets = []) {
    this.activeTargets = activeTargets;
    this._updateTracking(enemies);

    // Drop locks whose target died, left the field, or has closed inside
    // LOCK_BREAK_DEPTH. The last case matters because locks accumulate over
    // a hold of up to ~1.4 s and only fire on release: a target locked at
    // the 26-unit floor can be at 10 units by launch, and the missile then
    // reaches it in ~0.3 s, below GAME_SPEC.md §3's measured 0.5-1.5 s
    // launch->impact. A target that has closed that far has effectively
    // passed, so breaking the lock is the right behaviour anyway.
    for (let i = this.locks.length - 1; i >= 0; i--) {
      const e = this.locks[i];
      if (!e.alive || e.retired || e.d < LOCK_BREAK_DEPTH) this.locks.splice(i, 1);
    }

    if (holding) {
      // First lock lands immediately on press, so a tap still fires one
      // missile; subsequent locks accumulate on the timer.
      if (!this._wasHolding) this.lockTimer = 0;
      this.lockTimer -= dt;
      if (this.lockTimer <= 0 && this.locks.length < MAX_LOCKS) {
        const next = this._nearestLockable(enemies, sight ?? playerNdc);
        if (next) {
          this.locks.push(next);
          this.lockTimer = LOCK_INTERVAL_S;
        } else {
          this.lockTimer = 0.05; // retry soon; nothing in the cone yet
        }
      }
    }
    this._wasHolding = holding;

    if (sight) {
      this._placeCorners(this.sightCorners, sight.x, sight.y, sight.depth, SIGHT_PX);
      for (const c of this.sightCorners) c.visible = true;
    } else {
      for (const c of this.sightCorners) c.visible = false;
    }

    this._drawBrackets();
  }

  // Hand the accumulated locks to the launcher and clear them.
  takeLocks() {
    const out = this.locks.slice();
    this.locks.length = 0;
    return out;
  }

  _updateTracking(enemies) {
    let best = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.d < bestD) {
        bestD = e.d;
        best = e;
      }
    }
    // `retired` is as disqualifying as `alive === false`, and leaving it out
    // was a real bug worth recording: an enemy that FLIES PAST is removed
    // from the live list with retired=true but alive still true, so a
    // tracking test that only checked `alive` kept the bracket pinned to a
    // despawned object, frozen at its last screen position, until something
    // else happened to die. Measured before the fix: the bracket pointed at
    // an enemy that was no longer in play in 811 of 1200 consecutive frames
    // (68%), and the bracket "jumped" twice in 20 s instead of on every
    // kill. It looks completely fine in a screenshot — there is a bracket,
    // it is on screen, it is the right shape.
    if (!this.tracked || !this.tracked.alive || this.tracked.retired) {
      // The jump is immediate and unconditional — that is the measured
      // behaviour at t116->116.25 (bracket -> explosion under it, HIT +1,
      // bracket already on the next).
      this.tracked = best;
      return;
    }
    if (best && best !== this.tracked && best.d < this.tracked.d * TRACK_HYSTERESIS) {
      this.tracked = best;
    }
  }

  _nearestLockable(enemies, sightNdc) {
    const aspectY = 224 / 320;
    let best = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (this.locks.includes(e)) continue;
      if (e.d < LOCK_DEPTH_MIN || e.d > LOCK_DEPTH_MAX) continue;
      const dx = (e.ndc.x - sightNdc.x) * 0.5;
      const dy = (e.ndc.y - sightNdc.y) * 0.5 * aspectY;
      if (dx * dx + dy * dy > LOCK_RADIUS_FRAC * LOCK_RADIUS_FRAC) continue;
      if (e.d < bestD) {
        bestD = e.d;
        best = e;
      }
    }
    return best;
  }

  _drawBrackets() {
    const wanted = [];
    if (!this.bracketsVisible) {
      while (this.brackets.length) {
        const set = this.brackets.pop();
        for (const c of set) c.visible = false;
        this.pool.push(set);
      }
      return;
    }
    if (this.tracked && this.tracked.alive) wanted.push(this.tracked);
    for (const e of this.locks) if (!wanted.includes(e)) wanted.push(e);
    for (const e of this.activeTargets ?? []) {
      if (e && e.alive && !e.retired && !wanted.includes(e)) wanted.push(e);
    }

    while (this.brackets.length < wanted.length) {
      this.brackets.push(this.pool.pop() ?? this._makeCorners(30));
    }
    while (this.brackets.length > wanted.length) {
      const set = this.brackets.pop();
      for (const c of set) c.visible = false;
      this.pool.push(set);
    }

    for (let i = 0; i < wanted.length; i++) {
      const e = wanted[i];
      this._placeCorners(this.brackets[i], e.ndc.x, e.ndc.y, e.d, BRACKET_BOX_PX);
      for (const c of this.brackets[i]) c.visible = true;
    }
  }

  // Eight bar sprites: for each of the four corners, one horizontal arm and
  // one vertical arm. See weapons/projectileSprites.js for why this is eight
  // rectangles and not four Ls — in short, arm length must scale with the
  // box while stroke weight must not, and one sprite cannot do both.
  _makeCorners(renderOrder) {
    const tex = lockBarTexture();
    const out = [];
    for (let i = 0; i < 8; i++) {
      const s = makeBillboard(tex, 0.1);
      s.renderOrder = renderOrder;
      s.visible = false;
      this.scene.add(s);
      out.push(s);
    }
    return out;
  }

  // Places a bracket around (ndcX, ndcY) at `depth` with a square box
  // `boxPx` native pixels on a side.
  //
  // A square world quad projects to a square in PIXELS here — worldWidthFor
  // returns `frac * widthPerUnitDepth * depth`, which spans `frac` of the
  // frame width and `frac * 320/224` of its height, i.e. `frac * 320` px on
  // both axes — so one conversion covers both axes and `worldPx` below is a
  // genuine native-pixel unit on BOTH axes.
  //
  // THE CORNER OFFSETS GO ALONG THE LIVE CAMERA AXES, NOT ALONG NDC.
  //
  // ScreenSpace.ndcToWorld deliberately uses the camera's PITCH-ONLY basis so
  // that world objects swing around screen centre when the player banks —
  // that is right for the enemy, which is part of the world. It is wrong for
  // the bracket's own geometry: offsetting the four corners in that frame
  // rotates the BOX by the world roll, while each bar's billboard quad stays
  // screen-axis-aligned, so during a bank the bracket comes apart into eight
  // stray horizontal and vertical ticks at four different heights. Measured,
  // not theorised — the bracket on the lower-right enemy of
  // tools/out/combatfx-r5/fx8-brk/frame-0004.png has its top-left corner at
  // native (245,136) and its top-right at (261,140), four rows out of square.
  //
  // This file's header already notes that billboards keep their QUADS
  // screen-aligned for free. That was true and it is not sufficient: quad
  // orientation and corner placement are separate problems, and the old
  // four-L design hid the second one because a rotated arrangement of four
  // small square corners still reads as a rotated box.
  //
  // So: take the centre from ndcToWorld (rides the enemy through the roll),
  // then displace along the camera's CURRENT right/up — the actual screen
  // axes — which leaves the box upright at any bank angle. REFERENCE.md's
  // t104 and t186 both show brackets square to the screen in banked frames.
  _placeCorners(bars, ndcX, ndcY, depth, boxPx) {
    const halfPx = boxPx * 0.5;
    const arm = Math.min(
      Math.max(ARM_FRAC_OF_BOX * boxPx, ARM_MIN_PX),
      ARM_MAX_FRAC_OF_BOX * boxPx
    );
    const worldPx = this.space.worldWidthFor(1 / 320, depth);
    const halfY = halfPx * BRACKET_BOX_ASPECT;

    const camera = this.space.camera;
    this._centre ??= new THREE.Vector3();
    this._right ??= new THREE.Vector3();
    this._up ??= new THREE.Vector3();
    this.space.ndcToWorld(ndcX, ndcY, depth, this._centre);
    this._right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this._up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    const place = (sprite, px, py) => {
      sprite.position
        .copy(this._centre)
        .addScaledVector(this._right, px * worldPx)
        .addScaledVector(this._up, py * worldPx);
    };

    // Corner signs: (-1,+1) top-left, then clockwise.
    const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = corners[i];
      // Horizontal arm: sits on the corner's row, runs inward along x.
      const h = bars[i * 2];
      place(h, sx * (halfPx - arm * 0.5), sy * halfY);
      h.scale.set(arm * worldPx, STROKE_PX * worldPx, 1);
      // Vertical arm: sits on the corner's column, runs inward along y.
      const v = bars[i * 2 + 1];
      place(v, sx * halfPx, sy * (halfY - arm * 0.5));
      v.scale.set(STROKE_PX * worldPx, arm * worldPx, 1);
    }
  }

  clear() {
    this.tracked = null;
    this.locks.length = 0;
    for (const set of this.brackets) {
      for (const c of set) c.visible = false;
      this.pool.push(set);
    }
    this.brackets.length = 0;
  }
}

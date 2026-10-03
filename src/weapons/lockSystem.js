import { makeBillboard } from '../effects/pixelTexture.js';
import { sizeSprite } from '../effects/smoke.js';
import { lockCornerTexture } from './projectileSprites.js';

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

// Bracket BOX size relative to the enemy it rides, with a floor so a
// bracket on a distant dot is still legible — in
// reference/stage1-level-flight-t116.png the bracket on the far enemy is
// several times the size of the enemy itself.
const BRACKET_SPAN_MULT = 1.5;
const BRACKET_MIN_FRAC = 0.042; // 13.4 px of 320
// Box height as a fraction of its width, on screen.
const BRACKET_BOX_ASPECT = 0.62;
// Each corner mark is drawn at a FIXED screen size, independent of the box —
// that is what keeps the arm weight at the arcade's 1-2 native px whether
// the target is a 3 px dot or a 90 px fly-past. 0.021 = 6.7 px of 320.
const CORNER_FRAC = 0.021;
// NDC-per-screen-fraction conversions. Full frame width = 2 NDC = 1.0 frac,
// so 1 frac of WIDTH = 2 NDC x. The vertical axis additionally carries the
// 320:224 pixel aspect.
const NDC_X_PER_FRAC_W = 2;
const NDC_Y_PER_FRAC_W = 2 * (320 / 224);

// The sight square (GAME_SPEC.md §3's lock-display element 1): "the small
// dashed SIGHT square leading the player's nose — the aim point, always
// present in flight, separate from any lock indicator". Smaller than a lock
// bracket so the two never read as the same element.
const SIGHT_FRAC = 0.030; // 9.6 px of 320

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
      this._placeCorners(this.sightCorners, sight.x, sight.y, sight.depth, SIGHT_FRAC);
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
      const frac = Math.max(e.spanFrac(this.space) * BRACKET_SPAN_MULT, BRACKET_MIN_FRAC);
      this._placeCorners(this.brackets[i], e.ndc.x, e.ndc.y, e.d, frac);
      for (const c of this.brackets[i]) c.visible = true;
    }
  }

  // Four corner sprites, rotated into place. One texture serves all four:
  // sprite.material.rotation turns the L through 90-degree steps, and each
  // sprite owns its own material so the rotations do not collide.
  _makeCorners(renderOrder) {
    const tex = lockCornerTexture();
    const out = [];
    for (let i = 0; i < 4; i++) {
      const s = makeBillboard(tex, 0.1);
      s.renderOrder = renderOrder;
      s.material.rotation = -i * (Math.PI / 2);
      s.visible = false;
      this.scene.add(s);
      out.push(s);
    }
    return out;
  }

  // Places a corner set around (ndcX, ndcY) at `depth`, with a box
  // `boxFrac` of the frame wide. Corner SIZE does not depend on boxFrac.
  _placeCorners(corners, ndcX, ndcY, depth, boxFrac) {
    const halfX = boxFrac * 0.5 * NDC_X_PER_FRAC_W;
    const halfY = boxFrac * BRACKET_BOX_ASPECT * 0.5 * NDC_Y_PER_FRAC_W;
    const w = this.space.worldWidthFor(CORNER_FRAC, depth);
    // Order matches the rotation applied in _makeCorners: 0 = top-left,
    // then clockwise.
    const at = [
      [-halfX, halfY],
      [halfX, halfY],
      [halfX, -halfY],
      [-halfX, -halfY],
    ];
    for (let i = 0; i < 4; i++) {
      this.space.ndcToWorld(ndcX + at[i][0], ndcY + at[i][1], depth, corners[i].position);
      sizeSprite(corners[i], w);
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

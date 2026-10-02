import { makeBillboard } from '../effects/pixelTexture.js';
import { sizeSprite } from '../effects/smoke.js';
import { vulcanTexture, muzzleFlashTexture } from './projectileSprites.js';

// Player vulcan cannon.
//
// GAME_SPEC.md §3 / ARCHITECTURE.md D7 item 3, corrected from footage at
// t214: the rounds are ORANGE FIREBALL PUFFS in a loose zig-zag column from
// alternating muzzles, NOT thin white tracers. Palette and size are in
// projectileSprites.js; the geometry is here.
//
// THE ZIG-ZAG IS NOT AUTHORED — it falls out of two parallel muzzles.
// Rounds leave alternating muzzles every 1/12 s and converge on one aim
// point, so at any instant the column holds rounds at increasing range with
// alternating sign and shrinking amplitude: a wide zig-zag at the nose
// narrowing to a thin column up-range. That is exactly what
// reference/stage4-vulcan-stream-t214.png shows (the two muzzle columns are
// ~55 px apart on that 1028-wide frame near the nose = 17 native px = 5.3%W,
// and merge into one column further up). Deliberately NOT a scripted
// sinusoid.
//
// SCREEN TRAVEL IS LINEAR IN TIME, NOT IN 1/DEPTH. The first build
// interpolated the round's screen position by 1/depth — the physically
// correct parameterisation for a straight world line — and the capture
// killed it: with a 0.08 s firing interval the rounds bunched into a dense
// knot at the convergence point with a single lone puff left back at the
// muzzle, because 1/d collapses almost all of the screen travel into the
// first two frames of flight. t214's column is EVENLY SPACED: successive
// puffs sit ~30 px apart on that 1028-wide frame (9.4 native px) all the way
// up the stream, which is constant screen speed. Depth is still advanced
// (linearly) because it drives the puff's size taper and its depth sort
// against the enemies — only the SCREEN path is time-linear.
//
// The rounds therefore converge on an aim point that is itself a SCREEN
// position (the sight leading the nose, or an aim-assisted enemy), supplied
// by the caller. With the shipped camera the ground-plane vanishing point is
// only ~15 native px above the player sprite, so a stream aimed there is
// entirely hidden behind the jet; t214's stream climbs ~60 native px, and
// the enemies it is aimed at are in the sky band well above the horizon.

// 12 rounds/s (ADOPTED `weapon_manager_2d.gd` 0.08 s interval).
export const FIRE_INTERVAL_S = 0.08;

// Time from muzzle to aim point.
//
// Derived from t214's measured column, and the first derivation was wrong in
// a way worth recording: the ~9.4 native px spacing visible in that frame is
// the spacing within ONE MUZZLE's column, not between successive rounds.
// Rounds alternate muzzles, so successive rounds are ~4.7 px apart and the
// stream's screen speed is 4.7 x 12/s = ~56 native px/s, not the 113 the
// first pass assumed.
//
// The stream runs ~37.5 native px from the muzzle to the sight under this
// camera (t214's column measures ~34 native px: y 340 -> 230 on a 1028x720
// frame, /3.214). At 12 rounds/s that gives 12 x 0.7 = 8.4 rounds in the air
// and a per-muzzle spacing of 8.9 px — against the measured 9.3. The first
// value (0.45 s) put only 5.4 rounds in the column and the zig-zag did not
// read.
export const TRAVEL_S = 0.7;

// Muzzle separation, HALF of the measured 5.3%W nose-end column separation,
// expressed in NDC (1 NDC x = 0.5 frame widths, so 0.0265 frac -> 0.053 NDC).
const MUZZLE_NDC_X = 0.053;
const MUZZLE_NDC_Y = -0.035; // guns sit just under the fuselage line

// Rounds are rendered at a near-constant SCREEN size, tapering slightly with
// range: t214's puffs measure ~10-12 px near the nose and ~8 px at the top of
// the stream on that 1028-wide frame, i.e. 3.4 -> 2.5 native px. Deliberately
// NOT perspective scaling — the arcade draws its tracers at a near-constant
// size all the way up the stream, and perspective would make the far end
// sub-pixel.
const PUFF_FRAC_NEAR = 0.0125; // 4.0 px of 320
const PUFF_FRAC_FAR = 0.0095; // 3.0 px of 320

// Depth the stream reaches when nothing is aim-assisted. 55 units over
// TRAVEL_S is 111 world units/s, which is the depth rate that matches the
// measured screen speed above.
const DEFAULT_TARGET_DEPTH = 55;

// Generous hitbox (GAME_SPEC.md §3: "Vulcan is effectively the anti-close-
// range weapon; generous hitbox"). Floor keeps distant dots hittable at all.
const HIT_RADIUS_SPAN_MULT = 0.8;
const HIT_RADIUS_FLOOR_FRAC = 0.02;

const FLASH_LIFE_S = 0.05;
const FLASH_FRAC = 0.03;

export class Vulcan {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.rounds = [];
    this.pool = [];
    this.flashes = [];
    this.flashPool = [];
    this.cooldown = 0;
    this.side = 1;
  }

  _acquire(pool, texture, renderOrder) {
    if (pool.length) return pool.pop();
    const s = makeBillboard(texture, 0.1);
    s.renderOrder = renderOrder;
    return s;
  }

  // `aimAssist(ndcX, ndcY, depth)` is supplied by the weapon manager and
  // returns the enemy a round should be ramped onto, or null. ADOPTED #100:
  // without it, rounds fly the sight line and pass under airborne enemies
  // whose altitude differs from the player's.
  update(dt, { firing, playerNdc, aimAssist, sight }) {
    // Clamped at zero, not allowed to run negative. The first version used
    // `cooldown += FIRE_INTERVAL_S` on an unclamped accumulator, so every
    // second of NOT firing banked a second of negative cooldown and the next
    // trigger pull dumped the whole debt at one round per frame: the probe
    // measured 27 rounds in flight against the ~5.4 that 12 rounds/s over a
    // 0.45 s travel time allows. At 60 Hz this form fires every 5 ticks =
    // 12.0 rounds/s, against the ADOPTED 12.5; the 4% shortfall is below
    // what the 0.08 s interval can resolve on a 60 Hz step and is preferred
    // to the burst.
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (firing && this.cooldown <= 0) {
      this.cooldown = FIRE_INTERVAL_S;
      this._fire(playerNdc, aimAssist, sight);
    }

    for (let i = this.rounds.length - 1; i >= 0; i--) {
      const r = this.rounds[i];
      r.age += dt;
      const p = r.age / TRAVEL_S;
      if (p >= 1) {
        this._retire(i);
        continue;
      }
      r.ndcX = r.startNdcX + (r.targetNdcX - r.startNdcX) * p;
      r.ndcY = r.startNdcY + (r.targetNdcY - r.startNdcY) * p;
      r.depth = r.startDepth + (r.targetDepth - r.startDepth) * p;
      this.space.ndcToWorld(r.ndcX, r.ndcY, r.depth, r.sprite.position);
      sizeSprite(
        r.sprite,
        this.space.worldWidthFor(PUFF_FRAC_NEAR + (PUFF_FRAC_FAR - PUFF_FRAC_NEAR) * p, r.depth)
      );
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.age += dt;
      if (f.age >= FLASH_LIFE_S) {
        this.scene.remove(f.sprite);
        this.flashPool.push(f.sprite);
        this.flashes.splice(i, 1);
      }
    }
  }

  // `sight` is the screen aim point the stream converges on when nothing is
  // aim-assisted: { x, y } in NDC, supplied by the weapon manager.
  _fire(playerNdc, aimAssist, sight) {
    const startNdcX = playerNdc.x + this.side * MUZZLE_NDC_X;
    const startNdcY = playerNdc.y + MUZZLE_NDC_Y;
    this.side = -this.side;

    const target = aimAssist ? aimAssist(playerNdc) : null;
    const targetNdcX = target ? target.ndcX : sight.x;
    const targetNdcY = target ? target.ndcY : sight.y;
    const targetDepth = target ? target.depth : DEFAULT_TARGET_DEPTH;

    const sprite = this._acquire(this.pool, vulcanTexture(), 12);
    this.scene.add(sprite);
    this.rounds.push({
      sprite,
      age: 0,
      depth: playerNdc.depth,
      startDepth: playerNdc.depth,
      targetDepth,
      startNdcX,
      startNdcY,
      targetNdcX,
      targetNdcY,
      ndcX: startNdcX,
      ndcY: startNdcY,
    });

    const flash = this._acquire(this.flashPool, muzzleFlashTexture(), 13);
    this.space.ndcToWorld(startNdcX, startNdcY, playerNdc.depth, flash.position);
    sizeSprite(flash, this.space.worldWidthFor(FLASH_FRAC, playerNdc.depth));
    this.scene.add(flash);
    this.flashes.push({ sprite: flash, age: 0 });
  }

  _retire(i) {
    const r = this.rounds[i];
    this.scene.remove(r.sprite);
    this.pool.push(r.sprite);
    this.rounds.splice(i, 1);
  }

  // Resolves rounds against live enemies. `onKill(enemy)` is called for each
  // enemy destroyed. Returns nothing; the manager owns scoring and effects.
  resolveHits(enemies, onHit) {
    const aspectY = 224 / 320; // NDC y -> width-fraction conversion
    for (let i = this.rounds.length - 1; i >= 0; i--) {
      const r = this.rounds[i];
      const depthTol = Math.max(2.0, r.depth * 0.12);
      for (const e of enemies) {
        if (!e.alive) continue;
        if (Math.abs(e.d - r.depth) > depthTol) continue;
        const dx = (e.ndc.x - r.ndcX) * 0.5;
        const dy = (e.ndc.y - r.ndcY) * 0.5 * aspectY;
        const radius = Math.max(
          e.spanFrac(this.space) * HIT_RADIUS_SPAN_MULT,
          HIT_RADIUS_FLOOR_FRAC
        );
        if (dx * dx + dy * dy <= radius * radius) {
          this._retire(i);
          onHit(e, 1);
          break;
        }
      }
    }
  }

  clear() {
    while (this.rounds.length) this._retire(this.rounds.length - 1);
    for (const f of this.flashes) {
      this.scene.remove(f.sprite);
      this.flashPool.push(f.sprite);
    }
    this.flashes.length = 0;
  }
}

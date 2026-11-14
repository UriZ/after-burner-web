import { makeBillboard } from '../effects/pixelTexture.js';
import { sizeSprite } from '../effects/smoke.js';
import { vulcanTexture, muzzleFlashTexture } from './projectileSprites.js';
import { gunTunable } from './tunables.js';

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
// R12 -- FATTENED so the stream reads as a CONTINUOUS bright column rather
// than "a few faint dots" (the playtest's words). The per-muzzle puff spacing
// is ~8.9 native px (see TRAVEL_S), and at the shipped 3-4 px a puff spanned
// less than half that gap, so the two interleaved muzzle columns rendered as
// separated specks. The arcade stream is a dense overlapping column whose
// convergence piles into one bright mass (reference/stage4-vulcan-stream-
// t214.png); 5.1 px near the nose closes the gap between successive puffs so
// the column is continuous, which is the gestalt the measurement of a single
// puff (2.5-3.4 px native at t214) misses. The far end is kept smaller so the
// stream still tapers toward its convergence rather than reading as a slab.
const PUFF_FRAC_NEAR = 0.016; // 5.1 px of 320
const PUFF_FRAC_FAR = 0.011; // 3.5 px of 320

// Depth the stream reaches when nothing is aim-assisted. 55 units over
// TRAVEL_S is 111 world units/s, which is the depth rate that matches the
// measured screen speed above.
//
// THIS IS A RENDERING CONSTANT AND IS NOT THE GUN'S RANGE. R8: it was both,
// and that was the defect. `resolveHits` tested every round against every
// enemy with no cap on the round's own depth, so an unassisted round swept
// to 55 and could kill whatever it passed — measured directly off the R8
// kill ledger at baseline, the deepest vulcan kill in EVERY ONE of nine
// pilot arms sits at depth 59.4-60.2, where a fighter spans 1.17-1.19 %W
// (less than four native pixels of 320). The reach is now a separate,
// derived number (see REACH_MAX below); this one still governs how fast the
// puffs climb the screen, which is what it was measured for.
const DEFAULT_TARGET_DEPTH = 55;

// Generous hitbox (GAME_SPEC.md §3: "Vulcan is effectively the anti-close-
// range weapon; generous hitbox"). Floor keeps distant dots hittable at all.
//
// R8: 0.8 -> 0.5, AND THE CHANGE IS THAT THE KILL CIRCLE IS NOW THE
// AIRCRAFT. A radius of `0.8 x span` is a circle of DIAMETER 1.6 x the
// target's own wingspan — 60 % wider than the thing being shot at, in every
// direction. At 0.5 the diameter is exactly the wingspan: the hitbox is the
// silhouette's own footprint. It is still generous against a 3-4 native-px
// projectile and it is still the most forgiving hit test in the game; it is
// no longer forgiveness the player cannot miss.
//
// 0.8 was never measured against anything. GAME_SPEC.md §3's "generous
// hitbox" is tagged ASSUMED and gives no number.
//
// WHY IT MATTERS MORE AFTER THE OTHER CHANGES THAN BEFORE THEM. Once the gun
// is licensed only against aircraft at or above the 10 %W readable gate, the
// targets it engages are 10-27 %W, where a 1.6x-span circle is 16-43 % of
// the frame WIDE and 23-62 points of H TALL. The licence that made the gun
// kill only visible things also made its hitbox enormous in the band it was
// left with, and a neutral stick cannot miss a circle that size. Measured,
// arcade-missile-rate pilots, 180 s per seed, everything else at the shipped
// value so the arms differ in this constant alone:
//
//   hitmult   neutral kills/s   tracking kills/s   neutral/tracking   gun only
//     0.8       2.354 +-0.017     3.049 +-0.028       77.2 %          72.4 %   (4 seeds)
//     0.5       1.642 +-0.016     2.558 +-0.026       64.2 %          56.0 %   (4 seeds)
//     0.3       1.206             2.006               60.1 %          46.3 %   (1 seed)
//
// 0.3 scores better on the ratio and is NOT shipped: it puts the kill circle
// INSIDE the drawn silhouette (diameter 0.6 x span), so visibly centred hits
// would fail to register — a worse and more confusing defect than the one
// being fixed, and one I could not verify without a pixel pass I did not
// have. 0.5 is the principled stopping point because it is the only value in
// the sweep that corresponds to a statable rule.
//
// The FLOOR is kept only as a guard: `spanFrac` -> 0 as depth -> 0 and this
// test should not be exposed to that division. No kill depends on it any
// more — a 0.02 floor would bind below a 4 %W span, and the readable gate
// stops the gun at 10 %W.
const HIT_RADIUS_SPAN_MULT = 0.5;
const HIT_RADIUS_FLOOR_FRAC = 0.02;

// --- R8: AIM SCATTER ------------------------------------------------------
//
// The gun had NO error term of any kind, in either axis, and that is the
// shared root of two separate R7 findings. GAME_SPEC.md §3's own vulcan
// entry has carried it since round 1 and it was never implemented here:
// "rounds fly along the sight line into depth (prototype: 3.5 depth-units/s,
// converging laterally on the crosshair aim with SLIGHT SPREAD 0.025)".
// This restores it rather than inventing it, which is why the magnitude
// below is tagged ADOPTED and not ASSUMED.
//
// SHIPPED WIRED AND INERT AT 0, WITH THE MEASURED COST, because it does the
// OPPOSITE of what it was asked for. It is the lever the R7 feel critique
// named as untried — "an aim scatter term would let the gun's rate come down
// without the sky emptying" — and the R8 brief said to measure it rather
// than assume it. Measured, on BOTH builds, it makes the gun MORE lethal:
//
//   build                        arm            neutral gun kills   tracking gun kills
//   R7 gun (isolation)           scatter 0      292 /seed           350 /seed
//   R7 gun                       scatter 0.025  302  (+3.4 %)       353  (+1.0 %)
//   R7 gun                       scatter 0.05   309  (+5.8 %)       387  (+10.7 %)
//   R8 shipped gun (2 seeds)     scatter 0      398                 704
//   R8 shipped gun (2 seeds)     scatter 0.025  424  (+6.5 %)       761  (+8.1 %)
//
// and it does not move the neutral/tracking ratio (65.5 % -> 64.0 % on the
// shipped build, inside seed noise). THE MECHANISM, which inverts the
// proposal: with a hit radius proportional to the target and 12 rounds/s in
// the air, widening the dispersion grows the SWEPT AREA faster than it
// shrinks the per-round hit probability. Scatter is a shotgun, not a
// handicap. I first expected it to bite once the hitbox was tightened to the
// target's own span; it does not — the sign is the same in both regimes.
//
// It is NOT deleted, for the same reason R6 left the throttle closure wired
// and inert: it is a GAME_SPEC.md §3 element with provenance, the next lane
// should get the interface, the bound and the measured cost, and it is one
// character away. What must not happen is anyone reaching for it as a
// difficulty lever.
//
// Expressed in frame-WIDTH fractions, the isotropic unit every hit test in
// this project uses, and converted to NDC at the point of use (1 NDC x =
// 0.5 frame widths; y additionally carries the 224/320 aspect term).
const SCATTER_FRAC = 0;

const FLASH_LIFE_S = 0.05;
const FLASH_FRAC = 0.03;

export class Vulcan {
  // `rng` is the gun's OWN stream, not the shared gameplay one, and that is
  // a hard requirement rather than hygiene. This project's named bug class:
  // "adding one conditional draw silently shifts every later draw" — the
  // spawner, the liveries and the explosion shapes all draw from the shared
  // PRNG, so taking scatter draws from it would make every wave in the game
  // a function of how often the player pulled the trigger, and would make
  // the before/after measurement of this very change incomparable (different
  // waves, not a different gun). combat.js constructs it from the URL seed
  // with a fixed offset, so it is seed-reproducible and consumes nothing.
  // The draws are also UNCONDITIONAL per round (never "only if assisted"),
  // which is the other half of the same rule.
  constructor(scene, space, rng = null) {
    this.scene = scene;
    this.space = space;
    this.rng = rng;
    this.scatterFrac = gunTunable('scatter', SCATTER_FRAC);
    this.hitMult = gunTunable('hitmult', HIT_RADIUS_SPAN_MULT);
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
  // `onFire(side)` is called on the tick a round actually leaves a muzzle.
  // The cooldown gate is internal to this class, so a caller cannot otherwise
  // tell a held trigger from an actual shot (audio-dev's R4 request).
  update(dt, { firing, playerNdc, aimAssist, sight, onFire, reachDepth }) {
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
      this._fire(playerNdc, aimAssist, sight, onFire, reachDepth);
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
  // `reachDepth` is the depth an UNASSISTED round ramps to — the gun's
  // anti-close-range reach, see the targetDepth note below. Defaults to
  // DEFAULT_TARGET_DEPTH so the solo harnesses behave as before.
  _fire(playerNdc, aimAssist, sight, onFire, reachDepth = DEFAULT_TARGET_DEPTH) {
    const startNdcX = playerNdc.x + this.side * MUZZLE_NDC_X;
    const startNdcY = playerNdc.y + MUZZLE_NDC_Y;
    const side = this.side;
    this.side = -this.side;
    if (onFire) onFire(side);

    const target = aimAssist ? aimAssist(playerNdc) : null;
    // Scatter draws are taken UNCONDITIONALLY — before the branch, same
    // count every round, assisted or not. Conditional draws are this
    // project's named PRNG bug class, and a stream whose consumption depends
    // on whether a target happened to be in the cone is exactly that bug.
    // Three uniforms summed, not Box-Muller: it is a bounded triangular-ish
    // spread (so no round ever flies off to the edge of the frame), it costs
    // a fixed three draws, and the gun does not need a Gaussian tail.
    let jx = 0;
    let jy = 0;
    if (this.rng) {
      const ux = this.rng() + this.rng() + this.rng() - 1.5;
      const uy = this.rng() + this.rng() + this.rng() - 1.5;
      // frame-width fractions -> NDC. 1 NDC x = 0.5 frame widths; y carries
      // the same 224/320 term every hit test in this project applies, so a
      // scatter of n %W is n %W on screen in both axes rather than being
      // 1.43x taller than it is wide.
      jx = (ux * this.scatterFrac) / 0.5;
      jy = (uy * this.scatterFrac) / (0.5 * (224 / 320));
    }
    const targetNdcX = (target ? target.ndcX : sight.x) + jx;
    const targetNdcY = (target ? target.ndcY : sight.y) + jy;
    // R12 -- WHERE AN UNASSISTED ROUND RESOLVES ITS KILL, which R11 §2.1
    // measured as "at the muzzle". The screen path and the depth were both
    // ramped linearly in `p` to DEFAULT_TARGET_DEPTH = 55, so an unassisted
    // round crossed the measured median gun-kill depth 6.17 at
    // p = (6.17-5)/50 = 0.023 -- 2.3 % of the way from the nose to the sight,
    // still at the muzzle -- and a motionless pilot's gun kills landed a
    // median 5.8 %W and a p90 14.6 %W from the drawn sight, a p90 wider than
    // the sight's whole +-9.85 %W reach.
    //
    // The cause is the depth endpoint, not the screen path: because the round
    // swept all the way to depth 55, it passed through the shallow depths
    // where close readable enemies actually sit while it was still a few
    // pixels off the muzzle, and the depth-tolerance test let it kill them
    // there. Ramping the UNASSISTED round's depth to `reachDepth` (the
    // readable depth the gun is licensed to, ~7 on the shipped camera)
    // instead keeps the round in the shallow band throughout its climb, so
    // the only place it is near a readable enemy AND near that enemy on
    // screen is up where the stream converges on the sight -- which is where
    // the player aimed. The ASSISTED round is unchanged: it already ramps to
    // the target's own depth and resolves at the sight.
    //
    // This does not change the puff RENDERING. sizeSprite draws each puff at
    // a fixed SCREEN fraction (PUFF_FRAC_NEAR->FAR) via worldWidthFor, which
    // divides out the depth, so the stream's on-screen size and path are
    // governed by the NDC ramp and TRAVEL_S, not by this depth. What moves is
    // the depth the round SORTS at and the depth its kill resolves at.
    const targetDepth = target ? target.depth : reachDepth;

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
  //
  // `reachMax` is the deepest depth at which a round is allowed to resolve a
  // hit — the gun's RANGE, as opposed to how far its puffs travel. Supplied
  // by the weapon manager because the number is derived from the enemy's
  // wingspan and the camera (combat.js `readableDepth`), neither of which is
  // this file's business. Defaulting to Infinity keeps the solo harnesses
  // that call this with two arguments behaving as before.
  resolveHits(enemies, onHit, reachMax = Infinity, minSpanFrac = 0, minHitP = 0) {
    const aspectY = 224 / 320; // NDC y -> width-fraction conversion
    for (let i = this.rounds.length - 1; i >= 0; i--) {
      const r = this.rounds[i];
      // R12 -- THE KILL RESOLVES NEAR THE AIM POINT, NOT ALONG THE WHOLE
      // STREAM. A round interpolates muzzle -> aim point over `p = age /
      // TRAVEL_S`, so the first half of its life it is a few pixels off the
      // nose, climbing. R11 §2.1 measured that a motionless pilot's gun kills
      // land a median 5.8 %W / p90 14.6 %W from the drawn sight -- a p90
      // wider than the sight's whole +-9.85 %W reach -- because the round was
      // allowed to score anywhere on that climb, and the readable close
      // enemies sit low on screen where the climb passes near the muzzle.
      //
      // `minHitP` makes a round inert until it has converged most of the way
      // onto its aim point (the sight when unassisted, the assisted enemy
      // otherwise), so the only place it kills is up where the stream meets
      // the point the player aimed at. This is the judge's second candidate
      // repair, and it only works together with the shallow unassisted
      // `reachDepth` above: with the old ramp to 55 the round was at depth ~35
      // by the time `p` cleared this gate and there is nothing readable that
      // deep, so the gun would score nothing. Shallow depth + late `p` is one
      // fix in two halves. Defaults to 0 so the solo harnesses are unchanged.
      if (minHitP > 0 && r.age < minHitP * TRAVEL_S) continue;
      // THE REACH CAP. Before R8 this loop had no bound on the round's own
      // depth, and the R8 kill ledger shows what that cost directly rather
      // than by inference: at baseline the deepest vulcan kill in all nine
      // pilot arms is depth 59.4-60.2, against a cap of 7.06. R4's fix for
      // "the gun deletes echelons at 2-3 %W" went into the assist cone's
      // depth band and never into hit resolution, so an UNASSISTED round —
      // one flying the sight line to DEFAULT_TARGET_DEPTH — kept killing
      // whatever it happened to pass at any range.
      //
      // The round is retired by age, not here: it still FLIES the full
      // stream (that is what t214 shows and what TRAVEL_S was measured for),
      // it simply cannot score outside the band the weapon is licensed for.
      if (r.depth > reachMax) continue;
      const depthTol = Math.max(2.0, r.depth * 0.12);
      for (const e of enemies) {
        if (!e.alive) continue;
        if (Math.abs(e.d - r.depth) > depthTol) continue;
        // THE GUN'S LICENCE, R8: it may not kill what the player cannot see.
        // Gated on the AIRCRAFT'S OWN projected span rather than on a depth,
        // because `widthScale` runs 0.92 to 1.35 across the enemy types and
        // one depth is therefore the wrong bound for two of the three. The
        // span is already needed for the hit radius two lines down, so this
        // is the same read, not an extra one.
        //
        // This is the gate that also binds the UNASSISTED round, which the
        // R8 isolation showed was the term doing the damage: switching the
        // assist off made the gun MORE lethal, because rounds flying the
        // bare sight line to DEFAULT_TARGET_DEPTH had no bound at all.
        const span = e.spanFrac(this.space);
        if (span < minSpanFrac) continue;
        const dx = (e.ndc.x - r.ndcX) * 0.5;
        const dy = (e.ndc.y - r.ndcY) * 0.5 * aspectY;
        const radius = Math.max(span * this.hitMult, HIT_RADIUS_FLOOR_FRAC);
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

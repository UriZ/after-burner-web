import * as THREE from 'three';
import { createPrng } from '../core/prng.js';
import { batteryTexture } from '../render/ground.js';

// GROUND AA BATTERY (R32 judge gap 3) — the missing AB2 ground threat.
//
// Every enemy the spawner emits is AIRBORNE (fighter/interceptor/bomber). AB2's
// ground stages also throw GUN EMPLACEMENTS at you: AA batteries planted on the
// terrain that fire aimed, telegraphed rounds UP as you fly over, forcing a
// VERTICAL dodge. They are entirely missing, and this module adds them.
//
// HOW IT STAYS INSIDE THE EXISTING MACHINERY (so the air enemies and the weapon
// tuning are untouched). A GroundBattery is DUCK-TYPED as an Enemy: it exposes
// the same fields the spawner loop, telegraph (weapons/telegraph.js), vulcan
// (weapons/vulcan.js resolveHits), lock system (weapons/lockSystem.js), missile
// (weapons/missiles.js), combat._damage and the `__combatDebug`/`__combatStats`
// hooks all read. The spawner pushes batteries into `this.enemies`, so:
//   * the telegraph flare is drawn for it FOR FREE (it reads e.telegraph /
//     e.telegraphFrac / e.ndc / e.d — the MEASURED enemy-fire tell, so the
//     player learns ONE warning glyph, not two);
//   * its fire request flows out through the spawner's existing `fires` array
//     and becomes a real enemyShots round aimed at the player — the SAME
//     aimed-at-a-snapshot, dodgeable round the aircraft fire (weapons/
//     enemyShots.js), checked against the player by the SAME
//     PLAYER_HIT_RADIUS_FRAC path, so fairness is governed by the same model;
//   * it is DESTROYABLE by the gun and the missile for free — both iterate the
//     enemies list and funnel through combat._damage (score + explosion +
//     removal). The lock/assist only engage it when the SIGHT is actually on it
//     (lockSystem._lockable gates on sight proximity), so a battery low on the
//     ground never hijacks the bracket during ordinary sky combat — you destroy
//     it by deliberately pointing DOWN at it, which is the arcade's ground pass.
//
// WHAT MAKES IT A GROUND OBJECT AND NOT AN AIRCRAFT. It is anchored to a FIXED
// WORLD POINT on the ground plane (y=0 bottom, exactly like the runway/canyon
// props) and scrolled toward the camera at the GROUND SCROLL SPEED, then
// projected to its screen ndc/depth with space.worldToNdc each tick — so it
// streams past and GROWS with the terrain, pixel-correct, rather than flying an
// authored NDC path. depthRate is 0 (it is not approaching under a flight
// model), which also keeps the spawner's fly-past roar gate silent for it.
//
// FAIRNESS (the hard constraint). The fire is TELEGRAPHED (a flare pulses at the
// muzzle for TELEGRAPH_S before anything leaves) and DODGEABLE (the round is
// aimed at the player's position when the flare LIT, then flies a fixed line —
// the player moving between the tell and the impact is the dodge). A battery
// fires at most ONE short burst per pass, it shares the spawner's
// MAX_CONCURRENT_TRAINS budget with the aircraft (so adding batteries
// REDISTRIBUTES aim snapshots rather than stacking new ones), and the live count
// is capped. Verified before/after on tools/fairness_probe.mjs — deaths/min kept
// in the air baseline's band.

// ---------------------------------------------------------------------------
// Ground scroll, mirrored from the two files that own it so a battery sticks to
// the terrain it sits on. Flagged: the DATUM (index 1) is exact; the L/H
// excursions are the ADOPTED mirror of flow.js's table and only move a battery
// relative to the ground if a human throttles off the datum (no capture does).
const GROUND_SCROLL_BASE = 68.93; // src/game/stage.js scrollSpeed (constant across stages)
const THROTTLE_SCROLL_MULT = [0.62, 1.0, 1.45]; // src/game/flow/flow.js THROTTLE_SCROLL_MULT

export function groundScrollDist(dt, throttleIndex = 1) {
  return GROUND_SCROLL_BASE * (THROTTLE_SCROLL_MULT[throttleIndex] ?? 1) * dt;
}

// World placement / life.
const SPAWN_Z = -92; // far spawn (world units); scrolls toward +z
const DESPAWN_Z = 7; // retired just past the camera
const GROUND_Y = 0; // the ground plane props sit on
const X_MIN = 2.0; // off the flight-axis centre so the jet does not sit on it,
const X_MAX = 7.0; // but near enough that its fire climbs into the player column
const WORLD_WIDTH = 3.0; // reads ~8%W at depth 25, ~17%W at depth 12 (hittable close)

// Fire envelope (screen DEPTH, from space.worldToNdc). The band is wide because
// the ground rushes past (~69 u/s): a battery is only on screen ~1.7 s, so the
// tell lights as soon as it is in range and the burst leaves while there is
// still flight distance to the player plane.
const TELE_DEPTH_MAX = 42; // light the flare once this close
const FIRE_FLOOR_DEPTH = 12; // never fire from inside this (point-blank = unfair)
export const BATTERY_TELEGRAPH_S = 0.4; // short: the dodge window is carried by the round's flight
const TELEGRAPH_S = BATTERY_TELEGRAPH_S;

// R36 DEATH LEGIBILITY — the battery round's own flight profile, consumed by
// combat.js when it spawns the round (enemyShots.spawn opts).
//
// THE MEASURED DEFECT (judging/R36/death-legibility/NOTES.md): 7 of the 9
// deaths across both R36 playtest sessions were battery rounds, and every one
// gave ~1.03 s of total warning — a 0.4 s flare on a ground turret in the
// terrain clutter, then a round that left depth ~11.4 and crossed the player's
// plane 0.64 s later drawn at 5.8–6.7 native px the whole way (the air rounds'
// q-ramp only reaches its top at PASS_DEPTH, beyond the player). The player
// verdict those numbers produced: "I kept dying without ever seeing the shot
// that got me." The air trains were NOT the problem — their kills carried
// 3.1–3.3 s of warning with a measured-envelope fireball the whole way.
//
// THE FIX IS SIZE FIRST, THEN A MODEST SPEED CUT — NOT VOLUME (R30: arcade
// fire is sparse, CLOSED):
//   size 7→9.9px FRAC endpoints 0.022→0.031 of 320, i.e. the arcade's own
//                measured round-width median→p90 (6.85/8.50, max 10.58 — the
//                stage-7 t330 census in weapons/enemyShots.js), ramped by
//                FLIGHT PROGRESS (progressSize) so the growth happens over the
//                approach the player watches. The default air q-ramp only
//                reaches its top at PASS_DEPTH = 1.6, PAST the player, so a
//                killing round was never drawn near full size. THIS is the
//                load-bearing change: the old round failed on VISIBILITY (a
//                ~6 px dot in ground clutter), not on dodge distance.
//   speed 10→8   the round reaches the player plane in ~0.80 s (48 ticks)
//                instead of 0.64 s (38 ticks): a bigger, longer-lived fireball
//                to notice. Total warning 0.4 + 0.80 = 1.2 s (was 1.02 s).
//
// WHY NOT SLOWER. Dodge distance was never the limiter. The jet traverses
// ~19 %W in 0.5 s (STATUS 0.379 fracW/s) against a 4 %W-radius hit disc
// (PLAYER_HIT_RADIUS_FRAC 0.040 in the 0.5·NDC frac unit), so a player who
// SEES the round clears it with room to spare at 0.64 s, let alone 0.80 s. A
// slower round (speed 6 = 64 ticks) buys reaction margin a reacting human does
// not need, and it costs lethality: on the weaving demo pilot the per-round
// hit probability falls from 0.45 (old) to 0.23 at speed 6 but holds ~0.52 at
// speed 8 (battery crossing census, judging/R36/death-legibility/sweep-
// census.json), i.e. speed 8 keeps deaths/min at the de-scripted baseline
// (1.78/min) while speed 6 drops it ~38 % — the wrong trade given the round is
// already humanly dodgeable and the owner's standing "too easy" note. The
// snapshot aim is unchanged, so legibility does not touch the dodge CONTRACT,
// only how early the player sees the round. Verified before/after on
// tools/fairness_probe.mjs (deaths/min within noise, 0 unannounced fatal hits).
//
// `?battery=speed=6,spread=0.03` — measurement-only overrides (same idiom as
// combat.js's `?gun=`), so the legibility/lethality sweep can run arms without
// editing source between captures (an in-place edit is a concurrent writer to
// every other agent's capture). Unknown keys throw, same reasoning as ?gun=.
const _batteryOverrides = (() => {
  const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const raw = params.get('battery');
  const out = {};
  if (!raw) return out;
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split('=');
    if (!['speed', 'spread', 'fracfar', 'fracnear'].includes(k))
      throw new Error(`?battery=: unknown key "${k}"`);
    out[k] = Number(v);
  }
  return out;
})();

export const BATTERY_SHOT_PROFILE = {
  speed: _batteryOverrides.speed ?? 8,
  fracFar: _batteryOverrides.fracfar ?? 0.022,
  fracNear: _batteryOverrides.fracnear ?? 0.031,
  progressSize: true,
  // R37: picks the deeper incoming-fire voice (enemyShots.spawn -> sfx.js).
  // Audio-only — no ballistics field reads this.
  battery: true,
};
const BURST_LEN = 1; // ONE telegraphed AA round per pass — the arcade battery is
//                      a dodge PROMPT, not a guaranteed kill. A 2-round burst
//                      shared one snapshot and gave a non-reactive pilot two
//                      chances to be hit, pushing deaths/min out of band (R32
//                      fairness probe 0.33 -> 1.78); one round holds the threat
//                      read while keeping the added lethality modest.
const SHOT_SPACING_S = 0.16;
// Per-shot aim spread (NDC) about the snapshot. Drawn from the battery's OWN
// seeded stream (never the shared gameplay PRNG — the named stream-shift bug
// class), so it perturbs no wave.
//
// R36: 0.06 → 0.025, TIGHTENED so the now-legible round aims HONESTLY. The old
// wide spread was a crutch for an invisible round: it set the miss rate by a
// jitter the player never saw decide, rather than by whether they moved. Units
// show the old ±0.06 NDC spread was no dodge at all — PLAYER_HIT_RADIUS_FRAC
// 0.040 is in the 0.5·NDC frac unit, so the kill disc is ±0.08 NDC on x, WIDER
// than ±0.06, i.e. a stationary pilot was hit almost every time regardless.
//
// With BATTERY_SHOT_PROFILE's big, slightly slower (8 u/s, ~0.80 s) legible
// round, the dodge is the player MOVING off the snapshot — the arcade's actual
// model — so the round aims essentially true and a pilot who SEES it and does
// not move is fairly hit, one who weaves lives. 0.025 is a mild humanising
// jitter, not a miss budget. Measured: battery per-round hit probability is
// flat across spread 0.012–0.035 on the weaving demo pilot
// (tools/fairness_probe.mjs), so this lever sets stationary-pilot FAIRNESS,
// not demo lethality — which the speed governs.
const SHOT_SPREAD_NDC = _batteryOverrides.spread ?? 0.025;

let nextBatteryId = 700000; // high, disjoint from enemy ids

export class GroundBattery {
  constructor({ wx, side, sprite, rng }) {
    this.id = nextBatteryId++;
    this.isBattery = true; // the spawner branches its update() on this
    this.rng = rng;
    this.world = new THREE.Vector3(side * wx, GROUND_Y + (WORLD_WIDTH * sprite.__aspect) / 2, SPAWN_Z);
    this.sprite = sprite;
    this.sprite.position.copy(this.world);

    // --- Enemy-compatible surface (see the module header) ---------------
    this.alive = true;
    this.retired = false;
    this.ndc = { x: 0, y: 0 };
    this.d = -SPAWN_Z;
    this.bank = 0;
    this.pattern = 'battery';
    this.type = 'battery';
    this.role = 'ground';
    this.livery = { key: 'battery' };
    this.waveId = -1;
    this.lockBait = false;
    this.hp = 1;
    this.worldWidth = WORLD_WIDTH;
    this.depthRate = 0; // not a flight model; keeps the fly-past roar gate silent
    this.depthB = 0;

    // Telegraph + fire state (same names the telegraph renderer reads).
    this.telegraph = 0;
    this.telegraphFrac = 0;
    this.burstLeft = 0;
    this.burstCount = 0;
    this.burstTimer = 0;
    this.fireTimer = 0;
    this.firedThisLife = false;
    this.aimX = 0;
    this.aimY = 0;

    this._ndcOut = { x: 0, y: 0, depth: 0 };
  }

  get firingTrain() {
    return this.telegraph > 0 || this.burstLeft > 0;
  }

  spanFrac(space) {
    return space.spanFrac(this.worldWidth, this.d);
  }

  isRetired() {
    return this.world.z >= DESPAWN_Z;
  }

  // Gun/missile kill funnels through combat._damage -> enemy.damage(amount).
  damage(amount) {
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

  // Respawn-edge train cancellation (combat.js clearShots). A tell/burst aimed
  // at the previous life is a promise made to a dead pilot — drop it. Same
  // contract as enemy.js abandonTrain(); `firedThisLife` is left latched so a
  // battery already on its way past does not immediately re-fire at the new
  // life from point-blank.
  abandonTrain() {
    this.telegraph = 0;
    this.telegraphFrac = 0;
    this.burstLeft = 0;
  }

  // Driven by the spawner's enemy loop (special-cased on isBattery). Returns a
  // fire request in the enemy-fire shape, or null. `scrollDist` is this tick's
  // ground advance; `allowNewTrain` shares the spawner's concurrency budget.
  update(dt, scrollDist, space, allowNewTrain, playerNdc) {
    // Scroll along the terrain and re-project to screen.
    this.world.z += scrollDist;
    this.sprite.position.copy(this.world);
    space.worldToNdc(this.world, this._ndcOut);
    this.ndc.x = this._ndcOut.x;
    this.ndc.y = this._ndcOut.y;
    this.d = this._ndcOut.depth;

    if (!this.alive || this.isRetired()) {
      this.telegraph = 0;
      this.telegraphFrac = 0;
      return null;
    }

    let fired = null;
    if (this.telegraph > 0) {
      // Phase 1: flare lit, nothing fired yet. The aim was snapshotted when it
      // lit and is NOT refreshed — refreshing it would make the tell a lie.
      this.telegraph -= dt;
      this.telegraphFrac = 1 - Math.max(0, this.telegraph) / TELEGRAPH_S;
      if (this.telegraph <= 0) {
        this.telegraph = 0;
        this.telegraphFrac = 0;
        if (this.d >= FIRE_FLOOR_DEPTH) {
          this.burstCount = BURST_LEN;
          this.burstLeft = BURST_LEN;
          this.burstTimer = 0;
        }
        // If it sank past the floor during the tell, the burst is simply
        // dropped (the flare was an honest warning that nothing followed from
        // point-blank) — never a point-blank unannounced shot.
      }
    } else if (this.burstLeft > 0) {
      // Phase 2: pay out the short burst from the snapshot.
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.burstTimer += SHOT_SPACING_S;
        this.burstLeft -= 1;
        const jx = (this.rng() - 0.5) * 2 * SHOT_SPREAD_NDC;
        const jy = (this.rng() - 0.5) * 2 * SHOT_SPREAD_NDC;
        fired = {
          ndcX: this.ndc.x,
          ndcY: this.ndc.y,
          depth: this.d,
          aimX: this.aimX + jx,
          aimY: this.aimY + jy,
          // The un-spread snapshot, for combat.js's fairness probe.
          snapX: this.aimX,
          snapY: this.aimY,
        };
      }
    } else if (
      !this.firedThisLife &&
      allowNewTrain &&
      playerNdc &&
      this.d <= TELE_DEPTH_MAX &&
      this.d >= FIRE_FLOOR_DEPTH
    ) {
      // Phase 3: in range and the shared budget is free — light the flare and
      // snapshot the player. One burst per pass keeps it fair.
      this.telegraph = TELEGRAPH_S;
      this.telegraphFrac = 0;
      this.firedThisLife = true;
      this.aimX = playerNdc.x;
      this.aimY = playerNdc.y;
    }
    return fired;
  }
}

// Owns battery spawning cadence and the sprite texture. The spawner constructs
// one, ticks it, and pushes the batteries it yields into `this.enemies`.
export class GroundBatteryManager {
  constructor(scene) {
    this.scene = scene;
    // Own seeded stream, disjoint from the shared gameplay PRNG so it can
    // never shift the wave stream — but MIXED WITH THE URL SEED since R36.
    //
    // It was a fixed createPrng(0x8a77e27), "reproducible across every
    // ?seed" like the runway props' layout rng — but a battery is GAMEPLAY,
    // not scenery, and the fixed stream made every battery's spawn, aim
    // spread and fire time a seed-independent TIMETABLE. Measured
    // consequence (judging/R36/death-legibility/NOTES.md): the R36 playtest
    // died at tick 1541 with score exactly 84755 on BOTH seed 7 and seed 42
    // (the first battery round that connects, frozen passive score), and the
    // fairness probe's six deaths per run landed at the same six wall-times
    // on seeds 4, 5 and 6. Deaths were literally scripted. XORing the URL
    // seed in keeps every ?fixed&seed=N run byte-deterministic (same seed →
    // same run) while making different seeds different games.
    const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
    const urlSeed = params.has('seed') ? Number(params.get('seed')) : 1;
    this.rng = createPrng((0x8a77e27 ^ urlSeed) >>> 0);
    const { tex, aspect } = batteryTexture();
    this.tex = tex;
    this.aspect = aspect;
    this.active = false;
    // First battery a few seconds in, then on an interval. The phase is
    // DRAWN, not the fixed 4.0 it used to be: with a fixed first-spawn time
    // and only a ±2 s interval band, battery PASSES stayed near-aligned
    // across seeds even after the stream seed-mix above — the R36 probe
    // still showed deaths at the identical 94.5/109.2 s on seeds 4/5/6.
    // Drawing the phase from the battery's own stream de-correlates the
    // whole timetable per seed while staying byte-deterministic per run.
    this.spawnTimer = 4.0 + this.rng() * 4.0;
  }

  // Combat stages only. Refuel/non-combat beats pass active=false.
  setActive(on) {
    this.active = on;
  }

  reset() {
    this.spawnTimer = 4.0 + this.rng() * 4.0; // re-drawn phase, see constructor
  }

  _makeSprite() {
    const material = new THREE.SpriteMaterial({ map: this.tex, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(WORLD_WIDTH, WORLD_WIDTH * this.aspect, 1);
    sprite.__aspect = this.aspect;
    return sprite;
  }

  // Returns a new GroundBattery to add to the enemies list, or null. `liveCount`
  // is how many batteries are already alive (the spawner counts them).
  trySpawn(dt, liveCount, maxAlive) {
    if (!this.active) return null;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0 || liveCount >= maxAlive) return null;
    this.spawnTimer = 7.0 + this.rng() * 4.0;
    const wx = X_MIN + this.rng() * (X_MAX - X_MIN);
    const side = this.rng() < 0.5 ? -1 : 1;
    const sprite = this._makeSprite();
    this.scene.add(sprite);
    return new GroundBattery({ wx, side, sprite, rng: this.rng });
  }
}

export const MAX_BATTERIES = 2;

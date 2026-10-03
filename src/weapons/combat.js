import * as THREE from 'three';
import { ScreenSpace } from '../effects/screenSpace.js';
import { SmokeField } from '../effects/smoke.js';
import { ExplosionField } from '../effects/explosions.js';
import { Spawner } from '../game/spawner.js';
import { Vulcan } from './vulcan.js';
import { Missiles } from './missiles.js';
import { EnemyShots } from './enemyShots.js';
import { LockSystem, MAX_LOCKS } from './lockSystem.js';
import { AudioBus } from '../audio/index.js';

// Combat facade: one object game.js constructs and ticks. Owns the enemy
// spawner, both player weapons, enemy fire, lock brackets, explosions and
// smoke, and publishes the handful of fields the HUD reads.
//
// SHARED STATE CONTRACT (agreed with jethud-dev, who renders the HUD):
//   missiles      int 0..70, base-10 odometer semantics — tens digit = large
//                 rocket icons, units digit = small ticks. Starts at 50
//                 (5 large, 0 ticks) per GAME_SPEC.md §3's round-4 decode.
//   hit           int kill count. GAME_SPEC.md §6: kills pay through the
//                 stage-end HIT tally, NOT immediate score, so nothing here
//                 touches `score`. HIT is not reset by death and resets only
//                 at stage start — neither event exists this round, so it
//                 only counts up.
//   enemiesInPlay bool, for the reticle status dot (REFERENCE.md "Reticle
//                 anatomy": ABSENT when no enemies are in play).
//   locked        bool, true while at least one lock bracket is held.
// This object writes those four fields into whatever state object it is
// given; it never reads score/stage/throttle.

export const MISSILE_START_STOCK = 50;
const SALVO_COOLDOWN_S = 0.4; // ADOPTED
const LAUNCH_STAGGER_S = 0.05; // 6 missiles leave over ~0.3 s

// The sight: GAME_SPEC.md §3's lock-display element 1, "the small dashed
// SIGHT square leading the player's nose — the aim point, always present in
// flight, separate from any lock indicator". Placed 0.30 NDC above the jet
// = 15%H, which is where reference/stage4-vulcan-stream-t214.png's stream
// converges (top of the column ~0.32 H against a jet at ~0.51 H) and which
// sits inside the band the enemies fan out through.
const SIGHT_NDC_Y_OFFSET = 0.30;
const SIGHT_DEPTH = 55;

// Cone around the sight inside which a vulcan round's vertical ramp is
// snapped to a target. Wider than the missile lock radius (8.3%W) because
// the vulcan is the close-range weapon with the generous hitbox
// (GAME_SPEC.md §3), but far from the whole screen.
const ASSIST_RADIUS_FRAC = 0.13;

// Player hit radius/depth window for checkPlayerHit (R4 game-flow addition),
// pulled out to named top-level constants per combat-dev's request — these
// are COMBAT BEHAVIOUR (hit radius, what counts as a hit), not plumbing, so
// they live here as plain tunables rather than buried in a helper's body.
// GAME_SPEC.md doesn't measure a player hitbox size; 0.09 (an 18%W-wide box
// against the 35.6%W jet) was a documented ASSUMED starting point — retune
// directly here, no need to route changes through gameflow-dev.
// Retuned from gameflow-dev's initial 0.09 at their invitation. 0.09 put a
// 18%W-wide kill box around the centroid of a 35.6%W jet — about half the
// drawn span, so a shot anywhere near the inner wing was lethal. AB2 is
// forgiving about wingtips; the lethal area is the fuselage. 0.065 = a
// 13%W box, still comfortably inside the airframe.
const PLAYER_HIT_RADIUS_FRAC = 0.065;
const PLAYER_HIT_DEPTH_TOL = 2.2; // shots retire at EnemyShots' PASS_DEPTH=1.6

export class Combat {
  constructor(scene, camera, baseQuaternion, rng) {
    this.scene = scene;
    this.rng = rng;
    this.space = new ScreenSpace(camera, baseQuaternion);

    this.smoke = new SmokeField(scene, this.space);
    this.explosions = new ExplosionField(scene, this.space);
    this.spawner = new Spawner(scene, this.space, rng);
    this.vulcan = new Vulcan(scene, this.space);
    this.missiles = new Missiles(scene, this.space, this.smoke);
    this.enemyShots = new EnemyShots(scene, this.space);
    this.locks = new LockSystem(scene, this.space);

    this.missileStock = MISSILE_START_STOCK;
    this.hits = 0;
    this.salvoCooldown = 0;
    this.launchQueue = [];
    this.launchTimer = 0;
    this.launchSide = 1;

    this.playerNdc = { x: 0, y: 0, depth: 5 };
    this.sight = { x: 0, y: SIGHT_NDC_Y_OFFSET, depth: SIGHT_DEPTH };
    this._aimAssist = (ndc) => this._findAssistTarget(ndc);

    // Flight times of missiles that reached a target, kept for the
    // measurement probe (GAME_SPEC.md §3's 0.5-1.5 s launch->impact is an
    // acceptance number, so it has to be readable rather than eyeballed).
    this.impactTimes = [];
    this.missiles.onImpact = (enemy, missile) => {
      // No explosion sound here: _damage() below plays it for every kill
      // from either weapon AND knows the target type, so it can pass
      // { big: true } for a bomber. Firing from both sites double-triggered
      // on every missile kill, same tick, no gap (audio-dev).
      this.impactTimes.push(missile.age);
      if (this.impactTimes.length > 64) this.impactTimes.shift();
      this._damage(enemy, 99);
    };

    // `?combatonly=a,b` — measurement-only isolation switch. Runs a single
    // combat subsystem against an otherwise empty sky so a sprite can be
    // measured without enemies, smoke and tracers leaking into the mask.
    // This is the harness the enemy-scaling and trail-occupancy numbers in
    // the dev report were taken on; the alternative (measuring in a live
    // combat frame) is what produced three different answers for one jet in
    // the sibling project. Never read in normal play.
    const params = new URLSearchParams(location.search);
    const only = params.get('combatonly');
    this.only = only ? new Set(only.split(',')) : null;

    // `?combattrail=1` — measurement-only: no enemies at all, and the
    // missile button fires a stagger of UNGUIDED missiles straight up the
    // sight line. The smoke trail is greyscale and so are the enemy
    // airframes and the lock brackets, so with any of those on screen a
    // value-based segmentation of the trail is measuring a mixture. This
    // mode leaves the trail as the only non-sky, non-sea object in frame,
    // which is what the column-occupancy and bright/dark quintile numbers in
    // the dev report were measured on. Never read in normal play.
    this.trailHarness = params.has('combattrail');

    // `?invincible=1` — measurement-only: checkPlayerHit always reports a
    // miss, so a capture or probe can observe >=30 s of continuous flight.
    //
    // This exists because the death path CLEARS combat, so every death
    // restarts the sky from empty and the only combat ever observable is
    // the first 2-3 s of a rebuild — which makes the size-qualified density
    // criterion, enemy fire volume and salvo depth all unmeasurable. The
    // sibling project's standing rule is that a capture-invincibility
    // switch is the right tool for live verification that is not itself
    // testing death. Gated here rather than in the flow state machine
    // because this file owns what counts as a hit; src/game/flow/ owns what
    // happens afterwards.
    this.invincible = params.has('invincible');
    this.playerHitsTaken = 0;
    this._prevLockCount = 0;

    // `?combatexpl=1` — measurement-only: no enemies, no weapons; one
    // explosion every 1.2 s at a fixed screen position and depth. The
    // explosion palette has to be measured at PEAK opacity against a known
    // background: sampled out of live combat it is a mixture of the fireball,
    // its own fade-out alpha blending toward the sky, debris chunks and
    // whatever else is in frame, which is how a correctly-authored palette
    // can measure as "muddy brown". Never read in normal play.
    this.explHarness = params.has('combatexpl');
    this._explTimer = 0;

    // Spawner/pacing internals, exposed from THIS side rather than through
    // game.js's __combatStats hook, so the diagnostic survives game.js
    // changing hands. `?fixed=1` only.
    if (params.has('fixed') && typeof window !== 'undefined') {
      window.__combatDebug = () => ({
        waveTimer: this.spawner.waveTimer,
        dispenseTimer: this.spawner.dispenseTimer,
        waveIndex: this.spawner.waveIndex,
        pending: this.spawner.pending.length,
        alive: this.spawner.enemies.length,
        playerHitsTaken: this.playerHitsTaken,
        rngSample: this.rng(),
      });
    }
  }

  _on(name) {
    return !this.only || this.only.has(name);
  }

  // Tells combat which stage it is drawing, 0-based, matching
  // game/stage.js's STAGES array and flow.stageIndex.
  //
  // Only the missile smoke uses it so far, and it genuinely needs it: the
  // trail is a near-white opaque plume in stage-1 daylight and a dark grey
  // ribbon at night, a 2.6x difference in value that no single constant can
  // cover (effects/trailPalette.js carries the two measurements and R4
  // gap 4 is what happens without this).
  //
  // INTERFACE REQUEST, src/game/game.js (not this lane's file): one line in
  // update(), before `this.combat.update(...)`:
  //     this.combat.setStageIndex(this.flow.stageIndex);
  // Until that lands the default is daylight, which is correct for stages
  // 1-2 and wrong only for stage 3's night trail — the failure mode is a
  // white trail at night rather than a black one in daylight, i.e. the
  // cheap direction.
  setStageIndex(stageIndex) {
    this.stageIndex = stageIndex;
    this.missiles.setStageIndex(stageIndex);
    this.spawner.setStageIndex(stageIndex);
  }

  // `playerWorld` is the player sprite's world position; `input` is the
  // same { fire, missile } shape core/input.js produces.
  update(dt, input, playerWorld) {
    this.space.worldToNdc(playerWorld, this.playerNdc);
    this.sight.x = this.playerNdc.x;
    this.sight.y = this.playerNdc.y + SIGHT_NDC_Y_OFFSET;

    if (this.explHarness) {
      this._explTimer -= dt;
      if (this._explTimer <= 0) {
        this._explTimer = 1.2;
        const pos = new THREE.Vector3();
        const depth = 12;
        this.space.ndcToWorld(0, 0.15, depth, pos);
        this.explosions.spawn(pos, depth, this.rng, 1);
      }
      this.explosions.update(dt);
      return;
    }

    if (this._on('enemies') && !this.trailHarness) {
      const fires = this.spawner.update(dt);
      if (this._on('shots')) {
        for (const f of fires) {
          // The train's per-shot sweep offset is applied to the AIM point,
          // so the whole train rakes past the player (see enemy.js).
          this.enemyShots.spawn(f.fire, {
            x: this.playerNdc.x + (f.fire.aimOffsetX ?? 0),
            y: this.playerNdc.y + (f.fire.aimOffsetY ?? 0),
            depth: this.playerNdc.depth,
          });
        }
      }
    }
    this.enemyShots.update(dt);

    if (this._on('vulcan')) {
      this.vulcan.update(dt, {
        firing: !!input.fire,
        playerNdc: this.playerNdc,
        aimAssist: this._on('enemies') ? this._aimAssist : null,
        sight: this.sight,
        onFire: (side) => AudioBus.play('vulcan', { side }),
      });
      this.vulcan.resolveHits(this.spawner.enemies, (e, dmg) => this._damage(e, dmg));
    }

    if (this._on('missiles')) this._updateMissiles(dt, !!input.missile);

    this.locks.update(
      dt,
      this._on('locks') ? this.spawner.enemies : [],
      this.playerNdc,
      this._lockHold,
      // The sight is gated separately from the brackets: it sits on the
      // sight line that the solo-enemy harness also flies up, so leaving it
      // on silently merges with the subject in a column-run measurement
      // (it did, on the first pass: a 9 px "enemy" that was actually the
      // sight's corner arm).
      this._on('sight') && !this.trailHarness ? this.sight : null,
      this.missiles.live.map((m) => m.target)
    );
    this.locks.bracketsVisible = this._on('brackets') && !this.trailHarness;
    // Lock-acquired tone: detected by watching the lock count rise rather
    // than by adding a callback to lockSystem.js, so that file needs no
    // audio knowledge at all (audio-dev's suggestion, and it keeps the
    // dependency pointing one way).
    if (this.locks.locks.length > this._prevLockCount) AudioBus.play('lockOn');
    this._prevLockCount = this.locks.locks.length;

    this.missiles.update(dt);
    this.smoke.update(dt);
    this.explosions.update(dt);
  }

  _updateMissiles(dt, holding) {
    this.salvoCooldown -= dt;
    // Locks only accumulate when a salvo is not already being paid out and
    // there is stock to pay it with.
    this._lockHold = holding && this.salvoCooldown <= 0 && this.missileStock > 0;

    if (this.trailHarness) {
      if (holding && !this._wasHolding) {
        // Stub targets standing in for enemies: fixed screen positions off
        // to either side at a representative lock depth, so the harness
        // exercises the same homing turn a real salvo does. Duck-typed to
        // the few fields Missiles and _damage touch.
        for (let i = 0; i < 3; i++) {
          const side = i % 2 === 0 ? 1 : -1;
          this.launchQueue.push({
            alive: true,
            retired: false,
            type: 'fighter',
            d: 34 + i * 6,
            ndc: { x: side * (0.35 + 0.1 * i), y: 0.3 },
            damage: () => false,
          });
        }
      }
      this._wasHolding = holding;
      this.launchTimer -= dt;
      if (this.launchQueue.length && this.launchTimer <= 0) {
        const stub = this.launchQueue.shift();
        this.missiles.launch(this.playerNdc, stub, this.launchSide, this.rng);
        AudioBus.play('missileLaunch');
        this.launchSide = -this.launchSide;
        this.missileStock -= 1;
        this.launchTimer = LAUNCH_STAGGER_S;
      }
      return;
    }

    if (!holding && this._wasHolding && this.salvoCooldown <= 0) {
      const targets = this.locks.takeLocks();
      const n = Math.min(targets.length, this.missileStock, MAX_LOCKS);
      for (let i = 0; i < n; i++) this.launchQueue.push(targets[i]);
      if (n > 0) this.salvoCooldown = SALVO_COOLDOWN_S;
    }
    this._wasHolding = holding;

    this.launchTimer -= dt;
    if (this.launchQueue.length && this.launchTimer <= 0) {
      const target = this.launchQueue.shift();
      if (this.missileStock > 0) {
        this.missiles.launch(this.playerNdc, target, this.launchSide, this.rng);
        AudioBus.play('missileLaunch');
        this.launchSide = -this.launchSide;
        this.missileStock -= 1;
      }
      this.launchTimer = LAUNCH_STAGGER_S;
    }
  }

  // Aim assist (ADOPTED #100): "a round snaps its ALTITUDE/DEPTH ramp to the
  // nearest enemy near the sight line at spawn so convergence actually
  // intersects targets" — without it, shots pass under airborne enemies.
  //
  // It snaps the vertical ramp and the range, NOT the lateral aim, and that
  // split is load-bearing. The first version also snapped ndcX, which made
  // every round a guaranteed hit: at 12 rounds/s the vulcan cleared waves
  // the instant they came into range and a 20 s demo run ended with an empty
  // sky and no missiles ever used. Lateral accuracy stays the player's job,
  // so the vulcan still misses when the target is not on the sight line.
  _findAssistTarget(playerNdc) {
    const aspectY = 224 / 320;
    let best = null;
    let bestD = Infinity;
    for (const e of this.spawner.enemies) {
      if (!e.alive) continue;
      // Assist only out to 22 units (>=3.2%W on screen). GAME_SPEC.md §3:
      // "Vulcan is
      // effectively the anti-close-range weapon". At the previous 80 the
      // gun was deleting echelons while they were still 2-3%W dots, which
      // is both wrong for the weapon and the main reason readable-size
      // enemies were rare (measured: ~2/3 of spawns killed before reaching
      // 10%W). Missiles remain the long-range answer, which is the arcade's
      // division of labour.
      if (e.d < 6 || e.d > 22) continue;
      const dx = (e.ndc.x - playerNdc.x) * 0.5;
      const dy = (e.ndc.y - this.sight.y) * 0.5 * aspectY;
      if (dx * dx + dy * dy > ASSIST_RADIUS_FRAC * ASSIST_RADIUS_FRAC) continue;
      if (e.d < bestD) {
        bestD = e.d;
        best = e;
      }
    }
    if (!best) return null;
    return { ndcX: this.sight.x, ndcY: best.ndc.y, depth: best.d };
  }

  // Player hit radius, in the same NDC-ish fraction convention vulcan.js's
  // resolveHits uses for enemy hitboxes. See PLAYER_HIT_RADIUS_FRAC/
  // PLAYER_HIT_DEPTH_TOL above for the tunables.
  _playerHit(ndcX, ndcY, depth, playerNdc) {
    const aspectY = 224 / 320;
    const dx = (ndcX - playerNdc.x) * 0.5;
    const dy = (ndcY - playerNdc.y) * 0.5 * aspectY;
    const depthOk = Math.abs(depth - playerNdc.depth) <= PLAYER_HIT_DEPTH_TOL;
    return depthOk && dx * dx + dy * dy <= PLAYER_HIT_RADIUS_FRAC * PLAYER_HIT_RADIUS_FRAC;
  }

  // R4 game-flow addition: a death trigger the flow state machine can poll
  // once per tick without reaching into enemyShots/spawner directly (the
  // "agree a hit-test interface" ask from the round brief). Tests enemy
  // shots only — body-ram collision is GAME_SPEC.md §2's "narrow near-
  // despawn window" case, ADOPTED #103 reasoning, left as a documented gap
  // this round (every one of the four measured arcade deaths was a shot
  // hit, not a ram).
  //
  // `invincible` (R4 blocker fix, post-respawn grace window — GAME_SPEC.md
  // §2 ADOPTS the prototype's 2s window "as a usability choice"): a
  // matching shot is STILL consumed — it "passes through" rather than
  // lingering — but no death is reported. This is what makes GAME_SPEC's
  // explicit trap ("Invincibility must be pass-through for already-
  // overlapping bodies when it expires — otherwise expiry scores an
  // undodgeable hit") hold: a shot that was overlapping the WHOLE window
  // gets removed on an earlier invincible tick, so there is nothing left to
  // suddenly kill the player the instant invincibility ends.
  checkPlayerHit(playerNdc, invincible = false) {
    for (const s of this.enemyShots.shots) {
      if (s.ndcX === undefined) continue; // not yet updated this tick
      if (this._playerHit(s.ndcX, s.ndcY, s.depth, playerNdc)) {
        this.enemyShots.remove(s);
        // Counted whether or not it was survived, so the HIT RATE can be
        // tuned directly. Inferring it from deaths does not work: each
        // death costs an 8.5 s sequence that clears and rebuilds the sky,
        // so the death count saturates at ~4/minute almost regardless of
        // how lethal the fire actually is.
        this.playerHitsTaken += 1;
        return !invincible;
      }
    }
    return false;
  }

  // R4 game-flow addition: every subsystem already has its own clear()
  // (spawner/enemyShots/vulcan/missiles/locks/smoke/explosions) but nothing
  // wrapped them together. Used on death and at stage transitions so combat
  // starts clean rather than carrying stale enemies/projectiles across a
  // state the player can't see or fight in.
  clear() {
    this.spawner.clear();
    this.enemyShots.clear();
    this.vulcan.clear();
    this.missiles.clear();
    this.locks.clear();
    this.smoke.clear();
    this.explosions.clear();
    this.launchQueue.length = 0;
    this.salvoCooldown = 0;
  }

  _damage(enemy, amount) {
    if (!enemy.alive) return;
    if (!enemy.damage(amount)) return;
    const pos = new THREE.Vector3();
    this.space.ndcToWorld(enemy.ndc.x, enemy.ndc.y, enemy.d, pos);
    this.explosions.spawn(pos, enemy.d, this.rng, enemy.type === 'bomber' ? 1.4 : 1);
    AudioBus.play('explosion', { big: enemy.type === 'bomber' });
    this.hits += 1;
    // Removed on the same tick it dies so the tracking bracket jumps to the
    // next enemy immediately, which is the measured behaviour at
    // t116->116.25 (bracket -> explosion under it, HIT +1, bracket already
    // on the next).
    this.spawner.remove(enemy);
    if (this.locks.tracked === enemy) this.locks.tracked = null;
  }

  // Writes the agreed fields into the HUD's state object.
  publish(state) {
    state.missiles = this.missileStock;
    state.hit = this.hits;
    state.enemiesInPlay = this.spawner.aliveCount > 0;
    state.locked = this.locks.locks.length > 0;
  }
}

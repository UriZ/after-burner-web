import * as THREE from 'three';
import { ScreenSpace } from '../effects/screenSpace.js';
import { SmokeField } from '../effects/smoke.js';
import { ExplosionField } from '../effects/explosions.js';
import { Spawner } from '../game/spawner.js';
import { Vulcan } from './vulcan.js';
import { Missiles } from './missiles.js';
import { EnemyShots, SPEED as ENEMY_SHOT_SPEED } from './enemyShots.js';
import { LockSystem, MAX_LOCKS } from './lockSystem.js';
import { Telegraphs } from './telegraph.js';
import { TELEGRAPH_S as ENEMY_TELEGRAPH_S } from '../entities/enemy.js';
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
// The same 0.30 expressed as a distance in frame WIDTHS, which is the
// isotropic unit the offset has to be applied in now that its direction is
// screen up rather than NDC +y: 0.30 * 0.5 * (224/320) = 0.105 = 10.5 %W.
// Derived from SIGHT_NDC_Y_OFFSET rather than written out, so the measured
// constant stays the single source.
const SIGHT_FRAC = SIGHT_NDC_Y_OFFSET * 0.5 * (224 / 320);
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
// 0.040 — an 8%W box, 25.6 x 25.6 native px at 320x224.
//
// Sized against the airframe it stands for rather than tuned to a death rate:
// the jet spans 35.6%W = 114 px and R4 gap 1's own criterion (a) puts a
// fuselage at <=35% of span, i.e. <=40 px. 25.6 px is inside that, so the box
// is the fuselage core and the wings are not lethal — which is the arcade's
// documented behaviour ("AB2 is forgiving about wingtips") and was the
// reasoning for the earlier 0.065 -> 0.05 step too.
//
// Deliberately NOT pushed further. It is the cheapest number in the file to
// move and the least honest: once it is smaller than the fuselage, the fix
// has stopped being "the hit box matches the aircraft" and started being
// "rounds pass through the aircraft". The remaining factor in R4 gap 5 was
// taken out of time-of-flight (enemyShots.js SPEED) instead.
const PLAYER_HIT_RADIUS_FRAC = 0.040;
// How near a shot has to pass before the inbound-warning warble picks it up.
// Derived from the kill radius so the two cannot drift apart: a sound that
// only fires on shots that hit teaches nothing, and one that fires on every
// shot on screen is ambience.
const WARN_MISS_FRAC = PLAYER_HIT_RADIUS_FRAC * 3.2;

// Miss-distance histogram resolution for _logMiss. 0.01 per bin over
// 0..0.40 of a frame width, so PLAYER_HIT_RADIUS_FRAC (0.040) is exactly
// four bins and a change in the hit radius does not need a re-binning.
const MISS_BINS = 40;
const MISS_BIN_W = 0.01;

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
    this.telegraphs = new Telegraphs(scene, this.space);

    this.missileStock = MISSILE_START_STOCK;
    this.hits = 0;
    this.salvoCooldown = 0;
    this.launchQueue = [];
    this.launchTimer = 0;
    this.launchSide = 1;

    this.playerNdc = { x: 0, y: 0, depth: 5 };
    this.sight = { x: 0, y: SIGHT_NDC_Y_OFFSET, depth: SIGHT_DEPTH };
    this._up = { x: 0, y: 1 };
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
    // This file's own clock. It used to be created lazily by update()'s
    // `this.t = (this.t ?? 0) + dt`, and that cost a real crash: flow.js calls
    // checkPlayerHit() from _updateFlight BEFORE game.js reaches
    // combat.update() on the same tick, so on the very first flight tick
    // `this.t` was still undefined. Under `?invincible=1` the respawn edge
    // fires on exactly that tick, which stamped `_lifeStartT = undefined`, and
    // the first hit logged afterwards threw
    // "Cannot read properties of undefined (reading 'toFixed')" out of
    // _logHit — inside the game loop, so in a browser it stops the game, and
    // inside page.evaluate it rejects the probe's promise WITHOUT firing a
    // pageerror, which is why an errors:[] run is not evidence of no crash.
    // Reproduced at ?fixed=1&demo=2&seed=1&invincible=1 tick 1431 (also seed 2
    // tick 3551, seed 3 tick 7685). Initialising it here removes the class.
    this.t = 0;
    // Start of the life currently being flown, in that clock. 0 = the first
    // life of a credit, which gets no respawn grace. Advanced on the respawn
    // edge in checkPlayerHit; read only by _logHit.
    this._lifeStartT = 0;

    // `?combatexpl=1` — measurement-only: no enemies, no weapons; one
    // explosion every 1.2 s at a fixed screen position and depth. The
    // explosion palette has to be measured at PEAK opacity against a known
    // background: sampled out of live combat it is a mixture of the fireball,
    // its own fade-out alpha blending toward the sky, debris chunks and
    // whatever else is in frame, which is how a correctly-authored palette
    // can measure as "muddy brown". Never read in normal play.
    this.explHarness = params.has('combatexpl');
    this._explTimer = 0;

    // Cumulative fire/telegraph tallies for the fairness probe. Counters
    // rather than instantaneous counts because "enemy shot volume unchanged"
    // (R4 gap 5's own constraint on the fix) is a question about TOTAL rounds
    // fired over a run, and `enemyShots.shots.length` only reports how many
    // happen to be in the air at the instant you look.
    this.shotsFired = 0;

    // Spawner/pacing internals, exposed from THIS side rather than through
    // game.js's __combatStats hook, so the diagnostic survives game.js
    // changing hands. `?fixed=1` only.
    //
    // WARNING, and the reason __fairness below exists as a SECOND hook:
    // `rngSample` CONSUMES a draw from the shared PRNG, so every call to
    // __combatDebug perturbs the simulation from that tick onward. That is
    // acceptable for a one-shot inspection and fatal for a probe that polls
    // several hundred times across a 3-minute run — the thing being measured
    // (how often the player dies) would then depend on the sampling rate.
    // __fairness touches no RNG and is the one to poll.
    if (params.has('fixed') && typeof window !== 'undefined') {
      window.__combatDebug = () => ({
        waveTimer: this.spawner.waveTimer,
        dispenseTimer: this.spawner.dispenseTimer,
        waveIndex: this.spawner.waveIndex,
        pending: this.spawner.pending.length,
        alive: this.spawner.enemies.length,
        playerHitsTaken: this.playerHitsTaken,
        hitLog: (this.hitLog ?? []).slice(-16),
        playerNdc: { x: this.playerNdc.x, y: this.playerNdc.y },
        telegraphsLit: this.spawner.enemies.filter((e) => e.telegraph > 0).length,
        rngSample: this.rng(),
      });
      // LOCK-BRACKET GEOMETRY, read from the live sprites rather than from
      // pixels. R4 gap 10's residual defect — the bracket degenerating under
      // heavy bank — was first seen in a near-white connected-component
      // measurement, which cannot tell "the bar was not placed there" apart
      // from "the bar was placed there and something covered it, clipped it,
      // or merged with it". The missile trail, the sight square and the HUD
      // are all in the same segmentation class, and the brackets are
      // depth-tested against the ground. So project the eight bar sprites
      // through the live camera and read native-pixel positions directly:
      // the harness measures placement, and a pixel pass afterwards measures
      // whether what was placed survived to the screen. One of those two is
      // the actual bug and they are not the same question.
      // THE SIGHT SQUARE'S LIVE SCREEN POSITION, measurement only. Same
      // reasoning as __brackets below: read the projection of the sprites
      // that were placed, not the pixels, so "not placed there" and "placed
      // there and covered" stay separable. Returns NDC through the LIVE
      // (rolled) camera, which is the frame the question is asked in --
      // "does the sight hold station on the nose while the world rolls".
      window.__sight = () => {
        const cam = this.space.camera;
        const v = new THREE.Vector3();
        const pts = this.locks.sightCorners
          .filter((c) => c.visible)
          .map((c) => {
            v.copy(c.position).project(cam);
            return [v.x, v.y];
          });
        if (!pts.length) return null;
        return {
          ndcX: pts.reduce((a, p) => a + p[0], 0) / pts.length,
          ndcY: pts.reduce((a, p) => a + p[1], 0) / pts.length,
          n: pts.length,
        };
      };
      window.__brackets = () => {
        const cam = this.space.camera;
        const v = new THREE.Vector3();
        const px = (s) => {
          v.copy(s.position).project(cam);
          return [
            Number((((v.x + 1) / 2) * 320).toFixed(2)),
            Number((((1 - v.y) / 2) * 224).toFixed(2)),
          ];
        };
        const sets = this.locks.brackets
          .filter((set) => set[0].visible)
          .map((set) => {
            const pts = set.map(px);
            const xs = pts.map((p) => p[0]);
            const ys = pts.map((p) => p[1]);
            return {
              bars: pts,
              // Bar CENTRES, so the box these eight bars describe is
              // measured as the arcade measurement describes it: the span of
              // the four corners, in native px of 320x224.
              boxW: Number((Math.max(...xs) - Math.min(...xs)).toFixed(2)),
              boxH: Number((Math.max(...ys) - Math.min(...ys)).toFixed(2)),
            };
          });
        // Screen-space roll, derived the same way the placement code derives
        // its axes: the camera's own right axis, expressed in the UNROLLED
        // basis the world is authored in. atan2 of that is exactly the angle
        // the image is rotated by, with no Euler-order ambiguity.
        const r = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        r.applyQuaternion(this.space._inv);
        return {
          rollDeg: Number(((Math.atan2(r.y, r.x) * 180) / Math.PI).toFixed(2)),
          sets,
        };
      };
      window.__fairness = () => ({
        t: this.t ?? 0,
        shotsFired: this.shotsFired,
        telegraphsStarted: this.spawner.trainsStarted,
        telegraphsLit: this.telegraphs.live.length,
        shotsInAir: this.enemyShots.shots.length,
        playerHitsTaken: this.playerHitsTaken,
        hits: this.hits,
        hitLog: this.hitLog ?? [],
        // R6 lethality instrument -- see _logMiss. A histogram, not a list:
        // ~1100 crossings per 3-minute run would be a 40 KB array per poll
        // and the probe polls 10x a second.
        missHist: Array.from(this.missHist ?? []),
        missCrossings: this.missCrossings ?? 0,
        missBinW: MISS_BIN_W,
        hitRadius: PLAYER_HIT_RADIUS_FRAC,
        playerNdc: { x: this.playerNdc.x, y: this.playerNdc.y },
        // Per-enemy firing state. Needed because the aggregate counters
        // cannot distinguish "trains never start" from "trains start and
        // never pay out" — a 97% volume collapse looked identical to both
        // until this was readable.
        stageIndex: this.stageIndex ?? 0,
        enemies: this.spawner.enemies.map((e) => ({
          d: Number(e.d.toFixed(2)),
          pattern: e.pattern,
          // Livery census (R5): `role` and `livery` are what the player SEES,
          // and they are deliberately not derivable from `type` — see
          // enemy.js's LIVERY_BY_STAGE note. Counted from here rather than
          // from pixels because a single frame holds 1-3 aircraft and one
          // near-field fly-past dominates any pixel census.
          type: e.type,
          role: e.role,
          livery: e.livery.key,
          // Screen position in native px of 320x224, so a bracket's measured
          // box centre can be compared against the target it is supposed to
          // be on without going through a pixel census that cannot tell three
          // clustered aircraft apart.
          px: [
            Number((((e.ndc.x + 1) / 2) * 320).toFixed(1)),
            Number((((1 - e.ndc.y) / 2) * 224).toFixed(1)),
          ],
          // On-screen span as a fraction of frame WIDTH, from the enemy's own
          // projection rather than from a pixel mask. The R3 judge's
          // replacement density criterion is size-qualified (>=1 enemy at
          // >=10%W in >=60% of combat frames), and a pixel census cannot
          // attribute a span to an aircraft when three of them overlap — which
          // in a head-on echelon is the normal case, not the awkward one.
          wFrac: Number(e.spanFrac(this.space).toFixed(4)),
          waveId: e.waveId,
          tg: Number(e.telegraph.toFixed(3)),
          burstLeft: e.burstLeft,
          fireTimer: Number(e.fireTimer.toFixed(2)),
        })),
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
    this.t = (this.t ?? 0) + dt;
    this.space.worldToNdc(playerWorld, this.playerNdc);
    // THE SIGHT LEADS THE NOSE ON SCREEN, NOT IN THE UNROLLED FRAME.
    //
    // It used to be `playerNdc.y + 0.30` flat, and that is a defect in the
    // SELECTION and not only in the drawing (judging/R6/ask-flow.md A1).
    // Everything in this NDC frame is authored against the pitch-only basis
    // so that it swings with the horizon under bank -- except the jet, which
    // player.js roll-compensates so the airframe holds screen station. The
    // jet's position in THIS frame therefore rotates with the bank, and a
    // constant offset bolted onto it rotates around the airframe on screen:
    // 2 x 0.30 NDC x sin(33.25 deg) = 11.5 %W at the 66.5 deg saturation
    // angle, which reproduces R4's measured 112 px.
    //
    // That moves `_findAssistTarget`'s cone and `lockSystem._nearestLockable`'s
    // cone with it, so WHICH ENEMY THE GUN HELPS YOU HIT AND WHICH ONE THE
    // MISSILES LOCK WERE BOTH FUNCTIONS OF BANK ANGLE -- during the manoeuvre
    // the player spends most of their time in, and with nothing about the
    // target having changed. Visible or not, that is wrong.
    //
    // Fixed by taking the offset along SCREEN UP (screenSpace.screenUpNdc),
    // which is a unit direction in frame-width units, and scaling it back
    // into each axis's own NDC units. At zero roll this is exactly the old
    // expression: up = (0, 1), so x is unchanged and y gains
    // SIGHT_FRAC / (0.5 * 224/320) = 0.105 / 0.35 = 0.30.
    const up = this.space.screenUpNdc(this._up);
    this.sight.x = this.playerNdc.x + (up.x * SIGHT_FRAC) / 0.5;
    this.sight.y = this.playerNdc.y + (up.y * SIGHT_FRAC) / (0.5 * (224 / 320));

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
      // `throttleIndex` has been threaded through flow.js's returned input
      // since R5 with nothing consuming it (judging/R6/ask-flow.md A6).
      // Defaulted to M rather than 0 so a caller that does not supply it --
      // every measurement harness in tools/ -- gets the measured datum and
      // not the slow detent.
      const fires = this.spawner.update(dt, this.playerNdc, input.throttleIndex ?? 1);
      if (this._on('shots')) {
        for (const f of fires) {
          // The aim point is ABSOLUTE and was snapshotted when this enemy's
          // telegraph lit (see enemy.js) — it is deliberately NOT the live
          // player position, which is what makes the flare a promise the
          // player can act on.
          this.enemyShots.spawn(
            f.fire,
            { x: f.fire.aimX, y: f.fire.aimY, depth: this.playerNdc.depth },
            // Measurement-only. `bornT` plus TELEGRAPH_S is the warning the
            // player had; `sweep` is how far this shot's aim sits from the
            // snapshot, i.e. how far a motionless player already was from
            // being hit. Together they decide whether a hit was DODGEABLE,
            // which is the actual fairness question — see _logHit.
            { bornT: this.t, sweep: Math.hypot(f.fire.aimX - f.fire.snapX, f.fire.aimY - f.fire.snapY) }
          );
          this.shotsFired += 1;
        }
      }
    }
    this.enemyShots.update(dt);

    // The telegraph's two output channels. Both are driven from state the
    // enemies already carry, so neither can drift out of sync with the
    // timing that actually governs when a shot leaves.
    const lit = this._on('shots') ? this.telegraphs.update(this.spawner.enemies) : 0;
    this._updateInboundWarning(lit);

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
  // resolveHits uses for enemy hitboxes. See PLAYER_HIT_RADIUS_FRAC above.
  _playerHit(ndcX, ndcY, playerNdc) {
    const aspectY = 224 / 320;
    const dx = (ndcX - playerNdc.x) * 0.5;
    const dy = (ndcY - playerNdc.y) * 0.5 * aspectY;
    return dx * dx + dy * dy <= PLAYER_HIT_RADIUS_FRAC * PLAYER_HIT_RADIUS_FRAC;
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
  // lingering — but no death is reported. GAME_SPEC's explicit trap
  // ("Invincibility must be pass-through for already-overlapping bodies when
  // it expires — otherwise expiry scores an undodgeable hit") is now
  // satisfied structurally rather than by that consumption: a round is tested
  // exactly once, on the tick it crosses the player's plane, so there is no
  // such thing as a round that lingers overlapping the player waiting for the
  // window to expire.
  // THE HIT IS RESOLVED AT THE PLAYER'S PLANE, ONCE PER ROUND. This replaced
  // a depth-tolerance test (`|shotDepth - playerDepth| <= 2.2`) and it is the
  // single biggest cause of R4 gap 5 — bigger than aim, telegraph or kill
  // radius, all three of which were retuned first with almost no effect.
  //
  // Why the tolerance form was lethal. A round's screen position is the
  // 1/depth-proportional lerp from the firing aircraft (f = 1) to its aim
  // point (f = 0), and the player sits at depth ~5 while rounds are fired
  // from depth 24-52 and retire at 1.6. Over the +-2.2 window, f runs from
  // +0.345 down to -0.886 — so the test was applied at every tick across a
  // screen segment 1.23x the firer-to-aim distance long, EXTENDING 0.89x
  // BEYOND the aim point. A round aimed well clear of the player still swept
  // over them going through. That is why the measured per-round hit rate sat
  // at ~10% under a random 11-42%W aim bias, at ~10% under honest aim at a
  // 1.4 s-stale snapshot, and at ~8% after the lag was pushed past 2 s: the
  // aim point was never what decided a hit.
  //
  // The exact form: a round hits iff it crosses the player's depth plane this
  // tick AND its screen position AT THE CROSSING is inside the kill radius.
  // Since f = 0 exactly at the player's depth, that position IS the aim
  // point (the lerp below is kept general so the test stays correct if the
  // player's depth ever stops being constant). Every round therefore gets
  // exactly one test, and P(hit) is exactly P(the jet is within the kill
  // radius of where it was when the flare lit) — which is the quantity
  // enemy.js's TELEGRAPH_S note is solved against, and was not measurable
  // before because the sweep dominated it.
  //
  // No tick can be skipped: a round covers SPEED/60 = 0.4 depth units per
  // fixed tick and the crossing test is an interval test on (prevDepth,
  // depth], not a proximity test, so it cannot fall between two samples
  // however fast the round travels.
  checkPlayerHit(playerNdc, invincible = false) {
    // RESPAWN CLEARS IN-FLIGHT ENEMY FIRE. See clearShots() for the decision
    // and the reasoning. Driven off the rising edge of `invincible` because
    // that edge IS the respawn: flow.js sets the grace window at the
    // death->flight transition and does not call this method while dead, so
    // the first flight tick of a new life is the first call with `invincible`
    // true after a run of false ones.
    //
    // This is a fallback, deliberately: an explicit clearShots() call at the
    // respawn transition in src/game/flow/ is the clearer site and makes this
    // edge a no-op (clearShots is idempotent). It lives here so the fix is
    // live now without a cross-lane change, and so this file's fairness model
    // does not silently depend on another lane remembering to call it.
    if (invincible && !this._wasInvincible) {
      this.clearShots();
      // Same edge, used as the start of the new life for _logHit's
      // `announced` field. Measurement only — nothing in the simulation
      // reads it. Initialised to 0 in the constructor so the first life,
      // which gets no grace window, is handled by the same arithmetic.
      this._lifeStartT = this.t;
    }
    this._wasInvincible = invincible;

    const pd = playerNdc.depth;
    for (const s of this.enemyShots.shots) {
      if (s.ndcX === undefined) continue; // not yet updated this tick
      if (!(s.prevDepth > pd && s.depth <= pd)) continue;
      const f = (1 / pd - s.invAim) / (s.invStart - s.invAim);
      const hx = s.aimNdcX + (s.startNdcX - s.aimNdcX) * f;
      const hy = s.aimNdcY + (s.startNdcY - s.aimNdcY) * f;
      this._logMiss(hx, hy, playerNdc);
      if (this._playerHit(hx, hy, playerNdc)) {
        this.enemyShots.remove(s);
        // Counted whether or not it was survived, so the HIT RATE can be
        // tuned directly. Inferring it from deaths does not work: each
        // death costs an 8.5 s sequence that clears and rebuilds the sky,
        // so the death count saturates at ~4/minute almost regardless of
        // how lethal the fire actually is.
        this.playerHitsTaken += 1;
        this._logHit(s, invincible);
        return !invincible;
      }
    }
    return false;
  }

  // Audio half of the fairness telegraph. `intensity` rises both with the
  // number of flares lit and with how close the nearest live shot is to the
  // player, so the warble is already going before anything is fired and
  // peaks as the dangerous shot arrives.
  //
  // Proximity is measured in SCREEN distance and depth together: a shot that
  // is close on screen but still far away is not yet a threat, and one that
  // is near in depth but across the frame never will be. Shots are aimed at
  // a snapshot, so a shot whose screen distance stays large is one the
  // player has already dodged — the warning correctly falls silent for it.
  _updateInboundWarning(lit) {
    const aspectY = 224 / 320;
    let worst = 0;
    for (const s of this.enemyShots.shots) {
      if (s.ndcX === undefined) continue;
      const dx = (s.ndcX - this.playerNdc.x) * 0.5;
      const dy = (s.ndcY - this.playerNdc.y) * 0.5 * aspectY;
      const miss = Math.hypot(dx, dy);
      // Only shots that will pass near the player warn at all. WARN_MISS is
      // 3.2x PLAYER_HIT_RADIUS_FRAC, so a near miss still warns — which is
      // what teaches the player the sound means something.
      if (miss > WARN_MISS_FRAC) continue;
      const near = 1 - Math.min(1, miss / WARN_MISS_FRAC);
      // Depth closes at EnemyShots' own SPEED; 1.2 s out is where the tone
      // should already be audible. IMPORTED, not copied: this was a literal
      // 24 and the constant has been 15 since R5 and is 12 since R6, so the
      // warble had been starting at the wrong range for two rounds -- it
      // computed an ETA twice the real one and the tone therefore rose late.
      const eta = Math.max(0, s.depth - this.playerNdc.depth) / ENEMY_SHOT_SPEED;
      const soon = 1 - Math.min(1, eta / 1.2);
      worst = Math.max(worst, near * soon);
    }
    const intensity = Math.max(worst, lit > 0 ? 0.25 : 0);
    AudioBus.setInboundWarning?.(intensity);
  }

  // MEASUREMENT ONLY, R6. The MISS DISTANCE of every enemy round at the
  // instant it crosses the player's plane, in the hit test's own units, as a
  // 40-bin histogram over 0..0.40 plus an overflow bin.
  //
  // It exists because DEATHS CANNOT BE TUNED ON. Three seeds x 180 s of
  // `?demo=1` produce 23-25 fatal hits; the Poisson standard deviation on 24
  // is 4.9, so the measurement cannot resolve anything smaller than a 20 %
  // change, and the gate this round asks for is a 22 % change. Measured
  // directly: a geometry change predicted to cut the per-round hit
  // probability ~25 % moved the death count 23 -> 24. That is not evidence
  // the change failed; it is evidence the instrument is too coarse, and
  // publishing either number as a result would have been the "clean,
  // plausible, stable" false alarm CLAUDE.md warns about.
  //
  // The same 540 s carries ~1100 plane crossings. P(hit) = the share of them
  // inside PLAYER_HIT_RADIUS_FRAC, so deaths/min is predicted as
  //   rounds/min x P(miss <= radius) x (fraction of hits that are fatal)
  // with a relative standard error of ~1/sqrt(hits in the bin) on the first
  // factor rather than on the deaths. The histogram also shows WHERE the
  // mass is, which is what says whether a lever is moving the distribution
  // or only its tail.
  //
  // Known bias, stated: `checkPlayerHit` returns on the first round that
  // hits, so on a tick where two rounds cross and the first one kills, the
  // second is never logged. Measured frequency of multi-crossing ticks is
  // low and only hits are affected, so this under-counts the >=2nd crossing
  // of a killing tick -- it cannot inflate P(hit).
  _logMiss(hx, hy, playerNdc) {
    const aspectY = 224 / 320;
    const dx = (hx - playerNdc.x) * 0.5;
    const dy = (hy - playerNdc.y) * 0.5 * aspectY;
    const d = Math.hypot(dx, dy);
    this.missHist ??= new Int32Array(MISS_BINS + 1);
    const b = Math.min(MISS_BINS, Math.floor(d / MISS_BIN_W));
    this.missHist[b] += 1;
    this.missCrossings = (this.missCrossings ?? 0) + 1;
  }

  // MEASUREMENT ONLY. Records, for every shot that reached the player,
  // how much warning they had and how far they would have had to move.
  //
  // This exists because deaths-per-minute on `?demo=1` CANNOT answer the
  // fairness question: that path flies a fixed sinusoidal weave and does not
  // react to anything, so against genuinely aimed fire it will be hit at
  // whatever rate the geometry dictates no matter how readable the tell is.
  // Driving that number down would mean making the fire miss on purpose,
  // which is the inverted contract the telegraph replaced. What CAN be
  // measured on a non-reactive path is whether an evasive move existed:
  //
  //   warning  = TELEGRAPH_S + time of flight
  //   needed   = kill radius - how far off the snapshot this shot already was
  //   dodgeable if (jet's lateral speed) * warning > needed
  //
  // The speed term is deliberately left out here and applied by the analysis
  // script from the jet's MEASURED envelope, so this code carries no guessed
  // constant.
  _logHit(shot, invincible = false) {
    this.hitLog ??= [];
    const m = shot.meta;
    this.hitLog.push({
      t: this.t,
      // A hit taken inside the post-respawn grace window is NOT a death and
      // must not be pooled with the ones that are: the grace window exists
      // precisely because those hits were not dodgeable (the player had no
      // control of where they were put down), so averaging them in would
      // make the fairness figure look worse than the game is.
      fatal: !invincible,
      warning: m ? this.t - m.bornT + ENEMY_TELEGRAPH_S : null,
      sweep: m ? m.sweep : null,
      radius: PLAYER_HIT_RADIUS_FRAC,
      // THE FAIRNESS STATISTIC ITSELF, as opposed to a proxy for it. No
      // deaths-per-minute figure, on either denominator, can tell an
      // unavoidable respawn death apart from honest difficulty: both are one
      // increment of the same counter. This pair can.
      //
      // `flareLit` is when the announcing flare came ON — enemy.js lights it
      // ENEMY_TELEGRAPH_S before the round leaves, and the aim snapshot is
      // taken at that same instant and never refreshed. `lifeStart` is when
      // the jet the round killed came into existence (t=0 for the first life,
      // the respawn edge thereafter).
      //
      // announced === false means the flare lit before this life began: the
      // round was aimed at a snapshot of a jet that no longer exists, so no
      // input during this life could have avoided it. That is the exact
      // defect clearShots() exists to make impossible, and this field is how
      // the guarantee is checked rather than asserted — it must read 0 across
      // a run, and a nonzero count localises the leak to a hit with a time.
      flareLit: m ? Number((m.bornT - ENEMY_TELEGRAPH_S).toFixed(3)) : null,
      lifeStart: Number(this._lifeStartT.toFixed(3)),
      announced: m ? m.bornT - ENEMY_TELEGRAPH_S >= this._lifeStartT - 1e-6 : false,
      // Warning actually available WITHIN this life: a flare that lit 0.2 s
      // after a respawn gave 0.2 s less usable warning than its nominal
      // `warning`, and only this form is comparable across lives.
      inLifeWarning: m
        ? Number((this.t - Math.max(m.bornT - ENEMY_TELEGRAPH_S, this._lifeStartT)).toFixed(3))
        : null,
    });
    if (this.hitLog.length > 256) this.hitLog.shift();
  }

  // Retire every enemy round currently in the air, leaving the aircraft, the
  // smoke, the brackets and the player's own weapons untouched. Idempotent.
  //
  // WHY THIS AND NOT A THREAT-AWARE GRACE (player-feel lane's ask A3). The
  // measured defect: with flow.js no longer clearing combat on death — which
  // is right, and is what removed the ~20 s empty-screen stretches — the
  // player respawns into a sky that may already have rounds inbound, and 17%
  // of lives ended within about 1 s of the 2.0 s grace expiring.
  //
  // The two offered fixes are not equivalent under this lane's fairness
  // model. That model is one sentence: EVERY ROUND THAT CAN KILL YOU WAS
  // ANNOUNCED BY A FLARE YOU COULD SEE, and the flare's promise is honest
  // because the round is aimed at where you were when it lit (enemy.js,
  // TELEGRAPH_S). A round already in flight at a respawn was aimed at a
  // snapshot of the PREVIOUS life's jet, taken before this life existed. It
  // is unannounced by construction, and no amount of extra grace changes
  // that — a longer window only moves where the unannounced round lands.
  //
  // Holding invincibility while a round closes also costs more than it looks:
  // it puts fireballs through the jet with no effect, which teaches the
  // player that a hit sometimes does not count. That erodes the same contract
  // it is trying to protect, and being capped, it can still expire with a
  // round inbound — the original defect, just rarer and harder to diagnose.
  //
  // The cost of clearing is small and bounded, which is the whole reason this
  // is not the old combat.clear(): the AIRCRAFT are the visual mass and they
  // stay, along with their smoke and the enemies' own approach. What goes is
  // 8-16 small fireballs, replaced within ~1-2 s by the next train — which
  // now opens, correctly, with a flare the respawned player can see.
  clearShots() {
    this.enemyShots.clear();
    // ...and the trains that had not yet paid out. See enemy.js
    // abandonTrain(): retiring the rounds in the air is only half of the
    // guarantee, because an enemy mid-telegraph at the moment of death keeps
    // its aim snapshot of the previous life's jet and fires it into the new
    // one. Measured at 2 unannounced fatal hits in 72 before this line and
    // 0 after (tools/out/combat-r6/final/, 7 seeds x 300 s).
    for (const e of this.spawner.enemies) e.abandonTrain();
    // The flare sprites are driven from enemy.telegraph, so they have to be
    // retired on the same tick or a cleared train leaves a lit muzzle flare
    // hanging on an aircraft that is no longer shooting -- a tell that lies
    // in the other direction.
    this.telegraphs.clear();
    AudioBus.setInboundWarning?.(0);
  }

  clear() {
    this.spawner.clear();
    this.enemyShots.clear();
    this.telegraphs.clear();
    AudioBus.setInboundWarning?.(0);
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

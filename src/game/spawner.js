import { Enemy, APPROACH_SPAWN_DEPTH, FLY_PAST_DEPTH } from '../entities/enemy.js';

// Stage-1 wave choreography.
//
// GAME_SPEC.md §4 "Wave choreography" — MEASURED on stages 1/2/3/4/7:
//
//   * "Stage openers are overtake flights": 2-4 enemies at near-player depth
//     flying AHEAD of the player, rear-aspect with glowing nozzles, receding
//     toward the horizon while weaving; killable from behind (stage 1
//     t94-99). "The prototype has no such pattern; it matters because it is
//     the first thing every stage shows." -> `_openerWave()`.
//   * "Main pattern: head-on echelons of 3-6 from the horizon, loose
//     echelon/V, growing over ~4-6 s ... firing when near-mid depth, then
//     passing the camera" (t113->117, t230->236). -> `_echelonWave()`.
//   * "Occasional near-depth lateral crossers right over the player"
//     (t118-119). -> `_crosserWave()`.
//
// Density pacing ADOPTED (`spawn_pacing.gd`): dispense ONE enemy at a time
// on a 0.2-0.5 s tick with a hard cap on how many are alive, rather than
// dumping a whole wave at once. The on-screen density target is 4-6 visible
// in combat (GAME_SPEC.md §8).
//
// Every random draw here comes from the injected seeded PRNG
// (ARCHITECTURE.md D4) — no Math.random, so `?seed=N` reproduces the same
// waves frame for frame.

// Hard cap on live enemies (ADOPTED `spawn_pacing.gd` "~7"). Set to 6 after
// measurement: at 7 the queue was permanently saturated and the probe read a
// median of 7 on screen for 30 straight seconds, above GAME_SPEC.md §8's
// "4-6 enemies visible in combat". At 6, with the wave gap below, the count
// breathes through the target band instead of pinning at the ceiling.
const MAX_ALIVE = 6;
const DISPENSE_MIN_S = 0.2;
const DISPENSE_MAX_S = 0.5;
// Gap between waves. MEASURED on our own capture, not guessed: the first
// values (2.6-4.2 s, with the next wave's countdown gated on the previous
// wave's queue being empty) produced a median of 2.5 enemies on screen with
// troughs down to 1 over a 20 s run (tools/out/combat-r3-09-density),
// against GAME_SPEC.md §8's density target of 4-6 visible in combat. A wave
// takes 4-6 s to cross, so the gap has to be well under that and the
// countdown has to run continuously — waves must OVERLAP, which is also what
// the arcade does (t113-119 has an echelon mid-approach while crossers pass).
const WAVE_GAP_MIN_S = 1.8;
const WAVE_GAP_MAX_S = 3.2;

// Screen band the horizon-side spawn points sit in. The horizon is at
// 0.6250 H = ndcY -0.250 (game.js's camera pitch); enemies appear just above
// it, matching reference/stage1-level-flight-t116.png where the bracketed
// distant enemy sits at 0.4375 H against a 0.500 H horizon, i.e. ~6%H of
// clear sky above the line.
const SPAWN_NDC_Y = -0.165;

export class Spawner {
  constructor(scene, space, rng) {
    this.scene = scene;
    this.space = space;
    this.rng = rng;
    this.enemies = [];
    this.pending = [];
    this.dispenseTimer = 0;
    this.waveTimer = 0;
    this.waveIndex = 0;
    this.openerDone = false;

    // `?combatsolo=1` — measurement-only: emit exactly ONE head-on fighter
    // at a time, straight up the middle, and do not emit the next until it
    // has retired. The single-subject invariant is the point: with a normal
    // wave on screen, a per-frame width measurement silently mixes two
    // enemies at different depths and manufactures scale jumps that look
    // like a frozen-scale defect but are a segmentation artefact. Never
    // read in normal play.
    this.solo =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('combatsolo');
  }

  get aliveCount() {
    return this.enemies.length;
  }

  // Returns an array of fire requests from enemies that shot this tick.
  update(dt) {
    if (this.solo) return this._updateSolo(dt);
    if (!this.openerDone) {
      this.openerDone = true;
      this.pending.push(...this._openerWave());
    }

    this.dispenseTimer -= dt;
    if (this.pending.length && this.dispenseTimer <= 0 && this.enemies.length < MAX_ALIVE) {
      const cfg = this.pending.shift();
      const e = new Enemy(cfg);
      this.scene.add(e.sprite);
      this.enemies.push(e);
      this.dispenseTimer = DISPENSE_MIN_S + this.rng() * (DISPENSE_MAX_S - DISPENSE_MIN_S);
    }

    // Runs unconditionally, so waves overlap rather than queueing strictly
    // one after another. The alive cap above is what actually limits
    // density; the queue is just a dispensing buffer.
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.pending.push(...this._nextWave());
      this.waveTimer = WAVE_GAP_MIN_S + this.rng() * (WAVE_GAP_MAX_S - WAVE_GAP_MIN_S);
    }

    const fires = [];
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const fired = e.update(dt, this.rng, this.space);
      if (fired) fires.push({ enemy: e, fire: fired });
      if (!e.alive || e.isRetired()) {
        e.retired = true;
        this.scene.remove(e.sprite);
        e.dispose();
        this.enemies.splice(i, 1);
      }
    }
    return fires;
  }

  _updateSolo(dt) {
    if (!this.enemies.length) {
      const e = new Enemy({
        pattern: 'approach',
        type: 'fighter',
        depthA: APPROACH_SPAWN_DEPTH,
        depthB: FLY_PAST_DEPTH,
        // Straight up the middle so the subject never clips a frame edge
        // before reaching fly-past depth, and ends just above the player.
        ndcA: [0, SPAWN_NDC_Y],
        ndcB: [0, 0.1],
        fireDelay: 1e9, // never fires: the harness measures the airframe only
      });
      this.scene.add(e.sprite);
      this.enemies.push(e);
    }
    const e = this.enemies[0];
    e.update(dt, this.rng, this.space);
    if (!e.alive || e.isRetired()) {
      e.retired = true;
      this.scene.remove(e.sprite);
      e.dispose();
      this.enemies.length = 0;
    }
    return [];
  }

  // Remove an enemy immediately (called when something kills it, so the
  // bracket can jump on the same tick the explosion appears).
  remove(enemy) {
    const i = this.enemies.indexOf(enemy);
    if (i >= 0) {
      enemy.retired = true;
      this.scene.remove(enemy.sprite);
      enemy.dispose();
      this.enemies.splice(i, 1);
    }
  }

  _nextWave() {
    this.waveIndex += 1;
    // 3 echelons to 1 crosser pass. The crossers are "occasional" in the
    // measurement, and they are the pattern that most crowds the near field.
    return this.waveIndex % 4 === 0 ? this._crosserWave() : this._echelonWave();
  }

  // --- Stage opener: overtake flight ----------------------------------------
  // Near depth, REAR aspect, receding toward the horizon while weaving.
  _openerWave() {
    const n = 2 + Math.floor(this.rng() * 3); // 2-4
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      out.push({
        pattern: 'overtake',
        type: this.rng() < 0.3 ? 'interceptor' : 'fighter',
        depthA: 9 + this.rng() * 5,
        depthB: APPROACH_SPAWN_DEPTH,
        // Starts spread across the frame near the player's altitude, and
        // converges on the vanishing point as it recedes.
        ndcA: [k * 0.42 + (this.rng() - 0.5) * 0.12, -0.02 + (this.rng() - 0.5) * 0.2],
        ndcB: [k * 0.03, SPAWN_NDC_Y],
        weaveAmp: 0.1 + this.rng() * 0.1,
        weaveRate: 1.4 + this.rng() * 1.1,
        weavePhase: this.rng() * Math.PI * 2,
      });
    }
    return out;
  }

  // --- Main pattern: head-on echelon ---------------------------------------
  _echelonWave() {
    const n = 3 + Math.floor(this.rng() * 4); // 3-6
    // Loose echelon / V: `rake` tilts the formation so it reads as a
    // diagonal line of aircraft rather than a flat row.
    const rake = (this.rng() - 0.5) * 0.9;
    const baseB = (this.rng() - 0.5) * 0.5;
    const baseBy = -0.2 + this.rng() * 0.5;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      out.push({
        pattern: 'approach',
        type: this.rng() < 0.25 ? 'interceptor' : 'fighter',
        depthA: APPROACH_SPAWN_DEPTH * (0.85 + this.rng() * 0.3),
        depthB: FLY_PAST_DEPTH,
        // Spawn points sit in a tight cluster just above the horizon — at
        // 90 units out the whole echelon is a handful of pixels wide, which
        // is how a wave first reads in the arcade.
        ndcA: [k * 0.05 + (this.rng() - 0.5) * 0.02, SPAWN_NDC_Y + k * rake * 0.02],
        // and fans out across the frame on the way in.
        ndcB: [baseB + k * 0.36, baseBy + k * rake * 0.12],
        weaveAmp: this.rng() * 0.05,
        weaveRate: 1.1 + this.rng() * 0.9,
        weavePhase: this.rng() * Math.PI * 2,
        fireDelay: 0.6 + this.rng() * 1.2,
      });
    }
    return out;
  }

  // --- Occasional near-depth lateral crossers -------------------------------
  _crosserWave() {
    const n = 2 + Math.floor(this.rng() * 2); // 2-3
    const dir = this.rng() < 0.5 ? -1 : 1;
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        pattern: 'crosser',
        type: 'interceptor',
        depthA: 30 + this.rng() * 14,
        depthB: 3.0,
        ndcA: [dir * (-0.35 - this.rng() * 0.2), -0.1 + this.rng() * 0.18],
        ndcB: [dir * (1.35 + this.rng() * 0.3), -0.45 + this.rng() * 0.3],
        weaveAmp: 0.03,
        weaveRate: 1.8,
        weavePhase: this.rng() * Math.PI * 2,
        fireDelay: 0.4 + this.rng() * 0.6,
      });
    }
    return out;
  }

  clear() {
    for (const e of this.enemies) {
      this.scene.remove(e.sprite);
      e.dispose();
    }
    this.enemies.length = 0;
    this.pending.length = 0;
  }
}

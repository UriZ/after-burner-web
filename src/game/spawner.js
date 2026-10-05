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

// Hard cap on live enemies. Was 6, chosen to hold GAME_SPEC.md §8's raw
// "4-6 enemies visible in combat" — but the R3 judge RETIRED that criterion
// because it is satisfied by counting dots: our median on-screen count was
// 5 while the median largest enemy spanned 2.0%W. The replacement criterion
// is size-qualified (>=1 enemy at >=10%W in >=60% of combat frames), and a
// 6-enemy cap cannot deliver it: an enemy is only >=10%W for the last
// ~1.4 s of its ~5 s approach, and measurement showed roughly two thirds of
// spawns are shot down before they ever get there. The density is bought
// with POPULATION and arrival spread, deliberately NOT by slowing the
// approach: the near-field growth rate is what keeps the rendered width
// changing every 2-3 frames at readable size, and easing the approach to
// buy dwell would push those plateaus straight back into the frozen-scale
// regime that gap 5 exists to prevent. 6 -> 10 -> 12 -> 14 were each
// measured; see the dev report for the trace.
const MAX_ALIVE = 14;
const DISPENSE_MIN_S = 0.14;
const DISPENSE_MAX_S = 0.34;
// Gap between waves. MEASURED on our own capture, not guessed: the first
// values (2.6-4.2 s, with the next wave's countdown gated on the previous
// wave's queue being empty) produced a median of 2.5 enemies on screen with
// troughs down to 1 over a 20 s run (tools/out/combat-r3-09-density),
// against GAME_SPEC.md §8's density target of 4-6 visible in combat. A wave
// takes 4-6 s to cross, so the gap has to be well under that and the
// countdown has to run continuously — waves must OVERLAP, which is also what
// the arcade does (t113-119 has an echelon mid-approach while crossers pass).
const WAVE_GAP_MIN_S = 0.9;
const WAVE_GAP_MAX_S = 1.6;

// Screen band the horizon-side spawn points sit in. The horizon is at
// 0.6250 H = ndcY -0.250 (game.js's camera pitch); enemies appear just above
// it, matching reference/stage1-level-flight-t116.png where the bracketed
// distant enemy sits at 0.4375 H against a 0.500 H horizon, i.e. ~6%H of
// clear sky above the line.
const SPAWN_NDC_Y = -0.165;

// ---------------------------------------------------------------------------
// FIRE BUDGET. At most this many enemies may have a shot train in the air at
// once, with a minimum gap between train starts.
//
// GAME_SPEC.md §4 calls enemy fire "spaced TRAINS of 4-8", and
// reference/stage7-enemy-shot-train-t330.png shows ONE train crossing the
// frame. Per-enemy timers alone do not bound that: each enemy fires every
// 1.5-2 s independently, so the threat density scales with the population,
// and this round's population went from 6 to 12 to fix combat sparsity. The
// result measured on ?demo=2 was up to 19 shots converging on a
// near-stationary scripted player, who then died at t=2.9 s and again
// within ~2 s of every respawn — the demo spent most of its 33 s dead, with
// combat cleared and frozen.
//
// Bounding TRAINS rather than shots keeps the arcade's shape (a train is
// still 4-8 shots, still spaced) while making threat density independent of
// how many aircraft are on screen, which is the property that has to hold
// as the population is tuned for the size-qualified density criterion.
//
// 2 trains, 2.72 s apart. The committed build was 1 every 2.2 s, reached by
// cutting the train rate until the death rate came down; R4 gap 5 forbids
// that direction explicitly ("the fix should be lead/accuracy and hit-box,
// not fewer shots"), and it did not work anyway. An interim attempt in the
// OTHER direction — 3 trains every 0.9 s — is the one worth explaining,
// because it looked right and measured wrong.
//
// The train count is the number of INDEPENDENT DECISIONS about where the
// player is. Every round inside one train shares a single aim snapshot and
// they all arrive inside ~0.8 s of each other, so a train either misses
// wholesale or produces a death; eight rounds in one train are barely more
// dangerous than one. Rounds per minute, which is what R4 gap 5 forbids
// cutting, is train count x train length — so the lethality can be taken out
// of the first factor and put back into the second at constant volume. That
// is the whole trade: FEWER, LONGER, TIGHTER trains.
//
// Raising the train rate instead (3 every 0.9 s) tripled the number of
// independent snapshots and the death rate did not move: 5.00/min against
// the committed 5.44/min, with the per-round hit rate pinned at ~10% in both.
// The intuition it was built on — "more fire, each round individually less
// likely to land, so a continuous readable presence instead of rare lethal
// walls" — is right about presence and wrong about lethality, because
// presence is carried by rounds and lethality by snapshots.
//
// Shot presence is preserved by the other two levers: SHOT_SPACING_S 0.08 s
// and a fixed 8-round train keep 8 fireballs in the air per train, each in
// flight for 1.3-3.1 s (enemyShots.js at 15 units/s over the 52..24 firing
// band). Two overlapping trains therefore put 10-16 fireballs on screen,
// which is what reference/stage7-enemy-shot-train-t330.png actually shows.
//
// 2.72 s and not a round number: it is SET BY MEASUREMENT, to hold rounds
// per minute at the committed build's ~117. At 2.4 s the same geometry
// delivered 138.1 rounds/min, i.e. 18% MORE fire than the build this round
// has to beat — which would have made the death-rate comparison flattering
// and meaningless; at 2.85 s, once the stage-opener re-arm below put
// non-firing overtake flights back into the MAX_ALIVE budget, it fell to
// 112.1 and read as a 4% volume CUT. Re-measure and re-set this whenever the
// firing band, the shot spacing, the train length or the alive budget moves
// — it is downstream of all four.
const MAX_CONCURRENT_TRAINS = 2;
const TRAIN_START_GAP_S = 2.72;

// ---------------------------------------------------------------------------
// ROLE MIX PER STAGE — how much of each stage's sky is the elite livery.
//
// `role` is a VISUAL identity and is deliberately independent of `type`,
// which is the flight model (see src/entities/enemy.js's LIVERY_BY_STAGE
// note). They used to be the same axis and that was a real defect: two wave
// builders independently prefer the fast `interceptor` TYPE for pacing
// reasons — every crosser is one because a near-field lateral pass wants to
// be quick, and echelons rolled one in four — so once the sprite lane's
// authored art landed, a third of stage 1 was rust-red delta airframes. The
// lead's capture `tools/out/dash-r5/s1-combat/frame-0000.png` has four of
// them against one grey. Stage 1's arcade cast is slender swept grey jets.
//
// The fractions are a DIFFICULTY-AND-IDENTITY ramp, not a measurement: the
// arcade gives us single timestamps for each livery (GAME_SPEC.md §4, t102.5
// and t172 for interceptors) and no per-stage census, so this is ADOPTED. It
// is chosen so every stage shows BOTH silhouette families — the `mig` line
// aircraft and the `delta` elite — which is what R4 gap 1 criterion (d)
// asks for, while keeping each stage's dominant colour the one the frames
// show.
const ELITE_FRACTION_BY_STAGE = [0.12, 0.22, 0.30];

// Crossers are near-field lateral passes and the most visually prominent
// single aircraft in any frame, so they carry a higher elite share than the
// echelon line — one red delta crossing right over the player reads as the
// stage's elite without tinting the whole sky.
const CROSSER_ELITE_BONUS = 0.18;

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
    // Which stage's liveries the enemies wear. Set by Combat.setStageIndex;
    // defaults to stage 1, which is what every judge capture is taken on.
    // src/entities/enemy.js owns the stage -> livery mapping.
    this.stageIndex = 0;

    this.trainGapTimer = 0;
    this.trainsStarted = 0;
    this.solo =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('combatsolo');
  }

  get aliveCount() {
    return this.enemies.length;
  }

  setStageIndex(stageIndex) {
    // A STAGE CHANGE RE-ARMS THE OPENER, and this is load-bearing rather
    // than tidy.
    //
    // GAME_SPEC.md §4 is explicit that the overtake flight is "the first
    // thing every stage shows" — not just the first stage — and cites it on
    // stages 1, 2 and 4 (t94-99, t126-128, t204). The re-arm used to live in
    // clear(), which src/game/flow/ called at every stage boundary. R5's
    // game-feel work correctly stopped clearing combat at stage boundaries
    // and on death (clearing the sky was our addition, not the arcade's), and
    // that silently took the opener with it: MEASURED on this build before
    // the fix, `?fixed=1&demo=2&seed=1` ran 90 s across three stages and
    // produced overtake aircraft ONLY in the first 5 s of stage 1 — stages 2
    // and 3 opened with no opener at all. It also meant stage 2's silver/blue
    // prop livery never appeared, because the opener is the only wave that
    // wears it; a 3-seed livery census read 0.0% prop.
    //
    // Keying the re-arm to the stage index instead makes this file own its
    // own invariant rather than depending on another lane's call order.
    // `contentStageIndex` wraps 0,1,2,0,... so a lap re-arms correctly too.
    if (stageIndex !== this.stageIndex) this.openerDone = false;
    this.stageIndex = stageIndex;
  }

  // Visual role for one aircraft. `roll` is a draw the caller has ALREADY
  // made unconditionally — passing it in rather than drawing here is the
  // CLAUDE.md shared-PRNG rule: a draw that only sometimes happens shifts
  // every later draw in the stream and makes seeds incomparable between
  // builds.
  _roleFor(roll, bonus = 0) {
    const f = (ELITE_FRACTION_BY_STAGE[this.stageIndex] ?? ELITE_FRACTION_BY_STAGE[0]) + bonus;
    return roll < f ? 'elite' : 'line';
  }

  // Returns an array of fire requests from enemies that shot this tick.
  // `playerNdc` is forwarded to each enemy so it can snapshot an aim point
  // when its telegraph lights (src/entities/enemy.js).
  update(dt, playerNdc = null) {
    if (this.solo) return this._updateSolo(dt);
    if (!this.openerDone) {
      this.openerDone = true;
      // The opener is the overtake flight PLUS a primed head-on element
      // already part-way in. Without the primed element the stage opens with
      // nothing at readable size for ~5 s: the overtake flight recedes from
      // the moment it appears, and a head-on echelon spawned at the horizon
      // needs its full ~5 s approach before it is large. Measured as a 4.9 s
      // dead patch at the head of every run. The arcade's stage 1 is engaged
      // within a couple of seconds (t94-99).
      // Primed element FIRST in the queue. Dispensing is one aircraft every
      // 0.14-0.34 s, so queueing the 2-4 overtake aircraft ahead of it
      // delayed the primed element by up to 1.4 s on top of its own ~2 s
      // approach — measured as a 3.9 s hole starting at t=0.9 s, right after
      // the openers recede past readable size.
      this.pending.push(...this._primedEchelon(), ...this._openerWave());
    }

    this.dispenseTimer -= dt;
    if (this.pending.length && this.dispenseTimer <= 0 && this.enemies.length < MAX_ALIVE) {
      const cfg = this.pending.shift();
      // Stamped at dispense rather than at wave construction: a wave can sit
      // in `pending` across a stage boundary, and an aircraft should wear the
      // livery of the stage it actually flies into.
      const e = new Enemy({ ...cfg, stageIndex: this.stageIndex });
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

    this.trainGapTimer -= dt;
    const trainsActive = this.enemies.reduce((n, e) => n + (e.firingTrain ? 1 : 0), 0);
    let allowNewTrain = trainsActive < MAX_CONCURRENT_TRAINS && this.trainGapTimer <= 0;

    const fires = [];
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const wasFiring = e.firingTrain;
      const fired = e.update(dt, this.rng, this.space, allowNewTrain, playerNdc);
      if (!wasFiring && e.firingTrain) {
        // This enemy just opened a train — consume the budget for this tick
        // and start the spacing gap.
        allowNewTrain = false;
        this.trainGapTimer = TRAIN_START_GAP_S;
        // Cumulative, measurement-only (combat.js's __fairness hook). A
        // train now opens with its TELEGRAPH, so this is also the count of
        // flares lit.
        this.trainsStarted += 1;
      }
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
    // Every third wave is a crosser pass rather than every fourth: crossers
    // are near-field by construction and are the cheapest way to keep a
    // readable-size aircraft on screen between echelon arrivals.
    const specs = this.waveIndex % 3 === 0 ? this._crosserWave() : this._echelonWave();
    // WAVE IDENTITY, measurement only — nothing in the simulation branches on
    // it. Needed because "the enemies arrive in a single-file diagonal queue"
    // is a statement about a FORMATION, and a formation is a property of one
    // wave. Measured over the pooled live population it is meaningless: 3-5
    // waves are in flight at once by construction (WAVE_GAP 0.9-1.6 s against
    // a ~5 s approach), so the pooled depth spread reads 17x max/min no matter
    // how tight each formation is. That is the I9/I26 defect class — a correct
    // operator pointed at the wrong population — so the population is made
    // addressable instead of inferred.
    for (const s of specs) s.waveId = this.waveIndex;
    return this._shuffleDispenseOrder(specs);
  }

  // THE SINGLE-FILE DIAGONAL QUEUE, and why it was structural rather than a
  // tuning error.
  //
  // Measured (3 seeds, ?fixed=1&demo=1&invincible=1, every 4 ticks, 7 944
  // flight samples, 85 waves, 15 089 per-wave observations): WITHIN one wave
  // the absolute correlation between a member's depth and its screen x had
  // median 0.85, p75 0.94, and 59.3 % of observations above 0.8. A wave was
  // therefore a line of aircraft running diagonally away from the camera,
  // which is exactly the complaint.
  //
  // The cause is not the formation geometry — `depthA` is drawn independently
  // per member (0.70-1.20 x spawn depth) and is not monotonic in member index.
  // It is the DISPENSE ORDER. `pending` is a FIFO drained one aircraft every
  // 0.14-0.34 s, so member i enters the world i dispense-ticks before member
  // i+1 and has that much more depth travel behind it: depth becomes monotonic
  // in i. And i maps monotonically to the lateral slot (`ndcB: baseB + k*0.26`
  // with k = i - (n-1)/2). Two monotonic maps through the same index compose
  // into a perfect depth-vs-screen-x ordering, every wave, in the same
  // direction.
  //
  // So the fix is to break the composition, not the geometry: shuffle the
  // order the members are HANDED TO THE DISPENSER, leaving every member's
  // spec — fan-out, rake, depth spread, bomber slot, liveries — byte for byte
  // unchanged. The leading aircraft is now at a random lateral slot.
  //
  // Deliberately NOT done by compressing the depth spread, which is the other
  // way to make a wave read as a formation. That spread is what buys the
  // size-qualified density criterion (>=1 enemy at >=10%W in >=60% of combat
  // frames); it measures 84.87 % on this tree, and the comment on `depthA`
  // records that an earlier, tighter spread measured 53 %. Spending measured
  // headroom on an unmeasured impression is the trade this project has
  // retired four criteria for.
  //
  // PRNG: n-1 draws, taken unconditionally for every wave, after the wave is
  // fully built — so it cannot desynchronise draws WITHIN a wave (CLAUDE.md,
  // "Shared PRNG stream sequencing"). It does shift the stream relative to
  // older builds, so seed-for-seed comparisons against figures taken before
  // this landed are not valid; the A/B in judging/R5/lane-combatfx.md was
  // re-taken after it.
  _shuffleDispenseOrder(specs) {
    for (let i = specs.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const t = specs[i];
      specs[i] = specs[j];
      specs[j] = t;
    }
    return specs;
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
        // Openers start CLOSE and recede slowly. They are the only thing on
        // screen for the first few seconds (the first head-on echelon needs
        // ~5 s to arrive), so if they start small and shrink there is a cold
        // open with nothing readable in frame — measured as a 4.9 s gap at
        // the head of every run.
        depthA: 4 + this.rng() * 3,
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

  // Head-on element seeded part-way through its approach, used only at
  // stage open. Spawn depths are far enough out that each member still
  // appears at 2-4 native px and grows in — no pop-in at readable size.
  _primedEchelon() {
    const n = 3;
    const baseB = (this.rng() - 0.5) * 0.3;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      out.push({
        pattern: 'approach',
        type: 'fighter',
        role: 'line',
        depthA: 18 + this.rng() * 16,
        depthB: FLY_PAST_DEPTH,
        ndcA: [k * 0.06, SPAWN_NDC_Y + 0.02],
        ndcB: [baseB + k * 0.24, -0.05 + this.rng() * 0.3],
        weaveAmp: this.rng() * 0.04,
        weaveRate: 1.1 + this.rng() * 0.9,
        weavePhase: this.rng() * Math.PI * 2,
        // The primed element NEVER fires, and now by geometry rather than by
        // a long timer. It spawns at depth 18-34 and the firing band's floor
        // is 24 (src/entities/enemy.js), so after the 1.0 s telegraph it is
        // at depth 8.8-16.7 — under the floor — whatever this delay says.
        // Kept explicit and large so the intent survives a band retune: a
        // stage opens with aircraft to shoot at, not with a train already
        // inbound (GAME_SPEC.md §4's opener is an overtake flight the player
        // kills from behind), and the old 0.9-1.7 s delay here was measured
        // killing the player at t=1.4-1.7 s on all five seeds.
        fireDelay: 1e9,
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
    const baseB = (this.rng() - 0.5) * 0.36;
    const baseBy = -0.2 + this.rng() * 0.5;
    // ONE bomber leads roughly every third echelon (R4 gap 10, "enemy
    // variety"). GAME_SPEC.md §4 names the type — "much larger dark airframe
    // at close depth that drops a round black bomb ... AND fires shot trains"
    // (stage 7, t318) — and ENEMY_TYPES has carried its 1.35x width and 2 hp
    // since R3, but nothing ever spawned one, so every aircraft in the game
    // was a fighter or an interceptor at the same size. A bomber reads as a
    // different aircraft at a glance purely on span, which is the part of
    // "at least two distinguishable silhouettes" this lane can deliver
    // without touching enemySprite.js.
    //
    // Drawn ONCE per wave, outside the member loop, deliberately: CLAUDE.md's
    // shared-PRNG rule — a conditional draw inside the loop would shift every
    // later draw by a different amount depending on how many members a wave
    // happens to have, which makes seeds incomparable between builds.
    const bomberSlot = this.rng() < 0.34 ? Math.floor(this.rng() * n) : -1;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      // The type draw happens unconditionally and is then overridden, rather
      // than being skipped for the bomber slot: a draw that only sometimes
      // happens desynchronises every later draw in the stream (CLAUDE.md,
      // "Shared PRNG stream sequencing").
      const roll = this.rng();
      // Second unconditional draw, for the VISUAL role. Separate from the
      // type roll above on purpose: a fast interceptor-type aircraft in a
      // stage-1 echelon should usually still be a grey MiG.
      const roleRoll = this.rng();
      out.push({
        pattern: 'approach',
        type: i === bomberSlot ? 'bomber' : roll < 0.25 ? 'interceptor' : 'fighter',
        // A bomber is the 'heavy' role whatever it rolled — it is already
        // visually distinct on span (1.35x) and should read as the line's
        // own big aircraft, not as an elite.
        role: i === bomberSlot ? 'heavy' : this._roleFor(roleRoll),
        // Wide per-member depth spread. At the previous 0.85-1.15 the whole
        // echelon reached the near field inside ~1.5 s of itself, so the
        // readable-size window arrived as a CLUMP followed by a gap: the
        // measured trace was 1-3 s of "big enemy present" alternating with
        // gaps of up to 4.9 s, and only 53% of frames had an enemy >=10%W
        // even with 10 alive. 0.60-1.30 strings a single echelon's arrivals
        // out over ~1.1 s of extra depth travel on top of the dispense
        // stagger — which is also what a LOOSE echelon is (GAME_SPEC.md §4),
        // aircraft at different ranges, not line abreast.
        depthA: APPROACH_SPAWN_DEPTH * (0.70 + this.rng() * 0.50),
        depthB: FLY_PAST_DEPTH,
        // Spawn points sit in a tight cluster just above the horizon — at
        // 90 units out the whole echelon is a handful of pixels wide, which
        // is how a wave first reads in the arcade.
        ndcA: [k * 0.05 + (this.rng() - 0.5) * 0.02, SPAWN_NDC_Y + k * rake * 0.02],
        // and fans out across the frame on the way in.
        ndcB: [baseB + k * 0.26, baseBy + k * rake * 0.12],
        weaveAmp: this.rng() * 0.05,
        weaveRate: 1.1 + this.rng() * 0.9,
        weavePhase: this.rng() * Math.PI * 2,
        // SHORT first-fire delay, 0.1-0.4 s — down from 1.6-3.0 s, and the
        // reversal is forced by the telegraph geometry, not a difficulty
        // choice.
        //
        // An approach aircraft lives 5.0 s from depth 90 and the firing band
        // is 52..24 (src/entities/enemy.js), i.e. it is eligible to fire only
        // between t=0.77 s and t=1.86 s of its own life. A 1.6-3.0 s delay
        // therefore means the aircraft becomes willing to fire at a depth it
        // is already forbidden to fire from: measured, every flare lit at
        // depth 18-22 and 148 trains across 180 s delivered 12 rounds.
        // The delay has to be short enough that the flare — which itself
        // takes TELEGRAPH_S = 1.0 s — can light while the aircraft is still
        // above the band.
        //
        // What the old long delay was protecting against is now handled by
        // the flare rather than by silence: its comment was about a train
        // arriving within a second of the 2 s respawn invincibility expiring.
        // A train that opens with a 1.0 s pulsing flare and then needs
        // another 0.9-2.1 s of flight is announced ~2-3 s ahead, which is
        // longer than the grace window it was being hidden behind.
        fireDelay: 0.0 + this.rng() * 0.15,
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
      const roleRoll = this.rng();
      out.push({
        pattern: 'crosser',
        type: 'interceptor',
        role: this._roleFor(roleRoll, CROSSER_ELITE_BONUS),
        depthA: 30 + this.rng() * 14,
        depthB: 3.0,
        // ndcB was dir*(1.35..1.65) — far enough off-frame that a crosser
        // left the visible area BEFORE it reached its fly-past depth.
        // Measured: only 20% of crossers ever rendered at >=10%W on screen,
        // median peak 5.9%W, so the pattern that is supposed to put a big
        // aircraft right over the player was contributing 3.2 enemy-seconds
        // of readable size out of 36 across a 33 s run. 0.80..1.00 keeps the
        // fly-past inside the frame and still exits the side afterwards.
        ndcA: [dir * (-0.45 - this.rng() * 0.2), -0.1 + this.rng() * 0.18],
        ndcB: [dir * (0.55 + this.rng() * 0.20), -0.40 + this.rng() * 0.3],
        weaveAmp: 0.03,
        weaveRate: 1.8,
        weavePhase: this.rng() * Math.PI * 2,
        // Crossers also no longer fire in practice, and this is a KNOWN
        // consequence of the band retune rather than an intent: they spawn at
        // depth 30-44 as interceptors (depth rate 0.8862), so 1.0 s of
        // telegraph puts them at depth 12-18, under the 24 floor. Left as it
        // is because GAME_SPEC.md §4 describes the crosser as a near-depth
        // fly-past pattern and says nothing about it firing, and because the
        // alternative — a pattern that fires from inside the floor — is the
        // point-blank case the floor exists to forbid. Recorded in
        // judging/R5/lane-combatfx.md as a volume source given up.
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
    // Re-arm the opener. clear() is called at every stage boundary (and on
    // death) by src/game/flow/, and GAME_SPEC.md §4 is explicit that the
    // overtake flight is "the first thing every stage shows" — not just the
    // first. Leaving openerDone latched meant every stage after the first
    // rebuilt its sky from empty with no opener and no primed element, which
    // is a multi-second dead patch exactly where the arcade is busiest.
    this.openerDone = false;
    this.waveTimer = 0;
    this.dispenseTimer = 0;
  }
}

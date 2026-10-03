import { Score, HIT_VALUE } from '../score.js';
import { DeathSequence } from './deathSequence.js';
import { drawTitleScreen } from './titleScreen.js';
import { drawReadyCard, drawTallyCard, drawContinueCard } from './cards.js';
import { Overlay } from './overlay.js';
import { STAGES } from '../stage.js';
import { AudioBus } from '../../audio/index.js';

// Game state machine (R4): title -> flight -> death -> flight -> ... ->
// continue (out of lives) -> flight. See GAME_SPEC.md's §§2,5,6,7 for the
// measured behaviour each transition reproduces; cited inline below.
//
// DESIGN NOTE on the stage-end tally (GAME_SPEC.md §6 / REFERENCE.md
// "Transient HUD overlays"): reference/stage2-start-bonus-tally-t124.png
// shows the tally card overlaid on ALREADY-RESUMED live combat (enemies,
// lock brackets, a banking jet) for the new stage — it is not a blocking
// screen. So `tally` here is a timed OVERLAY that coexists with the
// 'flight' state, not a separate blocking state; the stage switch (palette,
// HIT reset) happens immediately when the old stage's timer expires, and
// the card plays out over the following ~1-2s while flight continues
// uninterrupted underneath it.
//
// Lives: start 3 (ASSUMED in GAME_SPEC.md §2, dip-switch configurable in
// the arcade, not derivable from available footage).
const START_LIVES = 3;

// Per-stage flight duration. REFERENCE.md's verified stage map gives exact
// spans for stages 1-3 (88-120, 124-156, 160-196s = 32/32/36s); "Prefer the
// measured per-stage durations" (GAME_SPEC.md §5).
const STAGE_DURATIONS_S = [32, 32, 36];

const TITLE_TIMEOUT_S = 8; // unattended fallback so a capture without input still reaches flight
const TALLY_HITS_PER_S = 7; // REFERENCE.md: tally counts "~7 hits/s"
const CONTINUE_COUNTDOWN_S = 10; // gp t261: "CONTINUE PLAY / 10 / INSERT COIN"

// Post-respawn grace window (R4 blocker fix, combat-dev report: an
// un-grace'd demo lost all 3 lives in 24s, making 30s density captures
// unmeasurable). GAME_SPEC.md §2: no visible invincibility flash in any of
// the 4 measured arcade deaths, but the prototype's 2s window is explicitly
// ADOPTED "as a usability choice, not arcade-verified" — this is that
// window, re-applied here since it was never wired up when death/respawn
// first landed.
const RESPAWN_INVINCIBLE_S = 2.0;

const ZERO_INPUT = { x: 0, y: 0, fire: false, missile: false };

export class GameFlow {
  constructor({ player, combat, hudState, sky, ground, demoActive }) {
    this.player = player;
    this.combat = combat;
    this.hudState = hudState;
    this.sky = sky;
    this.ground = ground;

    this.score = new Score();
    this.deathSeq = combat ? new DeathSequence(player, combat) : null;

    this.titleOverlay = new Overlay();
    this.cardOverlay = new Overlay();

    this.stageIndex = 0;
    this.lives = START_LIVES;
    this.stageTimer = 0;
    this.tally = null; // { t, duration, hits, pointsStart }
    this.continueCountdown = 0;
    this.titleTimer = 0;
    this.invincibleTimer = 0;
    this._readyAudioPlayed = false;

    // `?demo=1` (main.js) already drives a scripted input timeline for
    // unattended capture — skip the title screen entirely so that existing
    // capture workflow is unaffected, same as before this round.
    // `?forcedeath=S` — measurement-only: trigger a death at sim time S
    // seconds into flight, for deterministic `?fixed=1` capture of the
    // death/respawn sequence without needing a live hit. Never read in
    // normal play.
    // `?invincible=1` — measurement-only (combat-dev's R4 blocker report):
    // suppresses every player-hit death for the WHOLE run, the standard
    // "set_capture_invincible" pattern for live-capture verification that
    // isn't itself testing death — lets a density/combat capture run
    // 30s+ uninterrupted instead of losing 3 lives in the first 24s to the
    // normal hit-test. Never read in normal play.
    const params = new URLSearchParams(location.search);
    this._forceDeathAt = params.has('forcedeath') ? Number(params.get('forcedeath')) : null;
    this._forcedDeathDone = false;
    this._debugInvincible = params.has('invincible');

    if (demoActive) {
      this.state = 'flight';
      this._enterStage(0);
    } else {
      this.state = 'title';
      this._redrawTitle();
      AudioBus.music('title');
    }

    // `?debugtally=1` — measurement-only: the real tally plays out over
    // hits/7 seconds (often under 1s at low hit counts) while flight
    // continues underneath it, which makes it awkward to land in any one
    // captured frame deterministically. Forces a representative tally
    // (8 hits / 160,000 pts, matching reference/stage2-start-bonus-tally-
    // t124.png) visible immediately and held open (not counted down) so a
    // single `?fixed=1` capture can verify its layout. Never read in normal
    // play.
    if (params.has('debugtally')) {
      this.cardOverlay.visible = true;
      this.cardOverlay.redraw((ctx, w, h) =>
        drawTallyCard(ctx, w, h, { hitShown: 8, pointsShown: 160000, nextStage: this.stageIndex + 2 })
      );
    }
  }

  _redrawTitle() {
    this.titleOverlay.redraw((ctx, w, h) => drawTitleScreen(ctx, w, h, 0));
  }

  _enterStage(index) {
    this.stageIndex = index;
    this.stageTimer = 0;
    const stage = STAGES[this.stageIndex % STAGES.length];
    // scaffold-dev's R4 interface (src/render/sky.js / ground.js): each
    // mesh carries its own setStage(), updating every stage-dependent
    // uniform in place — no mesh/material recreation for a live transition.
    this.sky.setStage(stage);
    this.ground.setStage(stage);
    this.hudState.stage = this.stageIndex + 1;
    if (this.combat) this.combat.hits = 0; // HIT resets at stage start, and ONLY there (GAME_SPEC.md §6)
  }

  get scrollSpeed() {
    return STAGES[this.stageIndex % STAGES.length].scrollSpeed;
  }

  // `rawInput` is whatever main.js/game.js resolved this tick (live keys or
  // the ?demo=1 timeline). Returns `{ input, combatActive, playerControlled }`
  // for game.js's update() to drive Player/Combat with.
  update(dt, rawInput, simTime, rng) {
    let result;
    switch (this.state) {
      case 'title':
        result = this._updateTitle(dt, rawInput);
        break;
      case 'death':
        result = this._updateDeath(dt);
        break;
      case 'continue':
        result = this._updateContinue(dt);
        break;
      default:
        result = this._updateFlight(dt, rawInput, simTime, rng);
        break;
    }
    this.hudState.score = Math.floor(this.score.value);
    return result;
  }

  _updateTitle(dt, rawInput) {
    this.titleTimer += dt;
    this.titleOverlay.visible = true;
    this.cardOverlay.visible = false;
    if (rawInput.fire || rawInput.missile || this.titleTimer >= TITLE_TIMEOUT_S) {
      this.state = 'flight';
      this.titleOverlay.visible = false;
      this.score.reset();
      this.lives = START_LIVES;
      if (this.combat) this.combat.clear();
      this._enterStage(0);
      AudioBus.play('menuStart');
      AudioBus.music('flight');
    }
    return { input: ZERO_INPUT, combatActive: false, playerControlled: false };
  }

  _updateFlight(dt, rawInput, simTime, rng) {
    this.titleOverlay.visible = false;
    this.score.accrue(dt, false);
    this.stageTimer += dt;
    AudioBus.setEngine(this.hudState.throttleFraction ?? 0.6);

    if (this.invincibleTimer > 0) this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    const invincible = this._debugInvincible || this.invincibleTimer > 0;

    if (this.combat) {
      if (this._forceDeathAt !== null && !this._forcedDeathDone && simTime >= this._forceDeathAt) {
        this._forcedDeathDone = true;
        this._triggerDeath(rng);
      } else if (this.combat.checkPlayerHit(this.combat.playerNdc, invincible)) {
        this._triggerDeath(rng);
      }
    }

    if (this.state === 'flight' && this.stageTimer >= STAGE_DURATIONS_S[this.stageIndex % STAGE_DURATIONS_S.length]) {
      this._startTally();
    }

    this._updateTally(dt);

    if (this.state !== 'flight') {
      // A death trigger fired above this tick; let the caller see it
      // immediately instead of running one more combat tick in 'flight'.
      return { input: ZERO_INPUT, combatActive: false, playerControlled: false };
    }
    return { input: rawInput, combatActive: true, playerControlled: true };
  }

  _triggerDeath(rng) {
    this.lives -= 1;
    this.state = 'death';
    this.cardOverlay.visible = false;
    this._readyAudioPlayed = false;
    if (this.combat) this.combat.clear();
    if (this.deathSeq) this.deathSeq.start(rng);
    AudioBus.play('playerDeath');
    AudioBus.stopEngine();
  }

  _updateDeath(dt) {
    const done = this.deathSeq ? this.deathSeq.update(dt) : true;
    this.score.accrue(dt, true); // frozen while dead (GAME_SPEC.md §2)
    const readyPhase = this.deathSeq ? this.deathSeq.readyPhase : null;
    if (readyPhase !== null) {
      this.cardOverlay.visible = true;
      this.cardOverlay.redraw((ctx, w, h) => drawReadyCard(ctx, w, h, readyPhase));
      if (!this._readyAudioPlayed) {
        this._readyAudioPlayed = true;
        AudioBus.play('respawnReady');
      }
    } else {
      this.cardOverlay.visible = false;
    }
    if (done) {
      this.cardOverlay.visible = false;
      if (this.lives > 0) {
        this.state = 'flight';
        this.invincibleTimer = RESPAWN_INVINCIBLE_S;
        AudioBus.music('flight');
      } else {
        this.state = 'continue';
        this.continueCountdown = CONTINUE_COUNTDOWN_S;
      }
    }
    return { input: ZERO_INPUT, combatActive: false, playerControlled: false };
  }

  _updateContinue(dt) {
    this.score.accrue(dt, true); // frozen (same family as death/resupply pauses)
    this.continueCountdown -= dt;
    this.cardOverlay.visible = true;
    this.cardOverlay.redraw((ctx, w, h) => drawContinueCard(ctx, w, h, this.continueCountdown));
    if (this.continueCountdown <= 0) {
      // "Continuing resumes IN PLACE — same stage — with the score reset to
      // ~0" (GAME_SPEC.md §2). Lives restore so play can continue;
      // unattended captures/judges never dead-end on a game-over screen.
      this.cardOverlay.visible = false;
      this.score.reset();
      this.lives = START_LIVES;
      if (this.combat) this.combat.clear();
      this.state = 'flight';
      // Extension beyond GAME_SPEC (not arcade-measured, same reasoning as
      // the respawn grace window): a continue drops the player back into a
      // stage that may already be mid-wave, so the same fairness grace
      // applies.
      this.invincibleTimer = RESPAWN_INVINCIBLE_S;
      AudioBus.music('flight');
    }
    return { input: ZERO_INPUT, combatActive: false, playerControlled: false };
  }

  _startTally() {
    const hits = this.combat ? this.combat.hits : 0;
    this.tally = {
      t: 0,
      duration: Math.max(1, hits / TALLY_HITS_PER_S),
      hits,
      pointsStart: this.score.value,
      lastHitShown: 0,
    };
    this.score.add(hits * HIT_VALUE);
    this._enterStage(this.stageIndex + 1); // palette + HIT reset happen immediately; see class header
  }

  _updateTally(dt) {
    if (!this.tally) return;
    this.tally.t += dt;
    const q = Math.min(1, this.tally.t / this.tally.duration);
    const hitShown = Math.round(this.tally.hits * q);
    const pointsShown = Math.round(this.tally.pointsStart + this.tally.hits * HIT_VALUE * q);
    // One tick per HIT increment (audio-dev's ask), not once for the whole
    // card — a tick can jump by more than 1 at low hit counts/high dt, so
    // loop rather than assume +1.
    for (let i = this.tally.lastHitShown; i < hitShown; i++) AudioBus.play('tallyTick');
    this.tally.lastHitShown = hitShown;
    this.cardOverlay.visible = true;
    this.cardOverlay.redraw((ctx, w, h) =>
      drawTallyCard(ctx, w, h, { hitShown, pointsShown, nextStage: this.stageIndex + 1 })
    );
    if (q >= 1) {
      this.tally = null;
      this.cardOverlay.visible = false;
    }
  }
}

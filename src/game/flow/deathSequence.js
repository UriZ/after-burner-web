// Death/respawn animation. GAME_SPEC.md §2 (MEASURED across 4 arcade death
// instances, gp t198-218 cleanest, full cycle ~8-9s):
//   hit -> fireball grows around the jet, jet silhouette still visible
//   (~0.5-1s) -> screen-filling multi-lobe starburst (~60%W, ~1s) -> the
//   burnt dark-red hulk tumbles AWAY from the camera, shrinking toward the
//   horizon, screen otherwise empty of the player (~3-4s, world keeps
//   scrolling) -> respawn: jet slides in from the BOTTOM at OVERSIZED scale
//   with blazing afterburners + "READY" card, shrinking to normal (~2s).
//
// Reuses combat.explosions (src/effects/explosions.js) for the fireball and
// starburst rather than new art — its lobe/spike construction already
// matches reference/death-starburst-gp-t202.png's boiling multi-lobe shape;
// scale alone takes it from a normal kill explosion to screen-filling.
//
// The "shrinking toward the horizon" during tumble is NOT an explicit scale
// animation — it is the real PerspectiveCamera doing what every other
// object in this build relies on it for (ARCHITECTURE.md D2): pushing the
// sprite's world Z further from the camera makes it recede AND converge
// toward the horizon row for free, the same perspective math screenSpace.js
// documents. Only rotation (tumbling) and a dark-red tint (burnt) are
// authored on top.
const FIREBALL_S = 0.6;
const STARBURST_S = 1.0;
const TUMBLE_S = 4.5;
const RESPAWN_S = 2.4;
export const DEATH_TOTAL_S = FIREBALL_S + STARBURST_S + TUMBLE_S + RESPAWN_S; // 8.5s, inside the measured 8-9s band

const TUMBLE_SPIN_RAD_PER_S = 2.2;
const TUMBLE_Z_DRIFT = -40; // world units; player baseZ=-5 (depth 5) -> ~45 at tumble end, mid enemy-depth range
const RESPAWN_OVERSIZE = 1.9; // "larger than normal flight" (GAME_SPEC.md §2)
const RESPAWN_DROP = 2.4; // world-Y below baseY the jet slides in from (bottom of frame)
const BURNT_TINT = [0.55, 0.12, 0.08];

export class DeathSequence {
  constructor(player, combat) {
    this.player = player;
    this.combat = combat;
    this.active = false;
    // Sprite scale is set once in spriteFactory.js and never touched by
    // Player.update() — captured here so tumble/respawn can scale relative
    // to the authored jet size without hardcoding JET_WORLD_WIDTH.
    this._origScaleX = player.sprite.scale.x;
    this._origScaleY = player.sprite.scale.y;
  }

  start(rng) {
    this.active = true;
    this.phase = 'fireball';
    this.t = 0;
    this._rng = rng;
    this._spawned = false;
  }

  // READY card colour phase (GAME_SPEC.md §2: "yellow, then cyan"), null
  // outside the respawn phase. Consumed by game.js to drive cards.js.
  get readyPhase() {
    return this.phase === 'respawn' ? this.t / RESPAWN_S : null;
  }

  // Returns true the tick the sequence completes (control resumes).
  update(dt) {
    if (!this.active) return false;
    this.t += dt;
    const s = this.player.sprite;
    switch (this.phase) {
      case 'fireball':
        if (!this._spawned) {
          this._spawned = true;
          this.combat.explosions.spawn(s.position, this.combat.playerNdc.depth, this._rng, 1.1);
        }
        if (this.t >= FIREBALL_S) {
          this.phase = 'starburst';
          this.t = 0;
          this._spawned = false;
        }
        break;

      case 'starburst':
        if (!this._spawned) {
          this._spawned = true;
          // ExplosionField's PEAK_FRAC is 0.225 at scale 1, so ~2.7 reaches
          // the measured ~60%W screen-filling size.
          this.combat.explosions.spawn(s.position, this.combat.playerNdc.depth, this._rng, 2.7);
          s.visible = false; // the jet reads as GONE inside this lobe, unlike the fireball phase
        }
        if (this.t >= STARBURST_S) {
          this.phase = 'tumble';
          this.t = 0;
          s.visible = true;
          s.material.color.setRGB(...BURNT_TINT);
          this._tumbleStart = s.position.clone();
        }
        break;

      case 'tumble': {
        const q = Math.min(1, this.t / TUMBLE_S);
        s.position.z = this._tumbleStart.z + TUMBLE_Z_DRIFT * q;
        s.position.y = this._tumbleStart.y + Math.sin(this.t * 3.1) * 0.12;
        s.material.rotation += TUMBLE_SPIN_RAD_PER_S * dt;
        if (this.t >= TUMBLE_S) {
          this.phase = 'respawn';
          this.t = 0;
          s.material.color.setScalar(1);
          s.material.rotation = 0;
          s.position.set(0, this.player.baseY - RESPAWN_DROP, this.player.baseZ);
          s.scale.set(this._origScaleX * RESPAWN_OVERSIZE, this._origScaleY * RESPAWN_OVERSIZE, 1);
        }
        break;
      }

      case 'respawn': {
        const q = Math.min(1, this.t / RESPAWN_S);
        const ease = 1 - (1 - q) * (1 - q); // ease-out: fast rise, gentle settle
        s.position.set(0, this.player.baseY - RESPAWN_DROP * (1 - ease), this.player.baseZ);
        const scaleMul = RESPAWN_OVERSIZE - (RESPAWN_OVERSIZE - 1) * ease;
        s.scale.set(this._origScaleX * scaleMul, this._origScaleY * scaleMul, 1);
        if (this.t >= RESPAWN_S) {
          this.active = false;
          s.scale.set(this._origScaleX, this._origScaleY, 1);
          s.position.set(0, this.player.baseY, this.player.baseZ);
          this.player.x = 0;
          this.player.y = 0;
          return true;
        }
        break;
      }
    }
    return false;
  }
}

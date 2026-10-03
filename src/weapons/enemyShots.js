import { makeBillboard } from '../effects/pixelTexture.js';
import { sizeSprite } from '../effects/smoke.js';
import { enemyShotTexture } from './projectileSprites.js';

// Enemy fire.
//
// GAME_SPEC.md §4: "tracked shots aimed at the player's position at fire
// time", in spaced TRAINS of 4-8 (the train cadence lives in enemy.js; this
// file owns one shot's flight). REFERENCE.md "Projectile palettes / Enemy
// shots": larger oval fireballs, ~6-8 native px, pale-gold core #ffd570,
// orange body #ff7733, dark red rim #941114 — "clearly larger and
// darker-rimmed than the player's vulcan puffs".
//
// Aimed at where the player WAS, not where they are: that is what makes the
// trains dodgeable and is the measured behaviour. The shot therefore flies a
// fixed straight line, exactly like a vulcan round but in the other depth
// direction.

const SPEED = 24; // world depth units/s, toward the camera
const PASS_DEPTH = 1.6; // retire once it has gone by

// Shots GROW visibly as they close — in
// reference/stage7-enemy-shot-train-t330.png the near end of a train is
// several times the size of the far end. Sized in screen fractions ramped
// over the approach rather than by pure perspective, so the near-end size
// lands on the measured 6-8 native px regardless of how far out it was
// fired.
const FRAC_FAR = 0.006; // 1.9 px of 320
const FRAC_NEAR = 0.024; // 7.7 px of 320, the measured near-end size

export class EnemyShots {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.shots = [];
    this.pool = [];
  }

  // `from` = { ndcX, ndcY, depth } at the firing aircraft; `aim` = the
  // player's { x, y, depth } NDC at fire time.
  spawn(from, aim) {
    let sprite;
    if (this.pool.length) sprite = this.pool.pop();
    else {
      sprite = makeBillboard(enemyShotTexture(), 0.1);
      sprite.renderOrder = 11;
    }
    this.scene.add(sprite);
    this.shots.push({
      sprite,
      depth: from.depth,
      startNdcX: from.ndcX,
      startNdcY: from.ndcY,
      aimNdcX: aim.x,
      aimNdcY: aim.y,
      invStart: 1 / from.depth,
      invAim: 1 / aim.depth,
      startDepth: from.depth,
    });
  }

  update(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.depth -= SPEED * dt;
      if (s.depth <= PASS_DEPTH) {
        this._retire(i);
        continue;
      }
      // Straight world line from the firer through the player's position at
      // fire time; the 1/d-proportional lerp is that line in screen terms.
      const f = (1 / s.depth - s.invAim) / (s.invStart - s.invAim);
      const ndcX = s.aimNdcX + (s.startNdcX - s.aimNdcX) * f;
      const ndcY = s.aimNdcY + (s.startNdcY - s.aimNdcY) * f;
      // Persisted (R4 game-flow addition): combat.js's checkPlayerHit needs
      // each shot's CURRENT screen position, which was previously only a
      // local in this loop.
      s.ndcX = ndcX;
      s.ndcY = ndcY;
      this.space.ndcToWorld(ndcX, ndcY, s.depth, s.sprite.position);
      const q = Math.min(
        1,
        Math.max(0, (1 / s.depth - 1 / s.startDepth) / (1 / PASS_DEPTH - 1 / s.startDepth))
      );
      sizeSprite(
        s.sprite,
        this.space.worldWidthFor(FRAC_FAR + (FRAC_NEAR - FRAC_FAR) * q, s.depth)
      );
    }
  }

  _retire(i) {
    const s = this.shots[i];
    this.scene.remove(s.sprite);
    this.pool.push(s.sprite);
    this.shots.splice(i, 1);
  }

  // Public wrapper (R4 game-flow addition): removes one specific shot, e.g.
  // one combat.checkPlayerHit() just resolved as a hit on the player.
  remove(shot) {
    const i = this.shots.indexOf(shot);
    if (i >= 0) this._retire(i);
  }

  clear() {
    while (this.shots.length) this._retire(this.shots.length - 1);
  }
}

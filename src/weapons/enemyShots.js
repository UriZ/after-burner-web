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

// World depth units/s, toward the camera. 15, down from 24.
//
// NEITHER NUMBER IS MEASURED, and this comment exists so the next agent does
// not treat 15 as arcade-derived. GAME_SPEC.md §4 carries "bullet speed ~0.6
// depth/s", ADOPTED from the Godot prototype in that prototype's normalised
// depth units; mapped onto this project's 90-unit spawn depth that is roughly
// 54 units/s, so the committed 24 was already a large unexplained departure
// from the inherited figure, in this same direction. Shot time of flight is
// in principle measurable off the 60fps longplay (count frames from a muzzle
// flash to its impact) and has not been; until it is, this is a gameplay
// constant with a stated derivation, not a reference fact.
//
// What it IS solved against: time of flight is the only term in the fairness
// lag (TELEGRAPH_S + timeOfFlight, see src/entities/enemy.js) that can grow
// without shrinking the depth budget an enemy needs to pay out a full train
// — raising the firing band's floor buys lag and costs budget, whereas
// slowing the round buys lag for free. At 15 units/s a round from the 52..24
// band is in the air 1.49-3.36 s, putting the lag at 2.49-4.36 s against the
// 1.93-3.10 s that 24 gave.
//
// It also happens to agree better with the one measured frame we have:
// reference/stage7-enemy-shot-train-t330.png shows ~6 fireballs strung out
// across roughly a third of the frame AT ONCE, which needs the earlier rounds
// of a train still in the air when the later ones leave. At 0.11 s spacing an
// 8-round train spans 0.77 s of emission, so the whole train is only
// simultaneously visible if a round lives well beyond that.
const SPEED = 15;
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
  // { x, y, depth } NDC this shot flies at — snapshotted when the firing
  // enemy's telegraph lit, NOT the live player position (see enemy.js).
  // `meta` carries measurement-only fields the fairness probe reads back.
  spawn(from, aim, meta = null) {
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
      prevDepth: from.depth,
      startNdcX: from.ndcX,
      startNdcY: from.ndcY,
      aimNdcX: aim.x,
      aimNdcY: aim.y,
      invStart: 1 / from.depth,
      invAim: 1 / aim.depth,
      startDepth: from.depth,
      meta,
    });
  }

  update(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      // Kept so combat.js's hit test can ask "did this round cross the
      // player's plane during THIS tick" rather than "is it currently within
      // a depth tolerance of it". See checkPlayerHit's comment: the
      // tolerance form tested the round at every tick across a window
      // 1.23x the firer-to-aim screen distance wide, so a round aimed well
      // clear of the player still swept over them on the way through.
      s.prevDepth = s.depth;
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

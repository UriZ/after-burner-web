import { createJetSprite } from '../render/spriteFactory.js';

// "Jet roams a wide screen area" (ARCHITECTURE.md D7 item 2). Envelope is in
// world units at the jet's fixed depth in front of the camera — placeholder
// values, to be tuned against reference video once banked-turn roll lands.
const ENVELOPE_X = 2.6;
const ENVELOPE_Y = 1.1;
const FOLLOW_RATE = 6.0; // 1/s exponential approach toward the stick target

// Jet world-space width at baseZ=-5 under the current camera (FOV 55deg,
// game.js). The analytic estimate (half-vFOV=27.5deg, visible width at
// depth 5 = 2*5*tan(27.5deg)*aspect(320/224) = 7.44 world units -> 2.7
// should give ~36.3%W) undershot in practice. MEASURED via column-run on
// real captures (own Python re-implementation of REFERENCE.md's method,
// 960px-wide frame): worldWidth=2.7 -> tools/out/jethud-r2/frame-0000.png,
// span 318px = 33.1%W, bbox aspect 3.42:1. worldWidth=2.95 ->
// tools/out/jethud-r2-tune/frame-0000.png, span 348px = 36.25%W, bbox
// aspect 3.31:1 — both inside the 34-38%W / 3.2-3.8:1 R1 acceptance band.
// Re-derive if camera FOV/pitch or the player's baseZ change (owned by
// game.js, outside this file).
const JET_WORLD_WIDTH = 2.95;

export class Player {
  constructor({ baseY = 0, baseZ = -5 } = {}) {
    this.sprite = createJetSprite(JET_WORLD_WIDTH);
    this.baseY = baseY;
    this.baseZ = baseZ;
    this.x = 0;
    this.y = 0;
    this.sprite.position.set(0, baseY, baseZ);
  }

  // `worldRoll` (radians, 0 = level, matching REFERENCE.md's "Horizon tilt
  // when banking" sign: positive = banking right, world rotates clockwise
  // on screen) is read from the game/state object that owns the world-roll
  // feature (src/game/game.js, built in parallel this round — NOT owned by
  // this file). It is an OPTIONAL third argument so this file works
  // unmodified whether or not the caller passes it yet: omitted/undefined
  // defaults to 0 (no bank), per this round's integration note.
  //
  // REQUIRED call-site change in game.js once world roll exists there
  // (one line, in Game.update): replace
  //   this.player.update(dt, inputState);
  // with
  //   this.player.update(dt, inputState, this.worldRoll);
  // (or whatever field name the world-roll implementation lands on — see
  // the dev report for this round).
  //
  // The jet's drawn bank TRACKS the world roll, it never leads it
  // (REFERENCE.md "Player jet / Jet bank vs world roll": prototype ships
  // jet-bank = 0.8 * world roll). Sprite.material.rotation is a pure
  // image-plane rotation, independent of the 3D camera roll, which is
  // exactly what a camera-facing billboard needs here.
  update(dt, input, worldRoll = 0) {
    const targetX = input.x * ENVELOPE_X;
    const targetY = input.y * ENVELOPE_Y;
    const t = 1 - Math.exp(-FOLLOW_RATE * dt);
    this.x += (targetX - this.x) * t;
    this.y += (targetY - this.y) * t;
    this.sprite.position.set(this.x, this.baseY + this.y, this.baseZ);
    this.sprite.material.rotation = -worldRoll * 0.8;
  }
}

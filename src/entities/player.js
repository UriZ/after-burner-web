import { createJetSprite } from '../render/spriteFactory.js';

// "Jet roams a wide screen area" (ARCHITECTURE.md D7 item 2). Envelope is in
// world units at the jet's fixed depth in front of the camera — placeholder
// values, to be tuned against reference video once banked-turn roll lands.
const ENVELOPE_X = 2.6;
const ENVELOPE_Y = 1.1;
const FOLLOW_RATE = 6.0; // 1/s exponential approach toward the stick target

export class Player {
  constructor({ baseY = 0, baseZ = -5 } = {}) {
    this.sprite = createJetSprite();
    this.baseY = baseY;
    this.baseZ = baseZ;
    this.x = 0;
    this.y = 0;
    this.sprite.position.set(0, baseY, baseZ);
  }

  update(dt, input) {
    const targetX = input.x * ENVELOPE_X;
    const targetY = input.y * ENVELOPE_Y;
    const t = 1 - Math.exp(-FOLLOW_RATE * dt);
    this.x += (targetX - this.x) * t;
    this.y += (targetY - this.y) * t;
    this.sprite.position.set(this.x, this.baseY + this.y, this.baseZ);
  }
}

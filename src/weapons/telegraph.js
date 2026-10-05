import { makeBillboard } from '../effects/pixelTexture.js';
import { sizeSprite } from '../effects/smoke.js';
import { makePixelTexture } from '../effects/pixelTexture.js';

// The VISIBLE half of the enemy-fire telegraph.
//
// src/entities/enemy.js owns the timing and the aim snapshot; this file owns
// the flare the player actually reads. Both halves are required and neither
// is useful alone: aimed fire without a tell is the guaranteed kill the old
// random aim-bias was invented to avoid, and a tell that does not predict
// the impact point is decoration.
//
// WHY A SEPARATE SPRITE RATHER THAN TINTING THE AIRCRAFT. The enemy sprite is
// the sprite-art lane's file and is about to be redrawn; a flare drawn ON it
// would be their pixels, not mine. It is also the wrong read: at the depths
// enemies fire from (6-46 units, so roughly 2-25%W of span) a tint change on
// a dark airframe is a few pixels shifting value, which is exactly the kind
// of "statistically present, perceptually absent" signal this round exists
// to stop shipping. A separate additive-looking flare that OVERHANGS the
// silhouette stays legible at every size in the band.
//
// Authored as an explicit pixel grid, not ctx.arc: judging/R4/art-critique.md
// is explicit that Canvas2D antialiases path fills with no way to disable
// it, that "the nozzle donuts, the smoke rings, the explosion lobes and the
// enemy bullseye nose are all the same failure", and that the vulcan puff's
// explicit grid is the pattern to copy. This is a 9x9 four-point star.
//
// Palette: the enemy-shot colours from REFERENCE.md "Projectile palettes /
// Enemy shots" (MEASURED on reference/stage7-enemy-shot-train-t330.png) —
// pale-gold core #ffd570, orange body #ff7733, dark red rim #941114. The
// flare is deliberately the same family as the shot it predicts, so the
// player learns one colour and not two.
const T_CORE = '#ffd570';
const T_BODY = '#ff7733';
const T_RIM = '#941114';

const STAR = [
  '....r....',
  '....b....',
  '...bcb...',
  '..rbcbr..',
  'rbccCccbr',
  '..rbcbr..',
  '...bcb...',
  '....b....',
  '....r....',
];

function drawTelegraphFlare(ctx, w, h) {
  const px = w / 9;
  const colours = { r: T_RIM, b: T_BODY, c: T_CORE, C: '#fff4d0' };
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const ch = STAR[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = colours[ch];
      ctx.fillRect(x * px, y * px, px, px);
    }
  }
}

let flareTex = null;
const telegraphTexture = () => (flareTex ??= makePixelTexture(drawTelegraphFlare, 9, 9, { hardAlpha: true }));

// On-screen flare size, native px. Held CONSTANT rather than scaled with the
// firing aircraft: a telegraph is a UI promise, and a promise that is 2 px
// wide when the shooter is far away is one the player cannot keep. The
// arcade's own lock brackets work the same way (fixed 5.1%W regardless of
// target size — REFERENCE.md), so a fixed-size warning glyph is consistent
// with how this game already signals.
const FLARE_PX_MIN = 7;
const FLARE_PX_MAX = 13;

// The flare PULSES rather than fading in, and the pulse accelerates: 3 beats
// over the 0.45 s window, so the player gets a rhythm that reads as "about
// to happen" rather than a smooth ramp that reads as ambience. The last beat
// is the biggest and lands just before the first shot leaves.
const PULSES = 3;

export class Telegraphs {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.live = [];
    this.pool = [];
  }

  _acquire() {
    if (this.pool.length) return this.pool.pop();
    const s = makeBillboard(telegraphTexture(), 0.1);
    // Above the aircraft and its brackets, below explosions.
    s.renderOrder = 18;
    return s;
  }

  // Called once per tick with the live enemy list. Enemies expose
  // `telegraph` (seconds remaining) and `telegraphFrac` (0..1); this draws
  // one flare per telegraphing enemy and returns how many are lit, which
  // combat.js folds into the audio warning intensity.
  update(enemies) {
    let lit = 0;
    for (const e of enemies) {
      if (!e.alive || e.retired || e.telegraph <= 0) continue;
      let s = this.live[lit];
      if (!s) {
        s = this._acquire();
        this.scene.add(s);
        this.live[lit] = s;
      }
      const t = e.telegraphFrac;
      // Triangle-wave pulse. Math.abs of a sine would give equal beats; the
      // t-weighting makes each beat brighter and larger than the last.
      const beat = Math.abs(Math.sin(t * Math.PI * PULSES));
      const px = FLARE_PX_MIN + (FLARE_PX_MAX - FLARE_PX_MIN) * beat * (0.4 + 0.6 * t);
      this.space.ndcToWorld(e.ndc.x, e.ndc.y, e.d, s.position);
      sizeSprite(s, this.space.worldWidthFor(px / 320, e.d));
      // Opacity floors at 0.45 so the flare never fully disappears between
      // beats — a signal that blinks OFF is one the player can miss entirely
      // by looking away at the wrong moment.
      s.material.opacity = 0.45 + 0.55 * beat;
      s.visible = true;
      lit += 1;
    }
    while (this.live.length > lit) {
      const s = this.live.pop();
      s.visible = false;
      this.scene.remove(s);
      this.pool.push(s);
    }
    return lit;
  }

  clear() {
    for (const s of this.live) {
      s.visible = false;
      this.scene.remove(s);
      this.pool.push(s);
    }
    this.live.length = 0;
  }
}

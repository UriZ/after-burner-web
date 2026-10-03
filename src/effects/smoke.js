import { makePixelTexture, makeBillboard, srgbScalar } from './pixelTexture.js';

// Smoke: the missile trail's aged TAIL puffs, and the launch billow.
//
// REFERENCE.md "Missiles / weapons visuals": the trail is a continuous
// opaque ribbon (that part is missiles.js's ribbon mesh), and "the trail's
// TAIL ages into a chain of discrete round white puffs (t226, t332, t120),
// and a launch throws large white smoke billows that briefly occlude part of
// the frame (t99.75-t101)". Both are here.
//
// The measured internal value structure of the whole trail — mean V 0.37,
// brightest quintile V 0.594, darkest quintile V 0.219 (~2.7x bright/dark) —
// is a property of ribbon AND puffs TOGETHER, so a puff's brightness is not
// one constant: it RAMPS from near-white at birth to dark grey as it
// dissipates (`valueStart`/`valueEnd` below). Two earlier attempts each
// broke one half of that and the measurements caught both:
//   * puffs held at a flat dark 0.55 -> they rendered as near-black discs
//     against the stage-1 sky, reading as holes punched in it, against
//     REFERENCE.md's explicit "chain of discrete round WHITE puffs";
//   * puffs held at a flat white 0.92 -> they flooded the bright end and the
//     trail's measured bright/dark quintile ratio collapsed to 1.58, outside
//     the required 2.2-3.2.
// The ramp gives white puffs where the trail is young and a dark dissipating
// tail behind them, which is both what the frames show and what the
// statistic requires.

// A round puff in WHITE-to-light-grey, with internal value steps and NO
// alpha falloff. Two things the first version got wrong, both visible in
// tools/out/combat-r3-23-final/frame-0015.png:
//
//   * It was built from dark greys (#3a3a3a..#b4b4b4) and then colour-scaled
//     by 0.55, so against the #009fff stage-1 sky the aged tail puffs
//     rendered as near-black discs that read as holes punched in the sky.
//     REFERENCE.md is explicit: the tail ages into "a chain of discrete
//     round WHITE puffs" (t226, t332, t120).
//   * Its outermost ring was drawn at alpha 0.55, giving a soft halo —
//     against the same measurement that says the structure is VALUE,
//     "not an alpha fade". Every ring here is fully opaque.
function drawSmokePuff(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const ring = (r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ring(w * 0.5, '#8f8f8f');
  ring(w * 0.43, '#b0b0b0');
  ring(w * 0.35, '#cfcfcf');
  ring(w * 0.25, '#e8e8e8');
  ring(w * 0.14, '#f8f8f8');
}

// Launch billow: a bigger, brighter, lumpier mass. In
// reference/stage1-missile-salvo-t100.75.png the launch smoke is the single
// largest element on screen and is near-white at its core.
function drawBillow(ctx, w, h) {
  const lobes = [
    [0.5, 0.5, 0.46],
    [0.3, 0.38, 0.3],
    [0.68, 0.36, 0.28],
    [0.36, 0.68, 0.3],
    [0.66, 0.68, 0.26],
  ];
  const shade = (fill, scale, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    for (const [lx, ly, lr] of lobes) {
      ctx.beginPath();
      ctx.arc(lx * w, ly * h, lr * w * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  shade('#9a9a9a', 1.0, 0.7);
  shade('#c6c6c6', 0.86);
  shade('#e4e4e4', 0.64);
  shade('#f6f6f6', 0.36);
  ctx.globalAlpha = 1;
}

let puffTex = null;
let billowTex = null;
export const smokePuffTexture = () => (puffTex ??= makePixelTexture(drawSmokePuff, 24, 24, { hardAlpha: true }));
export const billowTexture = () => (billowTex ??= makePixelTexture(drawBillow, 32, 32, { hardAlpha: true }));

// Pooled smoke sprites. Both kinds are sized in SCREEN fractions (they are
// drawn at a size that reads the same whether the missile is near or far —
// the arcade's smoke does not shrink into the vanishing point the way the
// aircraft do), so each live puff recomputes its world width from its own
// camera distance every frame.
export class SmokeField {
  constructor(scene, space) {
    this.scene = scene;
    this.space = space;
    this.live = [];
    this.pool = { puff: [], billow: [] };
  }

  _acquire(kind) {
    const pool = this.pool[kind];
    if (pool.length) return pool.pop();
    const tex = kind === 'puff' ? smokePuffTexture() : billowTexture();
    const sprite = makeBillboard(tex, 1);
    sprite.renderOrder = kind === 'puff' ? 6 : 7;
    return sprite;
  }

  // `fracStart`/`fracEnd` are screen-width fractions and
  // `valueStart`/`valueEnd` scale the sprite's colour, both ramped over the
  // puff's life. `depth` is camera-space view depth — the camera is static
  // in this build, so a puff's depth is fixed at spawn and is stored rather
  // than recomputed (Euclidean distance to the camera would over-size
  // off-axis puffs by up to ~10%).
  spawn(
    kind,
    position,
    depth,
    { life, fracStart, fracEnd, valueStart = 1, valueEnd = valueStart, fadeFrom = 0.7 }
  ) {
    const sprite = this._acquire(kind);
    sprite.position.copy(position);
    sprite.material.opacity = 1;
    sprite.material.color.setScalar(srgbScalar(valueStart));
    this.scene.add(sprite);
    this.live.push({
      kind, sprite, age: 0, depth, life, fracStart, fracEnd, valueStart, valueEnd, fadeFrom,
    });
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.scene.remove(p.sprite);
        this.pool[p.kind].push(p.sprite);
        this.live.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      const frac = p.fracStart + (p.fracEnd - p.fracStart) * t;
      sizeSprite(p.sprite, this.space.worldWidthFor(frac, p.depth));
      p.sprite.material.color.setScalar(
        srgbScalar(p.valueStart + (p.valueEnd - p.valueStart) * t)
      );
      p.sprite.material.opacity = t < p.fadeFrom ? 1 : 1 - (t - p.fadeFrom) / (1 - p.fadeFrom);
    }
  }

  clear() {
    for (const p of this.live) {
      this.scene.remove(p.sprite);
      this.pool[p.kind].push(p.sprite);
    }
    this.live.length = 0;
  }
}

// Resize a billboard keeping its authored canvas aspect. Shared by every
// pooled-sprite system here and in src/weapons/.
export function sizeSprite(sprite, worldWidth) {
  const aspect = sprite.material.map.userData.aspect ?? 1;
  sprite.scale.set(worldWidth, worldWidth * aspect, 1);
}

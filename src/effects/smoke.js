import { makePixelTexture, makeBillboard, srgbScalar } from './pixelTexture.js';

// Smoke: the missile trail's aged TAIL puffs, and the launch billow.
//
// REFERENCE.md "Missiles / weapons visuals": the trail is a continuous
// opaque ribbon (that part is missiles.js's ribbon mesh), and "the trail's
// TAIL ages into a chain of discrete round white puffs (t226, t332, t120),
// and a launch throws large white smoke billows that briefly occlude part of
// the frame (t99.75-t101)". Both are here.
//
// A puff's brightness is not one constant: it RAMPS over the puff's life
// (`valueStart`/`valueEnd` below), and BOTH ENDPOINTS ARE PER-STAGE — see
// effects/trailPalette.js, which carries the measurement for each stage.
// Callers pass the endpoints in; this file does not know which stage it is
// drawing.
//
// The history is worth keeping, because three separate attempts each broke
// one half of it:
//   * puffs held at a flat dark 0.55 -> near-black discs against the stage-1
//     sky, reading as holes punched in it, against REFERENCE.md's explicit
//     "chain of discrete round WHITE puffs";
//   * puffs held at a flat white 0.92 -> they flooded the bright end and a
//     bright/dark quintile ratio taken from a night frame collapsed to 1.58,
//     outside the 2.2-3.2 that measurement demanded;
//   * so puffs were ramped 0.76 -> 0.17 for EVERY stage, which rendered the
//     daylight trail BLACK — R4 gap 4.
// The ratio those attempts were chasing has since been withdrawn outright:
// the frame it came from contains no smoke trail at all (see
// effects/trailPalette.js). The trail is white in every stage, so these
// endpoints are near-white in every stage and differ only ~6% between day
// and night.

// A round puff, authored NEAR-WHITE with internal value steps and NO alpha
// falloff. Two things the first version got wrong, both visible in
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
//
// THE LADDER IS AUTHORED AT THE BRIGHTEST STAGE AND DARKENED BY THE CALLER,
// never the reverse. The material colour MULTIPLIES the texel, so a texture
// authored dark can only ever be darkened further — the old #8f8f8f outer
// ring capped the puff at V 0.56 however white the caller asked for, which
// is 0.38 BELOW the stage-1 plume's measured p10 of 0.941 and is half of why
// R4 gap 4 could not be fixed by retuning the value ramp alone. The ring
// values below are the measured stage-1 band: mean 0.965 against the plume's
// 0.9674, minimum 0.933 against its darkest-quintile 0.933
// (reference/stage1-missile-salvo-t100.75.png — see effects/trailPalette.js
// for the full operator). Night darkens from here via `valueStart/End`.
//
// Band areas and values: 0.260 at 0.933, 0.250 at 0.957, 0.240 at 0.976,
// 0.172 at 0.992, 0.078 at 1.000 -> area-weighted mean 0.9647.
function drawSmokePuff(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const ring = (r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ring(w * 0.5, '#eeeeee');
  ring(w * 0.43, '#f4f4f4');
  ring(w * 0.35, '#f9f9f9');
  ring(w * 0.25, '#fdfdfd');
  ring(w * 0.14, '#ffffff');
}

// Launch billow: a bigger, lumpier mass. In
// reference/stage1-missile-salvo-t100.75.png the launch smoke is the single
// largest element on screen (39.1%W x 50.0%H, 58% bbox fill) and is
// near-white throughout, not just at its core — the whole mass measures
// mean V 0.9674 with a darkest quintile of 0.933.
//
// Authored at the stage-1 band for the same reason the puff is: the caller
// multiplies, so this is the ceiling. The old ladder topped out at #f6f6f6
// drawn over a 0.7-alpha #9a9a9a base, which composited to roughly V 0.6-0.7
// and could not reach the measured plume however bright the caller asked.
// The alpha is gone too: the measurement says the structure is VALUE, "not
// an alpha fade", and a part-transparent white mass over the #009fff sky
// comes back BLUE, which is a saturation failure as well as a value one
// (the plume's measured mean S is 0.0504).
function drawBillow(ctx, w, h) {
  const lobes = [
    [0.5, 0.5, 0.46],
    [0.3, 0.38, 0.3],
    [0.68, 0.36, 0.28],
    [0.36, 0.68, 0.3],
    [0.66, 0.68, 0.26],
  ];
  const shade = (fill, scale) => {
    ctx.fillStyle = fill;
    for (const [lx, ly, lr] of lobes) {
      ctx.beginPath();
      ctx.arc(lx * w, ly * h, lr * w * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  shade('#eeeeee', 1.0);
  shade('#f6f6f6', 0.86);
  shade('#fbfbfb', 0.64);
  shade('#ffffff', 0.36);
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

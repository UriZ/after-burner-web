import * as THREE from 'three';
import { makePixelTexture } from './pixelTexture.js';

// ---------------------------------------------------------------------------
// GUN-HIT FEEDBACK (R27, combat-feel lane).
//
// Before this existed, combat.js `_damage()` did `if (!enemy.damage()) return;`
// -- a NON-FATAL round returned with ZERO visuals, so bombers (hp:2) silently
// swallowed the first round and nothing on screen said it connected. The
// arcade flashes/sparks the target on EVERY connecting round. This field
// renders that cue:
//
//   * a SILHOUETTE FLASH -- the enemy's own sprite texture drawn again in an
//     ADDITIVE pass, so the aircraft briefly lights up bright over its own
//     colours. It uses the enemy's LIVE map/rotation/scale and is glued to the
//     enemy's position for its short life, so at fly-past it stays on the jet
//     rather than lagging behind it. A killed enemy is removed the same tick
//     the explosion spawns, so a fatal flash just freezes on its last
//     transform -- the explosion covers it.
//
//   * an IMPACT SPARK -- a small additive white radial at the hit point, for a
//     bit of pop. Kept subtle: this is a bullet strike, not a kill.
//
// This is NOT a tracer. The gun's projectiles (orange puffs, per REFERENCE.md,
// projectileSprites.js) are untouched; this only fires where a round CONNECTS.
//
// All sprites are additive + depthTest:false + high renderOrder so the cue is
// always visible on top of the enemy regardless of livery or sky. Pooled, so a
// sustained gun stream does not churn GC.
// ---------------------------------------------------------------------------

// Lifetimes in SECONDS. At 60 Hz these are ~7 and ~5 frames -- long enough to
// read as a flash, short enough that a stream of hits reads as a stutter of
// light rather than a solid glow.
const SILHOUETTE_LIFE_S = 0.117;
const SPARK_LIFE_S = 0.083;

// The flash is drawn a touch larger than the enemy so its bright edge reads
// just outside the silhouette rather than being hidden exactly behind it.
const SILHOUETTE_INFLATE = 1.14;

// Spark radial: white hot core fading out through cooler rings. Additive
// blending turns the concentric fills into a soft falloff without any
// Canvas2D antialiasing (hardAlpha) -- the recurring blur trap this project
// lists. Authored on a 16x16 canvas.
function drawSpark(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const ring = (r, hex) => {
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ring(6.5, '#243040'); // faint outer glow (adds a little)
  ring(4.0, '#8fa6c4'); // cool mid
  ring(2.2, '#ffffff'); // hot core
}

let _sparkTex = null;
function sparkTexture() {
  if (!_sparkTex) {
    _sparkTex = makePixelTexture(drawSpark, 16, 16, { hardAlpha: true });
  }
  return _sparkTex;
}

export class HitFlashField {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pool = [];
  }

  _acquire(mode) {
    let f = this.pool.pop();
    if (!f) {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      // Above the enemies (renderOrder 10) so the cue is never occluded.
      sprite.renderOrder = 22;
      f = { sprite, enemy: null, mode: 'silhouette', t: 0, life: 0, w: 1, aspect: 1 };
    }
    f.mode = mode;
    f.t = 0;
    f.sprite.material.color.setRGB(1, 1, 1);
    f.sprite.material.opacity = 1;
    f.sprite.visible = true;
    return f;
  }

  // Fires on EVERY connecting round -- fatal or not. combat.js calls this
  // BEFORE its early return on a non-fatal hit, which is the whole point.
  spawn(enemy) {
    const es = enemy?.sprite;
    if (!es) return;

    // --- Silhouette flash: the enemy's own texture, additive, glued to it. ---
    const flash = this._acquire('silhouette');
    flash.enemy = enemy;
    flash.life = SILHOUETTE_LIFE_S;
    flash.sprite.material.map = es.material.map;
    flash.sprite.material.rotation = es.material.rotation;
    flash.sprite.position.copy(es.position);
    flash.sprite.scale.set(
      es.scale.x * SILHOUETTE_INFLATE,
      es.scale.y * SILHOUETTE_INFLATE,
      1
    );
    this.scene.add(flash.sprite);
    this.active.push(flash);

    // --- Impact spark: small white radial at the hit point. ---
    const spark = this._acquire('spark');
    spark.enemy = enemy; // follow while alive too, so it tracks the jet
    spark.life = SPARK_LIFE_S;
    spark.sprite.material.map = sparkTexture();
    spark.sprite.material.rotation = 0;
    spark.sprite.position.copy(es.position);
    // Roughly half the enemy's on-screen width -- a strike mark, not a blast.
    const sw = Math.max(es.scale.x, es.scale.y) * 0.55;
    spark.sprite.scale.set(sw, sw, 1);
    this.scene.add(spark.sprite);
    this.active.push(spark);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const f = this.active[i];
      f.t += dt;
      const e = f.enemy;
      // Follow the live enemy while it is alive so the flash stays on the jet
      // at fly-past. A dead enemy was removed this tick -> freeze in place.
      if (e && e.alive && e.sprite) {
        const es = e.sprite;
        f.sprite.position.copy(es.position);
        if (f.mode === 'silhouette') {
          f.sprite.material.map = es.material.map;
          f.sprite.material.rotation = es.material.rotation;
          f.sprite.scale.set(
            es.scale.x * SILHOUETTE_INFLATE,
            es.scale.y * SILHOUETTE_INFLATE,
            1
          );
        }
      }
      const k = f.t / f.life;
      if (k >= 1) {
        this._retire(f, i);
        continue;
      }
      // Bright early, quick ease-out. pow>1 holds the first couple of frames
      // near full brightness so a single-frame glimpse still reads.
      f.sprite.material.opacity = Math.pow(1 - k, 1.6);
    }
  }

  _retire(f, i) {
    this.scene.remove(f.sprite);
    f.sprite.visible = false;
    f.enemy = null;
    this.active.splice(i, 1);
    this.pool.push(f);
  }

  clear() {
    for (const f of this.active) {
      this.scene.remove(f.sprite);
      f.sprite.visible = false;
      f.enemy = null;
      this.pool.push(f);
    }
    this.active.length = 0;
  }
}

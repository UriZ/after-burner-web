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
const T_CORE = '#ffd673'; // sampled #ffd570, snapped to the ladder
const T_BODY = '#ff7331'; // sampled #ff7733
const T_RIM = '#941010'; // sampled #941114
const T_HOT = '#fff7ce';

// R7: THE PULSE IS A PALETTE SWAP, NOT AN OPACITY RAMP, and this is the
// second member of R6 gap 1's compositing class.
//
// What was here: `s.material.opacity = 0.45 + 0.55 * beat`. A continuously
// varying alpha over whatever the flare happens to be in front of — sky,
// cloud, sea, another aircraft — and three.js blends in LINEAR space, so the
// composite is not even a straight-line mix of the two colours. The judge
// isolated `?combatonly=enemies,shots` at 44-70 channel values against a
// gate of 32 with ZERO explosion pixels in the arm, and the single largest
// contributor was this line. One worked example, reproduced exactly offline:
// #7e5c96 — a lavender — is #941114 at alpha 0.70 over the #009eff sky,
// composited in linear space. A 1987 board cannot produce that pixel, and
// the art critic's §3 names exactly this family ("off-palette lavender and
// pale green") as what the explosion decays through.
//
// An arcade cabinet flashes a sprite by swapping its palette entry, so that
// is what this does: two authored variants of the same 9x9 star, each
// drawn from the SAME measured four-colour set, selected on the beat. The
// signal the pulse carries is unchanged — it still brightens three times and
// still grows (the size ramp below is untouched) — but every pixel it puts
// on screen is now one of four authored colours.
//
// The DIM variant is the bright one with every role stepped down one rung of
// the same measured ladder (hot->core, core->body, body->rim, rim->rim).
// No new hexes: a dim flare is the measured palette used darker, not a
// darker version of the measured palette.
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

const BRIGHT_ROLES = { r: T_RIM, b: T_BODY, c: T_CORE, C: T_HOT };
const DIM_ROLES = { r: T_RIM, b: T_RIM, c: T_BODY, C: T_CORE };

// Every colour either variant can place. Declared here and handed to
// makePixelTexture, which snaps to it — see tools/fx_palette_probe.mjs.
export const TELEGRAPH_PALETTE = [T_RIM, T_BODY, T_CORE, T_HOT];

function drawTelegraphFlare(roles) {
  return (ctx, w, h) => {
    const px = w / 9;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const ch = STAR[y][x];
        if (ch === '.') continue;
        ctx.fillStyle = roles[ch];
        ctx.fillRect(x * px, y * px, px, px);
      }
    }
  };
}

let flareTexes = null;
// [dim, bright].
export function telegraphTextures() {
  flareTexes ??= [DIM_ROLES, BRIGHT_ROLES].map((roles) =>
    makePixelTexture(drawTelegraphFlare(roles), 9, 9, { palette: TELEGRAPH_PALETTE }));
  return flareTexes;
}

// On-screen flare size, native px. Held CONSTANT rather than scaled with the
// firing aircraft: a telegraph is a UI promise, and a promise that is 2 px
// wide when the shooter is far away is one the player cannot keep. The
// arcade's own lock brackets work the same way (fixed 5.1%W regardless of
// target size — REFERENCE.md), so a fixed-size warning glyph is consistent
// with how this game already signals.
// R29 — enlarged (7->10 min, 13->18 max) so the WARNING reads. The judge's #1
// gap is that enemy fire never registers as a threat the player weaves around;
// a tell that is only ~7-13 native px at the firing aircraft is as easy to miss
// as the round it predicts. The glyph, its pulse rhythm and its fixed-size
// behaviour are unchanged — it is simply bigger, so "a round is about to come
// at you" is legible at the depths enemies fire from. This is a VISIBILITY
// change only; the aim snapshot and fire timing live in enemy.js and are
// untouched, so fairness is unaffected.
const FLARE_PX_MIN = 10;
const FLARE_PX_MAX = 18;

// R38 (death-legibility-2) — the BATTERY's flare is a third larger. The R38
// death replay (judging/R38/death-legibility2/) attributes 6 of the 7
// playtest deaths to ground-battery rounds, and the battery's whole visual
// warning chain is 0.4 s of this star + 0.79 s of round flight. Unlike an
// air firer — an aircraft against open sky — the battery sits at the BOTTOM
// of the frame inside terrain clutter (the 60 Hz approach strips show the
// turret amid desert mottle and the low HUD row), so the same star at the
// same size buys less legibility there. Size only: the pulse rhythm, the
// 0.4 s duration (groundBattery.js — a FAIRNESS constant, since the aim
// snapshots when the flare lights) and the aim geometry are untouched.
const BATTERY_FLARE_PX_MIN = 14;
const BATTERY_FLARE_PX_MAX = 26;

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
    const s = makeBillboard(telegraphTextures()[1], 0.1);
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
    const texes = telegraphTextures();
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
      const pxMin = e.isBattery ? BATTERY_FLARE_PX_MIN : FLARE_PX_MIN;
      const pxMax = e.isBattery ? BATTERY_FLARE_PX_MAX : FLARE_PX_MAX;
      const px = pxMin + (pxMax - pxMin) * beat * (0.4 + 0.6 * t);
      this.space.ndcToWorld(e.ndc.x, e.ndc.y, e.d, s.position);
      // Map BEFORE sizeSprite: sizeSprite reads the aspect off the live map.
      // Both variants are 9x9 so it makes no difference today, and it would
      // silently stop being true the moment one of them is redrawn.
      // The flare never blinks OFF between beats — a signal the player can
      // miss by looking away at the wrong moment is not a warning. What used
      // to be an opacity floor of 0.45 is now the DIM variant: fully opaque,
      // same silhouette, one rung darker on the same measured ladder.
      s.material.map = texes[beat >= 0.5 ? 1 : 0];
      s.material.opacity = 1;
      sizeSprite(s, this.space.worldWidthFor(px / 320, e.d));
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

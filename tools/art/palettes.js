// Palette constants for every sheet, per judging/R4/art-critique.md §3.
// Each group below starts from the critique's measured/cited hex, then is
// snapped exactly onto the Sega 5-bit ladder (tools/art/ladder.js) so every
// generator's assertPalette() gate passes. Snap deltas are all <=2 per
// channel (verified by running snapHexToLadder over the whole table before
// this file was written) — the critique's own values were already a
// round(c*31)/31 approximation of this ladder, so this is not a new
// colour, just the exact ladder member nearest the measured one.
import { snapHexToLadder } from './ladder.js';

function L(hex) {
  const { snapped } = snapHexToLadder(hex);
  return snapped;
}

export const SKY = L('#009cff');

export const SEA = {
  deepShadow: L('#0008b5'),
  troughVariant: L('#1910bd'),
  base: L('#0010e6'),
  baseVariant: L('#0008e6'),
  mid: L('#003ad6'),
  midLight: L('#2142de'),
  nearFoam: L('#218cd6'),
  foamCrest: L('#7bd6ef'),
};

export const HAZE = [L('#73b5f7'), L('#a5d6ff'), L('#c5e6ff'), L('#d6f7f7'), L('#0008de')];

// Player F-14, stage-1 neutral palette (critique §3 "Self-correction" —
// measured on stage1-flight-bank-t97.png, NOT the orange-sky closeup).
export const PLAYER = {
  keyline: '#000000', // critique: #000008, "effectively BLACK" — ladder snap is exactly black
  lightTop: L('#c5c5ad'),
  lightNeutral: L('#b5ada5'),
  midNeutral: L('#a59c8c'),
  coolDark: L('#6b737b'),
  warmShadow: L('#ad7b5a'),
  deepWarmShadow: L('#422921'),
  canopy: L('#9d3aca'),
  nozzleCore: L('#ef7308'),
  nozzleHot: L('#ffd600'),
};

// Player F-14, NIGHT palette — exactly 8 colours, measured directly off
// ab2-arcade-night-banking.png x[108,225] y[92,142] (true-native 320x224,
// one of only two true-native arcade PNGs this project holds). Published by
// the team lead as interface I3's resolution: six blue-greys (body ramp,
// light to dark) plus two canopy magentas. No separate black keyline is in
// this measured set — the darkest blue-grey (#425284) does that job, which
// is plausible against a dark navy night sky where true black wouldn't read
// as a distinct ladder step anyway. The nozzle ring/core reuses the same 8
// values (dark grey ring, magenta core) rather than introducing a 9th
// colour — there is no orange/yellow in the verified crop, so this is the
// measured ground truth, not an invented substitute; see the delivery
// report for the reasoning.
export const PLAYER_NIGHT = {
  keyline: L('#425284'),
  lightTop: L('#c5d6f7'),
  lightNeutral: L('#a4b5e6'),
  midNeutral: L('#8494c5'),
  coolDark: L('#7384b5'),
  warmShadow: L('#6373a4'),
  deepWarmShadow: L('#425284'),
  canopy: L('#c594f7'),
  // MEASURED R5b, and it corrects an earlier assumption in this table that
  // "there is no warm hue in the verified 8-colour night set". There is:
  // on reference/stage3-night-level-t175.png, the JET-SIL nozzle mask
  // (hue 5-55 deg OR >=355, S>=0.45, V>=0.45) over the authoritative jet
  // crop x[207,487] y[227,306] returns 279 pixels, modal colour #ff7500
  // (next: #ff6f00, #ff6a00, #ff7600 — all the same orange). The night jet's
  // afterburners are bright orange, not magenta; magenta here is what made
  // the night sheet's pods read as glowing eyes. The procedural night
  // texture in spriteFactory.js already used the daylight orange, which is
  // why the in-game night jet looked right while this sheet did not.
  nozzleCore: L('#ff7500'),
  nozzleHot: L('#ffd600'),
};

// Player barrel-roll palette — EIGHT colours, covering both surfaces the
// roll exposes, because one roll frame shows the astern/ventral greys and
// another shows the dorsal blue-violet (art critique §2.1: t222 "shows the
// dorsal surface in a different colour family entirely").
//
// The blue ladder is MEASURED, replacing the by-eye #8c9ccb/#5a6ba5 that
// stood here. Operator: reference/stage4-barrel-roll-t222.png, airframe box
// x[412,707] y[333,463], mask hue 200-300 deg AND S>0.08 (excludes the
// stage-4 teal sea and the red fireball in the same frame), 10 802 pixels,
// reported as VALUE-BAND MEANS over quintiles — the decile-mean operator I6
// specifies, because a single percentile moves tens of levels on
// mask-boundary detail. Bands: #232d4d, #525f8b, #6474a1, #6d7faf, #8f9fcf.
// Bands 2 and 5 are taken as the two-step ramp; the old by-eye #8c9ccb was
// within 3 levels of band 5, so this confirms rather than overturns it.
//
// The frame is a 1028x720 upscale of a 320x224 native, so this is
// palette evidence, not proportion evidence. Nozzle colour is NOT taken
// from it — the warm pixels in that box are mostly the fireball (#e03121);
// the roll reuses the afterburner orange verified at true native on two
// separate astern frames.
export const PLAYER_ROLL = {
  keyline: '#000000',
  greyLight: L('#c5c5ad'),
  greyMid: L('#a59c8c'),
  greyDark: L('#6b737b'),
  blueLight: L('#8f9fcf'),
  blueDark: L('#525f8b'),
  nozzleCore: L('#ef7308'),
  nozzleHot: L('#ffd600'),
};

// Enemy MiG, "grey" stage-1 livery. The critique's §3 draft (#102910 family)
// was measured on ab2-arcade-closeup-enemies.jpg, a STAGE-2 orange-sky camo
// livery per GAME_SPEC §4 ("dark green/black camo (stage 2)"). R5 interface
// I2 re-measured stage1-missile-salvo-t100.75.png directly (stage-1, the
// sheet this generator targets) and found the airframe reads "mid-grey
// against sky, not white" — confirmed again here by eye on the same frame.
// Per the critique's own §2.2 fallback text: "if we keep grey, the dominant
// must be #31313a-dark, not #c7c7c7" — that is what DARK_DOMINANT is. Hue
// is grey/slate, not green; VALUE is still dark enough for the ~6:1 sky
// contrast target. The green #102910 family is reserved for a future
// camo-livery sheet (stage 2), not drawn in this pass — see delivery report.
export const ENEMY = {
  keyline: '#000000',
  darkDominant: L('#31313a'),
  midGrey: L('#6b737b'),
  lightGrey: L('#9ca4ad'),
  specular: L('#e6eff7'),
  intakeRing: L('#e61000'),
  intakeCore: L('#f7efa5'),
  nozzleCore: L('#ef7308'),
  nozzleHot: L('#ffd600'),
};

export const EXPLOSION = {
  rim: L('#9b0204'),
  deepRed: L('#d6050b'),
  orange: L('#f47a07'),
  hotYellow: L('#f5d619'),
  // I6's measured core is #f6f6e7/#f4ebb8 (S 0.06-0.25), but its max
  // channel (~246) ties hotYellow's V (~0.97) almost exactly, so sorting
  // all pixels by V for the "brightest-decile saturation" operator mixes
  // the two bands and drags the decile's saturation up toward hotYellow's
  // ~0.9 — exactly the defect this frame exists to fix. Pushing the core's
  // max channel to the ladder's 255 (still S<=0.25, within I6's own bound)
  // gives it strictly higher V than hotYellow, so it sorts to the true top
  // of the brightest decile instead of being interleaved with it.
  whiteHot: L('#fffff7'),
  smoke: L('#311000'),
  keyline: '#000000',
};

export const CLOUDS = {
  body: L('#f7eff7'),
  undershade: L('#e6e6f7'),
};

export const HUD = {
  outline: L('#63103a'),
  cream: L('#e6efd6'),
  highlight: L('#f7efa5'),
  red: L('#e61000'),
  amber: L('#f7b500'),
  plaque: L('#f7f7f7'),
};

// Enemy liveries (R5b). The same four liveries src/entities/enemySprite.js
// exports as LIVERIES, in the role names the sheet generator draws with, so
// the authored sheets and the procedural fallback cannot drift apart in
// colour the way the player's day and night sheets did. Sources: GAME_SPEC
// §4 "Liveries observed" for WHICH liveries exist; judging/R4/
// art-critique.md §3 "Enemy MiG — 8 colours, dark-dominant" for the camo
// values (dominant #102910 at V0.16, ~27% of the sprite); R5 interfaces I2
// for stage 1 ("the airframe reads mid-grey against the #009fff sky, not
// white, with near-black nozzle rings and a hot orange centre").
//
// Each livery spends at most 7 of the 8-colour per-sheet budget: the
// head-on sheet uses key/dominant/mid/highlight/specular/intakeRing/
// intakeCore, the rear sheet swaps the last two for nozzleCore/nozzleHot.
function liveryOf(dominant, mid, highlight, specular) {
  return {
    keyline: '#000000',
    dominant: L(dominant),
    mid: L(mid),
    highlight: L(highlight),
    specular: L(specular),
    intakeRing: L('#e61000'),
    intakeCore: L('#f7efa5'),
    nozzleCore: L('#ef7308'),
    nozzleHot: L('#ffd600'),
  };
}

export const ENEMY_LIVERIES = {
  grey: liveryOf('#31313a', '#4a4a52', '#6b6b7b', '#9494a4'),
  camo: liveryOf('#102910', '#2d4a21', '#5a3a19', '#8cad31'),
  interceptor: liveryOf('#4a1010', '#8c2910', '#d64a19', '#ef8429'),
  prop: liveryOf('#313a4a', '#525b6b', '#848c9c', '#b5bdc5'),
};

// Which SILHOUETTE each livery flies. R4 gap 1 criterion (d) wants ">=2
// distinguishable enemy types by silhouette at >=15%W"; colour alone does
// not satisfy it. 'mig' is the thin high-aspect swept wing with separate
// tailplanes; 'delta' is one solid triangle with no tailplane, which reads
// apart from the mig at a glance and from the player's twin-boom F-14 at
// any size.
export const ENEMY_FAMILY = {
  grey: 'mig',
  camo: 'mig',
  interceptor: 'delta',
  prop: 'delta',
};

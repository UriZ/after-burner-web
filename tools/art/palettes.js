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
  nozzleCore: L('#c594f7'),
  nozzleHot: L('#a400d6'),
};

// Player dorsal (barrel-roll top-surface) family — blue-grey, per t222.
export const PLAYER_DORSAL = {
  keyline: '#000000',
  top: L('#8c9ccb'), // measured by eye from stage4-barrel-roll-t222.png dorsal plane
  topShadow: L('#5a6ba5'),
  mid: L('#6b737b'),
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

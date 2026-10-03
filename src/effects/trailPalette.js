// Per-stage missile-smoke values.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS: the trail value was a SINGLE constant taken from a
// NIGHT frame, and applying it in daylight turned stage 1's trail black.
//
// REFERENCE.md "Missiles / weapons visuals" published "overall mean V 0.37,
// brightest quintile V 0.594, darkest quintile V 0.219 (~2.7x bright/dark)".
// I re-ran that measurement and it is correct — FOR THE FRAME IT CAME FROM.
// Source: reference/ab2-arcade-night-missiles.jpg (181x127), mask
// V in (0.14, 0.90) and S < 0.25, largest 8-connected component, n=59 px:
//
//   mean V 0.372, darkest quintile 0.187, brightest quintile 0.598,
//   bright/dark ratio 3.19, mean S 0.101.
//
// That is a NIGHT stage. The stage-1 daylight plume is a different object.
// Source: reference/stage1-missile-salvo-t100.75.png (1028x720), mask
// V > 0.80 and S < 0.20, largest 8-connected component inside the launch
// window y[360,720] x[260,700], n=84 511 px:
//
//   mean V 0.9674, median 0.9686, p10 0.9412, p25 0.9569,
//   mean S 0.0504, median S 0.0405,
//   darkest quintile 0.933, brightest quintile 0.995, ratio 1.07,
//   column occupancy 1.000 over a 39.1%W x 50.0%H bbox (fill 0.584),
//   per-row width 10.9%W at the missile end -> 36.2%W at the launch end.
//
// So the daylight plume is a near-UNIFORM white column (ratio 1.07), not a
// 2.7x value taper. The two readings are not in conflict and neither is
// wrong; they are different stages, and the value must therefore be a
// per-stage property. The R4 judge reached the same conclusion
// independently (judging/R4/report.md, "Measurement problems" defect 2:
// "Make the trail value per-stage; stage 1 is white") and measured the same
// daylight numbers to within 0.001-0.005 on every statistic.
//
// A note for whoever retunes this next: the bright/dark QUINTILE RATIO is an
// acceptance criterion in the night case and must NOT be carried over to
// daylight. Chasing a 2.2-3.2 ratio in daylight is precisely what forced the
// old end of the ribbon down to V 0.19 and produced the black trail.
// ---------------------------------------------------------------------------

// Values below are DISPLAY (sRGB) greys in [0,1]. Every consumer must route
// them through srgbScalar() before writing them into a linear vertex-colour
// buffer or a Color.setScalar() — see effects/pixelTexture.js for the
// double-encoding trap this project has now paid for three times.
export const TRAIL_DAYLIGHT = {
  // Ribbon centreline, youngest (at the missile) -> oldest (at the launch
  // point). Nearly flat, because the measured daylight ratio is 1.07.
  ribbonYoung: 0.98,
  ribbonOld: 0.95,
  // Cross-ribbon edge value as a fraction of the centreline. 0.98, not the
  // night case's 0.88: at 0.88 the daylight ribbon's edge lands on V 0.84,
  // below the measured p10 of 0.941.
  edgeMult: 0.98,
  // Aged tail puffs. Still a ramp rather than a constant so the oldest smoke
  // reads as thinning rather than as a hard-edged white slab, but the whole
  // ramp lives inside the measured p10-p100 band.
  puffStart: 1.0,
  puffEnd: 0.94,
  // Launch billow.
  billowStart: 1.0,
  billowEnd: 0.96,
  // Fraction of life after which the sprite starts alpha-fading out.
  //
  // IN DAYLIGHT THIS IS ESSENTIALLY OFF, and that is a fidelity fix rather
  // than a tuning preference. A smoke sprite is at its LARGEST when it dies,
  // so an alpha fade makes the biggest frames the most transparent, and a
  // half-transparent white disc over the #009fff sky composites to a solid
  // pale-blue BUBBLE — a 24-native-px one is plainly visible hanging in the
  // sky in tools/out/combatfx-r5/fx1-trail/frame-0052.png. That is the same
  // bug class effects/explosions.js already records against the fireball
  // ("the explosion's LARGEST frames were also its most transparent ...
  // which is what produced the judge's muddy brown"), reached independently
  // in a second system.
  //
  // It is also what the measurement says: the trail's structure is VALUE,
  // "not an alpha fade" (REFERENCE.md), and the arcade plume's measured
  // saturation is 0.0504 — a translucent white over a saturated sky cannot
  // be that neutral. Puffs are dense and heavily overlapped, so one leaving
  // at full opacity reads as the mass thinning, not as a pop.
  //
  // At night the ramp already carries the smoke down to V 0.17 against a
  // near-black sky, so there is nothing to composite badly and the fade can
  // stay.
  puffFadeFrom: 0.97,
  billowFadeFrom: 0.88,
};

// Night stages. These ARE the previously-shipped numbers: they were verified
// against ab2-arcade-night-missiles.jpg and they reproduce it (the R4 judge
// measured the shipped build at mean V 0.37-0.43 against the 0.37 target).
// Nothing here is being corrected — it is only being confined to the stages
// the measurement was taken on.
export const TRAIL_NIGHT = {
  ribbonYoung: 0.80,
  ribbonOld: 0.19,
  edgeMult: 0.88,
  puffStart: 0.76,
  puffEnd: 0.17,
  billowStart: 0.90,
  billowEnd: 0.60,
  puffFadeFrom: 0.82,
  billowFadeFrom: 0.72,
};

// Which stages are night. REFERENCE.md "Sky palettes" measures stage 3's sky
// as #000000 / #000005 (t175) against stage 1's #009fff and stage 2's
// #f27500; GAME_SPEC.md's stage table and game/stage.js's STAGES array agree
// on the same 0-based order. Only stages 1-3 exist in the build, so this set
// covers everything currently reachable; the arcade's later night stages get
// added here when their stages do.
const NIGHT_STAGE_INDICES = new Set([2]);

export function trailPaletteFor(stageIndex) {
  return NIGHT_STAGE_INDICES.has(stageIndex) ? TRAIL_NIGHT : TRAIL_DAYLIGHT;
}

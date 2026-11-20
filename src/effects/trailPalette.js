// Per-stage missile-smoke values.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS: REFERENCE.md "Missiles / weapons visuals" published
// "overall mean V 0.37, brightest quintile V 0.594, darkest quintile V 0.219
// (~2.7x bright/dark)" as a single stage-independent constant, and
// implementing it is what turned stage 1's trail black (R4 gap 4).
//
// THAT TRIPLE IS NOW WITHDRAWN ENTIRELY, and the reason matters more than the
// number. I re-ran it on reference/ab2-arcade-night-missiles.jpg and got
// mean V 0.372 from a 59 px low-saturation component, which looked like a
// clean confirmation that the figure was right for ITS frame and wrong for
// daylight. It was not. The R5 criteria pass went further and masked the
// whole frame: the low-saturation pixels there are the HUD reticle and
// attitude line, the SCORE emblem, the SPEED plate, the missile-stock icons,
// the player airframe and the city-light speckle — **that frame contains no
// smoke trail at all**, and 0.37 is reproducible as a whole-frame grey
// average of a night HUD. My 59 px "trail" was a fragment of the same thing.
//
// Recording that because the failure is instructive: a measurement can
// reproduce exactly and still be of the wrong object, and segmenting a
// small region is how you avoid noticing. Mask the whole frame and LOOK at
// what the mask selected before trusting it.
//
// Source: reference/stage1-missile-salvo-t100.75.png (1028x720), mask
// V > 0.80 and S < 0.20, largest 8-connected component inside the launch
// window y[360,720] x[260,700], n=84 511 px:
//
//   mean V 0.9674, median 0.9686, p10 0.9412, p25 0.9569,
//   mean S 0.0504, median S 0.0405,
//   darkest quintile 0.933, brightest quintile 0.995, ratio 1.07,
//   column occupancy 1.000.
//
// R40 — THE TWO GEOMETRY ROWS THAT USED TO FOLLOW ARE WITHDRAWN ("39.1%W x
// 50.0%H bbox, fill 0.584" and "per-row width 10.9%W at the missile end ->
// 36.2%W at the launch end"). That component is a stage-1 cumulus billboard
// fused with the sea foam, not a trail; the stated window cropped it rather
// than excluding it. The VALUE and SATURATION rows above are unaffected —
// they reproduce on real trails, which is why this palette stands. Real trail
// geometry: body 4.0-8.0 %W, widest point 11.6 %W, length 27-43 %W, coverage
// 2.0-3.1 % of screen. See judging/R40/missile-smoke/NOTES.md §1-2 and the
// corrected "Trail geometry" block in REFERENCE.md.
//
// So the daylight plume is a near-UNIFORM white column (ratio 1.07), not a
// 2.7x value taper.
//
// THE TRAIL IS WHITE ON NIGHT STAGES TOO — only about 6% dimmer. R4 proposed
// a per-stage value split on the assumption that the night figure was real;
// it was not, and REFERENCE.md "The smoke trail is WHITE — in every stage"
// now measures stage 3 directly (60 fps t178 and t182): mean V 0.909 / 0.901,
// median 0.922 / 0.914, p10 0.804 / 0.788, mean saturation 0.055 / 0.053.
//
// Published acceptance: **stage 1 mean V >= 0.90 and mean saturation <= 0.10;
// night stages >= 0.85 / <= 0.10.** The bright/dark quintile ratio is NOT an
// acceptance criterion anywhere — it came from the same unreproducible night
// measurement and REFERENCE.md now flags it unverified. Do not tune to it.
// Chasing a 2.2-3.2 ratio is exactly what forced the old end of the ribbon
// down to V 0.19 and produced the black trail.
//
// The per-stage split is KEPT rather than deleted because the 6% is itself
// measured, and because the same stage index drives enemy liveries — but the
// two palettes are now neighbours, not opposites.
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
  // Cross-ribbon edge value as a fraction of the centreline. Kept near 1:
  // the old 0.88 put the ribbon's edge on V 0.84, below this plume's
  // measured p10 of 0.941, and a wide cross-ribbon ramp reads as a shaded
  // 3D tube rather than a flat arcade slab.
  edgeMult: 0.98,
  // Aged tail puffs. Still a ramp rather than a constant so the oldest smoke
  // reads as thinning rather than as a hard-edged white slab, but the whole
  // ramp lives inside the measured p10-p100 band.
  puffStart: 1.0,
  puffEnd: 0.94,
  // Launch billow.
  billowStart: 1.0,
  billowEnd: 0.96,
  // RETIRED R7 — NO LONGER READ BY ANYTHING. Kept with its note because the
  // note is the argument, and the argument won: effects/smoke.js now holds
  // every sprite opaque for its whole life, which is what a value of 0.97
  // was approximating anyway. Deleting the field would delete the reason.
  //
  // Fraction of life after which the sprite used to start alpha-fading out.
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
  puffFadeFrom: 0.97,
  billowFadeFrom: 0.88,
};

// Night stages. Still white — REFERENCE.md's stage-3 measurements (60 fps
// t178/t182) give mean V 0.909/0.901 with p10 0.804/0.788 and saturation
// 0.055/0.053, against stage 1's 0.962/0.053. So this is the daylight
// palette scaled down ~6%.
//
// EVERY ENDPOINT SITS AT OR ABOVE ITS STAGE'S ACCEPTANCE FLOOR (0.90 day,
// 0.85 night). The rendered mean is bounded by the endpoints, so holding
// that invariant makes the acceptance criterion impossible to fail by
// tuning here — which is the property the old palette lacked. The arcade's
// own p10 does dip to 0.79 at night, so a darker tail would still be
// defensible; it is left out because nothing needs it and the invariant is
// worth more than the last 0.05 of a tenth percentile.
//
// It is NOT the old 0.80 -> 0.19 ramp. That ramp was built to satisfy a
// 2.7x quintile ratio measured off a frame with no trail in it, and it
// would render roughly mean V 0.37 here — failing the published night
// criterion by 0.48, i.e. further from the arcade than the daylight palette
// would have been if left unswitched.
export const TRAIL_NIGHT = {
  ribbonYoung: 0.94,
  ribbonOld: 0.87,
  edgeMult: 0.96,
  puffStart: 0.94,
  puffEnd: 0.86,
  billowStart: 0.95,
  billowEnd: 0.88,
  // Same reasoning as daylight: a half-faded white sprite over a dark sky is
  // a grey ghost rather than smoke, and the measured structure is value, not
  // alpha.
  puffFadeFrom: 0.95,
  billowFadeFrom: 0.86,
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

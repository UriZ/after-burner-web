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

// Player F-14, DAYLIGHT palette.
//
// R6: THE V<=0.77 CEILING IS RETIRED, and every airframe value below is now
// read off the arcade's own sprite instead of off a quantizer's cluster
// centroid. R4 published "the arcade's brightest airframe value is #c5c5ad
// at V 0.77"; that was the brightest CENTROID of a median-cut quantization
// of a video-upscaled frame, not a pixel. Two R5 reviewers found the
// consequence independently (art-critique.md §3.2; judging/R5/report.md gap
// 4): our brightest colour sat at or below the arcade jet's MEDIAN, so the
// jet read warm grey where the arcade's reads white, and the player could
// not pick their own aircraft out of a sky of same-sized enemies.
//
// OPERATOR (V-CENSUS, stated so it can be re-run): population = every pixel
// of reference/ab2-arcade-desert.png (one of the two TRUE-NATIVE 320x224
// arcade PNGs in this repo, so no video blur) in the player-jet box
// x[85,182] y[82,140], which is REFERENCE.md's own published daylight-jet
// crop. Achromatic = saturation (max-min)/max < 0.35 AND V = max(R,G,B)/255
// > 0.08 — JET-SIL's sky-mode airframe mask. That isolates the jet cleanly
// here because the desert sky and ground are S=1.00. n = 672 px, and the
// ladder it returns, with each tone's share of the airframe:
//
//     #ffffef  V 1.000  35.6%      #d6d6a4  V 0.839   8.3%
//     #f7e6b5  V 0.969  26.5%      #ffffff  V 1.000   3.7%
//     #a48484  V 0.643  14.3%      #948463  V 0.580   3.1%
//     #ceb59c  V 0.808   6.1%
//
// 62% of the arcade's airframe is at V >= 0.969 and its achromatic MEDIAN is
// 0.969. Ours was 0.643 with a maximum of 0.773 (same operator, sheet cell 4).
//
// WHERE THIS DELIBERATELY STOPS SHORT OF THE ARCADE, and why. The R5 judge's
// gap-4 reproduction asks for a median in 0.78-0.92 with the brightest body
// colour >= 0.90. That band was taken from 686x480 VIDEO frames, where edge
// blur mixes white airframe with blue sky and depresses the median (my own
// run of the same operator on stage1-level-flight-t116.png x[270,430]
// y[185,278] gives 0.792). The native frame says 0.969 — ABOVE the band's
// own ceiling. The median of a 4-tone sprite can only land ON one of its
// four values, so 0.969 and 0.92 cannot both be satisfied: this palette
// targets the TOP of the published band (median 0.902) rather than the
// arcade's 0.969, and that gap is a known, stated under-shoot, not a
// measurement. See judging/R6/lane-sprite-art.md.
//
// ========================= R7: THE RIM, MEASURED =========================
// R6 kept #000000 as BOTH the outline and the nozzle throat, on the grounds
// that "the arcade's own native jet crop carries 135 px of exact #000000".
// That is true and it was the wrong conclusion, because it did not ask WHERE
// those 135 px are. Operator (tools/art/value_census.py, --selftest PASS):
// airframe = S<0.35, largest 8-connected component, on the same true-native
// crop; RIM = the pixels 4-adjacent to that mask and outside it.
//
//   arcade airframe  751 px, 18.0 % of it #000000 -- and the mask dump shows
//                    that black is TWO NOZZLE DISCS, nothing else.
//   arcade RIM       444 px: 49.5 % #840000, 14.6 % #e67300 (the desert
//                    ground), ... and 0.0 % near-black. There is no black
//                    outline on the arcade's daylight jet at all.
//   ours R6          airframe 1100 px, 32.8 % #000000; RIM 0.0 % near-black
//                    because our black is INSIDE the mask -- it is the ring.
//
// #840000 is the player sprite's OWN colour, not a stage tint and not the
// ground: it occurs 224 times in the whole 320x224 frame and 222 of those
// are on the aircraft (the other 2 are the wing continuing past the crop
// box). tools/out/sprite-r7/arcade/desert-840000-map-8x.png maps them: a
// one-sided dark-red keyline down the LOWER edge of every element, with the
// upper edges left bare. The arcade shades its edge; R6 outlined it, which
// is judging/R6/art-critique.md rank 2 ("ringed in pure black") and judge
// gap 4 ("the keyline and shadow tones carry too much of the sprite") seen
// from two sides -- they are one defect.
//
// STAGE LICENCE, per REFERENCE.md "every palette criterion names its stage":
// measured on ab2-arcade-desert.png, HUD digit 2, licensed for DAYLIGHT
// stages. The night sheet keeps its own measured darkest blue-grey as its
// rim, exactly as the arcade's night palette does -- see PLAYER_NIGHT.
export const PLAYER = {
  keyline: '#000000', // nozzle throats ONLY now, which is where the arcade's is
  rimline: L('#840000'), // V0.518 S1.000 -- MEASURED, 49.5 % of the arcade's rim
  lightTop: L('#ffffef'), // V1.000 -- MEASURED arcade dominant, 31.8% of its airframe
  lightNeutral: L('#f7e6b5'), // V0.969 -- MEASURED arcade SECOND tone, 23.7%.
  // R6 left this one out of the 8-role sheet, and that omission is most of
  // what kept the median a step low: the arcade puts a QUARTER of its
  // airframe on a tone our sprite did not carry at all. Note S=0.267, which
  // is just outside VALUE-STAT's S<0.25 gate -- it counts in reading C and
  // not in A or B, and that asymmetry is why all three readings have to be
  // published together.
  warmMid: L('#ceb59c'), // V0.808 -- MEASURED, 5.5% (new to the sheet in R7)
  midNeutral: L('#d6d6a4'), // V0.839 -- MEASURED arcade mid tone, 7.5%. The
  // first R6 draft used #e6e6c5 (V0.902) to put the achromatic MEDIAN at the
  // very top of the judge's 0.78-0.92 band. Cropped and looked, per the
  // standing rule, and the lead flagged the same thing independently: at
  // dV 0.098 from #ffffef it is invisible, and the airframe read as one flat
  // white blob with no modelling at all. #d6d6a4 is a visible step, it is a
  // colour the arcade's own jet actually carries, and the median lands at
  // 0.839 -- mid-band and exactly the figure the R5 judge quotes for the
  // arcade's stage-1 jet. A median one step lower with real form beats a
  // median at the top of the band with none.
  coolDark: L('#a48484'), // V0.643 -- MEASURED arcade shadow tone, 12.8%
  warmShadow: L('#948463'), // V0.580 -- MEASURED, 0.4% (3 px; too small to author)
  deepWarmShadow: L('#635252'), // V0.388 -- MEASURED; the arcade jet has NO airframe tone
  // darker than this. The old #422921 (V0.259) was darker than anything on
  // the arcade's aircraft except its nozzle throat.
  specular: L('#ffffff'), // MEASURED on the arcade's own DAYLIGHT jet, and it
  // is tiny: an isolated census of reference/ab2-arcade-desert.png x[80,180]
  // y[82,142] (the true-native banked jet, achromatic + named-accent mask,
  // largest 8-connected component, holes filled) returns 984 airframe px of
  // which #ffffff is 6 and #f7f7f7 is 1 -- 0.7 % between them, above
  // #ffffef's 239. The arcade puts a handful of pure-white pixels on the
  // brightest edges and nothing else.
  //
  // This is the ELEVENTH colour on the day sheet and the roles() comment
  // already carries the licence: the same crop's own census is 14 colours
  // with 7 covering 95 %, so 11 is still below the arcade's daylight count.
  // PLAYER_NIGHT maps this role onto its existing lightTop, so the NIGHT
  // sheet gains no colour and stays on its measured 8 + burner.
  //
  // IT ALSO FIXES THE DEATH HULK'S MISSING HIGHLIGHT, and the ORDER of those
  // two reasons matters. R8 left open "our hulk's p95 reads 123 against the
  // arcade's 144", and the R8 critique then argued (section 5a) NOT to chase
  // that number, because the target is a night, video-decoded, codec-smeared
  // measurement applied to a daylight object -- the exact family of criterion
  // this project has retired twice. So this tone is NOT sized to hit 144. It
  // is sized to the arcade's daylight census, 0.7 %, and the hulk's top rung
  // follows because deathSequence.js's histogram match needs the brightest
  // tone under 2.5 % of the sheet to place it on the arcade's own top value.
  // Two independent reasons, the sheet one load-bearing; see
  // tools/art/hulk_probe.py.
  canopy: L('#e694f7'), // MEASURED: REFERENCE.md's own daylight-jet 7-colour
  // 95% set lists #e694f7. The old #9d3aca was a dark violet two thirds of
  // that value and is not in the arcade's set.
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
// R7: the six measured blue-greys are now ALL used, mapped onto the day
// sheet's ramp POSITION BY POSITION, so the two sheets are the same drawing
// with the same role areas and differ only in which ladder they index:
//
//   lightTop  #c5d6f7 0.969 <-> #ffffef 1.000      warmMid  #7384b5 0.710 <-> #ceb59c 0.808
//   lightNtrl #a4b5e6 0.902 <-> #f7e6b5 0.969      coolDark #6373a4 0.643 <-> #a48484 0.643
//   midNeutrl #8494c5 0.773 <-> #d6d6a4 0.839      rim/key  #425284 0.518 <-> #840000 / #000000
//
// `coolDark` moves one step down the measured ramp (#7384b5 -> #6373a4) so
// the index correspondence holds; both were already in the measured 8.
// The rim and the keyline are the SAME hex at night, which is the arcade's
// own night palette (there is no black in the measured night set) -- so the
// night sheet's colour count does not rise with R7's one-sided rim.
export const PLAYER_NIGHT = {
  // `specular` exists so levelOps()'s shared drawing program can read the
  // role on BOTH sheets -- assertRoles() throws otherwise, and an undefined
  // hex does not throw inside PixelCanvas.set(), it ERASES (the R7 roll-sheet
  // hole bug). It is deliberately the SAME hex as lightTop: the measured
  // arcade night jet is exactly 8 colours and carries no white, so night
  // gains a role and no colour.
  specular: L('#c5d6f7'),
  keyline: L('#425284'),
  rimline: L('#425284'),
  lightTop: L('#c5d6f7'),
  lightNeutral: L('#a4b5e6'),
  midNeutral: L('#8494c5'),
  warmMid: L('#7384b5'),
  coolDark: L('#6373a4'),
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
// R6: the three greys track PLAYER's retired V<=0.77 ceiling (gap 4). They
// are the same measured arcade ladder, so the roll cannot read darker than
// the level poses it interrupts.
// R7: ELEVEN colours, and the two new greys are not decoration. The roll
// sheet calls levelOps() -- the SAME drawing program as the level poses -- so
// when R7 added the #f7e6b5 and #ceb59c rungs to that program, every polygon
// using them arrived here with an UNDEFINED hex. PixelCanvas.set() treats a
// null/undefined hex as "erase to transparent", so the roll sheet silently
// grew holes: cell 0 lost 104 of its 1 176 opaque pixels and cell 2 lost 39
// of 407, with no error, no warning, and assertPalette still passing because
// the colour COUNT went down rather than up. sheet_visibility.py passed it
// too -- a sprite with bites out of it is still visible.
//
// So: the roll's grey ramp now carries all five day rungs, and it takes the
// day sheet's #840000 rim as well. A roll interrupts the level poses; if it
// keyed in black while they key in dark red it would read as a different
// aircraft for the eight frames it is on screen. (It is still unwired.)
export const PLAYER_ROLL = {
  keyline: '#000000',
  rimline: L('#840000'),
  greyLight: L('#ffffef'),
  greyCream: L('#f7e6b5'),
  greyMid: L('#d6d6a4'),
  greyWarm: L('#ceb59c'),
  greyDark: L('#a48484'),
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
// Each livery spends the full 8-colour per-sheet budget: the head-on sheet
// uses key/shadow/dominant/mid/highlight/specular/intakeRing/intakeCore, the
// rear sheet swaps the last two for nozzleCore/nozzleHot.
//
// ====================== R6: STAGE-1 POLARITY REVERSED ======================
// R4 prescribed a near-black enemy dominant, derived from
// reference/ab2-arcade-closeup-enemies.jpg. That frame is an ORANGE-SKY
// STAGE-2 close-up of green camo MiGs (GAME_SPEC §4 puts camo on stage 2),
// and the prescription was applied to every livery including stage 1's.
// judging/R5/art-critique.md §3.3 caught it; this is the fix.
//
// OPERATOR (ENEMY-V, re-run independently here rather than taken on trust):
// crop the aircraft, reject the sky (day: R<60 AND B>170 AND B>R+100 — the
// #009eff family and the whole video-blur ramp out of it; night: max(RGB)<=40),
// and report V = max(R,G,B)/255 median plus the share below 0.3 and above 0.7,
// which are the three figures the critique states its claim in.
//
//   ARCADE stage 1, reference/stage1-level-flight-t116.png (HUD stage digit
//   reads 1) x[150,195]-[266,256], n=2641:  median 0.627, V<0.3 11.9%,
//   V>0.7 38.6%.  The critique's own independent crop of t100.75 gave
//   0.557 / 23.2% / 41.1% — different frame, same answer.
//   OURS, enemy-grey-rear.png cell 2, airframe only: median 0.322,
//   V<0.3 43.7% (61% with the black keyline counted, which is the critique's
//   figure), V>0.7 4.9%. Opposite polarity, and not marginally.
//
//   ARCADE stage 3 NIGHT, reference/stage3-night-lockon-t186.png (digit reads
//   3) x[288,172]-[303,187], n=37: median 0.675, V<0.3 27.0%, V>0.7 48.6%,
//   dominant a SATURATED BLUE (#222fa5 / #2340be / #3c59d7 family). The night
//   enemies are bright blue against the black sky, not darker than the day
//   ones. Our night ramps were darker again (grey night dominant V 0.192).
//
// WHAT I DID NOT DO. I did not tune to those medians to two decimal places.
// Both arcade readings are from 686x480 video upscales; blur mixes airframe
// with sky, which biases the day figure UP (bright sky) and the night figure
// DOWN (black sky), and the two day frames disagree by 7 points of median and
// 11 points of V<0.3. The ramps below are set so the airframe's value
// DISTRIBUTION brackets the arcade's — median in 0.54-0.68, roughly 45% above
// V 0.7, the dark share carried by the keyline and a shadow tone — and the
// residual is stated in judging/R6/lane-sprite-art.md rather than hidden in a
// tuned constant.
//
// CAMO AND PROP ARE DELIBERATELY LEFT DARK. GAME_SPEC §4 puts camo and the
// silver/blue props on stage 2, whose sky is orange: there the arcade's own
// enemies ARE dark against a bright sky (reference/ab2-arcade-desert-
// explosions.png). The defect was applying stage 2's polarity to stage 1,
// so the fix must not apply stage 1's polarity to stage 2.
// R8: THE KEYLINE IS NO LONGER THE PERIMETER, ON ANY LIVERY.
// `keyline` below is still '#000000' and is still DRAWN -- but only inside
// the nose intake and the nozzle housing, which is the only place the arcade
// puts near-black on an aircraft (measured on the stage-1 enemy at t104 and
// on the player's own native desert crop, two different frames, two different
// aircraft, same answer). The outer silhouette is now a ONE-SIDED lower edge
// in `shadow`, the livery's own darkest airframe tone, via
// PixelCanvas.outlineSouth(). There is deliberately no separate `rim` role:
// the arcade's rim IS its darkest airframe band (stage-1 enemy, bottom-most
// row median V 0.661 against an interior median of 0.788 and a top-most row
// of 0.953), so inventing a ninth colour for it would be inventing a colour
// the arcade does not have and would blow the 8-per-sheet budget.
//
// R8b: `rim` IS A ROLE NOW, and it defaults to `shadow` so nothing changes by
// day. Night needed the split and the reason is measured. The night ramps'
// darkest rung sits at V 0.388 where the day ramps' sits at 0.580, so putting
// the one-sided rim on rung 1 at night painted ~40 % of the sprite in a blue
// that is almost invisible against stage 3's BLACK sky -- and it took the
// rear sheet's median from 0.643 to 0.388 against R6's arcade figure of 0.675
// (reference/stage3-night-lockon-t186.png, HUD digit 3). That is a
// readability loss and a worse number at the same time, which is the signal
// that it is wrong rather than a trade. `nightRim` therefore names rung 2.
// A rim role costs no colour: it always aliases a rung the sheet already has.
function liveryOf(shadow, dominant, mid, highlight, specular, night, rims = []) {
  const [dayRim = shadow, nightRim = night[0]] = rims;
  return {
    keyline: '#000000',
    rim: L(dayRim),
    shadow: L(shadow),
    dominant: L(dominant),
    mid: L(mid),
    highlight: L(highlight),
    specular: L(specular),
    intakeRing: L('#e61000'),
    intakeCore: L('#f7efa5'),
    nozzleCore: L('#ef7308'),
    nozzleHot: L('#ffd600'),
    night: {
      rim: L(nightRim),
      shadow: L(night[0]),
      dominant: L(night[1]),
      mid: L(night[2]),
      highlight: L(night[3]),
      specular: L(night[4]),
    },
  };
}

export const ENEMY_LIVERIES = {
  // stage 1 (ocean, #009eff sky). Pale grey-white MiG-types, which is also
  // what GAME_SPEC §4 says they are ("white/grey MiG-types (stage 1+)").
  //
  // ===================== R8: MEASURED OFF THE ARCADE ======================
  // R6 lifted this livery's polarity but set the ladder by bracketing two
  // blur-biased medians rather than by reading the arcade's own ramp. The
  // ramp is readable, and the five values below ARE it.
  //
  // OPERATOR (re-runnable): ab2-longplay-60fps.mp4 at t=104s -- inside the
  // VERIFIED stage-1 span 88-120 of STAGE_MAP.md, and the HUD stage digit in
  // the frame reads 1. Frame written with `-frames:v 1` (no -ss sequence, per
  // CLAUDE.md). Crop x[400,575] y[290,400] holds one rear-aspect enemy.
  // Airframe = S<0.30 AND V>0.176, largest 8-connected component, then
  // ERODED TWICE 8-connectedly -- the erosion is the whole point, because the
  // source is a 3.2125x AV1 upscale and the boundary ring is blur-mixed with
  // a V=1.0 sky. 2 496 interior px survive. Reported as quintile means (the
  // decile/quintile-mean operator REFERENCE.md I6 specifies, because a single
  // percentile moves tens of levels on mask-boundary detail):
  //
  //     q1 V 0.587 (145,143,143)   q4 V 0.910 (224,221,223)
  //     q2 V 0.687 (169,165,169)   q5 V 0.988 (248,241,244)
  //     q3 V 0.790 (194,193,192)
  //
  //   interior median V 0.788, 47.0 % above V 0.8, and **0.0 % below V 0.4**.
  //
  // Every band is NEUTRAL (max channel spread 4/255 at q1, 7/255 at q5).
  // The arcade's stage-1 enemy is a neutral white-grey, and that is also the
  // readability axis against the player, whose measured airframe is WARM
  // cream (#ffffef / #f7e6b5). Ours was #737b8c-blue and two rungs darker.
  //
  // Snapped onto the Sega ladder the five bands are 148 / 173 / 197 / 230 /
  // 255 -- deltas -0.007, -0.009, -0.017, -0.008, +0.012 of V. That is this
  // table, with `dominant` taking the band at the arcade's MEDIAN (0.773)
  // because `dominant` is the largest-area role in the drawing, and `mid`
  // taking the band below it because the two are the lit and shaded sides of
  // one aeroplane.
  //
  // AND THE RIM. Same operator, un-eroded, topmost and bottommost airframe
  // pixel per column (160 columns):
  //
  //     TOP-most row    median V 0.953   0.0 % below V 0.5
  //     interior                  0.788
  //     BOTTOM-most row median V 0.661   5.6 % below V 0.5
  //
  // The arcade's stage-1 enemy is lit from above and shaded below, and it has
  // NO KEYLINE: mapping the dark rim pixels (tools/out/enemy-art/
  // ARC-t104-rimmap-5x.png) puts every one of them around the NOZZLE
  // HOUSING, and leaves the entire outer perimeter bare against the sky.
  // This is the same finding R7 published for the player's daylight jet,
  // on a different aircraft, from a different frame.
  //
  // So `rim` is not a new colour: the one-sided lower edge is drawn in the
  // livery's own darkest airframe tone (`shadow`), which is what the arcade
  // does and what keeps every sheet inside its 8-colour budget. See
  // liveryOf() above.
  //
  // ROLE->RUNG, and this is where the first R8 draft got it wrong. Snapping
  // the five rungs is not enough: the sprite's VALUE DISTRIBUTION is set by
  // which role draws how many pixels, and `shadow` carries the one-sided rim
  // plus the under-bands (43 % of the cell). A first pass that mapped
  // dominant->0.773 and mid->0.678 put 58 % of the sprite at or below 0.678
  // and read median 0.678 with only 17 % above V 0.8 -- further from the
  // arcade on the brightness share than the sheet it replaced, while every
  // individual rung was correct. Measured, not guessed: the census is in the
  // delivery report. The mapping below puts the two largest interior masses on
  // 0.902 and leaves 0.580 to the rim and the under-bands, which is where the
  // arcade's dark is.
  grey: liveryOf('#949494', '#e6e6e6', '#c5c5c5', '#adadad', '#ffffff',
    ['#101963', '#6b8ce6', '#3a5bc5', '#2131a4', '#adc5ff'],
    ['#adadad', '#2131a4']),
  // stage 2 (desert, orange sky). Dark green camo — MEASURED dominant
  // #102910 at V0.16 on ab2-arcade-closeup-enemies.jpg, which IS a stage-2
  // frame and so is the right source for this livery. Left dark on purpose.
  camo: liveryOf('#081008', '#102910', '#294a21', '#5a3a19', '#8cad31',
    ['#080c21', '#102142', '#214a5a', '#4a6b6b', '#8cad9c'],
    ['#102910', '#102142']),
  // red/orange-fuselage interceptors (t102.5, t172). Flown as the ELITE on
  // stage 1 as well as stage 2 (src/entities/enemy.js LIVERY_BY_STAGE), so it
  // gets the stage-1 lift too: dominant V 0.290 -> 0.549.
  interceptor: liveryOf('#4a1010', '#8c2910', '#d64a19', '#ef8429', '#ffce84',
    ['#210810', '#6b1931', '#a53a5a', '#d6738c', '#ffb5c5'],
    ['#8c2910', '#6b1931']),
  // silver/blue prop types, stage 2 open only. Orange sky — left dark.
  prop: liveryOf('#21293a', '#313a4a', '#525b6b', '#848c9c', '#b5bdc5',
    ['#101829', '#21293a', '#3a425a', '#5b6b84', '#8c9cbd'],
    ['#313a4a', '#21293a']),
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

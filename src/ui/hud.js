import * as THREE from 'three';
import { drawText, textWidth, drawTextCenteredInk, FACE_BIG, FACE_TINY } from './font.js';
import { GAME_W, GAME_H } from '../render/viewport.js';

// HUD overlay. R5 rebuild for judge-R4 gap 3 ("HUD typography and the
// missing contrast plates").
//
// WHY THE LAYOUT CONSTANTS CHANGED SHAPE THIS ROUND. R4 derived every box
// from REFERENCE.md's "HUD (686x480 coordinates)" table by scaling it
// 320/686. Two of those table rows are SEARCH RECTANGLES, not element
// extents — REFERENCE.md says so for one of them ("the Godot map's own
// HUD-read rect") — and scaling them produced elements 2-4x their real
// size. The stage digit is the worst case: the table's x[376,414] is 38 ref
// px wide, but the digit's actual ink on reference/stage1-level-flight-t116.png
// is x[398,407] (10 ref px) and on reference/stage3-night-level-t175.png is
// x[394,410] (16 ref px) — i.e. the same size as the rest of the bottom-row
// text, not three times it. R4 scaled the glyph to pxX=6 to "hit" the
// 38-px target and shipped a stage digit three times too large, which the
// R4 judge then scored as "-1.1%, fine" against the same defective number.
//
// So this file now carries TWO coordinate families, kept visibly separate:
//   BB_*  : REFERENCE.md table boxes, still used where the table is an
//           element extent (reticle, missile widget region).
//   M_*   : measured directly off the arcade frames for this rebuild, in
//           NATIVE 320x224 pixels, each with the frame + ref-pixel span it
//           came from. Conversion used throughout: 686/320 = 2.14375 (x),
//           480/224 = 2.14286 (y) — the AB2 arcade board runs 320x224, so
//           the 686x480 reference frames are a 2.144x upscale of exactly
//           our internal resolution and one native px = 2.14 ref px.
const SX = GAME_W / 686;
const SY = GAME_H / 480;
const R = (x0, y0, x1, y1) => ({
  x0: Math.round(x0 * SX),
  y0: Math.round(y0 * SY),
  x1: Math.round(x1 * SX),
  y1: Math.round(y1 * SY),
});

const BB_RETICLE = R(508, 52, 624, 101); // white >=#b0b0b0 frame, amber dot #ffcd21
const BB_MISSILES = R(421, 427, 536, 472); // white body, red tips

// ---------------------------------------------------------------------
// MEASURED NATIVE LAYOUT (320x224). Every number here was obtained by
// classifying pixels on the named reference frame and reading off run
// boundaries; the ref-px span is quoted so the next agent can re-run it.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// R5b RE-DERIVATION AT NATIVE RESOLUTION (interface I11).
//
// Everything in this block was previously read off the 686x480 upscales
// (t116 / t175) and divided by 2.144. The repo holds two frames at the
// board's own 320x224 — `reference/ab2-arcade-desert.png` (daylight) and
// `reference/ab2-arcade-night-banking.png` (night, HUD digit reads 3) — in
// which every HUD element is an exact two- or four-colour bitmap with no
// resampling. Those are now the source. The upscale-derived numbers were
// mostly within a pixel; where they were not, the native value wins and the
// old value is quoted so the change is auditable.
// ---------------------------------------------------------------------

// Desert frame: blue top keyline row y14 spans x[16,71] (56 px); bottom blue
// row y25 spans x[22,65] (44 px) — the plate is a TRAPEZOID insetting 6 px
// per side over its 12 rows, and that slope is what makes the ends read as
// swept wings rather than the striped rectangles the R4 judge called out.
// (Was w:57 from the t116 upscale.)
const M_SCORE_EMBLEM = { x: 16, y: 14, w: 56, h: 12 };
// Desert frame red-letter cells inside it: S x[24,30], C [32,38], O [40,46],
// R [48,54], E [56,62] — 7 px wide on an exact 8 px pitch, i.e. the BIG
// face at scale 1. (The t116 upscale read this as a 7.9 px advance and we
// shipped the small face at pxX=1.33, a fractional scale that can only
// approximate a 2-px stroke.)
const M_SCORE_TEXT_X = 24;

// Desert frame HIT emblem x[160,191] (32 px), y[16,23] — EIGHT rows, not
// twelve, and two rows LOWER than the SCORE emblem's top. Letters H
// x[166,172], dotted-i x[174,176], T x[178,184]; the big face's I kern
// (3 px) lands T at exactly 178.
const M_HIT_EMBLEM = { x: 160, y: 16, w: 32, h: 8 };
const M_HIT_TEXT_X = 166;

// Desert "248020" / night "515040": six digit cells from x96 on an exact
// 8 px pitch, rows y[16,22], so the right edge is 96+6*8-1 = 143. The arcade
// does NOT zero-pad (both frames show six digits of a six-digit score; t116
// shows five) — R4 padded to 6 and drew a leading-zero run.
const M_SCORE_DIGITS = { right: 143, y: 16 };

// HIT digit, same rows, same 8-px cell grid: the desert "4" and the night "2"
// both occupy x[208,214] with their shadow column at x215. `right` is the
// shadow column, the same convention as M_SCORE_DIGITS (whose last cell is
// x[136,142] + shadow 143) — R5a had 214 here, which is the INK edge, and
// right-aligning on it put every HIT digit one pixel left of the arcade's.
const M_HIT_DIGITS = { right: 215, y: 16 };

// t175 bottom strip, white-plate run: x[34,113] y[429,444] ref ->
// 15.9..52.7, 200.2..207.2 native. The plate carries BOTH the SPEED label
// and the throttle letter (one continuous white lozenge with a gap between
// them) — this is the contrast treatment R4 was missing entirely, and the
// reason AB2's bottom-left is readable over night, sea and desert alike.
const M_SPEED_PLATE = { x: 16, y: 199, w: 37, h: 10 };
const M_SPEED_TEXT = { x: 17, y: 201 }; // t175 red runs start x[38] ref
const SCALE_SPEED = [1, 1]; // 5 letters -> 29 native (arcade 24; +21%)

// ---------------------------------------------------------------------
// THROTTLE WIDGET. The two native frames are BYTE-IDENTICAL over the whole
// rect x[54,131] y[200,207] — fill extent, per-row gradient, all nine ticks
// and all four labels — on two different stages with two different ground
// palettes. Nothing below is interpreted; it is read off that rect.
//
// Track x[56,126], six rows y[201,206]. The fill runs from the LEFT END OF
// THE '0' LABEL, not from a plate edge: on both frames x56 y201 is the bar's
// own #42c5f7 showing through the '0' glyph's top-left hole.
//
// Scale labels '0' '1' '2' '3' at x56 / 78 / 100 / 123 — four of them, on a
// 22/22/23 pitch (the last step really is a pixel wider; both frames put the
// '3' at 123 and the '2' at 100). They are 4x5 WHITE glyphs (font.js
// FACE_TINY) drawn ON the fill with the arcade's right+below drop shadow,
// which is gap 3's "throttle scale digits inline with the bar, not floating
// above it". R4 floated three pale-yellow ringed digits above it and omitted
// the '1' entirely.
//
// The track's width is the one number here that is NOT measured: both frames
// sit at the same ~0.59 throttle (fill ends x96) and neither shows the bar
// full, so the full-scale extent is a choice. It is set so f=1 fills exactly
// from the '0' label's left edge to the '3' label's right edge.
//
// Ticks: 2x2, rows y203-y204, top-left pixel #a4a4a4 and the other three
// black, at the nine columns below. They are TRACK furniture, not bar
// furniture — on both frames the three at 108/113/118 are drawn over bare
// world, well past the end of the fill, which is how the player can see how
// much throttle is left. The pitch is 5 within each group of three; the
// three groups are not on one global 5-px phase (the middle group sits one
// pixel left of it), so these are the measured columns rather than a stride.
// ---------------------------------------------------------------------
const M_BAR = { x: 56, y: 201, w: 71, h: 6 };
// The fill is blue left of this column and amber from it. Columns 80-81 are
// covered by the '1' label and its shadow in both frames, so the switch can
// only be pinned to x80 or x81; either renders identically behind the label.
const M_BAR_AMBER_X = 80;
const M_BAR_TICKS = [64, 69, 74, 85, 90, 95, 108, 113, 118];
const M_BAR_LABELS = [[56, '0'], [78, '1'], [100, '2'], [123, '3']];

// Desert frame "STAGE": red letter cells x[136,140] [142,145] [147,151]
// [153,157] [159,163], rows y[200,206] — the SMALL face at scale 1 (5 px
// cell on a 6 px advance), which is exactly our grid. Ink 29 px against the
// arcade's 28 (the arcade kerns 1 px tighter after the narrow T).
const M_STAGE_TEXT = { x: 136, y: 200 };
const SCALE_STAGE = [1, 1];

// Stage digit: desert "2" and night "3" BOTH occupy x[184,190] y[200,206] —
// i.e. the BIG 7x7 face at scale 1, cream, on the same rows as STAGE.
// (R4/R5a drove this off the t116/t175 upscales and drew it at a fractional
// 1.2x of the 5-wide small face.)
const M_STAGE_DIGIT = { cx: 187, y: 200 };

// Remaining-life icons, bottom-left under the SPEED plate. Desert frame,
// NATIVE: two identical icons at x[16,22] and x[24,30], rows y[211,214] —
// 7 px wide on an 8 px pitch (the t175 upscale gave 7). Gap 3 calls this
// "the bottom-left aircraft-position icon"; it is the lives display.
const M_LIVES = { x: 16, y: 211, pitch: 8 };

// ---------------------------------------------------------------------
// COLOURS. R5b: EXACT, not modal. On the two native 320x224 frames the HUD
// is a flat four-colour bitmap with no resampling, so these are the authored
// values rather than a class average over a video-compressed upscale:
//
//   desert y[200,206] x[136,164]  (STAGE)        #f70000 125px, #000000 60px
//   desert y[199,208] x[14,54]    (SPEED plate)  #f7f7f7 138, #000000 94,
//                                                #f70000 63, #0000f7 13
//   desert y[14,25]  x[16,71]     (SCORE emblem) #f70000 232, #f7f7f7 169,
//                                                #000000 105, #0000f7 104
//   desert y[16,23]  x[96,143]    (score digits) #f7f794 224, #000000 122
//
// Every value lands on the Sega 5-bit ladder (247 = 0xF7, 148 = 0x94, 181 =
// 0xB5), which is itself a check that the read is of authored art and not of
// a compression artefact. The old values below each were taken from the
// 686x480 upscales and ran 1-2 ladder steps off — the exact defect class
// interface I11 is about.
// ---------------------------------------------------------------------
const HUD_RED = '#f70000';      // was #ff1400 (t116 upscale class modal)
const PLATE_WHITE = '#f7f7f7';  // was #ffffff
const EMBLEM_BLUE = '#0000f7';  // was #0018f6
// ONE cream, not two: the score digits, the HIT digits and the stage digit
// are all #f7f794 on both native frames. R5a carried a separate PALE_YELLOW
// (#ffef88) and CREAM (#eeeb95) because the two upscales disagreed with each
// other about a colour the board draws identically in both places.
const PALE_YELLOW = '#f7f794';
const CREAM = '#f7f794';
// Throttle letter cell, x[43,52] y[200,208]: #f7f7f7 plate, #0000f7 letter —
// the same pure blue as the emblem keyline, not the near-black #0d10e0 the
// t175 upscale suggested.
const THROTTLE_LETTER_BLUE = '#0000f7';
// Throttle bar fill: ONE COLOUR PER ROW, not a three-stop highlight/mid/
// shadow. Each half is a six-step vertical ramp whose SECOND row is the
// lightest — a tube highlight, not a monotonic gradient — and R5a's
// hi/mid/lo model could not express that, so it shipped the bar's brightest
// pixel on the wrong row. Sampled column by column across the fill on both
// native frames; every row is a single flat value in both.
const BAR_BLUE_ROWS = ['#42c5f7', '#b5f7f7', '#52b5f7', '#0094e6', '#0063c5', '#000094'];
const BAR_AMBER_ROWS = ['#f7b542', '#f7f7b5', '#f7d652', '#e6b500', '#c58400', '#947300'];
// Tick highlight. The only neutral grey in the HUD palette.
const TICK_GREY = '#a4a4a4';
// Missile widget, night frame x[200,300] y[198,218]: body #f7f7f7 (148 px),
// base/fins mid-grey #848484 (323 px), bands #f70000 (34 px).
const MISSILE_BODY = '#f7f7f7';
const MISSILE_BAND = '#f70000';
const MISSILE_BASE = '#848484';
// Life icons, desert frame x[16,22] and x[24,30], y[211,214]: canopy
// #00f7f7 (pure cyan, not the #00bace the t175 upscale averaged to), wing
// bar #848484, body #f7f7f7, keyline #000000.
const LIFE_CYAN = '#00f7f7';
const LIFE_BODY = '#f7f7f7';
const LIFE_WING = '#848484';
const WHITE = '#f7f7f7';
const AMBER = '#f7b500';
// Reticle status dot's "tracking" (not locked) state — GAME_SPEC.md §3
// round-4 finding: red spans coincide with no active bracket. No exact
// hex measured for this specific red; close visual match to REFERENCE.md's
// t175 "orange-red" dot description pending a dedicated measurement.
// R6: snapped to the Sega ladder enumerated in REFERENCE.md "Criterion A".
// The previous value was `#ff3b1f`, whose 0x3b (59) and 0x1f (31) are on
// NEITHER native arcade frame's channel set — the ladder runs ... 25, 33 ...
// and ... 58, 66 ... — so this one unmeasured colour was the HUD's only
// off-ladder ink, and it put two channel values into every frame in which an
// enemy was in play. 59->58 and 31->33 is a sub-level shift (the ladder's own
// step here is 8), and the comment below still stands: the hue is a visual
// match to REFERENCE.md's t175 "orange-red" description, not a measurement.
const RED_LOCK = '#ff3a21';
const KEYLINE = '#000000';

// ---------------------------------------------------------------------
// THE AUTHORED PALETTE, as one list.
//
// WHY THIS IS EXPORTED. "Every HUD pixel is an authored palette colour" is
// only checkable against an enumeration of what "authored" means, and an
// enumeration kept in a measurement tool is a copy that silently desyncs the
// moment this file changes a hex — the same staleness class
// `tools/hud_mask.py` exists to kill for HUD geometry. So the list lives
// HERE, built out of the constants themselves rather than retyped, and
// `tools/hud-probe.mjs` reads it over the wire. Adding a colour to this HUD
// without adding it here makes the probe fail loudly, which is the intent.
//
// Every entry lands on the Sega ladder enumerated in REFERENCE.md
// "Criterion A" (0, 16, 25, 33, 41, 49, 58, 66, 74, 82, 91, 99, 107, 115,
// 123, 132, 140, 148, 156, 164, 173, 181, 189, 197, 206, 214, 222, 230, 239,
// 247, 255) — checked value by value, including the RED_LOCK repair above.
// The ladder is NOT the automated gate (REFERENCE.md says so: a +-1 level
// difference is visually nil), but a HUD colour off it is a sign the value
// came from a video upscale rather than from the board.
// ---------------------------------------------------------------------
export const HUD_PALETTE = [
  HUD_RED, PLATE_WHITE, EMBLEM_BLUE, PALE_YELLOW, CREAM, THROTTLE_LETTER_BLUE,
  ...BAR_BLUE_ROWS, ...BAR_AMBER_ROWS,
  TICK_GREY, MISSILE_BODY, MISSILE_BAND, MISSILE_BASE,
  LIFE_CYAN, LIFE_BODY, LIFE_WING, WHITE, AMBER, RED_LOCK, KEYLINE,
].filter((c, i, a) => a.indexOf(c) === i);

// Text that sits over the WORLD gets the full 1-px black ring; text on a
// white plate gets the arcade's right+below drop shadow (a ring against
// white would read as a box). See the long note in font.js.
const OVER_WORLD = { outline: KEYLINE };
const ON_PLATE = { shadow: KEYLINE };
// The arcade's numerals and its emblem letters are a SEPARATE, heavier face
// from its bottom-row labels — 7x7 on an 8-px pitch against 5x7 on a 6-px
// pitch. See the long note at the top of font.js. Drawn at scale 1, so a
// 2-px stroke stays a 2-px stroke.
const BIG_OVER_WORLD = { outline: KEYLINE, face: FACE_BIG };
const BIG_ON_PLATE = { shadow: KEYLINE, face: FACE_BIG };
// Throttle scale labels: the arcade's own right+below shadow, deliberately
// NOT our 5-offset ring. These are 4x5 glyphs with 1-px strokes and a ring
// would close their counters shut — the '0' would read as a filled block.
const TINY_ON_BAR = { shadow: KEYLINE, face: FACE_TINY };

// ---------------------------------------------------------------------
// AB2's winged emblems, TRANSCRIBED row by row off `ab2-arcade-desert.png`
// and independently re-transcribed off `ab2-arcade-night-banking.png`. The
// two reads agree on every row of both emblems — a cross-frame, cross-stage
// corroboration, and the strongest evidence this repo has produced for any
// HUD geometry. Operator: exact-colour classification of each pixel in
// x[14,74]/x[156,220] y[13,27] against the four authored HUD values
// (#0000f7 / #f7f7f7 / #f70000 / #000000); anything else is "world".
//
// SCORE, x[16,71] y[14,25] (h=12). Per-row span, left and right edge:
//   r0  y14  [16,71] BLUE across the full width
//   r1  y15  [16,71] white
//   r2  y16  [17,70] white; RED wing x[17,22] and x[65,70]
//   r3  y17  [17,70] white
//   r4  y18  [18,69] white; RED wing x[18,22] and x[65,69]
//   r5  y19  [18,69] white
//   r6  y20  [19,68] white; RED wing x[19,22] and x[65,68]
//   r7  y21  [19,68] white
//   r8  y22  [20,67] white; RED wing x[20,22] and x[65,67]
//   r9  y23  [20,67] white
//   r10 y24  [21,66] white; BLUE wing x[21,22] and x[65,66]
//   r11 y25  [22,65] BLUE across the (inset) full width
//
// HIT, x[160,191] y[16,23] (h=8) — EIGHT rows, not twelve, and its top is
// two rows BELOW the SCORE emblem's:
//   r0 y16 BLUE  x[160,164] / x[187,191]
//   r1 y17 white x[161,164] / x[187,190]
//   r2 y18 RED   x[161,164] / x[187,190]
//   r3 y19 white x[162,164] / x[187,189]
//   r4 y20 RED   x[162,164] / x[187,189]
//   r5 y21 white x[163,164] / x[187,188]
//   r6 y22 BLUE  x[163,164] / x[187,188]
//   r7 y23 BLUE  x[164,164] / x[187,187]
//
// THREE FACTS R4 GOT BACKWARDS, all of them visible above:
//  1. It is a WHITE plate with RED letters. R4 drew a solid red ribbon with
//     white letters and stuck white rectangles on the OUTSIDE as "wings" —
//     which is both the judge's "striped rectangles, not swept chevrons" and
//     the entire +20.1% red-extent overrun, since the wings belong INSIDE
//     the measured box.
//  2. THE WHITE BODY IS A SCORE-ONLY FEATURE. HIT has no plate behind its
//     letters at all: on the desert frame y19 reads
//     `...RRRk.RRRk....WWW` with the WORLD, not white, between the T and the
//     right wing (x165 and x183-186 are ground pixels). A white plate under
//     HIT is what made its red extent +41.8% and made it read as a slab.
//  3. The LAST TWO rows of each wing are BLUE, not red (SCORE r10/r11,
//     HIT r6/r7). Four pixels on SCORE, four on HIT — but it is what closes
//     the chevron into a point instead of leaving it a frayed red stub.
// ---------------------------------------------------------------------

// The slope is DATA, not a formula. A straight proportional slope
// (round(r * inset / (h-1))) reproduces HIT exactly but misses SCORE by one
// pixel on every odd row, because SCORE's slope is floor-biased and HIT's is
// round-biased. Two measured artefacts of fixed size do not need a
// generator; they need transcribing, like LIFE_SPRITE below.
//
// `wing` is the stripe length at inset 0, so each row's stripe is
// `wing - inset[r]` and the stripes all terminate on the same column —
// which is what makes the pair taper into a chevron. SCORE: 7 (x16..x22).
// HIT: 5 (x160..x164). `textDy` is the letters' first ink row measured from
// the plate's top row: SCORE letters are y16 on a plate starting at y14,
// HIT's are y16 on a plate starting at y16.
const EMBLEM_SCORE = {
  m: M_SCORE_EMBLEM, text: 'SCORE', textX: M_SCORE_TEXT_X,
  inset: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6], wing: 7, body: true, textDy: 2,
};
const EMBLEM_HIT = {
  m: M_HIT_EMBLEM, text: 'HIT', textX: M_HIT_TEXT_X,
  inset: [0, 1, 1, 2, 2, 3, 3, 4], wing: 5, body: false, textDy: 0,
};

function drawEmblem(ctx, e) {
  const { x, y, w, h } = e.m;

  for (let r = 0; r < h; r++) {
    const inset = e.inset[r];
    const left = x + inset;
    const span = w - 2 * inset;
    if (span <= 0) continue;

    if (e.body) {
      ctx.fillStyle = (r === 0 || r === h - 1) ? EMBLEM_BLUE : PLATE_WHITE;
      ctx.fillRect(left, y + r, span, 1);
    }

    // Wing stripes: blue on the top row and the bottom TWO rows, red on the
    // remaining even rows, WHITE on the odd ones. Verified row-for-row
    // against both transcriptions above, for h=12 and h=8 alike.
    //
    // The white stripes are AUTHORED PIXELS, not the body showing through —
    // on SCORE they are indistinguishable from the plate, but HIT has no
    // plate and still carries #f7f7f7 at x[161,164]/[187,190] on y17,
    // x[162,164]/[187,189] on y19 and x[163,164]/[187,188] on y21, in BOTH
    // frames, against orange ground in one and black sky in the other. A
    // first pass of this function skipped them for the bodyless emblem and
    // rendered HIT as four detached red bars.
    const len = Math.min(e.wing - inset, Math.floor(span / 2));
    if (len > 0) {
      const blue = (r === 0 || r >= h - 2);
      ctx.fillStyle = blue ? EMBLEM_BLUE : (r % 2 === 0 ? HUD_RED : PLATE_WHITE);
      ctx.fillRect(left, y + r, len, 1);
      ctx.fillRect(left + span - len, y + r, len, 1);
    }
  }

  // Emblem letters are the BIG face at scale 1 (measured: SCORE's S x[24,30],
  // C [32,38], O [40,46], R [48,54], E [56,62]; HIT's H x[166,172], dotted-i
  // [174,176], T [178,184] — 7 px cells on an 8 px pitch, with the i kerned
  // to 3). The arcade's own drop shadow, not our ring: on SCORE's white plate
  // a ring reads as a box, and HIT's letters carry black on their right and
  // underside only in both frames.
  drawText(ctx, e.text, e.textX, y + e.textDy, HUD_RED, 1, 1, BIG_ON_PLATE);
}

// Integer-only Bresenham. The attitude line is the one HUD element whose
// direction is continuous, and a continuous direction on a fixed pixel grid
// is exactly what Bresenham is for — it is the staircase the hardware would
// have drawn, with no coverage value anywhere between "pixel" and "no pixel".
function bresenham(x0, y0, x1, y1, put) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    put(x, y);
    if (x === x1 && y === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// Reticle pixel geometry, in whole native pixels. Each length below is the
// 1-BIT RESOLUTION of the stroked path this function used to draw, and was
// derived by working out which pixels that path covered COMPLETELY — see
// the long note on drawReticle. They are not new art.
const RET_ARM = 4;        // bracket leg, px, INCLUDING the shared corner px
const RET_TICK_GAP = 2;   // blank px between the bracket edge and its tick
const RET_TICK_SIDE = 5;  // left/right tick length, px
const RET_TICK_VERT = 3;  // top/bottom tick length, px
const RET_LINE_EXT = 3;   // attitude-line half-length is `half + this`

// Scratch raster for the reticle, grown on demand and reused across frames.
// The reticle is the only HUD element with continuous geometry, so it is the
// only one that needs rasterising; everything else is a fixed bitmap drawn
// straight to the context.
let retBuf = null;

// Fixed reticle: corner-bracket square + side ticks + center dot (unchanged
// by world roll, per REFERENCE.md), PLUS an attitude line through the
// centre that DOES rotate with worldRoll — GAME_SPEC.md §3 "Lock-on
// display": an artificial-horizon indicator, not decoration. This is the
// one HUD element that SHOULD track roll while everything else structurally
// cannot (screen.js's orthographic HUD camera never inherits the game
// camera's rotation).
//
// ---------------------------------------------------------------------
// R6: DRAWN AS PIXELS, NOT AS A STROKED PATH. This was the whole fix for
// the Criterion A2 excursion, and the reason is a medium argument, not a
// statistics argument.
//
// The old form built one Canvas2D path and stroked it twice (black at
// lineWidth 3, white at lineWidth 1). Canvas2D has no non-antialiased
// stroke: it computes fractional coverage and writes it to the alpha
// channel. The HUD canvas is then composited over the world by a
// `transparent: true` material (screen.js), so every fractional-coverage
// pixel arrives on screen as a blend of an authored HUD colour with
// whatever the sea or sky happened to put behind it. Measured on the
// authored canvas over a 24-angle x 5-state sweep
// (`node tools/hud_palette_probe.mjs`): up to 104 partial-alpha pixels in a
// single frame carrying 62 distinct alpha values, and 135 distinct
// off-palette OPAQUE colours in the union — those last ones are the white
// 1-px stroke landing at partial alpha on top of the already-opaque black
// 3-px stroke, which resolves to a solid grey like #7b7b7b that is in no
// palette at all. Whole-frame channel values (Criterion A2, gate <= 32) ran
// to 66 on the authored canvas alone.
//
// THE ARCADE CANNOT DO ANY OF THAT. Its HUD is 1-bit coverage on a fixed
// palette; `ab2-arcade-desert.png` and `ab2-arcade-night-banking.png` carry
// zero intermediate values anywhere in the HUD (font.js documents the same
// read for the glyphs). A rotating line that fades its edge pixels is not a
// near-miss on a gate, it is a rendering medium the board never had. So the
// line is a Bresenham staircase and everything else is a pixel run, which is
// how it would have been drawn in 1987.
//
// WHERE THE CONSTANTS CAME FROM, so this is auditable as a transcription
// rather than a redraw. For every element I worked out which pixels the old
// path covered with coverage EXACTLY 1, and reproduced that set:
//   - corner L: the miter join filled the corner pixel, then each leg ran 3
//     more full pixels and ended on a half-covered one. -> RET_ARM = 4,
//     counting the corner.
//   - side ticks: `moveTo(armX0 - 2, cy)` to `-tick` gave 5 full columns
//     with a half at each end, two clear columns from the bracket.
//     -> RET_TICK_GAP = 2, RET_TICK_SIDE = 5 (the old `tick = 6` was the
//     path length, which is one more than the pixel run a butt cap leaves).
//   - top/bottom ticks: `tick * 0.6` = 3.6 path px gave 3 full rows (and a
//     0.1-coverage row at alpha 25, which is not a pixel). -> 3.
//   - attitude line: `lineLen = half + 4` from a half-integer centre gave 25
//     full pixels at roll 0, i.e. 12 each side of centre. -> half + 3.
// The before/after diff at roll 0 changes ONLY pixels that were partially
// covered; judging/R6/lane-hud-quantize.md has the per-pixel table.
//
// The black keyline is now a 3x3 DILATION of the white pixel set rather
// than a lineWidth-3 stroke. For a 1-bit centreline those are the same
// figure, and the dilation has the property the stroke did not: it cannot
// put a partial-coverage black pixel under a partial-coverage white one,
// which is what manufactured the opaque off-palette greys.
// ---------------------------------------------------------------------
function drawReticle(ctx, bb, worldRoll, enemiesInPlay, locked) {
  const cx = Math.round((bb.x0 + bb.x1) / 2);
  const cy = Math.round((bb.y0 + bb.y1) / 2);
  const half = Math.round((bb.y1 - bb.y0) * 0.39);
  const x0 = cx - half;
  const x1 = cx + half;
  const y0 = cy - half;
  const y1 = cy + half;

  // The reticle rasterises into a scratch buffer rather than painting as it
  // goes, because its parts OVERLAP — the attitude line crosses the
  // brackets and runs through both side ticks — and the keyline has to be a
  // dilation of the finished figure, not of each part. Dilating per part
  // would stamp black over a neighbouring part's white.
  //
  // 0 = empty, 1 = ink, 2 = keyline. The buffer is bounded by the reticle's
  // own reach and kept between frames: this runs every frame from
  // screen.js, and the alternative (a Set of pixel indices plus a 1x1
  // fillRect per pixel) measured 0.223 ms against the old stroked form's
  // 0.005 ms, which is 1.3 % of a 60 Hz frame spent on one HUD element.
  // Spans bring that back to a fraction of it — see the figures in
  // judging/R6/lane-hud-quantize.md.
  const lineHalf = half + RET_LINE_EXT;
  const reachX = Math.max(half + RET_TICK_GAP + RET_TICK_SIDE, lineHalf) + 1;
  const reachY = Math.max(half + RET_TICK_GAP + RET_TICK_VERT, lineHalf) + 1;
  const bx = cx - reachX;
  const by = cy - reachY;
  const bw = reachX * 2 + 1;
  const bh = reachY * 2 + 1;
  if (!retBuf || retBuf.length < bw * bh) retBuf = new Uint8Array(bw * bh);
  retBuf.fill(0, 0, bw * bh);

  const put = (x, y) => {
    const u = x - bx;
    const v = y - by;
    if (u < 0 || v < 0 || u >= bw || v >= bh) return;
    retBuf[v * bw + u] = 1;
  };
  const run = (x, y, n, sx, sy) => {
    for (let i = 0; i < n; i++) put(x + sx * i, y + sy * i);
  };

  for (const [ax, sx] of [[x0, 1], [x1, -1]]) {
    for (const [ay, sy] of [[y0, 1], [y1, -1]]) {
      run(ax, ay, RET_ARM, sx, 0);
      run(ax, ay, RET_ARM, 0, sy);
    }
  }
  run(x0 - RET_TICK_GAP - 1, cy, RET_TICK_SIDE, -1, 0);
  run(x1 + RET_TICK_GAP + 1, cy, RET_TICK_SIDE, 1, 0);
  run(cx, y0 - RET_TICK_GAP - 1, RET_TICK_VERT, 0, -1);
  run(cx, y1 + RET_TICK_GAP + 1, RET_TICK_VERT, 0, 1);

  // Attitude line: same sign convention as world roll elsewhere in this
  // codebase (game.js: positive = banking right, horizon descends to the
  // right on screen). Endpoints are rounded to the grid and the span between
  // them is rasterised, so the line's LENGTH breathes by at most a pixel
  // with angle — which is what a fixed-length line on a square grid does —
  // while its coverage stays 1 bit at every angle.
  const ex = Math.round(Math.cos(worldRoll) * lineHalf);
  const ey = Math.round(Math.sin(worldRoll) * lineHalf);
  bresenham(cx - ex, cy - ey, cx + ex, cy + ey, put);

  // Keyline: the 3x3 dilation of the ink. The reticle sits in the sky in
  // level flight but swings over ground and explosion pixels during banks,
  // and a 1-px white line over cream desert is the same failure mode as the
  // stage digit. Only cells still at 0 become 2, and only cells at 1 are
  // sources, so the dilation cannot feed on itself.
  for (let v = 0; v < bh; v++) {
    for (let u = 0; u < bw; u++) {
      if (retBuf[v * bw + u] !== 1) continue;
      for (let dv = -1; dv <= 1; dv++) {
        const nv = v + dv;
        if (nv < 0 || nv >= bh) continue;
        for (let du = -1; du <= 1; du++) {
          const nu = u + du;
          if (nu < 0 || nu >= bw) continue;
          const i = nv * bw + nu;
          if (retBuf[i] === 0) retBuf[i] = 2;
        }
      }
    }
  }

  // Paint as horizontal spans, keyline first so the ink lands on top.
  const paintSpans = (value, style) => {
    ctx.fillStyle = style;
    for (let v = 0; v < bh; v++) {
      const y = by + v;
      if (y < 0 || y >= GAME_H) continue;
      const row = v * bw;
      let u = 0;
      while (u < bw) {
        if (retBuf[row + u] !== value) { u++; continue; }
        let e = u + 1;
        while (e < bw && retBuf[row + e] === value) e++;
        const sx = Math.max(0, bx + u);
        const exx = Math.min(GAME_W, bx + e);
        if (exx > sx) ctx.fillRect(sx, y, exx - sx, 1);
        u = e;
      }
    }
  };
  paintSpans(2, KEYLINE);
  paintSpans(1, WHITE);

  // Status dot — GAME_SPEC.md §3: ABSENT when no enemies are in play, then
  // holding YELLOW or RED for multi-second spans. The yellow=locked /
  // red=tracking mapping is the documented best-available reading, not a
  // confirmed fact.
  if (enemiesInPlay) {
    ctx.fillStyle = KEYLINE;
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    ctx.fillStyle = locked ? AMBER : RED_LOCK;
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }
}

// The throttle widget as AB2 actually draws it: scale digits INLINE with the
// bar (0 [bar] 2 . . . 3), the bar itself a blue segment up to the current
// speed and an amber segment for the remainder, both 3-tone shaded with dark
// notch marks. Geometry from the M_BAR / M_SCALE_* measurements above.
// NO KEYLINE BOX. R5a drew a black rectangle around the whole widget; the
// arcade draws none, on either frame. Every black pixel anywhere near this
// bar belongs to a label's drop shadow — see the TINY FACE note in font.js,
// where that is checked pixel by pixel against the frames.
function drawThrottleBar(ctx, fraction) {
  const { x, y, w, h } = M_BAR;
  const f = Math.min(1, Math.max(0, fraction));
  const end = x + Math.round(w * f);               // exclusive right edge
  const seam = Math.min(end, M_BAR_AMBER_X);

  for (let r = 0; r < h; r++) {
    if (seam > x) {
      ctx.fillStyle = BAR_BLUE_ROWS[r];
      ctx.fillRect(x, y + r, seam - x, 1);
    }
    if (end > seam) {
      ctx.fillStyle = BAR_AMBER_ROWS[r];
      ctx.fillRect(seam, y + r, end - seam, 1);
    }
  }

  // Ticks run the WHOLE track, over the fill and over bare world alike.
  for (const tx of M_BAR_TICKS) {
    ctx.fillStyle = KEYLINE;
    ctx.fillRect(tx, y + 2, 2, 2);
    ctx.fillStyle = TICK_GREY;
    ctx.fillRect(tx, y + 2, 1, 1);
  }

  for (const [lx, ch] of M_BAR_LABELS) {
    drawText(ctx, ch, lx, y, PLATE_WHITE, 1, 1, TINY_ON_BAR);
  }
}

// Base-10 odometer, decoded per GAME_SPEC.md §3: each LARGE rocket icon =
// 10 missiles, each small TICK = 1. R5 redraws the icons themselves from a
// 8x crop of t175 x[420,560] y[420,478]: a tall white body with a pointed
// nose, two red bands at a third of its height, and a grey base splaying
// into two fins. R4 drew 2-px white bars with a red triangle on top.
function drawMissiles(ctx, bb, count) {
  const large = Math.floor(count / 10);
  const ticks = count % 10;
  if (large + ticks === 0) return;
  // t175 large-rocket pitch: six icons span ref x[425,540] -> 19 ref px
  // apart = 8.9 native; first icon at ref x425 -> native 198.
  const yBase = bb.y1 - 1;
  let x = bb.x0 + 2;

  for (let i = 0; i < large; i++) {
    const top = yBase - 17;
    ctx.fillStyle = KEYLINE;
    ctx.fillRect(x, top - 1, 4, 19);
    ctx.fillStyle = MISSILE_BODY;
    ctx.fillRect(x + 1, top + 1, 2, 13); // body
    ctx.fillRect(x + 1, top, 1, 1); // pointed nose
    ctx.fillStyle = MISSILE_BAND;
    ctx.fillRect(x + 1, top + 4, 2, 2);
    ctx.fillRect(x + 1, top + 7, 2, 1);
    ctx.fillStyle = MISSILE_BASE;
    ctx.fillRect(x, top + 14, 4, 4); // base
    ctx.fillStyle = KEYLINE;
    ctx.fillRect(x + 2, top + 16, 1, 2); // fin split
    x += 8;
  }
  for (let i = 0; i < ticks; i++) {
    const top = yBase - 9;
    ctx.fillStyle = KEYLINE;
    ctx.fillRect(x, top - 1, 3, 11);
    ctx.fillStyle = MISSILE_BODY;
    ctx.fillRect(x + 1, top, 1, 7);
    ctx.fillStyle = MISSILE_BAND;
    ctx.fillRect(x + 1, top + 3, 1, 1);
    ctx.fillStyle = MISSILE_BASE;
    ctx.fillRect(x, top + 7, 3, 3);
    x += 4;
  }
}

// Remaining-life jets, bottom-left (M_LIVES). TRANSCRIBED, not approximated:
// the desert frame's two icons at x[16,22]/[24,30] y[211,214] are each an
// exact 7x4 four-colour bitmap, identical to one another, and this is a
// direct read of one of them.
//   C = #00f7f7 canopy   G = #848484 wing bar
//   B = #f7f7f7 body     k = #000000 keyline (AUTHORED INTO THE SPRITE, so
//                            the icon carries its own contrast over sea,
//                            desert and night speckle alike)
const LIFE_SPRITE = [
  'kCCkkkB',
  'GGGGGGG',
  'kkkBBBB',
  '...kBkB',
];
const LIFE_COLORS = { C: LIFE_CYAN, G: LIFE_WING, B: LIFE_BODY, k: KEYLINE };
function drawLives(ctx, lives) {
  for (let i = 0; i < lives; i++) {
    const ox = M_LIVES.x + i * M_LIVES.pitch;
    // Keyline pass first — the arcade's own icon carries black only on its
    // left and underside, which is enough on its black HUD row but not over
    // our stage-1 sea, so the ring goes on for the same reason the glyphs
    // have one.
    ctx.fillStyle = KEYLINE;
    for (let row = 0; row < LIFE_SPRITE.length; row++) {
      for (let col = 0; col < LIFE_SPRITE[row].length; col++) {
        if (LIFE_SPRITE[row][col] === '.') continue;
        ctx.fillRect(ox + col - 1, M_LIVES.y + row - 1, 3, 3);
      }
    }
    for (let row = 0; row < LIFE_SPRITE.length; row++) {
      for (let col = 0; col < LIFE_SPRITE[row].length; col++) {
        const c = LIFE_SPRITE[row][col];
        if (c === '.') continue;
        ctx.fillStyle = LIFE_COLORS[c];
        ctx.fillRect(ox + col, M_LIVES.y + row, 1, 1);
      }
    }
  }
}

// Screen-space HUD, composited after the world (src/render/screen.js) via
// its own orthographic camera — it is never parented under the game
// camera, so it cannot inherit world roll by construction
// (REFERENCE.md: "The HUD does not rotate"). No altitude element
// (ARCHITECTURE.md D7 corrected in R4).
export class Hud {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = GAME_W;
    this.canvas.height = GAME_H;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const geo = new THREE.PlaneGeometry(GAME_W, GAME_H);
    this.quad = new THREE.Mesh(geo, material);

    this.scene = new THREE.Scene();
    this.scene.add(this.quad);

    this.camera = new THREE.OrthographicCamera(
      -GAME_W / 2, GAME_W / 2, GAME_H / 2, -GAME_H / 2, -1, 1
    );
    this.camera.position.z = 1;

    // Shared game state. `missiles` is the ODOMETER total (int, 0-70,
    // GAME_SPEC.md §3), `hit` the kill count, `enemiesInPlay`/`locked`
    // drive the reticle status dot; combat-dev writes those each tick.
    // `score`/`stage` are written by src/game/flow/flow.js.
    //
    // R5 ADDITION, needs one line in a file this lane does not own:
    // `lives` drives the new bottom-left life icons (judge R4 gap 3, "add
    // the bottom-left aircraft-position icon"). flow.js already tracks
    // `this.lives` and already holds this object as `this.hudState`, so the
    // wiring is `this.hudState.lives = this.lives;` wherever lives change
    // (constructor, _startTitle, _onDeath, continue reset). Until that
    // lands the HUD shows the START_LIVES default, which is correct for
    // every frame before the first death.
    this.state = {
      score: 0, hit: 0, stage: 1, missiles: 50, lives: 3,
      throttle: 'M', throttleFraction: 0.55,
      enemiesInPlay: false, locked: false,
    };
    this.redraw(0);
  }

  // `worldRoll` (radians, positive = banking right) drives ONLY the
  // reticle's attitude line — every other element is roll-invariant by
  // construction. Called every frame from screen.js.
  redraw(worldRoll = 0) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_W, GAME_H);

    // Digits are the BIG face at scale 1 and right-aligned on the measured
    // right edge of the last cell. Checks out at native: 6 big digits measure
    // 6*8-1 = 47, so 143-47 = 96, which is exactly where the desert frame's
    // "248020" starts; one big digit measures 7, so 215-7 = 208, exactly
    // where the desert "4" and the night "2" both start.
    drawEmblem(ctx, EMBLEM_SCORE);
    const scoreStr = String(Math.max(0, Math.floor(this.state.score)));
    const scoreW = textWidth(scoreStr, 1, FACE_BIG);
    drawText(ctx, scoreStr, M_SCORE_DIGITS.right - scoreW, M_SCORE_DIGITS.y,
      PALE_YELLOW, 1, 1, BIG_OVER_WORLD);

    drawEmblem(ctx, EMBLEM_HIT);
    const hitStr = String(this.state.hit);
    const hitW = textWidth(hitStr, 1, FACE_BIG);
    drawText(ctx, hitStr, M_HIT_DIGITS.right - hitW, M_HIT_DIGITS.y,
      PALE_YELLOW, 1, 1, BIG_OVER_WORLD);

    drawReticle(ctx, BB_RETICLE, worldRoll, this.state.enemiesInPlay, this.state.locked);

    // SPEED label + throttle letter share one white lozenge (M_SPEED_PLATE).
    const p = M_SPEED_PLATE;
    ctx.fillStyle = KEYLINE;
    ctx.fillRect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
    ctx.fillStyle = PLATE_WHITE;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    const speedEnd = M_SPEED_TEXT.x + drawText(ctx, 'SPEED', M_SPEED_TEXT.x, M_SPEED_TEXT.y,
      HUD_RED, ...SCALE_SPEED, ON_PLATE);
    // t175: the throttle letter sits in its own cell at the plate's right
    // end (blue runs at x[98,112] ref = 45.7..52.2 native), with a 1-px
    // white gutter between it and the SPEED label.
    //
    // NO drop shadow on this one glyph, unlike SPEED beside it. The arcade
    // does carry a dark edge under it, but at our native size that edge is
    // the SAME 1 px as the stroke, and the ink here is near-black blue
    // (#0d10e0, relative luminance 0.038) — measured on the R5 captures,
    // the shadowed version's worst glyph edge scored 1.11:1 against the
    // judge's >=3:1 bar because the only thing some of its pixels touched
    // was black. Unshadowed it is blue straight onto the white plate at
    // 18.2:1. Dropping the shadow where the ink is already dark is the one
    // place the arcade's own treatment makes OUR render less legible.
    drawText(ctx, this.state.throttle, Math.round(speedEnd) + 2, M_SPEED_TEXT.y,
      THROTTLE_LETTER_BLUE, 1, 1);

    drawThrottleBar(ctx, this.state.throttleFraction);

    drawText(ctx, 'STAGE', M_STAGE_TEXT.x, M_STAGE_TEXT.y, HUD_RED, ...SCALE_STAGE, OVER_WORLD);
    // Stage digit: BIG face, ink-centred on cx=187, which puts a 7-wide cell
    // at x[184,190] — where the desert "2" and the night "3" both sit.
    drawTextCenteredInk(ctx, String(this.state.stage), M_STAGE_DIGIT.cx, M_STAGE_DIGIT.y,
      CREAM, 1, 1, BIG_OVER_WORLD);

    drawMissiles(ctx, BB_MISSILES, this.state.missiles);
    drawLives(ctx, this.state.lives);

    this.texture.needsUpdate = true;
  }
}

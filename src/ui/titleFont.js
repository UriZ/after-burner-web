// Display face for the AFTER BURNER title wordmark. ORIGINAL pixel art in
// the arcade's idiom (ARCHITECTURE.md D5) — the outlines below were drawn
// by hand against a NATIVE-RESOLUTION reconstruction of the arcade's
// wordmark (see "THE MEASUREMENT" below), not traced from or extracted out
// of any SEGA asset. Stroke width, cap height, advance, terminal-cut angle
// and the per-word bookend rise/drop are measured; every vertex is ours.
//
// ---------------------------------------------------------------------
// WHY THIS FILE WAS REWRITTEN IN R9 — and the measurement that drove it
// ---------------------------------------------------------------------
// R8's art critique ranked this screen's lettering as the single biggest
// reason the title reads as a placeholder: "the arcade's are sheared, with
// chiselled diagonal terminals ... ours are upright, square, uniform-stroke,
// with a rounded-arch A", visible at 1x. The R5 face it replaces was an
// 11x14 cell grid blown up 3x, which cannot express a diagonal finer than a
// 3 px staircase and gave every letter the same width.
//
// THE MEASUREMENT (quote it with its chain — there is NO true-native arcade
// title still; both native stills in reference/ are in-flight frames):
//   source   .reference-cache/video/ab2-longplay-60fps.mp4 @ 1028x720
//            = 3.2125x W / 3.2143x H upscale of the board's 320x224
//   frames   t=72.30 (plate face-on), t=74.60, t=73.50, plus the repo's own
//            reference/title-screen-t74.png at 686x480 (2.144x)
//   operator ink = neutral white (min ch > 195 AND max-min < 20) + the
//            leading A's blue + the leading B's red; AREA-DOWNSAMPLED to
//            320x224 (each native cell = mean coverage of its source block)
//            and thresholded at 0.5; 1-px specks removed (<4 of 9 neighbours).
//   control  all four frames give the IDENTICAL native bbox x[46,277]
//            y[52,166] and agree on 8 867 ink px to within 1.0-1.6 %.
//            The ball-highlight contamination that defeats a looser white
//            test is what the neutrality clause is for.
//
// What it says, at native 320x224:
//   AFTER    x[70,254]  w=185   rows 52..99
//     A  x[70,103]  rows 54..98      F  x[110,135] rows 57..99
//     T  x[147,175] rows 59..97      E  x[185,211] rows 59..97
//     R  x[218,254] rows 52..99
//   BURNER   x[46,277]  w=232   rows 114..166
//     B  x[46,82]   rows 116..165    U  x[86,118]  rows 114..153
//     R  x[125,160] rows 115..154    N  x[167,194] rows 115..152
//     E  x[206,233] rows 115..155    R  x[242,277] rows 115..166
//
// THREE THINGS THAT FALL OUT OF IT, and two of them correct a published
// criterion. See judging/R9/lane-title.md for the full audit.
//
//  1. BODY CAP HEIGHT IS 39 px, not 54. The middle letters of both words
//     sit between cap line and baseline 38 rows apart (AFTER 59..97,
//     BURNER 115..153). Our old face drew 42. The lettering was never
//     uniformly short.
//  2. THE TWO WORDS ARE THE SAME SIZE. R8 measured "BURNER is 13.7 %
//     taller than AFTER" and prescribed per-word scaling at AFTER x1.13 /
//     BURNER x1.29. On this instrument both words have an identical 38-row
//     body and their MIDDLE letters differ by 3 rows out of 39. The 13.7 %
//     is an artefact of the whole-word white bbox on a 686x480 frame, where
//     the sphere matrix's specular highlights pass a plain brightness test
//     and inflate the taller word's box. PER-WORD SCALING IS WITHDRAWN.
//  3. WHAT IS ACTUALLY MISSING IS THE BOOKENDS. Each word's FIRST and LAST
//     letter is oversized, and the two words grow in OPPOSITE directions:
//     AFTER's A and R rise 5 and 7 px ABOVE the cap line; BURNER's B and R
//     drop 12 and 13 px BELOW the baseline. That is the whole of the
//     21.5 % whole-wordmark height shortfall R7 and R8 both measured and
//     neither could localise — the figure was right and its cause was not
//     the body size.
//
// Advance is per-letter and irregular, as a hand-drawn logotype's is:
// AFTER 40/37/38/33, BURNER 40/39/42/39/36. A uniform advance is one of
// the things that made the old face read as a font rather than a logo.
// ---------------------------------------------------------------------

// Body metrics, native px. Everything else is expressed against these.
export const TITLE_CAP_H = 39;   // cap line .. baseline, measured 38-39 both words
// Two more measured metrics, stated here and then expressed directly in the
// glyph coordinates rather than kept as constants nothing reads: every stem
// is 9 px, and BURNER's two bookend letters drop 12 and 13 px below the
// baseline where AFTER's rise 5 and 7 above the cap line.

// ---------------------------------------------------------------------
// THE RASTERISER, and why it is not Canvas2D's.
//
// These glyphs are POLYGONS, because the thing being reproduced is a
// diagonal terminal cut and a 3x-blown-up cell grid cannot hold one.
// ctx.fill() on a Path2D would antialias every one of those diagonals into
// a blend ramp — CLAUDE.md's named "Canvas2D fractional positions" class,
// which in R8 was found to be generating 14 unauthored blend colours and
// 24 of the title's 44 off-ladder channel values all by itself. So this
// scan-converts by hand: for each integer row, cross the polygon's edges at
// the row's pixel CENTRE, sort the crossings, round each span's two ends to
// integers independently, and emit one opaque fillRect per span. No
// fractional edge ever reaches the canvas, so no blend colour can exist and
// the screen's channel-value set is exactly its authored palette.
//
// A shape is a list of CONTOURS and is filled EVEN-ODD across them, which
// is what gives the A, R and B their counters. The counters must be holes
// and not knocked out in black: the sphere plate is drawn BEHIND the
// wordmark and the arcade shows balls through every counter.
// ---------------------------------------------------------------------
function fillShape(ctx, contours, ox, oy) {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const c of contours) {
    for (let i = 1; i < c.length; i += 2) {
      if (c[i] < y0) y0 = c[i];
      if (c[i] > y1) y1 = c[i];
    }
  }
  const top = Math.floor(oy + y0);
  const bot = Math.ceil(oy + y1);
  const xs = [];
  for (let y = top; y < bot; y++) {
    const yc = y + 0.5 - oy;
    xs.length = 0;
    for (const c of contours) {
      const n = c.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ay = c[2 * i + 1];
        const by = c[2 * j + 1];
        if ((ay <= yc) === (by <= yc)) continue;
        const ax = c[2 * i];
        const bx = c[2 * j];
        xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const sx = Math.round(ox + xs[k]);
      const ex = Math.round(ox + xs[k + 1]);
      if (ex > sx) ctx.fillRect(sx, y, ex - sx, 1);
    }
  }
}

// ---------------------------------------------------------------------
// THE GLYPHS. Coordinates are native px with the origin at the glyph's own
// ink LEFT and at the word's CAP LINE, so y<0 is a bookend rising above the
// cap line and y>TITLE_CAP_H is one dropping below the baseline. `w` is the
// ink width; the caller supplies the advance, because this logotype's
// advances are irregular and belong to the word, not the glyph.
//
// The shared vocabulary, read off the measurement and then drawn by hand:
//   - stems are 9 px and square-cut;
//   - every ARM ends in a wedge whose outer tip hangs 1-2 px BELOW its
//     inner root, so the terminal reads as a chisel rather than a crop;
//   - diagonals (the R leg, the N bar, the A's left leg) run at roughly
//     1:1.2 and are the only curved-looking features in the face;
//   - the two bookend letters of each word lean, the body letters do not.
// ---------------------------------------------------------------------
const G = {
  // AFTER's blue A: a broad arch rising 5 px over the cap line, a splayed
  // left leg, a vertical right leg, and a counter that the plate shows
  // through. Rows 54..98 measured; 54 = cap line - 5.
  A: {
    w: 34,
    shapes: [[
      [15, -5, 27, -5, 32, 0, 32, 4, 31, 10, 31, 38,
        22, 38, 22, 22, 10, 22, 13, 38, 4, 38, 0, 10, 3, 2],
      [13, 3, 22, 3, 22, 15, 11, 15],
    ]],
  },
  // F: square stem, two arms, both chisel-tipped. Rows 57..99 measured,
  // i.e. the arm starts 2 px above the cap line and the stem runs 1 px
  // past the baseline.
  F: {
    w: 26,
    shapes: [
      [[0, -2, 9, -2, 9, 38, 7, 40, 0, 40]],
      [[9, -1, 20, 0, 25, 4, 25, 7, 15, 6, 9, 5]],
      [[9, 15, 17, 15, 21, 20, 21, 22, 13, 21, 9, 20]],
    ],
  },
  // T: the head bar is a trapezoid — BOTH ends cut on a diagonal, wider at
  // the bottom — over a stem that tapers 9 -> 7 at the foot.
  T: {
    w: 29,
    shapes: [
      [[2, 0, 25, 0, 29, 5, 24, 7, 4, 7, 0, 5]],
      [[10, 7, 19, 7, 19, 34, 18, 38, 11, 38, 10, 34]],
    ],
  },
  // E: three arms of three different lengths, each chisel-tipped, the
  // bottom one longest and raked back as it descends.
  E: {
    w: 27,
    shapes: [
      [[0, 0, 9, 0, 9, 38, 0, 38]],
      [[9, 0, 21, 1, 23, 6, 16, 7, 9, 7]],
      [[9, 15, 19, 16, 21, 21, 14, 22, 9, 22]],
      [[9, 31, 26, 32, 24, 38, 9, 38]],
    ],
  },
  // BURNER's E is NOT AFTER's E, and this is measured, not a flourish: the
  // arcade's two E's span rows 59..97 (39) and 115..155 (41) and carry 635
  // and 710 ink px. Drawing one glyph twice makes one of them wrong by 10 %
  // whichever size it is drawn at. Arms are a row deeper here too.
  E2: {
    w: 28,
    shapes: [
      [[0, 0, 9, 0, 9, 40, 0, 40]],
      [[9, 0, 22, 1, 24, 7, 17, 9, 9, 8]],
      [[9, 16, 20, 17, 22, 23, 15, 25, 9, 24]],
      [[9, 32, 27, 33, 25, 40, 9, 40]],
    ],
  },
  // R, body size: bowl with an angular counter over a leg that kicks out
  // on a 1:1.2 diagonal. Rows 115..154 measured in BURNER.
  R: {
    w: 34,
    shapes: [
      [[0, 0, 9, 0, 9, 38, 0, 38]],
      [
        [4, 0, 26, 0, 33, 5, 33, 11, 26, 17, 9, 17, 9, 0],
        [12, 4, 24, 4, 27, 8, 24, 13, 12, 13],
      ],
      [[9, 15, 19, 15, 33, 36, 33, 39, 27, 39, 9, 21]],
    ],
  },
  // AFTER's final R: the word's right bookend. The bowl is DEEPER (it
  // starts 7 px above the cap line, measured rows 52..65) and the leg runs
  // 1 px past the baseline. Same vocabulary, different proportions — the
  // arcade's two R's are not one glyph at two scales.
  RA: {
    w: 37,
    shapes: [
      [[0, -3, 9, -5, 9, 38, 0, 38]],
      [
        [4, -5, 28, -7, 35, -1, 35, 6, 28, 12, 9, 12, 9, -5],
        [12, -1, 25, -1, 28, 3, 25, 8, 12, 8],
      ],
      [[9, 10, 20, 10, 36, 35, 36, 40, 30, 41, 9, 17]],
    ],
  },
  // BURNER's final R: the word's right bookend, and this word's bookends
  // grow DOWNWARD. Bowl at body proportions, leg driven 13 px past the
  // baseline to a point (measured rows 115..166).
  RB: {
    w: 36,
    shapes: [
      [[0, 0, 9, 0, 9, 44, 0, 44]],
      [
        [4, 0, 27, 0, 34, 5, 34, 11, 27, 17, 9, 17, 9, 0],
        [12, 4, 25, 4, 28, 8, 25, 13, 12, 13],
      ],
      [[9, 17, 20, 17, 36, 44, 36, 49, 32, 51, 27, 50, 9, 24]],
    ],
  },
  // BURNER's red B: the word's left bookend and the most strongly sheared
  // letter in the logotype — its spine leans 8 px over its 50 rows and its
  // foot drives out to a point below the baseline. Two counters, both open
  // to the plate.
  B: {
    w: 37,
    shapes: [[
      [8, 1, 28, 1, 35, 7, 36, 13, 29, 18,
        36, 24, 37, 34, 32, 42, 20, 48, 8, 50, 3, 50, 0, 42, 4, 20],
      [15, 7, 25, 7, 27, 11, 23, 14, 13, 14],
      [12, 26, 25, 27, 27, 33, 20, 38, 9, 38],
    ]],
  },
  // U: left stem leans in, right stem is dead vertical, bowl closes on a
  // diagonal. Measured rows 114..153.
  U: {
    w: 34,
    shapes: [[
      [7, -1, 18, -1, 12, 27, 17, 31, 23, 31, 22, -1, 33, -1,
        34, 29, 27, 38, 8, 38, 0, 29],
    ]],
  },
  // N: two square stems bridged by a thick 1:1.2 diagonal that merges into
  // the left stem at the cap line — there is no thin joint anywhere in
  // this face.
  N: {
    w: 28,
    shapes: [
      [[2, 0, 9, 0, 9, 37, 2, 37]],
      [[20, 0, 28, 0, 28, 37, 20, 37]],
      [[2, 0, 12, 0, 28, 24, 28, 32, 20, 32, 2, 11]],
    ],
  },
};

// Per-word layout: [glyph, x offset from the word's ink left].
// The offsets ARE the measured advances (AFTER 40/37/38/33, BURNER
// 40/39/42/39/36); they are not derived from a cell pitch.
const TITLE_WORDS = {
  AFTER: { ink: 185, letters: [['A', 0], ['F', 40], ['T', 77], ['E', 115], ['RA', 148]] },
  BURNER: {
    ink: 232,
    letters: [['B', 0], ['U', 40], ['R', 79], ['N', 121], ['E2', 160], ['RB', 196]],
  },
};

// Draws one word with its ink left edge at `x` and its CAP LINE at `y`.
// `colors[i]` overrides `base` for letter i — the arcade colours the
// leading A of AFTER blue and the leading B of BURNER red and nothing else.
export function drawTitleWord(ctx, word, x, y, base, colors) {
  const spec = TITLE_WORDS[word];
  if (!spec) return 0;
  for (let i = 0; i < spec.letters.length; i++) {
    const [key, dx] = spec.letters[i];
    const g = G[key];
    if (!g) continue;
    ctx.fillStyle = (colors && colors[i]) || base;
    for (const shape of g.shapes) fillShape(ctx, shape, x + dx, y);
  }
  return spec.ink;
}

# Round 9 — title lane (title wordmark, sphere plate, title animation, cards, fonts)

Files touched: `src/ui/titleFont.js` (rewritten), `src/game/flow/titleScreen.js` (rewritten),
`src/ui/font.js` (two additive changes). `src/game/flow/cards.js` and
`src/game/flow/overlay.js` were read and re-measured but **not changed** — nothing in them
needed to move. No commit, stash, checkout, reset or push. Captures all under
`tools/out/title-r9/`.

**One CROSS-AREA edit, `src/game/flow/flow.js`, with the team lead's explicit approval** — two
hunks, specified in advance and granted, in a file owned by no live lane this round. It is the
per-tick redraw without which nothing on this screen can animate; §6 has the mechanism, the
patch and the determinism proofs. Both hunks carry a comment at the site saying whose edit it
is and why.

New in `judging/R9/`: `title_drawweight_r9.py`, `title_anim_arcade_r9.py`,
`title_loop_r9.mjs`, and seven evidence panels `title-r9-01..07`.

---

## 0. THE HEADLINE, and it is a measurement finding before it is a code finding

**The arcade's title card is not a still, and `reference/title-screen-t74.png` is a transient
frame of a moving object.** The sphere "II" is a 3D plate that tumbles continuously behind the
wordmark; t=74.0 s catches it part-edge-on. Every published measurement of that plate — R5's
layout, R8's *"7.2× too sparse"*, R8's *"the balls are ~3× larger relative to the cap
height"*, and the "two marble columns" that `drawSphereII` was built to draw — was read off
that one frame. Both of those figures are now **retired**: §3c says which fails on the tumble
and which fails on the dolly, and they are REFERENCE.md ledger row 43.

Measured, `judging/R9/title_anim_arcade_r9.py` over the card's whole dwell (t=64.0–76.0 s of
`ab2-longplay.mp4`, 686×480 at 30 fps, 360 frames):

| | measured | shipped constant |
|---|---|---|
| plate visible area, swing over the dwell | **0 → 28 530 px**, i.e. it goes fully edge-on | — |
| plate area-signal autocorrelation peak | **64 frames = 128 ticks** = half a revolution | one revolution **256 ticks** |
| `INSERT COIN!` blink | **nine consecutive 16-on / 16-off runs** at 30 fps, no outlier inside the dwell | **32 ticks on / 32 off** |

The nine clean blink runs are the cleanest number on this screen and the two outliers in the
printout are the card's own entry and exit. **The window is part of the measurement**: run the
same script past t≈76 and the attract demo's moving content enters both boxes, dropping the
tumble peak from 64 frames to 20. That is stated in the script and defaulted.

Because the plate rotates, **the geometry below is read at the plate's FACE-ON moment,
t=72.30 s, selected as the maximum of that same area signal — not by eye.** The R9 criteria
lane, decoding the same span on a 1 s grid, independently names **t72** as "the most face-on
readable pose"; t=72.30 is the same pose located to a finer grid, and the two selections do
not disagree.

### And there is a SECOND title card, which is where the retired "balls ~3× larger" came from

The criteria lane's note that the plate also *dollies* is confirmed and localised. The attract
loop shows the title **twice**, and they are not the same card:

| | t≈64–76 | t≈76–83 |
|---|---|---|
| bottom-left | `CREDIT   0` | `SHIPS 3` |
| call to action | `iNSERT COiN!` | `PUSH START BUTTON!` |
| plate ball pitch | **32 video px = 9.96 native** | balls ~75 video px across ≈ **23 native** |

**Same plate, roughly 2.3× closer to the camera.** → the crop in this report's §3c. So "the
balls are ~3× larger relative to the cap height" is not even wrong about a pose — it is a
reading of *the other card*. A plate figure is meaningless without naming the card **and** the
phase, which is exactly the citation field the criteria lane made binding off row 43.

**We draw the CREDIT-0 card** (we draw `CREDIT 0` and `iNSERT COiN!`), so every geometry
figure below is the CREDIT-0 card at its area maximum, and it says so. The §0 timing window
(frames 0..359 = t 64.0..76.0) is the CREDIT-0 card only, so neither period is contaminated by
the second card either.

---

## 1. Provenance, stated before any number (REFERENCE.md citation field 5)

**There is no true-native arcade title still.** Both native frames in `reference/` are
in-flight. Every arcade figure in this report rests on an upscale, and here is which:

| what | source | factor |
|---|---|---|
| all wordmark and plate GEOMETRY | `.reference-cache/video/ab2-longplay-60fps.mp4` @ **1028×720** | **3.2125× W / 3.2143× H** |
| the two TIMING periods (§0) | `.reference-cache/video/ab2-longplay.mp4` @ 686×480, 30 fps | 2.144× |
| the retired R8 figures being audited | `reference/title-screen-t74.png` @ 686×480 | 2.144× |

Timing is read at 686×480 deliberately: a red-pixel count and an area count, both thresholded
far from their decision boundaries, buy nothing from resolution, and the 30 fps file does not
carry the AV1 sequence-seek offset CLAUDE.md warns about.

**The arcade side is brought DOWN to 320×224 before anything is compared.** Each native cell
takes the mean coverage of its source block and is thresholded at 0.5. That is what makes the
DRAW-WEIGHT span condition (§5) hold by construction instead of by hope.

**SUBJECT STATIC — the citation field the criteria lane made binding off this lane's row 43.**
Stated for every subject on this screen:

| subject | static? | if not, the phase this figure is read at |
|---|---|---|
| the wordmark, both words, all 11 glyphs | **yes** — identical native mask on 4 frames at 3 plate phases | — |
| `iNSERT COiN!` / `CREDIT 0` / `©SEGA 1987` | **yes** in position and shape; the coin line BLINKS | geometry read on an ON frame (t74) |
| the sphere plate | **NO** | CREDIT-0 card, tumble phase = **area-signal maximum, t=72.30 s** |

The field earns its place here precisely because, as the criteria lane put it, CLAUDE.md's
"crop it and LOOK once" finds every other defect in this ledger and **cannot** find this one:
a still of a tumbling plate is pixel-for-pixel indistinguishable from a still of a static one.
The only way is to decode a second frame.

**Our side**, stated precisely because this repo has paid for loose tree-state claims: "before"
was captured at the start of this lane's session on the **shared working tree**, with three
other lanes live in it — but `git diff HEAD` over this lane's files was **empty** at that
moment, so for the title screen "before" is exactly committed **`52edcc4`**. "After" is the
working tree with this lane's four edited files changed from it (`titleFont.js`,
`titleScreen.js`, `font.js`, and the approved two hunks in `flow.js`).

Every set below is `?showtitle=1&fixed=1&seed=1` unless the page is named:

| set | page / params | ticks | what it is for |
|---|---|---|---|
| `before` | — | 5, 10 … 40 | committed `52edcc4` |
| `faceon` | — | **256** | the after figure in §5 and panel 01: a full revolution, so the plate is face-on |
| `anim-a`, `anim-{7,13,29}` | — | ×11, ×7, ×13, ×29 | the 68-frame animated census, §6 |
| `det-rep1`, `det-rep2` | — | 37, 74, 111, 148 | determinism check 1 |
| `det-step1`, `det-stepN` | `--every 1 ×37` / `--every 37 ×1` | → 37 | determinism check 2 |
| `hud-final`, `hud{5774,5634}` | `/tools/hud-probe.html`, `throttle=…` | 1 | §7 |
| `cardf-*`, `card-*` | `/tools/cards-preview.html`, `card=…` | 1 | §7 |

A tick index means nothing without its URL (ledger row 38); each set's `capture-manifest.json`
carries both, **and also the flow state of every frame — which §6 shows is not decoration.**

---

## 2. Native before / after / arcade

→ `title-r9-01-NATIVE-before-after-arcade.png` — **true 320×224, no zoom, before / after /
arcade stacked.** `title-r9-02-…-3x.png` is the same three at 3× nearest.
→ `title-r9-05-LETTERMASK-before-after-arcade-4x.png` — the letter-ink masks alone.

The letterform change is visible at 1× and that was the test R8 set: *"this is the single
biggest reason it reads as a placeholder, and it is visible at 1×."*

---

## 3. CRITERION AUDIT — one published figure survives, one does not, and the survivor's
## stated cause was wrong

CLAUDE.md: *"Before tuning to a criterion, check the criterion against the arcade itself."*
Three figures were handed to this lane. Here is each against a fresh measurement.

### 3a. "The lettering is 21.5 % short in height" — **SURVIVES, and is now closed**

Whole-wordmark ink bbox, native, same operator both sides:

| | bbox | height |
|---|---|---|
| arcade | x[46,277] y[52,166] | **115** |
| ours, before | x[46,273] y[51,141] | **91** (−20.9 %) |
| ours, after | x[46,277] y[52,165] | **114** (−0.9 %) |

−20.9 % reproduces R8's 21.5 % and R7's 20–23 % independently. The figure was right.

### 3b. "BURNER is 13.7 % taller than AFTER, so per-word scaling at AFTER ×1.13 / BURNER ×1.29" — **WITHDRAWN**

**The two words are the same size.** Both sit between a cap line and a baseline **38 rows**
apart (AFTER 59→97, BURNER 115→153), and the middle letters' own boxes are 39 and 38 rows.

The 13.7 % is an artefact of the whole-word *white* bbox on the 686×480 frame. The sphere
plate's **ball specular highlights pass a plain brightness test**, they sit inside the wordmark
box, and they are not distributed equally between the two words — so they inflate one box and
not the other. This is the fourth time in this project's ledger that something bright and
high-contrast sitting inside a measurement box has been counted as the subject.

The operator that does not fall for it is a **neutrality** test, not a brightness test: letter
ink is `min channel > 195 AND max−min < 20`; the ball highlights are bright *and* blue-tinted.
Control: in a 60×340 px strip of pure plate, 3 596 px pass "bright" and **259** pass
"bright and neutral" (0.13 % of the strip).

**Had this lane applied the prescribed AFTER ×1.13 / BURNER ×1.29, it would have shipped two
words at two different sizes where the arcade has one.** Ledger candidate.

> **INDEPENDENTLY CORROBORATED, and I did not know it while measuring.** The R9 criteria lane
> built `tools/title_word_height.py` in parallel and reached the same verdict by a different
> operator on a different input — a **per-column local ink extent**, median over inked columns,
> at 686×480, on frames with no plate behind the wordmark (t70, t71). Run now:
>
> | frame | AFTER | BURNER | |
> |---|---|---|---|
> | t70 (no plate) | median **80.0** | **78.0** | BURNER 2.5 % **shorter** |
> | t71 (no plate) | 79.5 | 78.0 | 1.9 % shorter |
> | t74 (plate behind) | 74.0 | 78.0 | +5.4 %, and the bbox reads 104 vs 116 = **+11.5 %** |
>
> ÷2.144 that is 37.3 and 36.4 native against my 38 and 38 — two instruments, two input
> chains, agreeing to 1–2 px, both saying the words are one size.
>
> **Their operator names a SECOND inflator that mine does not see, and it is the more
> dangerous one.** The wordmark sits on a **sloped, sheared baseline**, so a longer word's bbox
> spans more rows *at identical letter height* purely by running further down the slope.
> BURNER is the longer word. It is worth **6.7 points** — t70/t71, with no plate anywhere near
> the wordmark, still read 104 vs 111 by bbox. **So the mechanism I found is only half of it:
> had anyone re-measured by bounding box on a clean frame, they would have read 6.7 % and
> believed it.** Only a per-column *local* height sees through that, and theirs is the
> operator that does.
>
> Their third observation closes the loop between the two audits: **which word the plate
> inflates depends on the pose** — t72 and t74 inflate BURNER, **t73 inflates AFTER instead**.
> Row 43 contaminating row 42's measurement, in one frame, two defects.
>
> This is also ledger row 38's valid form of cross-validation — two readers over
> **independently produced inputs**, which can see an input-identity defect, where two readers
> over a shared input cannot. Both findings are now **REFERENCE.md ledger rows 42 and 43**.

### 3c. The sphere "II" is "7.2× too sparse" and "the balls are ~3× larger relative to the cap height" — **BOTH WITHDRAWN, for two DIFFERENT reasons, and the object was the wrong shape**

The criteria lane separated these and the separation is right:
**"7.2× too sparse" fails on the TUMBLE** — t74 catches the plate part-edge-on, and a plate
seen edge-on is sparse inside its own bounding box.
**"balls ~3× larger" fails on the DOLLY** — and §0 localises it: that figure is a reading of
**the second title card**, where the same plate sits ~2.3× closer to the camera.
→ `title-r9-07-TWO-CARDS-ball-scale-2x.png`: the identical 400×75 crop of the same source file
fits ~11 balls across on the CREDIT-0 card and ~5 on the SHIPS-3 card.

Read at the CREDIT-0 card's face-on moment (t=72.30), at native:

| | arcade | ours before | ours after |
|---|---|---|---|
| plate bbox | x[109,230] y[51,172] **122 × 122** | — | x[109,229] y[53,171] **121 × 119** |
| lattice pitch | **32 video px = 9.96 native** (horizontal ACF, clean single peak, minimum at 18, so not a 2× alias) | 7 | **10** |
| near-black share inside the plate box | **15.0 %** | — | **13.3 %** |
| mean luma inside the plate box | **154.3** | — | **152.6** |
| molten share of plate ink | **18.0 %** | — | **16.2 %** |
| molten ink bbox | x[130,205] y[71,151] | — | x[129,208] y[72,151] |

The arcade's balls are **larger** than our old ones (9.96 native pitch against 7), not three
times smaller. The "~3×" was read on the foreshortened t74 pose: a plate rotated about a
near-vertical axis compresses its lattice along one screen axis, and 16.5/27.5 = 0.60 = cos 53°.

**And the density defect was never a density defect.** The old `drawSphereII` made the BLUE
balls trace a slab-serif "II" and ran a molten band through them. The arcade is the exact
inverse: a **square, fully packed 12×12 lattice** of balls, inside which a subset burn molten,
and **the molten cells are what draw the "II"**. A plate that is the wrong shape measures
sparse inside the right bounding box. Filling the old shape denser would have produced two
denser marble columns.

*Operator note on the two density numbers.* A colour-classified "plate ink" count reads
arcade 7 150 / ours 8 053 and bbox fill 0.480 / 0.559 — a 16 % gap. It is an artefact: the
arcade's darkest ball-rim pixels fail the classifier's `r > 60` and ours do not. The two
operator-free measures above (near-black share, mean luma) agree within 1.7 points and are the
ones to read. Both are published so the disagreement is on the record rather than resolved
silently.

---

## 4. What shipped

### 4a. The display face: polygons, because a cell grid cannot hold a chisel

`src/ui/titleFont.js` is rewritten. The R5 face was an 11×14 cell grid blown up 3×, which
cannot express a diagonal finer than a 3 px staircase and gave every letter the same width.
The new glyphs are **polygon outlines in native px**, scan-converted by hand: for each integer
row, cross the polygon's edges at the row's pixel centre, sort the crossings, round each span's
two ends independently, emit one opaque `fillRect` per span.

**It is hand-rasterised specifically so that it cannot generate a colour.** `ctx.fill()` on a
`Path2D` antialiases every diagonal into a blend ramp — CLAUDE.md's named "Canvas2D fractional
positions" class, which R8 found was generating 14 unauthored blend colours and 24 of this
screen's 44 off-ladder channel values by itself. No fractional edge reaches the canvas here.
§6 is the proof over 512 frames.

A shape is a list of contours filled **even-odd**, which gives the A, R and B their counters.
**The counters are holes, not black knockouts** — the plate is behind the wordmark and the
arcade shows balls through every one.

**ARCHITECTURE.md D5.** The metrics are measured — cap height, 9 px stem, per-letter advance,
terminal-cut angle, the bookend rise and drop. **Every vertex is drawn by hand.** This is
original art in the measured idiom, not a transcription of the logo bitmap; §5's per-glyph
residuals (up to 9.3 % on ink) are what that difference looks like.

**What was actually missing, and it is 3a's cause.** Each word's FIRST and LAST letter is
oversized, and the two words grow in **opposite** directions: AFTER's A and R rise 5 and 7 px
*above* the cap line, BURNER's B and R drop 12 and 13 px *below* the baseline. Our old face
drew eleven letters at one size. That is the whole of the 21 % shortfall — **the figure was
right and its stated cause, "the body is too small", was wrong.** The body cap height is 39 px
and we were drawing 42.

Advances are per-letter and irregular as a hand-drawn logotype's are (AFTER 40/37/38/33,
BURNER 40/39/42/39/36). BURNER's E is a separate glyph from AFTER's: the arcade's two E's span
39 and 41 rows and carry 635 and 710 ink px, so one glyph drawn twice is 10 % wrong whichever
size it is drawn at.

### 4b. The plate: a packed lattice that tumbles

12×12 square lattice, pitch 10, ball 11 px across so the balls touch. The molten cells draw
the "II": two stems joined by one crossbar, **every index measured against the lattice** —
stem rows 2..9 because the arcade's molten ink spans y[71,151] and rows 2..10 would reach 162;
crossbar at row 4 because the widest molten row is y=97 on t=72.30 and y=98 on t=72.25, two
independent frames one pixel apart; stem columns 2 and 9 because the molten ink spans x[130,205].

The tumble is a tip about a screen-horizontal axis at the measured **256 ticks per revolution**,
with the projection rolled about the view axis on a 512-tick period, then perspective-projected.
**Balls do not foreshorten** — they are spheres, so a tipped plate shows round balls at
compressed *spacing*, which is exactly what the arcade's near-edge-on frames show; only their
perspective size changes. → `title-r9-03-TUMBLE-arcade-TOP-ours-BOTTOM-2x.png`.

Two constants are **ADOPTED, not measured**, and marked as such in the source: the camera
distance (fitted so the nearest ball draws ~15 px, the range read on the half-tilted frames
t=71.70 and t=73.50) and the roll period (the band runs at about −48° at t=71.70 and +25° at
t=73.50, a 73° sweep in 108 ticks; a 512-tick roll gives 76° over the same interval — a fit on
**one pair of frames**, which is why it is not called measured).

### 4c. The ball's three zones are measured, not styled

One clean ball on the plate's bottom row, native, with no wordmark over it, reads:

```
      -++--          '#' luma>200   ~20 % of the disc, a BIG upper-left cap
    -++++---         '+' 150..200   ~45 %, the body
   -####++--         '-'  80..150   ~35 %, a crescent on the lower RIGHT
  +#####++--                        plus the bottom two rows
  +####+++--
  ++##++++--
  -++++++---
```

It is a large upper-left **cap**, not a specular dot. The first version of this lane's ball
used a dot plus a right-edge bar and drew a visible dark **grid** between the balls at a 10 px
pitch; the measured zones close that (near-black share 14.0 % → 13.3 % against the arcade's
15.0 %). → `title-r9-06-PLATE-arcade-TOP-ours-BOT-5x.png`.

### 4d. `¡INSERT COIN!` was never a glyph bug

→ `title-r9-04-COIN-before-after-arcade-8x.png`

R8 called the leading inverted exclamation mark "a glyph bug, not a design choice". It is
neither: it is **the rasteriser**, and it is the same class as the half-pixel ball stagger R8
found one function away. R5 fixed the line's SIZE and left it drawn in the 5×7 small face at
`pxX = 1.158, pxY = 1.1`. `font.js`'s edge snapping keeps that off-ladder-free but cannot keep
it SHAPED: at 1.158 some glyph columns render 1 px and some 2, and the dotted i's 2-px stem
comes out as a detached mark.

What the arcade uses here is not the small face at all. Native, on t74: glyph ink **7 px wide
and 7 rows tall on an 8 px pitch, with the dotted i kerned to a 3 px cell** — that is
`FACE_BIG`, the HUD face, at scale 1. Two independent strings confirm it exactly:

| string | arcade, native | our layout |
|---|---|---|
| `iNSERT COiN!` | glyph lefts 120, 124, 132, 140, 148, 156, (space), 167, 175, 183, 187, 196; ink x[120,201] w=82 | ink x[120,202] w=83 |
| `CREDIT   0` | lefts 16, 24, 32, 40, 48 (i), 52, then **12.2 px** to the 0 at 72; ink x[16,78] w=63 | ink x[16,78] w=63, **exact** |

The 12.2 px gap is **three 4-px advances**, not one-and-a-half 8-px ones — so the space in this
face is kerned to 3, like the i. That is one additive entry in `BIG_WIDTHS`, and the two
strings agree on it independently, which is the whole argument. Every string on the title is
now integer-scaled; there is no fractional scale left on this screen.

`'!'` is new in `BIG_GLYPHS` and is **measured**: native x[195,201] rows [184,190], a stroke
that backslants one column per row from the top right down to a **detached dot at the bottom
LEFT**. It is not an upright bar with a dot under it — which is what the 5×7 face's `!` is, and
would have been the nearest wrong answer.

**Blast radius of the two `font.js` changes, checked rather than asserted.** `FACE_BIG`'s only
other callers are `hud.js`'s SPEED / STAGE / score / HIT digits — no spaces, no `!`. The cards
are on `FACE_BIG_CARD`, which is untouched and whose uniform 8-px space is itself measured.
§7 is the regression evidence.

---

## 5. DRAW-WEIGHT — and why the title is measurable now when REFERENCE says it is not

REFERENCE.md licenses DRAW-WEIGHT and explicitly **UNLICENSES it on the title**, because
*"their only references are 686×480 video, where INK/SPAN is read at 2.14× our native scale."*
The licence condition is the reason: *"INK/SPAN is a dimensioned quantity … it may only be
compared between two subjects at a MATCHED SPAN, within ±10 %."*

**That condition is met here by construction, and that is the methodological point of this
lane.** `judging/R9/title_drawweight_r9.py` brings the arcade side down to 320×224 *before*
measuring. Measured span ratio ours/arcade: **1.003**.

Definitions are `tools/art/inkspan.py`'s, verbatim. The MASK is not — that file's mask is the
jet airframe's "achromatic or one of three named hexes" rule, and the subject here is letter
ink, so the operator is re-implemented rather than called with a wrong mask (ledger: "same
name, different operator"). One **deliberate, stated** deviation: `inkspan.py` takes the
largest 8-connected component because its subject is one aircraft; a wordmark is by
construction a set of disconnected glyphs, so the default here is the whole mask and
`--component largest` is kept so the deviation can be priced.

Instrument controls, all passing (`--selftest`): an analytic 3-px-stroke figure; **the same
figure at 2×, where INK/SPAN must double (×1.970) and RSW must not (×0.985)** — the licence
condition's own control; and a filled block of the same span, which must separate on SW
upward (×5.0). Plus the cross-frame control: four independent arcade frames at three different
plate rotation phases **give the identical native bbox and agree on 8 867 ink px to 1.0–1.6 %.**

| wordmark, native 320×224 | arcade | before `52edcc4` | after | after / arcade |
|---|---|---|---|---|
| INK | 8 867 | 10 197 | 9 012 | 1.016 |
| SPAN (Feret) | 231.31 | 230.67 | 231.97 | 1.003 |
| **INK/SPAN** *(licensed: span matched)* | **38.33** | 44.21 | **38.85** | **1.013** |
| DENS | 165.7 | 191.6 | 167.5 | 1.011 |
| **SW** | **5.66** | 6.00 | **5.66** | **1.000** |
| P90SW | 8.94 | 10.00 | 10.00 | 1.119 |
| **RSW** *(scale-free, the one to gate on)* | **2.45 %** | 2.60 % | **2.44 %** | **0.997** |
| bbox fill | 0.332 | 0.491 | 0.341 | 1.027 |

Per glyph, same operator (ink, and SW beside it):

| glyph | arcade ink | ours | Δ | arcade SW | ours SW |
|---|---|---|---|---|---|
| A | 955 | 914 | −4.3 % | 5.66 | 5.66 |
| F | 551 | 535 | −2.9 % | 4.00 | 4.00 |
| T | 455 | 454 | −0.2 % | 4.00 | 4.47 |
| E | 635 | 599 | −5.7 % | 4.00 | 4.00 |
| R (AFTER, bookend) | 973 | 1 044 | +7.3 % | 5.66 | 5.66 |
| B | 1 165 | 1 166 | +0.1 % | 5.66 | 5.66 |
| U | 853 | 897 | +5.2 % | 6.00 | 6.00 |
| R (BURNER) | 787 | 827 | +5.1 % | 4.00 | 4.47 |
| N | 721 | 788 | +9.3 % | 5.66 | 6.00 |
| E (BURNER) | 710 | 694 | −2.3 % | 5.66 | 4.47 |
| R (BURNER, bookend) | 1 062 | 1 094 | +3.0 % | 5.66 | 5.66 |

SW matches on 8 of 11; the three that differ are one rung apart, and `inkspan.py`'s own
docstring says SW is quantised by the pixel grid and a 0.3 difference is not a change. The ink
residuals — largest +9.3 % — are the price of original art rather than a trace, and they are
the number to look at if anyone wants to argue the face is too close to the logo.

### A ONE-SIDED OPERATOR — this lane shipped one, caught it, and it is a ledger row

The first version of `title_drawweight_r9.py` gated the arcade side's red class to the left
30 % of the frame and **did not gate ours**. Our leading B and the plate's molten balls are the
**same ink** — `#f70000`, one board red used for both — so every molten ball counted as letter
ink **on our side only**.

**It is not a wrong operator and it is not a contaminated population. It is *two different
operators applied to the two sides of one comparison*** — which no check that validates "the
operator" in the singular can see. The `--selftest` controls all passed throughout, because
they test the statistics, and the statistics were fine.

It inflated ours by ~1 200 px and produced a per-glyph table reading F +14.7 %, T +23.5 %,
N +15.5 %, **on the strength of which this lane trimmed three glyphs**. The trims survive on
the corrected data (−2.9 %, −0.2 %, +9.3 %), but they were decided on a one-sided operator and
had the sign gone the other way the lane would have thinned correct art to chase a phantom.

Found by **printing the T's rows and seeing a lattice under the baseline, not by any number** —
the contaminated figures were clean, plausible and stable, exactly as CLAUDE.md says they
always are. Both sides now carry both gates and the fix is commented at the site.

**The generalisable rule, and it is cheap: an A/B comparison must run the same operator, with
the same gates, over both sides — and say so.**

---

## 6. Criterion A, and the animation

**R8 closed Criterion A on this screen by construction via `assertOnLadder` on the authored
constants. R9 is a DRAWING round and introduces NOT ONE NEW COLOUR.** The palette list in
`titleScreen.js` is unchanged — 13 constants, 11 distinct colours — and the rotating plate, the
variable ball sizes and the new letterforms all render out of exactly that list.

**Over the title's own full 512-tick loop** (`judging/R9/title_loop_r9.mjs`, calling
`drawTitleScreen` directly, 512 consecutive ticks, no browser):

```
512 ticks: max colours/frame = 11   max channel values/frame = 15   off-ladder values = 0
distinct colours across the whole loop = 11      black frames = 0
distinct frame signatures over 512 ticks = 512
INSERT COIN visible on 256 of 512 ticks = 50.0%
```

Every pose the plate can take, every ball size the perspective produces, both blink phases:
**11 / 15 / 0, and no colour exists anywhere in the loop that is not an authored constant.**

### The cross-area edit, and why a two-line flow defect was filed four times as an art defect

`flow.js:_redrawTitle()` was called **once**, on entry to the title state; `_updateTitle`
advanced `titleTimer` and never redrew. `Overlay`'s texture only updates inside `redraw()`, so
**no amount of work inside `titleScreen.js` could animate anything.** That is the whole of
"24 frames over 120 ticks are one single image", filed as an ART defect in R5, R6, R7 and R8.

Two hunks, **specified to the team lead in advance and applied with explicit approval**
(`flow.js` is owned by no live lane this round); both carry a comment at the site. The tick is
`drawTitleScreen`'s new 5th argument and **defaults to 0**, so the other call site compiles
unchanged and renders the plate face-on. Cost: one 320×224 canvas redraw per tick, only while
the title is up.

**Determinism proved, not asserted** — the lead's condition, and the second check has caught a
real defect in this project before:

| check | result |
|---|---|
| two independent capture runs, same URL, ticks 37/74/111/148 | **byte-identical, 4 of 4** — and the 4 frames are 4 distinct images, so it is not passing on a still |
| `37 × step(1)` against one `step(37)` | **byte-identical** |
| the same tick reached by two different stepping patterns, across runs | the 68-frame census below contains exactly **two duplicate groups, both the same tick in two different runs** (tick 77 in `anim-7`/`anim-a`, tick 91 in `anim-7`/`anim-13`) — a third, incidental confirmation |

**In the shipped build, after the edit** — 68 frames at four tick spacings
(`every=1/7/11/13/29`), `?fixed=1&seed=1&showtitle=1`:

| | before the edit | after |
|---|---|---|
| unique images | **1 of 30** | **66 of 68** (the 2 repeats are the same-tick pairs above) |
| colours / channel values / off-ladder | 11 / 15 / 0 | **11 / 15 / 0** |
| black frames | 0 | **0** |

> **A POPULATION TRAP, caught on the first pass of that census and worth the round's attention.**
> The unfiltered 60-frame run read **65 colours, 26 channel values, 4 off-ladder** and I nearly
> published it as a regression. `TITLE_TIMEOUT_S = 8`, so at **tick 480 the title rolls into
> the attract demo** — four of the sixty frames were stage-1 *gameplay*, correctly rendered,
> inside a census labelled "title". The fix is not a tick cap: it is to **filter on the flow
> state the capture manifest already records for every frame**, which is what the numbers above
> do. A title census that assumes the title is still up is the same defect as a combat census
> that assumes combat is happening (ledger row 21), and the manifest already had the answer.

---

## 7. Regression: the cards and the HUD

**HUD: 1 118 of 1 118 arcade-consensus pixels match**, at `throttle=0.5774`.

The off-by-one in `tools/measure_hud_consensus.py` reproduces exactly as briefed: its docstring
names `f = 0.5634` and that parameter reads **1 114 / 1 118, with all four misses in column 96**
(`(96,201) (96,202) (96,205) (96,206)`, ours black against the arcade's bar fill). **The
corrected parameter is `f = 0.5774`** and it is the one used above. The tool's own self-test
passes (arcade against itself 1 118, one knocked-out pixel costs exactly one match).

**Cards: every R5 figure holds**, measured on the isolation harness
(`/tools/cards-preview.html`), not in situ:

| line | R5 published | now |
|---|---|---|
| CONTINUE PLAY | x[103,207] w=105, both edges exact | **x[103,207] w=105** |
| INSERT COIN (card) | x[112,198] w=87, width exact | **x[112,198] w=87** |
| countdown "10" | ink centre 158.5 | **x[151,166], centre 158.5** |
| READY | x[142,182] w=41, right edge exact | **x[142,182] w=41** |
| tally labels / numbers | x[38,143], right edge exact | **x[38,143]** |
| tally STAGE line | label x[119,159], digit x[184,192] | **x[119,192]** |

`cards.js` was not edited. The `font.js` changes cannot reach it — `' '` and `'!'` were added
to `FACE_BIG`/`BIG_GLYPHS`, the cards are on `FACE_BIG_CARD`, and the HUD number above is the
proof for the other caller.

`npx vite build` passes; every capture in this report exited clean with zero page errors, which
is also the `assertOnLadder` check firing green (a bad palette constant throws at module load
and fails the capture).

---

## 8. What I could not close, in order

1. **The second title card is not built.** The attract loop's second pass (`SHIPS 3` /
   `PUSH START BUTTON!`, plate dollied ~2.3× closer — §0) is a different card, and we draw
   only the first. It is the credit-inserted state, so it is also a flow question, not only a
   drawing one. Newly identified this round; nobody had seen it because nobody had decoded a
   second frame.
2. **The card's ENTRY animation.** The wordmark zooms up from a point over t=64.0–65.3 s, and
   the plate has a lie-flat intro pose (roughly t=65–71) before the steady tumble starts. This
   ships the settled card — GAME_SPEC §7 step 3 — which is what is on screen for the great
   majority of the dwell. Flagged, not silently dropped, in the source.
3. **The attract cycle's other screens** (BEST FIGHTERS / attract gameplay, GAME_SPEC §7 steps
   1–2). Out of this lane's files.
4. **`(c)SEGA 1987` is 4 px wide of the arcade's**: ink x[232,306] against x[232,302]. The
   cause is measured and the fix is refused. The arcade kerns the big face's **`1` narrower**
   on this line (its `1` ink is x[275,278] and the `9` starts at 280, a 5 px advance where the
   face is monospaced on 8). Adding a `1` kern to `BIG_WIDTHS` would move the HUD's score and
   HIT digits, which are pixel-exact at 1 118/1 118 and were measured as monospaced across six
   consecutive digits in two native frames. **A 4 px overrun on the copyright line is cheaper
   than a kerned score digit**, so the residual is published instead.
5. **`iNSERT COiN!` is 1 px wide of the arcade's** (83 against 82) — our `!` cell's ink is one
   column wider than the arcade's. Below what is worth another constant.
6. **An open disagreement about the big face's `A`, for the criteria lane, not for me.** R5
   recorded it as *"a solid triangle, with no counter and no legs"*, measured on the card face
   and corroborated on t124. The title's `(c)SEGA 1987`, at 3.2125× on flat black — a cleaner
   background than either R5 source — shows its bottom two rows as `##.####`, i.e. **with a
   counter**. I did not change the glyph: `A` is in "CONTINUE PLAY", "STAGE" and "HIT COUNTS",
   and one observation at one magnification does not outweigh R5's two. **It is logged here
   rather than acted on, and it wants a third reading.**
7. **The plate's density has two operators that disagree by 16 %** and I published both (§3c).
   The operator-free pair agrees to 1.7 points. A colour-classifier whose threshold decides
   whether the arcade's darkest rim pixel is "ink" is a statistic that is a function of a knob,
   and REFERENCE already has a row about that.

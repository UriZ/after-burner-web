# R6 — HUD quantize lane

Files touched: **`src/ui/hud.js` only.** `src/ui/font.js`, `src/ui/titleFont.js`,
`src/render/screen.js` and `src/render/viewport.js` were audited and need no change — §7 says
why, with the measurement. New tools, all uniquely named and additive:
`tools/hud-probe.{html,mjs}`, `tools/hud_palette_probe.mjs`, `tools/measure_hud_insitu.py`,
`tools/measure_hud_consensus.py`. Captures under `tools/out/hud-quantize-r6/`. No commit,
stash, checkout, reset or push.

---

## Headline

**The HUD no longer emits a single antialiased pixel, and every pixel it draws is an authored
palette colour on the Sega ladder.** Measured on the authored canvas over 120 (state × angle)
renders and in situ over 104 frames at 10 tick spacings.

| | before | after | gate |
|---|---|---|---|
| stage-1 whole-frame channel values, **92 frames / 10 spacings** | 29 / **31** / 37 | 21 / **21** / 21 | ≤ 32 |
| — frames over the gate | **2 of 19** | **0 of 92** | 0 |
| authored canvas, partial-alpha pixels (120 canvases) | **10 398** | **0** | 0 |
| authored canvas, off-palette opaque colours (union) | **135** | **0** | 0 |
| arcade-consensus pixels matching (emblems + throttle) | 1118 / 1118 | **1118 / 1118** | all |

**The emblems and the throttle did not move.** 1,118 of 1,118 arcade-consensus pixels still
match, and the 48 pixels that did change are all inside the reticle, where every one of them
was previously a blend.

---

## 1. What was actually wrong, and it was not only the rotating line

The reticle was one Canvas2D path stroked twice — black at `lineWidth 3`, white at
`lineWidth 1`. Canvas2D has no non-antialiased stroke; it writes fractional coverage to the
alpha channel. `screen.js` then composites the HUD canvas over the world through a
`transparent: true` material, so **every fractional-coverage pixel arrives on screen as a
blend of an authored HUD colour with whatever the sea or sky put behind it.** The near-greys
are a property of the *pair*, which is why they moved with the tick spacing.

Three distinct Canvas2D mechanisms were producing them, and only the first was known going in:

1. **The diagonal.** Any non-axis-aligned stroke. At 15° the attitude line carried 48
   distinct alpha values.
2. **Endpoints off the pixel grid.** The old code snapped every coordinate to a half-integer,
   which is correct for a 1-px stroke's *width* and wrong for its *length* — a butt cap at a
   half-integer half-covers the end pixel. This fired at **every** angle including 0°, which
   is why the defect was present on frames where the line was perfectly horizontal.
3. **A seam between overlapping subpaths, which I did not expect and which explains six
   specific pixels.** Two overlapping collinear subpaths inside one `stroke()` do not union
   their coverage: the second subpath's butt cap stamps a half-covered pixel *on top of ink
   the first subpath already covered completely*. That is where the old reticle's
   `#7b7b7b` came from — white at alpha 127 over the opaque black under-stroke — at the two
   attitude-line ends and the four bracket corners. **Pixels that plain geometry says are
   fully interior to the figure.** Reproduced standalone on fresh 40×12, 40×40 and 320×224
   canvases (alpha 127 at the overlap; 255 when the same two segments are stroked
   separately). It is filed in `ask-hud-quantize.md` as a bug class, not just an incident:
   reading the code cannot find it, only a capture can.

Mechanism 3 also manufactured **opaque** off-palette colours, which is the part that matters
for Criterion A: a solid `#7b7b7b` is not a transparency artefact that the world explains
away, it is a colour the HUD invented and wrote at full alpha.

## 2. The fix: the reticle is drawn as pixels

`drawReticle` no longer builds a path. It rasterises into a small reusable buffer —
bracket corners, ticks and a **Bresenham** attitude line — then dilates the ink 3×3 for the
keyline and paints both as horizontal spans. Coverage is 1 bit everywhere, at every angle,
by construction. This is what the board would have done in 1987; the arcade's HUD on both
native frames carries zero intermediate values.

**The constants are a transcription, not a redraw.** For each element I worked out which
pixels the old path covered with coverage *exactly 1*, and reproduced that set:

| element | old path | pixels at full coverage | new constant |
|---|---|---|---|
| corner L | miter + two legs ending on a half pixel | corner + 3 per leg | `RET_ARM = 4` (incl. corner) |
| side tick | `-2` then `-tick`, `tick = 6` | 5 columns, 2 clear of the bracket | `RET_TICK_GAP = 2`, `RET_TICK_SIDE = 5` |
| top/bottom tick | `tick * 0.6` = 3.6 path px | 3 rows (the 4th was alpha 25) | `RET_TICK_VERT = 3` |
| attitude line | `lineLen = half + 4` from a half-integer centre | 25 px, 12 each side | `RET_LINE_EXT = 3` |

The keyline is now a 3×3 dilation of the finished figure rather than a `lineWidth 3` stroke.
For a 1-bit centreline those are the same figure, and the dilation cannot put a
partial-coverage black pixel under a partial-coverage white one — which is what made the
opaque greys.

**Evidence:** `hud-01-reticle-BEFORE-TOP-AFTER-BOT-roll-0-15-45-8x.png`, and
`hud-02-reticle-roll15-BEFORE-LEFT-AFTER-RIGHT-14x.png` at 14× where the difference is not
arguable — the old 15° line is grey mush, the new one is a staircase.

## 3. Criterion A, in situ

Both sets `seed=1&nocombat=1`, measured with `tools/measure_criterion_ab.py` (the world
lane's instrument, `--selftest` passing) and cross-checked with `tools/measure_hud_insitu.py`.
Every capture set swept for black and duplicate frames: **0 black, 0 duplicates throughout.**

**BEFORE — 20 frames, 4 spacings (137 / 211 / 300 / 419).** Reproduces the world lane's
table exactly, which is an independent corroboration of their figure:

| spacing | per-frame channel values |
|---|---|
| 137 | 31 31 31 **35** 31 |
| 211 | 31 31 29 31 31 |
| 300 | 31 **37** 31 31 31 |
| 419 | 31 31 31 31 **44** *(stage 2, read off the HUD digit)* |

Stage-1: min 29, median 31, max 37 — **2 of 19 over the ≤32 gate.**

**AFTER — 104 frames, 10 spacings (97 / 137 / 173 / 190 / 211 / 220 / 251 / 260 / 300 / 419),
with the reticle at a spread of angles.**

| set | frames | roll | stage-1 channel values |
|---|---|---|---|
| `after-nc-*` | 20 | 0° | 21 on every frame |
| `after-roll-*` | 48 | ±30°, ±66.5° (`?debugstick=±0.45, ±1`) × 3 spacings | 21 on every frame |
| `after-stages-*` | 36 | 0°, run through the stage-1→2→3 transition | 21 on every stage-1 frame |

**Stage-1, all 92 frames: min 21, median 21, max 21. 0 of 92 over the gate.** Unique colours
46 / 51 / 51 against the ≤256 gate. Stage is **read off the HUD digit** on every frame, never
assumed (`tools/measure_hud_insitu.py`, exact 7×7 match against `font.js`'s BIG face).

The four stick angles were cropped and looked at —
`hud-03-attitude-line-stick-n1-n045-p045-p1-7x.png` — because four capture sets returning the
identical number 21 is exactly the shape of a sweep that did not happen. The line is at four
visibly different angles and the four frame md5s differ.

## 4. Every HUD pixel is an authored palette colour — measured two ways

**(a) The authored canvas, with no world in it at all.** `tools/hud_palette_probe.mjs` drives
the real `Hud` instance, whose own canvas is the page's `#screen`, and reads `getImageData`
in-page (no PNG round trip, because un-premultiplying a partial-alpha pixel can change its
RGB and partial alpha is the quantity under test). 5 HUD states × 24 angles = 120 canvases.

| | before | after |
|---|---|---|
| partial-alpha pixels, total | 10 398 | **0** |
| partial-alpha pixels, worst single canvas | 104 (62 distinct alphas) | **0** |
| off-palette **opaque** colours, union | 135 | **0** |
| channel values over all 120 canvases | 152 | **16** |

The 16 are `0 33 58 66 82 99 115 132 148 164 181 197 214 230 247 255` — **every one on the
enumerated Sega ladder in REFERENCE.md.**

`HUD_PALETTE` is now **exported from `src/ui/hud.js`** and the probe reads it over the wire,
so the gate cannot drift from a retyped copy in a tool — the staleness class `hud_mask.py`
exists to kill, applied to colour instead of geometry. Adding a colour to the HUD without
adding it to the list makes the probe fail loudly.

**Instrument control, run before any figure is printed** (`--selftest`, 6 gating cases + 1
INFO): empty canvas, an authored block, an off-palette block, **a planted antialiased
diagonal**, **a planted half-integer butt cap** (exactly 2 px at alpha 127), and an
integer-endpoint negative control (0 px). The planted cases exist so that a clean run on the
real HUD cannot be a blind instrument. **One of my own known-answers was wrong and the control
caught it**: I first asserted that integer endpoints antialias. They do not — an integer
endpoint is a pixel boundary. The assertion was wrong, not the renderer, and that distinction
is exactly what decided which coordinates in `drawReticle` needed changing.

**(b) In situ, against the frame's own world.** `tools/measure_hud_insitu.py` flags any colour
inside a HUD band that is neither an authored HUD colour **nor present elsewhere in the same
frame outside every HUD band** (so the world showing through the reticle is not counted as a
violation).

| set | frames | reticle | top | bottom |
|---|---|---|---|---|
| before, nocombat | 20 | **119** | 0 | 0 |
| after, nocombat | 20 | 0 | 0 | 0 |
| after, rolled | 48 | 0 | 0 | 0 |
| after, stage sweeps | 36 | 0 | 0 | 7 → **all world, see below** |
| after, **combat on** (`seed=3`, 3 spacings) | 15 | 0 | 0 | 5 → **all world, see below** |

The before column lists exactly the near-greys the world lane reported — `#9d9da8 #a8a8b5
#b2b2b7 #90909d #848490 #bdbdbd` — plus `#7b7b7b` on every frame.

**Two residuals, both chased to the end and both world.** Stage 2 left 3 pixels
(`#632100`, `#311000`) and the combat set left 67 (`#4e0076` and four neighbours). In both
cases **the HUD canvas has alpha 0 at those exact coordinates**, so the HUD drew nothing
there; they are rare ground and effect colours that happen to occur nowhere else in the
frame, so the control band could not account for them. The combat crop
(`tools/out/hud-quantize-r6/combat-bottomband-check.png`) shows a purple effect plume well
clear of the HUD elements.

**A correction to this tool, made before publishing.** Its first version used a hand-picked
control column range beside each band and reported 5 "unexplained" colours in the TOP band on
9 of 20 frames. I cropped them: **it is a cloud** reaching up into the score-digit rows —
2,544 of its 2,706 pixels lie outside the band, and its own control sat on the other side of
the screen. Widened the control to the whole frame outside every band. The direction is
stated in the tool: widening can only make it **looser**, which is why it is the second
instrument and `hud-probe.mjs` — which has no world in it and so no such hole — is the first.

## 5. Stage 2

The asked-for check was that stage 2's bottom HUD rows stop contributing channel values
beyond the authored palette. **They do, and the stronger statement is available:**

**A/B on the identical frame** (seed 1, tick 2095, stage read off the digit):

| | before | after |
|---|---|---|
| whole-frame channel values | **44** | **33** |
| channel values contributed by HUD bands alone | **12** `[66, 81, 83, 88, 123, 134, 137, 144, 154, 168, 183, 232]` | **1** `[66]` |
| reticle-band unexplained colours | 5 | **0** |

The single remaining value is **66 = 0x42**, from `BAR_BLUE_ROWS[0]` `#42c5f7` — authored, on
the ladder, and transcribed from the arcade's own bar. On stage 1 the equivalent figure is
also 1 (197 = 0xc5, the same colour).

**Stage 2 is still over the gate at 33, and it is not the HUD.** The world alone, measured
outside every HUD band, is already at **32** — at the limit before the HUD adds anything. The
HUD's entire remaining contribution is one ladder rung.

For calibration, the same operator on the arcade's own native frames: **the arcade's HUD
contributes 0 channel values** that its ground does not already use (desert 31 whole-frame /
31 outside the HUD; night 17 / 17). Its ground palette is simply rich enough to cover its HUD.
Ours is not, which is a property of the world palette, not a HUD defect.

**I did not change `#42c5f7` to close the one-rung gap.** It is a transcription from
`ab2-arcade-desert.png`, and moving a measured colour to win a cardinality count is the
failure mode STATUS.md already has a ledger for.

## 6. No regression: the pixel-exactness re-check

`tools/measure_hud_consensus.py`, written from the method in `judging/R5/lane-presentation.md`
(that harness was not left in the tree). Consensus = pixels where the two native arcade frames
are byte-identical — derived from the frames, not a drawn box. **A pixel where we draw nothing
counts as a mismatch**, so a HUD that omitted an element could not score 100 %.

My independently derived consensus counts land on R5's published per-element figures exactly:
**SCORE 610, HIT 196**, throttle **312** (= R5's 144+12+26+28+90+12). Total 1,118 per frame;
R5 quoted 1,106, i.e. one 12-px group fewer, so the two operators differ by that one group.

```
SCORE emblem       610 /   610
HIT emblem         196 /   196
throttle widget    312 /   312
TOTAL 1118 / 1118 arcade-consensus pixels match
```

Controls pass first: the consensus is neither empty nor the whole frame (3.5 % of the frame);
the arcade scored against itself is 1118/1118; one knocked-out pixel costs exactly one match.

**The throttle caveat, because this is the one place the comparison could be gamed.** The
bar's fill extent depends on `throttleFraction`, so the subject is rendered at the arcade's
own setting (fill to x96, `?throttle=0.5775`). Measuring a live gameplay frame instead would
score our throttle *position* against theirs and report the difference as a bitmap error — my
first attempt used f = 0.5634 and returned 4 mismatches at x96 for exactly that reason
(`end` is exclusive).

### Which pixels moved

20 before/after frame pairs at identical seed and tick: **48 distinct pixels changed, all of
them inside the reticle band. 0 in the top band, 0 in the bottom band — no glyph pixel moved.**

| before → after | px | what it was |
|---|---|---|
| `#0073bb` → `#000000` | 24 | sky faintly darkened by keyline AA → solid keyline |
| `#90a3c0` → `#000000` | 12 | same, different blend ratio |
| `#7b7b7b` → `#f7f7f7` | 6 | the overlapping-subpath seam → solid white ink |
| `#009fff` → `#000000` | 4 | bare sky at the tick tips → keyline, now a closed ring |
| two sky blends → `#000000` | 2 | |

**White ink is a strict superset: 61 → 67 px, 6 added, 0 removed. Keyline 134 → 176, 42 added,
0 removed.** Nothing was lost and nothing moved position; 44 pixels gained a solid keyline
where there had been a faint blend, and 6 became solid ink where they had been 50 % grey.
Legibility goes up, not down.

### The one visible change beyond crispness: the status dot

The dot is drawn `fillRect(cx-2, cy-2, 4, 4)` black with `fillRect(cx-1, cy-1, 2, 2)` colour.
With the old half-integer `cx`/`cy` **both rects landed on fractional edges**, so the dot
rendered as a 5×5 smear at partial coverage (`#801d10`, which is RED_LOCK at ~50 %). It is now
the 2-on-4 it was always authored as: 4 solid red pixels on a solid 4×4 keyline. **Smaller in
extent, higher in saturation.** Its size is not measured against the arcade — flagged in
`ask-hud-quantize.md`.

### One colour changed: RED_LOCK

`#ff3b1f` → `#ff3a21`. Its `0x3b` (59) and `0x1f` (31) are on **neither** native arcade
frame's channel set — the ladder runs …25, 33… and …58, 66… — so this one unmeasured colour
was the HUD's only off-ladder ink and put two channel values into every frame with an enemy in
play. The shift is 1–2 levels where the ladder's own step is 8. The hex was never a
measurement (the code says so); it remains a visual match to REFERENCE.md's t175 "orange-red".
**After this, every one of the 22 authored HUD colours is on the ladder.**

## 7. The other four files need no change, and here is the measurement

- **`src/ui/font.js`** — clean. `forEachCell` snaps each cell's two *edges* independently and
  takes the size from their difference, so both edges are integers even at a fractional scale.
  Confirmed in the sweep: 120 authored canvases, all glyph-bearing, **0 partial-alpha pixels**.
- **`src/ui/titleFont.js`** — clean. Integer-rounded origins, run-length spans, and its only
  caller (`titleScreen.js`) passes `TITLE_SCALE = 3`, an integer. `drawText`'s fractional
  `coinPx` path is safe for the reason above.
- **`src/render/screen.js`** — no change needed, and the composite is now provably exact. With
  the HUD canvas at 1-bit alpha the `transparent: true` blend is a no-op, and the in-situ
  frames contain `#f7f7f7` and `#000000` verbatim in the reticle band — so no sRGB
  double-encoding on this path.
- **`src/render/viewport.js`** — two constants.

## 8. Cost, since this runs every frame

Head-to-head on a scratch 320×224 canvas, 4,000 iterations after warm-up:

| | ms / frame | % of a 60 Hz budget |
|---|---|---|
| reticle, R5 stroked form | 0.0053 | 0.03 % |
| reticle, R6 pixel form, 1×1 fillRects | 0.2233 | 1.34 % |
| **reticle, R6 pixel form, horizontal spans (shipped)** | **0.1514** | **0.88 %** |
| whole HUD redraw, shipped | 0.893 | 5.4 % |

The first pixel version cost +0.218 ms, which is a lot to spend on one element, so the buffer
is reused across frames and the output is painted as spans (~60 `fillRect`s instead of ~600).
The remaining +0.146 ms is dominated by Canvas2D `fillRect` itself on the headless software
rasteriser. The span rewrite is **byte-identical** to the per-pixel version — verified by md5
on three authored canvases and five in-situ frames — so every figure above survives it.

## 9. Open

- **Stage 2 fails Criterion A at 33 and the world is already at 32 without the HUD.** World
  lane's call. The HUD's contribution is one authored ladder rung and I am not moving it.
- **Combat blows Criterion A wide open and it is not the HUD.** 15 frames with combat on,
  3 spacings: whole-frame channel values 31–238, colours 59–858, while the reticle, top and
  bottom bands stay at 0 unexplained colours throughout, status dot included. Explosions and
  trails, i.e. the combat lane.
- Details and three smaller items in `judging/R6/ask-hud-quantize.md`.

## Captures

All under `tools/out/hud-quantize-r6/`. Every set swept for black and duplicate frames;
**0 black, 0 duplicates in every set.**

| dir | what |
|---|---|
| `before-nc-{137,211,300,419}` | baseline, 20 frames, taken before any edit |
| `after-nc-{137,211,300,419}` | same seeds and ticks after the fix — the A/B pairs |
| `after-roll-{neg100,neg045,pos045,pos100}[-97,-251]` | 48 frames, 4 stick angles × 3 spacings |
| `after-stages-{190,220,260}` | 36 frames through the stage-1→2→3 transition |
| `after-combat-{113,197,283}` | 15 frames with combat live, seed 3 |
| `before-canvas-{0,15,45}`, `after-canvas-{0,15,45}` | authored canvas over a flat backdrop |
| `before-canvas.json`, `after2-canvas.json` | full 120-canvas probe output |
| `alpha-{flight,full}` | HUD alpha masks, used to prove the residual pixels are world |

**One self-inflicted near-miss worth recording.** My first roll sweep named its output
directories with `tr -d '.-'`, which mapped `-1` and `1` to the same name and `-0.45` and
`0.45` to the same name — two capture runs silently overwriting two others, which is precisely
the reused-directory corruption `lane-world.md` §0.2 warns about. Caught by reading the loop,
not by any tool. Re-run with distinct names and the four md5s confirmed distinct.

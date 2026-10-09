# R7 — world lane

Files touched: `src/render/ground.js`, `src/render/sky.js`, `src/game/stage.js`,
`tools/measure_stage_identity.py` (new), `tools/measure_night_ground.py` (new),
`tools/measure_stage_criterion_a.py` (new), `tools/sweep_night.py` (new),
`tools/sweep_dash.py` (new), `tools/measure_sea_dashes.py`, `tools/clouds-preview.html` and
`tools/cloud-tex-preview.html` (one line each: a `<link rel="icon" href="data:,">` so the
automatic favicon request stops making `capture.mjs` exit non-zero on these harnesses).
**`src/render/clouds.js` was not touched this round.** Nothing outside the lane's file list.

Started from `e8fed58`. Capture dirs are all under `tools/out/world-r7/`; the final figures
come from `V-nc-{97,137,211}`, split by HUD digit into `V-s{1,2,3}-{97,137,211}`.

**Tree state, because an our-side figure is incomplete without it.** Every figure below was
measured on the **shared uncommitted working tree with four lanes live**, not on a commit.
That is not a formality here — midway through the round a stage-1 `?nocombat=1` frame changed
by 1 018 pixels between two of my own captures, entirely in native rows 105–142 cols 102–217,
which is the player sprite: the sprite lane shipped a new airframe underneath me. Ground, sky
and sea figures are unaffected (they are measured in bands the sprite does not reach, and the
`?hidejet=1` arm reproduces them), but the **whole-frame** Criterion A figures are a composite
over five lanes and must be re-measured against whatever the TL commits.

---

## 0. Instrument work, and the three times a control caught me

Four new instruments, each validated on a known input before it was pointed at the build.

| instrument | control |
|---|---|
| `tools/measure_stage_identity.py` — reads the HUD STAGE digit out of one of our frames | `--selftest` renders font.js's own 1/2/3 bitmaps, exact and +1 px shifted, plus a blank, a random-ink cell and a sea-cap-contaminated cell. PASS. 168 of 168 final frames read a digit. |
| `tools/measure_night_ground.py` — gap 2's band / background V-identity | synthetic flat, 1 px dither, 2×2 blocks, flat+10 % sparse lights (all hand-computable), then **reproduces the R6 judge's published arcade control to two decimals**: night ground rows 140–195 H **78.24** / V **72.85** against its published 78.2 / 72.9. |
| `tools/measure_stage_criterion_a.py` — Criterion A per digit-verified stage, split by region | reproduces REFERENCE.md's two native arcade frames exactly: 138 / 31 union / 29 per-channel, and 79 / 17 / 17. |
| `tools/measure_sea_dashes.py` (extended) | its existing selftest still passes, including the t116 foam calibration at 19.5 %. |

Sweeps use `tools/sweep_night.py` and `tools/sweep_dash.py`, which implement all three hardening
rules this lane earned in R6: fresh directory per row, capture's stderr filtered rather than
discarded with a non-zero exit aborting the sweep, and any row whose frames are byte-identical
to an earlier row's discarded as a run that did not happen.

**Corruption sweep on the final sets: 168 frames across 3 spacings, 0 black, 0 byte duplicates,
0 page errors.**

### Three controls that caught my own work

1. **The digit reader failed on every stage-1 frame and returned a plausible answer anyway.**
   Its first ink test was `max(R,G,B) >= 128`. The stage digit is drawn **over the world** with
   no opaque bar, so on stage 1 the sea (`#0010e7`, B 231) read as ink and the cell came back
   solid — 19 frames classified "no digit" with a stable Hamming distance of 11. The fix is an
   exact match against hud.js's authored `#f7f794`, and the selftest now plants sea-cap pixels
   (`#d6f7f7`, which survives an `R>=128 and G>=128` test) inside the cell.
2. **A derived "static mask" measured 36 % of the stage-3 band and I threw it away.** To
   separate the bottom HUD from the ground I reused `measure_criterion_ab.py`'s rule —
   below-horizon pixels byte-identical across every frame of a run — and it selected 6 390 of
   17 600 band pixels. The rule is sound on a scrolling sea and **invalid on the night ground
   this round's own fix made nearly flat black**: a pixel that is `#000000` on every frame is
   invariant by coincidence, not because it is an overlay. Reported without it; the option is
   still in the tool, documented with this failure.
3. **A dash sweep silently ran at scale 0.34 while reporting 0.58.** `sweep_dash.py` scales
   relative to whatever is in `stage.js` when it starts, and I had already baked 0.58 in, so a
   second 0.58 sweep measured 0.58². The byte-identical-rows detector cannot see this — the
   rows do differ, they are all just at the wrong scale. Caught because the same parameters
   returned 684 components where an earlier run returned 388; **same inputs, different numbers,
   which is the detector's mirror image.** The tool now prints the absolute cell sizes per row.

---

## 1. Gap 2 — stage 3's night ground. CLOSED

**Reproduction asked for**: a digit-verified stage-3 frame reads ≥50 % V-identity on rows
140–195 minus the HUD mask, with background-only V-identity (V < 0.25) ≥85 %.

**54 digit-verified stage-3 frames, three tick spacings (97/137/211), `?fixed=1&seed=1&nocombat=1`,
HUD mask derived per run with `hud_mask.py`:**

| | gate | R6 | **R7 (min / median / max)** | arcade native night |
|---|---|---|---|---|
| band V-identity, rows 140–195 | ≥50 % | 43.3 | **67.91 / 72.0 / 73.47** | **72.85** |
| background-only V-identity | ≥85 % | 45.2 | **85.86 / 91.2 / 92.23** | 93.92 |
| distinct background colours | — | 4 | **4 on every frame** | 4 |
| dominant background colour share | — | 34.8 | **77.9 / 85.3 / 86.2** | 92.0 |
| light share of the band | — | 17.8 | **20.9** | 18.8 |

**Both gates pass on every one of the 54 frames.** Crop:
`world-r7-02-stage3-BEFORE-AFTER-ARCADE.png` — the mottled navy field is gone and what is
there is flat black carrying a dense scatter of coloured lights, which is what the arcade's
own native frame shows.

### What was actually wrong, and it was not the lever I expected

The judge's framing — "the palette is already right, this is arrangement" — is correct, and
the arrangement defect had **two** causes, only one of which is the sea's lever.

**(a) The night field was never filtered.** Both layers were raw `fbm`/`fbm2` sampled through a
perspective camera. From this shader's own analytic control, one native row spans 1.20 world
units at row 160 (d 24.3) against a grain lattice of 0.80 — **1.5 lattice cells per row**, so
everything above row ~175 was alias rather than texture. `fbm2Lod` (new) plus
`nightLodBoost: 1.6` fixes it, and alone it moved band V 44.8 → 64.6 and background V
46.7 → 71.5 on the isolated harness.

**(b) The value distribution was fitted to a video frame and was wrong.** `stage.js` solved
`vHi` and `nightGamma` against t175's percentiles (`p50 0.047 / p95 0.192`). **Re-measured,
t175's ground band carries 664 distinct colours with B taking 1, 2, 4, 6, 11, 12 … — values
that are not on the hardware ladder at all.** Those percentiles are a codec's smear plus the
halo of every city light, biased upward exactly in the dark end the fit was anchored to.
Snapped to the ladder, t175 still reads 42.5 % pure black and t186 57.3 %, against the only
true-native stage-3 frame's **92.0 %**. REFERENCE.md's own rule ("only the two true-native PNGs
qualify on the arcade side") decides it.

| background colour | arcade native | ours R6 | **ours R7** (median of 54) |
|---|---|---|---|
| `#000000` | **91.97 %** | 27.4 % | **84.98 %** |
| `#000031` | 3.08 % | 17.6 % | 8.22 % |
| `#000010` | 2.60 % | 34.8 % | 3.78 % |
| `#000021` | 2.34 % | 20.2 % | 2.84 % |

(The `#000031` share runs about 5 points over the arcade's. It is the brightest of the four and
is where the horizon glow band's tail lands, which is the same banked-vs-level frame difference
as the dominant-share residual below.)

So the structure became the one the sea already uses: a **dominant flat base plus sparse
patches**, with `nightPatchCut` holding 93 % of the index field at exactly `#000000` and the
remainder ramping through the other three rungs. Gamma alone cannot do this — swept, it tops
out at 83 % dominant share at γ=11 while flattening horizontal identity far past the arcade's.

**(c) The city lights were 2.7× too sparse.** The judge's crop note was "denser and clustered
into short runs"; the density half is measurable on REFERENCE.md's own band.

| y[150,190] x[10,310], V > 0.5 | arcade | ours R6 | **ours R7** |
|---|---|---|---|
| share | 9.38 % | 3.51 % | **8.99 %** |
| 4-connected components | 717 | 372 | **804** |
| component p90 / max px | 3 / 14 | 2 / 5 | 2 / 11 |

### Paired extremal statistics, because a self-identity gate is satisfiable by a slab

| band rows 140–195 | arcade | **ours R7** |
|---|---|---|
| largest same-colour component | 10 692 px | 11 618 px |
| horizontal run p50 / p90 / max | 1 / 9 / 127 | 2 / 15 / 320 |
| light components | 1 094 | 947 |

Ours is slightly flatter than the arcade on both, and the `run max 320` is a full-width
identical row that the arcade's frame cannot produce because **that frame is banked** — see the
honest limit below.

### The honest limit on this gap

The arcade's only true-native stage-3 frame is a **bank**, so rows 140–195 on it contain a
diagonal sky/haze wedge where ours contain a full-width horizon glow band. That accounts for
the whole of the remaining dominant-share difference (85.3 % against 92.0 %) and for our higher
`band H`. On the **glow-free sub-band rows 160–195**, where both sides are pure ground, the
match is near-exact:

| rows 160–195 | ours | arcade |
|---|---|---|
| band H-identity | 78.77 | 78.64 |
| band V-identity | 76.45 | 73.43 |
| background-only V | 97.68 | 96.27 |
| dominant background share | 97.05 | 94.61 |

---

## 2. Gap 3 — publish SEA-DASH's patch, and the depth coarsening. The patch is published, the
coarsening is closed, and the criterion has a third defect nobody had found

### 2.1 The patch, published

`tools/measure_sea_dashes.py` now names it in the module docstring and in code:
**`PATCH_ROWS = 150, 160, 170`; each patch 48 rows tall, `x[20,300)`.** `--all-offsets` runs
the gate over all three. The three are not redundant: they sample ground distances
48.3 → 8.6, 24.9 → 7.2 and 16.3 → 6.5 on this project's own camera, so sweeping the offset
sweeps **depth**, and the arcade's dash geometry is nearly invariant under it while a
world-space noise field's is not. That invariance is the real criterion.

### 2.2 The third defect: two of the three offsets measure the HUD, on both sides

**The `area max` failures the R6 judge reported at rows 160–208 and 170–218 are the bottom HUD,
not the sea.** Our bottom HUD occupies native rows **198–219** — derived, not assumed: over 24
stage-1 frames at 71-tick spacing, the below-horizon pixels byte-identical across every frame
(the sea scrolls at 68.93 world units/s, so an invariant one is an overlay) are exactly those
rows. REFERENCE.md's own Criterion B operator already excludes rows 196–216 as HUD on the
arcade's native frames.

Cropped and looked at: the largest "foam" component in the rows 170–218 patch is **243 px at
native rows 199–208 carrying `#f70000`, `#f7f7f7` and `#0000f7`** — the red STAGE label and the
white SCORE digits. It is the same 243 px before and after this round's work, which is why no
amount of sea tuning moves it.

So the criterion needs two repairs, both raised in `ask-world.md`: **clip the patch at row 198**,
and **state the count gate as a density** (components per 1 000 patch px), because clipping
makes the three patches 48, 38 and 28 rows tall and a flat "count ≥ 300" is then meaningless.

### 2.3 The coarsening, closed

**Clipped operator (HUD excluded), 67 digit-verified stage-1 frames at three spacings:**

| components per 1 000 patch px | rows 150–198 | 160–198 | 170–198 | change across the sweep |
|---|---|---|---|---|
| **R6** | 32.81 | 24.06 | 17.86 | **−46 %** |
| **R7** | 28.0–28.6 | 27.4–27.6 | 25.9–26.4 | **−7 %** |
| arcade t116 | 28.94 | 30.83 | 32.40 | +12 % |

| at rows 170–198 | w p50/p90/max | h p90/max | area p50/max | foam |
|---|---|---|---|---|
| **R6** | 4 / 13 / 38 | 4 / 11 | 4 / 122 | 18.6 % |
| **R7** | 3 / 11 / 36 | 3 / 9 | 3 / 92 | 20.3 % |
| arcade | 2 / 8 / 27 | 4 / 8 | 2 / 78 | 21.7 % |

**Unclipped (the criterion exactly as the R5 and R6 judges used it):**

| | rows 150–198 | 160–208 | 170–218 |
|---|---|---|---|
| **R6** components | 435 ✓ | 294 ✗ | 200 ✗ |
| **R7** components | 376 ✓ | 351 ✓ | **316 ✓** |
| **R7** area max | 93 ✓ | 233 ✗ | 243 ✗ |
| arcade components | 389 | 414 | 459 |

The count gate now passes at all three offsets. The two `area max` cells that still fail are
the HUD text, proved above.

### 2.4 The mechanism, and the version of it that was wrong

The cap and crest scatter layers are sized in native pixels **at one reference distance**, which
means sized in world units everywhere, which means screen size ∝ 1/d. A depth LOD ladder in
**powers of two** fixes it. Powers of two are forced, not preferred: multiplying the sampling
coordinate by a factor that varies *continuously* across the screen is the ill-conditioned
operation `ground.js` already documents under `freqBoost` — `uScroll` reaches ~3 200 by t=47 s,
so a 0.0007 change in the factor between adjacent pixels moves the sample a whole lattice cell.
A piecewise-constant factor has no such derivative, and `exp2` of an integer is exact. The band
boundary is hidden by crossfading the two bracketing octaves **by density** (each octave's
headroom above its threshold scaled by its weight) rather than by blending their noise, which
would halve the variance and collapse the count in the crossfade.

**The first version of this was wrong and measurement caught it.** It held screen size at every
depth, growing the world cell beyond the reference distance as well as shrinking it inside.
Measured, it made all three patches *worse* — 195 / 188 / 162 components against the 435 / 294 /
200 it replaced, foam down to 14 % — because the premise was wrong: the arcade's dash population
is **not** constant-size. On t116 it is dominated by one- and two-pixel specks (w p50 2) with a
tail to 38 px, and it gets slightly **denser and finer** toward the camera. Holding our far-field
cells at a constant screen size replaced that speck population with 8–10 px dashes.

What was actually broken was the near field only, so the ladder steps **down** from the reference
distance and is identically 1 beyond it. The six cell sizes then had to shrink ×0.58 (swept) so
that the size being held is the arcade's typical dash and not the 10 × 2 px one the old
near-field reference had authored.

### 2.5 What it cost, stated

`seaLodBoost` had to go 2.6 → 3.2. Smaller dash cells mean more foam/non-foam boundaries, and a
mixed vertical pair contributes 0 to Criterion B by construction; at 2.6 the 280×48 near patch
fell to **V 48.24 %** on the worst of 67 frames, i.e. **under the 50 % floor**. The trade is the
value p5–p95 spread, which moves from a 67-frame median of **0.322 (inside the arcade's
0.302–0.329)** to **0.259 (one ladder rung below it)**. Both statistics are quantized to
multiples of one rung (0.0646) and the published spread band is narrower than one rung, so the
two cannot both be centred — raised in `ask-world.md`.

**Criterion A/B non-regression, identical 67-frame and 47-frame populations, R6 vs R7:**

| stage 1 | R6 mean (min) | **R7 mean (min)** | gate |
|---|---|---|---|
| band H-identity | 80.34 (78.86) | 79.16 (77.28) | ≥50 ✓ |
| band V-identity | 58.58 (54.78) | 57.21 (54.54) | ≥50 ✓ |
| near-patch H | 79.67 (77.41) | 79.70 (77.35) | ≥50 ✓ |
| near-patch V | 56.94 (51.12) | **56.00 (51.11)** | ≥50 ✓ |
| unique colours max | 51 | 52 | ≤256 ✓ |
| channel values max | 26 | **25** | ≤32 ✓ |

---

## 3. Gap 9 — stage 2's Criterion A2 residual. CLOSED, and it was all in `sky.js`

**Re-measured first, as instructed.** On the live tree, 47 digit-verified stage-2 frames at three
spacings: whole-frame A2 union **33 median / 38 max** against ≤32 — reproducing the R6 judge's 33
exactly, and confirming that the R6 world lane's published 41–43 does not survive the HUD fix.
**The bottom HUD band carries 14–17 values and 0 off-ladder ones, so none of the residual is
the HUD's.** The horizon band carried 27, the ground 11–12.

**Posterizing the ramp parameter is not the same as quantizing the colour**, and that is the whole
defect. R6 quantized `s` into N+1 steps, which correctly stops the band being a gradient — but the
N+1 colours it then emits are *mixes of two ladder colours*, and a mix of two ladder entries is
almost never a ladder entry. On the worst stage-2 frame, **14 of the frame's 18 off-ladder channel
values were in that band**: R 231/233/235/238/240/242/245 and G 133/149/162/174/186/196. The R6 art
critique found the same list independently.

Fix: `sky.js` snaps the posterized colour to REFERENCE.md's **enumerated 31-entry ladder**
(transcribed, not generated — the document is explicit that `round(k·255/31)` disagrees in two
places and emits an 8 that appears in neither native frame), opted into per stage by `skyLadder`.
Stage 1 does **not** opt in: its sky is a flat fill of the judged `#009fff`, a video-derived value
that is not on the ladder, and snapping would move it to `#00a4f7`.

**A second off-ladder source was ours and nobody had noticed: `ground.js`'s quantizer did not
reproduce the table in its own comment.** `floor(c*15+0.5)*247/15` evaluates to 164.67, 197.6 and
230.53 at rungs 10, 12 and 14, which the 8-bit write rounds to **165, 198 and 231** where the
hardware has 164, 197 and 230. Measured on our own captures: the sea's modal body colour was
rendering as `#0010e7`, not the `#0010e6` its palette comment claims. Three of sixteen rungs wrong
by +1 is visually nil on its own and doubles entries in Criterion A2's union for nothing. Now a
nearest-by-value snap to the exact table.

**Result, 168 digit-verified `?nocombat=1` frames, three spacings, by region (A2 union):**

| region | stage 1 R6 → **R7** | stage 2 R6 → **R7** | stage 3 R6 → **R7** |
|---|---|---|---|
| sky rows 0–120 | 12 → 12 | 12 → 12 | 14 → 13 |
| **horizon rows 120–150** | 21 → **16** | **27 → 16** | 22 → **18** |
| mid rows 150–180 | 12 → 11 | 12 → 13 | 11 → 10 |
| far rows 180–196 | 12 → 11 | 11 → 11 | 7 → 7 |
| HUD rows 196–224 | 18 → 14 | 16 → 16 | 17 → 16 |
| **whole frame, median** | 23 → **19** | **34 → 22** | 27 → **19** |
| whole frame, max | 28 → 25 | **38 → 28** | 32 → 25 |

**All three stages now pass Criterion A2 with margin, on every frame.** Stage 2's horizon band
went 27 → 16 and its off-ladder count in that band 14 → **0**. Crop:
`world-r7-05-stage2-glow-BEFORE-AFTER-ARCADE.png`.

**The off-ladder residual is now six values and none of them are this lane's.** Measured over a
dedicated 40-frame `?fixed=1&seed=1&nocombat=1&hidejet=1` walk at a fourth spacing (`--every
149`), every frame classified by HUD digit and by whether a stage card is on screen:

| population | n | union of off-ladder channel values |
|---|---|---|
| stage 1, no card | 12 | **`159`** — and only that, the deliberate `#009fff` exemption |
| stage 2, no card | 12 | **none** |
| stage 3, no card | 14 | **none** |
| stage 2 or 3, card on screen | 2 | `19, 192, 198, 220, 238, 248` |

The six are `game/flow/cards.js`'s `#ff1300` / `#00dcc6` / `#eec0f8`, all measured off a 686×480
video frame. Raised in `ask-world.md`.

---

## 4. Art critique §3 rank 5 — the sea's hue. Closed on the measurement, open on the arrangement

**The critic is right and the mechanism is now known.** Region mean RGB over our native rows
[160,196) x[20,300) and the matching screen fraction of t116's **raw** video pixels (a region
mean is preserved by a resample, which is why it is the right operator here):

| | mean R | mean G | mean B | G−R | share above G 128 | foam V>0.95 |
|---|---|---|---|---|---|---|
| **ours R6** | 16.7 | 34.6 | 215.8 | **17.9** | 8.4 % | 18.8 % |
| **ours R7** | 17.5 | **52.2** | 217.4 | **34.8** | **20.3 %** | 20.3 % |
| arcade t116 | 15.7 | 61.0 | 219.6 | 45.2 | 18.5 % | 23.7 % |

**Why the old crest colours were wrong, and it is a measurement artefact the R6 lane could not
have seen.** R6's crest entries (`#0010f7 / #0021f7 / #0042f7 / #0063f7`) came from ladder-snapping
t116's V>0.95 population, whose modal colours really are saturated blue. But t116 is a 686×480
upscale: every bright crest is spread over ~2×2 output pixels, so most of the blue that histogram
counts is the **halo** of a bright crest mixed with the dark water around it.

The arithmetic closes only one way. With a body at G 16 and 19–24 % foam, a band mean of 61
**requires** the foam population to average G ≈ 200 — cyan-white, not blue. A greener *body*
cannot produce it: a uniform body at G 49 with foam at G 99 gives the same mean and leaves
nothing above G 128, and **18.5 % of the arcade's band is above it, at mean G 180**, with its
brightest-G foam colours reading `#a0f8f8 #c0f8f8 #b0f8f8`. The crop
(`world-r7-04-sea-hue-ours-vs-arcade.png`) agrees and is what decided it.

The crest half of `seaRamp` is now `#0094f7 / #00c5f7 / #73e6f7 / #a4f7f7`, all on the ladder.
The residual G deficit (52.2 against 61.0) is **not closable without breaking the dash
statistics**: swept, `crestDensity 0.38` lands the band mean G at 62.0 — essentially exact — and
takes the dash density to 48/kpx against the arcade's 29–32. 0.32 is shipped.

**Still open, and I could not make it measurable either.** On the crop the arcade's crests
organise into long curved chains with large plain troughs between; ours is a more even scatter.
This is the same drawing note the R6 art critic published as unmeasurable, and it survives this
round's work.

---

## 5. The carried items

### (a) The two sea-anisotropy operators that disagree in sign — RECONCILED, and the answer is
that neither is usable

They are **two different statistics, on two different regions, at two different resolutions**,
sharing only the word "anisotropy": the native one is a threshold-crossing lag of a 1-D ACF over
a horizon-relative band; the common-res one is the 1/e half-width of a Hanning-windowed 2-D FFT
ACF over a fixed pixel box, after our capture is **bilinearly resampled** to 686×480. The tool
says so in a comment; the reconciliation is that the disagreement in sign is not informative,
because **both operators have a spread larger than the effect**.

Two controls, neither needing an arcade side:

| control, our build only | result |
|---|---|
| common-res ratio, changing ONLY the resample filter (10 frames) | R7 **3.21** bilinear, **4.04** nearest, **3.92** box, **3.83** lanczos — a 26 % swing from the filter alone |
| common-res ratio, bilinear, frame to frame (10 frames, one build) | **1.52 – 4.63**; `hx` **7.54 – 32.96** |
| native ratio, frame to frame (8 frames, one build) | **2.30 – 9.13** |

The R5→R6 "regression" that these criteria were retired over was 4.95 → 3.04. **A single frame of
one build spans 1.52–4.63 on the same operator, and changing the resample filter alone moves the
median by more than a quarter.** The retirements (ledger rows 16 and 17) are correct, and the
reason should be restated as *the statistic's own variance exceeds the effect*, not as a
disagreement between two readings.

For the record on the final build, 21 stage-1 frames: native ratio **4.22** (gate ≥2.0, passes),
native horizontal decorrelation **9.13 texels**, common-res **hx 8.61 / hy 2.58 / ratio 3.38×**
against the arcade's 41.63 / 7.99 / 5.21×.

### (b) The horizontal decorrelation gate (1.21–2.25 texels) — STILL NOT TUNED TO, and the
refusal is now backed by a published blocker

We read 9.13 against a band of 1.21–2.25. The band comes from a 686×480 video frame and lag-1
decorrelation is an adjacency statistic — exactly what Criterion B forbids video for in both
directions. **We hold no true-native stage-1 frame**, and the criteria lane has now made that
item 1 on its acquisition list with three of four retired criteria blocked on it. I did not tune
to the band. The direction improved anyway (13.56 → 9.13 texels) as a side effect of the finer
dash field, which I report as a side effect and not as progress against the gate.

---

## 6. Left open, with reasons

- **Art critique §3 rank 3, the second half — stage 2 is under-textured.** The critic measures
  the ground band at ours 21–26 colours against the arcade's 47, and H-identity ours 73–76 %
  against the arcade's 63.1 %, i.e. our flat runs are *longer* than the arcade's. **Not
  attempted.** The R6 lane's §7 identifies the real fix as driving the stipple from a partly
  screen-space coordinate, with a known failure mode on the other side (a screen-locked texture
  does not flow, which is the R2 "dead ground" defect). The glow half of rank 3 is closed (§3
  above); the texture half is a real piece of work and I would rather say I did not start it.
- **The arcade's crest chains.** See §4. Unmeasurable on my instruments, as on the critic's.
- **Stage 2's band V-identity reads 46.87 % on its worst frame** under `measure_criterion_ab.py`'s
  *fitted* horizon. This is **pre-existing**: the identical population on the R6 baseline reads
  46.85 %. It is a horizon-fit artefact — stage 2's fitted horizon wanders between rows 132 and
  155, and a frame fitted at 132 puts the glow band inside the "ground". On REFERENCE.md's own
  fixed scale-rule band (rows 140–195) stage 2 reads V 60.6–68.4 (R6: 61.2–69.9). Flagged, not
  fixed; it is a criteria-lane instrument question.
- **The night ground's dominant-colour share is 85.3 % against the arcade's 92.0 %**, and the
  residual is the full-width horizon glow band against a banked reference frame (§1). Settling
  it needs a true-native **level-flight** stage-3 frame, which is the same acquisition blocker.

---

## 7. Capture inventory

All under `tools/out/world-r7/`. The figures published above come from:

- `V-nc-{97,137,211}` — 56 frames each, `?fixed=1&seed=1&nocombat=1`, split by HUD digit into
  `V-s{1,2,3}-{97,137,211}` (67 stage-1, 47 stage-2, 54 stage-3). **0 black, 0 duplicates.**
- `R6-s{1,2}` — the same populations re-cut from the start-of-round baseline walks
  `base-nc-{97,137,211}`, so every before/after pair above is on identical frame counts.
- `hudmask` — `hud_mask.py`'s per-run cache, 1 264 px, selftest PASS.
- Sweeps: `sw-lod`, `sw-g`, `sw-cut`, `sw-cut2`, `sw-cut3`, `sw-lod2`, `sw-light` (gap 2, on the
  isolated `tools/clouds-preview.html?stage=3` harness); `sw-dash`, `sw-dash2`, `sw-dash3`,
  `sw-hue`, `sw-hue2`, `sw-check` (gap 3).
- Isolation arms: `v3-iso-211`, `v1-nj-{97,211}` (`?hidejet=1`).

# R11 — ART CRITIQUE

**Subject**: how the game looks as a piece of pixel art. The drawings, not the systems.
**Tree**: `fd833f6`, clean at the start and at the end of this pass. Nothing committed, no
`stash` / `checkout` / `reset` / `push`.
**Generator**: `judging/R11/art_critic_r11.py` — every figure below, with its crop box and its
magnification written into the function's docstring. Figures land in
`tools/out/art-critic-r11/` (gitignored — regenerate, don't chase).
**Captures**: `tools/capture.mjs --out tools/out/art-critic-r11/{live-s1,kill,kill2,stages}`,
unique names inside each.

---

## 0. THE SHORT VERSION

**The worst drawing in the game is the player's jet, and it is not close.** Its level cells
read as a face — two round orange eyes, a lavender nose, a dark-red mouth dash, two upright
ears — and that is what sits dead centre of the screen in every frame of every capture I
took. It has not been touched since R9 (`010db2c`); R10 ranked it third-worst and nothing
happened. **`FIG4b`, `FIG11`, and look at any frame of `FIGM-live.png`.**

**The enemy redraw is real and its headline numbers are honest.** I reproduced all three
independently off the blobs: `enemy-grey-head.png` 5.7 → 33.9 % of pixels below L=80 and mean
L 189.8 → 119.0; `grey-rear` 13.3 → 36.5; `camo-head` 89.7 → 91.2 with its ramp untouched.
Alpha-plane md5 over all sixteen sheets: **4 distinct silhouettes → 6**. Criterion A and B pass
in live frames on all three stage looks.

**The TL's level-cell reservation is half right, and the half that is right has a different
cause than the one stated.** §1.

**The explosion on screen is good and the authored explosion sheets are dead art.**
`src/assets/sprites/explosion.png` and `explosion-big.png` reproduce the quoted
75.5 % ≤ L66 / 6.7 % white-hot core exactly — **and nothing in `src/` imports them; they are
absent from `dist/`.** What the player sees is drawn procedurally by `src/effects/explosions.js`
and it genuinely fragments and re-flares. §4.

**The residue colour is settled.** I measured it independently, with a different box and an
erosion sweep the lane did not run, and got R−G **+127.5** rising to **+135.4** as the mask
erodes toward the blob interior. The lane published +116 and ships +108. §5.

### Ranked by how much it changes a player's "is this After Burner II?" judgement

| # | defect | where |
|---|---|---|
| **1** | **The player's level cells read as a face.** Centre screen, every frame. | §2 |
| **2** | **`interceptor` is orange and `interceptor-night` is pink.** No AB2 aircraft is either hue; both ramps are unanchored and were not touched this round. | §3.1 |
| **3** | **`prop`'s propeller arc reads as a gunsight reticle**, and at 20 px it reads as nothing. | §3.2 |
| **4** | **Every enemy carries a four-ring concentric bullseye** where the arcade has a dark block with a red rectangle; and head-on is nearly indistinguishable from rear. | §3.3 |
| **5** | **The grey level cell inverts the leading-edge polarity** of the one arcade level head-on column we have, and spends 45 % of its pixels on one flat tone. | §1 |
| **6** | **The night ramps are over-saturated** against the true-native night frame — dominant airframe tone S 0.71 against an arcade ceiling of 0.50. | §3.4 |
| **7** | Dead authored sheets ship in `src/assets/sprites/` and are measured as if they were the game. | §4 |

---

## 1. THE TL's RESERVATION — tested, and the verdict is split

> *"its wing reads to me as a constant-thickness bar with no taper and no leading-edge
> highlight … I may be comparing a level cell against a banked reference and calling that a
> defect when it is just the pose."*

**FIG1** (`FIG1-level-arcade-before-after.png`) is the test, span-matched three ways:

- **Row 1, ARCADE**: `tools/out/art-critic-r10/arc-enemy-mid-4x.png`, crop (0,0)–(960,450) of
  a 960×600 image. 12.85 file px per native px. Subject span **918 file px = 71.4 native px**.
  **This is a LEVEL head-on enemy** — it is not the banked `A-arc-headon-NATIVE-12x.png` the
  reservation names, so the pose confound does not apply. SHAPE/ORDER only: the 1028×720
  decode is a non-integer resample and I take no absolute colour off it.
- **Row 2, BEFORE**: `435926e^:enemy-grey-head.png` cell 2, 60 px span, NEAREST ×15 = 900 px.
- **Row 3, AFTER**: `fd833f6` same cell, same treatment. Span mismatch 918 : 900 = 1.02.

### 1.1 "No taper" — WRONG

Measured off the alpha plane of cell 2, column by column: chord is **2 px at the tip, 4 px at
x=12, 6 px inboard**. The lane's published "6 → 2" reproduces. The arcade's own chord,
column-profiled on row 1 at 12.85 px/native px, runs **1.6–2.2 px at the tip to 5.3 px
inboard**. Ours is 1–2 px fatter all the way along, which the lane declared and defended
(§1.2 / §10.5 of `lane-enemy-art.md`), but the *taper is there and it is close to the arcade's*.

### 1.2 "No leading-edge highlight" — WRONG

Cell 2's top wing row is the sprite's **brightest** band: `#efefef` (L 239) across the outer
14 px of each wing, `#b5b5b5` (L 181) inboard, tip to tip, one row, dead straight. That is a
leading-edge highlight, and it is the first thing the eye lands on.

### 1.3 "Reads as a bar" — RIGHT, for a reason neither of us named

Down any outboard column the five-rung ramp resolves to **239 / 132 / 132 / 132 / 74**. The
three middle rows are the *same tone*. `#848484` is **162 of the 358 opaque pixels — 45 % of
the drawing on one flat value.** A ramp was authored; the drawing spends three of its five
chord rows on one rung of it. That is what makes a tapered wing read as a slab.

### 1.4 The defect the reservation missed, which is bigger than the one it found

Against the level arcade column, **our leading edge is inverted.** Vertical cuts through the
inboard wing of row 1 at file-x 300 / 650 / 720 (each ≈ 1 native px per 12.85 file px):

| native row | 28.0 | 28.3 | 28.9 | **29.6** | 30.2 | 30.8 | 31.4 | 31.8 |
|---|---|---|---|---|---|---|---|---|
| arcade L | **12.8** | 30.0 | 30.1 | **50.9** | 43.8 | 40.0 | 37.1 | **29.6** |

The arcade's level head-on wing is **near-black at the leading edge, brightest mid-chord, dark
again at the trailing edge** — a rounded-surface read. Ours is **brightest at the leading
edge and monotone down** — a flat-plate read. At the sizes the player sees (`FIG7-sizes.png`,
cell 2 point-sampled to 12 / 20 / 30 / 45 native px, the band `DETAIL_SWITCH_NATIVE_PX = 10`
and up), that white line is the *only* thing legible at 20 px: the stage-1 enemy reads as a
white dash with a red dot.

**What I cannot claim**: that the grey livery must follow this, because the level head-on column
is stage-2 camo and the lane's stage-1 subjects are all rear-aspect — where it correctly measured
lit-above / shaded-below. But the lane's own argument that grey and camo are *one airframe in two
liveries* is what makes the structure transferable, and it cuts against them here.

**What a pixel artist would do**: move `#efefef` off the leading edge and into the second row,
put `#4a4a4a`/`#101010` on the leading edge itself, and split the three identical `#848484`
rows into `#b5b5b5` / `#848484` / `#4a4a4a` so the chord has five values instead of three.
Cost: zero new colours, zero silhouette change.

### 1.5 The fuselage, which is worse than the wing

The arcade's level head-on fuselage is a **compact near-black block** holding a red rectangle
holding a cream pip — the block and the aircraft's dark mass are the same value, so you read
**two** rings. Ours is a **light-grey box** (`#848484` / `#b5b5b5` frame) around a black ring
around a red square around a cream square: **four** concentric rings in 8×8 px. That is R4's
"bullseye" in a new costume. See §3.3 — it is on every livery and every aspect.

### 1.6 Verdict on the reservation

Not wrong to be suspicious; wrong about which cell and which feature. The banked cells **are**
stronger than the level one (`FIG2-bank-after-12x.png`, all five cells at ×12), and the level
cell **does** have a real defect against a genuinely level arcade subject. The reservation
should be re-stated as: *the level cell inverts the arcade's chord polarity and flattens its own
ramp.* The lane's fitted bank angles reproduce (−29.7 / −14.9 / −0.0 / +14.9 / +29.6) and the
roll is a roll.

---

## 2. THE PLAYER JET — rank 1, and nothing was done to it

`src/assets/sprites/player-f14.png` last changed at **`010db2c` (R9)**. R10's critique and
R11 both left it alone. **R10's reading is still true, and the night sheet is worse.**

**FIG4b** (`FIG4b-player-level-12x.png`, cell 4 of 9, ×12 on stage-1 sky) and **FIG11**
(`FIG11-player-night-level-10x.png`, same cell of `player-f14-night.png`, ×10 on black).

The face, measured:

- **Two eyes.** Two black-ringed discs with orange irises and yellow pupils, 10 px wide,
  centroids at **dy = 0.00 px** apart — the only cell of nine where the pair is exactly level
  (`dy/dx` across cells 0–8: 2.17 / 1.01 / 0.47 / 0.18 / **0.00** / 0.18 / 0.47 / 0.99 / 2.16).
  Both arcade subjects I can read put the pair at **0.22** (`ab2-arcade-night-banking.png`,
  true native) and **0.47** (`stage1-level-flight-t116.png`, shape only). Our cell 2 lands on
  0.466 — the sheet already contains a non-face pose; the perfectly symmetric one is the one
  level flight selects.
- **A nose.** A 4×2 block of `#e694f7` centred above. **This colour is arcade-correct** — the
  true-native desert still carries (230,148,247) at 9 px on the player and ours is 8 px. It is
  not the colour that is wrong, it is what surrounds it.
- **A mouth.** A 5 px `#840000` dash centred below, on the sprite's centreline.
- **Cheeks.** The region between the nozzles is the sprite's brightest mass: mean **L 186.3
  over 249 px**, against **L 177.2** for the outboard wings. The arcade runs maroon stripes
  *through* this same region (`REF-player-banked-10x.png`, cut at native x=110:
  white/white/white/maroon/cream/white/maroon across the chord) so no solid bright slab forms.
  Ours leaves it undifferentiated.
- **Ears.** Two fins, vertical, equal, symmetric. In every arcade frame the fins lean and are
  foreshortened unequally.

**The maroon is not the problem.** Among the four shared palette members `#840000` / `#d6d6a4` /
`#f7e6b5` / `#ffffef`, our level cell is **29.7 %** maroon by pixel count (213 of 717) and the
true-native arcade player box is **31.7 %** (219 of 691). The *quantity* is right.
Its **placement** is wrong: ours is a 6–8 px staircase band around the bottom-outboard of each
wing plus an unbroken 64 px line under the body (row 51 of the cell map); the arcade's is a
system of 1 px stripes running span-wise *inside* the wing, with the silhouette edge left
bright.

**And R10's other finding stands**: the outboard wing is a brighter rectangle bolted on across
a hard vertical seam — visible in `FIG4-player-sheet-6x.png` on cells 3, 4 and 5, and gone on
cells 0 and 8 where the wing is drawn as a blade.

**What a pixel artist would do, in priority order.** (a) Break the inter-nacelle slab with two
span-wise maroon stripes, the way the arcade does, so the cheeks stop being one mass. (b) Lift
the mouth dash off the centreline or delete it — it is 5 px and it is doing all the work. (c)
Replace the outboard keyline staircase with stripes, and let the leading edge end bright.
(d) Lean the fins. None of this changes the silhouette, the palette, or the colour count.

---

## 3. THE REST OF THE ENEMY FLEET

`FIG3-liveries-12x.png` (day, level head | rear, ×12 on each stage's own sky),
`FIG9-night-liveries-12x.png` (night, same layout, ×12 on black),
`FIG7-sizes.png` (level head cell point-sampled to 12/20/30/45 native px, then ×8).

### 3.1 `interceptor` is orange by day and pink by night — rank 2

Day: dominant airframe tones `#d64a19` (828 px, S 0.88) and `#8c2910` (319 px, S 0.89) — 63 % of
the drawing on two high-chroma orange-reds, flown against the **stage-1 blue sky**.
Night: dominant `(164,58,91)` at **S 0.65** — a magenta. After Burner II has no orange aircraft
and no pink aircraft; its enemies are white/grey (stage 1), green camo (stage 2) and cool
blue-grey (stage 3), which is exactly what the four arcade subjects in `lane-enemy-art.md` §1.3
and the two true-native stills show.

The lane declared this honestly (§10.3: *"`interceptor` and `prop` ramps are unchanged and
unanchored"*) and refused to invent a measurement. That was the right call for a measurement
lane. It is still the second-worst thing on screen, because **a hue with no anchor is not
neutral — it is a claim**, and this one is a claim AB2 never makes. The nearest licensed move
is to drop the hue onto the grey or camo ramp and keep the `swept` silhouette, which is the
part that earns its place.

### 3.2 `prop`'s propeller arc reads as a gunsight — rank 3

The 1 px ring around the fuselage is a reticle, not a turning propeller — at ×12 it is a
circle with a plane behind it, and in `FIG7` at 20 px it has collapsed into a grey halo with
no aircraft inside it. The lane *did* crop and look here and fixed two worse problems (a gull
dihedral and a blade cross, §6), so the process worked; the ring is just the wrong solution.
The prop's wings are also the only ones in the fleet with **no value variation at all** — one
mid grey, tip to root. At 20 px that is a stick.

**What a pixel artist would do**: delete the ring, widen the fuselage nose into a blunt
spinner, and put a single 1 px light/dark pair on the wing so it has a top and a bottom.
A propeller at 20 px is read from the blunt nose and the straight wing, never from the arc.

### 3.3 Every enemy carries a four-ring bullseye, and head-on ≈ rear — rank 4

In `FIG3` all eight day cells have the same centre: pale frame → black ring → red/orange
square → cream square. Four rings in 8×8 px, on the brightest-contrast part of the sprite. The
arcade's head-on has a near-black block that *merges with the airframe* so you see two rings;
its rear (`arc-s1-enemy-rear2-5x.png`) has **one** big black housing with an orange core and no
pale frame at all.

Worse, **the only difference between our head-on and rear cells is the pip colour** (red vs
orange) plus a 2 px chin. At 20 px they are the same aircraft. In the arcade the rear aspect is
dominated by a nozzle housing far larger relative to the body than the head-on intake, which is
the cue that tells a player whether a jet is closing or running.

**What a pixel artist would do**: drop the pale frame (one colour's worth of pixels), and on the
rear cells grow the black housing to roughly 1.6× the head-on intake so the two aspects separate
at a glance.

### 3.4 The night ramps are over-saturated — rank 6

Against `reference/ab2-arcade-night-banking.png`, **true native**, box x[110,250] y[90,145]
(cropped and looked at — `FIG10-arc-night-jetbox-8x.png`; it contains the player jet, one
cloud in the top-left corner, and the burning enemy):

| | arcade night airframe rungs | ours, `grey-night` dominant two |
|---|---|---|
| S | 0.20 / 0.33 / 0.40 / **0.50** | **0.71** (808 px) / **0.80** (309 px) |
| L | 213 / 149 / 116 / 83 | 93 / 57 |

68 % of `grey-night`'s opaque pixels are above the arcade's *maximum* airframe saturation.
`camo-night` dominant S 0.64, `interceptor-night` 0.65, `prop-night` 0.36 — **`prop`, the one
livery with no anchor, is the only one in band.** The lane left night open explicitly (§10.2)
on the grounds that the only prior night figure was blur-biased. That reasoning was sound and
the acquisition it asked for **already exists in the repo** — the true-native still above is
usable for a saturation ceiling even though it shows the player rather than an enemy, because
the ceiling is a property of the night palette, not of one airframe.

### 3.5 What I checked and did NOT find wrong

- **The night ground's multicoloured speckle.** I was about to flag it. The arcade's stage-3
  ground is exactly that — a confetti of red/white/cyan/yellow city lights. Ours matches.
- **The lavender canopy.** Arcade-measured, right size, right colour (§2).
- **The maroon quantity on the player.** 29.7 % ours vs 31.7 % arcade (§2).
- **Silhouette count and value census.** All reproduce off the blobs (§0).
- **Sheet dispatch.** Stage 1 renders grey, stage 2 camo + prop, stage 3 the night ramps
  (`FIGS-stages.png`, 24 frames, `?fixed=1&seed=5&invincible=1`, `--every 180 --warmup 1700`,
  stages 1 → 4). No procedural fall-through was visible at any size I captured; this corroborates
  `sheet_in_use_probe.mjs` rather than replacing it.
- **Criterion A and B in live frames.** `tools/measure_criterion_ab.py` (its own selftest
  passes), HUD mask derived per run:

| set | colours | channel values | H | V | patch V |
|---|---|---|---|---|---|
| `live-s1` (14 frames, stage 1) | 62 | 24 | 79.2 % | 57.0 % | 55.4 % |
| `stages` (24 frames, stages 1–4) | 60 | 25 | — | — | 69.3 % |
| `kill2` (16 frames, explosion in all 16) | 75 | 27 | 75.5 % | 61.6 % | 55.2 % |

  **PASS everywhere.** The `stages` ground band reads NaN because that operator's band is
  stage-specific and the set spans four stage looks — not a zero, a wrong-shaped question; the
  near patch covers it. `tools/assert_population.py` (selftest PASS) confirms `kill2` contains
  EXPLOSION in 16/16 frames and PLAYER-WEAPON in 14/16, so the Criterion figures above are
  measured on frames that actually contain what I claim.

---

## 4. THE EXPLOSION — good on screen, and the sheet that was measured is not on screen

### 4.1 The quoted statistic reproduces, on a dead asset

`src/assets/sprites/explosion.png`: **75.5 %** of opaque pixels at L ≤ 66, **6.7 %** at
`#fffff7`, 7 colours. `explosion-big.png`: 75.4 % and 6.7 %. Both match the figures in the
brief to the digit, so there is no doubt which object they describe.

**Nothing in `src/` imports either file.** `grep -r "assets/sprites" src/` returns only the
sixteen enemy sheets, the three player sheets and the generated palette. There is no
`import.meta.glob` and no `new URL(...)` loader. `npx vite build` produces a `dist/` with **no
explosion asset in it.** The same is true of `missile.png`, `smoke-puff.png`, `debris.png` and
`font-5x7.png`.

Looked at, they are also the weakest drawings in the repo (`FIG5-explosion-sheet-4x.png`,
`FIG5b-explosion-big-2x.png`): a perfectly radial mandala of eight evenly-spaced triangular
wedges around a perfect white circle, collapsing into concentric rings. If they ever did reach
the screen they would be rank 1. **They do not, so they are rank 7 — a measurement hazard, not
a visual one.** Delete them or wire them; shipping them in `src/assets/sprites/` is how a
round's headline statistic ends up describing nothing.

### 4.2 What the player actually sees is good

`FIGK2-fireball-onset.png` — 16 consecutive ticks, `?fixed=1&seed=3&demo=2`, `--every 1
--warmup 143`, each panel cropped to (330,0)–(720,300) of the 960×672 capture. Against the
arcade's own sequence in `tools/out/effects-r11/ARC-residue-origin.png` (which I re-decoded and
verified: my `f0106` is byte-identical to `reference/stage1-missile-salvo-t100.75.png`, mean |Δ|
**0.000000**):

- orange lumpy mass → a white-yellow core that **arrives late and re-flares** → red flecks
  spraying radially outward → a persistent orange ball. That is the arcade's construction.
- Remaining art note, minor: our flecks are uniform in size and all one saturated red, arranged
  evenly. The arcade's vary in size and carry dark cores. Worth a pass, not worth a round.

---

## 5. THE RESIDUE COLOUR — settled, and I checked the operator rather than the number

**Independent re-measurement, different box, different component search, plus an erosion sweep
the lane did not run.** Decode reproduced from scratch (`ffmpeg -ss 99.0 … -frames:v 220`),
alignment verified as above. Frame `f0207` (t = 102.433), hand-set sky box x[590,800]
y[440,625] — **cropped and looked at** (`FIG6-arc-residue-box.png`): one lumpy orange ball
against blue sky, red flecks still flying, no cloud, no terrain.

| | n | mean RGB | **R−G** |
|---|---|---|---|
| mask as-is | 14 633 | (222.1, 94.7, 18.1) | **+127.5** |
| eroded 2 px | 12 875 | (228.0, 94.6, 9.3) | +133.4 |
| eroded 4 px | 11 575 | (230.4, 96.0, 7.0) | +134.4 |
| eroded 6 px | 10 495 | (231.6, 96.2, 6.0) | **+135.4** |

**The erosion is the check that matters.** The project bans colour readings off the resampled
longplay. The reason for the ban is that resampling blends the subject with its background —
and here the background is *blue sky*, which pulls R−G **down**. Eroding away the boundary texels
moves R−G **up**, from +127.5 to +135.4. So the published +116 and the shipped +108 are, if
anything, on the conservative side of the true value, and the artefact the ban exists to prevent
cannot be what produced them. That is a licence argument I am willing to sign; "the number came
off a resampled frame" is not, on its own, a refutation here.

**Operator fragility, flagged.** Run the lane's mask `R > B+26 ∧ V > 0.25` with largest-component
selection but **without** the hand-set sky box, and the largest component on this frame is the
**island** — n = 25 472, mean (123, 159, 61), **R−G = −35.5**. The box is load-bearing and it is
discretionary. The lane declared the box and published its crops; a future agent must not drop it.

**Verdict**: the residue is a saturated orange ball. The shipped `KILL_SMOKE_PALETTE` returns
R−G +108 against a measured +116 to +135. **Settled.** The earlier +48 and "R = G exactly" were
both taken off other objects, as the lane said. The one open item the lane named — the blue
channel at 16 where the frames read 30–37 — survives my reading (I get B = 18 at the mask and
6 under erosion, i.e. the frames' B is itself mostly sky blend, which makes 16 defensible rather
than merely snapped).

---

## 6. FIGURE INDEX

All in `tools/out/art-critic-r11/`, all from `judging/R11/art_critic_r11.py` unless noted.

| figure | what | scale / crop |
|---|---|---|
| `FIG1-level-arcade-before-after.png` | **the TL's question** — level head-on, arcade \| before \| after | arcade 12.85 px/native, crop (0,0)-(960,450); ours ×15. spans 918 : 900 |
| `FIG2-bank-after-12x.png` | all five bank cells, grey head, after | ×12, full 64×32 cells |
| `FIG3-liveries-12x.png` | four liveries, head \| rear, level cell, day | ×12, each on its own stage sky |
| `FIG4-player-sheet-6x.png` / `FIG4b-player-level-12x.png` | **the face** — all 9 player cells / cell 4 | ×6 / ×12, full 100×72 cells |
| `FIG5*-explosion-sheet*.png` | the two dead explosion sheets | ×4 / ×2, full sheets |
| `FIG6-arc-residue-box.png` | the arcade residue blob, cropped and looked at | f0207 crop x[590,800] y[440,625], ×3 |
| `FIG7-sizes.png` | level head cells at the widths the player sees | point-sampled to 12/20/30/45 native px, then ×8 |
| `FIG9-night-liveries-12x.png` | the night fleet | ×12 on black |
| `FIG10-arc-night-jetbox-8x.png` | the true-native night airframe box | `ab2-arcade-night-banking.png` x[110,250] y[90,145], ×8 |
| `FIG11-player-night-level-10x.png` | **the worst single drawing** | ×10 on black |
| `FIGM-live.png` | 14 live stage-1 frames | `?fixed=1&seed=3&invincible=1`, `--every 14 --warmup 90`, ÷3 |
| `FIGK2-fireball-onset.png` | 16 consecutive ticks of a kill | `?fixed=1&seed=3&demo=2`, `--every 1 --warmup 143`, crop (330,0)-(720,300) |
| `FIGS-stages.png` | stages 1→4 sweep | `?fixed=1&seed=5&invincible=1`, `--every 180 --warmup 1700`, ÷3 |
| `REF-player-banked-10x.png` | the arcade player, **true native** | `ab2-arcade-desert.png` (82,82)-(175,148), ×10 |
| `REF-player-nearlevel-5x.png` | the arcade player near level | `stage1-level-flight-t116.png` (180,180)-(420,300), ×5 — **shape only** |

---

## 7. THE GAP LIST I WOULD HAND THE NEXT ROUND

1. **Redraw player cells 3, 4, 5.** Stripe the inter-nacelle body, kill the mouth dash, stripe
   the wings instead of keylining them, lean the fins. No silhouette change, no palette change.
   This is the owner's complaint and it is one lane's work.
2. **Put `interceptor` on an anchored ramp** (grey by day, the night blue-grey at night). Keep
   the `swept` silhouette.
3. **Delete the prop's propeller ring**; blunt nose + a 1 px value pair on the wing.
4. **Drop the pale frame from every enemy intake**, and grow the rear housing to ~1.6× the
   head-on intake so the two aspects separate.
5. **Re-value the grey level cell's chord**: dark leading edge, bright second row, three
   distinct rungs through the middle instead of one.
6. **Re-ramp the night liveries against the true-native night frame's S ≤ 0.50 ceiling.**
7. **Delete or wire `explosion.png`, `explosion-big.png`, `missile.png`, `smoke-puff.png`,
   `debris.png`, `font-5x7.png`.** Dead art in `src/assets/sprites/` is a measurement trap.

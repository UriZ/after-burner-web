# R11 — the effects lane: THE EXPLOSION'S ARRANGEMENT, AND WHAT THE RESIDUE ACTUALLY IS

**Lane files**: `src/effects/**`, `src/weapons/enemyShots.js`, `src/weapons/projectileSprites.js`,
`src/entities/enemy.js`, `src/game/spawner.js`. Changed: `effects/explosions.js`,
`effects/smoke.js`, `entities/enemy.js`, `game/spawner.js` (comments, a derivation and a guard —
behaviourally inert, and that is measured in §4B.4), plus the one unowned line in
`tools/fx-probe.mjs` that R10's judge listed as gap 10. `enemyShots.js` and
`projectileSprites.js` are untouched. No commit, no stash, no checkout, no push.

**Tree state.** Baseline `5e3d57e`, clean at the start of the round. **It stopped being clean
late in the round and §3 carries the consequence**: the feel lane cut
`player.js ENVELOPE_X` **2.6 -> 0.733** (and `RATE_X` to a literal 2.82) after my captures and
after my fairness sweep. Every explosion figure here is unaffected — the kill lands on the
same tick at the same screen position on both of my trees (fireball peak centroid
(151.1, 635.4) at `5e3d57e` against (151.7, 636.2) shipped) — but **every displacement-dependent
figure in §3 was taken at `ENVELOPE_X = 2.6` and is re-based by that change**; §3.5 measures by
how much. Every "before" figure names its sha.

**Instrument**: `judging/R11/fx_r11.py`, new, `--selftest` **39/39**. Operator, controls and
blind spots in §6 — read that before quoting a number from here. Supporting tools:
`judging/R11/dump_burst.mjs` (authored-canvas dump), `judging/R11/strip.py` (every montage in
this report, with its crop fractions burned into the image), `judging/R11/aim_sweep.py`
(arm driver with md5-verified restore), `judging/R11/aim_error_control.mjs`,
`judging/R11/fairness_pool.py`.

---

## 0. The headline in four lines

> **The explosion fragments now. Our fireball's `fill` ran 0.63 -> 0.85 and its `spread` sat
> on 0.72 — the filled-disc value to two decimals — for its whole life; it now runs
> 0.59 -> 0.27 -> 0.15 and 0.73 -> 0.94 -> 1.28, into the arcade's measured burst band, with
> 1 -> 59 -> 102 separable components and a white-hot core that PEAKS LATE, at phase 1,
> where the arcade's does.**
>
> **And the post-kill residue is not peach. It is a saturated orange, mean RGB (230, 114, 33),
> S 0.853, measured on an isolated kill over open sky with the whole chain — fireball,
> starburst, residue — on screen at 60 Hz. R10's `#f4c8b3` is reproducible to the digit and is
> a DIFFERENT OBJECT: its mask accepts 0.9 % of a real residue blob, and the frame it was
> taken on has a cloud bank arriving across it.**
>
> **JOB 4, the spawner: the premise does not hold and no retune is warranted.** The lateral
> spread is not a reachability parameter — every approach and overtake spends its WHOLE lockable
> window inside 11 %W of centre, and the fan-out happens below the lock floor. The entire
> engageability loss is ONE pattern, the crosser, 7/7 -> 0/7 on three seeds — and the crosser is
> a GUN target whose kill count is UNCHANGED (10 -> 11, all vulcan). For a pilot that fires both
> weapons the envelope cut nearly DOUBLES total kills, 25 -> 44. **The deliverable is the
> derivation, a stale input corrected beside it, and a guard that fires if `ENVELOPE_X` moves
> again. §4B.**
>
> **The enemy-fire aim-error term exists, and the measurement says it is INERT at the shipped
> geometry (pHit 1.727 % -> 1.673 %, inside one standard error). It only becomes a lever once
> the envelope closes, and even there it buys 29 % where 81 % is needed. §3.** Two of the
> premises the round was planned on do not reproduce: **we are not missing the death-rate gate
> — we are 36-40 % BELOW the arcade at 1.229/min against 1.91-2.04** — and closing the envelope
> costs 2.1-2.3x the deaths, not 4x the lethality. **And the whole §3 table was re-based by the
> feel lane's mid-round `ENVELOPE_X` cut; §3.5.**

---

## 1. THE BREAK-UP — JOB 1

### 1.1 The arcade, read off consecutive 60 Hz frames

Decode: `ffmpeg -ss 99.0 -i .reference-cache/video/ab2-longplay-60fps.mp4 -frames:v 240
-vsync 0 out/f%04d.png`, `t = 99.0 + (i-1)/60`. **That formula is exact and I verified it
rather than inheriting it**: frame `f0106` of this decode is byte-identical to
`reference/stage1-missile-salvo-t100.75.png`, mean |Δ| **0.000000**, i.e. t(f0106) = 100.75
exactly. CLAUDE.md's "`-ss` sequence extraction starts ~4 s early" caveat does not reproduce;
R10 refuted it four times and this is a fifth.

Stage identity: the HUD digit reads **1** on f0001 and f0120
(`tools/out/effects-r11/STAGE-DIGIT-arc99.png`), and STAGE_MAP.md's proven span t = 88-120 s
covers the window.

**The sequence, one isolated kill over open sky, nine consecutive-frame samples:
`tools/out/effects-r11/ARC-residue-origin.png`.** It is the most informative single image in
this report and it took the round from "the fireball fragments" to a construction:

| | |
|---|---|
| f0199 (t = 102.300) | a ragged red/orange fireball |
| f0201 | denser, brighter |
| **f0203 (+67 ms)** | **it BURSTS — a radial star of SEPARATED red flecks around a white-yellow centre** |
| f0205 (+100 ms) | the star at full extent, an enemy aircraft silhouette visible inside it |
| f0207 (+133 ms) | the fire is gone; an ORANGE lumpy ball is there, red flecks still flying out |
| f0209 - f0215 | the ball, clean, growing slowly, drifting with the world |

Two more events, both stage 1, both 60 Hz consecutive, as the second and third readings:
`ARC-eventD-strip.png` (t = 101.52-101.88, a big kill over open sea: dense red ball ->
yellow-and-red swirl with gaps -> a confetti of red flecks -> empty in one frame) and
`ARC-eventA-strip.png` (t = 99.78-100.18).

### 1.2 The statistics, and why they are new ones

Every envelope statistic R10 shipped — `peak`, `t_rise`, `w60`, `n60`, `r100`, `t_half`,
`life10` — is AREA AGAINST TIME. Its own author wrote the limitation down
(lane-envelope.md §6, "WHAT THIS CRITERION CANNOT SEE", item 6: *a sprite with the right
envelope and the wrong silhouette passes*). That is exactly the defect R10's judge then found.
So this round adds two statistics of ARRANGEMENT, and they are chosen to be
**dimensionless**, which is the only kind that can cross sides given the arcade's 7.3x peak
spread:

| | definition | filled disc | sparse ring of chunks |
|---|---|---|---|
| `fill` | masked area / area of the mask's own convex hull | **1.00** | `<< 1` |
| `spread` | radius of gyration / sqrt(area/pi) | **0.7071** | `>> 0.707` |

`ncomp` (8-connected components of 4+ px) is reported alongside and is **NOT** dimensionless —
it is resolution-dependent, so it corroborates and never gates.

**The selection had to change too.** "Largest 8-connected component" — which every R10 operator
on both sides used — measures the largest SURVIVING FRAGMENT, and is therefore blind by
construction to the exact property under test. These statistics are computed over EVERY mask
pixel in a per-event ROI. §6 is the price of that and the three things that pay it.

### 1.3 The arcade column

Mask `m_material` (judge-R10's own: `R > B+26 ∧ V > 0.25`). It rejects the sea, the sky and
cloud; it accepts island terrain at 19 % of its pixels, which is why both events below are
measured over water and why `--marks` is published for each.

| | lag | area % of ROI | **fill** | **spread** | ncomp |
|---|---|---|---|---|---|
| **event D** `f0145-f0176`, ROI (40,440,120,520), clutter 2.93 % | −117 ms | 30.0 | 0.411 | 0.818 | 19 |
| | −83 | 37.5 | 0.502 | 0.818 | 18 |
| | −50 | 48.1 | 0.604 | 0.805 | 19 |
| | **+0** | 51.7 | 0.537 | 0.827 | 35 |
| | **+33** | 43.5 | 0.446 | **1.000** | **88** |
| | **+67** | 50.2 | 0.503 | 0.948 | 63 |
| | +83 | 46.7 | 0.481 | 0.970 | 63 |
| | +100 | **4.8** | 0.076 | 1.755 | 35 |
| **event F** `f0185-f0211`, ROI (400,720,600,920), clutter 0.33 % | compact | 7.3-10.8 | 0.198-0.343 | 0.892-1.036 | 6-20 |
| | **burst** | 8.2-10.2 | **0.152-0.258** | **1.305-1.367** | 25-33 |

**Arcade burst band, pooled: `fill` 0.08-0.26, `spread` 0.95-1.37 (to 2.03 at lags past the
licence), `ncomp` 25-88.** Crops: `ARC-eventD-marks.png`, `ARC-eventF-marks3.png` — the mask
painted over the ROI at every published lag. I cropped them and looked, and the first time I
ran this the ROI had landed on the island (`ARC-eventF-marks.png`, nine panels of green
foliage and the HUD speed bar, published as the failure it is).

### 1.4 Ours, before and after

**Primary, and licensed: the AUTHORED CANVAS.** `judging/R11/dump_burst.mjs` reads the
`CanvasTexture` back out of the running page, so there is no sky, no jet, no depth, no
resampling and no attribution question at all. In a live frame our explosion is drawn on top of
the player's own nozzle discs, which R10 measured as the two largest competitors on our side.

| | `fill` | `spread` | `ncomp` | `hot` |
|---|---|---|---|---|
| **BEFORE `5e3d57e`** phase 0 | 0.630-0.699 | **0.731-0.733** | 1-2 | 0.093-0.104 |
| phase 1 | **0.834-0.844** | **0.720-0.728** | 1-3 | **0.000** |
| phase 2 | **0.823-0.851** | **0.720-0.730** | 2-6 | **0.000** |
| **AFTER** phase 0 (unchanged drawing) | 0.586-0.654 | 0.733-0.734 | 1-2 | 0.062-0.070 |
| phase 1, the BURST | **0.263-0.267** | **0.936-0.950** | **58-60** | **0.106-0.111** |
| phase 2, the SPRAY | **0.152-0.158** | **1.275-1.305** | **102-103** | 0.016-0.017 |

> **BOTH STATISTICS RAN THE WRONG WAY BEFORE.** The arcade's `fill` falls and its `spread`
> rises across an event; ours did the opposite — it got MORE disc-like as it aged, because the
> decay phases dropped bright bands off a mass whose arrangement never changed. 0.72 is the
> filled-disc value to two decimals. We were drawing a disc and recolouring it.

**The medium does not explain the gap, and that is measured rather than argued.** Putting our
own authored canvas through the arcade's presentation chain — nearest to 96 native px, bilinear
to the longplay's 3.2125x, lossy re-encode — moves `fill` by **≤0.027** and `spread` by
**≤0.030**. The gap it has to explain is 3x to 10x that. (`--selftest` arm 5 makes the
scale-invariance itself a control: the same synthetic at 3.00x and 3.2125x agrees to 0.001 on
`fill` and 0.005 on `spread`.)

**Corroborating, and NOT licensed: in situ, matched before/after.** Same ROI (20,290,515,785),
same operator `m_material_hot`, same tick, same seed — `?fixed=1&demo=2&seed=1`, warmup 690,
60 consecutive ticks. **The ROI's own clutter floor is 8.0-8.3 % against a peak of 26-32 %, so
no lag here is licensed** (§6) and these numbers are published for their DIRECTION only:

| lag | BEFORE fill / spread / ncomp | AFTER fill / spread / ncomp |
|---|---|---|
| +0 ms | 0.392 / 0.855 / 12 | 0.481 / 0.806 / 13 |
| +33 | 0.410 / 0.878 / 10 | 0.337 / 0.942 / **38** |
| +67 | 0.380 / 0.896 / 17 | 0.314 / 0.971 / **43** |
| +100 | 0.401 / 0.946 / 12 | 0.262 / 1.091 / **64** |
| +167 | 0.380 / 0.998 / 10 | 0.248 / 1.131 / **62** |

Before: `fill` flat at 0.38-0.41 and `ncomp` flat at 10-17 across the whole event. After: `fill`
falls by half and `ncomp` rises fivefold. Same direction as the authored canvas, same
magnitude.

**Crop it and look:** `OURS-before-after-FINAL.png` (matched 0.350 crop on both rows) and
`SCALEMATCHED-arcade-vs-R11.png` (each panel 1.2x its OWN side's fireball width; the crop
fractions 0.537 and 0.329 and their 1.63x ratio are printed on the image).

### 1.5 The re-flare, against the file's own comment

`explosions.js:498` asserted *"The decay phases have no white-hot core: the fire is going
out."* The R10 judge refuted it on three arcade kills of four. Phase 1 now carries a core, and
it lands where the arcade's does by construction: **phase 1 occupies +100 to +183 ms of a
267 ms life and the arcade's white-hot fraction peaks at +100 to +133 ms.** The authored `hot`
fraction runs 0.062-0.070 (phase 0) -> **0.106-0.111 (phase 1)** -> 0.016 (phase 2) — a late
peak of 1.6x, inside the judge's measured arcade peak range of 0.11-0.41. The comment has been
replaced with what the arcade says.

**A MASK ASYMMETRY IN THE JUDGE'S OWN OPERATOR, which runs against us and which its §1.4 table
carries.** `m_material` is `R > B + 26`. Our authored core is `E_HOT #f7f7e6`, R − B = **17**:
**it is outside the mask.** The arcade's near-white core is warmer — REFERENCE.md's t100.75
kill reads (249, 231, 192), R − B = 57 — and is inside it. So the judge's `hot` column could
see the arcade's core and not ours, and its "ours is white-hot for 21 % at first light" is a
FLOOR on our hot fraction, not a measurement of it. `--selftest` arm 8b is the control
(4 assertions). It does not weaken the defect in the slightest: phases 1 and 2 drew no core at
all, which is true from the source and independent of any mask. Every `hot` figure in this
report uses the repaired mask `m_material_hot` on **both** sides.

### 1.6 What changed in `explosions.js`

| | before | after | why |
|---|---|---|---|
| canvas | 64 x 64 | **96 x 96** | the sprite is drawn at `PEAK_FRAC` 0.30 of 320 = **96 native px**, so at 64 it was upsampled 1.5x and a 2-texel fleck arrived as a 3-px smudge |
| phases 1, 2 | the phase-0 lobe cluster with bands dropped | **`drawBreakup`** — a core scatter of hot chunks with 16 radial streaks of separated flecks tearing out of it | §1.2-1.4 |
| phase 1, 2 core | none | **re-flare** (5 patches) / **trace** (2) | §1.5 |
| fleck marks | — | **integer `fillRect` only** | a `ctx.arc` antialiases and the palette snap then decides a 3-texel fleck's SHAPE by a rounding rule. It is also what the arcade's own spray is: every chunk in `ARC-residue-origin.png` at 2x is a hard-edged rectangle of one colour |
| `grow` ramp | 2/16, linear | **5/16, eased `^0.65`** | `t_rise` and `n60`; derivation and the four-row sweep are in the file |
| `DECAY_FROM` / `DECAY_MID` | 5/16, 10/16 | **6/16, 11/16** | phase 0 is now the only lobe cluster, so it owns the area maximum and `t_rise` is bounded by its length |
| residue palette, lobes, size | pale peach column | **measured orange ball** | §2 |

### 1.7 The envelope, re-measured with R10's own operator

`judging/R10/envelope_r10.py` (its own selftest PASS), `?combatexpl=1&seed=1`, 160 consecutive
ticks, `--event 66,104`, mask `r9`, 60 Hz both sides. **Same harness, same seed, same window on
every row.**

| | `peak` % | `t_rise` | `w60` | `n60` | `r100` | `life10` |
|---|---|---|---|---|---|---|
| **arcade, R10 column, n = 4** | 0.83-4.32 | **0.067-0.117** | **2-8** | **3-8** | **0.036-0.157** | **8-18** |
| **BEFORE `5e3d57e`** | 2.016 | 0.083 | 8 | 8 | 0.107 | 9 |
| **AFTER, shipped** | 1.551 | **0.067** | **3** | **3** | **0.138** | **15** |

Every statistic is inside the arcade's observed range. (The BEFORE row reproduces R10's
published harness figures — 2.016 / 0.083 / 8 / 8 / 0.107 / 9 — **to every digit**, which is the
cross-check that my pipeline is running their operator and not a near-miss of it.)

**AND THE OLD BUILD PASSED `t_rise` FOR THE WRONG REASON.** Its 0.083 s came from phase 1
carrying MORE fire-band area than phase 0 — the series runs 1.68 -> 1.99 -> 2.02 straight
across the phase boundary — i.e. from the decay being brighter than the flash. That is R10's
own plateau, measured from the other end. The arcade's fireball genuinely EXPANDS before it
bursts (event D's masked area: 21 / 22 / 28 / 30 / 36 / 37 / 45 / 48 % of its ROI over eight
consecutive frames), so a four-frame rise is the faithful shape and not merely the shape that
lands the statistic.

**A LIMITATION ON THAT TABLE, AND IT IS NEW. The `r9` envelope figures above were taken with
the residue still PALE, and once the residue is its measured ORANGE the mask cannot separate
fireball from residue on EITHER SIDE.** `r9` is `R>180 ∧ 60<G<235 ∧ B<90`; the arcade's residue
(#f88f41) passes it and our old peach (#efb58c, B = 140) did not. So R10's arcade `life10`
column was measuring **fire + residue** and its our-side column was measuring **fire only** —
a same-name-different-operator across sides that nobody had named. Re-measured on the shipped
tree the harness series carries a 0.2-0.6 % residue floor and `life10` reads 33 frames, which is
not a regression and not comparable to anything. The table above is the FIREBALL's envelope,
measured on a tree whose burst canvases are **md5-identical** to the shipped ones (verified:
`tex-r11f` vs `tex-shipped`, four canvases, same hash) and which differs only in
`smoke.js`'s palette. `life10` and `r100` should be treated as **withdrawn as cross-side
statistics**, which strengthens R10 §6.3's own withdrawal rather than contradicting it.

### 1.8 Criterion A and the palette gate

`tools/measure_criterion_ab.py` (selftest PASS), 8 frames of `ours-FINAL-kill` spanning the
fireball, the burst, the spray and 0.5 s of residue:

```
colours        67 - 71   (gate <=256)     median 70
channel values 27 - 28   (gate <=32)      median 28
H-identity 73.7-76.3 %   V-identity 63.0-70.2 %   near patch V 61.5 %
```

`tools/assert_population.py` on the same eight: **EXPLOSION 8/8, PLAYER-WEAPON 8/8,
ENEMY-FIRE 8/8.** These are combat frames and the assertion says so from the pixels.

> **AND THAT ASSERTION EARNED ITS KEEP THIS ROUND.** An earlier pass of the same eight frames
> read **ENEMY-FIRE 0/8**, and the reason was that my own `aim_sweep.py` was mid-arm and had
> `SPEED = 240` live in the tree while I captured — so the rounds crossed the screen too fast
> to be in any frame. **I did this to myself with my own instrument**, which is CLAUDE.md's
> "an A/B is only an A/B if the tree did not move under it" with the agent and the saboteur
> being the same party. Every capture in this report was retaken after the sweep's
> md5-verified restore, and the kill lands on the same tick at the same screen position as the
> `5e3d57e` baseline on both.

`node tools/fx_palette_probe.mjs` over **36** authored canvases (33 before — see §5):
**0 partial-alpha texels, 0 off-palette opaque colours, 0 off-ladder channel values, 0
Criterion A3 ceiling breaches**, every element declaring a palette. The burst canvases carry
5-7 colours each against a ceiling of 16.

---

## 2. THE RESIDUE IS NOT PEACH — and R10's figure is a different object

### 2.1 The refutation

R10 published the post-kill residue as mean RGB **(236, 188, 162)**, dominant `#f4c8b3`,
S 0.312, from one frame at t = 99.4 described as *"a kill that detonates over open sea with no
cloud in the frame"*, using `V>0.70 ∧ R>B+0.04 ∧ S<0.45`.

**Reproduced exactly**: largest component 65 502 px, mean (237, 190, 164), V 0.928, S 0.307 —
their figure to the digit. **Then cropped and looked at** (`R10-opensea-mpeach-marks.png` beside
`R10-opensea-frame.png`): what the mask has selected is a **tall pale COLUMN rising from the
bottom edge of the frame**, with the compact orange post-kill ball sitting separately at the
top of it. Stepping that same window at 60 Hz (`ARC-column-origin.png`, f0011-f0065 every 6th)
shows a **large white cloud bank arriving from the right across exactly those frames**.
R10's own §4 documents that failure mode for the missile trail — *"every mask that accepts it
also accepts stage 1's cloud banks, which are the same white and far larger"* — and did not
apply it here.

**Reproducing a number proves you ran their operator, not that it is the licensed one.** This
is the second instance of that rule in two rounds.

**WHAT IS MEASURED HERE AND WHAT IS MY READING, kept apart.** Measured: the mask accepts
0.9-2.4 % of a real air-kill residue blob (§ below); the air-kill residue is orange on an event
whose whole chain is on screen; and R10's selection is a larger, paler object of a different
shape with a cloud bank arriving across the window. **My READING that the pale column is a
ground- or sea-impact plume is an inference from its geometry — it rises from the NEAR edge of
the frame rather than drifting with the world and receding, which is what a residue does — and
it is not needed for the refutation.** What refutes the figure is that the published colour is
reproduced by taking the *boundary texels of the wrong object*, whichever object that is.

**The `S < 0.45` clause is a CEILING, not a filter.** Run on a real air-kill residue blob it
accepts **0.88 %** of it (234 px of 26 682) and **2.38 %** of another (149 of 6 264), and those
are its antialiased boundary texels, at mean (215, 180, 156) and (216, 163, 146) — which is
R10's published colour. **98 % of the blob is S > 0.45 and the mask cannot see it at all.**

### 2.2 What the residue is

Operator `R > B+26 ∧ V > 0.25`, largest 8-connected component inside a hand-set sky box, crops
in `ARC-residue-marks.png`. The event is the one whose whole chain is in
`ARC-residue-origin.png`, so there is no question what the blob came out of.

```
pooled over f0207, f0212, f0217, f0222, f0227      n = 86 226 px
mean RGB (230, 114, 33)    V 0.902    S 0.853     (R10: S 0.312)
V-ordered band means   p0-15  (173, 78, 35)     p15-45  (223, 107, 30)
                       p45-80 (246, 127, 37)    p80-100 (253, 151, 65)
bbox 146x138 and 168x156 px -> aspect h/w 0.93-0.95, area/bbox 0.77-0.78,
     14.2-16.3 % of frame WIDTH -> a round lumpy BALL, not a column
it stays orange for its whole life: tracked to t = 103.5, ~1.1 s old,
     in ARC-residue-age.png, and it never pales
```

Shipped: `KILL_SMOKE_PALETTE = ['#a44a10', '#e67310', '#f78410', '#ff9c4a']` — the four band
means snapped to `SEGA_LADDER`, **with the rungs chosen to reuse ones `EXPLOSION_PALETTE`
already puts on screen wherever one is within ~20/255**, so the whole residue costs Criterion A2
exactly **one** new channel value (132). Area-weighted they return (231, 123, 28) against the
measurement's (230, 114, 33). The lobes became a round cluster of seven and the canvas 36x34
(the measured aspect); `SMOKE_FRAC_END` 0.19 -> 0.145 and the inter-puff offset 0.060 -> 0.030,
because at 0.060 three puffs read as **three balls** where the arcade has one mass — visible at
+233 ms in the before/after strip, and the reason the sizes moved at all is that R10 sized them
against the 7.20 %-of-frame **column**.

**Honest consequence, stated rather than buried**: the residue's new colours are inside the
`r9` fire mask, which is what broke the cross-side envelope comparison in §1.7. I would rather
have a residue that is the right colour and an envelope statistic that admits it cannot
separate two things than the reverse.

**What is still OPEN**: the blue channel lands on 16 where the frames read 30-37 (the ladder
snap on a resampled source, and the weakest of the three); and the residue's life beyond
~0.6 s could not be separated from the island terrain it drifts over, so the ageing phases
dim it but do **not** pale it, because nothing measured says it pales.

### 2.3 THIS CLOSES THE `R = G` QUESTION, which two rounds have argued about

The art critique's caution, carried into R10 gap 8, was: *"the only true-native arcade warm
masses read **R = G exactly**, where the new kill smoke ships at R−G = +48"* — i.e. our peach
was already suspected of being too warm-shifted, and the proposed direction was to pull R down
onto G.

**The arcade's own post-air-kill residue reads R − G = +116 at birth and +103 at 0.25 s.** The
direction was right and the magnitude was backwards: our peach was not warm-shifted *enough*,
by a factor of two and a half, and the fix is more saturation rather than less. `R = G` is a
property of the true-native masses the critique sampled — which are a different class of
object — and not of this one. The shipped ladder returns an area-weighted R − G of **+108**.

> **So the question is settled in the direction NEITHER side proposed**: the critique was right
> that the peach was wrong, R10 was right that the residue is not grey, and both were reading a
> value taken off the wrong object. The licensed figure is one isolated kill over open sky with
> its fireball, its starburst and its residue all on screen at 60 Hz
> (`ARC-residue-origin.png`), measured with a mask whose acceptance fraction on the subject is
> published.

---

## 3. ENEMY FIRE — the aim-error term, and what it is worth

### 3.1 It exists now, and it costs no PRNG draw

`AIM_ERROR_NDC` in `src/entities/enemy.js`: a per-train offset between the player's position
when the flare lights and the point the train is aimed at, applied **perpendicular to the
rake**. A train already sweeps a capsule along `sweep`; an error ALONG that axis slides the
capsule along itself and barely changes the area it covers, while an error ACROSS it moves the
whole capsule off the player. It is also the legible direction: the train visibly passes to one
SIDE of you.

The magnitude is **hashed out of state the aircraft already has** — the sweep angle just drawn,
plus its own age and depth — so it takes **no draw from the shared stream** (CLAUDE.md's
recurring bug class; it cost R10's effects lane an hour). `AIM_ERROR_NDC = 0` is therefore
byte-identical to the build without the term, and every arm below shares one PRNG stream with
its control. **Verified**: the `?demo=2&seed=1` kill lands on the same tick at the same screen
position on the baseline and the shipped tree.

**The hash is controlled ON REAL INPUTS, not on a synthetic sweep.** A hash that is uniform over
`(angle, age, depth)` drawn independently can still be degenerate over the narrow, correlated
triples a real telegraph produces. `judging/R11/aim_error_control.mjs` reads a census out of the
same module instance the running game uses, after 900 s of `?fixed=1` play:
**seed 4: 243 events, chi-square 25.72 on 19 d.o.f.; seed 5: 233 events, 19.27** — both under
the 5 % critical value of 30.14. Uniform.

### 3.2 THE SWEEP, and it does not say what the ask assumed

`tools/fairness_probe.mjs` (its own controls pass), `?demo=1`, **7 seeds x 300 s per arm**,
pooled not averaged (R8 interface I27). `pHit` is the estimator — ~2 500 round-crossings per
arm against 43-105 deaths — and deaths/min is the prediction that can then be checked.
Arms driven by `judging/R11/aim_sweep.py`, each restoring its files from an in-memory copy in a
`finally` and verifying the restore by md5.

| arm | deaths/min | **pHit %** | rounds/min | mean in air | warning s |
|---|---|---|---|---|---|
| **A0** shipped geometry, E = 0 | 1.229 | **1.727 ± 0.261** | 110.6 | 5.25 | 3.017 |
| **A2** shipped geometry, E = 0.20 | 1.257 | **1.673 ± 0.250** | 107.2 | 5.36 | 3.317 |
| **B0** `SPEED` 240, spacing 0.02, flat size, E = 0 | 2.800 | **9.245 ± 0.755** | 130.2 | 0.20 | 1.117 |
| **B1** same, E = 0.10 | 3.000 | 10.813 ± 0.785 | 135.0 | 0.22 | 1.117 |
| **B2** same, E = 0.20 | 2.657 | 8.796 ± 0.664 | 129.5 | 0.22 | 1.117 |
| **B3** same, E = 0.35 | 2.571 | **6.521 ± 0.557** | 129.7 | 0.24 | 1.117 |

**Four findings, and three of them contradict the brief I was given.**

1. **AT THE SHIPPED GEOMETRY THE AIM ERROR IS INERT.** 1.727 % against 1.673 %, a difference of
   0.054 against a combined standard error of 0.36. The fairness lag is already 3.0 s and the
   player's own displacement over 3 s routinely exceeds 0.20 NDC, so a bounded offset is lost
   inside it. **That is why the shipped value is 0.0, and it is a measured answer rather than a
   default.** The term is not dead code: it is the constant that has to move WITH the envelope,
   and it now exists, is controlled, and has a curve attached.

2. **THE DEATH-RATE GATE IS NOT CURRENTLY MISSED, AND THE FIGURE THE ASK RESTS ON DOES NOT
   REPRODUCE.** My brief says *"a death-rate gate we already miss at 2.114 deaths/min"*. On
   7 seeds x 300 s of `?demo=1` the shipped tree reads **1.229/min**, against an arcade rate
   measured twice at **1.91-2.04/min**. We are **36-40 % BELOW the rate a human paying for the
   cabinet dies at** — which `enemyShots.js`'s own header calls "not a difficulty setting, it
   is a broken game". The headroom runs the opposite way from the one the round was planned
   around.

3. **CLOSING THE ENVELOPE COSTS 5.4x THE PER-ROUND HIT RATE — more than R10's "quadruples" —
   BUT ONLY 2.1-2.3x THE DEATHS**, because many of the extra hits land on a life that was
   already short. B0 reads 2.800/min and B3 2.571/min against the arcade's 1.91-2.04: an
   overshoot of **26-35 %**, where we currently undershoot by 36-40 %. Both are wrong; the
   envelope is far closer to closable than "4x the hit rate" suggested.

4. **THE AIM ERROR CANNOT PAY FOR IT, AND THE SHAPE OF THAT ANSWER IS THE POINT.** From E = 0
   to E = 0.35 `pHit` falls 9.245 % -> 6.521 %, a drop of 2.72 ± 0.94 — real at 2.9 sigma, and
   worth **29 %** where **81 %** is needed. (E = 0.10 reads *higher* than E = 0 at 1.4 sigma;
   that is noise, and it is published rather than smoothed.) Extrapolating that slope, closing
   the gap on aim error alone needs roughly **±1.7 NDC — 85 % of a half-screen, essentially the
   whole frame**. That is the R4 random rake (0.22-0.85 NDC) that the R4 feel critique killed
   for being arbitrary, only larger. **It is a 5x extrapolation beyond the measured range and I
   publish it as an order of magnitude, not a value — but the order of magnitude is the
   answer.**

> **So the R10 ask's premise — "three constants move together or not at all, and the unblocking
> one is an aim-error term" — is REFUTED at the magnitudes that keep the telegraph honest.**
> The aim error is a real lever and a weak one.

**AND THE CLAIM IS NARROWER THAN I FIRST WROTE IT: "inert" IS INERT FOR THE PILOT WE CAN
MEASURE.** Every arm above is a ZERO-LATENCY pilot. The R11 combat lane measured missile kills
against stick latency on the lateral question and the SIGN REVERSED — on the old wide rail a
300 ms pilot loses 74 % of its kills where a 0 ms pilot loses nothing, so a result taken at 0 ms
predicted the opposite of the result at human latency. There is no reason that would not apply
here: **an aim error is worth nothing to a pilot that cannot react to the flare it accompanies,
and may be worth a great deal to one that can**, because the whole point of the offset is to
turn "the train is coming" into "the train is coming THERE". So §3.2's 1.727 % → 1.673 % is
evidence that the term does nothing *for a pilot that ignores the tell*, which is the only pilot
this project can currently measure. It is not evidence about a player. That strengthens rather
than weakens the shipped value of **0.0** — there is no measured case for a non-zero one — but
it means the curve must be re-run against a latency-bearing pilot before the constant is moved
in either direction. That pilot has no arcade column either, so it is a diagnostic, never a
gate.

### 3.3 Two corrections to arcade-side arithmetic in the ask

**(a) "~0.04 s emission spacing" and "10-16 simultaneous fireballs" are not jointly consistent
with a 0.367 s train presence.** If the whole train enters and clears in 0.367 s, then
`9 x spacing + flight = 0.367`; simultaneity of 10 rounds additionally requires
`flight >= 9 x spacing`. Together those give **spacing ≤ 0.020 s and flight ≥ 0.184 s** — not
R10's 0.04 s spacing with a 0.37 s flight, which would have the last round leaving as the first
arrives. The envelope arm above is built on the corrected solution: `SPEED = 240` gives a flight
of 0.21 s at depth 52 and 0.09 s at 24, and an 8-round train at 0.02 s spacing occupies
0.16 + 0.21 = **0.37 s of screen time, matching the arcade's 0.367 s**, with up to 8 rounds
simultaneously in the air during the train.

**(b) `meanShotsInAir` 0.20 at the closed envelope is NOT comparable to the arcade's "10-16 at
once".** Ours is a time average over every frame including quiet ones; the arcade's is a count
on one busy frame during a train. By Little's law a time-average of 10 at a 0.37 s screen life
requires **1 600-2 600 rounds/min**, 15-24x our 110 — i.e. continuous fire. The two numbers are
the same-name-different-operator class and should not be put in one column.

### 3.4 What I did NOT change, and why it is the TL's call

**I did not close the envelope.** The constants are measured and ready —
`enemyShots.js SPEED` 10 -> 240, `FRAC_FAR`/`FRAC_NEAR` -> 0.018/0.021, `enemy.js
SHOT_SPACING_S` 0.08 -> 0.02, optionally `AIM_ERROR_NDC` 0 -> 0.35 — and they are a one-line
set in two files I own. What stops me shipping them unilaterally is that the decision trades a
**fidelity** fact (0.37 s against our 2.24-5.04 s, an 8-14x gap, measured on both sides) against
a **balance** fact (2.57-2.80 deaths/min against the arcade's 1.91-2.04), and the balance fact
is measured on a pilot that cannot use the tell.

**THE ARGUMENT FOR SHIPPING IT, stated at its strongest because it may be right.** `?demo=1`'s
pilot is a pure function of `simTime` plus a position feedback onto an authored curve
(`demoTimeline.js`); it never looks at an enemy or a flare. So the telegraph's information is
worth exactly **zero** in every death-rate figure this project has ever published, and the
2.571/min at B3 is an **upper bound** on what a human would experience with 1.117 s of warning.
A human might well land on the arcade's 1.91-2.04.

**THE MEASUREMENT THAT WOULD SETTLE IT, and it is cheap**: a probe pilot that dodges
perpendicular to an incoming telegraphed train. It lives in `demoTimeline.js`, which is the
flow lane's file, so it is an ask and not a change. **Until it exists, every deaths/min in this
repo is the death rate of a pilot who ignores the one mechanic the fairness contract is built
on, and no amount of seeds fixes that.** I rank it above the envelope change itself.

### 3.5 THE FAIRNESS FIGURES ARE RE-BASED BY ANOTHER LANE, MID-ROUND

After my sweep finished and its files were restored, the feel lane cut
`player.js ENVELOPE_X` from **2.6 to 0.733** and `RATE_X` from `3.0 * ENVELOPE_X` to a literal
**2.82**. That is a 3.5x reduction in how far the jet can travel laterally, and **every number
in §3.2 is a reading of the jet's displacement distribution**, so all six arms are measurements
of a build that no longer exists. The symptom is immediate: re-capturing `?demo=2&seed=1` at
tick 690 on the post-cut tree no longer produces the kill at all (fireball area 611 px against
10 449), because the pilot is somewhere else.

**Nothing in §1 or §2 is affected** — the explosion figures are taken from authored canvases and
from a kill that lands on the same tick at the same screen position on both of my trees
(fireball peak centroid (151.1, 635.4) at `5e3d57e` against (151.7, 636.2) shipped) — but the
§3 table must be re-run before anything is decided on it, and so must every death-rate figure
this project has published.

**The direction is predictable and it is unfavourable to the ask.** `pHit` is
`P(|displacement + aim error| < hit radius)` at the fairness lag; shrinking the envelope by 3.5x
shrinks the displacement the lag buys, so `pHit` rises on *every* arm — and the aim error, which
is in NDC and did not move, becomes relatively *larger* and therefore a stronger lever than
§3.2 measured. Both halves of §3.2's conclusion could move.

I re-ran the control arm on the post-cut tree, 7 seeds x 300 s, with an md5 check on
`player.js` either side of the run so a further edit could not be mistaken for a result:

| | deaths/min | pHit % | rounds/min | warning s |
|---|---|---|---|---|
| `ENVELOPE_X` 2.6 — every arm in §3.2 | 1.229 | 1.727 ± 0.261 | 110.6 | 3.017 |
| `ENVELOPE_X` 0.733 — the current tree | **1.771** | **3.511 ± 0.438** | 101.9 | 3.050 |

**`pHit` DOUBLES and the death rate rises 44 %**, on the direction predicted above, from a
change in another lane's file that has nothing to do with enemy fire. That alone moves the
shipped build from 36-40 % below the arcade's 1.91-2.04 deaths/min to **inside** it, and it
shifts every arm in §3.2 upward by an unknown amount.

> **AND THE GUARD FIRED: `player.js` CHANGED AGAIN DURING THAT RUN** (md5 `abb62c36` at the
> start, `1461a0f2` at the end). So the 1.771 / 3.511 row is **not a reading of one tree** and
> I am publishing it as a DIRECTION AND AN ORDER OF MAGNITUDE, not as a value. The md5 check
> is the only reason I know that, and without it the row would have looked exactly as clean as
> every other row in this report.

**Treat §3.2 as valid for `ENVELOPE_X = 2.6` and as OPEN for the current tree. Every arm has
to be re-run once the feel lane's constants settle; `judging/R11/aim_sweep.py` re-runs the
whole set unattended in about twelve minutes.**

This is CLAUDE.md's "an A/B is only an A/B if the tree did not move under it" for the third time
in two rounds, and the second time this round — §1.8 records the first, where the lane that
moved the tree under me was me.

---

## 4. The death sequence — measured, specified, and sent as a request (JOB 3)

`?fixed=1&demo=2&seed=1&forcedeath=2.0`, **300 consecutive ticks at 60 Hz**, whole-frame fire
and warm area fractions with the pre-death floor subtracted. Crops: `DEATH-hole.png`,
`death-quad.png`.

```
t = 2.033          death triggers, fireball explosion spawns
t = 2.033 - 2.267  fire,  15 frames = 0.250 s
t = 2.733          starburst explosion spawns  (= 2.033 + FIREBALL_S 0.7)
t = 2.733 - 2.967  fire,  15 frames = 0.250 s
t = 3.817          LAST FRAME WITH ANYTHING ON SCREEN
t = 3.817 - 4.017  EMPTY SKY — 12 frames, 0.200 s, jet hidden, nothing drawn
t = 4.017          the tumbling hulk appears
```

Cover is **1.784 s against `FIREBALL_S + STARBURST_S` = 2.000 s**. R10 estimated ~0.13 s by eye;
at 60 Hz on this tree it is 0.200 s, and **I verified it by looking** — `death-quad.png` frame
231 is flat sky with a HUD on it.

**R10's EFFECTS LANE PREDICTED THIS HOLE, IN THE FILE, A ROUND BEFORE IT OPENED**, and that is
the strongest thing a comment in this repo can do, so it is quoted rather than paraphrased
(`lane-envelope.md` §1.5, "NOTE FOR THE GAME-FLOW LANE, not an ask"):

> *"`FIREBALL_S` and `STARBURST_S` are no longer matched to the thing they are waiting for.
> They happen to be covered now. If either the fire or the smoke life moves again, the cover
> goes with it, and the right fix is for the phase to end when the effect does rather than on a
> constant that remembers a value from three rounds ago."*

A life moved. The cover went with it. **And the 0.200 s is not attributable to this round's
changes** — it is the arithmetic that note sets out, arriving on schedule.

**R10 ESTIMATED THAT GAP AT ~0.13 s BY EYE; AT 60 Hz IT IS 0.200 s** — 54 % larger, and 12
frames rather than 8. A by-eye estimate of a transient is not a measurement of one, which is
ledger row 29 / citation field 6 applied to a *negative space* rather than to an event.

**SHIPPED: `explosions.busy()`**, at the TL's instruction, in place of a re-tuned constant — a
constant re-timed to today's effect lives is a constant that goes stale the next time anyone
touches an envelope, which is precisely how this hole opened.

```js
explosions.busy()   // true while ANY fire OR residue from any live spawn is still drawing
```

The three properties the flow lane asked for are **measured, not asserted** —
`node judging/R11/busy_control.mjs`, **10/10**, driving the real `ExplosionField` and the real
`SmokeField` (scene and space stubbed, because the drain is what is under test):

| property | answer |
|---|---|
| **1. does it go false?** | **Yes, on a bound.** 1.133 s on the nominal spawn; **worst case 1.333 s** over 24 spawn rotations spanning the whole residue life jitter, at scale 1 and at `deathSequence`'s scale 2.7. The arithmetic bound is `LIFE_S` 0.267 + max puff life 1.062 = 1.329 s, and the measurement agrees to one 60 Hz tick. **THE ONE LEAK PATH, named because it was asked for: both arrays drain only inside `update(dt)`, so a state that hides the field without ticking it holds `busy()` true indefinitely.** `clear()` resolves it immediately and is the correct call on a flow transition (pinned by the control). |
| **2. does it count residue?** | **Yes, and it has to.** The control measures a **0.867 s residue-only window** after the fire ends at 0.267 s. On the real death the last fire frame is t = 2.967 and the last frame with anything on screen is t = 3.817 — a fire-only predicate would report idle for most of the phase it is meant to hold open. `this.smoke` is this field's OWN `SmokeField` and holds nothing but kill residue, so missile trail puffs cannot hold it true. |
| **3. cheap and pure?** | **Yes.** Two array-length reads, O(1), no allocation, no mutation, no PRNG draw — unlike `__combatDebug()`, which consumes a draw from the shared stream. The control pins that 50 calls change the field's own counts by nothing, and that it is **TRUE on the spawn tick before any update**, so a frame-one read cannot see idle. |

The floor-and-ceiling wrapper belongs on the flow lane's side and the TL has asked for it there:
a minimum phase length so a frame-one failure cannot skip the death, and a maximum so a leak
degrades to today's behaviour instead of a soft-lock. **Put the ceiling above 1.333 s.**

The stopgap stays on the table if it is wanted instead: `STARBURST_S` 1.3 -> 1.08, the measured
cover.

---

## 4B. THE SPAWNER'S LATERAL SPREAD — JOB 4, and the premise does not hold

Charter: `judging/R11/ask-spawner.md`. `src/game/spawner.js` is this lane's file.

> **THE ASK WAS TO RE-DERIVE A SPREAD TUNED TO AN ENVELOPE THAT NO LONGER EXISTS. MEASURED,
> NO RETUNE IS WARRANTED: the spread is not a reachability parameter at all, the entire
> engageability loss is ONE pattern, that pattern is a GUN target on both trees with an
> unchanged kill count, and for a pilot that fires both weapons the envelope cut nearly
> DOUBLES total kills — 25 to 44 across three seeds. The deliverable is the derivation, the
> correction of a stale input next to it, and a guard, shipped in the file.**

### 4B.1 The engageable band, derived rather than scaled

A missile lock needs the enemy within `LOCK_RADIUS_FRAC` of the SIGHT, and the sight is the
airframe lifted 0.30 NDC (`combat.js SIGHT_NDC_Y_OFFSET`). So

```
ENGAGEABLE = the player's own NDC rail + LOCK_RADIUS_FRAC/0.5 = 0.2027 + 0.166
           = 0.3687 NDC = 18.4 %W
```

**The rail is MEASURED, not converted, and that matters more than it looks.** `ENVELOPE_X` is
in WORLD units and the map to NDC is not the proportionality it resembles: **2.6 gives
±0.3505 NDC and 0.733 gives ±0.2027 — a 3.55× change in the constant for a 1.73× change in the
rail**, because the jet rolls as it slides and what is projected is a roll-compensated sprite.
Anyone scaling the band by the constant's ratio would be wrong by a factor of two.
`judging/R11/reach_probe.mjs` prints it in one line.

**TWO NDC BASES, AND THE ONE THE LOCK USES IS NOT THE ONE THE RAIL WAS PUBLISHED IN.** The feel
lane's ±9.85 %W is `__flowState().jetNdcX` — the sprite anchor through the live camera. The lock
cone and the enemy path both live in `space`'s pitch-only basis, where the same rail reads
**±7.52 %W** on `playerNdc`. They coincide only at zero roll. The probe records both on every
sample for exactly this reason; this repo lost a round to the `jetNdcY` / `playerNdc` pair
already. Every figure below is in the lock's own basis and at zero roll — which is also the
CONSERVATIVE choice, because rolling widens the reachable set (`playerNdc.x` reaches ±0.4315 NDC
under a held diagonal stick) and counting it would make an upper bound out of an upper bound.

### 4B.2 The spread is not a reachability parameter

The screen path advances by SIZE (1/d), not by time (`enemy.js`), so a wave does almost all its
lateral travel in the last fraction of its depth — **below the lock floor.** Measured,
`?fixed=1&demo=2&seed=1`, 5 400 consecutive ticks of enemy telemetry, |x| in %W:

| pattern | lock window (d 26-88) median / p90 / max | below the floor (d < 26) median / p90 / max |
|---|---|---|
| approach | **3.03 / 6.04 / 8.47** | 5.19 / 14.66 / 37.30 |
| overtake | **5.28 / 9.10 / 10.91** | 7.35 / 17.34 / 23.70 |
| crosser | **29.00 / 30.50 / 31.05** | 16.25 / 26.62 / 34.01 |

**Every approach and overtake spends its entire lockable window inside 11 %W** — well inside the
18.4 %W band — and the fan-out that `baseB` and `k * 0.26` author happens afterwards, where it
is a composition and collision parameter and not a reach one. Engageable-by-missile fractions,
**three seeds, two pristine trees** (`git archive 5e3d57e` against the working tree):

| pattern | `ENVELOPE_X` 2.6 | `ENVELOPE_X` 0.733 |
|---|---|---|
| approach | 85.3 / 88.6 / 91.2 % | **100 / 100 / 100 %** |
| overtake | 100 % | 100 % |
| crosser | **100 %** (7/7, every seed) | **0 %** (0/7, every seed) |
| all | 89.6 / 92.0 / 93.8 % | 83.7 / 85.7 / 86.3 % |

> **The cut IMPROVED the main traffic and lost one pattern completely.** 7 crossers per seed,
> 7/7 to 0/7, on all three — and the charter's own measured cost is 18 → 11 kills, a loss of
> exactly 7, on the same seed.

### 4B.3 The crosser is a gun target, and always was

A crosser spawns at depth 30-44 and reaches depth 3; the 1/d law leaves it at |x| 22-31 %W when
it falls through the lock floor at 26, so it is lockable only out at the side. Before the cut
the player could slide to ±36 %W and take it there — **that is chasing**, and the arcade's own
rail is ±9.85 %W with the same 8.3 %W cone, so **an arcade player could not have locked it
either.**

What the arcade does with these is on screen at 60 Hz:
`tools/out/spawner-r11/ARC-crosser-approach.png` and `ARC-t118.png` (t = 116.50-119.42, which is
GAME_SPEC.md §4's own crosser citation, decoded consecutively). The aircraft converge toward the
centre as they grow, pass **large and near across the player's own column**, and sweep out to the
sides. That is a gun engagement. **Ours is too** — kills by weapon AND by spawn pattern, read
out of `combat.js`'s own kill log, `?demo=2`, three seeds, 90 s each
(`judging/R11/kill_census.mjs`):

| | `ENVELOPE_X` 2.6 | `ENVELOPE_X` 0.733 |
|---|---|---|
| crosser kills | 10 (9 vulcan, 1 missile) | **11 (11 vulcan)** |
| approach kills | 14 | 27 |
| overtake kills | 1 | 6 |
| **TOTAL** | **25** | **44** |

**THE CROSSER'S KILL COUNT IS UNCHANGED AND TOTAL KILLS NEARLY DOUBLE.** The 18 → 11 that opened
this question is a **missile-only** count from a probe pilot that holds the missile button and
never touches the trigger — `judging/R11/probe_r11.mjs` sets `{...stick, missile: held}` and no
`fire` — so a pattern engaged with the gun reads there as a total loss while being entirely
fightable. That is not a criticism of the probe, which was built to measure lock behaviour and
says so; it is a limit on what its headline can carry.

### 4B.4 What I shipped, and what I deliberately did not

**NOT retuned.** Cramming traffic toward the centre would raise that probe's number and would be
wrong twice over: it would move a distribution that has no arcade column, to recover a statistic
that is an artefact of the pilot. The TL's instruction was explicit and I agree with it.

**Shipped in `spawner.js`:** the derivation above, the per-pattern tables, `ENGAGEABLE_HALF_NDC_X
= 0.3687`, and a **GUARD** — `ENVELOPE_X` is now IMPORTED (not transcribed) and compared at module
load against `ENVELOPE_X_AT_MEASUREMENT = 0.733`; a mismatch prints one line naming every figure
it voids and the tool that re-measures them. It warns and does not throw: a hard failure here
turns a stale comment into a black screen. **Verified to fire**, `judging/R11/guard_test.mjs` —
silent when the witness matches, one warning when it is patched stale, file restored and
byte-compared after.

**Also corrected, because it is the same bug one dimension over.** `REACH_CEILING_NDC_Y`'s
derivation table claimed the shipped lock radius was **22 %W** and re-derived a ceiling of
+1.388. `lockSystem.js:164` reads `LOCK_RADIUS_FRAC = 0.083` and its own R10 note records that
the round FROZE it there. Re-derived with the shipped value the ceiling is **+0.997**, not
+1.388. The conclusion is unchanged — +0.997 is the top of the frame, so the bound still does not
bind and 0.64 still stands on the side effect, not on this chain — but the table said something
untrue, which this file's own history (R7 gap 5) says is worse than saying nothing.

**The spawner edit is behaviourally inert and that is measured, not asserted**: the 15 443-row
enemy telemetry of `?fixed=1&demo=2&seed=1` over 5 400 ticks is **byte-identical** before and
after it.

### 4B.5 THE PATTERN, written up so it can be copied rather than re-invented

**THE DEFECT CLASS.** A constant derived from a constant in another file, with the dependency
recorded as a COMMENT ASKING THE NEXT AGENT TO REMEMBER. A request is not a mechanism. This
round alone it rotted three times, in three files, and every time the symptom was silent:

| where | the derivation | what moved | how it was found |
|---|---|---|---|
| `deathSequence.js` | `FIREBALL_S`/`STARBURST_S` timed against a 0.75 s fireball | the fireball life, R10 | 0.200 s of empty sky, by eye, a round later (§4) |
| `spawner.js` | `REACH_CEILING_NDC_Y` from the player ceiling and the lock radius | **all three inputs** | the R7 judge, as gap 5 |
| `spawner.js` | that same table's lock radius, "22 %W" | frozen at 0.083 in R10 | reading it this round (§4B.4) |
| `enemy.js` | `ENEMY_WORLD_WIDTH` from a transcribed camera factor | nothing yet — fixed BEFORE it rotted | this round |

**THE RULE, in two halves. DERIVE WHERE YOU CAN. GUARD ONLY WHAT YOU CANNOT DERIVE.**

*Deriving* is strictly better and is usually available: `core/cameraGeom.js` already EXPORTED
`worldWidthAtDepth`, so `enemy.js`'s literal `1.4873344` never needed to exist. It is now
`worldWidthAtDepth(1, NATIVE_W / NATIVE_H)` and the camera cannot go stale silently at all.

*Guarding* is for what cannot be derived — a figure that came from a MEASUREMENT rather than a
formula. `ENVELOPE_X` → the player's NDC rail is the case: the map is not the proportionality it
looks like (3.55× in the constant, 1.73× in the rail), so there is no formula to call, only a
probe to re-run.

**THE GUARD, five properties, all of them load-bearing:**

1. **IMPORT the live value; never transcribe it.** A copied number is the exact failure being
   guarded against.
2. **Keep a WITNESS** — `const X_AT_MEASUREMENT = …` — recording what the figures were taken at.
   The guard compares live against witness. The witness is never read by anything else; it is
   not a second copy of the value, it is a record of an event.
3. **WARN, NEVER THROW.** A hard failure turns a stale comment into a black screen, which is
   worse than a stale comment. One line, once, at module load.
4. **The message NAMES WHAT IT VOIDS AND THE TOOL THAT RE-MEASURES IT.** "Something changed" is
   useless; "`ENGAGEABLE_HALF_NDC_X` and the per-pattern tables above are VOID — re-measure with
   `reach_probe.mjs` + `reach.py`" is a work order.
5. **VERIFY IT FIRES.** A guard nobody has seen fire is a guard nobody knows works.

**THE VERIFIER IS GENERIC AND SHIPPED**: `judging/R11/guard_test.mjs --file F --witness NAME
--stale V`. It patches the WITNESS (never the live constant, so it cannot change behaviour even
if it dies half way), loads the page, counts matching warnings, and restores the file with a byte
comparison. Asserts three things: silent when the witness matches, **exactly one** warning when
it is stale, and the file restored.

```
$ node judging/R11/guard_test.mjs
PASS silent when the witness matches
PASS exactly one warning when the witness is stale
PASS file restored byte-identical                                            3/3

$ node judging/R11/guard_test.mjs --file src/entities/enemy.js \
      --witness ENEMY_WORLD_WIDTH --stale 2.0 --match enemy.js
   enemy.js: the fly-past span derives to 51.72 %W, outside REFERENCE.md
   "Enemies / Size at closest approach"'s measured 25-30 %W (ADOPTED #105) …   3/3
```

**Two guards, two files, one harness** — which is what makes this a pattern rather than an
anecdote. The second one is worth noting on its own: `enemy.js`'s camera term is now DERIVED, so
it cannot silently go stale, **and it is still guarded**, because a derivation that recomputes
correctly can still land the fly-past span outside the 25-30 %W band REFERENCE measured, with no
symptom but a slightly wrong-sized aeroplane. *Deriving removes the silence; the guard is what
checks the answer is still the measured one.*

**WHY IT IS NOT A SHARED HELPER**, since that is the obvious next thought and I decided against
it. The guard is eight lines, and its value is concentrated in property 4 — a message naming the
specific figures and the specific tool. A helper would either take all of that as arguments
(saving nothing) or genericise it into "a constant changed" (destroying the thing that makes it
a work order). It would also put a cross-lane import in every file that has one. **Copy the eight
lines; share the verifier.**

### 4B.6 THE PROBE'S `reach` CONTROL ARM DOES NOT EXIST IN THE COMMITTED FILE

I re-ran the charter's arms on both pristine trees as asked. **Three of the four reproduce to
the digit; the fourth is not implemented.**

| arm | charter | my re-run, same trees |
|---|---|---|
| base `track` | 36 / **18** | 36 / **18** |
| base `still` | 35 / **15** | 35 / **15** |
| now `track` | 27 / **11** | 27 / **11** |
| now `still` | 11 / **4** | 11 / **4** |
| base `reach` | 35 / **17** | 35 / **15** — IDENTICAL TO `still` |
| now `reach` | 29 / **12** | 11 / **4** — IDENTICAL TO `still` |

`grep -c reach judging/R11/probe_r11.mjs` returns **0**. The pilot selector is
`if (pilot === 'track') … else if (pilot === 'sweep') … else { stick = {x:0,y:0} }`, so
`--pilot reach` falls through to the `still` branch. My two `reach` runs return not just the same
kills but the **same launches, the same bracket percentages and the same lock percentages**, to
every digit, as `still` — which is only possible if they are the same pilot.

**This matters because that arm is the charter's load-bearing control.** Its claim is that the
kill drop is *"not a probe artefact: the `reach` arm exists specifically to rule that out … and
it recovers one kill"*, and that is the whole basis for *"so this is spawn geometry, not
measurement"* — the premise of this job. From the committed tree it cannot be verified.

**Stated as what it is, which is NOT an accusation.** The lane's other three arms reproduce
exactly, so its harness is sound and its discipline is visible; the most likely explanation is an
uncommitted working copy. **The ask is one line: commit the `reach` branch.** Until then the arm
should not be cited, and the "not a probe artefact" conclusion has no control behind it — while
§4B.3's kill census, the TL's own latency table and the blind arm's 4 → 4 all point the other
way.

### 4B.7 The arcade distribution: ATTEMPTED, AND NOT OBTAINABLE FROM THIS FOOTAGE

Not "I ran out of time" — I finished the attempt and it has a number.

The slice that matters is the one the lock window occupies. Our in-window enemies span
**0.87-3.66 %W** (p5-max, median 1.63), which on the 1028-wide longplay is **9-38 px** and on
the native 320-wide hardware is **3-12 px**. `judging/R11/arc_enemy_x.py crops` proposes
candidates in exactly that band and renders each at 5x with its x in %W printed on it, for a hand
pass — the method `spawner.js`'s VERTICAL column was acquired by.

Over four HUD-verified stage-1 frames it returns **128 candidates of which I could identify at
most 6 as aircraft. Precision ≤ 5 %.** The rest are **sea-foam wave crests**, cloud fragments,
explosion edges and HUD. Stage 1's sea is dense white-capped crest at exactly the near-neutral,
mid-bright signature of a distant grey aircraft, and at 9-38 px there is no size or shape cue
left. The sheet is `tools/out/spawner-r11/ARC-crops-A.png` — I cropped it and looked, which is
how this was decided and not by a threshold.

**A hand count does not rescue it, and that is the part worth stating.** The vertical column
worked because it reads LARGE, unambiguous aircraft; the arcade's large enemies are perfectly
readable here too (`ARC-crosser-approach.png`). The failure is specific to the far-field slice —
and that is exactly the slice the lock window sits in. **No reader, operator or human, can tell a
3-12 native-px aircraft from foam.**

So: **the arcade's lateral distribution at the size band that governs engageability is not
measurable from this footage**, the detector is WITHDRAWN with its precision published, and the
file is kept rather than deleted so the next attempt starts from a known dead end. The one lever
I can name for a future try is a frame SELECTION rather than a better mask: a stage over flat
ground with no foam (stage 2's desert) removes the confounder entirely, at the cost of being a
different stage from the one this spawner is tuned against.

**The engageable-fraction bound in §4B.2 is what is published in its place**, which is the
deliverable the TL named, and it is an upper bound.

### 4B.8 The arcade grounding that IS here

Two things, both narrow and both decidable: the
60 Hz crosser sequence at GAME_SPEC's own citation, and the arithmetic that the arcade's measured
±9.85 %W rail plus the shipped 8.3 %W cone gives **the same ±18.2 %W engageable band we now have**.
**The engageable-fraction bound in §4B.2 is the deliverable the charter asked for in place of a
column, and it is an upper bound: the player is given its best position at every instant, with no
travel time, no reaction and no competing target.**

---

## 5. R10 gap 10, closed

`tools/fx-probe.html`/`.mjs` did not enumerate the `kill` smoke textures, so the one composited
element that is on screen after **every** kill was the one the palette gate never audited — and
the lane that shipped it had to verify from captured pixels instead. The accessor had been
exported for it and never wired up. Four lines, in `tools/`, which the R10 judge listed as owned
by nobody. The probe now covers 36 canvases and reports `killSmoke[p0..p2]` at 4 colours, 0
partial alpha, 0 off-palette, 0 off-ladder.

---

## 6. THE CRITERION — **ARRANGEMENT**, its controls, and what it cannot see

`judging/R11/fx_r11.py --selftest`, **39/39**, 10 arms. Published here rather than in
REFERENCE.md because the criteria lane owns the documents; this is the operator, its controls
and its arcade column, ready to be lifted.

### Controls, and what each one proves

1. **closed-form shapes.** Filled disc -> `fill` 0.984, `spread` 0.7071 (exact). Annulus at
   a = 0.8R -> 0.355 / 1.507 against a derivation of 0.36 / 1.5092. An 8-disc spray ->
   0.0915 / 3.095 against a hand-derived **0.0919 / 3.104**. *My first expectation for the
   spray was wrong (0.116) and the operator was right: the convex hull of a set of discs is
   not the polygon through their centres, it bulges by r. The derivation in the file is the
   corrected one.*
2. **THE DISCRIMINATION, which is the arm that matters.** The 8-disc spray against a disc of the
   SAME AREA to within 0.1 %: `area` cannot tell them apart, `fill` separates them 0.091 vs
   0.971 and `spread` 3.095 vs 0.707. A criterion that cannot do this cannot see this round's
   defect, and the area-vs-time family provably cannot.
3. **scale invariance at both capture scales** — the same synthetic at 3.00x (ours) and 3.2125x
   (the arcade's) agrees to 0.001 on `fill` and 0.005 on `spread`. This is the licence for
   comparing the two sides without scale matching, and it is why these statistics were chosen.
4. **hull area on a known polygon** (a 20x30 rect = 600 exactly; a single pixel = 1).
5. **components cross-validated** against the mask's own pixel count over 24 random masks at
   densities 0.05-0.5, plus the diagonal chain that pins 8- against 4-connectivity (R9 ledger
   row 38's case).
6. **the judge's three colour classes on prescribed colours**, with the mask forced so the
   classes are tested apart from the mask.
7. **the mask asymmetry as a control result rather than as prose** (§1.5): four assertions
   pinning that the judge's mask rejects our core, accepts the arcade's, and that the repaired
   one accepts both and still rejects sky and sea — and ACCEPTS WHITE, so it may only be used
   with the persistence exclusion active.
8. **the persistence exclusion, non-vacuously**: a static HUD bar and a static nozzle painted
   into 60 frames leave nothing, AND the test asserts that the material mask *does* accept the
   nozzle and that `r9` does *not* accept the HUD, so it cannot pass by being blind.
9. **the attribution horizon, both conditions, fully prescribed**: a decaying event with a decoy
   that out-grows it at a known lag and a drifting clutter blob of known size. Jump fires at the
   prescribed lag 6, the size floor at 16, the earlier wins. *The arm failed three of its own
   assertions twice before passing and the detector was right both times — I mis-derived the
   peak frame, then made the decoy persistent enough for the exclusion to remove it.*

### WHAT THIS CRITERION CANNOT SEE

1. **THE R10 ATTRIBUTION HORIZON CANNOT LICENSE A BREAK-UP MEASUREMENT, and that is structural
   rather than a tuning problem.** The horizon fires when a largest-component selection's
   centroid jumps. **A genuinely fragmenting event trips it BY FRAGMENTING** — on arcade event D
   it fires at lag 0, the exact frame the mass breaks. It is computed and published on every
   figure here because a long one is informative and withholding an unfavourable reading would
   be dishonest, but it is **not** the gate. The gate is the ROI's own clutter floor measured
   before first light in the same capture, and a crop at every published lag.
2. **`ncomp` IS NOT DIMENSIONLESS.** It rises with resolution and with how finely a sprite is
   authored. Ours is authored on a 96-texel canvas against the arcade's ~62-125 native px, so
   the two are comparable to within about a factor of 1.5 and no further. Direction only.
3. **AN ANNULUS AND A BURST READ THE SAME.** `spread` is 1.51 for a ring, squarely inside the
   band this round tuned into. The fix is in the art (per-ray length jitter, so the tips do not
   lie on a circle) and the test is the crop, not the statistic. **This is the
   statistics-cannot-replace-artwork class and it bit twice in this file**: a three-fleck ray
   with a linear radius law measured `fill` 0.23 / `spread` 1.03 / `ncomp` 31 — every one inside
   the arcade band — and drew **confetti**. And a colour ramp applied inner-to-outer instead of
   outer-to-inner drew a **dark-red centre inside a gold halo**, the arcade's ramp exactly
   inverted, while not moving a single shape statistic.
4. **THE IN-SITU ROI IS UNLICENSED ON OUR SIDE.** Our explosion is drawn on the player's own jet
   and its two orange nozzle discs; the clutter floor is 8.0-8.3 % of the ROI against a 26-32 %
   peak. The authored canvas is the licensed reading and the in-situ one is direction only.
5. **IT SAYS NOTHING ABOUT COLOUR OR ABOUT TIME.** It is additional to the palette, the envelope
   and the silhouette gates, not a replacement. The reason it is worth adding is that those
   gates scored a recoloured disc as a pass for ten rounds.

### The arcade column, ready to lift

| effect | arcade | source |
|---|---|---|
| kill fireball, compact phase, `fill` | **0.20-0.60** | 2 stage-1 kills, 60 Hz consecutive, digit-verified, licensed lags |
| kill fireball, compact phase, `spread` | **0.805-1.036** | same |
| kill fireball, **burst** phase, `fill` | **0.08-0.26** | same |
| kill fireball, **burst** phase, `spread` | **0.95-1.37** | same |
| kill fireball, `ncomp` compact -> burst | **6-20 -> 25-88** | same; resolution-dependent, direction only |
| white-hot fraction, peak lag | **+100 to +133 ms**, 0.11-0.41 | judge-R10 §1.4, 4 kills |
| post-kill residue, colour | **mean RGB (230, 114, 33), V 0.902, S 0.853**, modal `#f88f41` | 1 isolated kill over open sky, 5 frames, n = 86 226 px, whole chain on screen |
| post-kill residue, shape | **round ball**, aspect h/w 0.93-0.95, area/bbox 0.77-0.78, **14.2-16.3 %W** | same, 2 frames |
| post-kill residue, persistence | **≥1.1 s and still orange** | tracked to t = 103.5 |
| enemy train, emission spacing | **≤0.020 s** (corrected; §3.3) | arithmetic on R10's own two measurements |
| enemy round, flight time | **≥0.184 s** (corrected) | same |
| **RETIRED**: post-kill residue `#f4c8b3` / (236, 188, 162) | a different object | §2.1 |

---

## 7. What I could not close

1. **Whether the envelope should actually be closed.** The constants are solved and measured
   (§3.4); the decision needs a pilot that can react to a telegraph, and that pilot is the flow
   lane's file. **Ranked above the change itself**, and it has grown a second reason: the
   combat lane's latency table shows a lateral result whose SIGN reverses between 0 ms and
   300 ms, so every arm in §3.2 is a reading of a pilot that is not a model of a player (§3.2's
   closing note). The same probe would serve both questions.
1b. **The arcade's lateral enemy distribution at far-field size.** Attempted and withdrawn with
   its precision published (§4B.6): not obtainable from this footage, because at 3-12 native px
   an aircraft is indistinguishable from stage 1's sea foam. The named retry is a frame
   selection, not a better mask.
2. **The residue's colour past ~0.6 s.** The blob drifts over the island and `m_material`
   accepts 19 % of island terrain. The ageing phases dim it and deliberately do not pale it.
3. **The residue's blue channel.** Ladder-snapped to 16 where the frames read 30-37.
4. **`life10` and `r100` as cross-side statistics.** Withdrawn, more firmly than R10 withdrew
   them: with the residue at its measured colour the `r9` mask cannot separate fireball from
   residue on **either** side (§1.7).
5. **Our phase 0 is still the most disc-like thing in the sequence** — `fill` 0.586-0.654,
   `spread` 0.733, `ncomp` 1, against the arcade's compact-phase 0.20-0.60 / 0.805-1.036 /
   6-20. Our `fill` sits at the top of the arcade's band and our `spread` **below the bottom of
   it**. This is R10 open item 7 ("the arcade's starburst is much finer than ours") now
   quantified for the first time. I left phase 0 alone: it is the drawing that four rounds of
   palette, bright-fraction and core-fraction work are calibrated against, and changing it on
   the same day as the break-up would make neither result readable. **Ranked as the next
   explosion gap.**
6. **Our phase 1 measures `yellow` 0.42-0.43 against the arcade's 0.05-0.34** at the same lag.
   Cut from 0.70 by dropping `E_YELLOW` from the fleck ladder (the judge's YELLOW class is
   `G/R > 0.62`, which `E_AMBER` at 0.686 and `E_GOLD` at 0.741 are both inside, so three of
   five steps were landing in one class). Still above the arcade. Not pushed further because the
   judge's §1.4 explicitly refuted the claim that our fireball should be redder, and I am not
   tuning against a finding I agree with on the strength of one more lag.
7. **The debris chunks are untouched.** 5-8 of them, 4x4 texels, 3.8 native px — inside the
   arcade's fleck size range. The break-up now carries the spray that they were the only source
   of, so their contribution is smaller than it was; whether they should be more numerous or
   faster is an open question I did not measure.

---

## 8. Evidence index — everything under `tools/out/effects-r11/`

| path | what |
|---|---|
| `arc99/` | **240 consecutive 60 Hz arcade frames**, `-ss 99.0`, stage digit 1 |
| `arc985/`, `arc1029/` | 70 and 90 consecutive frames, `-ss 98.5` and `-ss 102.9` |
| `STAGE-DIGIT-arc99.png` | the HUD digit on f0001 and f0120 |
| **`ARC-residue-origin.png`** | **the whole chain on one isolated kill: fireball -> starburst of separated flecks -> orange ball** |
| `ARC-eventD-strip.png`, `ARC-eventA-strip.png` | two more kills, 60 Hz, 2-frame steps |
| `ARC-eventD-marks.png`, `ARC-eventF-marks3.png` | the measured mask over the ROI at every published lag |
| `ARC-eventF-marks.png` | **the run where the ROI landed on the island** — published as the failure it is |
| `ARC-residue-marks.png` | the residue mask on three events, cropped |
| `ARC-residue-age.png` | the residue tracked to ~1.1 s: still orange |
| `R10-opensea-mpeach-marks.png`, `R10-opensea-frame.png` | **R10's figure reproduced to the digit, and what its mask had selected** |
| `ARC-column-origin.png` | the cloud bank arriving across R10's "no cloud anywhere" window |
| **`SCALEMATCHED-arcade-vs-R11.png`** | arcade vs ours, each panel 1.2x its OWN fireball width, **crop fractions and their ratio burned into the image** |
| **`OURS-before-after-FINAL.png`** | ours at `5e3d57e` against the working tree, same tick, same seed, matched crop |
| `OURS-tex-*-sheet.png` | the authored burst canvases at each iteration, including the two that measured fine and drew badly |
| `tex-base/`, `tex-shipped/`, `tex-r11f/` | the authored canvases; `tex-r11f` vs `tex-shipped` md5-identical |
| `ours-base-kill/`, `ours-FINAL-kill/` | 70 and 80 consecutive in-situ ticks, same URL, same seed, same warmup |
| `ours-base/`, `ours-r11i-harness/`, `ours-FINAL-harness/` | `?combatexpl=1&seed=1`, 120-160 consecutive ticks |
| `critA-final/` | the 8 frames Criterion A and `assert_population` were run on |
| `death-r11b/`, `DEATH-hole.png`, `death-quad.png` | 300 consecutive death ticks and the 0.200 s hole |
| `sweep/fp-*.json`, `fp-A-head.json` | the six fairness arms, raw |
| `OURS-FINAL-marks.png` | our own in-situ mask, cropped and looked at |

Generators and controls, all committed: `judging/R11/fx_r11.py` (39/39), `strip.py`,
`dump_burst.mjs`, `aim_sweep.py`, `aim_error_control.mjs`, `fairness_pool.py`,
`busy_control.mjs` (10/10). `tools/out/effects-r11/README-CONTAMINATED.txt` names the two
capture directories taken while my own sweep was mid-arm and must not be measured.

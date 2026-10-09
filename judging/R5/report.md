# Judge Round 5 — three.js After Burner rebuild vs arcade AB2

**Date**: 2026-10-06
**Build judged**: clean checkout at **`53ce86b1e1e1bd0f05cc8d1f5a277122c713bc31`**
("R5: nine criteria retired or repaired, and the one defect class behind them").

**`git status --short` was EMPTY at the start of this gate.** At the end it showed only
*untracked* files under `judging/R5/` written by the two concurrent critics
(`art-critique.md`, `feel-critique.md` and their PNGs). `git log -1` was unchanged throughout
and **no tracked file was modified at any point**, so every figure below describes the
committed state of `53ce86b`. I did not modify any file under `src/` or `tools/`. I did not
commit.

**Independence note.** I did not read `art-critique.md` or `feel-critique.md`. Three of their
findings were relayed to me by the team lead after I had finished measuring; I re-ran those
against my own instruments rather than adopting them, and the results are in
"Cross-checks against the other two reviewers" below. Everything else here is mine.

**Yardstick**: "Would a player mistake this for After Burner II?"

---

## Verdict

**FAIL as a fidelity gate — overall 7.5/10** (R1: 3, R2: 4, R3: 6, R4: 7).

This round closed more real defects than any before it, and I verified them myself rather
than taking the lanes' word. Six of R4's named gaps are genuinely closed: the enemy sprite
(daylight), the player jet, the emblems, the missile trail, the explosion core, and the cloud
banks. The criteria-repair work is the best thing this project has produced — I re-ran it and
it holds.

It only moves half a point, and that is not grudging. It is because I went looking for what
nobody had checked and found **a documented, published, gate-level criterion that the build
fails by two orders of magnitude, that appears in no gap list and that no R5 lane touched** —
and because two of this round's wins turn out not to reach a third of the shipped stages.

### On "very bad" versus 7/10 — I believe the owner, and I can now name the mechanism

Both readings are correct and not in tension, because **every criterion the score is built
from measures composition, geometry and palette, and none of them measures the thing a player
actually looks at: the texture of the pixels.**

REFERENCE.md already contains the two criteria that do — **Criterion A (colour cardinality)**
and **Criterion B (adjacent-pixel identity)**, both stated as GATES. They are cited in no gap
list, in no `ask-*.md`, and in none of the six R5 lane reports.

| | unique colours | distinct channel values | ground H-identity | ground V-identity |
|---|---|---|---|---|
| **GATE** | ≤256 | ≤32 | ≥50% | ≥50% |
| arcade `ab2-arcade-desert.png` (native) | **138** | **31** | **68.7%** | **68.5%** |
| arcade `ab2-arcade-night-banking.png` (native) | **79** | **17** | **84.0%** | **80.2%** |
| **ours, stage-1 flight** (median of 8 frames) | **14 344** | **238** | **28.3%** | **3.3%** |
| **ours, stage-1 combat** (median of 8 frames) | **13 908** | **236** | **24.3%** | **22.5%** |
| ours, stage 2 | 374 | 118 | 66.5% | 49.6% |
| ours, stage 3 | 989 | 245 | 64.6% | 48.0% |

`cmp-01-dither-ours-TOP-arcade-BOTTOM.png` is the single most important image in this report:
our stage-1 sea and the arcade's ground at the same crop size and the same 8× nearest
upscale. Ours is **2 348 colours** of continuously-varying blue in an 80×40 crop — every row
a slightly different shade from the row above, which is exactly what a V-identity of 3.3%
means. The arcade's is **35 colours** in flat, chunky, deliberately dithered blocks with
readable rock and foliage shapes.

**That is the "very bad".** It is not a palette error — the sky is `#009fff` exact and the
explosion ladder lands on the arcade's own colours. It is that we render *continuous-tone
noise* where the arcade renders *structured pixel art*, and no statistic in the scorecard sees
it because horizon height, jet span, centroid, saturation and emblem width are all invariant
to it.

**Useful scoping result: this is a stage-1 problem, not a renderer problem.** Stages 2 and 3
already very nearly pass (374 and 989 colours; 66.5/49.6 and 64.6/48.0) — the palette-snapping
work done on them in R5 worked. Stage 1's sea shader is the outlier, and it is the stage every
judge, every screenshot and every new player sees first.

---

## Instrument controls — run before anything was pointed at the build

Every operator was reimplemented from REFERENCE.md prose in my own scripts, never by invoking
the lanes' tooling, and each was validated on a known input first.

| control | published | my re-run | result |
|---|---|---|---|
| colour cardinality, arcade desert | 138 / 31 / 31 | **138 / 31 / 31** | exact |
| colour cardinality, arcade night | 79 / 17 / 8 | **79 / 17 / 8** | exact |
| Criterion B, arcade desert whole frame −HUD | 68.8 / 68.5 | **68.7 / 68.5** | exact |
| Criterion B, arcade night whole frame −HUD | 84.0 / 80.3 | **84.0 / 80.2** | exact |
| JET-SIL t175: blades / extent / nozzle / cant / aspect | 99–100% / 35.4–35.7 / 30.1 / 1.29 / 3.24 | **99% / 35.7 / 30.1 / 1.29 / 3.24** | exact |
| JET-SIL t168: same five | 100% / 35.4 / 30.1 / 1.23 / 3.30 | **100% / 35.4 / 30.1 / 1.21 / 3.30** | exact (cant −0.02) |
| arcade SCORE emblem red extent, t116 | 16.91 %W | **16.91 %W** | exact |
| 3× capture decimation lossless | max deviation 0 | **max deviation 0** | confirmed |
| black/duplicate sweep, synthetic control | 1 black, 1 dup, 1 near-dup | 1 black, 1 dup, near-dup not flagged | PASS |
| `tools/hud_mask.py --selftest` | — | synthetic PASS, live PASS (1260 px) | PASS |

**Every capture set I took was swept for black frames and for duplicates. All sets: 0 black,
0 duplicates.** No capture reported a page error. I found no third corruption cause.

### Three instruments I built, controlled, and threw away

1. **A "fireball fraction" arcade death detector.** Returned 40 frames at 86–98% fireball.
   Cropping and looking showed every one was **stage 2's flat orange sky**.
2. **A HUD ink-contrast operator** keyed on colour predicates over the whole bottom strip.
   Reported our stage 2 passing at 3.98:1 on 10 636 "red ink" pixels. The word STAGE is about
   1 000 pixels. The mask was selecting **tan terrain**.
3. **A warm-only FIRE-MASK** (`R > B + 0.10`), which **excludes the white-hot core by
   construction** — `#f6f6e7` has R−B = 0.059 and fails the test. REFERENCE.md documents this
   exact failure ("warm only … deletes 82% of the core"). I had rediscovered a known-bad
   operator.

All three are the fifth defect class — *a validated operator pointed at the wrong population*
— occurring in the judge's own work within an hour of reading the section that names it.
**The class is not a lane-competence problem; it is the default outcome of pointing a colour
predicate at a scene.**

---

## Each R5 claim: CONFIRMED / REFUTED / UNVERIFIABLE

### 1. "The daylight player jet now passes all four silhouette discriminators at in-game span" — **CONFIRMED**

Operator JET-SIL, reimplemented from prose, controls exact on both arcade frames. Our jet
isolated by a jet-on/jet-off difference capture at tick 600
(`?fixed=1&seed=1&nocombat=1&noclouds=1&invincible=1`), span **339 px**, above JET-SIL's own
~250 px resolvability floor.

| statistic | target | arcade t175 | **ours** |
|---|---|---|---|
| fin rows with two separated blades | ≥90% | 99% | **100%** |
| fin-pair lateral extent, % SPAN | 30–40% | 35.7% | **37.2%** |
| nozzle-centre separation, % SPAN | 25–35% | 30.1% | **31.0%** |
| blade cant | ≥1.15 | 1.29 | **1.22** |
| aspect SPAN/H (sanity) | 3.0–3.6 | 3.24 | **3.23** |
| span %W (sanity) | 34–38 | — | **35.94** |

The **canopy** also passes its published bound: 0.0167% of frame against a ≤0.035% ceiling,
4×3 px at native.

**But the crop still outranks the numbers, and R5's own carried-forward note is correct.**
`cmp-02-jet-ours-TOP-arcade-BOTTOM.png`: ours reads as flat horizontal planks with
near-vertical blades; the arcade's wings sweep *down* and outward with strong anhedral and
taper to points, and its fins rise from distinctly rounded nacelle bodies with fuselage
visible between them.

### 2. "Cloud banks retargeted: width median 7.19 → 18.12 %W, height 5.36 → 20.54 %H" — **CONFIRMED in direction; my number is higher than theirs and above the accept band**

Aligned #132 operator, my own implementation, 40 frames
(`?fixed=1&seed=1&nocombat=1&hidejet=1&invincible=1`, `--every 37` — incommensurate with the
960-tick cycle), HUD mask derived per run via `hud_mask.py`, min component 0.0456% of frame.

| | **mine** | R5's claim | accept band (REFERENCE) |
|---|---|---|---|
| width %W median | **25.94** | 18.12 | 14–24 |
| width %W p90 | **43.12** | 37.22 | 25–40 |
| height %H median (untruncated) | **22.32** | 20.54 | 16–28 |
| presence | **65.0%** | 70.0 | not a gate |

I cropped and looked at the detections (`evidence-ours-cloud-detections.png`): genuine
multi-lobed cumulus banks, no contamination. **R4 gap 7 is closed** — these are unmistakably
banks, not R4's 1–3 small puffs. But by my sampling the width median now sits **above** the
14–24 band, against an arcade cloud-only median of 20.41 %W. Mild overshoot, low priority.

### 3. "Stage 3's city lights were rendering behind the bottom HUD; now visible" — **CONFIRMED**

Capture at tick 4200, stage digit reads **3**. A dense multicoloured speckle field fills the
lower half of the frame and is clearly visible above, around and through the bottom HUD row.

### 4. "HUD emblems and throttle widget are pixel-exact against the arcade" — **CONFIRMED for width; "pixel-exact" is not a checkable claim for stage 1**

Red-pixel extent, the R4 operator, at each side's native stored resolution:

| emblem | **ours** (native 320×224) | **arcade t116** (my re-measure) | REFERENCE | R4's finding |
|---|---|---|---|---|
| SCORE | **16.88 %W** | **16.91 %W** | 16.91 | 20.31 (+20.1%) |
| HIT | **9.38 %W** | **9.33 %W** | 9.04 | 12.81 (+41.8%) |

Ours matches the arcade to **0.03 and 0.05 points**. R4's emblem defect is **fixed**.
`cmp-04-emblem-ours-TOP-arcade-BOTTOM.png` shows the shape matches too — swept trapezoidal
chevron wings, black-keylined letterforms, blue rule — closing R4's "striped rectangles, not
swept chevrons" complaint.

**Objection to the words "pixel-exact".** There is **no native 320×224 stage-1 frame in this
repo** (REFERENCE.md flags this itself), and 686/320 is not an integer, so a literal
pixel-identity claim against the stage-1 HUD **cannot be evaluated by anyone**, including the
lane that made it. "Matches the arcade's measured extent to 0.03 %W" is true and defensible;
"pixel-exact" is not falsifiable here and should not be published as a claim.

### 5. "`alphaTest: 0.5` recovered 239 176 px that the jet quad was punching out" — **MECHANISM CONFIRMED; the figure is UNVERIFIABLE without reverting the fix**

`alphaTest: 0.5` is present (`spriteFactory.js:37`, `:406`).
`evidence-alphatest-no-punchout.png` shows a cloud bank passing behind the jet rendering right
up to the silhouette edge **including through the gap between the two fins** — no rectangular
hole anywhere in the quad. The defect is really gone. The 239 176 figure is a counterfactual
against the unfixed material, which I cannot reproduce without editing `src/`. I neither
confirm nor dispute the number.

### 6. "Playable share of wall clock 35% → ~70–78%" — **CONFIRMED, floor slightly below their range**

Own per-tick probe, stepping one tick at a time inside the page so no sampling interval can
alias, 3 × 180 s on `?demo=1` seeds 4/5/6:

| seed | flight s | wall s | **playable** |
|---|---|---|---|
| 4 | 121.3 | 180.0 | **67.4%** |
| 5 | 124.0 | 180.0 | **68.9%** |
| 6 | 139.4 | 180.0 | **77.4%** |
| **pooled** | **384.7** | **540.0** | **71.2%** |

### 7. "Deaths/min 2.87 wall / 4.00 flight — honestly short of the ≤1.5 gate" — **CONFIRMED; the self-report is honest**

Same runs: **27 deaths over 540 s wall / 384.7 s flight = 3.00/min wall, 4.21/min flight**
(per seed 3.67/5.44, 3.33/4.84, 2.00/2.58). R5 reported 2.87/4.00 — within ~5% of mine and
*optimistic* by that margin rather than flattering itself. The lane reported a failing number
accurately.

---

## Audit of the retired criteria

I could independently re-check seven of the ten ledger rows. **I agree with every retirement
I was able to test**, and would go further in two cases.

### Row 4 — stage-1 cloud size, "correct operator, 90% non-cloud population" — **CONFIRMED, and I found a contaminant class nobody named**

I did not re-classify their crops. I re-extracted the arcade frames myself, reimplemented the
#132 operator from prose, ran it over **t = 93–120 at 1.0 s (28 frames)**, and cropped and
looked at **all 77 components** on five labelled contact sheets.

**My classification: 9 of 77 components are cloud banks (11.7%).** The world lane got 11 of 90
(12.2%) over a denser sample of the same span; criteria-fix got 12 of 120 over t = 88–120.
**Three independent classifications, three answers within half a point of each other. The
retirement is correct and the published #132 size figures are not cloud measurements.**

The published max **42.27 %W reproduces** in my run (t101, 42.3 %W). My crop of it shows a
white mass containing a red missile body, a dark airframe and an island — a merge. The two R5
lanes disagreed about whether it is "a missile plume" or "a bank merged with haze, an airframe
and debris"; **on my crop criteria-fix's reading is the better one**, and both reach the same
conclusion: it is not a defensible bank width.

**What nobody named: the single largest contaminant is the arcade's own SCORE emblem.**
**25 of my 77 components (32.5%)** are the SCORE emblem, at a **median width of 17.20 %W** and
a near-constant 498-pixel count at a fixed bbox across more than twenty consecutive frames of
flight. Its white chevron wings satisfy sat < 0.25 ∧ V > 0.80 exactly.
`evidence-arcade-cloud-population-sheet0.png` — eleven of sixteen crops on that one sheet are
HUD.

This happened because the published operator says "HUD excluded (**ours**: per-run via
`tools/hud_mask.py`)" and **never specifies an arcade-side HUD exclusion**. criteria-fix did
blank a hardcoded rect `(18,20,400,58)` on the arcade side — which is why their population has
no SCORE in it, and which is also the source of the "six HUD-severance artifacts" they report
as the mask's own scar. The world lane's run and mine did not. **The operator as published is
incomplete on the side it is a target for.**

**One thing the replacement table gets wrong.** REFERENCE.md's "cloud banks only" column lists
`width %W p90 / max` as **34.02 / 42.27**. `lane-criteria-fix.md` line 103 carries "42.27,
**flagged as merged**; largest clean bank **33.24**". The flag did not survive into
REFERENCE.md. A developer reading REFERENCE.md alone will take 42.27 as an achievable clean
bank maximum — the very number the round retired.

### Row 10 — HUD "≥3:1 luminance contrast vs local background" — **CONFIRMED; I recommend formal RETIREMENT**

Four ink classes × three stages, each ROI verified by cropping and looking first. "Local
background" is not an operator — it has two natural readings — so I measured both: the **ring**
(1–4 px annulus, where the arcade's own black keyline lives) and the **field** (6–12 px out,
the terrain).

| arcade element | stage 1 ring/field | stage 2 ring/field | stage 3 ring/field |
|---|---|---|---|
| SPEED label (red, on white plate) | 3.55 / **1.04** | **1.57 / 1.80** | **1.05** / 3.59 |
| **STAGE label (red, no plate)** | **2.11 / 1.06** | **2.12 / 1.89** | 4.37 / 4.38 |
| stage digit (cream, keylined) | 11.02 / 7.10 | 5.92 / 5.35 | 17.97 / 17.95 |
| missile stock (white, keylined) | 8.64 / 7.51 | 6.69 / 6.50 | 17.38 / 17.85 |

**The arcade fails ≥3:1 on its own red ink on stages 1 and 2 under both readings** — 5 of 12
element×stage pairs fail on the ring reading, 4 of 12 on the field reading. R5's "fails on 4 of
the arcade's own 5 ink classes" is **confirmed in substance** by an independent operator.

The mechanism: **relative luminance weights red at 0.2126**, so a saturated red glyph
physically cannot reach 3:1 against a mid-bright ground. AB2's HUD separates by **hue and a
black keyline**, not by luminance. The criterion imports a web accessibility metric into a
design that never used it.

**And it does not discriminate our build from the arcade:**

| element | ours s1 | arcade s1 | ours s2 | arcade s2 | ours s3 | arcade s3 |
|---|---|---|---|---|---|---|
| STAGE label (red) | 1.19 F | 2.11 F | 1.32 F | 2.12 F | 4.95 P | 4.37 P |
| stage digit (cream) | 8.09 P | 11.02 P | **5.64 P** | **5.92 P** | 18.69 P | 17.97 P |
| missile stock (white) | 7.61 P | 8.64 P | 4.13 P | 6.69 P | 19.46 P | 17.38 P |

**R4 gap 3's headline is no longer true.** "The cream stage digit is literally invisible over
stage 2's tan ground" — on `53ce86b` ours measures **5.64:1** against the arcade's **5.92:1**,
and `cmp-03-hudbottom-ours-TOP-arcade-BOTTOM.png` shows ours is if anything **more** legible
than the arcade's. The contrast half of gap 3 is **closed**.

### Row 7 — `?demo=1` canyon sd aliasing — **CONFIRMED, and worse than R5 said**

I probed `jetNdcX` **every tick** for 14 400 ticks (240 s) on `?demo=1&seed=1&invincible=1`,
recovered the regime phase empirically (offset 10 ticks, the alignment maximising the
cruise/canyon sd ratio at 6.98), and resampled one recorded signal at many intervals.

Ground truth, every tick: **cruise sd 12.83 %W** (arcade target 12.88 — excellent),
**canyon sd 1.84 %W**.

| sampling | canyon lateral sd |
|---|---|
| **every tick (truth)** | **1.84 %W** |
| intervals dividing 960 ticks = 16.000 s, 27 interval×phase configurations | **0.00 – 2.08 %W** |
| — of which read **exactly 0.00** | **13 of 27** |
| incommensurate: every 7 / 37 / 53 / 101 ticks | 1.86 / 1.90 / 1.51 / 2.80 %W |

**Thirteen of twenty-seven dividing configurations report that a signal with sd 1.84 %W has sd
zero** — clean, stable and reproducible at every repetition. Incommensurate sampling recovers
the truth (every-7-ticks, n = 642, reads 1.86, within 1%).

### Rows I agree with on re-check

- **Row 1, jet fin-region width bound (REPLACED).** Agree — JET-SIL reproduces the arcade's own
  t175/t168 on all five statistics, and the replacement discriminators separate the two
  aircraft where the old triple did not.
- **Row 2, missile-trail mean V 0.37 (REPLACED).** Agree; the build satisfies the replacement.
- **Row 3, explosion t357 percentiles (REPLACED).** Agree — the core is measurable only under
  the replacement operator.
- **Row 5, zero-cloud/HUD-overlap control (RETIRED).** Agree, and I reproduced the evidence
  independently: my contact sheets show genuine cumulus banks sitting behind the **HIT** emblem
  at t106 and t120 (`evidence-arcade-cloud-population-sheet4.png`).

### Rows I could not re-check

- **Row 6, sea anisotropy 6.51× → 4.95 vs 5.21.** Not re-measured. No opinion.
- **Row —, stage-2 open-plain target.** Not re-measured. No opinion.

**This section is complete for seven of ten rows and explicitly incomplete for two; the tenth
(row 8, deaths/min) is covered below under disagreements.**

### Where I disagree with R5

**Row 8, deaths/min — DEMOTED to a regression guard. I would partly reverse that.** R5 demoted
it because "the figure measures the pilot, not the game" and no arcade target existed. The
second half is no longer true — two independent measurements of the arcade now exist (mine and
the feel critic's, below). A pilot-dependent statistic *with a measured arcade anchor* is still
a usable loose gate, and lethality is something a player feels immediately.

**A criterion that was KEPT and should be DROPPED: I6's "brightest-decile saturation ≤0.30".**
It ranks the fire mask by V and takes the top decile. The arcade's fireball tops out at its
white core, so the statistic works there. **Our palette contains saturated yellows above the
core in V** — `#ffba04` (V 1.000, S 0.984) and `#f9f647` (V 0.976, S 0.715) both outrank the
core `#f6f6e7` (V 0.965) — so it reads **0.952** on a fireball whose core is exactly the
arcade's published core colour. A false negative by construction. I6's **core fraction
(S<0.25 ∧ V>0.94)** is the robust statistic; use it alone.

**Two criteria that were kept, are correct, and are being ignored: Criterion A and Criterion
B.** The most discriminating criteria in REFERENCE.md and the only ones that see the defect the
owner reacted to. They belong at the top of the gap list.

**A TENTH defective criterion, not in the ledger: R4's player-airframe value ceiling of V 0.77.**
See "Cross-checks" below — it is **inverted**, exactly like ledger row 1.

---

## What nobody had looked at

### 1. The procedural fallback sprite path RENDERS IN NORMAL PLAY — on every stage-3 enemy

The sprite lane reported this path as not exercisable without inducing a decode failure, and
therefore left it unverified. **That is wrong, and it is a significant finding.** The path is
not reached by a decode failure; it is reached by the dispatch gate itself.
`src/entities/enemySprite.js:418`:

```js
export function enemyTexture(aspect, livery = 'grey', detail = true, night = false, bankDeg = 0) {
  if (detail && !night) {
    const cellTex = sheetCellTexture(livery, aspect, nearestBankIndex(bankDeg));
    if (cellTex) return cellTex;
  }
  // ... every other combination draws procedurally
```

`SHEET_URLS` (same file, ~line 341) holds **8 entries, all day-palette**: four liveries ×
{headOn, rear}. There is **no night sheet and no far-LOD sheet**. Therefore:

- **every enemy on stage 3 (`night === true`) draws the procedural art**, and
- **every far-LOD enemy on every stage (`detail === false`) draws the procedural art.**

The R5 enemy redraw — the fix for R4's headline gap 1, "a slab with a bullseye" — covers near,
daylight enemies only.

**Confirmed on pixels, in normal play, with no decode failure induced.**
`evidence-stage3-enemy-procedural-fallback.png` is captured at tick 4200 of an ordinary
`?fixed=1&seed=1&invincible=1&noclouds=1` run with the stage digit reading **3**: a large
enemy at **31.9 %W** rendered as flat, banded, featureless slabs. Beside it, the daylight
`?combatsolo=1` capture shows the redrawn sprite — nose spike, swept tapered wings, grey
highlights, no bullseye. They are not the same aircraft.

There is also a **latent determinism hazard** nobody has flagged: the sheets load
asynchronously via `THREE.ImageLoader` at module scope with a silent
`() => { /* decode failure: stay absent, procedural fallback holds */ }` handler. A capture
that steps before the images decode renders procedural art with **no error and no warning** —
and a decode failure in production is invisible for the same reason. That silent handler is
also the most likely reason the wrong colour survived a full round unnoticed.

### 2. The arcade's own death rate — measured independently, and it agrees with the feel critic

`.reference-cache/video/ab2-gameplay.mp4`, 866.5 s. My first detector (fireball fraction)
failed its crop-and-look check. I replaced it with a **normalised cross-correlation template
match on the "READY" respawn card**, templated from the known death at t = 202
(`reference/respawn-ready-gp-t207.png` is the same event), searched over ±2/±3 px offsets, on
frames sampled at 2 fps.

24 candidates above threshold 0.55. **I looked at every one**
(`evidence-arcade-deaths-ready-cards.png`): 23 genuine READY cards, 1 false positive (the title
screen's "II" logo). Sweeping the threshold down to 0.40 surfaced 36 more candidates, which I
also looked at; **3 of those are genuine** cards the higher threshold missed.

**My count: 26 deaths. Gameplay spans roughly t = 50 → 866 s = 816 s = 13.6 min → 1.91
deaths/min wall clock.**

**The feel critic measured 27 deaths over 793.8 s = 2.04/min**, cross-validated by 9 continue
screens partitioning the run into nine groups of exactly three lives.

**The two agree, and I defer to 27.** My 26 and their 27 differ by one card — and their
cross-validation is structurally stronger than my threshold sweep: 9 continues × 3 lives = 27
is an exact integer partition that cannot be off by one, whereas my method's known failure mode
is precisely a missed card below threshold (I had already recovered three that way and plainly
could have missed a fourth). Our denominators differ a little because we bounded "gameplay"
differently (816 s vs 793.8 s), which is the smaller part of the gap.

**Take the arcade's rate as ~1.9–2.0 deaths/min wall clock, by two independent methods on the
same recording.** After five rounds of guessing at this number, that is the most solid
arcade-side figure this round produced, and neither of us had to trust the other to get it.

| | deaths/min, wall clock | playable share |
|---|---|---|
| **arcade (`ab2-gameplay.mp4`), two methods** | **1.91 (mine) / 2.04 (feel)** | **~79%** (26 × ~6.5 s cycle, mine) |
| **ours, `53ce86b`, 3 seeds × 180 s** | **3.00** | **71.2%** |

We are **roughly 50% more lethal than the arcade on the same denominator** — not the 2–3× the
project has assumed — and our death cycle costs about 8 points more playable time.

Caveat, stated plainly: this arcade run progresses through stages 3–15 with resupply and rising
difficulty, where ours loops stages 1–3. Indicative, not matched.

---

## Cross-checks against the other two reviewers

I re-ran each relayed finding on my own instruments. **I did not adopt any of them.**

### Art critic: stage-1 sea at 8 055 colours and 0.0% vertical adjacency in a 280×48 native patch — **CONFIRMED, independently**

On the same region spec (a 280×48 native near-field sea patch), my measurement:

| patch (native rows) | unique colours | H-identity | V-identity |
|---|---|---|---|
| rows 150–198 | **8 757** | 18.1% | **0.0%** |
| rows 160–208 | 8 971 | 12.9% | 3.8% |
| rows 170–218 | 8 426 | 16.8% | 5.8% |

**8 757 against their 8 055 (within 9%), and V-identity 0.0% exactly.** Two instruments built
independently from the same document agree. This also reconciles my own headline V-identity of
**3.3%** with their 0.0%: mine is over the *full* ground band below the fitted horizon minus the
HUD mask, which includes flatter far-field rows; theirs is a near-field patch. **Same defect,
two regions, no contradiction.**

### Art critic: `ground.js`'s sea was never rebuilt this round — **CONFIRMED**

`git log 3c5d4d2..53ce86b -- src/render/ground.js` returns exactly two commits: `08160cd`
"R5 gap 6: real terrain structure **for stages 2 and 3**" and `0eee8e9` "cloud banks retargeted
… stage 3 lights made visible". The file was touched; **stage 1's sea was not the target of
either.** That is independently consistent with my Criterion A/B split, where stages 2 and 3
nearly pass and stage 1 fails by two orders of magnitude.

### Art critic: R4's player-airframe value ceiling of V 0.77 is inverted — **CONFIRMED, and this is a tenth defective criterion**

My own measurement, our airframe isolated by jet-on/jet-off difference, achromatic pixels only
(S < 0.25, excluding the afterburner and canopy):

| | V median | V p90 | **V max** |
|---|---|---|---|
| **ours, daylight airframe** | 0.643 | 0.773 | **0.773** (`#c5c5ad`) |
| **arcade stage-1 daylight jet**, `ab2-arcade-desert.png` x[85,182] y[82,140], achromatic px | **0.839** | **1.000** | **1.000** |
| same crop, all pixels | 0.902 | 0.969 | 1.000 |

**The arcade's own jet is brighter at its median (0.839) than our jet is at its absolute
maximum (0.773).** A ceiling of V ≤ 0.77 caps us below the reference aircraft's median — the
same shape of error as ledger row 1, where a fin bound failed the real aircraft while our wrong
one passed. The art critic's quoted arcade range of 0.776–0.922 brackets both of my readings.
**Add this to the ledger as row 11 and remove the ceiling.** I did not independently re-check
their second claim (the near-black enemy dominant derived from an orange-sky stage-2 frame),
and express no opinion on it.

### Feel critic: retire R4's ≤1.5 deaths/min gate outright — **I AGREE the ≤1.5 must go, and DISAGREE with retiring it outright**

Our arcade measurements agree (1.91 and 2.04), so we agree completely that **≤1.5 is
unsatisfiable by the arcade itself** and must be struck. Where I differ is on what replaces it.
Retiring the gate outright leaves lethality with no gate at all at the moment the project has,
for the first time, *acquired* an arcade anchor by two independent methods. A statistic that
measures the pilot is still bounded when you have measured a pilot. **Keep a gate at ≤2.0
deaths/min wall clock**, labelled as the loose, pilot-dependent bound it is, rather than
deleting the only lethality criterion on the board. Ours is 3.00 and would fail it; that is the
point.

---

## Build-side verifications R5 listed as "owed"

**R4 gap 4, missile trail black — CLOSED.** `?demo=2&noclouds=1`, achromatic mask
(sat ≤ 0.25 ∧ V ≥ 0.6), largest 8-connected component, restricted well above the horizon so sea
foam cannot enter, jet quad and HUD bands excluded, mask verified by cropping and looking:
**mean V 0.941, mean saturation 0.000**, plume width ~44 %W. I5 target for stage-1 day:
V ≥ 0.90, sat ≤ 0.10, billow ≥ 25 %W sustained — **passes all three**. (My first attempt under
`?combattrail=1` read 0.859/0.164; cropping showed that mode fires missiles only on input, so a
`?fixed=1` capture with no input contains **no trail at all** — I was measuring the grey player
jet and the horizon haze band.)

**R4 gap 11, explosions have no white-hot core — CLOSED.** The core is present and is **exactly
`#f6f6e7`** (V 0.965, S 0.061 — the arcade's published core colour), the second most common
colour in the explosion crop after the sky. Published two-clause FIRE-MASK, one instrument on
both sides, native scale:

| | mean V | V>0.95 | core (S<0.25 ∧ V>0.94) | mean S |
|---|---|---|---|---|
| arcade `ab2-arcade-huge-explosion.jpg` | 0.899 | 53.1% | 17.2% | 0.764 |
| ours, median of 11 `?combatexpl=1` frames | 0.884 | 55.3% | **34.6%** | 0.627 |

**Caveat, honestly stated: my arcade core reading of 17.2% does not reconcile with
REFERENCE.md's published 9.2%**, nor my mean S (0.764) with its 0.846. I could not resolve the
2× difference, so I do **not** publish my absolute core figures as authoritative. The
like-for-like comparison with one instrument on both sides is what I stand behind: ours carries
**more** white core than the arcade's reference blast, not less. The residual is the opposite of
R4's defect — ours is slightly **under**-saturated overall.

**R4 gap 10, stage index wraps while the HUD digit counts on — CLOSED.** At tick 8300 the
internal `stageIndex` is 4; the HUD digit reads **2** and the palette is stage 2's. Digit and
palette now agree. (The 23-stage structure is still absent — a different gap.)

**R4 gap 8, title typography — substantially closed.** `cmp-05-title-ours-TOP-arcade-BOTTOM.png`.
Layout, colour assignment (blue A, red B, white body), the sphere-textured "II" and
**"INSERT COIN!" in red** (R4: ours was cyan) all land. Residual: the arcade's letterforms are
italic with angular cuts and a bevelled 3D edge; ours are upright and flat. No attract-mode
gameplay demo cycle.

---

## Scorecard

| # | Dimension | R3 | R4 | **R5** | Evidence |
|---|---|---|---|---|---|
| 1 | Composition & camera | 7 | 7 | **7.5** | Horizon 62.1 %H (row 139, overlay-verified), span 35.94 %W, cruise lateral sd 12.83 %W vs the arcade's 12.88. Costed: single-file diagonal enemy queue; no landmass, island or carrier. |
| 2 | Palette & sky/ground | 7 | 7 | **6** | **Down.** Explosion core exact (`#f6f6e7`); trail white (V 0.941, sat 0.000); stage-2/3 palettes snapped to 374/989 colours. But Criteria A and B fail on stage 1 by two orders of magnitude (14 344 colours, V-identity 3.3% whole-band / 0.0% near-field, vs the arcade's 138 and 68.5%) and nobody is working on it. |
| 3 | Motion & sense of speed | 7 | 7 | **7** | No speed claim from sub-60 Hz stills. Nothing in R5 targeted it. Carried. |
| 4 | Player envelope & controls | 7 | 7 | **7.5** | All four discriminators and both sanity bounds pass; canopy inside its bound. Costed: the crop reads flatter than the arcade; **the airframe is capped below the arcade's median brightness by an inverted criterion**; no throttle control; no barrel roll (art built, unwired). |
| 5 | Gameplay systems | 5 | 7 | **7.5** | Playable share 35% → **71.2%**, verified per-tick. Deaths/min 3.00 wall against the arcade's twice-measured **1.9–2.0**. Costed: 3 stages looping against 23; no resupply; **every stage-3 enemy renders the procedural fallback**. |
| 6 | Arcade presentation | 5 | 7 | **8** | Emblems match the arcade to 0.03–0.05 %W (was +20.1/+41.8%); shape, keylines and chevrons land; title dimensional with red INSERT COIN; stage digit/palette agree; HUD contrast profile tracks the arcade on every ink class. Costed: title letterforms not italic/bevelled; no attract demo. |

---

## Ranked gaps for Round 6

Each checked against the arcade before being written.

### 1. Stage 1's sea is continuous-tone noise, not pixel art — Criteria A and B
The highest-value fix available and the only one that addresses "it's very bad" directly.
**Three reviewers independently measured this defect this round.** Stages 2 and 3 already
nearly pass and `ground.js`'s stage-1 sea was not touched in R5 — **this is a stage-1
sea-shader task, not a renderer rewrite.**
**Reproduction to satisfy**: on a representative stage-1 flight frame at true native 320×224 —
whole frame **≤256 unique RGB colours** and **≤32 distinct channel values** (union across
channels, how REFERENCE's 31/17 were taken); and on the ground band below a fitted horizon
minus the per-run `hud_mask.py` mask, **≥50% H-identity AND ≥50% V-identity**, *and* ≥50% V on
a 280×48 near-field patch so the far field cannot carry the average.
Arcade 138/31, 68.7/68.5. Ours 14 344/238, 28.3/**3.3** whole-band and **0.0%** near-field.
Author against the enumerated ladder in REFERENCE.md "Criterion A", not a formula.

### 2. Every stage-3 enemy and every far-LOD enemy draws the procedural fallback
R4's headline gap 1 is closed for daylight near enemies only. The gate is
`if (detail && !night)` at `enemySprite.js:418` and `SHEET_URLS` has no night or far-LOD entry.
**Reproduction to satisfy**: a stage-3 enemy (HUD digit reads 3) at ≥15 %W satisfies R4 gap 1's
four criteria — fuselage ≤35% of span, leading-edge sweep ≥15°, no single feature >12% of
silhouette area, ≥2 distinguishable types — judged on a 4× crop against t175/t186. Either author
night and far-LOD sheets or make the procedural path draw the same silhouette. **Separately:
make a failed/not-yet-decoded sheet LOUD**, not a silent fallback — that silence is why a wrong
colour survived a full round.

### 3. Lethality — now with an arcade anchor measured twice
**Reproduction to satisfy**: **≤2.0 deaths per minute of wall clock** over ≥3 min × ≥3 seeds of
`?demo=1`, enemy shot volume unchanged. Ours **3.00**. Arcade **1.91** (mine, READY-card
template match, all 60 candidates crop-verified) and **2.04** (feel critic, continue-screen
partition). Keep deaths/min-of-flight-time as the secondary line. This replaces the retired,
unsatisfiable ≤1.5 — but do **not** leave lethality with no gate at all.

### 4. Remove the inverted player-airframe value ceiling (V ≤ 0.77)
Our brightest airframe colour is `#c5c5ad`, V **0.773**; the arcade's stage-1 jet has an
achromatic-pixel V **median of 0.839** and a max of 1.000. The ceiling caps us below the
reference aircraft's median. **Reproduction to satisfy**: our daylight airframe's achromatic-pixel
V median lands in **0.78–0.92**, with the brightest body colour ≥0.90, measured on a jet-on/jet-off
difference mask. Add to the defective-criteria ledger as row 11.

### 5. Stage 2's ground is a longitudinal streak field
`evidence-stage2-ground-streaks.png`: smeared streaks radiating from the vanishing point,
symmetric about the flight axis — it reads as a racetrack. The arcade's stage 2 is one chunky
diagonal terrain mass. The palette work here succeeded (374 colours, n90 = 29 against the
arcade's 31); the **structure** is wrong, not the colours.

### 6. Three stages looping; no throttle; no barrel roll; no resupply
The digit/palette inconsistency is fixed, but the game is 3 of 23 stages on a loop, the throttle
bar is wired to `scrollSpeed` with no player control, and the barrel-roll art is built and
deliberately unwired (one line, per R5). The largest remaining *gameplay* gap, and the one a
player feels fastest.

### 7. The player jet reads flatter than the arcade
Carried from R5's own honest note and confirmed on my crop: wings need anhedral and taper,
blades more cant and length, nacelles as separate rounded bodies. All four discriminators
already pass — **do not tune to them; draw to the crop and re-check the numbers afterwards.**

### 8. Cloud banks may have overshot
My width median **25.94 %W** against a 14–24 accept band; p90 43.12 against 25–40; arcade
cloud-only median 20.41. Low priority — too big is a far better failure than R4's too small.

### 9. Three documentation defects in REFERENCE.md
(a) The "cloud banks only" table publishes `max 42.27 %W` **without** the "merged, not a clean
bank" flag that `lane-criteria-fix.md` carries; the largest clean bank is **33.24**.
(b) The #132 cloud operator specifies a HUD exclusion for *our* side only and is silent on the
arcade side — which is why two of three independent runs counted the arcade's SCORE emblem as a
cloud bank in roughly a third of their detections.
(c) Ledger needs row 11 (the airframe value ceiling).

### 10. Retire the ≥3:1 HUD contrast criterion; publish the arcade's actual mechanism
The arcade fails it on its own red ink on stages 1 and 2 under both readings of "local
background", and our profile tracks the arcade's on every ink class. Replace with what the
arcade does: **white plate behind SPEED only, no plate behind STAGE, black keyline on the stage
digit and the missile stock.** We already do this. Mark gap 3's contrast half **closed**.

### 11. Drop I6's "brightest-decile saturation ≤0.30"
It reads 0.952 on a fireball whose core is exactly the arcade's `#f6f6e7`. Keep core fraction only.

### 12. Title letterforms; no attract-mode gameplay demo
Layout and colour are right; the arcade's are italic, angular and bevelled.

---

## Evidence index

All under `judging/R5/judge-evidence/`. Ours **LEFT/TOP**, arcade **RIGHT/BOTTOM**, labelled
in-image.

| file | what it shows |
|---|---|
| `cmp-01-dither-ours-TOP-arcade-BOTTOM.png` | **The most important image in this report.** Our stage-1 sea vs the arcade's ground, same crop, 8× nearest. 2 348 colours vs 35. |
| `cmp-02-jet-ours-TOP-arcade-BOTTOM.png` | Our day jet (SPAN 339 px) vs arcade t175 (SPAN 373 px). All four discriminators pass; the crop still differs. |
| `cmp-03-hudbottom-ours-TOP-arcade-BOTTOM.png` | Bottom HUD, our stages 1/2/3 over the arcade's t116/t140/t175. Our stage-2 digit is more legible than the arcade's. |
| `cmp-04-emblem-ours-TOP-arcade-BOTTOM.png` | SCORE emblem, 16.88 %W vs 16.91 %W. |
| `cmp-05-title-ours-TOP-arcade-BOTTOM.png` | Title vs t74. |
| `evidence-arcade-cloud-population-sheet0.png` | My crops of the #132 operator's arcade detections: eleven of sixteen are the SCORE emblem. |
| `evidence-arcade-cloud-population-sheet4.png` | Genuine banks, including two sitting behind the HIT emblem (the row-5 retirement evidence). |
| `evidence-ours-cloud-detections.png` | Our banks, annotated, uncontaminated. |
| `evidence-stage3-enemy-procedural-fallback.png` | The unredrawn night enemy at 31.9 %W, in normal play, stage digit 3. |
| `evidence-arcade-deaths-ready-cards.png` | 24 READY-card candidates, 23 genuine — the basis of the arcade's 1.91 deaths/min. |
| `evidence-alphatest-no-punchout.png` | Cloud reading through the jet quad between the fins. |
| `evidence-stage2-ground-streaks.png` | The stage-2 streak field, horizon overlaid at row 139. |

**Captures**, all under `tools/out/judge-r5/`: `boot, hudmask, hud-s1, hud-s2, hud-s3, jet-on,
jet-off, clouds, overlap, enemy, s3combat, stage4, title, trail, expl, expl2, demo2`. Every set
swept: **0 black frames, 0 duplicates**. No capture reported a page error.

**Completeness.** Two ledger rows (sea anisotropy; stage-2 open plain) were not re-measured and
are marked as such. The art critic's second claim (near-black enemy dominant from an orange-sky
stage-2 frame) was not re-checked. My absolute explosion-core figures do not reconcile with
REFERENCE.md's and are published only as a like-for-like comparison. Everything else in this
report is a figure I produced.

---

## Recommendation

Send back — but this round earned its send-back differently from R4's. R4 was sent back because
six things were visibly wrong. Five of those six are now right, and I checked them myself.

**Do the criteria work first again; it keeps paying.** Promote Criteria A and B into the gap
list where they can be worked, remove the inverted airframe value ceiling, retire the ≥3:1
contrast criterion, drop I6's brightest-decile statistic, set the lethality gate at ≤2.0 on the
twice-measured arcade anchor, and fix the three REFERENCE.md defects. That is a day of work that
redirects the whole round.

**Then make gap 1 the world lane's entire round.** Stage 1's sea is the single pixel-level reason
this does not read as a 1987 arcade game, it is isolated to one shader, and stages 2 and 3 prove
the technique works. Gap 2 is the sprite lane's entire round. Gap 6 — throttle and barrel roll,
both nearly wired — is the cheapest gameplay win on the board.

A note on method, offered without blame: three separate times in this gate my own validated
operator returned a clean, stable, plausible number from entirely the wrong pixels, and only
cropping and looking caught it. The lanes are not doing worse than the judge at this. The rule
that keeps working is the cheap one — **look at what the operator selected, once, before
publishing the number it produced.**

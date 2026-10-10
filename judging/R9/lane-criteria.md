# R9 — criteria lane

**Tree state**: started from `52edcc4`, worked on the shared uncommitted tree with three build
lanes live (`pacing-r9`, `drawing-r9`, `title-r9`). **No `src/` file was touched.** Every
our-side figure below carries the tree it was measured on, and where that tree is being changed
this round by another lane, it says so.

**Files owned and changed**: `REFERENCE.md`, `GAME_SPEC.md`, `STATUS.md`, this directory,
and three new tools — `tools/arcade_density_census.py`, `tools/inkspan_arcade.py`,
plus figures under `tools/out/criteria-r9/`.

---

## 0. Instruments, and the control each passed before any number was believed

| instrument | what it does | control |
|---|---|---|
| `tools/arcade_density_census.py` | per-frame enemy-aircraft density from a hand-labelled arcade census | `--selftest` **14/14 PASS** over four synthetic censuses with hand-computable answers, including the ≥2 clause, floor inclusivity at exactly `T`, and a **refusal arm**: an empty population raises rather than returning a plausible `0` |
| `tools/inkspan_arcade.py` | INK / SPAN / stroke width — a second, independent implementation of the drawing lane's `tools/art/inkspan.py` | `--selftest` **8/8 PASS**, including the two arms that matter: a **scale arm** (the same drawing at 2× nearest moves INK/SPAN by ×1.999 and SW/SPAN by 0.001 points) and a **discrimination arm** (four 3 px blades vs one 12 px slab at the same span) |
| cross-validation of the above against the R8 art critic | same subject, different implementation, different mask rule | span **109.78 vs 109.7**, bbox fill **15.0 % vs 15.1 %**, INK/SPAN **7.07 vs 7.32**, dark-accent share **46.0 % vs 44.7 %** |
| "crop it and LOOK" | every zero / every empty-sky claim below | five arcade frames the census scores as empty or near-empty, opened at full size with their stage digits read: `tools/out/criteria-r9/crit-r9-01-ARCADE-empty-and-tiny-frames.png` |

**One instrument honesty note.** `inkspan_arcade.py`'s `largest 8-connected component` rule is
correct for rejecting debris (it dropped the 96 `#a48484` flecks scattered around the arcade jet
to **0**), and it has a blind spot the selftest exposed: a drawing made of **physically separated**
strokes loses every stroke but one. On the arcade jet the blades meet at the fuselage so the
component is whole, but a lane that thins a wing until sky breaks through will see INK fall for a
reason the statistic does not mean. Stated in the criterion box.

---

## 1. JOB 1 — R3's readable-presence gate is RETIRED. Ledger row 37.

### 1.1 The verdict in one paragraph

*"≥1 enemy at ≥10 %W in ≥60 % of combat frames"* (`judging/R3/report.md:151`) is retired.
**The arcade reads 19.0 %**, two independent hand counts agreeing (19.0 % and 16.7 %). The gate's
own arcade side was **four frames selected into a reference pack**, and I checked all four:
**one of them carries no enemy aircraft at all.** `MAX_ALIVE` was driven 6 → 10 → 12 → 14 to
satisfy the gate, the gate was then re-measured on the build the raise produced, and the clause
that justified the raise was made false by R8's own shipped fix in the same round. The build went
from 27.3 % — the closest it has ever been to the arcade — to ~80 %, and that was recorded as a
pass.

**This is the first row in the ledger where a criterion did not merely fail to catch a defect —
it caused one.** Rows 1, 2, 3, 11, 12 and 13 are criteria that would have moved the build the
wrong way *if* a lane had tuned to them. Row 37 is a criterion that a lane *did* tune to, for
**five rounds**, with every round passing. The ledger's closing sentence — *"in five cases
tuning to it moved the build away from the reference"* — has until now been a statement about
counterfactuals. It is now a statement about shipped work.

### 1.2 The arcade's own density, both operators, with its citation

**Source**: `tools/out/combat-r6/arcade-vert/labels.csv` — the R6 combat lane's hand count,
collected for the *altitude* distribution, 63 frames on a **3.00 s grid** over `STAGE_MAP.md`-
verified spans of stages **1, 4, 6, 7, 12, 19**, read by a human at 1.4× NEAREST from
`.reference-cache/video/ab2-longplay.mp4` (686×480), each aircraft's **drawn span in %W**
recorded beside its altitude. 83 enemy observations. Frames marked `excluded` (launch sequence,
dust-cloud ambiguity, clutter) leave the population; `kind=player` rows are not enemies.

**Operator**: `tools/arcade_density_census.py`. Statistic is `wW`, a **human-read drawn span** as
a per cent of frame WIDTH at 686×480, ±2–3 points per the file's own header. **This is not
`spanFrac`** — per ledger row 27 a bare "%W" is not a reportable quantity, and the feel critic
measured the conversion at 1.03× level to 1.39× hard bank, ~1.18× bank-weighted. The HUD is
excluded by the human reader, satisfying the standing rule (row 23).

| | mean / frame | frames holding ≥1 | ±2 SE | frames holding ≥2 |
|---|---|---|---|---|
| any recorded aircraft (counter floor ~2–3 %W) | 1.317 | 61.9 % | | |
| **≥3 %W** | **1.270** | **60.3 %** | 0.94–1.60 /frame | 38.1 % |
| **≥5 %W** | **0.635** | **36.5 %** | | **15.9 %** |
| **≥10 %W — R3's "readable"** | **0.302** | **19.0 %** | **9.2–28.9 %** | 6.3 % |
| ≥15 %W | 0.048 | 4.8 % | | 0.0 % |

**Drawn span distribution**: p25 **4**, p50 **4**, p75 **8**, p90 **13**, p95 **13**, max **22 %W**.
**77.1 % of the arcade's own enemy aircraft are below 10 %W.**

**Per stage, readable-present**: stage 1 **44.4 %**, stage 4 **0.0 %** (zero readable aircraft in
eleven frames spanning 33 s; max recorded span on that stage is **5 %W**), stage 6 15.4 %,
stage 7 11.1 %, stage 12 27.3 %, stage 19 20.0 %. **The spread is the finding as much as the
mean**: no single number is the arcade's density, and a gate stated as one number cannot be right
for stage 1 and stage 4 at once.

**Second operator, second reader**: the R8 feel critic's own 18-frame count on a **2 s** grid over
stages 1, 6 and 16 — **28 aircraft / 18 frames = 1.56 per frame, readable present 3 of 18 =
16.7 %.** The two sets share four stage-1 timestamps and agree **exactly on every one** (t99: 3/3,
t105: 0/0, t111: 0/0, t117: 2/2). **Two counts, two readers, different frames, one answer.**

**Third route, the judge's, independent of both**: 24 frames on a **2 s** grid over stages 1, 2
and 4, mean **2.00** on the pre-registered grid and **1.64** once four off-grid frames were added
(`judging/R8/report.md` §4.2). Stage 1 is the dense stage in every count — my stage-1 mean is
**1.44** — so the judge's stage-weighted 2.00 and my six-stage 1.27 are consistent.

**I cropped and looked before publishing any of it.** Five frames the census scores as empty or
all-tiny, at full size with their stage digits legible —
`tools/out/criteria-r9/crit-r9-01-ARCADE-empty-and-tiny-frames.png`. Stage 4 t214 and t220: the
player's jet alone in an empty sky, firing the vulcan at nothing. Stage 1 t105 and t111: the
player alone. Stage 4 t217: three enemies, genuinely 4–5 %W specks, correctly labelled. **The
zeros are real.**

### 1.3 The statistic nobody has ever stated: the arcade's sky is EMPTY

> **At the matched ≥3 %W floor, the arcade's sky holds no enemy aircraft at all in 39.7 % of
> frames; ours holds none in 0.18–0.19 %.**

**And the figure has two readings that differ by one frame, so state the floor with it.** 39.7 %
is "no aircraft **at or above 3 %W**" (exactly `1 − 0.603`). "No aircraft **at any recorded
size**" is **38.1 %** — 24 of 63, listed by name and reproduced by a second route (an `awk`
projection over the deduplicated file, independent of the Python loader). `judging/R8/feel-critique.md`
§1 prints 39.7 % under the words *"no enemy aircraft at all"*, which is the 38.1 % definition.
Both numbers are right about their own statistic; the headline needs its floor attached. **This is
ledger row 27's family, found inside the figure that is retiring row 37** — and it reconciles,
which is why it is a note and not a row.

**Emptiness is part of the rhythm and no criterion has ever named it.** Our worst *drought* —
the longest run with no readable enemy — is **1.8–2.5 s** across every pilot arm. The arcade's
stage-1 span has **six consecutive sampled frames, ten seconds, with no enemy aircraft at all**
(feel critic §2.1, t103→t113, HIT moving once). A criterion set only on presence can only ever be
satisfied by adding aircraft; it is structurally incapable of asking for a gap.

### 1.4 The finding the brief did not have: the gate HAD an arcade side, and it was four selected frames

R3 justified the gate in its own sentence: *"(Every stage-1 reference frame in the pack — t100,
t100.75, t116, t104 — carries at least one enemy at 10–30 %W.)"*

I opened all **eight** stage-1 frames in `reference/` — composite at
`tools/out/criteria-r9/crit-r9-02-R3-reference-pack-stage1-all-eight.png` — and `git log
--diff-filter=A` confirms **all eight were in the repo on 2026-10-02, the day before R3's report**.
Classified by eye at 2×, with the two ambiguous ones re-read at 3× and 12×:

| pack frame | enemy aircraft present | ≥10 %W enemy present |
|---|---|---|
| `stage1-climbout-t92` | none | **no** |
| `stage1-flight-bank-t97` | one, ~3 %W | **no** |
| `stage1-hard-bank-t98` | one, large | yes |
| **`stage1-lockon-missile-t100`** ← cited | one large + specks under brackets | yes |
| **`stage1-missile-salvo-t100.75`** ← cited | one large | yes |
| **`stage1-lockon-island-t104`** ← cited | **NONE AT ANY SIZE** | **NO** |
| `stage1-flight-bank-t112` | none | **no** |
| **`stage1-level-flight-t116`** ← cited | one large (green-camo, close aspect) | yes |

**Three things fall out, in rising order of severity.**

**(a) The claim is false on one of its own four frames.** `stage1-lockon-island-t104.png` carries
exactly one aircraft: the player's. Zoomed to 6× (`tools/out/criteria-r9/crit-r9-04-ARCADE-t104-NO-AIRCRAFT-brackets-only-6x.png`)
the thing at frame centre that reads as a target at a glance is a **cluster of overlapping
white-cyan lock-on corner brackets with no aircraft inside any of them**, beside the player's own
vulcan tracers; the object in the upper right is the HUD reticle with its attitude line. **The
upper-right HUD has now been counted as a cloud, a cloud bank, a false horizon and twice as an
enemy (ledger rows 15, 23). This is the third time as an enemy — and the first time it happened
inside a criterion rather than inside an operator**, where no amount of re-running the operator
could find it.

**(b) The gate fails on the sample it was derived from.** The pack it drew from reads **4 of 8 =
50.0 %** readable-present, below its own ≥60 % threshold. The ≥60 % was not derived from anything;
it is a round number placed below "4 out of 4".

**(c) The selection bias is visible in the filenames.** Two of the four cited frames are named
`lockon`, one is named `missile-salvo`. **A reference pack is assembled to illustrate the game's
features, which is precisely a sample selected on the presence of the thing being counted.** R7
named this exact failure for the nose sight — *"four frames, then sixteen frames, concluding
absence, twice, independently … two draws from one biased sample"* — and recorded the remedy:
**for a negative claim, the sample selection is the whole measurement.** Row 37 is the same defect
with the sign flipped: **four frames concluding presence**, from a pack selected for it. The rule
generalises and is now published: **for a frequency claim in either direction, the sample
selection is the whole measurement. A reference pack is never a sample.**

### 1.5 The closed loop, from the code side

`src/game/spawner.js`'s own comment:

> *"Was 6 … The replacement criterion is size-qualified (≥1 enemy at ≥10 %W in ≥60 % of combat
> frames), and a 6-enemy cap cannot deliver it … **roughly two thirds of spawns are shot down
> before they ever get there**. The density is bought with POPULATION … 6 → 10 → 12 → 14 were each
> measured."*

Three independent routes put the arcade's emission at **0.40–0.74 aircraft/s** — the judge's hand
count through Little's law, the arcade's own HIT counter as a lower bound (0.48–0.54 kills/s), and
**this repo's own ADOPTED `GAME_SPEC.md` §4 pacing spec, 1.5 s on stage 1 = 0.67/s**. The shipped
build emits **3.17–3.20/s** (regenerated table, §1.6). **The code is the outlier by 4–8×, and
`GAME_SPEC` was never updated to say so.**

And the load-bearing clause expired in the round that was steering by it: R8 applied
`READABLE_SPAN_FRAC = 0.10` inside `vulcan.resolveHits`, so **the gun can no longer kill an
aircraft below 10 %W at all**. "Two thirds of spawns are shot down before they reach readable
size" is now false by construction. **R8 removed the reason for its own spawn rate and did not
revisit it.** Confirmed from the regenerated pilot table: `gunSubReadable` is **0.0 on every one
of the eight pilot arms.**

### 1.6 The our-side half of the comparison — and it was NOT PUBLISHED

`judging/R8/feel-critique.md` §2.4 ships with two **unsubstituted template placeholders**,
`PILOT_CENSUS_TABLE` (line 229) and `TRK_CENSUS_COMPARE` (line 238). **The entire our-side census
table is absent from the document**, and §1's headline quotes 79.6 % and 0.2 % as conclusions of a
table that was never rendered. Under REFERENCE's own "What a complete citation is", those figures
were uncitable.

**Recovered, not re-derived**: re-running the critic's own formatter over its own pooled arms —
`python3 tools/out/feel-critic-r8/tables_fc8.py tools/out/feel-critic-r8/arms{A,B,C}-results.json`
— reproduces it. Tree `ea3726b`, flight ticks only, enemies **on screen** (not `alive`).

| floor | ~drawn %W | **arcade** /frame | **arcade** present | ours `still` | ours `trk` | `still` present | `trk` present |
|---|---|---|---|---|---|---|---|
| spanFrac ≥0.03 | ≥3 | **1.270** | **60.3 %** | 7.72 | **6.94** | 99.8 % | 99.8 % |
| ≥0.05 | ≥4–5 | 0.635 | 36.5 % | 5.39 | 4.68 | 99.4 % | 98.4 % |
| **≥0.10** | ≥8.5–9 | **0.302** | **19.0 %** | 2.42 | **1.78** | 90.7 % | **80.4 %** |
| ≥0.15 | ≥13 | 0.143 | 7.9 % | 1.21 | 0.67 | 68.4 % | 44.5 % |

Empty sky at the matched ≥3 %W floor: arcade **39.7 %**; ours `still` **0.18 %**, `trk` **0.19 %**,
`weave` 0.36 %, `trk-aimjet` 0.62 %. `idle` (nothing killed, the spawner's pure output) holds
**13.31** alive at **96.35 %** readable-present.

**One thing in that table is a genuine credit and should not be lost in the retirement.** The ratio
ours:arcade is **5.5×** at ≥3 %W and **5.6×** at ≥10 %W — *the same factor at both floors.* **Our
enemy size distribution is right; the population is five and a half times too large.** That is a
one-constant defect, which is exactly what the judge concluded from the other end.

**Caveat, binding**: §1.6's our-side figures are tree `ea3726b`. **The `pacing-r9` lane is changing
them this round.** Re-measure before quoting them against any new commit; do not quote the 80.4 %
as a current property of the build.

### 1.7 The replacement — **ARCADE-PACING**, with an arcade column on every row

Published in `REFERENCE.md`. Bands are **derived from the arcade sample's own sampling error**
(±2 SE on 63 frames), not chosen:

| statistic, over flight frames on a fixed interval | arcade | **gate** | ours (`trk`, `ea3726b`) |
|---|---|---|---|
| frames holding ≥1 enemy at **≥10 %W drawn span** | **19.0 %** (63 fr, 6 stages); 16.7 % (18 fr, 3 stages, 2nd reader) | **9–29 %** | 80.4 % ✗ |
| frames holding **no enemy aircraft at ≥3 %W** | **39.7 %** | **≥27 %** | 0.19 % ✗ |
| mean enemy aircraft on screen at ≥3 %W | **1.270** | **0.9–1.6** | 6.94 ✗ |
| frames holding ≥2 enemies at ≥5 %W | **15.9 %** | **≤25 %** | — |
| share of enemy observations **below** 10 %W | **77.1 %** | **≥65 %** | passes already |
| emission rate, aircraft/s of flight | **0.40–0.74** (3 routes) | **0.4–1.0** | 3.17–3.20 ✗ |

**R3's second clause — *"≥2 at ≥5 %W in ≥50 %"* — is retired with the first and nobody has ever
quoted it.** The arcade reads **15.9 %**. It is the more wrong of the two.

**What this criterion cannot see, stated with it**: it is a *count* statistic and is blind to
**arrangement** — six aircraft in a line and six in a formation score identically (ledger row 18's
lesson applied before the fact). Pair it with the drought statistic (`worstDroughtS`) and with
the art critic's rank-1 occlusion figure.

---

## 2. JOB 2 — **DRAW-WEIGHT**: a criterion for drawing, with an arcade column per object

### 2.1 The gap, in the art critic's words and then in the ledger's

> *"The build's colour is now right nearly everywhere and its drawing is wrong nearly everywhere
> that is not the sea, the HUD or the sky. Nothing the project measures can tell the difference."*

Every statistic this project owns for a drawn object is a **value** statistic (VALUE-STAT,
`value_census.py`), a **palette** statistic (Criterion A, the ladder, the keyline budget), or a
**silhouette-topology** statistic (JET-SIL, `enemysil.py`). In R8 **all of them passed** on the
player jet, the title, the death hulk and the carrier, and all four are visibly wrong. Ledger
row 40.

### 2.2 The operator — licensed, not re-invented

`tools/art/inkspan.py` (drawing lane, R9) is the instrument and **REFERENCE.md licenses its
definitions verbatim** rather than restating them, so this project does not acquire two operators
under one name (rows 14, 22, 27). My `tools/inkspan_arcade.py` is a second implementation used to
cross-validate the arcade side before licensing.

- **INK** — mask pixels, largest 8-connected component.
- **SPAN** — Feret diameter (convex-hull), not row extent, so it may be read on any bank pose.
- **INK/SPAN** — mean drawn cross-section, in pixels. The R8 art critic's invention.
- **SW** — 2 × median distance from an ink pixel to the nearest background pixel: a *local*
  thickness. A 3 px stroke returns 3-ish whether it is 10 px long or 100.
- **P90SW** — the same at the 90th percentile: the thickest mass present.
- **bbox fill** — ink ÷ bounding-box area. Published **beside** INK/SPAN, never instead of it.

### 2.3 THE LICENCE CONDITION NOBODY HAS STATED, and it is proved by control

**INK/SPAN is a dimensioned quantity. Ink grows as the square of scale; span grows linearly.
The same drawing read at twice the size returns twice the number.**

`tools/inkspan_arcade.py --selftest`, scale arm: the identical synthetic at 2× nearest moves
**INK/SPAN by ×1.999** and **SW/SPAN by 0.001 points**.

> **INK/SPAN may only be compared between two subjects at a MATCHED SPAN (within ±10 %). Across
> different sizes or resolutions the comparable forms are SW/SPAN and bbox fill.**

The R8 art critic's jet comparison is valid *because* it matched spans — arcade 109.7 against ours
115.0 — and the report does not say that is why. Without this condition the next lane compares our
16 px far-enemy cell against a 9 px arcade one and reports a 2× defect that is entirely scale.

### 2.4 The arcade column, measured

**Subject 1 — the player jet.** `reference/ab2-arcade-desert.png`, **true native 320×224**,
138 colours, HUD stage digit reads **2**, banked pose, **n = 1**. Mask = exact membership in the
four airframe roles `#ffffef`, `#f7e6b5`, `#840000`, `#000000`; largest 8-connected component;
stable across two crop boxes (`(80,70,200,155)` and `(70,65,210,160)` give identical figures).

| | **arcade** (me) | arcade (art critic R8) | ours level (critic) | ours banked 35.6° (critic) |
|---|---|---|---|---|
| ink | 776 | 803 | 1 513 | 970 |
| span | **109.78** | **109.7** | 115.0 | 89.1 |
| **INK/SPAN** | **7.07** | **7.32** | **13.15** | 10.93 |
| **SW** (median stroke) | **2.0 px** | — | — | — |
| P90SW | 4.0 px | — | — | — |
| **bbox fill** | **15.0 %** | **15.1 %** | 22.6 % | — |
| `#840000` share | 28.4 % | 27.9 % | 15.9 % | 23.0 % |
| `#000000` share | 17.5 % | 16.8 % | 9.3 % | 7.0 % |
| **dark-accent share** | **46.0 %** | **44.7 %** | **25.1 %** | 30.0 % |

**Two implementations, two mask rules, two crop boxes, one answer.** Span agrees to 0.08 px and
fill to 0.1 points. The 27 px ink difference is the **nozzle fire**, whose oranges my palette mask
excludes because they are shared with the desert ground and the critic's mask includes — named so
it is not read as a disagreement.

**And the figure is the argument**:
`tools/out/criteria-r9/crit-r9-03-ARCADE-jet-INKMASK-6x.png` — the arcade's F-14 reduced to its own
four palette roles is **a skeleton of 2 px cream strokes each with a dark-red shadow line beside
it**. There is no filled surface anywhere on it. **SW = 2.0 px** is that sentence as a number.

**Subject 2 — the distant enemy aircraft.** Same true-native frame, the two enemies at native
`(108,28)–(132,48)` and `(140,55)–(168,78)`. Background `#e67300`, exact match, largest component.

| | **arcade A** | **arcade B** | **ours, `drawRearFar()`** |
|---|---|---|---|
| ink | 45 | 49 | **128** (16 × 8, every texel opaque, read from source) |
| span | 16.00 | 18.49 | 16.03 |
| INK/SPAN | **2.81** | **2.65** | **7.99** |
| SW | 2.0 | 2.0 | **8.0** |
| **bbox fill** | **34.6 %** | **30.6 %** | **100 %** |

The spans are matched here by luck (16.0 / 18.5 / 16.0), so INK/SPAN is readable directly: **ours
is 2.8–3.0× the arcade's at the same span, and bbox fill — the scale-free form — is 100 % against
~32 %.** `tools/out/criteria-r9/crit-r9-07-ARCADE-far-enemy-NATIVE-14x.png` shows what the arcade draws at 49 px: an
irregular diagonal with a wing line wider than its body, two black nozzle pixels, and **sky inside
its own bounding box**.

**Subject 3 — the near-aspect enemy. NO ARCADE COLUMN EXISTS.** Both true-native frames carry only
distant enemies; every near-aspect reference is a video upscale with thousands of colours on which
an exact-membership mask cannot run (acquisition item 5). **The criterion is explicitly
UNLICENSED for this object.** Stating that is the point of Job 2: a criterion without an arcade
side is what Job 1 is retiring.

**Subjects 4–6 — carrier, title, death hulk. NO ARCADE COLUMN EXISTS EITHER**, for a reason worth
recording once: their only arcade references are 686×480 video, where (a) INK/SPAN would be read
at 2.14× our native scale, and (b) the mask needs a tolerance, and a tolerance **adds** ink at low
values and **removes** it at high ones — so any video INK/SPAN is a function of a knob. **These
three go on the acquisition list rather than into the gate.**

**The night true-native frame cannot substitute.** `ab2-arcade-night-banking.png` has its player
jet **inside a 37.8 %W fireball**; the subject cannot be isolated. That is the second distinct
measurement programme this frame has been found unusable for, and it is now recorded so it is not
attempted a third time.

### 2.5 What DRAW-WEIGHT cannot see

The instrument-side list is in `tools/art/inkspan.py` and binds. The criteria-side additions:

1. **It is dimensioned** (§2.3). Matched span or SW/SPAN, nothing else.
2. **It is blind to colour and to where the ink sits.** A correctly-weighted drawing of the wrong
   aircraft in the wrong hues scores identically. VALUE-STAT, the ladder and JET-SIL must keep
   passing beside it — **this criterion is an addition to the gate set, never a replacement.**
3. **Largest-component masking silently drops separated strokes.** A wing thinned until sky breaks
   through loses its whole component. If component count ≠ 1, publish it.
4. **It has an arcade side on exactly two objects** (player jet n=1, distant enemy n=2) and is
   unlicensed on four. **Do not generalise the jet's 7.07 to a class** — that is ledger row 35, the
   failure the art critic reports as three-for-three in R8.
5. ~~**The bank-invariance claim is NOT established.**~~ **RESOLVED — see §5c.1. The claim is
   TRUE by 24× and is published**, and the arm that looked like a counter-example (our nine
   authored cells, CV 9.9 % vs fill's 15.0 %) turned out to be `SHRINK = 0.34` entering a
   dimensioned statistic — a third independent argument for the matched-span licence.

---

## 3. JOB 3 — the ledger rows R8 earned

### 3.1 Row 38 — a tick index is not a reportable quantity without the URL that produced it

**Verified from source by me, independently of the judge.** `flow.js:274` makes
`params.get('demo') === '1'` the only route into the `launch` state; `launchSequence.js:81–83` give
`LAUNCH_TOTAL_S = ON_DECK_S + CLIMB_S = 1.0 + 2.5 = 3.5 s`; and `this.stageTimer += dt` appears
**exactly once in `flow.js`, at line 581, inside `_updateFlight`**. `_updateLaunch` (569),
`_updateDeath` (651), `_updateContinue` and the title/attract handlers each have their own branch
in the `switch` at 453–469 and none of them advances it.

Two displacements, different in kind:

| URL change | displacement | kind |
|---|---|---|
| adding `?demo=1` | **3.5 s = 210 ticks of `launch`**, measured as **211 ticks** at the first stage boundary (1 921 → 2 132) | **fixed and predictable** |
| dropping `?invincible=1` | `DEATH_TOTAL_S = 7.7 s = 462 ticks` per death, and the death count is stochastic | **unbounded and run-dependent** |

Published beside row 27 in REFERENCE.md.

### 3.2 Row 39 — a lane fixes the AXIS that was measured and the defect survives in the OBJECT

Row 35 is *object → class*. This is one level further in, and it is **the same object, the same
file, the same commit**: the title's palette is perfect (11 colours, 15 channel values, 0
off-ladder) and its drawing is a placeholder; the hulk is on-gate on every frame and is a flat
silhouette with no smoke, highlight or debris; the carrier is 13 → 1 off-ladder and, in the lane's
own words, *"visually identical"*. **Three for three in one round, on the three objects R8 was
given.** The remedy is row 40's.

### 3.3 Row 32 is UPDATED, not duplicated — the population rule now has a tool

The brief asked for a new row for the population-assertion rule. **It already has one** (row 32),
and the right change is to record that it is now enforced by an instrument rather than by a habit.
`python3 tools/assert_population.py --selftest` **PASSES on this tree**, including the arms that
matter: it **refuses** R7's twelve published frames (weapon 0/12, explosion 0/12, enemy-fire
12/12), **accepts** a known-good `?demo=1` kill set, **refuses a bilinear 3× upscale rather than
silently averaging it**, and returns 0 on a patch one channel level off a target colour. Run by me
on this tree, not taken on report.

### 3.4 Row 40 — the whole passing gate set was non-discriminating for DRAWING

See §2. This is a row about a *set* rather than a single criterion, and it belongs in the ledger
because the ledger's closing sentence is exactly its content: *the number was satisfiable by
something that looked nothing like the arcade.*

### 3.5 Row 41 — the missile lock radius, set by a count taken on ONE SELECTED FRAME

Found by Job 4's sweep and it is Job 1's defect in a second place. `src/weapons/lockSystem.js:44`
states it honestly and keeps the value: the lock radius is **0.22 (22 %W)**, the only
arcade-anchored figure is the prototype's ADOPTED **8.3 %W** (`GAME_SPEC.md` §3), and the tuning
argument on the record is that at 8.3 %W a hold accumulated 4 locks against GAME_SPEC §3's *"~6
brackets at once"*. **That "~6" is a single frame, `t100` — and `t100` is one of the four frames in
R3's selected pack, the same pack that produced row 37.** It is also a *salvo* frame, the most
atypical moment in the game, and at 3× the aircraft carrying those brackets are 2–4 px specks
(`tools/out/criteria-r9/crit-r9-06-ARCADE-t100-salvo-brackets-3x.png`). A bracket count taken during a salvo does not license
a lock radius 2.65× the only measured anchor. **R8 priced the consequence**: the missile
contributes a flat 1.08–1.26 kills/s to every pilot policy and **100 % of its kills are below the
readable gate** — reproduced in §1.6's regenerated table, where `gunSubReadable` is 0.0 on all
eight arms while the missile rate `mslPerS` sits at 0.37–0.48 regardless of pilot.

### 3.6 The fourth class of silent wrong number — **NOT OPENED, and the brief is overruled on this one point**

The brief asked for a fourth class: *two correct measurements of two different things that look
like one thing*, with the argument that cross-validating implementations **reinforces** it.
**The R8 judge refuted both halves and I checked the refutation rather than repeating the claim.**

- **It is not a fourth class.** STATUS.md's class 2 reads *"a validated operator pointed at the
  wrong population, resolution, region **or sample**"* — I confirmed the words are there,
  `STATUS.md:123`. The case for a fourth class was made by quoting that definition **with "or
  sample" removed**, and the TL's own framing in the same file is *"the two samples were not the
  same sample"*. A failure whose remedy is identical to an existing class's remedy is an instance
  of it.
- **"Cross-validation reinforces this class" is refuted by the episode that produced it** — the
  defect was found *because* two independently invoked readers disagreed, 29 against 28 at tick
  1 950. The correct, narrower statement: **cross-validation over a SHARED input cannot see an
  input-identity defect; cross-validation over independently produced inputs can, and here it
  did.** Framed the other way the lesson argues against the practice that caught it.

**The rule is kept and published (row 38); the taxon is not opened.** Flagged to the TL rather
than absorbed silently, because it is a direct departure from the brief.

---

## 4. JOB 4 — the declared-exception sweep

### 4.1 The rule the sweep needed before it could run

A grep for "deliberate / on purpose / by design / exception" over `src/**/*.js` returns **~70
hits**, nearly all of them ordinary implementation notes ("deliberately independent PRNG streams",
"deliberately not a scripted pattern"). The class that hides defects is narrower:

> **A DECLARED FIDELITY EXCEPTION is a source comment that (a) names a visible property of the
> shipped build, (b) asserts it diverges from the arcade or from a published criterion, and
> (c) gives a reason for not closing it.**
>
> **It is the best hiding place in the repo because it converts an open question into a settled
> one at zero cost to the writer, and every audit that reads the reason stops reading.**

That rule cuts ~70 hits to **thirteen**. Each was checked against the arcade or against the
criterion it cites.

### 4.2 Results

| # | site | what it declares | verdict |
|---|---|---|---|
| 1 | `entities/enemySprite.js` `drawRearFar()` + the FULL-WIDTH-BAND INVARIANT | five nested `fillRect`s on a fully opaque 16×8 cell, with "do not thin the wingtips" addressed to future editors | **FAILS. §4.3** |
| 2 | `weapons/lockSystem.js:44` | lock radius 0.22 against an 8.3 %W arcade anchor | **FAILS — ledger row 41, §3.5** |
| 3 | `render/clouds.js:117` | trilinear minification kept, justified by an **R3** cloud criterion | **JUSTIFICATION EXPIRED. §4.4** |
| 4 | `render/sky.js:35` | *"the sky is deliberately NOT snapped to the arcade ladder"* | **TEXT IS STALE AND NOW FALSE FOR TWO OF THREE STAGES. §4.5** |
| 5 | `ui/ladder.js:27` | stage-1 sky `#009fff` (channel 159) off-ladder on purpose | **PASSES** — the arcade's own `#009eff` is 158, equally off-ladder, and the R8 art critic's 800-frame sweep found 159 to be the **only** off-ladder value in the entire corpus |
| 6 | `game/flow/carrier.js:74` | "SEGA"/"ENTERPRISE" deck lettering not reproduced | **PASSES** — CLAUDE.md's assets rule is absolute; this is the rule working, not an exception to it |
| 7 | `game/flow/deathSequence.js:74` | *"THE 0.72 s WE KNOWINGLY DIVERGE BY"* | **PASSES** — arcade measured (t206.57→t207.55), the divergence is stated with its mechanism and the fix is costed |
| 8 | `game/flow/flow.js:423` | the grace flash makes the jet absent ~3 frames in 8 | **PASSES, and is a measurement caveat rather than a fidelity exception** — the arcade has the flash (ledger row 29) |
| 9 | `weapons/combat.js:508` | two tunables are `Infinity` on purpose | **PASSES** — instrumentation note; the span gate subsumes both |
| 10 | `render/screen.js:8` | chunky pixels in the fallback path | **PASSES** — correct for the subject |
| 11 | `render/ground.js:1238` | *"R5 exempted the sea because stage 1 carried an R3 acceptance criterion of ≥2000 distinct colours"* | **PASSES, and is the model for how this should be done** — the exemption was **closed** in R6, the retired criterion is named, the contradiction is spelled out, and the comment asks the criteria lane for the REFERENCE edit it needs |
| 12 | `audio/sfx.js:306` | a stand-in cue, not a measured reproduction | **PASSES** — honestly scoped; audio has never been heard by a human (STATUS "what nobody has judged") |
| 13 | `game/flow/titleScreen.js:40` | *"THE RULE, and it is deliberately the dull one"* | **PASSES** — the rule is conservative in the right direction |

**Two fail, two have expired or stale justifications, nine are sound.** That ratio is itself worth
publishing: the class is dangerous not because declared exceptions are usually wrong, but because
**nothing distinguishes the two sound ones from the two rotten ones without re-reading the arcade**,
and the comment's existence is what stops anyone doing it.

### 4.3 `drawRearFar()` — the declared exception fails on its own arcade citation

The comment justifies the fully-opaque far cell with an arcade observation:

> *"(reference/stage1-level-flight-t116.png: the bracketed enemy at ~(415,210) is a handful of dark
> pixels, no silhouette)"*

**I cropped (395,190)–(445,230) at 12× and it is not.**
`tools/out/criteria-r9/crit-r9-05-ARCADE-far-enemy-t116-12x.png` shows a **pale wing line clearly wider than its
body, with sky above and below it** — a cross, not a block. And §2.4's two true-native distant
enemies put a number on it: **bbox fill 30.6 % and 34.6 % against our 100 %.** The arcade keeps sky
inside the aircraft's bounding box at nine pixels of span; we fill every texel by construction, and
the FULL-WIDTH-BAND INVARIANT explicitly forbids anyone from thinning it.

**The invariant's own mechanism is real and must not be discarded with the drawing.** The two
measured failures behind it — mipmapped ghosting and NEAREST point-sampling dropouts (27 of 80
frames rendering zero pixels) — are genuine and reproduced on captures. **The invariant requires
*a* fully opaque row band through the sprite's middle; it does not require the whole cell.** That
is the shape of the fix and it belongs to the sprite lane. **44.8 % of all enemy sprites on screen
are drawn by this function.**

### 4.4 `clouds.js:117` — a live justification citing a retired criterion

The comment keeps trilinear minification because *"R3 measured that nearest minification shatters a
shrinking cloud into 12–14 disconnected components (target max 6) and crushes its width to ~1.9 %W
**against 9.26**"*. The 9.26 %W target is from the **#132 cloud figures, which ledger row 4 RETIRED
in R5** (a correct operator over a 90 %-non-cloud population; 12 of 120 components were banks); the
replacement width is 18.12 %W.

**The conclusion is probably still right and the justification is gone** — the shattering mechanism
does not depend on which width target is in force. This is row 37's pattern in miniature: *a
constant kept, and the clause that justified it quietly expired.* Row 4's ledger status now records
that it is still cited in live source. **Cross-lane ask, not a reversal.**

**And the defect the comment was shielding is on the other side of the filter.** The art critic
measured our cloud colour-patch size **scaling with screen width** — 7.1 px at 32 px wide to
**57.9 px at 187 px wide**, against the arcade's 4.5–6.7 px at 23–27 px — which is
**magnification**, while the declared exception is about **minification**. The comment is not the
cause; it is the reason nobody looked.

### 4.5 `sky.js:35` — the comment is broader than the exception the code takes

> *"NOTE: the sky is deliberately NOT snapped to the arcade's 4-bit colour ladder the way ground.js
> snaps the terrain."*

`stage.js:249` sets `skyLadder: true` for stage 2 and `stage.js:407` for stage 3; only stage 1
omits it. **The sentence is now false for two of the three implemented stages**, and its stated
reason (`#009fff` is video-derived and snapping would move it to `#00a4f7`) is a **stage-1-only**
argument. Behaviour is correct; the *text* is the defect, and its form is the dangerous one — a
reader who takes the comment at its word concludes the sky is outside the ladder regime
altogether. **Cross-lane ask: narrow the sentence to stage 1.**

---

## 5. JOB 5 — the acquisition list

It stood at five. **It stands at SIX, and two things are deliberately kept OFF it.** The list is
footage we do not have; a measurement we have not run is not an acquisition, and filing it as one
records work as blocked when it is merely undone.

| # | what to acquire | status |
|---|---|---|
| 1 | true-native **stage-1** frame (sea) | unchanged |
| 2 | true-native **LEVEL astern** frame of the player jet | **widened by R9**: it now also blocks the DRAW-WEIGHT arcade column's second observation. The arcade jet column is **n = 1 and banked**. The night true-native cannot substitute — its jet is inside a 37.8 %W fireball and cannot be isolated (second programme to fail on that frame; recorded so it is not tried again) |
| 3 | isolated arcade **barrel-roll** sprite | unchanged |
| 4 | true-native **DAYLIGHT frame holding an explosion** | unchanged |
| 5 | true-native **NEAR-ASPECT enemy aircraft** | **widened by R9**: also the only route to a DRAW-WEIGHT arcade column for the near enemy, the object the art critic ranks 2nd |
| **6** | **a true-native frame of the CARRIER, the TITLE screen, or a DEATH HULK** (**NEW, R9**) | DRAW-WEIGHT is **unlicensed** on all three. Their only references are 686×480 video, where INK/SPAN is read at 2.14× our native scale **and** needs a mask tolerance that adds ink at low values and removes it at high ones. **Three objects the art critic ranks in his top nine have no drawing criterion at all, and cannot have one from the footage in this repo** |

**Kept off the list, with reasons.**

1. **A direct arcade emission count.** The brief asked for it if the judge's spans do not settle
   it. They do not settle it *tightly* — 0.40–0.74 aircraft/s rests on Little's law with `W` taken
   from GAME_SPEC's existing MEASURED 4–6 s rather than re-measured. **But the footage is already
   here**: `.reference-cache/video/ab2-longplay-60fps.mp4` supports a contiguous decode fine enough
   to track individual aircraft from first appearance to exit across a `STAGE_MAP.md`-verified
   span, which gives emission **and** residence directly and collapses the bracket. Three
   independent routes already agree on the number and nothing in R9 depends on tightening it.
   **Filed in STATUS.md as an owed measurement with its method.** Sampling must be ≤0.1 s
   (ledger row 29's lesson).
2. **A second reader's density count over ≥40 digit-verified frames on a pre-registered grid.**
   ARCADE-PACING's bands are ±2 SE on 63 frames by one reader, corroborated by a second on 18 and
   a third on 24, and all three agree. This would **tighten**, not verify. Also an owed
   measurement, not an acquisition.

---

## 5b. LATE ADDITION — two title-lane candidates, both verified by me, both caught before implementation

Received from the TL mid-round; `judging/R9/lane-title.md` carries the lane's own working. **I
verified both rather than recording them on report, and one came out sharper than reported.**
Ledger rows 42 and 43. New instrument `tools/title_word_height.py`, selftest 4/4.

### 5b.1 The arcade title is not a still — CONFIRMED, and it is worse than "a rotation"

Settled by decoding rather than arguing: ten frames at 1 s from
`.reference-cache/video/ab2-longplay.mp4`, t70–t79, in
`tools/out/criteria-r9/crit-r9-09-ARCADE-title-t70-t79-1s-grid.png`. **Alignment checked before
anything was concluded**: my extracted t74 carries **19 752 colours, identical to
`reference/title-screen-t74.png`**, so the grid is on the published frame's own clock.

| t | the sphere plate |
|---|---|
| 70, 71 | **not visible at all** — the wordmark alone |
| 72 | near **face-on**, a tall narrow slab, the red "II" legible |
| 73 | nearly **EDGE-ON**, a thin horizontal sliver |
| **74** | **the published reference frame** — an intermediate pose |
| 75 | a wide shallow parallelogram |
| 77–79 | swinging **toward the camera**; by t79 the plate fills most of the screen |

**It tumbles AND it approaches**, which matters because the two withdrawn figures fail for
different reasons: *"7.2× too sparse"* fails on the **tumble** (a plate near edge-on looks sparse
because it is edge-on) and *"the balls are ~3× larger"* fails on the **approach** (spheres
measured at the far end of a dolly look small because they are far away). Both withdrawn.
**t72 is the most face-on readable pose in the cycle and is the frame to re-derive from**, with
its phase stated.

### 5b.2 "BURNER is 13.7 % taller" — CONFIRMED as an artefact, with a SECOND cause the lane did not have

The TL attributes it to sphere specular highlights passing a brightness test. **That is real and
I reproduced it. It is not the whole of it, and the other half is present on a perfectly clean
frame.**

**Operator**: per column of a word's row band, the local ink extent; median over inked columns.
This is a **local** height and is invariant to the baseline slope; a whole-band bbox is not.
White ink only (`min(RGB) ≥ 200`, `max−min ≤ 30`), which also excludes the blue A and red B so
the oversized bookends cannot enter a body-height statistic.
**Control**: a 40-row bar translated down a 1-in-4 slope reads **per-column median 40.0** and
**bbox 89**.

| frame | plate behind the wordmark? | FTER | URNER | ratio |
|---|---|---|---|---|
| t70, per-column median | **no** | **80.0** | **78.0** | **0.975** |
| t71, per-column median | **no** | **79.5** | **78.0** | **0.981** |
| t70/t71, **bbox** | no | 104 | 111 | **1.067** |
| t74 (`title-screen-t74.png`), **bbox** | **yes** | 104 | 116 | **1.115** |
| the published figure | — | — | — | **1.137** |

> **The two words' letters are the same height to within 2 %, and BURNER's are if anything
> SHORTER.** The inflation is two artefacts stacked:
>
> 1. **Baseline shear — 6.7 points, on a clean frame, with no plate anywhere near it.** The
>    wordmark is set on a sloped sheared baseline, so **the longer word's bounding box spans more
>    rows at identical letter height.** BURNER is the longer word. **This one survives every fix
>    the TL proposed**, because it is not about contamination at all.
> 2. **The plate's specular highlights — a further 1.067 → 1.115**, and it moves with tumble
>    phase: t72 and t74 inflate BURNER, **t73 inflates AFTER instead** (its band grows 104 → 108),
>    t75 inflates neither much. *Which word gets inflated depends on where the plate happens to
>    be*, which is row 43 contaminating row 42's measurement — one frame, two defects.

**The 21.5 % whole-wordmark shortfall is real and survives**, and its cause is the **missing
oversized bookend letters**, which no height statistic measures.

### 5b.3 The class — **ledger row 29 GENERALISED, and no fourth taxon**

The TL proposed this as a class the ledger does not name: *a measurement of one frame of a moving
object, published as a property of the object.* **I am recording the rule and declining the
taxon, for the same reason I declined the R8 one in §3.6** — consistency matters more here than
either individual call.

**Row 29 already owns the time axis**: *"a negative about a periodic behaviour is only as good as
the sampling interval it was taken at"*, earned when the arcade's 0.267 s respawn flash aliased
away under four independent passes. Row 43 is its **positive counterpart** — sampled once, so
motion that exists was invisible — and the remedy is the same remedy. By the R8 judge's own test,
*a failure whose remedy is identical to an existing class's remedy is an instance of that class.*

**But the TL's instinct that this one is different is right about something, and it is worth
naming precisely.** Every other defect in this ledger is visible **in the thing the operator was
pointed at**: read the stage digit, crop the mask, look at the region. CLAUDE.md's own rule —
*"crop it and LOOK once"* — finds all of them. **It cannot find this one.** A still of a tumbling
plate is pixel-for-pixel indistinguishable from a still of a static one. The only way to find it
is **to decode a second frame**, and no rule asked for that. So the right output is not a new
taxon but **a new citation field**:

> *subject static — yes / no, and if no, the phase the frame caught.*

One field. It would have caught both rows.

### 5b.4 The acquisition list does NOT change, and I am pushing back on that specifically

The TL suggested the title sphere needs a **tumble sequence** on the acquisition list. **It does
not: I extracted one this afternoon from footage already in the repo**, which is how row 43 was
settled. What is genuinely unavailable is a **true-native** title frame, and that is already
acquisition item 6 (carrier / title / hulk). **Item 6 gains a condition rather than a sibling:
a single true-native title still is INSUFFICIENT for the sphere plate unless its phase is
stated** — a native still of an edge-on pose would reproduce row 43 at higher resolution.

The phase census itself is an **owed measurement**, not an acquisition, by the same rule that
kept the direct emission count off the list in §5.

---

## 5c. LATE ADDITION — the drawing lane's controls came back, and one of my own figures was wrong

### 5c.1 Bank-invariance: CONFIRMED, by 24×, and the reconciliation is the better half

`tools/art/inkspan.py --selftest` control 6, re-run by me on this tree (**7/7 PASS**). One drawing
rigidly rotated through eight angles — the right model, since from astern a bank rotates in the
image plane and does not foreshorten in span:

> **CV: INK/SPAN 1.2 %, DENS 1.7 %, RP90 5.3 %, RSW 18.4 %, against bbox fill's 28.7 %.**
> **INK/SPAN is 24× more rotation-stable than fill.** §2.5's blind spot 5 — "the invariance claim
> is NOT established" — is **withdrawn**; the claim is published.

**READ THE PER-STATISTIC CVs ABOVE AS PROPERTIES OF THIS SYNTHETIC, NOT OF THE STATISTICS.** The
headline — INK/SPAN rotation-stable, 24× better than bbox fill — **stands and is confirmed on the
real subject** (arcade night jet, 8 angles: INK/SPAN CV 0.33 %). But **RSW's 18.4 % does not
survive contact with the real aircraft, where it reads 2.70 %** against RP90's 1.82 %. The EDT is
quantised, so whichever percentile happens to sit near a level jumps, and the stroke width of the
synthetic decides which one that is — a 3 px-blade variant reverses it to RP90 15.92 % / RSW
0.51 %. Full correction and the rule it earns: **§5c.3's correction box, and §5c.10.**

**And the arm I actually asked for reads only 1.5×, which proves my own licence condition rather
than weakening the claim.** Over our nine *authored* bank cells, INK/SPAN CV is 9.9 % against
fill's 15.0 % — because `poseTransform` applies `SHRINK = 0.34` and span runs 65 → 99, **so those
cells differ in SIZE as well as bank, and INK/SPAN is dimensioned.** The art critique's own
13.15 → 10.93 is `SHRINK`, not invariance failing. **Three independent routes now require the
matched-span rule**: the 2× scale control, this reconciliation, and the far-enemy comparison.

### 5c.2 My arcade jet figures were an UNDER-COUNT. Corrected.

Three implementations read the same true-native jet and disagreed by **2× on RP90**. I chased it
rather than publishing the spread, and the cause is one operator difference:

| mask | ink | INK/SPAN | RSW | RP90 | bbox fill |
|---|---|---|---|---|---|
| 4 exact roles — **what I published earlier today** | 776 | 7.07 | 1.82 | 3.64 | 15.0 % |
| **4 roles + enclosed regions — the licensed rule** | **909** | **8.28** | **2.58** | **7.51** | **17.5 %** |
| `inkspan.py` control 5 (drawing lane) | 984 | 8.97 | **2.58** | **7.52** | — |

**I formed the wrong explanation first and the crop overturned it.** My hypothesis was that
hole-filling fills the sky *between the blades* and so erases the structure the statistic exists to
measure — a clean, plausible, alarming story. **I rendered the 133 added pixels in green
(`tools/out/criteria-r9/crit-r9-10-ARCADE-jet-HOLES-FILLED-IN-GREEN-6x.png`) and looked**: they are
**the two nozzle discs** plus a scatter along the spine. The gaps between the blades are open to the
border and stay open. The discs are drawn in oranges shared with the desert ground, so an exact
palette mask loses them entirely — **and they are the heaviest mass on the aircraft, which is
precisely what `P90SW` exists to measure.** My 3.64 was the thickest *blade*, measured on an
aircraft with its engines deleted.

CLAUDE.md's rule earned its place again: *any "measures zero" result — crop it and LOOK once.*
Mine was a plausible, stable, reproducible number with a compelling mechanism attached, and one
crop killed the mechanism and corrected the number.

**What this buys the criterion, and it is more than a correction.** Once the mask rule matches, the
two independent implementations agree on **RSW to 0.00 and RP90 to 0.01**, while still differing by
**8 % on INK/SPAN and 8 % on ink**. `#840000` **224 px** and `#000000` **135 px** reproduce
*exactly* on both.

> ~~**The scale-free stroke statistics reproduce across independent implementations; the
> ink-count statistics do not.**~~ **WITHDRAWN WITHIN THE DAY — see §5c.6. That agreement was
> between two DIFFERENT masks and existed only because the other side carried a topology bug.
> A cross-validation can agree because two errors cancel.**

Also recorded: **dark-accent share has three live denominators** — 44.7 % (critic, ink 803), 46.0 %
(4 roles, ink 770), **39.5 %** (licensed mask, ink 909). Publish the mask with it and run the same
mask on both sides, or the comparison against our 25.1 % is not like-for-like.

### 5c.3 The gate is RP90, and I am recording WHY the obvious choice is wrong

Control 7, re-run by me: one centred bar against four separated blades at **matched ink and matched
span** — the R4→R8 defect itself — separates by **INK/SPAN ×1.025, DENS ×1.037, RSW ×1.430,
RP90 ×1.811.**

**DENS sees 3.7 %, roughly a quarter of its own background-tolerance band on a video source.** The
statistic that reads most naturally as "how heavy is this drawing" is **nearly blind to the defect
the criterion exists to catch.** So: **gate on RP90**; **quote RSW beside it**; **DENS and INK/SPAN
are reported diagnostics**, INK/SPAN always with its span and its mask.

> **CORRECTED, later in R9 — the REASON given here for quoting RSW beside RP90 was wrong, though
> the ruling is not.** This paragraph originally read *"tolerance-free, but the least
> rotation-stable of the four at CV 18.4 %, so never alone"*. **The 18.4 % is not a property of
> RSW.** Re-measured on the REAL subject — the arcade night-level jet, 8 angles, same method —
> the CVs are **DENS 0.41 %, RP90 1.82 %, RSW 2.70 %**. RSW's rotation CV on the actual aircraft
> is 2.70 %, not 18.4 %.
>
> **The ordering survives and the ruling is unchanged**: RP90 is the more rotation-stable of the
> two on the real subject as well, so every axis that can arbitrate still favours it —
> discrimination ×1.811 vs ×1.430 (control 7), rotation 1.82 % vs 2.70 % (real subject). **RSW is
> quoted beside RP90 because its BACKGROUND-TOLERANCE behaviour is complementary** (spread 1.6 %
> against RP90's 4.5 % over tol 8–64), **not because it is unstable.**
>
> **Why the 18.4 % is an artifact, and the rule it earns.** The EDT on a pixel grid takes discrete
> values, so a percentile of it JUMPS when the population crosses a level — and **which** percentile
> straddles a step is set by the drawing's stroke width. Control 6's synthetic puts RSW on a step.
> A 3 px-blade synthetic of mine puts **RP90** on one instead: **RP90 CV 15.92 % against RSW
> 0.51 %**, a clean reversal. Each side can build a synthetic that condemns the other's statistic.
>
> **RULE (ledger): no stability claim from a synthetic whose stroke width the author chose.**
> Measure stability on the real subject. And **publish the discrete EDT level set** any SW/P90
> figure lands on — more than one member across poses or tolerances means the figure is on a
> knife-edge and must be quoted as a RANGE, not a point. `tools/inkspan_arcade.py --selftest`
> arm 6 prints it (3 px blades offer levels `{1.0, 2.0}`; 9 px offer `{1,2,3,4,5}`).
>
> **Tested and rejected, recorded so it is not retried:** RMEAN = 100·2·mean(EDT)/span should be
> immune to straddling, since a mean crosses a quantisation step smoothly. It is **worse on every
> axis** — rotation CV 3.89 % on the real jet (worst of the four), tolerance spread 5.5 % (worst),
> discrimination 2.60× against RSW/RP90's 3.11×. The mean is dominated by the thin-stroke
> population, and the *count* of thin pixels is precisely what resampling moves.
>
> **How I got here is the part worth keeping.** Asked to reconcile, I formed a position WITHOUT
> re-reading this section and recommended gating on RSW and RP90 jointly — arguing against my own
> published ruling. The argument rested on my own matched pair returning **RSW ×3.112 and RP90
> ×3.112, identical to three decimals**, which I read as "neither control can arbitrate". It is an
> artifact: **both my subjects are UNIFORM thickness, so P90 = 2.00 × SW on each by construction**
> and the ratios cannot differ. Control 7's subjects are not uniform, which is exactly why its
> ratios *do* differ and why it CAN arbitrate. **An identity to three decimals should have been
> read as a defect in the control, not as a finding about the statistics.** Third control in this
> round that could not fail the way it was built, and the second of those is mine.

**And a seventh blind spot that the selftest cannot see.** Control 7's four blades are separated by
gaps **open to the border**, so the enclosure rule does not touch them and control 7 passes
identically under both mask rules. **The control is valid and does not cover the case that cost 2×
on the real subject.** A mask rule has to be fixed by looking at the subject, not by passing a
synthetic.

### 5c.4 The far LOD: a real result and an honest bound I am recording as a bound, not a gap

`drawRearFar()`/`drawHeadOnFar()` went **100.0 % → 56.3 % bbox fill**, verified by instrument
(`tools/art/far_lod_preview.mjs`) rather than by reading the source — which matters, because
reading the source is exactly what the declared exception (§4.3) defeated for five rounds.

**The arcade's 30.6–34.6 % is unreachable while the FULL-WIDTH-BAND INVARIANT stands**: three
full-width rows of eight is **37.5 % before a single shaped pixel.** I checked the lane's
arithmetic rather than accepting it — with nearest filtering a quad of height `h` samples texel
rows `floor((i+0.5)·8/h)`, and rows **2, 3, 4** full-width are hit by every height 1–8 (h=1→4,
h=2→2, h=3→4, h=4→3, h=5–8→2). **The invariant was not weakened**, both measured R3 failures
survive, and **56.3 % is this design's floor, not a miss.** The only lever is
`DETAIL_SWITCH_NATIVE_PX`, a combat-lane call about the span gate, not taken.
**Do not open a gap for the residual.** *"An honest bound or a withdrawal is an accepted
deliverable."*

### 5c.5 The `drawRearFar()` comment

Independently re-cropped by the drawing lane at native scale and my reading confirmed: a pale
horizontal wing line ~2 rows tall and ~10 px wide, wider than its body, dark core, open sky above
and below, separate fin stripe. The source comment now **quotes the retracted sentence in full
beside what the crop shows**, citing both crops — which is the right form, because the next reader
sees the claim and its refutation together rather than a silently corrected claim.

### 5c.6 The agreement I published was spurious, and the bug was not mine

`drawing-r9` found a **topology bug in its own `fill_holes`** and reported it unprompted. I
reproduced all of it independently, on both crop boxes:

> **8-connected background flood → +55 enclosed px (831). 4-connected → +133 (909).**

The rule: **the background flood and the foreground component must not both be 8-connected.** In
digital topology one of the pair must be 4-connected or the Jordan-curve property fails — a
**diagonally-stepped ring encloses nothing** under an 8-connected flood, and the arcade's nozzle
discs are bounded by exactly such a ring. **78 px, 8.6 % of the subject, on a choice neither lane
had written down.** My own implementation paired 8-connected foreground with a 4-connected flood,
which is the valid pairing — by luck rather than by a stated rule, so the rule is now stated.

**And the consequence lands on my own argument, not theirs.** §5c.2 published *"the scale-free
stroke statistics reproduce across implementations; the ink-count statistics do not"*, citing
RSW agreeing to **0.00** and RP90 to **0.01**. Those two readings were **two different masks**,
and they agreed only because the invalid flood shrank the wider mask onto the narrower one's
reading. With the bug fixed and the masks still different:

| | across **implementations**, one mask rule | across **mask rules**, one implementation |
|---|---|---|
| ink | **909 vs 909 — exact** | 909 → 1056, **+16 %** |
| RSW | 2.58 vs 2.60 | 2.58 → **3.61, +40 %** |
| RP90 | 7.51 vs 7.58 | 7.51 → **9.73, +30 %** |
| INK/SPAN | — | 8.28 → 9.54, **+15 %** |

> **The stroke statistics are the MOST mask-sensitive of the four, not the least.** The exact
> opposite of what I published.

**The gate on RP90 survives, and it is worth being precise about why**: it never rested on mask
robustness. It rests on control 7 (distribution separation ×1.811 where DENS sees 3.7 %) and
control 6 (rotation CV 5.3 %). **What is withdrawn is a supporting argument I invented, not the
recommendation the drawing lane made.** The practical effect is that *"a gate on RP90 is a gate on
RP90-under-a-named-mask"* goes from a pedantic caveat to the load-bearing clause.

**The general rule, and it is new to this repo.** REFERENCE already carried two cross-validation
rules — it cannot see an input-identity defect over a shared input; it can over independent
inputs. This is the third: **cross-validation can AGREE because two errors cancel.** An agreement
is evidence only when both sides are specified to the level the statistic is sensitive at. Added
to ledger row 38's box with the measured instance.

**One mislabel to flag, because it is the same trap one layer down.** The drawing lane's message
reports *"RSW and RP90 agree across the two rules to 0.02 and 0.07"*. Those deltas (2.58 vs 2.60,
7.51 vs 7.58) are across the two **implementations** under **one** rule. Across the two **rules**
the same statistics move 40 % and 30 %. The numbers are right and the label is not — reported
back rather than silently corrected.

**And a control that passed vacuously, reported by its own author.** The drawing lane's first
attempt at a control for this rasterized a *circle*, which came out 4-connected-closed, so both
floods filled it identically and the control passed while testing nothing. That is
`criteria-fix-2`'s own control-D failure, committed one message after declaring the suite clean.
Control 8 now uses a one-pixel diamond ring (8-conn flood leaves 28 px, 4-conn fills 113).
**Two lanes have now written a synthetic that could not fail in the same round.**

### 5c.7 The mask rule, settled against ground truth — and I had licensed two rules in one box

The drawing lane challenged the membership rule on the grounds that the choice is worth 40 % on
RSW, and tested both against the only ground truth that exists: **our own sheets' alpha channel.**
I re-measured independently on `src/assets/sprites/player-f14.png`, all nine day cells:

| day cell | alpha>0 px | four roles, raw | **four roles + largest-component** | achromatic rule |
|---|---|---|---|---|
| 0 | 523 | 66.3 % | **36.9 %** | 94.3 % |
| 1–3, 5–6 | 670–958 | 61–62 % | 59.3–61.6 % | 93.1–93.5 % |
| **4 — the LEVEL pose** | 1 056 | 57.6 % | **20.9 %** | 92.4 % |
| 7 | 668 | 61.7 % | **34.4 %** | 93.4 % |
| 8 | 533 | 63.0 % | **41.7 %** | 93.6 % |

**Their 20.9 % on cell 4 reproduces to the decimal**, and the mechanism is step 2, not step 1:
the four-role mask **fragments** the level airframe and the largest-component step discards all
but one piece — **57.6 % → 20.9 % from the component step alone.** On the arcade's jet the same
rule recovers **86.1 %**, because that aircraft really is mostly those four tones.

> **A criterion comparing two sides through a mask ~86 % faithful on one and 21–62 % faithful on
> the other, POSE-DEPENDENTLY, is not comparing like with like.** Request granted: the
> **achromatic rule is the licensed one**, and the reason published is the ground-truth test, not
> the tone census.

> **REOPENED AND SUPERSEDED — §5c.9. "The achromatic rule" unqualified is wrong for the NIGHT
> palette, and there is no single rule. The licence is now PER SUBJECT AND PER PALETTE.**

**And the challenge exposed a defect of mine.** My criterion box licensed *"the four airframe
roles plus enclosure"* **eight lines above** licensing the achromatic decision procedure — **two
rules, one box, on the operator every figure in it turns on.** That is **ledger row 34's exact
defect, committed inside the repair for it**, by the lane that maintains the ledger. Corrected:
the box now names one rule and says which one it named first and why that was wrong.

**New binding rule, and it generalises past this statistic**: *a mask rule is validated against
ground truth on BOTH sides of a comparison.* Only our own sheets have ground truth; the arcade
side can only be checked by cropping and looking. **A rule never tested against our own alpha is
untested**, and this pose-dependence is invisible to every statistic in REFERENCE.

*(Residual, declared: the achromatic rule misses ~7 % on our sheets — afterburner flame
`#ef7300` 56 px and `#ffd600` 16 px, plus the `#e694f7` canopy fleck 8 px. Step 3's enclosure fill
recovers the flame where it is enclosed, the same mechanism that recovers the arcade's nozzle
discs. The canopy fleck is saturated magenta and unrecoverable, costing the arcade reading ~0.9 %
of ink.)*

### 5c.8 A withdrawn intermediate worth more than most published figures

The drawing lane computed ours/arcade under both mask rules and the **ratio appeared to move
300 %**. It does not — that is the four-role rule collapsing on *our* side only, pose-dependently,
exactly as the table above shows. **They cropped the masks before believing it**, and it is in
their report as a withdrawn intermediate rather than as a finding.

That is CLAUDE.md's *"any 'measures zero' / 'doesn't move' / '100 %' result: crop it and LOOK
once"* applied to a result that was none of those — it was a large, alarming, perfectly
reproducible number. **The rule's trigger list is too narrow.** Both R9 instances of it —
mine (the hole-fill hypothesis) and theirs (the 300 % ratio) — were clean, stable, plausible
figures with a compelling mechanism already attached, and in both cases one crop killed the
mechanism. Worth a round's attention: **the figure most worth cropping is the one you have
already explained to yourself.**

---

## 5d. The pacing lane's results, and two corrections to ARCADE-PACING from its first real use

**Five of six rows pass on a kill-rate-matched pilot; one of six passed before, on every arm.**
`MAX_ALIVE` 14 → 6, `WAVE_GAP` 0.9–1.6 s → 7–13 s, dispense → GAME_SPEC's own 0.20–0.50, and the
dead justification deleted rather than improved. Emptiness **0.0–3.1 % → 33.1–48.0 %** (`demo`)
and **59.0–67.9 %** (arcade-cadence). Emission **2.71–3.34 → 0.567–0.700/s**. My point 5 was
confirmed independently before they changed anything: `gunSubReadable` **0.0 % on all 12 arms**
on the committed tree.

**They also did the thing the criterion asked for and I had not**: added a pilot whose kill rate
matches the arcade's (0.46–0.57/s against the expert's 0.42–0.54), after noticing their default
arms fire a missile every 0.4 s — **2.5 lock-ons/second, with no span gate** — which truncates the
very residence the rows measure. *The criterion's arm was wrong and the lane using it found that,
which is this project's dominant way of finding defective criteria (R7 rows 26–29).*

### 5d.1 CORRECTION — ARCADE-PACING had a stage-population defect and it is class 2

**Their finding, and it is the important one in the message:** the arcade's density **ramps hard
with stage**, and **every capture this project takes is stage 1, where the arcade sits at roughly
double its all-stage mean.** Their own count (rule written first, 5 s grid, stage digit verified
on all 24 frames, **stages 3, 10 and 11 never counted by anyone here**) gives stage 1 **33.3 %**,
stage 3 **0.0 %**, stage **10 66.7 %** (3.67 aircraft/frame — the busiest anything counted in this
repo), stage 11 **0.0 %**.

I re-ran my own census per stage to see how far this goes:

> **Readable-presence ranges 0.0 % to 66.7 % across stages; emptiness 18.2 % to 55.6 %. NEITHER
> is stage-robust** — I had hoped emptiness would be and it is not.

**So ARCADE-PACING as I published it would have gated a stage-1 capture against an all-stage mean
half its size, and told a lane to build a stage 1 emptier than the arcade's own.** That is a
validated operator pointed at the wrong population — **ledger class 2, in a criterion I wrote
this round to replace one that failed the same way.** Binding rule added: **match the stage
population on both sides.**

**And the honest consequence, which is that the stage-1 gate is OPEN.** The stage-1 arcade column
is **n = 9**; at 44.4 % its ±2 SE is **11.3 %–77.6 %**, which excludes nothing. A second reader
gets 33.3 %. **The usable statement is "33–44 % on small n against 19.0 % all-stage", and the
stage-1 gate is withdrawn pending the owed frame count** — which now has a sharper purpose than
"tighten the bands". *Do not split the difference and invent a number.*

### 5d.2 CORRECTION — Route B was a weaker bound than I published

The pacing lane flagged that AB2's **HIT counter also increments for ground targets**, citing
stage-10 frames. If so, the 0.48–0.54 kills/s I published as a *lower bound on aircraft emission*
bounds **all** kills instead.

**I checked what I could and got one weak observation in their favour's opposite direction.**
Stage 1 is not free of ground objects — `crit-r9-11-ARCADE-stage1-span-grid.png` shows a rising
plume at t105 and a grey smoke column at t114 — and **HIT reads 11 at both t108 and t114 across
that second detonation**, i.e. a visible ground event with no increment. t105 is ambiguous. **A
3 s grid cannot attribute increments** and settling it needs a pass keyed to each HIT step at
≤0.1 s (row 29's rule).

> **Disposition: Route B demoted from a bound to weak corroboration; the band is UNCHANGED**,
> because its floor comes from Route A (aircraft-only hand count through Little's law) and Route C
> (GAME_SPEC's own ADOPTED 0.67/s). **The error's direction only widens the gap** — if HIT
> over-counts aircraft kills the arcade emits *fewer*, against our 3.17–3.20/s. Row 37 is not at
> risk; the corroboration was weaker than stated and that is now on the record.

**A second refinement from their telemetry, flagged not folded**: they measure arcade residence at
**~3.3 s** where Route A used GAME_SPEC's 4–6 s. At `W = 3.3`, `λ = 1.270/3.3 = 0.385/s`, just
under the published 0.40 floor. Band held until residence is measured directly; **a future
revision is more likely to move it down than up.**

### 5d.3 Two rows re-scoped rather than failed

**Mean-on-screen names its pilot, and the two arms straddle the band** — 0.63–0.90
(kill-rate-matched) against 1.58–1.76 (`demo`), gate 0.9–1.6. Two pilots, not two builds; the same
warning GAME_SPEC §2's deaths/min row already carries.

**And it is not the spawner's row to close.** Their `idle` residence above the 3 %W floor is
**3.05–3.16 s** against the arcade's ~3.3 s — **our size-vs-depth geometry already matches**, which
confirms from the other side that the population, not the scaling, was the defect. At the arcade's
kill rate ours collapses to 0.99–1.31 s because **missiles are 47–77 % of kills and carry no span
gate** at a 22 %W radius (ledger row 41). **Raising emission to refill this row would break the
three rows that now pass.** The lever is the missile economy, named in the criterion box and not
taken by them — correctly, it is not their file.

### 5d.4 Run-length goes in the criterion, and it is their contribution

> *A percentage cannot tell a sky that empties once for eight seconds from one that flickers two
> hundred times.*

**Before, the longest empty run in a 90 s run was 0.32 s and the median continuously-occupied run
was 86.5 s** — an emptiness figure near zero *and* a sky that never actually emptied. The
percentage alone would have been satisfied by a flicker. Added to the criterion box.

### 5d.5 A second withdrawal-on-measurement this round

They built the player-corridor fix for the art critique's rank-1 item and **withdrew it on a
one-lever measurement**: the population cut alone halves >30 % player occlusion (10.7 → 4.8 % over
84 flight frames, 5 spacings), the corridor moved that rate **not at all**, and it made the worst
frame worse (50.7 → 65.0 %). Shipped inert at 0 with the arms and the refutation in the file.
*"An honest bound or a withdrawal is an accepted deliverable."* Second one this round, after the
far-LOD floor.

### 5c.9 REOPENED — "the achromatic rule" was the wrong thing to license, and the night sheet proves it

The drawing lane reopened the mask licence before it shipped: the ground-truth table that settled
§5c.7 was **the DAY sheet only**, and a third lane extended the test to NIGHT. **I re-ran it
myself on `src/assets/sprites/player-f14-night.png`, nine cells:**

| rule | recovery vs `alpha > 0` (mine) | (drawing lane's) |
|---|---|---|
| day rule, keyline **not** named | **44.0 – 50.9 %** | 28.1 – 34.0 % |
| day rule, `#425284` named | **77.7 – 83.0 %** | 81.9 – 98.2 % |
| **value rule `max(RGB) > 30`** | **100.0 % on every cell** | 100.0 % |

**The value rule reproduces exactly; the achromatic readings differ in magnitude and agree in
direction, and my loss on the level cell is WORSE than reported — 22.3 % against their 18.1 %.**

**The mechanism, from the tone census.** The night blue-greys are not achromatic: `#425284`
**sat 0.500**, `#6373a4` 0.396, `#7384b5` 0.365, `#c594f7` 0.401 — **44.0 % of the night level
cell's ink sits at or above the 0.35 floor.** Naming the keyline is not enough, because
`#6373a4` alone is 12.8 % of the ink.

**And I checked the obvious fix against the arcade before rejecting it, which is where the case
got stronger than they put it.** Raising the floor to admit the night tones destroys the day
anchor, because the **desert terrain** starts qualifying:

| sat floor | arcade day jet ink | **RP90** |
|---|---|---|
| **0.35** | **1 056** | **9.73** |
| 0.50 | 1 317 | 8.48 |
| 0.55 | **1 368 (+29.5 %)** | **8.31 (−15 %)** |

**+29.5 %, not the +14.3 % reported — and it moves the GATED statistic by 15 %.** Symmetrically,
the night rule cannot be used by day: `max(RGB) > 30` covers **98.6 %** of the arcade's daylight
crop. **Neither rule generalises. That is the finding, and the saturation threshold is retired as
a GENERAL rule rather than retuned.**

> The licence is now: **day palette over saturated terrain → achromatic; night palette over black
> → value rule; any new subject → an enumerated tone list, ground-truth tested before use.** Steps
> 2 and 3 (largest component, 4-connected enclosure fill) are universal; **step 1 is not.**

**Three rounds of settlement on one operator, each time by a different lane finding the previous
settlement too narrow** — I licensed four roles, they showed it fails on our day sheet, a third
lane showed the replacement fails on our night sheet. **Each step was ground-truth tested and each
test was run on a population the previous one had not covered.** The generalisable rule is theirs
and it is now binding: *ground-truth tested on every palette variant it will be applied to, not
merely on both sides of one comparison.*

### 5c.10 A scope limit on a standing project rule — with two cautions the finding needs

*"Native outranks the upscale"* has driven several retirements here (ledger rows 16, 17,
acquisition items 1–6) and **every one of them is a cardinality or palette claim.** The drawing
lane and `criteria-fix-2` showed it does not transfer to a **thickness** statistic: `SW`/`P90SW`
quantise on the EDT's level set, so on the native grid a percentile **jumps between levels**
`{2.0, 2.83, 4.0, …}` as the pose changes. Arcade night jet, same subject, same mask, same
operator: pose CV **0.00 %** at 686×480 (one level, `{6.0}`) against **10.73 %** on the native
grid. The point is right and belongs in REFERENCE.

**Two cautions I added, because the obvious reading of it is wrong in both directions.**

1. **A CV of 0.00 % on a quantised statistic is a RESOLUTION REPORT, NOT A STABILITY REPORT.** It
   cannot tell "stable under rotation" from "pinned to one quantisation level" — and it is a
   *"doesn't move"* result, which CLAUDE.md requires be cropped before it is quoted. **Binding:
   publish the number of distinct EDT levels the percentile took across poses beside any pose CV.**
   One level and a 0.00 % CV is a single observation wearing a statistic's clothes. The drawing
   lane's framing — *"the upscale has the stabler reading"* — cannot be distinguished from
   *"the upscale's reading is pinned"* on the evidence given.
2. **It is not a licence to prefer the upscale**, whose finer distance quantisation is bought with
   codec blur that moves the mask boundary the native grid does not have.

**And their predictive form is an ESTIMATE, not a bound.** *Expected pose CV ≈ ½ × the relative
gap between the EDT levels the percentile straddles.* It is genuinely useful — it sizes the effect
from one pose, before any sweep — but it is published as `≈` because **it fails to bound on their
own example**: arcade day P90 predicted **2.5 %** against observed **2.73 %**. Reported back
rather than published as stated.

---

> **CONTINUED PAST THIS POINT — see §5c.9 and §5c.10, appended below §6.** The mask rule settled
> in §5c.7 turns out to be **palette-specific** and recovers only 81.9–98.2 % of our night sheet
> (§5c.9), and the quantisation licence turns out to predict pose stability but **not** from a
> single pose (§5c.10).

## 6. Unresolved, with reasons

1. ~~DRAW-WEIGHT's bank-invariance control has not returned.~~ **CLOSED, §5c.1 — confirmed by
   24×.** What replaces it as the open item is narrower: **the licensed mask rule has been fixed
   on the DAY player jet and on two distant enemies, and on nothing else.** RP90 moves 2× with
   the mask, so every future object needs its mask pinned before its RP90 means anything.
   **"DAY" corrected in from §5c.9** — the rule is palette-specific and the night sheet is not
   covered by the day sheet's licence, which is what I had assumed.
2. **DRAW-WEIGHT is unlicensed on four of six objects** (near enemy, carrier, title, hulk) —
   acquisition items 5 and 6. Named rather than papered over, because creating a second
   criterion with no arcade side is precisely what Job 1 retired.
   **WIDENED, §5c.9: it is also unlicensed on the NIGHT player jet, which I had been counting as
   covered because it is the same drawing as the day jet.** It is the same drawing and a
   different palette, and the licensed mask recovers **28.1–34.0 %** of it against 99.2–100 % of
   the day sheet. That makes it five of seven subjects, and the one that fails is the one
   measured against the only true-native arcade frames in the repo. **No saturation threshold
   fixes both sides** — 0.55 recovers 100 % on both our sheets and inflates the arcade anchor
   14.3 %. The rule needs to become an enumerated per-palette tone list; retuning the threshold
   cannot work.
3. **§1.6's our-side figures are tree `ea3726b` and `pacing-r9` is changing them now.** They are
   published as the baseline the retirement was diagnosed from, not as current properties.
4. **Ledger rows 26, 27 and 28 have now gone two rounds marked "accepted as reported, not
   independently re-derived".** Row 28's three-arm `DEATH_TOTAL_S` isolation in particular is a
   single unreproduced experiment that a shipped gate's stated reason rests on. I did not
   re-derive them either. Carried forward, flagged a third time.
5. **R3's gate was in force for five rounds and nothing in the loop caught it**, including this
   lane in R6, R7 and R8. The mechanism is named in §1.4 and the rule is published, but the
   process question — *why does a criterion get audited only when a lane trips over it?* — is not
   answered by anything I did.

---

### 5c.9 The licensed mask rule is PALETTE-SPECIFIC, and it fails on the night jet

*(5c.9 and 5c.10 were appended after §6 as the exchange with the drawing lane continued past the
first write-up. Left in place rather than reflowed, since §§5c.1–5c.8 are cited by message and by
`interfaces.md` line number. §6's items 1 and 2 carry pointers to them.)*

Three results, in order of how much they move the criterion.

**a. The drawing lane's corrected day anchor reproduces exactly — including its bug.**
I implemented its published tone rule from scratch (achromatic `sat<0.35`, plus `#840000` and
`#000000` by name, largest 8-connected component, then a background flood to fill holes) on
`reference/ab2-arcade-desert.png (80,82,180,142)`:

| flood connectivity | ink | their figure |
|---|---|---|
| 4-connected — the FIXED rule | **1056** | 1056 — exact |
| 8-connected — the topology bug | **1016** | 1016 — exact |

Reproducing the *defect* as well as the correction is the strongest form this check takes: the
40 px is the diagonal leak and nothing else.

**b. The last residual is my own Feret convention.** `feret()` here adds **+1.0 for inclusive
pixel extent**; theirs does not. Removing it, the two implementations agree to three significant
figures on all five statistics: span 109.66 vs 109.70, INK/SPAN 9.63 vs 9.63, DENS 87.81 vs
87.80, RSW 3.64 vs 3.65, RP90 9.82 vs 9.82. **Systematic and silent: 0.9 % on span, 1.8 % on
DENS** (span squared). Pinned here as another "same name, different operator".

**c. THE FINDING. The licensed mask recovers 99.2–100 % of our DAY sheet and 28.1–34.0 % of our
NIGHT sheet.** Ground truth is the sheets' own alpha. The drawing lane's day figure reproduces
exactly (per-cell 99.2–100.0); the night arm is mine and is new:

| | day sheet | night sheet |
|---|---|---|
| achromatic `sat<0.35` | 63.0–72.3 % | 44.0–50.9 % |
| + `#840000` named | 92.4–94.3 % | 44.0–50.9 % — that tone does not exist at night |
| + hole-fill | **99.2–100.0 %** | **28.1–34.0 %** — *worse than before filling* |

**Same aircraft, same geometry, byte-identical alpha planes, one palette swap.** The night
blue-greys are not achromatic — `#425284` sat **0.50**, `#6373a4` **0.39**, `#7384b5` **0.36** —
and together they are **45 % of the sheet's ink**. The hole-fill then *loses* ground because
`largest_component` on a mask that fragmented keeps one fragment and the fill only closes that
fragment's holes.

**This is not hypothetical. The night jet is the subject measured against the only true-native
arcade frames this repo holds** (R5 I23), and R5 established day and night are *the same drawing
by construction* — one function generates both sheets. So the licensed rule would report a large
day/night DRAW-WEIGHT difference on a drawing that has none.

**c-bis. CORRECTED — my 28.1–34.0 % was a REIMPLEMENTATION GAP, and the finding survives it.**
I rebuilt the drawing lane's rule from its *arcade day* tone list and assumed `AIRFRAME_EXTRA`
was the two hexes published there. It names **three**, and the third is `#425284` — the night
keyline, in for exactly this reason. With it the rule recovers **81.9–98.2 %**, not 28–34 %.
My error, same class as the rest of this round: a reimplementation faithful to what I read and
not to what existed.

**The lane then found the real bug itself and retracted a published inference.** Even with the
keyline named the achromatic rule loses **18.1 % of the night LEVEL cell**, and `inkspan_jet.py`
was reading our night sheet with it, so every night figure it published came from that cell. Its
own mask-equivalence control had been printing the 23 % cross-term for two days with only the
diagonal terms gated. Retracted: *"the night sheet lands at DENS 86.3 — on the arcade's banked
anchor of 87.8 — strong evidence the day-sheet excess is the `#840000` rim rather than the
planform."* Both the figure and the inference were mask artefacts.

**c-ter. The corrected figures reproduce — and they do not mean what they are being read to mean.**
Day **106.83** / night **107.65** (the lane reports 106.8 / 107.6). But measured against the
sheets' own **alpha**, which is what a mask is trying to recover:

| LEVEL cell | ink | span | DENS | RSW | RP90 | recovery |
|---|---|---|---|---|---|---|
| day, **alpha ground truth** | 1056 | 99.05 | **107.65** | 4.52 | 10.30 | — |
| night, **alpha ground truth** | 1056 | 99.05 | **107.65** | 4.52 | 10.30 | — |
| day, achromatic + 3 named | 1048 | 99.05 | 106.83 | 4.52 | 10.10 | 99.2 % |
| night, value `max(RGB)>30` | 1056 | 99.05 | 107.65 | 4.52 | 10.30 | 100.0 % |

**The two sheets' alpha planes are byte-identical** (verified: 0 differing alpha pixels, 6 932
differing RGB) **and their ground-truth statistics are the same number, not similar numbers.** So
the 0.7 % day/night gap is **the day mask's 0.8 % miss, arithmetically** — recovery determines the
figure. **On our own sheets a day-vs-night DRAW-WEIGHT comparison can only ever measure mask
recovery, never drawing weight**, because the geometry is identical by construction. It is a
**mask test wearing a drawing test's units**, and must not later be upgraded into evidence about
the rim or the planform.

**c-quater. The two mask rules are FORCED into a pair — each fails where the other works.** The
drawing lane argued the value rule is exact at night. It is, and the converse also holds:

| | achromatic + 3 named | value `max(RGB)>30` |
|---|---|---|
| **day sheet** | **99.2–100.0 %** | 84.4–98.3 % |
| **night sheet** | 81.9–98.2 % | **100.0 %** |

Cause of the day failure is exact: the day keyline is `#000000`, `max(RGB)=0`, below the `>30`
cut — **581 px of outline dropped**, where the night sheet has **zero** pixels under it. So the
two-rule design is forced by measurement, not chosen for convenience.

**CAVEAT, and it is the per-subject clause applied to the replacement rule.** The value rule's
100 % is measured on the **authored sheet**, whose background is transparent. On an in-game or
arcade night *frame* the black sky is correctly excluded, but **city-light speckle and the HUD are
both >30 and would be admitted** — and stage 3 is precisely the dense-speckle case. **The value
rule is licensed on the night sheet and NOT on a night frame.**

**d. And no threshold fixes both.** Swept:

| sat threshold | day sheet | night sheet | arcade day-bank anchor |
|---|---|---|---|
| 0.35 | 99.2–100.0 % | 28.1–34.0 % | ink 1056, DENS 87.8 — the licensed value |
| 0.50 | 100.0 % | 32.3–66.0 % | — |
| 0.55 | 100.0 % | **100.0 %** | ink **1207**, DENS **100.4** — **+14.3 %**, desert admitted |

0.55 is a cliff, not a gradient (`#425284` sits at exactly 0.50). It fixes both our sheets and
**inflates the arcade anchor by 14.3 %**. **A saturation threshold is not a portable mask rule** —
it is tuned jointly to one palette and one background, and the two subjects the criterion must
compare share neither.

**Noted in passing, because it qualifies a robustness claim rather than contradicting one.** On
the arcade crop **RSW is completely threshold-insensitive** (3.65 at every threshold 0.35–0.60)
while INK/SPAN and DENS move 14 % and RP90 3.2 %. The drawing lane's table shows the opposite
ordering — RSW +40 %, ink +16 % — because it perturbs the **hole-fill connectivity**, which
thickens every drawn mass and so hits a *local-thickness* statistic hardest, where this perturbs
the **saturation cutoff**, which adds marginal edge pixels and so hits *ink* hardest. **A mask
robustness claim must name WHICH mask degree of freedom it varied**; "mask-sensitive" without
that is two different statements.

**What it does to the gate.** The ruling stands — RP90, RSW quoted beside it — and the
load-bearing clause extends:

> **A gate on RP90 is a gate on RP90-under-a-named-mask, and the mask is named PER SUBJECT AND
> PER PALETTE, ground-truth tested on every palette variant it will be applied to — not merely
> on both sides.**

The licensed rule is **fixed on the day player jet and two distant enemies and on nothing else**,
which was already open item 2; it now carries a *measured* failure rather than a caution. The
direction out is an enumerated per-palette tone list — what the drawing lane already does for the
arcade day crop, where our side's authored tones are known exactly — and retiring the threshold
as the general rule rather than retuning it. **Not done, and not mine to ship.**

**e. The withdrawn claim, carried.** *"The scale-free stroke statistics reproduce across
implementations; the ink-count statistics do not"* is **withdrawn at source** (§5c.6) and the
drawing lane reports having repeated the mislabel too. Measured properly the direction reverses:
across mask **rules**, RSW +40 % and RP90 +30 % against ink +16 % — **the stroke statistics are
the MOST mask-sensitive of the four**, because SW is a local thickness and admitting a few
mid-tones thickens every mass. Anyone still citing the original sentence should drop it.

### 5c.10 The quantisation licence is PREDICTIVE, and it explains a 10× disagreement

**The disagreement first.** The drawing lane reports the arcade night-level jet at rotation
**CV RSW 0.22 % / RP90 0.36 %**; §5c.3's correction box publishes **2.70 % / 1.82 %** for the same
crop. Chased rather than left standing. It is **not** the hole-fill (47 px here; RSW 2.70 → 2.42).
**It is measurement scale:**

| same crop, same mask, same 8 angles | RSW CV | SW levels straddled |
|---|---|---|
| stored 686×480 | **2.70 %** | `{5.66, 6.0}` |
| native-converted (÷2.14375) | **17.28 %** | `{2.83, 4.0}` |
| 2× of stored | 3.34 % | `{10.0, 10.77}` |

**One subject, one mask: RSW's rotation CV runs 2.70 %–17.28 % on measurement scale alone.** And
17.28 % is essentially the retired 18.4 % — reached here on the *real* aircraft rather than a
synthetic. So the retirement of 18.4 % *as a property of RSW* stands, and the figure turns out to
be reachable on a real subject too. **Neither lane's reading is wrong; "the rotation CV of this
jet" is not a property of the jet.**

**The useful half: the level set PREDICTS the CV, from one pose.**

> **Expected pose CV ≈ ½ × (relative gap between the EDT levels the percentile sits between).**

| case | levels | rel gap | predicted | observed |
|---|---|---|---|---|
| real jet @686 RSW | `{5.66, 6.0}` | 5.8 % | 2.92 | 2.70 |
| real jet @686 RP90 | `{11.31, 11.66, 12.0}` | 5.9 % | 2.96 | 1.82 |
| real jet @native RSW | `{2.83, 4.0}` | 34.3 % | 17.13 | 17.28 |
| real jet @2× RSW | `{10.0, 10.77}` | 7.4 % | 3.71 | 3.34 |
| 3 px blades RSW | `{2.0}` | 0.0 % | 0.00 | 0.51 |
| 3 px blades RP90 | `{2.83, 4.0}` | 34.3 % | 17.13 | 15.92 |
| 9 px blades RSW | `{4.47, 6.0}` | 29.2 % | 14.61 | 13.80 |
| 9 px blades RP90 | `{8.0, 8.25, 8.49}` | 5.9 % | 2.97 | 2.12 |

**Mean absolute error 0.66 points over eight cases spanning 0.5 %–17.3 %.**

**CORRECTED IMMEDIATELY, and the correction matters more than the result.** The table above uses
the level set gathered **across the poses** — which needs the sweep, so it *explains* a CV, it does
not *replace* measuring one. I first published this as "readable from a SINGLE pose, a conservative
upper bound" and then tested that claim. **From one pose it is a SCREEN, not a bound:**

| subject | stat | predicted from 1 pose | observed CV | |
|---|---|---|---|---|
| arcade night jet | RSW | 2.63 % | 2.70 % | ok |
| arcade night jet | RP90 | **0.69 %** | **1.82 %** | **UNDER by 2.7×** |
| 3 px blades | RSW | 33.33 % | 0.51 % | over by 65× |
| 3 px blades | RP90 | 33.33 % | 15.92 % | conservative |
| 9 px blades | RSW | 20.00 % | 13.80 % | conservative |
| 9 px blades | RP90 | 14.29 % | 2.12 % | conservative |

It fails **in both directions**: a percentile sitting on a level at one pose can move to a
wider-spaced pair at another (the under-prediction), and a percentile that never leaves its level
reads as wildly unstable (the 65× over-prediction). **So the sweep stays required for any quoted
figure**; the single-pose number is a cheap flag worth printing and nothing more. `measure()`
returns it as `pred_pose_cv` / `pred_pose_cv_p90` with that limitation in the comment.

**AND THE RULE HAS A MISSING TERM — found by auditing the drawing lane's own confirmation table,
which contained two under-predictions it had described as bounds.** `RSW = SW / span`, and **span
itself moves under rotation**, so the level-gap rule predicts the numerator's variability and is
blind to the denominator's:

| subject | span CV | SW set across poses | SW CV | RSW CV |
|---|---|---|---|---|
| arcade night jet | 0.12 % | `{5.66, 6.0}` | 2.59 % | 2.70 % |
| 3 px blades | 0.51 % | `{2.0}` | **0.00 %** | **0.51 %** — all span |
| 9 px blades | 0.62 % | `{4.47, 6.0}` | 13.63 % | 13.80 % |

On the 3 px case SW is pinned to one level — SW CV exactly 0.00 % — and the whole 0.51 % of RSW CV
is the span term. **So `RSW CV ≈ SW CV ⊕ span CV`, and a level-gap prediction of 0.0 is never
right.** Measured span CV 0.12–0.62 % over three subjects (the drawing lane's two implied rows sit
at 0.37–0.40), so **a ~0.7 % floor covers every subject either lane has measured.** Across both
lanes, **3 of the 4 single-level cases predicted zero and observed nonzero** — the dangerous
quadrant, because one level is exactly when a figure looks safe to quote as a point.

**The floor repairs the single-LEVEL case and still does not make the single-POSE form a bound.**
Second, independent mechanism: **rotation creates EDT levels absent at the reference pose.** The
real jet's P90 set across poses is `{11.31, 11.66, 12.0}` and **11.31 = 8·√2 exists only in the
rotated frames**. A single pose cannot enumerate levels rotation will invent, and no constant
floor repairs that — which is why the arcade RP90 case misses by 2.7× rather than by 0.4 points.

**Final form:** across-pose level set **+ span-CV floor** = a usable bound; single-pose **+ floor
so it never reports 0.0** = a screen; **the sweep stays required for any quoted figure.**

**A RULE CONFLICT THAT MUST BE STATED EXPLICITLY, because the two halves of this document now
pull in opposite directions.** For a stroke statistic, **measure at the scale where the EDT level
gap is smallest** — on this subject the stored 686×480, **not** the native conversion. That is the
opposite of this repo's standing "native frames outrank upscales" rule (ledger row 2 / I11), which
is about **colour levels**: a video frame's palette tops out at `0xff` where the arcade's ladder
tops out at `0xf7`, so a *colour* read off video runs bright. **The two rules govern different
quantities and a reader who applies the colour rule to a thickness measurement lands on the 17 %
reading instead of the 2.7 % one.** Published together, or the next lane picks the wrong one.

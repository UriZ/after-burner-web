# Round 7 — criteria lane (REFERENCE.md / GAME_SPEC.md / STATUS.md)

**Tree state**: started from `e8fed58`, worked on the **shared uncommitted working tree with
four build lanes live in `src/`**. I edited `REFERENCE.md`, `GAME_SPEC.md`, `STATUS.md`, and
wrote new evidence under `tools/out/criteria-r7/` and `judging/R7/`. **I touched nothing under
`src/`, ran no `git commit` / `stash` / `checkout` / `reset` / `push`, and wrote no fixed output
path** — every capture directory under `tools/out/criteria-r7/` is this lane's alone.

**Every our-side number below was measured on captures of a CLEAN CHECKOUT** — the R5 judge's
`53ce86b` set and the R6 judge's `e8fed58` set — never on the live tree, because four lanes are
changing it. Arcade-side numbers need no tree state.

---

## Instrument controls, run before anything was believed

| instrument | control | result |
|---|---|---|
| `tools/measure_criterion_ab.py --selftest` | 13 synthetic controls (flat fill, 1px checkerboard, 2×2 blocks, region gating, horizon fit with and without a cloud) + both arcade natives against their published figures | **PASS**, arcade exact: 138/31/68.72/68.49 and 79/17/83.95/80.24 |
| my own second Criterion A implementation | vs `measure_criterion_ab.py` on the same 73 frames | agree on every frame |
| `tools/measure_value_stats.py --selftest` | grey ramp, saturated-red rejection, `#c5c5ad` = 0.7725, filter boundary, two-blob component | **PASS** |
| my direct VALUE-STAT reimplementation | vs the tool on the arcade crop | agree to **1.1e-16** in S, **0** in V, n=608 both |
| my decile-ladder implementation | arcade `ab2-arcade-huge-explosion.jpg` against REFERENCE's published ladder and FIRE-MASK control | ladder `#9b0304 → #d2050c → #f25908 → #f6d619 → #f7f6e6`, **sat 0.0658** vs published 0.063; mean V 0.8876 / V>0.95 51.6 % / core 8.7 % / mean S 0.8486 vs published 0.891 / 52.3 / 8.8 / 0.848 — **4th independent implementation, reproduces** |
| black/duplicate sweep | all judge-r5 and judge-r6 sets I read from | 0 black, 0 duplicates |
| stage digit | every one of the 73 our-side frames | read, not assumed — see the trap below |

### One place my own first pass was wrong, and the control caught it

My first Criterion A sweep read **25** "stage-1 nocombat" frames and found **one at 33 channel
values**, over the gate. Rather than publish a 1-in-25 failure I cropped and looked:
`tools/out/judge-r6/s1-nc-419/frame-0004.png` is a **stage-2** frame the capture walked into —
HUD digit 2, orange sky — and 33 is the independently measured **stage-2** median. Excluding it
by digit gives 24 frames at a flat 21, which is the judge's figure exactly.

**A capture directory named for a stage is not a stage attribution.** This is ledger rows 11/12's
family one more time, and it cost nothing only because the number was odd enough to crop.

---

## JOB 1 — the Criterion A/B scoreboard was measured without combat and did not say so

**REPAIRED. Ledger row 21.** The judge's wording was that "a gate stated without its population
is ledger row 15 in a new place". It is, and the asymmetry is sharper than "ours was nocombat":

> **Every our-side row was a frame with no combat object on screen. Every arcade-side row is a
> frame IN COMBAT.** The table was comparing two different games and saying so nowhere.

### The arcade side, measured — both native frames are combat frames

This is the half nobody had checked, and it is what licenses the gate.

| true-native arcade frame | what is actually on screen | colours | chan union |
|---|---|---|---|
| `ab2-arcade-desert.png` (stage 2) | player jet, **two green-camo enemy aircraft** (rear aspect), in-flight missiles with red tips, two grey smoke puffs, the nose sight square, ~17 px of magenta/violet shot-or-debris, cloud puffs, full HUD | **138** | **31** |
| `ab2-arcade-night-banking.png` (stage 3) | player jet **mid-blast** inside a fireball + debris spray of **107 × 41 native px = 33.4 %W × 18.3 %H** (809 warm px, operator `R>100 ∧ R>B+60`), four clouds, full HUD | **79** | **17** |

**So the licence is a measurement, not an argument about hardware.** A 33 %W fireball costs the
arcade nothing — the whole frame stays inside **17 channel values**. Our `?combatexpl=1` arm
reads **218**. Evidence: `judging/R7/r7-01-scoreboard-population-ARCADE-in-combat-TOP-OURS-no-combat-BOT.png`,
and the raw 3× renders in `tools/out/criteria-r7/arcade-combat/`.

I could not do better than this on the arcade side and I will say why rather than imply I
could: the only other arcade frame holding explosions is `ab2-arcade-desert-explosions.png`,
which is a **filtered 1.25× upscale** (400×280) reading **34 969 colours / 256 channel values**.
Non-integer and filtered, so it cannot be decimated back and is **useless for cardinality**.
The night frame is the measurement.

### The our-side rows, by population, at `e8fed58`

Mine, on the judge's captures, on the published instrument; stage digit read on every frame.

| population | n | colours min/med/max | chan union min/med/max | ground H-id | ground V-id | over A2 |
|---|---|---|---|---|---|---|
| **GATE** | — | ≤256 | **≤32** | ≥50 % | ≥50 % | — |
| `?nocombat=1`, stage 1 | **24** | 46 / 51 / 51 ✓ | **21 / 21 / 21** ✓ | 79.3 / 80.8 / 82.4 ✓ | 50.8 / 56.4 / 60.8 ✓ | **0 of 24** |
| **ordinary play, stage 1** | **49** | 59 / 71 / 99 ✓ | **28 / 53 / 98** ✗ | 78.8 / 80.6 / 82.4 ✓ | 50.7 / 56.3 / 60.8 ✓ | **48 of 49** |
| iso `?combatonly=enemies` | 6 | 59 / 59 / 64 ✓ | 27 / 30 / 30 ✓ | — | — | 0 of 6 |
| iso `?combatonly=enemies,shots` | 6 | 65 / 70 / 84 ✓ | **44 / 54 / 70** ✗ | — | — | **6 of 6** |
| iso `?combatexpl=1` | 6 | 46 / 337 / 385 ✗ | **21 / 218 / 227** ✗ | — | — | 4 of 6 |
| `?demo=2` | 12 | 54 / 407 / **1 375** ✗ | 28 / 229 / **255** ✗ | — | — | 10 of 12 |

I reproduce the R6 judge's figures on every row. One frame of the 49 play frames passes at 28 —
the instant with no effect on screen — which strengthens rather than weakens the attribution.

### The finding inside the finding: the caveat binds A, not B

**Criterion B does not move with the population at all** — 80.8 → 80.6 H and 56.4 → 56.3 V
between the two populations, on the same commit and the same 73 frames. So:

- A Criterion **B** figure may be quoted from a `?nocombat=1` capture.
- A Criterion **A** figure may not, and is **not a figure at all** without its population.

That distinction is now binding text in REFERENCE.md and it is worth more than restating the
rows, because it tells the next lane which half of the scoreboard the caveat actually costs.

### Which population is the gate LICENSED against

**All of them, including explosion frames.** Stated in the document with the reason: the arcade
delivers its own combat, its own fireball and its own enemy traffic inside the gate. Criterion
B keeps its existing representative-frame exemption (do not measure B on a screen-filling
fireball — a flat fireball *inflates* B); **Criterion A has no such exemption and never did.**

**Changed in REFERENCE.md**: the whole scoreboard block replaced — population column on every
row, the arcade-side combat census added, both of our populations published, the licence stated,
the stale "stage 1 is the single outlier" scoping replaced with the two things that are actually
open (the effects class, and stage 3's dithered night ground), and a binding one-liner that a
Criterion A figure without its population is not a figure.

---

## JOB 2 — GAME_SPEC §3 element 1 is REAL, and it is now recorded as checked

**WRITTEN INTO GAME_SPEC §3 AND §6, AND INTO REFERENCE'S HUD SECTION.** Two R6 lanes concluded
from 4 and 16 frames that the arcade has no nose sight and that we were drawing an element it
never had. **My own predecessor wrote that conclusion.** It is wrong.

I checked it myself rather than relaying it, and found something nobody had looked for: **the
element is in a TRUE-NATIVE frame.** Every prior attempt — including both negatives — worked on
686×480 video, where the box is 11 px of pale white over a saturated sky.

| | source | stage (digit) | result |
|---|---|---|---|
| **side length, TRUE NATIVE** | `ab2-arcade-desert.png`, `min(RGB) ≥ 200`, bbox `x[127,131] y[91,95]` | **2** | **5 × 5 px of 320×224 = 1.563 %W**, four 2 px corner marks, **interior empty** |
| side length, video | `ab2-longplay.mp4` t201.4, threshold 150, bbox `x[373,383] y[193,203]` | **4** | **11 × 11 px of 686 = 1.604 %W** — the judge's figure, reproduced to the pixel |
| corroboration | — | — | 5 × 686/320 = **10.7**. Two frames, two stages, two resolutions, two operators: **1.56 % and 1.60 %W** |
| stage-1 presence | t109, hard bank, zero enemies, clear sky | **1** | present |

**One native frame carries elements 1 and 2 at once** — the nose sight on flat orange sky with
nothing within 4 px of it, and the fixed upper-right reticle with its rotating attitude line —
and it was sitting in `reference/` the whole time.
`judging/R7/r7-02-nose-sight-EXISTS-native-and-stage1.png`.

> **One claim WITHDRAWN before publication, recorded rather than quietly dropped.** I measured
> white pixels at `x[136,146] y[92,100]` in that frame, called it a **per-enemy lock bracket at
> 11 × 9 px, ~2× the sight**, and wrote it into REFERENCE — then cropped it at 18× as the rules
> require. **Those pixels sit on the player jet's own cream fin**, so the mask is confounded and
> the box is not separable from the airframe. Clean, plausible, reproducible, wrong — the
> standing pattern, caught by the standing rule.
> `tools/out/criteria-r7/arcade-combat/desert-bracket-18x.png`. **There is still no measured
> arcade lock-bracket size in this project.** The sight square is unaffected.

**Published target** (the measurable half is another lane's): **1.4–1.8 %W on a side.** Ours is
`SIGHT_PX = 10` of 320 = **3.125 %W**, almost exactly 2×.

### The vertical offset is NOT a retune target yet, and the reason is new

The judge asked for "a proper measurement on a level-flight zero-enemy frame". That is necessary
and **not sufficient**, because the offset is not in the screen frame at all:

| frame | roll | sight offset from the airframe's achromatic centroid |
|---|---|---|
| native desert, stage 2 | banked left | **7.8 %H above**, 1.6 %W left |
| t201.4, stage 4 | banked right | **8.8 %H above**, 1.3 %W right |
| **t109, stage 1** | **hard bank right** | **12.0 %H BELOW**, 1.3 %W right |

**A fixed screen offset above the airframe cannot produce the third row.** `SIGHT_NDC_Y_OFFSET`
is a fixed screen offset. So the measurement owed is a level frame **and** a hard-bank frame, to
fix the frame of reference before the constant moves. (The judge describes the same t109 box as
"above the nose" — consistent: in a hard right bank, above the nose in the jet's frame *is*
below the airframe on screen. One observation, two descriptions.)

**I tried and failed to settle it from the native frame alone**: the angle between the
sight-offset vector and the airframe's principal axis is **74.4°**, which sits almost exactly
between the body-frame prediction (90°) and the screen-frame prediction (58.6°). One banked
frame cannot discriminate. Published as an attempt, not a number.

**Why it was missed, recorded because the method lesson generalises**: the sight is faint against
both the blue and teal skies, it is **absent during the climb-out** (t91/t92 — exactly where one
lane looked), and at 686×480 it is 11 pale pixels. The lane that got it right chose its frames
**by a rule written before the question was asked** (every zero-enemy frame in a pre-existing
labelled set). **For a negative claim, the sample selection is the whole measurement.** That
sentence is now in GAME_SPEC beside the element and in STATUS.

---

## JOB 3 — ledger row 20 restated, and its operator named

**The drop stands. The published reason was wrong, and it was wrong in row 19's exact way.**

Row 20 said the gate is "a false negative by construction on our palette", citing **0.952**.
That figure comes from an operator the criterion's own numbers were never taken with. The
criterion text names **none** of three things: the mask, the ranking key, and whether
"saturation" means the mean of per-pixel saturations or the saturation of the decile's **mean
colour**. The two defensible readings disagree by 15×:

| operator | **ours** (`e8fed58`, expl-tick 0083 / 0155) | **arcade** huge-explosion | gate ≤0.30 |
|---|---|---|---|
| **not-background largest component, deciles ranked by R+G+B, saturation OF THE DECILE'S MEAN COLOUR** — what the published ladder and the 0.063 were taken with | `#f6f6e6`, **0.0622 / 0.0619** | `#f7f6e6`, **0.0658** | **both PASS** |
| FIRE-MASK component, ranked by V, mean of per-pixel saturations | **0.9646 / 0.9653** | **0.6318** | **both FAIL** |

**So it is not a false negative on our palette. It is under-specified — and under the reading it
was dropped on, the arcade fails its own criterion by 2.1×**, which is ledger row 10's defect,
not row 20's stated one. My arcade figures reproduce the judge's 0.066 and 0.632 exactly; my
our-side 0.062 reproduces his 0.061.

**A second under-specification found in the same table.** The "Fireball targets" block publishes
its own exclusion (`y[88,109) x[20,50)`) beside the figure 0.063. Run with **that** rect the
brightest decile comes back `#f9f9f9` at saturation **0.001** and the core inflates to
**12.9 %** — residual cloud bank, not fireball. The published numbers reproduce **only** with
FIRE-MASK's three rects. That is now stated: use FIRE-MASK's rects for both operators on that
frame.

**Verdict: STAYS DROPPED, for the corrected reason.** Naming the operator now would be writing a
new criterion, not repairing one. The core fraction `S<0.25 ∧ V>0.94` remains the gate.

**And a win nobody claimed.** The decile *ladder* survives as an authoring target and **we pass
it**: ours `#9e0000 → #c80c01 → #efa00c → #fbdb2a → #f6f6e6` against the arcade's
`#9b0304 → #d2050c → #f25908 → #f6d619 → #f7f6e6`. The two ends match to a level; only the
**middle rungs run hot** (ours yellower and brighter at deciles 5 and 8). Authoring note, not a
gate. Mask dump looked at as required —
`tools/out/criteria-r7/arcade-combat/ourfire-frame-0155-mask.png` is the fireball and nothing
else.

---

## JOB 4 — the arcade enemy-altitude distribution, and a standing rule instead of a fourth exclusion

**Still a CANDIDATE. Bar unchanged. The failed attempt is now recorded AS a result.**

The R6 judge attempted the re-count, reached **six** confident observations over 13 frames, and
published the attempt rather than a number. That is the correct outcome and GAME_SPEC now says
so in those terms, with both reasons it stalled — the longplay pilot kills fast (five stage-1
frames → two observations) and the stage-7/19 frames are over dense terrain where
aircraft-vs-ground classification is genuinely ambiguous, which independently confirms the
original lane's stated weakness (c). **Six observations is not evidence against 32.5 %; it is
evidence the re-count has not happened.**

**Bar, unchanged**: ≥60 observations over ≥40 stage-verified frames, by someone who produced
neither prior count, agreeing with 32.5 % top-third to within 10 points.
**Added to the operator**: prefer open-water/open-desert spans and say which were used — both
attempts lost their observations over dense terrain, so a smaller classifiable sample beats a
larger unclassifiable one.

### The exclusion: a standing rule, not a fourth footnote

The judge asked me to consider whether the right fix is a rule. **It is**, and the reason is the
tally:

| round | the upper-right HUD was counted as | by |
|---|---|---|
| R4/R5 | **a cloud, in 100 % of frames** while the build rendered none | our cloud census |
| R5 | **a cloud bank at 17.35 %W**, near-constant 496 px bbox, ~⅓ of detections | two of three independent #132 runs |
| R5/R6 | the thing that **defeated two horizon line fits**, inflating one frame's Criterion B by 11 points | two separate fitters |
| **R6** | **an enemy aircraft at ~16 %H, span ~11 %W** — top third, readable size, the most influential observation class there is | the R6 judge, hand-counting at 1.4× |

A fifth per-operator exclusion would be the fifth time the fact was written into a block the
sixth operator does not read. **New binding process rule in REFERENCE.md**: *every operator that
counts, measures or classifies objects in a frame — ours or the arcade's — blanks the HUD before
counting, and says in its published figures that it did.*

### And the existing rect is itself defective — ledger row 23, measured

The published arcade reticle rect `(495/686, 30/480, 660/686, 105/480)` was fitted where the
attitude line is **horizontal**. The line is an artificial horizon and **rotates with the world
roll**, so in a banked frame it swings out of the box:

| frame | reticle assembly, largest white component (`min(RGB) ≥ 180`) | vs old rect |
|---|---|---|
| `ab2-arcade-desert.png` (native, banked left) | `x[248,277] y[15,67]` = x 0.775–0.866, **y 0.067–0.299** | old rect stops at **y 0.219** — **17 of 103** upper-right white px exposed |
| `ab2-arcade-night-banking.png` (native, banked right) | line at `x[236,291] y[36,47]` = x **0.738**–0.909 | left-hand extreme |
| **control** | the four corner marks at `x[248,279] y[24,47]` in **both** native frames | the bracket itself does not move |

**New rect: `(0.720, 0.055, 0.965, 0.330)`**, covering both extremes with ~3 points of margin.

**The cost is carried, not hidden.** A wider rect severs more sky, and the cloud-bank figures
already carry a known bias from exactly this (counts +3.1 %, widths −0.9 %, growing with any new
horizontal HUD rule). So the rule is scoped: **counting/classification operators use the new
rect; the published cloud SIZE distributions stay on the old one with the bias noted, and
re-deriving them is an open item in STATUS — a change in the numbers, not a documentation fix.**
Our own captures keep deriving the mask per run with `tools/hud_mask.py`; what is new is that
this now binds *counting* operators and the **arcade** side, where no mask tool exists.

---

## JOB 5 — VALUE-STAT must state whether a V floor is applied

**REPAIRED. Ledger row 22 — and the mechanism is sharper than "a floor".**

The brief's framing is right and the cause is more specific: the operator never said what
happens to **`V = 0`** pixels. On these two crops *no pixel sits between V 0 and V 0.08 at all*,
so "V > 0.08" and "V > 0" give identical answers — **the entire disagreement is pure black**.

| reading | **ours, day sheet** (jet-on/off diff mask, span 116 native px, `e8fed58`) | **arcade native desert**, stage 2 | arcade **t116** video, stage 1 |
|---|---|---|---|
| **`S<0.25`, V = 0 KEPT — the published operator** | **0.643** (n 1 490) | **0.839** (n 608) | **0.804** (n 3 121) |
| `S<0.25`, `V>0` | 0.839 (n 1 033) | 1.000 (n 473) | 0.812 |
| `S<0.25`, `V>0.08` | 0.839 | 1.000 | 0.812 |
| `S<0.35`, `V>0.08` (V-CENSUS) | 0.839 | 0.969 (n 672) | 0.871 |
| **share of the kept mask at exactly V = 0** | **30.7 %** | **22.2 %** | **3.6 %** |

**The coincidence is now explained.** 0.8392 = **214/255 is one rung of the Sega ladder**, and
the two operators landed on it from opposite directions — ours by *deleting* 457 black pixels,
the arcade's by *keeping* 135. Corroboration is this project's hardest-leaned-on evidence
standard and this was not corroboration.

**Under the band's own operator our airframe reads 0.643 against the arcade's 0.839** and the
median clause is still missed. What improved is real and is recorded as such: brightest body
colour 0.773 → **1.000**, share above V 0.80 5.3 → **48.2 %**.

**Why "no floor" is the right choice and not just the published one.** The `V = 0` pixels are
the sprite's **dark role area**, and their share *is* the defect. Ours is a complete **1–2 px
pure-black keyline around every edge** (457 of 1 490 kept pixels); the arcade's 135 are
**clustered** in the nacelle rings and belly shadow, not drawn as an outline. Dropping V = 0
deletes exactly the difference the criterion exists to see. Looked at, as required:
`judging/R7/r7-03-valuestat-keyline-OURS-TOP-ARCADE-BOT.png`. **The lever is role area, not a
brighter white.**

**Two provenance warnings that fall out of the last row.** (1) The ACCEPT band 0.78–0.92 was
fitted on five **686×480 video** crops where black is 3.6 % and anchored on a **true-native**
frame where it is 22.2 % — two populations, so the band is looser than it reads. (2) t116's
published median **0.816** does not reproduce exactly from its published box; I read **0.804**
(no floor) and **0.812** (`V>0`). All three are within one ladder rung (205/207/208). The band's
endpoints are rung-accurate, not decimal-accurate, and that is now stated.

---

## JOB 6 — the inverted wing text

**CORRECTED, and the direction re-checked against the arcade rather than relayed.**

R5's gap text asks for **"anhedral"** (wingtips below roots). The R6 sprite lane measured the
arcade's wing top edge **rising 9.2 %H root → tip** while our R5 sheet **dropped 17.5 %H**
(`stage3-night-level-t175.png` x[207,487] y[227,306], ROW-RUNS, span 251, H 77).

Per CLAUDE.md I checked the criterion against the arcade before publishing it, and I did it on a
**crop, not a number**, because my first numeric attempt failed honestly: a per-column
topmost-pixel operator is contaminated by the **fins**, which rise higher than the wings at
~0.35 of half-span and return 2.5 %H there. `tools/out/criteria-r7/arcade-combat/t175-jet-4x.png`
is a clean level astern view at 4× and **the wingtips plainly sit higher on screen than the wing
roots.** The crop wins.

**One trap found while doing it, worth the line it costs**:
`reference/stage1-level-flight-t116.png` is **banked**, not level
(`tools/out/criteria-r7/arcade-combat/t116-jet-5x.png`) — it must not be used for any
wing-dihedral or attitude measurement despite its filename.

**Fixed in**: REFERENCE.md (the "jet is a touch timid" paragraph, with a boxed correction and
the stage attribution) and STATUS.md gap 2. **`judging/R5/*` keeps the original wording** —
historical reports are not rewritten. The sheet in `tools/art/sheets/player-f14.js` was already
drawn correctly in R6; this was a gap-text defect only, and the fix is that nobody implements
the inversion.

---

## What I changed, file by file

| file | change |
|---|---|
| `REFERENCE.md` | scoreboard block rewritten with populations + arcade combat census + licence; binding "a Criterion A figure without its population is not a figure"; ledger **row 20 restated**, **rows 21/22/23 added**; new process rule "The upper-right HUD has now been counted as four different things" with the corrected rect; VALUE-STAT step 2b (`V = 0` kept) + the four-reading box + our-side row restated to 0.643; row-20 box in "Fireball targets" rewritten; new HUD subsection "The nose sight square"; wing-sign correction; four rows added to the stage-attribution backfill; criterion count 20 → 23 |
| `GAME_SPEC.md` | §3 element 1: **CHECKED AND CONFIRMED REAL**, with the native measurement, the target, the frame-of-reference warning and the method lesson; §6 HUD element list now includes the nose sight and records that the attitude line *does* rotate; §2 altitude candidate: the failed re-count recorded as a result, bar restated, two operator additions; criterion count 15 → 23 |
| `STATUS.md` | header moved to R7 / R6 8-10 baseline with the population headline; new "R7 criteria work" table; gap 0 prefixed with the in-play failure and stage 3; gap 2 carries both corrections (wing sign, VALUE-STAT operator); gap 10 restated; three new open items; count 20 → 23 |
| `judging/R7/` | this report + three labelled evidence images |
| `tools/out/criteria-r7/` | all raw crops, masks and extracted frames |

**No new tool was needed** — every measurement here ran on an existing instrument that passes
its own selftest, plus throwaway reimplementations used as cross-checks. I did not add a tool
for the sake of adding one.

---

## Left unresolved, with the reason

1. **The arcade's cardinality during a kill-flurry (rather than a single blast) is unmeasured
   and unmeasurable from this repo.** The night native frame carries one 33 %W fireball; the
   only multi-explosion arcade frame we hold is a filtered 1.25× upscale. The licence rests on
   that one frame plus the medium argument, and I would rather say so than imply a span.
2. **The nose sight's vertical offset.** Attempted; one banked frame cannot separate the body
   frame from the screen frame (74.4° against predictions of 90° and 58.6°). Needs a level and a
   hard-bank zero-enemy pair. Open item in STATUS.
3. **The cloud-bank SIZE distributions still use the short reticle rect.** Widening it changes
   the numbers, and silently changing published distributions in a documentation pass is exactly
   what this ledger exists to prevent. Open item in STATUS.
4. **t116's published 0.816 vs my 0.804/0.812.** Within one ladder rung, box identical; I could
   not account for the remaining 3 levels and have flagged the band as rung-accurate rather than
   chase it.
5. **I did not re-measure ledger rows 4, 5, 9, 13, 16 or 17**, or row 12's stage-1 enemy polarity
   figures, or anything on the title screen, the carrier or audio. No opinion on them.
6. **Our-side Criterion A at the CURRENT tree state is unknown to me.** Everything here is
   `53ce86b` or `e8fed58`; four lanes are editing `src/` and any of these figures must be
   re-measured against the next commit before it is quoted.

---

# Addendum — three rulings from the sprite lane's close, formalised

The sprite lane closed and asked for rulings on three of its own findings
(`judging/R7/ask-sprite-art.md`, working in `judging/R7/lane-sprite-art.md`). The lead made
them; this section is the formalisation. **I re-measured the load-bearing fact in each before
writing it down** — the lane's restraint in publishing both readings rather than picking one is
what made that cheap, and it is recorded in the ledger alongside the fix.

## RULING 1 (ask A2) — JET-SIL's nozzle mask: adopt `V ≥ 0.70`. **Ledger row 24.**

**The defect is a population defect, which is this project's most-repeated class.** The mask
(`hue 5–55°, S ≥ 0.45, V ≥ 0.45`) and the nozzle-separation figure it feeds were only ever run
against a **night** crop, whose keyline is the blue-grey `#425284` — hue 225.5°, so it **cannot
enter a red-hue mask at any V floor.** The floor was therefore never tested against a keyline
that could reach it. The arcade's daylight keyline can.

Verified myself, colour by colour:

| colour | role | hue | S | V | passes `V≥0.45`? | passes `V≥0.70`? |
|---|---|---|---|---|---|---|
| **`#840000`** | **arcade daylight keyline** | **0.0°** | 1.000 | **0.518** | **YES — the contaminant** | no |
| `#425284` | arcade night keyline | 225.5° | 0.500 | 0.518 | no (hue) | no (hue) |
| `#e67300` | arcade glow, native desert | 30.0° | 1.000 | 0.902 | yes | yes |
| `#f78400` / `#f7b500` | arcade glow, native desert | 32.1° / 44.0° | 1.000 | 0.969 | yes | yes |
| `#ff7500` | arcade glow, t175 | 27.5° | 1.000 | 1.000 | yes | yes |
| `#ef7308` / `#ffd600` | ours | 27.8° / 50.4° | 0.967 / 1.000 | 0.937 / 1.000 | yes | yes |

**Nothing measured lives between 0.52 and 0.90.** The floor sits in an empty gap with ≥0.18 of
margin on both sides — structurally the same justification Criterion B's 50 % floor rests on,
and the reason this is a repair rather than a tuning.

**I re-ran the deciding test on my own invocation of `tools/art/jetsil.py`** rather than taking
it from the ask:

| arcade t175 | nozzle separation | the two components |
|---|---|---|
| `V ≥ 0.45` | **30.0 %** | `[143, 136] px` |
| `V ≥ 0.70` | **30.0 %** | `[124, 121] px` |

Reproduces. The components shrink; **the statistic does not move.**

**The general rule, now written into the ledger row and worth more than the row**:

> **An operator change that moves OUR number and leaves the ARCADE'S untouched is the right
> kind. One that moves both is retuning the criterion to the build.**

Stated with its limit: passing that test is not sufficient — a change can leave the arcade
untouched and still be wrong — but **failing** it is close to disqualifying, and it costs one
re-run. It is the cheapest available defence against the thing most of this ledger is about.

**The restraint is recorded with the fix.** The lane **did not move the operator**: `jetsil.py`
still defaults to 0.45 and now prints both readings with their component sizes whenever they
disagree, so the failing figure sits beside the passing one and the ruling was taken on
published evidence. REFERENCE keeps the default at 0.45 for one more round so a reader of either
document sees both; **the gate is 0.70.**

## RULING 2 (ask A1) — re-license the per-sprite colour bound by variant. **Ledger row 25.**

**"Aircraft and clouds sit at 5–8" was read off the NIGHT jet, and the same table's own
daylight row records 14 total / 7 at 95 %.** The bound contradicted a measurement three lines
away from it. This is ledger rows 11/12 one axis along: a figure measured on one **variant**,
applied to another.

I reproduced the lane's census independently on the native frame — airframe = `S < 0.35` +
largest 8-connected component, **751 px**, stage digit 2:

| | lane | **mine** |
|---|---|---|
| airframe tones | 9 | **9** (`#ffffef` 31.8 %, `#f7e6b5` 23.7 %, `#000000` 18.0 %, `#a48484` 12.8 %, `#d6d6a4` 7.5 %, `#ceb59c` 5.5 %, + three ≤0.4 %) |
| rim, n | 444 | **445** |
| rim `#840000` share | 49.5 % | **49.4 %** |
| nozzle glows on the rim | 3 | **3** (`#e67300`, `#f78400`, `#f7b500`) |
| **total on the daylight sprite** | 12–13 | **13** |

**So the arcade's own daylight aircraft carries 13 colours against a published "≤ 8".** Another
criterion checked against the arcade and reversed.

**The repair is a re-license, not a loosening**, and the reason is which statistic discriminates:

| sprite | total | **n95** |
|---|---|---|
| arcade player jet, **daylight** | 13 (14 by the box reading) | **6** (7 by the box reading) |
| arcade player jet, **night** | 8 | ≤8 |
| arcade cloud puff | 5 | ≤5 |
| **ours** `player-f14.png` | 10 | **7** ✓ |
| **ours** `player-f14-night.png` | 9 | **6** ✓ |
| **ours** `player-f14-roll.png` | 11 | **9** ✗ |

**`n95 ≤ 8` holds on both arcade variants and on both of our shipped sheets.** The total is what
a lane can satisfy by deleting a rung that was doing work; `n95` is what actually separates
palette art from continuous tone. So the gate moves to `n95`, and per-variant totals are
published as licensed facts.

**The roll sheet is over it, and I flagged it rather than waiving it.** Its `n95 = 9` has **no
arcade target and cannot be given one**: the only barrel-roll reference is
`stage4-barrel-roll-t222.png`, a 1028×720 **video** upscale, and video is useless for
cardinality. GAME_SPEC §1 does record that the arcade's barrel roll shows a belly palette, so
two surface families is plausibly correct — but plausible is not measured. **Recorded as a known
exception on an unwired sheet, with an acquisition item, and explicitly: do not tune it to 8 to
make the gate green.**

**Ask A4 folded in rather than given its own row.** The 672 px vs **751 px** population on that
crop (`#ffffef` 35.6 % → 31.8 %, `#f7e6b5` 26.5 % → 23.7 %) is the **largest-component step**
added to the bare `S < 0.35` filter, nothing else. Same frame, same box, same S gate. Recorded
inside row 25 so it is not re-found as a contradiction; it did not need a row of its own.

## RULING 3 — the night reading-C regression stands. **Recorded, not gated.**

The lane took night reading C from **0.969** (the arcade's figure) to **0.902**, deliberately,
and said so in its report rather than letting a judge find it.

**The mechanism is measured**: the arcade's night jet spends **2.8 %** of its airframe on
`#a4b5e6` and 14.9 % on `#8494c5`; ours spends **18.7 %** and 8.3 %. **The arcade's night and
day sprites distribute their rungs differently from each other; ours is one drawing indexed into
two ladders and cannot.** Reading C is a function of that distribution, so closing it on night
opens it on day.

**The one-line fix existed and was correctly refused**: mapping night's second rung onto
`#c5d6f7` recovers C = 0.969 *and* lands the night sheet on exactly 8 colours — the arcade's own
count — at the cost of a real value step across the blades, engine bodies and lower fuselage.
**Night has no published value gate** (REFERENCE says so in as many words). Trading a visible
value step for a number nobody is scored against is this project's named failure mode, and
"ships the better art and reports the worse number" is the behaviour this loop is supposed to
produce.

Written into REFERENCE beside the daylight band as a **known, reasoned divergence with its
mechanism**, so the next lane does not close it. With it: if a night gate is ever derived,
derive it from the arcade's night rung distribution rather than transplanting daylight readings,
and carry the standing caveat that readings A and B see only **24.6 %** of the night sprite
because four of its six blue-greys fall outside `S < 0.25`.

## For the record (a) — a new process rule: assert the INPUTS, not the output

The sprite lane shipped a **silent-erasure** bug and published it. Three roles added to a shared
`levelOps()` and not to the roll sheet's role tables → `PixelCanvas.set()` received `undefined`
→ it **erased**. Opaque pixels per cell fell 1176 → 1072, 834 → 759, 407 → **368**. No error.

**Four gates passed it, each for an individually reasonable reason** — `assertPalette` because
the colour count went *down*; `vite build` because it is a property access; `sheet_visibility`
because a sprite with bites out of it is still visible; and every capture, because the sheet is
unwired. **`git diff --stat` caught it**, then a 3× crop. Not a gate.

This belongs beside the existing rules because the shape recurs and is not specific to canvases:
**an API where "no value" means "erase" cannot distinguish a typo from an intent, and every
count-based gate is blind to it, because erasure moves counts in the safe direction.** Two
corollaries now carried with it: pair any count *ceiling* with a count *floor* or an input
assertion; and an **unwired** artefact has no behavioural gate at all, so its assertions must be
static. Written into REFERENCE.md as a binding process rule, with the lane's `assertRoles` fix —
validated on known-bad input — as the shape to copy.

## For the record (b) — the acquisition list now has three entries, and two are new

Previously STATUS carried one acquisition item in prose. It is now a table, because **two
separate measurement programmes are blocked on footage this repo does not have** and a frame
hunter needs to know what to look for:

| # | acquire | unblocks |
|---|---|---|
| 1 | true-native **stage-1** (sea) frame | `#009eff` sky level, Criterion B's stage-1 sea floor, ledger rows 16 and 17 — **three of four retired for want of it** |
| **2** | true-native **LEVEL astern** player frame, any daylight stage (**NEW**) | **every true-native frame we hold is a BANKED pose.** The authoritative level crop is a 686×480 video upscale carrying **3 133 colours over 5 147 px** — the sprite lane tried it and discarded it rather than publish off it. Blocks comparing our black **role area** against the arcade's 18 % on a level cell, and any per-variant `n95` on a level daylight sprite |
| **3** | isolated arcade **barrel-roll** sprite (**NEW**, lower priority) | the roll sheet's `n95 = 9` has no arcade target at all (row 25) |

Note the interaction with gap 2's VALUE-STAT work, because it changes what is owed there: the
arcade's **18 %** black is measured on a **banked** pose, where the nozzle discs face the camera
and read as large filled circles. Our nine bank cells are a 2-D rotation of one planform, so the
nozzles do not grow when we bank — reproducing 18 % on a *level* cell would mean drawing nozzle
discs too big for the level pose. **Worse art for a better number.** That is the mechanism
behind STATUS's standing "nine genuinely drawn perspective bank poses" item, and it is why
acquisition item 2 is not cosmetic.

## For the record (c) — the wing inversion is confirmed twice

The R7 sprite lane re-measured rather than taking its predecessor on authority: seven sample
columns on t175 give a top edge running **68.8 → 58.4 %H** from |x| 21.1 % to 46.6 % of span —
**rising ~10–14 %H outboard**, chord narrowing ~22 %H → ~10 %H. That agrees with R6's 9.2 %H and
with my own crop check. **Two independent measurements and a crop, one direction, and the gap
text still says "anhedral".** Corrected in REFERENCE and STATUS; `judging/R5/*` keeps its
original wording, because historical reports are not rewritten.

---

# Addendum 2 — four criteria from the flow lane's close, plus one verification I could not reproduce

**All four came apart WHILE THE LANE WAS USING THEM.** Nobody went looking. That is now the
dominant way defective criteria surface here, and it argues for lanes reporting *the criterion
that fought them*, not only the result they got. Working: `judging/R7/lane-flow.md` §§3.3, 3.4,
5.2, 5.4.

## 1 — "Top third" is the wrong statistic for gap 5. **Ledger row 26.**

**The R6 observation was correct and the target it implies is not.** Gap 5 reads *"our pilot
occupies the top third 0.00 % of 20 970 flight ticks against an arcade pilot whose p5 is
36.0 %H"*. Both halves are true. A reader takes away *"the arcade pilot is often up there"* —
and **the arcade's own player top-third share is 0.92 %, one observation in 109.**

I checked the arithmetic rather than taking it: R6's 1.64 % on n = 61 is **1 observation**
(1/61 = 1.64 %); the R7 count's 0.00 % on n = 48 is **0**; pooled **1/109 = 0.92 %**.
Internally consistent, and the one observation is the single 27 %H reading in R6's set.

**Tuning a scripted attract path to reproduce a 1-in-109 event is tuning to a single
observation**, which is what most of this ledger is about. **Restated as spread**, which is what
actually separates the two pilots:

| | p5 | p95 | **sd** | top third |
|---|---|---|---|---|
| **arcade, 109 pooled** | **36.4** | 62.0 | **7.73** | 0.92 % |
| ours `e8fed58` | 44.9 | 62.3 | 6.07 | 0.00 % |
| **ours R7** | **38.7** | 62.8 | **8.22** | 0.00 % |

**ACCEPT: p5 within ~3 points of 36.4 %H and sd within ~1.0 of 7.73**, with the reachable
extreme shown separately (full stick reaches **27.02 %H**, the arcade's own minimum).
**Do not gate a top-third share in either direction.** Note p95 was already right and stayed
right — the floor was never the problem.

**A second thing landed with it that I made sure not to over-claim.** The flow lane re-counted
the **player** column of the arcade altitude distribution — 48 observations, different stages
(2, 3, 9, 14, 20), a different grid (3.50 s), a different reader — and **it confirms R6's**:
means **0.69 points of H apart** on 48 and 61 observations, both maxima 67. That is the first
independent confirmation this project has for the arcade player's altitude, and GAME_SPEC now
carries the pooled 109-observation row as the thing to quote. **It does NOT promote the ENEMY
column**, whose bar (≥60 observations, ≥40 stage-verified frames, a third counter, within 10
points of 32.5 %) still stands unmet — written into GAME_SPEC in those words, because
"the altitude hand count was confirmed" is exactly the sentence that would otherwise travel.

## 2 — A seven-point contradiction that was a unit mismatch. **Ledger row 27.**

| | figure | unit |
|---|---|---|
| REFERENCE #122 cruise `cy` | **52.8 %H** (and the 52–60 %H composition band) | **pixel centroid** |
| arcade player hand counts, 109 obs | **49.47 %H** | **bbox centre** |

Under this document's own published 1.3–3.3 point conversion they are the same measurement.
**Binding rule added: a bare "%H" is not a reportable quantity — every altitude or centroid
figure names `pixel centroid` or `bbox centre`.**

**One refinement I added after checking the arithmetic**: 49.47 + 3.3 = **52.77** against
**52.80**, so they reconcile *at the edge* of the conversion interval. They are consistent, and
they **must not be quoted as corroborating each other to a decimal** — the conversion is doing
all the work. Published that way rather than as a clean agreement.

**Why this one is worth a ledger row when nothing was wrong.** There is **nothing to find by
re-running either operator**; cross-validation reproduces both exactly, which is this project's
strongest check and it is blind here. The only thing that resolves it is a unit label costing
one word, and it cost an hour. Third occurrence of this family (after row 14 and the 2-round
centroid bias the section was written for).

**One live consequence carried with it**, because it is true now and will silently stop being
true: our `jetNdcY` is the sprite **anchor**, and `demoTimeline.js`'s offsets make
`anchor = pixel centroid − 1.55` while the table makes `bbox centre = pixel centroid − 1.72` —
so our anchor equals the hand counts' bbox centre to within **0.17 points** and the two columns
of every altitude table are in one unit with no conversion. **That is a property of the current
silhouette's area distribution and it breaks the next time the jet is redrawn.**

## 3 — "Flight time is invariant to death-cycle length" is refuted by experiment. **Ledger row 28.**

Settled by **running a controlled isolation rather than winning an argument**, which is why it
is worth copying. Three arms, 7 seeds × 300 s each, every tick, deaths cross-checked against
`lives` decrements. ARM 1 → ARM 2 changes `DEATH_TOTAL_S` (5.2 → 7.7 s) **and nothing else**:

| | ARM 1 `e8fed58` | ARM 2 death cycle only | ARM 3 shipped |
|---|---|---|---|
| deaths/min **wall** | 2.229 | **2.086** (−0.143) | 2.114 |
| deaths/min **flight** | 2.850 | **2.948** (+0.098) | 2.990 |
| enemy rounds/min wall | 126.00 | 125.17 | 124.60 |
| enemy rounds/min flight | 161.12 | **176.89 (+9.8 %)** | 176.23 |

**Both denominators move, in opposite directions.** The mechanism is not a bug: **threats are
produced on WALL time** — `game.js` keeps calling `combat.update` through the `death` state,
R5's "the world keeps flying" fix, matching the arcade at gp t261 — **while exposure is counted
in FLIGHT ticks**, so a longer cycle leaves the threat schedule alone and shrinks the
denominator. The enemy-rounds rows are the control: a quantity nobody is tuning shows the same
signature.

**Gate unchanged, stated reason withdrawn.** Wall clock stays primary because the arcade anchor
is strongest there. I also attached the denominator caveat to the gate's **"enemy rounds/min
not falling"** clause, which has the same latent defect the gate had before row 8: it reads
−1.1 % per wall minute and +9.4 % per flight minute, and the clause exists so the death rate
cannot be met by making combat quieter — satisfied on either reading, but it must name which.

## 4 — "No visible invincibility flash" is wrong. **Ledger row 29.**

**The second MEASURED-tagged negative this round that the arcade turns out to have**, after the
nose sight, and in the same direction. The arcade flashes the jet **1.67 s at a 0.267 s period**
— 8 clean on/off alternations, starting the frame the respawn reaches normal scale; the operator
(bright-and-desaturated pixels in a jet box excluding both HUD strips and the READY row) gives
per-frame counts of **~2 000–2 900 ↔ 0–60 with nothing in between**, so it is not a threshold
judgement call.

**Why four passes missed it is the generalisable part, and I wrote it in as a rule**: each state
lasts **0.10–0.13 s**, so **any sampling coarser than ~0.1 s aliases it away** — including this
project's default 0.25 s death-cycle grid, and including the finding lane's own first pass.
**A negative about a periodic behaviour is only as good as the sampling interval it was taken
at; state the interval with the negative.** That is the same shape as R6's lesson from the nose
sight (*for a negative claim, the sample selection is the whole measurement*) in the time domain
rather than the frame-selection domain.

Two consequences recorded in GAME_SPEC rather than left in a lane report:
`RESPAWN_INVINCIBLE_S = 2.0` is now **arcade-supported to within 0.33 s** and was correctly
**not** shortened to 1.67 (flashing implies invulnerability by convention, not by measurement);
and **the player sprite is now absent from ~3 frames in 8 for 2.0 s after every respawn** — a
single-frame jet measurement landing in one reads "no jet" and **that is not a defect**
(`?invincible=1`, or `__flowState().graceFlashHidden` per tick).

## For the record — the lane refuted its own prediction, and the gate ships MISSED

Recorded because the behaviour is the deliverable, not the number. The lane expected
`ENVELOPE_Y` to carry the lethality improvement and had written that into a draft **on
arithmetic, before the middle arm existed**. The experiment says otherwise: **the death cycle
carries all of it (−0.143); the envelope's effect is not measurable (+0.028, a quarter of one
standard error).**

So **flight share closes** (78.20 % → **70.70 %**, mid-band) and **the ≤2.0 wall-clock gate
ships MISSED at 2.114**, 0.94 standard errors over, **with its mechanism published and an ask**,
because nothing in that lane's files closes the remaining 0.114 without making the game easier
— which the gap text explicitly forbids. **That is the right outcome and STATUS records it as
such.** It also closes off the tempting shortcut: do not recover the 0.114 by shortening
`RESPAWN_INVINCIBLE_S`, which R7 has just given an arcade anchor.

One finding from that lane nobody has checked against the arcade, carried into STATUS rather
than silently dropped: **deaths per flight-minute by altitude band runs 4.747 in 56–64 %H
against 0.658 above it — 7.2×** — so this build now has a difficulty gradient it did not have,
and about half our flight time sits in the dangerous band, substantially the canyon regime.
Reported, not called a defect.

## The team lead's final-tree verification — recorded, attributed, NOT re-derived

**The figure**: 12 frames, three tick spacings (97/137/211), ordinary play with combat and
`invincible=1`, stage-digit range verified — **worst case 30 channel values and 70 colours**
against gates of ≤32 and ≤256. **Criterion A passes on the composite, not just per lane.** It
supersedes my `e8fed58` ordinary-play row, and both documents now say to quote it rather than
any single lane's.

**I could not reproduce it, and I am saying so rather than implying I checked.** The
`tools/out/tl-verify-*` tree holds **15 frames in total**, not 12 at three spacings, and the
only multi-frame set in it (`tl-verify-9-{1,2,3}`) reads **13 997–14 470 colours / 253–256
channel values** on my instrument. I cropped and looked before concluding: the sky is 15
colours and the jet 40, but **the ground is 9 430 colours with 11 320 singletons** — that is the
stage-1 sea *before* the world lane's rebuild. **Old captures, not this measurement.**
**Owed before it can be cited as reproduced: the capture directory's name and the commit.**
Until then it is a correctly-attributed single-measurer figure, which is what field 5 of "What a
complete citation is" exists to flag.

**And one capture-hygiene finding in that tree, which is worth more than the provenance note**:
`tl-verify-9-1`, `-9-2` and `-9-3` contain **byte-identical frames** — md5 `ed3de9da…` and
`fc8feed9…` appear in all three directories. **Three directories carrying one directory's
information.** If any pooled figure draws on them it is triple-counting two frames, and a
black-frame sweep cannot see it. STATUS's standing warning — *"two capture-corruption causes are
fixed; that is not proof there is no third… sweep for black frames AND for duplicates"* — is the
relevant one, and this is a live instance of it.

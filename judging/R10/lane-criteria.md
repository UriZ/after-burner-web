# R10 — criteria lane

**Tree**: started from `8725647` ("R9 judging: 7/10 composite, and the trend line is RETIRED").
Two build lanes live in `src/` concurrently; **this lane touched nothing under `src/`.** Files
changed: `REFERENCE.md`, `GAME_SPEC.md`, `README.md`, `STATUS.md`,
`.claude/skills/youtube-reference/SKILL.md`, this file, and two new tools
(`tools/known_quality_pair.py`, `tools/out/criteria-r10/envelope/env.py`). Captures under
`tools/out/criteria-r10/`.

**What is licensed from someone else and what is mine**: the DRAW-WEIGHT definitions are
`tools/art/inkspan.py`'s, imported rather than restated. The fire-mask and envelope definitions
are the R9 judge's §2.4, quoted verbatim. The LINEWORK and runs-per-row candidates are the R9 art
critic's. **Every number below is my own run of those operators unless the table says otherwise**,
and the two kinds are distinguished everywhere.

---

## 0. The headline, and it reverses the premise I was given

> **I was told DRAW-WEIGHT's sign is inverted and that anything gated on it would drive the build
> backwards. I ran the test. THE GATED STATISTIC'S SIGN IS NOT INVERTED — it ranks 5 of 7
> same-subject known-quality pairs correctly, ties 2, and inverts none. The art critic's inversion
> is real, robust and reproduced to the digit, and it is a CROSS-SUBJECT reading on a class this
> document had already declared UNLICENSED.**
>
> **The actual defect is subtler and needs the opposite fix**: *a statistic with no arcade anchor
> degenerates from a DISTANCE into a DIRECTION, and only a direction can have a sign.* Where an
> anchor exists DRAW-WEIGHT behaves perfectly. On the four objects where REFERENCE declares it
> unlicensed, the only reading left to a lane is "lower is lighter, so push it lower" — and
> thin-and-continuous beats bladed-and-thicker under that reading, every time.
>
> **And the candidate proposed to replace it fails the same-subject test WORSE than the thing it
> was proposed to replace** (LINEWORK inverted on 3 of 7; the critic's own rejected runs-per-row on
> 3 of 7 with 2 ties).

This is this project's own standing rule firing on the round's own premise: *before tuning to a
criterion, check the criterion against the arcade itself — across R5–R9, checks have reversed the
expected direction more often than they confirmed it.* **It has now done so in R10 as well, against
a finding the round was built around, including this lane's own instructions.** The rule that
generalises is unchanged and is published as binding; what changed is which criterion it condemns.

**The rule is published anyway, and it is the round's real deliverable**, because the process
finding — *it was never once run on two real sprites whose relative quality was known* — is true,
is the reason nobody could tell a cross-subject inversion from a sign error, and generalises past
this criterion. REFERENCE.md now carries it: **"A synthetic control cannot validate a quality
statistic — it must be run on a known-quality pair."**

---

## 1. JOB 1 — the known-quality-pair rule

### 1.1 The rule, as published

> A **synthetic control** proves an operator **computes what it says**. **It cannot prove a
> QUALITY STATISTIC RANKS CORRECTLY**, because in a synthetic the person building it decides which
> arm is better — **the answer is an input**. Any criterion claiming one drawing, behaviour or
> build is better than another must be run on a **known-quality pair** before it is licensed as a
> gate.

**Four conditions for a pair, and three ways to fail.** (1) both arms real; (2) direction settled
**before and outside** the statistic; (3) **inside the statistic's own licence**; (4) **not
circular** — the lane that produced the "after" was not gated on the statistic under test.

**Condition 4 is mine and it is the one that cost me half my result.** It is the easiest to satisfy
by accident, because the strongest-looking pairs are the most recent redraws, which are exactly the
ones a live criterion was steering. **Condition 3 is also mine**, and it is what separates "the
criterion has an inverted sign" from "the test was run outside the licence" — a distinction the
whole round turns on.

### 1.2 The harness

`tools/known_quality_pair.py`. **6 controls, PASS 6/6.** Pairs come out of **git history** (a sheet
before and after a redraw the project accepted), so the direction is not the instrument's to
choose. Masking is the sheets' own **alpha channel** — ground truth — so for our-side pairs there
is **no mask discretion at all**, which removes the single largest source of disagreement in
DRAW-WEIGHT's history (ink 909 vs 1056, RP90 7.51 vs 9.73 on one frame under two mask rules).

**Control 6 is the one that matters**: a *positive* control on the gate — separated blades vs a
slab at matched ink and span, RP90 4.39 vs 20.67 — proving the harness would **show** a correct
ranking if one were there. A harness that only ever reports inversions is a broken harness.

Instrument validation first: `tools/art/inkspan.py --selftest` **8/8**; `tools/art/jetsil.py`
control suite reproduces REFERENCE's published arcade values (two-blade 100.0 %, fin extent 35.5,
nozzle sep 30.0, cant 1.28, aspect 3.26); `tools/measure_value_stats.py --selftest` PASS.

### 1.3 Reproducing the art critic before contradicting them

**Exact, to every digit, including a population they did not state.**

| | ink | span | DENS | SW | RSW | **RP90** | bbox fill |
|---|---|---|---|---|---|---|---|
| `enemy-grey-head.png` **cell 0** — untouched | 454 | 47.3 | 203.2 | 4.00 | 8.46 | **15.26** | 35.0 % |
| `enemy-interceptor-head.png` **cell 0** — R9 redraw | 446 | 45.2 | 218.5 | 4.00 | 8.85 | **18.25** | 37.3 % |

The critique did not say which of the five 64×32 cells it read. **It is cell 0**, the extreme bank
pose and the narrowest span of the five. *Extended to all five, which the critique did not do*:

| cell | grey RP90 | interceptor RP90 | |
|---|---|---|---|
| 0 / 1 / 2 / 3 / 4 | 15.26 / 13.32 / 11.82 / 13.34 / 15.29 | 18.25 / 15.07 / 13.11 / 15.08 / 17.37 | **inverted 5 of 5** |

**So it is not a cell-0 artefact — the critic's finding is stronger than they published.** RSW
inverts on 4 and ties on 1. **DENS changes sign across the cells** (grey reads *higher* on cell 2,
lower on 0/1/4), which is control 7 restating itself: DENS sees 3.7 % of the defect the operator
exists to catch and must never be read as a ranking.

### 1.4 The same-subject result

`tools/out/criteria-r10/kqp/pairs.txt`. Seven pairs, scored **lower-is-lighter-is-better** — the
reading the criterion's own prose invites.

| statistic | ranks | **INVERTED** | tied |
|---|---|---|---|
| **RP90** — *the gate* | **5** | **0** | 2 |
| RSW | 4 | 0 | 3 |
| DENS / INK-SPAN / bbox fill | **7** | **0** | 0 |
| **LINEWORK** *(proposed replacement)* | 4 | **3** | 0 |
| **runs-per-row** *(critic's own rejected one)* | 2 | **3** | 2 |

And on the player jet, where an **arcade anchor** exists, DRAW-WEIGHT is a *distance* and it is
monotone toward the arcade across every accepted redraw — **never once moving away**:

| tree | | RP90 \|d\| from 9.82 | RSW \|d\| from 3.65 | DENS \|d\| from 87.8 |
|---|---|---|---|---|
| `a0826ea^` | pre-R6 | 3.08 | 2.12 | 38.3 |
| `a0826ea` | R6 "the jet is lit" | 2.30 | 2.06 | 32.1 |
| `2160842` | R7 "no black outline" | 2.30 | **0.87** | 26.1 |
| `010db2c` | R9 "blades, not a filled mass" | **0.48** | 0.87 | **19.8** |

→ `tools/out/criteria-r10/kqp/fig-player-4-redraws-6x.png`, **cropped and looked at**: grey slab →
lit white → red keyline → thinner wings with sky between them. The crop agrees with the numbers.

**THE HONEST BOUND, AND IT CUTS THE RESULT ROUGHLY IN HALF.** Three of the seven pairs come from
`010db2c` and **fail condition 4**: the R9 drawing lane was gated on RP90 and tuned to it, so those
rows are circular for RP90, RSW and DENS. **The non-circular evidence is the four pairs that
predate DRAW-WEIGHT entirely** (`a0826ea`, `2160842`, `1783060` ×2): **RP90 ranks 2, ties 2,
inverts 0**; DENS 4 of 4. Weaker than 5/0/2. **Still not an inverted sign** — and the bottom two
rows of the table are untouched by circularity, because no lane was ever gated on them.

### 1.5 Why the cross-subject pair inverts, and why that is not a sign error

**Run the same two sheets as a SAME-SUBJECT pair** — the redrawn interceptor against its own
previous self — and the gate ranks it correctly by a wide margin:

> `enemy-interceptor-head.png` cell 0, `010db2c^` → `010db2c`: **RP90 25.14 → 18.25, RSW 12.57 →
> 8.85, DENS 252.3 → 218.5, bbox fill 42.7 → 37.3 %.**

→ `tools/out/criteria-r10/kqp/fig-enemy-crosssubject-vs-samesubject-6x.png`, **cropped and looked
at**: the "before" is a solid filled delta; the "after" has separated wing strokes with a highlight
and a shadow line and sky between them; the untouched grey beside them is a thin continuous white
V. **It is thinner than both, and it is not better than either.**

REFERENCE already said this comparison was out of bounds, in its own words: *"Near-aspect enemy,
carrier, title, death hulk — NO ARCADE COLUMN EXISTS. DRAW-WEIGHT is explicitly UNLICENSED on all
four."* **The licence was written and nothing enforced it, and the criterion's own prose —
"how heavily the object is drawn" — invites the reading the licence forbids.** Ledger row 44.

**Consequence for the board**: the highest-value acquisition this creates is the one REFERENCE
already lists — **an arcade column for the near-aspect head-on enemy** (acquisition item 5), the
sheet that owns **69.2 % of enemy screen pixels**. With one, it becomes gateable; without one, no
amount of statistic repair helps.

### 1.6 A population defect found because two rows agreed too exactly

Two pair rows printed **identical** DRAW-WEIGHT numbers. R9's own rule says a suspiciously exact
agreement is a reason to go looking. I went looking:

> **`enemy-interceptor-head.png` and `enemy-prop-head.png` have BYTE-IDENTICAL ALPHA PLANES**
> (md5 `63784d16ec4b` before `010db2c`, `c79c29b5530a` after), **as do `enemy-grey-head.png` and
> `enemy-camo-head.png`** (`8f36c102826f`, unchanged since R8). **Four day head-on sheets are TWO
> drawings in four liveries.**

Every DRAW-WEIGHT, JET-SIL or silhouette statistic is alpha-masked and therefore **identical across
each pair**. **One silhouette was redrawn in R9, not two.** Any shape statistic over those four
sheets has **n = 2, not 4**, and any "we fixed N of 8 sheets" claim double-counts. Palette and value
statistics are unaffected — the liveries genuinely differ. Ledger row 45, class 2.

*(This does not contradict the R9 critique's md5 work, which I verified: `enemy-grey-head.png` is
byte-identical at `ea3726b`, `52edcc4`, `010db2c` and HEAD. My `1783060` grey row is a **pre-R8**
change and is a legitimate pair from an earlier round.)*

### 1.7 LINEWORK — adopted as a diagnostic, refused as a gate

The art critic proposed it, stated its limits before anyone gated on it, and called it *"a
candidate, not a gate."* **That self-limitation was correct and not conservative enough.** Four
findings, all from running it:

1. **Its definition is not recoverable from its publication, and its own two controls cannot pin
   it.** "Ladder rung" is undefined. Pinned as `|ΔV| > rung`, `V = max(RGB)/255`, 4-adjacency, once
   per unordered pair, per 100 ink px, my implementation reproduces **both** published controls
   exactly (flat **0.0**, 1 px stripes **95.0**) — **and those controls return the same answer for
   every rung from 0.004 to 0.5.** They are flat across the entire parameter they exist to fix. The
   published real-subject figures reproduce in exactly one window: **rung 0.095–0.098, width
   0.003**, at which grey = **67.0**, interceptor = **73.1**, arcade = **80.8**, all three exact. At
   the obvious pinning of ⅛ the same pair reads **30.4 / 66.8**. *A gate whose published value
   moves 2.2× inside the ambiguity of one undefined word is not a gate.*
2. **Roughly half of each published margin is PALETTE, not drawing** — measured by isolation, the
   drawing held fixed and only the value ladder changed:
   - the grey sheet's own drawing re-indexed pixel-for-pixel onto the redrawn sheet's ladder:
     **30.4 → 45.2**, i.e. **40.7 % of the pair's whole 36.4-point gap, with not one pixel moved.**
     *(DRAW-WEIGHT on the same re-indexed sheet is unchanged to the digit — ink 454, span 47.3,
     RP90 15.26 — which is the control working.)*
   - the arcade anchor's own drawing re-indexed onto our 8-level ladder: **80.8 → 69.8**, i.e.
     **49.6 % of the 22.2-point arcade-vs-ours gap.** The arcade carries **11 V rungs** in the
     licensed mask where we carry **8**.
   - mechanism, measured: the grey sheet's main ladder steps are **0.094–0.130**; the interceptor's
     are **0.259–0.290**. The critic's own matched-palette licence is violated by the very pair
     used to demonstrate the candidate ranks correctly.
3. **It is a size statistic with a drawing term.** Across the nine day cells of **one sheet** — one
   drawing, nine poses — LINEWORK runs **58.6 at span 99.0 to 77.8 at span 65.3, 1.33×, with
   `r = −0.998` against span.** **Our cell 0 reads 77.8, within three points of the arcade's 80.8,
   purely because it is small.**
4. **Its one cross-side figure was produced by resampling.** The published *"ours 49.8 at matched
   span"* cannot be native: our nine cells read 58.6–77.8 and our largest span is 99.0 against the
   arcade's 109.7. Upscaling cell 4 by nearest to span 114.1 returns **50.9**. **The span was
   matched by resampling one side, and resampling is exactly what finding 3 says this statistic
   cannot survive.**

> **LICENSED AS A REPORTED DIAGNOSTIC**: same sheet, same span, publishing `rung`, span and the
> V-level count. **Not a gate; not readable across the arcade/ours boundary at all** until both
> sides can be put at an identical span without resampling, which is not currently possible.
> **Its ranking of the known pair is correct and ~59 % of that margin survives the palette
> control — the core is real. The published magnitudes are not drawing magnitudes.** Ledger row 46.

**Runs-per-row stays rejected**, now on two grounds: the critic's own (1.48 vs 1.54, reproduced
exactly) and the pair sweep (inverted 3, tied 2 of 7). Ledger row 47. *Recording it again because
the first recording is what stopped it being rebuilt, and that worked.*

### 1.8 The sweep of existing criteria — two new results

Run on the same four player-jet tree states.

| criterion | kind | result |
|---|---|---|
| **DRAW-WEIGHT** RP90/RSW/DENS | ranking + anchor | **SURVIVES** with an anchor; **diagnostic only** without |
| **JET-SIL two-blade fin rows** | ranking | **NON-DISCRIMINATING — 100.0 % on all four trees**, including the pre-R6 sheet the R6 judge replaced. Saturated before the work began |
| **JET-SIL blade cant** | anchor 1.28 | **INVERTED 2 of 3**: \|d\| 0.06 → 0.02 → 0.07 → 0.09. Both redraws this project is proudest of moved cant *away* from the arcade |
| **JET-SIL fin extent** | anchor 35.5 | ranks 2, inverts 1 |
| **JET-SIL nozzle separation** | anchor 30.0 | ranks 2, ties 1, never inverts — survives |
| **JET-SIL aspect** | **constraint** (3.0–3.6) | not a ranking statistic; correctly not a gate |
| **VALUE-STAT V median** | anchor 0.8392 | ranks 1, ties 2, never inverts — survives |
| **VALUE-STAT black share** | anchor 22.2 % | **INVERTED 2 of 3** on the authored sheet: \|d\| 9.0 → 10.6 → 2.6 → **7.9**, overshooting past the anchor |
| **Criterion A / A3 / B**, keyline, `n95` | **CONSTRAINTS** | do not claim one drawing is *better*, only *admissible*. The test does not apply and they are not weakened by it |
| ARCADE-PACING, deaths/min, emptiness | behaviour | rule generalises; **no settled pair of behaviours exists yet.** OPEN |

**Two notes I will not let be read as more than they are.** The **cant** result is a direction with
**no error bound** — the statistic may simply be too coarse to separate 1.19 from 1.28, and the
right next step is measuring the arcade's own cant across several frames, **not** touching the
sheet. The **black-share** result is on the **authored** cell; STATUS's 18.9 % is a **rendered**
reading and the two are different populations under REFERENCE's own authored-vs-rendered rule.
**Flagged, not corrected.** Ledger row 50 carries both as OPEN.

**One corroboration worth keeping**: VALUE-STAT's authored cell-4 median reads **0.6431 before
`2160842` and 0.8392 from it onward** — exactly the 0.643 → 0.8392 transition STATUS records from
captures, arrived at by a completely independent route (git history of the sheet rather than
in-game frames). **Ledger row 22's R8 correction is confirmed twice over.**

### 1.9 The retrospective evidence, which matters more than any row above

Two criteria in the ledger were **already found inverted**: **row 18** (Criteria A and B rewarded a
sea of enormous flat slabs — *"the gate improved as the art got worse"*, scoring 20 points **above**
the arcade) and **row 36** (`enemysil.py`'s compact-feature gate *fails a drawing for having* the
feature it wants). **Both were found by accident, rounds after they shipped. Both are exactly what
a known-quality pair, run in ten minutes, would have printed.** The rule is not inferred from one
case; it is the generalisation of three — and it was **not fitted to them**, since I wrote the rule
before noticing they qualified.

**And a pattern visible only now that the ledger has fifty rows**: sort them by how the defect was
found and **not one was found by a synthetic control.** They were found by cropping and looking, by
reading the stage digit, by decoding a second frame, by naming a unit. **Controls keep operators
honest; they have never once caught a criterion.** That is not an argument for fewer controls — it
is the argument for this rule standing beside them.

---

## 2. JOB 2 — the time criterion

### 2.1 Field 6: SAMPLING RATE

Added to REFERENCE's "What a complete citation is", binding: **every figure touching time states
its sampling rate as a number, on both sides, plus the decode method** (`-vsync 0` consecutive
decode vs `-vf fps=N` resample — not the same operation).

**This is ledger row 29 widened from PERIODIC to TRANSIENT.** Row 29 made sampling binding for a
repeating thing; a transient is worse, because a periodic signal at least gives the sampler
repeated chances. **A number with no sampling rate is not a temporal measurement; it is a still
with a unit attached.** Corollary, and it is the one that bites: **a negative about a transient is
worth nothing without its rate** — *"ours leaves no smoke"*, *"there is no flash"* are claims a
4 Hz sampler produces for free, and four passes published "no visible invincibility flash" about an
arcade that flashes.

GAME_SPEC gained the same caveat at the top, because **GAME_SPEC is where this project keeps its
time** and every pre-R9 figure in it is a 0.2–0.25 s grid.

### 2.2 TIME-ENVELOPE — licensed, not invented, and reproduced before publication

**The operator is the R9 judge's §2.4, quoted verbatim** (fire mask `R>180 ∧ 60<G<235 ∧ B<90`,
per-frame area as % of frame, peak = single max tick, HOLD = frames ≥ 60 % of peak, DECAY at a
named lag, **60 Hz both sides**). I did not write a second one; two operators under one name is
already four ledger rows.

**Instrument control on a known input first**: a synthetic 5 %-of-frame patch inside the band
returns **5.00 %**; the same patch at `G = 250`, one channel outside, returns **0.00 %**.

**I then reproduced the arcade column independently** — separate decode, separate implementation:

| | **my run** | R9 judge |
|---|---|---|
| peak fire area | **6.028 %** | 6.03 % |
| HOLD within 60 % of peak | **4 frames = 0.067 s** | 4 = 0.067 s |
| contiguous run around the peak | **frames 232–235 = 4** | *not published* |
| decay at +0.050 s | 0.514 × | — |
| decay at +0.100 s | **0.275 ×** | 0.28 × |
| decay at +0.500 s | 0.080 × | — |

`.reference-cache/video/ab2-longplay-60fps.mp4`, `-ss 96.0 -t 5.0 -vsync 0`, 300 consecutive frames
at 1028×720, 60 Hz, stage 1. **Two implementations, two decodes, one set of numbers.** Unlike most
arcade columns here, this one cannot go stale.

**One addition of mine to the operator: HOLD must be published as a CONTIGUOUS RUN, not only as a
count over the window.** A count cannot tell one 0.067 s flash from four single frames scattered
across five seconds. On the arcade the two agree exactly (4 and 4) — **that agreement is the only
evidence in the figure that it is one flash**. This is the repair ARCADE-PACING already needed when
a near-zero emptiness percentage turned out to be a sky that flickered 200 times instead of
emptying once.

**Alignment caveat, carried per CLAUDE.md**: `-ss` sequence extraction on the AV1 60 fps file starts
~4 s early, so `t = 96.0` names the decode command, not a verified wall-clock timestamp. **The
envelope is a relative shape and is unaffected**; absolute times from this row need re-verifying.

### 2.3 What is NOT published, and why

> **THE GATE IS OPEN. No threshold is published and inventing one here would be ledger row 37's
> defect — a gate with one of our own numbers on both sides.**

- **Our side is the R9 judge's `bd73b52` reading** (peak 3.69 %, HOLD 0.600 s, 0.85× at +0.100 s,
  no residue), labelled with its tree state. **I did not re-measure it and must not**: two build
  lanes are live and one owns `effects/explosions.js`, so any our-side figure taken now describes a
  tree that will not exist at the commit. **The our-side figure and the threshold are the effects
  lane's.**
- **The arcade's post-kill smoke stays deliberately un-numbered.** The judge read it by eye (pale
  mass, ~¼ of the frame, > 1.27 s) and refused to publish a number it could not segment past the
  clouds. **I upheld that refusal rather than repairing it.**
- **One direction warning that is a criteria finding, not a style note**: ours peaks **40 % smaller**
  and lasts **9× longer**. A flash is *brighter and shorter together*. **Cutting the duration alone
  gives a small brief puff — a third wrong answer that would pass a duration gate.** Both axes move
  or neither does.

### 2.4 The second temporal shape: a RATE HAS NO SHAPE

The arcade's kills, dated off the HIT digit between consecutive frames at 60 Hz: **t = 96.333,
99.433, 100.267, 100.500, 100.633** — a 3.100 s drought, then **three kills in 0.367 s**. The
instantaneous rate inside the salvo is **~8 kills/s, twenty times the 0.42–0.54/s average
ARCADE-PACING quotes**. Ours delivers 0.519 kills/s *smoothly* and the criterion cannot tell.

**This is the emptiness lesson one level down and it needs the same repair** — a **burst statistic**
beside the mean. **No threshold published**: the arcade sample is one salvo on one stage, **n = 5
kills**, and a burst statistic from n = 5 is a single observation. **Acquisition item: the
inter-kill gap distribution over several STAGE_MAP-keyed spans at 60 Hz.**

### 2.5 The missile

`HOMING_GAIN = 1.7` is **ASSUMED**, and GAME_SPEC now says so: no tag, no comment, no reference, in
a file where every other constant carries one. The launch→impact band it works inside is **ledger
row 49** — a 4 Hz sample of a sub-second event, on **one of the four frames ledger row 37 retired**,
with a **true support of 0.25–1.25 s**, which `missiles.js` calls "MEASURED-TO-SPEC". **Demoted to
ASSUMED with its true support stated.** The arcade side remains **unmeasured by anyone at any
rate**, and the bound on why is published rather than filled: at 60 Hz a kill dates to ±1/60 s but
cannot be attributed to a launch. **Highest acquisition item on the board.**

The *"~6 lock boxes at once"* count is from the same retired frame and is already ledger row 41
with the 22 %W lock radius it justifies (arcade anchor: **8.3 %W**). **Do not close the 3-vs-6 gap
by citing t100.**

### 2.6 Cross-lane

Messages out to **envelope-r10** and **feel-r10** asking for their operators verbatim — definitions,
statistic names and units, sampling rate of every arm, selftest results, tree states — rather than
inventing parallels; plus the warning that a synthetic cannot validate a ranking, so any "lower is
better" statistic of theirs needs a known-quality pair before I gate on it. **I handed envelope-r10
my reproduced arcade column and the contiguous-run addition. No replies at the time of writing;
the licence is published with the gate OPEN and will take their operator when it lands.**

---

## 3. JOB 3 — the skill nobody used, and the half of the defect nobody had named

**"A tool nobody uses is a documentation defect" is right, and it is only half of it.**

> **The skill's default would not have found the defect either.** `--burst-fps` defaults to **4** —
> *"consecutive frames, 0.25 s apart"*. The arcade explosion holds within 60 % of peak for
> **0.067 s**; three arcade kills arrive in **0.367 s**; the invincibility flash's states last
> **0.10–0.13 s** and defeated four measurement passes for exactly this reason. **A reviewer who
> had followed this skill exactly, at its defaults, would have produced clean 4 Hz bursts and
> concluded nothing was wrong.** Ledger row 48.

Two more defects in the same file: `-vf "fps=N"` **resamples** where consecutive decoding needs
`-vsync 0`, and `OUT_ROOT=assets/reference/motion` is **a directory that does not exist in this
repository** and is not the `tools/out/<unique-dir>` convention every other capture here uses.

**Repaired, in the three places a reader actually meets it:**

1. **The frontmatter `description`** — this is the one line every agent sees in its skill listing,
   without opening anything. It now says the skill is **REQUIRED for any claim about time**, names
   the trigger words, gives the reason in numbers (4 Hz vs 0.067–0.13 s), and warns that the burst
   default will hide the defect.
2. **SKILL.md's top**, before the "why this exists" that nine judges never reached: a **mode table**
   (stage spread → 4 Hz is fine; *how long / how fast / what happens in between* → **60 Hz,
   nothing less**) and the **native-rate consecutive-decode recipe** with its caveats.
3. **README.md** — a new "Measuring MOTION" section beside the capture tool, with both sides'
   commands, plus `known_quality_pair.py` in the tools inventory.

The original worked example (enemy sprites plateauing at fixed size) is now marked **CHECKED AND
CLEARED** — R9 measured `span × depth` constant to three decimals over 420 ticks. The defect class
is real; that instance is closed and no lane should open a gap for it.

**NOT DONE, and it is the piece JOB 3 most needs: `CLAUDE.md`.** It is not in this lane's file list
and I will not widen my own ownership on a shared tree. **The ruling is with the TL**; the exact
patch is in §5 below. There appears to be no judge-brief *file* — the brief is composed per round
in the spawn prompt — so that half is the TL's to paste, and §5 has the paragraph.

---

## 4. Ledger rows added (REFERENCE.md), 44–50

| row | one line |
|---|---|
| **44** | DRAW-WEIGHT read as a **direction** where it has no anchor. **Not a sign error**; gate unchanged with an anchor, demoted to diagnostic without one |
| **45** | Four day head-on enemy sheets are **two drawings** — byte-identical alpha planes. Shape statistics over them have n = 2, not 4 |
| **46** | **LINEWORK** caught before adoption: undefined rung with flat controls, ~41–50 % of margin is palette, `r = −0.998` vs span, cross-side figure resampled. Diagnostic only |
| **47** | **runs-per-row** stays rejected, now on two grounds |
| **48** | The repo's own motion tool **defaults to the sampling rate that hides the defect class it names** |
| **49** | GAME_SPEC §3's missile launch→impact band: 4 Hz sample of a sub-second event on a retired frame. Demoted to ASSUMED |
| **50** | **JET-SIL two-blade is saturated at 100.0 %** on every tree; **blade cant inverted on 2 of 3**. Both OPEN |

Plus the four repairs the R9 judge left this lane (its gap 11), **all made**: (a) the licence
sentence now names **DENS and bbox fill** as the cross-resolution forms, not SW/SPAN, and records
that both implementations print RP90 moving 25 % without asserting on it; (b) the anti-retune
figures corrected to **+14.3 % / −3.2 %**; (c) the retracted **CV 18.4 %** struck and replaced with
the real-subject run (**RSW is the MOST rotation-stable at CV 0.4 %**), with a *measured* reason RSW
is still not promoted rather than the inherited one; (d) the ground-truth table now states the mask
is intersected with `alpha > 0` **before** the largest-component step — worth 36 points on cell 4.

---

## 5. Unresolved, and the asks

1. **`CLAUDE.md` is not mine.** Proposed insert, for the TL, in "Running, capturing, measuring":

   > - **Anything that moves is measured at 60 Hz, both sides.** Nine rounds judged stills; the
   >   first motion pass found our explosion holding near its peak **9× longer** than the arcade's
   >   while passing every colour gate correctly. Arcade:
   >   `ffmpeg -ss T -t D -i .reference-cache/video/ab2-longplay-60fps.mp4 -vsync 0 <dir>/f%04d.png`
   >   (consecutive decode — `-vf fps=N` resamples and is a different operation). Ours:
   >   `capture.mjs --every 1 --warmup N`, or per-tick telemetry.
   >   **Every temporal figure states its sampling rate** (REFERENCE citation field 6) — a figure
   >   without one is a still with a unit attached, and *a negative about a transient needs the
   >   rate most of all*. `.claude/skills/youtube-reference/SKILL.md` has the long form; **its 4 Hz
   >   burst default is a stage-spread rate and will hide any transient.**

   And in "Measurement discipline", beside *"validate the instrument on a known input"*:

   > - **A synthetic control cannot validate a QUALITY statistic.** It proves the operator computes
   >   what it says; it cannot prove the statistic *ranks correctly*, because in a synthetic the
   >   answer is an input. **Any criterion claiming one drawing or behaviour is better than another
   >   is run on a KNOWN-QUALITY PAIR before it is licensed** — `tools/known_quality_pair.py`.
   >   DRAW-WEIGHT had five kinds of validation and this was the one nobody ran.

2. **The judge brief.** No file found. If it is composed per round, the paragraph the TL should
   paste is: *"Before you judge anything that moves, read
   `.claude/skills/youtube-reference/SKILL.md`. Nine judges did not, and the first one who measured
   motion split the score 9/10 stills against 4/10 motion. Every temporal figure you publish states
   its sampling rate, both sides."*

3. **OPEN, with the reason**: the TIME-ENVELOPE **threshold** (effects lane's), the **burst
   statistic** threshold (n = 5 on the arcade side), the arcade's **post-kill smoke** (unsegmentable
   past the clouds), the arcade **missile** (unattributable launch→impact), **JET-SIL blade cant**
   (no error bound — measure the arcade's own cant before touching any sheet), **VALUE-STAT black
   share** (authored vs rendered populations differ), and the **known-quality-pair rule for
   behaviours** (no settled pair exists in this repo yet).

4. **The circularity trap is now live for R10 itself.** Both build lanes this round are being gated
   on statistics published this round. **Next round's pairs from R10 commits will fail condition 4
   for exactly those statistics.** Pairs that predate a criterion are the ones worth saving;
   `tools/known_quality_pair.py`'s `PAIRS` table records which is which, and the "settled by" field
   is the one that makes a row evidence rather than an assertion.

---

# ADDENDUM — the effects lane applied my own rule to my own section, and it refuted two of my figures

Written after `7265ba3`, on the effects lane's delivery (`judging/R10/lane-envelope.md`).
**Ledger rows 51–56. Two of the three figures I published in the TIME-ENVELOPE box are corrected,
and one of the corrections is my own defect, not an inherited one.**

This is the round's sharpest process result and it is worth stating plainly: **the known-quality
pair rule was published in §1 and used against §2 within a day, by a different lane, and the thing
it killed was mine.** That is the loop working at the fastest it has ever worked here.

## A1. `w60`/`n60` fails a known-quality triple — REFUTED, and this one is clean

Matched harness, matched depth, matched seed, one constant set changed at a time, quality settled
**by looking at the crops**. The committed `plateau` arm reads **`w60` 6 / `n60` 8** against the
shipped flash's **8/8** — *the plateau scores better.* Mechanism: both are normalised by peak and
our sprite **boils**, so the 60 %-of-peak run is short on a mass that sits on screen for two
thirds of a second.

**This refutation is the STRONG kind and I want the reason on the record**: `w60` was
**pre-specified** — R9 named it as the explosion's headline figure before the triple existed, so
the triple cannot have been chosen to suit it. **Retired as gate candidates, demoted to reported
diagnostics.** The arcade's 0.067 s survives as a licensed arcade *fact*; what it may not be is a
number a lane is scored against. Row 53.

Also under-specified, which the effects lane raised loudly and correctly: R9's phrase never said
whether it meant the **contiguous** run or the **total**. They coincide on the arcade (4 and 4)
and do not on our build (**6 vs 16**). **My "publish the contiguous run" addition was half the
repair; the answer is publish both, and neither alone.**

## A2. My 6.03 % is the wrong operator, and the exact reproduction is what hid it

**I reproduced R9's arcade peak to the digit and treated that as proof the operator was pinned.
What I actually confirmed is that I was running R9's operator** — which has no largest-component
step. Decomposed on my own 300 frames:

> raw mask **6.028 %** → persistence-excluded **5.969 %** → **largest component 4.317 %**

against the effects lane's independent **4.32** on a different decode. The exclusion removes 442 px
(**0.060 %** of frame); **the entire difference is the component step** — at its peak the arcade
frame is **28 % other fire-coloured material not connected to the ball**. `w60` (4 vs 4) and
`r100` (0.157 vs 0.157) reproduce exactly.

**Binding, and it is now a corollary on citation field 3: an exact reproduction proves you ran
THEIR operator. It says nothing about whether it is the licensed one. Reproducibility and
correctness are orthogonal, and this project's instinct is to read the first as evidence of the
second.** Rows 14/22/27 again — committed by the lane that maintains the ledger, in a section
written the same day, *while citing the reproduction as evidence the operator was settled.* Row 51.

## A3. "Ours peaks 40 % smaller" — WITHDRAWN, class 2, mine

The arcade's own peak spans **0.83–6.03 % across five events in one stage — a factor of 7.3** —
because peak scales with the killed target's **depth**. **I compared ours against the maximum of
five**, in the same box as a rule requiring every figure to state its population. **PEAK IS OPEN:
no threshold, no ratio.** The depth-matched ratio that would remove the confound was attempted by
the effects lane and **failed on the arcade side** — stage-1 kills detonate at or behind the
player, where the target is not separable before first light. At **matched depth** the direction
reverses: shipped peaks **39 % higher** than the plateau it replaced. Row 54.

## A4. Why I declined the proposed gate, and what I propose instead

The effects lane proposed **`life10` ∈ 8–18 frames**. It ranked the triple correctly (40/15/9).
**Declined, on three measured grounds, none of which is a doubt about their work:**

1. **It does not reproduce** — **21 frames here against their 14**, on one event, with the same
   mask, same exclusion, **same peak, same `w60`, same `r100` to three digits.** I tested two
   explanations and **refuted both**: the per-run persistence exclusion is stable (438–444 px
   across four derivation windows, `life10` = 21 under all four), and window length sits on a
   **plateau of 21 across 25–50 frames**. What remains is the **event boundary, which the operator
   does not define** — 10 % of peak falls inside the residual-debris floor (post-peak series
   0.39–0.87 % against a 0.43 % threshold). **A band of 8–18 with a 7-frame reproduction gap on a
   single event is narrower than its own error.**
2. **It does not reproduce across populations on our side either** — their own harness 9, in-situ
   15, from component merging with an enemy nozzle.
3. **It is the statistic most exposed to the `r9` recovery problem** (54.9 % → 18.5 % across one
   event), so near the 10 % threshold it is substantially reading a palette transition.

**`r100` is the better candidate and the reasons are independent of the triple**, which matters:
it **reproduced to three digits across two implementations and two decodes**, and being a **single
named lag** it needs no event-boundary definition and cannot inherit one. It also ranks the triple
correctly. **Pre-register it; test it on the next pair.**

## A5. The rule gained a clause from being used: REFUTATION vs SELECTION

> **Refuting a PRE-SPECIFIED statistic with a known-quality pair is strong.** The statistic was
> named before the pair existed.
> **SELECTING the winner from a menu of statistics against one pair is FITTING, not validation** —
> run seven statistics against one triple and one of them ranks it best by construction.
> **Binding: a statistic chosen because it ranked a known pair must be PRE-REGISTERED and tested
> on the NEXT pair before it is gated. One pair can kill a criterion; it takes a second, unseen
> pair to license one.**

This is the clause that makes my `life10` refusal principled rather than fussy, and it applies to
my own §1 result symmetrically: **RP90's survival across seven pairs is not a licence either** —
it is a refutation that failed, which is weaker than a validation.

## A6. Rows filled and rows that stay open

**FILLED: the smoke, and it is PEACH.** R9's refusal was not beaten — it was **sidestepped**, with
a kill over **open sea, no cloud in frame**. Mean RGB **(236, 188, 162)**, dominant `#f4c8b3`,
peak **7.20 %**, **≥ 0.8 s by eye, n = 1**. **This settles a standing `explosions.js` argument in
its favour on both halves**: the daylight arcade explosion has no grey, and authoring grey from a
**night** frame would have been ledger row 12 again. **Decay envelope and size distribution stay
OPEN** — near a cloud bank the largest component flips **17.35 % → 0.09 %** between frames, which
is the mask failing, not the smoke moving. *"Ours leaves no smoke" is now false*, measured at
60 Hz either way; but ours is measured by **exact palette match, an operator that does not exist
on the arcade side**, so **5.78 vs 7.20 is two operators and not a comparison.**

**Row 55 — the 60 fps file is genuinely 60 unique Hz, and the instrument is the finding.** R6's
*"duplicate frames, 1/30 s effective rate, verified by hashing"* is refuted: **hashing cannot test
this on an AV1 re-encode**, since every frame gets a distinct hash whether or not the content
repeats. The md5 test is **vacuous in both directions**. Pixel differences: 119 consecutive pairs,
mean per-channel |Δ| **17.4–37.6, none identical**. **Anyone who stepped at 1/30 s on that sentence
halved their resolution for nothing.**

**Row 56 — a new taxon, and it is row 37's cousin rather than its repeat.** The two "incompatible"
arcade claims about enemy shots are **both true and not both arcade figures**: the 0.11 s spacing
is **our own `enemy.js` constant projected onto the arcade**. Row 37 is a closed loop between
**two** of our own numbers; this is a **HYBRID** — one real arcade measurement making our own
assumption look sourced. **Binding: when a figure is derived from more than one input, label the
provenance of EACH INPUT, not of the result.**

**Citation field 3 extended rather than a seventh field added**, per the effects lane's request:
**a masked operator states its recovery against ground truth per side, or states that it is
unobtainable on one of them.** This generalises R9's DRAW-WEIGHT mask rule from sprite masks to
every mask in the document. Folding it into field 3 rather than adding field 7 is deliberate —
two rules with one meaning is how this project acquires ledger rows.

## A7. What I did not do

- **I did not re-measure the effects lane's our-side figures.** Their before/after sit on two
  different trees (HEAD moved to `7265ba3` mid-round and another lane changed `player.js`), they
  flagged it themselves, and the matched-tree evidence is the triple. **The 3.33 % → 2.04 % pair
  is excluded from REFERENCE as a peak comparison**, at their request and on the merits.
- **I did not gate anything.** Licensed this round: the operator, the arcade column on the correct
  operator, the `w60`/`n60` refutation, `r100`'s reproducibility, and the smoke palette. Open with
  reasons: peak, `life10`, the burst statistic, the smoke decay, the enemy-shot reconciliation.

---

# ADDENDUM 2 — the feel lane, and a standing caveat of this project's turns out to be wrong

Ledger rows **57–59**, plus a classification added to the known-quality-pair rule. Sources:
`judging/R10/lane-feel.md`. **The headline is that a caveat I propagated into three documents
this morning is refuted — and I refuted it on my own decode, not on their word.**

## B1. `-ss` is exact, and the "~4 s early" warning is costing precision

CLAUDE.md has warned since before R1 that `-ss` sequence extraction on the AV1 60 fps file starts
~4 s early. **Three independent invocations this round say otherwise, and one of them is mine:**

| test | result |
|---|---|
| feel lane, `-ss 98.5` f-0136 vs `reference/stage1-missile-salvo-t100.75.png` | **mean \|Δ\| = 0.0000** |
| **this lane, `-ss 96.0` f0286 vs the same committed frame** | **0.0000**, neighbours **21.3 / 23.5** |
| effects lane, `-ss 99.0 -i F` vs `-ss 95.0 -i F -ss 4.0` | **12 byte-identical frames** |

`t = T_ss + (i−1)/60` is exact for `ffmpeg -ss T -i FILE … -vsync 0` on this file. **The caveat
must name the form it applies to or be retired.** Row 57.

**The part worth generalising: a standing caveat that is wrong is as expensive as a missing one,
and much harder to notice, because being careful feels free.** It cost this round two hedged
timestamp sets and one re-derivation. **And the verification is one minute** — compare the frame
at the predicted index against a committed reference PNG. **A correct anchor is a ZERO WITH LARGE
NEIGHBOURS**; a plateau of small values means you matched a static scene and proved nothing. That
recipe is now in REFERENCE and SKILL.md. **CLAUDE.md is not mine — flagged to the TL.**

## B2. Two published figures are now free of the four retired frames

A blind detector over **420 consecutive frames** returns a cleanly bimodal width histogram:

| mode | n | R10 whole-sequence | previously published | by |
|---|---|---|---|---|
| lock bracket | 75 | **5.246 %W** | 5.15 %W | R5 |
| nose sight | 68 | **1.493 %W** | 1.563 %W | R7 |

**Two numbers, two lanes, two rounds, recovered by one operator shown neither, on frames selected
for neither.** This is the strongest corroboration shape available here and it is precisely what
rows 37 and 41 ask for. Published with the lane's **declared precision failure** (the night
stage's ground speckle produces a false-positive continuum, so any night count is an upper bound)
and with the convention warning that the detector reports **outer span** where `lockSystem.js`
uses **centre-to-centre** — convert, or it is row 27 again.

## B3. Restatements and a new clause

- **"~6 lock boxes at once" → "≤3 ambient, more during a salvo", 6 OPEN.** Clean sample: max 3,
  and ≥2 in only **3.6 %** of frames. The *ambient* figure is the new fact: **a build showing
  several brackets continuously is wrong even if its salvo peak is right.**
- **NEW: the arcade's lock bracket does not animate in size** — flat within ±2 px across 26
  consecutive frames, appearing at its final size. The lane was briefed to make ours "fill" and
  **did not build it because of this measurement.**
- **First ever measurement of arcade stick behaviour**: steps quantised in **whole native pixels**
  (0, 1 or 2 per frame, never more), and **rails at ±101 px = ±9.83 %W** — nine stationary runs,
  eight at two identical sub-pixel x values. **AB2 does not auto-centre.**

## B4. Row 58 — the feel lane found row 37's shape in its own figures and declined its own gate

Ours is **2.5–3.0× the arcade's sight rate**; our envelope is **3.2–3.5× too wide**; so
**centre-to-rail is 0.31 s against 0.24 s — nearly matched.** A rate gate would slow a stick that
already crosses its own screen in about the right time, **because the rate gate is measuring the
envelope.** Row 37 closed its loop by re-measuring our own build; **this one closes by normalising
one of our own wrong numbers out of the statistic**, which is harder to see. Binding: **publish
the rate, the span and the traverse time, or none of them.**

## B5. Row 59 — the ledger records defects caught, never features prevented

Noticed because R10 produced a third one. Rows 42, 43 and the bracket-animation finding are all
**PREVENTED-BY-MEASUREMENT**, and all three came from lanes measuring the thing they were about to
build. **That is the cheapest version of this ledger's win and nothing was counting it.** Three
instances in two rounds is a pattern.

## B6. A classification the pair rule needed, and the feel lane earned it by asking

They asked whether their statistics needed known-quality pairs and argued no. **They are right,
and the reason generalises into four kinds** — now in REFERENCE:

**QUALITY RANKING** (direction internal to the statistic) is **the only kind that can have an
inverted sign**, and the only kind the pair test gates. A **FIDELITY MATCH** has the arcade for a
direction. A **CONSTRAINT** has none. A **DIAGNOSTIC** has no preferred direction and must not
become a gate by habit — their hit rate is the worked example, where **higher is explicitly not
better, because 100.0 % was the defect.**

> **The trap the table exists to close: a FIDELITY MATCH degenerates into a QUALITY RANKING the
> moment its anchor goes missing — which is exactly ledger row 44.** Check for the anchor, not for
> the wording.

## B7. Carried, not resolved

- **`HOMING_GAIN` stays ASSUMED**; three arcade operators built and withdrawn, each cropped and
  looked at before withdrawal. **Its blast radius shrank without its provenance improving** —
  a new clamp means its value does not reach the simulation above `0.01283 fracW/tick`. That is
  the useful kind of partial progress and the tag table in GAME_SPEC is the pattern to copy.
- **Launch→impact: launch now datable to one frame; impact not.** A **candidate** 0.43–0.90 s band
  is published with its assumption named and **not** tagged MEASURED. The route to closing it is a
  **window with no gun fire** — a targeted search, not a fourth operator.
- **The attract-mode regression is declared by the lane that caused it** and is handed on. **Any
  citation of R9's attract-cycle credit needs the caveat** until `demoTimeline.js` is re-authored.
- **Coupling on row 41**: cone width, sight speed and acquisition time are one system; moving any
  one alone is a mistake the document now warns against.

---

# ADDENDUM 3 — row 57 closed at a third seek point, and the guard the feel lane asked for

## C1. Two more anchors, 76 s away, reproduced here

The first three row-57 tests all sat within 3 s of each other and could not rule out a seek that
drifts elsewhere in the file. The feel lane found **two committed stage-3 stills inside its own
night window** and anchored against them; I reproduced the first independently rather than taking
it:

| test | reference | best frame | mean \|Δ\| | separation | implied t |
|---|---|---|---|---|---|
| feel lane, `-ss 174.0` | `stage3-night-level-t175.png` | f-0061 | 1.796 | 2.7× / 3.3× | **175.000** |
| **this lane, `-ss 174.0`** | the same | **f0061** | **1.796** | **2.8× / 3.1×** | **175.000, residual +0.000 s** |
| feel lane, `-ss 174.0` | `stage3-night-lockon-t186.png` | f-0721 | 2.034 | 3.3× | **186.000** |

**Five invocations, three lanes, three seek points spanning 76 s.** Row 57 is closed as far as
this file is concerned.

**The recipe gained a case I had written too narrowly.** I published *"a correct anchor is a zero
with large neighbours"* — true only at matched resolution. These stills are 686×480 against
1028×720 frames, so **a zero is impossible and the test is a SHARP MINIMUM (~3×)**. Both forms are
now in REFERENCE, with the shared failure mode named: **a plateau of small values at either
resolution means you matched a static scene and proved nothing.** *Resolution mismatch does not
stop you anchoring; it changes which signature you look for* — and had I left the zero form
standing, the next lane with only a resampled still would have concluded it could not anchor.

## C2. The real price of a wrong caveat, as the lane that paid it priced it

I had written that the bad caveat cost two hedged timestamp sets and a re-derivation. **The feel
lane's own accounting is worse and more useful: it cost a check they had the materials for and
did not run** — two committed stills sat inside their own window, unused, *because being careful
felt like it had already discharged the obligation.*

> **That is the expensive half, and it leaves no trace at all.** A hedge is visible in the text
> and someone can go and test it. An unrun check is invisible: there is no sentence to audit, no
> number to reproduce, nothing for a reviewer to find. Row 57 carries this.

They also withdrew the hedge **in those words, with the table**, rather than quietly deleting it —
which is why it was auditable at all.

## C3. The figure guard, written as asked

The feel lane noticed row 44's trap landing on two of their own plots: strip the arcade band and
*"peak step moved 9.63 → 5.54"* becomes an improvement score with no referent. They put the band
inside the image and asked me for a stronger guard. Published:

> **The anchor travels with the FIGURE, not with the caption.** A fidelity match loses its anchor
> **by being quoted**, not by being wrong, and nobody has to make a mistake for it to happen — it
> is the normal lifecycle of a number here (rows 21, 30 and 32 are the same lifecycle one step
> further on). Draw the arcade band inside the image; state the anchor in the same sentence as
> the figure, every time.
> **Companion: a before/after pair with no arcade band is not a fidelity match — it is two of our
> own numbers, and the only honest reading is "it changed", not "it improved".**

## C4. Two corrections carried, and one that needed nothing

- **The feel lane's baseline command is `git archive 8725647`, not `git archive HEAD`** — HEAD
  moved to `7265ba3` after their captures, so the command as first written is now a trap.
  **Checked: I never quoted it in any of my files, so nothing needed fixing here.** Recorded so
  the next reader of their report uses the hash.
- `judging/R10/envelope_r10.py` is the effects lane's and was swept into `7265ba3` mid-edit; both
  lanes have now marked it and left it alone.

## C5. On row 59, from the lane it came from

Worth recording verbatim in substance, because the PREVENTED-BY-MEASUREMENT class only pays if
near-misses get reported: **they were about to build the shrinking lock box.** The brief said the
brackets fill, it is a good-looking feature, and the only thing between it and the diff was
deciding to run the histogram before opening the editor. **Until the class exists that is a
coin-flip of temperament, not a process.** It exists now.

---

# ADDENDUM 4 — my own pre-registration refuted, same day, by the lane I pre-registered against

Ledger rows **60–61**. **I pre-registered `r100` as the gate candidate this morning and it is
withdrawn tonight. Both of the grounds I registered it on turned out to be the defect.**

## D1. Verified before accepting, and it is worse than they put it

The effects lane's claim is that `r100` is read at a lag where "largest component" has already
re-targeted. I ran it on my own decode of arcade D rather than taking theirs:

| lag | area % | centroid jump | centroid |
|---|---|---|---|
| **0 — peak** | 4.317 | — | **(141, 227)** |
| +1 | 0.874 | 9.1 %W | (99, 143) |
| +5 | 0.485 | **51.2 %W** | (484, 456) |
| **+6 — where `r100` is read** | 0.677 | 1.6 %W | **(471, 465)** |

**At the lag `r100` is read from, the "fireball" is an object 39.6 %W away from the peak fireball,
in the opposite corner of the frame. The arcade's `r100 = 0.157` is one object's area over another
object's area.** Their D-horizon of +1 at T = 5 %W reproduces exactly on my data.

I also ran their `--selftest`: **control 6 is real and non-vacuous** (a decoy overlapping the real
event *with no gap* — an earlier version left one and passed vacuously). Untracked `r100` reads
**0.836** against a prescribed truth of **0.068**.

## D2. Both grounds were the defect, and the first one is my own rule turned around

1. *"Reproduced to three digits across two implementations and two decodes"* — **shared-defect
   agreement. This is ledger row 51 one level down, committed inside the repair for it.** Both
   implementations run the same largest-component selection, so both re-target in the same frame
   onto the same wrong object and agree exactly. Row 38's cancelling errors, except these do not
   cancel — **they are identical.** I wrote *"an exact reproduction proves you ran THEIR operator,
   not that it is the licensed one"* this morning and then used reproducibility as a licence by
   the afternoon.
2. *"A single named lag, so no event boundary to inherit"* — **true and insufficient.
   Boundary-free is not attribution-free.** I had correctly identified that `life10` inherits a
   missing definition, and then assumed the only such definition was the boundary.

**And row 52's diagnosis was wrong too.** I called the 21-vs-14 an event-boundary problem and
asked for a debounce rule. The lane implemented it and swept it: K = 1…8 gives `life10`
**14, 14, 26, 26, 84, 84, 84, 84**. *It parameterises the disagreement instead of removing it* —
"two readers differ" becomes "two readers pick different K". **A repair that converts a
disagreement into a free parameter is not a repair**, and I should have recognised that shape
from the mask-rule history.

## D3. What is published instead, and it is worth more than the gate

**THE ATTRIBUTION HORIZON** — the first lag at which the largest component's centroid jumps more
than `T` of frame width. **Any statistic beyond it is unlicensed.** A detector, not a tracker: it
only has to notice the selection broke, so it needs one threshold instead of a motion model.

> **Binding precondition: every envelope figure publishes its LAG and that event's HORIZON, and a
> figure beyond the horizon is not published.** Mechanical, and it would have caught **all three**
> bad numbers — both `life10` readings and my `r100`.

I took this over a gate deliberately. **A precondition that is mechanically checkable and catches
known defects is worth more this round than a threshold nobody can defend**, and it is the shape
the project's best rules already have (population assertion, stage digit, field 6).

## D4. The structural finding, which is the part that outlives this operator

`w60`/`n60` are confined to frames at ≥60 % of peak, where the component is dominant **by
construction** — so they are inside the horizon on all four arcade events.

> **The statistics the known-quality triple refuted as RANKERS are the only ones that are
> ATTRIBUTABLE. The statistics that rank are the ones that are not.**

**This is not bad luck and not an artefact of this mask.** A statistic that discriminates a
*decay* must read the *decayed state*, and the decayed state is by definition the one in which
the subject is no longer the largest thing in the frame. **Discriminating power and
attributability are in direct tension; no threshold resolves it, only identity.** That is why the
answer is a tracker and not a better cut-off, and why I am not asking for one more threshold.

**Plus an asymmetry nobody had looked for**: our horizon is **+10 to >12**, the arcade's **+1 to
+9** — not because our operator is better but because our frames hold far fewer competing
fire-coloured objects. **A population difference, so no lag statistic is symmetric between the
sides by default**, and it is invisible to any control that runs on one side only.

## D5. My ruling on their question: do NOT build the third tracker this round

They offered to spend remaining time on a real tracker. **No — and the reason is this round's own
rule.** Two designs failed in an afternoon, **both found by cropping rather than by the numbers**,
which means a third built under end-of-round pressure would most likely produce a plausible
broken instrument. Worse, the chain to a gate is two steps, not one: a tracker needs its own
correctness validation (control 6 is the right harness and already exists), **and then the
statistic on top of it still needs the known-quality triple re-run.** That does not fit, and a
half-validated tracker is how this project acquires the defects it spends rounds removing.

**Shipped instead**: the horizon as a precondition, their threshold-sweep script requested for the
tree, and the tracker written up as a next-round acquisition item **with its validation
requirement stated up front** — control 6 plus crops for the tracker, then the triple for the
statistic. The validation harness existing before the instrument is the right order and is rarer
than it should be.

## D6. What this says about the round

**Three of my own published or pre-registered figures were refuted this round by the lanes using
them** — `w60` as the headline statistic, the 6.03 % arcade peak, and now `r100` — and **every one
was found by a lane applying a rule I had just written.** That is the loop working at its fastest,
and it is also the honest health warning on everything in this file: **R10's criteria are the
least-tested things on the board, and the pair rule's own clause applies to them — one refutation
can kill a criterion; nothing here has survived a second, unseen pair.**

---

# ADDENDUM 5 — the horizon detector's own negative was weak, and the crop that caught it

Ledger row **62**. The effects lane corrected the horizon table it sent me a message earlier,
unprompted, having cropped its own long horizons before believing them. **I verified the mechanism
on my own decode rather than taking it, and the crop refines it.**

## E1. The finding, in one line

> **A long horizon is not evidence of clean attribution. It is only the absence of an ABRUPT
> break.**

Their jump-only detector reported a **28-frame** horizon on one arcade kill; from about lag 6 the
selection was sitting on **the player's own afterburner nozzle discs** — orange, in every frame of
every stage, un-removable by the persistence exclusion (which removes only what is *stationary*),
and **moving smoothly, so no jump ever fires.** f069's 28 is now **7**.

**This is the project's standing negative-result rule arriving on a detector rather than on a
measurement**: a negative is only as good as the instrument's ability to see the thing it denies.
A detector with only a jump test reports **its longest, most confident horizons exactly where it
is most wrong** — the failure is anti-correlated with the confidence.

## E2. I cropped lag 11 of arcade D, and the competitor set has at least two classes

`tools/out/criteria-r10/envelope/lag11-what-is-it.png` — the selected component painted magenta.

| class | what it is | behaviour | caught by |
|---|---|---|---|
| **another kill's fireball** | lag 11 of event D: a **7 778 px** mass directly beneath the player | appears abruptly, elsewhere | the **jump** test |
| **the player's own nozzles** | plainly visible in the same crop, two lit orange discs | **moves smoothly with the jet** | **only the size floor** |

**So my lag-11 re-target is the transient class and theirs is the persistent class — two distinct
failure modes, and only one of them was ever visible to the test built first.** The crop is worth
opening for its own sake: the frame contains the decaying fireball, a second kill's fireball, the
player's two lit nozzles and a lock-on bracket, all fire-coloured or bright, all competing for
"largest component". **That single image is the best argument in this round for why the envelope
family needs identity rather than thresholds.**

## E3. The repair, and the control that found its sharp edge

**Size floor**, derived per run like the exclusion: `clutter` = median largest-component area over
the frames **before first light**; once the component falls to **2 × clutter** it is
indistinguishable from the junk whether or not it jumped. Horizon = **the earlier of the two
conditions**.

**The clutter window must stop at first light, not at the peak.** Measured from the peak it
swallows the event's own rise and puts the floor *above* the peak, cutting the licence at lag 1 on
both control arms — **found by the control, which is what controls are for.** That detail is in
REFERENCE because it is exactly the kind of thing a re-implementer gets wrong silently.

**Side effect worth as much as the fix: the threshold stopped being load-bearing.** Every event is
now flat across **T = 0.08–0.20**, where the jump test alone wobbled 3 → 7 → >12. *A parameter
that stops mattering once the operator is right is the strongest evidence the operator is right* —
and it is the opposite of row 52's debounce K, which made a parameter matter more.

**Control 8b** encodes the failure mode: an object drifting 1.5 px/frame from the event's own
location, max jump **0.47 %W** — below every threshold — caught by the floor at the prescribed lag.
Their selftest is **30 checks, PASS**; I ran it.

## E4. What this closes off, so nobody re-opens it

**There is no clean-attribution arcade kill to be found by choosing the scene.** The open-sea trick
that rescued the smoke row removes *clouds*; nothing removes **the player's own jet**, which is in
every frame of every stage and carries two lit orange nozzles. All 14 candidate kills across both
decoded windows were scanned and the three long horizons were all nozzles. **Recorded so the next
lane does not spend an afternoon on it** — and it was my suggestion that sent them looking, so the
negative is worth more to me than the idea was.

**Carried into the tracker #4 acquisition item**: mask the player's own airframe *before* the
envelope operator runs. The nozzles are findable — a fixed-size pair whose screen position the HUD
and the jet already give us — and removing them takes out the single worst competing object on our
side and the arcade's alike. **A pre-step that belongs with the tracker, not instead of it.**

## E5. Process notes

**They folded the horizon into `envelope_r10.py` as `--horizon` rather than shipping it beside
the tool, and print the lag profile in the same block as the horizon so the two cannot be quoted
apart.** Both are the right call and both are this round's lessons applied without being asked:
a second operator under a second name is what rows 14/22/27/34/51 are made of, and a figure that
can be separated from its licence eventually will be.

**Row 61 lands on me and on them equally.** I spent two messages treating a long horizon as a
licensed lag, on a detector whose negative neither of us had tested. The difference this time is
only that **the crop came before the publication** — which is the entire margin this project
operates on.

---

# ADDENDUM 6 — the our-side horizon was two populations, and the persistent class is ours too

Ledger row **63**. Self-reported by the effects lane after my lag-11 crop prompted them to run the
equivalent check on our side. **I looked at their crop before publishing it.**

## F1. The correction, and it is row 21's class inside the box that enforces row 21

The our-side horizon column went into REFERENCE as **">9 / 10"**. Those are **two populations, not
two readings of one quantity**. Over the 30 frames before first light:

| capture | competing components / frame | total masked |
|---|---|---|
| `?combatexpl=1` harness | **0** (max 0) | **0.000 % of frame** |
| `?demo=2` in-situ | **16** (max 19) | 0.287 % |

**The harness's ">9" is not a long horizon — it is an event ending before anything could
out-compete it.** Only the in-situ **10** was ever comparable to the arcade's 1–9. Corrected;
the harness figure is dropped from the column.

**The asymmetry conclusion survives and is weaker than I published it: arcade 1–9 against our 10,
one population against one — not a range against a range.**

## F2. The clause the precondition shipped without

> **The attribution horizon is a property of the CAPTURE** — not of the build and not of the
> operator. **It must be measured in the same capture as the figure it licenses; a harness horizon
> and an in-situ horizon are not interchangeable readings of one quantity.**

My precondition said *publish the lag and the horizon* and never said where the horizon had to
come from. **Row 63 is what that hole produced inside a day.** The reason it is a capture property
is one line: **what the horizon measures is how much OTHER FIRE is in your frames.**

## F3. The persistent competitor class is ours too — confirmed by looking

`tools/out/envelope-r10/ours-competitor-set.png`, every component painted, directly parallel to my
lag-11 crop. **I opened it.** Fifteen components; the two largest by a factor of four:

| px | what |
|---|---|
| **459** | **the player's own LEFT nozzle disc** |
| **441** | **the player's own RIGHT nozzle disc** |
| 117, 117, 99, 72, 63, 63 | the vulcan column climbing from the nose |
| 63, 54, 45, 45 | enemy shots |

**So the persistent class is not an arcade artefact** — same object, same mechanism, largest
competitor on both sides. The arcade's frames merely add the transient class on top.

**This upgrades airframe masking from an arcade-side convenience to the one pre-step that moves
both sides — and makes it testable before it is trusted**, because our own airframe has ground
truth and the arcade's does not. Validate on our side, then apply. That ordering is now in the
tracker #4 item.

## F4. A worry their measurement killed, and the limit it exposed

They expected their own `FRAC_FAR` change — each enemy shot ~5.6× larger in area, in a colour
inside the `r9` mask — to have raised our clutter floor and shortened our horizon: **a build change
silently invalidating a figure I had just published.** Not confirmed: the floor is set by the
largest competitor (459 px nozzle) and the largest shot is 143 px.

**Reported anyway, which is the right call, and the general form is the keeper: the size floor is
a MAX, not a SUM.** It is insensitive to everything smaller than the biggest competitor — and
therefore **entirely hostage to that one object.** Remove the nozzles and the floor is set by
whatever is next, which nobody has characterised. **That is a caveat on the pre-step in F3**: the
fix that lengthens the horizon also moves the floor onto an uncharacterised object, so the
pre-step and a re-characterisation of the floor have to land together.

## F5. Count

**Four of my published figures were corrected this round** — `w60` as the headline statistic, the
6.03 % arcade peak, the pre-registered `r100`, and now the our-side horizon column. **Three were
found by the lanes using them and one by me; none by a reviewer.** Every correction arrived with
its measurement attached and, in three cases, with the reporting lane withdrawing its own number
in the same message. That is the loop working, and it is also the reason the health warning at the
end of Addendum 4 stands unchanged: **R10's criteria are the least-tested things on the board.**

---

# ADDENDUM 7 — the post-nozzle floor, characterised; closing the round

The last exchange of the round, and it is the shape I would want every one of them to have: **I
named an uncharacterised quantity in a caveat, and the effects lane closed it with the existing
operator on captures already on disk — no fourth instrument.**

## G1. The number my caveat asked for

Competitor size by rank, **60 pre-event in-situ frames, no explosion present**
(`tools/out/envelope-r10/ours-final-insitu/`):

| rank | median | p10 | p90 | what |
|---|---|---|---|---|
| 1 | **324 px** (0.050 %) | 125 | 614 | **nozzle disc** |
| 2 | 148 px (0.023 %) | 108 | 334 | **nozzle disc** |
| 3 | **108 px** (0.017 %) | 90 | 189 | vulcan column |
| 4 | 94 px (0.015 %) | 72 | 117 | vulcan / enemy shots |

> **Floor today = 2 × rank 1 = 648 px (0.100 %). Floor with the airframe masked = 2 × rank 3 =
> 216 px (0.033 %). A 3.0× drop.**

**My caveat was right and the magnitude is 3×** — masking the nozzles without re-deriving the
floor would silently lengthen every licensed lag. Not bookkeeping.

**Figures are the effects lane's. I did not re-derive them**, and I have said so in REFERENCE
rather than letting the placement imply otherwise. The captures are on disk; the claim changes no
licensed figure — it characterises an item that was OPEN.

## G2. The part I did not see, and it inverts my own caveat

**The cliff is good news for the pre-step.** The floor is hostage to its top competitor only while
a **dominant** one exists. The nozzles are 2–3× the next object; **below them the distribution is
flat** (108 vs 94, overlapping p10–p90). **So after masking, the floor is set by a POPULATION
rather than by a single object — which is exactly the condition under which a max stops being
fragile.**

**The pre-step does not only lengthen the horizon; it fixes the fragility I raised against it.** I
had written the caveat as a cost of the fix. It is a cost *and* the fix for the thing the caveat
was about. That is a better outcome than the one I was arguing for, and it came from the lane I
was arguing with.

## G3. Closing position of this lane

- **Nothing is gated.** Licensed: the operator, the arcade column on the correct operator, the
  `w60`/`n60` refutation, the smoke palette, the bracket and sight whole-sequence corroborations,
  the attribution horizon **as a precondition**.
- **Open with reasons**: `peak`, `life10`, `r100`, the burst statistic, smoke decay, the
  enemy-shot reconciliation, arcade missile launch→impact, JET-SIL blade cant, VALUE-STAT black
  share, the known-quality-pair rule for behaviours.
- **Ledger contiguous through 63.** `tools/known_quality_pair.py` 6/6, `inkspan.py` 8/8,
  `envelope_r10.py` 30/30, envelope control exact. **No `src/` edit by this lane at any point.**

**Five of my published figures were corrected or withdrawn this round** — `w60` as the headline
statistic, the 6.03 % arcade peak, the pre-registered `r100`, the our-side horizon column, and the
"ours peaks 40 % smaller" comparison. **Four were found by the lanes using them, one by me, none by
a reviewer.** Every one arrived with its measurement attached, and in four cases the reporting lane
withdrew one of its own numbers in the same message.

**That is the strongest evidence this round produced that the loop works, and it is also the health
warning on everything above: R10's criteria are the least-tested things on the board.** The pair
rule's own clause applies to them without exception — *one refutation can kill a criterion; it
takes a second, unseen pair to license one, and nothing published this round has had one.*

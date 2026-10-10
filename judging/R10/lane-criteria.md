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

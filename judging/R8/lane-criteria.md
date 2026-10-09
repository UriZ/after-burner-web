# R8 criteria lane — the rule that would have caught the recurrence

**Lane**: criteria. **Files owned**: `REFERENCE.md`, `GAME_SPEC.md`, `STATUS.md`,
`STAGE_MAP.md`, `README.md`, `judging/R8/*`, new `tools/`. **Nothing under `src/`** — five
build lanes were live throughout and I wrote to none of their files.

**Tree state.** Started at `82365e9`; `1783060` (the out-of-cycle enemy-art lane) landed
mid-round and is accounted for below. **Every our-side pixel figure in this report is measured
on capture sets taken at `82365e9` by the R7 judge, before any R8 lane touched the tree** — I
deliberately did not re-capture, because with five lanes editing `src/` concurrently a fresh
capture would be a figure for a tree state nobody can name. Arcade-side figures are measured on
the true-native PNGs in `reference/`, which no round changes. Sprite figures in §6 are measured
on the sheets at `1783060`.

**Instruments validated before anything was believed** — `measure_criterion_ab.py --selftest`
PASS (arcade exact 138/31/68.7/68.5 and 79/17/84.0/80.2), `measure_stage_identity.py --selftest`
PASS, and both new tools carry their own controls, described where they are used. Every
"measures zero" result in this report was cropped and looked at; two of them are figures.

---

## JOB 1 — the recurrence, and the rule it yields

**R7's headline claim — "Criterion A passes in ordinary play with combat" — is TRUE and its
evidence could not have shown it false.** The twelve frames were `?fixed=1&seed=1&invincible=1`,
and under `?fixed=1` with no `?demo` **`main.js` injects no input at all**. The team lead's
verification used the same invocation, so a true claim was confirmed twice by captures that
could not have falsified it.

**That is ledger row 21's own defect — a Criterion A figure quoted without its real population —
inside the repair for ledger row 21, in the same table, one round later, published by the lane
that spent that round enforcing the rule on everyone else.**

### What I added: the population is a positive control, asserted in the pixels

> **A population claim is verified by an assertion over the captured frames themselves, never by
> the invocation that was intended to produce them.**

The reason this has to be a tool and not a paragraph is that **every hygiene check this project
runs passed on those twelve frames.** The parameter was spelled correctly, the capture ran, the
frames were non-black, de-duplicated *across* directories (the R7 detector) and digit-verified.
**Nothing anybody runs looks at CONTENT.** An invocation is an intention; a frame is a record.

**`tools/assert_population.py`** (new). Reads the authored effect palettes **out of `src/` at run
time** — so it cannot silently go blind when a lane retunes a constant, and it fails loudly if a
palette is renamed — and counts **exact-colour** membership per frame. Exactness is sound here
because every effect is snapped to a declared palette by `effects/pixelTexture.js`; the R7 art
critic measured 150 consecutive explosion ticks introducing *exactly* the seven authored colours
and no other. Three classes, reported separately:

| class | what it proves | source |
|---|---|---|
| **PLAYER-WEAPON** | the player fired | `VULCAN_PALETTE`, `MUZZLE_PALETTE`, `MISSILE_PALETTE` |
| **EXPLOSION** | a fireball is on screen — **not** that it was a kill | `EXPLOSION_PALETTE`, `CHUNK_PALETTE` |
| **ENEMY-FIRE** | ambient enemy traffic, **reported on purpose** | `SHOT_PALETTE`, `TELEGRAPH_PALETTE` |

**ENEMY-FIRE is the half that matters.** It is what R7's no-input captures *did* contain, and it
is why those frames read as combat to three separate readers. A set with enemy fire and nothing
else is exactly the false positive the rule exists to refuse.

**Controls, all passing (`--selftest`):**

| control | result |
|---|---|
| black frame | detects nothing |
| planted 49 px patch of a palette colour | reads exactly **49**, no cross-talk between classes |
| **the same patch one channel level off** | reads **0** — membership is exact, so no gradient can satisfy it |
| 100 px of a colour shared with cloud/smoke (`#f7f7e6`) | **0 strict / 100 weak** — shared colours never decide a verdict |
| a bilinear 3× upscale | **REFUSED**, not silently averaged |
| **collision control**: `?nocombat=1`, `?combatonly=enemies` | **0 in every class** — per-tree proof the detector has not drifted into the background art |
| **KNOWN-BAD: the twelve frames R7 published its combat figure over** | **REFUSED** — weapon 0/12, explosion 0/12, enemy fire 12/12 |
| **KNOWN-GOOD: `?demo=1` at 11 kill ticks** | weapon **10/11**, explosion **11/11** |

The known-bad control reproduces, **from the pixels alone**, what the R7 judge established from
the simulation's internal counters. Two instruments, two completely different routes, one
answer. And a third, readable by a human with no tooling at all: **those frames print `HIT 0` on
their own HUD** (`judging/R8/crit-r8-01-POPULATION-CONTROL-expl-arm.png`, bottom row).

Over all 36 of the judge's `critA-play-*` frames at six spacings: **PLAYER-WEAPON 0/36,
EXPLOSION 0/36, ENEMY-FIRE 35/36.**

**Not detected, stated so the tool is not over-trusted**: the missile smoke **trail**.
`trailPalette.js` is achromatic by measurement (the arcade's plume is near-white), so it is not
separable from cloud by colour. Assert a trail population in page, or via the missile exhaust
that precedes it.

### The same defect a third time — inside the judge's own close of gap 6c

Running the new control over the judge's own isolation arms found it again:

| `?combatexpl=1` spacing | frames holding a fireball | fireball px | A2 |
|---|---|---|---|
| 29 | **4 of 5** | 395–1 882 | 19 / 21 / 21 |
| **71** | **0 of 5** | **0** | 19 / 19 / 19 |
| 113 | **3 of 5** | 1 825–2 206 | 19 / 19 / 21 |

**The judge's "19 / 19 / 19" is three readings, one per spacing, and the middle one is a reading
of empty blue sky with a cloud in it.** I cropped and looked at both cases before publishing the
zero (`crit-r8-01`): rows 1–2 are a fireball with the mask lying exactly on it, rows 3–4 are an
empty sky. The conclusion survives on the 7 frames that do hold a fireball — **A2 19/21/21,
A1 55–60, gate ≤32: the arm is genuinely closed** — but it is now closed over a population that
was asserted rather than assumed. That is the rule paying for itself in the round it was
written.

**Changed**: REFERENCE.md — binding rule block under the scoreboard; the headline row relabelled
with the population its pixels hold; the whole isolation-arm table rebuilt with a
"frames holding the arm's own object" column; ledger **row 32**. README.md — tool entry.

---

## JOB 2 — the published stage-digit test cannot fire

**Reproduced the judge's finding exactly.** REFERENCE published `mean(RGB) > 170` over native
`y[200,207) x[184,192)`. Over 36 digit-verified stage-1 frames the box mean is **99.8–135.9** and
it fires on **0 of 36**; extended to the judge's three split sets, **0 of 180** across stages 1,
2 and 3. Two independent reasons, either alone fatal: the digit is drawn over the world with no
opaque plate, so a 3-px cream glyph in a 7×8 box leaves the mean tracking the sky (the *same*
digit reads 135.9 over bright sea and 101.4 over dark sea); and the cell starts at x **183**, not
184 — `hud.js` draws `M_STAGE_DIGIT` centred on the ink at cx 187.

**`tools/measure_stage_identity.py` has documented this failure in its own header since R7.** The
repo held two operators and the ground-truth document published the one that cannot work.

**`tools/verify_stage_digit_operator.py`** (new) is the control, and it runs both operators
head-to-head on inputs with known ground truth:

| control | exact-ink Hamming (now published) | published brightness test |
|---|---|---|
| synthetic glyphs **1–9** over the stage-1 sky | reads **every one**, Hamming **0** | fires on **none**, including the "1" it was written for (84–141) |
| **KNOWN-BAD: a digit-free cell filled with sea caps `#d6f7f7`** | **REFUSES** — 0 ink px | box mean **236.0 → "STAGE 1"** |
| a genuine "1" over **dark** sea | reads **1**, Hamming 0 | 134.1 → **misses it** |

**It fails in both directions**: invents a stage where there is no digit, and misses a real digit
on a dark background. The known-bad control is the one the brief asked for, and it is the one
that shows *why* the operator is unusable rather than merely wrong — it is a brightness test on
the world behind the HUD.

**Cross-checked against an instrument that never looks at the HUD.** On 180 real frames the
Hamming reader's digit and the **modal colour of native rows 20–60** agree completely: digit 1 →
`#009fff` (74/75), 2 → `#e67300` (47/47), 3 → `#000000` (57/58). The two exceptions read
`#f7f7f7` — a cloud filling the sky band — which is a cloud fact, not a contradiction.

**Changed**: REFERENCE.md — the broken operator struck, the exact-ink operator published in full
(cell, ink colour, ±1 px slop, <8-ink-px refusal) with its control table and the cross-check;
ledger **row 33**. README.md — tool entry.

---

## JOB 3 — three stale or broken published figures

| # | published | **true, measured in R8** | where fixed |
|---|---|---|---|
| a | stage-identity operator `mean(RGB) > 170` | **cannot fire** — 0 of 180 | §2 above, ledger row 33 |
| b | our daylight airframe VALUE-STAT reading A = **0.643**, *"still missed"*, in 4 places | **0.8392** on the shipped tree — **inside the band**; all three clauses met | REFERENCE ×2, STATUS ×3 |
| c | `?combatexpl=1` = **218** channel values ✗ | **19–21** with a fireball asserted on screen — **closed** | arm table, ledger row 30/32 |

**(b) is the dangerous one and it is this project's documented worst failure mode** — *"the R5
judge recorded the throttle as wired with no player control, a gap that did not exist, and the R6
flow lane spent part of its round disproving it."* Four places said "still missed, at 0.643".

**Re-derived independently** from the R7 judge's `jet-on` / `jet-off` captures at `82365e9`
(both pre-date any R8 edit): difference mask **1 513 px**, span **116 native px = 36.25 %W**,
**10 colours**:

| reading | operator | n | **ours** | arcade native |
|---|---|---|---|---|
| A | `S<0.25`, **V = 0 kept** | 836 | **0.8392** | 0.839 |
| B | `S<0.25`, `V>0` | 678 | **1.0000** | 1.000 |
| C | V-CENSUS `S<0.35 ∧ V>0.08` | 961 | **0.9686** | 0.969 |

p90 **1.000**, max **1.000**, share V>0.80 **63.4 %** (arcade 59.5 %), black share **18.9 %**
(arcade 22.2 %) — **we are now on the arcade's side of the role-area lever that R7 named as the
remaining gap.** Colour census published in REFERENCE so the next lane need not re-derive it.

### A correction to the judge's own warning on this figure

The judge wrote that reading A is a step function and that *"the sprite lane's sweep puts the
median on 0.839 only while black sits between 6.5 % and 21.5 % — ours is 2.6 points from the
upper step"*. The direction is right and worth keeping. **The numbers do not reproduce on the
shipped mask**, whose entire achromatic census is five values (0 ×158, 0.6431 ×148, 0.8078 ×32,
0.8392 ×126, 1.0000 ×372):

| perturbation | window where A stays 0.8392 | ours at 18.9 % |
|---|---|---|
| keyline grows/shrinks: black ↔ the brightest tone, **n constant** | **13.5 % – 28.5 %** | 5.4 points above the lower step, 9.6 below the upper |
| black added/removed, non-black held fixed | 7.2 % – 33 % | comfortably inside |
| black ↔ the V 0.6431 tone, n constant | **no step in range** | — |

Both can be right: his window came from a sweep over **variant sheets**, each with its own
non-black distribution; mine perturbs **one sheet**. They are not the same statistic and must not
be quoted as one — ledger rows 14 and 27's family, third instance. **The warning survives in the
form that is actually actionable: publish the black share beside reading A**, because a change to
keyline *area alone* can move the median a full rung with no palette touched. Published that way.

---

## JOB 4 — the arcade-side Criterion A licence

Three findings, and the third inverts the licence rather than weakening it.

**1. The cardinality reproduces exactly.** Desert **138 / 31**, night **79 / 17**. No dispute.

**2. The 33.4 %W / 809 px fireball figure does not reproduce, and I searched hard before saying
so.** Whole frame under the published operator `R>100 ∧ R>B+60`: **2 201 px / 306 × 208 /
95.6 %W** — the city lights and HUD ink are warm too. I swept **25 operator variants**
(`R>` 90/100/110/120/128 × `R>B+` 40/50/60/70/80) across **every row window** in y[60,140):
**no reading within ±6 px of 809 px and ±2 px of 107 × 41.** **No box was ever published with
it**, in the round and in the very table where that lane made "state your provenance" binding.
**UNREPRODUCIBLE, not refuted** — the blast is really there.

**The replacement states its box and its exclusions** (`crit-r8-02`, cropped and looked at):
`R>100 ∧ R>B+60` over native **y[74,130)** full width, 8-connected, minus the player's **two
nozzle discs** (32 px each, located) and **two warm streaks along the wing** (46 and 28 px) →
**732 px, bbox 121 × 51 = 37.8 %W × 22.8 %H**, carrying **±74 px** because the wing streaks are
the one judgement call. Largest single component — **658 px, 50 × 30 = 15.6 %W × 13.4 %H** — is
the blast core and needs no judgement call; prefer it. **The restated width is larger than the
withdrawn one**: what was wrong with 33.4 %W was its provenance, not its size.

**A caveat worth more than the figure**: that warm operator selects **78.3 %** of
`ab2-arcade-desert.png` and **84.1–92.3 %** of our own digit-verified stage-2 frames, against
**3.1 %** of the night native and **2.2–2.5 %** of our stage-1 and stage-3 frames. **On a daylight
desert frame it returns the ground.** It is licensed to stages 1 and 3 only. Ledger row 30.

**3. The licence is an argument about hardware — and that is why it holds.** R7 wrote that it
*"is a measurement rather than an argument about hardware"* and supported it with *a 33 %W
fireball costs the arcade nothing*. Measured:

| operation on the night native | A1 colours | A2 chan values |
|---|---|---|
| untouched | **79** | **17** |
| blast cluster y[74,130) blacked out (870 px) | 67 | **17** |
| **every warm pixel blacked out** (2 201 px) | **52** | **17** |

**Channel values unique to the blast: zero.** The fireball consumes none of the A2 budget, so it
demonstrates nothing about whether a fireball fits one — the judge is right that the sentence is
evidentially empty. **But the reason is structural, and it makes the licence stronger.** The
night frame's 17 values are **every other rung of the 31-value ladder this document already
enumerates**, and that ladder is the hardware's (REFERENCE attributes its irregular spacing to a
resistor ladder). The desert's 31 and the night's 17 are *31 of 32 rungs used* and *17 of 32 rungs
used* — not two frames exercising restraint.

> **So the arcade cannot fail A2 on any frame, in any population, with or without an explosion.
> A2 ≤ 32 is the width of the hardware's colour ladder.** The gate does not need a true-native
> daylight explosion frame to be licensed against daylight explosions, because no 1987 frame of
> this game could have exceeded it.

**Two limits published with it, because an overstatement here is worse than a missing row.** It
rests on **two frames** plus this document's own ladder attribution — if the hardware has a mode
emitting intermediate levels, a frame using it would exceed the ladder, and neither native shows
one. And it licenses **A2 only**: A1 has no demonstrable hardware ceiling, the daylight combat
native spends **138 of 256** colours *with no explosion in it*, and the night blast costs **27
colours** (79 → 52). **A1 is the half still worth watching.**

**Changed**: REFERENCE.md — the night-frame row restated, the whole licence block rewritten with
the blackout table and both limits; ledger **rows 30 and 31**. STATUS.md headline corrected.

---

## JOB 5 — the rows the judge audited

| row | ruling | what I recorded |
|---|---|---|
| **29** — the arcade *does* flash the jet after respawn | **CONFIRMED EXACTLY**, independently re-derived from the footage without reading the row's numbers first: OFF onsets t277.200 → 278.733, gaps **0.267 s five times over**, ON 1 066–3 824 vs OFF 7–64 with **nothing between** | **Reproduced to three decimals** on a separately chosen operator, at 30 fps. Recorded in the row, because an independently reproduced row is rarer in this ledger than a corrected one |
| **24** — JET-SIL `V ≥ 0.70` | **ruling right, REFERENCE's operator wrong** | **Operator fixed.** Published as "hue 5–55°" while arguing from `#840000` at hue **0.0°**; only `jetsil.py:112`'s unpublished wrap `(deg <= 55 or deg >= 355)` makes the argument work. Re-derived every colour: `#840000` 0.0°/1.000/0.518 is in the implemented band and not the published one; all four glows in both; the night keyline 225.5° in neither. **Ledger row 34**, with the general form: *a hue band that crosses 0° is not an interval, and writing it as one silently deletes red* |
| **26** — "top third" is the wrong statistic | **arithmetic confirmed, substance UNVERIFIED** | Marked so in the row: the 109-observation hand count was never re-done. Also carried the judge's gap-9 item — **the ACCEPT criterion names no regime** while the row's own text says mixing cruise and canyon "would produce a number that means nothing" |
| **27** — unit mismatch | **ACCEPTED AS REPORTED, not re-derived** | Marked so, with why: there is no measurement to refute, so nothing is found by re-running either operator |
| **28** — flight time is not invariant | **ACCEPTED AS REPORTED, not re-derived** | Marked so: a single well-designed controlled experiment that nobody has reproduced, not a settled constant |

`jetsil.py`'s own header still reads "hue 5-55 deg" in prose. It is the sprite lane's file;
**flagged, not edited.** Same for the one-off missile-exhaust diagnostic at REFERENCE's missile
section, which carries the same unwrapped band in prose.

---

## JOB 6 — the acquisition list, now five entries

**Two new blockers, one of them from this round's enemy-art work.** The header said "two
measurement programmes" over a three-row table; both are fixed.

| # | acquire | blocks |
|---|---|---|
| 1–3 | unchanged (native stage-1 sea; native level-astern jet; isolated barrel-roll sprite) | |
| **4** NEW | a true-native **daylight frame holding an explosion** | **Not** A2's licence — that is hardware (§4), and R7's gap list had this backwards. It blocks the **colour** half: our only arcade fireball palette anchor is a **181×127** JPEG, the only native blast is a **night** one costing 0 channel values but **27 of 79 colours**, and the one daylight native in combat spends **138 of 256** colours with no explosion in it |
| **5** NEW | a true-native **near-aspect enemy aircraft** | Both natives carry only **distant** enemies — measured, ~10 × 12 px of aircraft. Every near-aspect enemy reference is a video upscale with thousands of colours, on which **a single-colour-component operator cannot run at all**. That is why `enemysil.py`'s feature gate has never been checked against the reference (§7). Also the only non-upscale route to a stage-1 enemy livery target |

**The one in-repo candidate is dead, tested twice.** `ab2-arcade-desert-explosions.png` is
400×280 = **exactly 1.25×** native, which *would* be recoverable if it were nearest-neighbour (a
5/4 nearest scale duplicates every fifth column). It is not: **column duplication 0.013–0.025 at
every one of the five phases, row duplication 0.000**, and the file carries **34 969 colours /
all 256 channel values**. Independently reproduces the R7 lane's finding; recorded on the list so
nobody tests it a third time.

---

## JOB 7 (assigned mid-round) — two rulings on the enemy-art lane's open items

### `enemysil.py`'s compact-feature gate: **RETIRED as a gate**

The lane reported it failing at 12.9 % on two delta cells (gate ≤12) and pre-existing. On the
shipped sheets at cell width 32 I read it worse — **25.8 %** worst case — which does not change
the ruling, and the ruling is that **the gate is wrong, not the drawing.** Three measured
reasons:

**(a) The offending component is the aircraft's own wing.** `enemy-interceptor-head` cell 1,
`#d64a19`, 57 px = 25.8 % of area, bbox **7 × 13, aspect 1.86, fill 0.626** — a foreshortened
delta wing. The operator's own header states its premise: *"a wing … legitimately runs 25-30 % …
the gate rejects wings, fins and fuselage spines"*, on the assumption that a wing is long and
thin (aspect > 3:1). **That is false for a delta and false for any wing seen in bank.** Note also
that a triangle fills exactly 0.5 of its bbox and the test admits ≥ 0.5, so a triangular
structural member sits on the threshold by construction.

**(b) It cannot see the defect it was written for.** The operator excludes "the darkest colour"
as the keyline. Two identical 9-px marks planted on the same interior pixel of
`enemy-grey-head` cell 0: **dark red `#e61000` → MISSED** (it becomes the darkest colour and is
dropped as the keyline), **bright yellow `#ffde21` → DETECTED**. R4's complaint, which this gate
exists to catch, was *"a large black-rimmed **red** disc"*. The heuristic was tolerable while the
sheets had a black keyline; **this round removed it**, so "the darkest colour" is now just the
darkest shading tone — or a dark mark.

**(c) There is no arcade control.** Both true-native frames carry only distant enemies (~10 × 12
px of aircraft inside a 19 × 20 crop — I cropped one and looked), and every near-aspect reference
is a video upscale with thousands of colours, on which a single-colour-component operator cannot
run. **We have no way to know whether the arcade passes this gate**, which is ledger row 10's
shape.

**The obvious repair was tried and rejected with its measurement.** Adding an "interior
components only" clause (the component touches no silhouette edge) drops all **160** enemy cells
to **≤4.5 %** — but these aircraft are nowhere more than ~5 px thick (max erosion depth **2**),
so **no interior mark of gate-tripping size can exist**. The clause makes the gate unfailable,
which is ledger row 18's defect from the other side.

**Ruling: retire the ≤12 % gate, keep both numbers printed as diagnostics, do not redraw a delta
wing to satisfy it.** Readability as an aircraft is already measured directly by the four
silhouette discriminators. Re-open only against acquisition entry 5. Ledger **row 36**.
*(The tool is `tools/art/`'s; I did not edit it. The retirement is published in REFERENCE.)*

### `missile.js`'s keyline: recorded as **UNMEASURED**, not as a defect

Recorded in REFERENCE beside the keyline criterion, in the lane's own terms: **no arcade
measurement exists either way**, there is no isolated native missile sprite, so it was left
exactly as it was and said so. **An unmeasured object is not a passing object and it is not a
defect either** — do not "fix" it to the ≤2 % perimeter criterion, and do not read its silence as
approval.

### And the class rule the enemy-art audit earned — ledger **row 35**

R7 measured that the arcade's daylight aircraft have no black outline, implemented it on the
**player jet**, and called it closed. The audit found **all sixteen enemy sheets at 100.0 %
near-black perimeter** against three player sheets at 0.0–1.1 %. **Third measured instance of one
failure mode** — R4 named the sprites and the sea kept it; R5 named the sea and the explosion
kept it; R7 named the player jet and the enemy kept it.

> **Binding: a criterion must name the class it is licensed over, and a fix is not closed until
> it has been audited across that class.** A sprite criterion names *which sheets*; a palette
> criterion names *which objects*; an effects criterion names *which effects* — and the closing
> report prints the measurement **for every member**, as the enemy-art lane's 16-row table does.

I published the keyline criterion itself for the first time (it existed only as a lane
measurement and a judge claim), **with its class clause and its two hidden call sites** — the
near-aspect procedural fallback and the far LOD — and with the operator caveat the judge found:
**quote the 0.0 % near-black, which is robust across rim definitions; do not quote the 49.5 %
`#840000` share, which moves 14 points between two defensible rims.**

---

## What I did NOT do, stated so it is not read as done

- **I took no new captures.** Five lanes were editing `src/`; every our-side figure here is from
  the R7 judge's `82365e9` sets or (for sprites) the sheets at `1783060`. Any figure in the
  documents that is attributed to the shipped tree should be re-derived after the round closes —
  I said so beside the VALUE-STAT row, which the R8 sprite lane may move.
- **I did not re-derive ledger rows 26 (substance), 27 or 28**, and I marked all three as
  accepted-not-verified rather than letting them read as confirmed.
- **I did not settle the `?combatonly=enemies,shots` over-gate frame.** The R7 judge calls it a
  near-field enemy airframe; the R7 art critic reproduces the number exactly and calls it the
  tumbling death hulk. I added one fact and no verdict: that frame holds **0 px of fireball
  palette**, so it is an airframe-like object and not a blast, which does not separate the two
  claims. Combat's lane owns it, and gap 7's owner depends on the answer.
- **I did not re-run** the judge's 3 600-tick `?demo=1` sweep or the 12 000-tick stage-boundary
  run; both are quoted as his, attributed, in the scoreboard.
- **No `src/` file was touched.** `jetsil.py`'s stale prose and `enemysil.py`'s gate are flagged
  for their owners, not edited.

## Evidence

| file | shows |
|---|---|
| `judging/R8/crit-r8-01-POPULATION-CONTROL-expl-arm.png` | native + mask overlay, 5 rows: two real fireballs, two frames of the spacing-71 arm that hold none, and the R7 headline frame with its `HIT 0` HUD |
| `judging/R8/crit-r8-02-ARCADE-NIGHT-FIREBALL-BOX.png` | the arcade night blast with the restated mask on it — nozzles excluded, debris spray included |
| `tools/assert_population.py --selftest` | the population control and its eight controls, including the refusal of R7's own frames |
| `tools/verify_stage_digit_operator.py --selftest` | both stage-digit operators head-to-head, with the known-bad input that breaks the published one |

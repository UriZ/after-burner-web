# R8 — game-flow lane

**Baseline**: `82365e9`. One commit (`1783060`, enemy sprite art) landed under this
lane mid-round; it touches no file here and no measurement below was taken on it.

**Files changed**: `src/game/flow/flow.js`, `src/game/game.js`,
`src/entities/player.js`, and one helper in `src/game/flow/cards.js` (landed before
the lead's ownership correction; finished and then closed, per that message).

**Measurement discipline**: every capture and probe below ran against an **isolated
`git archive` copy** of `82365e9` with only this lane's files overlaid, never the
shared tree — four other lanes were editing it, including the sprite files that
every frame contains. Trees: `iso0` = pure `82365e9`, `iso1` = `82365e9` + this
lane, `iso2` = `iso1` with one spawner constant changed for the gap-5 experiment.

**Frame sweep**: 163 frames across 5 capture directories. **0 black frames.** 18
cross-directory duplicates, all of them the BEFORE/AFTER control described in §1.3
— see that section before reading them as a defect.

---

## 1. GAP 2 — the stage counter. **CLOSED.**

### 1.1 What was wrong, and what the arcade does

`flow.js:320` was `hudState.stage = contentStageIndex + 1` =
`stageIndex % STAGES.length + 1` with `STAGES.length = 3`. The digit could not
exceed 3. The tally card had the same expression.

**Arcade check, taken before touching anything.** Source
`.reference-cache/video/ab2-longplay.mp4` (686x480), frames at `STAGE_MAP.md`'s
HUD-verified spans so every one is a known stage. Crop x[340,450] y[418,456],
5× nearest, figure
**`judging/R8/flow-r8-01-arcade-stage-digits-1-to-15.png`**.

> The arcade's counter reads **1, 2, 3, 4, 6, 8, 10, 11, 12, 13, 15** across
> t=100..630 s. **It does not wrap, and it goes two digits.**

This reproduces the R7 judge's 1/2/3/4/6 on an independent extraction and extends
it past 9, which is where the question of *how* two digits are laid out starts —
see §1.4.

### 1.2 The fix

Three quantities, separated explicitly, which is the whole of the change:

| | expression | period | what reads it |
|---|---|---|---|
| `stageIndex` | raw lap counter | ∞ | internal |
| **`stageNumber`** (new) | `stageIndex % 23 + 1` | **23, the MEASURED structure** | HUD digit, tally card |
| `contentStageIndex` | `stageIndex % 3` | 3, the ADOPTED content wrap | sky/ground/clouds palette, enemy livery, trail palette |

`STAGE_COUNT = STAGE_DURATIONS_S.length` — 23 is not written out anywhere; it is
the length of the measured duration table, so the display laps exactly with the
structure it names and both recede together when more stages are authored.

`game.js`'s `__flowState` now reports **all three**. A probe that asks "what does
the digit say" had no way to get that answer before — it could only read
`stageIndex`, which is exactly how this defect survived three rounds of probes.

`?debugtally=N` (N > 1) names the stage the forced tally card shows, so the
two-digit layout is capturable without a six-minute flight. It also fixes R7
§5.1's smaller finding: the debug card drew `stageIndex + 2` (unwrapped) while
the real card drew `contentStageIndex + 1` (wrapped), so the card a lane captured
to check layout showed a number the real card could never produce. Both now go
through `stageNumber`. README row asked in `ask-flow.md` F4.

### 1.3 Measured before and after

**Instrument.** `tools/measure_stage_identity.py` reads ONE 7×7 cell and matches
1..9 — it cannot read "10" and has no '0'. `tools/out/flow-r8/read_stage_number.py`
imports its validated decimation and exact-ink rules and adds a cell walk.
**Control run before any number was believed** (`--selftest`): renders 1..23 in
*both* candidate layouts, 46 numbers, all read back exactly; discriminates the two
layouts on all 14 two-digit numbers; refuses a blank frame. **PASS.**

**Captures.** 80 frames, `--every 345` (5.75 s), 460 s per arm,
`?fixed=1&seed=1&demo=1&invincible=1` — `&demo=1` because **`?fixed=1` alone
injects no input at all**, `&invincible=1` so deaths do not re-cut the sample.
`tools/out/flow-r8/stage-{BEFORE,AFTER}-460/`.

| | BEFORE (`82365e9`) | AFTER |
|---|---|---|
| frames read | 80/80 | 80/80 |
| worst Hamming distance | 0 | 0 |
| distinct stage numbers | **{1, 2, 3}** | **{1 … 14}** |
| sequence | 1,2,3,1,2,3,1,2,3,1,2,3,1,2 | **1,2,3,4,5,6,7,8,9,10,11,12,13,14** |
| max | **3** | **14** |
| digit first repeats at | **between t=97.75 and t=103.50 s** | never |

Figure **`judging/R8/flow-r8-02-stage-digit-BEFORE-TOP-AFTER-BOT.png`** — eight
matched times, native crop of the STAGE row, 6× nearest. The top row reads
1,2,3,1,3,3,1,3; the bottom reads 1,2,3,4,6,9,10,12.

**The control that makes this a clean attribution.** Comparing the two arms
frame by frame:

> **Frames 0–17 (t ≤ 97.75 s, stage number ≤ 3) are BYTE-IDENTICAL between the two
> trees. Frames 18–79 (stage ≥ 4) all differ.** 18 identical, 62 different, 80
> total.

Those 18 are the cross-directory duplicates the sweep reports. They are the
evidence, not a flaw: the change alters the stage number and **nothing else in
the simulation** — same seed, same spawns, same flight path, same pixels
everywhere the old and new expressions agree.

### 1.4 The two-digit layout — a second arcade measurement, and it was needed

Making the counter reach 10 made a piece of geometry reachable that had never
been drawn. `drawTextCenteredInk` ink-centres a whole string, which is right for
one digit. **The arcade right-aligns on a fixed units cell and ink-centres each
digit in its own 8-px cell.**

Measured twice, on two different elements, two different colours, two different
source magnifications:

| | source | word "STAGE" | tens ink | units ink |
|---|---|---|---|---|
| HUD, arcade "11"/"12" | 686×480, t=490/530 | — | centre **179.3** | centre **187.0/187.5** |
| HUD, arcade single 1/3/6 | 686×480, t=100/175/280 | — | — | centre **187.3/187.3/186.8** |
| tally, arcade "STAGE 2" | 1028×720, t124 | x[120.2,158.4] | — | x[184.9,190.5] |
| tally, arcade "STAGE 12" | 686×480, t=513.0 | x[120.3,158.1] | x[178.2,180.5] | x[184.3,190.3] |
| tally, arcade "STAGE 10" | 686×480, t=428.5 | x[121.3,157.2] | x[180.1,180.5] | x[181.9,189.9] |

The units digit of "12" lands on the same cell as the single "2" to within
**0.6 px at two different magnifications**, and the tens digit sits one
**7.95 px** advance left — the BIG face's 7-wide glyph on an 8-px pitch. The
arcade tally frames were found by scanning 0.5 s steps across three stage
boundaries for the card's red "HIT COUNTS" label; identity is the HUD-verified
span either side.

`cards.js`'s `drawStageNumber()` implements it. Measured on our own output
(`tools/out/flow-r8/tally-{2,10,12}/`, `?debugtally=N`, lavender
`#eec0f8` exact match, decimated to native):

| ours | word | tens | units |
|---|---|---|---|
| "STAGE 2" | x[120,158] | — | x[185,191] |
| "STAGE 10" | x[120,158] | x[179,182] | x[185,191] |
| "STAGE 12" | x[120,158] | x[179,182] | x[185,191] |

The word matches the arcade exactly; the units cell does not move between one and
two digits, as the arcade's does not. Figure
**`judging/R8/flow-r8-03-tally-ARCADE-TOP-OURS-BOT.png`**.

**Re-checked against the ladder lane's concurrent palette change.** Those three
rows were measured on a tree carrying this lane's `cards.js` only, with
`STAGE_LAVENDER = #eec0f8`. The ladder lane has since re-tuned the card constants
onto the value ladder (`#eec0f8` → `#efbdf7`) in the same file. Re-captured on a
tree carrying **their** `cards.js`, `ui/**`, `titleScreen.js` and `carrier.js`
together with this lane's `flow.js`/`game.js`
(`tools/out/flow-r8/tally-live-12/`), masked on the live constant read out of the
source: the lavender ink runs are
`(120,126) (128,134) (136,142) (144,150) (152,158) (179,182) (185,191)` —
**byte-for-byte the same columns**. The geometry and the palette are independent,
and the two lanes' changes to this file compose.

**The HUD's own digit is `src/ui/hud.js` — another lane.** Measured there and
filed rather than reached into: ours puts the tens at **181.5** and the units at
**190.0** against the arcade's 179.3 and 187.3, i.e. 2.2 and 2.7 px right, with
the units digit off the cell the single digit uses. `ask-flow.md` **U1**, with the
drop-in four lines and a collision check.

### 1.5 What was deliberately NOT done

**Content for stages 4+ does not exist and this change does not pretend it does.**
Stage 4 is drawn with stage 1's palette and labelled "STAGE 4". That is a
deliberate reversal of the R5 ruling written into `flow.js` (which chose "the
digit always matches the rendered palette" over "the player learns they
progressed"), made on arcade evidence the R5 decision did not have, and the
reasons are written at the change rather than here. **The predecessor's refusal to
invent stages 4-23 stands and is unchanged.**

---

## 2. GAP 5 — `REACH_CEILING_NDC_Y`. **Established, measured, and filed; the constant is not in this lane's files.**

The brief said: re-derive it, or delete it if it is not load-bearing, **but
establish which first**. Both halves were established, and they give different
answers, which is why the ask says what it says.

### 2.1 As a reach bound it is dead

`tools/out/flow-r8/rails_probe.mjs`, which reads every input out of the source
**at run time** rather than copying it — the failure mode being audited is a
comment whose inputs moved underneath it.

```
player ndcY, full-up stick, settled 4 s   +0.45966   (27.017 %H)
+ combat.js  SIGHT_NDC_Y_OFFSET            0.30      sight tops at 0.7597
+ lockSystem LOCK_RADIUS_FRAC 0.22 / (0.5 * 224/320) = 0.6286  y reach
= ceiling                                  1.3882 NDC
```

NDC y runs to +1.0. **The bound is off the top of the screen.** It reproduces the
R7 judge's 0.4597 and 1.388 to four figures on an independent instrument.

Two guards on that number:
- The rails are measured with the stick **held to the stop until settled** (4 s at
  `FOLLOW_RATE` 6/s leaves 6×10⁻¹¹ of the step), at throttle **M**.
- `__setStick` bypasses `core/input.js`. So the up rail was re-measured through a
  real `KeyboardEvent('keydown', {code:'ArrowUp'})` dispatched on the page's own
  window, which `input.js`'s own listener receives. **The two agree to 0.000000
  NDC.** A rail figure that is right about the sim and wrong about the game is
  exactly the shape of defect this gap is made of.

**R7's version of this probe (`tools/out/flow-r7/map_probe.mjs`) cannot run.** It
reads `const ENVELOPE_Y = ` out of `player.js` with a regex, and that constant was
split into `ENVELOPE_Y_UP`/`ENVELOPE_Y_DOWN` in the same round; the regex returns
null and the probe throws on line 29. Noted so nobody re-runs it and reports a
crash as a finding.

### 2.2 But it IS load-bearing on the distribution — and in the direction that argues for removing it

`tools/out/flow-r8/enemy_alt_probe.mjs`. Two throwaway trees differing in that one
line; **nothing under `src/` in the shared tree was edited to get these.** 180 s,
`?fixed=1&demo=1&invincible=1`, sampled **every tick** (the demo cycle is exactly
16.000 s, so a coarser fixed interval beats against it), ~134 000 enemy samples per
arm, two seeds.

| | ceiling 0.64 | lifted | arcade (spawner.js's own figure) |
|---|---|---|---|
| seed 1 enemy p5 %H | 20.24 | **16.16** | 14.1 |
| seed 7 enemy p5 %H | 18.61 | **13.60** | 14.1 |
| seed 1 top-third share | 30.47 % | **31.06 %** | 32.5 % |
| seed 7 top-third share | 31.98 % | **32.56 %** | 32.5 % |
| max enemy ndcY (s1 / s7) | 0.6696 / 0.6686 | 0.9757 / 0.9770 | — |

**Both statistics move toward the arcade, on both seeds.**

And **`spawner.js`'s stated reason for keeping the clamp does not reproduce.** Its
comment argues the cap must stay because *"all-enemy top-third share is 34.9 %
against the arcade's 32.5 %"*. At `82365e9` that share measures **30.47 % and
31.98 %** — below 32.5, not above. The 34.9 predates R7. The argument does not
merely go stale; it reverses.

A note on "pinned": the judge reported 4.6 % of samples sitting on the clamp; this
instrument counts 2 and 8 samples at exact equality. Those are not in conflict —
the spawner clamps the **path endpoints**, and an enemy is at an endpoint only
momentarily, so exact equality is rare while the top tail is still being cut. The
max-ndcY row is the honest statement of the same thing: 0.669 → 0.976.

### 2.3 On the spread, and why this lane did not touch the roam

The brief: *do not tune to a top-third percentage; what separates us is the
spread.* Agreed, and it is already closed on the population it can be compared
against — R7 solved `demoTimeline`'s cruise regime to **p5 37.6 / p95 63.4 /
sd 8.16** against the arcade's 109-observation **36.4 / 62.0 / 7.73**, and that
comparison is cruise-only for a stated reason (neither hand count sampled an
arcade canyon stage).

This lane's own run reads **pooled** cruise+canyon player altitude of p5 38.33 /
p50 57.09 / p95 63.42 / sd 8.44 over 10 590 flight ticks. **That is not comparable
to the arcade number** and is reported only so nobody later quotes it as if it
were: the canyon regime is 31.25 % of the cycle and sits ~10 points lower by
construction. Re-solving the roam against a pooled figure would be tuning to a
mixture.

One figure from it *is* load-bearing for gap 5, though: over 180 s the demo pilot's
**highest climb is 35.16 %H while the aircraft's rail is 27.02 %H**. Read back
through the measured transfer function that is a peak stick of ≈**0.707 of full**.
**So the demo never visits the rail**, and any reach constant derived from the
demo's roam — which is half of what `REACH_CEILING_NDC_Y`'s comment rests on — is
derived from a pilot, not from an aircraft. That is the structural reason the
constant was wrong, independent of its arithmetic.

### 2.4 What changed in this lane's files

`player.js`'s exported `ENVELOPE_Y_UP` carries the full re-derivation and the
measured consequence, replacing a pointer to an R7 ask that was never closed. The
constant itself is **unchanged** — the probe reproduces its published 27.02 %H
rail as 27.017. `spawner.js`, `lockSystem.js` and `combat.js` are the combat
lane's: `ask-flow.md` **F1** (the ceiling) and **F2** (three values for one lock
radius, and a comment wrong in direction).

---

## 3. GAP 4b — the parallax cue. **Ownership checked, not mine, filed — with an arcade result.**

`render/clouds.js` is the world lane's per `CLAUDE.md`'s ownership table. Nothing
was edited. `ask-flow.md` **F3** proposes the minimal coherent fix (scale cloud
drift by `THROTTLE_SCROLL_MULT`, which is exactly 1.0 at M, so every measured
cloud statistic survives bit-for-bit and only L and H move) and offers the
interface from this side.

**The arcade measurement R7 listed as owed, taken.** The arcade's throttle letter
read off `ab2-longplay-60fps.mp4` (1028×720 = 3.2125× native), crop x[140,182]
y[634,672], **22 samples from t=95 s to t=740 s**, roughly eighteen stages:

> **The letter is `M` on all 22.** Figures
> `judging/R8/flow-r8-04-arcade-throttle-letter-M-x16.png` and
> `flow-r8-05-arcade-throttle-letter-M-x6-9zoom.png`.

**There is no throttle excursion anywhere in the mapped longplay.** So:

1. Every L and H magnitude in this build is **ADOPTED with no arcade observation
   behind it**, and R7's "fix the incoherence, not the gameplay" is correct on
   evidence rather than on caution.
2. **M is the datum by observation, not by convention** — the footage every
   MEASURED flight constant came from was flown entirely at M, so none of them is
   contaminated by a different detent.

**A near-miss worth recording, because it is a criterion-check failure that almost
shipped.** On the 686×480 longplay this glyph reads as **"H"** at 14× zoom, and
convincingly so across 14 frames. It is M; the lower-res source destroys the
distinguishing pixels. The first pass of this measurement was about to publish
"the arcade flies at H" off a clean, plausible, stable-across-frames reading.
Anyone re-measuring the SPEED letter must use the 1028×720 source. Filed to the
criteria lane as `ask-flow.md` **F5**.

The claim is bounded: this licenses *"the reference footage contains no throttle
excursion"*, not *"the cabinet has none"*. One pilot, one playthrough.

---

## 4. What this lane did not attempt, and why

- **Stage content for 4-23.** Out of scope by the brief; the predecessor's refusal
  was correct and is carried. Gap 2 was scoped as the counter.
- **Gap 3, Criterion A at stage boundaries.** The cause is the tally overlay's
  off-ladder palette, which is the ladder lane's this round per the lead's
  ownership message. This lane's one `cards.js` change moves no colour and adds no
  palette entry — it only relocates existing lavender ink — so it neither fixes
  nor worsens that gate.
- **Re-solving `demoTimeline`'s roam.** §2.3: the spread is already matched on the
  only population the arcade hand counts support, and the brief says not to tune
  to a top-third share. Moving it again on no new evidence would be tuning to a
  statistic.
- **Whether the arcade's throttle closes range on enemies** (R7 gap 4's "owed
  first"). **Unanswerable from this repo's footage** — §3, the pilot never leaves
  M. Recorded as a negative result rather than left open, because the next lane
  should not spend a round looking for it.
- **Deleting `REACH_CEILING_NDC_Y` myself.** `spawner.js` is the combat lane's.
  The measurement was done in throwaway trees so the ask carries a number instead
  of an opinion.
- **Re-deriving the arcade-side figures in §2.2's right-hand column** (p5 14.1,
  top-third 32.5). Those are `spawner.js`'s own published arcade statistics,
  quoted as-is. The left-hand columns are mine. **If the arcade side is wrong the
  direction of the finding could change**, and this lane did not check it.

---

## 5. Evidence index

Probes and instruments (`tools/out/flow-r8/`):

| file | what |
|---|---|
| `rails_probe.mjs` | stick→altitude transfer, both rails, real-key cross-check, reach-ceiling re-derivation from source constants read at run time. Replaces the un-runnable `flow-r7/map_probe.mjs`. |
| `enemy_alt_probe.mjs` | enemy/player screen-altitude distribution, every tick, two populations reported separately. |
| `read_stage_number.py` | one- and two-digit HUD stage number by exact-ink Hamming match; **reports which layout it matched**; `--selftest` validates 46 synthetic cases plus a refusal. |
| `rails.json`, `enemyalt-*.json` | raw samples. |

Captures (all `?fixed=1&seed=1`, all from isolated `git archive` trees):

| dir | params | n | note |
|---|---|---|---|
| `stage-BEFORE-460/` | `&demo=1&invincible=1`, `--every 345` | 80 | pure `82365e9` |
| `stage-AFTER-460/` | same | 80 | + this lane |
| `tally-{2,10,12}/` | `&demo=1&invincible=1&debugtally=N` | 1 each | tally card layout |

163 frames, **0 black**, 18 cross-directory duplicates — all of them the
frames-0-17 control of §1.3.

Figures: `judging/R8/flow-r8-01` … `-05`.

Arcade frames used (all from `.reference-cache/video/`, none written into the
repo): `ab2-longplay.mp4` at t=100/140/175/220/280/290/350/400/450/490/530/590/630
(stage digits), t=428.0-429.5, 511.5-513.0 (tally cards);
`ab2-longplay-60fps.mp4` at 22 points t=95…740 (throttle letter).

# Round 6 — criteria lane (REFERENCE.md / GAME_SPEC.md / STATUS.md)

Files edited: `REFERENCE.md`, `GAME_SPEC.md`, `STATUS.md`, this file. Two new tools:
`tools/measure_value_stats.py`, `tools/criteria_lane_ab_control.py`. **Nothing under `src/`.**
All captures and frames under `tools/out/criteria-r6/`. No commit, stash, checkout, reset or
push.

Every instrument below was validated on a known input before it was pointed at anything, and
**every criterion published here was checked against the arcade first**. Two of those checks
reversed the direction the brief expected — they are flagged `CHECK REVERSED` and are the most
important things in this report.

---

## Instrument controls, run before any number was believed

| instrument | control | result |
|---|---|---|
| `tools/measure_value_stats.py` (VALUE-STAT) | `--selftest`: grey ramp (median/max exact), saturated-red rejection (100/200 kept, achromatic max 0.5020 vs all-pixel 1.0000), `#c5c5ad` = V 0.7725, filter-boundary classification, two-blob component isolation (picks 450 px, not 200) | **PASS** |
| `tools/criteria_lane_ab_control.py` (CRIT-AB) | `--selftest`: flat field, vertical stripes (H 0 / V 100), horizontal stripes (H 100 / V 0 — catches a transposed axis), region exclusion, 3× nearest upscale recovered exactly, **bilinear upscale refused** | **PASS** |
| same, on known input | `ab2-arcade-desert.png` → 138 / 31 / 68.8 / 68.5; `ab2-arcade-night-banking.png` → 79 / 17 / 84.0 / 80.3 | **exact, all 8 figures** |
| VALUE-STAT on known input | arcade desert jet crop → achromatic V median 0.839 / p90 1.000 / max 1.000; all-pixel 0.902 / 0.969 / 1.000 | **exact vs the R5 judge, all 6** |
| another lane's `tools/measure_criterion_ab.py` | its own `--selftest` | **PASS**, same arcade figures |

**Four implementations now reproduce the Criterion A/B arcade controls exactly** (this
document's original, the R5 judge's, this lane's control, and the other R6 lane's).

**Every "measures 100 %" result was cropped and looked at.** One of them was wrong — see
"the beautiful number" under Job 3.

---

## JOB 1 — the two arcade facts this project guessed at for five rounds

### (a) Death rate — published with BOTH methods and both operators

`GAME_SPEC.md` §2, new section "Lethality: THE ARCADE'S OWN DEATH RATE, measured twice
independently (MEASURED R6)".

| | deaths | span | deaths/min wall | deaths/min flight |
|---|---|---|---|---|
| R5 judge — READY-card NCC template match | 26 | 816 s | **1.91** | — |
| R5 feel critic — score-freeze clusters + continue partition | **27** | 793.8 s | **2.04** | **2.78–2.94** |
| ours, `53ce86b` | — | — | **3.00** | 4.04 |

Both operators are transcribed in full in the spec, including their validations: the judge's
**23 of 24** candidates crop-verified genuine plus **3** more recovered on a threshold sweep
down to 0.40 (so their count is a *lower* bound, which is why they deferred to 27); the feel
critic's recovery of **4 of the 4** hand-identified deaths before use.

**Added, not relayed: the disagreement is decomposed.** The two differ by 0.129/min. Holding
the count at 27 and using the judge's span gives 1.985, so **0.073 of the gap is the one missed
card and 0.056 is where each reviewer bounded "gameplay"**. Harmonised on either denominator
the methods land within **4 %**. That is a stronger statement than "they agree", and it is what
makes the figure usable as a gate.

### (b) Lives per credit = 3, MEASURED

`GAME_SPEC.md` §2 carried **ASSUMED 3, "not derivable from this footage"** at the continue
bullet and again at "Verification priorities" item 5. Both upgraded, with the partition
operator and the `[3,3,3,3,3,3,3,3,3]` result, and with why the partition is self-validating
(a missed death reads 2, a false positive reads 4, neither occurs — so one result establishes
precision, recall and the lives count at once).

**One qualifier added, deliberately**: 3 is the lives count **of the cabinet in this
recording**. AB2's lives count is dip-switch configurable, so this measures a configuration,
not the ROM. It is still the right number to build to; it is not grounds for saying the arcade
cannot be set otherwise.

---

## JOB 2 — the score-reset spec defect — **independently re-read and CONFIRMED**

Not relayed. I re-extracted gp t256–276 from `ab2-gameplay.mp4` myself, cropped the score
region, upscaled 8× nearest, and read the digits
(`tools/out/criteria-r6/score/sheet-score-continue.png`), then pulled six full frames for
context (`…/score/full/sheet-continue-context.png`).

| gp t | score | state |
|---|---|---|
| 256 | 485 440 | flight |
| 258–264 | **489 540** | frozen through the death |
| **261** | **489 540** | **CONTINUE PLAY / 10 / INSERT COIN on screen, score displayed and unchanged** |
| 263 | 489 540 | READY |
| 265 | **490 000** | flight resumed |
| 268 / 274 | 491 900 / 497 430 | climbing |

Monotone through the continue. **"~600" is not on screen at t265–269; 490 000 is.** Spec
corrected, with the old text quoted so the correction is auditable.

**Two facts the re-read turned up that nobody had asked for**, both now in the spec:

- **HIT is not reset by the continue either** — 4 before the card, 4 after, ticking to 5 only
  on the next kill. Consistent with §6's "HIT resets at the stage-end tally and nowhere else",
  and now corroborated across a continue rather than only across a death.
- **The stage digit reads 4 before and after**, which is direct pixel evidence for the
  "resumes IN PLACE — same stage" clause that was previously asserted alongside the wrong
  score claim.

---

## JOB 3 — three more ledger rows (and three more than that)

The ledger now runs to **15 rows**. The two previously unnumbered rows are numbered 9 and 10.

### Row 11 — player-airframe ceiling V ≤ 0.77 — RETIRED, replaced

Confirmed on a third implementation. Arcade daylight airframe, achromatic pixels (S < 0.25):

| population | stage (**digit read**) | V median | V max | share V>0.80 |
|---|---|---|---|---|
| arcade t116, **this lane** | 1 | **0.816** | 1.000 | 53.5 % |
| arcade t97/t98/t100.75/t108 (R5 art critic) | 1 | 0.776 / 0.890 / 0.922 / 0.914 | — | 45.0–65.1 % |
| arcade `ab2-arcade-desert.png`, **true native** | **2** | **0.839** | 1.000 | 59.5 % |
| ours (R5 judge, `53ce86b`) | 1 | **0.643** | **0.773** `#c5c5ad` | 5.3 % |

**ACCEPT: V median 0.78–0.92 and brightest body colour ≥ V 0.90, daylight stages.** The
brightest-colour clause is mine and it is load-bearing: a median alone can be satisfied by a
flat mid-grey with no highlight at all. It comes from the arcade's own ≤8-colour daylight
sprite set, which contains `#ffffef` and `#ffffff`, both V 1.000.

**CHECK REVERSED — the brief's citation for this row is mis-attributed.** The lead's
replacement cited the judge's 0.839 as "the arcade's **stage-1** jet, `ab2-arcade-desert.png`".
I read that frame's own HUD digit: it is **STAGE 2**. Had I published it as given, the
replacement for a criterion retired *for being measured on the wrong stage* would have carried
the same defect. The band survives — its licensing population is the art critic's five
**stage-verified stage-1** frames, and the stage-2 native frame is a corroboration that happens
to land in the middle of it — but the attribution is now stated that way, not the way it
arrived. `GAME_SPEC.md`'s colour caveat has carried the correct attribution for both native
frames since R5b, so this was recoverable by reading a sibling document.

**Reproduction quality**: this lane's t116 reading and the art critic's differ by **0.015 in
median and 0.8 points in share**, on separately written operators; the airframe box is the
whole difference.

**The beautiful number.** A first attempt at t98 used a box one aircraft too low.
`--isolate largest` returned 1 834 px at **V median 1.000, p90 1.000, max 1.000, share V>0.80 =
100.0 %** — clean, stable, perfectly reproducible. The mask dump
(`tools/out/criteria-r6/value/mask-t98.png`) is the **horizon haze band**, with no aircraft in
it. Published in REFERENCE.md as a worked example, because this is the project's standing
crop-and-look trigger firing correctly and it should be cheap to recognise next time.

### Row 12 — near-black enemy dominant — RETIRED **for stage 1 only**

Provenance verified myself: `ab2-arcade-closeup-enemies.jpg` reads **STAGE 2** at its own HUD
digit — orange sky, dark-green camo MiGs. (It is also a watermarked third-party capture, which
is a second reason not to anchor a livery on it; the digit is legible regardless.)

Measured the stage-1 side independently, on a different frame from the art critic's and with a
different operator (sky dropped by `B − R > 80`, mask dumped and looked at):

| population | stage | V median | share V<0.3 | share V>0.7 | light : dark |
|---|---|---|---|---|---|
| arcade t116 enemy, **this lane** | **1** | **0.582** | 18.5 % | 35.8 % | **1.9 : 1** |
| arcade t100.75 enemy (art critic) | 1 | 0.557 | 23.2 % | 41.1 % | 1.8 : 1 |
| ours, `enemy-grey-*.png` | 1 | 0.227 | 61.0 % | 3.5 % | **0.06 : 1** |

**ACCEPT: share(V>0.7) must exceed share(V<0.3) by ≥1.5:1 on stage-1 liveries.** A ratio, not
a value target, **on purpose**: both arcade readings come from video upscales where edge blur
compresses the two shares toward each other — so 0.557 and 0.582 are soft and the art critic
rightly published theirs as an upper bound — but **blur cannot flip their order**. The ordering
is the blur-robust part of the measurement, so the ordering is what the gate uses.

**A third instance of this defect, in REFERENCE.md itself.** The Enemies section asserted that
"grey MiG-type silhouettes read **dark** against bright skies (**t116** left, t148, t186)". The
t116 frame it cites contradicts it. t148 is stage 2 and t186 is stage 3, where the claim is
true; it was exported to stage 1 without being checked there. **Withdrawn**, with the
withdrawal shown rather than the line silently deleted. What the crop actually shows is now
published: a pale grey-white fuselage, **green camo across the wings**, a near-black nozzle
*ring* and a hot orange centre — the near-black is a 1-px accent, which is precisely the
element R4 measured and then promoted to dominant.

### Row 13 — ≤1.5 deaths/min — RETIRED, and lethality is NOT left ungated

**GATE: ≤ 2.0 deaths per minute of wall clock**, with deaths/min of flight time on the same
line, and every figure naming its denominator, seeds, span and tree state. Ours is 3.00 and
fails it; that is the point.

R5c had demoted deaths/min to a regression guard *because no arcade target existed*. That
premise was overtaken inside the same round. I have **not** deleted R5c's reasoning — it is
sound and the pilot-dependence is real — but marked it `PARTLY SUPERSEDED` in place, and
carried the pilot-dependence **on** the gate rather than against it:

| source | deaths/min wall | what it measures |
|---|---|---|
| `ab2-longplay.mp4` | 0.00 | an expert exhibition clear |
| `ab2-gameplay.mp4` | 2.04 | an ordinary competent player paying to play |
| our `?demo=1` | 2.90–3.00 | a non-reactive autopilot that cannot dodge |

With the honest reading attached: **an autopilot that cannot dodge dies only 1.42× as often as
a human who can**, so for a reacting player this build is plausibly at or below arcade
lethality. The instruction on the gate is therefore **"fail it and investigate"**, not "make
the game easier". R5c's withdrawn **1.32/min bound is also marked superseded** so it is not
quoted again.

### Rows 14 and 15 — two operator defects found while doing the above

**Row 14 — Criterion A2 names one statistic and the project has been quoting two.** "≤32
distinct values **per channel**" reads as the max over the three channels. The published arcade
figure is the **union**: `ab2-arcade-desert.png` is **25 / 29 / 26 per channel → max 29**, union
**31**, and 31 is both the published number and the length of this document's enumerated
ladder. The night frame reads 17 both ways, which is why it survived a round. **The R5 judge's
our-side column (stage 2 = 118, stage 3 = 245) is the per-channel reading**, so that table
silently compared a union figure against a per-channel one. Repaired, not retired: the gate is
the union, both readings are now reported and named, **and no pass/fail verdict changes** —
every figure in play is either ≤31 or ≥118.

**Row 15 — the #132 operator's arcade-side HUD exclusion. CHECK REVERSED.** The brief (and the
R5 judge) state the operator "specifies a HUD exclusion for *our* side only and is silent on
the arcade side". **It is not silent.** `REFERENCE.md:1337–1339` of `53ce86b` — the exact tree
the judge measured — publishes two arcade rects. The real defect is that they were unusable:

1. the 4-tuple's **coordinate convention is never named** (`x0,y0,x1,y1` vs `x,y,w,h`; only one
   of the two rects is even coherent under the wrong reading);
2. the phrasing reads informational, never **mandatory**;
3. they sit ~110 lines below the figures they protect, after the retired-figures block;
4. **no control existed** by which a reader could tell whether they had applied them.

All four fixed, and a control published. On `reference/stage1-level-flight-t116.png` the
operator returns, at the ≥150 px minimum:

| | components ≥150 px |
|---|---|
| **without** the rects | **1** — area 496, bbox `x[35,153] y[32,52]`, **17.35 %W**: the SCORE emblem |
| **with** the rects | **0** |

496 px and 17.35 %W against the judge's independently measured 498 px and 17.20 %W median — to
within a pixel, on a different frame and implementation. **So the rects do work; they were
skipped.** A run reporting a ~17 %W "bank" at a fixed bbox across many consecutive frames is
measuring the SCORE emblem. (The HIT digits do survive the rects, but are far below 150 px and
never form a component — checked, not assumed.)

---

## JOB 4 — ≥3:1 HUD contrast retired; the mechanism published

Ledger row 10 moved from OPEN-candidate to **RETIRED**, and REFERENCE.md gains "HUD ink
separation — the arcade uses HUE AND A KEYLINE, not luminance", carrying the full 4 ink
classes × 3 stages × 2 readings table, the ours-vs-arcade discrimination table, and the reason
it can never be satisfied (relative luminance weights red at 0.2126, so a saturated red glyph
cannot reach 3:1 over mid-bright ground at *any* shade of red — this was never the design).

**The mechanism was read off the arcade's own native bottom strip rather than relayed**
(`ab2-arcade-desert.png` rows 190–224 at 4×, `tools/out/criteria-r6/value/desert-hud-4x.png`).
Confirmed, with one addition to the brief's wording: the white plate is behind the SPEED label
**and the throttle bar** — not SPEED alone. No plate behind STAGE; black keyline on the stage
digit and on the missile-stock icons; HUD drawn over the world with no opaque bar.

**R4 gap 3's contrast half marked CLOSED** in REFERENCE.md and STATUS.md: the headline "the
cream stage digit is literally invisible over stage 2's tan ground" is no longer true — ours
5.64:1 against the arcade's 5.92:1. The remaining half is typography alone, and the section
ends with an explicit **do not add halos, outlines or plates**, because ours is already 2–24×
more separated than the arcade's and adding separation moves away from the reference.

---

## JOB 5 — the three documentation defects

**(a) 42.27 %W.** The merged-component flag from `lane-criteria-fix.md` line 103 is restored
into the published table (`34.02 / 42.27 ⚠ MERGED`) plus a callout block: the t101.0 component
is a bank merged with the rolled haze band, an enemy airframe and debris, **and** it is
truncated at the frame's left edge, so its width is a lower bound on a merge. **Quote 33.24**
(t120.0) — with the detail that 33.24's truncation is in *height* (the 45 %H window), so the
width is sound and the height is the lower bound.

**(b)** Covered as ledger row 15 above — the claim as briefed was wrong and the real defect is
published instead, with a control.

**(c)** Ledger rows 9–15 added; running count corrected to fifteen in REFERENCE.md, GAME_SPEC.md
and STATUS.md so it stops drifting.

---

## JOB 6 — the stage-attribution rule

New binding section, "Every palette or value criterion names its stage (PROCESS RULE, binding
from R6)": record **MEASURED ON** (frame + *the stage digit read out of that frame's own HUD*)
and **LICENSED FOR** (the stages it may be applied to; if stage-independent, say so **and say
why**). An unattributable criterion is marked `UNATTRIBUTED` and is a candidate, not a gate.
How to read a stage digit is spelled out, with `STAGE_MAP.md` named as the preferred route for
video.

**Backfilled, all ten palette/value criteria in the document.** Findings from the backfill:

- **`ab2-arcade-desert.png` is stage 2** and was cited across this document as the generic
  "daylight" frame and twice as stage 1. For Criteria A and B the licence is still *all stages*
  — but the argument is now written down ("they describe the medium, not the appearance, and
  the two native frames bracket it from both ends") instead of being left implicit.
- **`ab2-arcade-night-banking.png` is stage 3**, per GAME_SPEC's colour caveat; REFERENCE.md
  only ever called it "night". Now attributed in all five places it appears.
- **One criterion cannot be attributed and is flagged: the explosion / fireball targets.** Both
  sources — `death-starburst-gp-t202.png` and `ab2-arcade-huge-explosion.jpg` — are from
  `ab2-gameplay.mp4` (no stage map) and an unlabelled third-party still. A fireball is self-lit
  and plausibly stage-independent, **but that is an argument, not a measurement**, and these
  targets are already ledger row 3, retired once. Flagged, not retired again; the flag is the
  deliverable.

---

## JOB 7 — Criteria A and B promoted

- **REFERENCE.md** opens with "READ THIS BEFORE ANY RENDER, PALETTE OR SPRITE WORK — the build
  FAILS both gates on stage 1", before the criteria themselves, carrying the per-stage
  scoreboard, the operator provenance, and the region definition.
- **STATUS.md** gains **gap 0**, above the enemy sprite, and the header now says "Start here if
  you are a new lane: the per-stage Criterion A/B scoreboard, then gap 0."

Re-measured independently rather than relayed, on the R5 judge's own captures (clean checkout
`53ce86b`), with a separately written operator:

| population | colours | chan (union) | ground H-id | ground V-id |
|---|---|---|---|---|
| **GATE** | ≤256 | ≤32 | ≥50 % | ≥50 % |
| arcade desert (native, stage 2) | 138 | 31 | 68.8 % | 68.5 % |
| arcade night (native, stage 3) | 79 | 17 | 84.0 % | 80.3 % |
| **ours, stage 1** | **13 879** | **254** | **31.9 %** | **0.1 %** |
| ours, stage 2 | 374 | 170 (per-ch 118) | 64.2 % | 42.6 % |
| ours, stage 3 | 989 | 249 (per-ch 245) | 60.0 % | 39.7 % |

Colour counts match the judge **exactly** on stages 2 and 3 (374, 989) — that is the control
that the two implementations are the same operator. The H/V figures run 3–8 points apart
because the judge used a per-frame fitted horizon and I used the published fixed band rows
140–195; **the region choice is the whole difference and it changes no verdict.** Both are
stated.

**The 0.1 % was cropped and looked at** before publishing
(`tools/out/criteria-r6/value/cmp-dither-ours-TOP-arcade-BOT.png`): ours is 3 443 colours of
horizontal smears where every row differs from the row above; the arcade's same-size crop is 36
colours of flat chunky blocks with readable rock and foliage. The number is honest.

**Added beyond the brief — a cross-criterion interaction warning**, because the lane that fixes
this is about to walk into it. Criterion B asks for *more vertical coherence* on the sea; the
published sea-ACF gate asks for `horiz/vert ratio ≥ 2.0` and our best tuning already sits at
**1.99**. Raising vertical coherence pushes that ratio **down**. They are not actually in
conflict — the arcade satisfies both at once (2.34 and 68.5 %) because its vertical coherence
comes from *flat dithered bands*, not a smoother noise field — but a lane tuning one without
watching the other will trade a failure for a failure. REFERENCE.md now requires the ACF triple
and the A/B quadruple to be reported **in the same table, on the same frames**.

---

## Tool reconciliation

`tools/measure_criteria_ab.py` (mine) and `tools/measure_criterion_ab.py` (another R6 lane's)
were near-identically named. I did not touch theirs. **Mine is renamed
`tools/criteria_lane_ab_control.py`** and its docstring now says what it is for:

- **`measure_criterion_ab.py` is the instrument to measure the build with** — per-frame fitted
  horizon, a `hud+static` mask derived from the frames themselves rather than from a box, and
  directory sweeps.
- **`criteria_lane_ab_control.py` is a second, separately written implementation**, kept
  because two agreeing instruments is this project's strongest evidence pattern, and because it
  is the one that reports **both** readings of A2 — which is how ledger row 14 was found. It
  also refuses to measure a frame whose upscale is not provably lossless, rather than silently
  decimating a filtered image.

Both selftests PASS and both reproduce all eight published arcade control figures.

---

## Left unresolved, with the reason

- **Our-side figures in rows 11 and 12 are from `53ce86b`, not the live tree.** Four build
  lanes are changing `src/` concurrently and the sprite lane is working exactly these sheets,
  so a number measured now would be stale before this report is read. The accept bands are
  tree-independent; the "ours" columns are explicitly dated and must be re-measured before
  anyone claims a pass. Stated in STATUS.md's header as well as in each table.
- **I re-measured one of the art critic's five player-jet frames, not all five.** t116
  reproduced to 0.015; t97 and t98 need airframe boxes I did not land (the t98 attempt is the
  worked failure above). The band's five-frame spread is therefore the art critic's measurement
  with one independent confirmation and one native-frame corroboration, not five independent
  confirmations. Said plainly in REFERENCE.md rather than implied.
- **The explosion/fireball targets stay UNATTRIBUTED.** Attributing them needs a stage map for
  `ab2-gameplay.mp4`, which does not exist. Flagged rather than guessed.
- **Stage-1 cloud presence remains UNRESOLVED**, untouched this round — it is not a gate and
  nothing in R6 moved it.
- **Criterion A3, the per-sprite colour bound, is not in either A/B tool.** It is a sprite-sheet
  measurement, the sheets are being redrawn by a live lane, and a bound measured mid-redraw
  would be meaningless. The bound itself is published and unchanged.


---

# Addendum — second pass (lead's follow-up)

## HUD element 1, the nose sight — HELD, but independently corroborated on a wider sample

**`GAME_SPEC.md` is UNCHANGED on this.** Per the lead's instruction I am waiting for the combat
lane. What follows is a third opinion gathered in parallel so the decision has a wider sample
than four frames when it is made; it does not pre-empt it.

**Sweep**: 16 frames of `ab2-longplay.mp4` across stages 1, 2, 3, 4, 5 and 7 (t92, 95, 103,
110, 118, 128, 140, 150, 170, 180, 190, 205, 214, 225, 250, 330), each cropped to the jet
region and read at 1.5–8× nearest (`tools/out/criteria-r6/sight/sheet-*.png`, `zoom-*.png`,
`full2x-*.png`).

**Result: I find no square leading the nose in any of them, and I agree with the flow lane.**

| frame | condition | square ahead of the nose? |
|---|---|---|
| t92 | climb-out, **no enemies** | **none anywhere in frame** except the fixed upper-right reticle |
| t103 | own kill explosion, no enemies | **none** |
| **t110** | **hard bank, no enemies** — the strongest single frame | **none.** Nose points up-left; the only reticle is the fixed upper-right bracket square with its attitude line, which does not move with the jet |
| t95, t170, t180, t190, t205 | enemies present | squares present, on or beside enemies/distant contacts; none holds a fixed offset from the nose |

`tools/out/criteria-r6/sight/full2x-t110.png` is the image to look at — a full-screen hard bank
with no enemies, one reticle, and clear sky in front of the nose.

**A document-internal contradiction, which is new and makes the hypothesis stronger.** Element
1 and element 2 are both cited to the **same t84–118 reticle strip**. Element 2 records the
reticle's status dot as "**ABSENT when no enemies are in play (t84–94, carrier/climb-out)**" —
so that span *was* examined for presence/absence of reticle features. Element 1 claims a sight
"**always present in flight**". t92 is inside that span, is in flight, and has no sight. The
two readings of one strip disagree with each other.

**Second supporting observation**: at t90, on the carrier deck before launch with no enemies,
**the fixed upper-right reticle is already drawn**. So the arcade does have an always-present
reticle — it is just element 2, in the upper right, not element 1 at the nose. That is the most
likely shape of the original error: one always-present reticle plus roving lock brackets, read
as three elements instead of two.

**If combat confirms**, element 1 should be retired as ledger row 16 with both lanes' evidence,
and the entry must say plainly that **our build has been drawing a HUD element the arcade does
not have** — the first instance in this project of the wrong-object defect family producing an
element that exists only in our build. **If combat finds it**, say so explicitly in GAME_SPEC
at element 1 — "checked in R6 over N frames and found" — because the next reader needs to know
this was examined rather than assumed. Either way the outcome gets written down.

## Throttle — the footage cannot answer it, and that is now a published result

Sampled the HUD throttle letter and bar every 10–12 s from t90 to t370 — **27 frames, stages
1–8** — and read the strip at 3× (`tools/out/criteria-r6/throttle/strip.png`).

- **The letter reads `M` in 27 of 27.** Never `H`, never `L`.
- **The bar fill is identical in every flight sample** (blue 0→1, amber 1→2, dots 2→3) and
  **empty in both non-flight samples** — the carrier deck at t90 and the stage-5 runway restock
  at t250 (`full-compare.png`). So the fill tracks *being under power*, and its level never
  moves.

**So the magnitude of throttle's effect is not derivable from the cached footage — not
"unmeasured", but unmeasurable here**, because the pilot in the only stage-mapped recording
never touches it. Published as a MEASURED-NEGATIVE in GAME_SPEC §1 and in REFERENCE.md's HUD
table, and "Verification priorities" item 2 is closed **as unmeasurable rather than as
unknown**, so nobody opens a ticket to go and measure it here.

**The actionable part for the two lanes about to wire it — `M` is the datum.** Every flight
constant this project has MEASURED was taken from footage in which the throttle is `M`
throughout: ground-flow rate, the 62.50 %H horizon and the composition bands, the 4–6 s enemy
approach, and passive accrual at **3300/s** (§6 already says "at SPEED M"). **The middle state
must reproduce all of them exactly; H and L are excursions either side.** Wiring throttle as a
multiplier on a default that is not `M` silently re-bases every one of those numbers, and
nothing in the test suite would catch it. Whatever magnitudes get chosen are **ADOPTED**, and
must be labelled so.

Two corrections to the documents fell out of this:

- **REFERENCE.md's HUD table asserted two things nobody had seen.** "Changes with throttle" and
  "amber chevron at the **current-speed position**" are both inferences from a static reading
  of one frame. Both now flagged as inferences with the 27-sample negative beside them.
- **A second copy of the score-reset defect, in §6.** Correcting §2 was not enough: the
  Scoring section separately asserted "**Continue resets the score to ~0** but keeps stage
  progress". That is the section a scoring or flow lane actually reads. Corrected, with the
  HIT-survives-the-continue fact attached. **Worth generalising: when a measured fact is wrong,
  grep the whole document set for it rather than fixing the section it was reported against.**

## The control-table rule

Published in REFERENCE.md as the second binding process rule: **"A verb that is not in the
control table is a verb a judge will score as absent."** It carries the worked case — `Q`/`E`
throttle shipped in R5 and the barrel roll in R5b, neither in the table; the R5 judge scored
the throttle as having no player control, a gap that did not exist, and the R6 flow lane spent
part of a round disproving it.

It is deliberately placed next to the stage-attribution rule, because they are the same rule in
two domains: **the artefact a reader will actually consult is part of the deliverable.** A
palette criterion without its stage is unusable by the next measurer; a control without its
table row is invisible to the next judge. Each has now cost this project a round.

(`README.md` is not this lane's file and the lead has already fixed it; only the general rule
is published here.)


---

# Addendum 2 — the world lane's four audit items

Read `judging/R6/lane-world.md` in full, not the summary. Three retirements and one narrowing
came out of it; **the ledger is now 18 rows.**

## 1 + 2 are ONE root cause, and it is bigger than either

The two items arrive as separate problems — an anisotropy figure that disagrees with itself,
and a decorrelation band that cannot be measured — and they are the same fact. I measured it
directly rather than reasoning about it:

| | unique colours | H-identity | V-identity |
|---|---|---|---|
| `ab2-arcade-desert.png` ground rows 140–195, **true native** | **47** | **65.0 %** | **64.4 %** |
| `ab2-arcade-night-banking.png` same rows, **true native** | **28** | **78.2 %** | **72.9 %** |
| **t116 sea band** `y[340,415] x[40,640]`, **686×480 video** | **19 896** | **17.5 %** | **11.4 %** |
| same band, BOX-decimated toward native | 6 972 | 3.4 % | 1.6 % |
| same band, NEAREST-decimated toward native | 6 281 | 5.4 % | 2.5 % |

**19 896 colours in a 600×75 band of hardware that emits 31 rungs per channel.** At small
scales the video is not a degraded copy of the arcade's art — it is a different signal, and
decimating does not recover it. (The world lane measured 2.8 % V-identity on its own band and
concluded the same; two regions, two tools.)

**So I did not just retire the two numbers — I published the scale rule that generates them**,
into REFERENCE.md right beside the existing level-accuracy warning, because the obvious
over-correction is to distrust the video generally and that would retire a great deal of good
work. Measured, three tiers:

| class | survives the video? | evidence |
|---|---|---|
| large-region modes and geometry | **YES, exactly** | t116 sky mode `#009eff` at **99.5 %** of the band; bank widths; horizon height; composition |
| threshold-area fractions | **YES, with a named bias** | foam `V>0.95`: **23.4 %** at 686×480 (reproduces this document's own published figure exactly), **24.0 %** NEAREST-decimated, **18.0 %** BOX-decimated — **BOX costs ~5 points downward** |
| exact-equality adjacency and lag-1 correlation | **NO — destroyed** | the table above |

**Rule: a statistic whose kernel is one or two pixels wide may not be measured on a video
frame, in either direction. A statistic integrating over tens of pixels is safe.**

### Row 16 — the decorrelation band 1.21–2.25 texels: RETIRED, no replacement

A decorrelation length at lag 1–2 is a two-pixel-kernel statistic, and 1.73 texels was fitted
on t116. ±30 % of it is a precision claim on re-encode noise. **No replacement is published
and none is possible with the evidence we hold.** The world lane read 11.6 against it and
**correctly did not tune to it** — that is the behaviour to repeat, and it is recorded as such.

**What survives is the shape, not the numbers.** R3's judge's degenerate-satisfaction argument
needs no arcade figure: a bare ratio goes to infinity if you make the vertical axis pure noise.
**Any anisotropy figure must still be reported with its two absolute lengths.** The lead's
suspicion about the attribution is confirmed and now published as the worked example: the
start-of-session build cleared the ratio at **6.18× while running hx 74.41 against the arcade's
41.63** — nearly twice as smooth in absolute terms, i.e. passing degenerately, exactly as
warned.

### Row 17 — the R5 anisotropy restatement (4.95× vs 5.21×): ALSO RETIRED

R5's repair fixed the *comparison* (one resolution, one filter) and left the *source*. The
arcade's `hx = 41.626` is measured on the same contaminated t116 band.

**Why no choice of common resolution rescues it**, which is the part that makes this final:
at 686×480 **our** side must be non-integer-upsampled 2.14× — the thing Criterion B forbids; at
native, the **arcade** side must be non-integer-decimated 2.14× — demonstrably destructive
(1.6–2.5 % V-identity after decimation). **One side is always resampled wrongly, because the
arcade side only exists at a resolution the art was never drawn at.** The sign reversal the
lead flagged (3.04× common-res vs 4.56× native, opposite directions) is the symptom, not the
disease.

Rows 6, 16 and 17 are **one statistic retired, restated, and retired again**. Three rounds
spent on a number that was never measurable from the evidence we hold. That sentence is in the
document.

### The acquisition this unblocks

A single true-native stage-1 screenshot would settle **four** open items: the `#009eff` sky
level, Criterion B's floor on sea, the decorrelation band, and the anisotropy target. **Three
of the four are retired for want of it, not for want of effort.** Promoted in STATUS.md to the
highest-value acquisition available to this project.

**On item 2's second half — Criterion B's 50 % floor on a stage-1 sea patch.** The lane is
right that it is an extrapolation: both true-native frames are stage 2 and stage 3, and neither
is sea. I have **not** retired it, and here is the reasoning, so it can be attacked. The floor
sits in a gap with large margin on both sides — arcade ≥61.7 % on every sub-region of both
frames, our pre-fix build ≤35.1 % on every flight capture — and Criterion B is a claim about
the *medium*, which does not change between a desert and a sea drawn by the same hardware in
the same game. A ±10-point extrapolation across subject matter is a far weaker assumption than
a ±30 % band fitted to codec noise. **Flagged as an extrapolation in the backfill table, kept
as a gate.** If a native stage-1 frame ever lands and the sea reads below 50 %, it goes.

## 3. The stale citation is already gone

`REFERENCE.md` carries **no** reference to `measure_criteria_ab.py` — I renamed the file and
updated every citation in the same pass, before the world lane's report was written; its §8(e)
was correct against an earlier read. Verified by grep across `REFERENCE.md`, `GAME_SPEC.md` and
`STATUS.md`: zero hits.

**On consolidating the two files: I recommend keeping both, and have documented why rather than
merging.** `measure_criterion_ab.py` (world lane's) is the instrument for measuring the build —
per-frame fitted horizon, a `hud+static` mask derived from the frames themselves, directory
sweeps. `criteria_lane_ab_control.py` (mine) is a separately written second implementation that
reports **both** readings of A2 — which is how ledger row 14 was found — and refuses to measure
a frame whose upscale is not provably lossless. Merging them would delete a control. Four
implementations now reproduce the arcade figures exactly, and that is the project's strongest
evidence pattern; I would not trade it for one fewer file.

## 4. The methodological finding — published as a process rule AND as ledger row 18

I agree it outranks the rest, and I have put it in both places: a binding process rule next to
the stage-attribution and control-table rules, **and** a ledger row, because the ledger is what
gets counted and the rule is what gets followed.

**I also narrowed a claim this document had been making since R5.** The Criterion A/B section
opened by saying the two "cannot be laundered". That is now qualified in place: **they cannot
be laundered by a continuous-tone renderer — which is what they were built to catch — and they
can be laundered by a degenerate one.** The unqualified version was three sections above the
place where it was about to be disproved.

**The direction is the finding.** A flat slab is *more* self-identical than a dash field, so the
wrong structure scored H-identity **89.3 %, twenty points ABOVE the arcade's own 68.7 %**.
Criterion B has a floor and no ceiling, so nothing could fire — **and a ceiling is not the fix**,
because the arcade's own two native frames read 68.5 % and 80.3 %, so any ceiling tight enough
to catch 89.3 risks failing a legitimate night frame. The fix has to be a different *kind* of
statistic, not a tighter bound on this one.

The medians were blind and the extremes were not: width p50 was **2 px on the slab build and on
the correct one alike**. The whole defect lived in `max`. SEA-DASH is published as the paired
criterion with explicit accept bands — **largest component ≤200 px, max width ≤60, count ≥300,
against the arcade's 82 / 38 / 389** — and the medians are published *as context, labelled as
context*, so nobody adopts them as targets.

**One caveat I added to the lane's arcade column.** Its arcade side is BOX-area-averaged from
t116, and per the scale rule BOX costs ~5 points of foam fraction downward (same band: 23.4 %
at 686×480, 18.0 % after BOX). So "ours 18.4 % vs arcade 19.5 %" compares a nearest-decimated
figure against a box-averaged one. It does not overturn the match — the accept bands are set
wide enough to absorb it — but the comparison is sound to ~5 points and should not be quoted
tighter. Threshold-and-count statistics are nonetheless the **right** tool here, precisely
because they survive the video where adjacency statistics do not.

## The `hazeSteps` trap

Recorded in STATUS.md's open items, where cross-lane traps live: **`hazeSteps` is read by
`paramsFor()` out of `stage.terrain`, not `stage.haze`.** Putting it under `haze` beside
`bandHeightFrac` — where it reads as if it belongs — is a silent no-op with no error and no
warning. Generalised in the same entry: grep where a key is consumed before trusting that
setting it did anything.


---

# Addendum 3 — FIRE-MASK (combat lane A3), and one more the same shape

Read `lane-combat.md` §4 and `ask-combat.md` A3/A4. **Ledger is now 20 rows.**

## Row 19 — FIRE-MASK's control regions: CONFIRMED on a third implementation

Reproduced independently before publishing, with the mask rendered and looked at:

| `ab2-arcade-huge-explosion.jpg` (181×127) | mean V | V>0.95 | **core** | mean S |
|---|---|---|---|---|
| **verbatim, no exclusions** (this lane) | 0.8989 | 53.1 % | **17.2 %** | **0.764** |
| **with rows 0–14, rows 112–127, x<55 ∧ y>82** | **0.9030** | **53.6 %** | **9.1 %** | **0.848** |
| **published** | 0.9055 | 54.2 % | 9.2 % | 0.846 |

All four reproduce within 0.6 points with the regions; the core nearly **doubles** without
them. `tools/out/criteria-r6/firemask-verbatim.png` shows why and it is not subtle — the mask
contains the **top HUD text row, the bottom HUD strip and the white cloud wedge**, all
8-connected to the fireball through its spikes and base, so the largest-component step cannot
drop them. Published with the regions, the control table, and a recognition cue: *a core near
17–18 % or a mean S near 0.76 on this frame means you did not apply them.*

**A second omission in the same operator, which the ask did not mention.** "core 9.2 %" was
published **with no core predicate anywhere in the block.** I used I6's `S < 0.25 ∧ V > 0.94`
and got 9.09; neighbouring thresholds give **8.5–9.6 %**. Both the predicate and that ±0.6
definitional spread are now in the block, with "do not chase its decimals" — my 9.1 and the
combat lane's 9.4 differ only by that.

## The detector is the most valuable thing here, and I published it as such

Your framing is right and I have given it its own section above the ledger rather than burying
it in a row:

> **Two independent implementations that miss a published control in the SAME DIRECTION are
> evidence of an under-specified operator, not of two bugs.**

Two bugs are independent and land either side; a missing half of an operator is systematic, so
every faithful reader reproduces it identically. The worked case is now three readings deep:
R5 **13.2 %**, combat **18.2 %**, this lane **17.2 %**, published **9.2 %** — all high, none
agreeing, and the fault was three unpublished rectangles.

**The actionable half**: on a failed control, do not debug your implementation first — ask
whether the other implementation failed the same way and in which direction. R5 had exactly
that evidence, read it as its own instrument's failure, and the operator went unrepaired for a
round while a build decision was taken on a figure it could not produce.

## Both consequences carried, including the one that reverses a position I relayed

**(1) The sign reversal is published as a reversal, not quietly overwritten.** REFERENCE.md's
our-side fireball table now shows the struck R5 row beside the re-measurement, and says
plainly that R5's lane, the R5 art critique and the lead all reasoned correctly from an
inverted premise — our core was **28–32 %**, three times the arcade's, not 4.1–7.8 % under it.
A record that silently shows the right number teaches nothing; three parties agreeing on a bad
premise is the lesson.

**(2) The per-phase argument is adopted, with the fade exclusion stated in the criterion.**
The core is flat to within 4 points across ignition, bloom and hold — an authored texel grid
does not decay — so a per-phase split buys nothing there. The fade is where pooling lies: the
alpha ramp blends the sprite into the sky, `V>0.95` → **0.0 %**, mean S → **0.20**. **Any
pooled figure including fade frames is measuring the alpha ramp, not the fireball** — now in
the criterion text, not just in a lane report.

I also recorded the lane's refusal to chase `V>0.95` by thinning the spikes, as an accepted
deliverable: the spikes are also the starburst silhouette that the R5 art critique flags as
wrongly four-fold symmetric, and trading one named art defect for a gate is how this document
got its ledger.

## Row 20 — one more of the same family, found while in there

The R5 judge flagged **I6's brightest-decile saturation ≤0.30** as "kept, correct, and should
be dropped" and nobody acted. It is a **false negative by construction** on any palette holding
a saturated colour brighter than its own core — ours holds two (`#ffba04` V 1.000 S 0.984 and
`#f9f647` V 0.976 S 0.715, both above the core `#f6f6e7` at V 0.965) — so it reads **0.952** on
a fireball whose core is *exactly the arcade's published core colour*. **Dropped.** The core
fraction is the robust statistic because it counts the core instead of ranking against it. The
decile *ladder* survives as an authoring target; only the gate is withdrawn. Struck in
GAME_SPEC §2's death-sequence description as well, which is where a combat lane would read it.

## A4 — the enemy-altitude distribution: published as a CANDIDATE, not adopted

The lane asked that it not bind anybody this round. **Honoured, and the reasoning recorded**,
because adopting a one-lane hand count is how several ledger rows started. It is in GAME_SPEC
§2 beside the lethality gate, with its full operator (63 frames, fixed 3.00 s grid, six
stage-verified spans, read **by a human** — no detector, on purpose), its four stated
weaknesses, and **the promotion bar: an independent re-count by someone else.** That is the
bar the arcade death rate had to clear; what made that figure trustworthy was two independent
methods agreeing, not one careful one.

I published it anyway rather than leaving it in a lane report, for one reason worth recording:
**it already explains a MEASURED constant.** The arcade's readable enemies sit at 36.0 %H
against its player's 49.0 %H — thirteen points above — and `combat.js`'s `SIGHT_NDC_Y_OFFSET`
is 0.30 NDC = **15 %H above the nose**, measured independently and years of frames apart. Two
measurements agreeing to two points. A candidate that explains a measured constant is worth
publishing before it is worth enforcing.

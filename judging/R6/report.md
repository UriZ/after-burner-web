# Judge Round 6 — three.js After Burner rebuild vs arcade AB2

**Date**: 2026-10-09
**Build judged**: clean checkout at **`e8fed58058dd9a0a9d28f11e01ccd88f2dec26ea`**
("R6 criteria: six more defective criteria, and the gates learn they can be laundered").

**`git status --short` was EMPTY at the start of this gate.** At the end it showed only
*untracked* files under `judging/R6/` — the concurrent art critic's `art-critique.md` and its
PNGs, and my own `judge-evidence/` and this report. `git log -1` was unchanged throughout and
**no tracked file was modified at any point**, so every our-side figure describes the committed
state of `e8fed58`. I did not modify any file under `src/` or `tools/`. I did not commit.

**Independence note.** I did not read `art-critique.md`. Every operator below was reimplemented
from `REFERENCE.md` prose in my own scripts and validated on a known input before it was
pointed at the build. Where I ran a lane's tool it was *after* my own implementation had
produced a number, and only to reconcile a disagreement; both readings are given. I read the
six R6 lane reports to know what to check and sourced no number from them. Two art-critic
findings were relayed to me by the lead after I had finished measuring; I re-ran them on my own
instruments rather than adopting them, and the results — including where I disagree — are in
"Cross-checks against the art critic".

**Yardstick**: "Would a player mistake this for After Burner II?"

---

## Verdict

**FAIL as a fidelity gate — overall 8/10** (R1: 3, R2: 4, R3: 6, R4: 7, R5: 7.5).

This is the first round where I could point at a frame of the running game and say it looks
like a 1987 arcade cabinet. R5's gap 0 — "we render continuous-tone noise where the arcade
renders structured pixel art" — is genuinely closed on stage 1, verified on my own instrument
across five tick spacings: **46–51 colours and 21 channel values against gates of 256 and 32,
ground H-identity 80.5 % and V-identity 56.4 %.** The crop agrees with the number. Nine of
R6's eleven headline claims reproduce on my instruments, several to three decimal places.

The half-point it does not get is one finding, and it is the same shape of finding R5 made:

> **The headline gate was measured with the subject removed.** Every figure on the Criterion
> A/B scoreboard comes from `?nocombat=1` captures. In ordinary play with weapons firing,
> **stage 1 fails Criterion A2 on 34 of 34 frames** (36–98 channel values against ≤32), and in
> the combat demo it reads up to **1 375 colours and 255 channel values** — the same order of
> magnitude R5 found in the sea, relocated to the effects layer. The HUD lane raised this in
> `ask-hud-quantize.md` §4 and **nobody owned it**.

And one that nobody raised at all: **stage 3 fails Criterion B's V-identity gate at 43.8 %**,
on the same four background colours the arcade uses, arranged as per-pixel dither where the
arcade arranges them as flat regions (background-only V-identity **45.5 % against the arcade's
95.4 %**). The world lane's round closed stage 1's sea and did not look at stage 3's ground.

---

## Instrument controls — run before anything was pointed at the build

| control | published | my re-run | result |
|---|---|---|---|
| Criterion A, arcade desert | 138 colours / 31 union / 29 per-channel | **138 / 31 / 29** (per-ch 25/29/26) | exact |
| Criterion A, arcade night | 79 / 17 / 17 | **79 / 17 / 17** | exact |
| Criterion B, desert whole frame −HUD | 68.8 / 68.5 | **68.72 / 68.49** | exact |
| Criterion B, night whole frame −HUD | 84.0 / 80.3 | **83.95 / 80.24** | exact |
| Scale rule: desert ground rows 140–195 | 65.0 / 64.4 | **65.04 / 64.40** | exact |
| Scale rule: night ground rows 140–195 | 78.2 / 72.9 | **78.24 / 72.85** | exact |
| SEA-DASH, t116 foam on REFERENCE's own band | 23.4 % | **23.40 %** | exact |
| SEA-DASH, arcade patch (rows 150–198) | 19.5 % / 389 comps / area max 82 | **20.0 % / 386 / 79** | within 1 % |
| FIRE-MASK verbatim, no exclusions | 17.2 % core / S 0.764 | **17.2 % / 0.764** | exact |
| FIRE-MASK with the three regions | 9.1 % / 0.848 | **9.1 % / 0.848** | exact |
| JET-SIL on arcade t175 | fin band 58 %, two-blade 100 %, extent 35.4–35.7, cant 1.29 | **58 % / 100 % / 35.5 / 1.28** | exact |
| Decile ladder, arcade huge-explosion | `#9b0204 → #d6050b → #f47a07 → #f5d619 → #f6f6e7` (sat 0.063) | **`#9a0204 → #d2050b → #f25807 → #f5d519 → #f6f6e6`** (sat 0.066) | exact |
| VALUE-STAT, arcade desert jet crop | 0.839 / 1.000 / 1.000 / 59.5 % | **0.8392 / 1.000 / 1.000 / 59.5 %** | exact (operator caveat below) |
| `tools/hud_mask.py --selftest` | — | synthetic PASS, live PASS (1 264 px) | PASS |
| my own black/dup/near-dup sweep | — | planted 1 black + 1 dup + 1 near-dup, all found | PASS |

**Every capture set was swept for black frames, byte duplicates and near-duplicates. All 36
sets, 377 frames: 0 black, 0 duplicates, 0 near-duplicates.** Two capture runs failed with a
transient Vite `504 Outdated Optimize Dep` while a probe held a second server; both were re-run
into fresh directories per `lane-world.md` §0.2's rule, and neither partial directory was
measured.

### Three times my own work was wrong, and the controls caught it

1. **My VALUE-STAT grey-ramp known-answer was wrong, not the instrument.** I asserted the ramp
   median would be 0.504; the operator's `V > 0.08` clause drops the darkest 21 entries, so it
   is 0.541. Same class as the HUD lane's own corrected assertion. Fixed and re-run.
2. **My bottom-up horizon fitter failed on 1 of 24 stage-1 frames** — the one carrying a
   frame-spanning cloud bank that touches the top edge, so no 6-row sky run exists above it in
   many columns. It returned row 84 instead of 140 and inflated that frame's Criterion B by 11
   points. **This is the fourth time in this project something white and high-contrast in the
   upper sky has defeated a fit.** I therefore report the **fixed band, rows 140–195**, as the
   primary Criterion B region — it has no fit to fail — and the fitted-horizon reading only as
   a secondary with that frame flagged.
3. **My first carrier A/B was run on a path that never starts the carrier.** It returned
   byte-identical frames and zero carrier pixels on all ten. Bare `?fixed=1` does not run the
   launch sequence (`flow.js`: `playLaunch = params.get('demo') === '1'`). Caught by reading
   the code, not by capture. Re-run under `?demo=1` it reads 8 327–14 620 native pixels.
4. **I misclassified the HUD reticle as an enemy aircraft** while hand-counting arcade frames
   (t103), and only a 5× zoom caught it. See "What nobody has looked at" §4.

---

## Each R6 claim: CONFIRMED / REFUTED / UNVERIFIABLE

### 1. Stage 1 Criterion A/B: 14 344 → 51 colours, 238 → 21 channel values, V-identity 3.3 → 57.8 %, near patch 0.0 → 55.7 % — **CONFIRMED, with the population stated**

24 stage-1 frames, `?fixed=1&seed=1&nocombat=1`, **five tick spacings (97/137/211/300/419)**,
stage read off the HUD digit on every frame, HUD mask derived per run with `hud_mask.py`.

| | gate | R6 claim | **mine (min / median / max)** |
|---|---|---|---|
| unique colours | ≤256 | 51 (max 56) | **46 / 51 / 51** |
| channel values, union | ≤32 | 21 | **21 / 21 / 21** (0 of 24 over) |
| ground band H-identity | ≥50 % | 80.5 | **79.37 / 80.71 / 82.21** |
| ground band V-identity | ≥50 % | 57.8 | **50.77 / 56.44 / 60.77** |
| 280×48 near patch V-identity | ≥50 % | 55.7 | **52.44 / 56.31 / 60.20** |

All four gates pass on every frame. **Carry this caveat with the V figures: the worst frame
clears the 50 % floor by 0.77 points.** It is a pass, not a margin.

Widened to 51 digit-verified stage-1 frames across three more spacings, channel values read 21
on 49 and **26 on two** — both at the stage-3→1 wrap, both still inside the gate.

**Looked at.** `judge-r6-01-sea-nearpatch-ours-TOP-arcade-BOT.png`: ours is chunky flat blocks
with short bright dashes grouped into wave bands; the arcade's same-fraction patch below it has
the same character. This is a real and large closure of R5's gap 0.

### 2. Enemies in the top third 0.01 % → 31.5 %, altitude sd 3.90 → 15.64 — **CONFIRMED in direction and magnitude; my top-third share is 3 points lower**

My own per-tick probe (`__combatStats` + `__flowState`, **every tick**, so the 16.000 s
attract-cycle aliasing trap cannot apply), 3 seeds × 7 200 ticks of
`?fixed=1&demo=1&invincible=1`, 20 970 flight ticks, **266 650 on-screen enemy samples**.

| | committed (R6) | **mine** | arcade (R6 hand count) |
|---|---|---|---|
| all enemies p5 / p50 / p95 %H | 19.2 / 41.6 / 68.0 | **19.1 / 42.0 / 68.0** | 14.1 / 40.0 / 72.8 |
| sd | 15.64 | **15.19** | 19.22 |
| **top third** | 31.46 % | **28.48 %** | 32.5 % |
| readable ≥10 %W, top third | 33.49 % | **30.79 %** | 47.4 % |
| **the player**, p5 / p50 / p95 | — | **44.8 / 54.8 / 62.3**, sd 6.15 | 36.0 / 49.0 / 63.0, sd 8.11 |

The percentiles reproduce almost exactly; my top-third share runs ~3 points under theirs (seed
set, most likely). **The move from 0.01 % to ~29 % is the largest single gameplay change this
round and it is real.**

**The player's own column is the finding inside the finding: 0.00 % of 20 970 flight ticks put
our pilot in the top third of the screen.** The arcade's pilot has p5 36.0 %H. `ask-combat.md`
A1's request for `ENVELOPE_Y 1.1 → 1.9` is justified by my own measurement, not only by the
combat lane's.

### 3. Deaths/min 2.23 wall / 2.85 flight — **CONFIRMED, exactly**

Independently written probe, 7 seeds × 18 000 ticks (300 s), **every tick**, deaths counted as
entries into the `death` state and cross-checked against `lives` decrements (the two agree
exactly on all 7 seeds).

| | R6 claim | **mine** |
|---|---|---|
| deaths / wall seconds | — | **78 / 2 100.0** |
| deaths/min **wall clock** | 2.229 ± 0.252 | **2.229 ± 0.252** |
| deaths/min **flight time** | 2.850 | **2.850** |
| flight share | 78.19 % | **78.20 %** |
| per seed, wall | 2.4 / 2.0 / 2.6 / 2.0 / 1.8 / 2.4 / 2.4 | **identical** |

**The ≤2.0 wall-clock gate is MISSED at 2.229** (0.9 standard errors over). The flight-time
figure **2.850 is inside the arcade's measured 2.78–2.94**. Flight share **78.2 % is above the
arcade's 69.4–73.5 % band** — the combat lane's arithmetic, that restoring `DEATH_TOTAL_S` to
7.8 s would land wall-clock at ~2.08 and flight share at ~73 %, follows from two measured
quantities and I have no quarrel with it.

### 4. Day jet achromatic V median 0.643 → 0.839 (arcade 0.839) — **REFUTED as a like-for-like statement.** The two columns were measured with different operators

This is the most consequential correction in this report, because it is ledger rows 11 and 14
recurring *inside the fix for ledger row 11*.

REFERENCE's VALUE-STAT states step 2 as "keep achromatic pixels only, **S < 0.25**" and does
not state whether a value floor is applied. The sprite lane's V-CENSUS states "**S < 0.35 and
V > 0.08**". Both are faithful readings of their own text. They are different operators, and on
one crop they differ by 0.13 of median. I reproduce all three readings exactly:

| operator | **OURS day** (jet-on/jet-off mask, span 348 px) | **ARCADE native desert jet crop** |
|---|---|---|
| S<0.25, **no V floor** — REFERENCE's published operator | **0.643** | **0.839** ← the band's own anchor |
| S<0.25, V>0.08 | **0.839** | **1.000** |
| S<0.35, V>0.08 — the sprite lane's V-CENSUS | **0.839** | **0.969** |

**Under every one of the three readings, our daylight airframe sits 0.13–0.20 of V below the
arcade's own true-native frame.** The published "ours 0.839 = arcade 0.839" compares our
*floored* reading against the arcade's *unfloored* one. Under REFERENCE's own operator our jet
still reads **0.643** — the same number R5 published for the pre-fix build.

**What did improve, and it is real**: the brightest body colour went **0.773 → 1.000**, so the
band's second clause (brightest body colour ≥ 0.90) is satisfied; share above V 0.80 went
0.0 % → **69.5 %**. The mask dump (`judge-r6-05-player-jet-ours-TOP-arcade-BOT.png`) is clean —
the aircraft and nothing else — and the jet is now unmistakably white. The *median* claim is
the one that does not survive.

**Consequently `ask-sprite-art.md` A2a is REFUTED as stated.** It asks for a ledger row because
"the arcade's native frame reads 0.969, above the band's 0.92 ceiling". Under the band's own
operator the arcade native frame reads **0.839 — dead centre of the 0.78–0.92 band.** The
ceiling is not below the arcade. The real defect is that VALUE-STAT does not state its V floor,
and the ledger row that is owed is that one.

### 5. Fin band 43 % → 58 % of aircraft height — **CONFIRMED in direction; I measure 55 %**

JET-SIL reimplemented from prose; arcade t175 control exact. Ours measured at capture
resolution, span 348 px, above JET-SIL's own ~250 px floor:

| | arcade t175 | R6 claim | **mine** | band |
|---|---|---|---|---|
| fin band, % of H | 58 | 58 | **55** | — |
| two-blade fin rows | 100 % | 100 % day / 95.2 % night | **95.2 %, day AND night** | 99–100 % |
| fin-pair extent, % SPAN | 35.5 | 36.8 | **37.9** | 30–40 |
| cant | 1.28 | 1.25 | **1.25** | ≥1.15 |
| aspect SPAN/H | 3.26 | 3.17 | **3.05** | 3.0–3.6 |

**One correction to the lane's attribution.** It explains the night sheet's 95.2 % two-blade
figure by the measured night palette having no black keyline, so the keyline passes JET-SIL's
`max(RGB) > 30` mask. On a **geometry** mask (jet-on/jet-off difference, which is colour-blind)
**day and night both read 95.2 %**. The shortfall is not uniquely a night-palette artefact;
roughly one fin row in twenty bridges on both sheets. The two readings are different
silhouettes and both should be published rather than the flattering one.

### 6. Stage-3 enemies: 0 procedural fallbacks over 4 800 ticks, 16 sheets — **CONFIRMED, and the zero is properly instrumented**

My own probe of `__spriteSheetStatus()` at ten 600-tick checkpoints out to tick 6 000, spanning
all three stages: **expected 16, loaded 16, failed {}, pending [], proceduralTotal 0** at every
checkpoint, with **zero console errors or warnings**. The positive control
`__spriteSheetSelfTest()` returns `{detected: true, before: 0, after: 1}` — the counter is
live, not stuck. This is how a "measures zero" result should be delivered and I have nothing to
add to it.

### 7. Explosion core 28–32 % → 9.1–12.3 % at mean S 0.824–0.846 — **CONFIRMED**

FIRE-MASK reimplemented from prose; the published control reproduces both ways. Our side:
**every tick through a whole blast**, 160 frames of `?combatexpl=1&noclouds=1&hidejet=1`, three
complete blasts, our-side exclusions derived per run.

| live phases (ignition / bloom / hold) | R6 claim | **mine** | arcade |
|---|---|---|---|
| core % | 9.1–12.3 | **9.1–12.0** (2.9–8.6 during the first 8 ticks, blast still small) | 9.2 |
| mean S | 0.824–0.846 | **0.818–0.853** | 0.846 |
| mean V | 0.859–0.878 | **0.855–0.877** | 0.906 |
| V>0.95 % | 40.7–48.6 | **37.6–48.6** | 54.2 |

**The honest bound the lane published is honest**: V>0.95 is under the ≥45 % gate on most live
frames. The fade exclusion is confirmed — at the last four ticks of each blast `V>0.95` goes to
**0.0 %** and mean S collapses to **0.22–0.55**. The frame that measures "core 100 %" is the
fully-faded sprite; I cropped it (`judge-r6-07-explosion-phases-and-fade.png`) and it is the
alpha ramp, exactly as described.

### 8. HUD: 0 partial-alpha pixels, 21 channel values flat, 1 118/1 118 arcade-consensus pixels — **CONFIRMED**

I did not run the lane's probe. I tested the *consequence* in situ: a partial-alpha HUD pixel
would blend with the world and be neither an authored HUD colour nor a colour occurring
elsewhere in the frame.

- **22 authored HUD colours, and I checked every one against REFERENCE's enumerated Sega
  ladder: all 22 are on it.** Zero off-ladder ink.
- **33 frames across 5 tick spacings and 3 roll angles** (`?debugstick=0, −0.45, +1`): **2
  unexplained HUD-band colours total**, both on one frame whose HUD digit reads **stage 2** —
  consistent with the lane's "rare ground colour occurring nowhere else" explanation. I did not
  independently verify their alpha-0 claim at those coordinates.
- **Arcade consensus** (pixels byte-identical across the two native frames) = 2 478 px =
  **3.46 % of frame**, matching their 3.5 %. Within my own rects, **SCORE 520/520 and HIT
  196/196 match the arcade byte for byte — 716 of 716.** I did not test the throttle widget,
  which needs their fill-fraction harness.

### 9. Score no longer reset on continue; barrel roll drawn; carrier present at launch — **ALL THREE CONFIRMED**

- **Score**: 4 continue episodes on one 300 s seed. Score unchanged across the card with
  **drift exactly 0** through it, lives 0 → 3. Arcade side read independently off
  `reference/continue-card-gp-t261.png`: **SCORE 489540, HIT 4** displayed on the CONTINUE PLAY
  card itself. Fourth independent reading; it agrees.
- **Barrel roll**: 130 rolling ticks over 2 400 (two rolls at ~1.08 s each), `poseSource`
  `sheet-roll` on **every** rolling tick, `spriteRotationDeg` **0** throughout, `rollPhase`
  0.015 → 0.985, returning to `sheet-day` outside, 0 page errors.
  `judge-r6-08-barrel-roll-phases.png` shows level → banked → inverted with the blue-violet
  belly → edge-on → recovery. A spun astern bitmap cannot do that.
- **Carrier**: A/B against `?nocarrier=1` at the same seed and ticks under `?demo=1`.
  **8 327 → 14 620 native pixels differ** through the overfly, gone by tick 198. The carrier is
  present and framed on the horizon with the jet on its bow. **It is also much simpler than the
  arcade's** (`judge-r6-06-carrier-ours-TOP-arcade-BOT.png`): ours is a deck, a hull, a block
  island and one antenna against the arcade's angled deck, detailed island with radar mast, two
  groups of parked aircraft, deck markings, hull number and bow wave.

---

## Audit of the criteria work — this is where the round's defects are

### Row 18 — "Criteria A and B can be laundered by a degenerate structure" — **CONFIRMED, independently, as a mechanism.** The lead asked for this one specifically

I cannot revert `src/` to re-measure the slab build, so I tested the *claim* rather than the
artefact: I constructed a synthetic palettized field of a few enormous flat slabs, built to
row 18's description, and ran both criteria and SEA-DASH on it.

| synthetic degenerate slab field | result | gate |
|---|---|---|
| unique colours | **4** | ≤256 ✓ |
| channel values, union | **7** | ≤32 ✓ |
| H-identity | **99.8 %** | ≥50 ✓ — and **31 points above the arcade's own 68.7 %** |
| V-identity | **68.5 %** | ≥50 ✓ |
| SEA-DASH: components / max width / max area | **2 / 280 px / 6 720 px** | ≥300 / ≤60 / ≤200 ✗✗✗ |

**Criteria A and B pass by a wide margin on a structure that is nothing like the arcade, and
H-identity moves in the wrong direction as the structure degenerates.** The gate my predecessor
discovered and made the headline is weaker than it looked; the narrowing is correct; the
pairing rule is the right fix; and a ceiling is indeed not available, because the arcade's own
two native frames sit at 68.5 % and 80.3 %. The lane's own before/after figures (H-identity
89.3 % on the slab build, largest component 2 194 px) are consistent with my synthetic result
and with the crop (`world-02-sea-nearpatch-BEFORE-ours-TOP-arcade-BOT.png`), which I looked at.

**I agree with the retirement and I would go one step further than the lane did**: the same
argument applies to *any* region average in this document, not only to A and B. Stage 3 below
is the worked example — it passes Criterion A on four background colours and fails Criterion B
on how they are arranged.

### But SEA-DASH, the paired criterion published as the fix, is itself under-specified — **NEW**

The published block names "a 280×48 native near-field patch" and **does not name the patch's
rows**. The R5 judge used rows 150–198, 160–208 and 170–218 interchangeably. The tool defaults
to 150–198. Same frame, same operator, sweeping only the row offset:

| patch rows | | foam % | **count** | w p90 | w max | h max | **area max** |
|---|---|---|---|---|---|---|---|
| 150–198 | **ours** | 18.05 | **425** ✓ | 8 ✓ | 44 ✓ | 13 ✓ | **125** ✓ |
| | arcade | 20.02 | 386 | 10 | 28 | 9 | 79 |
| 160–208 | **ours** | 20.62 | **287** ✗ | 11 ✓ | 44 ✓ | 14 ✓ | **233** ✗ |
| | arcade | 19.62 | 410 | 8 | 27 | 12 | 84 |
| 170–218 | **ours** | 23.64 | **210** ✗ | 14 ✗ | 44 ✓ | 14 ✓ | **243** ✗ |
| | arcade | 20.89 | 455 | 7 | 40 | 12 | 127 |

**At the lane's own patch our build passes and I reproduce their numbers to the digit** — my
independent implementation and `tools/measure_sea_dashes.py` agree exactly on that row (foam
18.05 vs 18.1, 425 comps both, w p90 8 both, w max 44 both, area max 125 both). **Twenty rows
lower it fails `count ≥ 300` and `area max ≤ 200`, while the arcade does not move** (386 → 455
comps, area max 79 → 127). The underlying fact is real and is not an operator artefact: **our
dash field coarsens with depth far faster than the arcade's.** The criterion published this
round as the cure for an under-specified gate has the same disease, one section later.

### Row 19 — FIRE-MASK's exclusion regions — **CONFIRMED on a fourth implementation**

Verbatim **17.2 % core / mean S 0.764**; with the three regions **9.1 % / 0.848** against the
published 9.2 / 0.846. The detector the round extracted from this — *two independent
implementations missing a published control in the same direction are evidence of an
under-specified operator, not of two bugs* — now has a fourth data point: R5 13.2, combat 18.2,
criteria 17.2, **mine 17.2**. All high, none agreeing with the control. The detector is the
most valuable thing R6 produced and it is correctly placed above the ledger.

### Row 20 — brightest-decile saturation, dropped as "a false negative by construction" — **the drop is defensible, the published reason is REFUTED**

The criterion text says "brightest-decile saturation ≤ 0.30" and names neither the mask, the
ranking, nor whether it means the mean of the per-pixel saturations or the saturation of the
decile's mean colour. There are two operators in play and each is reproducible:

| operator | **ours** | **arcade huge-explosion** |
|---|---|---|
| FIRE-MASK component, ranked by V, mean of per-pixel saturations | **0.947–0.960** ✗ | **0.632** ✗ |
| **not-sky largest component, ranked by R+G+B** — the operator the published ladder was taken with | **`#f6f6e7`, sat 0.061** ✓ | **`#f6f6e6`, sat 0.066** ✓ |

I reproduce REFERENCE's published five-step ladder on the arcade frame exactly under the second
operator (`#9a0204 → #d2050b → #f25807 → #f5d519 → #f6f6e6`, sat 0.066 against the published
0.063). **Under that operator — the one the criterion's own numbers came from — our build reads
0.061 against the arcade's 0.066. It passes the gate with enormous margin and matches the
arcade's brightest-decile colour to a level.**

The 0.952 that justified dropping the gate comes from the *other* operator, under which **the
arcade fails it too, at 0.632.** So the gate is not "a false negative by construction on our
palette"; it is **under-specified**, and it was dropped on a figure its own operator cannot
produce — ledger row 19's exact defect, one row later. Dropping an under-specified criterion is
a defensible outcome; the published reason is wrong and should be restated. There is also a win
nobody claimed: under the published operator our fireball's decile ladder lands on the arcade's.

### Row 10 — the ≥3:1 HUD contrast criterion — **CONFIRMED on the arcade's own native frames**

My own ring/field operator (1–4 px annulus and 6–12 px field, chebyshev dilation, sRGB relative
luminance), on the red STAGE ink of the two true-native frames:

| | ring | field | ≥3:1 |
|---|---|---|---|
| arcade desert, **stage 2** (n = 125 px) | **2.05** | **2.05** | **FAILS** |
| arcade night, stage 3 (n = 129 px) | 4.95 | 4.95 | passes |

The arcade fails its own criterion on its own red ink on stage 2, reproducing the published
2.12 / 1.89. **The retirement is correct.** (My cream-digit mask on the desert frame returned
911 px for a 7×7 glyph — it was selecting tan terrain, so I discard that reading rather than
publish it.)

### Rows I could not re-check — stated, not omitted

- **Rows 11 and 12's stage attribution** — I confirmed `ab2-arcade-desert.png` is stage 2 from
  its own HUD digit, which is the load-bearing half, but **I did not re-measure the stage-1
  enemy polarity figures** (row 12's replacement gate).
- **Rows 16 and 17** (the decorrelation band and the anisotropy restatement) — I confirm the
  symptom they were retired for (see "What nobody has looked at" §6) but did not re-derive the
  arcade-side band.
- **Rows 4, 5, 9, 13, 14, 15** — not re-measured. No opinion.

---

## What nobody has looked at

### 1. Criterion A is measured with the subject removed, and in ordinary play it fails by the same order of magnitude R5 found

`ask-hud-quantize.md` §4 raised this. No lane owned it and it is in no gap list.

34 digit-verified stage-1 play frames across five tick spacings, plus 15 more at seed 3 across
three spacings:

| | gate | `?nocombat=1` | **ordinary play** | **`?demo=2`** |
|---|---|---|---|---|
| unique colours | ≤256 | 46–51 | **63–99** | **54–1 375** |
| channel values, union | ≤32 | **21** | **36–98, median 55** | **28–255, median 230** |
| frames over the A2 gate | 0 | **0 of 24** | **34 of 34** | **10 of 12** |

**Attributed by subsystem**, six frames each at `--every 97`:

| population | colours (min/med/max) | channel values | explosion-palette colours present |
|---|---|---|---|
| `?nocombat=1` | 46 / 51 / 51 | **21 / 21 / 21** ✓ | 0 |
| `?combatonly=enemies` | 59 / 59 / 64 | 27 / 30 / 30 ✓ | 0 |
| `?combatonly=enemies,shots` | 65 / 70 / 84 | **44 / 54 / 70** ✗ | **0** |
| `?combatexpl=1` | 46 / 337 / 385 | **21 / 218 / 227** ✗ | 4 |

Split by region, the ground is **13 channel values with combat on or off** — the world lane's
figure is exactly right and its work is not implicated. The entire residual is in the sky band
(8–13 → 25–96).

**I cropped and looked** (`judge-r6-02-criterionA-nocombat-LEFT-combat-RIGHT.png`). The
1 375-colour frame is an ordinary kill: one fireball, one smoke billow, the player, two
enemies, lock brackets. It is not a death frame and REFERENCE's representative-frame exemption
does not cover it. The mechanism is the one the world lane just removed from `clouds.js` — a
soft alpha perimeter generating a fresh continuum at every edge — present in
`effects/smoke.js`, `effects/explosions.js` and (see below) the enemy-shot sprites.

### 2. Stage 3 fails Criterion B's V-identity gate, and the palette is already correct

47 digit-verified stage-3 frames across three spacings, `?nocombat=1`:

| stage | colours | channel values | band H-identity | **band V-identity** | over the A2 gate |
|---|---|---|---|---|---|
| 1 | 46–51 | **21–26** ✓ | 78.5–82.2 ✓ | 50.8–60.9 ✓ | 0 of 51 |
| 2 | 55–66 | **32–36, median 33** ✗ | 79.7–85.1 ✓ | 61.2–69.9 ✓ | **41 of 43** |
| 3 | 41–54 | 25–32 ✓ | 60.3–71.7 ✓ | **39.3–55.0, median 43.8** ✗ | 0 of 47 |

On a matched 260×40 ground patch against the arcade's native night frame:

| | non-light share | **distinct background colours** | **background-only V-identity** |
|---|---|---|---|
| **ours, stage 3** | 96.1 % | **4** | **45.5 %** |
| **arcade, native night** | 80.6 % | **4** | **95.4 %** |

**Both sides use exactly four background colours. The arcade arranges them into flat regions;
ours dithers them pixel by pixel.** The palette work is done and the arrangement is not — which
is row 18's lesson applied to a stage nobody looked at, and Criterion A cannot see it, which is
exactly why stage 3 "passes" A and fails B.
`judge-r6-03-stage3-ground-ours-TOP-arcade-BOT.png`: the arcade's lights are denser and
clustered into short runs over flat black; ours are isolated single pixels over a mottled
dark-blue field. Stage 2's residual is where the world lane said it is — the horizon glow band,
27 channel values against the ground's 13 — but at **33, not the 41–43 they published**; their
figure predates the HUD lane's reticle fix and does not reproduce on the committed tree.

### 3. The arcade DOES have the nose sight square, and two lanes nearly retired it

`ask-flow.md` A1 and `lane-criteria.md`'s addendum both conclude, from four and sixteen frames
respectively, that GAME_SPEC §3 element 1 does not exist. `lane-combat.md` §7.2 says it does.
**Combat is right**, and I confirmed it on a sample neither of them used.

`judge-r6-04-arcade-nose-sight-exists.png`. In the stage-4 burst t201.4 → t202.4 (six frames at
0.2 s, **no enemies on screen in any of them**) a small four-corner dashed box, **empty**, holds
station up and ahead of the nose while the jet crosses a third of the frame. And — the part
neither lane found — **it is there on stage 1 too**: `t109`, hard bank, no enemies, clear sky,
the same empty four-corner box above the nose.

Measured on the clean flat-sky instance at t201.4: **11 × 11 video px = 1.60 %W.** Our
`SIGHT_PX = 10` of 320 = **3.1 %W — roughly twice the arcade's.** (The combat lane eyeballed
13 × 13 = 1.9 %W; same neighbourhood.) The vertical offset reads ~7–10 %H above the airframe
against our 15 %H, but the jet is banked in the frames where the box is cleanest, so I publish
that as eyeballed and not as a retune target.

**A MEASURED element that exists was within one decision of being retired on absence of
evidence from sixteen frames.** It is faint, low-contrast against both the blue and the teal
skies, and absent in the climb-out (t91/t92, which is where the flow lane looked).

### 4. A contaminant class for the arcade enemy-altitude count, found by misclassifying it myself

The combat lane's altitude distribution is **one lane's hand count, and the bar it set for
itself was an independent re-count. I attempted one and could not reach a usable sample size**,
and I would rather say so than publish a thin number.

13 frames on a fixed grid over STAGE_MAP-verified spans of stages 1, 7 and 19, each read at
1.4× with a 10 %H ruler. The longplay pilot kills enemies fast, so five stage-1 frames yielded
**two** confident enemy observations; the stage-7 and stage-19 frames are over dense terrain
where aircraft-vs-ground identification is genuinely ambiguous — the lane's own stated weakness
(c). My confident observations number **six**, spanning 39–79 %H with 0 in the top third. That
is not evidence against 32.5 %; it is evidence that the figure still has not had its re-count.
**This section is explicitly incomplete and the gap list carries it as an open item.**

**What the attempt did produce is a named contaminant.** At t103 I recorded "an enemy at
16 %H, span 11 %W" — inside the top third and readable-size, the single most influential kind
of observation for the headline. At 5× it is **the fixed upper-right reticle's status dot and
its rotating dashed attitude line**. I was wrong, the zoom caught it, and CLAUDE.md names this
exact failure. Any re-counter must exclude the upper-right reticle explicitly; the lane's
published operator does not say to.

### 5. The far-LOD decline — the reason HOLDS

- `DETAIL_SWITCH_NATIVE_PX = 10`. **38.8 % of 266 650 on-screen enemy observations are below
  it**, so the far sprite carries a lot of screen time — but at ≤10 native px it is ≤3.1 %W and
  the four silhouette criteria are not measurable there.
- The gap's own reproduction is specified at **≥15 %W ≈ 48 native px**, and only **11.9 %** of
  observations reach that — all of them on authored sheets.
- `enemySprite.js`'s header records the measured bug the alternative reintroduces (27 of 80
  frames of one approach rendering zero pixels).

**The decline is correct, and the lane fixed a better defect than the one it was asked to fix**
— the far path carried a second, already-drifted copy of the livery palette, now generated from
one source. Because 38.8 % of enemy screen time is on that sprite, its *colour* matters even
though its silhouette does not.

### 6. Sea anisotropy — the sign disagreement is real, and the value-spread figure does not reconcile

`tools/measure_sea_acf.py --selftest` passes against all seven published arcade figures. On my
own five stage-1 nocombat frames at `e8fed58`:

| | mine | lane | arcade |
|---|---|---|---|
| horizontal decorrelation, native texels | **12.47** (7.2–23.8) | 11.6 | — (band retired) |
| ratio, **native** | **4.85** | 4.56 | — |
| ratio, **common 686×480** | **3.18×** (hx 8.32, hy 2.62) | 3.04× | 5.21× (hx 41.63) |

**Confirmed: the two readings move in opposite directions against R5's 4.95×.** Rows 16 and
17's retirements are justified by exactly this, and reporting both rather than the flattering
one was the right call.

**One figure I cannot reconcile**: the lane reports value p5–p95 spread **0.290** ("close but
under" the arcade's 0.302–0.329). I measure **0.259–0.451 across five frames, median 0.451** —
*over* the arcade's range by 37 %, and taking only two distinct values across the five, which
suggests the tool's auto-patch selection moves between frames. One operator, three answers, and
nobody has pinned which patch it should be reading.

---

## Cross-checks against the art critic

Relayed to me by the lead after I had finished measuring. I re-ran each on my own instruments
and **adopted none of them**.

### A. "The gap did not close by half — it closed completely in one place and relocated" — **AGREED on the mechanism, and my figures are harsher**

The critic reports stage-1 frames at 51–67 colours / 28–39 channel values until a missile
connects, then 546–889 / 244–255; and an explosion frame at native reading 366 / 225.

My independent figures agree on direction and magnitude — `?combatexpl=1` reads 46–385 colours
and 21–227 channel values, `?demo=2` up to 1 375 / 255 — and the crop agrees that the explosion
is composited in continuous tone and decays by dissolving to transparency (my per-tick run
shows the last four ticks of every blast at `V>0.95` = 0.0 % and mean S 0.22–0.55, which is the
pale/lavender fade the critic describes).

**Where I am harsher: "28–39 channel values right up to the moment a missile connects" is
already a failure.** The gate is ≤32, and **34 of 34** of my ordinary-play stage-1 frames are
over it at **36–98, median 55**. Frames with no explosion in them do not pass.

**One correction to the critic's reading of the holes.** It treats the fireball being "punched
through with holes of literal sky" as a defect. `explosions.js` records a measurement of the
arcade's own fireball: **20.0 % of the silhouette's interior is not fire, and 51.4 % of those
pixels read as sky.** Ours is at ~8 %, i.e. **under** the arcade. The perforation is
arcade-correct; the continuous tone is not. Do not let a fix for one remove the other.

### B. "Exactly one object is still composited in continuous tone: explosions" — **REFUTED. There are at least two, and the second is the enemy shots**

This is the finding I most want the lead to see, because it changes the R7 instruction from
"fix one object" to "fix a class", which is what the critic's own framing asked for.

By subtraction, six frames per arm, same seed and spacing:

| arm | colours | channel values | explosion-palette colours present |
|---|---|---|---|
| `?combatonly=enemies` | 59–64 | **27–30** ✓ | **0** |
| `?combatonly=enemies,shots` | 65–84 | **44–70** ✗ | **0** |

**The shots arm contains no explosion — zero pixels of our measured explosion palette — and it
fails the gate by up to 38 channel values.** I localised the residual by differencing the two
arms: **17 pixels** carry colours absent from the enemies-only arm, in a bbox at native rows
55–112, cols 143–164. I cropped and looked: it is the **enemy shot projectile and its muzzle
flare** (`weapons/enemyShots.js` / `projectileSprites.js`). Seventeen pixels move the frame's
channel-value cardinality by 17–29, which is the "a set cardinality moves as much for one pixel
as for a thousand" property the world lane flagged.

So the audit-by-class is the right idea and its answer is **at least two objects, not one**. I
agree with the critic that clouds, the sea, all three grounds and the HUD measure clean — my
own numbers say so independently. I did not isolate the missile trail (`?combattrail=1` fires
only on input, so a `?fixed=1` capture contains no trail at all — a known trap) and therefore
**cannot confirm or refute the critic's clean reading of it.** That one is UNVERIFIED on my side.

### C. SEA-DASH largest bright component 34–95 px against the arcade's 82 — **PARTIALLY AGREED, and it is the patch problem again**

I measure area max **125** at the tool's default patch (rows 150–198) against the arcade's 79,
and **233–304** at rows 160–208 against the arcade's 84. The critic's 34–95 is a third answer.
Three measurements, three patches, no published patch. This strengthens gap 3 rather than
settling it: **the honest statement is that nobody can currently reproduce anyone else's
SEA-DASH number, because the criterion does not say where to point it.**

### D. The title "II" overturning R5 — **UNVERIFIED**

I did not measure the title screen at all this round. No opinion.

---

## Scorecard

| # | Dimension | R4 | R5 | **R6** | Evidence |
|---|---|---|---|---|---|
| 1 | Composition & camera | 7 | 7.5 | **7.5** | Horizon fitted at native row 140 = 62.50 %H on every frame; sky modal `#009fff`. Carrier in the launch, framed on four landmarks. Costed: the carrier's art is far simpler than the arcade's. |
| 2 | Palette & sky/ground | 6 | 6 | **8** | **Up two.** Stage 1 passes all four A/B readings on every frame of five spacings (46–51 / 21 / 80.7 / 56.4) and the crop agrees. Explosion core 9.1–12.0 % at S 0.82–0.85 vs 9.2 / 0.846. Costed: **ordinary combat fails A2 on 34 of 34**, **stage 3 fails Criterion B's V gate at 43.8 %**, stage 2 fails A2 at 33. |
| 3 | Motion & sense of speed | 7 | 7 | **7** | No speed claim from sub-60 Hz stills. Nothing targeted it; throttle→closure built, measured, shipped inert with its cost published. Carried. |
| 4 | Player envelope & controls | 7 | 7.5 | **8** | Brightest body colour 0.773 → **1.000**, share above V 0.80 0 % → **69.5 %**, fin band 43 % → **55 %**, barrel roll drawn and verified over 26 ticks per roll. Costed: **the V-median claim is an operator mismatch and ours is 0.13–0.20 below the arcade under every consistent reading**; two-blade 95.2 % on both sheets; the pilot reaches the top third 0.00 % of the time. |
| 5 | Gameplay systems | 7 | 7.5 | **8** | Enemies in the top third 0.01 % → **28.5 %** (arcade 32.5 %), sd 3.90 → **15.19**. Deaths/min **2.229 wall / 2.850 flight**, the latter inside the arcade band. Score/HIT/stage survive the continue on 4 episodes. 16 sheets, 0 fallbacks, instrumented. Costed: wall gate missed at 2.229; 3 of 23 stages of content; flight share 78.2 % above band. |
| 6 | Arcade presentation | 7 | 8 | **8.5** | All 22 HUD colours on the Sega ladder; 0 unexplained HUD-band colours over 33 frames at 5 spacings and 3 roll angles; 716/716 arcade-consensus emblem pixels byte-exact. Costed: title letterforms still upright and flat; no attract demo; **our nose sight square is ~2× the arcade's**. |

---

## Ranked gaps for Round 7

### 1. Criterion A fails in ordinary play, and it is a CLASS with at least two members
The world lane removed `clouds.js`'s soft alpha perimeter this round and gained the whole
Criterion A pass. The same compositing survives in **`effects/explosions.js` (dominant)** and
**`weapons/enemyShots.js` / `projectileSprites.js` (second, and enough on its own to fail the
gate)**.
**Reproduction to satisfy**: on digit-verified stage-1 frames captured in ordinary play
(`?fixed=1&seed=N&invincible=1`) at **≥3 tick spacings**, **≤256 unique colours and ≤32 channel
values (union) on every frame**, *and* each isolation arm passing the same gate on its own:
`?combatonly=enemies,shots` and `?combatexpl=1`. Ours: play 63–99 / **36–98**; shots arm 65–84 /
**44–70** with zero explosion pixels in it; expl arm 46–385 / **21–227**. Arcade 138 / 31.
**Audit the class, not the object**: for every composited element, assert its rendered pixels
are a subset of its authored palette, the way `hud_palette_probe.mjs` already does for the HUD.
**And amend the scoreboard**: every row of REFERENCE's Criterion A/B table is a `?nocombat=1`
figure and does not say so. A gate stated without its population is ledger row 15 in a new place.

### 2. Stage 3's night ground is dithered where the arcade is flat
**Reproduction to satisfy**: a digit-verified stage-3 frame reads **≥50 % V-identity** on the
ground band rows 140–195 minus the HUD mask, with the **background-only** V-identity (pixels at
V < 0.25) **≥ 85 %**. Ours: band V **43.8 %** median, background-only **45.5 %**; the arcade's
native night frame reads **72.0 %** and **95.4 %** on the same operator and the same four
background colours. The palette is already right — this is arrangement, and the lever is the
one that worked on stage 1's sea.

### 3. Publish SEA-DASH's patch, and close the depth coarsening it exposes
Three reviewers now have three different largest-component figures (34–95, 125, 233–304)
because the criterion does not name its rows.
**Reproduction to satisfy**: SEA-DASH passes at **all three** of the near-patch row offsets the
R5 judge used interchangeably (150–198, 160–208, 170–218), with the chosen offset written into
REFERENCE.md. Ours passes at 150–198 and fails `count ≥ 300` and `area max ≤ 200` at the other
two; the arcade passes at all three. Documentation fix *and* a real art gap.

### 4. The player airframe is 0.13–0.20 of V below the arcade under every consistent reading
**Criteria work first**: VALUE-STAT must state whether a V floor is applied, because the
published anchor (0.839) and the sprite lane's measurement (0.839) were taken with different
ones. Then **reproduction to satisfy**: our daylight airframe and the arcade's native desert
crop measured **with one operator**, our median within 0.05 of the arcade's. Ours 0.643 / 0.839
/ 0.839 against the arcade's 0.839 / 1.000 / 0.969 on the three readings. The lever is role
*area*: the keyline and shadow tones carry too much of the sprite.
**Also correct the gap-7 text "wings need anhedral"** — the sprite lane measured the arcade's
wing top edge *rising* 9.2 %H outboard; the gap text inverts it.

### 5. Restore `DEATH_TOTAL_S` toward 7.8 s; raise `ENVELOPE_Y`
Two one-line changes that close two measured gaps at once.
**Reproduction to satisfy**: deaths/min of wall clock **≤2.0** over ≥7 seeds × 300 s with
rounds/min not falling, and flight share inside the arcade's **69.4–73.5 %**. Ours 2.229 and
78.2 %. Separately, **our pilot occupies the top third of the screen 0.00 % of 20 970 flight
ticks** against an arcade pilot whose p5 is 36.0 %H; the readable-enemy top-third residual
(30.8 % against 47.4 %) is entirely the clamp `ENVELOPE_Y` forces.

### 6. Restate ledger row 20, and name the operator
**Under the operator the published ladder was actually taken with, our fireball reads
brightest-decile saturation 0.061 against the arcade's 0.066 — it passes, and matches.** Under
the FIRE-MASK/V-ranked reading the **arcade fails too, at 0.632**. The criterion is
under-specified, not a false negative; dropping it is fine, the stated reason is wrong, and the
ladder match is a win nobody claimed. Same treatment for `ask-sprite-art.md` A2a, which asks
for a ledger row on a comparison between two operators.

### 7. GAME_SPEC §3 element 1 is REAL — record that it was checked, and resize ours
Write into GAME_SPEC that the nose sight was examined in R6 over 16 + 22 + 13 frames by three
reviewers and **found**, citing the stage-4 zero-enemy burst and the stage-1 t109 frame, so the
next reader does not re-open it. Then **reproduction to satisfy**: our sight square
**1.4–1.8 %W on a side** against the arcade's measured 1.60 %W (11 × 11 video px at t201.4).
Ours is 3.1 %W. The vertical offset wants a proper measurement on a level-flight zero-enemy
frame before anyone moves `SIGHT_NDC_Y_OFFSET`.

### 8. The arcade enemy-altitude distribution still has not been re-counted
**Reproduction to satisfy**: an independent hand count of ≥60 enemy observations over ≥40
stage-verified frames by someone who did not produce the first one, agreeing with 32.5 %
top-third to within 10 points. My own attempt reached six confident observations and is
published as a failed attempt, not a number. **Add one exclusion to the published operator**:
the fixed upper-right reticle's status dot and attitude line read as a small aircraft at
~16 %H and 11 %W at 1.4× zoom. I misclassified it myself.

### 9. Stage 2 still fails Criterion A2, in the sky glow
33 channel values (median over 43 frames, three spacings) against ≤32, residual located in the
horizon band at 27 against the ground's 13. The world lane's published 41–43 does not reproduce
on the committed tree — it predates the HUD reticle fix. One rung is an authored ladder colour
the HUD lane correctly declined to move; the rest is `sky.js`'s glow posterisation.

### 10. The carrier's art, and the title letterforms
The carrier is present, correctly framed and measured on four landmarks — and it is a grey
wedge with one box beside the arcade's detailed ship. The flow lane says so itself and offers
the placement maths for whoever takes it over. Title layout and colour land; letterforms are
still upright and flat against the arcade's italic, angular, bevelled forms; no attract demo.
(The art critic reports a title "II" measurement overturning R5; **I did not measure the title
and have no opinion on it.**)

### 11. Content: 3 of 23 stages
Structure now runs all 23 measured durations; `STAGES` has three entries, so palettes lap every
three while structure laps every 23. No resupply, no canyon stages, no landmasses or islands.
The largest remaining gap a player feels, unchanged in substance since R4.

---

## Evidence index

All under `judging/R6/judge-evidence/`. Ours **LEFT/TOP**, arcade **RIGHT/BOTTOM**, labelled
in-image.

| file | what it shows |
|---|---|
| `judge-r6-01-sea-nearpatch-ours-TOP-arcade-BOT.png` | Stage-1 near patch, ours over t116 at the same screen fraction. R5's gap 0 closed. |
| `judge-r6-02-criterionA-nocombat-LEFT-combat-RIGHT.png` | **The most important image in this report.** 51 colours / 21 channel values with combat off; 1 375 / 248 on an ordinary kill. The gate's population. |
| `judge-r6-03-stage3-ground-ours-TOP-arcade-BOT.png` | Stage-3 night ground. Same four background colours; ours dithered at 45.5 % background V-identity, the arcade flat at 95.4 %. |
| `judge-r6-04-arcade-nose-sight-exists.png` | The arcade's nose sight square, empty, in zero-enemy frames across stages 4 and 1. The element two lanes concluded does not exist. |
| `judge-r6-05-player-jet-ours-TOP-arcade-BOT.png` | Our day jet (difference mask, span 348 px) against t175 at matched span. |
| `judge-r6-06-carrier-ours-TOP-arcade-BOT.png` | The carrier overfly against `carrier-prelaunch-t84.png`. Present and framed; far simpler. |
| `judge-r6-07-explosion-phases-and-fade.png` | Blast ticks 12/35/36/38/39. The "core 100 %" frame is the alpha fade. |
| `judge-r6-08-barrel-roll-phases.png` | Eight phases of the drawn barrel roll, belly visible at mid-roll. |

**Captures**, all under `tools/out/judge-r6/`: `boot, hudmask, s1-nc-{97,137,211,300,419},
s1-play-{97,137,211,300,419}, s1-play3-{113,197,283b}, walk-nc-{97,137,211}, demo2, expl-live,
expl-tick, iso-{combatonlyenemies,combatonlyenemiesshots,combattrail1,combatexpl1},
jet-on/off-{600,4500}, hud-roll-{p1,n045}, launch, launch2, launch*-nocarrier, roll`.
**36 sets, 377 frames: 0 black, 0 duplicates, 0 near-duplicates. No capture reported a page
error on a measured set.**

**Completeness — what this report does NOT cover.** I did not re-measure ledger rows 4, 5, 9,
13, 14 or 15, or row 12's stage-1 enemy polarity figures. My arcade enemy-altitude re-count
reached six confident observations and is published as a failed attempt with its contaminant,
not as a number (gap 8). I did not test the HUD throttle widget against the arcade consensus
(it needs the HUD lane's fill-fraction harness) or independently verify the alpha-0 claim
behind the two residual stage-2 pixels. I did not measure the title screen, the missile trail
in isolation, or audio. Everything else here is a figure I produced.

---

## Recommendation

**Send back, and the send-back is narrower than R5's.** R5's verdict rested on a defect that
made the whole screen wrong. R6 fixed that, and I checked it myself across five tick spacings
and looked at the crops. The build now reads as a 1987 arcade game in a still frame, which it
did not in R5.

**Three things to do first, in this order.**

1. **State the population on the Criterion A/B scoreboard, then fix the compositing class.**
   The round's headline number is true of `?nocombat=1` and false of the game. The art critic
   is right that the defect relocated rather than halved, and right that the audit should be by
   class — but the class has **at least two members**, not one: explosions dominate and the
   enemy shots fail the gate on their own. The fix is the one `clouds.js` already got, applied
   to every composited element, with a per-element palette-subset assertion to prove it.
2. **Point the criteria lane at its own two newest rows.** Row 20 was dropped on a figure its
   own operator cannot produce, and SEA-DASH — published this round as the cure for an
   under-specified gate — does not state its patch, which is why three reviewers now have three
   different numbers for it. Both are the house defect class occurring inside the work that
   named it. A control run at two parameter settings would have caught both.
3. **Put stage 3's ground on the gap list.** It fails a published gate, the palette is already
   correct, the lever is the one that worked on stage 1, and nobody looked at it this round
   because the round was scoped to stage 1.

**One note on method, offered without blame.** What nearly cost this round a real HUD element
was not a bad operator — it was **four frames, then sixteen frames, concluding absence.** Two
lanes reached the same wrong answer independently, which is normally this project's strongest
evidence pattern and here was two draws from the same biased sample. The lane that got it right
did one thing differently: it chose its frames **by a rule written before the question was
asked** (every zero-enemy frame in a pre-existing labelled set) rather than picking frames it
expected to be informative. That is the generalisable lesson, and it is the same shape as the
population rule the ledger already has: *for a negative claim, the sample selection is the
whole measurement.*

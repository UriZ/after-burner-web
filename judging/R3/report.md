# Judge Round 3 — three.js After Burner rebuild vs arcade AB2

**Date**: 2026-10-03
**Build judged**: `9fc88cb` (+ tools-only `e8724f5`), working tree as found.
**Yardstick**: "Does this look, feel, and play like the 1987 arcade original?"

## Verdict

**FAIL as a fidelity gate — overall 6/10** (R1: 3/10, R2: 4/10).

This is the round the world started working. R2's three headline defects are all
genuinely dead, and I could not make any of them come back:

- **The ground moves, and it moves at the modelled rate.** R2 measured 0 cells of
  displacement at r = 0.99 pinned on lag 0. I now measure lag-0 correlation in
  **−0.347 … +0.261, mean |lag-0| 0.128** across 48 pair-measurements (2 estimators ×
  2 frame gaps), with only 2 of 48 exceeding |0.30|, and a full-pipeline control at
  0.1× scroll speed recovers the predicted shift in **9 of 9** consecutive pairs
  (measured 0.450–0.485 against a 0.4595 prediction, clean unimodal peaks).
- **The haze band follows the rolled horizon.** De-rotating each frame by its own roll
  puts the band at perpendicular bins **147–159 at every roll angle from 0° to 66.5°**,
  thickness 12–13 bins throughout. R2's floating horizontal stripe is gone.
- **The jet stays on screen through a full bank.** **100–101.4%** of the neutral
  sprite's pixels are visible at every point of a 70-frame full-deflection ramp, no
  frame touches an edge, and jet-bank/world-roll holds **0.783–0.788** at saturation (0.71–0.79 across the ramp).

The sea is the round's quiet triumph: at matched native-texel scale its second-order
statistics are a closer match to t116 than I expected going in (details below).

It still is not After Burner II, for three reasons a player would notice in the first
two seconds, plus one they would notice in the first thirty:

1. **The player's aircraft does not read as an F-14.** It is two enormous dark grey
   slabs over flat white planks — silhouette aspect **1.35:1** against the arcade's
   **2.70:1** — exactly half — with a fin region **28.8%** of max width against the
   arcade's **16.1%**.
   `cmp-04` is the whole problem in one image.
2. **The HUD lettering is illegible.** "SCORE" and "HIT" render as red bars containing
   white blobs. The emblem *widths* are correct to 4.9%; the words cannot be read.
3. **Combat is sparse at readable size.** Over 18 s of `?demo=2`, the median frame's
   largest enemy spans **2.0%W** (6 native px) and only **15%** of frames contain an
   enemy at ≥10%W. "4–6 enemies visible" is satisfied by counting dots.
4. **Everything outside the flight loop is still absent** — no title/attract, no audio,
   no stage progression or stage-end tally, no death/respawn/continue, no barrel roll,
   no resupply, no score accrual.

## How this was measured (instruments + positive controls)

Every operator below was reimplemented from REFERENCE.md / GAME_SPEC.md prose and
validated against published arcade values *before* being pointed at our build. Two of
my own instruments failed their controls and were discarded; both failures are recorded
because each would have produced a confident wrong verdict.

| control | published | my re-run | result |
|---|---|---|---|
| t175 jet fin height, 30%/50%-of-max-span thresholds | 56–58% of silhouette | **55.7% / 58.2%** | exact |
| t175 fin-region max row width | 53 px | **53 px** | exact |
| t116 near-field sea p5–p95 spread | 0.329 | **0.329** | exact |
| t116 near-field foam (V>0.95) | 23.4% | **23.4%** | exact |
| t116 near-field ACF vert/horiz @ lags 2/4/8 | 0.55 / 0.10 / −0.19 | **0.55 / 0.10 / −0.19** | exact |
| t357 fireball brightness percentiles | p95 `#fb9352` p75 `#d58a1c` p50 `#c25e02` p25 `#a6290f` | `#f68f31` `#d89d1b` `#be462e` `#a62813` | exact |
| world-distance flow correlator, shifts ±0.5…±4.595 injected into the **real** texture | — | recovered to **≤0.009 u**, corr 0.93–0.999, lag-0 ≈ 0 | PASS |
| layering-orientation estimator, frame rotated by 0/±15/30/45/60° | — | recovered to **≤1.2°** | PASS |

**Instrument failures I caught and discarded (not used in any verdict):**

- A synthetic sine-sum test signal for the flow correlator produced errors of 1.4–7.3
  units. The *signal* was the problem, not the correlator — a sum of sinusoids at the
  shader's z-frequencies is massively self-aliased. Rebuilding the control on the real
  captured texture's own spectral content gave ≤0.009 u. **A negative flow finding
  built on the first control would have been false.**
- Sky-boundary PCA for horizon angle drifted to **57.9° of error** at 60° of rotation
  (the sky region's frame-edge boundary dominates), and the per-column haze fit was
  biased by band truncation. Both were replaced by the segmentation-free layering
  estimator above. My first-pass haze numbers (4–22° of lag) were **instrument
  artefacts** and are withdrawn.

**Scale normalization that changed a verdict.** My first sea comparison measured ACF at
identical *pixel* lags on a 686×480 arcade frame and our 320×224 native render, and
reported our sea as near-zero vertical correlation against the arcade's 0.36. The
arcade video is a **2.144× upscale of 320×224**. At matched native-texel lags the two
are close (table below). The first reading was a scale confound; the corrected one
stands.

**Method note on HUD exclusion.** All sky-band measurements exclude the HUD via
`tools/hud_mask.py` derived *on my own captures this round*, dilated by 3–4 native px,
not via any hardcoded box. Its self-tests pass (783 HUD px, 170 in the reticle
quadrant); the reticle's own rows measure **20–50 native** in my runs. The reticle was
not counted as a cloud, an enemy, or a horizon in any number below.

**Determinism verified myself**: seed 7 captured twice is byte-identical in all 3
frames; seed 7 vs seed 8 differs in all 3. The `--url-params "seed=N"` fix is real.

## Scorecard

| # | Dimension | R1 | R2 | R3 | Evidence |
|---|---|---|---|---|---|
| 1 | Composition & camera | 3 | 4 | **7/10** | Horizon **62.50%H**, inside 50–65 and on the cruise constant. Jet centroid **(49.95%W, 58.49%H)**, inside the 52–60%H band — R2's 84.5%H is fixed. Span **35.62%W**, inside 34–38. Clouds now break the dead-flat horizon. Costed: the subject's *shape* is wrong (dim. 4 / gap 1), and combat frames carry 1 readable aircraft where the arcade carries 2–3. |
| 2 | Palette & sky/ground | 3 | 3 | **7/10** | Sky `#009fff`, exact. Sea near-field **p5–p95 0.357** (arcade 0.329), **foam 24.0%** (arcade 23.4%), **14,606** distinct colours below horizon. At matched native-texel lags, horiz ACF **0.483/0.241/0.127** against arcade **0.484/0.275/0.147**; decorrelation length horiz **1.92** vs arcade **1.73** native texels, horiz/vert **3.63** vs **2.34**. Haze band **8.9–9.4%H**, inside 7–11. Costed: **explosions are muddy brown** — mean saturation **0.46** against the arcade fireball's **0.85**, p50 `#986638` against `#c25e02`. Minor: our wave coarseness *grows* toward the viewer (decorrelation 1.76→4.12 native texels) where the arcade's *shrinks* (4.64→1.05). |
| 3 | Motion & sense of speed | 2 | 1 | **7/10** | Lag-0 correlation is dead (|mean| 0.11 across 24 pairs on two independent estimators). Resolving pairs land on the prediction: **1.13–1.18** against 1.1488 at gap 1, **4.56–4.79** against 4.5953 at gap 4. 0.1× full-pipeline control: **9/9** within 15%, second peak well below first. Ground flow runs **2.9 native px/frame** at screen row 520 rising to **18.9** at row 660, clearing the arcade's certified **≥5.105 native px/frame** cruise floor over most of the visible ground. Enemy scaling is continuous (dim. 5). Costed: at shipped speed only **5–6 of 11–13** consecutive pairs put their *global* peak at the prediction (peak corr 0.3–0.6) — the motion is right but not yet a clean coherent translation. |
| 4 | Player envelope & controls | 3 | 3 | **7/10** | World roll saturates at **66.3°** measured (target 65–68) and tracks the 74.5°/s ramp to **≤0.35°** at every sample (8.70 vs 8.69, 16.30 vs 16.14, 30.90 vs 31.04, 45.60 vs 45.94, 66.20 vs 66.50). The whole sky/haze/sea stack rotates as one rigid structure — single-angle fit quality is **unchanged** from level flight (R² 0.640 → 0.585). Jet bank/world roll **0.783–0.788** at saturation, **0.71–0.79** across the whole ramp — inside 0.7–0.9 everywhere (code says 0.80; the ~2% shortfall is within my 0.5°-grid rotation match). **Zero clipping**: 100–101.4% of neutral pixels at every ramp point. Costed: `?demo=1` is still the placeholder sine sweep (pre-flagged); no barrel roll, no throttle, no pitch↔horizon coupling. |
| 5 | Gameplay systems | 1 | 1 | **5/10** | Real now, and several parts are right. Fly-past span **26.25%W** (arcade 25–30). Enemy bank peaks **51.9°** (arcade ~57). Multi-lock reaches **6** locks and **6** brackets. **Vulcan puffs are excellent**: 10 discrete puffs at **3×3–4×4 native px**, mean colour **`#feae19`** against REFERENCE.md's `#ffdb21`/`#ffad15`/`#ff9f0c`, in a visible zig-zag column. Enemy shot trains reach 19 on screen. Odometer **verified by capture**: stock 50 → 5 large + 0 ticks; stock 44 → 4 large + 4 ticks. Costed hard: readable-size enemies are rare (median largest **2.0%W**; ≥10%W in only **15%** of frames); missiles in flight peak at **5**, not 6–8; trail occupancy **87.3%**, not ≥95%; explosions wrong colour; and the entire out-of-flight game is absent. |
| 6 | Arcade presentation | 3 | 5 | **5/10** | Every HUD element is present at the right place and the right width (SCORE emblem 15.94%W vs 16.76 ref, −4.9%; SPEED label 7.50 vs 7.58, −1.1%), the HUD does not rotate, the reticle's attitude line **does** rotate with world roll and is horizontal at level, the status dot is present, and the odometer is correct. **And the words cannot be read** — `cmp-05`. The stage digit is a cream blob, not a "1". No throttle scale digits (arcade shows 0…1…2…3), no white wing flares on the emblems. No title screen, no audio. |

## Claims that did NOT reproduce

1. **"6–8 missiles in flight per salvo"** (`combatDemo.js` header / brief item 7). Probed
   from the simulation's own `__combatStats` over 18 s of the dev's own `?demo=2`
   timeline — the one built specifically to stage overlapping salvos — **max 5**.
2. **"ribbon trails ≥95% column occupancy"**. On an exact isolation mask (same timeline
   captured with and without weapons, differenced), the densest trail frame measures
   **87.3%**. The *value structure* claim does hold — bright/dark quintile ratio
   **3.31×** against the 2.2–3.2 spec — but the ribbon is **mean V 0.658** against the
   arcade's 0.37 and **30 native px** thick against ~16: too bright, too fat, and gappy.
3. **"clouds height 8.48%H"** — I measure **9.60%H**. Both miss REFERENCE.md's **6.04%H**
   by a wide margin, and our aspect is **1.21** against the arcade's **0.97**: our
   clouds are taller than wide where the arcade's are slightly wider than tall. Presence
   (**71.7%** vs 68–69 target) and count (**1 / 4 / 6** vs 1 / 5 / 6) do reproduce.
4. **"jet centroid 55.5%H"** — I measure **58.49%H** on the `?hidejet=1` difference mask
   and **58.37%H** independently on the roll-ramp frame 0. Still inside the 52–60%H
   acceptance, so it passes; the published number is ~3 points off.
5. **"a clean correlation peak within ~4% of prediction … across 7 of 8 consecutive
   frame pairs"**. The *central tendency* reproduces well. The *cleanliness* does not:
   on two independent estimators (uniform-d resampling, and native-screen-grid
   perspective warping) only **6/13** and **5/11** consecutive pairs put their global
   peak within ±15%, at peak correlations of 0.3–0.6. R2's acceptance asked for ≥8
   consecutive pairs. See the measurement defect below — part of this is the criterion.
6. **"fins to 62% of silhouette height"**. At the 50%-of-max-span wing-onset threshold I
   measure **58.4%**; at the 30% threshold, **33.8%**. The arcade gives **58.2%** and
   **55.7%** at the same two thresholds. One number landed near target while the
   silhouette's *shape* diverged — see defect 1.

## Measurement problems, not just implementation problems

Six acceptance criteria are themselves wrong. A developer who satisfies them exactly
will still fail. Fix these before dispatching R4.

1. **Fin height as a percentage cannot discriminate our jet from the arcade's.** The
   arcade's row-width profile is a *narrow spine then a sharp step*: 6%→21%→33%→55% of
   max span across 9 px. Ours is a *continuous wedge*: 48 px at the top ramping to 186
   px (60% of max) before the wing row, over 130 px. That is why the metric reads 58.4%
   at one threshold and 33.8% at the other on our sprite while the arcade reads 58.2/55.7.
   **Replace with**: silhouette aspect (**max row width ÷ full height including fins**) in
   **2.4–3.0:1** (arcade t175 at 60 fps: **2.70:1**; ours **1.35:1**) — this is the
   threshold-independent statistic and it is off by exactly 2× — **and** fin-region max
   row width ≤ **20%** of max row width at the 30%-of-max wing-onset threshold (arcade
   **16.1%**; ours **28.8%**). Note the 50%-threshold fin width does *not* discriminate
   (arcade 41.8%, ours 40.4%); only the 30% threshold and the aspect do.
2. **"4–6 enemies visible in combat" (GAME_SPEC §8) is satisfied by counting dots.** Our
   median on-screen count is 5 — of which the median largest spans 2.0%W. **Replace
   with**: a size-qualified count — ≥1 enemy at **≥10%W in ≥60% of combat frames**, and
   ≥2 at **≥5%W in ≥50%**. (Every stage-1 reference frame in the pack — t100, t100.75,
   t116, t104 — carries at least one enemy at 10–30%W.)
3. **"no interval where the sprite's measured width is unchanged" (R1/R2 gap 5) is
   unsatisfiable by any correct implementation.** At 2–4 native px a sprite growing at
   2.03×/s *must* sit on an integer width for ~19 frames; that is rasterisation, not a
   frozen-scale bug. Our longest plateau is 22 frames at 4 px, against a 19-frame
   prediction — consistent. In the near half (span ≥10%W) our plateaus are **≤3 frames**,
   which is the regime #105 was actually about. **Replace with**: plateau length within
   ±30% of the rasterisation prediction at every width, **and** ≤2 frames once span ≥10%W.
4. **"each text element's rendered width within 20% of its REFERENCE.md bbox" (R2 gap 9a)
   passes on unreadable glyphs.** This is the sibling project's #129 defect one level up:
   #129 was 1 px per cell, this is right-sized cells carrying the wrong marks. **Replace
   with**: a legibility check — per-glyph interior structure (stroke count / hole count)
   matching the arcade glyph, verified on a 4× crop by eye, in addition to the width bound.
5. **A bare sea-anisotropy ratio can be satisfied degenerately** by making the vertical
   axis pure noise (ratio → ∞) rather than making the horizontal axis long. It must also
   be measured at matched **native texel** scale or the arcade's 2.144× upscale inflates
   its side by the same factor. **Replace with**: horizontal decorrelation length within
   ±30% of **1.73 native texels** *and* ratio ≥2.0, both measured on 320×224-native pixels.
6. **R2's "clean unimodal peak in ≥8 consecutive 60 Hz pairs" is not achievable at the
   shipped speed.** The near field moves **30–57 screen px per 60 Hz frame**; no
   correlator resolves that unambiguously against a texture whose coarsest octave is
   ~1.37 world units. **Replace with**: (a) the *central tendency* of the per-pair peak
   within ±15% of prediction over ≥10 pairs, (b) |lag-0 correlation| < 0.35 in every pair (ours: max 0.347, mean 0.128),
   and (c) the clean-peak test run at a reduced scroll speed as a pipeline control. All
   three pass today.

## Ranked gaps for Round 4

### 1. The player jet does not read as an F-14
`cmp-04`. Two solid dark-grey slabs dominate the silhouette; the wings are flat white
planks with no sweep, taper or chord variation; the body is a plain light-grey box. The
arcade silhouette is a slender swept planform with a narrow spine, *thin* canted blades,
wings that sweep down and out, and orange nozzles set into dark nacelles. This is the
single highest-cost item: it is on screen in every frame of the game.
**Reproduction to satisfy**: silhouette aspect (max row width ÷ height) **2.4–3.0:1**;
fin-region max row width **≤20%** of max row width at the 30% wing-onset threshold; the row-width profile shows a **step** (≤25% of max span sustained
through the fin region, then ≥80% within 8% of silhouette height); span stays in
34–38%W and centroid in 52–60%H; ≥4 distinct airframe values above 1% area each.

### 2. HUD lettering is unreadable
`cmp-05`. Positions, widths, colours and the odometer are all right; the glyphs are not.
**Reproduction to satisfy**: "SCORE", "HIT", "SPEED", "STAGE" legible as words on a 4×
nearest-neighbour crop; the stage digit renders as a recognisable "1"; emblems carry the
arcade's white wing flares; the throttle bar carries its 0…1…2…3 scale digits. Keep the
existing width bounds as a floor.

### 3. Combat is sparse at readable size
Median largest on-screen enemy **2.0%W**; ≥10%W in only 15% of frames; ≥20%W in 2.2%.
The approach curve and the fly-past size are both correct — what is missing is *dwell*
at large size and *simultaneity*. Note `enemy.js` already reasons about this
("t116, t100.75 and t330 each have 2–3 enemies on screen at 15–25%W simultaneously");
the shipped tuning does not deliver it.
**Reproduction to satisfy**: criterion 2 above, measured from `__combatStats` over ≥30 s
of `?demo=2`, with the frame-by-frame span trace published.

### 4. Explosions are muddy brown, not orange fireballs
Mean saturation **0.46** vs the arcade's **0.85**; p50 `#986638` vs `#c25e02`; p95
`#d1b7af` (desaturated pink-grey) vs `#fb9352` (salmon). Size is right (**21.2%W** vs
~23%W) and shape is a smooth capsule where the arcade is a boiling multi-lobe mass.
**Reproduction to satisfy**: brightness percentiles within 15% per channel of
p95 `#fb9352` / p75 `#d58a1c` / p50 `#c25e02` / p25 `#a6290f`; mean saturation ≥0.75;
≥3 distinct lobes in the outline at peak.

### 5. The game outside the flight loop does not exist
No title/attract cycle, no audio at all, no stage progression, no stage-end HIT×20,000
tally card, no death/respawn/continue, no barrel roll, no resupply, no passive score
accrual (SCORE reads 000000 for the entire run). GAME_SPEC §§2, 5, 6, 7 are unimplemented.
Audio is the largest single absence by player-perceived weight and has no measurement
burden attached — the arcade's engine drone, lock tone and vulcan chatter are half the
"feel" the primary directive asks for.
**Reproduction to satisfy**: take these in GAME_SPEC's own measured order — score accrual
(~3300/s at SPEED M) + HIT semantics first (cheapest, and makes the HUD mean something),
then stage progression + tally card, then death/respawn, then title/attract, then audio.

### 6. Missile trail and salvo depth
Occupancy **87.3%** (spec ≥95), mean V **0.658** (arcade 0.37), thickness **30** native px
(arcade ~16), salvo peaks at **5** in flight (spec 6–8). Flight times median **0.52 s**
with a minimum of **0.33 s**, below GAME_SPEC's 0.5–1.5 s band.
**Reproduction to satisfy**: occupancy ≥95% on an isolation-differenced mask; mean V
0.30–0.45; head thickness 12–20 native px; ≥6 simultaneously in flight during an
overlapping double salvo; no impact earlier than 0.5 s.

### 7. Clouds are the wrong shape
Height **9.60%H** vs **6.04%H**, aspect **1.21** vs **0.97**, p90 width **14.69%W** vs
**21.49%W** — ours are too tall, too uniform, and never form the arcade's big banks.
Presence and count are already right; do not retune those.
**Reproduction to satisfy**: height median 5–7%H, aspect median 0.85–1.10, p90 width
≥18%W, with presence held at 68–72% and count median 1 / p90 5 / max 6.

### 8. Demo/attract flight path is a placeholder (pre-flagged, not a discovery)
`?demo=1` is `sin(t·0.5)`. GAME_SPEC §7 and REFERENCE.md require a two-regime path
(cruise cx sd 12.88%W, canyon 2.59%W), not constant-amplitude weaving.

### 9. Lock bracket line weight
Brackets track and jump correctly and the count is right, but the arms are heavy blocks
(≈4–6 native px) where the arcade's are thin 1–2 px dashed corners (t100, t104). Cheap fix.

### 10. Sea wave coarseness trend is inverted
Ours coarsens toward the viewer (1.76→4.12 native texels), the arcade's refines
(4.64→1.05): AB2's near field is dense fine dither over larger shapes. Low priority —
the first-order statistics already match well — but it is why our near field reads as
blotches where the arcade's reads as sparkle.

## Evidence files

All under `/Users/urizonens/dev/afterburner-three/judging/R3/`. Ours is **LEFT / TOP**,
arcade is **RIGHT / BOTTOM**, labelled in-image.

- `cmp-01-neutral-flight-ours-left-arcade-right.png` — ours `?fixed=1&seed=1` vs t116.
- `cmp-02-banked-flight-ours-left-arcade-right.png` — ours at 66.5° world roll vs t97.
  The haze band hugging the tilted horizon is R2 gap 4 closed.
- `cmp-03-combat-ours-left-arcade-right.png` — ours `?demo=2` t=12.0 s vs t100. **The
  most informative image this round**: our best combat frame against the arcade's.
- `cmp-04-jet-sprite-ours-TOP-arcade-BOTTOM.png` — **the single most important image.**
- `cmp-05-hud-ours-TOP-arcade-BOTTOM.png` — right widths, unreadable words.
- `cmp-06-sea-texture-ours-TOP-arcade-BOTTOM.png` — near-field sea at matched scale.
- `raw-ours-neutral.png`, `raw-ours-full-right-bank.png`, `raw-ours-combat.png`.

Captures are mine, taken this round, in `tools/out/judge-r3/` only — `flow1`, `flow4`,
`neutral`, `jet-on`, `jet-off`, `roll-jet`, `roll-nojet`, `clouds30`, `demo2`, `solo`,
`solo-iso`, `trail`, `trail2`, `trail3`, `trail3-bg`, `vulcan`, `odo`, `det-s7-a/b`,
`det-s8`, `hudmask`, `arc`. The 0.1× scroll-speed full-pipeline control ran in an
rsync'd scratchpad copy, never in this tree; the `__combatStats` probe ran from a second
clean scratchpad copy (verified unperturbed) because node could not resolve `vite` from
`/tmp`. No other agent's `tools/out/` directory was read or written. No capture reported
a page error. No source file was modified.

## Recommendation

Send back. Fix the six measurement defects first — in particular the fin-height
criterion (defect 1) and the enemy-visibility criterion (defect 2), because gaps 1 and 3
cannot be closed against the criteria as written. Then take gap 1 (jet silhouette) and
gap 2 (HUD lettering) as one presentation task and gap 3 + gap 4 (combat density,
explosion palette) as one combat task; those four are what stand between this build and
"that's After Burner". Gap 5 is larger than all of them put together but is additive
rather than corrective — start it in parallel with score accrual and audio, the two
cheapest items with the highest perceived weight.

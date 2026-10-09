# STATUS — where the rebuild stands

**Last updated**: 2026-10-06, Round 6 in flight (four build lanes live in `src/`, work
uncommitted in the tree; criteria lane editing this file).
**Judge score trend**: R1 3/10 → R2 4/10 → R3 6/10 → R4 7/10 → **R5 7.5/10** (still FAIL
against the arcade bar). Full reports in `judging/R1..R5/report.md`; R5's is the scoring
baseline. R5 also produced two reviews nobody had run before — `judging/R5/art-critique.md`
and `judging/R5/feel-critique.md` — and between them they overturned three more criteria.

**Start here if you are a new lane**: the per-stage **Criterion A/B scoreboard** at the top of
REFERENCE.md, then gap 0 below. Everything else in this file is downstream of those.

**User's own verdict after playing it: "it's very bad, lots of work to be done."** The score
trend measures convergence on measurable properties; it does not yet mean the game is fun or
convincing. Treat the player-experience gap as real and unquantified — see "What nobody has
judged yet".

**Reading any number in this file**: per REFERENCE.md "What a complete citation is", an
our-side figure is incomplete without its **tree state**. Everything marked R5 below was
measured on the **uncommitted shared working tree with six lanes live**, not on a commit.
The R4 critic and player-feel once differed 6 vs 9 deaths in 120 s for exactly this reason,
and both were right about their own tree. **The R5 judge measures a clean checkout.**

## How Round 6 is being run

Four build lanes in `src/` with disjoint file ownership, plus this criteria lane, which owns
`REFERENCE.md`, `GAME_SPEC.md`, `STAGE_MAP.md`, this file and new `tools/` scripts, and
**nothing under `src/`**. R6's criteria work is in `judging/R6/lane-criteria.md`.

**Everything marked R6 in this file was measured on the R5 judge's captures of clean checkout
`53ce86b`, or on arcade reference frames — not on the live R6 tree**, which four lanes are
changing concurrently. Any our-side R6 figure must be re-measured before it is quoted against
a new commit; the airframe and enemy figures in gaps 1 and 2 in particular predate the sprite
lane's current work.

## How Round 5 was run

Six lanes on one tree with disjoint file ownership: criteria-fix (`REFERENCE.md`,
`GAME_SPEC.md`, this file), world, combatfx, presentation, sprite-art, player-feel.
Cross-lane agreements and every lead ruling are in `judging/R5/interfaces.md` (I1–I28) —
**read it before re-litigating anything below.** Per-lane evidence in `judging/R5/lane-*.md`.

## Criteria repair came first, and it was the biggest finding of the round

**Twenty acceptance criteria have now been retired or repaired** as non-discriminating or
plain wrong. The maintained ledger is in REFERENCE.md ("The defective-criteria ledger") —
add rows there rather than re-counting. R5 added four: the cloud size/presence figures (a
correct operator over a 90 %-non-cloud population), the zero-cloud/HUD-overlap control, the
sea anisotropy ratio, and the aliased `?demo=1` canyon sd; R5c added the gap-5 deaths/minute
denominator and the stage-2 open-plain target. **R6 resolved six**, five of them new rows (11–15) plus the HUD row,
which R5 had left open as a candidate: the HUD ≥3:1 contrast
criterion (the arcade fails it), the player-airframe V ≤ 0.77 ceiling (inverted), the
near-black enemy dominant (measured on stage 2, applied to stage 1), the ≤1.5 deaths/min
threshold (the arcade fails it by 36 %), and two operator defects found this round — Criterion
A2's "distinct values per channel" meaning two different statistics, and the #132 cloud
operator's arcade-side HUD exclusion being unusable as published. **Three more came out of the
world lane's close**: the sea horizontal-decorrelation band and the R5 anisotropy restatement,
both **retired with no replacement** because their arcade side is a 686×480 video band carrying
19 896 colours and 11.4 % V-identity — a two-pixel-kernel statistic read off the codec — and
**Criteria A and B themselves, narrowed**: they are region averages, blind to arrangement, and
a sea of a few enormous flat slabs passed all four while scoring 20 points *above* the arcade.
Every A/B figure must now be paired with an extremal statistic.

**R6 named a sub-class and added a process rule for it.** Two of this round's retirements were
*correctly measured on the wrong stage's frame* and then applied to a stage the measurement
never covered. Every re-run of the operator reproduces the wrong number exactly, so
cross-validation cannot see it; only reading the stage digit can. **Binding from R6: every
palette or value criterion records the frame it was measured on, the stage digit read out of
that frame, and the stages it is licensed for** — REFERENCE.md, "Every palette or value
criterion names its stage". The existing criteria are backfilled there, and **one is flagged
UNATTRIBUTED** (the explosion/fireball targets: `ab2-gameplay.mp4` has no stage map).

They are all one defect class, now named once in `interfaces.md`: **a validated operator
pointed at the wrong population, resolution, region or sample.** It produces exactly
reproducible wrong numbers, and cross-validating two implementations cannot detect it. Only
cropping what the operator was pointed at and looking catches it.

**Five times this round a criterion or an ask was checked against the arcade before being
tuned to, and four of those checks reversed the intended direction.** That is the loop
working. **Before tuning to a criterion, check the criterion against the arcade itself.**

## What works end to end

Title screen → flight → combat → death/respawn → stage-end tally → stage 1/2/3 progression →
continue → restart. Verified by the R4 judge, with R5 corrections marked:

| Area | Verified state |
|---|---|
| Composition | Horizon 62.50 %H, jet span 35.62 %W, centroid 57.08 %H — inside arcade bands. **R5: `?demo=1` is two populations** — canyon cy 63.52 %H is out of band *on purpose*; capture cruise only or split by regime (`simTime % 16 < 11`) |
| World roll | Rigid about screen centre, 74.5°/s, saturates ~66.5°; jet banks at 0.800× (pixel-confirmed); HUD stays upright |
| Ground | Scrolls correctly (was literally zero in R2); contrast/foam near arcade. **R6: sea anisotropy has NO arcade target — the R5 restatement (4.95× vs 5.21×) is RETIRED too** (ledger rows 6/16/17). Its arcade side came from a 686×480 video band carrying 19 896 colours and 11.4 % V-identity; the statistic even reverses sign with resolution (3.04× at 686×480, 4.56× at native, opposite directions). Quote it only as a same-operator regression guard between our own builds, with the resolution named |
| Combat | 10–14 aircraft on screen; 66.6 % of frames have an enemy ≥10 %W; salvo of 6 missiles; trail occupancy 98 %; lock brackets 1–2 px |
| Explosions | Palette fixed — saturation 0.879, p50 `#c25e02` (exact). **R6: the core figure R5 published was wrong in SIGN** — our core was **28–32 %** against the arcade's 9.2 %, not the 4.1–7.8 % recorded, because FIRE-MASK's control regions were never published and the operator over-read. R5's lane, the art critique and the lead all endorsed holding a value derived from a number the operator could not produce. Now **9.1–12.3 % core at mean S 0.824–0.846** against the arcade's 9.2 / 0.846. `V>0.95` is the one statistic slightly low (40.7–48.6 vs the ≥45 gate) and was **deliberately not fixed** — the lever is spike thickness and the spikes are a separately flagged art defect |
| Scoring | Passive 3300.0/s exactly, frozen through death, HIT survives death, HIT×20,000 at the tally |
| Death cycle | Fireball → 53.4 %W starburst → tumbling hulk → oversized bottom respawn + READY card. **R5: non-interactive time per death 8.5 s → 5.2 s** (player-feel, self-reported) |
| HUD | Every word legible (5×7 font); odometer missile stock; rotating reticle attitude line |
| Audio | 11 synthesized SFX + engine loop + original FM music, wired to all state/combat events; 0 errors headless |

## R5 deliveries, with their verification level

Lane self-reports unless marked. **Nothing here is judge-verified.**

| | state |
|---|---|
| **Cloud banks (R4 gap 7)** | width median 7.19 → **18.12 %W**, height 5.36 → **20.54 %H**, presence 50.6 → 70.0 %. Lead-verified by capture. Carry the known bias: published counts over-count **3.1 %** and under-state width **0.9 %** from HUD severing, and it grows with any new horizontal HUD rule |
| **Cloud palette per stage** | `flow.js` switches on stage change; lead-verified at tick 2460, stage digit 2 |
| **Stage-2 open plain (part of gap 6)** | KEPT by lead ruling. **R5c correction: ours does NOT bracket the arcade** — our median 9.9 % against the arcade's **19.7 %** over 65 frames, and our maximum sits below the arcade's p75. More open plain and more swing is still owed |
| **Stage-3 city lights** | fixed and dramatic, and the lead checked the arcade before letting anyone dim them: the arcade has this condition **~3× harder than we do** (9.76 % of its bottom HUD band brighter than the cream glyph ink, against our 3.40 %) with **no opaque plate** behind the row. **Ruling: do not dim them**, and **do not add glyph outlines there** — our HUD is already 2–24× more separated from its background than the arcade's |
| **Night jet pose sheet** | selected in-game and measured at 345 px span: all four silhouette discriminators pass. Roll sheet built, measured, and **deliberately unwired** — inert, one line to enable next round |
| **Capture tooling** | three silent-corruption bugs fixed: HMR reload mid-run, a drawing-buffer race producing all-black frames (1/30 → 0/90), and the same HMR defect in `combat_probe.mjs`, which a judge reads combat ground truth from. The read-back change was verified **pixel-safe** (30/30 byte-identical) |
| **Build boots** | a mid-edit `ReferenceError` in `src/ui/hud.js` broke every capture and probe for part of the round. **Re-verified booting 2026-10-05** on the working tree (`tools/out/criteria-fix-r5c/boot/`) |

## Ranked gaps — R4's list, updated

Three of the eleven are closed or withdrawn; the rest stand.

0. **[R6: the world lane rebuilt stage 1's sea and now passes all four gate readings — but
   read the pairing rule before you trust that, and read it before you touch any other
   stage.]** The gates are region averages and are blind to *arrangement*: an intermediate
   build of this same sea passed all four while being a few enormous smooth slabs, and scored
   H-identity **89.3 %, twenty points above the arcade's own 68.7 %** — the gate improved as
   the art got worse. **Every Criterion A/B figure must now be reported with an extremal
   statistic** (largest component, max extent, count); REFERENCE.md ledger row 18 and the
   degenerate-structure process rule. The original gap, left here because stages 2 and 3 are
   not closed:
   **STAGE 1 FAILED BOTH PROJECT-WIDE GATES BY TWO ORDERS OF MAGNITUDE — and it had never
   been on a gap list.** Criteria A (colour cardinality) and B (adjacent-pixel identity) have
   been published as GATES since R5 and were cited in no gap list, no ask and none of the six
   R5 lane reports. Stage-1 flight: **13 879 colours** against the gate's 256 and the arcade's
   138; **ground V-identity 0.1 %** against the gate's 50 % and the arcade's 68.5 %. The R5
   judge names this as the mechanism behind the owner's "it's very bad": every other criterion
   on the board measures composition, geometry or palette, and **none of them measures the
   texture of the pixels**, which is what a player actually looks at. We render continuous-tone
   noise where the arcade renders structured pixel art. **Scoping, and it is good news: stages
   2 and 3 are close** (374 and 989 colours; H-identity 64.2 % and 60.0 %) — the R5
   palette-snapping worked. **Stage 1's sea shader is the single outlier**, and it is the stage
   every judge, screenshot and new player sees first. Independently re-measured R6 on a second
   implementation; per-stage scoreboard at the top of REFERENCE.md.
1. **Enemy aircraft reads as "a slab with a bullseye"** — highest visible cost. Livery API
   agreed (I1); sprite lane owns the redraw. The arcade's stage-1 rear-aspect jets have
   **near-black nozzle rings with a hot orange centre** and read **mid-grey**, not white.
   **R6: the "near-black dominant" prescription is RETIRED for stage 1** (ledger row 12) — it
   was measured off `ab2-arcade-closeup-enemies.jpg`, whose HUD digit reads **STAGE 2**. The
   arcade flips enemy value per stage; stage 1's enemies are **pale grey-white with green wing
   camo and dark accents** (V median 0.557–0.582, light:dark **1.8–1.9 : 1**), ours is
   **0.06 : 1** — inverted by ~30×. New gate: **share(V>0.7) > share(V<0.3) by ≥1.5:1** on
   stage-1 liveries. Nothing changes for stage 2, where `camo` is correct.
2. **Player jet fins/nozzles** — criteria replaced and the day **and** night sheets now pass
   all four discriminators. **R6: the dominant residual is TONAL, not geometric.** R4's
   **V ≤ 0.77 airframe ceiling is RETIRED** (ledger row 11) — it was the brightest *cluster
   centroid of a median-cut quantization* quoted as the brightest *pixel*, and it capped us
   **below the reference aircraft's own median**. The arcade's daylight jet is **white**:
   achromatic V median **0.816–0.922** across five stage-verified stage-1 frames and **0.839**
   on the true-native frame, with **45–65 %** of pixels above V 0.80. Ours: median **0.643**,
   maximum **0.773** (`#c5c5ad`), **5.3 %** above V 0.80. New band: **V median 0.78–0.92,
   brightest body colour ≥0.90**, daylight stages. Carried forward from R5 and still true:
   our blades are shorter and less canted, wings sweep down less, nacelle pods are smaller —
   but geometry is third-order against a 10× difference in highlight share.
3. **HUD typography** — **the contrast half is CLOSED (R6).** The ≥3:1 criterion was run on
   the arcade's own bottom strip by two independent operators and **the arcade fails it on its
   own red ink on stages 1 and 2**; it is retired (REFERENCE.md ledger row 10) and replaced by
   the mechanism — white plate behind SPEED and the throttle bar only, no plate behind STAGE,
   black keyline on the stage digit and the missile stock, which we already do. "The cream
   stage digit is invisible over stage 2's tan ground" is **no longer true**: ours 5.64:1
   against the arcade's 5.92:1. **Scope reduced: stage 3 needs nothing** (I21-REVISED), and
   **do not add halos, outlines or plates** — ours is already 2–24× more separated than the
   arcade's. What remains is typography alone.
4. ~~Missile trail black~~ — **criteria defect fixed** (white in every stage, night only ~6 %
   dimmer). Build-side verification still owed.
5. **We are ~50 % more lethal than the arcade** — **the arcade's own rate is now MEASURED,
   twice, independently** (GAME_SPEC.md §2): **1.91/min** (R5 judge, READY-card template match,
   all 60 candidates crop-verified) and **2.04/min** (R5 feel critic, 27 deaths over 793.8 s,
   partitioned by 9 continue screens), wall clock; **2.78–2.94** on flight time. Ours is
   **3.00**. The old **≤1.5 gate is RETIRED** — the arcade fails it by 36 % — and replaced by
   **≤2.0 deaths/min of wall clock**, flight time reported on the same line. Carry the
   pilot-dependence **with** the gate: 0.00 (superplay) / 2.04 (human) / 2.90–3.00 (our
   non-reactive autopilot) is three pilots, not three games, and an autopilot that cannot dodge
   dies only 1.42× as often as a human who can — so **fail it and investigate; do not
   reflexively make the game easier.** Playable share already matches (arcade 69.4–73.5 %,
   ours 71.9 %), which closes gap 5's pacing half. Pilot-independent properties (warning time,
   shots in air, telegraph count) remain the better criterion and their arcade targets are
   **still unstarted**.
6. **Stage 2/3 grounds have no structure** — improved, not fixed. Stage 2's palette snapped
   from 238–258 colours to 70–72 against the arcade's 42, and an open-plain regime now
   exists, but the terrain band is a smeared longitudinal streak symmetric about the flight
   axis where the arcade's is one diagonal mass. **A composition fix, not a terrain fix.**
7. ~~Clouds too small~~ — **closed**: 7.19 → 18.12 %W against the replaced criteria.
8. **Title typography is placeholder**; no attract-mode gameplay demo cycle.
9. **Card sizing/colour** — CONTINUE PLAY ~2× oversized, INSERT COIN cyan instead of red,
   countdown drawn behind the jet.
10. ~~Explosions have no white-hot core~~ — **closed, and the criterion behind it repaired
    TWICE**: the brightest-decile saturation gate is **dropped** (false negative by
    construction on our palette, ledger row 20) and FIRE-MASK's three exclusion regions are
    **published** (ledger row 19). Original note: **criteria defect fixed** (targets: ≥40 % of
    pixels above V 0.95, brightest-decile saturation ≤0.30). Build-side verification owed.
11. **Still entirely absent**: barrel roll (art is built and unwired), throttle/speed control,
    resupply stages, enemy variety and liveries, canyon stages, the full 23-stage structure,
    landmasses/islands/carrier — enemies still arrive in a single-file diagonal queue.

## What nobody has judged yet

- **Feel and fun.** Every judge so far measures pixels against reference frames. Nothing has
  evaluated responsiveness, difficulty curve, pacing, or whether playing it is enjoyable. A
  player-experience critic round is the obvious next addition to the loop.
- **Audio by ear.** It is wired and error-free, but musicality, the vulcan rate, the explosion
  weight and the afterburner swell have never been heard by a human. Audition at
  `tools/audio-preview.html` (`npm run dev`, click once to unlock).
- **Round 5 itself.** Six lanes delivered against repaired criteria; none of it has been
  independently re-measured.

## Open items carried forward

- **Stage-1 cloud presence is UNRESOLVED**, not a gate. The shipped 70 % / count 1-2-4 is
  **ADOPTED, not MEASURED** — do not cite it as an arcade fact and do not judge against it.
  Re-open needs aircraft/plume/surf rejection validated against a human on all 120 labelled
  components of t93–120, or a hand count over a longer span.
- **Stage-1 sky `#009eff` carries the video level expansion.** The arcade's ladder tops out
  at `0xf7`; every video frame tops out at `0xff`. Stage 2's sky was 12 levels too bright in
  R before correction. There is **no native stage-1 frame in this repo**, and neither
  686×480 nor 1028×720 is an integer multiple of 320×224, so native cannot be recovered by
  decimation. A native stage-1 screenshot would settle it immediately.
- **The player respawns into live fire** — 17 % of lives end within ~1 s of the 2.0 s grace
  expiring, because `flow.js` no longer clears shots on death (which is what bought the
  playable-share gain). Combat's call: threat-aware grace, or a `clearShots()` entry point.
- **Published jet-centroid numbers ran ~2–3 points optimistic for two rounds**; the operator
  is now published and reproduced to 0.01 points on two independent implementations
  (pixel centroid 57.51 %H, bbox centre 55.06 %H, span 35.94 %W). Watch for the two
  definitions being quoted as one statistic.
- **Nine genuinely drawn perspective bank poses** for the player jet — the current nine are a
  rotated and foreshortened planform.
- **A true-native stage-1 screenshot is now the highest-value acquisition this project can
  make.** It would settle **four** separate open items at once: the `#009eff` sky level (which
  carries the video's level expansion), Criterion B's floor on a stage-1 *sea* patch (currently
  extrapolated from two frames that are stage 2 and stage 3, neither of which is sea), the
  horizontal decorrelation band (ledger row 16) and the cross-track anisotropy target (row 17).
  Three of those four are **retired for want of it**, not for want of effort. Neither 686×480
  nor 1028×720 is an integer multiple of 320×224, so decimation cannot substitute.
- **`hazeSteps` is read by `paramsFor()` out of `stage.terrain`, NOT out of `stage.haze`.**
  Putting it under `haze` beside `bandHeightFrac` — where it reads as if it belongs — is a
  **silent no-op**: no error, no warning, the posterization simply does not happen. The R6
  world lane wrote it in the wrong block first and caught it only by grepping the consumer.
  Grep where a key is consumed before trusting that setting it did anything.
- **Two capture-corruption causes are fixed; that is not proof there is no third.** Sweep
  every capture set for black frames **and for duplicates** — a stalled live frame
  double-counts in a pooled distribution and a black-frame sweep alone cannot see it.

<!-- Removed 2026-10-05: "sea coarseness (R4 gap 10) knowingly unresolved" — WITHDRAWN as a
     defect, see REFERENCE.md ledger row 6. The near-field sparkle layer is NOT to be built.
     Re-open only against a common-resolution, common-filter comparison stated as such. -->

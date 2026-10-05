# STATUS — where the rebuild stands

**Last updated**: 2026-10-05, Round 5 in flight (six lanes, work uncommitted in the tree).
**Judge score trend**: R1 3/10 → R2 4/10 → R3 6/10 → **R4 7/10** (still FAIL against the
arcade bar). **No R5 judge has run yet** — every R5 figure below is a lane's own or the
lead's, at the verification level stated. Full reports in `judging/R1..R4/report.md`; R4's is
the scoring baseline until the R5 judge re-measures.

**User's own verdict after playing it: "it's very bad, lots of work to be done."** The score
trend measures convergence on measurable properties; it does not yet mean the game is fun or
convincing. Treat the player-experience gap as real and unquantified — see "What nobody has
judged yet".

**Reading any number in this file**: per REFERENCE.md "What a complete citation is", an
our-side figure is incomplete without its **tree state**. Everything marked R5 below was
measured on the **uncommitted shared working tree with six lanes live**, not on a commit.
The R4 critic and player-feel once differed 6 vs 9 deaths in 120 s for exactly this reason,
and both were right about their own tree. **The R5 judge measures a clean checkout.**

## How Round 5 was run

Six lanes on one tree with disjoint file ownership: criteria-fix (`REFERENCE.md`,
`GAME_SPEC.md`, this file), world, combatfx, presentation, sprite-art, player-feel.
Cross-lane agreements and every lead ruling are in `judging/R5/interfaces.md` (I1–I28) —
**read it before re-litigating anything below.** Per-lane evidence in `judging/R5/lane-*.md`.

## Criteria repair came first, and it was the biggest finding of the round

**Eight acceptance criteria have now been retired or repaired** as non-discriminating or
plain wrong. The maintained ledger is in REFERENCE.md ("The defective-criteria ledger") —
add rows there rather than re-counting. R5 added four: the cloud size/presence figures (a
correct operator over a 90 %-non-cloud population), the zero-cloud/HUD-overlap control, the
sea anisotropy ratio, and the aliased `?demo=1` canyon sd; R5c added the gap-5 deaths/minute
denominator and the stage-2 open-plain target.

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
| Ground | Scrolls correctly (was literally zero in R2); contrast/foam near arcade. **R5: sea anisotropy restated — ours 4.95× vs arcade 5.21× at a common 686×480. The old 6.51× is RETIRED** (floor-limited by a 1 px clamp, and compared across two resolutions) |
| Combat | 10–14 aircraft on screen; 66.6 % of frames have an enemy ≥10 %W; salvo of 6 missiles; trail occupancy 98 %; lock brackets 1–2 px |
| Explosions | Palette fixed — saturation 0.879, p50 `#c25e02` (exact) |
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

1. **Enemy aircraft reads as "a slab with a bullseye"** — highest visible cost. Livery API
   agreed (I1); sprite lane owns the redraw. The arcade's stage-1 rear-aspect jets have
   **near-black nozzle rings with a hot orange centre** and read **mid-grey**, not white.
2. **Player jet fins/nozzles** — criteria replaced and the day **and** night sheets now pass
   all four discriminators. **Residual, by eye and carried forward: our blades are shorter
   and less canted than the arcade's, wings sweep down less, nacelle pods are smaller.**
   Correct in every published discriminator and still a touch timid against the reference —
   the crop outranks the numbers.
3. **HUD typography + contrast plates** — the cream stage digit is still invisible over
   stage 2's tan ground. **Scope reduced: stage 3 needs nothing** (I21-REVISED). Before
   tuning to "≥3:1 contrast", run that criterion on the arcade's own bottom strip — it may
   be a criterion the arcade itself fails.
4. ~~Missile trail black~~ — **criteria defect fixed** (white in every stage, night only ~6 %
   dimmer). Build-side verification still owed.
5. **Three lives last under a minute** — **the criterion was defective and is restated**
   (GAME_SPEC.md §2): deaths per minute of **flight time** is primary, wall clock secondary,
   both named in the same line. R4's 3.0–3.5 baseline was measured on the old 8.5 s death
   cycle and is **not** comparable to a current wall-clock reading. **Deeper finding: a
   deaths/min target cannot be read off footage at all.** The two cached recordings of the
   same ROM give **~1.3/min and zero** — the figure measures the pilot's skill, not the
   game's lethality, and `?demo=1`'s autopilot is a third skill level again. Deaths/min is
   now a **regression guard**, not a fidelity criterion; the fidelity question belongs to
   pilot-independent properties (warning time, shots in air, telegraph count), whose arcade
   targets are **unstarted** and are the recommended replacement.
6. **Stage 2/3 grounds have no structure** — improved, not fixed. Stage 2's palette snapped
   from 238–258 colours to 70–72 against the arcade's 42, and an open-plain regime now
   exists, but the terrain band is a smeared longitudinal streak symmetric about the flight
   axis where the arcade's is one diagonal mass. **A composition fix, not a terrain fix.**
7. ~~Clouds too small~~ — **closed**: 7.19 → 18.12 %W against the replaced criteria.
8. **Title typography is placeholder**; no attract-mode gameplay demo cycle.
9. **Card sizing/colour** — CONTINUE PLAY ~2× oversized, INSERT COIN cyan instead of red,
   countdown drawn behind the jet.
10. ~~Explosions have no white-hot core~~ — **criteria defect fixed** (targets: ≥40 % of
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
- **Two capture-corruption causes are fixed; that is not proof there is no third.** Sweep
  every capture set for black frames **and for duplicates** — a stalled live frame
  double-counts in a pooled distribution and a black-frame sweep alone cannot see it.

<!-- Removed 2026-10-05: "sea coarseness (R4 gap 10) knowingly unresolved" — WITHDRAWN as a
     defect, see REFERENCE.md ledger row 6. The near-field sparkle layer is NOT to be built.
     Re-open only against a common-resolution, common-filter comparison stated as such. -->

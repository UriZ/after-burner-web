# STATUS — where the rebuild stands

**Last updated**: 2026-10-03, end of Round 4.
**Judge score trend**: R1 3/10 → R2 4/10 → R3 6/10 → **R4 7/10** (still FAIL against the
arcade bar). Full reports in `judging/R1..R4/report.md`; R4's is the current baseline.

**User's own verdict after playing it: "it's very bad, lots of work to be done."** The score
trend measures convergence on measurable properties; it does not yet mean the game is fun or
convincing. Treat the player-experience gap as real and unquantified — see "What nobody has
judged yet" below.

## What works end to end

Title screen → flight → combat → death/respawn → stage-end tally → stage 1/2/3 progression →
continue → restart. Independently verified by the R4 judge:

| Area | Verified state |
|---|---|
| Composition | Horizon 62.50%H, jet span 35.62%W, centroid 57.08%H — all inside arcade bands |
| World roll | Rigid about screen centre, 74.5°/s, saturates ~66.5°; jet banks at 0.800× (pixel-confirmed); HUD stays upright |
| Ground | Scrolls correctly (was literally zero in R2); sea cross-track anisotropy 6.51×, contrast/foam near arcade |
| Combat | 10–14 aircraft on screen; 66.6% of frames have an enemy ≥10%W; salvo of 6 missiles; trail occupancy 98%; lock brackets 1–2px |
| Explosions | Palette fixed — saturation 0.879, p50 `#c25e02` (exact) |
| Scoring | Passive 3300.0/s exactly, frozen through death, HIT survives death, HIT×20,000 at the tally |
| Death cycle | Fireball → 53.4%W starburst → tumbling hulk → oversized bottom respawn + READY card |
| HUD | Every word legible (5×7 font); odometer missile stock; rotating reticle attitude line |
| Audio | 11 synthesized SFX + engine loop + original FM music, wired to all state/combat events; 0 errors headless |

## Ranked gaps for Round 5 (from `judging/R4/report.md`)

**Fix the defective criteria FIRST** — four acceptance criteria are themselves wrong, and
tuning to them has already caused one regression:

1. **The jet silhouette criteria cannot discriminate our jet from the arcade's** (ours scored
   aspect 2.478 vs arcade 2.475 — identical, visibly different aircraft). Replace with the
   statistics that *do* separate them: fin rows showing two separated blades (ours 8/21 vs
   arcade 21/21), fin-pair lateral extent (12.3% vs 35.3% of span), nozzle separation (14.0%
   vs 30.4%). Ours is one centred bar with touching nozzles; the arcade has two separated
   outboard canted blades over widely-spaced nacelles.
2. **The missile-trail brightness target came from a night frame.** Stage-1 daylight measures
   mean V 0.966 / sat 0.051. Hitting the old 0.37 target made our daylight trail *black*.
3. **The explosion target came from a desert frame of fading smoke**, which is why ours has no
   white-hot core (arcade: mean V 0.882, 47.7% of pixels above V 0.95; ours 0.792 / 20.1%).
4. **Cloud criteria must name their segmentation operator** — two defensible operators disagree
   ~3× on the same frames.

Then, in priority order:

1. **Enemy aircraft reads as "a slab with a bullseye"** — a grey rectangle with a big
   black-rimmed red disc, on screen at 10–27%W in every combat frame. Highest visible cost.
2. **Player jet fins/nozzles in the wrong place** (see criteria defect 1).
3. **HUD typography + missing contrast plates** — the cream stage digit is *invisible* over
   stage 2's tan ground; no black glyph outlines; emblem wings are striped rectangles, not
   chevrons; throttle scale floats above the bar instead of inline. Emblem widths also broke
   the ±20% bound when wings were added (SCORE +20.1%, HIT +41.8%).
4. **Missile trail is black where the arcade's is white** (stage 1) — see criteria defect 2.
5. **Three lives last under a minute** (3.0–3.5 deaths/min across seeds). Difficulty is
   miscalibrated, not just lethality.
6. **Stage 2/3 grounds have no structure** (no road, canopy, or city blocks) — and their
   palettes are sourced-but-not-pixel-measured, unlike stage 1.
7. **Clouds too small to read as banks** (p90 8.56%W vs arcade 21.49%W).
8. **Title typography is placeholder**; no attract-mode gameplay demo cycle.
9. **Card sizing/colour** — CONTINUE PLAY ~2× oversized, INSERT COIN cyan instead of red,
   countdown drawn behind the jet.
10. **Explosions have no white-hot core** (criteria defect 3).
11. **Still entirely absent**: barrel roll, throttle/speed control, resupply stages, enemy
    variety and liveries, canyon stages, the full 23-stage structure, landmasses/islands/
    carrier (the sea is empty — enemies also arrive in a single-file diagonal queue).

## What nobody has judged yet

- **Feel and fun.** Every judge so far measures pixels against reference frames. Nothing has
  evaluated responsiveness, difficulty curve, pacing, or whether playing it is enjoyable. A
  player-experience critic round is the obvious next addition to the loop.
- **Audio by ear.** It is wired and error-free, but musicality, the vulcan rate, the explosion
  weight, and the afterburner swell have never been heard by a human. Audition at
  `tools/audio-preview.html` (`npm run dev`, click once to unlock).

## Open items carried into Round 5

- `?demo=1`'s canyon regime is too loose (lateral sd 6.19%W vs the cited 2.59%W); cruise is
  excellent (13.20 vs arcade 12.88).
- Sea coarseness trend (R4 gap 10) is **knowingly unresolved**: the only mechanism that fixed
  it degraded the higher-priority cross-track anisotropy from 2.93× to ~1.0, so it was
  disabled with the uniforms left wired. The likely real fix is a separate near-field
  sparkle layer, not retuning the grain octave.
- Published jet-centroid numbers have run ~2–3 points optimistic for two rounds running.

# Judge Round 4 — three.js After Burner rebuild vs arcade AB2

**Date**: 2026-10-03
**Build judged**: HEAD `3c5d4d2` **plus uncommitted working-tree edits** (`git diff` sha
`07a239f4`, touching `enemy.js`, `spawner.js`, `combat.js`, `combatDemo.js`, `vulcan.js`
— combat-dev was still editing during this gate; a file saved mid-capture killed one of
my runs with "Execution context was destroyed", vite HMR reloading the page).
Everything below was therefore captured from an **rsync'd snapshot** of the tree taken
at 12:0x, so every number in this report comes from one frozen build. The snapshot lives
in the session scratchpad; no file in the project tree was modified by me except the new
`judging/R4/` directory. Two further commits (`ee214a1`, `62f1539`) landed while this
report was being written; they contain essentially the snapshot's uncommitted diff plus a
tighter wave gap and longer enemy first-fire delays. The only number I re-verified against
them is the death rate (gap 5), which improved by ~25% and still fails.
**Yardstick**: "Does this look, feel, and play like the 1987 arcade original?"

## Verdict

**FAIL as a fidelity gate — overall 7/10** (R1: 3, R2: 4, R3: 6).

This is the best round so far and it is not close. Five of the six claimed gaps moved for
real, and I verified them independently rather than taking the dev's word:

- **The game is now a game.** Title → flight → death → respawn → stage-end tally → stage
  2 → stage 3 → continue → restart all run end to end, unattended, with zero console
  errors, including with audio actually un-muted. Score accrues at **exactly 3300.0/s**,
  freezes across the whole death cycle, and the HIT counter survives death and resets
  only at a stage boundary. I watched all of it happen in captured frames plus the
  simulation's own state log on the same tick.
- **Combat is no longer dots.** R3: median largest on-screen enemy 2.0%W, ≥10%W in 15% of
  frames. Now: **median 12.65%W, ≥1 enemy at ≥10%W in 61.5% of frames, ≥2 at ≥5%W in
  73.8%**, salvo peaks at **6** missiles in flight. I checked the simulation's `spanFrac`
  against pixels on the same tick — a claimed 23.0%W enemy measures ~24.5%W on screen, so
  the stat is honest, not inflated by transparent sprite padding.
- **Explosions are orange again.** Mean saturation **0.879** (R3: 0.46, target ≥0.75); the
  p95/p50 percentiles land on `#fb9352`/`#c25e02`, i.e. exactly on REFERENCE.md's t357
  values; 5–6 distinct lobes.
- **The bank-follow ratio is exactly 0.800**, confirmed by *pixels*, not by the state
  readout the dev used: jet principal-axis angle ÷ horizon angle = 0.798, 0.800, 0.799,
  0.799, 0.800, 0.801 across six independent frames of the roll ramp. Roll rate measures
  7.45°/frame at 0.1 s/frame = **74.5°/s**, on the model. Zero clipping (99.8–100.7% of
  the neutral sprite's pixels at every ramp point).
- **The HUD can be read.** "SCORE", "HIT", "SPEED", "STAGE" and the stage digit are all
  legible as words/digits on a 4× crop. R3's headline blocker is closed.

It still is not After Burner II, and the three reasons a player notices first are all
things a *number* currently says are fine:

1. **The player's jet passes every criterion R3 wrote and still does not read as an
   F-14.** Our silhouette aspect is **2.478**; the arcade's own jet, re-measured by me at
   native scale with the same operator, is **2.475**. Our fin-region width is **12.3%** of
   max; the arcade's is **16.2%**. Identical scores, completely different aircraft —
   `cmp-09`. Ours is a solid centred dark bar (a tuning fork) over a flat plank; the
   arcade's is two separated outboard blades canted outward over swept tapered wings with
   the nozzles set wide apart. This is a **criteria failure**, not only an implementation
   one (see "Measurement problems" below).
2. **The enemy aircraft is a grey slab with a bullseye on it.** This is new information:
   it was invisible in R3 because enemies were 6 px wide. Now that they fill 20–27%W you
   can see that the head-on sprite is a rectangle with a big black-rimmed red disc in the
   middle and two flat white wing planks — `cmp-10`. It is on screen constantly.
3. **The missile trail is black.** The arcade's stage-1 missile smoke is a billowing
   **white** plume: I measure mean V **0.966**, saturation **0.051** on t100.75. Ours is a
   chain of dark grey sausages at mean V **0.37–0.43**. It hits R3's stated target exactly
   — and that target was derived from a *night* frame (`ab2-arcade-night-missiles.jpg`).

Plus the one that a player feels rather than sees: **three lives last well under a
minute** on the attract path — deaths at t=5.0, 23.5, 37.5 s (4.8/min) on the snapshot,
and **3.0–3.5 deaths/min across 3 seeds × 120 s re-measured on the newer `62f1539`** that
landed while I was writing this. The train-spacing, aim-bias and first-fire-delay
mitigations are all already in; they moved the number by ~25% and it is still roughly
double what a stock of 3 lives can absorb.

## How this was measured (instruments + controls)

Every operator was reimplemented from REFERENCE.md / GAME_SPEC.md prose in this report's
own scripts, not by re-invoking the dev's tooling, and each was run against a known input
before being pointed at our build.

| control | expected | my re-run | result |
|---|---|---|---|
| arcade t175 jet fin-region width, filled-pixel operator, native scale | 16.1% (R3) | **16.2%** | exact |
| arcade t116 near-field sea horiz/vert ACF anisotropy | >1 (qualitative) | 4.43× | plausible |
| roll ramp: jet axis ÷ horizon angle, 6 independent frames | 0.800 (code) | 0.798–0.801 | exact |
| roll ramp: per-frame horizon increment at 0.1 s/frame | 7.45°/frame | 7.44, 7.46, 7.45, 7.46, 7.38 | exact |
| `spanFrac` from `__combatStats` vs pixel width of the same enemy on the same tick | — | 23.0% claimed / ~24.5% measured | PASS |
| AudioContext actually constructed when `?mute=0` | — | `hasCtx: true`, 48 kHz, state `suspended`, MUTED=false | PASS |
| cloud "leak into HUD": clouds-on minus clouds-off, intersected with HUD pixels | 0 | **0** | PASS |

**Instrument I built, controlled, and partly discarded.** My horizon-angle estimator
(per-column first-sky-exit + iterative outlier rejection) was controlled by synthetically
rotating a level frame through 0/15/30/45/60°. It recovered 0° and 15° and 45° correctly
(offsets 7.44 / 22.44 / 48.26 against a frame whose own roll was already 7.44°) but
returned **14.93° for a 30° rotation and 17.49° for 60°** — it locks onto a different
boundary once the horizon leaves the frame edges. I therefore use it **only over the
linear part of the roll ramp** (where it agrees with the control and produces a perfect
7.45°/frame line) and I do **not** quote a saturation angle from it. The saturation world
roll of ~66.5° below is *derived* from the independently-verified 0.800 ratio and the
measured 53.2° jet-axis saturation, not measured directly.

**Why the audio check is not vacuous.** `src/audio/engine.js` sets `MUTED = params.has('fixed')`,
and `init()` returns immediately when muted — so every capture taken the normal way exercises
*none* of the audio code. I re-ran with `?mute=0`, confirmed by probe that an AudioContext
really was constructed, and stepped 800 ticks through title → flight → death → respawn →
tally → continue: **0 errors**. The context is `suspended` (no user gesture is possible
headless), so node *scheduling* is exercised but not rendering. Musicality is unjudged, as
briefed.

**Determinism/concurrency**: all captures went to unique `tools/out/judge-r4/*` paths. No
other agent's output directory was read or written.

## Scorecard

| # | Dimension | R1 | R2 | R3 | R4 | Evidence |
|---|---|---|---|---|---|---|
| 1 | Composition & camera | 3 | 4 | 7 | **7/10** | Horizon **62.50%H**, jet span **35.62%W**, centroid **57.08%H** — all inside band. The screen is now genuinely busy: 10–14 aircraft on screen, median largest 12.65%W. Costed: enemies arrive as a neat single-file diagonal queue where the arcade layers them at different depths and headings (`cmp-03`); no landmass, island, carrier or ground feature anywhere; the sea edge is one hard straight diagonal. |
| 2 | Palette & sky/ground | 3 | 3 | 7 | **7/10** | Sky `#009fff` exact. Explosion palette **fixed**: sat 0.879, p50 `#c25e02`, p95 `#fb9352`. Sea anisotropy **6.51×** near-field (arcade 4.43×), comfortably ≥2.5 — the gap-10 trade-off holds. Costed: missile trail is **black** where the arcade's is white (V 0.37–0.43 vs 0.966); stage-2 ground is structureless brown/cream dither with no road, canopy or features against the arcade's forest-and-road; stage-3 ground is black with cream speckles against the arcade's dithered dark-blue field; our stage-3 haze reads as a hard saturated blue ribbon. |
| 3 | Motion & sense of speed | 2 | 1 | 7 | **7/10** | Nothing in R4 targeted this and I make no speed claim from sub-60 Hz stills (CLAUDE.md #113). Roll rate independently confirmed at **74.5°/s**; ground scroll visually continuous and lag-free across all captures. Carried from R3. |
| 4 | Player envelope & controls | 3 | 3 | 7 | **7/10** | Bank ratio **0.800** (pixel-verified, 6 frames), **zero clipping** across the full ramp (99.8–100.7%), world roll saturating at ~66.5° derived. Costed: the silhouette redesign hit every target and still is not an F-14 (`cmp-09`, and the numbers below); no barrel roll; the throttle bar is decorative — there is no speed control; no pitch↔horizon coupling. |
| 5 | Gameplay systems | 1 | 1 | 5 | **7/10** | The whole loop exists and works: title (8 s timeout), flight, forced + organic death with fireball→starburst (**53.4%W peak**)→tumbling hulk→oversized bottom respawn with READY card, stage-end HIT×20,000 tally over live flight, stage 1→2→3 at 32/32/36 s, continue with 10 s countdown → score reset → 3 lives restored. Score accrual **3300.0/s exactly**, frozen through death, HIT survives death. Salvo **6** in flight, trail occupancy **98.2–98.6%** per component, thickness **15** native px, brackets now **1–2 px** stroke. Costed hard: the enemy sprite is a slab with a bullseye; 3 lives last 37 s; stage count wraps at 3 while the HUD digit counts on; no barrel roll, resupply, throttle, enemy variety or liveries. |
| 6 | Arcade presentation | 3 | 5 | 5 | **7/10** | R3's blocker is closed — every HUD word is legible (`cmp-07`, `cmp-08`), the stage digit is a clear "1", throttle scale digits exist, the tally card reproduces t124's red/cyan/magenta layout closely, READY and CONTINUE PLAY cards both land. Costed: emblem widths now **break** the ±20% bound (SCORE +20.1%, HIT +41.8%); our glyphs are flat white-on-red where the arcade's are black-outlined with a bevel; our emblem "wings" are striped rectangles, not the arcade's swept chevrons; **no white plates behind SPEED/STAGE**, which is why the cream stage digit is literally invisible over stage 2's tan ground (`evidence_hudbot_s2.png`); throttle scale sits above the bar instead of inline; the title lettering is crude blocky sans against the arcade's dimensional art; "INSERT COIN" is cyan on our continue card and red in the arcade's; the continue countdown is drawn behind the jet. |

## Claims that did NOT reproduce

1. **"centroid 55.28%H"** — I measure **57.08%H** on the jet-on/jet-off difference mask.
   Still inside the 52–60 acceptance so it passes, but this is the second consecutive
   round the published centroid is ~2–3 points optimistic. Something in the authoring-side
   centroid calculation is biased.
2. **"widths still within ±20% of REFERENCE.md boxes"** — measured as red-pixel extent at
   native scale on the stage-1 frame: **SCORE emblem 20.31%W vs 16.91 ref (+20.1%)**,
   **HIT emblem 12.81%W vs 9.04 ref (+41.8%)**. The emblems grew when the wing flares were
   added. Score digits (−8.5%), STAGE text (+3.6%) and the stage digit (−1.1%) are fine.
3. **Cloud geometry, as a set.** The claim does not name its segmentation operator, and the
   two defensible operators disagree by nearly 3×:

   | operator | presence | count med/p90/max | height med | width p90 | aspect |
   |---|---|---|---|---|---|
   | bright + low-sat threshold (what the arcade numbers were taken with) | 67.5% | 1 / 3 / 3 | **5.80%H** ✓ | **8.56%W** ✗ (target ≥18) | 0.85 |
   | exact isolation (clouds-on minus clouds-off, same seed) | 67.5% | 1 / 4.1 / 5 | **8.48%H** ✗ (target 5–7) | **23.88%W** ✓ | 0.86 |

   The claimed 6.25%H / 19.53%W sits between them; neither operator reproduces both.
   Aspect is 0.85–0.86 against the claimed 0.93 either way. Presence 67.5% reproduces
   exactly. **The parallax-into-HUD fix is real**: zero cloud-changed pixels intersect any
   HUD pixel across 40 frames.
4. **`?demo=1` canyon regime.** Cruise reproduces beautifully — **cx sd 13.20%W** against
   the arcade's 12.88, cy 51.9%H against 52.8. The canyon regime does not: **cx sd 6.19%W**
   against the cited 2.59, cy 58.3%H against 63.5. (Noted separately: the attract path
   flies a "canyon" regime over open sea, because there are no canyon stages yet.)
5. **Explosion p75.** `#e58e33` against the `#d58a1c` target — +16/+22/+23 per channel,
   just outside the stated 15% bound. p95, p50 and p25 are inside or exact.
6. **Missile trail mean V.** The *number* reproduces (0.37–0.43 against the 0.37 target)
   and is wrong — see defect 2 below.

## Measurement problems, not just implementation problems

Four more criteria are themselves defective. A developer who satisfies them exactly will
still fail.

1. **The R3 jet criteria cannot distinguish our jet from the arcade's.** Measured at native
   scale with one operator on both:

   | statistic | ours | arcade (t175) | discriminates? |
   |---|---|---|---|
   | silhouette aspect (max row width ÷ height) | 2.478 | **2.475** | no |
   | fin-region max width, filled-pixel, 30% onset | 12.3% | **16.2%** | no |
   | step span (25%→80% of max) | 4.35%H | — | no |
   | **fin rows containing 2 separated blades** | **8 / 21** | **21 / 21** | **yes** |
   | **fin-pair lateral extent, % of span** | **12.3%** | **35.3%** | **yes** |
   | **nozzle-centre separation, % of span** | **14.0%** | **30.4%** | **yes** |

   A 1-D row-width profile cannot see that the arcade's fins are two *separated, outboard,
   canted* blades rising from widely-spaced nacelles while ours is one solid centred bar
   with the nozzles touching at the midline. **Replace the aspect/fin%/step triple with the
   bottom three rows**, keeping aspect and span only as sanity bounds.
2. **The missile-trail value target comes from a night frame.** REFERENCE.md's "overall mean
   V 0.37" was adopted from a measurement against `ab2-arcade-night-missiles.jpg`. On the
   stage-1 daylight reference `stage1-missile-salvo-t100.75.png` the plume measures **mean
   V 0.966, median 0.969, p10 0.941, saturation 0.051**, and is **34–67%W** wide. Make the
   trail value **per-stage**; stage 1 is white.
3. **The explosion percentile targets come from t357, where the "fireball" is a fading smoke
   mass in a desert-tinted frame.** Ours now matches those targets. Against
   `ab2-arcade-huge-explosion.jpg` instead: arcade mean V **0.882** with **47.7%** of fireball
   pixels above V 0.95 and p95 `#efff68` (near-white yellow); ours is mean V **0.792** with
   **20.1%** above V 0.95 and p95 `#fb9352`. The remaining visible gap is the **missing
   white-hot core**, and the t357-derived criterion cannot see it.
4. **Cloud size criteria must name their operator** (see claim 3). Specify "bright + low-sat
   threshold at native scale", since that is how the arcade numbers were taken.

## Ranked gaps for Round 5

### 1. The enemy aircraft is a slab with a bullseye
`cmp-10`. The head-on sprite is a flat grey rectangle carrying a large black-rimmed red
disc, two grey trapezoid fins and flat white wing planks with hard banding. The arcade's
enemies are slender swept jets with a visible nose, tapered wings and a small orange
nozzle. Every frame of combat now carries 2–3 of ours at 10–27%W.
**Reproduction to satisfy**: at ≥15%W on screen, the sprite shows (a) a fuselage whose
width is ≤35% of span, (b) wings with visible sweep — leading edge rising ≥15° from
horizontal — and tapered tips, (c) no single feature occupying >12% of silhouette area,
(d) ≥2 distinguishable enemy types by silhouette at that size. Judge it on a 4× crop
against t100/t116 side by side, not on a palette statistic.

### 2. The player jet's fins and nozzles are in the wrong place
`cmp-09`. **Reproduction to satisfy**: fin region shows **two separated blades in ≥90% of
its rows** (arcade 21/21, ours 8/21); **fin-pair lateral extent 30–40% of span** (arcade
35.3%, ours 12.3%); **nozzle-centre separation 25–35% of span** (arcade 30.4%, ours 14.0%);
blades canted outward (top of each blade further from centreline than its root). Hold
aspect in 2.4–3.0, span 34–38%W, centroid 52–60%H as bounds.

### 3. HUD typography and the missing contrast plates
`cmp-07`, `cmp-08`, `evidence_hudbot_s2.png`. The words read; the HUD does not look like
AB2's, and on stage 2 the stage digit vanishes entirely into the ground.
**Reproduction to satisfy**: white/black plate behind SPEED and STAGE so every element
stays readable over all three stage grounds (test by capturing the bottom strip on stages
1/2/3 and requiring ≥3:1 luminance contrast against the local background in every one);
emblem red extent back inside ±20% (SCORE ≤20.3→≤20.3%W is currently +20.1%, HIT +41.8%);
emblem wings as swept chevrons, not striped rectangles; glyphs carry a dark outline;
throttle scale digits inline with the bar (`0····■■2 - 3`), not floating above it; add the
bottom-left aircraft-position icon.

### 4. Missile trail is black where the arcade's is white
See defect 2. **Reproduction to satisfy**: stage-1 trail mean V ≥0.85, saturation ≤0.15,
head thickness 12–20 native px, per-component occupancy ≥95% (already met), with a
launch billow ≥25%W for ~1 s. Keep a separate, darker value for night stages.

### 5. Three lives last well under a minute
Snapshot build: deaths at t=5.0 / 23.5 / 37.5 s on `?demo=1` seed 4 (4.8/min). Re-measured
on `62f1539` (which adds the longer first-fire delays and a tighter wave gap):
**3.50 / 3.50 / 3.00 deaths per minute on seeds 4 / 5 / 6 over 120 s each**. The arcade is
hard, but a stock of 3 does not evaporate in 55 seconds, and the attract loop a judge or a
new player watches spends most of its time in the death animation.
**Reproduction to satisfy**: ≤1.5 deaths/minute averaged over ≥3 minutes of `?demo=1`
across ≥3 seeds, with enemy shot volume unchanged (the fix should be lead/accuracy and
hit-box, not fewer shots).

### 6. Stage 2 and stage 3 grounds have no structure
Stage 2 is undifferentiated brown/cream dither where the arcade has a forest canopy cut by
a pale road; stage 3 is pure black with cream speckles where the arcade has a dithered
dark-blue field. The *palettes* are defensible; the absence of any ground feature is not.
This is the same family as the missing island/landmass in stage 1.

### 7. Clouds are too small and too few to read as banks
Threshold operator: p90 width **8.56%W** against the arcade's 21.49. The arcade's stage-1
sky carries big cumulus masses that the jet flies past; ours carries 1–3 small puffs.
Presence (67.5%) and height are right — do not retune those.

### 8. Title screen is a layout match with placeholder typography
`cmp-04`. Colour assignment (blue A, red B, magenta CREDIT, blue SEGA 1987) and layout are
right; the letterforms are plain blocky sans where the arcade's are angular/italic with a
sphere-textured flaming "II", and our "INSERT COIN!" is roughly 2× oversized. There is also
no attract-mode *gameplay* demo — the title just times out to flight after 8 s.

### 9. Card sizing and colour
Continue card: "CONTINUE PLAY" spans ~62%W against the arcade's ~35%; "INSERT COIN" is cyan
and should be red; the countdown digit is drawn behind the player jet. Tally card: the
arcade colours the *label* red and the *number* cyan on both lines; ours colours whole
lines. "READY" sits low enough to collide with the bottom HUD row.

### 10. Still absent
Barrel roll; throttle/speed control (the bar is decorative); resupply/reload stages; the
23-stage structure (stage index wraps to stage 1's palette after 3 while the HUD digit
keeps counting); enemy variety and liveries; canyon stages; lock brackets that enclose
their target rather than scattering four loose corners near it.

### 11. Explosions have no white-hot core
See defect 3. Low priority — the palette fix was the big win — but it is the difference
between "orange cloud" and "fireball".

## Evidence

All under `/Users/urizonens/dev/afterburner-three/judging/R4/`. Ours is **LEFT / TOP**,
arcade **RIGHT / BOTTOM**, labelled in-image.

- `cmp-01-neutral-flight-ours-left-arcade-right.png` — ours `?fixed=1&seed=1` vs t116.
- `cmp-02-banked-ours-left-arcade-right.png` — ours mid-bank vs t97.
- `cmp-03-combat-ours-left-arcade-right.png` — ours `?demo=2` t=5.7 s, 14 enemies, vs t100.
- `cmp-04-title-ours-left-arcade-right.png` — `?showtitle=1` vs t74.
- `cmp-05-death-ours-left-arcade-right.png` — peak starburst (53.4%W) vs gp t202.
- `cmp-06-night-stage3-ours-left-arcade-right.png` — stage 3 night vs t175.
- `cmp-07-hud-top-ours-TOP-arcade-BOTTOM.png`, `cmp-08-hud-bottom-...` — matched native scale.
- `cmp-09-jet-sprite-ours-TOP-arcade-BOTTOM.png` — **the single most important image.**
- `cmp-10-enemy-sprite-ours-TOP-arcade-BOTTOM.png` — the new headline defect.
- `evidence_death_grid2.png`, `evidence_respawn2.png` — full death→tumble→READY cycle.
- `evidence_hudbot_s2.png` — the invisible stage-2 stage digit.
- `evidence_brackets_ours.png` / `evidence_brackets_arcade.png` — bracket weight and geometry.

Captures: `tools/out/judge-r4/{flight,neutral,jet-on,jet-off,bank,bank-off,title,demo2,
s-demo2,s-play,sync-demo2,best,clouds,clouds1,clouds1nc,expl,trail,trail-bg,t2,t2bg,brk,
vulcan,death,death2,death3,tally,cont,cont2,stages,hudmask,audio-title,audio-death}`.
No capture reported a page error. No source file was modified.

## Recommendation

Send back, but this is a send-back from a much higher base than R3's. Fix the four
measurement defects first — in particular the jet-silhouette triple (defect 1) and the
trail value target (defect 2), because gap 2 cannot be closed against the criteria as
written and gap 4 was actively *caused* by the criterion as written.

Then take gaps 1 + 2 as one sprite-art task (the enemy and the player jet are the same
problem: silhouettes authored to statistics instead of to the reference crop), gap 3 as a
HUD-plate task, and gap 5 as a tuning task. Gaps 6–11 are additive and can run in
parallel. Audio needs a human ear before it can be scored at all.

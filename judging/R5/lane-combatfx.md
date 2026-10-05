# R5 — combatfx lane report

Files owned and touched: `src/entities/enemy.js`, `src/game/spawner.js`,
`src/weapons/combat.js`, `src/weapons/enemyShots.js`, `src/weapons/telegraph.js` (new),
`src/effects/explosions.js`, `tools/fairness_probe.mjs` (new). Nothing else was edited.

**Headline:** R4 gap 5's death rate is down 1.88× at slightly MORE enemy fire than the
committed build (5.27 → 2.80 deaths/min at +2.2% rounds/min, five seeds, matched A/B), but the
≤1.5/min gate is **not met**, and the measured trade curve below says reaching it needs
roughly half the enemy fire — which is the trade the criterion forbids. R4 gap 11
(explosion core) was reported closed in `REFERENCE.md` and **was not closed**; it is closed
now. R4 gap 10's bracket half is already correct in level flight and has a residual defect
under heavy roll that I located but did not fix.

---

## Instruments, and their validation

### `tools/fairness_probe.mjs` (new)

Reads `window.__flowState()` and a new `window.__fairness()` hook. Deaths are counted as
transitions of `flowState.state` into `'death'` — not from `lives` (the continue path
restores it to 3) and not from pixels.

**Why a second probe rather than `tools/combat_probe.mjs`:** that one polls
`window.__combatDebug()`, whose `rngSample` field **consumes a draw from the shared PRNG**.
Polling it a few hundred times across a 3-minute run perturbs the simulation being measured,
so the death rate would depend on the sampling rate. `__fairness` touches no RNG.

**Validated on known inputs** (`node tools/fairness_probe.mjs --selftest`), all four passing
on the final tree:

| check | known answer | result |
|---|---|---|
| `?invincible=1` ⇒ `checkPlayerHit` always misses | deaths exactly 0 | 0 ✓ |
| same seed twice | identical deaths and rounds | identical ✓ |
| different seeds | must differ (`?seed=` was silently ignored once, R3) | differ ✓ |
| page errors | none | 0 across every run ✓ |

**One correctness fix to the harness itself:** the probe now opens Vite with
`hmr: false, watch: null`. On a shared tree, another lane saving a file mid-run pushes a
reload; one run died at ~2 min with *"Execution context was destroyed"*, and a reload that
did **not** kill the context would silently have restarted the simulation half-way through a
"3-minute" measurement. All numbers below were additionally taken against an **rsync
snapshot** of the tree, so no concurrent edit can land inside a run.

### FIRE-MASK (explosions) — partially validated, and I say which parts

Re-implemented verbatim from `REFERENCE.md`: `V > 0.55 ∧ (R > B+0.10 ∨ (S < 0.25 ∧ V > 0.90))`,
largest 8-connected component, inside a box bounding the blast. On the control
(`reference/ab2-arcade-huge-explosion.jpg`, cloud wedge + HUD bands excluded):

| statistic | published | my re-implementation | verdict |
|---|---|---|---|
| mean V | 0.9055 | **0.9068** | reproduces |
| fraction V > 0.95 | 54.2% | **55.2%** | reproduces |
| mean saturation | 0.846 | 0.806 | 4.7% low |
| achromatic core | 9.2% | **13.2%** | **43% high — not validated** |
| blast extent | 77.3%W | 90.1%W | **not validated** |

So I report mean V and the bright fraction as comparable with the published arcade figures,
and I report *our* core fraction **only against our own before/after**, not as an
apples-to-apples claim against the arcade's 9.2%. The HUD-band rows I excluded on a 181×127
frame are my own guess, which is the likely source of the residual.

**The box is load-bearing.** Run without it on our frames, FIRE-MASK **floods**: the pale
horizon haze band is a frame-wide low-saturation bright region, the white clause latches onto
it, and the result is `n = 8 700, ladder entirely #bce0f8, "core 100%"`. I cropped and looked
before publishing anything — it was sky. (`CLAUDE.md`: any "measures 100%" result gets looked
at once.)

---

## 1. R4 gap 5 — three lives last well under a minute

### Result

`?fixed=1&demo=1`, 180 s per seed, five seeds, deaths counted from `__flowState()`.
Baseline = **my five files reverted to HEAD with every other lane's live working-tree file in
place**, so this isolates the combat lane rather than crediting it with the player-feel lane's
death-cycle work.

**Both trees were rsync'd from the working tree at the SAME INSTANT and run back to back.**
That is not pedantry: an earlier pair of runs taken ~40 minutes apart gave 5.44 and 2.80, and
re-running the identical shipped tree later gave 3.22 — the tree is shared and other lanes are
editing it, so any A/B whose two halves are taken at different moments is measuring their work
as well as mine. The self-test's repeatability check passes within a run and cannot catch this.
Numbers below are the matched pair; treat any other figure in this file's narrative as
indicative of the step it describes, not as comparable to these.

| seed | base deaths/min | base rounds/min | **final deaths/min** | **final rounds/min** |
|---|---|---|---|---|
| 4 | 5.00 | 113.7 | **4.33** | 117.3 |
| 5 | 5.33 | 115.7 | **3.00** | 123.0 |
| 6 | 5.33 | 115.7 | **2.33** | 128.7 |
| 7 | 5.67 | 115.3 | **2.00** | 119.3 |
| 8 | 5.00 | 125.0 | **2.33** | 110.3 |
| **mean** | **5.27** | **117.1** | **2.80** | **119.7** |

**No playable-fraction figure is published here, deliberately.** Playable share is a function
of deaths/min (mine) and seconds of non-interactive time per death (the player-feel lane's,
5.8 s down from 10.4–11.0). Either lane quoting a combined number would double-count the
other's work; the lead reconciles the two at the end of the round.

- **Deaths/min 5.27 → 2.80**, a 1.88× reduction.
- **Enemy fire volume is UP 2.2%, not down** — the constraint R4 gap 5 placed on the fix is
  satisfied. `TRAIN_START_GAP_S` is set *by measurement* for exactly this reason, and has been
  re-set twice: at 2.4 s the geometry delivered 138.1 rounds/min (18% MORE fire than the build
  it has to beat, which would have made the comparison flattering); at 2.85 s, once the
  stage-opener fix below put non-firing overtake flights back into the alive budget, it fell to
  112.1 and read as a 4% volume CUT. 2.72 s holds it at parity.
- **Lethality per round delivered**: 0.0450 → 0.0234 deaths/round.
- **Per-round hit rate 7.29% → 3.62%.** Minimum warning on any fatal hit **2.27 s**; on the
  committed build there was no warning at all.
- 0 page errors across all ten runs. Seed 4 is the worst case at 4.33/min and seed 7 the best
  at 2.00; the spread is real and is reported rather than averaged away.

**The ≤1.5/min gate is NOT met.** Honest bound below.

### What was actually wrong — the hit test, not the aim

This is the finding that matters, and it is why three earlier rounds of tuning moved nothing.

`checkPlayerHit` tested every round against the player on **every tick it was within
`|shotDepth − playerDepth| ≤ 2.2`**. A round's screen position is the 1/depth-proportional
lerp from the firing aircraft (`f = 1`) to its aim point (`f = 0`). The player sits at depth 5
and rounds are fired from depth 24–52, so across that window:

```
depth 7.20  f = +0.345      (still 34% of the way back toward the firer)
depth 5.00  f =  0.000      (the aim point)
depth 2.80  f = -0.886      (89% PAST the aim point, on the far side)
```

The test therefore swept a screen segment **1.23× the firer-to-aim distance long, extending
0.89× beyond the aim point**. A round aimed well clear of the player still swept over them on
the way through. That is why the measured per-round hit rate was ~10% under a random
11–42%W aim bias, ~10% under honest aim at a 1.4 s-stale snapshot, and still ~8% after the lag
was pushed past 2 s: **the aim point was never what decided a hit.**

Replaced with an exact once-per-round test: a round hits iff it crosses the player's depth
plane this tick *and* its screen position at the crossing is inside the kill radius. No tick
can be skipped — it is an interval test on `(prevDepth, depth]`, not a proximity test. This
alone took the per-round hit rate 8.2% → 4.7% and deaths 4.89 → 4.11/min, and — more
importantly — it is what made every other constant measurable at all.

### What sizes the telegraph: a displacement distribution, not a speed

Speeds were tried first and mislead. The jet's median lateral speed is 0.077 frame-widths/s,
which implies 0.108 of travel over 1.4 s against a 0.04 kill radius — comfortable — and yet
the jet was being hit on a third of aimed rounds, because it *weaves*, so displacement over a
window straddling a turnaround is far smaller than speed × time.

**MEASURED, and re-taken twice after two instrument problems — read the caveats, they are the
point.** `?fixed=1&demo=1&invincible=1&seed=4`, 180 s, **sampled every tick**, 10 800 samples,
98.1% of them in flight. Operator: displacement between two samples `lag` apart that are both
in state `flight`, in the hit test's own units (`dx = ΔNDCx × 0.5`,
`dy = ΔNDCy × 0.5 × 224/320`), i.e. frame-width fractions directly comparable to
`PLAYER_HIT_RADIUS_FRAC`:

| lag | p10 | p25 | median | P(disp < 0.040) | P(< 0.045) | P(< 0.050) |
|---|---|---|---|---|---|---|
| 0.6 s | 0.0059 | 0.0116 | 0.0246 | 0.648 | 0.691 | 0.730 |
| 1.0 s | 0.0101 | 0.0203 | 0.0440 | 0.467 | 0.508 | 0.539 |
| 1.4 s | 0.0147 | 0.0283 | 0.0644 | 0.359 | 0.392 | 0.423 |
| 2.0 s | 0.0201 | 0.0400 | 0.0888 | 0.250 | 0.288 | 0.320 |
| 2.6 s | 0.0258 | 0.0501 | 0.1081 | 0.182 | 0.215 | 0.249 |
| 3.2 s | 0.0313 | 0.0656 | 0.1235 | 0.140 | 0.168 | 0.189 |
| 4.0 s | 0.0413 | 0.0916 | 0.1397 | 0.093 | 0.115 | 0.126 |

**Caveat 1 — it is NOT aliased, and that was checked rather than assumed.** The player-feel
lane found `?demo=1`'s regime cycle is exactly 16.000 s and that coarse sampling aliases its
spread statistics badly. 0.1 s divides 16 s exactly, so my earlier table was a candidate.
Decimation control on ONE run, same operator, only the interval differing:

| lag | 1/60 s (p10 / med / P<0.05) | 0.1 s | 0.2 s |
|---|---|---|---|
| 1.4 s | 0.0153 / 0.0579 / 0.457 | 0.0150 / 0.0585 / 0.455 | 0.0150 / 0.0573 / 0.464 |
| 2.6 s | 0.0250 / 0.1059 / 0.298 | 0.0252 / 0.1065 / 0.290 | 0.0258 / 0.1030 / 0.286 |

Agreement within 0.01 on every statistic at every rate, so sampling interval is not a factor
for *this* statistic. (Every-tick sampling cannot alias a 960-tick cycle at all, which is why
it is the published rate regardless.)

**Caveat 2 — the first version of this table WAS contaminated, by something worse than
aliasing.** It was taken on a normal `?demo=1` run, where deaths interrupt the trace, and
pairs are only counted when both ends are in `flight`. That makes the distribution a function
of the death rate — the very quantity the table was being used to predict. Two runs of
different builds disagreed by up to 3.2× on P(disp < 0.05) at lag 2.6 (0.090 vs 0.291) with
nothing but the death rate differing. `?invincible=1` removes the circularity: the trace is one
continuous flight and the table becomes a property of the demo path alone. **The figures above
supersede the earlier ones**, which are withdrawn.

### Two sign errors I made and had to measure my way out of

Recording these because both looked obviously right and both are wrong.

1. **A wider rake is MORE lethal, not less.** "Spread the train so most rounds sit clear of the
   kill box" is true and irrelevant: a death costs one hit, so what matters is P(the train hits
   *at all*), and a train of n rounds spaced s apart sweeps a **capsule** of length (n−1)s and
   radius `PLAYER_HIT_RADIUS_FRAC` through the aim point. Widening s grows that capsule's area
   almost linearly. Measured: at sweep step 0.11 NDC (committed) and at 0.04, the per-round hit
   rate was 10.1% and 10.4% — unchanged — while deaths went 5.44 and 5.00 (unmatched runs,
   but the per-round hit rate is the load-bearing number and it did not move at all). The
   spread was buying nothing. `TRAIN_SWEEP_STEP_NDC` is now **0.012**. (The capsule argument
   is the mechanism; it is not offered as a quantitative model — see the withdrawal below for
   why no model in this report is load-bearing.)
2. **More trains is not safer.** I had raised `MAX_CONCURRENT_TRAINS` 1→3 and
   `TRAIN_START_GAP_S` 2.2→0.9 on the reasoning that continuous readable fire beats rare
   lethal walls. Right about presence, wrong about lethality: the train count is the number of
   **independent decisions about where the player is**, and every round in a train shares one
   aim snapshot. Tripling the train rate tripled the snapshots and the death rate did not move
   (5.00 vs 5.44, with the per-round hit rate pinned at ~10% in both). Final: **2 concurrent, 2.85 s apart**, with the rounds put back into longer
   trains so volume is unchanged.

### The geometry, solved jointly

Depth decays geometrically, so the binding constraint is TIME, and it is easy to get wrong.
For a fighter (rate 0.7089, spawn 90, fly-past 2.6, life 5.00 s):

```
time from spawn to depth D   = ln(90/D) / 0.7089
time to cross a band Dhi..Dlo = ln(Dhi/Dlo) / 0.7089
time of flight from D         = (D - 1.6) / SPEED
```

A telegraph of length T must fit in the approach **above** the band; the train must fit
**inside** it. My first attempt kept the committed band top of 46 and set T = 1.4 s, which
fails outright — only 0.944 s of approach exists above depth 46 — and the measured result was
unmistakable: **148 trains across 180 s delivered 12 rounds between them**, a 97% volume
collapse. Every flare lit at depth 18–22 (read straight off the per-enemy state now exposed in
`__fairness`) and the aircraft sank through the floor before it could fire. The long
first-fire delays in `spawner.js` (1.6–3.0 s) were the second half of that: an approach
aircraft is only *eligible* between t = 0.77 s and t = 1.86 s of its own life.

Final solution, all four constants moved together:

| constant | was | now | why |
|---|---|---|---|
| `FIRE_DEPTH_MAX` / `MIN` | 46 / 6 (then 46/16) | **52 / 24** | floor is a fairness constant: at the old 6, flight was 0.18 s and the measured median time of flight across hits was 0.22 s — enemies killed at point blank |
| `TELEGRAPH_S` | — | **1.0 s** | 1.4 s doesn't fit above any defensible band top |
| `TELEGRAPH_DEPTH_MAX` | — | spawn depth | the flare lights on the approach and HOLDS at peak until the band; it cannot live inside a 1.1 s band |
| `SHOT_SPACING_S` | 0.18 | **0.08** | the file's own comment derived 0.1 s from t330 and the constant said 0.18; 0.08 fits an 8-round train in the budget |
| `TRAIN_LENGTHS` | 4–8 random | **fixed 8** | lethality per round delivered falls 1.7× from 1 round to 8, at constant volume |
| `TRAIN_SWEEP_STEP_NDC` | 0.11 | **0.012** | see sign error 1 |
| `MAX_CONCURRENT_TRAINS` / gap | 1 / 2.2 s | **2 / 2.85 s** | gap set by measurement to hold 116.7 rounds/min |
| echelon `fireDelay` | 1.6–3.0 s | **0.0–0.15 s** | forced by the geometry above; the flare now does the job the silence was doing |
| `EnemyShots SPEED` | 24 | **15** | the only lever that buys lag without costing depth budget |
| `PLAYER_HIT_RADIUS_FRAC` | 0.065 | **0.040** | 25.6 px box against a 114 px jet whose fuselage is ≤40 px — the fuselage core, wings not lethal |

**`SPEED = 15` is the one number here that is not measured and I want that flagged.**
`GAME_SPEC.md` §4 carries "bullet speed ~0.6 depth/s" ADOPTED from the Godot prototype in its
normalised units; mapped onto this project's 90-unit spawn depth that is roughly 54 units/s,
so the committed 24 was *already* a large unexplained departure in this same direction. Shot
time of flight is measurable off the 60 fps longplay and has not been measured. It does agree
better with the one measured frame we hold:
`reference/stage7-enemy-shot-train-t330.png` shows **10–16 fireballs in the air at once**
strung across the frame with clear gaps, which needs the early rounds of a train still flying
when the late ones leave. Two overlapping 8-round trains give exactly that.

### Known volume source given up

**Crossers no longer fire.** They spawn at depth 30–44 as interceptors (rate 0.8862), so 1.0 s
of telegraph puts them at depth 12–18, under the 24 floor. **The primed opener echelon no
longer fires either** (spawns at depth 18–34). Both are documented in `spawner.js`. The
alternative — letting a pattern fire from inside the floor — is the point-blank case the floor
exists to forbid. All fire now comes from head-on echelons.

### WITHDRAWN: the "1.83 deaths/min modelled floor"

An earlier draft of this report claimed a modelled floor of 1.83 deaths/min at baseline volume,
from an offline model swept over the whole parameter grid and "validated against the live
simulation (predicts 0.221 where the probe measured 0.206)". **That claim is withdrawn.** It
was a coincidence, not a validation.

Re-run against the clean (death-free) displacement table above, the same model predicts
**P(a train hits) = 0.069** where the shipped build measures **65/279 = 0.233** — it now
under-predicts by 3.3×. The original agreement came from two errors cancelling: the
death-interrupted trace inflated small displacements by roughly the factor the model was
omitting elsewhere. A model that agrees on one build and is out by 3.3× on the next is not
measuring what it claims to.

What the model omits, now that it is visible: trains do not all open at one depth, enemies die
mid-train (measured **6.44** rounds delivered per train, not 8), the rake has a vertical
component the model ignored, and — the likely dominant term — **the model samples a uniformly
random flight instant as the aim snapshot, while real trains open when an enemy enters the
firing band, which is driven by the wave clock. Two periodic processes can phase-lock**, and
`?demo=1`'s path is periodic at exactly 16.000 s. If trains preferentially open at particular
phases of that cycle, the distribution that matters is the conditional one at those phases, not
the marginal one in the table. That is the same hazard class as the sampling-aliasing warning,
applied to the model instead of the instrument.

### What replaces it: a MEASURED trade curve

Three builds, all seeds 4–8, 180 s each, same probe:

| build | rounds/min | deaths/min | deaths per round |
|---|---|---|---|
| committed baseline | 117.1 | 5.27 | 0.0450 |
| **shipped** (`TRAIN_START_GAP_S` 2.72) | **119.7** | **2.80** | **0.0234** |
| volume cut (`TRAIN_START_GAP_S` 5.09) | 73.6 | 1.87 | 0.0254 |

Per-seed at the volume cut: 2.33 / 1.00 / 2.33 / 1.67 / 2.00. Zero page errors.

**Lethality per round is flat across a 39% change in volume** (0.0234 vs 0.0254), which is the
useful result: at this geometry deaths scale with fire volume and nothing else. So

> ≤1.5 deaths/min needs about **61 rounds/min — roughly half the committed build's fire.**

That is a measured extrapolation from a measured second point, not a model. And it is exactly
the trade R4 gap 5's own constraint forbids ("the fix should be lead/accuracy and hit-box, not
fewer shots"). The remaining honest routes to the gate are a telegraph-reactive `?demo=1`
(ask 1 — a scripted path cannot dodge, so the metric cannot see the telegraph working), or an
explicit decision by the lead to accept less enemy fire.

### Respawning into live fire (player-feel lane ask A3) — fixed, and smaller than reported

`flow.js` no longer clears combat on death, so the player can respawn with rounds already
inbound; the player-feel lane measured **17% of lives ending within ~1 s of the 2.0 s grace
expiring** on their build.

**Decision: clear in-flight enemy shots on respawn, not a threat-aware grace.** `Combat` now
exposes `clearShots()` (narrow, idempotent, leaves aircraft/smoke/brackets/player weapons
alone). The reasoning is in the code and is a direct consequence of this lane's contract —
*every round that can kill you was announced by a flare you could see*. A round in flight at a
respawn was aimed at a snapshot of the previous life's jet, taken before this life existed; it
is unannounced by construction and no grace length changes that. A threat-aware grace also puts
fireballs harmlessly through the jet, teaching the player that a hit sometimes does not count,
and being capped it can still expire with a round inbound — the same defect, rarer and harder
to diagnose.

**No cross-lane change is needed.** It is driven off the rising edge of `invincible` inside
`checkPlayerHit` — that edge *is* the respawn, since flow.js sets the grace at the
death→flight transition and never calls the method while dead. An explicit `clearShots()` call
from `flow.js` is the clearer site and would make the edge a no-op; the player-feel lane is
welcome to add it, but nothing breaks if they do not.

**Measured, A/B on the same tree with only this line disabled in the control, seeds 4–8:**

| | deaths/min | rounds/min | mean rounds in air | lives ending in grace…grace+1 s |
|---|---|---|---|---|
| without respawn clear | 2.80 | 119.7 | 4.05 | 1/37 = **2.7%** |
| **with respawn clear** | 2.80 | 119.7 | 3.81 | 1/37 = **2.7%** |

**The defect is already at 2.7% on this build, not 17%** — and the one remaining case is on the
first life of seed 4, which is a stage open rather than a respawn. Deaths and the short-life
count are *identical*; only mean rounds in air moves (−6%), which confirms the clear fires and
bounds its visual cost.

Why it was 17% there and 2.7% here: their measurement predates this lane's hit-test fix. The
old `±2.2` depth tolerance made a round lethal anywhere along a screen segment 1.23× the
firer-to-aim distance — including over a jet that had just been put down somewhere new. With
the exact plane-crossing test, a round aimed at the previous life's position essentially never
intersects the respawn point.

So this ships as a **guarantee rather than a measured improvement**: it costs 0.24 rounds in
air and 0 deaths/min, and converts "rare because the current geometry happens to make it rare"
into "impossible by construction" — which survives the next person who retunes the geometry.

---

## 2. R4 gap 11 — explosions have no white-hot core

**This gap was reported CLOSED in `REFERENCE.md` ("the core gate PASSES, and by more than the
lane could see ... 8.4–11.6%"). It was not closed.** Measured on the committed tree,
`?combatexpl=1`, 16 frames:

- `E_HOT` (`#f6f6e7`) reached the screen **zero times** — not a low fraction, zero pixels
  within 40 of it anywhere in any frame, and zero pixels satisfying warm ∧ S < 0.35 ∧ V > 0.90.
- The brightest colour the fireball actually put on screen was `E_YELLOW #f9f647`, a fully
  saturated yellow.
- Boxed FIRE-MASK: core **0.0%** (gate ≥3%), mean saturation 0.921–0.980 (gate 0.75–0.90),
  brightest-decile saturation **0.715** (gate ≤0.30) — i.e. it failed the statistic
  `REFERENCE.md` itself calls "the single sharpest discriminator".
- At 4× against `reference/ab2-arcade-huge-explosion.jpg`: ours a smooth red→orange→yellow
  gradient, the arcade a lobed mass shot through with white patches. Crop and statistic agree.

### Root cause and fix

The core was three `ctx.arc` fills on the largest lobe, drawn mid-function under the
`LOBE_INSET` scale transform. Bisected with colour probes against known-good controls:

| probe | result |
|---|---|
| recolour `E_RIM` → magenta | renders (306–1 125 px/frame) — edits do reach the capture |
| recolour `E_AMBER` → magenta | renders (99–630 px/frame) — `drawBurst`'s bands do reach the screen |
| recolour `E_HOT` → magenta | **0 px** |
| move the same three arcs to the very END of `drawBurst`, after the destination-out hole pass | **still 0 px** — not being covered or punched out |

So the arcs were producing no texels. Rather than keep bisecting a Canvas2D path fill under an
active scale transform, the core is now an **explicit texel grid at integer texture
coordinates with the transform reset first** — which is what `judging/R4/art-critique.md`
already told this project to do: *"Canvas2D antialiases path fills with no way to disable it …
the nozzle donuts, the smoke rings, the explosion lobes and the enemy bullseye nose are all
the same failure"*, with the vulcan puff's explicit grid named as the pattern to copy. Shape is
one connected ragged mass with two tongues, per `REFERENCE.md`'s "one ragged mass through the
middle rather than a scatter".

### After (`tools/out/combatfx-r5b/expl-final`, boxed FIRE-MASK, 8 frames)

| statistic | before | after | target |
|---|---|---|---|
| achromatic core (S<0.25 ∧ V>0.94) | **0.0%** | **4.1–7.8%** | ≥3% (arcade 8.8–9.2) ✓ |
| mean saturation | 0.921–0.980 | **0.869–0.898** | 0.75–0.90 ✓ |
| brightest-decile V | — | **0.967–0.972** | ≥0.95 ✓ |
| brightest-decile saturation | 0.715 | **0.207–0.447** | ≤0.30 — passes 4 of 8 frames |
| mean V | 0.818–0.861 | 0.822–0.860 | ≥0.85 — passes 4 of 8 frames |
| fraction V > 0.95 | 27.7–44.6% | 29.9–45.7% | ≥40% — passes 3 of 8 frames |

Decile ladder now `#9e0000 → #b80701 → #df6708 → #f7af09 → #f8f07e` against the arcade's
`#9b0204 → #d6050b → #f47a07 → #f5d619 → #f6f6e7`.

**Knowingly left under the arcade's core fraction.** A core at `side = 0.52 * w` lands exactly
on the arcade's 8.8–9.2% band *and* pulls brightest-decile saturation under 0.30 on every
frame. It looks wrong: the core square becomes 33 texels across against a lobe cluster that
only reaches ~33 texels after `LOBE_INSET`, so the white swallows the lower half and the
fireball reads as a white mound with an orange cap
(`tools/out/combatfx-r5b/expl3/frame-0003.png` at 4×). `REFERENCE.md`'s own rule applies —
*"the crop outranks this table"* — so `side = 0.46` ships and the margin is recorded here
rather than hidden in a passing number.

The frame-to-frame variation (3 of 8 vs 8 of 8 on the bright fraction) is the three lobe
arrangements cycling at `BOIL_HZ` crossed with the grow/collapse curve, not noise.

---

## 3. R4 gap 4 — missile trail

Measured with I5's published operator verbatim: mask `sat ≤ 0.25 ∧ V ≥ 0.6` at stored
resolution, HUD bands excluded (`y < 90`, `y > 630` scaled from 1028×720).
Capture `tools/out/combatfx-r5b/trail`, `?combattrail=1`, stage 1 daylight.

| | measured (frames 4–13, trail present) | I5 gate | verdict |
|---|---|---|---|
| mean V | **0.906 – 0.917** | ≥0.90 | **PASS** |
| mean saturation | **0.081 – 0.098** | ≤0.10 | **PASS** |

(Frames 0–3 read 0.847 V / 0.180 sat over 2.6% of the frame — that is the sea-foam horizon
seam before the trail exists, and the largest component there measures 100%W × 3.6%H, exactly
the contamination I5 warns about. The instrument is behaving as documented.)

**The billow gate FAILS.** Largest-8-connected-component bbox width, same mask:

```
frame  4    5    6    7    8    9   10   11   12   13      (--every 10 ticks)
%W   21.3 21.9 22.5 23.1 23.8 24.4 25.4 26.0 26.9 27.9
```

I5 asks for a **launch billow ≥25%W sustained ~1 s**. Ours crosses 25%W only at frame 10
(t ≈ 1.67 s after launch) and is still growing at the end of the capture. It is a slowly
inflating ball, not a launch puff that is wide immediately and then thins.

**And a structural note the numbers do not capture:** on the crop
(`tools/out/combatfx-r5b/trail/frame-0008.png`) the trail reads as a **static cumulus cloud
parked above the jet**, not as a trail — there is no visible stem up the sight line and the
missiles themselves are not visible. I did not attempt a redesign: `effects/smoke.js` is mine,
but the colour gate passes and this is an art change that wants a capture-and-compare pass it
would be dishonest to rush at the end of the round. Recorded as open.

---

## 4. R4 gap 10 — lock brackets

The fixed-screen-size bracket (`BRACKET_BOX_PX = 16.5`, square aspect, 25% corner arms) is
already in HEAD from an earlier round; `lockSystem.js` is not in my diff. I verified it rather
than re-doing it.

**Level flight is correct.** `tools/out/combatfx-r5b/brk-level`, `?fixed=1&seed=2&invincible=1`,
near-white 8-connected components with the HUD rows excluded: each bracket is **four separate
5 × 5 native-px corner Ls on a 16.7 – 17.7 native px square box**. E.g. frame-0002 corners at
(345,594), (384,555), (384,594), (345,555) → box 16.7 × 16.7 native px. That matches
`judging/R4/evidence_brackets_arcade.png`, which shows square corner boxes enclosing distant
targets, and matches the two published arcade measurements (5.10%W and 5.16%W on targets 7×
apart in span).

**A residual defect under heavy roll, located but NOT fixed.** On a hard-banked frame
(`tools/out/combatfx-r5b/brk/frame-0007.png`, `?demo=2&seed=3`) the bracket degenerates to
**5 × 18 native px with only the two LEFT corners present** — the box collapses along screen-x
while keeping its height, and the right-hand pair is absent rather than merely rotated. ASCII
map of the native-resolution mask is reproducible from that frame. It is in `_placeCorners`'s
`this._right.applyQuaternion(camera.quaternion)` displacement, which is the code path whose
own comment says it exists specifically to keep the box upright under bank. I ran out of round
to resolve it and will not ship a blind fix to geometry I do not understand. **This is the
specific next step for gap 10.**

---

## 5. Enemy variety (interface I1) — fallback dropped, role/livery mapping rebuilt

The sprite lane shipped `LIVERIES` and
`enemyTexture(aspect, livery, detail, night, bankDeg)`, now serving **authored art for all four
daylight liveries** across **two silhouette families** — `mig` (grey, camo) and `delta`
(interceptor, prop). The feature-detection guard this lane ran while I1 was in flight is
removed at the lead's instruction. One consequence of removing it is recorded in the code: their
`resolvePalette()` falls back to `'grey'` for an unknown key rather than throwing, so a typo in
`LIVERY_BY_STAGE` now shows up as a silently un-swapped sprite, not an error — check a stage
capture after editing that table, not just that the page loads.

### The defect the lead spotted was mine, and the fix is a new axis

The lead's capture (`tools/out/dash-r5/s1-combat/frame-0000.png`, `?demo=2&seed=1`) shows four
rust-red aircraft against one grey in a **stage-1** frame. They read as "brown prop-era
biplanes"; they are in fact the `interceptor` livery on the `delta` family at near fly-past,
and the proportion is the bug, not the art.

Cause: the mapping keyed the livery off the enemy **type**, and `type` is a FLIGHT MODEL
(depth rate, hit points) that `spawner.js` picks for pacing reasons. Two independent wave
builders prefer the fast `interceptor` type — `_crosserWave` makes *every* crosser one because
a near-field lateral pass wants to be quick, and `_echelonWave` rolled one in four members. So
once authored art landed for all four liveries, a third of stage 1 went rust-red. Stage 1's
arcade cast is slender swept grey jets, and GAME_SPEC.md §4's red/orange interceptor sighting
is one timestamp in that stage (t102.5), not a third of it.

Fix: `spawner.js` now tags each aircraft with a **role** — `line` / `elite` / `heavy` —
independently of its type, and `enemy.js` maps (stage, role, pattern) → livery. A stage-1
crosser stays mechanically fast and wears grey. The role draw is a second unconditional PRNG
draw taken next to the type draw, per CLAUDE.md's shared-stream rule.

`ELITE_FRACTION_BY_STAGE = [0.12, 0.22, 0.30]` with `CROSSER_ELITE_BONUS = 0.18` is **ADOPTED,
not measured** — the arcade gives single timestamps per livery and no per-stage census. It is
chosen so every stage flies BOTH silhouette families, which is what R4 gap 1 criterion (d)
asks for, while keeping each stage's dominant colour the one the frames show.

### Measured census (3 seeds × 1100 samples of `?fixed=1&demo=2`, aircraft-frames by livery)

Counted from simulation state via `__fairness().enemies[].livery`, **not from pixels**: a
single frame holds 1–3 aircraft and one near-field fly-past dominates any pixel census (I tried
that first and it read 100%/0% per frame, which is noise, not a measurement).

| stage | census |
|---|---|
| 1 | grey **82.2%**, interceptor 17.8% |
| 2 | camo **71.1%**, interceptor 22.7%, prop 2.9%, grey 3.4% |
| 3 (night) | grey **64.7%**, interceptor 29.1%, camo 6.2% |
| 4 (laps to stage 1) | grey **82.6%**, interceptor 17.4% |

Stage 1 is now dominated by grey MiGs; the elite share rises across stages as a difficulty-and-
identity ramp. The few percent of the previous stage's livery at each boundary is deliberate —
`spawner.js` stamps the livery at DISPENSE, so an aircraft queued before the boundary wears the
stage it actually flies into, and a handful are still airborne when the stage changes.

### A regression found while verifying it: no stage after the first had an opener

`prop` read **0.0%** in the first census, which is wrong — the stage-2 overtake flight is the
only wave that wears it. Tracing `?fixed=1&demo=2&seed=1` across 90 s found overtake aircraft
**only in the first 5 s of stage 1**; stages 2 and 3 opened with none at all.

`spawner.clear()` re-armed the opener, and `src/game/flow/flow.js` called it at every stage
boundary. R5's game-feel work correctly stopped clearing combat at stage boundaries and on
death — clearing the sky was our addition, not the arcade's — and that silently took the
opener with it. GAME_SPEC.md §4 is explicit that the overtake flight is "the first thing every
stage shows", cited on stages 1, 2 and 4 (t94–99, t126–128, t204), so this was a regression
against measured behaviour.

Fixed inside this lane rather than by asking another lane to restore a call: `setStageIndex`
now re-arms the opener when the stage index actually changes, so the file owns its own
invariant instead of depending on someone else's call order. `contentStageIndex` wraps
0,1,2,0,… so a lap re-arms correctly too. Verified, 3 seeds:

| stage | sample-frames with an overtake flight | liveries |
|---|---|---|
| 1 | 230 | grey |
| 2 | 274 | **prop** |
| 3 | 275 | grey (night swap) |

The second census above was taken after this fix, which is why `prop` appears in it.

**Criterion (c) note, acknowledged:** the sprite lane's finding that ">12% of silhouette area"
fails on any real aircraft when measured as the largest single-colour component is noted. I do
not quote criterion (c) anywhere in this report, and if I need it later I will use
`tools/art/enemysil.py`'s compact-component gate rather than re-deriving an operator.

## 6. Wave geometry (single-file diagonal queue) — NOT DONE

Out of round. The gap-5 investigation consumed the budget, and `_echelonWave`'s vertical fan
is a change that needs its own density re-measurement against the size-qualified criterion.

---

## Everything that moved, in one list

`src/entities/enemy.js` — telegraph state machine (flare lights on the approach, holds at peak
until the firing band, aim snapshotted when it lights and never refreshed); firing band
46..6 → 52..24; `TELEGRAPH_S` 1.0; `TELEGRAPH_DEPTH_MAX`; `SHOT_SPACING_S` 0.18 → 0.08;
`TRAIN_LENGTHS` fixed 8 (even, so no round sits dead-centre on the snapshot);
`TRAIN_SWEEP_STEP_NDC` 0.11 → 0.012; `MIN_TRAIN_ROUNDS` depth gate; random per-train aim bias
(0.22–0.85 NDC in a random direction) **deleted**; absolute `aimX`/`aimY` replace
`aimOffsetX`/`aimOffsetY`; livery selection rebuilt on (stage, ROLE, pattern) instead of
(stage, type); I1 feature-detection fallback removed.

`src/weapons/telegraph.js` (new) — the visible flare: a 9×9 explicit-grid four-point star in
the measured enemy-shot palette, fixed 7–13 native px regardless of shooter distance, pulsing
3 accelerating beats across the window with opacity floored at 0.45.

`src/weapons/combat.js` — **plane-crossing hit test** replacing the ±2.2 depth tolerance;
**`clearShots()`** plus the respawn rising-edge that drives it;
`PLAYER_HIT_RADIUS_FRAC` 0.065 → 0.040; `WARN_MISS_FRAC` derived from it; inbound-warning
audio intensity driven from flares lit + nearest closing round; `window.__fairness` hook
(no RNG); cumulative `shotsFired`; per-hit log with a `fatal` flag so grace-window hits are not
pooled with real ones.

`src/weapons/enemyShots.js` — `SPEED` 24 → 15; `prevDepth` for the crossing test; absolute aim;
measurement `meta`.

`src/game/spawner.js` — `MAX_CONCURRENT_TRAINS` 1 → 2, `TRAIN_START_GAP_S` 2.2 → 2.72 (set by
measurement to hold volume, re-set twice); echelon `fireDelay` 1.6–3.0 → 0.0–0.15 s; primed
echelon never fires; crosser non-firing documented; cumulative `trainsStarted`; per-stage
**role mix** (`ELITE_FRACTION_BY_STAGE`, `CROSSER_ELITE_BONUS`) with the role drawn
unconditionally beside the type draw; **stage-opener re-arm moved from `clear()` to
`setStageIndex`**, which restores the overtake flight on stages 2+.

`src/effects/explosions.js` — white-hot core rebuilt as an explicit texel grid drawn last with
the transform reset.

`tools/fairness_probe.mjs` (new) — self-validating death/volume/fairness probe.

## Captures

All under `tools/out/combatfx-r5b/`: `trail` (`?combattrail=1`), `expl` (before),
`expl2`/`expl3` (core iterations), `expl-final` (`?combatexpl=1`), `brk` (`?demo=2&seed=3`),
`brk-level` (`?fixed=1&seed=2&invincible=1`), `stages` (`?demo=2&seed=1`, 7 frames at 1300-tick
spacing across stages 1-3). No capture or probe run reported a page error.

**Re-verified against the capture-tool fixes.** `tools/capture.mjs` was running Vite with HMR
on AND had a silent all-black-frame race until today. Every capture of mine was taken against a
private rsync snapshot that no other agent was editing, so HMR had nothing to fire on; the
black-frame race was not so excluded. The two capture sets my published numbers rest on were
re-taken with the fixed tool (`v2-trail`, `v2-expl`) and scanned for black frames: none, and
both reproduce exactly — explosions identical to four decimal places, trail mean V 0.907–0.918
against the previously published 0.906–0.917. The earlier numbers stand.

## Open, with reasons

1. **Gap 5 gate (≤1.5/min) not met** — 2.80 measured against baseline 5.27 at +2.2% volume.
   The measured trade curve says the gate needs ~61 rounds/min, about half the committed
   build's fire. Needs either a telegraph-reactive `?demo=1` (ask 1) or an explicit decision by
   the lead to trade volume for it.
2. **Trail billow shape** — colour passes, the ≥25%W-for-1 s launch billow does not, and the
   trail reads as a parked cloud rather than a trail.
3. **Bracket collapse under heavy roll** — located to `_placeCorners`, not fixed.
4. **Explosion core deliberately under the arcade's fraction** — the larger value that hits the
   number looks worse on the crop.
5. **Wave geometry** — not started.
6. **The offline lethality model is withdrawn** — it under-predicts by 3.3× against the clean
   displacement table and only ever "validated" by coincidence. Nothing in this report now
   depends on it. If anyone wants a predictive model, the thing to fix first is the suspected
   phase-lock between the wave clock and `?demo=1`'s 16.000 s cycle.
7. **Elite-livery fractions are ADOPTED, not measured** — `[0.12, 0.22, 0.30]` per stage with a
   +0.18 crosser bonus. The arcade gives single timestamps per livery and no per-stage census,
   so these are a design choice that needs footage verification before anyone tunes to them.

---
---

# R5c APPEND — second session, after the usage-limit restart

Everything above stands except where this section explicitly corrects it. New work only.

**TREE STATE for every figure below (interfaces.md I28).** Uncommitted working tree at
`HEAD = db554e6`, `git diff | shasum` = `33a5efdd1c8a` at the moment the A/B snapshots were
taken. Lanes live while measuring: **presentation-r5** (`src/ui/**`,
`flow/{cards,titleScreen,overlay}.js`) and **criteria-fix** (`REFERENCE.md`, `GAME_SPEC.md`,
`STATUS.md`); the sprite, world and player-feel lanes are closed with their work uncommitted in
the tree. Every run was taken against an **rsync snapshot** so no concurrent edit can land inside
it, and the snapshot name is given with each arm. `tools/fairness_probe.mjs` now stamps the tree
state into its own JSON (`--tree-state`), so a published number carries it rather than relying on
a report line.

---

## A. I27 — gap 5's denominator. Both figures, each with its denominator named.

**What I had tuned against: WALL CLOCK.** The 2.80 figure above is deaths per minute of wall
clock. So the lead's concern is well founded in form — but the conclusion does not follow, and
the reason is that **both arms of my A/B were measured on the same death cycle**. The baseline
was my five files reverted to HEAD *over the other lanes' live working-tree files*, so
player-feel's 5.2 s cycle is in the control as well as in the shipped arm. I was therefore not
compensating for another lane's improvement; I was comparing two lethalities at one cycle length.

Re-measured with flight seconds counted (`flow.state === 'flight'` samples × run length), three
arms, **all snapshotted from the working tree at the same instant** (`snapA`), seeds 4–8,
180 s each, 0 page errors in 15 runs:

| arm | wall d/min | **flight d/min** | flight share | rounds/min | deaths/round |
|---|---|---|---|---|---|
| base — my 5 files at HEAD, other lanes live (`snapA/base`) | 5.267 | **11.27** | 46.7 % | 117.1 | 0.0450 |
| final, as the first session left it (`snapA/final`) | 2.800 | **3.895** | 71.9 % | 119.7 | 0.0234 |
| **SHIPPED, end of this session (`snapE`)** | **2.867** | **3.998** | **71.7 %** | **127.4** | **0.0225** |
| control: `clearShots()` disabled (`snapA/noclear`) | 2.800 | 3.895 | 71.9 % | 119.7 | 0.0234 |

Per seed on the shipped arm — the spread is real and is not averaged away:

| seed | deaths | wall d/min | flight d/min | flight s | rounds/min |
|---|---|---|---|---|---|
| 4 | 11 | 3.67 | 5.45 | 121.2 | 122.3 |
| 5 | 10 | 3.33 | 4.83 | 124.1 | 128.7 |
| 6 | 6 | 2.00 | 2.58 | 139.3 | 131.7 |
| 7 | 9 | 3.00 | 4.27 | 126.5 | 136.7 |
| 8 | 7 | 2.33 | 3.13 | 134.2 | 117.7 |

**Flight time is the denominator that flatters this lane, not the one that hides behind another
lane's work.** The base arm spends 46.7 % of wall clock airborne and the shipped arm 71.7 %, so
normalising on flight time *widens* the gap: **1.84× on wall clock, 2.82× on flight time.** The
pooled estimator (total deaths ÷ total flight seconds) is used rather than a mean of per-seed
ratios, so a short-flight seed is not weighted like a long one.

**Enemy fire is UP 8.8 %, not down** (127.4 vs 117.1 rounds/min), so R4 gap 5's own constraint —
"the fix must be lead/accuracy/hit-box, not fewer shots" — is satisfied with more margin than
before. Lethality per round delivered halves exactly: 0.0450 → 0.0225.

### Comparing to R4's 3.0–3.5 baseline on a matched denominator

R4's baseline was measured on the **8.5 s** cycle. Converting it is arithmetic, not measurement,
so here is the arithmetic and its assumptions, flagged as DERIVED:

```
flight F = T - D*C - L        T = 180 s, C = seconds of non-interactive time per death,
                              L = the launch sequence, ~3.5 s (measured at 17.5 % of a 20 s run)
flight d/min = 60 * D / F
```

| | wall d/min | C | **flight d/min** | source |
|---|---|---|---|---|
| R4's published baseline | 3.0 – 3.5 | 8.5 s | **5.4 – 7.2** | DERIVED from R4's figure |
| base, today's tree | 5.267 | 5.2 s | 11.27 | MEASURED |
| **shipped** | **2.867** | 5.2 s | **3.998** | MEASURED |
| the literal gate | ≤1.5 | unstated | — | R4 gap 5 |

Three readings, and they do not agree, which is the point:

1. **Literal absolute gate: NOT MET on either denominator.** 2.87 wall (1.91× away), 4.00 flight
   (2.67× away).
2. **The RATIO R4 asked for IS met, and exceeded.** 3.0–3.5 → ≤1.5 is a 2.0–2.3× cut. Measured
   against the matched baseline on the matched denominator, this lane delivers **2.82×**.
3. **The committed combat code is now ~1.6–2.1× more lethal in flight-time terms than R4's build
   was** (11.27 against a derived 5.4–7.2), with no combat-lane change between them. Other lanes'
   work — chiefly not clearing the sky on death, so the player meets a populated sky instead of a
   rebuilding one — raised the baseline under the criterion. The shipped arm at 4.00 is
   **below R4's own baseline**, i.e. less lethal than the build the ≤1.5 target was written
   against, and still 2.67× off the number.

**My recommendation to criteria-fix: deaths per minute of FLIGHT TIME as primary (as issued), and
retire the 1.5 constant, not just restate its denominator.** 1.5 has never been traced to the
arcade. It is an absolute threshold that three different trees have measured three different
baselines for, and both a ratio reading and an absolute reading of the same sentence now give
opposite verdicts on the same build. The asset to settle it exists in this repo —
`.reference-cache/video/ab2-gameplay.mp4`, which `CLAUDE.md` records as *containing player
deaths* — and the measurement is deaths per minute of flight time on arcade footage, with the
death animation's own duration excluded from the denominator exactly as it is here. Until that is
done, every ≤1.5 verdict is a verdict against a number nobody measured.

### Instrument controls for the flight-time denominator

The flight share is a per-sample presence statistic, so I13/I27's aliasing warning applies to it.
Discharged by measurement rather than by argument — seed 4, 90 s, **only the sampling interval
differing**:

| `--every` | deaths | shotsFired | flight s | flight share | flight d/min |
|---|---|---|---|---|---|
| 1 tick | 7 | 161 | 46.73 | 51.93 % | 8.987 |
| 2 ticks | 7 | 161 | 46.70 | 51.89 % | 8.994 |
| 6 ticks (published rate) | 7 | 161 | 46.90 | 52.11 % | 8.955 |

Flight share agrees to within **0.22 percentage points** and the rate to within 0.4 %, so the
0.1 s grid is not aliasing the 16.000 s regime cycle. The same table is also a **render-neutrality
control**: `__step(6)` renders once per 6 ticks and `__step(1)` six times, and deaths and
`shotsFired` are *identical*, so render count does not perturb the simulation and the three rates
are measuring one run. (The 90 s figures are higher than the 180 s ones because the opening
90 seconds are the deadliest; the three rates are comparable to each other, not to the 180 s runs.)

Probe self-test, live tree, all four checks passing: `?invincible=1` ⇒ 0 deaths; same seed twice
identical; different seeds differ; 0 page errors.

---

## B. The fairness item — closed, with a measured guarantee rather than an argument

The lead rated this above the number and was right to: **no deaths/min figure on either
denominator can tell an unavoidable respawn death from honest difficulty.** So I stopped trying to
read it off deaths/min and measured the thing itself.

`combat.js`'s `_logHit` now records, for every hit, when the **announcing flare lit**
(`m.bornT − TELEGRAPH_S` — the flare lights 1.0 s before the round leaves and the aim snapshot is
taken at that same instant) and when the **life it killed began** (`_lifeStartT`: 0 for the first
life, the respawn edge thereafter). Two derived fields:

- `announced` — the flare lit at or after the life began. `false` means the round was aimed at a
  snapshot of a jet that no longer existed, so **no input during that life could have avoided
  it**. That is the defect, stated exactly.
- `inLifeWarning` — warning actually available *within* the life, `t − max(flareLit, lifeStart)`.
  A flare that lit 0.2 s after a respawn gave 0.2 s less usable warning than its nominal figure.

### Result, shipped arm, 5 seeds × 180 s

| | value |
|---|---|
| fatal hits | **43** |
| **unannounced fatal hits** | **0** |
| hits inside the 2.0 s grace window | **0** |
| minimum in-life warning across all 43 | **2.25 s** |
| median in-life warning | 2.37 – 2.58 s |

**Every fatal hit in 15 minutes of play was announced by a flare that lit during the life it
killed, with at least 2.25 s of warning inside that life.** That is the lane's fairness contract
stated as a measured bound, and it is the statistic a judge should re-measure.

### The control that proves the mechanism, and corrects my own earlier reading

I previously reported this fix as "a guarantee rather than a measured improvement" because deaths
and short-life counts were identical with and without it. That was true and it was the wrong
statistic. A/B with **only the `clearShots()` call commented out** in the control, same snapshot,
same seeds:

| | fatal hits | unannounced fatal | grace-window hits | **of which unannounced** | mean rounds in air |
|---|---|---|---|---|---|
| `clearShots()` live | 42 | 0 | **0** | 0 | 3.58 – 4.06 |
| `clearShots()` disabled | 42 | 0 | **23** | **23 (100 %)** | 3.89 – 4.25 |

**23 unannounced rounds per 15 minutes were intersecting the respawned jet and being absorbed by
the 2.0 s grace window — all 23 of them, not a subset.** Deaths do not move because the grace
window was already catching them, and it was catching them *the way I argued against*: by putting
fireballs through the jet with no effect. So the fix removes 23 ghost hits per 15 minutes rather
than 0 deaths, and the cost is 0.2–0.4 enemy rounds in the air (−6 to −8 %).

This also settles the disagreement with player-feel's 17 % figure without either side being wrong
(I28's lesson, applied): their 17 % and my 2.7 % were different trees. On the shipped tree the
short-life count is 2/38 respawned lives, **and both of those had in-life warning ≥ 2.25 s** — so
even the short lives were announced and dodgeable. A life ending 0.3 s after the grace expires is
not evidence of unfairness; `inLifeWarning` is, and it reads clean.

---

## C. R4 gap 10 — the bracket residual is CLOSED, and the cause was not the placement code

My first session located this in `_placeCorners` and declined to ship a blind fix. Correct call:
**the placement code was never wrong.**

### The instrument came first

`tools/bracket_probe.mjs` (new) projects the eight bar sprites through the live camera and reads
native-pixel positions, instead of looking for them in a mask. Validated on known inputs
(`--selftest`): roll ≈ 0 at centred stick, |roll| > 30° at full deflection, opposite signs at
±1 stick, 0 page errors. Result:

| stick x | roll | box (native px) |
|---|---|---|
| 0.0 | +0.00° | 16.50 × 16.50 |
| +0.5 | +33.25° | 16.50 × 16.50 |
| +1.0 | +66.50° | 16.50 × 16.50 |
| −1.0 | −45.25° | 16.50 × 16.50 |

**The box is exactly 16.50 × 16.50 at every roll angle out to the saturation point.** It is also
exactly centred on its target: rotating the enemy's unrolled screen position about screen centre
by the measured roll reproduces the measured box centre to **≤0.05 native px** at +4.97°, +26.14°
and +26.70°. (My first pass at this compared the box against the *unrolled* position and read an
8 px centring error that does not exist — the reference frame was wrong, not the bracket.) The
one case where the bracket sits on the second-nearest enemy is `TRACK_HYSTERESIS` doing its
documented job: 4.96 vs 5.15 depth is a ratio of 0.963, above the 0.85 steal threshold.

### So what removed the bars from the frame — three candidates, two eliminated

Reproduced on the current tree at roll +25.6° to +26.5° (`?fixed=1&demo=2&seed=3`, ticks 36/40/44):
bars 2–5, the two RIGHT corners, score **zero** near-white pixels at their own predicted positions
while the left four render. Raw RGB at the missing positions reads `0,159,255` — pure stage-1 sky.

| candidate | verdict | evidence |
|---|---|---|
| cloud sprites (`clouds.js` builds banks with a bare `SpriteMaterial`, whose `depthWrite` defaults to **true** — the obvious suspect) | **RULED OUT** | `?noclouds=1` reproduces the defect bar for bar, and the bracket positions are byte-identical, so `noclouds` is also sim-neutral |
| mask merging with another near-white element | **RULED OUT** | the missing bars sit on pure sky, not inside the 59 × 51 px trail mass, which starts 10 px further right |
| **the PLAYER'S OWN JET SPRITE** | **CONFIRMED** | `?hidejet=1` restores **8/8 bars on all six banked frames** |

`createJetSprite()` in `render/spriteFactory.js` builds
`new THREE.SpriteMaterial({ map, transparent: true })` with no `alphaTest` and no
`depthWrite: false`. `SpriteMaterial.depthWrite` **defaults to true**, so every texel of the jet's
quad — including the fully transparent margin — writes depth, at depth ≈ 5, nearer than anything
else in the scene. The jet has no `renderOrder` (0) and every combat element has 6–30, so the jet
stamps depth first and anything drawn after it inside that ~117 × 64 native-px rectangle is
depth-rejected *in a region where the jet is invisible*. Under bank the tracked enemy swings
around screen centre and the bracket falls into it. This is precisely the failure mode
`effects/pixelTexture.js`'s own header warns about, which is why every billboard in that file sets
`depthWrite: false`.

### Fixed in my file, verified

`lockSystem.js`'s bars (and the sight square, from the same factory) now take
`depthTest: false`. **64/64 bars present** across eight banked frames at +25.6° to +26.7°, box
16.50 × 16.50 on every one. Captures: `tools/out/combatfx-r5c/brk-roll` (defect),
`brk-roll-noclouds`, `brk-roll-hidejet` (diagnosis), `brk-roll-fixed` (after). The HUD is a
separate render pass (`screen.js` renders `hud.scene` after the game scene) so this cannot reach
it, and it is the right behaviour on its own terms: a reticle should not be occluded by the
aircraft it marks, by the player's airframe, or by terrain.

### The root cause is NOT fixed, and it is much bigger than the brackets

Measured blast radius, `?demo=2&seed=3`, 150 frames at 3-tick spacing, diffing the live tree
against snapshots that change only the jet's material:

| variant | native px differing over 7.5 s | frames affected |
|---|---|---|
| jet `alphaTest: 0.5` (correct fix) | **239 176** | 150 / 150 |
| jet `depthWrite: false` (over-reaching fix) | 324 066 | 150 / 150 |

Largest revealed colour buckets under `alphaTest`: **`#f6f6e7` — 19 343 px**, the explosion's
white-hot core, the thing this lane spent R5 building; `#f4f4f4`–`#f7f7f7` whites, the missile
smoke trail; `#9e0000` (9 769 px), the fireball rim; `#f0f0f0` (10 818 px), the bracket bars.
**The player's own transparent sprite margin has been punching invisible holes in the explosions,
the trail and the brackets all round.**

`alphaTest: 0.5` is the correct form and `depthWrite: false` is not: every pixel `alphaTest`
changes is a strict subset of what `depthWrite: false` changes (cross-check: **0** pixels changed
by one and not the other), and the extra ~85 000 are far sprites wrongly painting *over* the jet's
opaque body, because `renderOrder` forces them later. Both files are closed lanes
(`spriteFactory.js` = sprite-art, `player.js` = player-feel), so this is in
`judging/R5/ask-combatfx.md` as a one-line ask, not reached into.

---

## D. A crash I introduced, found and fixed — and why `errors: []` did not catch it

`_logHit`'s new `lifeStart` field read `this._lifeStartT`, stamped from `this.t` on the respawn
edge. **`this.t` was never initialised** — `update()` created it lazily with
`this.t = (this.t ?? 0) + dt`, and the `?? 0` in the `__fairness` hook is the fossil of that. But
`flow.js` calls `checkPlayerHit()` from `_updateFlight` *before* `game.js` reaches
`combat.update()` on the same tick, so on the first flight tick `this.t` is `undefined`; under
`?invincible=1` the respawn edge fires on exactly that tick, stamping `_lifeStartT = undefined`,
and the first hit logged afterwards threw
`TypeError: Cannot read properties of undefined (reading 'toFixed')` **inside the game loop**.

Reproduced at `?fixed=1&demo=2&seed=1&invincible=1` tick **1431**, seed 2 tick **3551**, seed 3
tick **7685**. Fixed by initialising `this.t = 0` in the constructor, which removes the class
rather than the instance.

**Two lessons worth the space, both about believing a clean result:**

1. **`pageerror` did not fire.** The throw happened inside `page.evaluate`, which rejects the
   probe's promise instead. Every run I had, including the self-test, reported `errors: []` — and
   the 30 s invincible self-test genuinely logged no hit in time to trigger it. A run that reports
   no page errors is not evidence of no crash. In a browser with the rAF loop this would have
   stopped the game.
2. It only bites under `?invincible=1`, which is **the flag every lane's measurement captures
   use**. A measurement-only field broke the measurement harness, silently, for everyone.

Verified after the fix: the 3-seed × 1100-sample census now completes 3300/3300 (it stopped at
27/67/145 before), and the probe self-test's invincible run logs 10 grace hits with 0 unannounced
where it previously would have thrown.

---

## E. The single-file diagonal queue — fixed, and the first measurement of it was on the wrong population

### The pooled measurement said there was no queue. It was wrong.

First pass, over **all** live `approach` enemies: |corr(depth, screen-x)| median **0.249**, only
2.2 % of frames above 0.8. Read literally: no diagonal. That is the I9/I26 defect class — a
correct operator pointed at the wrong population. 3–5 waves are in flight at once by construction
(`WAVE_GAP` 0.9–1.6 s against a ~5 s approach), so the pooled set is several formations
superimposed and its depth spread reads 17× max/min however tight each formation is.

A formation is a property of **one wave**, so waves were made addressable: `spawner._nextWave`
stamps `waveId`, `enemy.js` carries it, the `__fairness` hook publishes it alongside each
aircraft's `wFrac` (on-screen span, from its own projection — a pixel census cannot attribute a
span when three head-on aircraft overlap, which in an echelon is the normal case).

### Within a wave, measured (3 seeds, `?fixed=1&demo=1&invincible=1`, every 4 ticks)

| statistic | before | **after** | chance floor |
|---|---|---|---|
| |corr(depth, screen-x)|, median | **0.850** | **0.522** | 0.463 |
| same, p75 | 0.940 | 0.806 | 0.740 |
| fraction above 0.8 | **59.3 %** | **25.5 %** | 19.7 % |
| within-wave span ratio (max/min), median | 2.19 | 2.10 | — |
| size-qualified density (≥1 enemy ≥10 %W) | 84.87 % | **84.00 %** | gate ≥60 % |

7 944 flight samples, 85 waves, 15 072–15 089 per-wave observations, 0 page errors.

**The "chance floor" column is a null control, not a target.** With 3–6 aircraft per wave, two
*independent* orderings still correlate strongly by chance: 200 000 synthetic trials per wave size
with depth drawn independently of the lateral slot give median |r| 0.721 (n=3), 0.494 (n=4), 0.398
(n=5), 0.341 (n=6), pooling to **0.463** with P(|r| > 0.8) = **0.197**. Measured after the fix:
0.522 and 0.255. So the systematic ordering is essentially gone and what remains is the floor for
formations this small. Without that control, 0.522 would have looked like a half-fix.

### The cause, and why it was structural

Not the formation geometry: `depthA` is drawn independently per member
(0.70–1.20 × spawn depth) and is **not** monotonic in member index. It is the **dispense order**.
`pending` is a FIFO drained one aircraft every 0.14–0.34 s, so member *i* enters the world
*i* dispense-ticks before member *i+1* and carries that much more depth travel: depth becomes
monotonic in *i*. And *i* maps monotonically to the lateral slot
(`ndcB: baseB + k * 0.26`, `k = i − (n−1)/2`). Two monotonic maps through one index compose into a
perfect depth-vs-screen-x ordering, every wave, in the same direction.

So the fix breaks the composition, not the geometry: `_shuffleDispenseOrder` Fisher–Yates-shuffles
the order members are handed to the dispenser, leaving every spec — fan-out, rake, depth spread,
bomber slot, livery — byte for byte unchanged. The leading aircraft is now at a random lateral
slot. *n−1* draws, taken unconditionally after the wave is fully built, so it cannot desynchronise
draws *within* a wave; it does shift the stream relative to older builds, which is why the whole
A/B in section A was re-taken afterwards.

**Deliberately NOT done by compressing the depth spread**, the other way to make a wave read as a
formation. That spread is what buys the size-qualified density criterion; it measures 84.0 % here
against a ≥60 % gate, and `depthA`'s own comment records that a tighter spread measured 53 %.
Spending measured headroom to chase an unmeasured impression is the trade this project has retired
four criteria for. The residual **span ratio 2.10** — the biggest member of a wave is typically
2.1× the on-screen size of the smallest — is therefore recorded as the *measured price* of that
criterion, not as a defect I failed to fix.

---

## F. Stage-1 type mix — re-verified on the current tree

The lead's capture showing rust-red delta interceptors in a stage-1 engagement predates the
role/type split. Re-censused on this tree from simulation state (3 seeds × 1100 samples at
**53-tick spacing** — incommensurate with the 960-tick regime cycle; 3300/3300 samples, 0 errors):

| stage | census (aircraft-frames) | patterns present |
|---|---|---|
| 1 | **grey 84.1 %**, interceptor 15.9 % | approach 8507, crosser 2815, **overtake 464** |
| 2 | **camo 69.1 %**, interceptor 22.9 %, grey 4.2 %, prop 3.8 % | approach 8613, crosser 2766, overtake 449 |
| 3 (night) | **grey 63.8 %**, interceptor 32.0 %, camo 4.2 % | approach 8738, crosser 3000, overtake 366 |

Stage 1 is dominated by grey MiGs and every stage opens with its overtake flight, so the first
session's two fixes hold. **I did not attempt a pixel census of liveries and will not quote one:**
my first attempt's "rust-red" mask picked up the explosion rim `#9e0000` (45–59 px components,
confirmed by cropping and looking) plus a pink component I could not attribute. Simulation state is
the right instrument here.

**The honest caveat stands and is the lead's call, not a measurement.** `ELITE_FRACTION_BY_STAGE`
`[0.12, 0.22, 0.30]` with `CROSSER_ELITE_BONUS` 0.18 is ADOPTED. 15.9 % of stage-1 aircraft-frames
are interceptor-livery, and because the visually dominant moment of any frame is a near-field
fly-past, roughly one stage-1 frame in six can show one filling the screen. GAME_SPEC.md §4's
red/orange interceptor is **one timestamp** in stage 1 (t102.5). If the lead wants stage 1 pure
grey, `ELITE_FRACTION_BY_STAGE[0] = 0` is a one-line change; I have not made it because it trades
measured variety (R4 gap 1 criterion (d) wants both silhouette families per stage) against an
unmeasured frequency, and that is a design call.

---

## G. Measurement-integrity sweeps

- **Black frames: 0 of 1446** across every capture directory under `tools/out/combatfx-r5c/`.
  Detector validated in both directions (flags a synthetic all-black frame; does not flag real
  night captures at mean 27.9–88.5 with max 247–255).
- **`tools/capture.mjs` silently ignores unknown flags, and it cost me a false negative.** I ran
  two whole suppression tests with `--params` instead of `--url-params`; the tool accepted it,
  dropped the parameters, defaulted to `fixed=1&seed=1`, captured a static scene with no demo
  input and no brackets in it, and both tests returned a clean **0** — "the jet quad suppresses
  nothing". Re-run with the right flag the same comparison returned 96 114 warm and 161 581
  near-white pixels. A plausible, stable zero from a tool that will not tell you it ignored your
  arguments. Raised as an ask.
- **The jet-quad diff needed an isolation that keeps the jet.** The obvious `hidejet=1` A/B is
  contaminated: removing the jet also reveals the orange ground behind it, which the warm mask
  counts, so the jet's own silhouette inflates the result. Every published figure in section C is
  from a snapshot that changes only the jet's *material*, with the jet present in both arms.

---

## H. Open at the end of R5c

1. **Gap 5's absolute gate still not met** — 2.87 wall / 4.00 flight, at +8.8 % enemy fire. The
   ratio R4 asked for is exceeded (2.82× against 2.0–2.3×). Needs either a telegraph-reactive
   `?demo=1` (ask 1), an arcade measurement of the death rate, or a decision that the ratio is the
   criterion. **Nobody has measured the arcade's own death rate; the footage to do it is in this
   repo.**
2. **The jet sprite's depth stamp** — root cause of gap 10's residual and of invisible holes in
   explosions, trail and brackets. One line in `spriteFactory.js` (`alphaTest: 0.5`), another
   lane's file, 239 176 native px of measured effect. **The highest-value single line left in the
   round.**
3. **Trail billow shape** — unchanged from the first session: colour passes, the ≥25 %W-for-1 s
   launch billow does not, and the plume reads as a parked cloud rather than a trail.
4. **Explosion core deliberately under the arcade's fraction** — unchanged; the larger value that
   hits the number looks worse on the crop.
5. **Within-wave span ratio 2.10** — the measured price of the size-qualified density criterion.
   Not a defect to fix without first deciding whether that criterion is the right one.
6. **`ELITE_FRACTION_BY_STAGE` is ADOPTED** — see F. Needs footage verification before anyone
   tunes to it.
7. **The offline lethality model stays withdrawn.**

## New tools and captures from this session

`tools/bracket_probe.mjs` (bracket geometry from live sprites, self-validating),
`tools/bracket_frames.mjs` (banked frames paired with predicted bar positions),
`tools/fairness_probe.mjs` (extended: flight-time denominator, `announced` / `inLifeWarning`
summaries, grace-hit split, `--tree-state`).
Captures under `tools/out/combatfx-r5c/`: `brk-roll`, `brk-roll-noclouds`, `brk-roll-hidejet`,
`brk-roll-nodepth`, `brk-roll-fixed`, `d2b-jet`, `d2-jetnodw`, `d2-jetalpha`, `d2-nodepth`,
`shots2-jet`, `shots2-nojet`, `stage1-mix`, `stage1-mix-s3`, `expl-jet`, `expl-nojet`.
Probe JSON under the session scratchpad (`snapA/{base,final,noclear,noclear2,final2}.json`,
`snapA/ctrl/every{1,2,6}.json`, `snapE/shipped.json`).

# R6 — combat lane report

**Files touched** (nothing outside them): `src/game/spawner.js`, `src/entities/enemy.js`,
`src/weapons/enemyShots.js`, `src/weapons/combat.js`, `src/effects/smoke.js`,
`src/weapons/missiles.js`, `src/effects/explosions.js`, plus measurement-only additions to
`tools/fairness_probe.mjs` and new tools under `tools/out/combat-r6/`.
**Nothing committed, nothing stashed, nothing pushed.**

**Tree state on every our-side figure** (REFERENCE.md "What a complete citation is"): the
shared R6 working tree with four other lanes live, measured on `rsync` snapshots taken at
the moment of each run so a concurrent edit cannot land inside one. Where another lane's
file was mid-edit and would not parse, that file alone was replaced with `git show HEAD:` in
the **snapshot**, never in the tree; every such substitution is named in the run it affects.
A/B control arms are **this lane's files at HEAD with every other lane's working-tree file
in place**, so nothing here is credited with another lane's work.

---

## Headline

| | before | after | arcade |
|---|---|---|---|
| enemies in the top third of the screen (all on-screen) | **0.01 %** | **31.5 %** | **32.5 %** |
| …readable size (≥10 %W) | **0.04 %** | **33.5 %** | **47.4 %** |
| enemy screen altitude, p5 / p50 / p95 %H | 47.7 / 56.6 / 59.0 | 19.2 / 41.6 / 68.0 | 14.1 / 40.0 / 72.8 |
| …sd | 3.90 | 15.64 | 19.22 |
| deaths per minute of **wall clock** | 2.914 ±0.289 | **2.229 ±0.252** | 1.91 / 2.04 |
| deaths per minute of **flight time** | 4.121 | **2.850** | 2.78–2.94 |
| per-round hit probability at the player's plane | 3.812 % | **2.584 %** | — |
| enemy rounds per minute (must not fall) | 127.1 | **133.3** | — |
| sight-square swing under bank (moves the lock cone) | 11.38 %W | **0.00 %W** | — |
| explosion near-white core, FIRE-MASK | **28–32 %** | **9.1–12.3 %** | 9.2 % |
| explosion mean saturation | 0.66–0.69 | **0.824–0.846** | 0.846 |
| unannounced fatal hits | 2 of 72 | **0 of 78** | — |

Two of those rows reverse a position this lane published last round, and both reversals come
from an instrument that failed its own control until it was fixed. Those are §2 and §4.

---

## 1. The vertical dimension — R5 feel critique rank 1

**→ `tools/out/combat-r6/vert-ab.png`** (the three distributions on one axis, top third
shaded, the player's own band drawn beside each).

### 1.1 The arcade's distribution, which did not exist before this round

`judging/R5/feel-critique.md` §6 called a systematic arcade enemy-altitude distribution
"the single best replacement criterion available" and "unstarted". Here it is.

**Operator, in full.** 71 frames of `.reference-cache/video/ab2-longplay.mp4` (686×480) at
exactly 3.00 s, over the `STAGE_MAP.md`-verified spans of stages **1, 4, 6, 7, 12 and 19**,
each span trimmed 2 s at both ends so no sample can land on a transition card. Frames
extracted one at a time with `-ss <t> -frames:v 1`. 8 frames excluded (launch sequence 1,
reload stage 2, stage-transition card 1, ground clutter that made the player ambiguous 4) —
**63 frames analysed**. Every aircraft in them read by a human off a 1.4× NEAREST upscale
with a 5 %H ruler on both edges, recording centre %H and drawn span %W. The player is
identified by span (28–36 %W against REFERENCE.md's 35.62 %W level-astern figure, less under
bank) and recorded separately. **83 enemy observations, 61 player observations.**
Raw data: `tools/out/combat-r6/arcade-vert/labels.csv`. Sheets: `pair-00..35.png`.
Tool: `tools/out/combat-r6/arcade_sheets.py`.

**No detector, on purpose.** Aircraft-vs-cloud-vs-island segmentation over arbitrary arcade
grounds is the "correct operator pointed at the wrong population" trap this project has
retired nine criteria for. I tried it first: a near-black-outline detector on stage 1 looked
clean and fell apart the moment stage 1's green coastline entered frame. A population of
one to five aircraft per frame does not need a detector.

| arcade | n | p5 | p25 | p50 | p75 | p95 | sd | top third |
|---|---|---|---|---|---|---|---|---|
| all enemies | 83 | 14.1 | 29.5 | **40.0** | 57.0 | 72.8 | 19.22 | **32.5 %** |
| readable ≥10 %W | 19 | 14.5 | 21.5 | **36.0** | 48.0 | 59.8 | 18.22 | **47.4 %** |
| small <10 %W | 64 | 14.3 | 31.8 | 42.0 | 62.0 | 72.7 | 19.02 | 28.1 % |
| **the player** | 61 | 36.0 | — | **49.0** | — | 63.0 | 8.11 | — |

**Weaknesses, stated rather than buried.** (a) The longplay pilot is an expert who clears
every stage without dying, so enemies die young and the sample skews toward newly-arrived —
small, high — aircraft. (b) Spans are eyeballed to ±2–3 points, so observations near the
10 %W line can flip populations. (c) One frame (s12 t517, a five-aircraft diagonal running
10 → 57 %H) contributes 5 of the 19 readable observations; dropping it moves the readable
top-third share 47.4 % → 50.0 %, so the headline does not rest on it. (d) 63 frames at 3 s
is a fixed grid independent of content, so it is an unbiased sample of the per-frame
distribution — but it is one lane's hand count and should be reproduced before it binds
anyone (see `ask-combat.md` A4).

### 1.2 The diagnosis, which two MEASURED numbers give on their own

> **The arcade's readable enemies sit on the SIGHT LINE. Ours sat on the AIRFRAME.**

The arcade's player reads median **49.0 %H** and its readable enemies **36.0 %H** — thirteen
points of H above him. `combat.js SIGHT_NDC_Y_OFFSET` is **0.30 NDC = 15 %H above the nose**
and GAME_SPEC §3 tags it MEASURED. Those two numbers were measured independently, years of
frames apart, and they agree to two points.

Ours, committed: player median 54.8 %H, readable enemies 53.8 %H. **One point apart.** The
gun pointed at a part of the sky that nothing flew in, and the whole engagement happened on
the airframe's own line. Per-observation enemy-minus-player offset:

| | arcade | ours committed | ours R6 |
|---|---|---|---|
| all enemies, median offset | **−10.0** points of H | — | **−12.2** |
| readable, median offset | **−10.0** | **−1.0** | **−15.7** |
| sd of the offset | 22.7 / 21.8 | — | 16.6 / 13.9 |

(Negative = above the player. The committed run predates the per-observation jet field in
the probe, so only its readable median is recoverable; it is computed from the two pooled
medians and is therefore the one figure in this report that is a difference of aggregates
rather than an aggregate of differences.)

### 1.3 What changed in the code

`spawner.js`. The single constant `SPAWN_NDC_Y = -0.165` — one altitude, 58.25 %H, just above
the horizon, for every wave in the game — is replaced by **two quantile-matched bands**:

* `FAR_BAND`, the inverse CDF of the arcade's **<10 %W** observations, drawn once per wave
  for `ndcA.y` (where a wave is first visible). A 1/d-lerped screen path spends almost all
  of its life at `ndcA`, so this band is what the pooled small-enemy distribution becomes.
* `NEAR_BAND`, the inverse CDF of the **≥10 %W** observations, drawn once per wave for
  `ndcB.y` (where it passes the camera).
* The two draws are **independent**. That is the whole mechanism for "approaches from above
  and below": a wave with a high `ndcA` and a low `ndcB` dives at you, the reverse climbs
  away. Correlating them would restore the level pass. Only the marginals are measured; the
  independence is ADOPTED and labelled as such in the file.
* `VERTICAL_RAKE_SCALE 0.12 → 0.30`. The arcade's formations are vertical ladders as often
  as rows (s12 t517 runs 10 → 57 %H across five aircraft; s19 t785's trio sits inside 3
  points). The old multiplier capped a six-ship echelon's vertical extent at ±0.135 NDC, so
  every formation read as a row however it was raked.
* Crossers draw both endpoints from `NEAR_BAND` — a crosser reaches depth 3.0 and is a
  readable-size aircraft by construction. The old pair was a shallow downward slide at the
  player's altitude, every time.
* The primed stage-opener echelon gets the same two draws. It is the first thing a player
  sees of every stage.

### 1.4 Result, and the part that is clamped

`tools/out/combat-r6/vert_probe.mjs`, 3 seeds × 7200 ticks of `?fixed=1&demo=1&invincible=1`,
**every tick** (so the 16.000 s attract-regime aliasing trap cannot apply), 264 702 on-screen
enemy samples against the control arm's 269 124.

| | committed | **R6 shipped** | arcade |
|---|---|---|---|
| all enemies p5/p50/p95 %H | 47.7 / 56.6 / 59.0 | **19.2 / 41.6 / 68.0** | 14.1 / 40.0 / 72.8 |
| sd | 3.90 | **15.64** | 19.22 |
| top third | 0.01 % | **31.46 %** | 32.5 % |
| readable p5/p50/p95 | 42.6 / 53.8 / 61.6 | **20.6 / 39.6 / 59.5** | 14.5 / 36.0 / 59.8 |
| sd | 5.74 | **12.30** | 18.22 |
| top third | 0.04 % | **33.49 %** | 47.4 % |

The all-enemy column lands on the arcade: median 41.6 against 40.0, top third **31.5 %
against 32.5 %**, p95 68.0 against 72.8. **The readable column undershoots (33.5 % against 47.4 %), and the residual is one clamp I
put in on purpose.** `REACH_CEILING_NDC_Y = 0.64` caps how high a wave may finish, derived from
the player's measured screen ceiling (+0.106 NDC, i.e. 44.7 %H, the `ENVELOPE_Y = 1.1`
limit), the 0.30 sight offset and the lock/assist vertical reach of ±0.237. Above it an
aircraft is something the player can watch and cannot touch, which is not the arcade's
vertical dimension — it is a different defect. **`ask-combat.md` A1 asks the player lane for
`ENVELOPE_Y 1.1 → 1.9`; the ceiling then becomes +0.82 and it is one line to lift.**

Side effect worth naming: **kills per 180 s went 9/7/15 → 26/27/38 across three seeds**
(and 102 → 142 per 2100 s once §7.1's sight fix put the assist cone where it belongs),
because enemies now cross the sight line and the vulcan's assist cone, which is centred on
the sight, finally has something in it. Kill rate rose 0.078 → 0.23 per second of flight,
still well under the arcade's measured 0.54.

---

## 2. Lethality — and the first reversal

### 2.1 Deaths cannot be tuned on, and this round proved it the expensive way

Three seeds × 180 s of `?demo=1` produce 23–25 fatal hits. The Poisson standard deviation on
24 is 4.9 — **the measurement cannot resolve anything smaller than a 20 % change, and the
gate this round asks for is a 22 % change.** I found this out by making a geometry change
predicted to cut the per-round hit probability ~25 % and watching the death count go
23 → 24. Published either way, that is the "clean, plausible, stable" false alarm CLAUDE.md
warns about.

**New instrument: `combat.js _logMiss`.** The miss distance of every enemy round at the
instant it crosses the player's plane, in the hit test's own units, as a 40-bin histogram
over 0–0.40 of a frame width exposed through `__fairness`. The same 2100 s that yields 72
deaths yields **~3000 plane crossings**. `pHit` — the share inside
`PLAYER_HIT_RADIUS_FRAC` — is the quantity a geometry change is supposed to move, and
deaths/min becomes a prediction that can be checked rather than the estimator.

**Validated on a known input, every arm**: crossings inside the kill radius must equal
`playerHitsTaken` exactly, because `_logMiss` runs on the same `(hx, hy, playerNdc)` the hit
test uses. It did, on all five arms, with no tolerance.

### 2.2 The displacement table the geometry was solved against no longer reproduces

`enemy.js TELEGRAPH_S` publishes a table of P(jet displacement < 0.05) against lag, and every
one of the firing-geometry constants is solved against it. Re-measured with the same tool,
same operator, same seed (`fairness_probe.mjs --trace`, `?fixed=1&demo=1&seed=4`, 120 s,
0.1 s), on the R6 tree with **this lane's files at HEAD**:

| lag | R6 | published R5 |
|---|---|---|
| 0.6 s | 0.726 | 0.635 |
| 1.0 s | 0.556 | 0.455 |
| 1.4 s | 0.432 | 0.320 |
| 2.0 s | 0.331 | 0.161 |
| 2.6 s | **0.220** | **0.090** |

Every row is higher and the gap widens with lag: the `?demo=1` pilot moves materially less
than it did. This lane did not change it — `player.js` and `demoTimeline.js` belong to
another lane and the trace was taken with my files reverted. So the geometry that was solved
for a 0.10 → 0.05 per-round hit probability was in fact paying **0.24 → 0.04**, and the death
rate followed. **Anyone re-deriving a firing constant must re-take that table first.**

### 2.3 The sweep

`enemyShots.js SPEED` is the lever `enemy.js`'s own "MOVE NONE OF THESE FOUR ALONE" note
names for this case — raising the firing floor buys lag and costs train budget; slowing the
round buys lag for free. It is also explicitly **not measured** from the arcade.
7 seeds × 300 s per arm = 2100 s, every arm a fresh snapshot differing in one constant.

| SPEED | pHit % | deaths/min **wall** | deaths/min **flight** | **rounds/min** | mean live shots | flight share |
|---|---|---|---|---|---|---|
| 15 (committed) | 3.812 ±0.370 | 2.914 ±0.289 | 4.121 | 127.1 | 4.19 | 70.71 % |
| 12 | 3.201 ±0.330 | 2.600 ±0.273 | 3.500 | 127.9 | 5.18 | 74.29 % |
| **10** | **2.272 ±0.265** | **2.057 ±0.242** | **2.601** | **129.8** | 6.27 | 79.09 % |
| 9 | 2.454 ±0.280 | 2.143 ±0.247 | 2.731 | 129.4 | 6.80 | 78.45 % |
| 8 | 1.568 ±0.212 | 1.543 ±0.210 | 1.839 | 131.3 | 7.92 | 83.90 % |

Re-run after §2.5's respawn fix and the volume restore that it in turn forced
(`TRAIN_START_GAP_S 2.59 → 2.46`), which is the **shipped** configuration:

| SPEED | pHit % | deaths/min wall | deaths/min flight | rounds/min | live shots | flight share |
|---|---|---|---|---|---|---|
| 10 | 2.481 ±0.281 | 2.171 ±0.249 | 2.771 | 130.6 | 6.20 | 78.38 % |
| 9 | 2.668 ±0.298 | 2.229 ±0.252 | 2.865 | 129.1 | 6.69 | 77.80 % |

And once more on the **final shipped tree**, which adds §7.1's sight fix and §7.4's fly-past
call on top (`tools/out/combat-r6/ship2/`):

| | pHit % | deaths/min wall | deaths/min flight | rounds/min | live shots | flight share |
|---|---|---|---|---|---|---|
| **SPEED 10, shipped** | **2.584 ±0.289** | **2.229 ±0.252** | **2.850** | **133.3** | 6.09 | 78.19 % |

*(± is one standard error. SPEED 9 is off the monotone trend by half a standard error and is
noise, not a turning point.)*

**Volume is not cut.** Rounds per minute **rises** across the sweep, 127.1 → 129.8, because
nothing in the cadence changed and fewer deaths means fewer `clearShots()` events. The
R6 spawner work had briefly cost 4.8 % of volume (126.5 → 120.4) by killing enemies faster;
that was put back by re-setting `TRAIN_START_GAP_S 2.72 → 2.59`, which is the re-measurement
that constant's own comment demands whenever the alive budget moves, not a difficulty change.

### 2.4 Against the gate, plainly

**The gate: ≤2.0 deaths per minute of wall clock, ≥3 min × ≥3 seeds, volume unchanged.**

**Shipped: 2.229 ±0.252 over 7 seeds × 300 s, at 133.3 rounds/min against the control arm's
127.1.** Volume is met and exceeded by 4.9 %. **The wall-clock gate is not met: 2.229 against
2.0 is 0.23 over, 0.9 standard errors.** Per-seed: 2.4, 2.0, 2.6, 2.0, 1.8, 2.4, 2.4.
Secondary line, flight time: **2.850/min against the arcade's 2.78–2.94 — inside the arcade
band.** Per-round hit probability 3.812 % → **2.584 %**, a 32 % cut, measured on 3 018 plane
crossings rather than on 78 deaths.

**Where the remaining 0.23 is, and it is not in this lane.** The two denominators disagree
because our death cycle is shorter than the arcade's: `deathSequence.js DEATH_TOTAL_S` is
5.2 s against the arcade's 7.8 s (R5 feel critique §5, measured two ways). Wall-clock
deaths/min = flight-time deaths/min × flight share, and flight share is itself a function of
the death cycle. Holding our measured flight-time rate of 2.850 and substituting a 7.8 s
cycle:

```
   per 60 s of wall clock:  d deaths,  d = 2.850 x f    (f = flight share)
   dead time               = 7.8 d = 22.23 f seconds
   f = (60 - 22.23 f) / 60  =>  f = 0.730
   deaths per wall minute   = 2.850 x 0.730 = 2.08
```

**2.08, against the two independent arcade measurements of 1.91 and 2.04.** This is
arithmetic from two measured quantities, not a measurement, and it assumes nothing else
moves. But it says the wall-clock residual is the death-cycle constant and nothing else,
that constant belongs to the flow lane, and it is already `ask-combat.md` A2. Our flight
share is **78.2 %**, above the arcade's own 69.4–73.5 % band, which is the same fact seen
from the other side: there are 5–9 points of flight share to spend and this is what they
should be spent on.

**I did not take the next step down, and this is a judgement the lead should see rather than
inherit.** SPEED 8 reads 1.543/min of wall clock, which is **24 % below** the rate an
ordinary human paying for the cabinet dies at (1.91 judge / 2.04 feel critic, measured
independently and agreeing) — while our pilot is a pure function of `simTime` and cannot
dodge at all. A non-reactive policy dying *less* than a reacting human is not a difficulty
setting. SPEED 9 was also measured in the shipped configuration and is no better
(2.229 ±0.252). 10 is the arm that lands on the arcade's bracket on the denominator that
does not depend on another lane's constant. **Clearing 2.0 by going to 8 is available and is
one constant; I think it would be tuning to the gate instead of to After Burner II, and I
would rather be told to do it than do it quietly.**

**And the brief's own framing is right: this is a regression guard, not a target.** Everything
above measures `?demo=1`'s autopilot. It says nothing about what a human experiences, and
§2.2 is a live demonstration of how far the number can move without anybody in this lane
touching it.

### 2.5 The respawn hole, closed

R5's feel critique §2 residual 1: `clearShots()` retires rounds in the air but leaves
`enemy.telegraph`, `burstLeft` and the aim snapshot alone, so an enemy whose flare lit at the
dying jet pays its train into the new life, `announced:false` by construction. It measured
**0 of 61 fatal hits** and was filed as latent.

**It is no longer latent.** At SPEED 10 a round is in the air 2.24–5.04 s instead of
1.49–3.36 s, so a train opened just before a death is still arriving well into the next life:
**2 unannounced fatal hits in 72** (seed 1 t=239.68, flare lit 3.13 s before the life began;
seed 4 t=231.43, 4.67 s before). Every one of those is a death no input could have avoided,
which is the one thing the telegraph contract promises cannot happen.

Fixed: `enemy.js abandonTrain()` clears telegraph and burst state, called for every live
enemy on the same respawn edge as `clearShots()`, with `telegraphs.clear()` so a cleared
train does not leave a lit muzzle flare on an aircraft that is no longer shooting.
`fireTimer` is deliberately untouched — the aircraft may open a *new* train at the *new*
player, announced by a *new* flare. **0 of 78 after**, and 0 grace-window hits
(`tools/out/combat-r6/ship2/fairness.json`).

**It cost volume, and that had to be paid back.** Cancelling trains destroys rounds:
129.8 → 120.7 rounds/min, a 5 % cut. R4 gap 5's prohibition on buying the death rate with a
volume cut applies to volume lost as a *side effect* just as much as to volume cut on
purpose — otherwise every fix that happens to reduce fire is a free difficulty reduction —
so `TRAIN_START_GAP_S` went 2.59 → 2.46; the shipped figure is **133.3 rounds/min**.

---

## 3. The missile trail has an axis

**→ `tools/out/combat-r6/trail-ab.png`** (committed top, R6 bottom, same seed and ticks,
`?combattrail=1&demo=1`).

The art critique's diagnosis is right and its two prescriptions are now in the code. One
correction to its wording, because it suggests a one-line fix that would have changed
nothing: **the trail puffs do not share a texture with the cloud banks.** `render/clouds.js`
authors its own stippled multi-lobe texture and nothing is shared. What was true is the
thing the eye reported — both were round, white, soft-edged lobed masses at similar screen
sizes.

**What was actually round.** `drawSmokePuff` is five concentric circles, and `drawBillow`
was five lobes laid symmetrically about the centre of a **square** canvas at radii
0.46/0.3/0.28/0.3/0.26 — a radially symmetric ball by construction, 30–36 %W across, and the
largest single element of the trail. On `tools/out/combat-r6/base/trail-sheet.png` it is the
cumulus. The ribbon mesh underneath it already had an axis and a 2.7× taper; it was being
buried.

**Three changes, each anchored to a number that was already measured and already in the
repo** (`reference/stage1-missile-salvo-t100.75.png`, operator in `effects/trailPalette.js`):

1. **A distinct, elliptical trail-puff texture** (`trailPuffTexture`, 32×20, aspect 0.625),
   rotated per puff onto the path's local screen tangent — computed in the same isotropic
   width-fraction convention `Trail._rebuild` uses for its perpendicular, so the ribbon and
   the chain cannot disagree about which way the trail points. `SmokeField.spawn` grew a
   `rotation` parameter; it is fixed for a puff's life, because smoke keeps the heading it
   was laid down at while the missile turns away from it.
2. **The chain now carries the ribbon's taper.** It ran 0.055 → 0.075 of frame width over a
   puff's life — a 1.36× ramp against the ribbon's 2.7× and the arcade plume's measured
   3.3× (10.9 %W at the missile → 36.2 %W at the launch end). It now runs 0.0768 → 0.208 on
   the long axis, which at aspect 0.625 is a visible plume width of **0.048 → 0.130** —
   exactly the ribbon's full thickness at both ends.
3. **The billow is a tapering plume, oriented along the launch → target axis**, on a 32×42
   canvas (aspect 1.3125 against the arcade launch mass's measured 39.1 %W × 50.0 %H =
   1.28), with its two lobes strung 0.17 apart **along** that axis instead of jittered
   laterally. Two 30–36 %W balls side by side made a ~50 %W mass wider than it was tall; the
   same two lobes along the axis make one rooted column.

**What I could not deliver: a numeric before/after on the trail's shape.** I built one
(`tools/out/combat-r6/measure_trail.py`, with a planted-wedge/planted-disc self-test that it
passes: wedge taper 2.79, disc 1.00). Pointed at the isolated harness it reported **aspect
0.18, taper 1.33 — identical on both arms**. I cropped it and looked: it was measuring the
pale horizon haze band, which passes an S<0.12 V>0.80 mask, spans the frame, and is the
largest such component in every frame that has no trail in it. I added an edge-spanning
rejection rule; it still read the same number, and at that point the instrument has failed
twice and **the figure is withdrawn rather than published**. The A/B crop and the authored
geometry above are what this job delivers. A clean harness needs the trail rendered against a
flat field with no sea and no haze, which is a capture-tooling change, not a tuning one.

---

## 4. The explosion core — the second reversal, and a criteria defect behind it

**→ `tools/out/combat-r6/expl-ab.png`** (0.46 top, 0.27 bottom, same five phases, the arcade
reference at the right).

### 4.1 The instrument did not reproduce its own control, and that is the story

`REFERENCE.md` "FIRE-MASK" publishes the operator and its control figures on
`reference/ab2-arcade-huge-explosion.jpg` — mean V 0.9055 / V>0.95 54.2 % / **core 9.2 %** /
mean S 0.846 — **but not the regions excluded from that 181×127 frame.** Run verbatim, the
white clause (`S<0.25 ∧ V>0.90`) walks the largest component out of the fireball into the
cloud wedge at the bottom left and the HUD strip across the top, and it reads **core 18.2 %,
mean S 0.764**. I rendered the mask over the crop and looked; it is unmistakable.

R5's independent re-implementation hit the same wall in the same direction and said so
(13.2 % against 9.2 %, "not validated"). **Two independent implementations, both over-reading
the same statistic, is the signature of an under-specified operator, not of two bugs.**

Excluding **rows 0–14, rows 112–127, and the x<55 / y>82 cloud wedge** reproduces all four
published figures to within 0.5 points: **0.9028 / 53.6 % / 9.4 % / 0.847**. Those three
rectangles are the missing half of the published operator (`ask-combat.md` A3).
Implementation with the control baked in:
`tools/out/combat-r6/measure_expl_phase.py --control`.

### 4.2 Per phase, as asked — and the premise does not survive it

Captured **every tick** through one whole 0.75 s blast in the `?combatexpl=1&noclouds=1&hidejet=1`
harness, 40 frames, phase = frame index − ignition frame.

| phase | 0.00–0.13 s (ignition) | 0.15–0.40 s (bloom) | 0.42–0.58 s (hold) | 0.60–0.65 s (fade) |
|---|---|---|---|---|
| **core %, side 0.46** | 28.1–29.6 | 27.7–32.3 | 28.9–31.3 | 28.6–45.8 |
| **mean S, side 0.46** | 0.67–0.69 | 0.66–0.69 | 0.67–0.69 | 0.20–0.44 |

The art critique's argument — that the I6 ladder was measured on peak-flash frames and must
be judged per phase — **is correct and I endorse it**. It simply does not rescue the old
value, because our core does not decay: it is flat to within 4 points across all three live
phases, since it is an authored texel grid on a texture that only cycles between three lobe
arrangements. (The fade phase is the one place pooling genuinely lies: at t>0.58 the sprite's
alpha ramp blends it into the sky, V>0.95 goes to 0.0 % and mean S collapses to 0.20. Any
pooled figure that includes those six frames is measuring the alpha ramp.)

**And the premise the lane and the critique were both reasoning from is wrong.** R5 recorded
our core at "4.1–7.8 %", under the arcade's 9.2 %, and called holding it there a deliberate
trade; the art critique reviewed that call and endorsed it. Measured with the now-validated
operator, our core was **28–32 % — three times the arcade's** — and our mean saturation was
**22 % low at 0.66–0.69 against 0.846**. Those are the same fact said twice. The white disc
the old value was protecting against was already on screen; the crop says so at a glance
(`expl-ab.png` top row is a white mass with an orange fringe).

### 4.3 The change

`const side = 0.46 * w` → **`0.27 * w`**. Core area goes as side², and
`0.46 × sqrt(9.5/30) = 0.26`.

| | arcade | before | **after** |
|---|---|---|---|
| core % (live phases) | 9.2 | 27.7–32.3 | **9.1–12.3** |
| mean S | 0.846 | 0.66–0.69 | **0.824–0.846** |
| mean V | 0.9055 | 0.862–0.880 | 0.859–0.878 |
| V>0.95 % | 54.2 | 46.5–53.9 | 40.7–48.6 |

Core and saturation both land on the arcade. **The bright fraction is the one statistic now
slightly low** — 40.7–44.3 % during ignition, under the published ≥45 % gate, because the
pixels removed were near-white at V 0.967. The lever for it is thinner spikes
(`SPIKE_HALF_W`, which `explosions.js` records as moving the bright fraction further than
any palette edit), and I have **not** pulled it: the spikes are also the starburst
silhouette, which R5's art critique flags separately as four-fold-symmetric and wrong, and
trading one named art defect for another to clear a gate is how this project got here. It is
an honest bound and it is the open item on this job.

### 4.4 One thing the art critique asks for that the arcade contradicts

> "the light-blue debris specks inside the fireball read as holes punched through to the
> sky, not as chunks"

They read that way because they **are** holes, and the holes are measured: `explosions.js`
records that non-fire pixels strictly inside the arcade fireball's own silhouette are 20.0 %
of it on `ab2-arcade-huge-explosion.jpg`, and **51.4 % of those read as sky**
(B > R + 0.05, median RGB 88/66/244) against 7.7 % genuinely dark. The arcade's fireball is
perforated and you see the sky through it. Ours is at ~8 % against that 20 %, i.e. **under**.
Flagging rather than acting: the critique's separate point about *debris chunks* flying
outside the fire is a different element (`drawChunk`) and is untouched this round.

---

## 5. Instruments, and what each was validated on

| instrument | validation | result |
|---|---|---|
| arcade hand count (`arcade_sheets.py` + eye) | operator published in full; the player identified by an independently measured span; 8 frames excluded by stated reason | used |
| `vert_probe.mjs` | samples **every tick** (16.000 s aliasing impossible); control arm = my files at HEAD, same seeds, same tree | used |
| `combat.js _logMiss` → `pHit` | crossings inside the radius **must equal** `playerHitsTaken`; held exactly on all 5 arms | used |
| `fairness_probe.mjs --trace` displacement table | reproduced R5's own operator; **disagrees with R5's published values** — reported as a finding, §2.2 | used, with the disagreement published |
| `measure_expl_phase.py` FIRE-MASK | failed the published control (18.2 % vs 9.2 %); fixed by three exclusion rects; now reproduces all four figures to 0.5 points | used after repair |
| `measure_trail.py` trail shape | passes a planted-wedge/planted-disc self-test; **fails in situ** — measured the horizon haze on both arms | **WITHDRAWN** |

**Capture hygiene.** Every capture set swept for all-black frames and byte-duplicates:
`baseT`/`r6eT` 16 frames each, 16 unique, 0 black; `baseISO`/`r6eISO` 60 each, 0 black;
`expl-phase`/`expl-phase-r6` 340 each, 0 black. `capture.mjs` was run with `--url-params`
throughout and hard-errors on anything else.

**Two snapshots needed another lane's file reverted to HEAD to parse at all**
(`src/game/stage.js`, `src/render/ground.js`, both mid-edit). That substitution was made in
the measurement snapshot only, is named here, and affects the trail and explosion captures —
neither of which reads the ground.

---

## 6. Open, and why

1. **The wall-clock lethality gate is missed by 0.23/min** (2.229 ±0.252 against ≤2.0).
   §2.4 says where it is and what the two ways of closing it cost.
2. **Readable enemies reach 33.5 % of the top third against the arcade's 47.4 %, and the
   residual is entirely `REACH_CEILING_NDC_Y`** — a clamp derived from `player.js
   ENVELOPE_Y = 1.1`, which is another lane's. `ask-combat.md` A1. One line here once it moves.
3. **The explosion's bright fraction is 40.7–44.3 % in the ignition phase** against a ≥45 %
   gate. The lever trades against the starburst silhouette; left as a bound (§4.3).
4. **No numeric before/after for the trail's shape.** The instrument failed in situ and was
   withdrawn (§3). The A/B crop and the authored geometry stand in its place.
5. **Flight share is now 78.2 %, above the arcade's 69.4–73.5 % band.** I caused this by
   making the player die less. The fix is the one R5's feel critique already asked for —
   restore `DEATH_TOTAL_S` toward 7.8 s — and it is now affordable in a way it was not when
   they priced it. By §2.4's arithmetic it is also what closes the last 0.17 of the
   wall-clock gate. `ask-combat.md` A2.
6. **`?demo=1` is an autopilot and everything in §2 measures it.** Nobody has held the
   controls against the new vertical spread. The thing most worth watching for: enemies now
   arrive well above the nose, and whether that reads as "climb to meet them" or as "aircraft
   I cannot reach" depends entirely on A1.
7. **The arcade altitude distribution is one lane's hand count.** It should be reproduced by
   someone else before it becomes a criterion (`ask-combat.md` A4).

---

## 7. Second pass — the three items routed from the flow lane

### 7.1 The lock cone was a function of bank angle. Fixed, and anchored on screen up.

**→ `tools/out/combat-r6/sight-sightbefore.json` / `sight-sightafter.json`,
`tools/out/combat-r6/sight_probe.mjs`**

`ask-flow.md` A1's half-that-is-a-defect-either-way is real, and the mechanism is worth
stating precisely because it is not the obvious one. Everything in this project's NDC frame
is authored against the camera's **pitch-only** basis, deliberately, so that objects swing
around screen centre with the horizon when the camera rolls — that is `screenSpace.js`'s
central trick. The player jet is the one exception: `player.js` rotates its offset by the
same roll so the airframe holds screen station. **The consequence is that the jet's position
in the unrolled frame rotates with the bank, and so does any constant offset bolted onto
it.** `sight.y = playerNdc.y + 0.30` was exactly that.

So the sight orbited the airframe on screen, and with it the vulcan's assist cone
(`_findAssistTarget`) and the missile lock cone (`lockSystem._nearestLockable`), both of
which are centred on `sight`. **Which enemy the gun helped you hit and which one the missiles
locked were functions of how hard you were banking**, with nothing about the target having
changed.

**What I anchored it on instead: screen up, taken from the camera's live quaternion.**
`screenSpace.screenUpNdc()` transforms the camera's local +y into the unrolled frame and
normalises it in frame-width units; the sight is then placed at the airframe plus
`SIGHT_FRAC` along that direction. Taken from the quaternion rather than from a roll angle
passed in, for two reasons: `combat.js` is not given the world roll, and the sign convention
for "rotate about the camera's forward axis" is easy to get backwards — this form is correct
for any camera orientation without anyone having to know which way `worldRoll` turns. At zero
roll it is algebraically the old expression (up = (0,1) ⇒ y gains
`SIGHT_FRAC / (0.5 × 224/320)` = 0.105/0.35 = 0.30), so the measured constant is untouched.

Measured on the live projection of the sight's corner sprites against the jet's projected
centre, both through the **rolled** camera, every tick of a 1800-tick `?demo=1` run:

| | world roll swept | sight→jet lateral offset | **swing** | sight→jet distance |
|---|---|---|---|---|
| before | −28.05° … +37.81° | −15.80 … +20.60 px | **36.40 px = 11.38 %W** | 33.60 px, constant |
| after | −28.05° … +37.81° | −0.00 … +0.00 px | **0.00 px = 0.00 %W** | 33.60 px, constant |

11.38 %W reproduces R4's measured 112 px / 11.7 %W and A1's analytic 11.5 %W. The distance
was already constant in both arms, which is the tell that the error was purely rotational.
**The same change fixes the drawn square**, because the corners are placed from the same
`sight` — so A1's two halves are one fix.

### 7.2 The arcade DOES have the sight square. Do not retire it.

**→ `judging/R6/combat-01-arcade-sight-exists.png`**

I was asked not to delete a MEASURED element on four frames, and to check it with better
instruments. I did, and **the element is there — the flow lane's four frames were unlucky.**

Method: rather than pick frames, I reused my own six-stage hand-labelled set from §1 and
took every frame in it that has a player and **no enemies at all** — 22 frames across stages
1, 4, 6, 7, 12 and 19 — then cropped the band from 32 %H above the jet to 12 %H below it at
2× and looked. That is a different sample from the flow lane's, chosen by a rule written
before the question was asked.

A small four-corner dashed box, **empty**, appears above the nose in zero-enemy frames in
stages 4 (t202, t220, t238), 6 (t289) and 7 (t313, t325). It is **not** in stage 1's t93
climb-out or t111, which is where the flow lane looked.

**The decisive evidence is a consecutive-frame burst**, because it separates the two
hypotheses cleanly: a lock bracket sits on an enemy and drifts with it; a nose sight holds a
constant offset from the airframe. Stage 4, t201.4 → t202.4 at 0.2 s, six frames, **no
enemies on screen in any of them**: the box is present in all six, empty in all six, and
holds station up and ahead of the nose through a bank that moves the jet across a third of
the frame. At 6× with a source-pixel grid its centre reads ~(375, 196) of 686×480 and the
box spans ~13 × 13 px = **1.9 %W**, against our `SIGHT_PX = 10` of 320 = 3.1 %W. It sits
roughly 10 %H above the airframe against our 15 %H.

**Those two comparisons are eyeballed off one frame and are NOT a retune request.** My
attempt to measure the offset automatically failed its own sanity check — the component
pass reported the jet at 6.4 %W when it is nearer 28 %W, i.e. it was segmenting foam and
terrain, and I discarded it rather than publishing the six numbers it produced. What the
evidence supports is exactly one thing, which is what was asked:

> **GAME_SPEC §3 element 1 is real and should not be retired.** It is smaller than ours and
> possibly closer to the nose; both want a proper measurement before anyone moves a constant.

A4(b) can be closed as *confirmed present*. I have left `this._on('sight')` drawing.

### 7.3 Throttle → enemy closure: built, bounded, measured, and WITHDRAWN

`ask-flow.md` A6. The plumbing is wired and shipped — `flow.js`'s `throttleIndex` →
`combat.update` → `spawner.update` → `enemy.update`, multiplying the depth rate only, so a
wave's path through the frame is unchanged and only its timing moves. **The effect is
shipped inert at `[1, 1, 1]`.** That is a measured withdrawal, not an unfinished edit.

**M is exactly 1.0**, per the criteria lane's warning — every measured flight constant was
read off footage with the throttle at M, so the middle detent must reproduce the measured
build bit for bit and L/H are ADOPTED excursions.

**The magnitudes were bounded by a measured criterion rather than chosen.** Reusing
`flow.js`'s `THROTTLE_SCROLL_MULT [0.62, 1.0, 1.45]` so sky and ground agree breaks
GAME_SPEC §4's measured 4–6 s approach:

| multiplier | approach | inside 4–6 s? |
|---|---|---|
| 0.62 | 8.06 s | **no** |
| **0.85** | 5.88 s | yes |
| **1.00** | 5.00 s | yes (datum) |
| **1.20** | 4.17 s | yes |
| 1.45 | 3.45 s | **no** |

So the band fixes the widest excursion available: ≥ 5/6 = 0.833 and ≤ 5/4 = 1.25. The
throttle therefore cannot make the sky rush at you the way it makes the ground rush past
you — an asymmetry `enemy.js`'s header already documents as one the arcade itself carries.

**Then I measured it, on the same 7 seeds × 300 s and the same instrument as the SPEED
sweep, and it breaks both of this round's constraints at once:**

A matched pair — the two arms differ in `THROTTLE_CLOSURE_MULT` and in nothing else
(`tools/out/combat-r6/ship2/` and `r6g/`):

| | rounds/min | deaths/min wall | pHit % |
|---|---|---|---|
| closure inert `[1, 1, 1]` | **133.3** | **2.229 ±0.252** | 2.584 |
| closure `[0.85, 1.0, 1.20]` | **121.3** | **2.371 ±0.260** | 3.030 |
| | **−9.0 %** | **+6.4 %** | **+17.3 %** |

The mechanism is the one `enemy.js`'s "MOVE NONE OF THESE FOUR ALONE" note warns about.
**Closure rate turns out to be a fifth member of that solution set:**

- **Volume, −9.0 %.** The train gate needs `TELEGRAPH_S + 3 × SHOT_SPACING_S` of depth budget
  above `FIRE_DEPTH_MIN`, and budget is `ln(d/24)/|depthRate|`. Scaling the depth rate by
  1.2 shortens the band crossing 1.09 s → 0.91 s, so fewer aircraft qualify to open a train
  at all. R4 gap 5 forbids losing enemy fire volume, side effect or not — the same rule I
  applied to myself in §2.5.
- **Lethality, +6.4 % in deaths and +17.3 % in per-round hit probability.** Faster closure means a flare that lit at a given depth pays out from
  *lower* depths, which shortens the time of flight and so the fairness lag — the exact
  quantity the SPEED sweep spent the round buying.

Restoring both would mean re-setting `TRAIN_START_GAP_S` and `SPEED` again, with the firing
geometry now depending on a player input that no measurement covers. That is a round's work,
not a line, and **trading a measured lethality result for an unmeasured speed cue is the
wrong way round** — particularly against the explicit warning not to let the throttle work
quietly invalidate the constants being measured against. Left wired and inert so the next
lane inherits the interface, the bound and the measured cost and can enable it in one line.
A half-strength `[0.92, 1.0, 1.10]` is the obvious next arm and **was not measured**.

### 7.4 `playEnemyFlyPast` now has a call site

`ask-flow.md` A2, one line in `spawner.js`'s despawn branch, panned from the aircraft's own
`ndc.x`. **Gated on a NEAR despawn, which the ask did not specify and which matters**:
`isRetired()` has three exits — past the fly-past depth, off the side of the frame, and
shrunk past the opener's recede target — and only the first is an aircraft going over your
head. An overtake flight dwindling to a dot at the horizon must not roar. The gate is
`depthRate > 0 ∧ d ≤ depthB × 1.05 ∧ |ndc.x| ≤ 1.2`. **Unheard**: every capture in this
project is muted by construction, so this is wired and plausible, not verified.

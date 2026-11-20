# R40 density-truth lane — the arcade's close-enemy presence, measured

**MEASUREMENT ONLY. No `src/` file was touched by this lane.** Every "ours" number here is
cited from another lane's published figure (R37 r32-reconcile, R38 sky-density) or derived
analytically from committed source read with `git show HEAD:` — the main tree has a sibling
lane mid-edit in `src/game/spawner.js` and `src/entities/enemy.js`, so nothing was captured
from our build.

**Why this lane exists.** Close-enemy presence (~0.09 drawn vs the arcade's quoted 0.40–0.70)
is the longest-open gap in the project, deferred for scope by R32, R36, R37 and R38. The
build lane that attacks it next should spend its round BUILDING. This file is the arcade
truth and the acceptance spec it needs.

*(Written incrementally; sections land as they are measured.)*

---

## 0. The instruments, and their validation

**Arcade source.** `.reference-cache/video/ab2-longplay-60fps.mp4`, 1028×720, `r_frame_rate
60/1`, 59321 frames / 988.68 s. Aspect 1028/720 = 1.4278 = 320/224 exactly, and a decoded
frame fills the raster edge to edge — **no pillarbox, no letterbox**, so `%W = bbox_px / 1028`
is a true screen-width fraction and is resolution-independent.

Spans decoded with consecutive 60 Hz input-seek (`-ss T -t D -vsync 0 f%04d.png`), never
`-vf fps=N`:

| span | STAGE_MAP stage | t (s) | frames |
|---|---|---|---|
| `s1` | 1 (coastal sea) | 94.0–120.0 | 1560 |
| `s2` | 2 (desert)      | 128.0–154.0 | 1560 |
| `s4` | 4              | 204.0–230.0 | 1560 |

**`blobs.py` (this directory) — the locator/measurer.** AB2's sky is a flat fill, so a
per-stage modal RGB plus an L1 distance threshold segments it exactly: measured mode share of
a *whole frame's* 55–150 band is **0.597 (stage 1, `#009eff`)** and **0.601 (stage 4,
`#009e94`)**. Non-sky pixels are grouped into 8-connected components by run-length
union-find (no scipy on this machine). Published width = **component bbox width ÷ frame
width = DRAWN width**, which includes thin wingtips an eye crop can miss.

**The instrument does not decide identity.** It draws a numbered, %W-labelled box; a vision
pass assigns player / enemy / HUD / cloud / ground / explosion / round to each box. This is
deliberate — R38's lane tried an automated non-sky *pixel count* on these same frames and
**withdrew it** (sea foam, wingtips and smoke conflated), and stage 1 contains **friendly
F-14 launch escorts** that are pixel-identical to threats. Identity is not a colour problem.

**Validation on a known input.** `probe210.png` (t=210, stage 4, hand-verified by eye):
the detector returns the player jet at 316 px / 30.7 %W, the two distant enemies at 17 px
(1.6 %W) and 14 px (1.4 %W), the sight reticle, every HUD glyph, and the ground as one
1028-px component — i.e. it finds **everything** in the frame and misses nothing visible
against sky, with each item's width recovered. Its known blind spot is an aircraft silhouetted
on a cloud or on the ground mass, where it merges rather than misses; that biases every
arcade presence figure below **downward**, so they are lower bounds.

---

## 1. FLAGGED: the drawn-vs-nominal conversion the whole gap is quoted in is wrong

This is the first thing the build lane must know, because every "ours ≈ 0.09 drawn" figure in
`STATUS.md`, the R38 NOTES and this lane's own brief depends on it.

**The standing claim (R37 r32-reconcile finding 4, propagated into R38's `gap_probe.mjs`
header and STATUS):**

> `spanFrac` is nominal world wingspan (70.6/depth), **~2× the drawn sprite width** on
> today's slimmed art […] our numbers are LENIENT by ~2× in linear width

**What the geometry actually says.** `makeBillboard(texture, worldWidth)`
(`src/effects/pixelTexture.js:144`) sets `sprite.scale.x = worldWidth`, and
`enemySprite.js:674-684` draws one sheet cell into a `SHEET_CELL_W × SHEET_CELL_H` = 64×32
canvas and uses it whole. So the texture cell maps **edge to edge** onto the quad, and

```
drawnFrac  =  spanFrac × inkRatio(pose)
```

exactly, where `inkRatio` = the cell's alpha-ink bbox width ÷ 64. Measured directly off the
committed sheets (`git show HEAD:src/assets/sprites/enemy-*.png`, alpha > 8):

| sheet | level cell (0°) | ±57° cells | mean over the 9-pose ladder |
|---|---|---|---|
| `enemy-grey-head` | **0.94** | 0.42 | 0.715 |
| `enemy-grey-rear` | 0.94 | 0.52 | 0.767 |
| `enemy-interceptor-head` | 0.91 | 0.45 | 0.701 |
| `enemy-interceptor-rear` | 0.91 | 0.50 | 0.736 |
| `enemy-prop-head` | 0.88 | 0.38 | 0.670 |
| `enemy-camo-head` | 0.94 | 0.42 | 0.715 |

**`inkRatio` is 0.38–0.94 and pose-dependent — it is not a constant 0.5.** The residual
image-plane rotation left after pose selection is clamped to ≤7.5° (`enemy.js`
`poseAngleDeg`/`poseDegFor`), which moves a bbox width by <2 %, so the formula above is the
whole story for any enemy using a detail cell.

**Consequences, all of which the build lane inherits:**

1. The `÷2` is the hard-bank special case. R37's own hand count (drawn ~43 px against a
   recorded 8.1–9.9 %W nominal, ratio 0.45–0.55) landed on cells at the **end** of the pose
   ladder — fast crossers. A near-level approacher converts at **0.88–0.94**, barely a
   discount at all.
2. So "ours ≈ 0.09 close presence by drawn width" is **not** `presence8_nominal` halved.
   R38 shipped `presence8 = 0.178` at a nominal ≥8 %W threshold; under a pose-correct
   conversion the drawn threshold that corresponds to is ~**5.7–7.5 %W**, not 4 %W.
3. **The comment at `src/entities/enemy.js:216-218` is stale and load-bearing:** *"The
   silhouette in enemySprite.js fills its canvas edge to edge, so occupied width == quad
   width and this number is the measurable one."* It is true only for the level cell (0.94,
   and even then not 1.00); across the ladder the mean is 0.70. Anything that treats
   `spanFrac` as drawn width — including the `FLY_PAST_SPAN_PCT_W` guard's claim to be
   checking the REFERENCE.md 25–30 %W *measured* band — is measuring the quad, not the
   aeroplane. This is the CLAUDE.md "comment citing a measurement that was never taken"
   class, and it is the second time this exact conversion has been published wrong.

**What the build lane should do with it:** stop converting with a scalar. Instrument
`drawnFrac` directly as `spanFrac × inkRatio(poseDeg)` using the table above (the pose is
already computed every tick in `enemy.js`; `inkRatio` is a 9-entry constant per sheet). That
turns the existing `__combatStats()` telemetry into a true drawn-width feed with no new pixel
instrument and makes our side directly comparable to the arcade figures in §2.

---

## 2. THE HEADLINE CORRECTION: "the arcade is 0.40–0.70" is a COMBAT-ONLY figure
## being compared against our WHOLE-FLIGHT probe. That has inflated this gap for four rounds.

**What was measured.** 52 frames of stage 1 (t=96.0–119.5), 29 of stage 4 (t=204–229) and 6
of stage 2 (t=128–143), all hand-read at full resolution off `blobs.py`-annotated frames with
a 2 %W grid. **82 pooled samples.** Per frame: how many enemy aircraft are visible, and the
DRAWN width of the largest. The player and the stage-1 friendly launch escorts are excluded —
the launch escorts are pixel-identical F-14s and counting them inflates stage-1 presence
(the first 4 samples, t=94.0–95.5, are tagged LAUNCH and dropped). Raw tally:
`handread.json`.

### 2.1 The sky-state distribution (pooled, whole flight time)

| sky state (DRAWN width of the largest enemy) | pooled | stage 1 | stage 4 |
|---|---|---|---|
| **empty** — no enemy aircraft at all | **0.378** | 0.426 | 0.345 |
| **specks only** — something there, all <4 %W | **0.085** | 0.064 | 0.069 |
| **mid** — largest 4–8 %W | **0.183** | 0.128 | 0.241 |
| **close** — largest **≥8 %W** | **0.354** | 0.383 | 0.345 |

**Arcade close presence by drawn width, over whole flight time, is 0.35 — not 0.40–0.70.**
Binomial SE on 82 samples is 0.053; samples 0.5 s apart are serially correlated so the true
interval is wider. Call it **0.32–0.40**.

### 2.2 Why both earlier figures were right, about different denominators

AB2 does not run at one density. Every stage splits into **air-combat sections** and
**ground-attack / scenery sections**, and the sky is a different place in each:

| | N | P(≥8 %W drawn) | P(empty) | mean simultaneous |
|---|---|---|---|---|
| stage 1 brawls (t=96.0–102.0, 113.5–119.5) | 25 | **0.720** | 0.040 | 2.40 |
| stage 1 lull (t=102.5–113.0) | 22 | **0.000** | 0.864 | 0.14 |
| stage 4 air combat (t=204–218) | 20 | **0.500** | 0.100 | 1.45 |
| stage 4 ground attack (t=218–229) | 9 | **0.000** | 0.889 | 0.11 |
| **all combat sections pooled** | **45** | **0.622** | 0.067 | **1.98** |

So:
- R32's *"readable enemy on screen ~50–70 % of stage-1 **combat**"* reproduces exactly — my
  stage-1 brawl figure is **0.72**, stage-4 air combat **0.50**. **That figure was never
  wrong; it was never a whole-flight figure either.**
- R27's *"~40–50 % of stage-1 **flight time**"* is the whole-span statistic — mine reads
  **0.383** for stage 1, just under their band.
- **The 0.40–0.70 that STATUS.md, the R38 NOTES and this lane's own brief quote as "the
  arcade" is the COMBAT-section band.** Our probes (`gap_probe.mjs`, `presence_probe.mjs`)
  run a continuous 120 s flight with no notion of a combat section, so they produce a
  whole-flight number. Comparing 0.09 whole-flight against 0.40–0.70 combat-only overstates
  the gap by roughly 2×. The gap is still real and large — it is just **0.35 vs ours, not
  0.40–0.70 vs ours**.

### 2.3 Simultaneous-enemy count and the width distribution

Inside combat sections (N=45): **mean 1.98 enemies on screen**, histogram
`{0: 3, 1: 13, 2: 18, 3: 4, 4: 7}` — two at once is the mode, four is common, and a
native-resolution check of one frame (`evidence/g00390.png`, t=100.5) resolves **five**
(29 %W clipped at the left edge, 26 %W, 15.5 %W, ≥6.6 %W, 3.4 %W). Over the whole flight
including lulls the mean is 1.24.

Drawn width of the largest enemy, over non-empty combat frames (N=42): **p25 7.3 %W,
median 11.9 %W, p75 17.5 %W, max 26.0 %W.** Stage 1 runs noticeably bigger (median
12.6 %W, p90 19.5 %W, max 26.0 %W) than stage 4 (median 8.3 %W, p90 21.4 %W) — stage 1
is where enemies fly alongside the player.

**Peak head-on size ~19.5 %W (REFERENCE.md / R27) is CORROBORATED and is not a ceiling.**
Rear-aspect and edge-on crossing enemies routinely read 24–32 %W drawn (t=98.17 TOP 28 %W,
t=100.5 LEFT 29 %W, t=114.97 TOP 30 %W, t=116.17 LEFT 25 %W). The 25–30 %W "size at closest
approach" band in REFERENCE.md is for the *fly-past*, and the arcade hits it regularly.

---

## 3. HOW ENEMIES ARRIVE — the crux, and it is not what the deferred lanes assumed

**Census**: 22 eye-verified appearances (`arrivals.json`). An appearance is counted when the
aircraft is absent in one sampled frame and present ≤0.167 s later (6 Hz census sheets over
both stage-1 brawls and two stage-4 windows; one resolved at 60 Hz single-frame steps).

| | share |
|---|---|
| enters touching a **screen edge** | **15/22 = 0.68** (TOP 6, LEFT 6, RIGHT 2, BOTTOM 1) |
| appears in the **interior** | 7/22 = 0.32 |
| **first visible already ≥8 %W drawn** | **19/22 = 0.86** |
| first visible <8 %W (a speck) | 3/22 = 0.14 — widths 2.5, 3, 6 %W |
| **edge entry AND already ≥8 %W** | **15/22 = 0.68** |

- **Edge arrivals, median first-visible 17 %W, range 10–30 %W.** These do not approach; they
  are simply *there*, at the edge, at a size the player must react to immediately.
- **Interior appearances, median first-visible 8 %W, range 2.5–14 %W.** Even the interior
  ones mostly start readable — a lock-bracketed target at 8 %W, a bomber at 14 %W.
- **The pure speck-grower exists but is rare AND fast.** The one case timed precisely
  (`evidence/fs/t816.png`, stage 4 t=210.73–211.15, eye-verified on a filmstrip): **2.5 %W
  at f444 → 14.6 %W at f469 = 0.42 s**, then 22 %W by f481 (0.62 s). Nothing in the arcade
  spends seconds as a dot.

**The 60 Hz exact case, the one to build against** (`evidence/g01258.png`,
`evidence/g01262.png`, `evidence/arr_s1_A4fine.png`): stage 1, t=114.83–114.93 the sky holds
only the player; **t=114.967 (f1258) a green-camo jet is suddenly present at the TOP-LEFT
corner spanning x=0..~310 px = ~30 %W drawn**; by f1262 it is ~32 %W with its nozzle bell
fully resolved. It was NOT on screen two frames earlier. **It enters LARGER THAN THE PLAYER**
(the player reads 22 %W in the same frame) and stays 20–32 %W for the next ~1.5 s.

**Mechanism, stated plainly.** The arcade's near field is not fed by a depth pipeline at all
for most of its traffic. Aircraft are *placed* at the frame boundary at close depth and
cross; the only thing the depth axis does is let a few of them grow, and it does that in
under half a second. Ours (R38 NOTES §1) *"arrive at depth 90 and grow"* — a lone inbound
spends ~5 s between 0.7 %W and 2 %W. That is the entire gap: not spawn rate, not size, not
fire volume. **It is where an enemy is when it first becomes visible.**

---

## 4. THE RHYTHM — and a standing project figure this contradicts

### 4.1 Brawls and lulls, measured

| | stage 1 | stage 4 |
|---|---|---|
| combat section | t=96.0–102.3 (**6.3 s**) and t=113.5–120+ (**6.5+ s**) | t=204–218 (**14 s**) |
| quiet section | t=102.3–113.5 (**11.2 s**) | t=218–229.5 (**11.5 s**, ground attack) |
| duty cycle (combat ÷ total) | 53 % | 55 % |

- **Inside a brawl the ≥8 %W drought never exceeds ~1.5 s** (longest run of sub-8 %W samples:
  3 consecutive 0.5 s samples in stage-1 brawl 1, 2 in brawl 2). P(empty) inside combat is
  **0.067**.
- **Between brawls the arcade goes genuinely, totally empty for 10–11.5 s.** In stage 1,
  t=102.5–113.0: 19 of 22 consecutive 0.5 s samples have **zero** enemy aircraft, and the
  HIT counter does not move for 6 s. In stage 4 the same thing happens over the ground-attack
  stretch t=218–229.

### 4.2 CONTRADICTED FIGURE — quote it exactly before relying on it

R38 `judging/R38/sky-density/NOTES.md` §2 and its results table state:

> *"live aircraft are visible through most of the HIT-counter pause (**the lock bracket holds
> a distant target the whole time**) … Longest truly-empty stretch **~1.5-2 s**."*

and uses `arcade anchor ~1.5-2 s` as the acceptance target for `maxVisGap`.

**This is wrong, and the stated reason is the project's own named trap.** The thing holding a
target "the whole time" in the upper-right of those frames is the **HUD radar/target scope**
— a fixed white rectangle at x≈755–945, y≈55–190 with a coloured blip in it, present in
*every* frame of the run including ones where the sky demonstrably contains nothing. It is
not an aircraft. CLAUDE.md: *"The HUD contaminates sky-band measurements … It has been counted
as an enemy, as clouds, and has defeated two line fits."* This is the third time.

Two independent operators agree the stretch is real and long:
1. The 2 Hz hand read: 19/22 samples with zero aircraft over t=102.5–113.0.
2. An automated sweep of **all 1560 frames** of the span (non-HUD blobs, 10–420 px): across
   t=102.7–113.3 the largest non-player, non-cloud blob is **76 px (7.4 %W)** at t=108.0–108.3
   and otherwise 10–50 px (1–5 %W). No large aircraft exists anywhere in that window.

**Consequence for the build:** R38's `DEAD_SKY_MAX_S = 1.5 s` relief fill is *more* aggressive
than the arcade. It smooths traffic into an even trickle; the arcade **clumps** it. Raising
mean presence by filling every 1.5 s hole is the wrong lever and will make the game read
*less* like AB2, not more — a continuous drizzle of aircraft is not what AB2 feels like.
The lever is **peak density inside a wave**, with real quiet between waves.

---

## 5. WHAT DOES NOT CHANGE — and why presence can rise anyway

Enemy SIZE is CLOSED (R27 withdrawal; corroborated here — the arcade's peak head-on 19.5 %W
and 25–30 %W fly-past are exactly what `ENEMY_WORLD_WIDTH`/`FLY_PAST_DEPTH` already produce).
Fire VOLUME is CLOSED (R30: arcade fire is sparse; busyness comes from the number of
*aircraft*, not a bullet hail). Neither needs to move. Presence rises from four levers that
touch neither:

1. **ARRIVAL POSITION — the big one.** An enemy that appears at a screen edge at close depth
   is at 17 %W on its first frame without being one pixel bigger than today's sprite at that
   depth. Today's enemy at depth 90 is the *same aeroplane* as one at depth 6; only the depth
   it is introduced at differs.
2. **COUNT, not size.** Mode 2 simultaneous, 4 common, 5 seen. Our `MAX_ALIVE = 6` is already
   enough; the arcade's mean alive *in combat* is 1.98 on screen.
3. **DWELL.** An arcade close enemy stays 20–32 %W for 1–1.5 s and on screen for 1.5–3 s.
   Presence integrates size × time; lengthening the close phase costs nothing in peak size.
4. **CLUMPING.** Moving the same traffic budget out of the lulls and into the waves raises
   in-combat presence without raising the total number of aircraft spawned per minute —
   which is what keeps fire volume flat.

---

## 6. THE BUILD SPEC

### 6.1 Measure drawn width directly; stop using a scalar conversion

```js
// per enemy, per tick — pose is already computed in enemy.js
drawnFrac = spanFrac(space) * INK_RATIO[sheet][poseDeg]
```
`INK_RATIO` per 9-pose ladder entry (±57, ±45, ±30, ±15, 0), measured in §1:

| sheet | -57 | -45 | -30 | -15 | 0 | +15 | +30 | +45 | +57 |
|---|---|---|---|---|---|---|---|---|---|
| grey/camo head-on | 0.42 | 0.59 | 0.83 | 0.91 | **0.94** | 0.91 | 0.83 | 0.59 | 0.42 |
| grey/camo rear | 0.52 | 0.73 | 0.83 | 0.91 | **0.94** | 0.91 | 0.83 | 0.73 | 0.52 |
| interceptor head-on | 0.45 | 0.59 | 0.78 | 0.88 | **0.91** | 0.88 | 0.78 | 0.59 | 0.45 |
| interceptor rear | 0.50 | 0.70 | 0.78 | 0.88 | **0.91** | 0.88 | 0.78 | 0.70 | 0.50 |
| prop head-on | 0.38 | 0.55 | 0.78 | 0.88 | **0.88** | 0.88 | 0.78 | 0.55 | 0.38 |

Re-derive with the 8-line reader in `blobs.py`'s header note if the sheets are redrawn — it is
`alpha>8` column extent ÷ 64 per cell. For the far LOD (`texFar`, below
`DETAIL_SWITCH_NATIVE_PX = 10`) use 1.0; it is a fully opaque value-read texture and those
enemies are far below every threshold here anyway.

### 6.2 Target bands — all on DRAWN width, all pinned to the R36/R38 aim-and-fire pilot

The pilot matters (R37 finding 4: the statistic is pilot-dominated). **Pin it to the same
`gap_probe.mjs` pinned pilot R38 used** — proportional steer onto the nearest on-screen
enemy, fire+missile held, `?invincible=1` for equal flight exposure, seeds 7/11/3 × 120 s
pooled. The arcade side is pinned too: the segments measured carry a pilot killing
**~1.0 kill/s in the stage-1 brawls** (HIT 1→10 across t=98.0–102.5) and **~0.35 kill/s in
stage-4 air combat** (HIT 0→6 across t=204–217) — i.e. a strong player engaging, not a
camper.

| # | statistic (DRAWN width) | arcade | target band | stop-threshold |
|---|---|---|---|---|
| **D1** | P(largest enemy ≥8 %W), **whole flight** | 0.354 | **0.30–0.40** | ±10 % rel.; inside → CLOSED |
| **D2** | P(largest enemy ≥8 %W), **during a spawn wave** | 0.62 | **0.55–0.70** | ±10 % rel. |
| **D3** | P(sky totally empty of aircraft), whole flight | 0.378 | **0.30–0.45** | — do NOT drive to zero |
| **D4** | P("specks only": something present, all <4 %W) | 0.085 | **≤0.15** | this is the one that must COLLAPSE |
| **D5** | mean simultaneous on-screen enemies, in-wave | 1.98 | **1.7–2.3** | ±15 % |
| **D6** | share of frames with ≥3 simultaneous, in-wave | 0.24 | **0.18–0.30** | — |
| **D7** | median drawn width of the largest, non-empty in-wave frames | 11.9 %W | **10–14 %W** | ±15 % |
| **D8** | p75 of the same | 17.5 %W | **15–20 %W** | ±15 % |
| **D9** | longest ≥8 %W drought **inside** a wave | ≤1.5 s | **≤2.0 s** | 1 frame @ 60 Hz |
| **D10** | longest totally-empty stretch **between** waves | 10–11.5 s | **6–12 s** | — raise `DEAD_SKY_MAX_S` from 1.5 s |

### 6.3 Arrival mix — the thing to actually build

| arrival type | arcade share | first-visible drawn width | build target |
|---|---|---|---|
| **screen-edge entry, already large** | **0.68** | median 17 %W, range 10–30 %W | **0.55–0.75** of appearances |
| interior appearance, already readable | 0.23 | 8–14 %W | 0.15–0.30 |
| **far speck that grows** | **0.14** | 2.5–6 %W at first sight | **≤0.25**, and see below |
| **time a speck may take to reach 8 %W** | 0.42 s measured | — | **≤1.5 s** (ours today: ~5 s) |

Edge entries are spread **TOP 6 / LEFT 6 / RIGHT 2 / BOTTOM 1** of 15 — top and lateral
dominate; do not build this as a nose funnel. R38's `_reliefPair` already demonstrates the
exact mechanism (side entry at depth 20–28, `rateMult`, `fireDelay 1e9`, below the parked
sight cone); **generalise it from the dead-sky trigger to a share of the ordinary wave
schedule.** Keep its fairness geometry — the arcade's edge arrivals cross and leave; they are
dodge/shoot events, not new firing trains, which is what keeps D1–D10 from moving fire volume.

### 6.4 ACCEPTANCE TEST — exactly what to run and what "done" means

1. **Instrument** `drawnFrac` per §6.1 and expose it on `__combatStats()` enemies alongside
   `spanFrac`. Exclude `pattern === 'battery'` (R37 finding 4: ground batteries have counted
   as close enemies since 1c0c837, ~0.02 absolute).
2. **Probe**: fork `judging/R38/sky-density/gap_probe.mjs` — same pinned pilot, same
   `?invincible=1`, seeds **7/11/3 × 120 s**, pooled — and swap the `spanFrac >= 0.08`
   operator for `drawnFrac >= 0.08`. Add the wave-window split (a frame is "in-wave" when a
   spawn wave is active) so D2/D5/D6/D7/D8/D9 can be computed; report D1/D3/D4/D10 over the
   whole flight.
3. **DONE** = D1 **and** D4 **and** the arrival mix in band, with D9 ≤2.0 s. D4 is the honest
   headline: *"specks only" ≤0.15*. D1 alone can be gamed by spawning more distant traffic;
   D4 cannot.
4. **Guard rails that must not move** (re-run the existing probes, unchanged):
   `fire_probe.mjs` telegraphs/flight-min within ±10 % of 11.1; `tools/fairness_probe.mjs`
   deaths/min inside 1.33 ±10 % with **0 unannounced** fatal hits every seed;
   `kill_depth_probe.mjs` hands-off ÷ aimed ≤0.4.
5. **Hands before done** (CLAUDE.md DIAGNOSIS GATE): `agent-playtest` before and after. The
   sentence to listen for is *"enemies are on me the moment they show up"* vs
   *"I'm watching dots"*. Probe numbers support that verdict; they do not replace it.

---

## 7. PROJECT FIGURES THIS LANE CONTRADICTS (quoted exactly)

1. `judging/R38/sky-density/NOTES.md` §2 + §4 table — *"Longest truly-empty stretch
   **~1.5-2 s**"* and `arcade anchor ~1.5-2 s` for `maxVisGap`. **Wrong: the arcade goes
   totally empty for 10–11.5 s between waves** (two operators, §4.2). Its stated evidence —
   *"the lock bracket holds a distant target the whole time"* — is the HUD radar scope, not
   an aircraft. `DEAD_SKY_MAX_S = 1.5 s` is therefore tuned to a mis-measurement and should
   be relaxed, not tightened.
2. `src/entities/enemy.js:216-218` — *"The silhouette in enemySprite.js fills its canvas edge
   to edge, so occupied width == quad width and this number is the measurable one."*
   **Wrong across the pose ladder**: ink/quad is 0.38–0.94, mean 0.70 (§1). Every statement
   that `spanFrac` is a drawn width inherits this, including the `FLY_PAST_SPAN_PCT_W` guard's
   claim to be checking a MEASURED 25–30 %W band.
3. `judging/R37/r32-reconcile/NOTES.md` finding 4 — *"`spanFrac` is nominal world wingspan
   …, **~2× the drawn sprite width** on today's slimmed art"*, propagated into
   `judging/R38/sky-density/gap_probe.mjs`'s header and STATUS.md. **A pose-specific special
   case presented as a constant.** 2× holds only near ±57°; near level it is 1.06×. The hand
   count behind it was taken on fast crossers.
4. `STATUS.md` line 17 and this lane's brief — *"close presence by DRAWN width (~0.09 vs
   arcade **0.40–0.70**)"*. **The arcade's whole-flight figure is 0.354**; 0.40–0.70 is its
   combat-section figure and our 0.09 is a whole-flight figure. Both sides must be stated on
   the same denominator (§2.2). The gap is real; it is ~0.09 vs **0.35**, not vs 0.70.
5. `judging/R27/enemy-presence/comparison.md` — *"~40–50 % of stage-1 flight time"*.
   **Mildly high**: stage-1 whole-span measures **0.383** here, just under the band. Not a
   correction, a tightening.
6. R32 `judging/R32/cadence/cadence.md` §1 — *"~50–70 % of stage-1 combat"*. **CONFIRMED**
   (0.72 measured here) and promoted from an eyeballed montage figure to an 82-sample
   hand read with a stated operator. Its *"enemies ARRIVE already mid-large; they do not
   spend 5 s as specks growing from the horizon"* is **CONFIRMED and quantified**: 0.86 of
   appearances are ≥8 %W on first sight, 0.68 at a screen edge (§3).

---

## 8. INSTRUMENTS AND EVIDENCE IN THIS DIRECTORY

| file | what it is |
|---|---|
| `blobs.py` | per-frame non-sky blob locator/measurer (sky mode + L1 threshold + run-length union-find 8-connectivity). Validated on `probe210.png`. **Locates and measures only — identity is assigned by eye.** |
| `gridframe.py` | native-resolution frame with a 2 %W / 10 %W measuring grid baked in. This is how aircraft that MERGE with the sea/ground mass get their drawn width. |
| `strip.py` | tiles consecutive 60 Hz frames (whole frame, downscaled, 10 %W grid) — the arrival step-back instrument. |
| `track.py`, `run_span.py` | 60 Hz tracker. **WITHDRAWN as an arrival instrument** — filmstrips show its long tracks drift onto the HUD SCORE/HIT plates (s4 id1176, id2469) and that it treats expanding explosions as growing aircraft (s4 id265). Kept because its *negative* result is sound (§4.2's whole-span sweep) and because the next lane should know the trap. |
| `handread.json` | the 82-sample presence tally with per-frame notes and HIT counts. |
| `arrivals.json` | the 22-appearance arrival census with entry region and first-visible drawn width. |
| `evidence/` | the frames every figure above was read from. |

**Known limits, stated.**
- One playthrough, three spans, 78 s of arcade footage. The brawl/lull structure is
  corroborated across stages 1 and 4 (and weakly stage 2), but the *lengths* (6.3 s brawl /
  11.2 s lull) come from a small number of instances and should be treated as the shape of
  the rhythm, not a period to tune to the second. That is why D10 is a wide 6–12 s band.
- Presence is sampled at 2 Hz. An appearance shorter than 0.5 s can fall entirely between
  samples; nothing in the arcade's traffic is that short (the shortest crossing measured is
  ~1 s), so the bias is small and downward.
- Aircraft silhouetted on a cloud or on the ground mass are invisible to `blobs.py` and were
  read by eye off the grid. Where both were possible they agreed; where only the eye was
  possible the width carries ~±1 grid cell (±2 %W).
- Edge-clipped arrival widths are VISIBLE widths and are lower bounds on the true span.

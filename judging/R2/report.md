# Judge Round 2 — three.js After Burner rebuild vs arcade AB2

**Date**: 2026-10-02
**Build judged**: `c308882` (world rendering: gaps 1/2/3/8/10) on top of `d43153d`
(jet sprite + HUD), working tree as found (`ARCHITECTURE.md` modified, uncommitted).
**Yardstick**: "Does this look, feel, and play like the 1987 arcade original?"

## Verdict

**FAIL as a fidelity gate — overall 4/10** (R1: 3/10).

Round 2 delivered three genuinely verified wins: the horizon is now in the arcade's
band, world roll is correct to within a fraction of a degree on every published
arcade number, and a complete HUD is present at the measured positions and provably
does not rotate. Those are real and they reproduced under independent measurement.

But the build still does not read as After Burner II, and two of its three headline
claims do not survive re-measurement:

- **The ground does not move.** Not "too slow" — it does not translate at all. In the
  coordinate where the modelled scroll is a pure translation of 23 cells/frame, the
  measured displacement is 0 cells in all 21 frame pairs tested, at r = 0.99, using a
  correlator that recovers synthetic ±12/±23/±46-cell shifts exactly. It is still 0
  when the same build is run at 0.1× scroll speed. Sense of speed is
  ARCHITECTURE.md D7's **item 1**, and it measures zero.
- **A banked frame is now worse than R1's.** `cmp-02` is the whole review in one
  image: ours is a flat blue field split by a bare diagonal, with a horizontal pale
  stripe floating in mid-air that is unconnected to the tilted horizon, and the player
  jet reduced to a sliver at the bottom edge. The arcade frame beside it is a coherent
  rolled world. The underlying world roll is correct; the shading built on top of it
  is not.
- **The player jet sits at 84.5%H**, 26-29 points below every arcade reference
  (t116 55.1, t140 59.7, t175 58.3), overlapping the bottom HUD strip, and **83% of it
  clips off the bottom of the screen during a sustained bank**.

Gaps 6/7/9 (enemies, weapons, clouds) were deferred to Round 3 by design. They are
noted as absent and ranked below; they are not scored twice.

## How this was measured (instrument + positive controls)

Every operator below was re-implemented in Python from REFERENCE.md's prose alone
and validated against REFERENCE.md's own published values *before* being pointed at
our build. Source: `judge-r2` scratch scripts; all numbers reproducible from the
captures listed at the end.

| control | published | my re-run | result |
|---|---|---|---|
| t116 sky mode / share | `#009eff`, 0.82 | `#009eff`, 0.824 | exact |
| t175 sky mode / share | `#000000`, 0.91 | `#000000`, 0.912 | exact |
| t116 horizon row | y=240 = 0.500 H (p10–p90 201–278) | y=242 = 0.504 H (p10–p90 203–278) | exact |
| t175 horizon row | y=310 = 0.646 H (p10–p90 274–322) | y=311 = 0.648 H (p10–p90 275–322) | exact |
| t175 jet span (column-run) | x[225,473] = 36.3%W, debris run 189–199 excluded | x[225,473] = 36.3%W, runs `[(189,199),(225,473)]` | bit-for-bit |
| t98 world roll | 60.7° | +60.42° | exact |
| t112 world roll | 36.8° | +36.54° | exact |

The horizon-angle estimator took three attempts to validate — a naive first-transition
scan is captured by the HUD bar, and plain RANSAC locks onto it (it is a perfectly
straight horizontal line with strong support). The validated form takes the bottom edge
of the **longest contiguous sky-coloured run** per column, which clouds and HUD glyphs
split rather than terminate. Only the third version reproduced t98/t112, and the two
failing versions are recorded here because the first one would have reported our roll
as broken.

The flow correlator was validated against synthetic shifts at the exact magnitudes in
dispute (±8 … ±46) before any negative claim was made, and a **full-pipeline control**
was run: an rsync'd scratchpad copy of the repo with `scrollSpeed` set to 6.893 (0.1×),
where the predicted shift over a 10-frame gap is a comfortably measurable −23 cells.
That control also measured 0.

I also caught and discarded one of my own confounds: I hypothesised the correlation was
pinned at lag 0 by vertically-invariant stripes, tested it by per-column demeaning, and
found that component is **0.1% of the variance** — the hypothesis was wrong and the
original result stands. The result survives that check rather than depending on it.

## Scorecard

| # | Dimension | R1 | R2 | Evidence |
|---|---|---|---|---|
| 1 | Composition & camera | 3 | **4/10** | Horizon measured **0.6250 H** (p10 = p90 = 0.6250), inside the 50–65%H target and matching the claimed cruise constant to 4 decimals — **gap 2 closed**. But the subject is misplaced: jet bbox centre **(49.9%W, 84.5%H)** against arcade 55.1/58.3/59.7%H, 22 points *below* our own horizon, overlapping the HUD bottom strip. Note our horizon is dead flat where the arcade's is ragged (t116 p10–p90 spans 0.42–0.58) because nothing breaks the line — no waves, islands, or clouds. |
| 2 | Palette & sky/ground | 3 | **3/10** | Sky `#009fff` vs arcade `#009eff`, exact. Haze band in neutral flight: starts at 0.625 H, ramps `#6cafff`→`#c1e8fa`, drops to water at 0.714 H = **8.9%H tall**, inside the 7–11%H target. R1's gap-1 numeric acceptance passes (**7,430** distinct colours below horizon, top-8 share **0.095**, vs required ≥2,000 / ≤0.60). It passes and the ground still looks nothing like the arcade — see "measurement problems" below. Sea value spread p5–p95 is **0.922–0.941 (range 0.019)** against arcade t116's **0.655–1.000 (range 0.345)**; **1.5%** of our sea pixels exceed V 0.95 against the arcade's **38.6%**. There is no foam. |
| 3 | Motion & sense of speed | 2 | **1/10** | Measured displacement **0 cells/frame** in world-distance coordinates across gaps of 1, 2 and 4 frames, 21 pairs, r = 0.99, against a modelled 23 cells/frame; unchanged at 0.1× scroll speed; correlator proven on ±12/±23/±46. Consecutive frames do differ (6% of ground pixels) but the change saturates at ~18% after two frames and never grows, i.e. the texture re-modulates in place instead of approaching. Gap 10's re-derivation produced an internally sound number (I reproduced 68.93's geometry independently) that has no visible effect. |
| 4 | Player envelope & controls | 3 | **3/10** | World roll is the round's best work and reproduces on every axis: saturation **66.50°** (target 65–68), ramp **74.5°/s** median (target 74.5), **0.883 s** to 65° (target 0.75–0.90), rigid rotation (line-fit residual median **1.67 px**, target <2), and the correct direction — positive stick descends the horizon to the right, matching t97/t98's sign. Everything downstream of it is broken: the jet falls to **17% of its pixels visible** by 0.5 s into a held bank and touches the bottom edge within **0.17 s**; measured jet-bank/world-roll at saturation is **0.41**, not the coded 0.8; demo-sweep lateral sd collapses to **2.26%W** (R1: 10.67; arcade cruise 12.88). |
| 5 | Gameplay systems present | 1 | **1/10** | Unchanged and deferred by design: no enemies, vulcan, missiles, lock brackets, explosions, clouds, title screen, scoring, or stage progression. Ranked below, not penalised twice. |
| 6 | Arcade presentation | 3 | **5/10** | **Gap 4 substantially closed.** All ten HUD elements present; converted to 686×480 coordinates, SCORE emblem, HIT emblem and reticle frame land within **1 px** of the measured table, SPEED label within 7. HUD non-rotation verified empirically: **100%** of HUD-coloured pixels (4,716 across four colour classes) are bit-identical between level flight and 66.5° roll — and structurally guaranteed, since `screen.js` renders it through its own orthographic camera. Shortfalls: glyphs are consistently too small (stage digit occupies **12** reference-px of width against the measured 38); emblems are plain bars without the arcade's white wing flares; the missile widget is an 8-slot bar, not the base-10 odometer GAME_SPEC §3 decodes; and the reticle has **no attitude line** — REFERENCE.md's round-4 "Reticle anatomy" finding, and clearly visible in `cmp-02`'s arcade half. |

## Claims that did NOT reproduce

1. **Jet span 36.25%W** (`player.js:14-21`, measured by the dev on
   `tools/out/jethud-r2-tune/frame-0000.png`). At the shipped camera it measures
   **40.00%W** — outside R1's 34–38%W acceptance. Robust across mask thresholds
   (40.00%W at thresholds 6–60, 38.75%W at 120), measured on an exact isolation mask
   (`?hidejet=1` difference, 17,073 px). **The integration risk the jet/HUD dev flagged
   materialised**: the constant was tuned at the old pitch, and moving the subject
   off-axis enlarges its perspective projection. Aspect 3.28:1 is still inside 3.2–3.8.
2. **Jet bank = 0.8 × world roll** (`player.js:61`). Measured **0.41** at saturation
   (27.4° of jet bank against 66.5° of world roll), dropping as low as **0.09**
   mid-ramp. The code line is literally correct; the measurement is taken on what is
   actually on screen, and what is on screen is a clipped remnant whose principal axis
   is not the sprite's. Either way the player does not see a jet banking at 0.8×.
3. **"correct under world roll too, since it re-derives from the live view/projection
   matrices every frame rather than assuming a fixed screen row"** (`ground.js:14-17`).
   The screen fraction is re-derived correctly; the *band* is then keyed to
   `uHorizonFrac`, a constant 0.625. Under roll the haze stays a horizontal screen band
   while the horizon tilts away from it. At 66.5° this paints a hard-edged pale wedge
   across the entire upper-left quadrant plus a floating horizontal stripe
   (`raw-ours-full-right-bank.png`). The claim is explicit in a comment and is false.
4. **Ground anisotropy tuned "until the on-screen anisotropy actually landed
   along-track"** (`ground.js:84-91`). The arcade's stage-1 sea is **cross-track**
   dominant on screen: sub-pixel ACF decorrelation-length ratio vert/horiz measures
   **0.20–0.32** in every near-field band of t116 and **0.25** on t97's sea wedge,
   i.e. horizontal features are 3–5× longer. The dev chased the opposite orientation
   and hit it. See the measurement defect below — the dev implemented the spec.
5. **Scroll direction "analytically derived, empirically unverified"** — I can now
   report it properly: direction is not the problem, **magnitude is zero**. The honest
   bound the dev gave was more generous to the build than the facts.

## Measurement problems, not just implementation problems

Three acceptance criteria are themselves wrong, and a developer who satisfies them
exactly will still fail. Fix these before dispatching Round 3 or they will be
re-implemented faithfully.

1. **REFERENCE.md: stage-1 sea "~2.1–2.3× along-track ACF anisotropy"** (ADOPTED
   #135) is contradicted by the frames it claims to describe. My measurement on t116
   and t97 is cross-track-dominant by 3–5× (numbers above), and the matched crops in
   `cmp-05` show it without any instrument: the arcade sea is dense **horizontal**
   white-crested wave bands; ours is soft **radial** streaks converging on the
   vanishing point. Per the reference-wins rule the frames win. This single wrong
   word is the root cause of the dead ground: a texture whose ridges run **along** the
   travel axis slides along itself when scrolled and produces no visible approach —
   which is exactly the 0-cells-per-frame result in dimension 3.
2. **R1's gap-1 acceptance (≥2,000 distinct colours, top-8 share ≤0.60)** passes
   comfortably (7,430 / 0.095) on a sea that reads as a smooth carpet. Colour *count*
   is nearly orthogonal to whether a ground looks like AB2. The discriminating
   statistic is **value contrast and orientation**, not palette size.
3. **R1's gap-5 acceptance "twin fins short and canted, not exceeding ~25% of sprite
   height"** contradicts t175. Measuring the row-width profile of the arcade jet
   (columns 225–473): the narrow fin region spans y=229–272 of a silhouette ending
   ~y=305, i.e. the fins are **~57–62% of silhouette height**, tall canted blades. The
   dev implemented 22.7% exactly as specified, and the result reads as two detached
   ears. Likewise "canopy at the measured violet" carries no size bound: `#9d3aca`
   occupies **0.03%** of `ab2-arcade-reload-dorsal.jpg` and **0.00%** of t116 and t175,
   against **1.24%** of our jet region rendered as a solid rectangle.

## Ranked gaps for Round 3

Ordered by cost against "looks and feels like arcade AB2".

### 1. The ground does not scroll — there is no sense of speed
ARCHITECTURE.md D7 item 1, and it measures zero. Root cause is gap 2's texture
orientation, so these two are one task.
**Reproduction to satisfy**: resample a `?hidejet=1&fixed=1` centre strip onto a
uniform world-distance grid (the mapping is fixed by `CAMERA_HEIGHT`, `CAMERA_PITCH`
and FOV; validate it by confirming `s_of_d(∞)` equals the measured horizon fraction),
then cross-correlate consecutive 60 Hz frames. Required: a **clean, unimodal
correlation peak at the displacement the configured `scrollSpeed` predicts**, within
±15%, in at least 8 consecutive frame pairs — not at lag 0. Publish the positive
control (synthetic shifts bracketing the predicted value) alongside, and a
full-pipeline control at a second scroll speed. A peak at lag 0 is the current
failure and must not be reported as "aliased".

### 2. Sea texture is oriented along-track and has no contrast
**Reproduction to satisfy**: on a captured near-field ground patch, sub-pixel ACF
decorrelation length **horizontal / vertical ≥ 2.5** (the arcade measures 3–5×;
ours is currently inverted), *and* value distribution with **p5–p95 spread ≥ 0.20**
and **≥ 15% of sea pixels above V 0.95** (arcade t116: 0.345 spread, 38.6%). Keep the
existing ≥2,000-colour check as a floor but stop treating it as sufficient. Note the
shader writes `gl_FragColor` directly while the renderer's output colour space is
sRGB, so authored HSV values are re-brightened on the way out — the coded
`vLo=0.796/vHi=0.925` renders as 0.922–0.941; reconcile that before retuning.
Correct REFERENCE.md's "along-track" wording with the t116/t97 citations first.

### 3. Player jet sits at 84.5%H and clips off-screen when banking
**Reproduction to satisfy**: isolation-mask (`?hidejet=1` difference) jet centroid in
**52–60%H** in neutral flight; and across a 2 s full-deflection bank captured at 60 Hz,
**no frame has fewer than 90% of the neutral sprite's pixels visible** and no frame
touches the frame edge. Both `baseY` and `JET_WORLD_WIDTH` are functions of the camera
attitude, so re-derive them together and re-measure span at the same time — span is
currently 40.00%W against the 34–38%W band, and it moved because the camera moved.

### 4. Haze band does not follow the horizon under roll
**Reproduction to satisfy**: at world roll 0°, 30° and 66.5°, the pale band's centre
line fits a straight line whose angle matches the measured horizon angle to **within
3°**, and the band's thickness measured perpendicular to the horizon stays within
±20% of its level-flight 8.9%H. The arcade half of `cmp-02` shows the target: the band
hugs the tilted horizon. Keying the band to horizon-relative distance rather than
absolute screen row is the obvious route but is not prescribed.

### 5. No enemies — the screen is empty (deferred from R2 by design)
GAME_SPEC §4: stage openers are **overtake flights** (2–4 enemies ahead of the player,
rear-aspect, receding) — the first thing every stage shows, and absent from the Godot
prototype. Main pattern is head-on echelons of 3–6 growing over **4–6 s** from
first-visible to fly-past, peaking at **25–30%W** wingspan, banking up to **~57°** into
their drift.
**Reproduction to satisfy**: consecutive-frame comparison across a full approach shows
**no interval where the sprite's measured width is unchanged** (sibling-project #105:
frozen-scale sprites passed a screenshot review and were caught only frame-to-frame);
measured fly-past wingspan lands in 25–30%W; typical flight frames are non-empty;
a stage opener shows rear-aspect enemies receding.

### 6. No weapons (deferred from R2 by design)
GAME_SPEC §3: vulcan rounds are **orange fireball puffs** (`#ffdb21`/`#ffad15`/`#ff9f0c`,
~3–4 native px) in a zig-zag column from alternating muzzles at ~12/s — explicitly
**not** white tracers. Missiles are **multi-lock**: ~6 simultaneous dashed corner
brackets, 6–8 in flight per salvo, launch→impact 0.5–1.5 s, trail a continuous opaque
ribbon at **100% column occupancy** with a **2.2–3.2×** bright/dark quintile value
ratio, aging into discrete round puffs at the tail.
**Reproduction to satisfy**: those three measurables (puff colour+size, bracket count
during a salvo, trail occupancy + quintile ratio) measured on our own capture.

### 7. Jet sprite still reads as flat pixel art
Per `cmp-04`: ours is flat fills — a magenta rectangle canopy, two detached grey ear-fins,
parallel wing slabs with a white stripe across them, no shading ladder in evidence. The
arcade silhouette has tall canted twin blades connected to the nacelles, chord taper, and
internal value structure.
**Reproduction to satisfy**: fins **50–65%** of silhouette height, attached to the body
(single connected component at the sprite's authored resolution); canopy ≤ **0.1%** of
the jet's pixel area or absent from the astern view entirely; at least 4 distinct
airframe values present in the rendered sprite above 1% area each; span back inside
34–38%W at the shipped camera.

### 8. No clouds (deferred from R2 by design)
REFERENCE.md: banks on screen in **68–69%** of stage-1 frames; count median 1 / p90 5 /
max 6; width median **9.26%W** (p90 21.49), height median **6.04%H**, aspect median 0.97.
They also break up the dead-flat horizon noted in dimension 1.
**Reproduction to satisfy**: those distributions measured over a 30 s stage-1 capture.

### 9. HUD glyph scale, missile widget semantics, reticle attitude line
Three separate misses on an otherwise-correct HUD.
**Reproduction to satisfy**: (a) each text element's rendered **width** within 20% of
its REFERENCE.md bbox width, not just its origin — the stage digit is currently 12
reference-px against 38, and width-only checks are what let the sibling project ship a
1px-per-cell glyph (#129); (b) the missile widget is a base-10 odometer — large icon =
10, tick = 1, start **5 large = 50**, resupply fills to **7 large = 70** (GAME_SPEC §3);
(c) the reticle carries an **attitude line that rotates with world roll** and is
horizontal in level flight — the one HUD element that *should* track roll while the
rest does not.

### 10. Jet bank ratio and lateral roam
Blocked behind gap 3 — both measurements are currently taken on a clipped sprite.
**Reproduction to satisfy**: once the jet stays on screen, jet-bank/world-roll in
**0.7–0.9** across the ramp, and demo-sweep lateral sd in **8–14%W** (arcade cruise
12.88%W).

## Evidence files

All under `/Users/urizonens/dev/afterburner-three/judging/R2/`. In every side-by-side,
**ours is on the LEFT / TOP, arcade on the RIGHT / BOTTOM**.

- `cmp-01-neutral-flight-ours-left-arcade-right.png` — ours `?fixed=1&seed=1` vs t116.
  Horizon and sky are right; the jet is at the bottom edge, the sea has no foam, the
  screen is empty.
- `cmp-02-banked-flight-ours-left-arcade-right.png` — ours at saturated right stick vs
  t97. **The single most important image in this report.** Also shows the arcade
  reticle's diagonal attitude line.
- `cmp-03-midbank-ours-left-arcade-right.png` — ours mid-ramp (44.8°) vs t98 (60.4°).
- `cmp-04-jet-sprite-ours-TOP-arcade-BOTTOM.png` — jet silhouette at matched scale.
- `cmp-05-sea-texture-ours-TOP-arcade-BOTTOM.png` — near-field sea at matched scale;
  radial streaks vs horizontal wave bands.
- `raw-ours-neutral-static.png`, `raw-ours-full-right-bank.png`,
  `raw-ours-demo-sweep.png` — unmodified captures.

Captures are mine, taken this round, in `tools/out/judge-r2/` — `static/`,
`hidejet/`, `motion60/`, `demo/` (`?demo=1`, `--every 20`), `roll/` and `roll-nojet/`
(70 frames each at `?debugstick=1`, with and without the jet, giving an exact
per-frame sprite isolation mask), `flow-nojet/` (12 frames, `?hidejet=1`). The
0.1×-scroll full-pipeline control ran in an rsync'd scratchpad copy of the repo, not
in this tree. No other agent's `tools/out/` directory was read from or written to for
evidence. No capture reported a page error.

## Recommendation

Send back. Fix the three measurement defects (REFERENCE.md's "along-track" anisotropy,
R1's colour-count-only ground criterion, R1's fin-height and canopy criteria) **before**
dispatching, then take gaps 1+2 as one task and gaps 3+4 as a second. Those four
restore the things a player notices in the first second: that the world is rushing at
them, and that their aircraft is on the screen. Enemies and weapons (5, 6) should
follow in the same round if capacity allows, since an empty screen caps the ceiling at
roughly where it is now regardless of how good the ground gets.

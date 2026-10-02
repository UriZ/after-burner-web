# Judge Round 1 — three.js After Burner rebuild vs arcade AB2

**Date**: 2026-10-02
**Build judged**: `35a6ecc` (reference pack) on top of `bd6827f` (round-1 scaffold)
**Yardstick**: "Does this look, feel, and play like the 1987 arcade original?"

## Verdict

**FAIL as a fidelity gate — overall 3/10.**

No frame of the current build reads as After Burner II. A player shown
`judging/R1/cmp-01-composition-ours-left-arcade-right.png` would not identify the
left image as the same game as the right one. The screen is a two-colour
checkerboard with a small grey dart on it: no HUD, no enemies, no weapons, no
clouds, no world roll, and a ground texture with 172 distinct colours against the
arcade frame's 63,836.

That verdict is about fidelity only, and it is the verdict that was asked for.
Separately and genuinely to the scaffold's credit: the 320x224 nearest-neighbour
pipeline is correct, the deterministic `?fixed=1` + `window.__step` capture path
is excellent judging infrastructure, the sRGB colour-management fix is right, and
the stage-1 sky colour is reproduced to within one LSB. Those are real
foundations. They are just not yet pointed at the arcade.

## How this was measured (instrument + positive control)

Every number below comes from a measurement operator I reimplemented in Python
from REFERENCE.md's prose alone, then validated against REFERENCE.md's own
published values before pointing it at our build:

| control | REFERENCE.md says | my re-run | result |
|---|---|---|---|
| t116 sky mode / share | `#009eff`, 0.82 | `#009eff`, 0.823 | exact |
| t175 sky mode / share | `#000000`, 0.91 | `#000000`, 0.910 | exact |
| t175 horizon row | y=310 = 0.646 H | y=311 = 0.648 H | exact |
| t175 jet span | x[225,473] = 249px = 36.3%W, h=71px=14.8%H, debris blob x189-199 excluded | x[225,473] = 249px = 36.3%W, h=71px=14.8%H, runs `[(189,199),(225,473)]` | bit-for-bit |

The instrument reproduces the reference pack exactly, so a negative finding below
is a fact about the build, not a broken yardstick.

**One reference-doc defect found doing this.** REFERENCE.md describes the jet-span
method as "connected-component segmentation". It is not: 4-connected component
labelling on that mask returns **14.1%W**, because the dark gaps between wing and
fuselage break connectivity. The published 36.3%W is the extent of the largest
run of *contiguous occupied columns* in the stated band. Both readings are
defensible measurements; they differ by 2.6x. The doc should say which it means,
or the next agent will tune the jet to half size and believe they hit the target.

Captures are mine, taken this round, in `tools/out/judge-r1/` (never reused from
another agent's directory): `static/` (`?fixed=1&seed=1`), `motion60/` (12 frames,
`--every 1` = exact 60Hz sampling), `motion-slow/` (8 frames, `--every 30` = 0.5s
of sim per frame), `demo/` (10 frames, `?demo=1`).

## Scorecard

| # | Dimension | Score | Evidence |
|---|---|---|---|
| 1 | Composition & camera | **3/10** | Horizon measured at **33.5%H** (p10=p90=33.5, dead flat). Arcade level flight: **50.0%H** (t116) and **64.6%H** (t175); adopted cruise constant 62.5%H. We are ~29 percentage points too high, so ground covers 66.5% of frame where the arcade gives it ~37-50%. Jet *vertical* placement is right: ours cy 54.2%H vs arcade 55.1/58.3%H. Jet *size* is half: 17.5%W vs 36.3%W. |
| 2 | Palette & sky/ground | **3/10** | Sky `#009fff` vs arcade `#009eff` — one LSB, effectively exact, and correctly flat (REFERENCE.md: stage 1 has no horizon glow). Ground is the failure: a 50/50 checker of `#0013ec` and `#008300`. The blue is right (H 235.2 deg, S 1.00, V 0.925 = stage-1 sea exactly) but the green is REFERENCE.md's *island vegetation* colour (H 120 deg, V 0.514) used as half the open ocean. Arcade stage-1 sea is dithered blue between V25 0.796 and V75 0.925 with ~2.1-2.3x along-track wave anisotropy. Frame colour count: ours **172** distinct, top-8 share 0.990; arcade t116 **63,836** distinct, top-8 share 0.456. |
| 3 | Motion & sense of speed | **2/10** | Measured on our own build at **exact 60Hz** (fixed timestep, so this is not an aliased sample): the near-field band (80-95%H) is **pixel-identical between frame 0 and frame 6** — zero error at zero shift, 0.1s apart. Consecutive 60Hz frames change 0.00-1.98% of ground pixels, and four of the eleven pairs show zero pixels changed above a 30 sum|dRGB| threshold. Gross scroll does work on a 0.5s baseline (11.7-37.9% of ground pixels change), so nothing is frozen — the texture simply has no spatial detail to carry motion. See gap 10 for the speed-constant category error. |
| 4 | Player envelope & controls | **3/10** | Lateral roam is present and roughly right in magnitude: demo sweep carries cx from 52.8%W to 84.3%W, sd 10.67%W over the sweep, against the arcade's cruise cx sd 12.88%W. Vertical mean 50.6%H vs arcade 52.8%H. But **world roll is entirely absent** — `src/entities/player.js` sets `position` only, never rotation, and `game.js` never touches `camera.rotation.z`. REFERENCE.md's top finding (#1) is that the whole world rotates rigidly about screen centre to a peak of 67.9 deg at ~74.5 deg/s while the HUD stays put. See `cmp-03`: at full stick deflection our horizon is dead level. |
| 5 | Gameplay systems present | **1/10** | Nothing beyond the player: no HUD, no enemies, no vulcan, no missiles, no lock-on, no explosions, no clouds, no title screen, no stage progression. Expected for a foundation round — ranked below rather than penalised twice. |
| 6 | Arcade presentation | **3/10** | The 320x224 internal target and nearest-neighbour upscale are correct and the chunky pixels read properly (`raw-ours-static-frame0000.png`). Zero HUD and zero text means there is nothing else to assess. |

## Ranked gaps

Ordered by how much each one costs us against "looks and feels like arcade AB2".

### 1. The ground is a checkerboard, not AB2 terrain
Our ground is two flat colours in a grid (`src/render/ground.js:22-27`). The
arcade's stage-1 ocean is a dense dithered/streaked field of wave banding.
**Violates**: REFERENCE.md "Ground / terrain palettes" — "AB2 ground is
dithered/streaked, not flat (stage-1 sky modal share 97.8% vs ground 5.7%)", plus
stage-1 anisotropy 2.1-2.3x along-track. **Also the root cause of gap 10**: a
texture with ~6 visible cells cannot show motion.
**Acceptance**: stage-1 ground renders as blue sea with value structure between
V25 0.796 and V75 0.925, no green except on discrete island landmasses; a captured
frame yields >= 2,000 distinct colours below the horizon and a top-8 palette share
<= 0.60 (arcade t116: 63,836 / 0.456); along-track ACF anisotropy in the near field
within 1.5-3.0x.

### 2. Horizon sits at 33.5%H instead of the arcade's 50-65%H
The composition is inverted: we are a ground-dominant frame, the arcade is a
sky-dominant one. **Violates**: REFERENCE.md "Horizon" — t116 0.500 H, t175
0.646 H, adopted cruise 0.625 H.
**This is a spec defect, not just a code defect.** `ARCHITECTURE.md` D2 asserts
"horizon in upper third during level flight", and `game.js:12-17` faithfully
solves `CAMERA_PITCH = -0.172` from that claim. The claim is contradicted by every
level-flight reference frame. Per the reference-wins rule, D2 must be corrected
first or the next developer will re-derive the same wrong pitch. Note the required
camera attitude is a slight pitch **up** (tan(pitch) = -0.130, about +7.4 deg at
FOV 55), not down.
**Acceptance**: measured horizon in level flight lands in 50-65%H using the
column-scan operator above (6 consecutive rows, >60 sum|dRGB| from sky mode, median
of 66 columns), and ARCHITECTURE.md D2's wording is corrected with the t116/t175
citations.

### 3. No world roll when banking
AB2's signature motion is missing entirely. **Violates**: REFERENCE.md "Horizon
tilt when banking" (ADOPTED #128) — rigid rotation about screen centre
(0.51 W, 0.49 H), peak |roll| 67.9 deg saturating 65-68, median roll rate
74.5 deg/s, full 0-65 deg in ~0.8s, **HUD does not rotate**, horizon descends to
the right when banking right. Evidence: `cmp-03-banking-ours-left-arcade-right.png`.
**Acceptance**: full-deflection stick produces world roll saturating at 65-68 deg
reached in 0.75-0.9s; the rotation is a rigid rotation about screen centre
(line-fit residual on the horizon < 2px, i.e. rotation not shear); the jet sprite
banks with it; once a HUD exists it stays upright. Express the threshold in
**degrees of roll**, not in any width-normalised tilt proxy.

### 4. No HUD
Nothing is drawn. **Violates**: REFERENCE.md "HUD" table in full — SCORE winged
emblem and digits, HIT emblem and count, the top-right lock reticle with centre
dot, and the bottom strip (SPEED label + throttle letter + blue throttle bar with
amber chevron, STAGE text + digit, missile stock icons). Note the arcade HUD is
drawn **over** the world with no opaque bar, and AB2 has **no altitude indicator**
(ARCHITECTURE.md D7 item 5 wrongly lists "altitude bar" — second spec defect).
**Acceptance**: all nine elements present at the measured bounding boxes
(fractions of 686x480) and measured colours; world visible behind the bottom
strip; no altitude element; HUD does not rotate with world roll.

### 5. Player jet is half size and the wrong silhouette
Measured 17.5%W against the arcade's 36.3%W (t175 neutral, range 29-38%W) — about
a quarter of the screen area. Worse, the **aspect is wrong**: the arcade
silhouette is 249x71px = **3.51:1**, ours is 168x147px = **1.14:1**. That ratio is
why it reads as a paper dart rather than an F-14: wings too short, and the twin
tails (`spriteFactory.js:48-54`) run to y=4 of a 32px canvas, so they read as two
black antennae against the sky. The canopy is `#3c4858` dark blue-grey where the
measured arcade canopy is violet-magenta `#9d3aca`.
**Acceptance**: neutral-flight span 34-38%W, silhouette bounding box aspect
3.2-3.8:1, twin fins short and canted (not exceeding ~25% of sprite height),
visible wing band across the span per `ab2-arcade-reload-dorsal.jpg`, two
prominent glowing nozzles, canopy at the measured violet.

### 6. No enemies — the screen is empty
Arcade stage-1 frames are busy: t100 has four aircraft, lock brackets, a missile
flame, an explosion and debris simultaneously. **Violates**: REFERENCE.md
"Enemies" — wingspan 25-30%W at closest approach, bank ~57 deg into lateral drift,
approach from the horizon growing toward the player.
**Acceptance**: enemies spawn at the horizon and scale continuously to 25-30%W at
fly-past, with **no frozen-scale interval** (sibling-project issue #105: sprites
stuck at one size across the near half of the approach passed a screenshot review
and was caught only by consecutive-frame comparison — check consecutive frames,
not stills); they bank into their drift; typical flight frames are non-empty.

### 7. No weapons
No vulcan, no missiles, no lock-on. **Violates**: REFERENCE.md "Missiles /
weapons visuals" — the missile smoke trail is a **continuous opaque ribbon**
(100% column occupancy, ~16px at the head, internal value structure mean V 0.37,
bright quintile 0.594, dark quintile 0.219), not an alpha fade; vulcan reads as
short tracer streaks converging on the sight line with a muzzle flame at the jet;
lock brackets are small blue corner-brackets `#008cd9`-`#3bbaff` on enemies,
distinct from the fixed top-right reticle.
**Acceptance**: measured trail column occupancy >= 95% with a bright/dark quintile
value ratio in 2.2-3.2x; lock brackets at the measured colours; vulcan visible as
tracers under a held fire key.

### 8. Hard horizon edge instead of the arcade's haze band
MEASURED this round on t116 at x=600: the arcade transitions through a pale band
roughly y=244-288 (**50.8%H to 60.0%H**, ~9%H tall), ramping `#6cafff` ->
`#93c7ff` -> `#c3edff` -> `#d1f4f8` before dropping to deep water `#010ff9`. Our
build steps from `#009fff` straight to `#0013ec` across a single row.
**Note**: ARCHITECTURE.md D2 specifies a "fog-free hard horizon band", which
contradicts the frames — third spec defect.
**Acceptance**: a pale horizon band 7-11%H tall ramping from the sky colour toward
near-white before the water value drop, sampled to within ~10% of the values above.

### 9. No clouds
**Violates**: REFERENCE.md stage-1 cloud measurement (ADOPTED #132) — banks are on
screen in **68-69% of frames**, count median 1 / p90 5 / max 6, width median
9.26%W (p90 21.49), height median 6.04%H, aspect median 0.97. See t92 and t97.
**Acceptance**: over a 30s stage-1 capture, cloud banks present in 60-75% of
frames with per-frame count and size distributions matching the medians above.

### 10. Scroll speed was ported from the Godot prototype without reinterpretation
`stage.js:8` takes `scrollSpeed: 2.8` directly from the Godot
`stage_data.gd` entry. The README correctly rejects `horizon_fraction: 0.625` from
that same entry, on the grounds that it parameterises a different rendering model
(2D depth hack, `screen_y = horizon_y + d^2*span`). **That identical argument
applies to `scroll_speed` and was not applied** — 2.8 is a rate in the prototype's
`d` space, and it is now being fed to `uScroll` as three.js world units per
second. The two are unrelated units and the match is coincidental at best.
**Speed verdict deliberately withheld.** REFERENCE.md's only certified arcade flow
numbers are a stage-1 cruise **floor** of >= 3.063 px/frame (~95.7 %W/s) at
motion-metrics' 192px work width and a certified canyon value of 1.9433 px/frame;
the true cruise speed is not measurable from the available footage. A comparative
speed claim needs the same estimator run on both sides at 60fps, which is out of
scope for a still-frame gate.
**Acceptance**: `scrollSpeed` is re-derived in world units/s from a stated camera
geometry and cites its derivation; and the 60fps motion-metrics estimator is run
on our capture and on the arcade 60fps file with the same work width, with our
cruise flow at or above the certified 3.063 px/frame floor.

## Evidence files

All paths under `/Users/urizonens/dev/afterburner-three/judging/R1/`. In every
comparison, **ours is on the left, arcade is on the right**.

- `cmp-01-composition-ours-left-arcade-right.png` — ours `?fixed=1` vs t116 level
  flight. Shows gaps 1, 2, 4, 5, 6, 8 at once.
- `cmp-02-jetscale-ours-left-arcade-right.png` — ours vs t175, the cleanest arcade
  jet-scale frame. Shows gap 5.
- `cmp-03-banking-ours-left-arcade-right.png` — ours at full right stick vs t97
  banked. Shows gap 3: our horizon is level at full deflection.
- `cmp-04-screenbusy-ours-left-arcade-right.png` — ours vs t100. Shows gap 6/7.
- `raw-ours-static-frame0000.png`, `raw-ours-demo-frame0005.png`,
  `raw-ours-motion60-frame0006.png` — unmodified captures.

## Recommendations for round 2

Fix the three **spec** defects before writing any code, or they will be
re-implemented faithfully and fail again: ARCHITECTURE.md D2's "horizon in upper
third" and "fog-free hard horizon band", and D7 item 5's "altitude bar". Also
disambiguate REFERENCE.md's jet-span method.

Then, in fidelity order: ground texture (gap 1) and horizon placement (gap 2)
together, since they define the frame; world roll (gap 3); HUD (gap 4) and jet
sprite (gap 5); then enemies and weapons.

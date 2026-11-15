# R17 world lane — build report

Files owned and touched: `src/render/ground.js`, `src/render/clouds.js`,
`src/game/stage.js`. (`src/render/sky.js` needed no change — it reads
`skyTop`/`skyHorizon` generically, so stage 13's sage sky is pure stage data.)

Developer work — left in the tree for the TL to verify + commit. No commit/push.

## Gap 1 — make the refuel stage read as a BASE, not a road

### Ground props beside the strip (`ground.js` + `stage.js`)
Added `createRunwayProps()` to `ground.js`: a pool of world-space billboard
sprites (canvas pixel art, NearestFilter — same construction and flat-sprite
look as `clouds.js`) planted on the ground just off the tarmac and scrolled
toward the camera at the ground's own `scrollSpeed`, so they stream past like
the stage-1 islands. Four prop types authored from the arcade frames:

- **tanker** — silver cylindrical fuel tank on a chassis (the stage's headline object)
- **truck** — olive military box truck
- **tent** — a row of three tan tents with dark doorways
- **crew** — a cluster of small figures

Parenting trick that kept this inside the world lane: the group is a child of
`ground.mesh`, whose geometry is pre-rotated so the mesh transform is identity
(mesh local frame == world space). `game.js` already adds `ground.mesh` to the
scene, so the props reach the scene with it — **no `game.js` change**. Stages opt
in with `runwayProps: [...]` (STAGE_5 uses all four; STAGE_13 drops tents).

Palette: ASSUMED neutrals/olives on the hardware 4-bit ladder, flagged in code —
the repo has no measured prop palette. Only the tent tan borrows the autumn
family. Determinism: a fixed internal seed (createGround takes none), consistent
with the ground texture being seed-independent.

**Verified** (`?stage=5&fixed=1`): tanker, tent row, green truck and crew all
render and read as themselves; consecutive frames show them approach and grow,
then recycle to the far end (props track the ground flow, direction confirmed).
Ours-vs-arcade: `judging/R17/world-s5-ours-vs-arcade.png` (also `world-s5-ours.png`,
`world-s5-ours-b.png`). Arcade: `judging/R16/judge-evidence/arcade-s5-t245-refuel-base.png`.

### Clear sky on the refuel stages (`clouds.js` + `stage.js`)
Added a per-stage cloud gate: a stage with `showClouds: false` hides every bank
and parks the spawn state machine; `update()` early-returns while suppressed.
Set on STAGE_5 and STAGE_13 (STAGE_MAP cloud_density 0 there). Deliberately
OPT-OUT, not keyed to STAGE_MAP's cloud_density column (which is 0 for stages
2-23 as well) — STATUS.md's R17 brief says not to regress clouds on 1-4.

**Verified non-regression**: stage 1 and stage 4 captures still show clouds;
stage 5 shows none (`world-s5-ours*.png`).

### Stage 13 — its own green biome (`stage.js` STAGE_13; needs a flow route)
`_renderStage()` (flow lane, not mine) maps BOTH refuel stages to STAGE_5, so
stage 13 can't render its own biome without a one-line flow change — asked in
`judging/R17/world-asks.md` (ASK 1). Built `STAGE_13`: measured sage sky
`#9fc9a5` (STAGE_MAP, LOW CONFIDENCE), a yellow-green palm/sage flank, same strip,
clear sky, tankers/trucks/crew. The runway branch gained a `runwayFlankGreen`
path so the green flank skips the autumn colour-snap (which would force it
orange) and takes the hardware-ladder quantizer instead.

**Flagged BOUND, stated plainly.** STAGE_MAP leaves stage 13's ground
UNMEASURABLE (0/16 frames). The green is a MEASURED-HUE bound only: sampled off
the arcade stage-13 flank (`arcade-s13-t562`), H~75-90deg S~0.9 modal `#608000`,
V25 0.11 / V50 0.30 / V75 0.52 — reproduced as the flank's hue/sat/value band,
not a certified palette. **Not verified in situ** this round (no flow route yet);
the green-flank shader path compiles and runs (it is the alternate side of a
ternary in the same branch stage 5 exercises). Palms are NOT built as discrete
props — the green flank + sage sky already read as the distinct biome; discrete
palms deferred (see below).

## Gap 3 — the stage-4 forest ground was dark and flat

### Measured V re-centre (`ground.js` forest branch + `stage.js`)
The forest veg index was hardcoded `0.45`, landing the MODAL colour on vegRamp's
`#004200` (V0.259) — below STAGE_MAP's measured stage-4 V25 of 0.282. Made it a
uniform `uForestCentre` and set stage 4 to **0.58**, chosen by MEASUREMENT not
eye: the rendered green V-distribution now reads

| | V25 | V50/mode | V75 |
|---|---|---|---|
| STAGE_MAP (arcade) | 0.282 | 0.322 | 0.416 |
| ours (capture, n=193k) | 0.259 | **0.322** | 0.388 |

Mode and median land exactly on the measured `#005200` (V0.322); both tails sit
within one ramp rung (0.063) of the band — the best a 6-rung discrete ramp can
do, and a full rung brighter than the old centre. (Did NOT read frac-below-
threshold off an upscale — this is the rendered distribution, R12 §2.3.)

### The cyan river (`ground.js` forest branch + `stage.js`)
Added a meandering cyan river as a real terrain feature: a low-frequency wander
of depth paints water where its centreline nears the fragment's x, so it scrolls,
takes the perspective/haze and ladder-snaps like the islands. HUE is MEASURED off
the arcade stage-4 water (H=183deg S=1.00, modal `#00d6e6`, V p50 0.91 — bright
cyan); width/meander are ADOPTED (no stage-4 river geometry in the repo).
**Verified** (`?stage=4`): brighter mottled green + a winding cyan channel —
`judging/R17/world-s4-ours-vs-arcade.png`.

## Deferred / notes

- **Trees to the top + low swoop framing** (gap 1's other half) — the framing
  lane's camera-pitch change, not the world lane's. The props are world-space on
  the ground and will rise into the frame when the camera drops; no world change
  needed then. This is why ours' upper frame is still empty sky.
- **Discrete palms on stage 13** — deferred; the green flank + sage sky carry the
  biome distinction. A palm prop could be added to `createRunwayProps` later.
- **GAME_SPEC ADOPTED notes** for the refuel props + cloud gate — asked of the
  docs owner in `world-asks.md` (ASK 2); not a world-lane file.

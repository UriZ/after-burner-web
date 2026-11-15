# R17 world lane — cross-lane asks

Work the world lane could not do inside its own files (`src/render/ground.js`,
`src/render/clouds.js`, `src/render/sky.js`, `src/game/stage.js`). Each is a
small, specific change owned by another lane.

## ASK 1 — ROUTE STAGE 13 TO ITS OWN BIOME (flow lane: `src/game/flow/flow.js`)

**Why.** R16's judge costed "stage 13 shows the wrong biome": the arcade's two
refuel stages are different biomes — stage 5 is autumn woodland (orange), stage
13 is a green palm/sage base (arcade frames at t=552-568). Today `_renderStage()`
maps BOTH to `STAGE_5`, so stage 13 renders the autumn runway.

The world lane has built `STAGE_13` (green sage flank, measured sage sky
`#9fc9a5`, same strip, clear sky, tankers/trucks/crew) and exported it from
`src/game/stage.js`. It is unused until flow routes stage 13 to it.

**Change** (one import + one line):

```js
// top of flow.js, with the other stage imports
import { STAGES, STAGE_5, STAGE_13 } from '../stage.js';

// _renderStage()
_renderStage() {
  if (this.stageNumber === 13) return STAGE_13;
  return isResupplyStage(this.stageNumber) ? STAGE_5 : STAGES[this.stageIndex % STAGES.length];
}
```

`isResupplyStage(13)` stays true, so stage 13 keeps the `resupply` state, the
clear-sky gate and the props — only the rendered flank/sky swap to the green
biome. Verify with `?stage=13`.

**Caveat, stated plainly.** STAGE_MAP leaves stage 13's ground UNMEASURABLE
(0/16 frames accepted); `STAGE_13`'s green is a MEASURED-HUE bound (H~80deg off
the arcade frame), not a certified palette. The sky is measured LOW CONFIDENCE.
This is a flagged bound, as STATUS.md's R17 brief allows.

## ASK 2 — GAME_SPEC bookkeeping (criteria/docs owner)

Record as ADOPTED in `GAME_SPEC.md §5` (refuel): the refuel BASE scenery — fuel
tankers, military trucks, tent rows and ground crew beside the strip
(`createRunwayProps` in `render/ground.js`), and the per-stage cloud gate
(`showClouds: false` on the refuel stages). These are the R17 build of the
refuel beat's LOOK; the camera-pitch framing that fills the frame with trees is
the framing lane's (`judging/R17/framing-asks.md`).

## NOT an ask — the low-altitude framing is the framing lane's

The remaining refuel-LOOK gap (autumn trees filling the frame to the top; the
terrain-rushing low swoop instead of the cruise horizon) is a camera-pitch
change coordinated with the player sprite placement — owned by the framing lane
this round, not the world lane. The props built here are world-space on the
ground plane and will rise into the frame automatically when the camera drops;
no world-lane change is needed when that lands.

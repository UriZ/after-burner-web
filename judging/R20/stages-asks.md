# R20 STAGES lane — cross-lane asks & flagged bounds

Owned files this round: `src/game/stage.js`, `src/render/ground.js`,
`src/render/sky.js`, `src/render/clouds.js`. Everything below is OUTSIDE those
files, so it is an ask, not an edit.

## What this lane shipped (for context)

Two new authored COMBAT biomes appended to `STAGES` (the lap grows 4 → 6):

- **STAGE_16 — blue city.** Sky `#a9a8fd` pale lavender (MEASURED, flat). Ground
  a measured azure dither (MEASURED H=205 S=1.000 V25-V75 0.478-0.673, one of
  STAGE_MAP's KEPT-9 grounds, both corroborators in window). New `field` ground
  mode (isotropic measured-palette dither; STAGE_MAP classes stage 16
  ground_structure "plain", so no building grid was invented). Reach: `?stage=6`.
- **STAGE_14 — gold-dusk olive forest.** Sky `#ffc600` gold glowing to `#fd9008`
  orange at the horizon (MEASURED glow stage; glow elevation measured as geometry
  off the upscale, committed colours to STAGE_MAP). Ground measured olive
  (H=55 S=0.703 V25-V75 0.248-0.576). Same `field` mode. Reach: `?stage=11`.

Both verified by capture (clean world + full combat), no regression to stages
1-4 / refuel / tanker. Geometry (stipple/macro frequencies) is ADOPTED from the
canopy family and flagged in `stage.js`; the PALETTES are measured.

## ASK 1 (flow.js, optional fidelity) — show the new biomes at their TRUE arcade numbers

The two new stages lap into normal play wherever `stageIndex % 6` lands on index
4/5: **STAGE_16 at arcade stageNumber 6/12/18, STAGE_14 at 11/17/23**. That adds
the variety the R20 gap asks for, and it is the honest existing lapping behaviour
(content laps; the HUD number tells the truth). But the biomes were MEASURED from
arcade stages 16 and 14, so for full fidelity they should ALSO render at those
numbers — exactly the way `_renderStage` already special-cases stageNumber 13 →
`STAGE_13`.

Requested in `flow.js`'s `_renderStage()`, alongside the existing stage-13 line:

```js
if (this.stageNumber === 16) return STAGE_16; // R20 blue city (import from stage.js)
if (this.stageNumber === 14) return STAGE_14; // R20 gold-dusk forest
```

(Both are exported from `stage.js`.) This is NOT blocking — the stages already
appear via the lap and are capturable via `?stage=6` / `?stage=11`. It only makes
`?stage=16` / `?stage=14` land on the biome measured from that arcade stage.

## ASK 2 (combat lane, optional) — difficulty for the new content indices

`spawner.js`'s `ELITE_FRACTION_BY_STAGE = [0.12, 0.22, 0.30]` has 3 entries and is
read `[stageIndex] ?? [0]`. Content indices 4/5 (and already index 3, the forest)
fall back to the easiest value 0.12. This is PRE-EXISTING (stage 4 already falls
back) — not a regression introduced here — but if the combat lane wants the later
biomes to scale difficulty, extend that array to length 6. The new stages are both
DAY stages, so `trailPaletteFor` / the jet night sheet already resolve correctly
(daylight) with no change.

## FLAGGED BOUND / next-biome plan — CANYON (arcade stage 8), the strongest remaining biome

Stage 8 is the single most distinct arcade biome still unbuilt (cream `#faecb0`
sky, measured warm-rock ground H=35 S=1.000 V75=0.831, confirmed by direct pixel
reads t=357). Looked at the frame (t=357): it is unmistakably a CANYON — tall
rock WALLS on BOTH flanks rising to the top of frame, a narrow strip of distant
cream sky between them, a LOW horizon. It was NOT shipped this round because doing
it WELL needs two things outside this lane's files, and a canyon at the cruise
0.625 horizon with no walls would look wrong (the TL's "a half-built biome that
looks wrong is worse than none"):

1. **A LOW per-stage horizon (cross-lane, game.js).** STAGE_MAP measures stage 8's
   horizon at 0.13 (vs cruise 0.625). The horizon is set from camera pitch, and
   `game.js` owns camera pitch (`CAMERA_PITCH` cruise, `RESUPPLY_PITCH` for the
   refuel swoop). A canyon needs a THIRD per-stage pitch (~0.13 horizon), selected
   per rendered stage the same way the resupply swoop already selects
   `RESUPPLY_PITCH`. `ground.setFraming(pitch, horizonFrac)` already exists in this
   lane's `ground.js` to track a non-cruise pitch, so the ground/haze side is
   ready; what is missing is game.js choosing the canyon pitch for a canyon stage
   and keeping combat framing stateless (STATUS.md's byte-identical-combat rule).
   STAGE_MAP also gives stage 8 its own scroll_speed 0.804 (canyons run slower).
2. **Wall masses (this lane can build these).** The flanking rock walls can be
   world-space billboard sprites planted off the strip and scrolled toward the
   camera, exactly like `ground.js`'s existing `createRunwayTrees` / `createRunwayProps`
   (parented to `ground.mesh`, so they reach the scene with no game.js change).
   Palette = the measured warm-rock ladder. This is buildable entirely in this
   lane ONCE the low horizon exists — without it the walls have nowhere to stand.

So canyon is a high-value R21 candidate gated on the game.js per-stage pitch. If
the framing lane adds a per-stage canyon pitch, this lane can deliver the walls +
measured palette and finish the biome.

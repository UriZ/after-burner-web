# R17 FRAMING lane — WITHDRAWAL + cross-lane ask

**Lane:** R17 refuel low-swoop camera (gap 1, framing half).
**My files:** `src/core/cameraGeom.js`, `src/render/viewport.js`, `src/render/screen.js`,
`src/entities/player.js`.
**Deliverable:** make the camera drop low during the `resupply` flow state so the runway/terrain
fills the frame to the top (judging/R16/judge-evidence/arcade-s5-t245-refuel-base.png), gated
strictly to `resupply`, combat framing byte-identical everywhere else.

## Outcome: WITHDRAWN. All four of my files left at HEAD (zero diff).

Not because the effect risks combat framing or clips the jet (the TL's anticipated failure mode),
but for a more basic reason: **the only lever that raises the horizon lives entirely in
`src/game/game.js`, which is not in my file set, and the `resupply` gate is only readable inside
game.js's update loop.** None of my four files can effect or gate the change. A half-measure
confined to my files (moving only the jet sprite) would misplace the aircraft and do nothing to
the horizon, so I shipped nothing.

## Why it can't be done in my files (verified, not assumed)

1. **The horizon is pure camera pitch, and pitch is composed only in game.js.**
   - `camera.quaternion` is written in exactly one place: `game.js:345`
     (`_applyCameraOrientation`), as `camera.quaternion.copy(this._pitchQuat).multiply(rollQuat)`.
   - `this._pitchQuat` is built **once** at construction (`game.js:93`) from the fixed
     `CAMERA_PITCH` constant. Nothing varies it per frame.
   - `grep` for `camera.quaternion` / `_pitchQuat` across `src/` returns only game.js (plus
     read-only consumers in lockSystem/screenSpace). **None of my four files touch the live
     camera per frame.** player.js imports `CAMERA_PITCH`/`CAMERA_HEIGHT` as *constants* and
     positions only its own sprite; screen.js renders whatever camera it is handed; viewport.js
     is just `GAME_W/GAME_H`; cameraGeom.js is constants + pure solvers.

2. **The ground is real 3D geometry, so a camera pitch-down WOULD work — but the pitch is
   still game.js's.** `ground.js:1759` builds `PlaneGeometry(4000,4000)` rotated flat at y=0,
   `frustumCulled=false`, drawn with `gl_Position = projectionMatrix * viewMatrix * world`. Its
   on-screen horizon follows the real camera orientation. So pitching the camera down genuinely
   raises the terrain line — confirming the approach is sound; it just isn't mine to pull.

3. **The horizon is a single fixed value shared by every stage, resupply included.**
   `game.js:99` sets `this.horizonFrac = horizonFracFor(CAMERA_PITCH, FOV_DEG)` once and passes
   it to `createGround`. There is no per-stage horizon anywhere (grep confirms). Analytically:
   `horizonFracFor(0.12941, 55) = 0.6250` for stage 1 (combat) and stage 5 (resupply) alike.
   **This is the gap, and the proof it exists.** It also means my withdrawal cannot have touched
   combat framing: I changed nothing, so stage 1 is bit-identical by construction.

4. **The flow-state gate is only visible inside game.js.** `flow.state === 'resupply'` is read
   in game.js's update loop and flow.js. My files are never called per frame with *both* the
   live camera and the flow state, so I cannot gate anything to resupply from where I sit.

Approaches ruled out before withdrawing: (A) change `CAMERA_PITCH` in cameraGeom.js — global,
hits every stage, breaks the R15 combat sight; (B) mutate the camera inside screen.js.render —
screen.js has no flow state and the call site `screen.render(scene, camera, worldRoll)` is in
game.js, so I can't pass it in; (C) drive the camera from player.js — game.js overwrites
`camera.quaternion` every frame in `_applyCameraOrientation`, stomping anything player.js writes;
(D) read a window global from player.js and move only the jet — doesn't move the horizon (the
actual goal) and is fragile. Every path that raises the horizon edits game.js.

## The ask: wire the pitch drop in the camera owner (game.js / game-flow lane)

This is a ~6-line change, entirely in game.js, and it leaves **player.js untouched** because
`Player` already consumes `this.baseY` live every tick (`player.js:847`) — so the coordinated
sprite placement is just a field assignment, not a player.js edit.

```js
// game.js — add near PLAYER_CRUISE_SCREEN_FRAC (all ASSUMED, see note):
const RESUPPLY_PITCH = -0.28366;            // rad; horizon ~0.22 (terrain to the top)
const RESUPPLY_PLAYER_BASE_Y =              // jet ~0.43 screen frac over the runway
  worldYForScreenFrac(0.43, PLAYER_BASE_Z, RESUPPLY_PITCH, FOV_DEG);  // = 1.1296
const CRUISE_PLAYER_BASE_Y =
  worldYForScreenFrac(PLAYER_CRUISE_SCREEN_FRAC, PLAYER_BASE_Z, CAMERA_PITCH, FOV_DEG);

// build both pitch quats once in the constructor:
this._pitchQuatCruise   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), CAMERA_PITCH);
this._pitchQuatResupply = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), RESUPPLY_PITCH);

// in update(), BEFORE _applyCameraOrientation(), gate strictly on the flow state:
const resupply = this.flow.state === 'resupply';
this._pitchQuat = resupply ? this._pitchQuatResupply : this._pitchQuatCruise;
this.player.baseY = resupply ? RESUPPLY_PLAYER_BASE_Y : CRUISE_PLAYER_BASE_Y;
```

`_applyCameraOrientation` already reads `this._pitchQuat`, so no change there. A ternary on
`this.flow.state === 'resupply'` is the whole gate — combat stages keep `_pitchQuatCruise` and
`CRUISE_PLAYER_BASE_Y`, bit-identical to today.

### Candidate numbers (solved, but flagged ASSUMED — do not ship as MEASURED)

| target horizon frac | camera pitch (rad / deg) | jet frac | player baseY |
|---|---|---|---|
| 0.20 | -0.30274 / -17.35° | 0.42 | 1.0838 |
| **0.22** | **-0.28366 / -16.25°** | **0.43** | **1.1296** |
| 0.25 | -0.25463 / -14.59° | 0.45 | 1.1728 |

(today, every stage: pitch +0.12941 / +7.41°, horizon 0.625, jet baseY 2.5565.)

**These horizon/jet targets are ASSUMED, eyeballed off the judge's R16 evidence screenshot
(arcade-s5-t245-refuel-base.png), not measured from a calibrated native frame.** STAGE_MAP
explicitly declines to ship a stage-5/13 horizon ("shipping an unmeasured number is exactly the
#123 failure"). Treat 0.22 as a starting point to tune against the arcade frame by eye, and
flag it ASSUMED in the code, the same way STAGE_5's runway greys are flagged. The *geometry*
(pitch↔frac inversion) is exact; only the *target* is a judgement call.

### Two secondary couplings the wiring must not forget

- **Ground haze miscalibrates under the new pitch (world lane).** `ground.js`'s haze band is
  computed in-shader from `uCameraPitch` and `uHorizonFrac`, both baked to cruise values at
  construction (`ground.js:1355-1358`, `:1663`). Under a resupply pitch the terrain *line*
  moves correctly (it's geometry) but the haze gradient would fog as if still at cruise. For a
  fully correct look the world lane should update those two uniforms when entering/leaving
  resupply (a `setFraming(pitch, horizonFrac)` on the ground mesh, called from the same gate).
  Not fatal — the primary "terrain to the top" read is free from the geometry — but note it.
- **player.js roll-compensation axis uses the fixed CAMERA_PITCH** (`_rollAxisWorld`,
  `player.js:415`). It would be slightly off-axis if the jet banks hard *during* resupply.
  Resupply is a calm, near-level pass (little banking), so this is cosmetic; leave it unless a
  capture shows the jet's lateral envelope skewing during a resupply bank.

### Combat-safety invariant + test (for whoever wires this)

Gate on `this.flow.state === 'resupply'` and nothing else. Verify: capture `?stage=1`
(combat) and `?stage=5` (resupply), and a combat→resupply→combat progression; the combat
frames' horizon, jet, and sight must be pixel-identical to HEAD (the R15 combat sight feeds off
`CAMERA_PITCH` via the lateral rails and `SIGHT_NDC_Y_OFFSET` — any pitch leak into combat
breaks it). The resupply frame's horizon should sit near the top with terrain filling the frame.

## Re-scope request to the TL

Give the camera-pitch gate to whoever owns `game.js` this round (game-flow lane), or widen my
ownership to include the ~6 game.js lines above. If cameraGeom.js should host a
`resupplyPitchFor(targetFrac)` helper (the exact inverse of `horizonFracFor`, which I own), say
so and I'll add it with tests — I left it out rather than ship dead code nothing imports yet.

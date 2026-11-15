# R23 canyon-fix lane — cross-lane asks

## A1 — Player & HUD lane (`src/entities/player.js`): roll-compensate about the LIVE camera pitch

**What / why.** `player.js` roll-compensates the jet's lateral offset so the
airframe holds screen station under bank (only self-banks) rather than being
swung around screen centre with the world (its own `_rollAxisWorld` note / R2
gap 10). That compensation axis is a MODULE CONSTANT baked from the cruise pitch:

```js
const _pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), CAMERA_PITCH);
const _rollAxisWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(_pitchQuat);
// update(): offset.applyAxisAngle(_rollAxisWorld, worldRoll);
```

The R21 canyon gate (game.js) drops the camera to `CANYON_PITCH` (-21.07deg vs
cruise -7.42deg) and rolls the camera about the CANYON-pitched forward axis. So
in the canyon `_rollAxisWorld` is the WRONG axis and the compensation no longer
cancels: the jet — and the combat sight pinned to it (`combat.js`: `sight.x ==
playerNdc.x` by construction) — swings ~3.5x too far laterally under bank.
**Measured (R23 aiming probe, demo=2 seed 7, identical stick both stages):** at
roll -47.9deg the jet railed to `jetNdcX = -0.704` in the canyon vs the correct
`-0.198` on stage 1, so the sight sat ~0.5 NDC off the enemy cluster at x~0 and
locks were suppressed (canyon lockTicks 45 vs stage-1 70). This is the R22
judge's "canyon aiming degraded, sight rails off-centre, 0-1 locks vs 6".

**R23 fix shipped in my lane (game.js, stateless, canyon-gated):** after
`player.update()` in the canyon, re-rotate the jet offset from the cruise roll
axis to the canyon roll axis (`_rollAxisCruise`/`_rollAxisCanyon` in
`Game`'s constructor + the correction in `update()`), so the airframe holds
screen station under the dropped camera. Post-fix the canyon rails at
`jetNdcX ±0.19-0.20` exactly like stage 1 and lockTicks rose 45 -> 91 (stage-1
70). Stage-1 combat stays **byte-identical** (MD5-identical, 4 frames).

**The cleaner home for this is player.js.** game.js correcting the sprite
position after `player.update()` duplicates player.js's roll-comp inversely — it
works and is well-contained, but the single-source fix is for player.js to
compute `_rollAxisWorld` from the LIVE camera orientation (or accept the current
pitch quat as an argument from game.js's `player.update(dt, input, worldRoll)`
call) instead of baking it from `CAMERA_PITCH` at module load. If you take that,
game.js's post-correction block (labelled "R23 gap 2") should be removed in the
same change so the compensation is not applied twice. Coordinate before either
side moves — until then the game.js correction is the live mechanism and is
correct on its own.

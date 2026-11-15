# R21 canyon lane — cross-lane asks

Lane files (owned): `src/render/ground.js`, `src/game/stage.js`,
`src/game/game.js` (canyon low-horizon gate only). Everything below touches a
file this lane does NOT own and is requested rather than reached into.

## 1. flow.js — route `?stage=8` to the canyon (one line)

`src/game/flow/flow.js`'s `_renderStage()` already routes the number-matched
biomes (13 → STAGE_13, 14 → STAGE_14, 16 → STAGE_16). Add the canyon the same
way so it renders at its TRUE arcade number 8:

```js
// in _renderStage(), beside the 13/14/16 routes:
if (this.stageNumber === 8) return STAGE_8;   // import STAGE_8 from '../stage.js'
```

Until this lands the canyon is still reachable and still laps: STAGE_8 is
appended to the `STAGES` combat lap (index 6), and `_renderStage`'s fall-through
`STAGES[stageIndex % STAGES.length]` lands on it at `stageIndex 6` == arcade
**stageNumber 7**, so **`?stage=7` renders the canyon today** with no flow
change. This ask only adds the canyon at its own number 8 (cosmetic parity with
13/14/16), it is not required for the canyon to work or to lap.

## 2. flow.js — `contentStageIndex` for the number-routed stages (the ONE no-regression cost)

Appending STAGE_8 grows `STAGES` 6 → 7, which changes
`contentStageIndex = this.stageIndex % STAGES.length` for every stage past the
authored set. For stages 1–4 this is harmless (stageIndex 0–3, modulus
irrelevant) and they are **proven byte-identical** (A/B maxdiff 0). For the
**number-routed** stages 14 and 16 the RENDERED BIOME is byte-identical
(`_renderStage` routes them by number, unaffected), but their
`contentStageIndex` moves (14: 1 → 6, 16: 3 → 1), and game.js feeds that index
to the combat **enemy/trail liveries** (`combat.setStageIndex` /
`trailPaletteFor`). So on 14/16 the enemy SPRITE colours shift — the A/B diff is
exactly the enemy aircraft, the whole backdrop is identical (see
`judging/R21/*` / lane report).

This is a pre-existing flow.js inconsistency the lap-widening merely relocates:
`contentStageIndex` returns the raw lap index, which for a number-routed stage
**never matched its own routed biome** (stage 14 was already drawing STAGE_2's
livery under STAGE_14's biome). The fix belongs in flow.js, where the route
lives:

```js
// contentStageIndex should report the CONTENT of the stage actually rendered.
// For the number-routed stages, that is their routed biome's own index, not the
// lap counter. e.g. map 8/13/14/16 to STAGES.indexOf(their routed stage).
```

That makes the combat livery match the biome on 8/13/14/16 AND makes it
independent of `STAGES.length`, so future biome additions never again shift a
routed stage's liveries. Flagged as the only non-biome delta this lane
introduces; requested for the gate to accept or fix.

## 3. combat lane — note: the canyon retracks ScreenSpace from game.js

The canyon is a COMBAT stage with a dropped camera, so unlike the refuel beats
the combat layer is live under the pitch change. game.js's canyon gate therefore
retracks `combat.space.base` to the canyon pitch and calls the public
`combat.space.refresh()` — the combat-side analogue of `ground.setFraming()`,
using ScreenSpace's own documented "base pitch changed" hook. It is
edge-triggered on the canyon transition and restored to cruise off it (combat
proven byte-identical outside the canyon: ?stage=1/2/4 maxdiff 0; combat
telemetry inside the canyon matches cruise: 6 brackets / 6 locks / 5+ missiles).
No combat FILE is edited. Raised so the combat lane knows the camera pitch is no
longer cruise-constant during a combat stage.

## 4. canyon scroll speed — our-engine flow measurement (follow-up)

`STAGE_8.scrollSpeed = 19.79` is ADOPTED, flagged: it is cruise 68.93 scaled by
STAGE_MAP #139's arcade canyon:cruise regime ratio (0.804/2.800), so the walls
stream at the arcade's slower canyon cadence rather than cruise speed (the low
horizon's larger span would otherwise over-speed the apparent flow). There is NO
our-engine canyon flow measurement behind it. The #139 method (120 fps
decode, the band where our content measures linearly) run against a `?stage=7`
capture is the follow-up to certify or correct it.

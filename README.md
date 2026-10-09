# After Burner — three.js rebuild

Browser recreation of SEGA's After Burner II (1987 arcade), built with three.js
+ Vite. For design decisions see `ARCHITECTURE.md`, for measured arcade facts
see `REFERENCE.md`, for gameplay/HUD/audio specifics see `GAME_SPEC.md`, for
the team process and current status see `CLAUDE.md` and `STATUS.md`. This
file is just "how do I run it and what are the dev-tooling query params".

## Run

```
npm install
npm run dev       # http://localhost:5173
```

## Build / preview

```
npm run build      # outputs dist/
npm run preview    # serve the built dist/ locally
```

## Controls

| key | action |
|---|---|
| Arrows / WASD | Stick (up = climb) |
| `Z` | Vulcan |
| `X` | Missile |
| `Q` / `E` | Throttle down / up one detent (three detents: L / M / H) |
| Stick slammed one way then the other within 0.35 s | Barrel roll |

All in `src/core/input.js`. On the title screen, either fire button starts
the game (`src/game/flow/flow.js`) — there is no Enter/start key binding;
AB2's own "insert coin" convention is the fire button. Title auto-advances
after a timeout if nothing is pressed.

This table was stale for two rounds: it listed only the stick and the two
fire buttons, while `Q`/`E` had shipped in R5 and the barrel roll was built
in R5b. **The R5 judge recorded the throttle as "wired to `scrollSpeed` with
no player control" — a gap that did not exist** — and the R6 flow lane spent
part of its round disproving it with a key-event probe. A verb that is not
in this table is a verb a judge will score as absent, so add one here in the
same change that ships it.

## Query params

### Normal play / capture

| param | effect |
|---|---|
| `?seed=N` | Seeds the PRNG (`core/prng.js`, mulberry32). Default `1`. |
| `?fixed=1` | Disables the real-time rAF loop; `window.__step(n)` advances exactly `n` fixed 60Hz ticks and renders once. Used by `tools/capture.mjs`. Implies audio mute (see below) and skips the title screen unless `?showtitle=1` is also set. |
| `?demo=1` | Replaces live keyboard input with the real two-regime attract-mode flight (`src/game/flow/demoTimeline.js`, GAME_SPEC §7) and skips the title screen. |
| `?demo=2` | Scripted combat-systems demo (`src/weapons/combatDemo.js`) exercising firing, locking and a missile salvo unattended and deterministically. Implies capture-invincibility (see `invincible` below) so a judge/QA capture doesn't lose most of the window to the death/respawn sequence. |
| `?showtitle=1` | Escape hatch for capturing the title card itself under `?fixed=1` stepping (without it, `?fixed=1` skips straight to flight). Real interactive play always sees the title regardless of this flag. |
| `?mute=1` / `?mute=0` | Forces audio mute / forces sound on, overriding the `?fixed=1`-implies-mute default. |
| `?hires=1` | **Not implemented.** ARCHITECTURE.md D3 names a high-res escape hatch from the default 320x224 internal render; out of scope so far — low-res is the only path. |

### Measurement-only (never read in normal play)

These exist so a capture or probe can isolate one subsystem instead of
measuring a mixture of several — see each cited file for why.

| param | effect | owner |
|---|---|---|
| `?hidejet=1` | Skips adding the player sprite to the scene — isolates ground/sky for measurement. | `game.js` |
| `?noclouds=1` | Skips adding the cloud group — isolates ground/sky/jet without cloud occlusion. | `game.js` |
| `?nocombat=1` | Disables the combat system entirely — empty sky for ground/sea/horizon measurement. | `game.js` |
| `?combatonly=a,b` | Runs only the named combat subsystems (`enemies`, `shots`, `vulcan`, `missiles`, `locks`, `sight`, `brackets`) against an otherwise empty sky. | `weapons/combat.js` |
| `?combatsolo=1` | Single-enemy spawn mode, for isolated enemy-scale measurement. | `game/spawner.js` |
| `?combattrail=1` | No enemies; missile button fires unguided missiles straight up the sight line; smoke trail and enemy airframes render greyscale so a value-based segmentation measures the trail alone. | `weapons/combat.js` |
| `?combatexpl=1` | No enemies, no weapons; one explosion every 1.2s at a fixed screen position/depth, for peak-opacity palette measurement. | `weapons/combat.js` |
| `?invincible=1` | `checkPlayerHit` always reports a miss, so a capture can run 30s+ without the death path clearing combat state. | `weapons/combat.js` / `game/flow/flow.js` |
| `?forcedeath=N` | Forces player death at `N` seconds, for deterministic death/respawn/continue capture. | `game/flow/flow.js` |
| `?debugtally=1` | Forces a representative stage-end tally card (8 hits / 160,000 pts) visible and held open immediately, instead of the real hits/7s playout. | `game/flow/flow.js` |
| `?debugstick=X` | Constant stick deflection (`X` in `[-1,1]`) for deterministic world-roll capture — puppeteer can't inject real keydown events the way a user would. | `core/input.js` |

Under `?fixed=1`, `window.__combatStats()` and `window.__combatDebug()` are
also exposed (`game.js` / `weapons/combat.js`) — read the simulation's own
internal state (alive count, per-enemy span/depth, lock/missile state,
spawner timers) instead of inferring it from pixels, which under-reports
enemy density badly for the first few seconds of an approaching wave.

## Capture tool

```
node tools/capture.mjs --out <unique-dir> [--frames N] [--every M] [--url-params "..."] [--page /path.html]
```

- `--out` is **required**, no default — every agent/judge run must use its own
  path (shared default output paths caused silent corruption on the sibling
  Godot project; same rule here).
- `--frames` — number of PNGs to capture (default 10).
- `--every` — fixed ticks to advance between captures (default 1; e.g.
  `--every 30` = 0.5s of sim time per captured frame).
- `--url-params` — extra query string appended after `?fixed=1&seed=1`.
- `--page` — page path to load (default `/`, the real game). Point at
  `/tools/clouds-preview.html` for the isolated ground/sky/clouds harness
  below.

The tool boots a Vite dev server via the programmatic API (its own free-port
scanning, never kills anything it didn't start), drives the page through
`window.__step`, screenshots the `#screen` canvas, and tears its own server +
browser down on exit.

## Measurement scripts (`tools/`)

All derive their own HUD exclusion from `tools/hud_mask.py` rather than
hardcoded bounding boxes — a hardcoded HUD region silently goes stale the
moment the HUD is restyled by whoever owns it that round (this has happened
more than once). `hud_mask.py` captures a clean reference frame
(`?nocombat=1&hidejet=1&noclouds=1`) and derives the mask from "everything
above the horizon that isn't flat sky," so it can't go stale. Any new
measurement script that scans the sky band should use it the same way:

```python
from hud_mask import get_hud_mask
hud_mask = get_hud_mask('tools/out/<your-unique-dir>')   # captures + caches
```

| script | measures |
|---|---|
| `measure_ground.py` | Horizon row, distinct-color/palette-share, near-field ACF anisotropy. |
| `measure_roll.py` | World-roll angle from a horizon line-fit (rotation-vs-shear residual, saturation angle). |
| `measure_worlddist_flow.py` | Ground scroll flow: resamples a center strip onto a uniform world-distance grid before cross-correlating consecutive frames — the correct method for a perspective camera (raw screen-pixel correlation is invalid, a constant world-space scroll is non-uniform in screen space). Self-test (`--self-test`) validates against synthetic shifts first. **Use this one for flow measurement, not `measure_flow.py`** (an earlier, less rigorous screen-space-only version, superseded but left in the tree). |
| `measure_clouds.py` | Cloud presence/count/size distributions via connected-component detection (plain BFS, no scipy on this machine) against `REFERENCE.md`'s stage-1 cloud stats. |
| `measure_coarseness.py` | Near/far horizontal ACF decorrelation length (sea wave-coarseness trend vs. depth), at native-texel scale. |
| `hud_mask.py` | The shared HUD-mask derivation described above. `--selftest` runs a synthetic known-answer test plus a live smoke test against the current HUD. |
| `combat_probe.mjs` | Node script: steps the game under `?fixed=1` and prints `window.__combatStats()` as JSON lines per tick — the simulation's internal combat ground truth, not a pixel inference. |

## Preview / audition harnesses

- `tools/clouds-preview.html` (served by the same Vite dev server, e.g.
  `node tools/capture.mjs --page /tools/clouds-preview.html ...`) — an
  isolated scene (camera + sky + ground + clouds only, no jet/HUD/combat
  dependency) for measuring and tuning ground/cloud rendering without
  depending on `game.js`. Supports `?stage=2` / `?stage=3` to exercise the
  live `setStage()` stage-transition path.
- `tools/audio-preview.html` — open directly in a browser (not capture-tool
  driven) for human audition of every synthesized SFX and music cue via
  buttons, since audio has no meaningful pixel-based measurement.

## Where things live (`src/`)

```
main.js            boot, query-param handling, demo/fixed-step wiring
core/               prng.js, input.js, fixedloop.js
render/             screen.js (320x224 target + nearest-neighbor upscale),
                    sky.js, ground.js (stage-parameterized: 'sea' wave/grain/
                    foam shader for stages 1-2, 'speckle' night-lights shader
                    for stage 3), clouds.js, spriteFactory.js, viewport.js
entities/           player.js, enemy.js, enemySprite.js
weapons/            combat.js (orchestrator), vulcan.js, missiles.js,
                    lockSystem.js, enemyShots.js, projectileSprites.js,
                    combatDemo.js
effects/            explosions.js, smoke.js, pixelTexture.js, screenSpace.js
game/               game.js (scene/camera/subsystem wiring), stage.js
                    (STAGE_1/2/3 data + setStage() consumers), spawner.js,
                    score.js
game/flow/          flow.js (state machine: title/flight/tally/death/
                    continue), demoTimeline.js, deathSequence.js,
                    titleScreen.js, cards.js, overlay.js
ui/                 hud.js, font.js
audio/              engine.js (WebAudio lifecycle/mute), sfx.js, music.js,
                    index.js
```

Ownership rotates per round between agents — check `STATUS.md` for who
currently owns what before editing a file you didn't write.

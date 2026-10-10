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

## Measuring MOTION — read this before any figure that touches time (R10)

**Nine rounds of this project judged still frames.** The first motion pass, in R9, found our
explosion holding near its peak **9× longer** than the arcade's while passing every colour, value
and silhouette gate correctly. **Every figure in this repo that touched time before R9 was sampled
at 4 Hz or coarser, and the arcade events they describe last 0.067–0.13 s.**

| side | how |
|---|---|
| **arcade** | `ffmpeg -nostdin -ss T -t D -i .reference-cache/video/ab2-longplay-60fps.mp4 -vsync 0 <unique-dir>/f%04d.png` — **consecutive** frames at the source's own 60 Hz. **`-vf fps=N` RESAMPLES and is a different operation.** Use the **60 fps** cache file; the 30 fps copy cannot resolve a 0.067 s event |
| **ours** | `tools/capture.mjs --every 1 --warmup N` (a consecutive burst starting somewhere other than tick 1), or a per-tick telemetry recorder under `?fixed=1` |
| **both** | the **same rate**, or the comparison means nothing |

- **REFERENCE.md citation field 6 is binding**: every temporal figure publishes its **sampling
  rate as a number, on both sides**, plus the decode method.
- **A negative needs the rate most of all.** *"There is no flash"*, *"ours leaves no smoke"* — a
  4 Hz sampler produces those for free. Four passes published "no visible invincibility flash"
  about an arcade that flashes at a 0.267 s period.
- **Publish the contiguous run, not only a count.** Four frames above a threshold scattered over
  five seconds is not the same event as four consecutive ones.
- `.claude/skills/youtube-reference/SKILL.md` has the long form. **Its `--burst-fps` default of 4
  is a stage-spread rate and will hide any transient** — read the mode table at the top of that
  file before using it for timing.

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
| `assert_population.py` | **Run this before computing any figure over a claimed population.** Reads the authored effect palettes out of `src/` at run time and counts exact-colour pixels per frame, reporting **PLAYER-WEAPON / EXPLOSION / ENEMY-FIRE** separately. `--require weapon,explosion` exits non-zero if a class is absent from every frame of a set, so it can gate a capture. `--collision-control <nocombat dir>` re-proves per tree that the detector colours do not occur with combat off. `--selftest` includes the decisive control: it **refuses the twelve frames R7 published its "ordinary play with combat" Criterion A figure over** (REFERENCE ledger row 32). |
| `verify_stage_digit_operator.py` | Head-to-head control for the two stage-attribution operators. `--selftest` asserts the exact-ink Hamming reader returns every digit and **refuses a digit-free cell**, while REFERENCE's old `mean(RGB) > 170` test fails in both directions on inputs with known ground truth. `--dir` runs both on real captures and cross-checks the digit against the modal sky colour — an instrument that never sees the HUD. |
| `combat_probe.mjs` | Node script: steps the game under `?fixed=1` and prints `window.__combatStats()` as JSON lines per tick — the simulation's internal combat ground truth, not a pixel inference. |
| `known_quality_pair.py` | **Run this before licensing any criterion that claims one drawing is better than another.** A synthetic control proves an operator computes what it says; it cannot prove a quality statistic *ranks correctly*, because in a synthetic the answer is an input. This takes pairs out of **git history** — a sheet before and after a redraw the project accepted — masks with the sheets' own **alpha channel** (ground truth, so no mask discretion at all) and reports whether each statistic moves the right way. `--selftest` has 6 controls including a **positive** one, proving the harness would show a correct ranking if there were one. `--pairs` runs the sweep. REFERENCE.md, "A synthetic control cannot validate a quality statistic". |

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

# After Burner — three.js rebuild: Architecture & Design Decisions

Goal: a kick-ass browser game that looks, feels, and plays as close as possible to SEGA's
After Burner II (1987 arcade). Fidelity to the original overrides code purity. This is a
rebuild informed by the Godot prototype at `../afterburner`, not a port of it.

## D1 — Tech stack
- **three.js + Vite, plain JavaScript (ES modules).** No framework, no TypeScript — fast
  iteration for many agents, zero toolchain friction. `npm run dev` serves, `npm run build`
  bundles.
- Node-based capture tooling (puppeteer) lives in `tools/`, never shipped.

## D2 — Rendering model: true 3D camera, sprite-scaled content ("Super Scaler emulation")
AB2 is pseudo-3D sprite scaling. We emulate the LOOK, using three.js's perspective
projection to do the math the Super Scaler board did in hardware:
- **PerspectiveCamera** fixed behind/above the player position, looking into the screen.
  Level-flight horizon sits at **50–65%H** (sky-dominant frame): measured 0.500 H on
  reference t116 and 0.646 H on t175; adopted cruise constant 0.625 H. (R1 judge
  corrected an earlier "upper third" claim here that contradicted every reference frame —
  the camera needs a slight pitch UP, not down.)
- **All gameplay objects are billboarded sprites** (THREE.Sprite or camera-facing quads),
  scaled by distance — never shaded 3D meshes. 3D meshes are forbidden for
  jets/missiles/explosions; the arcade look dies with lit polygons.
- **Ground** = large shader plane: scrolling stage-specific texture (dithered/streaked —
  AB2 ground is never flat fills). The horizon is NOT a hard edge: a pale haze band
  ~7–11%H tall ramps from sky color toward near-white before the ground value drop
  (measured on t116 at x=600: #6cafff → #93c7ff → #c3edff → #d1f4f8, then #010ff9).
  Sky = flat fill on most stages (18 of 23), per-stage palette.
- Lesson from the Godot prototype: the hand-rolled depth math (`d=0 horizon, d=1 camera`,
  quadratic scale) worked but cost weeks. The perspective camera gives equivalent curves
  for free; tune FOV + sprite base sizes to match reference footage.

## D3 — Arcade presentation
- **Internal render resolution 320×224** (true AB2 resolution), rendered to a render
  target and upscaled nearest-neighbor to fill the window preserving aspect (letterbox).
  Toggleable (`?hires=1`) but LOW-RES IS THE DEFAULT — chunky pixels are the look.
- Target 60 fps. All gameplay logic runs on a **fixed 60 Hz timestep** decoupled from
  rAF; rendering interpolates nothing (arcade games didn't).

## D4 — Determinism & capture (QA/judge infrastructure)
- Seeded RNG only (no `Math.random()` in gameplay code) — single seedable PRNG module.
- `?fixed=1&seed=N` query mode: fixed timestep stepped manually, so puppeteer captures
  are frame-exact and reproducible. `?demo=1` runs a scripted input timeline (attract-
  mode style) so judges can capture real gameplay unattended.
- `tools/capture.mjs --out <unique-path>`: boots server if needed, loads game, captures
  frame sequences. **Every output path is caller-unique** (hard-won rule from the Godot
  project: shared default output paths across concurrent agents = silent corruption).

## D5 — Assets
- **No ripped SEGA assets.** All sprites are original pixel art in AB2's style (F-14,
  MiGs, missiles, explosions, HUD glyphs), authored as PNGs or generated
  programmatically at authoring time (not at runtime). Reference-measured palettes.
- Audio: WebAudio. Synthesized SFX (vulcan, missile, lock-on, explosion) + original
  music in the Sega FM-synth style. Licensed/royalty-free only.

## D6 — Code structure
```
afterburner-three/
  index.html, vite.config.js, package.json
  src/
    main.js            — boot, resize, fixed-step loop
    core/              — prng.js, input.js (keyboard+gamepad), fixedloop.js, assets.js
    game/              — game.js (state machine: title/flight/gameover), stage.js,
                         spawner.js, score.js
    render/            — screen.js (320×224 target + upscale), sky.js, ground.js,
                         spriteFactory.js
    entities/          — player.js, enemy.js, missile.js, vulcan.js, explosion.js
    ui/                — hud.js, title.js, gameover.js
    audio/             — sfx.js, music.js
  reference/           — measured facts from arcade footage (REFERENCE.md + frames)
  tools/               — capture.mjs, serve helpers
```
- Entities are plain objects updated by systems; no ECS framework. One manager per
  domain (enemies, weapons, effects) owning spawn/update/despawn.

## D7 — Gameplay fidelity targets (the judge's yardstick)
From the arcade original, in priority order:
1. **Sense of speed** — ground rush, object scale ramp, cloud/terrain flow.
2. **Player envelope** — jet roams a wide screen area; banked turns roll the WORLD
   (horizon tilts opposite stick), barrel roll on double-tap/roll button.
3. **Weapons feel** — vulcan rounds are ORANGE FIREBALL PUFFS (measured #ffdb21/#ffad15/
   #ff9f0c) in a zig-zag column from alternating muzzles — not thin white tracers
   (corrected per footage t214). Missile system is MULTI-LOCK: ~6 simultaneous lock
   brackets, 6–8 missiles in flight per salvo, launch→impact 0.5–1.5s, smoke-ribbon
   trails. Scoring is passive accrual (~3300/s at speed M) + HIT×20,000 paid at the
   stage-end tally; kills give no immediate score (measured — see GAME_SPEC.md).
4. **Enemy patterns** — waves crossing/approaching in formation, firing tracked shots.
5. **Presentation** — HUD per the measured REFERENCE.md table: SCORE emblem + digits,
   HIT counter, top-right lock reticle, bottom strip (SPEED/throttle bar, STAGE digit,
   missile stock). **AB2 has NO altitude indicator** (R1 judge corrected this). HUD draws
   over the world (no opaque bar) and never rotates with world roll. Plus stage palette
   changes, carrier launch/landing bookends, title screen.
6. 23-stage structure is the eventual target; early rounds: stages 1–3 + loop.

## D8 — Reference ground truth
- The verified stage↔timestamp map for the longplay video lives in the Godot repo:
  `../afterburner/scripts/stage/stage_data.gd` header. Frame extraction tooling:
  `../afterburner/.claude/skills/youtube-reference/`.
- Reference videos (judges & visual agents MUST consult):
  - 60fps longplay: https://www.youtube.com/watch?v=65weTx0haog
  - Gameplay: https://www.youtube.com/watch?v=8d-S1kcjieA
  - Longplay: https://www.youtube.com/watch?v=W2loyeq9pDA
- Every visual constant (color, proportion) in code must cite its measurement
  (frame, coordinates, sampled value) in a comment. Uncited constants fail review.
- Burst frames ≤15fps cannot prove SPEED (temporal aliasing) — speed judgements need
  60fps footage or side-by-side video.

## D9 — Development loop (process)
Rounds of: task breakdown → background agents build → **fresh-context judge** compares
result against arcade reference (screenshots + video-derived frames) → judge flags
biggest gaps → gaps become next round's tasks. Repeat until the judge finds no material
gap. Each judge round publishes an HTML status page (screenshots, arcade diff, verdict,
gap list). Agents working concurrently own disjoint files; capture outputs are unique
per agent.

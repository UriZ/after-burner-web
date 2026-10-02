# After Burner — three.js rebuild

Browser recreation of SEGA's After Burner II (1987 arcade), built with three.js
+ Vite. See `ARCHITECTURE.md` for the binding design decisions (D1-D9) this
code follows.

## Run

```
npm install
npm run dev       # http://localhost:5173
```

Arrow keys (or WASD) move the stick, Z fires the vulcan, X fires a missile
(buttons are wired through `core/input.js`; weapons aren't implemented yet in
this round).

## Build

```
npm run build      # outputs dist/
npm run preview    # serve the built dist/ locally
```

## Query params (ARCHITECTURE.md D4)

- `?seed=N` — seeds the PRNG (`core/prng.js`, mulberry32). Default seed `1`.
- `?fixed=1` — disables the real-time rAF loop. Instead `window.__step(n)`
  advances exactly `n` fixed 60Hz ticks and renders once. Used by
  `tools/capture.mjs` for frame-exact, reproducible captures.
- `?demo=1` — replaces live keyboard input with a scripted attract-mode
  timeline (`demoTimeline` in `src/main.js` — currently a trivial sine sweep,
  placeholder for a real attract-mode script).
- `?hires=1` — **not implemented yet.** D3 calls for a high-res escape hatch
  from the default 320x224 internal resolution; out of scope for this round.

## Capture tool

```
node tools/capture.mjs --out <unique-dir> [--frames N] [--every M] [--url-params "..."]
```

- `--out` is **required**, no default — every agent/judge run must use its own
  path (ARCHITECTURE.md D4; shared default output paths caused silent
  corruption on the sibling Godot project).
- `--frames` — number of PNGs to capture (default 10).
- `--every` — fixed ticks to advance between captures (default 1; use a
  larger value to see motion across fewer frames, e.g. `--every 30` = 0.5s
  of sim time per captured frame).
- `--url-params` — extra query string appended after `?fixed=1&seed=1`, e.g.
  `--url-params "demo=1"` to capture the scripted attract-mode sweep.

The tool boots a Vite dev server via the programmatic API (which does its own
free-port scanning), drives the page through `window.__step`, screenshots the
`#screen` canvas element, and tears its own server + browser down on exit —
it never touches a server or browser it didn't start itself.

Verification frames from this round live in `tools/out/scaffold-check/` (plain
`?fixed=1`, ground scroll visible across frames) and `tools/out/demo-check/`
(`?demo=1`, jet visibly sweeping left/right). `tools/out/` is gitignored.

## Code structure

See `ARCHITECTURE.md` D6 for the target layout. This round implements:

- `src/main.js` — boot, query-param handling, demo timeline
- `src/core/` — `prng.js`, `input.js`, `fixedloop.js`
- `src/render/` — `screen.js` (320x224 target + nearest-neighbor letterboxed
  upscale), `sky.js` (gradient quad, camera-parented), `ground.js`
  (world-space scrolling checker plane), `spriteFactory.js` (canvas-authored
  pixel art + placeholder F-14 sprite)
- `src/entities/player.js` — stick-follow movement within a screen envelope
- `src/game/game.js`, `src/game/stage.js` — scene/camera wiring, stage 1 data

Not yet populated (D6 lists these as the eventual target, out of scope for
this round): `core/assets.js`, `game/spawner.js`, `game/score.js`,
`entities/{enemy,missile,vulcan,explosion}.js`, `ui/`, `audio/`.

## Deviations from ARCHITECTURE.md

- **Horizon position is not derived from the Godot prototype's
  `horizon_fraction`.** `stage_data.gd`'s stage-1 entry uses
  `horizon_fraction: 0.625`, but that number is a parameter of a completely
  different rendering model (2D depth hack: `screen_y = horizon_y + d^2 *
  ground_span`, horizon near the BOTTOM-middle of frame for plain stages,
  near the TOP only for canyon stages). It does not translate to "where the
  horizon sits" for a true `PerspectiveCamera`. Instead `game.js` solves
  camera pitch directly from the perspective horizon relation
  `tan(pitch)/tan(vFov/2) = 1 - 2*targetScreenFraction` to target the "upper
  third" framing ARCHITECTURE.md D2 calls for, then the result was checked
  against `assets/reference/ab2-arcade-coastal-banking.jpg` by eye (captured
  frames put the horizon at roughly 32% down the 224px frame). This needs a
  real per-stage reference-video measurement in a later round, the same way
  the Godot project's `stage_data.gd` header documents its own derivation —
  right now it's a solved starting point, not a verified fact.
- **Ground pattern is a generic world-space checker**, not AB2's actual
  stage-1 ocean texture (wave bands, no grid). The task scope for this round
  explicitly asked for a placeholder "scrolling stripe/checker pattern that
  reads as rushing toward the camera" to prove the pipeline; it uses stage
  1's real measured colours (deep water blue + coastline green) but not its
  real shape. Per-stage ground shape is later work.
- **Sky/ground colour values needed an explicit sRGB conversion.**
  `THREE.Color(r, g, b)`'s plain constructor does not sRGB-decode float
  inputs under three's default color management — it reinterprets them as
  already-linear, so `Color(0, 0.624, 1.0)` rendered as `#00cfff` instead of
  the intended `#009fff`. Fixed by routing every stage colour through
  `.setRGB(r, g, b, THREE.SRGBColorSpace)` in `src/game/stage.js`. Any new
  stage data copied from `stage_data.gd` must go through that same helper,
  not a bare `new THREE.Color(...)`.
- **No `?hires=1` toggle yet** (see Query params above) — D3 names it but
  this round only needed the low-res default path proven.

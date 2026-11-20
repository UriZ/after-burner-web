# R37 enemy-art lane — look & feel of enemy jets

Owner ask: "improve the look and feel of enemy jets" (most-repeated complaint:
R27 / R31 / R32 / R35, never yet closed).

## 1. Arcade pose sheet (60 Hz, stage-identity verified via HUD digit in-frame)

Decoded `judging/R37/enemy-art/arcade-poses/` — three 3 s bursts at 60 Hz from
`ab2-longplay-60fps.mp4`: s1a t=99–102, s1b t=115–118 (both stage 1, HUD digit 1
visible), s2a t=127–130 (stage 2). Key pose crops (all in `arcade-poses/`):

| Crop | Pose | What the arcade shows |
|---|---|---|
| `pose-planform-t115.25.png` | dead-rear, level | ONE big black nozzle ring, ONE orange core, long thin wings, GREEN camo bands on white wing tops, slim pale fuselage, short pale fin |
| `pose-profile-t116.0.png` | rear-quarter banking pair (mid size) | nozzle bell + orange core at tail toward camera, fuselage diagonal away, full wing PLANFORM, white leading-edge dashes |
| `pose-rearoblique-t115.75.png` | hard-bank flee from above | green planform wings, single nozzle, fin+tailplane tips |
| `pose-rearclose-t116.75.png` | very close fly-past | nozzle bell shows feather segments (grey #707070–#808080 lines in black), core = deep red #a00000 rim + orange #f09000, fuselage white #f0f0f0 w/ dark panel dashes, green wing ≈ #005030 |
| `pose-s1a-t100.5.png` | climbing away + near-profile crosser | same single-nozzle signature; crosser shows dark NOSE, no glow |
| `flicker-tile2-t100.2.png` | 10 consecutive 60 Hz frames | nozzle glow SHIMMERS every 1–2 frames (hot pip moves/resizes); not binary on/off |

### Identity finding (load-bearing, reverses R27)

**The arcade enemy has ONE nozzle — one black bell, one orange core.** Confirmed
in every readable rear/oblique pose above, and it is exactly what STATUS.md's
hard warning says ("the player is the twin-nozzle F-14; every enemy has one
nozzle"). R27's "twin black nacelles cored orange" (and the twin-bell `nozzle()`
drawn from it) was a misidentification — the twin-orange-glow aircraft in the
frames is the PLAYER F-14 (see t108: the player banking left shows exactly the
two-orange-dots read). Our enemy's two side-by-side orange glows are the "face /
eyes" the owner keeps rejecting under different names since R27.

First flicker measurement (fixed box, s1b t115.0) was INVALID — box caught
scrolling island terrain; withdrawn. Second (tracked centroid, s1a f0073–f0082
over clean sky) oscillates ~2× frame-to-frame on a shrinking subject; settled by
eye on the tiled crops: continuous shimmer, period 1–3 frames.

## 2. What ours lacks per pose (vs `tools/out/art-zoom/enemy-grey-rear.zoom10x.png`)

- All 5 cells are ONE frontal silhouette rigidly rolled in the image plane; at
  |bank|>30° the residual is pure sticker rotation. The arcade NEVER shows a big
  enemy as a scaled-up frontal face — every readable-size view is rear-quarter /
  oblique with planform + nozzle.
- Rear cells: TWO orange nozzles (wrong, see above), no green wing bands, no
  red core rim, body a grey slab.
- No pose shows fuselage LENGTH (the #1 depth cue in every arcade crop).
- Nozzle glow is static; arcade shimmers at 60 Hz.

## 3. Verification (all evidence in this directory)

- **Zero behavior change, PROVEN**: `telemetry_probe.mjs` dumps every enemy's
  (id, pattern, depth, ndcX, ndcY) each 10 ticks for 30 s under
  `?fixed=1&demo=2&seed=N`. Byte-identical before (HEAD) vs after (this lane)
  on seed 1 (571 enemy rows) and seed 4 (647 rows):
  `telem-{before,after}-seed{1,4}.json`, plus `telem-after2-seed1.json`
  re-run after the crab-pose addition — still identical.
- **Crossing fly-past, 60 Hz** (`cap-crosser60b/`, seed 1 ticks 781-960):
  `strip-crosser-sweep-B.png` (whole pass) and `strip-crosser-trans-B.png`
  (exit, every 3 frames) — the crosser rolls through -30 into the -45 and
  -57 quarter views, nose INTO the turn, planform visible; each pose holds
  10+ frames, no flip-flopping. The FIRST capture (`strip-crosser-trans.png`,
  `cap-crosser60` since superseded) caught the quarter views UNREACHED (bank
  alone peaks 20-32 deg on a crosser — R8's unreachable-pose defect by a new
  route) and drove the crab-pose term below.
- **Overtake + glow shimmer, 60 Hz** (`cap-overtake60/`,
  `strip-overtake-flicker.png`): 12 consecutive frames — the bell's
  core/pip visibly alternates every 2-3 frames; rolled rear cells read as
  the arcade's banked fleeing pose.
- **Per-pose ours-vs-arcade**: `compare-poses-arcade-before-after.png`
  (dead astern / banked -30 / hard-turn crossing / flare state; the BEFORE
  column is the HEAD sheet's cells — the crossing row had NO before pose).

## 4. Changes shipped (this lane)

1. `tools/art/palettes.js` — `liveryOf` gains `band` (wing camo dash; grey =
   measured green #005230-snap) and `nozzleRim` (deep red #a51000-snap) roles.
2. `tools/art/sheets/enemy-mig.js` — single-bell `nozzle()` (one black bell,
   red rim, orange core, hot pip; `flare` state = bigger core/pip); green band
   dashes on wing tops (rear aspect); ladder extended to 9 poses
   [-57,-45,-30,-15,0,15,30,45,57]; |deg|≥45 cells are genuine rear-quarter /
   front-quarter OBLIQUE poses (3D control-point projection, hard pixels):
   fuselage diagonal, planform wings, bell at tail (rear) / dark nose (head).
   Rear sheets carry 18 cells (9 poses × 2 flare states).
3. `src/entities/enemySprite.js` — ladder exported (kills enemy.js's declared
   stale-mirror risk), flare-aware cell indexing for rear sheets.
4. `src/entities/enemy.js` — pose ladder derived from the export (stale
   mirror retired); rear-aspect flare flicker clocked off enemy age
   (deterministic, no rng draw, 24 state-flips/s); **crab-pose selection**:
   pose angle = slewed bank + a smoothed yaw read of on-screen velocity
   (60 deg per NDC/s, cap 28 deg, slew 90 deg/s) so crossings reach the
   quarter-view cells (see §3's first-capture finding). Residual
   `material.rotation` carries only the quantisation remainder.
   NO flight/fire/spawn logic touched; telemetry byte-identical (§3).

## Cross-file touches / requests

- This lane also edited `tools/art/palettes.js` (two new liveryOf roles) and
  `tools/art/sheets/enemy-mig.js` + regenerated `src/assets/sprites/enemy-*`
  via `node tools/art/build.js` — the authoring pipeline has always belonged
  to the sprite-art lane (R11/R27/R31/R35 precedent); no other R37 lane owns
  these files.
- `src/entities/groundBattery.js` is modified in the tree and is NOT this
  lane's work — left untouched.
- STATUS.md / CLAUDE.md curators: R27's "twin black nacelles" claim should
  be retired on sight (see §1's identity finding) — STATUS's own "every
  enemy has one nozzle" rule was right all along.

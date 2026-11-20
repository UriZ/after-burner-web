# R41 enemy-look2 — "the appearance of enemy jets" (7th round on this complaint)

R40 redrew the enemy and measured the warm/orange share down from 14-17 % to
4.5-7.5 %. The owner played that build and still says the enemy jets look
wrong. So R40 fixed a real defect and it was not THE defect. Per the DIAGNOSIS
GATE this lane names the cause before it edits anything.

## 0. What was captured, and the instruments

| thing | what |
|---|---|
| `ours-sizes-R41base/` | 76 in-game captures, `?fixed=1&seed=7&demo=2`, one per size bin per pattern, each with the enemy's own projected span and post-roll screen box (`judging/R40/enemy-look/size_capture.mjs`, reused) |
| `track-approach-s7/`, `track-crosser-s7b/` | **60 Hz CONSECUTIVE** single-enemy tracks (`track60.mjs`, written this round) — R40 only ever looked at stills |
| `arc-s1-hunt/` | arcade stage-1 (longplay-60fps t=96-120, STAGE_MAP span 88-120), every 12th frame, box-averaged to NATIVE 320x224, aircraft-shaped blobs cropped (`arc_hunt.py`) |
| `arc-s2-60/`, `arc-s2-hunt/` | arcade stage-2 (t=130-142) at 60 Hz, same treatment |
| `pose_census.mjs` | which of the nine bank cells the player actually sees |

Our render is exactly 3x native, so **every crop below is box-averaged to
320x224 first and magnified NEAREST afterwards** — the in-game read, not a
zoomed sheet.

### Instrument validation, and one instrument rejected

* `arc_hunt.py --selftest` PASS: finds a pale 20x6 "aircraft" with a dark
  engine pip on a flat sky and does NOT return a 40x24 white cloud.
* **R40's `detect.py` is wrong for this subject and I did not use it.** Its
  cloud rule ("min channel > 190 and low saturation -> cloud") deletes the
  arcade's PALE stage-1 airframe. On `arc-s1-full/f1200.png` — a frame whose
  two large enemies are plainly visible by eye (`arc-f1200-nat3x.png`) — it
  returned only four blobs of <= 16 px. Its own selftest passes, because the
  selftest uses grey rectangles. A correct operator on the wrong population.
* **`pose_census.mjs`'s pose-yaw replication FAILED its own sanity check and
  is reported as broken, not as a result.** It returns 0 % oblique cells,
  while a directly-tracked crosser sits pinned at bank -57.0 deg for its whole
  life (`track-crosser-s7b`), which the ladder can only answer with the -57
  cell. The `bankOnly` count (nearest cell to bankDeg alone) is reported
  instead and is a LOWER bound on oblique usage.

## 1. THE DEFECT, in plain words

> **Our enemy jet is a dark olive-green moth. The arcade's is a bright
> silver-and-green jet with a big burning tailpipe.** Ours is about twice as
> dark as the arcade's at the sizes the player meets them, and the single
> biggest colour on it is a near-black green.

Two further defects sit under it:

> **At hard bank the aeroplane comes apart.** Every crossing enemy spends its
> life at the +-57 deg cell, and those cells carry 40-60 % of the ink of the
> level cell: the wings degenerate into a dotted diagonal line and the
> afterburner becomes a loose orange square floating clear of the airframe.
> That is the literal "orange asterisk" the playtests keep reporting.

> **Our enemy is always square-on to the camera.** The arcade's enemies are
> nearly always angled so you see fuselage LENGTH and the exhaust; ours is a
> symmetric cross — wings left and right, a fin up, a red pip in the middle —
> and it stays that same flat cross from 12 px all the way to 50 px
> (`ours-approach-motion.png`, 16 consecutive-tick samples of ONE enemy
> growing 12 -> 50 native px: the silhouette never changes).

### 1a. Evidence for "twice as dark"

Census of the aircraft's own pixels (object = max-channel distance from the
frame's modal sky > 48), **R40's own `census.py` thresholds** so the figures
are comparable to last round:

| | arcade stage 1, span 11-60 px, n=97 | ours, span 11-60 px, n=22 |
|---|---|---|
| pale % (luma >= 150) | **56.3** | **25.3** |
| dark % (luma < 80) | **16.2** | **59.0** |
| median luma | **189** | **74** |
| green % (g > r+18 and g > b+18) | **0.0** | **17.8** |

The arcade column is measured on a 3.2125x video upscale, so its sky-blend
boundary ring inflates `pale`. The honest arcade target is therefore **this
repo's own R11 measurement** (`tools/art/palettes.js`, the one taken with no V
floor, no erosion and the blend ring rejected by HUE rather than by value):
**median L 132, fraction below L 80 = 30.8 %.**

Ours, read off the authored sheet itself (`enemy-grey-head.png`, level cell,
331 opaque texels):

```
  #005231  L  53.7   21.8 %   <- the camo band. The LARGEST colour on the jet.
  #101010  L  16.0   19.3 %
  #b5b5b5  L 181.0   16.6 %
  #4a4a4a  L  74.0   13.3 %
  #848484  L 132.0   10.6 %
  #000000  L   0.0    7.9 %
  #efefef  L 239.0    8.8 %
  #e61000  L  78.2    1.8 %
```

**Fraction below L 80 = 64.1 %**, against the arcade's 30.8 %. Median L ~54-74
against 132.

The mechanism is specific: **`band` (#005230, L 53.7) is DARKER than the
livery's own `shadow` rung (#4a4a4a, L 74)**, and the R40 redraw widened the
bands from three 14 %-wide dashes to two 22 %-wide bands and put them on the
head aspect as well. So the camo, which is supposed to be the mid-tone
pattern on a pale wing, is acting as a second black. Add the keyline and the
aeroplane is half black-or-near-black.

The arcade's stage-1 camo green, measured on its own wing
(`arc-f1200-nat.png` x[55,121] y[88,126], green = g > r+18 and g > b+18 and
g > 40, n=111): **median L 102.8** (p25 93.8, p75 113.2). That number is an
UPPER bound — the upscale blends the green with a pale airframe and a bright
sky — but our #005230 at L 53.7 is half of it, and the blur cannot explain a
2x gap in a tone that has pale on one side and sky on the other.

This is R11's own finding arriving from the other direction. R11 fixed "a
white bird" by adding the dark half; R37 then added a near-black green band;
nobody re-measured the TOTAL afterwards, and the sheet is now as far past the
arcade on the dark side as R8's was on the light side.

### 1b. Evidence for "at hard bank the aeroplane comes apart"

Opaque texels per cell (`enemy-grey-head.png` / `enemy-grey-rear.png`):

| cell | -57 | -45 | -30 | -15 | 0 | +15 | +30 | +45 | +57 |
|---|---|---|---|---|---|---|---|---|---|
| head | 164 | 132 | 332 | 331 | 331 | 331 | 333 | 132 | 164 |
| rear | 239 | 219 | 371 | 370 | 374 | 371 | 372 | 219 | 239 |

`|deg| >= 45` is R37's oblique quarter view — a different drawing, built from
a 3D control-point projection. Under its own projection (roll 42, pitch 14,
yaw 38, scale 0.86) the wing planform is viewed nearly edge-on, so a polygon
whose chord is 7 units deep projects under one pixel thick and the hard-pixel
scan converter renders it as a **dotted line** rather than a line. The head
cells at +-45 also leave **6 stray components of <= 2 px** — literal dust.
In the same cells the tail bell is placed at its own projected point and ends
up as **a detached orange square with sky between it and the airframe**
(`sheet-grey-rear-grid.png`, the four corner cells).

How often the player sees those cells: `pose_census.mjs` seed 7, 6 498
on-screen enemy-frames at span >= 10 native px — **13.6 % land on an oblique
cell by bank alone**, and that is a lower bound because the pose-yaw term adds
to the bank for exactly the fast-drifting crossers. A tracked crosser sits at
bank **-57.0 deg for its entire visible life**, so *every* crossing enemy is
drawn with the worst cell in the sheet.

### 1c. What the arcade actually looks like at these sizes

`arc-f1200-pair-8x.png` (native, t=116, HUD stage digit 1 in frame): a long
pale airframe on a diagonal, bold mid-green camo patches, strong top-lit /
bottom-shaded modelling, and a **big round orange exhaust inside a black
bell** that is the aircraft's loudest feature. At 13-20 native px
(`arc-s1-bin18.png`) it is a solid compact diagonal dart with a dark-red core
near the middle — never a symmetric cross.

## 2. What this lane changed

Four changes, all drawing or palette. No constant was nudged to hit a figure;
every one of them removes a specific thing the look found.

**1. The camo band stops being a second black.** `tools/art/palettes.js`,
`ENEMY_LIVERIES.grey.band`: `#005230` (L 53.7, DARKER than the livery's own
`dominant` rung) -> `#29845a` (L 100.1). Operator and the upper-bound caveat
are in the comment at that line.

**2. The wing's full-span trailing edge stops being near-black.**
`tools/art/sheets/enemy-mig.js` `wing()`: `p.shadow` (#101010, L 16) ->
`p.dominant` (#4a4a4a, L 74) across the whole span. This is the file's own
R11 measurement finally applied to the wing — "BOTTOMmost airframe row median
L 83.0 ... a MID tone, not black", which `palettes.js` already honoured for
`dayRim` and the wing never did. The short inboard `shadow` accent stays, so
the darkest value is still present at the wing root where the arcade has it.

**3. The oblique wing stops being a dotted thread.** `wing3()` is rebuilt in
SCREEN space from the projected leading/trailing-edge lines with the chord
clamped to a floor (4.2 px at the root, 1.6 at the tip, so it tapers). The 3D
model still decides where the wing goes, how it sweeps and how it
foreshortens; only the one quantity a pixel grid cannot represent below one
unit is floored. Supporting it: `drawOblique`'s pitch goes **14 -> 30 deg**
(hard) and **9 -> 20** (soft), because the projected chord is `chord *
sin(pitch)` and at pitch 14 a 7-unit chord projected to 1.7 px — the floor
would otherwise have been doing all the drawing.

**4. The fuselage's BELLY stops being painted over its own spine.** `poly3()`
is a painter with no depth test and no back-face rejection, so the four
fuselage faces landed in source order and the darkest face (`shadow`) was
always last. The top face's outward normal is now tested against the
projection's own depth output (`proj3` returns view-space z as its third
component), and the hidden face is drawn first. Before this, the oblique
fuselage was a BLACK bar crossing a pale wing.

Plus a consequence of 3+4: the oblique tail bell is sized from the wing's own
projected span in that cell (arcade proportion, dark mass 0.22-0.28 of span)
instead of a fixed r 4.6 disc. It was the biggest, highest-contrast mass in a
cell whose airframe had collapsed — which is why R40's warm-SHARE fix could
not catch it: the share was in band because it was measured against an
airframe that had itself collapsed.

### Measured result

**Per-cell, on the authored sheets** (opaque texels; `|deg| >= 45` is the
oblique drawing):

| cell | -57 | -45 | -30 | 0 | +30 | +45 | +57 |
|---|---|---|---|---|---|---|---|
| head BEFORE | 164 | 132 | 332 | 331 | 333 | 132 | 164 |
| head AFTER  | 201 | 196 | 332 | 331 | 333 | 196 | 201 |
| rear BEFORE | 239 | 219 | 371 | 374 | 372 | 219 | 239 |
| rear AFTER  | 260 | 262 | 371 | 374 | 372 | 262 | 260 |

Stray components of <= 2 px (dust) on the head sheet's +-45 cells: **6 -> 0**.

**In game, at the sizes the player meets them** (`ours-sizes-R41base` vs
`ours-sizes-R41after`, `?fixed=1&seed=7&demo=2`, span 11-60 native px, n=22
each, R40's `census.py` thresholds):

| | BEFORE | AFTER | arcade target |
|---|---|---|---|
| dark % (luma < 80) | 59.0 | **31.5** | **30.8** (R11 census, this repo) |
| median luma | 74 | **132** | **132** (R11 census) |
| pale % (luma >= 150) | 25.3 | 46.3 | 56.3 (video, blend-ring inflated) |
| mean luma | 92.9 | 138.2 | ~128 (R11: "sits ON the sky", sky L 120.7) |
| warm % | 2.1 | 2.5 | 1.5-6 (R40's band, still CLOSED) |

Median luma and dark share land on this repo's own measurement of the arcade
to the digit; mean luma overshoots the sky by +17 where the arcade's is +6,
which is inside the two estimates' own spread and is not tuned further.

### Pictures

* `CMP-R41-ARCADE-vs-OURS.png` — **the lead picture**: arcade / ours-before /
  ours-after at matched native size, built with `tools/compare_sheet.py`
  (blue spine = arcade, grey = ours before, orange = ours after).
* `CMP-R41-sheet-before-after.png` — the sheet cells themselves, rear and
  head, before over after, cells -57 -45 -30 0 +30 +45 +57. This is where the
  dotted-thread fix is unmistakable.
* `cell-rear-m57-18x.png` (before) vs `after3-cell-rear-m57-18x.png` (after) —
  one cell at 18x: a thread, a smudge and a floating orange ball, versus an
  aeroplane.
* `ours-approach-motion.png` / `after-approach-motion.png` — ONE enemy at
  60 Hz consecutive ticks growing 12 -> 50 native px, before and after.
* `after-stage2-stage3.png` — the camo (stage 2) and night (stage 3) liveries
  after the change: no regression, and neither was retuned (only `grey`
  carries a `band`).

### Verification

* **Bootable after every save**: `node tools/combat_probe.mjs --ticks 60
  --url-params "demo=1&seed=7"` prints state JSON; `npx vite build` succeeds.
* **Zero behaviour change, shown structurally.** The whole diff is
  `tools/art/**` plus the regenerated `src/assets/sprites/enemy-*.png` and
  `enemy-palettes.generated.js`. The only field that changed in the generated
  module is `band`, and **nothing under `src/` reads `.band`** —
  `enemySprite.js`'s `toDrawRoles()` does not map it (checked:
  `grep -rn "\.band\b" src/` returns only unrelated prose in comments). The
  sim imports exactly `enemyTexture` and `nearestPoseDeg` from
  `enemySprite.js`, which this lane did not touch.
* **Determinism control on the live tree**: `judging/R37/enemy-art/telemetry_probe.mjs`
  run twice back-to-back is BYTE-IDENTICAL (`telem-after-a-seed1.json` vs
  `telem-after-b-seed1.json`, 180 samples / 554 enemy rows).
* **The before/after capture indices DIFFER, and it is not this lane.**
  `src/weapons/combat.js`, `missiles.js`, `lockSystem.js` and
  `src/effects/smoke.js` were all modified by another lane between the two
  captures (mtimes newer than `ours-sizes-R41base/index.json`), which shifts
  enemy lifetimes and therefore which ids land in which size bin. Stated here
  rather than papered over; the structural argument above is what carries the
  "inert" claim.
* **Palette / alpha gates**: `node tools/fx_palette_probe.mjs` -> 0
  partial-alpha texels, 0 off-palette colours, 0 off-ladder channels.
  Independently over all 16 enemy sheets: alpha in {0,255} only, every
  channel on `tools/art/ladder.js`'s LADDER, colour counts unchanged
  (grey-head 8, grey-rear 10).

## 3. NAMED, NOT FIXED — for the TL (crosses file ownership)

**Our enemy is square-on to the camera for 86 % of the frames the player sees
it.** The nine sheet cells are BANK angles; only `|deg| >= 45` is a genuine
quarter view with fuselage length in it. `pose_census.mjs` seed 7, 6 498
on-screen enemy-frames at span >= 10 native px: by bank alone the ladder lands
on an oblique cell **13.6 %** of the time (`+0: 46.4 %`, `+15: 26.1 %`). The
arcade's enemies are almost never square-on — every readable frame in
`arc-s1-hunt/` shows a diagonal dart with visible body length.

Two routes, neither in this lane's files:

1. `src/entities/enemy.js` — the pose angle is `bankDeg + _poseYawDeg`, and
   `POSE_YAW_MAX_DEG = 28` with `POSE_YAW_DEG_PER_NDC_VEL = 60`. Raising the
   yaw authority (or giving approach/crosser patterns a standing yaw bias
   toward the player) moves more frames onto the quarter-view cells without
   any art change.
2. `tools/art/sheets/enemy-mig.js` `OBLIQUE_MIN_DEG = 40` is in THIS lane's
   file and could be dropped to ~25 so the +-30 cells become quarter views
   too (+6.9 points of coverage). **Deliberately not done**: the +-15 and
   +-30 cells would then be two different drawings one rung apart, and the
   enemies that sit near that boundary would pop between them at 60 Hz. That
   is a worse defect than the one it fixes, and it is a pose-ladder decision
   rather than a drawing one.

Also noted and NOT this lane's file: at ~28-44 native px a crossing enemy is
frequently unreadable because the lock bracket, the missile smoke billow and
the player's own jet are all on top of it (`ours-sizes-R41after/nat/`,
`bin4-crosser-*`). The enemy art is not the limiting factor in those frames.

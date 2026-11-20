# R40 enemy-look lane — "enemy planes need to look better, closer to original game"

Owner ask, 6th round running (R27 / R31 / R32 / R35 / R37 all tried and the
owner still says no). So this round does NOT nudge constants: it compares
**ours vs the arcade at the size the player actually sees** and changes the
drawing from what that comparison shows.

## 0. Instruments (both validated on a known input before use)

* `detect.py --selftest` — blob finder against a flat sky. PASS (finds a
  17x6 and a 5x3 rectangle, recovers the sky colour exactly).
* `census.py --selftest` — warm / dark / pale share of ONE aircraft inside a
  box. PASS on a synthetic aircraft of known composition.
* `size_capture.mjs` — steps the game one tick at a time, reads each enemy's
  OWN projected span (`window.__combatStats`), and screenshots the first time
  a span lands in each native-px bin. Two bugs found and fixed in it, both of
  the class CLAUDE.md warns about:
  1. a `SyntaxError` inside a `page.evaluate` string was swallowed by a
     `.catch(() => null)` and the probe reported a clean *"no enemy landed in
     any bin"*. The `.catch` is gone.
  2. **`enemy.ndc` is PRE-ROLL.** game.js rolls the whole view (R34 rigid
     roll) after the projection those numbers come from, so crops placed at
     the raw ndc missed the aircraft by up to ~90 px and the first sheets
     read *"the enemy is invisible at 7-11 px"* — a false alarm. The probe
     now rotates about the screen centre by `worldRollDeg + swayRollDeg`;
     verified against a hand-located enemy at seed 1 t=28 (predicted
     448.8,135.7 → rotated 528.9,139.3; the sprite is at ~530,140, and
     `__flowState().worldRollDeg` reads 22.83 there).

Our render is 960x672 = exactly 3x native, so every crop below is box-averaged
back to NATIVE 320x224 pixels and then magnified NEAREST. Past rounds kept
fixing the zoomed 64x32 sheet while the in-game read stayed wrong.

## 1. The arcade, at native scale

| Source | What it is |
|---|---|
| `reference/ab2-arcade-desert.png` | TRUE NATIVE 320x224, stage 2. Two camo enemies at **10 px** and **17 px** span. |
| `arc-s1-full/f1200.png` (longplay-60fps t=116, stage 1, HUD digit 1 in frame) | two LARGE stage-1 enemies, rear-quarter, ~80-93 native px. Native-equivalent crop: `arc-nat-f1200-left.png`. |
| `arc-s1-full/f0300.png` (t=101) | four stage-1 enemies at four different sizes in one frame. |

What the arcade enemy is, read off those:

* **Pale-dominant airframe with BOLD emerald-green camo chevrons** across the
  wings and body (stage 1). Not a dark aircraft.
* **One engine, drawn as a chunky near-BLACK squared housing** with grey
  feather segments inside it, sitting at the tail. The orange core is **inside
  and smaller than** the black housing and sits LOW in it: a flat amber with a
  dark-red lower rim, not a hot radial glow.
* At 10-17 px it is a compact diagonal dart with a **1-2 px** warm pip, a
  single pale canopy glint, and a dark body.

Census (`census.py`, operator stated in the file):

| subject | warm % | dark % | pale % |
|---|---|---|---|
| arcade native, stage-2 camo, 10 px | 4.3 | 65.2 | 11.6 |
| arcade native, stage-2 camo, 17 px | 4.3 | 38.8 | 18.1 |
| arcade stage-1 large (f1200 left, native-equiv 56 px) | 1.5 | 14.0 | 35.3 |
| arcade stage-1 pair (f1200 whole crop) | 6.0 | 10.4 | 46.9 |
| **ours** `enemy-grey-rear` cell 0 deg | **14.1** | 51.1 | 17.7 |
| **ours** `enemy-grey-rear` cell -30 deg | **15.3** | 50.7 | 17.4 |
| **ours** `enemy-grey-rear` cell -57 deg | **17.0** | 51.0 | 12.4 |
| ours `enemy-grey-head` cell 0 deg | 1.1 | 39.9 | 24.4 |

(The f1200 figures are from a blurry YouTube upscale downsampled to native, so
its saturated colours are pulled toward mid-tones: treat its warm/dark as
LOWER bounds and its "mid" as inflated. The desert frame is true native and
carries no such caveat.)

## 2. The defects, named from the look

**E1 — the rear-aspect enemy IS the orange asterisk.** Our afterburner spends
14-17 % of the aircraft's pixels on saturated orange+red where the arcade
spends 1.5-6 %, it is a soft radial gradient with a near-white hot pip at the
exact centre of mass, and the black bell around it is a thin rim. From ~12
native px up the orange is the only thing that survives downscaling, so the
airframe reads as four dark spikes around a glowing ball.
Evidence: `ours-sheet-grey-5x.png`, `ours-rear-cells-9x.png`,
`ours-sizes-B4/look-012.png` (panel 5), `look-019.png` (panels 3-7).
This is the R39 playtest's "orange asterisk" — **in the sprite**, not only in
the telegraph (see E5).

**E2 — the stage-1 enemy is the wrong colour at game size.** Arcade: white
airframe + bold green chevrons (pale 35-47 %). Ours: pale 12-18 %, dark 51 %,
and the 2-px green band dashes mix with the grey into a dark olive mush at
12-28 px. Our enemy reads as a dark smear where the arcade's reads white and
green. Evidence: `arc-nat-f1200-left.png` vs `ours-sizes-B4/look-019.png`.

**E3 — the far LOD (<10 native px) is a grey brick.** `drawHeadOnFar` /
`drawRearFar` are a 16x8 cell that is opaque edge to edge and drawn mid-grey;
in game it reads as a grey box with black bars. Evidence: `dbg-t28.png`, left
aircraft (far LOD) next to the right aircraft (detail sheet at ~9 px, which
reads far better).

**E4 — the head-on aspect is colourless, with a red slot for a mouth.** Flat
grey plus one horizontal red intake slot and no camo at all.

**E5 — NOT THIS LANE'S FILE, reported to the TL.** `src/weapons/telegraph.js`
draws the enemy-fire tell as a literal **9x9 four-point STAR** in enemy-shot
orange (`STAR`, `T_BODY #ff7331`), held at a FIXED 10-18 native px
(`FLARE_PX_MIN/MAX`) regardless of how big the firing aircraft is. On an
enemy at 10-20 native px that star is as large as the aircraft and sits on
top of it — a second, independent source of the "orange asterisk" read, in
the combat lane's file.

## 3. What this lane changed

All in `tools/art/sheets/enemy-mig.js` (+ regenerated `src/assets/sprites/enemy-*`)
and `src/entities/enemySprite.js`. No constant was nudged; four of the five
changes are new drawings.

1. **`nozzle()` — the glow stops being the aircraft (E1).** The soft radial
   disc with a permanent near-white pip becomes what the arcade draws: a
   chunky near-black **squared housing** (corner-cut polygon through the same
   roll transform, so it still rolls with the airframe and still has no
   resampling) with a grey feather bar along its top, and a small flat core
   LOW in it — dark-red rim, amber centre, and the hot pip only on the FLARED
   half of the 60 Hz shimmer. Same treatment, same proportions, on the oblique
   quarter-view cells, which measured the worst of all (17.0 % warm).
   Measured result: **warm share 14.1-17.0 % → 4.5-7.5 %**, inside the
   arcade's 1.5-6 % band (stop-threshold: the arcade's own spread, which is
   itself 4x wide, so anything in 4-8 % is CLOSED).
2. **`wing()` / `fuselage()` — the stage-1 enemy goes pale, and the camo reads
   as camo (E2).** The lit half of the wing chord moves `mid` → `highlight`;
   the body's base tone moves `mid` → `highlight` with a 1 px `specular` lit
   edge instead of a half-body block (a half-body block of the brightest rung
   is affordable on `grey` and not on `camo`, whose specular is its one bright
   green); the body now TAPERS (a `highlight` rectangle with a bright edge and
   dashes across it read as a white cabinet with a door — see the first
   version in `cmp-large-arcade-vs-ours.png`); and the camo bands go from
   three 14 %-wide two-row dashes to two 22 %-wide three-row bands. No ramp
   value changed — the ramp is R11's measured census and is not the problem;
   what changed is which role draws how many pixels, which is the failure R11's
   own header describes. **pale share 17.7 % → 25.0 % rear, 24.4 % → 42.2 %
   head**, against the arcade's 35-47 %.
3. **The far LOD gets a silhouette (E3).** `drawHeadOnFar` / `drawRearFar`
   were a 16x8 cell filled edge to edge; they now draw a two-row pale wing
   line with dark tips and a dark core, a full-width dark trailing edge, a fin
   stripe clear of the wing, and short stabilisers — **fill ~100 % → ~47 %**,
   with open sky above and below, which is what the arcade keeps inside the
   bbox at 9-10 px. The opacity invariant is untouched: rows 2, 3, 4 are still
   full width. Because that invariant is now LOAD BEARING rather than
   automatic, `assertFarRowsOpaque()` checks it **on the built buffer** at
   texture-build time — a documented-but-unchecked invariant is the defect
   class this project has paid for three times.
4. **The head-on intake stops being a mouth (E4).** R32's wide dark band with
   a wide red slit across it read as a letterbox mouth on a grey face at
   46-70 native px (`ba-046.png`). It becomes a compact dark **block taller
   than it is wide** with a small square core — which is what the 9 px locked
   enemy in the TRUE-NATIVE desert frame is, and which can be neither a face
   (not a bilateral pair) nor a mouth (not a horizontal slit). The oblique
   head cells' red nose disc shrinks from r 1.4 to r 1.1 for the same reason.
5. **The head aspect wears the same camo as the rear.** Shipping a
   green-banded rear and a plain grey head meant the player saw two different
   aeroplanes depending on which way the enemy happened to be flying; the head
   sheets' colour cap goes 8 → 9 to carry the one measured green.

### Before / after at the sizes the player sees

* `cmp-ingame-sizes.png` — arcade (top row) over ours-before (middle) and
  ours-after (bottom) at ~10 / ~17 / ~30 / ~46 native px, every cell
  box-averaged to native and magnified NEAREST.
* `ba-003.png` … `ba-071.png` — before over after, per size bin, in game.
* `fullframe-before-after.png` — one whole frame, two enemies, seed 1 t=123.
* `cmp-large-arcade-vs-ours.png` — the large arcade pair over our cells at the
  same span.
* `after-all-liveries.png` — grey rear / grey rear flared / grey head / camo
  rear / grey rear NIGHT, five poses each.

### Verification

* **Behaviour: inert, shown structurally rather than asserted.** The sim
  imports exactly two symbols from this file (`enemyTexture`,
  `nearestPoseDeg`; `DETAIL_SWITCH_NATIVE_PX` is read by enemy.js and is
  unchanged at 10) and neither signature nor the pose ladder moved; the rest
  of the diff is draw functions and `tools/art/**`, which the game never
  imports. `git diff -U1 src/entities/enemySprite.js` is drawing-only.
* **Determinism control**: `telemetry_probe.mjs` run twice back-to-back on
  this tree is BYTE-IDENTICAL (`telem-after-seed1.json` vs
  `telem-after2-seed1.json`, 499 enemy rows).
* **Honest caveat on the R37 baseline**: `judging/R37/enemy-art/telem-after-seed*.json`
  does NOT match today's tree (571 → 499 rows at seed 1). That baseline
  predates R38/R39 and the other R40 lanes, so it is not a control for this
  change. The in-game A/B I *can* attribute: `ours-sizes-B4/index.json`
  (captured before any of my edits) vs `ours-sizes-A3/index.json` agree
  exactly on tick, id, pattern, span, bank and roll for all 72 samples; the
  only differing rows are 5 GROUND BATTERY positions, and `groundBattery.js`
  + `spawner.js` were modified by another lane between the two runs.
* **Palette / alpha gate**: `node tools/fx_palette_probe.mjs` → 0 partial-alpha
  texels, 0 off-palette colours, 0 off-ladder channels. Independently, all 16
  enemy sheets: alpha ∈ {0, 255} only, every colour on `SEGA_LADDER`, colour
  counts ≤ cap (grey-rear 10, grey-head 8). (First run of that check FAILED
  all 16 on a ladder I typed from memory; re-run against the repo's own
  `SEGA_LADDER` it passes, and a deliberate off-ladder value is still caught.)
* **Bootable**: `node tools/combat_probe.mjs --ticks 60` prints state JSON
  after every save; `npx vite build` succeeds.

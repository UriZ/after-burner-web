# R11 — ENEMY ART LANE

**Charter**: `judging/R10/art-critique.md` (ranks 1, 2, 3, 6 and 9) and `judging/R10/judge-report.md`
gap 1 — *"the enemy aircraft are the worst drawings in the game, and they are the object on screen
the longest."*

**Owned and touched**: `tools/art/sheets/enemy-mig.js`, `src/assets/sprites/enemy-*.png`,
`src/entities/enemySprite.js` (one stale comment), and the `ENEMY_LIVERIES`/`ENEMY_FAMILY` block of
`tools/art/palettes.js` — see §8 for why that last one and what I did not touch in it.
**Nothing committed.** No `stash` / `checkout` / `reset` / `push` was run.

**Every instrument, figure and probe in this report is a committed script in this directory:**

| script | what it is |
|---|---|
| `enemy_census_r11.py` | value census + Criterion A + Criterion B, one operator for our sheets and for arcade crops. `--selftest` |
| `pose_geom_r11.py` | per-cell bbox, fitted wing-line angle, and the point-sampling visibility check |
| `fig_enemy_r11.py` | every figure below, with its crop boxes and magnifications in the source |
| `sheet_in_use_probe.mjs` | positive control that the authored sheets are what the player sees |

Figures land in `tools/out/enemy-art-r11/` (gitignored — regenerate, don't chase).

---

## 0. THE SHORT VERSION

**`enemy-grey-head.png` went from 5.7 % of pixels darker than L=80 to 33.9 %, and its mean
luminance from 189.8 (ΔL **+67** against a sky of 121.8) to 119.0 (ΔL **−3**).** The arcade's
stage-1 enemy, re-measured here on four subjects, sits at 24–29 % dark and mean L 122. The rear
sheet went 13.3 % → 36.5 %.

**Six genuinely distinct silhouettes now exist where four did**, counted by md5 of the alpha plane
over all sixteen sheets. `prop` and `interceptor` no longer share a drawing. `grey` and `camo`
still do, deliberately, and that is counted as **one** drawing (§4).

**The five bank cells are a roll now.** The fitted wing line reads −29.7 / −14.9 / −0.0 / +14.9 /
+29.6 degrees across the five cells, against five authored bank angles of −30 / −15 / 0 / +15 /
+30, and the bbox height moves 25 → 31 px. Before, the height was pinned and only the span moved.

**The arcade column held up as a drawing target, and I reproduced its acquisition byte-for-byte**
(§1). What it does *not* license is a silhouette statistic — §7, a withdrawal with its reason.

**The strongest single validation is `camo`.** Its ramp was *not* changed this round; only its
drawing was. Run through the new drawing program it lands at **91.2 %** below L=80 against the
arcade's true-native stage-2 measurement of **92.5 %**. One drawing program, two liveries, two
stages, two correct polarities — which is the test that the area budget is right rather than
tuned.

---

## 1. THE ARCADE COLUMN — reproduced, extended, and what each part licenses

### 1.1 The R10 acquisition reproduces exactly

```
ffmpeg -nostdin -ss 127 -i .reference-cache/video/ab2-longplay-60fps.mp4 \
       -t 2 -vsync 0 out/v%04d.png          # frame v0098
```

Against the committed `tools/out/art-critic-r10/A-arc-headon-SOURCE-FRAME-stage2.png`:
**mean |Δ| = 0.0000**, with neighbours `v0097` at 14.59 and `v0099` at 17.22. A zero with large
neighbours. `t = T_ss + (i−1)/60` holds; the old "`-ss` starts ~4 s early" caveat does not apply
and I did not hedge any timestamp on it.

### 1.2 Geometry of the LEVEL head-on enemy — the pose cell 2 is drawn from

`tools/out/art-critic-r10/arc-enemy-mid-4x.png`, which is a 4× nearest crop of the 1028×720
decode, i.e. 12.85 file px per native px. Operator: sky = crop mode `(231,113,5)`, object =
max-channel distance > 45, the top-right blade of a second aircraft excluded by box.
Native-equivalent:

| | arcade (native) | scaled to a 60 px span | what I drew |
|---|---|---|---|
| span × height | 73.8 × 26.5 (2.78 : 1) | 60 × 21.5 | 60 × 25 |
| wing chord, inboard → tip | 4.7–5.3 → 1.9–2.2 | 4.3 → 1.8 | 6 → 2 |
| fin, w × h above the body | 2.5 × 12.8 | 2.0 × 10.4 | 3 × 11 |
| fuselage block | 8 × 11.8, **near-black** | 6.5 × 9.6 | 9 × 13 |
| red intake / cream pip | ~5 / 2.8 | 4.1 / 2.3 | 4.6 / 2 |
| near-black (L<40) share | **38.5 %** | — | — |

Its structure is unambiguous and is what the redraw copies: **a dead-straight horizontal bar whose
top edge is one line tip to tip, a compact dark block holding a saturated red rectangle holding a
cream pip, and a long thin desaturated column above for the fin.** Our wing chord is 1–2 px fatter
than the arcade's and I left it there: at 60 px span a 4 px chord cannot carry a five-band value
ramp, and the ramp is what makes it read as a wing rather than a plank.

### 1.3 Colour, stage 1 — re-measured on FOUR subjects, and the published band is the top of the range

`reference/stage1-missile-salvo-t100.75.png`, one rear-aspect enemy, box x[712,800] y[238,306],
sky = crop mode `(0,158,255)` L 121.8, swept over the sky-rejection tolerance:

| tol | 25 | 40 | 60 |
|---|---|---|---|
| frac L<80 | 24.2 % | 26.2 % | 28.8 % |
| mean L | 121.6 | 122.0 | 123.3 |

Three more, on a different frame — hunt frame `h0042` = `-ss 88 … select not(mod(n,10))`, i.e.
**t ≈ 94.8 s**, inside `STAGE_MAP.md`'s verified stage-1 span 88–120, three enemies each entirely
against sky:

| box | frac L<80 | mean L |
|---|---|---|
| x[430,505] y[225,305] | 14.2 % | 151.4 |
| x[725,825] y[215,315] | 20.8 % | 127.0 |
| x[180,345] y[215,320] | 8.3 % | 141.5 |

**So the arcade's own stage-1 spread is 8–29 %, and the R10 critique's published "25–34 %" is the
top of that range rather than its centre.** I am not retiring the criterion — the *direction* is
not in doubt and our 5.7 % was below every reading — but a judge should know the band is wider
than one line of the critique implies. Our 33.9 % sits at the top of the published band and just
above my own widest reading.

**The decisive number is not the dark share, it is ΔL against sky.** Every arcade subject above
sits within −5 to +30 L of its sky. Ours was +67. It is now −3.

### 1.4 WHY the dark half went missing — the root cause, found and published

R8 set the grey ramp with `airframe = S<0.30 AND V>0.176, largest 8-connected component, eroded
twice`. **`V>0.176` discards every pixel darker than L≈45 by construction** — which is exactly the
nozzle housing, the one place R8's own round proved the arcade puts its near-black — and the double
erosion then discards the shaded lower edge too. The five bands that came back (148/173/197/230/255)
are the arcade's airframe **interior**, measured correctly. The drawing then spent all five rungs on
them.

A correct measurement of the wrong population. Re-run on the same subject with **no V floor and no
erosion**, rejecting the sky-blend ring by *hue* (`B > R+60 AND B > G+30`) rather than by value,
2 170 airframe px, quintile means (REFERENCE I6's operator) with the nearest Sega ladder member:

| | q1 | q2 | q3 | q4 | q5 |
|---|---|---|---|---|---|
| L | 15.6 | 76.2 | 132.1 | 180.9 | 235.3 |
| mean rgb | (26,10,13) | (78,74,78) | (131,132,132) | (182,181,175) | (224,239,243) |
| ladder | `#101010` | `#4a4a4a` | `#848484` | `#b5b5b5` | `#efefef` |

median L 132.2, mean L 128.0, **frac L<80 = 30.8 %**. Every band neutral — R8's one correct
finding, unchanged. That five-rung ramp is the new `grey` livery.

**Where I did not follow the critique**: it prescribed two dark steps "cool rather than neutral so
they read as shadow, not as dirt". The arcade's own bands are neutral to within 4/255 at q2–q4, so
the measurement wins over the prescription and the new rungs are neutral greys.

### 1.5 The rim, re-measured — and R8's finding survives while its implementation does not

Same subject, same operator, topmost / interior / bottommost airframe pixel per column over 73
columns:

| | median L | frac L<80 |
|---|---|---|
| topmost row | 174.1 | 11.0 % |
| interior | 132.2 | — |
| bottommost row | **83.0** | **49.3 %** |

Lit above, shaded below — R8 was right, and R8's own figure for the bottom row (V 0.661 ≈ L 169)
is the V-floored mask seen from the other end.

R8 implemented this as `outlineSouth(rim)`, which **grows the silhouette by one row all the way
round the bottom**. On a 23 px tall aircraft that is a 9 % fatter sprite and, measured, 17–18 % of
every cell spent on one tone — and it double-counts, because the wing and fuselage now carry their
own shaded lower bands *inside* the silhouette, which is what shading an edge means. The pass is
removed from the sheets; `rim` stays in the palette table because the procedural far-LOD in
`enemySprite.js` still uses it.

---

## 2. BEFORE AND AFTER — look at the crops first

- `FIG1-headon-arcade-before-after.png` — **arcade | before | after**, head-on level, each on its
  own stage's sky. This is the figure that settles it: the "before" is a drooping white gull with
  a red donut on a mast; the "after" is the arcade's straight bar, dark block, red intake, thin fin.
- `FIG1b-headon-near-arcade-before-after.png` — the same against the rolled near-aspect column.
- `FIG2-rear-arcade-before-after.png` — the rear enemy. Arcade panel is a **new** stage-1 crop
  (`s1near-B-3x.png`, hunt frame `h0057`, t ≈ 97.3 s, HUD digit 1): pale airframe, big near-black
  nozzle housings **on** the body at the wing line. The "before" hangs an orange ball under a gull.
- `FIG3-bank-poses-before-after.png` — five poses over five poses. The top row is one drawing
  stretched; the bottom row rolls.
- `FIG4-fleet.png` — all four liveries, head and rear, on the sky each actually flies against.
- `FIG5-sizes.png` — the sizes the player sees: 1×, 2×, 3×, 6×.
- `play-montage.png` — 16 live frames, `?fixed=1&seed=3&invincible=1`, `--every 12 --warmup 60`.
- `insitu-near-3x.png` — one near enemy from a live frame at 3×: the wing's value ramp (pale lit
  edge → mid → dark trailing edge) survives into the real render with hard pixels and no blur.

---

## 3. THE VALUE CENSUS — all sixteen sheets, before → after

Operator: `L = 0.299R + 0.587G + 0.114B` over **opaque** pixels of the authored sheet (alpha is
ground truth — no mask discretion). Population = all 5 cells. `enemy_census_r11.py --selftest`
passes 6 synthetic controls **and reproduces the two published R10 figures for
`enemy-grey-head.png` to the digit — 5.7026 % dark against R10's 5.7 %, 59.8627 % Criterion B
against R10's 59.9 %** — which is what fixes the operator variant so it cannot be silently
swapped. That control is pinned to blob `21c789c`, the tree R10 judged, rather than to the working
tree or to `HEAD`: pointed at a sheet this lane just redrew it would validate itself, and pointed
at `HEAD` it would stop meaning anything the moment the TL commits.

| sheet | frac L<80 | mean L | colours | max chan | Criterion B |
|---|---|---|---|---|---|
| grey-head | **5.7 → 33.9** | **189.8 → 119.0** | 8 → 8 | 8 → 8 | 59.9 → 63.2 |
| grey-head-night | 53.4 → 33.9 | 95.7 → 91.1 | 8 → 8 | 8 → 8 | 59.9 → 63.2 |
| grey-rear | **13.3 → 36.5** | **171.1 → 111.2** | 8 → 8 | 8 → 8 | 59.4 → 66.9 |
| grey-rear-night | 54.3 → 36.5 | 89.9 → 85.9 | 8 → 8 | 8 → 8 | 59.4 → 66.9 |
| camo-head | 89.7 → **91.2** | 44.6 → 57.1 | 8 → 8 | 7 → 7 | 60.7 → 63.2 |
| camo-head-night | 83.9 → 79.2 | 49.0 → 64.3 | 8 → 8 | 7 → 7 | 60.7 → 63.2 |
| camo-rear | 85.4 → **88.0** | 42.1 → 54.6 | 8 → 8 | 8 → 8 | 62.3 → 66.9 |
| camo-rear-night | 82.7 → 75.7 | 45.2 → 61.5 | 8 → 8 | 8 → 8 | 62.3 → 66.9 |
| interceptor-head | 56.3 → 32.8 | 95.4 → 104.8 | 8 → 8 | 8 → 8 | 60.1 → 63.7 |
| interceptor-head-night | 56.3 → 32.8 | 81.4 → 92.1 | 8 → 8 | 8 → 8 | 60.1 → 63.7 |
| interceptor-rear | 58.2 → 38.1 | 87.8 → 96.6 | 8 → 8 | 8 → 8 | 70.6 → 66.7 |
| interceptor-rear-night | 58.2 → 38.1 | 75.5 → 85.1 | 8 → 8 | 7 → 7 | 70.6 → 66.7 |
| prop-head | 56.3 → 33.8 | 84.0 → 87.5 | 8 → 7 | 8 → 7 | 60.1 → 65.2 |
| prop-head-night | 80.8 → 80.8 | 63.7 → 65.0 | 8 → 7 | 8 → 7 | 60.1 → 65.2 |
| prop-rear | 58.2 → 35.8 | 75.4 → 85.1 | 8 → 8 | 8 → 8 | 70.6 → 62.4 |
| prop-rear-night | 84.9 → 81.5 | 58.2 → 63.6 | 8 → 8 | 8 → 8 | 70.6 → 62.4 |

**Against the arcade:**

| subject | arcade | ours (after) |
|---|---|---|
| stage-1 enemy, frac L<80 | 8–29 % (4 subjects) / 25–34 % (R10 published) | 33.9 % head, 36.5 % rear |
| stage-1 enemy, mean L vs sky L 121.8 | 122.0 (ΔL ≈ 0) | 119.0 (ΔL −3) |
| stage-2 camo, frac L≤86, **true native** | **92.5 %** | **91.2 %** head, 88.0 % rear |

The camo row is the one that is not circular: its ramp was already measured, I did not retune it,
and the new drawing program reproduces its arcade share to **1.3 points**.

### Criterion A and Criterion B

**Criterion A — PASS on all 16 sheets**: ≤ 8 unique colours (cap 256) and ≤ 8 distinct values per
channel (cap 32). The generator's `assertPalette` throws on violation, so a failing sheet cannot be
exported.

**Criterion B — PASS on all 16 sheets**: 62.4 – 66.9 % adjacent-pixel identity over opaque pairs,
against a ≥ 50 % floor. Every sheet rose except `interceptor-rear` and `prop-rear`, which fell from
70.6 % to 66.7 / 62.4 % and are still well clear.

**Criterion A and B in a LIVE frame**, not just on the canvas — `tools/measure_criterion_ab.py`
(its own `--selftest` reproduces both published arcade figures to the digit), 16 frames of
`?fixed=1&seed=3&invincible=1`, HUD mask derived per run by `tools/hud_mask.py`:

```
MEDIAN of 16 frames   colours 62   channel-values 24   n90 12
  ground band, mask=hud          H 79.36 %   V 56.98 %
  ground band, mask=hud+static   H 80.10 %   V 57.00 %
  near patch y[150,198) x[20,300)  colours 15   H 79.73 %   V 55.35 %
GATE  colours <=256, channel values <=32, H>=50 %, V>=50 %, patch V>=50 %   -- PASS
```

---

## 4. HOW MANY DRAWINGS THERE ACTUALLY ARE — md5 of the alpha plane

The R10 brief's population defect, verified independently (`md5` of the boolean `alpha>0` plane; my
prefixes differ from the brief's because I hash a different serialisation, but the equivalence
classes are identical):

**Before — 4 distinct alpha planes across 16 sheets:**

| plane | sheets |
|---|---|
| `c28d2fedc19d` | camo-head, camo-head-night, **grey-head**, grey-head-night |
| `3b8b29b4ed19` | camo-rear, camo-rear-night, **grey-rear**, grey-rear-night |
| `5a81571cbb61` | interceptor-head, interceptor-head-night, **prop-head**, prop-head-night |
| `678b72a52f00` | interceptor-rear, interceptor-rear-night, **prop-rear**, prop-rear-night |

**After — 6 distinct alpha planes across 16 sheets:**

| plane | sheets | family |
|---|---|---|
| `418fb87b9f79` | camo-head ×2, grey-head ×2 | `mig` |
| `7a1655b0559b` | camo-rear ×2, grey-rear ×2 | `mig` |
| `e351e4910018` | interceptor-head ×2 | `swept` |
| `7c5e3654012d` | interceptor-rear ×2 | `swept` |
| `6c9367c89956` | prop-head ×2 | `prop` |
| `575d24772659` | prop-rear ×2 | `prop` |

**So: three silhouette families, six drawings, up from two families and four drawings.** I am not
claiming eight.

**`grey` and `camo` still share one drawing and that is deliberate, not a shortcut.** The arcade's
stage-1 white jet (`s1near-B-3x.png`, `arc-s1-enemy-rear2-5x.png`) and its stage-2 green camo jet
(`A-arc-headon-NATIVE-12x.png`) are the same airframe in two liveries. Counted as **one** drawing.

**`prop` and `interceptor` no longer share one**, which is the half of the defect that was
indefensible: a propeller type with an interceptor's silhouette.

The three families, and the cue that separates each at the smallest size:

- **`mig`** (grey, camo) — dead-straight wing bar, chord 6 → 2, compact fuselage at the wing line,
  one leaning fin. Drawn from §1.2.
- **`swept`** (interceptor) — pronounced **anhedral**: the wing line drops 4 px outboard of the
  root where the mig's is straight. Longer belly, taller narrower fin.
- **`prop`** (prop) — unswept wings of nearly constant chord with **blunt** tips where both jets
  taper to a point, and the propeller's swept arc drawn as a **1 px ring** with a hub at its
  centre instead of an intake. **UNMEASURED — see §6.**

---

## 5. THE BANK IS A ROLL — measured, not asserted

R10 critique finding 3 stated the defect as numbers: bbox height pinned at **27 in all five poses**,
span 48/55/62/55/48, cells 0 and 4 exact mirror twins. That is yaw, not roll.

Every cell is now built from control points in the **aircraft's own frame** and mapped through a
rigid rotation into cell space, then scan-converted. No cell is a resampling of another and no cell
is a horizontal scale of another — and because the rotation is of control points, not of pixels,
there is no intermediate colour and no soft edge anywhere.

`pose_geom_r11.py`, wing line fitted by least squares to the per-column vertical centroid over
columns with `|x − 32| > 10` (outside the fuselage, where the wing is the only thing present):

| cell | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| authored bank | −30° | −15° | 0° | +15° | +30° |
| **fitted wing line** | **−29.7°** | **−14.9°** | **−0.0°** | **+14.9°** | **+29.6°** |
| bbox height, before | 27 | 27 | 27 | 27 | 27 |
| bbox height, after | 31 | 25 | 25 | 25 | 31 |
| span, after | 53 | 58 | 60 | 58 | 53 |

The roll sign matches the convention the previous generator used (positive bank → right wing down),
so `enemy.js`'s `bankDeg` needs no change and I made none.

**Why not ±50° as the critique asked.** A 60 px wing line rolled 50° needs 46 px of cell height and
the cell is 32. The cell is 64×32 and that aspect is *correct* for the extreme pose — the arcade's
rolled near-aspect enemy has a bbox aspect near 2 : 1, which is sin(30°) of its span over its span —
so ±30° is what this cell geometry can carry. Going further needs a taller cell, which changes the
sprite's texture aspect and is a cross-lane change (`entities/enemy.js` owns the quad). **OPEN**, §9.

**Visibility re-checked, because changing a silhouette is how R3 lost 27 of 80 frames of one
approach to zero rendered pixels.** `pose_geom_r11.py` simulates NearestFilter point sampling of
every cell at every quad width:

- **10–40 px (the entire band in which this sheet is used; `DETAIL_SWITCH_NATIVE_PX` = 10): every
  cell of every day sheet renders ≥ 1 pixel. PASS.**
- Below the switch, the new art has a slightly wider hole than the old (invisible at widths 2–5
  depending on cell, against 2 before). Those widths are drawn by the **far LOD**, not by this
  sheet. Reported rather than buried; it is not a regression the player can see, and I did not
  distort the drawing to close it.

---

## 6. THE PROP IS UNMEASURED, AND IT IS FLAGGED RATHER THAN DRESSED UP

There is **no arcade column for a propeller type at any aspect** in this repo. `GAME_SPEC.md` §4
says they exist ("silver/blue prop types, stage 2 open") and nothing in `reference/` or in the
footage I swept shows one at a readable size. The `prop` silhouette is designed from general
airframe structure to be unmistakably not a jet, because *that* is the defect it exists to fix. It
must not be treated as reproduced.

One thing I did check and fix by looking: the first R11 draft gave the prop 3 px of **dihedral**
(tips above the root) and a propeller **blade cross**. Cropped and looked, per the standing rule:
the dihedral made a gull — precisely the shape R10 rank 2 exists to remove — and the blade cross
merged with the fin and the wing root into a vertical smear. Both replaced: flat wing, and the
propeller drawn as the **arc it sweeps** (a 1 px ring), which at 12 screen px reads as a turning
propeller where a filled disc reads as R4's "bullseye".

---

## 7. WHAT THE COLUMN DOES *NOT* LICENSE — a withdrawal, with the reason

The brief asked whether the new column licenses **DRAW-WEIGHT** on the near-aspect enemy, where
REFERENCE had declared it unlicensed because no arcade anchor existed.

**It does not, and I checked the validity floor before offering the corroboration rather than
after.** DRAW-WEIGHT's own licence requires an **isolated, unclipped** subject at matched span:
`span`, `bbox_fill` and `ink_per_span` are all undefined on a clipped silhouette, and `RP90` is
only partly defined. In the one acquisition frame this project has at that aspect (`v0098`):

- The R10 crop `A-arc-headon-NATIVE-12x.png` clips the aircraft at **both** horizontal edges.
- Re-cropping the source frame generously does not fix it: an 8-connected component analysis of the
  non-sky mask over `x[20,420] y[150,470]` returns the aircraft as a **16 795 px component that
  touches the crop boundary and has merged with neighbouring objects** — a second aircraft, the
  player's jet and an explosion all abut it in that frame.

So a silhouette mask for that subject cannot be isolated without discretion, and discretion in the
mask is the single largest source of disagreement in DRAW-WEIGHT's history. **I publish no
DRAW-WEIGHT comparison for the near-aspect enemy.** `tools/known_quality_pair.py --selftest` passes
6/6 here and its `--pairs` tally over committed history is unchanged by this round's work (my
redraw is uncommitted, so it is not in the pair set); a judge who wants it should run it after the
TL commits.

**What the column genuinely does license, and what I used it for:** shape, proportion, structure,
value *order*, and — from the true-native stage-2 frame and my four stage-1 subjects — the value
census. That is a drawing brief, which is what §1 is. I propose no new gate and no new statistic.

---

## 8. THE ONE FILE OUTSIDE MY STATED OWNERSHIP

`tools/art/palettes.js` is not under `tools/art/sheets/**`, and I edited it. **Only the enemy
block**: the `grey` livery's five rungs, the `grey` night ramp's ORDER (same five measured hexes,
no value changed, added, or removed), the `dayRim` alias, and the `ENEMY_FAMILY` map plus their
comments. `PLAYER`, `PLAYER_NIGHT`, `PLAYER_ROLL`, `EXPLOSION`, `CLOUDS`, `HUD`, `SEA`, `SKY` and
`HAZE` are untouched; `git diff tools/art/palettes.js` is 90 insertions / 9 deletions, all inside
`ENEMY_LIVERIES` and `ENEMY_FAMILY`. There was no way to give the enemy a dark rung without it, and
`build.js` regenerates `src/assets/sprites/enemy-palettes.generated.js` from it so near and far LOD
cannot drift. Flagging it because it is outside the letter of the lane split.

**A ramp-ORDER invariant is now asserted** in `enemy-mig.js`:
`L(shadow) ≤ L(dominant) ≤ L(mid) ≤ L(highlight) ≤ L(specular)`, which throws at build time.
The drawing program assigns value by role, and only `grey` was non-monotone — day *and* night — so
a drawing that read correctly on camo, interceptor and prop inverted on **the one livery the player
sees most**. That is most of why four rounds of palette work never fixed this sheet.

**An incidental consequence I checked rather than assumed**: the far-LOD procedural sprite in
`enemySprite.js` reads the same roles, so the grey reorder changes it too. Rendered offline from the
generated palette (`far-head-14x.png`, `far-rear-14x.png`): it goes from a pale blob at ~26 L of
contrast against the L 122 sky to a dark dart at ~106 L. That is an improvement, it agrees with
`enemySprite.js`'s own note that "the distant stage-1 enemy is plainly dark against the sky at 5×4
native px", and it was not the intent — so it is reported as a drive-by, not claimed as design.

---

## 9. POSITIVE CONTROL — the sheets are what the player actually sees

`node judging/R11/sheet_in_use_probe.mjs --ticks 900`:

```
ticks stepped        900
selftest (control)   {"detected":true,"before":0,"after":1}
sheets expected      16
sheets loaded        16
sheets failed        {}
sheets pending       []
procedural uses      0  {}
PASS -- every near-field enemy on screen is the authored sheet
```

The `selftest` line is the part that matters: it deliberately provokes one fall-through and
confirms the counter moved, so **the reported zero is a measured zero and not a blind counter** —
which is the "measures zero: look once" rule in the form the instrument can take.

`npx vite build` passes.

---

## 10. LEFT OPEN, with reasons

1. **The stage-1 arcade enemy has TWO nozzles; ours has one.** Visible in `s1near-B-3x.png`
   (t ≈ 97.3 s, stage 1) — two black housings with orange cores. `arc-s1-enemy-rear2-5x.png` shows
   one dominant housing in three-quarter view, which is why R8 and the R10 critique both accepted a
   single nozzle. I left it single **because twin nozzles are the player F-14's defining rear
   feature**, and "the enemy must not read as the player" is a standing R4/R5 readability
   requirement that outranks one frame. Both readings are recorded; it is a decision for the TL,
   not a measurement I can settle alone.
2. **The night sheets moved in mixed directions against R6's arcade night figure.** On R6's own
   V operator against `reference/stage3-night-lockon-t186.png` (median V 0.675, V<0.3 27.0 %,
   V>0.7 48.6 %), `enemy-grey-head-night` goes median V 0.773 → 0.773 (tied, both above),
   V<0.3 1.6 % → 7.5 % (**toward**), V>0.7 50.6 % → 69.7 % (**away**). I did not tune to it: the
   R6 figure is from a 686×480 upscale of a dark subject against a black sky, which R6 itself
   flagged as blur-biased downward, and no new night measurement was taken this round. **Needs a
   true-native night enemy; that is the acquisition this leaves on the board.**
3. **`interceptor` and `prop` ramps are unchanged and unanchored.** Both got *lighter* as a side
   effect of the new area budget (56 % → 33–38 % below L=80). For `prop`, which flies stage 2 only,
   that is a move away from the stage-2 polarity its own stage shows (mean L 87.5, ΔL −49 against a
   sky of L 136, where the arcade's camo is ΔL −67). There is no arcade column for either livery, so
   I did not invent one; changing a ramp with no measurement is the failure this project has
   retired criteria for three rounds running.
4. **±50° bank poses** need a taller cell, which changes the sprite's texture aspect — a cross-lane
   change with `entities/enemy.js`. §5.
5. **Wing chord is 6 → 2 px where the arcade's scales to 4.3 → 1.8.** Deliberate: at 60 px span a
   4 px chord cannot carry the five-band value ramp, and the ramp is what makes the bar read as a
   wing. Stated rather than hidden.
6. **Below the LOD switch (quad width 2–5 px) some cells point-sample to nothing.** Inside the far
   LOD's range, so no player-visible effect, but it is a wider hole than the old art had. §5.

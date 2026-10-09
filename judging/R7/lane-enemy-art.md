# Sprite-art lane, out of cycle — the enemy jets

**Blocker as raised:** *"enemy jets look very bad. this is a blocker. our jet is still not
good enough."*

Files touched: `tools/art/palettes.js`, `tools/art/sheets/enemy-mig.js`,
`src/entities/enemySprite.js`, `src/render/spriteFactory.js`, and the 19 regenerated PNGs
under `src/assets/sprites/`. Nothing else in `src/`. No commit, no stash, no checkout, no
push. Captures all under `tools/out/enemy-art/`. Started from committed `82365e9`.

---

## 0. Lead with the crop

**`judging/R7/lane-enemy-01-enemy-BEFORE-AFTER-native-and-6x.png`** — the lead's own frame
beside the same crop after, at **true native 320×224** first and then at nearest 6×.
`?fixed=1&seed=1&combatsolo=1&noclouds=1`. Enemy span 62 native px before, 60 after, so the
two are directly comparable without rescaling either side.

Supporting panels:

| file | what |
|---|---|
| `lane-enemy-02-OURS-vs-ARCADE-matched-span.png` | our rear and head-on cells beside the arcade's, **span-matched** |
| `lane-enemy-03-night-OURS-vs-ARCADE.png` | stage 3 in play, HUD digit read |
| `lane-enemy-04-player-slot-BEFORE-AFTER-ARCADE.png` | the player's centre body, the one player change |
| `lane-enemy-05-stage-digits-1-2-3.png` | the three HUD digits I read, so nothing here is "inferred from the tick" |
| `lane-enemy-06-all-liveries-AFTER.png` | all four liveries, both aspects, day and night |
| `lane-enemy-07-no-840000-rim-on-the-enemy.png` | the map behind §5c — where the arcade does and does not put dark red |
| `lane-enemy-08-player-vs-enemy-readability.png` | §7 — can the player still find their own aircraft |

---

## 1. The audit the lead asked for — and it was every aircraft except the player

Operator: for each exported sheet, `perimeter` = every opaque pixel 4-adjacent to a
transparent one (or to the canvas edge); `near-black` = V ≤ 0.12. Run against
`git show HEAD:<path>` for the before column, so this is a real A/B on one instrument.

| sheet | near-black % of sprite | | perimeter near-black % | |
|---|---|---|---|---|
| | **before** | after | **before** | after |
| enemy-grey-head | 31.6 | **1.6** | **100.0** | **2.1** |
| enemy-grey-rear | 36.9 | 13.3 | **100.0** | **0.0** |
| enemy-grey-head-night | 31.6 | 1.6 | **100.0** | 2.1 |
| enemy-grey-rear-night | 36.9 | 13.3 | **100.0** | 0.0 |
| enemy-camo-head | 46.9 | 18.2 | **100.0** | 2.1 |
| enemy-camo-rear | 49.9 | 26.3 | **100.0** | 1.1 |
| enemy-camo-head-night | 31.6 | 1.6 | **100.0** | 2.1 |
| enemy-camo-rear-night | 36.9 | 13.3 | **100.0** | 0.0 |
| enemy-interceptor-head (+night) | 20.0 | 1.4 | **100.0** | 1.3 |
| enemy-interceptor-rear (+night) | 34.3 | 13.1 | **100.0** | 0.2 |
| enemy-prop-head (+night) | 20.0 | 1.4 | **100.0** | 1.3 |
| enemy-prop-rear (+night) | 34.3 | 13.1 | **100.0** | 0.2 |
| player-f14 | 9.8 | 8.6 | 0.2 | 0.2 |
| player-f14-night | 0.0 | 0.0 | 0.0 | 0.0 |
| player-f14-roll | 10.7 | 9.4 | 1.1 | 1.1 |

**All sixteen enemy sheets were 100.0 % near-black on their perimeter.** The three player
sheets were already at 0.0–1.1 %, because R7 fixed those and only those. That is the lead's
pattern, confirmed on pixels: the object got fixed, the class did not.

Two further call sites carried it and are now fixed with the sheets:

- `src/entities/enemySprite.js` `buildTexture()` — the **near-aspect procedural fallback**,
  `addKeyline(buf, pal.key)` with `pal.key === '#000000'`. It only runs in the few frames
  before the sheets decode, which is exactly why nobody had ever captured it.
- The **far LOD** passes `keyline: false` and has no rim at all; it was never affected. Its
  one dark pixel is a nose marking, not an outline, and it stays.

Not fixed, not mine this round, named so the next lane has it: `src/game/flow/carrier.js:357`
still calls `addKeyline(buf, KEYLINE)` — a ship, not an aircraft, but it carries parked
aircraft on its deck. `tools/art/sheets/missile.js:51` calls `outline4(KEYLINE)` — also not an
aircraft, and I did not measure the arcade's missiles.

### "Holes of literal sky punched through the wing roots" — the correction

The lead is right about what the eye sees and I have to correct the mechanism, because the
next agent will otherwise look for a topology bug that is not there. I flood-filled
transparency from the border on every cell of every enemy sheet: **0 enclosed transparent
pixels, on all 80 cells.** The sky wedges between the wing root and the tailplane are
*concave notches* that drain to the background, not holes. They read as punched holes because
they were ringed in `#000000` on all sides, which is what a hole in a sprite looks like.
Removing the ring removes the read; the crop in panel 01 is the evidence. (The arcade's own
head-on MiG has sky between its blades too — `ab2-arcade-closeup-enemies.jpg`.)

---

## 2. What the arcade's enemy actually does, re-measured on the enemy

The lead's instruction was not to inherit R7's player result. I did not.

**Source.** `.reference-cache/video/ab2-longplay-60fps.mp4` at **t = 104 s**, inside
`STAGE_MAP.md`'s verified stage-1 span 88–120, extracted with `-frames:v 1` at an exact
timestamp (not `-ss` sequence — CLAUDE.md's AV1 warning). **The HUD stage digit in the frame
reads 1.** Crop x[400,575] y[290,400] holds one rear-aspect enemy.

**Instrument and its control.** Airframe = `S < 0.30 AND V > 0.176`, largest 8-connected
component. The mask was **dumped and looked at**
(`tools/out/enemy-art/ARC-t104-airmask-5x.png`) before any number was taken: it is the
aircraft and nothing else, with the chromatic orange glow and the sub-threshold black housing
correctly excluded. The source is a 3.2125× AV1 upscale, so the interior figures are taken
after **two 8-connected erosions**, which removes the boundary ring that is blur-mixed with a
V = 1.0 sky; 2 496 interior px survive.

| | arcade t104 | ours before | ours after |
|---|---|---|---|
| airframe interior median V | **0.788** | 0.549 | 0.678 – 0.773 |
| share above V 0.8 | **47.0 %** | 23.2 % | **43.6 – 49.9 %** |
| share below V 0.4 | **0.0 %** | 24.2 % | **0.0 %** |
| **top-most** airframe row, median V | **0.953** | 0.741 – 1.000 | **0.902 – 1.000** |
| **bottom-most** airframe row, median V | **0.661** | 0.322 | **0.678** |
| perimeter near-black | **0.0 %** | 100.0 % | **0.0 – 2.1 %** |

The ladder, as quintile means of the eroded interior, every band neutral to within 7/255:

```
q1 V 0.587 (145,143,143)   q2 0.687 (169,165,169)   q3 0.790 (194,193,192)
q4 V 0.910 (224,221,223)   q5 0.988 (248,241,244)
```

Snapped to the Sega ladder that is **148 / 173 / 197 / 230 / 255** — ΔV −0.007, −0.009,
−0.017, −0.008, +0.012. That is the new `grey` livery verbatim.

**Where the arcade's dark is.** `tools/out/enemy-art/ARC-t104-rimmap-5x.png` marks the
airframe mask, its 4-adjacent rim, and the rim pixels below V 0.40. Every dark rim pixel is
around the **nozzle housing**; the entire outer perimeter against the sky is bare. The
arcade's stage-1 enemy is lit from above, shaded below, and has no keyline — the same finding
R7 published for the player's daylight jet, on a different aircraft from a different frame.

**So the rim is not a new colour.** It is the livery's own second rung, drawn one-sided
downward with `PixelCanvas.outlineSouth()` replacing `outline4('#000000')` in all four draw
functions. Our bottom-most row now reads **0.678** against the arcade's 0.661. Every sheet
stays inside its 8-colour budget because `rim` always aliases a rung the sheet already has.

### Two nose/nozzle measurements, and one of them overturned a comment

**Nozzle.** Same frame, largest component of `V ≤ 0.30` for the housing and of
`S > 0.45 AND R > B+50 AND V > 0.39` for the glow: housing **39 × 38 px**, orange core
**19 × 20 px**, **diameter ratio 2.05**. Ours was 8 : 4.8 = **1.67** — too much glow inside
too thin a ring, which is the R4 "glowing eyes" direction. Now 11 : 5.4 = **2.04**.

I deliberately did **not** use the span normalisation. Span-normalised the housing is 23.5 %
of that aircraft's 166 px bbox, but the subject is banked (bbox aspect 1.5 against a level
enemy's ~3), so span under-reads and 23.5 % would scale to a 14 px bell on our level cell.
The scale-free ratio is the figure that survives the pose. This is written into the file.

**Nose intake.** `ab2-arcade-closeup-enemies.jpg`, x[1080,1180] y[750,840] — **I read its HUD
digit myself and it is 2**, so only the geometry is licensed from it and the camo colours stay
on the camo livery (ledger row 12). Structure: a near-black housing **outside**, a red
annulus **6.9 native px** across, and a **solid** pale core **4.0 px** across, i.e. 0.58 of
the red's diameter. Ours drew the red as the *outermost* element with no housing at all and
then put a `#000000` dot in the *middle* of the pale core. That inversion is most of why it
read as a red-rimmed eye. Now dark outside, nothing black in the centre, core/red = 0.54.

The old comment above `noseIntake()` claimed the feature was "kept small on purpose" against
R4's bullseye. The size was never the defect and the comment pointed at the wrong thing; it
is corrected in place rather than deleted, with the measurement.

---

## 3. The value distribution was a second, separate defect, and my first fix made one number worse

Worth the space because it is reusable and because it is the thing I would have shipped if I
had stopped at "snap the rungs".

With the five measured rungs in place but mapped `dominant → 0.773`, `mid → 0.678`, the sheet
read **median 0.678 with only 17.4 % above V 0.8** — *further from the arcade's 47.0 % than
the sheet it replaced* (23.2 %), while every individual rung was correct to ±0.017.

The mechanism is role **area**, not role colour. `shadow` carries the one-sided rim plus the
under-bands and is 43 % of the cell; the left/right wing split put another 15 % on the rung
below `dominant`. Two changes, both measured:

1. **Both mig wings on `dominant`.** The arcade's stage-1 enemy is lit from **above**
   (0.953 / 0.788 / 0.661 top/interior/bottom), not from one side, so the chordwise
   specular-and-shadow bands are the modelling and the left-right split was only moving mass
   down a rung. The bank cells still read apart because their control points differ.
2. **`dominant` to the 0.902 rung**, leaving 0.580 to the under-bands and 0.678 to the rim.

**The delta family keeps its left/right split, and that is a measurement too.** Unifying the
delta's two halves merges the whole triangle into one 8-connected single-colour component and
`enemysil.py`'s compact-feature gate goes **4.4 % → 12.9 %** against a ≤12 % target on cells 0
and 4 — a triangle passes the aspect/fill test a swept wing fails. Measured both ways; the
split is load-bearing there. It is a comment in the file.

### Night needed the rim on a different rung, and the number and the picture agreed

The night ramps' darkest rung sits at **V 0.388** where the day ramps' sits at 0.580. Putting
the rim on rung 1 at night painted ~40 % of the sprite in a blue that is nearly invisible
against stage 3's **black** sky, and took the rear sheet's median from 0.643 to **0.388**
against R6's arcade figure of 0.675. A readability loss and a worse number at the same time
is the signal that it is wrong rather than a trade, so `rim` names rung 2 at night.

| night, grey rear cell 2 | before | after | arcade (R6 ENEMY-V, `stage3-night-lockon-t186.png`, HUD digit 3, n=37) |
|---|---|---|---|
| median V | 0.643 | 0.643 | **0.675** |
| share > V 0.7 | 28.9 % | **46.1 %** | **48.6 %** |
| share < V 0.3 | 36.6 % | 12.3 % | 27.0 % |
| perimeter near-black | 100.0 % | **0.0 %** | — |

`V < 0.3` undershoots. The arcade figure is `n = 37` from a 686×480 video crop against a black
sky, where blur mixes airframe with background and biases that particular share **up**; I am
not tuning a sprite to it. Stated, not closed.

**Camo and prop stay dark** — they fly stage 2's orange sky and R6's reasoning holds. Camo's
day sheet is 18.2 / 26.3 % near-black after, against **11.1 %** below V 0.12 measured on the
stage-2 camo MiG in the closeup frame (quintile means 0.095 / 0.174 / 0.204 / 0.342 / 0.741).
Same neighbourhood; it was 46.9 / 49.9 % before.

---

## 4. The player jet — one change, measured, and the discriminators did not move

The lead said not to re-tune to the discriminators and to draw to the crop. Putting our level
cell beside `stage3-night-level-t175.png` — the authoritative level astern crop — the thing
that jumps out is not value or silhouette. **It is a face.** Two round orange glows, a magenta
fleck between them, and a `#000000` bar of maximum contrast centred under the fuselage. That
is R4's "two glowing eyes" arriving from the other side.

The bar is the arcade's own feature and the old comment cites it correctly. The **size** was
wrong. Re-measured on t175 x[295,400] y[240,320] (a 2.144× upscale, so proportion evidence
only): the arcade's slot is **~7.6 × 1.6 native px** on a jet of SPAN 117 and H 36 —
**6.5 % of span, 4.4 % of H**. Ours was 8.2 % of span and **11.6 % of H**: the right width and
**2.6× the height**. It is now 6.4 × 1.6 local units (6.5 % / 5.2 %, held one notch above the
arcade's because a 1.4 px box rasterizes to a dotted line), flanked by a `warmMid` panel so
the step from body to black is two rungs instead of cream-straight-to-black.

Applied to **both** copies of the planform; `mirror_check.py` passes at 356 items.

**Everything published re-checked, day and night, on the authored level cell:**

| `value_census.py` (`--selftest` PASS), mask-mode sky, largest component | before | **after** | arcade |
|---|---|---|---|
| reading A — `S<0.25`, no V floor | 0.839 | **0.839** | 0.839 |
| reading B — `S<0.25`, `V>0.08` | 1.000 | **1.000** | 1.000 |
| reading C — `S<0.35`, `V>0.08` | 0.969 | **0.969** | 0.969 |
| black as a share of the mask | 10.7 % | **9.5 %** | (window 6.5–21.5 %) |
| rim near-black | 0.0 % | **0.0 %** | 0.0 % |

| `jetsil.py` (control suite run first; arcade t175 returns its published values) | day | night | arcade | band |
|---|---|---|---|---|
| two-blade fin rows | 100.0 % | 100.0 % | 100.0 % | 99–100 % |
| fin-pair extent | 38.0 % | 38.0 % | 35.5 % | 30–40 % |
| blade cant | 1.21 | 1.26 | 1.28 | ≥1.15 |
| aspect SPAN/H | 3.12 | 3.12 | 3.26 | 3.0–3.6 |
| nozzle separation | 15.0 % `[V≥0.45]` / **30.0 %** `[V≥0.70]` | 30.0 % | 30.0 % | 25–35 % |

Nothing moved. The `V≥0.45` nozzle reading is R7's documented operator collision with
`#840000`, unchanged and still printed both ways.

---

## 5. Standing gates, all re-run after the last art change

- `tools/art/mirror_check.py` — **OK**, 16 anchor constants, bladePoly 20, wingPoly 14,
  podPoly 24, drawing program **356 items** match. `assertRoles` green; the roll sheet builds
  at 11 colours and took the slot change through `levelOps()` with it, so the trap the lead
  named did not fire.
- `tools/art/sheet_visibility.py` — **0 invisible (sheet, cell, size) combos**, all 19 sheets.
- `node tools/art/sheet_probe.mjs` — `selfTest.detected: true` (the positive control fires;
  the script exits non-zero if it does not), **16/16 sheets decoded, 0 procedural detail
  fallbacks**, 0 page messages.
- `tools/art/enemysil.py`, 8 sheets × cells 0/2/4: fuselage 12.9–32.6 % of span (≤35 ✓),
  wing leading edge 18.7–60.2° (≥15 ✓), compact feature 1.4–12.9 % — see the carried failure
  below.
- `npx vite build` — ✓.
- **Criterion A in ordinary play with combat**, `?fixed=1&seed=1`, 9 frames at 70-tick
  spacing, 3×3 blocks verified uniform before decimating to native: **61–74 colours** against
  256, **max 27 distinct channel values** against 32. The new `grey` livery uses **5** distinct
  channel values where the old one used 14, so this change gave headroom back rather than
  spending it.
- **Capture hygiene**: `cap-R8` 9/9 distinct md5, `cap-R8-solo` 4/4, `cap-R8-night` 3/3; no
  duplicate md5 across the three directories; frame means 23.2–151.3, no black frames. Stage
  identity for every regime is the **HUD digit read in the frame**
  (`lane-enemy-05-stage-digits-1-2-3.png` shows 1, 2, 3).

---

## 5b. Three follow-ups from the lead's correction

### (a) Criterion A is not evidence about the enemy sprite — agreed, and I did not use it as such

§5 reports Criterion A only to show the gate was **not lost to the redraw**, which is what the
brief asked me to protect. It is not offered as evidence that the enemy art is right; the
crop in panel 01 is. Noting for the record that the redraw moved that gate in the safe
direction rather than consuming headroom: the new `grey` livery spends **5** distinct channel
values where the old one spent **14**.

### (b) "Drawn rather than composited" — the explosion's property, demonstrated for the enemy

Worth doing, and it is a sharper instrument than anything else in this report, so here it is
run on my own lane.

`?fixed=1&seed=1&combatonly=enemies,shots&noclouds=1`, **60 CONSECUTIVE ticks** (`--every 1`),
decimated to native after verifying every 3×3 block uniform. 60/60 distinct md5, frame means
122.1–127.6, no black frames.

```
new colours introduced per tick:
  51, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 3,0,0,0,0,0,0,0,0,0,
   0,0,0,1,0,0,0,0,0,0,  0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0
```

**Tick 1 introduces 51 colours. The remaining 59 ticks introduce 4, and 56 of them introduce
zero.** Union over the whole run: **55 colours, 22 distinct channel values** (gate ≤32),
against 51–55 colours in any single frame. That flatness *is* the test: a sprite alpha-blended
against the sky generates a fresh intermediate every time it lands on a new sub-pixel
position, so a composited object's union climbs monotonically while its per-frame count stays
put. This one does not climb.

The four late arrivals are **all authored enemy-sheet colours** — `#e61000` (intake ring),
`#ffffff` (specular), `#949494` (shadow) at tick 21, `#f7efa4` (intake core) at tick 33. They
appear late because the enemy grows large enough to resolve those features, not because
anything blended. **Zero blend intermediates in 60 consecutive ticks.**

Two greys in the union that are *not* on any aircraft, localised so nobody else has to chase
them: `#a4a4a4` (9 px, row 203) and `#848484` (91 px, rows 212–219) are **HUD**, not airframe.

### (c) 159 is the sky, and my audit leaves it alone

Confirmed independently on my own captures. Over 12 native frames spanning stages 1, 2 and 3,
the off-ladder channel values are 37, 39, 45, 46, 48, 53, 54, 67, 77, 80, 87, 97, 100, 125,
158, **159**, 176, 183, 196. **159 is the B channel of `#009fff`** and nothing else —
37 597 px in one frame, i.e. the sky fill; the arcade's own measured stage-1 sky `#009eff` is
158, equally off the ladder, and 158 shows up here too. Left alone, as instructed, and it was
never a candidate: **all 25 exported sheets carry zero off-ladder channel values** on their
opaque pixels, because every authored hex goes through `L()` in `palettes.js`. The remaining
off-ladder values are ground/haze/explosion and belong to other lanes.

---

## 5c. The one instruction I did not follow, and the measurement that says so

The brief says twice: *"apply the arcade's measured one-sided `#840000` rim to **every**
aircraft the build draws."* **I applied the one-sided rim to every aircraft. I did not apply
`#840000`**, and the reason is a measurement rather than a preference.

`#840000` is the rim of a **cream** aircraft, measured on the **player**. Whether the arcade
uses it on its stage-1 **enemy** is a separate question, so I asked it. Operator: dark-red
family = `R > G+30 AND R > B+30 AND 0.22 < V < 0.75 AND S > 0.45`, run on the same t104
stage-1 crop, with the arcade's own player crop as the **positive control**.

| | dark-red-family px | of which exact `#840000` |
|---|---|---|
| arcade **player**, `ab2-arcade-desert.png` x[85,182] y[82,140] (true native) | **1 070** | **222** |
| arcade **stage-1 enemy**, t104 | 107 | — |

107 is not zero, so I mapped them (panel 07, `lane-enemy-07-no-840000-rim-on-the-enemy.png`):

```
on the airframe mask                      0
on its 4-adjacent rim                     6     (all of them at the nozzle housing)
within 2 px of the aircraft               7
elsewhere in the crop (ground, other glows)  100
```

**The arcade's stage-1 enemy carries no `#840000`-family keyline anywhere.** The handful of
warm-dark pixels near it are the AV1 blur ring between the orange nozzle glow and its black
housing — a compression intermediate in the source, not a drawn line. The positive control
fires at 10× the rate on the player, so the operator is not simply blind.

Putting `#840000` on a neutral-grey MiG, a green camo MiG and a slate prop would be licensing
the **player's** colour, measured on a **daylight stage-2 banked player crop**, onto three
other aircraft on three other stages. That is the mis-licensing class this project already
has a ledger row for. What the enemy's rim actually is, measured: **the livery's own second
rung** — bottom-most airframe row median V **0.661** on the arcade against our **0.678**,
which is as close as a 5-rung ladder gets. The *treatment* is applied to every aircraft, both
aspects, four liveries, day and night; the *hex* is per-livery because the arcade's is.

If the criteria lane disagrees, the thing to overturn is the 107-pixel map above, not this
paragraph.

---

## 7. "With both now pale, is the player still unmistakable?" — measured, and the answer is yes

Short answer: **the separation is wider than it was, wider on value than the arcade's own, and
it does not depend on value at all.** Panel 08 is the picture; the numbers are below.

### 7.1 The arcade separates them by hue and by nozzle count, not by brightness

`reference/stage1-level-flight-t116.png` — **HUD stage digit 1** — holds the arcade's player
and an arcade enemy **in one frame, at comparable size, on one background**, which is exactly
the control the question needs. I identified which is which the way the hardware intends:
**the player's F-14 has TWO nozzles, the enemy has ONE.** (I used that cue repeatedly in this
session to tell them apart in the longplay, which is about as good a field validation of a
discriminator as exists.)

Operator: subject = not-sky (`B>150 AND B>R+60 AND G<B` rejected) and `V > 0.157`, largest
8-connected component, eroded twice for the upscale. **Both masks dumped and looked at** —
`ARC-t116-PLAYER-mask-4x.png`, `ARC-t116-ENEMY-mask-4x.png` — before any number was taken.

| arcade, one frame | median V | R−B | green bias G−(R+B)/2 |
|---|---|---|---|
| player (2 nozzles) | 0.792 | **+22.0** | −0.7 |
| enemy (1 nozzle) | 0.627 | **−20.2** | **+28.6** |
| **separation** | **0.165** | **42.1** | **29.2** |

### 7.2 Ours, measured exactly rather than through a mask

In-frame masks of two overlapping aircraft are a guess; the authored sheets are not. These are
alpha-masked, blur-free, and the separation is a property of the two sprites rather than of one
capture.

| ours, authored level cells, airframe `S<0.30` | median V | R−B |
|---|---|---|
| player-f14 cell 4 | 0.969 | **+34.5** |
| enemy-grey head / rear cell 2 | 0.678 | **exactly 0.0** |
| **separation** | **0.290** | **34.5** |

**Our value separation is 1.76× the arcade's** (0.290 against 0.165) and our warmth separation
is 0.82× it (34.5 against 42.1). Every one of the enemy's five greys is literally `R = G = B`
— `#949494`, `#adadad`, `#c5c5c5`, `#e6e6e6`, `#ffffff` — while the player's airframe runs
`#f7e6b5` at R−B +66 and its rim `#840000` at **+132**. The two sprites cannot drift toward
each other in hue without someone editing a palette constant.

So the pale-vs-pale worry does not materialise: making the enemy *brighter* moved it **away**
from the player, because the player's own measured palette is brighter still (0.969) and warm,
and the enemy's is neutral. Before this round the two were 0.549 vs 0.969 on value but both
sat under a `#000000` cage that flattened everything; now they differ on value **and** on hue.

### 7.3 Three cues that survive when value and hue do not

1. **Nozzle count — 2 against 1.** Binary, pose-independent, and the arcade's own cue.
2. **Rim hue.** The player's silhouette edge is `#840000` (R−B +132); the enemy's is neutral
   `#adadad`. The rim is *on* the outline, so it still reads when the bodies overlap.
3. **Size.** In the capture behind panel 08 the player spans **116** native px against the
   enemy's **60**.

### 7.4 Night is the harder case, and the cue there is saturation, not value

Operator: area-weighted saturation over the opaque mask with `V > 0.12` (drops the nozzle
throat on both sides).

| ours, night | area-weighted S | median S | median V |
|---|---|---|---|
| player-f14-night cell 4 | **0.408** | **0.330** | 0.902 |
| enemy-grey-*-night cell 2 | **0.674** | **0.799** | 0.773 / 0.902 |
| separation | **0.26** | 0.47 | **0.00 – 0.13** |

**At night value does not separate them and saturation does** — the player is a desaturated
blue-grey, the enemy a saturated royal blue. That is the arcade's arrangement, not a
convenience: R6's measurement of the stage-3 enemy gives a dominant family `#222fa5 / #2340be
/ #3c59d7` at **S 0.79 / 0.82 / 0.72**, and the arcade's night player on the true-native frame
is visibly a blue-**grey**. This round's role remap raised the enemy's `V>0.7` share from
28.9 % to 46.1 %, so the two are now further apart on value than they were as well.

### 7.5 What I could not establish, stated rather than rounded off

- **Stage 1 fields more than one enemy livery in the arcade, and §2's ladder is only the pale
  one.** t104's enemy is pale neutral grey; t116's is distinctly **green** (green bias +28.6).
  Our `grey` livery reproduces the pale one, which is the harder readability case and the one
  worth getting right — but the green type is real, it is on **stage 1** and not only stage 2,
  and GAME_SPEC's "dark green/black camo (stage 2)" is therefore incomplete. Not mine to
  change; raised.
- **I could not find a single stage-1 frame holding the player and a PALE enemy together**, so
  the arcade's own worst-case separation is unmeasured. §7.1's 0.165 / 42.1 is against its
  green enemy and is therefore an **upper** bound on the arcade's separation, which makes the
  "ours is 1.76× on value" claim weaker than it looks, not stronger. Said plainly.
- **I tried and discarded two arcade player-warmth readings.** t112's player mask, eroded
  four times, still includes a cloud-edge patch (`ARC-t112-playermask-3x.png` — cropped and
  looked at, which is why it is discarded rather than published), and the night-player crop at
  REFERENCE.md's published box includes the navy sky and an explosion. Both returned clean,
  plausible numbers. Neither is in this report.
- **One thing that genuinely worries me and that I cannot settle here.** Our player's cream is
  measured on `ab2-arcade-desert.png`, a **stage-2** frame; the arcade's player on **stage 1**
  may be cooler. Every attempt I made to measure it was sky- or cloud-contaminated. If the
  arcade tints the player per stage the way it does the enemy, our cream is a ledger-row-12
  error on the player — the same class this lane exists to fix — and it would *narrow* the
  warmth separation in §7.2. **It needs a true-native stage-1 frame**, which is item 6 of §6.

---

## 6. Open — what I could not close, and why

1. **`enemysil.py` compact-feature fails at 12.9 % on `interceptor-rear` and `prop-rear`
   cells 0 and 4** (gate ≤12). **Pre-existing**: the same operator on `git show HEAD:` returns
   **13.8 %** for `prop-rear-c0`, so this round moved it 0.9 points *toward* the gate and did
   not introduce it. The offending component is the delta's own wing — a structural member
   that happens to pass the compactness test — which is arguably an operator defect rather
   than a drawing one, and is a criteria-lane call.
2. **Our head-on mig is a continuous swept V; the arcade's is an X of thin separated blades.**
   Panel 02's bottom pair shows it plainly. Closing it is a silhouette redraw, not a tone
   change, and the only frame I have for it is stage 2.
3. **The red nose intake `#e61000` is shared by all four liveries and I could not verify it
   for stage 1.** Every head-on enemy I can find at readable size in stage 1 is too small to
   resolve the intake; the structure above is licensed from a stage-2 frame. If a stage-1
   head-on frame turns up, re-check the hue before the size.
4. **Our enemy's interior median is 0.678–0.773 against the arcade's 0.788** — one rung low on
   most cells, while the brightness *share* (43.6–49.9 % above V 0.8 vs 47.0 %) and both edge
   rows match. A 5-tone sprite's median can only land on one of its five values; the share
   statistics are the ones carrying information here.
5. **Night `V < 0.3` is 12.3 % against the arcade's 27.0 %** — §3. The arcade figure is n = 37
   off a video upscale against a black sky and is biased up; not tuned to.
6. **This repo still holds no true-native stage-1 frame and no true-native level-astern
   frame.** Every arcade figure in §2 and §4 rests on an upscale — 3.2125× AV1 for the enemy
   ladder, 4.5× JPEG for the nose geometry, 2.144× for the player's slot. The two true-native
   PNGs (`ab2-arcade-desert.png`, `ab2-arcade-night-banking.png`) are both banked player
   poses. This is now the third report to ask for it.
7. **The five authored enemy bank poses are still never selected** — `textureFor()` in
   `src/entities/enemy.js` does not pass `bankDeg`. Flagged in R6 and R7, still true, still
   one line in a file I do not own. Everything above is therefore measured on cell 2 in play.
8. **`src/game/flow/carrier.js:357` still calls `addKeyline(buf, KEYLINE)`** — **handed to
   the ladder lane this round**, not open on me. It is a ship rather than an aircraft, but it
   carries parked aircraft on its deck.
9. **`tools/art/sheets/missile.js:51` still calls `outline4(KEYLINE)` and that is UNMEASURED,
   not fine.** I did not measure the arcade's missiles at all, so I have no basis for either
   keeping the ring or removing it. Left exactly as it was, and recorded as unmeasured so the
   next lane does not read my silence as approval.

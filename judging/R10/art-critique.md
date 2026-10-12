# R10 — ART CRITIQUE

**Subject**: the aircraft, as drawings. Fresh context. Every crop cited below is under
`tools/out/art-critic-r10/` and was produced by this lane.

**Tree**: `21c789c` plus the uncommitted work of two build lanes. This lane wrote **nothing**
under `src/` and ran no `git` command that mutates the tree.

---

## 0. THE SHORT VERSION

**The three worst drawings in the game, in order:**

1. **`enemy-grey-head.png`** — the head-on enemy of stage 1 *and* stage 3, and the `line`,
   `heavy` and `overtake` livery of both (`src/entities/enemy.js:52-64`). It is the sprite the
   player looks at most, and it is a **white bird**. 5.7 % of its pixels are darker than L=80.
   The arcade's equivalent is 25-34 %.
2. **`enemy-grey-rear.png`** — same silhouette family, same palette problem, and its planform is
   a **dihedral gull-wing V with a single large orange ball slung under the middle**. The arcade
   stage-1 rear enemy is a swept dart.
3. **`player-f14.png` level cells** — the wings are a constant-thickness horizontal bar with a
   brighter rectangle bolted on outboard across a hard vertical seam, and the composition reads
   as a **face**: two round orange eyes, a dark-red mouth dash, two ears.

**Is the TL's explosion reading right?** Yes on both counts, with one correction to the
population. See §6.

**Did I find arcade reference for the near-aspect head-on enemy?** **Yes.** See §1. It is
byte-reproducible, stage-identified by its HUD digit, at ~100 native px span — i.e. at the same
scale as our own fly-past sprite — and it pairs with a **true-native, colour-valid** frame of the
same stage and the same livery.

---

## 1. THE ACQUISITION — an arcade column for the near-aspect head-on enemy now exists

This was the top item on the board and it is the most valuable thing in this document.

### 1.1 The SHAPE source

```
ffmpeg -nostdin -ss 127 -i .reference-cache/video/ab2-longplay-60fps.mp4 \
       -t 4 -vsync 0 out/v%04d.png          # frame v0098
```

Verified **byte-identical** (mean abs diff `0.0`) to an independently produced 4 Hz sample of the
same moment, so the recipe is exact and not a seek artefact. Nominal `t ≈ 128.6 s`, carrying this
repo's standing caveat that `-ss` sequence extraction on the AV1 file can start ~4 s early — the
frame index above is the reliable handle, not the absolute time.

**Stage identity by HUD digit: `2`** (`A-arc-headon-stagedigit.png`) — read the way `STAGE_MAP.md`
requires, not inferred from the sky.

- `A-arc-headon-left.png` — 4× nearest, the aircraft as the video carries it
- `A-arc-headon-NATIVE-12x.png` — the same crop resampled to its **native-equivalent 100 × 64 px**
  and blown up 12×. **This is the one to draw from.**

Source is 1028×720 = 3.2125× native, so: **shape, proportion, structure and value *order* only.
No colour and no cardinality reading off it.**

### 1.2 The COLOUR source, same stage, same livery

`reference/ab2-arcade-desert.png` is **true native 320×224** and contains two camo enemies at
near aspect (`arc-desert-enemies-10x.png`). Measured on the clean one (box x113-122, y40-52,
sky = frame mode `(230,115,0)`, n = 40 non-sky px):

| rgb | L | share |
|---|---|---|
| `(0,0,0)` | 0.0 | 7.5 % |
| `(16,82,0)` | 52.9 | 12.5 % |
| `(66,66,16)` | 60.3 | 30.0 % |
| `(99,66,16)` | 70.2 | 30.0 % |
| `(115,66,0)` | 73.1 | 5.0 % |
| `(82,99,33)` | 86.4 | 7.5 % |
| **`(255,132,148)` pink** | 170.6 | 5.0 % |
| **`(214,181,49)` gold** | 175.8 | 2.5 % |

`mean L = 68.8` against `sky L = 136.3` → **ΔL = −67.5**. All eight values sit on the Sega 5-bit
ladder. **92.5 % of the aircraft lives in L 0-86; 7.5 % is two bright accents.** That is the whole
recipe: a dark mass, two sparks.

The same operator on the shape source gives `mean L 65.1`, `sky L 141.1`, **ΔL = −76**, bright
(L>150) 8.9 %. Two independent sources, one of them colour-valid, agreeing to ~8 L.

**Recommendation**: promote `A-arc-headon-NATIVE-12x.png` and the recipe above into `reference/`
and REFERENCE.md as the near-aspect head-on column, with the licence written on it explicitly —
*shape from the longplay frame, colour from `ab2-arcade-desert.png`, same stage, same livery.*
That is a drawing lane's brief, not a gate; I am not proposing a new statistic.

### 1.3 What the arcade head-on enemy actually is

Read off `A-arc-headon-NATIVE-12x.png`, span ≈ 100 native px:

- **An X, not a T.** Four separated blades radiate from the core, and **orange sky shows between
  them.** No blade merges into its neighbour.
- **Each blade is a long tapering green sliver, 3-6 px thick, ending in a 1 px point**, carrying a
  **1 px gold/khaki highlight line along ONE edge only** — consistently the edge facing upper-right.
  One light source, one lit edge, everywhere.
- **The fuselage is the darkest thing in the drawing** — a near-black slate slab ~25 × 14 px. The
  wings are *mid* green against it. The value hierarchy is body < wing < highlight.
- **The nose is three nested shapes**: a thick **black** hemisphere ~11 px across (≈ 11 % of span),
  a **red** disc ~7 px inside it, a **cream chevron pip** ~2 px at the centre.
- **The fin is a desaturated khaki/olive blade, LIGHTER than the wings and lower in chroma** — it
  is the one soft element, and it is angled, not vertical.
- **The whole aircraft is rotated off the screen axis.** It is not bilaterally symmetric about a
  vertical line in any frame I found.
- Markings are 1-2 px cream dashes on the wing surfaces. Sparse and deliberate; not noise.

The far/level head-on enemy, for contrast (`arc-enemy-mid-4x.png`, ≈ 17 px span): **a dead-straight
horizontal dark bar with a black line above and below it**, a compact **black square** fuselage
holding a **saturated red rectangle** holding a **cream pip**, and a **long flat olive column**
above for the fin. Arrow-straight. No droop. No taper gradient. Three nested rectangles.

---

## 2. FINDING 1 — the grey enemy has had its dark half deleted (highest impact)

`FIG1-enemy-arcade-vs-ours.png` — arcade above, `enemy-grey-head` cell 2 lower-left on its own
stage-1 sky, `enemy-camo-head` cell 2 lower-right on stage-2 sky. Crop it and look; the finding
does not need the numbers.

**Operator**: `L = 0.299R + 0.587G + 0.114B` over opaque pixels of the authored sheet (alpha is
ground truth — no mask discretion), against the flat sky the sprite actually flies on.
Population = all 5 cells of the sheet.

| sheet | sky it flies on | mean L | sky L | ΔL | **frac L<80** | frac L>200 |
|---|---|---|---|---|---|---|
| `enemy-grey-head` | stage 1 `#009fff` | 189.8 | 122.4 | **+67.4** | **5.7 %** | 42.5 % |
| `enemy-grey-rear` | stage 1 `#009fff` | 171.1 | 122.4 | +48.7 | 13.3 % | 41.3 % |
| `enemy-interceptor-head` | stage 1 `#009fff` | 95.4 | 122.4 | −27.0 | 56.3 % | 10.3 % |
| `enemy-camo-head` | stage 2 orange | 44.6 | 136.3 | −91.7 | 89.7 % | 0.8 % |

And the arcade stage-1 grey enemy, measured the same way on
`reference/stage1-missile-salvo-t100.75.png` — **resampled 1028×720, so this is a reading of
STRUCTURE and DIRECTION, not of colour; I make no palette claim from it**, and a large object's
dark-pixel *fraction* is the sort of thing resampling blurs but cannot invert:

| arcade enemy | obj px | mean L | sky L | ΔL | **frac L<80** | frac L>200 |
|---|---|---|---|---|---|---|
| upper-right | 2 850 | 123.0 | 122.0 | +0.9 | **33.5 %** | 20.6 % |
| lower-left | 6 954 | 150.0 | 164.5 | −14.4 | **24.5 %** | 41.0 % |

**R6 was right that stage-1 enemies are pale and I am not asking to reverse that.** The arcade's
stage-1 enemy sits at roughly the sky's own luminance — it is neither a dark cut-out nor a white
blob. **What makes it read is that a quarter to a third of it is genuinely dark**: black nozzle
rings, black trailing edges, a shadowed underside. We kept the bright half of that drawing and
threw the dark half away. 5.7 % against 24-34 %, and our 5.7 % is almost entirely the one black
ring around the nose donut.

That is why they "look very bad". It is not hue. It is that **the sprite has no black in it**, so
it has no silhouette, no edge, and no weight, and at 1× it dissolves into a pale smear with a red
dot — see `ours-enemy-near-6x.png` and the top-left tile of `play-montage.png`.

### What a pixel artist does about it

1. **Put a dark value back in the palette.** The sheet currently runs `0 / 230,16,0 / 148 / 173 /
   197 / 230 / 247,239,164 / 255` — i.e. **one black, then a 148-255 cluster**. Replace two of the
   four near-identical light greys (148/173/197/230 are doing almost no work: 173 and 230 alone are
   63 % of the sprite) with **two dark steps around L 40-70**, ladder-legal, e.g. `(49,49,66)` and
   `(82,82,99)` — cool rather than neutral so they read as shadow, not as dirt.
2. **Spend them as a keyline and a shadow side, not as a fill.** One pixel of the darkest value
   along the whole underside and trailing edge of every blade; the second dark value as the
   underside plane of the wing. That alone takes `frac L<80` from 5.7 % to the mid-20s without
   touching the silhouette.
3. **A keyline is a run of identical pixels, so it RAISES adjacency identity.** Criterion B
   headroom is there: the sheet is at **59.9 %** against a ≥50 % floor (`enemy-camo-head` 60.7 %,
   `enemy-interceptor-head` 60.1 %, `player-f14` 56.1 %). Criterion A is not close to binding
   either — 8 colours, 7/8/7 distinct values per channel against caps of 256 and 32.
4. **Give the nozzles/intakes black rings on the head-on aspect too.** The rear sheet has one; the
   head-on sheet's only black is the nose donut.

---

## 3. FINDING 2 — the head-on silhouette is a bird, and five specific things make it one

`enemy-grey-head-8x.png` and `enemy-camo-head-8x.png` against `A-arc-headon-NATIVE-12x.png` and
`arc-enemy-mid-4x.png`. The value fix in §2 will not save this silhouette; it needs redrawing.

| | arcade | ours | what to change |
|---|---|---|---|
| **1. Blade separation** | 4 blades per side, **sky between them** | one continuous filled sheet, root to tip | split the wing from the tailplane with 1-2 px of alpha; the tailplane is currently a mush of isolated mid-grey pixels below the wing root that reads as noise |
| **2. The vertical mast** | nose is a compact mass **at wing level, at the front**; the fin is a separate angled blade **behind** it | the red donut sits **on top of a tall bright white mast** | the red/black/cream nose belongs on the fuselage centreline **at the wing line**; it currently reads as a stork's head on a neck and it is the single strongest wrong cue |
| **3. Fin value** | fin is **desaturated and lower-contrast than the wings** | fin is the **lightest** thing in the sprite, so the eye goes to it | drop the fin a step or two below the wing highlight; let it recede |
| **4. Wing shape** | dead-straight or faintly anhedral; **thickest at the root, 1 px point at the tip** | **drooping gull tips**, thickest mid-span, **blunt square tips** | straighten the wing line, move the mass inboard, taper to a point |
| **5. Highlight width** | **1 px line along one edge** of each blade | broad fills, plus isolated single-pixel speckle inside the wing | one lit edge per blade, light from a single consistent direction; delete the interior speckle (it reads as JPEG dirt, not form) |

`enemy-interceptor-head` (R9's redraw) already has (5) partly right — the tan one-sided edge is the
correct instinct and it is why that sheet looks better than the other three. It has none of (1)-(4).
Its brown/tan palette is also not a livery I can find in the arcade; the R6 note citing
"red/orange-fuselage interceptors" at t102.5 is about a **red fuselage**, not a mud-brown airframe.

**And note what §0 of the TL's brief established and I re-verified by md5 of the alpha plane: there
are only FOUR drawings in the whole fleet.** All eight day sheets collapse to four silhouettes
(head `8f36c102826f` ×2 and `c79c29b5530a` ×2; rear `7a14755bbf62` ×2 and `33d97e5b9165` ×2), and
the night sheets re-use the day alphas exactly. **`prop` and `interceptor` are the same drawing.** A
propeller type with an interceptor's silhouette is simply wrong, and no palette swap fixes it.

---

## 4. FINDING 3 — the five "bank poses" are a horizontal squash, not a roll

This was not on anyone's list and I think it matters more than the palette.

| cell | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| span (px) | 48 | 55 | **62** | 55 | 48 |
| **height (px)** | **27** | **27** | **27** | **27** | **27** |
| ink | 454 | 498 | 543 | 501 | 459 |

Identical for `enemy-grey-rear`. The bbox height is **pinned at 27 in all five poses**, the span
is a symmetric 48/55/62/55/48, and cells 0 and 4 are mirror twins.

**A bank rotates the wing line**: one tip rises, the other drops, the bounding box gets *taller*,
the fin tilts, and bilateral symmetry about the vertical breaks. None of that happens here. What
these five cells encode is *yaw* — the aircraft turning away from you — not *roll*. Every arcade
enemy I looked at in `hunt-contact-a.png` / `hunt-contact-b.png` (304 frames across stages 1-2) is
drawn at a visible roll angle; the acquisition frame's enemy is an X tilted off-axis.

So R8's fix (wiring `bankDeg` through `textureFor`, `enemy.js:87`) connected the right parameter to
**poses that do not contain a bank.** The art owes it five poses that actually rotate: at minimum
±25° and ±50° with the bbox height growing to ~34 and ~40 px and the fin leaning with the wing.

---

## 5. FINDING 4 — the rear enemy is a seagull with a pumpkin

`enemy-grey-rear-8x.png` against `arc-s1-enemy-rear-5x.png`.

Ours: wings swept **upward** in a shallow dihedral V from a narrow body, with **one large round
orange ball** (black ring, orange, yellow core, ~9 px) hung **below** the wing root. At the sizes
it renders (right-hand side of `ours-player-in-situ-8x.png`) it is a gull.

Arcade: a **dart**. Long thin swept blades angled *down*-and-back from a compact fuselage, a dark
charcoal mass around the nozzle, and the nozzle itself is a black housing with an amber disc sitting
**in line with the wing root**, not under it. The single big nozzle is *not* wrong — the arcade
shows one dominant nozzle in three-quarter view — but it must be **on** the body, and the body must
exist around it.

Fix: move the nozzle up onto the wing line, give it a dark fuselage to sit in, reverse the dihedral
to a slight anhedral, and lengthen/thin the blades.

---

## 6. FINDING 5 — the explosion: the TL's reading holds, with one correction

**Instrument**: per-panel pixel classification on
`tools/out/envelope-r10/MOTION-explosion-arcade-vs-ours.png`, panels located from the montage's own
dark label bands (rows 18-186 arcade, 208-376 ours; 15 panels of 208 px). Classes: `hot-white`
`R>200 ∧ G>190 ∧ B>140 ∧ ¬sky`; `deep-red` `R>100 ∧ G<0.55R ∧ B<0.45R`; `peach`
`R>180 ∧ G∈(130,R−20) ∧ B∈(100,G)`. Population = every pixel of each panel.

### Claim A — "ours is near-clear sky where the arcade has a large peach smoke mass": **HOLDS, for +217 to +433 ms.**

| panel | +217 | +267 | +333 | +433 | +533 | +667 | +833 |
|---|---|---|---|---|---|---|---|
| **arcade peach %** | 0.5 | 8.4 | **18.7** | **35.6** | 5.6 | 4.9 | 0.0 |
| **ours peach %** | 0.0 | 0.1 | 1.4 | 1.4 | 1.6 | 0.5 | 1.4 |

A ~25× deficit at the peak. `expl-arcade-late-2x.png` — crop it; the mass is unmistakably a warm
tan/salmon **column**, mottled, rising, and it is not a cloud.

**The correction**: **+533 ms onward is cloud, not smoke.** Arcade `hot-white` runs 45.3 → 78.1 →
99.9 % across those three panels and the panels go solid white — the camera has flown into a stage-1
cumulus. The third panel of `expl-arcade-late-2x.png` shows the peach column on the left and the
cloud arriving from the right; the fourth is all cloud. So the honest window for the claim is
**+217 to +433 ms**, and the "to +533" part of the reading should be dropped. The claim survives
easily on the narrower window.

### Claim B — "our fireball core reads deep red where the arcade's is white-hot yellow-white": **HOLDS, and it is in the authored canvas.**

Montage, first 67 ms — hot-white : deep-red —

- arcade **11.7 : 2.6 = 4.5 : 1**
- ours **2.7 : 3.8 = 0.7 : 1**

Inverted by ~6×. And this is not an in-situ artefact; **the authored sheet says the same thing in
isolation**, which is the stronger evidence:

`src/assets/sprites/explosion.png`, opaque pixels, 7 colours:

| rgb | L | share |
|---|---|---|
| `(0,0,0)` | 0.0 | 1.5 % |
| `(49,16,0)` | 24.0 | **27.0 %** |
| `(156,0,0)` | 46.6 | **20.9 %** |
| `(214,0,16)` | 65.8 | **26.0 %** |
| `(247,123,0)` | 146.1 | 9.5 % |
| `(247,214,25)` | 202.3 | 8.3 % |
| `(255,255,247)` | 254.1 | **6.7 %** |

**75.4 % of the fireball is at L ≤ 66** — maroon, blood-red and near-black. The white-hot core is
6.7 % and the yellow 8.3 %. `explosion-big.png` is the same distribution. Look at
`expl-arcade-early-2x.png` against `expl-ours-early-2x.png`: the arcade fireball is a **yellow-white
core bleeding out through amber to a thin orange rim**, soft-lobed and ragged; ours is a **cluster of
hard-rimmed red bubbles** that reads as grapes or popcorn.

Fix, in order: (a) invert the area budget — the white/yellow pair should be ~30-40 % of the sprite
and the maroon band ~15 %, not the reverse; (b) the `(49,16,0)` near-black at 27 % is the single
biggest offender and has no counterpart in the arcade's early frames; (c) soften the lobe edges —
the arcade's boundary between yellow and orange is ragged and 1 px, ours is a clean circle.

### A colour-valid datum that bears on the smoke work

`smoke.js:267-300` derives `KILL_SMOKE_PALETTE` honestly and states its own limitation (AV1
1028×720). I checked it as far as I could and **it survives the obvious attack**: the kill it
measured is over open sea against `#009fff`, and a blue background cannot manufacture a peach bias
by resampling. I am not contesting it.

But the one **true-native** warm-mass reading available disagrees in a way worth recording. The
three pale masses in `reference/ab2-arcade-desert.png` (box x190-290, y80-150, L>150) are:

`(247,247,230)` 43.3 %, `(247,247,181)` 32.0 %, `(230,230,164)` 15.4 %, `(214,214,148)` 5.8 %,
`(197,197,132)` 3.2 % — mean `(240.7, 240.7, 196.0)`.

**R = G exactly in every one.** That is a **cream/ivory** — a yellow-shifted neutral — not a peach
(`(236,188,162)` has R−G = +48). Those masses are **clouds**, not kill residue
(`arc-desert-smoke-8x.png` — they are round popcorn clumps), so this is not a refutation. It is a
caution: the arcade's warm whites in a colour-valid frame are `R=G, B down`, and if the kill smoke
ships at R−G = +48 it will not sit in the same family as everything else on screen. Worth one
cross-check before the peach is treated as settled.

Related and cheap: **our clouds are cool.** Native frame `play/frame-0007.png`, sky band L>170:
`(247,247,247)` 38.0 %, `(230,230,247)` 28.3 %, `(214,214,230)` 12.3 % — **R−B = 0 or −17**, i.e.
neutral-to-blue. The arcade's stage-2 clouds are **R−B = +17 to +66**. I have no colour-valid
stage-1 arcade cloud, so I am not calling this a defect on stage 1 — but on stage 2 it is one, and
it is a one-line palette change.

---

## 7. FINDING 6 — the player jet

`FIG3-player-arcade-vs-ours.png` (arcade night, **true native**, above; our level cell below),
`ours-player-in-situ-8x.png`, `arc-playerjet-3x.png`, `arc-player-level-7x.png`.

The player is in much better shape than the enemies — the maroon keyline, the black-ringed amber
nozzles and the canted twin fins are all right. Four things are wrong, in order:

1. **The wings are a bar, not a wing.** Constant thickness root to tip, dead horizontal, and the
   outboard third is a **brighter white rectangle joined across a hard vertical seam**. It reads as
   a block glued on, and because it is the brightest value in the sprite it pulls the eye to the
   wingtips — exactly backwards. The arcade wing (`arc-player-level-7x.png`) is **thick at the
   glove and tapers to a knife point**, with the trailing edge stepping down, and its tip is the
   *palest* but also the *thinnest* thing, so it reads as a highlight rather than a mass. Fix:
   taper the chord, delete the seam, move the brightest value onto a 1 px leading edge.
2. **The composition reads as a face.** Two round orange eyes, a dark-red horizontal dash for a
   mouth, two fins for ears, on a wide pale oval. Once seen it cannot be unseen, and it is the
   reason the level pose looks wrong even though its parts are right. The cheapest fix is to break
   the symmetry of the middle: the arcade runs **maroon panel lines fore-and-aft down the fuselage
   spine** (`arc-playerjet-3x.png`) — we have maroon only on the outer contour and one dash. Add
   the spine lines and the "mouth" stops being the only horizontal mark in the middle.
3. **There is no canopy.** Ours is a 4 × 1 lilac dash — one pixel of pink at 1×. The arcade's is an
   unmissable **violet/magenta blob with a dark rim**, in both the day closeup and the true-native
   night frame. On an aircraft this pale, the canopy is the only chance for a cool accent and it is
   being wasted.
4. **The body is cream, the arcade's is white (day) / pale blue-grey (night).** Our day body sits
   around `(222,220,180)`; it reads yellowish next to the arcade's near-white, and it is why the
   jet looks slightly dirty.

One thing the arcade does that we do not, and it is worth a decision rather than a fix: the arcade
player is drawn with a **three-plane value structure** — lit top, mid side, dark underside — visible
even in the level pose. Ours is effectively two planes.

---

## 8. Secondary, not aircraft, noted and not pursued

- **The sea is television static.** `play-montage.png`, lower band of every tile: a dense
  per-pixel blue/cyan speckle. The arcade stage-1 sea (`stage1-missile-salvo-t100.75.png`) is
  *coarse* — long horizontal dashes in bands, with large flat areas between them. Ours has the
  right colours and roughly 4× too fine a grain. Different lane, but it is the second thing the eye
  lands on after the aircraft.
- **Our stage-1 sky is one flat blue with a hard band at the horizon.** The arcade's has a pale
  gradient into the horizon. Visible in the same montage.

---

## 9. RANKED BY "WOULD A PLAYER MISTAKE THIS FOR AB2?"

| # | finding | § | cost |
|---|---|---|---|
| 1 | `enemy-grey-head`/`-rear` have no dark value — 5.7 % below L=80 against the arcade's 25-34 % | §2 | **palette edit + a keyline pass.** Cheapest large win in the round. Criterion A and B both have headroom. |
| 2 | The head-on silhouette is a bird: joined blades, red nose on a mast, bright vertical fin, drooping blunt wings | §3 | redraw, 1 sheet → 4 liveries |
| 3 | The five bank poses are a width squash; the enemy never visually rolls | §4 | redraw 4 of 5 cells, both aspects |
| 4 | Explosion is 75 % maroon by area with a 6.7 % core; arcade is white-hot | §6B | palette rebalance on 2 sheets |
| 5 | Post-kill smoke mass is ~25× too small at +333/+433 ms | §6A | tuning, already scoped by the R10 lane |
| 6 | The rear enemy is a dihedral gull with the nozzle slung beneath it | §5 | redraw |
| 7 | Player wing is a constant-thickness bar with a seamed outboard block | §7.1 | local redraw |
| 8 | Player reads as a face; no canopy | §7.2-3 | small edits, high return |
| 9 | `prop` and `interceptor` are the same drawing; so are `grey` and `camo` | §3 | one new silhouette buys two liveries |

---

## 10. Limits of this critique — stated so nobody over-reads it

- **I propose no new gate and no new quality statistic.** Everything above is either a *descriptive*
  measurement with its population and operator stated, or an eye judgement against a named crop.
  The one thing I would promote into REFERENCE.md is the **reference column** in §1, not a number
  derived from it.
- **The §2 arcade stage-1 figures come from a resampled 1028×720 frame.** I report them as
  structure and direction only. The stage-2 figures in §1.2 are from a true-native frame and are
  colour-valid. I did not mix the two.
- **I did not re-derive the "69.2 % of enemy screen pixels" figure.** I verified the thing it
  implies: `grey` is the `line`, `heavy` *and* `overtake` livery for stage 1 and stage 3
  (`src/entities/enemy.js:52-64`), so it is by a wide margin the most-seen sheet.
- **I checked no motion claim.** Everything here is pose, value, colour and composition. The
  "bank is a squash" finding in §4 is read off the authored sheet's geometry, not off frame timing.
- **My first automated search for a head-on enemy returned seven frames at symmetry 1.00 — and they
  were the HUD lock bracket**, which this repo's own notes warn has been counted as an enemy
  before. I abandoned the scorer and found the acquisition by building contact sheets and looking
  (`hunt-contact-a.png`, `hunt-contact-b.png`, 304 frames, t = 88-164 s). Recording it because the
  clean, plausible, stable number was wrong again.

# R7 Art Direction Critique — *does this look like a 1987 Sega arcade game?*

**Role:** arcade pixel-art director. Fresh context. **Report only; no code was changed.**
**Build:** `main` @ **`82365e99fcda921ed34ce2fd56ea1aab3dd7f7ab`**, `git status --short` empty at
capture time. `src/` at this SHA is **byte-identical to `5913af6`** (the "R7 FINAL TREE" STATUS.md
tells you to quote) — the two intervening commits touch only `tools/` and `judging/`, verified by
`git diff --stat 5913af6..82365e9 -- src/` returning nothing. The only files I added are this
report and `judging/R7/art-r7-*.png`.
**Captures:** all mine, `tools/out/art-critic-r7/`, 487 frames. Instruments in
`tools/out/art-critic-r7/{inst.py,mottle.py,audit.py}`.

**Method.** Every "ours" figure is decimated from the captured 960×672 to true native
**320×224**, judged at that resolution first, then zoomed nearest-neighbour. Every arcade figure
gets the same treatment. Every stage claim had its **HUD stage digit read out of the frame
itself** (`art-r7-stagedigits-8x.png`) before the frame was used.

---

## 0. Instrument validation, before any number below was trusted

| control | result |
|---|---|
| Capture is a pure 3× nearest upscale | worst within-3×3-block channel spread **0** over all 487 frames → decimation is lossless, not an approximation |
| Decimation correctness | `decimate(nearest3x(base)) == base` exactly on a random control; a **bilinear** 3× control returns spread **140**, so the test can fail |
| Colour-cardinality operator | returns exactly **3** on a 3-colour synthetic; channel-union returns **2** |
| **Ladder-membership operator** | both true-native arcade stills return **0 off-ladder channel values** against REFERENCE.md's enumerated table, and reproduce its published figures exactly: desert **138 colours / 31 union / 29 per-channel**, night **79 / 17 / 17**. The instrument agrees with the hardware on the hardware's own output |
| **MOTTLE operator** (§3.1, new) | on two synthetics with the **identical 7-colour palette and identical mask**: concentric rings **T=0.145, 7 components**; pixel dither **T=0.859, 1288 components**. It discriminates by a factor of 6, and it is not a palette or a mask artifact |
| Black / duplicate sweep | **0 black frames** in 487. The only duplicate group is `title`: **6 byte-identical frames over 100 ticks** — the title is still static (§3.6) |

### Three results I measured, cropped, and threw away

Every one of these was a clean, plausible, stable number. All three would have been published as
findings if I had not cropped them.

1. **"The fireball is punched through with 307–407 pixels of sky."** A row-span interior-fill
   operator said so on four frames. **Cropped and looked** (`art-r7-expl-ours-6x.png`): they are
   the **gaps between the eleven radiating spikes**, which the arcade's starburst also has. There
   are **no sky holes in the fireball.** R6's defect (b) is closed and I nearly re-reported it.
2. **A size-matched mottle control built on a warm-and-bright mask.** It returned nine beautiful
   641–871 px "explosions" at T=0.25–0.28. **Cropped and looked**
   (`art-r7-ctl-warmcomp-6x.png`): every one of them is **the player jet** — cream airframe plus
   `#840000` edge plus orange nozzles passes a warm mask as one component. Redone with an
   explicit EXPLOSION_PALETTE mask (§3.1).
3. **"A 645 px fire component at T=0.000 — the decay ends as one flat slab."** **Cropped and
   looked** (`art-r7-fire-play-0029-5x.png`): the explosion and a cloud bank share `#e6e6e6` and
   `#f7f7e6`, so they merge into one connected component. It was a cloud. Discarded.

### Two claims I formed from a zoom and then withdrew

4. **Withdrawn: "stage 3's city lights are far denser and streakier than the arcade's."** Formed
   from a 3× full-frame view. Measured on the far field (rows 150–186) it is the **opposite** —
   ours 8.7 % bright at mean blob 1.6 px against the arcade's 13.1 % at 3.4 px. The real effect is
   real but is a **near-field-only** effect and needed a two-band measurement to state correctly
   (§3.3). This is exactly the failure the brief warned about, and I committed it.
5. **Withdrawn: "the enemy sprites kept the black keyline the player jet lost."** Formed from a 5×
   crop. Measured, the enemy **rim** is **0.3–2.8 % near-black** — there is no keyline. The black I
   saw is **interior** (2.8–34.5 % of the body), i.e. the drawing's own shading. The real enemy
   defect is a different one (§3.5).

---

## 1. Blunt assessment

**The fire now looks like 1987. Three things that are not the fire do not — and two of them are
not in any lane's `?combat*` isolation harness, which is why nobody has seen them.**

Your predecessor's sentence is **retired on its subject, and the mechanism has moved again — this
time across a file-ownership boundary.**

The explosion rebuild is a complete success and it is verifiable in the strongest possible way:
across **150 consecutive ticks** of `?combatexpl=1`, the explosion introduces **exactly its seven
authored palette colours plus `#e6e6e6`, and not one other colour**. Zero alpha-blend
intermediates. Zero off-palette lavender or pale green. The decay is a palette sequence —
8 → 4 → 3 new colours as the fire goes out. R6's three defects (continuous tone, sky holes, alpha
dissolve) are **all three closed, and I tried hard to re-find each one.**

And yet. A per-object census over 422 frames:

| object group | n | colours | **chan values (union)** | off-ladder | gate ≤256 / ≤32 |
|---|---|---|---|---|---|
| sky + sea + clouds + HUD | 4 | 38–43 | **16** | 1 | pass |
| stage 1 cruise + player jet | 18 | 47–52 | **19** | 1 | pass |
| stage 1 ordinary play, combat on | 54 | 52–70 | **25–30** | 1 | pass |
| enemies / shots / vulcan / missiles / locks | 38 | 53–64 | **25–30** | 1 | pass |
| **explosions, 150 consecutive ticks** | 150 | 50–60 | **19–21** | 1 | **pass** |
| scripted combat demo | 30 | 52–79 | 25–31 | 1 | pass |
| stages 2 + 3, digit-verified | 18 | 42–82 | 19–29 | 0–1 | pass |
| **DEATH / tumbling hulk** | 40 | 51–72 | **25–47** | **1–19** | **FAIL** |
| **`?combatonly=enemies,shots` @113** | 5 | 61–72 | **26–47** | **1–19** | **FAIL — same object as the row above** (§3.4) |
| **CARRIER launch** | 64 | 47–59 | **19–31** | **1–13** | pass, on the edge |
| **TITLE** | 6 | 26 | **53** | **44** | **FAIL** |

The single ubiquitous off-ladder value is **159**, and it is the stage-1 sky `#009fff`. The
arcade's own measured stage-1 sky is `#009eff` — **158, equally off the ladder**. That is not a
defect and nobody should "fix" it.

**So the class has three remaining members, not one.** My predecessor found the explosion. The R7
judge found a fourth arm over the gate and attributed it to an enemy airframe — **I reproduce its
number exactly and its diagnosis is wrong; it is the same death hulk, and that collapses its
finding and mine into one root cause.** See §3.4. **Neither sweep could reach the carrier or the
title**, because `?demo=1` and `?showtitle=1` are not in the isolation grid anybody runs.

And beneath all of that there is a **second, sharper defect that no cardinality gate can ever
see**, which is where I would put the round's attention:

> **Three objects now have a perfectly quantized palette and a continuous-tone *drawing*.**
> Stage 2's far ground is an airbrushed brown blur made of 11 on-ladder colours. The fireball is
> five smooth concentric discs made of 7 on-ladder colours. Stage 3's near lights are
> perspective-stretched streaks made of 6 on-ladder colours. **Every one passes Criterion A with
> room to spare. All three lose the picture.**

---

## 2. Where the build has genuinely arrived

Stated without hedging. Several of these are large and two overturn my predecessor.

| | measured | state |
|---|---|---|
| **Explosion medium** | 150 consecutive ticks: introduces **exactly 7 palette colours + `#e6e6e6`, 0 off-palette**. Whole frame 50–60 colours / **19–21 chan values** (R6 measured the body patch alone at **215 / 200**) | **R6 rank 1 is dead.** Not gamed — I checked every frame of the life, not a representative one |
| **Explosion decay** | new-colour count falls **8 → 4 → 3** over the last quarter of life | A palette sequence, exactly as asked. **The alpha dissolve is gone** |
| **Sky holes in the fireball** | **zero** | Closed (and see §0.1 — I nearly mis-reported this) |
| **Player jet keyline** | rim **100 % bare sky, 0.0 % near-black**, against R6's measured **97.3 % pure `#000000`** | **R6 rank 2's headline is closed completely.** The biggest single-sprite improvement in the build |
| **Jet `#840000` budget** | ours **4.1 %** of the jet crop; the arcade's own daylight jet **3.6 %** | The *quantity* of the new shadow colour is right |
| **Stage-2 sky glow** | ramp `#e67300 → #e68400 → #efa400 → #efad00 → #efbd00 → #f7c500 → #f7ce00 → #f7d600`, **all on the enumerated ladder**, whole frame **22 chan values, 0 off-ladder**, and the steps are **dithered, not banded** (`art-r7-stage2-horizon-4x.png`) | **R6 rank 3's gate half is closed, and closed the right way.** R6's "33 values, 14 off-ladder" is gone |
| **Stage-2 near ground granularity** | T **0.344–0.361** against the arcade desert's **0.354** | **Exact.** See §3.2 for why this makes the far band worse, not better |
| **Stage-3 night ground** | flat black + single-pixel white/cyan/yellow/red lights. Far band 8.7 % bright at 1.6 px mean blob against the arcade's 13.1 % / 3.4 px; palette family matches | **The rebuild landed.** At native the two bands are hard to tell apart (`art-r7-night-ground-3x.png`) |
| **Criterion A in ordinary play** | 54 digit-verified stage-1 combat frames: **52–70 colours, 25–30 chan values, 0 over either gate** | Independently reproduces the TL's and the criteria lane's figure |
| **Enemy / shot / weapon arms** | 38 frames across five `?combatonly` arms: **25–30 chan values** | The fx lane's palette-snap holds on every arm I sampled |
| **Carrier framing (shot type)** | ours is a whole-ship view; `reference/carrier-prelaunch-t84.png` is a whole-ship view | **The module header is right and the premise in the ask is wrong** — see §4.5 |

---

## 3. Ranked — what most damages the illusion

### 1. The fireball is quantized but it is still *drawn* as concentric rings, and the arcade's is mottled
→ `art-r7-fire-pair-1x.png` / `-3x.png` (ours left, arcade right, **both true native**),
`art-r7-expl-ours-6x.png`, `art-r7-expl-arcade-6x.png`

This is the one the fx lane could not have found from its own gates, because **it passes all of
them**. The medium is fixed; the drawing is not.

**MOTTLE, validated in §0 and run with the same operator on both sides at true native:**

| subject | px | colours | **T** | mean colour-patch |
|---|---|---|---|---|
| **arcade night native fireball** | 661 | 16 | **0.678** | **3.0 px** |
| ours, `?combatexpl=1`, six frames across the life | 2 286–3 058 | 11 | **0.299–0.336** | 12.8–17.9 px |
| ours, in play (`demo2`, EXPLOSION_PALETTE mask) | 433–1 139 | 8 | **0.300–0.465** | 7.3–17.3 px |
| *control: arcade desert ground, same operator* | 61 056 | 100 | *0.219* | *8.4 px* |

The arcade's fire is **2.2× more finely interleaved**, and its colour patches are **5–6× smaller**.
The desert-ground control returns **0.219 — lower than ours** — so the operator is not simply
biased toward arcade frames.

**Size is not the explanation.** At 433–1 139 px, bracketing the arcade's own 661 px, ours still
reads 0.30–0.47. If anything the gap widens.

**What it looks like.** Ours is five near-identical golden discs in a quincunx around a white
centre, each with its own clean concentric yellow→orange→red banding, inside a thin ragged rim.
At native it reads as **a clover, or a bunch of balloons**. The arcade's is one irregular
swept mass with red, orange and yellow dithered through each other at the pixel, trailing grey
smoke off one side. Shape confirms it: ours is **73×78, aspect 0.94**; the arcade's is **50×30,
aspect 1.67** and asymmetric.

**Fix.** The palette, the hard alpha and the decay sequence are all correct and should not be
touched. Change the *lobe drawing* in `ARRANGEMENTS`/`drawBurst`: (i) break each lobe's
concentric band into a 1–2 px dither against its neighbour rather than a clean edge — the single
highest-value change, and it is what moves T; (ii) vary lobe radii much more (ours are
0.16–0.31 w, nearly uniform in effect) and stop placing them on a symmetric cross;
(iii) make the overall mass **wider than tall and swept**, not round; (iv) attach the smoke mass
to the fireball's trailing side while it burns, not only after.

### 2. Stage 2's far ground is airbrushed — and our own stage-1 sea proves the engine can do better
→ `art-r7-stage2-blotch-6x.png`, `art-r7-stage2-groundstrip-2x.png` (six digit-verified stage-2
frames, then the arcade desert)

Same operator, same resolution, with **two controls that run in opposite directions**:

| band | **arcade desert** | **ours, stage 2** (4 times) | **ours, stage 1 sea** |
|---|---|---|---|
| far ground, rows 148–166 | **T = 0.339** | **T = 0.155–0.182** | **T = 0.324** |
| near ground, rows 166–196 | T = 0.354 | T = 0.344–0.361 | T = 0.309 |

**Our stage-2 near ground is dead on the arcade. Our stage-2 far ground is half of it — and our
own stage-1 sea holds 0.324 in that same band.** So this is not a depth artifact, not an
instrument artifact, and not a limit of the renderer. The world lane solved this in stage 1 and
did not carry it to stage 2.

Crop it and it is obvious (`art-r7-stage2-blotch-6x.png`): the far desert is a **soft, gradient,
photographic brown blur** with no dither, no stipple and no hard edge anywhere — made of 11
colours, every one on the ladder. It is the exact thing the project means by "satisfied a
statistic and lost the picture."

R6's related finding also **stands unchanged**: ground band rows 150–198 is **ours 21 colours
against the arcade's 47**. We are still under-textured, and it is all in the far half.

**Fix.** Carry the sea's near/far texture treatment into `ground.js`'s stage-2 path. The target is
published and reachable: T ≈ 0.34 in rows 148–166, which our own sea already hits.

### 3. Stage 2's "racetrack" is still a road — but it has stopped being axial, so R6's framing needs correcting
→ `art-r7-stage2-groundstrip-2x.png`

**Answering question 4 directly: no, the racetrack is not gone.** In all six digit-verified
stage-2 frames there is a single **hard-edged pale strip of uniform fill, constant perspective
width, running to the vanishing point**, flanked by dark blotches. It reads as a runway.

**But R6's specific charge is now wrong and should be retired**: it called it "symmetric about the
flight axis, down the exact centre of the screen." Across my six frames it sits right, right of
centre, centre, left of centre, left, left — it is a **world feature scrolling laterally**, not a
screen-locked artifact. That is a real improvement and R6's sentence would send a lane after the
wrong thing.

The arcade's desert on its own true-native frame is **not a floor plane at all**: a diagonal mass
of chunky grey rock outcrops with green vegetation and rounded highlighted boulders, a hard
boundary against open gold, no horizon line and no axial feature. **It has objects. We have
layers.**

**Fix.** Discrete scattered terrain objects (rock clusters, scrub) with hard outlines and internal
shading, at a few sizes with depth sorting, in place of the strip. Deleting the strip alone leaves
an empty plain; it needs to be replaced, not removed.

### 4. The death hulk is the last `material.color` multiply in the build — and it is also the R7 judge's "enemy airframe"
→ `art-r7-death-t272-3x.png`, `art-r7-enshots-offladder-6x.png`

**This is the sharpest statement of the pattern you asked me to test, because it crossed a file
boundary — and because it has been seen twice already under the wrong name.**

| | measured |
|---|---|
| death frames t248–t320 | **47 channel values** (gate ≤32), **19 off-ladder**, 64–72 colours |
| the off-ladder pixels | **340 px, rows 105–156, cols 147–175** — the tumbling hulk and nothing else |
| its colours | `#c4614a #640000 #bd5736 #7d2e25 #b72700 #a45030 #9e432d #c45000` — a smooth continuous-tone brown ramp |

**A correction to `judging/R7/report.md` claim 1b.** The judge reports `?combatonly=enemies,shots`
still over the gate at **47 channel values** on `frame-0003`, and diagnoses it as "**a single
near-field enemy airframe**, 28 distinct colours in its own box… flat pixel art, but its palette is
not on the shared ladder."

I re-ran that arm (5 frames × spacing 113) and **reproduce 47 exactly, on the same frame index.**
The number is right. The attribution is not:

- its 19 off-ladder values are **byte-identical to the death hulk's** — same `set()`, checked
  programmatically, not eyeballed;
- the off-ladder pixels (761 px, sky excluded) sit at rows 108–146, cols 120–202;
- **cropped and looked** (`art-r7-enshots-offladder-6x.png`): it is the **tumbling burnt player
  jet**, banked, nozzles still lit, in `BURNT_TINT` brown. It is not an enemy.

The mechanism is obvious once seen: that arm enables enemy `shots` and **no vulcan**, so the player
is not defending and **gets shot down**. The hulk enters frame. Two independent "new" defects —
the judge's and mine — are **one line of code with two symptoms**, and the remedy the
misdiagnosis implies (re-palette the enemy sheet) would have fixed neither.

It also undercuts the inference the judge draws from it — *"part of why Criterion A passes in play
is that the gun deletes enemies before they reach the size at which they break it… a gate passing
because of a gameplay defect is not a gate that has been met."* That may be true for other reasons,
but **this frame is not evidence for it**: the arm fails because the player dies in it, not because
an enemy grew large.

Mechanism, from source, one line:

```
src/game/flow/deathSequence.js:158    s.material.color.setRGB(...BURNT_TINT);   // [0.55, 0.12, 0.08]
```

**Multiplying a quantized authored sheet by an arbitrary float triple cannot land on the ladder.**
It is the same class as the alpha dissolve the fx lane just killed, in a different operator.

And here is why it survived. I grepped the whole of `src/` for the mechanism rather than the
object:

```
material.color.set*  on an authored sheet :  deathSequence.js:158   ← the only live one
material.opacity = <ramp>                 :  none
```

Every other site in `effects/**` and `weapons/**` carries a comment beginning **"What was here:"**
— the fx lane removed them all. `game/flow/deathSequence.js` is the **Game-flow** lane's file. The
fx lane audited the files it owned and closed the class completely inside them. The flow lane was
working on climb and death-cycle *timing*. **Nobody owned the question, so the one object that
needed a palette fix in a flow-owned file kept the defect.**

**Fix.** Author a burnt variant of the player sheet (or a 7-entry index remap) and swap the map,
exactly as the explosion's decay now swaps palettes instead of ramping alpha. Delete
`BURNT_TINT`. This also removes the only remaining `setRGB`-without-colour-space call on the
render path, which is CLAUDE.md's named recurring bug.

### 5. Enemies: at distance they stop being aircraft, and they still arrive as a clump
→ `art-r7-s1-enemies-far-8x.png`, `art-r7-enemies-ours-5x.png`, `art-r7-stage3-ours-3x.png`

Three separate things, all visible in a normal play frame.

- **At distance the enemy sprite degenerates into a grey rectangle.** The crop shows six objects
  in the upper sky at 4–8 px: they are **featureless grey blocks with a light notch**. No wing,
  no dart, no silhouette. The arcade's distant enemies stay legible as dark cross shapes because
  it authors small cells; ours is one drawing minified, and minifying a spidery grey drawing
  gives a smudge. **They are also the wrong polarity** — mid-grey against a pale blue sky, where
  the arcade's read dark.
- **They pile up.** `art-r7-enemies-ours-5x.png`: three identical airframes **overlapping each
  other at the same scale**, and in the same frame three more sitting directly on top of the
  player jet, one of them across its canopy. On stage 3 it is worse — seven aircraft overlapping
  dead centre, plus one pink delta that belongs to no other family on screen. **R6's gap-11 clump
  is unfixed and is the most damaging single thing in a stage-3 frame.**
- **The enemy-fire telegraph is a 9×9 glyph rendered at 7 px.** `telegraph.js` authors a
  four-point star at 9×9 and sets `FLARE_PX_MIN = 7`. At 7 px, nearest-neighbour drops two of
  nine rows and columns and the 1-px star arms vanish: it renders as **a solid orange block**
  (`art-r7-s1-orangebox-8x.png`), which is what a player actually sees. The file's own header
  argues at length for an explicit pixel grid over `ctx.arc` to avoid exactly this kind of
  mush — and then loses the shape to a non-integer minification. **Author a 7×7 cell too, or
  clamp the flare to integer multiples of the authored size.**

### 6. Stage 3's lights stretch with depth; the arcade's do not
→ `art-r7-night-nearfield-3x.png` (arcade top, ours bottom)

Same operator both sides, HUD-free bands, **with a far-field control that runs the other way**:

| band | | arcade | ours (2 frames) |
|---|---|---|---|
| **near**, rows 186–199 | mean max-extent | **1.77 px** | **2.23–2.37 px** |
| | blobs ≥4 px long | **8.9 %** | **17.6–19.5 %** |
| **far**, rows 150–165 | mean max-extent | 2.11 px | 1.28 px |
| | blobs ≥4 px long | 3.8 % | 1.3 % |

**The arcade's lights are the same size at every depth** (2.11 → 1.77 px, i.e. flat) — a
fixed-size point sprite, which is what 1987 hardware would draw. **Ours grow 1.85× from far to
near** (1.28 → 2.37 px) because they are scaled by perspective, and in the near field that turns
them into aligned diagonal dashes. The consequence runs both ways: our far field is **too sparse**
(4.3 % bright vs 9.4 %) and our near field is **too streaky**.

**Fix.** Clamp the light quad to a fixed 1–2 native px at all depths and vary *count* with depth
instead of size. Second, and visible in the same crop: the arcade's lights **cluster into
districts** with dark gaps between; ours is a statistically even sprinkle. *Labelled as art
direction — I did not build an instrument for the clustering and will not quote a number for it.*

### 7. The carrier is the only ship-shaped object in the build and it reads as a barge
→ `art-r7-carrier-ours-4x.png`, `art-r7-launch-t55-3x.png`, `reference/carrier-prelaunch-t84.png`

**The framing is right and the ask's premise is wrong** — see §4.5. The art is the problem.

| | arcade `carrier-prelaunch-t84.png` | **ours** |
|---|---|---|
| silhouette | **60.9 %W × 27.1 %H, aspect 3.22** | **51.6 %W × 47.8 %H, aspect 1.54** |
| palette | — | **12 of its channel values are off the enumerated ladder** |

*(Caveat: the two masks are not identical — the arcade's grey-mass mask is a saturation threshold,
ours is its own declared palette. The 2× aspect gap is far larger than that discrepancy, but treat
3.22 vs 1.54 as approximate.)*

Concretely, in rank order:

1. **The hull meets the sea on a dead-straight horizontal edge with no waterline, no foam, no bow
   wave, no wake and no shadow on the water.** It is a black cut-out standing in front of the sea.
   The arcade's has a shaded underside *and* white foam along its length. **This one change would
   do more than all the others.**
2. **It is half as long as it should be for its height.** Aspect 1.54 against 3.22. A carrier from
   astern should recede a long way to a narrow bow; ours is nearly square.
3. **The island is three plain grey boxes and a cross mast.** The arcade's island is the most
   detailed object in its frame — tapered tower, radar dishes, antennae.
4. **The deck markings are the same ▲ glyph stamped eight times at one size regardless of depth.**
   They read as a texture fill. The arcade has a centreline and **parked aircraft**, which is what
   gives the deck its scale.
5. **The catapult steam is a cloud sprite** — the same lumpy cumulus silhouette and white/grey
   palette as the cloud banks, rising as a vertical column. Catapult steam is a low flat jet.
6. **Palette: 12 off-ladder channel values**, the second-largest off-ladder object in the build.
   The fix is free — every one of its six hexes is within **3/255** of a rung
   (`#c6c4e7→#c5c5e6`, `#b5b3c5→#b5b5c5`, `#9294b3→#9494b5`, `#505065→#525263`,
   `#201f26→#212129`, `#12121a→#101019`). The file's own comment already notes the palette carries
   video level expansion; snapping it is a one-line change that costs nothing visible.

### 8. The title screen is the most off-ladder surface in the build, and it is still static
→ `art-r7-title-ours-3x.png`

**26 colours, 53 channel values, 44 of them off the ladder.** Not one hex is on the ladder except
`#000000`: `#f5f2f6` (should be `#f7f7f7`), `#ff1600` (`#f70000`), `#0096fb` (`#0094f7`),
`#7285d8`, `#bcc6f4`, `#ffc4ff`. It fails Criterion A by 21 values. Snapping the whole screen is
mechanical and visually nil.

**R6's §6.10 is unactioned, and I confirm its measurement exactly on this build.** White lettering
**h 91 px at x 85–273**; sphere block **h 119 px at x 130–227** — identical to R6's figures. The
"II" matches the arcade to 2 px; the **lettering is 23 % short** and still needs to grow ~29 %.

**It is still 6 byte-identical frames over 100 ticks.** No animation, no attract cycle. Flagged in
R5, R6 and now R7.

**One thing outside art quality that I am flagging because the project set the rule itself.** The
title carries **"©SEGA 1987"**. `carrier.js` explicitly declines to paint "SEGA" on its deck,
citing CLAUDE.md's absolute assets rule, and substitutes an abstract marking. Two files, one rule,
opposite answers. That is a decision for the TL, not for me, but it should be made once.

### 9. The HUD reticle keyline is completely unactioned
→ `art-r7-reticle-ours-6x.png`, `art-r7-reticle-arcade-6x.png`

R6's rank 4, re-measured on this build and **identical**: the region holds 3 colours and zero
partial alpha (the quantization is still correct), **67 white px in 18 runs of 1, four of 4, and
one run of 33**, sitting inside **176 px of black keyline — 72.4 % of all the ink in the region.**
The arcade draws **85 white px in 57 single-pixel runs** straight onto the scene with a rim that
is 96 % bare sky. We draw a light instrument overlay with 2.6× more black than white in it.

Noting it only to record that it was not picked up; the fix is unchanged from R6.

### 10. Cloud interiors, labelled soft
Ours **7 colours, T = 0.340–0.377**; the arcade's two observations are **0.398** (night) and
**0.552** (stage-2, also 7 colours). Ours is below both, but n = 2 on the arcade side spanning
0.15, so I will **not** rank this as a defect — it is a drawing note. If the fireball's dither
treatment (§3.1) lands, apply the same hand here.

---

## 4. The five questions, answered

**1. The explosion — does it still read as *fire*?**

**Yes, and the rebuild is unambiguously a success — but it reads as the *wrong* fire.** The
quantization is complete and I verified it the hard way: 150 consecutive ticks, exactly 7 palette
colours plus one, zero intermediates, decay by palette sequence, zero sky holes. White-hot core,
yellow ring, orange body, ragged dark-red rim with spikes — all present and all correct colours.

What it is not is **mottled**. The arcade's fireball dithers red, orange and yellow through each
other at the pixel (T 0.678, 3.0 px patches); ours lays them down as clean concentric bands around
five near-identical discs (T 0.30, 18 px patches), round where the arcade's is swept. The medium
was the R6 defect and it is fixed; the **drawing** is the R7 defect, and no gate in the project can
see it. §3.1.

**2. The player jet — does the `#840000` read right at native, or does the red read as damage?**

**At native it reads right, and the change is the biggest sprite win in the build.** The rim went
from R6's **97.3 % pure black** to **100 % bare sky**. At 2× it reads as an object in the sky
rather than a sticker on it. The `#840000` quantity is right too — 4.1 % of our jet crop against
3.6 % of the arcade's own.

**But it is not a one-sided shadow edge, and the module's claim that it is does not hold.** Measured
per row: of the 31 rows carrying red, **0 have it only on the left, 0 only on the right, and 31 on
both** — and the pixel split is exactly **90 / 90**. It is a perfectly mirror-symmetric red
outline. The arcade's (`art-r7-jet-arcade-5x.png`) sits on the **lower and trailing edges only** —
one light direction, consistently applied. So the red does not read as damage, but it also does not
read as light; it reads as "outlined in dark red" rather than "lit from above."

**Fix:** keep the colour and the budget, drop it from the upper/leading edges and let those meet
the sky bare, as the arcade does. Secondary, visible in the same crop: the nacelles are now round
discs (R6's "rounded squares" is fixed), and the canopy is 8 px of `#e694f7` — too small to read.

**3. Stage 3's night ground — did the rebuild land?**

**Yes, and it is the best thing in the build.** Flat black with single-pixel white/cyan/yellow/red
lights; at native the arcade band and ours are genuinely hard to tell apart
(`art-r7-night-ground-3x.png`). The mottled navy field is gone. The palette family is right.

Two residuals, both measured, neither fatal: the lights **stretch with depth** where the arcade's
hold a fixed size (§3.6), and the arcade's **cluster into districts** where ours is an even
sprinkle (art direction, unmeasured). Also: our stage-3 frames carry **no clouds at all**, while
the arcade's night frame has five mauve-grey banks, and the arcade has a **bright blue atmospheric
rim** along the horizon that we render as a flat navy band with a hard straight edge.

**4. Stage 2 — is the glow banding gone, and is the ground a terrain mass?**

**Glow: yes, and done properly.** All on the ladder, 22 channel values, 0 off-ladder, and the steps
are **dithered** rather than smoothed — the correct 1987 answer, not a gradient. R6's one-line fix
was taken and it worked.

**Ground: no, on both counts.** The road is still a road (§3.3, though R6's "axial and symmetric"
charge should be retired — it scrolls laterally now). And the far half is **airbrushed**: T
0.155–0.182 against the arcade's 0.339, while **our own stage-1 sea reads 0.324 in the same band**
(§3.2). The near half, by contrast, is **exactly on the arcade** at 0.344–0.361. We have half a
terrain mass.

**5. The carrier — judge the art, and is the framing wrong?**

**The framing is not wrong, and the premise in your ask is not right either.** The module header
claims a view from astern. `reference/carrier-launch-t89.png` is indeed not a broadside — but it is
also **not a ship shot at all**: it is a **deck-level first-person view from on board**, camera on
the deck looking forward past parked aircraft to the bow, with the island filling the right third
above the horizon. There is no ship silhouette in it.

The frame the carrier was actually solved from is `carrier-prelaunch-t84.png`, which **is** a whole-
ship shot, and ours matches that shot type. So: **header correct, ask's "broadside" incorrect, and
the real gap is a different one** — the arcade plays *two* shots across its launch (whole ship at
t84, then on-deck at t89) and we hold the first for all 3.5 s. The second is the cinematic one.

On the art itself: it does read as a carrier deck from astern — trapezoid widening toward the
viewer, island to starboard, jet correctly placed and scaled. Everything else is §3.7, and the
hull's dead-straight waterline is the single thing to fix first.

---

## 5. Has the defect relocated again — and to where?

**Yes, twice over, and the second one is the finding.**

**Relocation 1 — by object, and across a file-ownership boundary.** The continuous-tone *mechanism*
is now in exactly one live place: `deathSequence.js:158`, a `material.color.setRGB` multiply on an
authored sheet, producing 19 off-ladder values and **47 channel values against a gate of 32**. It
has now been found **twice under two different names** — once by the R7 judge as "a near-field
enemy airframe" in the `enemies,shots` arm, and once by me in the death capture — and it is one
line. A defect that two independent reviewers reach by different routes and neither names
correctly is worth more process attention than a defect nobody found. The
fx lane removed every instance of this mechanism from `effects/**` and `weapons/**` — the removals
are all still there in the comments. It did not remove the one in a **flow-owned** file, because it
does not own that file and nobody asked the question as a question about the mechanism. Two further
off-ladder objects — **the carrier** (12 values) and **the title** (44 values, 53 channel values)
— sit in `game/flow/**` too, and **neither is reachable from any `?combat*` isolation flag**, which
is why the judge's arm sweep and my predecessor's object sweep both missed them. All three
survivors are in one lane's files and outside the isolation grid. That is not a coincidence; it is
the shape of the blind spot.

**Relocation 2 — by axis, and this is the one I would act on.** The class the project has been
chasing for three rounds is "composited in continuous tone," and it is measured by **colour
cardinality**. On that axis the build has very nearly won: 422 frames, three failures, all three
listed above, all three cheap. But the defect has stepped sideways into a form that **cardinality
cannot detect at all** — a **continuous-tone drawing in a quantized palette**:

| object | colours | chan values | gate | **granularity vs arcade** |
|---|---|---|---|---|
| stage-2 far ground | 11–16 | 22 | **passes** | **T 0.155–0.182 vs 0.339** |
| fireball | 8–11 | 19–21 | **passes** | **T 0.299–0.336 vs 0.678** |
| stage-3 near lights | 6 | 29 | **passes** | **2.37 px vs 1.77 px, 19.5 % vs 8.9 % elongated** |

Three objects, three different lanes, all passing every published gate, all losing the picture in
the same way: **the palette was quantized and the shape was not.**

So, in the shape of its predecessors:

> **The fire looks like 1987 now. What is still wrong is no longer the colour — it is the
> drawing, and nothing we measure can see it.**

**The process change I would make**, and it is a small one because the previous two rounds already
built most of it:

1. **Run the per-object census over `?demo=1`, `?showtitle=1` and `?forcedeath=N`, not only over
   `?combat*`.** My predecessor asked for a per-object Criterion A table and the project built it;
   it is pointed at the isolation grid, and all three of this round's survivors live outside it.
   Twenty minutes of capture would have found them on day one. The grid, not the gate, was the
   blind spot.
   **And when an arm is over the gate, map the off-ladder values to pixels, crop, AND compare the
   value set against the other arms before naming the object.** Both the judge and I had the right
   number for §3.4 before either of us had the right object; a one-line `set()` comparison across
   arms is what identified it, and it is cheaper than either of the crops that preceded it.
2. **Add MOTTLE (or any granularity statistic) to the gate set.** It is 30 lines
   (`tools/out/art-critic-r7/mottle.py`), it validates on synthetics in one second, it discriminates
   6× between two images with the *same palette*, and it has arcade targets on three different
   subjects already measured in this report — including one (§3.2) where **our own stage-1 sea
   already passes**, so a lane can see the fix working before it ships it. Cardinality says the
   build is nearly done. Granularity says it is not. Right now only the second one is true, and
   only a human eye is measuring it.

---

## 6. Coverage

**Covered:** stage-1 cruise, banked, isolated-jet and ordinary combat play at two seeds; the
explosion over **150 consecutive 60 Hz ticks** on the isolation harness and again in scripted
combat; five `?combatonly` arms; clouds isolated; stages 2 and 3 at six and three digit-verified
sim times each, with and without combat; the death/respawn cycle; the carrier launch at coarse and
fine stepping; the title. Both true-native arcade stills, both re-measured from scratch against
REFERENCE.md's published figures.

**Not covered:** audio; feel, pacing and difficulty; the stage-end tally card; the CONTINUE card
(R6 rank 7's z-order defect is unretested here); the READY card (R6 rank 6); stage-1 landmasses
(R6 rank 9). None of R6's ranks 6, 7 or 9 were re-measured — their absence from this report is
**not** evidence they were fixed.

**One caveat on the record.** My carrier aspect figure (3.22 vs 1.54) uses a saturation-threshold
mask on the arcade side and a declared-palette mask on ours, because our hull is near-black and
falls out of a grey threshold. The two are not the same operator. The direction and the rough
magnitude are safe; the exact ratio is not. I left it in rather than drop a real finding, but it is
the weakest number in this report and it is the only one I would not defend to three figures.

**Captures:** `tools/out/art-critic-r7/{ctl,s1-play,s1-play-b,s1-jet,s1-jet-bank,s1-cruise,expl-consec,iso-enemies,iso-shots,iso-vulcan,iso-missile,iso-locks,iso-clouds,demo2,sx-2000,sx-2200,sx-2460,sx-2800,sx-3200,sx-3600,sxc-2460,sxc-3000,sxc-3600,launch,launch-fine,death,title,arm-enshots}/`.
Instruments and their self-tests: `tools/out/art-critic-r7/{inst.py --selftest, mottle.py, audit.py}`.

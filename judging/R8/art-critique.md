# R8 Art Direction Critique — *does this look like a 1987 Sega arcade game?*

**Role:** arcade pixel-art director. Fresh context. **Report only; no code was changed.**
**Tree:** `main` @ **`ea3726bb5d7a1638ceb93e2bcd13d414c8c760c7`** ("R8 board: round close-out").
`git status --short` at capture time held one untracked file, `judging/R8/report.md` (the judge's
own in-progress report, written concurrently by another agent). **`src/`, the three ground-truth
documents and `tools/*.{py,mjs}` were clean before and after**, verified by a pathspec-scoped
`git status`. The only files I added are this report, `judging/R8/art-r8-*.png`, and my captures
and instruments under `tools/out/art-critic-r8/`.

**Captures:** all mine, `tools/out/art-critic-r8/`, **800 frames across 34 sets**. Instruments:
`tools/out/art-critic-r8/{inst.py --selftest, mottle.py, audit.py, crop.py, figs.py}`.

**Method.** Every "ours" panel is decimated from the captured 960×672 to true native **320×224**,
judged at that resolution first, then zoomed nearest-neighbour. Every arcade figure gets the same
treatment. Stage identity is read from the **HUD stage digit in the frame itself**
(`art-r8-11-stage-digits-1-to-5-8x.png`), never from the simulation's counter. Every tick index
below is quoted with the URL that produced it, from each set's `capture-manifest.json`.

---

## 0. Instrument validation, before any number below was trusted

| control | result |
|---|---|
| Capture is a pure 3× nearest upscale | **worst within-3×3-block channel spread 0 over all 800 frames** — decimation is lossless, not an approximation |
| Decimation correctness | `decimate(nearest3x(base)) == base` exactly; a **bilinear** 3× control returns spread **140**, so the test can fail |
| Colour-cardinality operator | returns exactly **3** on a 3-colour synthetic; channel-union returns **2** |
| **Ladder-membership operator** | both true-native arcade stills return **0 off-ladder channel values** and reproduce REFERENCE.md's published figures exactly: desert **138 colours / 31 union / 29 per-channel**, night **79 / 17 / 17**. It agrees with the hardware on the hardware's own output |
| **MOTTLE** (granularity), same operator as R7 | on two synthetics with the **identical 7-colour palette and identical mask**: concentric rings **T=0.145, mean patch 349.9 px**; pixel dither **T=0.859, 1.9 px**. Discriminates by 6× on T and 180× on patch size, and is not a palette or mask artifact |
| MOTTLE reproduces R7's arcade anchors | arcade desert ground, far band **T=0.339**, near band **T=0.354** — R7's published 0.339 / 0.354 to three decimals |
| Black / duplicate sweep | **0 black frames in 800.** 1 within-set duplicate group (`title`, §3.2). 9 cross-set groups, every one an overlapping tick grid of the same deterministic run or a jet-hidden control identical before the stick deflects — **none enters a pooled figure** |

### Things I measured, cropped, and threw away

1. **"Our clouds read T = 0.261–0.349."** Clean, plausible, stable. **Cropped and looked**
   (`v-cloudmask-f2-3x.png`): the cloud palette's `#f7f7f7` is also the **HUD's white ink**, and
   on one frame the mask was **531 px of pure HUD and no cloud at all** — the SCORE and HIT
   emblems, the reticle, the SPEED bar, the missile stock. The HUD has now been counted as a
   cloud, a cloud bank, a false horizon, twice as an enemy — and now, by me, as a cloud again.
   Redone with an exclusion mask derived per-run from a live `?nocombat=1&noclouds=1&hidejet=1`
   frame (§3.5).
2. **"Two different arcade enemies return byte-identical statistics."** The alarm fired
   correctly and the answer is benign: **they are the same sprite cell drawn twice**, 26 px each,
   pixel-identical masks. Reconciled before publishing, not discarded.
3. **"The player jet's nozzle ring is too thin."** Formed from a 6× crop. At 8×
   (`v-ensolo-8x.png`) ours is a ~2 px black annulus against the arcade's ~3 px on an 11 px disc —
   **comparable, not a defect.** Withdrawn.
4. **"Our jet's fill is 22.6 % against the arcade's 15.1 %."** True as stated and **useless as
   stated**, because fill depends strongly on bank angle and the two observations were at
   different banks. Replaced with a bank-invariant statistic (§4).

### One instrument caution that belongs in REFERENCE

**MOTTLE's `T` is mask-sensitive; its mean colour-patch size is not.** R7 published the arcade
night fireball at **T = 0.678 over a 661 px mask**. My broader warm mask over the same frame
gives **T = 0.368 over 2 201 px** — and **mean patch 3.0 px, identical to R7's 3.0 px.** Two
defensible masks, the same frame, the same operator, `T` moving by 0.31 and the patch size not
moving at all. **Quote the patch size. Do not quote `T` across masks** — this is the "same name,
different operator" family, and it would otherwise look like a regression that never happened.

---

## 1. Blunt assessment

**Round 8 closed the half of every named defect that a gate can see, and left the half it cannot —
on all three objects it was given, without exception.**

The cardinality work is a genuine, complete, verifiable success, and I tried hard to break it.
**800 frames across title, carrier launch, stages 1–5 digit-verified, ordinary combat, the
explosion, the whole death cycle, the tally, the continue card and six player poses: the maximum
Criterion A2 reading anywhere is 31 against a gate of 32, and the only off-ladder channel value
in the entire corpus is 159 — the stage-1 sky `#009fff`, whose arcade counterpart `#009eff` is
158 and equally off the ladder.** The title alone reads **0** off-ladder. This is not a gate that
passes; it is a gate that *cannot* fail, because `assertOnLadder()` now checks the authored inputs
at module load. That is the right way to close a class and it should not be re-opened.

And then:

| object | what R8 fixed | what R8 left |
|---|---|---|
| **title** | 53 → **15** channel values, 44 → **0** off-ladder | upright blocky letterforms where the arcade's are **sheared and chiselled**; lettering still **21.5 % short in height**; the sphere "II" is two marble columns where the arcade's is a packed slab; **24 frames over 120 ticks are one single image** |
| **death hulk** | 43 of 120 frames over gate → **0**; the last `material.color` multiply deleted | a flat dark-red silhouette with **no highlight, no smoke and no debris**, falling through clear sky |
| **carrier** | 13 → **1** off-ladder | the lane's own words: *"the carrier is visually identical"* — every one of R7's seven art defects stands, and the dominant one is a **scale error nobody has named** |

That is the project's recurring failure, one level up from where it has been found before. It has
always been *a lane fixes the object that was named and the defect survives in the class.* This
round it is **a lane fixes the axis that was measured and the defect survives in the object** —
same object, same file, same commit. Three for three.

**The best thing in the build is the sea and the HUD.** A stage-1 frame with the jet alone over
water is genuinely hard to tell from an arcade screenshot. **The worst thing in the build is that
you cannot find your own aircraft**, and that is new information this round, because both
aircraft are now pale.

---

## 2. Has the defect relocated again — and to where?

**No. For the first time in five rounds it did not move, and that is not good news.**

R7 reported two relocations: the cardinality defect into three flow-owned objects, and — the one
it said to act on — a step sideways onto an axis no gate measures, *a continuous-tone drawing in a
quantized palette.* R8 fixed the first completely. **The second was not worked on by anybody**,
because the lanes that own those files (world, fx, sprite) did not run this round. I re-measured
it and it is sitting exactly where R7 left it, to three significant figures:

| object | R7 measured | **R8, ours, re-measured** | arcade, same operator |
|---|---|---|---|
| fireball | T 0.299–0.336, patch 12.8–17.9 px | **T 0.303–0.307, patch 15.5 px** | patch **3.0 px** |
| stage-2 far ground, rows 148–166 | T 0.155–0.182 | **T 0.162–0.185, patch 43.0–87.3 px** | T **0.339**, patch **6.8 px** |
| stage-1 sea, same band (the passing control) | T 0.324 | **T 0.309–0.319, patch 8.5–8.7 px** | — |

So the honest answer to the question I was asked is: **the class did not relocate; it was left
alone.** But the audit turned up **three members R7 did not count, and one of them is the largest
single object in the class.**

| new member | measured | why it was never seen |
|---|---|---|
| **the enemy far LOD** | `drawRearFar()` is **five nested `fillRect`s over a fully-filled 16×8 cell** — a rectangle by construction, read out of the source, not inferred. **44.8 % of all enemy sprites on screen are drawn by it** | it is a *declared exception* in `enemySprite.js`, so every audit that read the comment stopped reading |
| **the clouds** | colour-patch size **scales with the cloud's screen width**: 7.1 px at 32 px wide → **57.9 px at 187 px wide**, same art, same palette, same renderer. The arcade's four puffs hold **4.5–6.7 px at 23–27 px wide** | R7 measured only `T`, found ours 0.340–0.377 against two arcade observations spanning 0.15, and **correctly declined to rank it**. On patch size the gap is 2.5×–8× and the mechanism is nameable |
| **the player jet** | **1.80× the ink per pixel of span** that the arcade's carries (§4) | nobody had measured the jet's *drawing*; every published jet statistic is a value or a palette statistic, and all of them now pass |

**And the title is a fourth, hiding in plain sight.** Its palette is perfect — 11 colours, 15
channel values, 0 off-ladder — and its drawing is a placeholder. That is the definition of the
class, on the object R8 was told to fix, in the round it was fixed.

> **The build's colour is now right nearly everywhere and its drawing is wrong nearly everywhere
> that is not the sea, the HUD or the sky. Nothing the project measures can tell the difference,
> and R8 is the round that proves it: every one of these objects passed every gate it has.**

### The process change I would make, and it is small

R7 asked for the per-object census to be pointed outside the `?combat*` isolation grid. **That was
done and it worked** — the three survivors were found and closed. Do the same thing once more, one
level down: **the census is per-object on the cardinality axis and per-object on nothing else.**
Add the colour-patch size beside every Criterion A row. It is thirty lines, it validates on
synthetics in a second, it has arcade anchors on **five** subjects now (desert far ground 6.8 px,
desert near ground 6.5 px, stage-2 cloud puffs 4.5–6.7 px, night fireball 3.0 px, distant enemy
26 px of ink in a 9×11 box), and on two of them — **our own stage-1 sea at 8.5 px and our own
small cloud puffs at 7.1 px** — we already pass, so a lane can watch the fix work before it ships.

---

## 3. Ranked — what most damages the illusion

### 1. You cannot find your own aircraft
→ `art-r8-01-readability-60pct-hidden-3x.png`
(`?fixed=1&seed=1&demo=1&invincible=1`, tick **1116**, `occ-on/frame-0035.png`)

**I am the evidence for this one.** Opening my first ordinary play frame at 3×, I identified the
large orange delta at screen centre as the player jet and wrote it down. It is an enemy. The
player was the sliver of cream and one orange nozzle protruding from behind it.

Measured, by hiding the player and differencing against the same tick:

| | n = 41 flight frames, `?demo=1&invincible=1` |
|---|---|
| frames with **>30 %** of the player's aircraft hidden behind another sprite | **8 / 41 = 19.5 %** |
| frames with **>50 %** hidden | **3 / 41 = 7.3 %** |
| worst frame | **60.7 %** |

*(Operator note: the pose-matched baseline carries ±few % of noise — the median reads −0.7 % —
so I quote only the tail, which is an order of magnitude outside it.)*

Three things compound into this and only the third has been looked at:

1. **Enemies spawn on top of the player.** The worst frame holds six aircraft in a clump at screen
   centre, three overlapping each other, one across the player's canopy. R6's gap-11 clump, R7's
   §3.5, unchanged.
2. **The near-field enemy is the single largest, flattest, highest-contrast object on screen** —
   see rank 2.
3. **Both aircraft are now pale.** This is a *consequence of a correct fix*, and I want that
   stated plainly so nobody undoes it: the enemy's black cage had to go, REFERENCE row 12 licenses
   pale stage-1 enemies, and the enemy-art lane did the right thing. But removing the cage removed
   the separation that was accidentally doing the work, and nothing replaced it.

**Fix, in order.** (i) **Keep enemies out of the player's screen box** — a spawn/approach
exclusion zone around the jet's quad, which is a spawner change, not an art change, and it is
worth more than everything else in this report. (ii) The arcade separates the two aircraft by
**hue and nozzle count**, and we have the nozzle count right already (player two, enemy one) —
but ours is invisible because the enemy's single nozzle is a **big black-ringed disc** and the
player's two are **small**. Make the player's pair of nozzles the loudest thing on the player, as
the arcade does (§4). (iii) Do **not** darken the stage-1 enemy back; that is ledger row 12 and it
has been retired twice.

### 2. The enemy rear sprite is not an aircraft. It is a nozzle with wings.
→ `art-r8-03-enemy-rear-five-bank-cells-7x.png` (the authored sheet, all five bank cells, over the
stage-1 sky)

This is the clearest answer in the report to *"enemy jets look very bad"*, and it is not about
palette, perimeter or value — all of which R8 fixed correctly.

Look at the sheet. The entire aircraft is: **a black-ringed orange nozzle disc, two wings sweeping
up-and-out in a shallow V, and one short vertical fin.** There is no fuselage, no tailplane, no
nacelle, no second fin, no body of any kind. The nozzle disc *is* the body. At engagement scale it
reads as a **bird** — a V with a dot at the vertex — and that is what the grey liveries look like
in a live frame (`v-en8-mid-8x.png`).

The arcade's near enemy (`ab2-arcade-closeup-enemies.jpg`, HUD digit read **2**; video upscale, so
**shape only**) is a **long thin fuselage with a needle nose, four separated blades in an X, and a
dark intake disc at the front.** It has a body. Ours does not.

**The five bank cells do not bank.** Cells 0 and 4 differ in 28.1 % of their texels but have
**identical 48×27 bounding boxes and 457 vs 449 opaque pixels**: the wings see-saw a little and
the silhouette never changes. A banking aircraft seen from astern changes silhouette dramatically.
The combat lane's fix to wire `bankDeg` through was right and necessary; what it reaches is five
near-identical cells.

**Two of four head-on liveries are solid filled deltas** — `interceptor` and `prop` have no blade
separation, no fuselage and no nose, just a filled triangle with a dark spot
(`v-enemy-sheets-4x.png`, rows 3 and 4). The commit message names this for one livery
("our head-on mig is a continuous swept V"); **it is two, and the `interceptor` one is the object
that hides the player in rank 1.**

**Fix.** Draw the body. A fuselage between the nozzle and the fin, a horizontal tailplane, and
separation between the wing root and the body, is maybe forty pixels of work per cell and it is
the difference between a bird and a jet. Then the head-on cells: break the delta into blades.

### 3. 44.8 % of the enemies on screen are drawn as a filled rectangle
→ `art-r8-04a-enemy-far-OURS-10x.png` against `art-r8-04b-enemy-far-ARCADE-10x.png`

`enemySprite.js:DETAIL_SWITCH_NATIVE_PX = 10`. Below it, `drawRearFar()` runs, and read from the
source it is a fully-filled 16×8 cell with four nested `fillRect`s inside it — **a rectangle by
construction, with no silhouette at all.** On screen it is a mid-grey block with a dark slot.

Measured on 183 enemy sprites over 24 frames of `?combatonly=enemies&noclouds=1&invincible=1&
hidejet=1`, HUD and sea excluded by a mask derived from a live frame of the same build:

| | bbox | **fill** | mean V | **sky − enemy ΔV** |
|---|---|---|---|---|
| ours, 8–12 px (n = 49) | 9.9 × 9.0 | **69.4 %** | 0.695 | **+0.305** |
| **arcade distant enemy** (`ab2-arcade-desert.png`, HUD digit **2**) | 11 × 9 | **26.3 %** | 0.289 | **+0.613** |

At the same pixel size, **ours is 2.6× denser and has half the contrast against its own sky.**

The far LOD's stated rationale — *at 1–4 rows any transparent row is a frame where the aircraft
vanishes, so make it opaque and read by value* — **is sound, and the arcade agrees with the
diagnosis and disagrees with the remedy.** The arcade solves it by making the sprite **dark**:
V 0.289 against a V 0.902 sky. Ours is mid-grey against the brightest sky in the game. The
rationale asks the sprite to read by value and then gives it the lowest-contrast value available.

**This is the one place where the arcade's own answer sits at exactly our threshold.** The
arcade's distant enemy measures 9–11 px — *below* our detail switch — and at that size it still
draws a 26-pixel dart with a pink nozzle flare and internal variation.

**Fix, and it is cheap.** Keep the opacity invariant; change the value. A far-LOD cell in the
livery's **darkest** tone, not its dominant one, closes most of the gap without touching the
shape. Then, if the budget exists, author a 16×8 **dart** rather than a rectangle — the arcade
proves 26 px is enough.

### 4. The fireball is still drawn as five balloons
→ `art-r8-07a-fireball-OURS-6x.png` against `art-r8-07b-fireball-ARCADE-true-native-6x.png`

R7's rank 1, re-measured and **unchanged**, as expected since no fx lane ran:

| | px | colours | **mean colour patch** |
|---|---|---|---|
| ours, `?combatexpl=1` | 2 168–2 398 | 7 | **15.5 px** |
| **arcade night native** | 2 201 | 27 | **3.0 px** |

Ours is **five near-identical golden discs in a quincunx around a white centre**, each with its own
clean concentric yellow→orange→red banding inside a ragged dark-red rim. At native it reads as a
clover. The arcade's is one irregular **swept** mass with red, orange and yellow dithered through
each other at the pixel, trailing debris off one side.

Everything R7 said about the medium remains true and correct — 7 palette colours, hard alpha,
decay by palette sequence, zero sky holes. **The medium is finished. The drawing has not started.**
R7's fix list stands unchanged and I have nothing to add to it.

### 5. The title's palette is perfect and its drawing is a placeholder
→ `art-r8-05a-title-OURS-3x.png` against `art-r8-05b-title-ARCADE-1x.png`

I reproduce the ladder lane's figures exactly — **11 colours, 15 channel values, 0 off-ladder** —
and its diagnosis of *why* the old screen was broken (a half-pixel row stagger feathering
`fillRect` edges into 14 blend colours) is the best single finding of the round. A palette-only fix
would have measured as a reduction and left the generator running. That lesson is worth more than
the fix.

**And the screen is still not the arcade's.** Four things, all geometry, none touched:

1. **The letterforms are wrong.** The arcade's are **sheared, with chiselled diagonal terminals** —
   a 1980s speed logotype. Ours are upright, square, uniform-stroke, with a rounded-arch `A`. This
   is the single biggest reason it reads as a placeholder, and it is visible at 1×.
2. **The lettering is 21.5 % short.** White-ink bbox, ours **59.1 %W × 40.6 %H**; the arcade's
   **59.9 %W × 51.7 %H**. The width matches to within a point and the height does not. Flagged in
   R6 §6.10, re-confirmed in R7, re-confirmed here on the shipped tree, **never actioned**.
   *(Arcade side is a 686×480 video upscale — a proportion, not a colour claim.)*
3. **The sphere "II" is two marble columns with serif feet.** The arcade's is a **densely packed
   rectangular slab** of small shaded balls with a large irregular molten core burning through its
   middle, which the letters read across. Ours is narrower (101 px against the arcade's ~48 %W),
   the balls are ~3× larger relative to the cap height, and the left column **punches a hole
   through the `T` of AFTER and the `R`/`N` of BURNER**.
4. **It is one image.** 24 frames over 120 ticks → **1 unique image**, byte-identical. R7 found 6
   unique over 100 ticks using three spacings; on a single spacing it is one. No attract animation,
   no blinking INSERT COIN — and a blinking INSERT COIN is the single most 1987 thing a title
   screen can do. Flagged in R5, R6, R7 and now R8.

Also: `¡INSERT COIN!` carries a leading inverted exclamation mark where the arcade has a plain
trailing `!`. It reads as a glyph bug, not a design choice.

### 6. Clouds: the mottle scales with the cloud, and the arcade's cannot
→ `art-r8-06a-cloud-LARGE-ours-4x.png` against `art-r8-06b-cloud-ARCADE-puffs-4x.png`

This is new, and the control is inside our own data so it needs no arcade sample size at all.

| subject | puff width (native px) | **mean colour patch** | T |
|---|---|---|---|
| **arcade stage-2, four separate puffs** | 23, 24, 27, 27 | **4.5, 5.4, 6.7, 4.9** | 0.495–0.588 |
| ours, small puffs | 32, 41 | **7.1, 7.9** | 0.473–0.512 |
| ours, medium | 75, 90, 92, 120 | 13.5, 14.5, 17.2, 23.7 | 0.279–0.378 |
| ours, large | 146, **187** | 28.1, **57.9** | 0.250, 0.171 |

**Same art, same six-colour palette, same renderer: the colour patches grow 8× as the cloud grows
6×.** That is the signature of a fixed-texel texture being magnified — the stipple is authored once
in texture space and stretched. The arcade cannot do this: its clouds are sprite cells at a fixed
texel-to-pixel ratio, so a bigger cloud is a bigger sprite with the same stipple.

**And our small puffs are nearly on target** (7.1–7.9 px against 4.5–6.7 px). The *authoring* is
close to right. The *scaling* is the defect. This is the same family as CLAUDE.md's named
perspective-parallax bug: **hold the screen-space ratio per tick, not the world-space quantity.**

**Fix.** Author the cloud texture at a resolution tied to its on-screen size — pick the texture
from a small ladder of sizes by screen width, or re-dither in screen space — so the stipple stays
1–2 native px at every scale. Target: colour patch ≤ 7 px at any cloud size.

### 7. The carrier reads as a toy, and the cause is the aircraft parked on it
→ `art-r8-08a-carrier-OURS-3x.png` against `art-r8-08b-carrier-ARCADE-1x.png`

The ladder lane snapped six constants and said, accurately, that *"the carrier is visually
identical."* So all seven of R7's points stand. I will not restate them. **I disagree with R7 about
which one is first**, and the arcade's own frame is what changed my mind.

**The dominant defect is a scale relationship, not a silhouette.** In the arcade's prelaunch frame
the deck carries roughly six parked aircraft, **each about one-sixth of the deck's width**, and
that is what makes the ship read as a ship — the aircraft are the ruler. In ours the player's F-14
sits on the deck at **full combat size with its wingtips overhanging both deck edges**. A carrier
deck is roughly four F-14 spans across; ours is about one and a half. **The ship is not too short;
the aeroplane is about three times too big**, and no amount of hull lengthening will fix a frame
where the ruler is wrong.

*(I am stating this from the two crops rather than a number: my attempt at a masked
jet-span-to-beam ratio caught the sea's white foam and the HUD, returned a 312 px "beam" on a
320 px screen, and is withdrawn. The crops are unambiguous and the mask was not.)*

Second, and independent: **the catapult steam is a cloud sprite.** It has the same lumpy cumulus
silhouette and the same white/grey palette as the sky cloud two hundred pixels above it in the
same frame, and it rises as a vertical column. Catapult steam is a low flat jet along the deck.
This is the most obviously wrong element in the shot and it is also the cheapest to fix.

Third, unchanged from R7 and still correct: the hull meets the sea on a **dead-straight horizontal
edge with no waterline, no foam, no bow wave, no wake and no shadow**, where the arcade's has a
dark shadowed hull band with the sea's own foam breaking along it. The arcade's island is a
detailed tower with radar dishes and a lattice mast; ours is three plain grey boxes and a cross.
The deck markings are the same ▲ glyph stamped eight times at one size.

### 8. The death hulk is fixed in value and empty in everything else
→ `art-r8-09-hulk-OURS-5x.png`

The remap works and the improvement is real: the hulk now reads as a **burnt, dark, tumbling
airframe** instead of a mid-brown one, and across 140 death-cycle frames at two spacings it never
exceeds 29 channel values with `[159]` as its only off-ladder value. That is R7's rank 4 closed,
and the mechanism (a `material.color` multiply on a quantized sheet) deleted.

What it is missing is everything that makes a kill read as a kill: **no smoke trail, no fire, no
shed debris, no highlight anywhere on the body.** It is a flat dark-red silhouette falling through
clear blue sky. The arcade's own frame in this repo
(`ladder-06-hulk-ARCADE-t204.73-stage3-5x.png`) shows a glowing body — but see §5 before acting
on that.

### 9. Stage 2's far ground is still airbrushed
→ `art-r8-10a-stage2-ground-OURS-3x.png` against `art-r8-10b-stage2-ground-ARCADE-3x.png`

R7's rank 2, unmoved, with the patch-size statistic added because it is far more damning than `T`:

| band, rows 148–166 | T | **mean colour patch** | colours |
|---|---|---|---|
| **arcade desert** (HUD digit 2) | **0.339** | **6.8 px** | 47 |
| ours, stage 2 (HUD digit 2, four frames) | 0.162–0.185 | **43.0 – 87.3 px** | 15–19 |
| **ours, stage 1 sea, same band** | 0.309–0.319 | **8.5 – 8.7 px** | 14–16 |

Our own sea is within 2 px of the arcade in that band. Our stage-2 far ground is **6–13× coarser**:
15–19 colours smeared into 66–134 components over 5 760 pixels. The near band is fine (patch
5.9–10.4 px against 6.5). The world lane solved this in stage 1 and did not carry it to stage 2.

And the arcade's desert is **not a floor plane at all** — it is a diagonal mass of chunky grey rock
outcrops with green scrub, hard-edged, meeting open gold on a crisp boundary, with no horizon line.
**It has objects; we have layers.** Unchanged from R7.

### 10. The game visibly repeats after three stages
→ `art-r8-11-stage-digits-1-to-5-8x.png`

The flow lane's stage counter works: I read **1, 2, 3, 4, 5** out of the HUD digits themselves.
But the content wraps at 3 — stage **4** is stage 1's ocean and stage **5** is stage 2's desert.
That trade-off is declared in `flow.js` and I think it was chosen correctly. Recording it as an
*art* observation rather than a defect: by two minutes of play the world has started over, and no
amount of pixel work on three stages hides that. It is the largest remaining content gap and it
belongs on the gap list as content, not as a bug.

---

## 4. The owner's verdict: *"our jet is still not good enough"*

**He would still say it, and I can name what carries it. It is not value, palette, keyline or
budget — every one of those is now right, and I checked all four before looking further.**

| | **arcade**, true-native daylight jet, banked (n = 1) | **ours**, level | ours, banked 35.6° |
|---|---|---|---|
| ink | **803 px** | 1 513 px | 970 px |
| max extent (span) | 109.7 px | 115.0 px | 89.1 px |
| **ink per pixel of span** | **7.32** | **13.15** | 10.93 |
| `#840000` share of airframe | 27.9 % | 15.9 % | 23.0 % |
| `#000000` share of airframe | 16.8 % | 9.3 % | 7.0 % |
| **dark-accent share (both)** | **44.7 %** | **25.1 %** | 30.0 % |
| pale area | **444 px** | **1 133 px** | 679 px |
| colours | 8 | 10 | 10 |

→ `art-r8-02a-jet-OURS-level-and-banked-6x.png`, `art-r8-02b-jet-ARCADE-true-native-6x.png`,
and the masked arcade jet at 6× in `tools/out/art-critic-r8/v-arc-jetmask-6x.png`.

**At the same wingspan, our aircraft uses 1.80× the ink and 2.55× the pale area.** Ink-per-span is
bank-invariant in a way that fill is not, which is why I replaced fill with it (§0.4).

**What the masked arcade crop shows, and it is the whole answer.** The arcade's F-14 from
astern-above is **four long thin blades and two heavy black nozzle discs, and nothing else**. Each
blade is a 2–3 px stroke: one white edge-lit line with a `#840000` shadow line beside it, running
the *entire length* of the wing. **Forty-five per cent of the aircraft is dark line-work.** It is
drawn as lit edges.

Ours is a **filled planform with an outline**: solid cream paddles, with the `#840000` used as a
perimeter stroke rather than as a shadow line beside a highlight, and a featureless cream interior
across most of the body carrying a single dark dash. It is a silhouette fill where the arcade is a
structure.

Three specifics, in order of how much they cost:

1. **The wings are paddles, not blades.** Thin them and put a `#840000` line down the full length
   of each one with a white edge above it. This is the 1.80× and it is most of the problem.
2. **The vertical fins read as two pale rabbit ears.** At 8× (`v-ensolo-8x.png`) they are tall,
   thin, nearly white, canted outward, and separated from the nacelles by bare sky. In the
   arcade's astern views the fins are short and sit **on** the nacelle tops as part of one tail
   mass. Shorten them, darken their inboard faces, and connect them.
3. **The interior has no panel lines.** The arcade covers the airframe in dark-red spine lines that
   give each surface a top and an edge. We have one dash. Half a dozen 1-px lines would read as
   structure at native.

**Two things to leave alone**, because they are right and a lane could easily "fix" them back:
the `#840000` **budget** is fine (ours 23.0 % at bank against the arcade's 27.9 %, and R7's
separate crop-denominator figure of 4.1 % vs 3.6 % also passes — note these are **two different
denominators with one name**, so do not compare them to each other); and the nozzle **ring
weight** is fine (§0.3, a claim I formed and withdrew).

**The honest bound on all of this.** The arcade side is **n = 1, a banked pose, on stage 2**, and
ours at matched span is a level pose. A banked wing can legitimately present a shorter chord. This
is precisely acquisition item 2 — *a true-native LEVEL astern frame* — which STATUS.md already
lists as blocking, and it blocks this too. What I will defend without it: the **crops**, at 6× and
8×, where the arcade's wing is visibly a 2–3 px stroke and ours is an 8–10 px filled paddle; and
the **dark-accent share**, 44.7 % against 25.1 %, which is a composition ratio and does not depend
on the bank angle.

---

## 5. Two criteria I would not tune to, checked against the arcade first

**(a) The death hulk's bright tail — R8's own open item 1 — should not be actioned as written.**
The target (p95 **144**, max **191**) comes from `ab2-gameplay.mp4` t202.4–206.8, and the lane did
the right thing by reading the HUD digit: **it is stage 3, a night death.** It is also a 686×480
video decode, where ringing biases a p95 and a maximum upward, and REFERENCE records that the
video chain expands levels past the hardware's `0xf7` ceiling. Our subject is a **daylight** hulk
against a bright blue sky.

CLAUDE.md names this exact failure in its own list of retired criteria: *"a missile-trail
brightness target taken from a **night** frame that turned the daylight trail black."* This is the
same operator on the same kind of source for the same kind of object. **Do not raise the daylight
hulk's top tone to hit 144 until a daylight death instance exists** — which the lane itself already
filed as an acquisition item. The lane's own four matching percentiles (41/49/66/82 against
36/51/65/84) are the part that is safe, and they are enough.

What the hulk actually needs is **smoke, debris and one highlight** — which no percentile measures,
and which is the §2 class again.

**(b) MOTTLE's `T` must not be quoted across masks.** See §0. If `T` goes on the gate set, the mask
goes with it in the same sentence, or the statistic to publish is the mean colour-patch size.

---

## 6. The four questions, answered

**1. The enemy, rebuilt. Does it read as an arcade aircraft at engagement scale, and is the player
still unmistakable?**

**The perimeter fix is correct, complete and verified — and no, it does not read as an aircraft,
and no, the player is not unmistakable.** I reproduce the lane's audit in spirit: there is no black
cage on any enemy in any frame I captured. But the near sprite is a nozzle with two wings and no
body (rank 2), 44.8 % of enemies on screen are rectangles (rank 3), and in 19.5 % of ordinary play
frames more than 30 % of the player's aircraft is behind one of them (rank 1). The arcade's
hue-and-nozzle-count separation is the right target and we have the nozzle count right; what is
missing is that the arcade's enemy nozzle is a **big dark disc** and the player's two are the
brightest thing on the player, and ours are the other way round.

**2. The title, rebuilt — and why it was broken.**

**The palette is closed, the mechanism finding is the best thing in the round, and the drawing is
untouched.** The half-pixel stagger lesson is exactly right and generalises: *an operator that
mixes authored colours puts new colours on screen no matter how clean the authored ones are* — the
same sentence covers the alpha ramp the fx lane killed in R7 and the `material.color` multiply the
ladder lane killed in R8. Three instances, three rounds, one sentence. **Put it in CLAUDE.md beside
the Canvas2D line it belongs to.** What remains is letterforms, 21.5 % of lettering height, the
sphere slab, and the fact that it is one frame (rank 5).

**3. Head-on enemies — the swept V.**

**Confirmed, and it is two liveries, not one.** `interceptor` and `prop` head-on cells are solid
filled deltas with no blade separation, no fuselage and no nose; `grey` and `camo` are a thinner
continuous V with a small tailplane and are closer. The arcade's
(`ab2-arcade-closeup-enemies.jpg`, HUD digit **2**) is an X of four separated blades with a long
needle-nosed fuselage and a dark intake disc. **The `interceptor` delta is also the object that
hides the player in rank 1**, so the two findings share a fix. The only arcade frame for this is a
1440×1080 video upscale — **shape only**, no colour or cardinality claim, and acquisition item 5
still blocks the rest.

**4. The death hulk's short top 5 %.**

**The mechanism the lane names is correct and the criterion is not safe to chase.** The sheet's
brightest authored tone is 23 % of its pixels and cannot enter a top 5 % without splitting it —
that is true and well diagnosed. But the 144/191 target is a **night, video-upscaled, codec-smeared
measurement applied to a daylight object**, and this project has retired a criterion for exactly
that twice (§5a). The visible defect is not the percentile; it is that the hulk has no highlight,
no smoke and no debris. Fix the drawing; leave the number until a daylight death frame exists.

---

## 7. Where the build has genuinely arrived

Stated without hedging, and several of these are large.

| | measured | state |
|---|---|---|
| **Criterion A, project-wide** | **800 frames, 34 sets, max A2 = 31 against ≤32; the only off-ladder value anywhere is 159 (the licensed stage-1 sky)**; title 0 off-ladder | **Closed, and closed structurally** — `assertOnLadder()` checks the inputs at module load, so the gate cannot fail rather than happening to pass. Independently reproduces the ladder lane and the R8 judge |
| **The death cycle** | 140 frames at two spacings across fireball → starburst → tumble: **21–29 channel values, 0 over gate, `[159]` only** | R7's rank 4 **closed**, and the last `material.color` multiply on an authored sheet is gone |
| **The title's palette** | 11 colours / 15 channel values / **0 off-ladder** | Closed. 53 → 15 reproduced exactly |
| **The enemy's black cage** | no near-black perimeter on any enemy in 183 sprites over 24 frames | Closed — and it was the right call to audit the whole class of sixteen sheets |
| **The stage counter** | HUD digits read **1, 2, 3, 4, 5** out of the frames | Works. The arcade goes to two digits and so do we now |
| **Stage-1 sea** | far band patch **8.5–8.7 px** against the arcade's 6.8 | The best surface in the build. A jet-alone frame over water is hard to tell from an arcade screenshot |
| **The HUD** | every element legible at native; the reticle's authored canvases carry 17 channel values, all on the ladder | Right, and it has been right for two rounds |
| **The hulk's value** | p5/p25/p50/p75 **41/49/66/82** against the arcade's 36/51/65/84 | Four of six percentiles within a ladder rung. Real |

---

## 8. Coverage, and what is not in this report

**Covered:** the title; the carrier launch at 8-tick spacing; stage-1 cruise, isolated jet at six
bank poses, and ordinary attract-mode combat; stages 1–5 with the HUD digit read out of every
frame used; the explosion on its isolation harness; enemies isolated at two densities and on a
clean sky with the jet hidden; the full death cycle at 4- and 7-tick spacing; the tally; a mortal
run reaching the continue card; clouds isolated; all sixteen enemy sheets and all three player
sheets as authored canvases; both true-native arcade stills re-measured from scratch against
REFERENCE's published figures.

**Not covered, and their absence is not evidence they are fine:** audio; feel, pacing and
difficulty; stage-3's night ground and city lights (R7's rank 6 — I did not re-measure it, and
no lane that owns it ran); the READY and CONTINUE cards as *art* (they are in my cardinality census
and nowhere else); stage-1 landmasses; the barrel roll; the missile trail; the nose sight's size
(R7's 3.125 %W against a 1.4–1.8 %W target is unretested here).

**Caveats on the record, in the order I would distrust them:**
1. **The jet's ink-per-span comparison is n = 1 on the arcade side, banked against our level.**
   Acquisition item 2 blocks it. The crops and the dark-accent ratio are what I would defend.
2. **The distant-enemy comparison is one arcade sprite cell** (drawn twice in the frame), on
   stage 2, against an orange sky. Our side is n = 49 on stage 1 against a blue sky. The arcade's
   sky is *dimmer* than ours and it still achieves twice the contrast, so the direction is safe;
   the exact ratio is not.
3. **Every title and carrier proportion is read off a 686×480 video upscale.** Proportions only —
   no colour or cardinality claim is made from either.
4. **The occlusion statistic has ±few % of baseline noise** (median −0.7 %). Only the >30 % and
   >50 % tails are quoted, and they are an order of magnitude outside it.
5. **`?demo=1` displaces every stage boundary by 211 ticks.** Every stage claim here comes from
   the HUD digit, not from a tick index, for exactly that reason.

**Captures:** `tools/out/art-critic-r8/{title,launch,jet,jetbank,jetoff,jetbankoff,pose*,enemies,
enemysolo,enfar,enfar2,headon,play,occ-on,occ-off,death,deathfine,tally,stages,mortal,expl,
clouds,cleansky,skyref}/`, each with its `capture-manifest.json`.
**Instruments and their self-tests:** `tools/out/art-critic-r8/{inst.py --selftest, mottle.py,
audit.py, crop.py, figs.py}`; full hygiene sweep in `tools/out/art-critic-r8/sweep-all.txt`.

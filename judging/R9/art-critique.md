# R9 Art Direction Critique — *does this look like a 1987 Sega arcade game?*

**Role:** arcade pixel-art director. Fresh context. **Report only; no code was changed.**
**Tree:** `main` @ **`bd73b52de439f4d5690356c3265137be9756c27b`** ("R9 criteria: the per-palette
licence, and why the threshold must not be retuned"). `git status --short` at capture time held
one untracked file, `judging/R9/report.md` — the judge's own in-progress report, written
concurrently. `src/`, the three ground-truth documents and `tools/*.{py,mjs}` were clean before
and after. The only files I added are this report, `judging/R9/art-r9-*.png`, and my captures and
instruments under `tools/out/art-critic-r9/`.

**Captures:** all mine, `tools/out/art-critic-r9/`, **19 sets**, each with its
`capture-manifest.json`. Instruments: `tools/out/art-critic-r9/{inst9.py --selftest, thick9.py}`.

**Method.** Every "ours" panel is decimated from the captured 960×672 to true native **320×224**
and judged at that resolution before any zoom. Arcade figures get the same treatment. Every tick
index is quoted with the URL that produced it. **Subject-static is declared on every figure**, per
the new citation field.

---

## 0. Instrument validation, before any number below was trusted

| control | result |
|---|---|
| Capture is a pure 3× nearest upscale | **worst within-3×3-block channel spread 0 over all 188 frames tested** — decimation is exact recovery, not an approximation. Verified, not assumed |
| Decimation can fail | a **bilinear** 3× control returns spread **140** |
| Colour-patch operator | identical 7-colour palette, identical mask: concentric rings **211.8 px** mean patch, pixel dither **1.0 px**. Discriminates arrangement by 212× and is not a palette artefact |
| bbox-fill operator | filled rect **100.0 %**, an X **9.3 %** |
| 8- vs 4-connectivity | a diagonal chain is **1** component at 8-conn, **9** at 4-conn (the topology condition the drawing lane paid 78 px for) |
| **Reproduction of the round's own anchor** | my independently written `thick9.py` returns the arcade day-banked jet at **ink 1056, span 109.7, RSW 3.65** — `lane-drawing.md` §2.6's published anchor **to the digit**, from a separate implementation |

### Things I measured, cropped, and threw away

These are not throat-clearing. **Four of my own numbers died on the crop-and-look rule, and two of
them would have been headline findings.**

1. **"The arcade's molten core is 175–225 % of its plate."** Impossible on its face. Cropped:
   the red mask was reading **the red `B` of BURNER** and the red `INSERT COIN`, on both sides.
   Withdrawn and rebuilt inside the plate's own footprint.
2. **"The far LOD is 76–92 % filled at 2–6 px."** Cropped
   (`fig-farlod-ours-12x.png`): **most of those components were HUD lock-on brackets, not
   aircraft.** That is the **fourth** time the HUD has been counted as an enemy in this project
   and I nearly made it the fifth. Re-run with bracket ink excluded by colour: 1602 "sprites"
   became **86**.
3. **"1602 enemy sprites over 24 frames" (67/frame, with `MAX_ALIVE` 6).** Impossible. The cause
   was differencing against a clean frame at a *different tick*, so the animated sea counted as
   sprites.
4. **"Small clouds have a 120 px mean colour patch."** Patch == ink means one flat blob. Cropped
   (`fig-check-cloudmask.png`): the small components were **the player jet, the carrier deck and
   the HUD reticle**. Only components over 2 000 px are clouds; the rest are withdrawn.

**My absolute cloud and fill figures are not comparable to R8's** — different masks, same names.
I quote only trends within my own operator. This is the "same name, different operator" family.

---

## 1. Blunt assessment

**R9 is the first round whose work I can see without a microscope.** The pacing is arcade-correct,
the title is alive, the far LOD is an aircraft, and the player's wings have become blades. Four
real things, and none of them is a statistic dressed up as art.

And then:

> **The lane that could draw drew two sprites out of eight, and the six it did not draw include
> the one that owns 69 % of the enemy pixels on screen. The player's wings became blades and its
> body stayed a slab with a face on it. And DRAW-WEIGHT — the round's new drawing criterion —
> scores the untouched sprite BETTER than the redrawn one on every statistic it has.**

That last clause is the round's most important finding and it is not a blind spot. The lane
honestly declared DRAW-WEIGHT blind to silhouette. It is worse than blind: **on the one comparison
in this repo where we know which of two drawings is better, the criterion's sign is inverted.**

The best thing in the build is the pacing — **sky emptiness 39.4 % against the arcade's 39.7 %**,
from 0.0–3.1 % before. The worst thing in the build is **the first screen the player sees**, the
carrier launch, which is untouched since R7 and is the ugliest frame in the game.

---

## 2. Has the defect relocated again — and to where?

**Yes, twice, and one of them is a new taxon.**

### 2a. The old pattern, intact: *a lane fixes the object that was named and the defect survives in the class*

R8 named `interceptor` and `prop` head-on as "solid filled deltas". The drawing lane fixed
`interceptor` and `prop` head-on. **Of the eight day enemy sheets, exactly two changed** — verified
by md5 against both `ea3726b` (R8's tree) and `52edcc4` (the lane's own stated start):

| sheet | status | share of stage-1 enemy **screen area** |
|---|---|---|
| **`enemy-grey-head.png`** | **UNCHANGED** | **69.2 %** (fighter 62.4 + bomber 6.8) |
| `enemy-interceptor-head.png` | **REDRAWN R9** | 24.0 % |
| `enemy-grey-rear.png` | **UNCHANGED** | 6.8 % — *and it is R8's **rank 2*** |
| `enemy-camo-*`, `enemy-prop-rear`, `enemy-interceptor-rear` | UNCHANGED | stage 2/3 |

*(Shares from 2 417 on-screen enemy observations over 90 s on a 0.1 s grid,
`tools/combat_probe.mjs --ticks 5400 --every 6 --url-params "&demo=1&invincible=1"`, weighted by
`spanFrac²`. Livery mapping read from `enemy.js:LIVERY_BY_STAGE` — stage 1 sends `fighter` and
`bomber` to `grey`.)*

→ `art-r9-03-enemy-GREYHEAD-untouched-vs-INTERCEPTOR-redrawn-5x.png` **(subject static: yes,
authored sheets)**

**Look at the two rows.** The redrawn interceptor has separated blades, dark-red shadow lines
beside each one, a real fuselage and four value steps. It is good work. The untouched `grey` head
directly above it is **a continuous white swept V with one grey underside stripe and a nose dot** —
R8's own words, "a thinner continuous V … closer", left exactly as it was. At engagement scale it
is a **white paper dart**: **46.9 % of its ink is above V 0.85.**

**And R8's rank 2 — "the enemy rear sprite is not an aircraft, it is a nozzle with wings" — is
byte-identical.** Row 3 of the same figure: two wings in a V, one fin, a black-ringed nozzle disc
at the vertex, and **no body of any kind.** Rank 2 of nine was not opened.

### 2b. The new taxon: *a lane fixes the statistic that was gated and the defect survives in the shape*

R8 escalated the pattern to *"a lane fixes the axis that was measured and the defect survives in
the object."* R9 goes one further. The drawing lane measured **thickness** (DENS, RSW, RP90) and
genuinely reduced thickness. **Nothing it measured can see straightness, taper, cant or
curvature** — and after the fix, that is the entire remaining difference between our aircraft and
the arcade's. See rank 1.

### 2c. The class R8 named is not merely un-relocated — it is provably untouched

`render/clouds.js`, `effects/explosions.js`, `render/ground.js`, `game/stage.js`:
**`git diff 52edcc4 HEAD` is empty on all four.** So R8's ranks 4 (fireball), 6 (clouds), 7
(carrier) and 9 (stage-2 ground) stand unaltered by construction, not by my re-measurement. I
confirmed two by capture anyway:

| object | R8 | **R9, re-measured** | arcade |
|---|---|---|---|
| fireball, mean colour patch | 15.5 px | **14.7 px** (6 colours, 22.5 %W) | **3.0 px** |
| clouds, mean colour patch vs width | grows with width | **7.3 px @ 71 px wide → 13.1 px @ 109 px** (monotonic over 9 clouds) | fixed-ratio sprite cells; cannot grow |

The cloud stipple still lives in texture space and stretches. My absolutes differ from R8's
because the mask differs; **the ×1.79 growth over a ×1.54 width change is within my own operator**
and is the part I defend.

---

## 3. Ranked — what most damages the illusion

### 1. The jet is no longer a slab, and it is not yet an aeroplane: it is an emblem built from rectangles
→ **`art-r9-01-jet-LEVEL-ARCADE-top-OURS-bot-8x.png`** — pose-matched, scale-matched (arcade
x-extent 118 px, ours 116 px), level astern. **Subject static: ours yes** (`?fixed=1&seed=1&nocombat=1&noclouds=1`,
tick 80, `bankDeg 0`, `poseSource sheet-day`); **arcade yes** (t175 single frame, level flight).
Arcade side is a 686×480 upscale box-resampled to native-equivalent — **shape only, no colour claim.**

This is the figure to look at before reading another word of this report.

The arcade's F-14 has **fins that cant outward and taper to needle points**, a **wing that leaves
the nacelle on a kink and tapers all the way to a thin tip**, and a **narrow centre section with a
dark V-shaped tunnel between the engine nacelles**. Ours has **two straight vertical parallel
posts**, **two dead-straight constant-width horizontal bars with blunt square tips**, and **a wide
flat cream slab** carrying a pink dash and a curved dark-red line.

Measured — per-column wing chord along the outboard half, one mask per palette (day achromatic for
ours, the licensed night value rule `max(RGB)>30` for t175):

| distance from centre | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | **1.0 (tip)** | **taper** |
|---|---|---|---|---|---|---|---|
| **arcade** | 8.8 | 7.6 | 6.4 | 5.5 | 4.8 | **3.2** | **2.39×** |
| **ours** | 6.5 | 6.2 | 6.6 | **7.5** | 6.7 | **5.7** | **1.09×** |

**The arcade's wing tapers monotonically to less than half its root chord. Ours is a constant-width
plank that bulges before the tip.** The true-native banked arcade frame corroborates at **5.13×**
in its own projection.

And the interior is empty. Internal line-work — adjacent in-ink pixel pairs differing by more than
one ladder rung, per 100 ink px (control: **0.0** on a flat fill, **95.0** on 1 px stripes):

| | internal edges / 100 px |
|---|---|
| **arcade jet, banked, TRUE NATIVE**, span 109.7 | **80.8** |
| **ours**, level in-game, span 115.1 | **49.8** |

**At matched span our aircraft carries 62 % of the arcade's interior line-work.** This is the
drawing lane's own open item 6 ("the remaining gap is interior line-work the arcade has and we do
not") — and the gap is wider on this statistic than on the dark-accent share it was stated in.

**One thing I want named because it is doing real damage and no number will ever find it.** At
native, ours reads as a **face**: two orange nozzle discs as eyes, the pink canopy fleck as a nose,
and the curved `#840000` slot as a **smiling mouth**. The lane moved that slot from `#000000` to
`#840000` for a good palette reason and made it warmer and more legible as a mouth. Straighten it
or break it.

**Fix, in order.** (i) **Taper the wing** — root chord 8–9 px falling to 3 px at the tip; this is
one profile table and it is most of the gap. (ii) **Cant the fins outward and taper them to a
point.** (iii) **Narrow the centre body and put the dark V tunnel between the nacelles**, which is
what stops it reading as a slab. (iv) **Break the mouth.** (v) Then the interior lines.

**Two things to leave alone:** the blades-not-paddles rewrite is correct and is the reason this
round moved at all; and the nozzle discs are right.

### 2. You still cannot find your own aircraft, and now I can say exactly why
→ **`art-r9-04-readability-worst-frame-t406-3x.png`**
(`?fixed=1&seed=1&demo=1&invincible=1`, tick **406**, `bankDeg +18.1`, `graceFlashHidden false`.
**Subject static: no** — ordinary flight; this is one frame of a moving engagement.)

Open that figure and find the player. It is the cream sliver wedged behind the right-hand pale-grey
enemy. Two near-field `grey`-livery aircraft own the centre of the screen.

The occlusion tail has genuinely improved — **>30 % hidden in 3/34 flight frames (8.8 %)** against
R8's 19.5 %, consistent with the pacing lane's claim. *(My baseline is the p90 visible area, which
conflates occlusion with pose; I quote only the tail, and I cropped the worst frame rather than
publishing the number alone.)* The population cut did that, and it was the right fix.

**But the separation defect is untouched and is now measurable.** Player airframe against
near-enemy airframe, same stage, same frame population:

| | V mean | S mean | share V>0.8 | vs sky ΔV |
|---|---|---|---|---|
| **player** | 0.742 | **0.383** | 59.9 % | 0.258 |
| **near enemy** | 0.766 | **0.047** | 45.6 % | 0.234 |
| | **ΔV = 0.024** | **ΔS = 0.337** | | |

**The two aircraft are separated by chroma and by nothing else.** Equal value, equal contrast
against the sky. At 320×224 on a warm-cream-versus-neutral-grey pair, that is not enough, and the
crop proves it.

The arcade's answer is in `art-r9-12-ARCADE-stage1-combat.png` **(stage digit 1 read from the
frame; 1028×720 and 686×480 upscales — composition only)**: its stage-1 enemies are legitimately
pale (REFERENCE row 12 is correct and must not be re-opened) but they are **mid-grey against the
player's cream**, and the player carries **two large hot orange nozzle discs that are the loudest
thing on screen**. We have the nozzle count right. What we have wrong is that **we give the enemy a
loud red-and-yellow nozzle capsule too** (`art-r9-11-enemy-near-echelon-6x.png`), so the one cue
the arcade reserves for the player is spent on both.

**Fix.** Do **not** darken the stage-1 enemy — that is ledger row 12 and it has been retired twice.
Instead: **drop the enemy's nozzle to a dark disc** as the arcade does, and **drop the enemy
airframe half a rung** so ΔV is a visible step rather than 0.024. The hue separation already exists;
give it a value step to stand on.

### 3. 69 % of the enemy pixels on screen are the sprite nobody drew
→ `art-r9-03-...-5x.png`, rows 1 and 3. Covered in §2a; ranked here because it is the direct answer
to *"enemy jets look very bad"* and because the lane has already demonstrated, in row 2 of the same
figure, that it knows exactly how to fix it. **This is forty pixels per cell of work that is
already designed.**

### 4. The first screen of the game is its worst
→ `art-r9-05a-carrier-OURS-3x.png` against `art-r9-05b-carrier-ARCADE-1x.png`
(`?fixed=1&seed=1&demo=1&invincible=1`, tick 34. **Subject static: no** — the launch animation is
running; the carrier's pose is fixed, the jet is mid-roll-out.)

R8 ranked this 7th. I rank it 4th **for one reason it did not weigh: this is the opening shot.**
The carrier launch opens a fresh game (`ef066be`). It is the first thing a player, a judge or the
owner sees, and every one of R7's and R8's defects is present, untouched.

Our deck is **51.2 %W** and the player's wingtips **overhang both edges**. The arcade's deck is
~70 %W and carries parked aircraft at roughly **one sixth of its width** — the aircraft are the
ruler, and ours is about three times too big. Beyond the scale: the hull meets the sea on a
**dead-straight horizontal edge with no waterline, no foam, no bow wave, no wake and no shadow**;
the island is **three grey boxes and a cross** against the arcade's lattice-masted tower with
multiple dishes; there are **no deck markings** where the arcade paints SEGA ENTERPRISE across the
full deck; and the ship is drawn **dead-on from astern**, so it reads as a flat plate rather than a
vessel with length.

**Fix, cheapest first.** (i) **Shrink the jet on the deck** to ~⅙ of the deck width — it is one
scale constant and it fixes the ruler. (ii) **Paint the deck**: a centreline and lettering, which
is where the arcade spends its pixels. (iii) A dark hull band with foam at the waterline.

### 5. The title is alive, and the plate does not fly at you
→ `art-r9-06a-title-OURS-8-phases-2x.png` against `art-r9-06b-title-ARCADE-8-phases.png`
**(subject static: NO on both — every panel is one phase of a tumbling, approaching object.
Our ticks 3/18/33/48/63/78/93/108 at `?showtitle=1&fixed=1&seed=1`; arcade t70/72/73/74/76/78/80/82
from `ab2-longplay.mp4`.)**

**This is the round's best-executed lane and I want that on the record.** R8 found 24 frames over
120 ticks collapsing to **one** image. I find **30 unique native images in 30 consecutive ticks**.
The letterforms are sheared with chiselled terminals, the oversized blue `A` and red `B` bookends
are there, `INSERT COIN!` has its trailing `!` and blinks, and the plate tumbles through face-on,
edge-on and back. **It reads as the arcade's title screen.** There is also now an **attract-mode
gameplay demo** — the title hands off at tick 473 — which closes half of gap 8.

**What is missing is the approach, and it is structural.** Over a full cycle (43 title-state frames,
473 ticks, ~1.85 tumble periods):

| | plate ink, peak | swing across the cycle | bbox width range |
|---|---|---|---|
| **arcade** | **41.6 % of the frame** | **46.5×** | 28.6 → **100 %W** |
| **ours** | **7.3 %** | **4.8×** | 32.8 → 46.6 %W |

**The arcade's plate flies at the camera until it fills the screen and the wordmark sits on a
full-screen field of spheres. Ours tumbles in place inside a box half the screen wide.** This is
not a tuning gap; `titleScreen.js` has no approach term at all — `PLATE_N × PLATE_PITCH` is a fixed
120 native px at screen centre, and `s = PLATE_CAM/(PLATE_CAM − z)` only varies **per ball** across
the tilt. Read from the source, then confirmed over a full period.

**And this is the relocation pattern again, on the round's best lane.** Row 43 established that the
plate *tumbles*; the lane implemented the tumble beautifully. The same sentence in the same ledger
row says the plate **"tumbles continuously AND APPROACHES THE CAMERA"**, and the approach — the
other half of one motion — was not built.

Second, smaller, and read off the crop rather than an area statistic: **the molten strokes are one
ball wide where the arcade's are two.** `MOLTEN_CELLS` is literally an **`H`** — two 1-cell stems
joined by a single central crossbar. The arcade's (`fig-arc-molten-t72-2x.png`) shows **2-ball-thick
bars with no central crossbar** — a roman **`II`**, which is what the game is called. *The molten
area budget is fine* (ours 15.0 % median, arcade 18–23 % at approach), so this is **the same ink
spent on more, thinner strokes**: a wireframe where the arcade has a mass burning through.

### 6. The far LOD is fixed, and the invariant still owns the smallest sizes
→ `art-r9-07-farLOD-OURS-12x.png` **(subject static: no — in-flight sprites,
`?combatonly=enemies&noclouds=1&hidejet=1&invincible=1`)**

**Answering the brief directly: yes, it reads as an aircraft.** At 4–9 native px these are crosses
with a dark core, darker wingtips and sky around them. R8's literal rectangle is gone and the
rebuild is a real success. It also matches the arcade's own stage-1 distant enemy
(`crit-r9-05`), which is a pale wing bar with a dark core and a fin stripe.

86 enemy aircraft over 24 frames, **brackets excluded by colour** (see §0.2):

| rendered span | n | mean bbox fill | arcade |
|---|---|---|---|
| 2–6 px | 8 | **66.9 %** | — |
| 6–10 px | 11 | **59.4 %** | — |
| 10–14 px | 14 | 41.0 % | — |
| **14–20 px** | 14 | **33.3 %** | **30.6–34.6 %** ✓ |
| 20–40 px | 26 | **32.0 %** | ✓ |

**Above the detail switch we are inside the arcade's band. Below it — where `drawRearFar()`
actually runs — we are at 59–67 %**, because the FULL-WIDTH-BAND invariant guarantees that at a
2–3 px quad height most of the sampled rows *are* the full-width bands. The authored cell is 56.3 %;
the rendered sprite at 2–6 px is 66.9 %.

STATUS.md records **"56.3 % is this design's floor, not a miss … Do not open a gap for the
residual."** I accept the arithmetic and dispute the conclusion, narrowly: **the shaped sheets
already hit the arcade band at 10–14 px**, so the invariant is not protecting anything the shaped
sheets cannot do. The lane named the lever itself — lower `DETAIL_SWITCH_NATIVE_PX` — and called it
a combat-lane call. **It is the right call and somebody should own it.** Not a new gap; an existing
one with an owner.

### 7. The hulk has its highlight and still no smoke, no fire and no debris
→ `art-r9-09-hulk-no-smoke-no-debris-3x.png` (`?forcedeath=4&demo=1`, ticks 380/420/460/500,
`deathPhase tumble`. **Subject static: no** — mid-tumble.)

The highlight landed (brightest tone 23.0 % → 1.4 % of the sheet, remapped max 123 → 189) and the
lane correctly refused to chase the night-derived p95. **The visible defect R8 named is unchanged:
a flat dark-red airframe falling through clear blue sky.** `debris.png` and `smoke-puff.png` exist
in the tree. The drawing lane filed an explicit cross-lane request — *"Request to the flow lane:
emit `smoke-puff` and `debris` from the tumbling hulk. The art exists."* — and
`src/game/flow/deathSequence.js` is unchanged this round. **The request was not refused; it was
not answered.** That is a process gap, not an art one, and it is the cheapest remaining win in the
build.

### 8. The fireball is still five balloons
→ `art-r9-08-fireball-OURS-unchanged-5x.png` (`?combatexpl=1&noclouds=1&hidejet=1`, tick 84.
**Subject static: no** — peak of an animating explosion.)

Unchanged by construction (`effects/` untouched). Four golden discs in a quincunx round a white
core with clean concentric banding, inside a ragged dark-red rim. **Mean colour patch 14.7 px
against the arcade's 3.0.** R7's and R8's fix lists stand; I have nothing to add except that it is
now the most conspicuous untouched object in the build.

---

## 4. The owner's verdict: *"our jet is still not good enough"*

**He would still say it — but for the first time I would expect him to say something different
about it, and the difference is the round's real progress.**

After R7 the sentence meant *"that is a cream blob."* It is no longer a cream blob. In ordinary
play at native (`art-r9-10-play-TRUE-NATIVE-6-frames.png`) the aircraft reads as an F-14: twin
orange nozzles, blades with sky between them, fins. **Three of the four things R8 named are fixed**
— the paddles are blades, the rabbit-ear fins are filleted, the budget and palette are right.

**What now carries it is shape, and it is one sentence: every line in our aeroplane is straight,
constant-width, and either horizontal or vertical.** The arcade's wing tapers 2.39× to its tip;
ours tapers 1.09× and bulges on the way. The arcade's fins cant outward and come to a point; ours
are parallel posts. The arcade's centre is a narrow tunnel; ours is a slab. And at matched span the
arcade carries **1.62×** our interior line-work.

**I was asked not to reach for a value or palette statistic, and I did not need to** — every one of
those passes and I checked before looking further. The two statistics above are geometry, both are
pose-matched and scale-matched, and the crop in `art-r9-01` shows both without arithmetic.

**The honest bound.** The pose-matched arcade side is **t175, a 686×480 upscale box-resampled to
native-equivalent** — legitimate for taper, cant and chord, which are proportions, and illegitimate
for anything about colour. Acquisition item 2 still blocks the colour half. The internal-line-work
statistic is **palette- and scale-sensitive**; I quote it only at matched span, and only between
our jet and the arcade's, never between our sheets and the arcade's cells.

---

## 5. DRAW-WEIGHT: does it measure what I look at?

**No — and the failure is sharper than "it has blind spots".** On the one comparison in this
repository where we have unambiguous ground truth about which of two drawings is better, **the
criterion prefers the worse one.**

The sheets' own alpha channel as the mask, so there is no mask discretion at all:

| | ink | span | DENS | SW | RSW | **RP90** |
|---|---|---|---|---|---|---|
| `enemy-grey-head.png` — **untouched continuous V** | 454 | 47.3 | **203.2** | 4.00 | **8.46** | **15.26** |
| `enemy-interceptor-head.png` — **R9's redrawn blades** | 446 | 45.2 | 218.5 | 4.00 | 8.85 | 18.25 |

**Lower is "lighter", so DRAW-WEIGHT says the untouched sprite is the better drawing on DENS, on
RSW, and on the gate itself, RP90 — and calls the redraw a 20 % regression.** Bbox fill agrees with
it (35.0 % vs 37.3 %). The mechanism is plain once stated: **a thin continuous sheet is thin
everywhere.** RP90 rewards thinness; the arcade's aircraft is bladed *and* thin; ours can be
thin-and-continuous or bladed-and-thicker, and the gate prefers continuous.

The lane's own box says *"a density statistic cannot separate a slab from an X of separated
blades"* and gates on RP90 **because** control 7 separates that pair ×1.811. **Control 7 is a
synthetic.** On the real pair — two sheets from this build, one of which is a known improvement on
the other — RP90 separates them **×1.20 in the wrong direction.** That is the lane's own standing
rule turned on its author: *no stability claim from a synthetic whose stroke width you chose;
measure on the real subject.* It applies to **discrimination** claims too.

**What it misses, concretely:** taper, cant, straightness, curvature, where the ink is, internal
line-work, and animation. Six of those are the whole of rank 1.

**What I would add, with its control and its limits.** Internal line-work density — adjacent in-ink
pixel pairs differing by more than one ladder rung, per 100 ink px. Control: **0.0** on a flat
fill, **95.0** on 1 px stripes. It returns arcade **80.8** vs our jet **49.8** at matched span, and
it ranks the enemy pair **73.1 (redrawn) over 67.0 (untouched)** — the right way round, where RP90
is inverted. **Its limits, stated before anyone gates on it:** it is palette-sensitive (more
colours score higher) and scale-sensitive, so it is only readable at matched span and matched
palette, and it would need the same ground-truth-on-both-sides treatment the mask rules got. **I am
proposing a candidate, not a gate.**

**I also tested and rejected one of my own.** Runs-per-row looked like the obvious silhouette
statistic and separates arcade 2.07 from ours 1.89 — but it returns **1.48 vs 1.54** on the enemy
pair, which is too thin to carry a gate. Recorded so nobody rebuilds it.

**And the process point.** DRAW-WEIGHT was validated against synthetics, against rotation, against
two implementations, against three mask rules and against our own alpha. **It was never once run on
two real sprites whose relative quality was already known.** That test takes ten minutes, it exists
in this build for free, and it is the only one that found the inversion.

---

## 6. Pacing as composition

**The numbers are right and I could not break them.** 900 samples, 90 s, 0.1 s grid, from the
simulation's own state rather than pixels:

| | ours | arcade |
|---|---|---|
| sky empty of enemies ≥3 %W | **39.4 %** | **39.7 %** |
| readable presence ≥10 %W | **35.9 %** | 33–44 % (stage 1) |
| empty runs | 8 runs, **median 4.5 s, max 7.1 s** | — |
| mean alive | **2.69** (max 6) | — |
| biggest enemy exceeds player span | **0.1 % of frames** | — |

**The sky genuinely empties now**, for four to seven seconds at a time, where the longest empty run
in 90 s used to be 0.32 s. Run-length beside the percentage was the right call: these are eight
real silences, not two hundred flickers.

**Does the screen compose like the arcade's? Mostly yes, with one named exception.** The quiet
frames are good — a jet over water with one distant contact is hard to tell from an arcade
screenshot. The busy frames are not, and it is not density: **12.6 % of frames put a ≥10 %W enemy
inside the player's central box and 4.6 % put two there.** Combined with the ΔV 0.024 of rank 2,
two or three identical near-white aircraft at the same value overlap into one white mass
(`art-r9-11`). The arcade's equivalent frames hold aircraft at **different scales, different
attitudes and different values**; ours arrive as a neat diagonal echelon of identical copies —
gap 11's "single-file diagonal queue", still visible.

**And I could find my own aircraft, which my predecessor could not.** That is a real improvement
and the hue split earns it. It is still work, and rank 2 says what would make it free.

---

## 7. Where the build has genuinely arrived

| | measured | state |
|---|---|---|
| **Pacing** | emptiness **39.4 %** vs arcade 39.7 %; presence 35.9 % in a 33–44 % band; 8 empty runs, median 4.5 s | **The best work in the round.** A five-round closed loop between two of our own numbers, broken by going to the arcade |
| **The title is alive** | **30 unique native images in 30 consecutive ticks** (R8: 1 in 120 ticks); sheared chiselled letterforms, bookend `A`/`B`, blinking `INSERT COIN!`, attract demo hands off at tick 473 | R8's rank 5 substantially closed; half of gap 8 closed |
| **The far LOD** | 100.0 % fill → **33.3 % at 14–20 px, inside the arcade's 30.6–34.6 %**; reads as a dart at 4 px | R8's rank 3 closed above the detail switch |
| **The player's wings** | paddles → blades with `#840000` shadow lines; fin fillets closed; chord profiled per station | Three of R8 §4's four points closed |
| **Head-on interceptor/prop** | solid deltas → separated blades with a fuselage; fuselage width 29.0 % → 12.9 % | Closed, on 24 % of enemy area |
| **Occlusion tail** | >30 % hidden **19.5 % → 8.8 %** of flight frames | Real, and it came from the population cut |
| **Ladder closure** | 19 authored sheets, **0 off-ladder**, worst per-channel 10 against ≤32 | Held. The round added two sprites and a whole title screen without breaking it |
| **Self-reporting** | four lanes, nine self-reported defects, none found by a reviewer | I verified three of them independently (the topology bug, the night-mask bug, the molten-area retraction) and all three were reported accurately and against the lane's own interest |

---

## 8. Coverage, and what is not in this report

**Covered:** the title at 1-, 3-, 7- and 11-tick spacing over a full tumble period plus the attract
handoff; the carrier launch; ordinary demo play at two seeds; the player jet isolated level and
banked, by difference against a tick-matched `?hidejet=1` frame; enemies isolated and solo; all
eight day enemy sheets as authored canvases; the explosion on its harness; the full death cycle
through fireball → starburst → tumble; clouds; the occlusion pair at 41 matched ticks; 90 s of
simulation state at 0.1 s.

**Not covered, and their absence is not evidence they are fine:** audio; stage 2 and stage 3 as art
(no world lane ran and `ground.js`/`stage.js` are untouched, so R8 §9 stands by construction); the
tally, READY and CONTINUE cards; the barrel roll; the missile trail; the nose sight's size; the
sea, which I spot-checked and did not attempt to re-anchor.

**Caveats, in the order I would distrust them:**
1. **The pose-matched jet comparison rests on t175, a 686×480 upscale.** Proportions only. Taper,
   cant and chord are safe; nothing about colour is.
2. **Internal line-work is a candidate statistic, not a validated criterion.** Palette- and
   scale-sensitive; readable only at matched span.
3. **My occlusion baseline is the p90 visible area, not a pose-matched baseline.** It conflates
   occlusion with pose. Only the tail is quoted, and the worst frame was cropped.
4. **The enemy screen-area shares are from `?demo=1` on stage 1**, one 90 s window, one seed.
   The livery mapping is read from source and is exact; the weighting is not.
5. **My cloud and fill absolutes are not comparable to R8's** — different masks, same names.
6. **`?demo=1` displaces every stage boundary by 211 ticks**, which I measured directly in the
   death capture (launch ends at tick 212). No stage claim here rests on a tick index.

**Captures:** `tools/out/art-critic-r9/{title,title1,title7,titlelong,launch,play,play2,clean,jet,
jetbank,enemies,ensolo,expl,death,death2,death3,tally,occon,occoff,arc-title}/`, each with its
`capture-manifest.json`. **Instruments:** `tools/out/art-critic-r9/{inst9.py --selftest,
thick9.py}`; probe output `tools/out/art-critic-r9/pace.jsonl`.

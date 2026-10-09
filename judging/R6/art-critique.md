# R6 Art Direction Critique — *does this look like a 1987 Sega arcade game?*

**Role:** arcade pixel-art director. Fresh context. **Report only; no code was changed**
(`git status --short -- src/` returns 0 lines at write time).
**Build:** `main` @ `e8fed58058dd9a0a9d28f11e01ccd88f2dec26ea`, working tree clean at capture
time; the only files I added are this report and `judging/R6/art-r6-*.png`.
**Captures:** all mine, `tools/out/art-critic-r6/` (+ `-native/` decimations, `-vid/` arcade pulls).

**Method.** Every "ours" figure is a frame decimated from the captured 960×672 to true native
**320×224**, judged at that resolution first, then zoomed nearest-neighbour. Every arcade
figure gets the same treatment, and every arcade frame I quote had its **HUD stage digit read
before it was used**.

---

## 0. Instrument validation, before any number below was trusted

| control | result |
|---|---|
| Capture is a pure 3× nearest upscale | worst within-3×3-block channel spread **0** across all 139+ frames → decimation is lossless, not an approximation |
| Decimation correctness | `decimate(nearest_3x(base)) == base` exactly, on a random control; a bilinear 3× control returns spread 130, so the test can fail |
| Colour-cardinality operator | returns exactly **3** on a 3-colour synthetic |
| **Ladder-membership operator** | both true-native arcade stills return **0 off-ladder channel values** (31 and 17 values) against REFERENCE.md's enumerated table. The instrument agrees with the hardware on the hardware's own output |
| Black/duplicate sweep | **0 black frames**. The only duplicates are the `title` set: **4 byte-identical frames over 120 ticks** — the title is still static (§6.10) |

### One read I got wrong, caught before publishing

I first read `ab2-arcade-night-banking.png`'s stage digit as **5**, which would have contradicted
the whole project. It is a **3**: cropping the digit out of `stage3-night-level-t175.png` (stage
identity from the longplay map) shows this font draws 3 as *top bar → gap → short right-leaning
notch → bottom bar*, with no middle bar, which reads as a 5 at native. The still is stage 3 as
documented. Noting it because the next person to check will see the same thing.

### Three measurements I took and discarded, and two claims I withdrew

This project pays for silent wrong numbers, so these are on the record.

1. **Large-scale foam clustering** (block-dispersion index of the foam mask). **Discarded:
   resolution-dominated.** The *same content* scores 6.11 at native and **61.37** resampled to
   686×480. At matched native the arcade's clean frame scores 6.22 against our 5.72–13.49 — no
   discrimination at all.
2. **Depth stratification of foam run length** (near/far ratio, foam fraction fixed per band).
   **Discarded: contaminated.** The arcade's "far" band is the horizon haze strip, not foam
   (t116 returns 7.12 for a flat band of sky-coloured water). The one clean arcade reading
   (t104) gives 2.35 against our 2.36–3.56.
3. **Foam anisotropy**, corr(0°)/corr(±30°). **Discarded: the arcade side will not hold still.**
   Four stage-digit-verified clean open-sea frames give **1.00, 3.66, 24.97, 39.86**. Ours give
   1.30–3.87 — inside the arcade's own range. One frame is not a distribution and four frames
   spanning 40× are not either.
4. **Withdrawn:** "the arcade's stage-1 sky is graded toward the horizon where ours is flat."
   **False.** Both are a flat fill; the apparent gradient in my first crop was a cloud bank.
   Arcade `#009eff`, ours `#009fff` — 1/255 apart, exactly as STATUS records.
5. **Withdrawn:** "our near-field foam aligns radially along the perspective rays." The
   orientation operator peaks at **0° in both the left and the right third**, so there is no
   systematic radial bias. What I saw was local.

**The honest consequence: I have no instrument that discriminates the *structure* of our sea
from the arcade's.** Every structural operator either reverses with resolution or has an
arcade-side variance larger than the effect. That is the same wall that retired ledger rows
6/16/17, and it is a direct consequence of holding **no true-native stage-1 frame**. Where I
make a structural claim about the sea below, it is labelled as art direction from the crop, not
as a measurement.

---

## 1. Blunt assessment

**Your predecessor's sentence is retired on its subject and alive on its mechanism, and the
mechanism has moved one object to the right.**

The sea was not merely made to pass a gate. It was rebuilt into the right medium and it looks
like water in an arcade game: **15 colours** in a 280×48 patch where R5 measured 8,055, every
value on the 5-bit ladder family, foam that translates coherently frame to frame instead of
scintillating, and a whole stage-1 frame at **39–51 colours / 20–21 channel values** against
13,879 / 254. It also passes the SEA-DASH extremal pairing *honestly* — largest bright component
34–95 px against the arcade's 82, max width 18–39 against 38, count 300–313 against 389. That
pairing exists specifically to catch a sea that games the averages, and ours does not game it.
**This is the largest single piece of work in the project's history and it landed.**

And yet, when you shoot something:

> **The water now looks like 1987. The fire does not — and it is the second thing anyone sees.**

Under the scripted combat demo, our frames hold **51–67 colours and 28–39 channel values** right
up to the moment a missile connects, and then go to **546–889 colours and 244–255 channel
values** — against gates of ≤256 and ≤32, and against the arcade's own 138/31. One object owns
all of it, exactly as the sea did in R5. The explosion is drawn in continuous tone, it is
punched through with **holes of literal sky**, and it decays by **dissolving to transparency**
through off-palette lavender and pale green rather than by swapping to smoke. An arcade cabinet
cannot do any of those three things.

So the gap did not close by half — it closed completely in one place and relocated. The reason
is worth naming because it is now a pattern: **a lane fixed the object that was named, and the
defect lives in the mechanism, not the object.** R4 named the sprites; the sea kept the defect.
R5 named the sea; the explosion kept it. Nobody has yet audited the build for *"which objects
are still composited in continuous tone"* as a class. The answer, measured this round, is
exactly one: **explosions**. Clouds (44 colours / 20 values), the missile trail (51–67 / 21–28),
the HUD, the sea, all three grounds and both jet sheets are clean.

---

## 2. Where the build has genuinely arrived

Stated without hedging, because several of these are large and two overturn my predecessor.

| | measured | state |
|---|---|---|
| **Stage-1 sea medium** | 280×48 patch: **15 colours** (was 8,055). Whole frame 39–51 colours / 20–21 chan values (was 13,879 / 254). H-identity 80.3 %, V-identity 57.3 % on the published band (was 31.9 / 0.1) | **R5's headline defect is dead.** And it passes SEA-DASH, not just the averages |
| **Sea in motion** | foam marks translate coherently over consecutive 60 Hz ticks; no re-randomisation. Foam share drifts 6.5–10.6 % slowly | Reads as water, not as noise |
| **Criterion A, stages 1 and 3** | stage 1 **51 / 21**, stage 3 **42–47 / 25–26** — all four gates pass | Two of three stages are clean |
| **Stage-3 city lights** | multicoloured white/cyan/yellow/red with radial streaking, against the arcade's own multicoloured field | Genuinely convincing; the best-looking thing in the build |
| **Night jet palette** | our 4 blue-greys are drawn from the arcade's own measured 6; night keyline is `#425284`, **not black**, which is correct | Correct, and correct *for the right reason* |
| **Night cloud palette** | `#f7f7f7 / #e6d6e6 / #d6c5d6 / #c5b5c5`, V median **0.902** — the arcade native still gives the same four and **0.902** | Exact |
| **Stage-1 cloud sizing** | ours cover 0–25.3 %, largest 2,866–5,004 px; arcade (4 verified frames) 0.8–22.4 %, largest 156–4,313 px | In band. R5 gap 7 closure holds |
| **HUD 1-bit quantization** | the reticle region holds **3 colours** — sky, `#000000`, `#f7f7f7`. Zero partial alpha | The hud-quantize lane's claim verifies independently |
| **Explosion core** | white-hot core, yellow ring, orange body, ragged dark-red rim with spikes | Reads as **fire**. R5's judgement to hold the core under the number was right and still is |
| **CONTINUE card colours and size** | cyan-green CONTINUE PLAY, cream countdown, **red** INSERT COIN, ~32 %W against the arcade's ~34 %W, drawn over the live scene as the arcade does | R5 gap 9's colour and sizing half is **closed** |
| **Title "II"** | ours **119 px tall at x130–227**; arcade **121 px at x130–227** | **I overturn R5 here** — see §6.10 |

### The jet's value ceiling: half the fix landed

R5 was right that the V ≤ 0.77 ceiling was a defective criterion, and removing it helped. But
the replacement band (V median 0.78–0.92) is **still below the arcade**, and the dominant defect
was never the median. See §6.2 — this is rank 2.

---

## 3. Ranked — what most damages the illusion

### 1. Explosions are the last continuous-tone object, and they own the screen when they fire
→ `art-r6-06-explosion-ours-TOP2-arcade-BOT.png`

Three separate defects, one cause.

**(a) Cardinality.** `?demo=2`, whole frame at native:

| demo=2 frames | content | colours | channel values |
|---|---|---|---|
| 0–11 | trail + enemies, no fire | 51–67 | 28–39 |
| **12–18** | **fire on screen** | **546–889** | **244–255** |
| gate | | ≤256 | **≤32** |
| arcade `ab2-arcade-desert.png` — *which contains an explosion* | | 138 | 31 |

Reproduced on a second harness: `?combatexpl=1`, the fireball body patch alone is **215 colours
/ 200 channel values**. The core and rim patches are 32 and 29 colours — so it is the *body*
that is composited, not the sprite edges.

**(b) Holes of sky.** The light-blue flecks inside the fireball are not debris — they are the
background. On the player-death starburst I count **six**, and at the bottom of the fireball the
"debris" is dark blue *with foam in it*: it is the sea, read through the sprite. The arcade's
starburst has **no sky showing through anywhere**; its debris is maroon and flies *outside* the
fire.

**(c) The decay is an alpha dissolve.** Three consecutive native frames of the fade go
fire → translucent lavender/pale-green → gone. Those intermediate hues exist in no palette; they
are the fireball at partial opacity over `#009fff`. The arcade decays into a **dark grey smoke
mass** (clearly visible surrounding its starburst) and never becomes transparent.

**Fix, in priority order:** (i) draw the fireball with hard alpha from a fixed palette — the
authored art is already good, it is the compositing that is wrong; (ii) make the interior
specks **opaque maroon/grey debris** instead of punched alpha; (iii) replace the opacity ramp
with a palette sequence ending in two or three dark smoke greys. (i) and (iii) together take the
build to a clean ≤32 channel values in every frame of play.

### 2. The player jet is ringed in pure black; the arcade's is not
→ `art-r6-02-jet-ours-TOP-arcade-native-BOT.png`

Matched operator, both sides: *airframe* = sprite pixels with B>100; *rim* = the pixels
immediately outside that mask.

| | airframe px | **airframe colours** | V median | V>0.80 | **rim near-black** |
|---|---|---|---|---|---|
| **ours, day** | 1 030 | **4** | 0.839 | 70.5 % | **97.3 %** |
| arcade `ab2-arcade-desert.png`, **true native** | 1 107 | **21** | **0.969** | **90.2 %** | **10.2 %** |

The pixel counts are within 7 % of each other, so this is two jets at the same on-screen size.

- **The rim is the headline.** Ours is 97.3 % pure `#000000` — a continuous outline. The
  arcade's rim is **28 % `#840000`** (a dark warm shadow on the lit-from-one-side edge),
  **22 % the bare sky itself**, and only 10 % black — and that black is the two nacelle rings.
  The arcade shades its edge; we outline it. At native this is the single thing that makes our
  jet read as a sticker laid on the sky rather than an object in it.
  *Corroborated on stage 1:* the t116 crop at full video resolution shows no dark rim at all
  against the blue sky, so this is not a stage-2 artifact.
- **4 airframe tones against 21.** Ours is `#ffffef` 39.7 %, `#d6d6a4` 30.0 %, `#a48484` 29.5 %
  — three flat slabs in near-equal thirds. The arcade runs a finely graded warm cream ramp
  (`#ffffef`, `#f7e6b5`, `#f7f7e6`, `#f7f7b5`, `#e6e6a4`, `#d6b584`, `#ceb59c`, `#c5c584`…) and
  puts only **8.7 %** at `#a48484`, broken up by its neighbours — where we put **29.5 %** of the
  airframe in one unbroken mauve-grey block.
- **V median 0.839 vs 0.969.** The new R6 band is 0.78–0.92; the arcade's own true-native
  daylight jet is **above the band's ceiling**. The band was derived from video frames (0.816–
  0.922, blur-inflated at edges yet still *higher* than ours). The ceiling was raised and still
  undershot.
- Secondary, visible in the crop: our nacelle rings are **rounded squares**; the arcade's are
  **round discs**, proportionally larger against the fuselage, with a bright core.

**This is the direct answer to your question 2, and the answer is no: it has not overshot.**

**Fix:** delete the black keyline from the day sheet and replace it with a one-sided warm
shadow edge (keep black only on the nacelle rings — the arcade does); split `#a48484`'s 29.5 %
across three intermediate creams; lift the body ramp so the median lands near 0.95.

### 3. Stage 2's racetrack is not gone — it is now an actual road
→ `art-r6-04-stage2-ours-TOP-arcade-native-BOT.png`

**Answering your question 4 directly: no.** R5 called it "a longitudinal streak field". It is
now worse-formed as an illusion, because it has resolved into **a single hard-edged pale strip
running from the vanishing point down the exact centre of the screen to the bottom edge**,
symmetric about the flight axis, flanked by two soft dark-brown blotches. It reads unambiguously
as a runway. A diffuse streak field is ambiguous; a road is not.

The arcade's desert, on its own true-native frame, is **not a floor at all** in that shot: it is
a near-vertical **diagonal mass** of chunky rock-and-vegetation dither occupying the left half,
with a hard boundary against brilliant open gold, running off the top of the frame. There is no
horizon line and no axial feature of any kind.

Two supporting measurements that sharpen the fix:

- **We are now under-textured, not over-textured.** Ground band rows 150–198: **ours 21–26
  colours, arcade 47.** H-identity **ours 73–76 %, arcade 63.1 %** — ours has *longer flat runs*
  than the arcade's. The R5 palette-snap overshot: the arcade's desert is richer and chunkier
  than what we now draw.
- **Stage 2 is the only non-combat frame still failing a Criterion-A gate, and it fails by one
  value for a locatable reason.** Whole frame **33 channel values** against ≤32. Rows 118–150
  alone carry 29 of them; the rest of the frame carries 17. That band is the horizon glow, and
  it steps `#e67300 → #e98500 → #eb9500 → #f0ae00 → #f2ba00 → #f5c400 → #f7ce00` — banded, but
  **14 of the frame's values are off REFERENCE.md's enumerated ladder** (233, 235, 238, 240,
  242, 245, 133, 149, 162, 174, 186, 196 …). **Snapping the glow ramp to the published table is
  a one-line change that closes the last non-combat gate failure.**

### 4. The HUD reticle reads as heavy because of a keyline the arcade does not have
→ `art-r6-03-reticle-ours-TOP-arcade-native-BOT.png`

**Answering your question 3.** The quantization worked: the region holds **3 colours** and
**zero partial-alpha pixels**. Aliasing is not the problem. But it still does not read as 1987,
for a different reason, and it is measurable:

| | white ink | stroke runs | **rim** |
|---|---|---|---|
| **ours** | 67 px, incl. a **33 px bar** | 18 runs of 1 px, 4 of 4 px, one of 33 | **100 % pure `#000000`** |
| arcade `ab2-arcade-desert.png` native | 85 px | **57 runs of 1 px**, four 7 px arms | **96 % bare sky**, 1.8 % near-black |

The arcade draws its HUD brackets as **bare 1-px white strokes straight onto the scene**. We
draw 1-px white strokes *inside a continuous black keyline*, which roughly triples the apparent
weight and converts a light instrument overlay into a heavy graphic element. The arcade's night
still confirms the architecture is right — it does carry a top-right roll indicator, a thin
white line with corner brackets and a small yellow marker, tilted with the bank — so the concept
is correct and only the weight is wrong.

Secondary: the rotated attitude line is a rasterised diagonal, and at 45° it is a chunky
staircase inside a 2-px black keyline, ~5 px wide and ragged. Under roll in `demo=2` it breaks
into a lumpy zigzag. Authored rotation cells, as the jet already uses, would fix it.

REFERENCE.md's own R6 HUD ruling licenses a black keyline on **two** elements — the stage digit
and the missile stock. The reticle appears to have been given one anyway, and the arcade's has
none.

### 5. The sea's hue: our water has half the green it should
→ `art-r6-01-sea-ours-TOP-arcade-t93-t95-t116.png`

This is the one sea defect I can prove. **Region mean RGB of the sea band** — selection-free,
and invariant to both box-downsampling and 4:2:0 chroma subsampling, which is why I use it:

| source | mean R | mean G | mean B | **G−R** |
|---|---|---|---|---|
| **ours**, 4 frames | 13.5–18.4 | **28.8–37.8** | 200.8–223.6 | **+15.4 … +19.7** |
| arcade t93 *(digit 1, open water)* | 35.1 | 66.0 | 228.2 | **+30.9** |
| arcade t116 *(digit 1, level flight)* | 15.0 | 54.8 | 221.1 | **+39.8** |
| arcade t95 *(digit 1, open water)* | 17.8 | 63.5 | 220.4 | **+45.7** |
| arcade t118 *(digit 1, open water)* | 44.5 | 170.7 | 251.6 | **+126.2** |

Four stage-digit-verified clean frames (land < 2 % of the band), and every one is above us; the
lowest is 1.6× and the typical is ~2.2×. On the crop it is immediately legible: the arcade's
crests are **cyan-turquoise**; ours are white-mixed pale blue (`#73b5f7`, `#84c6f7`, `#b5e7f7`,
`#d6f7f7` — all R<G<B pale blues, no cyan). R5 prescribed exactly this ("kill the white mix —
take foam to a saturated pale cyan") and the colour-count half of the fix landed while the hue
half did not.

**Fix:** push the foam family toward saturated cyan (R low, G high) and lift G in the two body
blues (`#0010d6` and `#0010e7` are 62 % of the sea and carry G=16). Cheap, and it is a palette
edit, not a shader change.

*Art direction, labelled as such because no instrument of mine supports it:* on the matched
crop the arcade's foam organises into long crest chains with large calm troughs between, where
ours is a more even scatter. I could not make that measurable — see §0 — so treat it as a
drawing note, not a gate.

Also in the crop, and genuinely odd against 15 otherwise hard-edged colours: **two soft diffuse
dark-navy patches** in the mid-field, with gradient edges. In a frame where everything else is
chunky, they read as smudges on the lens.

### 6. The READY card is still the flight sprite with a word on its nose
→ `art-r6-07-cards-ours-vs-arcade.png`

R5's §5 is half fixed: the card no longer collides with the SPEED and STAGE labels at the bottom
edge. The substance is unchanged. The arcade's respawn is a **bespoke screen-filling
rear-aspect F-14** — roughly 85 %W, blue-grey, with two enormous white-to-orange afterburner
flames, on near-black, with READY in olive-cream **below** it. Ours is the ordinary level-flight
sprite at **36.2 %W** with a small cream READY **stamped across its canopy**. It is the game's
most cinematic beat and we spend a sprite reuse on it.

### 7. The CONTINUE card draws behind the sprites
→ `art-r6-07`, lower pair

Colours and size are now right (§2). The defect is **z-order**: an enemy's wing cuts straight
through "CONTINUE PLAY" between the E and the P and obliterates the countdown digit, and the
player jet's fins and fuselage cross "INSERT COIN". The countdown is cream with no keyline over
a grey airframe and is effectively unreadable. An arcade card is drawn last, over everything.
One-line fix, large legibility gain. *(Reached by letting a normal run lose all three lives at
`?seed=3`, frames 30–39 of a 60 s capture — `?forcedeath` only gives one death. Noting the route
because R5 recorded this card as uncoverable.)*

### 8. Night: our clouds have a size tail the arcade doesn't, and the enemies arrive as one clump
→ `art-r6-05-stage3-ours-TOP-arcade-native-BOT.png`

The palette is exact (§2). The **composition** is not:

| | cover | banks | largest | widest |
|---|---|---|---|---|
| arcade night, true native | 25.2 % | **5** | 2 001 px | 85 px |
| ours t4800 | 17.3 % | 4 | 1 294 px | 81 px |
| ours t5280 | 13.1 % | 2 | 2 167 px | 116 px |
| **ours t4200** | **54.0 %** | **2** | **11 466 px** | **192 px** |

At t4800 we are close. At t4200 one bank is **5.7× the arcade's largest and 2.3× its widest** —
60 % of screen width — and covers half the sky. The arcade scatters several modest masses; our
distribution has a long tail that produces a single dominating blob. The same tendency is
visible on stage 1 (ours 1–3 banks, arcade 3–6).

Separately, and more damaging in motion: **our stage-3 enemies arrive as six to eight identical
aircraft overlapping each other at one scale, dead centre**. It reads as a sprite pile-up. The
arcade's night frame has one enemy, exploding, at a distinct depth. This is STATUS gap 11's
single-file queue showing up as a clump rather than a line.

Also: stage 3's ground band V-identity reads **49.7 %** on the published region — marginally
under the ≥50 % gate, worth one more posterization step.

### 9. Stage 1 has no landmasses, and this is bigger than its gap-list position suggests

I pulled eight frames across the verified stage-1 span and read the digit on every one. **Five
of the eight contain green or tan land under the HUD digit** (t99, t102, t106, t110, t113), and
two of those are predominantly land. We fly 32 seconds of unbroken open water. R5 noted this;
I can now put a fraction on it — the arcade's stage 1 is **more than half** coastline, not open
ocean with an occasional island.

### 10. Title: the "II" is right, the lettering is 23 % too short — and it is still static
→ `art-r6-08-title-ours-TOP-arcade-BOT.png`

**I overturn R5 here.** R5 called the sphere-matrix "II" "a small ornament tucked between the
two words" and asked for it to be made dominant. Measured:

| | "II" sphere block | white lettering |
|---|---|---|
| **ours** | **h 119 px, x 130–227** | h **91** px, x 85–273 |
| arcade (BOX→320) | **h 121 px, x 130–227** | h **117** px, x 86–277 |

**The "II" is already the arcade's size, in the arcade's position, to within 2 px.** What is
wrong is the opposite end: our *lettering* is 91 px against 117, and sits too high, so the II
protrudes below it instead of being interleaved by it. Making the II bigger — the obvious
reading of R5's advice — would move us away from the arcade. **Grow the lettering ~29 % and drop
BURNER so it crosses the II's lower half**, and add the italic slant and cut corners the arcade's
letterforms carry.

And the title is **still 4 byte-identical frames over 120 ticks** — no animation, no attract
cycle. R5 gap 8's second half is untouched.

---

## 4. The four questions, answered

**1. The sea — does it look like the arcade's water, or does it merely satisfy a statistic?**

**It looks like it.** This is not a gate being gamed, and I went looking for that specifically.
The medium is right at native (15 colours in the patch, on-ladder), the motion is right (foam
translates coherently; no scintillation), and it passes the **extremal** pairing that exists to
catch exactly the degenerate-slab failure that happened to this same sea mid-round — largest
component 34–95 px against the arcade's 82, count 300–313 against 389. A sea that passed by
being a few flat slabs would fail that, and ours doesn't.

Two things are still wrong and they are both cheap: the **hue** is about half the arcade's green
(§6.5, proved), and there are two **soft diffuse dark patches** that don't belong in a 15-colour
image. The structural question — crest organisation — I could not settle, and §0 explains why;
I will not invent a number for it.

**2. The jet — has it overshot into a flat silhouette?**

**No, and the question points at the wrong axis — which is the same thing R5 found one level
down.** It has not overshot: V median 0.839 against the arcade's true-native **0.969**, with
90.2 % of the arcade's airframe above V 0.80 against our 70.5 %. It is still too dark, and the
replacement band (0.78–0.92) still has its ceiling *below* the reference aircraft.

But the median was never the real defect. The real defects are **4 airframe tones against 21**
— 29.5 % of our airframe is one unbroken mauve-grey slab where the arcade puts 8.7 % and breaks
it up — and **a 97.3 % pure-black rim against the arcade's 10.2 %**. Fix the keyline and the
tone count and the jet will read right even before the median moves. Fix the median alone and
you get a brighter sticker.

**3. The reticle — 1987 hardware, or cheaper?**

**Cheaper, but not because of aliasing.** It is genuinely 1-bit: 3 colours, zero partial alpha.
The problem is the **continuous black keyline** (ours 100 % of the rim; the arcade's 1.8 %) and
the 33-px bar inside it. The arcade draws bare 1-px white strokes on the scene — 57 single-pixel
runs out of 85 ink pixels. Strip the keyline and thin the bar and it lands. The rotated line
should also come from authored cells rather than a rasterised diagonal.

**4. Stage 2 — is the racetrack gone?**

**No. It is more literal than it was.** It has consolidated from a streak field into a single
hard-edged pale road on the flight axis. The arcade's desert is one diagonal mass with a hard
boundary and no axial feature at all. Two useful extras: our ground band is now **21–26 colours
against the arcade's 47** (we overshot the palette-snap and are under-textured), and the
remaining Criterion-A failure is **33 vs ≤32 channel values**, located entirely in the horizon
glow band, 14 of whose values are off the published ladder. One-line fix for the gate; a
composition fix for the road.

---

## 5. Is the R5 verdict retired?

> *"The sprites now look like 1987. The water they fly over does not, and it is the first thing
> anyone sees."*

**The first clause stands. The second is RETIRED. The sentence's structure is not.**

- **Retired, plainly:** the sea is in the right medium, at native, in motion, and against its
  extremal pairing. 8,055 → 15 colours in the same patch. Whole-frame 13,879 → 51. This was R5's
  single biggest claim and the world lane answered it completely.
- **Also retired this round, and worth saying:** R5's "the II is subordinate" is **wrong on this
  build** (§6.10) — the II matches the arcade to 2 px and the lettering is what's short.
  Stage-1 enemy polarity is fixed. The night palettes are exact. The CONTINUE card's colours and
  sizing are right. R5's call to hold the explosion core under its number was correct and the
  core still reads as fire.
- **Not retired — the mechanism.** R5 wrote that the gap was "unusually well localised" to one
  object, and it was; what it did not say is that *localisation is not the same as containment*.
  The continuous-tone defect did not shrink, it **moved**: from the sea to the explosion, where
  it now produces **546–889 colours and 244–255 channel values** in live play, holes of visible
  sky inside the fireball, and an alpha dissolve through colours that exist in no palette.
  A frame of ours is 1987 until you pull the trigger.

So the one-line answer, in the shape of its predecessor:

> **The water looks like 1987 now. The fire does not, and it is what you came to make.**

**The process change I would make.** Three rounds running, a lane has fixed the *named object*
and the *mechanism* has survived in an unnamed one, and each time it took a fresh critic a full
round to find where it went. The sea was never on a gap list before R6 either. So: before the
round closes, run Criterion A **per object**, not per frame — isolate each subsystem with the
`?combat*` / `?hidejet` / `?noclouds` flags that already exist, and publish a one-column table
of colours-and-channel-values per object. I did it incidentally while chasing this and it took
twenty minutes: clouds 44/20, trail 51–67/28, sea 15 in-patch, HUD 3 in-region, grounds 21–26,
**explosions 215/200**. That table would have found this round's defect on day one instead of
day four, and it will find the next one before a critic has to.

---

## 6. Coverage

**Covered:** stage-1 sea isolated and in cruise, at native and over consecutive 60 Hz ticks;
stage-1 cruise, banked, and in combat; the player jet isolated day and night, level and banked,
against both true-native arcade stills and stage-verified video; the enemy cast at engagement
scale on stages 1 and 3; cloud banks on stages 1 and 3; all three stage grounds; explosions on
two independent harnesses plus the player-death starburst; the missile trail; HUD top and bottom
strips and the reticle in four roll states; title, stage tally, READY and **CONTINUE** cards.

**Not covered:** the carrier catapult launch; audio; anything about feel or pacing.

**A caveat I am leaving on the record:** my `?combattrail=1` capture produced **no trail** —
that harness needs a missile button press, which `?fixed=1` never supplies, so it silently
captures an ordinary frame. I discarded the figure and measured the trail from `?demo=2`
instead. Anyone quoting a `combattrail` number should check the frame contains a missile first.

**Captures:** `tools/out/art-critic-r6/{s1-cruise,s1-sea,s1-sea-consec,s1-clouds,s1-combat,s1-bank,s1-solo,s1-jet,s1-jet-bank,s1-nojet-bank,s2-g-*,s2-c-*,s3-g-*,s3-c-*,s3-jet*,s3-nojet*,s3-bank-*,expl,trail,demo2,title,tally,death,death2,ready,cont,cont2}/`,
native decimations alongside in `tools/out/art-critic-r6-native/`. Arcade frames I pulled and
stage-verified myself: `tools/out/art-critic-r6-vid/` (stage 1 at t93/95/99/102/106/110/113/118,
digit read on all eight).

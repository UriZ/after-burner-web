# R5 Art Direction Critique — *does this look like a 1987 Sega arcade game?*

**Role:** arcade pixel-art director. Fresh context. **Report only; no code was changed.**
**Build:** `main` @ `53ce86b1e1e1bd0f05cc8d1f5a277122c713bc31`, working tree clean
(`git status --short` empty at capture time and at write time).
**Captures:** all mine, `tools/out/art-critic-r5/`. Evidence PNGs: `judging/R5/art-r5-*.png`.

**Method.** Every "ours" figure is a frame decimated from the captured 960×672 to the true
native **320×224**, judged at that resolution first, then zoomed nearest-neighbour. Every
arcade figure gets the same treatment.

**Instrument validation, before any number was trusted:**

- The 960×672 capture is a **pure 3× nearest upscale** — across all 80 captured frames the
  worst within-3×3-block channel spread is **0**. Decimation to native is therefore
  *lossless*, not an approximation. (`/tmp/validate.py`)
- The colour-cardinality operator returns exactly 3 on a synthetic 3-colour control.
- All capture sets were swept for **black frames and duplicates**. One result: the `title`
  set is **6 byte-identical frames over 180 ticks** — not corruption, the title screen is
  genuinely static. Every other set: 0 black, 0 duplicate.

**Two measurements I took, caught as wrong, and discarded** — recorded because this project
pays for silent wrong numbers:

1. My first horizon detector locked onto the **HUD strip edge** (row 24), not the horizon,
   so my first ground-adjacency figures (67.9%H) were mostly flat sky. Exactly the
   contamination CLAUDE.md warns about. Redone against a real horizon (row 140, 62.5 %H) and
   a `hud_mask.py`-derived mask.
2. A "cloud share" operator counted bright sky pixels as cloud and returned **96 %** on a
   daylight frame. Implausible on its face, cropped, discarded. It is valid only on the
   near-black night sky, where it is used below.

**A constraint on everything claimed here.** There is no native-resolution arcade *footage*
in this repo, and neither 686×480 nor 1028×720 is an integer multiple of 320×224. There
*are* two true native **stills** — `reference/ab2-arcade-desert.png` and
`reference/ab2-arcade-night-banking.png`, 320×224, 138 and 79 colours, 31 and 17 per-channel
values lying on the Sega 5-bit ladder. Those two carry every hardware-level claim below.
Everything else arcade-side is a BOX-downsample of video, which **blurs** — so it inflates
colour counts, inflates airframe brightness at sprite edges, and smooths gradients. I note
the direction of that bias wherever it could change a conclusion.

---

## 1. Blunt assessment

**R4's verdict is half dead and half alive, and the half that is alive is now concentrated in
one place.**

The sprites have genuinely arrived. Every authored sheet in `src/assets/sprites/` is
**7 or 8 colours**, hard-alpha, keylined, with hand-placed structure. The player jet is a
real F-14. The explosion is real fire with a white-hot core. The HUD is close enough that I
had to look twice to tell which strip was ours. The title is a drawn logo. R4's central
mechanical claim — *"nothing in this build is drawn at the pixel level"* — **is now false,**
and it is false by a wide margin.

And yet a frame of stage 1 still measures **14,629 colours** against R4's 14,508. Nothing
moved. The reason is that **one object owns almost all of them**: stage 1's sea is still a
continuous-tone fbm shader, untouched this round, and it contributes ~8,000 colours to a
hardware budget of ~138. Stage 1 is the stage every player sees first, the sea is ~35 % of
its frame, and it is still the R4 build.

So the honest statement is not "it still looks like a WebGL demo". It is:

> **The sprites now look like 1987. The water they fly over does not, and it is the first
> thing anyone sees.** Stages 2 and 3 were rebuilt and are in the right medium; stage 1 was
> not, and stage 1 is the shop window.

**The more uncomfortable finding is about process, and it is the reason I would not call the
R4 verdict retired.** Two of R4's own prescriptions were measured off the **wrong stage's
reference frame**, the build implemented them faithfully and precisely, and both made
stage 1 *worse*:

- R4 set a player-airframe **value ceiling of V 0.77**. The build honours it exactly
  (brightest airframe colour `#c5c5ad`, V 0.773). On five clean arcade stage-1 frames the
  player jet's **median** airframe value is **0.776–0.922**. Our brightest colour is at or
  below the arcade's median. The jet is too dark because a criterion said so.
- R4 prescribed a **near-black dominant** for the enemy, derived from
  `ab2-arcade-closeup-enemies.jpg` — an **orange-sky stage-2** frame of green camo MiGs.
  Our stage-1 enemy sheet is 61 % below V 0.3 and 34 % pure black. The arcade's stage-1
  enemies are **pale grey-white against the blue sky**. R4 caught this exact trap for the
  *player* palette and self-corrected; nobody applied the same correction to the enemy.

That is the same defect class STATUS already names — *a validated operator pointed at the
wrong population* — occurring one level up, in the critique rather than the criteria. The
build did not fail to follow instructions. It followed them precisely, and precision is what
carried the error in.

---

## 2. Where the build has genuinely arrived

Stated first and without hedging, because several of these are large.

| | evidence | state |
|---|---|---|
| **Sprites are palettized pixel art** | `art-r5-11`, §4 table | Every sheet **7–8 colours**, hard alpha, 1-px keyline. R4's pipeline verdict is retired. |
| **Player jet silhouette** | `art-r5-03` | Separated canted blades, black-ringed nozzles with hot cores, magenta canopy fleck. "Crab claw / Lego brick" is dead. |
| **Explosion** | `art-r5-06` | White-hot core, yellow ring, orange body, ragged dark-red rim with spikes, asymmetric hand-placed lobes. Reads as **fire**. The "fried eggs" bullseye is dead. |
| **Enemies read as aircraft** | `art-r5-04` | Keylined, structured, unmistakably aeroplanes. "Insects with glowing eyes" is dead. |
| **HUD** | `art-r5-07` | Top strip is very close: winged SCORE/HIT badges, correct digit style, correct reticle. Genuinely good work. |
| **Title screen** | `art-r5-08` | Drawn logo, sphere "II", blue A / red B, red INSERT COIN, CREDIT, ©SEGA 1987. R4's "a bitmap HUD font cannot approximate this" is answered. |
| **Stage-end tally** | `art-r5-09` | HIT COUNTS / POINTS / STAGE layout, colours and type all land. |
| **Stage 2 and stage 3 grounds** | `art-r5-13`, §3 | **In the correct medium** — see below. This is the round's biggest technical win and it is being undersold. |
| **Greyscale-sea bug (R4 fix #0)** | §6 | **Fixed and independently verified.** Sea saturation holds 0.567–0.700 across all 16 frames of the death sequence. |
| **Bank poses are selected, not spun** | `art-r5-11` | Nine distinct authored cells; the arbitrary-angle resampling artifact is gone. |

### Stage 2 and 3 deserve a paragraph of their own

Measured on verified-clean ground rectangles at native, against the two true native arcade
stills:

| region | colours | adj-H | adj-V |
|---|---|---|---|
| **ours stage 2** ground (280×33) | **45** | 62.6 % | 50.6 % |
| arcade desert ground (280×93) | 70 | 61.7 % | 60.5 % |
| arcade desert near-field (280×43) | 47 | 63.2 % | 62.2 % |
| **ours stage 3** city (280×43) | **12** | 64.1 % | 49.5 % |
| arcade night city (280×35) | 26 | 77.2 % | 73.5 % |
| **ours stage 1** sea (280×48) | **8,055** | 25.3 % | **0.0 %** |

Our stage-2 dominant is `#e77300` at 36.9 %; the arcade desert's is `#e67300` at 39.5 %. One
unit apart on one channel, and within three points on share. **Stage 2 is the right medium.**
Whoever did that work solved the problem R4 posed, on that stage, completely.

---

## 3. Ranked — what most damages the illusion

### 1. Stage 1's sea is still a continuous-tone shader *(highest cost by a wide margin)*
→ `art-r5-02-sea-ours-TOP-arcade-t108-t116-BOT.png`, `art-r5-13`

A 280×48 rectangle of open sea, at native, clear of HUD and horizon:
**8,055 colours, 25.3 % horizontal adjacency, 0.0 % vertical adjacency.**

Zero is exact — not a single pixel in 13,160 vertical pairs equals the one below it. I
cropped and read the raw values rather than publish a zero on trust:

```
sea 8×8 patch               one column, rows 145-158
a2abff 5966db 1624a8 ...    #85bdfe #8cc2fd #93c7fd #9bcbfc #a2d0fc
a5b0ff a5afff a5acff ...    #a8d5fb #afdafb #b5dffb #bbe3fa #c0e7fa
858df5 767fed 848df4 ...    #c2e7f8 #c3e4fa #bcd7fb #586ddf
```

The mechanism is plain: the value depends **continuously** on distance, so consecutive rows
can never share a colour, and the body is per-pixel noise on top. `git log` confirms
`ground.js`'s last substantive work was stage 2/3 terrain and clouds — **the stage-1 sea was
never rebuilt.** R4's fix #3 was not done.

**Two corrections to R4 that matter for the fix, because the obvious reading of its advice
would move us away from the arcade:**

- **R4's "TV static vs rest" framing is wrong for water.** R4 benchmarked our *sea* against
  `ab2-arcade-desert.png`, a **desert**. The arcade's own stage-1 sea (`art-r5-02`, my own
  pull at t108 with stage identity read off the HUD digit, plus t116) is **dense and busy** —
  packed with foam. Do not "add rest" to the sea. The real structural difference is that the
  arcade's foam **organises into long sinuous crest chains with large calm blue between
  them**, while ours is even-density speckle with a visible regular horizontal banding that
  reads as corduroy.
- **The real colour defect is saturation, not brightness.** Mean V is *identical* — ours
  0.867, arcade t116 0.868. But median saturation is **ours 0.658, arcade 1.000**, with
  **41.8 % of our sea pixels below S 0.5 against the arcade's 2.2 %** (t108 corroborates:
  0.919 mean, 5.7 %). Ours is a washed lavender-blue; theirs is electric. The cause is
  visible in the raw patch above — foam mixed toward white drags R up while B stays pinned.

**Fix:** author the sea from a small fixed blue palette (8–12 entries, 5-bit ladder), quantize
the distance ramp to **hard bands** instead of a continuous function, and stamp foam as
**chained horizontal dashes along crest lines** rather than an isotropic threshold. Kill the
white mix — take foam to a saturated pale cyan and let the dash density, not the value, carry
the sparkle. Do not reduce the foam quantity.

*(I also drafted a criticism that our horizon haze band is an airbrush where the arcade's is
banded. I withdraw it: both profile as smooth monotonic ramps, and the arcade frame's
smoothness is inseparable from the downsample filter. Unprovable without a native frame.)*

### 2. The player jet is too dark, and a defective criterion put it there
→ `art-r5-03-jet-ours-TOP-arcade-BOT.png`

**This is the answer to the lane's "a touch timid", and the lane is looking at the wrong
axis.** Blade length, blade cant and nacelle-ring thickness are third-order. The dominant
defect is **tonal**.

Arcade player-jet airframe median V, five independent stage-1 frames, two of which I pulled
and stage-verified myself:

| frame | median V | share V > 0.8 |
|---|---|---|
| t116 level | 0.831 | 54.3 % |
| t97 bank *(R4's own source)* | 0.776 | 45.0 % |
| t98 hard bank | 0.890 | 65.1 % |
| t100.75 salvo | 0.922 | 63.6 % |
| my pull, t108 | 0.914 | 63.3 % |
| **ours (sheet + in-frame)** | **0.643** | **5.3 %** |

Our sheet's **brightest** airframe colour is `#c5c5ad`, V 0.773 — below the arcade's median on
four of five frames. The arcade's jet is **white**; ours is warm grey-tan. The crop says it
even louder than the table does.

**The criterion is the bug.** R4 wrote *"the arcade's brightest airframe value is `#c5c5ad` at
V 0.77"* — but that is the brightest **cluster centroid of a median-cut quantization**, not
the sprite's brightest pixel. A quantizer averages; on R4's own frame t97 the median is
already 0.776. Two definitions of one statistic quoted as one number, and the build built a
hard ceiling out of it. **Retire the V 0.77 ceiling.**

Second, smaller, and visible in `art-r5-11`: **the level pose is the weakest of the nine.**
It is a blunt horizontal plank. The *banked* cells already have the swept, finely-tapered
wing the arcade shows. Whoever drew the banked cells should redraw cell 5 to match them.

Third, carried forward honestly: the nine poses are still a **rotated and foreshortened
planform**, as STATUS itself says. The nacelle discs stay the same size on both sides and the
dorsal surface never comes into view. The resampling artifact is gone; the perspective is
still absent.

### 3. Stage-1 enemies have inverted value polarity
→ `art-r5-04-enemy-arcade-TOP-ours-BOT.png`

| | median V | share V < 0.3 | share V > 0.7 |
|---|---|---|---|
| arcade stage-1 enemy (t100.75 crop) | 0.557 | 23.2 % | 41.1 % |
| **ours, `enemy-grey-*.png` sheet** | **0.227** | **61.0 %** | **3.5 %** |

The sheet is 34 % pure `#000000` plus 26 % `#31313a` — about 60 % near-black. The arcade's
stage-1 enemy is a **pale grey-white aircraft with dark accents**; ours is a **dark
silhouette with light accents**. Opposite polarity, and on the crop it is unmissable: in
flight ours read as a flock of dark birds (see `art-r5-05` top, and the death sequence).

*Bias note: the arcade figure is from a BOX-downsampled video frame, so edge blur biases it
**up**. The direction of the gap is not in doubt — it is corroborated by eye on every stage-1
crop I pulled — but treat 0.557 as an upper bound, not a target.*

This is **stage-specific**. `ab2-arcade-desert-explosions.png` shows the arcade's stage-2
enemies as **dark green against the orange sky** — the arcade flips enemy value to hold
contrast against the sky it is flying over. Our `camo` livery is correct *for stage 2*. The
error is using a near-black family on stage 1's blue.

### 4. The missile trail has no axis
→ `art-r5-05-trail-ours-TOP-arcade-BOT.png`

**The lane's "a parked cloud rather than a trail" is right, and the obvious fix is wrong.**
The arcade's trail is **also** an enormous opaque white mass — in `t100.75` it is a plume
nearly a quarter of the screen tall. Shrinking ours moves away from the arcade.

The difference is **shape**: the arcade's is an **oriented tapering wedge** — narrow at the
missile, broad at the tail, with a clear axis that reads as motion along a line. Ours is a
**radially symmetric ball of lobes** with no axis and no taper. In `combat/frame-0008` it is a
round cumulus that swallows the player jet.

Compounding it: **our trail puffs are the same sprite family as our clouds**, so in that frame
I genuinely cannot tell where the cloud ends and the smoke begins. The arcade's trail is
denser and smoother than its clouds and never confuses the two.

**Fix:** an axis-aligned, tapering emitter with per-puff size falling along the trail, and a
distinct puff texture from the cloud banks. Colour already passes — leave it alone.

### 5. The READY card is the arcade's most cinematic moment, and ours is a sprite under the HUD
→ `art-r5-10-ready-ours-TOP-arcade-MID-continue-BOT.png`

The arcade's respawn is a **screen-filling bespoke rear-aspect F-14 with two huge afterburner
flames**, centred, with READY in cream below it. Ours is the ordinary level-flight sprite,
oversized, **jammed against the bottom edge and drawn over the SPEED and STAGE HUD labels**,
with a small yellow READY floating up at the horizon. It reads as a layout bug, not a card.

*(Not covered: the CONTINUE card — reaching it needs three deaths and `?forcedeath` gives
one. I defer to STATUS gap 9's own account. The arcade's version, bottom of `art-r5-10`,
sits over the **live stage scene**, which is worth noting for whoever rebuilds it.)*

### 6. The night sky is empty
→ `art-r5-12-night-ours-TOP-arcade-BOT.png`

Bright-pixel share of the sky band (valid here because both skies are near-black):
**arcade 18.74 %, ours 2.52 %.** The arcade's night stage is dominated by three big white
cumulus masses; ours is bare black. A `night` cloud palette exists in `clouds.js` and is
correct — the clouds are simply not there in quantity.

*Bound: one arcade frame is not a distribution. But a 7× gap with an empty sky on our side is
not a sampling artifact.*

Also at night: our ground carries a blue ramp (`#000010`/`#000021`/`#000031`, 46 % combined)
where the arcade is **79 % pure `#000000`**, and our lights are **2.0 %** white against the
arcade's **7.5 %**. The arcade's night is *darker ground, brighter lights*. Ours is the
reverse, which flattens it.

### 7. Stage-2 ground composition — streaks, not a mass
→ `art-r5-13`

The palette and texture are right (see §2). The **composition** is not: ours is a set of
longitudinal streaks running to the vanishing point, symmetric about the flight axis — it
reads as a ploughed field or lane markings. The arcade's desert is **one diagonal mass** of
rock and vegetation cutting across the frame, with a hard boundary against open ground.
STATUS already says this; I confirm it, and confirm it is now the *only* thing wrong with
stage 2.

### 8. Title: static, and the "II" is subordinate
→ `art-r5-08`

Six byte-identical frames over 180 ticks — **no animation, no attract cycle.**
Compositionally, the arcade's sphere-matrix "II" is a **dominant element that the lettering
overlaps and interleaves with**, spanning from above AFTER to below BURNER. Ours is a small
ornament tucked between the two words. Our letterforms are also upright where the arcade's
carry an italic slant with calligraphic cut corners. The logo is a real arrival; the
*composition* is the remaining gap.

### 9. Explosion: no smoke phase, and the debris reads as holes
→ `art-r5-06`

Across ten frames the sequence is **bloom → gone**. There is no dark smoke tail — R4's frames
5–8. Second: the light-blue debris specks inside the fireball read as **holes punched through
to the sky**, not as chunks; the arcade's debris is red/brown/grey and flies *outside* the
fire. Third: the player-death starburst is **four-fold symmetric**, a plus-shape, where the
arcade's has irregular radiating spikes.

### 10. The HUD has opaque plates the arcade does not
→ `art-r5-07` (bottom pair)

Our SPEED label and aircraft-icon row sit on a **solid dark plate**; the arcade's sit directly
on the sea with only glyph outlines. Same for the STAGE digit. This is consistent with
I21-REVISED's finding that our HUD is already 2–24× more separated from its background than
the arcade's — but on the crop the plates are what make the strip read as a **modern UI
overlay** rather than part of the picture. Our missile pips are also five identical fat
barber-poles where the arcade has a two-tier system: large rockets for ready missiles plus a
row of thin reserve ticks.

### 11. Stage 1 has no landmasses
Two of the four stage-1 frames I pulled and verified by HUD digit (t103, t114) contain
**green islands with rocky shorelines**. We have open water for the entire stage. STATUS
already lists this under gap 11; I note only that it is far more *visible* than its position
on that list suggests — it is a third of the stage-1 reference frames.

---

## 4. The three questions I was asked to form my own view on

**1. "The jet passes every published silhouette discriminator and is still a touch timid —
blades shorter and less canted, wings sweeping down less, nacelle pods smaller with a thinner
ring. Is that right, and does it matter at native scale?"**

Partly right, and **it is not what matters.** At native scale the blade cant and the ring
thickness are a pixel or two — invisible in motion. What the eye reads instantly is that
**the jet is grey where the arcade's is white** (median V 0.643 vs 0.776–0.922, with our
*maximum* at 0.773), and that **the level pose's wing is a blunt plank** where every arcade
frame shows a long swept wing tapering to a point. Fix the value ceiling and redraw the level
cell to match the banked cells the lane already drew well. Then re-ask the question; I expect
"timid" to have disappeared without anyone touching a blade.

**2. "The missile trail reads as a parked cloud rather than a trail. Colour passes; shape
does not."**

The diagnosis is correct and the lane should be trusted on it — but **the fix is not to make
it smaller.** The arcade's trail is just as large and just as opaque. It is a **tapering,
oriented wedge**; ours is an **isotropic ball**. Give it an axis and a size falloff along that
axis, and stop sharing a puff texture with the cloud banks. Changing nothing else will fix it.

**3. "The explosion core is deliberately kept under the arcade's measured fraction because the
value that hits the number looks worse on the crop. Was that call right?"**

**Yes. Hold the line.** On the crop the white core already reads as the hottest thing on
screen; driving it to ≥40 % above V 0.95 would consume the yellow and orange rings that make
it read as *fire* rather than as a white disc. The crop outranks the number, and that is the
whole standing rule.

I will add that the criterion is suspect for a *second* reason nobody has raised: the I6
ladder was measured on **peak-flash** frames (`death-starburst-gp-t202`,
`ab2-arcade-huge-explosion`), and a ≥40 % target derived from the hottest instant is being
applied to **every frame of a sequence**, including bloom and decay. Judge it **per phase**,
not pooled. Done that way I suspect our ignition frame would pass honestly and the lane would
not have to hold anything back.

---

## 5. Does R4's verdict still stand?

> *"This does not look like a 1987 arcade game. It looks like a 2024 WebGL demo that has been
> told the arcade's statistics."*

**Partly retired — and specifically, its diagnosis is retired while its mechanism is not.**

**Retired, and it should be said plainly:**
- *"Nothing in this build is drawn at the pixel level"* — **dead.** Every sheet is 7–8
  colours, hard alpha, keylined, hand-placed. This was R4's single biggest claim and the
  sprite lane answered it.
- The fried-egg explosion, the insect enemies, the crab-claw fins, the placeholder title and
  the greyscale-sea bug — **all dead**, verified independently here.
- *"Switch to authored PNG sprite sheets"* — **done**, and it worked.

**Not retired:**
- The **whole-frame colour count has not moved** (14,629 vs 14,508) because stage 1's sea was
  never rebuilt. On the one stage every player sees first, the medium is still wrong.
- **The mechanism R4 named is alive and produced two new casualties this round.** R4's thesis
  was that *a statistic can be satisfied by an object that looks nothing like the thing the
  statistic was measured from*. The V 0.77 player ceiling and the near-black enemy dominant
  are that thesis operating on R4's **own prescriptions** — each measured correctly, off the
  wrong frame, implemented faithfully, and each making stage 1 worse. The build is no longer
  tuning to blind statistics; it is now tuning to *precisely measured facts about the wrong
  population*, which is harder to catch and costs the same.

So the one-line answer: **the picture has arrived in most places; the process that lost the
picture has not been fixed.** The gap between "every criterion passes" and "it looks right"
closed substantially this round — on sprites, by drawing them — and the remaining gap is now
unusually well localised. Stage 1's water, the jet's value ceiling and the enemy's polarity
are three specific, cheap, high-impact fixes, and two of the three are *undoing* a correction
rather than building anything.

**The one process change I would make**, in the spirit of R4's own closing note: before a
palette or value criterion is written into REFERENCE.md, **record which stage's frame it was
measured on, and state the stage it is licensed for.** Both failures this round would have
been caught by one extra column in a table.

---

## 6. Verified closed since R4

- **Greyscale-sea-after-death (R4 fix #0).** Independently re-measured across 16 frames of
  the full death→respawn sequence: sea saturation **0.567–0.700**, never near zero. Fixed.

## 7. Coverage

**Covered:** stage-1 cruise and banked (day), stage-3 night jet, the enemy cast at engagement
scale, sky and cloud banks, all three stage grounds, explosions (isolated sequence and
in-combat), the player-death starburst, the missile trail, HUD top and bottom strips, the
title card, the stage tally card, the READY card, and the authored sprite sheets in isolation.

**Not covered:** the CONTINUE card (needs three deaths; `?forcedeath` gives one) and the
carrier catapult launch. Both should be looked at before the round closes.

**Captures:** `tools/out/art-critic-r5/{cruise-day,banked-day,clean-s1,stages,stages-combat,combat,expl,trail,title,tally,death,death2,s3b,vid,native}/`.
Arcade frames I pulled myself and stage-verified by HUD digit: `tools/out/art-critic-r5/vid/`
(stage 1 at t103/108/114/119; stage 2 at t145/150).

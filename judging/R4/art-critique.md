# R4 Art Direction Critique — *does this look like a 1987 Sega arcade game?*

**Role:** arcade pixel-art director. Report only; no code was changed.
**Build:** `main` @ `e8724f5`. All captures mine, in `tools/out/art-critic/`.
**Provenance:** every capture was taken between 22:05 and 22:20 local, before the
uncommitted R5 edits to `ground.js` / `font.js` / `smoke.js` landed in the working tree at
22:20:40–22:21:25. So this critiques committed `e8724f5`, not the in-flight R5 work. From
their diffs, that work already starts on two of my recommendations — glyph outlines
(fix #2) and per-stage ground structure (fix #3) — which I read as independent
corroboration rather than overlap to be undone. The other fixes below are untouched by it.

**Method:** every "ours" figure is a frame downsampled from the captured 960×672 (3×) to
the true native 320×224 and inspected at that resolution, then zoomed with nearest
neighbour. Every "arcade" figure is the same treatment of a `reference/` frame.

---

## 1. Blunt assessment

**This does not look like a 1987 Sega arcade game. It looks like a 2024 WebGL demo that
has been told the arcade's statistics.** It is not 80% of the way there with polish
missing; the *pipeline* is producing a different medium. A player's eye reads it in under
a second and the previous judge's 6/10 is not describing the same object a player sees.

The project owner's "it's very bad" and the judge's "most values inside the arcade bands"
are both correct, and the reason they coexist is this: **every acceptance criterion the
build has been tuned against is a summary statistic — a mean, a percentile, an
autocorrelation ratio, a coverage fraction — and summary statistics are blind to the three
things that actually make pixel art read.** Those three things are (a) a small, fixed,
shared palette, (b) deliberate hand-placed structure instead of noise, and (c) drawn
frames instead of transformed bitmaps. We fail all three, and no measurement in
REFERENCE.md tests any of them.

### The single biggest visual reason

**Nothing in this build is drawn at the pixel level. Every sprite is a stack of
anti-aliased Canvas2D vector shapes (`ctx.arc`, polygon `fill()`), and every surface is a
continuous-tone shader. The result has no pixel grid, no palette, and no dithering — the
three signatures of the medium we are imitating.**

The measurement that makes this undeniable:

| | unique colours in one 320×224 frame | distinct per-channel values | colours covering 90% of frame |
|---|---|---|---|
| **Arcade** (`reference/ab2-arcade-desert.png`, a clean native capture) | **138** | **31**, lying exactly on the Sega 5-bit ladder (0, 16, 25, 33, 41, …, 247, 255) | **31** |
| `reference/ab2-arcade-night-banking.png` | — | **17** (the 4-bit subset) | — |
| **Ours** (`tools/out/art-critic/combat/frame-0002.png`) | **14 508** | **254** | **7 340** |

We use 7 340 colours where the arcade uses 31. That is a factor of 237. Everything
downstream — mushy sprite edges, the TV-static sea, the "muddy" fireball every previous
round has complained about — is a symptom of this one fact, and it has never been measured
because no criterion in REFERENCE.md counts colours.

Evidence: `art-palette-ours-TOP-arcade-BOTTOM.png`.

> **Honest caveat, because I tested it:** I applied a 5-bit quantize + 4×4 ordered dither
> to a shipped frame as a post-process. It took 14 508 colours down to ~1 000 — and the
> sea *still looked like static*. Palette quantization at the blit is necessary and cheap
> but **nowhere near sufficient.** The sea must be *authored* from a discrete palette, not
> quantized after the fact. I am flagging this because "add a posterize shader" is the
> obvious cheap read of the number above, and on its own it will not fix the look.

---

## 1b. VERDICT the sprite-art lane is blocked on — *do the discriminators force a sprite sheet?*

**No. Build the corrected silhouette procedurally, this round, and do not hold the lane for
a sprite sheet. Then plan the sheet for the poses, which is a different problem.**

I did not want to answer this from taste, so I tested it. I transcribed the current
`spriteFactory.js` geometry into a standalone mask, implemented the four verified
discriminators under the published operator rules (filled-pixel count for row width,
largest 8-connected component only, ≥250 px of jet span), and reproduced the lane's
numbers on our build: **two-blade rows 37.2%** (they measure 38%), **nozzle separation
13.8%** (14.5%), **cant 1.00** (1.00). The harness agrees, so it is measuring the same
thing.

Then I drew a corrected silhouette using **nothing but the Canvas2D primitives already in
the file** — four `polygon()` calls for the blades and body, two `ellipse()` for the
nacelles, one `rect()` for the deck. About twelve lines of geometry:

| statistic | arcade | target | ours today | **proposed procedural** |
|---|---|---|---|---|
| fin rows with two separated blades | 99–100% | ≥90% | 37.2% | **100.0%** ✅ |
| fin-pair lateral extent, % of SPAN | 35.4–35.7% | 30–40% | 26.9%¹ | **35.5%** ✅ |
| nozzle-centre separation, % of SPAN | 30.1% | 25–35% | 13.8% | **26.2%** ✅ |
| blade cant (top ÷ root half-sep) | 1.23–1.29 | ≥1.15 | 1.00 | **1.23** ✅ |
| SPAN/H aspect (sanity) | 3.24–3.30 | 3.0–3.6 | 2.51 | **3.28** ✅ |

¹ my fin-region onset lands a few rows lower than the lane's, which pulls three rows of the
step polygon into the fin region and inflates this one figure against their 12.6%. Every
other column agrees; the conclusion does not turn on it.

Five of five, landing essentially on the arcade's own values rather than just inside the
bands. **The geometry is not what Canvas2D is bad at.** Recipe: wingspan 100 px authored at
display size, height 31; nacelle centres at x=37/63 (nozzle separation 26% of span); one
blade rising from each nacelle centre, root half-separation 13, top half-separation 16
(cant 1.23); blades never meet, so every fin row has two runs. **Delete the
`fillRect(57, 8, 6, 13)` spine** — that one line is what welds the blades into the solid
centred bar and single-handedly destroys the two-blade statistic.

Evidence: `art-silhouette-ours-TOP-proposed-MIDDLE-arcade-BOTTOM.png`. Harness:
`<scratchpad>/discrim.py`, `<scratchpad>/run.py` (self-contained, no repo changes).

**What this does *not* buy, and why the sheet is still coming.** The discriminators
describe **one pose — level astern.** They are silent on everything my critique says is
actually wrong, and all of it survives a passing silhouette:

- the jet is still **one bitmap spun** by `material.rotation` (`player.js:120`), and the
  game is banked most of the time, where no discriminator looks;
- still **no keyline**, so it still dissolves into the sky at 1.4:1 contrast;
- still **anti-aliased interiors** feeding the 14 508-colour problem;
- still a **120 → 99 px non-integer rescale** with no pixel grid (the recipe above fixes
  this incidentally by authoring at display size);
- still **no dithering, no canopy, no warm palette.**

So the decision splits cleanly, and the lane should not be held on either half:

- **Now, procedurally (hours):** corrected silhouette per the recipe, plus keyline, plus
  the §3 palette, plus authoring at display size. This is the whole of fix #1's silhouette
  half and most of fix #2.
- **Next, as authored sheets (days):** the 9 bank poses and the 6 barrel-roll frames. These
  cannot be had procedurally at acceptable quality — parameterising nine foreshortened
  perspective views as polygon geometry is strictly harder than drawing them and will look
  worse — and they are the larger share of the visual gap.

One caution for whoever executes this. I4 says it plainly and it is the most important
sentence in that section: *"the reference crop remains authoritative over every number
above — the numbers exist to catch a wrong silhouette, not to define a right one."* The
proposed shape above is tuned to pass a test. **Nobody should ship it without putting it
next to `ab2-arcade-reload-dorsal.jpg` at 6× and looking at it**, which is exactly the step
this project has skipped for four rounds.

---

## 2. Element-by-element

### 2.1 Player jet — *the worst single sprite in the game*

**Evidence:** `art-jet-ours-left-arcade-right.png`, `art-jetposes-ours-TOP-arcade-BOTTOM.png`

**What the arcade does** (`stage1-flight-bank-t97.png`, `stage1-level-flight-t116.png`,
`ab2-arcade-closeup-enemies.jpg`, `stage4-barrel-roll-t222.png`): the F-14 is a set of
**separately drawn poses**. t116 (level) shows the planform flat and the nacelles end-on;
t112 (37° bank) shows the wings foreshortened on one side and the fuselage rotated in
*perspective*; t98 (hard bank) shows the aircraft nose-up with the wings nearly edge-on;
t222 (barrel roll) shows the **dorsal** surface in a different colour family entirely —
blue-grey top, not the white belly. Within one pose there is: a near-white top surface
`#fff7ef`, a cream highlight `#f7efa5` along the leading edges, a warm tan mid `#d6a563`,
a **dark brown shadow mass `#7b3a10` (V 0.48)** under the wing, a **black keyline** on the
trailing silhouette, black nozzle rings with small orange/red cores, the violet-magenta
canopy fleck `#9d3aca`, and visible 2-px checkerboard **dithering** where the white top
meets the grey side.

**What we do** (`src/render/spriteFactory.js`, `src/entities/player.js:120`): one 120×48
canvas, six flat fills of four greys plus a warm shadow, drawn with `ctx.beginPath()`
polygons and `ctx.arc()`. Banking is `sprite.material.rotation = -worldRoll * 0.8` — an
image-plane rotation of that **one bitmap**.

**Why ours reads worse:**

1. **It is one bitmap spun, and you can see it.** Put the four pose crops side by side
   (`art-jetposes-*`): ours are pixel-identical nozzle donuts, identical fin, identical
   wing slivers at four angles. A rotated bitmap under `NearestFilter` resamples on an
   arbitrary grid, so the wing edges come out as irregular stair-steps that *change shape
   every frame*. No arcade game ever rotated a sprite at an arbitrary angle, and the eye
   knows it instantly. **This is the #1 reason the jet reads as "a cutout", not an
   aircraft.**
2. **The texture is at a non-integer scale.** The canvas is 120 px wide; measured on-screen
   span is **99 native px** (bbox x 151–249). 120 → 99 under point sampling drops ~18% of
   columns at arbitrary positions, so the authored 3-px wing band renders 2 px here and
   3 px there. There is no pixel grid.
3. **No keyline.** Every arcade sprite in `reference/` has a 1-px dark outline or at
   minimum a dark trailing edge. Ours has none, so the `#fafafa` wing band runs straight
   into the `#009fff` sky with nothing between them, and the `#bfbfbf` nozzle housing sits
   on sky at a luminance contrast of **1.41:1**.
4. **The fins are the single most alien shape on screen.** Two `nacelle`-grey quads plus
   `fillRect(57, 8, 6, 13)` produce a solid dark rectangle with a notch — it reads as a
   crenellation, a crab claw, a Lego brick. The arcade's fins are *thin blades* with sky
   visible between them and the tailplane; ours is a filled slab. The criteria-fix lane
   has since quantified exactly this (§1b): the arcade shows two separated blades on
   **99–100%** of fin rows, ours on **38%**, and the blades sit **outboard** over
   widely-spaced nacelles (fin-pair extent 35% of span, nozzle separation 30%) where ours
   are jammed against the midline at 12.6% and 14.5%. The `fillRect` spine is the
   single line responsible.
5. **The nozzles dominate.** Three concentric `ctx.arc()` calls at r = 6 / 4.3 / 2.1,
   anti-aliased, give two soft yellow-orange donuts that are the brightest and largest
   feature of the sprite. The arcade's are small **black rings** with an orange core — the
   ring is the dark anchor of the whole silhouette. Ours has no black anywhere.
6. **No canopy.** The code explicitly removed it ("too small to read as a shape"). The
   arcade's magenta canopy fleck is the only non-grey, non-orange colour on the airframe
   and it is what stops the jet reading as a grey lump. 8 px of `#9d3aca` is worth more
   than the whole greyscale ladder.
7. **Wrong colour story, in both directions.** Measured on `stage1-flight-bank-t97.png`
   (see §3): **16% of the arcade jet's pixels are `#000008` — black** — and its *brightest*
   airframe value is `#c5c5ad` at **V 0.77**. Ours has no black at all and tops out at
   `#fafafa`, **V 0.98**. So our jet is simultaneously too bright at the top end and
   missing the entire bottom end: it is a pale flat cutout where the arcade's is a lit
   object with a dark underside. Our `#a48484` wing-underside shadow reads as a separate
   floating pink stick rather than an underside, because nothing attaches it.

**Concrete fix, in two stages (see §1b for why this split, and for the verified geometry):**

*Now, procedurally:* rebuild the silhouette to the §1b recipe — authored at 100×31, which
is display size, so one texel = one native pixel and the non-integer rescale disappears;
nacelles at x=37/63; one canted blade per nacelle with the `fillRect` spine **deleted**;
a 1-px `#000000` keyline on the whole outline; nozzle discs shrunk to r≈3 inside black
rings; the magenta canopy fleck restored; the §3 warm palette in place of the five greys.

*Next, as an authored sheet:* **9 drawn bank poses** plus **6 barrel-roll frames** (§4
inventory), and delete `material.rotation` from `player.js:120`, selecting the pose from
`worldRoll` instead. This is the half that procedural generation cannot reach.

### 2.2 Enemy aircraft — *they read as insects, and they are invisible*

**Evidence:** `art-enemy-ours-left-arcade-right.png`

**What the arcade does** (`ab2-arcade-closeup-enemies.jpg`, `stage1-lockon-missile-t100.png`):
the MiG is **dominated by a near-black green `#102910` at V 0.16 (27% of the sprite's
pixels)**, with a bright yellow-green specular stripe along each wing leading edge, a
mid-green chord split, a black outline, and a *small* three-ring nose — black ring, red
annulus, pale-yellow core. Against the V 1.00 sky that is a luminance contrast of roughly
**6:1**. The sprite is unmistakably an aircraft at 20 px.

**What we do** (`src/entities/enemySprite.js`): the dominant fill is `V78 = #c7c7c7` —
**contrast against `#009fff` sky: 1.46:1**. Darkest value anywhere is `#3a3a3a`, used only
for a ring. The file's own comment says enemies must "read dark against bright skies" and
then paints them near-white.

**Why ours reads worse:**

1. **Near-zero contrast.** Every airframe value we use measures 1.13–2.05:1 against the
   stage-1 sky. The arcade's dominant value is ~6:1. Our enemies *dissolve*.
2. **The rear-aspect sprite reads as a bee.** Two `ctx.arc` nozzle stacks with
   `NOZZLE_CORE = #ffe08a` centres, set symmetrically on a flat pale plank, are two
   glowing eyes — and the two canted fins above them, drawn as thin tapering spikes on an
   otherwise featureless body, are antennae. Look at the mid-distance enemies in
   `tools/out/art-critic/death3/frame-0006.png`: they are insects. Nobody intended this
   and everybody sees it. Compare the arcade's rear-aspect jets in `t100.75` — the nozzle cores
   there are *small* and sit inside large black rings, so the dark ring wins and the eyes
   effect never happens.
3. **The head-on nose intake is a bullseye.** `ctx.arc(cx, 18, 6)` on a 64-wide canvas =
   19% of the sprite's span is a red-and-black target. The arcade's is ~8%.
4. **No pose set.** One head-on texture, one rear texture, two far LODs. The arcade's
   enemies bank, roll and present oblique aspects as they cross; ours use
   `material.rotation = this.bank` (`enemy.js:294`) — the same spun-bitmap problem as the
   player, with the same arbitrary-angle resampling.
5. **Flat fills, no dither, no outline.** Same as the player.

**Concrete fix:** repaint the stage-1 enemy around a **near-black dominant** (`#102910`
family for the MiG; stage-1 is described as white/grey in GAME_SPEC §4 — if we keep grey,
the dominant must be `#31313a`-dark, not `#c7c7c7`), add a 1-px black keyline, shrink both
the nose intake and the nozzle cores by ~60% and surround each with a black ring, and add
a 1-px bright specular stripe on each wing leading edge. Then author 5 banked poses per
aspect and drop `material.rotation`.

### 2.3 Explosions — *a string of fried eggs*

**Evidence:** `art-explosion-ours-left-arcade-right.png`

> **Correction to my own first draft.** I originally derived this section's ramp from
> `stage8-canyon-explosion-t357.png`. The criteria-fix lane has since established (R5
> interfaces, I6) that t357's "fireball" is a **dissipating debris/smoke ring read through
> a desert-tinted frame** — some of its highlights are canyon floor seen through smoke. My
> t357-derived figures described a smoke mass, not a fireball, and the palette in §3 has
> been replaced with their verified ladder. **This strengthens the finding rather than
> weakening it**: their sharpest discriminator is brightest-decile saturation, where the
> arcade reads **0.063–0.246** against our **0.67** — i.e. the arcade's brightest pixels
> are nearly WHITE and ours are orange. That is the missing white-hot core, measured.

**What the arcade does** (`ab2-arcade-huge-explosion.jpg`, `death-starburst-gp-t202.png`,
`stage1-lockon-missile-t100.png`): a ramp running from a dark red rim to a **white-hot
core** — decile-band means `#9b0204` → `#d6050b` → `#f47a07` → `#f5d619` → `#f6f6e7`
(I6) — with mean V ≥ 0.85, **≥40% of pixels above V 0.95**, and a white-hot core
(S < 0.25, V > 0.94) covering ≥3% of the mass. Ours measures mean V 0.792 and only 20.1%
above V 0.95. The shape is *authored* — in t100 a
tall vertical **plume** with a white smoke column, in t357 a mass with a clear top/bottom
asymmetry, dithered at its boundary into the terrain. Red/white debris chunks fly as
separate small sprites. The construction is a **multi-frame animation sequence**: ignition
(white-hot), bloom, burn, smoke, dissipate.

**What we do** (`src/effects/explosions.js`): six lobes, each a stack of six concentric
`ctx.arc()` discs (P25 → P50 → P75 → P95 → CORE → HOT at radius scales
1.0/0.74/0.54/0.41/0.18/0.09), offset by 0.35 of the shrink, plus 11 spikes. Three such
arrangements are cycled at 14 Hz, on a 48×48 texture, drawn at ~72 native px, at a random
rotation (`material.rotation = rng() * 2π`).

**Why ours reads worse:**

1. **The ring radii are a radial gradient by another name.** The file's own comment says
   "no radial gradient anywhere in this file" and then builds six concentric discs per
   lobe and offsets them by 0.35 — not enough to break the ring. On screen each lobe is
   visibly a bullseye. Six bullseyes in a cluster read as fried eggs or baked potatoes.
   The radii were chosen *so that the measured brightness percentiles land on the authored
   colours* — a statistic was satisfied and the shape was never looked at.
2. **There is no white-hot core and no dark end.** Our brightest authored colour is
   `#fb9352` at saturation 0.67, drawn at ring scale 0.41; `#ffe06a` sits at scale 0.09,
   a 4-px disc. The arcade's brightest decile is `#f6f6e7`/`#f4ebb8` at saturation
   0.063–0.246 — essentially white — covering ≥40% of the mass. Ours: 20.1%. At the other
   end the arcade rim is `#9b0204`, a near-black red; our darkest is `#a6290f`. **The
   whole ramp is compressed into the orange midrange**, which is exactly why it reads as
   chalky orange produce rather than fire.
3. **It is 3 frames, not an animation.** Three lobe arrangements cycled at 14 Hz is a
   *shimmer*, not a sequence. The arcade explosion has a beginning (white flash), a middle
   and an end (black smoke). Ours has no narrative at all — it appears at 35% size, grows,
   and fades.
4. **Random rotation destroys the texture.** `material.rotation = rng() * 2π` on a
   nearest-sampled 48×48 texture resamples the lobes at an arbitrary angle, which is where
   the ragged brown rims come from.
5. **48 → 72 px is a 1.5× upscale**, so texels land as alternating 1-px and 2-px blocks.

**Concrete fix:** author an 8-frame explosion sequence as pixel art (§4 inventory). Frame
1 is a near-white flash, frames 2–4 are the fire bloom with **hand-placed asymmetric
lobes and a dithered boundary**, frames 5–6 introduce dark `#731908`/`#311000` smoke,
frames 7–8 are smoke only. Draw the sheet at the on-screen size (72×72) so there is no
rescale. Never rotate it.

### 2.4 Vulcan and missile projectiles / trails

**What the arcade does** (`stage4-vulcan-stream-t214.png`, `stage1-missile-salvo-t100.75.png`):
vulcan is a loose zig-zag column of small orange puffs; the missile trail is an opaque
ribbon whose tail breaks into discrete round white puffs; launches throw large white
billows.

**What we do:** the vulcan puff (`projectileSprites.js`) is the **one genuinely
well-made asset in the project** — authored as an explicit 8×8 pixel grid in a string
array, three measured colours, rim/body/core. It is right, for exactly the reason the
rest is wrong: a developer drew it pixel by pixel instead of calling `ctx.arc`.

The smoke puff (`smoke.js`) is five concentric `ctx.arc()` rings — a radial gradient
again. In `combat/frame-0002.png` it renders as a soft white cotton ball with an
anti-aliased rim floating next to the jet.

**Concrete fix:** apply the vulcan puff's authoring style to the smoke puff: an explicit
`PUFF_ROWS`-style grid, 8×8 and 16×16 variants, 3 values, with a dithered outer ring
rather than a smooth one. This is a 20-line change and it is the cheapest win in the file.

### 2.5 Sea / ground — *TV static, not water*

**Evidence:** `art-sea-ours-TOP-arcade-BOTTOM.png`

**What the arcade does** (`stage1-level-flight-t116.png`): the sea is **8 colours**, and
the structure is *large flat regions of deep blue punctuated by horizontal foam dashes*.
Measured on a clean native arcade frame (`ab2-arcade-desert.png`, which has no video
re-encode noise): **62.5% of horizontally adjacent pixels are identical, 61.0% of
vertically adjacent pixels are identical, and 29 colours cover 95% of the ground.** The
eye gets *rest*. Foam is not white — it is pale cyan `#7bd6ef` and mid cyan-blue
`#218cd6`, which sit close enough to the blue that they read as sparkle instead of noise.

**What we do** (`src/render/ground.js`): a 4-octave fbm value-noise field, with
*independent* noise samples driving V, saturation and hue (±7° jitter), plus a separate
high-frequency foam threshold layer mixing toward **pure white V 1.0**.

**Why ours reads worse:**

1. **Zero rest.** Measured on our frame: **14.8%** horizontal and **3.5%** vertical
   adjacent-pixel identity, versus the arcade's 62.5% / 61.0%. Every single pixel differs
   from its neighbours. That is the definition of noise.
2. **The hue jitter is backwards.** We randomise hue ±7° continuously; the arcade uses
   *two deliberate hue families* (pure blue hue ≈ 236 for the body, cyan hue ≈ 193–200 for
   the highlights). Random hue jitter desaturates: our sea measures **sat 0.70** against
   the arcade's **0.87–0.94**. On screen ours is a washed lavender-blue; theirs is
   electric.
3. **White foam is wrong.** `v = mix(vBase, 1.0, foam)` pushes crests to pure white, which
   against a saturated blue is maximum contrast — hence salt-and-pepper. Arcade foam tops
   out at `#7bd6ef`.
4. **The foam is isotropic.** Measured bright-blob runs: arcade mean horizontal run
   2.85 px with max *vertical* run 6; ours 1.82 px horizontal with max vertical run **12**.
   The arcade's foam is made of horizontal *dashes*; ours is made of blobs that are as
   tall as they are wide. (The ACF anisotropy metric the build was tuned against reads
   2.88× and passes — and is blind to this, because a field of isotropic specks with a
   slight horizontal bias has the same autocorrelation ratio as a field of drawn streaks.)
5. **No distance structure.** Our noise has the same apparent density at the bottom of the
   screen as 2 px below the horizon. The arcade's near field has big calm shapes with
   detail laid on top.
6. **The haze band is an airbrush.** Ours is a wide, perfectly smooth gradient wedge
   (`mix(uHazeAtHorizon, uHazeAtBandEdge, smoothstep(...))`). The arcade's is a *banded*
   ramp: `#73b5f7` → `#a5d6ff` → `#c5e6ff` → `#d6f7f7`, four discrete steps with dithered
   boundaries, then a hard drop into `#0008de`. Ours is the most obviously "modern-3D"
   region of the whole frame.

**Concrete fix (highest impact-per-hour in the project):** rewrite the sea fragment shader
to output **only** the 8 hexes in §3. Structure it as: (a) a low-frequency **banded**
distance field choosing one of 4 blue values, quantized to hard steps, not smoothstepped;
(b) a cross-track wave layer that selects between an adjacent *pair* of those blues with a
**4×4 Bayer ordered dither**, so the transition is a checkerboard of two palette colours
rather than an interpolation; (c) a foam layer that stamps **horizontal dashes 3–8 native
px long and 1 px tall** in `#218cd6` / `#7bd6ef`, not isolated pixels. Kill the hue
jitter; kill the white. Same for the haze band: 4 hard steps with a 1-row Bayer dither
between each pair.

### 2.6 Sky and horizon

The flat `#009fff` sky is correct and is the one thing that reads right (modal share 59%
of our frame). No change needed, except that under the §5 palette pass it must snap to the
ladder value `#009cff`.

The horizon line itself is soft because the haze band is soft — see §2.5.

### 2.7 Clouds

**What the arcade does** (`stage1-flight-bank-t97.png`): clouds are **two colours**,
`#f7eff7` and `#e6e6f7` (a near-white with a faint lavender second tone), in puffy
flat-bottomed cumulus masses with a hard, lobed, *dithered* boundary against the sky.

**What we do:** better than most of the build — the shapes are plausible cumulus lobes.
But the boundary is anti-aliased and there is no second tone and no dither, so in
`flight/frame-0008.png` the clouds read as soft white cotton rather than cut-out masses.
In `combat/frame-0002.png` a single small puff reads as a floating cotton ball.

**Concrete fix:** two tones only (`#f7eff7` body, `#e6e6f7` undershade on the lower-left
of each lobe), hard alpha, and a 1-px Bayer-dithered fringe where the cloud meets sky.

### 2.8 HUD and lettering — *the most fixable large win*

**Evidence:** `art-hud-ours-TOP-arcade-BOTTOM.png`

**What the arcade does** (`stage1-level-flight-t116.png`):
- The **SCORE emblem** is a designed Top-Gun-style winged badge: cream/white swept wings
  with diagonal stripes, red letters, and a **dark maroon `#63103a` outline/shadow that is
  18.6% of the emblem's pixels**. It is a drawn logo, not text in a box.
- Digits are cream `#e6efd6`/`#f7efa5` with a dark outline, bold and chunky.
- **SPEED** sits inside a **white plaque** — a solid light rectangle behind the red
  letters — which is exactly how it stays readable over a busy sea.
- The throttle bar is segmented: `0`, dots, an **amber filled block**, `2`, dots, `3`, all
  inline on one row.
- Missiles are little rockets with red tips in a tight row, plus a second row of thinner
  stock marks.

**What we do** (`src/ui/font.js`, `src/ui/hud.js`):
- 5×7 single-colour glyphs with **no outline and no shadow**, drawn flat onto the sky/sea.
- `drawText` fills `Math.round(pxX)`-wide cells while advancing the cursor by a fractional
  `pxX`. At `SCALE_EMBLEM = [1.6, 1]` that means 2-px-wide cells advanced 1.6 px apart —
  **columns overlap and gap unevenly**, which is exactly why "SCORE" in our frame has
  broken-up letterforms with holes in the S and C.
- The emblem "wings" are four 1-px `fillRect` bars — they read as barcode fragments, not
  as a swept badge.
- The HIT counter at 0 renders as an **empty white rectangle** (the `0` glyph is a plain
  hollow oval at `[2,1]` scale, so it reads as a box, not a digit).
- `SPEED` is `DARK_RED` **directly on the sea with no plaque**, and the label physically
  overlaps the throttle bar.
- The `0 1 2 3` tick numerals are on a *separate row above* the bar; the arcade has them
  inline.
- `STAGE` is red directly on sky with no outline. The stage `1` at `SCALE_STAGE_DIGIT`
  `[6, 2]` renders as a fat tan blob that does not read as a numeral.
- Missiles are white sticks with red dots on top — they read as matchsticks.

**Concrete fix, in order:**
1. **Give every glyph a 1-px outline.** Change `drawText` to render each glyph twice: once
   in the outline colour at the 8 neighbour offsets, once in the fill colour. For the HUD
   that is `#000000` or `#63103a` behind cream/red. This single change fixes legibility
   everywhere — HUD, title, cards — and it is ~10 lines.
2. **Fix the fractional-cell bug**: snap `pxX` to an integer and adjust the target widths,
   or render at integer scale into a temp canvas and `drawImage` it stretched with
   smoothing off. Fractional cell advance can never produce clean letterforms.
3. **Put `SPEED` and `STAGE` on plaques** — a filled light rectangle 1 px larger than the
   text box on every side.
4. **Draw the SCORE/HIT emblems as authored bitmaps**, not as font text in a red box.
   They are logos; a 54×10 and a 28×10 hand-drawn PNG each.
5. Move the throttle tick numerals inline with the bar and give the bar an amber fill
   segment.
6. Redraw the missile pips as 2×5 rockets with a red nose and a dark body outline.

### 2.9 Death sequence — *the explosion problem at full screen size, plus a live bug*

**Evidence:** `art-death-ours-TOP-arcade-MIDDLE-bug-BOTTOM.png`
**Repro:** `node tools/capture.mjs --out <dir> --frames 12 --every 36 --url-params "demo=1&forcedeath=4"` → frames 6–11.

Everything wrong with §2.3 is *naked* at screen-filling size. In frame 7 the death
starburst is six discs, each visibly a set of **concentric rings** — a brown-orange outer
ring, a salmon ring, and a **square yellow core** (the innermost `blobs(HOT, 0.09)` disc
is ~4 px on a 48-px canvas, so at a 4× upscale it becomes a 3-texel block, i.e. a
square). The 11 radiating spikes are not visible at all. The result reads as a cartoon
clover or a Lego flower. The arcade's (`death-starburst-gp-t202.png`) is a genuine
starburst: long irregular radiating spikes, a white-hot core, asymmetric lobes.

**And there is a live rendering bug.** From the frame after the starburst onward, the sea
renders as **pure greyscale** — measured on `death4/frame-0010.png`, sea region colours
are `#000000` (43%), `#f7f7f7` (16%), and a smooth grey ramp between — **saturation 0** —
while the sky is still stage-1 `#009fff` and the clouds are still white. The frame looks
like the water has been replaced with television snow.

The colour ramp identifies the mechanism precisely: it is `ground.js`'s all-zeros `sea`
fallback (`{hueDeg: 0, satLo: 0, satHi: 0, vLo: 0, vHi: 0}`, `ground.js:281`) combined
with the foam term `v = mix(vBase, 1.0, foam)` — `vBase` collapses to 0 (black) and foam
ramps it to white. That is *not* the stage-3 speckle path, which would produce two
discrete values (`#06060a` / `#fff2c8`), so `uGroundMode` is still 0. Something is calling
`ground.setStage()` with a stage object that has no usable `sea` block while
`groundMode !== 'speckle'`, and the sky is not being switched in step with it. I did not
trace further — I am report-only — but a developer should start at `flow.js:128`
`_enterStage` / `flow.js:290` `_startTally` and check what the death→respawn→tally path
actually passes. **This is the single most jarring thing in the build and the owner cannot
have missed it.**

### 2.10 Title screen

**It does not appear.** `flow.js:99` sets `state = 'flight'` whenever `demoActive`, and
`tools/capture.mjs` forces `?fixed=1` — so every capture, including a judge's, boots
straight into gameplay (`tools/out/art-critic/t0/frame-0000.png` is gameplay at tick 0).
The title code exists but no one capturing this build will ever see it.

As written (`titleScreen.js`), the title renders "AFTER BURNER" in the **5×7 HUD bitmap
font** with the first letter recoloured, plus two lavender bars standing in for the sphere
"II". The arcade title (`title-screen-t74.png`) is a bespoke **brush-stroke logo** — each
letter is a hand-drawn calligraphic shape with varying stroke weight and cut corners — in
front of an "II" built from ~80 individually shaded lavender spheres with red-hot cores.
A bitmap HUD font cannot approximate this at any scale; the gap is not one of tuning.

**Concrete fix:** the title lettering must be an authored 280×90 PNG, drawn once. The "II"
sphere matrix is a second authored PNG (or a small sphere sprite stamped on a grid — that
part *is* procedurally reasonable, since the arcade built it the same way). Also: make the
title the boot state for a plain `?fixed=1` capture, or add `?title=1`, so it is
reviewable at all.

---

## 3. Palette spec — stage 1

All values below are measured from `reference/` by median-cut quantization of the named
region and then **snapped to the Sega 5-bit ladder** (channel values ∈ {0, 16, 25, 33, 41,
49, 58, 66, 74, 82, 91, 99, 107, 115, 123, 132, 140, 148, 156, 164, 173, 181, 189, 197,
206, 214, 222, 230, 239, 247, 255}). Share % is the colour's share of that region.

**Rule for the whole project: no colour anywhere may be off this ladder.** In practice:
quantize each channel as `round(c * 31) / 31`.

### Sky
```
#009cff   flat fill, top to horizon, no gradient    (ladder-snapped #009fff)
```

### Sea — 8 colours, no more
```
#0008b5   19%   V 0.71 S 1.00   deep shadow trough
#1910bd    2%   V 0.74 S 0.92   trough variant
#0010e6   24%   V 0.90 S 1.00   base water  (dominant)
#0008e6   12%   V 0.90 S 1.00   base variant
#003ad6    8%   V 0.84 S 1.00   mid
#2142de    8%   V 0.87 S 0.85   mid-light
#218cd6   17%   V 0.84 S 0.85   near foam  (CYAN, not white)
#7bd6ef   10%   V 0.94 S 0.49   foam crest (PALE CYAN, not white)
```
Dither between *adjacent pairs only* (4×4 Bayer). Foam is horizontal dashes 3–8 px × 1 px.

### Horizon haze band — 4 hard steps, dithered boundaries
```
#73b5f7  →  #a5d6ff  →  #c5e6ff  →  #d6f7f7   then hard drop to  #0008de
```

### Player F-14 — 8 colours + keyline

> **Self-correction.** My first draft of this palette was extracted from
> `ab2-arcade-closeup-enemies.jpg`, whose ambient is an orange stage-2 sky; it came out as
> cream/tan/brown and would have put a **tan jet on the blue stage-1 sea**. Re-measured on
> `stage1-flight-bank-t97.png` instead. The stage-1 airframe is **low-saturation neutral
> grey (S 0.09–0.15)** with only two warm accents, and it is **darker than ours at the top
> end**: the arcade's brightest airframe pixel is V 0.77 against our `#fafafa` at V 0.98.

```
#000008   keyline / nozzle rings / panel lines   16% of the sprite — effectively BLACK
#c5c5ad   lightest top surface      V 0.77 S 0.12   (NOT white — ours is V 0.98, too bright)
#b5ada5   light neutral             V 0.71 S 0.09
#a59c8c   mid neutral               V 0.65 S 0.15
#6b737b   cool dark slate           V 0.48 S 0.13
#ad7b5a   warm underside shadow     V 0.68 S 0.48   (the measured "warm-tinted shadow grey")
#422921   deep warm shadow          V 0.26 S 0.50
#9d3aca   canopy fleck (6–10 px total, never more)
#ef7308   nozzle flame core  +  #ffd600 hot centre (2–4 px per nozzle, inside a BLACK ring)
```
Dither `#c5c5ad`↔`#a59c8c` along the top/side break; dither `#a59c8c`↔`#ad7b5a` along the
underside break. **Note the value ceiling:** nothing on the airframe goes above V 0.77.
Our current five-grey ladder is both too bright at the top and has no black at all, which
is why the jet reads as a pale cutout rather than a lit object.

*(The warm `#fff7ef`/`#f7efa5`/`#d6a563`/`#7b3a10` family is the correct palette for the
orange-sky stages — keep it for the stage-2 variant, not stage 1.)*

### Enemy MiG — 8 colours, **dark-dominant**
```
#000000   keyline
#102910   near-black green, DOMINANT (~27% of sprite)   ← the critical value
#2d4a21   mid green
#5a3a19   warm shadow
#8cad31   bright yellow-green specular stripe (1 px, wing leading edges only)
#ce8c31   sunlit top highlight
#e61000   nose intake annulus
#f7efa5   nose intake core (2–3 px)
```

### Explosion — the verified ladder (R5 interfaces I6; supersedes my t357 draft)
```
#9b0204   rim        near-black red
#d6050b              deep red
#f47a07              orange body
#f5d619              hot yellow
#f6f6e7   core       WHITE-HOT  (S 0.06)
#311000   smoke      frames 5-8
#000000   smoke core / debris keyline
```
Binding acceptance, from I6: mean V ≥ 0.85; **≥40% of pixels above V 0.95**; white-hot
core (S < 0.25, V > 0.94) ≥ 3% of the mass; **brightest-decile saturation ≤ 0.30** (ours:
0.67); mean saturation 0.75–0.90. The brightest-decile saturation is the sharp one — it is
exactly the has-a-white-hot-core question, and the mean-saturation and palette statistics
we already pass are blind to it. Use **decile-band means**, never single percentiles.

### Clouds
```
#f7eff7   body
#e6e6f7   undershade (lower-left of each lobe)
```
Hard alpha, 1-px Bayer-dithered fringe against sky.

### HUD
```
#63103a   emblem/text outline + drop shadow   ← we have nothing here today
#e6efd6   cream digits and emblem wings
#f7efa5   bright digit highlight
#e61000   SCORE / HIT / SPEED / STAGE letters
#f7b500   amber throttle fill, lock-on confirm
#f7f7f7   plaque background behind SPEED / STAGE
```

### How many colours per sprite, and where dithering belongs

- **A sprite uses 4–8 colours**, one of which is a near-black keyline. The arcade's enemy
  MiG at native crop quantizes cleanly to 6 non-sky colours; the player jet to 7.
- **Dithering belongs at value transitions inside a sprite** (top surface → side surface,
  lit wing → shadowed wing) and **at the boundary between two large flat regions**
  (cloud→sky, haze step→haze step, fire→terrain). It is a 2-colour checkerboard between
  *adjacent palette entries*, 2–4 px deep.
- **Dithering does not belong as all-over texture.** That is what our sea does and it is
  why it reads as static. In the arcade, dither is a *transition device* surrounded by
  flat areas; 62% of adjacent pixels on a real arcade ground are identical.

---

## 4. Verdict on the pipeline

**Runtime procedural Canvas2D cannot produce arcade-quality sprites, and it is the ceiling
this project has hit.** Switch to authored PNG sprite sheets committed to the repo.

The reasoning is not aesthetic preference, it is mechanical:

1. **Canvas2D antialiases path fills and there is no way to turn it off.** The project
   already knows this — `pixelTexture.js` has a `hardAlpha` post-pass that thresholds the
   alpha channel to kill the soft rim. But hard alpha only fixes the *edge*; the interior
   of every `ctx.arc` and every polygon still carries blended colour, which is a large part
   of the 14 508-colour number. You cannot author a 6-colour sprite with a tool that blends.
2. **Vector primitives produce vector shapes.** `ctx.arc(cx, 40, 4.3)` is a circle. Pixel
   art is not made of circles; it is made of deliberate pixel runs that *suggest* a circle
   while reading cleanly at 8 px. The nozzle donuts, the smoke rings, the explosion lobes
   and the enemy bullseye nose are all the same failure, and no amount of parameter tuning
   fixes it because the primitive is wrong.
3. **Animation frames are the thing the arcade has and we don't.** The arcade's aircraft
   bank through drawn poses; its explosions are sequences. We have one static texture per
   object plus an image-plane rotation. Procedural generation *could* in principle emit
   multiple frames — but authoring 9 banked F-14 poses as parameterised Canvas2D geometry
   is strictly harder than drawing them, and will look worse.
4. **It has already cost more than drawing would have.** `spriteFactory.js` is 153 lines
   for one static jet, of which ~100 are comments explaining which acceptance statistic
   each polygon was tuned to satisfy. That is not a sprite; it is a regression suite with a
   picture attached.

**What stays procedural:** the sea/ground shader (it must be perspective-correct, so it
has to be a shader — but it must output only palette colours, per §2.5), the sky, the
cloud *placement*, and the final palette-quantization blit. The vulcan puff's explicit-grid
style is the correct pattern for anything small enough to be hand-specified in code.

### Sprite sheet inventory a developer would need to produce

All PNGs, indexed or RGBA, **no anti-aliasing, no colour outside §3**, 1-px `#000000`
keyline on every airframe. Drawn at the size they will be displayed at (listed), so no
rescale happens at the dominant zoom level.

| sheet | cell | frames | contents | palette |
|---|---|---|---|---|
| `player-f14.png` | 100×40 | **9** | bank −65°, −45°, −25°, −10°, level, +10°, +25°, +45°, +65°. Each a *drawn* 3/4 astern perspective, not a rotation. | player, 8 |
| `player-f14-roll.png` | 100×40 | **6** | barrel-roll sequence: belly → edge-on → dorsal → edge-on → belly (dorsal frames use a blue-grey top family, see `t222`) | player, 8 + 2 dorsal greys |
| `player-f14-far.png` | 40×16 | 5 | same bank ladder, chunky LOD for distance | player, 5 |
| `enemy-mig-head.png` | 64×32 | **5** | head-on: bank −30°, −15°, level, +15°, +30° | enemy, 8 |
| `enemy-mig-rear.png` | 64×32 | **5** | rear aspect, same bank ladder | enemy, 8 |
| `enemy-mig-far.png` | 16×8 | 2 | head/rear LOD, fully opaque (keep the existing full-width-band invariant — that reasoning is sound) | enemy, 4 |
| `explosion.png` | 72×72 | **8** | flash → bloom ×3 → fire+smoke ×2 → smoke ×2. Hand-placed asymmetric lobes; dithered boundary. | explosion, 11 |
| `explosion-big.png` | 160×160 | **10** | player-death starburst (`death-starburst-gp-t202.png`): radiating spikes + multi-lobe core | explosion, 11 |
| `debris.png` | 4×4 | 3 | red/white chunks, 3 tumble frames | 3 |
| `smoke-puff.png` | 16×16 | 4 | white → grey dissipation, dithered fringe | 4 greys |
| `launch-billow.png` | 48×48 | 5 | missile launch smoke, lumpy, dithered | 4 greys |
| `missile.png` | 16×8 | 3 | body + flame, 3 flame-flicker frames | 5 |
| `hud-score-emblem.png` | 56×11 | 1 | the winged SCORE badge, drawn | HUD, 4 |
| `hud-hit-emblem.png` | 30×11 | 1 | the winged HIT badge | HUD, 4 |
| `hud-missile-pip.png` | 3×11 | 2 | stocked / empty | HUD, 3 |
| `hud-throttle.png` | 120×9 | 1 | the bar frame with tick marks and inline numerals | HUD, 4 |
| `font-5x7.png` | 6×8 | 40 glyphs | the HUD font **with its 1-px outline baked in**, 2 colour variants (cream-on-dark, red-on-light) | 3 each |
| `title-logo.png` | 280×90 | 1 | "AFTER BURNER" brush-stroke lettering, hand-drawn | 4 |
| `title-sphere.png` | 12×12 | 1 | one lavender sphere with red-hot core; stamp on a grid to build the "II" | 5 |
| `lock-bracket.png` | 16×16 | 2 | tracking / locked | 2 |
| `cloud-lobe.png` | 64×48 | 4 | cumulus mass variants, flat-bottomed, dithered fringe | 2 |

**Policy note (ARCHITECTURE.md D5):** every sheet above is an **original drawing in AB2's
style**. No SEGA sprite data is to be copied, traced pixel-for-pixel, or extracted from a
ROM. The palettes in §3 are *measurements* of colour, which is a fact about the reference,
not an asset; the shapes must be drawn fresh from the structural descriptions here and in
REFERENCE.md.

---

## 5. Ranked fixes, by impact per unit of work

0. **Fix the greyscale-sea bug after death** (§2.9). Not an art task and not a judgement
   call — the sea turns into black-and-white television snow and stays that way. It costs
   more player goodwill than anything else on this list and is probably a one-line fix.
   → `art-death-ours-TOP-arcade-MIDDLE-bug-BOTTOM.png`

1. **Fix the jet, in the two stages of §1b.**
   **(a) Rebuild the silhouette procedurally — hours, not days, and it unblocks the
   sprite-art lane today.** Separated outboard canted blades over widely-spaced nacelles,
   the `fillRect` spine deleted, authored at display size. Verified here to pass all five
   discriminators at the arcade's own values.
   → `art-silhouette-ours-TOP-proposed-MIDDLE-arcade-BOTTOM.png`
   **(b) Then give it drawn bank poses and delete `material.rotation`** (`player.js:120`).
   The jet is on screen 100% of the time, is the largest sprite, and is the one object the
   player's eye tracks. A spun bitmap is the loudest single "this is not an arcade game"
   signal in the build — and no silhouette statistic looks at it.
   → `art-jetposes-ours-TOP-arcade-BOTTOM.png`

2. **Put a 1-px black keyline on every sprite, and a 1-px outline on every glyph.** One
   change to `drawText` plus one outline pass per sprite. Nothing else in this list is
   cheaper per unit of visible improvement: it fixes the jet dissolving into the sky, the
   enemies dissolving into the sky, and the entire HUD at once.

3. **Rebuild the sea from the 8-colour palette with Bayer dithering and horizontal foam
   dashes** (`ground.js`). The sea is ~35% of every frame and currently reads as TV static
   — 14.8% adjacent-pixel identity against the arcade's 62.5%. Killing the hue jitter and
   the white foam alone will transform it.
   → `art-sea-ours-TOP-arcade-BOTTOM.png`

4. **Darken the enemies.** Change the dominant airframe value from `#c7c7c7` (1.46:1
   against sky) to a near-black (≈6:1), shrink the nose intake and nozzle cores by ~60%
   and ring them in black. A one-file edit to `enemySprite.js` that makes enemies legible
   for the first time — and stops them reading as insects with glowing eyes.
   → `art-enemy-ours-left-arcade-right.png`

5. **Redraw the explosion as an 8-frame authored sequence with a white flash and black
   smoke**, spanning V 0.45–0.90 at S ≥ 0.79, and stop rotating it randomly. The current
   bullseye-lobe cluster is the second most-noticed sprite after the jet, and it is the
   one every previous round has described as "muddy" without identifying why.
   → `art-explosion-ours-left-arcade-right.png`

6. HUD layout: plaques behind `SPEED`/`STAGE`, inline throttle numerals, fix the
   fractional-cell advance bug in `drawText`, draw the SCORE/HIT emblems as bitmaps.
   → `art-hud-ours-TOP-arcade-BOTTOM.png`

7. Add the 5-bit palette quantize + ordered dither to the blit shader (`screen.js` — it is
   currently a `MeshBasicMaterial`, so this is a drop-in `ShaderMaterial`). Cheap, global,
   and it keeps future work honest — but as noted in §1, **do it after 3 and 5, not
   instead of them**, because quantizing noise just gives you quantized noise.

8. Two-tone the clouds with a dithered fringe; convert the smoke puff from `ctx.arc` rings
   to an explicit pixel grid in the vulcan puff's style.

9. Make the title screen reachable in capture, and replace the font-rendered logo with an
   authored brush-stroke bitmap.

### A process note, offered as the root cause

Every file I read contains long comments of the form *"ring radii are chosen so the AREA of
each band puts the measured brightness percentiles on the authored colours"* and *"measured
25.6% coverage (target ~23%)"*. The craft discipline in this codebase is real and it is
pointed at the wrong target. **A statistic can be satisfied by an object that looks
nothing like the thing the statistic was measured from** — six concentric-ring lobes and a
real fireball can share a p50; isotropic specks and drawn wave streaks can share an
autocorrelation ratio; a 2.70:1 silhouette aspect can be a crab claw or an F-14.

The fix to the *process* is to add two acceptance criteria that no statistic can
launder, and to check them by eye on a native-resolution crop:

- **Colour cardinality**: ≤ 256 unique colours per frame, all on the Sega 5-bit ladder;
  ≤ 8 per sprite. (Today: 14 508 and 254 ladder-violating channel values.)
- **Adjacent-pixel identity** on ground regions ≥ 50% horizontally and vertically.
  (Today: 14.8% / 3.5%; arcade 62.5% / 61.0%.)

Both are one-line measurements, both are impossible to satisfy with the current pipeline,
and both would have caught every problem in this document in round 1.

---

## Evidence images

All in `/Users/urizonens/dev/afterburner-three/judging/R4/`:

- `art-jet-ours-left-arcade-right.png` — player jet at 6×; ours (banked) | arcade t97 | arcade t116
- `art-jetposes-ours-TOP-arcade-BOTTOM.png` — four of our "poses" (one bitmap spun) over four arcade poses (four drawings)
- `art-enemy-ours-left-arcade-right.png` — enemy sprites at 9×; ours | arcade closeup MiG | arcade t100
- `art-explosion-ours-left-arcade-right.png` — fireball at 7×; ours | arcade t100 plume | arcade t357
- `art-sea-ours-TOP-arcade-BOTTOM.png` — sea + horizon haze at 5×; ours over arcade t116
- `art-hud-ours-TOP-arcade-BOTTOM.png` — top and bottom HUD strips at 5×, ours above arcade in each pair
- `art-palette-ours-TOP-arcade-BOTTOM.png` — swatch board, our authored palette over the measured arcade palette, for sea / player / enemy / explosion
- `art-death-ours-TOP-arcade-MIDDLE-bug-BOTTOM.png` — death starburst ours / arcade, plus the greyscale-sea bug
- `art-silhouette-ours-TOP-proposed-MIDDLE-arcade-BOTTOM.png` — §1b: current silhouette (0 of 5 discriminators) over the proposed procedural one (5 of 5)

Source captures: `tools/out/art-critic/{t0,title,flight,combat,combatsolo,death,death2,death3,death4}/`.

### Coverage note

Captured and inspected: title-state boot, neutral flight, banked flight, sustained combat,
kill explosions, the player death starburst and the frames after it. **Not covered:** the
carrier launch, the READY respawn card, the CONTINUE card and the stage tally card — the
death sequence runs past the tumble into a state I could not get a clean card frame out of
within this pass, and `?debugtally=1` was not exercised. Those four screens are unreviewed
and should be looked at before the next round closes.

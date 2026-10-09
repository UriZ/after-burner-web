# R6 — world lane

Files touched: `src/render/ground.js`, `src/render/sky.js`, `src/render/clouds.js`,
`src/game/stage.js`, `tools/measure_criterion_ab.py`, `tools/measure_sea_dashes.py` (new),
`tools/world_r6_boot_probe.mjs` (new). Nothing else.

Every figure below is reproducible with the commands quoted beside it. Capture dirs are under
`tools/out/world-r6/`; the one the final numbers come from is `tools/out/world-r6/VERIFY`.

---

## 0. The build was down twice, and only one of them was mine

**Mine.** The session that was killed mid-edit left five crest-sparkle uniforms referenced in
the fragment shader and declared nowhere, so the program failed to link
(`'uCrestDensity' : undeclared identifier`). `vite build` passed throughout — it does not
compile GLSL. Fixed by declaring them and wiring them through `defaults`, the material's
uniforms and `setStage()`. Values are derived, not guessed; see §2.

**Not mine.** Mid-round the tree went down again in `src/render/spriteFactory.js`
(`hexToRgb` → `Cannot read properties of undefined (reading 'slice')`, reached from
`drawJetSilhouette` → `buildJetTexture` → `Player`). I did not touch it.

**Two process defects this exposed, both worth fixing regardless of this round:**

1. `tools/capture.mjs` collects page errors into an array and prints them only *after* the
   capture loop. When the boot is broken, the 10 s `waitForFunction('window.__frameReady')`
   throws first and the real cause is discarded — you get a bare puppeteer `TimeoutError`.
   The error dump belongs in a `finally`. **The TL has since made that change**, hoisting the
   `errors` array out of the `try` so a boot failure prints its real cause; the success path
   was re-verified. `tools/world_r6_boot_probe.mjs` remains as a standalone probe — it loads
   the page, waits, and prints `__frameReady`, `typeof __step` and every pageerror **with its
   stack** — and is what produced the diagnosis above in one run.

   A second lesson from the same incident, from the TL: on a shared tree a boot failure in
   another lane's file is as likely to be a **half-written save** as a real defect, and the
   two separate cleanly — a half-save clears on a re-run, a defect does not. **Re-run once
   before diagnosing.** I spent a diagnosis cycle on what turned out to be a transient.
2. **Silent corruption in the sweep harness, not in the tool — and a cheap general detector
   for it.** Worth stating as a mechanism, because every lane that sweeps has the same
   exposure.

   The shape: a sweep loop that (i) edits a parameter, (ii) rebuilds, (iii) captures with
   `node tools/capture.mjs ... >/dev/null 2>&1`, (iv) measures the output directory. Suppressing
   stderr was the whole bug. When capture began failing, step (iii) produced nothing and
   exited non-zero into a void; step (iv) then measured **whatever was already in that
   directory** — in my case the previous sweep's frames, because the directory name was reused
   across runs. No error, no exception, no empty-input complaint. Just numbers.

   Note what is *not* broken here. `capture.mjs` refuses unknown arguments and will not write
   a default path; `measure_sea_dashes.py` refuses a non-integer upscale; both selftest clean.
   The tools are fine. The corruption lives in the *harness around* them, which is a place
   this project had not yet been bitten and which no tool-level control can reach.

   **The detector: two different parameter sets that return byte-identical numbers.** That is
   not a coincidence worth shrugging at, it is a proof that at least one of the two runs did
   not happen. It is cheap, it needs no instrumentation, and it generalises — any sweep can
   check it for free by keeping the previous row and comparing. I caught this only because the
   agreement was implausible on its face, then confirmed it with `md5 -q` on the two frames.
   Three hardening rules, in order of value:
   - **Never suppress capture's stderr in a sweep.** Filter its success lines
     (`| grep -v '^captured'`) instead of discarding the stream.
   - **Use a fresh output directory per sweep row, or delete it first.** A reused directory is
     what converts "capture failed" into "capture silently returned stale data".
   - **Treat identical output from different inputs as a failed run until disproved.**

   Both affected rows were discarded and the parameters re-set to the last state I had actually
   verified, rather than left at the unverified values the dead sweep had written.

---

## 1. Gap 1 — stage 1's sea. Gate figures

**Operator**: `tools/measure_criterion_ab.py`, built this round from REFERENCE.md's prose as a
second independent instrument. `--selftest` passes synthetic controls (flat fill, 1 px
checkerboard, 2×2 blocks, region gating, a uniform-random field) **and reproduces both
published arcade frames exactly**: desert 138 colours / 31 channel values / H 68.72 / V 68.49,
night 79 / 17 / H 83.95 / V 80.24. HUD mask derived per run with `tools/hud_mask.py`, never
hardcoded.

```
node tools/capture.mjs --out tools/out/world-r6/VERIFY --frames 6 --every 240 \
  --url-params "seed=1&nocombat=1"
python3 tools/measure_criterion_ab.py --dir tools/out/world-r6/VERIFY \
  --hudmask-cache tools/out/world-r6/hudmask
```

| figure | R5 judge (before) | now (median of 6) | gate | arcade |
|---|---|---|---|---|
| unique colours, whole native frame | 14 344 | **51** (max 56) | ≤ 256 | 138 / 79 |
| channel values, union over RGB | 238 | **31** median (29–37, see below) | ≤ 32 | 31 / 17 |
| H-identity, ground band − HUD mask | 28.3 % | **80.5 %** | ≥ 50 % | 68.7 / 84.0 |
| V-identity, ground band − HUD mask | 3.3 % | **57.8 %** | ≥ 50 % | 68.5 / 80.2 |
| V-identity, 280×48 near patch | **0.0 %** | **55.7 %** | ≥ 50 % | — |

Four of the five pass on every one of the six frames. **The channel-value figure does not, and
my first write-up of it was wrong — this is a correction.**

I originally reported "31 on every frame". That was true of the six frames I had, and it does
not generalise: those were all sampled at one tick spacing (`--every 240`). Re-running at four
spacings (137 / 211 / 300 / 419, five frames each, 19 stage-1 frames after excluding one that
had progressed into stage 2) gives:

| | min | median | max | over the ≤32 gate |
|---|---|---|---|---|
| whole-frame channel values | 29 | **31** | **37** | **2 of 19 frames** |
| **ground-band channel values** | **13** | **13** | **13** | 0 of 19 |
| whole-frame colours | 51 | 56 | 66 | 0 of 19 (gate ≤256) |

**The ground is 13 on all nineteen frames** — the sea itself is nowhere near the limit. The two
excursions are the **HUD reticle**: its attitude line rotates, and at diagonal angles its
antialiased pixels emit a tail of near-greys. Localised on the worst stage-1 frame to native
rows 25–51, cols 247–274 — the reticle box — as 28 pixels carrying 11 distinct colours
(`#9d9da8 #a8a8b5 #b2b2b7 #90909d #848490 #bdbdbd …`). I checked specifically whether any of
them came from my cloud layer: **none are cloud-palette colours**, and the clouds in the same
frame are exactly the six authored hexes. The reticle is `ui/**` and belongs to another lane.

Two process points, since both are the sort of thing this project pays for twice:
- **A gate measured at one tick spacing is not measured.** Six frames 240 ticks apart sampled
  one phase of a rotating HUD element and reported a clean pass. The fix is cheap — vary the
  spacing, not just the count — and I would not have found it by taking more frames at 240.
- **Report the gated subsystem separately from the frame.** "Whole-frame channel values" is a
  composite over five lanes' output; the ground figure is the one that says whether *this*
  lane's work passes, and it is unambiguous at 13.

**Scope of the correction: only the channel-value gate was spacing-sensitive.** I re-ran
Criterion B at all four spacings rather than assume it, and it is stable —

| `--every` | band H | band V | patch H | patch V |
|---|---|---|---|---|
| 137 | 80.04 % | 59.74 % | 79.31 % | 55.81 % |
| 211 | 81.06 % | 58.52 % | 79.59 % | 55.83 % |
| 300 | 80.55 % | 58.58 % | 79.97 % | 56.70 % |
| 419 | 79.94 % | 57.41 % | 79.48 % | 55.21 % |

— a 1.2-point spread on band H and 2.3 on band V, every cell far above the 50 % floor. That is
what a figure measured on a large region of a scrolling field looks like; the channel-value
count is fragile instead because it is a **set cardinality**, so a single 1-pixel colour
anywhere in the frame moves it as much as a thousand pixels do. Worth remembering when
choosing which statistics to gate on.

The sweeps report 0 black and 0 duplicate frames throughout.

Non-regressions the TL named, re-checked: sky patch modal colour `#009fff` at **100.0 %** on
three frames; horizon fitted at native row **140 of 224 = 62.5 %H** on all six.

---

## 2. What the gates could not see, and what actually fixed the picture

**Criterion A and Criterion B both passed while the sea was still obviously wrong.** With the
filtered-fbm cap layer in place the frame read 56 colours / 31 channel values / H 89.3 / V 55.1
— green across the board — and `world-02-sea-nearpatch-BEFORE-*.png` put beside the arcade at
native is a deep blue field carrying a few **enormous smooth pale slabs** where the arcade
carries a dense scatter of short bright dashes.

It is worse than the gates merely missing it. A big flat slab is *more* self-identical than a
dash field, so the wrong structure scored our H-identity **20 points above the arcade's own
68.7 %**. A statistic that improves as the art gets worse cannot be the thing you author
against. This is the CLAUDE.md rule in its literal form and it is the main finding of my round.

### New instrument: `tools/measure_sea_dashes.py` (SEA-DASH)

Same operator both sides. Ours: integer upscale decimated to native with every k×k block
checked uniform. Arcade: the same *screen fraction* of `stage1-level-flight-t116.png`
area-averaged (`Image.BOX`) back to the patch size — averaging approximately inverts an
upscale where point sampling would keep one arbitrary sub-pixel. Mask is `V > 0.95` on
max(R,G,B)/255, which is REFERENCE.md's own published foam operator; 4-connected components;
report count and the width/height/area distributions.

`--selftest` checks the labeller against hand-countable inputs (single pixel, a 1×5 dash, a
2×1 mark, a diagonal pair that must stay two components under 4-connectivity, a full mask),
checks the V threshold at the exact 242/243 boundary, and calibrates the arcade side against
REFERENCE.md's published t116 foam fraction (reads **19.5 %** on this patch against the
document's 23.4 % on its own, larger, near-field band).

**The discriminating statistics are the extremes, not the medians.** The medians agreed
between a correct sea and a badly wrong one — both are ~2 px wide and 1 px tall, which is just
what a thresholded field's small components look like. A median-only criterion would have
called the slab build correct.

| 280×48 near patch | before | now | arcade t116 |
|---|---|---|---|
| foam fraction (V>0.95) | 47.3 % | **18.4 %** | 19.5 % |
| components | 148 | **435** | 389 |
| width p50 / p90 / **max** | 2 / 10 / **280** | 2 / 8 / **40** | 2 / 9 / **38** |
| height p50 / p90 / **max** | 1 / 2 / **30** | 1 / 3 / **12** | 1 / 4 / **8** |
| area p50 / **max** | 2 / **2194** | 3 / **97** | 2 / **82** |

A single component spanning the entire patch width and a sixth of its area, against an arcade
maximum of 82 px. Crop: `world-01-sea-nearpatch-ours-TOP-arcade-BOT.png`.

### The three defects it found, and the fix for each

**(a) The "far" cap layer was 9.0 world units wide and was never distance-gated.** It was meant
to survive to the mid field; because nothing stopped it running in the near field, where
`worldPerCol` is 0.0399, 9.0 world units is **225 native columns**. That is the slab, exactly.
Replaced by two non-commensurate sparse single-octave `valueNoise` scatters sized in *native
pixels* at the d = 8.58 reference distance (0.40 / 0.24 → 10.0 px × 2.0 rows; 0.27 / 0.155 →
6.8 px × 1.3 rows), deliberately **not** LOD-filtered. A sparse thresholded layer keeps its
area fraction under point sampling and loses only spatial coherence, which is what distant
sparkle should do — so the far field stays populated without the ungated coarse layer.

**(b) Statistics matched and the arrangement did not.** With a flat cap threshold the dash
figures were already good (foam 19.0 vs 19.5, 398 components vs 389, w p50/p90 2/7 vs 2/9) and
the crop still read as an *even* scatter of white specks, like snow, where t116 groups its
crests into loose horizontal lines with plain water between. Fixed by gating the cap cut on the
base index field `t` — which *is* the wave-height field the ramp is keyed to — so a crest is
easy to break and a trough hard, and the caps fall into wave bands by construction rather than
being arranged into them by hand.

**(c) The base stack was reaching the top of the ramp.** `#0010f7` came out at 9.2 % of the mid
field against REFERENCE.md's 9.1 % on t116 — a bullseye — while the largest connected V>0.95
component was 624 px across 84 columns, and inspecting its pixels showed it was **not foam**:
it was the swell layer's broad band happening to land on the brightest rung. The swell layer
*should* paint broad bands (t116 shows three water levels in quantity) but must paint them in
the ramp's middle. `seaBaseCeil: 0.74` clamps the base at index 11 and reserves indices 12–15
for the sparse scatter. Costs nothing in quantity — the crest density sets the fraction
instead — and buys the arrangement. This is the "dominant flat base + sparse high-contrast
scatter" reconciliation, made structural rather than just described.

---

## 3. The haze band was a solid slab, and it was the largest single wrong thing left

**Discriminator**: `R > 48`. The sea is `#0010xx` and the sky is `#009fff`, both R = 0, while
every measured haze colour (`#6cafff #93c7ff #c3edff #d1f4f8`) has R ≥ 0x6c — so this separates
haze from *both* neighbours, which a value or saturation test does not.

**Measured on side columns only** — x[20,95) + x[235,300). Including the centre put 50–100 %
"haze" on rows 120–139 that was the **player jet**, which is pale and sits there. Fraction of
columns reading as haze, per native row:

| row | 130 | 134 | 138 | 142 | 146 | 150 | 152 | 154 | 158 | 161 |
|---|---|---|---|---|---|---|---|---|---|---|
| ours, before | 0 | 0 | 0 | 100 | 100 | 100 | 100 | 100 | 97 | 9 |
| ours, now | 0 | 0 | 0 | 97 | 73 | 18 | 14 | 4 | 4 | 9 |
| arcade t116 | 99 | 97 | 54 | 54 | 56 | 28 | 7 | 0 | 0 | 6 |

Ours was a 100 % slab with vertical cliffs at both ends. The arcade's lower boundary is a
**ragged contour** — `world-03-arcade-haze-boundary.png` shows it wandering several rows up and
down from column to column — and half-coverage over a band of rows *is* that contour crossing
those rows.

So `hazeMix` stopped being an alpha and became a **coverage probability resolved to 1 bit**
against a per-column dither. That is also the only thing 1987 tile/sprite hardware can do, and
it pays twice: the band stops emitting intermediate haze/sea mixtures, which is pure
Criterion A win.

Two details that matter:

- The dither noise varies with x and with `uScroll` but **not** with `vWorldPos.z`,
  deliberately. Near the horizon one native row spans hundreds of world units, so any z
  dependence aliases into salt-and-pepper instead of a contour. Dropping z makes the threshold
  constant down each column, so each column crosses exactly once.
- The threshold's spread is widened by 1.8× about 0.5. Bilinear value noise is a sum of four
  weighted uniforms and piles up around 0.5 (σ ≈ 0.17); unwidened, the ragged zone measured
  **six** native rows against the arcade's ~15. This is CLAUDE.md's "percentile calibration on
  fbm noise" trap with the sign flipped — there the noise never reached the top of its nominal
  range, here it never reaches the bottom either.

**Open, and not mine to fix:** the arcade's haze band *peaks* at rows 130–134 and is already
at 54 % by row 138, i.e. its band straddles a horizon several rows **above** ours. Our horizon
is at 62.5 %H, which is the published value and is driven by `game.js`'s camera pitch. I held
it. The consequence is that rows 140–145 read ~97 % where the arcade reads 54 %, and nothing in
`ground.js` can fix that. Flagged for whoever owns the camera constant.

---

## 4. Closing the V-identity gate — the lever was not the one the decomposition first suggested

This was the round's isolated miss and it is worth recording how it moved, because the obvious
fix was the wrong one.

**The decomposition.** Splitting vertical adjacent pairs on the 280×48 near patch by whether
each pair straddles the foam mask:

| | P(pair) | V-identity within | contributes |
|---|---|---|---|
| both non-foam | 68.3 % | 73.5 % | **50.2 pts** |
| both foam | 6.1 % | 25.5 % | 1.6 pts |
| mixed | 25.6 % | 0 by definition | 0 |

So the base term is ~97 % of the total. The dashes get all the attention and the number
actually rests on the base's own 73.5 %.

**The obvious fix, and why it stalled.** Foam pairs read 25.5 % because most dashes are one row
tall, so taller dashes should help. They do, barely. The controlled pair — everything else held, only the cap and crest Z cell
sizes changed — is `capFreqZ/capFreq2Z/crestFreqZ` 0.48/0.155/0.30 → 0.90/0.58/0.56, which
moved near-patch V **47.7 % → 49.0 %** while pushing max dash height to 14 px against the
arcade's 8. Nearly doubling the cell bought 1.3 points and started breaking the dash geometry
the crop had just validated. (An earlier 0.24-cell reading of 46.9 % is in the logs but was
taken at a different grain amplitude, so it is not part of that controlled comparison.) The reason is arithmetic: the supra-threshold region of a bilinear noise
cell is about a quarter of the cell, so even a 12-row cell yields a p50 height of 1 — and the
arcade's own dashes are p50 1 as well, so "make them taller than the reference" was never going
to be the answer.

**What worked: `uSeaLodBoost`.** The base stack is now filtered against a pixel deliberately
*larger* than one native pixel. The LOD cut was at Nyquist, which is the correct answer to
"will this octave alias?" and the wrong answer to "should pixel-art water carry detail at this
scale?" — an octave two native pixels across is perfectly resolvable and still flips the ramp
index every other row.

Measured sweep, near-patch V-identity against the three statistics it trades against:

| `seaLodBoost` | near-patch V | horiz decorrelation (texels) | common-res anisotropy | p5–p95 spread |
|---|---|---|---|---|
| 1.0 (Nyquist) | 49.6 % | 12.6 | 3.42× | 0.259 |
| 1.8 | 56.3 % | 7.4 | 3.28× | 0.192 |
| **2.6 (shipped)** | **61.2 %** | **4.2** | **3.10×** | 0.192 |
| 3.4 | 63.7 % | 3.2 | 3.19× | 0.192 |
| 4.6 | 64.9 % | 2.9 | 3.33× | 0.161 |

Note that V-identity and the horizontal decorrelation length move **the same way** — they are
not in tension. That is the dominant-flat-base mechanism working as advertised: smoothing the
base lets the sparse scatter dominate the variance, so the ACF collapses at lag 1 *and* most
adjacent pairs stay base-on-base. The dash geometry is untouched across the whole sweep.

The cost is the value spread collapsing to 0.192, which was then recovered to 0.290 by raising
`seaSwellAmp`/`seaWaveAmp` to 2.0/2.7 — see §9(d) for that trade. Final shipped figures are
near-patch V **55.7 %** and spread **0.290**.

---

## 5. Clouds were the entire remaining Criterion A failure, and the sea rebuild exposed it

Splitting a six-frame run by region made this unmissable — the ground is invariant and the sky
is not:

| frame | sky+cloud rows [0,130) | ground rows [145,224) |
|---|---|---|
| 0 | 17 colours / 23 channel values | 42 / 18 |
| 3 | 86 / 105 | 41 / 18 |
| 4 | **714 / 221** | 42 / 18 |

Two mechanisms, both continuous-tone by construction:

1. **Minification.** `makeCloudTexture` keeps `magFilter` NEAREST but leaves `minFilter` at
   three's mipmapped trilinear default, *deliberately* — R3 measured that nearest minification
   shatters a shrinking cloud into 12–14 disconnected components (target max 6) and crushes its
   width to ~1.9 %W against 9.26. That fix is correct and stays. But trilinear blends palette
   rungs against each other, which is why frames 0/1/2/5 (one large, magnified cloud) read 17
   colours and frames 3/4 (smaller, minified) read 86 and 714.
2. **Alpha blending.** The soft perimeter blended cloud against `#009fff` across a one-pixel
   ramp, generating a fresh continuum at every edge. 1987 sprite hardware cannot do this at
   all — a sprite pixel is either an opaque palette index or the transparent index. The soft
   edge was never arcade-correct; it was a three.js default.

Fix keeps the filtering (silhouette stays coherent) and removes the continuum after it: patch
three's built-in sprite shader at `<alphatest_fragment>` to discard below α 0.5, force α to 1,
and snap the filtered texel to the nearest entry of that cloud's own 6-colour palette. Snapping
to the **palette** rather than to the 31-rung ladder is the stronger choice — a ladder snap
would still let two palette rungs interpolate into a third valid-but-unauthored rung, whereas a
palette snap also satisfies Criterion A3 (≤ 8 colours for a cloud sprite) by construction,
against the arcade cloud puff's measured 5.

The comparison runs in **linear** working space (`THREE.Color.setStyle(hex, SRGBColorSpace)`
against a texture tagged `SRGBColorSpace`, so `map_fragment` hands back a decoded texel). sRGB
double-encoding is this project's most-repeated bug, so I verified it by measurement rather than
by reading: cloud pixels come back as **exactly** `#f7f7f7 #e6e6f7 #d6d6e6 #c5c5d6 #b5b5c5
#a4a4b5`, the authored hexes, not near them.

**Result: frame-0004 went 753 → 61 colours and 221 → 31 channel values.** Every frame now
passes Criterion A.

---

## 6. Gap 8 — cloud width, as a side effect

I did **not** retune presence or height, per instruction. The 1-bit alpha trims the soft
perimeter, which moves width on its own:

```
python3 tools/classify_clouds.py --frames "tools/out/world-r6/VERIFY/frame-*.png" --stats
```

| | R5 judge | now (all components) | now (excluding one sliver) | accept band | arcade cloud-only |
|---|---|---|---|---|---|
| width median %W | 25.94 | 22.19 | **20.16** | 14–24 | 20.41 |
| width p90 %W | 43.12 | 28.94 | 21.78 | 25–40 | — |

Both readings are now inside the 14–24 band. **Caveat, stated because the sample is thin:**
6 frames yielded only 3 components, 2 of them truncated at the frame edge, and one of the
three (`30.62 %W × 2.53 %H`, aspect 12.1) is a flat sliver that is very unlikely to be a cloud
— the "excluding one sliver" column drops it via `--keep 0,2`. Presence is 33.3 %. I would not
publish a width median off three components without a longer run; treat this as "moved in the
right direction and no longer above the band", not as a settled figure.

---

## 7. Gap 5 — stage 2's racetrack

`world-05-stage2-BEFORE.png` → `world-06-stage2-AFTER.png`. The lanes and the radial smearing
are gone; it now reads as one terrain mass with broad irregular patches and a fine near-field
stipple.

**Two independent mechanisms, not one.**

**(a) Band scale — the symmetric lanes.** `bandPeriod` was 11.0 world units. The band model and
its measurement are both right: the arcade's ground *is* organised into strips along the flight
axis. What was wrong is the scale, and the reason is a perspective argument the original note
missed. The period was fitted against `ab2-arcade-desert.png`, which is a **steep/top-down**
frame — it has no sky at all, which is why Criterion B's operator special-cases it. From above
you see a wide swath, so several strips are in frame and a short period reproduces that. The
*level forward* view sees a narrow corridor, and `stage2-flight-t140.png` shows one vegetation
mass with one irregular edge plus one road. Both frames are consistent with a large period;
only the top-down one is consistent with 11.

Resized from the view frustum, not refitted by eye: visible ground half-width is
`d · halfTanFov · aspect = 0.744 · d`, so 7.3 world units at the near field (d = 9.8) and 45 at
d = 60 where haze takes over. `bandPeriod: 90` puts at most one boundary across the visible
wedge. `bandWander` 3 → 22 over a 150-unit wavelength so that boundary meanders into a diagonal
instead of standing straight. `roadHalfWidth` and `roadEdgeJitter` are fractions of the
*half-period*, so they were rescaled to hold their world size (0.085 → 0.024); leaving 0.085
against a 45-unit half-period would have painted a 96-native-pixel road.

I also added a `+0.5` phase to `bandT` so the band centre sits at `x = wander` rather than half
a period away. Without it, enlarging the period moved the road to x = 45 — outside the near
field entirely — and it simply vanished from the frame.

**(b) An unfiltered stipple — the radial smearing.** `stipV/stipS/stipH` were raw `fbm2`. The
frequencies are *not* the problem and must not be "fixed": `grainFreqX 0.19 / grainFreqZ 0.72`
is a 3.8× world-space anisotropy that exists precisely to look **isotropic on screen**, because
one native row covers 0.12 world units against a column's 0.0399. The problem is that the 3×
ratio is only right at one distance — it is 3.0 at d = 8.6 and **18** at d = 48 — so by the mid
field every feature is sampled far below Nyquist down the column and aliases into long vertical
smears converging on the vanishing point. Now LOD-filtered per fragment against that fragment's
own `worldPerRow`, which is right at every distance where a frequency change could only ever be
right at one. Anisotropy also brought from 3.8× to 2.9×, matching the near field's own stretch.

### Honest limit, written down rather than papered over

Filtering the stipple at full Nyquist removes the smear completely **and empties the mid
field**: measured against `ab2-arcade-desert.png` at native over the same rows, ours came back a
smooth brown wash where the arcade carries dense 1–3 px detail all the way to its haze
(`world-07-stage2-stipple-ours-TOP-arcade-BOT.png`). That is not a bug in the filter — it is a
mismatch in what is being modelled. **The arcade does not perspective-texture a ground plane at
all.** Its ground is a scaled raster layer, so texture detail stays roughly constant in *screen*
space at every distance. A world-space noise field sampled through a perspective camera cannot
do that: its detail density falls off as 1/d, and any filter honest about Nyquist must then
delete it.

I under-filter at `stipLodBoost: 0.35` to keep the mid-field detail and accept some aliasing.
The radial streaking is addressed by the anisotropy change, not by the filter. **Reproducing
the arcade properly means driving the stipple from a partly screen-space coordinate.** That is
a real change with a known failure mode on the other side — a screen-locked texture does not
flow, which is the R2 "dead ground" defect — and I did not attempt it in the time left. It is
the next step for stage 2 and it is the reason stage 2 still reads flatter than the reference.

---

## 8. The sky glow was a Criterion A failure on stages 2 and 3, and it was being blamed on the ground

Splitting the clouds-preview harness frames by region at native (channel values, union):

| region | stage 1 | stage 2 | stage 3 |
|---|---|---|---|
| sky rows 0–120 | 21 | 22 | 16 |
| **horizon rows 120–145** | 12 | **111** | **46** |
| ground rows 145–195 | 13 | 16 | 9 |
| whole frame | 30 | **121** | **63** |

Stage 1 passes and stages 2 and 3 fail **entirely in the horizon band**, while their *grounds*
are the cleanest part of the frame. What differs is that stage 1's sky is a flat fill
(`skyGlowElevDeg 0`, ramp inert) while 2 and 3 run a real gradient: `#e67300 → #f7ce00` over
4°, and `#000005 → #000331` over 1.5°. `ground.js` quantizes its own output; `sky.js` never
did, so a smooth mix of two ladder colours emitted every value between them.

Fix: posterize the ramp **and** apply a 4×4 ordered (Bayer) dither — posterize alone would put
N visible hard lines across a glow only a few degrees tall. The dither costs no extra colours
(the output is still exactly N+1 mixes of two colours) and is what the hardware does.
`gl_FragCoord` is in native 320×224 here (ARCHITECTURE.md D3), so the 4×4 cell is a true pixel
cell, not one smeared across the upscale.

| | before | after | gate |
|---|---|---|---|
| stage 2, colours / channel values | 176 / **121** | 60–68 / **41–43** | ≤256 / ≤32 |
| stage 3, colours / channel values | 81 / **63** | 45–49 / **30** | ≤256 / ≤32 |
| stage 1, colours / channel values | 51 / 31 | 51 / **31** | unchanged |

**Stage 3 now passes. Stage 2 does not** — 41–43 against 32. I located the residual rather than
guessing at it: it is no longer concentrated anywhere (sky 22, horizon 20, mid 15, far 11), and
**15 of them come from the bottom HUD rows, which is `ui/**` and another lane's file.** I also
posterized stage 2's gold ground haze band (`hazeSteps: 6`), worth 176 → 68 colours on its own.

One trap worth recording for the next person: `hazeSteps` is read by `paramsFor()` out of
`stage.terrain`, **not** out of `stage.haze`. Putting it under `haze` beside `bandHeightFrac` —
which is where it reads as if it belongs — is a silent no-op. I wrote it in the wrong block
first and caught it only by grepping where the key is consumed.

---

## 9. Left open, with reasons

**(a) CRITERION AUDIT — the 50 % V-identity floor on a stage-1 sea patch is an extrapolation
from non-sea frames, not a measurement of the thing it gates.** Raised for the criteria lane.
I meet the floor (55.7 %) and am not asking for relief; this is about the criterion being
sound, not about this round's verdict.

The chain:

1. Criterion B's published arcade figures are **68.8 / 68.5** (`ab2-arcade-desert.png`) and
   **84.0 / 80.3** (`ab2-arcade-night-banking.png`). REFERENCE.md is explicit that these are
   the **only two true-native 320×224 PNGs we hold** and that "only the two true-native PNGs
   qualify on the arcade side".
2. REFERENCE.md also reads the HUD digit on each: the desert frame is **stage 2**, the night
   frame is **stage 3**.
3. Therefore **we hold no true-native stage-1 frame at all**, and no adjacent-pixel identity
   figure has ever been measured on the arcade's *sea*.
4. The 50 % floor is licensed to all stages on the argument that Criterion B describes the
   *medium* rather than the stage — which is a reasonable argument and may well be right. But
   it is an argument, not a measurement, and the sea is the one surface where it is least
   obviously safe: a dense dash field is structurally unlike desert or night ground, and
   **mixed foam/non-foam pairs contribute 0 by construction** (25.6 % of all vertical pairs on
   our patch — see §4). A sea reproducing the arcade's own dash statistics exactly would still
   carry that penalty, and nothing on the arcade side demonstrates what value the real stage-1
   sea lands at.

**The frame everyone reaches for cannot settle it.** `stage1-level-flight-t116.png` is the
canonical stage-1 sea reference and it is a **686×480 video frame**. Measured with the same
operator used on our side, its V-identity on the 280×48 near patch is **2.8 %** (H 4.8 %) — against the
true-native arcade frames' 68.5 %. That is not a property of the arcade's sea; it is re-encode
noise and a non-integer upscale, which is precisely why Criterion B's operator forbids video
in both directions.

I checked that this is not an artefact of my own area-averaging step: measured on the **raw
686×480 video pixels** of the same region, with no resample at all, it reads **H 20.3 % /
V 14.0 %**. Higher, because a non-integer upscale makes neighbouring output pixels share a
source pixel and inflates identity — the second of the two directions REFERENCE.md warns
about — and still nowhere near 68.5 %. Both readings are wrong, in opposite directions, by
construction. t116 cannot carry any lag-1 statistic.

So the gate cannot currently be validated against the surface it gates. Two honest ways out,
neither mine to choose: source a true-native stage-1 frame (the `youtube-reference` skill can
add a source, but a video source cannot fix this — it needs a native-resolution capture), or
state the 50 % floor explicitly as an **extrapolated medium-level bound with no stage-1
evidence behind it**, so the next author knows what they are tuning to. What should not happen
is the figure continuing to be quoted as though the arcade's sea had been measured.

**(b) Horizontal decorrelation length — still fails, and the criterion itself needs an audit.**
`tools/measure_sea_acf.py` reports 11.6 native texels against a gate band of 1.21–2.25. It was
23.5 at the start of my session, so the direction is right and the magnitude is not. But the
gate band is taken from `stage1-level-flight-t116.png`, a **686×480 video frame**, and
decorrelation at lag 1 is an adjacency statistic — exactly what CLAUDE.md says video deflates
through re-encode noise, and exactly why Criterion B refuses video outright. The same tool
measures t116's V-identity at **2.8 %** against the true-native arcade frames' 68.5 %, which is
a direct demonstration that this frame cannot support lag-1 statistics. I do not think the
1.21–2.25 band is a real target; I did not tune to it, and I am not asserting a replacement
without a true-native stage-1 frame, which **we do not hold**. For the criteria lane.

**(c) Cross-track anisotropy regressed on the common-resolution operator.** 4.95× (R5) → 3.04×
against the arcade's 5.21×. Attributed, not hand-waved: the start-of-session build measured
6.18× with `hx = 74.41` where the arcade is 41.63 — i.e. it cleared the *ratio* while being
nearly twice as smooth as the arcade in absolute terms, which is the degenerate satisfaction
R3's judge warned about and is why REFERENCE.md pairs the ratio with a length. We are now at
`hx 9.39 / hy 3.34`, finer than the arcade on both axes. The native-resolution ratio from the
same tool reads **4.56 (gate ≥ 2.0, passes)** and moves in the *opposite* direction to the
common-res one. Two operators under one name disagreeing in sign is a reconciliation job, not a
number to pick from; I am reporting both rather than quoting the flattering one.

**(d) Value spread 0.290 against the arcade's 0.302–0.329.** Close but under. Recovered from
0.192 by raising `seaSwellAmp`/`seaWaveAmp` to 2.0/2.7 late in the round, at a cost of ~4 points
of V-identity margin (62.2 → 57.8), which I judged worth it: the spread is a REFERENCE.md
*binding* texture statistic whose failure was a named R2 defect, and V-identity still clears its
gate on every frame.

**(e) Stage 2 still reads flatter than the arcade.** Mechanism identified in §7; the fix is a
screen-space stipple coordinate and it is a real piece of work.

**(f) `tools/measure_criteria_ab.py` was renamed to `tools/criteria_lane_ab_control.py`
mid-round** by the criteria lane. REFERENCE.md line 96 still cites the old name. Not my file;
flagging because a reviewer following that citation will hit a missing file.

---

## 10. Instrument changes

- **`tools/measure_sea_dashes.py`** — new, described in §2. Selftest passes.
- **`tools/measure_criterion_ab.py`** — the horizon fitter was **wrong and was inflating
  Criterion B on exactly the frames it broke**. It scanned top-down for the first run of 6
  non-sky rows; a cumulus is such a run starting 120 rows above the sea, so frames with a large
  central cloud fitted the horizon at rows **21 and 26** against ~140 on the others. That put
  the whole sky inside the "ground band", and a flat sky is ~100 % self-identical, so those
  frames scored 3–21 points too high. Now scans **bottom-up**: a cloud is bounded above *and*
  below by sky, so the first sky-like run coming up from the bottom is the real horizon whatever
  is floating above it. Immune by construction. Added a selftest control with that exact failure
  in it (sky, a high-contrast cloud blob at rows 12–48, ground below row 140 — must return 140).
  After the fix the fitter returns **140 on all six frames**, independently confirming the
  published 62.5 %H horizon. This is the third time something white and high-contrast in the
  upper sky has defeated a fit in this project.
- **`tools/world_r6_boot_probe.mjs`** — new, 20 lines; see §0.

## 11. One opportunistic cleanup, with its control

Another lane added `src/core/cameraGeom.js` this round as the single home for `CAMERA_HEIGHT`
/ `CAMERA_PITCH` / `FOV_DEG`, collapsing copies that had been hand-synced across `game.js`,
`player.js` and `flow/carrier.js`. `ground.js` held a **fourth** copy, with a comment saying
"not imported — game.js is another lane's file; keep these in sync if those ever change". That
comment is now wrong, and a wrong comment about synchronisation is worse than no comment: the
next person retuning the camera reads it and does not look here. `core/*` is this lane's, so I
imported from the module and rewrote both comments.

**Control, because a refactor claimed to change nothing should be made to prove it:** captures
before and after at the same seed and tick spacing are **byte-identical on all five frames**
(`md5` on `tools/out/world-r6/SPAN211` vs `REFACTOR`). The constants were already numerically
equal, so this is a pure de-duplication; the md5 check is what turns that from an expectation
into a verified fact.

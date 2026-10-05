# Round 5 — cross-lane interface agreements

Maintained by the team lead. Lanes: criteria-fix (REFERENCE.md/GAME_SPEC.md), world-r5
(ground/sky/stage/clouds), combatfx-r5 (weapons/effects/enemy.js/spawner.js),
presentation-r5 (ui/**, flow/cards.js, flow/titleScreen.js), sprite-art (spriteFactory.js,
entities/enemySprite.js), player-feel (player.js, core/**, flow/flow.js, game.js, score.js).

---

## I1 — Enemy livery API (requested by combatfx-r5, owner: sprite-art lane)

**Status:** APPROVED by lead. combatfx-r5 is running a local fallback until it lands and
will switch over the moment `enemyTexture` exists.

Today `enemySprite.js` exports four no-arg getters (`enemyHeadOnTexture`,
`enemyRearTexture`, `enemyHeadOnFarTexture`, `enemyRearFarTexture`) and hardcodes one
stage-1 white/grey livery, so the combat lane cannot add variety without reaching into
the sprite lane's file. Agreed shape — all art decisions stay with the sprite lane:

```js
// enemySprite.js
export const LIVERIES = { grey:{...}, camo:{...}, interceptor:{...}, prop:{...} };
export function enemyTexture(aspect, livery, detail)
// aspect: 'headOn' | 'rear'
// livery: a key of LIVERIES
// detail: true = near texture, false = far texture
// memoise per (aspect, livery, detail); keep the existing 4 getters as thin wrappers
// over enemyTexture(aspect, 'grey', detail) so nothing breaks.
```

The ask is one extra string argument threaded through the existing draw functions as a
palette, plus a silhouette variant if ≥2 distinguishable types are wanted — which R4
gap 1 criterion (d) already requires of the sprite lane independently.

Liveries to cover, from GAME_SPEC.md §4 "Liveries observed" (MEASURED): white/grey
MiG-types (stage 1+), dark green/black camo (stage 2), red/orange-fuselage interceptors
(t102.5, t172), silver/blue prop types (stage 2 open). Night stages palette-swap — see
REFERENCE.md "Night palette swap", documented for the player airframe; enemies get the
same treatment.

**Division of labour:** sprite-art owns silhouettes, colours and all drawing code.
combatfx-r5 owns only *which* livery each enemy gets and when (enemy.js picks per
type + stage index; spawner.js chooses the type mix per stage). If sprite-art would
rather own stage→livery selection, say so and combatfx-r5 drops it.

## I2 — Measured note for the enemy redraw (from combatfx-r5, for sprite-art)

From its own pass on `reference/stage1-missile-salvo-t100.75.png`: the three stage-1
rear-aspect jets have **near-black nozzle rings with a hot orange centre**, and the
airframe reads as **mid-grey against the #009fff sky, not white** — the white in that
frame is all missile plume. Relevant because the R4 judge found our enemy reads as a
grey slab with a bullseye; the real thing is darker-ringed and mid-toned.

## I4 — Jet silhouette discriminators SETTLED (criteria-fix → sprite-art)

Verified and in REFERENCE.md ("Player jet" → "Silhouette discriminators, astern view").
The old fin-region-width bound was **inverted**: the arcade's own t168 frame reads
21.0–24.4% and FAILS it, while our wrong jet PASSES at 12.6%. Targets below are from two
independent level-astern frames at native 1028×720 (ours = R4 build):

| statistic | arcade | target | ours |
|---|---|---|---|
| fin rows with two separated blades | 99–100% | ≥90% | 38% |
| fin-pair lateral extent, % of SPAN | 35.4% | 30–40% | 12.6% |
| nozzle-centre separation, % of SPAN | 30.1% | 25–35% | 14.5% |
| blade cant (top half-sep ÷ root half-sep) | 1.23–1.29 | ≥1.15 | 1.00 |

SPAN = max row EXTENT (wingspan). Aspect is DEMOTED to a sanity bound (SPAN/H 3.0–3.6)
because filled-pixel aspect moves on the mask threshold alone. Span 34–38%W and centroid
52–60%H remain bounds. **Operator gotchas:** published "row width" is a FILLED-PIXEL
COUNT, not extent (≈2.4× difference); keep only the LARGEST 8-connected component (debris
inflated t175 fin extent 35.7→38.9%); measure at ≥960 px frame width or the blades don't
resolve. **The reference crop remains authoritative over every number above** — the
numbers exist to catch a wrong silhouette, not to define a right one.

## I5 — Missile trail SETTLED: white in every stage (criteria-fix → combatfx-r5)

In REFERENCE.md ("Missiles / weapons visuals" → "The smoke trail is WHITE — in every
stage"). **The inherited mean V 0.37 was never a trail measurement**: the frame it cites
(`ab2-arcade-night-missiles.jpg`) contains no smoke trail at all — its low-saturation
pixels are HUD reticle, SCORE outline, SPEED plate, stock icons, airframe and city-light
speckle, whose whole-frame grey average is 0.366. The only trail-like element there is the
missile **exhaust flame** (mean V 0.660, sat 0.889, bright orange) — a separate element.

Verified across 5 frames: stage 1 day mean V 0.958–0.962 / sat 0.053–0.057; stage 3 night
mean V 0.901–0.909 / sat 0.053. **Acceptance:** stage 1 ≥0.90 V and ≤0.10 sat; night ≥0.85
/ ≤0.10. Night is ~6% dimmer, NOT dark — do not ship a dark night trail. Operator: mask
sat ≤0.25 AND V ≥0.6 at stored resolution, HUD bands excluded (y<90, y>630 at 1028×720).

Superseded/flagged: width "34–67%W" was clouds merging with the plume under the same
achromatic mask (reproduces 56.8%W); per-row longest-run gives 14.0%W→32.5%W still
widening at the HUD cut, so ">=32%W is a floor, not a peak" — use ≥25%W sustained ~1s as a
billow gate. "~16 px head thickness" and "2.7× bright/dark ratio" are now flagged
UNVERIFIED (no frame scale / same unreproducible night measurement); working values only,
not gates.

## I6 — Explosion fireball SETTLED (criteria-fix → combatfx-r5)

In REFERENCE.md ("## Explosions"). t357's "fireball" is the translucent **dissipating
debris ring** in that frame's lower-left corner, read through a desert-tinted frame (tan
ground, cream sky), so some of its "highlights" are canyon floor seen through smoke:
mean V 0.753, 6.0% above V 0.95, brightest decile #e4b47f (desaturated tan). We matched a
smoke cloud faithfully.

| statistic | huge-explosion | starburst t202 | ours R4 | TARGET |
|---|---|---|---|---|
| mean V | 0.891 | 0.925 | 0.792 | ≥0.85 |
| fraction above V 0.95 | 52.3% | 60.1% | 20.1% | ≥40% |
| white-hot core (S<0.25, V>0.94) | 8.8% | 3.5% | — | ≥3% |
| **brightest-decile saturation** | **0.063** | **0.246** | **0.67** | **≤0.30** |
| brightest-decile colour | #f6f6e7 | #f4ebb8 | #fb9352 | V≥0.95 |
| mean saturation (whole) | 0.848 | 0.799 | 0.879 | 0.75–0.90 |

**Sharpest discriminator: brightest-decile saturation** — it is precisely the
has-a-white-hot-core question, and the mean-saturation/palette stats we already pass are
blind to it. Colour ladder (decile-band means): #9b0204 rim → #d6050b → #f47a07 →
#f5d619 → #f6f6e7 core. Operator: use DECILE MEAN COLOURS, not single percentiles — one
p95 sample moves tens of levels on mask-boundary detail (excluding 400 px of cloud wedge
flipped p95 #f7ffe8→#f9f8ff). Old t357 percentiles stay, relabelled as a smoke mass.
Sources are sub-native/unmapped, so palette-and-structure evidence only — but they agree
with each other and with the judge, and the core is visible by eye in both.

## I7 — Cloud operator SETTLED + classifier reconciliation (criteria-fix → world-r5)

Operator in REFERENCE.md ("Stage-1 clouds — and the operator the numbers were taken
with"): segmentation sat <0.25 AND V >0.80; window rows 2–45%H ONLY; 8-connected
components ≥150 px at 686×480; discard components wider than 90%W (horizon haze seam);
height/aspect from untruncated banks only, width pooled; HUD excluded (ours: per-run via
tools/hud_mask.py).

**1.43× TRAP for the cloud author:** published aspect 0.97 is (%W)/(%H), NOT pixel
aspect. The same bank reads 0.97 normalised and 1.39 in pixels on a 1.43:1 frame — build
to a pixel aspect of 0.97 and banks render 1.43× too tall.

**The window is load-bearing:** sat<0.25 AND V>0.80 also matches white aircraft and sea
foam; on the cloudless t=94 every qualifying component below the window is a fuselage or
wave crest. Widen it without aircraft/foam rejection and jets count as clouds.

**Our classifier diverges on six axes**, each pushing width down or count up (consistent
with our p90 reading 8.56%W vs arcade 21.43): sat <0.35 not <0.25; V >0.588 not >0.80;
window to 62.5%H not 45%H; **4-connected not 8-connected** (fragments dithered edges);
min component 3 px at 320×224 (0.004%) not 150 px at 686×480 (0.046%); no haze discard;
no truncation handling; and **our capture decimates 3× (`img[::3,::3]`) before
measuring**. Assigned to world-r5: align the classifier, validate on a known input,
re-measure, then tune. Until then the only defensible claim is the judge's — two
operators disagree ~3× on the same build.

**Cross-lane risk from that last axis:** 3× point-sampling of a dithered 320×224-native
image may distort any dither-structure statistic — sea anisotropy, contrast spread, foam
fraction. criteria-fix is quantifying the delta; if material, a family of "in band" sea
numbers needs re-stating.

## I8 — Open measurement-integrity items (criteria-fix)

- **Centroid bias:** published jet centroid has run 2–3 points optimistic for two rounds
  (judge 57.08%H on a jet-on/jet-off difference mask vs published 55.28%H). Suspect the
  authoring-side calculation counts transparent padding or the afterburner flame, or
  anchor-vs-visual-centre. Fix: publish one operator stating exactly which pixels count,
  and which number the 52–60%H band was drawn against.

## LESSON — the defect class behind I4, I5 and I6

Two of our worst visual defects came from constants that were **measured from the wrong
thing and then authored to faithfully**: an inverted fin bound that fails the real
aircraft, and a "trail brightness" that is actually a night HUD's grey average. Both
passed review because they carried a citation. A citation proves provenance, not
relevance — every criterion must state WHAT WAS MEASURED, in which frame, with which
operator, and a reviewer must be able to re-run it. When a number and the reference crop
disagree, the crop wins.

---

### THE FIFTH DEFECT CLASS, named once (consolidated R5c — replaces the I9 / I11 / I13 / I26 anecdotes)

I4, I5 and I6 were wrong **operators**. Everything R5 found is one different thing, and it
deserves a name rather than four separate war stories:

> **A VALIDATED OPERATOR POINTED AT THE WRONG THING.**
> An operator that is correctly transcribed, correctly implemented and passes its synthetic
> control still returns exactly reproducible wrong numbers when it is applied to the wrong
> **population**, the wrong **resolution**, the wrong **region**, or the wrong **sample** —
> and **cross-validation between two independent implementations cannot detect any of them**,
> because both read the same wrong pixels.

Five instances, all from this round, all with a correct operator:

| | the operator was right about | it was pointed at |
|---|---|---|
| **I9** — cloud criteria | the #132 segmentation, reproduced to the second decimal by three implementations | the wrong **population** — 12 of 120 components were clouds; the rest were the launch carrier, the HUD reticle's attitude line, enemy airframes, missile plumes, explosion smoke, surf and islands |
| **I11** — stage-3 lights, stage-2 sky | the measurement | the wrong **resolution** — a 686×480 video upscale where a native 320×224 frame existed; the video's palette tops out at `0xff` where the arcade's ladder tops out at `0xf7`, so every level quoted off video runs bright |
| **I26** — stage-2 open plain | the palette snap | the wrong **region** — an 18-colour set measured from the terrain band, which by construction excludes the plain, so the plain was rewritten to the nearest terrain entry and stopped being the plain |
| **I13** — `?demo=1` distributions | the statistic | the wrong **sample** — an interval dividing the 16.000 s attract cycle is a coherent subsample; the same run reads canyon sd 1.41 %W at one phase and 6.41 %W at another, and R4's published 6.19 sits inside that range |
| **R5c** — stage-2 open-plain *target* | the share operator (synthetic control exact to 0.000000 %) | the wrong **sample again** — 4 frames of a 33 s span whose IQR is 1.1–39.3 %, landing in the low tail: published arcade median 4.2 %, true median over all 65 frames **19.7 %** |

**Why our standard checks all pass it.** A synthetic control validates the operator, not what
it is aimed at. Cross-validating two implementations proves only that they agree. Re-measuring
*more* frames tightens the confidence interval **around the wrong number**. And the failure is
stable and reproducible at every repetition, which is exactly what we usually accept as
evidence of correctness. CLAUDE.md's standing rule — *any "measures zero" / "100%" result,
crop it and LOOK once* — is the only check in our kit that catches it, and its inverse holds
too (I21-REVISED): *a vivid crop needs a measurement before it becomes a mechanism.*

**Four obligations this class earns, binding from R5c (published in REFERENCE.md "What a
complete citation is"):**

1. **State the POPULATION**, not just frame + crop + operator: which frames, how many, over
   what span. A figure from 4 frames is not a property of a span.
2. **Any operator whose output is a set of detections publishes a crop sheet of those
   detections once.** 120 crops and one contact sheet is cheap; it went undone for two rounds.
3. **Name the metric inside the operator.** "Within 24 of `#e67300`" is not an operator —
   Chebyshev and Euclidean are both natural readings and the cube is 6.6× the ball.
4. **State the TREE STATE** for any our-side figure (I28): a commit-ish, or "uncommitted
   working tree, N lanes live". The judge measures a clean checkout, not the live tree.

**Corollaries the cloud operator exposed on the way**, all still live: a mask-based HUD
exclusion **severs** tall objects into spurious high-aspect "banks"; a full-width-haze discard
stops working the moment the world rolls; truncation handling that covers the analysis
window's horizontal cuts silently ignores the frame's own vertical edges; and a black capture
frame contributes no detections, so it reads as "nothing on screen" to any presence or density
statistic (I20, I25).

---

## I3 — Night palette swap (open, owner: sprite-art lane)

GAME_SPEC.md: night stages palette-swap the **player** jet to blue-grey (and render
ground as city-light speckle). world-r5 flagged that the player-side swap may be missing
entirely. sprite-art owns the airframe palettes for both player and enemies, so the
night variants belong to that lane.

---

## I9 — Cloud criteria: correct operator, contaminated population (lead ruling, R5b)

The world lane aligned `tools/measure_clouds.py` to the published #132 operator on all eight
I7 axes, validated it on a synthetic control (width error 0.000 %W at two resolutions), and
reproduced criteria-fix's independent reimplementation to the second decimal on five of six
statistics. **The operator is right.** Hand-classifying all 90 components it returns over its
own source span (t = 93–120) found **11 cloud banks and 79 non-clouds** — carrier
superstructure, the HUD reticle's attitude line, enemy airframes, missile plumes, explosions,
coastline and sea foam. The published max of 42.27 %W is a missile plume at t101.

**New defect class, added to the LESSON below: a validated instrument run over the wrong
population produces exactly reproducible wrong numbers, and cross-validation between two
independent implementations cannot detect it.** Both lanes' validation work was correct and
neither could have caught this. Only cropping and looking at the components did.

Lead spot-check: `world-evidence/cloud-candidates.png` contains an obvious non-cloud
(component #24, a block of saturated red/green/orange HUD-and-explosion pixels) and two
components where the HIT emblem sits on top of a genuine bank. Contamination confirmed; the
count of 79 is the world lane's and is being independently re-classified by criteria-fix.

### I9a — presence/count is ADOPTED, not MEASURED (lead decision on W2)

Shipped presence 70 %, count 1/2/4, between the published 68–69 % and the clean cloud-only
14.5 %. **Ruling: keep 70 %.** Driving to 14.5 % would empty the sky, which is the exact
defect the R4 judge raised (gap 7, "too few to read as banks"); a visible defect is not traded
for a number. It is published as ADOPTED.

The deeper problem, assigned to criteria-fix: 14.5 % is measured inside a window that stops at
45 %H and therefore **structurally excludes near-horizon cloud**. Presence must be re-derived
over the full sky above a per-frame horizon line, not a fixed screen fraction, or marked
unresolved.

### I9b — the zero-cloud/HUD-overlap control is RETIRED

It contradicted the arcade: `world-evidence/arcade-hudclouds-t100.png` shows a bank sitting
behind SCORE / 17310 / HIT. Holding it was a direct cause of gap 7 — it compressed every bank
into 32–58 %H. Lead-verified on the crop. HUD legibility is unharmed: of the pixels that
differ, 31 across 11 frames are pixels the HUD paints, all of them the reticle's
partially-transparent edge; every opaque glyph is byte-identical.

## I10 — Sea anisotropy restated; R4 gap 10 withdrawn (lead ruling on W3)

The 3× capture decimation is **lossless** (every 3×3 block uniform, max deviation 0), so no
histogram statistic needs restating and I7's cross-lane risk closes on that side. But
`measure_ground.py` floors the shorter ACF half-width at 1 px against our along-track
correlation length of 0.676 px at native, so **6.51× is floor-limited**, and comparing a
native capture against a 686×480 interpolated arcade frame is invalid regardless. At a common
686×480: ours 4.95×, arcade t116 5.21× — within 7 %.

**R4 gap 10 (sea coarseness) is withdrawn as a defect.** The near-field sparkle layer is not
to be built. Re-open only against a common-resolution comparison.

## I11 — Native frames outrank upscales, and the sweep that follows (from W5)

`stage.js` asserted `ab2-arcade-night-banking.png` "carries no proven stage identity". Its HUD
digit reads 3, and it is the **only native-resolution stage-3 frame in the repo** — t175 and
t186 are 686×480 video upscales. The build derived from the upscale put every stage-3 city
light below row 199 of 224, entirely behind the bottom HUD: zero visible lights, passing mean-V
statistic. Same family as I4/I5/I6.

criteria-fix owns the sweep: every constant in REFERENCE.md / GAME_SPEC.md / STAGE_MAP.md
derived from an upscale where a native frame exists gets re-derived or marked, and every frame
STAGE_MAP.md calls unidentified gets re-checked at native resolution.

## I12 — Open at the end of R5b

- **Stage-3 bottom HUD contrast.** The city-light fix is correct and dramatic, and it puts the
  cream STAGE digit, SPEED bar and missile stock over a dense bright speckle field. Same
  failure as gap 3's stage-2 digit, newly reproduced on stage 3 by a fix that was right on its
  own terms. Belongs to presentation-r5, which has not been started.
- **Stage 2 ground** is improved, not fixed: palette snapped from 238–258 colours to 70–72
  against the arcade's 42, but ours is still a smeared streak where the arcade is chunky
  discrete terrain. Spec left in `lane-world.md`.
- **Nine genuinely drawn perspective bank poses** for the player jet (sprite lane's stated
  limitation; the current nine are a rotated and foreshortened planform).

## I13 — Aliased sampling of a periodic signal (player-feel A0; lead ruling)

`demoTimeline.js`'s attract regime cycle is **exactly 16.000 s**. Any sampling interval that
divides it is a coherent subsample, not a random one. Same run, same operator, canyon lateral
sd: **1.41 %W at one 1 Hz phase, 6.41 %W at another**; every-tick reads 2.48, incommensurate
(53 ticks) reads 2.50. R4's published canyon **6.19 %W sits inside the aliased range** and was
reproduced at 6.21 by accident before the lane switched intervals.

**Ruling: 6.19 %W is retired**, and STATUS.md's "canyon regime too loose" item is at least
partly a sampler artifact. criteria-fix owns the restatement, and the criterion must carry its
sampling requirement: every tick, or an interval incommensurate with 16.000 s.

**LESSON, generalised:** CLAUDE.md's "no speed claims from sub-60 Hz sampling" was written
about motion. It applies to **distribution statistics over a periodic signal** too — sd,
spread, percentile — and there it fails *silently*, because the wrong number is stable and
reproducible at any fixed phase. Same shape as I9: stable, plausible, reproducible, wrong.

### I13a — `?demo=1` is two populations (lead ruling on A2)

Cruise lateral sd 12.50 %W at pixel-centroid cy 52.75 %H; canyon 1.85 %W at cy **63.52 %H**.
The canyon altitude is outside the 52–60 %H band **on purpose** — that band was drawn against
cruise frames (REFERENCE.md's own canyon cy is 63.5 %H). A composition reading from a random
`?demo=1` frame mixes the two and reads out of band ~31 % of the time. Judges capture cruise
only, or split by regime (`simTime % 16 < 11` is cruise). This is the one change this round
that could turn a passing headline metric into a false FAIL.

**Cruise constants: change ACCEPTED** despite the brief saying not to touch cruise. The cited
"cruise 13.20 %W" is one draw from a per-window spread of 8.71–18.18 %W; the build's pooled
value was 19.02 %W (closed form 19.30), genuinely 48 % too wide. criteria-fix is to restate
cruise as a distribution with its operator and window length, not a single number.

### I13b — I8's operator is now implemented identically on two sides

player-feel independently re-measured level-astern span and centroid and reproduced sprite-art
to **0.01 points**: pixel centroid 57.51 %H, bbox centre 55.06 %H, span 35.94 %W. Publish that
corroboration with the operator name.

## I14 — `tools/capture.mjs` ran with HMR on (fixed by the lead)

A capture run can span many seconds of wall clock on a tree several lanes are editing. An HMR
reload mid-run either kills the page ("Execution context was destroyed") or — the dangerous
case — **silently resets simulation state without killing it**. player-feel saw one frozen,
score-0 capture set that a re-run did not reproduce.

`server: { strictPort: false, hmr: false }` set in `tools/capture.mjs`, re-verified. **Any
capture taken before 2026-10-05 on a concurrently-edited tree carries this risk** — re-run
rather than reason about an anomalous number.

## I15 — Open asks still unanswered at this point in R5b

- **player-feel A1 → sprite-art (not blocking):** the barrel roll spins a bitmap; the arcade
  *draws* it. `reference/stage4-barrel-roll-t222.png` shows the jet's belly — purple-blue
  underside, two lit nozzles, steeply canted — i.e. a drawn inverted pose, not a rotated top
  view. Needs `player-f14-roll.png` on the same contract as `JET_POSE_SHEET`; `player.js`
  already carries `rollPhase` (0..1) to index it. Roll duration, trigger, suppression and
  displacement are all correct today.
- **player-feel A3(a) → combatfx:** the player now respawns into live fire (17 % of lives end
  within ~1 s of the 2.0 s grace expiring) because `flow.js` no longer calls `combat.clear()`
  on death — which is what bought the playable-share gain. Fix is lethality tuning, so it is
  combatfx's call: threat-aware grace, or a `clearShots()` entry point.
- **Playable % and deaths/min are coupled.** player-feel owns 5.8 s of non-interactive time
  per death (down from 10.4–11.0); combatfx owns deaths/min. Neither quotes a combined figure;
  the lead reconciles at round end.

## I16 — The clouds.js crash: cause, and why it looked intermittent (closed)

Real defect, world lane's own, fixed and **verified non-vacuously**. Cause was an edit
sequence, not a rename that had not landed: retiring the HUD clamp removed `HUD_BOTTOM_FRAC`
from the top of `clouds.js` in one edit while `updateBankPositions` still read it in its clamp
until a later one. It looked intermittent in tick count because that function runs only for
**active** banks and the bank model starts in a cooldown — a capture that finished before the
first bank activation survived, any run long enough to activate one threw.

Verification was built so a clean result means something: sprite-art's exact repro and the
stage-2 tick across seeds 1–5 return no page errors, **and those same frames carry 2–6 detected
cloud components**, so the path actually ran; plus three continuous 6000-tick runs with combat
on, crossing all three stages, clean. **The evidence hole in `ask-sprite-art.md` A1 is no
longer real.**

## I17 — HUD severing: a real bias in the published cloud figures, in a known direction

Raised as a caution by the lead, measured by the world lane. With banks this size the risk runs
**opposite** to the historical one: the HUD mask is derived per run with `hud_mask.py` and
subtracted *before* components form, so the HUD cannot be counted as a cloud or merge two banks
— but **55.4 % of the 130 components now have a bbox overlapping the HUD mask**, so a glyph
stroke can **sever** a bank and inflate the count.

Control, labelling on (cloud OR HUD) so a stroke cannot cut a bank, while still taking bbox and
area from cloud pixels only:

| | components | count med/p90/max | width median | p90 |
|---|---|---|---|---|
| HUD removed (as published) | 130 | 1 / 2 / 4 | 18.12 | 37.22 |
| HUD permeable (control) | 126 | 1 / 2 / 3 | 18.28 | 37.34 |

Published figures **over-count by 3.1 % and under-state width by 0.9 %** — 8-connectivity routes
around most thin strokes. Small, but real and directional, and **it will grow if the HUD gains
more horizontal rules — which gap 3's contrast plates are likely to add.** Whoever scores this
round should know; whoever builds the contrast plates should re-run the control afterwards.

## I18 — Black frames and short sequences were HMR, not rendering (closes out I14)

Captures occasionally died with puppeteer's "Execution context was destroyed", returned a short
sequence, or came back as a single all-black frame — one 120-frame tuning pass returned 0/120
black **with no page errors**. Earlier attributed to machine load; the actual mechanism is
another lane saving a file, Vite reloading the page, and the capture losing its context. Not a
rendering defect. Fixed at source by `hmr: false` in `tools/capture.mjs` (I14). Anyone reading
a black frame as a rendering bug is reading an artifact of the shared tree.

## I19 — W4 landed and lead-verified

`flow.js` now switches the cloud palette on a stage change. Lead capture
`tools/out/tl-verify-6/frame-0000.png` (`?fixed=1&seed=1&nocombat=1&invincible=1`, tick 2460,
stage digit reads 2): the banks render cream/desert-tinted against stage 2's orange sky, not
stage-1 white, at full size, with the HUD drawn legibly on top of the bank that overlaps SCORE.

## I20 — Correction to the cloud presence gain (world lane, self-reported)

The world lane applied player-feel's dropout-detection recipe to its own sets and found **9
black frames in 90** in its *before* baseline — the set the whole before/after comparison rests
on. Its earlier "every 120-frame pass came back 0/120 black" was true of the **tuning** passes,
which it had swept; the baseline had never been swept.

Corrected: before presence **45.6 % → 50.6 %** (aligned operator), 65.6 % → 72.8 % (legacy). So
the presence gain is **50.6 % → 70.0 %, not 45.6 % → 70.0 %** — overstated by 5 points.

**What is unaffected, and why the reasoning holds:** a black frame contributes no components,
so it can only be miscounted as "no clouds present" — it cannot move a size statistic. Width
median 7.19 and height median 5.36 are unchanged, so the **gap-7 deliverable (7.19 → 18.12 %W,
5.36 → 20.54 %H) stands**. The after-set is 0/120 black with 0 duplicates. The arcade side —
the 11-bank table and every target in it — is clean across all 88 frames. And the I9
legacy-vs-aligned comparison ran on *identical* frames, so dropouts hit both operators equally
and the 22-point gap between them is unchanged.

**The worse failure that did not occur, worth recording:** the one duplicate pair was two
consecutive *black* frames, not a stall. A stalled **live** frame would have double-counted a
bank in a pooled distribution — strictly worse than a dropout, and undetectable by a
black-frame sweep alone. Sweep for both.

**Self-reported after the lane had already delivered.** That is the behaviour this loop wants.

## I21 — Stage-3 lights stay as they are; the fix is on the glyph side (lead ruling)

player-feel measured that the city-light fix leaves **3.40 % of the stage-3 ground brighter than
the cream glyph ink**, so specks punch through plate-less glyph interiors, and raised it for
presentation. Before that could turn into "thin the lights", the world lane **checked the
arcade** — `reference/ab2-arcade-night-banking.png`, native, HUD digit reads 3:

| | arcade | ours |
|---|---|---|
| bottom HUD band y[196,222], fraction brighter than 226 | **9.76 %** | 3.40 % |
| ground immediately above the band | 8.63 % | — |
| HUD row pure dark (night ground showing through) | **65.2 %** | — |

The arcade has this condition **~3× harder than we do and no opaque plate behind the row** — it
solves it on the glyph side. **Ruling: `lightDensity` is not to be dimmed.** Dimming would walk
back a measurement that now matches the arcade (p99 V 0.969, >V0.9 2.2 % vs 5.93 %) and move us
*away* from the reference. The fix is glyph outlines and selective plates, and it belongs to
gap 3 / presentation-r5, which is now running.

This is the fifth time this round a criterion or an ask has been checked against the arcade
before being tuned to, and the fourth time the check reversed the intended direction.

## I22 — presentation-r5 started (lead)

Last lane to open. Owns `src/ui/{font,hud,titleFont}.js`, `flow/{cards,titleScreen,overlay}.js`,
`render/{screen,viewport}.js`. Gaps 3, 9 and the typography half of 8. Briefed with I21 as a
settled ruling, and with I17 as an obligation: **any horizontal rule it adds to the HUD grows
the cloud-severing bias**, so it must re-run the world lane's permeable-HUD control and report
the new figure rather than leaving it for the judge.

## I21-REVISED — Stage 3 needs nothing: our HUD is OVER-separated against the arcade

I21 ruled the lights stay and said the fix belongs with "glyph outlines and selective plates".
**The second half is withdrawn.** player-feel withdrew its own A6 after measuring the mechanism
it had previously only asserted.

Operator: glyph mask per ink class, dilated 1 px 8-connected, minus the glyphs = the 1-px ring
hugging every letterform. Fraction of bright background (luminance > 120) in the ring vs in the
surrounding field. A keyline or halo makes the ring much darker than the field; bare speckle
makes them match. Arcade native 320×224, ours 960×672, same bands.

| ink class | arcade ring vs field | ours ring vs field |
|---|---|---|
| red STAGE label | 5.76 % vs 12.91 % — 2.2× darker | 0.32 % vs 7.77 % — **24.3× darker** |
| cream digits | 21.18 % vs 17.78 % — **no halo** | 5.17 % vs 10.01 % — 1.9× darker |
| white missile stock | 15.21 % vs 6.93 % — **no halo** | 0.71 % vs 3.49 % — 4.9× darker |

**On every ink class our glyphs have a stronger dark surround than the arcade's**, and on two of
three the arcade's ring is *brighter* than its field — no halo at all. Stage 3 is not
under-separated; it is over-separated. **Adding outlines there moves us away from the
reference.** Stage 2's cream-digit-into-tan-terrain defect is unaffected and still stands.

**Candidate sixth defective criterion, assigned to presentation-r5:** R4's "≥3:1 luminance
contrast against the local background" may be a target *the arcade itself fails*. It is to run
that criterion on the arcade's own bottom strip across all three stages **before** tuning our
HUD to it, and propose the arcade's measured ring-vs-field separation per ink class as the
replacement if it does.

**LESSON (player-feel's own write-up).** It formed "this is hard to read" from an **8× nearest
upscale of a still frame**, which exaggerates speckle enormously relative to native scale in
motion, then reasoned from that impression to a mechanism it never tested. The background
measurement it actually took (3.40 % above ink luminance, p99 247) is correct and undisputed;
everything built on top of it was not. **Judge legibility at native 320×224 first; zoom only to
confirm a mechanism already measured.** Same family as the project's standing rule that a clean
plausible number needs cropping and looking at — this is its inverse: a vivid crop needs a
measurement before it becomes a mechanism.

## I23 — Night pose sheet verified in-game (sprite-art, R5c); lane closed

The night sheet had only ever been measured as an **authored cell at 94–100 px span** — below
the ~250 px floor JET-SIL itself declares — because it was not selected and stage 3 would not
capture. Both blockers cleared (player-feel's A2, world's crash fix), so it was measured
properly. Stage identity read off the HUD digit, not the tick count. Sheet confirmed *selected*
rather than silently falling back (`selectPoseCell` returns `false` on a null texture, so a
decode failure looks like success).

| statistic | target | arcade t175 | day (339 px) | night (345 px) |
|---|---|---|---|---|
| two-blade fin rows | ≥90 % | 99–100 % | 100.0 % | **100.0 %** |
| fin-pair extent %SPAN | 30–40 | 35.4–35.7 | 37.2 | **38.3** |
| nozzle separation %SPAN | 25–35 | 30.1 | 31.0 | **30.4** |
| blade cant | ≥1.15 | 1.23–1.29 | 1.22 | **1.22** |
| aspect SPAN/H | 3.0–3.6 | 3.24–3.30 | 3.23 | **3.11** |

**The 1–2 point day/night gap is the instrument, and it reconciles exactly.** Both are the same
drawing, so a real difference would mean one reading was wrong. The night keyline `#425284`
(max channel 132) **passes** JET-SIL's `max(RGB) > 30` mask where the day keyline `#000008`
fails it, so the night silhouette carries a 1 px ring the day one does not. Excluding those
4 626 keyline pixels, night reproduces day to every digit. A property of the measured night
palette (REFERENCE.md's night set has no true black), not of the art.

**Byte-identical day/night masks were checked, not enjoyed:** source frames differ in 617 265
px, isolated jets in 14 634 of 43 432, palettes disjoint. Same geometry, different drawing — by
design, since one function generates both sheets.

**Correction to I3's wording, for criteria-fix:** `PLAYER_NIGHT.nozzleCore` is authored
`#ff7500` but **ladder-snaps to `#ff7300`, and `#ff7300` is what renders** (486 px; day nozzle
`#ef7300` over the same 486 px, so night is a shade brighter as measured). One ladder step from
the arcade's measured `#ff7500`, inside the documented snap tolerance. Publish the *rendered*
value alongside the authored one — an authored-vs-rendered mismatch becomes a phantom
discrepancy when someone later measures the frame.

**Residual, by eye, carried forward verbatim:** numbers all pass; the crop still shows our
blades shorter and less steeply canted than the arcade's, wings sweeping down less, nacelle pods
smaller with a thinner black ring. Per REFERENCE.md's rule that the crop outranks the numbers —
*correct in structure and in every published discriminator, and still a touch timid against the
reference.*

### I23a — `player-f14-roll.png` is built, measured, and DELIBERATELY UNWIRED (lead ruling)

The barrel-roll sheet (8 frames) plus `JET_ROLL_SHEET` / `selectRollCell` were finished before
the "do not build it this round" instruction arrived. **Ruling: it stays.** It is inert —
`player.js` does not reference it — so it changes nothing at runtime, and deleting working
measured art to satisfy a late instruction is waste. **Recorded here so a judge does not read an
unused export as dead code and nobody re-derives it.** Wiring it is one line next round against
player-feel's A1, which asked for exactly this.

## I24 — `tools/combat_probe.mjs` fixed; and how to tell the two capture failures apart

`combat_probe.mjs` still booted Vite with HMR on — and it matters more than `capture.mjs` in one
respect: **a judge reads combat ground truth from it**, so a silent `simTime` reset there
corrupts a number nobody would think to re-check. Now `hmr: false, watch: null`, matching
`capture.mjs` and `fairness_probe.mjs`. Verified streaming.

**Two different failures, do not confuse them:**

| | symptom | verdict |
|---|---|---|
| HMR reload mid-run | short sequence, all-black frames, or frozen state — **no page error** | silent, produces WRONG data |
| a lane's broken intermediate edit caught mid-save | `waitForFunction` timeout on `window.__frameReady` | loud, produces NOTHING |

The second occurred once during verification and did not reproduce in three identical repeats.
It is the acceptable kind. Re-run before diagnosing.

## I25 — The all-black capture frames had TWO causes; the second is now fixed

I18 claimed `hmr: false` closed this. **That was over-claimed**, and the world lane corrected it:
after the HMR fix, `ours-s2h` still came back 2 black in 14 and `ours-s2f` 1. Chasing that found
the second, independent cause.

`src/render/screen.js` builds `new THREE.WebGLRenderer({ canvas, antialias: false })` with **no
`preserveDrawingBuffer`**, so the drawing buffer is cleared once composited. The capture loop was
two separate CDP round trips:

```
await page.evaluate(() => window.__step(n));   // renders
await canvas.screenshot({ path: file });       // separate round trip
```

If a compositor frame landed between them the buffer was already cleared and the screenshot read
**black — no page error, no exception**. Silent wrong data.

**Fix:** step and read the pixels **in the same JS task**. `window.__step` is synchronous
(`main.js`: `(n) => game.step(n)`), so a `toDataURL` immediately after it inside one `evaluate`
reads the buffer before the compositor can clear it. Done in `capture.mjs` **deliberately
rather than** adding `preserveDrawingBuffer` to `screen.js`: a capture tool must not change what
the game renders, and that file belongs to presentation-r5. **If any lane changes `screen.js`'s
renderer flags, say so loudly — every capture path now depends on current behaviour.**

| | black frames |
|---|---|
| before | **1 / 30** (confirmed by cropping and looking, not by file size alone) |
| after | **0 / 90** across three runs |

Detector validated in both directions: it flags the known-black frame, and does **not** flag
legitimately dark stage-3 night captures.

**Two causes fixed is not a proof there is no third.** player-feel's A5 detection sweep stays
**REQUIRED**, not belt-and-braces — the judge sweeps its own captures. And note which statistics
are vulnerable: a black frame contributes no detected objects, so **any per-frame presence or
density statistic silently reads it as "nothing on screen"** (it cost the world lane 5 points of
cloud presence); whole-run counts are immune. For a *contrast* statistic it is worse than
neutral — a black frame looks like infinite contrast and inflates the number being proved.

## I26 — Stage-2 open plain: change KEPT (lead ruling), and a third instance of the I9 class

**Kept.** Ours 0.5–28.0 % open-plain share, median 9.9, against the arcade's 0.0–33.0 median 4.2
— brackets both range and median. Defaults inert, confined to the canopy branch, stages 1 and 3
verified unchanged to the third decimal. Reverting would ship a *measured absence* (one uniform
regime where the arcade has none) to avoid an imperfect presence.

Measured on the STAGE_MAP-verified span 124–156, ground band y[310,420] at 686×480, fraction
within 24 of `#e67300`: t134 **0.0 %**, t138 **0.0 %**, t142 **33.0 %**, t150 **8.4 %** — ours was
0.3–0.5 % on *every* frame. **There is no single flat-fraction target; the thing to reproduce is
the variation.** Any published stage-2 ground criterion must be a range and a median with its
span, not a point value.

Lane's own assessment, kept verbatim: *a composition fix, not a terrain fix* — the terrain band
is still a smeared longitudinal streak, symmetric about the flight axis where the arcade's is one
diagonal mass. Remaining geometry work specified in `lane-world.md` §6 item 1.

### The bug on the way — third instance of one defect class

The first attempt moved the figure 0.5 % → only 1.1 %. Cause: **the palette snap was applied to
the result of the plain mix using an 18-colour set measured from the TERRAIN band, which by
construction excludes the plain** — so it rewrote `#e67300` to the nearest terrain entry
`#d68400` and the plain stopped being the plain. A palette measured from one region, applied to
another.

**Consolidate the LESSON block around this, as one named class rather than three anecdotes:**
I9 (correct cloud classifier, contaminated population), I11 (correct measurement, upscaled source
where a native frame existed), I26 (correct palette, wrong region). **A validated operator
applied to the wrong population, the wrong resolution, or the wrong region produces exactly
reproducible wrong numbers — and cross-validation between two implementations cannot detect any
of them.** Only looking at what the operator was pointed at can.

### I25a — The capture fix is pixel-safe (verified by world-r5, NOT by the lead)

A gap in the lead's own verification, recorded as such. The `capture.mjs` read-back change was
verified **only against the failure it targeted** — black-frame counts, 1/30 → 0/90. It was not
verified against the invariant every colour measurement in this repo depends on.

`toDataURL()` reads the canvas backing store; `canvas.screenshot()` captures the composited
element. **The two can differ under colour management.** Had they differed by even one bit, every
byte-exact figure in `lane-world.md` would have become non-reproducible with the current tool,
**silently** — `#e67300` at 99.4 %, the 4-bit palette ladder, the ramp populations, and the
decimation-lossless proof, which depends on exact 3×3 block equality.

world-r5 re-captured `cl-t12-s1`'s exact conditions with the new tool and byte-compared against
frames stored from the old one:

```
30 / 30 frames byte-identical, max dRGB 0
worst intra-3x3-block deviation still 0  ->  img[::3,::3] is still the exact inverse
```

**The fix is pixel-safe and everything in `lane-world.md` reproduces unchanged.** Noted at the
top of its §7 so a judge re-running those commands knows the tool change does not invalidate them.

**Standing rule this earns:** when a shared measurement tool changes, verify the invariant the
tool's *consumers* depend on, not only the defect being fixed. A read-back path change is a
measurement change until proven otherwise.

## I27 — Gap 5's denominator moved under the combat lane (likely defect #7)

R4 gap 5 reads "**≤1.5 deaths/minute** averaged over ≥3 minutes of `?demo=1`" and **does not name
its denominator**. It was drafted when a death cost **8.5 s** of non-interactive time. player-feel
has brought that to **5.2 s**, and the playable share of wall clock from ~35 % to ~70–78 %.

Measured consequence, from that lane rather than assumed:

> shortening the death cycle puts more flight seconds into the same wall clock, so **deaths per
> minute of WALL CLOCK rises even if deaths per minute of FLIGHT TIME is unchanged**.

Identical lethality now scores worse against the criterion than when it was written, purely
because the player spends more of each minute airborne meeting waves. **A lane tuning to the
wall-clock reading would compensate for another lane's improvement by making the game easier than
the arcade** — the same shape as the four criteria already retired: tune to the number, lose the
thing.

**Actions issued.** combatfx: publish both figures with the denominator named in each, state which
it tuned against, and normalise on flight time when comparing to R4's 3.0–3.5 baseline (which was
measured on the old 8.5 s cycle). criteria-fix: restate the criterion with **deaths per minute of
flight time** (`flow.state === 'flight'` ticks, already counted by player-feel's probe) as primary.

Instability for context — deaths/min read **3.56–4.00**, then **3.56–5.33**, then **1.78–3.11**
across one session as lethality moved on a tree whose denominator was also shifting. No single
pass is settled.

## I28 — A published figure needs its TREE STATE, not just frame/crop/operator

The R4 critic's playable-fraction figure and player-feel's differ widely, and the cause is
**neither sampling rate nor operator** — re-sampling at the old every-3rd rate agrees to within
0.12 points. It is the **death count**: 6 deaths in 120 s vs 9. The critic measured **the shared
tree with other lanes' uncommitted work in it**; player-feel measured a **clean checkout of
`7b4617a^`**. Both are correct about the tree they were taken on.

So frame + crop + operator + yield is **not** a complete citation in this repo. A figure also needs
the **tree state**, and "the working tree on the afternoon of the Nth" is not reproducible.

**Recommendation to criteria-fix:** REFERENCE.md should require a commit-ish — or an explicit
"uncommitted working tree, N lanes live" — alongside every measured figure, and **the judge should
measure a clean checkout rather than a live shared tree.** First round this has bitten; also the
first round with six lanes editing one tree at once.

## I29 — Corrections to I23/I26, and the lead relayed two figures without verifying them

criteria-fix re-derived figures the **lead had relayed from lane reports verbatim**. Three were
wrong, and the fault is the lead's for passing them on unchecked, not the originating lanes'.

**(a) I26 overstated the stage-2 result. "Brackets both range and median" is WITHDRAWN.**
The arcade range handed over (0.0–33.0, median 4.2 from t134/t138/t142/t150) is **four draws
from a statistic whose interquartile range is 1.1–39.3 %, and all four landed in the low tail**;
its "median 4.2" is just the midpoint of the two lowest of the four. Re-measured over 65 frames:
**arcade median 19.7 % against ours 9.9 %, with our maximum below the arcade's p75.** Ours does
not bracket the arcade — it sits *under* it.

**The ruling to keep the change still stands, and for a stronger reason:** the gap is that we
owe *more* open plain and more swing, not less, so reverting to the uniform 0.3–0.5 % regime
would move further away. But the stated justification in I26 was wrong and is corrected here.

**(b) I23's night-nozzle note was wrong in three ways, and one of them is a live defect.**

1. **`nozzleCore` does not exist in `src/`** — `grep -rn nozzleCore src/` returns nothing. It
   lives in `tools/art/palettes.js`. `src/render/spriteFactory.js` carries a **separate**
   `PLAYER_PALETTE_NIGHT` with no `nozzleCore` key at all, **whose `flame` is the daylight
   `#ef7308` in both day and night** (verified at `spriteFactory.js:251`). Two palettes, two
   owners, one name in conversation. **OPEN DEFECT:** the procedural night texture — the
   fallback if the authored sheet fails to decode — still has the *daylight* flame colour. The
   sprite lane is closed; this is unowned. One line, and it is the fallback path, so it fails
   invisibly until a decode fails.
2. **The count is 272 px, not 486.** 486 reproduces on neither HEAD nor the working tree.
3. **The committed sheet is a different drawing.** At `db554e6`, `player-f14-night.png` is
   **900×40 with a magenta nozzle core (`#c594f7`/`#a400d6`) and no orange at all**; the
   working tree's is **900×72 with the orange**. Verified by the lead.

**(c) That third point is I28 happening in real time.** The figure the lead asked to be
published was taken on a tree state that no longer exists, and **without the tree-state field
there was no way to discover that except by checking**. The table is published with
"uncommitted working tree, six lanes live" attached.

**LESSON for the lead, recorded against itself:** relaying a lane's figure into another lane's
brief makes the lead the citation. Two of three figures relayed this way were wrong, and both
were wrong in ways the originating lane could not have caught — one was a sample-size artifact,
one was a tree-state artifact. **Relay the pointer, not the number**, unless the number has been
re-derived.

## I30 — R4's gap-3 contrast criterion FAILS ON THE ARCADE (ninth criterion retired)

presentation-r5 ran R4's gap-3 criterion against the arcade before tuning to it, as required.
**It does not survive contact**, on both clauses:

**(a) "white/black plate behind SPEED *and STAGE*"** — the arcade has a plate behind SPEED and
**none behind STAGE**: red letters with a drop shadow, straight onto the tan desert that the
stage-2 evidence complains about.

**(b) "≥3:1 luminance contrast against the local background"** — measured on the arcade's own
frame it **fails on 4 of its 5 HUD ink classes, including both elements sitting on its own white
plate**: SCORE 1.85:1, SPEED 1.57:1, STAGE label 1.05:1, score digits 2.74:1. It is unreachable
for this palette by construction — `#f70000` is luminance 0.198, so 3:1 requires a near-black or
near-white field. It also contradicts gap 3's own next clause: once glyphs carry a dark outline,
**the outline is the local background**.

**Replacement ADOPTED:** ring-vs-field separation per ink class, plus worst-glyph-pixel. Ours is
~2× the arcade's on **every** ink class on **both** metrics (STAGE digit 2.92:1 vs 1.36:1
ring/field; 6.00:1 vs 2.47:1 worst pixel). **This extends I21-REVISED from stage 3 to stage 2 and
to the daylight classes** — our HUD is over-separated against the reference everywhere, not just
at night.

### I30a — the stage-2 complaint is REASSIGNED from gap 3 to gap 6

Behind STAGE, our p90 luminance matches the arcade **exactly** (0.528) but our **median is 2.5×
brighter** — 0.308 against 0.123. **Our stage 2 has no dark dither floor.** That is a ground
defect, not a HUD defect, and nothing in the presentation lane recovers it short of a plate the
arcade does not have. Same fact as gap 6's "smeared streak where the arcade is chunky and
discrete".

### I30b — I17's severing bias moves in the CONSERVATIVE direction

presentation added **no horizontal rules**, and the sky-band HUD mask **shrank ~8.6 %**
(1378 → 1260 px) because HIT lost its plate (312 → 196 px). So the cloud lane's published
over-count of 3.1 % and width under-statement of 0.9 % do not need re-stating. `hud_mask.py`
agrees with the authored geometry to the pixel (computed SCORE trapezoid 610, mask reports 610).

## I31 — No native-resolution footage exists; the card glyphs proceed as ADOPTED (lead ruling)

presentation withdrew the card-text glyph work, asking for one card frame at native 320×224.
**Lead-verified: no such frame exists or can be obtained.** Every cached source:

| source | resolution |
|---|---|
| `ab2-longplay.mp4` | 686×480 (2.14×) |
| `ab2-longplay-60fps.mp4` | 1028×720 (3.21×) |
| `ab2-gameplay.mp4` | 640×360 |

Re-fetching with the youtube-reference skill cannot produce one. The ask is unfulfillable, so the
withdrawal would be permanent rather than deferred.

**Ruling: author the eight missing letterforms (N U P L A Y D G) from the 3.21× upscale and mark
them ADOPTED, not MEASURED.** I11 says a native frame **outranks an upscale where a native
exists** — it does not forbid an upscale when none does, and every stage-palette constant is in
the same position. I28 requires the provenance be *stated*, not the work refused: record the
source frame, the 3.21× factor, and that no native exists.

Conditions: **`N` is hand-authored, not transcribed** (it appears in CONTINUE/INSERT/POINTS/COUNTS
and the transcriber returns it with no diagonal); the report states which glyphs were transcribed
and which hand-authored; and the eight letterforms are published as a **crop sheet** beside their
source, per the obligation criteria-fix attached to any operator whose output is a set of
detections. A second documented withdrawal with the crop sheet attached remains an accepted
outcome — but as a judgement about the evidence, not a wait for a frame that will never arrive.

### I31a — per-pixel diffing beat eyeballing, on the lane's own work

presentation's first emblem pass rendered HIT as **four detached bars**, having read its white
wing stripes as world showing through. The per-pixel diff against the reference caught it in one
run. Record it beside I21-REVISED's lesson: judge at native scale, and **diff per-pixel against
the reference rather than eyeballing a crop** — the two failures are inverses of each other.

## I32 — `tools/capture.mjs` silently ignored unknown flags; now a hard error (fixed by lead)

The combat lane ran two suppression tests with `--params` instead of `--url-params`. The tool
**accepted it, dropped the parameters, defaulted to `fixed=1&seed=1`**, captured a static scene
containing none of the requested state, and both tests returned a clean **0** — "the jet quad
suppresses nothing". Re-run with the correct flag, the same comparison returned **96,114 warm and
161,581 near-white pixels**.

A plausible, stable, reproducible zero from a tool that would not say it had ignored its
arguments. Every false alarm this project has produced has looked exactly like that.

**Fixed:** unknown arguments now print the valid set and `exit(2)`. Validated both ways —
`--params` is refused and nothing is captured; the correct flags still capture normally.

**Third silent-corruption defect found in this one tool this round**, after the HMR reload (I18)
and the drawing-buffer race (I25). A measurement tool that fails silently is worse than no tool.

## I33 — The jet quad's depth stamp: 239,176 px, one line, reassigned to sprite-art

The player sprite's quad is larger than the airframe and **its transparent margin still writes
depth**, punching out anything drawn behind it at greater depth: explosions, missile trail and
lock brackets. Measured by combatfx at **239,176 native px** of effect — root cause of gap 10's
bracket residual and of invisible holes in the other two. Fix is `alphaTest: 0.5` on the sprite
material in `spriteFactory.js`.

combatfx correctly did **not** reach into another lane's file. sprite-art re-opened for it, with
three conditions: reuse combatfx's isolation (a `?hidejet=1` A/B is contaminated — removing the
jet also reveals the ground behind it, which a warm mask scores as a win; its figures change only
the jet's *material*, with the jet present in both arms); check day sheet, night sheet **and**
procedural fallback with `sheet_visibility.py`, since the day keyline `#000008` and night keyline
`#425284` already behave differently under a threshold; and **re-run JET-SIL afterwards** in case
`alphaTest` clips an edge pixel and moves span or the discriminators, which are currently all in
band.

Also reassigned to sprite-art in the same pass: **`spriteFactory.js:251` `PLAYER_PALETTE_NIGHT.flame`
is the daylight `#ef7308` in both day and night** (I29b) — the procedural fallback never received
the night-nozzle correction, and fails invisibly because it is only reached on a decode failure.

## I34 — Gap 5 at the end of R5c: the gate is not met and the arcade has never been measured

combatfx's closing state: **2.87 deaths/min wall clock, 4.00 flight time**, at +8.8 % enemy fire.
The **ratio** R4 asked for is exceeded — 2.82× against 2.0–2.3× — but the absolute ≤1.5 gate is
not met on either denominator.

**The observation that matters most: nobody has ever measured the arcade's own death rate, and
the footage to do it is in this repo.** Every death-rate criterion to date is an assumption. That
is the same shape as the nine criteria already retired — a number nobody checked against the
thing being copied. Before anyone tunes lethality further, measure the arcade.

Other items left open by that lane, all documented with reasons rather than quietly dropped: the
trail's ≥25 %W launch billow still fails on shape though colour passes; the explosion core is
**deliberately** under the arcade's fraction because the value that hits the number looks worse on
the crop; within-wave span ratio 2.10 is the measured price of the size-qualified density
criterion; `ELITE_FRACTION_BY_STAGE` is ADOPTED and needs footage verification before anyone tunes
to it; the offline lethality model stays withdrawn.

## I35 — The name-entry screen: the project's cleanest typography reference, cached all round

I31 ruled "no native frame exists, so author from the best upscale". presentation then went
looking for the **best upscale** rather than settling for the card frames, and found the
**high-score name-entry screen**, which displays the **entire alphabet**
`ABCDEFGHiJKLMNOPQRSTUVWXYZ.` in the card face — flat pink on flat dark blue, no terrain, no
dither, no sprite overlap, at 3.21×.

```
ffmpeg -ss 970 -i .reference-cache/video/ab2-longplay-60fps.mp4 -vf fps=1 -frames:v 20
```
frame 16. **Lead-verified by independent extraction** — `tools/out/tl-verify-glyph/f16.png`.

**The control is the strongest this project has produced.** Seven glyphs (C E H O R S T) were
already measured at native 320×224 off the desert HUD. Running the transcription operator on the
name-entry screen reproduces all seven **exactly: 0 of 343 cells differ.** The earlier tally-card
attempt scored 10–17 % — **the difference is the background, not the magnification.** Two
independent size facts confirm the same face before any letterform is read: glyph ink 7 native px
on an 8-px pitch, and the dotted i's stem at 3 px, equal to `BIG_WIDTHS.I = 3` measured off the
HIT emblem on a different screen.

**LESSON, and it generalises past typography:** *"no native frame exists" was true and was still
the wrong stopping point.* The binding constraint was never magnification — it was **background
contamination**. An upscale of a flat-colour screen beat a native-resolution crop over dithered
terrain. Before accepting that a measurement cannot be made at the available resolution, ask
whether the subject appears anywhere on a **clean** background.

### I35a — two letterforms were not what anyone assumed

- **`N` has no diagonal** — a filled top bar over two straight stems. Verified at native columns:
  the counter of the N in t124's "COUNTS" sits at 3.11–4.05 and **does not move across 30
  consecutive image rows**; a diagonal would make it a parallelogram. Four independent instances
  agree, and the adjacent U behaves identically with its counter open at the top. **The lane had
  withdrawn partly because its transcriber returned an N with no diagonal and it read that as an
  artefact — the transcriber was right.**
- **`A` is a solid triangle** — no counter, no legs. Corroborated on t124's "STAGE 2", a different
  frame, screen and ink colour.

### I35b — one genuine fork: the dotted i has two measured layouts

The HUD **kerns** it to 3 px (H x[166,172], i x[174,176], T x[178,184] — reproducing this is what
makes HIT pixel-exact); the cards **monospace** it at 8 with the stem centred, confirmed on both
t124 and the name-entry screen. `font.js` now exports two faces over one glyph table, `FACE_BIG`
and `FACE_BIG_CARD`. Using the kerned face on cards would cost 4 px per i, and "INSERT COIN" has
two.

### I35c — two structural card errors, found only by doing it properly

- **The tally's "STAGE n" is two elements, not one centred string.** t124's lavender ink has a
  **26 px sky gap** between label and digit — the card reuses the bottom HUD row's geometry. One
  centred string cannot produce that at any scale, which is how R5a reached pxX 2.3.
- **The countdown is not on the other lines' centre axis** (155.25 / 156.25 / 159.5).

Card results, native px: CONTINUE PLAY arcade x[103.0,207.5] w=105 → ours x[103,207] w=105, both
edges exact; INSERT COIN 87 → 87; READY right edge 182.0 → 182 exact; tally right-align x143 →
x143 exact. HUD regression after all of it: **11,060 of 11,060 arcade-consensus pixels still
match** over 10 frames.

### I35d — I17 closed: the cloud figures stay conservative

No horizontal rules added; the sky-band mask **shrank** ~8.6 % (1378 → 1260 px) because HIT lost
its plate. A shrinking mask can only move an over-count **down** and an under-stated width **up**,
so the cloud lane's published bias stays conservative rather than becoming wrong. **No re-statement
needed.**

### I35e — the method pairing, in the record as a pair

The **per-pixel diff** caught the detached-bars HIT emblem and the 1-px-left `3` label, neither of
which an eye finds. The **crop** caught the N's missing diagonal, where a statistic said
"artefact" and the pixels said "that is the letterform". *Diff per pixel to find where you are
wrong; open the crop to find what is actually there.*

### I35f — two more screens for gap 10's "still absent"

The same scan found a **"MISSION COMPLETE" card** and the **"BEST FIGHTERS" high-score table**
(visible in the lead's verification frame, with its own winged emblem row: SCORE / NAME / HIT /
RANK). Neither is implemented. Flagged by presentation as outside its lane rather than claimed.

## I36 — I33 closed: `alphaTest: 0.5` landed; night fallback palette fixed

`spriteFactory.js:37` and `:406` now carry `alphaTest: 0.5`, with the rationale written beside it
as a **depth-buffer correction, not a cosmetic choice**. The lane states why it chose `alphaTest`
over `depthWrite: false` — the latter trades the punch-out for a different artefact, while
`alphaTest` keeps the silhouette occluding. Lead-verified by capture
(`tools/out/tl-verify-alpha/frame-0000.png`, `?demo=2&seed=1` tick 342): the missile plume now
wraps the airframe continuously with no rectangular hole, and lock brackets render over enemies
behind the jet. `npx vite build` passes.

**I29b closed too.** The night fallback palette is corrected and, better, the palette table is now
a **transcription with a stated source** — every value read back out of the shipped PNG rather
than taken from the pre-snap authoring table in `tools/art/palettes.js`. That distinction is the
whole point: the authoring table runs through `snapHexToLadder()`, so the night nozzle is authored
`#ff7500` and *ships* as `#ff7300`. `spriteFactory.js` now reads `flame: #ef7300` (day) /
`#ff7300` (night).

Night's `key` and `deepShadow` are deliberately the same value — the measured night set has no
true black and its darkest step doubles as the keyline. **That is the arcade's palette, not an
economy**, and it is the same property that makes the night keyline pass JET-SIL's `max(RGB) > 30`
mask where the day keyline fails it (I23).

### I36a — an honest negative result, and the gap it leaves open

The lane labelled its palette check **a source-level equality, not a render check**, and said so
rather than letting it read as stronger. It tried to exercise the procedural fallback by capturing
at tick 1, on the theory the sheet would not have decoded yet; `poseSource` read `sheet-day`, so
the capture measured the sheet and **the check was vacuous. It discarded the result rather than
publish it.**

**The fallback render path is not exercisable without inducing a decode failure, so it remains
unverified in flight — which is exactly why it drifted unnoticed in the first place.** Open item:
a `?nosheet=1` measurement flag would close it properly. Until then, the fallback is a path that
ships, is never rendered in any test, and has already carried one wrong colour for a full round.

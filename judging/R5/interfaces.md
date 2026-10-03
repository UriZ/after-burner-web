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

## I3 — Night palette swap (open, owner: sprite-art lane)

GAME_SPEC.md: night stages palette-swap the **player** jet to blue-grey (and render
ground as city-light speckle). world-r5 flagged that the player-side swap may be missing
entirely. sprite-art owns the airframe palettes for both player and enemies, so the
night variants belong to that lane.

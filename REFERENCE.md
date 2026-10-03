# After Burner II — Measured Visual Reference

Every value here is either **MEASURED in this pass** (frame + pixel coordinates + sampled
value given) or **ADOPTED** from the Godot prototype's verified measurements (the
measurement method and its location in `../afterburner` are cited so it can be re-run).
Nothing below is eyeballed. If a value you need is missing, measure it — do not infer it.

## Sources and provenance

- **Video**: `../afterburner/.reference-cache/video/ab2-longplay.mp4` — 686×480, 30 fps,
  AV1, 988.7 s. All `tN` frame citations are exact single-frame extractions:
  `ffmpeg -ss N -i ab2-longplay.mp4 -frames:v 1 out.png` (single-frame `-ss` is exact on
  this machine; *sequence* extraction from AV1 files starts ~4 s early — never derive
  timestamps from sequence indices).
- **Stage identity**: every stage claim uses the HUD-verified stage↔timestamp map in
  `../afterburner/scripts/stage/stage_data.gd` (header). Verified spans (seconds):
  stage 1: 88–120, 2: 124–156, 3: 160–196, 4: 200–240, 5: 244–256, 6: 260–304,
  7: 308–340, 8: 344–372, 9: 376–424, 10: 428–468, 11: 472–508, 12: 512–548,
  13: 552–568, 14: 572–608, 15: 612–652, 16: 656–692, 17: 696–724, 18: 728–764,
  19: 768–808, 20: 812–852, 21: 856–892, 22: 896–932, 23: 936–952.
  Attract mode runs to ~84 s; the run starts at the carrier launch ~88 s; stage-1
  *flight* starts ~94–97 s (before that is the launch cinematic).
- **Coordinates** below are (x, y) pixels in the 686×480 video frame unless a fraction
  (%W / %H) is given. The arcade's native resolution is 320×224; the video is an upscale,
  so prefer the fractions.
- All measurement scripts for this pass were run from scratch on the extracted frames
  (mode colors, column scans with 6-consecutive-row confirmation, per-frame object
  masks). The mask AND the extent method for each number are stated where the number is
  used — they differ per frame and the difference matters (see the jet-span note below).
  The sky "mode" figures are modal colors of the band y=55–130 full-width.

### Measuring OUR captures: the native grid (VERIFIED R5)

Our captures are **960×672**, which is an **exact 3× nearest-neighbour block upscale** of a
true 320×224 render (`tools/capture.mjs` sets that viewport; `src/render/screen.js` picks
`scale = max(1, floor(min(w/320, h/224)))` = 3, and 320·3 × 224·3 = 960×672 fills it with no
letterbox). **Verified, not assumed**: across three independent judge-R4 captures, all
71 680 native pixels per frame, **every 3×3 block is perfectly uniform — maximum
intra-block deviation 0**.

Therefore `img[::3, ::3]` (what `measure_ground.py`, `measure_coarseness.py`,
`measure_flow.py`, `measure_roll.py`, `measure_clouds.py` and `hud_mask.py` all do) is
**exactly lossless** — it recovers the native render bit-for-bit. It does not point-sample
an aliased image, and it cannot distort a statistic. Measured both ways on the same capture
over the near-field sea band:

| statistic | full 960×672 | `[::3,::3]` 320×224 |
|---|---|---|
| ACF anisotropy | 3.69× / 1.97× | 3.63× / 1.94× |
| p5–p95 value spread | 0.3843 / 0.3569 | 0.3843 / 0.3529 |
| foam fraction (V>0.95) | 24.17% / 49.19% | 24.22% / 49.57% |

The two per-pixel statistics are invariant **by construction** (a lossless block upscale
counts every native pixel nine times, which cannot move a percentile or a fraction); the
residual ≤0.4 pt is patch-boundary rounding landing on a different native row, not
information loss. **Decimating is not merely safe, it is required for the ACF**: on the
upscaled image the half-widths are 5.86/1.59 px against the native 1.94/0.53 — i.e. three
times the native figure, dominated by the 3-px block edges rather than by texture.

Two standing cautions, neither of them about the decimation:
- **The stride is hardcoded to 3 in every tool and nothing checks it.** It is right only
  for a 960×672 capture. A different viewport changes `scale` (1920×1080 → 4×), and a
  viewport that is not an exact multiple also letterboxes, which misaligns the stride.
  Before decimating, **derive the block size and assert uniformity** rather than assuming 3.
- At native scale the sea ACF half-widths are **0.5–2 px**, so the anisotropy *ratio* is
  quantisation-limited and can be satisfied degenerately by making the vertical axis pure
  noise (R3 judge's point). Measuring on the upscaled image does not fix this — it only
  measures the upscale blocks. Pair the ratio with an absolute horizontal decorrelation
  length, as the sea section does.

## Frame catalog (`reference/`)

Curated frames (all PNG, extracted at exact timestamps; stage identity per the map above):

| file | shows |
|---|---|
| `title-screen-t74.png` | complete title: AFTER BURNER + sphere "II", INSERT COIN, CREDIT |
| `carrier-prelaunch-t84.png` | carrier astern, SCORE 0, STAGE 1, full clean HUD |
| `carrier-launch-t89.png` | deck roll at launch, carrier island w/ "128" board |
| `stage1-climbout-t92.png` | climb between cloud banks, level jet, small sprite |
| `stage1-flight-bank-t97.png` | stage-1 flight, banked right, world tilted |
| `stage1-hard-bank-t98.png` | hard bank — world roll ≈ 60.7° (Godot #128 measurement at t=98) |
| `stage1-lockon-missile-t100.png` | blue lock boxes, missile flame, explosion debris, 2 enemies |
| `stage1-lockon-island-t104.png` | lock boxes over island terrain, banked |
| `stage1-flight-bank-t112.png` | moderate bank — world roll ≈ 36.8° (Godot #128 at t=112) |
| `stage1-level-flight-t116.png` | near-level flight over open sea, bracket on distant enemy |
| `stage2-flight-t140.png` | stage-2 orange desert/autumn, banked |
| `stage3-night-level-t175.png` | stage-3 night, level flight — cleanest jet-scale frame |
| `stage3-night-lockon-t186.png` | night, banked, lock brackets + enemies |
| `stage8-canyon-explosion-t357.png` | canyon walls both sides, low horizon; the lower-left mass is a **fading smoke ring, not a fireball** — see Explosions |

Round-3 additions, from the 60 fps cache file (`ab2-longplay-60fps.mp4`, 1028×720 —
verified the SAME recording as the 686×480 map-keyed file: identical scene and HUD
values at t84/t116, durations 988.68 vs 988.70 s, so the stage map transfers directly):

| file | shows |
|---|---|
| `stage1-missile-salvo-t100.75.png` | multi-lock salvo mid-flurry: brackets, launch smoke, kills |
| `stage2-start-bonus-tally-t124.png` | stage-end tally card "HIT COUNTS 8 / POINTS 160000" + STAGE 2 |
| `stage3-reload-tanker-t165.png` | mid-air tanker overhead + cyan "RELOAD WEAPONS" text |
| `stage4-vulcan-stream-t214.png` | player vulcan stream: orange puff column, astern view |
| `stage4-barrel-roll-t222.png` | barrel roll mid-maneuver: inverted jet over a LEVEL horizon |
| `stage5-runway-restock-t252.png` | runway flyover: trucks, ground crew, motorbike, stock refilling |
| `stage7-enemy-shot-train-t330.png` | enemy shot train crossing the frame + debris burst |

Round-4 additions, from a THIRD source: `ab2-gameplay.mp4` (866 s, 30 fps, 480p, cached
beside the longplays via the youtube-reference skill from
https://www.youtube.com/watch?v=8d-S1kcjieA). It is a different recording with its own
timeline, cited as `gp tN`, and has **NO stage↔timestamp map** — it was fetched because
the skilled longplay contains no player deaths; use it for death/respawn/continue facts
only, never per-stage claims:

| file | shows |
|---|---|
| `death-starburst-gp-t202.png` | player death: screen-filling multi-lobe starburst at the jet |
| `respawn-ready-gp-t207.png` | respawn: oversized jet sliding in from bottom + "READY" text |
| `continue-card-gp-t261.png` | out of lives: "CONTINUE PLAY / 10 / INSERT COIN" over live world |

Plus the 9 screenshots inherited from the Godot repo (`ab2-arcade-*.png/jpg`): desert,
desert-explosions, night-banking, night-missiles, closeup-enemies, coastal-banking,
city-stage, huge-explosion, reload-dorsal. These carry **no proven stage identity** —
use them for pose/palette/detail, not per-stage claims. `ab2-arcade-reload-dorsal.jpg`
(jet astern, isolated on black) is the player-sprite structure reference.

## Sky palettes

MEASURED this pass (modal color of band y=55–130, full width; share = modal fraction —
AB2 skies are flat fills, so the mode is exact):

| stage | frame | sky top | modal share | near-horizon |
|---|---|---|---|---|
| 1 | t116 | `#009eff` (also at (343,20)) | 0.82 | same — no glow |
| 2 | t140 | `#f27500` (at (343,20)) | 0.60 | glows toward gold near terrain; t144 (600,100) reads `#ea9631` |
| 3 | t175 | `#000000` | 0.91 | near-black; a thin dark-blue band sits just above terrain: (620,308) = `#000131` |

ADOPTED — all-23-stage sky table: `../afterburner/scripts/stage/stage_data.gd` `STAGES`
(sky_top/sky_horizon per stage; measured as modal color of y=55–150 over 5 frames per
verified span). Key values: 1 `#009fff`, 2 `#e67100`→`#f0d100` horizon glow,
3 `#000005`, 4 `#009f93`, 8 canyon cream `#faecb0`, 9 snow `#b5cfd7`, 14 gold
`#ffc600`→`#fd9008`, 16 lavender `#a9a8fd`, 23 `#009eff`. (Small deltas vs my reads are
re-encode noise; both chains are cited.) Only stages **2, 14, 17, 20, 22** have a
measurable horizon glow; every other stage is ONE flat color top-to-horizon. Stage 2's
sky is flat for the first ~80% of its height before the glow starts (measured: `#e67100`
pixel-identical y=60→228 of a horizon at y≈268 — `game_world.gd` SKY_FLAT_FRACTION).

## Ground / terrain palettes

ADOPTED from `stage_data.gd` (#124 pass — hue-histogram method over variance-gated
frames, two independent corroborators, reproducible via
`../afterburner/tools/measure_ground_palette.py --stage N`). Only 9 of 23 stages were
measurable; the rest are flagged UNMEASURABLE there with per-stage reasons. The measured ones:

| stage | biome | H/S | V75 (light) | V25 (dark) |
|---|---|---|---|---|
| 1 | sea | 235°/1.00 | 0.925 | 0.796 |
| 2 | desert scrub | 35°/0.82 | 0.733 | 0.441 |
| 4 | forest | 125°/1.00 | 0.416 | 0.282 |
| 8 | canyon | 35°/1.00 | 0.831 | 0.529 |
| 10 | dry scrub | 35°/0.77 | 0.771 | 0.469 |
| 14 | palms/gold | 55°/0.70 | 0.576 | 0.248 |
| 15 | dry grass | 55°/0.99 | 0.518 | 0.259 |
| 16 | city | 205°/1.00 | 0.673 | 0.478 |
| 23 | ocean/carrier | 235°/1.00 | 0.939 | 0.806 |

Stage 1 extras (ADOPTED, #135): island vegetation green H=120° S=1.0 V75=0.514; canyon
wall grey-green stage 8 `H 64.6° S 0.25 V75 0.459`, stage 17 `H 111.3° S 0.17 V75 0.353`.
AB2 ground is **dithered/streaked, not flat** (stage-1 sky modal share 97.8% vs ground
5.7% — same source).

**Sea texture, stage 1 — direction and contrast (MEASURED; CORRECTS this doc's earlier
"along-track" wording, which was BACKWARDS and caused a wrong implementation):**

- **Direction: the sea is CROSS-TRACK dominant** — the streaks run HORIZONTALLY on
  screen (wave rows perpendicular to the flight axis), so horizontal autocorrelation is
  far longer than vertical. Measured on the value channel of t116 (near-level, so screen
  axes ≈ track axes), normalized ACF at pixel lags 2/4/8:
  - near-field band y[340,415] x[40,640]: horiz 0.66/0.49/0.31 vs vert 0.37/0.05/−0.06
    (vert/horiz 0.55/0.10/−0.19)
  - mid band y[300,340] x[40,180]: horiz 0.87/0.74/0.59 vs vert 0.43/0.34/0.25
  - t97 sea y[330,420] x[30,400]: vert/horiz 0.64/0.49/0.39
  This corroborates the R2 judge's independent 0.20–0.32 vert/horiz readings. The
  prototype's OCEAN_ANISO magnitude ~2.1–2.3× (ADOPTED #135) stands, but the direction
  word "along-track" was this doc's own gloss, not in the Godot source, and was wrong:
  **ridges must run across the travel axis so scrolling moves them visibly** — ridges
  along the travel axis slide along themselves and read as a dead ground.
- **Contrast / foam (binding texture stats, not just palette)**: on the same t116 sea
  regions, value-channel p5–p95 spread = **0.329** (near-field band) / **0.302**
  (whole sea y250–420 minus the jet bbox), and the fraction of sea pixels brighter than
  V 0.95 (foam/sparkle) = **23.4%** (near-field band) / **38.8%** (whole sea). The R2
  judge independently measured 0.345 / 38.6% — corroborated. The R2 build measured
  0.019 / 1.5% (judge's figures): the arcade sea is high-contrast and heavily
  foam-flecked, not a smooth hue carpet.

## Horizon

- MEASURED level-flight horizon rows (median of per-column scans, 6-consecutive-row
  deviation >60 sum|ΔRGB| from sky mode, 66 columns):
  - t116 (stage 1, near-level): y=240 → **0.500 H** (p10–p90 201–278 — boundary is mildly tilted/ragged)
  - t175 (stage 3, level): y=310 → **0.646 H** (tight: p10–p90 274–322)
  - t140 (stage 2, banked): median 0.446 H but p10–p90 127–410 — a banked frame has no
    single horizon row; do not measure horizon on banked frames with row scans.
- The horizon **moves with player altitude/maneuver** — 0.50 vs 0.65 above are both real.
  ADOPTED cruise constant from the prototype: **0.625 H** (60–65%H band). Canyon stages
  sit near the top of frame: stage 8 = **0.13 H**, stage 17 = **0.07 H** (ADOPTED #120 —
  medians over 41 frames/span; stage 17 is the weaker value; in-flight p10–p90 roams
  ~5–27%H on both). See `stage8-canyon-explosion-t357.png`: walls fill the frame, sky is
  a thin band.
- **Horizon tilt when banking** (ADOPTED #128, measured on verified stage-1 span):
  the whole world rotates **rigidly about the screen centre** — best-fit centre
  (0.51 W, 0.49 H) ± 21 px over 42 frames; line-fit residual 0.55–1.8 px (rotation, not
  shear). Peak |roll| **67.9°**, saturating 65–68°. Roll rate while rolling: median
  **74.5°/s** (p25 47.4, p75 82.9); the t=95.2→95.9 ramp measures 7.4°→66.8° ≈ 80°/s,
  so full 0→65° takes ~0.8 s. **The HUD does not rotate.** Horizon descends to the right
  when banking right (see t97/t98).

## Player jet

- **Structure** (astern): see `ab2-arcade-reload-dorsal.jpg` and the measured geometry in
  `../afterburner/scripts/player/player_jet_2d.gd` (#112 — wing band ~0.08 half-spans
  thick on the nozzle line, twin canted fins, canopy is the topmost body element,
  violet-magenta canopy `#9d3aca`, airframe greyscale ladder V = 0.98/0.90/0.82/0.75 with
  near-black nacelles V≈0.33 measured at t=557; warm-tinted shadow grey `(164,132,132)`
  from `ab2-arcade-desert.png` — NOT cream/beige).
- **Fin height is a LARGE share of the silhouette** (MEASURED on the 60 fps t175 frame,
  1028×720, mask V>0.12 in window y[335,465] x[325,720]; CORRECTS R1's "≤25% of sprite
  height" acceptance bound, which contradicted the reference and induced the build's
  clipped "detached ears"): silhouette spans rows 343–464 (122 px); the per-row width
  profile stays narrow (3→53 px — twin fins + spine) from the top down to row ~411–414,
  where the wings erupt to the full 330 px span. Fin structure above the wing plane =
  68–71 px = **56–58% of total silhouette height** (wing-onset threshold 30%/50% of max
  span respectively). Corroborates the R2 judge's 57–62%. The fins are TALL blades, not
  stubs. **Caveat added R5**: this share is frame-dependent — the same operator on t168
  gives 54/113 = **47.8%**, because the nacelles widen higher up in that pose. Treat
  56–58% as a t175 fact, not as an acceptance bound; the acceptance bounds are the
  silhouette discriminators below.

### Silhouette discriminators, astern view (MEASURED R5 — REPLACES the R3 aspect/fin-%/step triple)

> ## THE REFERENCE CROP IS AUTHORITATIVE OVER EVERY NUMBER BELOW.
>
> **Draw against the crop first; measure second.** The statistics in this section exist to
> *catch a wrong silhouette*, not to *define a right one*. No set of scalars specifies a
> shape, and the R4 judge's finding is precisely that a silhouette authored **to the
> statistics** can match the arcade's aspect ratio to three decimals and still not read as
> an F-14. If a shape satisfies every number here and does not look like the crop when you
> put them side by side, **the crop wins and the numbers are incomplete** — report that
> rather than shipping the shape.
>
> **The authoritative crops**, in order of authority:
> 1. `reference/stage3-night-level-t175.png`, crop **x[207,487] y[227,306]** (686×480) —
>    committed, level astern, isolated on black. View it at 4–8× **nearest-neighbour**.
> 2. The same pose with ~2.2× the pixels, for blade and nacelle detail:
>    `ffmpeg -ss 168 -i .reference-cache/video/ab2-longplay-60fps.mp4 -frames:v 1 t168.png`,
>    crop **x[320,720] y[344,460]** (1028×720). t=168 is inside the HUD-verified stage-3
>    span (160–196 in `STAGE_MAP.md`) and is the cleanest astern pose in the footage.
> 3. `reference/ab2-arcade-reload-dorsal.jpg` — the airframe-structure reference (canopy
>    placement, greyscale ladder); the jet is small there, so use it for structure, not
>    proportion.
> 4. `judging/R4/cmp-09-jet-sprite-ours-TOP-arcade-BOTTOM.png` — ours against the arcade at
>    matched size. The single most useful image for seeing what is wrong.
>
> What the crop shows that no scalar in this section captures: wings that **sweep** and
> **taper** to the tip rather than ending as planks; nacelles that are separate bodies with
> the fuselage visible *between* them; the fins rising **from the nacelles**, not from the
> spine; a magenta canopy fleck as the topmost body element; and twin small ventral fins
> below the nozzle line. Draw those, then confirm with the table.

**Why this section exists.** R3's acceptance triple (silhouette aspect 2.4–3.0, fin-region
max row width ≤20% of max, "step" in the row profile) **cannot tell our jet from the
arcade's**. R4 measured one operator on both: aspect ours **2.478** vs arcade **2.475**;
fin-region width ours **12.3%** vs arcade **16.2%** — near-identical scores for a solid
centred tuning-fork over a flat plank (ours) and two separated outboard canted blades over
swept wings (the arcade). Re-verified R5 and it is worse than "non-discriminating": on the
arcade's *own* t168 the fin-region width reads **21.0–24.4%**, so the ≤20% bound **fails the
reference aircraft**. A 1-D row-width profile is blind to where the fins are; use the
operator below, which is explicitly 2-D.

**Operator JET-SIL (state it exactly; every number below is reproducible from it).**

1. **Frame**, read at its stored resolution — **never upscale**. Arcade: `ab2-longplay-60fps.mp4`
   (1028×720) at t=175 and t=168, both level-astern night poses isolated on black.
   Ours: a `?fixed=1` capture at ≥960 px frame width (below ~250 px of jet span the blades
   are not resolvable and the operator is meaningless).
2. **Window**, chosen to contain the jet and exclude ground/HUD: t175 `x[310,730] y[340,458]`;
   t168 `x[320,720] y[344,460]`. For our build derive HUD exclusion with `tools/hud_mask.py` —
   never hardcode a box.
3. **Mask** = `max(R,G,B) > 30` (V>0.12) on a dark background, or the achromatic mask
   `saturation < 0.35 ∧ V > 0.08` over a saturated sky. Then keep **only the largest
   8-connected component** — this drops debris, stars and HUD text that would otherwise
   corrupt the fin extent (it did: it inflated fin extent from 35.7% to 38.9% on t175).
4. **row width** = **count of filled pixels in the row** (NOT the row's left-to-right
   extent; R3's published 53 px / 16.1% is a filled count and the extent reading is
   ~2.4× different). `S` = max row width. **SPAN** = max row *extent* = the wingspan.
   `H` = silhouette height.
5. **Fin band** = rows from the silhouette top down to, but excluding, the first row whose
   filled width ≥ `0.30·S` (the "30% wing onset" of the R3 text).
6. A fin-band row **contains two separated blades** if it holds ≥2 runs of ≥2 consecutive
   mask pixels whose inter-run gap is ≥ `0.03·SPAN` px (min 2 px).
7. **Nozzles** = afterburner glow: hue 5–55°, S ≥ 0.45, V ≥ 0.45; take the two largest
   8-connected components and their x-centroids.

**Controls this operator passes before it is pointed at anything** (run them; an
uncontrolled operator is how the defective triple shipped):

| control | published | JET-SIL re-run | result |
|---|---|---|---|
| t175 fin-region max row width, px | 53 (R3) | **53** | exact |
| t175 fin-region width, % of max row | 16.1 (R3) / 16.2 (R4) | **16.2–16.4** | exact |
| t175 wingspan as %W | 36.3 (this doc, column-run method) | **36.28** | exact |
| same statistics on the 686×480 t175 instead of the 1028×720 | — | 100% / 35.5% / 30.0% | **scale-invariant** |
| V threshold swept 25→60 | — | all three stable to ≤0.4 pt | threshold-stable |

**ACCEPTANCE TARGETS (arcade, two independent frames):**

| statistic | t175 | t168 | target band for our jet | ours R4 |
|---|---|---|---|---|
| **fin rows containing two separated blades** | 67–68/68 = **99–100%** | 54/54 = **100%** | **≥90%** | 38% (62/162) |
| **fin-pair lateral extent, % of SPAN** | 132–133 px = **35.4–35.7%** | 132 px = **35.4%** | **30–40%** | 12.6% |
| **nozzle-centre separation, % of SPAN** | 112.2 px = **30.1%** | 112.2 px = **30.1%** | **25–35%** | 14.5% |
| **blade cant**: blade-pair half-separation at the topmost fin row ÷ at the lowest fin row | 64.0/49.5 = **1.29** | 62.5/51.0 = **1.23** | **≥1.15** (tops further outboard than roots) | **1.00** (vertical slot) |

The "ours R4" column is this operator re-run on the *ours* panel of
`judging/R4/cmp-09-jet-sprite-ours-TOP-arcade-BOTTOM.png` (a composite, so its absolute
scale is unknown — but all four statistics are ratios and were shown scale-invariant
above). It reproduces the R4 judge's independent native-scale readings of our build to
≤0.5 pt: 38% vs his 8/21 = 38%, 12.6 vs 12.3, 14.5 vs 14.0, aspect 2.499 vs 2.478. The
arcade column was measured directly from the video, not from the composite. So the
operator and the judge agree on both aircraft, by separate routes.

**SANITY BOUNDS ONLY — these do NOT discriminate, never accept on them alone:**

- **Aspect = SPAN ÷ H** (extent-based, threshold-stable): arcade **3.24** (t175) / **3.30**
  (t168) across V 25–60. Band **3.0–3.6**. R3's filled-pixel aspect is not usable as a
  bound: the same two frames give 2.61–2.96 depending only on the V threshold, and ours
  scores 2.50 against the arcade's 2.48.
- **Span 34–38%W**, **centroid 52–60%H** (unchanged, from the sections above).
- The old **fin-region max row width** figure stays in this doc as a *description*
  (t175 53 px = 16.2%, t168 70 px = 21.4%) and is **withdrawn as an acceptance bound**.

- **Canopy coverage bound** (MEASURED on `ab2-arcade-reload-dorsal.jpg`, 181×127): the
  canopy is a single compact patch — largest connected component of the magenta mask
  (hue 250–330°, S>0.25, V>0.15) is **8 px in a 4×2 bbox at x[90,93] y[70,71] = 0.035%
  of frame area**, core `#9f3ccd` (≈ the known `#9d3aca`); everything else matching the
  hue band is scattered 1–3 px JPEG noise. Corroborates the R2 judge's 0.03%; the R2
  build's canopy covered 1.24% of frame — ~35× too large. The canopy is a fleck of
  color, not a drawn rectangle.
- **Wingspan on screen** (MEASURED — note each frame's extent method; they are NOT the
  same, and using the wrong one changes the answer 2.6×):
  - t175 (level, night, isolated on black): **36.3%W** = the extent of the largest run of
    CONTIGUOUS OCCUPIED COLUMNS — columns 225–473 of 686 (249 px) in the band y=225–300,
    where a column is "occupied" if any pixel in the band has max(RGB)>40. A detached
    debris run at columns 189–199 is excluded (the empty column gap 199–225 separates it).
    Height ≈ 71 px ≈ 14.8%H. **Connected-component pixel labelling is NOT the method
    here and gives a different, much smaller number**: on the same mask the largest
    component is the fuselage alone, 97 px = 14.1%W — the dim wing roots fall below the
    threshold at pixel level, so the wings disconnect from the body even under
    8-connectivity. A developer verifying jet scale against 36.3%W must reproduce the
    column-run extent, not a component bbox, or they will tune the jet to half size and
    believe they hit target.
  - t116 (near-level): 259 px = **37.8%W** — this one IS the bbox of the largest
    8-connected pixel component (mask S<0.35, V>0.60); the brighter daylight airframe
    stays connected. May include a few tracer pixels — treat as an upper bound.
  - t140 (banked, more distant): ~29%W (largest 8-connected component of mask B>70 ∧
    max(RGB)>130; the warm-lit wingtip may extend slightly past it — treat as a lower
    bound for that pose).
  - So: **neutral span ≈ 36%W of frame**; it breathes with maneuver/altitude roughly
    29–38%W. (Prototype ships 342/960 = 35.6%W — consistent.)
- **Screen position / roam** (jet centroids MEASURED: t116 (48.0%W, 55.1%H), t140
  (41.2%W, 59.7%H), t175 (50.5%W, 58.3%H)). **Of these only t175 reproduces** (R5): t175's
  jet is isolated on black and its published figure matches a pixel centroid to 0.56 pt. On
  t116 I get (46.2%W, 60.04%H) as a pixel centroid and (48.1%W, 56.98%H) as a bbox centre
  and neither matches the published pair — the t116 jet is **banked and overlaps a white
  landmass and a second aircraft**, so the mask is contaminated whatever the threshold.
  **Anchor centroid work on t175/t168, not t116**; treat the t116 and t140 pairs as
  indicative only, and re-derive them before quoting either as a target. ADOPTED distribution from the prototype's
  #122 arcade measurement: the spread is **two-regime**, not constant-amplitude weaving —
  open cruise cx sd **12.88 %W** at cy ≈ **52.8%H**; canyon cx sd **2.59 %W** at cy ≈
  **63.5%H** (lower and straighter); combined cx sd 10.44 %W emerges from alternating.
  The jet sits in the lower-middle half of the frame and roams widely in cruise.

#### Centroid: which pixels, and which average (DIAGNOSED R5 — this was the 2-round bias)

**The centroid is the AREA-WEIGHTED MEAN of the silhouette's pixel coordinates. It is NOT
the centre of the bounding box.** The published jet-centroid numbers ran 2–3 points
optimistic for two consecutive rounds because the two sides of the comparison used
different averages:

| frame | area-weighted PIXEL centroid | BBOX centre | published |
|---|---|---|---|
| arcade t175, 686×480 | **58.86 %H** | 55.73 %H | **58.3 %H** ← the pixel centroid |
| arcade t175, 1028×720 | **58.90 %H** | 55.62 %H | — |
| arcade t168, 1028×720 | **57.37 %H** | 56.04 %H | — |
| ours, R4 `jet-on`/`jet-off`, 3 frames | **57.08 %H** | 55.36 %H | **55.28 %H** ← the bbox centre |

The arcade figures match the **pixel centroid** (t175: 58.86 vs published 58.3). Our
figures match the **bbox centre** (55.36 vs published 55.28 — 0.08 pt). So the **52–60 %H
band is in pixel-centroid units**, and the authoring side has been reporting a bbox centre
against it. The gap is not a constant offset to subtract: it is **1.3–3.3 points** across
these four measurements, because it depends entirely on how the silhouette distributes its
area — an AB2 jet carries thin tall fins above and dense wings/nacelles/nozzles below, so
its mass sits well under its vertical midpoint.

Provenance of the mix-up, for the record: `judging/R2/report.md` reports "jet **bbox
centre** (49.9%W, 84.5%H) **against arcade 55.1/58.3/59.7%H**" — i.e. a bbox centre set
beside three pixel centroids in one sentence. The convention has been copied forward since.

**Operator (use this on both sides):**
1. Isolate the jet. Preferred: a **jet-on minus jet-off difference mask** (`?hidejet=1`),
   `max|Δ| > 8` per channel at native scale — it needs no colour assumption and is what the
   R3 and R4 judges used. On an arcade frame, use the largest 8-connected component of the
   silhouette mask instead (there is no jet-off frame).
2. **Which pixels count: the airframe plus its integral nozzle glow; exclude any detached
   exhaust plume, smoke trail or shadow.** The arcade mask necessarily includes the nozzle
   glow (it sits inside the nacelles and is part of the same component), so ours must too.
   Measured contribution on our build: including the warm nozzle pixels moves the centroid
   from 56.59 %H to 57.08 %H — **0.49 pt**, far too small to explain the bias, so the flame
   is *not* the culprit despite being the obvious suspect.
3. `cy = mean(y of mask pixels) / frame height`, `cx = mean(x) / frame width`. Report at
   native scale (`[::3,::3]` for our 960×672 captures — exactly lossless, see
   "Measuring OUR captures" above).

Reproduction check: this operator returns **57.08 %H** on all three R4 `jet-on` frames,
matching the R4 judge exactly.

Side note, not a gate: the size of the pixel-centroid-minus-bbox-centre gap is itself a
weak silhouette statistic — the arcade's t175 reads **3.28 pt** against our **1.72 pt**,
because its fins are thinner and taller. It is confounded by the nozzle glow, so do not
accept on it; the discriminators above are the gates.
- **Jet bank vs world roll**: the drawn jet bank tracks the world roll (prototype ships
  jet-bank = 0.8 × world roll, VISUALLY TUNED — the three usable reference frames gave
  ratios 0.90/0.61/1.31, too noisy to derive numerically; tune by capture against t=98
  and t=112). Banking is a pure image-plane rotation of the sprite (measured #112: a
  de-rotated banked frame matches the level frame's proportions).
- **Night palette swap** (MEASURED, stage 3 t164–186): on night stages the player
  airframe renders in blue-grey tones instead of the daylight warm greys — the whole
  sprite is palette-swapped, not dimmed. Night ground is a dense white-speckle field
  (city lights) over near-black, with dark blue coastline bands (t169–172).
- **Barrel roll vs bank, how to tell them apart in footage** (MEASURED t221.4–222.9 at
  0.1 s): in a normal bank the WORLD rolls and the jet holds a moderate bank; in the
  barrel roll the horizon stays level while the jet sprite itself sweeps through
  steep/inverted poses (~1.2 s, ~60%W lateral and ~20→75%H vertical excursion). See
  `stage4-barrel-roll-t222.png` and GAME_SPEC.md §1 for caveats.

## HUD (686×480 coordinates; divide by 686/480 for fractions)

Measured on t116/t84/t140 by color-mask bounding boxes:

| element | bbox (x, y) | color samples |
|---|---|---|
| SCORE winged emblem, top-left | x[36,151] y[34,49] | red `#d32716` |
| score digits (right-aligned, 6–7 digits) | x[224,305] y[35,48] | pale yellow `#fff4ae` |
| HIT winged emblem | x[346,407] y[34,49] | same red |
| hit-count digits | x[432,455] y[36,48] | same pale yellow |
| lock reticle (top-right corner-bracket square + side ticks) | x[508,624] y[52,101] (square itself ≈ x535–605) | white frame ≥`#b0b0b0`; center dot `#ffcd21` (orange-red when locking: t175 shows red dot) |
| SPEED label, bottom-left | x[37,89] y[431,441] | dark red on grey plate |
| throttle letter after SPEED | ~x=100 y=437 | changes with throttle (reads "M" at t140) |
| throttle bar | x[100,221] y[430,443] | blue fill `#338bf7` + amber chevron at the current-speed position `#f2c56c`; scale digits 0…1…2…3 above/along it |
| STAGE text | x[292,351] y[428,443] | red `#c53428` |
| stage number digit | x[376,414] y[426,450] (the Godot map's own HUD-read rect) | cream `#d4b886` |
| missile stock icons | x[421,536] y[427,472] | white/grey rockets with red tips (`#ffffff` body); large icons first, then small tick marks for the remainder |

Notes: the HUD is drawn **over** the game with no opaque bar — the world is visible
behind the bottom strip. There is **no altitude indicator in AB2's HUD** (the brief
assumed one; the bottom strip is SPEED/throttle + STAGE + missile stock only). The lock
reticle square sits fixed in the upper-right area during normal flight; lock-on
**brackets** (separate from the reticle) appear on enemies mid-screen, drawn as small
blue corner-brackets, color `#008cd9`–`#3bbaff` (t104 (262,155), (288,170)), turning
red/white variants per state (t116 shows a white bracket on a distant enemy at
≈(415,210); t186 night shows white brackets).

**Transient HUD overlays** (MEASURED, round 3): the stage-end tally card — red
"HIT COUNTS n" above cyan "POINTS m", upper-left area, counting up together at ~7
hits/s, with the incoming stage's "STAGE n" label shown lower-center during the count
(`stage2-start-bonus-tally-t124.png`); and the mid-air reload prompt — cyan
"RELOAD WEAPONS" blinking low-center beneath the tanker (`stage3-reload-tanker-t165.png`).
Round 4 adds: the respawn "READY" card low-center (yellow, then cyan —
`respawn-ready-gp-t207.png`) and the continue card "CONTINUE PLAY / <countdown from 10>
/ INSERT COIN" centered over the still-scrolling world (`continue-card-gp-t261.png`).

**Reticle anatomy** (MEASURED, round 4, t84–118 strip at 2 s): the fixed upper-right
reticle is a corner-bracket square with an **attitude line through it that rotates with
the world roll** (horizontal during level flight t84–94, steeply diagonal during banks
t96–98 — an artificial-horizon indicator, not decoration), plus a status dot: ABSENT
when no enemies are in play, and holding YELLOW or RED for multi-second spans while
enemies exist (state semantics not conclusively mapped — see GAME_SPEC.md §3).

**Missile stock widget semantics** (MEASURED, round 4, widget strips at t84–105,
t163–169, t245–258): base-10 odometer — large rocket icon = 10, small tick = 1; ticks
decrement one per launch and a large icon converts to ticks when units run out
(4L+0 → 3L+9 observed). Start = 5 large = 50; both resupply mechanisms fill to 7 large
= 70 in a ~4 s burst at ~10–20 missiles/s.

Title screen (t74, MEASURED): black background; "AFTER BURNER" in white `#f4f4f4`
brush-stroke letters; the leading A is blue `#0096fd`, the leading B red `#ff1600`;
behind the text a large "II" built from lavender spheres `#7e85cc` with red-hot cores
`#ff6625`; "INSERT COIN!" red `#ff1500` at y≈400; "CREDIT n" pink `#dfaadd` bottom-left;
"©SEGA 1987" blue `#008bd9` bottom-right. Lettering block spans x≈98–595, y≈109–359.
The title is built by an animation (letters assemble reversed — see t60/t66 context, not
shipped) and alternates with a BEST FIGHTERS score table and live attract gameplay.

## Explosions

**The t357 numbers are NOT a fireball — they are FADING SMOKE (corrected R5).** This doc's
previous target (region x0–160 y310–460 of t357, pixels with V>0.55, n=22 072; p95
`#fb9352`, p75 `#d58a1c`, p50 `#c25e02`, p25 `#a6290f`) describes the translucent,
dissipating debris ring in that frame's lower-left corner, measured through a desert-tinted
frame whose ground is tan and whose sky is cream — so the "highlights" are partly the
canyon floor read through the smoke. Re-measured R5 with the same operator: mean V
**0.753**, only **6.0%** of pixels above V 0.95, **1.9%** achromatic-bright. Band means
(mean colour of each decile, more stable on a compressed frame than a single percentile
sample): `#941c03` → `#a42c0e` → `#bd4a1a` → `#d68122` → `#e4b47f`. The brightest band is a
desaturated **tan**. R4's build reproduced these numbers (mean V 0.792, 20.1% above V 0.95)
and still had no fireball, because this criterion cannot see a white-hot core. **Keep these
figures as the description of a DISSIPATING smoke mass; do not accept a fireball on them.**

### Fireball targets (MEASURED R5 — use these)

Operator: read the frame at its stored resolution (no resampling). Mask = largest
8-connected component of "not background" inside a box bounding the blast, background
being the stage's flat sky (for `ab2-arcade-huge-explosion.jpg`, sky `#0142fe`, 20.7% of
the frame: `B > R+60 ∧ B > 140`). Exclude the HUD bands and any cloud wedge that touches
the blast (here `y[88,109) x[20,50)`; leaving it in moves nothing by more than 0.2 pt but
it is not fireball). Report mean/median V, the fraction above V 0.95, the achromatic-core
fraction (`saturation < 0.25 ∧ max(RGB) > 240`), and the **mean colour of each brightness
decile** ranked by R+G+B — not single percentile samples, which on these compressed frames
move by tens of levels between neighbouring masks.

| | `ab2-arcade-huge-explosion.jpg` (181×127) | `death-starburst-gp-t202.png` (640×360, interior box x[200,480] y[140,300]) | R4 build | TARGET |
|---|---|---|---|---|
| mean V | **0.891** | **0.925** | 0.792 | **≥0.85** |
| fraction above V 0.95 | **52.3%** | **60.1%** | 20.1% | **≥40%** |
| white-hot core, S<0.25 ∧ V>0.94 | **8.8%** | **3.5%** | — | **≥3%** |
| brightest-decile mean colour | `#f6f6e7` (V 0.967, **sat 0.063**) | `#f4ebb8` (V 0.958, **sat 0.246**) | `#fb9352` (sat 0.67) | **V ≥0.95, sat ≤0.30** |
| mean saturation over the whole fireball | 0.848 | 0.799 | 0.879 | 0.75–0.90 |
| blast extent | 140 px = **77.3%W** | — | — | — |

Decile-band ladder, `ab2-arcade-huge-explosion.jpg`: `#9b0204` (deep red rim) → `#d6050b`
→ `#f47a07` (orange) → `#f5d619` (yellow) → `#f6f6e7` (**near-white core**). The second
source gives the same ladder one step warmer (`#c21d07` → `#eb7318` → `#efb21b` →
`#f4dc31` → `#f4ebb8`), consistent with its heavier compression smearing the small white
patches toward yellow. **The single sharpest discriminator is the brightest-decile
saturation**: arcade 0.06–0.25, R4 build 0.67. Reproduces R4's independent readings (mean V
0.882 vs my 0.891; 47.7% above V 0.95 vs my 52.3%).

Caveats on the sources: `ab2-arcade-huge-explosion.jpg` is a sub-native 181×127 JPEG
(320×224 downscaled ~0.57×) with no proven stage identity, and `death-starburst-gp-t202.png`
comes from the third recording (`ab2-gameplay.mp4`), which has no stage map. Both are
therefore palette/structure evidence only — but they agree with each other and with R4,
and the white-hot core is visible by eye in both.

Explosions are big — screen-filling at the extreme (77%W above) — boiling multi-lobe
masses with radial spikes, not radial gradients; debris flies as small red/white chunks
(see t100 upper-left).

## Missiles / weapons visuals

### The smoke trail is WHITE — in every stage (MEASURED R5)

**WITHDRAWN: "overall mean V 0.37, brightest quintile 0.594, darkest quintile 0.219".**
That triple was ADOPTED from `missile_2d.gd`, which cites `ab2-arcade-night-missiles.jpg`
and gives no crop. R4 flagged it as a night value wrongly applied to daylight; verifying
it R5 makes it worse — **that frame contains no smoke trail at all.** Masking it at native
181×127 for low-saturation pixels (S<0.25, V>0.1) returns 1 132 px, and they are the HUD
reticle and attitude line, the SCORE emblem outline, the SPEED plate, the missile-stock
icons, the player airframe and the city-light speckle field — nothing contiguous, nothing
smoke-shaped. Their mean V is **0.366**, i.e. the published 0.37 is reproducible as a
*whole-frame grey-pixel average of a night HUD*, not as a trail. The only trail-like
structure in that frame is the missile's exhaust **flame**: hue 5–55°, S≥0.5, V>0.25 over
x[80,135] y[70,115] gives mean V **0.660**, bright/dark quintiles 0.966/0.303, mean
saturation **0.889** — bright orange, not dark grey. Implementing 0.37 is what made our
daylight trail black (R4 gap 4). Do not re-adopt it.

**MEASURED replacement.** Operator: read the frame at its stored resolution (no
upscaling); mask `saturation ≤ 0.25 ∧ V ≥ 0.6` (smoke is achromatic, every AB2 sky and
sea is saturated, so this separates them cleanly); report V and saturation over the mask.
Exclude the HUD bands (y<90, y>630 at 1028×720) and **do not** take a connected component
that has merged into a cloud bank — clouds pass the same mask, which is how R4's
"34–67%W" width arose (letting them merge reproduces 56.8%W here).

| frame | stage / light | box | mean V | median V | p10 V | mean sat |
|---|---|---|---|---|---|---|
| `stage1-missile-salvo-t100.75.png` | 1, day | x[330,620] y[400,630] | **0.962** | 0.969 | 0.937 | **0.053** |
| 60 fps t101 | 1, day | x[120,520] y[80,620] | 0.958 | 0.969 | 0.929 | 0.057 |
| 60 fps t178 | 3, **night** | x[300,800] y[360,630] | **0.909** | 0.922 | 0.804 | 0.055 |
| 60 fps t182 | 3, **night** | x[300,700] y[330,620] | 0.901 | 0.914 | 0.788 | 0.053 |
| 60 fps t226 | 4, day | x[660,980] y[380,590] (aged tail puffs) | 0.870 | 0.882 | 0.800 | 0.070 |

So the trail does **not** need a per-stage value split in the sense R4 proposed: it is
white on night stage 3 too, only ~6% dimmer than in daylight. **Acceptance: trail mean V
≥ 0.90 and mean saturation ≤ 0.10 on stage 1; ≥ 0.85 / ≤ 0.10 on night stages.** The R4
numbers for t100.75 (mean V 0.966, median 0.969, p10 0.941, sat 0.051) reproduce here to
≤0.01; its width figure does not — see below.

**Launch billow width.** Longest contiguous run of the smoke mask, per row, t100.75: it
grows monotonically **14.0%W at y=430 → 32.5%W at y=620**, still widening where the bottom
HUD cuts it off, so **≥32%W is a floor, not a peak**. Night t178 reaches **35.0%W** at
y=284 with its own component clipped at the right frame edge. R4's "34–67%W" is not
reproducible with a mask that excludes cloud; treat it as superseded.

**Geometry (ADOPTED, unchanged, but now flagged UNVERIFIED):** `missile_2d.gd` describes
a **continuous opaque ribbon** — 100% column occupancy, ~16 px thick at the head tapering
to a few px, with internal VALUE structure rather than an alpha fade. The occupancy and
the ribbon-vs-bead-chain shape are corroborated by every frame above. The **"~16 px" and
the 2.7× bright/dark ratio are NOT verified here**: the source states no frame scale for
the 16 px, and the ratio came from the same unreproducible night measurement. Keep them
as working values, re-derive before treating either as a gate.

MEASURED addition: the trail's TAIL ages into a chain of discrete round white puffs
(t226, t332, t120 — measured above at mean V 0.870), and a launch throws large white
smoke billows that briefly occlude part of the frame (t99.75–t101).

**Projectile palettes** (MEASURED this pass on 2× nearest-neighbor crops of 60 fps
frames; coordinates are crop-local, crops reproducible from the stated source rects):

- **Player vulcan rounds** — small round orange puffs, ~3–4 native px, in a loose
  zig-zag column ahead of the nose (alternating muzzles), NOT thin white tracers.
  Source: t214, crop x[380,760] y[160,420] of 1028×720; samples `#ffdb21` (430,212),
  `#ffad15` (268,350), `#ff9f0c` (310,282). See `stage4-vulcan-stream-t214.png`.
- **Enemy shots** — larger oval fireballs, ~6–8 native px, in spaced trains of 4–8:
  pale-gold core `#ffd570`, orange body `#ff7733`, dark red rim `#941114`, salmon edge
  `#e96c63`. Source: t330, crop x[430,1028] y[330,620]; samples at crop (880,370),
  (880,355), (880,385), (870,395). See `stage7-enemy-shot-train-t330.png`.

## Speed / motion (bounds, not vibes)

ADOPTED (#127/#139 — the only certified flow numbers; at motion-metrics' 192 px work
width): arcade stage-1 cruise ground flow is a **floor** of ≥ 3.063 px/frame
(≈ 95.7 %W/s); canyon (stage 8) **certified 1.9433 px/frame** — the canyon runs at
**≤ 0.63×** cruise, i.e. canyons are *slower*, not faster. The arcade's true cruise
speed is not measurable from the available footage (every depth band fails the
anti-aliasing gate). **Never judge speed from frames sampled below 60 fps** — AB2's
ground texture aliases temporally (Nyquist) even at 15 fps; stills support only
pose/scale/composition claims.

### Stage-1 clouds — and the operator the numbers were taken with (OPERATOR ADDED R5)

ADOPTED #132 arcade-side measurement over the HUD-verified stage-1 span t=88–120 of
`ab2-longplay.mp4` (686×480, 33 frames): banks on screen in **68–69%** of frames;
banks/frame median **1**, p90 **5**, max **6**; bank width median **9.26 %W** (p90
**21.49**, max **42.27**), height median **6.04 %H**, aspect median **0.97**. Stage 1 is
the only stage with measured cloud data; stage 6 is the arcade's dense-cloud stage
(unmeasured).

**These numbers are operator-dependent and R4 showed the two defensible operators disagree
by nearly 3× (threshold p90 width 8.56%W vs isolation 23.88%W on the same build). Measure
ours with THIS operator, because it is the one the arcade numbers above came from.**
The #132 classifier is transcribed **in full** below so this repo needs nothing outside it
(CLAUDE.md: standalone). Every constant is reproduced; nothing is left as a reference to an
external file:

- **Segmentation**: `saturation < 0.25 ∧ V > 0.80`, where V = max(R,G,B)/255 and
  saturation = (max−min)/max — i.e. **bright and low-saturation**, at the frame's stored
  resolution, **never upscaled**.
- **Analysis window**: rows **2%H to 45%H** only. This is load-bearing, not tidying: the
  same threshold matches **white aircraft and sea foam**. On the cloudless t=94 every
  qualifying component below the window is a fuselage or a wave crest. Widening the window
  without adding aircraft/foam rejection inflates the count with jets.
- **HUD exclusion**: for arcade frames, rects (as fractions of W,H)
  `(18/686, 20/480, 400/686, 58/480)` and `(495/686, 30/480, 660/686, 105/480)`. **For our
  build, derive the exclusion per run with `tools/hud_mask.py` — never hardcode a box.**
  With clouds disabled, a mis-sized rect left the HIT counter's digits exposed and the
  build "reported a cloud in 100% of frames while rendering none".
- **Components**: 8-connected, **≥150 px**. Discard any component **wider than 90%W** —
  that is the horizon haze seam, not an object (it previously reported "clouds" of median
  width 100.0%W).
- **Truncation**: a bank touching either window cut has a height that is a lower bound.
  **Height and aspect come from untruncated banks only; width is always pooled** (a
  horizontal cut cannot change a width, and truncation preferentially selects large banks,
  so an untruncated-only width median is biased small — 7.07 against the pooled 9.26).
- **ASPECT IS NORMALISED, NOT GEOMETRIC**: `aspect = (width/W) / (height/H)`. On a 1.43:1
  frame the same bank measures **0.97 normalised and 1.39 in pixels**. Building to a pixel
  aspect of 0.97 renders banks **1.43× too tall**. Both frame shapes in play are ~1.429
  (686×480 = 1.4292, 960×672 = 1.4286), so matching one matches the other; any other frame
  shape must re-derive it.

**OUR SIDE IS CURRENTLY MEASURED WITH A DIFFERENT CLASSIFIER (R5 finding).**
`tools/measure_clouds.py` in this repo diverges from the operator above on six axes, every
one of which pushes the measured width down or the count up, so its figures are not
comparable with the arcade's until it is reconciled:

| | #132 operator (what the arcade numbers are) | this repo's `tools/measure_clouds.py` |
|---|---|---|
| saturation | `< 0.25` | `< 0.35` |
| value | `V > 0.80` (max(RGB) > 204) | `max(RGB) > 150` (V > 0.588) |
| window | rows **2–45 %H** | rows 0 → `--horizon-row` (default 140 of 224 = **62.5 %H**) |
| connectivity | **8-connected** | **4-connected** (fragments dithered edges) |
| min component | ≥150 px at 686×480 = 0.046% of frame | `--min-area 3` at 320×224 = 0.004% |
| haze-seam discard | drop components wider than 90%W | **absent** |
| truncation | height/aspect from untruncated banks only; width pooled | **absent** |
| frame | 686×480 as stored | our capture decimated 3× (`img[::3, ::3]`) |

Its aspect *is* the normalised one (`cw` and `ch` are already %W and %H), despite the
`(w/h)` label — that part is right. Reconciling the rest is a prerequisite for scoring
gap 7; until then the only defensible statement is the judge's, that the two operators
disagree by nearly 3× on the same build.

**Instrument control (R5)**: reimplemented from the prose above, independently of that
script, and run on t=88–120 extracted frame-by-frame: presence **72.7%**, count median
**1** / p90 **5.0** / max **5**, width median **8.16 %W** / p90 **21.43** / max **42.27**,
untruncated height median **5.62 %H**, normalised aspect median **1.06**. Every figure
lands inside the classifier's own published accept bands (58–80% / 8.0–11.0 / 38–46 /
5.0–7.5 / 0.85–1.10) and the width max is exact, so the operator above is the right one.
The R4 build's failing figure under this operator is **p90 width 8.56 %W against the
arcade's 21.49** — presence and height already pass; do not retune those.

## Enemies

- Size at closest approach (ADOPTED #105): wingspan ≈ **25–30%W** just before the
  fly-past. See `ab2-arcade-closeup-enemies.jpg`.
- Enemies bank hard into their lateral drift — measured large-enemy bank **≈57°**
  (ADOPTED #131: wing axis dx705/dy1080 on a 3× crop of closeup-enemies), and they roll
  into/out of turns rather than holding one angle.
- Enemies fly at altitude (in the sky band), approach from the horizon growing toward
  the player, and cross the frame; grey MiG-type silhouettes read dark against bright
  skies (t116 left, t148, t186).

## Known gaps (not verified here)

- Stage-2/3 ground palettes: stage 2 measured (above); stage 3 night ground is
  UNMEASURABLE by the hue method (near-black; needs a value-only estimator).
- Barrel roll: one instance measured (t221.4–222.9; frame committed); 360° single-
  direction continuity CONFIRMED at frame stepping in round 4 (note: the 60 fps file
  duplicates frames in this span — effective unique rate ~30 fps); the input trigger and
  i-frames remain open — see GAME_SPEC.md §1.
- Throttle speed-effect magnitude: still unmeasured (only the HUD letter state and the
  refuel-time score-accrual pause are observed).
- The 60 fps file (`ab2-longplay-60fps.mp4`, 1028×720) is the same recording as the
  686×480 map-keyed file (verified: identical scene + HUD at t84/t116, matching
  durations), so the stage map applies to both; round-3 facts were measured on it.

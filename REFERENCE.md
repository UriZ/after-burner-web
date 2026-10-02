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
| `stage8-canyon-explosion-t357.png` | canyon walls both sides, low horizon, fireball lower-left |

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

Stage 1 extras (ADOPTED, #135): ocean is anisotropic (wave banding ~2.1–2.3× along-track
ACF anisotropy), island vegetation green H=120° S=1.0 V75=0.514; canyon wall grey-green
stage 8 `H 64.6° S 0.25 V75 0.459`, stage 17 `H 111.3° S 0.17 V75 0.353`. AB2 ground is
**dithered/streaked, not flat** (stage-1 sky modal share 97.8% vs ground 5.7% — same source).

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
  (41.2%W, 59.7%H), t175 (50.5%W, 58.3%H)). ADOPTED distribution from the prototype's
  #122 arcade measurement: the spread is **two-regime**, not constant-amplitude weaving —
  open cruise cx sd **12.88 %W** at cy ≈ **52.8%H**; canyon cx sd **2.59 %W** at cy ≈
  **63.5%H** (lower and straighter); combined cx sd 10.44 %W emerges from alternating.
  The jet sits in the lower-middle half of the frame and roams widely in cruise.
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

Title screen (t74, MEASURED): black background; "AFTER BURNER" in white `#f4f4f4`
brush-stroke letters; the leading A is blue `#0096fd`, the leading B red `#ff1600`;
behind the text a large "II" built from lavender spheres `#7e85cc` with red-hot cores
`#ff6625`; "INSERT COIN!" red `#ff1500` at y≈400; "CREDIT n" pink `#dfaadd` bottom-left;
"©SEGA 1987" blue `#008bd9` bottom-right. Lettering block spans x≈98–595, y≈109–359.
The title is built by an animation (letters assemble reversed — see t60/t66 context, not
shipped) and alternates with a BEST FIGHTERS score table and live attract gameplay.

## Explosions

MEASURED on t357 (canyon fireball, region x0–160 y310–460, pixels with V>0.55,
n=22 072, brightness percentiles): p95 `#fb9352`, p75 `#d58a1c`, p50 `#c25e02`,
p25 `#a6290f` — an orange-amber body with salmon highlights over deep red-brown.
`ab2-arcade-huge-explosion.jpg` centre samples: `#f4a200` core, `#d57946` mid.
Explosions are big (the t357 fireball is ~23%W across), boiling multi-lobe masses, not
radial gradients; debris flies as small red/white chunks (see t100 upper-left).

## Missiles / weapons visuals

ADOPTED (measured in `../afterburner/scripts/weapons/missile_2d.gd` against
`ab2-arcade-night-missiles.jpg`, reproduced independently by two agents): the smoke
trail is a **continuous opaque ribbon** — 100% column occupancy, ~16 px thick at the
head tapering to a few px, with internal VALUE structure, not an alpha fade: overall
mean V 0.37, brightest quintile V 0.594, darkest quintile V 0.219 (≈2.7× bright/dark).
MEASURED addition: the trail's TAIL ages into a chain of discrete round white puffs
(t226, t332, t120), and a launch throws large white smoke billows that briefly occlude
part of the frame (t99.75–t101).

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

Stage-1 clouds (ADOPTED #132 arcade-side measurement, HUD-verified span): banks on
screen in 68–69% of frames; banks/frame median 1, p90 5, max 6; bank width median
9.26 %W (p90 21.49), height median 6.04 %H, aspect median 0.97. Stage 1 is the only
stage with measured cloud data; stage 6 is the arcade's dense-cloud stage (unmeasured).

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
- Barrel roll: one instance measured (t221.4–222.9; frame committed); 360° continuity
  and the input trigger still need 1/60 s confirmation — see GAME_SPEC.md §1.
- Throttle speed-effect magnitude: still unmeasured (only the HUD letter state and the
  refuel-time score-accrual pause are observed).
- The 60 fps file (`ab2-longplay-60fps.mp4`, 1028×720) is the same recording as the
  686×480 map-keyed file (verified: identical scene + HUD at t84/t116, matching
  durations), so the stage map applies to both; round-3 facts were measured on it.

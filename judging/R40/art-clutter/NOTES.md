# R40 — art-clutter lane

Owns `src/render/clouds.js`, `src/render/ground.js` (+ three `light*` fields on
`STAGE_3.terrain` in `src/game/stage.js`, which only `ground.js` reads).

Brief: R39 playtest rank 5 — (a) "a cloud mass glued to the jet hides the fight",
(b) "stage-3 night city ground reads as RGB static".

Arcade side throughout: 60 Hz **consecutive** decodes of
`.reference-cache/video/ab2-longplay-60fps.mp4` over STAGE_MAP-verified spans
(stage 1 t=90–110 and t=112–120; stage 3 t=164–180), plus the only TRUE-NATIVE
stage-3 frame in the repo, `reference/ab2-arcade-night-banking.png` (320×224).

---

## (a) CLOUDS — REAL GAP, and "glued" was literally true

### The operator that settled it

`drift_rate.py`: take the cloud mask on two frames 3 ticks apart, find the
integer screen displacement maximising their overlap (FFT cross-correlation),
report it in %W per second. Model-free — it assumes nothing about approach
geometry and survives clipping, merging and growth, all of which defeated a
`1/size` growth fit on the arcade footage (arcade clouds routinely leave
sideways before they ever double in size).

**Instrument validation** (`--selftest`): recovers a planted displacement
EXACTLY at 1, 4 and 7 px/frame. A first attempt at a growth-rate operator read
12–22 % low on a synthetic control; the control itself then turned out to be
feeding native-size images through the capture path's `::3` downsample. Fixed
control → the corrected estimator reads −0.0 % error across a 7× speed range.
Both the bug and the bad control are recorded here because the *first* version
of each looked clean and plausible.

### Measured, before

| cloud-mass screen drift | p25 | p50 | p75 | frac < 10 %W/s |
|---|---|---|---|---|
| arcade t90–110 | 18.8 | **50.4** | 87.5 | 0.22 |
| arcade t112–120 | 4.7 | **51.5** | 134.5 | 0.28 |
| OURS before | 0.0 | **0.00** | 0.0 | 0.92 |

Our cloud mass did not move across the screen **at all** — median drift 0.00 %W/s,
92 % of frame pairs under 10 — while the arcade's sweeps past at a median ~50,
the same median independently on both spans.

Corroborated by two more operators, same frames:

| | centroid X (%W) | mask touches a side frame edge |
|---|---|---|
| arcade t90–110 / t112–120 | 0.33 / 0.81 | 0.49 / 0.80 |
| OURS before | **0.50** (dead centre) | **0.01** |

Arcade cloud mass lives off to the side and leaves through the side of frame.
Ours sat on the flight axis and in 20 s **never once** touched a side edge.

### Three causes, all in `clouds.js`

1. **Speed.** `CLOUD_SPEED = 9.5` world units/s against a world scrolling past
   at `stage.scrollSpeed = 68.93` — a cloud crawled at **1/7.3 the speed of the
   world it is supposed to be sitting in**. This is what picks 68.93: not that it
   is the nearest constant, but that a world-stationary object must close at the
   rate the world demonstrably flows past the camera, and it is what lands the
   drift and dwell figures in the arcade's bands.
2. **Pinned screen height.** `updateBankPositions` recomputed world Y every tick
   to hold a constant *screen fraction* (the R3 "parallax drift" fix). A pinned
   screen row is the definition of glued, and it also let a bank grow without
   bound while centred in the combat band — with the speed fix alone, still
   pinned, peak band coverage hit **0.967** against the arcade's max 0.665. World
   Y is now set once at placement and parallaxes from there.
3. **Groups on the flight axis.** Group lateral offset was ±6 uniform and 62 % of
   groups are a single bank, so most clouds came straight down the camera axis
   and grew in place.

Also: the active/cooldown force-hide is gone (banks despawn only past the
camera), and the group cadence is set from the arcade's measured **gap between
cloud events** (2.50 s / 3.66 s) rather than from a presence ratio.

### Result — clean operator, `?demo=1&nocombat=1`, 20 s at 60 Hz

`?nocombat=1` is used deliberately: it removes enemies, missile smoke and
explosions, so the measurement is immune to the other lanes editing `src/`
mid-round. (It had to be: the first pass used a full-vs-`?noclouds=1` frame diff
against a baseline captured earlier, and by then other lanes had changed the
sim — the "cloud-only" mask was marking *enemy aircraft*. Caught by cropping
the mask and looking at it. Every number from that diff was discarded.)

| combat band, rows 16–140 | BEFORE | **AFTER** | arcade (incl. its own jet + smoke) |
|---|---|---|---|
| coverage mean | 0.0794 | **0.0266** | 0.021 – 0.040 ✅ |
| coverage p50 | 0.0501 | **0.0105** | 0.005 – 0.009 ✅ |
| frames > 5 % covered | 0.501 | **0.130** | 0.081 – 0.211 ✅ |
| frames > 10 % covered | 0.263 | **0.072** | 0.073 – 0.102 ✅ (edge) |
| longest run > 10 % | 2.33 s | **1.32 s** | 0.50 – 0.72 s ⚠ |
| longest run > 5 % | 2.48 s | **1.40 s** | 0.50 – 1.52 s ✅ |
| largest-cloud width p50 | 24.4 %W | **32.5 %W** | 30.0 / 43.4 ✅ |
| largest-cloud width max | 46.2 %W | **65.9 %W** | 67.8 / 57.2 ✅ |
| centroid X | 0.50 | **0.64** | 0.33 / 0.81 ✅ |
| touches a side edge | 0.01 | **0.19** | 0.49 / 0.80 ⚠ |
| drift p50 / p90 | 0.0 / 8.1 | **0.0 / 26.2** | 50.4 / 127 ⚠ |

**Honest residual.** Coverage, dwell and size are in band and the clouds visibly
sweep now (`ours-cloudpass-60hz.png`: a bank enters, grows, and sweeps up and
out of the top-right over ~1.6 s). But the headline drift statistic is only
*partly* closed: median is still 0.00 and 64 % of pairs are under 10 %W/s
against the arcade's 22–28 %. Our clouds still spend much of their life growing
toward the camera with little translation, then translate fast at the end
(p90 moved 8.1 → 26.2). Part of that residual is instrument — the player jet is
still in the mask and anchors the correlation at zero on frames with a modest
cloud — but not all of it. **This is dented, not closed.**

Bank SIZE was re-measured rather than assumed: our banks were genuinely smaller
on screen than the arcade's (p50 20.6 vs 30.0) after the motion fix, so
`BANK_BASE`/`BANK_JITTER` were scaled ×1.45 = 30.0/20.6 exactly, which restored
the arcade's big flanking passes (two masses either side of the jet with a clear
gap between them — that is what "frame the fight" looks like, see
`arc_peak` frames) without moving coverage out of band.

### Cross-lane finding — NOT MINE, handing it over

With clouds off entirely, our bright-white-mass coverage of the combat band is
still **0.069 mean**, against the **arcade's entire total of 0.021–0.040**. The
decomposition over the same 20 s of `?demo=1`:

| contributor | coverage mean |
|---|---|
| jet alone (`nocombat` + `noclouds`) | 0.011 |
| **combat smoke** (missile trails + kill smoke) | **0.058** |
| clouds (after this lane's fix) | 0.027 |

**Our missile/kill smoke alone exceeds the arcade's whole white-mass budget.**
The R39 playtest's "cloud mass glued to the jet" screenshot may well be partly
*smoke*, not cloud — `judging/R39/playtest-evidence/s3b-t51-cloud-glued-to-jet.png`
shows a mass with a scalloped billow right behind the jet. This belongs to the
missile-smoke lane (`src/effects/**`), not here. Evidence:
`validate-nocloud-floor.png` (magenta = what reads as a white mass with clouds
disabled — the big slab top-left and the chain of ellipses are smoke).

### Ask of the game-flow lane (one line, not reached into)

`clouds.update(dt)` in `game.js:773` now accepts an optional second argument
`worldSpeed`. Passing `this.flow.scrollSpeed` makes clouds respond to the
throttle the way the ground already does. Defaults to the 68.93 constant, so
nothing breaks without it.

---

## (b) NIGHT GROUND — MOSTLY A FALSE GAP; one real, narrow defect

Measured on the true-native arcade frame only (the t175/t186 pair and the
longplay are 3.2125× upscales, which smear a 1-px light across 3 px and would
inflate density, component size and every count here — R11 §2.3).

**A band error nearly became a shipped "fix".** The first comparison used rows
150–196, and on the arcade's *banked* frame that band includes the dark wedge
**above** the horizon on the left. It reported the arcade with 0.125 of 10×10
cells fully dark against our 0.045 — a clean, plausible, stable number that was
purely my own window. On a band wholly below the horizon (rows 176–196) both
sides read **0.000**. Cropped and looked before publishing, per the house rule.

### On a valid band (rows 176–196, cols 20–300)

| | density | white share | comp p50 / p90 | **dispersion** |
|---|---|---|---|---|
| ARCADE native | 0.138 | 0.614 | 1.0 / 3.0 | **2.59** |
| OURS before | 0.127 – 0.130 | 0.584 – 0.593 | 1.0 / 2–3 | **1.14 – 1.48** |

Density (within 8 %), colour mix (within 5 %) and speck size (identical) were
**already in band**. The arcade's own night ground *is* a dense multi-coloured
speckle field — the playtest agent reading six small strip panels as "RGB
static" would read the arcade the same way. So most of this gap is false, and it
is the sixth false gap this project has caught by measuring.

What *was* wrong is the one thing the brief predicted: **arrangement**. Index of
dispersion (variance/mean of light counts over 10×10 native blocks) is 1.0 for a
uniform random field. Ours read 1.14–1.48 — our city was statistically
indistinguishable from white noise. The arcade's 2.59 is a clumped field: lit
towns with darker country between.

### Fix and result

`uLightClump` modulates the per-cell light probability by a smooth low-frequency
"town" field, symmetric about 1.0 so the already-in-band **mean density is
preserved by construction** and only its variance moves. First attempt used a
town scale of 6.0/26.0 world units — far coarser than the measurement band, so
whole frames fell inside one town and the *mean* density swung (0.086–0.132)
instead of the variance; rescaled to 0.8/2.0, a few block-widths.

Arcade band established from six disjoint sub-bands of the native frame (one
frame cannot support a tighter claim): **density 0.095–0.195, dispersion
1.57–3.01, median 2.39.**

| | density | dispersion |
|---|---|---|
| arcade band | 0.095 – 0.195 | 1.57 – 3.01 |
| OURS before | 0.127 – 0.130 | **1.14 – 1.48** (below band) |
| OURS after (8 frames) | 0.118 – 0.136 ✅ | **1.38 – 2.81, mean 1.99** ✅ in band |

Inside the band → CLOSED, no further tuning. Visual: `night-before-after-vs-arcade.png`.

### One lead not chased

In an air-refuel-state frame our lights smeared into long dashes (component p90
11 px vs the arcade's 3). That pose is rare and the mechanism is the fixed
anisotropic `lightCell`/`lightCellZ` ratio, which is only correct at one depth.
Not fixed, not measured further — logged so it is not lost.

---

## No gameplay change — verified, not argued

`combat_probe --ticks 900 --url-params "demo=1&seed=7"` (15 sim-seconds, 150
sampled states; the trace is live combat — max 5 enemies alive, 6 hits, 9 vulcan
rounds, enemy fire and a lock) run against HEAD versions of all three files and
against mine: **byte-identical output**. The diff is render-only.

## Files

- `measure_cloud_cover.py`, `cover.py` — cloud coverage of the combat band
- `cloud_only.py` — exact cloud-only diff (**superseded**, stale-baseline trap above)
- `drift_rate.py` — screen-drift operator (`--selftest`)
- `approach_rate.py` — growth-rate operator (abandoned on arcade footage; kept with its synthetic control)
- `night_lights.py` — night city-light density / colour / size / clustering
- `validate-cloudmask2.png`, `validate-nocloud-floor.png`, `validate-diff.png` — instrument validation crops
- `night-before-after-vs-arcade.png`, `ours-cloudpass-60hz.png`, `arcade-s1-sheet.png` — looks

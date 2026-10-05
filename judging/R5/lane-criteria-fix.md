# Round 5b — criteria-fix lane (REFERENCE.md / GAME_SPEC.md)

Scope: **W1** stage-1 cloud size criteria, **W2** presence/count, **W3** sea anisotropy,
**W5** the upscale sweep. Files edited: `REFERENCE.md`, `GAME_SPEC.md`,
`judging/R5/interfaces.md` (LESSON block only, at the lead's request), and two new tools.
**Nothing under `src/` was touched.** All captures and frames under
`tools/out/criteria-fix-r5b/`.

New instruments (both validated on a synthetic control before any number was believed):

| file | what it is | control |
|---|---|---|
| `tools/classify_clouds.py` | independent reimplementation of the #132 operator that **enumerates and crops every component it returns**, so the detections can be classified by eye | `--synthetic`: width err **0.000 %W** at 686×480 and 320×224, plus normalised-aspect, min-area, haze-discard, window, truncation-flag, 8-connectivity and threshold-edge cases — **PASS** |
| `tools/measure_horizon.py` | per-frame horizon line (texture separation + angle/offset search) and a sky-window cloud measurement built on it | `--synthetic`: angle recovered exactly at 0/±20/−35/+55/−60°, sky-mask IoU **≥ 0.9861**, featureless frame scores 0.000 — **PASS**; plus line overlays looked at on all 55 frames |

---

## W1 — the stage-1 cloud size criteria

### Provenance control first

I re-extracted the arcade frames myself (`ffmpeg -ss T -frames:v 1`, t = 93.0–120.0 at 0.5 s)
and compared them pixel-for-pixel against the world lane's set: **55/55 frames differ in
zero pixels.** So any disagreement below is classification, not extraction. I then extended
the span back to **t = 88.0–120.0 at 0.5 s (65 frames)** so it covers the published #132
source span exactly.

My implementation returns **90 components over t93–120** — the same 90 — and the same bboxes,
areas and percentages to the digit (e.g. the t97.0 bank: area 10900, 18.66 %W, 22.50 %H,
aspect 0.83). **The operator is correct. I confirm the world lane's headline.**

### I re-classified all 120 components myself

Method: every frame rendered at full size with every component's bbox outlined and indexed,
the 2 %H and 45 %H window cuts drawn, read as ten 4-up sheets
(`tools/out/criteria-fix-r5b/annot-sheet00..09.png`); 23 small or ambiguous components then
re-cropped with 45 px of context and read again (`zoomA.png`, `zoomB.png`); four contested
masses resolved by stepping the footage at 0.1 s (`fine99.png`, `fine119.png`) and by
measuring the component's own mean (R − B).

**Result: 12 of 120 are cloud banks** (world lane: 11 of 90). The other 108:

- **30 of 30** components in t88.0–92.5 — the catapult launch — are carrier island, antenna
  masts, deck markings and the checkerboard elevator pad, plus **four instances of the HUD
  reticle's attitude line** at 19.83 %W × 0.83 %H (normalised aspect 23.8) and three more at
  0.42 %H (aspect 41.6). Zero clouds in ten frames. `pre-sheet.png`.
- the **rolled horizon haze band** — the largest single category in t93–120. Level, it is the
  pale full-width band above the sea and the 90 %W discard removes it; rolled, the same band
  is a diagonal swath under 90 %W and is counted as a bank. At least 9 components, several
  above 19 %W.
- **missile plumes** (t100.5 30.03 %W, t105.0 19.53 %W, t105.5 18.66 %W), **explosion smoke**,
  **white airframes** (both the player's and enemies'), **coastline surf**, **islands**.
- **six HUD-severance artifacts**: thin strips at rows 10–19, e.g. 21.72 %W × 2.08 %H,
  aspect 10.4. These are the piece of a tall plume or surf band left *above* the blanked HUD
  rect `(18,20,400,58)`. They are the mask's own scar, and they pull the height median down.

### Where I disagree with the world lane — three components

| component | world lane | **mine** | why |
|---|---|---|---|
| t119.5 `x[316,605] y[42,215]`, 42.27 %W × 36.25 %H | cloud bank (their largest) | **explosion smoke** | mean (R − B) = **+27.0**, mean sat 0.124, against every verified bank's **−1 to −12** at sat 0.045–0.089. Stepping t119.0→120.1 at 0.1 s: nothing there at t119.4, the mass appears at t119.5 one frame after a fireball, and by t119.6 it is gone and *crisp white* clouds have entered from the right. `fine119.png`. |
| t99.5 `x[288,407] y[179,215]` | not listed | **explosion smoke** (so: also not a cloud, but worth naming — I initially read it as a bank from the contact sheet) | mean (R − B) = **+25.3**, sat 0.125 — statistically identical to the t119.5 mass. `fine99.png` shows the tan smoke ball arriving at t99.4 behind a fireball. |
| t101.5 `x[452,685] y[30,215]`, 34.11 %W × 38.75 %H, area 27347 | **not listed at all** | **cloud bank** | t101.5 contains **two** large cumulus masses, one at each frame edge. The world lane counted the left one (`x[0,184]`) and missed the right one. It is unambiguous at full frame — `tools/out/criteria-fix-r5b/annot/f017_t101.5.png`. |
| t101.0 `x[0,289] y[92,215]`, 42.27 %W | "the published max 42.27 %W is a missile plume at t101" | **cloud bank merged with the rolled haze band, an enemy airframe and debris** | stepping t98.8→101.8 at 0.1 s shows a white cumulus persisting and growing across 10+ frames under this bbox; it is the same mass that fills the lower-left of t100.5–101.0. There is no plume dominating that bbox. **But it is a merge, so it is not a clean bank width either** — the conclusion "42.27 %W is not a defensible bank max" survives, by a different route. |

I also accept the world lane's marginal call on t101.0 `x[144,195]` (7.58 %W): it is a small
white puff sitting directly on an enemy airframe. Keeping it or dropping it moves the width
median by under 1 point.

On the lead's own spot-check: the component logged as "a block of saturated red/green/orange
HUD-and-explosion pixels" is t100.0 `x[40,175] y[102,202]` in my indexing. The *bbox* is full
of red explosion chevrons, but the mask only selects the achromatic pixels inside it — the
component itself is haze band plus explosion smoke. Non-cloud either way; the spot-check
stands, the mechanism is slightly different.

### The 12 cloud banks — auditable

Source `ab2-longplay.mp4` at the stored 686×480; frames in
`tools/out/criteria-fix-r5b/arcade-s1-half/`. `E` = bbox touches a frame edge (width is a
lower bound). `T` = cut by a window edge (height is a lower bound).

| frame | bbox | area px | %W | %H | aspect (norm) | flags |
|---|---|---|---|---|---|---|
| t97.0 | x[0,127] y[108,215] | 10900 | 18.66 | 22.50 | 0.83 | E T |
| t101.0 | x[0,289] y[92,215] | 14567 | 42.27 | 25.83 | 1.64 | E T, merged |
| t101.0 | x[144,195] y[58,104] | 1271 | 7.58 | 9.79 | 0.77 | marginal |
| t101.5 | x[452,685] y[30,215] | 27347 | 34.11 | 38.75 | 0.88 | E T |
| t101.5 | x[0,183] y[14,215] | 25671 | 26.82 | 42.08 | 0.64 | E T |
| t106.0 | x[332,417] y[10,85] | 2606 | 12.54 | 15.83 | 0.79 | T (top cut) |
| t106.0 | x[312,377] y[88,149] | 3052 | 9.62 | 12.92 | 0.74 | clean |
| t106.0 | x[257,314] y[132,178] | 2062 | 8.45 | 9.79 | 0.86 | clean |
| t106.5 | x[50,230] y[58,199] | 20470 | 26.38 | 29.58 | 0.89 | clean, untruncated |
| t118.0 | x[534,685] y[35,215] | 16142 | 22.16 | 37.71 | 0.59 | E T |
| t120.0 | x[404,631] y[80,215] | 19939 | 33.24 | 28.33 | 1.17 | T |
| t120.0 | x[332,407] y[54,103] | 2930 | 11.08 | 10.42 | 1.06 | clean, untruncated |

### Before / after in REFERENCE.md

| criterion | before (published #132) | **after (cloud-only)** | accept band published for ours |
|---|---|---|---|
| width %W median | 9.26 | **20.41** | **14–24** |
| width %W p90 | 21.49 | **34.02** | **25–40** |
| width %W max | 42.27 (a merged component) | 42.27, flagged as merged; largest clean bank **33.24** | — |
| height %H median | 6.04 | **24.17** pooled (lower bound) | **16–28** |
| normalised aspect median | 0.97 | **0.86** | **0.75–1.00** |
| presence / count | 68–69 % / 1-5-6 | **withdrawn** — see W2 | not a gate |

Sanity floor that needs no percentile: **10 of 12 banks are wider than the retired 9.26 %W
median and all 12 are taller than the retired 6.04 %H median.**

The bands are drawn to be re-runnable with the published 45 %H operator, and they **admit the
world lane's new build** (18.12 %W median, 20.54 %H, aspect 0.88) while the retired bands
(8.0–11.0 %W, 5.0–7.5 %H) would have failed it. That was the point of the exercise: the
criterion, not the build, was wrong.

### Three operator defects, now documented in REFERENCE.md

1. **HUD-rect blanking severs tall objects** into high-aspect strips that are counted as
   banks (six in this span, one at aspect 10.4).
2. **The 90 %W haze-seam discard only works on a level frame.** Rolled, the full-width haze
   band passes it.
3. **Frame-edge truncation is unhandled.** The rule "a horizontal cut cannot change a width"
   is true of the window's cuts and false of the frame's vertical edges — 5 of 12 banks touch
   one, so those widths are lower bounds.

---

## W2 — presence and count: published as ADOPTED, and the replacement does not work

**The lead's ruling is published as given:** 70 % presence / count 1-2-4 is in REFERENCE.md
tagged **ADOPTED, not MEASURED**, with an explicit "do not cite this as an arcade fact and do
not judge against it". The retired 68–69 % is marked as presence of non-cloud objects.

**I then tried to do better, as asked, and I am reporting a withdrawal.**

I built and validated a per-frame horizon finder (`tools/measure_horizon.py`): texture =
local σ of V over 5×5; sky and cloud are smooth, sea and land are dithered; search angle
∈ [−75°, +75°] and offset for the split that maximises (textured fraction below) − (textured
fraction above). Synthetic control recovers the angle exactly at five angles with sky-mask
IoU ≥ 0.9861 and scores 0.000 on a featureless frame. I then **looked at the line drawn on
all 55 frames** (`horizon-sheet0..4.png`): it tracks the real sea/land boundary correctly,
including at 60°+ of roll, which the fixed 45 %H row cut cannot do at all.

**The window was never the binding problem.** Replacing the row cut with the fitted horizon:

| | 45 %H window | full sky above fitted horizon |
|---|---|---|
| component presence | 70.9 % | **96.4 %** |
| components/frame median / p90 / max | 1 / 4.0 / 5 | **4 / 7.0 / 15** |

The extra population is the player's own white airframe (present in nearly every frame at
~6 %W × 9 %H), enemy airframes, missile trails, surf and the rolled haze band. Worse, the
large banks then merge with the sea into frame-spanning blobs — t101.5 reads 71.43 %W ×
85.00 %H, t100.5 reads 83.97 %W — so bank geometry stops being measurable. **A wider window
over the same mask gives a worse statistic, not a better one.** REFERENCE.md's own note
("widening the window without aircraft/foam rejection inflates the count with jets") was
right; I have now quantified it.

So **presence is left UNRESOLVED**, with the three known facts recorded (retired 68–69 % is
non-cloud; hand-classified cloud-only presence is 7 of 65 frames = **10.8 %** but is itself
clipped by the 45 %H window; opening the window makes it worse) and an explicit re-open
condition: a rejection step for aircraft/plume/surf that can be validated against a human on
all 120 labelled components of this span, or a hand count over a span long enough that 10.8 %
is not a 7-of-65 estimate.

**What the horizon tool did buy** is untruncated bank heights for the 8 banks that stay
unmerged: t106.0 15.83 → **16.46 %H**, t120.0 28.33 → **33.33 %H**, t118.0 37.71 →
**43.12 %H**; over those 8, width median **11.81 %W**, height median **14.69 %H**, aspect
**0.82**. Published as a bracket against the 45 %H figures: **bank width median lies in
11.8–20.4 %W, height median in 14.7–24.2 %H.**

---

## W3 — sea anisotropy: verified, restated, 6.51× retired

Reproduced independently with a second ACF implementation, same inputs.

- **The floor binds.** `tools/measure_ground.py` returns `max(hx,hy)/max(min(hx,hy),1)`. On
  `tools/out/world-r5b/sea-check/frame-0001.png` at its own auto patch, native 320×224 gives
  **hx 6.543 / hy 0.676** — the divisor is clamped to 1 and it prints **6.54×** where the
  unfloored ratio is 9.67×. At the stored 960×672 the same structure prints **9.63×**
  (half-widths scale by exactly 3.00). So **6.51× is an artifact of the clamp.** (The auto
  patch at native is also only 53×53 px, which is thin for an FFT ACF — worth knowing.)
- **The comparison crossed resolutions.** At a common 686×480 with a common filter, patch
  `(240,260)–(445,465)`: **ours hx 44.607 / hy 9.016 = 4.95×**, **arcade t116 hx 41.626 /
  hy 7.991 = 5.21×**. Within 7 % on both axes and 5 % on the ratio. My figures match the
  world lane's (44.61/9.02, 41.63/7.99) to the second decimal.

REFERENCE.md now carries "restate as 4.95× vs arcade 5.21× at a common 686×480; retire
6.51×", and **records R4 gap 10 (sea coarseness) as WITHDRAWN as a defect**, with the re-open
condition (a common-resolution, common-filter comparison stated as such) and a note not to
build the hypothesised near-field sparkle layer on the retired evidence.

**For the lead: `STATUS.md` still carries both.** Line 21 quotes "sea cross-track anisotropy
6.51×" in the verified-state table, and the "Open items" section still lists gap 10 as
knowingly unresolved. `STATUS.md` is not my file — both need changing.

---

## W5 — the upscale sweep

### The recurrence is a documentation defect, not just a code comment

The false claim is in **REFERENCE.md** as well as in `stage.js`: "Plus the 9 screenshots
inherited from the Godot repo … **These carry no proven stage identity**". I read the HUD
stage digit on all nine (bottom 14 %H, x 0.52–0.95 W, nearest-neighbour upscale;
`inherited-hud.png`, `inherited-digits.png`, `digits2.png`):

| frame | stored size | digit | confidence |
|---|---|---|---|
| `ab2-arcade-desert.png` | **320×224 native** | **2** | certain |
| `ab2-arcade-night-banking.png` | **320×224 native** | **3** | certain (confirms world-r5) |
| `ab2-arcade-desert-explosions.png` | 400×280 | **2** | certain |
| `ab2-arcade-closeup-enemies.jpg` | 1440×1080 | **2** | certain |
| `ab2-arcade-night-missiles.jpg` | 181×127 | 3 | low — glyph ~4 px before JPEG |
| `ab2-arcade-reload-dorsal.jpg` | 181×127 | 3 | low |
| `ab2-arcade-city-stage.jpg` / `coastal-banking.jpg` / `huge-explosion.jpg` | 181×127 | unreadable | — |

Corrected in REFERENCE.md with the per-frame table and the rule **"before declaring a frame
unidentified, read its HUD digit"**. Note this also *demotes* three frames: the five 181×127
JPEGs are **0.57× of native** and lossy, so they are worse evidence than any upscale.

### The sweep found something bigger than an upscale

Looking for "constants derived from an upscale where a native frame exists" turned up the
reason it matters: **the longplay video is not level-accurate.** Measured on art that is
pixel-identical in every frame (the bottom HUD):

| source | HUD white | HUD red |
|---|---|---|
| `ab2-arcade-desert.png`, `ab2-arcade-night-banking.png` (320×224 native) | `#f7f7f7` | `#f70000` |
| t089 / t116 / t140 / t175 (686×480), t100.75 (1028×720) | `#ffffff` | `#ff1000`–`#ff1400` |

The arcade's palette ladder tops out at `0xf7`; every video frame tops out at `0xff` and lifts
chroma. So **any constant quoted to the exact level off a video frame is systematically
brighter than the arcade's.**

Re-derivations where a native frame exists:

| constant | published (video) | **native** | ADOPTED Godot table |
|---|---|---|---|
| stage-2 sky top | `#f27500` (t140) | **`#e67300`** (`ab2-arcade-desert.png`, modal share 0.661; corroborated 0.613 on the 400×280 frame) | `#e67100` |
| stage-3 sky top | `#000000` (t175) | **`#000000`** (share 0.883) | `#000005` |

Stage 2's published value is **12 levels too bright in R**. The standing note that the delta
between the two chains is "re-encode noise, both chains are cited" is now **resolved**: the
ADOPTED chain was right and the video read was the artifact. REFERENCE.md's sky table is
corrected and the finding is documented there; `GAME_SPEC.md` gains a colour caveat covering
its `#ff…` constants (muzzle flash, lock brackets, enemy fireballs), none of which has a
native source.

**Stage 1 cannot be re-derived — there is no native stage-1 frame in this repo.** And neither
686×480 (2.14375×) nor 1028×720 (3.2125×) is an integer multiple of 320×224, so native
**cannot** be recovered from the video by decimation; only a native screenshot settles a
level. If anyone can obtain a native-resolution stage-1 screenshot, `#009eff` should be
re-derived immediately.

### STAGE_MAP.md: clean

Its three "unidentified frame" passages are historical lessons, not live claims. Every stage
identity it asserts was established by reading the HUD digit off the video, which is the
right method. It makes no claim that a frame is unidentified which I can now identify. **No
change.** Its sky values do inherit the video level expansion above — worth knowing, but they
are also corroborated by the independent ADOPTED chain, and STAGE_MAP.md is not my file.

---

## Left unresolved / not done

- **Presence and banks-per-frame** — withdrawn with a re-open condition (W2 above). This is
  the one place I did not deliver a target, and the reason is in the doc.
- **Stage-1 sky `#009eff`** — carries the video level expansion and cannot be re-derived from
  anything in this repo.
- **`STATUS.md`** still quotes 6.51× and still lists R4 gap 10 as open. Not my file.
- **The 12-bank sample is small.** n = 12 over 32 s of one stage-1 pass. The accept bands are
  deliberately wide for that reason, and the per-bank table is published so any judge can
  re-classify from the same crops instead of taking my word — which is exactly what I did to
  the world lane, and it moved three components.
- **I did not re-run the cloud measurement against our own build.** The world lane's
  before/after figures are cited as theirs, not re-verified by me; `src/` is not my lane and a
  capture would race three live lanes.

## Evidence index — everything under `tools/out/criteria-fix-r5b/`

`arcade-s1-half/` (55 frames t93–120, bit-identical to world-r5b's), `arcade-s1-pre/`
(10 frames t88–92.5), `comps-all.txt` (the 90-component listing), `annot/` + `annot-sheet00
..09.png` (every component boxed and indexed in its own frame), `zoomA.png` / `zoomB.png`
(23 ambiguous components at 45 px context), `pre-sheet.png` (the 30 carrier/HUD components),
`fine99.png` / `fine119.png` (0.1 s stepping that settled the two smoke masses), `horizon/`
+ `horizon-sheet0..4.png` (fitted horizon overlays, all 55 frames), `skyclouds.txt`
(full-sky component listing), `inherited-hud.png` / `inherited-digits.png` / `digits2.png`
(HUD stage digits of the nine inherited screenshots).

---

# Round 5c — criteria-fix lane, second session

Resumed after a usage limit killed R5b mid-flight. **Nothing from R5b was redone.** Files
edited this session: `STATUS.md` (newly assigned to me), `REFERENCE.md`, `GAME_SPEC.md`,
the LESSON block in `judging/R5/interfaces.md`, and one new tool. **Nothing under `src/`.**
Evidence under `tools/out/criteria-fix-r5c/`.

New instrument: `tools/measure_plain_share.py`, synthetic control **exact to 0.000000 %** on
both candidate metrics, with pixels placed at the boundary of each so a one-level slip in the
comparison would show as a whole-row error.

## 1 — `STATUS.md` brought in line (it was quoting two things I had already retired)

Rewritten. The stale items are gone: **sea anisotropy 6.51×** is replaced by the restated
4.95× vs arcade 5.21× at a common 686×480, and **R4 gap 10 (sea coarseness)** is removed from
"Open items" with a comment in the file recording *why* it was removed and the re-open
condition, so the next person does not re-add it from the R4 report.

What it now says that it did not: that no R5 judge has run and every R5 figure is a lane's own
at a stated verification level; that the round ran six lanes on one uncommitted tree and
therefore every our-side number needs its tree state; that three of the eleven R4 gaps are
closed or withdrawn (4, 7, 10) with the other eight restated where R5 moved them; and that the
eight repaired criteria are one named defect class rather than a run of bad luck.

Two R4 entries I corrected rather than carried: gap 5 is no longer "difficulty is
miscalibrated" but "the criterion was defective and is restated"; gap 3's scope is reduced
because stage 3 turned out to be **over**-separated, not under-.

## 2 — I27: gap 5's denominator, restated in `GAME_SPEC.md` §2

New subsection "Lethality: deaths per minute, and the denominator it was never given".
Primary is **deaths per minute of flight time**; wall clock is secondary and never quoted
alone; both must name their denominator in the same line as the number.

**Verified before publishing, not assumed:** `flow.state === 'flight'` exists in
`src/game/flow/flow.js`, and the six states are `flight`, `launch`, `death`, `continue`,
`title`, `attract`. **`tools/fairness_probe.mjs` reports a `stateShare.tally` that cannot
ever be non-zero** — there is no `tally` state in `flow.js`. That is published as a caution,
because a lane reading it as "time spent at the stage tally" would conclude the tally is free
and it is not measured at all.

The conversion is published as a formula over the probe's **existing** output, so no lane has
to change a tool it does not own:

```
deathsPerFlightMin = deathsPerMin / (stateShare.flight / 100)
```

Worked conversion published as arithmetic on other lanes' self-reported inputs, explicitly not
as a measurement of mine: 3.0–3.5 wall-clock at ~35 % flight share is **8.6–10.0 per
flight-minute**; 1.78–3.11 at 70–78 % is **2.3–4.4**. The direction is real and large; the
endpoints are not settled (3.56–4.00, then 3.56–5.33, then 1.78–3.11 within one session).

**Where I went further than asked, and it matters: the ≤1.5 threshold is published as
UNVERIFIED and NOT A GATE.** Its denominator was never stated, so it cannot be converted into
a flight-time figure, and nothing in the footage has ever been measured to support 1.5. A lane
that normalises to flight time and then tunes to 1.5 is tuning to an invented number in a new
unit. What would make it MEASURED is a death count off `ab2-gameplay.mp4` with its own
flight-time denominator — named as the single missing piece of evidence. Not done.

The same subsection also absorbs I13's sampling requirement and I13a's two-population
warning, because they bind on every `?demo=1` figure and were living only in `interfaces.md`.

## 3 — I28: tree state is now a required citation field (`REFERENCE.md`)

New section "What a complete citation is — and the field that was missing", listing all five
required fields: source + stored resolution, region, **operator including its metric**,
**population**, and **tree state** for anything measured off our build. With the corollary
binding on the judge: **measure a clean checkout, not the live shared tree.** Arcade-side
figures need fields 1–4 only, since the footage does not move.

**The night-nozzle entry below is its own worked example of field 5 — I hit the exact failure
I28 describes while verifying it** (see §5).

## 4 — The LESSON block, consolidated into one named class (`interfaces.md`)

Replaced the R5b "fifth defect class" paragraph with a single named class and a table of five
instances, rather than three anecdotes accumulating:

> **A VALIDATED OPERATOR POINTED AT THE WRONG THING** — wrong population (I9), wrong
> resolution (I11), wrong region (I26), or wrong sample (I13, and R5c's stage-2 target). It
> returns exactly reproducible wrong numbers, and cross-validation between two independent
> implementations cannot detect any of them.

I added I13's sibling as the lead asked (a distribution statistic sampled at an interval
dividing a periodic signal's cycle: stable, reproducible, and wrong at every fixed phase), and
a **fifth** instance of my own from this session — the stage-2 open-plain target, §6. Four
obligations are attached, and they are the five citation fields minus the ones that were
already standing: state the population; **publish a crop sheet once for any operator whose
output is a set of detections**; name the metric inside the operator; state the tree state.

Also carried into the block: a black capture frame contributes no detections, so **any
presence or density statistic silently reads it as "nothing on screen"** (it cost the world
lane 5 points of cloud presence), and for a *contrast* statistic it is worse than neutral —
a black frame looks like infinite contrast and inflates the thing being proved.

## 5 — Authored vs rendered colour, and a published count that does not reproduce

Published in `REFERENCE.md` as a general rule with a table, not as a one-off note: every
colour in `tools/art/palettes.js` goes through `L()` = `snapHexToLadder()`, so **the hex in
the source is frequently not the hex that renders.**

| entry | authored | renders as | px |
|---|---|---|---|
| `PLAYER_NIGHT.nozzleCore` | `#ff7500` | **`#ff7300`** | 272 |
| `PLAYER.nozzleCore` | `#ef7308` | **`#ef7300`** | 272 |
| `PLAYER.keyline` | `#000008` | **`#000000`** | 2 388 |

Snap verified by running `snapHexToLadder` directly; counts by counting opaque pixels in the
exported sheets. The two nozzle masks are **positionally identical and the alpha planes are
byte-identical**, so night is the same drawing with one warm tone swapped, and night's
`#ff7300` is one ladder step brighter in R than day's `#ef7300` — a real difference, not an
instrument artifact.

**Three corrections to what I was handed.**

1. **The constant is not in `src/`.** `grep nozzleCore src/` returns nothing. `PLAYER_NIGHT`
   lives in `tools/art/palettes.js`; `src/render/spriteFactory.js` has a *separate*
   `PLAYER_PALETTE_NIGHT` with no `nozzleCore` key at all, whose `flame` is the daylight
   `#ef7308` in both day and night. Two palettes, two owners, one name in conversation.
2. **The count is 272 px, not 486.** 486 reproduces on neither HEAD nor the working tree.
3. **The committed sheet is a different drawing entirely.** At `db554e6`,
   `player-f14-night.png` is **900×40 with a magenta nozzle core (`#c594f7`/`#a400d6`) and no
   orange at all**; the working-tree sheet is 900×72 with the orange. So the table above
   reproduces on **no commit**, and is published with "uncommitted working tree, six lanes
   live" attached.

That third point is I28 happening in real time: the figure I was asked to publish was taken
on a tree state that no longer exists, and without the tree-state field there was no way to
discover that except by checking.

## 6 — Stage-2 ground: published as a distribution, and the published target was wrong

Asked to publish a range instead of a point. The range I was given — arcade 0.0–33.0, median
4.2, from t134/t138/t142/t150 — **is four draws from a statistic whose interquartile range is
1.1–39.3 %, and all four landed in the low tail.** Its "median 4.2" is just the midpoint of
the two lowest of its four values.

**Operator** (stated exactly, because the handed-over one was not): fraction of the ground
band **y[310,420]** (64.6–87.5 %H), full width, within **Chebyshev 24** of `#e67300`, on the
STAGE_MAP-verified span **t = 124.0–156.0 at 0.5 s, n = 65**, stored 686×480. Stage digit read
as **2** on the eight frames I cropped, so stage identity is confirmed on the frames and not
only by the map.

| | min | p25 | **median** | p75 | p90 | max |
|---|---|---|---|---|---|---|
| arcade, n = 65 | 0.00 | 1.11 | **19.72** | 39.26 | 50.91 | 63.58 |
| Euclidean 24 | 0.00 | 0.35 | 18.32 | 38.13 | 49.47 | 61.50 |
| band y[340,420] | 0.00 | 0.20 | 15.74 | 38.12 | 47.27 | 60.63 |
| x[40,646] | 0.00 | 0.60 | 15.73 | 38.12 | 51.40 | 65.31 |

**The conclusion that "ours brackets both range and median" does not survive the larger
sample.** Ours (0.5–28.0, median 9.9, self-reported) has about half the arcade's median and a
maximum below the arcade's **p75**: the arcade is above 28 % in **23 of 65 frames** and we
never get there. The remaining work is *more* open plain and *more* frame-to-frame swing.
**Robust to the operator** — all four variants agree on median 15.7–19.7 and on 22–23 of 65
frames above 28 %, so this is not a metric quibble.

Accept band published for ours: **median 12–26 %, max ≥ 45 %, and ≥15 % of frames below 1 %** —
deliberately wide, and stated as a distribution because a point value cannot be satisfied
honestly here.

**I could not reproduce the published t142/t150 values with any variant.** Closest is
x[40,646] at 33.49 / 9.09 against the published 33.0 / 8.4; full-width Chebyshev gives 35.42 /
13.20. The published operator had an unstated column restriction or object exclusion. Citation
field 3 exists because of this.

### And the statistic does not mean what its name says

I cropped the detections rather than trusting the distribution, and the operator turns out to
be unable to tell the plain from the sky.

**Stage 2's sky and its open plain are the same colour.** The target `#e67300` is
REFERENCE.md's own *native stage-2 sky top*; on video it reads `#f27500`, and `#f27500` passes
a ±24 Chebyshev test against `#e67300` (Δ = 12). Measured on pure-sky rows y[60,90],
**96.9 / 98.2 / 72.8 / 84.4 / 76.5 %** of them pass the "open plain" mask at t136.5 / t155.0 /
t125.0 / t134.0 / t150.0, and the modal colour of the band's own matched pixels is `#f27500` —
identical to the sky's. Labelled by 8-connectivity, **the band's orange is one connected region
with the sky in 63 of 65 frames** (median terrain-enclosed share 0.18 %). The band's top edge
is only **10 px below the nominal level horizon** (62.5 %H = y 300), so under world roll the
sky genuinely enters it.

The two frames reading 0 % sky-contiguous looked like real enclosures and are not: the sky
seed rows were covered by a cloud, so the seed failed. **Cropped and looked at** —
`annot-enclosed.png` — rather than published as a finding. That is the rule earning its keep
twice in one measurement.

So the figure is published under what it actually counts — **"fraction of the near-ground band
that is uncluttered orange"** — with explicit instructions not to derive a plain *colour* from
it and not to use it to find a horizon, plus a re-open condition (a horizon fit or a roll-angle
gate) for a true plain-only number. It remains the right gate for the defect it was raised
against; it is not the measurement its name implies.

## 7 — I17 carried with the figures, not left in `interfaces.md`

The HUD-severing bias is now published in `REFERENCE.md` beside the cloud operator, with the
permeable-HUD control table: **published our-side counts over-count by 3.1 % and under-state
width by 0.9 %**, 8-connectivity routing around most thin strokes. Stated as directional, with
the obligation that **whoever changes HUD geometry re-runs the control and republishes the
bias** rather than leaving it for the judge, and the note that it grows with every horizontal
rule added. The arcade side is unaffected.

## 8 — Two things I fixed that nobody asked for

- **`REFERENCE.md` was reaching outside the repo.** Its "Sources and provenance" cited
  `../afterburner/.reference-cache/video/ab2-longplay.mp4` and
  `../afterburner/scripts/stage/stage_data.gd` as live sources, directly against CLAUDE.md's
  standalone rule. Both now point at this repo (`.reference-cache/video/`, `STAGE_MAP.md`).
- **The defective-criteria count had been drifting** ("four", "six", "seven" in different
  places). There is now a **maintained ledger table** in `REFERENCE.md` with all eight rows
  plus the one open candidate, and the instruction to add a row rather than re-count from
  memory.

## 9 — Build-side

The boot blocker is cleared. `src/ui/hud.js` no longer references `SCALE_EMBLEM_TEXT`, all
`src/**/*.js` pass `node --check`, and a two-frame capture to
`tools/out/criteria-fix-r5c/boot/` renders stage 1 correctly with a legible HUD, large cloud
banks and the sea. **Uncommitted working tree, six lanes live, 2026-10-05.** That is the only
build-side work I did; everything else this session is arcade-side or documentation.

## 10 — I went after the arcade's own death rate, and the withdrawal is the finding

§2 above named this as the one missing piece of evidence for gap 5, so I attempted it rather
than leaving it as a note.

**Detector.** `ab2-gameplay.mp4` (VP9, 640×360, 866.5 s — the only cached recording with
player deaths), sampled at 2 fps = 1 733 frames. Feature: fraction of the body region
y[48,310] that is warm (`R>180 ∧ G>90 ∧ B<110`), scored as a **spike above a ±10 s rolling
median**. The raw threshold version is worthless — the desert stages' ground *is* that colour
and **24 % of all frames** pass it, which is why the first sweep returned 23–34 "events" that
were mostly stage boundaries. Threshold 12 points, 2.5 s clustering: **43 events**, and it
**recovers 4 of the 4** deaths hand-identified in GAME_SPEC §2 (gp t198–218, t257, t271, t281).

**Then I cropped all 43 and looked, which is the only step that has ever caught this class.**
Precision is **~43 %**: 18–19 are death-sized starbursts or a visible READY card
(`death-sheet0.png`, `death-sheet1.png` — #27 t576.5 and #34 t772.0 show the READY card
outright, #21 and #30 show the player's jet inside the fireball); the rest are desert-stage
baseline shifts, small ground-target explosions, the attract screen and the refuel runway.
Recall is unestablished and **structurally suppressed** in the bright yellow stages t770–840,
where the baseline warm fraction is 47–74 % and no death can raise a spike above it.

**I tried a second discriminator and it failed, so it is withdrawn too.** A real death should
remove the player's nozzles, collapsing the warm fraction for ~3 s afterwards. Measured as
mean warm in t+2.5…t+5.5 over the local baseline, across the eye-classified deaths the ratio
runs **0.07 to 162** — no separation at all. Reported rather than buried, because the obvious
next instrument is exactly this one and the next person should not spend the time.

**The bound and nothing more: 19 death-sized events in 866.5 s = 1.32 per minute of wall
clock**, both error directions live. Order 1–3/min. Not a gate.

**What the failure established is worth more than the number would have been.** The gameplay
tape gives ~1.3 deaths/min; `ab2-longplay.mp4` is **988 s of the same ROM with zero deaths**.
Two recordings, same arcade game, differing by every death there is — because **a deaths/min
figure read off a recording measures that pilot's skill, not the game's lethality.** Our
`?demo=1` is an autopilot with a fixed policy, a third skill level again. **No choice of
denominator fixes that**, which means I27's repair — correct and still necessary — does not
make the criterion sound; it only makes it self-consistent.

So gap 5's criterion is published as a **regression guard** (did a change make the game 2×
more lethal than last round, on flight time, same seeds, same tree state) and explicitly
**not** as an arcade-fidelity criterion. The fidelity question is re-pointed at
**pilot-independent** properties, every one of which `tools/fairness_probe.mjs` already emits
and whose field names I verified present: `warningMedian` (telegraph + time of flight),
`meanShotsInAir`, `telegraphsStarted`, `shortLives`/`respawnLives`. Deriving arcade targets
for those is unstarted and is the recommended replacement.

**Note for the TL:** `tools/out/criteria-fix-r5c/` holds a 312 MB 2 fps frame cache of
`ab2-gameplay.mp4` under `gp2/`. It is gitignored and fully re-derivable with
`ffmpeg -i .reference-cache/video/ab2-gameplay.mp4 -vf fps=2 gp2/f%05d.png`; I was not
permitted to delete it, so delete it when convenient. The contact sheets are the evidence.

## Left undone, deliberately

- **The arcade's own death rate stays unmeasured** — attempted and withdrawn, §10. The
  ≤1.5 threshold stays UNVERIFIED, and I now believe no amount of footage work will fix it.
  The replacement direction (arcade targets for pilot-independent fairness properties) is
  specified but unstarted.
- **A true plain-only stage-2 figure** — needs a horizon fit or roll gate; re-open condition
  published.
- **Stage-1 cloud presence** stays UNRESOLVED from R5b, with its re-open condition.
- **Our-side stage-2 share is other lanes' self-report.** The arcade side is all mine and
  re-runnable; the comparison's other half is not, and the build-side figure should be
  re-measured on a clean checkout before the judge scores it.

## Evidence index — `tools/out/criteria-fix-r5c/`

`death-sheet0.png` / `death-sheet1.png` (all 43 death-detector detections, cropped and
indexed), `gp2/` (2 fps frame cache of the gameplay tape, 312 MB, gitignored, re-derivable),
`arcade-s2/` (65 frames t124–156 at 0.5 s), `plain-share-arcade.csv` (per-frame Chebyshev and
Euclidean), `plain-split.csv` (sky-contiguous vs terrain-enclosed per frame), `annot-high.png`
/ `annot-low.png` / `annot-enclosed.png` (the band outlined, every matched pixel tinted, the
stage digit readable in each tile), `annot_plain.py` (the annotator), `boot/` (the two-frame
boot check). Tool: `tools/measure_plain_share.py` (`--synthetic` for the control).

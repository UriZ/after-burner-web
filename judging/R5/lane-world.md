# Round 5 — world lane (ground / sky / clouds / stage data)

Scope worked: **I7 / gap 7** (cloud classifier reconciliation + clouds too small),
**I7 spillover** (the 3× decimation risk), **gap 6** (stage 2 / stage 3 grounds).
Files touched: `src/render/clouds.js`, `src/render/ground.js`, `src/game/stage.js`,
`tools/measure_clouds.py`, `tools/measure_ground.py`, `tools/clouds-preview.mjs`,
`tools/cloud-tex-preview.{html,mjs}` (new). Nothing outside the lane was edited.
Captures all under `tools/out/world-r5b/`. Evidence images under
`judging/R5/world-evidence/`.

---

## Headline

**The arcade-side cloud numbers everything was being tuned to are not cloud numbers.**
Re-running the published #132 operator on its own source span and hand-classifying every
component it returns: **11 of 90 are cloud banks.** The other 79 are the launch carrier,
the HUD reticle's attitude line on empty sky, enemy airframes, missile plumes, explosions,
coastline/island and sea foam. Measured over the 11 real banks the arcade's stage-1 banks
are **~2× wider and ~3.7× taller** than the published figures say — which is the R4 judge's
complaint ("big cumulus masses that the jet flies past; ours carries 1–3 small puffs")
restated as geometry.

Secondary: **our stage-3 city lights were rendering entirely behind the bottom HUD** — the
visible night ground had zero pixels above V 0.9 against the arcade's 5.93%, while mean V
matched. And **the 3× capture decimation is lossless** — proved per run — but one published
sea statistic is distorted by a 1-px floor in the ACF estimator that only binds after
decimating.

---

## 1. The cloud operator, in full, and its instrument control

`tools/measure_clouds.py` was rewritten to implement REFERENCE.md's #132 operator exactly.
It previously diverged on all eight axes I7 lists; every divergence is now named in the
file's header next to what replaced it. The operator as implemented:

| | value | note |
|---|---|---|
| segmentation | `sat < 0.25 AND V > 0.80`, V = max(RGB)/255, sat = (max−min)/max | at stored resolution, never upscaled |
| window | rows **2 %H – 45 %H** | load-bearing: the same threshold matches aircraft and foam |
| HUD exclusion | arcade: rects `(18,20,400,58)/686×480` and `(495,30,660,105)` | ours: derived **per run** by `tools/hud_mask.py` |
| components | **8-connected**, area ≥ **150 px at 686×480** | rescaled by frame AREA: `AREA_FRAC = 150/(686·480)` → **33 px at 320×224** |
| haze discard | drop components wider than 90 %W | |
| truncation | height/aspect from **untruncated only**; width always **pooled** | |
| aspect | **normalised**: `(w/W)/(h/H)` | the 1.43× trap |
| our frames | 960×672 capture decimated 3× to native 320×224 | lossless, see §3 |

**Synthetic control** (`python3 tools/measure_clouds.py --synthetic`) — seven groups, all PASS:

```
[A] 686x480 min_area=150  n=3 (expect 3)
    width %W got  5.977  truth  5.977  err 0.000   OK
    width %W got 10.058  truth 10.058  err 0.000   OK
    width %W got 21.137  truth 21.137  err 0.000   OK
    circle normalised aspect got 0.700  expect 0.700 (frame h/w)  OK
[A] 320x224 min_area=33   n=3, same three widths, err 0.000, aspect OK
[B] disc area  49 px vs min 150: n=0 OK     disc area 333 px: n=1 OK
[C] full-width haze band: n=0 OK   (same band, discard off: n=1 — proves it IS detected)
[D] disc centred 0.70H: n=0 OK     disc centred 0.25H: n=1 OK
[E] disc straddling the 45%H cut: n=1 widths=1 heights=0 OK
[F] corner-touching blocks: 8-conn n=1, 4-conn n=2 OK
[G] cream cloud sat .07 V .97: n=1 OK | pale haze sat .28: n=0 OK | mid grey V .65: n=0 OK
SYNTHETIC CONTROL: PASS
```

Width error is **exactly 0.000 %W** at both resolutions, and group [A] also catches the
geometric-vs-normalised aspect confusion (a circle must read `h/w` of the frame, 0.700, not
1.0). Two of these tests exist because the implementation failed them first: [F] initially
reported 8-conn n=2 because my two "diagonally touching" discs were in fact tangent and
separated.

**Cross-implementation control.** Run on the arcade side it reproduces the criteria-fix
lane's independent reimplementation of the same prose, on frames I extracted myself
(t = 88–120 at 1 Hz, 33 frames, the STAGE_MAP-verified stage-1 span):

| statistic | criteria-fix lane | this tool |
|---|---|---|
| presence | 72.7 % | **72.7 %** |
| count median / p90 / max | 1 / 5.0 / 5 | **1 / 5.0 / 5** |
| width median / p90 / max | 8.16 / 21.43 / 42.27 | **8.45 / 21.49 / 42.27** |
| height median (untruncated) | 5.62 | **5.62** |
| normalised aspect median | 1.06 | **1.06** |

Two independent implementations from the prose agree to the second decimal on five of six
statistics. **The operator is now pinned and this file is it.**

## 2. The operator is right. The numbers it produces are not cloud numbers.

Having pinned the operator, I did what CLAUDE.md requires before tuning to a criterion —
checked the criterion against the arcade. I ran the operator over **t = 93–120 at 0.5 s (55
frames)**, which returns **90 components**, cropped every one at its own bounding box, and
classified them by eye. Contact sheets: `world-evidence/half-p0.png`, `half-p1.png`.
Zoomed candidates: `cloud-candidates.png`. The 33-frame set is in `allcomps-p0..p2.png`.

**11 of 90 components are cloud banks.** The rest:

- **carrier superstructure** — t88–90 is the catapult launch, and the grey deck/island sits
  inside the window (`allcomps-p0`, #1–#4, #6–#13);
- **the HUD reticle's attitude line** on otherwise empty sky — `allcomps-p0` #0, #5, #14,
  #15 read 17–20 %W × 0.4–0.8 %H. The published arcade HUD rects stop at y = 105/480 and the
  reticle's line sits just below them;
- **sea foam, wakes, coastline and islands** — the largest single category. The 45 %H window
  does not keep the sea out, because the horizon moves with pitch and roll;
- **missile smoke plumes** — the same achromatic mask as cloud (this is I5's own finding,
  "clouds merging with the plume under the same achromatic mask"). The published arcade
  **max of 42.27 %W is a missile plume**: t101, `world-evidence/allcomps-p0` #29, plume plus
  airframe plus sea;
- enemy airframes and explosion debris.

### The 11 real banks — auditable table

Source `ab2-longplay.mp4`, frames at `tools/out/world-r5b/arcade-s1-half/`, measured at the
stored 686×480. `#n` indexes the component list the operator returns in frame order.

| # | frame | bbox | area px | %W | %H | aspect (norm) |
|---|---|---|---|---|---|---|
| #7 | t97.0 | x[0,128] y[108,216] | 10900 | 18.66 | 22.50 | 0.83 |
| #25 | t101.0 | x[144,196] y[58,105] | 1271 | 7.58 | 9.79 | 0.77 |
| #27 | t101.5 | x[0,184] y[14,216] | 25671 | 26.82 | 42.08 | 0.64 |
| #42 | t106.0 | x[332,418] y[10,86] | 2606 | 12.54 | 15.83 | 0.79 |
| #44 | t106.0 | x[312,378] y[88,150] | 3052 | 9.62 | 12.92 | 0.74 |
| #45 | t106.0 | x[257,315] y[132,179] | 2062 | 8.45 | 9.79 | 0.86 |
| #47 | t106.5 | x[50,231] y[58,200] | 20470 | 26.38 | 29.58 | 0.89 |
| #79 | t118.0 | x[534,686] y[35,216] | 16142 | 22.16 | 37.71 | 0.59 |
| #85 | t119.5 | x[316,606] y[42,216] | 33403 | 42.27 | 36.25 | 1.17 |
| #87 | t120.0 | x[332,408] y[54,104] | 2930 | 11.08 | 10.42 | 1.06 |
| #89 | t120.0 | x[404,632] y[80,216] | 19939 | 33.24 | 28.33 | 1.17 |

| | published #132 | **cloud banks only** |
|---|---|---|
| width %W median (p25 / p75 / p90 / max) | 9.26 (— / — / 21.49 / 42.27) | **18.66 (10.35 / 26.60 / 33.24 / 42.27)** |
| height %H median (p25 / p75 / p90 / max) | 6.04 | **22.50 (11.67 / 32.92 / 37.71 / 42.08)** |
| normalised aspect median | 0.97 | **0.83** (= 1.19 in pixels) |
| centre %H | — | 10.0 – 33.8, median 26.1; tops reach **2.9 %H** |
| in-window presence | 68–69 % | **14.5 %** (8 of 55 frames) |
| in-window count/frame | 1 / 5 / 6 | **0 / 1 / 3** (median / p90 / max) |

Five of the eleven are cut by the operator's own 45 %H window, so those heights are lower
bounds. n = 11 is small; the per-bank table above is published so any judge can re-classify
it from the same crops rather than take my word.

**Consequences for the brief.** "Presence (67.5 %) and height are already right — do not
retune those" rests on the contaminated set twice over. On identical frames the operator
alone moves our presence by 22 points (see above) — the build never changed, the instrument
did. And the
published height of 6.04 %H is dominated by thin foam bands and reticle lines; real banks
are 22.50 %H.

## 3. The 3× decimation — not a risk, but one statistic is still wrong

`python3 tools/measure_clouds.py --verify-native '<glob>'` checks every 3×3 block of a
capture for uniformity. Across every capture this round (120+ frames):

```
worst non-uniform 3x3 block fraction 0.000000, worst intra-block deviation 0
img[::3,::3] is LOSSLESS (exact inverse of the nearest upscale)
```

The 960×672 viewport is exactly 3× the 320×224 internal render and `screen.js` blits with
`NearestFilter` on an integer scale, so `img[::3,::3]` **recovers the native frame exactly**.
Every histogram statistic — distinct colours, palette share, foam fraction, contrast spread
— is therefore provably unchanged by decimating: the upscale replicates each pixel 9 times
uniformly, so each keeps its weight. Control: "distinct colors below horizon" reads **13950
at both 320×224 and 960×672** on the same frame.

**But a scale-dependent statistic is affected, and sea anisotropy is one.**
`measure_ground.py`'s `autocorr_anisotropy` floors the shorter ACF half-width at 1 px
(`max(min(hx,hy), 1)`). On `tools/out/world-r5b/sea-check/frame-0001.png`:

| measured at | hx | hy | reported ratio |
|---|---|---|---|
| native 320×224 (decimated, as published) | 6.543 | **0.676** | **6.54×** — floor binds |
| stored 960×672 | 19.624 | 2.037 | **9.63×** |

Half-widths scale by exactly 3.00, as they must. **The published 6.51× is a floor-limited
reading, not a measurement of the texture.**

**And the arcade comparison it was being judged against was invalid.** Arcade frames are
686×480 interpolated upscales, and interpolation lengthens correlation lengths. Brought to
one resolution with one filter — ours resampled 960×672 → 686×480 bilinear, arcade t116 as
stored, same patch (240,260)–(445,465):

| | hx | hy | ratio |
|---|---|---|---|
| ours, resampled to 686×480 | 44.61 | 9.02 | **4.95×** |
| arcade t116, as stored | 41.63 | 7.99 | **5.21×** |

The two agree within 7 % on both axes and 5 % on the ratio. I had an intermediate conclusion
that our sea grain was "3× too fine on both axes"; that control killed it — it was an
artifact of measuring ours at native and the arcade at 686.

I did **not** change `measure_ground.py`'s behaviour, so earlier figures stay reproducible;
the caveat is now in its docstring in full. **Recommendation to the lead and the criteria
lane: restate the sea anisotropy figure as "4.95× vs arcade 5.21× at a common 686×480", and
retire 6.51×.** The other sea numbers (contrast spread, foam fraction, distinct colours) are
histogram statistics and need no restating.

## 4. The clouds themselves

### 4a. The HUD-overlap control is retired, with evidence

R3/R4 held a "zero cloud/HUD overlap" control which forced every puff's top edge below
0.245H. It contradicts the arcade and it was a direct cause of gap 7: holding it compressed
every bank into 32–58 %H — the bottom third of the arcade's own cloud band — which is why
54 % of our banks were cut by the 45 %H window against the arcade's 32 %, and why none of
ours ever reached the top of frame against the arcade's 9 %.

Evidence the arcade draws clouds behind its HUD: `world-evidence/arcade-hudclouds-t100.png`
— a white bank sits squarely behind `SCORE / 17310 / HIT`, glyphs rendering over it. Six
components in the 33-frame set start at row 10 and stop at row 20, which is exactly the top
HUD rect's upper edge: the mask is cutting a cloud that continues underneath it.

**Our HUD is unharmed by the change, measured.** `screen.js` composites the HUD after the
scene into the same low-res target. Over 11 clean frames with and without clouds
(`hudchk-on` / `hudchk-off`, seed 1):

- **42 886 cloud pixels** are drawn in the top HUD band (rows 0–59) — the clouds really are
  passing behind it;
- of the pixels that differ, **only 31 are pixels the HUD actually paints in that same
  frame**, and all 31 are at x 247–265, y 25–37 — the reticle's *partially transparent* edge
  pixels (`OFF = (136,156,187)` / `(0,115,187)`, neither flat sky nor solid glyph), whose
  blend now takes the cloud instead of the sky. That is ~3 pixels per frame and is what the
  arcade does too;
- every opaque glyph is byte-identical with and without clouds.
- A/B crop: `world-evidence/hud-ab2.png` (top = clouds on, bottom = off). SCORE, 33000, HIT,
  0 and the reticle are unchanged and fully legible.

(The 105 "HUD-mask pixels changed" figure from a looser version of this check is an artifact
of the mask being a single-frame snapshot of a HUD whose score digits and reticle angle both
move; the strict test above is the one to quote.)

### 4b. What changed in `clouds.js`

- **A bank is now ONE sprite.** It was a cluster of up to 5 puff sprites, sized so a row of
  small round puffs would measure as the published ~2:1 bbox. That bbox came from foam and
  reticle lines. At real bank size each puff's own outline and shading stayed visible through
  its neighbours and a bank read as a row of identical pumpkins —
  `world-evidence/ours-t5.png`.
- **The texture is authored from the native-resolution reference, not from a lighting
  model.** `ab2-arcade-desert.png` and `ab2-arcade-night-banking.png` are 320×224 originals;
  at 7–8× (`world-evidence/ref-desert-cloud.png`, `ref-night-cloud.png`) an arcade cloud is a
  round cauliflower mass, filled edge to edge with a fine 1–2 px stipple of the palette ramp,
  with **no large coherent shadow band** and a soft notched perimeter. Three attempts missed
  this by building a lighting model instead — scattered dark discs (grey polka dots at bank
  size), a shaded underside band (a grey bowl over half the mass), a nested three-band
  version (a beaded mid-grey necklace around a white core). All three are in
  `ours-t5/t6/t7.png`.
- Silhouette and colour are now authored **separately**: discs under a transform that
  normalises the mass to fill the canvas, then colour written **per pixel in texture space**
  so the stipple stays on the pixel grid. Rung assignment is two-octave value noise cut at
  **percentiles of the actual noise sample** (CLAUDE.md's thrice-repeated fbm calibration
  trap). Resulting ramp population vs the measured arcade ramp:

  | | #f7f7f7 | #e6e6f7 | #d6d6e6 | #c5c5d6 | #b5b5c5 | #a4a4b5 |
  |---|---|---|---|---|---|---|
  | arcade (measured) | 46.0 | 30.0 | 15.0 | 5.0 | 3.0 | <1.0 |
  | **ours** | **46.5** | **30.3** | **14.4** | **4.8** | **2.9** | **1.0** |

- `TEX_W/H` 72×56 → 128×104 → **96×78**, chosen so the stipple survives to screen: at 96 px
  the median bank is near 1:1 and the biggest magnifies 1.4×. At 128 the stipple was finer
  than a screen pixel at typical sizes and the mipmap averaged it to flat grey.
- Vertical band is now the arcade's measured one (centres 0.09–0.42H), the HUD clamp is
  gone, and the per-tick screen-fraction hold (the R3 parallax fix) stays.
- Sizes and the bank-count distribution are retargeted to the 11-bank table.
- **New isolation harness** `tools/cloud-tex-preview.{html,mjs}` renders a grid of cloud
  textures at 1:1 with a box around each canvas. It found two bugs that were invisible in
  situ: the two-mass form drawing as **two disjoint blobs with sky between** (so the operator
  saw two components and the taller one alone set the aspect — 0.62 against a 0.83 target),
  and the underside band being positioned in texture space while the silhouette had been
  normalised, so `source-atop` clipped nearly all of it and left a grey foot.
  Sheet: `world-evidence/cloud-texture-sheet.png`.

### 4c. Before / after

Our build, stage 1, `?fixed=1&hidejet=1&nocombat=1`, seeds 1–4, 30 frames each at 1 Hz,
120 frames, aligned operator, pooled (truncation off) so it is directly comparable with the
11-bank table:

| | **before (R5 tree as inherited)** | **after** | arcade, cloud banks only |
|---|---|---|---|
| width %W median | 7.19 | **18.12** | 18.66 |
| width p25 / p75 / p90 | — / — / 18.44 | **13.05 / 23.98 / 37.22** | 10.35 / 26.60 / 33.24 |
| height %H median | 5.36 | **20.54** | 22.50 |
| height p75 / p90 | — | **28.57 / 38.84** | 32.92 / 37.71 |
| normalised aspect median (p25/p75/p90) | 0.92 | **0.88 (0.77 / 1.01 / 1.17)** | 0.83 (0.76 / 0.98 / 1.17) |
| presence (in-window) | 50.6 % (see §4f) | **70.0 %** | 14.5 % (see note) |
| count/frame median / p90 / max | 0 / 2 / 3 | **1 / 2 / 4** | 0 / 1 / 3 |

Side by side with the arcade: `world-evidence/final-cmp.png`.

**Note on presence/count.** I deliberately did **not** drive presence down to the clean
arcade figure of 14.5 %. That figure comes from 55 frames of one 27-second span measured
inside a 2–45 %H window that excludes near-horizon cloud entirely, and driving to it would
leave the sky empty — the opposite of the judge's "too few to read as banks". Our 70 % and
1 / 2 / 4 sit between the clean arcade reading and the published one. **This is the one
number in this lane I would call a judgement call rather than a measurement**, and I am
flagging it rather than dressing it up.

Against the **published** figures the new build "fails" width (18.12 vs the 8–11 band) and
height (18.30 untruncated vs 5.0–7.5). That is the point of §2 and it needs a decision from
the criteria lane before the next judge scores it — see `ask-world.md`.

## 4d. A crash I introduced mid-round, and the hole it left in another lane's report

**Real defect, mine, now fixed — not dormant.** Between two of my own edits
`src/render/clouds.js` referenced `HUD_BOTTOM_FRAC` after I had already deleted its
definition: the "retire the HUD clamp" change replaced the constant at the top of the module
in one edit, and `updateBankPositions` kept reading it in its clamp until a later edit.
Anyone capturing the shared tree in that window got

```
ReferenceError: HUD_BOTTOM_FRAC is not defined
  at src/render/clouds.js  (const minFrac = HUD_BOTTOM_FRAC + halfFrac;)
  <- game.js step <- core/fixedloop.js
```

**Why it looked intermittent in tick count:** the reference sat inside
`updateBankPositions`, which runs only for ACTIVE banks, and the bank model starts in a
cooldown. A capture that finished before the first bank activation survived; any run long
enough to activate one threw. That is why short captures passed and long ones died.

It was fixed when the clamp was rewritten, and the function was replaced outright when a
bank collapsed to one sprite. The identifier does not appear anywhere in the file now.
Verified rather than assumed — the path has to actually run for a clean result to mean
anything:

- the sprite-art lane's exact repro (`--frames 1 --every 4920`, `seed=1&nocombat=1&invincible=1`)
  and the stage-2 tick (`--every 2460`) across **seeds 1–5**: no page errors;
- those same frames carry **2–6 detected cloud components each**, so banks were live and
  `updateBankPositions` ran — the pass is not vacuous;
- three continuous **6000-tick** runs with combat on (seeds 11/12/13), crossing all three
  stages: clean.

**So the hole in `judging/R5/ask-sprite-art.md` A1 is no longer real.** Stage-2 and stage-3
frames capture fine on the current tree; that lane can re-run.

One thing not to misread as this bug: a capture occasionally dies with puppeteer's
`Execution context was destroyed, most likely because of a navigation`, or returns a short
sequence or a single all-black frame. That is the shared tree — another lane saves a file,
Vite reloads the page, and the capture loses its context. Seed 13 did it once and retried
clean; every 120-frame tuning pass came back 0/120 black with no page errors. It is not a
rendering defect.

## 4e. Bound on the HUD-mask risk now that banks are large

The lead flagged that bigger, brighter banks raise the stakes on the HUD being counted as
cloud. The mask is derived per run with `tools/hud_mask.py` (`tools/out/world-r5b/hudmask`)
and it is subtracted **before** components are formed, so the HUD cannot merge two banks or
be counted as one. With banks this size the exposure runs the other way: **55.4 %** of our
130 components now have a bbox overlapping the HUD mask, so a glyph stroke could SEVER a
bank and inflate the count.

Measured, by labelling on `(cloud OR HUD)` so a stroke cannot cut a bank, while still taking
bbox and area from cloud pixels only:

| | components | count/frame med / p90 / max | width median | width p90 |
|---|---|---|---|---|
| HUD removed (**as published**) | 130 | 1 / 2 / **4** | 18.12 | 37.22 |
| HUD permeable (control) | 126 | 1 / 2 / **3** | 18.28 | 37.34 |

So the published figures over-count by **3.1 %** and under-state width by **0.9 %** —
8-connectivity routes around most of the thin strokes. Small, but it is a real bias in a
known direction and it will grow if the HUD gains more horizontal rules.

## 4f. CORRECTION — capture dropouts in my own baseline set

The player-feel lane found a silently-black frame in one of its own capture sets and
published a detection recipe. Applying it to every set this lane quotes a number from
turned one up in mine. **Correcting a published number here.**

| set | n | black frames | consecutive duplicates |
|---|---|---|---|
| `cl-base-s1/s2/s3` (**the "before" numbers**) | 90 | **9** | 1 pair |
| `cl-t12-s1..s4` (the "after" numbers) | 120 | 0 | 0 |
| `hudchk-on` / `hudchk-off` | 24 | 1 | 0 |
| `ours-s2b`, `ours-s3b`, `sea-check`, `final-shot` | 23 | 0 | 0 |
| `arcade-s1` (33), `arcade-s1-half` (55) | 88 | 0 | 0 |

My earlier "every 120-frame tuning pass came back 0/120 black" was true of the tuning passes
— I checked those — but I never swept the **baseline**, which is the set the whole before/
after comparison rests on. 9 of its 90 frames are dropouts.

What it cost, recomputed with the dropouts excluded:

| | as published | corrected |
|---|---|---|
| before, presence (aligned operator) | 45.6 % | **50.6 %** |
| before, presence (legacy operator) | 65.6 % | **72.8 %** |
| before, width median %W | 7.19 | **7.19** — unchanged |
| before, height median %H | 5.36 | **5.36** — unchanged |

**Only presence moves.** A black frame contributes no components, so it can only be counted
as "no clouds present"; it cannot move a size statistic. The before/after presence gain is
therefore **50.6 % → 70.0 %**, not 45.6 % → 70.0 % — I was overstating it by 5 points. Width
and height, which are the gap-7 deliverable, are unaffected, and the arcade side — the
11-bank table and every target in it — is clean.

The conclusion in §2 also survives: the legacy-vs-aligned presence comparison was run on
*identical* frames, so the dropouts hit both operators equally and the 22-point gap between
them is unchanged.

**The duplicate pair was two consecutive BLACK frames, not a stall — and the distinction is
sharper than "two kinds of bad frame".** The two modes bias in OPPOSITE directions, and for
a statistic like this one they are not equally bad:

- a **dropout** can only ever be counted as *absence*. It subtracts. It cannot invent a bank,
  so it cannot move a size statistic at all — which is exactly why width and height survived
  this correction untouched and only presence moved.
- a **stall** duplicates a *live* frame. Every one of my cloud figures pools components
  across frames, so a repeated frame silently re-counts every bank in it — it adds weight to
  one particular sky, skewing the pooled width/height distribution and the count
  distribution together. **For a pooled per-frame statistic a duplicate is actively
  dangerous, not merely uninformative**, and it is the mode a black-frame sweep can never
  catch, because a stalled frame looks perfectly normal.

So the dropout I found is the benign half of the problem. Neither mode occurred in the
after-set or on the arcade side.

**Integrity range published alongside the statistic** (player-feel's guard, adapted: for a
pooled per-frame measure, publish the per-frame count and area range — a corrupted frame or
a stall shows up as a gross outlier for free):

| | per-frame components | per-frame cloud area | consecutive-frame mean abs dRGB |
|---|---|---|---|
| after (`cl-t12`, 120 frames) | min 0 / median 1 / max 4 | 0 – 21298 px = max **29.7 %** of frame | min **14.03**, median 18.01 |
| before (`cl-base`, 90 frames) | min 0 / median 0 / max 3 | 0 – 3176 px = max 4.4 % | min **0.00**, median 15.51 |

A corrupted frame would push the area toward the full 71680 px; the maximum observed is 29.7 %
of frame, four times clear. A consecutive delta of 0 means the sim did not advance — the
after-set's minimum is 14.03, so no frame in it is a stall. **The before-set's 0.00 is the
guard independently rediscovering the dropout I already found**, and I confirmed it is the
known black pair (`cl-base-s3/frame-0014`, max = 0) and not a live stall. That is the guard
validated on a known input, which is the only reason to trust it on an unknown one.

**Bound on that guard, stated because it is weaker than the player-feel lane's equivalent.**
Mine is a *flatness heuristic*: an implausibly flat run of per-frame counts and areas. The
player-feel lane can do better, because the jet's position is published as telemetry
(`__flowState()`) independently of the renderer, so it cross-checks each frame's measured
centroid against that tick's commanded anchor and a stale frame shows up as an unmissable
residual — which is how it found the one mid-barrel-roll frame in 161 and nothing else.
**`clouds.js` publishes no equivalent state**, so there is no independent anchor to check a
cloud frame against, and a partial stall that left cloud content stale while the sea dither
advanced would have to be caught by flatness alone. Nothing in the after-set looks like
that (consecutive deltas 14.03–18.01, counts and areas both varying frame to frame), but
that is weaker evidence than a residual against published state. If cloud banks ever need
this properly, the fix is for `createClouds` to expose active bank z/x/scale the way the
flow state does.

Method note for anyone measuring on this tree: sweep for **both** — flag `max() < 8` for
dropouts AND consecutive identical frame hashes for stalls — and treat a duplicate as "look
at it", not "discard it", since a legitimately static scene produces real ones. Recipe and
the case for pinning `hmr: false` in `tools/capture.mjs` are in
`judging/R5/ask-player-feel.md` A5. Note that `hmr: false` has since landed and does **not**
eliminate the dropouts — see §6 item 6.

> **[TEAM LEAD CORRECTION, 2026-10-05 — appended, original left standing.]** The sentence above
> was true when written and is now superseded. `hmr: false` was only the FIRST of two causes.
> The second was found by chasing this lane's own "not fully fixed" observation:
> `src/render/screen.js` builds its `THREE.WebGLRenderer` with **no `preserveDrawingBuffer`**,
> so the drawing buffer is cleared once composited — and the capture loop was two separate CDP
> round trips (render, then screenshot), so a compositor frame landing between them produced a
> black read with no page error. `tools/capture.mjs` now steps and reads the pixels in the
> **same JS task**. Measured **1/30 black before, 0/90 after** across three runs, detector
> validated in both directions. This lane then verified the new read-back path is byte-identical
> to the old (**30/30 frames, max ΔRGB 0**, 3×3 block invariant intact), so every figure in this
> report reproduces unchanged. Full record: `judging/R5/interfaces.md` I25 and I25a.
>
> **The method note immediately above is NOT superseded and should still be followed.** Two
> causes fixed is not proof there is no third: sweep for both dropouts and stalls regardless.
>
> *World-lane corroboration, independent of the lead's count: the one set I captured after
> this fix (`bytecheck`, 30 frames) reads **0 black, 0 consecutive duplicates**, against
> 2/14 on `ours-s2h` and 1/14 on `ours-s2f` — both taken after `hmr: false` but before it.*

## 4g. The stage-3 lights punch through glyphs — and the arcade's do it harder

The player-feel lane measured that stage 3's ground is now the darkest of the three by mean
luminance (11.9 vs 84.1 and 119.8) but **3.40 %** of it is brighter than the cream glyph ink
(p99 247 vs ink 226), so specks show through plate-less glyph interiors.

**Checked against the arcade before anyone asks me to dim the lights, and the answer is
don't.** On `ab2-arcade-night-banking.png` (native, STAGE 3), in the arcade's own bottom HUD
band `y[196,222]`:

- **9.76 %** of that band is brighter than 226 — nearly 3× our 3.40 %;
- the ground immediately above it, `y[170,196] x[20,300]`, reads 8.63 % above 226, p99 247;
- the arcade HUD row is **65.2 % pure dark**, i.e. night ground showing through — there is no
  opaque plate behind the row.

So the arcade has this condition harder than we do and solves it on the **glyph** side, not
by thinning the lights. Dimming our lights to fix glyph legibility would walk back a
measurement that currently matches the arcade exactly (p99 V 0.969, >V 0.9 at 2.2 % against
the arcade's 5.93 %) and move us *further* from the reference. This belongs with R4 gap 3's
contrast plates and glyph outlines. Raised by player-feel as A6 for the presentation lane;
I am not changing `lightDensity` for it.

## 5. Gap 6 — stages 2 and 3

Both reference frames were **stage-identity-verified by reading the HUD digit directly**, at
native 320×224, which is better provenance than the 686×480 video the previous constants
came from:

- `reference/ab2-arcade-desert.png` — bottom bar reads `STAGE 2`.
- `reference/ab2-arcade-night-banking.png` — bottom bar reads `STAGE 3`.

### Stage 2 — pixel-measured palette

Operator: exact-colour histogram on the named crop of the native frame, no quantisation
(the frame is already on the arcade's 4-bit ladder, `n·247/15` per channel — confirmed:
every one of the 42 colours in the terrain band is a ladder entry).

| crop | region | top colours (yield) |
|---|---|---|
| whole frame, HUD rows excluded `y[14,196]`, n=58240 | — | `#e67300` 48.76 %, `#313100` 4.30, `#d6b584` 2.51, `#311000` 2.46, `#312100` 2.45, `#633100` 2.19 |
| **flat orange plain** `x[205,300] y[150,190]`, n=3800 | ground away from terrain | `#e67300` **99.4 %** — a flat fill, not a dither |
| **pale road / sand** `x[0,26] y[152,192]`, n=1040 | | `#d6b584` 29.1, `#846331` 15.2, `#c59463` 13.0, `#f7c584` 8.6 |
| **boulder field** `x[22,62] y[30,70]`, n=1600 | | `#b5b500` 9.6, `#313100` 9.2, `#636300` 8.1, `#633100` 7.9, `#c59463` 5.2 |
| **olive scrub** `x[36,92] y[140,186]`, n=2576 | | `#313100` 32.3, `#633100` 12.1, `#636300` 10.4 |
| **dark canopy** `x[96,150] y[150,190]`, n=2160 | | `#311000` 18.6, `#843100` 11.3, `#c59463` 6.9, `#f7b500` 6.9 |
| **amber glow at the terrain edge** `x[86,108] y[16,52]`, n=792 | | `#e67300` 40.2 → `#e67b00` → `#ef8400` → `#ef8c00` → `#f79400` |

**Terrain band** `x[10,180] y[150,194]`, n=7480: **42 distinct colours total**, of which 18
cover **85.0 %** — `#313100` 12.65, `#311000` 9.47, `#d6b584` 8.92, `#312100` 6.15,
`#843100` 5.74, `#633100` 5.53, `#846331` 4.34, `#f7b500` 4.17, `#c59463` 3.54, `#b56300`
3.40, `#b58463` 3.30, `#f7c584` 2.89, `#636300` 2.82, `#522100` 2.75, `#632100` 2.67,
`#945200` 2.42, `#d68400` 2.31, `#946352` 1.89.

Measured on our own capture over an equivalent band, **our stage-2 ground used 238–258
distinct ladder entries against the arcade's 42**, with V sd 0.19–0.21 against 0.278. A
continuous HSV field snapped to a 4-bit ladder reads as mush where the arcade reads as rock,
scrub and canopy. **Change made:** the canopy branch now snaps to the measured 18-colour set
(`snapToStage2Palette` in `ground.js`), applied before the haze mix so the horizon band stays
a genuine gradient. Distinct colours **238–258 → 70–72** (the residual is the unsnapped haze
ramp); V sd 0.194–0.219.

**Honest assessment: this is an improvement, not a fix.** `world-evidence/s2-ab3.png`
(ours before | ours after | arcade) — ours is still a smeared longitudinal streak where the
arcade is chunky discrete terrain with boulder clusters, scrub clumps, a wide hard-edged tan
road and a bright amber glow band at the terrain/plain boundary. Left open with a spec in §6.

### Stage 3 — the city lights were behind the HUD

Operator: same exact-colour histogram, plus a V-distribution over the ground band
`x[20,310] y[128,196]` (n = 19 720) of the native frame.

| crop | measurement |
|---|---|
| sky above horizon `x[10,120] y[20,70]` | `#000000` 70.1 % (remainder is cloud) — pure black |
| navy band below horizon `x[230,310] y[96,120]` | `#000000` 42.3, then `#000042` 10.8, `#000052` 9.1, `#000031` 8.9, `#000010` 7.9, `#000021` 7.1 — **R and G exactly zero**, confirming the existing blue-only constant |
| ground band `x[20,310] y[128,196]` | black 72.7 %, pure-blue ramp 92.2 %, speckle **7.8 %** |
| speckle colours | `#f7f7f7` 4.00 % of band, then `#a49400` 0.40, `#00d6d6` 0.29, `#425284` 0.27, `#e6f7f7` 0.27, `#f70000` 0.24, `#c5d600` 0.24, `#a40000` 0.20, `#c5d6f7` 0.18, `#f7a400` 0.16 |

The defect, measured on our own capture of the same band:

| | mean V | p99 V | >V 0.5 | >V 0.9 | pure white |
|---|---|---|---|---|---|
| arcade native (STAGE 3) | 0.119 | 0.969 | 7.77 % | **5.93 %** | **4.27 %** |
| t175 (686×480 upscale, also STAGE 3) | 0.067 | 0.271 | 0.20 % | 0.12 % | ~0 |
| **ours, before** | 0.099 | **0.322** | — | **0.00 %** | **0.00 %** |
| **ours, after** | 0.119–0.131 | **0.969** | 2.4–2.6 % | **2.0–2.3 %** | 1.4–1.6 % |

**Mean V matched before the fix and the picture was wrong** — the project's recurring
failure mode. Root cause: the ramp `lightNearDist 6.2 → lightFarDist 9.0` confined every
light to within 9 world units of the camera. Measured on our capture, **the first row
carrying any pixel above V 0.5 was y = 199 of 224 — entirely behind the bottom HUD block.**
The lights existed and none were visible.

Fixed in `stage.js`: `lightDensity 0.10 → 0.055`, `lightNearDist 6.2 → 5.0`,
`lightFarDist 9.0 → 45.0`. Density sits between the two sources deliberately; the two
disagree because they are different parts of a 36-second stage and both are real.

I also corrected a comment in `stage.js` that asserted `ab2-arcade-night-banking.png`
"carries no proven stage identity". **It does — its HUD digit reads 3**, and it is the only
native-resolution stage-3 frame in the repo. The t175/t186 pair are video upscales. A
control confirms interpolation alone does not explain the gap (bilinear-upscaling the native
frame to 686×480 keeps >V 0.5 at 5.23 %, not t175's 0.20 %), so the two frames genuinely show
different parts of the stage rather than one being an artifact of the other.

Before/after/arcade: `world-evidence/s3-ab2.png`.

## 5b. Stage 2, second pass — the open plain (taken after delivery, optional item)

The arcade's stage 2 is **not vegetated everywhere**, and the share that is open plain swings
hard along the stage. MEASURED on the STAGE_MAP-verified span 124–156, ground band
`y[310,420] x[20,660]` at 686×480, fraction within 24 of `#e67300`:

| t134 | t138 | t142 | t150 |
|---|---|---|---|
| 0.0 % | 0.0 % | 33.0 % | 8.4 % |

Our build measured **0.3–0.5 % on every frame** — one uniform regime, which is a large part
of why stage 2 reads as a smear. **There is no single flat-fraction target to tune to**; the
thing to reproduce is the variation. The canopy branch now modulates the vegetated band's
width by a low-frequency function of depth and fills the rest with the measured flat plain
(`uPlainColor`, `uVegHalfWidth`, `uOpenAmp`). Defaults are inert — `vegHalfWidth 1.0` and
`openAmp 0.0` mean no plain at all — so stages 1 and 3, which take other branches entirely,
cannot be affected.

| | flat-plain % of ground band |
|---|---|
| ours, before | 0.3 – 0.5 (median ~0.4) |
| **ours, after** | **0.5 – 28.0, median 9.9** |
| arcade, 4 samples | 0.0 – 33.0, median 4.2 |

**A bug worth recording, because it is this project's recurring class.** The first attempt
moved the number from 0.5 % to only 1.1 %. Cause: `snapToStage2Palette` was being applied to
the *result* of the plain mix, and its 18-colour set was measured from the **terrain band**,
which by construction excludes the plain — so it rewrote `#e67300` to its nearest terrain
entry `#d68400` (distance 23) and the plain stopped being the plain. A palette measured from
one region, applied to another. The snap is now applied to the terrain only.

**Two things I tried and reverted, with the numbers:**

- `bandPeriod 11 → 38`, to get ONE terrain edge crossing the frame instead of a mirrored
  pair. Flat fraction overshot to **median 50.4 %, max 70.9 %** against the arcade's 0–33,
  and the crop showed an empty orange desert with a ragged fringe at the horizon. Clear
  regression, reverted.
- `vegHalfWidth 0.62` bracketed the arcade's *range* (3.7–37.1) but sat at median 20.2
  against the arcade's 4.2. Raised to 0.74, which brackets both the range and the median.

**Honest assessment, and it has not changed from §5:** this is a composition fix, not a
terrain fix. `judging/R5/world-evidence/s2-open-plain.png` (ours before | ours open stretch |
ours dense stretch, with arcade t142/t150 below) — our terrain band is still a smeared
longitudinal streak where the arcade's is chunky and discrete, and our band structure is
still symmetric about the flight axis where the arcade's is one diagonal mass. What the
change buys is that the plain/terrain alternation is now real and measured rather than
absent. The remaining work is unchanged and is specified in §6 item 1.

Regression checked: stage 3 reads meanV 0.119/0.123, p99 **0.969**, >V 0.9 **2.20/2.26 %** —
unchanged to the third decimal. Stage 1's sea statistics are unchanged in family; the
open-plain code sits inside the canopy branch, which stage 1 never takes.

## 6. Open, with reasons

1. **Stage-2 terrain structure.** Palette and now composition are right; geometry is not —
   see §5b for the second pass and what it does and does not buy. Spec for whoever takes it: the arcade's stage-2 ground is a *diagonal* composition — a flat `#e67300` plain
   (99.4 % single colour) on one side, a bright amber glow strip at the boundary, then dark
   canopy, then a boulder field, then olive scrub, then a wide `#d6b584` sand road with hard
   edges. Ours is longitudinal bands with a thin road and no discrete objects. This needs
   discrete stamped features, not a stipple retune.
2. **Stage-3 light streaking.** Our lights smear radially toward the vanishing point at the
   bottom of frame where the arcade's stay as discrete 1–2 px points. World-space cells have
   a non-square screen footprint; `lightCell`/`lightCellZ` compensate but not enough once the
   ramp reaches mid-field.
3. **Sea coarseness (R4 gap 10) — withdrawn as a defect, pending.** The §3 common-resolution
   control shows our sea's ACF half-widths and anisotropy already match the arcade's
   (4.95× vs 5.21×, half-widths within 7 %). The hypothesised "separate near-field sparkle
   layer" fix was **not** attempted, because the evidence no longer says there is a defect to
   fix — only a mis-stated measurement. Recommend re-opening only against a common-resolution
   comparison.
4. **Stage 1's sea is empty** — no islands, coast or carrier. Visible in
   `world-evidence/final-cmp.png`: the arcade's t120 carries a large green island; ours is
   open water. Not started; lowest priority in the brief and no budget left after §2.
5. **The max-width tail.** 2.3 % of our banks exceed 50 %W (max 76.9) against an arcade max of
   42.27 over n = 11. These are banks passing the camera. I left them: flying through a cloud
   is correct AB2 behaviour and n = 11 does not bound a maximum.
6. **Capture dropouts are NOT fully fixed by `hmr: false`.** §4d attributed them to Vite
   reloading the page, and the lead has since landed `hmr: false` in `tools/capture.mjs` on
   that basis. **They still occur:** `ours-s2h` (14 frames) came back with 2 all-black
   frames and `ours-s2f` with 1, both captured after that change. So HMR was a cause, not
   the only one. Every figure in §5b excludes black frames explicitly. The detection sweep
   in `ask-player-feel.md` A5 is therefore still required, not merely belt-and-braces —
   correcting my own earlier implication that the reload was the whole mechanism.

   **CORRECTION, 2026-10-05 — CLOSED.** The second cause was found and fixed after I wrote
   the above: no `preserveDrawingBuffer` on the renderer, so the drawing buffer was cleared
   between the capture loop's two CDP round trips and the screenshot read black.
   `tools/capture.mjs` now steps and reads in one JS task. 1/30 black before, **0/90 after**
   (lead); **0/30** on my own post-fix set, against the 2/14 and 1/14 quoted above. The
   read-back is byte-identical to the old path (30/30, max dRGB 0), so nothing in this
   report moves. `interfaces.md` I25/I25a. The A5 sweep stays required — two causes fixed is
   not proof of a third.

## 7. Reproducing everything here

**The `tools/capture.mjs` change made mid-round is pixel-safe — checked, because every
number in this report is a byte-exact colour measurement.** The lead rewrote the capture
read-back (step and read in one JS task, to fix silent all-black frames) and verified it on
black-frame counts, not on pixel equality. Re-capturing `cl-t12-s1`'s exact conditions with
the current tool and byte-comparing against the stored frames: **30 / 30 byte-identical,
max dRGB 0**, and the worst intra-3×3-block deviation is still **0**, so the
decimation-lossless proof in §3 holds on the new tool too. Everything below reproduces
unchanged.



```
python3 tools/measure_clouds.py --synthetic
python3 tools/measure_clouds.py --verify-native 'tools/out/world-r5b/cl-t12-s1/frame-*.png'
python3 tools/measure_clouds.py 'tools/out/world-r5b/arcade-s1/t*.png' --mode arcade
python3 tools/measure_clouds.py 'tools/out/world-r5b/cl-t12-s*/frame-*.png' \
        --hud-mask-dir tools/out/world-r5b/hudmask --legacy
node tools/capture.mjs --out tools/out/<yours> --frames 1 \
        --page /tools/cloud-tex-preview.html --url-params "seed=11"
node tools/capture.mjs --out tools/out/<yours> --frames 4 --every 90 \
        --page /tools/clouds-preview.html --url-params "seed=1&stage=3"
```

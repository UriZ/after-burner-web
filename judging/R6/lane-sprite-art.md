# R6 — sprite-art lane delivery

Files owned and touched: `src/render/spriteFactory.js`, `src/entities/enemySprite.js`,
`tools/art/**`, `src/assets/sprites/**`. Nothing else in `src/` was edited. No commit, no
stash, no checkout, no push. Captures all under `tools/out/sprite-r6/`.

Assignment: judge ranked gaps **2**, **4** and **7**, plus the art critic's enemy-polarity
finding. All four are addressed; one half of gap 2 (the far LOD) is **declined with a stated
reason** rather than done — §2.3.

**New tooling, committed, each validated on a known input before any number below was
trusted:**

| tool | what it gates |
|---|---|
| `tools/art/mirror_check.py` | the player jet's level planform is written twice (sheet generator + procedural fallback); this compares anchor constants, the three polygon helpers and the drawing program token by token |
| `tools/art/sheet_probe.mjs` | every enemy sheet decoded, and nothing in a run rendered procedural fallback art; exits non-zero otherwise |
| `window.__spriteSheetStatus()` / `__spriteSheetSelfTest()` | the in-page census the probe reads, with its own positive control |

---

## 0. Headline

| | R5 | R6 | arcade |
|---|---|---|---|
| day jet achromatic V median (in-game, 342 px span) | **0.643** | **0.839** | 0.839 (judge) / 0.969 (native frame) |
| day jet brightest body colour | **0.773** | **1.000** | 1.000 |
| day jet share above V 0.8 | **0.0 %** | **69.5 %** | 74.1 % (native) |
| night jet achromatic V median (in-game, 348 px) | **0.773** | **0.969** | 0.969 |
| stage-1 enemy airframe V median | **0.322** | **0.549** | 0.557–0.627 |
| stage-1 enemy share below V 0.3 | **43.7 %** | **0.0 %** (keyline carries it) | 11.9–23.2 % |
| stage-1 enemy share above V 0.7 | **4.9 %** | **45.5 %** | 38.6–41.1 % |
| enemy sheets covering near enemies | 8 (day only) | **16** (day + night) | — |
| stage-3 enemies on authored art | **none** | **all**, measured 0 fallbacks over 4 800 ticks | — |

The player jet's fin band, which is what "reads flat" turned out to be, went from **43 % of
the aircraft's height to 58 %** — the arcade's own figure.

---

## 1. GAP 4 — the inverted value ceiling, and the thing that nearly went wrong fixing it

### 1.1 What the ceiling was

R4 published *"the arcade's brightest airframe value is `#c5c5ad` at V 0.77"*. That was the
brightest **cluster centroid of a median-cut quantization of a video upscale**, not a pixel.
`spriteFactory.js` honoured it exactly and `tools/art/palettes.js` authored to it, so our
brightest tone sat at or below the arcade jet's *median*.

### 1.2 Operator, stated once

**V-CENSUS.** Population = every pixel of the region. Achromatic = saturation
`(max−min)/max < 0.35` **and** `V = max(R,G,B)/255 > 0.08` — JET-SIL's own sky-mode airframe
mask. Report the achromatic V median, mean, max, and the share above V 0.8, **area-weighted
by pixel count**. Script: `/private/tmp/.../vmeas.py` (scratch; the operator is fully stated
here, and `tools/art/jetsil.py` already ships the identical mask).

**Instrument validation.** Run on `reference/ab2-arcade-desert.png` x[85,182] y[82,140] —
one of the two TRUE-NATIVE 320×224 arcade PNGs in the repo, and REFERENCE.md's own published
daylight-jet crop. The desert sky and ground are S = 1.00, so the achromatic mask isolates
the aircraft cleanly: n = 672 px, and the bbox of the returned mask is 93×56 inside a 97×58
box — i.e. it found the jet, not the frame. I cropped it at 6× and looked
(`tools/out/sprite-r6/arcade-day-jet-6x.png`) before using a single number from it.

### 1.3 The arcade's own ladder, measured

| colour | V | share of its airframe |
|---|---|---|
| `#ffffef` | 1.000 | 35.6 % |
| `#f7e6b5` | 0.969 | 26.5 % |
| `#a48484` | 0.643 | 14.3 % |
| `#d6d6a4` | 0.839 | 8.3 % |
| `#ceb59c` | 0.808 | 6.1 % |
| `#ffffff` | 1.000 | 3.7 % |
| `#948463` | 0.580 | 3.1 % |

**62 % of the arcade's airframe sits at V ≥ 0.969**, and the darkest substantial tone on it
is **0.580**. Our old `deepWarmShadow` was `#422921`, V 0.259 — darker than anything on the
arcade's aircraft except its nozzle throat.

### 1.4 What shipped

`PLAYER` in `tools/art/palettes.js`, and its transcription `PLAYER_PALETTE_DAY` in
`spriteFactory.js`:

```
lightTop   #ffffef  V 1.000   MEASURED, arcade dominant
midNeutral #d6d6a4  V 0.839   MEASURED, arcade mid tone
coolDark   #a48484  V 0.643   MEASURED, arcade shadow tone
deepShadow #635252  V 0.388   MEASURED, the arcade's darkest airframe tone
canopy     #e694f7            MEASURED — REFERENCE.md's own 95 % set. The old
                              #9d3aca was a dark violet two thirds of that
                              value and is not in the arcade's set at all.
```

**Role AREA turned out to matter as much as role value, and that is the non-obvious half.**
R5's sheet spent 29.9 % of the sprite on `midNeutral` against 22.2 % on `lightTop`, so the
brightest tone was not the dominant one. On the **night** sheet — whose palette was already
correct and measured — that alone held the median at 0.773 against the arcade's 0.969. Day
and night share one geometry, so area is the only lever that reaches both; the engine bodies
and the dorsal deck are now `lightTop`, and both medians land where they should.

### 1.5 The lead's warning was right, and here is the evidence it was acted on

> *"It may have overshot into flat near-white and lost the grey midtones that give the
> airframe form."*

It had. The first R6 draft used `#e6e6c5` (V 0.902) as the second tone, chosen so the median
would land at the very top of the judge's 0.78–0.92 band. At ΔV 0.098 from `#ffffef` it is
invisible: `tools/out/sprite-r6/ours-day-level-8x.png` from that draft is one flat white
blob with no modelling. I cropped it, looked, and **moved the median DOWN a step** to
`#d6d6a4` (V 0.839) to buy real contrast, then added a dark wing trailing edge and shaded
body flanks. A median one step lower with form on it beats a median at the top of the band
with none.

### 1.6 Results — day and night measured separately

**Authored sheet, level cell (cell 4):**

| | day | night |
|---|---|---|
| achromatic V median | **0.839** | **0.969** |
| max | 1.000 | 0.969 |
| share V > 0.8 | 70.9 % | 56.7 % |
| colours in the cell | 8 | 7 |

**In-game, jet-on/jet-off difference mask** (`tools/art/isolate_jet.py`, operator I8; day
`tools/out/sprite-r6/f-on` vs `f-off` at tick 600, night at tick 4400, `?fixed=1&seed=1&
nocombat=1&noclouds=1`, the night pair with `&hidejet=1`). Jet span **342–348 px**, which is
above the ~250 px threshold below which JET-SIL is meaningless:

| | day | night | judge's gate |
|---|---|---|---|
| achromatic V median | **0.839** | **0.969** | 0.78–0.92 |
| brightest body colour | **1.000** | 0.969 | ≥ 0.90 |
| share V > 0.8 | 69.5 % | 57.0 % | — |

**Day passes the published gate on both halves.**

### 1.7 A defect in the gate itself — for the criteria lane, not fixed here

The judge's band is **0.78–0.92**. The arcade's own **native** frame returns **0.969**, above
the band's ceiling. The band came from 686×480 video, where blur mixes white airframe with
blue sky and drags the median down — my own run of the same operator on
`stage1-level-flight-t116.png` x[270,430] y[185,278] gives **0.792**, and the judge's gives
0.839, on the same aircraft the native frame reads at 0.969.

A 4-tone sprite's median can only land **on** one of its four values, so 0.969 and ≤0.92
cannot both be satisfied. I targeted the gate, not the arcade, and the ~0.13 under-shoot is
stated rather than hidden. **Ledger row proposed in `judging/R6/ask-sprite-art.md`.**

The night figure is also fragile for a different reason worth recording: three of the six
measured night blue-greys (`#7384b5` S 0.365, `#6373a4` S 0.396, `#425284` S 0.500) sit just
outside the 0.35 saturation gate, so the night "achromatic population" is only 14.4 % of the
sprite. The number is real but it is computed over a seventh of the aircraft.

---

## 2. GAP 2 — the procedural fallback

### 2.1 Night: the actual defect, closed

`SHEET_URLS` held 8 day-only entries behind `if (detail && !night)`. There are now **16**
sheets — 4 liveries × 2 aspects × day/night — generated by the same function from the same
control points, so a night sheet cannot drift from its day sheet. The gate is now
`if (detail)`.

**Reproduction, satisfied.** `tools/out/sprite-r6/f-s3/frame-0003.png`, an ordinary
`?fixed=1&seed=1&invincible=1&noclouds=1` run at tick 4 800. **HUD STAGE digit reads 3**
(cropped and read at 3×, bottom panel of `r6-02`). The largest enemy spans **144 px = 15.0 %W**
and is built entirely from exact night-sheet livery hexes.

R4 gap 1's four criteria, run with `tools/art/enemysil.py` on the night sheet cells:

| | `grey` night head-on | `grey` night rear | `interceptor` night head-on | target |
|---|---|---|---|---|
| fuselage width | 12.9 % of span | 12.9 % | 25.8 % | ≤ 35 % |
| leading-edge sweep | 20.4° / 20.5° | 18.7° / 19.3° | 30.4° / 29.9° | ≥ 15° |
| largest **compact** feature | 2.9 % of area | 2.3 % | 1.4 % | ≤ 12 % |
| distinguishable types | `mig` and `delta` both fly stage 3 (grey line, interceptor elite) | | | ≥ 2 |

The naive largest-single-colour reading is 18.7–31.0 %, as `enemysil.py`'s own header
predicts for any real aeroplane — the compact-component gate is the one the criterion means.

`judging/R6/r6-02-stage3-enemy-R5-TOP-R6-BOT.png` is the judge's R5 evidence over the same
situation in R6.

### 2.2 A failed or not-yet-decoded sheet is now LOUD

This is the deeper half of the gap and it is done in three places:

1. **Decode failure** logs `console.error` naming the key and URL. `tools/capture.mjs`
   escalates console errors to a non-zero exit, so a decode failure now **fails every
   capture** instead of silently changing the art.
2. **Every fall-through to the procedural detail path is counted**, and the first per
   combination logs `console.warn`.
3. **`window.__spriteSheetStatus()`** reports expected / loaded / failed / pending plus the
   full fallback census, so a run can *assert* zero rather than infer it from pixels.

`node tools/art/sheet_probe.mjs --ticks 4800 --every 600 --url-params "invincible=1"`:

```
selfTest: { detected: true, before: 0, after: 1 }
expected 16, loaded 16, failed {}, pending [], proceduralUses {}, proceduralTotal 0
OK: 16/16 sheets decoded, 0 procedural detail fallbacks.
```

**The zero is instrumented.** `__spriteSheetSelfTest()` asks for a texture under a livery key
that has no sheet — the same code path a decode failure takes — and checks the counter moved;
the probe runs it first and fails the whole run if the control does not fire, because a
counter that reports zero is exactly the clean, plausible, stable number this project keeps
paying for.

### 2.3 Far LOD — DECLINED, with the reason

The gap says *"either author night and far-LOD sheets or make the procedural path draw the
same silhouette"*. **I did neither for the far LOD, deliberately.**

- *"Draw the same silhouette"* reintroduces a measured bug. At 3–9 native px the sprite is
  1–4 screen **rows** tall; any transparent row is a frame where the aircraft vanishes, and
  `enemySprite.js`'s own header records 27 of 80 frames of one approach rendering zero
  pixels before the fully-opaque far texture was introduced. The far sprite reads by VALUE,
  not by shape, on purpose.
- *"Author a sheet"* would deliver the same four flat bands from the same palette, at the
  cost of 8 more files, and would not change a pixel.
- The gap's own reproduction is specified at **≥ 15 %W ≈ 48 native px**, nearly five times
  the 10 px detail switch. The four silhouette criteria are not measurable in the far band.

**What the far LOD genuinely needed, and now has.** It was a *second, drifting copy of the
palette*: `enemySprite.js` carried a hand-written livery table beside the authoring one in
`tools/art/palettes.js`, and by R5 they had already diverged (`camo.highlight` was `#8cad31`
in one and `#5a3a19` in the other). A drifted fallback palette is invisible precisely because
the fallback only runs where nobody captures. `tools/art/build.js` now emits
`src/assets/sprites/enemy-palettes.generated.js` from `ENEMY_LIVERIES`, and `enemySprite.js`
imports it — one source, drift impossible rather than merely discouraged.

**This is the one assigned item I did not deliver as written. If the judge disagrees with the
reasoning, authoring the 8 far sheets is about twenty minutes.**

---

## 3. The enemy polarity (art critic, §3.3)

### 3.1 I re-measured rather than taking the direction on trust, and it holds

**Operator ENEMY-V**, stated so it can be re-run: crop the aircraft; reject the sky (day:
`R < 60 AND B > 170 AND B > R+100`, which removes the `#009eff` family and the whole
video-blur ramp out of it; night: `max(RGB) ≤ 40`); report V median and the shares below 0.3
and above 0.7 over what remains.

| | median V | V < 0.3 | V > 0.7 |
|---|---|---|---|
| ARCADE stage 1, `stage1-level-flight-t116.png` (HUD digit **1**) x[150,195]-[266,256], n=2641 | **0.627** | 11.9 % | 38.6 % |
| the critique's own independent crop of t100.75 | 0.557 | 23.2 % | 41.1 % |
| OURS R5, `enemy-grey-rear.png` cell 2, airframe only | **0.322** | 43.7 % | 4.9 % |
| OURS R6 | **0.549** | 0.0 % (keyline carries the dark share) | 45.5 % |
| ARCADE stage 3 night, `stage3-night-lockon-t186.png` (digit **3**) x[288,172]-[303,187] | **0.675** | 27.0 % | 48.6 % |
| OURS R6 night | **0.643** | 0.0 % | 45.5 % |

The arcade's night enemies are **bright saturated blue** (`#222fa5`, `#2340be`, `#3c59d7`)
against the black sky — not darker than the day ones, which is what our night ramps were.

### 3.2 What changed

Each livery gained a fifth airframe tone (`shadow`), spending the last of the 8-colour
per-sprite budget, so the dark share lives on the undersides where the arcade puts it rather
than over the whole aircraft. Stage-1 liveries (`grey`, and `interceptor`, which flies as
stage 1's elite) were lifted; **`camo` and `prop` were deliberately left dark** — GAME_SPEC §4
puts them on stage 2, whose sky is orange, and there the arcade's enemies *are* dark. The
original defect was applying stage 2's polarity to stage 1; the fix must not apply stage 1's
polarity to stage 2. `judging/R6/r6-03-enemy-liveries.png` shows each livery on its own stage
sky.

**In-game:** `tools/out/sprite-r6/f-s1/frame-0002.png`, a stage-1 enemy at **18.1 %W**
rendering the authored day sheet — pale grey-white with a red intake ring against the blue
sky. `judging/R6/r6-04-stage1-enemy-ours-TOP-arcade-BOT.png` puts it under the arcade's.

### 3.3 Where I did NOT tune, and why

I did not chase the medians to two decimal places. Both arcade day readings are from 686×480
video; blur biases the day figure **up** (bright sky) and the night figure **down** (black
sky), and the two day frames disagree by 7 points of median and 11 points of V<0.3. The
critique says so itself — *"treat 0.557 as an upper bound, not a target"*. The ramps bracket
the arcade's distribution; the residual is here rather than in a tuned constant.

---

## 4. GAP 7 — the jet reads flat

Fixed after gap 4, as instructed, and the art critic's prediction was **half right**: the
value fix removed most of the "grey, muddy" read, but three real shape errors remained and
one of them was the opposite of what the gap text said.

**Operator ROW-RUNS**, on `reference/stage3-night-level-t175.png` x[207,487] y[227,306]: mask
`max(RGB) > 30`, largest 8-connected component (JET-SIL's own dark-background form, so these
anchors and the acceptance numbers see the same pixels); per row, the maximal runs, reported
as run centre and width in % of SPAN, row as % of H. SPAN 251, H 77.

### 4.1 The wings were swept the wrong way vertically

| | arcade | R5 ours |
|---|---|---|
| wing top edge, root → tip | 68.2 %H → 59.0 %H (**rises 9.2 %H outboard**) | 55.8 %H → 73.3 %H (**drops 17.5 %H outboard**) |

**The arcade's wingtips sit higher on screen than its wing roots. Ours drooped.** R5's gap
text asks for *"anhedral"*; the crop and the row-runs both say the opposite, and per CLAUDE.md
the crop wins. Recorded here rather than silently inverted — **this is a gap-text correction
the criteria lane should carry.**

### 4.2 The fin blades were short, thin and symmetric

| | arcade | R5 | R6 |
|---|---|---|---|
| fin band as a share of H | **58 %** | 43 % | **58 %** |
| blade width, tip → root (% span) | 1.2 → 5.6 | 3.0 → 3.0 | 2.2 → 5.6 |
| blade outer edge | near vertical (−17.7 → −16.1 % span) | symmetric taper | near vertical |
| blade inner edge | raked inboard (−16.5 → −10.5) | symmetric taper | raked inboard |

A swept fin with a near-vertical leading edge and a raked trailing edge, not a parallel
sliver. The old symmetric blades are what read as rabbit ears. This is the single biggest
shape change in the redraw.

### 4.3 Nacelles are separate rounded bodies

At 67.5 %H the arcade's row reads `[wing −49.2..−21.8] [pod −17.7..−12.1] [body −9.8..+10.2]`
— the pod is its **own run**, standing proud of a narrow centre fuselage. Ours were bulges on
a full-width bar. The pod is now a **rounded square**, 12 % of span wide by 9.3 % of H tall,
matching the crop; `canvas.js` has `disc`/`ring` but no ellipse and the pose transform scales
a single radius, so it is drawn as an octagon polygon. The hot nozzle disc went from ~48 % of
the pod's diameter to ~60 %, which is the crop's proportion.

The centre body now tapers to a point downward (21.5 % of span at the wing line → 6.4 % at the
bottom, the arcade's own progression) instead of being a constant-width strip.

### 4.4 Numbers re-checked afterwards, as instructed

Draw to the crop, then re-check — not the other way round. `tools/art/jetsil.py`, in-game at
342–348 px span:

| | arcade t175 | R5 sheet | R6 day in-game | R6 night in-game | band |
|---|---|---|---|---|---|
| two-blade fin rows | 100 % | 100 % | **100 %** | 95.2 % | 99–100 % |
| fin-pair extent | 35.5 % | 37.1 % | **36.8 %** | 37.9 % | 30–40 % |
| nozzle separation | 30.0 % | 30.9 % | **30.7 %** | 30.2 % | 25–35 % |
| blade cant | 1.28 | 1.22 | **1.25** | 1.25 | ≥ 1.15 |
| aspect SPAN/H | 3.26 | 3.23 | **3.17** | 3.05 | 3.0–3.6 |

Nothing regressed; cant and fin-band fraction both moved **toward** the arcade.

**One discriminator reads below the arcade and I am not hiding it:** the night sheet's
in-game two-blade figure is **95.2 %**, against 100 % on the night sheet cell itself and 100 %
on the day sheet in-game. Cause: the measured night palette has no black, so its keyline
(`#425284`, max channel 132) passes JET-SIL's `max(RGB) > 30` mask where the day keyline does
not, and bridges the blade pair on three rows near the fin root. That is a property of the
arcade's own measured night palette meeting our operator, not a drawing defect — but it is
below the 99 % band and should be judged as such.

### 4.5 `cant` was measured between a blade and a pod for two iterations

Worth recording because it is a measurement bug, not a drawing bug, and it produced a
plausible number. JET-SIL takes `cant` at the **last row of the fin band**, and the band runs
to the first row whose filled width reaches 0.30·S. With the fin root one or two rows too
high, the blades ended *above* that row and the last fin row held only the nacelle-pod tops —
so the statistic compared a blade's half-separation with a pod's, and returned **1.13** on a
drawing whose blades are canted 1.29. Fixed by lowering the fin root so the blade is still
present on the last fin row, and by shrinking the pod so its top is not inside the fin band.
The 1.13 was stable and reproducible and completely wrong about the art.

---

## 5. The two-copies problem is now a gate, not a comment

`levelOps()` in `tools/art/sheets/player-f14.js` and `drawJetSilhouette()` in
`spriteFactory.js` draw the same aircraft and cannot share code (one runs in node, the other
statically imports three.js and PNG assets through Vite). Both files already carried a
shouting *"change both or neither"* comment — and in R5 they diverged anyway, shipping a
different, worse daylight aircraft for a whole round.

`python3 tools/art/mirror_check.py` now compares, with comments stripped:

```
  OK   16 anchor constants match
  OK   bladePoly: 20 items match
  OK   wingPoly: 14 items match
  OK   podPoly: 24 items match
  OK   drawing program: 277 items match
OK: the sheet generator and the procedural fallback draw the same aircraft.
```

**Validated on known-bad input, twice.** Changing one coordinate from `61` to `62` in the
fallback is caught at token 93 with both contexts printed; flipping one sign inside `podPoly`
is caught at token 10. The second control is why the token stream includes **arithmetic
operators**: `podPoly` contains no numeric literals and no role names, so without them its
comparison reported a vacuous *"0 items match"* — exactly the clean zero CLAUDE.md says to
crop and look at. The keyline call is excluded with a stated reason (the sheet applies it in
`drawFrame` via `canvas.outline4`, the fallback inside the drawing); nothing else is.

The check is syntactic. It does not prove the two rasterize identically — only running both
would — but it catches the failure that actually happens.

---

## 6. I broke the build for about ten minutes, and the lesson is reusable

Renaming the `slate` role to `coolDark` (so the two copies could be compared) touched the
drawing but not the two palette tables. Symptom: `TypeError: Cannot read properties of
undefined (reading 'slice')` ten frames deep inside `hexToRgb`, at module construction, with
`window.__frameReady` never set and **the whole game failing to boot**.

**`npx vite build` passed the entire time.** It is a property access, not a syntax error. A
green build is not a boot.

Two things came out of it:
- `buildJetTexture()` now checks the eight role names explicitly and throws naming the
  missing one.
- `tools/capture.mjs`'s error dump had already been moved into `finally` by the lead this
  round; without that I would have had only a bare puppeteer `TimeoutError`. It is worth
  keeping.

Every figure in this report was re-measured on the current tree **after** that fix.

---

## 7. Capture hygiene

- Every capture set swept for black frames **and duplicates**: `f-s3` 4 frames, means
  120.0 / 105.6 / 105.9 / 16.0, 4 distinct md5s; `f-s1` 5 frames, means 122.3–123.3, 5
  distinct md5s. 0 black, 0 duplicate.
- Stage identity from the **HUD digit**, never the tick count — the stage-3 digit is cropped
  and legible in `r6-02`.
- One false positive caught and corrected before publication: my first "which pixels are
  enemy" detector keyed on the full livery palette including `intakeRing #e61000`, which the
  **HUD also uses** — it reported 1 089 "night-livery pixels" on a daylight stage-1 frame.
  Restricted to the five airframe tones it returns **0** on that frame and 10 710 on the
  night one. Same wrong-population defect class, caught by the figure being implausible.
- `tools/art/sheet_visibility.py` re-run after every art change: **0 invisible (sheet, cell,
  size) combinations** across all 19 sheets, 6–24 px for enemies and 24–160 px for the player.

---

## 8. Open, carried forward

1. **The judge's gap-4 band ceiling (0.92) is below the arcade's own native reading (0.969).**
   Ledger row proposed; see `ask-sprite-art.md`.
2. **R5 gap 7's "wings need anhedral" is the wrong sign** — §4.1. Gap text, not code.
3. **Night two-blade reads 95.2 % in-game** against a 99–100 % band — §4.4. Caused by the
   measured night palette having no black keyline. Either the operator needs a night form or
   the band needs a night row; both are criteria-lane calls.
4. **The five authored enemy bank poses are never selected.** `textureFor()` in
   `src/entities/enemy.js` does not pass `bankDeg`, so every enemy in the game renders cell 2.
   Not my file; one line. See `ask-sprite-art.md`.
5. **The arcade's stage-1 line enemy on t116 is green-and-white CAMO, not grey.** Our `grey`
   livery is now pale per GAME_SPEC §4's "white/grey MiG-types (stage 1+)", and that is the
   right polarity either way — but which livery flies stage 1's line is `enemy.js`'s call and
   the frame disagrees with the spec. Flagged, not acted on.
6. **The barrel-roll sheet is still unwired** (built, measured, inert since R5). Its palette
   was lifted with the rest in R6 so it cannot read darker than the poses it interrupts.
7. **The nine bank poses are still a rotated and foreshortened planform**, as STATUS says.
   The dorsal surface never comes into view. Unchanged this round.
8. **The daylight nozzle is `#ef7300` while the measured night nozzle is `#ff7500`** — the
   same arcade sprite, so one of them is probably wrong. Nobody has measured the nozzle on a
   daylight frame. Left alone: changing it touches the JET-SIL nozzle mask and it is outside
   the three assigned gaps.

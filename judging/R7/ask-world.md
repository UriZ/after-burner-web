# R7 — world lane, cross-lane asks

Five asks. A1–A3 are for the **criteria lane** (REFERENCE.md), A4 is for **game flow**
(`game/flow/cards.js`), A5 is for whoever owns the camera constant. Every figure cited here is
reproduced in `judging/R7/lane-world.md` with its operator and population.

---

## A1 — SEA-DASH: publish the patch, CLIP IT AT ROW 198, and state the count gate as a density

The R6 judge's gap 3 asked for the chosen row offset to be written into REFERENCE.md. It needs
three edits, not one, and the second is the load-bearing one.

**(1) Publish the patch.** `tools/measure_sea_dashes.py` now names it in code and in its
docstring: **`PATCH_ROWS = 150, 160, 170`, each patch 48 rows tall, `x[20,300)`**, with
`--all-offsets` running the gate over all three. The three offsets sample ground distances
48.3 → 8.6, 24.9 → 7.2 and 16.3 → 6.5 on this project's camera, so sweeping the offset sweeps
depth; the arcade's dash geometry is near-invariant under it and that invariance is the real
criterion. Please copy the three offsets into REFERENCE.md rather than naming one.

**(2) Clip the patch at native row 198. Two of the three offsets currently measure the bottom
HUD, on both sides.** Our bottom HUD occupies native rows **198–219** — *derived*, not assumed:
over 24 stage-1 frames at 71-tick spacing, the below-horizon pixels that are byte-identical
across every frame (the sea scrolls at 68.93 world units/s, so an invariant one is an overlay)
are exactly those rows. REFERENCE.md's own Criterion B operator already excludes rows 196–216 as
HUD on the arcade's native frames, so the criterion contradicts the document one section away.

Cropped and looked at: the largest "foam" component in the rows 170–218 patch is **243 px at
native rows 199–208, carrying `#f70000`, `#f7f7f7` and `#0000f7`** — the red STAGE label and the
white SCORE digits. It reads 243 px before and after this round's sea work, which is why no
amount of tuning moves it, and it is the whole of the `area max ≤ 200` failure the R6 judge
reported at the two lower offsets.

**(3) With the patch clipped, the three patches are 48, 38 and 28 rows tall, so a flat
"count ≥ 300" is meaningless.** State it as a **density: components per 1 000 patch pixels**.
The arcade reads 28.94 / 30.83 / 32.40 on the three clipped offsets; this build reads
28.0–28.6 / 27.4–27.6 / 25.9–26.4 (R6: 32.81 / 24.06 / 17.86).

---

## A2 — restate why the two anisotropy criteria were retired: the statistic's variance exceeds
the effect

Ledger rows 16 and 17 retired the sea anisotropy figures because two operators under one name
disagreed in sign (4.95× → 3.04× common-res, 4.56 and moving the other way at native). **The
retirement is right and the published reason is weaker than the real one.** Two controls on our
own build, neither needing an arcade side:

| control, one build | result |
|---|---|
| common-res ratio, changing ONLY the resample filter (10 frames) | **3.21** bilinear (what the tool uses), **4.04** nearest, **3.92** box, **3.83** lanczos |
| common-res ratio, bilinear, frame to frame (10 frames) | **1.52 – 4.63**; `hx` **7.54 – 32.96** |
| native ratio, frame to frame (8 frames) | **2.30 – 9.13** |

The regression the criteria were retired over is 4.95 → 3.04. **One build spans 1.52–4.63 on a
single frame, and the resample filter alone moves the median by 26 %.** So the rows should read
*the statistic's own variance exceeds the effect it was asked to detect, on both operators* —
which is a stronger and more transferable reason than a disagreement between two readings, and
it tells the next author what a usable replacement would need (a stated population and a
stated resample, not a single frame).

---

## A3 — the value p5–p95 spread band is narrower than one rung of our own palette

REFERENCE.md gives the arcade's sea value spread as **0.302–0.329**. Our palette is on the
arcade's 16-entry ladder subset, so our p5 and p95 are both ladder values and the spread can
only take values that are integer multiples of one rung, **0.0646**. Measured across 67 frames
it takes exactly four values — 0.192, 0.259, 0.322, 0.451 — which are 3, 4, 5 and 7 rungs. The
published band is 0.027 wide, i.e. **0.42 of a rung**, and the only attainable value inside it
is 0.322.

This matters because it is a hidden coupling, not a nitpick: this round `seaLodBoost` had to go
2.6 → 3.2 to keep the near-patch V-identity above its 50 % floor (the worst of 67 frames was at
**48.24 %** before, **51.11 %** after), and that moved the spread from 0.322 to 0.259 — from
inside the band to one rung below it, with no attainable value in between. **Two published
criteria whose attainable values are one rung apart cannot both be satisfied.** Please either
widen the band to a rung-aligned interval or record the quantization as a known limit on the
criterion so the next author does not spend a round chasing it.

Also worth a ledger note on the same instrument: `tools/measure_sea_acf.py`'s spread figure is
the one the R6 judge "could not reconcile" (0.290 published, 0.259–0.451 measured). The
reconciliation is the quantization above plus a large frame-to-frame spread, not a tool bug —
the tool's selftest reproduces all seven published arcade figures exactly.

---

## A4 — `game/flow/cards.js` carries the last three off-ladder colours in the world frame

After this round's sky and ground ladder work, a 40-frame `?fixed=1&seed=1&nocombat=1&hidejet=1`
walk reads, classified by HUD digit and by whether a stage card is on screen: **stages 2 and 3
with no card emit ZERO channel values off REFERENCE.md's enumerated 31-entry ladder** (12 and 14
frames), stage 1 with no card emits exactly one (`159`, the deliberate `#009fff` exemption, 12
frames), and the two card frames emit six — `19, 192, 198, 220, 238, 248`. They are `cards.js`'s
three constants:

| constant | value | source |
|---|---|---|
| `CARD_RED` | `#ff1300` | t124, a 686×480 video frame |
| `CARD_CYAN` | `#00dcc6` | t124 |
| `STAGE_LAVENDER` | `#eec0f8` | t124 |

All three are measured off video and none sits on the ladder; their nearest ladder neighbours
are `#f71600` (or `#f70000`, which the HUD already uses), `#00d6c5` and `#e6c5f7`. The HUD lane
made exactly this move in R6 and it cost nothing visually — 22 of 22 HUD colours are on the
ladder now. Six channel values on card frames is not currently failing anything (stage-2 worst
frame reads A2 28 against ≤32), but it is the only remaining off-ladder ink in the world frame
and it is a one-line change. Stage 1's `#009fff` sky (channel value 159) stays off-ladder
deliberately — it is a judged constant and snapping moves it to `#00a4f7`.

---

## A5 — carried from R6, unchanged and still not ours: the horizon sits several rows below the
arcade's

R6 measured the arcade's stage-1 haze band as peaking at native rows 130–134 and already at
54 % coverage by row 138, i.e. straddling a horizon several rows **above** ours. Our horizon is
at 62.5 %H (native row 140), which is the published value and is driven by `game.js`'s camera
pitch. I held it again. The consequence is unchanged: rows 140–145 read ~97 % haze where the
arcade reads 54 %, and nothing in `ground.js` can fix it.

It also now costs a second thing. Stage 3's background dominant-colour share reads **85.3 %
against the arcade's 92.0 %**, and the entire residual is our full-width horizon glow band
measured against an arcade frame that is **banked**, so its glow is a diagonal wedge occupying
only part of each row. On the glow-free sub-band rows 160–195 the two sides match to within
2.5 points on every statistic. Settling the full-band figure needs a true-native **level-flight**
stage-3 frame — which is the same acquisition blocker the criteria lane already has as item 1.

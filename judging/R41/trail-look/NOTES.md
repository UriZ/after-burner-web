# R41 trail-look — "the missiles should have less of a gigantic smoke trail" (owner, 2nd time)

Owner played the R40 build — which had already cut per-trail width and screen coverage INTO
the arcade's measured band — and said the trail is still gigantic. So the band was never the
defect. Files owned: `src/weapons/missiles.js`, `src/effects/smoke.js`,
`src/effects/trailPalette.js`. The R35 missile engine flame (`projectileSprites.js`) is not
touched.

---

## 1. THE MECHANISM — R40 TUNED AN OBJECT THAT DRAWS 1 % OF THE TRAIL

Three systems can put white on screen for a missile: the **ribbon mesh** (a continuous,
spindle-profiled, scalloped strip — the arcade-correct shape), the **aged puff chain**
(discrete opaque ellipses), and the **launch billow**.

R40 re-measured the arcade and spent the round on the ribbon: `HALF_FRAC_*` 0.05/0.075 →
a 0.009–0.040 spindle. Suppression isolation at one fixed tick says that was the wrong object.

**Operator.** `?fixed=1&seed=7&demo=2`, `--warmup 401 --frames 1` → tick 402, the tick the TL
pointed at. Instrument validated first: `--warmup 401 --frames 1` vs frame 0033 of a
`--warmup 300 --every 3` run → **0 differing pixels** (and `--warmup 399` is off by two ticks,
which is how I know the equality is real and not a tolerance). Each suppression is a
single-constant edit, captured, then the file restored from `missiles.js.orig` and the boot
gate re-run.

| suppressed | differing px vs base | bbox |
|---|---|---|
| **aged puff chain** | **52 317** | (285,3)–(959,488) — the whole diagonal |
| launch billow | 882 | (408,387)–(467,485) — a patch ON the jet |
| **ribbon mesh** | **486** | (444,450)–(482,476) — a 38×26 stub at the pylon |

`iso-nopuff/frame-0000.png`: with the puff chain off, **the trail is gone entirely.** There
is no ribbon behind it to see.

**Why the ribbon is invisible**, from `_retire()`: *"The ribbon is dropped immediately on
impact … The aged PUFF chain already emitted stays and dissipates."* The missile flies nearly
along the view axis, so during its 0.8–2.4 s flight the ribbon subtends a stub beside the jet;
the instant it hits, the ribbon is reset and pooled while the chain lives on another
1.15–1.6 s. **Every trail the player actually looks at is pure puff chain.**

So the picture reads as cotton balls for four compounding reasons, none of them area:

1. the visible object is a chain of ~21–29 **discrete** ellipses, not a strip;
2. they are emitted on a fixed 0.055 s clock while the missile **accelerates**, so late in
   flight the on-screen step exceeds the ellipse length → **visible gaps**;
3. `fracStart 0.07 → fracEnd 0.105` means a puff **grows as it ages**, and the oldest puffs
   sit at the launch point → **the fattest ball is the one nearest the jet**, the exact
   inverse of the arcade spindle (thin at both ends, crest 40 % of the way back);
4. `drawTrailPuff` is five concentric **fully opaque** ellipses with a hard outer edge at
   `ell(1.0)` — no soft or ragged boundary anywhere, against an arcade ribbon that is
   translucent and ragged at its edges.

Items 1–4 are all shape. R40's numbers were honest and its object was wrong.

**Not the R40 cloud false lead.** R40 killed a look-alike (a white ball on the jet that turned
out to be a stage-1 cumulus). This is a different object, and the palette proves it: the chain
samples `#e6e6e6 #efefef #dedede #f7f7f7`, which are `SMOKE_RAMP` rungs. `CLOUD_PALETTES.day`
is `#f7f7f7 #e6e6f7 #d6d6e6 #c5c5d6 #b5b5c5 #a4a4b5` — every rung but the first has B > R = G,
and the three greys carrying most of the chain appear in it nowhere.

**Pictures:** `sbs-labelled.png` (full frames, arcade / before / after) and `sbs-zoom.png`
(the same trail at matched scale, 23.3 % of frame width per panel) — both built with
`tools/compare_sheet.py`, blue = arcade, orange = ours.

---

## 2. THE ITERATION — EACH STEP CAPTURED, CROPPED AT MATCHED SCALE, AND LOOKED AT

Every step is one change, captured at the same fixed tick 402, cropped to the same 23.3 %
of frame width as the arcade, and judged by eye before the next. The boot gate
(`combat_probe --ticks 60 --url-params "demo=1&seed=7"`) ran after every save.

| step | the one change | what the picture then said |
|---|---|---|
| s1 | ribbon OUTLIVES its missile (`_retire` keeps it, `update` ages it) | continuous at last — and a ~110 px (16 %W) white **banana**. The shipped ribbon width had never actually been on screen. |
| s2 | `HALF_FRAC_PEAK` 0.040 → 0.022 | reads as a ribbon, but a dead-straight hard-edged **white road**. |
| s3 | lump wavelength 15 → 7.5 samples, amplitude up | **barely moved** — so the knob was interrogated rather than tuned again. |
| ctl | lump amplitude 0.9 (synthetic control) | one slow swell across the whole crop, not eight lobes → my sample-spacing assumption was wrong. |
| ctl2 | lump wavelength exactly 2 samples | bumps countable: **~25 native px per sample**, not the ~6.7 I had assumed. |
| s4 | trail puff 32×20 → 30×24, spindle size profile, distance spacing | **fused round lobes** — the arcade's texture — but far too fat. |
| s5 | crest 0.100 → 0.065, step 0.045 → 0.028 | thin and continuous, now too **smooth**: no beads. |
| s6 | per-lobe size + lateral scatter (counter-driven) | beaded, ragged, continuous. The trail is right. |
| s7 | launch billow cut to a wisp | the white mass on the jet is gone. |
| s8 | puff life 1.15–1.6 → 0.95–1.25 s, ribbon 1.7 → 1.35 s | extent drops into the arcade's band. |
| final | crest 0.065 → 0.058 | width median lands on the arcade's. |

### The structural finding at ctl2 — why the ribbon could never be the answer

A 2-sample wavelength is the finest a 3-vertex-per-sample strip can express, and at ~25 px
per sample that is a ~50 px feature rendered as **square stair-steps**. The arcade's lobes are
~50 px and **round**. So the ribbon can reach the arcade's lobe SCALE and can never reach its
SHAPE. That killed the "fix the ribbon" direction outright and sent the work to the puff chain
— which is the arcade's own construction: round masses overlapping by about half.

### The emitter was the defect, not the size

A fixed 0.055 s clock spaces puffs by whatever the missile's screen speed happens to be, and a
missile accelerates to V_MAX. At ~25 px/tick that is ~82 px between puffs against a ~100 px
sprite — 18 % overlap, and a gap as soon as it is faster. `PUFF_STEP_FRAC` makes overlap a
constant of the construction (~57 %) regardless of speed, and costs **less**: the clock was
oversampling the slow early phase to cover the fast late one.

## 3. WHAT SHIPPED

`src/weapons/missiles.js`
1. **The ribbon outlives its missile** (`fadingTrails`); `clear()` drops them. Width cut to a
   core (`HALF_FRAC_MIN/PEAK` 0.009/0.040 → 0.004/0.014), life 1.7 → 1.35 s.
2. **Distance-spaced emission** — `PUFF_STEP_FRAC = 0.028` with a `PUFF_MAX_GAP_S = 0.18`
   floor for a missile whose screen position barely moves. Replaces `PUFF_INTERVAL_S`, deleted.
3. **Spindle puff sizing** — `fracStart 0.028 → fracPeak 0.058 → fracEnd 0.022` (was a
   monotonic 0.07 → 0.105, i.e. fattest at the launch point, on the jet).
4. **Per-lobe size and lateral scatter**, counter-driven. No rng draw.
5. **Puff life** 1.15–1.6 → 0.95–1.25 s.
6. **Launch billow** cut to a wisp: lobe step 0.055 → 0.028, frac 0.035/0.07+ → 0.012/0.028+,
   life 0.42+ → 0.22+. The two `rng()` draws are untouched.

`src/effects/smoke.js` — trail puff canvas 32×20 → 30×24 (aspect 0.625 → 0.80); optional
`fracPeak` spindle profile on `spawn` (omitted = the old straight line, so the billow and the
kill residue are bit-identical). `trailPalette.js` — unchanged.

The R35 missile engine flame (`projectileSprites.js`) was not touched.

## 4. NUMBERS — DESCRIPTION, NOT JUSTIFICATION

Smoke measured against **ground truth**, not a colour mask: a second capture of the same seed
and ticks with all three smoke systems zero-sized (every `rng()` draw preserved), differenced
per frame. 150 frames, `?fixed=1&seed=7&demo=2`.

| | ours FINAL | arcade (re-measured this round) |
|---|---|---|
| trail LENGTH | median **30.6 %W** | 41.8 %W on f0033; band 27–43 |
| width, median along the trail | **5.0 %W** | **4.89 %W** (p75 5.72) |
| width, widest point | median **8.0 %W** | **8.08 %W** |
| smoke screen cover | median **1.14 %**, p90 4.38 | 2.79 % for the one trail in f0033 |
| live trail sprites, whole field | peak **38**, mean 4.9 | — |

Arcade operator: 60 Hz consecutive decode `-ss 105.0 -t 1.0` of `ab2-longplay-60fps.mp4`;
mask V>0.80 ∧ S<0.20, 8-connected, component chosen **by looking**; perpendicular width by
PCA with 12 px bins. It reproduces R40 §2's band on an independently decoded frame.

Our p90 length (62.6 %W) and p90 width-max (10.5 %W) are frames where **two** trails fuse into
one component; the arcade shows at most two at once as well (R40 §8.3).

## 5. CONTROLS, AND ONE OF MY OWN INSTRUMENTS THAT FAILED

- **Capture equality validated before use**: `--warmup 401 --frames 1` vs frame 0033 of a
  `--warmup 300 --every 3` run → **0 differing pixels**; `--warmup 399` is off by two ticks,
  so the equality is real rather than a tolerance.
- **Determinism**: two separate capture processes, same tick → **0 differing pixels**.
- **Comment-only edits**: after the final comment corrections, the same tick re-captured →
  **0 differing pixels**, so those edits are provably behaviour-free.
- **The lump knob was interrogated, not trusted**: when s3 "barely moved", a 0.9-amplitude
  control proved the knob registers and a 2-sample-wavelength control measured the sample
  spacing. The real cause was a wrong assumption about spacing, not a dead knob.
- **MY FIRST BILLOW ISOLATION WAS INVALID AND I CAUGHT IT.** Suppressing the billow with
  `if (false) this.smoke.spawn('billow', …)` does not evaluate the argument object — which
  contains **two `rng()` draws**. Skipping them shifted the shared PRNG stream and the whole
  simulation diverged: the "billow" diff came back as 42 606 px spanning nearly the entire
  frame including the HUD. Re-run with the draws preserved (`fracStart: 0`,
  `fracEnd: 0 * (0.07 + rng() * 0.025)`), the real figure is **11 727 px in a 224×149 box on
  the jet**. CLAUDE.md's shared-stream bug class, walked into and caught by the result being
  implausible. The puff and ribbon suppressions in §1 contain no rng draws and are unaffected.
- **A detector I built and then refused to publish.** Counting pixels whose colour is exactly
  a `SMOKE_RAMP` rung looked like a way to measure the R40 build's smoke without reverting the
  tree. Validated against the suppression ground truth it scores **recall 1.000, precision
  0.587** — it is a CEILING, 41 % of what it counts is cloud, HUD and airframe. Restricting
  the rungs trades it for recall 0.351. So there is **no before/after smoke-area figure in
  this report**: the honest instrument needs a tree revert I judged not worth the risk on a
  shared tree, and the pictures carry the claim instead.

## 6. FOR THE TL

- **`GAME_SPEC.md` §3 still carries the withdrawn launch-billow clause** ("a launch that
  throws big white smoke billows that briefly occlude part of the screen") as MEASURED. R40
  flagged this and it is still there. It is the sentence that sized the mass this round had to
  cut off the jet, and it will re-inflate it the next time anyone builds to the spec.
- **`REFERENCE.md` needs no correction from this round** — my independent decode reproduces
  R40's corrected band (median 4.89 %W, max 8.08 %W, cover 2.79 %). R40's numbers were right;
  its object was the ribbon, which draws ~1 % of the trail.
- **Residual, stated honestly.** Our missile's screen path is still longer than the arcade's,
  so two simultaneous trails can fuse into a 62 %W component where the arcade stays nearer 42.
  Shortening it means touching `SPLAY_*` / `HOMING_GAIN`, which are owner-approved flight feel
  (R26/R34). Same conclusion R40 reached in its §8.7, and I am not overriding an owner-approved
  behaviour on my own initiative.

# R40 missile-smoke lane — "too much of it" (owner)

Owner played the R37 build: *"smoke of my missiles needs work, too much of it. make it
closer to the original game."* This is a correction of R37's own deliberate enlargement.

Files owned and changed: `src/weapons/missiles.js`, `src/effects/smoke.js`,
`src/effects/trailPalette.js` (the last two: stale-citation corrections only, no behaviour).
`REFERENCE.md` corrected (§6). The R35 missile engine FLAME (`projectileSprites.js`) was
not touched.

---

## 1. THE R37 NUMBERS WERE MEASURED ON A CLOUD

R37 doubled the trail on a standing instruction in REFERENCE.md:

> **Head thickness: 10.9%W = 35 native px on stage 1** … Our build ships 15.4 native px
> — inside the old band and **conservative by a factor of ~2** … Raise toward 35 px for
> stage 1.

and sized the launch billow on the same block's *"launch mass 39.1 %W × 50.0 %H"* and
*"a launch throws large white smoke billows that briefly occlude part of the frame
(t99.75–t101)"*.

**All three describe one object, and that object is a stage-1 cumulus billboard fused with
the sea foam.**

REFERENCE.md's operator was: mask `V > 0.80 ∧ S < 0.20`, **largest 8-connected component
inside the window x[260,700] y[360,720]** of `reference/stage1-missile-salvo-t100.75.png`,
84 509 px. Reproduced: with no window the largest component on that frame is **93 648 px at
bbox x[0,661] y[316,719]** — the same blob, merely clipped by the window. The window
**cropped the contaminant rather than excluding it**. `refframe-components.png` draws every
component on the cited frame; the 84 k blob is the big white cone in the lower centre, and
the trail is nowhere inside the window.

**Tracked at 60 Hz across the very span the note cites** (t99.98 → t101.18,
`arc-track-mass.png`):

| frame | t | cover | bbox w × h |
|---|---|---|---|
| f0060 | 99.98 | 10.40 % | 38.9 × 31.9 %W |
| f0072 | 100.18 | 15.08 % | 44.9 × 40.5 %W |
| f0084 | 100.38 | 12.61 % | 57.7 × 32.3 %W |
| f0096 | 100.58 | 14.44 % | 72.8 × 32.1 %W |
| f0108 | 100.78 | 13.71 % | 62.2 × 40.3 %W |
| f0120 | 100.98 | 22.73 % | 45.6 × 56.8 %W |
| f0132 | 101.18 | 28.93 % | 47.2 × 65.0 %W |

Grows monotonically ×2.8 in 1.2 s, is rooted on the bottom screen edge in every frame
(y1 = 719, continuous with the sea), and **the player's jet flies clear of it throughout**.
That is a billboard cloud approaching the camera. Smoke leaving a pylon starts AT the jet;
this starts far from it and swells. Same silhouette as the small cumulus sprites at the
top-left of the same frame.

## 2. WHAT THE ARCADE TRAIL ACTUALLY MEASURES

**Operator** (`measure_arc.py`, stated in the file): mask `V>0.80 ∧ S<0.20`; 8-connected
components, **no window**; the trail component chosen **by looking** at the labelled overlay
(`comp-f0084.png`, `comp-f0365.png`, `comp-f0393.png`), never by "largest" — on stage 1
the largest is always the cloud+foam blob, which is the defect in §1. Perpendicular
width = PCA major/minor axes, 8–12 px bins along the major axis, per-bin width =
(pixels in bin)/(bin length). Source: 60 Hz consecutive decode of the stage-1 salvo span,
`t = 99.0 + (i−1)/60`.

| frame | t | screen cover | length | median width | p75 | max |
|---|---|---|---|---|---|---|
| f0084 | 100.383 | **1.98 %** | 34.6 %W | 4.00 %W | 5.95 | 8.03 |
| f0096 | 100.583 | **2.41 %** | 33.3 %W | 5.06 %W | 6.17 | 8.66 |
| f0365 | 105.067 | **2.81 %** | 27.0 %W | 8.06 %W | 9.87 | 11.74 |
| f0379 | 105.300 | **3.11 %** | 43.4 %W | 5.18 %W | 5.88 | 8.76 |
| f0393 | 105.533 | **2.79 %** | 41.8 %W | 4.90 %W | 5.63 | 8.09 |

Width profiles along the ribbon (12 px bins, %W full thickness) show a **spindle**, thin at
both ends:

```
f0393 2.5 4.3 6.5 5.5 4.2 3.9 4.9 4.4 3.7 4.8 5.6 5.3 3.7 4.5 5.9 6.7 6.4 4.9 4.4 6.3 7.4 8.1 7.8 6.6 5.1 5.4 4.4 5.1 4.9 3.6 2.5 1.5 1.1 1.3 0.5
f0084 0.6 1.5 1.2 0.9 1.0 0.9 1.5 3.0 5.3 7.2 7.8 7.2 6.6 6.2 7.2 7.4 6.0 5.1 5.1 4.9 4.3 4.2 3.5 3.9 3.9 3.1 3.3 2.5 0.9
f0365 1.2 2.8 6.5 8.7 10.4 11.6 11.1 9.6 9.6 8.8 8.9 10.5 10.3 9.5 8.4 7.3 6.6 6.1 5.6 4.1 3.8 4.1 2.1   (freshest/nearest)
```

**ARCADE TARGETS — the band to build to:**
- trail BODY full thickness **4.0–8.0 %W**; widest point anywhere **11.6 %W**.
- total LENGTH **27–43 %W** — stable; it leaves by screen exit, it does not keep growing.
- ONE trail covers **2.0–3.1 %** of the screen.
- **no launch billow at all.** 60 Hz decode of the t104.73–105.07 launch
  (`arc-launch.png`): the trail starts narrow right at the missile and the jet is never
  occluded. Across the whole 7 s salvo span (`arc-sheet-full.png`) the screen stays
  overwhelmingly blue — never more than one or two thin ribbons at a time.
- profile is a **SPINDLE**: peak at 0.22–0.60 of the way back, both ends 0.5–2.5 %W.

A sky-white scan over the span (`sky_white_scan.py`) gives median **2.77 %**; its p90/max
(14.6 / 33.6 %) are the cloud frames — the same contaminant as §1, which is why the
per-trail table, not the scan, is the target.

### R37's shipped values vs this measurement

| quantity | R37 shipped | arcade (R40) | verdict |
|---|---|---|---|
| ribbon head, full thickness | 10 %W | 4.0–5.2 %W median | **2× too big** |
| ribbon old end | 15 %W | 8.0–11.7 %W peak | **too big** |
| ribbon taper direction | wedge, fattest at the oldest sample (on the jet) | spindle, fattest mid-trail | **wrong shape** |
| launch billow union | ~25 %W × 49 %W | nothing ≥ 11.6 %W anywhere | **far too big** |
| aged-puff life | 1.5–2.2 s | extent holds at 27–43 %W | **too long** |
| aged-puff visible width | 6.3 → 8.8 %W | 4.4–5.4 %W | too big |

The pre-R37 head of **15.4 native px (4.8 %W) was right all along.** R37's "conservative by
a factor of ~2" was the factor between a missile trail and a cumulus cloud.

## 3. OURS BEFORE — same operator

`ours-before/` (`?fixed=1&seed=7&demo=2`, 60 Hz consecutive, warmup 90).

| frame | biggest white component | bbox | all white in frame |
|---|---|---|---|
| 0168 | **5.39 %** | 35.9 × 28.8 %W | 7.83 % |
| 0172 | **6.09 %** | 38.1 × 29.4 %W | 9.10 % |
| 0176 | **6.97 %** | 40.6 × 29.7 %W | 8.96 % |
| 0178 | **6.84 %** | 41.6 × 23.4 %W | 9.66 % |

2.2–3.4× the arcade's per-trail footprint, and the shape is wrong: an **aspect ~1.3 blob
centred on the jet**, not a ribbon leading away. `ours-before/frame-0172.png` is the owner's
complaint in one picture — the jet is buried.

## 4. CHANGES (`src/weapons/missiles.js` only; the other two files are comments)

1. **Ribbon width + shape.** `HALF_FRAC_YOUNG/OLD` (0.05/0.075, a monotonic wedge) replaced
   by a measured **spindle**: `half(u) = MIN + (PEAK − MIN)·sin(π·u^K)`, `MIN = 0.009`
   (1.8 %W), `PEAK = 0.040` (8.0 %W), crest at `u = 0.4`. Full thickness now runs
   1.8 → 8.0 → 1.8 %W against the arcade's 0.5–2.5 / 7.8–11.6 / 0.5–2.5. The wedge put the
   ribbon's fattest samples at its oldest ones, which in this engine sit at the launch
   point — i.e. on the jet, the one place the arcade has no thick smoke at all.
2. **Launch billow**: `fracStart` 0.10 → **0.035**, `fracEnd` 0.24–0.29 → **0.07–0.095**,
   `BILLOW_LOBE_STEP_NDC` 0.17 → **0.055**, life 0.95–1.15 s → **0.42–0.56 s**, jitter
   scaled to match. Union ~0.25×0.49 → **~0.095×0.18**, inside the 11.6 %W ceiling.
   **rng draw count per lobe unchanged (4)** — the shared PRNG stream is untouched
   (CLAUDE.md's shared-stream bug class).
3. **Aged puff life** 1.5–2.2 s → **1.15–1.6 s**; ~40 → ~29 live puffs per missile.
   Deterministic counter-driven scatter kept — no rng draw.
4. **Aged puff size** long axis 0.10/0.14 → **0.07/0.105** (visible width 6.3→8.8 %W becomes
   **4.4→6.6 %W**), so the chain sits inside the narrowed ribbon instead of spilling past it.
5. **Stale-citation corrections** in `missiles.js` header, `trailPalette.js` and `smoke.js`:
   every comment that cited "39.1 %W × 50.0 %H", "10.9 → 36.2 %W" or the launch-billow
   clause as a measured trail fact is now marked withdrawn with its provenance. These were
   the comments the next agent would have trusted. No behaviour change (verified: diff
   excluding comments is empty).

## 5. VERIFICATION

Boot gate after every save: `node tools/combat_probe.mjs --ticks 150` and
`--ticks 60 --url-params "demo=1&seed=7"` both exit 0 with state JSON.

**Same seed, same ticks, same operator** (`ours-before/` → `final/`):

| frame | before (R37) | after (R40) | arcade |
|---|---|---|---|
| 0168 | 5.39 % | **1.89 %** | 2.0–3.1 % |
| 0172 | 6.09 % | **2.28 %** | |
| 0176 | 6.97 % | **2.77 %** | |
| 0178 | 6.84 % | **2.44 %** | |

bbox 36–42 %W × 23–30 %W → **26–28 %W × 12–15 %W**. Total white in frame 7.8–9.7 % →
4.4–4.9 %. **The after figures include the jet's own grey-white airframe**, so the smoke
alone is less than shown — the comparison runs against us.

**Look** (the test that decides it): `sbs-arcade-before-after.png` (arcade / before / after
at matched %W scale) and `sbs-ribbon-3way.png` (before / width-cut / spindle, cropped on
the jet). The jet goes from buried to fully readable; the trail reads as a ribbon leading
away instead of a sheet parked on the airframe.

### Instrument controls run this round

- **Determinism**: same code, same tick, two separate capture processes → **0 differing
  pixels**. The capture is exact, so a non-zero diff means a real change.
- **Suppression registers**: zeroing `HALF_FRAC_*` moved the measured coverage 2.28 % →
  2.14 % at the same tick, so the component-isolation runs below were reading real edits,
  not a cached module.
- **Warmup path**: `--warmup 262 --frames 1` ≡ `--warmup 90` frame 172 → 0 differing pixels.

### A false lead, chased and killed — the big white ball on the jet

In `?demo=1` captures a ~30 %W white ball sits on the jet for seconds at a time, and it
looked like the owner's complaint surviving the fix. It is **not missile smoke**:

- component-isolation at one fixed tick (`diagX-base` / `-nopuff` / `-nobillow` /
  `-noribbon`): **all four byte-identical**, so none of the ribbon, the puff chain or the
  billow contributes to it;
- its colours are `#f7f7f7 #e6e6f7 #d6d6e6 #c5c5d6 #b5b5c5` — **exactly `CLOUD_PALETTES.day`
  from `render/clouds.js`, all six rungs in order**. The trail/billow ladder is achromatic
  (`trailPalette.js` emits value multipliers on grey) and *cannot* produce `#e6e6f7`, which
  has B > R = G.

**It is one of our stage-1 clouds passing the camera — and that is arcade-correct**: §1 shows
the arcade doing exactly this, growing to 28.9 % of the screen with the jet flying through
it. No action; recorded so the next agent does not re-chase it. It is also the third time
this project has mistaken a cumulus for smoke (R5 trail geometry, R10 kill residue — see
`smoke.js`'s KILL SMOKE block — and now this).

My own first reading of this ball was wrong: I attributed it to the ribbon on a diagnostic
run that compared *different ticks*, and wrote that claim into a source comment before the
fixed-tick control refuted it. The comment was corrected before shipping; the spindle change
it had been used to justify stands on the three measured arcade width profiles in §2 and is
coverage-neutral (1.89–2.77 % with the spindle vs 1.91–2.74 % with the plain width cut), so
it is a shape correction at equal area, not a size change.

### Capture hygiene note

`ours-before` and `final` were taken hours apart on a shared tree, and a sibling lane
changed `src/assets/sprites/enemy-*.png` + `enemySprite.js` in between. The two captures
differ by 630 px (0.098 %) in distant *enemy* sprites. The smoke measurements are unaffected
(identical to 0.01 pp at the same tick), but the before/after frames are not byte-comparable
outside the smoke.

## 6. REFERENCE.md CORRECTED

The "Trail geometry" block now carries a boxed withdrawal of its geometry rows with the
provenance from §1, a new **"Trail geometry — RE-MEASURED R40"** table with the §2 operator
and a closed tolerance band, the colour/value rows retained and marked as still standing,
and the launch-billow clause struck with its replacement evidence.

## 7. FOR THE TL — cross-file, not touched

- **`GAME_SPEC.md` §3 still carries** *"a launch that throws big white smoke billows that
  briefly occlude part of the screen"* as MEASURED. It is the same withdrawn clause; §3 is
  not this lane's file. It should be struck or re-sourced, or it will re-inflate the billow
  the next time someone builds to the spec.
- Simultaneous-missile count (6–8 in flight, overlapping salvos in `combatDemo.js` /
  spawner) is what sets total screen smoke density once per-trail width is correct. Per
  missile we are now inside the arcade band; whether the arcade really has 6–8 trails up at
  once is worth a look, because across 7 s of its densest salvo footage I never saw more
  than two.

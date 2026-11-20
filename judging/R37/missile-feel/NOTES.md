# R37 missile-feel lane — trail look (owner ask) + far-kill depth (R36 gap #2)

Files owned: `src/weapons/missiles.js`, `src/effects/smoke.js`, `src/effects/trailPalette.js`.

## 1. Arcade trail — what was reused vs newly measured

**Reused (REFERENCE.md "Trail geometry", measured R5; not re-measured):**
- Trail is WHITE in every stage: stage-1 mean V 0.9674 / sat 0.0504, night ~6% dimmer.
- Value structure is FLAT (bright/dark quintile ratio 1.07) — no internal value taper.
- Per-row width 10.9 %W at the missile end → 36.2 %W at the launch end; launch mass
  39.1 %W × 50.0 %H; 100 % column occupancy.
- **Open instruction in REFERENCE.md itself: head thickness measures 35 native px
  (10.9 %W); our build ships 15.4 px — "conservative by a factor of ~2 … Raise toward
  35 px for stage 1."** This round executes that instruction.

**Newly measured this round (60 Hz consecutive decode, `ffmpeg -ss 99.0 -t 7 -i
ab2-longplay-60fps.mp4 -vsync 0`, stage-1 span per STAGE_MAP; frames in
`arc60-t99/`, t = 99.0 + (i−1)/60):**
- **Persistence**: tracking the t≈100.1 launch (f0066→f0138, crops in
  `track-launch1-crops.png`): a trail segment stays visible ≥ **1.2 s** and ends by
  **drifting off-screen with the camera pan, not by fading in place**. Still bright
  white at its last visible frame.
- **Aging ladder**: continuous column with flame head (~0–0.3 s) → fat billowing
  column with scalloped edges (~0.3–0.5 s) → overlapping round puffs (~0.5–0.7 s) →
  discrete spaced round puffs (0.7 s → screen exit). Individual aged puffs read
  ~4.4–5.4 %W (f0106, 45–55 px of 1028).
- **Edges are lumpy everywhere** — the column is visibly built of round masses; no
  straight edge longer than a couple of puff diameters.
- Width vs missile: the arcade trail head (10.9 %W) is ~3–5× the missile sprite's
  width; ours before this round was 1.7× (4.8 %W head vs 2.8 %W missile).

## 2. Ours before (same operator: deterministic 60 Hz, `?demo=2` salvo, seed 7,
`ours-before-salvo/`, sheet `ours-before-sheet.png`, crops `crop-before-*.png`)

Defects, in player language:
1. **The smoke is one fused amorphous white SHEET centred on the jet** — launch
   billow + wide ribbon ends + puffs merge; the jet flies buried in it.
2. **The ribbon reads as flat polygonal slabs** — straight edges, visible corners;
   a white road, not smoke (crop-before-0096.png: the arm to the upper-right).
3. Head too thin at 4.8 %W (REFERENCE.md says raise to ~10.9 %W).
4. Aged chain evaporates in place at 1.0 s (arcade: ≥1.2 s, leaves by screen exit).

## 3. Changes (src/weapons/missiles.js only; smoke.js / trailPalette.js untouched)

1. **Ribbon head width 4.8 %W → 10 %W** (`HALF_FRAC_YOUNG` 0.024 → 0.05), old end
   13 %W → 15 %W (0.065 → 0.075). Executes REFERENCE.md's standing "raise toward
   35 px" instruction; 32 px at the head, scallop peaks reach ~35.
2. **Scalloped edges** (`LUMP_*`): per-sample width multiplier 0.70–1.30× from two
   incommensurable sinusoids over the sample index, phase stepped by the golden
   angle per launch. Deterministic — no rng draw, so no PRNG-stream shift. Mean
   width (the measured quantity) unchanged. Kills the flat-polygon-slab read.
3. **Aged puff chain persists and thins**: per-puff life 1.0 s → 1.5–2.2 s
   (counter-scattered, deterministic). Floor 1.5 s ≥ the measured ≥1.2 s segment
   persistence; the scatter makes the chain thin into SPACED puffs as it ages
   (the arcade's discrete-puff phase) instead of evaporating all at once.
   Puff sizes re-tied to the new ribbon (long axis 0.10 → 0.14).
4. **Withdrawn same-session by crop-and-look**: a first attempt grew puffs to
   long-axis 0.33 over 2.0 s to "match the ribbon wedge" — produced a fused grey
   storm cloud parked on the jet (`ours-after-sheet.png`). The arcade's aged
   chain is small discrete puffs (4.4–5.4 %W); the 36.2 %W launch-end width is
   the launch-billow region, not segment ballooning. Reverted to discrete-chain
   design above (`ours-after2-sheet.png`, `crop-after2-0096.png`).
5. Engine flame (R35, owner-liked): untouched — it lives in projectileSprites.js.

## 4. Task B — locked missiles resolve at the lock's depth (R36 gap #2)

**Mechanism** (`INTERCEPT_T_*`, `V_DASH_MAX` in missiles.js): each LOCKED missile
carries an intercept deadline `T_F = clamp(0.6 + gap0/90, 0.6, 1.4) s` and each
tick flies at `max(profile_v, (target.d - depth)/tRemain)`, capped at 110. The
closed loop compensates the target's own closure, so far locks resolve near the
depth where the lock was made. Close targets: vNeed is small, so the R26 slow
watchable profile wins unchanged (owner's "see the heat-seeking" preserved where
it is visible). Flight times land 0.6–1.4 s — back INSIDE GAME_SPEC §3's
MEASURED 0.5–1.5 s launch→impact band, which the R26 slowdown had pushed past
2 s for far shots. DRY (no-lock) shots never get a deadline — R36 straight
flight + proximity fuse untouched. Lock difficulty / acquire times untouched
(lockSystem.js not modified).

**Verification**: below (kill_depth_probe before = `judging/R36/depth-combat/
killdepth-final.json`, same tree modulo sibling R37 lanes' own files).

## 5. Verification

**Instrument caveat.** The R37 build window ran 4+ lanes' headless browsers at
once (load average ~600); the R36 probes' 10–30 s navigation budgets produced
three straight zero-frame TimeoutErrors. `kill_depth_probe_r37.mjs`,
`fairness_probe_r37.mjs` and `capture_r37.mjs` in this directory are
PATIENT-TIMEOUT copies — only timeouts differ from the originals (plus the
kill-depth copy ALSO drains `__missileDrain`, so locked-hit flight times are a
measured sample rather than a by-design claim). `ours-after3-salvo/`,
`ours-after3b-salvo/`, `ours-after3c-salvo/` are those failed zero-frame runs
(manifest only) — ignore them; the valid captures are `ours-before-salvo/`,
`ours-after-salvo/` (withdrawn attempt), `ours-after2-salvo/`, and
`ours-final-salvo/` (final, includes the puff-life scatter).

### Kill-depth (bins at the kill tick, NEAR ≥12 %W / MID 3–12 / FAR <3)

Baseline (R36 final, pre-change tree):

| seed | arm | kills/min | near/mid/far frac |
|---|---|---|---|
| 7 | aimed | 40 | 0.138 / 0.850 / 0.013 |
| 42 | aimed | 38 | 0.092 / 0.908 / 0.000 |
| 3 | aimed | 37 | 0.122 / 0.824 / 0.054 |
| 7 | handsoff | 28 | 0.268 / 0.732 / 0.000 |
| 42 | handsoff | 26 | 0.269 / 0.712 / 0.019 |
| 3 | handsoff | 26 | 0.231 / 0.769 / 0.000 |

Arcade: ~22 % FAR. Win threshold this round: aimed FAR ≥ 10 %.

After (this tree, `killdepth-after.json`): PENDING

### Fairness (deaths/min, seeds 4/5/6 × 180 s, ?demo=1; band ±10 % of 2.000)

Baseline (R36 `fairness-after2.json`): 2.000 / 2.000 / 2.000.
After (`fairness-after.json`): PENDING

### Flight times (locked hits' `age` at the crossing = launch→impact)

GAME_SPEC §3 MEASURED band: 0.5–1.5 s. After: PENDING

## Cross-file requests

- none yet

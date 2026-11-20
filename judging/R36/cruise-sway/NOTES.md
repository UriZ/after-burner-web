# R36 cruise-sway lane — notes

Gap #4 (playtest, player language): "Flying straight is a flat screensaver" — centered-stick
cruise is dead static vs the arcade's constant motion.

## 1. What the arcade actually does (60 Hz consecutive decode, validated operators)

**Operators** (both in this dir, both validated on synthetic controls before use):
- `horizon_op.py` — per-column sky-run scan + Theil-Sen line fit → horizon y (%H) and tilt
  (deg, + = descends right). Controls: known +4 px shift recovered **+4.00 px exactly**; known
  2.000° rotation recovered 1.958–2.005° (on arcade frames) and 1.996° (on our frames).
  **Known floor**: candidates are integer pixel rows, so tilts ≲0.5° and sub-pixel y quantize
  to exactly 0 — fine for the arcade's 10–50° weave, see §4 for how ours was measured.
- `jet_track.py` — brightness centroid of the jet in a fixed box (tanker dock, bright sprite
  on black). Control: synthetic interior blob, known (−2,+3) px roll recovered exactly.
  Crop-and-look catch: the blinking RELOAD WEAPONS text doubled the mask and swung the
  centroid ±50 px until the box excluded it.

**Sampling**: all arcade numbers from `ab2-longplay-60fps.mp4`, consecutive 60 Hz decode
(`-ss T -t D ... -vsync 0`), 1028×720. Time-alignment with the map-keyed file verified at
t=110 (same SCORE 50610, same pose).

**Finding A — "straight-and-level cruise" barely exists in arcade combat.** Spans t=204–216
(stage 4) and t=262–270 (stage 6): no stretch ≥0.25 s holds |tilt|<1° except one scripted
respawn dive. The longplay player weaves continuously: **tilt p2p 38–56° in every 2 s
window, smooth at ~1–1.5°/frame (~60–90°/s), quasi-period 2–5 s** (sign changes every 1–2.5 s);
horizon y wanders 30–55 %H. That motion is STICK motion, not an idle system.

**Finding B — the arcade's true hands-off segments are mostly STILL.** The only
centered-stick arcade footage is the two scripted refuel beats:
- Tanker dock (t=162–170): the docked jet sits **pixel-frozen for 1+ s** (cx 569.4±0.05 for
  a full second), between **slow drifts of ~30–48 px (3–4.7 %W) over ~2 s**. Tilt n/a (black sky).
- Runway approach (t=246–254): lane-line cross-correlation (control: 3 px shift recovered
  ±0.002 px) shows lateral world wander of **±3–4 px (±0.35 %W) over ~2 s while settling,
  then dead frozen (±0.05 px)**.
- Wherever a level horizon IS fit, tilt reads **exactly 0.0** — the scaler is quantized level;
  the arcade does not roll-jitter at idle.

**Conclusion**: the arcade has NO large idle-sway system. Its cruise "life" is the player's
weave. The two measured anchors are ~0 (hands-off) and 38–56° p2p / 2–5 s (active weave).

## 2. Ours before (same operator, deterministic ?fixed=1 seed=1 centered stick, ticks 300–780)

Horizon **y = exactly 62.500 %H, tilt = exactly 0.000°** on every clean fit (frames with
n_cols≥30; the handful of outlier fits are cloud contamination at n_cols≈12–13, inspected
and discarded). The gap is real: mathematically frozen, which even the arcade's quietest
hands-off footage never quite is — and nothing like what a player sees in arcade cruise.

## 3. The fix (src/game/game.js only)

Idle sway, three channels, each two incommensurate sines:
- camera roll sway: 1.3° + 0.6° amps, T = 3.6 s / 8.3 s → tilt p2p ~3.4°
- camera pitch bob: 0.006 + 0.0025 rad, T = 4.7 s / 11 s → horizon y p2p ~1.6 %H
- jet bob: ±0.6 %H screen-frac equivalent, T = 3.1 s / 6.7 s (jet-vs-world relative motion,
  the one hands-off motion the arcade actually shows)

**Honesty of the band**: periods sit INSIDE the arcade weave's measured 2–5 s band
(secondaries slower, to break pure periodicity). Amplitudes are **ADOPTED, not measured** —
deliberately an order of magnitude BELOW the arcade's smallest active weave (3.4° vs 38° p2p)
and above our frozen baseline, because the two measured arcade anchors bracket (0 and 38°+)
and the gap demands something alive in between that can never read as autopilot.

Safety/determinism properties (all verified, §4):
- Phases from a PRIVATE prng stream (`seed ^ 0x53574159`), drawn 6× at construction, never
  again — no existing stream is reshuffled. Fully deterministic under ?fixed=1&seed=N.
- `this.worldRoll` is NEVER touched: sway composes into the camera quaternion only
  (roll sway added to the roll ANGLE — same axis, commutes; pitch bob composed after base
  pitch). The R34b barrel-roll logic and mod-2π normalization see exactly the pre-R36 values.
- Gain gate: flight-state only, fades out by ~8.6° of commanded bank, hard 0 during a barrel
  roll, 3/s slew (~0.33 s crossfade, no pops).
- Jet bob is **render-only by construction**: applied to sprite.position AFTER combat.update
  consumed the clean position; player.update recomputes from scratch next tick. (First draft
  fed it through player.baseY — upstream of combat — and was reworked; see §5.)
- `?nosway=1` escape hatch (the ?hidejet/?nocombat family) for isolation harnesses that
  assume a dead-level horizon (e.g. tools/hud_mask.py's clean frame).
- Probe fields in __flowState: swayGain / swayRollDeg / swayPitchRad / swayJetFrac.
  worldRollDeg stays pure player state — a "roll ended snapped level" probe reads that.

## 4. Verification

**Gameplay byte-identity**: `combat_probe.mjs` seed 1, 1200 ticks, sway vs ?nosway=1 —
**IDENTICAL** telemetry streams (with and without --debug polling). The sway cannot change a
combat outcome.

**Sway lands on design, measured on frames** (isolated capture, nocombat+hidejet+noclouds,
480 consecutive frames, ticks 300–780, `iso-after.jsonl`, 480/480 fitted):
- tilt p2p **3.42°**, smoothed zero-cross period **3.62 s** (design 3.4° / 3.6 s)
- horizon y p2p **1.61 %H**, period **4.78 s** (design 1.6 %H / 4.7 s)
Cross-check at the analytic extremes: predicted horizon rows 414.7 / 424.5 px, measured
414 / ~426 — pixel-exact, with the predicted tilt signs.
(The first normal-view after-capture read near-frozen: that was the operator's integer-pixel
quantization floor (≲0.5°) plus cloud-contaminated fits — NOT missing sway; resolved by the
isolated capture and the extreme-tick pixel check. The arcade numbers in §1 are 10–50× above
that floor and unaffected.)

**Barrel roll / bank / release** (`verify_roll_bank.mjs`, seed 2, telemetry + frames in
`verify-roll2/`):
- double right-flick → 65-tick rigid roll; sway fades to 0 inside the roll (max residual
  0.64° in its first third); **worldRollDeg = 0.00 exactly on every post-roll tick** — the
  roll still ends snapped level, no 2π unwind.
- held full bank: worldRoll reaches the measured 66.5° max, swayGain → 0.000, swayRollDeg →
  0.000 — sway never fights the player's roll.
- release: worldRoll → 0, gain → 1, sway resumes.
- death (seen on the seed-1 run): gain → 0 within ~0.3 s; title/launch states are gated the
  same way (flight-only).

**Look**: `before-after-sway.png` (frozen horizon vs visibly tilting/bobbing horizon with the
HUD staying level); after-strip from `look-after-seed2/`.

## 5. Corrections made along the way (so nobody re-walks them)

- A seed-1 probe run "proved" my first-draft jet bob flipped a death outcome. WRONG inference:
  the probe's own `--debug` polling consumes a shared-stream RNG draw per sample (documented
  in combat.js) and shifts the scenario. The render-only rework was kept anyway (strictly
  safer) and the identity proof redone without --debug.
- Before/after NORMAL captures are not comparable on combat content in this round: other
  lanes are editing spawner/shot files concurrently (seed-1 centered-stick now dies at ~t 9 s
  where the before-capture flew 13 s). All neutrality claims here come from same-tree
  sway-vs-nosway diffs taken seconds apart.

## 6. Files / repro

- Operators + analysis: `horizon_op.py`, `jet_track.py`, `analyze_sway.py`,
  `verify_roll_bank.mjs`
- Measurements: `arc-spanB.jsonl` (stage 4 t=204), `arc-spanC.jsonl` (stage 6 t=262),
  `arc-refuel.jsonl` (invalid — camera pitched down, no sky band; superseded by the
  lane-line correlation run inline in §1), `arc-tanker-jet.jsonl`, `ours-before.jsonl`,
  `ours-after.jsonl` (first-draft capture, quantization-floor artifact, kept for the §4
  story), `iso-after.jsonl`
- Captures kept on disk (~80 MB, reproducible): `ours-before/`, `iso-after/`,
  `look-after-seed2/`, `iso-pitchmin/`, `iso-pitchmax/`, `verify-roll/`, `verify-roll2/`.
  Repro: `node tools/capture.mjs --out <unique> --frames 480 --every 1 --warmup 300
  [--url-params "nocombat=1&hidejet=1&noclouds=1"]`; arcade spans:
  `ffmpeg -ss {204|262|162|246} -t {8|12} -i .reference-cache/video/ab2-longplay-60fps.mp4 -vsync 0 out/f%04d.png`.

**Not committed** (house rule). Files changed: `src/game/game.js` only. `src/core/cameraGeom.js`
unchanged (read-only use).

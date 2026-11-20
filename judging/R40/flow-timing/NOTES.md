# R40 flow-timing lane — NOTES

Owned files: `src/game/flow/**`, `src/game/score.js`. Arcade first for every number below.

Evidence frames: `judging/R40/flow-timing/arcade/{b12,b23,b34,d1,d2}` (consecutive decode,
no `-vf fps=`), `judging/R40/flow-timing/ours/**`.

---

## 1. Stage transition — ARCADE MEASURED

Decode: `ffmpeg -ss T -t D -i .reference-cache/video/ab2-longplay-60fps.mp4 -vsync 0 f%04d.png`
(1028×720, true 60 fps; `t = T + (i−1)/60`).

- `b12` = stage 1→2, `-ss 117 -t 10`
- `b23` = stage 2→3, `-ss 155 -t 8`
- `b34` = stage 3→4, `-ss 195 -t 8`

### The player NEVER loses control and combat NEVER clears

Confirmed by eye at all three boundaries. At `b12` t=123.03–124.75 enemies are on screen,
explosions are going off, and the jet banks under player input the whole time. The R4-era
design note in `flow.js` ("the tally is a timed OVERLAY that coexists with 'flight'") is
**upheld** — the R39 playtest's "the arcade gives a breath" is NOT a pause. The arcade will
even draw a tally over a DEAD player (gp t283.4).

### What the arcade does instead: a background PALETTE CROSSFADE

| boundary | tally card on | sky starts changing | sky settled | crossfade | card off | card duration |
|---|---|---|---|---|---|---|
| 1→2 | 122.900 | 123.000 (+0.100) | 123.767 | 0.767 s | 124.750 | 1.850 s |
| 2→3 | 159.833 | 159.967 (+0.134) | 160.867 | 0.900 s | 161.550 | 1.717 s |
| 3→4 | 200.900 | 201.083 (+0.183) | 201.717 | 0.633 s | 202.483 | 1.583 s |

Operator for "sky": modal colour of the band y[95,220] of the 1028×720 frame with the
HUD reticle column x[750,930] blanked, sampled every 7th pixel; "starts/settles" = first
frame whose next 20 frames all differ from the old / match the new modal colour by >40 /
<40 in RGB L2. Modal (not mean) because AB2's sky is a flat fill and sprites/clouds move
through the band — a mean put the b34 "settle" 2.8 s *before* the card, which is why it was
discarded. Cross-checked by eye on `b12` f355–f435 and `b34` f350–f410.

**Mechanism** (full res, `b34` f366 = t=201.083): the new stage's TILES are already drawn,
but the whole background is still at the OLD palette's darkness and ramps to the new one
over ~0.6 s. At `b12` the lerp from stage 1's `#009fff` to stage 2's `#f17600` passes
through a neutral grey-violet ≈(121,122,128) — exactly the washed frame at f375/f379. So it
is a **linear sRGB lerp of the background palette**, not a cross-dissolve of two images.

**Sprites and HUD are NOT faded.** On `b34` f366 the player jet is full-brightness
grey-white against a near-black background; SCORE/HIT/the tally card/the bottom strip are
all at full brightness.

**The tiles hard-cut at the fade midpoint.** On b12 the sky is washed to the neutral
mid-tone at f375 (t=123.233) while the terrain is still stage 1's coastline; the terrain is
stage 2's desert by f391 (t=123.500) → q = (123.4−123.0)/0.767 ≈ 0.52. Only b12 can date
this (stage 3's night ground is too dark to read), so one boundary is the whole evidence.

### "STAGE n" banner BLINKS

Detector: lavender ink (R>215, B>195, 130<G<215, R−G>40) in y[545,615] x[380,700].

| boundary | blink windows |
|---|---|
| 1→2 | 122.800–123.050, 123.333–123.583, 123.867–124.117, 124.400–124.650 |
| 2→3 | 159.767–160.017, 160.300–160.550, 160.833–161.083, 161.367–161.617 |
| 3→4 | 200.800–201.050, 201.333–201.583, 201.867–202.117, 202.400–202.650 |

Identical at all three: **4 blinks, 0.25 s on / 0.283 s off, period 0.533 s**, starting
**0.067–0.100 s BEFORE the tally card** and ending ~0.1 s after it. Ours drew it solid.

### Tally pay rate and the POINTS field

`b12`: SCORE steps by +20,000 at t=123.033, 123.167, 123.300 → **0.133 s per hit =
7.5 hits/s**, with +220 per 4 frames of passive on top (= 3,300/s). Ours:
`TALLY_HITS_PER_S = 7`, −6.7 %, inside the 10 % band → left alone.

Two real defects found here:

1. **The card's POINTS field is the BONUS ALONE, and ours showed score+bonus.** The arcade
   opens on "POINTS 00000" and walks 20000 / 40000 / … / 240000 while the SCORE field
   independently reads 113180 / 133620 / 154060 / 358460, and
   `reference/stage2-start-bonus-tally-t124.png` reads 8 hits → 160000 = 8 × 20,000. Ours
   drew `pointsStart + hits*HIT_VALUE*q` where `pointsStart` is the live score. Never
   caught because `?debugtally=1` — the only thing that has ever captured this card — hands
   `drawTallyCard` a hardcoded 160000 and never runs that line. Also **zero-padded to five
   digits** (a minimum, not a width: six-digit totals run one cell wider).
2. **Ours banked the whole bonus in one `score.add()` at card onset** while the card
   animated a separate counter, so the SCORE digits jumped and the card crawled. The arcade
   pays in 20,000 steps in lockstep with the card.

---

## 2. Death cycle — ARCADE MEASURED

`ab2-gameplay.mp4` (640×360, 30 fps — `t = T + (i−1)/30`). `d1` = `-ss 196 -t 18`,
`d2` = `-ss 253 -t 36`. Three clean deaths read (a 4th at gp t256 runs into a CONTINUE
card and is excluded).

| phase | death A (gp t200.8) | death C (gp t270.4) | death D (gp t280.2) |
|---|---|---|---|
| impact → fireball gone | 200.80 → 202.60 = **1.80** | 270.40 → 272.20 = **1.80** | ~1.8 |
| empty sky / hulk receding | 202.60 → 206.50 = **3.90** | 272.20 → 276.40 = **4.20** | — |
| respawn slide-in → normal scale | 206.50 → 208.10 = **1.60** | 276.40 → 277.60 = **1.20** | — |
| **impact → READY gone** | **~7.3 s** | **~7.2 s** | **~7.4 s** |

(Death D's cycle contains a whole stage transition inside it — the tally fires at gp t283.4
while the player is still dead.)

### RECONCILED with R7, and this is where the real defect was

My 0.2–0.3 s readings above and R7's 1/30 s contiguous pin on death A agree, but they are
measuring **different boundaries**, and `deathSequence.js` already had all three:

| boundary | arcade |
|---|---|
| hit → normal scale = **CONTROL** | **6.98 s** |
| hit → READY card gone | 7.70 s |
| hit → invincibility flash off | 8.67 s |

Ours held the stick for the WHOLE READY card: measured **7.00 s of `state === 'death'`**
on `?fixed=1&seed=4&forcedeath=3` before this change… no — **7.70 s** before, 7.00 s after.
So the R39 playtest's "~6.5 s death control lockout felt long" was right: 7.7 s against the
arcade's 6.98 s, and **the whole excess was the card**.

R7 found this in R7, named it "THE 0.72 s WE KNOWINGLY DIVERGE BY", and wrote down the fix
it would take ("decoupling the card from the phase … it needs a second parameter, not a
moved boundary"). R40 did exactly that. **No animation was shortened** — the tumble budget
is arithmetically identical (the formula subtracts the slide-in, and 6.98 − 0.98 is the same
6.00 s that 7.70 − 1.70 was), the slide-in still plays, and the card still lives its full
1.70 s with the measured yellow→cyan ramp spanning all of it.

- **Score freezes for the TUMBLE ONLY, not the fireball.** Death A accrues +3300/s straight
  through the explosion (391780 → 395740, t200.80–202.90), pins at 395740 for
  t202.90–205.60, and resumes at the RESPAWN (t207.10) — before control returns.
- **READY appears WITH the respawn jet**, not before it (yellow ink in y[100,330] x[180,460];
  death A 206.83 vs jet 206.50, death C 276.37 vs jet 276.40). An earlier by-eye read of
  "READY 1.4 s before the jet" was me misreading a 0.2 s sheet — **withdrawn**.

---

## 3. Scoring scale — ARCADE MEASURED, ours was ALREADY CORRECT

Read off the HUD in `b12` at 60 Hz:

- Passive accrual **+220 every 4 frames = 3,300/s**, frame-exact. Ours: `PASSIVE_RATE_PER_S
  = 3300`. ✅
- **+20,000 per hit**, paid at the stage-end tally. Ours: `HIT_VALUE = 20000`. ✅
- Kills pay **nothing** at the moment of the kill — only HIT moves. Ours: same. ✅

Arcade score magnitudes:

| arcade time | stage | SCORE |
|---|---|---|
| t=117.0 | 1 | 73,710 |
| t=125.0 (tally done) | 2 | 400,110 |
| t=162.0 (tally done) | 3 | 813,270 |
| t=201.08 | 4 | 1,032,370 |

**The arcade crosses 1 M entering stage 4 and is at 0.81 M entering stage 3**, and STAGE_MAP's
burst-c cross-check puts the same run at 7.74 M by stage 17. The R39 playtest's "hands-off
racks up ~1.1 M by stage 3" is **the arcade's own scale, not inflation** — nothing in
`score.js` to fix, and I changed nothing in it. No double-count: the bonus is paid by
exactly one path and `accrue()` is the only other writer. The complaint underneath it —
"score arrives without being earned" — is unearned KILLS, which belongs to the
threat-pacing / missile-ownership lanes.

---

## Changes shipped

All in owned files. `src/game/score.js` **unchanged** (measured correct).

| # | file | change |
|---|---|---|
| 1 | `flow.js` | Background **palette cross-fade** at every stage advance: sky lerps in sRGB over 0.77 s starting 0.14 s after the card; ground+clouds hard-cut once at the midpoint. New `_applyWorldStage` / `_updateStageFade`; `_enterStage(index, {fade})` — only the normal advance fades, every other entry stays instant so tick-0 captures are correct. |
| 2 | `flow.js` + `cards.js` | Tally card: POINTS is the **bonus alone, zero-padded to 5**; the bonus is **banked in 20,000 steps** as the card counts; the **"STAGE n" banner blinks** on the measured 0.533 s cadence. |
| 3 | `deathSequence.js` + `flow.js` | **Control returns at the arcade's frame.** `RESPAWN_S` split into `RESPAWN_SLIDE_S` (0.98, non-interactive) and `RESPAWN_CARD_S` (1.70, the card's life); `readyPhase` now measured against the card so the colour ramp still spans 1.70 s; `flow.js` carries the card across the death→flight handover (`_updateReadyCardTail`), yielding the shared overlay to a tally if a boundary lands inside it. |

### Verification

- **New fade, tick-exact** (`ours/fade12c`, `?fixed=1&seed=4&stage=1&invincible=1`,
  `--every 1`): sky leaves stage 1 at t=32.150, ground+clouds cut at t=32.533 (sky exactly
  half-way), sky settles t=32.900 → **0.75 s fade, swap at q≈0.5**. Matches the arcade's
  0.63–0.90 s and its midpoint swap. Banner blink visible in `ours/fade12c` frames.
- **New death timing** (`ours/death-ticks`, `?fixed=1&seed=4&forcedeath=3`, `--every 1`,
  state read from the capture's own flow state): `death` spans ticks **181→600, flight at
  601 = 420 ticks = 7.00 s** against the arcade's 6.98 s (1 frame). READY stays on screen
  over LIVE flight to ~tick 644 and ramps yellow→cyan there, as the arcade does.
- **R38 continue latch: 4/4 hold.** Diffed against
  `judging/R38/death-cost/verify_continue_result.json`: B, C, D byte-identical; A's sample
  sequence shifts by ONE grid slot (gameover arrives at sample 9 instead of 10) because the
  lockout is 0.72 s shorter. The property is intact — fire held through the card never buys
  a continue, lives stay 0 the whole way, flight → continue ×8 → gameover → title.
- **R37 stage-music re-key: PASS** — variant 0 → 1 → 2 across boundaries,
  `musicState: flight`.

### Fairness (death length changes flight-time exposure)

Run on a **scratch git worktree at HEAD** with only this lane's patch applied, so the live
tree's other in-flight lanes do not contaminate the comparison. That precaution earned its
keep: the LIVE tree's own run read shotsPerMin 20.6 against HEAD's 34.3, which is the
threat-pacing lane, not this one. Both arms, same worktree, 180 s/seed.

| | BASE (HEAD) | AFTER (HEAD + this lane) |
|---|---|---|
| deaths/flight-min, seeds 4,5,6 | 1.795 | 1.993 (**+11.0 %**) |
| deaths/flight-min, seeds 7,8,9 | 2.116 | 1.451 (**−31.4 %**) |
| **deaths/flight-min, POOLED 6 seeds** | **1.955** (26 deaths / 798.1 s flight) | **1.715** (23 deaths / 804.8 s flight) |
| deaths/min, pooled 6 | 1.444 | 1.278 |
| unannounced fatal hits | **0 on every seed** | **0 on every seed** |
| warning floor (min, per seed) | 1.183 / 1.200 / 1.183 | 1.183 / 1.183 / 1.183 |

**The two halves disagree in SIGN** (+11 % on 4/5/6, −31 % on 7/8/9), which is the whole
reading: 26 vs 23 deaths is **0.6 σ** on Poisson, and the ±10 % band is tighter than the
counting noise at this sample size — the probe's own source already says so ("far too few to
tune on"). Pooled, the statistic moves 1.955 → 1.715, i.e. slightly EASIER, not harder.

**Why seed-level A/B is structurally uninformative for a TIMING change**, and this is the
transferable part: moving the death window by 0.72 s shifts every subsequent event in the
run by that amount, which re-phases the demo pilot against the shared PRNG stream. That is
the benign form of CLAUDE.md's "shared PRNG stream sequencing" class — per-seed outcomes are
a fresh draw, not a perturbation of the old one. Only the pooled count carries information,
and at 23–26 deaths it cannot resolve a 12 % shift either way.

What IS solid, and is the constraint that actually guards fairness: **0 unannounced fatal
hits on all six seeds in both arms**, and the **warning floor held at 1.183 s** against its
≥1.167 s requirement. Pooled deaths/min (1.278) also sits inside the standing 1.333 ±10 %
band (1.200–1.466).

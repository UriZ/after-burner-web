# After Burner II — Gameplay Systems Spec

Breakdown of the systems the three.js rebuild must implement, from (a) the proven-stage
reference frames in `reference/` (extraction provenance in REFERENCE.md), and (b) the
Godot prototype at `../afterburner`, whose scripts encode many sessions of
reference-matching. Every item is tagged:

- **MEASURED** — backed by a cited frame/footage measurement (see REFERENCE.md for values).
- **ADOPTED** — the Godot prototype's tuned/verified behavior; the file carrying the
  tuning rationale is cited. Adopt the *behavior*; re-derive constants only with a measurement.
- **ASSUMED** — believed correct (arcade knowledge / plausible fill-in); needs verification
  before anyone treats it as ground truth.

**SAMPLING-RATE CAVEAT (R10), and it bites harder than the colour one below.** This file is where
this project keeps its **time**: durations, rates, cooldowns, delays, windows, periods. **Every
figure in it that touches time, measured before R9, was taken at 4 Hz (0.25 s) or coarser** — the
`tN` strips are 0.2–0.25 s grids — and the arcade events those figures are about are **shorter
than one sample**. The explosion holds within 60 % of its peak for **0.067 s**; the invincibility
flash's states last **0.10–0.13 s**; three arcade kills arrive in **0.367 s**.

> **Binding, REFERENCE citation field 6: every temporal figure in this file states its SAMPLING
> RATE as a number, on both sides.** A figure without one is **not a temporal measurement**; it is
> a still with a unit attached. Two consequences you will meet below: a MEASURED tag on a
> sub-second figure taken at 4 Hz is **ASSUMED** until re-taken (§3's missile band, ledger row 49),
> and **a MEASURED-tagged NEGATIVE about a transient is worth nothing** — §2's "no visible
> invincibility flash" was exactly that, and the arcade has the flash (ledger row 29).
>
> **Re-take rather than re-reason**: `ffmpeg -ss T -t D -vsync 0` on
> `.reference-cache/video/ab2-longplay-60fps.mp4` gives consecutive 60 Hz frames. Note that
> `-vf fps=N` **resamples** and is not the same operation, and that the repo's own
> `youtube-reference` skill defaulted to 4 Hz bursts for nine rounds (ledger row 48).

**COLOUR CAVEAT (R5b).** Every hex constant in this file beginning `#ff…` was sampled from a
longplay video frame, and **the longplay video is not level-accurate**: it tops the arcade's
`0xf7` palette ladder out at `0xff` and lifts chroma (pure HUD red reads `#f70000` on a native
320×224 screenshot and `#ff1000`–`#ff1400` on every video frame). See REFERENCE.md, "THE
LONGPLAY VIDEO IS NOT LEVEL-ACCURATE". The constants below are good for *hue and structure*;
treat the exact levels as ~3 % bright, and re-derive from a native screenshot wherever one of
the same stage exists (this repo has two: `ab2-arcade-desert.png` = stage 2,
`ab2-arcade-night-banking.png` = stage 3). None of §3's muzzle-flash, §4's lock-bracket or
§6's fireball colours has a native source, so they stand as-is with this caveat attached.

Round-3 verification pass: timestamps `tN` cite the longplay timeline (see REFERENCE.md).
The 60 fps cache file (`ab2-longplay-60fps.mp4`, 1028×720) was verified to be the SAME
recording as the 686×480 map-keyed file (identical scene and HUD values at t84 and t116,
durations 988.68 vs 988.70 s), so the stage↔timestamp map transfers to it directly; the
fine-step observations below were extracted from it with exact single-frame `-ss`.

## 1. Player movement

- Jet is screen-positioned (the world does the moving); it roams a clamped box.
  ADOPTED: prototype clamps to x [80,880], y [200,600] of 960×672 ≈ x 8–92%W, y 30–89%H
  (`player_jet_2d.gd` MOVE_MIN/MAX). The roam *distribution* is MEASURED (two-regime:
  cruise cx sd 12.88%W at cy 52.8%H; canyon sd 2.59%W at cy 63.5%H — REFERENCE.md).
- Velocity model ADOPTED: max speed 720 px/s (75%W/s), accel 2200 px/s², decel 1400 px/s²
  (`player_jet_2d.gd`). Feels-right values, not measured — treat as starting point.
- **Banking rolls the WORLD, not the jet** (MEASURED, #128): lateral stick rotates the
  entire world rigidly about screen centre, up to 65–68°, at ~75–80°/s (full roll ≈0.8 s);
  HUD stays axis-aligned. The drawn jet banks at ~0.8× the world roll so jet and horizon
  stay in step (ADOPTED, visually tuned — tune against t98/t112, do not derive from stills).
  The roll command source must be single-owner: live input, demo path, and death all feed
  one slew (prototype learned this the hard way — a second slew desyncs jet from horizon 6×).
- Pitch moves the jet up/down the frame; the horizon shifts opposite (t116 horizon 0.50H
  vs t175 0.646H during level segments — MEASURED). Exact coupling curve: ASSUMED
  (prototype doesn't model it; pick by capture comparison).
- **Barrel roll**: MEASURED (one instance, t221.4–222.9, stage 4, sampled at 0.1 s; key
  frame committed as `reference/stage4-barrel-roll-t222.png`): duration ≈ **1.2 s**; the
  JET SPRITE rotates through steep-left → inverted (belly palette visible) → steep-right
  → level while the **horizon stays dead level the whole time** — the maneuver SUPPRESSES
  the world roll that a normal hard bank produces, and that suppression plus extreme
  sprite angles is how a barrel roll is distinguished from a bank in footage. Large
  displacement during the roll: the jet sweeps ~60%W laterally and from ~20%H to ~75%H
  and back. The player crossed several enemy shot trains during it without dying
  (consistent with roll i-frames; not proof). **360° continuity CONFIRMED at frame
  stepping** (round 4: t221.8–222.33 requested at 1/60 s): the roll advances in ONE
  direction — right bank → level → left bank → inverted → edge-on (the sprite narrows to
  a line) → right-bank recovery — with no reversal: a true full rotation in ~1.0–1.2 s.
  (The 60 fps file carries duplicated frames in this span — effective unique rate
  ~30 fps; fine for pose work, remember it for speed work.) Remaining ASSUMED: the input
  trigger (double-flick vs dedicated roll input) and whether i-frames are granted.
- **Throttle**: AB2 II has 3-state speed control. **Read this before wiring it — the
  footage cannot tell you what it does (MEASURED-NEGATIVE R6).**

  - **MEASURED**: the HUD throttle letter reads **`M` in 27 of 27 samples** spanning
    t90–t370 of `ab2-longplay.mp4` (stages 1–8, sampled every 10–12 s;
    `tools/out/criteria-r6/throttle/strip.png`). It is never `H` and never `L`.
  - **MEASURED**: the throttle bar's fill is **constant in every flight sample** — blue
    0→1, amber 1→2, dots 2→3 — and **empty in both non-flight samples**: the carrier deck
    before launch (t90, SCORE 0) and the stage-5 runway restock (t250, jet on the ground).
    So the fill tracks *being under power*, and its level never changes in this recording.
  - **Therefore the magnitude of throttle's effect is NOT derivable from the cached
    footage, and no amount of re-measuring will change that** — the pilot in the only
    stage-mapped recording never touches it. This is a *negative* result, not an unfinished
    measurement: do not open a ticket to go and measure it here.
  - **ASSUMED (unchanged, from arcade manual knowledge)**: three states, and that throttle
    affects ground-flow rate and enemy closure.
  - **THE BINDING CONSTRAINT FOR ANYONE WIRING IT: `M` is the datum.** Every flight constant
    this project has MEASURED — ground-flow rate, the 62.50 %H horizon and the composition
    bands, the 4–6 s enemy approach, passive accrual at **3300/s** (§6 states "at SPEED M"
    explicitly) — was measured from footage in which the throttle is `M` throughout. So the
    middle state **must reproduce all of them exactly**, and H/L must be excursions either
    side of it. Wiring throttle as a multiplier on a default that is not `M` silently
    re-bases every one of those numbers.
  - Whatever magnitudes are chosen are **ADOPTED, not MEASURED** — label them, and cite the
    tuning rationale, per this file's tagging rules.
  - Prototype has no throttle.

## 2. Death / respawn

MEASURED in round 4 across FOUR death instances in the gameplay video
(`ab2-gameplay.mp4`, 866 s, 30 fps, cached beside the longplay — a DIFFERENT recording
with its own timeline, cited below as `gp tN`; it has NO stage↔timestamp map, so no
per-stage claims from it). Cleanest full cycle: gp t198–218 (night stage); repeats at
gp t257, t271, t281. Key frames committed: `reference/death-starburst-gp-t202.png`,
`reference/respawn-ready-gp-t207.png`, `reference/continue-card-gp-t261.png`.

- **Death sequence**: hit → an orange burst ON the jet and a fireball grows around it,
  jet silhouette still visible inside (~0.5–1 s) → a SCREEN-FILLING multi-lobe yellow/
  orange starburst (~60%W, ~1 s) **with a WHITE-HOT core** — deep-red rim → orange →
  yellow → near-white, ≥40% of its pixels above V 0.95 and a **core fraction
  (`S < 0.25 ∧ V > 0.94`) of ~9%** — the old "brightest decile at saturation ≤0.30" is
  **DROPPED R6 and the reason RESTATED R7**: ~~a false negative by construction on our
  palette~~ — it is **under-specified** (it names neither the mask, the ranking key, nor which
  of two saturations it means), and under the reading it was dropped on **the arcade fails it
  too, at 0.632**. Under the operator the criterion's own numbers came from, **ours reads 0.062
  against the arcade's 0.066 and passes.** REFERENCE.md ledger row 20 (MEASURED R5 on
  `death-starburst-gp-t202.png` and
  `ab2-arcade-huge-explosion.jpg` — REFERENCE.md "Fireball targets"; the old t357-derived
  percentiles describe fading smoke and cannot see the core) → the burnt dark-red hulk of the F-14 tumbles AWAY from
  the camera, shrinking toward the horizon, while the screen is otherwise empty of the
  player (~3–4 s; the world keeps scrolling) → respawn. This REPLACES the prototype's
  tumble-to-bottom-clamp death (spin at 360°/s, fall 1 s): the arcade hulk falls INTO
  the scene, not down the screen.
- **Score freezes while dead** (pinned at 5740 for gp t203–206) and resumes with the
  respawn — same pause behavior as the refuel pass (§6).
- **HIT is NOT reset by death** — it held at 2 across the entire gp t198–209 cycle. HIT
  resets ONLY at the stage-end tally (§6). The prototype resets it on death
  (`game_state.gd lose_life()`) — correct that when porting.
- **Respawn**: the jet slides in from the BOTTOM of the frame at OVERSIZED scale
  (larger than normal flight — it enters from behind/below the camera), twin afterburner
  flames blazing, with a "READY" text card low-center (yellow, then cyan), shrinking to
  normal scale as control resumes (~2 s). Full hit→control-restored cycle ≈ 8–9 s.
- ~~**No visible invincibility flash** after respawn in any of the four instances… The
  prototype's 2 s flashing window stays ADOPTED as a usability choice, not arcade-verified.~~
  **WRONG — CORRECTED R7, and it is the second MEASURED-tagged negative this round that the
  arcade turns out to have** (the first is §3 element 1, the nose sight). **THERE IS A FLASH.**
  - **MEASURED**: starts `gp t207.567` (the frame the respawn reaches normal scale), ends
    `gp t209.233`, **duration 1.67 s**, **8 clean on/off alternations at a 0.267 s period**,
    roughly 5 frames on / 3 off. Operator: bright-and-desaturated pixels
    (`max(RGB) > 120 ∧ max−min < 60`) counted in a jet-sized box x[180,480] y[100,250] of the
    640×360 frame — it excludes both HUD strips and the READY row, so the trace is the airframe
    and nothing else. Per-frame counts go **~2 000–2 900 ↔ 0–60 with nothing in between**.
  - **WHY FOUR PASSES MISSED IT, and this is the transferable part**: each state lasts
    **0.10–0.13 s**, so **any sampling coarser than ~0.1 s aliases it away** — including the
    0.25 s grid this project uses as its default for death-cycle work, and including the
    finding lane's own first pass. **A negative about a periodic behaviour is only as good as
    the sampling interval it was taken at; state the interval with the negative.**
  - **Consequence 1**: `flow.js`'s `RESPAWN_INVINCIBLE_S = 2.0` is now **arcade-supported to
    within 0.33 s**, not an unverified usability choice. It was deliberately **not** shortened
    to 1.67 — "it flashes" implies "it is invulnerable" by convention, not by measurement.
  - **Consequence 2, and every lane needs it**: we now draw the flash, so **the player sprite is
    absent from ~3 frames in 8 for 2.0 s after every respawn.** A single-frame jet measurement
    landing in one reads "no jet", and **that is not a defect**. `?invincible=1` suppresses it
    entirely and is the documented path for roam/composition work;
    `window.__flowState().graceFlashHidden` reports it per tick so a probe can exclude those
    ticks rather than infer from pixels.
  - **It also separates two figures that were both right about different boundaries**:
    `hit → normal scale` **6.98 s**, `hit → READY gone` **7.70 s** (what we ship),
    `hit → flash off` **8.67 s** (the "≈8–9 s" above).
- **Continue**: after the final life, "CONTINUE PLAY / <countdown from 10> / INSERT
  COIN" overlays the still-scrolling world (gp t261). Continuing resumes IN PLACE —
  **same stage** (the stage digit reads 4 before and after).

  - **THE SCORE IS NOT RESET. It runs straight through the continue (CORRECTED R6).**
    The previous text here — *"with the score reset to ~0 (gp t265–269 climb from ~600 at the
    normal accrual rate)"* — was a **misread frame**, and `flow.js:_updateContinue` called
    `this.score.reset()` on its authority, wiping the player's whole score on an action the
    arcade rewards. Found by the R5 feel critic; **re-read independently here, digit by digit,
    at 8× nearest-neighbour** over gp t256–276 (`tools/out/criteria-r6/score/sheet-score-continue.png`,
    plus six full frames at `…/score/full/sheet-continue-context.png`):

    | gp t | score | state |
    |---|---|---|
    | 256 | 485 440 | flight |
    | 258–264 | **489 540** | **frozen through the death** |
    | **261** | **489 540** | **"CONTINUE PLAY / 10 / INSERT COIN" on screen — the score is displayed and unchanged** |
    | 263 | 489 540 | READY card |
    | 265 | **490 000** | flight resumed, accruing |
    | 268 / 274 | 491 900 / 497 430 | climbing normally |

    Monotone across the continue, with no reset and no discontinuity. **"~600" is not on
    screen at t265–269 — 490 000 is.** Two independent re-reads, two operators (digit OCR by
    eye on a cropped strip; full-frame context), same conclusion.
  - **HIT is not reset by the continue either** — it reads 4 at t259, through the CONTINUE
    card, and 4 at t268, ticking to 5 only on the next kill. Consistent with §6: HIT resets
    at the stage-end tally and nowhere else.
  - **Lives per credit = 3. MEASURED R6** (was ASSUMED; the old note "not derivable from this
    footage" is withdrawn — it *is* derivable, just not by counting deaths before one
    continue). **Operator**: detect deaths over the whole of `ab2-gameplay.mp4` by the
    score-freeze signal (below), identify every CONTINUE PLAY screen on the same filmstrips,
    then **partition the deaths by the continues**. R5 feel critic, 27 deaths and 9 continues:

    ```
    deaths per credit: [3, 3, 3, 3, 3, 3, 3, 3, 3]
    ```

    **Nine groups of exactly three, no exceptions.** The partition is self-validating: a missed
    death makes a group read 2, a false positive makes one read 4, and neither occurs — so the
    same result establishes precision ≈ 100 %, recall ≈ 100 % **and** the lives count. It is
    structurally stronger than any threshold sweep, which is why the R5 judge deferred to this
    count over their own.

    **Scope of the claim**: 3 is the lives count **of the cabinet in this recording**. AB2's
    lives count is dip-switch configurable, so this measures a configuration, not the ROM. It
    is the right number to build to — it is the one an ordinary player met — but do not cite it
    as "the arcade cannot be set otherwise".
- Players fly through their OWN kill explosions harmlessly (t116.75 longplay: jet
  overlapping a fireball, no death) — friendly explosions must not damage.
- Crash into terrain/canyon wall also kills (ASSUMED for walls — canyon stages exist and
  the arcade punishes wall hits; prototype collision is enemy/bullet only).
- Invincibility must be pass-through for already-overlapping bodies when it expires
  (ADOPTED #103 — otherwise expiry scores an undodgeable hit).

### Lethality: THE ARCADE'S OWN DEATH RATE, measured twice independently (MEASURED R6)

**After five rounds of guessing, this number exists.** Two reviewers measured it on the same
recording, on instruments neither shared, and they agree.

| | deaths | span | **deaths/min WALL CLOCK** | deaths/min FLIGHT TIME |
|---|---|---|---|---|
| **R5 judge** — READY-card template match | 26 | 816 s (t50→866) | **1.91** | — |
| **R5 feel critic** — score-freeze clusters + continue partition | **27** | 793.8 s (launch t47.4 → GAME OVER t841.2) | **2.04** | **2.78–2.94** |
| **ours**, `53ce86b`, judge's 3 seeds × 180 s | — | — | **3.00** | — |
| **ours**, feel critic's 7 seeds, 1 260.1 s | 61 | — | 2.90 | 4.04 |

**Operator A — READY-card normalised cross-correlation (R5 judge).** Template cut from the
known death at gp t202 (`reference/respawn-ready-gp-t207.png` is the same event), searched over
±2/±3 px offsets, frames sampled at 2 fps. 24 candidates above threshold 0.55; **every one
cropped and looked at** (`judging/R5/evidence-arcade-deaths-ready-cards.png`): 23 genuine, 1
false positive (the title screen's "II"). Sweeping the threshold down to 0.40 surfaced 36 more,
also all looked at, of which **3 were genuine cards the higher threshold had missed** — so the
method's known failure mode is a missed card, i.e. this count is a **lower bound**.

**Operator B — score-freeze clusters (R5 feel critic).** Uses the MEASURED fact above that the
score freezes while dead: `crop=104:22:186:20,format=gray` over all 25 993 frames; per-frame
change = pixels differing from the previous frame by >40 grey levels; zero-runs ≥20 frames
(0.67 s), clustered at a 4.0 s gap → 31 clusters; **every cluster read as a 6-frame filmstrip**
at −1.0/+0.5/+1.5/+2.5/+3.5/+5.0 s. Validated on known input first: it recovers **4 of the 4**
deaths hand-identified in this section. Non-deaths removed by eye, not by threshold: 2 runway
restock stages, 2 attract/title screens, 1 GAME OVER card. **Cross-validated by the 9-continue
partition** (see "Lives per credit" above), which cannot be off by one.

**Why the two differ, decomposed — it is almost entirely the one missed card.** The gap is
0.129/min. Holding the count at 27 and using the judge's 816 s span gives 1.985, so **0.073 of
the gap is the missed card and 0.056 is where each reviewer bounded "gameplay"**. Harmonised on
either denominator the two methods land within **4 %** of each other. **Take the arcade at
~1.9–2.0 deaths/min of wall clock**, and prefer 27 — the judge deferred to it for the right
reason: an exact integer partition beats a threshold sweep whose failure mode is exactly a
missed card.

**GATE, binding from R6 (REPLACES "≤1.5 deaths/minute", REFERENCE.md ledger row 13):**

- **≤ 2.0 deaths per minute of WALL CLOCK.** Ours is **3.00** and fails it. That is the point.
- **Deaths per minute of FLIGHT TIME reported on the same line**, as the secondary figure.
  ~~It is the denominator that is invariant to death-cycle length (which is why row 8 restated
  it)~~ — **REFUTED BY CONTROLLED EXPERIMENT, R7, ledger row 28. NEITHER denominator is
  invariant.** Keep reporting both and keep wall clock primary, because the arcade anchor is
  strongest there; but **the published reason for preferring flight time was wrong.**

  > **The experiment**, three arms, 7 seeds × 300 s each, every tick, deaths cross-checked
  > against `lives` decrements (agreeing exactly on every seed of every arm). ARM 1 → ARM 2
  > **changes `DEATH_TOTAL_S` (5.2 → 7.7 s) and nothing else**:
  >
  > | | ARM 1 `e8fed58` | ARM 2 death cycle only | ARM 3 shipped |
  > |---|---|---|---|
  > | deaths/min **wall** | 2.229 | **2.086** (−0.143) | 2.114 |
  > | deaths/min **flight** | 2.850 | **2.948** (+0.098) | 2.990 |
  > | enemy rounds/min wall | 126.00 | 125.17 | 124.60 |
  > | enemy rounds/min flight | 161.12 | **176.89 (+9.8 %)** | 176.23 |
  >
  > **Both denominators move, in opposite directions, and the flight-time one moves less but
  > does move.** The mechanism is not a bug: **threats are produced on WALL time** —
  > `game.js` keeps calling `combat.update` through the `death` state, which is R5's "the
  > world keeps flying" fix and matches the arcade's still-scrolling world at gp t261 — while
  > **exposure is counted in FLIGHT ticks**. So lengthening the death cycle leaves the threat
  > schedule alone and shrinks the denominator. The enemy-rounds rows show the same effect on
  > a quantity nobody is tuning, which is the control: per wall minute they barely move, per
  > flight minute they rise 9.8 %.
  >
  > **This also settles the "enemy rounds/min not falling" clause**, which can be read either
  > way: per wall minute rounds fall 1.1 % (there are fewer flight seconds to fire in), per
  > flight minute they rise 9.4 %. The clause exists so the death rate cannot be met by making
  > combat quieter — by that reading it is satisfied. **Name the denominator in that clause
  > too**; it has the same defect the gate itself had before row 8.
- **Every figure names its denominator, its seeds, its span and its tree state.** A bare
  "deaths/min" is not a reportable quantity in this repo.

**Why ≤1.5 had to go**: the arcade fails it by **36 % on wall clock** and by **85–96 % on
flight time**, with a competent human flying. A lane tuning to ≤1.5 would have built a game
**half as lethal as After Burner II**. It was never checked against the arcade, because until
R5 nobody had measured the arcade.

**Why lethality stays gated at all, against R5c's demotion.** R5c demoted deaths/min to a
regression guard because "the figure measures the pilot, not the game" **and because no arcade
target existed**. The second half is no longer true. A pilot-dependent statistic *with a
measured anchor* is a usable loose bound, and leaving lethality ungated at the moment the
project first acquired an anchor would be the wrong trade. The pilot-dependence is real and is
carried **on** the gate, not against it:

| source | deaths/min wall | what it measures |
|---|---|---|
| `ab2-longplay.mp4` (988 s, 23 stages) | **0.00** | an expert exhibition clear — a superplay |
| `ab2-gameplay.mp4` (793.8 s, 9 credits) | **2.04** | an ordinary competent player paying to play |
| our `?demo=1` | **2.90–3.00** | a **non-reactive autopilot** (`demoTimeline.js` is a pure function of `simTime` — no RNG, no reaction, it cannot dodge) |

**The honest reading of that bracket**: a policy that cannot dodge dies only **1.42×** as often
as a human who can. For a player who actually reacts, this build is plausibly at or below arcade
lethality, and much of the excess is the autopilot's. So: **fail the gate and investigate; do not
reflexively make the game easier.** The companion figure that transfers cleanly, because it is a
property of the game's structure rather than the pilot's skill, is **playable share of wall
clock: arcade 69.4–73.5 %, ours 71.9 %** — a match, and it closes R4 gap 5's pacing half.

**Still the recommended replacement**: pilot-independent properties — per-shot **warning
time**, **shots in air**, **telegraphs started**, **respawn-into-live-fire** — all already
emitted by `tools/fairness_probe.mjs`, all measurable on the arcade side from footage.
Deriving their arcade targets would make this section obsolete, which is the goal.

**One of them is no longer unstarted: the arcade's enemy ALTITUDE distribution (CANDIDATE,
R6 — deliberately NOT a gate).** `judging/R5/feel-critique.md` §6 named this "the single best
replacement criterion available"; the R6 combat lane measured it and **asked that it not be
adopted as a gate this round.** That request is honoured, and the reasoning recorded, because
adopting a one-lane hand count is how several ledger rows started.

| arcade enemy screen altitude | n | p5 | p50 | p95 | sd | share in top third |
|---|---|---|---|---|---|---|
| all enemies | 83 | 14.1 | **40.0** | 72.8 | 19.22 | **32.5 %** |
| readable, ≥10 %W | 19 | 14.5 | **36.0** | 59.8 | 18.22 | **47.4 %** |
| the player, for scale | 61 | 36.0 | **49.0** | 63.0 | 8.11 | 1.64 % |

> ### THE PLAYER COLUMN IS NOW CONFIRMED INDEPENDENTLY. THE ENEMY COLUMN IS NOT (R7)
>
> **Read this before quoting either.** The R7 flow lane re-counted the **player** column — not
> the enemy column — and it passes the promotion bar for that column alone.
>
> **Operator**: 53 frames of `ab2-longplay.mp4` (686×480) at exactly **3.50 s** inside
> `STAGE_MAP.md` VERIFIED spans of stages **2, 3, 9, 14, 20**, each trimmed 2 s at both ends,
> extracted one at a time with `-ss <t> -frames:v 1`; each read at **1.4× NEAREST** against a
> 5 %H ruler on **both** edges; the reading is the airframe's **bbox centre** (midpoint of
> fin-top and nozzle-bottom). **5 frames excluded with the reason recorded per row** (two
> `RELOAD WEAPONS` tanker passes, one tanker approach, one with the `STAGE 9` card still up,
> one where the player could not be separated from a green canopy) → **48 observations**. Raw:
> `tools/out/flow-r7/arcade-player/labels.csv`.
>
> **Independent of R6 in three ways**: different stages (R6 read 1, 4, 6, 7, 12, 19), a
> different grid (3.00 s), a different reader.
>
> | player altitude | n | min | p5 | p50 | p95 | max | mean | sd | top third |
> |---|---|---|---|---|---|---|---|---|---|
> | R6 combat lane | 61 | 27.0 | 36.0 | 49.0 | 63.0 | 67.0 | 49.16 | 8.11 | **1.64 %** |
> | R7 flow lane | 48 | 35 | 40.0 | 50.5 | 60.0 | 67 | 49.85 | 7.21 | **0.00 %** |
> | **POOLED — quote this one** | **109** | **27.0** | **36.4** | **50.0** | **62.0** | **67.0** | **49.47** | **7.73** | **0.92 %** |
>
> **The two means are 0.69 points of H apart** (two-sample t = 0.46, indistinguishable) and
> both maxima are 67. **This is the first independent confirmation this project has for the
> arcade player's altitude.**
>
> **It does NOT promote the enemy column.** The enemy distribution's bar — ≥60 observations
> over ≥40 stage-verified frames, by someone who produced neither prior count, within 10 points
> of 32.5 % top-third — **still stands unmet**; see the attempt recorded below. Do not read
> "the altitude hand count was confirmed" and apply it to the enemy row.
>
> **Weaknesses, stated by the counter rather than left to a judge**: (a) the longplay pilot is
> an expert, so this conflates *where he chooses to fly* with *where the envelope lets him*;
> (b) three of the 48 are flagged low-confidence (a pale airframe on stage 9's snow); (c) a
> 3.5 s grid under-samples brief extremes, so **the true tails are WIDER than these 109 show**
> — which argues against trimming our own spread down to the measured sd; (d) **neither count
> sampled a canyon stage** (the arcade's are 8 and 17), so this is a **cruise** population.

> ### DO NOT TUNE TO A "TOP THIRD" PERCENTAGE — restate it as SPREAD (CORRECTED R7, ledger row 26)
>
> R6 gap 5 reads: *"our pilot occupies the top third of the screen 0.00 % of 20 970 flight
> ticks against an arcade pilot whose p5 is 36.0 %H"*. **Both halves are true and the framing
> they suggest is wrong.** The arcade's own player top-third share is **0.92 % — one
> observation in 109**, the single 27 %H reading in R6's set. A reader takes away "the arcade
> pilot is often up there", and he is not; he is almost never up there either.
>
> **Tuning a scripted attract path to reproduce a 1-in-109 event is tuning to a single
> observation**, which is what most of REFERENCE's ledger is about. What distinguishes the two
> pilots is **spread**, not the top third, and what the fix owes is the **capability** to reach
> the extreme rather than a percentage of time spent at it.
>
> **The restated criterion** — and the flow lane solved to it rather than to the top third:
>
> | | p5 | p95 | **sd** | top third |
> |---|---|---|---|---|
> | **arcade, 109 pooled hand obs** | **36.4** | **62.0** | **7.73** | 0.92 % |
> | ours, `e8fed58` | 44.9 | 62.3 | 6.07 | 0.00 % |
> | **ours, R7** | **38.7** | **62.8** | **8.22** | 0.00 % |
>
> **ACCEPT: player-altitude p5 within ~3 points of 36.4 %H and sd within ~1.0 of 7.73**, with
> the **reachable extreme** demonstrated separately (full stick reaches **27.02 %H**, the
> arcade's own minimum). **Do not gate on a top-third share in either direction.** Note p95 was
> already right and stayed right — the floor was never the problem.

**Operator**: 63 analysed frames of `ab2-longplay.mp4` on a fixed 3.00 s grid over six
`STAGE_MAP.md`-verified spans (1, 4, 6, 7, 12, 19), each trimmed 2 s at both ends so no sample
lands on a transition card; every aircraft read **by a human** off a 1.4× NEAREST upscale
against a 5 %H ruler; the player separated by drawn span. **No detector, on purpose** —
aircraft-vs-cloud-vs-island segmentation over arbitrary arcade grounds is this project's
most-retired trap, and one to five aircraft per frame does not need one. Raw data:
`tools/out/combat-r6/arcade-vert/labels.csv`.

**Why candidate and not gate**, from the lane's own stated weaknesses: the longplay pilot is
an expert who never dies, so enemies die young and the sample skews toward newly-arrived —
small, high — aircraft; spans are eyeballed to ±2–3 points, so observations near the 10 %W cut
can switch populations; and it is **one lane's hand count**. **The bar for promotion is an
independent re-count by someone else** — the same bar the arcade death rate had to clear, and
what made that figure trustworthy was two independent methods agreeing, not one careful one.

> ### STILL A CANDIDATE. One re-count has been ATTEMPTED and it is recorded as an attempt (R7)
>
> **The R6 judge tried and did not reach a usable sample, and published the attempt instead of
> a number. That is the right outcome and it is recorded here as a result, not as a gap.** The
> attempt: 13 frames on a fixed grid over `STAGE_MAP.md`-verified spans of stages 1, 7 and 19,
> each read at 1.4× against a 10 %H ruler. It produced **six** confident observations spanning
> 39–79 %H with none in the top third. Why it stalled, both reasons worth knowing before the
> next attempt: the longplay pilot kills fast, so **five stage-1 frames yielded two
> observations**; and the stage-7 and stage-19 frames are over dense terrain where
> aircraft-vs-ground identification is genuinely ambiguous — which is weakness (c) above,
> confirmed by a second person. **Six observations is not evidence against 32.5 %. It is
> evidence that the re-count has not happened.**
>
> **THE BAR IS UNCHANGED**: ≥60 enemy observations over ≥40 stage-verified frames, by someone
> who produced **neither** prior count, agreeing with **32.5 % top-third to within 10 points**.
>
> **Two additions to the operator, binding on the next attempt.**
> 1. **Blank the HUD before counting.** The R6 judge recorded "an enemy at 16 %H, span 11 %W"
>    at t103 — inside the top third and readable-size, the single most influential kind of
>    observation for the headline — and at 5× it is **the fixed upper-right reticle's status
>    dot and attitude line**. He caught it himself. This is now a **standing rule, not a
>    per-operator footnote**, because the same HUD has been counted as a cloud, as a cloud bank,
>    as a false horizon and now twice as an aircraft: REFERENCE.md, "The upper-right HUD has now
>    been counted as four different things", with the corrected rect
>    `(0.720, 0.055, 0.965, 0.330)`. The old rect would have clipped the rotating attitude line.
> 2. **Pick the frames by a rule written before the question is asked**, and state the rule.
>    Choosing frames you expect to be informative is how two lanes independently reached the
>    wrong answer on the nose sight (§3 element 1) — two draws from one biased sample, which
>    this project would otherwise read as its strongest evidence pattern.
>
> **Prefer spans over OPEN WATER or OPEN DESERT for the re-count**, and say which spans were
> used. Dense-terrain stages are where both attempts lost observations, and a smaller
> stage-balanced sample that can actually be classified beats a larger one that cannot.

**It has already paid for itself without being a gate**, which is the argument for carrying
candidates in this document rather than leaving them in a lane report: the arcade's readable
enemies sit at **36.0 %H** against its player's **49.0 %H** — thirteen points above him — and
`combat.js`'s `SIGHT_NDC_Y_OFFSET` is **0.30 NDC = 15 %H above the nose**, tagged MEASURED in
§3 and derived years of frames apart. **Two independently measured numbers agreeing to two
points.** Ours had enemies and player one point apart — the gun was aimed at a part of the sky
nothing flew in. A candidate that explains a MEASURED constant is worth publishing before it
is worth enforcing.

### The denominator this criterion was never given (RESTATED R5c, and still binding)

R4 gap 5 reads "**≤1.5 deaths/minute** averaged over ≥3 minutes of `?demo=1`" and **never
names its denominator**. It was the seventh criterion this project had to repair (the running
count is now **twenty-nine** — the ledger is in REFERENCE.md; do not re-count from memory), and it
fails in the family way: the number stops meaning what it meant when the build improves.

**Why it moved.** It was drafted when a death cost **8.5 s** of non-interactive time; that is
now **5.2 s**, and the playable share of wall clock has gone from ~35 % to ~70–78 %.
Shortening the death cycle puts more flight seconds into the same wall clock, so **deaths per
minute of WALL CLOCK rises even when deaths per minute of FLIGHT TIME is unchanged.**
Identical lethality scores worse against the criterion than it did when the criterion was
written. A lane tuning to the wall-clock reading would be compensating for another lane's
improvement by **making the game easier than the arcade** — tune to the number, lose the
thing, exactly as with the fin bound, the trail brightness, the explosion palette and the
cloud window.

**Restatement, binding from R5c:**

- **PRIMARY — deaths per minute of FLIGHT TIME.** Denominator: ticks with
  `flow.state === 'flight'` (verified present in `src/game/flow/flow.js`; it is the only
  state in which the player has the controls; the other five — `launch`, `death`,
  `continue`, `title`, `attract` — are separate states. Note `fairness_probe.mjs` also
  reports a `tally` share: **no such state exists in `flow.js`**, so that field is always 0
  and must not be read as "time spent at the stage tally").
- **SECONDARY — deaths per minute of wall clock**, reported *alongside*, never alone.
- **Both figures must name their denominator in the same line as the number.** A bare
  "deaths/min" is not a reportable quantity in this repo.

**How to produce both from the existing tool**, without changing it: `tools/fairness_probe.mjs`
already emits `deathsPerMin` (deaths ÷ wall-clock seconds × 60) and `stateShare.flight` (per
cent of samples in `flight`). Then

```
deathsPerFlightMin = deathsPerMin / (stateShare.flight / 100)
```

Report `deaths`, `seconds`, `stateShare.flight` and both rates, per seed and pooled. Sample
**every tick** (`--every 1`): the probe's state share is a sample fraction, and `?demo=1`'s
attract regime cycle is exactly 16.000 s, so any sampling interval dividing it is a coherent
subsample — see "Sampling a periodic signal" below.

**R4's 3.0–3.5 baseline is NOT comparable to a current wall-clock reading.** It was measured
on the old 8.5 s cycle, i.e. against a different denominator. Only a flight-time comparison is
apples to apples. Worked conversion, on other lanes' self-reported inputs and offered as
arithmetic rather than as a measurement of mine: 3.0–3.5 wall-clock at ~35 % flight share is
**8.6–10.0 deaths per flight-minute**; a current 1.78–3.11 wall-clock at 70–78 % is
**2.3–4.4**. The direction of travel is real and large; **the endpoints are not settled** —
deaths/min read 3.56–4.00, then 3.56–5.33, then 1.78–3.11 within one session, on a tree whose
denominator was moving at the same time. Re-measure before quoting.

**The ≤1.5 threshold itself is RETIRED (R6)** — see the measured arcade rate above; the arcade
fails it. R5c's own attempt to measure the arcade's rate is kept below as a **withdrawal with a
bound**, because the two instruments that succeeded in R5 were built out of why it failed.

#### A deaths/min target cannot be read off footage at all (MEASURED-ATTEMPT, WITHDRAWN R5c)

**The attempt.** `ab2-gameplay.mp4` (VP9, 640×360, 866.5 s) is the only cached recording
containing player deaths. Sampled at 2 fps (1 733 frames), feature = fraction of the body
region y[48,310] that is warm (`R>180 ∧ G>90 ∧ B<110`), scored as a **spike above a ±10 s
rolling median** — a raw warm-fraction threshold is useless because the desert stages' ground
*is* that colour and 24 % of all frames pass it. Threshold 12 points, 2.5 s clustering:
**43 events**. It **recovers 4 of the 4** deaths hand-identified in this section
(gp t198–218, t257, t271, t281).

**Why it is withdrawn.** All 43 detections were cropped and read on two contact sheets
(`tools/out/criteria-fix-r5c/death-sheet0.png`, `death-sheet1.png`). **Only 18–19 are
death-sized starbursts or a visible READY card** — precision ≈ **43 %**. The rest are
desert-stage baseline shifts, small ground-target explosions, the attract screen and the
refuel runway. Recall is unestablished and is *structurally suppressed* in the bright yellow
stages (t770–840), where the baseline warm fraction is **47–74 %** and no death can raise a
spike above it. A second discriminator — the player's nozzles vanishing, so warm collapses
for the 3 s after a real death — **does not separate the classes** (ratio 0.07–162 across the
same eye-classified deaths) and is withdrawn too.

**The bound, and nothing more:** 19 death-sized events in 866.5 s is **1.32 per minute of
wall clock**, with both error directions live. Order 1–3/min. **Not a gate, not a target.**

**What the attempt actually established — and it retires the whole shape of this criterion.**
`ab2-gameplay.mp4` yields ~1.3 deaths/min. `ab2-longplay.mp4` is **988 s of the same ROM with
zero player deaths**. Two recordings of the same arcade game differ by every death there is,
because **a deaths/min figure read off a recording measures that pilot's skill, not the game's
lethality.** Our `?demo=1` is an autopilot running a fixed policy — a third skill level again.
Comparing our demo's deaths/min against a human recording's compares three different things,
and no choice of denominator fixes that.

**So: deaths/min is a REGRESSION GUARD, not an arcade-fidelity criterion.** Use it to notice
that a change made the game 2× more lethal than last round — on the flight-time denominator,
same seeds, same tree state. Do not tune it toward a number taken from footage.

> **PARTLY SUPERSEDED R6.** The reasoning above is sound and the pilot-dependence is real, but
> its premise — "no arcade target exists" — was overtaken within the same round: two independent
> measurements of the arcade now exist and agree (1.91 / 2.04 wall clock). Deaths/min is now a
> **loose gate at ≤2.0 wall clock** *and* a regression guard on flight time. The warning not to
> chase the number still applies: the bracket 0.00 / 2.04 / 2.90 is three pilots, not three
> games.

> **AND ITS 1.32/min BOUND IS SUPERSEDED.** The withdrawal below bounded the arcade at ~1.3/min
> from a 43 %-precision detector with unestablished recall. Both R5 instruments — which *did*
> establish recall, one of them exactly — put it at 1.91–2.04. The withdrawal was the correct
> call on the evidence it had; the bound itself should not be quoted again.

**The fidelity question should be asked of pilot-independent properties instead**, all of
which `tools/fairness_probe.mjs` already emits and none of which depend on who is flying:
per-shot **warning time** (`warningMedian` — telegraph plus time of flight), **shots in air**
(`meanShotsInAir`), **telegraphs started**, and the respawn-into-live-fire count
(`shortLives` / `respawnLives`). Those are measurable on the arcade side from footage *and* on
ours, and they are what "is the difficulty right" actually means. Deriving arcade targets for
them is unstarted and is the recommended replacement for this criterion.

**Tree state is part of the citation** (REFERENCE.md "What a complete citation is"): a
deaths/min figure from the shared working tree and one from a clean checkout are different
measurements. R4's critic and player-feel differed by 6 vs 9 deaths in 120 s for exactly this
reason, and neither was wrong.

**Sampling a periodic signal.** `demoTimeline.js`'s attract regime cycle is exactly 16.000 s.
Sampling at any interval that divides it is a coherent subsample, not a random one: the same
run and the same operator gave canyon lateral sd **1.41 %W at one 1 Hz phase and 6.41 %W at
another**, where every-tick reads 2.48 and an incommensurate 53-tick interval reads 2.50. R4's
published canyon **6.19 %W is retired** — it sits inside the aliased range and was reproduced
at 6.21 by accident before the interval was changed. Any distribution statistic over `?demo=1`
(sd, spread, percentile, rate) **must sample every tick or at an interval incommensurate with
16.000 s, and must say which.** CLAUDE.md's "no speed claims from sub-60 Hz sampling" was
written about motion; it applies to distribution statistics too, and there it fails
*silently*, because the wrong value is stable and reproducible at every fixed phase.

**`?demo=1` is two populations.** Cruise lateral sd 12.50 %W at pixel-centroid cy 52.75 %H;
canyon 1.85 %W at cy **63.52 %H**. The canyon altitude is outside the 52–60 %H composition
band *on purpose* — that band was drawn against cruise frames (REFERENCE.md's own canyon cy is
63.5 %H). A composition reading from a random `?demo=1` frame mixes the two and reads out of
band about 31 % of the time. **Capture cruise only, or split by regime** (`simTime % 16 < 11`
is cruise). Cruise lateral extent is a distribution, not a point: the cited "13.20 %W" is one
draw from a per-window spread of **8.71–18.18 %W**, and the pooled value is **19.02 %W**
(closed form 19.30) — genuinely ~48 % too wide. Quote cruise with its window length and its
spread.

## 3. Weapons

### Vulcan
- Hold-to-fire stream, ~12 rounds/s (ADOPTED: 0.08 s interval, `weapon_manager_2d.gd`);
  alternating left/right muzzle. Rounds fly along the sight line into depth (prototype:
  3.5 depth-units/s, converging laterally on the crosshair aim with slight spread 0.025).
- **Round appearance: small orange FIREBALL PUFFS, not thin white tracers** — MEASURED at
  t214 (`reference/stage4-vulcan-stream-t214.png`, player firing, astern view): the
  stream is a loose zig-zag column of round amber puffs ahead of the nose (alternating
  slightly left/right from the two muzzles), each ~3–4 native px, sampled `#ffdb21` /
  `#ffad15` / `#ff9f0c`. This CORRECTS both the prototype's white quad-streak rendering
  (ADOPTED #133 — keep the opaque-quad technique, recolor/reshape to the measured puffs)
  and ARCHITECTURE.md D7's "tracer look" wording. Night stages render the same puffs
  (t200). Aim assist: a round snaps its altitude/depth ramp to the nearest enemy near the
  sight line at spawn so convergence actually intersects targets (ADOPTED #100 — without
  it, shots pass under airborne enemies).
- Vulcan is effectively the anti-close-range weapon; generous hitbox. ASSUMED relative
  damage balance (prototype: 1 hit kills fighters, bombers take 2).

### Missiles
- **Stock widget decoded (round 4, MEASURED)**: the bottom-right display is a base-10
  odometer — **each large rocket icon = 10 missiles (tens digit), each small tick = 1
  (units digit)**. Ticks decrement one per launch; when units hit 0 the next launch
  converts a large icon into ticks (4L+0 → 3L+9, observed across the t98–105 strip,
  which also counts ~8 launches matching the salvo's 8 kills). **Starting stock = 5
  large = 50** (t84/t86: exactly 5 large, 0 ticks — the prototype's 50 is confirmed).
  **Resupply fills TO 70** (7 large) at ~10–20 missiles/s over ~4 s, at BOTH resupply
  points (tanker: 20→70 across t163–167; runway: 22→70 across t253–256).
- Fire on button press, cooldown 0.4 s (ADOPTED). Missiles launch from wing pylons,
  run ~0.3 s straight (HOMING_DELAY), then home on the locked target; max life 5 s.
- **Multi-lock + salvo is real and central** — MEASURED (t99.5–103.5, **SAMPLING RATE 4 Hz
  (0.25 s)**, `reference/stage1-missile-salvo-t100.75.png`): a cluster of ~6 dashed
  corner-bracket lock boxes on-screen at once (t100), then **HIT 2 → 10 in 2.25 s** — eight
  kills from one salvo pass, so at least ~6–8 missiles can be in flight simultaneously.
  A launch throws big white smoke billows that briefly occlude part of the screen; two
  simultaneous wing-pylon launch flares are visible at t177. This replaces the prototype's
  single-lock model as the fidelity target.

  > **LAUNCH → IMPACT: ~~≈ 0.5–1.5 s~~ DEMOTED TO ASSUMED, R10 (REFERENCE ledger row 49), AND
  > `missiles.js` CALLS IT "MEASURED-TO-SPEC".** The observation behind it is *"explosions land
  > 2–4 frames of 0.25 s after the launch flurry"* — **a 4 Hz sample of a sub-second event**, on
  > `reference/stage1-missile-salvo-t100.75.png`, which is **one of the four hand-picked frames
  > ledger row 37 retired**. With ±0.25 s of quantisation at each end the **true support is
  > 0.25–1.25 s**, not 0.5–1.0 s, and `V0` / `ACC` / `V_MAX` were tuned to land inside the
  > narrower band. REFERENCE ledger row 29 already made this class binding; the citation format
  > had no field to record the rate in until R10 added **field 6**.
  >
  > **THE ARCADE'S MISSILE HAS NEVER BEEN MEASURED BY ANYONE AT ANY RATE, AND THE BOUND IS
  > KNOWN.** At 60 Hz every arcade *kill* dates to ±1/60 s, but a kill cannot be attributed to a
  > launch: the player's missiles fly away from the camera and are lost in the launch billow
  > within a few frames, and the billow is indistinguishable from the previous kill's smoke at
  > 686×480 or 1028×720 (R9 judge §2.7). **Acquisition item, highest on the board: a 60 fps
  > decode following SINGLE arcade missiles from launch flare to detonation — turn rate, flight
  > time, trail length. Until it exists, do not tune the missile.**
  >
  > **And `HOMING_GAIN = 1.7` in `src/weapons/missiles.js:136` — the constant that decides how
  > hard a heat-seeker turns, which the owner has named twice — is ASSUMED, not MEASURED.** It
  > carries no tag, no comment and no reference of any kind in a file where every other constant
  > carries one, and nothing in REFERENCE, this document or any judge report constrains it.
  > **Tag it ASSUMED in the source rather than leaving it bare** — a declared exception is a
  > criterion nobody has to argue with (REFERENCE's R9 process rule).
  >
  > *Source state: still bare on the R10 working tree with the feel lane live in this file. If
  > that lane produces an arcade turn rate, this paragraph is superseded by its measurement and
  > the band above is re-derived from it — do not keep both.*
  >
  > **The "~6 lock boxes at once" count is from t100 — the SAME retired frame** — and it is
  > already ledger row 41 together with the 22 %W lock radius it justifies, against the only
  > arcade anchor for that radius, **8.3 %W**. Ours acquires one lock per 0.117 s against
  > `LOCK_INTERVAL_S = 0.10` and peaks at **3 locks / 4 bracket sets** (R9 §2.6, 60 Hz,
  > `bd73b52`). **Do not close the 3-vs-6 gap by citing t100.**
- **Lock-on display, three distinct elements (round-4 state map, MEASURED on the
  t84–118 reticle strip and the t115–118 engagement at 0.25 s)**:
  1. **The small dashed SIGHT square** leading the player's nose — the aim point,
     always present in flight, separate from any lock indicator.
     **CHECKED IN R6/R7 AND CONFIRMED REAL. DO NOT RE-OPEN THIS.** Two R6 lanes
     independently concluded, from 4 and 16 frames, that this element does not exist and
     that we were drawing a HUD element the arcade never had. **They were wrong, and the
     declining-to-act was correct — but the negative must not be re-derived a third time.**
     Found by: the R6 combat lane (§7.2); the R6 judge over the **stage-4 burst
     t201.4→t202.4**, six frames at 0.2 s with **no enemies on screen in any of them**, and
     again on **stage 1 at t109**, hard bank, no enemies, clear sky; and this lane in R7 on
     a **true-native frame** that none of them used — `ab2-arcade-desert.png`, where the
     empty four-corner box sits 5 px ahead of the nose on flat sky, with nothing within 4 px
     of it, in the same frame as the upper-right reticle (element 2). Full measurement in
     REFERENCE.md, "The nose sight square" — including one claim about element 3 in that
     frame that I withdrew after cropping it.
     - **Size, MEASURED: 5 × 5 true-native px = 1.563 %W** (native, stage 2), corroborated
       at **11 × 11 video px = 1.604 %W** (t201.4, stage 4). **Ours is `SIGHT_PX = 10` of
       320 = 3.125 %W, ~2× too big.** Target **1.4–1.8 %W on a side.**
     - **Vertical offset: NOT a fixed screen offset, and NOT yet a retune target.** Across
       the three zero-enemy frames the sight sits 7.8 %H *above* the airframe, 8.8 %H
       *above*, and — in a hard bank — **12.0 %H BELOW**. Whatever carries it rolls with the
       jet; `SIGHT_NDC_Y_OFFSET` does not. Settle the frame of reference (a level frame
       *and* a hard-bank frame) before moving the constant.
     - **Why it was missed**: it is faint and low-contrast against both the blue and the teal
       skies, it is absent during the climb-out (t91/t92 — where one lane looked), and at
       686×480 it is 11 px of pale white. **The lane that got it right chose its frames by a
       rule written before the question was asked** (every zero-enemy frame in a pre-existing
       labelled set) rather than picking frames it expected to be informative. For a negative
       claim, the sample selection is the whole measurement.
  2. **The fixed reticle square** upper-right: corner-bracket square with an
     **ATTITUDE LINE through it that rotates with the world roll** (horizontal in level
     flight t84–94, steeply diagonal during banks t96–98 — it is an artificial-horizon
     indicator, not decoration), plus a **status dot**: ABSENT when no enemies are in
     play (t84–94, carrier/climb-out); present once enemies exist, holding YELLOW or
     RED for multi-second spans (not a fast blink — 8 consecutive 0.25 s samples of
     yellow at t115.75–117.5). In the engagement studied, yellow spans coincide with an
     active enemy bracket and kills, red spans with none — suggestive of
     yellow=locked/engaged vs red=tracking, but NOT conclusively mapped; do not hard-code
     this correlation without an audio-synced pass.
  3. **Per-enemy lock brackets**: ONE white dashed corner-bracket rides the nearest
     enemy and JUMPS to the next enemy the moment its target dies (t116→116.25: bracket
     → explosion under it, HIT +1, bracket already on the next); during a salvo,
     MULTIPLE brackets show simultaneously (t100: ~6 — **but see the caveat below; this single
     observation is NOT a licence for a lock radius**). Blue `#008cd9`→`#3bbaff`
     variants at t104; white at night (t186).
  AB2's bracket tracks the nearest threat continuously, not gated on crosshair hover
  (behavior adopted at #49). Weapon lock for missile homing additionally requires the
  crosshair near the enemy (prototype: 80 px radius, 0.5 s grace — ADOPTED = **8.3 %W, and this
  is the ONLY arcade-anchored figure for this quantity**; the shipped `lockSystem.js` runs
  **0.22 = 22 %W, 2.65× it**, justified by the "~6 brackets" count above. **REFERENCE.md ledger
  row 41 retires that count as a licence for the radius**: it is one frame, that frame is
  `stage1-lockon-missile-t100.png` — one of the four hand-picked frames behind retired row 37 —
  read during a **salvo**, on aircraft that are 2–4 px specks. Any retune cites the 8.3 %W anchor
  or a new measurement over a pre-registered frame grid). A
  hysteresis margin (~0.85×) stops bracket flicker between similar-distance enemies
  (ADOPTED). **Audio cues cannot be measured from frames** — the lock-tone order
  (acquire → tone → fire) is a stated bound, not verified; needs an audio pass.
- Missile trail: continuous opaque **WHITE** ribbon — mean V ≥0.90 and mean saturation
  ≤0.10 in daylight, ≥0.85 at night; it is white on night stages too, only ~6% dimmer
  (MEASURED R5 over stages 1/3/4 — REFERENCE.md). The old "white→grey with 2.7× value
  taper" came from `ab2-arcade-night-missiles.jpg`, which contains no smoke trail at all;
  the 2.7× taper is now flagged UNVERIFIED and the 0.37 value it carried is withdrawn —
  implementing it is what made our daylight trail black. The trail ages into a chain of
  discrete round white puffs at the tail (MEASURED: puff chains at t226, t332, t120);
  curves visibly as the missile turns into the target. Kill = large explosion; score is NOT awarded at the kill (see
  §6 — kills pay through the stage-end HIT tally).

## 4. Enemies

- Types ADOPTED from prototype (`enemy_jet_2d.gd`): fighter (speed 0.35 depth/s, 1 hp),
  interceptor (0.55, 1 hp), bomber (0.25, 2 hp). The prototype's per-enemy SCORES
  (100/200/500) are now known to be wrong — kills pay through the HIT tally, not points
  (§6 MEASURED). The speed/hp split remains ADOPTED; note the measured 4–6 s approach
  (below) implies slower depth speeds than the prototype's 0.35–0.55 (≈1.7–2.6 s
  lifetimes) — retune against the tracked approaches.
- **Wave choreography** — MEASURED on stages 1/2/3/4/7 (1 s and 0.25 s sampled windows;
  sheets rebuildable from the cited timestamps):
  - **Stage openers are overtake flights**: 2–4 enemies at near-player depth flying
    AHEAD of the player, rear-aspect with glowing nozzles, receding toward the horizon
    while weaving — they can be locked and killed from behind (stage 1 t94–99, stage 2
    t126–128, stage 4 t204). The prototype has no such pattern; it matters because it is
    the first thing every stage shows.
  - **Main pattern: head-on echelons** of 3–6 from the horizon, loose echelon/V, growing
    over ≈ **4–6 s** from first-visible dot to fly-past at SPEED M (tracked examples:
    t113→117, t230→236), firing when near-mid depth, then passing the camera.
  - Occasional near-depth lateral crossers right over the player (t118–119).
  - **Bomber type** (stage 7, t318): much larger dark airframe at close depth that drops
    a round black bomb with an orange core AND fires shot trains.
  - Liveries observed: white/grey MiG-types (stage 1+), dark green/black camo (stage 2),
    red/orange-fuselage interceptors (t102.5, t172), silver/blue prop types (stage 2 open).
- Enemies fly at altitude in the sky band, with lateral drift; they despawn past the
  camera. Scale grows with a saturating curve so the fly-past peaks at 25–30%W wingspan
  (MEASURED band, #105).
- Enemies bank INTO their drift, up to ~57° (MEASURED #131), and roll in/out on a slow
  oscillation (~0.55 rad/s phase; oscillation is multiplicative so a non-turning enemy
  flies flat) — ADOPTED.
- Firing: tracked shots aimed at the player's position at fire time, bullet speed ~0.6
  depth/s, descending from the firer's altitude to player level; enemies may only open
  fire once visibly close (depth ≥ 0.3) and fire every 1.5–2 s (ADOPTED; arcade timing
  ASSUMED — but firing-when-near is CONSISTENT with footage: shots appear from enemies at
  mid depth, t113–114, t117, t318). **Shot appearance MEASURED**
  (`reference/stage7-enemy-shot-train-t330.png`, 2× crop sampled): spaced TRAINS of 4–8
  oval fireballs, each ~6–8 native px — pale-gold core `#ffd570`, orange body `#ff7733`,
  dark red rim `#941114`, salmon edge `#e96c63` — clearly larger and darker-rimmed than
  the player's vulcan puffs. Enemy bullets are the real threat; ramming is nearly a
  non-mechanic (body collision only in a narrow near-despawn window — ADOPTED #103
  reasoning).
- Waves: formations (V, line, scattered) of 2–7, spawn interval per stage tightening from
  1.5 s (stage 1) to 0.25 s (stage 23) (ADOPTED `stage_data.gd` spawn_interval /
  `game_manager_2d.gd` wave table — prototype invention shaped by a measured on-screen
  density target of 4–6 enemies visible; the arcade's actual wave *choreography* — e.g.
  scripted crossing patterns per stage — is ASSUMED/unreplicated. Watch burst frames in
  order for pattern work).
- Density pacing ADOPTED (`spawn_pacing.gd`): dispense one enemy at a time on a 0.2–0.5 s
  tick, hard cap ~7 alive, rather than dumping whole waves.

- **ENEMY DENSITY AND EMISSION — MEASURED R9, and this section's own ADOPTED numbers turn out
  to be right while the code is the outlier.** Full criterion in REFERENCE.md "ARCADE-PACING";
  retirement of the gate that drove the code away from it is ledger row 37.

  | | arcade | shipped build (`ea3726b`) |
  |---|---|---|
  | mean enemy aircraft **on screen** (≥3 %W drawn) | **1.270** (63 frames, 6 stages) | **6.94** |
  | frames holding ≥1 enemy at **≥10 %W drawn** | **19.0 %** | **80.4 %** |
  | frames holding **no** enemy aircraft (≥3 %W) | **39.7 %** | **0.19 %** |
  | emission, aircraft / s of flight | **0.40–0.74** | **3.17–3.20** |
  | share of enemy observations below 10 %W | **77.1 %** | matches |

  **Three independent routes land between 0.40 and 0.74 aircraft/s**: the R8 judge's arcade hand
  count through Little's law; ~~the arcade's own HIT counter as a lower bound (0.48–0.54
  kills/s)~~ **— R9 CAUTION: HIT may also increment for GROUND targets, so it bounds ALL kills,
  not aircraft kills. Demoted to weak corroboration; see REFERENCE.md "Route B caution". The band
  is unchanged (its floor comes from the other two routes) and the error's direction only widens
  the gap to our 3.17–3.20/s** —; and **this section's own ADOPTED 1.5 s stage-1 spawn interval =
  0.67/s**, never retired and never implemented.

  **The density figures above are ALL-STAGE and every capture this project takes is STAGE 1,
  where the arcade runs roughly double.** Match the stage population on both sides —
  REFERENCE.md, "The stage denominator". The stage-1 arcade column is currently **n = 9** and
  cannot gate anything; the usable statement is **33–44 % readable-present on stage 1 against
  19.0 % all-stage**. The shipped `spawner.js` runs `MAX_ALIVE = 14` against the line above's
  "hard cap ~7 alive" and `DISPENSE_MIN_S/MAX_S = 0.14/0.34` against "0.2–0.5 s".

  **The ratio is 5.5× at the ≥3 %W floor and 5.6× at ≥10 %W — the same factor at both.
  The enemy SIZE distribution is right; the POPULATION is five and a half times too large.**

  **`MAX_ALIVE` rose 6 → 10 → 12 → 14 to satisfy R3's readable-presence gate, which has no
  arcade side and which the arcade fails at 19.0 %.** Do not re-derive the cap from a presence
  statistic; derive it from the emission rate above, and gate emptiness directly.

## 5. Stage structure & progression

- 23 stages. Stage changes swap sky/ground palette, horizon height, scroll speed, and
  spawn pacing — the full per-stage table with measurement provenance is
  `../afterburner/scripts/stage/stage_data.gd` (ADOPT it wholesale; it is the single
  best-verified artifact in the prototype).
- Regimes: cruise (21 stages, horizon ≈0.625H) vs canyon (8 and 17: horizon 0.13/0.07H,
  walls both sides, flow ≤0.63× cruise — canyons are SLOWER, MEASURED #127).
- **Resupply happens TWO ways, both MEASURED**:
  - **Mid-air tanker** (stage-3 open, t164–168, `reference/stage3-reload-tanker-t165.png`):
    a giant grey mothership/tanker hangs overhead (rear aspect, multiple glowing engine
    nacelles), the player tucks in beneath it, cyan "RELOAD WEAPONS" text blinks
    low-center, and the missile stock refills. No enemies during it.
  - **Runway flyover** (stage 5, t244–257, `reference/stage5-runway-restock-t252.png`):
    low pass over a tree-lined base runway — trucks, tents, ground crew, and the
    motorbike rider pacing the jet (t251–253). The stock sits UNCHANGED at 22 for the
    first ~7 s of the pass, then refills in a ~4 s burst to 70 near the end (t253–256,
    widget-strip measurement — round 4 correction of round 3's "gradual across ~11 s"
    misread). The SPEED bar sits near zero, **score is frozen for the whole pass**
    (1799790 for 10 straight seconds — the passive accrual of §6 pauses), HIT stays 0,
    no enemies.
  - The prototype's `is_bonus` flags (6/12/18, +30 missiles) match NEITHER mechanism —
    trust the frame-verified stage-3-open tanker and stage-5 runway (stage 13 is the
    verified second runway biome; its sequence is ASSUMED to mirror stage 5's).
- Stage length: prototype uses a flat 30 s timer (ADOPTED convenience); arcade spans vary
  12–49 s (MEASURED from the verified stage map — e.g. stage 5 is 12 s, stage 9 is 48 s).
  Prefer the measured per-stage durations.
- Bookends: carrier launch opens stage 1 (t84–92: deck roll, climb-out through clouds);
  carrier landing after stage 23 (t936–952 is ocean+carrier — landing cinematic ASSUMED
  in detail). Loop back to stage 1 after 23 (ADOPTED prototype behavior; arcade ends with
  a landing + ranking — ASSUMED).

## 6. Scoring / HUD

- **The scoring model is MEASURED and it is NOT per-kill score.** The Round-1 draft of
  this file (and the prototype) had it wrong:
  - **Score accrues PASSIVELY at ~3300/s at SPEED M** — verified at 0.25 s granularity
    (+770/+880 alternating per 0.25 s, t99.5–103.5) and across kill-free lulls
    (t107–112: +3300/s with HIT frozen at 11). Accrual PAUSES during the runway refuel
    (score pinned at 1799790 for 10 s, t247–256), so it is distance/speed-keyed, not
    wall-clock. Lower rate observed in the first launch second (+1110) — rate plausibly
    scales with throttle/speed (ASSUMED detail).
  - **Kills add NO immediate score** — seconds containing kills show exactly the same
    +3300 as kill-free seconds (t116→117: +3300 with HIT 11→12). A kill increments the
    HIT counter (display lags the explosion by ~0.25–0.5 s).
  - **Stage end pays HIT × 20,000** via an on-screen tally card — red "HIT COUNTS n" over
    cyan "POINTS m" counting up together (~7 hits/s), with the next stage's "STAGE n"
    label shown during it (`reference/stage2-start-bonus-tally-t124.png`: 8 hits →
    160000 mid-count; stage-4→5 tally reconfirms ×20,000 at t244–245). The tally amount
    lands in the score as it counts.
  - **HIT resets to 0 at every stage start** (t126, t204, t246) **and ONLY there** —
    round 4 confirmed it survives player death (held at 2 across a full death/respawn
    cycle, gp t198–209). The prototype has both halves wrong (`game_state.gd` resets on
    death, never on stage) — correct both when porting.
  - ~~**Continue resets the score to ~0** but keeps stage progress~~ — **WRONG, CORRECTED R6.**
    A second copy of the §2 misread, sitting in the section a scoring lane actually reads.
    **The continue does not touch the score**: 489 540 before the card, 489 540 displayed *on*
    the card, 490 000 after (§2 has the full digit-by-digit re-read and the frames). Stage
    progress is kept, which is the half that was right. **HIT is not reset either** — 4 across
    the whole continue, consistent with "HIT resets at stage start and ONLY there" below.
- HUD layout and colors: MEASURED — see REFERENCE.md's HUD table. Elements: SCORE
  emblem + digits, HIT emblem + digits (top); lock reticle square (upper right); **the
  nose sight square, 5 native px on a side, leading the nose** (§3 element 1 — confirmed
  real in R6/R7 after two lanes nearly retired it); per-enemy lock brackets, ~2× the sight
  and drawn around a target; bottom strip: SPEED + throttle bar with 0–3 scale, STAGE +
  number, missile stock icons. **No altitude bar exists.** HUD never rotates with the world
  roll — **except the upper-right reticle's attitude line, which does**, and which has been
  miscounted as four different objects because of it (REFERENCE.md, "The upper-right HUD has
  now been counted as four different things").
- Position-based or per-enemy score values: NOT OBSERVED in stages 1–7 — if they exist
  they are swamped by the flat accrual; treat per-enemy point tables as ASSUMED-wrong
  until late-stage footage says otherwise.

## 7. Title / attract flow

MEASURED sequence from the longplay (timestamps exact):
1. Attract gameplay with "SIGHT" overlay callout + live-action throttle-hand inset (t2).
2. BEST FIGHTERS high-score table over gameplay (t30).
3. Title build animation: sphere-matrix "II" + letters assemble (t60–t66), settling into
   the full title card (t74): AFTER BURNER, INSERT COIN!, CREDIT, ©SEGA 1987 (colors in
   REFERENCE.md). Cycle repeats until coin/start.
4. Game start → carrier pre-launch (t84, SCORE 0) → launch roll (t89) → climb-out (t92)
   → stage-1 flight (~t94–97 on).
Demo/attract gameplay should fly a two-regime path (cruise weave + straight canyon-style
segments), not a constant-amplitude weave (ADOPTED #122 — constant weaving reproduces
neither measured regime; prototype's path constants are in `player_jet_2d.gd`).

## 8. Rendering/feel constraints that are gameplay-relevant

- Sense of speed comes from ground flow: constant world velocity through a quadratic
  depth→screen mapping (near rushes, far crawls). Cruise apparent flow must clear the
  measured arcade floor (≥95.7 %W/s — MEASURED bound #139; "no longer demonstrably too
  slow" is the achievable standard, true parity is unmeasurable from footage).
- Scroll speed must be per-regime: one global speed cannot serve cruise and canyon
  (the horizon span differs ~2.5×, and the arcade runs canyons slower — #139).
- Explosions, enemies, and the player must occupy the frame generously (prototype gates:
  ≥90% frame occupancy of the player during death anim; 4–6 enemies visible in combat).
- Speed judgements require 60 fps capture; never tune speed from <60 fps samples (#113).

## Verification priorities (remaining unknowns, ranked)

Resolved by rounds 3–4: wave choreography stages 1–7; scoring model + stage bonus +
continue behavior (**the continue's score handling was wrong until R6 — see §2**); enemy/vulcan shot appearance; resupply mechanics and amounts (50
start, refill to 70, both mechanisms); multi-lock salvo; stock-widget denominations
(10/1 odometer); barrel roll timing, displacement, and 360° continuity; death/respawn
sequence (4 instances); lock-display structure (sight + reticle/attitude-line/dot +
per-enemy brackets).

Still open:
1. Barrel roll input trigger and whether it grants i-frames (§1).
2. ~~Throttle's effect on flow/closure and on the score-accrual rate~~ — **CLOSED AS
   UNMEASURABLE R6, not as unknown.** The throttle letter reads `M` in 27 of 27 samples
   across stages 1–8 and the bar fill never changes: the only stage-mapped recording
   contains no throttle change to measure. Remains ASSUMED and must be ADOPTED with a
   stated rationale (§1). Re-open only if footage showing an `H` or `L` state is acquired.
3. Reticle dot-color semantics (yellow vs red — correlation observed §3, not mapped);
   lock/launch audio cue order (needs an audio-synced pass, frames cannot carry it).
4. Enemy depth-speed retune to the measured 4–6 s approach; per-stage wave scripts
   beyond stage 7.
5. ~~Lives count (ASSUMED 3; dip-switch)~~ — **RESOLVED R6: MEASURED 3** by the 9-continue
   partition of 27 deaths (§2). Still open: any post-respawn invincibility window (none
   visible — §2).
6. Stage-13 runway sequence (assumed to mirror stage 5) and whether other stages open
   with the tanker reload (only stage 3's was observed).

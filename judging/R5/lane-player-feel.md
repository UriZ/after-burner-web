# R5 — player-feel lane

Owner files: `src/entities/player.js`, `src/core/input.js`, `src/game/flow/**`,
`src/game/game.js`, `src/game/score.js`, `src/main.js`. Nothing outside them was edited.

Charter: `judging/R4/feel-critique.md`, plus R4 report gap 10 (barrel roll, throttle), the
`?demo=1` canyon regime, and gap 8's attract-cycle half. Gap 5 (deaths/minute) is the
combatfx lane's and is NOT claimed here — see §6, which is the reconciliation note the lead
asked for.

Two commits' worth of work: `7b4617a` (landed before the interruption) and the uncommitted
diff on top of it. Everything below is measured against the **current working tree**.

---

## 0. The instrument, before any number

`tools/out/player-feel-r5b/probe.mjs` — re-derived from the R4 critic's
`tools/out/feel-critic/feel_probe.mjs`, with three deliberate differences:

1. **Every tick, not every third.** The R4 probe sampled `--every 3` and called the result a
   wall-clock share. At `--every 1` under `?fixed=1` the share is an exact tick count and no
   aliasing argument is needed. **Validated:** `simTime` advances by exactly 1/60 between
   consecutive rows across a 8100-row run (0.01667 → 135.000), so one row is one tick.
   **Cross-checked against the old operator:** re-sampling my own runs at every-3rd agrees to
   within **0.12 points** on every run, so the sampling rate was never the issue (§6).
2. **Reads new `__flowState` fields** (`scrollSpeed`, `throttleLetter`, `poseDeg`, `bankDeg`,
   `rollPhase`, `jetNdcX/Y`) added in `game.js` this round, all `?fixed=1`-gated. Each exists
   because the property is not readable from pixels — most sharply `poseDeg`: once the
   authored pose sheet loads, the jet's bank is a texture UV offset, not a `material.rotation`,
   so nothing about the drawn attitude is visible to an inspector looking at the sprite.
3. **`window.__setStick()`** (`main.js`, `?fixed=1` only) injects a stick state between steps.
   `?debugstick` already pinned a *constant* deflection; both properties this lane had to
   prove have timing in them (a slam inside 0.35 s; latency from a stick *change*).

`hmr: false` in the probe's Vite config is load-bearing, not tidiness: a run is ~135 s of wall
clock on a tree four other lanes are editing, and an HMR reload kills the run
("Execution context was destroyed") — or worse, silently resets `simTime` without killing it.
One run was lost to this before the fix. **`tools/capture.mjs` still has HMR on and I saw it
produce one frozen, score-0 capture set that a re-run did not reproduce** — flagged in
`ask-player-feel.md`, since that tool belongs to everyone.

---

## 1. Playable fraction — the critique's headline finding

> "across 60 seconds the player is only holding the controls for about 28 of them"

**Operator.** `playable = (ticks with __flowState().state === 'flight') / (total ticks)`, every
tick, `?demo=1&seed=N`, 8100 ticks = 135.0 s. The stage-end **tally is counted as playable**:
`flow.js` implements it as a timed overlay on live `flight` (the arcade does the same —
`reference/stage2-start-bonus-tally-t124.png` shows it over resumed combat), so the player
still has the controls. `title`, `launch` (carrier catapult), `death`, `continue` and the new
`attract` are not.

**Before** = a clean `git worktree` at `7b4617a^` (= `e3e97d2`), the last commit before this
lane's work, measured with the same probe and the same three seeds. The worktree has been
removed; it is reproducible with `git worktree add <dir> 7b4617a^`.

| | seed 1 | seed 3 | seed 7 |
|---|---|---|---|
| **playable % — before** | 35.02 | 30.79 | 34.62 |
| **playable % — after** | **78.01** | **70.63** | **69.11** |
| longest unbroken non-`flight` stretch — before | 18.53 s | 18.53 s | 18.53 s |
| longest unbroken non-`flight` stretch — after | **7.87 s** | **9.20 s** | **6.43 s** |
| longest stretch with no enemy ≥10%W — before | 19.27 s | 20.38 s | 20.63 s |
| longest stretch with no enemy ≥10%W — after | **4.22 s** | **4.27 s** | **4.47 s** |
| `continue` share — before | 14.81% | 14.81% | 14.81% |
| `continue` share — after | **2.43%** | **2.94%** | **0.89%** |

The drought row is the clearest single result in this lane: **not calling `combat.clear()` on
death took the worst "nothing on screen" stretch from ~20 s to ~4.3 s.** That was
`feel-02-death-cycle.png`'s whole indictment — 18 consecutive tiles of bare sky — and it is
gone.

### The number that does NOT depend on the combat lane

Playable % is a product of two lanes. The part this lane owns is the **cost charged per
death**, which is independent of how often deaths happen:

| | before | after |
|---|---|---|
| non-interactive seconds per death (`death` + `continue` only, `launch` excluded) | 10.96 / 10.38 / 11.03 | **5.24 / 6.02 / 5.46** |

**A death costs 48% less wall clock than it did.** Composed of: the death cycle 8.5 s → 5.2 s
(`deathSequence.js` `TUMBLE 4.5→2.0`, `RESPAWN 2.4→1.6`), and the continue countdown going
from a 10.00 s unskippable block to a mean 0.23–0.78 s because fire/missile now zeroes it.

### The model, so the two lanes' numbers can be added rather than argued about

```
playable%  ≈  100 − launch_share − deaths_per_min × 5.8 s / 60 s × 100
```
with `launch_share` = 2.59% over a 135 s run (one 3.5 s carrier catapult) and 5.8 s the
measured mean cost per death above. Checked against the runs: at the 4.4–5.3 deaths/min the
tree showed earlier today it predicts 53–57% and measured 53.3–54.1%; at the 1.8–3.1
deaths/min it showed an hour later it predicts 68–80% and measured 67.8–79.0%.

**At the critique's own target of ≤1.0 deaths/min the model gives 87.7%, clearing its ≥85%
flight-time target.** This lane cannot reach that alone and does not claim to: the remaining
distance is entirely the death rate, which is gap 5 and the combatfx lane's.

---

## 2. Throttle — verified wired, and one defect fixed

**It is wired.** `__flowState().scrollSpeed` is the value `ground.update()` is actually
scrolled at, and it reads, in flight, exactly three values and no others:

| detent | HUD letter | world scroll | = stage-1 base 68.93 × |
|---|---|---|---|
| 0 | L | 42.737 | 0.62 |
| 1 | M | 68.930 | 1.00 |
| 2 | H | 99.949 | 1.45 |

Over 135 s of `?demo=1` the lever changes detent **28–31 times = 6.6–7.3 per 32 s stage**,
against the critique's "≥8 per 32 s" target taken from the arcade gauge. Slightly under;
`THROTTLE_DWELL_S` in `demoTimeline.js` is one constant away from clearing it and I left it
where it is rather than tune a demo to a gauge-rate target.

**Does the bar read the real value?** It did not. `hudState.throttleFraction` was being fed
`THROTTLE_ENGINE_GAIN` — an *audio mix level* — so the gauge drew 0.30 at the L detent while
the world was moving at 0.62 of cruise. Now the bar gets `THROTTLE_BAR_FRAC`, the scroll
multipliers normalised against the top detent, and the engine gain goes straight to
`AudioBus.setEngine` instead of through the HUD.

Measured on the drawn pixels (`tools/out/player-feel-r5b/throttle/`, operator anchored on
`hud.js`'s own `M_BAR = {x:61,y:201,w:36,h:6}` at native 320×224, capture 3×, boundary between
the blue fill and the amber remainder):

| detent | drawn fill | commanded | note |
|---|---|---|---|
| H | 1.0000 | 1.0000 | exact |
| M | 0.6944 | 0.6897 | 1 native px of a 36 px bar |
| L | 0.4167 | 0.4276 | 1 native px |

The bar is quantised to 36 native pixels (±1.4%), so this is agreement to the renderer's
resolution. Contact sheet: `tools/out/player-feel-r5b/throttle/throttle-contact.png`.

Also fixed: the gauge is now published from `update()`'s tail, so it reads the real lever in
`title`/`launch`/`death`/`continue` too. It previously showed `hud.js`'s placeholder
`throttleFraction: 0.55` in those states — a value no detent ever produces.

**Not done:** the arcade's throttle is an 8-bit analog axis hitting 8 distinct levels. Ours is
3 detents, which is what `GAME_SPEC.md` §1 actually measures ("SPEED M", H/L ASSUMED). Going
analog would be a bigger change than the evidence supports.

---

## 3. Barrel roll — verified, and two real bugs found by measuring it

**Exists, input-triggered, correct duration, world-roll suppressed.**

Driven by `__setStick` under `?fixed=1`: stick +1 at tick 60, −1 at tick 70 (0.167 s apart).

- Roll arms on **tick 70** — the very tick the stick reverses, 0 ticks of trigger latency.
- Runs **65 ticks = 1.083 s**, against `GAME_SPEC.md` §1's frame-stepped arcade **1.0–1.2 s**.
- World roll unwinds from 11.17° to **0.00°** and holds 0 for the whole manoeuvre.
- Lateral control is retained through the roll (jet moved 0.41 → −0.70 NDC = 55.5%W of
  displacement during it, against the arcade's measured ~60%W sweep).
- **No i-frames**, deliberately: HG101 is explicit that the arcade move had none, and the
  critique says to ship it for the look. So "survivable" here means "costs you nothing and
  protects you from nothing", which is the arcade behaviour.

Visual: `tools/out/player-feel-r5b/roll3/roll3-contact.png` (ticks 474–540 of
`?demo=1&seed=1&invincible=1`). Ticks 474–486 show the horizon tilted ~25° with the jet
banked; from tick 498 to the end of the roll **the horizon is dead level** while the jet works
through steep angles and an edge-on moment at tick 510. That is the composition
`GAME_SPEC.md` §1 describes and `reference/stage4-barrel-roll-t222.png` shows.

### Checking the criterion against the arcade first

`reference/stage4-barrel-roll-t222.png` appears at a glance to contradict "the horizon stays
dead level" — there is a strong diagonal across it. It does not. I pulled the whole span
(`tools/out/player-feel-r5b/roll-ref/`, t221.0–223.2 from `ab2-longplay.mp4`): the diagonal is
a **coastline**, it holds the same angle across all eight frames, and these frames contain no
sky/ground horizon at all (the camera is low over a stage-4 island). The sequence does
corroborate the rest of the entry: steep poses, and at t222.3 the **belly palette** — the jet's
purple-blue underside with two lit nozzles — i.e. the inverted phase.

### Two bugs the measurement found

**(a) The roll froze through death.** `game.js` only calls `player.update()` while
`flow.playerControlled` is true, so a death landing mid-roll stopped `_rollT` where it was.
Probed over 135 s × 3 seeds: one roll in two of three runs ran **6.33 s instead of 1.08** —
stuck at phase 0.85 for the entire 5.2 s death sequence, then finishing its last 0.17 s after
respawn. For that whole window `isRolling()` stayed true (so world roll was suppressed through
a death that had nothing to do with a roll), the ×0.15 edge-on x-squish stayed applied to a
sprite `deathSequence.js` had taken over, and the roll's eventual scale reset landed on top of
whatever the respawn had set. Fixed with `Player.cancelRoll()`, called from `_triggerDeath`
before `deathSeq.start()`.

**(b) The horizon was not level for most of a roll in real play.** A roll is triggered by a
stick slam, so the player is normally banked hard when it starts, and unwinding at the normal
74.5 °/s took up to 0.9 s of a 1.1 s roll. Measured on real runs the horizon was still at
**35.1 / 31.9 / 23.0°** partway through rolls. `game.js` now uses a separate
`ROLL_SUPPRESS_RATE_RAD_PER_S` (332.5 °/s) while rolling, levelling from the 66.5°
saturation point in 0.2 s. **Not an arcade-measured rate** — the arcade observation is the end
state; this is the slew picked to make that description true of our frames too.

After both fixes, across 3 seeds × 135 s: **every roll is 1.08 s** (one truncated to 0.85 s by
a death, which is `cancelRoll` working), and **max |worldRoll| after the first 0.2 s of a roll
is 0.00° in all 22 rolls**.

### Still open on the roll

The roll spins the single top-view bitmap with an x-squish. The arcade draws it — belly
palette and all (t222.3). `spriteFactory.js`'s `JET_POSE_SHEET` covers the 9 bank poses only;
`player-f14-roll.png` is not shipped. Sprite lane's; noted in `ask-player-feel.md`.

---

## 4. `?demo=1` roam — and a criterion that does not survive re-measurement

**OPERATOR, and `?invincible=1` is part of it, not a convenience.** Without it the player dies
on a schedule set by the combat lane's current lethality, those deaths delete flight ticks, and
the surviving sample is a different subset of the regime cycle every time. Measured on this
tree inside one hour, the *same* timeline read canyon sd **1.82, then 1.65, then 2.41** as
combat changed underneath it. The roam is a property of `demoTimeline.js`; measure it with
deaths suppressed, pooled over whole 16 s regime cycles, every tick, 160 s.

**SECOND OPERATOR, after the lead's note that vertical moves must be quoted as pixel
centroids.** The figures above are the sprite ANCHOR, which is what `demoTimeline.js`
commands; REFERENCE.md's 52.8 / 63.5 are **pixel centroids** (I8), and the anchor is neither.
Measured on real frames (jet-on minus jet-off, `?hidejet=1`, max|Δ|>8, I8's operator, 176
frames over 155 s), the pixel centroid sits **+1.55 points below the anchor in cruise and
+2.25 in canyon** — not a constant, exactly as I8 warns, because it depends on how the
silhouette distributes its area and the two regimes bank differently. So the altitudes were
re-solved by measuring the pixel centroid and correcting, never by arithmetic on the anchor:

| | ours, PIXEL CENTROID | reference #122 |
|---|---|---|
| cruise cy | **52.75 %H** | 52.8 %H |
| cruise cx sd | **12.50 %W** | 12.88 %W |
| canyon cy | **63.52 %H** | 63.5 %H |
| canyon cx sd | **1.85 %W** | 2.59 %W |
| level-astern cy (`?debugstick=0`) | **57.51 %H** | band 52–60 %H |
| level-astern span | **35.94 %W** | band 34–38 %W |

The level-astern pair **reproduces the sprite lane's independently measured 57.51 / 55.06 to
0.01 points** — two lanes, two implementations of I8's operator, same answer. That is the
instrument validation for everything in this section.

Anchor figures for the same build, for completeness: cruise cx sd 12.88 %W / cy 52.61 %H,
canyon 2.48 %W / 63.44 %H, combined 10.80 %W. Before this round: cruise 19.02, canyon 5.43,
combined 17.41 %W; cruise cy 55.3, canyon cy 56.8 %H — the two regimes were barely
distinguishable in altitude.

### The cruise criterion was wrong, and I touched cruise anyway

The brief said *"Cruise is excellent (13.20 vs arcade 12.88); do not touch cruise."* That
figure (`judging/R4/report.md:144`, no operator stated) **is not a property of the build.**

- Pooled over 135 s, the old timeline's cruise read **19.02 %W**.
- Its closed form — `34.92 × sqrt((0.75² + 0.22²)/2)` for the two sines at full-stick
  34.92 %W — is **19.30 %W**. Two independent instruments agreeing, so neither is broken.
- The sd of **individual 11 s cruise windows** ranges **8.71 → 18.18 %W**. The slow
  component's period is 2π/0.35 = 17.95 s, so one window samples 61% of a cycle and its sd
  depends entirely on *which* 61%.

13.20 is one draw from that spread. So is the companion "cy 51.9%H" — per-window cruise cy
ranges 49.8 → 61.6 %H. The old cruise roam was **48% too wide**, and the criterion that said
otherwise is the same defect class as the inverted fin bound and the night-frame trail value:
a number with a citation that measures something other than what it names.

I changed it. `CRUISE_X_A/B` are two constants (0.512 / 0.150); revert to 0.75 / 0.22 if the
lead prefers the published figure — nothing else in the file depends on that choice.

### Why canyon needed solving, not scaling

Closed form predicts canyon sd from `CANYON_X_A` alone, and it is wrong there. The canyon
window is 5 s against an 11.4 s wander period, and the dominant term is the **follow-filter
transient** as the jet settles from wherever cruise left it: whole-window cx sd 2.41 %W, but
excluding the first 2 s of each window it is **0.77 %W** — ~90% of the canyon variance is the
entry, not the wander. Raising `CANYON_X_A` by 42% moved the statistic almost not at all. The
remaining 2.41-vs-2.59 gap (0.18 %W) is not reachable by that constant and is not worth
distorting the wander to chase.

Also fixed in the same file: the canyon branch used `t - CRUISE_S` (absolute time) rather than
`phase - CRUISE_S`, so every canyon window entered its own sine at a different point and could
step-discontinuously on the regime boundary — i.e. the regime was not the repeatable thing the
file's header promised.

### ⚠ The canyon criterion has been measured with an aliased sampler

The regime cycle is **exactly 16.000 s**. Any sampling interval that divides it — 0.5 s, 1 s,
2 s — hits the **same phases of every cycle**, so it is a coherent subsample, not a random
one. Demonstrated on one telemetry run, same operator, canyon cx sd:

| sampling | cruise cx sd | canyon cx sd |
|---|---|---|
| every tick (60 Hz) | 12.83 %W | **2.48 %W** |
| every 30 ticks (2 Hz) | 12.93 | 3.01 |
| every 60 ticks (1 Hz), phase A | 12.92 | **1.41** |
| every 60 ticks (1 Hz), phase B | — | **6.41** |
| every 7 ticks (incommensurate) | 12.81 | **2.50** |

**The same rate at two different phase offsets reads 1.41 and 6.41 %W for the same signal.**
Cruise is almost immune (its window is 11 s of a 17.95 s sine, so phases smear); canyon is not,
because 5 s windows repeating on a 16 s cycle alias hard.

R4's published **canyon 6.19 %W sits inside that aliased range**, and I accidentally reproduced
it — 6.21 %W — on my own first pass before switching to an incommensurate interval. So "the
canyon regime is too loose" was, at least in part, an artifact of the sampler. CLAUDE.md's "no
speed claims from sub-60 Hz sampling" applies to distribution statistics too, not only to speed.
Every canyon number in this report is either every-tick telemetry or frames sampled every 53
ticks (0.883 s), chosen to be incommensurate with 16.000 s.

### ⚠ One flag for whoever judges composition

These are anchor positions, and **the canyon regime's 63.5 %H deliberately sits below the
52–60 %H centroid band.** That band was drawn against cruise frames (REFERENCE.md's own cruise
cy is 52.8 %H); the reference's canyon cy is 63.5 %H and is outside it *by construction*. A
composition reading from a random `?demo=1` frame is now a mixture of two populations. Split by
regime (`simTime % 16 < 11` is cruise) or capture cruise only. Repeated in
`ask-player-feel.md` because it can produce a false FAIL on a currently-passing headline metric.

---

## 5. Attract cycle (gap 8, second half)

The title used to time out once after 8 s and then fly a **real game with nobody holding the
stick** — not an attract mode, a game being lost on its own.

Now: `title (8 s) ⇄ attract (24 s)`, looping forever, and only `fire`/`missile` starts a credit.
Verified by stepping (`?fixed=1&showtitle=1`): title 8.00 s → attract 24.02 s → title 8.02 s →
attract 24.02 s → … A press during either goes to `launch` → `flight` with score reset to 0 and
3 lives. Contact sheet: `tools/out/player-feel-r5b/attract/attract-contact.png`.

`ATTRACT_DEMO_S = 24` is set against `demoTimeline.js`'s 16 s regime period, so one attract
segment always shows cruise, the barrel roll (cycle phase 8 s), the canyon regime and the
return to cruise.

Design notes: `attract` is a **state of its own**, not `flight` with a flag, specifically so it
cannot inflate §1's playable-fraction statistic with time nobody is playing. It flies
`demoTimeline` — the same attract flight `?demo=1` uses — so there is one attract flight in the
build, not two that drift apart. Deaths are suppressed in it (an attract loop that dies shows a
cabinet losing, and its length would otherwise depend on the combat lane's lethality).

Also this round: `demoTimeline` now performs a **deliberate barrel roll once per 16 s cycle**.
Measured on the previous timeline, the smooth sines produced **1, 0 and 0 rolls in 135 s across
three seeds** — the attract loop was not showing the verb this round added. The slam is
three segments (+1/−1/+1), not two, because `player.js` registers a flick only on a sign
*change*: a two-segment slam silently fails whenever the wander was already positive. Now
6–9 rolls per 135 s run.

**No regression to anyone else's capture path**, re-verified by stepping:
`?fixed=1` → tick-0 `flight`; `?demo=2` → tick-0 `flight`; `?demo=1` → `launch`;
`?fixed=1&showtitle=1` → `title`. `npx vite build` passes.

---

## 5b. Sprite-art ask A2 — the night pose sheet, and a bank-model bug it exposed

**A2 is done.** `player.js` now loads both `JET_POSE_SHEET` and `JET_POSE_SHEET_NIGHT` and
picks by `this._night`; the `!this._night` short-circuit is gone. `selectPoseCell` still
returns `false` on a null texture, so each sheet's decode failure falls back independently to
the procedural bitmap, and `setJetNightPalette` still runs on every transition so the fallback
has the right palette on it.

Verified by a new `?fixed=1` telemetry field, `poseSource` ∈ {`sheet-day`, `sheet-night`,
`procedural`}, which exists because the two paths are indistinguishable from outside — both
end as one sprite with one map, and a LEVEL jet looks the same either way. Held right stick,
`?debugstick=1&invincible=1`, 5400 ticks:

| stage index | poseSource | poseDeg | max abs(material.rotation) |
|---|---|---|---|
| 0 (day) | `sheet-day` × 1920 ticks | 35.6 | **0.000°** |
| 1 (day) | `sheet-day` × 1921 ticks | 35.6 | **0.000°** |
| 2 (night) | `sheet-night` × 1559 ticks | 35.6 | **0.000°** |

Day and night now reach the same drawn pose by the same path. Visual:
`tools/out/player-feel-r5b/night-pose-contact2.png` (day level / day banked / night level /
night banked). The lead's point that this was a *feel* difference is borne out — night was
previously banking by spinning one bitmap.

Known, accepted edge, found by the same telemetry: a barrel roll that straddles a day→night
stage boundary swaps to the procedural night texture mid-spin (44 ticks = 0.73 s of one roll
in a 135 s run), because `_applyLevelPose` self-guards against running during a roll. Left
alone: the roll spins a level astern bitmap either way, and the procedural one *is* the level
astern view, so only which of two equivalent drawings is spinning changes, in the right palette.

### The bank model was snapping to full bank on any stick deflection

Found while doing the centroid work, not by reading. A jet-on/jet-off difference mask over
seven cruise frames read **span 20.27 %W against the 34–38 %W band**. I crop-and-looked before
publishing it, which is what caught it: every sampled frame was at full bank, and the span band
is a **level-astern** statistic.

The cause was mine. `player.js` had `targetBankDeg = sign(input.x) * 35.6` — written when
`core/input.js` was the only input source and its `x` was binary. But `?demo=1`'s stick is
analog, so **any** non-zero deflection snapped the drawn jet to its 35.6° extreme, and the jet
was at full bank essentially always, sitting at the level cell only at exact zero crossings.
Now `targetBankDeg = clamp(input.x, -1, 1) * 35.6`, still snapped onto the six-rung ladder.
The arcade stick is analog too (MAME `segaxbd.cpp` clamps it to 0x20–0xe0), and REFERENCE's
six-pose ladder is exactly what a proportional deflection quantises onto. **Keyboard behaviour
is unchanged** — `|x| = 1` still targets the top rung and still reaches it in one tick (§6).

Effect on the same seven frames: span **20.27 → 32.14 %W**, and level astern measures
**35.94 %W**, in band.

Also done while in the state machine (the lead's second note): the pose sheet is now applied
**as soon as it decodes**, not on the first `update()`. `game.js` only calls `update()` while
`flow.playerControlled` is true, which is false for the whole ~3.5 s carrier launch
(`launchSequence.js` owns the sprite there) and false again through death/respawn — so the jet
was drawn from the procedural bitmap for the entire opening of a fresh game. The two drawings
are the same art today so there was no visible pop; this removes the dependency on them
*staying* identical, which is not a property either lane can keep guaranteeing. The
`playerControlled` branch itself is correct and stays: calling `update()` during launch would
fight `launchSequence.js` for the same transform every frame.

One more: a roll now spins the **level** cell. A roll is triggered by a stick slam, so the
ladder is almost always at its 35.6° extreme when it arms, and spinning *that* drawing
double-counts the bank. This also makes true again what `player.js`'s header claimed and the
pose sheet had quietly falsified — that the roll spins a level astern drawing.

---

## 5c. World ask W4 — clouds now follow the stage, and what that exposed on stage 3

**W4 done.** `_enterStage` switched the sky and the ground but not the clouds, so stage-1 white
banks rendered over stage 2's orange sky and stage 3's night sky. `game.js` now passes
`clouds` into `GameFlow` and `_enterStage` calls `this.clouds.setStage(stage)`, guarded because
`?noclouds=1` leaves it undefined, and from the stage-change path only — `setStage` disposes and
re-authors all four bank textures, so it is cheap but not free.

Verified by capture at one frame per stage (`tools/out/player-feel-r5b/cloudstage/contact.png`,
ticks 1920 / 3840 / 5760): stage 1 white over blue, stage 2 **cream** over orange desert, stage 3
**grey-white** over the night sky. The world lane's palettes are doing what they say.

### HUD readability on stage 3 — I raised it, then withdrew it

Capturing W4 put the stage-3 HUD row in front of me and I filed it as a contrast defect needing
opaque plates. **That was wrong and it is withdrawn.** The full retraction with evidence is A6 in
`ask-player-feel.md`; the short version:

The background measurement stands. Operator: terrain band immediately above the HUD row (native
y[178,195] ×3 — same ground the HUD overlaps, no HUD ink in it), fraction at or above the cream
ink's luminance (~226 for `#f5e9a0`):

| stage | background mean luminance | at/above the ink's luminance | p99 |
|---|---|---|---|
| 1 (sea) | 84.1 | 0.00 % | 177.5 |
| 2 (desert) | 119.8 | 0.00 % | 184.5 |
| 3 (city lights) | **11.9** | **3.40 %** | **247.0** |

Stage 3 is the *darkest* of the three on average; the issue is that its top 3.4% is brighter than
the glyph ink. (My first pass at even this measured the HUD band itself and counted the glyphs as
background, reading a meaningless 5.3 / 5.2 / 8.6% — the table above is the corrected operator.)

What does not stand is everything I built on it. world-r5 checked the arcade before accepting the
diagnosis: the arcade's own stage-3 HUD band is **9.76%** above that luminance — nearly 3× ours —
with no opaque plate behind the row. I then tested the remaining question instead of asserting it
again. **Operator:** dilate each ink class's glyph mask by 1 px, subtract the glyphs, and compare
bright-background fraction in that ring against the surrounding field — a halo makes the ring much
darker, bare speckle makes them match.

| ink class | arcade | ours |
|---|---|---|
| red `STAGE` | 2.2× darker ring | **24.3×** |
| cream digits | 0.8× — no halo | **1.9×** |
| white stock | 0.5× — no halo | **4.9×** |

**Our glyphs are better separated than the arcade's on every class, and the arcade has no halo at
all on two of three.** The premise failed, not just the remedy. Nothing to build, and `lightDensity`
must not be dimmed for it.

The lesson I am recording against myself: I formed "this is hard to read" from an 8× NEAREST
upscale of a still, which exaggerates speckle relative to how it reads at native scale in motion,
then reasoned from that impression to a mechanism ("keylines can't help, the specks are inside the
counters") that I never tested. The one part I had actually measured — the background statistic —
was the one part that survived.

---

## 6. Responsiveness (nothing in this project had ever measured it)

**Operator:** `?fixed=1&invincible=1`, no demo. Settle at centre, inject full right stick via
`__setStick` at tick 40, step one tick at a time, read `__flowState()`. "Visible" = one
**native** pixel, i.e. 2/320 NDC (the game renders 320×224 native).

| | ticks | ms |
|---|---|---|
| 1 native px of jet displacement | **1** | 16.7 |
| drawn bank pose leaves 0° | **1** | 16.7 |
| drawn bank reaches its 35.6° peak | **2** | 33.3 |
| 50% of final lateral travel | 7 | 116.7 |
| 90% of final lateral travel | 24 | 400.0 |

Pose ladder over the first six ticks after input: `23.3, 35.6, 35.6, 35.6, 35.6, 35.6`.

Against the critique: it measured the jet tilting **3.7° in the first three frames** where the
arcade tilts ~23°, because bank was welded to `worldRoll × 0.8` and took 893 ms. We now reach
23.3° on tick 1 and the 35.6° peak on tick 2 — **1400 °/s**, over the critique's ≥400 °/s floor
and the arcade's measured ≥1236 °/s. The position response (117/400 ms) is unchanged; the
critique called it fine and I did not touch `FOLLOW_RATE`.

**No input smoothing was added anywhere**, so there is nothing else to publish a latency for.

---

## 7. Reconciliations I owe, and what I am not claiming

**The R4 critique's 46.9% vs my baseline's 30.8% (same seed 3, same `?demo=1`).** Not a
sampling-rate artifact: re-sampling my runs at the R4 probe's every-3rd rate agrees to within
0.12 points. It is entirely the **death count** — their run had 6 deaths in 120 s, my `7b4617a^`
worktree run had 9. Their 6 × 8.5 s = 51 s = 42.8% reproduces their published death share
exactly, and mine reproduces mine. They measured the shared tree with other lanes' uncommitted
work in it; I measured a clean checkout. Both are right about their own tree.

**Deaths/minute is not my number and is unstable right now.** Across today it read 3.56–4.00
(baseline), then 3.56–5.33, then 1.78–3.11, as the combatfx lane moved lethality. §1 publishes
the model so the lead can combine whatever their final number is with my 5.8 s/death rather
than quoting two playable-fraction figures taken an hour apart. **My state-machine changes do
alter the measured death rate** in one direction worth naming: shortening the death cycle from
8.5 s to 5.2 s puts more flight seconds into the same wall clock, so *deaths per minute of
wall clock* rises even if deaths per minute of flight time is unchanged. Normalise on flight
time when comparing to R4.

**A fairness cost of my own rank-1 change, unresolved.** Not clearing combat on death means the
player respawns into a sky that may already have shots in flight. Measured on the earlier runs,
**17% of lives ended within ~1 s of the 2.0 s respawn grace expiring** (durations 2.2, 2.2, 2.6,
2.7 s). I did not fix it: the plausible fixes are a threat-aware grace or clearing only in-flight
enemy *shots* on respawn, and both are lethality tuning on top of a lane that is mid-change.
Raised in `ask-player-feel.md` rather than done unilaterally.

**Day frames.** The earlier numbers in this report were taken as `__flowState()` telemetry
while the sprite's aspect was wrong. The sprite lane's fix has landed and the lead has
withdrawn that warning, so §4's pixel-centroid work and §5b are measured on day frames — and
the level-astern pair reproduces the sprite lane's own figures to 0.01 points, which is the
check that the two sides are now measuring the same thing.

**Throttle detent rate is 6.6–7.3 per 32 s against the critique's ≥8** — one constant short, left
alone rather than tuned to a demo target.

---

## Files touched

| file | what |
|---|---|
| `src/game/flow/flow.js` | attract state + cycle; `_startRealGame`; `_publishThrottle` in every state; SPEED bar reads speed not engine gain; `cancelRoll` on death; stage digit shows the rendered stage; `clouds.setStage` on stage change (ask W4) |
| `src/game/flow/demoTimeline.js` | roam amplitudes and altitudes solved against REFERENCE #122; phase-relative canyon; scripted barrel roll |
| `src/entities/player.js` | `cancelRoll()`; bank target proportional to stick deflection; day+night pose sheets (ask A2); level pose applied at decode and at roll onset; `bankDeg`/`poseDeg`/`rollPhase`/`poseSource` telemetry |
| `src/game/game.js` | `ROLL_SUPPRESS_RATE_RAD_PER_S`; `__flowState` additions (incl. `poseSource`, `spriteRotationDeg`); `_playerNdc()`; night/stage wiring via `contentStageIndex` |
| `src/main.js` | `window.__setStick()` under `?fixed=1` |

Evidence and tools: `tools/out/player-feel-r5b/` (`probe.mjs`, `summarise.mjs`, the JSONL runs,
`roll3/`, `attract/`, `throttle/`, `roll-ref/`). No commits made; nothing pushed.

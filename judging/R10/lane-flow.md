# R10 — GAME FLOW lane: the attract pilot, repaired against the new flight model

**Scope**: `src/game/flow/**`, `src/game/game.js`, `src/main.js`, `src/game/score.js`.
Nothing outside that was edited. Two changes are **requested** of other lanes (F1, F2, §8).

**Trees.** Every our-side figure below comes from a **clean checkout in a scratch clone**, never
from the shared working tree, because another lane was editing `judging/R10/feel-critique.md`
while this ran and the live `src/` carried this lane's own uncommitted work:

| arm | commit | what it is |
|---|---|---|
| **A** | `dcc3965` | the build **before** the R10 flight model — the authored attract flight as it actually flew |
| **B** | `21c789c` | HEAD — the declared regression, nothing else changed |
| **C** | `21c789c` + this lane's patch | the repair |

A and B differ **only** in `player.js`'s flight model; B and C differ **only** in this patch.
The final live tree reproduces arm C **bit-for-bit** on all 9 600 ticks (re-run after the last
comment edit), so every number here describes the code that is in the tree.

**Sampling rate**: **60 Hz, every tick, no gaps**, both sides. Our side is stepped one tick at a
time through `window.__step(1)` with `__flowState()` read between every pair of steps
(`tools/out/flow-r10/trace_probe.mjs`; the simulation's own fixed grid,
`core/fixedloop.js FIXED_DT = 1/60`). The arcade side is `ffmpeg -ss T -vsync 0` consecutive
decode of `ab2-longplay-60fps.mp4`, `t = T_ss + (i−1)/60`.

---

## 1. What changed

`demoTimeline.js` was an **open-loop stick curve authored against a POSITION controller**. Its own
AMPLITUDES block records the inversion it was solved through — `cx(%W) = 34.92 * stickX`,
`cy(%H) = 55.60 − 20.51*stickY` — and the pre-R10 `player.js` made that literally true
(`targetX = input.x * ENVELOPE_X; this.x += (targetX − this.x) * t`). Under R10's rate control the
same numbers mean *speeds*, so `CRUISE_X_A = 0.512` stopped meaning "roam to 17.9 %W" and started
meaning "drive outward at 1.54 envelopes/s".

The repair keeps the authored curve and changes only the actuator:

- **`demoTarget(simTime)`** — the curve exactly as authored, now returned in its native units,
  **normalised screen position** (1.0 = the rail). No constant was retuned. Not one.
- **`demoTimeline(simTime, player)`** — a proportional position controller:
  `stick = GAIN * (targetWorld − playerWorld) / ENVELOPE_for_that_direction`, which commands
  `velocity = 3*GAIN*error` because `player.js` sets `RATE = 3.0 * ENVELOPE`. Still a pure
  function of (time, position) — no state, so calling it twice in a tick is free and `?fixed=1`
  determinism is untouched.
- The **barrel-roll slam** bypasses the controller entirely and reaches `player.js` as literal
  ±1 stick, because it is a *gesture*, not a position (§5).
- Two call sites updated to pass the aircraft (`main.js`'s `?demo=1` override, `flow.js`'s
  `attract` state). `core/input.js`'s `fn(simTime)` contract was **not** widened — that file is
  the world lane's; the player is closed over in `main.js` instead.
- `game.js` gained **`stickX`/`stickY`** in `__flowState` — measurement-only, inert, and necessary
  because the commanded stick is no longer computable outside the running simulation (§4).

**Why not re-solve the constants against the new rates**: it is the shorter patch and it re-breaks
the moment anyone retunes `RATE_*` — which the feel lane's own report names as open (our full-stick
rate is 2.9× the arcade's measured sight rate). A controller is invariant to that.

---

## 2. The regression, measured (B against A)

`?fixed=1&demo=1&invincible=1&seed=1`, 9 600 consecutive ticks = 160.0 s, pooled over 10 whole
regime cycles — the operator `demoTimeline.js`'s own header specifies. Anchor units
(`jetNdcX/Y`, the projected sprite centre); REFERENCE's 52.8/63.5 %H are *pixel centroids* and sit
1.55–2.25 points below these, so the arm-to-arm comparison is anchor-to-anchor throughout.

| 160 s, 60 Hz | **A — authored (`dcc3965`)** | **B — HEAD (`21c789c`)** | **C — repaired** |
|---|---|---|---|
| cruise cx sd | **12.86 %W** | 30.45 | **12.92** |
| canyon cx sd | **2.40 %W** | 25.73 | 3.18 |
| pooled cx sd | **10.78 %W** | 29.14 | 10.87 |
| cruise cx range | −22.46 … +27.85 | **−35.95 … +35.95** (both rails) | −22.31 … +30.03 |
| cruise cy mean | 50.82 %H | 48.56 | **50.97** |
| cruise cy p5 / p95 | 37.15 / 63.76 | **27.02 / 77.31** (both rails) | 37.27 / 63.74 |
| canyon cy mean | 61.44 %H | 67.88 | 61.09 |

**B is not a degraded wander, it is a jet pinned to the envelope.** Its cruise p5/p95 are 27.02 and
77.31 %H — `player.js`'s two vertical rails to five decimals — and its lateral extremes are
±35.95 %W, the lateral rail. The authored choreography is not approximately wrong, it is absent.

The same thing on the path a player actually sees, the **`attract` state** (`?fixed=1&showtitle=1`,
5 400 consecutive ticks = 90 s, three full title→attract cycles, all three arms stepping through
identical state boundaries to the tick):

| attract state only, 3 958 ticks | A | B | C |
|---|---|---|---|
| cx sd | **10.51 %W** | 29.23 | **10.50 %W** |
| cx range | ±22.3 | −35.95 … +37.14 | ±22.1 |
| cy mean | **56.30 %H** | 61.99 | **56.34 %H** |
| cy range | 38.50–63.93 | **27.02–77.31** | 39.07–63.90 |

Picture: `tools/out/flow-r10/r10-flow-01-attract-A-B-C.png` (rows A / B / C, same six ticks).

---

## 3. The repair, measured (C against A)

**The authored choreography is restored.** On the attract path the lateral spread agrees to
**0.01 %W** (10.51 → 10.50) and the mean altitude to **0.04 points** (56.30 → 56.34). On the 160 s
`?demo=1` run cruise cx sd is 12.86 → 12.92 (the ADOPTED target is 12.88) and cruise cy mean
50.82 → 50.97.

Per-tick, over 9 390 matched flight ticks:

| |Δ| between A and C | mean | p95 | max |
|---|---|---|---|---|
| lateral, all ticks | 1.05 %W | 4.02 | 25.95 |
| lateral, **excluding the slam+roll window** (phase 7.9–9.6 s) | **0.79 %W** | 2.13 | 7.91 |
| lateral, slam+roll window only | 3.18 %W | 12.03 | **25.95** |
| vertical, all ticks | 0.47 %H | 1.44 | 10.38 |

**The residual is concentrated in the barrel roll and that is expected, not a miss**: a ±1 stick
gesture displaced the pre-R10 jet 15.7 %W in 0.1 s (position chase) and displaces the rate-model
jet 4.4 %W (velocity ramp). Same gesture, same roll, smaller lateral jolt. The 1.1 s roll that
follows is flown by the controller in both arms.

**What it costs, stated rather than buried.** The canyon regime is ~90 % entry transient by its own
header's measurement, and the shipped gain is half as stiff as the controller the file was authored
against, so the entry is slower: canyon cx sd **2.40 → 3.18 %W** (ADOPTED 2.59 — A undershoots by
0.19, C overshoots by 0.59) and the entry dips to cy p5 **60.43 → 56.87 %H**. Cruise, which is what
every composition capture and every published roam figure is about, is unaffected.

**The `ENVELOPE_X` mirror is validated by this comparison, not by a comment.** `player.js` does not
export `ENVELOPE_X`, so the controller mirrors `2.6` locally (announced at load, picks up the real
export automatically if F1 lands). A mirror wrong by k % scales every lateral position by k %; the
lateral spread agrees to 0.01 of 10.5 %W, bounding the error well under 1 %.

---

## 4. Two instruments withdrawn, and why the third exists

**Withdrawn: `bankDeg` as a stick proxy.** The first attempt at counting flicks read sign changes of
the drawn bank ladder, which exists in all three arms and needed no instrumentation. It returned
**0 flick pairs within 0.35 s in every arm — including arms whose rolls demonstrably fire every
16 s.** The reason is structural: `player.update()` returns early for the 1.1 s of a roll, so
`bankDeg` stops updating exactly when the flicks that caused the roll would have shown. A clean,
stable, plausible zero. Crop-and-look's numeric cousin caught it: a statistic that says "no flicks"
on a trace with ten rolls in it is wrong about the trace, not about the build.

**Withdrawn: inverting NDC to world x.** `jetNdcX` cannot be converted back to the world x the
controller acts on, because `worldRoll` rotates the position offset before projection.

**So `stickX`/`stickY` were added to `__flowState`** — the only place the commanded stick exists
once the pilot is closed-loop. **Verified inert rather than asserted inert**: the position and
`rolling` series are bit-identical with and without the field, 9 600 ticks.

**Probe selftest**, run on a real arm and not a synthetic: tick spacing exactly 1/60 (max error
1.3e-14 s), a re-run of the same URL byte-identical, and the trace actually moves. One defect it
found in itself: the probe pinned `seed=1` *before* appending `--url-params`, and
`URLSearchParams.get` returns the first occurrence — two "different seed" runs came back
byte-identical and the probe, not the build, was the reason. Fixed; the seeds below are real.

---

## 5. THE ROLL COUNT — and the repair introduced a roll bug before it fixed one

**Counted as false→true transitions of `player.isRolling()` on consecutive ticks** over 160 s =
**10 scheduled slams** (phase 8.0 of a 16 s cycle):

| arm | roll onsets / 160 s | scheduled hit | unauthored |
|---|---|---|---|
| A — authored (`dcc3965`) | **11** | 10 of 10 | 1 (t = 144.15, phase 0.15) |
| B — HEAD | **11** | 10 of 10 | 1 (identical list to A) |
| C — first attempt, GAIN 2.0, no deadband | **18** | 10 of 10 | **8** |
| C — GAIN 2.0 + deadband | 14 | 10 of 10 | 4 |
| C — GAIN 1.0, no deadband | 11 | 10 of 10 | 1 |
| **C — shipped (GAIN 1.0 + deadband)** | **10** | **10 of 10** | **0** |

Seeds 1, 5 and 11 all give 10 — a weak replication for this statistic and reported as one, since
the seed drives combat and the attract pilot is a closed loop on the player alone.

B's roll list is **identical to A's**, which is the tell that the regression is purely positional:
the roll trigger reads the stick, the stick series is the same open-loop curve in both, only the
response to it changed.

**Two distinct mechanisms produced the extra rolls, and the first one was diagnosed wrong.**
`player.js` arms a roll on a stick **sign change with no magnitude condition** (`Math.sign(input.x)`).
That was safe for every pilot this game has had, because all of them were digital. A position
controller is the build's first analog stick.

1. **Station-keeping dither.** A controller parked on its target does not emit zero, it emits
   dither. All 10 unauthored flick pairs had at least one side below **|0.0057|**, against the
   authored wander's own median command of 0.0438 (cruise) and 0.0164 (canyon) — two orders of
   magnitude apart, which is the only reason a threshold works. Hence `STICK_DEADBAND_X = 0.01`:
   ≥1.5× the largest observed dither crossing, below the quieter regime's median command, costing a
   station-keeping band of 0.349 %W.
2. **Ringing at the regime boundary**, which the deadband does *not* fix and which I initially
   assumed the deadband had fixed. The target steps at every regime change; at ζ = 0.707 the error
   rings back through zero **0.30 s** later and `ROLL_SLAM_WINDOW_S` is **0.35 s**. The cure is
   damping, not thresholding: ζ = sqrt(ACCEL/(4·KP)) = sqrt(1/GAIN), so **GAIN = 1.0 is exactly
   critically damped — the largest gain that cannot overshoot, hence cannot manufacture a sign
   reversal.** Chosen by that rule, not by closeness to any statistic; GAIN 2.0 tracks the
   pre-R10 trajectory more exactly and was rejected on the roll count.

**Both parts are load-bearing** (11 without the deadband, 14 with it at the wrong gain), and the
shipped combination is **one roll cleaner than the build it restores** — A's own open-loop curve
produces an unauthored roll at a regime boundary once per 160 s.

---

## 6. MEASURED AGAINST THE ARCADE — and it found a real cost in the repair

A position controller holds station with a **near-zero stick**, and in this build a zero stick means
a level jet *and* a level horizon (`game.js`: `targetRoll = input.x * ROLL_MAX_RAD`). That is a
large visible change, so I measured it rather than argued it.

**The right population is the arcade's OWN ATTRACT MODE**, not a human dogfighting:
`STAGE_MAP.md` records "attract mode runs to ~84 s; the run starts at the carrier launch ~88 s".
Two consecutive 60 Hz windows inside the attract demo, 720 frames total:

| |horizon tilt| | mean | median | p95 | >1° | >5° | >10° | >20° | null |
|---|---|---|---|---|---|---|---|---|---|
| **ARCADE attract t 4.0–10.0** | 11.45° | 9.52° | 29.22° | 81.6 % | 65.7 % | 47.3 % | 21.2 % | 21.4 % |
| **ARCADE attract t 18.0–24.0** | 10.41° | 7.79° | 30.67° | 84.3 % | 62.5 % | 40.8 % | 17.5 % | 8.1 % |
| **A — our authored attract** | 14.75° | 9.75° | 38.43° | 89.4 % | 77.8 % | 44.7 % | 30.2 % | — |
| **B — HEAD** | 14.75° | 9.75° | 38.43° | 89.4 % | 77.8 % | 44.7 % | 30.2 % | — |
| **C — the repair** | **2.53°** | **1.46°** | **6.81°** | 66.7 % | **18.1 %** | **2.4 %** | **0.0 %** | — |

Our side is telemetry (`worldRollDeg`, exact). The arcade side is a line fit of the sky's lower
edge, and its validation is the part that matters:

- **Operator**: the modal colour of the top 40 rows is the sky (AB2's sky is a flat fill), and the
  horizon is the bottom edge of the matching region, taken as a **RUN of 11 of 12 rows** rather than
  a pixel. Theil–Sen plus one residual-trimmed refit. `tools/out/flow-r10/horizon_modal.py`.
- **The run condition was earned**: the first version took the first *pixel*, and `SCORE`/`HIT` are
  drawn with a dark-blue keyline that passes a sea test — a quarter of all columns came back at
  y = 45 — the family CLAUDE.md warns about in capitals, and the HUD has defeated two line fits
  in this project before.
- **Cross-validated on real frames by an independent operator** keyed to the *sea* instead of the
  sky, sharing no colour assumption and with a completely different null set: on the same 420
  stage-1 frames the two read mean 20.92° vs 22.72°, median 22.47 vs 23.85, p95 **37.94 vs 38.01**.
  Close but not identical — which, per REFERENCE's own rule, is the useful kind of agreement.
- **The synthetic control passed and is not the evidence**: rotating a real frame by ±3° and ±8°
  recovers the angle to ≤0.073°. It proves the operator computes an angle, not that the angle is the
  horizon's. The evidence is `r10-flow-02-ARCADE-horizon-fit-validation.png` and
  `r10-flow-03-ARCADE-attract-horizon-fits.png` — the fitted line drawn on the frame, looked at.
- **The nulls were cropped and looked at too** (`r10-flow-04-…png`): they are the **most steeply
  rolled frames**, where the horizon leaves the frame and too few columns carry a boundary. So
  every arcade figure above is a **LOWER bound on tilt**, and the bias widens the gap it reveals
  rather than narrowing it.

**The finding, and it is not comfortable: the repair restores the authored positions exactly and
costs a property that was already arcade-matched.** A's roll distribution sits close to the arcade's
own attract demo (median 9.75° against 7.79–9.52°, >10° in 44.7 % against 40.8–47.3 %); C's is about
a sixth of it (median 1.46°, >10° in 2.4 %).

**The diagnosis matters more than the number.** A's arcade-matching roll was produced by **bank
slaved to POSITION** — a held offset meant a held stick meant a held bank. That is the exact
coupling R10's flight model was written to remove, and it cannot be recovered by any choice of
controller: under a rate control, flying slowly *is* flying with the stick near centre. The real
cause is that **our authored wander moves ~6.3 %W/s at its fastest, while the arcade's pilot moves
in bursts of 0.350 fracW/s (35 %W/s) modal and parks between them** (feel lane §3.1, 418
consecutive steps). AB2's attract pilot is **sweep-and-hold**; ours is a slow continuous sine.

This is **OPEN** and is the single highest-value thing left in this file (§9, item 1). It is a
re-authoring of the roam's *time profile*, not a regression repair, and it would move statistics the
criteria lane gates on — so it is proposed, not done. Note that scaling the wander's *frequencies*
would raise the roll while leaving cx sd untouched (sd of a sine is amplitude-only), and that is
**not** the right fix: a faster sine is closer to the "constant-amplitude weaving" REFERENCE #122
explicitly rules out. Sweep-and-hold is what the arcade does.

---

## 7. Direct `x`/`y` writes audited against the new accessors

`player.js` now exposes `x`/`y` as accessors whose setters zero the matching velocity. **Two sites,
four writes** exist in this lane's files, and all four are correct:

| site | what it does | verdict |
|---|---|---|
| `flow/deathSequence.js:406-407` | `player.x = 0; player.y = 0` at the end of `respawn` | **correct** — hits the setter, kills the velocity the pre-death life accumulated |
| `flow/launchSequence.js:215-216` | same, at the end of `climbOut` | **correct**, same reason |

No write anywhere in this lane touches `_x`/`_y` or `vx`/`vy` directly, and no other file I own
writes the player's position at all.

**Verified in the simulation, not only by reading** (`?demo=1&forcedeath=20`, consecutive ticks
across three hand-backs — one from `launch`, two from `respawn`): control returns at exactly
`ndcX = 0.00000`, `ndcY = −0.11200` (the base cruise anchor) with the stick at zero, and the first
tick's step is **0.019–0.136 %W, accelerating** — the rate model's ramp-from-rest signature. A jet
inheriting the previous life's velocity would jump on that first tick; none does.

---

## 8. Requested of other lanes (NOT done here)

**F1 — `src/entities/player.js` (feel lane): `export const ENVELOPE_X = 2.6;`** (add `export`;
`ENVELOPE_Y_UP/DOWN` already are, and `spawner.js` already derives from them). `demoTimeline.js`
mirrors it meanwhile, announces the mirror at load, and picks up the real export automatically.
Worth the same line for `RATE_X`, `RATE_Y_UP`, `RATE_Y_DOWN` and `ACCEL_RATE`: the controller gain's
damping is a function of all four, and today that relationship lives in a comment instead of in the
code.

**F2 — `src/entities/player.js` (feel lane): the barrel-roll flick needs a MAGNITUDE, not just a
sign.** `const sign = Math.sign(input.x)` fires on a 0.0005 deflection. That was harmless while every
pilot was digital; it is not harmless now, and it will bite again the moment a real analog input
device or any other closed-loop pilot exists. Suggested: ignore flicks below ~0.5 — the authored
slam is ±1, so nothing that is meant to fire stops firing. The deadband shipped here is the half of
this that can be done without reaching into another lane's file, and it should be **removed** when
F2 lands rather than left as a second threshold.

---

## 9. OPEN, with reasons

1. **The attract pilot's motion is a slow sine where the arcade's is sweep-and-hold** (§6). Our
   attract loop now flies the right path with an almost level horizon; the arcade's own attract demo
   holds >10° of tilt 41–47 % of the time. Targets to author against, all measured:
   |tilt| mean 10.4–11.5°, median 7.8–9.5°, p95 ~30°; sight traverse 0.350 fracW/s modal with
   stationary holds at ±9.83 %W (feel lane §3.1). **Not done because it is a re-authoring of the
   roam, not a repair of the declared regression, and it moves figures the criteria lane gates on.**
2. **REFERENCE #122's cruise cx sd (12.88 %W, ADOPTED from the prototype) is in tension with the
   only in-repo arcade measurement of the lateral envelope.** A distribution with sd 12.88 %W cannot
   fit inside the feel lane's measured **±9.83 %W sight rails** (9 holds, 418 consecutive steps).
   Either the jet's lateral envelope genuinely exceeds the sight's, or one of the two is wrong.
   **This file is tuned to 12.88 and I did not change it** — but a criterion this lane's whole
   output is solved against now has a measured conflict, and it belongs to the criteria lane.
3. **Canyon entry is softer than the pre-R10 build** (cx sd 2.40 → 3.18 %W, cy p5 60.43 → 56.87).
   Recoverable in full by adding velocity feedback (`player.vx` is public; KD = 0.414 gives ζ = 1 at
   KP = 6). Not taken: it couples this file to two more constants it cannot import, to buy back
   0.78 %W of a statistic whose provenance is ADOPTED. Revisit if the canyon entry is ever gated.
4. **Roll-count replication is weak.** Seeds 1/5/11 agree at 10, but the seed drives combat and the
   attract pilot is closed-loop on the player alone, so the three runs are not three independent
   draws of this statistic.

---

## Artefacts

**`tools/out/` is gitignored** (same as every previous lane's evidence directory), so everything
below lives in the working tree only and will not survive a clean checkout. The scripts are the
reproducible part: all three take a `--root`, so any arm can be re-measured from a fresh clone.

- `tools/out/flow-r10/trace_probe.mjs` — 60 Hz consecutive telemetry trace, `--root`, `--selftest`
- `tools/out/flow-r10/analyse_trace.py` — the regime split and the arm comparison
- `tools/out/flow-r10/horizon_modal.py` — palette-agnostic horizon tilt (arcade attract)
- `tools/out/flow-r10/arcade_horizon.py` — the stage-1 sea-keyed cross-check operator
- `tools/out/flow-r10/traces/*.json.gz` — the six traces every table above is computed from
- `tools/out/flow-r10/r10-flow-0{1..4}-*.png` — the montage and the three look-at-it validations

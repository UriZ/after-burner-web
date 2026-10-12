# R11 — the FEEL lane: the envelope, the lock, the stick

**Trees, named for every figure.** Our-side numbers come from two **pristine `git archive`
extractions of `5e3d57e`** (HEAD at the start of this round) into
`.../scratchpad/tree-before` and `tree-after`; `tree-after` is the same extraction with this
lane's two changed files copied over it and nothing else. The working tree carried other lanes'
live, uncommitted edits throughout — the enemy-art, effects and world lanes were all in it, and
the set changed under me while I worked — and **no figure in this file was taken from the
working tree**, which is the only way an A/B means anything on a shared tree.
No commit, no stash, no checkout, no reset, no push.

**Sampling rate, both sides, every temporal figure.**
Arcade: `ffmpeg -ss T -i .reference-cache/video/ab2-longplay-60fps.mp4 -frames:v N -vsync 0`,
consecutive 60 Hz. Ours: one `window.__step(1)` per sample with the state read in the same
`page.evaluate`. **§1's envelope is sampled at 1 Hz and is a POSITIONAL EXTREMUM — it makes no
speed claim and says so wherever it appears.**

**Page errors: 0** across every arm in this file (2 step arms, 6 combat arms, 2 attract arms).

**Scripts for every figure, committed:** `judging/R11/sheet.py`, `jet_envelope.py`,
`jet_nozzles.py`, `analyse.py`, `probe_r11.mjs`, `demo_check.mjs`, and the hand-read data
`arcade_jet_x.csv`. Images (gitignored, large) under `tools/out/feel-r11/evidence/`.

---

## 0. THE HEADLINE, because it changes what the next three rounds should work on

> **The arcade's player AIRCRAFT roams ±29.5 %W. Ours roams ±34.93 %W. `ENVELOPE_X` was never
> the defect — every gap list that has asked for it to move for two rounds has been comparing
> OUR AIRCRAFT against THE ARCADE'S SIGHT.** The quantity that really is 3.5× too wide is our
> **sight**, and no value of `ENVELOPE_X` can fix it, because `combat.js` builds the sight as
> the jet's position **plus** a screen-space offset, and in the arcade the sight moves **less**
> than the aircraft, not more — by a factor of 2.95.

Three constants were frozen together on that comparison (R10 judge gap 2: *"until the arcade's
jet envelope exists, `ENVELOPE_X`, `RATE_X` and `LOCK_ACQUIRE_S` are all frozen"*). **Two of
them turn out to be already right and are deliberately not touched; the third is unfrozen and
the lock cone moved with it.**

---

## 1. JOB 1 — THE ARCADE'S LATERAL ENVELOPE, FOR THE AIRCRAFT

### 1.1 What was measured, and the three instruments that failed first

I built, selftested and **withdrew three automatic operators** before measuring this by hand.
All three pass their synthetic suites and all three fail on real frames, for the same reason:
**they cannot tell the player's aircraft from an enemy, a cloud, an explosion fragment or the
bottom HUD**, and identity is the whole problem.

| instrument | selftest | what it did on real frames |
|---|---|---|
| `jet_envelope.py`, airframe mass (desaturated, in a lower band) | **11/11**, incl. two independent labellers agreeing to the pixel | found fuselage *fragments*, and put one box on a cloud. `evidence/look-w1-boxes2.png` |
| the same, with morphological closing | — | merged the jet with clouds **and with the SPEED/STAGE HUD strip**; boxes span half the frame. Same montage |
| `jet_nozzles.py`, the afterburner nozzle PAIR | **13/13**, incl. a lowest-pair rule and an over-wide-pair rejection | median pair separation **133 px** — it was pairing nozzles belonging to **two different aircraft**. Retuned with a hand-measured 22–58 px separation prior, then landed on the **HUD missile icons** and on stage 4's brown rock, which is inside the orange hue band. `evidence/look-nz-s4.png` |

`jet_envelope.py` is kept and still runs — its gate `DARK_MIN` is calibrated on real numbers
(player-jet bbox **3.6 %** dark pixels on w1/f0001 against a cloud's **0.14 %** on w1/f0220, a
26× separation) and it now has a cloud-rejection control. It is a usable operator for a frame
where a person has already said which blob is the jet. **It is not an identity test and is not
used as one here.**

### 1.2 The measurement

**Hand-digitised off ruled contact sheets** (`sheet.py` draws a labelled 5 %W ruler on each
panel; the sheets are `evidence/sheet-s{1,4,12}{a,b}.png`). Read point: the midpoint of the
aircraft's two afterburner nozzles, or the fuselage centre where one is occluded.

* **Population**: 3 windows × 30 s, **1 Hz**, stages **1 / 4 / 12**.
* **Stage identity read off the HUD digit at BOTH ends of every window** —
  `evidence/look-stage-digits.png`, six crops, all unambiguous.
* **Excluded and named**: stage 1 f001–f004 (the carrier catapult launch — the aircraft is not
  under player lateral control) and stage 12 f020 (a boss sprite fills the right of the frame
  and I could not identify the player; **recorded as unread, not guessed**).
* **n = 67.** Data: `arcade_jet_x.csv`.

| population | n | min | max | mean | **sd** | half-span |
|---|---|---|---|---|---|---|
| stage 1 | 20 | 22.0 | 64.0 | 42.95 | **13.55** | 21.00 |
| stage 4 | 24 | 20.0 | 76.0 | 51.50 | 19.13 | 28.00 |
| stage 12 | 23 | 19.0 | 78.0 | 48.13 | 20.38 | 29.50 |
| **ALL** | **67** | **19.0** | **78.0** | 47.79 | 18.19 | **29.50** |

> ### **ARCADE PLAYER-JET HALF-ENVELOPE: ±29.5 %W**, about a 48.5 %W centre
> (−31.0 / +28.0 about screen centre — symmetric to 3 points of W).
> **It is a LOWER BOUND.** 1 Hz under-samples extrema, and the longplay pilot need not ever
> have held full deflection. Both biases run the same way: the true rail is at least this wide.

**Reading precision, taken from the data rather than asserted.** The stage-4 1 Hz series repeats
with period 4 for three consecutive cycles — `25.0 64.5 55.0 73.0 / 21.0 65.0 54.0 71.0 /
24.0 66.0 55.0 71.0`. The phase-wise sd across those three cycles is **[2.08, 0.76, 0.58, 1.15],
mean 1.14 %W**, and that figure *includes* whatever really differed between the cycles, so it is
an **upper bound on the hand-reading error**. Stage 12 shows the same period-4 structure.

### 1.3 THE TENSION THE FLOW LANE RAISED IS RESOLVED, AND NOTHING WAS WRONG

> REFERENCE #122's cruise `cx sd` is **12.88 %W**, ADOPTED from the old prototype — and a
> distribution with sd 12.88 cannot fit inside the arcade sight's ±9.83 %W. One of those is
> wrong.

**Neither is wrong. They are two different objects.** My stage-1 sd, hand-digitised by an
operator who had not seen #122's figure when the sheet was read, is **13.55 %W** — **5 % from
the ADOPTED 12.88**, on the aircraft. The ±9.83 %W is the **sight**. In the arcade the aircraft
roams **2.95×** as far as its own sight, which is exactly what you expect if the sight is the
projection of a point ahead of the aeroplane, nearer the vanishing point. **REFERENCE #122 is
corroborated and should be upgraded from ADOPTED toward MEASURED on this evidence; the sight
figure stands untouched.**

### 1.4 OURS — and the R10 judge's ±17.5 %W is this same build, read differently

Measured on the pristine `5e3d57e`, `probe_r11.mjs --mode resp`, consecutive 60 Hz:

| quantity | value |
|---|---|
| jet screen x, **stick HELD** at full deflection, settled | **±0.35048 NDC = ±17.52 %W** |
| jet screen x, **stick RELEASED**, settled | **±0.69865 NDC = ±34.93 %W** |
| jet screen x, extremes incl. transient | ±0.70301 NDC = ±35.15 %W |
| sight screen x, extremes | ±0.69865 NDC = **±34.93 %W** |

> **The ratio between the two jet readings is 1.993 and all of it is CAMERA ROLL.** `playerNdc`
> is the drawn jet's position *through the rolled camera*, and holding the stick is also what
> rolls the world — so **a full-stick reading can never see the rail the jet actually occupies**.
> The R10 judge's script (§3: 12 ticks of right stick, release, 90 ticks) read the rolled
> position and called it "rails, not drift". It is this build and it is a real number; it is not
> the envelope.

The arcade population in §1.2 contains banked **and** level frames, so the comparable quantity
is the union: **ours ±34.93 %W against the arcade's ±29.5 %W — 1.19×, inside the slack the
arcade figure's own lower-bound status carries.**

My sight figure reproduces `feel-critique.md` §3.4's **34.93 %W to four significant figures**,
by a different probe on a different commit. That corroborates the critic's sight measurement and
is what licenses using the rest of its sight numbers here.

### 1.5 THE DECISION ON `ENVELOPE_X`, `RATE_X`, AND WHY THEY DO NOT MOVE

**`ENVELOPE_X` stays at 2.6.** It is arcade-matched on the only arcade column that exists for
it. The comment that called it a *"placeholder, to be tuned against reference video"* has been
replaced with the measurement, the operator, and the conflict it resolves.

**`RATE_X` stays.** The *"our rate is 2.76× the arcade's"* finding is the same cross-object
comparison: **0.379 fracW/s is the arcade's SIGHT maximum** (saturating distribution, 138 steps,
13 manoeuvres, 3 stages, two operators — that part is solid and refutes `player.js`'s old
"it is a lower bound" comment, which is now corrected in the file). Scaling it by the 2.95
sight→jet ratio gives an arcade **jet** rate of **1.12 fracW/s** against our measured **1.064** —
**within 5 %**. That is a **DERIVATION** resting on the sight being a linear projection of the
jet's lateral position, published as such, **not a measurement** (see §4 OPEN).

**What actually needs to move is in `combat.js`, which this lane does not own.**
`combat.js:714` is `sight.x = playerNdc.x + up.x * SIGHT_FRAC / 0.5` — an offset that can only
**add** to the jet's excursion, so our sight can never move less than our jet. The arcade's does,
by 2.95×. **Ask filed: `judging/R11/ask-combat.md`.** Until it lands, widening `ENVELOPE_X`
would drag the sight from ±32 to ±47 %W and take the lock cone with it — it would make the
build worse, which is why the measurement's own direction is not acted on this round.

---

## 2. JOB 2 — MAKING THE LOCK REQUIRE AIMING

### 2.1 What changed

1. **`LOCK_RADIUS_FRAC: 0.22 → 0.083`**, the only arcade-anchored figure for this quantity
   (GAME_SPEC §3's prototype-ADOPTED 80 px of 960 = 8.3 %W; the 0.22 is REFERENCE ledger row 41,
   tuning with nothing behind it, and `lockSystem.js`'s own comment said so).
2. **The always-on TRACKING bracket is gated on the aim** — `_updateTracking` now picks the
   nearest enemy that passes `_lockable` (the *identical* test the acquisition uses), and drops
   a tracked enemy the moment the aim leaves it.
3. **`LOCK_ACQUIRE_S` is NOT touched** (0.22 s). It is not measurable from footage — it is the
   delay between a button press nobody can observe and a bracket one can — and §1 removed the
   coupling that would have forced it, rather than giving me a value for it.

Change 2 retires an **ADOPTED** behaviour (#49, *"AB2's bracket tracks the nearest threat
continuously, not gated on crosshair hover"*) against a **MEASURED** one: two independent 60 Hz
decodes over 1 140 consecutive arcade frames on stages 1/4/12 put a bracket on screen in
**17.8 %** of frames, two or more in **3.1 %**, maximum **3** — and the relaxed detector that
produced those independently reproduced the feel lane's published 3.6 % / max 3 on two stages it
had never seen (`judging/R10/feel-critique.md` §2.2). **The measurement wins**, as it has four
times against ARCHITECTURE.md.

### 2.2 THE BLIND-PILOT COMPARISON, RE-RUN

Three pilots, **identical trigger cadence in every arm** (40 ticks held, 5 released — the missile
fires on *release*), 5 400 consecutive 60 Hz ticks each, `?fixed=1&invincible=1&seed=3`. The gun
trigger is never pulled, so **every kill is a missile kill**. Both trees are pristine
extractions of `5e3d57e`; the only difference is this lane's four files.

| pilot | tree | launches | **kills** | kills/launch |
|---|---|---|---|---|
| **still** (stick never touched) | before | 35 | **15** | 42.9 % |
| **still** | **after** | 11 | **4** | 36.4 % |
| **track** (flies the sight onto the nearest enemy) | before | 36 | **18** | 50.0 % |
| **track** | **after** | 39 | **18** | 46.2 % |
| sweep (sinusoid, never aims) | before | 7 | 4 | 57.1 % |
| sweep | **after** | 0 | 0 | — |

> ### **A MOTIONLESS STICK WENT FROM 83 % OF A TRACKING PILOT'S KILLS TO 22 % — 15 → 4 — WHILE
> THE TRACKING PILOT'S 18 DID NOT MOVE.**
> The weapon is exactly as strong for a pilot who aims and three-quarters weaker for one who
> does not. That is the whole content of the change.

**`kills / launch` is not the headline and is reported only because R10's critique asked for it
to stop being one** — it conditions on the thing under test, since launches are themselves an
outcome of aiming.

**The `sweep` arm going to zero is the risk I am naming rather than hiding.** The R10 judge's
caution was *"a game where a moving sight cannot lock at all is not AB2 either"*. A moving sight
**can** lock — `track` locks more often than before (39 launches against 36). What can no longer
lock is a sight that sweeps across the sky without ever stopping on anything, and it should not.
A real human is between these two arms and this probe has no arm for that; **the honest bound is
that I have measured the two ends and not the middle.**

### 2.3 THE DRAWN-BRACKET POPULATION — gap 4, and it is now arcade-matched for the ambient case

The comparable quantity is what is **drawn**, not what is locked.

| | ≥1 bracket | ≥2 | max |
|---|---|---|---|
| **ARCADE**, 1 140 consecutive 60 Hz frames, stages 1/4/12 | **17.8 %** | **3.1 %** | **3** |
| *arcade, feel lane R10, 420 frames, stage 1* | *—* | *3.6 %* | *3* |
| ours, `still`, **before** | 72.1 % | 27.8 % | 4 |
| **ours, `still`, after** | **15.4 %** | **5.8 %** | **3** |
| ours, `track`, before | 64.7 % | 25.2 % | 4 |
| ours, `track`, after | 48.3 % | 23.9 % | 4 |

* **The ambient population is now arcade-correct**: 15.4 % against 17.8 %, 5.8 % against 3.1 %,
  and the maximum is 3 against the arcade's 3, from 4.0× and 9.0× too often.
* **The `track` arm is still 2.7× the arcade's ambient figure and I am not claiming it is
  fixed.** A pilot that holds the sight on a target every single tick draws a bracket every
  single tick by construction, and the arcade's 17.8 % pools whatever its pilot was doing. The
  two are not matched conditions. What can be said is that the before/after on the same arm is
  64.7 → 48.3 %.
* **No bracket animates in size.** The R10 acquisition ramp walks the *arm length* only, inside
  the range the two published arcade frames already bracket; untouched here.

---

## 3. JOB 3 — THE ACCELERATION RAMP IS GONE

`ACCEL_RATE = 12.0` is deleted and `this.vx = cmdVX` replaces the first-order velocity lag.
`RATE_X`, `ENVELOPE_X` and the clamp behaviour are unchanged.

### 3.1 Consecutive 60 Hz traces, %W per tick, both trees named

```
ONSET from a settled neutral, stick to full LEFT
  BEFORE 5e3d57e   -0.66 -0.87 -1.04 -1.18 -1.28 -1.37 -1.43 -1.48 -1.52 -1.54 -1.55 -1.56
  AFTER  +R11      -1.83 -1.82 -1.82 -1.81 -1.79 -1.78 -1.76 -1.74 -1.72 -1.69 -1.67 -1.64
  ARCADE (w1 f0098-f0103)   +3.0  0.0  +6.0  +7.0  +6.0   px of 1028 -- max rate in ONE frame

MID-TRAVEL REVERSAL, stick flips R -> L
  BEFORE 5e3d57e   -0.04 -0.37 -0.66 -0.89 -0.80 -0.89 -1.05 -1.17 -1.28 -1.36 -1.43 -1.49
  AFTER  +R11      -2.07 -2.16 -2.19 -2.17 -1.85 -1.75 -1.75 -1.75 -1.75 -1.75 -1.75 -1.75
  ARCADE (w2 f0254-f0259)   0.0 -4.0 +1.0 0.0 +6.5   -- no ramp at all
```

| | peak step on tick | onset t90 | mid-travel reversal, peak on tick |
|---|---|---|---|
| **BEFORE** `5e3d57e` | **12** | 12 ticks | **23** |
| **AFTER** +R11 | **1** | 8 ticks | **3** |
| **ARCADE** | **1 frame** | 1 frame | ≤2 frames |

> **The first tick of an input is now the fastest tick, in both directions.** That is the
> signature the arcade's own series has and the one R10 traded away.

**The residual t90 of 8 ticks is NOT the flight model and the measurement proves it, rather
than my asserting it.** `playerNdc` is the drawn jet through the rolled camera, and the world
roll has its own time constant in `game.js` (`ROLL_RATE_DEG_PER_S`). The clean demonstration:
**release the stick while the jet is resting on the rail** — world x cannot move at all, it is
clamped — and the drawn screen x still travels **+16.75 %W, identically in both trees**. All of
that is roll. In world space `vx = cmdVX` means a neutral stick gives `vx = 0` on the release
tick and `_x` cannot change; the `n [1440,1500)` segment measures exactly `+0.0000 NDC`.

### 3.2 Hold-station, the R10 win, is kept

| | travel after release, mid-travel (0.67 s hold) | at the rail |
|---|---|---|
| BEFORE | +13.10 %W | +16.75 %W |
| **AFTER** | **+8.82 %W** | +16.75 %W |

The 8.82 %W common to both is the roll unwinding (it is the whole of the at-rail figure, where
no world-x motion is possible). The **4.28 %W difference is the removed coast.** The rails
themselves are byte-for-byte: **±0.70301 NDC before, ±0.70303 after.**

### 3.3 Two R10 claims not re-cited, as instructed

*"44 % of displacement arrives after release"* is a property of the 0.20 s hold, not of the
model, and is not used anywhere above. `player.js:168`'s *"0.379 fracW/s is a LOWER BOUND"* is
**corrected in the file**: the distribution saturates (53 steps at +6, 9 at +7, one at +8,
nothing above), so it is the arcade's **maximum — for the sight.**

### 3.4 `core/input.js` — read, unchanged

No smoothing, no ramp, no filter. The keyboard stick is already digital and instantaneous; the
lag was entirely in `player.js`. Reported so it reads as *checked*, not as *skipped*.

---

## 4. CROSS-AREA EFFECT I CAUSED, MEASURED AND REPORTED

`demoTimeline.js`'s header says in capitals that the attract loop's damping depends on
`player.js`'s `RATE_*` **and `ACCEL_RATE`**, which it cannot import. Removing the ramp turns its
plant from second-order into a pure integrator, so the proportional controller can no longer
overshoot at all. Measured (`demo_check.mjs`, `?fixed=1&demo=1&seed=3`, 9 600 consecutive ticks,
both pristine trees, 0 page errors):

| | barrel rolls per 160 s cycle | jet cx mean | jet cx sd |
|---|---|---|---|
| BEFORE `5e3d57e` | **10** | 2.38 %W | 9.30 %W |
| AFTER +R11 | **9** | 2.80 %W | 9.53 %W |

`demoTimeline.js` authors **ten** rolls per cycle and its own deadband note treats the count as
the gated statistic. **We now fire nine — one authored roll is being missed.** Small, in the
flow lane's file, and theirs to resolve; the likely cause is that the stick slam resolves faster
so the sign-change window shifts. **The cx sd above is a whole-cycle figure and is NOT the same
statistic as `demoTimeline`'s cruise-regime `cx sd`; it is reported only as a "nothing
collapsed" check.** Ask filed in `judging/R11/ask-flow.md`.

---

## 5. OBSERVED / MEASURED / DERIVED / WITHDRAWN

**Decoded and looked at.** 72 consecutive arcade frames at 60 Hz (stage 4, `-ss 218.0`), 300
consecutive at 60 Hz (stage 1, `-ss 98.5`), 90 frames at 1 Hz across three stages; 10 crop
sheets inspected by eye.

**Measured off the arcade here.** The player aircraft's lateral envelope, ±29.5 %W, n = 67,
three stages, 1 Hz, with its per-stage sds and a 1.14 %W test-retest bound.

**Measured on ours.** Rails, held and released; step response, onset, reversal and coast on
consecutive ticks on two named trees; launches, kills and drawn/completed lock populations for
three pilots on two named trees; the attract loop's roll count on two named trees.

**Derived, not measured.** The arcade's **jet** lateral rate (1.12 fracW/s = 2.95 × the sight's
measured 0.379), under an explicitly stated linear-projection assumption.

**Withdrawn after failing on real frames.** Three automatic player-jet trackers (§1.1) — all
three passed their synthetic suites first. **A fourth near-miss worth recording:** `demo_check`
returned **0 ticks** on its first run, a clean stable zero that looked like "the attract mode is
dead". It was my `page.evaluate` returning `undefined` on a non-serialisable field of
`__flowState`. Crop-and-look's exact shape, and it took two minutes to find only because the
rule says to look.

**Not attempted, named so it is not read as checked.** The arcade's **jet** per-frame rate at
60 Hz (§4 below). The arcade's vertical envelope. `MAX_TURN_FRAC_PER_S`. The missile's 2.45 s
flight-time tail. Any listening test.

---

## 6. OPEN

1. **THE ARCADE'S JET RATE AT 60 Hz IS STILL NOT MEASURED, and it is now the single highest-value
   acquisition left on this lane's board.** I tried: 72 consecutive frames at stage 4, sheeted at
   12 panels. **My hand-reading precision is ~1.1 %W and a per-frame step is ~0.6–1.9 %W, so the
   method cannot resolve it** — the reads were non-monotonic by up to 15 %W between adjacent
   frames, which is physically impossible and is my error, not the arcade's motion. It needs a
   tight high-zoom crop around a jet whose identity has already been established by eye on the
   same window, or an automatic tracker that solves identity. **Until it exists, the 1.12
   fracW/s in §1.5 is a derivation and `RATE_X` is parked on it.**
2. **The sight's placement model** (`combat.js`) — §1.5. This is the largest remaining lateral
   defect in the build and it blocks any further movement on `ENVELOPE_X`.
   `judging/R11/ask-combat.md`.
3. **The `track` arm still draws 2.7× the arcade's ambient bracket rate** (§2.3), and the arms
   are not matched conditions. Needs an arcade figure conditioned on the pilot actually aiming,
   which may not be recoverable.
4. **The `sweep`-to-`track` middle is unmeasured** (§2.2). A human pilot lives there.
5. **One attract-mode barrel roll lost** (§4), flow lane's file.
6. **`MAX_TURN_FRAC_PER_S = 0.77` is still solved, not measured**, and the **2.45 s flight-time
   tail** on receding `overtake` targets is still unfixed. Both are in `missiles.js`, which this
   lane owns and did not get to. Neither was touched; `missiles.js` is unchanged from `5e3d57e`.
7. **`MAX_LOCKS = 6` against two independent arcade readings of max 3 simultaneous brackets.**
   GAME_SPEC §3's "~6 brackets at t100" is one hand-counted frame; `-ss 98.5` covers t = 100.75
   and two detectors found a maximum of 3 over 1 140 frames. Not changed — it is the salvo size
   and it belongs to a combat-wide decision — but it should not keep being cited as MEASURED
   without someone re-counting that frame.

---

## 7. FILES CHANGED

| file | change |
|---|---|
| `src/entities/player.js` | `ACCEL_RATE` deleted, `vx = cmdVX`; the `ENVELOPE_X` comment replaced with the arcade measurement and the sight blocker; the refuted "lower bound" justification corrected in place |
| `src/weapons/lockSystem.js` | `LOCK_RADIUS_FRAC` 0.22 → 0.083; `_updateTracking` gated on `_lockable` |
| `src/weapons/missiles.js` | **unchanged** |
| `src/core/input.js` | **unchanged** (read; no lag lives there) |

`npx vite build` passes. No test suite exists in this repo.

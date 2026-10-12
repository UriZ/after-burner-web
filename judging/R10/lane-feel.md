# R10 — the feel lane: the missile, the lock and the stick

**Subject.** Baseline `8725647`. Every "before" number below was taken on a **pristine
extraction of that commit** at `.../scratchpad/head8725647`, not on this tree — so the
baseline is 8725647 byte-for-byte and cannot have been contaminated by my own edits or by any
other lane's. It was produced with `git archive HEAD` **while HEAD was 8725647**; HEAD has
since moved to `7265ba3` (criteria lane), so anyone reproducing this must say
**`git archive 8725647`** explicitly rather than re-running my command.

**The tree I measured "after" on is NOT "8725647 + my diff", and that matters.** At the time
of my captures `git status --short` also carried another lane's uncommitted work in
`src/effects/explosions.js`, `src/effects/smoke.js`, `src/weapons/enemyShots.js` and
`judging/R10/envelope_r10.py` (that last one has since been swept into `7265ba3` mid-edit —
not mine, flagged here only so its state is not a surprise). I touched none of them. `missiles.js` imports `sizeSprite` and
`snapSmokeValue` from `effects/smoke.js`, so the **pixels** in my missile panel carry that
lane's work; the **hit-rate, flight-time and lateral-miss figures do not** — they come from
the simulation's own state through a new drain hook, not from the frame.

**My diff, confirmed by `git diff -U0` to contain nothing but this round's work:**
`src/weapons/missiles.js`, `src/weapons/lockSystem.js`, `src/entities/player.js`,
`src/weapons/combat.js` (three measurement-only hooks, added under `?fixed=1`, none of which
touches the shared PRNG). `src/core/input.js` unchanged. **No commit, no stash, no checkout,
no reset, no push.**

**Every temporal figure on both sides is a CONSECUTIVE 60 Hz series.** Arcade: `-vsync 0`
native-rate decode of `ab2-longplay-60fps.mp4`. Ours: `window.__step(1)` one tick at a time
with the state read in the same `page.evaluate`. No aggregate in this report stands in for a
shape; where I could only get an aggregate I say so.

**Page errors across every probe arm in this report: 0.**

---

## 0. Instruments, and the two that failed their own controls

| instrument | what it does | control it passed |
|---|---|---|
| `tools/out/feel-r10/cc.py` | 4-connected labelling | **selftest 3/3**, planted rectangles incl. a 1-px component |
| `tools/out/feel-r10/brackets.py` | finds AB2's four-corner bracket glyphs and measures the box | **selftest 5/5**: three sizes, a **two-different-sizes** case (the thing the whole lock measurement turns on), and a **null** on empty sky |
| `tools/out/feel-r10/jettrack.py` | densest-bright-window tracker | selftest 3/3 — **and then failed on real frames** (438 of 1080 null). Not used for any number here |
| `tools/out/feel-r10/sighttrack.py` | template match for the sight glyph | selftest 3/3 — **15 of 193 recall on real frames. Withdrawn** |
| arcade missile-stock counter | exact launch ticks from the HUD icon row | validated against hand counts: **8 / 1 / 3 / 5 on four frames**, monotone over 1080 |
| `tools/out/feel-r10/probe_r10.mjs` | per-tick traces + frame capture | **selftest 3/3** incl. a planted overshoot and a planted peak-tick |

### The alignment anchor, re-derived rather than inherited

`-ss` sequence extraction on the AV1 60 fps file **was** documented as starting ~4 s early, so
the timestamps had to be earned. I extracted 420 frames from `-ss 98.5` and matched them
against the committed `reference/stage1-missile-salvo-t100.75.png` by direct pixel distance:
**`f-0136`, mean absolute difference 0.0000 — pixel-exact, with neighbours at 21.3 and 23.5.**
A zero with large neighbours is a spike, not a plateau, which is what makes it an anchor
rather than a match against a static scene. `t = 98.5 + (i-1)/60` lands f-0136 at exactly
100.750.

**burstN is anchored too, and this report's first version wrongly hedged it.** I originally
wrote that burstN's absolute timestamps were ±4 s because its `-ss 174.0` carried no anchor of
its own. It does: **two committed stage-3 stills fall inside it.** They are 686×480 against
burstN's 1028×720, so this is a resampled match and the test is a sharp minimum rather than a
zero —

| committed still | best frame | mean abs diff | next-best non-adjacent | implied t | residual |
|---|---|---|---|---|---|
| `reference/stage3-night-level-t175.png` | f-0061 | **1.796** | 4.95, 6.19 | **175.000** | **+0.000 s** |
| `reference/stage3-night-lockon-t186.png` | f-0721 | **2.034** | 6.70, 7.42 | **186.000** | **+0.000 s** |

Both land on the nominal second to the frame, with a 2.7× and 3.3× separation from the
nearest non-adjacent competitor. **`t = T_ss + (i-1)/60` is exact at `-ss 174.0` as well as at
`-ss 98.5`** — two seek points 76 s apart — and the criteria lane reproduced it independently
at `-ss 96.0` on its own decode, with the effects lane adding two seek forms. The old caveat
is theirs to retire and they have; the point for this report is that **every arcade timestamp
in it is exact, not hedged.** Stage identity still comes from the HUD digit regardless of
seek behaviour, and that is unaffected.

### `brackets.py` reproduces TWO published arcade numbers it was never shown

This is the control that lets anything in §2 be quoted. Over **420 consecutive stage-1
frames**, the width histogram of everything the detector finds is cleanly **bimodal**:

| mode | n | my measurement | published arcade figure | error |
|---|---|---|---|---|
| sight glyph | 68 | **1.493 %W** | 1.563 %W (`lane-criteria` JOB 2, two resolutions, two stages) | −4.5 % |
| lock bracket | 75 | **5.246 %W** | 5.15 %W (R4 gap 10, two frames, targets 7× apart) | +1.9 % |

Two numbers, published by two different lanes in two different rounds, recovered by one
operator validated on neither, on frames chosen before either was looked for.

### Two measurements I took, and am withdrawing

1. **The arcade missile's turn rate, by tracking its rocket plume.** Nine tracks of
   red-orange blobs across the t186.77 night salvo gave a tidy 0.62–0.80 fracW/s peak lateral
   rate. **I cropped it and looked** (`r10-10-WITHDRAWN-fireball-tracks.png`) and the tracked
   objects are **expanding fireballs**, not flying missiles — three of the nine have **zero
   net displacement** over 0.6–0.85 s while reporting 4–5 px/frame of "motion", which is
   centroid wander of a growing blob. The number is plausible, stable, reproducible and
   meaningless. **Withdrawn.**
2. **Arcade flight times from the HIT counter.** The HIT digit cell shares pixels with the
   sight reticle's blinking dot, which alternates yellow/red on a 2-frame cycle; the field
   hash changes on ~40 % of frames with the counter unchanged. **Withdrawn.** A third attempt
   — attributing detonations to the missile by launch-to-detonation geometry — fails because
   the arcade pilot holds the trigger, so no detonation can be assigned to a weapon.

**The arcade's seeker turn rate is therefore NOT MEASURED in this round.** §1.4 says what I
used instead and why.

---

## 1. THE MISSILE

### 1.1 Motion comparison — `r10-07-MISSILE-arcade-ours-committed.png`

Three rows, consecutive 60 Hz, aligned on the launch instant:

* **ARCADE**, stage 3 night, launch at **t = 186.767** (the missile-stock icon row decrements
  — the one arcade event in this whole report whose timing is exact rather than inferred).
* **OURS, R10 tree** — `?fixed=1&invincible=1&seed=3`, tracking pilot, launch tick 165,
  impact logged tick 219.
* **COMMITTED 8725647** — same URL, same seed, same pilot, same ticks.

Read the rows against each other and three things fall out:

1. **The arcade's salvo is a FAN that spreads across the screen.** The missiles are
   distinguishable from the plume at t+0.15 to t+0.28; by t+0.42 the frame carries five or
   six separate engagement events spread across the upper right, **each on its own bracketed
   target**. Ours puts one or two objects into a single white mass. (What those objects are at
   t+0.42 is exactly the question §0's withdrawal turns on — they are impact fireballs, not
   missiles in flight, which is why no turn rate was read off them.)
2. **The arcade's launch plume is a tall column BEHIND and BELOW the aircraft and the
   airframe is fully visible in all eight frames.** Ours grows a white mass centred on the
   jet. **This independently reproduces R9 rank 2 on a second stage** — R9 measured it on
   stage 1 daylight, this is stage 3 night, same result. `effects/**` is another lane's file
   this round and I have not touched it; this is corroboration, not a fix.
3. **Row 2 and row 3 diverge from t+0.28 s onward** — same seed, same pilot, different
   trajectory. That divergence is the seeker.

### 1.2 What the code did, and what it does now

`missiles.js`'s entire impact condition was:

```js
const hit = target && m.depth >= target.d;
```

No lateral term. The homing above it interpolated screen position with `steer` saturating at
1 for the final 0.028 s, so the last two frames of convergence were *assigned*, not flown.

Replaced by **(a)** a proximity fuse evaluated at the depth crossing, interpolated to the
crossing instant rather than to wherever the missile landed after overshooting it by up to
`v·dt` = 0.77 depth units, and **(b)** a cap on the steering step's magnitude in isotropic
frame-width fractions per second.

### 1.3 Measured: the weapon can now miss, and aiming is worth something

Four arms. 90 s each, `?fixed=1&invincible=1&seed=3`, **the trigger is never pulled**, so
every kill is a missile kill and the ledger confirms it (`vulcan: 0` on all four). Two pilot
policies — `track` flies the sight onto the nearest lockable enemy; `sweep` runs a sinusoid
and never aims. Launches counted from rising edges of the in-flight count.

| tree | pilot | launches | locks | kills | **kills / launch** | depth crossings | hit / crossing | median lateral at crossing |
|---|---|---|---|---|---|---|---|---|
| 8725647 | sweep (blind) | 27 | 28 | 27 | **100.0 %** | — | — | — |
| 8725647 | track (aims) | 48 | 52 | 43 | **89.6 %** | — | — | — |
| **R10** | sweep (blind) | 3 | 3 | 2 | 66.7 % | 2 | 100 % | 0.0001 |
| **R10** | track (aims) | 28 | 31 | 15 | **53.6 %** | 19 | **78.9 %** | **0.0002** |

> **On the committed build the pilot who never aims has the HIGHER hit rate — 100.0 % against
> 89.6 %.** Aiming is worth *negative*. That is a sharper statement of R9 §1 than the 93.8 %
> was, and it is the thing the change had to break.

On the R10 tree:

* **Misses exist and are numbers, not absences.** 4 of 19 crossings miss, with lateral
  distances at the crossing up to **0.1191 fracW — 4.6× the 0.026 fuse radius**. A further 9
  rounds retire without ever reaching a crossing (`expired`: the target died to something else
  or left the field).
* **A well-flown shot is still a kill.** Median lateral at the crossing for the tracking pilot
  is **0.0002** — when the sight is on the target the seeker arrives on it.
* **Flight time** launch → crossing: min 0.550 s, **median 0.917 s**, max 2.450 s. GAME_SPEC §3's
  MEASURED band is 0.5–1.5 s; the median and the floor are inside it. **The 2.45 s tail is
  real and is a defect I am naming rather than hiding**: it is an `overtake` target *receding*
  faster than the seeker closes, and `MAX_LIFE_S = 5.0` is the only thing that ends it.
* Blind pilot: **3 launches in 90 s against 27.** See §2.3 — that is the lock change, not the
  seeker, and it is coupled to §3 in a way that matters.

### 1.4 The two constants, and the honest provenance of each

**`HIT_RADIUS_FRAC = 0.026`** — an **ADOPTION of a measured arcade quantity**, not a
measurement of the arcade's fuse (footage cannot show a fuse radius). The arcade's lock
bracket is 5.15 %W, measured on two frames whose targets differ by nearly 7× and which agree
to 0.06 %W, and **my own detector reproduces it at 5.246 %W** (§0). The bracket is the box the
arcade itself draws to mean "this target is engaged", so a missile that arrives inside it
hits. Half of 5.15 %W = 2.575 %W → 0.026.

**`MAX_TURN_FRAC_PER_S = 0.77`** — **not measured off the arcade**; all three operators failed
(§0). It is *solved* from two requirements:

1. **The seeker must be able to undo its own launch splay**, or the splay rather than the
   target decides the outcome — which is the old defect wearing the opposite sign. Our
   `SPLAY_NDC_X_PER_S = 1.1` and `SPLAY_NDC_Y_PER_S = −0.7` give a launch transient of
   `hypot(1.1×0.5, 0.7×0.35) = 0.602 fracW/s`, and `HOMING_DELAY_S = 0.3` means no steering at
   all for the first 0.3 s.
2. **It must close the arcade's own lock cone within the measured flight floor**:
   GAME_SPEC §3's arcade-anchored 80 px of 960 = 0.083 fracW, over 0.5 s = 0.166 fracW/s.

`0.602 + 0.166 = 0.768 → 0.77`. Note that is the **arcade's** 8.3 %W cone, not
`lockSystem.js`'s shipped 0.22, which that file's own comment records as tuning with no arcade
behind it — so a lock taken at the edge of *our* wider cone is marginal by construction. That
is the intended direction.

**The first value I tried was wrong and I measured it before shipping it.** I set 0.35 by
adopting the arcade sight's measured sweep rate (§3). Result: the *tracking* pilot hit
**35.0 %** of crossings with a **median lateral miss of 0.135 — five times the fuse radius**.
That is not a weapon that can be out-turned, it is a weapon that cannot turn; the cap was
below the launch splay it had to cancel. Recorded because the number was plausible and a
round that only reported the final constant would have hidden it.

### 1.5 The arcade launch cadence, which I did measure exactly

From the validated stock counter over t = 174.0–192.0 (stage 3, 1080 consecutive frames):
single launches at **t = 176.00, 177.33, 177.67, 179.52, 183.98, 184.82, 186.77, 189.27**, then
a restock (small-icon row 0 → 8, tall row 12 → 10 red marks) at t = 189.80. Intervals run
**0.33 s to 4.5 s**. The t = 186.77 event is the six-missile salvo in the panel: launch flame
visible at t+0.05, missiles distinguishable from the plume at t+0.15, first impact fireballs
from **t+0.43**, still arriving at **t+0.90**.

---

## 2. THE LOCK

### 2.1 I checked the brief before building to it, and half of it is wrong

The brief said *"the sight sweeps over targets and the brackets fill"*. **The arcade's bracket
does not change size.** `r10-03-ARCADE-lock-bracket-flat.png` is eight consecutive detections;
the longest single track, **19 detections over f93–f118**, reads

```
54 53 54 54 52 53 56 53 54 54 54 54 51 54 54 54 53 53 53   px of 1028
```

— flat, inside ±2 px, across 26 frames. There is no convergence, no growth, no shrink: the
arcade's lock bracket **appears at its final 5.15 %W size**. A shrinking-box acquisition would
have been a plausible, good-looking, *wrong* feature, and the only reason it is not in this
diff is that the histogram and the track got measured first.

What the arcade's own measurements **do** leave open is the **corner arm**. The two published
frames agree on box size to 0.06 %W and **disagree on arm length by roughly 2×** — t116 gives
5–9 px of 35 (14–26 %), t100.75 gives 14–15 px of 53 (27 %). `lockSystem.js` has said so since
R4. An acquisition that walks the arm from short to full moves through exactly the range those
two frames bracket and contradicts neither.

### 2.2 Motion comparison — `r10-08-OURS-lock-acquisition.png`

One acquisition, consecutive ticks, arm length read **off the live bracket sprites' own
geometry** (`__lockState().drawn[].arm`, native px of 320) rather than recomputed:

| tick | 239 | 240 | 243 | 246 | 249 | 252 | **253** | 258 |
|---|---|---|---|---|---|---|---|---|
| state | tracking only | acquiring | | | | | **LOCK** | locked |
| timer (s) | — | 0.017 | 0.067 | 0.117 | 0.167 | 0.217 | — | — |
| **arm (native px)** | 2.49 | 2.61 | 2.98 | 3.35 | 3.72 | 4.09 | **4.11** | 4.11 |

13 ticks of growth, lock on the 14th — **0.217 s measured against a 0.22 s requirement**. The
box side never moves. At ticks 260–271 the trace carries **three bracket states on screen at
once** — a free tracking bracket at 2.48, an acquisition climbing 2.62 → 3.97, and a completed
lock at 4.11 — which is what the committed build could not express at all:

> `_drawBrackets` made **one** `_placeCorners` call **with no style argument**, so the bracket
> the player got for free was pixel-identical to the one a committed missile had earned.

**The locked look is unchanged.** A completed lock and a target with a missile in flight both
still draw at `ARM_FRAC_OF_BOX = 0.25`; only the two states that used to be indistinguishable
from it changed, and they changed in the direction of looking *weaker*. `ARM_FRAC_TRACK` is
not a round number, it is `ARM_MIN_PX / BRACKET_BOX_PX = 2.5/16.5` — this file's own
legibility floor — so the growth ramp is monotone over its whole length instead of starting
with a dead zone where the arms grow and nothing on screen changes.

**Cross-check, same detector both sides:** `brackets.py` run on *our* captured frames finds
our sight at **1.56 %W** (arcade 1.49 measured / 1.563 published) and our lock bracket at
**5.62–5.94 %W** (arcade 5.25 measured / 5.15 published). Ours is 8–15 % oversized, which is
`lockSystem.js`'s own documented `boxPx + strokePx` rendering convention, left alone
deliberately because it is a published R4 acceptance number.

### 2.3 `LOCK_ACQUIRE_S = 0.22` is NOT measured, and it is coupled to §3

Footage cannot show it: the arcade's acquisition time is the gap between a button press I
cannot observe and a bracket I can. It is derived from `MAX_LOCKS = 6` (arcade: ~6 brackets at
t100, and my detector finds **6 simultaneous** in the night burst) and the arcade salvo
cadence in §1.5 — 6 × 0.22 = 1.32 s for a full salvo, against the **2 s** R9's trace of the
shipped build took to accumulate **three** locks from a motionless stick. The salvo did not
get slower; it got earned.

**But the blind pilot now gets 3 launches in 90 s against 27, and part of that is §3's
defect, not this constant.** At its full-sweep plateau of 5.5 native px/frame our sight covers
**71.5 native px in 13 ticks — one whole `LOCK_RADIUS_FRAC` of 0.22 (70.4 native px), in
exactly `LOCK_ACQUIRE_S`.** A sweeping pilot therefore cannot keep any target inside the cone
for one acquisition. **When the sight's speed is brought to the arcade's (§3.3), the
same 0.22 s stops being near-total denial.** Do not retune this constant before that; the two
move together.

One defect of my own, found and fixed, because it produced a plausible number: the first
version re-picked `_nearestLockable` every tick and restarted the clock whenever the answer
changed. With a moving sight the candidate flickered between aircraft and the acquisition
**almost never completed — 2 launches in 120 s, with the timer topping out at 0.2167 s every
single time, thirteen ticks, one short.** The acquisition is now sticky: it stays on the enemy
it started on for as long as that enemy remains lockable, which is also the right model — a
seeker that re-aims at whatever is momentarily nearest is not acquiring anything.

---

## 3. THE STICK — and this is the section with the most arcade in it

### 3.1 The arcade's aim point moves at a constant rate and stops at a rail

`r10-04-ARCADE-sight-constant-rate.png`. I tracked AB2's **sight glyph** — the 1.49 %W
four-corner mark, confirmed by eye at 7× zoom (`sheetN-sight2.png`) and by its size against
the published 1.563 %W — across consecutive 60 Hz frames in **both** bursts.

**Pooled: 418 consecutive-frame steps, 25 tracks, two stages, 90 s apart.**

| per-frame dx, px of 1028 | −7 | −6 | −4 | −3 | −1 | 0 | +1 | +3 | +4 | +6 | +7 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| n | 3 | 60 | 9 | 13 | 1 | 197 | 1 | 8 | 13 | 100 | 4 |

The steps are **quantised in whole native pixels** (3.2125 px of 1028 = 1 px of 320): the
arcade's sight moves **0, 1 or 2 native px per frame and never more**, ceiling 2.18 native
px/frame = **0.409 fracW/s**, modal non-zero step **1.87 native px/frame = 0.350 fracW/s**. A
representative run, burstA f107–f118:

```
x = 548 554 560 567 573 580 586 592 599 605 ... 618    step +6.2 px, DEAD CONSTANT for 12 frames
then f120-122: 608 602 596                             reversal at 6.0 px/frame, same magnitude
```

**A constant rate while held, reversing at full magnitude, is a RATE control.** An exponential
position chase cannot produce a flat velocity plateau at any gain. Those are the two models
and the arcade's series picks one.

**And it does not auto-centre.** Nine stationary runs of 10–23 consecutive frames at dx = 0;
**eight of them sit at x = 618.0 (six times) or x = 415.5 (twice)** — that is +104.0 and
−98.5 px from the 514 px screen centre. A pilot cannot stop at an identical sub-pixel x on six
separate occasions over fifteen seconds. Those are **rails**, and the arcade's lateral sight
envelope is **±101 px of 1028 = ±9.83 %W** (taking the mean of the two). The one hold at x = 518.5 (+0.4 %W) is a genuine centred hold.

### 3.2 Motion comparison — `r10-05-STICK-coast.png` and `r10-06-STICK-rate.png`

Same quantity on our side as on the arcade's: **the sight's screen position, through the LIVE
rolled camera**, in native px of 320×224. 12-tick (0.20 s) full-right hold, **released at tick
12**, from the opposite rail so the release happens mid-travel.

| | committed 8725647 | **R10 tree** | arcade |
|---|---|---|---|
| peak per-frame step | 9.63 px | **5.54 px** | 1.87 modal / 2.18 ceiling |
| **the tick the peak falls on** | **1** | **23** | n/a (no observable input) |
| step series, first six | 9.63 8.71 7.88 7.13 6.45 5.84 | **1.84 2.52 3.08 3.53 3.91 4.21** | flat 6 px once moving |
| shape | geometric decay, ratio 0.8948 | ramp → plateau → rail | plateau → rail |
| travel during the 0.20 s hold | +70.84 px | +43.10 px | — |
| **after the stick is released** | **−69.17 px — the move is UNDONE** | **+22.95 px of coast, then holds** | holds station (§3.1) |
| overshoot past the settled point | +0.00 | +0.00 | none observed |

> **On the committed build, letting go of the stick takes the whole move back. On the R10 tree,
> 44 % of the total displacement arrives AFTER the stick is released**, and the jet then stays
> where it was flown. That is the momentum the owner's "let momentum carry" is asking for, and
> it is the arcade's behaviour (§3.1's nine off-centre holds), not an invention.

**I am not claiming an oscillatory overshoot and the arcade data does not support one.** The
arcade's sight reverses at full rate and holds; it never goes past and comes back. Both
columns read +0.00 overshoot and that is correct in both.

### 3.3 WHAT I DID NOT CLOSE, and the number to close it with

Our plateau is **5.5 native px/frame against the arcade's 1.87–2.18 — 2.5 to 3.0×.** I did not
set the rate to the arcade's, and the reason is a second measurement that reframes the first:

| | arcade | ours |
|---|---|---|
| lateral sight rate, held | 1.87–2.18 native px/f | 5.5 |
| lateral sight **envelope**, half-width | **±31.4 native px (±9.83 %W)** | ±101 to ±111 native px (31.7–34.8 %W) |
| **centre → rail** | **0.24 s** | **0.31 s** |

**Our rate is not independently wrong — our ENVELOPE is 3.2–3.5× too wide and the rate follows
it.** The two builds take nearly the same time to cross from centre to the stop. Slowing the
rate without narrowing the envelope would make the jet feel leaden for no arcade reason, and
narrowing `ENVELOPE_X` is a change I will not make on one 15-second sample of one pilot on one
stage — it is the most-felt spatial constant in the game, `spawner.js` derives reachability
from its vertical sibling, and ARCHITECTURE D7 says "roams a wide screen area" off a different
reading. **This is the single cheapest high-value measurement left on the table**: a second
reader, a sight-track census across four or more stages, and a jet-side (not sight-side)
envelope. If ±9.8 %W holds, `ENVELOPE_X` and `RATE_X` move together and `LOCK_ACQUIRE_S`
stops biting (§2.3).

`RATE_X / RATE_Y_*` are therefore **solved to preserve the committed build's traverse time**
(0 → 90 % in 0.384 s analytic, 0.400 s measured) so nothing about reach or responsiveness
regresses while the shape is corrected: `RATE = 3.0 × ENVELOPE`, `ACCEL_RATE = 12`.

### 3.4 A safety invariant the new model needed, handled inside my own file

`game/flow/launchSequence.js:215` and `game/flow/deathSequence.js:406` write `player.x = 0`
directly to re-centre the jet. With momentum in the model, a re-centre that leaves `vx` alone
hands the new life the old life's velocity and slides the jet off the instant control returns.
`x`/`y` are now accessors whose setters zero the matching velocity, so `player.x = 0` keeps
meaning what its callers think it means and **neither of those lanes has to change a line**.
`update()` integrates `_x`/`_y` directly — integrating through the public setter would zero
the velocity every tick, which is the old first-order lag with extra steps and would pass
every rail test while silently removing the whole change.

---

## 4. A REGRESSION I CAUSED, isolated to its cause, for the flow lane

**`r10-09-ATTRACT-regression.png`** — three rows, `?demo=1&seed=1`, every 90 ticks from
warmup 400, identical URLs.

| row | tree | HIT after 8 samples |
|---|---|---|
| 1 | committed 8725647 | **5** |
| 2 | **HEAD + my `player.js` ONLY** | **0** |
| 3 | full R10 tree | **0** |

**Row 2 reproduces row 3 exactly, so the cause is the stick model and not the lock or the
seeker.** `game/flow/demoTimeline.js` is an analog stick curve authored against a **position**
controller: under the old model `x = f(t)` meant *be at this position*, under a rate control it
means *drift at this speed*. The attract flight path is consequently wrong in character and the
scripted pilot now kills nothing in this window.

**Ask, `game/flow/**` lane:** `demoTimeline` needs re-authoring as a rate command. The jet
stays inside its rails (the clamp is unchanged, and the airframe is clear of the HUD band
in all eight R10 frames of this capture), so this is a composition and interest problem, not a broken frame. The
cheap check is the same three-row capture above.

---

## 5. Non-regression

* **R8's gun work and R9's pacing are untouched by construction.** `game/spawner.js`,
  `weapons/vulcan.js`, `entities/enemy*.js` and `game/flow/**` carry **no diff from me**
  (`git diff --stat` lists only my four files). `READABLE_SPAN_FRAC` / `minKillSpan` and the
  spawner's emission are not reachable from anything I changed.
* **The envelopes are unchanged and still mean what they meant.** `ENVELOPE_X`,
  `ENVELOPE_Y_UP`, `ENVELOPE_Y_DOWN` are now clamps rather than chase targets; the settled
  full-stick position is the same place, so R7's 27.02 %H up rail and R8's `rails_probe`
  derivation still hold.
* **The committed locked-bracket appearance is byte-identical.** Only the tracking and
  acquiring states are new.
* **The new outcome ledger is CAPPED**, because nothing drains it in normal play —
  `__missileDrain` only exists under `?fixed=1`, and an uncapped array in a ten-minute session
  for the sake of a measurement hook is a leak. 2048 rows then `outcomesDropped`, the same
  shape as `combat.js`'s `killLog` / `killsDropped`. Found by re-reading my own diff, not by a
  crash.
* **The death/respawn and stage-boundary paths are exercised, not assumed.** `?fixed=1&seed=5`,
  14 frames at 260-tick spacing, manifest states: `flight → death → death → flight → … →
  flight stage 2 → death → continue`. Three deaths, two respawns, one stage transition, one
  continue card, **0 page errors**, and the jet is centred in every post-respawn flight frame
  (`respawn-check.png`) — i.e. §3.4's accessor invariant holds in the live build.
* **A 30 s run with no `?invincible`** (real deaths, real respawns, `?fixed=1&seed=1`): 1800
  ticks, 0 page errors.
* **0 page errors** in every arm: 4 missile arms, 2 step-response arms, 5 capture runs, 2
  smoke runs.

---

## 6. Observed / measured / inferred

**Consecutive 60 Hz, decoded and looked at.** 420 arcade frames at stage 1 (t98.5–105.5) and
1080 at stage 3 (t174–192); 101 of ours at 1 tick spacing around a salvo; 36 of ours around
one acquisition; 24 attract frames across three trees.

**Consecutive-tick traces from the simulation's own state.** All of §1.3, §2.2, §3.2 — 2334
ticks per step-response arm, 5400 per missile arm.

**Measured off the arcade.** The bracket's constant size (19-detection track); the two HUD
glyph sizes (bimodal histogram, n = 68 / 75); the sight's quantised step distribution (418
steps, 25 tracks); the sight's ±9.83 %W rails (9 holds); the missile launch ticks and cadence
(validated stock counter); the salvo's impact spread.

**Derived, not measured, and labelled so in the source.** `HIT_RADIUS_FRAC` (adopted from the
measured bracket); `MAX_TURN_FRAC_PER_S` (solved from our splay + the arcade cone and flight
floor); `LOCK_ACQUIRE_S` (derived from MAX_LOCKS and the arcade salvo cadence); `RATE_*` and
`ACCEL_RATE` (solved to preserve the committed traverse time).

**Withdrawn after failing a control.** The arcade seeker turn rate by plume tracking; arcade
flight times via the HIT counter; the dense sight template tracker; the bright-window jet
tracker.

**Not attempted, named so it is not read as checked.** The arcade's missile hit rate (no way to
attribute a detonation while the trigger is held); a second reader on my sight tracks; the
arcade's lateral envelope on stages other than 1 and 3; whether the arcade's vertical rate
really is ~1.9× its lateral (the dy series reaches 13 px/frame against dx's 7, but I have not
separated stick-y from bank-induced motion and did **not** raise `RATE_Y_*` on it); the 2.45 s
flight-time tail against receding targets; any listening test.

---

## 7. Panels

| file | what |
|---|---|
| `r10-07-MISSILE-arcade-ours-committed.png` | **lead panel** — arcade / R10 / committed, one launch each, consecutive 60 Hz |
| `r10-01-ARCADE-missile-launch.png` | the arcade launch alone, eight frames |
| `r10-02-OURS-missile-launch.png` | ours alone, eight consecutive ticks |
| `r10-03-ARCADE-lock-bracket-flat.png` | the bracket does not converge |
| `r10-08-OURS-lock-acquisition.png` | our acquisition, arm 2.49 → 4.11 px over 13 ticks |
| `r10-04-ARCADE-sight-constant-rate.png` | the arcade sight at a constant 6 px/frame |
| `r10-05-STICK-coast.png` | position vs tick, 0.20 s hold then release |
| `r10-06-STICK-rate.png` | per-frame rate vs tick, with the arcade's measured band |
| `r10-09-ATTRACT-regression.png` | the regression, isolated to `player.js` |
| `r10-10-WITHDRAWN-fireball-tracks.png` | the withdrawn turn-rate measurement, cropped |

All under `tools/out/feel-r10/` (gitignored, as all capture output is).

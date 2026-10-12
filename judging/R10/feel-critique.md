# R10 — the FEEL critique: what the game does over time

**Subject.** Everything our-side in this file was measured on a **pristine `git archive 21c789c`**
extraction at `.../scratchpad/fc10/tree21c789c`, not on the working tree. At the time of writing
the tree carries the flow lane's uncommitted work in `game/flow/demoTimeline.js`, `flow.js` and
`src/main.js`; `player.js`, `combat.js`, `lockSystem.js` and `missiles.js` are clean at HEAD. The
four A/B arms in §3.4 are **separate extractions of the same commit with one or two constants
changed**, named per row. No commit, no stash, no checkout, no reset, no push.

**Every temporal figure on both sides is a CONSECUTIVE 60 Hz series and says so.**
Arcade: `ffmpeg -ss T -i ab2-longplay-60fps.mp4 -frames:v N -vsync 0`.
Ours: one `window.__step(1)` per sample with the state read inside the same `page.evaluate`.

**Page errors: 0 across every probe arm in this file** (4 step arms, 4 aim arms, 5 missile arms).

**Arcade population.** Three windows, 1 140 consecutive frames:

| window | seek | frames | stage | identity |
|---|---|---|---|---|
| w1 | `-ss 98.5` | 300 | **1** | pixel-exact anchor, below |
| w2 | `-ss 210.0` | 420 | **4** | HUD digit read as `4`; teal sky / green forest per STAGE_MAP t=200–240 |
| w3 | `-ss 520.0` | 420 | **12** | HUD digit read as `12`; STAGE_MAP t=512–548 |

**w2 and w3 are stages the feel lane never touched.** It used stages 1 and 3. That is deliberate:
most of what follows is an attempt to reproduce its arcade figures on a population it did not
choose, which is the only kind of agreement worth anything here.

---

## 0. Instruments

| instrument | what it does | control |
|---|---|---|
| `glyph2.py` | two-polarity four-corner-glyph detector (sight + lock bracket) | **selftest 10/10**, incl. both polarities at both sizes, a null, a moving glyph recovered at exactly 1 px/frame, and **three negatives** (a cloud, a solid square, a dithered noise field) — then **checked on real frames and relaxed**, because the synthetic suite could not see that a real lock bracket is usually occluded (§2.2) |
| `track.py` | links detections into consecutive-frame tracks | — |
| `fcprobe.mjs` | per-tick traces from the simulation's own state | — |
| `tmatch.py` | NCC template tracking of the sight | **WITHDRAWN — see §1.3** |

### The anchor, re-derived not inherited

`reference/stage1-missile-salvo-t100.75.png` against my own `-ss 98.5` decode:
**`f0136`, mean absolute difference 0.0000**, neighbours **21.27 / 23.50**. A zero with large
neighbours is a spike, not a plateau. `t = 98.5 + 135/60 = 100.750` exactly.

**`t = T_ss + (i−1)/60` is confirmed for the fourth time** by a fourth agent on a fourth decode.
CLAUDE.md's *"`-ss` sequence extraction on the AV1 60 fps file starts ~4 s early"* is wrong as
written and is still costing people time. **It should be deleted, not hedged.**

### A detector fact that invalidates every single-polarity instrument in this project

**On stage 4 the arcade draws the nose sight and the lock bracket in BLACK, not white**
(`z2a.png`, `arc-rails-look.png` bottom-left, t = 211.65). On stages 1 and 12 they are white.
A brightness-keyed detector has **zero recall on stage 4** and will report an arcade with no
sight and no locks. The feel lane's `brackets.py` was validated on stages 1 and 3 only, so its
figures are not wrong — but **its stage population is a precondition, not a detail**, and this is
the fourth time in this project a HUD element has broken an instrument.

My detector keys on **local luma contrast in both signs**, and replaces the specificity an
absolute colour test was providing with an explicit four-corner geometry test. The first version
grouped on proximity alone and put its box on a sandbar; that is in `det-w2.png`.

### What I cropped and looked at

`arc-rails-look.png` (four stationary detections, three stages — all four are unambiguously the
four-corner sight glyph), `arc-onset-look.png` (§3.3's onset, an isolated glyph over empty sky),
`arc-reversal-look.png` (§1.3's withdrawal), `det-w*.png` (the first detector's false positives).

---

## 1. THE MISSILE — does the change hold up?

### 1.1 It does, and the first thing I measured was my own probe failing

My first three missile arms returned **zero launches, zero locks, zero kills, in all three
arms**, on a tree whose own lane had just reported 28 launches. The cause was mine:
`combat.js:_updateMissiles` fires the salvo on **release** (`!holding && this._wasHolding`), and
my pilot held the button for all 5 400 ticks. A clean, stable, reproducible zero from a probe
with a bug in it — crop-and-look's exact shape, arriving as "the weapon does not fire".

Fixed by giving **every arm an identical trigger cycle**: 40 ticks held, 5 released, 120 salvo
opportunities in 90 s. The only thing that differs between arms is where the sight was pointing.

### 1.2 Four arms, tree 21c789c, 5 400 consecutive 60 Hz ticks, seed 3, `?fixed=1&invincible=1`

The trigger for the gun is never pulled, so every kill is a missile kill.

| pilot | launches | depth crossings | **kills** | hit / crossing | kills / launch | median lateral at crossing | max lateral |
|---|---|---|---|---|---|---|---|
| **track** (flies the sight onto the nearest enemy) | 35 | 21 | **18** | 85.7 % | 51.4 % | 0.0005 | **0.1755** |
| **still** (stick never touched) | 35 | 20 | **15** | 75.0 % | 42.9 % | 0.0005 | 0.0702 |
| **sweep** (sinusoid, never aims) | 7 | 7 | **5** | 71.4 % | 71.4 % | 0.0000 | **0.2038** |

**THE MISSILE CAN NOW MISS — CONFIRMED, INDEPENDENTLY.** 3 of 21, 5 of 20 and 2 of 7 crossings
are misses, with lateral distances at the crossing up to **0.2038 fracW — 7.8× the 0.026 fuse
radius**. The R9 defect is really gone, and the proximity fuse is what removed it.

**But the headline statistic the lane chose cannot answer the question it is asked.** Its table
leads on *kills / launch*, and on that column **the pilot who never aims is STILL ahead on the
R10 tree — 71.4 % against 51.4 % here, and 66.7 % against 53.6 % in the lane's own after-row.**
The lane wrote that breaking the inversion "is the thing the change had to break"; by its own
column it did not break. The reason is not a failure of the weapon, it is a **selection
effect**: a sweeping pilot only manages 7 launches in 90 s, and they are the launches where a
target happened to be dead ahead. **Launches are an outcome of aiming, so a per-launch ratio
conditions on the thing under test.** The statistic that settles it is kills at a fixed trigger
cadence, and there aiming pays properly: **18 against 5, a factor of 3.6.**

This is also the lane's own classification rule biting the lane: hit rate is a **DIAGNOSTIC**
with no preferred direction, and it was published as the headline.

### 1.3 The defect the arms expose, which is bigger than the sweep comparison

> **A MOTIONLESS STICK GETS 83 % OF A TRACKING PILOT'S KILLS — 15 against 18 in 90 s, at the
> same trigger cadence, with 35 launches each against the tracking pilot's 35.**

The `still` arm is new; the lane ran `track` and `sweep`. It isolates what the sweep arm
confounds. The missile is no longer the problem — the **lock** is. Enemies fly into a
`LOCK_RADIUS_FRAC = 0.22` (22 %W) cone centred on a sight parked at screen centre, and they do
it about as often as a pilot can drag the sight onto them. The only arcade anchor for that
radius is **8.3 %W** and `lockSystem.js`'s own comment records the 0.22 as tuning with no arcade
behind it (REFERENCE ledger row 41). **R10 made the missile able to miss; it did not make the
lock require aiming**, and the lock is where the aiming happens.

### 1.4 Flight time, and a tail bigger than the one named

| arm | hits: min / median / max | **all outcomes: min / median / max** | `expired` |
|---|---|---|---|
| track | 0.683 / 0.967 / 2.167 s | 0.583 / **1.817** / 3.317 s | **14 of 35** |
| still | 0.667 / 1.117 / 2.450 s | 0.667 / 1.800 / 3.317 s | 15 of 35 |

The lane named the 2.45 s tail honestly. The larger figure it did not publish is that
**40 % of launches never reach a depth crossing at all** and the median lifetime **over all
outcomes** is 1.817 s — above the top of GAME_SPEC §3's 0.5–1.5 s MEASURED band, with a 3.317 s
maximum. On screen that is a weapon whose shots wander off and burn out, which is a feel defect
even when the hit rate is healthy.

### 1.5 A measurement I took and WITHDREW

I tried to measure the arcade's sight reversal with sub-pixel NCC template tracking seeded on a
confirmed sight detection at w1 f0110, through the window the feel lane reports its one reversal
in. It produced a beautiful series: `+6.12 +6.12 −3.12 −6.52 −6.44 −6.15 …`, a two-frame
reversal, sub-pixel, consecutive, NCC ≥ 0.45 throughout.

**I cropped it and looked** (`arc-reversal-look.png`). From f0116 the tracked object is an
**expanding orange fireball**, not the sight. The series is meaningless. **Withdrawn** — the same
failure the feel lane withdrew its plume tracking for, in the same video, two rounds of warnings
later.

**And it carries a consequence for the lane's figure, not just mine.** The lane's single arcade
reversal observation — `f118: 617 → f120-122: 608 602 596` — is **in that window**, and the
window contains an enemy kill, several same-size bracket glyphs within 30 px of the sight, and
the fireballs my tracker locked onto (`arc-wide.png`). **That observation is unlicensed.** §3.3
re-establishes the conclusion from a different, clean event.

---

## 2. THE LOCK

### 2.1 Bracket size — a third operator, a third population, same number

| quantity | published | feel lane R10 | **this critique** | n | population |
|---|---|---|---|---|---|
| lock bracket | 5.15 %W (R4) | 5.246 %W | **5.253 %W** | 55 | stages 1 + 4 + 12 |
| nose sight | 1.563 %W (R7) | 1.493 %W | **1.654 %W** | 454 | stages 1 + 4 + 12 |

The bracket reproduces to **0.13 %** of the feel lane's figure, by a detector shown neither, on a
population two-thirds of which it never saw. That is as strong as corroboration gets here.

The **sight** does not: three operators give 1.493 / 1.563 / 1.654, a 10.8 % spread. That is the
*same-name-different-operator* shape — mine is the undilated bbox of the four accepted corner
marks, and I do not know what the other two are. **Reported as a 1.49–1.65 %W range; no side of
it is corrected on this evidence.**

### 2.2 How often the arcade shows a bracket at all, and how often we do

**My strict four-corner test had to be relaxed first, and the relaxation is what licenses the
row.** An arcade lock bracket sits *on an aircraft*, so one occluded corner is the normal case,
not the odd one: on the 300 stage-1 frames the feel lane and I both decoded, my strict detector
found **6** bracket detections where theirs found 75 in 420. Requiring three corners instead of
four fixes it — and the relaxed arm then **independently reproduces the feel lane's two
published ambient figures on two stages it never saw**, which is the licence to quote it.

| | ≥1 bracket | ≥2 | max simultaneous |
|---|---|---|---|
| ARCADE, 1 140 frames, stages 1/4/12, **strict** (4 corners) — a FLOOR | 4.5 % | 0.4 % | 2 |
| **ARCADE, same 1 140 frames, relaxed (3 corners)** | **17.8 %** | **3.1 %** | **3** |
| *ARCADE, feel lane, 420 frames, stage 1 only* | *—* | *3.6 %* | *3* |
| **OURS**, 5 400 consecutive ticks, `track` pilot — **completed locks** | 6.9 % | 0.5 % | 2 |
| **OURS**, same run — **BRACKETS ACTUALLY DRAWN** | **65.5 %** | **24.5 %** | **4** |
| OURS, `still` pilot — brackets drawn | 72.1 % | 27.8 % | 4 |

**3.1 % against the feel lane's 3.6 %, and a maximum of 3 against their 3**, by a detector shown
neither figure, on a population two-thirds unseen. Two independent operators now agree on the
arcade's ambient lock population.

Against that calibrated arcade reading, our **drawn** bracket population is **3.7–4.0× too high
at ≥1 and 7.9–9.0× too high at ≥2**, with a maximum of 4 where the arcade's is 3.

> STATUS's own sentence — *"a build showing several brackets continuously is wrong even if its
> salvo peak is right"* — **describes this build.** Our *completed-lock* population is
> arcade-like and that is a real R10 win worth protecting. The *drawn* population is not, and the
> R10 work is what produced it: the new tracking and acquiring bracket states draw a bracket
> whenever anything lockable is on screen. The comparable quantity is what is drawn.

I did not independently test "the bracket does not animate in size"; my bracket width
distribution is tight (n = 55) but I did not track individual brackets through acquisition.

---

## 3. THE STICK — and this is where the round went wrong

### 3.1 The arcade, measured on two stages the feel lane never used

13 tracks, **138 consecutive-frame steps**, stages 1 / 4 / 12, 60 Hz.

| per-frame dx, px of 1028 | −8 | −7 | −6 | −5 | −4 | −3 | 0 | +1 | +3 | +4 | +6 | +7 | +8 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| n | 1 | 1 | 2 | 1 | 3 | 1 | **61** | 1 | 2 | 2 | **53** | 9 | 1 |

* **Median non-zero step 6.5 px = 2.02 native px/frame = 0.379 fracW/s.** Ceiling 2.49 native
  px/frame. The feel lane got 1.87 modal / 2.18 ceiling on stages 1 and 3. **Agreement within
  8–14 %, on an unseen population, with an independently written detector.**
* **The distribution SATURATES.** 53 steps at +6, 9 at +7, one at +8, nothing above, across three
  stages and thirteen separate manoeuvres. The intermediate bins (±3, ±4) hold 9 of 138.

> **This refutes `player.js`'s own justification for not adopting the arcade rate.** The comment
> at `src/entities/player.js:168` reads: *"that arcade figure is ONE pilot, ONE 0.3 s window, at
> an unknown stick deflection, so it is a **LOWER BOUND** on the arcade's maximum and not the
> maximum."* A lower bound from an unknown deflection would produce a spread of plateaus across
> thirteen manoeuvres in three stages. It produced **one plateau, twice, with a hard ceiling**.
> That is a saturating control at full deflection. **0.379 fracW/s is the arcade's maximum.**

* **The rails reproduce exactly.** Over 151 detections the sight's x never leaves **[416, 618]**
  of 1028. The stationary holds sit at **x = 617.5–618.0** (w2 f0001–f0014, w3 f0131–f0135,
  f0254–f0279, f0362–f0369) and **x = 415.5–416.0** (w3 f0019–f0029, f0204–f0207) — on stage 4
  and stage 12, 310 s apart, against the feel lane's 618.0 and 415.5 on stages 1 and 3.
  **Half-width ±10.12 %W** against their ±9.83 %W. All four cropped and looked at: all four are
  the sight glyph (`arc-rails-look.png`). **AB2 does not auto-centre, and its lateral sight
  envelope is ±10 %W.**

### 3.2 Our step response, tree 21c789c, consecutive 60 Hz

Start is the **left rail** (120 ticks full-left, 30 neutral) — the one deterministic
zero-velocity position a model with no auto-centre has. Quantity is the **sight's screen x
through the live rolled camera**, the same object the arcade series tracks.

```
onset, full-right stick:   1.01  1.84  2.52  3.08  3.53  3.91  4.21  4.46  4.67  4.83 ...  5.59
release, after 12 ticks:   4.16  3.41  2.79  2.28  1.87  1.53  1.25  1.03  0.84  0.69 ...  0
```

| hold | travel during | travel after release | **after / total** |
|---|---|---|---|
| 6 ticks (0.10 s) | +15.89 px | +17.64 px | **52.6 %** |
| 12 ticks (0.20 s) | +44.12 px | +22.95 px | **34.2 %** |
| 20 ticks (0.33 s) | +87.00 px | +24.78 px | **22.2 %** |

> **"44 % of displacement arrives after release" is a property of the 0.20 s hold, not of the
> model.** It runs 52.6 → 34.2 → 22.2 % as the hold lengthens and goes to zero the moment the
> hold is long enough to reach the rail. The invariant is the **coast distance**, ~25 px, and it
> is a `1/ACCEL_RATE` = 0.083 s exponential tail: the release steps fall by a constant
> **0.8187 = exp(−12/60)** per frame. A figure that moves by 2.4× with a parameter the reader
> cannot see is not a weight measurement.

### 3.3 The number that matters, and the arcade's answer to it

**Our onset: 12 ticks (0.200 s) to 90 % of plateau. Our reversal: 14 ticks (0.233 s) to 90 % of
the reversed plateau, and the sight keeps moving in the ORIGINAL direction for 2 ticks after the
stick flips.**

The arcade, on a clean isolated glyph over empty sky, w1 f0098–f0103 (`arc-onset-look.png`,
cropped and looked at — a white four-corner sight, nothing else within 100 px):

```
x =  499.5  502.5  502.5  508.5  515.5  521.5     px of 1028
dx =       +3.0    0.0   +6.0   +7.0   +6.0
```

> **THE ARCADE GOES FROM A STATIONARY FRAME TO ITS MAXIMUM LATERAL RATE IN ONE FRAME.**
> And it stops the same way: w3 f0254–f0279 runs `+6.0 ×6, +3.5, 0.0 ×18` — **one intermediate
> frame** into a hold. w2 f0254–f0259 reverses direction `0.0 −4.0 +1.0 0.0 +6.5` with no ramp
> at all. **No ramp longer than one frame exists anywhere in 138 steps.**

**Our stick is ~12× slower to respond than the arcade's and ~7× slower to reverse. This is new
in R10.** The committed `8725647` build put its peak per-frame step on **tick 1**; the R10 build
puts it on tick 12. The lane's own before/after table records that as the headline improvement —
*"an ACCELERATION PHASE. Peak per-tick displacement is no longer on tick 1"* — and against the
arcade it is the regression.

**The diagnosis was right and the cure overshot.** The old defect was real: release took the
whole move back. But the arcade holds station on release because it is a **rate control with no
auto-centre**, not because it coasts — its stops are one frame long. R10 fixed the auto-centre
(correct, and the rails prove it) and bought it with 0.2 s of velocity lag on every input edge
(not correct, and nothing in the arcade data asks for it). `ACCEL_RATE = 12` is the whole of the
cost and it is a single constant.

**What the owner has been calling "responsiveness" for nine rounds is this, and R10 made it
worse.**

### 3.4 The gate the lane declined to set — tested, not assumed

The lane's reason for not gating the rate: *"centre-to-rail time is 0.31 s against the arcade's
0.24 s — nearly matched. A rate gate would slow a stick that already crosses its screen in about
the right time."* The TL flagged this as the round's subtlest claim because it normalises one of
our own wrong numbers out of the statistic.

Four arms, four **separate pristine extractions of 21c789c** with the named constants changed
and nothing else, all measured with the same probe:

| arm | plateau (npx/f) | fracW/s | half-envelope | **rail→rail** | onset t90 | reversal t90 | **aim median** | aim p90 |
|---|---|---|---|---|---|---|---|---|
| **SHIPPED 21c789c** | 5.59 | 1.048 | 34.93 %W | 45 t / **0.750 s** | 12 t | 14 t | **10.63 %W** | 17.31 %W |
| RATE := arcade only | 2.14 | 0.400 | 34.93 %W | 109 t / **1.817 s** | 12 t | 14 t | 4.28 %W | 6.56 %W |
| ENVELOPE := arcade (rate follows) | 1.62 | 0.303 | 10.12 %W | 45 t / 0.750 s | 12 t | 14 t | 2.77 %W | 4.74 %W |
| **RATE + ENVELOPE := arcade** | 2.13 | 0.400 | 10.12 %W | 35 t / **0.583 s** | 12 t | 14 t | **3.47 %W** | 6.24 %W |
| **ARCADE (measured, 60 Hz)** | **2.02** | **0.379** | **10.12 %W** | ~32 t / **0.527 s** | **1 t** | **≤2 t** | — | — |

*Arcade rail→rail is DERIVED — span 202 px ÷ 6.4 px/frame. No uninterrupted full traverse exists
in my 1 140 frames; the longest single run is 17 frames.*

*Aim median is a **DIAGNOSTIC with no arcade anchor** and must not become a gate: a bang-bang
pilot with a fixed 9-tick (150 ms) loop delay is told to hold the sight on a fixed screen point
inside every arm's envelope, and what is reported is the residual limit-cycle error over 659
consecutive settled ticks per target, median of three targets. A human modulates; this pilot does
not. It cannot say what the arcade's aim error is. It can refute a claim about ours.*

**The lane's reasoning does not survive, and the half of it that is right is not the half it
used.**

1. **Rail-to-rail is NOT nearly matched: 0.750 s against 0.527 s, 1.42× slow.** The lane's
   centre-to-rail pairing (0.31 / 0.24) gives 1.29× on a model that has no centre to start from.
   Either way the shipped stick is already slower across the screen than the arcade's, and the
   statistic was being used to argue it was fast enough.
2. **Gating the rate alone IS wrong**, and the lane was right about that: 1.817 s rail-to-rail,
   3.4× the arcade, leaden exactly as predicted. **That is the whole of the valid argument.**
3. **Gating both together is better than shipped on the lane's own chosen statistic.**
   0.583 s against the arcade's 0.527 s — a 10 % residual, where the shipped build's is 42 %.
   **The traverse-time argument, taken at face value, points at adopting both constants.**
4. **The thing the ratio hides is aim precision, and the envelope does not enter it.** Under a
   fixed reaction delay the limit-cycle amplitude is `rate × lag`: predicted 15.7 %W shipped and
   6.0 %W at the arcade rate, observed **10.63 %W against 3.47 %W, a factor of 3.1**. That is
   *why* "rate/envelope is fine" is the wrong normalisation — **a player's hand-eye loop is
   closed in seconds, not in screen-widths.** The envelope decides how far you can go; the rate
   decides how finely you can stop.
5. **No arm of this debate touches the 0.2 s velocity lag.** Onset and reversal read 12 and 14
   ticks in all four arms, because they are `ACCEL_RATE`, not `RATE_X`. §3.3 is a separate
   defect from §3.4 and it is the larger one.

**Coupling that must not be forgotten (STATUS's own warning on row 41):** our sight covers one
whole `LOCK_RADIUS_FRAC` in one `LOCK_ACQUIRE_S`. Narrowing the envelope and the rate together
changes that ratio, and §1.3 says the lock radius needs to come down too. **Cone width, sight
rate, envelope and acquisition time are one system of four, not three.**

---

## 4. Observed / measured / inferred

**Decoded and looked at.** 1 140 consecutive arcade frames at 60 Hz across three stages; 6 crop
panels inspected by eye.

**Consecutive-tick traces from the simulation's own state.** 5 400 ticks × 5 missile arms;
230 ticks × 4 step arms × 4 trees; 2 700 ticks × 3 targets × 4 aim arms.

**Measured off the arcade here.** The t-anchor (pixel-exact); the sight's quantised step
distribution and its saturating ceiling (138 steps, 13 tracks, 3 stages); the ±10.12 %W rails
(two values, three stages); the one-frame onset and the one-frame stop; bracket and sight widths;
the ambient bracket count **as a floor**.

**Measured on ours.** Hit rate, crossings, lateral miss, flight times and launch counts at a
fixed trigger cadence; step response, coast, onset and reversal; lock and drawn-bracket
populations; the four-arm rate/envelope A/B.

**Derived, not measured.** The arcade's rail-to-rail traverse (span ÷ rate). The aim-precision
diagnostic (no arcade side exists).

**Withdrawn after failing a control.** My NCC reversal series (tracked a fireball) — and with it,
the licence for the feel lane's single reversal observation, which sits in the same window.

**Not attempted, named so it is not read as checked.** The arcade player AIRCRAFT's lateral
envelope (the quantity `ENVELOPE_X` actually sets — I measured the sight, as the lane did, and
the two are not the same object); the arcade's vertical rate; whether the arcade bracket animates
in size; any listening test; any `?demo` arm (attract mode is a known broken regression and the
flow lane is live in that file).

---

## 5. RANKED — what most damages the feeling of playing After Burner II

**1. The stick gained 0.2 s of velocity lag where the arcade has one frame.**
Onset t90 **12 ticks**, reversal t90 **14 ticks**, against an arcade that reaches full rate in
**1 frame** and stops in **1**. One constant, `ACCEL_RATE = 12.0` (`player.js:184`). R10's
diagnosis of the release behaviour was right; applying it to the whole controller was not. The
arcade holds station on release because it is a rate control with no auto-centre — keep that,
it is the round's real win and the rails prove it — and delete the inertia. This is what the
owner has been calling "responsiveness", and it is currently worse than the build R10 replaced.

**2. The envelope is 3.45× too wide and the rate 2.76× too fast, and they must move together.**
Measured, four named trees: adopting both lands rail-to-rail at 0.583 s against the arcade's
0.527 s — **better than the shipped 0.750 s** — and cuts aim error under a fixed reaction delay
from 10.63 %W to 3.47 %W. Adopting the rate alone is leaden (1.817 s) and the lane was right to
refuse that. `ENVELOPE_X` is coupled to `spawner.js` reachability and to `LOCK_RADIUS_FRAC`;
move it as a system or not at all.

**3. The lock does not require aiming, and that is why the missile still feels unearned.**
A motionless stick takes **15 kills to a tracking pilot's 18** at the same trigger cadence.
`LOCK_RADIUS_FRAC = 0.22` against the only arcade anchor, **8.3 %W** (ledger row 41). R10 fixed
the missile; the lock is the half that still gives the kill away.

**4. We draw lock brackets almost continuously; the arcade almost never does.**
≥2 drawn brackets in **24.5–27.8 %** of ticks against an arcade measured at **3.1 %** by me and
**3.6 %** by the feel lane — **7.9–9.0× too often** — and ≥1 in **65.5–72.1 %** against
**17.8 %**, with a maximum of 4 against the arcade's 3. The new tracking/acquiring states are
the cause. The HUD is supposed to be mostly empty.

**5. Two of every five missiles never reach their target and burn out.**
14 of 35 `expired`; median lifetime over all outcomes **1.817 s** against a 0.5–1.5 s MEASURED
band, max 3.317 s. Shots that wander off read as a weapon that does not connect, independently
of the hit rate.

**6. `kills / launch` should stop being reported as a headline.** It conditions on the thing
under test, it still shows the blind pilot ahead on the R10 tree, and the lane's own
classification rule already calls it a diagnostic.

**7. Delete CLAUDE.md's `-ss` caveat.** Four independent agents have now refuted it. It is
costing a lane an hour a round in hedged timestamps.

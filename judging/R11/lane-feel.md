# R11 — the FEEL lane: the envelope, the lock, the stick

> ## RETRACTION FIRST, because an earlier version of this file said the opposite
>
> **This file originally reported an arcade player-aircraft envelope of ±29.5 %W, concluded that
> `ENVELOPE_X` passed at 1.19× and must not move, and said so to the TL, who built the round's
> narrative on it. It was wrong. `judging/R11/arcade_jet_x.csv` was reading ENEMY AIRCRAFT.**
> The combat lane challenged it; I re-read my own frames at 1:1 and it does not survive.
> **`ENVELOPE_X` was 3.55× too wide — R10 gap 2 was right all along — and it is cut in this
> round.** §1.1 is the post-mortem, kept because the failure is more reusable than the number.
> `judging/R11/ask-combat.md` is withdrawn by both lanes.

**Trees, named for every figure.** Our-side numbers come from pristine `git archive` extractions
of **`5e3d57e`** into `.../scratchpad/tree-before` and `tree-after`; `tree-after` is the same
extraction with this lane's two changed files copied over it and nothing else. The working tree
carried other lanes' live, uncommitted edits throughout and **no figure here was taken from it**.
Three arms are reported per quantity so the two halves of this lane's change can be separated:
**`5e3d57e`** / **+lock+ramp only** / **+envelope+rate cut**. No commit, no stash, no checkout,
no reset, no push.

**Sampling rate, both sides, every temporal figure.** Arcade:
`ffmpeg -ss T -i ab2-longplay-60fps.mp4 -frames:v N -vsync 0`, consecutive 60 Hz. Ours: one
`window.__step(1)` per sample, state read in the same `page.evaluate`.

**Page errors: 0** across every arm in this file (3 step arms, 11 combat arms, 3 attract arms).

**Scripts for every figure, committed:** `judging/R11/{sheet,jet_envelope,jet_nozzles,analyse}.py`,
`probe_r11.mjs`, `demo_check.mjs`. Images under `tools/out/feel-r11/evidence/` (gitignored).

---

## 1. JOB 1 — THE ARCADE'S LATERAL ENVELOPE

### 1.1 THE WITHDRAWN MEASUREMENT, AND WHY IT LOOKED FINE

I hand-digitised the arcade player's screen x off ruled contact sheets rendered at **0.42
scale**, n = 67, three stages, stage identity read off the HUD digit at both ends of every
window, and published ±29.5 %W.

**The identity test I was applying needs more resolution than I was giving it. The player's F-14
has TWO afterburner nozzles; every arcade enemy has ONE. At 0.42 scale that distinction is
invisible.** I was reading whichever aircraft I happened to resolve.

Checked by drawing my read and the combat lane's on my own disputed frames and looking at **1:1**:

| frame | my published read | what is actually there at 1:1 | the twin-nozzle player |
|---|---|---|---|
| s1 f005 (t=94) | 22 %W | **the carrier deck** | **50.8 %W**, dead centre, flanked by three SINGLE-nozzle enemies |
| s4 f005 (t=206) | 20 %W | **empty water** | ~48 %W |
| s12 f012 (t=525) | 78 %W | **empty sky over ground** | ~52.8 %W |

Seven of my own reads at 1:1, including four frames the combat lane did not use:
**45.5 / 48.3 / 50.0 / 50.5 / 50.8 / 52.8 / 61.0 %W.** Nothing outside 45–61.

> **The reusable failure: I validated the ruler's PRECISION — a 1.14 %W test-retest, computed
> from three repeating 4-sample cycles — and published it as though it licensed the
> measurement. Precision was never the problem. IDENTITY was, and I never checked identity at
> the scale I was reading at.** Three automatic trackers were withdrawn earlier in this same
> round *for being unable to establish identity*; I then built a manual operator with the same
> hole and did not notice, because its numbers were stable and plausible. "Crop it and look"
> done below the resolution the question needs is worse than not looking: it manufactures
> confidence.

Also withdrawn with it: my claim that **REFERENCE #122's cruise `cx sd` 12.88 %W is
corroborated**. My 13.55 %W agreed with it by coincidence between two numbers, one of which is
garbage. **The flow lane's tension is OPEN, not closed** — and see §1.5, which now puts the
weight on the other side.

### 1.2 THE CORRECTED ARCADE COLUMN — three operators, two lanes

* **The arcade's SIGHT rails at x ∈ [415.5, 618.0] of 1028 = ±9.85 %W** about 50.27 %W.
  Combat lane, stage 12, `-ss 520.0`, **420 CONSECUTIVE 60 Hz frames, 63 tracked detections, all
  cropped and looked at, 0 false positives** — reproducing R10's independently measured
  [416, 618] to a tenth of a pixel, by a detector written without sight of it. Its own first run
  put 18/20 detections on the HUD missile icons, which it cropped, published and gated out.
* **The arcade's AIRCRAFT tracks that sight.** Nozzle-midpoint 0 to +5 px from the detected
  sight column over 12 frames at both rails; Δsight rail-to-rail 202.5 px against Δjet
  198 ± 5 px. **Ratio 1.02 ± 0.03** — read as a *difference against a drawn line*, which is a
  far better operator than my two absolute ruler reads. **Corroborated by my seven 1:1 reads
  above**, which sit inside the sight's own rails.
* **The arcade's lateral RATE is 0.379 fracW/s** (median non-zero 2.02 native px/frame; the
  distribution saturates — 53 steps at +6 px of 1028, 9 at +7, one at +8, nothing above, over
  138 consecutive-frame steps, 13 manoeuvres, 3 stages, two operators). Since jet ≡ sight, this
  is the aircraft's rate too.
* **Rail-to-rail, derived**: 19.7 %W ÷ 0.379 fracW/s = **0.527 s**.

### 1.3 OURS, AND THE CUT

`ENVELOPE_X` **2.6 → 0.733** (= 2.6 × 9.85/34.93; screen fraction is linear in world x at fixed
depth). `RATE_X` **decoupled from `ENVELOPE_X`** and set to **2.82** world u/s — it was written
`3.0 * ENVELOPE_X`, which would have dragged the rate to 0.305 fracW/s, *below* the arcade's.
`RATE_Y` is deliberately left coupled and unretuned: there is no arcade column for the vertical
rate, and the vertical envelope rests on 109 hand counts.

Measured back, consecutive 60 Hz, `probe_r11.mjs --mode resp`, three named trees:

| tree | sight rail | plateau | rail → rail |
|---|---|---|---|
| `5e3d57e` | ±34.93 %W | 1.034 fracW/s | 45 ticks / 0.750 s |
| + lock + ramp only | ±34.93 %W | 1.048 fracW/s | 40 ticks / 0.667 s |
| **+ envelope + rate cut** | **±9.85 %W** | **0.379 fracW/s** | **32 ticks / 0.533 s** |
| **ARCADE** | **±9.85 %W** | **0.379 fracW/s** | ~32 ticks / **0.527 s** (derived) |

> **All three land at once, to the digit on two of them and to 1.1 % on the third.** Published
> together because STATUS row 58 says rate, span and traverse time travel as a set or none of
> them. R10 §3.4's four-arm A/B predicted 0.583 s for its "RATE + ENVELOPE := arcade" arm on
> independent evidence; we come in better because the ramp is gone as well.

### 1.4 THE COST — measured, then CORRECTED TWICE, and the second correction changes the verdict

**First version of this section said "18 → 11, −39 %". That was seed 3 alone**, and the combat
lane was right to re-run it. Replicated on my own pristine trees, same probe, three seeds:

| seed | wide ±34.93 %W | **cut ±9.85 %W** | |
|---|---|---|---|
| 3 | 18 | 11 | −39 % |
| 5 | 27 | 19 | −30 % |
| 11 | 20 | 13 | −35 % |
| **mean** | **21.7** | **14.3** | **−34 %** |

**3 of 3 seeds down, −30 to −39 %** — so on my trees the drop is *consistent*, not an
extreme-pair artefact; the headline figure was overstated by 5 points, not manufactured. The
combat lane's independent implementation from a different baseline commit gives **−30 %** with
one of its three seeds inverting. Both lanes agree on the sign and the rough size; the pairing
differs because the baselines do. **Quote −34 % ± 5, n = 3, not −39 %.**

It is **not** my probe's pursuit policy: a `reach` control arm that chases only targets inside
the rail-plus-cone and otherwise holds centre recovers **one** kill.

#### AND THEN THE VARIABLE THAT MATTERS, which is not mine and which inverts the conclusion

The combat lane swept **pilot reaction latency** — the same pursuit law with the stick delayed N
ticks (`judging/R11/human_arm.mjs`), 3 seeds, mean kills:

| rail | 0 ms | 150 ms | 300 ms |
|---|---|---|---|
| wide ±34.93 %W | **20.3** | 16.3 | **5.3** |
| **this build ±9.85 %W** | **14.3** | 14.7 | **14.3** |

> **The cost is specific to a pilot with zero reaction time. A human has 150–300 ms. At 150 ms
> the cut costs 10 %; by 300 ms the wide rail has lost 74 % of its kills and this build scores
> nearly three times as much.** The mechanism is `feel-critique.md` §3.4's own prediction —
> limit-cycle amplitude is `rate × lag`, which is 31 %W on the old rail and saturates harmlessly
> against a ±9.85 one. **My own `reach` arm was asking the right question of the wrong variable:
> policy bought one kill, latency moves the answer 3× and moves it toward the cut.**

**Two caveats, mine rather than theirs, because the result favours my change and that is exactly
when to push hardest on it.** (a) A pure delay line is a *pessimistic* human — real pilots lead
a target, they do not thrash — so the 300 ms row overstates the wide rail's handicap; direction
trustworthy, magnitude not. (b) **There is no arcade column for pilot latency.** This can refute
"the cut costs a realistic pilot a third of its kills" — and it does — but it **cannot rank two
builds** and must not become a gate.

**Verdict: landed, and the residual risk is smaller than this section first claimed.** Reversible
in one line (`0.733 → 2.6`, `RATE_X 2.82 → 3.0 * ENVELOPE_X`). The real remaining issue is that
the engageable band is now rail + cone ≈ **±18 %W** against a `spawner.js` lateral spread still
tuned for ±34.93 — `judging/R11/ask-spawner.md`, now a **should-check rather than a blocker**.

### 1.5 A REFERENCE-LEVEL CONSEQUENCE

**REFERENCE #122's cruise `cx sd` of 12.88 %W cannot be produced by a jet confined to ±9.85 %W**
— a uniform spread over that whole rail has sd 5.7 %W. #122 is **ADOPTED from the old prototype**
and therefore measures the *prototype's* jet, not the arcade's. The flow lane raised this as a
conflict with the ±9.83 sight rails; I wrongly reported it closed. **It is open, and the arcade
sight rails — now reproduced to a tenth of a pixel by three operators across four stages — are
the better-evidenced side of it.** #122 should be re-derived or demoted.

### 1.6 A MECHANISM CORRECTION

My earlier §1.4 explained a 1.993 ratio between the jet's held and released readings as *"the
drawn jet through the rolled camera"*. Wrong: `screenSpace.js:103` says in its own comment that
`worldToNdc` produces an **unrolled** NDC frame, so `__fairness().playerNdc` is not a screen
position at all and rotates under bank by construction. The conclusion (the released reading is
the real rail) survives, and the combat lane's proof is better than mine: `jetNdcX` ≡
`__sight().ndcX` to **3.3e-14 %W** over 1 260 ticks at every roll angle.

---

## 2. JOB 2 — MAKING THE LOCK REQUIRE AIMING

### 2.1 What changed

1. **`LOCK_RADIUS_FRAC: 0.22 → 0.083`** — GAME_SPEC §3's prototype-ADOPTED 80 px of 960 = 8.3 %W,
   the only arcade-anchored figure for it. The 0.22 was tuning (REFERENCE ledger row 41).
2. **The always-on TRACKING bracket is gated on the aim** — `_updateTracking` picks the nearest
   enemy passing `_lockable`, the identical test the acquisition uses.
3. **`LOCK_ACQUIRE_S` untouched** (0.22 s) — not measurable from footage.

R10's judge froze the cone with `ENVELOPE_X` and `RATE_X`. **All three moved in the same
change**, which is what it asked for: the sight now crosses one 8.3 %W cone in 0.44 s against
`LOCK_ACQUIRE_S` 0.22 s, so a moving sight has **twice** the time it needs where before it had
exactly as long as it needed and no more.

Change 2 retires an **ADOPTED** behaviour (#49, *"tracks the nearest threat continuously, not
gated on crosshair hover"*) against a **MEASURED** one: two independent 60 Hz decodes over 1 140
arcade frames put a bracket on screen in **17.8 %** of frames, ≥2 in **3.1 %**, max **3**.

### 2.2 THE BLIND-PILOT COMPARISON

Four pilots, **identical trigger cadence in every arm** (40 ticks held, 5 released; the missile
fires on *release*), 5 400 consecutive 60 Hz ticks, `?fixed=1&invincible=1&seed=3`. The gun
trigger is never pulled, so **every kill is a missile kill**.

| pilot | `5e3d57e` | + lock + ramp | **+ envelope cut (shipped)** |
|---|---|---|---|
| **still** (stick never touched) | 35 / **15** | 11 / **4** | 11 / **4** |
| **track** (pure pursuit) | 36 / **18** | 39 / **18** | 27 / **11** |
| **reach** (pursues only what the rail can reach) | 35 / **17** | — | 29 / **12** |
| sweep (sinusoid, never aims) | 7 / 4 | 0 / 0 | 0 / 0 |

*(launches / kills)*

> **Blind share, MISSILE ONLY — the motionless stick as a fraction of the best aiming pilot's
> kills: 83 % → 22 % → 33 %** at seed 3. **With the gun enabled it is 90 % → 85 % and the win
> does not survive — see §2.2b, which is the more important table.** The lock change did the work: it took the blind pilot from 15
> kills to 4 and left the tracking pilot at 18. The envelope cut then cost the aiming pilot
> **−34 % at n = 3 seeds (§1.4)**, so the share rebounded. Both halves are real and are reported
> separately for exactly that reason.

**The honest reading**: the lock change is a clean win on its own tree. **Every number in this
table is seed 3, and §1.4 is the only row replicated across seeds.**

### 2.2b EVERY NUMBER ABOVE IS MISSILE-ONLY BY CONSTRUCTION, AND WITH THE GUN ON THE HEADLINE DOES NOT HOLD

`probe_r11.mjs` set `{...stick, missile: held}` and **never set `fire`**, which `__setStick`
defaults to false — so the only kill it could count was a missile kill. I did write *"the gun
trigger is never pulled"* beside the table, **but stating a property is not drawing its
consequence**, and the consequence is large. Found by `effects-r11`; the probe now takes
`--weapons missile|gun|both`, defaults to `both`, refuses an unknown value, and prints the
declaration on every run. Re-run, same trees, 5 400 ticks, kills split by `combat.js`'s own
`killCounts`:

| pilot | wide ±34.93 %W | **cut ±9.85 %W** |
|---|---|---|
| **still** | 28 [missile 14, gun 14] | 23 [**missile 5**, gun 18] |
| **track** | 31 [missile 24, gun 7] | 25 [missile 14, gun 11] |
| **reach** | 26 [missile 15, gun 11] | **27** [missile 17, gun 10] |

> **Two things change, and one of them is my own headline.**
>
> 1. **The envelope "regression" largely dissolves.** `reach` — the arm that does not chase —
>    goes **26 → 27, flat**. `track` goes −19 %, not −39 %, and its kills *shift weapon*
>    (missile 24 → 14, gun 7 → 11) rather than disappearing. `effects-r11` localised why: the
>    `crosser` pattern was only ever missile-lockable by sliding out to ±36 %W, which is
>    chasing, and **an arcade player on a ±9.85 %W rail with an 8.3 %W cone could not have
>    locked it either.** It was always a gun target.
> 2. **"Aiming now matters" is true of the MISSILE and not yet of the GAME.** The lock change
>    does what it claims — the blind pilot's *missile* kills fall 14 → 5. But with a full
>    loadout the motionless stick still takes **85 %** of the best aiming pilot's kills on the
>    cut tree and **90 %** on the wide one. **The vulcan gives them away instead**, and
>    `combat.js`'s `ASSIST_RADIUS_FRAC = 0.13` is now **1.32× the sight's entire reach** (0.37×
>    before the cut; it did not move with it). **The next move on R10 gap 3 is the gun's assist
>    cone, not anything in this lane's files.**

`kills / launch` is omitted as a headline — it conditions on the thing under test.

### 2.3 THE DRAWN-BRACKET POPULATION — R10 gap 4

| | ≥1 bracket | ≥2 | max |
|---|---|---|---|
| **ARCADE**, 1 140 consecutive 60 Hz frames, stages 1/4/12 | **17.8 %** | **3.1 %** | **3** |
| *arcade, R10 feel lane, 420 frames, stage 1* | *—* | *3.6 %* | *3* |
| ours `still`, `5e3d57e` | 72.1 % | 27.8 % | 4 |
| **ours `still`, shipped** | **15.4 %** | **5.8 %** | **3** |
| ours `track`, `5e3d57e` | 64.7 % | 25.2 % | 4 |
| **ours `track`, shipped** | **30.1 %** | 15.5 % | 4 |
| **ours `reach`, shipped** | **35.3 %** | 14.1 % | 3 |

The ambient population is arcade-correct (15.4 % against 17.8 %, max 3 against 3), from 4.0× and
9.0× too often. A continuously-aiming pilot still draws ~1.8× the arcade's ambient figure and
**the two are not matched conditions** — the arcade's 17.8 % pools whatever its pilot was doing.

---

## 3. JOB 3 — THE ACCELERATION RAMP IS GONE

`ACCEL_RATE = 12.0` deleted; `this.vx = cmdVX`.

```
ONSET from a settled neutral, stick to full LEFT   (%W per 60 Hz tick)
  5e3d57e   -0.66 -0.87 -1.04 -1.18 -1.28 -1.37 -1.43 -1.48 -1.52 -1.54 -1.55 -1.56
  + R11     -1.83 -1.82 -1.82 -1.81 -1.79 -1.78 -1.76 -1.74 -1.72 -1.69 -1.67 -1.64
  ARCADE (w1 f0098-f0103)   +3.0 0.0 +6.0 +7.0 +6.0  px of 1028 -- max rate in ONE frame

MID-TRAVEL REVERSAL, stick flips R -> L
  5e3d57e   -0.04 -0.37 -0.66 -0.89 -0.80 -0.89 -1.05 -1.17 -1.28 -1.36 -1.43 -1.49
  + R11     -2.07 -2.16 -2.19 -2.17 -1.85 -1.75 -1.75 -1.75 -1.75 -1.75 -1.75 -1.75
  ARCADE (w2 f0254-f0259)   0.0 -4.0 +1.0 0.0 +6.5  -- no ramp at all
```

| | peak step on tick (onset) | peak step on tick (reversal) |
|---|---|---|
| `5e3d57e` | **12** | **23** |
| + R11 | **1** | **3** |
| ARCADE | **1 frame** | ≤2 frames |

*(Traces taken on the ramp-only tree so the two changes are separable; the envelope cut scales
the step magnitudes by 0.286 and does not change the shape.)*

**Hold-station — the R10 win — is kept.** At zero stick `vx = 0` exactly and `_x` cannot move;
the `n [1440,1500)` segment measures **+0.0000 NDC**. The residual post-release *screen* travel
is camera roll, proved rather than asserted: **release at the rail, where world x is clamped and
cannot move, and both trees still travel the same +16.75 %W.**

**This section is unaffected by the §1 retraction** — it rests on 138 consecutive-frame arcade
steps measured by two other operators, with no dependence on the envelope.

**`core/input.js`: read, unchanged.** No smoothing, no ramp. Reported so it reads as *checked*.

---

## 4. CROSS-AREA EFFECTS I CAUSED — one real, one WITHDRAWN

> ### WITHDRAWN: "the attract loop lost barrel rolls". It did not, and my instrument was run
> below its own validity floor for the second time this round.
>
> I reported 10 → 9 → 8 authored rolls across my two changes. The combat/flow lane's
> `roll_check.mjs` (selftest 9/9), which attributes each roll to the scheduled slam it belongs
> to, shows **both trees firing all TEN with deaths suppressed, landing on the same tick to the
> millisecond.** The missing rolls were slams that fell inside a death sequence, where the
> attract pilot is not driving. **My `demo_check.mjs` ran without `invincible=1`, so the
> statistic I published was "where does the player happen to die" — and the lock change in the
> same diff moves exactly that.** `demoTimeline.js`'s AMPLITUDES block already requires deaths
> suppressed for its roam statistics; I did not carry that precondition over to the roll count.
> `judging/R11/lane-combat.md` §2.1.

**What does survive**: the `ENVELOPE_X` cut scales the attract wander, because `demoTimeline.js`
normalises its targets by that constant — correct behaviour, large visible change. My own
`cx sd` figure for it was taken without the precondition as well, so **the combat/flow lane's
cruise/canyon numbers are the ones to quote, not mine.**

Two header corrections in `demoTimeline.js` still stand and are in `ask-flow.md`: **`ACCEL_RATE`
no longer exists**, and **`RATE_X` is no longer a multiple of `ENVELOPE_X`** (so its
`KP = 3*GAIN only because player.js writes RATE_* = 3.0 * ENVELOPE_*` note is now false for the
lateral axis).

---

## 5. OPEN

1. **`spawner.js`'s lateral spread** — §1.4. Downgraded from "decides whether the cut is kept"
   to "should check": the latency sweep shows the cut's engagement cost is specific to a
   zero-reaction-time pilot. `judging/R11/ask-spawner.md`.
1b. **`ASSIST_RADIUS_FRAC = 0.13` is now 1.32× the sight's entire reach** (was 0.37×) — and
   §2.2b promotes this from a note to **the top remaining item on R10 gap 3**: with the gun on,
   a motionless stick takes 85 % of an aiming pilot's kills, so the vulcan is now the free-kill
   source the missile used to be. Also:
   `LOCK_RADIUS_FRAC` 0.84× (was 0.24×) — both are screen-space radii about the sight and neither
   moved with the envelope. Raised by the combat lane; confirmed by arithmetic here. The gun
   assist cone being *wider than everything the player can aim at* means the vulcan's aiming
   content is now near zero. `combat.js` is not this lane's file. Note that 8.3 %W is
   prototype-ADOPTED, not arcade-measured, so the cone:reach ratio has no arcade check either.
2. **REFERENCE #122 should be re-derived or demoted** — §1.5.
3. ~~The attract loop is two rolls short of its authored ten~~ — **WITHDRAWN, §4.** Its wander
   does scale by 1/3.55, which is correct behaviour and the flow lane has measured it properly.
4. **The `sweep`-to-`track` middle is still unmeasured.** A human pilot lives there.
5. **`MAX_TURN_FRAC_PER_S = 0.77` is still solved, not measured**, and the **2.45 s flight-time
   tail** on receding `overtake` targets is unfixed. Both in `missiles.js`, which this lane owns
   and **did not get to — it is unchanged from `5e3d57e`.**
6. **`MAX_LOCKS = 6` against two independent arcade readings of max 3 simultaneous brackets.**
7. **The arcade's jet rate was never measured directly by me**; it is now inherited from the
   sight's, which is legitimate only because jet ≡ sight (ratio 1.02). If that ratio is ever
   refuted, `RATE_X` goes with it.

---

## 6. WITHDRAWN IN THIS ROUND

| withdrawn | why |
|---|---|
| `arcade_jet_x.csv` and the ±29.5 %W envelope | read enemy aircraft; identity test applied below its own resolution floor (§1.1) |
| the 2.95 jet:sight ratio, and the 1.12 fracW/s arcade jet rate derived from it | rests on the above; the real ratio is 1.02 |
| "REFERENCE #122 is corroborated" | agreement with a withdrawn figure |
| "`ENVELOPE_X` passes at 1.19×" | the opposite is true; it was 3.55× too wide |
| `ask-combat.md` | withdrawn by both lanes |
| `jet_envelope.py`, `jet_nozzles.py`, and the closed-mask variant | three automatic trackers, all passing their synthetic suites (11/11, 13/13), all unable to tell the player from an enemy, a cloud or the HUD |
| the first `demo_check` run reporting 0 ticks | `page.evaluate` returning undefined on a non-serialisable field — a clean, stable, wrong zero |
| "the envelope cut costs a tracking pilot 39 % of its kills" | single seed; −34 % ± 5 at n = 3, and ~0 % for a pilot with human reaction latency (§1.4) |
| "the attract loop lost 2 of its 10 authored barrel rolls" | measured without `invincible=1`; with deaths suppressed both trees fire all ten on the same tick (§4) |
| "blind share 83 % → 22 %" as a statement about the GAME | missile-only by construction; with the gun on it is 90 % → 85 % (§2.2b). True of the missile subsystem, which is what the change touched |
| the per-kill `weapon` field my first analyser read | `k.weapon`/`k.by` do not exist; it printed `x=` for every kill. The real split is `combat.js`'s cumulative `killCounts` |

**Eleven withdrawals, two of them this lane's own headlines — and THREE (§1.1, §4, §2.2b) are the same failure: an instrument run, or read, below its own stated validity floor.** The round's actual lesson is in §1.1.

---

## 7. FILES CHANGED

| file | change |
|---|---|
| `src/entities/player.js` | `ACCEL_RATE` deleted (`vx = cmdVX`); `ENVELOPE_X` 2.6 → **0.733**; `RATE_X` decoupled, `3.0*ENVELOPE_X` → **2.82**; the withdrawn envelope comment replaced with the retraction and the corrected column |
| `src/weapons/lockSystem.js` | `LOCK_RADIUS_FRAC` 0.22 → **0.083**; `_updateTracking` gated on `_lockable`; the licence comment corrected (it had cited the withdrawn measurement) |
| `src/weapons/missiles.js` | **unchanged** |
| `src/core/input.js` | **unchanged** (read) |

`npx vite build` passes. No test suite exists in this repo.

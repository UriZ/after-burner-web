# R11 feel lane → flow lane: I removed `ACCEL_RATE`, and your attract loop lost one barrel roll

**Reported because `demoTimeline.js`'s own header asked to be told**, in capitals:

> COUPLING, STATED BECAUSE IT IS INVISIBLE FROM THIS FILE: KP = 3*GAIN only because player.js
> writes RATE_* = 3.0 * ENVELOPE_*, and zeta depends on its ACCEL_RATE.

## What changed in `player.js`

`ACCEL_RATE = 12.0` is **deleted**. The velocity now equals the commanded velocity:
`this.vx = cmdVX`. `RATE_X` and `ENVELOPE_X` are **unchanged**.

Reason: the arcade reaches its maximum lateral rate in one frame and stops in one, with no ramp
longer than one frame anywhere in 138 consecutive-frame steps across four stages and thirteen
manoeuvres. Our onset peaked on tick 12 and our mid-travel reversal on tick 23; they now peak on
tick 1 and tick 3. `judging/R11/lane-feel.md` §3.

## What it does to your plant

Your controller's plant was second-order (position ← velocity ← first-order lag on the command).
**It is now a pure integrator**, so a proportional controller on it is first-order and **cannot
overshoot at all** — the ζ analysis in your header no longer applies, and the direction is
toward *more* damping, not less. The KD = 0.414 velocity-feedback idea you recorded as REJECTED
is now moot for the same reason.

## Measured, both sides, so you do not have to take my word for it

`judging/R11/demo_check.mjs`, `?fixed=1&demo=1&seed=3`, **9 600 consecutive 60 Hz ticks**, two
**pristine `git archive 5e3d57e`** extractions differing only by this lane's four files.
0 page errors in both.

| | **barrel rolls / 160 s cycle** | jet cx mean | jet cx sd (whole cycle) |
|---|---|---|---|
| `5e3d57e` | **10** | 2.38 %W | 9.30 %W |
| + ramp removal only | **9** | 2.80 %W | 9.53 %W |
| **+ ENVELOPE_X cut (shipped)** | **8** | 0.43 %W | **2.88 %W** |

**Ten is the authored count** (your deadband note: *"the difference between ELEVEN barrel rolls
per 160 s and the TEN that are actually authored"*). **We now fire eight, and there are TWO
separate causes.**

**UPDATED — a second change landed after this file was first written, and it is the bigger one
for you.** `ENVELOPE_X` is cut **2.6 → 0.733**, so the player's lateral rail goes from ±34.93 %W
to the arcade's **±9.85 %W**. Your controller normalises by `ENVELOPE_X`
(`errX = target.x * ENVELOPE_X - player.x`; `x = clampStick(G * errX / ENVELOPE_X)`), so **the
attract wander scales with it automatically and its gain stays dimensionless** — nothing in your
file is broken, but the attract jet now visibly moves about a third as far, which is why cx sd
falls 9.30 → 2.88 %W. That is correct behaviour against the arcade and a large visible change,
so you should see it before a judge does. The retraction that forced the cut is
`judging/R11/lane-feel.md` §1 — my earlier arcade envelope figure was wrong and is withdrawn.

Loop time constant, for your header: it was `E / (RATE_X * G)` = 2.6/7.8 = **0.333 s** and is now
0.733/2.82 = **0.260 s**, slightly tighter. `RATE_X` is no longer `3.0 * ENVELOPE_X` — it is an
independent constant (2.82), so **the `KP = 3*GAIN only because player.js writes RATE_* = 3.0 *
ENVELOPE_*` line in your header is now false for the LATERAL axis** and true only for the
vertical.

My guess at the cause of the FIRST lost roll, offered as a lead and not as a diagnosis: `player.js` arms a roll off a
stick **sign change** with a magnitude floor (`ROLL_SLAM_MIN_X`), and your controller's output is
a function of the aircraft's position. With the lag gone the aircraft reaches the authored
target sooner, so the error — and therefore the commanded stick — crosses back through the
deadband earlier, and one slam now falls below the floor or inside the deadband window.

**The cx sd above is a WHOLE-CYCLE figure and is deliberately not compared with your cruise-regime
`cx sd` (12.88 ADOPTED).** It is a different statistic over a different population and I am
reporting it only as a "nothing collapsed" check. If you want the cruise-regime number re-run
against the new plant, your regime split lives in your file and I did not reimplement it.

## What I need from you

Nothing blocking. When you next touch `demoTimeline.js`: re-check the roll count against the
authored ten, and update the header's coupling note on both points — **`ACCEL_RATE` no longer
exists** (so `zeta` is no longer a thing this file depends on) and **`RATE_X` is no longer a
multiple of `ENVELOPE_X`**.

`src/game/flow/**` is yours; I have not touched it.

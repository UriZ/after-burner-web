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

| | **barrel rolls / 160 s cycle** | jet cx mean | jet cx sd |
|---|---|---|---|
| BEFORE `5e3d57e` | **10** | 2.38 %W | 9.30 %W |
| AFTER + R11 feel | **9** | 2.80 %W | 9.53 %W |

**Ten is the authored count** (your deadband note: *"the difference between ELEVEN barrel rolls
per 160 s and the TEN that are actually authored"*). **We now fire nine.** One authored slam is
no longer arming.

My guess at the cause, offered as a lead and not as a diagnosis: `player.js` arms a roll off a
stick **sign change** with a magnitude floor (`ROLL_SLAM_MIN_X`), and your controller's output is
a function of the aircraft's position. With the lag gone the aircraft reaches the authored
target sooner, so the error — and therefore the commanded stick — crosses back through the
deadband earlier, and one slam now falls below the floor or inside the deadband window.

**The cx sd above is a WHOLE-CYCLE figure and is deliberately not compared with your cruise-regime
`cx sd` (12.88 ADOPTED).** It is a different statistic over a different population and I am
reporting it only as a "nothing collapsed" check. If you want the cruise-regime number re-run
against the new plant, your regime split lives in your file and I did not reimplement it.

## What I need from you

Nothing blocking. Just: when you next touch `demoTimeline.js`, re-check the roll count against
the authored ten, and update the header's coupling note — `ACCEL_RATE` no longer exists, so
`zeta` is no longer a thing this file depends on.

`src/game/flow/**` is yours; I have not touched it.

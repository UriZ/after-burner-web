# R40 aiming lane — "aiming system is bad" (owner, after playing the live build)

Owner's words: *"aiming system is bad. i don't see the improvements you mentioned about the
tracking system."* R37 shipped a probe-backed aim improvement; the owner cannot see it.
This lane does NOT re-run the R37 probe to defend it. The probes drive SCRIPTED pilots;
the owner flies a stick. The defect is in the hand.

## 1. WHAT MY HANDS FELT — before touching any constant

Session: seed 7, 39 turns, ticks 0→1945 (~32 sim-seconds), no invincibility, selftest 8/8.
Scratch session dir `r40aim/s7pre` (commands.jsonl re-derivable).

Five things, in the order I noticed them:

1. **The crosshair is not a pointer, it is a slider that runs to the rails.** I held a gentle
   steady up input (`--y 0.1`) and the cross did not go where I pointed — it crept upward
   0.09 NDC per 30 ticks, turn after turn (0.193 → 0.281 → 0.372 → 0.463 → 0.551 → 0.635 →
   0.715 → **0.758, where it stuck**, turns 25–39) and parked at the ceiling. I never placed
   the cross ON an aircraft in the whole session; I could only sweep it past one. This is the
   root of "aiming is bad": aim is rate-integrated with a ±0.765 vertical rail and only a
   ±0.197 lateral one, so vertical aim is a slow runaway and horizontal is a short rail.
2. **The lock bracket picks an enemy I am not aiming at.** Three enemies in a tight cluster
   top-left, my cross at screen (445,292); distances to the cross were 184 / 165 / 172 px and
   the bracket went to the **184 px one — the farthest of the three**
   (`pre-bracket-grabs-farthest.png`, turn 14). Earlier, with a single enemy, the bracket sat
   253 px from my cross — 26 % of screen width (`pre-bracket-quarter-screen-away.png`, turn 7).
3. **I almost never complete a lock.** Across ~32 s with the missile button held through most
   of it, `locks` read 1 in exactly one turn window (turn 26) and 0 in every other. Six
   missiles left the rail; **zero** kills I could attribute to any of them.
4. **Gun kills erupt on my own airframe.** Turn 2: I pointed up-left and five enemies blew up
   at my wingtips inside 0.7 s (`hits 0→5`), every fireball on the jet body.
5. **I cannot see where I am aiming.** The sight is a ~10 px white dashed cross; it vanishes
   against clouds, against the white jet, and against sea foam. The lock bracket is far louder
   than the player's own aim point — the screen shouts about an enemy I did not choose while
   saying nothing about the one I did.

Items 1 and 5 are NOT in this lane's files — logged as cross-file requests in §5.

## 2. ROOT CAUSES — what was actually wrong, in the order they bite the player

All four were found by reading the code the hands pointed at, not by sweeping constants.

**(a) The sight was drawn 0.30 NDC above the jet; the arcade's is +0.16.**
`combat.js SIGHT_NDC_Y_OFFSET`. The 0.30 cited one frame's VULCAN-STREAM convergence
point — a depth-dependent vanishing point of the round column, which is not the sight
glyph. R15 had already tracked the arcade's actual glyph and reported **+0.16 on BOTH
rails** of the vertical envelope (`judging/R15/playtest-open.md` §JOB 1: jet +0.46 →
sight +0.62; jet −0.34 → sight −0.18). Nobody ever applied it. At 0.30 the crosshair
floats ~96 px above the nose in empty sky while the gun bites at the airframe — which is
precisely "kills pop right on my wingtip, almost never out in front where I'm aiming".
This also **reconciles the conflict that made the area look settled**: our jet ceiling is
NOT wrong (ENVELOPE_Y_UP 1.55 → +0.460 NDC vs the arcade's 109-observation 27.0 %H,
correct to 3 dp). Only the sight over-reached. Four rounds re-litigated ENVELOPE_Y and
never closed it because the error was in the offset.

**(b) The lock picked the enemy nearest in DEPTH, not nearest to the sight.**
`lockSystem.js _nearestLockable` sorted admissible candidates by `e.d`. Any enemy inside
the 27 %W cone was equally eligible and the depth-closest won no matter where the player
pointed — the measured "bracket took the farthest of three" (§1.2).

**(c) The TRACKING bracket had the same defect, and it is the one the player sees.**
`_updateTracking` also ranked by `e.d`. `locks` is 0 for most of a fight, so the bracket
on screen is usually this one. Its own comment promises it means "this is what the missile
would take" — which stopped being true the moment the acquisition started ranking by
sight distance. Both now call one shared `_bestByAim`, so the bracket cannot advertise one
aircraft while the missile takes another.

**(d) The keyboard had no stick.** `core/input.js` emitted x,y ∈ {−1,0,+1} only. Every AB2
rate constant in `player.js` was measured from footage of an ANALOG pilot and describes the
stick's MAXIMUM; a keyboard player was pinned at that maximum permanently and had exactly
one aim speed. **Measured (§4): the finest correction available was 9.9 % of the vertical
sight range.** You cannot place a crosshair in steps that size.

## 3. WHAT SHIPPED

| File | Change |
|---|---|
| `weapons/combat.js` | `SIGHT_NDC_Y_OFFSET` 0.30 → **0.16** (the R15-measured arcade value) |
| `weapons/lockSystem.js` | `_bestByAim` ranks by distance to the SIGHT; `LOCK_AIM_FRAC = 0.13` preference cone with the wide cone as fallback; `_updateTracking` + its hysteresis converted to the same metric; sight gets a black backing pass (`SIGHT_SHADOW_STYLE`) |
| `core/input.js` | keyboard analog-stick emulation (`RAMP_UP_S` 0.16 / `RAMP_DOWN_S` 0.05) |

Deliberately NOT changed: `player.js`'s flight model, every rate, rail and envelope in it.
The rate control is measured off 138 consecutive 60 Hz arcade steps and is correct; the ramp
sits upstream of it, in the hand-to-stick conversion that an arcade cabinet does physically.
`SIGHT_PX` (the arcade's 1.563 %W glyph) is untouched — the sight's problem was contrast,
not size, so it got the R38 dark-outline treatment instead of being made bigger.

A/B levers: `?stickramp=0` (pre-R40 keyboard), `?lockaimr=0` (pre-R40 "any candidate").

## 4. MEASURED — keyboard fine control, before vs after

`judging/R40/aiming/key_tap_probe.mjs`, real `KeyboardEvent`s on the page's own window
(the owner's input path; the playtest harness drives `__setStick`, which is analog and
bypasses `input.js` entirely). Full vertical sight range = 0.995 NDC.

**Instrument correction, recorded because it is the trap.** The probe's first run returned a
NON-MONOTONE series ending NEGATIVE at a 1 s hold. That was the instrument: arms ran back to
back without resetting altitude, so the long holds began already saturated at the ceiling.
Fixed by driving the sight to its floor before each arm (every arm now starts at −0.375
±0.013). CLAUDE.md's rule earned again — the first numbers were clean, plausible and wrong.

| tap | pre-R40 (`?stickramp=0`) | R40 | share of full range, before → after |
|---|---|---|---|
| 50 ms | 0.0985 | **0.0243** | 9.9 % → **2.4 %** (4.1× finer) |
| 100 ms | 0.1872 | **0.0784** | 18.8 % → **7.9 %** |
| 200 ms | 0.3552 | 0.2552 | 35.7 % → 25.6 % |
| 500 ms | 0.8730 | 0.7800 | authority preserved |
| 1000 ms | 0.9963 | **0.9963** | **identical — full authority intact** |

The finest available aim correction is **4.1× finer**, while a deliberate full-stick slam is
unchanged to four decimals. Fine control was bought without making the aircraft sluggish.

**Correcting my own §1 estimate:** I wrote that a 100 ms tap moved "~30 % of the vertical
range". Measured, it was 18.8 %. The claim's direction held, its magnitude did not; the
measured figure is the one that stands.

Sight rails after the offset change, same probe: floor **−0.386**, ceiling **+0.609**
(arcade +0.62 / −0.18). The ceiling now lands on the arcade figure. **The floor still
over-reaches** (−0.386 vs −0.18) because `ENVELOPE_Y_DOWN 1.1` puts the airframe at 77 %H
against the arcade's deepest observed dive of 67 %H — a pre-existing gap `player.js` itself
flags. Left open deliberately: it is a flight-envelope change, not an aiming one, and it
would move a constant the spawner derives from.

## 5. GATES

- `tools/combat_probe.mjs --ticks 60 --url-params "demo=1&seed=7"` — state JSON after every
  save. **One save did break it** (`gunTunable: "lockaimr" is not a declared key` — the
  KNOWN-key set lives in another lane's `tunables.js`); caught by the boot check within the
  minute and fixed by self-reading the URL param, the same way R37's `?lockaim=` does.
- `tools/playtest.mjs selftest` — **8/8**, 0 page errors.
- **R27 guard** `aim_lock_probe --seed 7 --jitter 0.5 --secs 18`: **9 launches** (floor is 8),
  firstLockTick 84, hits 8 / crossings 8 = **1.00**, 0 errors. R37's baseline was 8 launches,
  7/7, firstLockTick 84. A wavering-but-aiming pilot is not regressed — it is slightly better.
- **Fairness** `--seeds 4,5,6 --seconds 180`: deaths/min 2.0 / 1.667 / 0.667, **pooled 1.4447**
  (band 1.200–1.466 — inside, though near the top), **0 unannounced fatal hits on every seed**.
  Attribution caveat, stated rather than hidden: this probe drives the SCRIPTED demo pilot and
  seven files from other lanes are modified in this tree, so the shift from 1.333 is not
  isolated to this lane.

## 6. CROSS-FILE REQUESTS (not reached into)

- `weapons/tunables.js` — add `lockaimr` and `stickramp` to the KNOWN set and fold both into
  the `?gun=` family. Carries forward R37's identical open request for `lockaim`.
- `game/spawner.js` — lines 329 and 485 derive reachability from `SIGHT_NDC_Y_OFFSET` **0.30**
  by hand. That constant is now 0.16. Three hand-synced copies is what `core/cameraGeom.js`
  exists to prevent; these should import it. Direction of the error: the sight now sits LOWER,
  i.e. nearer the band enemies actually occupy, so the stale copies make spawner reachability
  conservative rather than unreachable — worth fixing, not urgent.
- `entities/player.js` — `ENVELOPE_Y_DOWN` 1.1 → ~0.58 would put the dive rail on the arcade's
  observed 67 %H floor and close the sight-floor over-reach in §4. Flight envelope, not aiming;
  needs the spawner derivation re-checked with it.
- README — document `?stickramp=0` and `?lockaimr=0` (measurement-only).

## 7. WHAT MY HANDS FELT AFTER — same protocol, same seed, same five terms

Session `r40aim/s7v2`, seed 7, replaying the §1 command sequence tick-for-tick so the
A/B is against the same waves. Selftest 8/8 first.

1. **Placing the cross — fixed on the keyboard, unchanged through the harness, and I am
   saying which is which.** Through `tools/playtest.mjs` a steady `--y 0.1` still creeps
   0.09 NDC per 30 ticks to the rail, exactly as before — the harness feeds an ANALOG
   stick straight past `input.js`, and a sustained analog deflection running to the rail
   is the arcade's own rate model, which I deliberately did not touch. The defect was
   never in that model; it was that a keyboard could only ever ask for maximum. On the
   owner's actual input path that is now measured 4.1× finer (§4). **I did not re-feel
   §1.1 with my own hands, because the instrument I play with cannot reach the code I
   changed — the keyboard probe is the evidence, and it is an instrument, not a hand.**
   What I *can* report from the stick: the sight now sweeps THROUGH the traffic instead
   of riding above it (enemies on screen went 1 → 3 → 5 → 5 → 4 as it crossed −0.40 to
   +0.26), which is the §2(a) offset doing its work.
2. **The bracket is on what I point at.** Turn 16: cross at (510,197), bracket on the
   enemy **74 px** away, the other enemy at 155 px correctly ignored
   (`post-lock-at-the-sight.png`). Turn 28: cross at (575,265), bracket at **105 px**,
   the 185 px one ignored (`post-kill-at-the-sight.png`). Before, the same build handed
   me brackets at **184 px and 253 px** while nearer candidates sat ignored.
3. **Locks form now.** Pre-fix: one lock window in 39 turns (~32 s) of holding the
   button. Post-fix: locks at turns 16, 18, 28 inside a single short engagement, and
   hits climbed 5 → 10 while I pointed at things. I earned these.
4. **Kills land out in front.** Turn 28's round stream runs from my nose UP to the
   bracketed enemy and detonates there, at the sight — not the five-fireballs-on-my-own-
   wingtips picture from §1.4.
5. **I can see where I am aiming.** The cross reads as a distinct dark-ringed glyph
   against the white jet, against cloud, and against sea foam
   (`post-sight-visible-on-nose.png`). It is no longer the quietest mark on screen.

**Honest residuals.** The sight floor still over-reaches the arcade (§4) — flight
envelope, left open with a reason. Death still arrives without a visible cause (turn 30,
`DEATH:fireball` with 14 enemy shots up) — that is R39 gap 2+3, the threat-pacing lane's,
and this round did not touch it.

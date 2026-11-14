# R13 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R13 gate. **Tree judged**: HEAD `2ee343d` (clean, committed).
**Method**: look-first (watched two 60 Hz arcade bursts, then played ours via
`tools/playtest.mjs`), then each shipped claim re-measured with my own instrument — not the
lane's probe. Arcade reference: `.reference-cache/video/ab2-longplay-60fps.mp4`, stage 1 =
t≈88–120 per `STAGE_MAP.md`; true-native astern frame `reference/stage1-level-flight-t116.png`.

## SCORE

| | R12 | R13 | one-line reason |
|---|---|---|---|
| **Stills** | 8.5 | **8.5** | The jet now *breathes fire* — twin orange afterburner cones, throttle-scaled, banking with the airframe — which lands the game's single most identity-defining sprite where R12 had black nozzle rings and dots. A real gain to the focal object, but a *stronger* 8.5, not a 9: the two things that held R12 off 9 (noisier-than-arcade sea, undersized kill fireball) are untouched, and the new flame reads a touch long/liquid against the arcade's compact exhaust cans. |
| **Motion** | 7.5 | **8.0** | The sky is meaningfully more alive — the longest dead stretch is clipped to ~3.5 s, a bomber now crosses the whole screen big and close, and enemies persist through the death cycle so you respawn into live fire — and for the first time I fired missile salvos in normal play. Held off higher by the two illusion-breakers that did **not** close: the gun still kills without you, and the missile is a coin-flip on the wave-phase (one whole life on seed 19 fired nothing). |
| **Composite** | 8.0 | **8.2** | A genuine but modest round: two clean wins (afterburner, live sky), one headline partial (missiles crossed from *unusable* to *usable-but-intermittent*), one illusion-breaker untouched (blind gun). Honest progress, not a leap. |

**One-line verdict**: *More After Burner than R12 — my jet finally trails fire, the sky stays
busy and throws a big plane across my face, and on a good wave I climb onto a cluster, rack
two locks and loose a salvo — but the gun still kills whatever wanders into it whether I aim
or not, and on the wrong wave I fly a whole life with fifty missiles in the rack and nothing
to lock, then die trying to climb to where the lock lives.*

### What anchors the score (the look / the play, in player language)

I watched arcade stage 1 at 60 Hz (bursts at t=100 and t=110, viewed every ~10th frame =
0.17 s step): the sky is *relentlessly* full at every depth at once, something explodes about
every second, and the player F-14 drags two bright-orange afterburner cones the entire time.
Then I played seeds 7 and 19 (~48 steered turns, plus deterministic blind/aim measurement
runs; turn cadence 0.5–9 s, stated per claim below).

- **Real gains I felt.** The afterburner is the headline: throttle L is two short orange
  stubs, throttle H is two long bright cones (hot yellow core → orange → red tips), and under
  a hard bank they rotate rigidly with the fuselage and trail aft — the jet reads as *After
  Burner* now, where R12's read as a model kit with two dots
  (`judging/R13/playerart/afterburner-before.png` vs my `jx-afterburner-H-bank.png`). On seed
  7 my **second** steered turn — a plain climb to engage the opening formation, not a horizon
  camp — accumulated 2 locks, and releasing loosed a 2-missile salvo (`stock` 50→48,
  `jx-s7-salvo-normalposture.png`). That is the R12 rank-1 miss ("1 lock in 45 turns, 0
  salvos") visibly moved. And when I died, 5–6 enemies stayed on screen through the whole
  death cycle and I respawned straight into `enemy shots 26` — no empty respawn.
- **What still breaks the spell from the cockpit.**
  1. **The gun kills without me.** Ten seconds of stick-centered fire with the trigger held
     (seed 7) and my blind 90-s runs both say the same thing my eyes did: aiming does not
     out-kill a do-nothing pilot on the gun. The readable enemies swarm *low at the
     waterline* while the caged sight and the vulcan stream point up at an empty horizon
     (`jx-s19-gun-misses-low-row.png` — a full row of MiGs at the sea line, my tracer going
     straight up, the lock bracket floating over blank sky).
  2. **The missile is a coin-flip.** Seed 7 gave me salvos in the first six turns; seed 19
     gave me **one** unconvertible lock in twenty-one turns, a full `stock` of 50 I never
     fired, and death while climbing to reach the lock band. The fix is real but rides
     entirely on the every-4th-wave bait landing during a life you survive.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **1. Missiles usable from normal posture** (lock-bait cluster every 4th wave holds in-band; lane probe salvos/min ~0→22–28) | **PARTIAL** | A real step past R12. Seed 7, normal climb-to-engage (ticks 45–60/turn): locks formed on turns 2/4/5 (2 each) and salvos fired, `stock` 50→46 over ~6 turns — I completed lock→release→salvo as a *player*, which R12 never did. But it is **seed/phase-fragile**: seed 19, ~21 turns, **1 lock, 0 salvos, `stock` never left 50**, then death. The lane's "22–28 salvos/min" is a perfect-tracking *probe* figure; in human play I got ~2 salvos in 27 turns on the good seed and 0 on the bad one — the probe over-reads play by ~10×. Mechanism works; reliability does not yet. **Stays rank-2 for R14.** |
| **1b. Blind-pilot protection held** (centered stick fires no missiles) | **SURVIVES** | Across every blind run (centered stick, missile held) `stock` stayed 50 and 0 missiles launched. Aiming is still required to even attempt a lock. |
| **2. Gun window — mid-range dwell so aiming out-kills blind** (lane: dwell presence 26%→34%; admits NOT closed on the gun) | **PARTIAL / not closed** | The lane is honest: the dwell may raise *readable presence*, but it does **not** make aiming beat blind on the gun. My blind 90-s control (centered stick, trigger held, invincible, seed 7 & 3) collected ~20 gun kills per 90 s with no aiming at all, and my aimed stretches did not clearly exceed that. The caged sight cannot reach the low waterline row where the enemies actually fly. The core illusion-breaker is intact. |
| **3. Live sky — lull clipped, flyby, persist-through-death** | **SURVIVES** | My own `combat_probe --every 3` (seed 7, demo=2, 0.05 s sampling, 34 s window): longest zero-enemy stretch **3.55 s** (next 1.50 s), sitting right on the `DEAD_SKY_MAX_S`=3.5 clip; mean alive 3.6, sky empty 14.7% of the time in short bursts. A bomber flyby traversed the full screen (ndcX −0.85→+0.82) peaking at **32.5 %W** (36.1 %W in a second pass) — a genuine big-and-close screen crossing. In seed-7 play, 5–6 enemies persisted through the death cycle and I respawned into a full sky. |
| **4. Afterburner — twin cones, throttle-responsive, banks with jet** | **SURVIVES** | Isolated `nocombat` capture, seed 7: throttle L = two short orange stubs, throttle H = two long bright cones; under `--x -1` hard bank the cones rotate with the airframe and trail aft (`jx-afterburner-L-level.png`, `jx-afterburner-H-bank.png`). Death-safe (no frozen flame on the tumbling hulk — observed). The single biggest sprite gain of the round. |

### A specific claim the task flagged — ASSIST_RADIUS_FRAC 0.13→0.09

**Verdict: the lever is INERT; the stated rationale does not reproduce.** The lane changed
`ASSIST_RADIUS_FRAC` 0.13→0.09 to "curb blind gun kills," citing blind vulcan 24→17 and blind
share 82%→61%. R11 §2.1 had found this lever inert over 0.05–0.13. I re-measured with my own
instrument (the HIT counter under a blind pilot — centered stick, trigger held, no missiles,
`invincible=1`, deterministic), running the identical input at 0.13 and 0.09 via
`?gun=assistrad=…`, two seeds, 90 s (ten 9-s turns), summed over the three stages the run
passes through:

| seed | blind gun kills @0.13 | @0.09 |
|---|---|---|
| 7 | 21 | 20 |
| 3 | 19 | 22 |

The difference is ~1 kill and **its sign flips between seeds** (seed-3 stage 3 alone was 3 @0.13
vs 9 @0.09). That is noise, not a lever — confirming R11 §2.1 and **refuting** the lane's
24→17 drop. The change is harmless (it does not hurt the missile gate or regress "kills at the
sight"), but it did not do the job it was made for; the real blind-gun lever is elsewhere
(`reachdepth`/`minspan`/the still-wide assist), which the lane itself defers. *Instrument
caveat*: my "blind" is a centered stick caging the sight low under throttle M over stages 1–3
auto-progression; the lane's probe may pin stage 1 at a different throttle. But the direction
(noise, sign-flip) is robust enough to call it inert, and it agrees with an independent prior
measurement.

## Sampling rates (citation field 6)

- Arcade calibration: 60 Hz consecutive decode, viewed every 10th frame (0.17 s step) — pose
  and population only, no speed claim.
- Missile/gun play: my turn length (45–60 ticks = 0.75–1 s) is my sampling rate; I claim "I
  got a lock / fired a salvo / fired nothing in N turns," not sub-turn lock timing.
- Blind assistrad A/B: deterministic, 540-tick (9 s) turns, HIT counter, seeds 7 & 3.
- Dead-sky lull + flyby: `combat_probe` 0.05 s sampling (every 3 ticks), seed 7, demo=2, 34 s.
- Afterburner: single isolated `nocombat` frames at throttle L/H and a hard bank — stills.

## Ranked gap list for R14 (player language — what most breaks the illusion now)

1. **The gun still kills without me.** Aiming does not cause gun kills (blind ≈ aimed, ~20
   kills/90 s with the stick dead-centre), because the readable enemies swarm *below* the
   caged sight at the waterline while my tracer streams up at the empty horizon. This is the
   project's oldest complaint and it is still open. **R14: the readable traffic has to fly
   where the sight can actually point, or the sight has to reach the low row — and the wide
   auto-assist (not `ASSIST_RADIUS_FRAC`, which is inert) has to be narrowed so a do-nothing
   pilot stops collecting kills.** (`jx-s19-gun-misses-low-row.png`)
2. **The missile is a coin-flip on the wave-phase.** On a good life I rack salvos; on a bad
   one I fire nothing and die with 50 in the rack, because locks come only from the
   every-4th-wave bait and reaching it means a high climb that draws fire. **R14: make a lock
   reachable every wave from a survivable posture, not once in four** — more bait cadence, or
   a lock that tracks an enemy you merely point near, without widening the arcade-closed sight
   rail.
3. **The death cycle is long and breaks the pace.** The fireball→starburst→tumble→respawn ran
   ~7–10 of my turns; enemies persisting through it (a real R13 win) means no *empty* respawn,
   but the ~7.7 s you spend not flying still stalls the arcade's relentlessness. **R14 (flow):
   shorten the tumble, drop the player back into fire faster.**
4. **Breadth: only 3 of 23 stages, no resupply/bonus pass.** Absence still outranks tuning.
5. **Climaxes read small.** Kill fireballs are clusters of orange puffs, not the arcade's
   half-screen blasts; the afterburner flame reads a touch long/liquid vs the arcade's compact
   exhaust cans; title letterforms still hand-rounded. A grouped polish pass.

**Kept as positives (do not regress):** the afterburner cones (throttle-scaled, bank-rigid,
death-safe); the dead-sky clip (lull ≤3.5 s) + the large flyby + enemies persisting through
death; the missile lock→salvo mechanism now reachable from a climb; islands/launch/game-over
from R12.

## Instrument limits (stated plainly)

- Two seeds (7, 19) for hands-on play, one agent pilot, ~1 s decision cadence; strips are
  6-panel composites, not video — no feel claim finer than a turn length, no audio judged.
- The missile-usability verdict rests on two seeds that disagreed sharply (7 good, 19
  starved); "intermittent" is the honest centre, but the true per-minute salvo rate in human
  play is not pinned beyond "~2 in 27 turns on the good seed, 0 on the bad."
- The dead-sky/flyby figures are from a demo=2 (scripted-aiming, invincible) probe — the right
  tool for the alive-array timeline, but a scripted pilot's attrition is not a human's, so the
  3.55 s lull is a representative bound, not the worst case a struggling player could produce.
- I did not re-slam-test the barrel roll; the world-roll drama is confirmed intact (horizon to
  ~45° in the banked afterburner capture) and the flame change is additive to it.
- The assistrad A/B spans stages 1–3 auto-progression at throttle M; the inert finding is
  robust in direction but the absolute per-stage counts are noisy (±2).

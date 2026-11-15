# R14 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R14 gate. **Tree judged**: HEAD `91b8920` (clean, committed —
includes the R14 combat `947ac7c`, breadth `a0d420e`, and opening-playtest `951ab3e` commits).
**Method**: look-first (watched two 60 Hz arcade stage-1 bursts + the four mapped stage frames,
then played ours hands-on via `tools/playtest.mjs`, selftest 8/8 before first use), then each
shipped claim re-measured with my own instrument — a deterministic blind/aim kill-count control
and an active missile hunt, not the lane's `gun_aim_probe.mjs`. Arcade reference:
`.reference-cache/video/ab2-longplay-60fps.mp4` (stage 1 = t≈88–120) and `ab2-longplay.mp4`
(map-keyed stage frames); death-cycle file `ab2-gameplay.mp4` confirmed 30/1 fps by ffprobe.

## SCORE

| | R13 | R14 | one-line reason |
|---|---|---|---|
| **Stills** | 8.5 | **8.5** | A 4th distinct stage shipped — the teal-sky green forest reads unmistakably as arcade stage 4, and stages 1–3 (coast / sunset-desert / night-city) render with zero regression and the afterburner cones intact across all four. Held at 8.5, not raised: the new forest **ground** is darker and flatter than the arcade's vivid mottled canopy, and the two things that held R13 off 9 (noisier-than-arcade sea, sub-screen kill fireball) are untouched — breadth widened the game without raising the per-frame ceiling. |
| **Motion** | 8.0 | **8.1** | The blind-gun free-kill floor is genuinely **halved** — a do-nothing pilot now collects ~10 gun kills/90 s where R13 measured ~20 — so your trigger finger is a larger share of the result, and that is a real, reproduced reduction of the project's oldest illusion-breaker. Held low because neither headline combat illusion-breaker actually **closed**: aiming the gun *still* does not out-kill a dead-centre stick (9 vs 10 on the same seed, sight pushed down onto the low row), and the missile is still a human coin-flip (a salvo feast on seed 7's opening, **zero** locks/salvos a human could convert across a full seed-19 session). |
| **Composite** | 8.2 | **8.3** | A modest-positive round in the R13 mould: two real, reproduced gains (blind-gun floor halved; a 4th stage) against two headline illusion-breakers that improved but did not close (aiming-causes-kills; human-executable missile). +0.1 — honest progress, not a leap. |

**One-line verdict**: *More game and a fairer gun than R13 — there's a whole green forest stage
now, and the gun has stopped mowing down planes for me at twice the rate it should — but I still
can't make aiming the gun beat holding the stick dead-centre, and on an unlucky run I fly a full
life with fifty missiles in the rack and never a lock a human hand could catch.*

### What anchors the score (the look / the play, in player language)

I watched arcade stage 1 at 60 Hz (bursts at t=100 and t=110, every ~10th frame = 0.17 s step):
the sky is a **wall of planes at every depth**, the horizon rolls hard and stays rolled, and a
half-screen fireball goes off about every second. I pulled the four mapped stage frames (t=100 /
140 / 175 / 220) for palette. Then I played seeds 7 and 19 — a blind/aim gun control (90 s each,
invincible, deterministic), an active missile hunt on both seeds, and a non-invincible
dogfight-to-death on seed 7 (~5 sim-minutes total).

- **Real gains I felt.** The gun no longer farms. On a dead-centre stick with the trigger held,
  the kill count that used to tick to ~20 now stalls near ~10 — the sky's distant specks stopped
  dying for free (`ours-dogfight-strip.png`: the big close targets still die, the far ones don't).
  And there is a **fourth stage**: climb past stage 3 and the world turns into a teal-sky green
  forest that reads as arcade stage 4 at a glance (`ours-stage4.png` vs `arcade-stage4-t220.png`),
  with stages 1–3 unchanged and the twin afterburner cones trailing through all four.
- **What still breaks the spell from the cockpit.**
  1. **Aiming the gun still doesn't cause the kill.** My informed-aim run — sight shoved down to
     y≈−0.25 and swept across the low waterline row where the enemies actually fly — scored **9**
     gun kills in 90 s against the dead-centre stick's **10** on the identical seed. Pointing the
     gun where the enemies are did not beat pointing it at nothing.
  2. **The missile is a coin-flip a human loses on the bad phase.** Seed 7's opening wave is a
     lock feast — climb from t=0 holding the missile and release-on-lock and I emptied six salvos
     in ten seconds (stock 50→41). Seed 19, the *identical* technique from a clean start: **zero
     locks, zero salvos** across ~20 s with close fighters (up to 32.7 %W) filling the screen.
     The only seed-19 lock I ever caught came from a lateral sweep grazing the peeling bait's
     one-second window, and I could not release inside it before it was gone.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **1. Blind-gun floor HALVED 20→10** (GUN_KILL_SPAN_FRAC 0.10→0.14 so the gun only kills close/big aircraft) | **SURVIVES** | My deterministic blind control (stick dead-centre `x=0 y=0`, trigger held, no missiles, `invincible=1`, throttle M, 9×10 s turns, hits summed per stage): **seed 7 = 3/4/3 = ~10**, **seed 19 = 5/4/3 = ~12**. The opening playtest's 4/8/8=20 was measured on the pre-combat HEAD `5ecb8bb`; on current HEAD the floor is halved on **both** seeds. Reproduced, generalises. |
| **1b. Aiming now beats the blind gun** (the rank-1 goal) | **REFUTED / not closed** (lane honestly declared this still capped) | Same-seed, same-window aim control (sight steered down to `(±0.203, −0.246)` onto the low enemy row, trigger held, seed 7, invincible, 90 s): **aim = 4/3/2 = 9** vs **blind = 10**. Aiming did **not** out-kill a dead-centre stick — it scored one fewer. The oldest complaint is *reduced* (half the free kills) but **not** closed. Note: pushing the sight *down* did not help, which points at target **supply** + the wide span-scaled hit net as much as at vertical reach — see R15 gap 1 caveat. |
| **2a. Missile AVAILABILITY fixed every-other-wave incl. adverse seed 19** (BAIT_EVERY 4→2, bait peels off-side; probe salvos 32/43/40) | **PARTIAL (availability real, barely)** | A lock **is** now reachable on seed 19 where R13 fired nothing: by climbing to max (sight y=0.76) and sweeping laterally I caught one lock (held ~4.5 s, turns 9–11). That is a mechanism that did not exist in R13. But it is a *perfect-tracker* availability: a lock exists on the adverse seed, not that a human catches it. |
| **2b. Missile human-EXECUTABLE in normal play** | **REFUTED on the adverse phase** (lane declared this still blocked) | Seed 7 opening wave: climb-and-release-on-lock → **6 salvos in ~10 s** (stock 50→41) — easily executable there. Seed 19, identical technique from a clean start: **0 locks / 0 salvos over ~20 s** (26 turns, all stage 1) with close targets constantly present. The one seed-19 lock I caught by sweeping, I could not convert before it peeled away. The coin-flip has shifted from *"fires nothing because no bait"* to *"a lock exists but a human can't convert it on the bad phase"* — still a coin-flip for a player. |
| **2c. Blind-pilot missile protection held** (centred stick fires no missiles) | **SURVIVES** | Every blind gun run held `stock 50` with 0 missiles launched; a centred stick never locks. Aiming (a climb) is still required even to attempt a lock. |
| **3. Death cycle ~8.1 s, arcade-correct, do not shorten** (RE-MEASURED R14, not to be re-opened) | **SOUND — method confirmed** | I did not re-litigate. I audited the *method*: `ab2-gameplay.mp4` is **30/1 fps native** (ffprobe `r_frame_rate=30/1`, confirmed), so true 60 Hz is physically impossible from the only deaths file — the 30 Hz / every-frame sampling is correct and ±0.033 s on an 8 s interval is <0.5 %. Excluding the t≈500 death-into-continue (coin-insert countdown) and separating the ~6.25 s no-control tumble from the trailing READY-blink are both sound decompositions. 7.7 s stands, if anything an under-read. |
| **4. A 4th stage — green forest (arcade stage 4)** | **SURVIVES** | `?stage=4` renders a flat teal sky (matches the measured #009f93) over a green forest ground, reading as arcade stage 4 at a glance (`ours-stage4.png`). Stages 1–3 render unchanged (no regression). The forest **ground** is the weak spot: darker and flatter than the arcade's bright mottled canopy with its cyan river (`arcade-stage4-t220.png`) — a polish item, not a blocker. |

## Sampling rates (citation field 6)

- Arcade calibration: 60 Hz consecutive decode, every 10th frame (0.17 s step) — pose/population
  only, no speed claim. Stage frames: single `-frames:v 1` extracts from the map-keyed longplay.
- Blind/aim gun control: deterministic 600-tick (10 s) turns, HIT counter summed per stage,
  seeds 7 & 19, `invincible=1`. My turn length is my sampling rate.
- Missile hunt: 45–90-tick turns (0.75–1.5 s), locks/stock read per turn; "I caught N locks /
  fired N salvos in M turns", not sub-turn lock timing.
- Death cycle (arcade): 30 Hz every-frame from the 30 fps `ab2-gameplay.mp4` — method audit only.
- Death cycle (ours): `?forcedeath=3` capture, 0.5 s step — structure/look only.

## Ranked gap list for R15 (player language — what most breaks the illusion now)

1. **I'm still a passenger in the fight — aiming the gun doesn't win, and I can't fire a missile
   on an unlucky run.** Both combat residuals the lane handed up reduce substantially to the
   **vertical sight envelope** (`player.js ENVELOPE_Y`): the close/big jets dwell below the caged
   sight, and the missile bait sits above where a climbing human can centre the lock cone. Rank
   this the R15 keystone — **but it needs the arcade's vertical sight range MEASURED first; no
   arcade column exists for the vertical envelope yet** (ENVELOPE_X is closed, Y is not). **Critical
   caveat for the gun half:** my aim control pushed the sight *down* onto the low row and still
   lost to a dead-centre stick (9 vs 10), so more down-reach alone may not make aiming *win* — the
   gun's cap looks as much like target **supply** (the 0.14 span gate leaves few close/big targets)
   and the **wide span-scaled hit net** (a centred sight is already a wide net for big targets) as
   like reach. R15 should *measure whether added down-reach actually converts* before committing
   the gun fix to the envelope. The **missile** half is cleanly a reach problem: give the climb the
   range to centre the bait and a human can lock. (Player lane, after an arcade vertical-envelope measure.)
2. **The sky is uniformly sparse where the arcade is a wall then a lull.** Even on the busy seed I
   flew against ~3–6 enemies evenly; the arcade throws a wall of planes at every depth at t≈100
   then empties. This is also the gun's target-supply problem from gap 1 — a denser, burstier wave
   gives aiming more close/big targets to actually out-kill the blind net against. (Combat/spawner + world.)
3. **Breadth — 4 of 23 stages, no resupply/bonus pass.** The 4th stage is a real gain; keep
   chipping (a 5th stage, or the missing refuel/bonus pass), and **polish the stage-4 forest
   ground** toward the arcade's brighter, more mottled canopy — the sky matches, the ground is dark
   and flat. (World + flow.)
4. **Climaxes still read small; the title still hand-rounded.** Kill fireballs are sub-screen vs
   the arcade's half-screen blasts; the afterburner is a touch long/liquid; the title wordmark is
   hand-rounded where the arcade's is brush-angular. A grouped polish pass. (Effects / player-art / ui.)

**Kept as positives (do not regress):** the halved blind-gun floor; the 4th stage + unchanged
stages 1–3; enemies persisting through the death cycle (seen directly — live jets on screen through
the tumble, no empty respawn); the afterburner cones (throttle-scaled, bank-rigid, death-safe);
the missile lock→salvo mechanism (a feast on the good phase); the arcade-correct death cycle.

## Instrument limits (stated plainly)

- Two seeds (7, 19); one agent pilot at ~1 s decision cadence; strips are 6-panel composites, not
  video — no feel claim finer than a turn length, no audio judged.
- The blind/aim gun A/B spans stages 1–3 auto-progression at throttle M; per-stage counts are
  noisy (±2). The direction (aim ≈ blind; both ≈ half of R13) is robust across both seeds.
- The missile-execution verdict rests on two seeds that disagreed sharply (7 a feast, 19 starved);
  "availability fixed, execution still phase-dependent" is the honest centre. I did not test every
  phase on seed 19 exhaustively — I gave it the seed-7-winning technique from a clean start and got
  zero, and caught one lock by sweeping that I could not convert.
- Our death-cycle look is from a single `forcedeath` capture (structure, not a worst-case human death).
- Stage-4 ground judged by look against one mapped arcade frame (t=220) + the measured palette, not
  a fresh ACF measurement.

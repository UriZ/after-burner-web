# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R13 CLOSED at 8.2; R14 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R13 verdict**: **8.2** (motion 8.0, stills 8.5) — `judging/R13/judge-report.md`. Two clean
  wins (afterburner, live sky), the missile now usable-but-intermittent; the blind gun stays open.
- **Score trend**: … R10 7.5 → R11 8 → R12 8.0 → **R13 8.2**.
- **R13 shipped (judge-confirmed)**: the jet **breathes fire** (twin throttle-responsive
  afterburner cones, bank + death safe); a **live sky** (big flyby crossing full screen, lulls
  ~6→~3.5 s, enemies persist through the death cycle — no empty respawn); the **missile usable
  from normal posture** (a real salvo without horizon-camping); a **mid-range gun window** (26→34 %).
- **R13's honest limits (judge)**: missile is **coin-flip on wave timing** (lock only on the
  every-4th-wave bait; the lane's "22–28 salvos/min" probe over-reads human play ~10×); the
  **gun still kills without you** (blind ≈ aimed, ~20 kills/90 s — readable enemies swarm below
  the caged sight); the ASSIST_RADIUS_FRAC 0.13→0.09 tweak is **INERT** (confirms R11 §2.1).
- **What works end to end**: title → flight → combat → death/respawn → tally → stage 1/2/3
  → GAME OVER / continue → restart. Throttle (now drives the flame), barrel roll, formations,
  lock/missiles/vulcan, afterburner, synthesized audio + FM music all run.
- **Still absent**: 3 of 23 stages, no resupply/bonus pass, limited enemy variety. Absence
  outranks constant tuning.

## R14 gap list — from the R13 judge's close-look (`judging/R13/judge-report.md`)

Theme: **close the combat-feel cracks R13 left open, and start on breadth.** Ranked:

1. **THE GUN STILL KILLS WITHOUT YOU — the oldest open complaint.** A blind centered stick
   with the trigger held gets ~20 gun kills/90 s; aiming doesn't clearly beat it, because
   readable enemies swarm the low waterline row the caged sight can't reach, and a wide gun-
   assist auto-converts them. **The real lever is NOT `ASSIST_RADIUS_FRAC` (R11 §2.1 + R13
   judge both measured it INERT over 0.05–0.13).** Candidates: tighten the assist differently
   (reachdepth/minspan), or raise the readable-enemy row toward the sight line, or gate gun
   hits on aim like the missile. Make aiming the gun *cause* the kill. (Combat lane.)
2. **MISSILES ARE A COIN-FLIP ON WAVE TIMING.** Usable now, but a lock only comes on the
   every-4th-wave bait — a bad phase (or an early death) fires nothing. **Make a lock
   reachable every wave from a survivable posture** (more frequent/parallel bait, or a second
   routing). Keep the blind-pilot gain (blind missile kills must stay low). (Combat lane.)
3. **~~RE-MEASURE THE DEATH CYCLE~~ — RESOLVED R14, DO NOT RE-OPEN.** Settled
   (`judging/R14/playtest-open.md`): two arcade deaths re-measured (hit→READY-gone **8.35 s**
   and **7.90 s**, mean **~8.1 s**) — the 7.7 s reading is **confirmed, if anything an
   under-read.** The death cycle is arcade-correct; **do NOT shorten it** (R7 already reversed
   a short cycle). The ~6 s tumble filling the dead time is a *content* polish item, not a
   length bug. (`ab2-gameplay.mp4` is **30 fps native** — true 60 Hz is impossible from the
   only deaths file; 30 Hz is ample on an 8 s interval.)
4. **BREADTH — ~~3 of 23 stages~~ 4 of 23 now (R14 added the forest), no resupply/bonus.**
   Still the biggest structural absence;
   every round should chip at the stage count or a missing pass. (World + flow.)
5. **POLISH: small climaxes, the flame, the title.** Kill fireballs read sub-screen vs the
   arcade's half-screen blasts; the afterburner is a touch long/liquid; the title wordmark is
   hand-rounded where the arcade's is brush-angular. (Effects / player-art / ui.)

**Kept as positives (do not regress):** the afterburner flame (throttle-responsive, banks,
death-safe); the flyby + live sky + enemies persisting through respawn; the missile usable
from normal posture; gun-at-the-sight; islands/game-over/±60° attract; stage 2 sunset.

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX (audio), a stage-
transition cross-fade on sky/ground `setStage` (world) for the 1→2 hard cut. Record R13's
lock-bait + flyby as **ADOPTED R13** in GAME_SPEC §4. **Capture caveat**: the combat p-gate
makes `demo=2` under-read gun explosions — use `?combatexpl=1` and an aiming pilot (or play).

## Hard warnings that stay load-bearing

- **Never `git stash` / `checkout .` / `reset`** while lanes are active. Pathspec-scoped
  commits only (`git commit -- <paths>`); a narrow `git add` sweeps in others' staged work.
- `tools/capture.mjs --out <UNIQUE-dir>` — never a shared/fixed output path.
  `?fixed=1` + `window.__step(n)` is the deterministic path; assert the POPULATION of every
  capture (`tools/assert_population.py`) — an invocation is an intention, a frame is a record.
- Derive HUD exclusion with `tools/hud_mask.py` per run; the HUD has been counted as an
  enemy, a cloud and a false horizon.
- **No frac-below-threshold statistic off a resampled frame** (R11 §2.3): the whole stage-1
  reference pack is a smooth 3.2125× upscale and reads 0.56–0.81× native. Use ΔL-against-sky
  or publish a bound with direction. True-native frames: `ab2-arcade-desert.png`,
  `ab2-arcade-night-banking.png` only.
- **Anything that moves is measured at 60 Hz consecutive decode, both sides**, and every
  temporal figure states its sampling rate. 4 Hz sampling produced every false temporal
  claim this project has made.
- **Measure the OBJECT you think you are measuring**: validate identity at working scale
  (the player is the twin-nozzle F-14; every enemy has one nozzle). A precision check does
  not license a measurement — identity does.
- Known refuted claims that still circulate: the `-ss` "~4 s early" caveat (refuted, exact);
  "the 60 fps file is 30 Hz duplicated" (refuted — hashing can't test an AV1 re-encode);
  REFERENCE #122's cruise/canyon `cx sd` (impossible against the measured ±9.85 %W rail —
  retire on sight). Full list: archive, "REFUTED" boxes.
- `ENVELOPE_X`, sight rails, traverse: CLOSED at the arcade's ±9.85 %W / 0.379 fracW/s.
  Under the new method's tolerance bands, do not re-litigate.

## Standing asks of the owner

- None required per round: **the playtest is now an agent's job** (`agent-playtest`
  skill + `tools/playtest.mjs`; verdicts land in `judging/R<n>/playtest-verdict.md`).
  If you do play, your five sentences outrank the agent's.
- `git push` only with your explicit approval (unchanged).

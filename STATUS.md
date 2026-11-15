# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R14 CLOSED at 8.3; R15 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R14 verdict**: **8.3** (motion 8.1, stills 8.5) — `judging/R14/judge-report.md`. Two real
  reproduced gains (a 4th stage; the blind gun halved) vs two combat illusion-breakers that
  improved but didn't close.
- **Score trend**: … R11 8 → R12 8.0 → R13 8.2 → **R14 8.3**.
- **R14 shipped (judge-confirmed)**: a **4th stage** (green forest = arcade stage 4, palette
  measured; 1–3 regression-free); the **blind gun HALVED** (dead-centre fire-held pilot ~20→10
  kills/90 s, reproduced both seeds); **missile availability** fixed (lock every other wave incl.
  the adverse seed); the **death cycle SETTLED** (arcade re-measure ~8.1 s — correct, do not shorten).
- **R14's honest limits (judge)**: aiming the gun still does **NOT** beat the blind stick (9 vs
  10 even with the sight shoved onto the enemy row) — the cap is target **supply** + the wide hit
  net as much as reach; the missile lock is **available** but a human still can't always **convert**
  it (coin-flip shifted from "no bait" to "a lock a human can't reach"). Both reduce to the
  **vertical sight-reach keystone** (`ENVELOPE_Y`).
- **What works end to end**: title → flight → combat → death/respawn → tally → stage 1/2/3/**4**
  → GAME OVER / continue → restart. Throttle (drives the flame), barrel roll, formations,
  lock/missiles/vulcan, afterburner, synthesized audio + FM music all run.
- **Still absent**: 4 of 23 stages, no resupply/bonus pass, limited enemy variety. Absence
  outranks constant tuning.

## R15 gap list — from the R14 judge's close-look (`judging/R14/judge-report.md`)

Theme: **the vertical-reach keystone + the density it depends on.** The two combat residuals
that stayed open through R14 reduce to one knot — the sight can't reach the targets, and there
aren't enough close targets. R15 attacks both, but **measurement-first** (one lever has no
arcade column). Ranked:

1. **~~THE SIGHT CAN'T REACH~~ — REFUTED R15 by measurement. DO NOT GROW `ENVELOPE_Y`.** The
   first-ever arcade vertical-sight measurement (`judging/R15/playtest-open.md`): the arcade
   sight ranges **−0.18 (dive) to +0.62 (climb) NDC**, rest **~+0.16 above centre**. **Our build
   already OVER-reaches it** — we climb to **+0.76**, dive to **−0.25**, and climbing DOES
   acquire locks. Growing the envelope moves us AWAY from the arcade. The R14 "sight can't reach"
   diagnosis was wrong; measuring first caught it. **The two combat residuals are NOT reach:**
   - **GUN = supply + wide hit-net.** Pushing the sight DOWN *lost* kills (8/5 vs blind 10/12).
     Blind-centre is dominant because traffic funnels through centre + the span-scaled hit net is
     a wide auto-converter. The fix is **close-target supply** (density bursts, gap 3) — NOT
     reach, NOT `ASSIST_RADIUS_FRAC`/`HIT_RADIUS_SPAN_MULT` (both forbidden/inert). (Combat lane.)
   - **MISSILE = conversion, not reach.** Climbing acquires locks fine, but they're **transient
     (~2 s)** and fire-is-on-release, so a human can't time it (1 missile in 27 s). Fix: a **lock
     grace window** (hold an acquired lock long enough to convert) in `lockSystem.js`, keeping
     blind protection. (Combat lane.)
   One real nuance flagged, NOT for this round: our REST sight offset is +0.30 vs arcade ~+0.16
   — but that's `SIGHT_NDC_Y_OFFSET` (combat.js), possibly a different operator (vulcan-stream
   convergence) than the nose-sight glyph. Reconcile before touching; do not blind-change.
2. **THE GUN KILLS BY SUPPLY, NOT BY AIM.** Aiming still doesn't out-kill a dead stick. The cap
   is as much target **supply** (too few close targets) + the wide span-scaled hit net as it is
   reach. This is the same knot as gap 3 — more close targets to aim at is part of the fix.
   `HIT_RADIUS_SPAN_MULT` is the forbidden lever (visible centred hits must register); the
   supply side is the spawner's. (Combat lane, coupled with gap 3.)
3. **THE SKY IS TOO EVEN — NO WALL, NO LULL.** The arcade is a wall of planes at every depth,
   then empties; ours holds a steady ~3–6. Build the **burst-then-drought** rhythm (R10 measured
   the arcade killing 3 in 0.367 s then a 3.1 s drought). This both reads as AB2 *and* gives the
   gun its close targets. Mind R9: the arcade AVERAGES only ~19 % density — the fix is variance,
   not more enemies everywhere. (Combat/spawner lane.)
4. **BREADTH — 4 of 23 stages, no resupply/bonus pass.** Keep chipping: another stage, or the
   iconic resupply/refuel interstitial. (World + flow.)
5. **POLISH: the forest ground, climaxes, the title.** Stage-4 ground is darker/flatter than the
   arcade's bright mottled canopy; kill fireballs read sub-screen; the title wordmark is
   hand-rounded where the arcade's is brush-angular. (World / effects / ui.)

**Kept as positives (do not regress):** the 4th stage + stages 1–3; the afterburner flame; the
blind-gun floor halved; missile availability every other wave + blind-pilot protection; the
flyby/live sky/enemies-through-respawn; game-over; ±60° attract; **the death cycle at ~8 s
(arcade-confirmed — do NOT shorten).**

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX (audio), a stage-
transition cross-fade on sky/ground `setStage` (world). Record R13's lock-bait + flyby and
R14's stage 4 as **ADOPTED** in GAME_SPEC §4. **Capture caveat**: the combat p-gate makes
`demo=2` under-read gun explosions — use `?combatexpl=1` and an aiming pilot (or play).

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

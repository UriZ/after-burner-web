# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R12 CLOSED at 8.0; R13 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published as an Artifact.
Pre-R12 STATUS is archived verbatim at `judging/archive/STATUS-through-R11.md` — reference
material, not required reading. Repo: github.com/UriZ/after-burner-web.

## Current state

- **R12 verdict**: **8.0** (motion 7.5, stills 8.5) — `judging/R12/judge-report.md`. Flat on
  R11's number but a *different* 8: two missing systems shipped, rank-1 only partially closed.
- **Score trend**: R1 3 → R5 7.5 → R8 8.5 → R9 7 → R10 7.5 → R11 8 → **R12 8.0**.
- **R12 shipped (judge-confirmed)**: stage-1 **land** (islands/crags/surf), real **stakes**
  (GAME OVER, no silent refill), attract **roll-drama** (±60°), a visible **tracer**, gun
  kills **at the sight** (p90 14.6→~10 %W), and the missile **lock geometry bug fixed** —
  a lock is now *reachable*.
- **R12's honest miss**: the missile is reachable but **not usable in normal play** — the
  judge got 1 lock in 45 turns and never fired a salvo (reaching the band means climbing to
  the horizon and getting shot). The TL's "works for a player" commit overstated it.
- **What works end to end**: title → flight → combat → death/respawn → tally → stage 1/2/3
  → GAME OVER / continue → restart. Throttle, barrel roll, formations, lock/missiles/vulcan,
  synthesized audio + FM music all run.
- **Still absent**: 3 of 23 stages, no resupply/bonus pass, limited enemy variety. Absence
  outranks constant tuning.

## R13 gap list — from the R12 judge's close-look (`judging/R12/judge-report.md`)

The R12 judge looked and re-measured; its forward list seeds R13. An R13 playtest on the
new build confirms/refines before lanes lock. The theme is **combat FEEL and population** —
the systems now exist; they don't yet behave like the arcade in play. Ranked:

1. **MISSILES ARE REACHABLE BUT NOT USABLE.** The lock geometry bug is fixed, but a lock
   only forms by climbing to the horizon band and sitting there — which gets you shot (judge:
   1 lock in 45 turns, 0 salvos in real play). **Fix: route enemies through the lock band, or
   widen the lock strip, so a lock happens from NORMAL posture.** NOT `ENVELOPE_X` (arcade-
   closed at ±9.85 %W). This is spawner/lock work. (Combat/spawner lane.)
2. **KILLS STILL HAPPEN TO YOU — no mid-range gunnery window.** The gun now kills at the
   sight, but enemies pop horizon-dot → wingtip with no stretch at a shootable depth. **Give
   enemies dwell time at a mid-range depth the player can aim at.** (Combat/spawner lane.)
3. **THE SKY STILL GOES DEAD.** Confirmed multi-second zero-enemy stretches, and no
   large-scale flyby — an enemy crossing the screen at size the way the arcade's do every
   second or two. Population + choreography, not the (correct) size distribution. (Spawner.)
4. **THE JET DOESN'T BREATHE FIRE.** Arcade trails big orange afterburner cones (the game's
   name); ours has black nozzle rings with small dots. Carried from the gestalt pass.
   (Player-art lane.)
5. **CLIMAXES AND TITLE (polish).** Kill fireballs read small vs the arcade's half-screen
   blasts; the title wordmark is hand-rounded where the arcade's is brush-angular. Lower
   priority than combat feel.

**Kept as positives (do not regress):** the missile lock+salvo mechanism and its geometry
fix; gun kills at the sight with the blind-pilot gain protected; islands/game-over/±60°
attract drama; death starburst→tumble→READY; stage 2 sunset composition.

**Carried interfaces from R12** (`judging/R12/flow-asks.md`): a `gameOver` SFX (audio lane),
and a stage-transition cross-fade on sky/ground `setStage` (world lane) to soften the 1→2
hard cut. **Judge caveat**: the combat p-gate means `demo=2` yields fewer gun explosions by
design — use `?combatexpl=1` for explosion captures and an *aiming* pilot (or play) for
combat gestalt, or combat activity under-reads.

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

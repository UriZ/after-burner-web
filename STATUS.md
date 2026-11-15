# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R15 CLOSED at 8.5; R16 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R15 verdict**: **8.5** (motion 8.5, stills 8.5) — `judging/R15/judge-report.md`. The two oldest
  combat illusion-breakers BOTH closed; the vertical-reach keystone was refuted by measurement.
- **Score trend**: … R12 8.0 → R13 8.2 → R14 8.3 → **R15 8.5**.
- **R15 shipped (judge-confirmed)**: **aiming the gun BEATS the blind stick** (aim 24 vs blind 12,
  both seeds — the complaint open since R10, closed) via the **burst wall** (a wall of jets at gun
  range then a lull, presence NOT inflated); the **missile is human-usable** — climb → lock → dodge
  → fire, held by a **1.2 s lock grace window** + a **UI lock-pip cue**; the **afterburner crisped**
  into separated cones. **ENVELOPE_Y REFUTED** — we over-reach the arcade (climb +0.76 > +0.62);
  do NOT grow it.
- **R15's honest limits (judge)**: the **first** missile lock is hard to find (sight doesn't
  auto-recentre, full climb overshoots the band — the judge flew ~15 empty passes before finding
  "ease up gently, park mid-height"); a FIXED aim posture still loses the gun (needs active
  tracking); blind gun floor still ~8–12 (structural span-scaled net). The grace "18→32" figure was
  **withdrawn** (wrong probe key; correct 34→42, mechanism real).
- **What works end to end**: title → flight → combat → death/respawn → tally → stage 1/2/3/4
  → GAME OVER / continue → restart. Throttle (drives the flame), barrel roll, formations,
  lock/missiles/vulcan (now usable), afterburner, lock cue, synthesized audio + FM music all run.
- **Still absent**: 4 of 23 stages, no resupply/bonus pass, limited enemy variety — **now the
  biggest gap, since combat feel is closed.**

## R16 gap list — from the R15 judge's close-look (`judging/R15/judge-report.md`)

Theme: **BREADTH.** The combat feel is closed (both oldest cracks shut in R15), so the biggest
remaining distance from the arcade is structural — 4 of 23 stages and no resupply/bonus. Ranked:

1. **BREADTH — 4 of 23 stages, no resupply/bonus pass.** Now the single biggest gap. Add stages
   (palettes measured from STAGE_MAP), and/or build the iconic **resupply/refuel interstitial**
   (arcade stages 5 & 13 — fly low over a runway; a whole missing beat of the arcade). Quality over
   quantity — one stage or the resupply, done well and reachable in play. (World + flow lanes.)
2. **THE FIRST MISSILE LOCK IS HARD TO FIND.** The climb→lock→dodge→fire loop works once you know
   the move, but the sight doesn't auto-recentre and a full climb OVERSHOOTS the lockable band
   (+0.76 vs the bait at 0.44–0.58), so the R15 judge flew ~15 empty passes before discovering
   "ease up gently and park mid-height on the approaching wave." Make that first lock discoverable —
   a telegraph/cue when a lockable target is in range, or tune the bait so a natural climb lands on
   it. Do NOT grow ENVELOPE_Y (refuted). (Combat + player/ui.)
3. **POLISH — the stage-4 forest ground.** Reads darker and flatter than the arcade's bright
   mottled canopy with its cyan river. A palette/texture pass (measured off STAGE_MAP stage 4).
   (World lane.)
4. **POLISH — small climaxes, the title.** Kill fireballs read sub-screen vs the arcade's
   half-screen blasts; the title wordmark is hand-rounded where the arcade's is brush-angular.
   (Effects / ui.)
5. **LOOSE ENDS (low priority).** Blind gun floor still ~8–12 (structural span-scaled net — a known
   floor, not a quick fix); locked-vs-tracked bracket COLOUR distinction (deferred R15 — brackets
   are near-white by R10 design, needs a measured pass); the `SIGHT_NDC_Y_OFFSET` +0.30 (vulcan
   convergence) vs ~+0.16 (nose-sight glyph) reconciliation — likely two different elements, measure
   before touching.

**Kept as positives (do not regress):** aiming beats the blind gun; the missile climb-lock-dodge-
fire loop + 1.2 s grace window + pip cue; the burst-wall rhythm (presence not inflated); the crisp
afterburner; blind-pilot protection; four stages; islands; game-over; ±60° attract; the death cycle
at ~8 s (arcade-confirmed). **Do NOT grow `ENVELOPE_Y`** — we already over-reach the arcade.

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX (audio), a stage-transition
cross-fade on sky/ground `setStage` (world). Record R13 lock-bait/flyby, R14 stage 4, R15 burst
wall + lock grace + lock cue as **ADOPTED** in GAME_SPEC §4. **Capture caveat**: the combat p-gate
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

# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R16 CLOSED at 8.6; R17 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R16 verdict**: **8.6** (motion 8.6, stills 8.5) — `judging/R16/judge-report.md`. A fifth beat
  (the refuel runway) and the first missile lock made discoverable; the refuel LOOK is PARTIAL.
- **Score trend**: … R13 8.2 → R14 8.3 → R15 8.5 → **R16 8.6**.
- **R16 shipped (judge-confirmed)**: the **refuel interstitial** — a no-combat low pass over a
  runway (new `resupply` flow state + `runway` ground + STAGE_5) that restocks missiles between
  combat stages, reachable in normal progression (combat 4 → refuel 5 → combat 6) and via
  `?stage=5`/`?stage=13`; the **first missile lock is discoverable** — raising the bait band
  (0.44–0.58 → 0.55–0.65) to where the saturated full climb pins (+0.76) means the **naive climb
  now lands a lock** (3 on the first wave vs R15's ~15 empty passes); **blind protection STRONGER**.
- **R16's honest limits (judge)**: the refuel beat reads as a **road, not the arcade's refuel
  BASE** — no tankers/crew/props, cruise-horizon framing not the terrain-rushing swoop, clouds fill
  the frame, stage 13 shows the wrong biome. The restock is **not caused by the runway** (`_enterStage`
  refills at every boundary — disclosed). "The LOOK is the game's weakest stage match."
- **What works end to end**: title → flight → combat → death/respawn → tally → stages 1/2/3/4 +
  **refuel 5/13** → GAME OVER / continue → restart. Throttle (drives the flame), barrel roll,
  formations, lock/missiles/vulcan (usable, first lock discoverable), afterburner, lock cue,
  synthesized audio + FM music all run.
- **Still absent**: **5 of 23 beats** (4 combat + the runway refuel); the **airborne tanker** refuel
  and the rest of the stages remain — breadth is the standing theme.

## R17 gap list — from the R16 judge's close-look (`judging/R16/judge-report.md`)

Theme: **finish the refuel beat, and keep widening.** The combat feel is closed; the refuel
stage exists but reads as a road. Ranked:

1. **THE REFUEL STAGE IS A ROAD, NOT A BASE.** R16's headline beat is its weakest frame. It needs
   the two signifiers it lacks: the **autumn trees that fill the frame to the top** (the deferred
   low-altitude framing — a cross-lane **camera-pitch** change during `resupply`, coordinated with
   the player-sprite screen placement so the jet doesn't ride into the top HUD or point at the
   ground) and the **ground props** — fuel tankers, tents, crew — beside the runway. Also: **stage
   13** should render its measured palm/sage biome, not the autumn stage-5 runway; and the global
   cloud bank should **lift on the refuel stages** (STAGE_MAP gives them cloud_density 0 — a
   per-stage cloud gate). Until then a player reads "a road." (World + flow; camera pitch is
   cross-lane with player.)
2. **STILL ONLY 5 OF 23 BEATS — THE AIRBORNE TANKER IS UNBUILT.** Breadth is the standing theme and
   the biggest structural distance from the arcade. The runway refuel is one of **two** arcade
   refuel mechanisms; the **airborne tanker** refuel is still absent, and more combat stages widen
   the game. Quality over quantity — the next beat as well-wired as the runway, but WITH the scenery
   the runway lacks. (World + flow.)
3. **THE STAGE-4 FOREST GROUND IS DARK AND FLAT.** Carried from R15, deferred twice. The arcade's
   canopy is brighter and mottled with a cyan river; ours is a near-flat dark green field. Needs the
   **measured V-distribution re-centre** the breadth lane scoped (vegRamp centre 0.45 → modal toward
   `#005200` V0.322, mid the measured V25 0.282 / V75 0.416 band), NOT a by-eye nudge, plus the cyan
   river as a real terrain feature. (World.)
4. **CLIMAXES READ SMALL; THE TITLE IS HAND-ROUNDED.** Kill fireballs are sub-screen vs the arcade's
   half-screen blasts; the title wordmark is hand-rounded where the arcade's is brush-angular. A
   grouped polish pass. (Effects / ui.)
5. **LOOSE ENDS (low priority).** Blind gun floor still ~8–12 kills/90 s (a known structural floor —
   the span-scaled hit net); the resupply restock isn't tied to the runway (fires at every boundary —
   harmless, make the runway the in-fiction cause if a tanker animation lands); the
   `SIGHT_NDC_Y_OFFSET` +0.30 (vulcan) vs ~+0.16 (glyph) reconciliation stays a measure-first item.

**Kept as positives (do not regress):** the first missile lock found by the naive climb (0→3 on the
first wave); blind protection intact/stronger (centred + held = 0 locks); aim-beats-blind gun (24 vs
12); the burst wall; the human-usable missile loop (grace window + legible pips); the crisp
afterburner; the ~8 s death cycle; stages 1–4; the refuel beat's wiring (no-combat, reachable, hands
back automatically). **Do NOT grow `ENVELOPE_Y`** (R15-refuted; the raised bait is the right lever).

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX + a `resupply` landing cue
(audio); a stage-transition cross-fade on sky/ground `setStage` (world); a **per-stage cloud gate**
(clouds) so the refuel stages run clear sky. Record as **ADOPTED** in GAME_SPEC: R16 runway resupply
(§5), the raised first-lock bait + "aim here" hint (§3/§4). **Capture caveat**: the combat p-gate
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

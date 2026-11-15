# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R17 CLOSED at 8.7; R18 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R17 verdict**: **8.7** (motion 8.7, stills 8.7) — `judging/R17/judge-report.md`. A clean
  breadth/polish round; R16's refuel "road" became a refuel BASE, nothing regressed.
- **Score trend**: … R14 8.3 → R15 8.5 → R16 8.6 → **R17 8.7**.
- **R17 shipped (judge-confirmed)**: the **refuel BASE** — low-swoop camera (measured horizon
  **0.20** vs cruise 0.625), ground **props** (fuel tanker/tents/crew beside the runway), and
  **clear sky** (per-stage cloud gate); **combat framing proven BYTE-IDENTICAL** (the low-swoop is
  gated to `resupply` — combat horizon 0.62, resupply 0.20 — verified by isolated-worktree pixel
  diff); **stage 13's own green sage biome** (routed, distinct from stage 5's autumn); the
  **stage-4 forest** brightened to its measured value (mode on #005200) + a **cyan river**.
- **R17's honest limits (judge)**: the refuel base is PARTIAL — the arcade's dense **TREE TUNNEL**
  (autumn on 5, palm on 13, flanking vegetation to the top of frame) is absent, so a player can
  still separate it at a glance; stage 13 has the green biome but no discrete palms.
- **What works end to end**: title → flight → combat → death/respawn → tally → stages 1–4 +
  **refuel 5 (autumn) / 13 (green)** → GAME OVER / continue → restart. Throttle (flame), barrel
  roll, formations, lock/missiles/vulcan (usable, first lock discoverable), afterburner, lock cue,
  the refuel low-swoop, synthesized audio + FM music all run.
- **Still absent**: **~6 of 23 beats**; the **airborne/mid-air TANKER** refuel (the second refuel
  mechanism) and the rest of the stages remain — breadth is the standing theme.

## R18 gap list — from the R17 judge's close-look (`judging/R17/judge-report.md`)

Theme: **finish the refuel look (the tree tunnel), keep widening, start the polish pass.** Ranked:

1. **THE REFUEL RUNWAY NEEDS ITS TREE TUNNEL.** The single biggest tell left: the arcade walls the
   strip with **dense flanking vegetation to the top of the frame** — autumn trees on stage 5, palms
   on stage 13. Ours is flat scrub with props parked at the horizon, so a player separates it at a
   glance. Build the tree tunnel (world-space vegetation lining the runway, rising into the dropped
   frame) — and it fixes stage 13's missing palms in the same stroke. Source the autumn/palm look
   from the arcade refuel frames. (World.)
2. **STILL ~6 OF 23 BEATS — THE AIRBORNE TANKER IS UNBUILT.** Breadth stays the standing theme. The
   runway is one of **two** arcade refuel mechanisms; the **mid-air tanker** refuel is still absent,
   and more combat stages widen the game toward 23. Quality over quantity, well-wired like the runway.
   (World + flow.)
3. **CLIMAXES READ SMALL; THE TITLE IS HAND-ROUNDED.** Rising now the refuel headline is largely
   closed: kill fireballs are sub-screen vs the arcade's half-screen blasts; the title wordmark is
   hand-rounded where the arcade's is brush-angular. A grouped polish pass. (Effects / ui.)
4. **CHEAP WIN: CLOUDS ON COMBAT STAGES 2–4.** STAGE_MAP gives stages 2–4 cloud_density 0 too, but
   the R17 gate lifted only the refuel stages. Extend the gate — CAREFULLY, STATUS/R17 warned not to
   regress 1–4's look; verify each stage's cloud presence against STAGE_MAP before lifting. (World.)
5. **LOOSE ENDS (low priority).** Blind gun floor still ~8–12 (structural span-scaled net); the
   refuel restock isn't caused by the runway (fires at every boundary — harmless); the
   `SIGHT_NDC_Y_OFFSET` +0.30 (vulcan) vs ~+0.16 (glyph) reconciliation stays a measure-first item.

**Kept as positives (do not regress):** the refuel BASE (low-swoop + props + clear sky); **COMBAT
framing byte-identical outside resupply** (the gate is proven — do NOT let the resupply pitch leak
into the fight); stage 13's green biome; the brighter forest + cyan river; every combat win
(aim-beats-blind gun, the missile loop + grace window + pips, the first-lock naive climb, the burst
wall); the ~8 s death cycle; stages 1–4. **Do NOT grow `ENVELOPE_Y`** (R15-refuted).

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX + a `resupply` landing cue
(audio); a stage-transition cross-fade on sky/ground `setStage` (world). Record as **ADOPTED** in
GAME_SPEC: R16 runway resupply (§5), R17 refuel props + low-swoop framing + stage-13 biome + the
cloud gate. **Capture caveat**: the combat p-gate makes `demo=2` under-read gun explosions — use
`?combatexpl=1` and an aiming pilot (or play). **Framing note**: the refuel low-swoop is a
per-frame `flow.state==='resupply'` gate in `game.js` (`RESUPPLY_PITCH`, `ground.setFraming`) — any
new camera work must keep it stateless so combat stays byte-identical.

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

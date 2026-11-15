# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R19 CLOSED at 8.9; R20 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R19 verdict**: **8.9** (motion 8.9, stills 8.9) — `judging/R19/judge-report.md`. Two top R18
  gaps closed in one round, zero regression: the airborne tanker beat works end-to-end; the fireball widened.
- **Score trend**: … R16 8.6 → R17 8.7 → R18 8.8 → **R19 8.9**.
- **R19 shipped (judge-confirmed)**: the **airborne TANKER refuel** — AB2's SECOND refuel mechanism:
  fly up behind a big grey tanker, RELOAD WEAPONS blinks, stock refills, hands back to flight (a new
  ~5.5 s beat, wired into stages 3/9, reachable `?airrefuel=N`); the **kill fireball WIDENED** to
  ~34 %W (toward the arcade's 37.8 %W) as a horizontal debris spray + flanking smoke, NOT taller.
  **Both arcade refuel mechanisms now exist** (runway + tanker). Combat played UNREGRESSED.
- **R19's honest limits (judge)**: the tanker is the right beat with the WRONG AIRFRAME — ours reads
  as a stealth-manta, missing the arcade's vertical tail fin / winged-tanker shape, and the jet hangs in
  a gap below instead of docking to a boom; the fireball still lacks the arcade's **white-hot cores** in
  the flanking puffs; the tree tunnel is still sparse. (Note: R19's lanes finished their code but hit the
  account session limit before reporting — TL verified by look + the judge re-measured; nothing lost.)
- **What works end to end**: title → flight → combat → death/respawn → tally → stages 1–4 + runway
  refuel 5/13 + **airborne tanker (stages 3/9)** → GAME OVER / continue → restart. Throttle (flame),
  barrel roll, formations, lock/missiles/vulcan (usable, first lock discoverable), afterburner, lock cue,
  both refuel beats, synthesized audio + FM music all run.
- **Still absent**: **~5 of 23 beats** — most stages lap the same 4 authored combat biomes. More distinct
  combat stages toward 23 is now the biggest structural distance. Both refuel mechanisms are DONE.

## R20 gap list — from the R19 judge's close-look (`judging/R19/judge-report.md`)

Theme: **breadth is the floor — distinct combat stages.** Both refuel mechanisms exist; the biggest
remaining distance from the arcade is that most stages lap the same 4 authored biomes. Ranked:

1. **BREADTH — ~5 OF 23 BEATS; MOST STAGES LAP 4 PALETTES.** Beyond stages 1-4 the content repeats the
   same four authored combat biomes. **More distinct combat stages / set-pieces toward 23** is now the
   single biggest remaining distance from the arcade. Add authored biomes with measured palettes from
   STAGE_MAP (like R14's forest), wired into the progression. Quality over quantity — one or two done
   well, measured. (World + flow.)
2. **THE TANKER IS THE RIGHT BEAT WITH THE WRONG AIRFRAME.** The composition + RELOAD WEAPONS prompt are
   right, but ours reads as a stealth manta — give it the arcade's **vertical TAIL FIN** and down-swept
   **winged-tanker** shape, and **DOCK the jet** (nose it up to a visible refuel boom instead of hanging
   in a gap below). Reference reference/stage3-reload-tanker-t165.png. (Tanker visual: render/tanker.js +
   the docking pose in game.js/flow.)
3. **DENSIFY THE TREE TUNNEL; MEASURE THE REFUEL SKY.** Carried from R18: ours is a sparser row of blobby
   canopies vs the arcade's dense continuous wall. Secondary: the stage-5 refuel sky reads pale-cream vs
   arcade orange — MEASURE the low-confidence thin band (STAGE_MAP flags it) before tuning. (World.)
4. **FIREBALL — LAST STRETCH: WHITE-HOT CORES.** Width is close now (~34 vs 37.8 %W). The remaining tell
   is the puff INTERIOR: the arcade's spray balls carry white-hot cores; ours are orange-only. Add white
   cores to the flanking puffs — NOT more vertical height (measured fine). (Effects.)
5. **THE TITLE STILL TRAILS (carried).** Sharper after R18 but short of the arcade's italic lean and
   letter packing. A second pass once the bigger gaps are handled. (UI.)

**Kept as positives (do not regress):** both refuel mechanisms — the airborne tanker (enter/refill/
handback, RELOAD WEAPONS, stages 3/9) and the runway tree tunnel + low-swoop + depot props; the wider
fireball (horizontal, not taller); **COMBAT framing byte-identical outside the refuel states** (stateless
`flow.state` gates); every combat win (aim-beats-blind gun, the missile loop + grace window + pips, the
first-lock naive climb, the burst wall); the ~8 s death cycle; stages 1-4. **Do NOT inflate the fireball
vertically** (the R20 fix is white cores, not height); **do NOT grow `ENVELOPE_Y`** (R15-refuted).

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX + `resupply`/`airrefuel` landing
cues (audio). Record as **ADOPTED** in GAME_SPEC: R16-18 runway resupply + tree tunnel, R19 airborne
tanker (§5) + the wider fireball. **Capture caveat**: the combat p-gate makes `demo=2` under-read gun
explosions — use `?combatexpl=1` and an aiming pilot (or play). **Framing note**: both refuel low-swoop
and the tanker are stateless `flow.state` gates in game.js — keep new camera work stateless so combat
stays byte-identical. **Fireball note**: measure scale-matched (the "too small" impression came off
non-scale-matched montages twice).

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

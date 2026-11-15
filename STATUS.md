# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R18 CLOSED at 8.8; R19 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R18 verdict**: **8.8** (motion 8.8, stills 8.9) — `judging/R18/judge-report.md`. The refuel
  tree tunnel landed on both stages; nothing regressed.
- **Score trend**: … R15 8.5 → R16 8.6 → R17 8.7 → **R18 8.8**.
- **R18 shipped (judge-confirmed)**: the **refuel TREE TUNNEL** — dense autumn trees walling
  stage 5, palm trees walling stage 13 (also fixes R17's "no palms" gap) — both refuel stages now
  pass the glance test as the arcade's tree-lined bases; **sharper title letterforms** (chamfered A,
  knife-point terminals); **per-stage clouds** (stage 4 cleared — arcade is clear; stages 2/3 kept —
  they carry banks). A **"fireballs too small" gap REFUTED** by scale-matched measurement.
- **R18's honest limits (judge)**: the tree tunnel is a sparser/blobbier canopy vs the arcade's
  dense continuous wall; the title still trails the arcade's italic lean; and the **fireball is NARROW
  not short** — the judge refined the refutation: ours isn't short (core/height comparable), but the
  arcade blast is **~2× wider** (flat horizontal debris spray), so it reads bigger. Width+debris is a
  real R19 gap.
- **What works end to end**: title → flight → combat → death/respawn → tally → stages 1–4 +
  **refuel 5 (autumn tunnel) / 13 (palm tunnel)** → GAME OVER / continue → restart. Throttle (flame),
  barrel roll, formations, lock/missiles/vulcan (usable, first lock discoverable), afterburner, lock
  cue, the refuel low-swoop + tree tunnel, synthesized audio + FM music all run.
- **Still absent**: **~6 of 23 beats**; the **airborne/mid-air TANKER** refuel (the second refuel
  mechanism) and the rest of the stages remain — breadth is the standing theme.

## R19 gap list — from the R18 judge's close-look (`judging/R18/judge-report.md`)

Theme: **breadth (the airborne tanker) + the climax width.** The refuel runway is substantially
done; the biggest structural distance left is the unbuilt second refuel mechanism. Ranked:

1. **THE AIRBORNE TANKER REFUEL IS UNBUILT.** The runway is only ONE of the arcade's two refuel
   mechanisms; the **mid-air TANKER refuel** (fly up behind a large tanker aircraft to refuel) is
   still absent — a whole missing beat like the runway was. Plus more combat stages toward 23. Still
   ~6 of 23 beats; breadth is the biggest structural gap. Build the tanker beat (a new flow state +
   a tanker aircraft to approach/dock), well-wired like the runway. (World + flow + a tanker visual.)
2. **KILL BLASTS ARE TOO NARROW.** The fireball isn't short (measurement refuted that — ours
   ~24%W ball / 32%H core vs arcade core 15.6%W / 22.8%H, ours taller), BUT the arcade's total blast
   is **~2× WIDER** (37.8%W), a flat horizontal debris spray with flanking smoke, where ours is a
   compact vertical puff. **Widen the blast + add horizontal debris** so climaxes read big. Do NOT
   inflate it vertically (measured fine) — this is a WIDTH + debris change. (Effects.)
3. **DENSIFY / CLEAN THE TREE TUNNEL.** Substantially closed, but ours is a sparser, blobbier canopy
   row vs the arcade's dense continuous wall. More trees, cleaner smaller canopy silhouettes carried
   further up the frame. Secondary: the stage-5 refuel sky reads pale-cream vs arcade orange — MEASURE
   the thin sky band first (STAGE_MAP flags it low-confidence). (World.)
4. **THE TITLE STILL TRAILS THE ARCADE.** Sharper now, but short of the arcade's italic lean and
   letter packing. A second pass if the bigger gaps are handled. (UI.)
5. **LOOSE ENDS (low priority).** Blind gun floor still ~8–12 (structural span-scaled net); the refuel
   restock isn't caused by the runway (fires at every boundary — harmless); the `SIGHT_NDC_Y_OFFSET`
   +0.30 (vulcan) vs ~+0.16 (glyph) reconciliation stays a measure-first item.

**Kept as positives (do not regress):** the refuel tree tunnel (both biomes) + the R17 base
(low-swoop + props + clear sky); **COMBAT framing byte-identical outside resupply**; stage 13's palms;
the brighter forest + cyan river; the per-stage cloud gate; every combat win (aim-beats-blind gun, the
missile loop + grace window + pips, the first-lock naive climb, the burst wall); the ~8 s death cycle;
stages 1–4. **Do NOT grow `ENVELOPE_Y`** (R15-refuted); **do NOT inflate the fireball vertically**
(measured fine — widen it instead).

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX + a `resupply` landing cue
(audio); a stage-transition cross-fade (world). Record as **ADOPTED** in GAME_SPEC: R16 runway
resupply (§5), R17 refuel props + low-swoop + stage-13 biome + cloud gate, R18 tree tunnel. **Capture
caveat**: the combat p-gate makes `demo=2` under-read gun explosions — use `?combatexpl=1` and an
aiming pilot (or play). **Framing note**: the refuel low-swoop is a stateless `flow.state==='resupply'`
gate in `game.js` — keep any new camera work stateless so combat stays byte-identical. **Fireball
note**: measure scale-matched (the "too small" impression came off a non-scale-matched montage twice).

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

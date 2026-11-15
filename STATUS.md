# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R21 CLOSED at 9.1; R22 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R21 verdict**: **9.1** (motion 9.1, stills 9.1) — `judging/R21/judge-report.md`. The canyon landed
  as a full flyable combat biome (combat works inside, byte-identical outside); the title's worst screen matched.
- **Score trend**: … R18 8.8 → R19 8.9 → R20 9.0 → **R21 9.1**. (R1 was 3/10; the R12 method change ended the plateau.)
- **R21 shipped (judge-confirmed)**: the **CANYON** (arcade stage 8) — rock WALL masses + a LOW camera
  dropping between them; **combat WORKS in the canyon** (played: 10 enemies, locks, missile fires,
  hits 0→3, kill fireball — not a scenic pass) and is **BYTE-IDENTICAL OUTSIDE** (stage-1 A/B maxdiff 0,
  stateless canyon-only gate); the **title plate is the upright "II" block** (was a diagonal swoosh,
  still tumbling); the **tanker got a T-tail + down-swept wings** (docking byte-identical); plus a flow
  fix so the canyon's lap-widening doesn't shift stages 14/16 enemy liveries.
- **R21's honest limits (judge)**: the canyon FLOOR is bare (smooth ochre) where the arcade's is a
  battlefield (tanks/trucks/tents wall-to-wall); the tanker T-tail is a thin crossbar vs the arcade's
  bold swept fin; the R20 field biomes (14/16) are still flat. `STAGE_8.scrollSpeed` is ADOPTED (certify it).
- **What works end to end**: title → flight → combat → death/respawn → tally → **7 combat biomes
  (incl. the structured canyon)** + runway refuel 5/13 + airborne tanker 3/9 → GAME OVER / continue →
  restart. All combat systems, both refuel beats, afterburner, lock cue, wider fireball + hot cores, FM music.
- **Still absent**: **~7 of ~23 biomes**; the canyon floor battlefield + giving the flat biomes (14/16)
  real structure are the near-term fidelity items; more measured biomes toward 23 remain the breadth floor.

## R22 gap list — from the R21 judge's close-look (`judging/R21/judge-report.md`)

Theme: **populate the structure — the canyon floor battlefield, then the flat biomes.** The canyon
proved walls + a low camera + props; now fill them. Ranked:

1. **THE CANYON FLOOR IS BARE — PUT THE BATTLEFIELD ON IT.** The arcade stage-8 floor is packed
   wall-to-wall with tanks, trucks, striped tents, rock tufts; ours is smooth ochre with nothing. Reuse
   the runway DEPOT PROP vocabulary (createRunwayProps-style world-space props that already scroll past)
   to populate the canyon floor with ground targets/clutter. Source the look from the arcade stage-8
   frames (ab2-longplay t=344-372). (World.)
2. **GIVE THE FLAT BIOMES THE CANYON'S STRUCTURE TREATMENT.** The R20 field biomes (14 gold-dusk forest,
   16 blue hillside city) are still flat open fields. Now that wall masses + a low camera are proven on
   the canyon, give 14/16 real terrain structure the same way (hills/forest masses; a low camera if the
   arcade frames show one — MEASURE the horizon per biome, keep the gate stateless). (World + a game.js horizon gate.)
3. **FINISH THE TANKER TAIL + WINGS.** The T-tail is a thin crossbar vs the arcade's bold dark swept fin;
   the wings are near-flat vs the arcade's downsweep. Fatten/darken the fin to a bold swept triangle, drop
   the wings to the engine pods. (Tanker: render/tanker.js.)
4. **KEEP WIDENING TOWARD 23.** ~7 of ~23 biomes. More measured biomes/set-pieces after the floor + field
   structure. (World + flow.)
5. **LOOSE ENDS (low priority).** `STAGE_8.scrollSpeed` is ADOPTED — certify with an our-engine canyon
   flow measurement (the #139 120 fps method on a ?stage=7 capture); the tree tunnel is still sparse; the
   blind gun floor ~8-12 (structural span-scaled net).

**Kept as positives (do not regress):** the canyon (walls + low camera + LIVE combat) with **COMBAT
byte-identical outside it (proven maxdiff 0)**; both refuel beats (runway tree tunnel + low-swoop + depot
props, airborne tanker + docking + T-tail); the upright title block (still tumbling); seven combat biomes;
every combat win (aim-beats-blind, the missile loop + grace window + pips + naive-climb first lock, the
burst wall); the wider fireball + hot cores; the ~8 s death cycle. **Keep any new camera work STATELESS**
(the canyon low camera is the standard — prove byte-identical outside); **do NOT grow `ENVELOPE_Y`**.

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX + `resupply`/`airrefuel` landing
cues (audio). Record as **ADOPTED** in GAME_SPEC: all R16-R21 beats (both refuels + tree tunnel + low-swoop
+ docking, STAGE_8 canyon + its low camera, STAGE_14/16 biomes). **Capture caveat**: the combat p-gate
makes `demo=2` under-read gun explosions — use `?combatexpl=1` and an aiming pilot (or play). **Framing
note**: the canyon low camera is a stateless per-stage gate in game.js retracking combat ScreenSpace via
its public hook — any new per-stage camera must follow this (stateless, prove byte-identical outside).

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

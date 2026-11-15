# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R23 CLOSED at 9.3; R24 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R23 verdict**: **9.3** (motion 9.3, stills 9.3) — `judging/R23/judge-report.md`. Both R22 canyon
  breaks fixed (opened/lightened + aiming at parity); tanker airframe finished; zero regression; a criterion retired.
- **Score trend**: … R20 9.0 → R21 9.1 → R22 9.2 → **R23 9.3**.
- **R23 shipped (judge-confirmed)**: the canyon is **OPEN + BRIGHT** (walls to flanks, cream sky across
  the centre 4.3%→19.6%, no near wall swallows the middle); **canyon AIMING FIXED** (a camera roll-axis
  bug had railed the sight to -0.70 off the enemies — now centered, locks at parity: canyon 5 vs stage-1 4);
  the **tanker airframe is finished** (measured swept-wedge wings + the bold fin). **ZERO regression**
  (stage-1 A/B maxdiff 0, roll-axis fix canyon-gated).
- **R23's criterion retirement**: the R22 judge's "drooping/anhedral" tanker-wing wording is **RETIRED** —
  the tanker lane measured the arcade (wingtips sit ABOVE the root by +0.065H, the OPPOSITE of droop) and
  built the correct swept wedge; the judge independently confirmed. The 4th retired criterion of the new era.
- **What works end to end**: title → flight → combat → death/respawn → tally → **7 combat biomes (canyon
  now open + aimable)** + runway refuel 5/13 + airborne tanker 3/9 (finished airframe) → GAME OVER /
  continue → restart. All combat systems (full everywhere now, incl. the canyon), both refuel beats,
  afterburner, lock cue, wider fireball + hot cores, FM music.
- **Still absent**: the canyon needs tall CLIFF walls (reads as open desert w/ rocky hills vs the arcade's
  sheer corridor) + a denser floor; the flat field biomes (14/16) need structure; ~7 of ~23 biomes.

## R24 gap list — from the R23 judge's close-look (`judging/R23/judge-report.md`)

Theme: **finish the canyon (cliffs + density), then give the flat biomes structure.** The canyon is open
and aimable now; the last canyon tells are the wall SHAPE and floor density. Ranked:

1. **GIVE THE CANYON TALL VERTICAL CLIFF WALLS — a corridor, not rocky hills.** It's bright/open now, but
   ours reads as open desert with rocky HILLS along the edges; the arcade boxes a NARROW CORRIDOR with
   SHEER walls rising floor-to-top on both flanks. Raise the flanks into real cliffs — BUT keep the centre
   open (do NOT re-create R22's dark tunnel; the walls stay on the SIDES, tall but not leaning over the
   centre). Reference the arcade stage-8 frames (ab2-longplay t=344-372 — sheer side walls, open bright
   corridor). (World: ground.js canyon wall geometry.)
2. **DENSIFY THE CANYON FLOOR TO WALL-TO-WALL.** Ours is ~1-2 vehicles + scattered scrub vs the arcade's
   ~3 tanks + tents + 15-20 scrub packed wall-to-wall. Raise the prop/scrub counts (combat is aimable over
   it now, so there's room). (World: ground.js canyon props.)
3. **GIVE THE FLAT FIELD BIOMES (14/16) REAL STRUCTURE.** The gold-dusk field (14) and blue water/city (16)
   are still flat open fields. The canyon's wall + low-camera + props pattern is SOUND now — copy it to
   14/16 (MEASURE each biome's horizon/structure from its arcade frames; keep any low camera stateless).
   (World + a game.js horizon gate.)
4. **KEEP WIDENING TOWARD 23.** ~7 of ~23 biomes. More measured biomes/set-pieces after the canyon finish
   + field-biome structure. (World + flow.)
5. **LOOSE ENDS.** The tanker wing up-sweep (0.038H) is shallower than the arcade's measured 0.065H — deepen
   for a full match (render/tanker.js); STAGE_8 scrollSpeed ADOPTED (certify); the tree tunnel is still
   sparse; the blind gun floor ~8-12 (structural span-scaled net).

**Kept as positives (do not regress):** the OPEN canyon + its FIXED aiming (locks at parity) + the floor
battlefield; **COMBAT byte-identical outside the refuel/canyon camera states (proven maxdiff 0)**; both
refuel beats (runway tree tunnel + low-swoop, airborne tanker + docking + the FINISHED airframe); the
upright title block; seven combat biomes; every combat win; the wider fireball + hot cores; the ~8 s death
cycle. **Do NOT re-tunnel the canyon** (walls stay on the flanks, centre open); **keep new camera work
STATELESS** (prove byte-identical outside); **do NOT grow `ENVELOPE_Y`**.

**Retired criteria (do not tune to these):** the tanker-wing "drooping/anhedral downsweep" (R23 — the
arcade's tips sit ABOVE the root; correct target is a deep-root → high-thin-tip swept wedge). Plus the
pre-R12 ledger in REFERENCE.md.

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX + `resupply`/`airrefuel` landing
cues (audio). Record ADOPTED in GAME_SPEC: all R16-R23 beats. **Capture caveat**: the combat p-gate makes
`demo=2` under-read gun explosions — use `?combatexpl=1` and an aiming pilot (or play). **Measurement
note**: telemetry can pass a biome the eyes/hands fail (R22 caught the canyon lock-suppression by PLAYING);
and a criterion can be wrong — check it against the arcade before tuning (R23 retired the anhedral wording).

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

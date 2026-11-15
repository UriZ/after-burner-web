# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R20 CLOSED at 9.0; R21 is open.** (Crossed 9.0.) The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R20 verdict**: **9.0** (motion 9.0, stills 9.0) — `judging/R20/judge-report.md`. CROSSED 9.0.
  Two new biomes + tanker docking + fireball cores, ZERO regression (combat proven byte-identical).
- **Score trend**: … R17 8.7 → R18 8.8 → R19 8.9 → **R20 9.0**. (R1 was 3/10; the method change at R12
  turned a stalled ~8 into steady climbing.)
- **R20 shipped (judge-confirmed)**: **two new measured combat biomes** (STAGE_16 lavender coast,
  STAGE_14 gold-dusk olive — the lap grows 4→6, routed at their arcade numbers); the refuel jet now
  **DOCKS** to the tanker's belly + the tanker got a real fuselage (R19's manta fixed); **white-hot
  cores** in the kill blast's flanking puffs. **Combat proven BYTE-IDENTICAL** to pre-R20 (worktree
  A/B, maxdiff 0 — the new game.js/flow.js/stage.js gates are stateless w.r.t. combat).
- **R20's honest limits (judge)**: every win is "palette/direction right, detail short" — the new
  biomes have matching SKIES but FLAT ground (arcade has dense hillside city / palm forest); the tanker
  airframe is a dorsal hump, still missing the arcade's vertical tail fin + down-swept wings; the title
  lean is in but still a diagonal ball-swoosh vs the arcade's vertical II block.
- **What works end to end**: title → flight → combat → death/respawn → tally → **6 combat biomes** +
  runway refuel 5/13 + airborne tanker 3/9 (docking) → GAME OVER / continue → restart. All combat
  systems, both refuel beats, afterburner, lock cue, wider fireball + hot cores, FM music run.
- **Still absent**: **~6 of ~23 biomes** — the CANYON (arcade stage 8) is the highest-value unbuilt
  biome; more measured biomes toward 23 remain the biggest structural distance.

## R21 gap list — from the R20 judge's close-look (`judging/R20/judge-report.md`)

Theme: **real terrain structure + more biomes.** The game crossed 9.0; every remaining gap is DETAIL,
not absence. Ranked:

1. **NEW BIOMES HAVE THE RIGHT SKY BUT FLAT GROUND — build the CANYON.** The R20 biomes match the
   arcade SKIES but their ground is a flat open field where the arcade has dense hillside city / palm
   forest. The highest-value next move is the **CANYON** (arcade stage 8, cream #faecb0, the strongest
   unbuilt biome): **wall masses** (the stages lane can build the terrain) + a **stateless per-stage
   low horizon from game.js** (the canyon camera sits low between walls — gate it on the stage like the
   refuel low-swoop, keep it stateless so combat stays byte-identical). This is the breadth headline
   AND gives the flat biomes a model for real structure. (Stages lane + a game.js horizon gate.)
2. **KEEP WIDENING TOWARD 23.** ~6 of ~23 biomes. Breadth is still the biggest structural distance;
   the canyon first, then more measured biomes / set-pieces. (World + flow.)
3. **FINISH THE TANKER AIRFRAME.** Docking is done (R20). The airframe still reads as a dorsal hump —
   give it the arcade's vertical **TAIL FIN** + down-swept wings to finish the silhouette. (Tanker: render/tanker.js.)
4. **THE TITLE STILL TRAILS THE ARCADE'S BLOCK WORDMARK.** The italic lean is in, but ours is a
   diagonal ball-swoosh where the arcade's "II" plate is a vertical block — a structural pass, not just
   letterforms. (UI.)
5. **LOOSE ENDS (low priority).** Fireball flanking cores read yellow (white reserved to centre) — fine
   or push whiter; the tree tunnel is still sparse; blind gun floor ~8-12 (structural span-scaled net);
   the `SIGHT_NDC_Y_OFFSET` reconciliation stays a measure-first item.

**Kept as positives (do not regress):** six combat biomes; both refuel beats (runway tree tunnel +
low-swoop + depot props, airborne tanker + docking + RELOAD WEAPONS); **COMBAT byte-identical outside
the refuel/low-horizon states** (stateless `flow.state` gates — PROVEN maxdiff 0); every combat win
(aim-beats-blind gun, the missile loop + grace window + pips + naive-climb first lock, the burst wall);
the wider fireball + hot cores; the ~8 s death cycle. **Do NOT inflate the fireball vertically; do NOT
grow `ENVELOPE_Y`; keep any new camera work (the canyon low horizon) STATELESS** so combat stays
byte-identical (the R17/R20 worktree A/B is the standard to hold).

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX + `resupply`/`airrefuel` landing
cues (audio). Record as **ADOPTED** in GAME_SPEC: all R16-R20 beats (refuel runway + tree tunnel +
low-swoop, airborne tanker + docking, STAGE_14/16 biomes). **Capture caveat**: the combat p-gate makes
`demo=2` under-read gun explosions — use `?combatexpl=1` and an aiming pilot (or play). **Sampling
note**: the fireball's white-hot peak is ~2 ticks — capture `--every 1` to catch transients. **Framing
note**: the refuel low-swoop + tanker docking are stateless `flow.state` gates in game.js; a canyon low
horizon must be the same (gate on stage, stateless) so combat stays byte-identical.

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

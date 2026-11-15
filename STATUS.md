# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R22 CLOSED at 9.2; R23 is open.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

- **R22 verdict**: **9.2** (motion 9.1, stills 9.2) — `judging/R22/judge-report.md`. The canyon floor
  battlefield landed; close play surfaced the canyon's real next problems (dark/tunnel + aiming).
- **Score trend**: … R19 8.9 → R20 9.0 → R21 9.1 → **R22 9.2**.
- **R22 shipped (judge-confirmed)**: the **canyon floor BATTLEFIELD** — tanks, tents, boulders/scrub on
  what was bare ochre (reusing depot props), combat still readable; the **tanker fin bolder/swept** +
  wings dropped (docking byte-identical). **ZERO regression** (stage-1 A/B maxdiff 0; all biomes + both
  refuel beats render).
- **R22's KEY FINDING (pre-existing since R21, surfaced by close play — refutes R21's "canyon combat
  indistinguishable from open")**: the canyon reads as a **DARK TUNNEL** — near wall masses balloon over
  the CENTRE and blot the sky, swallowing jet+enemies in a brown blur (arcade is bright/open); and
  **canyon AIMING is degraded** — identical play gives 6 locks on stage 1 vs 0-1 in the canyon, the sight
  rails ~0.2 NDC off-centre. The low-camera sight retracking broke the canyon's aim/lock geometry. These
  are R23's #1 and #2.
- **What works end to end**: title → flight → combat → death/respawn → tally → **7 combat biomes** +
  runway refuel 5/13 + airborne tanker 3/9 → GAME OVER / continue → restart. All combat systems (full
  elsewhere; lock-suppressed in the canyon), both refuel beats, afterburner, lock cue, wider fireball + hot cores, FM music.
- **Still absent**: the canyon needs OPENING + an aiming fix (headline biome, partially broken in play);
  the flat field biomes (14/16) need structure; ~7 of ~23 biomes.

## R23 gap list — from the R22 judge's close-look (`judging/R22/judge-report.md`)

Theme: **FIX THE CANYON — open it and make it aimable.** Close play revealed the headline biome is
partially broken: too dark/tunnel-like, and you can barely lock in it. That outranks new content. Ranked:

1. **OPEN AND LIGHTEN THE CANYON — it reads as a dark tunnel.** The dominant canyon tell: near-field wall
   masses balloon over the CENTRE and blot out the sky, swallowing the jet + enemies in a brown blur,
   where the arcade is BRIGHT and OPEN (cream sky #faecb0 showing between flanking walls). Pull the walls
   back to the flanks; **CAP how large/close a near wall mass can get** (it must NEVER swallow the centre);
   let the measured cream sky show. Reference the arcade stage-8 frames (ab2-longplay t=344-372 — bright,
   walls to the SIDES). (World: ground.js canyon geometry; possibly the game.js low-camera amount.)
2. **FIX CANYON AIMING — you can barely lock in there.** Identical stick play gives 6 locks on stage 1 vs
   0-1 in the canyon, and the sight rails ~0.2 NDC OFF-CENTRE from the enemy cluster (x≈0). The R21
   low-camera sight retracking (combat.space.base + refresh gated on the canyon) degraded the aim/lock
   geometry. **Trace it** — the headline biome needs the missile loop working like the open stages. Keep
   the fix STATELESS and prove combat still byte-identical OUTSIDE the canyon. (Combat/camera: game.js
   canyon ScreenSpace retracking + weapons if the sight offset is there.)
3. **DENSIFY THE CANYON FLOOR.** Ours is ~1-2 vehicles/frame vs the arcade's ~3 tanks + tents + 15-20
   scrub wall-to-wall. Raise prop/scrub counts (combat readability held in R22, so there's room). (World.)
4. **GIVE THE FLAT FIELD BIOMES (14/16) REAL STRUCTURE** — once the canyon's own issues are fixed so the
   wall+low-camera pattern is sound to copy. (World + a game.js horizon gate.)
5. **LOOSE ENDS.** Tanker wings still near-flat; STAGE_8 scrollSpeed ADOPTED (certify); tree tunnel sparse;
   blind gun floor ~8-12 (structural).

**Kept as positives (do not regress):** the canyon floor battlefield + the structured canyon walls; both
refuel beats (runway tree tunnel + low-swoop + depot props, airborne tanker + docking + bolder fin); the
upright title block; seven combat biomes; **COMBAT byte-identical outside the refuel/canyon camera states
(proven maxdiff 0)**; every combat win on the OPEN stages (aim-beats-blind, the missile loop + grace
window + pips + naive-climb first lock, the burst wall); the wider fireball + hot cores; the ~8 s death
cycle. **Keep new camera work STATELESS** (prove byte-identical outside); **do NOT grow `ENVELOPE_Y`**.

**Carried interfaces** (`judging/R12/flow-asks.md`): a `gameOver` SFX + `resupply`/`airrefuel` landing
cues (audio). Record ADOPTED in GAME_SPEC: all R16-R22 beats. **Capture caveat**: the combat p-gate makes
`demo=2` under-read gun explosions — use `?combatexpl=1` and an aiming pilot (or play). **Framing note**:
the canyon low camera is a stateless per-stage game.js gate retracking combat ScreenSpace — R23's aiming
fix must stay stateless and prove byte-identical outside. **Measurement note**: telemetry can pass a biome
the eyes/hands fail — the R22 judge caught the canyon's lock-suppression by PLAYING it, not by the counter.

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

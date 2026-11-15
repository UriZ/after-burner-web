# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **R26: the GUN is FIXED too — both weapons now usable in naive play. Missiles + gun + sprites all addressed.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

> ## RECALIBRATION WORKED. The owner played the "9.3" build and said "pretty bad" (no usable missiles,
> weak sprites). The judging was RECALIBRATED to anchor on NAIVE play (CLAUDE.md). R25 fixed both
> complaints and a judge playing the SAME naive way scored an honest **6.5** — not the 9.3 the old
> frame-match judge gave the same backdrop. **Naive play then immediately found the NEXT unusable
> weapon: the GUN is dead.** This is the exact failure the old judges missed for 15 rounds by testing
> DELIBERATE play. Play like the owner; the owner outranks the judge.

- **R25 verdict: 6.5** (recalibrated, naive playtest) — `judging/R25/judge-report.md`,
  `playtest-verdict.md`. Off the ~5 floor; "solid and playable with clear rough edges."
- **R25 shipped (judge-confirmed by naive play)**: **MISSILES USABLE** — point at enemies, press,
  heat-seekers chase them down (~70% naive hit, up from 0 fired; camp-to-lock barrier ripped out +
  seeker strengthened: HIT_RADIUS 0.026→0.052, MAX_TURN 0.77→1.7, HOMING_DELAY 0.3→0.12, GAIN 1.7→2.8).
  **SPRITES GOOD ENOUGH** — the player jet was an INSECT FACE (nozzles=eyes, fins=ears), redrawn to a
  real F-14 (fuselage, canted tails, engine deck); enemy MiGs crisped to swept-wing jets. Palettes kept.
- **R26 gun FIX (done, TL)**: the dead gun now KILLS in naive play (HITS 0->5 in ~3s holding fire;
  combined with missiles, a fresh seed gave 8 kills in ~4s). Loosened the R11-R15 gates the same way as
  the R25 missile: GUN_KILL_SPAN_FRAC 0.14->0.03, VULCAN_MIN_HIT_P 0.8->0.15, HIT_RADIUS_SPAN_MULT 0.5->1.2
  + floor 0.05, depthTol widened. It kills what's in your line (5 of 8), not the whole screen. BOTH core
  weapons work now -- the owner's "pretty bad" core is materially fixed.
- **R25's new #1 finding (naive play)**: **THE GUN IS DEAD** — mashing the fire button kills NOTHING
  (0 hits/~11 turns vs 2-10 enemies, both seeds). The R11-R15 gun gated kills behind precise aim/depth
  (the p-gate VULCAN_MIN_HIT_P, readable-span) that a naive player never meets — the SAME disease the
  missile had. Needs the same fix: point-and-hold must kill (generous on-screen hit at the reticle).
- **Honest build state: ~6.5/10.** Core weapons: missile FIXED, gun DEAD. Sprites good. Backdrop
  fidelity is high (7 biomes, both refuel beats, structured canyon) but does NOT lift the score — play does.

## R26 gap list — from the R25 recalibrated judge (naive play), owner-anchored

Theme: **make the weapons work in the hands.** The missile is fixed; the gun is the mirror image of
the bug just fixed. Ranked by naive-play impact:

1. **THE GUN IS DEAD — FIX IT LIKE THE MISSILE (the round's #1).** A naive player mashing the fire
   button (the obvious first weapon) kills nothing — 0 hits in ~11 turns. The gun's kill is gated behind
   precise aim + depth (combat.js p-gate `VULCAN_MIN_HIT_P`, readable-span, the round's depth ramp) that
   normal play never satisfies. **Make point-and-hold kill:** a generous on-screen hit at/near the
   reticle for any enemy roughly ahead, like the R25 missile fix. ACCEPTANCE by NAIVE play: fly at
   enemies, hold the gun, kill them — a clear kills-per-second, every engagement, multiple seeds.
   (Combat lane — vulcan.js/combat.js.)
2. **RE-TUNE THE MISSILE ONCE THE GUN WORKS.** The missile may be slightly too strong/easy now
   (point-roughly clears a wave). Once the gun kills, re-balance so both have a role — gun for the
   stream, missiles for lock-and-salvo. Don't re-cripple the missile; just give the gun its job back.
3. **SPRITE COLOUR BALANCE (polish).** Shapes are good; the palette leans too red — pull the player off
   heavy red toward the arcade grey-white F-14; calm the enemy hot-red cockpit. A colour pass, not a redraw.

Deferred (backdrop, already ahead of the gameplay): flat field biomes' structure, canyon cliff/density,
more stages. Do NOT add content — fix the weapons first.

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

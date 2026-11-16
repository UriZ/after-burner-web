# STATUS — where the rebuild stands

**Last updated**: 2026-11-16. **R31: six owner play-feedback fixes shipped — barrel roll rolls the HORIZON, afterburner tracks the nozzles (full-follow), enemy insect-face killed, lock is clear+earned, sea has banded waves, FM-rock music. All pushed. Next: R32 judge.** The loop is **"look first, measure second"** (CLAUDE.md, "How work
AND readable, ENEMY FIRE now reads as a bright dodgeable stream (the AB2 core loop), afterburner
attached, grey jet, twin-engine enemies, arcade barrel roll, clean explosions, jet no longer "on
fire". Three false gaps caught by measurement (enemies-too-small, white-ball-is-a-cloud,
cloud-too-opaque). Honest 7/10, climbing.** The loop is **"look first, measure second"** (CLAUDE.md, "How work
happens here"; rationale in `judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`). Pre-R12 STATUS is archived at
`judging/archive/STATUS-through-R11.md`. Repo: github.com/UriZ/after-burner-web.

## Current state

> ## THE OWNER IS DRIVING THE GAPS BY PLAYING. R25/26 fixed both weapons (missile + gun usable). The
> owner then played and named, in order: afterburner detached from the jet, missiles "not firing" (my
> own lock change had overshot), jet "too red", enemies "too pixelated", and "add the barrel roll."
> Every one was a real gap; every one is now fixed or has a lane. Play like the owner; the owner
> outranks the judge. Standing rule: never idle — always be improving a gap (CLAUDE.md / memory).

- **R27 landed (owner-driven, all verified + pushed):**
  - **Afterburner re-attached.** R15 tuned the flame to the old insect-face sheet; the R25 F-14 redraw
    moved the nozzles, so the plume flung off on banks/rolls. Now follows 0.4× the bank + a shortened
    stub (base 0.5→0.34) that can't visibly separate in any pose.
  - **Missile lock EARNED, then made usable.** First pass over-tightened (0.40 s + 0.18 cone + hard
    reset) and the owner saw NO missiles on a hand-flown stick. Fixed: 0.25 s acquire, 0.26 cone, and
    the acquire DECAYS on a waver instead of resetting. Verified with a wavering-pilot probe (13
    missiles/18 s across jitter). Still earned (aim + hold a beat); gun needs no lock.
  - **Jet reads grey-white, not maroon.** The R26 colour item: `#840000` was on every surface
    (wings/deck/strakes/fins); the MEASURED red is the OUTLINE only (palettes.js R7). Moved all
    interior red to the measured grey shadow tone; red kept on the outline rim. Verified vs the stage-1
    arcade grey jet.
  - **Enemy jets twin-engine.** Owner's "too pixelated": ours was a grey dart + one dot; the arcade is
    two black nacelles cored by orange afterburner. Redrew nozzle()/noseIntake() in enemy-mig.js — twin
    bells, scale-proof; reads as a jet at game size now.
  - **Barrel roll = arcade double-tap.** The roll existed but triggered on a sign CHANGE (left-then-
    right); AB2 is a double-tap the SAME way (right-right / left-left). Rewrote the detector to rising-
    edge same-sign flicks; holding is still a bank. Verified.
- **Measurement correction (binding):** the R27 judge's "enemies are 3× too small" is WRONG. The
  enemy-presence lane MEASURED it and WITHDREW: our close enemies hit 18–35 %W vs the arcade's ~19.5 %W
  peak; time-at-readable-large is comparable (ours 33 % vs arcade ~35–45 %). Do NOT bump enemy width.
  (Lane's note: the arcade's density comes from the PLAYER killing close enemies, not the spawner
  holding them close — our demo pilot barely engages, a demo-AI/feel issue, not a spawner one.)
- **R28 shipped (TL + effects lane):** GUN HIT-FLASH (a connecting round flashes the struck enemy +
  spark; the fix is in combat.js `_damage` BEFORE the early return so non-fatal hits read); BOLD GUN
  ROUND-STREAM (puffs +25% so the orange column reads in busy combat — judge saw "nothing leaves the
  jet"); EXPLOSION DE-CONFETTIED (debris was flung ~4× the fireball radius as red squares across the
  whole sky → now short radial spikes hugging the fireball, warm orange/amber; measured fireball
  palette untouched). The "giant white smoke ball" the judge flagged is NOT kill smoke — it's a
  stage-1 CLOUD (render/clouds.js), on screen before any kill; routed to a World look (R29).
- **Honest build state: ~7/10** (R28 fresh-context judge, naive play). Both weapons usable AND now
  read (stream + hit-flash); jet + enemies are real aircraft; afterburner + roll + explosions fixed.

## R29 shipped (TL + enemy-fire lane) — the R29 fresh-judge gaps, resolved

1. **ENEMY FIRE NOW READS AS A DODGEABLE STREAM (judge #1, DONE).** Rounds were small dark-red specks
   lost in clutter; now bigger hot gold/white-cored fireballs (dark-red rim shrunk to a thin ring, gold
   core ~2.7× area, +near-white pip; sizes still inside the arcade's measured round-width envelope) +
   bigger telegraph. Reads as a bright stream descending on the player. **Fairness byte-identical**
   (deathsPerMin 0.417→0.417 across 4 seeds) — a PERCEPTION fix, not a difficulty one.
2. **JET NO LONGER "ON FIRE" + GUN STREAM TRAVELS (judge #2, DONE).** Muzzle flash 0.03→0.02 so the
   grey airframe shows through; gun near-puff 0.020→0.017 so the column reads as rounds travelling to
   the target, not a burst piled at the nose.
3. **CLOUD — FALSE GAP (measured).** Arcade stage-1 cloud is itself a big near-white opaque mass
   (bright mean #f5f2f6, 94% bright); our palette already matches. No change — third false gap caught.

## R30 shipped + resolved — fresh judge 7.5/10 (up from 7)

1. **EXPLOSION DEBRIS NOW HUGS THE FIREBALL (judge #1, DONE).** R28 de-confettied the spread; R30 the
   decay still flung CHUNKY SQUARES ~40%W into blue. Pulled breakup reach in (0.33→0.26 / 0.38→0.29)
   and shrank flecks to sparks — the fireball's own spikes carry the radiating look. Compact now.
2. **DODGE DENSITY — FALSE GAP (4th caught by measurement).** The judge read combat as "one round at a
   time, not a hail." Measured the arcade (longplay stage 4, t212/218/225): arcade enemy FIRE is also
   sparse (a few rounds) — its busyness comes from 3-4 ENEMIES on screen at once (which we have), NOT a
   bullet-hail. Our fire density is arcade-faithful; readability (the real issue) is already fixed. Do
   NOT raise fire volume into an un-arcade hail.
3. **HARD-BANK AFTERBURNER (minor polish).** In aggressive banks the plume fans a bit wide on the
   belly; partially arcade-faithful (the arcade jet also shows an afterburner cone). Low priority.

## Build state: strong 7.5/10, approaching 8. Every real gap across R27-R30 addressed; FOUR false gaps
caught by measurement (enemies-too-small, white-ball-is-a-cloud, cloud-opacity, dodge-density). The
remaining frontier is FEEL-in-the-hands (dodge/roll/weapon feel), which captures can't settle — the
judge itself concludes the highest-value next input is OWNER HANDS-ON PLAY.

## Older R30 candidate (superseded by the measurement above)

- **EXPLOSION MORE DRAMATIC?** vs reference/ab2-arcade-huge-explosion.jpg ours is smaller — BUT that jpg
  is a HUGE/special explosion, not a standard kill; our standard fireball is measured (PEAK_FRAC 96px),
  and R30 tightened the debris. Leave unless a STANDARD arcade kill measures bigger. (effects/explosions.js.)
- **DEMO ENGAGEMENT — DEFERRED, needs arcade evidence first.** The demo pilot kills sparingly, but
   demoTimeline.js is MEASURED to the arcade attract's motion; before rewriting it to aim+fire, measure
   the arcade attract's actual kill rate — if the arcade attract is also sparse, ours is correct.

Deferred (backdrop is ahead of the play): more stages, canyon density. Do NOT add content — the FEEL
of the core loop (enemy fire / dodging) is the frontier now.

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

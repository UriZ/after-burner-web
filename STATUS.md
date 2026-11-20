# STATUS — where the rebuild stands

**Last updated**: 2026-11-20 (R38 closed). **R38 SHIPPED (all four lanes committed; gate green:
fairness pooled 1.333 = R37 baseline exactly, 0 unannounced every seed, hands-off 0.17× aimed).**
Playtest-seeded round (opened 7/10: "the missiles actually work now … that loop is satisfying").
Shipped: **kills no longer bury the jet** (victim-sized eruptions ballooning past camera — the
fireball was a fixed 30 %W screen fraction parked at a world point; jet coverage 84 %→~0, sim
provably unchanged); **the killing round STROBES** on every background (its pale body was measured
on night footage and camouflaged against day skies; all 7 playtest deaths were "announced" — the
failure was contrast); **dying costs lives again** (the continue coin was LEVEL-triggered — a fire
button still held from combat bought a continue on the first tick; arcade rule read off the lives
icons: no refill exists; rising-edge latch shipped); **the sky stays alive** (crossing patterns ran
at HALF rate for 10 rounds = "parked wingmen"; dead-sky clip now keys on VISIBLE emptiness; max
empty gap 6.5→2.2 s vs arcade ~1.5–2 s; close presence 0.096→0.178 nominal — dented, not closed).
One lead debunked, not fixed: "plane pops up full-size as I die" was the playtest's 1 s panel
cadence (on screen 60+ ticks, tick-exact replay).
**Close-presence figures SUPERSEDED R40** — the real arcade band is **0.30–0.40** (D1, drawn
width, pinned pilot), not 0.40–0.70; the old number came from a scalar "spanFrac ≈ 2× drawn
width" conversion that is pose-specific (2× only near ±57°, 1.06× near level). The arcade also
goes **totally empty 10–11.5 s between waves** — R38's "~1.5–2 s" measured the HUD radar scope,
so `DEAD_SKY_MAX_S = 1.5` is tuned to a mis-measurement. Full spec, bands D1–D10, arrival mix
and acceptance test: `judging/R40/density-truth/NOTES.md`. The headline target is **D4 "specks
only" ≤ 0.15** — D1 alone can be gamed by spawning distant traffic.

**Open for R39 (superseded numbers, kept for history):** close presence by DRAWN width (~0.09 vs arcade 0.40–0.70) — arrival-pipeline
redesign (side-entry mid-large arrivals in the ordinary rhythm; the relief pair proves the
mechanism); far-bin kills (locks form at mid depth); attract-demo aiming (R30-deferred); smoke
velocity option for ballooning mid-kill residue; owner ear-check still pending.

Previous: **R37 SHIPPED (all committed): owner-driven round, six lanes.**
Headlines: **aiming matters now** (hands-off play 0.62×→0.33× of aimed, zero free locks — lock
acquisition requires steering, hit disc 1.2→0.5 span-mult, scripted demos exempt); **the enemy has
ONE nozzle** (R27's twin-nacelle read REVERSED — it misread the player's F-14; the twin glows WERE
the owner's recurring "insect face"; 9-pose ladder with true oblique quarter views); **the music
never actually played** (R35's offline render takes 200+ s/variant on this machine and pinned a
core — now a live scheduler, same mix verified, starts 0.31 s after the start press, variants
switch per stage); **startup was the dev server** (74k watched files; chokidar ignores → first
frame 8.7→1.9 s; press-to-flying measured 3× FASTER than the arcade, closed in band);
incoming fire redrawn (arcade red-cap oval) + full-approach whistle/roar; missile trail is the
arcade's scalloped billow; Space/Enter start the game. **Gate (quiet tree): deaths/min 1.33
pooled (shift = hit disc repricing the unaimed DEMO pilot; player-posture deaths unchanged),
0 unannounced fatal hits every seed, warning floor 1.167 s.**
**R37 corrections ledger:** the "R32 published 0.33–0.40 presence" figure was a comment citing a
sweep that never ran (real R32 figure 0.12–0.24; today ~0.07 vs arcade 0.40–0.70 on a stricter
operator — old, real, open gap; fix lane = enemies ARRIVING large). The never-kill tab crash was
environmental (overloaded machine), refuted on the quiet tree.
**Open for R38:** far-bin kills still 3–5% vs arcade ~22% (locks FORM at mid depth — it's
lock-formation depth, not missile speed; measured at gate); attract demo now kills almost nothing
(its kills were free-disc kills — fix is the R30-deferred "demo aims its fire windows", NOT a
demo-only hit radius); close-presence vs arcade (arrival size/cadence); owner ear-check of the
now-actually-playing audio.

Previous state (R35/R36):** R35 fresh judge: 8/10 — both weapons verifiably work, full arcade
loop present, reads as AB2 at native scale.** Recent rounds were OWNER-DRIVEN: **R34** baked the afterburner into the sprite (4th
detach report → structural fix), made the barrel roll a RIGID whole-view roll, strengthened
heat-seeking + aiming, punchy weapon SFX + driving music, enemy-fire whistle, MEAT PROXY branding,
GitHub Pages deploy. **R35** (all owner asks): afterburner flame REMOVED entirely (owner: "it's
horrible" — do NOT re-add it, even though the arcade shows one; owner outranks), missiles got a real
engine flame, snappier world roll + lateral dash, jet cool grey-white + slimmer enemies, music starts
reliably at stage 1 + four per-stage variants (stage 1 = the exact owner-approved track).
**R35 judge's leftover gaps:** #1 (bigger afterburner plume) is DEAD — owner removed the flame after
that verdict. #2 (jet outline too dark/red) addressed by the R35 grey-white redraw. #3 (gun tracer
faint) looks minor in 60 Hz evidence (`judging/R36/look/gun-burst60`) — pending the R36 playtest's
word. The loop is **"look first, measure second"**
(CLAUDE.md, "How work happens here"; rationale in `judging/R12/method-retrospective.md`). Every round ships an HTML report
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
  - **Enemy jets twin-engine. [REVERSED R37 — this was a misread of the PLAYER F-14. The arcade
    ENEMY has ONE nozzle (single black bell, orange core, green wing camo), confirmed in every
    readable pose of the 60 Hz stage-1 footage (judging/R37/enemy-art/arcade-poses/). The twin
    side-by-side glows this shipped WERE the owner's recurring "insect face". The identity rule
    ("every enemy has one nozzle", Hard warnings below) was right all along.]** Original text:
    Owner's "too pixelated": ours was a grey dart + one dot; the arcade is
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

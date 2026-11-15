# STATUS — where the rebuild stands

**Last updated**: 2026-11-15. **OWNER PLAYED IT: "pretty bad." JUDGING RECALIBRATED; real build ~5/10.** The loop is
**"look first, measure second"** (CLAUDE.md, "How work happens here"; rationale in
`judging/R12/method-retrospective.md`). Every round ships an HTML report
(`judging/R<n>/report.html`, `python3 tools/round_report.py`) published to the standing
dashboard artifact. Pre-R12 STATUS is archived at `judging/archive/STATUS-through-R11.md`.
Repo: github.com/UriZ/after-burner-web.

## Current state

> ## THE OWNER PLAYED THE 9.3 BUILD AND IT IS "PRETTY BAD." The judges drifted back into R12's
> original failure — scoring element-by-element arcade fidelity (biomes, tanker, canyon match the
> frames) up to 9.3 while the game is bad to PLAY. **Owner verdict (ground truth, outranks every
> judge):** *"no missiles, no heat-seeking missiles; the UI/sprites — both my jet and the enemies —
> are not good enough; overall pretty bad."*
>
> **Confirmed by naive play (TL):** flying at enemies and pressing the missile button like a normal
> player fires NOTHING — 0 locks, 0 missiles, over and over. The missile code exists (it's even a
> heat-seeker) but is only fireable with an obscure insider move (climb to a specific NDC band, camp,
> hold, release). **From a player's seat there are no missiles.** The R12-R16 lock-band machinery made
> AB2's signature point-and-shoot weapon HARDER than the arcade, and every judge passed it by testing
> DELIBERATE play, never naive play.
>
> **JUDGING RECALIBRATED (CLAUDE.md, binding):** the score is anchored on a full NAIVE playtest (play
> like a first-timer, no insider moves); weapons-usable + controls-feel + sprite/UI quality are scored
> dimensions ABOVE backdrop fidelity; re-baselined so 9-10 = genuinely good to play, 5-6 = "pretty bad
> but real content" = **where this build actually is.** Element fidelity cannot lift the score above how
> the game plays.

- **Real build state: ~5/10** (owner's measure). The prior 8.0→9.3 trend measured backdrop/beat
  FIDELITY, which is genuinely high (7 biomes, both refuel beats, a structured canyon, matched
  airframes) — but the CORE PLAY is weak: the missile is unusable, the sprites (player jet + enemies)
  are not good enough. **Fidelity of parts ≠ a good game.**
- **R24 judge (running when the owner's verdict arrived) used the OLD calibration — its score is
  SUPERSEDED.** Its canyon/tanker findings (element fidelity) still stand as evidence; its number does not.

## R25 gap list — RECALIBRATION ROUND, from the owner's playtest (authoritative)

Theme: **make the core game good to PLAY.** Backdrop fidelity is ahead of the gameplay; stop widening
and fix what the player's hands and eyes touch. Ranked by the owner's own words:

1. **MISSILES DO NOT WORK FOR A PLAYER — make them arcade-simple point-and-shoot heat-seekers.** AB2's
   missile is its signature: you point the reticle at an enemy (or several), press the missile button,
   it LOCKS what's under/near the reticle and fires HOMING missiles that chase them down. Ours requires
   camping a lock band — a normal player fires none. **Rip out the camp-to-lock barrier:** pressing the
   missile button should lock the enemies the reticle is on (or near, within a generous on-screen radius)
   and fire heat-seekers that reliably home and hit. Keep the salvo/multi-lock feel. ACCEPTANCE: a naive
   player flying at enemies and pressing X gets locks and kills within seconds, every engagement — verify
   by NAIVE play, not band-camping. (Combat lane — weapons/lockSystem/missiles; this is the round's #1.)
2. **THE SPRITES AREN'T GOOD ENOUGH — the player jet AND the enemies.** The owner singled out both.
   Re-judge the player F-14 and the enemy aircraft sprites against the arcade's with fresh, critical eyes
   (the arcade sprites are crisp, readable, characterful; ours read flat/toylike). This is an ART-QUALITY
   pass, not a palette-number pass — make them look good and arcade-faithful. (Player-art + enemy-art lanes.)
3. **THEN re-judge the whole feel at naive play** — once missiles work and sprites improve, does it feel
   like AB2 in the hands? The recalibrated judge plays naively and scores the PLAY, not the frames.

Deferred until the core plays well: the flat field biomes' structure, more stages toward 23, canyon floor
density — all backdrop, all ahead of the gameplay already. Do NOT add content this round; fix the core.

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

# STATUS — where the rebuild stands

**Last updated**: 2026-11-14. **R12 is open, and it opens with a method change.**
Read `judging/R12/method-retrospective.md` — eleven rounds plateaued at ~8/10 while the
owner's play verdict was "it's very bad". The loop is now **"look first, measure second"**
(CLAUDE.md, "How work happens here"). The full historical STATUS — every ledger box,
withdrawal and binding rule through R11 — is archived verbatim at
`judging/archive/STATUS-through-R11.md`. It is reference material, not required reading.

## Current state

- **Last completed verdict**: R11, **8/10** (motion 7.5, stills 8.5) — `judging/R11/judge-report.md`.
  Tree judged `fd833f6`; everything since is committed, `src/` is clean.
- **Score trend**: R1 3 → R5 7.5 → R8 8.5 → R9 7 (trend line retired) → R10 7.5 → R11 8.
  Net +0.5 in six rounds — the plateau that triggered the method change.
- **What works end to end**: title → flight → combat → death/respawn → tally → stage 1/2/3
  progression → continue → restart. Throttle, barrel roll, formations, lock/missiles/vulcan,
  synthesized audio + FM music all exist and run.
- **The build has 3 of the arcade's 23 stages, no resupply/bonus pass, limited enemy
  variety.** Under the new method, absent systems outrank constant tuning.

## R12 gap list — from the first gestalt pass (`judging/R12/gestalt-review.md`)

The side-by-side look is done; evidence sheets in `judging/R12/gestalt/`. **Owner playtest
still owed and outranks this list.** Ranked by what breaks the illusion at one glance:

1. **Stage 1 has no land.** The arcade flies past island coastlines (vegetation, rock
   crags, surf, a floating rock); ours is uniform open sea. Missing system, unbuilt since
   it was rank 11 of 11 in R5. (`pair2-island.png`)
2. **Nothing dramatic ever happens to the camera.** All 24 of our flight frames across two
   modes: near-level horizon at the same height. The arcade rolls past 60° and the horizon
   height swings wildly inside one 30 s span. The renderer has the roll; nothing drives it.
3. **The gun does not need the player** (R11 rank 1, owner's complaint; invisible in
   stills). Blind share 91 %. NOT a cone problem — fix `vulcan.js`'s round depth path so
   kills resolve inside the sight's ±9.85 %W reach (today p90 14.6 %W).
4. **The sky has no furniture, climaxes are small.** Arcade clouds are screen-filling
   banks; its kill fireballs fill half the frame. Ours: cotton puffs, local events.
5. **The jet doesn't breathe fire.** Arcade nozzles trail big orange flame cones (the
   game's name); ours are black rings with dots. Plus the heavy red outline reads toy-like.
6. **Enemies never fly past your face.** Even quiet arcade frames hold a ~25 %W enemy
   banking away with streaks; ours stay bracket-dot sized. The flyby EVENT is missing —
   choreography, not the (already-correct) size distribution.
7. **Title letterforms** are hand-wobbly vs the brush-angular arcade wordmark; plate
   aspect square vs tall. First screen anyone sees. (`pair5-title.png`)

Carried, serving the above: the missile (untouched since R10; launch→impact needs the
no-gun-fire longplay window), the lock radius (PROTOTYPE-ADOPTED, boundable from R10's
blind detector), attract stationary runs (6.7 s vs ~0.08 s), the vertical axis (no arcade
column; two frames show the arcade sight BELOW the airframe).

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

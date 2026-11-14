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

## R12 gap list

Seeded from R11's judge report §5 pending the first side-by-side gestalt pass and an owner
playtest, which may reorder or replace it:

1. **The gun does not need the player** — blind-stick share 91 % of a tracking pilot's
   kills. NOT a cone-width problem (measured null lever): `vulcan.js` ramps unassisted
   rounds to depth 55 so kills resolve at the muzzle; fix *where along the path a kill may
   resolve*. Target: gun kills resolve inside the sight's ±9.85 %W reach (today p90 14.6 %W).
2. **Missing-system backlog opens** (new method, rank raised): more stages / stage variety,
   resupply pass, enemy attack patterns beyond the current set. The full 23-stage structure
   is the single most player-visible absence.
3. **The missile** — untouched since R10. `HOMING_GAIN` ASSUMED, launch→impact a CANDIDATE
   0.43–0.90 s band. The unblocking acquisition: a longplay window with no gun fire
   (targeted search, not a fourth operator).
4. **The lock radius is anchored on nothing** — `LOCK_RADIUS_FRAC = 0.083` is
   PROTOTYPE-ADOPTED. R10's blind detector (bracket 5.246 %W, n = 75) over an acquisition
   window would bound it from the arcade.
5. **Attract mode** — median stationary run 6.7 s vs the arcade's ~0.08 s; 6–8 of 10
   authored barrel rolls are lost to deaths with deaths on. It is what a passer-by sees.
6. **Vertical axis has no arcade column** — and two frames show the arcade sight BELOW the
   airframe where ours is +0.30 NDC above. The lateral-axis detector would settle it.

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

- **Playtest: 2 minutes, five sentences**, once per round or two. Those sentences outrank
  any scalar in gap ranking.
- `git push` only with your explicit approval (unchanged).

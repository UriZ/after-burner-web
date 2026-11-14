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

## R12 gap list — gestalt pass + agent playtest, merged

Two instruments ran: the side-by-side look (`judging/R12/gestalt-review.md`, sheets in
`gestalt/`) and the **agent playtest** (`judging/R12/playtest-verdict.md`, 90 turns /
3.03 sim-min / seeds 7+11, evidence in `playtest-evidence/`). The playtest reordered the
list: **playing surfaced two things stills and six rounds of probes missed** — the missile
is unreachable by a player, and the game has no stakes. Ranked by what most breaks the
"is this After Burner II?" experience:

1. **THE MISSILE IS UNREACHABLE BY A PLAYER — likely a real bug, not un-tuning.** The
   playtest agent got **zero locks in 3 minutes**; the TL then tried deliberately (dive the
   sight onto a 6-enemy cluster at 26 %W span, missile held ~250 ticks) and still got
   **locks 0, stock frozen at 50, zero missiles fired.** The scripted `demo=2` fires salvos,
   so the mechanism exists — but the live lockable window (within `LOCK_RADIUS_FRAC` 0.083 of
   the aim point AND in depth band [26,88] for `LOCK_ACQUIRE_S` 0.22 s) is essentially never
   hit under a caged sight. Half of AB2's verbs (lock, salvo, smoke trails) are absent as
   played. **Combat lane: diagnose why acquisition never fires in live play before any
   tuning.** (`playtest-evidence/seed11ctrl-t20-missile-dead-final.png`)
2. **KILLS HAPPEN TO THE PLAYER, NOT BY THE PLAYER** (R11 rank 1, confirmed from the
   cockpit). Enemies jump horizon-dot → wingtip with no mid-range gunnery window; the vulcan
   tracer is a few faint dots so trigger→fireball causality is invisible. Aiming control
   (seed 11, 60 s each): **best-effort 11 kills / stick-centered-fire-held 8 kills** — aiming
   roughly halved deaths but no-input still collects ~73 % of the kills. Two fixes, both
   measured as owed: (a) `vulcan.js` ramps unassisted rounds to depth 55 so they resolve at
   the muzzle — fix *where along the path* a kill resolves (R11 §2.1); (b) fatten the tracer
   so the player can see they are shooting.
3. **THE SIGHT IS CAGED TO ±0.2 SCREEN around the nose** — mid-screen targets cannot be
   aimed at without banking the whole plane. **TENSION, resolve carefully:** R11 verified the
   ±9.85 %W envelope MATCHES the arcade, so "uncage it" moves AWAY from the arcade. The felt
   problem is really gap 2 — if mid-range gunnery worked, the caged sight would read as
   arcade-authentic, not as a limitation. Do NOT widen `ENVELOPE_X` without re-checking the
   arcade. (gestalt gap had this as the roll-nobody-drives; playtest sharpened it.)
4. **STAGE 1 HAS NO LAND.** Arcade flies past island coastlines (vegetation, rock crags,
   surf, a floating rock); ours is uniform open sea. Missing system, rank 11-of-11 in R5,
   unbuilt six rounds. (`gestalt/pair2-island.png`)
5. **NO STAKES.** Score climbs from tick 0 with zero hits, and running out of lives silently
   refills to 3 — no game-over. The death cycle (~7 s) runs long vs arcade (~4 s), and
   stage 1→2 is a single-frame full-palette hard cut. Nothing the player does feels like it
   matters. (Flow lane.)
6. **NOTHING DRAMATIC DRIVES THE CAMERA in ordinary play.** The renderer rolls hard on a
   stick-slam (playtest confirms it's genuinely dramatic) — but cruising and the scripted
   pilots never use it, so the baseline reads near-level where the arcade's horizon swings
   wildly. Drive the roll/vertical envelope in demo + pacing.
7. **DEAD-SKY LULLS** of 10+ s with no enemies, vs the arcade's something-crossing-every-
   second. Enemies also never fly past at large scale (the flyby EVENT is missing —
   choreography, not the already-correct size distribution). Title letterforms + plate
   aspect are a small, separate item (`gestalt/pair5-title.png`).

**Kept as positives (do not regress):** stick-slam barrel roll and sustained bank are
dramatic; death starburst→tumble→READY reads arcade-true; stage 2 sunset desert composition
is excellent; deaths felt fair.

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

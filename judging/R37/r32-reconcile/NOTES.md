# R37 r32-reconcile lane — settling the R32 close-presence figure (R36 gap #3)

**Question.** R36's depth lane measured close presence (fraction of samples with an
on-screen enemy ≥8 %W, aim-and-fire pilot) at ~0.083 on both of its arms and could not
reproduce "R32's published 0.33–0.40". Which number is right, what did R32 actually
measure, and is today's ~0.08 a gap vs the arcade?

**Measurement-only lane: no src/ file was touched.** All runs were made from read-only
worktrees pinned at exact commits (the main tree had sibling R37 lanes mid-edit), with
the stock probes copied in unmodified except for `cadence_probe.mjs`'s hardcoded
`ROOT` path (see "instrument traps" below). Worktrees removed after the runs.

## VERDICT (four findings)

1. **R32 never published 0.33–0.40. The figure is a source-comment fabrication.**
   It exists in exactly one load-bearing place: the `CLOSE_DROUGHT_MAX_S` comment in
   `src/game/spawner.js` (lines 999–1001, introduced by cabde03), which claims
   *"Swept in judging/R32/cadence/: at 3.0 s the active-FIRE readable-present fraction
   rises from ~0.10 to ~0.33-0.40 (into the arcade's band)"*. The lane's own published
   measurement (`judging/R32/cadence/cadence.md` §3, the only numbers in that
   directory — **no sweep artifact exists there at all**) says the opposite: at 3.0 s
   the fraction rose to **0.121 / 0.142 / 0.24** (seeds 7/19/3) — *"Still WELL below
   the arcade's ~45 %"*. The comment contradicts the evidence it cites. This is the
   CLAUDE.md bug class verbatim: "a comment citing a measurement that was never taken
   is worse than no comment" — R36's probe header copied the comment's number as "the
   fix target", then R36's NOTES.md promoted it to "R32's published figure".

2. **R32's real figure (0.12–0.24) was true then, and both instruments agree on it.**
   Running R36's own `presence_probe.mjs` on a worktree at 588a2e6 (R32-complete)
   gives **0.133 / 0.145 / 0.18** (seeds 7/19/3) — the R32 band, on a different pilot
   implementation. Subtracting ground batteries (see finding 4) gives
   **0.109 / 0.119 / 0.162** — essentially the published 0.121 / 0.142 / 0.24
   (the cadence lane measured before the battery commit 1c0c837 landed). Neither
   instrument is broken; they reproduce each other on the same build.

3. **Today's ~0.08 is real, and the decline from R32 happened in two steps.**
   `presence_probe.mjs`, 120 s × seeds 7/19/3, same operator throughout:

   | build (worktree) | seed 7 | seed 19 | seed 3 | pooled |
   |---|---|---|---|---|
   | R32 complete (588a2e6) | 0.133 | 0.145 | 0.180 | ~0.15 |
   | R35 final (22498c4) | 0.101 | 0.110 | 0.126 | ~0.11 |
   | R36 / HEAD (d43c16c) | 0.056 | 0.078 | 0.082 | ~0.07 |

   Roughly half the drop is R33–R35 (the R34 stronger-heat-seeking/easier-aiming
   weapon buffs let the pilot kill at depth before enemies close), half is R36's
   depth-combat changes themselves — including the NON-levered ones (crosser/flyby
   Y-caps below the parked cone, deeper wall hold, centre gap) that the R36 lane's
   "same-tree switch-back" arm could not remove, which is why its switch-back read
   0.082 instead of this lane's true-R35 0.11. HEAD numbers reproduced byte-identically
   across two independent runs (determinism check).

4. **The statistic is pilot-dominated and the operator is leakier than its name.**
   Three validity findings from the instrument audit:
   - **Pilot lethality drives the number.** R32's own `cadence_probe.mjs` (jittery
     pilot, kills ~5–7/min) run on TODAY's build reads gt8Frac **0.183 / 0.228 / 0.089**
     — *higher* than on the R32 build (0.152 / 0.206 / 0.242 with batteries). The
     clean R36 pilot (kills ~40/min) reads 0.07 on the same build. A sloppier pilot
     leaves enemies alive long enough to get close; the two probes disagree about the
     build-to-build direction purely through pilot skill. **Any future presence band
     must pin the pilot, or it is not one statistic.**
   - **`spanFrac` is nominal world wingspan (70.6/depth), ~2× the drawn sprite width**
     on today's slimmed art. Hand count (ground truth): 80 screenshots at 0.5 s spacing
     over 40 s, seed 7, HEAD (`val_probe.mjs`, `evidence/val-head-s7` log + PNGs). The
     probe called 5/65 flight snaps "present ≥8 %W"; cropping those frames shows the
     largest drawn aircraft at **~43 px ≈ 4.5 %W** (zooms in `evidence/`), while the
     probe recorded 8.1–9.9 %W nominal. So our numbers are LENIENT by ~2× in linear
     width against the arcade side of every comparison, which was hand-read from
     drawn pixels. By the arcade's own drawn-width operator, today's close presence
     in that segment is ~0/65.
   - **Ground batteries count as enemies** since 1c0c837 pushed them into
     `spawner.enemies` (spawner.js:1330) — every presence probe since counts a ground
     battery scrolling past as a "close enemy" (~0.02 absolute today, ~0.025 on the
     R32 build).

## Is today's ~0.08 a gap vs the arcade?

Yes — but it is the SAME gap R32 documented and never closed, now wider; it is not new.
Arcade anchors (both hand-read drawn width, 60 Hz decodes):
- R27 enemy-presence (`judging/R27/enemy-presence/comparison.md`): a >8 %W enemy on
  screen **~40–50 % of stage-1 flight time** (~35 % of the whole run incl. launch).
- R32 cadence (`judging/R32/cadence/cadence.md` §1): **~50–70 % of stage-1 combat,
  ~40–55 % of stage 4**, under an arcade pilot killing ~20–50/min.

The arcade keeps close presence high WHILE killing fast because enemies **arrive
already mid-large** ("they do not spend 5 s as specks growing from the horizon" —
R32 §1); ours arrive far and grow, so a lethal pilot empties the near field. R36's
depth redesign (kills belong at mid/far — arcade kill census says ~78 % mid+far) is
arcade-correct about KILL depth; the arcade shows both at once: hunt-at-depth kills
AND a near field that keeps refilling with large arrivals. If the R37/R38 playtest or
the owner reports empty-sky feel, the lane to open is **arrival size/cadence**
(enemies entering mid-large more often), not a return of the R35 nose funnel — and
its acceptance band must be defined on DRAWN width with a pinned pilot, per finding 4.

## Doc corrections for the TL to apply (exact stale lines)

1. `src/game/spawner.js:999-1001` — *"Swept in judging/R32/cadence/: at 3.0 s the
   active-FIRE readable-present fraction rises from ~0.10 to ~0.33-0.40 (into the
   arcade's band)"* → the sweep artifact does not exist; the lane's published result
   is **~0.10 → 0.121/0.142 (seed 3 unchanged 0.24), still well below the arcade's
   ~0.45**. The comment's "into the arcade's band" clause is false and must go.
2. `judging/R36/depth-combat/NOTES.md` §4 — *"neither arm reproduces R32's published
   0.33–0.40 on this operator — either the R32 pilot differed or the figure rotted
   under R33–R35's weapon changes"* → R32 published 0.12–0.24, which DOES reproduce
   on the R32 build with this very probe; 0.33–0.40 was only ever a spawner.js
   comment. (Both of its guesses were half-right: the build did rot ~0.15→0.11→0.07,
   and the cited figure was wrong — but not for pilot reasons.)
3. `judging/R36/depth-combat/presence_probe.mjs` header — *"the fix target was
   ~0.33-0.40 against the arcade's 0.40-0.70"* → no such target was ever measured or
   published; strike it.
4. `judging/R36/report.html` gap 03 — *"Both arms measure ~0.08 vs the published
   0.33–0.40. Reconcile before anyone cites it."* → resolved by this lane; the
   published figure was 0.12–0.24 (true then), today is ~0.07 aircraft-only
   0.03–0.07, and the arcade sits at 0.40–0.70 on a stricter (drawn-width) operator.
5. No STATUS.md or REFERENCE.md line carries the 0.33–0.40 claim (grepped); nothing
   to fix there.

## Evidence in this directory

- `evidence/presence-{r32,r35,head}.log` — presence_probe, 120 s × seeds 7/19/3 per build.
- `evidence/cadence-{r32,head}.log` — R32's own cadence_probe (full JSON incl. span
  histograms), seeds 7/19/3.
- `presence_air.mjs` + `evidence/presair-*.log` — type-aware variant splitting out
  ground batteries.
- `val_probe.mjs` + `evidence/val_log_seed7_head.json`,
  `evidence/t00360.png` / `t00570.png` + 3× zooms — the hand-count ground truth
  showing drawn ~43 px vs recorded 8–9.3 %W nominal.
- Instrument traps for the next user: `judging/R32/cadence/cadence_probe.mjs`
  hardcodes `ROOT = /Users/urizonens/dev/afterburner-three` — run from a worktree it
  silently measures the MAIN tree; and `presence_probe.mjs` resolves vite/puppeteer
  from its own directory, so it must be copied INTO the tree it measures.

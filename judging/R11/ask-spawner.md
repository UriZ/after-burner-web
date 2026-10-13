# R11 feel lane → whoever owns `src/game/spawner.js`: the lateral spread is tuned to an envelope that no longer exists

> **PRIORITY DOWNGRADED after this file was written.** It originally said the engagement cost of
> the envelope cut was the thing that decides whether the cut is kept. The combat lane then swept
> **pilot reaction latency** and the cost turns out to be specific to a pilot with ZERO reaction
> time: at 150 ms it is −10 %, and by 300 ms the OLD wide rail loses 74 % of its kills while the
> cut rail loses nothing (`judging/R11/lane-feel.md` §1.4). **This is now a should-check, not a
> blocker.** The figures below are also corrected: −34 % ± 5 at n = 3 seeds, not the −39 % from
> the single seed this file first quoted.

**One ask.** `src/game/spawner.js` is not this lane's file and I have not touched it.
`src/entities/player.js` is mine and I changed it; this is the consequence.

## What I changed

`ENVELOPE_X` **2.6 → 0.733**, so the player's lateral rail moves from **±34.93 %W to ±9.85 %W**,
and `RATE_X` was decoupled and set to the arcade's own **0.379 fracW/s**. Three independently
measured arcade quantities land at once — rail ±9.85 against ±9.85, rate 0.379 against 0.379,
rail-to-rail 0.533 s against a derived 0.527 s. Evidence and provenance:
`judging/R11/lane-feel.md` §1, `judging/R11/lane-combat.md`.

## What it costs, measured

Four pilots, identical trigger cadence, 5 400 consecutive 60 Hz ticks, `?fixed=1&invincible=1&seed=3`,
pristine `git archive 5e3d57e` extractions differing only by this lane's two files. Missile kills only.

| pilot | `5e3d57e` | + lock + ramp | **+ envelope cut** |
|---|---|---|---|
| **track** (pure pursuit) | 36 / **18** | 39 / **18** | 27 / **11** |
| **reach** (chases only what the rail can reach, else holds centre) | 35 / **17** | — | 29 / **12** |
| still (stick never touched) | 35 / 15 | 11 / 4 | 11 / 4 |

*(seed 3. Replicated across seeds 3/5/11 for the `track` arm: 18→11, 27→19, 20→13 — **−34 % mean,
3 of 3 down**. The combat lane's independent implementation gives −30 %.)*

**A zero-latency tracking pilot loses about a third of its kills.** It is **not** a probe
artefact of the pursuit policy: the `reach` arm exists to rule that out and recovers **one**
kill. **But it IS specific to zero latency** — see the downgrade note at the top.

## The diagnosis

The player can now only put the sight within **±9.85 %W** of centre, and the lock cone adds
**8.3 %W**, so the engageable band is about **±18 %W**. `spawner.js`'s lateral placement was tuned
against a **±34.93 %W** envelope. A large share of the traffic now crosses the screen outside any
reachable band and simply cannot be fought.

In the arcade this does not happen, because the arcade's traffic converges on the centre and the
player waits for it rather than chasing it. **Our spawn geometry currently assumes the player can
chase.**

## What I am asking for

1. **A look at the lateral spawn/approach spread against the new ±18 %W engageable band**, when
   you have budget — not ahead of anything with an arcade column. I am
   deliberately not proposing a number: **there is no measured arcade column for enemy lateral
   spread at all**, and inventing one is how this project has lost four rounds. If you acquire
   one, that is worth more than the retune.
2. **Re-run the arms above after any change** so the cost is tracked rather than assumed:
   ```
   node judging/R11/probe_r11.mjs --mode combat --pilot {still,track,reach,sweep} --root <tree> --out <dir>
   python3 judging/R11/analyse.py <dir>/combat-*.json
   ```
   Extract both trees fresh — mine were `5e3d57e` and that is no longer HEAD.

## What I checked so you do not have to

* **`spawner.js` has no lateral coupling to `ENVELOPE_X`.** `REACH_CEILING_NDC_Y` derives from
  `ENVELOPE_Y` only; the `ENVELOPE_X = 2.6` at `spawner.js:333` is inside a comment, not code.
  So nothing in your file is stale as a *value* — the mismatch is in the tuning, not in a
  transcribed constant.
* `demoTimeline.js` imports `ENVELOPE_X` and normalises by it, so the attract wander scales
  correctly and automatically; that is in `judging/R11/ask-flow.md`.

## The honest caveat

**This change is reversible in one line and I have said so in the report**
(`ENVELOPE_X 0.733 → 2.6`, `RATE_X 2.82 → 3.0 * ENVELOPE_X`). I landed it because three measured
arcade quantities match exactly and the statistic it costs has none — but if the judge decides a
build where a third of the traffic is unengageable is further from AB2 than a jet that slides
3.55× too far, that is a defensible call and the revert is trivial. **It should be made on
evidence, not on which of us shouts louder.**

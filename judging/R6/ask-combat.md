# R6 — cross-lane asks from the combat lane

Four asks. A1 is the important one: **half of the round's headline fix is in a file this
lane does not own, and the half that is in my files is clamped until it lands.**

---

## A1 — `player.js ENVELOPE_Y 1.1 → 1.9`. Owner: the player/flow lane.

**The ask**: raise `ENVELOPE_Y` in `src/entities/player.js` from `1.1` to `1.9` against the
unchanged `ENVELOPE_X = 2.6`. This is R4's own ask, restated by R5's game-feel critique as
one of the two causes of its #1 ranked gap, and unmoved for two rounds.

**Why it is blocking rather than nice to have.** I have made the enemies occupy the whole
frame vertically — measured, arcade-matched, numbers in `lane-combat.md` §1. The player
cannot follow them. Measured over 20 970 flight ticks on `?demo=1`, the jet's own screen
altitude spans **44.7–62.6 %H** (sd 6.2). The arcade's pilot spans **27–67 %H** (sd 8.1,
61 hand-read observations across six stages). Ours cannot reach the top third of the screen
at all; the arcade's spends part of every stage there.

**What that forces me to do, and what it costs.** `spawner.js` now carries
`REACH_CEILING_NDC_Y = 0.64`, a clamp on how high a wave may finish, derived from the
current envelope:

```
player ndcY ceiling      +0.106   (= 44.7 %H, the ENVELOPE_Y 1.1 limit, measured)
sight offset             +0.30    (combat.js SIGHT_NDC_Y_OFFSET, GAME_SPEC §3 MEASURED)
sight ceiling            +0.406
lock/assist vertical reach ±0.237 (lockSystem 8.3 %W, after the 224/320 aspect term)
=> highest engageable    +0.643
```

Anything above that is an aircraft the player can watch and cannot touch. With the clamp in
place our readable-size enemies reach **36.0 %** in the top third against the arcade's
**47.4 %**; the whole of the residual is the clamp. At `ENVELOPE_Y = 1.9` the ceiling
becomes **+0.82** and I can lift it in one line — the constant is already named and
commented for exactly this.

**What it costs you**: the jet travels further vertically, so the composition statistics
(centroid 57.08 %H, horizon 62.50 %H) will spread. They are already published as a band, and
the arcade's own pilot has sd 8.1 against our 6.2, so widening is a move toward the arcade,
not away. Please re-measure rather than assume.

---

## A2 — `deathSequence.js DEATH_TOTAL_S 5.2 → 7.8–8.5 s`. Owner: the flow lane.

Not my file, but my work has just created the room for it and the arithmetic has changed, so
the recommendation in `judging/R5/feel-critique.md` §5 should be re-run before anyone acts
on its old numbers.

The critique asked for the cut to be reversed (the arcade's death cycle is 7.8 s measured
two ways, ours is 5.2 s) and priced it at "~5 points of flight share at our current 2.90
deaths/min, which would put us at the bottom of the arcade's 69.4–73.5 % band".

**Both inputs have moved.** Deaths/min of wall clock is now **2.06** (7 seeds × 300 s), and
flight share has risen to **79.1 %** — above the arcade's own 69.4–73.5 % band. Restoring
the death cycle to 7.8 s at 2.06 deaths/min costs roughly `2.06 × 2.6 s / 60` = 8.9 points
of flight share, landing near **70 %**, i.e. inside the arcade band rather than below it.
**The trade the critique wanted is now affordable and it fixes an overshoot I created.**

---

## A3 — `REFERENCE.md`: the FIRE-MASK control's exclusion regions are missing, and the
operator does not reproduce without them. Owner: whoever holds the ground-truth docs.

`REFERENCE.md` "FIRE-MASK" publishes the operator and its control figures on
`reference/ab2-arcade-huge-explosion.jpg` (mean V 0.9055 / V>0.95 54.2 % / core 9.2 % /
mean S 0.846) but not the regions excluded from that 181×127 frame. **Run verbatim it does
not reproduce**: the white clause walks the mask out of the fireball into the cloud wedge at
the bottom left and the HUD strip across the top, and it reads **core 18.2 %, mean S 0.764**.

This has now cost two rounds. R5's independent re-implementation failed on the same
statistic in the same direction (13.2 % against 9.2 %, published as "not validated"), and
because the lane could not trust the core figure it read our own fireball at 4.1–7.8 % when
it is actually 28–32 % — and then deliberately held it there. The art critique endorsed
that call. Both were reasoning from a number the operator could not produce.

**The repair is three rectangles.** Excluding rows 0–14, rows 112–127, and the
`x < 55 / y > 82` cloud wedge reproduces all four published figures to within 0.5 points
(0.9028 / 53.6 % / 9.4 % / 0.847). Please add them to REFERENCE.md next to the figures —
the ledger's own row 15 makes exactly this point about the cloud operator's HUD rects, and
this is the same defect in the next operator along.

A working implementation with the control baked in is
`tools/out/combat-r6/measure_expl_phase.py --control`.

---

## A4 — `GAME_SPEC.md §2`: the arcade's enemy-altitude distribution is now measured and is
the pilot-independent criterion the spec asked for. Owner: the criteria lane.

`judging/R5/feel-critique.md` §6 called a systematic arcade enemy-altitude distribution
"the single best replacement criterion available" and "unstarted". It is started: 83 enemy
observations and 61 player observations hand-read from 63 frames across six stage-verified
spans, raw data and operator in `tools/out/combat-r6/arcade-vert/labels.csv`, summary in
`lane-combat.md` §1.

Headline, if you want it as a criterion: **enemy screen altitude p5/p50/p95 = 14.1 / 40.0 /
72.8 %H, sd 19.2, and 32.5 % of enemy observations in the top third of the frame.** It is
pilot-independent in the sense deaths/min is not — an attack wave's screen path is scripted
— but read its stated weaknesses first (expert pilot, eyeballed spans, one frame
contributing 5 of 19 readable observations).

I am **not** asking for it to be adopted as a gate this round. It is one lane's hand count
and it should be reproduced by someone else before it binds anybody.

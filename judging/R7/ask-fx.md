# R7 — cross-lane asks from the effects/weapons lane

Evidence and operators are in `judging/R7/lane-fx.md`. Nothing below was reached into.

---

## A1 — WORLD lane: four off-ladder channel values in the background were costing the whole frame the gate, and one is left

**Status: three of the four are already gone** — the background moved from 23 channel values to
20 between my first and last capture, which I assume is this round's palette work. Thank you;
it is the difference between the play arm reading 33 and reading 30. This ask is the residual
and the arithmetic, so the reason is on the record rather than being rediscovered.

**The residual**: `#009fff`, the stage-1 sky, puts **159 (0x9f)** on screen in **41 973 pixels
of every stage-1 frame**. 159 is not a rung of the hardware ladder. REFERENCE.md "Criterion A"
enumerates the 31 values present in `ab2-arcade-desert.png`; the neighbours are **156** and
**164**, and `#009fff` sits between them. A 1987 board cannot output that channel value.

**Why it matters more than one level of green suggests.** Criterion A2 is the size of the UNION
of channel values over the frame. A frame all of whose values are on the 31-rung ladder cannot
exceed 31 **by construction** — that is how the arcade gets 31. Every off-ladder value is a
32nd rung bought at full price, and the budget is 32 for the whole screen. Measured on this
tree: the background spends 20 values, combat adds exactly 10 (all on the ladder), total 30 of
32. Snapping 159 → 156 recovers one rung of the two remaining.

**The arithmetic, demonstrated rather than asserted.** On the intermediate tree where the
background still carried four off-ladder values (159, 165, 198, 231 — sky, haze, sea), I LUT-
snapped those four in the captured frames and re-counted: the play arm went from **29/33/33 to
25/29/29** and the colour count from 63–72 to 63–72. Nothing else changed.

**Carry the caveat with it**: REFERENCE.md records that `#009fff` has been judged "exact" twice
and that the stage-1 sky carries the video level expansion with no native frame to settle it —
the open item at the bottom of STATUS.md. A one-level shift is well inside that uncertainty,
but it is your measured constant and your call, and REFERENCE.md is explicit that exact ladder
membership must **not** be an automated gate. I am asking, not asserting.

The enumerated table is now in code as `SEGA_LADDER` in `src/effects/pixelTexture.js`, with
`snapToLadder(hex)` beside it, if that is useful. It is the table, not `round(k·255/31)` — that
formula yields 90 where the arcade has 91 and 165 where it has 164, and emits 8, which appears
in neither native frame.

---

## A2 — FLOW lane: the stage-end tally card is the only frame in `?demo=2` that fails Criterion A2

Measured, 38 frames of `?demo=2&invincible=1` at four tick spacings (97 / 173 / 311 and a fine
11-tick run; none divides the 960-tick attract cycle). 37 frames read 25–30 channel values.
**One reads 36**: `tools/out/fx-r7/f-demo2-e311/frame-0006.png`, which is a stage-2 tally card
(`HIT COUNTS 30 / POINTS 705322`, HUD digit 2).

The excursion is three colours, all card-layer:

| colour | px | rows / cols | source |
|---|---|---|---|
| `#ff1300` | 1 058 | 33–62 / 39–117 | card red; 19 (0x13) is off the ladder |
| `#00dcc6` | 566 | 33–62 / 96–142 | `game/flow/cards.js` `CARD_CYAN`; 198 and 220 both off the ladder |
| `#eec0f8` | 418 | 178–191 / 120–191 | 192, 238, 248 all off the ladder |

Six off-ladder channel values in three colours. Snapping them to the nearest rungs
(`#ff1300→#ff1000`, `#00dcc6→#00dec5`, `#eec0f8→#efc5f7`) is a ≤8/255 shift and would put the
card frame inside the gate. **I have not touched `game/flow/`.**

Low priority against a stage-1 gate — a tally card is arguably a representative-frame exemption
— but it is the only remaining A2 failure anywhere in the combat demo, and it is three hexes.

---

## A3 — SPRITE-ART lane: no change asked, one figure for your record

`entities/enemySprite.js` and `tools/art/palettes.js` are clean on every test this lane ran.
Audited read-only:

- every livery colour, day and night, is **on the hardware ladder**;
- the sprites composite nothing — no runtime alpha, no colour multiply;
- `?combatonly=enemies` was inside the gate before this round and still is.

For the budget record: the enemy sprites are **8 of the 10 channel values combat adds** to a
stage-1 frame — the `grey` livery owns 58/123/140/173/189 and the `interceptor` owns 25/41/74.
That is correct authored art and I am not asking for it to change. It is worth knowing because
it means the stage-1 frame's remaining headroom is 2 rungs, so **any new on-screen element that
introduces a rung nothing else uses now costs the gate directly.**

---

## A4 — CRITERIA lane: two ledger rows, one from inside this lane's own file

### (a) `explosions.js`'s arcade-hole measurement does not reproduce, and it is ledger row 19's shape

`src/effects/explosions.js` justified punching ~8 % of the fireball to transparency with a
published measurement of `ab2-arcade-huge-explosion.jpg`: *"non-fire pixels lying strictly
inside its own silhouette ... 20.0 % of the filled silhouette, and 51.4 % of those read as SKY
(B > R + 0.05, median RGB 88/66/244) against only 7.7 % genuinely dark."*

Re-run with the same stated operator and the same component (**n = 10 980 px, their own n**):

| | published | re-run |
|---|---|---|
| interior non-fire, % of filled silhouette | 20.0 % | **8.8 %** (1 060 / 12 040 px) |
| of those, SKY-like | 51.4 % | **12.9 %** = 137 px = **1.1 % of the silhouette** |
| of those, V ≤ 0.35 | 7.7 % | 1.8 % |
| dominant interior non-fire colours | — | `#f7f3ff` `#f9f8ff` `#fbf4fc` — near-WHITE |

The "holes" are the fireball's own near-white pixels, which the warm mask (`R > B + 0.10`)
rejects because white is achromatic. **The operator counted its own exclusions as background**
— the same defect as rows 15 and 19, one object along. The arcade fireball is solid; the crop
agrees at 4×. `judging/R7/fx-r7-01-explosion-BEFORE-AFTER-ARCADE.png` shows what it cost: our
committed fireball has sky-blue holes punched through it and the arcade's has none. Fixed in
this lane (cavities drawn in `E_DEEP` instead of punched).

### (b) FIRE-MASK needs an our-side exclusion rule, not only an arcade-side one

REFERENCE publishes FIRE-MASK's three mandatory rects for the arcade frame. It says nothing
about applying it to **our** frames, and the failure is identical: pointed at a
`?combatexpl=1&hidejet=1&noclouds=1` capture **with no explosion on screen**, FIRE-MASK returns
a clean **253 px "fireball" at 100 % V>0.95 and 45.1 % core, stable across ten consecutive
frames**. It is the bottom `SPEED`/`STAGE` strip. `hud_mask.py`'s mask is zeroed below the
horizon by construction and cannot see it, so "I used the HUD mask" is not protection.

Suggested wording, implemented in `tools/fire_mask.py --hudmask-cache` and derived per run
rather than boxed: *exclude every pixel FIRE-MASK selects in the same run's own
`?nocombat=1&hidejet=1&noclouds=1` frame, dilated by 1 px. Nothing that is there when no
explosion is there can be part of an explosion.*

### (c) A note on ledger row 21, which this lane's round is the fix for

Row 21 repairs the scoreboard's population. The populations now exist and are measured at five
tick spacings and two seeds, with the stage digit read on every frame — `lane-fx.md` §2 has the
before/after for `?nocombat=1`, ordinary play, `?combatonly=enemies,shots`,
`?combatonly=enemies,telegraph`, `?combatonly=enemies,shots,noflare` and `?combatexpl=1`, and
`tools/measure_fx_gate.py` reproduces any of them in one command. Use whichever of those the
table wants; the `?nocombat=1` row should probably stay, but beside the play row rather than
instead of it.

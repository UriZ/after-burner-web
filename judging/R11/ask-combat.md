# WITHDRAWN — R11 feel lane → combat lane

**This ask is WITHDRAWN by both lanes and must not be actioned.**

It asked the combat lane to change `combat.js`'s sight placement so the sight would move ~1/2.95
of the jet's excursion. **Its entire premise — an arcade jet:sight excursion ratio of 2.95 —
came from `judging/R11/arcade_jet_x.csv`, which was reading ENEMY aircraft.** The real ratio is
**1.02 ± 0.03**: the arcade's aircraft tracks its sight. `combat.js`'s `sight = playerNdc + up *
SIGHT_FRAC` is therefore CORRECT and needs no change.

The defect was `ENVELOPE_X` in `player.js` all along, and the feel lane cut it in this round.
See `judging/R11/lane-feel.md` §1 (retraction and corrected column) and
`judging/R11/lane-combat.md` for the decode that caught it.

Original text preserved below for the record only. **Do not act on it.**

---

# R11 feel lane → combat lane: the SIGHT moves with the jet, and the arcade's moves against it

**One ask, one file, one line.** `src/weapons/combat.js` is yours; `src/entities/player.js` and
`src/weapons/lockSystem.js` are mine. I have not touched yours.

## The measurement

`judging/R11/lane-feel.md` §1. Hand-digitised off ruled contact sheets, n = 67, stages 1 / 4 / 12,
stage identity read off the HUD digit at both ends of every window, data in
`judging/R11/arcade_jet_x.csv`:

| | arcade | ours (pristine `5e3d57e`) | ratio |
|---|---|---|---|
| player **AIRCRAFT** half-envelope | **±29.5 %W** (lower bound, 1 Hz extremum) | ±34.93 %W | 1.19× — **matched** |
| player **SIGHT** half-envelope | **±9.83 / ±10.12 %W** (R10, two operators, four stages) | ±34.93 %W | **3.5× too wide** |
| arcade's own **jet : sight** excursion ratio | **2.95** | **1.00** | — |

**In the arcade the sight moves roughly a third as far as the aeroplane. In our build it moves
exactly as far.** That is the largest remaining lateral defect in the game, and it is not
`ENVELOPE_X`: `ENVELOPE_X` passes.

## Why it cannot be fixed on my side

`combat.js:714-715`:

```js
this.sight.x = this.playerNdc.x + (up.x * SIGHT_FRAC) / 0.5;
this.sight.y = this.playerNdc.y + (up.y * SIGHT_FRAC) / (0.5 * (224 / 320));
```

The sight is the jet's screen position **plus** a screen-space offset. The offset can only add
to the jet's excursion, so `|sight.x|` is bounded below by `|playerNdc.x|` minus the offset's
lateral component — **our sight can never move less than our jet at any value of `ENVELOPE_X`,
`RATE_X` or `SIGHT_NDC_Y_OFFSET`.** The arcade's does.

The shape that would produce 2.95 is the obvious one physically: the sight is a point **ahead of
the aircraft along its heading**, so it projects nearer the vanishing point and its screen
excursion is scaled down by the depth ratio. `SIGHT_DEPTH = 55` already exists in your file and
is currently used only to place the drawn glyph, not to derive its x.

## What this blocks, concretely

1. **`ENVELOPE_X` cannot be widened** even where a measurement asks for it, because widening the
   jet widens the sight 1:1 and would take our sight from ±32 to ±47 %W and the lock cone with
   it. (It does not need widening today — 1.19× — but any future move is blocked.)
2. **`LOCK_RADIUS_FRAC` is centred on `sight`.** I narrowed it to the arcade anchor 0.083 this
   round and the blind-pilot kill share fell from 83 % to 22 % of a tracking pilot's. That cone
   rides a sight that is 3.5× too mobile; the fix makes the aiming test *more* meaningful, not
   less, but the cone's screen position is yours.
3. `combat.js`'s gun assist cone (`assistConeFromSight`) is measured from the same point.

## What I am NOT asking for

Not a number for `SIGHT_NDC_Y_OFFSET` — `lane-criteria` R7 §JOB 2 showed the vertical offset is
not a screen-frame quantity at all (7.8 %H and 8.8 %H *above* the airframe in two banked frames,
12.0 %H *below* it in a third) and that still stands. **This ask is about the LATERAL term
only.** Whatever model you adopt, the acceptance test is the one measured quantity:
**the sight's half-envelope over a full rail-to-rail traverse should be ≈ 1/2.95 of the jet's**,
i.e. ~±11.8 %W at our current rail, against the arcade's ±9.83–10.12 %W.

Reproduce our side with:
```
node judging/R11/probe_r11.mjs --mode resp --root <tree> --out <dir>
python3 judging/R11/analyse.py <dir>/resp-still.json
```
It prints both half-envelopes on the same run.

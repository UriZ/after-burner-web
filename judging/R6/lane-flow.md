# R6 — game-flow / player-feel lane

**Tree state** (REFERENCE.md "What a complete citation is"): started from the committed tree
`53ce86b`, which is the same tree `judging/R5/feel-critique.md` measured, so its numbers and
mine are comparable. Work is **uncommitted**, on the shared working tree with four other lanes
live — `src/assets/sprites/player-f14-roll.png` was modified by the sprite lane mid-round and the
barrel-roll verification below was **re-run against their updated sheet**, not against the one I
first captured.

**Files changed (mine only):** `src/game/flow/flow.js`, `src/game/flow/launchSequence.js`,
`src/game/score.js`, `src/game/game.js`, `src/entities/player.js`.
**Files added (mine):** `src/game/flow/carrier.js`, `src/core/cameraGeom.js`.
**Nothing else was touched.** Cross-lane items are in `judging/R6/ask-flow.md` (A1–A8).

**Build**: `npm run build` passes. Six URL paths boot with **zero page errors** (`/`, `?demo=1`,
`?demo=2`, `?showtitle=1`, the isolation combo, `?nocarrier=1&demo=1`). Every capture set swept
for black and duplicate frames with `tools/out/flow-r6/sweep.py`, which **passes a planted-fault
self-test first** (1 planted black + 1 planted byte-duplicate → both found): **0 black, 0
duplicates** across 117 frames in 5 sets.

---

## 1. Verdict in one paragraph

Four of the five things asked for landed and are verified on the build, not asserted: the score
bug is gone, the barrel roll is drawn, the carrier is in the launch and matches the arcade's
framing on four landmarks, and the attract loop now walks all three stage palettes. The throttle
turned out to **already be a real verb** — the judge's gap-6 claim is wrong on this tree and I
have the probe to show it. The sight-square item reversed direction on the arcade check, the way
four of five such checks did last round, and is an ask rather than an edit because the files are
combat's. The 23-stage item was taken as far as it goes without stage content: all 23 **measured
durations** now drive the flow, the palettes still lap at 3, and that is stated rather than
papered over. **Not attempted: `ENVELOPE_Y`** — §8 says why.

---

## 2. JOB 1 — the score reset on continue. Deleted, and verified both ways.

### The arcade side, re-read independently

I did not take the line on the lead's or the critic's authority — the whole point of this
project's loop is that a criterion gets checked against the arcade before it is acted on, and
this one was being acted on in reverse. Digits read at 4× nearest-neighbour off
`ab2-gameplay.mp4`:

| t | SCORE | |
|---|---|---|
| 256 | 485440 | |
| 260 | 489540 | frozen — the death |
| **261** | **489540** | **the CONTINUE PLAY card is on screen** (`reference/continue-card-gp-t261.png`, also HIT 4, STAGE 4) |
| 262 | 489540 | still frozen |
| 265 | 490000 | running again |
| 268 | 491000 | |
| 277 | 497600 | |

Monotonic straight through the credit. The "~600" GAME_SPEC.md §2 cites is not on screen
anywhere in that window. Score, HIT **and** stage all survive. Third independent reading, after
the feel critic's and the lead's, and all three agree.

### The build side

Deleting a line is not evidence that the behaviour it caused is gone, so
`tools/out/flow-r6/continue_probe.mjs` plays `?demo=1` until a real continue happens and asserts
four properties at the `continue → flight` edge:

| | seed 1 | seed 4 |
|---|---|---|
| score survives the continue | **PASS** 1 278 265 → 1 278 430 | **PASS** 1 162 685 → 1 162 740 |
| score frozen through the card | **PASS** drift 0.000 | **PASS** drift 0.000 |
| HIT survives | **PASS** 23 → 23 | **PASS** 21 → 21 |
| lives restored to 3 | **PASS** | **PASS** |

The "frozen" assertion is there so "did not drop" cannot be satisfied by accidentally accruing
through the card — the arcade's digits do not move while it is up, and now neither do ours.
HIT survives for free, and I checked *why* rather than assuming: `combat.clear()` does not touch
`combat.hits` (only `_enterStage` resets it), which is what makes our t261 behaviour match.

`score.js`'s header comment carried the same wrong claim and has been corrected with the
citation. The two correct `score.reset()` calls (new game, attract restart) are untouched.
GAME_SPEC.md §2 itself is criteria-fix's file — asked in A4(a).

## 3. JOB 2a — the barrel roll is now drawn

`player.js`'s roll branch selects a cell from `JET_ROLL_SHEET` via `selectRollCell(sprite, tex,
q * rollDir)` instead of spinning the procedural bitmap. `spriteFactory.js` was **not edited** —
the sheet and the selector were already there and public.

**The rotation and the span squish are baked into that art**, so the two procedural effects are
now mutually exclusive with it, not additive: `selectRollCell` clears `material.rotation` itself
and the `scale.x` squish is skipped entirely on the sheet path. A null texture still falls back
to the exact R5 spin-and-squish, so a decode failure degrades to the old behaviour rather than to
a broken frame.

**Verified** (`tools/out/flow-r6/roll_probe.mjs`, `?fixed=1`, stick slam driven through
`window.__setStick` because puppeteer cannot dispatch real keydowns under manual stepping):

| | |
|---|---|
| rolling ticks in the manoeuvre | 26, `rollPhase` 0.212 → 0.970 monotonic |
| `poseSource` on every rolling tick | **`sheet-roll`** (26/26) |
| `spriteRotationDeg` on every rolling tick | **0.0** — so the rotation is not being applied twice |
| tick after the roll ends | `poseSource` back to `sheet-day`, `poseDeg` returns to 0 |

Evidence: `flow-01-roll-ours-TOP-arcade-BOT.png`. Ours now shows the belly, the blue-violet
underside and the two lit nozzles at mid-roll, which is what
`reference/stage4-barrel-roll-t222.png` shows and what a spun astern bitmap can never show — it
stays warm grey at every phase.

**Two real bugs found while wiring it, both by asking "who resets this?" rather than by
capture.** A roll cell is selected by a UV window on the material, and *nothing downstream resets
that*:

1. `deathSequence.js` touches rotation, colour and scale but **never `material.map` or the texture
   offset** (checked, not assumed). A death landing mid-roll would have tumbled a belly-up roll
   cell for the whole 5.2 s sequence. `cancelRoll()` now restores the bank sheet.
   Verified with `?forcedeath=1.6`: `poseSource` goes `sheet-roll → sheet-day` on the first death
   tick, and the death filmstrip shows the normal airframe inside the fireball.
2. The attract demo rolls once per 16 s cycle and a player can **press start in the middle of
   one**. `launchSequence.js` then owns the sprite for 3.5 s with `playerControlled` false, so
   `Player.update` never runs to finish the roll — the jet would have sat on the catapult
   belly-up. `_startRealGame` and the attract→title exit now both cancel.

`poseSource` itself needed a fix to be able to report any of this: it compared against the *bank*
sheet, so during a roll it returned `'procedural'` — the drawn roll was working and the
measurement hook said it was not. It now returns `'sheet-roll'`. Worth noting as its own small
lesson: the only evidence the sheet path was taken, before that, was `spriteRotationDeg` staying
at 0.0, which is an inference and not a reading.

**Known residual, documented in the code rather than hidden:** there is no night roll sheet, so a
roll on stage 3 draws the daylight cells. Day and night differ in hue at matching value, so it is
a ~1.1 s hue pop. I judged the drawn manoeuvre in all stages to beat a spun bitmap at night.
Asked in A5; wiring the night sheet afterwards is one line in my file.

## 4. JOB 2b — the throttle. Already a real verb; the judge's claim is wrong on this tree.

`judging/R5/report.md` gap 6 states the throttle bar is "wired to `scrollSpeed` with no player
control". `core/input.js` edge-detects `Q`/`E` into a persistent three-detent lever and
`flow.js:_updateFlight` reads `rawInput.throttleIndex`; this shipped in R5.

`tools/out/flow-r6/throttle_probe.mjs` exercises it with **key events**, not with `__setStick` —
`__setStick` installs an input override and would bypass `core/input.js` entirely, so a pass
through it would prove the flow plumbing and nothing about whether a key reaches it:

```
start              index=1 letter=M bar=0.690 scroll=68.930
E (up)             index=2 letter=H bar=1.000 scroll=99.949
E at ceiling       index=2 letter=H bar=1.000 scroll=99.949     <- clamped
Q (down)           index=1 letter=M bar=0.690 scroll=68.930
Q (down)           index=0 letter=L bar=0.428 scroll=42.737
Q at floor         index=0 letter=L bar=0.428 scroll=42.737     <- clamped
E held 30 ticks    index=1 letter=M bar=0.690 scroll=68.930     <- ONE detent, not 30
```

PASS on the full expected sequence, three distinct `scrollSpeed` values, both ends clamped, and a
held key steps once (which is the property `input.js`'s `_prevKeys` comparison exists for).

What it does **not** do is change enemy closure rate or cloud drift, which is what would make
speed *matter* — both are other lanes' files and `flow.js` already threads `throttleIndex`
through for them. Asked in A6. And **README does not document `Q`/`E` at all**, which is the most
likely reason the judge recorded the verb as absent — asked in A7.

## 5. JOB 2c — 23 stages. Structure done; content is honestly not mine.

`STAGE_DURATIONS_S` read `[32, 32, 36]` and was indexed `stageIndex % 3`, so **every stage after
the third ran on stage 3's 36 s**. `STAGE_MAP.md` has carried the verified spans for all 23 the
whole time and nothing read past index 2. All 23 are now in:

```
32 32 36 40 12 | 44 32 28 48 40 | 36 36 16 36 40 | 36 28 36 40 40 | 36 36 16
```

12 s to 48 s, mean 34.2 s, 776 s of flight for a full run. The two short ones are structural, not
noise: **stage 5 (12 s) is the runway restock**, matching
`reference/stage5-runway-restock-t252.png` and the feel critic's two "runway" freeze clusters at
t292.3 / t760.1. A 48 s stage 9 into a 40 s stage 10 into a 36 s stage 11 is a pacing shape we
simply did not have.

**Stated because the digits look more exact than they are:** `STAGE_MAP.md` was built by sampling
the longplay every 4 s and reading the HUD digit, so every boundary is on a 4 s grid and every
duration is a multiple of 4. These are **±4 s**. The `32/32/36` that stood here before carries
exactly the same quantisation — this is not a new weakness, it is the same one, now written down.

**What I did not attempt, and why:** stage *content* — palettes, terrain, the resupply and canyon
stage types. `src/game/stage.js` and `render/{ground,sky,clouds}.js` are the world lane's files
and `STAGES` is still 3 entries, so palettes lap every 3 while structure laps every 23. I could
have faked more stages by permuting the three palettes; that would have made the lap harder to
see without making it smaller, and it would have put stage data in the wrong lane's file. A8 says
what happens on my side when `STAGES` grows (nothing — it already wraps on `STAGES.length`), and
raises the HUD-digit question that real durations reopen without deciding it unilaterally.

## 6. JOB 3 — the sight square. The arcade check reversed the question.

**Short version: the swing is real, and the arcade appears not to have the element at all.**
Full evidence and the ask are in `ask-flow.md` A1; `flow-03-sight-ours-TOP2-arcade-BOT3.png`.

Ours, captured at `?debugstick=0` and `?debugstick=1`: at 0° the dashed square sits above the
nose; at 66.5° of world roll it is off to the side, which reproduces the 11.5 %W the critic
derived analytically. Looking for the arcade's equivalent to compare against, I checked four
conditions — flight with **no enemies at all** (t92 climb-out), level flight with enemies (t116),
**firing the vulcan** (t214), and an 8-frame sweep through a full bank (longplay t94.5–98.0). No
square leads the nose in any of them. Every dashed square I can find sits on an enemy, which is
GAME_SPEC's element 3, the lock bracket.

So element 1 — tagged MEASURED — looks like a lock bracket that happened to sit near the nose in
the frame it was read from. **Our build draws the square because the spec says the arcade has
one.** I have not acted on that: GAME_SPEC is criteria-fix's file and `combat.js` is combat's, and
a flow lane deleting a MEASURED HUD element on four frames is exactly the unilateral move this
process exists to prevent.

The half that is a defect **either way**, and which I have asked combat to fix regardless:
`lockSystem._nearestLockable` picks the missile target *from the sight's position*, so **which
enemy you lock depends on your bank angle**. That is true whether or not anything is drawn.

## 7. JOB 4 — the cheap items

### 7.1 The carrier catapult launch now has a carrier in it

`src/game/flow/carrier.js` — a pixel-art carrier authored **in this lane**, out of
`spriteFactory.js`'s public pixel helpers (`createPixelBuffer` / `fillPolygonHard` / `addKeyline`
/ `bufferToTexture`). That file was read, not edited. `game.js` adds the sprite to the scene
because adding to the scene graph is the one thing only `game.js` does; `?nocarrier=1` is the
usual isolation escape hatch.

**Proportions and framing were solved against the arcade, not chosen.** Operator on
`reference/carrier-prelaunch-t84.png`: low-saturation mask (sat < 0.18, 60 < max(RGB) < 235) then
the largest 4-connected component, which isolates the flight deck. *That operator's first run
reported a 98 %W bbox* because sea foam is also low-saturation — rendering the mask and looking at
it is what caught it, and the component step is what fixed it. The surviving measurements:
deck span **50.87 %W** centred at 49.85, deck top **53.33 %H**, deck near edge **72.71 %H**, mast
top ~40.8, hull bottom ~86.5.

Converting those from %H/%W into **pixels** (the aspect matters — %H and %W are not the same
unit) gives ship-height/deck-width 0.6276 and deck-extent/deck-width 0.2666, which set the
texture's proportions; the sprite then has exactly two free parameters (span fraction, centre
fraction), fixed by two of the landmarks. **The other landmarks are a prediction, not a second
fit.** Measured back off our own capture with the arcade's own operator:

| | ours | arcade | Δ |
|---|---|---|---|
| deck span %W | **51.25** | 50.87 | +0.38 |
| deck centre %W | **49.95** | 49.85 | +0.10 |
| deck top %H | **53.12** | 53.33 | −0.20 |
| deck near edge %H | **72.62** | 72.71 | −0.09 |

Two corrections on the way there, both found by capture and both worth recording:
- The first texture was eyeballed at 208×96 and read as a flat grey arrowhead. Its
  deck-extent/width was 0.218 against the arcade's 0.2666 — **18 % too shallow**. Solving it gave
  208×124.
- Deck centre read 47.14 %W against 49.85. The deck occupies texels 0..188 of 208, so a sprite
  pivoted at its texture centre puts the deck 4.8 % of its own width to the left — and 2.71
  points is exactly 4.8 % of a 56.3 %W sprite. Fixed by pivoting on the deck's midpoint via
  `THREE.Sprite.center`, which stays correct through the whole overfly as the thing grows.

The shot itself: the ship sits across the horizon with the oversized jet climbing off its bow,
then **accelerates** toward and past the camera (q², not the jet's eased-out curve — a linear
pass reads as the ship *sinking*, because the growth is fastest exactly when it should be
slowest) and is gone by 78 % of the climb-out, so the last ~0.6 s is clean sky and the sequence
ends on flight rather than on scenery leaving frame. `flow-02-launch-ours-TOP-arcade-BOT.png`.

Two deliberate non-reproductions. The arcade paints **SEGA / ENTERPRISE** across the deck; that is
trade dress and CLAUDE.md's assets rule is absolute, so ours carries an abstract landing strip and
a hull number. And the palette (`#c6c4e7 / #b5b3c5 / #9294b3 / #505065 / #201f26` + white +
keyline, 8 tones, Criterion A's per-object budget) is sampled from **video**, so it carries the
level expansion STATUS.md warns about; recorded as such in the file rather than silently scaled.

Honest about what it is not: the side-by-side shows our deck has far fewer parked aircraft, a
simpler island, and a plainer hull than the arcade's. It is a flow lane's carrier. If sprite-art
wants to take it over, the placement maths and the measured framing are reusable as-is — only
`drawCarrier` would change.

### 7.2 The attract demo no longer shows stage 1 twenty-four times

feel-critique.md §7.6. Each attract cycle now enters a different content stage, so an unattended
cabinet walks the three palettes. `tools/out/flow-r6/attract_probe.mjs`, 128 s of the unattended
loop under `?showtitle=1`:

```
t=   0.0s title stage 0    t=  40.0s attract stage 1    t=  96.0s title   stage 2
t=   8.0s attract stage 0  t=  64.0s title   stage 1    t= 104.0s attract stage 0
t=  32.0s title stage 0    t=  72.0s attract stage 2    t= 128.0s title   stage 0
attract cycles ran content stages: [0,1,2,0]  -> 3 distinct, PASS
```

**I deliberately did not touch `demoTimeline.js`'s roam.** Its regime cycle is exactly 16.000 s
and its amplitudes are solved against published composition statistics that judges sample
against; rotating the *palette* costs nothing that is measured. The other half of §7.6 — the
repeated *engagement*, the same echelon of three aircraft — is `spawner.js`'s, asked in A6/A1's
neighbourhood (noted in the ask file's A6 context).

The probe reads a per-cycle **label**, not a spread or a percentile, so the 16.000 s aliasing trap
does not apply to it. It would apply to anything summarising the roam, and this probe
deliberately summarises nothing.

### 7.3 `playEnemyFlyPast` — not done, and not done on purpose

Still zero call sites. The place it belongs is `spawner.js`'s despawn-past-the-camera path, which
is combat's file. Doing it from `game.js` would mean polling `combat.spawner.enemies` for depth
crossings from a file that should not know the spawner's internals, and would fire on the wrong
edge or twice depending on despawn semantics I do not own. A2 has the exact line and the pan
derivation.

### 7.4 Life count — wiring is mine and correct; placement is `ui/hud.js`

`flow.js` writes `hudState.lives` every tick in every state, and the continue probe confirms it
tracks 3 → 2 → 1 → 3 across a credit. The 7×4 px sprite under the SPEED label over moving sea is
presentation's. A3.

## 8. What I did not attempt, with the reason

**`ENVELOPE_Y = 1.1` against `ENVELOPE_X = 2.6` — the feel critic's ranked #1, and it is in my
file.** I left it alone, and this is a judgement call rather than an oversight:

- The gap is *two* things and I own only one. 0.1 % of readable enemies sit in the top third of
  the screen because `spawner.js` fans the echelon across a narrow `ndcY` band. Raising the
  player's vertical authority without enemies to climb to buys a taller empty box, not a vertical
  dimension.
- It is not free. `demoTimeline.js`'s `CRUISE_Y_MEAN` / `CANYON_Y_MEAN` were solved in
  pixel-centroid units against `ENVELOPE_Y = 1.1` (cy = 55.60 − 20.51·stickY), to land the attract
  flight on REFERENCE's measured 52.8 / 63.5 %H. Changing the envelope invalidates both constants
  and, through them, the composition statistics every judge reads off `?demo=1`. Both files are
  mine, so I *could* re-solve them — but doing it properly is a full measure-solve-remeasure loop,
  and doing it improperly breaks a passing metric to chase an unmeasured one.
- The critic's own recommendation is to measure first: *"a systematic arcade enemy-altitude
  distribution is unstarted and is the single best replacement criterion available."* There is no
  arcade target to aim at yet. R4 asked for 1.9; that number has no citation.

**Recommended for R7, in order:** measure the arcade's enemy-altitude distribution off the
stage-mapped longplay (pilot-independent, cheap, and the best unstarted criterion in the
project); then raise `ENVELOPE_Y` and widen `spawner.js`'s `ndcY` band *together* to that target;
then re-solve the two `demoTimeline` constants and re-measure the composition band. That is one
round's work for one lane, done in that order.

**Also not attempted:** `game.js`'s `ROLL_SUPPRESS_RATE_RAD_PER_S`, which exists to satisfy a
GAME_SPEC §1 claim the arcade's own roll frames do not support. The reasoning, the evidence, and
the measurement I withdrew are in A4(c). Changing it is a bigger move than the roll art and I
could not establish what should replace it; leaving a flagged wrong constant beats replacing it
with an unfounded one.

## 9. The two new files, since they are new entry points

- **`src/core/cameraGeom.js`** — the four camera numbers (`FOV_DEG`, `CAMERA_HEIGHT`,
  `CAMERA_PITCH`, and the derived horizon) plus `horizonFracFor`, `worldYForScreenFrac` and a new
  `worldWidthAtDepth`. These lived in `game.js` and were **also transcribed by hand into
  `player.js`**, with a comment there asking whoever retunes `game.js` to remember to re-sync.
  R6 needed a third copy (the carrier has to be placed at a commanded screen fraction), and three
  hand-synced copies of a number that silently breaks composition when they disagree is not a
  thing to ship. `game.js` still owns the camera's *behaviour* and keeps all the derivations;
  only the storage moved. Values are unchanged, which the composition captures confirm.
- **`src/game/flow/carrier.js`** — §7.1.

## 10. Observed vs inferred

**Observed in frames** (`tools/out/flow-r6/`, 5 sets, 117 frames, all swept): the roll drawn
through all eight cells with the belly and lit nozzles at mid-phase; the normal airframe inside
the death fireball after a roll is cancelled; the carrier through its whole overfly; the sight
square above the nose at 0° and off to the side at 66.5°.

**Observed in the arcade**: the score running straight through the continue and the CONTINUE PLAY
card's own digits; the carrier's four landmarks; the absence of a nose sight square in four
conditions; the horizon banked in all 16 frames of the roll.

**Measured by probe, not visible in pixels**: `poseSource` / `rollPhase` / `spriteRotationDeg`
through 26 rolling ticks and across the death boundary; the throttle's seven-step key sequence
and its three `scrollSpeed` values; the four continue-edge properties on two seeds; the attract
loop's stage sequence.

**Withdrawn**: the numeric horizon-tilt series through the arcade's roll (A4(c)) — the operator
passes synthetic controls to 0.08° and fails on that population, and overlaying its detections
showed it tracing cloud tops. The qualitative reading from the frames stands; the numbers do not.

**Not experienced**: nobody has held the controls. Everything above is frames and telemetry. In
particular, whether the drawn roll *reads* as a roll in motion, and whether the carrier overfly
*feels* like a launch, are claims I cannot make from stills.

**Nothing committed, nothing pushed. No file outside this lane was modified.**

### Evidence

| file | shows |
|---|---|
| `flow-01-roll-ours-TOP-arcade-BOT.png` | the drawn barrel roll, 8 phases, against t222 |
| `flow-02-launch-ours-TOP-arcade-BOT.png` | the carrier launch overfly against t84 |
| `flow-03-sight-ours-TOP2-arcade-BOT3.png` | our sight at 0° and 66.5°, against three arcade frames with no such element |

Probes and the self-tested sweep are in `tools/out/flow-r6/`: `roll_probe.mjs`,
`throttle_probe.mjs`, `continue_probe.mjs`, `attract_probe.mjs`, `sweep.py`.

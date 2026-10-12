# R11 — the COMBAT / FLOW lane: the sight, and the attract loop's tenth roll

**Files owned and touched**: `src/weapons/combat.js` (comment only, no behaviour),
`src/game/flow/demoTimeline.js`. Nothing else. No commit, no stash, no checkout, no reset,
no push.

**Trees, named for every our-side figure.** `5e3d57e` = HEAD at round start (pre-feel-lane).
`82daaa4` = HEAD after the feel lane's commit (lock cone + ramp removal, `ENVELOPE_X` still
2.6). `final` = `git archive 82daaa4` + the feel lane's live `player.js`
(md5 `1461a0f2b360d189a600ef130675f494`, `ENVELOPE_X = 0.733`, `RATE_X = 2.82`) + my
`demoTimeline.js`. Every arm is a `git archive` extraction into the scratchpad with
`node_modules` symlinked; **no figure in this file was taken from the shared working tree**,
which carried the effects and enemy lanes' live edits throughout.

**Sampling rate, both sides, every temporal figure.** Arcade:
`ffmpeg -ss T -i .reference-cache/video/ab2-longplay-60fps.mp4 -frames:v N -vsync 0`,
consecutive 60 Hz. Ours: one `window.__step(1)` per sample, state read in the same
`page.evaluate`. **Page errors: 0** in every browser arm in this file.

**Scripts, all committed, all with selftests**: `judging/R11/sight.py` (16/16),
`judging/R11/sight_probe.mjs` (6/6), `judging/R11/roll_check.mjs` (9/9),
`judging/R11/gun_check.mjs` (4/4), plus `judging/R11/pairsheet.py` (the hand-reading panels).
**Evidence images, with the generator that made each and its crop stated on the panel
itself** (gitignored, large): `tools/out/combat-r11/evidence/` — `w1/w2/w3-marks.png` are
49x49 px crops centred on every surviving detection at 3x; `pair-w1.png`, `pair-w3-a.png`,
`pair-w3-b.png` are 2x crops of x in [sight-260, sight+260], y in [120, 560] of the
1028x720 frame, with the ruler drawn in frame-pixel units. Raw detections:
`tools/out/combat-r11/w{1,2,3}-sight.csv`.

---

## 0. HEADLINE

> **`ask-combat.md` asked me to make the sight move 1/2.95 of the jet. I measured the arcade
> myself and the ratio is 1.02 ± 0.03 — the arcade's sight and its aircraft share a screen
> column. Ours is 1.000000 and already was. The ask is withdrawn by both lanes; `combat.js`
> is unchanged except for a comment recording why it must not be "fixed".**
>
> **The 2.95 was two correct measurements of two different objects, and the jet half of it was
> reading ENEMY aircraft.** The quantity that really was 3.5× too wide is `ENVELOPE_X`, which
> §1.5 of `lane-feel.md` had just declared matched and frozen. Reported to the feel lane the
> hour I had it; they re-measured, retracted, and cut `ENVELOPE_X` 2.6 → 0.733 in the same
> round. **Our rail is now ±9.848 %W against the arcade's ±9.85 %W.**

> **The attract loop never lost a barrel roll to the plant change. With deaths suppressed —
> the operator `demoTimeline.js`'s own header demands, in capitals — both trees fire TEN and
> the rolls land on the SAME TICK.** `ask-flow.md`'s 10 → 9 was measured on
> `?fixed=1&demo=1` with no `invincible=1`: the slam at t = 88.117 s fell inside a death
> sequence. The same operator reads 7 / 8 / 6 / 6 across four seeds on one tree.

---

## 1. JOB 1 — THE ARCADE'S JET : SIGHT RATIO, ON MY OWN DECODE

### 1.1 The instrument, and the false positive it produced before the gate existed

`judging/R11/sight.py`. The subject was identified first by cropping and looking:
`-ss 210.0` f0001 (stage 4, HUD digit `4`), the glyph at (618, 362) blown up 10× is **four
L-shaped corner marks on a 17 × 17 px square of a 1028 px frame = 1.65 %W** — which is R10's
third operator's figure for the same object (`judging/R10/feel-critique.md` §2.4). It is
**white on stage 1 and black on stage 4**, so both polarities are searched.

Operator: integral-image shape test over every (x, y, S), S ∈ 14…20 — total ink in range,
hollow centre, four corner quadrants present, **middle row band empty across the full width**,
and an **isolation ring** of 3 px outside the box that must contain no ink. Selftest **16/16**:
both polarities, 15/17/19 px recovered at the right S, centre to ≤1 px, a 54 px **lock bracket
rejected** (that is the other four-corner glyph in the frame, 5.2 %W), a solid square rejected,
a **hollow outline box rejected**, 4 % salt noise → 0, two glyphs both found, a glyph touching a
bright bar rejected by the ring, and two tracking controls.

> **An edge-midpoint test was tried first, passed every synthetic, and REJECTED THE REAL
> GLYPH** — AV1 ringing widens the arcade glyph's top-left arm to 7 px against the top-right's
> 6, so a window centred on the box centre clips an arm. Replaced by the middle-row-band rule,
> and the dead end is recorded in the file so the next reader does not re-add it.

**Identity rule**: after R10 withdrew an NCC tracker that locked onto a fireball, a single-frame
detection is never published — a detection is kept only inside a run of ≥4 consecutive frames
moving ≤14 px/frame.

> **Its first run on real frames put 18 of 20 detections on the HUD's MISSILE ICONS**, which
> are four-corner-shaped at the right size. **Cropped and looked at** (`w2-marks.png`), then
> gated with a world band (y ∈ [0.085, 0.875] H) that is stated in the file rather than hidden.
> CLAUDE.md names this exact trap and it still fired.

### 1.2 The arcade's SIGHT envelope — R10's rails reproduced to the tenth of a pixel

| window | seek | frames | stage (HUD digit) | detections | sight x (px of 1028) |
|---|---|---|---|---|---|
| w3 | `-ss 520.0` | **420 consecutive** | **12** | **63** | **[415.5, 618.0]** |
| w2 | `-ss 210.0` | 20 consecutive | **4** | 20/20 | [598.5, 618.0] |
| w1 | `-ss 98.5` | 300 consecutive | **1** | 15 | [535.0, 608.5] |

**All 63 w3 detections and all 20 w2 detections were cropped and looked at (`w3-marks.png`,
`w2-marks.png`): 83 of 83 are the sight glyph, zero false positives.**

> ### **ARCADE SIGHT HALF-ENVELOPE: ±9.85 %W about 50.27 %W** (415.5 / 618.0 of 1028)
> R10 published **[416, 618]** from a different operator on different windows, and
> ±9.83 / ±10.12 %W from two operators across four stages. **This is a third, independently
> written detector landing on the same two numbers to the tenth of a pixel.**

w1 also re-reads R10's onset: the sight steps **+6.5 px/frame** through f0105–f0115, the
saturating value R10 measured.

**Honest bound on the population.** 63 of 420 frames yield a detection, because the isolation
ring rejects any frame where the glyph overlaps the airframe, terrain or an explosion. That
selection favours "sight over clear sky". It cannot inflate the envelope — it can only miss
excursions — so ±9.85 %W is a **lower bound on the sight's range**, measured on frames selected
for legibility and not for position.

### 1.3 THE RATIO — the jet read as an OFFSET from the detected sight column

Reading a **difference against a drawn line** rather than two absolute ruler reads: for each
frame, a 2× crop centred on the detected sight x with the sight column drawn magenta and a tick
every 20 px (`judging/R11/pairsheet.py`, output `pair-w1.png`, `pair-w3-a.png`, `pair-w3-b.png`).
Read point: the midpoint of the player F-14's **two** afterburner nozzles — the twin pair is
what distinguishes the player from every enemy in frame, and it is only reliable at 2×.

| frames | stage | sight x | jet nozzle-midpoint − sight x |
|---|---|---|---|
| w3 f0017 / f0021 / f0026 / f0031 | 12, **LEFT rail** | 415.5 | +4.7 / +3.9 / +4.7 / +3.4 px |
| w3 f0129 / f0135 / f0261 / f0279 | 12, **RIGHT rail** | 617.5–618.0 | ≈0 / +1.3 / −1.3 / −1.6 px |
| w1 f0105 / f0110 / f0115 / f0120 | 1, mid-traverse | 535.0 → 608.5 | +0.8 / 0 / −0.5 / −0.5 px |

> ### **THE ARCADE'S JET AND ITS SIGHT SHARE A SCREEN COLUMN.**
> Rail-to-rail: **Δsight = 202.5 px, Δjet = 198 ± 5 px → ratio 1.02 ± 0.03.** The largest
> offset anywhere in twelve frames across two stages is **5 px = 0.49 %W**, and across w1's
> 73.5 px traverse the jet tracks the sight to **≤1 px**.
>
> **There is no 2.95.** The arcade's aircraft does not roam three times its sight; it roams
> exactly as far, which means its **aircraft** half-envelope is also **±9.85 %W**.

### 1.4 WHERE THE 2.95 CAME FROM — `arcade_jet_x.csv` is not the player aircraft

I re-extracted six of that file's own rows, at full resolution, and read the twin-nozzle F-14:

| csv row | its value | my read | what sits at its value |
|---|---|---|---|
| 1 f005 t=94 | 22 %W | **50.8 %W** | the carrier, or the left-hand enemy at 27.7 %W |
| 4 f005 t=206 | 20 %W | **55 %W** | forest |
| 4 f012 t=213 | 76 %W | **46.7 %W** | a grey cloud |
| 12 f004 t=517 | 77 %W | **≈61 %W** | one of several enemies |
| 12 f012 t=525 | 78 %W | **52.8 %W** | the enemy being shot at, upper right |
| 12 f021 t=534 | 19 %W | **44.7 %W** | an explosion over terrain |

t = 94 is four seconds after the catapult launch with the carrier still in frame and the player
dead centre; 22 %W is not it. **Every arcade frame I read, in any window, puts the player
aircraft inside 44.7–61 %W** — i.e. inside −5.3 / +11 %W of centre, consistent with the ±9.85 %W
rail to within my reading error.

> **This is not a careless reader; it is a resolution limit, and I reproduced the failure
> myself.** On a 0.55-scale contact sheet I read stage-1 f012's player at **70.8 %W**. Zoomed
> 2× it is **49.6 %W** — what I had read was an explosion plume beside a cloud. At 0.4 scale the
> single-nozzle enemies and the twin-nozzle player are not separable. **The sheet scale is part
> of the operator and was not stated.**

### 1.5 OURS — exactly 1.000000, and the `up.x` term is why

`judging/R11/sight_probe.mjs --mode rails`, **1 260 consecutive 60 Hz ticks** through the full
rail → rail → rail script including the 66.5° world-roll saturation, 0 page errors. Three
quantities read every tick:

| | `5e3d57e` | `final` (ENVELOPE_X cut) |
|---|---|---|
| jet SCREEN half-envelope (`game.js jetNdcX`, live camera) | ±34.9326 %W | **±9.8483 %W** |
| sight SCREEN half-envelope (`__sight().ndcX`, live camera) | ±34.9326 %W | **±9.8483 %W** |
| **max \|jet − sight\| over all 1 260 ticks** | **3.3e-14 %W** | **1.2e-14 %W** |
| `playerNdc.x` (combat.js's PITCH-ONLY frame) half-envelope | ±35.1505 %W | ±10.5998 %W |
| **max \|jet_screen − playerNdc_unrolled\| on one tick** | **17.41 %W** | 2.33 %W |

**Our jet : sight screen ratio is 1.000000 at every bank angle, and that is structural, not
tuned.** The sight is placed in the pitch-only frame and viewed through the rolled camera, so
its screen offset from the jet is `R(roll) · (up · SIGHT_FRAC)`, and `R(roll) · screenUp ≡
(0, 1)` identically — the lateral component is exactly zero by construction. The `up.x` term
that `ask-combat.md` reads as "an offset that can only add to the jet's excursion" is the term
that **cancels** the rotation; deleting it would make the sight swing ±10.5 %W off the jet under
bank, which is the defect R6's `ask-flow.md` A1 found and this expression fixed.

> **The ask's premise on our side was a frame mismatch.** `probe_r11.mjs --mode resp` traces
> `px = __fairness().playerNdc.x` for the jet and `__sight().ndcX` for the sight. The first is
> this file's pitch-only coordinate, which rotates with bank by construction and is not a screen
> position; the second is a live-camera screen position. **On the same tick they differ by up to
> 17.41 %W.** `game.js`'s `jetNdcX` is the comparable one and nothing was reading it.
>
> This also settles `lane-feel.md` §1.4's "the ratio between the two jet readings is 1.993 and
> all of it is CAMERA ROLL": it is not two readings of the jet, it is the unrolled coordinate
> against the screen one. Its **conclusion** — that the released reading is the real rail — is
> right, and `jetNdcX` confirms it independently at every roll angle.

### 1.6 WHAT I CHANGED IN `combat.js`: NOTHING THAT RUNS

A 20-line comment at the sight derivation recording the arcade ratio, the structural reason ours
is 1.000, the probe and its figures, and an explicit **"do not compare `playerNdc.x` with
`__sight().ndcX`"**. No constant moved. The blind-vs-tracking comparison and the gun's hit
geometry are therefore **untouched by me by construction** — but they were moved by the envelope
cut that my measurement caused, and §3 measures that.

---

## 2. JOB 2 — THE ATTRACT LOOP FIRES TEN

### 2.1 The lost roll was a DEATH, not the plant

`judging/R11/roll_check.mjs` (selftest 9/9) logs every tick, reads sim time from
`__combatStats().simTime` rather than the tick index (the attract loop does not start at tick 0),
and **attributes** each roll to the scheduled slam it belongs to — `demoTimeline.js` schedules
one at phase 8.0 s of each 16 s cycle, so over 160 s the authored set is t = 8, 24, … 152 s.
9 600 consecutive 60 Hz ticks per arm.

| tree | `invincible` | seed | rolls | missing cycles |
|---|---|---|---|---|
| `5e3d57e` | no | 3 | **10** | — |
| `82daaa4` | no | 3 | **9** | **5 (t = 88.1 s)** |
| `5e3d57e` | **yes** | 3 | **10** | — |
| `82daaa4` | **yes** | 3 | **10** | — |

**With deaths suppressed both trees fire ten, and all ten land on the same tick to the
millisecond** (8.117, 24.117, 40.117, 56.217, 72.217, 88.117, 104.217, 120.217, 136.200, 152.200
in both). The probe's state log explains the 9: the flow state transitions **into** `flight` at
**t = 88.783 s**, i.e. the scheduled slam at 88.117 fell inside a death sequence, where the
attract pilot is not driving. The same is true of every missing cycle in every arm I ran — the
state log shows a non-flight → `flight` transition after the slam each time.

The cause is not `ACCEL_RATE` at all: `82daaa4` also carries the lock change, which moves when
the player dies. **A roll count measured on `?fixed=1&demo=1` is a statistic about where the
player happens to die.** On one tree it reads 7 / 8 / 6 / 6 across seeds 1 / 3 / 5 / 11.

This is the same operator caveat the AMPLITUDES block of `demoTimeline.js` already carries for
the roam statistics — *"measure it with deaths suppressed"* — applied to the roll count for the
same reason. It is now written into the file beside the slam constants.

### 2.2 The roll count after my changes, three seeds, both operators

`final` tree (feel lane's cut envelope + my `demoTimeline.js`):

| operator | seed 1 | seed 3 | seed 5 | seed 11 |
|---|---|---|---|---|
| **deaths suppressed** | **10 / 10 authored, 0 unauthored** | **10 / 10, 0** | — | **10 / 10, 0** |
| deaths on | 7 | 8 | 6 | 6 |

### 2.3 The deadband is removed, and it was inert

`STICK_DEADBAND_X = 0.01` was R10's half of a fix it asked another lane to finish (interface F2).
**F2 landed**: `player.js` now carries `ROLL_SLAM_MIN_X = 0.5`. 0.5 strictly dominates 0.01, so
the deadband could not fire on anything the trigger would have accepted. Two trees differing
**only** by this constant:

| | rolls (inv, seed 3) | cruise cx sd | canyon cx sd | rolls, deaths on, seeds 1/3/5/11 |
|---|---|---|---|---|
| deadband present | 10, 0 unauthored | 3.652 %W | 0.759 %W | 7 / 8 / 6 / 6 |
| **removed** | 10, 0 unauthored | 3.654 %W | 0.768 %W | 7 / 8 / 6 / 6 — **same cycles missing** |

### 2.4 The header is corrected, and one correction is larger than the ask

`ask-flow.md` asked for two: `ACCEL_RATE` is gone so `zeta` is moot, and `KD = 0.414` with it.
Both done. **A third was needed and was not in the ask**: `RATE_X` is no longer `3.0 *
ENVELOPE_X` — it is an independent 2.82 — so the header's `KP = 3*GAIN` is false laterally. The
loop in normalised units is

```
u' = KP * (target - u),   KP = GAIN * RATE_X / ENVELOPE_X   (lateral)
                          KP = GAIN * 3.0                   (vertical, still coupled)
```

which is **3.847 × GAIN today** against the 3.0 × GAIN the file claimed. Corrected in place.

> **The envelope cut is invisible to this file, and that is the R10 design decision paying
> off.** Every curve here is authored in normalised screen position and the loop divides by
> `ENVELOPE_X`, so `u'` has no `E` in it. **Both of player.js's lateral constants moved in one
> round and not one constant in `demoTimeline.js` had to be re-solved.** R10 explicitly
> rejected the shorter patch — re-solving the sines against the rates — on the grounds that it
> "re-breaks the moment anyone retunes `RATE_*`". It would have broken by 3.5× this round.

### 2.5 THE GAIN DID NOT MOVE, AND THE REASON IS A REFUTED TARGET

The rule that chose `CONTROLLER_GAIN = 1.0` is void: with a pure-integrator plant a
proportional loop is first order and **cannot overshoot at any gain**, so "the largest gain that
cannot oscillate" has no referent. Measured on the `final` plant, deaths suppressed, seed 3,
9 600 consecutive ticks:

| GAIN | KP | rolls / 160 s | unauthored | cruise cx sd | canyon cx sd | canyon cy p5 |
|---|---|---|---|---|---|---|
| **1.0** | 3.847 | **10** | **0** | 3.654 %W | 0.768 %W | 57.25 %H |
| 2.0 | 7.694 | **10** | **0** | 3.707 %W | 0.627 %W | 60.25 %H |
| 3.0 | 11.541 | **10** | **0** | 3.720 %W | 0.590 %W | 61.34 %H |

> **R10's ringing result is REFUTED on the new plant** — GAIN 2.0 fired **18** rolls under the
> second-order plant and fires **exactly ten** under this one, as does 3.0 at a KP nearly four
> times R10's. The trigger-manufacturing failure mode went with the ramp that caused it.

**I measured the same table on the pre-cut envelope first, and by the minimax rule this file
already uses for the vertical amplitudes, GAIN 2.0 won it** (worst |deviation| over {cruise
12.88, canyon 2.59}: 1.0 → 0.377, 2.0 → 0.209), recovering canyon cx sd to 2.389 %W against the
pre-R10 build's own 2.40 and the entry dip from cy p5 57.25 → 60.25 %H. **I did not ship it,
because the targets it wins on are refuted:**

> **ADOPTED #122's cruise cx sd 12.88 %W and canyon 2.59 %W are impossible against the arcade's
> own rail. No distribution inside ±9.85 %W has sd 12.88.** They are stated against a rail that
> no longer exists and, worse, against one the arcade never had. Cruise cx sd is now 3.65 %W and
> **cannot be driven to 12.88 at any gain.**
>
> `lane-feel.md` §1.3 resolved this exact tension by assigning 12.88 to the aircraft and
> ±9.83 %W to the sight — *"neither is wrong, they are two different objects"*. **With the ratio
> at 1.00 that resolution collapses: they are the same object, and #122's figure is refuted on
> the arcade's own rail.** It is ADOPTED from the old prototype and has no arcade column.

With no anchor, "the loop tracks the authored curve more closely" is a **direction**, not a
distance — STATUS row 44 exactly. **So the gain stays at 1.0 and the three-gain table stays in
the file**, one line to change the day an arcade column for the roam's spread exists. **Owed to
the criteria lane: #122's two spread figures need re-deriving or retiring.**

---

## 3. WHAT THE ENVELOPE CUT DID TO AIMING — the comparison the charter asked for, re-run

My change does not move the sight. **The feel lane's does**, by 3.5×, after their lock result
was published, so I re-ran both weapons across the cut. Identical pilots, identical trigger
cadence, `?fixed=1&invincible=1&seed=3`, 5 400 consecutive 60 Hz ticks per arm, 0 page errors.

| weapon | arm | `82daaa4` (rail ±34.93 %W) | `final` (rail ±9.85 %W) |
|---|---|---|---|
| **missile** (`probe_r11.mjs --mode combat`, gun never fired) | still | 4 | 4 |
| | track | **18** | **11** |
| | **blind share** | **22.2 %** | **36.4 %** |
| **vulcan** (`gun_check.mjs`, trigger held all 90 s, 100 % vulcan kills both arms) | still | 21 | 21 |
| | track | **50** | **37** |
| | **blind share** | **42.0 %** | **56.8 %** |

> **The lock lane's headline survives the cut in direction and loses about a third of its
> margin.** A motionless stick is still far weaker than a tracking one on both weapons — but
> the blind share rose 22 → 36 % on missiles and 42 → 57 % on the gun, and **it rose entirely
> because the TRACKING pilot lost kills (18 → 11, 50 → 37) while the blind pilot's score did not
> move at all (4 → 4, 21 → 21).** That is the signature of lost reach, not of a weaker weapon:
> the sight can no longer be flown onto targets it used to cover.

**The mechanism is a coupling nobody has priced, and it is in my file.** `ASSIST_RADIUS_FRAC =
0.13` and `LOCK_RADIUS_FRAC = 0.083` are **screen-space radii about the sight** and did not
move. The sight's reachable half-range fell 34.93 → 9.85 %W. So the gun's assist cone went from
**0.37× of the sight's entire reach to 1.32× of it** — a cone wider than the thing that aims it
— and the lock cone from 0.24× to 0.84×. **STATUS's row-41 warning was that cone width, sight
speed and acquisition time are one coupled system; the envelope is the fourth member of it and
was not on the list.**

**I did not retune either radius.** `LOCK_RADIUS_FRAC = 0.083` is the only arcade-anchored figure
either has (GAME_SPEC §3, 80 px of 960); `ASSIST_RADIUS_FRAC = 0.13` has no anchor at all, and
cutting an unanchored constant to move a ratio with no target is how this project got ledger row
41. **Published as the round's clearest OPEN item instead.**

**Caveat on the probe's own pilot, stated because it is the same class of defect as §1.5**:
`probe_r11.mjs`'s `track` arm steers on `best.ndcX − sight.ndcX`, which mixes `__combatStats`'s
pitch-only enemy NDC with the sight's live-camera NDC. The mismatch is bank-dependent and
**shrinks** with the envelope (max 17.41 → 2.33 %W), so it works in favour of the `final` arm and
cannot be what produced the 18 → 11 fall. `gun_check.mjs` inherits the same pilot and the same
caveat, and reproduces the direction on a different weapon with a different trigger.

---

## 4. OPEN, with reasons

1. **`ASSIST_RADIUS_FRAC` and `LOCK_RADIUS_FRAC` against the cut envelope.** §3. The gun's assist
   cone is now wider than the sight's entire reach. The quantity that would settle it is the
   arcade's own gun convergence or assist behaviour, which nobody has measured; a ratio-matching
   retune would be unanchored.
2. **REFERENCE #122's cruise cx sd 12.88 %W / canyon 2.59 %W.** §2.5. Impossible against the
   arcade's measured ±9.85 %W rail. Criteria lane's file, not mine.
3. **The attract loop is losing a third of its choreography to deaths.** §2.1–2.2. With deaths
   on, the `final` tree fires 6–8 of 10 authored rolls across four seeds, against 8–10 before the
   cut; the death-proxy count rose on 3 of 4 seeds. The cut put the attract pilot in the middle
   of the screen, where the fire is. This is the attract loop a passer-by watches and it is
   cross-lane (spawner lethality × flow deaths × the new envelope) — **named, not fixed, because
   fixing it in `flow/**` alone would mean suppressing deaths in attract mode, which is a design
   decision and not a repair.**
4. **The arcade's jet envelope beyond the sight's legible frames.** §1.2. My 63/420 detection
   rate selects frames where the glyph is over clear sky. The envelope is therefore a **lower
   bound**; a frame where the aircraft is pushed past the sight's rail would not be visible to
   this operator. Nothing in 12 paired reads or 6 spot frames showed one.
5. **The sight's VERTICAL relation to the aircraft is still not a screen-frame quantity.** Out of
   scope per `ask-combat.md`, and my frames corroborate R7's criteria finding rather than settle
   it: in `-ss 210.0` f0001 and `-ss 520.0` f0021 the sight sits **below** the airframe, where our
   `SIGHT_NDC_Y_OFFSET` puts it 0.30 NDC above. Two frames is not a measurement; flagged only so
   the next lane knows the question is still live.

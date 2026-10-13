# R11 — INDEPENDENT JUDGE REPORT

**Tree judged**: `fd833f6`, verified clean for `src/` at the time of every measurement
(`git diff --stat HEAD -- src/` empty; the only untracked files are the concurrent art- and
feel-critic lanes' own scripts under `judging/R11/`). Fresh context. Every figure below is my
own measurement on my own instrument unless it is explicitly labelled as a lane's figure.

> # SCORE: 8 / 10 — up from R10's 7.5
>
> **Motion 7.5** (R10: 6.5) · **Stills 8.5** (R10: 8)
>
> The lateral envelope is the largest single fidelity gain this project has made and it
> verifies to four significant figures on three quantities at once. The enemy redraw closes
> the ranked-first stills gap. Against that, **the game still plays itself**: with the gun
> enabled a motionless stick scores **91 % of a tracking pilot's kills** on my own probe at
> n = 3 seeds — *worse* than the 85 % the feel lane published — and the missile, one of the
> four things the owner has named, received no work at all this round.

**My own instruments**: `judge_probe.mjs` (kills, rails) and `death_pixels.mjs`, written
without copying the lanes' pilot or trigger logic so a shared defect could not produce
agreement. Both are in the scratchpad, not committed; every number below states its arms,
its n and its sampling rate. **Sampling rate, both sides, every temporal figure**: ours one
`window.__step(1)` per sample; arcade `ffmpeg -ss T -i ab2-longplay-60fps.mp4 -frames:v N
-vsync 0`, consecutive 60 Hz. **Page errors: 0 in every browser arm in this report.**

---

## 1. WHAT I RE-MEASURED AND WHAT SURVIVED

### 1.1 THE ENVELOPE — SURVIVES, to the digit, on an independently written probe

`judge_probe.mjs --mode rails`: settle on the left rail, release, full right, release, one
`__step(1)` per sample, reading `__sight().ndcX` (a live-camera screen position).

| | lane's claim | **my measurement** | arcade |
|---|---|---|---|
| sight half-envelope | ±9.85 %W | **±9.8483 %W** | ±9.85 %W |
| plateau rate | 0.379 fracW/s | **0.37888 fracW/s** | 0.379 fracW/s |
| rail → rail | 32 ticks / 0.533 s | **31 ticks / 0.5167 s** | ~0.527 s (derived) |
| max frame divergence \|sight_screen − playerNdc\| | 2.33 %W | **2.3264 %W** | — |

The 1-tick difference on traverse is a boundary definition (first-moving step to last-moving
step inclusive); both readings bracket the arcade's derived 0.527 s.

> **ONE CAVEAT THE ROUND SHOULD STOP OVERSELLING: these are three figures with two degrees
> of freedom.** Rail ÷ rate = traverse time by arithmetic (19.70 ÷ 0.3789 = 0.520 s). The
> traverse row is not an independent third confirmation — what it *does* independently test
> is that there is no acceleration ramp left, which is Job 3's result arriving in Job 1's
> table. Publish the set (STATUS row 58 is right to demand it); do not count it as three.

**My own plateau operator first returned a clean, stable, wrong ZERO** — I took the median
over all 199 steps of a 200-tick segment of which 31 move. Fixed before publishing, and both
populations (31 moving / 199 all) are now printed. Recorded because it is the round's own
lesson arriving on the judge.

**The arcade column spot-checked by a fourth look.** I decoded `-ss 520.0`, 300 consecutive
frames, and cropped f0017 and f0129 at 3× with the claimed sight columns (415.5 / 618.0 of
1028) drawn in magenta. The four-corner sight glyph is present in both and sits on the drawn
column to within my visual reading error (±3 px ≈ ±0.3 %W). Generator and crop boxes are
burned into the image label. **R10's `[416, 618]`, the R11 combat lane's `[415.5, 618.0]`
from a detector written without sight of it, and this are four independent looks at the same
two numbers.** I accept ±9.85 %W.

### 1.2 THE RAMP — SURVIVES. Peak step on tick 1, hold-station intact

`ACCEL_RATE` is gone from `player.js`; `this.vx = cmdVX` at line 696. My rails trace shows 31
moving steps of equal magnitude (`plateauMax` 0.63147 vs `plateauMedian` 0.63147 — identical
to 12 significant figures), i.e. a pure rate control with no ramp, peaking on tick 1 against
an arcade that reaches full lateral rate in one frame.

### 1.3 THE DEATH HOLE — SURVIVES, and I verified it at the PIXELS, not at the predicate

The TL reported its own operator failed its control twice. `__explBusy()` is **the predicate
the fix is gated on**, so confirming the fix with it is circular. I screenshotted every tick
across the boundary instead (`death_pixels.mjs`, `?fixed=1&demo=2&seed=1&forcedeath=2.0`,
full frame 960×672 → 240×168, no spatial crop, tick and phase stamped on every panel):

```
t 3.7833 starburst  residue drawing      t 3.8333 starburst  EMPTY  <- the one hole tick
t 3.8000 starburst  residue drawing      t 3.8500 tumble     hulk on screen
t 3.8167 starburst  residue drawing      t 3.8667 tumble     hulk on screen
```

**Exactly one empty rendered frame = 0.017 s. Claim confirmed.** And the "before" figure is
recoverable from my own capture without rebuilding the old tree: the residue's last drawn
tick (3.8167) is a property of the explosion field, which `deathSequence.js` does not touch,
and the old phase ended at `starburst_start + STARBURST_S` = 2.717 + 1.3 = 4.017 s. That is
**11 ticks / 0.183 s of empty sky**, confirming the lane's 12 ticks / 0.200 s to within one
tick by an independent route.

### 1.4 THE ENEMY REDRAW — SURVIVES exactly

Recomputed from the committed PNGs over `alpha > 0`, both Rec.601 and Rec.709 luma (they
agree to 0.1 pt on every sheet):

| sheet | frac L<80 | mean L | lane's claim |
|---|---|---|---|
| `enemy-grey-head.png` | **33.9 %** | 119.0 | 33.9 %, 119.0 ✔ |
| `enemy-grey-rear.png` | **36.5 %** | 111.2 | 36.5 % ✔ |
| `enemy-camo-head.png` | **91.2 %** | 57.1 | 91.2 % ✔ |
| `enemy-interceptor-head.png` | 32.8 % | 104.8 | — |
| `enemy-prop-head.png` | 33.8 % | 87.5 | — |

**Six distinct alpha planes over the sixteen sheets**, md5-counted: `{grey,camo}×{head,rear}`
share two drawings as declared, `interceptor` and `prop` each own two. Claim confirmed, and
the lane's own footnote is the honest one — *per aspect* the count went 2 → 3, not 4 → 6.

---

## 2. WHAT DID **NOT** SURVIVE

### 2.1 THE ROUND'S TOP OPEN ITEM IS A NULL LEVER. Narrowing `ASSIST_RADIUS_FRAC` will not work.

Both lanes close on the same recommendation: *"the next move on R10 gap 3 is the gun's assist
cone"*, because `ASSIST_RADIUS_FRAC = 0.13` is now 1.32× the sight's entire reach. **I ran the
isolation and the lever is inert over the whole range it was proposed to move through.**

`?gun=assistrad=…`, seed 3, 90 s = 5 400 consecutive ticks, identical trigger cadence in every
arm, `invincible=1`, 0 page errors:

| `assistrad` | still (gun/mis/**tot**) | track (gun/mis/**tot**) |
|---|---|---|
| **0** | 8 / 6 / **14** | **1** / 7 / **8** |
| 0.05 | 13 / 12 / **25** | 24 / 9 / **33** |
| 0.0985 (= the sight's whole reach) | 18 / 9 / **27** | 25 / 9 / **34** |
| **0.13 (shipped)** | 18 / 5 / **23** | 20 / 7 / **27** |

> **Cutting the cone to the sight's reach, or to half of it, does not reduce the blind pilot
> — it does not reduce the gun at all.** Only `assistrad = 0` collapses it, and there the
> *tracking* pilot's gun falls 20 → 1, i.e. the gun becomes unusable for everyone. There is
> no setting of this constant that makes aiming matter.
>
> **The mechanism, from the code and confirmed by the sweep**: the assist is effectively
> binary. `vulcan.js:242-246` interpolates a round's screen position *and its depth* linearly
> in the same parameter `p`. With the assist, `targetDepth = best.d * lead`, so the round
> reaches the target's depth exactly where it reaches the sight — hits resolve at the sight.
> Without it, `targetDepth = DEFAULT_TARGET_DEPTH = 55` from a `startDepth` of 5
> (`combat.js:211`), so a round crosses the **measured median gun-kill depth of 6.17** at
> **p = (6.17 − 5) / 50 = 0.023** — 2.3 % of the way from the nose to the sight, i.e. still
> at the muzzle. The R8 span gate bounds *which* targets may be killed; nothing bounds
> *where along the round's path* a kill may resolve.
>
> **So this is not a cone-width problem and must not be tuned as one.** Candidate repairs:
> ramp an unassisted round's depth to the readable depth rather than to 55, or gate the hit
> test on the round's own `p` so it can only score near its aim point.

**Caveat, stated because it bounds the table**: n = 1 seed per cell, and arms with different
constants diverge chaotically through the shared PRNG, so the 23/25/27 spread across the
three non-zero widths is within noise. The `assistrad = 0` effect (20 → 1 on the gun) is 20:1
and is not. The *null* result is the robust one: three cone widths spanning 2.6× produce no
downward trend whatever.

### 2.2 THE BLIND SHARE IS WORSE THAN PUBLISHED — 91 %, not 85 %

Shipped tree, my probe, gun **on**, 5 400 consecutive ticks, three seeds, identical trigger
cadence, pilot steering on the **sight** (`playerNdc + 0.30 NDC`) in `combat.js`'s own
pitch-only frame — the frame both the lock cone and the assist cone are resolved in:

| seed | still | track | blind share |
|---|---|---|---|
| 3 | 23 (18 gun / 5 mis) | 27 (20 / 7) | 85.2 % |
| 5 | 29 (19 / 10) | 31 (21 / 10) | 93.5 % |
| 11 | 24 (16 / 8) | 25 (18 / 7) | 96.0 % |
| **mean** | **25.3** | **27.7** | **91.4 %** |

The feel lane's 85 % is seed 3 and reproduces exactly at seed 3 — including `still` = 23
[missile 5, gun 18], which my probe returns to the kill. **At n = 3 it is 91 %.** The round's
own correction ("aiming now matters is true of the MISSILE and not yet of the GAME") is
**confirmed and understated**. This is the owner's named complaint and it is open.

> **An honest bound in the other direction, which I found by a bug of my own.** My first
> tracking pilot aimed the **nose** at the target instead of the sight — a 0.30 NDC
> (= 10.5 %W isotropic) systematic error against an 8.3 %W lock cone. It scored **zero**
> missile kills against a motionless stick's four, which is how I found it. But it scored
> **32** gun kills against the sight-correct pilot's 20. An aim-offset sweep (gun only, seed
> 3) locates the gun's real convergence point **below the drawn sight**:
>
> | aim point above the nose | 0.00 (nose) | 0.15 | 0.30 (the drawn sight) | 0.45 |
> |---|---|---|---|---|
> | vulcan kills | 31 | **34** | 27 | 22 |
>
> So the strongest aiming pilot I found takes the blind share to **≈66 %**, not 91 % — and it
> gets there by *ignoring the sight the game draws*. Both readings are bad and they name the
> same defect from two sides: **where the gun kills and where the sight is drawn are not the
> same place.** Measured directly, a motionless pilot's gun kills resolve at a median
> **5.8 %W** and a p90 **14.6 %W** from the drawn sight — a p90 wider than the sight's entire
> ±9.85 %W reach.

### 2.3 CRITERION REPAIR — the stage-1 enemy darkness anchor is biased LOW, and our build is inside the arcade band, not above it

The enemy lane's arcade column for stage-1 darkness (24.2 / 26.2 / 28.8 % at sky-rejection
tolerances 25 / 40 / 60) is read off `reference/stage1-missile-salvo-t100.75.png`, which is
**1028×720 — a smooth 3.2125× upscale of 320×224 hardware**. I verified it is smooth and not
nearest-neighbour before concluding anything: **121 002 distinct colours** in one frame,
median run length **1** along a high-contrast row, with a graded ramp across every edge.

**Instrument validated on known inputs, both sides.** Composite a sprite on its measured sky,
upscale by the longplay's own 3.2125×, re-measure with the same operator:

| known input | native frac L<80 | after the upscale (lanczos / bicubic / bilinear) |
|---|---|---|
| our `enemy-grey-head.png` (ground truth = its own alpha) | **33.9 %** | 21.5 – 23.3 % |
| **arcade** camo enemy A, true-native `ab2-arcade-desert.png` x[145,161] y[60,80] | **48.4 %** | 28.0 – 35.9 % |
| **arcade** camo enemy B, same frame, x[112,124] y[38,52] | **86.4 %** | 48.0 – 65.6 % |

Direction identical on three filters, two arcade subjects and our own ground truth.
**Decomposed by a control**: an area-matched mask (the N·F² pixels furthest from sky, no blend
ring) still reads 37.5 vs 48.4 and 69.6 vs 86.4 — **so the bias is NOT mask growth and cannot
be removed by mask discipline.** Value blending is the larger half; mask growth adds the rest.

> **Consequence.** The upscaled reading is 0.56–0.81× the native. The arcade's stage-1 native
> dark share is therefore roughly **1.23–1.80× the published band** — i.e. the single-subject
> 24–29 % is nearer **30–52 %**, and the three-subject spread of 8–21 % is nearer **10–38 %**.
> **Our 33.9 % sits comfortably inside the arcade band, not "at the top of it and just above
> my own widest reading"** as the lane self-critically wrote. The lane was right to widen the
> band and wrong about where our build sits in it, and the cause was its source frame.
>
> This is a **class**, not one row: *every* stage-1 arcade colour anchor in this repo comes
> off the same resampled decode. The grading matters — interior-mean statistics on a tight
> mask are nearly unaffected; **ΔL against sky** moves only +3.6 to +10.6 L (measured on the
> two native subjects), which is why the lane's own pivot to ΔL as "the decisive number" was
> the methodologically right call; **threshold-crossing shares are the badly affected ones.**
>
> **Binding proposal: a frac-below-threshold statistic may not be read off a resampled frame.
> If no true-native frame of that stage exists, the figure is a bound in a stated direction,
> not a measurement.** The correction factor is subject-dependent, so the corrected bands
> above are bounds, not measurements, and I publish them as such.

The same bias applies to the effects lane's residue column (mean RGB (230, 114, 33), R−G
= +116, read off a 1028×720 decode). Resampling against a blue sky pulls R down and G up, so
the **native R−G is larger than +116** and our +108 is further from the arcade than the
comparison shows, not closer. I did not quantify it — the mask there is palette-based and
blob-interior, which is the mildly-affected class.

### 2.4 THE TL's PROVENANCE CORRECTION IS RIGHT

I was asked to check it and it is correct. `GAME_SPEC.md` §3's own parenthetical reads
*"(prototype: 80 px radius, 0.5 s grace — ADOPTED …)"* in the same sentence that previously
called 8.3 %W "the ONLY arcade-anchored figure for this quantity". Those cannot both be true
and the ADOPTED tag is the correct one. `0b0e21b` fixes it in three places and states the
consequence plainly: **the round's headline gameplay change moved `LOCK_RADIUS_FRAC` to a
number with no arcade column at either end of the ratio. The A/B is the evidence, not the
anchor.** I would add one unverifiable detail the record should carry: nothing here
establishes whether the prototype's 80 px was a radius or a diameter.

### 2.5 THE PAIRING RESULT — I did not reproduce it, and I say so rather than ranking it

The round's strongest claim (lock cut alone takes a 300 ms pilot 16.3 → 5.3 kills; the
envelope cut restores it to 14.3) needs three trees and a latency axis. I did not build it.
**Both lanes already state the binding limitation and it is the right one: the arm has no
arcade column, so it can refute and cannot rank.** It has refuted two claims, one from each
lane, which is exactly what a diagnostic is for. I neither confirm nor dispute the numbers;
I endorse the licence they are published under, and note that the conclusion *"both changes
shipped together and the pair is sound"* rests entirely on an unranked arm and should keep
saying so.

---

## 3. REPRODUCIBILITY OF `judging/R11/` FROM THE COMMITTED TREE

I ran every committed script. **Selftests that exist all pass**: `sight.py` 16/16,
`jet_envelope.py` 11/11, `jet_nozzles.py` 13/13, `fx_r11.py` 39/39, `enemy_census_r11.py`
PASS, `probe_r11.mjs` 7/7, `sight_probe.mjs` 6/6, `death_hole.mjs` 8/8, `gun_check.mjs` 4/4,
`human_arm.mjs` 13/13, `roll_check.mjs` 9/9, `busy_control.mjs` 10/10,
`sheet_in_use_probe.mjs` PASS. That is a strong record.

**Two defects found:**

1. **`demo_check.mjs` does not run from the committed tree.** Line 24 is
   `path.resolve(process.argv[process.argv.indexOf('--root') + 1] ?? ROOT)` — with `--root`
   absent, `indexOf` returns −1 and the expression takes `argv[0]`, **the node binary path**,
   as the repo root. It fails loudly rather than silently measuring the wrong thing, so no
   number is at risk; but it is the probe behind the round's withdrawn "10 → 9 → 8 barrel
   rolls" figure and it cannot be re-run as committed. One-line fix.
2. **The guard pattern landed in one file and not the others.** `probe_r11.mjs` now exits 2
   and names the known set on an unknown `--pilot`, which is the round's own published
   deliverable. Six committed scripts in the same directory still die on an unhandled
   `IndexError` / `KeyError` / `FileNotFoundError` for an unrecognised argument
   (`analyse.py`, `pairsheet.py`, `reach.py`, `sheet.py`, `fairness_pool.py`,
   `pose_geom_r11.py`, `art_critic_r11.py`). Crashes, not wrong numbers — but the fix the
   round published for itself was not applied across the round.

---

## 4. ONE GAP I NEARLY PUBLISHED AND DID NOT — logged as PREVENTED-BY-MEASUREMENT

Comparing our gameplay capture against `reference/stage1-level-flight-t116.png` side by side,
our player F-14 reads **cream and flat** where the arcade's reads **dark gunmetal** — which is
precisely the defect the enemy lane just fixed for the enemies, on the object that is on
screen 100 % of the time. It looked like the rank-1 gap for R12.

**I cropped the true-native frame and looked, and it is refuted.** In
`reference/ab2-arcade-desert.png` at 6× (x[95,220] y[65,135] of 320×224), the arcade's player
F-14 is a **cream/white airframe with dark red panel lines and black-ringed orange nozzles** —
the same light airframe ours has. What made the stage-1 comparison look dark is that it is a
resampled frame of a differently-lit aspect. **Our player sheet measures 32.1 % below L=80
against the arcade enemy band; it is not the pale outlier the side-by-side suggested.**

Reported because the ledger records defects caught and not features prevented, and because
this is the third time in this project that *"native outranks the upscale"* decided a
question — here against the judge.

What the native crop *does* show and no criterion covers: the arcade jet's **afterburner
nozzles are large black rings around a bright core** and carry most of the aircraft's
contrast. Worth a measurement before it is worth a gap.

---

## 5. RANKED GAP LIST FOR R12

Ranked by what most moves a player's *"is this After Burner II?"*, weighted to the owner's
standing priority: **our jet, the enemy jets, the missiles, the lock, responsiveness.**

> ### 1. THE GUN DOES NOT NEED THE PLAYER — AND THE PROPOSED FIX IS A NULL LEVER
> Blind share **91 %** with the gun on (n = 3 seeds, my probe, §2.2). **Do not retune
> `ASSIST_RADIUS_FRAC`** — §2.1 shows 0.05 / 0.0985 / 0.13 are indistinguishable and only 0
> moves it, by breaking the gun for everyone. The defect is that `vulcan.js` ramps an
> unassisted round's depth from 5 to `DEFAULT_TARGET_DEPTH = 55`, so it crosses the measured
> median kill depth of 6.17 at **p = 0.023** of its screen path — still at the muzzle — and
> the hit test has no bound on *where along the path* a kill may resolve. Fix the path, not
> the cone. **Measured target: the gun's kills
> should resolve inside the sight's own reach — today's p90 is 14.6 %W against a ±9.85 %W
> sight.**
>
> ### 2. THE MISSILE GOT NOTHING, IN A ROUND WHERE THE OWNER NAMED IT
> `git log` confirms `src/weapons/missiles.js` is untouched since R10 (`21c789c`).
> `HOMING_GAIN` is ASSUMED, `MAX_TURN_FRAC_PER_S = 0.77` is solved and not measured,
> launch→impact is a **CANDIDATE** 0.43–0.90 s band, and the 2.45 s flight-time tail on
> receding `overtake` targets is unfixed. R10 published the method that closes the
> measurement — *a longplay window with no gun fire, found by targeted search, not a fourth
> operator*. **That search is the single highest-value acquisition on the board** and it is
> smaller than any of the three withdrawn operators that tried to avoid it.
>
> ### 3. THE LOCK IS NOW ANCHORED ON NOTHING AT EITHER END
> `LOCK_RADIUS_FRAC = 0.083` is the old prototype's constant (§2.4). The change is justified
> by an A/B, which is legitimate evidence and not an anchor. The arcade *can* be measured
> here: R10's blind detector already recovered the **lock bracket at 5.246 %W (n = 75)** and
> the **nose sight at 1.493 %W (n = 68)** from 420 consecutive frames. **A bracket's drawn
> size is not the lock radius, but the same detector over a window where a lock is seen to
> acquire would date acquisition and bound the radius from the arcade.** Nobody has tried.
>
> ### 4. A CRITERION CLASS IS BIASED AND THE REPAIR IS CHEAP
> §2.3. Every stage-1 arcade colour anchor is read off a smooth 3.2125× upscale;
> threshold-crossing shares read 0.56–0.81× their native value and the bias survives an
> area-matched mask. Repair: **no frac-below-threshold figure off a resampled frame** — use
> ΔL (bias +3.6 to +10.6 L), or publish a bound with its direction. The enemy-art band
> should be restated; our 33.9 % is inside the arcade's, not above it.
>
> ### 5. THE ATTRACT LOOP IS WHAT A PASSER-BY WATCHES, AND ITS SHAPE IS WRONG BY 80×
> The combat lane built the operator that finds it and declined to act: **median stationary
> run 402 frames (6.7 s) against the arcade's 5 frames**, with ours looking *more* arcade-like
> on the two obvious statistics. It also loses **6–8 of 10 authored barrel rolls to deaths**
> with deaths on, which is the mode a passer-by actually sees. Cross-lane (spawner lethality
> × flow deaths × the new envelope) and correctly named rather than patched.
>
> ### 6. THE VERTICAL AXIS HAS NO ARCADE COLUMN AT ALL
> `RATE_Y` is still welded to `ENVELOPE_Y` and was deliberately not retuned. Worse, the
> combat lane found two arcade frames (`-ss 210.0` f0001, `-ss 520.0` f0021) where **the sight
> sits BELOW the airframe**, against our `SIGHT_NDC_Y_OFFSET` of +0.30 NDC above it. Two
> frames is not a measurement — but the same 60 Hz detector that settled the lateral rails in
> one round would settle this one, and the lateral axis is now so much better anchored than
> the vertical that the asymmetry is itself the risk.
>
> ### 7. REFERENCE #122 IS REFUTED AND STILL ON THE BOOKS
> Cruise `cx sd` 12.88 %W and canyon 2.59 %W cannot be produced by a jet confined to
> ±9.85 %W (a uniform spread over the whole rail has sd 5.7 %W). Both lanes said so
> independently. **Re-derive or retire**; it is currently a target that would require
> breaking the envelope to hit, and the combat lane correctly declined a gain change that
> won on it.

---

## 6. CRITERIA I BELIEVE SHOULD BE RETIRED OR REPAIRED

| | verdict |
|---|---|
| **stage-1 enemy darkness, "24–29 % below L=80"** | **REPAIR.** Source frame is a smooth 3.2125× upscale; the statistic reads 0.56–0.81× native and the bias survives an area-matched mask. Restate as a bound, or switch the gate to ΔL-against-sky, which is nearly resampling-robust. §2.3 |
| **frac-below-threshold on ANY resampled frame** | **NEW BINDING RULE.** Not a measurement. The whole stage-1 reference pack is 1028×720 |
| **"the gun's assist cone is the next move on gap 3"** | **RETIRE as a target.** Measured null across 0.05 → 0.13. The quantity that moves is the round's depth ramp. §2.1 |
| **`ASSIST_RADIUS_FRAC` : sight-reach ratio (1.32×)** | **DEMOTE to a diagnostic.** It is arithmetically true and has no predictive power over the behaviour it was offered to explain |
| **blind-share "83 % → 22 %"** | already withdrawn by the lane; **the replacement should be 91 % at n = 3, not 85 % at n = 1** |
| **REFERENCE #122 cruise/canyon `cx sd`** | **RETIRE.** Impossible against the measured rail. Gap 7 |
| **rail / rate / traverse as three confirmations** | **REPAIR the wording.** Two degrees of freedom; the third row tests ramp-absence, not envelope. §1.1 |

---

## 7. ON HOW THE ROUND RAN

Eleven withdrawals, most of them self-reported by the lane that published the original, two
of them lane headlines. Every one I could check was a real defect honestly characterised, and
the three the TL grouped as *"an instrument run below its own validity floor"* are the same
failure and are correctly grouped. **I verified every surviving figure I had time for against
that shape and found none with it** — the envelope figures are read at full resolution on a
screen coordinate with no identity question in them; the enemy figures are read off our own
alpha plane, which is ground truth; the death-hole figure I re-took at the pixels.

The defects I did find are of a different class and both are structural rather than careless:
a **source-resolution bias** that no amount of operator care removes (§2.3), and a
**mechanism misattribution** where an arithmetically true ratio was offered as a cause and
the isolation says it is not one (§2.1). Neither was findable from inside a single lane.

**The thing most worth protecting**: the combat lane re-ran the feel lane's figure on the
feel lane's own tree and found that their disagreement was two trees both called "wide",
not an instrument fault. That exchange is the dominant failure mode being caught in flight
by the people committing it, and it is why this round's numbers held up under re-measurement
better than any previous round's.

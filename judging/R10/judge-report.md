# R10 — INDEPENDENT JUDGE REPORT

**Judged tree**: `21c789c`. **Fresh context.** Lane reports read for their claims and their
pointers; every number below is my own decode, my own capture, my own operator.

**Working-tree caveat, checked rather than assumed.** `git status` at the start of this pass
showed `src/game/flow/demoTimeline.js`, `src/game/flow/flow.js`, `src/game/game.js` and
`src/main.js` modified. I read the `game.js`/`main.js` diff in full: it is a measurement-only
`stickX/stickY` field on `__flowState` plus the `demoTimeline(simTime, player)` rewiring that
only fires under `?demo=`. **Neither of my capture paths (`?combatexpl=1` and
`?fixed=1&seed=3` + `__setStick`) touches either**, so my figures are HEAD behaviour. I judged
no attract/title screen and ran no `stash`/`checkout`/`reset`/`push`.

**Sampling rate, both sides, everywhere in this report**: arcade 60 Hz consecutive
(`ffmpeg -ss T -i ab2-longplay-60fps.mp4 -vsync 0`), ours 60 Hz consecutive
(`tools/capture.mjs --every 1`, or `window.__step(1)` one tick at a time). The one exception
is §5's withdrawn envelope attempt, sampled at 20 Hz, and it is a *positional extremum* — no
speed claim is made from it, and it is withdrawn anyway.

**Alignment re-derived, not inherited.** `-ss 100.0`, `-vsync 0`, frame `f0046` against the
committed `reference/stage1-missile-salvo-t100.75.png`: **mean |Δ| = 0.0000, neighbours 21.3
and 23.5.** A zero with large neighbours. `t = T_ss + (i−1)/60` holds. Stage identity read off
the HUD digit on every frame used (STAGE 1).

**My instrument**: `tools/out/judge-r10/jm.py`, `--selftest` **10/10** (8-connected labelling
incl. a diagonal chain, each mask on prescribed colours incl. the two it must reject, and a
prescribed 5 %-of-frame patch recovered at 5.00 %). It then **failed on real frames twice**
(§1.3, §5) and both failures are published below rather than the numbers they produced.

---

## 0. SCORE

> # 7.5 / 10
>
> **motion & feel 6.5** (R9: 4) — **stills & art 8** (R9: 9, *lowered on new evidence about
> something that was always true, not on a regression*).

**Why it moved.** Four systems the owner names changed for real and I verified all four
against the source and against my own captures: the explosion's envelope, the missile's hit
test, the lock's acquisition, and the stick's model. None of them is a self-report I had to
take on trust — the fuse is `lat <= HIT_RADIUS_FRAC` at an interpolated depth crossing
(`missiles.js:683-687`), the turn cap is a real per-tick clamp (`:594`), the acquisition is a
sticky timer (`lockSystem.js:321-330`), and the stick's step series is an accelerating ramp
with coast, which I measured myself (§3).

**Why it did not move further.** The two things a player looks at hardest are still wrong, and
neither is a timing problem:

- **The enemy aircraft are the worst drawings in the game** and they are the object on screen
  the longest. The concurrent art critique's census (`enemy-grey-head.png` at **5.7 %** of
  pixels darker than L=80 against the arcade's **25–34 %**) is the single largest remaining
  "would a player mistake this" deficit, and it is not addressed by anything in R10.
- **The jet still slides too far and too fast.** The feel lane measured our sight envelope at
  **3.2–3.5× the arcade's** and declined to change it on one sample — correctly. I measured
  the **jet's** own half-envelope independently at **±0.3505 NDC = ±17.5 %W** and record it as
  a second, cleaner quantity with **no arcade column at all**. That column is the cheapest
  high-value acquisition on the board.

**And the round's process work is the best this project has produced.** Five of the criteria
lane's own figures were refuted during the round, four by the lanes using them; the
ATTRIBUTION HORIZON, the REFUTATION-vs-SELECTION rule and citation field 6 are all sound and I
used all three. **No R10 statistic gated anything, which is the correct answer to the
circularity constraint.**

---

## 1. THE TL'S SUSPICION — tested, and it does not survive

> *"From +217 ms to +533 ms the arcade is a large peach smoke mass filling much of the panel
> while ours is close to clear sky with a small late puff, and our fireball core reads deep red
> where the arcade's is white-hot yellow-white."*

I tested both halves. **Both are readings of
`tools/out/envelope-r10/MOTION-explosion-arcade-vs-ours.png`, and that image cannot support
either.**

### 1.1 THE MONTAGE IS NOT SCALE-MATCHED — the arcade side is magnified ≈2×

Two independent measurements, agreeing:

| | method | arcade panel | ours panel |
|---|---|---|---|
| crop fraction of its own frame | template match of panel 0 over 50 consecutive decoded frames, 6 crop widths | **≈0.37–0.39 W** (W≈380–400 of 1028) | — |
| crop fraction of its own frame | nozzle-disc separation in the panel ÷ the same separation measured natively | **0.35–0.43 W** (arcade native 29 native px, REFERENCE.md line 51) | **0.772 W** (ours native 105 px of 960 = 0.1094 W; panel 8 reads 34 px of 240 = 0.1417) |

**The arcade panels cover about 0.39 of the arcade frame; ours cover about 0.77 of ours.** The
same physical object therefore occupies **≈3.9× more of an arcade panel than of an ours panel**.
Every area read off that montage overstates the arcade by roughly four.

**The montage's panel grid is also not what the concurrent art critique used.** The lower label
band's text runs start at x = 5, 245, 485, 725, … — **13 panels, pitch exactly 240 px**, verified
to the pixel. `judging/R10/art-critique.md` §6 states "15 panels of 208 px" and its table is
therefore **shifted one lag late and mis-integrated**: its *"+217 → 0.5 %"* is really +167, its
*"+433 → 35.6 %"* is really **+333 → 30.3 %**. The shape of its claim survives the regrid; the
numbers and the labels do not.

**And the generator of the montage was not preserved** — `grep MOTION-explosion` finds only
prose. An evidence image whose crop fractions cannot be recovered from the repo is not
reproducible evidence.

### 1.2 At +433, +533 and +667 ms the arcade panel is a CLOUD, not smoke

Measured on the correct 13×240 grid, the arcade panel's "hot-white" share runs
**69.0 → 97.6 → 83.5 %** across those three lags. Crop it and look: the camera flies into a
stage-1 cumulus. The art critique found this independently and corrected its own window to
+217…+433; **I make the cut one lag earlier, at +217…+333**, because +433 is already 69 % cloud.
So *"a large peach smoke mass from +217 to +533"* is wrong for the back half of its own range.

### 1.3 The residue-size gap is NOT ESTABLISHED — and at matched depth it points the other way

The comparable quantity is **residue size ÷ that same event's own fireball size**: both scale
with target depth, so the ratio does not. Measured with one operator on both sides, in an ROI,
on consecutive 60 Hz frames:

| | fireball peak, largest 8-connected component | residue peak | **width ratio** |
|---|---|---|---|
| **arcade**, kill at t = 99.80 (stage digit 1 on every frame) | 305 px = **29.7 %W** | 218×211 px = **21.2 %W** at +400 ms | **0.71** |
| **ours**, `?combatexpl=1`, one event | 171 px = **17.8 %W** | 240 px = **25.0 %W** at +250 ms | **1.40** |

**Our kill residue is about twice as large relative to its own fireball as the arcade's.** It is
not "a small late puff"; in the matched-scale strip I built
(`tools/out/judge-r10/SCALE-MATCHED-explosion.png`, each side cropped at 2.5× *its own* fireball
width) ours is the bigger, more persistent mass of the two.

**The honest bound, and it is the same one the effects lane published.** My first arcade residue
figure was **55 263 px / 28.2 %W at +66 ms**, which would have made the arcade the larger. **I
cropped it and looked: the mask was sitting on the cloud bank**, not on smoke — the peach mask
(`V>0.70 ∧ R>B+Δ ∧ S<0.45`) has no lower saturation bound and a stage-1 cumulus walks straight
in. Adding `S > 0.18` (arcade residue `#f4c8b3` is S = 0.266; cloud is S ≈ 0) fixes the
*reported* blob but **not the attribution** — the mask still flips between cloud and smoke on
neighbouring frames. **I could not obtain a clean arcade residue time-series either, n = 1 on
the arcade side, and `peak` and the decay envelope stay OPEN.** The lane was right to leave them
open and right to refuse to "close" a 5.78-vs-7.20 gap between two different operators.

### 1.4 The core-value claim is REFUTED in the stated direction — and there is a real defect next to it

Same operator both sides: the fire-mask largest component dilated by 3, then every pixel in it
classified by `G/R` and `V`. Colour is depth-free. **Four arcade kills, all stage 1, all 60 Hz
consecutive:**

| hot / yellow / deep-red, % of fireball pixels | +0 ms | +33 | +67 | +100 | +133 |
|---|---|---|---|---|---|
| arcade A, t=99.80 | 8/11/37 | 3/9/45 | 16/13/35 | 19/11/33 | **41**/20/13 |
| arcade B, t=100.90 | 5/3/15 | 3/3/6 | 2/16/1 | **32**/15/18 | **32**/22/15 |
| arcade C, t=101.18 | 5/29/13 | 11/17/21 | 5/10/14 | 4/14/5 | 11/24/7 |
| arcade D, t=101.52 | 3/3/11 | 14/15/31 | 10/18/34 | 11/17/35 | 0/18/0 |
| **OURS** | **21/47**/20 | **16/50**/19 | **0**/32/23 | **0**/34/23 | **0**/36/21 |

**Ours is not deep red where the arcade is white-hot. Ours is the yellower of the two at every
lag** (32–50 % yellow against the arcade's 3–29 %) and is the brighter of the two at first light
(21 % white-hot against 3–8 %). The claim does not reproduce.

**What IS wrong, and nobody has named it:** the arcade's white-hot fraction **peaks LATE** —
+100 to +133 ms on three of four kills (41 %, 32 %, 11 %) — because the fireball *flares again
as it bursts into its debris spray*. **Ours is white-hot for exactly two frames and then zero
forever.** `explosions.js:498` states the premise as fact: *"The decay phases have no white-hot
core: the fire is going out."* **The arcade contradicts that on three kills out of four.**

The matched-scale strip shows the mechanism: the arcade's fireball **fragments** — at +133 to
+200 ms it is a wide, sparse spray of yellow and red chunks over a large area. **Ours stays a
compact lobed ball that only changes colour**, orange → deep red → gone. The deep-red hold at
+167…+267 ms that the TL saw is real; it is not a *value* defect, it is the **absence of a
break-up phase**.

> **So the round fixed the DURATION and left the SHAPE wrong, not the volume and not the value.**

---

## 2. What else I re-measured, and what it cost a lane's claim

| claim | source | verdict |
|---|---|---|
| explosion fire life cut from 41 frames to ~15 | effects lane | **HOLDS.** My own capture: fire above the persistent nozzle floor on frames 73–87 of `?combatexpl=1`, **15 frames = 0.250 s**, and all three cycles in the capture are identical |
| the explosion now leaves peach residue that persists ~0.9 s | effects lane | **HOLDS**, and it is bigger relative to the fireball than the arcade's (§1.3) |
| `src/assets/sprites/explosion.png` shows the fireball is 75.4 % at L≤66 | art critique §6 | **REFUTED — that asset is DEAD.** Neither `explosion.png` nor `explosion-big.png` is imported anywhere under `src/`; `tools/art/build.js` still generates them. The runtime fireball is drawn procedurally in `effects/explosions.js` from `EXPLOSION_PALETTE` (`#9c0000 #c50000 #e67310 #efa410 #ffbd00 #f7f74a #f7f7e6`), a different palette. The "stronger evidence in isolation" measures a file the game never loads |
| the missile's impact test now has a lateral term | feel lane | **HOLDS at source**: `missiles.js:683-687`, `lat = hypot(...)`, `hit = lat <= HIT_RADIUS_FRAC`, evaluated at the interpolated crossing; turn cap at `:594` |
| the lock takes measured non-zero time and the bracket shows it | feel lane | **HOLDS at source**: sticky `acquiring` timer, `LOCK_ACQUIRE_S = 0.22`, arm ramp `ARM_FRAC_TRACK → ARM_FRAC_OF_BOX` |
| the stick has mass; displacement arrives after release | feel lane | **HOLDS, re-measured independently** — see §3 |
| the arcade sight envelope is ±9.83 %W | feel lane | **NOT INDEPENDENTLY CONFIRMED.** My own attempt failed (§5). The lane's own caveat stands and should be honoured |

**One hook hazard worth a line**: `window.__combatDebug()` **consumes a draw from the shared
PRNG** (documented at `combat.js:396`). Any probe that reads it per tick is shifting the enemy
stream relative to a probe that does not. It is fine within one run; it is not fine between two.

---

## 3. THE STICK — re-measured from scratch, and it is the clearest win of the round

`?fixed=1&seed=3&invincible=1`, `__setStick`, **one tick at a time, 60 Hz**: 240 neutral ticks,
then full right for 12 ticks, released, then 90 ticks of nothing. Page errors 0.

```
step per tick, first 12 (NDC):  0.0080 0.0132 0.0174 0.0208 0.0235 0.0257
                                0.0274 0.0287 0.0297 0.0304 0.0308 0.0310
post-release, next 12:          0.0251 0.0206 0.0169 0.0137 0.0111 0.0089
                                0.0071 0.0055 0.0042 0.0031 0.0021 0.0013
```

- **The peak step is the LAST tick of the hold, not the first.** That is a rate controller with
  mass. The committed build's series was a geometric decay from its own first tick.
- **Coast after release: +0.1326 NDC on a total of +0.4192 — 31.6 % of the displacement arrives
  after the stick is let go.** (The lane reports 44 %; theirs starts mid-travel from the opposite
  rail, mine from centre. Same direction, different conditions, and the difference is the
  conditions — not a disagreement.)
- **Overshoot 0.0000** — every post-release step is positive and monotonically decaying. The lane
  explicitly did not claim an oscillation and is right not to.
- **Jet half-envelope: ±0.3505 NDC = ±17.5 %W**, identical left and right (rails, not drift).

**This is a different quantity from the lane's ±31.7–34.8 %W**, which is the *sight's* position
through the rolled camera. Both are real; neither has an arcade column for the **jet**. Publishing
them side by side without that distinction would be the same-name-different-operator class again.

---

## 4. CRITERIA — what to retire, repair, or keep

**KEEP, and I used all three:**
- **Citation field 6** (sampling rate, both sides, plus decode method). Binding and correct.
- **The ATTRIBUTION HORIZON**, including the clause that it is a property of the *capture*. §1.3
  is an instance: my 28.2 %W arcade residue was a selection sitting on a cloud.
- **REFUTATION IS STRONG, SELECTION IS FITTING.** One pair kills a criterion; two license one.

**REPAIR:**

1. **The `smoke` mask needs a saturation FLOOR, and that still will not make it attributable.**
   `V>0.70 ∧ R>B+Δ ∧ S<0.45` admits a stage-1 cumulus. `S > 0.18` separates the arcade residue
   (`#f4c8b3`, S = 0.266) from cloud (S ≈ 0) and is a one-line change to `envelope_r10.py`. It
   fixed my reported blob and did **not** fix the frame-to-frame flip. **Any residue figure must
   ship with its `--marks` crop; mine did and that is the only reason this report does not carry
   a wrong number.**

2. **No montage may be published as evidence without its per-side crop fraction, and it must be
   scale-matched to the subject.** §1.1. The round's headline image is magnified ≈2× on one side,
   its generator is not in the repo, and two separate readers (the TL and the art critique) drew
   quantitative conclusions from it. **Rule: a side-by-side states the crop fraction of each
   side, or it is a picture, not a measurement.**

3. **`judging/R10/art-critique.md` §6** needs its panel grid corrected (13 × 240, not 15 × 208 —
   the label-run starts are at 240 px pitch, verified) and its "authored sheet" corroboration
   **withdrawn** (dead asset, §2).

4. **`explosions.js:498`'s premise is refuted by the arcade** and the comment should say so:
   *"the decay phases have no white-hot core"* is true of our sprite and false of the arcade's,
   which re-flares at +100…+133 ms on three of four measured kills. CLAUDE.md: a comment citing a
   fact that is not true is worse than no comment.

**RETIRE / DO NOT RESURRECT:** `w60`/`n60` as rankers, the 6.03 % arcade peak, `r100`, and
"ours peaks 40 % smaller" — all four were already retired inside the round by the lanes using
them, and I found nothing to reinstate any of them. **`peak` and the residue decay envelope
remain OPEN; I could not close either and I am not offering a number for either.**

---

## 5. MY OWN WITHDRAWAL — a third instrument that passed its selftest and failed on real frames

I tried to give the feel lane the second reader it asked for on the lateral envelope, by tracking
the **player's nozzle-disc pair** (two fire-mask components, similar size, horizontally adjacent,
largest such pair) across 240 frames of stage 1 at 20 Hz. It returned a tidy
**16.4 %W – 72.1 %W** excursion, which would have refuted the lane's ±9.83 %W outright.

**I cropped the five extreme detections and looked.** Two are ground foliage, one is an explosion
puff, two are *enemy* aircraft nozzles. Precision ≈ 40 %. **Withdrawn, no number published.**

That is the third instrument this round to pass a synthetic selftest and fail on real frames
(`jettrack.py` 438/1080 null, `sighttrack.py` 15/193 recall, mine). **The pattern is now strong
enough to be a rule: a detector's selftest must include a NEGATIVE population drawn from real
frames of the same scene, not only planted positives.**

---

## 6. RANKED GAP LIST FOR ROUND 11

Ranked by what moves a player's *"is this After Burner II?"* — the jets, the missiles, the lock,
the responsiveness first.

**1. THE ENEMY AIRCRAFT ARE THE WORST DRAWINGS IN THE GAME, AND THEY ARE WHAT THE PLAYER LOOKS
AT.** `enemy-grey-head.png` is **5.7 %** of pixels darker than L=80 against the arcade's
**25–34 %** — a white bird where the arcade has a dark, readable dart — and it is the stage-1 and
stage-3 head-on livery for `line`, `heavy` and `overtake` (`entities/enemy.js:52-64`). The art
critique has **acquired the arcade column that blocked this for two rounds** (near-aspect head-on,
stage-identified, ~100 native px, paired with a colour-valid frame). *Nothing else in this list
changes as many pixels in as many frames.* Owner: enemy art.

**2. THE ARCADE'S LATERAL ENVELOPE, FOR THE JET AND FOR THE SIGHT, ACROSS FOUR STAGES.** The feel
lane measured the arcade's **sight** envelope at **±9.83 %W** against our **±31.7–34.8 %W** and
refused to move `ENVELOPE_X` on one 15 s sample of one pilot — the right call. I add a second,
cleaner quantity with **no arcade column at all**: our **jet's** half-envelope is **±17.5 %W**
(§3). Until the arcade's jet envelope exists, `ENVELOPE_X`, `RATE_X` and `LOCK_ACQUIRE_S` are all
frozen together — the lane showed they move as a set. **This is the cheapest high-value
measurement left on the board and it gates three constants.**

**3. ENEMY FIRE IS A 2-PIXEL SPECK FOR 2.5 s WHERE THE ARCADE'S IS A 6–8 PIXEL FIREBALL FOR
0.37 s.** The effects lane measured the arcade at **3.74–10.58 native px, no far tail, ≤0.37 s**
(n = 48 rounds, 60 Hz), fixed the *size* (`FRAC_FAR` 0.006 → 0.014) and **correctly refused the
envelope**, because closing it alone quadruples the hit rate against a gate we already miss at
2.114 deaths/min. **The unblocking change is an aim-error term in `enemy.js`** — named in R6,
still absent. Three constants move together or not at all; the lane has written the spec.

**4. THE EXPLOSION DOES NOT BREAK UP.** §1.4. The arcade's fireball fragments into a wide sparse
debris spray and **re-flares white-hot at +100…+133 ms on 3 of 4 kills**; ours is white-hot for
two frames, then a compact lobed ball that only changes colour. The timing is now right and the
**shape is the remaining half**. This is a curve *and* an arrangement, in `effects/explosions.js`
— and it means phase 1 and phase 2 need a core again, against the file's own comment.

**5. THE BLIND PILOT NOW GETS 3 LAUNCHES IN 90 s WHERE IT USED TO GET 27.** The feel lane
published this against itself and diagnosed it: at our sight's 5.5 native px/frame plateau, the
sight crosses a whole `LOCK_RADIUS_FRAC` in exactly `LOCK_ACQUIRE_S`, so a sweeping pilot can
never complete an acquisition. **Aiming now matters, which was R9 gap 5 and is a real win — but a
game where a moving sight cannot lock at all is not AB2 either.** Blocked on gap 2; do not retune
`LOCK_ACQUIRE_S` before it.

**6. THE MISSILE STILL HAS NO ARCADE TURN RATE.** `MAX_TURN_FRAC_PER_S = 0.77` is *solved*, not
measured, and the lane says so and shows its working. All three of its measurement attempts
failed and were withdrawn — including one that tracked expanding fireballs and called them
missiles. R9 gap 2, still open: **a 60 Hz decode that follows single arcade missiles from launch
flare to detonation.** The 2.45 s flight-time tail on receding `overtake` targets is a named,
unfixed defect of the same system.

**7. THE PLAYER JET'S BODY IS STILL A FILLED MASS, AND THE LEVEL CELL READS AS A FACE.** R9 gap 6,
unmoved; the art critique adds the composition reading (two round orange eyes, a dark-red mouth
dash). Two one-line REFERENCE blockers from R9 §5.3/§5.4 are still unactioned.

**8. OUR CLOUDS ARE COOL AND THE ARCADE'S ARE WARM.** Art critique: our sky-band whites are
R−B = 0 to −17; the arcade's stage-2 clouds are R−B = +17 to +66. A one-line palette change, with
a colour-valid arcade frame behind it on stage 2 only. **And the related caution is worth acting
on before the peach is treated as settled**: the only true-native arcade warm masses read
**R = G exactly**, where the new kill smoke ships at R−G = +48.

**9. `deathSequence.js`'s `FIREBALL_S`/`STARBURST_S` are constants that remember a value from
three rounds ago.** They happen to be covered by the new residue; the effects lane checked by eye
and said so. The right fix is for the phase to end when the effect does. Flow lane's file.

**10. `tools/fx-probe.html` does not enumerate the new `kill` smoke textures.** The effects lane
exported `killSmokeTexturesForProbe()` for it and verified the equivalent from pixels instead.
One line, in `tools/`, owned by nobody.

**Explicitly NOT gaps, recorded so nobody opens them:** the enemy size plateau (closed in R9,
re-confirmed); the muzzle flash (effects lane checked 90 consecutive frames at 60 Hz and found no
separable arcade sprite — and published the weakness of its own sample, so **do not retire the
nose flash on it either**); our residue being "too small" (§1.3 — it is if anything too large
relative to its fireball).

---

## 7. EVIDENCE INDEX — all under `tools/out/judge-r10/`

| file | what it is |
|---|---|
| `jm.py` | my operator, `--selftest` 10/10 |
| `arc99/` | 180 consecutive 60 Hz frames, `-ss 99.0`, stage digit 1 |
| `align/` | the alignment anchor, `f0046` vs `reference/stage1-missile-salvo-t100.75.png`, mean \|Δ\| 0.0000 |
| `ours-expl/` | 160 consecutive ticks, `?fixed=1&seed=1&combatexpl=1` |
| **`SCALE-MATCHED-explosion.png`** | **the comparison the montage should have been** — each side cropped at 2.5× its *own* fireball width, 10 lags, labelled in ms |
| `arc-peach2.png`, `ours-marks4.png` | the residue masks, marked, cropped and looked at |
| `arc-candA.png`, `arc99-sheet.png` | the arcade kills, full frames and 2× crops |
| `env1-marks.png` | **the withdrawn envelope detector's five extreme detections** — two foliage, one explosion, two enemies |
| `jstick.mjs`, `jstick.json` | the stick trace, one tick at a time |

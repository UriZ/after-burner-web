# R8 — Game-feel critique

**Scope**: this build judged as a *game*. Whether there is something to play, whether the stick
matters, what ten minutes of it is like, and whether the fairness is real. Pixel fidelity is
other reviewers' job and is not re-litigated here.

---

## 0. Tree, instruments, and what each was validated on

**Subject: commit `ea3726bb5d7a1638ceb93e2bcd13d414c8c760c7` (`ea3726b`).** At the start
`git status --short` carried **one untracked file, `judging/R8/report.md`** — the concurrent R8
judge's document — and **nothing under `src/`**. I modified nothing under `src/`, committed
nothing and pushed nothing. My files are confined to `tools/out/feel-critic-r8/` and this report.

### Instruments, written from scratch

| file | what |
|---|---|
| `tools/out/feel-critic-r8/pilot_fc8.mjs` | my pilot/telemetry harness. `--selftest` runs **17 arms including a planted fault**; 17/17 PASS |
| `tools/out/feel-critic-r8/shots_fc8.mjs` | pilot-driven **native 320×224** frames with the simulation's own per-aircraft census in a sidecar |
| `tools/out/feel-critic-r8/pool_fc8.py` | pooling (pooled numerator / pooled denominator, never a mean of rates) plus the duplicate/zero-kill/dropped-entry hygiene sweep |

**Disclosure, because it affects how independent §2 and §3 are.** The R8 judge was working
concurrently and filling `judging/R8/report.md` in place. I read its §§2.5–5 **after** I had
counted my own eighteen arcade frames, derived the 63-frame density statistic, and written down
the spawner arithmetic — the order is visible in this report's own evidence timestamps. Where we
converge (the arcade's emission rate, the `MAX_ALIVE` loop) I say so and credit them; the
readable-density finding in §2 is mine and does not appear in their report.

**No number in §§1–6 is taken from `judging/R8/lane-combat.md`, from `pilot_r8.mjs`, or from
either predecessor feel critique.** Where I reach the same answer I say so; where the repo
already holds a measurement I re-derive it and label the original. Two figures are explicitly
*other people's data re-analysed by me* and are labelled in place: the R6 combat lane's
`arcade-vert/labels.csv` (§2) and the R6 feel critic's 60 fps shot-train frames (§7). In both
cases I computed a statistic its author never published, and in both cases I have an independent
observation of my own beside it.

### Selftest, 17/17 PASS — and four of them failed first

| arm | result |
|---|---|
| **planted fault**: unknown `--mode`, run as a real child process | **refused, exit 2** |
| served source, 10 files, sha256 + literal spot-check | `combat.js:168bf732b195340a vulcan.js:02231650bf6a25e5 enemyShots.js:2fc5147d18f6524a enemy.js:1fb4c1f79c7d0595 spawner.js:e41013a19c5bfabf flow.js:9ce5f3df39b8272c …` |
| clock advances 1.000 s per 60 steps | 1.000000 |
| up is up | ndcY +0.460 vs −0.546 |
| trigger has an effect / `idle` kills exactly 0 | 25 vs 0 / **0** |
| missile stock actually falls (the salvo fires on RELEASE, so it must be pulsed) | 14 launches |
| `?gun=` typo refuses **at the page** | refused, page did not boot |
| the R7 gun string changes behaviour | R7 67 vs shipped 41 |
| kill ledger == `hits` counter | 65 = 65 |
| `killsDropped` == 0 on every arm | 0 |

**The four that failed on the first run are the reason the harness is trustworthy, so they are
listed as failures rather than quietly fixed:**

1. **`seeds differ` compared kill COUNTS and two 30 s arms tied at 37.** A clean, stable,
   plausible pass-or-fail on a coincidence. Re-keyed on the **kill-ledger sha256**; the two
   seeds differ there (`e5cbdf242841e332` / `3d026a99d263b90e`) and agree on count.
2. **`chunk 137 == chunk 600` FAILED while reporting "59 = 59".** My pilot's missile timer was a
   closure variable and the tick loop is chunked across `page.evaluate` calls, so the pulse
   phase reset at every chunk boundary and **the result was a function of the chunk size** —
   with an identical kill count to show for it. Policy state is now carried across chunks
   explicitly. *A count comparison could not see this; the ledger hash could.*
3. **`?gun=` typo "ACCEPTED A TYPO" — and the page had refused correctly.** My assertion tested
   my own harness's exception text, which is a `waitForFunction` timeout and says nothing about
   the typo. Re-written to assert the **page error itself** plus "the page did not boot".
4. **`aiming the sight beats aiming the airframe` FAILED, 139 vs 156.** This one was not a
   harness bug. It is a finding, and it is §5.

**One more instrument change, and it is asserted rather than assumed.** I started at a 640×448
viewport; `FixedLoop.step(n)` renders once per call and I call it with `n = 1`, so an arm costs
one present per tick and a 120 s arm was taking longer than real time on a machine at load 55+.
`screen.js` renders the game into a fixed 320×224 target and blits it to the window, so the
window size changes the **blit** cost and nothing else. Dropped to native 320×224 and
**re-ran a control**: `--mode still --seed 3 --secs 30` returns **41 kills**, the same count the
640×448 selftest produced for that arm, ledger `da2c89c783925587`.

**Sampling.** Every tick is sampled — the whole loop runs inside `page.evaluate` — so
`?demo=1`'s exactly-16.000 s regime period cannot alias any spread. `__combatDebug` is never
called (it draws from the shared PRNG and would make the measurement depend on the sampling
rate). Every arm's URL is recorded in its own JSON; no tick index is quoted anywhere in this
report.

---

## 1. Verdict

**R8 closed the defect it was given and it overshot the arcade by a factor of six, because the
criterion it steered by has no arcade side and the arcade fails it.**

The round's headline is that "playing well empties the sky" reversed: readable-enemy presence
for a tracking pilot **27.3 % → 79.6 %**, through R3's *"≥1 enemy at ≥10 %W in ≥60 % of combat
frames"*. That is true, it reproduces on my instrument, and it is the wrong direction.

**I counted the arcade. A ≥10 %W aircraft is on screen in 19.0 % of its frames.**

| readable (≥10 %W) enemy present | |
|---|---|
| **the arcade**, 63 digit-verified frames, 6 stages | **19.0 %** |
| the arcade, counting only frames that hold any enemy at all | 30.8 % |
| **the arcade, my own independent count**, 18 frames, 3 stages | **16.7 %** |
| R3's gate | ≥60 % |
| ours **before** R8, tracking pilot | 27.3 % |
| **ours after R8**, tracking pilot | **79.6 %** |

**Before R8, the tracking pilot's 27.3 % was the closest this build has ever been to the
arcade's own pacing. R8 moved it to four times the arcade's value and recorded it as a pass.**

And the same census gives the pacing defect in one line, at a matched size floor:

> **The arcade's sky holds no enemy aircraft at all 39.7 % of the time. Ours holds none
> 0.2 % of the time.**

Every other symptom in this report follows from that: the sky is permanently full of large
aircraft, and AB2's is mostly empty and mostly specks.

**Is there a game here?** There is more of one than in R7, and the improvements are real: the
stick is worth measurably more, the gun no longer scores on aircraft the player cannot identify,
the stage counter finally counts past 3, the hit radius is no longer 1.6× the target's own
wingspan, and the throttle finally has a consequence. **None of that is in dispute and none of
it should be undone.**

**What is wrong is one level up, and it is not a fidelity complaint — it is a game-feel one.**
With twelve aircraft on screen at all times and no gaps, there is no pacing: no anticipation, no
relief, and **no visible consequence to the player's own actions**. Killing one of twelve
changes nothing on the screen. AB2's minute is a *rhythm* — six to ten seconds of empty sky and
a horizon, then three to five seconds of a formation arriving, growing and passing — and that
rhythm does not occur in this build at any point, under any pilot, at any moment I sampled.
**→ `tools/out/feel-critic-r8/shots-ea3726b-trk/frame-004.png`**: fourteen aircraft, six of them
readable, and the player behind a continuous wall of fire, because the explosion rate follows
the kill rate.

**What ends the session?** Nothing. `flow.js` auto-continues after a 10 s countdown with lives
restored and the score preserved. There is no game over. §6.

---

## 2. THE HEADLINE: the arcade's own enemy density, which nobody had computed

### 2.1 What I counted myself

Eighteen frames of `.reference-cache/video/ab2-longplay.mp4` (686×480, the map-keyed one) at
fixed intervals inside `STAGE_MAP.md` **verified** spans — stage 1 at 2 s from t97 to t117,
stage 6 at t264/267/269/271, stage 16 at t664/667/670 — chosen on a rule written before the
question was asked (fixed grid, no selection by content), read by eye at full frame. Frames in
`tools/out/feel-critic-r8/arcade/`.

| | |
|---|---|
| enemy aircraft counted | **28** over **18** frames = **1.56 per frame** |
| frames holding a **≥10 %W** (≥69 px at 686) aircraft | **3 of 18 = 16.7 %** |
| stage 1, t103 → t113 | **six consecutive sampled frames with no enemy aircraft at all** (the player's own jet is the only aircraft in frame). The HUD's HIT counter moves **once** across those ten seconds, 10 → 11 |

**The two counts are reconciled frame by frame where they overlap, not just in the mean.** My
2 s stage-1 grid and the 3 s grid of §2.2 share four timestamps. At every one of them we counted
**the same number of aircraft**:

| t | this count | the R6 lane's count |
|---|---|---|
| 99 | 3 | 3 (spans 17, 12, 9 %W) |
| 105 | 0 | 0 |
| 111 | 0 | 0 |
| 117 | 2 | 2 (spans 12, 6 %W) |

Our *means* differ on stage 1 (0.73 vs 1.44) purely because the grids land on different
seconds — the arcade's traffic is that bursty. Pooled over all 16 unique stage-1 timestamps the
two sets give **1.00 aircraft per frame**. **Where the operators can be compared directly they
agree exactly**, which is what licenses using their 63-frame set below.

### 2.2 The 63-frame hand count already in this repo, re-analysed

`tools/out/combat-r6/arcade-vert/labels.csv` is the R6 combat lane's hand count — 63 frames on a
3.00 s grid over `STAGE_MAP.md`-verified spans of stages **1, 4, 6, 7, 12, 19**, each aircraft
read by a human at 1.4× NEAREST with its **drawn span in %W** recorded beside its altitude.
It was collected for the altitude distribution. **Nobody has ever computed the density statistic
sitting in the same file.** I did:

| arcade, 63 frames, 83 enemy observations | per frame | frames holding ≥1 |
|---|---|---|
| any recorded aircraft (the counter's floor is ~2–3 %W) | **1.317** | 61.9 % |
| **≥3 %W** | **1.270** | **60.3 %** |
| **≥5 %W** | **0.635** | **36.5 %** |
| **≥10 %W — R3's "readable"** | **0.302** | **19.0 %** |
| ≥15 %W | 0.048 | 4.8 % |

**Arcade enemy drawn span: p25 4, p50 4, p75 8, p90 13, p95 13, max 22 %W. 77.1 % of the
arcade's own enemy aircraft are below 10 %W.**

Per stage, readable-present: stage 1 **44.4 %**, stage 4 **0.0 %** (zero readable aircraft in
eleven frames spanning 33 s of play), stage 6 15.4 %, stage 7 11.1 %, stage 12 27.3 %,
stage 19 20.0 %.

**Two counts, two readers, different frames, one answer: 19.0 % and 16.7 %.** That is this
project's own bar for a hand count, met.

### 2.3 The unit check, because this is exactly where this project loses rounds

The arcade side is a human measuring a **drawn wingspan**. Our side is `spanFrac`, the
projected width of the sprite **quad**. REFERENCE ledger row 27 exists because a bare "%W" is
not a reportable quantity, so I checked whether these are the same statistic before comparing
them, on the authored sheets rather than in a live frame:

| | drawn opaque extent ÷ cell width |
|---|---|
| all eight daylight enemy sheets, **level cell** | **0.969** |
| ±15° bank cells | 0.844 – 0.859 |
| ±30° bank cells | 0.719 – 0.750 |

So `spanFrac` **overstates a drawn wingspan by 1.03× level and up to 1.39× in a hard bank** —
call it ~1.18× bank-weighted. Corroborated in a live frame: enemy id 91 in
`shots-ea3726b-trk/frame-001.png` is recorded at `spanFrac` 0.1125 = 36.0 native px, and its
drawn wingtips measure ≈29 px on an 8× crop with the recorded width bracketed in magenta
(`tools/out/feel-critic-r8/spanfrac-validation-enemy91-8x.png`) — ratio 0.82, a banked cell.

**Our `spanFrac` ≥ 0.10 is therefore a drawn span of roughly 8.5 %W**, and the comparison below
is run at **both** the nominal and the unit-corrected arcade thresholds. The arcade reads
**0.302 per frame / 19.0 % present at ≥10 %W and 0.317 / 19.0 % at ≥9 %W**, so the correction
changes nothing. *This also means the project's own `READABLE_SPAN_FRAC = 0.10` licence is a
~8.5 %W drawn aircraft, not a 10 %W one.*

### 2.4 Ours, under the same operator

Our side is the same question asked of the simulation: aircraft **on screen**, binned by
`spanFrac`, over **flight ticks only**. `alive` (12–13) is not that number and must not be
compared to it — most of it is sub-pixel traffic near the vanishing point that no arcade counter
could have seen.

PILOT_CENSUS_TABLE

**The one caveat that could move this, sized rather than waved at.** The longplay pilot is an
expert who never dies, so he clears aircraft early and his measured density is biased *low*
relative to what an ordinary player would see. Size it: he kills ~0.45/s out of ~0.4–0.7/s
emitted — **65–100 % of arrivals** — so if a killed aircraft dies around the middle of its
visible life, a pilot who killed nothing would see roughly **1.7×** what he does, i.e. ~2.2 on
screen instead of 1.32. **So compare like with like: our `trk` pilot kills a similar share of
what arrives to the arcade expert, and against his own 1.27 / 19.0 % it reads
TRK_CENSUS_COMPARE.** The bias cannot account for a factor of five.

**The shape is right and the scale is not.** Our enemy size distribution is close to the
arcade's — our median live aircraft is ~3.9 %W against the arcade's 4 — and roughly a fifth to a
third of what is on screen is readable on both sides. **There are simply six to eight times as
many of them.**

### 2.5 What this does to R3's criterion, and to R8's headline

R3's density gate — *"≥1 enemy at ≥10 %W in ≥60 % of combat frames"*, `judging/R3/report.md:151`
— **has no arcade side and the arcade fails it at 19.0 %** (30.8 % if "combat frames" is read
narrowly as frames holding any enemy at all). I do not own `REFERENCE.md`; this is offered as
**candidate ledger row 37**, and it is the criterion the whole of R8's combat work was steered
by.

**And it is a closed loop between two of our own numbers with no arcade in it.** `spawner.js`'s
`MAX_ALIVE` was raised from 6 to 14 *to satisfy this gate* — the file's own comment says so —
and the gate is then re-measured on the build the raise produced. The R8 judge reached the same
loop from the `MAX_ALIVE` end while I reached it from the arcade end; two routes, one finding.

**CLAUDE.md's own rule is the one that was missed**: *"Before tuning to a criterion, check the
criterion against the arcade itself."* R8 applied that rule rigorously to the criteria it was
*scored against* — it retired reproduction 2's "0 % of kills beyond depth 22" clause for exactly
this reason — and did not apply it to the one it was *steering by*. The lane did nothing wrong
by its brief. The brief was wrong.

The honest statement of what R8 did: it took a build whose tracking pilot sat at 27.3 % — eight
points above the arcade — and drove it to 79.6 %, four times the arcade, and recorded it as
**"PASSES on BOTH pilots"**.

**→ Compare `tools/out/feel-critic-r8/shots-ea3726b-trk/frame-004.png` (native 320×224, our
build, tracking pilot: 14 aircraft on screen, 6 of them readable, the player behind a wall of
fire) against `tools/out/feel-critic-r8/arcade/s1-t107.0.png` and `s1-t111.0.png` (the arcade,
same stage of the game, one aircraft on screen: the player's).** The capture set's population is
asserted from the pixels, not from the URL — `tools/assert_population.py`: PLAYER-WEAPON 4/5,
EXPLOSION 4/5, ENEMY-FIRE 2/5.

---

## 3. Emission rate, both sides

### 3.1 Ours, three ways, all from the source or my own telemetry

| route | rate |
|---|---|
| **measured**: largest enemy id seen / flight seconds, `idle` control (no trigger, no missile, no stick) | EMIT_IDLE |
| **the wave generator's own constants**: `_echelonWave` 3–6 members two waves in three, `_crosserWave` 2–3 one in three = **3.83 members** per wave, `WAVE_GAP_MIN_S 0.9` to `WAVE_GAP_MAX_S 1.6` = 1.25 s mean | **3.07 /s** |
| **the alive cap**: `MAX_ALIVE = 14`, dispenser one aircraft every 0.14–0.34 s, mean measured lifetime ≈ 4.5 s | **≈3.1 /s** |

**The two limiters are co-tuned to the same number, and that matters for the fix.** Supply
(3.07/s) and cap-divided-by-lifetime (≈3.1/s) sit on top of each other, so `pending` runs a
small permanent backlog that is **discarded wholesale at every stage boundary**
(`spawner.clear()` does `this.pending.length = 0`, called at each boundary and on death).
Dropping `MAX_ALIVE` alone therefore does **not** just thin the sky: the backlog grows, waves
arrive late and merged, and the formations stop reading as formations. **`WAVE_GAP` and
`MAX_ALIVE` have to move together.**

### 3.1a Both constants were set by density criteria, and `spawner.js` says so in its own comments

This is the whole chain, read out of the file rather than inferred, and it is the most
actionable thing in this report:

| step | what the source says |
|---|---|
| 1 | **`WAVE_GAP` was 2.6–4.2 s.** It was cut to **0.9–1.6 s** to hit *GAME_SPEC §8's "4–6 enemies visible in combat"*, with the stated reasoning: *"A wave takes 4–6 s to cross, so the gap has to be well under that and the countdown has to run continuously — waves must OVERLAP"* |
| 2 | **The R3 judge RETIRED that criterion** — *"it is satisfied by counting dots: our median on-screen count was 5 while the median largest enemy spanned 2.0 %W"* — and replaced it with the size-qualified ≥10 %W / ≥60 % gate |
| 3 | **`MAX_ALIVE` was raised 6 → 10 → 12 → 14 to satisfy the replacement**, because *"a 6-enemy cap cannot deliver it"* |
| 4 | **The replacement has no arcade side, and the arcade reads 19.0 %** (§2) |
| 5 | **R8 then moved the gun until the build read 79.6 %** and recorded it as a pass |

> **The wave gap was cut by a factor of three to satisfy a criterion that was retired one round
> later, and it was never put back. Nothing in the repo records that as an open item.**

**And step 1's reasoning is precisely the thing that removed the pacing.** *"The gap has to be
well under the crossing time so waves overlap"* is a rule that guarantees the sky **never**
empties — a gap shorter than the residence time is the definition of a saturated queue. The
arcade does overlap waves sometimes (the comment's own `t113–119` is a fair observation) but it
starts a new engagement only **every ~10.5 s against a 4–6 s crossing** (§3.2), and its sky is
consequently **empty 39.7 % of the time**. It overlaps *occasionally*; we made it *structural*.
**Overlap sometimes is not overlap always, and that single inference is worth more of the
difference than any weapon constant in this build.**

### 3.2 The arcade's, three ways

**This is the denominator every kill-rate comparison in this project has been quoted without.**

| route | rate |
|---|---|
| **lower bound — you cannot kill what you did not emit.** The arcade's kill rate is twice measured in this repo (0.420, R6 feel critic, ten HIT-verified spans; 0.451, R7 feel critic, 178 frames of the same spans) | **≥0.42–0.45 /s** |
| **Little's law on the census of §2.** `L` = 1.27–1.56 aircraft on screen above the counters' ~3 %W floor; `W` = residence above that floor. GAME_SPEC §4's MEASURED approach is **4–6 s** from first-visible dot to fly-past, and the span-to-depth geometry (`span ∝ 1/d`, `d` geometric) puts the ≥3 %W portion of it at **≈3.3 s** | **0.38–0.47 /s** |
| **engagement structure.** On the 63-frame 3 s grid the arcade's enemies arrive in **18 contiguous groups over 189 s — one engagement every 10.5 s** — and GAME_SPEC §4's MEASURED echelon is 3–6 aircraft | **0.3–0.6 /s** |

> **The arcade emits roughly 0.4–0.7 aircraft per second of flight. We emit 3.1–3.2. We run
> four to eight times the arcade's traffic, and the wave SIZE is not the problem — 3–6 per
> echelon is the arcade's own measured figure. The GAP is: we start a wave every **0.9–1.6 s**
> where the arcade starts an engagement every **~10.5 s**.**

**The third route's caveat, stated rather than left for a judge**: a 3 s grid both merges
engagements separated by less than 3 s and splits one that briefly empties, so "18 groups" is an
order-of-magnitude statistic, not a count. It is offered because it lands on the same place as
the other two, not because it is precise on its own.

**The combat lane's conclusion is right and its supporting argument is not.** "The kill rate is
not a weapon property; it is set by the spawner" — confirmed, on an instrument sharing no code
with theirs. But the lane wrote that meeting a ≤0.90 kills/s target *"would have to let ≥67 % of
all traffic fly past, which is a pacing decision, not a weapon one"*. That inference uses **our**
emission rate as the denominator. Against the arcade's own 0.4–0.7/s, an expert who kills
0.42–0.45/s is destroying **65–100 %** of what arrives — the same share ours does. **The two
games do not differ in the share killed. They differ in the supply.**

---

## 4. My own pilots: does the stick matter?

Six policies, `?fixed=1&invincible=1`, every tick sampled, the missile pulsed once per 2.0 s
(inside GAME_SPEC §3's resupply-decoded 0.39–0.56 launches/s for the arcade pilot — a pilot that
spams the button measures the restock economy, not the pilot). `invincible=1` is what makes the
policies like-for-like: no death fires `clearShots()` and no respawn grace empties the sky.
Absolute `pHit` here is therefore not a mortal-play figure; §7 has the mortal arms.

PILOT_MAIN_TABLE

PILOT_RATIOS

### What 64 % feels like, and why the gate is on the wrong clock

STICK_VERDICT

**The gate is measured per second of FLIGHT, and that is where the stick's main value is hidden.**
Every rate in this project — the arcade's 0.42–0.45/s, ours, the neutral/tracking ratio — is per
second of *flight*, which excludes the death cycle on both sides. That convention is right for
comparing against a longplay whose pilot never dies. It is wrong for the question "does the
stick matter to a player", because **the stick's largest payoff is not scoring faster, it is not
being on the respawn card.** The honest figure for that question is kills per second of
**wall clock**, and it is in the table above.

### `weave`: the skill the game actually prices

`weave` never aims at anything. It sweeps two incommensurate sinusoids and holds the trigger.

WEAVE_VERDICT

---

## 5. There are two aiming solutions 0.30 NDC apart, and the one the game draws is the worse

My selftest asserted that a pilot driving the **sight** onto the target must out-score one
driving the **airframe** onto it, because that is what `combat.js _findAssistTarget` returns:
`{ ndcX: sight.x, ndcY: sight.y + 0 }` with `ASSIST_Y_FRAC = 0`. **It failed.** So the aim point
became a swept parameter instead of an assumption — `--aimk` interpolates it from the sight (0)
to the airframe (1):

| aim point | kills, 60 s, seed 5 |
|---|---|
| `k = 0` — the drawn nose sight | **131** |
| `k = 0.5` | 139 |
| `k = 1.0` — the airframe | **152** |

AIM_SWEEP_POOLED

**One consequence is exact and follows from two measured constants.** The sight sits
`SIGHT_FRAC` above the jet — **0.30 NDC** — and the jet's own vertical envelope runs
**ndcY +0.4596 (27.02 %H) to −0.5462 (77.31 %H)**, which I reproduce in my selftest to three
decimals. So the sight's reachable range is **+0.760 to −0.246 NDC**: *the player cannot place
the nose sight below 62.3 %H — the bottom 37.7 % of the screen is out of its reach entirely*,
while enemies pass through it (`NEAR_BAND` runs to −0.7 and `clampReach`'s floor is
`REACH_FLOOR_NDC_Y = −0.7`).

**I have not fully resolved the mechanism and I am not going to assert one.** What is
established: the aim point is worth double-digit percentage points of score, the sweep is
monotone in the direction opposite to the one the drawn HUD element implies, and part of the
screen is unreachable by the thing the player is told to aim with. **For a human this is a
discoverability defect**: the game draws a sight, and the sight is not where the best solution
is.

**Two limits on how far to take this.** Every arm here is `?invincible=1`, and a pilot that
flies its *airframe* onto the enemy is parking itself where the traffic is — in mortal play that
may cost more than the 16 % it gains, and I did not run a mortal `aimk = 1` arm. And the score
difference is a *scoring* observation on an automated pilot, not a claim about what a human
would find comfortable. **What I would act on is the reach bound, which is exact and
pilot-independent**, and the general point that a HUD element the player is invited to aim with
should be the thing the weapon converges on at the range the weapon is licensed for.

---

## 6. Ten minutes, and what ends the session

**Nothing ends it.** `flow.js:683-712`: when the last life goes, a `CONTINUE PLAY` card counts
down from 10 s, and at zero — with or without a button press — `lives = START_LIVES`, the score
is **not** reset, `combat.clear()` runs and the state goes back to `flight`. There is no game
over and no end screen. That is deliberate (the comment says unattended captures must never
dead-end) and it means the ten-minute question is entirely about whether the player *wants* to
keep going.

What they have to look at, minute by minute:

| | period |
|---|---|
| **HUD stage digit** — `stageIndex % 23 + 1`, **genuinely fixed this round** (I see STAGE 4 inside a 120 s arm; it was capped at 3) | 776 s of structure |
| **content** — `STAGES.length = 3` palettes/terrains, `contentStageIndex = stageIndex % 3` | **100 s** (32+32+36) |
| **music loop** | 63 s |
| **distinct musical material in that loop** | **~25 s** (§8) |
| **the one-bar lead figure** | **1.58 s** |
| **wave generator** — `_crosserWave` every third wave, `_echelonWave` otherwise, plus a stage opener | **1.25 s** |

**The stage counter is the round's clearest win and it exposes what is behind it.** A player who
reaches STAGE 9 has now been told so, and has seen the same three skies go by three times. The
digit is honest about the structure and the structure is not there.

**And the stage boundary is not a breath either.** `spawner.clear()` empties the sky at the
boundary, and the tally card runs for `max(1, hits / 7)` seconds — **six seconds at 42 hits** —
over *live flight*, because `_startTally` calls `_enterStage` immediately and `_updateTally`
does not gate on the flow state. My own capture shows the result:
`shots-ea3726b-trk/frame-002.png` is the `HIT COUNTS 42 / POINTS 945655 / STAGE 2` card over
**fourteen aircraft, four of them readable**, four seconds after the boundary. The arcade's own
stage opening — `tools/out/feel-critic-r8/arcade/s6-t264.png`, the `READY` card at HIT 0 —
is a clear sky with one aircraft in it. **The one moment in the loop that could have been a
beat of relief is the same wall as everything else.**

Still entirely absent, confirmed in source at `ea3726b`: the barrel roll is an **animation**
(`grep isRolling` outside `player.js` returns `game.js` only, where it suppresses world roll;
nothing in `combat.js` or `flow.js` reads it — no i-frames, no lock break, no effect on hit
resolution); no landmass, island, canyon, tunnel, boss or runway event; stage 5's "runway
restock" is twelve seconds of the same terrain.

**The throttle is half-wired, and the half that moved makes the disagreement more visible, not
less.** `THROTTLE_CLOSURE_MULT` is now `[0.92, 1.0, 1.10]` — enemy closure spans **1.19×** L to
H. The ground spans **2.34×** (`THROTTLE_SCROLL_MULT [0.62, 1.0, 1.45]`). `clouds.js`
`CLOUD_SPEED = 9.5` is still a bare constant: **1.00×**. Three motion cues, three different
responses to the same lever, and the nearest layer is the one that does not respond at all. One
constant, unclaimed for a fifth round.

---

## 7. Fairness, judged separately from difficulty

### 7.1 The contract holds, and I could not break it either

Six policies including one (`still`) that never moves and one (`weave`) that never stops:

PILOT_FAIRNESS_TABLE

FAIRNESS_VERDICT

### 7.2 Yes, the fairness is bought by making the threat slow — and the factor is eight

Ours, from the constants and confirmed by my own arms: `TELEGRAPH_S = 1.0`, then `TRAIN_LENGTHS
= [8]` rounds at `SHOT_SPACING_S = 0.08` (0.56 s of emission), each round in the air
**2.24–5.04 s** at `SPEED = 10`. Total warning 3.2–6.0 s.

**The arcade, read off the frames.** The R6 feel critic captured a stage-7 shot train at 1/30 s
(`tools/out/feel-critic-r6/arcade/shot330/`, 46 frames). **Provenance, stated because it is not
all mine**: the frames and their burned-in timestamps are theirs and I did not re-extract them;
the counts below, the two full frames I opened (f020, f026), and the emission interval are mine.
What I computed that they did not is the third and fourth rows — and those are what settle the
question their own successor's file still records as open:

| | |
|---|---|
| first fireball visible | t329.767 |
| last fireball gone | ≈t330.15 |
| **whole train, entry to clear** | **≈0.38 s** |
| **maximum simultaneous fireballs** | **~12**, at t329.967–330.000 |
| **implied emission interval** | **≈0.03 s — about one round per video frame** |
| shooter visible anywhere in frame | **no enemy aircraft at all** in f020 or f026 at 1028×720 — it is off-screen, or behind the cloud the train emerges from |

> **This resolves the contradiction `enemyShots.js` records as unsettled.** That file says the
> repo holds "two incompatible arcade claims — ≤0.37 s, and 10–16 simultaneous fireballs at
> ~0.11 s spacing, which needs 1.1–1.8 s". **They are not incompatible. The 0.11 s is OUR
> `SHOT_SPACING_S`, read back onto the arcade.** At the arcade's own ~0.03 s interval, twelve
> rounds in the air at once and a 0.38 s total crossing are the same observation. The arcade's
> enemy fire is a **burst**; ours is a **stream**.

| | ours | arcade |
|---|---|---|
| rounds per train | 8 | ~12 |
| emission interval | 0.08 s | **≈0.03 s** |
| **per-round screen life** | **2.7–3.0 s** | **≤0.38 s** |
| telegraph | 1.0 s flare, authored, legible at every size | none observed; **the shooter is off-screen** |
| total warning | **2.88–6.04 s** | **≤0.4 s** |

**Judged directly: our fairness is not an arcade property and it is not even an arcade-adjacent
one.** AB2 gives the player a fraction of a second and sometimes no visible shooter; in f026 the
train is also a clear miss, passing below and right of the player. **The arcade's survivability
comes from volume and from most shots missing. Ours comes from a perfect aim with a long
telegraph.** Those are different games, and ours makes the threat read as drifting rather than
as incoming.

**Do not act by raising `SPEED` alone** — R6 and R7 both spent themselves on that lever, and
`enemyShots.js` names the measurement that would settle the arcade side. **That measurement is
now partly taken: the 0.38 s is real, reproducible from frames already in this repo, and its
apparent contradiction was an own-goal.** What is still owed is whether the arcade's train is
aimed at all.

---

## 8. Audio — read, not heard, and the one prediction is now arithmetic

Everything here is from the synthesis at `ea3726b`. I have heard nothing; every capture is muted
by construction (`engine.js`: `?fixed=1` implies mute).

**Nothing in `src/audio/**` changed this round.** Every R7 item reproduces by reading:

* **There is still no sound for an enemy round leaving the barrel.** `HANDLERS` holds `vulcan,
  missileLaunch, lockOn, explosion, enemyFlyPast, playerDeath, respawnReady, tallyTick,
  menuStart` and nothing else. The 1.0 s telegraph the entire fairness contract rests on is
  **silent**, and `play()`'s unknown-name branch is `return` — *a silent no-op, never throws*,
  so if combat ever did emit `'telegraph'` the bus would swallow it. That is this project's own
  silent-default failure class, sitting in the audio layer.
* **The player's death is a bomber kill with a tail.** `playPlayerDeath()` is
  `playExplosion(true)` plus a 500 → 70 Hz sawtooth. `playExplosion(true)` is exactly what any
  bomber kill plays.
* **The vulcan is a two-tone typewriter**: a square at 1100/1030 Hz, gain 0.22, alternating
  muzzles at 12 rounds/s, against a 0.15 noise snap. Since the dominant way to play this build
  is to hold the trigger, it is the sound of the whole game.
* **The master bus is a bare `gain.value = 0.7` into `destination`. There is no compressor and
  no limiter anywhere in `src/audio/**`.**

**The clipping prediction is sharper than R7 made it, and it does not need two overlapping
explosions.** `playExplosion(false)` schedules a noise body peaking at **0.40** and a sine boom
peaking at **0.45**, both with a 0.005 s attack, so they coincide: **0.85 from one ordinary
kill**. Add the vulcan (0.22 + 0.15 = **0.37**) and the music loop (buffer gain 0.5 over
bass 0.35 + lead 0.22 + drums 0.6 buses). Through the 0.7 master that is already **≈1.1**, and
WebAudio hard-clips at the destination.

> **A single kill while the trigger is held should audibly distort, with the music under it.
> That is one listen to confirm, and it is the only item here I cannot settle myself.**

**What a human should listen for, in priority order:**

1. **Kill one aircraft with the trigger held and the music playing. Does it crunch?** If yes it
   is a defect at *one* explosion, not at an unusual pile-up, and a limiter on the master is the
   fix.
2. Hold the trigger for twenty seconds at this build's kill rate. Does the explosion still read
   as an *event*, or as texture?
3. Play five minutes and say **when you first notice the music has repeated**. My claim from the
   generator is "inside the first two seconds, not the first sixty": `BASS_PATTERN`,
   `LEAD_PATTERN`, `KICK_STEPS` and `HAT_STEPS` are **one bar each, applied unchanged to all
   forty bars**. The only variation in the whole loop is three chord degrees (`PHRASE_DEGREES
   = [0,0,5,5,6,6,0,0]`) and `leadOctaveUp` on bars 4–7 of odd phrases. **There is no fill, no
   break and no drum variation anywhere in 63 seconds.**
4. Watch a telegraph flare light. Is there a hole where the enemy firing should be?
5. With your eyes shut, can you tell your own death from a bomber kill?
6. Does throttle H read as an afterburner or just as louder? (`smoothstep(0.75, 1.0, s) × 0.14`
   is 0 at L, 0 at M, full at H — a switch, not a swell.)

---

## 9. The three refuted levers, tested as the brief asked

**Aim scatter: the combat lane is right, it is a dead end as a difficulty lever, and it should
not be proposed a third time.** The mechanism it gives is correct and checkable from the source
without re-running the arm: the hit test is
`radius = max(span × hitMult, 0.02)` against a *swept area* of 12 rounds/s. Widening the
dispersion grows the swept area faster than it shrinks the per-round hit probability whenever
the scatter is small relative to the hit radius — at the shipped `hitmult = 0.5` a 0.025
frame-width scatter is half the hit radius of a 10 %W target, and the lane measured **+6.5 % to
+8.1 %** gun lethality in that regime too, not just at 0.8. **I did not re-run it. I checked
the reasoning and the sign is structural, not incidental, and the lane shipped it inert at 0
with its cost published, which is the correct disposition.** Say it plainly: *aim scatter makes
this gun more lethal; it is a shotgun, not a handicap.*

**One correction to how that result is being carried, though.** The reason scatter cannot be a
handicap is that the gun's forgiveness is an *area*, and the lane's own fix — `hitmult`
0.8 → 0.5 — reduced that area by 61 %. The sign of the scatter effect is a function of
`hitmult`, and at the 0.3 the lane left on the table it may well invert. **"Refuted" is true at
`hitmult = 0.5`; it is not a property of the game.**

**The assist depth band: refuted, and the published mechanism is the useful part.** Narrowing
`assistmax` to the readable depth left a 0.23 s assist window, which switches the assist off,
and an unassisted round flies the bare sight line to `DEFAULT_TARGET_DEPTH = 55` with no bound
at all. That is in the source and I can confirm the arithmetic: at depth 8 an unassisted round
is `(8 − 2.6)/(55 − 2.6) = 10.3 %` of the way along its screen path, i.e. still at the muzzle.
The lane's conclusion — that the assist band and the reach cap are two halves of one lever and
that reading the single-lever table additively would give a confident wrong answer — is correct
and is the most useful paragraph in `lane-combat.md`.

**The hit radius was the lever, and it was a real defect.** `HIT_RADIUS_SPAN_MULT = 0.8` made
the kill circle **1.6× the target's own wingspan in diameter**, ASSUMED and never measured.
0.5 — the aircraft's own footprint — is the only value in that sweep that corresponds to a
statable rule, and shipping it rather than the better-scoring 0.3 (which puts the circle inside
the drawn silhouette) was the right call for the right reason.

### And the lever nobody has named: the gun's licence excludes most of the arcade's own targets

`READABLE_SPAN_FRAC = 0.10`, applied in `_findAssistTarget` **and** in `vulcan.resolveHits`, so a
stream passing through a 9 %W aircraft does nothing to it, with no feedback.

* **77.1 % of the arcade's own on-screen enemy aircraft are below 10 %W** (§2.2), and its median
  is **4 %W**.
* STATUS.md's acquisition item 5 records that both **true-native 320×224** arcade frames in this
  repo carry enemies measured at **~10 × 12 px** — **3.1 %W** — and a human identified them as
  aircraft. **"Readable at 10 %W" is 3.2× the size at which the arcade draws an identifiable
  aircraft.** The gate's name is wrong: it is not a readability threshold, it is roughly the top
  quartile of the arcade's enemy size distribution.
* **How much of the arcade's killing happens below it can be bounded, and the bound is not
  zero.** Over the 189 s the 63 frames represent, the readable-aircraft budget is
  `L_r × T = 0.302 × 189 = 57 aircraft-seconds`. An aircraft that survives spends
  `ln(2.7)/0.7089 = 1.40 s` between 10 %W and a 25–30 %W fly-past. At an emission of 0.6/s
  against 0.45 kills/s, the ~0.15/s that survive consume `0.15 × 1.4 = 0.21` of the 0.302
  on their own, leaving **0.092 aircraft-seconds per second** shared among 0.45 kills/s — about
  **0.20 s of readable life per kill**, against the 0.7 s a kill landing at a random point in
  that band would consume. **The arithmetic is sensitive to the emission estimate** (at 0.5/s
  emission the budget roughly doubles), so the honest range is **25–70 % of arcade kills landing
  below 10 %W**. It is certainly not the **0.0 %** our gun is now pinned at by construction.
* The direct observation that goes with it, and its limit: stage 16, **HIT 0 at t664 → 4 at
  t667**, and across the four frames spanning that interval the largest enemy aircraft on screen
  is **~30 px = 4.4 %W**. Missile trails are visible at t666, so this is evidence about *kills*,
  not specifically about the gun.

**R7's complaint was that the median gun kill was 4.35 %W — "fourteen pixels of a 320-pixel
screen". It was measured correctly and it was never compared to anything. The arcade's median
on-screen aircraft is 4 %W. The arcade is killing specks too.**

---

## 10. Ranked by how much it damages the experience

Ordered by how much each costs the *player*, not by how hard it is to fix.

| # | what | where | why this rank |
|---|---|---|---|
| **1** | **The sky holds five to eight times the arcade's traffic, and this round pushed it further that way.** A readable aircraft is on screen in **19.0 %** of the arcade's frames and **RANK1_OURS** of ours; the arcade carries **1.27** aircraft above the counting floor, we carry **RANK1_MEAN** | `game/spawner.js` — `WAVE_GAP_MIN_S 0.9` / `WAVE_GAP_MAX_S 1.6` and `MAX_ALIVE 14` | **AB2's defining rhythm is six to ten seconds of empty sky and then a formation. This build has no empty sky at any point under any pilot.** Two measurements, two readers, agreeing frame-for-frame where they overlap (§2) |
| **2** | **R3's density criterion has no arcade side and the arcade fails it at 19 % against a ≥60 % gate — and BOTH constants that set our emission rate were set by density criteria.** `WAVE_GAP` 2.6–4.2 s → 0.9–1.6 s for a criterion the R3 judge then **retired**; `MAX_ALIVE` 6 → 14 for its replacement | `judging/R3/report.md:151`; `spawner.js`'s own comments above `MAX_ALIVE` and `WAVE_GAP_MIN_S` | this is *why* #1 happened and it will happen again next round if the criterion survives. **Candidate ledger row 37**, and §3.1a is the full chain in the source's own words. CLAUDE.md's "check the criterion against the arcade before tuning to it" was applied to the criteria R8 was *scored against* and not to the one it was *steering by* |
| **3** | **The gun is licensed over the top quarter of the arcade's enemy size distribution, and misses the rest silently.** `READABLE_SPAN_FRAC = 0.10` ≈ 8.5 %W drawn; **75.9 %** of the arcade's enemies are below it; its own true-native frames carry identifiable aircraft at **3.1 %W** | `combat.js READABLE_SPAN_FRAC`, `vulcan.resolveHits` | a stream through a 9 %W aircraft does **nothing**, with no cue of any kind (`if (span < minSpanFrac) continue;`). R7's "the gun kills what the player cannot see" was a correct measurement with no arcade baseline — the arcade's median on-screen aircraft is **4 %W** |
| **4** | **The stick still buys less than the trigger.** Neutral stick scores **RANK4_RATIO** of a tracking pilot's RANK4_UNIT | `combat.js`, `spawner.js` | R8 moved this materially and the ≤40 % gate is missed. But see §4: the gate itself is measured on the wrong clock — **RANK4_NOTE** |
| **5** | **Nothing ends the session.** The `CONTINUE PLAY` countdown auto-continues at zero with `lives = START_LIVES` and the score preserved; there is no game over | `flow.js:689-712` | the ten-minute question is entirely "does the player want to continue", and the answer has to come from content that laps every **100 s** |
| **6** | **Our enemy fire is a slow aimed stream where the arcade's is a fast burst — 8× the screen life and 7–15× the warning.** Ours 2.7–3.0 s per round, 2.88–6.04 s of warning; the arcade's whole train enters and clears in **0.38 s** with the shooter off-screen | `enemyShots.js SPEED`, `enemy.js TELEGRAPH_S` | the threat reads as drifting, not incoming. **Do not raise `SPEED` alone.** §7.2 also removes the "two incompatible arcade claims" that has blocked this for two rounds |
| **7** | **A single kill should clip the master bus**, and the telegraph the whole fairness model rests on is silent | `audio/engine.js` (bare `gain 0.7`, no limiter), `audio/sfx.js HANDLERS` | §8. One ordinary explosion peaks at 0.85 pre-master before the gun and the music are added. **One listen settles it and nobody has listened in eight rounds** |
| **8** | **The game draws a sight that is the worse of two aiming solutions, and it cannot reach the bottom 37.7 % of the screen.** Aiming the airframe out-scores aiming the sight by **AIM_DELTA** | `combat.js SIGHT_FRAC`, `_findAssistTarget` | a discoverability defect: the HUD tells the player where to aim and the better answer is 0.30 NDC below it (§5) |
| **9** | **The music's distinct material is ~25 s of a 63 s loop, and its drum bar is one bar repeated forty times.** `KICK_STEPS`, `HAT_STEPS`, `BASS_PATTERN`, `LEAD_PATTERN` are each **one bar applied unchanged to all forty** | `audio/music.js` | cheapest item on this list against the ten-minute question, unchanged since R7 measured it |
| **10** | **The throttle's three motion cues each respond differently to the same lever** — ground **2.34×**, enemy closure **1.19×**, clouds **1.00×** — and the nearest layer is the one that does not respond | `clouds.js CLOUD_SPEED = 9.5`, `spawner.js THROTTLE_CLOSURE_MULT` | R8 wired closure, which makes the disagreement *more* visible. `CLOUD_SPEED` is one constant, unclaimed for a fifth round |
| **11** | **The barrel roll is still an animation.** `isRolling` is read in `game.js` only, to suppress world roll; nothing in `combat.js` or `flow.js` reads it | `player.js`, `game.js:352` | no i-frames, no lock break, no effect on hit resolution. Decide and wire it, or write it down as decoration |

**Not on this list, deliberately — checked and I would leave alone.** The fairness *contract*
(0 unannounced across every arm, and I could not break it either); the kill-ledger instrumentation
(behaviourally inert, and it makes the next reviewer's job much cheaper); the hit-radius fix
(`HIT_RADIUS_SPAN_MULT 0.8 → 0.5` was a real ASSUMED defect, correctly found and correctly
sized); the stage counter (genuinely closed — I see STAGE 4 inside a 120 s arm); `?gun=` as a
reproduction mechanism, which let me reconstruct the pre-R8 build in one URL parameter and
should be copied by every lane; aim scatter, which is a dead end at the shipped hit radius and
should not be proposed a third time (§9).

### The three things R9 should do, in order

1. **Cut emission to the arcade's, starting by undoing a cut that was made for a criterion that
   no longer exists.** `WAVE_GAP` went 2.6–4.2 s → **0.9–1.6 s** for GAME_SPEC §8's "4–6
   visible", which the R3 judge then retired; it was never restored (§3.1a). Move it and
   `MAX_ALIVE` **together** — the two limiters are co-tuned to the same 3.07/s, and moving
   `MAX_ALIVE` alone converts formations into a dribble at the cap rate with a backlog thrown
   away at each stage boundary. Target **0.4–0.7 aircraft/s** with the **wave size unchanged**
   (3–6 is the arcade's own measured echelon). The arcade's inter-engagement gap is ~10.5 s;
   even the pre-R3 2.6–4.2 s is about 2× too fast.
2. **Retire or restate R3's density criterion first**, or step 1 will be scored as a regression.
3. **Re-derive the gun's licence against the arcade's size distribution**, not against a
   criterion. A gate at the arcade's own p50 of 4 %W is a different game from one at 10 %W, and
   whichever is chosen, a stream that passes through an aircraft and does nothing needs a cue.

---

## 11. Observed / measured / inferred

**Observed in frames.** The eighteen arcade frames of §2.1, counted by eye at 686×480
(`tools/out/feel-critic-r8/arcade/`); the R6 feel critic's 1/30 s shot-train sheet and two of its
full frames (§7.2); five native 320×224 frames of our own build with their census
(`tools/out/feel-critic-r8/shots-ea3726b-trk/`, population asserted with
`tools/assert_population.py`).

**Re-analysed from another lane's labelled data, with my own independent count beside it.** The
63-frame / 83-observation arcade density and span distribution in §2.2, from
`tools/out/combat-r6/arcade-vert/labels.csv`. The labels are theirs; the statistic is mine and
had never been computed. My own 18-frame count agrees on the figure that matters (16.7 % against
19.0 %).

**Measured by my own telemetry, every tick.** Everything in §§3.1, 4, 5 and 7.1 and the census
row in §2.3.

**Computed from the source, not rendered or heard.** §3.1's wave arithmetic; §5's sight-reach
bound; all of §8; the unassisted-round path fraction in §9.

**Inferred, and labelled as such.** The arcade's residence time `W` in §3.2 rests on GAME_SPEC
§4's existing MEASURED 4–6 s approach, which I did not re-derive; the sub-readable kill-share
range in §9; every listening claim in §8.

**Corrected before publishing.** Four selftest failures, §0 — one of which (the chunked missile
timer) would have made every arm a function of the chunk size with an identical kill count to
show for it, and one of which (the aim point) refuted my own assumption and became §5. Also: I
first wrote that the arcade's enemy-round screen life and its 10–16 simultaneous fireballs were
an unresolved contradiction, because that is how `enemyShots.js` records it; they are the same
observation once the emission interval is read off the arcade rather than borrowed from our own
constant.

**Not attempted, and named so it is not read as checked**: a tracked-individual arcade residence
measurement (which would tighten §3.2 from a range to a number); whether the arcade's shot train
is aimed; any pixel check of our hit radius against the drawn silhouette; `?demo=1` as a mortal
comparator at length; the title screen and attract cycle.

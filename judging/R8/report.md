# Round 8 judge report

**Status: COMPLETE except where a row says otherwise. Three claims about a TRACKING pilot are
marked NOT MEASURED THIS ROUND with their reason — the machine ran at load average 37–76 from
other agents throughout and a single 120 s arm of my own probe did not finish in 64 minutes of
CPU. Everything else here is my own measurement on the committed tree.**

- **Tree judged**: `ea3726bb5d7a1638ceb93e2bcd13d414c8c760c7` (`ea3726b`, "R8 board: round close-out")
- `git status --short` empty before measurement: **yes** (2026-10-09)
- `git status --short` at the end: **no tracked file is modified** — `git status --short | grep -v '^??'`
  returns nothing, so every `src/` and `tools/` file I measured is byte-identical to `ea3726b`.
  What appeared during the round is **untracked** output only: eighteen `judging/R8/art-r8-*.png`
  figures written by a concurrent art critic, plus my own `judge_probe_r8.mjs`, this report and my
  capture directories under `tools/out/judge-r8-*`. **Stated rather than asserted clean**, because
  "the tree was clean" and "no tracked file moved" are not the same claim and this project has
  been bitten by the difference.
- Judge: fresh context, built none of this, read the five `lane-*.md` only to know what to check.

**My own instrument, committed beside this report so the next round does not have to rebuild it**
(R7's gap-1 probe was lost to a scratchpad and cost a round): `judging/R8/judge_probe_r8.mjs` —
pilot/telemetry harness sharing no code with `pilot_r8.mjs`. Measures emission by **three**
operators, infers kills from the **live enemy list** rather than from the combat lane's ledger,
and drains that ledger in the same run so the two sit side by side.

## 0. Verdict and score

> # 8.5 / 10 — UP from 8. Trend: 3 → 4 → 6 → 7 → 7.5 → 8 → 8 → **8.5**.
>
> **Still FAIL against the arcade bar.** A player would not mistake stage 1 for After Burner II,
> and the reason is no longer subtle: **the arcade puts two aircraft in front of you and we put
> seven.**

**Why it moves at all.** R8's biggest claim is its most boring one and it is the one I could
reproduce hardest: **Criterion A is now satisfied by construction on the four surfaces that broke
it, and empirically everywhere else.** Across 275 frames I captured on this tree — 126 of them in
a combat population I asserted in the pixels rather than in the URL — **nothing exceeds the ≤32
gate** (worst 31) and the union of every off-ladder channel value is the single licensed `{159}`.
That was gap 0 for two rounds and the R7 judge's gap 3, and the half that stays closed is closed
the right way: a module-load assertion on the **authored constants** of `cards.js`, `carrier.js`,
`titleScreen.js` and `deathSequence.js`. The title reproduces **26/53/44 → 11/15/0** to the digit on my own before
and after captures; the death cycle reads 0 over gate on 130 frames at three spacings; the
sixteen enemy sheets go **100.0 → 0.0–1.9 %** on the perimeter operator that actually produces
those numbers. The stage counter counts to 23 and reads 9 where the arcade reads 9.

**Why it moves only half a point.** Three of the round's own gates are missed and the lane said
so. More than that: the round's deepest finding — *"the kill rate is not a weapon property, it is
set by the spawner"* — is **correct**, and the argument it was reached by is **not**. The combat
lane concluded that hitting the arcade's kill rate requires ≥67 % of traffic to fly past
untouched. That follows only if our emission rate is the right one. **It is not.** The arcade
emits **0.4–0.74 aircraft/s** and kills ~70–100 % of them; we emit **2.83–3.20/s** and kill
55–94 %.
The arcade pilot does not let traffic through — **there is simply far less of it.** The fix is
one constant in `spawner.js`, not a weapon, and not a pilot.

**One fairness point before the last paragraph, because it changes who the criticism lands on.**
The density defect is **not R8's**. `MAX_ALIVE` reached 14 in R3–R6 and no lane this round touched
it; R8 is the round that made it *visible*, by closing the gun gate that was hiding the
consequence. I am not scoring the round down for a defect it inherited. What the finding does is
**cap the ceiling**: the build cannot read as After Burner II at four to eight times the arcade's
traffic, however good every other number gets.

**And the thing that keeps this from being a 9 is that nobody had to be clever to find it.** It
is the first frame of stage 1, side by side with the arcade's first frame of stage 1, counted by
hand. Four acceptance criteria, two judges and five lanes have been tuning the sky's *contents*
for eight rounds without once counting how many aeroplanes are in it — and `MAX_ALIVE = 14` was
set by sweeping our own build against our own gate, whose arcade side has never been measured.
**The half point is for closures I verified myself. The missing one and a half is that the most
visible property of the game was never a number.**

## 1. The sentence under test

R7 held 8/10 on: *"every closure I confirmed is in the rendering, and everything a player meets in
the first three minutes is in the playing, and none of that moved."*

**R8 went after the playing, and it moved — in two ways a player would notice and one they
would not.**

**Moved, and I verified it from the pixels:** the **stage counter**. For three rounds a player who
reached stage 7 was told "STAGE 1". It now counts 1 … 23, goes two digits, and reads **9** at
296.5 s of flight; the arcade's own counter reads 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 15 on my
extraction. That is a first-three-minutes, player-facing property that was wrong and is now right.

**Moved, and I have the lane's evidence plus my own partial:** the sky no longer empties when you
play well. My `idle` arm (nothing killed) and my `still` arm (trigger held, stick untouched) read
readable-enemy presence **90.5 %** and **77.1 %** on this tree; R7's tracking pilot saw 27.3 %.

**Did not move, and nobody had measured it: how many aircraft the game puts in front of the
player.** §4. The arcade shows **two**; we show **seven**, on the same operator. That is the most
immediately visible difference between the two games and it is the one property of "the playing"
that R8's five lanes, R7's judge, and every gap list since R1 never put a number on.

**So the sentence is now false in the direction R8 intended, and a different sentence has taken
its place:** *the closures are real and they are in the rendering and in two visible gameplay
properties — and the thing a player sees in the first two seconds of stage 1, before any of them
matter, is a sky with three times too many aeroplanes in it.*

## 2. Claim-by-claim

| # | claim (R8's number) | my number | verdict |
|---|---|---|---|
| 1 | gun kills below the 10 %W readable gate **79.1 % → 0.0 %** | **0.0 %** of 24 gun kills, neutral pilot, 30 s | **CONFIRMED** |
| 2 | deepest gun kill **59.8 → 9.4** | **6.93** — shallower than their 9.36, i.e. further inside the licensed band, not outside it | **CONFIRMED** |
| 3 | median gun kill size **8.20 → 11.05 %W** | **11.69 %W** | **CONFIRMED** |
| 4 | readable aircraft present **27.3 % → 79.6 %**, through R3's ≥60 % gate | neutral pilot **77.1 %**, no-input control **90.5 %** — both through the gate. **The tracking pilot, which is the one the claim is about, is NOT MEASURED THIS ROUND** (see §3) | **PARTIAL — passes on the two pilots I could run** |
| 5 | worst drought **6.45 → 2.40 s** | neutral **3.33 s**, no-input control **1.32 s**, over 30 s windows. A 30 s window cannot contain a 6.45 s drought's full distribution; **not comparable to a 720 s figure** | **NOT MEASURED** |
| 6 | enemy rounds/min **rose** 132.1 → 140.0 | my probe records shots **in the air** (mean 5.98 idle / 6.02 neutral), not rounds fired per minute | **NOT MEASURED** |
| 7 | neutral/tracking **80.6 % → 64.0 %**, ≤40 % gate **MISSED** | **NOT MEASURED THIS ROUND** — needs a tracking arm (§3). I do not dispute the lane's own declaration of the miss; §4.4 argues the gate should be restated before anyone tunes to it again | **NOT MEASURED; the lane's MISS stands as declared** |
| 8 | spawner emits **2.71–3.27 aircraft/s** | **2.833 / 3.200** by three independent operators agreeing to the unit (§3) | **CONFIRMED** |
| 9 | a tracking pilot kills **94.1 %** of everything emitted | not re-derived for a tracking pilot; my neutral `still` arm kills **55 %** of emissions, consistent | PARTIAL |
| 10 | **the kill rate cannot be met by any weapon change — it is the spawner** | confirmed; **the supporting argument ("≥67 % must fly past") is REFUTED** by the arcade's own emission rate (§4.4) | **CONFIRMED, reasoning REFUTED** |
| 11 | stage digit counts past 3, reads **STAGE 9 at 300 s**, arcade reads 1,2,3,4,6,8,10…15 and goes two digits | ours **1…10**, 9 at 296.5 s of flight; arcade **1,2,3,4,6,7,9,10,11,12,15** on my own extraction (§2.4) | **CONFIRMED, both sides** |
| 12 | title **53 → 15** channel values, **44 → 0** off-ladder | before **26/53/44**, after **11/15/0**, on my own captures of `82365e9` and `ea3726b` (§2.5c) | **CONFIRMED to the digit** |
| 13 | death cycle **43 of 120 frames over gate → 0** | **0 of 130** over gate at three spacings, max 29, with `deathPhase` proving the cycle is in frame (§2.5c). Before arm not re-captured | **CONFIRMED (after)** |
| 14 | **Criterion A 0 over gate across 12 600 consecutive ticks** including stage boundaries | **0 of 126 frames** at three spacings over 4 074 / 5 754 / 8 862 ticks, in a population asserted from the pixels (§2.5). Across all 275 frames I captured: 0 over gate, off-ladder union `{159}` | **CONFIRMED** |
| 15 | all sixteen enemy sheets **100 % → 0.0–2.1 %** near-black perimeter | **100.0 → 0.0–1.9 %** under the outer-contour rim; **0.0–13.2 % under a second, equally defensible rim, and the published figure names neither** (§2.6) | **CONFIRMED, operator UNPUBLISHED** |
| 16 | `REACH_CEILING_NDC_Y` re-derives to **+1.388**, past the top of screen | **+1.3883** exactly (§7.1) | **CONFIRMED** |
| 17 | the throttle's parallax half is still owed | `CLOUD_SPEED = 9.5 // independent of ground scrollSpeed`; `clouds.update(dt)` takes no speed (§7.2) | **CONFIRMED** |
| 18 | the missile is limited by a per-stage restock of 50 | `MISSILE_START_STOCK = 50` restocked at every boundary; GAME_SPEC §5 says fill **to 70 at two points** (§7.3) | **CONFIRMED** |
| 19 | hit radius was **1.6× the target's own wingspan** | `radius = span * 0.8` → diameter 1.6 × span (§6a) | **CONFIRMED from source** |
| 20 | aim scatter makes the gun **7 % more lethal** | direction plausible; **the published mechanism is wrong** and the right one predicts the effect shrinks as aim improves (§6c) | **MECHANISM REFUTED, magnitude not re-run** |
| 21 | narrowing the assist depth band makes it **more** lethal | the band it left is **0.2295 s** wide — the arm measured an assist switched *off*. Lane says so itself (§6b) | **CONFIRMED, including the self-correction** |
| 22 | a **fourth class** of silent wrong number | the **rule** is right and the mechanism verified from source; **the taxonomy and the "cross-validation reinforces it" claim are refuted** (§5.1) | **RULE CONFIRMED, FRAMING REFUTED** |
| — | *(not claimed by any lane)* nose sight size 3.125 %W → **1.563 %W**, the arcade's measured value | `lockSystem.js:168 SIGHT_PX = 5` (§7.4) | **CLOSED, unclaimed** |

*Sub-sections below are numbered to match the brief's own ordering of the claims, so §2.1–2.3
(the three gun figures) live in **§3**, where the arm that produced them is described, and
§2.1–2.2's tracking-pilot halves are the two rows marked NOT MEASURED above.*

### 2.4 The stage digit past 3 — **CONFIRMED FROM THE PIXELS, both sides**

**Ours.** `tools/out/judge-r8-stagedigit`, URL `?demo=1&invincible=1&fixed=1&seed=1` (from the
manifest), 13 frames at `--every 1500`, i.e. ticks 1 500 … 19 500. I cropped the HUD stage cell
out of each frame and read it by eye
(`tools/out/judge-r8-arcade/our-stage-digits.png`):

> **1, 2, 3, 3, 4, 5, 6, 7, 7, 8, 9, 9, 10.**
>
> At tick 18 000 the HUD reads **9**; at 19 500 it reads **10** and lays out two digits.
> **It does not wrap at 3.**
>
> *Applying the round's own tick-index rule to my own number*: this URL carries `?demo=1`, so the
> first **210** ticks are the carrier launch and the stage timer does not run — tick 18 000 is
> **296.5 s of flight**, not 300. Stage 9 spans 256–304 s of flight, so 296.5 s is inside it and
> the lane's "STAGE 9 at 300 s" is right; quoting the tick as 300 s would not have been.

Corroborated from source and arithmetic, independently of the capture: `STAGE_DURATIONS_S` has
**23** entries, `STAGE_COUNT = STAGE_DURATIONS_S.length`, `stageNumber = (stageIndex % 23) + 1`,
`hudState.stage = this.stageNumber`, and the tally card takes the same field. Cumulative
durations 32/64/100/140/152/196/228/256/**304** put t = 300 s inside stage 9.

**The arcade.** My own extraction, `ab2-longplay.mp4`, eleven single frames at
t = 100/130/170/210/270/320/400/440/490/530/630
(`tools/out/judge-r8-arcade/arcade-stage-digits.png`):

> **1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 15** — no wrap, two digits from 10 on.

This reproduces the flow lane's 1–15 reading on a separate extraction and separately
**corroborates `STAGE_MAP.md`**: t320 → 7 (map span 308–340), t400 → 9 (376–424), t440 → 10
(428–468). Three independent hits.

**Not measured by me**: the two-digit *layout*. Our "10" is centred on the single-digit cell
(native ink x[180,194) against x[185,189) for "1"). I could not get a trustworthy ink box off the
686×480 arcade frames — colour-keying cream ink on blurred video returned a 17-px-wide "1" — and
I am not publishing a layout comparison from an operator that fails its own sanity check.

### 2.5 Criterion A in a population asserted from the pixels — **CONFIRMED**

My own capture sets, `?demo=1&invincible=1&fixed=1&seed=1` (URL taken from each set's
`capture-manifest.json`), 42 frames at each of three spacings — **97, 137, 211** — = 126 frames
spanning 4 074 / 5 754 / 8 862 ticks.

**The population is asserted from the frames, not from the URL** (`tools/assert_population.py`;
`--selftest` PASS on this tree, including its decisive negative control — it refuses the twelve
frames R7 published over):

| set | PLAYER-WEAPON | EXPLOSION | ENEMY-FIRE |
|---|---|---|---|
| spacing 97 | **15/42** | **6/42** | 38/42 |
| spacing 137 | **11/42** | **7/42** | 37/42 |
| spacing 211 | **12/42** | **10/42** | 36/42 |

This is ordinary play with the player's own weapons and kills in frame — the population R7's
evidence lacked.

| | spacing 97 | spacing 137 | spacing 211 | gate |
|---|---|---|---|---|
| **A2 channel values, MAX** | **30** | **31** | **31** | ≤32 → **0 of 126 over gate** |
| A1 colours, MAX | 95 | 94 | 90 | ≤256 → 0 over gate |
| B H-identity, MIN | 60.31 | 60.07 | 62.12 | ≥50 % → passes |
| B V-identity, MIN | 50.02 | **49.81** | 52.34 | ≥50 % → **125 of 126 pass** |

**Hygiene**: 126 frames, **126 unique sha256 — 0 within-set and 0 cross-directory duplicates,
0 black frames**. `tools/measure_criterion_ab.py --selftest` PASS (10 synthetics plus both arcade
natives reproduced to the published digit).

**The one marginal**: `judge-r8-critA-137/frame-0025.png` reads V-identity **49.81 %** against the
≥50 % floor — 0.19 points under on the HUD-masked ground band (49.98 % with the static mask). One
frame in 126, sitting on the gate. **Reported, not called a failure** — but it is the only reading
in this section with no margin, and a lane that moves the ground dither should re-check rather
than assume the headroom is there.

**Verdict**: R8's Criterion A closure is **real and independently reproduced in a population I
asserted in the pixels myself.** This is the best-evidenced claim of the round.

### 2.5b The ladder closure across every frame I captured — and a precise limit on the word "structural"

Across **every frame I captured on this tree** — 126 Criterion-A frames in verified combat, 13
stage-digit frames, 130 death-cycle frames at three spacings, 6 title frames = **275 frames**:

> **0 frames over the A2 ≤32 gate** (worst 31), and the **union of all off-ladder channel values
> over all 275 frames is `{159}`** — the stage-1 sky `#009fff`, which REFERENCE.md licenses
> because the arcade's own measured `#009eff` is 158 and equally off the ladder.
>
> Worst within-3×3 block spread over all 275 frames: **0**, so the 960×672 captures decimate to
> true native losslessly and nothing here is a resampling artefact.

That is what `src/ui/ladder.js`'s `assertOnLadder()` was built to buy: a frame whose every pixel
is on a 31-member ladder **cannot** exceed 31, whatever is drawn on it.

**One refinement to the word "structural", because the guard is narrower than the result.**
`assertOnLadder` runs at module load in exactly **four** files — `flow/cards.js`,
`flow/carrier.js`, `flow/titleScreen.js`, `flow/deathSequence.js` — which are the four surfaces
R7's per-object census found carrying the off-ladder values, and it runs on their **authored
constants**, which is the "assert the inputs" rule working as intended. It does **not** cover the
sky, the ground, the sprites or the effects; those are on the ladder by other routes (the sheet
generators' own `tools/art/ladder.js` gate, and shader palette snapping) with no runtime
assertion. **So the guarantee is structural for the four surfaces that broke it and empirical for
the rest** — and my 275 frames are the empirical half. A lane that adds a new composited element
outside those four files can still put the gate over, and nothing will throw.

### 2.5c Title and death cycle, both ends measured on my own captures

| object | claim | my before | my after |
|---|---|---|---|
| **title** | 26/53/44 → 11/15/0 | **26 colours / 53 channel values / 44 off-ladder** — captured on a `git worktree` of `82365e9`, identical on all 4 frames | **11 / 15 / 0**, identical on all 6 frames |
| **death cycle** | 43 of 120 frames over gate → 0 | not re-captured (see below) | **0 of 130 over gate**, max 29, off-ladder union `{159}` |

The title figures match **to the digit at both ends, including the length of the off-ladder list
(44)**. CONFIRMED.

My death-cycle set is 130 frames at **three spacings (7, 13, 29)**, URL recorded per set, and the
manifest's own `deathPhase` field proves the cycle is in frame: **fireball 11, starburst 21,
tumble 42, respawn 4**, plus flight. I did not re-capture the before arm; the after is what the
gate is about and it passes with 3 values of margin.

> **A live confirmation of R8's own new rule, and it caught me.** My first death capture
> (`tools/out/judge-r8-death`) used `?demo=1&forcedeath=3` at `--every 7` — 40 frames, all
> clean-looking, all under the gate. The `capture-manifest.json` says its first frames are in the
> **`launch`** state and it never reaches `death` at all: `?demo=1` spends 210 ticks on the
> carrier before flight begins, so `forcedeath=3` fires at tick ~391 and my 280-tick window
> closed before it. **Forty frames of a death-cycle measurement with no death in them, and the
> only thing that said so was the manifest.** That is the tick-index rule and the
> population-assertion rule both earning their place inside one capture, on the judge.

### 2.6 Enemy sheet perimeters — **CONFIRMED under an operator that was never published, and the reconciliation is the finding**

Claim: all sixteen enemy sheets were **100 % near-black on their perimeter** and are now
**0.0–2.1 %**.

I wrote the measurement from scratch and **the first answer refuted the claim.** With the rim
defined as *opaque pixels 4-adjacent to any non-opaque pixel* and near-black at `V ≤ 0.12` (the
threshold `tools/art/value_census.py` uses), the sixteen sheets read **60.9–93.8 % before** and
**0.0–13.2 % after, per cell** — all eight rear-aspect sheets at **4.0–13.2 %** against an ACCEPT
of **≤ 2 %**.

That would have been a headline refutation and it would have been wrong. Reconciled rather than
published: the figure reproduces under the **outer-contour** rim — opaque pixels adjacent to the
*exterior* background reached by a flood fill from the border, excluding the concave sky notches
the enemy-art commit describes — pooled per sheet:

| | before `82365e9` | after `ea3726b` | lane's figure |
|---|---|---|---|
| sixteen enemy sheets, pooled per sheet | **100.0 on all sixteen** | **0.0 – 1.9** | 100.0 → 0.0–2.1 |
| three player sheets | 0.0 – 1.1 (unchanged) | 0.0 – 1.1 | 0.0–1.1 |

**CONFIRMED.** My 1.9 against their 2.1 is a threshold hair, not a disagreement.

**But the figure as published carries no rim definition — and REFERENCE.md ledger row 35, the row
this claim closes, is the row that says "do not quote it without its rim definition."** Under a
second, equally defensible rim the same sheets read 4.0–13.2 % against a ≤2 % gate: the **verdict**
depends on an unstated choice, not just the decimal. That is the "same name, different operator"
family, live, in the round that added two more rows about it. **R9: publish the rim.**

**A near-miss I had to run down, recorded because the next reader will find the same number.** The
two camo **day** sheets have an outer rim that is **71–86 % `#102910`, V 0.161** — four hundredths
of a V above the near-black threshold, and continuous all the way round, where the arcade's own
shadow edge is **one-sided** at `#840000`, V **0.518**. That looks exactly like a black keyline
repainted just above the gate. It is not: `#102910` carries **876 interior pixels against 538 rim
pixels** on `enemy-camo-head.png`, so it is the body's dominant mid-tone reaching the edge, not a
drawn outline — and the genuinely near-black `#001000` (V 0.063) appears **406 px in the interior
and 0 px on the rim**. Grey and interceptor are unambiguous (rim 62 % `#adadad` V 0.678; 60 %
`#8c2910` V 0.549, beside the arcade's 0.518). Crops composited over the stage-1 sky:
`tools/out/judge-r8-arcade/rim-{camo,grey}-8x.png` — the grey jet reads as an aircraft, the camo
one as a dark-green cut-out, which ledger row 12 **licenses** for stage 2. Art question, not a
keyline violation.

## 3. The claim that matters most: emission rate, re-derived independently

**What I ran, and what I abandoned, stated first.** I launched two 120 s × 2-seed sets. After
**64 minutes of CPU each** neither had finished its *first* arm — the machine held load average
53–76 throughout from other agents' work — so I killed both and re-ran a leaner set. Killing them
I followed R8's own new hygiene rule: `pkill -P` on the children first, then the parents, then
`ps` to confirm no orphan survived holding an output path. **Confirmed: no `judge_probe` process
and no chromium child of either run survived, and neither output directory was ever written**, so
nothing here can be a mix of two runs. The 120 s arms are **not** in this report.

Result from a 30 s smoke pair, seed 1, `?fixed=1&invincible=1`, every tick sampled:

| arm | emission/s by **max id** | by **set of ids ever seen** | by **new-appearance count** | ledger kills/s | mean alive |
|---|---|---|---|---|---|
| `idle` — no trigger, no missile, no stick | **2.833** | **2.833** | **2.833** | **0.000** | 12.88 |
| `still` — trigger + missile, stick never touched | **3.200** | **3.200** | **3.200** | 1.767 | 10.55 |

Three operators agree **to the unit** on both arms, and the `idle` control kills exactly zero —
so **2.8 aircraft per second of flight arrive with no player input of any kind.** The combat
lane's 2.71–3.27/s is reproduced on an instrument that shares no code with theirs.

The same two arms carry three of the round's headline weapon claims, and they hold on a neutral
pilot that never touches the stick:

| quantity | R8's claim | my `still` arm (30 s, seed 1) |
|---|---|---|
| gun kills below the 10 %W readable gate | 79.1 % → **0.0 %** | **0.0 %** of 24 gun kills |
| median gun kill size | 8.20 → **11.05 %W** | **11.69 %W** |
| deepest gun kill | 59.8 → **9.36** | **6.93** |

**The `idle` control is doing real work in that table.** It fires nothing, and its kill ledger
reads **0** — so the 2.833 aircraft/s it counts is the spawner alone, and my own live-list
inference agreeing with the ledger at zero is the instrument validating against a known input.
A caveat on my own operator, stated: in the `idle` arm my departure classifier put **18** of 85
departures in the "killed" bucket purely because they left at depth > 2.95 while **0** kills
occurred — those are the overtake flights receding to the horizon, which the shipped classifier
now separates by the sign of the depth change. The emission figures are unaffected (they do not
use the classifier); every kill *share* quoted in this report comes from the ledger (`lg_total`),
not from the classifier.

**The mechanism is a constant, and naming it matters more than the rate.** `spawner.js` holds
`MAX_ALIVE = 14` and dispenses one aircraft every 0.14–0.34 s. Mean residence measures
`12.88 / 2.833 = 4.55 s`, against the `ln(90/2.6)/0.7089 = 5.00 s` the depth ramp predicts, so the
**cap binds essentially all the time**: emission is `MAX_ALIVE / lifetime`, not a spawn rate
anyone chose. `MAX_ALIVE` was 6 and was raised to 14 to satisfy R3's size-qualified density
criterion — the comment in `spawner.js` says so in as many words.

## 4. The denominator nobody has counted: the arcade's own emission rate

**This is the number the brief asked for. It confirms the combat lane's headline and refutes the
argument the lane reached it by.**

**Rule, written before any frame was opened**: frames from
`.reference-cache/video/ab2-longplay.mp4` (686×480, the map-keyed one) inside
`STAGE_MAP.md`-verified spans, sampled at a **fixed 2 s interval with no selection by content**;
count every enemy **aircraft** silhouette wholly or partly inside the play area; exclude the
player's own jet, missiles, vulcan rounds, enemy shots, explosions and smoke, HUD elements, and
ground/sea objects. Stage digit read on every sampled frame before counting.

**Stage identity verified, not assumed**: `tools/out/judge-r8-arcade/{s1-stagedigit-check,
s2-stagedigit,s4-stagedigit}.png` — stage 1 reads **1** on all 7 sampled, stage 2 reads **2** on
all 12, stage 4 reads **4** on all 12.

### 4.1 The arcade's kill rate, re-derived by me from the HIT counter

Stage 1, t = 92 → 119 s, HIT read off the HUD at 1 Hz
(`tools/out/judge-r8-arcade/s1-HIT-strip.png`): **0 at t95 → 13 at t119**, monotone, with the
documented salvo step (3 → 9 between t101 and t102).

> **13 kills in 24–27 s = 0.48–0.54 kills/s**, against the repo's twice-measured 0.42–0.45/s.
> Same order, slightly higher on this span. **The arcade kill anchor is sound.**

### 4.2 The arcade's on-screen aircraft count — hand counted

| span | frames | per-frame enemy count |
|---|---|---|
| stage 1, t92–118, every 2 s | 14 | 0, 3, 3, 2, 4, 3, 2, 1, 1, 0, 1, 2, 2, 4 — **mean 2.00** |
| stage 1, four more at **offsets I had not sampled** (t93, 101, 107, 113) | 4 | 0, 1, 0, 0–1 — pooled 18 frames, **mean 1.64** |
| stage 2, t128–142 | 4 sampled | 3, 1, 0, 0 |
| stage 4, t210–220 | 2 sampled | 2, 1 |

> **Arcade mean on-screen enemy aircraft: 2.00 over the pre-registered 2 s grid, 1.64 once four
> off-grid frames are added.** Range **0–4**. Reading the two ambiguous salvo frames at their most
> generous (8 and 6 instead of 4 and 3) lifts the 14-frame mean only to **2.6**.
>
> **The four extra frames were taken as a check on my own sampling and they moved the mean DOWN.**
> That is the direction that matters: if the 2 s grid had accidentally favoured busy moments the
> whole finding would weaken, and it did the opposite. I quote **2.0** below as the conservative
> figure.

**And the same operator, on our own frames.** This is the part that makes the comparison
like-for-like: not `alive` out of the simulation (which counts off-screen aircraft) but a hand
count on a displayed frame, by the same reader, under the same rule. Five frames from
`judge-r8-critA-97`, resampled to 686×480 so they are read at the arcade's own size
(`tools/out/judge-r8-arcade/ours-f*-686.png`):

| frame | stage | enemy aircraft counted |
|---|---|---|
| `frame-0002` | 1 | **6** |
| `frame-0010` | 1 | **6** |
| `frame-0018` | 1 | **10** |
| `frame-0026` | 2 | **~6–7** |
| `frame-0034` | 2 | **~7–8** |

> **Ours ≈ 7.2 on screen against the arcade's 2.0 — 3.6×, on one operator, one reader, one rule.**
> The simulation's own `alive` counter reads 10.5–12.9 over the same build, the difference being
> aircraft off screen.

**The pilot-skill objection, and why it does not rescue the number.** The arcade span is an expert
longplay pilot killing 0.5/s, which holds his population down; my frames are `?demo=1`, whose
autopilot kills ~0.96/s. So our side is the *weaker* pilot, which should inflate our count — and
does. But the comparison does not depend on it: our **`idle`** arm, which kills nothing at all and
is therefore the absolute ceiling of our population, holds **12.88** alive, and our **`still`** arm
holds 10.55. There is no pilot, on our build, that brings the population anywhere near two. Run the
objection the other way and it is worse: the arcade's own **opener** — f0010, before the pilot has
killed anything — carries **three**.

The figure is `judging/R8/r8judge-01-DENSITY-arcade-top-ours-bottom.png`, and it is worth opening
before reading any further number in this report: the arcade frames have one or two aeroplanes in
a wide empty sky, and ours have a rank of six identical head-on silhouettes in a row.

### 4.2b An AUTOMATED statistic that corroborates the hand count — and the operator I tried first and threw away

**The obvious automated operator does not work and I am saying so rather than quoting it.**
Counting connected non-sky components in the sky band returns 5–8 on arcade frames and **2–11 on
ours** — our aircraft *overlap*, so six of them merge into one 14 698 px blob and the component
count reads **2**. A component counter under-reads the crowded side and over-reads the empty one;
pointed at this question it would have said the arcade is busier than we are. It is in the
scratchpad and it is not evidence.

**What survives is the area, which needs no segmentation.** Same 686×480 output on both sides,
sky band `y[60,300)`, HUD blanked **to the sky colour** by rule before anything is counted, and
components touching the band floor dropped so terrain and sea cannot enter:

| | total non-sky px in the sky band | largest single component |
|---|---|---|
| arcade f0090 (t110) | **82** | 26 |
| arcade f0080 (t108) | **367** | 286 |
| arcade f0020 (t96) | **378** | 288 |
| arcade f0120 (t116) | **621** | 343 |
| arcade f0010 (t94) — the opener fly-past, the busiest frame in the span | **6 329** | 5 683 |
| **ours f0018** | **6 593** | 5 814 |
| **ours f0002** | **11 188** | 6 358 |
| **ours f0010** | **14 746** | 14 698 |

> **The arcade's median frame puts 378 px of aircraft in the sky. Ours puts 11 188 — thirty
> times as much — and our quietest frame is above the arcade's busiest.**

Both sides include the player's own jet, so it is like-for-like. The bias runs **against** my
conclusion in two ways and it still holds: the arcade side is a blurred video downscale whose
soft edges *add* non-sky pixels, and any cloud in the arcade's sky band counts as aircraft.

**A second operator discarded on its control, so the table above is five frames and not 140.** To
sweep the whole span cheaply I wrote an area-only version with no connectivity at all — a pixel
counts if it is not sky *and* lies above the lowest sky pixel in its own column, which is meant to
drop sea and shoreline without segmentation. It returns **21 387 px for f0090**, a frame the
component operator scores at **82** and I hand-counted as nearly empty. The rule fails the moment
the world is **rolled**: with a diagonal horizon there is still sea above the lowest sky pixel in a
column. Validated on a known input, failed, dropped. **The five-frame table is the measurement;
the hand count over 24 frames is the measurement; there is no 140-frame sweep behind either and I
am not implying one.**

### 4.3 The arcade's emission rate, two independent routes that agree

**Route A — Little's law.** `λ = L / W`. `L ≈ 2.0–2.6`. `W` = mean residence; GAME_SPEC §4's
MEASURED approach is **4–6 s** and an expert pilot shortens it, so `W ≈ 3.5–5 s`.

> **λ ≈ 0.40 – 0.74 aircraft/s** (L = 2.0–2.6, W = 3.5–5 s).

**Route B — the HIT counter bounds it from below.** 0.48–0.54 kills/s on the measured span;
emission cannot be below the kill rate.

> **Together: the arcade emits roughly 0.4 – 0.74 aircraft per second of flight. We emit
> 2.83 – 3.20.** Taking the brackets at their widest that is **3.8× to 8×**; at the midpoints,
> **≈5×**. I quote it as **4–6×** below and the conclusion survives the whole bracket.

**Internal consistency, and the bracket is wide so I will state it as a bracket**: 0.48–0.54
kills/s against 0.5–0.7 emissions/s puts the arcade's expert pilot at **roughly 70–100 % of
everything that arrives** destroyed. Our tracking pilot is at 94.1 % (combat lane) and my neutral
`still` arm at **55 %** with the stick never touched. **The two games are not distinguishable on
the share killed; they are distinguishable by a factor of 4–6 on how much there is to kill.**

### 4.4 What this does to the round's biggest claim

The combat lane's conclusion — **"the kill rate is not a weapon property; it is set by the
spawner"** — is **CONFIRMED**, and its supply figure is reproduced on an independent instrument.

**Its supporting argument is REFUTED, and the difference changes what R9 should build.** The lane
wrote: *"a pilot at ≤0.90/s would have to let ≥67 % of all traffic fly past, which is a pacing
decision."* That inference silently uses **our** emission rate as the denominator. With the
arcade's own emission measured, the arcade pilot does **not** let two thirds of the traffic go —
it kills roughly 70–100 % of what arrives, a share indistinguishable from ours. **The two games differ in supply, not
in the share killed.** So the fix is not "make ≥67 % of aircraft survive"; it is **cut emission by
4–6×, and the single constant that does it is `MAX_ALIVE`.**

It also prices the side effect the lane feared instead of guessing it: cutting `MAX_ALIVE` cuts
mean alive proportionally, so R3's "≥1 enemy at ≥10 %W in ≥60 % of frames" must be **re-derived**,
not assumed to break — the arcade satisfies that criterion's spirit with **two** aircraft on
screen. `MAX_ALIVE = 14` and R3's density gate are a feedback loop between two of our own numbers
with no arcade in it.

**Caveats, stated so this is not over-read**: the hand count is **24 frames over three stages, by
one reader (me), on a 686×480 video**; distant aircraft at the vanishing point are 2–4 px and two
salvo frames carry lock-bracket clusters I could not resolve into individual aircraft. Residence
`W` is taken from GAME_SPEC's existing MEASURED 4–6 s band and is **not** re-measured here. A
second reader and a tracked-individual lifetime measurement would tighten the range; **they would
have to move it by more than 4× to change the conclusion.**

### 4.5 A THIRD independent source lands on the same number, and it is this repo's own spec

**GAME_SPEC.md §4, ADOPTED, never retired**: *"spawn interval per stage tightening from **1.5 s
(stage 1)** to 0.25 s (stage 23)"* and *"dispense one enemy at a time on a 0.2–0.5 s tick,
**hard cap ~7 alive**"*.

> **1.5 s on stage 1 is 0.67 aircraft/s** — inside the 0.40–0.74/s I measured off the arcade, and
> nowhere near the shipped **2.83–3.20/s**. The shipped `spawner.js` runs `MAX_ALIVE = 14` against
> the spec's ~7, `DISPENSE_MIN_S/MAX_S = 0.14/0.34` against the spec's 0.2–0.5, and
> `WAVE_GAP = 0.9–1.6 s` against a first implementation of 2.6–4.2 s.

**Three independent sources — my arcade hand count through Little's law, the arcade HIT counter,
and this repo's own ADOPTED pacing spec — land between 0.4 and 0.74 aircraft/s. The code is the
outlier by a factor of four to eight, and GAME_SPEC was never updated to say so.**

### 4.6 How the number got to 14, and why the reason expired THIS ROUND

`spawner.js` says it in its own comment, and the chain is worth reading whole:

> *"Was 6, chosen to hold GAME_SPEC.md §8's raw '4-6 enemies visible in combat' — but the R3
> judge RETIRED that criterion … The replacement criterion is size-qualified (≥1 enemy at ≥10 %W
> in ≥60 % of combat frames), and a 6-enemy cap cannot deliver it: an enemy is only ≥10 %W for
> the last ~1.4 s of its ~5 s approach, and measurement showed **roughly two thirds of spawns are
> shot down before they ever get there**. The density is bought with POPULATION … 6 → 10 → 12 →
> 14 were each measured."*

So `MAX_ALIVE = 14` is a value **swept against one of our own gates, with no arcade side ever
measured for it.** R3's criterion was a correct response to a real defect; what nobody did was
ask what population the arcade holds it with. The answer, from §4.2, is **two aircraft.**

**And the load-bearing clause of that justification stopped being true in R8.** "Two thirds of
spawns are shot down before they reach readable size" was the mechanism that forced the cap up.
R8's own shipped fix — `READABLE_SPAN_FRAC = 0.10` applied in `vulcan.resolveHits`, not just in
the assist — **makes it impossible for the gun to kill an aircraft below 10 %W at all.** The
population no longer leaks away before it becomes readable; that is precisely why readable
presence went from 27 % to ~80 %. **R8 removed the reason for its own spawn rate and did not
revisit it.**

### 4.7 What population R3's gate actually needs — derived, not guessed

From my `idle` arm (no trigger, no missile, no stick, so nothing is killed and the population is
purely the spawner's): **readable-enemy presence 90.5 % at mean alive 12.88.** If an aircraft is
readable for a fraction `p` of its life and arrivals were independent,
`1 − 0.905 = (1 − p)^12.88` gives **p = 0.167** — an aircraft is at ≥10 %W for ~17 % of its life,
i.e. ~0.76 s of a 4.55 s residence, which matches the spawner comment's own "~1.4 s of its ~5 s
approach" to the right order.

Solving the same expression for R3's gate, `(1 − 0.167)^N ≤ 0.40`:

> **N ≈ 5.0 aircraft alive clears "≥1 enemy at ≥10 %W in ≥60 % of frames".** Waves arrive
> correlated rather than independently, which pushes the requirement up, so call it **5–8**.
>
> At 4.55 s residence that is **1.1 – 1.8 emissions/s** — within ~2–3× of the arcade instead of
> 4–8×. On screen (56 % of `alive` is on screen on this build, from §4.2b's hand counts against
> `meanAlive`) that is **2.8–4.5 aircraft against the arcade's 2.0**, i.e. 1.4–2.2× instead of
> 3.6×.

**This is the R9 experiment and it is one constant.** It is a derivation with a stated
independence assumption, not a measurement; the way to settle it is to sweep `MAX_ALIVE`
downward and read readable-presence and drought off the same probe, which takes one afternoon
and no new tooling.

## 5. Ledger audit

**Count**: 36 rows, numbered **1–36 contiguously — no gaps, no duplicates**. STATUS.md's
"thirty-six … R8 added seven: rows 30–36" is arithmetically consistent, and rows 30–36 each carry
a round column and a status.

### 5.1 The "fourth class of silent wrong number" — the RULE stands, the TAXONOMY does not

The mechanism is **real and I verified it from source**: `flow.js:274` makes
`playLaunch = params.get('demo') === '1'` the only route into the `launch` state;
`launchSequence.js:83` gives `LAUNCH_TOTAL_S = ON_DECK_S + CLIMB_S = 1.0 + 2.5 = 3.5 s` = 210
ticks; and `this.stageTimer += dt` appears **once** in the file, at line 581, inside
`_updateFlight` — `_updateLaunch` (line 569) does not advance it. Every stage boundary in a
`?demo=1` run is therefore displaced by the whole launch, and predicted and measured agree to the
tick (1 921 → 2 132). The rule that follows — *a tick index is not a reportable quantity without
the URL that produced it* — is correct, cheap, and belongs in REFERENCE.md beside row 27.

**Two objections to how it is framed.**

**(a) It is not a fourth class, and the case for it was made by quoting the existing class with
the decisive word removed.** STATUS.md states class 2 as *"a validated operator pointed at the
wrong population, resolution, region **or sample**."* `judging/R8/ask-ladder.md` §A7b restates it
as *"a validated operator pointed at the wrong population/resolution/region"* — **"or sample" is
gone** — and then argues the new case is none of the three. But the TL's own framing, quoted two
lines above it in the same file, is: *"Only reading the flow state out of the frame showed the two
samples were **not the same sample**."* The word that makes the case class 2 appears in the
argument for its not being class 2, and is missing from the definition the argument is checked
against.

The other proposed discriminator — that *both* measurements are correct about their own subject —
does not separate them either: class 2's canonical instance is the R6 stage palette, measured
correctly on a stage-2 frame and applied to stage 1. REFERENCE.md already says of class 2, in the
very words now offered as the new class's signature, that *"it produces exactly reproducible wrong
numbers, and cross-validating two implementations cannot detect it."* The lane concedes the point
itself — *"it is the stage-digit rule one level up, and the same remedy."*
**A failure whose remedy is identical to an existing class's remedy is an instance of that class.**
Keep the rule, which is new and useful; do not open a fourth taxon. **And the specific thing to
avoid repeating is quoting a definition one clause short of the clause under discussion** — which
is, pleasingly, the same defect as row 27's.

**(b) "Cross-validating implementations actively reinforces this class" is refuted by the episode
that produced it.** The defect was found **because two independently invoked readers disagreed** —
29 against 28 at tick 1 950 — and that disagreement started the four-candidate hunt. Cross-validation
did not hide it; it is the only thing that surfaced it. What carries no information about input
identity is cross-validation over a **shared artefact**, and the lane's own §0 shows that case
passing blind: `probe.mjs` against `inst.py`, **13/13 exact on dumped ticks** — same frames, so the
agreement could never have spoken to which run produced them. The correct statement is narrower and
more useful: **cross-validation over a shared input cannot see an input-identity defect;
cross-validation over independently produced inputs can, and here it did.** Framed as
"cross-validation reinforces the error", the lesson argues against the practice that caught it.

### 5.2 Rows I checked and accept

- **Row 32 (population assertion)** — `tools/assert_population.py --selftest` **PASS on this
  tree**, including the control that matters: it refuses R7's twelve published frames (weapon
  0/12, explosion 0/12, enemy-fire 12/12) and accepts a known-good `?demo=1` kill set. §2.5 above
  is the first figure produced under this rule by someone who did not write it.
- **Row 33 (stage-digit operator)** — the brightness test `mean(RGB) > 170` over
  `y[200,207) x[184,192)` is replaced by exact-ink Hamming. Not independently re-derived; the
  published reasoning (cream ink on a 3-px glyph with no opaque plate, box mean tracking the sky)
  is consistent with the frames I have.
- **Row 35 (keyline class rule)** — see §2.6. Rule right, closing figure reproducible, rim
  definition missing.

### 5.3 Rows carried forward as NOT re-derived

Rows 26, 27 and 28 already carry an explicit "R7 JUDGE AUDIT: accepted as reported, not
independently re-derived". **I did not re-derive them either**, so they have now gone two rounds in
that state. Row 28's three-arm `DEATH_TOTAL_S` isolation in particular is a single unreproduced
experiment that a gate's stated reason now rests on.

## 6. The three refuted levers — **arithmetic and mechanism audited from source; the arms were NOT re-run**

Stated first, because it bounds everything below: **I did not reproduce these three sweeps.** The
machine ran at load average 53–76 throughout from other agents' work, and a single 120 s arm of my
own probe was still unfinished after 64 minutes of CPU. What I did instead is check each lever's
*mechanism and arithmetic against the source*, which is enough to say whether the published
direction can be right and not enough to confirm its magnitude.

**(a) The hit radius was 1.6× the target's wingspan — CONFIRMED EXACTLY, from source.**
`vulcan.js:371` is `const radius = Math.max(span * this.hitMult, HIT_RADIUS_FLOOR_FRAC)` and
`HIT_RADIUS_SPAN_MULT` was `0.8`. A radius of 0.8 × span is a **diameter of 1.6 × span**. The
shipped 0.5 makes the kill circle exactly the aircraft's own footprint, which is the "statable
rule" the lane claims for it. This is the lever nobody proposed and it is real, arithmetically,
with no measurement needed.

**(b) Narrowing the assist's depth band made the gun MORE lethal — the published CONFOUND checks
out to the second.** The lane's explanation is that `assistmax=7.0596` with `assistmin=6` still in
place leaves an assist band **0.23 s wide**, so the assist is effectively off and every round
flies unbounded to `DEFAULT_TARGET_DEPTH = 55`. Enemy depth is geometric at
`depthRate = 0.7089 /s` (`enemy.js:462`), so the time from depth 7.0596 to depth 6 is
`ln(7.0596/6)/0.7089 =` **0.2295 s**. The lane's 0.23 s is exact. **The arm measured a gun with
its assist switched off, not a narrowed assist** — and the lane says so itself and draws the right
conclusion from it (that the single-lever table is misleading and that the fix had to go to a span
gate, not a depth bound). **Accepted, including the self-correction.**

**(c) Aim scatter makes the gun MORE lethal — direction PLAUSIBLE, published MECHANISM WRONG, and
the difference matters.** The implementation is confirmed: `vulcan.js:289-293` perturbs the
**aim point** per round by `scatterFrac`, with its own PRNG stream. The lane's stated mechanism is
*"widening the dispersion grows the swept area faster than it shrinks the per-round hit
probability — scatter is a shotgun, not a handicap."* **That is false for a gun whose aim is
already centred**: for a convex target and a centred aim, any dispersion strictly lowers the
probability that a given round lands, and "swept area" buys nothing because the rounds were
already inside the circle.

The effect is real for a different reason, and the source shows it. `onHit(e, 1)` with
`fighter/interceptor hp: 1` means **one hit kills**, so what matters over a burst is
`P(at least one round lands)`, not the per-round rate. For an engagement whose aim error already
exceeds the hit radius, that probability is **0 without scatter and positive with it**; for one
inside the radius it falls from 1 but stays high. Scatter therefore adds kills **exactly to the
extent the aim is habitually off** — which this build guarantees, because R8 shipped
`ASSIST_Y_FRAC = 0` and handed the whole vertical axis to the player.

**Why the distinction is not pedantry.** Under the lane's mechanism the +7 % is a property of the
weapon and scatter is permanently disqualified as a difficulty lever. Under the mechanism the code
actually implements, the +7 % is a property of **how badly the gun is currently aimed**, it
shrinks as aim improves, and it would behave differently again once §4's population change makes
targets scarcer. The lane's disposition — ship it wired and inert at 0 with the cost published —
is still the right call. **Its "what must not happen is anyone reaching for it as a difficulty
lever" should be read as "not at this aim quality", not as a general law.**

## 7. What nobody has looked at

### 7.1 `REACH_CEILING_NDC_Y` — arithmetic CONFIRMED, disposition correct

`spawner.js` now states that every input of the constant's published derivation has moved and that
re-deriving it gives **+1.388**, past the top of the screen. I re-derived it: player ndcY ceiling
**+0.4597**, sight offset **+0.30** → 0.7597; lock radius 22 %W = **±0.44** in NDC x, × (320/224) =
**0.6286** in y; **0.7597 + 0.6286 = 1.3883**. Exact. The constant stays at 0.64, relabelled
ADOPTED-retained-on-a-side-effect rather than derived, with the reason published (the statistic it
suppresses already matches the arcade, 34.9 % against 32.5 %). **Right call, recorded the right
way**; the gap closes as a documentation defect.

### 7.2 The throttle's parallax half — **CONFIRMED STILL OWED, from source**

`render/clouds.js:417` is `const CLOUD_SPEED = 9.5; // world units/s, independent of ground
scrollSpeed`, and `game.js:367` calls `this.clouds.update(dt)` — **no speed argument exists to
pass.** Both of the throttle's live spans check out from source: `flow.js:165`
`THROTTLE_SCROLL_MULT = [0.62, 1.0, 1.45]` → **2.339×** L-to-H on the ground, and
`spawner.js:401` `THROTTLE_CLOSURE_MULT = [0.92, 1.0, 1.1]` → **1.196×** on enemy closure, newly
wired this round. The combat lane's 2.34× and 1.19× are exact. The cloud layer gets **nothing**. The R7 note stands verbatim; it is one interface away and it is nobody's file this round.

### 7.3 The missile restock — the combat lane's cross-lane ask is real and UNACTIONED

`combat.js:40` `MISSILE_START_STOCK = 50`; `flow.js:378` sets `this.combat.missileStock =
MISSILE_START_STOCK` at **every** stage boundary, with its own comment calling that "a cheap
stand-in". GAME_SPEC.md §5 has the arcade mechanism MEASURED: **resupply fills TO 70**, at
**two specific points** (the stage-5 runway restock and the tanker), not every stage. So the
missile's kill contribution really is set by a stand-in economy rather than by the arcade's, and
the combat lane's ask to the flow lane is correctly aimed. **Not actioned this round.**

### 7.4 The nose sight — a closure nobody claimed

R7's open item read "ours is 3.125 %W, ~2× too big; target 1.4–1.8 %W".
`lockSystem.js:168` now reads `const SIGHT_PX = 5; // of 320 = 1.563 %W, OUTER edge to outer
edge` — the arcade's own measured value, with the comment explicitly scoping the change to SIZE
ONLY and leaving `SIGHT_NDC_Y_OFFSET` alone, which is what the open item asked for. **Closed, and
not listed among the round's claims.**

### 7.5 Head-on enemy planform — **UNVERIFIABLE on the footage in this repo**

The lead is that our head-on enemy is a continuous swept V where the arcade's is an X of
separated blades. Our side is plain: `tools/out/judge-r8-arcade/rim-{camo,grey}-8x.png` show a
single unbroken V from wingtip through fuselage to wingtip. The arcade side cannot be read — both
true-native frames carry only distant enemies, and every near-aspect reference is a 686×480 or
1028×720 upscale. My own attempt (`tools/out/judge-r8-arcade/z-headon-{a,b}.png`, the largest
stage-1 enemies in the span) resolves to blur at 4×. **This is STATUS.md acquisition item 5 and
it should not be worked until that frame exists.**

### 7.6 Gap 11's "single-file diagonal queue" is STALE

Our frames show enemies arriving in **echelons of three at a common altitude** plus crossers and
overtake flights (`judge-r8-critA-97/frame-{0002,0010,0018}.png`). Whatever else is wrong with
the arrival pattern — and §4 says a great deal is — it is not single file. The gap text should
be re-written rather than carried.

## 8. Ranked gap list for Round 9

Each gap has a reproduction, and each was checked against the arcade before it was written.

**0. WE EMIT 4–6× THE ARCADE'S AIRCRAFT AND HOLD 3.6× ITS ON-SCREEN POPULATION. It has never
been on a gap list and it is the first thing a player sees.**
*Arcade check*: §4. Hand count under a rule written first, 24 frames over three STAGE_MAP-verified
spans with the stage digit read on every one — **mean 2.0 enemy aircraft on screen (1.64 with four
off-grid frames added), range 0–4**.
Our own frames under the **same** operator — a hand count on a displayed frame — read
**6, 6, 10, ~6.5, ~7.5, mean ≈ 7.2**. Emission: arcade **0.5–0.7/s** (Little's law and the HIT
counter, agreeing); ours **2.7–3.3/s** (three operators on my probe, agreeing to the unit).
*Reproduction*: `node judging/R8/judge_probe_r8.mjs --modes idle --seeds 1 --secs 60 --out <dir>`
reads emission three ways with the stick untouched; the arcade side is
`ffmpeg -ss 92 -t 28 -vf fps=5` on `ab2-longplay.mp4` plus the figure
`judging/R8/r8judge-01-DENSITY-arcade-top-ours-bottom.png`.
*The lever is one constant*: `spawner.js` `MAX_ALIVE = 14`. §4.7 derives **5–8** from our own
`idle` arm as the population that still clears R3's ≥60 % readable gate, and §4.6 shows the
justification for 14 **expired in R8** — it rested on "two thirds of spawns are shot down before
they reach readable size", and R8's own span gate makes that impossible.
*Carry the tension rather than ignoring it*: fewer aircraft means fewer shooters, and R4 gap 5
forbids losing enemy fire. See gap 2.

**1. R3's density criterion has never had an arcade side, and it is what set `MAX_ALIVE`.**
*Arcade check*: the criterion is "≥1 enemy at ≥10 %W in ≥60 % of combat frames". The arcade meets
its spirit with **two** aircraft on screen. Nobody has ever run the criterion on arcade frames.
Worse, **this repo's own GAME_SPEC §4 contradicts the code and was never reconciled**: ADOPTED
"1.5 s spawn interval on stage 1" = 0.67/s and "hard cap ~7 alive", against the shipped 0.14–0.34 s
and 14. *Reproduction*: read `spawner.js:43-55` beside GAME_SPEC §4. **A gate swept against our own
build, with our own build on both sides, is the circularity ledger row 18 is about — one level up.**

**2. THE NEXT DENOMINATOR NOBODY HAS COUNTED: the arcade's enemy ROUND rate.**
Every pacing decision now runs into "enemy rounds/min must not fall", and that gate was set
against **our** supply of shooters, exactly as the kill-rate gate was set against our supply of
aircraft. We report 140–147 rounds/min; **the arcade's figure does not exist anywhere in this
repo.** Until it does, gap 0 cannot be executed without someone guessing. *Reproduction*: count
enemy fireball trains entering frame over the same STAGE_MAP spans used in §4 — the sprites are
MEASURED and distinctive (GAME_SPEC §4: 4–8 ovals, `#ffd570` core, `#941114` rim).

**3. The keyline criterion's figure is published without its rim definition** — in the round that
closed it, under the ledger row that says not to. §2.6: the same sheets read 0.0–1.9 % or
4.0–13.2 % against a ≤2 % gate depending on whether concave notch boundaries count as perimeter.
*Reproduction*: §2.6's two rim definitions on `src/assets/sprites/enemy-*.png`. One line of
REFERENCE.md fixes it.

**4. The missile economy is a stand-in and it is the largest pilot-independent term in the kill
rate.** `flow.js:378` restocks `MISSILE_START_STOCK = 50` at **every** stage boundary; GAME_SPEC §5
has the arcade MEASURED as **fill to 70 at two specific points**. The combat lane asked for this
and it was not actioned. *Reproduction*: `grep -n missileStock src/game/flow/flow.js`.

**5. Restate the neutral/tracking gate against the fixed denominator.** The ≤40 % gate is
lane-declared MISSED at 64.0 %. Before anyone tunes a weapon to it again, note that §4 moves the
problem: with emission at the arcade's rate the whole ratio is computed over a different
population. **Do not tune weapons to this gate until gap 0 is settled.**

**6. The throttle's parallax half.** `clouds.js:417` `CLOUD_SPEED = 9.5 // independent of ground
scrollSpeed`, and `clouds.update(dt)` has no speed parameter. One interface.

**7. The stage counter now says STAGE 9 while the content laps every 3.** R8 made this trade
deliberately, measured it, and published the reasoning — correct call, and it is now the most
visible honesty gap in the build: a player who reaches stage 9 sees stage 3's palette. Content for
stages 4+ is the work.

**8. Acquisition item 5 — a true-native near-aspect arcade enemy — now blocks two things.** The
head-on planform question (§7.5) and the stage-1 livery target. Nothing should be tuned on either
until it exists.

**9. Criterion B's V-identity has no margin.** One frame of 126 at **49.81 %** against a ≥50 %
floor (§2.5). Not a failure; a warning that the ground dither is sitting on the gate.

**10. Ledger rows 26, 27 and 28 have now gone two rounds marked "not independently re-derived",
including by me.** Row 28 in particular is a single unreproduced three-arm experiment that a
gate's stated reason rests on.

## 9. Evidence index

**Everything below is mine, taken on `ea3726b`, with no tracked file modified.**

### Instruments, and the control each passed before anything was believed

| instrument | control | result |
|---|---|---|
| `judging/R8/judge_probe_r8.mjs` (new, mine) | `idle` arm — no trigger, no missile, no stick | **0 kills in the ledger**, 85 aircraft emitted. The emission number is not a function of the player |
| same | three independent emission operators on one run | **max-id = ids-ever-seen = new-appearance count, to the unit, on both arms** |
| same | served-source assertion before every run | `combat.js READABLE_SPAN_FRAC = 0.1`, `vulcan.js HIT_RADIUS_SPAN_MULT = 0.5`, `spawner.js MAX_ALIVE = 14`, `enemy.js FLY_PAST_DEPTH = 2.6` — all present, sha256 recorded in `arms.json` |
| same | refuses to report any arm that produced a page error | 0 arms refused |
| `tools/assert_population.py` | `--selftest` on this tree | **PASS**, including the negative control that refuses R7's twelve published frames |
| `tools/measure_criterion_ab.py` | `--selftest` | **PASS**, 10 synthetics + both arcade natives to the published digit |
| `judging/R8/judge_ladder_census.py` (mine) | within-3×3 block-spread assertion on every frame before any value is read | **worst spread 0 over 275 frames** — the 960×672 captures decimate to native losslessly |
| `judging/R8/judge_rim_census.py` (mine) | run under **two** rim definitions before publishing either | caught a 4.0–13.2 % reading that would have been a false refutation (§2.6) |
| the sheets are actually ON SCREEN, not a procedural fallback | exact-colour membership of `enemy-grey-head.png`'s authored palette in a stage-1 capture (`enemySprite.js` falls back silently to a procedural drawing when a sheet fails to decode) | `#e6e6e6` 1 187, `#adadad` 1 163, `#949494` 624, `#c5c5c5` 152, `#e61000` 153, `#f7efa4` 30 native px — and camo's `#102910` **0**, correctly, on a stage-1 frame. **The sheets I measured in §2.6 are the sheets the capture rendered** |
| `judging/R8/judge_sky_area.py` (mine) | HUD blanked **to sky** and band-floor components dropped before counting; a third, area-only variant was **discarded on its control** (§4.2b) | arcade median 378 px of aircraft in the sky band against ours at 11 188 |

### Capture sets (all `tools/out/judge-r8-*`, all new, all mine)

| set | URL (from its own `capture-manifest.json`) | n | what |
|---|---|---|---|
| `critA-{97,137,211}` | `?demo=1&invincible=1&fixed=1&seed=1` | 42 each | Criterion A/B in a population asserted from the pixels |
| `stagedigit` | `?demo=1&invincible=1&fixed=1&seed=1`, `--every 1500` | 13 | the HUD stage digit to 325 s |
| `death2-{7,13,29}` | `?forcedeath=3&fixed=1&seed=1` ×2, `?demo=1&forcedeath=4&fixed=1&seed=1` | 60/40/30 | the death cycle, with `deathPhase` proving the cycle is in frame |
| `title` | `?showtitle=1&fixed=1&seed=1` | 6 | title ladder census, after |
| `title-BEFORE` | same, on a `git worktree` of **`82365e9`** | 4 | title ladder census, before |
| `smoke` | `?fixed=1&seed=1&invincible=1` | 2 arms | the 30 s emission pair |
| `armsA`, `armsB` | `?fixed=1&seed=N&invincible=1`, 120 s × 2 seeds | **0** | **killed before writing anything** — see §3. No output directory exists; nothing from them is quoted |
| `armsC`, `armsD` | `?fixed=1&seed=1&invincible=1`, 40 s | **0 at the time of writing** | the lean re-run (`still,trk,arctrk`) and a parallel `trk`-only arm. **Both were still on their first arm when this report was finished — 28 and 10 minutes of wall clock for 2 400 ticks each.** If `tools/out/judge-r8-arms{C,D}/arms.json` exists when you read this, it was written **after** this report and **no figure here comes from it.** The three rows marked NOT MEASURED in §2 are the ones they were for |
| `judge-r8-arcade/` | `ab2-longplay.mp4` extracts | 140 + 24 + 11 | the arcade spans, stage-digit strips, HIT strip and crops |

**Hygiene, pooled across the Criterion A sets**: 126 frames, **126 unique sha256 — 0
within-directory and 0 cross-directory duplicates**, 0 black frames. Across all 275 captured
frames: 0 black, worst block spread 0, off-ladder union `{159}`.

**A control I am naming rather than quietly excluding**: `tools/out/judge-r8-death` is my
**failed** death capture — 40 frames that never left the `launch` state. It is kept as the worked
example in §2.5c and **must not enter any pooled figure.** Per the standing rule it should carry
a `-control` suffix; it does not, so it is named here instead.

### Figures

| file | shows |
|---|---|
| `judging/R8/r8judge-01-DENSITY-arcade-top-ours-bottom.png` | the round's finding in one image: arcade stage 1 at t96 and t116 (3 and 2 enemy aircraft) above our stage 1 at the same scale (6 and 10) |
| `tools/out/judge-r8-arcade/s1-HIT-strip.png` | the arcade HIT counter 0 → 13 over stage 1, read at 1 Hz |
| `tools/out/judge-r8-arcade/arcade-stage-digits.png` | the arcade stage digit reading 1,2,3,4,6,7,9,10,11,12,15 |
| `tools/out/judge-r8-arcade/our-stage-digits.png` | ours reading 1…10, STAGE 9 at tick 18 000 |
| `tools/out/judge-r8-arcade/{s1-stagedigit-check,s2-stagedigit,s4-stagedigit}.png` | stage identity on every arcade frame I counted |
| `tools/out/judge-r8-arcade/rim-{camo,grey}-8x.png` | the two enemy liveries over the stage-1 sky — the §2.6 near-miss |

### What I did NOT measure, named so it is not read as checked

- The combat lane's `?gun=` R7-equivalent control (its explicit ask to the judge). Not re-run.
- The before arm of the death-cycle gate (43/120) — only the after.
- Ledger rows 26, 27, 28.
- The arcade's enemy round rate (gap 2), the arcade's aircraft residence time (I used GAME_SPEC's
  existing MEASURED 4–6 s band), and the two-digit stage layout.

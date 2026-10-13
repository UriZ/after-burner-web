# After Burner II — Measured Visual Reference

Every value here is either **MEASURED in this pass** (frame + pixel coordinates + sampled
value given) or **ADOPTED** from the Godot prototype's verified measurements (the
measurement method and its location in `../afterburner` are cited so it can be re-run).
Nothing below is eyeballed. If a value you need is missing, measure it — do not infer it.

---

# PROJECT-WIDE ACCEPTANCE CRITERIA (MEASURED R5)

**These two apply to EVERY frame and EVERY sprite, in every round from R5 onward. They are
not gap-specific; they are the floor.**

## READ THIS BEFORE ANY RENDER, PALETTE OR SPRITE WORK — and read the POPULATION column first

Criteria A and B were published in R5 as GATES and then **cited in no gap list, in no ask, and
in none of the six R5 lane reports.** The R5 judge went looking for what nobody had checked and
found that stage 1 misses them **by two orders of magnitude**, and named that as the mechanism
behind the owner's verdict on the build ("it's very bad"). They are restated here, at the top,
with a per-stage scoreboard, so that a lane cannot work a round without meeting them.

### EVERY ROW OF THIS SCOREBOARD STATES ITS POPULATION (REPAIRED R7, ledger row 21)

**The table below used to state none of them, and the asymmetry it hid is the whole finding.**
Every our-side row was a frame with **no enemies, no shots, no explosions, no lock brackets and
no trails on screen**. Every arcade-side row is a frame **in combat**. The gate was being
reported as if the two columns were the same population; they were two different games.

**The arcade side, measured, not assumed.** Both true-native frames are combat frames — look at
them (`tools/out/criteria-r7/arcade-combat/{desert,night}-3x.png`):

| true-native arcade frame | what is on screen | colours | chan (union) |
|---|---|---|---|
| `ab2-arcade-desert.png` (**stage 2**) | the player jet, **two green-camo enemy aircraft** (rear aspect), **in-flight missiles with red tips**, two grey smoke puffs, the nose sight square, ~17 px of magenta/violet shot-or-debris, cloud puffs, full HUD | **138** | **31** |
| `ab2-arcade-night-banking.png` (**stage 3**) | the player jet mid-blast inside a **fireball + debris spray of 732 warm px spanning 121 × 51 native px = 37.8 %W × 22.8 %H** (blast core alone, largest 8-connected component: **658 px, 50 × 30 = 15.6 %W × 13.4 %H**), four clouds, full HUD | **79** | **17** |

> ### THE FIREBALL FIGURE IN THE ROW ABOVE WAS RE-DERIVED IN R8, AND SO WAS THE LICENCE (ledger rows 30 and 31)
>
> **R7 published "107 × 41 native px = 33.4 %W × 18.3 %H, 809 warm px, operator
> `R>100 ∧ R>B+60`" and that figure does not reproduce, because no box was published with
> it.** Run on the whole frame the operator gives **2 201 px / 306 × 208 / 95.6 %W** — the city
> lights and the HUD ink are warm too. R8 swept **25 operator variants** (`R>` threshold
> 90/100/110/120/128 × `R>B+` delta 40/50/60/70/80) across **every row window** in y[60,140) and
> found **no reading within ±6 px of 809 and ±2 px of 107 × 41**. The figure is
> **UNREPRODUCIBLE, not refuted** — a real blast with a debris spray is there, cropped and
> looked at (`judging/R8/crit-r8-02-ARCADE-NIGHT-FIREBALL-BOX.png`).
>
> **The replacement states its box and its exclusions, which is the whole point:** operator
> `R>100 ∧ R>B+60` over **native y[74,130), full width**, 8-connected components, then the
> **player's own two nozzle discs** (32 px each, y[112,117] x[174,179] and y[124,129]
> x[145,150]) and **two warm streaks lying along the wing** (46 px and 28 px) removed by
> inspection → **732 px, bbox 121 × 51**. The wing streaks are the one judgement call in it:
> they may be spray over the wing rather than the jet's own highlight, so the figure carries
> **±74 px**. The largest single component — **658 px, 50 × 30** — is the blast core and needs
> no judgement call at all; prefer it when one number is wanted. Note the restated width is
> **larger** than the withdrawn one, not smaller: what was wrong with 33.4 %W was its
> provenance, not its size.
>
> **A FIREBALL MASK MUST NOT BE RUN ON A DAYLIGHT-DESERT FRAME. Measured both sides**: the warm
> operator selects **78.3 %** of `ab2-arcade-desert.png` and **84.1–92.3 %** of our own
> digit-verified stage-2 frames, against **3.1 %** of the arcade night native and **2.2–2.5 %**
> of our stage-1 and stage-3 frames. On stage 2 it returns the ground. Ledger row 30.
>
> ### THE LICENCE IS AN ARGUMENT ABOUT HARDWARE, AND THAT IS WHY IT HOLDS (ledger row 31)
>
> R7 wrote that the licence "is a measurement rather than an argument about hardware" and
> supported it with *a 33 %W fireball costs the arcade nothing — the night frame holds its
> entire blast inside 17 channel values*. **That sentence is literally true and evidentially
> empty, and the inversion in it is the point.** Measured in R8 on the native frame:
>
> | operation on `ab2-arcade-night-banking.png` | A1 colours | **A2 chan values** |
> |---|---|---|
> | untouched | **79** | **17** |
> | blast cluster y[74,130) blacked out (870 px) | 67 | **17** |
> | **every warm pixel in the frame blacked out** (2 201 px) | **52** | **17** |
>
> **Channel values unique to the blast: none. Zero.** The fireball's levels are already in the
> frame, so it consumes **0** of the A2 budget — which demonstrates nothing about whether a
> fireball *can* be held inside a channel-value budget. And the reason is structural, not
> artistic: **the 17 values are every other rung of the 31-value ladder this document enumerates
> three sections below, and that ladder is the hardware's.** A frame cannot carry a level the
> DAC cannot emit. The desert native's 31 and the night native's 17 are **31 of 32 rungs used**
> and **17 of 32 rungs used** — not two frames exercising restraint.
>
> **So the arcade cannot fail A2 on any frame, in any population, with or without an explosion
> — and that is a STRONGER licence than the one it replaces, not a weaker one.** The gate
> value ≤32 is the width of the hardware's colour ladder. It does not need a true-native
> daylight explosion frame to be licensed against daylight explosions, because no 1987 frame of
> this game could have exceeded it. What the missing daylight explosion frame still blocks is
> the *colour* side (A1) and the fireball's daylight palette — see STATUS.md's acquisition list,
> entry 4.
>
> Two honest limits on that reasoning, stated so it is not over-read. (1) It rests on **two
> frames** plus this document's own ladder section, which attributes the irregular spacing to a
> resistor ladder; if the hardware has a mode that emits intermediate levels, a frame using it
> would exceed the ladder, and **neither native shows one**. (2) It licenses **A2 only**. A1
> (≤256 colours) has no hardware ceiling we can demonstrate from these frames, and the arcade's
> **daylight combat frame spends 138 of 256 colours with no explosion in it** — so the colour
> half of the gate is the half still worth watching, and it is the half the night blast
> actually costs something in (**79 → 52 colours**, 27 of them the warm pixels').
>
> Our `?combatexpl=1` isolation arm read **218** at `e8fed58`. **That figure is withdrawn** —
> see the arm table below; it is **19–21** on the shipped tree, measured over frames that were
> asserted to contain a fireball.

**Where the build stands, by population.** Two tree states, both clean checkouts, both measured
by this lane on the published instrument (`tools/measure_criterion_ab.py`, `--selftest` PASS
against both arcade frames and thirteen synthetic controls before it was pointed at anything):

| tree / population | n frames | colours min/med/max | chan union min/med/max | ground H-id | ground V-id | over the A2 gate |
|---|---|---|---|---|---|---|
| **GATE** | — | **≤256** | **≤32** | **≥50 %** | **≥50 %** | — |
| arcade desert, **in combat** (stage 2) | 1 | **138** | **31** | 68.7 % | 68.5 % | 0 |
| arcade night, **mid-explosion** (stage 3) | 1 | **79** | **17** | 84.0 % | 80.2 % | 0 |
| `53ce86b` ours stage 1, **no combat on screen** | 1 | 13 879 | 254 | 31.9 % | 0.1 % | 1 of 1 |
| `53ce86b` ours stage 2, **no combat on screen** | 1 | 374 | 170 (per-ch 118) | 64.2 % | 42.6 % | 1 of 1 |
| `53ce86b` ours stage 3, **no combat on screen** | 1 | 989 | 249 (per-ch 245) | 60.0 % | 39.7 % | 1 of 1 |
| **`e8fed58` ours stage 1, `?nocombat=1`** | **24** | **46 / 51 / 51** ✓ | **21 / 21 / 21** ✓ | 79.3 / **80.8** / 82.4 ✓ | 50.8 / **56.4** / 60.8 ✓ | **0 of 24** |
| **`e8fed58` ours stage 1, ORDINARY PLAY** | **49** | **59 / 71 / 99** ✓ | **28 / 53 / 98** ✗ | 78.8 / **80.6** / 82.4 ✓ | 50.7 / **56.3** / 60.8 ✓ | **48 of 49** |

> ### R7 FINAL TREE — CRITERION A PASSES. **ITS POPULATION LABEL WAS WRONG AND IS CORRECTED HERE (ledger row 32)**
>
> | commit | population — **as asserted in the frames**, not as invoked | n | colours | chan union | over A1 | over A2 |
> |---|---|---|---|---|---|---|
> | **`5913af6`** | ~~ordinary play, combat on~~ → **enemy traffic and enemy fire only: 0 frames with a player weapon, 0 with an explosion, 12 of 12 with enemy shots** (`?fixed=1&seed=1&invincible=1`, spacings 97/137/211, stage digit 1 on every frame) | **12** | **62–70** ✓ | **26–30** ✓ | **0 of 12** | **0 of 12** |
> | `82365e9` (judge R7) | **ordinary play WITH the player firing**: `?demo=1`, **3 seeds × 1 200 consecutive ticks**, 55 kills and 26 missiles inside the window, Criterion A on **every** tick | **3 600** | 47–85 ✓ | **19–32** ✓ | **0 of 3 600** | **0 of 3 600** |
> | `82365e9` (judge R7) | the same build over **12 000 consecutive ticks**, crossing six stage boundaries | 12 000 | — | 24 / 29 / **37** ✗ | 0 | **336 (2.80 %) — the tally card, see gap 3** |
>
> **The conclusion stands; the evidence for it did not, and the correction is the second row.**
> Under `?fixed=1` with no `?demo`, `main.js` injects **no input at all** — so the twelve frames
> the first row was measured on hold no player weapon, no kill, no explosion and no missile
> trail. The R7 judge read the simulation's counters over 900 consecutive ticks of that exact
> URL (`vulcanRounds` 0, `missilesInFlight` 0, `hits` 0, every tick) and then measured the
> population the row claimed, which is the second row. **R8 reproduced the same verdict from
> the captured pixels alone** — `tools/assert_population.py` on
> `tools/out/tl-r7-final-{97,137,211}`: PLAYER-WEAPON 0/12, EXPLOSION 0/12, ENEMY-FIRE 12/12.
> The frames even print **HIT 0** on their own HUD.
>
> **This is ledger row 21's own defect, inside the repair for ledger row 21, in this table, one
> round later, published by the lane that spent that round enforcing the rule on everyone else
> — and confirmed a second time by a team-lead verification that used the same invocation.**
> Ledger row 32, and the binding rule it yields is three paragraphs below.
>
> **This supersedes the ordinary-play row below**, which was measured on `e8fed58`. The R7 world
> lane flagged that its own whole-frame figures were a composite over five lanes and asked for a
> re-measure against whatever was committed; this is it, and **Criterion A passes on the
> composite, not merely per lane.** The `e8fed58` rows stay on the record because they are what
> the population defect (ledger row 21) was diagnosed from.
>
> **Carried as a worked example of citation field 5.** The figure was first circulated **without
> its capture directory or commit**, and this lane declined to confirm it and went looking —
> landing on an unrelated R5-era directory and reading 13 997 colours. Nothing was wrong with
> the measurement; the provenance line was missing, and the number was therefore unreproducible
> by anyone but its measurer. Once the directories and the commit were supplied it reproduced in
> one run. **That is the whole argument for field 5, and it happened to the gate at the top of
> this document in the round the field was being enforced elsewhere.**

**Read the last two rows together — that is the point of the column.** The same build, the same
commit, the same instrument: **Criterion B does not move with the population** (80.8 → 80.6 H,
56.4 → 56.3 V) and **Criterion A moves by a factor of two and a half and fails.** So the
population caveat binds **A, not B**: a Criterion B figure may be quoted from a `?nocombat=1`
capture; a Criterion A figure may not.

### The isolation arms, with the content of each arm ASSERTED IN ITS FRAMES (R8)

**Historic, `e8fed58`** (6 frames each, judge-R6 captures): `?combatonly=enemies` **59 / 30** ✓ ·
`?combatonly=enemies,shots` **70 / 54** ✗ · `?combatexpl=1` **337 / 218** ✗ · `?demo=2`
**407 / 229**, max **1 375 / 255** ✗.

**Shipped tree, `82365e9`** — the judge's 15-frame-per-arm captures, re-measured in R8 with
`tools/assert_population.py` run over the same frames so that each A2 figure names what was on
screen when it was taken:

| arm | n | **frames holding the arm's own object** | A1 | **A2** | verdict |
|---|---|---|---|---|---|
| `?nocombat=1` | 15 | — (nothing is claimed) | — | **19 / 19 / 19** | ✓ |
| `?combatonly=enemies` | 15 | enemies present, 0 weapon / 0 fireball | — | 25 / 26 / 28 | ✓ |
| `?combatonly=enemies,shots` | 15 | **ENEMY-FIRE on 12 of 15**; two frames also hold **2 326 / 2 380 px of fireball palette** | — | 25 / 28 / **47** | **✗ 1 of 15 over** |
| **`?combatexpl=1`, FIREBALL ON SCREEN** | **7** | **395–2 206 fireball px, 0 player weapon** | **55–60** | **19 / 21 / 21** | **✓ closed** |
| `?combatexpl=1`, **no fireball on screen** | 8 | 0 px — an empty sky | 47–52 | 19 / 19 / 19 | **not a reading of this arm** |
| `?combattrail=1` | 15 | 0 px; **byte-identical to `?nocombat=1`** at the same index | — | 19 | **null arm — do not quote** |

> **`?combatexpl=1` is closed, and the 218 is struck — but one of the judge's three spacing arms
> measured an empty sky and nobody could have known.** At spacing **29** four of five frames hold
> a fireball; at **113**, three of five; **at spacing 71, none of the five do**. A quoted
> "19 / 19 / 19" from that arm is a reading of blue sky with a cloud in it. Cropped and looked at
> both ways: `judging/R8/crit-r8-01-POPULATION-CONTROL-expl-arm.png`. This is the same defect as
> ledger row 32 **inside the judge's own confirmation of it**, which is why the rule below is
> about frames and not about lanes.
>
> **`?combattrail=1` cannot be used at all** until something presses the missile button: under
> `?fixed=1` nothing does, so every frame of it is `?nocombat=1`. Any missile-trail figure ever
> taken through this arm measured an empty sky.
>
> **The `enemies,shots` over-gate frame is contested and is NOT settled here.** The R7 judge
> attributes its 29 extra channel values to a near-field *enemy airframe*; the R7 art critic
> reproduces the number exactly and attributes it to the *tumbling death hulk*. R8 adds one
> fact and no verdict: the over-gate frame (`arm-enshots-113/frame-0003`) holds **0 px of
> fireball palette**, so whatever it is, it is an airframe-like object and not a blast. Combat's
> lane owns the reconciliation; it decides whether gap 7 is an enemy-palette fix or a death-hulk
> fix, and the two have different owners.

**One stage-attribution trap, recorded because this lane fell into it.** My first sweep read
25 "stage-1 nocombat" frames and found one at 33 channel values. Cropped and looked: it is a
**stage-2** frame — `s1-nc-419/frame-0004.png`, HUD digit 2 — that the capture walked into, and
33 is the independently measured stage-2 median. Excluding it by digit gives 24 frames at a flat
21. **A capture directory named for a stage is not a stage attribution.**

### THE STAGE-DIGIT OPERATOR — the published one could not fire, and the one that works is this (REPAIRED R8, ledger row 33)

> **Published until R8, and struck:** ~~`mean(RGB) > 170` over native `y[200,207) x[184,192)`, a
> bar-shaped glyph for "1"~~. It **returns FALSE on every genuine stage-1 frame in the repo** —
> box mean **99.8–135.9** over 75 digit-verified stage-1 captures, **0 of 75 firing**, and 0 of
> 180 across stages 1, 2 and 3. Two independent reasons, either alone fatal: the digit is drawn
> **over the world with no opaque plate**, so a 3-px-wide cream glyph in a 7×8 box leaves the box
> mean tracking the sky (the *same* digit reads 135.9 over bright sea and 101.4 over dark sea);
> and the box is in the wrong place — `hud.js`'s `M_STAGE_DIGIT` is cx 187 / y 200 drawn
> **centred on the ink**, so the cell starts at x **183**, not 184.

**THE OPERATOR, as it is actually implemented and as it must be cited** —
`tools/measure_stage_identity.py`, whose own header has documented the brightness failure since
R7 while this document went on publishing the brightness test:

> Decimate to true native 320×224 (centre pixel of each k×k block, **every block proved
> uniform first or the frame is refused**). Take the 7×7 cell at native **x 183, y 200**. Ink is
> **exact equality** against `hud.js`'s `CREAM` `#f7f794` — not a threshold, because the sea's
> own bright caps (`#d6f7f7`, `#b5e7f7`) survive any brightness test and the sea body
> (`#0010e7`) survives a blue-channel one. Compare the 7×7 ink mask against `font.js`'s
> `BIG_GLYPHS` 1–9 with ±1 px of horizontal slop (`drawTextCenteredInk` centres on the ink
> extent, so an even-width glyph rounds either way); **best Hamming match wins, the distance is
> reported, and a cell with <8 ink px is REFUSED rather than guessed.**

**Its control, and this is the part that makes it citable** —
`tools/verify_stage_digit_operator.py --selftest` runs both operators side by side and asserts
each fails where it must:

| control | exact-ink Hamming | the published brightness test |
|---|---|---|
| synthetic glyphs **1–9** over the stage-1 sky | reads **every one**, Hamming **0** | fires on **none of the nine**, including the "1" it was written for (box mean 84–141) |
| **KNOWN-BAD: a cell with NO DIGIT, filled with sea caps `#d6f7f7`** | **REFUSES** (0 ink px) | box mean **236.0 → "STAGE 1"** |
| a genuine "1" over **dark** sea | reads **1**, Hamming 0 | box mean 134.1 → **misses it** |

**It fails in both directions on constructed inputs with known ground truth** — invents a stage
on a digit-free cell, and misses a real digit on a dark background. That is why no figure keyed
to it can be trusted, and why the control is published with the operator rather than left in a
tool.

**Cross-checked against an instrument that never looks at the HUD.** On 180 of the R7 judge's
captures the Hamming reader's digit and the **modal colour of native rows 20–60** agree
completely: digit 1 → `#009fff` (74/75), digit 2 → `#e67300` (47/47), digit 3 → `#000000`
(57/58). The two exceptions read `#f7f7f7` — a cloud filling the sky band, which is a cloud
census finding and not a contradiction. Two instruments, one answer, and the second one cannot
see the digit.

Our-side provenance, `53ce86b` rows: `tools/out/judge-r5/hud-s{1,2,3}/frame-0000.png`, 960×672,
decimated `img[::3,::3]` with the 3×3 block-uniformity **proved** (max block deviation 0, the
tool refuses to measure otherwise); each frame carries **HIT 0** and no combat object of any
kind — the population claim is read off the frames, not off a URL parameter nobody recorded
(`tools/out/criteria-r7/arcade-combat/judger5-hud-s123.png`). `e8fed58` rows:
`tools/out/judge-r6/s1-{nc,play,play3}-*`, same decimation and block proof, stage digit read on
every frame, Criterion B region = the published ground band rows **140–195** of 224, full width,
minus `tools/out/judge-r6/hudmask/hud_mask.npy` (1 264 px, derived per run by
`tools/hud_mask.py`). The R5 judge's B figures use rows below a *per-frame fitted horizon*
instead of the fixed band and run 3–8 points apart from the fixed-band reading on stages 2–3;
**the region choice is the whole difference and neither reading changes a single pass/fail
verdict.**

**What the stage-1 numbers look like**, because a number this extreme must be cropped and looked
at before it is published (CLAUDE.md): `tools/out/criteria-r6/value/cmp-dither-ours-TOP-arcade-BOT.png`
— the same 120×40 native crop, same 8× nearest upscale. Ours is **3 443 colours** of
continuously-varying blue in horizontal smears where every row differs from the row above (that
is what V-identity 0.1 % *means*); the arcade's is **36 colours** in flat chunky blocks with
readable rock and foliage. Looked at; the number is honest.

**And they are not sufficient on their own.** Both rows above are region *averages*, blind to
arrangement. **Report an extremal statistic beside every figure in that table** — for stage-1
sea the published pairing is SEA-DASH (largest bright component ≤ 200 px, max width ≤ 60 px,
count ≥ 300, against the arcade's 82 / 38 / 389). A build that passes the scoreboard and not
the pairing has not passed. This is ledger row 18 and it is not hypothetical: it happened to
this exact sea in this exact round.

**Which tool to run.** `tools/measure_criterion_ab.py` is the instrument to measure the build
with — it fits the horizon per frame, derives a `hud+static` mask from the frames themselves
rather than from a box, and sweeps a capture directory. `tools/criteria_lane_ab_control.py` is a
separately written control that reports both readings of A2; keep both, and note that **five
implementations now reproduce the arcade controls exactly** (this document's original, the R5
judge's, the R6 judge's, and those two).

**BINDING: a Criterion A figure published without its population is not a figure.** State which
of `?nocombat=1`, ordinary play, a named isolation arm or `?demo=2` it came from, and how many
digit-verified frames. The same sentence already applies to any our-side number via "What a
complete citation is" field 4; it is restated here because the gate at the top of this document
is where it was skipped.

### BINDING, AND NEW IN R8: A POPULATION IS A POSITIVE CONTROL. ASSERT IT IN THE FRAMES (ledger row 32)

> **A population claim is verified by an assertion over the captured frames themselves, never
> by the invocation that was intended to produce them.**
>
> An invocation is an *intention*. A URL parameter records what a lane meant to capture; a frame
> records what it captured, and the two came apart in R7 on the gate at the top of this
> document — in the table repaired that same round for the same defect. **Every stage of that
> pipeline agreed with the intention.** The parameter was spelled correctly, the capture ran,
> the frames were non-black, de-duplicated across directories and digit-verified, and the
> population was still absent, because `?fixed=1` without `?demo` injects no input at all. **No
> hygiene sweep this project runs looks at CONTENT.** Two people checked and both checked the
> URL.
>
> So treat a population the way an instrument treats a positive control: before a figure is
> computed over it, prove the thing being claimed is in the pixels. Run
> `tools/assert_population.py <dir> --require weapon,explosion` and quote its counts beside
> the figure. It reads the authored palettes out of `src/` at run time (so it cannot silently
> go blind when a lane retunes a constant), counts **exact-colour** membership — sound here
> because every effect is snapped to a declared palette by `effects/pixelTexture.js` — and
> reports three classes separately:
>
> * **PLAYER-WEAPON** — vulcan, muzzle flash, missile airframe and exhaust;
> * **EXPLOSION** — the fireball palette. **This does NOT imply a kill**: the player's own
>   death explosion is the same palette, and two R7 `?combatonly=enemies,shots` frames hold
>   2 300+ px of it with no player weapon in the arm at all;
> * **ENEMY-FIRE** — enemy shot sprites and the shot telegraph. Reported separately **on
>   purpose**: it is what R7's no-input captures *did* contain, and it is why those frames
>   looked like combat to everyone who checked them. **A set with enemy fire and nothing else
>   is the false positive this rule exists to refuse.**
>
> Its controls, all passing: a black frame detects nothing; a planted 49-px patch reads exactly
> 49 with no cross-talk; **the same patch one channel level off reads 0** (membership is exact,
> so a gradient cannot satisfy it); colours shared with cloud/smoke/HUD greys (`#e6e6e6`,
> `#9c9c9c`, `#f7f7e6`) are held in a weak set that never decides a verdict; a bilinear upscale
> is **refused**, not averaged; `?nocombat=1` and `?combatonly=enemies` read **0 in every
> class**, which is the per-tree proof that the detector has not drifted into the background
> art. And the control that matters: **run on the twelve frames R7's headline Criterion A
> figure was published over, it refuses them** — 0/12 weapon, 0/12 explosion, 12/12 enemy fire.
>
> Not detected: the **missile smoke trail**. `trailPalette.js` is achromatic by measurement
> (the arcade's plume is near-white), so it is not separable from cloud by colour. Assert a
> trail population in page, or through the missile exhaust that precedes it.

**Scoping as of `e8fed58`, and it has moved.** Stage 1's *background* is closed — the R6 world
lane's rebuild passes all four readings on 24 of 24 digit-verified nocombat frames, and the crop
agrees. What is open is **two different things that the old one-line scoping sentence hid**:

1. **The effects layer**, which fails A2 in ordinary play on 48 of 49 frames — explosions
   dominant, enemy shots enough on their own. This is a *class* (soft alpha perimeters
   generating a fresh continuum at every edge), and it is the same mechanism the world lane
   removed from `clouds.js` to win stage 1.
2. **Stage 3's night ground**, which passes Criterion A on four background colours and fails
   Criterion B's V gate at 43.8 % because it dithers them per pixel where the arcade lays them
   in flat regions (background-only V-identity **45.5 %** against the arcade's **95.4 %**).
   Row 18's lesson, on a stage nobody measured. Stage 2 fails A2 at **33** in the horizon glow
   band, not in the ground (27 against the ground's 13).

## Why these two exist, and why they are different from everything else in this doc

Every other criterion in this document is a **summary statistic** — a mean, a percentile, an
autocorrelation ratio, a coverage fraction — and *a statistic can be satisfied by an object
that looks nothing like the thing the statistic was measured from*. Six concentric rings and
a real fireball can share a p50. Isotropic specks and drawn wave streaks can share an
autocorrelation ratio. A 2.475:1 silhouette can be an F-14 or a crab claw — that one is not
hypothetical, it is R4's actual finding.

This project has now retired or repaired **thirty-six** criteria as non-discriminating or plain
wrong across five rounds — the ledger is at the end of this section so the count stops
drifting. **Seven were added in R8**, and the shape of those seven is worth more than the
count: **three of them are a published operator that could not produce the number published
beside it** (rows 30, 33, 34), and **one is this document's own flagship gate quoted over a
population its frames did not hold** (row 32) — in the table repaired the round before for
exactly that. Every one of them was a summary statistic, and every one of them was passed by
a build that looked nothing like the arcade.

The two criteria below **cannot be laundered by a continuous-tone renderer**, because they do
not describe appearance — they describe the *medium*. A continuous-tone renderer cannot satisfy
them at any tuning, and a palette-and-dither renderer satisfies them almost automatically.

**That claim was stated without the qualifier until R6, and the missing qualifier cost a
round.** They CAN be laundered by a **degenerate** renderer: a palettized field of a few
enormous flat slabs satisfies both by a wide margin and scored H-identity twenty points *above*
the arcade's own. See ledger row 18 and "A self-identity or cardinality gate is satisfiable by
a degenerate structure" below. **Neither criterion may be reported without a paired extremal
statistic** — largest connected component, maximum extent, component count. The scoreboard
below is incomplete on its own, by construction. They are one-line
measurements, they are cheap, and both would have caught every defect in `judging/R4/
art-critique.md` in round 1. They come from that report; the numbers below are my independent
re-measurement of its claims, including the places where I had to correct them.

### A SYNTHETIC CONTROL CANNOT VALIDATE A QUALITY STATISTIC — IT MUST BE RUN ON A KNOWN-QUALITY PAIR (PROCESS RULE, binding from R10)

> **Every instrument in this project has been validated one way and none had ever been
> validated the other.**
>
> A **synthetic control** proves an operator **computes what it says**: that `RP90` really is
> the 90th-percentile stroke width, that a mask really excludes the HUD, that a decimation
> really is exact. This project is good at those and should stay good at them.
>
> **It cannot prove that a QUALITY STATISTIC RANKS CORRECTLY**, because in a synthetic the
> person building it decides which arm is the better drawing. **The answer is an input.**
>
> **BINDING: any criterion that claims one drawing, one behaviour or one build is better than
> another must be run on a KNOWN-QUALITY PAIR before it is licensed as a gate.**

**What made this binding.** R9 published DRAW-WEIGHT, the first criterion in this project for
*drawing*. It was validated against synthetics, against rigid rotation, against two independent
implementations, against three mask rules and against our own alpha channel — five kinds of
validation, more than any other instrument here has had. **It was never once run on two real
sprites whose relative quality was already known.** That test takes ten minutes and the subjects
were already in the repository. The R9 art critic ran it and the gated statistic preferred the
untouched sprite. **The sign was the one property nobody had checked, on the instrument with the
most controls.**

#### What IS a pair — four conditions, and three ways to fail

1. **Both arms are REAL subjects from this build or from the arcade.** Not synthetics.
2. **The direction was settled BEFORE and OUTSIDE the statistic under test** — by an
   independent critic, by a judge, or by the project accepting a redraw.
3. **The comparison is INSIDE the statistic's own licence** — matched span, matched palette,
   named mask, same subject class: whatever that statistic already requires of any other
   comparison. *A pair run outside the licence tests nothing the licence had not already
   disclaimed.*
4. **NOT CIRCULAR: the lane that produced the "after" arm was not gated on the statistic under
   test.** A lane told to reduce RP90, which then reduces RP90, is not evidence that RP90 ranks
   drawings. It is evidence that the lane can read. **This is the condition that is easiest to
   satisfy by accident and hardest to notice**, because the strongest-looking pairs — the most
   recent redraws — are exactly the ones a live criterion was steering.

> **A pair failing condition 3 or 4 is still worth running and still worth publishing. It is
> not worth LICENSING on.** Say which condition it fails, in the row.

#### REFUTATION IS STRONG, SELECTION IS FITTING — added R10, within a day, by using the rule

A known-quality pair does two very different jobs and only one of them is sound at n = 1:

- **REFUTING a PRE-SPECIFIED statistic is strong.** The statistic was named before the pair
  existed, so the pair cannot have been chosen to suit it. R9 named *"ticks within 60 % of peak"*
  as the explosion's headline figure; the effects lane's triple ranks the plateau **above** the
  flash on it. **That refutation is clean and binding** — and so is RP90's on the enemy pair, once
  the licence condition is read.
- **SELECTING the winner from a menu of statistics is FITTING.** Run seven statistics against one
  known triple and one of them will rank it best by construction. **That is a hypothesis, not a
  validation.** `life10` ranked the triple correctly and is *not* licensed as a gate on that
  basis; `r100` is preferred over it for reasons **independent of the triple** — it reproduced
  across two implementations and two decodes to three digits, and being a single named lag it
  needs no event-boundary definition to inherit.

> **BINDING: a statistic selected because it ranked a known pair must be PRE-REGISTERED and tested
> on the NEXT pair before it is gated.** Name it, in writing, before the data exists. One pair can
> kill a criterion; it takes a second, unseen pair to license one.

#### WHICH CRITERIA THE TEST APPLIES TO — four kinds, and only one of them is at risk

Added R10 after the feel lane asked the right question about its own figures. **Classify before
demanding a pair; demanding one of a diagnostic is as wrong as skipping one on a ranking.**

| kind | example | does the pair test apply? |
|---|---|---|
| **QUALITY RANKING** — "higher/lower is better", the direction internal to the statistic | DRAW-WEIGHT's RP90 read without an anchor; LINEWORK; `w60` | **YES, and this is the only kind that can have an inverted sign.** Gate only after a pair |
| **FIDELITY MATCH** — "ours should read what the arcade reads"; the **arcade** supplies the direction | bracket 5.246 %W, VALUE-STAT's median, the sight step distribution | **Not in the same way** — there is an external referent, so the failure mode is a bad *anchor*, not a bad *sign*. What these need is the anchor's own population and operator, not a pair |
| **CONSTRAINT** — "admissible / not admissible", no direction at all | Criterion A, A3's `n95 ≤ 8`, the keyline budget | **No.** It cannot rank, so it cannot mis-rank. It can still be *satisfiable by something wrong* — that is ledger row 18's degenerate-structure rule, a different check |
| **DIAGNOSTIC** — reported, with **no preferred direction** | hit rate (**higher is explicitly NOT better — 100.0 % was the defect**), step-response peak tick, coast distance | **No, and do not let one become a gate by habit.** The hit-rate figure that matters is the *gap between pilot policies*, not the level |

> **The trap this table exists to close: a FIDELITY MATCH degenerates into a QUALITY RANKING the
> moment its anchor is missing**, and then it is at risk again. That is precisely what happened to
> DRAW-WEIGHT on the four objects with no arcade column (row 44). **Check for the anchor, not for
> the wording.**

> ### THE ANCHOR TRAVELS WITH THE FIGURE, NOT WITH THE CAPTION (binding R10)
>
> A fidelity match loses its anchor **by being quoted**, not by being wrong — and the commonest
> way is a before/after plot. *"Peak step moved 9.63 → 5.54"* is a fidelity figure while the
> arcade band is beside it and **an improvement score with no referent the moment someone lifts
> the numbers out.** Nobody has to make a mistake for this to happen; it is the normal lifecycle
> of a number in this repo, and rows 21, 30 and 32 are all the same lifecycle one step further on.
>
> **So: draw the arcade band INSIDE the image, not only in the caption, and state the anchor in
> the same sentence as the figure every time it is quoted.** A plot whose arcade line lives only
> in surrounding prose will eventually be screenshotted without it.
>
> **And the companion rule, from the same lane's own figures:** *if a before/after pair has no
> arcade band at all, it is not a fidelity match — it is two of our own numbers, and the only
> honest reading is "it changed", not "it improved".* (Raised by the feel lane against its own
> `r10-05`/`r10-06` before anyone quoted them — the third self-reported figure risk this round.)

**And one more thing a pair cannot do, learned the same day: an EXACT REPRODUCTION PROVES YOU RAN
THEIR OPERATOR, NOT THAT IT IS THE LICENSED ONE.** This lane reproduced an arcade figure "to the
digit", concluded the operator was pinned, and published it — and the figure was the *raw mask
share*, 6.03 %, where the licensed operator reads **4.32 %** on the same event (ledger row 51).
**Reproducibility and correctness are orthogonal, and this project's instinct is to read the first
as evidence of the second.**

#### The harness

`tools/known_quality_pair.py` (`--selftest`, 6 controls; `--pairs`). It takes pairs out of
**git history** — a sheet before and after a redraw the project accepted — so the direction is
not the instrument's to choose, and it masks with the sheets' own **alpha channel**, which is
ground truth, so for our-side pairs there is **no mask discretion at all**. The single largest
source of disagreement in DRAW-WEIGHT's history (ink 909 vs 1056, RP90 7.51 vs 9.73 on one
frame under two mask rules) is removed by construction. **That is why the test is cheap, and it
is most of the answer to why it took nine rounds.**

Control 6 is the one that matters: a **positive control on the gate**, proving the harness would
*show* a correct ranking if one were there (separated blades vs a slab at matched ink and span —
RP90 4.39 vs 20.67). A harness that only ever reports inversions is a broken harness.

#### THE RESULT, AND IT REVERSES THE EXPECTED DIRECTION — DRAW-WEIGHT'S SIGN IS NOT INVERTED

**Checked against the real pairs before being written down, which is this document's own rule,
and the check came out the other way.** Seven same-subject pairs — one sheet, one cell, before
and after a redraw the project accepted — scored **lower-is-lighter-is-better**, the reading the
criterion's own prose invites (*"how heavily the object is drawn"*):

| statistic | ranks | **INVERTED** | tied |
|---|---|---|---|
| **RP90** — *the gate* | **5** | **0** | 2 |
| RSW | 4 | 0 | 3 |
| DENS / INK-SPAN / bbox fill | **7** | **0** | 0 |
| LINEWORK *(the proposed replacement)* | 4 | **3** | 0 |
| runs-per-row *(the critic's own rejected one)* | 2 | **3** | 2 |

**And on the player jet, where an arcade anchor exists, DRAW-WEIGHT is monotone toward it across
every accepted redraw** — four tree states, three statistics, **never once moving away**:

| tree | | RP90 \|d\| from 9.82 | RSW \|d\| from 3.65 | DENS \|d\| from 87.8 |
|---|---|---|---|---|
| `a0826ea^` | pre-R6 | 3.08 | 2.12 | 38.3 |
| `a0826ea` | R6 "the jet is lit" | 2.30 | 2.06 | 32.1 |
| `2160842` | R7 "no black outline" | 2.30 | **0.87** | 26.1 |
| `010db2c` | R9 "blades, not a filled mass" | **0.48** | 0.87 | **19.8** |

**THE HONEST BOUND, and it cuts the result roughly in half.** Of the seven pairs, the three from
`010db2c` fail **condition 4**: the R9 drawing lane was gated on RP90 and tuned to it, so those
rows are circular for RP90, RSW and DENS. **The non-circular evidence is four pairs that predate
DRAW-WEIGHT entirely** (`a0826ea`, `2160842`, `1783060` ×2), on which **RP90 ranks 2, ties 2 and
inverts 0**, and DENS ranks 4 of 4. That is weaker than 5/0/2. **It is still not an inverted
sign**, and the bottom two rows of the first table are not weakened by circularity at all,
because no lane was ever gated on them.

#### SO WHAT WAS THE ART CRITIC'S INVERSION? IT IS REAL, IT IS ROBUST, AND IT IS A CROSS-SUBJECT READING

Reproduced here **to every digit** on `tools/art/inkspan.py`, and the critic's unstated population
recovered: it is **cell 0 of 5** on each sheet.

| | ink | span | DENS | RSW | **RP90** |
|---|---|---|---|---|---|
| `enemy-grey-head.png` cell 0 — *untouched* | 454 | 47.3 | 203.2 | 8.46 | **15.26** |
| `enemy-interceptor-head.png` cell 0 — *R9 redraw* | 446 | 45.2 | 218.5 | 8.85 | **18.25** |

**Extended to all five cells, which the critique did not do: the inversion holds on 5 of 5 for
RP90** (15.26/13.32/11.82/13.34/15.29 against 18.25/15.07/13.11/15.08/17.37), **so it is not a
cell-0 artefact.** RSW inverts on 4 and ties on 1. **DENS changes SIGN across the cells** (grey
is *higher* on cell 2, lower on cells 0/1/4), which is control 7 restating itself: DENS sees
3.7 % of the defect this operator exists to catch and should never be read as a ranking.

**But the two sheets are two DIFFERENT AIRCRAFT, and REFERENCE already said DRAW-WEIGHT may not
be read across them.** The box below states, in its own words, *"Near-aspect enemy, carrier,
title, death hulk — NO ARCADE COLUMN EXISTS. DRAW-WEIGHT is explicitly UNLICENSED on all four."*
**The pair fails condition 3.** Same sheets, same instrument, run as a **same-subject** pair
instead — the redrawn interceptor against **its own previous self** — and the gate ranks it
correctly by a wide margin:

> `enemy-interceptor-head.png` cell 0, `010db2c^` → `010db2c`:
> **RP90 25.14 → 18.25, RSW 12.57 → 8.85, DENS 252.3 → 218.5, bbox fill 42.7 → 37.3 %.**
> → `tools/out/criteria-r10/kqp/fig-enemy-crosssubject-vs-samesubject-6x.png`, **cropped and
> looked at**: the "before" is a solid filled delta, the "after" has separated wing strokes with
> a highlight and a shadow line and sky between them. The untouched grey beside them is a
> thin continuous white V. **It is thinner than both, and it is not better than either.**

**THE DEFECT IS THEREFORE NOT A SIGN ERROR. IT IS THIS, AND IT IS WORSE FOR BEING SUBTLER:**

> **A statistic with no arcade anchor degenerates into a DIRECTION, and a direction is the only
> form that can have a sign.** Where an anchor exists (the player jet, the far LOD) DRAW-WEIGHT
> is a **distance** and the player-jet table above shows it behaving perfectly. On the four
> objects where REFERENCE declares it unlicensed, the only reading left to a lane is
> *"lower is lighter, so push it lower"* — and **thin-and-continuous beats bladed-and-thicker
> under that reading, every time.** The licence was already written. Nothing enforced it, and
> the criterion's own prose — *"how heavily the object is drawn"* — invites the reading the
> licence forbids.
>
> **Binding: a DRAW-WEIGHT figure quoted without an arcade anchor is a diagnostic, and the
> sentence must say so. Do not write "lower is better" anywhere it has no anchor.**
> The highest-value acquisition this creates is the one REFERENCE already lists: **an arcade
> column for the near-aspect head-on enemy** (acquisition item 5). With one, the 69.2 %-of-pixels
> sheet becomes gateable. Without one, no amount of statistic repair helps.

#### THE REPLACEMENT CANDIDATE — LINEWORK, ADOPTED AS A DIAGNOSTIC, REFUSED AS A GATE

The art critic proposed **internal line-work density** — *adjacent in-ink pixel pairs differing by
more than one ladder rung, per 100 ink px* — stated its limits before anyone gated on it, and
called it *"a candidate, not a gate."* **That self-limitation was correct and it was not
conservative enough.** Four findings, all from running it:

1. **Its definition is not recoverable from its publication, and its two controls cannot pin it.**
   *"Ladder rung"* is undefined. Pinned as a **value difference `|ΔV| > rung`, `V = max(RGB)/255`,
   4-adjacency, counted once per unordered pair, per 100 ink px**, an implementation reproduces
   **both** published controls exactly (flat fill **0.0**, 1 px stripes **95.0**) — and those two
   controls return the **same answer for every rung from 0.004 to 0.5**. They are flat across the
   entire parameter they exist to fix. The published real-subject figures (67.0 / 73.1 / 80.8) are
   reproduced by exactly one window: **rung 0.095–0.098, a window 0.003 wide.** At the obvious
   pinning of one eighth the same pair reads **30.4 / 66.8**. *A gate whose published value moves
   2.2× inside the ambiguity of one undefined word is not a gate.*
2. **Roughly half of each published margin is PALETTE, not drawing** — measured by isolation, the
   drawing held fixed and only the value ladder changed:
   - re-index the untouched grey sheet's **own drawing, pixel for pixel**, onto the redrawn
     sheet's value ladder: LINEWORK **30.4 → 45.2**, which is **40.7 % of the pair's whole
     36.4-point gap**, with not one pixel moved. (DRAW-WEIGHT on the same re-indexed sheet is
     **unchanged to the digit** — ink 454, span 47.3, RP90 15.26 — which is the control working.)
   - re-index the **arcade day anchor's own drawing** onto our 8-level ladder: **80.8 → 69.8**,
     which is **49.6 % of the 22.2-point arcade-vs-ours gap.** The arcade carries **11 value
     rungs in the licensed mask where we carry 8.**
3. **It is a size statistic with a drawing term.** Across the nine day cells of **one sheet** —
   one drawing, nine poses — LINEWORK runs **58.6 at span 99.0 to 77.8 at span 65.3, a 1.33×
   spread, with `r = −0.998` against span.** Our **cell 0** reads **77.8**, within three points
   of the arcade's 80.8, purely because it is small.
4. **Its one cross-side figure was produced by resampling.** The published *"arcade 80.8 vs our
   jet 49.8 at matched span"* cannot be a native reading: our nine authored cells read **58.6–77.8**
   and the largest span in the sheet is 99.0 against the arcade's 109.7. Upscaling cell 4 by
   nearest to the R8 critique's on-screen span 114.1 returns **50.9**. **The span was matched by
   resampling one side, and resampling is the exact operation finding 3 says this statistic cannot
   survive** — it is scale-sensitive by the critic's own declaration, and my control 3 shows a
   2× nearest upscale halving it.

> **LICENSED: LINEWORK is a REPORTED DIAGNOSTIC, between two cells of the SAME SHEET at the SAME
> SPAN, and every figure publishes `rung`, `span`, and the number of distinct V levels inside the
> mask. It is NOT a gate, and it may NOT be read across the arcade/ours boundary at all** until
> both sides can be put at an identical span **without resampling**, which is not currently
> possible. *Its ranking of the known pair is correct and ~59 % of that margin survives the
> palette control — the core is real. The published magnitudes are not drawing magnitudes.*
>
> **RUNS-PER-ROW stays REJECTED, and now for a second reason.** The critic rejected it at
> 1.48 vs 1.54 as too thin to carry a gate — reproduced here exactly. On the same-subject pairs it
> is **inverted on 3 and tied on 2 of 7**, which is worse than thin. Recorded so nobody rebuilds it.

#### THE SWEEP — which existing criteria would survive this test

Run where it could be run, on the same four player-jet tree states. **Two results are new and
neither is a tidy-up.**

| criterion | kind | known-quality-pair result |
|---|---|---|
| **DRAW-WEIGHT** RP90 / RSW / DENS | ranking + anchor | **SURVIVES** where an anchor exists (table above); **DIAGNOSTIC ONLY** where none does |
| **JET-SIL** two-blade fin rows | ranking | **NON-DISCRIMINATING — 100.0 % on all four trees**, including the pre-R6 sheet the R6 judge replaced. Saturated before the work began; it cannot score any of it |
| **JET-SIL** blade cant | anchor (1.28) | **INVERTED on 2 of 3.** \|d\| 0.06 → 0.02 → **0.07** → **0.09**: both of the two redraws this project is proudest of moved cant *away* from the arcade. Reported as a direction with no error bound — **the statistic may simply be too coarse at this magnitude. Do not tune to it until that is settled** |
| **JET-SIL** fin extent | anchor (35.5) | ranks 2 of 3, inverted once (36.7 → 38.0 at R7) |
| **JET-SIL** nozzle separation | anchor (30.0) | ranks 2, ties 1, **never inverted** — survives |
| **JET-SIL** aspect SPAN/H | **constraint** (sanity 3.0–3.6) | not a ranking statistic; 3.12 is inside the range. Correctly not a gate |
| **VALUE-STAT** V median | anchor (0.8392) | ranks 1, ties 2, **never inverted** — survives. *And it corroborates ledger row 22's R8 correction by a completely independent route*: the authored cell-4 sheet reads **0.6431 before `2160842` and 0.8392 from it onward**, which is exactly the 0.643 → 0.8392 transition STATUS records from captures |
| **VALUE-STAT** black share | anchor (22.2 %) | **INVERTED on 2 of 3** on the authored sheet: \|d\| 9.0 → 10.6 → 2.6 → **7.9**, overshooting past the anchor. *Authored reading; STATUS's 18.9 % is a RENDERED reading and the two are not the same population (see "Authored vs RENDERED colour"). Flagged, not corrected* |
| **Criterion A / A3 / B**, keyline budget, `n95` | **CONSTRAINTS** | these do not claim one drawing is better, only that one is *admissible*. The test does not apply and they are not weakened by it. **But see the next paragraph** |
| ARCADE-PACING, deaths/min, emptiness, kill rate | behaviour | the rule generalises; **no settled pair of behaviours exists in this repo yet.** OPEN |

> **AND THE TEST HAS RETROSPECTIVE EVIDENCE IT DISCRIMINATES, which matters more than any row
> above, because it was not fitted to it.** Two criteria in the ledger below were **already found
> inverted** — row 18 (Criteria A and B rewarded a sea of enormous flat slabs: *"the gate improved
> as the art got worse"*, 20 points **above** the arcade) and row 36 (`enemysil.py`'s
> compact-feature gate *fails a drawing for having* the feature it wants). **Both were found by
> accident, rounds after they shipped. Both are exactly what a known-quality pair run in ten
> minutes would have printed.** The rule is not inferred from one case; it is the generalisation
> of three.

### The defective-criteria ledger (maintained; add a row, do not re-count from memory)

| # | criterion | what was wrong | round | status |
|---|---|---|---|---|
| 1 | jet fin-region width bound | **inverted** — the arcade's own t168 reads 21.0–24.4 %W and FAILS it while our wrong jet PASSES at 12.6 % | R4→R5 | REPLACED by the four discriminators under "Player jet" |
| 2 | missile-trail brightness mean V 0.37 | measured from a **night HUD's whole-frame grey average**; the cited frame contains no trail. Hitting it made our daylight trail black | R4→R5 | REPLACED: ≥0.90 V / ≤0.10 sat day, ≥0.85 / ≤0.10 night |
| 3 | explosion palette (t357 percentiles) | measured from **fading smoke** in a desert-tinted frame; blind to the white-hot core | R4→R5 | REPLACED by the fireball targets + FIRE-MASK |
| 4 | stage-1 cloud size/presence (#132 figures) | correct operator, **90 % non-cloud population** — 12 of 120 components were banks | R5 | REPLACED (size); presence **UNRESOLVED**, not a gate. **R9: the retired 9.26 %W figure is STILL CITED AS A LIVE JUSTIFICATION in `src/render/clouds.js:117`**, where trilinear minification is kept because nearest filtering *"crushes its width to ~1.9 %W against 9.26"*. The conclusion is probably still right — the shattering mechanism does not depend on the target — but the justification expired four rounds ago. Cross-lane ask, not a reversal |
| 5 | zero-cloud / HUD-overlap control | contradicted the arcade, which shows a bank behind SCORE / HIT; it compressed every bank into 32–58 %H | R5 | RETIRED |
| 6 | sea cross-track anisotropy 6.51× | **floor-limited** (divisor clamped to 1 px) and compared across two resolutions | R5 | RESTATED 4.95× vs arcade 5.21× at a common 686×480; R4 gap 10 **withdrawn as a defect** |
| 7 | `?demo=1` canyon lateral sd 6.19 %W | **aliased** — sampled at an interval dividing the 16.000 s attract cycle; same run reads 1.41–6.41 at different phases | R5 | RETIRED; sampling requirement now published |
| 8 | gap 5 "≤1.5 deaths/minute" | **denominator never named**, and it moved: a death cost 8.5 s, now 5.2 s, so identical lethality now scores worse. Deeper: the figure **measures the pilot, not the game** — our two recordings of the same ROM give ~1.3/min and **zero** | R5c | RESTATED (flight-time primary) **and DEMOTED to a regression guard**; see GAME_SPEC.md §2 |
| 9 | stage-2 open-plain target (median 4.2 %) | **4-frame sample** of a statistic with IQR 1.1–39.3; true median over 65 frames is 19.7 % | R5c | REPLACED by a distribution — see "Stage-2 open plain" |
| 10 | HUD "≥3:1 luminance contrast vs local background" | the arcade **fails it on its own red ink on stages 1 and 2 under both readings of "local background"** (5 of 12 element×stage pairs on the ring reading, 4 of 12 on the field). Relative luminance weights red at 0.2126, so a saturated red glyph cannot reach 3:1 over mid-bright ground; AB2 separates by hue and a black keyline. It also does not discriminate: ours and the arcade pass and fail together on every ink class | R5→R6 | **RETIRED.** REPLACED by the mechanism — see "HUD ink separation" |
| 11 | player-airframe value **ceiling V ≤ 0.77** (`judging/R4/art-critique.md` lines 557–571) | **inverted**, exactly like row 1. The figure is the brightest *cluster centroid of a median-cut quantization*, quoted as the sprite's brightest **pixel**. The arcade's own daylight jet has achromatic-pixel V **median 0.816–0.922** across five stage-verified stage-1 frames; our brightest airframe colour `#c5c5ad` is V **0.773**, i.e. **below the reference aircraft's median**. The ceiling capped us under the thing it was measuring | R5→R6 | **RETIRED.** REPLACED by a band — see "Player jet — airframe value" |
| 12 | **near-black dominant for the enemy** (`judging/R4/art-critique.md` line 737) | measured off `ab2-arcade-closeup-enemies.jpg`, which this lane re-read at its HUD digit: **STAGE 2** — orange sky, dark-green camo. Applied to **stage 1**, whose enemies are pale grey-white with dark accents over blue sky. The arcade flips enemy value per stage to hold contrast against its sky; the criterion exported one stage's answer to another. R4 caught this exact trap for the *player* palette and self-corrected; nobody carried the correction to the enemy | R5→R6 | **RETIRED for stage 1** (it remains right for stage 2). REPLACED by a polarity gate — see "Enemies — value polarity is per-stage" |
| 13 | gap 5 "**≤1.5 deaths/minute**" (the threshold itself) | **the arcade fails it by 36 % on wall clock and by 85–96 % on flight time**, with a competent human flying. A lane tuning to it would build a game half as lethal as After Burner II. Row 8 repaired the *denominator*; this row retires the *number*, which could only be checked once the arcade's own rate was measured (R5, twice, independently) | R5→R6 | **RETIRED.** REPLACED by ≤2.0 deaths/min of wall clock with flight time as the secondary line — see GAME_SPEC.md §2 |
| 14 | Criterion A2, "≤32 **distinct values per channel**" | **two operators, one name.** The published arcade figures (desert **31**, night **17**) are the **union over R, G and B** — the hardware ladder. Read literally as "per channel", the desert frame gives **29**. The night frame reads 17 both ways, which is why it went unseen for a round. The R5 judge's our-side column (stage 2 **118**, stage 3 **245**) is the *per-channel* reading, so the published table silently compared a union figure against a per-channel one | R6 | **REPAIRED, not retired** — the gate is the union; both readings are now reported and named. Verdicts unchanged (every figure on both sides is far from 32) |
| 15 | #132 cloud operator, arcade-side HUD exclusion | **not silent** (the rects are published) but **unusable as published**: the 4-tuple's coordinate convention is never named, applying it is never stated to be mandatory, it sits ~110 lines below the figures it protects, and no control existed to tell a reader whether they had applied it. Two of three independent R5 runs did not, and counted the arcade's own SCORE emblem as a cloud bank in ~a third of their detections | R6 | **REPAIRED** — convention named, made mandatory, moved next to the figures, and a one-line control published |
| 16 | sea **horizontal decorrelation band 1.21–2.25 native texels** | fitted to `t116`, a 686×480 **video** frame, with a **two-pixel kernel**. That band carries 19 896 colours and 11.4 % V-identity against the arcade's true-native 28–47 and 64–73 % — the number describes the re-encode, and ±30 % of it is a precision claim on noise | R6 | **RETIRED, no replacement** — none is possible without a true-native stage-1 frame. The paired-lengths *rule* survives; the numbers do not |
| 17 | sea cross-track anisotropy, **the R5 restatement** (4.95× vs 5.21× at a common 686×480) | row 6 fixed the *comparison* and left the *source*: the arcade's `hx = 41.626` is measured on the same contaminated `t116` band. Demonstrated by the statistic reversing its sign with resolution — one R6 build reads **3.04× at 686×480 and 4.56× at native**, moving opposite ways. There is **no clean common grid**: 686×480 non-integer-upsamples our side, native non-integer-decimates the arcade's | R6 | **RETIRED.** Regression guard between our own builds only, resolution named. Rows 6, 16 and 17 are one statistic retired, restated and retired again |
| 18 | **Criteria A and B themselves — "cannot be laundered"** | **narrowed, not retired.** Both are region averages and are blind to *arrangement*. A stage-1 sea of a few enormous smooth slabs passed all four readings and scored H-identity **89.3 %, twenty points ABOVE the arcade's 68.7 %** — the gate improved as the art got worse. Medians were identical on the slab build and the correct one (2 px); the whole defect lived in `max` (largest component 2 194 px against the arcade's 82) | R6 | **REPAIRED by pairing**: every cardinality/self-identity figure must now be reported with an extremal statistic. See the degenerate-structure process rule |
| 19 | **FIRE-MASK's control regions** | the operator published its control figures (mean V 0.9055 / V>0.95 54.2 % / core 9.2 % / mean S 0.846) **and not the three regions they were measured over**, nor its core predicate. Run verbatim it reads **core 17.2 %, mean S 0.764** — the white clause walks the largest component out into the top HUD strip, the bottom HUD strip and the cloud wedge, all 8-connected to the fireball so the largest-component step cannot drop them. **Cost two rounds**: R5 could not validate the core, read our own fireball at 4.1–7.8 % when it was **28–32 %**, and held it there as a deliberate trade that the art critique and the lead both endorsed | R5→R6 | **REPAIRED** — three rects, the core predicate and a reproduction control published beside the figures. Same repair as row 15, next operator along |
| 20 | fireball **brightest-decile saturation ≤0.30** | **RESTATED R7 — the drop stands, the published reason was wrong.** R6 recorded it as "a false negative by construction on our palette". It is not: it is **under-specified**, and the 0.952 that justified dropping it was produced by a *different operator from the one the criterion's own numbers came from*. Three things are unnamed in the criterion text — the mask, the ranking key, and whether "saturation" means the mean of per-pixel saturations or the saturation of the decile's mean colour. Under **the criterion's own operator** (not-background largest component, deciles ranked by **R+G+B**, saturation **of the decile's mean colour**) our fireball reads **0.062** against the arcade's **0.066** — it passes with enormous margin and lands on the arcade's own core colour. Under the **FIRE-MASK / V-ranked / mean-of-per-pixel-S** reading, ours reads 0.965 and **the arcade fails too, at 0.632**. A gate the arcade fails is ledger row 10's defect, not row 20's stated one. Reproduced on this lane's own implementation: arcade ladder `#9b0304 → #d2050c → #f25908 → #f6d619 → #f7f6e6`, brightest-decile sat **0.0658** against the published 0.063 | R5→R6, restated R7 | **STAYS DROPPED** (an under-specified gate is not a usable gate) with the reason corrected. Use the core fraction `S<0.25 ∧ V>0.94`. **The decile ladder stays as an authoring target and we now PASS it** — see "Fireball targets" |
| 21 | the **Criterion A/B scoreboard itself** — the gate at the top of this document | **every our-side row was a frame with no combat object on screen and the table did not say so, while every arcade-side row is a frame in combat.** A gate stated without its population, which is ledger row 15's defect relocated into the table this project scores itself on. On one commit (`e8fed58`) the same build reads **21 channel values** with combat off and **28–98, median 53, failing on 48 of 49 frames** in ordinary play. The R6 round's headline Criterion A result was true of `?nocombat=1` and false of the game | R7 | **REPAIRED** — population column added to every row, both populations published, the arcade side's combat content measured, and the licence stated. Criterion **B** was separately shown population-*insensitive* (80.8→80.6 H, 56.4→56.3 V), so the caveat binds A only |
| 22 | **VALUE-STAT's achromatic filter** (airframe value) | the operator states "keep achromatic pixels only, **S < 0.25**" and **never says what happens to V = 0 pixels.** It is not a footnote: on the arcade's native crop 22.2 % of the kept pixels are pure black and on our day sheet **30.7 %** are, and admitting or dropping them moves the median by **0.20 and 0.16 respectively**. The published anchor (arcade 0.839) **keeps** them; the sprite lane's V-CENSUS (`S<0.35 ∧ V>0.08`) drops them, and its 0.839 for our jet is therefore **not** the same statistic as the anchor it was compared against. The two agreeing exactly at 0.8392 is a coincidence — 214/255 is one ladder rung that both happen to land on — **presented as corroboration**, which is this project's primary evidence standard | R6→R7 | **REPAIRED** — VALUE-STAT now states `V = 0 pixels are KEPT` and all four readings are published side by side. **R8 correction to this row's own numbers: the our-side restatement to 0.643 was measured at `e8fed58` and went stale the same round** — on the shipped tree (`82365e9`) the band's own operator reads **0.8392** with black share **18.9 %**, and all three clauses are met. The *rule* stands; the figure attached to it did not, and it is the fourth figure in this document to be quoted past the tree it was taken on |
| 23 | the published **arcade-side HUD reticle rect** `(495/686, 30/480, 660/686, 105/480)` | fitted to a **level-flight** frame. The attitude line **rotates with the world roll**, and in a banked frame it swings outside the rect's lower edge: on `ab2-arcade-desert.png` the reticle's largest component spans `y[15,67]` of 224 = **0.067–0.299 of H** against a rect that stops at **0.219**, leaving 17 of 103 upper-right white pixels exposed. The rect is also scoped to one operator (the cloud census) when the object it protects against has now been miscounted by **four** different operators | R7 | **REPAIRED and PROMOTED** — rect widened to cover the line at full roll and lifted out of the cloud block into a standing rule binding on every object-counting operator. See "The upper-right HUD has now been counted as four different things" |
| 24 | **JET-SIL's afterburner/nozzle mask, `V ≥ 0.45`** | **validated on the wrong population.** The mask and the nozzle-separation figure it feeds were only ever run against `stage3-night-level-t175.png` — a **night** crop whose keyline is the blue-grey `#425284` (hue 225.5°) and **cannot enter a red-hue mask at any V floor**, so the floor was never tested against a keyline that could reach it. The arcade's **daylight** jet is keylined in `#840000`: hue **0.0°**, S **1.000**, V **0.518** — it walks through. On our day cell the mask's two largest components become `[128 px of #840000, 52 px of #ef7300]` and the statistic reads **15.3 %** against a 25–35 % band; at `V ≥ 0.70` the same drawing reads **30.6 %**. A published discriminator lost to mask contamination, not to the art | R7 | **REPAIRED — floor raised to `V ≥ 0.70`.** Nothing measured lives between the highest keyline (0.518) and the dimmest measured glow (0.902), so the floor sits in an empty gap. **The deciding test, now a general one: the arcade's own control returns 30.0 % under BOTH floors** — an operator change that moves our number and leaves the arcade's untouched is the right kind; one that moves both is retuning the criterion to the build. The finding lane **did not move the operator** — it published both readings side by side and asked — and that restraint is recorded with the fix |
| 25 | Criterion A3, **"≤ 8 colours for an aircraft"** | **derived from the NIGHT player jet (exactly 8) and applied to every aircraft** — while **the same table's own daylight-jet row records 14 total / 7 at 95 %**, so the bound contradicted a measurement three lines away and would have failed a correctly drawn daylight sprite. Reproduced independently: the native daylight crop carries **9 airframe tones + the `#840000` rim + 3 nozzle glows = 13**. This is rows 11/12's defect one axis along — a figure measured on one **variant**, applied to another | R7 | **RE-LICENSED, not loosened.** The gate moves onto **`n95 ≤ 8`** (colours covering 95 % of the sprite), which the arcade passes on **both** variants (daylight 6–7, night ≤8) and ours passes on both shipped sheets (day 7, night 6); **totals are published per variant as licensed facts.** The roll sheet's `n95 = 9` is recorded as a **flagged exception with no arcade target** — no isolated arcade roll sprite exists or can be obtained from cached footage. Also records the 672 px vs **751 px** population difference on that crop (the largest-component step), so it is not re-found as a contradiction |
| 26 | gap 5's **"top third of the screen"** framing for player altitude | **the observation was right and the target it implies is wrong.** R6 measured our pilot in the top third 0.00 % of 20 970 ticks against an arcade p5 of 36.0 %H — both true — and a reader takes away *"the arcade pilot is often up there"*. **He is not: the arcade's own player top-third share is 0.92 %, one observation in 109.** Tuning a scripted attract path to reproduce a 1-in-109 event is tuning to a single observation, which is what most of this ledger is about. What separates the two pilots is **spread**, not the top third | R7 | **RESTATED** as `p5 within ~3 points of 36.4 %H` **and** `sd within ~1.0 of 7.73`, with the **reachable extreme** demonstrated separately rather than gated as a share of time. **Do not gate a top-third percentage in either direction.** The finding lane solved to the restated form: p5 44.9 → **38.7**, sd 6.07 → **8.22**, full stick reaching **27.02 %H** (the arcade's own minimum). **R7 JUDGE AUDIT: arithmetic CONFIRMED exactly** (`1/61 = 1.639 %`, `0/48 = 0 %`, pooled `1/109 = 0.917 %`) **and the 109-observation hand count itself was NOT re-done — the substance of this row is UNVERIFIED**, which is stated here so the row is not read as fully reproduced. The one piece independently checked supports it: full-up stick reaches **27.02 %H** exactly. **Still owed (gap 9): the ACCEPT criterion names no regime** — the row's own text says mixing cruise and canyon "would produce a number that means nothing", its tuning table is cruise-only (sd 8.16) and the gate it wrote is on the mixed distribution (sd 8.22). Name the regime |
| 27 | **every altitude / centroid figure that does not name its unit** | **a seven-point arcade-vs-arcade contradiction that was a unit mismatch, and it cost an hour because BOTH numbers were correct.** REFERENCE #122's cruise `cy` **52.8 %H** is a **pixel centroid**; the 109-observation player hand counts read **49.47 %H** as a **bbox centre**. Under this document's own published 1.3–3.3 point conversion they are the same measurement and they agree. **Nothing is found by re-running either operator** — cross-validation reproduces both exactly — so this defect is invisible to every check this project has except a unit label. Third occurrence of the "same name, different operator" family (after ledger row 14 and the 2-round centroid bias this section was written for) | R7 | **REPAIRED by rule**: a bare "%H" is not a reportable quantity; every altitude or centroid figure names `pixel centroid` or `bbox centre`. Recorded with it: the two reconcile **at the edge** of the conversion interval (49.47 + 3.3 = 52.77 vs 52.80), so they are consistent but **must not be quoted as corroborating to a decimal**. **R7 JUDGE AUDIT: ACCEPTED AS REPORTED, NOT INDEPENDENTLY RE-DERIVED.** The arithmetic checks out and there is no measurement to refute — which is also why nothing is found by re-running either operator. Read this row as a labelling repair that has been checked for internal consistency, not as a reproduced measurement |
| 28 | GAME_SPEC §2's stated reason for the flight-time denominator — **"it is invariant to death-cycle length"** | **refuted by controlled experiment, not by argument.** A three-arm isolation (pristine `e8fed58`; `e8fed58` + the death cycle alone; the full build; 7 seeds × 300 s each) changed `DEATH_TOTAL_S` 5.2 → 7.7 s **and nothing else**, and **both denominators moved, in opposite directions**: wall **−0.143**, flight **+0.098**. Mechanism, and it is not a bug: **threats are produced on WALL time** (`game.js` keeps calling `combat.update` through the `death` state — R5's "the world keeps flying" fix, which matches the arcade at gp t261) **while exposure is counted in FLIGHT ticks**, so a longer cycle leaves the threat schedule alone and shrinks the denominator. Control on a quantity nobody is tuning: enemy rounds/min move 126.00 → 125.17 per **wall** minute and **+9.8 %** per **flight** minute | R7 | **ASSERTION CORRECTED, GATE UNCHANGED.** Wall clock stays primary (the arcade anchor is strongest there) and both are still reported — but **neither denominator is invariant** and the published reason is withdrawn. The same denominator caveat is now attached to the gate's "enemy rounds/min not falling" clause, which reads −1.1 % per wall minute and +9.4 % per flight minute. **R7 JUDGE AUDIT: ACCEPTED AS REPORTED, NOT INDEPENDENTLY RE-DERIVED** — the three-arm isolation was not re-run. The row's conclusion is a controlled-experiment result that nobody has reproduced; treat it as a single well-designed experiment, not as a settled constant |
| 29 | GAME_SPEC §2's **"no visible invincibility flash"** | **a MEASURED-tagged NEGATIVE that the arcade contradicts — the second this round, after GAME_SPEC §3 element 1.** The arcade flashes the jet for **1.67 s at a 0.267 s period**, 8 clean on/off alternations, starting the frame the respawn reaches normal scale. **Four passes over this footage missed it for one reason: each state lasts 0.10–0.13 s, so any sampling coarser than ~0.1 s aliases it away** — including this project's default 0.25 s death-cycle grid, and including the finding lane's own first pass | R7 | **CORRECTED, and generalised**: *a negative about a periodic behaviour is only as good as the sampling interval it was taken at — state the interval with the negative.* **R7 JUDGE AUDIT: CONFIRMED EXACTLY, and independently re-derived from the footage without reading this row's numbers first** — OFF-state onsets at t277.200 / 277.400 / 277.667 / 277.933 / 278.200 / 278.467 / 278.733, successive gaps **0.267 s five times over**, duration t277.20 → steady t278.87, ON 1 066–3 824 against OFF 7–64 with **nothing in between**. Reproduced **to three decimals** on a separately chosen operator (bright-and-desaturated, `max(RGB)>150 ∧ S<0.35`, centre box excluding both HUD strips) at 30 fps. The judge's verdict on it: the best piece of criteria work this project has produced. Recorded here because an independently reproduced row is rarer in this ledger than a corrected one. Consequences carried: `RESPAWN_INVINCIBLE_S = 2.0` is now arcade-supported to within 0.33 s rather than an unverified usability choice; and **the player sprite is now absent from ~3 frames in 8 for 2.0 s after every respawn**, so a single-frame jet measurement landing in one reads "no jet" and that is not a defect (`?invincible=1`, or `__flowState().graceFlashHidden`) |
| 30 | the **fireball warm-mask operator** `R>100 ∧ R>B+60`, published with no box and no stage licence | **it returns the GROUND on any daylight-desert frame, on both sides.** Measured R8: the mask covers **78.3 %** of `ab2-arcade-desert.png` and **84.1–92.3 %** of our own digit-verified stage-2 frames, against **3.1 %** of the arcade night native and **2.2–2.5 %** of our stage-1 and stage-3 frames. Separately, the figure it carried (809 px / 107 × 41 / 33.4 %W) **does not reproduce**: a sweep of 25 operator variants (`R>` 90…128 × `R>B+` 40…80) over every row window in y[60,140) found nothing within ±6 px of 809 and ±2 px of 107 × 41, because **no box was ever published with it** — in the round, and in the very table, where that lane made "state your provenance" binding | R7→R8 | **RESTATED with its box and its exclusions**: `R>100 ∧ R>B+60` over native **y[74,130)** full width, 8-connected, minus the player's two nozzle discs and two warm streaks along the wing → **732 px / 121 × 51 / 37.8 %W × 22.8 %H (±74 px on the wing streaks)**; largest single component **658 px / 50 × 30** needs no judgement call and is the figure to prefer. **Withdrawn**: 809 px / 33.4 %W. **Licensed to stage 1 and stage 3 only** — never run it on stage 2 |
| 31 | the **arcade-side Criterion A licence** — *"the gate is licensed against ordinary play … and that licence is a measurement rather than an argument about hardware"* | **it is an argument about hardware, and inverting that is what made it look weak.** The supporting sentence — *a 33 %W fireball costs the arcade nothing; the night frame holds its entire blast inside 17 channel values* — is literally true and **evidentially empty**. Measured R8: blacking out **every warm pixel** of `ab2-arcade-night-banking.png` leaves A2 at **17**, and **zero** channel values are unique to the blast. The fireball consumes none of the budget, so it demonstrates nothing about whether a fireball fits one. The reason is structural: the night frame's 17 values are **every other rung of the 31-value ladder this document enumerates**, and that ladder is the hardware's | R7→R8 | **RESTATED, and STRONGER than what it replaces.** A2's ≤32 is **the width of the hardware's colour ladder** — the arcade cannot exceed it on any frame, in any population, with or without an explosion, so the gate needs no true-native daylight explosion frame to be licensed against daylight explosions. Two limits published with it: it rests on **two frames** plus this document's resistor-ladder attribution, and it licenses **A2 only** — A1 has no demonstrable hardware ceiling, the daylight native spends **138 of 256** colours with no explosion in it, and the night blast costs **27 colours** (79 → 52). **Watch A1; A2 is the medium, not the discipline** |
| 32 | the **population of every Criterion A figure** — row 21's own defect, **inside the repair for row 21, in the same table, one round later** | **R7's headline — "Criterion A passes in ordinary play with combat" — is TRUE and its evidence could not have shown it false.** The twelve frames were `?fixed=1&seed=1&invincible=1`, and under `?fixed=1` with no `?demo` **`main.js` injects no input at all**: the judge read `vulcanRounds` 0, `missilesInFlight` 0, `hits` 0 over **900 consecutive ticks** of that exact URL, and R8 reproduced the same verdict **from the captured pixels alone** (`tools/assert_population.py`: PLAYER-WEAPON 0/12, EXPLOSION 0/12, ENEMY-FIRE 12/12 — the frames even print **HIT 0** on their own HUD). **Every hygiene check this project runs passed**: the parameter was spelled correctly, the frames were non-black, de-duplicated across directories and digit-verified. **Nothing looks at CONTENT.** Published by the lane that spent that round enforcing the population rule on everyone else, and confirmed a second time by a team-lead verification that used the same invocation. It then recurred a **third** time inside the judge's own close of gap 6c: his `?combatexpl=1` arm at spacing 71 holds **0 fireball pixels on all 5 frames**, so one of the three readings behind "the explosion arm is closed" is a reading of empty sky | R8 | **REPAIRED, and the rule is binding**: *a population claim is verified by an assertion over the captured frames themselves, never by the invocation that was intended to produce them.* `tools/assert_population.py` is the positive control — authored palettes read out of `src/` at run time, exact-colour membership, three classes reported separately (**ENEMY-FIRE on purpose**, because enemy traffic with no player weapon is exactly the false positive that fooled three readers), a weak set for colours shared with cloud and smoke, and controls that include **refusing the twelve frames R7 published over**. The scoreboard's headline row is relabelled with the population its pixels hold. **R9: re-run by a third party on the shipped tree — `python3 tools/assert_population.py --selftest` PASSES, including the arms that make it evidence rather than habit: it refuses R7's twelve frames, accepts a known-good `?demo=1` kill set, REFUSES A BILINEAR 3× UPSCALE rather than silently averaging it, and returns 0 on a patch one channel level off a target colour.** This row needs no successor; the rule now has an instrument and the instrument has been exercised by someone who did not write it |
| 33 | the **stage-attribution operator**, `mean(RGB) > 170` over native `y[200,207) x[184,192)` | **it cannot fire, and it has been cited as a passed check for two rounds.** It returns FALSE on **0 of 75** digit-verified stage-1 frames (box mean 99.8–135.9) and on **0 of 180** across stages 1–3. The ink is cream `#f7f794` (mean 214) on a **3-px-wide** glyph in a 7×8 box drawn **over the world with no opaque plate**, so the box mean tracks the sky — the *same* digit reads 135.9 over bright sea and 101.4 over dark sea — and the box is **6 px off** (`hud.js` `M_STAGE_DIGIT` is cx 187 / y 200, centred on the ink, so the cell starts at x 183). `tools/measure_stage_identity.py` has documented this exact failure **in its own header** since R7 and does exact-ink Hamming matching instead: **the repo held two operators and the ground-truth document published the broken one** | R7→R8 | **REPLACED** by the exact-ink Hamming operator, published in full with the cell, the ink colour, the ±1 px slop, the <8-ink-px refusal and its control. The control is the half that was missing: `tools/verify_stage_digit_operator.py --selftest` runs both operators head to head and asserts the brightness test **fails in both directions on constructed inputs with known ground truth** — it calls a **digit-free cell filled with sea caps "STAGE 1"** (box mean 236) and **misses a genuine "1" over dark sea** (134.1). Cross-checked against an instrument that never sees the HUD: on 180 frames the Hamming digit and the modal sky colour of rows 20–60 agree completely (1 → `#009fff`, 2 → `#e67300`, 3 → `#000000`) |
| 34 | **JET-SIL's nozzle hue band, published as "hue 5–55°"** | **the document contradicted itself within eight lines, on the operator ledger row 24's ruling turns on.** Line 1546 published 5–55°; line 1554 argued from `#840000` at hue **0.0°** walking through the V floor. **Hue 0.0° is not in 5–55°** — under the band as published that colour could never enter the mask at any floor, the contamination row 24 was written about could not occur, and the whole justification would be void. It is sound only because `tools/art/jetsil.py:112` tests **`(deg <= 55 or deg >= 355)`**, a wrap-around band that admits hue 0, **and that wrap was published nowhere.** Re-derived R8 on this document's own table: `#840000` 0.0° in the implemented band and not the published one; all four glow colours in both; the night keyline `#425284` at 225.5° in neither, which is why the night crop could never test the floor | R7→R8 | **DOCUMENT CORRECTED to the implementation** (`hue ≤ 55° OR ≥ 355°`). The ruling stands; the operator it was argued from did not. General form, and it is cheap to check: **a hue band that crosses 0° is not an interval, and writing it as one silently deletes red.** `jetsil.py`'s own header still says "5-55 deg" in prose — sprite lane's file, flagged not edited |
| 35 | **every criterion stated about ONE OBJECT without naming the CLASS it is licensed over** | **third measured instance of one failure mode: a lane fixes the object that was named and the defect survives in the class.** R4 named the sprites, **the sea kept it**; R5 named the sea, **the explosion kept it**; R7 measured that the arcade's daylight aircraft have no black outline (rim 49.5 % `#840000`, **0.0 % near-black**), fixed the **player jet**, and the R8 enemy-art audit then found **all sixteen enemy sheets at 100.0 % near-black perimeter** against the three player sheets at 0.0–1.1 %. Every enemy in the game was caged in pure black while the player beside it was not, for a whole round, under a criterion that was already measured, already published and already implemented. Two further call sites carried it undetected — the near-aspect procedural fallback (runs only in the few frames before the sheets decode, *"which is exactly why nobody had ever captured it"*) and the far LOD | R8 | **PROCESS RULE, binding**: *a criterion must name the class it is licensed over, and a fix is not closed until it has been audited across that class.* Concretely: a sprite criterion names **which sheets**; a palette criterion names **which objects**; an effects criterion names **which effects** — and the closing report prints the measurement **for every member**, as the enemy-art lane's 16-row table does. The detector that works when nobody thought of the class: when a criterion is closed on object X, grep for every other producer of the same visual element before writing "closed" |
| 36 | **`tools/art/enemysil.py`'s compact-feature gate, "largest COMPACT single-colour component ≤ 12 % of area"** | **it fails the drawing for having the planform it is supposed to have, and it cannot see the defect it was written for.** (a) The offending component on the delta cells is the **delta's own wing**: `enemy-interceptor-head` cell 1, `#d64a19`, 57 px = **25.8 %** of area, bbox 7 × 13, **aspect 1.86, fill 0.626** — a foreshortened structural member. The test's premise, written in its own header as *"a wing … legitimately runs 25-30 % … the gate rejects wings, fins and fuselage spines"*, assumes a wing is long and thin (aspect > 3:1). **That is false for a delta and false for any wing seen in bank.** (b) Worse: the operator excludes "the darkest colour" as the keyline, so **a dark-red mark is invisible to it**. Two identical 9-px marks planted on the same interior pixel of `enemy-grey-head` cell 0: dark red `#e61000` → **MISSED** (it becomes the darkest colour and is dropped as the keyline), bright yellow `#ffde21` → **DETECTED**. R4's complaint was *"a large black-rimmed **red** disc"*. (c) **There is no arcade control**: both true-native frames carry only ~60-px distant enemies (measured: ~10 × 12 px of aircraft), and every near-aspect arcade enemy reference is a video upscale carrying thousands of colours, on which a single-colour-component operator cannot run at all | R8 | **RETIRED as a gate; kept as a printed diagnostic.** Do not redraw a delta wing to satisfy it. The obvious repair was tried and rejected **with its measurement**: adding an "interior components only" clause drops all 160 enemy cells to **≤4.5 %**, but these aircraft are nowhere more than ~5 px thick (max erosion depth **2**), so no interior mark of gate-tripping size can exist — the clause makes the gate **unfailable**, which is ledger row 18's defect from the other side. Readability as an aircraft is already measured directly by the four silhouette discriminators; use those. Re-open only against a **true-native near-aspect arcade enemy** — STATUS.md acquisition list entry 5 |
| 37 | **R3's readable-presence gate, "≥1 enemy at ≥10 %W in ≥60 % of combat frames"** (`judging/R3/report.md:151`), **and its unquoted second clause "≥2 at ≥5 %W in ≥50 %"** | **THE ONLY ROW IN THIS LEDGER WHERE A CRITERION DID NOT MERELY FAIL TO CATCH A DEFECT — IT CAUSED ONE, AND FIVE ROUNDS OF WORK DROVE THE WRONG WAY WHILE PASSING.** The arcade reads **19.0 %** (63 digit-verified frames, 6 stages, `tools/out/combat-r6/arcade-vert/labels.csv`) and **16.7 %** on an independent second reader's 18 frames; the second clause reads **15.9 %** against ≥50 %. **The gate's own arcade side was four frames selected into `reference/`** — and one of the four, `stage1-lockon-island-t104.png`, **carries no enemy aircraft at any size**: what reads as a target at a glance is a cluster of lock-on brackets with nothing inside them, the **third** time the HUD has been counted as an enemy and the first time inside a criterion rather than an operator. Two of the four cited frames are named `lockon` and one `missile-salvo`; **a reference pack is assembled to illustrate features, which is a sample selected on the presence of the thing being counted.** Scored over all eight stage-1 pack frames the pack itself reads **50.0 %, below the gate's own ≥60 %.** `spawner.js` drove `MAX_ALIVE` **6 → 10 → 12 → 14** to satisfy it and the gate was then re-measured on the build the raise produced — a closed loop between two of our own numbers with no arcade in it — while R8's own `READABLE_SPAN_FRAC` fix made the justifying clause ("two thirds of spawns are shot down before they reach readable size") false in the same round. Ours went **27.3 % → 79.6 %** and it was recorded as a pass | R3→**R9** | **RETIRED. REPLACED by ARCADE-PACING** (below), every row of which carries an arcade column |
| 38 | **every tick index published without the URL that produced it** | `flow.js`'s `this.stageTimer += dt` appears **exactly once**, at line 581 inside `_updateFlight`; `_updateLaunch`, `_updateDeath` and `_updateContinue` each have their own branch and none advances it. **Adding `?demo=1` displaces every stage boundary by the whole launch — `LAUNCH_TOTAL_S = 3.5 s = 210 ticks`, measured 211 at the first boundary (1 921 → 2 132), fixed and predictable. Dropping `?invincible=1` costs `DEATH_TOTAL_S = 7.7 s = 462 ticks` per death and the death count is stochastic — unbounded and run-dependent.** Verified from source twice, independently (R8 judge; R9 criteria) | R8→R9 | **NEW RULE, binding: a tick index is not a reportable quantity without its URL.** Reads with row 27 — a bare "%H" and a bare tick index fail the same way. **The fourth taxon proposed alongside it is NOT opened**: class 2's definition already ends "or sample", and the case for a new class was made by quoting it one clause short; and "cross-validating implementations reinforces this class" is refuted by the episode that produced it, where two independently invoked readers **disagreeing** is what found it. Correct form: *cross-validation over a SHARED input cannot see an input-identity defect; over independently produced inputs it can*. **R9 ADDS THE THIRD CASE, FOUND THE HARD WAY: CROSS-VALIDATION CAN AGREE BECAUSE TWO ERRORS CANCEL.** Two implementations of DRAW-WEIGHT agreed on the arcade jet's RSW to **0.00** and RP90 to **0.01**; they were running **two different masks**, and the agreement existed only because one side carried a topology bug — an **8-connected background flood against an 8-connected foreground**, which shrank its wider mask onto the narrower one's reading. Fixing the bug moved the same two statistics to **+40 % and +30 %**. **An agreement is evidence only when both sides are specified to the level the statistic is sensitive at** — here, the mask rule — and **a suspiciously exact agreement between two independently built operators is a reason to go looking, not to publish** |
| 39 | **every criterion stated about one AXIS of an object** | **row 35 one level further in, and the same object, file and commit rather than a different one.** R8 closed the measured axis on all three objects it was given and left the object wrong on every one: the title is 11 colours / 15 channel values / 0 off-ladder **and a placeholder drawing**; the death hulk is on-gate on every frame **and a flat silhouette with no smoke, highlight or debris**; the carrier is 13 → 1 off-ladder and, in its own lane's words, *"visually identical"*. **Three for three in one round.** R4 named the sprites and the sea kept it; R5 named the sea and the explosion kept it; R7 measured a class and R8 fixed an axis | R8→R9 | **OPEN — the remedy is row 40's new criterion.** Binding: a per-object census on one axis is not a census |
| 40 | **the whole PASSING gate set, for any DRAWN object** | **every statistic this project owns for a drawn object is a VALUE statistic, a PALETTE statistic or a SILHOUETTE-TOPOLOGY statistic, and in R8 all of them passed simultaneously on four objects that are all visibly wrong.** The art critic's own summary: *"the build's colour is now right nearly everywhere and its drawing is wrong nearly everywhere that is not the sea, the HUD or the sky. Nothing the project measures can tell the difference."* Measured: the arcade's astern jet carries **INK/SPAN 7.07–7.32** and a **median stroke width of 2.0 px** against our **13.15**; dark-accent share **44.7–46.0 %** against **25.1 %**; and `drawRearFar()`, which draws **44.8 % of all enemy sprites on screen**, has **bbox fill 100 %** against the arcade's **30.6–34.6 %** on two true-native distant enemies. This is a row about a SET rather than a single criterion, and it belongs here because the ledger's closing sentence is its content | R8→**R9** | **ADDRESSED by DRAW-WEIGHT** (below), which is **licensed on two objects and explicitly UNLICENSED on four** for want of true-native references — acquisition items 5 and 6 |
| 41 | **the missile lock radius, 0.22 (22 %W)**, and the "~6 brackets at once" count behind it | **row 37's defect in a second place, from the same pack and the same frame.** `GAME_SPEC.md` §3's only anchor of ANY KIND for this quantity is the prototype's ADOPTED **80 px on a 960-wide frame = 8.3 %W** — **this row previously called that an "arcade anchor" and it is NOT one; it is the old prototype's constant, corrected R11**; the shipped constant is **2.65× that**, and the tuning argument on the record is that at 8.3 %W a hold accumulated 4 locks against §3's *"MULTIPLE brackets show simultaneously (t100: ~6)"*. **That "~6" is ONE FRAME, and that frame is `stage1-lockon-missile-t100.png` — one of the four in R3's selected pack** — read during a **salvo**, the most atypical moment in the game, on aircraft that are 2–4 px specks at 3×. R8 priced the consequence: the missile contributes a flat **1.08–1.26 kills/s to every pilot policy** and **100 % of its kills are below the readable gate**. `lockSystem.js:44` already states that the argument "does not establish 0.22" and keeps the value | R3→**R9** | **The COUNT criterion is RETIRED as a licence for the radius.** The radius itself is not retuned here — R8 showed its rate is set by the stock budget, not the radius — but **it may no longer be justified by a bracket count**, and any retune cites the 8.3 %W anchor or a new measurement over a pre-registered frame grid |
| 42 | **"BURNER is 13.7 % taller than AFTER"**, and the per-word scaling it implied (AFTER ×1.13 / BURNER ×1.29) | **caught before implementation, and it is TWO independent artefacts stacked, neither of which a whole-word bounding box can separate from a real size difference.** (a) **BASELINE SHEAR**: the wordmark is set on a sloped, sheared baseline, so **the longer word's bbox spans more rows at identical letter height** — worth **6.7 points on a perfectly clean frame**. (b) **THE TUMBLING SPHERE PLATE**: its white specular highlights pass a plain brightness threshold and extend whichever word they sit behind, by a different amount in every frame because the plate is in a different pose in every frame (row 43). **Measured R9 on frames with no plate behind the wordmark (longplay t70, t71): per-column letter height FTER 79.5–80.0, URNER 78.0 — ratio 0.975–0.981, so BURNER's letters are if anything 2 % SHORTER.** The same frames by bbox read **1.067**; `title-screen-t74.png` by bbox reads **1.115**; the published figure is **1.137**. Operator and control: `tools/title_word_height.py`, selftest 4/4 — a 40-row bar on a 1-in-4 slope reads **40.0** per column and **89** by bbox | R9 | **RETIRED, and DO NOT IMPLEMENT the per-word scaling.** Replaced by the per-column operator. **The 21.5 % whole-wordmark shortfall is REAL and survives** — its cause is the **missing oversized bookend letters**, not body size. Lesson in one line: **a bbox is not a letterform**, and a brightness threshold on an upscale will find specular highlights and call them ink |
| 43 | **every published measurement of the title's "II" sphere plate** — "7.2× too sparse", "the balls are ~3× larger" — all taken off `reference/title-screen-t74.png` | **THE ARCADE TITLE IS NOT A STILL. The sphere plate is a 3-D object that tumbles continuously AND approaches the camera, and t74 is one transient mid-tumble pose.** Verified R9 by decoding the sequence rather than arguing it: `tools/out/criteria-r9/crit-r9-09-ARCADE-title-t70-t79-1s-grid.png` — **t70–t71 no plate visible at all; t72 near face-on, a tall narrow slab; t73 nearly EDGE-ON, a thin horizontal sliver; t74 the published frame, an intermediate pose; t75 a wide shallow parallelogram; t77–t79 the plate swings toward the camera and by t79 fills most of the screen.** Alignment checked: the extracted t74 carries 19 752 colours, identical to the published reference file. **A plate seen near edge-on looks sparse because it is edge-on, and spheres measured at the far end of an approach look small because they are far away.** The operator was right and the frame was right; **the subject was in motion and nothing in the citation recorded it** | R9 | **ALL "II" FIGURES WITHDRAWN as properties of the object**; they are properties of one pose. Re-derive from a **named phase** — t72 is the most face-on readable pose in the cycle — or from a phase census over t70–t79. **See the rule below: ledger row 29, GENERALISED.** No new taxon is opened |

| 44 | **DRAW-WEIGHT read as a DIRECTION on the four objects where it has no arcade column** | **NOT the sign error it was first reported as, and the correction matters because the two defects need opposite fixes.** Checked on seven same-subject known-quality pairs before being written down: **RP90 ranks 5, ties 2, inverts 0**; on the player jet, where an anchor exists, \|d\| from the arcade **falls monotonically across all four accepted redraws (3.08 → 2.30 → 2.30 → 0.48)**. The R9 art critic's inversion is **real, reproduced to the digit, and robust across 5 of 5 cells** — and it is a **cross-subject** reading of two different aircraft, on a class this document had **already declared UNLICENSED** (*"Near-aspect enemy … NO ARCADE COLUMN EXISTS"*). The real defect: **with no anchor a distance statistic degenerates into a direction, and only a direction can have a sign**; under *"lower is lighter"* a thin continuous sheet beats separated blades every time, which is the whole mechanism | R10 | **GATE UNCHANGED where an anchor exists. Elsewhere DEMOTED to a reported diagnostic that must not carry the words "lower is better".** The licence was already written and nothing enforced it. Acquisition item 5 (an arcade column for the near-aspect head-on enemy, **69.2 % of enemy screen pixels**) is now the highest-value item on the drawing board |
| 45 | **"of the eight day enemy sheets, exactly two changed"** — and every per-sheet figure over that population | **THE FOUR DAY HEAD-ON SHEETS ARE TWO DRAWINGS.** `enemy-interceptor-head.png` and `enemy-prop-head.png` have **byte-identical alpha planes** (md5 `63784d16ec4b` before `010db2c`, `c79c29b5530a` after), as do `enemy-grey-head.png` and `enemy-camo-head.png` (`8f36c102826f`, unchanged since R8). They are **one silhouette in two liveries**. Every DRAW-WEIGHT, JET-SIL or silhouette statistic is alpha-masked and therefore **identical across each pair** — found because two rows of the pair harness printed the same numbers to the digit, which is R9's own rule (*a suspiciously exact agreement is a reason to go looking*) | R10 | **POPULATION CORRECTION, ledger class 2.** *One* silhouette was redrawn in R9, not two. Any shape statistic over these four sheets has **n = 2, not 4**, and any "we fixed N of 8 sheets" claim double-counts. **Palette/value statistics are unaffected — the liveries genuinely differ.** State which kind of statistic you are counting before you count sheets |
| 46 | **LINEWORK (internal line-work density), the proposed replacement for DRAW-WEIGHT** | **CAUGHT BEFORE ADOPTION — the third such row, and the first where the proposer stated the limits themselves and they were still not conservative enough.** (a) *"ladder rung"* is undefined and **both published controls (0.0 / 95.0) return the same answer for every rung from 0.004 to 0.5**, so they cannot pin it; the published figures reproduce only in a window **0.095–0.098, 0.003 wide**, and at one-eighth the same pair reads **30.4 / 66.8** instead of 67.0 / 73.1. (b) **~41 % of the enemy-pair margin and ~50 % of the arcade margin are PALETTE** — proved by re-indexing each drawing, pixel for pixel, onto the other side's value ladder (30.4 → 45.2; 80.8 → 69.8). (c) `r = −0.998` **against span** across nine poses of one sheet, range 1.33×. (d) the published *"ours 49.8 at matched span"* is a **resampled** reading (native 58.6; ×1.16 nearest → 50.9) of a statistic resampling destroys | R10 | **ADOPTED AS A DIAGNOSTIC ONLY**, same sheet, same span, publishing `rung`, span and V-level count; **NOT a gate and NOT readable across the arcade/ours boundary.** Its *ranking* of the known pair is correct and **~59 % of the margin survives the palette control** — the core is real, the magnitudes are not drawing magnitudes |
| 47 | **runs-per-row as a silhouette statistic** | the R9 art critic built it, tested it, **rejected it themselves** at 1.48 vs 1.54 as too thin, and recorded it so nobody rebuilt it — reproduced here to the digit. **Run on the seven same-subject pairs it is INVERTED on 3 and tied on 2**, which is worse than thin | R10 | **STAYS REJECTED, now on two independent grounds.** Recorded again because the first recording is what stopped it being rebuilt, and that worked |
| 48 | **`.claude/skills/youtube-reference/`'s default sampling rate** — the repo's own instrument for the defect class, unused by nine judges | **THE TOOL THAT NAMES THIS DEFECT CLASS DEFAULTS TO THE SAMPLING RATE THAT HIDES IT.** `BURST_FPS=4` (`fetch-reference.sh:21`), documented as *"consecutive frames, 0.25s apart by default"*. The arcade explosion holds within 60 % of peak for **0.067 s**; the arcade's kill burst is **three kills in 0.367 s**; the invincibility flash (row 29) has states lasting **0.10–0.13 s**. **A judge who had followed this skill exactly, at its defaults, would have produced 4 Hz bursts and concluded nothing was wrong.** Two further defects in the same file: `-vf "fps=N"` **resamples** where consecutive decoding needs `-vsync 0` — not the same operation — and `OUT_ROOT=assets/reference/motion`, **a directory that does not exist in this repository** | R10 | **REPAIRED in SKILL.md**: native-rate consecutive decode is now the documented default path for any transient, the 4 Hz burst is restated as a *stage-spread* tool only, and the output path is corrected. **"Nobody used it" was only half the defect** |
| 49 | **GAME_SPEC §3's missile launch→impact band, *"2–4 frames of 0.25 s"***, which `missiles.js` calls *"MEASURED-TO-SPEC rather than picked"* | **a 4 Hz sample of a sub-second event, taken on `reference/stage1-missile-salvo-t100.75.png` — one of the four hand-picked frames ledger row 37 retired.** With ±0.25 s of quantisation at each end the true support is **0.25–1.25 s**, not 0.5–1.0 s, and `V0`/`ACC`/`V_MAX` were tuned to land inside the narrower band. **Row 29's rule already bound this class and the citation format had no field to record it in** | R10 | **BAND DEMOTED to ASSUMED with its true support stated.** Field 6 (sampling rate) added to "What a complete citation is" so the next one cannot be published without it. The arcade side remains **UNMEASURED by anyone at any rate**; R9's judge established the bound and could not close it |
| 50 | **JET-SIL's "two-blade fin rows" as a discriminator, and its "blade cant" as a target** | first known-quality-pair run of either. **Two-blade reads 100.0 % on all four player-jet tree states**, including the pre-R6 sheet the R6 judge replaced — **saturated before the work began, so it cannot score any of it.** **Blade cant is INVERTED on 2 of 3 accepted redraws**: \|d\| from the arcade's 1.28 runs 0.06 → 0.02 → **0.07** → **0.09**, i.e. both of the redraws this project is proudest of moved cant away from the arcade | R10 | **Two-blade: NON-DISCRIMINATING, report it, do not score it.** **Cant: OPEN, reported as a direction with no error bound** — the statistic may be too coarse at this magnitude to separate 1.19 from 1.28. **Do not tune to it until that is settled**, and settle it by measuring the arcade's own cant across several frames before touching the sheet |

| 51 | **the TIME-ENVELOPE arcade peak, "6.03 % of frame"** — published by this lane, reproduced from R9 "to the digit" | **TWO OPERATORS, ONE NAME, AND THE EXACT REPRODUCTION IS WHAT CONCEALED IT.** 6.03 is the **raw mask share of the whole frame**; the licensed operator (persistence exclusion + largest 8-connected component) reads **4.317 %** on the same event, confirmed across two decodes and two implementations (effects lane 4.32). Decomposed: raw **6.028** → excluded **5.969** → largest component **4.317**; the exclusion removes 442 px (0.060 % of frame) and **the entire difference is the component step** — the arcade frame at peak is **28 % other fire-coloured material not connected to the ball.** `w60` (4 vs 4) and `r100` (0.157 vs 0.157) are unaffected | R10 | **ARCADE COLUMN RESTATED on the licensed operator**, raw figure retained and labelled. **Binding: an exact reproduction proves you ran THEIR operator; it says nothing about whether it is the licensed one.** Rows 14/22/27 again, committed by the lane that maintains the ledger, in a section written the same day, while citing the reproduction as proof the operator was pinned |
| 52 | **`life10` (frames ≥ 10 % of peak), proposed as the TIME-ENVELOPE gate at 8–18 frames** | **DOES NOT REPRODUCE: 21 frames here against the effects lane's 14, on one event, same mask, same exclusion, same peak, same `w60`, same `r100` to three digits.** Two candidate mechanisms tested and **both refuted**: the per-run persistence exclusion is stable (438–444 px across four derivation windows, `life10` = 21 under all four) and window length sits on a **plateau of 21 across 25–50 frames**. What is left is the **event BOUNDARY, which the operator does not define** — 10 % of peak falls inside the residual-debris floor (post-peak series 0.39–0.87 % against a 0.43 % threshold), so where the event is declared to end sets the number. Our own side moves 9 → 15 by population (component merging with an enemy nozzle) | R10 | **NOT LICENSED AS A GATE. A band of 8–18 frames with a 7-frame reproduction gap on a single event is narrower than its own error.** `r100` preferred — reproducible to three digits and a single named lag, so it has no event boundary to inherit. **Pre-register and test on the next pair** |
| 53 | **`w60` / `n60` — "ticks within 60 % of peak", R9 §2.4's headline figure and the statistic this project's first TIME criterion was built on** | **FAILS A KNOWN-QUALITY TRIPLE, AND INVERTS.** Matched harness, matched depth, matched seed, quality settled by looking at the crops: the committed `plateau` arm reads **`w60` 6 / `n60` 8** against the shipped flash's **8 / 8** — *the plateau scores better.* Both are normalised by peak and our sprite **boils**, so the 60 % run is short on a mass that sits on screen for two thirds of a second. **Also under-specified**: R9's phrase does not say whether it is the contiguous run or the total, which coincide on the arcade (4 and 4) and did not on our build (6 vs 16) | R10 | **RETIRED AS GATE CANDIDATES, DEMOTED TO REPORTED DIAGNOSTICS, and BOTH must be published — neither is reportable alone.** The arcade's 0.067 s stands as a licensed arcade *fact*; it is not a number a lane may be scored against. **Control 7's lesson on a second criterion: the statistic that reads most naturally as the defect is nearly blind to it, and here inverted** |
| 54 | **"ours peaks 40 % smaller than the arcade's"** — published by this lane | **the arcade's own peak spans 0.83–6.03 % across FIVE EVENTS IN ONE STAGE, a factor of 7.3, because peak scales with the killed target's DEPTH. The sentence compared ours against the MAXIMUM of five** — in the same box as a rule requiring every figure to state its population. The depth-matched ratio that would remove the confound was attempted and **failed on the arcade side**: stage-1 kills decode at or behind the player, where the target is not separable before first light | R10 | **WITHDRAWN. PEAK IS OPEN, no threshold, no ratio.** Class 2, and it is this lane's own. At **matched depth** the direction is the opposite of the sentence's implication: shipped peaks **39 % HIGHER** than the plateau it replaced — shorter *and* bigger, which is what a flash is |
| 55 | **the R6 feel critique's "the 60 fps longplay carries duplicate frames; 1/30 s is its effective unique rate, verified by hashing four consecutive extractions"** | **REFUTED, and the instrument is the finding: HASHING CANNOT TEST THIS ON AN AV1 RE-ENCODE.** Every frame gets a distinct hash whether or not the content repeats, so the md5 test returns "all differ" either way and is **vacuous in both directions**. The pixel-difference test is the one that works: over **119 consecutive pairs** at t ≈ 96–102 and 329–331 the mean per-channel \|Δ\| is **17.4–37.6 and no pair is identical.** The effects lane ran the md5 test first, got the clean answer, and nearly published it | R10 | **The file is genuinely 60 unique Hz.** R6's 0.37 s bound is unaffected — it was better resolved than it claimed. **Anyone who stepped at 1/30 s on the strength of that sentence halved their resolution for no reason.** Generalises: *a uniqueness test must compare CONTENT; a hash compares encoding* |
| 56 | **the two "incompatible" arcade claims about enemy shots** — `≤ 0.37 s` warning time vs `10–16 simultaneous fireballs at ~0.11 s spacing` | **BOTH ARE TRUE, AND THEY ARE NOT BOTH ARCADE FIGURES. The 0.11 s is OUR OWN `enemy.js` constant projected onto the arcade**; nine rounds crossing in 0.367 s needs ~0.04 s. **A measured arcade number and an unmeasured constant of our own, combined into a derived figure that reads as entirely arcade-sourced** — found by the effects lane | R10 | **NEW TAXON, and it is row 37's cousin rather than its repeat.** Row 37 is a closed loop between **two** of our own numbers; this is a **HYBRID**: one real arcade measurement doing the work of making our own assumption look sourced. **Binding: when a figure is derived from more than one input, label the PROVENANCE OF EACH INPUT, not of the result.** Reconciliation itself is OPEN — needs a 60 Hz enemy-fireball count over STAGE_MAP spans |

| 57 | **CLAUDE.md's standing *"`-ss` sequence extraction on the AV1 60 fps file starts ~4 s early"*** | **REFUTED for the input-seek form on this file by FIVE invocations across THREE LANES and THREE SEEK POINTS SPANNING 76 s.** At `-ss 96.0`/`98.5`: two lanes independently match `reference/stage1-missile-salvo-t100.75.png` at **mean \|Δ\| = 0.0000**, neighbours 21.3 / 23.5 — a spike, not a plateau; a third gets 12 byte-identical frames across two seek forms. **At `-ss 174.0`, 76 s away — the part the first three could not rule out** — two lanes independently match `stage3-night-level-t175.png` at **1.796** (separation 2.8×/3.1×) and `stage3-night-lockon-t186.png` at **2.034**, both landing on the nominal second with **residual +0.000 s**. So `t = T_ss + (i−1)/60` is exact for `ffmpeg -ss T -i FILE … -vsync 0` | R10 | **The caveat must name the form it applies to or be RETIRED — as written it COSTS precision.** Verification recipe published: match the predicted index against a committed reference PNG — **a ZERO with large neighbours at matched resolution, a SHARP MINIMUM (~3×) against a resampled one, and a PLATEAU means you matched a static scene and proved nothing.** **CLAUDE.md is not this lane's file — flagged to the TL.** Stage identity is still read from the HUD digit, always. **The full cost, priced by the lane that paid it: not merely two hedged timestamp sets and a re-derivation, but A CHECK IT HAD THE MATERIALS FOR AND DID NOT RUN — two committed stills sat inside its own window, unused, because *being careful felt like it had already discharged the obligation*. That is the expensive half of a wrong caveat and it leaves no trace at all** |
| 58 | **any gate on a RATE whose SPAN is itself unverified** — specifically a sight/stick rate gate | **`MAX_ALIVE`'s shape without the self-measurement.** Ours is **2.5–3.0× the arcade's sight rate** and our envelope is **3.2–3.5× too wide**, so **centre-to-rail time is 0.31 s against 0.24 s — nearly matched.** A lane gated on rate alone would slow a stick that already crosses its own screen in about the right time, **because the rate gate is measuring the envelope.** Row 37 closed its loop by re-measuring our own build; **this one closes by normalising one of our own wrong numbers out of the statistic** | R10 | **BINDING: publish the rate, the span, and the time to traverse it — or publish none of them.** Caught by the feel lane in its own figures, which then declined to propose the gate. **No gate set on either number** |
| 59 | **the ledger's own shape — it records only defects CAUGHT, never features PREVENTED** | not a defect; a **gap in what this ledger counts**, noticed when R10 produced a third prevented-feature entry. The arcade's lock bracket **does not animate in size** (flat within ±2 px across 26 consecutive frames; it appears at its final size), so the feel lane — briefed to make our brackets "fill" — **did not build it.** Rows 42 and 43 are the same shape, and all three come from lanes measuring the thing they were about to build | R10 | **Recorded as a row class: PREVENTED-BY-MEASUREMENT.** It is the cheapest possible version of this ledger's win and the project should notice when it happens rather than only logging the expensive version. **Three instances in two rounds is a pattern, not luck** |

| 60 | **`r100`, pre-registered by this lane as the TIME-ENVELOPE gate candidate** | **WITHDRAWN THE SAME DAY, AND BOTH GROUNDS IT WAS REGISTERED ON WERE THE DEFECT.** `r100` is read at **+6 frames**, and on arcade D the largest component's centroid is **(471, 465) at +6 against the peak fireball's (141, 227)** — a different kill **39.6 %W away**, after a **51.2 %W** jump at +5 (verified independently on this lane's own decode). Ground 1, *"reproduced to three digits across two implementations"*, is **SHARED-DEFECT AGREEMENT — row 51 one level down, committed inside the repair for it**: both implementations run the same largest-component selection, so both re-target in the same frame onto the same wrong object. Row 38's cancelling errors except **identical rather than cancelling**. Ground 2, *"a single named lag, no boundary to inherit"*, is true and **insufficient — boundary-free is not attribution-free**: `envelope_r10.py --selftest` control 6 prescribes the truth and untracked `r100` reads **0.836 against 0.068** | R10 | **NOT LICENSED.** And the pre-registration was still right as a *process*: it is what sent the effects lane to measure the horizon. **A statistic can be correctly pre-registered and still be wrong; pre-registration buys honesty about selection, not correctness** |
| 61 | **`life10`'s 21-vs-14, diagnosed in row 52 as a missing EVENT-BOUNDARY definition — and the arcade `life10` column (8/12/18/14)** | **THE DIAGNOSIS WAS WRONG AND THE DEBOUNCE REPAIR THIS DOCUMENT ASKED FOR DOES NOT CONVERGE** — ending the event after K sub-threshold frames gives **14, 14, 26, 26, 84, 84, 84, 84** for K = 1…8, *parameterising the disagreement instead of removing it.* **The cause is ATTRIBUTION: "largest component per frame" is a SELECTION, and it silently re-targets** the moment the fireball decays below some other fire-coloured object. Both readings were reading two different objects' tails. Two tracker repairs built and failed: nearest-component **punches holes** (a 39 px fragment over the 9 169 px mass beside it), largest-within-radius **walks** (two different arcade events returning byte-identical statistics). **Both found by cropping, not by the numbers** | R10 | **ARCADE `life10` COLUMN WITHDRAWN as a measurement**, downgraded to an upper bound of unknown tightness, **by the lane that produced it.** Replaced by a **binding PRECONDITION rather than a gate: every envelope figure publishes its LAG and that event's ATTRIBUTION HORIZON, and a figure beyond the horizon is not published.** Would have caught all three bad numbers. **And the structural finding beneath it: a statistic that discriminates a DECAY must read the DECAYED state, which is by definition where the subject is no longer the largest thing in frame — DISCRIMINATING POWER AND ATTRIBUTABILITY ARE IN DIRECT TENSION, and only identity resolves it, never a threshold** |

| 62 | **the ATTRIBUTION HORIZON's own first version — the detector published in row 61's repair** | **A LONG HORIZON IS NOT EVIDENCE OF CLEAN ATTRIBUTION; IT IS ONLY THE ABSENCE OF AN ABRUPT BREAK.** The jump test reported a **28-frame** horizon on one arcade kill and the lane cropped it before believing it: **from about lag 6 the selection is sitting on the PLAYER'S OWN AFTERBURNER NOZZLE DISCS** — orange, present in **every frame of every stage**, un-removable by the persistence exclusion because that only removes what is *stationary*, and **moving smoothly, so no jump ever fires.** The detector's negative was untested in exactly the way this project's negatives usually are. **f069's 28 → 7** | R10 | **SECOND CONDITION ADDED — a SIZE FLOOR** at 2 × the per-run `clutter` (median largest-component area **before first light**; measured from the peak instead, it swallows the event's own rise and puts the floor above the peak — **caught by the control**). Horizon = the earlier of the two. **Side effect worth as much as the fix: the threshold stopped being load-bearing**, every event now flat across T = 0.08–0.20 where the jump test alone wobbled 3 → 7 → >12. **Control 8b** (a small object drifting 1.5 px/frame from the event's own location; max jump 0.47 %W, below every threshold) encodes the failure mode. **Competitor set has ≥2 classes** — transient fireballs, caught by the jump test, and the player's own nozzles, caught only by the floor; confirmed independently by this lane cropping lag 11 of arcade D, where the selection is a **7 778 px second fireball** with the nozzles plainly visible beside it. **And the scene cannot be chosen around it**: all 14 candidate arcade kills scanned, the three long horizons were all nozzles — *the open-sea trick removes clouds and cannot remove the player* |

| 63 | **the attribution horizon's OUR-SIDE column, published as ">9 / 10"** | **TWO POPULATIONS PRESENTED AS TWO READINGS OF ONE QUANTITY — row 21's class, committed inside the box that exists to enforce it, one message after that box was written.** Over the 30 frames before first light the `?combatexpl=1` **harness carries ZERO competing components (0.000 % of frame)**; the `?demo=2` in-situ capture carries **16 per frame, max 19**. **The harness's ">9" is not a long horizon — it is an event ending before anything could out-compete it.** Self-reported by the lane that produced it, after this lane's lag-11 crop prompted the equivalent check on our side | R10 | **CORRECTED to `ours, in-situ: 10`; the harness figure is dropped from the column.** The asymmetry survives and is **weaker than first sold: arcade 1–9 against our 10, one population against one.** **And it forced the precondition's missing clause: THE HORIZON IS A PROPERTY OF THE CAPTURE — it must be measured in the same capture as the figure it licenses, because it measures how much other fire is in your frames.** Two further results from the same check: **the player's own nozzle discs (459 and 441 px) are the two largest competitors on OUR side as well**, four times anything else, so airframe masking is the one pre-step that moves both sides and can be validated where we have ground truth; and **the size floor is a MAX, not a sum** — insensitive to everything smaller than the biggest competitor and therefore **hostage to that one object** |

The pattern across all of them: the number was satisfiable by something that looked nothing
like the arcade, and in five cases tuning to it moved the build **away** from the reference. In one case
(row 18) the criterion *rewarded* the build for getting worse.
**Before tuning to a criterion, check the criterion against the arcade itself.**

**R10 adds a second pattern, visible only now that there are fifty rows.** Sort them by how the
defect was found and **not one** was found by a synthetic control. They were found by cropping and
looking, by reading the stage digit, by decoding a second frame, by naming a unit — and in R10, by
running the statistic on two drawings whose relative quality was already settled. **Controls keep
operators honest. They have never once caught a criterion.** That is not an argument for fewer
controls; it is the reason the known-quality-pair test above is now binding beside them.

**AND READ ROW 37 BEFORE READING THAT SENTENCE AS A COUNTERFACTUAL.** Every row above it is a
criterion that *would have* moved the build the wrong way had a lane tuned to it. **Row 37 is one
a lane did tune to, for five rounds, with every round recording a pass.** `MAX_ALIVE` was driven
6 → 10 → 12 → 14 to satisfy a gate whose arcade side was four hand-picked frames, one of which
carries no enemy aircraft at all. The sentence is no longer about what might have happened.

**Two selection rules follow from it, and they are the cheap half of the lesson:**

> **1. A reference pack is never a sample.** Frames are selected into `reference/` to illustrate
> the game's features, which is exactly a sample selected on the presence of the thing a frequency
> criterion counts. R7 recorded *"for a negative claim, the sample selection is the whole
> measurement"* after four frames and then sixteen nearly retired the nose sight. Row 37 is the
> same defect with the sign flipped — four frames concluding **presence**. **For a frequency claim
> in either direction, the sample selection is the whole measurement.** Use a fixed interval over
> a `STAGE_MAP.md`-verified span, chosen by a rule written before the question is asked.
>
> **2. A criterion and a constant must not be each other's evidence.** If a constant was swept to
> satisfy a gate, that gate can no longer be cited as showing the constant is right. Row 37 and
> row 41 are both this loop; in both cases the arcade side existed, was cheaper to measure than the
> sweep, and was never measured.
>
> **3. A SINGLE-FRAME FIGURE MUST ESTABLISH THAT ITS SUBJECT IS STATIC — and if it is not, say
> which phase the frame caught.** This is **ledger row 29 generalised**, and it is deliberately
> NOT a new taxon. Row 29 already owns the time axis: *"a negative about a periodic behaviour is
> only as good as the sampling interval it was taken at"*, found when the arcade's 0.267 s
> respawn flash aliased away under four separate passes. Row 43 is its positive counterpart —
> **one frame of a moving object, published as a property of the object** — and the remedy is the
> same remedy, which by the R8 judge's own test (*"a failure whose remedy is identical to an
> existing class's remedy is an instance of that class"*) makes it the same class.
>
> **The tell is what makes it dangerous: looking harder at the frame cannot find it.** Every other
> defect in this ledger is visible in the thing the operator was pointed at — read the stage digit,
> crop the mask, look at the region. A still of a tumbling plate is pixel-for-pixel
> indistinguishable from a still of a static one. **The only way to find it is to decode a second
> frame**, which no rule asked for until now.
>
> **The citation field, one line, and it would have caught both R9 title rows:**
> *subject static — yes / no, and if no, the phase.* `STAGE_MAP.md` has no field for it; add it
> to the figure's own citation.
>
> **4. A CROSS-VALIDATION CAN AGREE BECAUSE TWO ERRORS CANCEL — a suspiciously exact agreement
> between two independently built operators is a reason to go looking, not to publish.** Measured
> R9: two implementations of DRAW-WEIGHT agreed on the arcade jet's RSW to **0.00** and RP90 to
> **0.01** while running **two different masks**, the agreement existing only because one side
> carried a topology bug that shrank its wider mask onto the narrower one's reading. Fixing it
> moved the same statistics **+40 % and +30 %**. It was published as corroboration and withdrawn
> the next day. **An agreement is evidence only when both sides are specified to the level the
> statistic is sensitive at** — and the sign that they are not is agreement that is *too good*
> between operators already known to differ elsewhere (those two differed by 8 % on ink at the
> same moment). This sits with the other two cross-validation rules in ledger row 38's box.

### How to DETECT an under-specified operator, instead of explaining one afterwards (R6)

Most of this ledger is diagnosis after the fact. One row produced a **detector**, and it is
worth more than the row:

> **Two independent implementations that miss a published control in the SAME DIRECTION are
> evidence of an under-specified operator, not of two bugs.**

Two bugs are independent and land either side; a missing half of an operator is a *systematic*
omission and every faithful reader reproduces it identically. Row 19 is the worked case: R5's
re-implementation of FIRE-MASK read core **13.2 %** against the published 9.2 % and flagged
itself "not validated"; the R6 combat lane, written separately, read **18.2 %**; this lane,
written separately again, read **17.2 %**. Three readings, all high, none agreeing with the
control — and the fault was three unpublished rectangles, not three mistakes.

**So the action on a failed control is not "debug my implementation" first.** Ask whether the
*other* implementation failed the same way, and in which direction. If it did, suspect the
specification. R5 had this evidence in hand and treated it as its own instrument's failure —
the operator went unrepaired for a round, and a build decision was then taken on a figure the
operator could not produce.

**Corollary, now applied to rows 15 and 19 and worth applying to any operator this document
publishes: a control is not complete unless a reader can tell whether they applied the whole
operator.** Both repairs took the same shape — state the regions, state the predicate, and
publish the with/without numbers so the failure mode is recognisable at a glance.

**Rows 11 and 12 are a named sub-class and they are the reason for the stage-attribution rule
below.** Both were *correctly measured* — the operator was right, the arithmetic was right,
the frame was real — and **measured on the wrong stage's frame, then applied to a stage the
measurement never covered.** That is harder to catch than a bad operator, because every
re-run of the operator reproduces the wrong number exactly. The only thing that catches it is
**reading the stage digit in the frame you measured.** See "Every palette or value criterion
names its stage" below; it costs one table column and would have prevented both.

## ARCADE-PACING — enemy density, emptiness and emission (MEASURED R9 — REPLACES R3's readable-presence gate, ledger row 37)

**Why this exists**: R3's *"≥1 enemy at ≥10 %W in ≥60 % of combat frames"* had no arcade side,
the arcade fails it at 19.0 %, and a lane spent five rounds driving `MAX_ALIVE` up to satisfy it.
Ledger row 37. **Every row below carries an arcade column.**

### The operator, stated in full

* **Population** — flight frames on a **fixed interval** over a `STAGE_MAP.md`-verified span,
  selected by a rule written before the question is asked. **Not a reference pack** (row 37).
  Frames with the player not in flight (launch, death, tally, continue) leave the population.
  Frames holding zero enemies **stay in** — they are the measurement. The narrow reading of
  "combat frames" as *frames holding any enemy* is reported separately and is never the gate.
* **Subject** — enemy **aircraft** silhouettes wholly or partly inside the play area. Not
  missiles, shots, explosions, smoke, ground objects or the player.
* **Statistic** — **drawn span as a per cent of frame WIDTH**, read by a human. Per ledger row 27
  a bare "%W" is not a reportable quantity: this is **not** our `spanFrac`, which is the
  projected width of the sprite **quad** and overstates a drawn wingspan by **1.03× level and up
  to 1.39× in a hard bank**, ~1.18× bank-weighted (R8 feel critic, measured on the authored
  sheets and corroborated in a live frame). Our `READABLE_SPAN_FRAC = 0.10` is therefore a
  **~8.5 %W drawn** aircraft, not a 10 %W one. The arcade reads 0.302/frame at ≥10 %W and
  0.317 at ≥9 %W, so the correction does not move the comparison — **state it anyway.**
* **HUD** — blanked by the standing rule before anything is counted, both sides, and say so.
  The upper-right HUD has been counted as a cloud, a cloud bank, a false horizon and **three
  times** as an enemy aircraft; the third time it was inside this very criterion (row 37).
* **Instrument** — `tools/arcade_density_census.py`, `--selftest` 14/14 including a refusal arm.

### The arcade column (MEASURED R9)

**Source**: `tools/out/combat-r6/arcade-vert/labels.csv` — 63 frames on a **3.00 s** grid over
`STAGE_MAP.md`-verified spans of stages **1, 4, 6, 7, 12, 19**, 83 enemy observations, hand-read
at 1.4× NEAREST off `.reference-cache/video/ab2-longplay.mp4` (686×480).

| | mean / frame | frames holding ≥1 | frames holding ≥2 |
|---|---|---|---|
| any recorded aircraft (counter floor ~2–3 %W) | 1.317 | 61.9 % | — |
| **≥3 %W** | **1.270** | **60.3 %** | 38.1 % |
| **≥5 %W** | **0.635** | **36.5 %** | **15.9 %** |
| **≥10 %W** | **0.302** | **19.0 %** | 6.3 % |
| ≥15 %W | 0.048 | 4.8 % | 0.0 % |

**Drawn span**: p25 **4**, p50 **4**, p75 **8**, p90 **13**, p95 **13**, max **22 %W**.
**77.1 % of the arcade's own enemy aircraft are below 10 %W.**

### THE STAGE DENOMINATOR — read this before comparing any capture to the table above

**The arcade's density ramps hard with stage, and every capture this project takes is STAGE 1,
where the arcade sits roughly DOUBLE its all-stage mean.** Measured R9 by two lanes on three
different grids:

| stage | n | readable-present ≥10 %W | empty at ≥3 %W | mean/frame ≥3 %W | source |
|---|---|---|---|---|---|
| **1** | 9 | **44.4 %** | 33.3 % | 1.444 | criteria, 3 s grid |
| **1** | — | **33.3 %** | — | — | pacing, 5 s grid, independent |
| 3 | — | **0.0 %** | — | — | pacing |
| 4 | 11 | **0.0 %** | 54.5 % | 0.909 | criteria |
| 6 | 13 | 15.4 % | 46.2 % | 1.154 | criteria |
| 7 | 9 | 11.1 % | 55.6 % | 0.556 | criteria |
| **10** | — | **66.7 %** | — | **3.67** | pacing — *the busiest anything counted in this repo* |
| 11 | — | **0.0 %** | — | — | pacing |
| 12 | 11 | 27.3 % | 18.2 % | 2.091 | criteria |
| 19 | 10 | 20.0 % | 30.0 % | 1.400 | criteria |
| **ALL (criteria, 6 stages)** | **63** | **19.0 %** | **39.7 %** | **1.270** | |

> **Readable-presence ranges 0.0 % to 66.7 % across stages. Emptiness ranges 18.2 % to 55.6 %.
> NEITHER statistic is stage-robust, and a gate stated as one number cannot be right for stage 1
> and stage 4 at once.**
>
> **BINDING: match the stage population on BOTH sides.** A stage-1-only capture is compared to
> the arcade's **stage-1** column; a multi-stage capture to the all-stage column. Comparing a
> stage-1 capture to the all-stage figure would gate our stage 1 against a mean half its size —
> **the same population mismatch this document's ledger class 2 exists for**, and it would have
> told a lane to build a stage 1 emptier than the arcade's own.
>
> **AND THE STAGE-1 COLUMN CANNOT CURRENTLY GATE ANYTHING. Say so rather than using it.** It is
> **n = 9**; at 44.4 % its ±2 SE is **11.3 % – 77.6 %**, which excludes nothing. A second reader's
> independent 33.3 % agrees in magnitude. **The usable stage-1 statement is "the arcade's stage 1
> runs 33–44 % readable-present, on small n, against an all-stage 19.0 %" — and the gate for a
> stage-1 capture is therefore OPEN, pending the owed stage-1 frame count in STATUS.md.**
> Do not split the difference and invent a number.

**Corroboration, two further readers on different frames**: 18 frames on a 2 s grid over stages
1, 6, 16 → **1.56/frame, 16.7 % readable-present**; 24 frames on a 2 s grid over stages 1, 2, 4 →
**2.00/frame** on the pre-registered grid, **1.64** with four off-grid frames added. The 3 s and
2 s stage-1 grids share four timestamps and **agree exactly on all four**.

### ROUTE B CAUTION — the HIT counter may not be an aircraft counter (R9, UNRESOLVED)

The emission band's **lower** support came partly from *"emission cannot be below the kill rate"*,
with the kill rate read off the HUD's **HIT** counter (0 → 13 over t95–t119, stage 1 = 0.48–0.54
kills/s). **The pacing lane flagged that HIT also increments for GROUND targets in AB2**, citing
stage-10 frames where it steps with large ground detonations on screen. If part of that rate is
tanks and ships, the arcade's **aircraft** kill rate is *lower* and Route B stops being a lower
bound on aircraft emission.

**What I could check, and it is one weak observation in the right direction.** Stage 1 is not
free of ground objects — `tools/out/criteria-r9/crit-r9-11-ARCADE-stage1-span-grid.png` shows a
rising plume at t105 and a grey smoke column at t114. **HIT reads 11 at both t108 and t114 across
that second detonation, i.e. a visible ground event with no increment**; t105's is ambiguous.
**A 3 s grid cannot attribute increments and I am not pretending otherwise** — settling it needs
a pass keyed to each individual HIT step at ≤0.1 s sampling (ledger row 29's rule).

> **DISPOSITION: Route B is demoted from a bound to weak corroboration. The BAND IS UNCHANGED,
> because its lower end is set by Route A** (Little's law over an aircraft-only hand count) **and
> Route C** (GAME_SPEC §4's own ADOPTED 1.5 s stage-1 interval = 0.67/s), neither of which touches
> HIT. **And the direction of the error only widens the gap**: if HIT over-counts aircraft kills,
> the arcade emits *fewer* aircraft than published, against our 3.17–3.20/s. Nothing in ledger
> row 37 is at risk; the corroboration is weaker than it was stated to be, and that is recorded
> rather than left standing.

**A refinement in the same place, not yet folded into the band**: the pacing lane measures the
arcade's residence at **~3.3 s** against GAME_SPEC's MEASURED 4–6 s that Route A used. At
`W = 3.3 s`, `λ = 1.270 / 3.3 = 0.385/s` — just under the published 0.40 floor. **The band stays
0.40–0.74 until residence is re-measured directly** (STATUS's owed tracked-aircraft decode), but
a future revision is more likely to move it **down** than up.

### THE EMPTINESS ROW — the statistic no criterion had ever named

> **The arcade's sky holds no enemy aircraft at or above 3 %W in 39.7 % of frames.**
> At **any** recorded size the figure is **38.1 %** (24 of 63, two independent routes over the
> same file). **The two readings differ by one frame and are two different statistics: publish
> the floor with the number.** `judging/R8/feel-critique.md` §1 prints 39.7 % under the words
> "no enemy aircraft at all", which is the 38.1 % definition — ledger row 27's family, found
> inside the figure that retires row 37, and it reconciles.

A criterion set only on **presence** can be satisfied only by adding aircraft; it is structurally
incapable of asking for a gap. **Emptiness is part of AB2's rhythm and must be gated directly.**

### THE GATE

Bands are **±2 standard errors on the 63-frame arcade sample**, derived rather than chosen.

| statistic | **arcade** | **GATE** |
|---|---|---|
| frames holding ≥1 enemy at **≥10 %W drawn** | **19.0 %** | **9–29 %** |
| frames holding **no enemy aircraft at ≥3 %W** | **39.7 %** | **≥27 %** |
| mean enemy aircraft on screen at ≥3 %W | **1.270** | **0.9–1.6** — *names its pilot; see below* |
| frames holding ≥2 enemies at **≥5 %W** | **15.9 %** | **≤25 %** |
| share of enemy observations **below** 10 %W | **77.1 %** | **≥65 %** |
| emission rate, aircraft / s of flight | **0.40–0.74** (three routes; see the Route B caution) | **0.4–1.0** |

**R3's second clause, *"≥2 at ≥5 %W in ≥50 %"*, is retired with the first and has never been
quoted by anyone.** The arcade reads **15.9 %**. It is the more wrong of the two.

**MEAN-ON-SCREEN NAMES ITS PILOT, AND THE TWO ARMS STRADDLE THE BAND.** R9 measured
**0.63–0.90** on a kill-rate-matched pilot and **1.58–1.76** on `?demo=1`, against a 0.9–1.6 gate.
That is not two builds, it is two pilots — GAME_SPEC §2's deaths/min row already carries the same
warning in the same words. **Report the arm, and read the row only against an arm whose kill rate
matches the arcade's 0.42–0.54/s.**

**AND THIS ROW IS NOT THE SPAWNER'S TO CLOSE — do not open a gap on it against `spawner.js`.**
Measured R9: our residence above the 3 %W floor with nothing killed (`idle`) is **3.05–3.16 s**
against the arcade's ~3.3 s — **our size-vs-depth geometry already matches.** At the arcade's kill
rate ours collapses to **0.99–1.31 s**, because **missiles are 47–77 % of all kills and carry no
span gate at all** (`READABLE_SPAN_FRAC` binds `vulcan.resolveHits` only) at a 22 %W lock radius —
ledger row 41. They remove traffic the gun is forbidden to touch, before it is ever countable.
**Raising emission to refill this row would immediately break the three rows that now pass.** The
lever is the **missile economy** (`flow.js:378` restocks 50 at every stage boundary against
GAME_SPEC §5's measured "fill to 70 at two points"), not the spawn rate.

**EMPTINESS: publish the RUN-LENGTH beside the percentage.** A percentage cannot tell a sky that
empties once for eight seconds from one that flickers two hundred times. Measured R9 on our own
build: **before, the longest empty run in a 90 s run was 0.32 s and the median *continuously
occupied* run was 86.5 s** — a 0–3 % emptiness figure and a sky that never actually emptied.
After: empty runs median 3.4–5.1 s, p90 7.2–8.5 s. The arcade's stage-1 span carries a
**ten-second** hole (six consecutive sampled frames, HIT moving once).

**What this criterion CANNOT see**: it is a count statistic and is **blind to arrangement** —
six aircraft in a line and six in a formation score identically (row 18's lesson, applied before
the fact). Pair it with the worst-drought statistic, the empty-run lengths above, and an
occlusion figure.

### The our-side baseline the retirement was diagnosed from (tree `ea3726b` — STALE BY DESIGN)

Recovered by re-running the R8 feel critic's own formatter over its own pooled arms, because
`judging/R8/feel-critique.md` §2.4 shipped with **two unsubstituted template placeholders**
(`PILOT_CENSUS_TABLE`, `TRK_CENSUS_COMPARE`) and the our-side table is absent from the document:
`python3 tools/out/feel-critic-r8/tables_fc8.py tools/out/feel-critic-r8/arms{A,B,C}-results.json`.

| floor | arcade /frame | arcade present | ours `trk` /frame | ours `trk` present |
|---|---|---|---|---|
| ≥3 %W | **1.270** | **60.3 %** | **6.94** | 99.8 % |
| ≥10 %W | **0.302** | **19.0 %** | **1.78** | **80.4 %** |

Empty sky at the matched ≥3 %W floor: arcade **39.7 %**, ours **0.18–0.19 %**.

> **The ratio is 5.5× at ≥3 %W and 5.6× at ≥10 %W — the SAME factor at both floors. Our enemy
> size distribution is right; the population is five and a half times too large.** That is a
> one-constant defect, and it is the credit to carry out of the retirement.

**These figures are tree `ea3726b` and are being changed by the R9 pacing lane. Re-measure before
quoting them against any commit.**

## DRAW-WEIGHT — how heavily the object is drawn (MEASURED R9, ledger row 40)

**Why this exists**: every statistic this project owns for a drawn object is a **value**, a
**palette**, or a **silhouette-topology** statistic, and in R8 all of them passed simultaneously
on the player jet, the title, the death hulk and the carrier — all four visibly wrong. Nothing
measured could tell the difference between *"which colours, where"* and *"how much line"*.

### The operator

**`tools/art/inkspan.py` is the instrument and its definitions are licensed verbatim** so this
project does not acquire two operators under one name (rows 14, 22, 27).
`tools/inkspan_arcade.py` is a second, independent implementation used to cross-validate the
arcade side before any of it was licensed.

| | |
|---|---|
| **INK** | mask pixels, **largest 8-connected component** |
| **SPAN** | **Feret diameter** (convex hull), not row extent — so it may be read on any bank pose |
| **INK/SPAN** | mean drawn cross-section, **in pixels**. The R8 art critic's invention |
| **SW** | 2 × median distance from an ink pixel to the nearest background pixel — a **local** thickness: a 3 px stroke returns the same value whether it is 10 px long or 100 |
| **P90SW** | the same at the 90th percentile — the thickest mass present |
| **bbox fill** | ink ÷ bounding-box area. Published **beside** INK/SPAN, never instead of it |
| **DENS** | `1000 × ink / span²` — INK/SPAN's scale-free form |
| **RSW / RP90** | SW and P90SW as a **per cent of span** — the scale-free forms, and **the ones to gate on** |

### THE LICENCE CONDITION, proved by control and stated before any figure

> **INK/SPAN IS A DIMENSIONED QUANTITY.** Ink grows as the **square** of scale and span grows
> **linearly**, so the same drawing read at twice the size returns twice the number.
> `tools/inkspan_arcade.py --selftest` scale arm: the identical synthetic at 2× nearest moves
> **INK/SPAN by ×1.999** and **SW/SPAN by 0.001 points**.
>
> **INK/SPAN may only be compared between two subjects at a MATCHED SPAN (within ±10 %). Across
> different sizes or resolutions the comparable forms are ~~SW/SPAN~~ DENS and bbox fill.**
>
> **CORRECTED R10 (R9 judge §5.1): SW/SPAN IS NOT A CROSS-RESOLUTION FORM AND THIS SENTENCE SAID
> IT WAS.** Six subjects magnified 2× by nearest — which changes **no pixel of the drawing** —
> move **RSW or RP90 by 17–50 % on five of the six**, and on the control's own subject the gated
> statistic **RP90 moves −25.7 %**. On the licensed arcade day anchor, 1× → 2×: **DENS ×0.987,
> RSW ×0.786, RP90 ×0.941.** **DENS is the only one of the four that holds.**
>
> **AND BOTH IMPLEMENTATIONS PRINT THE REFUTATION WITHOUT ASSERTING ON IT.**
> `tools/inkspan_arcade.py --selftest` asserts `SW/SPAN` and prints `P90SW` moving 25 % on the
> next line; `title_drawweight_r9.py` control 2 asserts `RSW 4.47 → 4.40` and prints
> `RP90 8.93 → 6.60` unchecked. **A control that prints a failure it does not assert on is a
> control that passes.** Both must assert on RP90. *No published R9 number is overturned by
> this* — the judge checked the 18 % night-anchor scale gap against the measured −21 %/octave
> and it is worth ~−5 %, which does not explain our 1.24× RSW.

The R8 art critic's jet comparison is valid *because* it matched spans (arcade 109.7 against ours
115.0), and the report does not say that is why. Without this condition the next lane compares a
16 px far-enemy cell against a 9 px arcade one and reports a 2× defect that is entirely scale.

**AND THE MATCHED-SPAN LICENCE IS WHAT RESCUES THE BANK-INVARIANCE CLAIM — which is TRUE, by 24×.**
`tools/art/inkspan.py --selftest` control 6, reproduced by this lane: **one drawing rigidly rotated
through eight angles** (the right model, because from astern a bank rotates in the *image plane* and
does not foreshorten in span) gives

> ~~**CV: INK/SPAN 1.2 %, DENS 1.7 %, RP90 5.3 %, RSW 18.4 % — against bbox fill's 28.7 %.**~~
> ~~INK/SPAN is 24× more rotation-stable than fill.~~
>
> **STRUCK R10. THAT ROW IS THE SYNTHETIC, AND ITS RSW FIGURE WAS RETRACTED BY ITS OWN AUTHOR IN
> THE SAME ROUND IT WAS PUBLISHED HERE** (`judging/R9/lane-drawing.md` §2.4g: *"That is a property
> of my synthetic, not of RSW, and it is retired"*). All four numbers come off **one**
> `inkspan_jet.py --invariance` arm-B line; the box quoted all four and the lane had retracted one.
> `tools/art/inkspan.py` control 6 now labels the synthetics **`<- NOT evidence`**.
>
> **THE CLAIM IS TRUE AND ON A REAL SUBJECT IT IS STRONGER. Replaced by the R9 judge's run of the
> test this box needed — the licensed arcade day anchor, one drawing, eight rigid rotations:**
>
> > **CV: INK/SPAN 0.5 %, DENS 0.8 %, RP90 2.6 %, RSW 0.4 % — against bbox fill's 14.1 %.**
> > **29.4× on a real aircraft**, against the synthetic's 24×. The art critic's claim stands and
> > now has the control it needed. Corroborated by control 6's own real subjects (RSW CV
> > 0.22 / 0.40 / 3.84 %).

**The same control run over our NINE AUTHORED BANK CELLS reads INK/SPAN CV 9.9 % against fill's
15.0 % — only 1.5× — and that discrepancy is the licence condition proving itself.** The authored
cells differ in **SIZE as well as bank**: `poseTransform` applies `SHRINK = 0.34` and span runs
65 → 99. **INK/SPAN is dimensioned, so a size difference enters it as a bank difference.** The
critique's own 13.15 → 10.93 is `SHRINK`, not invariance failing. Three independent routes now
require the matched-span rule: the 2× scale control, this reconciliation, and the far-enemy
comparison below.

~~**RSW is the exception and must not be gated on alone: it is the LEAST rotation-stable of the
four at CV 18.4 %**~~ — **STRUCK R10, AND THE REASON WAS THE OPPOSITE OF THE TRUTH.** On the
licensed anchor **RSW is the MOST rotation-stable of the four, at CV 0.4 %** against RP90's 2.6 %.
It was excluded from the gate on a figure its own author withdrew in the same round.

> **This is not a tidy-up, and the R9 judge is right that it is load-bearing.** Our jet reads
> **RP90 1.03× the arcade's and RSW 1.24×**. The gated statistic says the jet is finished; the
> excluded one says the body is still a quarter too thick — which is what the crop shows and what
> the drawing lane itself reports as its headline residual. **The one statistic that still
> discriminates was excluded on a retracted basis.**
>
> **RSW IS STILL NOT PROMOTED TO THE GATE, and the reason is now a measured one rather than an
> inherited one.** Two things must hold first and neither does yet: (a) **RSW is the most
> scale-sensitive of the four** — a pure 2× nearest magnification moves it **×0.786** on the
> licensed anchor, against DENS's ×0.987 (§ the licence condition above), so an RSW gate is a gate
> at one span only; and (b) it has **not been run on a known-quality pair as a gate** — on the
> seven same-subject pairs it ranks 4, ties 3, inverts 0, which is clean but is **3 ties out of 7**,
> i.e. it is silent on nearly half of them. **Quote RSW beside RP90 on every figure, treat the
> 1.24× as the live residual it is, and promote it only after a scale-matched pair run.**

### The arcade column — PER OBJECT, and UNLICENSED where there is none

**Player jet** — `reference/ab2-arcade-desert.png`, **true native 320×224**, 138 colours, HUD
stage digit **2**, **banked**, **n = 1**. Mask = exact membership in `#ffffef`, `#f7e6b5`,
`#840000`, `#000000`; largest 8-connected component; identical across two crop boxes.

**THE MASK IS PART OF THE STATISTIC, AND THREE INDEPENDENT IMPLEMENTATIONS DISAGREED BY 2× UNTIL
IT WAS PINNED DOWN.** An exact four-role palette mask **drops the two nozzle discs**, because they
are drawn in oranges shared with the desert ground and survive only as enclosed holes ringed in
black. The discs are the heaviest mass on the aircraft — they are what `P90SW` exists to measure —
so losing them halves `RP90`. **Any mask rule must therefore recover regions enclosed by the
airframe, by enclosure rather than by colour.**

**WHICH membership rule is settled below by a GROUND-TRUTH test, not by preference — and this
document named the wrong one first.** An earlier revision of this box licensed "the four airframe
roles plus enclosure" eight lines above licensing the achromatic decision procedure: **two rules,
one box, on the operator every figure here turns on.** That is ledger row 34's defect, committed
in the repair for it. **There is one rule and it is the achromatic one.**

**AND THE ENCLOSURE RULE HAS A TOPOLOGY CONDITION THAT COST 78 px BEFORE EITHER LANE HAD WRITTEN
IT DOWN.** The background flood and the foreground component **must not both be 8-connected**: in
digital topology one of the pair must be 4-connected or the Jordan-curve property fails, and a
**diagonally-stepped ring does not enclose anything** under an 8-connected flood. The arcade's
nozzle discs are bounded by exactly such a ring. Measured on the four-role mask, both crop boxes,
two implementations:

> **8-connected background flood → +55 enclosed px (831). 4-connected → +133 (909).**
> **78 px, 8.6 % of the subject, on an unstated choice.** The rule is **8-connected foreground,
> 4-connected background flood.**

| mask rule | implementation | ink | span | INK/SPAN | **RSW** | **RP90** | bbox fill |
|---|---|---|---|---|---|---|---|
| 4 roles, **discs dropped** — *first published reading, an UNDER-COUNT* | criteria | 776 | 109.78 | 7.07 | 1.82 | 3.64 | 15.0 % |
| 4 roles + enclosure, **8-conn flood** — *topologically invalid, do not use* | drawing | 831 | — | — | — | — | — |
| **4 roles + enclosure, 4-conn flood** | **criteria** | **909** | **109.78** | **8.28** | **2.58** | **7.51** | **17.5 %** |
| **the same rule, independent implementation** | **drawing** | **909** | 109.7 | — | **2.60** | **7.58** | — |
| **sat/V membership + enclosure, 4-conn** (`inkspan.py` day anchor) | drawing | **1056** | 109.7 | 9.63 | **3.65** | **9.82** | — |
| the same, reproduced here | criteria | **1056** | 110.66 | 9.54 | **3.61** | **9.73** | — |
| R8 art critic | — | 803 | 109.7 | 7.32 | — | — | 15.1 % |

> **CORRECTION, AND IT IS A CORRECTION TO THIS DOCUMENT'S OWN ARGUMENT OF ONE DAY EARLIER.** This
> box previously said *"the scale-free stroke statistics reproduce across implementations; the
> ink-count statistics do not"*, citing RSW agreeing to 0.00 and RP90 to 0.01. **That agreement was
> between two DIFFERENT masks and was produced by the topology bug above** — the invalid 8-connected
> flood happened to shrink the wider mask onto the narrower one's reading. **A cross-validation can
> AGREE because two errors cancel**, and this one did. Restated correctly, and verified
> independently on this tree:
>
> | | across **implementations**, one mask rule | across **mask rules**, one implementation |
> |---|---|---|
> | ink | **909 vs 909 — exact** | 909 → 1056, **+16 %** |
> | RSW | 2.58 vs 2.60 | 2.58 → 3.61, **+40 %** |
> | RP90 | 7.51 vs 7.58 | 7.51 → 9.73, **+30 %** |
> | INK/SPAN | — | 8.28 → 9.54, **+15 %** |
>
> **So the stroke statistics are the MOST mask-sensitive of the four, not the least** — the
> opposite of what was published. **The gate on RP90 stands, because it never rested on mask
> robustness**: it rests on control 7 (distribution separation ×1.811) and control 6 (rotation CV
> 5.3 %). What is withdrawn is the supporting argument, not the gate. And it makes
> *"a gate on RP90 is a gate on RP90-under-a-named-mask"* load-bearing rather than pedantic.

**THE LICENSED MEMBERSHIP RULE IS NAMED PER SUBJECT AND PER PALETTE. There is no general rule,
and the saturation threshold is RETIRED as one (R9).** Steps 2 and 3 are universal; **step 1 is
not**:

| palette / background | step 1 | ground-truth recovery vs `alpha>0` |
|---|---|---|
| **DAY palette over saturated terrain** | IN if `sat < 0.35 and V > 0.08`, **or** exactly `#840000`, `#000000`, `#425284` | **92.4–94.3 %** our day sheet (→ ~99 % with step 3); **86.1 %** of the fuller mask on the arcade jet |
| **NIGHT palette over black** | IN if `max(RGB) > 30` | **100.0 % on every one of our nine night cells** |
| any **new** subject | an **enumerated tone list**, ground-truth tested before use | — |

2. keep the largest **8**-connected component; 3. fill background not **4**-connected to the
frame border.

**WHY THE DAY RULE CANNOT BE USED AT NIGHT — measured, and the loss is worse than first reported.**
The night blue-greys are **not achromatic**: `#425284` **sat 0.500**, `#6373a4` 0.396,
`#7384b5` 0.365, `#c594f7` 0.401 — **44.0 % of the night level cell's ink sits at or above the
0.35 floor**, plus 6.8 % of afterburner. Recovery on our night sheet, nine cells, measured
independently by two lanes:

| rule | recovery vs `alpha > 0` |
|---|---|
| day rule, keyline **not** named | **44.0 – 50.9 %** |
| day rule, `#425284` named | **77.7 – 83.0 %** — *the level cell, from which every night figure is quoted, still loses 22.3 %* |
| **value rule `max(RGB) > 30`** | **100.0 % on every cell** |

> **Naming the keyline is not enough**, because `#6373a4` alone is 12.8 % of the ink at sat 0.396.

**AND THE THRESHOLD MUST NOT BE RETUNED — this was checked against the arcade before being
rejected.** Raising the floor to admit the night tones destroys the day anchor, because the
**desert terrain** starts qualifying. Measured on `ab2-arcade-desert.png`:

| sat floor | arcade day jet ink | DENS | **RP90** |
|---|---|---|---|
| **0.35** | **1 056** | 86.2 | **9.82** |
| 0.45 | 1 097 | 89.6 | 9.82 |
| 0.50 | **1 198** | — | **9.82** |
| 0.55 | **1 207 (+14.3 %)** | 100.4 | **9.51 (−3.2 %)** |

> **CORRECTED R10, AND THE WRONG ONE OF TWO FIGURES IN THE SAME LANE'S OWN REPORT WAS PROMOTED
> HERE.** The struck figures were **1 317 / 1 368 / 8.48 / 8.31 (+29.5 %, −15 %)**. The R9 judge
> could not reproduce them under **any** of seven variants — three crop boxes and four mask-step
> variants — and the correct table is **in the same lane's report two hundred lines later**
> (`judging/R9/lane-criteria.md:1268`: *"0.55 … ink 1207, DENS 100.4 — +14.3 %"*, and
> *"RP90 3.2 %"*). This document promoted the wrong one **with an explicit upward correction of
> the right one attached.**
>
> **The conclusion survives and must not be weakened with the figure.** Raising the floor still
> inflates the arcade day anchor's ink by **14.3 %** because the desert starts qualifying, the
> night rule still covers **97.8–98.6 %** of the daylight crop, **neither rule generalises, and
> the threshold must not be retuned.** What is withdrawn is the sentence that made it a
> gate-level emergency. **A lane told the gate moves 15 % under a mask choice makes different
> decisions from one told it moves 3.2 %** — and this is R9's own process rule (b) catching R9:
> *the figure most worth cropping is the one you have already explained to yourself.*
> "+29.5 %, a cliff because the desert qualifies" is a large, reproducible-looking number that
> arrived with a tidy mechanism attached.

**It is a cliff in INK, not in the gated statistic.** Symmetrically, the
night rule cannot be used by day: `max(RGB) > 30` covers **98.6 %** of the arcade's daylight crop,
because the desert ground qualifies. **Neither rule generalises, and that is the finding.**

> **BINDING: a gate on RP90 is a gate on RP90-under-a-named-mask, and the mask is named PER
> SUBJECT AND PER PALETTE — ground-truth tested on every palette variant it will be applied to,
> not merely on both sides of one comparison.** The day anchor below is unaffected: it is a day
> subject and the day rule is right for it. The entire 909 → 1056 difference is **step 1** — six arcade airframe mid-tones a
four-role list omits (`#a48484` 96, `#d6d6a4` 60, `#ceb59c` 41, `#ffffff` 6, `#948463` 4,
`#f7f7f7` 1). All six are in this document's own tone census; keeping them is a **choice**, which
is a second independent reason **INK/SPAN stays a diagnostic and never a gate**.

### WHY THIS RULE AND NOT THE FOUR-ROLE ONE — the only ground truth either side has

The arcade's mask can only ever be checked **by looking**. Our own sheets have an **alpha
channel**, which is ground truth, and it decides the question. Recovery against `alpha > 0`,
`src/assets/sprites/player-f14.png`, all nine day cells, measured independently by this lane and
reproducing the drawing lane's figures.

> **THE STEP ORDERING IS PART OF THE OPERATOR AND IS WORTH 36 POINTS — ADDED R10, R9 judge §5.5.**
> **Intersect the candidate mask with `alpha > 0` FIRST, then take the largest component.** Doing
> it the other way round returns a clean, plausible, stable **57.0 %** for cell 4 where the
> published ordering returns **20.9 %**. The judge reproduced the table only on the second
> attempt, for exactly this reason, and the table is unreadable without the line.
>
> **And this is a fourth, independent argument for the licensed rule that nobody had made: the
> four-role rule's recovery depends on the unstated ordering by up to 36 points; the achromatic
> rule's does not depend on it at all** — 94.3 / 92.4 / 93.6 under **both** orderings.

| day cell | alpha>0 px | four roles, raw | **four roles + largest-component** | **achromatic rule** |
|---|---|---|---|---|
| 0 | 523 | 66.3 % | **36.9 %** | 94.3 % |
| 1–3, 5–6 | 670–958 | 61–62 % | 59.3–61.6 % | 93.1–93.5 % |
| **4 — the LEVEL pose** | 1 056 | 57.6 % | **20.9 %** | **92.4 %** |
| 7 | 668 | 61.7 % | **34.4 %** | 93.4 % |
| 8 | 533 | 63.0 % | **41.7 %** | 93.6 % |

> **The four-role rule recovers as little as a FIFTH of our own airframe, and how much depends on
> the POSE.** The mechanism is step 2: the four-role mask **fragments** the level airframe into
> disconnected pieces and the largest-component step then discards all but one — 57.6 % → 20.9 %
> on cell 4 from the component step alone. On the arcade's jet the same rule recovers **86.1 %**,
> because that aircraft really is mostly those four tones.
>
> **A criterion that compares the two sides through a mask ~86 % faithful on one and 21–62 %
> faithful on the other, pose-dependently, is not comparing like with like.** The achromatic rule
> is licensed because it is the one that **survives a ground-truth test on both sides**, not
> because it admits more documented tones.
>
> **AND THE RESIDUAL IS THE STRONGEST ARGUMENT FOR THE RULE — stronger than either the tone
> census or the recovery table.** The ~7 % the achromatic rule misses on our sheets without
> step 3 is the **afterburner flame** (`#ef7300` 56 px, `#ffd600` 16 px on cell 4). Step 3
> recovers it **by exactly the mechanism that recovers the arcade's nozzle glow**: saturated
> colour inside a dark ring, rejected by `sat < 0.35`, restored because it is *enclosed*. Both
> readings confirmed to the pixel by two independent implementations.
>
> **One rule, one failure mode, both sides, and the same residual tone left over on each** — the
> `#e694f7` canopy fleck, 8 px on our cell 4 and ~0.9 % of ink on the arcade's jet, saturated
> magenta and unrecoverable by enclosure. **A mask rule that fails identically on both sides is
> comparing like with like; that, and not the number of documented tones it admits, is why this
> one is licensed.**

> **GENERAL RULE, binding: a mask rule is validated against GROUND TRUTH on BOTH sides of a
> comparison.** Only our own sheets have ground truth (the alpha channel); the arcade side can
> only be checked by cropping and looking. **A rule that is never tested against our own alpha is
> untested**, and the pose-dependence above is invisible to every statistic in this document.

> **Day anchor, licensed: ink 1056, span 109.7, INK/SPAN 9.63, DENS 87.8, RSW 3.65, RP90 9.82,
> dark-accent 34.0 %.** Night-LEVEL anchor unchanged (its nozzle ring is open to the sky — a
> separate, already-documented problem). `#840000` **224 px** and `#000000` **135 px** reproduce
> exactly under every rule above: **the dark roles are robust and the pale role is where every
> disagreement lives.**
>
> **Dark-accent share has four published denominators** — 44.7 % (critic, ink 803), 46.0 %
> (4 roles, 770), 39.5 % (4 roles + enclosure, 909), **34.0 % (licensed, 1056)**. **Publish the
> mask with it and run the same mask on both sides**, or the comparison against our 25.1 % is not
> like-for-like.

→ `tools/out/criteria-r9/crit-r9-10-ARCADE-jet-HOLES-FILLED-IN-GREEN-6x.png` shows exactly what the
enclosure rule recovers: **the two nozzle discs and a scatter along the spine, 133 px, 17.1 % of
ink.** It does **not** fill the sky between the blades — those gaps are open to the border and stay
open, which is the property that lets the statistic still see a structure.
→ `tools/out/criteria-r9/crit-r9-03-ARCADE-jet-INKMASK-6x.png`: the arcade's F-14 reduced to its
own four palette roles is **a skeleton of 2 px cream strokes, each with a dark-red shadow line
beside it, and no filled surface anywhere.** `SW = 2.0 px` is that sentence as a number.

**Distant enemy aircraft** — same true-native frame, native `(108,28)–(132,48)` and
`(140,55)–(168,78)`, background `#e67300` exact, largest component.

| | **arcade A** | **arcade B** | **ours, `enemySprite.js` `drawRearFar()`** |
|---|---|---|---|
| ink | 45 | 49 | **128** (16 × 8, every texel opaque — read from source, not inferred) |
| span | 16.00 | 18.49 | 16.03 |
| INK/SPAN | **2.81** | **2.65** | **7.99** |
| SW | 2.0 | 2.0 | **8.0** |
| **bbox fill** | **34.6 %** | **30.6 %** | **100 %** |

Spans are matched here (16.0 / 18.5 / 16.0), so INK/SPAN reads directly: **2.8–3.0× at the same
span**, and the scale-free form is **100 % against ~32 %**. The arcade keeps sky inside the
aircraft's own bounding box at nine pixels of span. **`drawRearFar()` draws 44.8 % of all enemy
sprites on screen.** Neither arcade enemy has any *enclosed* background, so the mask rule above
leaves both unchanged — the nozzle-disc correction is a player-jet effect only.
Scale-free companions: arcade A **RSW 12.50 / RP90 25.00 / DENS 175.8**, arcade B **10.81 / 21.63 /
143.3**.

> **R9 RESULT AND HONEST BOUND, from the drawing lane, recorded so nobody tunes past it.** The far
> cells were rebuilt and verified by instrument (`tools/art/far_lod_preview.mjs`, not by reading
> the source): **bbox fill 100.0 % → 56.3 %.** The arcade's **30.6–34.6 % is UNREACHABLE while the
> FULL-WIDTH-BAND INVARIANT stands** — the invariant needs three full-width rows of eight, which is
> **37.5 % before a single shaped pixel is drawn.**
>
> **The invariant was not weakened to get there, and the arithmetic checks.** With nearest
> filtering a quad of height `h` samples texel rows `floor((i+0.5)·8/h)`; rows **2, 3 and 4**
> full-width are hit by every height 1–8 — verified independently by this lane for all eight
> heights (h=1→row 4, h=3→4, h=4→3, h=5…8→2). Rows 0, 1, 5, 6, 7 are then free to carry
> silhouette, asserted at module load and re-checked by the preview tool (span == quad width at
> every size 2–10 px). **Both measured R3 failures the invariant exists to prevent — mipmap
> ghosting and NEAREST dropouts — survive.**
>
> **So 56.3 % is the floor of what this design can reach, not a miss.** The only remaining lever is
> lowering `DETAIL_SWITCH_NATIVE_PX` so the shaped sheets cover more of the range, which is a
> **combat-lane call about the span gate** and is not taken here. **Do not open a gap for the
> residual 56.3 → 32 %; it is a design constraint with a measured reason.**

**Near-aspect enemy, carrier, title, death hulk — NO ARCADE COLUMN EXISTS. DRAW-WEIGHT is
explicitly UNLICENSED on all four.** Their only references are 686×480 video, where INK/SPAN is
read at **2.14× our native scale** *and* the mask needs a tolerance that **adds** ink at low
values and **removes** it at high ones — a statistic that is a function of a knob. Acquisition
items 5 and 6. **Creating a criterion without an arcade side is what ledger row 37 retired; do
not do it here.**

**The night true-native cannot substitute for the jet's n = 1.** `ab2-arcade-night-banking.png`
has its player jet **inside a 37.8 %W fireball** and the subject cannot be isolated. That is the
second distinct measurement programme this frame has defeated; recorded so it is not attempted a
third time.

### What DRAW-WEIGHT CANNOT see

1. **It is dimensioned.** Matched span, or SW/SPAN. Nothing else.
2. **It is blind to colour and to WHERE the ink sits.** A correctly-weighted drawing of the wrong
   aircraft in the wrong hues scores identically. **This criterion is an ADDITION to the gate set,
   never a replacement** — VALUE-STAT, the ladder and JET-SIL must keep passing beside it.
3. **Largest-component masking silently drops SEPARATED strokes** — a wing thinned until sky
   breaks through loses its whole component, and INK falls for a reason the statistic does not
   mean. **If the component count is not 1, publish it.**
4. **It has an arcade side on exactly two objects and is unlicensed on four.** Do not generalise
   the jet's 7.07 to a class — that is ledger row 35, which the R8 art critic reports as
   three-for-three.
5. **DENS AND INK/SPAN ARE NEARLY BLIND TO THE DEFECT THE CRITERION EXISTS TO CATCH.** Control 7,
   `tools/art/inkspan.py --selftest`, reproduced by this lane: one centred bar against four
   separated blades at **matched ink and matched span** — the R4→R8 defect itself — separates by
   **INK/SPAN ×1.025, DENS ×1.037, RSW ×1.430, RP90 ×1.811.** DENS sees **3.7 %**, roughly a
   quarter of its own background-tolerance band on a video source. **So the gate is RP90, with RSW
   quoted beside it; DENS and INK/SPAN are REPORTED DIAGNOSTICS, not gates** — INK/SPAN always with
   its span and its mask.
6. **RP90 is the most mask-sensitive of the four** — the arcade jet reads **3.64 or 7.51** on the
   same frame depending only on whether the enclosed nozzle discs are in the mask. **A gate on RP90
   is a gate on RP90-under-a-named-mask.** Cite the mask rule above in the same sentence, every
   time.
7. **IT CANNOT RANK TWO DIFFERENT AIRCRAFT, AND WITHOUT AN ARCADE ANCHOR IT CANNOT RANK AT ALL**
   (R10, ledger row 44). Blind spot 4 said this as a licence; it needs saying as a **direction**,
   because that is the form a lane will use it in. **Where an anchor exists DRAW-WEIGHT is a
   DISTANCE and it behaves** — four accepted player-jet redraws, \|d\| 3.08 → 2.30 → 2.30 → 0.48,
   never once moving away. **Where no anchor exists the only reading left is *"lower is lighter,
   so push it lower"*, and under that reading a thin continuous sheet beats separated blades
   every time** — which is exactly what the R9 art critic measured on the two head-on enemy
   sheets. **Never write "lower is better" about a DRAW-WEIGHT figure that has no arcade column
   beside it.**
8. **It is alpha-shape-only, so it cannot see a LIVERY — and four of our sheets are two drawings**
   (R10, ledger row 45). `interceptor-head`/`prop-head` share one alpha plane, as do
   `grey-head`/`camo-head`. Any DRAW-WEIGHT figure over those four sheets has **n = 2**.

## TIME-ENVELOPE — how an event behaves BETWEEN frames (MEASURED R10, ledger rows 48–49)

**Why this exists, and it is the largest hole ever found in this board.** Two greps across every
judge report, both art critiques and both ground-truth documents return **zero hits** for a
motion comparison and **zero** for missile tracking, heat-seeking, lock acquisition or turn rate.
Forty-three repaired criteria measured **colour, value, palette, silhouette topology, geometry
and population**, and every one of them reads **one frame** or a telemetry scalar. The R9 judge
split its score on exactly this — **stills 9/10, motion 4/10** — and retired the trend line:

> *"A game can satisfy all forty-three repaired criteria and be wrong the instant it moves, and
> that is what has happened."*

**The worked example is the fireball, and it is the cleanest demonstration this project has that
a complete gate set can be complete and wrong.** Our explosion passes **every** palette, value,
decile-ladder and silhouette gate, and all of those gates are **correct**. It holds within 60 % of
its peak for **0.600 s against the arcade's 0.067 s.** Nothing on the board could see it.

### The operator — LICENSED, not invented, and reproduced independently before publication

**Licensed verbatim from `judging/R9/report.md` §2.4** so this project does not acquire two
operators under one name (ledger rows 14, 22, 27, 34):

**Reference implementation: `judging/R10/envelope_r10.py` (`--selftest`, 18/18).** The mask is the
R9 judge's; steps 2–4 are the effects lane's and are licensed from it rather than restated.

| | |
|---|---|
| **FIRE MASK (`r9`)** | `R > 180 ∧ 60 < G < 235 ∧ B < 90`, per pixel, **both sides, no tolerance knob** |
| **2. persistence exclusion** | **derived per run, never hardcoded**: drop every pixel passing the mask in **> 50 % of the window's frames** — the HUD, the sun, the ground, and the player's own nozzles, which are orange and never go out. The window must therefore be **much longer than the event**, and the tool **refuses** rather than reporting when `life10` exceeds half the window |
| **3. largest 8-connected component** | of what survives (ledger row 38's topology condition) |
| **per-frame scalar `a(t)`** | that component's pixel count **÷ total frame pixels** — a share of the **frame**, not of a mask or a bbox |
| **PEAK** | the single maximum tick. **No smoothing** — smoothing hides the boil artefact §"the triple" turns on |
| **SAMPLING RATE** | **60 Hz on both sides**, and this is the point of the whole section |
| **arcade decode** | `ffmpeg -ss T -frames:v N -vsync 0` — **consecutive decode, never `-vf fps=N`**, which resamples |

**THE STATISTICS, BY NAME — AND "HOLD" IS RETIRED AS A NAME BECAUSE IT MEANT TWO THINGS.**

| name | unit | definition |
|---|---|---|
| `peak` | % of frame | `max a` |
| `t_rise` | s | first light → peak, walked **back** from the peak so an earlier event cannot set it |
| **`w60`** | f / s | the **CONTIGUOUS** run containing the peak with `a ≥ 0.60·peak` |
| **`n60`** | f / s | the **TOTAL** frames in the event with `a ≥ 0.60·peak` |
| `r100` | ratio | `a(t_peak + 0.100 s) / peak` |
| `t_half` | s | first time after the peak with `a < 0.50·peak` |
| `life10` | f / s | total frames with `a ≥ 0.10·peak` |

> **R9 §2.4's *"ticks within 60 % of peak"* does not say which of `w60` and `n60` it is.** On the
> arcade they coincide (4 and 4), so nothing turned on it there. **On our build they did not —
> 6 against 16.** A contiguous-only reading scores a flickering plateau as a flash; a total-only
> reading scores a flash as a plateau. **Publish BOTH; neither is reportable alone.** *(This
> document previously added the contiguous run as an improvement. That was half the repair — the
> effects lane found the other half by measuring, and our own build is the worked example.)*

> **INSTRUMENT CONTROLS.** `judging/R10/envelope_r10.py --selftest` **18/18** on synthetic 60 Hz
> sequences of prescribed area, including the refusal path and a **non-vacuous** exclusion test
> (FIRE-MASK *does* accept the static HUD bar that `r9` rejects); connected components
> cross-validated against a per-pixel union-find on **60 random masks, 0 mismatches** — a random
> sweep rather than one hand case, deliberately, because ledger row 38 is a cross-validation that
> agreed because two errors cancelled. Independently, this lane: a synthetic 5 %-of-frame patch in
> band returns **5.00 %**, the same patch at `G = 250` returns **0.00 %**
> (`tools/out/criteria-r10/envelope/env.py`).

> ### THE CLAUSE THAT IS LOAD-BEARING: THIS IS AN ENVELOPE **UNDER `r9`**, AND `r9` IS NOT A FIREBALL MASK
>
> Ground truth exists on our side only (the authored palette). Recovery of our own fireball's
> opaque pixels:
>
> | | fireball opaque px | **`r9` recovers** |
> |---|---|---|
> | shipped, peak tick | 23 697 | **54.9 %** |
> | shipped, one phase later | 25 884 | **18.5 %** |
>
> **`r9` is the orange/amber BAND of a fireball, and that band's share of the sprite moves
> threefold across one event.** So `r100` and `life10` are partly measuring a **palette
> transition**, not a size change. The direction is the same on both sides — the arcade runs
> yellow → orange → red too — but **its recovery on the arcade cannot be measured, because there
> is no alpha channel there.** Every figure in this section is therefore *envelope-under-`r9`*,
> and the clause is cited in the same sentence, every time. **FIRE-MASK cannot be substituted**:
> on our harness it ranks the deliberately-wrong `puff` arm *above* the shipped one and puts the
> peak **one tick before the explosion exists** — it is reading clouds, the same failure as its
> 48 % on an arcade cloud frame.

### The arcade column (MEASURED R10 by this lane, independently reproducing R9's judge)

`.reference-cache/video/ab2-longplay-60fps.mp4`, consecutive `-vsync 0` decodes at **1028×720,
60 Hz**, stage digit **read in the frame** on every event — not inferred from the timestamp.

**FIVE EVENTS, ONE STAGE, AND THE SPREAD IS THE HEADLINE:**

| | A | B | C ᵗ | **D** | D, *raw mask* |
|---|---|---|---|---|---|
| `peak` % of frame | 0.83 | 1.82 | 2.60 | **4.32** | *6.03* |
| `w60` frames | 4 | 2 | 8 | **4** | *4* |
| `r100` | 0.036 | 0.137 | 0.699 ᵗ | **0.157** | *0.275* |
| ~~`life10` frames~~ | ~~8~~ | ~~12~~ | ~~18~~ | ~~21 / 14~~ | — |

> **THE `life10` ROW IS WITHDRAWN AS A MEASUREMENT (R10, ledger row 61), by the lane that produced
> it.** Every one of those tails runs past its event's **attribution horizon** — the lag beyond
> which "largest component" has silently re-targeted onto a different object. They are **upper
> bounds of unknown tightness.** See "The attribution horizon" below; the `peak`, `w60`, `n60`
> and `r100` rows are unaffected **except** that `r100` is itself outside the horizon on most
> events and is **not licensed** either.

ᵗ C runs into the next kill: its `life10` is a lower bound and its `r100` is two overlapping
kills, not an arcade upper bound. A–C: effects lane, `-ss 95.6` ×120. D: measured **twice
independently** — effects lane `-ss 98.5` ×120, this lane `-ss 96.0` ×300.

> ### THE 6.03 THAT THIS BOX PUBLISHED YESTERDAY IS A DIFFERENT OPERATOR, AND IT IS MINE
>
> **`peak 6.03 %` is the RAW MASK SHARE of the whole frame. The licensed operator reads 4.317 %
> on the same event.** I reproduced R9's 6.03 "to the digit" and concluded the operator was
> settled; what I had actually confirmed is that I was running **R9's operator, which has no
> component step.** Decomposed on my own 300 frames:
>
> > raw mask **6.028 %** → after persistence exclusion **5.969 %** → **largest component 4.317 %**
>
> **The persistence exclusion does almost nothing (442 px, 0.060 % of frame). The entire
> 6.03 → 4.32 difference is the LARGEST-COMPONENT step** — at its peak the arcade frame is
> **28 % other fire-coloured material** not connected to the main ball. Two decodes, two
> implementations: **4.317 vs 4.32.** `w60` **4 vs 4** and `r100` **0.157 vs 0.157**, exact.
> *This is ledger rows 14/22/27 again, committed by the lane that maintains the ledger, in a
> section written the same day, while quoting an exact reproduction as proof the operator was
> pinned. **An exact reproduction proves you ran THEIR operator. It says nothing about whether it
> is the licensed one.*** Ledger row 51.
>
> ### `life10` DOES NOT REPRODUCE, AND THE REASON IS A MISSING DEFINITION
>
> Same event, same mask, same exclusion, **same peak, same `w60`, same `r100` to three digits** —
> and **`life10` reads 21 frames here against the effects lane's 14.** I tested my own explanation
> and it failed: the per-run exclusion is **not** the mechanism (438–444 px excluded across four
> very different derivation windows, `life10` = 21 under all four). Window length is not it either
> — `life10` sits on a **stable plateau of 21 across windows from 25 to 50 frames**.
>
> **What is left is the event BOUNDARY, and the operator does not define one.** `life10` counts
> *total frames above 10 % of peak*, and 10 % of peak sits **inside the residual-debris floor**
> (the post-peak series runs 0.39–0.87 % against a 0.43 % threshold). **Where the event is
> declared to end therefore sets the number**, and two careful implementations put it in different
> places. Ledger row 52.
>
> ### ALIGNMENT — THE STANDING "`-ss` STARTS ~4 s EARLY" CAVEAT IS REFUTED FOR THIS FILE AND THIS FORM (R10, ledger row 57)
>
> CLAUDE.md has warned since before R1 that *"`-ss` **sequence** extraction on the AV1 60 fps file
> starts ~4 s early, so verify alignment before quoting timestamps."* **Three independent
> invocations this round say the input-seek form is exact, and one of them is anchored against a
> committed reference frame:**
>
> **FIVE invocations, three lanes, THREE SEEK POINTS SPANNING 76 s OF THE FILE:**
>
> | test | reference frame | result | implied t |
> |---|---|---|---|
> | feel lane, `-ss 98.5` f-0136 | `stage1-missile-salvo-t100.75.png` (native) | **mean \|Δ\| = 0.0000, pixel-exact** | 100.750 |
> | **this lane, `-ss 96.0` f0286** | the same frame | **0.0000**, neighbours **21.3 / 23.5** | 100.750 |
> | effects lane, `-ss 99.0 -i F` vs `-ss 95.0 -i F -ss 4.0` | — | **12 byte-identical frames** | — |
> | feel lane, **`-ss 174.0`** f-0061 | `stage3-night-level-t175.png` (686×480) | **1.796**, separation 2.7–3.3× | **175.000** |
> | **this lane, `-ss 174.0` f0061** | the same frame | **1.796**, separation **2.8× / 3.1×** | **175.000, residual +0.000 s** |
> | feel lane, `-ss 174.0` f-0721 | `stage3-night-lockon-t186.png` (686×480) | **2.034**, separation 3.3× | **186.000** |
>
> **`t = T_ss + (i − 1)/60` is therefore exact for `ffmpeg -ss T -i FILE … -vsync 0` on
> `ab2-longplay-60fps.mp4`.** The last three rows are what close it: the first three all sit within
> 3 s of one another and could not rule out a seek that drifts elsewhere in the file. **The caveat
> should name the form it applies to or be retired**; as written it **costs precision**.
>
> **THE VERIFICATION RECIPE, now that it is known to be cheap — use it instead of hedging.**
> Decode the window, then compare the frame at the predicted index against a **committed reference
> PNG** by mean absolute pixel difference.
>
> - **At matched resolution a correct anchor is a ZERO WITH LARGE NEIGHBOURS** — 0.0000 against
>   21.3 and 23.5.
> - **Against a resampled reference a zero is impossible, so the test is a SHARP MINIMUM** —
>   1.796 against 4.9 and 5.6, i.e. ~3×. *Resolution mismatch does not stop you anchoring; it only
>   changes which signature you look for.*
> - **A PLATEAU of small values at either resolution means you matched a static scene and proved
>   nothing.** That is the failure this recipe exists to catch.
>
> **This is a positive control for a seek and it takes one minute.**
>
> **What does NOT change: stage identity is still read from the HUD digit, never inferred from a
> timestamp.** An exact seek tells you which frame you got, not which stage it is.

### THE SMOKE — ONE ROW FILLED, AND IT IS **PEACH**, NOT GREY (MEASURED R10)

R9 refused a number here because the plume could not be segmented past the clouds. **The effects
lane did not beat that mask — it sidestepped it, which is the better move: a kill that detonates
over OPEN SEA with no cloud anywhere in the frame.** `tools/out/envelope-r10/arc-expl-99-opensea.png`,
eighteen consecutive 2-frame-stepped panels, the peach mass growing out of the dark-red ball
against flat `#009fff`. **Crop it and look before quoting any of this.**

`arc-expl-99` f0055, largest component of `V > 0.70 ∧ R > B + 0.04 ∧ S < 0.45`, **n = 53 282 px,
60 Hz, stage digit 1, n = 1 event**:

| | |
|---|---|
| mean RGB | **(236, 188, 162)**, V 0.925, S 0.312, dominant **`#f4c8b3`** |
| V-ordered | p5 `#cd907f` · p20 `#e1b5a0` · p40 `#ecb589` · p60 `#f3c7b2` · p80 `#f8be95` · p95 `#ffc6a3` |
| peak share of frame | **7.20 %** (n = 1) |
| persistence | **≥ 0.8 s, BY EYE** — no upper bound obtainable |

> **This settles a standing argument in `explosions.js` and BOTH halves of it survive.** That file
> has argued since R7 that the one daylight arcade explosion in the repo has **no grey anywhere**,
> and that authoring grey smoke from `death-starburst-gp-t202.png` — a **night** stage — would be
> ledger row 12's defect. **Correct on both counts. The residue is real, and it is peach.**

**WHAT STAYS OPEN, AND R9'S REFUSAL STILL HOLDS FOR IT**: the smoke's **decay envelope** and its
**size distribution**. One event is not a distribution — and the moment the plume drifts near a
cloud bank the mask's largest component **flips between them: 17.35 % in one frame and 0.09 % in
the next**, which is physically impossible for smoke and is the mask failing, not the smoke
moving. The blind spot was sidestepped once, not beaten.

**And *"ours leaves no smoke"* is now FALSE and was measured at 60 Hz either way** — ours leaves
3 peach puffs, **1.067 s at ≥ 10 % of peak, peak 5.78 % of frame**, by **exact palette match** over
110 consecutive ticks. **That operator is exact on our side and does not exist on the arcade's, so
5.78 vs 7.20 is two different operators and is not a comparison.** The effects lane deliberately
under-shot the arcade's single observation rather than extrapolate from it; that is the right call
and the gap must not be "closed".

### THE KNOWN-QUALITY TRIPLE — AND `w60`, THE STATISTIC THIS SECTION WAS BUILT ON, FAILS IT

**The rule published at the top of this document was applied to this section within a day of being
written, by another lane, and it refuted the headline figure.** Three arms, **matched harness,
matched depth, matched seed**, one constant set changed at a time in `explosions.js`, the file
restored from an in-memory copy in a `finally` and verified byte-identical by md5. **The quality
ordering was settled by looking at the crops, which is what keeps it non-circular.**

| arm | `peak` % | `t_rise` | `w60` | `n60` | `r100` | **`life10`** |
|---|---|---|---|---|---|---|
| `plateau` — the committed R9 behaviour, **worst** | 1.445 | 0.533 | **6** | **8** | 0.144 | **40 f** |
| `puff` — shipped timing, no residue, 3.3× too small — *the "third wrong answer"* | 0.618 | 0.083 | 8 | 8 | 0.124 | 15 f |
| `shipped` — **best** | 2.016 | 0.083 | 8 | 8 | 0.107 | **9 f** |

> **`w60` AND `n60` RANK THE PLATEAU ABOVE THE FLASH — 6/8 against 8/8.** Both are normalised by
> peak, and our sprite **boils**, so the 60 %-of-peak run is *short* on a mass that sits on screen
> for two thirds of a second. **This is control 7's lesson arriving on a second criterion: the
> statistic that reads most naturally as the defect is nearly blind to it** — and here it is worse
> than blind, it is inverted, exactly as RP90 was on an unlicensed comparison.
>
> **`w60` AND `n60` ARE RETIRED AS GATE CANDIDATES AND DEMOTED TO REPORTED DIAGNOSTICS.** The
> arcade's 0.067 s stands as a licensed arcade *fact*; what it may not be is the number a lane is
> scored against. Ledger row 53.
>
> **And the "both axes" warning is confirmed by the same table**: `puff` and `shipped` are
> **identical on `t_rise`, `w60` and `n60` and differ by 0.017 on `r100`**, while `puff`'s fireball
> is **3.3× smaller in area**. *No time statistic separates them.* A duration gate alone licenses
> the third wrong answer.

### THE GATE — STILL OPEN, AND THE REASON HAS CHANGED

`life10` ranked the triple correctly (40 / 15 / 9) and the effects lane proposes it as the gate at
**8–18 frames**. **This lane declines to license it yet, on three measured grounds**, and none of
them is a doubt about that lane's work:

1. **It does not reproduce across implementations** — 21 vs 14 on one event, for a missing
   event-boundary definition (ledger row 52). **The proposed band is 8–18 frames and the
   reproduction gap on a single event is 7.** *A gate narrower than its own reproduction error is
   not a gate.*
2. **It does not reproduce across populations on our own side either** — the effects lane's own
   harness reads 9 and its in-situ reading 15, because the largest component merges with a
   neighbouring enemy's nozzle once the fireball shrinks.
3. **It is the statistic most exposed to the `r9` recovery problem**, because the 10 % threshold
   sits where the orange band has largely transitioned away (54.9 % → 18.5 % recovery across one
   event).

> ~~**`r100` IS THE BETTER CANDIDATE**~~ — **PRE-REGISTERED AND WITHDRAWN THE SAME DAY, AND BOTH
> of the grounds it was registered on turned out to be the defect.** Ledger row 60.
>
> ### THE CAUSE IS NOT THE EVENT BOUNDARY. IT IS ATTRIBUTION — "LARGEST COMPONENT" IS A SELECTION, AND IT SILENTLY RE-TARGETS
>
> `life10`'s 21-vs-14 was diagnosed as a missing event-boundary definition (row 52). **That was
> wrong, and the debounce rule this document asked for does not converge**: ending the event after
> `K` consecutive sub-threshold frames gives `life10` = **14, 14, 26, 26, 84, 84, 84, 84** for
> K = 1…8. *It parameterises the disagreement instead of removing it* — two readers differ becomes
> two readers pick different K.
>
> **What is actually happening, verified independently on this lane's own decode of arcade D:**
>
> | lag | area % | centroid jump | centroid (x, y) |
> |---|---|---|---|
> | **0 — peak** | 4.317 | — | **(141, 227)** |
> | +1 | 0.874 | **9.1 %W** | (99, 143) |
> | +5 | 0.485 | **51.2 %W** | **(484, 456)** |
> | **+6 — where `r100` is read** | 0.677 | 1.6 %W | **(471, 465)** |
>
> **At the lag `r100` is read from, the "fireball" is an object 39.6 %W away from the peak
> fireball, in the opposite corner of the frame. It is a different kill.** The arcade's
> `r100 = 0.157` is not a decay ratio; it is one object's area over another object's area.
>
> **`r100` IS THEREFORE NOT LICENSED, AND MY TWO GROUNDS FOR PREFERRING IT WERE THE DEFECT:**
>
> 1. *"reproduced to three digits across two implementations and two decodes"* — **shared-defect
>    agreement. This is ledger row 51 one level down, committed in the repair for it.** Both
>    implementations run the same largest-component selection, so both re-target in the same frame
>    onto the same wrong object and agree exactly. Row 38's cancelling errors, except these do not
>    cancel — **they are identical.**
> 2. *"a single named lag, so no event boundary to inherit"* — **true, and insufficient:
>    boundary-free is not attribution-free.** `judging/R10/envelope_r10.py --selftest` control 6
>    (a real event plus a decoy overlapping it **with no gap** — an earlier version left one and
>    passed vacuously) prescribes the truth in closed form: **untracked `r100` reads 0.836 where
>    the truth is 0.068**, and untracked `life10` reads 13 where the truth is 7. Run it.
>
> ### THE ATTRIBUTION HORIZON — a detector, not a tracker (licensed R10 as a PRECONDITION)
>
> > **Walking forward from the peak, the first lag at which the largest component's centroid jumps
> > further than `T` of frame width between consecutive frames. ANY STATISTIC EVALUATED BEYOND THE
> > HORIZON IS UNLICENSED** — it is read off whatever object happened to be largest.
>
> **IT NEEDS TWO CONDITIONS, NOT ONE, AND THE SECOND WAS FOUND BY A CROP.** Read the box below the
> table before using it.
>
> | horizon, frames after peak | A | B | C | D | f069 | **OURS, in-situ** |
> |---|---|---|---|---|---|---|
> | T = 5 %W | 3 | 2 | 1 | 1 | 1 | **10** |
> | **T = 8 %W** | **3** | **4** | **7** | **1** | **7** | **10** |
> | T = 10 %W | 3 | 4 | 9 | 1 | 7 | 10 |
> | T = 15 %W | 3 | 4 | 9 | 1 | 7 | 10 |
> | T = 20 %W | 3 | 4 | 9 | 1 | 7 | 10 |
> | **size floor alone** | 3 | >40 | 25 | 1 | **7** | 10 |
>
> > **CORRECTED R10 (ledger row 63), by the lane that produced it: the our-side column was
> > published as ">9 / 10" and those are TWO POPULATIONS, not two readings of one.** Over the 30
> > frames before first light, the `?combatexpl=1` **harness carries ZERO competing components —
> > 0.000 % of frame** — while the `?demo=2` in-situ capture carries **16 per frame (max 19)**.
> > **The harness's ">9" is not a long horizon; it is an event ending before anything could
> > out-compete it, and it should never have stood in a column beside the arcade's.** Only the
> > in-situ **10** is comparable. *Row 21's class — a figure published without its population —
> > committed inside this box, which exists to enforce exactly that.*
> >
> > **The asymmetry conclusion survives and is weaker than first sold: arcade 1–9 against our 10,
> > one population against one — not a range against a range.**
>
> **The threshold has stopped being load-bearing** — every event is flat across **T = 0.08–0.20**,
> where the jump test alone wobbled 3 → 7 → >12. Only T = 0.05 trips early. Within-event jumps
> **0.0–3.2 %W**, breaks **9–52 %W**. *The detector still cannot separate a re-target from a
> genuine one-frame collapse* — D's +1 is a 9.1 %W jump with area at 0.20 of peak, and both
> explanations fit. **If you cannot tell, you cannot license the lag.**
>
> > #### A LONG HORIZON IS NOT EVIDENCE OF CLEAN ATTRIBUTION. IT IS ONLY THE ABSENCE OF AN ABRUPT BREAK (ledger row 62)
> >
> > **The first version of this table reported a 28-frame horizon on one arcade kill, and the
> > effects lane cropped it before believing it: from about lag 6 the selection is sitting on THE
> > PLAYER'S OWN AFTERBURNER NOZZLE DISCS.** They are orange, they are **in every frame of every
> > stage**, the persistence exclusion cannot remove them because it only removes what is
> > *stationary*, and **they move smoothly, so no jump ever fires.** f069's 28 is now **7**.
> >
> > **SECOND CONDITION — a SIZE FLOOR, derived per run like the exclusion.** `clutter` = the median
> > largest-component area over the frames **before first light**, i.e. the frame's own background
> > level of fire-coloured junk; once the component falls to **2 × clutter** it is indistinguishable
> > from the junk whether or not it jumped. **Horizon = the earlier of the two conditions.**
> > *The clutter window must stop at first light, not at the peak* — measured from the peak it
> > swallows the event's own rise and puts the floor **above** the peak, cutting the licence at
> > lag 1 on both control arms. **Found by the control, which is what controls are for.**
> >
> > **THE COMPETITOR SET HAS AT LEAST TWO CLASSES, and this lane confirmed it by cropping lag 11
> > of arcade D on its own decode** (`tools/out/criteria-r10/envelope/lag11-what-is-it.png`):
> >
> > | class | behaviour | caught by |
> > |---|---|---|
> > | **another kill's fireball** — what lag 11 of event D actually is: a **7 778 px** mass directly beneath the player | appears abruptly, elsewhere | the **jump** test |
> > | **the player's own nozzle discs** — plainly visible in the same crop, orange, in every frame of every stage | **moves smoothly with the jet** | **only the size floor** |
> >
> > **The second class is the dangerous one and it is invisible to the test built first. A detector
> > carrying only the jump condition reports its longest, most confident horizons exactly where it
> > is most wrong.**
> >
> > **CONTROL 8b exists because of that crop**: a small object starting at the event's own location
> > and drifting 1.5 px/frame — max jump **0.47 %W**, below every threshold, **caught by the size
> > floor at the prescribed lag.** The smooth hand-off in synthetic form. *The arm that nearly
> > shipped without it is the one where the detector reports a long horizon and is wrong.*
> > `judging/R10/envelope_r10.py --selftest`, **30 checks, PASS**, reproduced by this lane.
> >
> > **The horizon is FOLDED INTO `envelope_r10.py` (`--horizon`), not shipped beside it**, and it
> > prints the lag profile in the same block as the horizon so the two cannot be quoted apart.
> > *A second operator under a second name is what this round spent itself removing.*
>
> > #### THERE IS NO CLEAN-ATTRIBUTION ARCADE KILL TO BE FOUND BY CHOOSING THE SCENE
> >
> > The open-sea trick that rescued the smoke row **does not transfer, and the reason is
> > structural**: a kill over clean sea removes the **clouds**; nothing removes **the player's own
> > jet**, which is in every frame of every stage and carries two lit orange nozzles. **All 14
> > candidate kills across both decoded windows were scanned; the three with long horizons were
> > all the detector on the nozzles.** Recorded so the next lane does not spend an afternoon on it.
> >
> > **For tracker #4, a cheap pre-step that belongs WITH it rather than instead of it**: the
> > nozzles are *findable* — a fixed-size pair on the player sprite, whose screen position the HUD
> > and the jet already give us. **Masking the player's own airframe before the envelope operator
> > runs would remove the single worst competing object on our side and the arcade's alike.**
> >
> > **AND THAT IS NOW MEASURED ON BOTH SIDES RATHER THAN ASSUMED (R10).** The same crop taken on
> > our own pre-event frames (`tools/out/envelope-r10/ours-competitor-set.png`, every component
> > painted — **cropped and looked at by this lane**) returns fifteen components whose two largest
> > are, by a factor of four:
> >
> > | px | what |
> > |---|---|
> > | **459** | **the player's own LEFT nozzle disc** |
> > | **441** | **the player's own RIGHT nozzle disc** |
> > | 117, 117, 99, 72, 63, 63 | the vulcan column climbing from the nose |
> > | 63, 54, 45, 45 | enemy shots |
> >
> > **So the persistent class is not an arcade artefact.** Same object, same mechanism, **largest
> > competitor on both sides** — the only difference is that the arcade's frames add the transient
> > class and ours mostly do not. **This upgrades airframe masking from an arcade-side convenience
> > to the one fix that moves both sides, and it makes it testable before it is trusted: our own
> > airframe has ground truth, so the pre-step can be validated on our side first.**
> >
> > **AND THE POST-MASK FLOOR IS NOW CHARACTERISED ON OUR SIDE (R10), which is what makes the
> > pre-step safe to schedule rather than merely desirable.** Competitor size by rank, **60
> > pre-event in-situ frames, no explosion present**, existing operator, no new instrument
> > (`tools/out/envelope-r10/ours-final-insitu/`):
> >
> > | rank | median | p10 | p90 | what |
> > |---|---|---|---|---|
> > | 1 | **324 px** (0.050 %) | 125 | 614 | **nozzle disc** |
> > | 2 | 148 px (0.023 %) | 108 | 334 | **nozzle disc** |
> > | 3 | **108 px** (0.017 %) | 90 | 189 | vulcan column |
> > | 4 | 94 px (0.015 %) | 72 | 117 | vulcan / enemy shots |
> >
> > > **Floor today = 2 × rank 1 = 648 px (0.100 % of frame). Floor with the airframe masked =
> > > 2 × rank 3 = 216 px (0.033 %). A 3.0× drop** — so masking the nozzles *without* re-deriving
> > > the floor would silently **lengthen every licensed lag**, by however long our fire takes to
> > > decay through that band. **The two must land together.**
> >
> > **AND THE CLIFF IS THE GOOD NEWS, which inverts the limit below.** The floor is hostage to its
> > top competitor only while a **dominant** one exists: the nozzles are 2–3× the next object,
> > and **below them the distribution is flat** (108 vs 94, with overlapping p10–p90 bands). **So
> > after masking, the floor is set by a POPULATION rather than by a single object — which is
> > exactly the condition under which a max stops being fragile.** The pre-step does not only
> > lengthen the horizon; **it makes the floor robust in the way the limit below says it currently
> > is not.**
> >
> > *Arcade side uncharacterised and not closable — no alpha, and its rank-3 object is whatever
> > its frames happen to hold. The ordering already in the acquisition item covers it: validate on
> > our side where there is ground truth, then apply.* **Figures are the effects lane's; this lane
> > did not re-derive them, and the captures are on disk for whoever wants to.**
> >
> > **A LIMIT OF THE SIZE FLOOR, reported by its author after a worry the measurement killed.**
> > The effects lane expected its own `FRAC_FAR` change — making each enemy shot ~5.6× larger in
> > area, in a colour inside the `r9` mask — to have raised our clutter floor and shortened our
> > own horizon, i.e. a build change silently invalidating a published figure. **Not confirmed:
> > the floor is set by the LARGEST competitor (a 459 px nozzle) and the largest shot is 143 px.**
> > The general form, which is the part to carry: **the floor is a MAX, not a SUM — insensitive to
> > everything smaller than the biggest competitor, and therefore entirely HOSTAGE to that one
> > object.** Remove the nozzles and the floor is set by whatever is next, which nobody has
> > characterised.
>
> **AND THE HORIZON IS A PROPERTY OF THE *CAPTURE* — not of the build and not of the operator
> (added R10, and it closes a hole the precondition shipped with).** *It must be measured in the
> same capture as the figure it licenses; a harness horizon and an in-situ horizon are not
> interchangeable readings of one quantity.* The precondition said "publish the lag and the
> horizon" without saying where the horizon had to come from, and **row 63 is what that hole
> produced within a day** — a zero-competitor harness reading standing in a column beside the
> arcade's crowded frames. **The horizon measures how much OTHER FIRE there is in your frames,
> which is a property of the scene you captured.**
>
> **BINDING PRECONDITION, and this lane would rather have it than a gate: every envelope figure
> publishes the LAG it was taken at and that event's ATTRIBUTION HORIZON, and a figure beyond the
> horizon is not published.** Mechanical to check, and **it would have caught both `life10`
> readings and the `r100` pre-registration.**
>
> ### THE IRONY, AND IT IS STRUCTURAL RATHER THAN AN ARTEFACT OF THIS OPERATOR
>
> `w60` and `n60` are confined to frames at **≥60 % of peak**, where the component is near-peak
> sized and dominant **by construction** — so they fall **inside the attribution horizon on all
> four arcade events.**
>
> > **The statistics the known-quality triple refuted as RANKERS are the only ones that are
> > ATTRIBUTABLE. The statistics that rank are the ones that are not.**
>
> **This is not bad luck. A statistic that discriminates a DECAY must read the DECAYED state, and
> the decayed state is by definition the one in which the subject is no longer the largest thing
> in the frame.** Discriminating power and attributability are in direct tension, and **no
> threshold can resolve it — only identity can.** That is why the fix is a tracker and not a
> better cut-off.
>
> ### AND NO LAG STATISTIC IS SYMMETRIC BETWEEN THE SIDES BY DEFAULT
>
> **Our horizon is +10 to >12; the arcade's is +1 to +9.** Not because our operator is better —
> **because our frames contain far fewer competing fire-coloured objects than the arcade's do.**
> It is a **population** difference, not an instrument one. **A lag that is valid on our side can
> be invalid on the arcade's**, which is the reverse of this project's usual asymmetry worry and
> is invisible to every control that runs on one side only.
>
> ### WHAT IS LICENSED, AND WHAT IS WITHDRAWN
>
> - **Nothing is gateable today.** `w60`/`n60` are attributable but do not rank; `r100`/`life10`
>   rank but are not attributable. **Both halves are now measured facts rather than caution.**
> - **Licensed as reported facts** (inside every horizon): `peak`, the peak frame, `t_rise`,
>   `w60`, `n60`, and `r033` (+2) **flagged per event** — inside on A and B, outside on C and D
>   at T = 5 %W.
> - **WITHDRAWN: the arcade `life10` column (8 / 12 / 18 / 14) as a measurement**, by the lane
>   that produced it. Every one of those tails runs past its event's horizon. **Downgraded to an
>   upper bound of unknown tightness; do not quote the four numbers as measured.**
> - **The duration family returns when someone builds a TRACKER and validates it against a
>   known-quality pair of its own.** Two designs were built and failed in one afternoon —
>   nearest-component **punches holes** (a 39 px fragment chosen over the 9 169 px mass beside it)
>   and largest-within-radius **walks** (at `track_frac` 0.12 two different arcade events return
>   byte-identical statistics, one anchor having migrated into the other's event). **Both were
>   found by cropping, not by the numbers** — the hole-punched series looked like a plausible boil
>   artefact. **The build change does not rest on any of this**: it rests on the crops and on
>   `w60`/`n60`.

### PEAK IS OPEN, AND THIS DOCUMENT'S OWN "OURS PEAKS 40 % SMALLER" IS WITHDRAWN

> **The arcade's own peak spans 0.83 – 6.03 % across five events in ONE STAGE — a factor of 7.3 —
> because peak scales with the killed target's depth.** The withdrawn sentence compared ours
> against **the maximum of five**, and it was in the same box as a rule requiring every figure to
> state its population. Ledger row 54, class 2, and it is **this lane's own**.

The depth-matched ratio that would remove the confound (fireball peak ÷ the killed aircraft's
screen area) **was attempted on the arcade side and failed**: the stage-1 kills that can be decoded
detonate at or behind the player, where the target is not separable in the frames before first
light — `tools/out/envelope-r10/arc-eventA-target.png`, eighteen consecutive 2× frames, in which
what is visible is the player's own nozzles. **That is the measurement a peak clause needs and
nobody has it.** Do not gate peak; do not quote a peak ratio.

**And the direction is NOT "make the fireball shorter".** At **matched depth** the shipped envelope
peaks **2.016 % against the plateau's 1.445 % — 39 % HIGHER**: shorter *and* bigger, which is what
a flash is. **The 3.33 % → 2.04 % before/after pair must NOT be read as a peak comparison** — it is
two different kills at two different depths on **two different trees**, and it is excluded from
this box for that reason.

### Our column

| | arcade (licensed operator) | **ours, shipped** |
|---|---|---|
| `peak` | 0.83–4.32 % over 4 events, **OPEN** | 2.016 % |
| `t_rise` | — | 0.083 s |
| `w60` / `n60` | 4 / 4 (event D) | 8 / 8 |
| `r100` | **0.157** | **0.107** |
| `life10` | 21 or 14 — **does not reproduce** | 9 f (harness) / 15 f (in-situ) |

**Ours: effects lane, 60 Hz, `?fixed=1&seed=1&combatexpl=1`, isolation harness
`tools/out/envelope-r10/ours-r10c-harness/`, measured on the WORKING TREE at `7265ba3` with a
second lane live in `src/` — re-measure at the commit.** Quote the harness, not the in-situ run.
The R9 `bd73b52` plateau reading (peak 3.69 %, 0.600 s, `r100` 0.85) is superseded as a *current*
description of the build and retained only as the "before" arm.

### THE SECOND TEMPORAL SHAPE — a RATE HAS NO SHAPE (R10, from R9 §2.3)

ARCADE-PACING gates kills per second. The arcade's kills, dated off the HIT digit between
**consecutive** frames at 60 Hz (validated by cropping the digit at every detected change and
reading it: 0→1→2→3→4→5, no false positives):

> **t = 96.333, 99.433, 100.267, 100.500, 100.633 — a 3.100 s drought, then three kills in
> 0.367 s inside one salvo.** The instantaneous rate inside the salvo is **~8 kills/s, twenty
> times the 0.42–0.54/s average ARCADE-PACING quotes.** Ours delivers **0.519 kills/s smoothly**,
> and the criterion cannot tell the difference.

**This is the emptiness lesson one level down, and it needs the same repair.** ARCADE-PACING
already learned that *a percentage cannot tell a sky that empties once for eight seconds from one
that flickers two hundred times*, and ships run-length beside its percentage. **A kill RATE needs
a BURST statistic beside its mean** — inter-kill gap distribution, or longest drought and tightest
triple. **No threshold is published**, for the same reason as above: the arcade sample is **one
salvo on one stage**, n = 5 kills, and a burst statistic from n = 5 is a single observation.
**Acquisition item: the inter-kill gap distribution over several STAGE_MAP-keyed spans at 60 Hz.**

### THE MISSILE — UNMEASURED BY ANYONE, AT ANY RATE (R10)

`HOMING_GAIN = 1.7` (`src/weapons/missiles.js`) is **the constant that decides how hard a
heat-seeking missile turns** — the thing the owner named twice — and it carries **no tag, no
comment and no reference**, in a file where every other constant carries MEASURED or ADOPTED.
Nothing in this document, GAME_SPEC or any judge report constrains it. **The launch→impact band
it works inside is ledger row 49**: a 4 Hz reading of a sub-second event, on a frame row 37
retired, with a true support of **0.25–1.25 s**.

> **The bound, stated rather than filled.** At 60 Hz every arcade *kill* can be dated to ±1/60 s,
> but a kill cannot be attributed to a launch: the player's missiles fly away from the camera and
> are lost in the launch billow within a few frames, and the billow is indistinguishable from the
> previous kill's smoke at 686×480 or 1028×720. **So the arcade's launch→impact time, turn rate
> and seeker behaviour are UNMEASURED, and our two constants for them are a 4 Hz inference and an
> untagged number.** Highest acquisition item on the board: a 60 fps decode that follows **single**
> arcade missiles from launch flare to detonation. **Until it exists nobody can tune the missile** —
> and a lane that tunes it anyway is tuning to nothing, which is what row 49 records.

### What TIME-ENVELOPE cannot see, and the rate rule that binds everything above

1. **Sampling rate is the whole measurement.** Every figure in this section is **60 Hz**, both
   sides, and it says so because field 6 now requires it. A 0.067 s event is **invisible** at
   4 Hz — which is the default of this repo's own motion tool (ledger row 48).
2. **It is blind to WHAT the event looks like.** An envelope-correct fireball in the wrong colours
   scores identically. **This is an ADDITION to the gate set**: FIRE-MASK, the decile ladder and
   the core/saturation targets must keep passing beside it.
3. **IT IS NEARLY BLIND TO SIZE, WHICH IS HALF THE DEFECT.** `puff` and `shipped` are identical on
   `t_rise`, `w60` and `n60` and differ by 0.017 on `r100`, while `puff`'s fireball is **3.3×
   smaller in area**. **A duration gate alone licenses the third wrong answer**, and peak — the
   statistic that would catch it — is OPEN because the arcade's own peak varies 7.3× with depth.
   *This is the section's largest hole and it is not closable without the depth-matched ratio
   nobody has.*
4. **Every statistic here is normalised by PEAK, so every one of them inherits peak's problems** —
   including the boil that inverted `w60`. A peak-normalised statistic on a flickering subject is
   measuring the flicker.
5. **`w60` and `n60` are diagnostics, not gates** (ledger row 53), **`life10` does not reproduce**
   (row 52), and **both must be published rather than either alone.**
6. **It is an envelope UNDER `r9`, and `r9` recovers 54.9 % of our own fireball at peak and 18.5 %
   one phase later.** Part of what is being measured is a palette transition. The arcade side's
   recovery **cannot be measured at all** — no alpha channel.
7. **n = 4 usable events on the arcade side of the explosion, n = 5 kills on the burst side, n = 1
   on the smoke.** None supports a threshold. **They support an operator and a direction**, which
   is what they are published as.
8. **A negative about a transient is worth nothing without its rate** — see field 6's corollary.
9. **The subject has its own rate.** The arcade's explosion **sprite animates at 30 Hz inside
   60 Hz logic** — the mask-area series alternates in 2-frame pairs over a ground that changes
   every frame. **Sampling at 60 Hz does not mean the subject is a 60 Hz subject**, and a
   statistic that straddles the 2-frame pairs will read the animation, not the event.

## Criterion A — colour cardinality

**GATE (all three, per frame, at true native 320×224):**
1. **≤ 256 unique RGB colours** per frame.
2. **≤ 32 distinct channel values, counted as the UNION over R, G and B** — i.e. how many
   rungs of the hardware ladder the frame uses. This is the robust form of "on the Sega
   ladder" and is the one to enforce automatically (see the ladder caveat below).
3. **Per-sprite**, counted over the sprite's own pixels with background excluded:
   **≤ 8 colours cover 95 % of the sprite** (`n95`), and the **total** is bounded per
   **variant** by the table below; **≤ 16 for an explosion or effect sprite.**
   (**RE-LICENSED R7, ledger row 25** — the old flat "≤ 8 colours for an aircraft" **fails
   the arcade's own daylight aircraft**, which carries 13.)

> ### A3 was derived from the NIGHT jet and applied to every aircraft (REPAIRED R7, ledger row 25)
>
> "Aircraft and clouds sit at 5–8" was read off the **night** player jet (exactly 8) and the
> cloud puff (5). **The very next row of this document's own per-sprite table records the
> daylight jet at 14 total / 7 at 95 %** — so the bound contradicted a measurement sitting
> three lines away from it, and a lane drawing a correct daylight sprite would have failed it.
> Same shape as ledger rows 11 and 12 (a figure measured on one variant, applied to another),
> one axis along: **variant, not stage.**
>
> **Measured, and reproduced by this lane on the native frame.** Airframe = `S < 0.35` +
> largest 8-connected component on `ab2-arcade-desert.png` x[85,182) y[82,140), **751 px,
> stage digit 2**; rim = the 445 pixels 4-adjacent to that mask and outside it:
>
> | arcade sprite | variant | total colours | **n95** |
> |---|---|---|---|
> | player jet, `ab2-arcade-night-banking.png` | **night** | **8** | ≤8 |
> | player jet, `ab2-arcade-desert.png` | **daylight** | **13** — 9 airframe tones + the `#840000` rim (49.4 % of the rim) + 3 nozzle glows (`#e67300`, `#f78400`, `#f7b500`); **14** under the box reading already in the table below | **6** (7 under the box reading) |
> | cloud puff, `ab2-arcade-desert.png` | stage-2 daylight | **5** | ≤5 |
> | **enemy aircraft** | — | **UNMEASURED** on any isolated arcade sprite. Do not gate a redraw on a number this document does not have | — |
>
> | our sheet | total | **n95** | verdict |
> |---|---|---|---|
> | `player-f14.png` (day) | 10 | **7** | ✓ under both the variant total (13) and n95 (8) |
> | `player-f14-night.png` | 9 | **6** | ✓ |
> | `player-f14-roll.png` | 11 | **9** | **✗ on n95, and FLAGGED rather than waived — see below** |
>
> **Why n95 is the gate and the total is a licensed fact.** The total is what the lane in
> front of you can trivially satisfy by deleting a rung that was doing work; `n95` is what
> actually separates palette art from continuous tone, and it holds at ≤8 on **both** arcade
> variants and on both of our shipped sheets. Moving the gate onto `n95` is therefore not a
> loosening — the arcade passes it on the frame the old bound failed it on.
>
> **The roll sheet is over the bound and its arcade side is UNATTRIBUTED.** It is the one
> sheet that must carry two surface families at once (the ventral grey ramp *and* the measured
> dorsal blues), and GAME_SPEC §1 records that the arcade's barrel roll does show a belly
> palette — so two families is plausibly correct. **But we hold no isolated arcade roll sprite
> and cannot get one**: the only barrel-roll reference is `stage4-barrel-roll-t222.png`, a
> 1028×720 **video** upscale, and video is useless for cardinality. So: **n95 9 recorded as a
> known exception with no arcade target, on an unwired sheet.** Do not tune it to 8 to make the
> gate green; an arcade roll-sprite census is an acquisition item, not a measurement anyone can
> run today.
>
> **One population note, so the next reader does not call it a contradiction.** The `PLAYER`
> comment in `tools/art/palettes.js` cites **n = 672** for this crop with `#ffffef` at 35.6 %
> and `#f7e6b5` at 26.5 %. Adding the **largest-component step** to the bare `S < 0.35` filter
> — which drops a few stray desert pixels — gives **n = 751** and **31.8 % / 23.7 %**. Same
> frame, same box, same S gate; the isolation step is the entire difference, and this lane
> reproduces the 751 px figures exactly. Quote the 751 px column and name the isolation.

> **A2 names ONE statistic and the project has been quoting two (REPAIRED R6, ledger row 14).**
> "Distinct values **per channel**" reads as *max over the three channels*. It is not what the
> published numbers are. On `ab2-arcade-desert.png` the per-channel counts are **25 / 29 / 26**
> → max **29**, while their **union is 31** — and 31 is the published figure, and 31 is the
> length of the enumerated ladder below. The night frame gives **17 both ways**, which is why
> the ambiguity survived a round. The R5 judge's our-side column (stage 2 **118**, stage 3
> **245**) is the *per-channel* reading, so that table compared a union against a per-channel
> max. **Enforce the union; report both** (`tools/criteria_lane_ab_control.py` prints `chanU`
> and `chanP`). No pass/fail verdict on either side changes — every figure in play is either ≤31 or
> ≥118 — but a reviewer re-deriving 29 from the ladder table and concluding the doc is wrong is
> exactly the kind of hour this project keeps spending.

**Measured, true-native arcade frames** (the only two true 320×224 PNGs we hold — every
other arcade reference is a video upscale and is useless for this). **Stage read off the HUD
digit in each frame, not assumed** (see the stage-attribution rule below):

| frame | stage (HUD digit) | unique colours | channel values (union / per-channel max) | colours covering 90% |
|---|---|---|---|---|
| `ab2-arcade-desert.png` | **2** | **138** | **31** / 29 | **31** |
| `ab2-arcade-night-banking.png` | **3** (GAME_SPEC.md's colour caveat already attributes both native frames; this document did not) | **79** | **17** / 17 (every other ladder step — the 4-bit subset) | **8** |
| ours, `tools/out/art-critic/combat/frame-0002.png` | 1 | **14 508** | **254** / — | **7 340** |

**`ab2-arcade-desert.png` is a STAGE 2 frame.** Read at 3× from its own bottom HUD strip:
`SPEED M` on a white plate, `STAGE`, digit **2**. It has been cited across this document as
"the daylight arcade frame" and twice as "stage 1". For Criteria A and B that is harmless and
the licence is still **all stages** — these two describe the *medium* (how many colours the
hardware can put on screen, and whether neighbouring pixels repeat), and the medium does not
change between stages; the night frame at 79/17 and the desert frame at 138/31 bracket it from
both ends. **For any palette or value criterion it is not harmless, and ledger rows 11 and 12
are what it cost.**

We use 7 340 colours to cover 90% of a frame where the arcade uses 31. Every other
art-critic capture agrees: 14 302–15 206 colours, 253–256 channel values. (The one outlier,
`death4` at 692 colours, is a screen-filling fireball — see the representative-frame rule
under Criterion B.) Reproduces the art critic's three figures exactly.

**The ladder, enumerated — and the trap in generating it by formula.** The 31 channel
values present in `ab2-arcade-desert.png`, which are the ladder:

```
0  16  25  33  41  49  58  66  74  82  91  99 107 115 123 132
140 148 156 164 173 181 189 197 206 214 222 230 239 247 255
```

`ab2-arcade-night-banking.png` uses a 17-value subset of exactly these. **This ladder is NOT
a uniform ramp and you cannot generate it with the obvious quantizer.** `round(k·255/31)`
for k=0..31 agrees everywhere except two entries — it yields **90 where the arcade has 91**
and **165 where the arcade has 164** — and it emits **8**, which appears in neither native
frame. Bit-replication `(k<<3)|(k>>2)` is worse (24 where the arcade has 25). The spacing is
irregular because the hardware drives the channel through a resistor ladder, not a linear
DAC. **So: snap to the enumerated table above, not to a formula.** And because a ±1 level
difference is visually nil, do **not** enforce exact set membership as the automated gate —
enforce "≤32 distinct values per channel", and treat the table as the palette to author
against.

**Per-sprite evidence** (isolated sprite pixels, background excluded — this is the part the
art critique asserted without showing, so I measured it):

| arcade sprite | source | stage | licensed for | unique colours |
|---|---|---|---|---|
| player jet, night | `ab2-arcade-night-banking.png` x[108,225] y[92,142] | **3** | cardinality: all; **palette: night stages only** | **8** — six blue-greys `#c5d6f7 #a4b5e6 #8494c5 #7384b5 #6373a4 #425284` plus two canopy magentas `#c594f7 #a400d6` |
| player jet, daylight | `ab2-arcade-desert.png` x[85,182] y[82,140] | **2** | cardinality: all; **palette: daylight stages** (corroborated white on stage 1 — see "Player jet — airframe value") | 14 total, **7 cover 95%** (`#ffffef #a48484 #d6d6a4 #ceb59c #ffffff #948463 #e694f7`) |
| cloud puff | `ab2-arcade-desert.png` x[195,320] y[90,150] | **2** | cardinality: all; **palette: stage 2** (stage-1 cloud palette is measured separately) | **5** (`#f7f7e6 #f7f7b5 #e6e6a4 #d6d694 #c5c584`) |
| explosion | `ab2-arcade-night-banking.png`, warm family | **3** | cardinality: all; palette: see "Fireball targets" | 18 total, **12 cover 95%** |

The daylight player-jet crop is **not** a clean sprite isolation — look at it
(`tools/out/criteria-r6/value/arcade-jet-desert.png`): the box holds desert ground and rock as
well as the aircraft. For a *cardinality* bound that is conservative in the safe direction
(extra background can only add colours). For a *value* statistic it is not, which is why the
value measurement below uses an achromatic filter plus a largest-component isolation and dumps
its mask to be looked at.

**This is why the bound is split — and R7 found it had to be split once more.** A flat "≤8 per
sprite" would **fail the arcade's own explosion**, which uses 12–18. ~~Aircraft and clouds sit
at 5–8~~ — **that line was read off the night jet and it fails the arcade's own DAYLIGHT jet in
the row above it (13–14 total).** The gate is now `n95 ≤ 8` with per-variant totals as licensed
facts; see "A3 was derived from the NIGHT jet" under Criterion A, and ledger row 25. Effects
need ≤16. Publishing
the flat bound would have repeated exactly the mistake this section exists to prevent.

**Scale note**: colour cardinality is identical measured on our 960×672 capture or on its
native decimation — the upscale is lossless block duplication (see "Measuring OUR captures"
below), so it adds no colours. Measure at native anyway, for consistency with Criterion B,
which is *not* scale-invariant.

## Criterion B — adjacent-pixel identity on ground regions

**GATE: ≥ 50% of horizontally adjacent pairs AND ≥ 50% of vertically adjacent pairs are
exactly identical**, measured on a ground region of a representative flight frame at true
native 320×224.

This is the statistic that separates *structured pixel art* from *continuous-tone noise* —
dithered water from TV static. The arcade's ground is large flat regions punctuated by
deliberate dither; ours is a 4-octave fbm field where every pixel differs from its
neighbours.

**Operator (ADJ-ID):**
1. **True native 320×224.** For our captures, `img[::3,::3]` after confirming every 3×3
   block is uniform. **Never measure this on a video frame**: re-encode noise deflates it
   and a non-integer upscale inflates it (neighbouring output pixels share a source pixel),
   so video is wrong in *both* directions. Only the two true-native PNGs qualify on the
   arcade side.
2. **Region** = all rows strictly below the horizon, full width, minus the HUD mask (derive
   ours with `tools/hud_mask.py`; never hardcode). If the frame has no sky — the top-down
   desert reference does not — the region is the whole frame minus the HUD bands (rows
   10–26 and 196–216 on those two frames).
3. A pair counts only when **both** pixels are inside the region.
4. H-identity = fraction of in-region horizontally adjacent pairs with all three channels
   equal. V-identity likewise.
5. **Use a representative flight frame, not a death or explosion frame.** A screen-filling
   fireball is flat and inflates the number: our own `death4` capture reads 56.9/51.0 where
   normal flight reads 34.2/33.4.

**Measured:**

| | H-identity | V-identity |
|---|---|---|
| `ab2-arcade-desert.png`, whole frame minus HUD | **68.8%** | **68.5%** |
| `ab2-arcade-night-banking.png`, whole frame minus HUD | **84.0%** | **80.3%** |
| arcade, across five sub-regions of both frames | **62.9–88.4%** | **61.7–87.1%** |
| ours, flight captures, ground band y140–195 minus HUD | **28.5–35.1%** | **0.4–34.8%** |
| ours, same captures, whole frame | 61.8–69.4% | 59.7–61.4% |

**The last row is why the region definition is mandatory.** Our *whole-frame* number is
62.1%/60.8% — it would pass a 50% gate — because a flat `#009fff` sky fills the top half and
carries the average. The sky is not the thing being tested. Restricted to ground, the two
populations do not overlap: arcade ≥61.7% on every region of both frames, ours ≤35.1% on
every flight capture. A 50% threshold sits in the gap with margin on both sides, which is
what makes this criterion robust to the region choice rather than dependent on it.

**Two figures from `judging/R4/art-critique.md` that I could NOT reproduce**, recorded so
nobody tunes to them: it reports arcade **62.5%/61.0%** and ours **14.8%/3.5%**. With the
region stated above I measure the arcade *higher* (68.8/68.5 whole-frame, never below
61.7 on any sub-region) and ours *higher* (28.5–35.1 / 0.4–34.8). The report does not state
its region, and the statistic moves by 30+ points with the region, so the gap is almost
certainly region definition rather than disagreement. **The direction, the magnitude of the
separation and the conclusion are unaffected** — ours is roughly half the arcade's on every
pairing I tried. Use the numbers in the table above, which name their region.

---

## Every palette or value criterion names its stage (PROCESS RULE, binding from R6)

**The rule.** Before a palette, value, saturation or contrast criterion is written into this
document, record two things in the table that carries it:

1. **MEASURED ON** — the frame, *and the stage digit read out of that frame's own HUD*. Not
   the filename, not "the daylight frame", not the span it was extracted from. The digit.
2. **LICENSED FOR** — the stages the number may be applied to. If that is one stage, say one
   stage. If the property is stage-independent, say so **and say why** (Criteria A and B do:
   they describe the medium, not the appearance).

A criterion you cannot attribute is **not usable** — mark it `UNATTRIBUTED` and treat it as a
candidate, not a gate. An unattributable palette criterion is the next ledger row 11.

**Why, in two lines.** R6 retired two R4 criteria that were measured correctly, off a
**stage-2** frame, and applied to **stage 1**: the player-airframe value ceiling (ledger 11)
and the near-black enemy dominant (ledger 12). Each was faithfully implemented and each made
stage 1 worse. Cross-validating implementations cannot catch this — every re-run reproduces
the wrong number exactly. Reading the stage digit catches it in about ten seconds.

**It is not hypothetical that this document does it too.** Three places were found and fixed
this round: `ab2-arcade-desert.png` cited as the generic "daylight" frame when it is **stage
2** — and **GAME_SPEC.md's own colour caveat has carried the correct attribution for both
native frames since R5b**, so this was recoverable by reading a sibling document; `ab2-arcade-closeup-enemies.jpg` used for an enemy *livery* when it is **stage 2** (it is
still fine for the geometry it is cited for under "Enemies"); and the Enemies section's own
claim that enemies "read dark against bright skies (t116…)", which the t116 frame contradicts.

**How to read a stage digit.** Crop the bottom HUD strip and view it at ≥3× nearest-neighbour:
`python3 -c "from PIL import Image; im=Image.open(F); im.crop((0,int(.85*im.height),im.width,im.height)).resize((im.width*3,…),Image.NEAREST).save(OUT)"`.
The digit sits right of the red `STAGE` label. On a 686×480 longplay frame it is legible
directly. **`STAGE_MAP.md` is the other route** and is preferred for video: it maps longplay
timestamps to stages, established by reading that same digit.

### Backfill — the stage attribution of every palette/value criterion already in this document

| criterion | measured on | stage | licensed for |
|---|---|---|---|
| Criterion A, colour cardinality | `ab2-arcade-desert.png`, `ab2-arcade-night-banking.png` | **2**, **3** | **all stages** — it is a property of the medium, and the two frames bracket it (138/31 and 79/17) |
| Criterion B, adjacent-pixel identity | same two | **2**, **3** | **all stages** — same medium argument — but **flagged as an EXTRAPOLATION onto stage-1 sea (R6)**: neither native frame is sea, and we hold no native stage-1 frame. Kept as a gate because the floor sits in a wide gap (arcade ≥61.7 % on every sub-region of both; our pre-fix build ≤35.1 % on every capture), and because a ±10-point extrapolation across subject matter is a far weaker assumption than a band fitted to codec noise. **If a native stage-1 frame lands and its sea reads below 50 %, this goes** |
| Sky palettes, per stage | t116 / t140 / t175 of `ab2-longplay.mp4` | 1 / 2 / 3, **by `STAGE_MAP.md`** | the stage named in each row — this table was per-stage from the start |
| Ground/terrain palettes, per stage | per-stage frames via `STAGE_MAP.md` | as tabulated | the stage named in each row |
| Player jet — airframe value (R6) | t116, t97, t98, t100.75 (`reference/stage1-*`), + `ab2-arcade-desert.png` | **1** ×4 (digit read, all four), **2** | **daylight stages**; night has its own 8-colour palette above |
| Enemies — value polarity (R6) | t116 stage-1 crop, + art critic's t100.75 | **1** | **stage 1.** Stage 2 is the opposite polarity and is measured separately |
| Explosions — fireball targets / FIRE-MASK | `death-starburst-gp-t202.png`, `ab2-arcade-huge-explosion.jpg` | **UNATTRIBUTED** — `ab2-gameplay.mp4` has no stage map, and the huge-explosion still is an unlabelled third-party capture | currently applied to all stages. A fireball is self-lit and plausibly stage-independent, but **that is an argument, not a measurement** — flagged here rather than asserted |
| Missile trail — white, V ≥ 0.90 day / ≥ 0.85 night | stage-1 and stage-3 spans of `ab2-longplay.mp4` | 1, 3 | day and night rows respectively — already split, and the R5 repair of ledger row 2 is exactly the night/day split being made |
| Stage-1 cloud palette / bank sizes | t88–120 of `ab2-longplay.mp4` | **1** | stage 1 only; stage 6 is the arcade's dense-cloud stage and is unmeasured |
| HUD ink separation (R6) | native + per-stage strips, all three stages | 1, 2, 3 | per-stage as tabulated |
| **Nose sight square — size (R7)** | `ab2-arcade-desert.png` (native) + `ab2-longplay.mp4` t201.4, corroborated present at t109 | **2**, **4**, **1** — digit read on all three | **all stages** — the HUD is drawn at a fixed screen size and does not change with the palette; three stages and two skies carry the figure |
| **Player jet — wing vertical sweep (R6, direction re-checked R7)** | `stage3-night-level-t175.png` x[207,487] y[227,306] | **3** | **all stages** — it is one sprite drawn in every palette. **Requires a LEVEL attitude**; `stage1-level-flight-t116.png` is banked despite its name |
| **Criterion A/B scoreboard populations (R7)** | arcade: both native frames, both in combat. Ours: `53ce86b` hud-s{1,2,3} (no combat on screen) and `e8fed58` s1-{nc,play,play3} | 2, 3; ours 1/2/3 and 1 | **all stages**, but **every figure names its population** — see ledger row 21 |

**One entry on that list is UNATTRIBUTED and it is the explosion palette** — which is already
ledger row 3, retired once for being measured off fading smoke. It is not being retired again
here; the flag is the deliverable. Anyone tuning explosions should know the targets rest on two
frames whose stage nobody can name.

## Capture sets: sweep for duplicates ACROSS sets, and mark controls so nothing pools them (PROCESS RULE, binding from R7)

Two gaps in the capture hygiene this project already practises. Both were found by one
observation, and neither is covered by any sweep currently run.

### 1. Duplicate detection is WITHIN-SET only, and pooling is exactly where cross-set matters

Every sweep here checks for black frames, byte duplicates and near-duplicates **inside** a
capture directory. **Nothing checks across directories** — and a pooled figure, which is the
normal way a median or a min/max band gets built in this document, is precisely the case where
a repeated directory does damage.

**The live instance.** `tools/out/tl-verify-9-1`, `-9-2` and `-9-3` hold **byte-identical
frames** (md5 `ed3de9da…` and `fc8feed9…` in all three). They were created deliberately — the
same invocation run three times to test whether a `watch: null` change had broken
`capture.mjs` — and then kept. **Three directories carrying one directory's information.** A
figure pooled over them triple-counts two frames, every within-set sweep passes, and a
black-frame sweep sees nothing.

**The rule: hash every frame of every set that feeds a pooled figure, and report the count of
cross-set duplicates beside the figure**, the same way black-frame counts are already reported.
It is one dictionary. STATUS's standing warning — *"two capture-corruption causes are fixed;
that is not proof there is no third… sweep for black frames AND for duplicates"* — now has a
named third: **the duplicate is in a different directory.**

### 2. A CONTROL RUN IS NOT A MEASUREMENT SET — name it so, or delete it

A directory produced to test the *instrument* must never be able to enter a measurement. Today
nothing distinguishes the two, and the only defence is that whoever pools remembers.

**Convention, binding: a capture directory whose purpose is a control, a smoke test or a
repeated-invocation check is named with a `-control` suffix** (`tools/out/<lane>-<thing>-control`),
and **no pooled figure may include a `-control` directory.** Deleting it is equally good. The
cost is a word; the failure it prevents is silent and survives every existing gate.

### 3. A capture set's AGE is visible in its CONTENT — date it before you trust its name

The detector that caught the above, worth stating because it is reusable and it works when
directory names and timestamps do not:

> **A stale capture set is identifiable from its pixels, and the component that dates it is
> whichever one a lane most recently rebuilt.**

Worked case: `tl-verify-9-*` carried **sky 15 colours, jet 40 — both current — and ground
9 430 colours with 11 320 singletons.** Sky and jet could not date the set; **the ground
could**, because the world lane had just replaced the stage-1 sea and nothing that reads 9 430
colours in its ground can postdate that commit. The set was R5-era (`53ce86b` or earlier) and
the names said nothing. **So: before trusting a capture set's provenance, measure the one
subsystem that changed most recently and check it against that subsystem's current figure.**
A set that disagrees is old, whatever it is called.

## An API where "no value" means "erase" cannot tell a typo from an intent — assert the INPUTS (PROCESS RULE, binding from R7)

**The rule.** When a drawing or generation primitive treats a missing/undefined argument as a
**valid destructive operation**, a gate on its **output** cannot detect a mistake. **Assert the
inputs**, at the call site, with a check that is validated on known-bad input.

**The worked case, which the R7 sprite lane found in its own tooling and published.**
`player-f14-roll.js` shares `levelOps()` with the level sheet but keeps its own role→hex
tables. R7 added three roles to `levelOps` and not to those tables, so every polygon using a
new role arrived with an **undefined** hex — and `PixelCanvas.set()` treats a null/undefined
hex as **"erase to transparent"**. The sheet did not fail. It grew **holes**: opaque pixels per
cell fell 1176 → 1072, 834 → 759, 407 → **368**.

**Four gates passed it, and each for a different and individually reasonable reason:**

| gate | why it passed |
|---|---|
| `assertPalette` | the colour count went **down**, not up — the gate only bounds the ceiling |
| `vite build` | a property access, not a syntax error. R6 already paid for "a green build is not a boot" |
| `sheet_visibility.py` | **a sprite with bites out of it is still visible**, which is all that gate asks |
| every capture | the roll sheet is **unwired** — no frame would ever have shown it |

**What caught it was `git diff --stat`** reporting that a file the author had just asserted was
untouched had changed by 39 bytes — then cropping it at 3× and looking. **Not a gate.**

**The fix is the generalisable part**: `LEVEL_OPS_ROLES` is exported as data and `assertRoles()`
is called by both sheets' frame builders, and it was **validated on known-bad input** (deleting
one role exits 1 with the offending role named). That is the shape to copy — not another output
gate.

**Two corollaries worth carrying.** (1) **A count-based gate is blind to erasure**, because
erasure moves counts in the safe direction; pair any count ceiling with a count *floor* or an
input assertion. (2) **An unwired artefact has no behavioural gate at all** — it is exactly
where a silent defect survives to the next round, so it needs its assertions to be static.

## The upper-right HUD has now been counted as four different things — exclude it by rule, not per operator (PROCESS RULE, binding from R7)

**The rule.** **Every operator that counts, measures or classifies OBJECTS in a frame — ours or
the arcade's — blanks the HUD before it counts, and says in its published figures that it did.**
This is not an addition to one operator's caveat list. It is a standing precondition, in the
same class as "measure at true native" and "read the stage digit".

**Why a rule and not a fourth exclusion.** The fixed upper-right reticle — a corner-bracket
square, a status dot and a **rotating** attitude line, all white, all high-contrast, all on
empty sky — has now been counted as:

| round | counted as | by |
|---|---|---|
| R4/R5 | **a cloud, in 100 % of frames** while the build rendered none | our own cloud census |
| R5 | **a cloud bank at 17.35 %W**, at a near-constant 496 px bbox, in ~a third of detections | two of three independent runs of the #132 operator |
| R5/R6 | the thing that **defeated two horizon line fits** and inflated one frame's Criterion B by 11 points | two separate bottom-up fitters |
| **R6** | **an enemy aircraft at ~16 %H, span ~11 %W** — inside the top third and readable-size, the single most influential observation class for the headline | the R6 judge, hand-counting arcade altitudes at 1.4× |

Four operators, four rounds, four different wrong objects, each one caught only by zooming in
and looking. A fifth per-operator exclusion would be the fifth time the same fact was written
into a block that the sixth operator does not read.

**The exclusion, with the defect in the old one fixed (ledger row 23).** The arcade-side rects
are given as **`(x0/W, y0/H, x1/W, y1/H)` — opposite corners, NOT `(x, y, w, h)`**:

| region | rect | measured basis |
|---|---|---|
| SCORE emblem + score digits | `(18/686, 20/480, 400/686, 58/480)` | unchanged from the #132 repair |
| **lock reticle + attitude line** | **`(0.720, 0.055, 0.965, 0.330)`** — was `(495/686, 30/480, 660/686, 105/480)` = `(0.722, 0.063, 0.962, 0.219)` | see below |

**Why the lower edge moved from 0.219 to 0.330.** The old rect was fitted where the attitude
line is horizontal. The line is an artificial horizon and **rotates with the world roll**, so in
a banked frame it swings out of a box fitted to level flight. Measured at true native on
`ab2-arcade-desert.png` (stage 2, banked): the reticle assembly's largest 8-connected white
component (`min(RGB) ≥ 180`) spans `x[248,277] y[15,67]` of 320×224 = **x 0.775–0.866,
y 0.067–0.299**, and 17 of the 103 white pixels in the upper-right quadrant fall **below** the
old rect. `ab2-arcade-night-banking.png` (stage 3, banked the other way) puts the line at
`x[236,291] y[36,47]` = x **0.738**–0.909, which is the left-hand extreme. The four corner marks
sit at a fixed `x[248,279] y[24,47]` in **both** native frames, which is the control that the
bracket itself does not move. The new rect covers both extremes with ~3 points of margin.

**Carry the cost, do not hide it.** A wider rect severs more sky, and the cloud-bank figures
already carry a known bias from exactly this (counts over-count **3.1 %**, widths under-state
**0.9 %**, and the ledger says it grows with any new horizontal HUD rule). So:

- **Object-counting and classification operators use the new rect.** There a false positive is
  the failure mode and over-blanking is the safe direction. This includes any arcade
  enemy-altitude count (GAME_SPEC §2).
- **The published cloud *size* distributions stay on the old rect**, with this bias noted, until
  somebody re-derives them. Re-deriving them on the new rect is an open item, not a silent edit.
- **For our own captures, derive the mask per run with `tools/hud_mask.py` — never hardcode a
  box.** That has been the rule since R3 and is unchanged; what is new is that it now applies to
  *counting* operators and to the **arcade** side too, where there is no mask tool and the rects
  above are the substitute.

**Control.** On `reference/stage1-level-flight-t116.png` at the #132 operator's ≥150 px
minimum, the rects return **0** components; without them they return **1**, area 496, bbox
`x[35,153] y[32,52]`, 17.35 %W — the arcade's own SCORE emblem. If your run reports a ~17 %W
"bank" at a fixed bbox across consecutive frames, or a small "aircraft" high in the upper right
that never moves between frames, you did not apply them.

## "NATIVE OUTRANKS THE UPSCALE" IS A RULE ABOUT COLOUR LEVELS. IT DOES NOT TRANSFER TO A THICKNESS STATISTIC (R9)

This document's standing preference for true-native sources exists because **video upscales
invent colour levels** — 19 896 colours in a sea band, 3 133 in a 5 147 px jet crop, the level
expansion past `0xf7`. Every retirement it has driven (ledger rows 16, 17, acquisition items 1–6)
is a **cardinality or palette** claim.

**A distance-transform statistic quantises on a different axis and the rule does not carry.**
`SW` and `P90SW` are `2 ×` a Euclidean distance to the nearest background pixel, so on the native
grid they can only take values from a small set — `{2.0, 2.83, 4.0, 4.47, …}` — and a percentile
**jumps between levels** as the pose changes. On a 2.14× upscale the same physical thickness lands
on a denser set. Measured by two lanes on the arcade night jet, **same subject, same mask, same
operator**: pose CV **0.00 %** at the stored 686×480 (the percentile sat on one level, `{6.0}`)
and **10.73 %** measured on the native grid (straddling `{2.83, 4.0}`).

**Two cautions this document adds to that finding, because the obvious reading of it is wrong in
both directions.**

1. **A CV of 0.00 % on a quantised statistic is a RESOLUTION REPORT, NOT A STABILITY REPORT.** It
   cannot distinguish "the drawing is stable under rotation" from "the percentile is pinned to one
   quantisation level". It is also a *"doesn't move"* result, which CLAUDE.md requires be cropped
   and looked at rather than quoted. **Binding: publish the NUMBER OF DISTINCT EDT LEVELS the
   percentile took across poses beside any pose CV.** One level and a 0.00 % CV is a single
   observation wearing a statistic's clothes.
2. **This is not a licence to prefer the upscale.** The upscale's finer distance quantisation is
   bought with codec blur that moves the mask boundary itself, which the native grid does not
   have. **The rule is: state the measurement scale with every thickness figure, and never compare
   two thickness figures taken at different scales** — the same condition DRAW-WEIGHT's matched-
   span licence imposes on INK/SPAN, for the same underlying reason.

**The cheap predictive form, and it is an ESTIMATE rather than a bound.** Expected pose CV
≈ **½ × the relative gap between the EDT levels the percentile straddles**, readable from a single
pose. It sizes the effect before a sweep is run, which is its value. It is published as `≈`
because it does **not** bound: on the drawing lane's own arcade-day P90, predicted **2.5 %**
against observed **2.73 %**. Use it to decide whether a CV is worth measuring, never to replace
measuring it. One consequence already taken: a reading whose percentile straddles two levels is
**quoted as a range, not a point.**

## THE FIGURE MOST WORTH CROPPING IS THE ONE YOU HAVE ALREADY EXPLAINED TO YOURSELF (PROCESS RULE, binding from R9)

CLAUDE.md's standing rule is: *"Any 'measures zero' / 'doesn't move' / '100 %' result: crop it
and LOOK once."* **R9 fired that rule twice and NEITHER instance was on its trigger list.** Both
were large, stable, perfectly reproducible numbers, and both arrived with a mechanism already
attached — which is precisely what suppressed the instinct to look.

| the figure | the explanation already attached to it | what one crop showed |
|---|---|---|
| the arcade jet's enclosed-region fill adds 133 px, **17.1 % of ink** | *"hole-filling fills the sky between the blades and erases the structure the statistic exists to measure"* — plausible, alarming, and a correct-sounding reason to reject the other lane's anchor | the 133 px are **the two nozzle discs**. The blade gaps are open to the border and stay open. The under-count was the published figure, not the other lane's |
| ours ÷ arcade appears to move **300 %** between two mask rules | *"the statistic is wildly mask-sensitive"* | the four-role rule **collapsing on our side only**, pose-dependently. Under one rule applied to both sides the ratio is stable. Withdrawn as an intermediate, never published as a finding |

> **Binding: the trigger is not the shape of the number, it is the presence of an explanation you
> arrived at without looking.** A zero invites suspicion on its own; a large number with a tidy
> mechanism does not, and is therefore the more dangerous of the two. **Crop it before the
> mechanism goes in writing**, not after.

This is the operational companion to selection rule 4 (*a cross-validation can agree because two
errors cancel*): one covers agreements that are too good, this one covers explanations that are
too good.

## A DECLARED EXCEPTION IN THE SOURCE IS A CRITERION NOBODY HAS TO ARGUE WITH (PROCESS RULE, binding from R9)

**Definition, because a bare grep for "deliberately" returns ~70 lines in `src/` and nearly all
of them are ordinary implementation notes:**

> A **declared fidelity exception** is a source comment that (a) names a visible property of the
> shipped build, (b) asserts it diverges from the arcade or from a published criterion, and
> (c) gives a reason for not closing it.

**It is the best hiding place in the repo**, because it converts an open question into a settled
one at zero cost to the writer, and **every audit that reads the reason stops reading.** The live
instance: `enemySprite.js`'s `drawRearFar()` draws **44.8 % of all enemy sprites on screen** as
five nested `fillRect`s on a fully opaque cell, under a long, measurement-backed comment that ends
by instructing future editors not to thin it — and it went five rounds unexamined.

**R9 swept all thirteen declared fidelity exceptions in `src/`. Two fail against the arcade, two
carry justifications that have expired, nine are sound.** That ratio is the reason for the rule:
the class is dangerous not because such comments are usually wrong, but because **nothing
separates the sound ones from the rotten ones without re-reading the arcade**, and the comment's
existence is exactly what stops anyone doing it.

**Three binding consequences.**

1. **An exception's own arcade citation is a claim, and it gets checked like any other.**
   `drawRearFar()`'s read *"the bracketed enemy at ~(415,210) is a handful of dark pixels, no
   silhouette"* (`reference/stage1-level-flight-t116.png`). Cropped at 12× it is a pale wing line
   **clearly wider than its body with sky above and below it** — a cross, not a block — and the
   two true-native distant enemies measure **bbox fill 30.6 % and 34.6 % against our 100 %**.
   → `tools/out/criteria-r9/crit-r9-05-ARCADE-far-enemy-t116-12x.png`.
2. **An exception that cites a criterion must be re-read whenever that criterion changes status.**
   `clouds.js:117` keeps trilinear minification because nearest filtering *"crushes its width to
   ~1.9 %W against 9.26"* — and the 9.26 %W target is from the **#132 figures retired in R5**
   (ledger row 4). The conclusion is probably still right; the justification expired four rounds
   ago and nothing noticed. **When a ledger row is opened, grep `src/` for the number it retires.**
3. **An exception's text must be no broader than the exception the code takes.** `sky.js:35` says
   *"the sky is deliberately NOT snapped to the arcade's 4-bit colour ladder"*; `stage.js` sets
   `skyLadder: true` on stages 2 and 3 and only stage 1 omits it, so the sentence is **false for
   two of the three implemented stages** while its stated reason is a stage-1-only argument.
   Behaviour correct, text wrong, and the wrong form is the dangerous one — a reader concludes the
   sky is outside the ladder regime altogether.

**Audit cost**: the whole sweep is one grep, a narrowing rule, and thirteen crops. Run it every
round in which a lane closes a named defect, and run it *before* believing any comment that
tells you not to change something.

## A verb that is not in the control table is a verb a judge will score as absent (PROCESS RULE, binding from R6)

**The rule.** When a player-facing capability ships, it is not delivered until it is in
`README.md`'s control table. A judge arrives with fresh context every round and reads the
documentation as **the complete list of what the build can do**. Anything absent from it is
scored absent, and the lane that built it pays twice — once to build it, once for someone to
disprove the phantom gap.

**It has already happened.** `Q`/`E` throttle shipped in R5 and the barrel roll was built in
R5b; neither was in the control table. The R5 judge recorded the throttle as "wired to
`scrollSpeed` with no player control" — **a gap that did not exist** — and the R6 flow lane
spent part of its round disproving it with a key-event probe. Two lanes' time, and the fix was
one table row.

**The generalisation, which is the same shape as the stage-attribution rule above.** Both rules
say: *the artefact a reader will actually consult is part of the deliverable.* A palette
criterion without its stage is unusable by the next measurer; a control without its table row
is invisible to the next judge. Neither is a documentation nicety — each one has cost this
project a round.

**Applies to**: `README.md`'s control and query-param tables, and any capability a judge could
look for and fail to find. If you are unsure whether a change is player-facing, it is.

## A self-identity or cardinality gate is satisfiable by a DEGENERATE structure — pair it with an extremal statistic (PROCESS RULE, binding from R6)

**The rule.** Criteria A and B are **necessary and not sufficient**. Both are averages over a
region, and an average cannot see *arrangement*. **Every cardinality or self-identity gate must
be reported alongside at least one extremal statistic of the same region** — largest connected
component, maximum extent, component count — because that is the only family of statistic that
separates "correct structure" from "degenerate structure that scores well."

**This is not a theoretical concern. It happened to these gates, in the round they were
promoted.** The R6 world lane's intermediate stage-1 sea passed everything:

| | the slab build | the fixed build | arcade |
|---|---|---|---|
| colours (Criterion A) | 56 ✓ | 51 ✓ | 138 |
| channel values | 31 ✓ | 31 ✓ | 31 |
| H-identity (Criterion B) | **89.3 ✓** | 80.5 ✓ | **68.7** |
| V-identity | 55.1 ✓ | 57.8 ✓ | 68.5 |
| **largest bright component, px** | **2 194** | **97** | **82** |
| **max component width, px** | **280** (the whole patch) | **40** | **38** |
| **component count** | **148** | **435** | **389** |

Green across the board on the gates, and the crop
(`judging/R6/world-02-sea-nearpatch-BEFORE-ours-TOP-arcade-BOT.png`) is a deep blue field
carrying **a few enormous smooth pale slabs** where the arcade carries a dense scatter of short
dashes.

**Note the direction, which is the whole point.** A flat slab is *more* self-identical than a
dash field, so the wrong structure scored H-identity **20 points ABOVE the arcade's own 68.7 %**.
**The gate improved as the art got worse.** Criterion B is stated with a `≥ 50 %` floor and no
ceiling, so nothing in it could fire. A ceiling is not the fix either — the arcade's own two
native frames read 68.5 % and 80.3 %, so any ceiling tight enough to catch 89.3 would risk
failing a legitimate night frame.

**The medians were blind and the extremes were not.** Component width p50 was **2 px on both
the slab build and the correct one** — that is just what a thresholded field's small components
look like, on any field. The entire defect lived in `max`. **A median-only criterion would have
certified the slab.**

**This is the third distinct way this project has satisfied a number while losing the picture**,
after (1) a statistic measured off the wrong population and (2) a statistic measured off the
wrong stage's frame. It is the first time the *new, strongest* gates did it, three sections
after this document argued that they "cannot be laundered". They can — not by tuning the
colours, but by collapsing the structure. The claim is narrowed accordingly: **Criteria A and B
cannot be laundered by a continuous-tone renderer, which is what they were built to catch. They
can be laundered by a degenerate one.**

### The paired extremal criterion for stage-1 sea (SEA-DASH, MEASURED R6)

**Operator**: `tools/measure_sea_dashes.py` (`--selftest` PASS: hand-countable labeller cases,
4-connectivity on a diagonal pair, the V threshold at its exact 242/243 boundary). Mask
`V > 0.95` — this document's own published foam operator — 4-connected components over a
280×48 native near-field patch; report count and the width / height / area **distributions,
including the maxima**.

| 280×48 near patch | arcade t116 | accept band for ours |
|---|---|---|
| foam fraction (V > 0.95) | 19.5 % (BOX) / ~23–24 % (NEAREST) | **18–25 %** |
| component count | 389 | **≥ 300** |
| width p90 / **max** | 9 / **38** | p90 ≤ 12, **max ≤ 60** |
| height p90 / **max** | 4 / **8** | p90 ≤ 6, **max ≤ 16** |
| area **max** | **82** | **≤ 200** |

**The maxima are the criterion. The medians are context, and they are published as context so
nobody mistakes them for targets** — they read 2 px and 1 px on a correct sea and on a badly
wrong one alike.

**Carry this bias with the arcade column.** The arcade side is BOX-area-averaged from t116 to
reach the patch grid, and per the scale rule above **BOX costs ~5 points of foam fraction
downward** (the same band reads 23.4 % at 686×480 and 18.0 % after BOX). So an our-side
*nearest*-decimated 18.4 % against an arcade *BOX* 19.5 % is a slightly better match than it
looks on one side and a slightly worse one on the other; the comparison is sound to ~5 points
and should not be quoted tighter. **Threshold-area and component statistics are the right tool
here precisely because they survive the video** — unlike the adjacency statistics the same
frame destroys. The bands above are set wide enough to absorb the resampling term.

---

## Sources and provenance

- **Video**: `.reference-cache/video/ab2-longplay.mp4` — 686×480, 30 fps,
  AV1, 988.7 s. All `tN` frame citations are exact single-frame extractions:
  `ffmpeg -ss N -i ab2-longplay.mp4 -frames:v 1 out.png` (single-frame `-ss` is exact on
  this machine; *sequence* extraction from AV1 files starts ~4 s early — never derive
  timestamps from sequence indices).
- **Stage identity**: every stage claim uses the HUD-verified stage↔timestamp map, which
  now lives in this repo as `STAGE_MAP.md` (it was ADOPTED from the prototype's
  `stage_data.gd` header; **this repo is standalone, do not reach outside it**).
  Verified spans (seconds):
  stage 1: 88–120, 2: 124–156, 3: 160–196, 4: 200–240, 5: 244–256, 6: 260–304,
  7: 308–340, 8: 344–372, 9: 376–424, 10: 428–468, 11: 472–508, 12: 512–548,
  13: 552–568, 14: 572–608, 15: 612–652, 16: 656–692, 17: 696–724, 18: 728–764,
  19: 768–808, 20: 812–852, 21: 856–892, 22: 896–932, 23: 936–952.
  Attract mode runs to ~84 s; the run starts at the carrier launch ~88 s; stage-1
  *flight* starts ~94–97 s (before that is the launch cinematic).
- **Coordinates** below are (x, y) pixels in the 686×480 video frame unless a fraction
  (%W / %H) is given. The arcade's native resolution is 320×224; the video is an upscale,
  so prefer the fractions.
- All measurement scripts for this pass were run from scratch on the extracted frames
  (mode colors, column scans with 6-consecutive-row confirmation, per-frame object
  masks). The mask AND the extent method for each number are stated where the number is
  used — they differ per frame and the difference matters (see the jet-span note below).
  The sky "mode" figures are modal colors of the band y=55–130 full-width.

### What a complete citation is — and the field that was missing (MEASURED R5c)

A citation in this document proves **provenance**, not relevance. R5 established that even a
complete-looking provenance line is not enough to reproduce a figure. Every measured number
published from here on states **all five** of — **six, if it touches time (R10, field 6)**:

1. **Source** — frame file or `tN` timestamp, and the **stored resolution** it was read at.
   Native 320×224 outranks any upscale (see "Native frames outrank upscales"), and a
   sub-native JPEG outranks nothing.
2. **Region** — crop box or band, in pixels at the stated resolution *and* as %W/%H.
3. **Operator** — the exact predicate, including the metric. "Within 24 of `#e67300`" is
   **not** an operator: Chebyshev (max per-channel |Δ| ≤ 24) and Euclidean (L2 ≤ 24) are
   both natural readings and the Chebyshev cube is 6.6× the volume of the Euclidean ball.
   Name the one you used. (Project-recurring: a stable small disagreement between two lanes
   is usually two definitions of one statistic, not an error in either.)

   **AND IF THE OPERATOR HAS A MASK, STATE ITS RECOVERY AGAINST GROUND TRUTH, PER SIDE — or state
   that it is unobtainable on one of them (R10).** This generalises the R9 DRAW-WEIGHT rule
   (*"a mask rule is validated against ground truth on BOTH sides"*) from sprite masks to every
   mask in this document, because the explosion operator needed it the moment it existed: `r9`
   recovers **54.9 %** of our fireball at its peak and **18.5 %** one phase later, so an envelope
   measured through it is partly a **palette transition**. Only our own art has ground truth (the
   alpha channel or the authored palette); the arcade side can only be cropped and looked at.
   **"Unobtainable on the arcade side" is an acceptable entry and an unstated recovery is not.**

   **A corollary that cost this lane a published figure (ledger row 51): an EXACT REPRODUCTION
   PROVES YOU RAN THE OTHER PERSON'S OPERATOR. It does not prove it is the licensed one.**
   Reproducibility and correctness are orthogonal, and this project's instinct is to read the
   first as evidence of the second.
4. **Population** — *which* frames, how many, and over what span. A number from 4 frames of a
   33-frame span is not a property of the span; §"Stage-2 open plain" below is the worked
   example, where a 4-frame sample put the arcade's median at 4.2 % and all 65 frames of the
   same span put it at 19.7 %.
5. **Tree state** — for any figure measured off **our build**: a commit-ish, or the explicit
   words *"uncommitted working tree, N lanes live"*. This is new in R5c and it is not
   pedantry. The R4 critic's playable-fraction figure and player-feel's differed widely; it
   was neither sampling rate (re-sampling at the old rate agreed to **0.12 points**) nor
   operator — it was the **death count, 6 vs 9**, because one measured the shared tree with
   other lanes' uncommitted work in it and the other a clean checkout of `7b4617a^`. Both
   were right about the tree they were taken on. "The working tree on the afternoon of the
   Nth" is not a reproducible citation.

6. **SAMPLING RATE — binding from R10, and required on every figure that touches TIME**:
   duration, rate, period, delay, envelope, interval, "holds for", "arrives every", "lasts".
   State it as a **number in Hz or seconds between samples, on BOTH sides**, and state the
   **decode method** on the arcade side (`-vsync 0` consecutive decode, or an `fps=N` resample
   — they are not the same operation and only the first gives consecutive frames).

   > **Why this is a field and not a nicety: EVERY figure in this project that touched time
   > before R9 was taken at 4 Hz or coarser, and the arcade event those figures are about
   > lasts 0.067 s.** The R9 motion pass measured the arcade's explosion holding within 60 %
   > of peak for **4 frames of 1/60 s**. At 4 Hz that whole event falls between two samples.
   > Two of R9's load-bearing inherited figures are 4 Hz samples of sub-second events and
   > neither said so: GAME_SPEC §3's missile launch→impact *"2–4 frames of 0.25 s"* (true
   > support 0.25–1.25 s once the ±0.25 s quantisation at each end is carried), and the
   > *"~6 lock boxes at once"* count behind the lock radius.
   >
   > **This is ledger row 29 widened from PERIODIC to TRANSIENT behaviour.** Row 29 made
   > sampling binding for a repeating thing (the invincibility flash, 0.267 s period, missed
   > by four passes). A transient is worse, because a periodic signal at least gives the
   > sampler repeated chances. **A number with no sampling rate is not a temporal
   > measurement; it is a still with a unit attached.**
   >
   > **And the corollary that bites hardest: a NEGATIVE about a transient is worth nothing
   > without its rate.** "Ours leaves no smoke", "there is no flash", "nothing happens
   > between the launch and the hit" are all claims a 4 Hz sampler produces for free.

**Corollary, binding on the judge: the judge measures a CLEAN CHECKOUT, not the live shared
tree.** With six lanes editing one tree at once, a judge figure taken mid-round describes a
state that never existed as a commit and that nobody can re-derive. Arcade-side measurement
is unaffected — the footage does not move — so arcade numbers need fields 1–4 only.

### Measuring OUR captures: the native grid (VERIFIED R5)

Our captures are **960×672**, which is an **exact 3× nearest-neighbour block upscale** of a
true 320×224 render (`tools/capture.mjs` sets that viewport; `src/render/screen.js` picks
`scale = max(1, floor(min(w/320, h/224)))` = 3, and 320·3 × 224·3 = 960×672 fills it with no
letterbox). **Verified, not assumed**: across three independent judge-R4 captures, all
71 680 native pixels per frame, **every 3×3 block is perfectly uniform — maximum
intra-block deviation 0**.

Therefore `img[::3, ::3]` (what `measure_ground.py`, `measure_coarseness.py`,
`measure_flow.py`, `measure_roll.py`, `measure_clouds.py` and `hud_mask.py` all do) is
**exactly lossless** — it recovers the native render bit-for-bit. It does not point-sample
an aliased image, and it cannot distort a statistic. Measured both ways on the same capture
over the near-field sea band:

| statistic | full 960×672 | `[::3,::3]` 320×224 |
|---|---|---|
| ACF anisotropy | 3.69× / 1.97× | 3.63× / 1.94× |
| p5–p95 value spread | 0.3843 / 0.3569 | 0.3843 / 0.3529 |
| foam fraction (V>0.95) | 24.17% / 49.19% | 24.22% / 49.57% |

The two per-pixel statistics are invariant **by construction** (a lossless block upscale
counts every native pixel nine times, which cannot move a percentile or a fraction); the
residual ≤0.4 pt is patch-boundary rounding landing on a different native row, not
information loss. **Decimating is not merely safe, it is required for the ACF**: on the
upscaled image the half-widths are 5.86/1.59 px against the native 1.94/0.53 — i.e. three
times the native figure, dominated by the 3-px block edges rather than by texture.

Two standing cautions, neither of them about the decimation:
- **The stride is hardcoded to 3 in every tool and nothing checks it.** It is right only
  for a 960×672 capture. A different viewport changes `scale` (1920×1080 → 4×), and a
  viewport that is not an exact multiple also letterboxes, which misaligns the stride.
  Before decimating, **derive the block size and assert uniformity** rather than assuming 3.
- At native scale the sea ACF half-widths are **0.5–2 px**, so the anisotropy *ratio* is
  quantisation-limited and can be satisfied degenerately by making the vertical axis pure
  noise (R3 judge's point). Measuring on the upscaled image does not fix this — it only
  measures the upscale blocks. Pair the ratio with an absolute horizontal decorrelation
  length, as the sea section does.

## Frame catalog (`reference/`)

Curated frames (all PNG, extracted at exact timestamps; stage identity per the map above):

| file | shows |
|---|---|
| `title-screen-t74.png` | complete title: AFTER BURNER + sphere "II", INSERT COIN, CREDIT |
| `carrier-prelaunch-t84.png` | carrier astern, SCORE 0, STAGE 1, full clean HUD |
| `carrier-launch-t89.png` | deck roll at launch, carrier island w/ "128" board |
| `stage1-climbout-t92.png` | climb between cloud banks, level jet, small sprite |
| `stage1-flight-bank-t97.png` | stage-1 flight, banked right, world tilted |
| `stage1-hard-bank-t98.png` | hard bank — world roll ≈ 60.7° (Godot #128 measurement at t=98) |
| `stage1-lockon-missile-t100.png` | blue lock boxes, missile flame, explosion debris, 2 enemies |
| `stage1-lockon-island-t104.png` | lock boxes over island terrain, banked |
| `stage1-flight-bank-t112.png` | moderate bank — world roll ≈ 36.8° (Godot #128 at t=112) |
| `stage1-level-flight-t116.png` | near-level flight over open sea, bracket on distant enemy |
| `stage2-flight-t140.png` | stage-2 orange desert/autumn, banked |
| `stage3-night-level-t175.png` | stage-3 night, level flight — cleanest jet-scale frame |
| `stage3-night-lockon-t186.png` | night, banked, lock brackets + enemies |
| `stage8-canyon-explosion-t357.png` | canyon walls both sides, low horizon; the lower-left mass is a **fading smoke ring, not a fireball** — see Explosions |

Round-3 additions, from the 60 fps cache file (`ab2-longplay-60fps.mp4`, 1028×720 —
verified the SAME recording as the 686×480 map-keyed file: identical scene and HUD
values at t84/t116, durations 988.68 vs 988.70 s, so the stage map transfers directly):

| file | shows |
|---|---|
| `stage1-missile-salvo-t100.75.png` | multi-lock salvo mid-flurry: brackets, launch smoke, kills |
| `stage2-start-bonus-tally-t124.png` | stage-end tally card "HIT COUNTS 8 / POINTS 160000" + STAGE 2 |
| `stage3-reload-tanker-t165.png` | mid-air tanker overhead + cyan "RELOAD WEAPONS" text |
| `stage4-vulcan-stream-t214.png` | player vulcan stream: orange puff column, astern view |
| `stage4-barrel-roll-t222.png` | barrel roll mid-maneuver: inverted jet over a LEVEL horizon |
| `stage5-runway-restock-t252.png` | runway flyover: trucks, ground crew, motorbike, stock refilling |
| `stage7-enemy-shot-train-t330.png` | enemy shot train crossing the frame + debris burst |

Round-4 additions, from a THIRD source: `ab2-gameplay.mp4` (866 s, 30 fps, 480p, cached
beside the longplays via the youtube-reference skill from
https://www.youtube.com/watch?v=8d-S1kcjieA). It is a different recording with its own
timeline, cited as `gp tN`, and has **NO stage↔timestamp map** — it was fetched because
the skilled longplay contains no player deaths; use it for death/respawn/continue facts
only, never per-stage claims:

| file | shows |
|---|---|
| `death-starburst-gp-t202.png` | player death: screen-filling multi-lobe starburst at the jet |
| `respawn-ready-gp-t207.png` | respawn: oversized jet sliding in from bottom + "READY" text |
| `continue-card-gp-t261.png` | out of lives: "CONTINUE PLAY / 10 / INSERT COIN" over live world |

Plus the 9 screenshots inherited from the Godot repo (`ab2-arcade-*.png/jpg`): desert,
desert-explosions, night-banking, night-missiles, closeup-enemies, coastal-banking,
city-stage, huge-explosion, reload-dorsal. `ab2-arcade-reload-dorsal.jpg` (jet astern,
isolated on black) is the player-sprite structure reference.

> **CORRECTED R5b — "these carry no proven stage identity" was false for four of the nine,
> and it cost a round.** `src/game/stage.js` repeated the claim for
> `ab2-arcade-night-banking.png` and confined stage-3 city lights to a near-field sliver on
> that basis; the resulting build drew every light below row 199 of 224, entirely behind the
> bottom HUD — **zero visible lights and a passing mean-V statistic**. The identity was
> readable the whole time: **crop the bottom HUD strip and read the STAGE digit.** Done on
> all nine (crops re-derivable: bottom 14 %H, x 0.52–0.95 W, nearest-neighbour upscale):

| frame | stored size | STAGE digit | confidence |
|---|---|---|---|
| `ab2-arcade-desert.png` | 320×224 **native** | **2** | certain |
| `ab2-arcade-night-banking.png` | 320×224 **native** | **3** | certain |
| `ab2-arcade-desert-explosions.png` | 400×280 (1.25×) | **2** | certain |
| `ab2-arcade-closeup-enemies.jpg` | 1440×1080 | **2** | certain |
| `ab2-arcade-night-missiles.jpg` | 181×127 (**sub-native**) | 3 | low — glyph is ~4 px wide before JPEG |
| `ab2-arcade-reload-dorsal.jpg` | 181×127 (**sub-native**) | 3 | low — same |
| `ab2-arcade-city-stage.jpg` | 181×127 | unreadable | — |
| `ab2-arcade-coastal-banking.jpg` | 181×127 | unreadable | — |
| `ab2-arcade-huge-explosion.jpg` | 181×127 | unreadable | — |

> So: the two **native-resolution** frames in this repo are a **stage-2** frame and a
> **stage-3** frame, and both are now stage-anchored. The five 181×127 JPEGs are 0.57× of
> native and lossy — treat anything measured on them as palette-and-structure evidence only,
> which is what the Explosions section already says. **Before declaring a frame unidentified,
> read its HUD digit.**

## Sky palettes

MEASURED this pass (modal color of band y=55–130, full width; share = modal fraction —
AB2 skies are flat fills, so the mode is exact):

| stage | frame | sky top | modal share | near-horizon |
|---|---|---|---|---|
| 1 | t116 | `#009eff` (also at (343,20)) | 0.82 | same — no glow |
| 2 | t140 | ~~`#f27500`~~ → **`#e67300`** (see below) | 0.60 | glows toward gold near terrain; t144 (600,100) reads `#ea9631` |
| 3 | t175 | `#000000` | 0.91 | near-black; a thin dark-blue band sits just above terrain: (620,308) = `#000131` |

> **THE LONGPLAY VIDEO IS NOT LEVEL-ACCURATE. Re-derive from a native screenshot where one
> exists (MEASURED R5b).** The arcade's palette ladder tops out at **`0xf7`** (247) — this
> document's own "colour ladder" section is built on that, from the native PNGs. Every frame
> taken from `ab2-longplay.mp4` instead tops out at **`0xff`**. Measured on art that is
> pixel-identical in every frame, the bottom HUD:
>
> | source | HUD white | HUD red |
> |---|---|---|
> | `ab2-arcade-desert.png`, `ab2-arcade-night-banking.png` (320×224 **native**) | `#f7f7f7` | `#f70000` |
> | `t089`, `t116`, `t140`, `t175` (686×480 video), `t100.75` (1028×720 video) | `#ffffff` | `#ff1000`–`#ff1400` |
>
> So the video chain expands levels (and lifts chroma: pure red gains ~`0x10` of green).
> **Any sky/ground constant quoted to the exact level off a video frame is systematically
> brighter than the arcade's.** Where a native frame of the same stage exists, it wins:
>
> | stage | published (video source) | **native re-derivation** | ADOPTED Godot table |
> |---|---|---|---|
> | 2 sky top | `#f27500` (t140, 686×480) | **`#e67300`** — `ab2-arcade-desert.png`, 320×224, modal of band y=55–130/480-equivalent, share **0.661**; corroborated `#e67300` share 0.613 on `ab2-arcade-desert-explosions.png` (400×280) | `#e67100` |
> | 3 sky top | `#000000` (t175) | **`#000000`** — `ab2-arcade-night-banking.png`, share 0.883 | `#000005` |
>
> Stage 2's published `#f27500` is **12 levels brighter in R** than the arcade's own
> `#e67300`; the "small deltas vs my reads are re-encode noise, both chains are cited" note
> below is now resolved — the ADOPTED chain was right and the video read was the artifact.
> Stage 3 needs no change. **Stage 1 cannot be re-derived: there is no native stage-1 frame
> in this repo**, so `#009eff` keeps its video provenance and should be assumed to carry the
> same expansion (the ADOPTED `#009fff` is the better value for the same reason).
> Neither 686×480 (2.14375×) nor 1028×720 (3.2125×) is an integer multiple of 320×224, so
> **native cannot be recovered from the video by decimation** — only a native screenshot
> settles a level.

> ### AND IT IS NOT SPATIALLY ACCURATE EITHER — a scale rule, measured (R6)
>
> The level expansion above is only half of it. **At small spatial scales the video is not a
> degraded copy of the arcade's art; it is a different signal.** Measured on the same arcade
> game, same ground class, with one operator:
>
> | | unique colours | H-identity | V-identity |
> |---|---|---|---|
> | `ab2-arcade-desert.png` ground rows 140–195, **true native** | **47** | **65.0 %** | **64.4 %** |
> | `ab2-arcade-night-banking.png` ground rows 140–195, **true native** | **28** | **78.2 %** | **72.9 %** |
> | **t116 sea band** `y[340,415] x[40,640]`, **686×480 video** | **19 896** | **17.5 %** | **11.4 %** |
> | same band, BOX-decimated toward native | 6 972 | 3.4 % | 1.6 % |
> | same band, NEAREST-decimated toward native | 6 281 | 5.4 % | 2.5 % |
>
> **19 896 colours in a 600×75 band of hardware that can emit 31 rungs per channel.** Nearly
> every pixel in that band is unique. Decimating does not recover it — a non-integer resample
> of noise is still noise. (The world lane independently measured t116 at 2.8 % V-identity on
> its own band and reached the same conclusion; two regions, two tools, same answer.)
>
> **So: which statistics survive the video, and which do not. Measured, not asserted:**
>
> | class | survives? | evidence |
> |---|---|---|
> | **Large-region modes and geometry** | **YES, exactly** | t116 sky modal colour `#009eff` at **99.5 %** of the band; bank widths at 10–40 %W; horizon height; composition fractions |
> | **Threshold-area fractions** | **YES, with a named bias** | foam `V > 0.95` on the t116 band: **23.4 %** at 686×480 (this document's own published figure, reproduced exactly), **24.0 %** NEAREST-decimated, **18.0 %** BOX-decimated. Nearest is faithful; **BOX averaging costs ~5 points downward** because averaging pulls crest pixels under the threshold |
> | **Exact-equality adjacency (Criterion B) and lag-1 correlation** | **NO — destroyed** | the table above: 17.5 / 11.4 against native 65–78 / 64–73 |
>
> **Rule.** A statistic whose kernel is **one or two pixels wide** may not be measured on a
> video frame, in either direction, and a criterion fitted to one is fitted to the codec.
> A statistic that integrates over **tens of pixels or more** is safe. If you use BOX
> resampling to bring the two sides to a common grid, say so and carry the ~5-point
> deflation; prefer NEAREST for threshold statistics.
>
> **The hole this leaves.** The three statistics it disqualifies are all stage-1 **sea**
> statistics, and **we hold no true-native stage-1 frame** — so there is no second source to
> fall back on, the way stage 2 fell back on `ab2-arcade-desert.png` for its sky. See the two
> retirements in the sea section, and note that a single native stage-1 screenshot would now
> settle **four** separate open items: the `#009eff` sky level, Criterion B's floor on sea,
> the decorrelation band, and the cross-track anisotropy target. It is the highest-value
> acquisition available to this project.

ADOPTED — all-23-stage sky table: `../afterburner/scripts/stage/stage_data.gd` `STAGES`
(sky_top/sky_horizon per stage; measured as modal color of y=55–150 over 5 frames per
verified span). Key values: 1 `#009fff`, 2 `#e67100`→`#f0d100` horizon glow,
3 `#000005`, 4 `#009f93`, 8 canyon cream `#faecb0`, 9 snow `#b5cfd7`, 14 gold
`#ffc600`→`#fd9008`, 16 lavender `#a9a8fd`, 23 `#009eff`. (Small deltas vs my reads are
re-encode noise; both chains are cited.) Only stages **2, 14, 17, 20, 22** have a
measurable horizon glow; every other stage is ONE flat color top-to-horizon. Stage 2's
sky is flat for the first ~80% of its height before the glow starts (measured: `#e67100`
pixel-identical y=60→228 of a horizon at y≈268 — `game_world.gd` SKY_FLAT_FRACTION).

## Ground / terrain palettes

ADOPTED from `stage_data.gd` (#124 pass — hue-histogram method over variance-gated
frames, two independent corroborators, reproducible via
`../afterburner/tools/measure_ground_palette.py --stage N`). Only 9 of 23 stages were
measurable; the rest are flagged UNMEASURABLE there with per-stage reasons. The measured ones:

| stage | biome | H/S | V75 (light) | V25 (dark) |
|---|---|---|---|---|
| 1 | sea | 235°/1.00 | 0.925 | 0.796 |
| 2 | desert scrub | 35°/0.82 | 0.733 | 0.441 |
| 4 | forest | 125°/1.00 | 0.416 | 0.282 |
| 8 | canyon | 35°/1.00 | 0.831 | 0.529 |
| 10 | dry scrub | 35°/0.77 | 0.771 | 0.469 |
| 14 | palms/gold | 55°/0.70 | 0.576 | 0.248 |
| 15 | dry grass | 55°/0.99 | 0.518 | 0.259 |
| 16 | city | 205°/1.00 | 0.673 | 0.478 |
| 23 | ocean/carrier | 235°/1.00 | 0.939 | 0.806 |

Stage 1 extras (ADOPTED, #135): island vegetation green H=120° S=1.0 V75=0.514; canyon
wall grey-green stage 8 `H 64.6° S 0.25 V75 0.459`, stage 17 `H 111.3° S 0.17 V75 0.353`.
AB2 ground is **dithered/streaked, not flat** (stage-1 sky modal share 97.8% vs ground
5.7% — same source).

### Stage-2 open plain — publish a RANGE, and know what the statistic actually counts (MEASURED R5c)

**Source** `.reference-cache/video/ab2-longplay.mp4`, STAGE_MAP-verified stage-2 span
**t = 124.0–156.0 sampled at 0.5 s, n = 65**, stored 686×480; stage digit read as **2** on
the eight frames cropped and looked at (`tools/out/criteria-fix-r5c/annot-high.png`,
`annot-low.png`), so stage identity is confirmed on the frames and not only by the map.
**Operator** `tools/measure_plain_share.py` — fraction of the ground band **y[310,420]**
(64.6–87.5 %H), full width, whose colour is within **Chebyshev 24** of `#e67300`. Instrument
control `--synthetic` is exact to **0.000000 %** on both metrics, including pixels placed at
the boundary of each (`#e67300+(24,0,0)` passes both; `+(14,14,14)` passes Chebyshev and
fails Euclidean), so a one-level slip in the comparison would show as a whole-row error.

| | min | p25 | **median** | p75 | p90 | max |
|---|---|---|---|---|---|---|
| **arcade, n = 65** | 0.00 | 1.11 | **19.72** | 39.26 | 50.91 | 63.58 |
| same, Euclidean 24 | 0.00 | 0.35 | 18.32 | 38.13 | 49.47 | 61.50 |
| same, band y[340,420] | 0.00 | 0.20 | 15.74 | 38.12 | 47.27 | 60.63 |
| same, x[40,646] | 0.00 | 0.60 | 15.73 | 38.12 | 51.40 | 65.31 |

**There is no single flat-fraction target — the thing to reproduce is the VARIATION.** The
band is empty of plain (<1 %) in **16 of 65** frames and over 28 % in **23 of 65**. Both ends
are the arcade; a build sitting at either one is wrong.

**The accept band for ours: median 12–26 %, max ≥ 45 %, and at least 15 % of frames below
1 %.** Drawn wide on purpose — the statistic is a positional lottery (below) — and it is
stated as a distribution because a point value cannot be satisfied honestly.

**Correction to the previously published arcade figures.** "t134 0.0 %, t138 0.0 %, t142
33.0 %, t150 8.4 %, median 4.2" is a **4-frame sample of a statistic whose interquartile
range is 1.1–39.3**, and it landed in the low tail: its median 4.2 is the midpoint of the two
lowest of its four draws. On the full span the median is **19.7 %**. The conclusion drawn
from it — that ours (self-reported 0.5–28.0 %, median 9.9, on the R5 working tree) "brackets
both range and median" — **does not survive the larger sample**: our median is about half the
arcade's, and our maximum sits below the arcade's p75, so we never reach the regime the
arcade is in for **a third of the span**. The direction of the remaining work is *more* open
plain and *more* frame-to-frame swing, not less. Robust to the operator: all four variants
above agree on median 15.7–19.7 and on 22–23 of 65 frames above 28 %.

**I could not reproduce the published t142/t150 values with any variant I tried** (closest:
x[40,646] gives 33.49 / 9.09 against the published 33.0 / 8.4; full-width Chebyshev gives
35.42 / 13.20). The published operator had an unstated column restriction or object
exclusion. This is field 3 of the citation rules above, and it is why they now exist.

**What the statistic actually counts, and why its name is wrong.** Stage 2's sky and its open
plain are **the same colour**. The target `#e67300` is this document's own *native stage-2 sky
top*; on the video it reads `#f27500`, and `#f27500` passes a ±24 Chebyshev test against
`#e67300` (Δ = 12). Measured on pure-sky rows y[60,90]: **96.9 / 98.2 / 72.8 / 84.4 / 76.5 %**
of them pass the "open plain" mask at t136.5 / t155.0 / t125.0 / t134.0 / t150.0, and the
modal colour of the *band's own matched pixels* is `#f27500` — identical to the sky's. Labelled
by 8-connectivity, **the band's orange is one connected region with the sky in 63 of 65
frames** (median terrain-enclosed share **0.18 %**; the two frames reading 0 % sky-contiguous
are seed failures — a cloud covering the seed rows — not enclosures, confirmed by cropping
them). The band's top edge is only **10 px below the nominal level horizon** (62.5 %H = y 300),
so under world roll the sky genuinely enters it and cannot be told apart.

So read this number as **"fraction of the near-ground band that is uncluttered orange"**, not
as "plain, as distinct from sky". It is still the right gate for the defect it was raised
against — the arcade's stage-2 ground alternates between dense clutter and wide flat orange,
ours did neither — but **do not derive a plain *colour* from it, and do not use it to locate a
horizon.** Re-open condition for a true plain-only figure: a horizon fit (`tools/measure_horizon.py`)
or a roll-angle gate, so sky pixels can be excluded rather than assumed absent.

**Sea texture, stage 1 — direction and contrast (MEASURED; CORRECTS this doc's earlier
"along-track" wording, which was BACKWARDS and caused a wrong implementation):**

- **Direction: the sea is CROSS-TRACK dominant** — the streaks run HORIZONTALLY on
  screen (wave rows perpendicular to the flight axis), so horizontal autocorrelation is
  far longer than vertical. Measured on the value channel of t116 (near-level, so screen
  axes ≈ track axes), normalized ACF at pixel lags 2/4/8:
  - near-field band y[340,415] x[40,640]: horiz 0.66/0.49/0.31 vs vert 0.37/0.05/−0.06
    (vert/horiz 0.55/0.10/−0.19)
  - mid band y[300,340] x[40,180]: horiz 0.87/0.74/0.59 vs vert 0.43/0.34/0.25
  - t97 sea y[330,420] x[30,400]: vert/horiz 0.64/0.49/0.39
  This corroborates the R2 judge's independent 0.20–0.32 vert/horiz readings. The
  prototype's OCEAN_ANISO magnitude ~2.1–2.3× (ADOPTED #135) stands, but the direction
  word "along-track" was this doc's own gloss, not in the Godot source, and was wrong:
  **ridges must run across the travel axis so scrolling moves them visibly** — ridges
  along the travel axis slide along themselves and read as a dead ground.
- **Contrast / foam (binding texture stats, not just palette)**: on the same t116 sea
  regions, value-channel p5–p95 spread = **0.329** (near-field band) / **0.302**
  (whole sea y250–420 minus the jet bbox), and the fraction of sea pixels brighter than
  V 0.95 (foam/sparkle) = **23.4%** (near-field band) / **38.8%** (whole sea). The R2
  judge independently measured 0.345 / 38.6% — corroborated. The R2 build measured
  0.019 / 1.5% (judge's figures): the arcade sea is high-contrast and heavily
  foam-flecked, not a smooth hue carpet.

### Sea anisotropy: ALWAYS pair the ratio with an absolute length (MEASURED R5)

R3's judge established that **a bare anisotropy ratio can be satisfied degenerately** —
make the vertical axis pure noise and the ratio goes to infinity without the horizontal
axis ever becoming longer. The paired criterion has lived only in `judging/R3/report.md`
until now; it belongs here.

> **RETIRED R6 — ledger row 16. The band was fitted to the codec, not to the arcade.**
> ~~GATE: horizontal decorrelation length within ±30% of 1.73 native texels (i.e. 1.21–2.25)
> AND horiz/vert ratio ≥ 2.0 — both on 320×224-native pixels.~~
>
> **1.73 texels comes from `stage1-level-flight-t116.png`, a 686×480 video frame, and a
> decorrelation length at lag 1–2 is a two-pixel-kernel statistic** — precisely the class the
> scale rule above disqualifies, and precisely why Criterion B refuses video outright. The same
> frame reads **H-identity 17.5 % / V-identity 11.4 % and 19 896 colours** on that very band,
> against 65–78 % and 28–47 colours on the arcade's true-native ground. A decorrelation length
> measured there is a property of the re-encode, and ±30 % of it is a precision claim on noise.
>
> **No replacement is published, because none can be with the evidence we hold** (no true-native
> stage-1 frame). This is a *withdrawal*, not a restatement: the world lane read **11.6 texels**
> against the band and correctly **did not tune to it**, which was the right call and is the
> behaviour to repeat. Re-open the moment a native stage-1 screenshot exists.
>
> **What survives and is still binding is the SHAPE of the criterion, not its numbers**: R3's
> judge established that a bare anisotropy ratio is satisfiable degenerately — make the vertical
> axis pure noise and the ratio goes to infinity without the horizontal axis lengthening. That
> argument needs no arcade number. **Any anisotropy figure must still be reported with its two
> absolute lengths**, so a reviewer can see whether the ratio was earned or manufactured. The
> R6 build is a worked example in the right direction: it cleared the ratio at 6.18× while
> running `hx 74.41` against the arcade's 41.63 — nearly twice as smooth in absolute terms —
> i.e. it was passing degenerately, exactly as warned.

**Operator**: value channel (`max(RGB)/255`) of the near-field sea band; mean-subtract;
1-D normalised autocorrelation along each axis; **decorrelation length = the lag at which
the ACF first crosses 0.5**, linearly interpolated, expressed in **native texels**. On an
upscaled arcade frame divide the frame-pixel lag by the upscale factor (t116 at 686×480 is
686/320 = **2.1437** px per texel). Band = t116 `y[340,415] x[40,640]`, or the same
fractions elsewhere — at 320×224 that is `y[159,194] x[19,299]`.

| | horiz | vert | ratio |
|---|---|---|---|
| **arcade t116 near-field** | **1.73 texels** | 0.74 | **2.34** |
| ours, judge-R4 `neutral` | 1.95 | 0.53 | 3.68 |
| ours, judge-R4 `flight` | 2.02 | 0.53 | 3.80 |
| ours, judge-R4 `best` | 1.79 | 0.90 | 1.99 |

Control: this operator returns the arcade's published **1.73 / 0.74 / 2.34** to the digit,
and reproduces R3's reading of our build (1.92 horiz, ratio 3.63) at 1.95 / 3.68.

**Reading of the current build**: horizontal length is *right* (1.79–2.02, inside ±30%);
the ratio is high because our **vertical** axis is too decorrelated (0.53 against the
arcade's 0.74) — i.e. the ratio is inflated by vertical noise, which is exactly the
degenerate mode the pairing exists to catch. The fix is more vertical coherence, not more
horizontal stretch. Note `best` sits at ratio **1.99**, a hair under the 2.0 gate.

**INTERACTION WARNING (R6): the stage-1 Criterion B fix runs straight through this gate.**
Criterion B asks for ≥50 % identical vertically adjacent pairs on the sea, which means making
the sea *more vertically coherent*. This gate's `ratio ≥ 2.0` is a **lower** bound on
horiz/vert anisotropy, and our `best` tuning already sits at **1.99**, a hair under it. Raising
vertical coherence pushes the vertical decorrelation length up and the ratio **down**, i.e.
toward failing this gate — while the same change is what passes Criterion B. **They are not
actually in conflict**: the arcade satisfies both at once (ratio 2.34, V-identity 68.5 %),
because its vertical coherence comes from *flat dithered bands*, not from a smoother noise
field. But a lane that tunes for one without watching the other will trade a failure for a
failure. **Report the ACF triple and the Criterion A/B quadruple in the same table, on the same
frames** — `tools/measure_sea_acf.py` and `tools/measure_criterion_ab.py` exist for exactly
this pairing. If they cannot be satisfied together, say so with both sets of numbers rather
than picking the one that passes.

**Do not confuse this ratio with the 2-D ACF half-width anisotropy** quoted elsewhere
(R4's "6.51× near-field, arcade 4.43×"). That is a different operator on a different patch
and its numbers are not interchangeable with these. Whichever you use, state it.

#### The 2-D ACF half-width anisotropy: 6.51× is RETIRED (MEASURED R5b)

**6.51× was floor-limited, and the arcade figure it was compared against was measured at a
different resolution.** Both faults verified independently of the world lane that reported
them, with a second ACF implementation, on the same inputs.

*Fault 1 — the floor binds.* `tools/measure_ground.py`'s `autocorr_anisotropy` returns
`max(hx,hy) / max(min(hx,hy), 1)`. On `tools/out/world-r5b/sea-check/frame-0001.png` at the
tool's own auto patch: native 320×224 gives hx **6.543**, hy **0.676** — the shorter
half-width is *below one pixel*, so the divisor is clamped to 1 and the tool prints
**6.54×** where the unfloored ratio is 9.67×. The same frame at the stored 960×672 prints
**9.63×** from identical structure (half-widths scale by exactly 3.00, as they must — the
capture is an exact nearest-neighbour 3× replication). A published ratio of 6.51× is
therefore an artifact of the clamp, not a property of the texture. The auto patch at native
is also only 53×53 px, which is thin evidence for an FFT autocorrelation.

*Fault 2 — the comparison crossed resolutions.* Arcade frames are 686×480 interpolated
upscales, and interpolation lengthens correlation lengths. At a **common 686×480 with a
common filter** (ours resampled 960×672 → 686×480 bilinear; arcade `t116` as stored; same
patch `(240,260)–(445,465)`):

| | hx | hy | ratio |
|---|---|---|---|
| ours, resampled to 686×480 | **44.607** | **9.016** | **4.95×** |
| arcade t116, as stored | **41.626** | **7.991** | **5.21×** |

Agreement within **7 %** on both axes and **5 %** on the ratio. **Restate the figure as
4.95× vs arcade 5.21× at a common 686×480. Retire 6.51×** wherever it is quoted (it is also
in `STATUS.md`'s "what works" table).

> **AND NOW THE RESTATEMENT ITSELF IS RETIRED — ledger row 17 (R6).** The R5 repair fixed the
> *comparison* (one resolution, one filter) and left the *source* untouched, and the source is
> the problem. `hx = 41.626` for the arcade is measured on `t116`, a 686×480 video frame whose
> same band carries **19 896 colours and 11.4 % V-identity** — see the scale rule above. An ACF
> half-width is a short-kernel statistic; on that band it is measuring the codec's correlation,
> not the arcade's water.
>
> **It was already visible that the number does not hold still.** The R6 world lane ran the
> same tool two ways on one build: **3.04× at the common 686×480** and **4.56× at native**, and
> the two move in **opposite directions** against the previous round. A statistic that reverses
> its sign with the resolution it is read at cannot adjudicate anything, and picking the
> flattering one is not available. The lane reported both rather than choosing — that is the
> correct behaviour and it is why this was caught.
>
> **Why "pick a common resolution" cannot rescue it.** There is no clean common grid for a
> stage-1 sea comparison. At 686×480 **our** side must be upsampled 2.14× — a non-integer
> resample, the thing Criterion B forbids. At native 320×224 the **arcade** side must be
> decimated 2.14× from video — also non-integer, and demonstrably destructive (the table above:
> 1.6–2.5 % V-identity after decimation). One side is always resampled wrongly, because **the
> arcade side only exists at a resolution the art was never drawn at.**
>
> **No target is published for stage-1 sea anisotropy.** The paired-lengths *rule* above still
> binds; the *numbers* do not. Report `hx`, `hy` and the ratio with the resolution named, as a
> regression guard between our own builds on a fixed operator — never as an arcade-fidelity
> figure — until a native stage-1 frame exists. Ledger rows 6, 16 and 17 are one defect seen
> three times: **this statistic has now been retired, restated and retired again, and every
> round of that was spent on a number that was never measurable from the evidence we hold.**

**Consequence: R4 gap 10 (sea coarseness / grain too fine) is WITHDRAWN as a defect.** The
evidence for it was the resolution mismatch. Nothing measured is left to fix, so the
hypothesised near-field sparkle layer should not be built on this evidence.
**Re-open only against a common-resolution, common-filter comparison**, stated as such.

**Rule this earns:** an ACF ratio is meaningless unless both sides were measured at the same
resolution with the same filter, and unless the shorter half-width is above the estimator's
floor. Quote `hx` and `hy` with every ratio so a reader can see when the floor binds.

## Horizon

- MEASURED level-flight horizon rows (median of per-column scans, 6-consecutive-row
  deviation >60 sum|ΔRGB| from sky mode, 66 columns):
  - t116 (stage 1, near-level): y=240 → **0.500 H** (p10–p90 201–278 — boundary is mildly tilted/ragged)
  - t175 (stage 3, level): y=310 → **0.646 H** (tight: p10–p90 274–322)
  - t140 (stage 2, banked): median 0.446 H but p10–p90 127–410 — a banked frame has no
    single horizon row; do not measure horizon on banked frames with row scans.
- The horizon **moves with player altitude/maneuver** — 0.50 vs 0.65 above are both real.
  ADOPTED cruise constant from the prototype: **0.625 H** (60–65%H band). Canyon stages
  sit near the top of frame: stage 8 = **0.13 H**, stage 17 = **0.07 H** (ADOPTED #120 —
  medians over 41 frames/span; stage 17 is the weaker value; in-flight p10–p90 roams
  ~5–27%H on both). See `stage8-canyon-explosion-t357.png`: walls fill the frame, sky is
  a thin band.
- **Horizon tilt when banking** (ADOPTED #128, measured on verified stage-1 span):
  the whole world rotates **rigidly about the screen centre** — best-fit centre
  (0.51 W, 0.49 H) ± 21 px over 42 frames; line-fit residual 0.55–1.8 px (rotation, not
  shear). Peak |roll| **67.9°**, saturating 65–68°. Roll rate while rolling: median
  **74.5°/s** (p25 47.4, p75 82.9); the t=95.2→95.9 ramp measures 7.4°→66.8° ≈ 80°/s,
  so full 0→65° takes ~0.8 s. **The HUD does not rotate.** Horizon descends to the right
  when banking right (see t97/t98).

## Player jet

- **Structure** (astern): see `ab2-arcade-reload-dorsal.jpg` and the measured geometry in
  `../afterburner/scripts/player/player_jet_2d.gd` (#112 — wing band ~0.08 half-spans
  thick on the nozzle line, twin canted fins, canopy is the topmost body element,
  violet-magenta canopy `#9d3aca`, airframe greyscale ladder V = 0.98/0.90/0.82/0.75 with
  near-black nacelles V≈0.33 measured at t=557; warm-tinted shadow grey `(164,132,132)`
  from `ab2-arcade-desert.png` — NOT cream/beige).
- **Fin height is a LARGE share of the silhouette** (MEASURED on the 60 fps t175 frame,
  1028×720, mask V>0.12 in window y[335,465] x[325,720]; CORRECTS R1's "≤25% of sprite
  height" acceptance bound, which contradicted the reference and induced the build's
  clipped "detached ears"): silhouette spans rows 343–464 (122 px); the per-row width
  profile stays narrow (3→53 px — twin fins + spine) from the top down to row ~411–414,
  where the wings erupt to the full 330 px span. Fin structure above the wing plane =
  68–71 px = **56–58% of total silhouette height** (wing-onset threshold 30%/50% of max
  span respectively). Corroborates the R2 judge's 57–62%. The fins are TALL blades, not
  stubs. **Caveat added R5**: this share is frame-dependent — the same operator on t168
  gives 54/113 = **47.8%**, because the nacelles widen higher up in that pose. Treat
  56–58% as a t175 fact, not as an acceptance bound; the acceptance bounds are the
  silhouette discriminators below.

### Airframe VALUE — the arcade's jet is WHITE (MEASURED R6 — REPLACES R4's V ≤ 0.77 ceiling)

> **RETIRED: "nothing on the airframe goes above V 0.77"** (`judging/R4/art-critique.md`
> lines 557–571), ledger row 11. It is **inverted**. R4 read `#c5c5ad` as "the arcade's
> brightest airframe pixel"; it is the brightest **cluster centroid of a median-cut
> quantization**, and a quantizer averages. The arcade's own jet is brighter at its *median*
> than our jet is at its *maximum*. Two definitions of one statistic quoted as one number —
> the same failure as the jet-centroid bias and ledger row 14. Found by the R5 art critic,
> independently confirmed by the R5 judge, reproduced here on a third implementation.

**Operator VALUE-STAT** (`tools/measure_value_stats.py`, `--selftest` PASS: grey ramp, saturated-
red rejection, `#c5c5ad` = V 0.7725 exactly, filter-boundary behaviour, and a two-blob component
control):

1. Isolate the airframe. **Arcade**: an explicit box, or `--isolate largest` (largest
   8-connected achromatic component) when the jet sits on a saturated sky. **Ours**: the
   jet-on/jet-off difference mask.
2. Keep **achromatic pixels only, S < 0.25**, where `S = (max−min)/max` and `S = 0` when
   `max = 0`. This is what excludes the afterburner glow, the magenta canopy, the blue sky and
   the orange ground; it is half the operator, and changing it changes every number below.
2b. **`V = 0` PIXELS ARE KEPT. There is no value floor** (ADDED R7, ledger row 22). This clause
   was missing for a round and it is worth 0.16–0.20 of median; see the box below before you
   quote any figure from this section.
3. V = max(R,G,B)/255. Report median, p90, max, and share V > 0.80.
4. **Dump the mask and look at it.** Not optional — see the worked failure below.

> ### The V floor is the whole disagreement, and it is really a question about the KEYLINE
>
> **Ledger row 22.** Steps 1–3 above did not say what happens to pure-black pixels, so two
> faithful readers built two operators. REFERENCE's published anchor keeps `V = 0`; the sprite
> lane's V-CENSUS (`S < 0.35 ∧ V > 0.08`) drops it. Both then reported **0.839** for their own
> side and the agreement was read as corroboration. It is a coincidence: **0.8392 = 214/255 is
> one rung of the Sega ladder** and the two operators happened to land on it from opposite
> directions. All four readings, reproduced by this lane (`tools/measure_value_stats.py`,
> `--selftest` PASS, and a second direct implementation agreeing to 1e-16):
>
> | reading | ~~ours, day sheet, `e8fed58`~~ (superseded, kept for the diagnosis) | **OURS, SHIPPED SHEET, `82365e9`** | **arcade native desert** x[85,182) y[82,140), **stage 2** | arcade **t116** video crop, stage 1 |
> |---|---|---|---|---|
> | **`S<0.25`, V = 0 KEPT — THE PUBLISHED OPERATOR** | ~~0.643~~ (n 1 490) | **0.8392** (n 836) | **0.839** (n 608) | **0.804** (n 3 121) |
> | `S<0.25`, `V>0` | 0.839 (n 1 033) | **1.0000** (n 678) | 1.000 (n 473) | 0.812 (n 3 009) |
> | `S<0.25`, `V>0.08` | 0.839 | 1.0000 | 1.000 | 0.812 |
> | `S<0.35`, `V>0.08` (V-CENSUS) | 0.839 | **0.9686** (n 961) | 0.969 (n 672) | 0.871 |
> | **share of the kept mask at exactly V = 0** | **30.7 %** | **18.9 %** | **22.2 %** | **3.6 %** |
>
> ### THE 0.643 IS STALE AND THE MEDIAN CLAUSE IS MET (REPAIRED R8, judge R7 gap 6b)
>
> **`0.643` was measured at `e8fed58`, before the R7 sprite sheet landed in the same tree, and
> four places in this document still said "still missed, at 0.643" when it was not.** That is
> this project's documented worst failure mode — *"the R5 judge recorded the throttle as wired
> with no player control, a gap that did not exist, and the R6 flow lane spent part of its round
> disproving it."*
>
> **Shipped figure, re-derived independently in R8** from the R7 judge's `jet-on` / `jet-off`
> captures at `82365e9` (both pre-dating any R8 edit to the tree): difference mask **1 513 px**,
> span **116 native px = 36.25 %W**, **10 colours** — and all three readings land on the
> arcade's exactly: **A 0.8392 · B 1.0000 · C 0.9686** against the arcade's 0.839 / 1.000 /
> 0.969. **All three clauses of the band are met on the shipped tree.** The R8 sprite lane is
> live on this file; re-derive before quoting rather than copying this row forward.
>
> **PUBLISH THE BLACK SHARE BESIDE READING A — IT IS A STEP FUNCTION (R8).** The mask's whole
> achromatic census is five values: V = 0 (158 px), 0.6431 (148), 0.8078 (32), 0.8392 (126),
> 1.0000 (372). The median is therefore a step in the black count, and the width of the step
> **depends on how you perturb it**:
>
> | perturbation of the shipped mask | window where reading A stays 0.8392 | ours at 18.9 % |
> |---|---|---|
> | keyline grows/shrinks: black ↔ the brightest tone (V 1.000), **n constant** | **13.5 % – 28.5 %** | 5.4 points above the lower step, 9.6 below the upper |
> | black added or removed, non-black distribution held fixed | 7.2 % – 33 % | comfortably inside |
> | black ↔ the V 0.6431 tone, n constant | **no step anywhere in range** | — |
>
> The R7 judge quoted the sprite lane's sweep as *"0.839 only while black sits between 6.5 % and
> 21.5 %, ours 2.6 points from the upper step"*. **That window does not reproduce under any
> perturbation of the shipped mask's own histogram** — that sweep ran over *variant sheets*,
> each with its own non-black distribution, which is a different population from perturbing one
> sheet. Both can be right; they are not the same statistic and **must not be quoted as one**
> (ledger rows 14, 27 — same family, third instance). The warning survives either way: **report
> the black share with reading A**, because a change to keyline *area* alone can move the median
> a full rung without anyone touching a palette.
>
> **What the statistic is actually measuring, and why "no floor" is the right choice.** The
> `V = 0` pixels are not noise to be filtered — they are **the sprite's dark role area**, and
> their share is the defect. Ours is a complete **1–2 px pure-black keyline around every edge**,
> 457 of 1 490 kept pixels (map: `tools/out/criteria-r7/arcade-combat/valuestat-ours-mask.png`).
> The arcade's 135 black pixels are **clustered** in the nacelle rings and the belly shadow, not
> drawn as an outline. Dropping `V = 0` deletes exactly the difference the criterion exists to
> see, which is why the floor is **not** adopted. The lever on this gap is role *area*, not a
> brighter white.
>
> **Two provenance warnings that follow from the last row of that table.** (1) The ACCEPT band
> below was fitted on **five 686×480 video crops** where the black share is 3.6 %, and anchored
> on a **true-native** frame where it is 22.2 %. Those are two populations; the band is wider
> than it looks and should not be read to two decimals. (2) t116's published median **0.816**
> does not reproduce exactly from the published box — this lane reads **0.804** (no floor) and
> **0.812** (`V>0`). All three are within one ladder rung (205/207/208 of 255). Treat the band's
> endpoints as rung-accurate, not decimal-accurate.

| population | stage (digit read) | V median | V p90 | V max | share V>0.80 |
|---|---|---|---|---|---|
| arcade t116 level, `reference/stage1-level-flight-t116.png` x[210,375) y[188,292) | **1** | **0.816** | 1.000 | 1.000 | 53.5 % |
| arcade t97 / t98 / t100.75 / t108 (R5 art critic, five frames incl. t116) | **1** | **0.776 / 0.890 / 0.922 / 0.914** | — | — | 45.0–65.1 % |
| arcade `ab2-arcade-desert.png` x[85,182) y[82,140), **true native, no video blur** | **2** | **0.839** | 1.000 | 1.000 | 59.5 % |
| same crop, all pixels (not the criterion — recorded so the two are not conflated) | 2 | 0.902 | 0.969 | 1.000 | 68.0 % |
| ours, daylight sheet, jet-on/jet-off difference mask (R5 judge, `53ce86b`) — **historic** | 1 | 0.643 | 0.773 | 0.773 (`#c5c5ad`) | 5.3 % |
| ours, daylight sheet, `e8fed58` — same operator, V = 0 kept (R7, span 116 px) — **historic** | 1 | 0.643 | 1.000 | 1.000 | 48.2 % |
| **OURS, SHIPPED SHEET `82365e9`**, same operator, V = 0 kept (R8, span 116 px, n 836, black 18.9 %) | 1 | **0.8392** ✓ | **1.000** | **1.000** | **63.4 %** |
| ~~ours, `e8fed58`, quoted in R6 as "0.839, matching the arcade"~~ | 1 | ~~0.839~~ | — | — | ~~69.5 %~~ |

> **The struck row is the V-floored reading compared against the arcade's unfloored one**
> (ledger row 22) — a different operator, not a different build. **The two 0.643 rows above it
> are historic, not current**: both pre-date the R7 sprite sheet. On the shipped tree **all
> three clauses of the band are met** — median **0.8392** inside 0.78–0.92, brightest body
> colour **1.000** ≥ 0.90, share above V 0.80 **63.4 %** inside the arcade's 45–65 %. The ten
> colours of the shipped mask, as a census so the next lane does not re-derive it:
> `#ffffef` 372 · `#f7e6b5` 283 · `#840000` 240 · `#000000` 158 · `#a48484` 148 · `#d6d6a4` 126 ·
> `#ef7300` 120 · `#ceb59c` 32 · `#ffd600` 26 · `#e694f7` 8.

### THE KEYLINE CRITERION, AND THE CLASS IT IS LICENSED OVER (published R8, ledger row 35)

**MEASURED (R7, reproduced by the R7 judge on every rim definition he tried):** the arcade's
**daylight aircraft have no black outline.** On `ab2-arcade-desert.png`'s player jet the rim is
**49.5 % `#840000`** — a one-sided dark-red shadow edge — and **0.00 % near-black**. The
load-bearing half is robust: the 0.0 % reproduces under two independently defined rims. The
**percentage is not**: rim n reads 444 or 624 and the `#840000` share 49.5 % or 35.6 % depending
on connectivity and mask, neither of which the operator states. **Quote the 0.0 %; do not quote
the 49.5 % without its rim definition.**

> **ACCEPT: perimeter near-black ≤ 2 %** — and **the class is EVERY AIRCRAFT SHEET IN THE BUILD,
> plus every procedural fallback and LOD that draws one.** That clause is not padding. R7
> measured this criterion, implemented it on the **player jet**, and called it closed; the R8
> enemy-art audit then found **all sixteen enemy sheets at 100.0 % near-black perimeter** while
> the three player sheets sat at 0.0–1.1 %. Every enemy in the game was caged in pure black
> beside a player jet that was not, for a round, under a criterion that was already measured and
> already shipped. Two further call sites carried it and were invisible to every capture: the
> **near-aspect procedural fallback** (runs only in the few frames before the sheets decode) and
> the **far LOD**. Current state: sixteen enemy sheets **0.0–2.1 %**, three player sheets
> **0.0–1.1 %**.
>
> **NOT licensed, and recorded as unmeasured rather than approved:** `missile.js`'s keyline.
> **No arcade measurement exists either way** — there is no isolated native missile sprite — so
> the enemy-art lane left it exactly as it was and said so. **An unmeasured object is not a
> passing object and it is not a defect either**; do not "fix" it to this criterion and do not
> record its silence as approval. It needs acquisition before it needs work.

**ACCEPT (daylight stages):** airframe achromatic-pixel **V median 0.78–0.92**, and the
**brightest body colour ≥ V 0.90**. The band is the five stage-1 frames' spread; the native
stage-2 frame sits at 0.839, inside it. The brightest-colour clause comes from the arcade's own
per-sprite palette (`#ffffef` and `#ffffff`, both V 1.000, in the daylight set under
Criterion A) and exists because a median alone can be hit by a flat mid-grey with no highlight.
**Night is a different palette and is not covered** — see the 8-colour night set under Criterion
A (brightest `#c5d6f7`, V 0.969).

> ### Night reading C sits 0.067 below the arcade ON PURPOSE. Do not "fix" it (RECORDED R7)
>
> **There is no night value gate, and that is the point.** The R7 sprite lane took the night
> sheet's reading C from **0.969** (the arcade's figure) to **0.902**, deliberately, and said
> so. This entry exists so the next lane does not read the regression as a defect and close it.
>
> **The mechanism is measured, not asserted.** The arcade's night jet spends **2.8 %** of its
> airframe on `#a4b5e6` and 14.9 % on `#8494c5`; ours spends **18.7 %** and 8.3 %. **The
> arcade's night and day sprites distribute their rungs differently from each other. Ours
> cannot — ours is one drawing indexed into two ladders.** Reading C is a function of that
> distribution, so matching it on night means mismatching it on day.
>
> **The one-line fix was identified and rejected on the standing rule.** Mapping night's second
> rung onto `#c5d6f7` recovers C = 0.969 *and* takes the night sheet to exactly 8 colours — the
> arcade's own count — and costs a real value step across the blades, engine bodies and lower
> fuselage. **Trading a visible value step for a number nobody is scored against is this
> project's named failure mode**, and the lane declined it. Correct call, recorded.
>
> **If a night gate is ever derived, derive it from the arcade's night rung distribution**, not
> by transplanting the daylight readings. And carry the standing thin-population caveat with
> any night figure: readings A and B see only **24.6 %** of the night sprite, because four of
> its six blue-greys fall outside `S < 0.25`.

**Provenance and bias, stated so the band can be attacked.** Four of the six arcade readings come
from 686×480 video upscales, where edge blur mixes airframe with sky. On a white jet over
`#009eff` that bias runs **up** at the edges, not down. The control against it is the **true
native** stage-2 frame — no re-encode, no upscale — which reads **0.839**, inside the band and
0.023 from the independently measured t116. Two instruments (R5 art critic's and this lane's,
written separately) agree on t116 to **0.015 in median and 0.8 points in share**; the whole
difference is the airframe box.

**The worked failure, published because the number was beautiful.** A first attempt at t98 used
a box one jet too low. `--isolate largest` returned 1 834 px at **V median 1.000, p90 1.000, max
1.000, share V>0.80 = 100.0 %** — a clean, stable, perfectly reproducible figure. The mask dump
(`tools/out/criteria-r6/value/mask-t98.png`) is the **horizon haze band**, a white diagonal
stripe with no aircraft in it at all. A 100 % reading on a sprite statistic is the project's
standing crop-and-look trigger, and it fired correctly.

**Why this is the fix for "the jet is a touch timid".** The R5 lane carried a residual by eye —
blades shorter, ~~wings sweeping down less~~ **wings sweeping down where the arcade's rise**,
nacelle pods smaller — and looked for it on the *geometry* axis. The art critic's finding is
that the dominant defect is **tonal**: the arcade's jet is white and ours is warm grey-tan, at
**5.3 %** of pixels above V 0.80 against the arcade's 45–65 %. Geometry is third-order against a
10× difference in highlight share.

> **THE WING SIGN IS CORRECTED, AND THE OLD TEXT INVERTED IT (R7).** R5's gap text asked for
> **"anhedral"** — wingtips lower than roots — and the struck phrase above says the same thing
> from the other side. **The arcade is the opposite.** The R6 sprite lane measured the arcade's
> wing top edge **rising 9.2 %H from root to tip** (`stage3-night-level-t175.png` x[207,487]
> y[227,306], operator ROW-RUNS, span 251, H 77) while our R5 sheet **dropped 17.5 %H
> outboard**. **Independently re-measured in R7 by the sprite lane** — which was instructed to
> measure rather than take its predecessor on authority — over seven sample columns on the same
> frame: the top edge runs **68.8 → 58.4 %H** from |x| 21.1 % to 46.6 % of span, i.e. **rising
> ~10–14 %H outboard**, with the chord narrowing from ~22 %H at the root to ~10 %H at the tip.
> **Two independent measurements, one direction.** This lane checked it a third way, on a crop
> rather than a number,
> per CLAUDE.md: `tools/out/criteria-r7/arcade-combat/t175-jet-4x.png`, a clean level astern
> view at 4× — **the wingtips plainly sit higher on screen than the wing roots.**
>
> *Attribution*: measured on a **stage-3** night frame and licensed for **all stages** —
> geometry is the same sprite drawn in every palette, which is a different argument from a
> palette criterion and is stated here rather than assumed. A level-flight attitude is
> mandatory for this measurement; `stage1-level-flight-t116.png` is **banked** despite its
> filename (`t116-jet-5x.png`) and must not be used for it.
>
> The sheet in `tools/art/sheets/player-f14.js` was already drawn the right way round in R6;
> **this is a gap-text correction only, and it is recorded so nobody implements the
> inversion.** STATUS.md gap 2 carried the inverted phrasing and is fixed in the same pass.
> `judging/R5/*` keeps the original wording — historical reports are not rewritten.

### Silhouette discriminators, astern view (MEASURED R5 — REPLACES the R3 aspect/fin-%/step triple)

> ## THE REFERENCE CROP IS AUTHORITATIVE OVER EVERY NUMBER BELOW.
>
> **Draw against the crop first; measure second.** The statistics in this section exist to
> *catch a wrong silhouette*, not to *define a right one*. No set of scalars specifies a
> shape, and the R4 judge's finding is precisely that a silhouette authored **to the
> statistics** can match the arcade's aspect ratio to three decimals and still not read as
> an F-14. If a shape satisfies every number here and does not look like the crop when you
> put them side by side, **the crop wins and the numbers are incomplete** — report that
> rather than shipping the shape.
>
> **The authoritative crops**, in order of authority:
> 1. `reference/stage3-night-level-t175.png`, crop **x[207,487] y[227,306]** (686×480) —
>    committed, level astern, isolated on black. View it at 4–8× **nearest-neighbour**.
> 2. The same pose with ~2.2× the pixels, for blade and nacelle detail:
>    `ffmpeg -ss 168 -i .reference-cache/video/ab2-longplay-60fps.mp4 -frames:v 1 t168.png`,
>    crop **x[320,720] y[344,460]** (1028×720). t=168 is inside the HUD-verified stage-3
>    span (160–196 in `STAGE_MAP.md`) and is the cleanest astern pose in the footage.
> 3. `reference/ab2-arcade-reload-dorsal.jpg` — the airframe-structure reference (canopy
>    placement, greyscale ladder); the jet is small there, so use it for structure, not
>    proportion.
> 4. `judging/R4/cmp-09-jet-sprite-ours-TOP-arcade-BOTTOM.png` — ours against the arcade at
>    matched size. The single most useful image for seeing what is wrong.
>
> What the crop shows that no scalar in this section captures: wings that **sweep** and
> **taper** to the tip rather than ending as planks; nacelles that are separate bodies with
> the fuselage visible *between* them; the fins rising **from the nacelles**, not from the
> spine; a magenta canopy fleck as the topmost body element; and twin small ventral fins
> below the nozzle line. Draw those, then confirm with the table.

**Why this section exists.** R3's acceptance triple (silhouette aspect 2.4–3.0, fin-region
max row width ≤20% of max, "step" in the row profile) **cannot tell our jet from the
arcade's**. R4 measured one operator on both: aspect ours **2.478** vs arcade **2.475**;
fin-region width ours **12.3%** vs arcade **16.2%** — near-identical scores for a solid
centred tuning-fork over a flat plank (ours) and two separated outboard canted blades over
swept wings (the arcade). Re-verified R5 and it is worse than "non-discriminating": on the
arcade's *own* t168 the fin-region width reads **21.0–24.4%**, so the ≤20% bound **fails the
reference aircraft**. A 1-D row-width profile is blind to where the fins are; use the
operator below, which is explicitly 2-D.

**Operator JET-SIL (state it exactly; every number below is reproducible from it).**

1. **Frame**, read at its stored resolution — **never upscale**. Arcade: `ab2-longplay-60fps.mp4`
   (1028×720) at t=175 and t=168, both level-astern night poses isolated on black.
   Ours: a `?fixed=1` capture at ≥960 px frame width (below ~250 px of jet span the blades
   are not resolvable and the operator is meaningless).
2. **Window**, chosen to contain the jet and exclude ground/HUD: t175 `x[310,730] y[340,458]`;
   t168 `x[320,720] y[344,460]`. For our build derive HUD exclusion with `tools/hud_mask.py` —
   never hardcode a box.
3. **Mask** = `max(R,G,B) > 30` (V>0.12) on a dark background, or the achromatic mask
   `saturation < 0.35 ∧ V > 0.08` over a saturated sky. Then keep **only the largest
   8-connected component** — this drops debris, stars and HUD text that would otherwise
   corrupt the fin extent (it did: it inflated fin extent from 35.7% to 38.9% on t175).
4. **row width** = **count of filled pixels in the row** (NOT the row's left-to-right
   extent; R3's published 53 px / 16.1% is a filled count and the extent reading is
   ~2.4× different). `S` = max row width. **SPAN** = max row *extent* = the wingspan.
   `H` = silhouette height.
5. **Fin band** = rows from the silhouette top down to, but excluding, the first row whose
   filled width ≥ `0.30·S` (the "30% wing onset" of the R3 text).
6. A fin-band row **contains two separated blades** if it holds ≥2 runs of ≥2 consecutive
   mask pixels whose inter-run gap is ≥ `0.03·SPAN` px (min 2 px).
7. **Nozzles** = afterburner glow: **hue ≤ 55° OR ≥ 355°** — a **wrap-around band through red**,
   corrected R8, see the box below — S ≥ 0.45, **V ≥ 0.70** (**RAISED from 0.45, R7, ledger
   row 24**); take the two largest 8-connected components and their x-centroids.

> ### THE PUBLISHED HUE BAND WAS WRONG, ON THE OPERATOR THE ROW-24 RULING TURNS ON (REPAIRED R8, ledger row 34)
>
> This document published the band as **"hue 5–55°"** and then, eight lines below, argued the
> ruling from **`#840000` at hue 0.0°** walking through the V floor. **Hue 0.0° is not in
> 5–55°.** Under the band as published, the arcade's daylight keyline could never enter the
> mask at any V floor, the contamination row 24 was written about could not happen, and the
> entire justification for raising the floor would be void.
>
> It is only sound because `tools/art/jetsil.py:112` actually tests
> **`(deg <= 55 or deg >= 355)`** — a wrap-around band that admits hue 0 — **and that wrap was
> published nowhere.** Re-derived in R8 on this document's own colour table: `#840000` hue
> **0.0** / S **1.000** / V **0.518** → in the implemented band, **not** in the published one;
> every glow colour (`#e67300` 30.0°, `#ff7500` 27.5°, `#f7b500` 44.0°, `#ffd600` 50.4°) is in
> both; the night keyline `#425284` at **225.5°** is in neither, which is exactly why the night
> crop could never have tested the floor.
>
> **The implementation is right and the ground-truth document was wrong — on the operator a
> ruling turns on, in the row added to fix an operator-specification defect.** Fixed above. The
> general form is the one this ledger keeps paying for: **a hue band that crosses 0° is not an
> interval, and writing it as one silently deletes red.**

> ### The nozzle mask's V floor was validated on a NIGHT crop only (REPAIRED R7, ledger row 24)
>
> **The whole operator above was only ever run against a night reference** —
> `stage3-night-level-t175.png`, whose keyline is the measured blue-grey `#425284`
> (hue 225.5°) and **cannot enter a red-hue mask at any V floor.** So the floor was never
> tested against a keyline that could reach it. The arcade's **daylight** jet is keylined in
> `#840000`, and that colour is hue **0.0°**, S **1.000**, V **0.518** — it walks straight
> through `V ≥ 0.45`.
>
> On our R7 day cell, the same drawing, the two largest components of the mask:
>
> | floor | the two largest components | nozzle separation |
> |---|---|---|
> | `V ≥ 0.45` (old) | `[128 px of #840000, 52 px of #ef7300]` — **one of them is the keyline** | **15.3 %** of SPAN ✗ |
> | **`V ≥ 0.70` (published)** | `[52 px of #ef7300, 52 px of #ef7300]` — the two nozzles | **30.6 %** of SPAN ✓ |
>
> **The floor sits in a wide empty gap, which is what makes it robust rather than tuned** —
> the same argument Criterion B's 50 % floor rests on. Every afterburner colour this project
> has measured on an arcade frame is **V ≥ 0.902** (`#e67300` 0.902; `#f78400`, `#f7b500`
> 0.969 on the native desert frame; `#ff7500` on t175), ours are `#ef7308` 0.937 and
> `#ffd600` 1.000, and the highest keyline is `#840000` at **0.518**. **Nothing measured lives
> between 0.52 and 0.90.** A floor of 0.70 clears every glow by ≥0.20 and every keyline by
> ≥0.18.
>
> **THE DECIDING TEST, AND IT GENERALISES.** Re-run on the arcade's own t175, this lane's
> independent run of `tools/art/jetsil.py`:
>
> | | nozzle separation | components |
> |---|---|---|
> | arcade t175, `V ≥ 0.45` | **30.0 %** | `[143, 136] px` |
> | arcade t175, `V ≥ 0.70` | **30.0 %** | `[124, 121] px` |
>
> **An operator change that moves OUR number and leaves the ARCADE'S untouched is the right
> kind. One that moves both is retuning the criterion to the build.** Write that test into any
> future threshold change here; it is the cheapest available defence against the thing this
> ledger is mostly about. (It is not sufficient on its own — a change can leave the arcade
> untouched and still be wrong — but failing it is close to disqualifying.)
>
> **The restraint is recorded with the fix**: the lane that found this **did not move the
> operator**. `jetsil.py` still defaults to 0.45 and now prints **both** readings with their
> component sizes whenever they disagree, so the failing figure sits on the page next to the
> passing one and the ruling was taken on published evidence rather than on a silent edit.
> The default stays at 0.45 for one more round so a reader of either document sees both; the
> **gate** is 0.70.

**Controls this operator passes before it is pointed at anything** (run them; an
uncontrolled operator is how the defective triple shipped):

| control | published | JET-SIL re-run | result |
|---|---|---|---|
| t175 fin-region max row width, px | 53 (R3) | **53** | exact |
| t175 fin-region width, % of max row | 16.1 (R3) / 16.2 (R4) | **16.2–16.4** | exact |
| t175 wingspan as %W | 36.3 (this doc, column-run method) | **36.28** | exact |
| same statistics on the 686×480 t175 instead of the 1028×720 | — | 100% / 35.5% / 30.0% | **scale-invariant** |
| V threshold swept 25→60 | — | all three stable to ≤0.4 pt | threshold-stable |

**ACCEPTANCE TARGETS (arcade, two independent frames):**

| statistic | t175 | t168 | target band for our jet | ours R4 |
|---|---|---|---|---|
| **fin rows containing two separated blades** | 67–68/68 = **99–100%** | 54/54 = **100%** | **≥90%** | 38% (62/162) |
| **fin-pair lateral extent, % of SPAN** | 132–133 px = **35.4–35.7%** | 132 px = **35.4%** | **30–40%** | 12.6% |
| **nozzle-centre separation, % of SPAN** | 112.2 px = **30.1%** (30.0 % under either V floor) | 112.2 px = **30.1%** | **25–35%**, mask floor **V ≥ 0.70** | 14.5% |
| **blade cant**: blade-pair half-separation at the topmost fin row ÷ at the lowest fin row | 64.0/49.5 = **1.29** | 62.5/51.0 = **1.23** | **≥1.15** (tops further outboard than roots) | **1.00** (vertical slot) |

The "ours R4" column is this operator re-run on the *ours* panel of
`judging/R4/cmp-09-jet-sprite-ours-TOP-arcade-BOTTOM.png` (a composite, so its absolute
scale is unknown — but all four statistics are ratios and were shown scale-invariant
above). It reproduces the R4 judge's independent native-scale readings of our build to
≤0.5 pt: 38% vs his 8/21 = 38%, 12.6 vs 12.3, 14.5 vs 14.0, aspect 2.499 vs 2.478. The
arcade column was measured directly from the video, not from the composite. So the
operator and the judge agree on both aircraft, by separate routes.

**SANITY BOUNDS ONLY — these do NOT discriminate, never accept on them alone:**

- **Aspect = SPAN ÷ H** (extent-based, threshold-stable): arcade **3.24** (t175) / **3.30**
  (t168) across V 25–60. Band **3.0–3.6**. R3's filled-pixel aspect is not usable as a
  bound: the same two frames give 2.61–2.96 depending only on the V threshold, and ours
  scores 2.50 against the arcade's 2.48.
- **Span 34–38%W**, **centroid 52–60%H** (unchanged, from the sections above).
- The old **fin-region max row width** figure stays in this doc as a *description*
  (t175 53 px = 16.2%, t168 70 px = 21.4%) and is **withdrawn as an acceptance bound**.

- **Canopy coverage bound** (MEASURED on `ab2-arcade-reload-dorsal.jpg`, 181×127): the
  canopy is a single compact patch — largest connected component of the magenta mask
  (hue 250–330°, S>0.25, V>0.15) is **8 px in a 4×2 bbox at x[90,93] y[70,71] = 0.035%
  of frame area**, core `#9f3ccd` (≈ the known `#9d3aca`); everything else matching the
  hue band is scattered 1–3 px JPEG noise. Corroborates the R2 judge's 0.03%; the R2
  build's canopy covered 1.24% of frame — ~35× too large. The canopy is a fleck of
  color, not a drawn rectangle.
- **Wingspan on screen** (MEASURED — note each frame's extent method; they are NOT the
  same, and using the wrong one changes the answer 2.6×):
  - t175 (level, night, isolated on black): **36.3%W** = the extent of the largest run of
    CONTIGUOUS OCCUPIED COLUMNS — columns 225–473 of 686 (249 px) in the band y=225–300,
    where a column is "occupied" if any pixel in the band has max(RGB)>40. A detached
    debris run at columns 189–199 is excluded (the empty column gap 199–225 separates it).
    Height ≈ 71 px ≈ 14.8%H. **Connected-component pixel labelling is NOT the method
    here and gives a different, much smaller number**: on the same mask the largest
    component is the fuselage alone, 97 px = 14.1%W — the dim wing roots fall below the
    threshold at pixel level, so the wings disconnect from the body even under
    8-connectivity. A developer verifying jet scale against 36.3%W must reproduce the
    column-run extent, not a component bbox, or they will tune the jet to half size and
    believe they hit target.
  - t116 (near-level): 259 px = **37.8%W** — this one IS the bbox of the largest
    8-connected pixel component (mask S<0.35, V>0.60); the brighter daylight airframe
    stays connected. May include a few tracer pixels — treat as an upper bound.
  - t140 (banked, more distant): ~29%W (largest 8-connected component of mask B>70 ∧
    max(RGB)>130; the warm-lit wingtip may extend slightly past it — treat as a lower
    bound for that pose).
  - So: **neutral span ≈ 36%W of frame**; it breathes with maneuver/altitude roughly
    29–38%W. (Prototype ships 342/960 = 35.6%W — consistent.)
- **Screen position / roam** (jet centroids MEASURED: t116 (48.0%W, 55.1%H), t140
  (41.2%W, 59.7%H), t175 (50.5%W, 58.3%H)). **WITHDRAWN R5: the t116 and t140 pairs are
  not reproducible and cannot be repaired.** Only t175 stands — its jet is isolated on
  black and its published figure matches a pixel centroid to 0.56 pt.

  I tried to clean both and could not, for a structural reason worth recording so nobody
  spends the day again:
  - **t116 (and every daylight stage-1 frame I tried — t106, t108, t110, t114, t118,
    t119):** in daylight the player jet is bright and achromatic, and so are the **clouds,
    the horizon haze band and the sea foam**. No saturation/value rule separates them —
    the largest achromatic component floods out of the jet into the haze every time
    (on t116 it reaches 7 238 px spanning the whole window; on the 60 fps frames it spans
    25–100%W and usually touches a frame edge). The t116 jet is additionally **banked** and
    overlaps a white landmass and a second aircraft. I get (46.2%W, 60.04%H) as a pixel
    centroid and (48.1%W, 56.98%H) as a bbox centre; neither matches the published pair.
  - **t140:** stage 2's palette is orange sky over orange ground, so a warm-hue mask
    returns **207 817 px — the entire frame**. There is no colour contrast to separate a
    warm-grey jet from a warm-orange field at all.
  - There is no arcade equivalent of `?hidejet=1`, so the difference-mask route is closed.

  **Anchor all centroid work on the night frames t175/t168**, where the jet sits on black.
  REFERENCE.md's own "Night palette swap" note says night is a palette swap, not a geometry
  change, so night centroids are valid for geometry. And remember a single-frame centroid is
  one draw from a roaming distribution (cruise cx sd 12.88%W) — the **ADOPTED distribution
  below is the actual target**, not any one frame's pair. ADOPTED distribution from the prototype's
  #122 arcade measurement: the spread is **two-regime**, not constant-amplitude weaving —
  open cruise cx sd **12.88 %W** at cy ≈ **52.8%H**; canyon cx sd **2.59 %W** at cy ≈
  **63.5%H** (lower and straighter); combined cx sd 10.44 %W emerges from alternating.
  The jet sits in the lower-middle half of the frame and roams widely in cruise.

#### Centroid: which pixels, and which average (DIAGNOSED R5 — this was the 2-round bias)

**The centroid is the AREA-WEIGHTED MEAN of the silhouette's pixel coordinates. It is NOT
the centre of the bounding box.** The published jet-centroid numbers ran 2–3 points
optimistic for two consecutive rounds because the two sides of the comparison used
different averages:

| frame | area-weighted PIXEL centroid | BBOX centre | published |
|---|---|---|---|
| arcade t175, 686×480 | **58.86 %H** | 55.73 %H | **58.3 %H** ← the pixel centroid |
| arcade t175, 1028×720 | **58.90 %H** | 55.62 %H | — |
| arcade t168, 1028×720 | **57.37 %H** | 56.04 %H | — |
| ours, R4 `jet-on`/`jet-off`, 3 frames | **57.08 %H** | 55.36 %H | **55.28 %H** ← the bbox centre |

The arcade figures match the **pixel centroid** (t175: 58.86 vs published 58.3). Our
figures match the **bbox centre** (55.36 vs published 55.28 — 0.08 pt). So the **52–60 %H
band is in pixel-centroid units**, and the authoring side has been reporting a bbox centre
against it. The gap is not a constant offset to subtract: it is **1.3–3.3 points** across
these four measurements, because it depends entirely on how the silhouette distributes its
area — an AB2 jet carries thin tall fins above and dense wings/nacelles/nozzles below, so
its mass sits well under its vertical midpoint.

Provenance of the mix-up, for the record: `judging/R2/report.md` reports "jet **bbox
centre** (49.9%W, 84.5%H) **against arcade 55.1/58.3/59.7%H**" — i.e. a bbox centre set
beside three pixel centroids in one sentence. The convention has been copied forward since.

> ### IT HAPPENED AGAIN IN R7, AND IT COST AN HOUR BECAUSE BOTH NUMBERS WERE RIGHT (ledger row 27)
>
> **EVERY ALTITUDE OR CENTROID FIGURE IN THIS PROJECT MUST NAME ITS UNIT: `pixel centroid` or
> `bbox centre`. A bare "%H" is not a reportable quantity.**
>
> The R7 flow lane spent an hour on what looked like a **seven-point** arcade-vs-arcade
> contradiction, serious enough that retiring one side was on the table:
>
> | | figure | unit |
> |---|---|---|
> | REFERENCE #122, cruise `cy` | **52.8 %H** (and the 52–60 %H composition band) | **pixel centroid** |
> | the arcade player hand counts (109 obs, GAME_SPEC §2) | **49.47 %H** | **bbox centre** |
>
> **They are the same measurement in two units and they agree.** Applying this section's own
> published 1.3–3.3 point conversion, 49.47 as a bbox centre is **50.8–52.8 as a pixel
> centroid**, and 52.8 sits at the top of that interval. **Note that it reconciles at the
> interval's edge** (49.47 + 3.3 = 52.77 against 52.80), so they are consistent but **must not
> be quoted as corroborating each other to a decimal** — the conversion is doing all the work.
>
> **This is the cheapest form of the "same name, different operator" family and the most
> expensive to debug**, precisely because **neither number is wrong**. There is nothing to
> find by re-running either operator; cross-validation reproduces both exactly. The only thing
> that resolves it is a unit label, which costs one word.
>
> **One live consequence, recorded because it is true now and will silently stop being true.**
> Our `jetNdcY` is the **sprite anchor**. `demoTimeline.js`'s measured offsets put
> `anchor = pixel centroid − 1.55` in cruise, while the table above puts
> `bbox centre = pixel centroid − 1.72`. **So our anchor happens to equal the hand counts'
> bbox centre to within 0.17 points**, and the two columns of every altitude comparison are in
> the same unit with no conversion. **That coincidence is a property of the current
> silhouette's area distribution and it breaks the next time the jet is redrawn.** Re-derive
> both offsets after any sprite change before quoting a cross-side altitude table.

**Operator (use this on both sides):**
1. Isolate the jet. Preferred: a **jet-on minus jet-off difference mask** (`?hidejet=1`),
   `max|Δ| > 8` per channel at native scale — it needs no colour assumption and is what the
   R3 and R4 judges used. On an arcade frame, use the largest 8-connected component of the
   silhouette mask instead (there is no jet-off frame).
2. **Which pixels count: the airframe plus its integral nozzle glow; exclude any detached
   exhaust plume, smoke trail or shadow.** The arcade mask necessarily includes the nozzle
   glow (it sits inside the nacelles and is part of the same component), so ours must too.
   Measured contribution on our build: including the warm nozzle pixels moves the centroid
   from 56.59 %H to 57.08 %H — **0.49 pt**, far too small to explain the bias, so the flame
   is *not* the culprit despite being the obvious suspect.
3. `cy = mean(y of mask pixels) / frame height`, `cx = mean(x) / frame width`. Report at
   native scale (`[::3,::3]` for our 960×672 captures — exactly lossless, see
   "Measuring OUR captures" above).

Reproduction check: this operator returns **57.08 %H** on all three R4 `jet-on` frames,
matching the R4 judge exactly.

Side note, not a gate: the size of the pixel-centroid-minus-bbox-centre gap is itself a
weak silhouette statistic — the arcade's t175 reads **3.28 pt** against our **1.72 pt**,
because its fins are thinner and taller. It is confounded by the nozzle glow, so do not
accept on it; the discriminators above are the gates.
- **Jet bank vs world roll**: the drawn jet bank tracks the world roll (prototype ships
  jet-bank = 0.8 × world roll, VISUALLY TUNED — the three usable reference frames gave
  ratios 0.90/0.61/1.31, too noisy to derive numerically; tune by capture against t=98
  and t=112). Banking is a pure image-plane rotation of the sprite (measured #112: a
  de-rotated banked frame matches the level frame's proportions).
- **Night palette swap** (MEASURED, stage 3 t164–186): on night stages the player
  airframe renders in blue-grey tones instead of the daylight warm greys — the whole
  sprite is palette-swapped, not dimmed. Night ground is a dense white-speckle field
  (city lights) over near-black, with dark blue coastline bands (t169–172).
- **Barrel roll vs bank, how to tell them apart in footage** (MEASURED t221.4–222.9 at
  0.1 s): in a normal bank the WORLD rolls and the jet holds a moderate bank; in the
  barrel roll the horizon stays level while the jet sprite itself sweeps through
  steep/inverted poses (~1.2 s, ~60%W lateral and ~20→75%H vertical excursion). See
  `stage4-barrel-roll-t222.png` and GAME_SPEC.md §1 for caveats.

### Authored vs RENDERED colour — always publish both (MEASURED R5c)

Every colour in `tools/art/palettes.js` is passed through `L()` = `snapHexToLadder()` before
it reaches a pixel, so **the hex written in the source is frequently not the hex that
renders**. An authored-vs-rendered mismatch becomes a phantom discrepancy the moment someone
measures the exported frame and finds a value this document does not contain.

| palette entry | authored | **renders as** | pixels in the sheet |
|---|---|---|---|
| `PLAYER_NIGHT.nozzleCore` | `#ff7500` | **`#ff7300`** | 272 |
| `PLAYER.nozzleCore` | `#ef7308` | **`#ef7300`** | 272 |
| `PLAYER.keyline` | `#000008` | **`#000000`** | 2 388 |
| `PLAYER_NIGHT.keyline` / `deepWarmShadow` | `#425284` | `#425284` (no move) | 2 652 |

Measured by counting opaque pixels in `src/assets/sprites/player-f14-night.png` and
`player-f14.png`. The two nozzle-core masks are **positionally identical and the alpha planes
are byte-identical**, so night is the same drawing with one warm tone swapped — night's
`#ff7300` is **one ladder step brighter in R** than day's `#ef7300` (255 vs 239, G and B
equal), which is a real and intended difference, not an instrument artifact. Night is also
one ladder step from the arcade's measured `#ff7500` nozzle (t175 crop x[207,487] y[227,306],
279 px, modal `#ff7500`) — inside the documented snap tolerance.

**Tree state (citation field 5, and this entry is its own worked example): uncommitted working
tree, six lanes live, sheets 900×72.** The committed sheet at `db554e6` is a *different
drawing* — 900×40, nozzle core `#c594f7`/`#a400d6` magenta, **no orange at all** — so the
table above reproduces on neither HEAD nor any earlier commit. A previously circulated count
of 486 px for these masks does not reproduce on HEAD or on the working tree; it describes
some third intermediate state and should not be cited.

## HUD (686×480 coordinates; divide by 686/480 for fractions)

Measured on t116/t84/t140 by color-mask bounding boxes:

| element | bbox (x, y) | color samples |
|---|---|---|
| SCORE winged emblem, top-left | x[36,151] y[34,49] | red `#d32716` |
| score digits (right-aligned, 6–7 digits) | x[224,305] y[35,48] | pale yellow `#fff4ae` |
| HIT winged emblem | x[346,407] y[34,49] | same red |
| hit-count digits | x[432,455] y[36,48] | same pale yellow |
| lock reticle (top-right corner-bracket square + side ticks) | x[508,624] y[52,101] (square itself ≈ x535–605) | white frame ≥`#b0b0b0`; center dot `#ffcd21` (orange-red when locking: t175 shows red dot) |
| SPEED label, bottom-left | x[37,89] y[431,441] | dark red on grey plate |
| throttle letter after SPEED | ~x=100 y=437 | reads **`M` in 27 of 27 samples** spanning t90–t370 (stages 1–8). "Changes with throttle" is an **inference, never observed** — see the note below |
| throttle bar | x[100,221] y[430,443] | blue fill `#338bf7` + amber segment `#f2c56c`; scale digits 0…1…2…3 along it. **Fill level is identical in every flight sample** and **empty on the ground** (carrier deck t90, runway restock t250) — so the fill tracks *being under power*; "amber chevron at the current-speed position" is an inference, not an observation |

**The throttle never moves in this footage (MEASURED-NEGATIVE R6).** Sampled every 10–12 s
from t90 to t370 — 27 frames, stages 1–8 — the letter is `M` every time and the bar fill is
unchanged every time (`tools/out/criteria-r6/throttle/strip.png`, read by eye at 3×). The two
frames where the bar reads empty are the carrier deck before launch and the stage-5 runway
restock, i.e. not flight. **Consequence: no arcade magnitude for throttle's effect on
ground-flow or closure exists or can be derived from the cached recordings**, and `M` is the
state every measured flight constant in this document was taken at. GAME_SPEC.md §1 carries
the binding constraint for anyone wiring it.
| STAGE text | x[292,351] y[428,443] | red `#c53428` |
| stage number digit | x[376,414] y[426,450] (the Godot map's own HUD-read rect) | cream `#d4b886` |
| missile stock icons | x[421,536] y[427,472] | white/grey rockets with red tips (`#ffffff` body); large icons first, then small tick marks for the remainder |

### The nose sight square — IT EXISTS, and it is 5 NATIVE PIXELS ON A SIDE (MEASURED R7)

**Read GAME_SPEC.md §3 element 1 first: this element was within one decision of being retired
as an invention of our build.** Three reviewers across R6 examined 16 + 22 + 13 frames; two
concluded absence and one found it. It is real, and this lane measured it at **true native**,
which nobody had done — every prior attempt (including the ones that concluded absence) worked
on 686×480 video, where the box is 11 px of faint white over a saturated sky.

| | source | stage (digit read) | measurement |
|---|---|---|---|
| **side length, TRUE NATIVE** | `ab2-arcade-desert.png`, white mask `min(RGB) ≥ 200`, bbox | **2** | **5 × 5 px of 320 × 224 = 1.563 %W**, four corner marks of 2 px with 1 px gaps, **interior empty** |
| side length, video | `ab2-longplay.mp4` t201.4, same mask at threshold 150 | **4** | **11 × 11 px of 686 = 1.604 %W** |
| **corroboration** | — | — | 5 native px × 686/320 = **10.7 video px**. Two frames, two stages, two resolutions, two operators: **1.56 % and 1.60 %W** |
| presence on stage 1 | `ab2-longplay.mp4` t109, hard bank, **zero enemies**, clear sky | **1** | present, pale, same four-corner form |

> **WITHDRAWN before publication: a "per-enemy lock bracket, 11 × 9 px" in this same frame.**
> I measured white pixels at `x[136,146] y[92,100]`, called it a lock bracket at ~2× the sight,
> and then cropped it at 18× as the rules require
> (`tools/out/criteria-r7/arcade-combat/desert-bracket-18x.png`). **Those pixels sit on the
> player jet's own cream fin and the brown object above it**, so the white mask there is
> confounded and the box is not separable from the airframe. The number was clean, plausible and
> wrong, which is the standing pattern. **There is no measured arcade lock-bracket size in this
> document; element 3's geometry is still unmeasured.** The sight square is unaffected — it sits
> on flat orange sky with nothing within 4 px of it.

**OURS IS `SIGHT_PX = 10` of 320 = 3.125 %W — almost exactly twice the arcade's.**
Target: **1.4–1.8 %W on a side** (the native 1.563 ± the video reading's quantisation).

> **DO NOT RETUNE `SIGHT_NDC_Y_OFFSET` ON A VERTICAL-OFFSET NUMBER YET — the frame of reference
> is not established.** The offset from the airframe's achromatic centroid to the sight centre,
> measured on the three zero-enemy frames above:
>
> | frame | roll | sight offset from airframe centroid |
> |---|---|---|
> | native desert, stage 2 | banked left | **7.8 %H ABOVE**, 1.6 %W left |
> | t201.4, stage 4 | banked right | **8.8 %H ABOVE**, 1.3 %W right |
> | **t109, stage 1** | **hard bank right** | **12.0 %H BELOW**, 1.3 %W right |
>
> **A fixed screen offset above the airframe cannot produce the third row.** The arcade's sight
> is carried in something that rolls — the jet's own frame, or an aim ray projected from it —
> and `SIGHT_NDC_Y_OFFSET` is a fixed screen offset. So the measurement that is owed is **not
> just a magnitude on a level-flight frame**; it is a magnitude on a level frame *plus* the
> same measurement on a hard-bank frame, to fix the frame of reference before the constant is
> moved. The size half above is clean and can be acted on now; this half cannot.
>
> (The R6 judge describes the same t109 box as sitting "above the nose". That is consistent:
> in a hard right bank, above the nose in the jet's frame **is** below the airframe on screen.
> Two descriptions of one observation, not a disagreement.)

**Attribution.** Measured on stage-2, stage-4 and stage-1 frames; **licensed for all stages** —
the HUD is drawn at a fixed screen size and does not change with the stage palette, and the
three frames that carry the measurement span three different stages and two different skies.
Evidence: `tools/out/criteria-r7/arcade-combat/desert-sight-12x.png` (native, 12×, the
decisive one), `tools/out/criteria-r7/sight/t{109.0,201.4}-2x.png`.

Notes: the HUD is drawn **over** the game with no opaque bar — the world is visible
behind the bottom strip. There is **no altitude indicator in AB2's HUD** (the brief
assumed one; the bottom strip is SPEED/throttle + STAGE + missile stock only). The lock
reticle square sits fixed in the upper-right area during normal flight; lock-on
**brackets** (separate from the reticle) appear on enemies mid-screen, drawn as small
blue corner-brackets, color `#008cd9`–`#3bbaff` (t104 (262,155), (288,170)), turning
red/white variants per state (t116 shows a white bracket on a distant enemy at
≈(415,210); t186 night shows white brackets).

### HUD ink separation — the arcade uses HUE AND A KEYLINE, not luminance (MEASURED R6)

> **RETIRED: "≥3:1 luminance contrast vs local background"** (ledger row 10). Two independent
> R5 operators (presentation lane, then the judge on a separately written instrument with every
> ROI cropped and looked at first) ran it on **the arcade**. It fails there.

| arcade element | stage 1 ring / field | stage 2 ring / field | stage 3 ring / field |
|---|---|---|---|
| SPEED label (red, on white plate) | 3.55 / **1.04** | **1.57 / 1.80** | **1.05** / 3.59 |
| **STAGE label (red, no plate)** | **2.11 / 1.06** | **2.12 / 1.89** | 4.37 / 4.38 |
| stage digit (cream, keylined) | 11.02 / 7.10 | 5.92 / 5.35 | 17.97 / 17.95 |
| missile stock (white, keylined) | 8.64 / 7.51 | 6.69 / 6.50 | 17.38 / 17.85 |

"Local background" is **not an operator** — it has two defensible readings, so both are given:
**ring** = a 1–4 px annulus (where the arcade's own black keyline lives), **field** = 6–12 px
out (the terrain). The arcade **fails ≥3:1 on its own red ink on stages 1 and 2 under both**:
5 of 12 element×stage pairs fail on the ring reading, 4 of 12 on the field.

**Why it cannot be satisfied, and therefore why it was never the design.** Relative luminance
weights red at **0.2126**. A saturated red glyph physically cannot reach 3:1 against a
mid-bright ground, at any shade of red. The criterion imports a web-accessibility metric into a
1987 design that separated ink from ground by **hue** and by a **black keyline**. It also fails
the discrimination test — ours and the arcade pass and fail **together** on every ink class.

**What the arcade actually does — read off its own native bottom strip**
(`ab2-arcade-desert.png` rows 190–224 at 4×, `tools/out/criteria-r6/value/desert-hud-4x.png`),
and this is the thing to build to:

1. **An opaque white plate behind the SPEED label and the throttle bar — and nothing else.**
2. **No plate behind STAGE.** Red glyphs sit directly on the terrain.
3. **A black keyline on the stage digit and on the missile-stock icons** — the two elements
   that must stay readable over any ground, and the two that score 5.9–18.0:1 on every stage.
4. The HUD is drawn **over** the world with no opaque bar; terrain is visible through the strip.

**Our build already does all four**, and measures alongside the arcade rather than below it:

| element | ours s1 | arcade s1 | ours s2 | arcade s2 | ours s3 | arcade s3 |
|---|---|---|---|---|---|---|
| STAGE label (red) | 1.19 | 2.11 | 1.32 | 2.12 | 4.95 | 4.37 |
| stage digit (cream) | 8.09 | 11.02 | **5.64** | **5.92** | 18.69 | 17.97 |
| missile stock (white) | 7.61 | 8.64 | 4.13 | 6.69 | 19.46 | 17.38 |

**R4 gap 3's contrast half is CLOSED.** Its headline — "the cream stage digit is literally
invisible over stage 2's tan ground" — is no longer true on `53ce86b`: ours reads **5.64:1**
against the arcade's **5.92:1**, and the judge's side-by-side crop
(`judging/R5/cmp-03-hudbottom-ours-TOP-arcade-BOTTOM.png`) shows ours if anything **more**
legible. The remaining half of gap 3 is **typography**, not contrast.

**Do not add halos, outlines or plates beyond the four items above.** R5 established the
converse risk on stage 3: the arcade runs that condition ~3× harder than we do (9.76 % of its
bottom HUD band brighter than the cream glyph ink, against our 3.40 %) with **no opaque plate**,
and our HUD is already 2–24× more separated from its background than the arcade's. Adding
separation moves away from the reference. **Every horizontal rule added to the HUD also
worsens the cloud-measurement severance bias** — see the KNOWN BIAS block under the cloud
operator, and re-run that control if you change HUD geometry.

**Transient HUD overlays** (MEASURED, round 3): the stage-end tally card — red
"HIT COUNTS n" above cyan "POINTS m", upper-left area, counting up together at ~7
hits/s, with the incoming stage's "STAGE n" label shown lower-center during the count
(`stage2-start-bonus-tally-t124.png`); and the mid-air reload prompt — cyan
"RELOAD WEAPONS" blinking low-center beneath the tanker (`stage3-reload-tanker-t165.png`).
Round 4 adds: the respawn "READY" card low-center (yellow, then cyan —
`respawn-ready-gp-t207.png`) and the continue card "CONTINUE PLAY / <countdown from 10>
/ INSERT COIN" centered over the still-scrolling world (`continue-card-gp-t261.png`).

**Reticle anatomy** (MEASURED, round 4, t84–118 strip at 2 s): the fixed upper-right
reticle is a corner-bracket square with an **attitude line through it that rotates with
the world roll** (horizontal during level flight t84–94, steeply diagonal during banks
t96–98 — an artificial-horizon indicator, not decoration), plus a status dot: ABSENT
when no enemies are in play, and holding YELLOW or RED for multi-second spans while
enemies exist (state semantics not conclusively mapped — see GAME_SPEC.md §3).

**Missile stock widget semantics** (MEASURED, round 4, widget strips at t84–105,
t163–169, t245–258): base-10 odometer — large rocket icon = 10, small tick = 1; ticks
decrement one per launch and a large icon converts to ticks when units run out
(4L+0 → 3L+9 observed). Start = 5 large = 50; both resupply mechanisms fill to 7 large
= 70 in a ~4 s burst at ~10–20 missiles/s.

Title screen (t74, MEASURED): black background; "AFTER BURNER" in white `#f4f4f4`
brush-stroke letters; the leading A is blue `#0096fd`, the leading B red `#ff1600`;
behind the text a large "II" built from lavender spheres `#7e85cc` with red-hot cores
`#ff6625`; "INSERT COIN!" red `#ff1500` at y≈400; "CREDIT n" pink `#dfaadd` bottom-left;
"©SEGA 1987" blue `#008bd9` bottom-right. Lettering block spans x≈98–595, y≈109–359.
The title is built by an animation (letters assemble reversed — see t60/t66 context, not
shipped) and alternates with a BEST FIGHTERS score table and live attract gameplay.

## Explosions

**The t357 numbers are NOT a fireball — they are FADING SMOKE (corrected R5).** This doc's
previous target (region x0–160 y310–460 of t357, pixels with V>0.55, n=22 072; p95
`#fb9352`, p75 `#d58a1c`, p50 `#c25e02`, p25 `#a6290f`) describes the translucent,
dissipating debris ring in that frame's lower-left corner, measured through a desert-tinted
frame whose ground is tan and whose sky is cream — so the "highlights" are partly the
canyon floor read through the smoke. Re-measured R5 with the same operator: mean V
**0.753**, only **6.0%** of pixels above V 0.95, **1.9%** achromatic-bright. Band means
(mean colour of each decile, more stable on a compressed frame than a single percentile
sample): `#941c03` → `#a42c0e` → `#bd4a1a` → `#d68122` → `#e4b47f`. The brightest band is a
desaturated **tan**. R4's build reproduced these numbers (mean V 0.792, 20.1% above V 0.95)
and still had no fireball, because this criterion cannot see a white-hot core. **Keep these
figures as the description of a DISSIPATING smoke mass; do not accept a fireball on them.**

### Fireball targets (MEASURED R5 — use these)

Operator: read the frame at its stored resolution (no resampling). Mask = largest
8-connected component of "not background" inside a box bounding the blast, background
being the stage's flat sky (for `ab2-arcade-huge-explosion.jpg`, sky `#0142fe`, 20.7% of
the frame: `B > R+60 ∧ B > 140`). Exclude the HUD bands and any cloud wedge that touches
the blast (here `y[88,109) x[20,50)`; leaving it in moves nothing by more than 0.2 pt but
it is not fireball). Report mean/median V, the fraction above V 0.95, the achromatic-core
fraction (`saturation < 0.25 ∧ max(RGB) > 240`), and the **mean colour of each brightness
decile** ranked by R+G+B — not single percentile samples, which on these compressed frames
move by tens of levels between neighbouring masks.

| | `ab2-arcade-huge-explosion.jpg` (181×127) | `death-starburst-gp-t202.png` (640×360, interior box x[200,480] y[140,300]) | R4 build | TARGET |
|---|---|---|---|---|
| mean V | **0.891** | **0.925** | 0.792 | **≥0.85** |
| fraction above V 0.95 | **52.3%** | **60.1%** | 20.1% | **≥40%** |
| white-hot core, S<0.25 ∧ V>0.94 | **8.8%** | **3.5%** | — | **≥3%** |
| brightest-decile mean colour | `#f6f6e7` (V 0.967, **sat 0.063**) | `#f4ebb8` (V 0.958, **sat 0.246**) | `#fb9352` (sat 0.67) | **V ≥0.95, sat ≤0.30** |
| mean saturation over the whole fireball | 0.848 | 0.799 | 0.879 | 0.75–0.90 |
| blast extent | 140 px = **77.3%W** | — | — | — |

Decile-band ladder, `ab2-arcade-huge-explosion.jpg`: `#9b0204` (deep red rim) → `#d6050b`
→ `#f47a07` (orange) → `#f5d619` (yellow) → `#f6f6e7` (**near-white core**). The second
source gives the same ladder one step warmer (`#c21d07` → `#eb7318` → `#efb21b` →
`#f4dc31` → `#f4ebb8`), consistent with its heavier compression smearing the small white
patches toward yellow. ~~**The single sharpest discriminator is the brightest-decile
saturation**: arcade 0.06–0.25, R4 build 0.67.~~ Reproduces R4's independent readings (mean V
0.882 vs my 0.891; 47.7% above V 0.95 vs my 52.3%).

> **BRIGHTEST-DECILE SATURATION ≤0.30 IS DROPPED (R6) — AND THE R6 REASON WAS WRONG
> (RESTATED R7, ledger row 20).**
>
> ~~It ranks the fire mask by V and takes the top tenth… a **false negative by construction on
> any palette containing a saturated colour brighter than its core**… the statistic reads
> **0.952**.~~ That 0.952 comes from an operator the criterion's own numbers were never taken
> with. **Three things the criterion text never named** — the mask, the ranking key, and whether
> "saturation" means the mean of the per-pixel saturations or the saturation of the decile's
> **mean colour** — and the two defensible readings disagree by a factor of fifteen:
>
> | operator | **ours** (`e8fed58`, expl-tick 0083 / 0155) | **arcade** huge-explosion | verdict |
> |---|---|---|---|
> | **not-background largest component, deciles ranked by R+G+B, saturation OF THE DECILE'S MEAN COLOUR** — the operator the published ladder and the 0.063 were actually taken with | `#f6f6e6`, **0.062** | `#f7f6e6`, **0.0658** | both PASS ≤0.30, and **ours lands on the arcade's core colour** |
> | FIRE-MASK component, ranked by V, mean of the per-pixel saturations | **0.965** | **0.632** | **both FAIL**, the arcade included |
>
> **So it is not a false negative on our palette — it is an under-specified operator, and under
> the other reading the arcade fails its own criterion by 2.1×** (which is ledger row 10's
> defect, not row 20's stated one). Reproduced on this lane's fourth independent
> implementation; the arcade ladder comes back as `#9b0304 → #d2050c → #f25908 → #f6d619 → #f7f6e6`
> against the published `#9b0204 → #d6050b → #f47a07 → #f5d619 → #f6f6e7`, and the
> mask dump (`tools/out/criteria-r7/arcade-combat/ourfire-frame-0155-mask.png`) is the fireball
> and nothing else — looked at, as required.
>
> **The exclusions matter here too, and the ones published in THIS table do not reproduce THIS
> table's number.** Run with the wedge rect named a few lines above (`y[88,109) x[20,50)`) the
> brightest decile comes back `#f9f9f9` at saturation **0.001** and the core inflates to
> **12.9 %** — the residual cloud bank, not the fireball. The published 0.063 and 8.8 % are
> reproducible only with **FIRE-MASK's three rects** (rows 0–14, rows 112–127, and
> `x < 55 ∧ y > 82`). **Use FIRE-MASK's rects for both operators on this frame.**
>
> **Verdict: STAYS DROPPED, for the correct reason.** An under-specified gate is not a usable
> gate, and naming the operator now would be writing a new criterion rather than repairing one.
> **Use the core fraction alone: `S < 0.25 ∧ V > 0.94` within the FIRE-MASK component.** It is
> robust to what else is in the palette, because it counts the core rather than ranking against
> it.
>
> **And there is a win in here that nobody claimed.** The decile *ladder* stays as an authoring
> target, and **we now pass it**: ours `#9e0000 → #c80c01 → #efa00c → #fbdb2a → #f6f6e6`
> against the arcade's `#9b0304 → #d2050c → #f25908 → #f6d619 → #f7f6e6` — the two ends match
> to a level and only the **middle rungs run hot** (ours yellower and brighter at deciles 5 and
> 8). That is an authoring note, not a gate.

Caveats on the sources: `ab2-arcade-huge-explosion.jpg` is a sub-native 181×127 JPEG
(320×224 downscaled ~0.57×) with no proven stage identity, and `death-starburst-gp-t202.png`
comes from the third recording (`ab2-gameplay.mp4`), which has no stage map. Both are
therefore palette/structure evidence only — but they agree with each other and with R4,
and the white-hot core is visible by eye in both.

Explosions are big — screen-filling at the extreme (77%W above) — boiling multi-lobe
masses with radial spikes, not radial gradients; debris flies as small red/white chunks
(see t100 upper-left).

### Two fireball frames, and they differ by OBJECT — use a band, not a point (R5)

The combat-fx lane measured a **stage-1 enemy KILL fireball** (`stage1-missile-salvo-t100.75.png`,
y[330,520] x[460,640], 10.1%W × 19.2%H, n=7 235) and it is materially **hotter** than the
`ab2-arcade-huge-explosion.jpg` blast:

| | huge-explosion.jpg | stage-1 kill fireball |
|---|---|---|
| mean V | 0.882–0.906 | **0.928** |
| fraction above V 0.95 | 45.3–54.2% | **57.9%** |
| near-white core, as % of area | **9.2%** (FIRE-MASK, below) | **NOT MEASURABLE — see note** |

**Which frame for which object**: `src/effects/explosions.js` draws *kill* explosions, so
tune their body statistics to the stage-1 kill column; reserve the huge-explosion figures
for the screen-filling death blast. A single point target across both is how this round's
trail defect happened — a developer chasing two incompatible numbers. **Accept anywhere
inside the band: mean V ≥0.88, ≥45% above V 0.95, near-white core ≥5% of area (core from
the huge-explosion frame only).**

**CORRECTED R5 — the kill fireball's "16.1% core" is withdrawn.** In `t100.75` the kill
fireball sits **immediately against the white launch plume**, so no mask that admits
white-hot pixels can separate them by connectivity: FIRE-MASK floods out of the fire and
across the whole plume (n jumps 7 235 → 17 042, mean saturation collapses to **0.352**,
"core" reads a nonsensical 56.1%). I rendered the mask over the crop and looked — it covers
the entire lower-left white region, which is smoke. The 16.1% came from the warm-only mask,
which excludes white by construction, so it is not a core measurement either. **Use
`ab2-arcade-huge-explosion.jpg` for the core — it is the only fireball we hold that sits
against flat blue sky with no adjacent white** — and the kill frame for body statistics
only.

### FIRE-MASK — the fireball operator that can actually see a core (MEASURED R5)

```
mask = V > 0.55  ∧  ( R > B + 0.10  ∨  ( S < 0.25 ∧ V > 0.90 ) )
       MINUS the frame's excluded regions (MANDATORY — see below)
       then the largest 8-connected component
core fraction = ( S < 0.25 ∧ V > 0.94 ) within that component
```

> **THE EXCLUSION REGIONS ARE HALF THE OPERATOR AND THEY WERE MISSING UNTIL R6 (ledger row
> 19).** On `ab2-arcade-huge-explosion.jpg` (181×127) exclude **rows 0–14**, **rows 112–127**,
> and the wedge **x < 55 ∧ y > 82**. These are the top HUD strip, the bottom HUD strip and the
> cloud bank at bottom-left. **The largest-component step does not remove them** — they are
> 8-connected to the fireball through its spikes and its base, so the component swallows them.
>
> **CONTROL — run this before believing any fireball number.** Same frame, same operator:
>
> | | mean V | V>0.95 | **core** | mean S |
> |---|---|---|---|---|
> | **verbatim, no exclusions** | 0.8989 | 53.1 % | **17.2 %** | **0.764** |
> | **with the three regions** | **0.9030** | **53.6 %** | **9.1 %** | **0.848** |
> | **published** | 0.9055 | 54.2 % | 9.2 % | 0.846 |
>
> All four reproduce within 0.6 points once the regions are applied, and the core nearly
> **doubles** without them. If your run reads a core near 17–18 % or a mean S near 0.76 on this
> frame, you did not apply them. Mask dumps: `tools/out/criteria-r6/firemask-verbatim.png` (the
> HUD text and the white cloud wedge are plainly inside the mask) and `firemask-rects.png`.
>
> **The core predicate is now stated above because it was not stated before either.** "core
> 9.2 %" was published with no definition; it comes from I6, `S < 0.25 ∧ V > 0.94`. Reasonable
> neighbouring thresholds give **8.5–9.6 %** on this frame, so treat 9.2 as a figure with a
> ±0.6 definitional spread and **do not chase its decimals**.

The warm clause takes the saturated body; the second clause **re-admits the white-hot
core** that the warm clause rejects. Both halves are necessary, and each of the two
one-clause operators tried this round is wrong on its own:

| operator | on the arcade | on our capture |
|---|---|---|
| warm only (`R > B + 0.10`) | keeps 157 of 880 white-hot px — **deletes 82% of the core** | keeps 24–200 of ~1 600 — deletes **87–98%** |
| largest non-sky component | correct on the arcade (fireball on flat sky) | **floods the scene** — n 15 611–18 731, mean S 0.60 against the arcade's 0.85 |
| **FIRE-MASK** | **mean V 0.9055, V>0.95 54.2%, core 9.2%, mean S 0.846** | clean, see below |

Control: on `ab2-arcade-huge-explosion.jpg` FIRE-MASK reproduces the independent not-sky
measurement (0.891 / 52.3% / 8.8% / 0.848) to within 0.015 on every statistic, so the added
white clause recovers the core without admitting anything else. **That control was run with the
exclusion regions applied and published without them** — which is the whole of ledger row 19.

> **THE R5 OUR-SIDE READING BELOW WAS WRONG IN SIGN. Corrected R6.**
> ~~ours 0.874–0.903 / 44.0–54.2 % / **8.4–11.6 %** / 0.815–0.851 — "the core gate PASSES"~~.
> Measured with the operator's exclusions applied, our core was **28–32 %**, three times the
> arcade's 9.2 %, and our mean saturation was **22 % low** at 0.66–0.69 against 0.846. We were
> far **over**, not marginally under. R5 then held the value there as a deliberate trade
> against a "white disc", the R5 art critique reviewed that call and endorsed it, and the lead
> relayed it — **three parties reasoned correctly from an inverted premise.** The white disc
> was already on screen; `tools/out/combat-r6/expl-ab.png` shows it at a glance.

**Our build, measured with FIRE-MASK (exclusions applied) per phase, R6 combat lane:**

| | mean V | V>0.95 | core | mean S |
|---|---|---|---|---|
| ours, R5 as published (**wrong**) | 0.874–0.903 | 44.0–54.2% | ~~8.4–11.6%~~ | 0.815–0.851 |
| ours, R5 build re-measured | 0.862–0.880 | 46.5–53.9% | **27.7–32.3%** | 0.66–0.69 |
| **ours, R6 build** | 0.859–0.878 | 40.7–48.6% | **9.1–12.3%** | **0.824–0.846** |
| arcade (huge-explosion) | 0.906 | 54.2% | **9.2%** | 0.846 |

Core and saturation now land on the arcade. **V>0.95 is the one statistic now slightly low**
(40.7–44.3 % during ignition, under the published ≥45 %) and the combat lane **declined to
pull the lever for it**, because the lever is spike thickness and the spikes are also the
starburst silhouette that the R5 art critique separately flags as wrongly four-fold symmetric.
Trading one named art defect for a gate is how this document got its ledger. **That is an
accepted deliverable and it is the open item on this job.**

**POOL BY PHASE, AND NEVER ACROSS THE FADE (MEASURED R6).** Per-tick over a whole 0.75 s blast:
the core is **flat to within 4 points across ignition, bloom and hold** — it is an authored
texel grid, so it does not decay and a per-phase split buys nothing on those three. The **fade**
is different: at t > 0.58 s the sprite's alpha ramp blends it into the sky, `V>0.95` goes to
**0.0 %** and mean S collapses to **0.20**. **Any pooled figure including fade frames is
measuring the alpha ramp, not the fireball.** The R5 art critique's "judge the ladder per
phase" argument is correct and is adopted; it simply does not rescue the old value.

**R4 gap 11 is closed — but check it against the crop, not this table** (see below).

**The crop outranks this table.** The authoritative fireball references are
`reference/ab2-arcade-huge-explosion.jpg` whole-frame and `judging/R4/art-explosion-ours-left-arcade-right.png`,
viewed at 4–8× nearest-neighbour. These numbers exist to catch a fireball that is *not* a
fireball; they cannot certify that one *is*. If ours hits every row above and still does not
read like the crop side by side, the crop wins and this table is incomplete.

**WARNING — a "warm and bright" mask deletes the thing you are measuring.** Combat-fx
used `V > 0.55 ∧ R > B + 0.10` to isolate the fireball. That is a reasonable sky/cloud
rejector, but white-hot pixels have R−B of only **0.034** on average, so the mask
**discards 82.2% of them** (723 of the 880 white-hot pixels in the blast box survive only
under a non-warm mask). It barely moves mean V (0.8988 vs 0.8910) or the V>0.95 fraction
(50.7% vs 52.3%) because those are carried by the yellow body — but it drives the core
fraction from **8.8% down to 1.8%**. Measure the core with a **non-hue-gated** mask
(largest non-sky component) or you will under-build the exact feature R4 gap 11 is about.

**The fireball has real see-through gaps** (combat-fx, corroborating structure):
**20.0%** of the filled silhouette is not fireball, and **51.4%** of those interior pixels
are sky-coloured (median RGB 88/66/244) against only 7.7% genuinely dark. The boiling mass
is perforated, not solid. This costs nothing against the percentiles — a warm-and-bright
mask excludes those pixels on both sides — but it is a visible structural feature.

### Lock-on bracket geometry — a FIXED screen size (MEASURED R5)

This doc previously gave bracket colour but no geometry, which is why R4 gap 10 reads as
"four loose corners scattered near it". Mask `V > 0.70 ∧ S < 0.30` at native scale, union
of the four corner components:

| frame | target span | bracket extent |
|---|---|---|
| `stage1-level-flight-t116.png` (686×480) | distant enemy ≈1.9%W | 36 × 37 px = **5.25%W** |
| `stage1-missile-salvo-t100.75.png` (1028×720) | close enemy ≈8.8%W | vertical side 57 px = **5.5%W** |

**The targets differ by about 7× in span and the bracket is the same size.** AB2's lock
bracket **marks** a target, it does not outline it — on the close enemy the wings run
straight out through the box. Publish as: *square, **5.0–5.6%W on a side regardless of
target size**, ~1 native px stroke, corner arms 20–27% of the side.* Our build sized it at
1.5× the enemy span, which is the whole defect.

Caveat on the second row: in t100.75 the bracket's right-hand corners are occluded by the
white enemy sprite and the kill fireball, so its figure comes from the **vertical** side
only; a largest-component measurement there returns the aircraft (53×71 px, n=918), not the
bracket. Combat-fx's reported "53 px side" for that frame comes from that contaminated
component — the number happens to land close, but re-derive it from the vertical extent.

> ### CORROBORATED ON A WHOLE-SEQUENCE SAMPLE, AND THAT FREES IT FROM THE FOUR RETIRED FRAMES (MEASURED R10)
>
> Both figures above were read off frames in the hand-picked pack ledger row 37 retired. The feel
> lane ran a blind detector over **420 CONSECUTIVE frames at 60 Hz** (burstA, `-ss 98.5`, stage
> digit 1) and the width histogram of everything it finds is cleanly **BIMODAL**:
>
> | mode | n | R10, whole sequence | previously published | by |
> |---|---|---|---|---|
> | **lock bracket** | 75 | **5.246 %W** | 5.15 %W | R5, this section |
> | **nose sight glyph** | 68 | **1.493 %W** | 1.563 %W | R7, "The nose sight square" |
>
> **Two numbers published by two different lanes in two different rounds, recovered by one
> operator that was shown neither, on frames selected for neither.** This is exactly the
> whole-sequence corroboration rows 37 and 41 ask for, and it is the strongest form this project
> has: *the sample was not chosen by anyone who knew the answer.*
>
> **Operator** (`tools/out/feel-r10/brackets.py`, selftest 5/5 incl. a two-different-sizes case and
> a null): white mask `min(R,G,B) ≥ 205` over rows `[0.10H, 0.86H]`; corner candidate = 4-connected
> component, area 6–260 px, bbox ≤ 34 px both axes; a bracket = four candidates sharing two left-x
> (±4 px) and two y (±4 px) values, outer box square to ±6 px; **the reported value is the OUTER
> span**, left edge of the left arms to right edge of the right arms. **That is not
> `lockSystem.js`'s `BRACKET_BOX_PX` convention, which is centre-to-centre and renders at
> `boxPx + strokePx`** — convert before comparing, or this becomes ledger row 27 again.
>
> **DECLARED PRECISION FAILURE, and it bounds where the operator may be used**: on the **night**
> stage the ground's bright speckle generates spurious squares and the histogram grows a
> false-positive continuum from 11 to 128 px. **burstA is the clean sample; any burstN count is an
> UPPER BOUND.**
>
> ### NEW, AND IT PREVENTED A FEATURE BEFORE IT WAS BUILT: THE ARCADE'S BRACKET DOES NOT ANIMATE IN SIZE (MEASURED R10)
>
> The longest single track — **19 detections over frames 93–118** — reads
> `54 53 54 54 52 53 56 53 54 54 54 54 51 54 54 54 53 53 53` px: **flat within ±2 px across 26
> consecutive frames. It appears at its final size.** The feel lane was briefed to make our
> brackets "fill" or shrink in, and did not build it, because of this measurement.
>
> **Record it as a row in its own right: a plausible, good-looking feature was PREVENTED by a
> measurement.** This ledger is otherwise a list of things built wrong and then caught; an
> unbuilt-because-measured entry is the cheapest possible version of the same win and the project
> should notice when it happens. (Rows 42 and 43 are the same shape — caught before
> implementation — and all three come from lanes measuring the thing they were about to build.)
>
> ### "~6 LOCK BOXES AT ONCE" — RESTATED, AND THE 6 IS LEFT OPEN (R10, ledger row 41 updated)
>
> The *"during a salvo"* qualifier turns out to be load-bearing, and the clean sample cannot
> confirm the number:
>
> | sample | result |
> |---|---|
> | **burstA** — clean precision, 420 consecutive frames, stage 1, mostly non-salvo | **max 3 simultaneous; ≥2 in only 15 of 420 frames (3.6 %)** |
> | burstN — recall-rich, **precision-poor** (see above) | max 6, ≥2 in 239 of 1080 — **an upper bound, not a count** |
> | four panels of the t186.77 night salvo, eyeballed | 4–6 glyphs — *n is tiny and the lane looked before counting; an illustration, not a census* |
>
> > **Defensible restatement: "≤ 3 ambient, more during a salvo", with the 6 OPEN.** Nothing
> > contradicts ~6 and nothing clean confirms it. **The AMBIENT figure is the new fact** — usually
> > ≤ 1, and ≥ 2 in under 4 % of frames. A build showing several brackets continuously is wrong
> > even if its salvo peak is right.

### THE SIGHT'S LATERAL ENVELOPE AND STEP RATE — AB2 DOES NOT AUTO-CENTRE (MEASURED R10)

The first measurement of arcade **stick behaviour** in this project. Operator: the bracket
detector above, narrowed to `w ∈ [15,17]` px of 1028, linked frame-to-frame by nearest neighbour
(gate ≤ 14 px/frame, max gap 3 frames), tracks of ≥ 8 detections; `dx` is the consecutive-frame
difference of the box centre **only where the frame gap is exactly 1**. **418 consecutive-frame
steps, 25 tracks, two stages, 90 s apart, 60 Hz.**

**Identity confirmed by eye, not inferred from size** (`sheetN-sight2.png`, 7× zoom, eight
frames — a four-corner glyph on empty sky riding with the airframe). **The lane first cropped the
wrong element and says so**: the ~100 px (9.8 %W) corner box at upper right with a diagonal line
through it is the **attitude/horizon indicator**, not the sight. *Anyone re-running this will hit
that first* — and note the upper-right HUD has now been mistaken for a cloud, a cloud bank, a
false horizon, twice an enemy, and now the sight.

| `dx` px/frame | −7 | −6 | −4 | −3 | −1 | 0 | +1 | +3 | +4 | +6 | +7 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| n | 3 | 60 | 9 | 13 | 1 | **197** | 1 | 8 | 13 | 100 | 4 |

**3.2125 px of 1028 = 1 native px of 320, so the steps are QUANTISED IN WHOLE NATIVE PIXELS —
0, 1 or 2 per frame and never more.** Ceiling **2.179 native px/frame = 0.409 fracW/s**; modal
non-zero **1.868 native px/frame = 0.350 fracW/s**.

> **AND THE RAILS, WHICH ARE THE MORE IMPORTANT NEW FACT.** Nine stationary runs of 10–23
> consecutive frames at `dx = 0`; **eight sit at x = 618.0 (six times) or x = 415.5 (twice)** —
> +104.0 / −98.5 px from the 514 px centre. **A human cannot stop at an identical sub-pixel x on
> six separate occasions in fifteen seconds: those are hard limits, not a pilot resting.**
>
> **The arcade's lateral sight envelope is ±101 px of 1028 = ±9.83 %W, and AB2 does NOT
> auto-centre** — the sight holds where it is left. *n = 1 stage for the rails (all nine holds are
> burstN); burstA's single track reverses at 618 too, which is suggestive and not a second
> reading.*

> ### DO NOT GATE THE SIGHT RATE ALONE — IT IS ROW 37's SHAPE (BINDING R10, ledger row 58)
>
> Ours is **2.5–3.0× the arcade's rate**, and our envelope is **3.2–3.5× too wide**, so
> **centre-to-rail time is 0.31 s ours against 0.24 s arcade — nearly matched.** A lane gated on
> rate alone would "fix" responsiveness by slowing a stick that already crosses its own screen in
> about the right time, **because the rate gate is measuring the envelope.**
>
> **GENERAL FORM, and it is `MAX_ALIVE`'s shape without the self-measurement:** *a RATE gate over
> a span that is itself wrong is a closed loop. Publish the rate, the span, and the time to
> traverse it — or publish none of them.* Row 37 closed its loop by re-measuring our own build;
> this one closes by **normalising one of our own wrong numbers out of the statistic.** The feel
> lane identified this in its own figures and declined to propose the gate.
>
> **THE TELL, which is the reusable part and is the measuring lane's own: THE SUSPICIOUS THING WAS
> THE AGREEMENT.** A 2.5–3.0× rate gap and a 3.2–3.5× span gap that cancel to 0.31 s against
> 0.24 s is **not a coincidence, it is a shared cause.** This is R9's *"a cross-validation can
> agree because two errors cancel"* (ledger row 38) arriving somewhere nobody was watching for it,
> and it generalises past sticks:
>
> > **Two of our own numbers that are each wrong by a SIMILAR FACTOR will produce a derived
> > quantity that looks right.** The derived quantity is then the most reassuring thing on the
> > board and the least informative. **When a ratio of two of our own wrong numbers lands on the
> > arcade, check the numerator and the denominator separately before taking any credit for it.**

## Missiles / weapons visuals

### The smoke trail is WHITE — in every stage (MEASURED R5)

**WITHDRAWN: "overall mean V 0.37, brightest quintile 0.594, darkest quintile 0.219".**
That triple was ADOPTED from `missile_2d.gd`, which cites `ab2-arcade-night-missiles.jpg`
and gives no crop. R4 flagged it as a night value wrongly applied to daylight; verifying
it R5 makes it worse — **that frame contains no smoke trail at all.** Masking it at native
181×127 for low-saturation pixels (S<0.25, V>0.1) returns 1 132 px, and they are the HUD
reticle and attitude line, the SCORE emblem outline, the SPEED plate, the missile-stock
icons, the player airframe and the city-light speckle field — nothing contiguous, nothing
smoke-shaped. Their mean V is **0.366**, i.e. the published 0.37 is reproducible as a
*whole-frame grey-pixel average of a night HUD*, not as a trail. The only trail-like
structure in that frame is the missile's exhaust **flame**: hue 5–55°, S≥0.5, V>0.25 over
x[80,135] y[70,115] gives mean V **0.660**, bright/dark quintiles 0.966/0.303, mean
saturation **0.889** — bright orange, not dark grey. Implementing 0.37 is what made our
daylight trail black (R4 gap 4). Do not re-adopt it.

**IDENTIFIED R5 — the 0.37 was measured on a LOCK-ON BRACKET.** The combat-fx lane
reproduced the published triple to three decimals with a tighter operator: mask
`0.14 < V < 0.90 ∧ S < 0.25`, largest 8-connected component — n = **59 px**, mean V
**0.372**, quintiles **0.187 / 0.598**, ratio **3.19**, mean S 0.101. I re-ran it and got
the same 59 pixels, then cropped them and looked: that component is the **white square
lock-on bracket** drawn over the enemy ahead of the player, bounding box
**x[71,83] y[42,54]** of the 181×127 frame — 13×13 px of UI outline over black sky.
Regenerate it with the crop above and it is unmistakable.

This closes the provenance completely, and every word of the inherited description now
makes sense as a description of a bracket rather than of smoke: *"continuous opaque
ribbon"* = a drawn rectangle outline; *"100% column occupancy"* = a solid stroke;
*"~16 px thick at the head"* = a 13×13 px box; *"2.7× bright/dark internal value
structure"* = JPEG edge falloff on a white line against black. **The triple is therefore
withdrawn outright — it is not a night trail value to be scoped to night stages, it is not
a trail value at all.** Keep it only as the cautionary example it has become.

**MEASURED replacement.** Operator: read the frame at its stored resolution (no
upscaling); mask `saturation ≤ 0.25 ∧ V ≥ 0.6` (smoke is achromatic, every AB2 sky and
sea is saturated, so this separates them cleanly); report V and saturation over the mask.
Exclude the HUD bands (y<90, y>630 at 1028×720) and **do not** take a connected component
that has merged into a cloud bank — clouds pass the same mask, which is how R4's
"34–67%W" width arose (letting them merge reproduces 56.8%W here).

| frame | stage / light | box | mean V | median V | p10 V | mean sat |
|---|---|---|---|---|---|---|
| `stage1-missile-salvo-t100.75.png` | 1, day | x[330,620] y[400,630] | **0.962** | 0.969 | 0.937 | **0.053** |
| 60 fps t101 | 1, day | x[120,520] y[80,620] | 0.958 | 0.969 | 0.929 | 0.057 |
| 60 fps t178 | 3, **night** | x[300,800] y[360,630] | **0.909** | 0.922 | 0.804 | 0.055 |
| 60 fps t182 | 3, **night** | x[300,700] y[330,620] | 0.901 | 0.914 | 0.788 | 0.053 |
| 60 fps t226 | 4, day | x[660,980] y[380,590] (aged tail puffs) | 0.870 | 0.882 | 0.800 | 0.070 |

So the trail does **not** need a per-stage value split in the sense R4 proposed: it is
white on night stage 3 too, only ~6% dimmer than in daylight. **Acceptance: trail mean V
≥ 0.90 and mean saturation ≤ 0.10 on stage 1; ≥ 0.85 / ≤ 0.10 on night stages.** The R4
numbers for t100.75 (mean V 0.966, median 0.969, p10 0.941, sat 0.051) reproduce here to
≤0.01; its width figure does not — see below.

### Trail geometry — MEASURED on stage 1, replacing the whole inherited description

Operator (combat-fx lane, independently re-run by me — agrees to **2 px out of 84 511**):
on `stage1-missile-salvo-t100.75.png` at its stored 1028×720, mask `V > 0.80 ∧ S < 0.20`,
largest 8-connected component **inside the launch window x[260,700] y[360,720]**.

| | measured |
|---|---|
| plume pixels | 84 509 |
| mean V / median / p10 | **0.9674 / 0.9686 / 0.9412** |
| mean S / median S | **0.0504 / 0.0405** |
| **darkest / brightest quintile, RATIO** | 0.933 / 0.995 → **1.07** |
| column occupancy | **1.000** |
| bbox | **39.1%W × 50.0%H**, fill 0.584 |
| per-row width, missile end → launch end | **10.9%W → 36.2%W** |

**The daylight plume has essentially NO internal value structure — quintile ratio 1.07.**
The inherited "2.2–3.2× bright/dark" requirement is therefore **withdrawn for daylight**
along with the 0.37 it came from; it is a property of the lock bracket that triple was
measured on. It is what drove our ribbon's tail to V 0.19 and it will do the same to the
next developer. Keep the *shape* claims — a continuous opaque ribbon at 100% column
occupancy — which every frame above corroborates.

**Head thickness: 10.9%W = 35 native px on stage 1**, not the inherited "~16 px". That
figure traced to the same night frame, and R4 gap 4's "12–20 native px" reproduction
criterion inherited it. Our build ships 15.4 native px — inside the old band and
**conservative by a factor of ~2** against the stage-1 measurement. Raise toward 35 px for
stage 1; the night value is unmeasured.

**Width: 39.1%W bbox, tapering 10.9 → 36.2%W.** R4's "34–67%W" and my own earlier
"≥32%W floor" are both superseded by the windowed figure. A bright + low-saturation mask
on a stage-1 frame **must** state a window or a sea exclusion: stage 1's sea is 23–38%
foam above V 0.95 (this doc's own "Contrast / foam" numbers) and clouds pass the same
mask, so an unwindowed largest component floods out of the plume into foam, the grey ship
at frame left, and the cloud bank — reproducing bbox x[0,661] = **64.4%W at fill 0.350**,
against the windowed plume's clean 39.1%W at fill 0.584. **Any trail criterion without a
stated window is measuring the ocean.**

MEASURED addition: the trail's TAIL ages into a chain of discrete round white puffs
(t226, t332, t120 — measured above at mean V 0.870), and a launch throws large white
smoke billows that briefly occlude part of the frame (t99.75–t101).

**Projectile palettes** (MEASURED this pass on 2× nearest-neighbor crops of 60 fps
frames; coordinates are crop-local, crops reproducible from the stated source rects):

- **Player vulcan rounds** — small round orange puffs, ~3–4 native px, in a loose
  zig-zag column ahead of the nose (alternating muzzles), NOT thin white tracers.
  Source: t214, crop x[380,760] y[160,420] of 1028×720; samples `#ffdb21` (430,212),
  `#ffad15` (268,350), `#ff9f0c` (310,282). See `stage4-vulcan-stream-t214.png`.
- **Enemy shots** — larger oval fireballs, ~6–8 native px, in spaced trains of 4–8:
  pale-gold core `#ffd570`, orange body `#ff7733`, dark red rim `#941114`, salmon edge
  `#e96c63`. Source: t330, crop x[430,1028] y[330,620]; samples at crop (880,370),
  (880,355), (880,385), (870,395). See `stage7-enemy-shot-train-t330.png`.

## Speed / motion (bounds, not vibes)

ADOPTED (#127/#139 — the only certified flow numbers; at motion-metrics' 192 px work
width): arcade stage-1 cruise ground flow is a **floor** of ≥ 3.063 px/frame
(≈ 95.7 %W/s); canyon (stage 8) **certified 1.9433 px/frame** — the canyon runs at
**≤ 0.63×** cruise, i.e. canyons are *slower*, not faster. The arcade's true cruise
speed is not measurable from the available footage (every depth band fails the
anti-aliasing gate). **Never judge speed from frames sampled below 60 fps** — AB2's
ground texture aliases temporally (Nyquist) even at 15 fps; stills support only
pose/scale/composition claims.

### Stage-1 clouds — and the operator the numbers were taken with (OPERATOR ADDED R5)

> **RETIRED R5b — the #132 size figures were a correct operator over the wrong population.**
> The numbers below (width median 9.26 %W, height median 6.04 %H, aspect 0.97, presence
> 68–69 %, count 1/5/6) are **not cloud measurements** and must not be tuned to. They are
> preserved only so the retirement is auditable. Replacement figures: "Stage-1 cloud banks
> — CLOUD-ONLY, hand-classified" immediately below.
>
> ~~ADOPTED #132 arcade-side measurement over the HUD-verified stage-1 span t=88–120 of
> `ab2-longplay.mp4` (686×480, 33 frames): banks on screen in **68–69%** of frames;
> banks/frame median **1**, p90 **5**, max **6**; bank width median **9.26 %W** (p90
> **21.49**, max **42.27**), height median **6.04 %H**, aspect median **0.97**.~~
>
> Why it was wrong: the operator's mask (bright + achromatic) is satisfied by the launch
> carrier's superstructure, the HUD reticle's attitude line on empty sky, white enemy
> airframes, missile smoke plumes, explosion smoke, coastline surf, islands and sea foam,
> every one of which lands inside the 2–45 %H window. **Re-running the operator over its own
> source span t=88–120 at 0.5 s (65 frames, 120 components) and cropping and classifying
> every component by eye: 12 are cloud banks and 108 are not.** The first 10 frames
> (t88.0–92.5, the catapult launch) contribute 30 components and **zero** clouds — all
> carrier island, antenna masts, deck markings, the checkerboard elevator pad, and four
> instances of the HUD attitude line at 19.83 %W × 0.83 %H (normalised aspect 23.8).
> Evidence, re-derivable from this repo alone: `tools/classify_clouds.py` (independent
> reimplementation of the operator below, synthetic control PASS, see its docstring) plus
> the annotated contact sheets written by it.

Stage 1 is the only stage with measured cloud data; stage 6 is the arcade's dense-cloud
stage (unmeasured).

#### Stage-1 cloud banks — CLOUD-ONLY, hand-classified (MEASURED R5b)

**What was measured:** the bounding box of every component the #132 operator returns that a
human then identified as a cloud bank, and nothing else.
**In which frames:** `ab2-longplay.mp4`, stage-1 span **t = 88.0–120.0 at 0.5 s** (65 frames
at the stored 686×480 — the #132 span, sampled 2× denser). Frames re-extracted independently
and verified **bit-identical** to the world lane's set, so any disagreement is classification,
not extraction.
**With which operator:** exactly the #132 operator transcribed below — **including its two
mandatory arcade-side HUD rects, which two of three independent R5 runs skipped, each then
counting the arcade's SCORE emblem as a ~17 %W cloud bank; run the one-line control published
with the rects before quoting any arcade-side cloud number** — reimplemented
independently in `tools/classify_clouds.py` (synthetic control: width error 0.000 %W at two
resolutions, 8-connectivity, min-area, haze discard, window, truncation and normalised aspect
each checked against a known input). It returns the same 120 components as
`tools/measure_clouds.py`.
**Over which population:** the **12 of 120** components that are cloud banks. The per-bank
table is in `judging/R5/lane-criteria-fix.md`; every bank is croppable from the frame and
bbox given there.

| statistic (45 %H window, pooled) | retired #132 | **cloud banks only** | accept band for ours |
|---|---|---|---|
| width %W median | 9.26 | **20.41** (p25 10.71, p75 28.43) | **14–24** |
| width %W p90 / max | 21.49 / 42.27 | **34.02** / 42.27 **⚠ MERGED — see below** | p90 **25–40** |
| height %H median (pooled) | 6.04 | **24.17** | **16–28** |
| normalised aspect median | 0.97 | **0.86** (p25 0.77, p75 0.89) | **0.75–1.00** |
| presence / count per frame | 68–69 % / 1-5-6 | see "UNRESOLVED" below | not a gate |

> **⚠ 42.27 %W IS NOT AN ACHIEVABLE CLEAN BANK WIDTH. The largest clean bank is 33.24 %W.**
> (Flag restored R6 — it was carried in `judging/R5/lane-criteria-fix.md` line 103 and did not
> survive into this table, so a developer reading REFERENCE.md alone would have built to the one
> number the round retired.) The t101.0 component at `x[0,289] y[92,215]` is a cloud bank
> **merged with the rolled horizon-haze band, an enemy airframe and debris**, and it is also
> truncated at the frame's left edge (x=0), so its width is a lower bound on a merge. Both R5
> lanes that looked at it and the R5 judge, who cropped it independently, reach the same
> conclusion by different routes. The largest **clean** bank is **t120.0, `x[404,631] y[80,215]`,
> 33.24 %W** — height truncated by the 45 %H window, so that width is sound and that height is a
> lower bound. **Quote 33.24, not 42.27.**

Sanity floor, independent of any percentile choice: **10 of the 12 banks are wider than the
retired 9.26 %W median and all 12 are taller than the retired 6.04 %H median.** The retired
medians sit below almost every real bank — that is the defect, in one line.

**Heights are LOWER BOUNDS and the 45 %H window is why.** 7 of the 12 banks are cut by it.
Re-measuring the same banks over the **whole sky above a per-frame fitted horizon**
(`tools/measure_horizon.py`, synthetic control PASS, overlays inspected on all 55 frames)
the 8 banks that stay unmerged read width median **11.81 %W**, height median **14.69 %H**,
normalised aspect median **0.82**, and the three largest grow: t106.0 15.83→**16.46 %H**,
t120.0 28.33→**33.33 %H**, t118.0 37.71→**43.12 %H**. The other 4 merge with sea, surf or
haze once the window opens, which is why the full-sky window is NOT the published operator
(see "UNRESOLVED" below). Take the two windows as a bracket: **bank width median lies in
11.8–20.4 %W and height median in 14.7–24.2 %H**; the accept bands above are drawn inside
that bracket on the published (45 %H) operator so they stay re-runnable.

**Three operator defects found while classifying — read these before quoting any number:**

1. **The HUD rects sever tall objects into spurious high-aspect "banks".** Blanking
   `(18,20,400,58)` splits a smoke plume or a coastline band that passes behind it into a
   piece above and a piece below. Six components in this span are the *above* piece: thin
   strips at rows 10–19, e.g. 21.72 %W × 2.08 %H, **normalised aspect 10.4**. They are not
   objects; they are the mask's own scar. They pull the height median down hard.
2. **The 90 %W haze-seam discard only works when the frame is level.** The stage-1 horizon
   haze band is full-width, bright and achromatic, and the discard removes it — until the
   world rolls, when the same band becomes a diagonal swath whose bbox is under 90 %W and it
   is counted as a bank. At least 9 components in this span are the rolled haze band, several
   above 19 %W.
3. **Frame-edge truncation is unhandled.** The operator's truncation rule covers the two
   horizontal window cuts only ("a horizontal cut cannot change a width"). A **vertical frame
   edge** certainly can: 5 of the 12 banks touch x=0 or x=W−1, so those widths are lower
   bounds too. Treat a bank whose bbox touches a frame edge as truncated in that axis.

**Explosion smoke reads as cloud under this mask, and one colour statistic separates them.**
Over the masked pixels of a component, mean **(R − B)**: every verified cloud bank reads
**−1 to −12**; the two large pale masses at t99.5 and t119.5 read **+25.3** and **+27.0** with
mean saturation 0.124–0.125 against cloud's 0.045–0.089. Both are explosion smoke — confirmed
by stepping the footage at 0.1 s, where each appears one frame after a fireball and is gone
within 0.2 s. **This is a screen, not a classifier:** a missile plume reads **−10.2**, i.e.
indistinguishable from cloud, so the test catches warm smoke only. Use it to re-examine, then
look at the crop.

**UNRESOLVED — presence and banks-per-frame.** Neither is published as a target.
See "Stage-1 cloud presence" below.

**These numbers are operator-dependent and R4 showed the two defensible operators disagree
by nearly 3× (threshold p90 width 8.56%W vs isolation 23.88%W on the same build). Measure
ours with THIS operator, because it is the one the cloud-only arcade numbers above were
re-derived with.**
The #132 classifier is transcribed **in full** below so this repo needs nothing outside it
(CLAUDE.md: standalone). Every constant is reproduced; nothing is left as a reference to an
external file:

- **Segmentation**: `saturation < 0.25 ∧ V > 0.80`, where V = max(R,G,B)/255 and
  saturation = (max−min)/max — i.e. **bright and low-saturation**, at the frame's stored
  resolution, **never upscaled**.
- **Analysis window**: rows **2%H to 45%H** only. This is load-bearing, not tidying: the
  same threshold matches **white aircraft and sea foam**. On the cloudless t=94 every
  qualifying component below the window is a fuselage or a wave crest. Widening the window
  without adding aircraft/foam rejection inflates the count with jets.
- **HUD exclusion — MANDATORY ON BOTH SIDES, and the arcade side is the one that gets
  skipped (REPAIRED R6, ledger row 15).** For arcade frames, blank these two rects, given as
  **`(x0/W, y0/H, x1/W, y1/H)` — opposite corners, NOT `(x, y, w, h)`** (the convention was
  never stated, and the second rect is nonsense under the other reading):
  **`(18/686, 20/480, 400/686, 58/480)`** — the SCORE emblem and the score digits — and
  **`(495/686, 30/480, 660/686, 105/480)`** — the lock reticle and its attitude line. **For our
  build, derive the exclusion per run with `tools/hud_mask.py` — never hardcode a box.**

  > **R7: the reticle rect above is the SIZE-figure rect and it is KNOWN SHORT** (ledger row
  > 23). Its lower edge at 0.219 of H clips the attitude line in a banked frame, which reaches
  > **0.299** at true native. The *size* distributions below are left on it so they stay
  > internally consistent; **any operator that COUNTS or CLASSIFIES objects must use the wider
  > `(0.720, 0.055, 0.965, 0.330)`** — see "The upper-right HUD has now been counted as four
  > different things". Re-deriving the size figures on the wider rect is an open item.
  With clouds disabled, a mis-sized rect left the HIT counter's digits exposed and the
  build "reported a cloud in 100% of frames while rendering none".

  **CONTROL — run this before believing any arcade-side cloud number.** On
  `reference/stage1-level-flight-t116.png` (686×480), this operator returns, at the ≥150 px
  minimum:

  | | components ≥150 px |
  |---|---|
  | **without** the rects | **1** — area 496, bbox `x[35,153] y[32,52]`, **17.35 %W**: the arcade's own **SCORE emblem** |
  | **with** the rects | **0** |

  If your run reports a ~17 %W "bank" at a fixed bbox across many consecutive frames, you are
  measuring the SCORE emblem and you did not apply the rects. **Two of the three independent R5
  runs did not** — the R5 judge found **25 of their 77 components (32.5 %)** were the emblem, at
  a median width of 17.20 %W and a near-constant 498 px, which is this control's 496 px and
  17.35 %W to within a pixel. The emblem's white chevron wings satisfy `sat < 0.25 ∧ V > 0.80`
  exactly and it sits inside the 2–45 %H window, so nothing else in the operator excludes it.
  The HIT digits survive the rects but are far below 150 px and never form a component.
- **Components**: 8-connected, **≥150 px**. Discard any component **wider than 90%W** —
  that is the horizon haze seam, not an object (it previously reported "clouds" of median
  width 100.0%W).
- **Truncation**: a bank touching either window cut has a height that is a lower bound.
  **Height and aspect come from untruncated banks only; width is always pooled** (a
  horizontal cut cannot change a width, and truncation preferentially selects large banks,
  so an untruncated-only width median is biased small — 7.07 against the pooled 9.26).
- **ASPECT IS NORMALISED, NOT GEOMETRIC**: `aspect = (width/W) / (height/H)`. On a 1.43:1
  frame the same bank measures **0.97 normalised and 1.39 in pixels**. Building to a pixel
  aspect of 0.97 renders banks **1.43× too tall**. Both frame shapes in play are ~1.429
  (686×480 = 1.4292, 960×672 = 1.4286), so matching one matches the other; any other frame
  shape must re-derive it.

**KNOWN BIAS IN EVERY OUR-SIDE CLOUD FIGURE — carry it with the number (MEASURED R5).**
The HUD mask is subtracted *before* components form, so the HUD cannot be counted as a cloud
or merge two banks — the historical failures. The risk now runs the **other** way: at the
bank sizes we render, **55.4 % of 130 components have a bbox overlapping the HUD mask**, so a
glyph stroke can **sever** one bank into two. Control, labelling on `(cloud OR HUD)` so a
stroke cannot cut a bank while bbox and area still come from cloud pixels only:

| | components | count med/p90/max | width median %W | p90 |
|---|---|---|---|---|
| HUD removed (as published) | 130 | 1 / 2 / 4 | 18.12 | 37.22 |
| HUD permeable (control) | 126 | 1 / 2 / 3 | 18.28 | 37.34 |

**Published our-side figures over-count by 3.1 % and under-state width by 0.9 %.** Small —
8-connectivity routes around most thin strokes — but real and **directional**, so quote it
alongside any our-side count or width. **It grows with every horizontal rule added to the
HUD**, which contrast plates are likely to add: anyone who changes HUD geometry re-runs this
control and republishes the bias figure rather than leaving it for the judge. The arcade side
is unaffected (its HUD rects are fixed and its banks are measured in the sky window).

**OUR SIDE IS CURRENTLY MEASURED WITH A DIFFERENT CLASSIFIER (R5 finding).**
`tools/measure_clouds.py` in this repo diverges from the operator above on six axes, every
one of which pushes the measured width down or the count up, so its figures are not
comparable with the arcade's until it is reconciled:

| | #132 operator (what the arcade numbers are) | this repo's `tools/measure_clouds.py` |
|---|---|---|
| saturation | `< 0.25` | `< 0.35` |
| value | `V > 0.80` (max(RGB) > 204) | `max(RGB) > 150` (V > 0.588) |
| window | rows **2–45 %H** | rows 0 → `--horizon-row` (default 140 of 224 = **62.5 %H**) |
| connectivity | **8-connected** | **4-connected** (fragments dithered edges) |
| min component | ≥150 px at 686×480 = 0.046% of frame | `--min-area 3` at 320×224 = 0.004% |
| haze-seam discard | drop components wider than 90%W | **absent** |
| truncation | height/aspect from untruncated banks only; width pooled | **absent** |
| frame | 686×480 as stored | our capture decimated 3× (`img[::3, ::3]`) |

Its aspect *is* the normalised one (`cw` and `ch` are already %W and %H), despite the
`(w/h)` label — that part is right. Reconciling the rest is a prerequisite for scoring
gap 7; until then the only defensible statement is the judge's, that the two operators
disagree by nearly 3× on the same build.

**Instrument control (R5)**: reimplemented from the prose above, independently of that
script, and run on t=88–120 extracted frame-by-frame: presence **72.7%**, count median
**1** / p90 **5.0** / max **5**, width median **8.16 %W** / p90 **21.43** / max **42.27**,
untruncated height median **5.62 %H**, normalised aspect median **1.06**. Every figure
lands inside the classifier's own published accept bands (58–80% / 8.0–11.0 / 38–46 /
5.0–7.5 / 0.85–1.10) and the width max is exact, so the operator above is the right one.

**R5b — what that control did and did not prove.** It proved the *operator* is faithfully
transcribed: three independent implementations now reproduce it to the second decimal.
It proved nothing about the *population*, and the population was 90 % non-cloud.
**Cross-validation between implementations cannot detect a population error — only looking
at the crops can.** The old closing line here, "presence and height already pass; do not
retune those", was the single most damaging sentence in this document: it told the cloud
author to hold a height median taken from foam bands and HUD attitude lines. It is withdrawn.

### Stage-1 cloud presence — UNRESOLVED, and why (R5b)

**No presence or banks-per-frame target is published.** The build currently ships **70 %
in-window presence, count 1 / 2 / 4**, which is **ADOPTED, not MEASURED**: a deliberate
choice by the lead to keep the sky populated, taken in preference to a clean-looking number
that would empty it. Do not cite 70 % as an arcade fact and do not judge against it.

Three things are known, and together they are why there is no target:

1. **The retired 68–69 % was presence of non-cloud objects.** Over t=88–120 at 0.5 s only
   **7 of 65 frames** contain a hand-verified cloud bank inside the 2–45 %H window
   (**10.8 %**), and the 10 catapult-launch frames that contribute the most components
   contain none at all.
2. **That 10.8 % is itself not the arcade's cloud density**, because the window stops at
   45 %H and cannot see near-horizon cloud. The 45 %H cut truncates 7 of the 12 banks it
   does find.
3. **Opening the window does not fix it — it makes the population worse.** With the row cut
   replaced by a per-frame fitted horizon (`tools/measure_horizon.py`; angle recovered
   exactly on synthetic controls, sky-mask IoU ≥ 0.986, line overlays checked by eye on all
   55 frames and correct even at 60°+ of roll), component presence over the same frames rises
   to **96.4 %** with a median of **4** components per frame — the extra population is the
   player's own white airframe, enemy airframes, missile trails, surf and the rolled haze
   band. Worse, the large banks then merge with the sea into frame-spanning blobs
   (t101.5 reads 71.43 %W × 85.00 %H), so bank geometry stops being measurable at all.

**Conclusion: on this footage presence cannot be measured by any threshold operator without
a hand-classification step, and the window was never the binding problem — the mask was.**
`tools/measure_horizon.py` is kept because it is validated and because it gives untruncated
heights for unmerged banks (above), not because it closes presence.

**Condition to re-open:** an aircraft/plume/surf rejection step good enough to be validated
on a labelled set — i.e. agreeing with a human on all 120 components of this span — or a
hand count over a span long enough (several minutes, multiple stage-1 passes) that 10.8 %
stops being an 7-of-65 estimate.

## Enemies

- Size at closest approach (ADOPTED #105): wingspan ≈ **25–30%W** just before the
  fly-past. See `ab2-arcade-closeup-enemies.jpg` — **a stage-2 frame** (digit read); fine for
  this, because size at closest approach is geometry, not livery.
- Enemies bank hard into their lateral drift — measured large-enemy bank **≈57°**
  (ADOPTED #131: wing axis dx705/dy1080 on a 3× crop of closeup-enemies, again **stage 2**;
  again geometry), and they roll into/out of turns rather than holding one angle.
- Enemies fly at altitude (in the sky band), approach from the horizon growing toward
  the player, and cross the frame.
- ~~grey MiG-type silhouettes read dark against bright skies (t116 left, t148, t186)~~ —
  **WITHDRAWN R6. The t116 frame cited here contradicts it**: its left-hand enemy is a pale
  grey-white airframe with green wing camo, an orange nozzle and a near-black nozzle ring, and
  it reads **light** against the blue sky. See the polarity table below. The claim held for the
  stages it was really drawn from (t148 is stage 2, t186 is stage 3) and was exported to
  stage 1 without being checked there — the same error as ledger row 12, in this document.

### Value polarity is PER STAGE, and stage 1 is the light one (MEASURED R6 — ledger row 12)

> **RETIRED for stage 1: the "near-black dominant" enemy livery** (`judging/R4/art-critique.md`
> line 737). It was derived from `ab2-arcade-closeup-enemies.jpg`, whose own HUD digit reads
> **STAGE 2** — orange sky, dark-green camo MiGs. The arcade **flips enemy value per stage to
> hold contrast against the sky it is flying over**: dark aircraft on the bright orange stage-2
> sky, pale aircraft on the saturated blue stage-1 sky. Our `camo` livery is correct *for stage
> 2*; the error is a near-black family on stage 1. **Nothing is retired for stage 2.**

**Operator**: crop one enemy; drop the sky with `(B − R) > 80` (stage-1 sky `#009eff` reads
B−R = 255, a pale airframe ~0); V = max(R,G,B)/255 over what remains; **dump the mask and look
at it** (`tools/out/criteria-r6/value/t116-enemy-mask.png` — it holds the aircraft and nothing
else).

| population | stage (digit read) | V median | share V < 0.3 | share V > 0.7 | light : dark |
|---|---|---|---|---|---|
| arcade t116 left-hand enemy (this lane) | **1** | **0.582** | **18.5 %** | **35.8 %** | **1.9 : 1** |
| arcade t100.75 enemy (R5 art critic, independent operator and frame) | **1** | 0.557 | 23.2 % | 41.1 % | 1.8 : 1 |
| **ours, `enemy-grey-*.png` sheet** (R5 art critic, `53ce86b`) | 1 | **0.227** | **61.0 %** | **3.5 %** | **0.06 : 1** |

**ACCEPT (stage-1 liveries): share(V > 0.7) must EXCEED share(V < 0.3)** on the sprite's own
pixels, by at least 1.5:1. Ours is inverted by a factor of ~30.

**The gate is a ratio and not a value target on purpose.** Both arcade readings come from video
upscales, where edge blur pulls dark pixels up and light pixels down — so 0.557 and 0.582 are
soft, and the art critic correctly published theirs as an **upper bound, not a target**. Blur
compresses the two shares toward each other; **it cannot flip their order**. The ordering is the
blur-robust part of the measurement, so the ordering is what the gate uses. Two frames, two
implementations, 0.025 apart in median and the same ordering at the same ~1.8:1.

**What the stage-1 enemy actually is**, from the crop and not from a statistic
(`tools/out/criteria-r6/value/t116-enemy.png`, 6× nearest): a **pale grey-white fuselage** with
**green camo across the wings**, a **near-black nozzle ring** and a **hot orange nozzle centre**.
Not a dark silhouette with light accents, and not a plain white aircraft either. The near-black
is a 1-px *accent ring*, which is exactly the element R4 measured and then promoted to dominant.

## Known gaps (not verified here)

- Stage-2/3 ground palettes: stage 2 measured (above); stage 3 night ground is
  UNMEASURABLE by the hue method (near-black; needs a value-only estimator).
- Barrel roll: one instance measured (t221.4–222.9; frame committed); 360° single-
  direction continuity CONFIRMED at frame stepping in round 4 (note: the 60 fps file
  duplicates frames in this span — effective unique rate ~30 fps); the input trigger and
  i-frames remain open — see GAME_SPEC.md §1.
- Throttle speed-effect magnitude: still unmeasured (only the HUD letter state and the
  refuel-time score-accrual pause are observed).
- The 60 fps file (`ab2-longplay-60fps.mp4`, 1028×720) is the same recording as the
  686×480 map-keyed file (verified: identical scene + HUD at t84/t116, matching
  durations), so the stage map applies to both; round-3 facts were measured on it.

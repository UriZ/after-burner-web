# Round 9 judge report

**Tree measured**: commit `bd73b52de439f4d5690356c3265137be9756c27b`
("R9 criteria: the per-palette licence, and why the threshold must not be retuned").

`git status --short` was **empty** when judging began. It is **not** empty now, and the honest
statement is the precise one: **`git diff --stat HEAD -- src tools` is empty at the start and at
the end — not one tracked file under `src/` or `tools/` was modified** — so every measurement
below is of `bd73b52`'s shipped code, byte-for-byte, and nothing I did touched it.

What appeared during the session, declared in full: my own files
(`judging/R9/report.md`, `judging/R9/judge-arcade-count-rule.md`, `judge_motion_r9.mjs`,
`judge_track_r9.py`, and capture output under `tools/out/judge-r9/`, which is gitignored as all
capture output is), and the files of an **R9 art critique running concurrently in this same tree**
— `judging/R9/art-critique.md`, twelve `art-r9-*.png` panels, a new untracked `tools/motion_compare.py`,
and **one modification to a tracked file I depend on: `tools/capture.mjs`.** I did not read the
art critique and nothing here is sourced from it.

**That one modification needed checking rather than declaring, so I checked it.** The diff is
purely additive — a `--warmup N` flag defaulting to 0, guarded by `if (args.warmup > 0)`. I never
passed it. To be sure the tool did not change under my own captures (some were taken before the
edit at 17:39 and some after), I **re-ran the capture that produced my headline population frame,
tick 2076, with the modified tool and compared bytes: identical, sha1 `40d4ef07f40dd2da` both
times.** Every figure in this report stands.

**And the author of that edit reached my §2 conclusion independently, which is worth recording.**
Their comment at the new flag reads: *"Needed for motion work: `--every 1` is the only way to see
how something moves, and without a warmup every consecutive-frame run has to start at tick 1. Nine
rounds of this project judged stills because the tooling made sampled capture the path of least
resistance."* Two reviewers, no contact, same diagnosis, same afternoon. That is the strongest
evidence I have that §2 is the real finding of this round.

**Judge**: fresh context. Did not build any of this. Every number below is my own measurement
unless it is explicitly labelled as a reproduction of a lane's instrument, and the two are
distinguished everywhere.

---

## 1. Verdict

### Score: **7 / 10 composite — and the trend line 3 → 4 → 6 → 7 → 7.5 → 8 → 8 → 8.5 is RETIRED, not continued**

| axis | score | basis |
|---|---|---|
| **still frames and telemetry** — what every round so far has measured | **9 / 10** | §§3–8. R9's work on this axis is real, verified and large |
| **MOTION** — measured for the first time this round, by anyone | **4 / 10** | §2. Six probes: one hard defect, one criterion blind spot, one constant with no anchor anywhere, one clean pass, one direction I could not make reportable, one instrument withdrawn |
| **composite** | **7 / 10** | **the motion score is mostly "unknown", not mostly "wrong"** — and that is the finding |

**Read the motion score as a measurement gap, not a verdict on the art.** Six probes in one
afternoon produced one unambiguous defect, one clean pass, and four results that say *nobody
knows*. A 4 means the axis is uncharted, and the honest thing a judge can say about an uncharted
axis is that it is uncharted — not that it is bad.

**I had this report drafted at 9/10. That draft is withdrawn and this is why.**

**Nine rounds of this project have judged still frames. I did too, for most of this round.** Two
greps across every judge report, both art critiques, `REFERENCE.md` and `GAME_SPEC.md` — one for
*"has any reviewer compared motion"*, one for *"missile tracking / heat-seeking / lock acquisition
/ turn rate"* — return **nothing**. Every instrument this project owns reads one frame or a
telemetry scalar. **A game can satisfy all forty-three repaired criteria and be wrong the instant
it moves, and that is what has happened.**

**The repo has known this since before round 1 and nobody used the tool.**
`.claude/skills/youtube-reference/SKILL.md` exists precisely for this, and it names the defect
class in its own words: *"How fast does an object grow as it approaches? … This is exactly the
class of defect that stills-only review kept missing. Issue #105 — enemy sprites plateauing at a
fixed size for the entire near half of their approach — is invisible in any single screenshot and
obvious across a burst."* **No judge has ever produced a motion burst.** I am the ninth.

**What one afternoon of motion measurement found, all of it new:**

> **1. Our explosion is a PLATEAU where the arcade's is a FLASH.** Same fire mask, same operator,
> both sides at 60 Hz: the arcade's peaks at **6.03 %** of the frame and is down to **0.28×** of
> that **one tenth of a second later**; ours peaks at **3.69 %** and is still at **0.85×** at the
> same moment, holding within 60 % of peak for **0.600 s against the arcade's 0.067 s — 9×**.
> Every palette, value and silhouette gate scores our fireball as a pass and all of them are
> right. **What is wrong is its envelope in time, and no criterion in this project has one.**
>
> **2. The arcade's kill timing is violently bursty and nothing here has ever sampled it finer
> than 4 Hz.** Dated off the HIT digit frame by frame: kills at t = 96.333, 99.433, 100.267,
> 100.500, 100.633 — **three kills in 0.367 s inside one salvo, after a 3.100 s drought.**
> ARCADE-PACING gates the *rate*, and a rate has no shape. Ours delivers 0.519 kills/s smoothly.
>
> **3. `HOMING_GAIN = 1.7` — the constant that decides how hard a heat-seeking missile turns, the
> exact thing the owner named — carries no tag, no comment and no arcade anchor of any kind**, in
> a file where every other constant carries MEASURED or ADOPTED. And the launch→impact band the
> whole missile speed profile was tuned to is a **4 Hz** reading of a **sub-second** event, taken
> on one of the four hand-picked frames that ledger row 37 retired. **The arcade's missile has
> never been measured by anyone, at any sampling rate.**
>
> **4. And one thing the motion pass CLEARED, plus one I got wrong.** The enemy approach law is
> geometrically exact — `span × depth` constant to three decimals, no size plateau, so the defect
> class the repo's own skill warns about is **not** present. And I measured our bank snap, wrote
> it up as a defect, then found `player.js:123` documenting it as **measured arcade behaviour at a
> rate my own number reproduces exactly**. Withdrawn before publication; §2.1 has it in full.

**This reframes the owner's verdict and I think it resolves it.** *"It's very bad"* and *"you are
over-optimising on other areas and missing those"* are not in tension with eight rounds of rising
scores — they are the predicted consequence of them. **A lane fixes the axis that is measured.**
Every round, the measured axis was colour, value, palette, silhouette topology and population; the
unmeasured axis was everything that only exists between frames. The score went up because the
measured axis improved. The game did not become After Burner II because the axis a player actually
experiences was never on the board.

**What R9 itself delivered is real and I am not taking it back.** My predecessor's diagnosis — *"the
arcade puts two aircraft in front of you and we put seven"* — is **closed, verified from pixels by
me, not from telemetry**: 1.67 enemy aircraft per frame against the arcade's stage-1 1.47, where
the same tick carried ten before. The title went from one static image to a matched-span
DRAW-WEIGHT match that animates. The far LOD stopped being a rectangle. Criterion A2 now passes in
ordinary play with real combat. Every build claim R9 made and I could check, held. That is the 9.

**And the still-frame axis has one more defect of its own that belongs with the motion ones**,
because it is the same failure in a different place: on this build **a pilot that never touches the
stick kills at exactly the same rate as one that tracks — 0.519/s each, a ratio of 100.0 % against
a ≤40 % gate** (§7.1). Aiming does nothing. That is not a pixel property either.

---

## 2. THE MOTION PASS — the first one this project has had

**Everything in this section is new.** No judge report, art critique, `REFERENCE.md` row or
`GAME_SPEC.md` row in nine rounds contains a measurement taken across consecutive frames, and the
repo's own `youtube-reference` skill — written for exactly this and naming exactly this defect
class — has never been used by a reviewer.

### 2.0 Method

| | |
|---|---|
| **arcade** | `.reference-cache/video/ab2-longplay-60fps.mp4`, `-ss 96.0 -t 5.0 -vsync 0` → **300 consecutive frames at 60 fps**, stage 1, digit read. Plus a second burst at t=98.6. |
| **ours** | `judging/R9/judge_motion_r9.mjs` (new): steps to an offset and then records **every tick** — the full per-enemy census, missiles in flight, locks, brackets, hits — and optionally saves the PNG for every tick. `tools/capture.mjs --every 1` could not do this when I started — its first frame is always tick 1 — though the concurrent art critique added a `--warmup` for the same reason during the session (see the tree-state note). |
| **matched** | both sides are read at **60 Hz**, which is the point: every prior figure in this project that touches time was taken at 4 Hz (0.25 s) or coarser. |
| **player attitude, arcade** | `judging/R9/judge_track_r9.py` (new): the player's F-14 carries TWO lit nozzle discs, so bank = the angle of the line joining them. **Validated by marking all 28 readings and looking at every one** — §2.5. |

### 2.1 THE BANK SNAP IS NOT A DEFECT — I measured it, wrote it up as one, and the source refuted me

I am leading with this because it is the one finding in this section I got wrong, and it is the
kind this project keeps paying for.

`?fixed=1&seed=1&nocombat=1&debugstick=1` — constant full stick — captured at **every tick**:

| tick | `bankDeg` | `worldRollDeg` | `jetNdcX` |
|---|---|---|---|
| 1 | **23.33** | 1.24 | 0.067 |
| 2 | **35.60** | 2.48 | 0.127 |
| 3 | 35.60 | 3.73 | 0.181 |
| 10 | 35.60 | 12.42 | 0.442 |
| 20 | 35.60 | 24.83 | 0.604 |
| 54 → 240 | 35.60 | **66.50** (saturated) | 0.699 |

The sprite reaches 65 % of its bank range in **one tick** and 100 % in **two**, while the world
roll ramps at 1.24°/tick = 74.5°/s and needs **54 ticks**. I wrote that up as "the aircraft
teleports and the horizon catches up nine hundred milliseconds later".

**Then I read `src/entities/player.js:123`, and it is deliberate, measured, and documented:**

> *"MEASURED arcade behaviour: the drawn jet snaps between a quantised ladder of SIX bank poses
> (0/8.4/15.9/23.3/30.3/35.6 deg) at ≥1236 deg/s, driven by the STICK, while the world rolls
> underneath it at a much slower, independent ~74.5 deg/s — **r = −0.257** correlation between the
> two in the critique's own measurement, i.e. not slaved together at all."*

My tick-1 figure of 23.33° in one tick is **1400 °/s**, which is `BANK_SNAP_RATE_DEG_PER_S`
exactly. **The measurement confirms the implementation matches its own measured spec.** The
"0.800× world roll" in STATUS that I was about to cite against it is the *old* behaviour, replaced
in R5 for precisely this reason. **CONFIRMED, not a defect. Do not open a gap.**

The lesson is the project's own and it caught me on my first motion measurement: *a number that
looks like a defect against a rule you half-remember is a reason to read the source, not to
publish.* The R5 feel critic had already done this work at a sampling rate fine enough to see it —
which, I note, makes that critique **the one prior piece of motion measurement in this repo**, and
it is in `judging/R5/`, not in any criterion. It never reached `REFERENCE.md` or a gate.

### 2.2 THE ARCADE IS BANKED HARDER AND MORE OFTEN — direction only, and here is why it is not a gate

My first version of this compared the arcade's **apparent on-screen angle** (what a pixel operator
can see) against our **`bankDeg` telemetry** (the sprite's own pose, excluding world roll). Those
are two different quantities and it inflated the gap. Corrected by running **the same nozzle-line
operator on both sides**, and validating both by marking every reading and looking:

| apparent on-screen jet angle, same operator both sides | **arcade** | **ours** |
|---|---|---|
| n, after validation | **23** of 30 | **8** of 11 |
| median | **23°** | **10.4°** |
| share < 10° | 8.7 % | 25.0 % |
| share > 30° | **34.8 %** | **12.5 %** |
| maximum | **82°** | **31.9°** |

**Ours excluded 3 of 11 by looking**: one was the barrel-roll sheet (a different quantity), two had
the marks on an explosion plume. The arcade excluded 5 of 30 the same way (§2.5).

> **The direction is consistent and the magnitude is not reportable. n = 8 on our side, the
> operator carries several degrees of error at small nozzle separations, and the two pilots are an
> expert and an autopilot. I am recording this as a direction with its n, not as a gate, and the
> reason is that my first pass at it was wrong by construction.**

**What IS a hard fact is the ceiling.** `BANK_POSE_DEG` tops out at **35.6°** and at full stick
held for 240 ticks `bankDeg` reads 35.60 on every tick. Whether that top rung is right is a
question about REFERENCE's six-pose ladder, and **I cannot answer it**: on the arcade side I can
only measure pose *plus* world roll and I have no way to separate them. **Someone should, and the
60 fps footage now in `tools/out/judge-r9/motion/arc-s1/` is enough to do it** — the HUD stays
upright, so the HUD's own rotation gives the world roll and the difference gives the pose. That is
a half-hour job and it would settle a constant the player feels on every input.

### 2.3 THE ARCADE'S KILL TIMING IS VIOLENTLY BURSTY, AND NOTHING HERE HAS EVER SAMPLED IT FINER THAN 4 Hz

The HIT digit occupies a fixed box. Comparing that box pixel-by-pixel between **consecutive**
frames dates every increment to ±1/60 s. Validated by cropping the digit at every detected change
and reading it (`tools/out/judge-r9/motion/hit-steps.png`: 0→1→2→3→4→5, all legible, no false
positives).

> **Kills at t = 96.333, 99.433, 100.267, 100.500, 100.633.**
> A **3.100 s** drought, then **0.834 s**, then **0.233 s**, then **0.133 s** —
> **three kills in 0.367 s inside one salvo.**

ARCADE-PACING's arcade column uses *"the arcade expert's 0.42–0.54 kills/s"*, which is HIT 0→13
over 24 s. **The instantaneous rate inside a salvo is ~8 kills/s — twenty times the average it is
quoted as.** Our `arcstill`/`arctrk` arms deliver 0.519 kills/s *smoothly*, and the criterion
cannot tell the difference because a rate has no shape. **This is the emptiness lesson again, one
level down**: a mean cannot tell a game that kills three aircraft in a third of a second and then
nothing for three seconds from one that kills every two seconds.

### 2.4 THE EXPLOSION — ours holds near its peak NINE TIMES longer than the arcade's

Same mask on both sides (`R>180, 60<G<235, B<90`), same operator, both at 60 Hz, each on the
largest single event in its window:

| | **arcade** (t=99.65–100.32) | **ours** (`?demo=2`, the kill at tick 362) |
|---|---|---|
| peak fire area | **6.03 %** of frame | **3.69 %** of frame |
| ticks within 60 % of peak | **4 — 0.067 s** | **36 — 0.600 s** |
| 0.10 s after the peak | **0.28 × peak** | **0.85 × peak** |

> **The arcade's explosion is a flash: it peaks at 6 % of the screen and is down to a quarter of
> that within a tenth of a second. Ours is a plateau: smaller at its peak and still at 85 % of it
> a tenth of a second later, holding within 60 % for six tenths of a second.**

And what follows it differs more than what it is. The arcade's kill at t=99.433 leaves a **pale
smoke mass that grows to roughly a quarter of the frame by t≈99.7 and is still there at t=100.7 —
over 1.27 s** (`tools/out/judge-r9/motion/arc-launch.png`, read by eye; I have no segmentation for
it that survives the clouds, and I am not publishing a number I cannot defend). **Ours leaves
nothing**: the fire decays to the afterburner baseline by tick 407 and there is no residue of any
kind. The existing palette and silhouette gates score our fireball as a pass, and they are right —
it is the *envelope in time* that is wrong, and no gate has one.

### 2.5 THE INSTRUMENT I BUILT AND WITHDREW, and the one I kept only after looking at all of it

**Withdrawn in full.** My first arcade tracker reported the player's screen speed at a median of
**337 % of the screen per second** and a single-frame displacement of **64.8 %**. Both numbers were
clean, stable and reproducible. Cropping the worst pair and looking
(`tools/out/judge-r9/motion/track-jump.png`) showed frame 228 with **the player entirely hidden
behind a cloud** and the tracker latched onto a near enemy — arcade enemies carry a lit orange
nozzle too, which my "two nozzles = the player" rule had not allowed for. **No screen-speed figure
is published in this report.**

**Kept, but only after validating every reading.** The bank tracker in §2.2 was then constrained to
plausible nozzle pairs and run on 30 frames. I marked all of them and looked at all of them
(`bank-validate-0.png`, `bank-validate-1.png`): 2 were correctly refused by the operator, and
**5 more had their marks on an explosion plume rather than on nozzles** — all 5 in the half of the
burst that is full of explosions. Those 5 are excluded by hand, with the reason. **The unvalidated
28-frame reading would have been median 27° and 42.9 % over 30°; the validated 23-frame reading is
median 23° and 34.8 %. The looking cost four points and the conclusion survives it.**

### 2.6 What the motion pass CHECKED AND CLEARED

- **The approach law is geometrically correct and it is NOT the `youtube-reference` skill's issue
  #105.** Per-tick, over 420 consecutive ticks: `span × depth` is constant to three decimals on
  every enemy (id 6: span 0.0083 at depth 84.9 and 0.2712 at depth 2.6 — 0.705 and 0.705). Enemies
  spend only **6.4–14.5 %** of their on-screen life within 20 % of their maximum span, which is the
  hyperbolic growth a perspective approach should have. **There is no size plateau. Do not open a
  gap here.**
- **Our missile does home**, and launch→impact is exact from per-tick telemetry: launched tick 326
  and 330, impacted tick 359 and 362 → **0.550 s and 0.533 s**. See §2.7 for why that is not
  reassuring.
- **Lock acquisition is regular**: locks accumulate one every **7 ticks (0.117 s)** against
  `LOCK_INTERVAL_S = 0.10`, on two separate salvos, and peak at **3 locks / 4 bracket sets**
  against GAME_SPEC's arcade-measured *"~6 lock boxes on screen at once"*.

### 2.7 THE MISSILE — the one the owner named, and it has no arcade side at all

`HOMING_GAIN = 1.7` in `src/weapons/missiles.js:65` is **the constant that decides how hard a
heat-seeking missile turns.** It carries **no tag, no comment, and no reference of any kind** —
not MEASURED, not ADOPTED. Every other constant in that file has one. Nothing in `REFERENCE.md`,
`GAME_SPEC.md` or any judge report constrains it.

And the one missile dynamic that *is* specified is specified from a sample too coarse to carry it.
GAME_SPEC §3: *"Launch → impact ≈ 0.5–1.5 s at the depths observed (**explosions land 2–4 frames
of 0.25 s after the launch flurry**)"*, measured on `reference/stage1-missile-salvo-t100.75.png` —
**one of the four hand-picked frames that ledger row 37 retired.**

> **A 4 Hz sample of a sub-second event. 2–4 frames of 0.25 s is 0.50–1.00 s with ±0.25 s of
> quantisation at each end, i.e. a true support of 0.25–1.25 s.** `missiles.js` calls its speed
> profile *"MEASURED-TO-SPEC rather than picked"* and tunes `V0`, `ACC` and `V_MAX` to land inside
> 0.5–1.5 s. **The spec it was tuned to is one observation read off a 4 Hz grid**, and ledger
> row 29 already made this exact class binding: *a claim about a sub-second behaviour is only as
> good as the sampling interval it was taken at.*

**I could not supply the arcade side and I want to be explicit about the bound.** At 60 Hz I can
date every arcade *kill* to ±1/60 s (§2.3), but I could not attribute a kill to a specific launch:
the player's own missiles fly away from the camera and are lost against the launch billow within a
few frames, and the billow is indistinguishable from the previous kill's smoke at 686×480 or
1028×720. **So: the arcade's launch→impact time, its missile turn rate and its seeker behaviour
remain UNMEASURED by anyone, and our two constants for them are a 4 Hz inference and an untagged
number.** That is the state of the thing the owner put second on his list.

---

## 3. Method, and instrument validation

Everything was validated on a known input before being trusted.

| instrument | control | result |
|---|---|---|
| `tools/art/inkspan.py` | `--selftest`, 8 controls | **PASS 1–8**, reproduced here |
| `tools/inkspan_arcade.py` | `--selftest` | **PASS** |
| `judging/R9/title_drawweight_r9.py` | `--selftest`, 3 controls | **PASS** |
| `judging/R9/occlusion_r9.py` | `--selftest` (50.000 % / 0.000 %) **and** the real no-combat-vs-itself arm | PASS; **0.0 % on all 21 of my own frames** |
| `tools/assert_population.py` | `--selftest` incl. the known-bad R7 set and the `?nocombat` collision control | **PASS** |
| `tools/measure_criterion_ab.py` | `--selftest` against both arcade natives | **PASS** |
| `tools/art/far_lod_preview.mjs` | evaluates the draw functions' own source | PASS, and **hand-checked against the source independently** (72/128) |
| judge's own DRAW-WEIGHT audit | six synthetic subjects I built, not the lanes' | §4 |
| frame sweep | **204 frames across 12 of my capture directories, within and across** | **0 black**, 19 duplicate groups, **every one explained** (below) |
| `npx vite build` | — | **passes** |

**Duplicate accounting, all 19 groups.** 16 are `death/frame-00NN` ↔ `death2/frame-00NN`: two
independent capture runs of the same URL, byte-identical — which is a determinism confirmation,
not a defect. 2 are `occ-e157-A↔C` and `B↔D` at frame-0000, the **launch** frame where combat-on
and combat-off render identically (the same duplicate the pacing lane documents). 1 is
`pop-173-BEFORE ↔ pop-173` at frame-0000, tick **173**, state **launch** — before any spawner
difference can reach the screen. No duplicate exists between two frames the statistics use.

**Citation discipline applied throughout.** Every tick index below is quoted with its URL, from
the set's own `capture-manifest.json`, with the flow state and the stage digit the HUD draws.
Every single-frame figure states whether its subject is static, and names the phase if not.

**SUBJECT STATIC, declared:**

| subject | static? | phase if not |
|---|---|---|
| arcade sphere plate | **NO** | read at the CREDIT-0 card's face-on moment, t=72.30 s |
| arcade wordmark | **yes** | identical across t70–t74 |
| our title plate | **NO** | tick 256 = one full revolution, face-on |
| our player jet in flight | **NO** | each frame's tick, state and `poseSource` printed from the manifest |
| authored sprite cells | yes | — |
| arcade census frames | n/a (population statistic over a grid) | — |

**My own capture sets**, all new, all `tools/out/judge-r9/`:

| set | URL | n | purpose |
|---|---|---|---|
| `pop-173` | `?fixed=1&seed=1&demo=1&invincible=1` | 24 @ every 173 | population hand count |
| `pop-211` | same | 20 @ every 211 | second spacing |
| `pop-173-BEFORE` | same **+ `&pace=maxalive=14,gapmin=0.9,…`** | 12 @ every 173 | the before population on one build |
| `occ-e157-{A,B,C,D}` | `?fixed=1&seed=1&demo=1&invincible=1` ± `hidejet`/`nocombat` | 22 × 4 @ every 157 | player occlusion |
| `title-faceon`, `title-anim` | `?showtitle=1&fixed=1&seed=1` | 1 @ 256, 9 @ every 37 | title |
| `death2` | `?fixed=1&seed=1&demo=1&forcedeath=6` | 34 @ every 22 | death hulk |
| `arcade/` + `arcade-digit-sheet.png` | `ab2-longplay.mp4`, 4.00 s grid | 25 (3 excluded) | my arcade census |
| `pace-after.json`, `pace-before.json` | `pace_probe_r9.mjs`, 4 pilots × 3 seeds × 90 s | — | ARCADE-PACING reproduction |

Tick spacings 157 / 173 / 211 — three spacings, none dividing `?demo=1`'s 960-tick cycle.

---

## 4. R9's claims, one by one

| # | claim | lane's figure | **my figure** | verdict |
|---|---|---|---|---|
| 1 | aircraft emitted / s of flight | 0.567–0.647 | **0.567–0.647** (12 arms, my own probe run) | **CONFIRMED** |
| 2 | sky empty of aircraft (`demo`) | 30.2–45.1 % | **33.1–48.0 %** telemetry; **28.6 %** by my own pixel hand count | **CONFIRMED** |
| 3 | longest empty stretch, run lengths | p50 3.4–5.1 s, p90 7.2–8.5 s | **p50 3.42–5.13 s, p90 7.15–8.50 s** | **CONFIRMED** |
| 3b | **before**: longest empty run 0.32 s, median occupied run 86.5 s | 0.32 / 86.5 | **0.32 / 0.17 / 0.02 s and 86.18 / 86.33 / 86.48 s** (3 seeds) | **CONFIRMED** |
| 4 | title wordmark height 91 → 114 (arcade 115) | 91 / 114 / 115 | **91 / 114 / 115** | **CONFIRMED** |
| 5 | title INK/SPAN 44.21 → 38.85 (arcade 38.33) | 44.21 / 38.85 / 38.33 | **44.21 / 38.85 / 38.33**, span ratio **1.003** | **CONFIRMED** |
| 6 | jet: filled mass → blades with sky between | qualitative | **PARTIALLY CONFIRMED** — the blades gained sky, the **body did not** | **PARTIAL** |
| 7 | `drawRearFar()` 100.0 % → 56.3 % fill | 56.3 % | **56.3 % (72/128)**, by instrument **and** hand-counted from source; R8's was `fillRectHard(0,0,FW,FH)` = literally 100 % | **CONFIRMED** |
| 8 | the hand count at t2076: 7–8 before, 2 after | 7–8 / 2 | **~10 before, 2 after** | **CONFIRMED** (and the before is understated) |

### 4.1 Claims 1–3 — pacing

I re-ran `judging/R9/pace_probe_r9.mjs` myself, 4 pilots × 3 seeds × 90 s, every tick, on the
committed tree. **Every row of the lane's §7 table reproduces to the digit on my run:**

| row | GATE | AFTER `arcstill`/`arctrk` (lane) | **mine** | AFTER `demo` (lane) | **mine** |
|---|---|---|---|---|---|
| ≥1 enemy at ≥10 %W | 9–29 % | 9.0–13.8 | **9.0–13.8** | 25.7–34.1 | **25.7–34.1** |
| no enemy at ≥3 %W | ≥27 % | 59.0–67.9 | **59.0–67.9** | 33.1–48.0 | **33.1–48.0** |
| mean on screen ≥3 %W | 0.9–1.6 | 0.63–0.90 | **0.63–0.90** | 1.58–1.76 | **1.58–1.76** |
| ≥2 enemies at ≥5 %W | ≤25 % | 11.4–16.9 | **11.4–16.9** | 30.4–36.7 | **30.4–36.7** |
| share below 10 %W | ≥65 % | 79.0–87.4 | **79.0–87.4** | 70.5–73.5 | **70.5–73.5** |
| emission /s | 0.4–1.0 | 0.567–0.700 | **0.567–0.700** | 0.578–0.647 | **0.578–0.647** |

**That is a reproduction, not an independent measurement, and I am labelling it as one.** It
proves determinism and the absence of fabrication. The independent check is below.

**The `?pace=` before-control also reproduces exactly on my run**, which is what licenses every
"before" figure in the round: emission **2.832 / 2.867 / 2.855 per second** on three independent
operators, mean alive **12.81–13.02**, readable presence **86.0–88.5 %**, empty sky **0.0–0.6 %**,
and the run-length pair that is the most telling number of the whole round —
**exactly one empty run in 90 s, 0.32 s long, and one continuously-occupied run of 86.18 s.**
A sky that, in ninety seconds, never emptied. It now empties eight or nine times a run for three
to five seconds at a time.

### 4.2 THE INDEPENDENT CHECK — my own pixel hand count of our own build

**21 stage-1 flight frames, two spacings (173 and 211), `?fixed=1&seed=1&demo=1&invincible=1`,
every tick and stage digit read from `capture-manifest.json`, counted by eye off the 3× capture
with 6× zooms on everything inside a lock-on bracket.** `tools/assert_population.py` over both
sets: `pop-173` weapon 8/24, explosion 3/24, enemy-fire 11/24; `pop-211` weapon 6/20,
explosion 4/20, enemy-fire 11/20 — **combat is real in the frames I counted.**

| ticks | counts (enemy aircraft, any size) |
|---|---|
| 173-grid: 346 / 519 / 692 / 865 / 1038 / 1211 / 1384 / 1557 / 1730 / 1903 / 2076 | 5 / 0 / 3 / 1 / 1 / 0 / 0 / 2 / 3 / 1 / 2 |
| 211-grid: 211 / 422 / 633 / 844 / 1055 / 1266 / 1477 / 1688 / 1899 / 2110 | 0 / 3 / 3 / 1 / 1 / 0 / 2 / 3 / 1 / 3 |

| statistic | **ours, my pixel count (n=21)** | arcade stage 1, pooled two readers (n=15) |
|---|---|---|
| mean aircraft / frame | **1.67** | 1.47 |
| frames with **no** enemy at ≥3 %W | **28.6 %** | 33.3 % |
| frames with ≥1 at ≥10 %W | **~38 %** (span read to ±2–3 points) | 40.0 % |

**The build now lands on the arcade's own stage 1 on all three, measured off the pixels by a
reader who did not build it.** Before the change, at the same tick and seed, I count **ten**
(`tools/out/judge-r9/t2076-BEFORE.png`, produced on the *same* build via the lane's `?pace=`
override, which is why this is one build and two populations and not two builds).

→ `tools/out/judge-r9/t2076-centre-2x.png` (after, 2 aircraft) and `t2076-BEFORE.png` (before,
~10). Both tick 2076, state `flight`, stage digit 1, same URL but for `&pace=`.

### 4.3 Claim 6 — the jet is "blades with sky between them"

**PARTIAL.** `judging/R9/r9-02-…-8x.png`, read against the true-native arcade crop: the arcade's
banked jet is four thin cream strokes each with a `#840000` line beside it and two heavy nozzle
discs, with **sky visible through the planform**. R8's is a solid filled mass. **R9's blades have
gained sky — and its central fuselage has not.** The arcade's body is a narrow spine; ours is
still a filled cream mass joining all four blades.

That is exactly what the numbers say, and the lane says it about itself:

| committed sheets, `tools/art/inkspan_jet.py` (my run) | DENS | RSW | RP90 |
|---|---|---|---|
| arcade day-bank, true native, licensed mask | **87.8** | **3.65** | **9.82** |
| ours, level cell | 106.8 | 4.52 | 10.10 |
| **ratio** | **1.22×** | **1.24×** | **1.03×** |

**The gated statistic is the one we already pass.** RP90 is the 90th percentile — the thickest
mass — and both aircraft's thickest mass is the same object, the nozzle disc. The statistic that
still sees the defect is **RSW, the median**, at 1.24× — and REFERENCE.md forbids gating on it for
a reason that was retracted this round (§5.4).

---

## 5. Audit of DRAW-WEIGHT

The first criterion in this project for *drawing* rather than colour, value or silhouette
topology. It is a real addition and the controls behind it are better than anything else in the
ledger. Four findings, in order of consequence.

### 5.1 THE MATCHED-SPAN LICENCE DOES NOT COVER THE GATED STATISTIC — and both implementations' controls print the refutation without asserting on it

REFERENCE's licence condition is proved by one control: *"the identical synthetic at 2× nearest
moves INK/SPAN by ×1.999 and SW/SPAN by 0.001 points"*, and it concludes **"Across different
sizes or resolutions the comparable forms are SW/SPAN and bbox fill."**

I built six subjects of my own and magnified each by nearest neighbour, which changes **no pixel
of the drawing**:

| judge-built subject | INK/SPAN × | DENS × | **RSW ×** | **RP90 ×** |
|---|---|---|---|---|
| axis bar, width 3 — *the lane's own control arm* | 1.984 | 0.984 | 0.991 | **0.743** |
| axis bar, width 2 | 1.985 | 0.983 | **0.496** | 0.991 |
| axis bar, width 4 | 1.983 | 0.983 | 0.991 | 0.991 |
| axis bar, width 5 | 1.984 | 0.983 | **0.744** | **0.826** |
| 45° bar, 3 px | 1.986 | 0.984 | **0.496** | **0.784** |
| 45° bar, 4 px | 1.986 | 0.982 | **0.701** | 0.994 |
| *(an asymmetric 5-limb figure, 1× → 4×)* | *3.967* | *0.983* | *0.631* | — |

**DENS is the only one of the four that holds, on all six: 0.982–0.984.**

> **On five of six subjects RSW or RP90 moves 17–50 % under a pure 2× magnification of an
> unchanged drawing. On the control's OWN subject, RP90 — the statistic the project gates on —
> moves −25.7 %.**

This is not a dispute about my synthetics. It is printed in `tools/inkspan_arcade.py --selftest`'s
own output: control A reads `SW 2.0 (3.3 % span) P90SW 4.0` at span 60.03 (RP90 **6.66**) and
control B reads `SW 4.0 (3.3 % span) P90SW 6.0` at span 120.10 (RP90 **5.00**). The control
asserts SW/SPAN and prints P90SW/SPAN moving 25 % beside it. `title_drawweight_r9.py`'s control 2,
an independently written implementation, has **the same hole**: `RSW 4.47 → 4.40` is asserted,
`RP90 8.93 → 6.60` is printed and is not.

**On the licensed arcade day anchor itself** (`reference/ab2-arcade-desert.png`, my own run of the
licensed membership rule), 1× → 2× nearest:

> **DENS ×0.987 — genuinely scale-free. RSW ×0.786 (−21.4 %). RP90 ×0.941 (−5.9 %).**

**Consequence, and it is narrow but real.** The licence sentence is wrong as written: across
resolutions the comparable forms are **DENS and bbox fill**, not SW/SPAN. The clause as published
invites exactly the cross-resolution stroke comparison that the drawing lane's own §2.4i scale finding
(0.00 % vs 10.73 % CV on one aircraft) warns against, and the night-LEVEL anchor is a 686×480
video brought to "native-equivalent" at span 116.6 and compared against our 99-span cell — an 18 %
scale mismatch. I checked whether it changes any R9 conclusion: extrapolating the measured −21 %
RSW move per octave, an 18 % scale gap is worth ~−5 %, which does not explain our 1.24× RSW. **No
published R9 number is overturned by this. The licence text must still be fixed, and the two
controls must assert on RP90.**

### 5.2 THE STATED BLIND SPOT IS CORRECT; THE REASON GIVEN FOR SW COVERING IT IS NOT

REFERENCE: *"a density statistic cannot separate a slab from an X of separated blades at matched
ink and span … **which is why SW, RSW and RP90 exist beside it**"*. Control 7 shows the separation:
INK/SPAN ×1.025, DENS ×1.037, RSW ×1.430, RP90 ×1.811. I reproduced all four.

**But I built the control the suite does not have — the same blades, with and without the hub,
i.e. identical stroke width and identical arrangement, differing only in CONNECTEDNESS:**

| judge-built | components | ink | span | DENS | **RSW** | **RP90** |
|---|---|---|---|---|---|---|
| X, four 3 px blades **joined** at a hub | 1 | 477 | 80.00 | 74.53 | **2.50** | **5.00** |
| the same blades, **hub removed** | 4 | 408 | 80.00 | 63.75 | **2.50** | **5.00** |

> **SW and RP90 are identical. The stroke statistics see THICKNESS, not SEPARATION.**

And the sharper one — matched ink, matched span, **matched local thickness**, different drawing:

| judge-built | ink | span | DENS | RSW | RP90 |
|---|---|---|---|---|---|
| X of four 3 px blades | 477 | 80.00 | 74.53 | 2.50 | 5.00 |
| comb of two parallel 3 px strokes, length 80 | 480 | 79.80 | 75.38 | 2.51 | 5.01 |
| **separation** | | | **×1.011** | **×1.003** | **×1.003** |

> **Two completely different drawings; all four statistics agree to within 1.1 %.**

**Verdict: the blind spot is correctly stated and the gate still works for the defect it was
built for** — the R4→R8 defect was a *filled mass* against *thin blades*, which is a thickness
difference, and RP90 catches it. What is imprecise is the attribution: SW does not cover
separation, and at matched thickness the whole four-statistic set is blind to arrangement.
REFERENCE already says so in blind spots #2 and #3 — *"blind to … WHERE the ink sits"*, *"if the
component count is not 1, publish it"* — so the **list is right and the summary sentence is
wrong**. `jetsil.py` is the topology gate and must keep carrying that weight, which REFERENCE also
says.

### 5.3 THE PER-PALETTE THRESHOLD LICENCE IS SOUND; ITS PUBLISHED ANTI-RETUNE FIGURE IS NOT REPRODUCIBLE

The **licensed day anchor reproduces exactly** on my own run of the published decision procedure
(IN if `sat < 0.35 AND V > 0.08`, **or** exactly one of `#840000`/`#000000`/`#425284`; largest 8-connected component; 4-connected
background flood), on `reference/ab2-arcade-desert.png` x[80,180] y[82,142]:

> **ink 1056, span 109.70, INK/SPAN 9.63, DENS 87.8, RSW 3.65, RP90 9.82 — every digit.**

REFERENCE's anti-retune table, which is the licence's whole justification, does not:

| sat floor | REFERENCE: ink | REFERENCE: RP90 | **judge: ink** | **judge: RP90** |
|---|---|---|---|---|
| **0.35** | **1 056** | **9.73** | **1056** | **9.82** |
| 0.45 | 1 097 | 9.73 | **1097** | **9.82** |
| 0.50 | 1 317 | 8.48 | **1198** | **9.82** |
| 0.55 | **1 368 (+29.5 %)** | **8.31 (−15 %)** | **1207 (+14.3 %)** | **9.51 (−3.2 %)** |

The two agree exactly at 0.35 and 0.45 and diverge at 0.50 and 0.55. I could not reproduce 1 368
or −15 % under **any** of seven variants: three crop boxes (the drawing lane's, the A3 box
`x[85,182) y[82,140)`, and a wider box), and four mask-step variants (no `AIRFRAME_EXTRA`, no
`fill_holes`, no largest-component, and the licensed rule). The closest, dropping the
largest-component step, gives +34.1 % ink and RP90 ×0.918 — still not −15 %.

**And the correct figure is in the same lane's own report.** `judging/R9/lane-criteria.md:1073`
carries the 1 317 / 1 368 / 8.48 / 8.31 table and the sentence *"**+29.5 %, not the +14.3 %
reported**"*. Two hundred lines later, `lane-criteria.md:1268` carries
*"0.55 … ink **1207**, DENS **100.4** — **+14.3 %**, desert admitted"* and *"RSW is completely
threshold-insensitive (3.65 at every threshold 0.35–0.60) while INK/SPAN and DENS move 14 % and
**RP90 3.2 %**"* — **which is my reading, to three significant figures, on all three statistics.**
REFERENCE.md promoted the wrong one of the two, and promoted it with an explicit upward
correction of the right one.

**The conclusion survives and I want that said plainly.** Raising the floor still inflates the
arcade day anchor's ink by **14.3 %** because the desert starts qualifying, and the night rule
still covers **97.8 %** of the daylight crop (REFERENCE says 98.6 %; same conclusion). **Neither
rule generalises, the per-palette licence is right, and the threshold must not be retuned.** What
is refuted is the sentence that makes it a gate-level emergency — *"it moves the GATED statistic
by 15 %"*. It moves it by 3.2 %. A future lane told the gate moves 15 % under a mask choice will
make different decisions from one told it moves 3 %.

This is the round's own process rule (b) catching the round: *the figure most worth cropping is
the one you have already explained to yourself.* "+29.5 %, a cliff because the desert qualifies"
is a large, reproducible-looking number that arrived with a tidy mechanism attached.

### 5.4 REFERENCE STILL CARRIES A RETRACTED FIGURE AS THE REASON RSW IS NOT GATED — AND RSW IS THE STATISTIC THAT STILL SEES OUR JET'S DEFECT

REFERENCE.md:762 publishes *"CV: … RP90 5.3 %, **RSW 18.4 %**"* and REFERENCE.md:775 concludes
*"**RSW is the exception and must not be gated on alone: it is the LEAST rotation-stable of the
four at CV 18.4 %**"*. Neither line is marked.

`judging/R9/lane-drawing.md` §2.4g **retracts that figure in full**: *"I published 'RSW is the
least rotation-stable of the four at CV 18.4 %'. That is a property of my synthetic, not of RSW,
and it is retired."* `tools/art/inkspan.py` control 6 prints the real-subject CVs and labels the
synthetics **`<- NOT evidence`**. I ran it: on real subjects RSW CV is **0.22 % / 0.40 % / 3.84 %**.
My own eight-rotation run on the **licensed day anchor** (§5.5) agrees and goes further:

| arcade day jet, 8 rotations | DENS | **RSW** | RP90 |
|---|---|---|---|
| CV | 0.8 % | **0.4 %** | 2.6 % |

> **On the licensed anchor RSW is the MOST rotation-stable of the four. REFERENCE excludes it from
> the gate for being the least.**

And the exclusion sentence and the invariance box it sits next to are **the same synthetic run** —
`inkspan_jet.py --invariance` arm B prints `INK/SPAN 1.2 / DENS 1.7 / RSW 18.4 / RP90 5.3` on one
line, and REFERENCE quotes all four. The lane retracted one of the four and the box kept all four.

**Why it matters rather than being a tidy-up.** Our jet now reads RP90 **1.03×** the arcade's and
RSW **1.24×**. The gated statistic says the jet is finished; the un-gated one says the body is
still a quarter too thick, which is what the crop shows and what the lane itself reports as its
headline residual. **The one statistic that still discriminates is excluded from the gate on a
basis its own author withdrew in the same round.** One line of REFERENCE fixes it; whether RSW
should then be gated is a criteria-lane call, not mine, but the stated reason cannot stand.

### 5.5 What the audit CONFIRMS, including two things I tried to break and could not

**The bank-invariance claim is true, and on a real subject it is stronger than published.**
REFERENCE's CV row (INK/SPAN 1.2 %, bbox fill 28.7 %, "24×") is `--invariance` **arm B, which is
the synthetic** — the very run the lane retracted the RSW 18.4 % from, and by the lane's own new
rule (*no stability claim from a synthetic whose stroke width you chose*) none of its four numbers
is evidence. So I ran the test the box needs: **the licensed arcade day anchor, one drawing, eight
rigid rotations**:

| arcade day jet, 8 rotations (judge's run) | INK/SPAN | bbox fill | DENS | RSW | RP90 |
|---|---|---|---|---|---|
| **CV** | **0.5 %** | **14.1 %** | 0.8 % | **0.4 %** | 2.6 % |

> **29.4× on a real aircraft, against the synthetic's 24×. The art critic's claim stands and now
> has the control it needed.** And in the same run **RSW is the MOST rotation-stable of the four
> at CV 0.4 %** — the opposite of the sentence that excludes it from the gate (§5.4).

**The ground-truth mask argument reproduces exactly, and it took me two attempts — which is the
one thing the box should add.** My first run put the largest-component step *before* the
intersection with `alpha > 0` and returned a clean, plausible, stable **57.0 %** for cell 4. The
published ordering — intersect with alpha first, then take the largest component — returns
**20.9 %**. Both columns then land on REFERENCE to the decimal:

| day cell | four roles, raw | four roles + LC (**α first**) | four roles + LC (**LC first**) | achromatic |
|---|---|---|---|---|
| 0 | 66.3 % | **36.9 %** | 66.2 % | **94.3 %** |
| **4 (level)** | 57.6 % | **20.9 %** | 57.0 % | **92.4 %** |
| 8 | 63.0 % | **41.7 %** | 63.0 % | **93.6 %** |

> **The four-role rule's recovery depends on an unstated step ordering by up to 36 points. The
> achromatic rule's does not depend on it at all — 94.3 / 92.4 / 93.6 under both orderings.**
> That is a fourth, independent argument for the licensed rule that nobody has made, and the
> ordering needs one line in the box.

- The topology condition (8-connected foreground, 4-connected background flood) is correct;
  control 8 pins it on a diagonally-stepped ring (28 px vs 113 px). Reproduced.
- The day/night anchor "agreement" is correctly withdrawn as arithmetic (the two sheets' alpha
  planes are byte-identical — I verified).
- INK/SPAN is correctly refused as a gate.
- `drawRearFar()`'s rebuild is correct and 56.3 % really is this design's floor: three full-width
  rows of eight is 37.5 % before a shaped pixel, and I re-derived the nearest-sampling argument
  (`floor((i+0.5)·8/h)` for h = 1…8 hits rows 2, 3 or 4 every time). **Do not open a gap for it.**

---

## 6. Audit of the retirement of R3's readable-presence gate

**The retirement is CORRECT. I re-derived the arcade's figure independently and I cropped the
disputed frame.**

### 6.1 My own arcade census — a fourth reader, a fourth grid, three new stages

Rule written to `judging/R9/judge-arcade-count-rule.md` **before any frame was extracted**: 686×480
map-keyed longplay, STAGE_MAP VERIFIED spans trimmed ≥4 s, **fixed 4.00 s grid** (the 63-frame set
used 3 s, the R8 feel critic 2 s, the R9 pacing lane 5 s), **stages 1, 2, 9, 21** — of which **2, 9
and 21 have never been counted on a grid by anyone in this repo**. Stage digit read on all 25
frames before counting (`tools/out/judge-r9/arcade-digit-sheet.png`): **1×7, 2×6, 9×6, 21×6**,
every one legible. Three excluded by rule before counting: `s09-t380` and `s21-t860` (refuel
tanker), `s09-t384` (RELOAD WEAPONS card). **22 frames counted.** Everything inside a lock-on
bracket was zoomed to 6× before being counted or rejected.

**Per-frame labels, with spans, exclusion reasons and classification notes:**
`tools/out/judge-r9/arcade/labels-judge-r9.csv`. Every figure in the table below is arithmetic
over that file (22 counted, 23 observations, 17 at ≥3 %W, 4 frames carrying one at ≥10 %W,
13 empty at ≥3 %W) and is reproducible from it in one line.

| | n | stages | readable ≥10 %W present | mean / frame ≥3 %W | empty at ≥3 %W | share below 10 %W |
|---|---|---|---|---|---|---|
| R8 feel critic | 18 | 3 (1, 6, 16) | 16.7 % | — | — | 77.1 % \* |
| R6 63-frame set (criteria) | 63 | 6 (1, 4, 6, 7, 12, 19) | **19.0 %** | 1.270 | 39.7 % | 77.1 % \* |
| R9 pacing lane | 21 | 4 (1, 3, 10, 11) | 28.6 % | 1.476 | 28.6 % | 79.2 % |
| **this judge, 4 s grid** | **22** | **4 (1, 2, 9, 21)** | **18.2 %** | **0.773** | **59.1 %** | **73.9 %** |
| **pooled, four readers** | **124** | **13 distinct** | **20.2 %** | | | |
| **R3's gate** | | | **≥ 60 %** | | | |

\* *the two 77.1 %s are reported by two documents and may be one figure quoted twice; I did not
resolve it and it changes nothing — my own reading is 73.9 %.*

> **Four independent readers, four grids, thirteen distinct stages: 16.7 / 18.2 / 19.0 / 28.6 %,
> pooled 20.2 %, against a gate of ≥60 %. The gate is wrong by a factor of three and the
> retirement is right.**

My stage-1 column alone: **28.6 % readable-present (2/7), 42.9 % empty, 1.14 mean/frame.** Pooled
with the two other stage-1 readers: **8 of 22 frames = 36.4 %**, which is the figure a stage-1
capture should be read against — and ours reads 30.5 % (lane telemetry) / ~38 % (my pixel count).
**Both land on it.**

**The single most striking thing in my sample is not a statistic.** `s02-t132`, `t136`, `t140`,
`t144` and `t148` — **five consecutive frames, twenty seconds of arcade stage 2 — carry no enemy
aircraft at all.** The player flies alone over the desert. That is the rhythm R9 went after, and
a gate that can only be satisfied by adding aircraft could never have asked for it.

### 6.2 I cropped `t104` and the criteria lane is right

Ledger row 37's sharpest claim is that one of the four reference-pack frames the R3 gate was built
on, `stage1-lockon-island-t104.png`, **carries no enemy aircraft at any size** — what reads as a
target is a cluster of lock-on brackets with nothing inside them.

I extracted t=104.0 s myself from `ab2-longplay.mp4`, read the stage digit (**1**), and cropped the
bracket cluster to 6× (`tools/out/judge-r9/zoom-s01-t104.png`).

> **CONFIRMED. The cluster is bracket corner-marks over empty sky. There is no aircraft in it.**

For completeness I also cropped `t100`'s bracket cluster (`zoom3-s01-t100-brackets.png`): there
**are** aircraft there — three cruciform specks at 1.2–1.7 %W, below the 3 %W counting floor,
plus three countable aircraft elsewhere in the frame at 3.6 / 9.1 / 15.3 %W. So t100 is a genuinely
busy frame and t104 is a genuinely empty one, and **a pack containing two frames named `lockon` and
one named `missile-salvo` is a sample selected on the presence of the thing being counted.** The
ledger's binding — *a reference pack is never a sample* — is correct and earned.

### 6.3 One caution the retirement should carry

**My mean-on-screen reading is half the published one**: 0.773 aircraft/frame at ≥3 %W against the
63-frame set's 1.270 and the pacing lane's 1.476. The ARCADE-PACING gate's third row —
*mean on screen 0.9–1.6, "±2 standard errors on the 63-frame arcade sample"* — is derived from one
sample, and a fourth reader on a fourth grid lands **below its floor**. The spread across readers
(0.773 / 1.270 / 1.476) is far wider than the band. **That row should be widened or marked OPEN
the way the stage-1 column already is.** It is currently the one row our `demo` arm "fails high"
at 1.58–1.76 — against an arcade whose own value, by my reading, is 0.77.

---

## 7. What nobody had looked at

### 7.1 AIMING DOES NOT MATTER — neutral/tracking 100.0 % against a ≤40 % gate

My own probe run, 3 seeds × 90 s per arm, committed tree:

| arm | stick | kills/s (3 seeds) | mean | missile share of kills |
|---|---|---|---|---|
| `idle` — no trigger, no stick | neutral | 0.000 / 0.000 / 0.000 | **0.000** | — |
| `arcstill` — trigger + missile, **stick untouched** | **neutral** | 0.567 / 0.533 / 0.456 | **0.519** | **68.6 – 77.1 %** |
| `arctrk` — tracking pilot | tracking | 0.544 / 0.500 / 0.511 | **0.519** | 46.9 – 55.6 % |

> **Neutral-stick / tracking kill-rate ratio = 100.0 %.** Gate ≤40 %. R8 read 64.0 %.

The mechanism is in the same table and in one constant. `lockSystem.js:66`
`LOCK_RADIUS_FRAC = 0.22` — a 22 %W cone measured from the **sight**, and `combat.js:643` sets
`this.sight.x = this.playerNdc.x + …`, so the sight is pinned to the player's own position. A
pilot who never moves still has a 22 %W cone wherever the aircraft is. The file's own comment
records that the only arcade anchor for this quantity is **8.3 %W** and that 0.22 is tuning.

**R9's pacing cut made this worse and that is not an argument against the cut.** At fourteen alive
a tracking pilot had surplus targets to convert with the gun; at six, the missile cone collects
everything either way, so the gun's advantage — visible in the table as 26/20/21 gun kills tracking
against 16/11/11 neutral — is exactly cancelled. R8's judge wrote *"do not tune weapons to this
gate until gap 0 is settled."* **Gap 0 is now settled.** This is R10's gap 1.

### 7.2 Enemies on top of the player — CLOSED, with margin

My own four-arm capture at a spacing nobody used (157), 21 flight frames, `occlusion_r9.py`
(`--selftest` PASS; the no-combat-vs-itself control reads **0.0 % on every one of my 21 frames**):

| | >30 % of the player hidden | >50 % | worst | median |
|---|---|---|---|---|
| R8 art critique, committed build | 19.5 % | 7.3 % | 60.7 % | — |
| R9 pacing lane, shipped, 84 frames, 5 spacings | 4.8 % | 2.4 % | 64.2 % | — |
| **this judge, 21 frames, spacing 157** | **0.0 %** | **0.0 %** | **7.9 %** | **0.0 %** |

My window (ticks 157–3454) steps over the opener event at ticks 370–407 that produces the lane's
worst frames, so **their 4.8 % is the figure to quote and mine is corroboration that outside the
opener the problem has gone.** The art critique's rank-1 item is closed by the population cut
alone, and the lane's own refutation of the corridor fix — that it moved nothing and made the tail
worse — is consistent with everything I measured. **Do not re-open the corridor.**

### 7.3 The head-on enemy is still a swept V where the arcade's is a horizontal bar

`judging/R9/r9-04b-headon-ARCADE-stage2-native-18x.png`, read by me: the arcade's head-on enemy is
**a thin horizontal wing BAR two to three rows tall with a dark lower edge, a compact central
block carrying the red intake, and a short vertical fin stripe above** — sky above *and* below the
bar across most of the span. A plus sign.

R9's cells (`r9-04`, rows 2 and 4) went from a **solid filled triangle** to **thin swept blades** —
a real and visible improvement, correctly measured (fuselage width 29.0 % → 12.9 %, area 654 → 523
px). But the wings still **sweep down from the fuselage in a V** and meet it without a break, so
the sky is above the wing and not below it. **The arcade's wing is horizontal.** Shape-only claim;
the only reference is a stage-2 upscale and I take no colour or value from it, exactly as the lane
declares.

### 7.4 The death hulk is still a flat dark smear, with no smoke and no debris

`tools/out/judge-r9/death2`, `?fixed=1&seed=1&demo=1&forcedeath=6`, phases read from the manifest:
fireball (t374, t396) → starburst (t418–462) → tumble (t484–616).

The lane's highlight fix is real at the sheet level (remapped max 123 → 189 against the arcade's
191, and I confirmed the sheet grew 10 → 11 colours). **At engagement scale it does not change the
read**: `tools/out/judge-r9/hulk-zoom.png` shows the tumbling hulk as a near-uniform dark maroon
shape with almost no internal modelling, and at t484 it is a flat streak. **There is no smoke
trail and no debris on any of the eight tumble frames.** `debris.png` and `smoke-puff.png` exist
and are unwired; the lane's cross-lane request to `game/flow/**` was not actioned. **Open, and it
is cheap.**

### 7.5 Checked and overturned — the roll sheet's blue is correct

At tick 519 (`poseSource: sheet-roll`, `rollPhase` 0.394, stage digit 1, daylight) our player jet
renders **slate blue-grey** where two frames earlier it is cream
(`tools/out/judge-r9/player-day-vs-roll-3x.png`). I was ready to file it as a night palette
leaking into a day stage. **It is not a defect**: `reference/stage4-barrel-roll-t222.png`, stage
digit **4**, daylight, shows the arcade's own player jet mid-roll presenting a **blue-violet
dorsal surface with lit orange nozzles**. The roll sheet's `PLAYER_ROLL` blues are measured off
exactly that. Recording the overturn because this project has twice nearly retired something real.

### 7.6 Criterion A and B on the committed tree, in ordinary play with combat asserted

44 frames, two spacings, `?demo=1`, `assert_population` PASS on both sets, native 320×224:

| | value | gate |
|---|---|---|
| colours / frame, median (max) | 66 (83) | ≤256 — **PASS, 44/44** |
| **channel values / frame, median (max)** | **26 (30)** | **≤32 — PASS, 44/44** |
| near-patch H-identity, median | 76.0 % | ≥50 % — PASS |
| near-patch V-identity, min | 54.1 % | ≥50 % — PASS |
| **ground-band V-identity, min** | **48.88 %** (`pop-173/frame-0020`, t3633, **stage 2**) | ≥50 % — **FAIL, 2 of 44** |

**Gap 0's channel-value half is closed.** R7 measured 28–98 (median 53) failing on 48 of 49
stage-1 frames; the committed tree reads a maximum of 30 across 44 frames of real combat. The
residual is Criterion B's V gate on **stage 2** — 48.88 % and 49.95 % — which is R8's judge gap 9
("no margin, one frame of 126 at 49.81 %") now failing on two frames of forty-four. Stage 2, not
stage 1.

### 7.7 A stale comment in the file the round just rewrote

`src/entities/enemySprite.js`, at the far-LOD call site:
`// No keyline on the far LOD: every texel is already opaque (the invariant above), so there is no
boundary to outline.` **56.3 % of texels are opaque.** The sentence was true of the rectangle and
was not updated when the rectangle was removed. It is harmless today and it is the exact class
CLAUDE.md names, in the file whose *other* false comment (§5.0 of the drawing lane) stopped four
audits.

---

## 8. Ranked gap list for Round 10

Every item checked against the arcade before being written, with a reproduction.
**Items 1–4 are motion items and they did not exist before this round. They outrank everything
below them, and the ordering is the owner's, not mine.**

**0. BUILD A MOTION HARNESS AND PUT IT IN THE GATE SET — this is the round's real deliverable.**
Every item 1–4 came out of one afternoon with two new throwaway scripts and `ffmpeg -vsync 0`.
There is no reason any of it should have waited nine rounds, and there is no reason the next
judge should have to rebuild it. **Three things, all cheap:** (a) `judge_motion_r9.mjs`'s
per-tick recorder belongs in `tools/` with a selftest; (b) `tools/capture.mjs` needs an offset so a
consecutive burst can start anywhere but tick 1 — **the concurrent art critique has already added
exactly this as `--warmup`, uncommitted; take it, give it a line in the README query-param table
and keep it**; (c) **every criterion that mentions time must record the
sampling interval it was taken at.** Two of this round's load-bearing figures are 4 Hz samples of
sub-second events (§2.7) and neither says so. Ledger row 29 made this binding for *periodic*
behaviour; it needs to bind for *transient* behaviour too, which is most of what a player feels.

**1. OUR EXPLOSION IS A PLATEAU WHERE THE ARCADE'S IS A FLASH.** §2.4. Same fire mask, same
operator, both sides at 60 Hz: **0.600 s within 60 % of peak against the arcade's 0.067 s — 9×** —
at a peak 40 % smaller, and ours leaves no smoke where the arcade's leaves a pale mass covering
roughly a quarter of the frame for over 1.2 s. Every palette, value and silhouette gate passes it
and they are all correct; the defect is the **envelope in time** and no criterion here has one.
**The fix is in `effects/explosions.js` and it is a curve, not a colour.** *Reproduce*: the mask
in §2.4 over `tools/out/judge-r9/motion/ours-demo2/` and `motion/arc-s1/`.

**2. THE MISSILE HAS NO ARCADE SIDE AT ALL.** §2.7. `HOMING_GAIN = 1.7` — how hard a heat-seeker
turns — is **untagged and unanchored**, in a file where every other constant carries MEASURED or
ADOPTED. The launch→impact band it works inside is a **4 Hz** reading of a sub-second event taken
on one of the four frames ledger row 37 retired. **Acquisition item, and it is now the highest one
on the board: a 60 fps decode that follows single arcade missiles from launch flare to detonation,
giving turn rate, flight time and trail length.** Until it exists nobody can tune the missile, and
the owner has named it twice. *Reproduce*: `grep -n "HOMING_GAIN" src/weapons/missiles.js`;
GAME_SPEC §3's *"2–4 frames of 0.25 s"*.

**3. SETTLE THE BANK CEILING — it is a half-hour job and the footage is now on disk.** §2.2.
`BANK_POSE_DEG` tops out at **35.6°** and at full stick, held for 240 ticks, `bankDeg` reads 35.60
on every tick. The arcade's **apparent** on-screen jet angle reaches 82° and is past 30° on 34.8 %
of frames against our 12.5 % — but apparent angle is pose **plus** world roll and I could not
separate them on the arcade side, so **this is a direction with n = 8 on our side, not a gate, and
I am explicitly not claiming the ladder's top rung is wrong.** The separation is available: **the
arcade's HUD stays upright, so the HUD's own rotation gives the world roll and the difference
gives the pose.** `tools/out/judge-r9/motion/arc-s1/` is 300 consecutive frames at 60 fps and is
enough to do it. This is the constant a player feels on every single input and nobody has
checked it.

**4. KILLS ARRIVE SMOOTHLY WHERE THE ARCADE'S ARRIVE IN BURSTS.** §2.3. The arcade: three kills in
0.367 s after a 3.100 s drought, dated to ±1/60 s off the HIT digit. Ours: 0.519 kills/s, evenly.
ARCADE-PACING gates the *rate* and a rate has no shape — this is the emptiness lesson one level
down, and the criterion needs a burst statistic beside its mean exactly as it needed a run-length
beside its percentage. *Reproduce*: the HIT-box diff in §2.3.

**5. AIMING BUYS THE PLAYER NOTHING.** Neutral-stick and tracking pilots kill at **0.519/s each —
a 100.0 % ratio against a ≤40 % gate**, and the neutral pilot takes 68.6–77.1 % of its kills with
the missile. The lever is `lockSystem.js:66` `LOCK_RADIUS_FRAC = 0.22` against the only arcade
anchor for it, **8.3 %W** (GAME_SPEC §3, prototype 80 px, ADOPTED), plus the missile's complete
absence of a span gate where `vulcan.resolveHits` has `READABLE_SPAN_FRAC`. R8's instruction *"do
not tune weapons to this gate until gap 0 is settled"* has been discharged — gap 0 is settled.
**This is the first still-frame-axis gap in this project's history that is about whether the game is a game**, and it sits here rather than at the top only because items 1–4 are a whole axis nobody had opened.
*Reproduce*: `node judging/R9/pace_probe_r9.mjs --modes arcstill,arctrk --seeds 1,2,3 --secs 90
--out <dir>/x.json`, then compare `killsPerS` and `lg_gun`/`lg_total`.

**6. The player jet's BODY is still a filled mass.** RSW **4.52 against the arcade's 3.65 (1.24×)**
on the level cell, unmoved this round by the lane's own account, while RP90 reached 1.03× and DENS
1.22×. The crop agrees: `r9-02`'s arcade panel shows sky through the planform and a narrow spine;
ours shows blades plus a solid fuselage. **Two blockers to clear first, both one-line:** REFERENCE
must drop the retracted CV 18.4 % that forbids gating RSW (§5.4), and the anti-retune figure must
be corrected to +14.3 % / −3.2 % (§5.3). *Reproduce*: `python3 tools/art/inkspan_jet.py`.

**7. The head-on enemy's wing is swept; the arcade's is horizontal.** §7.3. It is the cell the art
critique named as the one that hides the player, it is 44.8 %-adjacent in frequency, and the
remaining change is a shape change the lane has already described correctly in prose. Blocked for
colour by acquisition item 5; **not blocked for shape.** *Reproduce*: `r9-04` against `r9-04b`.

**8. The death hulk has no smoke and no debris, and reads as a flat dark smear.** §7.4. The art
exists (`debris.png`, `smoke-puff.png`); the wiring is in `game/flow/**`, which no lane owned this
round. *Reproduce*: `node tools/capture.mjs --out <dir> --frames 34 --every 22 --url-params
"fixed=1&seed=1&demo=1&forcedeath=6"`, frames 16–33.

**9. ARCADE-PACING's mean-on-screen row is not robust and should be marked OPEN.** Three readers
give the arcade 0.773 / 1.270 / 1.476 aircraft per frame at ≥3 %W; the band is 0.9–1.6, derived as
±2 SE of one of them. My reading sits below its floor. **Do not tune the spawner to this row in
either direction until a fourth sample settles it** — and note the criterion's own text already
says this row is not the spawner's to close. *Reproduce*: `judging/R9/judge-arcade-count-rule.md`
and `tools/out/judge-r9/arcade/`.

**10. Criterion B's V-identity fails on stage 2.** 48.88 % and 49.95 % on 2 of 44 ordinary-play
frames, both stage 2, against a ≥50 % gate. R8 flagged it as having no margin; it now has none.
*Reproduce*: `python3 tools/measure_criterion_ab.py --dir tools/out/judge-r9/pop-173`.

**11. Four one-line repairs to the DRAW-WEIGHT box, all in §5, none of which changes a published
measurement.** (a) The scale controls must **assert on RP90**, not only SW/SPAN — both
implementations print it moving 25 % and neither checks it; and the licence sentence should name
**DENS and bbox fill** as the cross-resolution forms, because SW/SPAN is not one (§5.1).
(b) The anti-retune figures become **+14.3 % / −3.2 %** (§5.3). (c) The RSW-exclusion sentence and
the CV row lose the retracted synthetic and gain the real-subject run (§5.4). (d) The ground-truth
table must state that the mask is intersected with `alpha > 0` **before** the largest-component
step — the ordering is worth 36 points on cell 4 and the table is unreadable without it (§5.5).

**12. Enemy rounds/min is down 19 % and its gate has no arcade side.** The pacing lane declares the
miss (138.7 → 113.1) and declines to buy it back past the only arcade anchor the fire budget has.
That is the right call. What is owed is the arcade side: a per-frame count of enemy fireballs over
the STAGE_MAP spans. This is R8 judge gap 2, still open, and it now blocks a declared miss rather
than a hypothetical one.

**13. The missile economy.** `flow.js:378` restocks `MISSILE_START_STOCK = 50` at **every** stage
boundary against GAME_SPEC §5's MEASURED "fill to 70 at two specific points". R8 judge gap 4, not
actioned, and it is the supply side of gap 5.

**14. The second title card is not built.** `SHIPS 3` / `PUSH START BUTTON!` with the plate dollied
~2.3× closer. Newly identified by the title lane; nobody had seen it because nobody had decoded a
second frame. Also the card's entry animation (wordmark zoom, plate lie-flat intro).

**15. Stale comment at `enemySprite.js`'s far-LOD call site** — "every texel is already opaque"
against 56.3 %. §7.7. One line.

**Explicitly NOT gaps, recorded so nobody opens them:**
the far LOD's residual 56.3 → 32 % (it is the FULL-WIDTH-BAND invariant's floor, 37.5 % before a
shaped pixel, and I checked the arithmetic); the player corridor (built, measured, refuted, shipped
inert — the population cut did all the work); the roll sheet's blue dorsal (§7.5, it is the arcade's).

---

## 9. Evidence index

All paths relative to the repo root. Commit `bd73b52`, clean tree.

| what | where |
|---|---|
| **MOTION — arcade, 300 consecutive frames at 60 fps, stage 1** | `tools/out/judge-r9/motion/arc-s1/` |
| **MOTION — arcade, second burst from t=98.6** | `tools/out/judge-r9/motion/arc-msl/` |
| **MOTION — arcade overview / missile strips / launch strip** | `motion/arc-s1-overview.png`, `arc-msl-strip.png`, `arc-msl-zoom.png`, `arc-launch.png` |
| **MOTION — the HIT digit at every detected increment (the 60 Hz kill clock)** | `motion/hit-steps.png` |
| **MOTION — ours, 420 consecutive ticks of `?demo=2`, PNG + per-tick telemetry** | `tools/out/judge-r9/motion/ours-demo2/` (`motion.json` + 420 PNGs) |
| **MOTION — our input→response trace, every tick at full stick** | `tools/out/judge-r9/bank-fine/`, `bank-full/` |
| **MOTION — bank-tracker validation: all 28 readings marked and looked at** | `motion/bank-validate-0.png`, `bank-validate-1.png`, `bank-check.png` |
| **MOTION — the instrument I WITHDREW, and the frame pair that killed it** | `motion/track-jump.png` |
| **MOTION — probes** | `judging/R9/judge_motion_r9.mjs`, `judging/R9/judge_track_r9.py` |
| my arcade count rule, written before extraction | `judging/R9/judge-arcade-count-rule.md` |
| my arcade census frames + stage-digit sheet | `tools/out/judge-r9/arcade/`, `arcade-digit-sheet.png` |
| **my per-frame labels, spans and exclusion reasons** | `tools/out/judge-r9/arcade/labels-judge-r9.csv` |
| my arcade contact sheets (4-up) | `tools/out/judge-r9/arcsheet-{00..06}.png` |
| **t104 bracket cluster, 6× — no aircraft** | `tools/out/judge-r9/zoom-s01-t104.png` |
| t100 bracket cluster, 8× — three sub-3 %W aircraft | `tools/out/judge-r9/zoom3-s01-t100-brackets.png` |
| t116 — the single-nozzle green-camo stage-1 enemy beside the twin-nozzle player | `tools/out/judge-r9/zoom-s01-t116.png` |
| our population, two spacings, with manifests | `tools/out/judge-r9/pop-173/`, `pop-211/` |
| our population contact sheets | `tools/out/judge-r9/sheet-173-*.png`, `sheet-211-*.png` |
| **t2076 after (2 aircraft) / before (~10)** | `tools/out/judge-r9/t2076-centre-2x.png`, `t2076-BEFORE.png` |
| my ARCADE-PACING reproduction | `tools/out/judge-r9/pace-after.json`, `pace-after.log` |
| the before-population control | `tools/out/judge-r9/pace-before.json`, `pop-173-BEFORE/` |
| occlusion, four arms, spacing 157 | `tools/out/judge-r9/occ-e157-{A,B,C,D}/` |
| title: arcade frames t70–t80, 30 and 60 fps | `tools/out/judge-r9/arcade-title/` |
| title: our face-on capture and animation census | `tools/out/judge-r9/title-faceon/`, `title-anim/` |
| death sequence, phases labelled | `tools/out/judge-r9/death2/`, `death-sheet.png`, `hulk-zoom.png` |
| roll-sheet overturn | `tools/out/judge-r9/player-day-vs-roll-3x.png`, `ref-roll-t222.png` |

**Reproduction of the DRAW-WEIGHT findings in §5** (judge's own scripts, in the session scratchpad and
reproduced inline in this report so they need no file):

```
# 5.1  the matched-span licence does not cover RP90
python3 tools/inkspan_arcade.py --selftest     # read control A/B's printed P90SW and span
python3 judging/R9/title_drawweight_r9.py --selftest   # control 2: RP90 8.93 -> 6.60, unasserted

# 5.3  the anti-retune figure
python3 - <<'PY'
import sys, numpy as np; sys.path.insert(0,'tools/art'); import inkspan as I
from PIL import Image
c = np.asarray(Image.open('reference/ab2-arcade-desert.png').convert('RGB'))[82:142, 80:180]
for s in (0.35, 0.45, 0.50, 0.55):
    m = I.fill_holes(I.largest_component(
        I.mask_achromatic(c, sat_max=s, v_min=0.08, extra=I.AIRFRAME_EXTRA)))
    print(s, I.stats(m)['ink'], I.stats(m)['RP90'])
PY

# 5.4  the retracted CV, and the real-subject run that replaces it
python3 tools/art/inkspan.py --selftest | sed -n '/ROTATION STABILITY/,/control 7/p'
python3 tools/art/inkspan_jet.py --invariance     # arm B IS the synthetic REFERENCE quotes
grep -n "18.4" REFERENCE.md

# 5.5  bank invariance on the REAL arcade jet, and the ground-truth step ordering
python3 - <<'PY'
import sys, numpy as np; sys.path.insert(0,'tools/art'); import inkspan as I
from PIL import Image
c = np.asarray(Image.open('reference/ab2-arcade-desert.png').convert('RGB'))[82:142, 80:180]
m = I.fill_holes(I.largest_component(
        I.mask_achromatic(c, sat_max=0.35, v_min=0.08, extra=I.AIRFRAME_EXTRA)))
pad = np.zeros((240, 240), bool); pad[90:90+m.shape[0], 70:70+m.shape[1]] = m
for a in (0, 10, 20, 35, 45, 60, 75, 90):
    mm = I.largest_component(I.rot(pad, a) if a else pad)
    st = I.stats(mm); ys, xs = np.nonzero(mm)
    bf = 100*mm.sum()/((ys.max()-ys.min()+1)*(xs.max()-xs.min()+1))
    print(a, st['ink_per_span'], round(bf, 2), st['DENS'], st['RSW'], st['RP90'])

sh = np.asarray(Image.open('src/assets/sprites/player-f14.png').convert('RGBA'))
CW = sh.shape[1]//9
FOUR = [(0xff,0xff,0xef), (0xf7,0xe6,0xb5), (0x84,0,0), (0,0,0)]
for cell in (0, 4, 8):
    q = sh[:, cell*CW:(cell+1)*CW]; rgb = q[:, :, :3]; gt = q[:, :, 3] > 0
    f = np.zeros(gt.shape, bool)
    for t in FOUR: f |= np.all(rgb == np.array(t), axis=2)
    print(cell, round(100*(I.largest_component(f & gt) & gt).sum()/gt.sum(), 1),   # alpha FIRST -> 36.9/20.9/41.7
                round(100*(I.largest_component(f) & gt).sum()/gt.sum(), 1))        # LC first    -> 66.2/57.0/63.0
PY

# 7.1  aiming buys nothing
node judging/R9/pace_probe_r9.mjs --modes arcstill,arctrk --seeds 1,2,3 --secs 90 --out <dir>/x.json
```

# R7 — game-flow / player-feel lane

**Tree state** (REFERENCE.md "What a complete citation is"). Work is **uncommitted** in the
shared working tree, started from `e8fed58`. **Every number below was measured in an ISOLATED
copy of the tree, not in the shared one**, and that is not fastidiousness: partway through this
round the shared tree stopped rendering (`ERROR: 0:688: 'uNightPatchCut': undeclared identifier`
— another lane mid-edit in `render/ground.js`), which my probe caught as page errors on seed 4
of a seven-seed run. The isolated trees are `git archive HEAD | tar -x` into the scratchpad with
`node_modules` symlinked, so they are HEAD exactly, plus, per arm, **only this lane's own
changed files**. No `git stash`, `checkout`, `reset` or `commit` was run.

| arm | tree | what it isolates |
|---|---|---|
| ARM 1 BEFORE | pristine `e8fed58` | the baseline, and the check that my instruments reproduce the R6 judge |
| ARM 2 DEATH-ONLY | `e8fed58` + `deathSequence.js` | the death cycle's effect, alone |
| ARM 3 AFTER | `e8fed58` + all of this lane's files | the shipped build |

**Files changed (mine only):** `src/entities/player.js`, `src/game/flow/demoTimeline.js`,
`src/game/flow/deathSequence.js`, `src/game/flow/flow.js`, `src/game/flow/launchSequence.js`
(comment only — the carrier framing ruling, §6.1), `src/game/game.js` (one telemetry field).
**Six constants, one expression, one 12-line method.** Nothing else in `src/` was touched;
`src/game/flow/carrier.js` is the sprite lane's this round and I did not open it, which is why
§6.1 is a ruling and a suggested replacement paragraph rather than an edit.

**Build**: `npx vite build` passes on the shared tree. Seven URL paths boot with **zero page
errors** (`tools/out/flow-r7/boot_probe.mjs`): `?fixed=1`, `?demo=1`, `?demo=2`, `?showtitle=1`,
`?demo=1&invincible=1`, the full isolation combo, and `?forcedeath=2.0`. Every capture set swept
for black **and** duplicate frames with `tools/out/flow-r7/sweep.py`, which **passes a
planted-fault control first** (1 planted black + 1 planted byte-duplicate → both found):
**0 black, 0 duplicates** across **62 frames in 3 of our own capture sets** (death filmstrip,
envelope rails, carrier launch). The sweep was also run over the **arcade** extractions — 67
player-altitude frames clean, and the 118-frame death set returned **17 duplicate pairs**, which
was not noise: it was a defect in how I was extracting them, and it had put a published boundary
one frame out (§5.1).

**Determinism re-checked after the last code change**: re-running ARM 3's seeds 1–3 on the
settled tree reproduces its per-seed wall rates **2.6 / 1.8 / 2.2** exactly.

Cross-lane asks are in `judging/R7/ask-flow.md` (A1–A13).

---

## 1. Verdict in one paragraph

The player can now climb. The hard clamp behind "our pilot occupies the top third 0.00 % of
20 970 flight ticks" is gone: the attract flight's altitude spread is 6.07 → **8.22** against the
arcade's 7.73, its p5 is 44.9 → **38.7** against the arcade's 36.4, and the full-stick ceiling is
35.09 → **27.02 %H** against an arcade pilot whose highest observed altitude is 27.0. The death
cycle is restored to a **re-measured 7.7 s**, and **flight share is 78.20 % → 70.70 %, inside the
arcade's 69.4–73.5 % band** for the first time and not at its edge. **The ≤2.0 deaths/min
wall-clock gate is still MISSED, at 2.114**, and a three-arm experiment says where that comes
from rather than leaving it to argument — and it refuted what I had predicted: the death cycle
carries the whole improvement (−0.143) and **the envelope's effect on lethality is not
measurable** (+0.028, a quarter of a standard error). Nothing in this lane's files closes the
remaining 0.114 without making the game easier against the R6 gap text's explicit instruction, so
it ships as a miss with its mechanism and an ask. **Four criteria came apart while being used**:
the arcade's own player top-third share is **0.92 %, one observation in 109**, so the top-third
framing of gap 5 should not be a target (§3.3); REFERENCE #122's cruise `cy 52.8 %H` and the hand
counts' `49.5` are **the same measurement in two units and they agree** (§3.4), not the 7-point
contradiction they looked like for an hour; GAME_SPEC §2's "deaths per flight-minute is invariant
to death-cycle length" is **refuted by the controlled experiment** (§5.2); and §2's "no visible
invincibility flash" is **wrong — the arcade flashes the jet for 1.67 s at 0.267 s period**, which
we now draw (§5.4). Gap 11 is a **documented refusal** with the one-line interface that unblocks
it, plus a framing ruling for the sprite lane's carrier (§6).

## 2. The arcade side first, because gap 5's target had never been re-counted

`judging/R6/report.md` gap 8 asks for an independent re-count of R6's arcade hand count. I did
the **player** column of it — the column my brief makes the primary evidence. (The *enemy*
column is still unstarted and is still gap 8.)

**Operator, published in full** (`tools/out/flow-r7/arcade_player_sheets.py`, raw readings in
`tools/out/flow-r7/arcade-player/labels.csv`, sheets `sheet-00..13.png`): 53 frames of
`.reference-cache/video/ab2-longplay.mp4` (686×480) at exactly **3.50 s** inside `STAGE_MAP.md`'s
VERIFIED STAGE SPANS for stages **2, 3, 9, 14, 20**, each span trimmed 2 s at both ends.
Extracted one at a time with `-ss <t> -frames:v 1`. Each frame drawn at **1.4× NEAREST** with a
5 %H ruler on **both** edges and 10 %H labelled; the reading is the airframe's visual centre
(midpoint of fin-top and nozzle-bottom — a **bbox centre**, not an area-weighted pixel centroid,
and §3.4 is about why that distinction is load-bearing). **5 frames excluded, each with its
reason recorded in the CSV**: two `RELOAD WEAPONS` tanker passes (altitude is dictated by the
tanker, not by free flight), one tanker approach, one frame where the `STAGE 9` card was still
up, and one where the player could not be separated from the green canopy. **48 observations.**

**Independent of R6's in three ways that matter**: different stages (R6 read 1, 4, 6, 7, 12, 19),
a different grid (3.00 s), a different reader.

| | n | min | p5 | p25 | p50 | p75 | p95 | max | mean | sd | top third |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R6 combat lane | 61 | 27.0 | 36.0 | 47.0 | 49.0 | 53.0 | 63.0 | 67.0 | 49.16 | 8.11 | 1.64 % |
| **R7 flow lane (this)** | **48** | **35** | **40.0** | **44.0** | **50.5** | **56.0** | **60.0** | **67** | **49.85** | **7.21** | **0.00 %** |
| **pooled** | **109** | **27.0** | **36.4** | — | **50.0** | — | **62.0** | **67.0** | **49.47** | **7.73** | **0.92 %** |

**R6's column reproduces.** The two means are **0.69 points of H** apart on 48 and 61
observations (a two-sample t of 0.46 — indistinguishable), and both maxima are 67. My p5 runs
4 points lower than theirs because my 48 frames did not catch as extreme a climb as their 61
did; that is sample size, not disagreement. **This is the first independent confirmation this
project has for the arcade player's altitude**, and the pooled 109-observation row is what every
comparison below is made against.

Weaknesses, stated rather than buried. (a) The longplay pilot is an expert; his altitude is one
pilot's habit, and it conflates "where the player chooses to fly" with "where the envelope lets
him". (b) Three of my 48 are flagged low-confidence in the CSV (a pale airframe on stage 9's
snow). (c) A 3.5 s grid under-samples brief extremes, so the true tails are **wider** than these
109 observations show — which matters for §4, where it argues against trimming our spread to the
measured sd. (d) **Neither count sampled a canyon stage** (the arcade's are 8 and 17), so this is
a **cruise population** — see §3.4 and §4.

---

## 3. GAP 5, half one — `ENVELOPE_Y`, and what the clamp actually was

### 3.1 The instrument, validated before it was pointed at anything

`tools/out/flow-r7/alt_probe.mjs` samples `__flowState().jetNdcY` **every tick** inside the page
(not one round trip per tick) and converts with `%H = (1 - ndcY) / 2 * 100`. It refuses to run
until it passes a control: a uniform 0..100 ramp must return p5 = 5, p50 = 50, p95 = 95,
sd = 28.8675 and a top-third share of 33.333 %, and ndcY ∈ {+1, 0, −1} must map to {0, 50, 100}
%H. It does, to four decimals.

Then it was pointed at the committed build and **reproduced the R6 judge's published figures
exactly** — his window, 7 200 ticks of `?fixed=1&demo=1&invincible=1`:

| | judge R6 | this probe on pristine `e8fed58` |
|---|---|---|
| player p5 / p50 / p95 %H | 44.8 / 54.8 / 62.3 | **44.8 / 54.8 / 62.3** |
| player sd | 6.15 | **6.15** |
| player top third | 0.00 % | **0.00 %** |

Same for deaths (§5): 78 deaths, 2.229 ± wall, 2.850 flight, 78.20 % share, and the per-seed
list **2.4 / 2.0 / 2.6 / 2.0 / 1.8 / 2.4 / 2.4** — identical to his, seed for seed.

**A window rule the 16.000 s one does not cover.** `?demo=1`'s regime cycle is 16.000 s and
counts are immune, but the **vertical** roam's own slowest period is 2π/0.22 = **28.56 s**, which
is incommensurate with 16. So a whole number of *regime* cycles is still a fractional number of
*vertical* cycles, and a vertical percentile is not stabilised by the usual rule. Measured on the
candidate roam, the top-third share read **0.00 / 0.30 / 2.56 / 1.47 / 1.79 %** at 4 / 6 / 10 /
20 / 40 cycles. Everything below uses a **40-cycle (656 s) window** and the probe prints the
7.5-cycle "judge window" beside it so the difference is visible rather than argued about.

### 3.2 What the clamp was, and why the fix is asymmetric

The stick→screen transfer was measured on the build with the stick **held to a ladder of
deflections until the follow filter had settled** (`map_probe.mjs`, 41 points). It reproduces
`demoTimeline.js`'s published trio to **0.00 %H** (55.60 level, 35.09 full-up, 77.31 full-down),
and — because `%H` is a function of the **world-Y offset**, not of the envelope — a second sweep
with the envelope scaffolded to 3.0 agrees with the first to **0.01 %H** everywhere they overlap.
That is what makes it legitimate to read every candidate rail off one sweep.

| | committed | arcade (109 obs) |
|---|---|---|
| full UP | 35.09 %H | observed ceiling **27.0** |
| neutral | 55.60 %H | median 50.0 |
| full DOWN | 77.31 %H | observed floor **67.0** |

**The down rail already sat 10 points past the deepest dive the arcade pilot ever made; the up
rail fell 8 points short of his highest climb.** One rail is wrong and the other is not, so only
one moves. `ENVELOPE_Y_UP = 1.55` is solved so full stick lands on the arcade's observed ceiling
and measures back at **27.02 %H**.

**And raising the down rail is not merely unsupported, it is wrong — which a capture settles and
arithmetic would not have.** `judging/R7/flow-03-envelope-rails.png` is the jet held at each
candidate rail with `ui/hud.js`'s band edges drawn on. The bottom strip is y 198..218 of 224 =
**88.4..97.3 %H** and the airframe is ~15.5 %H tall:

| down rail | jet anchor | lower edge | |
|---|---|---|---|
| **1.10 (kept)** | 77.31 %H | 85.06 | clears the strip by 3.4 points |
| 1.55 | 86.56 %H | 94.3 | 6 points **inside** the strip |
| 1.90 (`ask-combat.md` A1's number) | 93.91 %H | 101.7 | the airframe's **centre** is inside the HUD band; the jet is drawn across the SPEED bar, the STAGE digit and the missile stock |

Upward there is headroom — at 1.55 the fin tips reach 19.3 %H against the top band's 11.2 %H
lower edge; that band only binds past about 2.1. `tools/out/flow-r7/rails_check.mjs` asserts all
four of those properties and the committed tree fails exactly the one the change targets:

```
BASE  full UP 35.09  FAIL up rail reaches the arcade ceiling   PASS clear of top HUD  PASS clear of bottom HUD  PASS neutral 55.60
MINE  full UP 27.02  PASS                                      PASS                   PASS                      PASS neutral 55.60
```

**The `M`-state datum is untouched**: stick-centred flight is **55.60 %H before and after, to
0.00**. The envelope is a rail, not a rest position, and nothing about level flight at throttle
`M` moved.

### 3.3 The result — and a correction to how gap 5 is framed

`judging/R7/flow-02-player-altitude-arcade-vs-ours.png` is the primary evidence. 40-cycle
window, **38 401 flight ticks** each side, `?fixed=1&demo=1&invincible=1&seed=1` (the roam is a
pure function of `simTime`, so with deaths suppressed it is seed-independent by construction —
which is why one seed is the right sample here and seven is the right sample in §5).

| | min | p5 | p25 | p50 | p75 | p95 | max | sd | top third |
|---|---|---|---|---|---|---|---|---|---|
| **arcade, 109 hand obs** | 27.0 | **36.4** | — | 50.0 | — | **62.0** | 67.0 | **7.73** | **0.92 %** |
| ours, committed `e8fed58` | 44.7 | 44.9 | 49.0 | 55.8 | 61.3 | 62.3 | 62.6 | 6.07 | 0.00 % |
| **ours, R7** | **35.2** | **38.7** | 47.9 | 57.9 | 61.6 | **62.8** | **65.2** | **8.22** | 0.00 % |

* **p5: 8.5 points out → 2.3 points out.**
* **sd: 1.66 under → 0.49 over.**
* **Range: 44.7–62.6 → 35.2–65.2**, against the arcade's 27.0–67.0.
* **p95 was already right and stayed right** (62.3 → 62.8 against 62.0). The floor was never the
  problem, which is the §3.2 asymmetry showing up in the distribution as well as in the rails.

**The top-third share is still 0.00 %, and that is the finding, not the failure.** The arcade's
own player top-third share is **0.92 % — one observation out of 109**, the single 27 %H reading
in R6's set. Gap 5 reads *"our pilot occupies the top third of the screen 0.00 % of 20 970 flight
ticks against an arcade pilot whose p5 is 36.0 %H"*; both halves are true, and a reader takes
away "the arcade pilot is often up there", which he is not. **Tuning a scripted attract path to
reproduce a 1-in-109 event is tuning to a single observation** — the thing this project has
retired twenty criteria for. What the fix owes is the **capability**, and the capability is now
exact: full stick reaches **27.02 %H**, the arcade's own extreme, and `flow-02`'s rail markers
show it. Asked as a criteria correction in `ask-flow.md` A4(a).

### 3.4 The 7-point contradiction that was not one

For part of this round it looked as though two arcade-side measurements of the same quantity
disagreed badly: REFERENCE #122's cruise **cy ≈ 52.8 %H** (and the 52–60 %H composition band)
against the hand counts' player **mean 49.47 %H**. Retiring one of them would have been a large
move and the wrong one.

They are the **same number in two units**. REFERENCE.md's own "Centroid: which pixels, and which
average" says #122's figures are **pixel centroids** and that a pixel centroid sits **1.3–3.3
points below** a bbox centre on this silhouette. The hand counts read a **bbox centre** off a
ruler. So 49.47 as a bbox centre is **50.8–52.8 as a pixel centroid**, and 52.8 is inside that.
There is no conflict, the composition band is not in danger, and this is the third time this
project has been bitten by one statistic with two operators behind it. Filed for REFERENCE in
`ask-flow.md` A4(b).

The practical consequence for this lane: our `jetNdcY` is the **sprite anchor**, and
`demoTimeline.js`'s measured offsets make `anchor = pixel centroid − 1.55` in cruise while
REFERENCE's table makes `bbox centre = pixel centroid − 1.72`. So **our anchor is the hand
counts' bbox centre to within 0.17 points**, and the two columns of every table above are in the
same unit without a conversion. Stated because it is exactly the kind of thing that is true now
and silently stops being true when the silhouette is redrawn.

---

## 4. The roam had to be re-solved, and the composition is preserved to three decimals

Changing the envelope changes what every `stickY` in `demoTimeline.js` means, so the two regime
means were re-derived — **by bisection on the measured transfer, not by scaling** — against the
target that the per-regime **mean screen altitude is unchanged**. That is the quantity
REFERENCE #122 and every composition capture are about.

| | committed | R7 | target |
|---|---|---|---|
| cruise mean anchor %H | 51.601 | **51.60** | unchanged |
| canyon mean anchor %H | 61.501 | **61.50** | unchanged |

**What changed is the spread.** The cruise wander gains a second component, which is what the
*lateral* wander in the same file already has and for the same stated reason — a single sine is
arcsine-distributed and piles its mass at the two extremes, the worst available shape for
matching a centrally-peaked distribution. 0.22 rad/s (28.56 s) is kept; **0.68 rad/s (9.24 s)**
is added, incommensurate with the 16.000 s regime cycle (×1.73) and with the 11 s cruise window
(×1.19). Canyon's vertical amplitude drops 0.08 → 0.06 so the tight regime stays tight.

**Amplitudes chosen by a stated rule, not by eye**: minimise the worst absolute deviation across
{p5, p95, sd} of the **cruise** regime against the arcade's 109 observations.

| A1 / A2 | cruise p5 | cruise p95 | cruise sd | worst dev |
|---|---|---|---|---|
| 0.34 / 0.15 | 39.6 | 61.7 | 7.01 | 3.2 |
| **0.40 / 0.18** | **37.6** | **63.4** | **8.16** | **1.4** |
| 0.43 / 0.19 | 36.6 | 64.2 | 8.70 | 2.2 |
| 0.46 / 0.20 | 35.7 | 65.0 | 9.24 | 3.0 |
| *arcade* | *36.4* | *62.0* | *7.73* | — |

Honest caveat the rule cannot remove: the hand-count operator resolves to ±2–3 points, so these
four are **not really distinguishable by their p5**. The rule exists to make the choice
reproducible, not to claim 0.40/0.18 is uniquely right.

**Why cruise-only is the correct comparison**: neither hand count sampled a canyon stage, so the
109 observations are a cruise population, while 31.25 % of a `?demo=1` capture is our canyon
regime sitting 10 points lower **by construction**. Mixing them would produce a number that
means nothing. A judge reading composition or altitude off `?demo=1` must split by regime
(`simTime % 16 < 11` is cruise) — `demoTimeline.js`'s header has said so since R5 and it is
doubly true now.

**An offline model, and it earned its place.** `tools/out/flow-r7/solve_roam.mjs` reimplements
`y(t)` + the follow filter + the measured transfer so candidates can be evaluated without a
browser. It is only worth anything because it was controlled first: on the **committed**
constants it predicted the browser's 4-cycle window at **p5 45.7 / p50 56.0 / p95 62.3 / sd 5.61
/ min 44.7 / max 62.6** — the browser's own figures, every digit. And on the **chosen** constants
it predicted min 35.2 / p5 38.7 / p50 57.9 / p95 62.8 / max 65.2 / sd 8.23 before the run; the
browser returned **35.2 / 38.7 / 57.9 / 62.8 / 65.2 / 8.22**.

**A side effect, measured rather than hoped for.** The same runs read the enemy distribution, and
putting the player in the enemies' band changed which enemies die, which changed the wave
composition: readable-enemy top-third share **31.90 % → 34.48 %** (arcade 47.4), all-enemy
**29.36 % → 31.59 %** (arcade 32.5 — still matching, which is the figure `spawner.js`'s comment
warns not to overshoot). This is a downstream effect of a player-side change and the lift the
spawner's own clamp is now free to make is in `ask-flow.md` A1.

---

## 5. GAP 5, half two — `DEATH_TOTAL_S`, re-measured, restored, and the gate it still misses

### 5.1 The target was re-read off the arcade, and the first re-read was wrong by a frame

GAME_SPEC §2 says the cycle is "≈8–9 s"; gap 5 says "toward 7.8 s". Before restoring a constant
to a number, the number gets checked (CLAUDE.md). **My first check was wrong, the mandatory
sweep caught it, and that is the more useful half of this section.**

CLAUDE.md prescribes single-frame extraction — `-ss <t> -i <file> -frames:v 1`, once per
timestamp. On this VP9 file that **input-seeks**, and adjacent 1/30 s requests return the same
decoded picture: 22 frames extracted that way over t199.90–200.60 contain **7 duplicate pairs**,
which reads exactly like a ~20 fps source. It is not one. `ffprobe` says 30/1, and decoding the
same span **contiguously** gives **90 unique frames in 3.000 s, zero duplicates**. The
duplicates were the seek, and they had put the hit one frame early. Filed as `ask-flow.md` A10,
because it would silently corrupt any frame-accurate claim anyone makes off this file.

The exact form, which names each PNG by its own PTS so the mapping cannot drift:

```
ffmpeg -copyts -ss 196 -i ab2-gameplay.mp4 -vf "select='between(t,199.5,209.5)'" \
       -vsync 0 -frame_pts 1 out%05d.png      # frame N is at exactly N/30 s
```

Boundaries off that decode (`tools/out/flow-r7/arcade-death-exact/`, strips `strip-hit-exact`,
`strip-burst-exact`, `strip-ready-exact`):

| arcade | what is on screen | phase |
|---|---|---|
| **t200.5667** | **the hit** — first sparks ON the jet; intact at t200.5333, and both are distinct decoded frames, so this is pinned to 1/30 s | — |
| t201.25 | the jet silhouette is gone inside the fireball | fireball **0.68 s** |
| t202.55 | the screen-filling starburst has collapsed | starburst **1.30 s** |
| t206.57 | the oversized jet starts sliding in from below | tumble **4.02 s** |
| t207.55 | back to normal scale; the post-respawn flash starts here (§5.4) | slide-in 0.98 s |
| **t208.267** | **last READY frame** | card tail 0.72 s |

**Three different "end of the cycle", and every previous figure is one of them:**
`hit → normal scale 6.98 s` (control), `hit → READY gone **7.70 s**` (the judge's 7.8 s target),
`hit → invincibility flash off 8.67 s` (GAME_SPEC's "≈8–9 s"). They were never in conflict.

Shipped: `FIREBALL_S 0.6 → 0.7`, `STARBURST_S 1.0 → 1.3`, `TUMBLE_S 2.0 → 4.0`,
`RESPAWN_S 1.6 → 1.7`, **total 7.7 s** — the measured split, to the frame, on the three phases
that are unambiguous.

**The 0.72 s we knowingly diverge by, stated rather than buried.** The arcade's slide-in is
0.98 s and the player has the stick from there, with the READY card still blinking over **live
flight** for another 0.72 s. Ours holds control for the whole `respawn` phase, so `RESPAWN_S =
1.7` buys the card the arcade's full on-screen life at the cost of 0.72 s of control. Fixing it
properly means decoupling the card from the phase — `readyPhase` is `t / RESPAWN_S` and that
same ratio drives cards.js's measured yellow→cyan colour phase — so it needs a second parameter,
not a moved boundary. Same reason the card's **start** is not moved: the arcade first shows it
at t205.25, during the tumble, ~2.3 s before control returns. Both recorded in the file.

`judging/R7/flow-01-death-cycle-ours-TOP-arcade-BOT.png` puts our cycle and the arcade's on the
same hit-relative grid, the arcade side from the exact decode. Every boundary lands within one
0.25 s cell. (Ours is stage 1 daylight and the arcade instance is a night stage — the comparison
is **timing**, not palette.)

### 5.2 The reproduction, and the decomposition — which refuted what I expected

Seven seeds × 300 s of `?fixed=1&demo=1`, every tick, deaths counted as entries into the `death`
state **and** cross-checked against `lives` decrements (the two agree exactly on every seed of
every arm). Three arms, so "which change did what" is measured rather than reasoned about —
and it needed to be, because the reasoning was wrong.

| 7 seeds × 300 s | ARM 1 BEFORE `e8fed58` | ARM 2 death cycle only | **ARM 3 SHIPPED** | target |
|---|---|---|---|---|
| `DEATH_TOTAL_S` | 5.2 | 7.7 | **7.7** | measured 7.70 |
| envelope | 1.1 symmetric | 1.1 symmetric | **1.55 / 1.10** | — |
| deaths / 2 100 s | 78 | 73 | **74** | — |
| **flight share** | 78.20 % | 70.76 % | **70.70 %** | **69.4–73.5 %** |
| **deaths/min WALL** | 2.229 ± 0.111 | 2.086 ± 0.114 | **2.114 ± 0.122** | **≤ 2.0** |
| deaths/min FLIGHT | 2.850 | 2.948 | **2.990** | arcade 2.78–2.94 |
| enemy rounds /min wall | 126.00 | 125.17 | 124.60 | "not falling" |
| enemy rounds /min flight | 161.12 | 176.89 | 176.23 | — |

**Flight share PASSES**, and not at the edge: 78.20 % → **70.70 %**, mid-band. The R6 judge's
"we are now *above* the arcade's playable share" is closed, and this is the half of gap 5 that
was actually in this lane's power.

**The ≤2.0 wall-clock gate is MISSED at 2.114** (0.94 standard errors over, so a miss and not a
rout). The decomposition says where it comes from, and it is **not** where I predicted:

* **The death cycle carries essentially all of the improvement**: ARM 1 → ARM 2 moves wall-clock
  **−0.143**, which is the whole move.
* **The envelope's effect on lethality is not measurable at this sample size**: ARM 2 → ARM 3
  moves it **+0.028**, about a quarter of one standard error. I had written the opposite into a
  draft of this section — "restoring the death cycle would have passed the gate and raising the
  envelope put it back" — on arithmetic, before ARM 2 existed. It is wrong. ARM 2 misses the
  gate too, at 2.086.
* So **nothing this lane can reach closes the remaining 0.114**, and the R6 gap text's own
  instruction applies: *"fail it and investigate; do not reflexively make the game easier."* The
  only lethality lever in my three files is `RESPAWN_INVINCIBLE_S`, and §5.4 is the reason
  lengthening it would now be acting against a measurement rather than in the absence of one.

**A criterion came apart while being used, and it is the third this round.** GAME_SPEC §2 makes
flight time the primary lethality denominator on the stated grounds that *"it is the denominator
that is invariant to death-cycle length"*. ARM 1 → ARM 2 **changes `DEATH_TOTAL_S` and nothing
else**, and both denominators move, in opposite directions, the flight-time one by more:
wall **−0.143**, flight **+0.098**. The mechanism is not a bug — threats are produced on **wall**
time (`game.js` keeps calling `combat.update` through the `death` state, R5's "the world keeps
flying" fix, which matches the arcade's still-scrolling world at gp t261) while exposure is
counted in **flight** ticks, so lengthening the cycle leaves the threat schedule alone and
shrinks the denominator. The enemy-rounds rows show the same effect on a quantity nobody is
tuning: per **wall** minute they barely move (126.00 → 125.17), per **flight** minute they rise
9.8 %. Neither denominator is invariant; preferring flight time may still be right, but the
published reason for it is not. Filed in `ask-flow.md` A11.

That also settles the "enemy rounds/min not falling" clause, which can be read either way:
per **wall** minute rounds fall 1.1 % (there are fewer flight seconds to fire in), per **flight**
minute they rise 9.4 %. The clause exists so the death rate cannot be met by making combat
quieter, and by that reading it is satisfied.

### 5.3 Deaths per flight-minute, by the altitude the player was at

Attributed to the altitude of the **last flight tick** before the death, because on the death
tick itself `deathSequence.js` already owns the sprite. Shipped configuration, 7 seeds × 300 s.

| band %H | flight minutes | deaths | **deaths / flight-minute** | share of flight time |
|---|---|---|---|---|
| 32–40 (the new high ground) | 1.92 | 1 | **0.520** | 7.77 % |
| 40–48 | 4.48 | 3 | 0.670 | 18.09 % |
| 48–56 | 4.24 | 3 | 0.708 | 17.12 % |
| **56–64** | 13.48 | 64 | **4.747** | **54.48 %** |
| 64–72 | 0.63 | 3 | 4.770 | 2.54 % |

**Altitude is now the strongest predictor of dying in this build, and the dangerous band is the
LOW one.** Read the counts and not only the rates: only the 56–64 band carries enough deaths
(64) to be worth a percentage, and the three bands above it hold 1, 3 and 3, so they should be
read together — **7 deaths over 10.64 flight-minutes = 0.658 / flight-min** against the 56–64
band's **4.747**, a **7.2×** difference that survives Poisson noise by a wide margin. The same
shape is in both other arms (BEFORE 4.105 against 1.890 / 1.443; DEATH-ONLY 4.181 against
2.721 / 0.992), so it is a property of the build and not of one seed set.

Two things follow that are worth more than the headline rate. First, **the half of flight time
spent in the dangerous band is substantially the canyon regime**, which is parked at 61.5 %H by
a REFERENCE figure — so "our deaths/min" is partly a statement about one scripted regime rather
than about combat difficulty. Second, **the new high ground is where the pilot is safest**, which
is a difficulty gradient the game did not have at all before this round and which nobody has
checked against the arcade. I am reporting it, not calling it a defect; `ask-flow.md` A12.

### 5.4 The decode found something GAME_SPEC says is not there

Doing §5.1 properly meant decoding the death contiguously, and that exposed a behaviour four
previous passes over this footage had missed. GAME_SPEC §2: *"**No visible invincibility flash**
after respawn in any of the four instances ... The prototype's 2 s flashing window stays ADOPTED
as a usability choice, not arcade-verified."*

**There is a flash.** Operator: count bright-and-desaturated pixels (`max(RGB) > 120 ∧
max−min < 60`) in a jet-sized box at x[180,480] y[100,250] of the 640×360 frame — it excludes
both HUD strips and the READY row, so the trace is the airframe and nothing else. Per-frame
counts go ~2 000–2 900 ↔ 0–60 with nothing in between.

| | |
|---|---|
| starts | **t207.567**, the frame the respawn reaches normal scale |
| ends | **t209.233**, after which the jet is in every frame for 6.77 s straight |
| **duration** | **1.67 s** |
| pattern | 8 clean on/off alternations, period **0.267 s**, roughly 5 frames on / 3 off |

Each state lasts 0.10–0.13 s, so **any** sampling coarser than ~0.1 s aliases it away — which is
why it was missed, my own first pass at 0.25 s included. Three consequences:

1. **`flow.js`'s `RESPAWN_INVINCIBLE_S = 2.0` is arcade-supported to within 0.33 s**, not an
   unverified usability choice. I did **not** change it to 1.67: "it flashes" implies "it is
   invulnerable" by convention and not by measurement, and shortening a grace window on an
   inference while §5.2's gate is already failing is the wrong direction to act in.
2. **We now draw the flash**, because we did not and the arcade does, and it is measured to a
   period. `flow.js:_applyGraceFlash` drives the sprite off the **same timer** that gates the hit
   test, so what the player sees and what protects him cannot drift apart.
   `tools/out/flow-r7/flash_probe.mjs` asserts the pattern on the build: ON runs **10 ticks**
   (0.167 s), off runs **6 ticks** (0.100 s), **42 hidden ticks** in the 2.0 s window, the flash
   **stops**, and **zero** hidden ticks under `?invincible=1`. All pass.
   *(The first version of that probe asserted 45 hidden ticks and failed the code for its own
   arithmetic: 120 ticks / 16.02 per period = 7.49, so seven complete off-runs of 6 fit and the
   eighth is cut — 42, not 37.5 % of 120. Recorded because it is the cheap half of the
   instrument-control rule.)*
3. **A warning every other lane needs, and it is in the code**: the player sprite is now absent
   from ~3 frames in 8 for 2.0 s after every respawn. A single-frame jet measurement landing in
   one reads "no jet", and that is not a defect. `?invincible=1` suppresses it entirely and is
   already the documented path for roam/composition work; `window.__flowState().graceFlashHidden`
   reports it per tick so a probe can exclude those ticks instead of inferring from pixels.

**GAME_SPEC §2's "≈8–9 s" and the judge's 7.8 s are also both right**, about different
boundaries, which the flash is what finally separates: `hit → normal scale 6.98 s` (control),
`hit → READY gone 7.70 s` (what we ship), `hit → flash off 8.67 s` (§2's figure). `ask-flow.md`
A9.

---

## 6. GAP 11 and the carrier — what I refuse to half-build, and one framing ruling

### 6.1 The carrier's framing, ruled on because the sprite lane asked rather than reached in

`judging/R7/ask-sprite-art.md` B1: `carrier.js`'s header says the ship is *"seen from ASTERN and
slightly above, looking forward along the deck"*, and that is not `reference/carrier-prelaunch-
t84.png`. The sprite lane redrew the art against t89, **changed no placement maths**, and
referred the framing to this lane. Ruling, with the reasoning written into `launchSequence.js`
so it lives in the code and not only here, and the full version in `ask-flow.md` A13:

1. **The sequence opens on t84 and the placement landmarks stay t84's.**
   `flow-04-carrier-launch-ours-TOP-arcade-BOT.png`: at sequence start our ship sits small across
   the horizon with the jet on it — t84's composition — and by +2.0 s it has grown into a large
   deck mass with the island to starboard, which is a t89-like scale. **t89 is a later moment of
   the same overfly, not a different shot.** Re-deriving the landmarks from t89 would anchor the
   *opening* composition on a frame the sequence merely passes through, and would discard a
   four-landmark fit that reproduces on our own capture to ≤0.38 points.
2. **Their reading of t84 is right and the header is wrong.** t84's hull is visible along its
   full length as a long dark slab on a **flat horizontal waterline** with the deck overhanging
   both sides; that only happens from off the beam or quarter, and the ship's long axis lies
   *across* the frame (`tools/out/flow-r7/t84-ship.png`, 3×). A replacement paragraph is drafted
   in A13; I did not edit their file.
3. **The real remaining defect is the texture's AXIS, not its detail** — ours is a symmetric
   trapezoid, an axial astern view, matching neither frame. That is an art change and it alters
   the **silhouette**, so the four landmarks must be re-fitted against the new deck quad if it is
   made; I have offered to re-fit.

### 6.2 GAP 11 — what I did, what I refuse to half-build, and the one line that unblocks it

**Done last round and still true**: the *structure* runs all 23 `STAGE_MAP.md` durations
(12–48 s, mean 34.2 s, ±4 s quantisation stated in the file). **Nothing further is reachable in
this lane's files this round, and here is the specific reason rather than a shrug.**

Stage content — palettes, terrain, canyon walls — is `game/stage.js` and `render/{ground,sky,
clouds}.js`, which are the world lane's. `STAGES` has 3 entries, so palettes lap every 3 while
structure laps every 23. Permuting the three palettes to fake more stages would make the lap
harder to *see* without making it smaller.

**The resupply stages are the part that looked reachable and is not, and this is the refusal.**
GAME_SPEC §5 measures the runway restock in unusual detail, and **every property of it except one
belongs to this lane**: score frozen for the whole pass, HIT stays 0, SPEED bar near zero,
missile stock held ~7 s then refilled in a ~4 s burst. The one that does not is **"no enemies"**.
`flow.js` can stop combat being *updated* (`combatActive: false`, which `game.js` honours) and
can empty the field (`combat.clear()`, already public and already called) — but `combatActive:
false` freezes **the player's own weapons too**, and a 12-second stage in which the stick works,
the SPEED bar reads zero and firing does nothing is a *worse* simulation than the generic stage
we have now. Building the measured half without the one unmeasured-by-me half would also have
put a slow, score-frozen player in front of a live spawner, which is the one change most likely
to have made §5's gate worse.

So: **not attempted, and asked for instead** — `setSpawning(enabled)` on `Combat`/`Spawner`,
gating the queueing only (`ask-flow.md` A3). With it, stages 5 and 13 land as measured resupply
stages in one change on my side.

**Also carried forward undecided ON PURPOSE**: the HUD stage digit (wrapped, as R5 chose, vs the
arcade's true counter). Both arguments are written out in `ask-flow.md` A7 so the next person
does not re-derive them. It is one line in my file either way and I am not flipping a reasoned
R5 decision on my own judgement.

**Carried from R6 and still not mine**: `playEnemyFlyPast` has zero call sites (the site is in
`spawner.js` — A2), and the life count is drawn too small to read (the digit is `ui/**` — A5;
the wiring is mine and is verified correct). The attract demo's repeated *engagement* is
`spawner.js`'s; its repeated *roam* is mine and is the thing §4 changed.

---

## 7. Observed vs inferred

**Observed in frames** (`tools/out/flow-r7/`, 62 frames in 3 of our own capture sets, all swept
clean): the jet held at each candidate envelope rail with the HUD band edges drawn on, including
the two rails that bury it under the bottom strip; our whole death cycle on a 0.25 s grid beside
the arcade's; the carrier overfly from deck-on-the-horizon to pass-the-camera.

**Observed in the arcade**: 48 player-altitude readings over 5 stage-verified stages, each read
by eye off a ruled 1.4× upscale, with 5 exclusions and their reasons; the death cycle's phase
boundaries at 1/30 s from a contiguous decode, including the single frame the hit happens on;
t84's hull on its flat waterline at 3×.

**Measured by probe, not visible in pixels**: the stick→%H transfer at 41 held deflections,
twice, at two envelopes agreeing to 0.01 %H; 38 401 flight ticks of player altitude per arm;
78 / 73 / 74 deaths over 7 seeds × 300 s per arm with a lives-decrement cross-check that agreed
on every seed; the post-respawn flash's run lengths on our build; seven URL paths booting clean.

**Predicted, then confirmed**: the offline roam model's six statistics for the chosen constants,
*before* the browser run — min 35.2 / p5 38.7 / p50 57.9 / p95 62.8 / max 65.2 / sd 8.23 — against
the browser's 35.2 / 38.7 / 57.9 / 62.8 / 65.2 / **8.22**.

**Predicted, then REFUTED — and this is the one to read.** §5.2's first draft said "restoring the
death cycle would have passed the ≤2.0 gate and raising the envelope put it back, because the
player now flies where the enemies are." It was arithmetic, it was plausible, and ARM 2 says it
is wrong: the death cycle carries the whole move and the envelope's effect is a quarter of a
standard error. It was in the report before the arm that disproved it finished running. The
altitude breakdown then inverted the stated mechanism as well — the **low** band is the dangerous
one, 7.2× the rate of everything above it, and the new high ground is the safest place in the
game.

**Three defects found in my own instruments, all by controls rather than by reading output.**
(a) `death_film.mjs` reintroduced the drawing-buffer race R5 fixed inside `capture.mjs` — 1 black
frame of 37, caught by the mandatory sweep, not by looking at the montage; the first retry was
*also* wrong, re-reading the same uncommitted surface and returning five identical black PNGs,
which is how it was established that the blank is a missing **compositor commit** and that the
fix is two nested `requestAnimationFrame`s. (b) Single-frame `-ss` extraction returns duplicates
on this VP9 file and had put the death-cycle hit one frame early (§5.1, A10). (c) `flash_probe`'s
first expected value was 45 hidden ticks and should have been 42, so it failed working code for
its own arithmetic.

**Nothing withdrawn**: every number published here is one I would defend, and the three above
were fixed rather than carried.

**Not experienced**: nobody has held the controls. Whether 1.41× more authority upward than
downward *feels* wrong in the hand, whether the restored 7.7 s death cycle reads as weighty or as
dead air, and whether the new invincibility flash reads as protection or as a glitch, are claims
I cannot make from frames and telemetry. The numbers say the cycle matches the arcade's, the
playable share is inside its band and the flash reproduces the arcade's measured period; they do
not say it is better to play.

**Nothing committed, nothing pushed. No file outside this lane was modified.**

---

## 8. Evidence index

| file | shows |
|---|---|
| `flow-01-death-cycle-ours-TOP-arcade-BOT.png` | our restored **7.7 s** cycle against the arcade's **7.70 s**, same hit-relative grid, arcade side from the exact decode |
| `flow-02-player-altitude-arcade-vs-ours.png` | **the primary gap-5 evidence**: 109 arcade hand observations, ours before, ours after, with the full-stick rail marked on each |
| `flow-03-envelope-rails.png` | why the envelope is asymmetric — the jet at each candidate rail with the HUD band edges drawn on |
| `flow-04-carrier-launch-ours-TOP-arcade-BOT.png` | the launch overfly against t84 and t89, for the framing ruling in §6.1 |

Probes, all under `tools/out/flow-r7/`, each self-tested where it can be:
`alt_probe.mjs` (uniform-ramp control), `map_probe.mjs` (validated against the published trio),
`rails_check.mjs`, `death_probe.mjs` (lives cross-check), `death_film.mjs`, `boot_probe.mjs`,
`solve_roam.mjs --control`, `sweep.py` (planted-fault control), `plot_alt.py --selftest`,
`flash_probe.mjs`, `launch_film.mjs`, `arcade_player_sheets.py`. Raw arcade readings:
`arcade-player/labels.csv`. Exact-decode arcade frames: `arcade-death-exact/`.

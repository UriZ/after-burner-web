# R9 — pacing lane: two aircraft, not seven

**Tree**: started from committed `52edcc4`. Files changed: `src/game/spawner.js` only.
`src/entities/enemy.js` was in my lane and **is byte-identical to `52edcc4`** — nothing in it
needed to move and I am saying so rather than leaving the reader to diff it.

**Everything below is my own measurement.** Instruments, each with the control it passed:

| instrument | control | result |
|---|---|---|
| `judging/R9/pace_probe_r9.mjs` (new) | `?pace=` set to the committed values reproduces `52edcc4` | **every digit the probe prints, on every arm and seed** — see §1 |
| same | `idle` arm: no trigger, no missile, no stick | kills/s **0.000**; emission is not a function of the player |
| same | three independent emission operators per run | max-id = ids-ever-seen = new-appearance count, **to the unit**, on all 24 arms |
| `judging/R9/occlusion_r9.py` (new) | `--selftest`: half-covered synthetic = **50.000 %**, uncovered = **0.000 %** | PASS |
| same | real control: the no-combat arm against itself | **0.0 % on every frame of every arm** (nothing on screen can occlude) |
| `tools/assert_population.py` | `--selftest` on this tree, plus `--collision-control` on a `?nocombat` dir | PASS / CLEAN |
| frame sweep | 1320 frames across 44 capture dirs, within and **across** directories | **0 black**; every duplicate explained in §6 |

---

## 0. The headline

> **The arcade emits 0.4–0.74 aircraft per second of flight. We emitted 2.7–2.9. We now emit
> 0.567–0.647, on every arm, every pilot, every seed.**
>
> **The arcade's sky holds no enemy aircraft at all 28.6–39.7 % of the time. Ours held none
> 0.0–0.4 % of the time. It now holds none 30.2–45.1 % of the time on the attract path.**
>
> **And the rhythm exists for the first time.** Before, the longest the sky was empty in a 90 s
> run was **0.32 s** and the median *continuously occupied* run was **86.5 s** — one unbroken
> block of aeroplanes. After: empty runs median **3.4–5.1 s**, p90 **7.2–8.5 s**; occupied runs
> median **5.3–5.7 s**. R8's feel critic described the arcade's minute as *"six to ten seconds
> of empty sky and a horizon, then three to five seconds of a formation arriving, growing and
> passing."* That is now what the probe reads off our own build.

**→ `judging/R9/r9pace-01-DENSITY-BEFORE-left-AFTER-right.png`** — two matched ticks, same seed,
same attract pilot, same stage digit (manifest-verified: ticks 1211 and 2076, state `flight`,
stage 1 on all four). Hand-counted under the R8 judge's own operator (count enemy aircraft on a
displayed frame; the player is the twin-nozzle jet, enemies carry one black-ringed disc):
**t2076 reads 7–8 enemy aircraft before and 2 after.**

---

## 1. The control that licenses every "before" number in this report

`?pace=key=value,...` is a measurement-only override of this file's pacing constants, with the
same hard-error-on-unknown-key contract as `?gun=`. Its first job was to prove it is a *switch on
one build* and not a second build:

```
node judging/R9/pace_probe_r9.mjs --modes idle --seeds 1 --secs 60 \
  --pace "maxalive=14,gapmin=0.9,gapmax=1.6,dispmin=0.14,dispmax=0.34,corridor=0,openerspan=3,traingap=2.46,trains=2"
```

| | committed `52edcc4` | the same arm on the final shipped tree |
|---|---|---|
| emit/s (three operators) | 2.767 \| 2.767 \| 2.767 | **2.767 \| 2.767 \| 2.767** |
| mean alive | 13.04 | **13.04** |
| mean pending | 18.70 | **18.70** |
| on-screen ≥3 %W | 8.64 | **8.64** |
| readable ≥10 %W present | 89.8 % | **89.8 %** |
| rounds/min | 130.0 | **130.0** |

Run twice: once before any edit, once after the last one (`tools/out/pacing-r9/before-popA.json`,
`control-is-before.json`, `control-is-before-2.json`, `control-final.json`). **Identical.**

**One real defect found and fixed in my own probe, stated because it is the hazard
`tools/capture.mjs`'s header exists for.** The probe first read `server.config.server.port`,
which reports the port vite was *asked* for (5173), not the one it bound when 5173 was already
taken — by another lane's vite, on this same tree, this round. Two arms died on it. Fixed to
`httpServer.address().port`; the control above was re-run after the fix and is unchanged.

---

## 2. The arcade count — mine, beside the two published ones

**Rule written before any frame was opened**: `judging/R9/arcade-count-rule.md`. Labels:
`tools/out/pacing-r9/arcade/labels-r9.csv`. Frames: `tools/out/pacing-r9/arcade/`.

**21 frames counted, 3 excluded, 4 stages, fixed 5.00 s grid** — a *third* spacing (the 63-frame
set used 3.00 s, R8's feel critic used 2.00 s), and **stages 3, 10 and 11 have never been counted
by anyone in this repo**. Stage digit read on all 24 before counting:
`tools/out/pacing-r9/arcade/digit-sheet.png` reads **1×6, 3×6, 10×6, 11×6** — every frame
verified, no assumption inherited from STAGE_MAP. Exclusions: `s03-t163`, `s03-t168`, `s11-t475`
— the refuel/tanker sequence and the RELOAD WEAPONS card, excluded by rule 4 before counting.

| | frames | stages | readable (≥10 %W) present | aircraft/frame ≥3 %W | empty (no enemy ≥3 %W) |
|---|---|---|---|---|---|
| R8 feel critic, own count | 18 | 3 | **16.7 %** | — | — |
| R6 `arcade-vert/labels.csv`, **re-derived by me from the primary labels** | 63 | 6 | **19.0 %** | 1.270 | **39.7 %** |
| **this lane, own eye count** | 21 | 4 | **28.6 %** | 1.476 | **28.6 %** |
| **pooled, two readers** | **84** | **8** | **21.4 %** | ≈1.32 | **36.9 %** |
| R3's gate | | | **≥ 60 %** | | |

I reproduced the 63-frame set's published statistics exactly from its labels (1.317 / 61.9 %,
1.270 / 60.3 %, 0.302 / **19.0 %**, 0.048 / 4.8 %), so that column is arithmetic I checked, not a
number I took on trust.

**The three counts disagree by 12 points on presence and agree to a point on the shape that
causes it**: 77.1 % (feel critic) / **79.2 %** (mine) of the arcade's own enemy aircraft are drawn
below 10 %W, median span 4 %W / **4.5 %W**. Three readers, three samples, one distribution.

**Two things my sample adds that the others could not.**

1. **The arcade's density ramps hard with stage, and nobody had sampled late stages on a grid.**
   Stage 1 **33.3 %** readable, stage 3 **0.0 %**, stage **10 66.7 %** (mean 3.67 aircraft/frame —
   busier than anything previously counted), stage 11 **0.0 %**. **Stages 1+3 read 20.0 % and
   stages 10+11 read 36.4 %.** My higher headline is three-quarters a stage-selection effect, not
   a reader disagreement. *This matters for how the target is used*: every judge capture is taken
   on stage 1, and the arcade's **stage 1** sits at 33–44 % readable, roughly double its all-stage
   average. Steering a stage-1 build to the all-stage 19 % would undershoot the arcade's own
   stage 1.

2. **A classification correction I made against myself.** Four objects in stage 10 that I first
   counted as distant aircraft are, at 8×, the same sprite each time: a yellow or red capsule with
   a black cruciform fin bar — **ordnance, not an airframe**. Removing all four is in the CSV with
   its reason. It moves one frame across the ≥3 %W line (empty 23.8 % → **28.6 %**) and moves
   readable presence not at all. The residual uncertainty I could **not** resolve at 686×480 is
   lock-bracketed specks below 3 %W; they affect the "anything seen" column only.

---

## 3. Before and after, the four reproductions

12 arms per side (4 pilots × 3 seeds × 90 s, every tick sampled), `?fixed=1`, probe installs its
own stick on every arm. `tools/out/pacing-r9/{before-popB,after-final}.json`.

### 3.1 Reproduction 3 — emission rate: **PASS**

| arm | BEFORE | AFTER | arcade |
|---|---|---|---|
| `idle` (no input at all) | 2.711 – 2.756 | **0.567 – 0.644** | |
| `still` (trigger + missile, stick untouched) | — | **0.567 – 0.644** | **0.40 – 0.74** |
| `trk` (tracking pilot) | — | **0.567 – 0.600** | |
| `demo` (attract path) | 2.832 – 2.879 | **0.578 – 0.647** | |

**Inside the arcade's bracket on all 12 arms**, with margin at both ends, on three independent
emission operators that agree to the unit. 2.86 → 0.61 is **4.7×**.

### 3.2 Reproduction 2 — frames with no aircraft at all: **PASS on the autopilot, MISS on the tracking pilots**

At the arcade-matched floor (on-screen **and** ≥3 %W — *not* `alive > 0`, which counts off-screen
sub-pixel traffic the arcade counter could never have seen):

| arm | BEFORE empty | AFTER empty | arcade |
|---|---|---|---|
| `idle` | 0.00 – 0.33 % | **29.7 – 33.7 %** | |
| `demo` | 0.02 – 0.37 % | **30.2 – 45.1 %** (mean **37.4**) | **36.9 %** pooled |
| `still` | — | 63.9 – 70.4 % | (28.6 % mine / 39.7 % 63-frame) |
| `trk` | — | 66.3 – 74.3 % | |

`demo` lands **0.5 points** off the pooled arcade figure on the mean and inside ±8 on every seed.
`idle` is within 7. **The tracking pilots overshoot by 27–37 points** and I am not dressing that
up: a pilot that kills 85–95 % of everything that arrives empties a sky supplied at the arcade's
rate. §5 explains why that is a gun property, not a spawner one.

### 3.3 Reproduction 1 — readable-enemy presence: **PARTIAL; the arcade is now bracketed, no single pilot is inside 10 points**

| arm | BEFORE | AFTER | arcade |
|---|---|---|---|
| `idle` | 93.2 – 95.8 % | 37.6 – 41.1 % | |
| `demo` | 91.4 – 92.2 % | **29.6 – 38.3 %** (mean 35.1) | **21.4 %** pooled |
| `still` | — | **8.3 – 13.9 %** | (16.7 / 19.0 / 28.6 by reader) |
| `trk` | — | **9.5 – 12.8 %** | |

92 % → 30–38 % on the autopilot and → 8–14 % on the pilots that shoot. The arcade's 21.4 % is
**between our two pilot families**; the autopilot is 8–17 points above it (one seed inside 10),
the tracking pilots 8–13 points below. Declared a **MISS on the letter of the reproduction** and
reported as a bracket. The honest statement of what moved: the build was 4.3× the arcade on this
statistic under every pilot and is now within a factor of 1.6 either side of it.

The underlying counts are tighter than the presence percentages:

| | BEFORE `demo` | AFTER `demo` | arcade |
|---|---|---|---|
| enemy aircraft on screen ≥3 %W | **8.19 – 8.33** | **1.73 – 1.95** | **1.27 – 1.48** |
| enemy aircraft on screen ≥10 %W | 3.15 – 3.22 | 0.61 – 0.70 | 0.30 – 0.52 |
| mean alive (simulation) | 12.81 – 13.02 | 2.69 – 3.06 | — |

**8.3 → 1.8 against the arcade's 1.3–1.5.** That is the judge's "seven, not two" line, closed.

*Unit check, run rather than assumed*: our `spanFrac` is a projected **quad** width and the arcade
side is a drawn **wingspan**; R8's feel critic measured the ratio at 1.03× level and up to 1.39×
banked. The probe carries all five floors so the comparison can be re-run unit-corrected; at
≥9 %W the arcade reads 19.0 % against 19.0 % at ≥10 %W, so the correction changes no conclusion
here. Stated because a bare "%W" is not a reportable quantity (REFERENCE ledger row 27).

### 3.4 Reproduction 4 — do not regress R8's wins

| gate | BEFORE | AFTER | verdict |
|---|---|---|---|
| gun kills below the 10 %W readable gate | 0.0 % (all arms) | **0.0 % (all arms)** | **HELD** |
| unannounced fatal hits | 0 of 19 | **0 of 17** | **HELD** |
| minimum warning on a fatal hit | 2.967 – 4.383 s | **2.983 – 3.267 s** | **HELD** (≥ 2.88 s) |
| deaths, `trk` / `demo`, 3 seeds × 90 s | 4/5/6 and 1/2/1 | 4/4/4 and 4/1/1 | no lethality increase |
| **enemy rounds/min, `demo`** | **123.5 – 147.7** (mean 138.7) | **97.1 – 126.9** (mean 113.1) | **MISSED, −19 %** |
| mean enemy fireballs in the air | 6.15 – 7.60 | **4.94 – 6.33** | −17 % |

**The volume gate is missed and §5 says what it would cost to close it and why I did not.**

---

## 4. What changed in `spawner.js`, and the one thing I built and then withdrew

| constant | was | is | set by |
|---|---|---|---|
| `MAX_ALIVE` | 14 | **6** | GAME_SPEC §4's own ADOPTED "hard cap ~7 alive"; it no longer binds |
| `WAVE_GAP_MIN/MAX_S` | 0.9 – 1.6 | **7.0 – 13.0** | the arcade's ~10.5 s engagement cadence; 5–9 was measured first, emitted 0.75–0.87/s, and the gap was scaled by the ratio and re-measured |
| `DISPENSE_MIN/MAX_S` | 0.14 – 0.34 | **0.20 – 0.50** | GAME_SPEC §4 verbatim; reconciles the code with the spec (R8 judge gap 1) |
| opener flight size | 2–4 | **2–3** | the opener + primed echelon would otherwise bind the new cap on its own |
| `MAX_CONCURRENT_TRAINS` | 2 | **3** | volume recovery; §5 |
| `TRAIN_START_GAP_S` | 2.46 | **0.15** | volume recovery; this constant's own comment demands a re-set when the alive budget moves |
| `PLAYER_CORRIDOR_NDC_X` | — | **0 (wired, inert)** | §4.2 |

**A defect found on the way, which nobody had named.** `pending` was a *critically loaded queue*:
supply (3.83 members / 1.25 s = 3.06/s) sat exactly on capacity (14 / 4.55 s = 3.08/s), so the
backlog random-walked upward without bound — measured **4.7 aircraft at 20 s, 18.7 at 60 s, 33.2
at 90 s, still climbing**, and `clear()` discards it wholesale at every stage boundary. A fifth of
everything the wave generator built was never flown. After: **0.72 – 1.04, flat in run length.**

### 4.1 The criterion I retired, and why

R3's gate — *"≥1 enemy at ≥10 %W in ≥60 % of combat frames"* — **has no arcade side and the arcade
fails it on all three independent counts (16.7 / 19.0 / 28.6 %).** `spawner.js`'s own comment
recorded `MAX_ALIVE` climbing 6 → 10 → 12 → 14 to satisfy it, justified by *"roughly two thirds of
spawns are shot down before they ever reach readable size"* — and **R8 shipped the fix that makes
that impossible**: `READABLE_SPAN_FRAC` in `vulcan.resolveHits` means the gun cannot kill an
aircraft below 10 %W at all. I measured it on the committed tree before touching anything: **gun
kills below the gate, 0.0 %, every arm, every seed.** The mechanism the cap compensated for does
not exist. The derivation is deleted from the file, not improved.

### 4.2 The player corridor: built, measured, **WITHDRAWN**

R8's art critique ranks *"you cannot find your own aircraft"* first of everything it found and
asks for exactly one fix in my lane: *"keep enemies out of the player's screen box."* I built it —
a monotone, sign-preserving map of a wave's **fly-past centre** out of a ±0.34 NDC dead zone
(0.34 = just inside the player's measured 35.62 %W half-span), applied to the formation centre
rather than per member so a wave's internal geometry is untouched.

**One-lever isolation, 45 flight frames per arm, three tick spacings, four captures per frame:**

| arm | >30 % of the player hidden | >50 % | worst frame |
|---|---|---|---|
| committed build (old population) | 11.1 % | 4.4 % | 52.3 % |
| **new population, `?pace=corridor=0`** | **6.7 %** | **2.2 %** | **50.7 %** |
| new population, corridor 0.34 | 6.7 % | **6.7 %** | **65.0 %** |

**The population cut does all of the work and the corridor makes the tail worse.** Mechanism: a
wave's fly-past x is fixed when the wave is *built*, and the player moves ~0.4 NDC in the 2.7–5 s
before it arrives — so clearing *screen centre* displaces the formation toward the player as often
as away, and when it displaces toward, the whole formation lands on him instead of one member.
Every surviving >30 % frame in all three spacings is the same event: ticks 370–407, the stage
opener's primed echelon reaching fly-past depth with the jet rolled hard and off centre
(`tools/out/pacing-r9/occ-after2-e29-{A,B}/frame-0012.png` — I cropped it and looked, which is how
this was found rather than argued).

I tried the obvious repair first — recentring the corridor on the player's **actual** ndc.x at
dispense time for the opener, the one wave that is near-field immediately — and re-measured:
6.7 % / 6.7 % / worst 65.0 → 62.5. **No material change**, because the occluder is the *primed
echelon* arriving 2.7 s later, not the overtake flight. So: shipped at 0, mechanism and
`?pace=corridor=` left live and inert, with the arms and the refutation in the file. Same
disposition as R6's throttle-closure withdrawal in the same file.

### 4.3 The occlusion result that does stand, over a representative window

The grid above samples only the first 6–14 s of flight — it is opener-heavy, and I am flagging
that rather than letting it pass. Re-measured at spacings **173 and 211** (flight 0–66 s; neither
divides `?demo=1`'s 960-tick cycle), committed build vs shipped build:

| | >30 % hidden | >50 % | worst |
|---|---|---|---|
| committed `52edcc4`, pooled 84 flight frames, 5 spacings | **10.7 %** | 3.6 % | 77.4 % |
| **shipped**, pooled 84 flight frames, 5 spacings | **4.8 %** | **2.4 %** | **64.2 %** |

**All three improve, and the >30 % rate halves.** For reference the art critic published 19.5 % /
7.3 % / 60.7 % on the same build from a different 41-frame sample under the two-capture form of
the operator; my before-column is the same phenomenon at the same order.

**An operator defect I found and repaired, because the tool announced it.** The natural form,
`1 − |visible| / |full|`, returns a **median of −19 %** on the shipped build. The two masks' bboxes
agree to the pixel, so the pose is matched; what differs is that a player pixel whose colour
equals what is *behind* it registers in neither difference — common against the no-combat arm's
plain sky, rare against an enemy airframe — so two differently-biased areas are divided. The
shipped form compares the masks **pixel by pixel**, `|P \ V| / |P|`, which is bounded in [0,1] by
construction. Both residual biases are named in the tool's header; only the tail is quoted, as the
art critic also did.

---

## 5. What I did not close, and the honest reason

**Enemy rounds/min is down 19 % and it cannot be bought from this file.** Train length is already
at the top of GAME_SPEC §4's MEASURED "trains of 4–8"; crossers, openers and the primed echelon
cannot fire *by the firing band's geometry*; at `trains=2` the ceiling is 76–91 rounds/min however
small `TRAIN_START_GAP_S` is made (measured, 4 seeds). `trains=4, traingap=0.3` reaches 119–128
and I declined it: it is an unmeasured step past the only arcade anchor the fire budget has.

**And the gate itself is the next instance of the loop this round exists to break.** This is R8
judge **gap 2** verbatim: *"the arcade's enemy ROUND rate does not exist anywhere in this repo…
until it does, gap 0 cannot be executed without someone guessing."* The ≥140 rounds/min figure was
set against **our** supply of shooters, exactly as the ≥60 % density gate was set against **our**
supply of aircraft. I am not tuning to it past the point where the arcade can corroborate.

What I could put an arcade side under is the one enemy-fire statistic that needs no time-of-flight
constant: **fireballs on screen**. `reference/stage7-enemy-shot-train-t330.png` is read in
`enemy.js` as 10–16 at once. We measure **6.15–7.60 before and 4.94–6.33 after** — *below* the
single arcade frame on both sides of this change. That reframes the miss but does not erase it,
and a proper per-frame count of enemy fireballs over the STAGE_MAP spans is still owed.

**Also left open, named so it is not read as checked:**

- **The per-tick lateral avoidance** that would actually close the art critic's rank-1 item
  (§4.2). It belongs in `enemy.js`'s late-approach path, it moves lateral distributions the world
  and criteria lanes score, and I could not validate it inside the round. It is worth a lane.
- **Readable presence is now dominated by the gun, not the spawner** (§3.3). At the arcade's
  emission rate, a pilot that tracks destroys each aircraft *at the moment it crosses 10 %W*
  — which is exactly what `READABLE_SPAN_FRAC` licenses — so readable **dwell** collapses. The
  arcade's expert kills a comparable share of arrivals and still reads 19–29 %, because his kills
  are not gated on size. **Do not tune the spawner to this statistic again without that in view**;
  the lever is in `combat.js`/`vulcan.js`, not here.
- **Stage selection in the arcade target** (§2). The pooled 21.4 % / 36.9 % averages stages 1
  through 19; the arcade's **stage 1** — which is what every judge capture shows — is roughly
  twice as busy. A criteria lane should decide which denominator the gate uses before the next
  round steers by it.
- **My own count's weak points**: 21 frames, one reader, 686×480; stage 3 is a night stage and the
  hardest to count; sub-3 %W lock-bracketed specks are classified with low confidence; one stage-1
  frame (`s01-t101`) holds three single-nozzle airframes and no twin-nozzle player, and I resolved
  it conservatively by excluding the largest as the player.

---

## 6. Evidence index

**Capture sets**, all under `tools/out/pacing-r9/`, all new, all mine. **1320 frames swept, 0
black.** Every duplicate is between two **no-combat** (`-C`/`-D`) arms, or is a pre-flight
**launch** frame where combat-on and combat-off render identically and which the statistic
excludes by flow state. Restricted to `state == flight`, the only duplicates left are between
`occ-after` and `occ-after2` — two arms differing *solely* in the opener's corridor centre, which
is itself confirmation that change touched nothing but the opener. **No duplicate exists between
any two different pacing arms.**

| set | what |
|---|---|
| `arcade/` + `arcade/ruled/` + `arcade/digits/` + `digit-sheet.png` + `labels-r9.csv` | my arcade census, 24 frames, all digits verified |
| `before-popA/popB.json`, `after-final.json` | 4 pilots × 3 seeds × 90 s, before and after |
| `before-fair.json`, `after-fair-final.json` | `--invincible false`, the fairness contract |
| `control-is-before{,-2}.json`, `control-final.json` | the `?pace=` switch reproducing `52edcc4` |
| `sweep-{A,B,C,A2,C2,A3,F,Fv1..Fv4}.json` | the population and fire-budget sweep |
| `occ-before-e{29,37,53}`, `occ-nocorr-e*`, `occ-after*-e*`, `occL-{before,after}-e{173,211}` | occlusion, 4 captures per frame, 5 spacings, both builds |
| `fig2-before`, `fig2-after` | the A/B figure's source sets |

**`tools/assert_population.py` over every set this lane calls "in combat"**: the occlusion A-arms
pass all three classes (`occ-before-e29-A`: weapon 6/20, explosion 3/20, enemy fire 10/20;
`occ-nocorr-e29-A`: 6/20, 1/20, 10/20), with the `?nocombat` collision control reading CLEAN. The
14-frame figure sets at 1.6 s spacing catch weapon and enemy fire but step over every explosion;
the density claim they illustrate is backed by the probe arms and by the asserted occlusion sets,
and I am not claiming an explosion is in a frame that has none.

**Reproduction, end to end:**

```
# the before column, on the shipped build
node judging/R9/pace_probe_r9.mjs --modes idle,still,trk,demo --seeds 1,2,3 --secs 90 \
  --pace "maxalive=14,gapmin=0.9,gapmax=1.6,dispmin=0.14,dispmax=0.34,corridor=0,openerspan=3,traingap=2.46,trains=2" \
  --out <dir>/before.json
# the after column
node judging/R9/pace_probe_r9.mjs --modes idle,still,trk,demo --seeds 1,2,3 --secs 90 --out <dir>/after.json
# occlusion, per spacing EV, four arms A/B/C/D as in occlusion_r9.py's header
python3 judging/R9/occlusion_r9.py --selftest && python3 judging/R9/occlusion_r9.py <dir>/occ-eEV
```

---

## 7. Against criteria-r9's ARCADE-PACING table (added after the gate landed)

The gate is on **drawn span**; `spanFrac` is a projected **quad** width. Rather than convert on
paper I added the unit-corrected floors to the probe and re-ran everything: `FLOORS` now carries
3/5/10 %W **and** 3.54/5.9/11.8 %W (= floor × 1.18, the bank-weighted quad-to-drawn ratio R8's
feel critic measured on the authored sheets). **Every number below is the unit-corrected,
drawn-span bin** — the gate's own unit. Nominal-bin figures are in the same JSON for both.

I also added the two rows my probe did not have: frames holding **≥2 enemies at ≥5 %W**, and the
**share of on-screen observations below 10 %W** (denominator = every on-screen aircraft at ≥3 %W,
i.e. what an arcade counter's own eye could resolve — not `alive`).

**And I added the pilot the gate actually needs.** My `still`/`trk` arms release a missile every
**0.4 s**; the missile carries **no span gate** (`READABLE_SPAN_FRAC` binds `vulcan.resolveHits`
only), so a 2.5 lock-on/second pilot strips traffic at any size and truncates the residence these
rows measure. `arcstill`/`arctrk` use the R8 judge's **2.0 s** cadence and land at
**0.46–0.57 kills/s — the arcade expert's own 0.42–0.54.** That is the arm to read.

`tools/out/pacing-r9/{crit-before,crit-after,crit-after-arc}.json`, 90 s × 3 seeds per arm,
every tick.

| row | GATE | BEFORE (all arms) | AFTER `arcstill`/`arctrk` | AFTER `demo` |
|---|---|---|---|---|
| ≥1 enemy at ≥10 %W | **9 – 29 %** | 45.4 – 94.4 ✗ | **9.0 – 13.8 ✓ (6/6)** | 25.7 – 34.1 (1/3) |
| **no enemy at ≥3 %W** | **≥ 27 %** | **0.0 – 3.1 ✗** | **59.0 – 67.9 ✓ (6/6)** | **33.1 – 48.0 ✓ (3/3)** |
| mean on screen ≥3 %W | **0.9 – 1.6** | 4.77 – 8.14 ✗ | 0.63 – 0.90 ✗ (low) | 1.58 – 1.76 ✗ (high, 1/3 in) |
| ≥2 enemies at ≥5 %W | **≤ 25 %** | 65.9 – 97.2 ✗ | **11.4 – 16.9 ✓** | 30.4 – 36.7 ✗ |
| share below 10 %W | **≥ 65 %** | 65.4 – 83.5 ✓ | **79.0 – 87.4 ✓** | 70.5 – 73.5 ✓ |
| emission /s | **0.4 – 1.0** | 2.71 – 3.34 ✗ | **0.567 – 0.700 ✓** | **0.578 – 0.647 ✓** |

> **Five of six pass on the pilot whose kill rate matches the arcade's. One of six passed before,
> on every arm.** The sixth — mean on screen — is **0.63–0.90 against a 0.9 floor**: short by
> 0.2–0.27 of an aircraft, in the direction of *too empty*, and the attract autopilot straddles it
> from the other side at 1.58–1.76. The arcade is bracketed; no single pilot is inside.

### 7.1 Why the last row misses, measured rather than argued — and it is not the spawner

Little's law on our own telemetry, residence **above the 3 %W drawn floor**:

| | residence ≥3 %W | kills/s | missile share of kills |
|---|---|---|---|
| `idle` — nothing is ever killed | **3.05 – 3.16 s** | 0.00 | — |
| `arcstill` / `arctrk` — arcade kill rate | **0.99 – 1.31 s** | 0.46 – 0.57 | **47 – 77 %** |
| `still` / `trk` — 0.4 s missile cadence | 0.70 – 1.16 s | 0.49 – 0.60 | **70 – 81 %** |
| the arcade (L/λ, and the feel critic's independent span-to-depth geometry) | **1.7 – 3.3 s** | 0.42 – 0.54 | — |

**Our unkilled residence already matches the arcade's** (3.1 s against ~3.3 s), which independently
confirms criteria-r9's point 2 from the other direction: the size-vs-depth geometry is right and
must not be touched. What does not match is that **at the arcade's kill rate our aircraft spend a
third as long visible**, and the kill mix says where to look: **the missile is 47–77 % of all
kills and has no span gate at all.** Lock radius is 22 %W around the sight, so it reaches traffic
the gun is forbidden to touch and removes it before it is ever countable.

**So the mean-on-screen row cannot be closed from `spawner.js`.** Raising emission to refill it
would immediately break the three rows that now pass. The second lever is the missile economy —
which is already R8 judge **gap 4**: `flow.js:378` restocks `MISSILE_START_STOCK = 50` at **every**
stage boundary against GAME_SPEC §5's MEASURED "fill to 70 at two specific points". That is not my
file and I have not touched it.

### 7.2 One caution on the arcade column itself, offered to the criteria lane

The chain "the arcade kills 65–100 % of what arrives" rests on its **HIT counter**. In AB2 the HIT
counter also increments for **ground targets**, and my own stage-10 frames show it stepping while
large ground explosions are on screen (`s10-t431`→`t456`, HIT 0→5, with ground detonations in
four of the six). If any part of that rate is tanks and ships, the arcade's *aircraft* kill rate
is **lower** than 0.42–0.54/s, its residence is correspondingly **longer**, and §7.1's gap is
partly an artefact of our own denominator. I have not resolved it — separating air kills from
ground kills needs a frame-by-frame pass keyed to each HIT increment — and I am flagging it rather
than quietly building on it, because it is the same class of error (a rate quoted over a
population nobody checked) this whole round exists to correct.

### 7.3 Provenance, per ledger rows 32 and 38

- **URLs.** Every arm is `http://127.0.0.1:<port>/?fixed=1&seed=N[&invincible=1][&demo=1][&pace=…]`
  and the probe records the full URL string in each arm's `url` field of the JSON. `?demo=1` is
  present on the `demo` arms only; `?invincible=1` on all population arms and on none of the
  fairness arms. **No tick index in this report is quoted without its URL**: the two figure ticks
  (1211, 2076) come from `tools/out/pacing-r9/occL-{before,after}-e173-A/capture-manifest.json`,
  which carries URL, tick and flow state per frame, and both read `state: flight, stageNumber: 1`.
- **Population asserted from the pixels, not the invocation.** `tools/assert_population.py` over
  the capture sets: `occ-before-e29-A` weapon 6/20, explosion 3/20, enemy fire 10/20;
  `occ-nocorr-e29-A` (the shipped build) 6/20, 1/20, 10/20; `?nocombat` collision control CLEAN;
  tool `--selftest` PASS. **The probe arms are telemetry, not frames, and I am not dressing them
  as pixel-asserted** — their independent evidence of a live population is the kill ledger drained
  in the same run (`lg_total`, 0.46–0.60 kills/s on the shooting arms, **exactly 0.00 on the
  `idle` control**, which is the instrument validating against a known input).

### 7.4 The emptiness number specifically, which is what you asked for

| | ours |
|---|---|
| committed `52edcc4`, 12 arms | **0.0 – 3.1 %** (your 0.18–0.19 % reproduced on the arms that match yours) |
| **shipped, `demo`** | **33.1 – 48.0 %** |
| **shipped, arcade-cadence pilots** | **59.0 – 67.9 %** |
| arcade | 39.7 % (63 frames) / 28.6 % (mine, 21 frames) |

Double digits on every arm, and the run-length form of it — which a percentage cannot show — is
the one I would put in the ledger beside it: **the longest the sky was empty in a 90 s run was
0.32 s before, and the median *continuously occupied* run was 86.5 s.** After, on the attract
path: empty runs median **3.4–5.1 s**, p90 **7.2–8.5 s**; occupied runs median **5.3–5.7 s**.
Your arcade span's "six consecutive frames, ten seconds, empty" now has an analogue on our side:
the tracking arms reach empty runs of **10.4–18.2 s**.

---

## 8. Stage 1 against stage 1 — the matched comparison criteria-r9 asked for

Their point stands and it was the right one to press: §7's `demo` column was a **stage-1-weighted
build** read against an **all-stage arcade mean**. So I binned our side by stage too.

**How**, because the quantity matters: the probe now accumulates the whole census per
`__flowState().stageNumber` — the digit the HUD **draws**, not `stageIndex` (the raw lap counter)
or `contentStageIndex` (which of three palettes renders). The arcade side is a count on frames
whose **stage digit was read**; binning ours on anything else would match the two sides on
nothing. `tools/out/pacing-r9/stage1-{before,after}.json`, 6 seeds × 45 s per pilot = **192 s of
stage-1 flight per arm**, drawn-span bins throughout.

**The arcade's stage-1 column, pooled across both readers** (and the two agree on emptiness
*exactly* — 3/9 and 2/6 — and on mean-on-screen to 0.06):

| | n | readable ≥10 %W | empty (no enemy ≥3 %W) | mean on screen ≥3 %W |
|---|---|---|---|---|
| 63-frame set, stage 1 | 9 | 44.4 % | 33.3 % | 1.44 |
| this lane, stage 1 | 6 | 33.3 % | 33.3 % | 1.50 |
| **pooled** | **15** | **40.0 %** | **33.3 %** | **1.47** |
| 95 % Wilson on the pooled proportion | | **19.8 – 64.3 %** | **15.2 – 58.3 %** | |

**Ours, stage 1 only:**

| arm | kills/s | readable ≥10 %W | empty | mean on screen ≥3 %W | empty-run p50 / max |
|---|---|---|---|---|---|
| BEFORE `demo` | 0.6 – 0.7 | 82.1 % (71.6–87.8) | **0.8 %** (0.1–1.8) | 7.06 | 0.0–0.5 s / 0.5 s |
| BEFORE `arcstill` | — | 51.2 % | 2.1 % | 4.41 | 0.2–0.9 s / 0.9 s |
| BEFORE `arctrk` | — | 39.6 % | 2.2 % | 4.02 | 0.2–0.5 s / 0.9 s |
| **AFTER `demo`** | 0.12–0.18 | **30.5 %** (18.5–42.7) | **40.0 %** (26.7–56.1) | **1.60** (1.19–2.12) | 1.1–7.5 s / 8.9 s |
| AFTER `arcstill` | 0.46–0.57 | 15.2 % | 63.1 % | 0.80 | 2.6–8.7 s / 9.7 s |
| AFTER `arctrk` | 0.50–0.57 | 10.4 % | 67.5 % | 0.64 | 2.9–8.3 s / 10.2 s |

> **On stage 1 against stage 1, the attract path lands inside the arcade's own 95 % interval on
> both proportions and within 0.13 of an aircraft on the count: readable 30.5 % against 40.0 %
> (band 19.8–64.3), empty 40.0 % against 33.3 % (band 15.2–58.3), on screen 1.60 against 1.47.**
> Before: 82.1 %, 0.8 %, 7.06.

**Read it with the caveat attached rather than as a pass.** The arcade's stage-1 span is an expert
at **0.44 kills/s** (HIT 0→11 over ~25 s); our `demo` is at **0.12–0.18**. The two sides match on
the *frames* while differing 2.5–3.7× on the *pilot*, which is the §7.1 residence finding showing
up again on matched stages: at a matched kill rate our shooting arms fall to 0.64–0.80 on screen
and 63–68 % empty — **below** the arcade's stage 1 on population and **above** it on emptiness.
So the honest summary is **the supply is now right and the attrition is not**, and the attrition
lever is the missile economy, not this file.

**Also stated so it is not over-read**: pooled n = 15 is small, which is exactly why I quote
Wilson intervals and a pooled count rather than a point target. Per criteria-r9's own rule, I have
not split the difference between 33.3 % and 44.4 % and called the result a number.

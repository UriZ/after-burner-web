# Round 7 judge report — 8/10, HOLD, FAIL

**Judge**: R7, fresh context. Not a developer on any R7 lane.
**Commit measured**: `82365e99fcda921ed34ce2fd56ea1aab3dd7f7ab`. `git status --short -- src/ tools/`
was **empty when every measurement in this report was taken** — see the timing audit in §1.
**Date**: 2026-10-09. **I modified no file under `src/` or `tools/` and committed nothing.**

> **STATUS: COMPLETE.** All ten headline claims have a verdict. The only thing I deliberately
> did not attempt is the 109-observation arcade altitude hand count (§4, row 26), and §7 lists
> everything else I did not check so it is not read as checked. Every number below is mine,
> measured at `82365e9`, with its operator and population stated.

## 0. Verdict — **8/10. HOLD. FAIL.**

**Trend: 3 → 4 → 6 → 7 → 7.5 → 8 → 8 (held).**

R7 did real, verifiable work and I confirmed more of it than I expected to. **Five closures
reproduce on my own instruments**, several to the decimal: stage 3's night ground
(band V-identity 43.3 → **72.0 %** against the arcade's 72.85), stage 2's A2 residual, the
player airframe matching the arcade on **all three** VALUE-STAT readings, the nose sight at
**5 × 5 px / 12 ink px** — the arcade's figures exactly — and the explosion arm falling from
**218 to 21** channel values. Ledger row 29 (the arcade *does* flash the jet after respawn) is
the best piece of criteria work this project has produced and I reproduced its period to three
decimals from the footage. **The build now renders frames a player would accept as After
Burner II** (`judging/R7/r7judge-01-OURS-TOP-ARCADE-BOT.png`).

**I am not raising the score, and the reason is a single sentence: every closure I confirmed is
in the rendering, and everything a player meets in the first three minutes is in the playing,
and none of that moved.**

A player sitting down at this cabinet would, in order:

1. **Discover the game plays itself.** Holding the trigger with the stick centred scores
   **71.7 %** of what a two-axis tracking pilot scores and **5.35× the arcade's own measured
   kill rate** (0.420/s, which I re-read off the HIT counter on 4 of 4 spans). The vertical
   stick — the dimension R6 was celebrated for adding — is worth **+7.2 %**. §3.
2. **See "STAGE 1" again, 102 seconds in.** The HUD digit is `stageIndex % 3 + 1` and can never
   exceed 3. The arcade's counts **1, 2, 3, 4, … 6**, which I extracted and read off the
   longplay at HIT-verified stage spans (`r7judge-03`). §5.1.
3. **Find the throttle does nothing.** `scrollSpeed` has exactly one consumer — the ground
   mesh. No weapon, spawner, enemy or cloud reads it. §5.3.

And one defect that is nobody's regression but is new to the record: **Criterion A fails at
every stage boundary** — 336 of 12 000 consecutive ticks over the A2 gate, ~59 ticks at each
transition, caused by the tally overlay. Every Criterion A capture taken this round, theirs and
my own first set, was **shorter than one stage**, so none could see it. §2 claim 1b.

**What would earn 9**: gap 1 closed with a measured arcade comparison, gaps 2 and 3 closed
(both are hours of work), and the Criterion A gate re-run on a capture that crosses a stage
boundary.

**One process finding outranks any individual number in this report.** The headline claim —
"Criterion A passes in ordinary play with combat" — **is true, and the lane's evidence for it
did not support it.** Their captures contained no player weapon, no kill and no explosion,
because `?fixed=1` without `?demo` injects no input at all. That is ledger row 21's own defect
(a Criterion A figure quoted without its real population) **recurring inside the repair for
ledger row 21, in the same table, one round later** — and it was not caught by a lane that
spent the round enforcing exactly that rule on everyone else. §2 claim 1.

## 1. Baseline and provenance

**Commit measured**: `82365e9`. `src/` is **byte-identical** to
`5913af6` (the "R7 FINAL TREE" that REFERENCE and STATUS tell readers to quote) — `git diff
5913af6 HEAD -- src/` is empty. The only difference is three capture tools. So a render
measured here is the render R7 shipped.

### Timing audit — the tree drifted under me at 17:01, after my measurements

`src/` and `tools/` were clean when I started and through all of my capture work. **At 17:01:22
another agent began editing the tree** (`enemySprite.js`, then `spriteFactory.js` and the sprite
PNGs at 17:11, `tools/art/palettes.js` at 17:20) — R8 work starting while I wrote up. HEAD is
still `82365e9`; the drift is uncommitted.

| | time |
|---|---|
| **all my pixel captures** (Criterion A, every isolation arm, the long stage runs, the jet mask, the sight, the explosion dumps) | **16:13 – 16:59** |
| first `src/` edit by another agent | **17:01:22** |
| my `alt2` altitude probe | 17:20 |
| my `flow` 7-seed probe | 17:22 |

**Every pixel measurement in this report predates the first edit.** The two probes that ran
after it measure quantities that do not depend on the edited files: `__flowState().jetNdcY` is
the **authored sprite anchor** projected (`game.js` says so in as many words: *"Deliberately NOT
a bounding-box centroid … immune to the sprite-aspect defect"*), and flight share / deaths come
from the flow state machine. **Both reproduce the lane's committed-tree figures exactly** —
70.70 % ± 1.78, 2.114 ± 0.122, and altitude quantiles to two decimals — which is the empirical
proof that the drift did not reach them. Nothing in this report is measured on a mixed tree.

**Provenance finding, and it is load-bearing for every pre-HEAD capture.** The commit at HEAD
(`82365e9`) fixes `capture.mjs`, `combat_probe.mjs` and `fairness_probe.mjs` to pin the Vite
server to `127.0.0.1` at both ends. Before it, the server took vite's default bind and the
client asked for `localhost`, which on macOS resolves `::1` first — **so a capture run could
silently attach to another agent's dev server on a neighbouring port.** R7 was built by five
lanes on one shared tree with servers up concurrently. Every R7 lane figure was captured with
the unpinned tool. That is not proof any of them is wrong; it is the reason I re-captured
everything below myself, on HEAD, rather than re-measuring their frames.

**Instrument validation, before anything was believed:**

| instrument | control | result |
|---|---|---|
| `tools/measure_criterion_ab.py --selftest` | 13 synthetic + both arcade natives | **PASS**, arcade exact 138/31/68.7/68.5 and 79/17/84.0/80.2 |
| `tools/measure_stage_identity.py --selftest` | glyph render, +1 px shift, sea-cap contamination, blank refusal, random ink | **PASS** |
| **my own Criterion A implementation** (written from REFERENCE's prose, scratchpad) | vs `measure_criterion_ab.py` on 36 frames | **agrees on every frame** |
| **my in-page per-tick probe** | vs `measure_criterion_ab.py` at 6 matched ticks | **exact match 6/6** (64/26, 64/27, 64/30, 69/30, 65/30, 71/30) |
| 3×3 block-uniformity | every frame I measured | max deviation **0** — the decimation is lossless |

**Hygiene sweep over my own 36-frame Criterion A set (6 directories):** 0 black frames,
**0 cross-directory duplicate hash groups**, 36/36 stage digit read **1** at Hamming 0.

### DEFECT FOUND IN THE SWEEP ITSELF — the published stage-digit test cannot fire

REFERENCE.md publishes the stage-attribution operator as *"`mean(RGB) > 170` over native
`y[200,207) x[184,192)`, a bar-shaped glyph for 1"*, and the criteria lane cites that operator
for its "stage digit read 1 on every frame". **It returns FALSE on 36 of 36 genuinely stage-1
frames I captured** (box mean 99.8–135.9). Two independent reasons, either alone fatal:

1. **The ink is cream `#f7f794`** (`hud.js` `CREAM`), mean RGB **214** — and the glyph is a
   3-px-wide "1" inside a 7×8 box, so the box mean is dominated by whatever sky is behind it.
   The same digit reads 135.9 over bright sea and 101.4 over dark sea. The operator is a
   function of the background, not of the digit.
2. **The box is in the wrong place.** `hud.js` `M_STAGE_DIGIT` is `cx 187, y 200` drawn
   centred on the ink; the brightest 8×7 block is at `y 199, x 190`.

`tools/measure_stage_identity.py` **already documents this exact failure** in its own header
("A brightness threshold does NOT work here and the first version of this reader failed on
every stage-1 frame because of it") and does an exact-ink Hamming match instead. So the repo
holds two stage-identity operators, one of which cannot work, and **REFERENCE publishes the
broken one**. Ranked as a Round 8 gap; see §6.

Evidence: `/private/.../scratchpad/digit-crop-8x.png` (the crop, looked at), and
`tools/out/judge-r7/critA-play-*`.

## 2. R7 headline claims — verify or refute

### Claim 1 — "Criterion A now passes in ordinary play with combat": **CONFIRMED, on evidence
the lane did not have.** Their population was wrong; the conclusion survives it anyway.

**Their evidence does not support their claim.** The lane's 12 frames and the lead's are
`?fixed=1&seed=1&invincible=1`. Under `?fixed=1` with no `?demo`, **no input is injected at
all** — `main.js` installs an override only for `?demo=1` or an explicit `__setStick`. I read
the simulation's own counters over **900 consecutive ticks** of that exact URL:

| counter | over 900 ticks (15.0 s) of the lane's own capture URL |
|---|---|
| `vulcanRounds` | **0, every tick** |
| `missilesInFlight` / `missileStock` | **0 / 50 unchanged — not one missile launched** |
| `hits` | **0, every tick** |
| `enemyShots` in air | 0 → 15 |
| `alive` | 1 → 14 |

So "ordinary play with combat" contained enemies and enemy fire and **no player weapon, no
kill, no explosion, no missile trail**. The one isolation arm REFERENCE records as failing
(`?combatexpl=1`, 218) is precisely the content excluded. **This is ledger row 21's own defect
— a Criterion A figure quoted without its true population — recurring inside the repair for
ledger row 21, one round later, in the same table.**

**So I measured the population they claimed.** `?demo=1` is the real two-regime attract flight
that `demoTimeline.js` calls *"what every judge captures, make it representative"*, and it
**does** hold the trigger and launch missiles. Criterion A computed **on every one of 3 600
consecutive ticks**, 3 seeds × 1 200 ticks (20.0 s each), in-page probe validated against
`measure_criterion_ab.py` at 6 matched ticks (exact match 6/6):

| seed | kills in the window | missiles fired | A1 min/med/max | A2 min/med/max | over A1 | **over A2** |
|---|---|---|---|---|---|---|
| 1 | 22 | 11 | 47 / 67 / 84 | 19 / 30 / **32** | 0/1200 | **0/1200** |
| 2 | 18 | 9 | 47 / 67 / 85 | 19 / 30 / **32** | 0/1200 | **0/1200** |
| 3 | 15 | 6 | 47 / 65 / 81 | 19 / 29 / 31 | 0/1200 | **0/1200** |
| **pooled** | **55 kills** | **26** | **47–85** | **19–32** | **0 / 3 600** | **0 / 3 600** |

**0 of 3 600 consecutive frames over either gate, with 55 kills and their fireballs in the
window.** The A2 maxima of exactly 32 land **on the kill ticks** (seed 1's 14 ticks at A2 = 32
are 0–5 ticks after a kill). The gate is touched and never crossed.

**And the fireball is not passing by being too small to count.** Largest warm component
(`R>100 ∧ R>B+60`, the lane's own arcade operator, **HUD blanked first**):

| | px | bbox | %W × %H |
|---|---|---|---|
| ours, single kill (tick 288) | 381 | 28 × 27 | 8.8 × 12.1 |
| **ours, 6-kill cluster (tick 542)** | **5 703** | 111 × 94 | **34.7 × 42.0** |
| arcade night native, published | 809 | 107 × 41 | 33.4 × 18.3 |

Our multi-kill fireball **matches the arcade's width and carries 7× its warm-pixel count**, and
Criterion A still reads 32. Crop looked at (`scratchpad/warmmask-3x.png`): the mask is the
fireball, and the frame reads as After Burner II.

**Verdict: the claim is TRUE and better than its own evidence. The lane's method for it was
unsound and nobody caught it.** Ranked in §6 as a process gap, not an art gap.

### …but Criterion A **fails at every stage boundary**, and no capture method used this round could see it

Every Criterion A capture in R7 — theirs and my own first set — is **shorter than one stage**.
Four frames at 211-tick spacing is 844 ticks = 14.1 s against a 32 s stage. So nothing anybody
captured crossed a stage transition.

**12 000 consecutive ticks (200.0 s), `?fixed=1&seed=1&invincible=1`, Criterion A on every
tick**, reaching stage index 6:

| stage index | HUD digit | n ticks | A2 min/med/max | **ticks over the gate** |
|---|---|---|---|---|
| 0 | 1 | 1 920 | 25 / 30 / 30 | **0** (run starts here) |
| 1 | 2 | 1 921 | 28 / 29 / **36** | **59** |
| 2 | 3 | 2 161 | 24 / 25 / **33** | **59** |
| 3 | 1 | 2 401 | 25 / 30 / **37** | **59** |
| 4 | 2 | 720 | 28 / 29 / **36** | **59** |
| 5 | 3 | 2 641 | 25 / 25 / **33** | **41** |
| 6 | 1 | 236 | 27 / 29 / **35** | **59** |
| **whole run** | | **12 000** | **24 / 29 / 37** | **336 = 2.80 %** |

**A1 never exceeds 95 against its 256 gate — this is an A2-only failure.**

**The cause is the stage-end tally card**, and the regularity is the proof: **59 ticks over the
gate at six of seven stage transitions.** `flow.js:_startTally` sets
`duration = max(1, hits / 7)`, and with the no-input pilot `hits = 0`, so the card holds for
exactly **1 s = 60 ticks**. The flow state stays `flight` throughout (the card plays out over
continuing flight, by design), so **no state-based filter excludes it and no sparse capture
lands on it.**

I cropped and looked at three of them across all three stages
(`judging/R7/r7judge-02-TALLY-FRAMES-OVER-GATE.png`): the card's `HIT COUNTS` / `POINTS` text
is drawn in a red/cyan/pink keylined palette that is not on the quantized ladder the rest of
the frame was brought onto. **The whole-frame gate was closed on everything except the one
overlay nobody captured.**

#### Claim 1a — my own sparse replication, for the record

36 frames, **six** tick spacings (97/137/211 + my own 59/173/311), `?fixed=1&seed=1&invincible=1`
(so, the lane's population): A1 **60/66/71**, A2 **25/30/30**, **0 of 36 over either gate**;
0 black, **0 cross-directory duplicate hash groups**, 36/36 stage digit **1** at Hamming 0,
3×3 block deviation 0. My own instrument and `measure_criterion_ab.py` **agree on every frame**.
The lane's "worst 30 / 70" reproduces exactly (mine: worst 30 / 71).

#### Claim 1b — the arms, re-measured at HEAD. Two of REFERENCE's published arm figures are stale, and one arm is still over the gate

5 frames × 3 spacings (29/71/113) each, so no arm is measured at one spacing:

| arm | REFERENCE (at `e8fed58`) | **mine at HEAD** | |
|---|---|---|---|
| `?nocombat=1` | 21 | **19 / 19 / 19** | ✓ |
| `?combatonly=enemies` | 27 / 30 / 30 | **25 / 26 / 28** | ✓ |
| `?combatonly=enemies,shots` | 44 / 54 / **70** ✗ | **25 / 28 / 47** | **✗ still over, 1 of 15** |
| `?combatexpl=1` | 21 / 218 / 227 ✗ | **19 / 19 / 21** | ✓ **closed — 218 is stale** |
| `?combattrail=1` | — | 19 / 19 / 19 | **see warning below** |

- **`?combatexpl=1` is genuinely closed.** The fx lane's "the continuous-tone class, closed on
  every arm" is CONFIRMED for this arm; REFERENCE's 218 should be struck.
- **`?combattrail=1` is a null arm and must not be quoted.** All **15 of 15** of my trail
  frames are **byte-identical** to the `?nocombat=1` frame at the same spacing and index
  (md5 over the decimated native). The arm renders **nothing**, because under `?fixed=1`
  **nothing presses the missile button** — the same no-input defect as claim 1. Any
  missile-trail figure ever taken through this arm measured an empty sky. It needs
  `window.__setStick({missile:true})` or a demo pilot to mean anything.
- **`?combatonly=enemies,shots` still breaks A2, at 47.** Frame `arm-enshots-113/frame-0003`.
  I mapped the 29 non-baseline channel values to pixels and cropped at 7×
  (`scratchpad/enemy-extra-7x.png`): **they are a single near-field enemy airframe**, 28
  distinct colours in its own box. It is flat pixel art, but its palette is not on the shared
  ladder.

  **The connection that matters**: that arm has no vulcan, so enemies survive to large span. In
  ordinary play they do not — see §3. **Part of why Criterion A passes in play is that the gun
  deletes enemies before they reach the size at which they break it.** A gate passing because
  of a gameplay defect is not a gate that has been met.

### Claims 2–10 — summary

| # | Claim | Their number | **My number** | Status |
|---|---|---|---|---|
| 1 | Criterion A passes in ordinary play with combat | worst 30 chan / 70 col | **0 of 3 600 consecutive ticks over, with 55 kills on screen** | **CONFIRMED; their evidence REFUTED** |
| 1b | — but it fails at **every stage boundary** | not reported | **336 of 12 000 consecutive ticks (2.80 %) over A2, max 37; ~59 ticks at every single stage transition** | **NEW FAILURE, reproducible** |
| 2 | Stage-3 band V-identity 72.0 % | 72.0 (arcade 72.85) | **71.68 / 72.04 / 72.34** medians at 3 spacings; min **67.91**, max **73.47** | **CONFIRMED to the decimal** |
| 3 | Stage-3 background-only V 91.2 % | 91.2 (arcade 93.92) | **90.79 / 91.33 / 91.60** medians; min **85.86**, max **92.23** | **CONFIRMED to the decimal** |
| 4 | Stage-2 Criterion A2 residual closed in `sky.js` | ladder snap | stage-2 `?nocombat=1` A2 **21 / 22 / 27** (was median 33 at `e8fed58`) | **CONFIRMED** |
| 5 | Player airframe value 0.839 / 1.000 / 0.969 | matches arcade | **0.839 / 1.000 / 0.969** — hand-computed, exact | **CONFIRMED** |
| 6 | Arcade daylight jet has no black outline | rim 49.5 % `#840000`, **0.0 % near-black** | near-black rim **0.00 %** on every rim definition I tried | **CONFIRMED (see caveat)** |
| 7 | Player altitude spread 8.22 | arcade 7.73 | **8.32** on their exact arm; min/p5/p50/p95/max **35.16 / 38.65 / 57.62 / 62.70 / 65.21** vs their 35.2 / 38.7 / 57.9 / 62.8 / 65.2 | **CONFIRMED** |
| 8 | Flight share 70.70 % | band 69.4–73.5 | **70.70 % ± 1.78** — exact, 7 seeds | **CONFIRMED** |
| 9 | Deaths/min **2.114** vs ≤2.0 | self-reported MISS | **2.114 ± 0.122** — exact, 7 seeds | **CONFIRMED: the MISS is real and correctly reported** |
| 10 | Nose sight 1.60 %W | target 1.4–1.8 %W | **5 × 5 native px = 1.562 %W, 12 ink px** — the arcade's 5×5 and 12 exactly | **CONFIRMED on the rendered pixels** |

#### Claim 5, verified and with the margin stated

Jet-on / jet-off difference mask on a live `?nocombat=1&noclouds=1` frame: **1 513 px, span 116
native px = 36.25 %W** (the lane's span exactly), **10 colours**. Three VALUE-STAT readings,
computed by hand from the palette census and cross-checked against
`tools/measure_value_stats.py` (which passes its own selftest):

| reading | operator | n | **ours** | arcade native |
|---|---|---|---|---|
| **A** | `S<0.25`, **V = 0 kept** | 836 | **0.839** | 0.839 |
| **B** | `S<0.25`, `V>0` | 678 | **1.000** | 1.000 |
| **C** | V-CENSUS `S<0.35 ∧ V>0.08` | 961 | **0.969** | 0.969 |

**All three match the arcade exactly.** Black share of reading A's mask: **18.9 %** (arcade
22.2 %).

> **The margin is thinner than the match looks, and nobody said so.** Reading A is a step
> function: the sprite lane's own sweep puts the median on 0.839 only while black sits between
> **6.5 % and 21.5 %** of the mask, dropping to 0.643 above and jumping to 1.000 below. Ours is
> at **18.9 % — 2.6 points from the upper step.** The figure is right; it is not robust, and
> any future change to the keyline's area can flip it a full rung without anyone touching the
> palette. **Publish the black share beside the reading.**

> **A tool wart found doing this**: `measure_value_stats.py --isolate largest` defaults to
> `V_MIN = 0.3`, which deletes the V = 0 pixels — exactly what reading A exists to count. Run
> that way the day jet reads **1.000**, not 0.839. The `--v-min` flag gates the isolation mask
> only, not the achromatic census, so reading B cannot be produced by the flag either. The tool
> is not wrong, but its defaults answer a different question than REFERENCE's published
> operator, and that is how a 0.16 difference travels.

#### Claim 6, confirmed — with the rim operator flagged as under-specified

Airframe = `S < 0.35`, largest 8-connected component, in REFERENCE's published box
`ab2-arcade-desert.png x[85,182) y[82,140)`: **751 px exactly**, with the lane's tone shares to
the decimal (`#ffffef` 31.8 %, `#f7e6b5` 23.7 %, `#000000` 18.0 %, `#a48484` 12.8 %,
`#d6d6a4` 7.5 %, `#ceb59c` 5.5 %).

| rim statistic | lane / criteria lane | **mine** |
|---|---|---|
| rim n | 444 / 445 | **624** |
| `#840000` share | 49.5 / 49.4 % | **35.6 %** |
| **near-black share** | **0.0 %** | **0.00 %** |

**The load-bearing half is robust: 0.0 % near-black, on both rim definitions.** The arcade's
daylight jet genuinely has no black outline, and **our shipped jet now matches** — same
operator on our diff mask gives `#840000` **75.9 %**, near-black **0.0 %**. But the rim
operator does not state its connectivity or its mask, and the headline percentage moves **14
points** between two defensible readings. Same family as rows 20 and 22; worth a line in the
ledger rather than a new row.

> **Operator trap I fell into and am recording.** The lane's report states the airframe operator
> as "`S < 0.35` + largest 8-connected component, 751 px" **without its box**. Run that way on
> the whole frame, the largest achromatic component is **a cloud** (772 px at x[240,266]), not
> the aircraft. The box is published in REFERENCE but not in the lane report, and the two must
> travel together.

#### Claim 7 — CONFIRMED on their exact arm, and I nearly published a false refutation getting there

Matched re-run: `?fixed=1&seed=1&demo=1&invincible=1`, **38 190 flight ticks over 40 regime
cycles**, sampled on **every tick** (so no interval can alias the 16.000 s cycle):

| | min | p5 | p50 | p95 | max | **sd** | top third |
|---|---|---|---|---|---|---|---|
| **their R7** | 35.2 | 38.7 | 57.9 | 62.8 | 65.2 | **8.22** | 0.00 % |
| **mine** | **35.16** | **38.65** | **57.62** | **62.70** | **65.21** | **8.32** | **0.000 %** |
| arcade, 109 hand obs | 27.0 | 36.4 | 50.0 | 62.0 | 67.0 | 7.73 | 0.92 % |

**Reproduces on every quantile.** Their cruise-only tuning figure reproduces too: they report
sd **8.16**, I measure **8.18**.

> ### The operator trap that nearly cost me the finding — and it will catch the next judge
>
> My first run used **`__fairness().playerNdc.y`**. It is a plausible choice: it is the
> player's NDC position, exposed on a measurement hook, with no warning on it. It is **wrong
> for any screen-space statistic**, because `combat.js` computes it via `space.worldToNdc` in
> the **pitch-only basis that rotates with the world roll**, while the jet is roll-compensated
> to hold screen station. The right field is **`__flowState().jetNdcY`**, the sprite centre
> projected through the **actual** camera (`game.js:_playerNdc`).
>
> **Same run, same seed, same 38 190 ticks — only the field differs:**
>
> | field | min | p5 | p50 | p95 | max | **sd** | **top third** |
> |---|---|---|---|---|---|---|---|
> | `__flowState().jetNdcY` — correct | 35.16 | 38.65 | 57.62 | 62.70 | 65.21 | **8.32** | **0.000 %** |
> | `__fairness().playerNdc.y` — pitch-only basis | 18.21 | 29.68 | 51.80 | 61.91 | 67.10 | **11.18** | **9.82 %** |
>
> The wrong field inflates sd by **34 %** and reports a **9.82 %** top-third share — *the exact
> statistic ledger row 26 turns on* — where the truth is **0**. I had it written up as a
> refutation of the lane before I checked which quantity I was holding. **Nothing about either
> field's name or its hook's documentation distinguishes them.** This is ledger row 27's family
> (a bare "%H" that names no frame of reference) one axis along: not centroid-vs-bbox, but
> **screen basis vs pitch-only basis**. **Owed: a one-line warning on `__fairness().playerNdc`
> saying it is not a screen position, and a ledger row.**

#### Claims 8 and 9 — CONFIRMED exactly, including the standard error

7 seeds × 300 s, `?fixed=1&demo=1` (mortal), state read every tick from `__flowState()`:

| | lane | **mine** |
|---|---|---|
| flight share | 70.70 % | **70.70 % ± 1.78** — **in the 69.4–73.5 band** |
| deaths/min, wall | 2.114 ± 0.122 | **2.114 ± 0.122** — **MISS against ≤2.0** |

**Identical to three decimals, standard error included.** The flow lane's headline is sound and
its self-reported miss is honest and correct. Shipping a gate as MISSED with its mechanism
published, rather than recovering 0.114 by making the game easier, is the right call and the
behaviour this loop should reward.

> **One caution to carry forward.** Per-seed flight share ranges **63.89 – 75.58 %** while the
> ACCEPT band is only 69.4–73.5 % wide. **Seed spread is wider than the band.** The 7-seed mean
> is the minimum defensible sample here and **no single-seed flight-share figure should ever be
> quoted** — three of my seven seeds sit outside the band on their own.

> **One internal inconsistency in their own report that a future judge should settle.** The
> lane writes: *"neither hand count sampled a canyon stage, so the 109 observations are a cruise
> population … Mixing them would produce a number that means nothing. A judge reading
> composition or altitude off `?demo=1` must split by regime."* Its **tuning table is
> cruise-only** (sd 8.16 at the chosen amplitudes) — but the **headline row and the ACCEPT
> criterion written into ledger row 26** (`sd within ~1.0 of 7.73`) are on the **mixed**
> cruise+canyon distribution (sd 8.22). By the lane's own stated rule, the number it published
> as the comparison is the one it says means nothing. The two happen to be close (8.22 vs 8.16),
> so nothing is likely to be wrong — **but the gate should name the regime, or it will be met on
> the wrong population next round.**

## 3. The live unfixed defect — "the gun plays the game": **CONFIRMED. This is the #1 gap for R8.**

I did not use the feel critic's probe (it was never committed). I wrote my own pilot harness and
**validated it on a planted fault first**: a second, separately-constructed neutral policy must
reproduce the neutral arm exactly (it does, 45 = 45 kills), and the stick must have an effect
(55 ≠ 45). I also found and fixed a defect in my own first metric — `combat.hits` **resets to 0
at every stage boundary** (`flow.js:322`), so kills must be accumulated as positive deltas, not
last-minus-first. My first run reported 0.372 kills/s for a pilot actually scoring 2.23.

**Four pilots, identical except which stick axes are live. All four hold the trigger.
4 seeds × 180 s each, `?fixed=1&invincible=1`, flight share 1.000 in every arm.**

| pilot | stick | kills, 4 seeds | **kills/s** | vs doing nothing | **% of a tracking pilot** |
|---|---|---|---|---|---|
| `still` | **nothing at all** | 402 422 381 412 | **2.246** ± 0.097 | — | **71.7 %** |
| `vert` | vertical only | 439 455 468 453 | 2.521 ± 0.066 | **+12.2 %** | 80.5 % |
| `lat` | lateral only | 519 520 530 535 | 2.922 ± 0.043 | +30.1 % | 93.3 % |
| `trk` | both axes | 545 572 561 578 | **3.133** ± 0.081 | +39.5 % | 100 % |

> **A pilot who never touches the stick scores 71.7 % of a two-axis tracking pilot.**
> The vertical stick is worth **+12.2 %** alone and **+7.2 %** on top of lateral tracking.

**Read this against §2 claim 7, because the two findings are one finding.** R7's flow lane
genuinely gave the player a vertical dimension and I confirmed it: the envelope now reaches
**27.02 %H** — the arcade's own extreme — and the altitude spread is **8.32** against the
arcade's 7.73. **The player can now climb, and the gun has made climbing worth 7 %.** Opening
the envelope was the right move and it cannot pay off while the weapon supplies the aim the
envelope exists to let the player take.

**I get a less extreme number than the critic (71.7 % vs their 86.3 %) and the finding is the
same.** My tracking pilot is stronger than theirs (3.133 vs 3.229 kills/s on a different control
law and update rate), which is the only term that moved. **Direction, magnitude and mechanism
all reproduce.**

### The arcade anchor — independently re-read off the video

The critic's 0.420 kills/s comes from the HIT counter over ten `STAGE_MAP.md`-verified spans.
I re-extracted four of them with `ffmpeg -ss <t> -frames:v 1` and read the digits at 4×
(`scratchpad/hit-sheet.png`):

| span | their HIT start → end | **my reading** | kills/s |
|---|---|---|---|
| stage 1, t91 → t118 | 0 → 12 | **blank → 12** ✓ | 0.444 |
| stage 2, t127 → t154 | 1 → 12 | **1 → 12** ✓ | 0.407 |
| stage 4, t203 → t238 | 0 → 17 | **0 → 17** ✓ | 0.486 |
| stage 6, t263 → t302 | 0 → 26 | **0 → 26** ✓ | 0.667 |

**4 of 4 reproduce exactly.** So against the arcade's 0.420 kills/s:

| | kills/s | **× the arcade** |
|---|---|---|
| arcade, expert exhibition pilot | 0.420 | 1.0 |
| **ours, stick centred, trigger held** | **2.246** | **5.35×** |
| ours, two-axis tracking | 3.133 | **7.46×** |

### The mechanism, read from source rather than inferred

1. **The vertical aim is given away, not assisted.** `combat.js:_findAssistTarget` returns
   `{ ndcX: this.sight.x, ndcY: best.ndc.y, depth: best.d }` — **the round's vertical aim point
   becomes the enemy's own `ndcY` exactly.** Lateral aim is correctly left to the player
   (`ndcX` is the sight, not the target — the file says so, and that part is right). So for any
   target inside the cone, **vertical aim contributes nothing at all**; the gun supplies it.
2. **The cone.** `ASSIST_RADIUS_FRAC = 0.13` frame-widths with `dy` scaled by `0.5 · 224/320`,
   so the vertical half-height is `0.13 / 0.35 = 0.371 NDC` = **±18.57 points of H**. The
   critic's ±18.6 is arithmetically exact. Measured against the live enemy band (NDC y −0.694
   to +0.649 = 67 points of H), the cone covers **55 %** of the band — so "covers the entire
   enemy band" is an overstatement, but **38–52 % of all enemies inside the assist depth
   window sit in it** at any instant (28 149 / 73 845 for `still`; 23 744 / 45 958 for `trk`).
3. **`vulcan.resolveHits` has no reach cap, confirmed.** It tests every round against every
   enemy with `|e.d − r.depth| ≤ max(2.0, 0.12·r.depth)`, and an **unassisted** round ramps its
   depth from the player's to `DEFAULT_TARGET_DEPTH = 55` — far past the `6..22` window the
   assist itself is limited to. Nothing ties the round's reach to readable size.

### The consequence nobody has priced: **playing well empties the sky**

Per-enemy maximum on-screen span, tracked from spawn to removal, 4 seeds × 180 s:

| pilot | enemies removed | max span p50 | p90 | **share never reaching 10 %W** | **ticks with a readable (≥10 %W) enemy on screen** |
|---|---|---|---|---|---|
| `still` | 2 311 | 9.2 %W | 26.7 %W | 56.7 % | **72.7 %** |
| `trk` | 2 241 | 6.2 %W | 8.6 %W | **95.3 %** | **3.6 %** |

**A competent pilot deletes 95.3 % of all enemies before they ever reach readable size, and
spends 96.4 % of the game looking at an empty sky.** R6's gap about enemies at readable size is
not closed; it is *pilot-dependent, and it gets worse the better you play.*

**And this is why Criterion A passes in play.** The `?combatonly=enemies,shots` arm — same
build, no vulcan — lets enemies reach 36 %W and **breaks A2 at 47** (§2, claim 1b). In play the
gun erases them first. **A gate that passes because a gameplay defect removes its subject has
not been met.**

## 4. Criteria ledger audit

I re-derived the five rows the brief named. **Two hold, one holds on a corrected operator, one
is weaker than it reads, and one headline figure does not reproduce.**

### Row 29 — "no visible invincibility flash" is wrong: **CONFIRMED, exactly**

The strongest single piece of criteria work in R7. I re-derived it from the footage without
looking at their numbers first. `ab2-gameplay.mp4` is **30 fps** (0.0333 s sampling — adequate
against a claimed 0.10–0.13 s state), respawn at ~t276.5, operator = bright-and-desaturated
pixels (`max(RGB) > 150 ∧ S < 0.35`) in a centre box excluding both HUD strips:

| | their claim | **my measurement** |
|---|---|---|
| period | 0.267 s | **0.267 s** — OFF-state onsets at t277.200, 277.400, 277.667, 277.933, 278.200, 278.467, 278.733; successive gaps **0.267, 0.267, 0.267, 0.267, 0.267** |
| duration | 1.67 s | **~1.67 s** (t277.20 → steady at t278.87) |
| alternations | 8 clean on/off | **7 full OFF↔ON cycles then steady** |
| separation | ~2 000–2 900 ↔ 0–60, nothing between | ON **1 066–3 824**, OFF **7–64**, **nothing between** |

**GAME_SPEC's MEASURED-tagged "no visible invincibility flash in any of the 4 measured arcade
deaths" was wrong, and ledger row 29 corrects it on evidence I reproduce to three decimals.**
The derived rule — *state the sampling interval with any negative about a periodic behaviour* —
is sound and I would keep it.

### Row 24 — JET-SIL's `V ≥ 0.70`: **the ruling is right and REFERENCE's published operator is wrong**

Every colour in the row's table reproduces exactly on my own HSV:

| colour | role | hue | S | V |
|---|---|---|---|---|
| `#840000` | arcade **daylight** keyline | **0.0°** | 1.000 | **0.518** |
| `#425284` | arcade night keyline | 225.5° | 0.500 | 0.518 |
| `#e67300` `#f78400` `#f7b500` `#ff7500` | arcade glows | 30.0 / 32.1 / 44.0 / 27.5° | 1.000 | 0.902 / 0.969 / 0.969 / **1.000** |
| `#ef7308` `#ffd600` | ours | 27.8 / 50.4° | 0.967 / 1.000 | 0.937 / 1.000 |

Measured V ladder `[0.518, 0.902, 0.937, 0.969, 1.000]` — **a 0.384-wide empty gap with 0.182
below and 0.202 above the 0.70 floor.** The structural justification is real.

> **But the document contradicts itself within eight lines.** REFERENCE line 1546 publishes the
> nozzle mask as **"hue 5–55°"**; line 1554 then says `#840000` "is hue **0.0°** … it walks
> straight through `V ≥ 0.45`". **Hue 0.0° is not in 5–55°** — under the published operator that
> colour could never contaminate the mask at any V floor, and the entire row-24 justification
> would be void. It is only true because `tools/art/jetsil.py:112` actually tests
> **`(deg <= 55 or deg >= 355)`** — a wrap-around band that admits hue 0 — **and that wrap is
> published nowhere.** The implementation is right; the ground-truth document is wrong, on the
> operator the ruling turns on, in the row added this round to fix an operator-specification
> defect. **New ledger row owed.**

### The arcade-side Criterion A licence — **weaker than it reads, and its headline figure does not reproduce**

The licence argument is: *both native arcade frames are combat frames, one holds a 33.4 %W
fireball inside 17 channel values, therefore the gate is licensed against ordinary play
including explosion frames.* Three findings:

1. **The cardinality reproduces exactly.** Desert **138 / 31**, night **79 / 17**. No dispute.
2. **The 33.4 %W fireball figure does not reproduce from its published operator.** REFERENCE
   row 1 states "**107 × 41 native px = 33.4 %W × 18.3 %H (809 warm px)**, operator
   `R>100 ∧ R>B+60`". On that operator I get, on the same frame:

   | reading | warm px | bbox | %W × %H |
   |---|---|---|---|
   | whole frame | 2 201 | 306 × 208 | 95.6 × 92.9 |
   | HUD blanked | 1 229 | 284 × 171 | 88.8 × 76.3 |
   | HUD + below-horizon blanked | 955 | 227 × 108 | 70.9 × 48.2 |
   | **largest 8-connected component** | **658** | **50 × 30** | **15.6 × 13.4** |
   | **published** | **809** | **107 × 41** | **33.4 × 18.3** |

   The city lights alone contribute hundreds of warm pixels and the HUD text contributes
   hundreds more. **No box is published**, so the figure is unreproducible — in the round, and
   in the very table, where that lane made "state your provenance" binding. I cropped and
   looked at 6× (`scratchpad/night-blast-6x.png`): **a real fireball with a debris spray is
   there**, and 107 × 41 is *plausible* for blast-plus-spray with the jet and clouds excluded.
   I am calling this **UNREPRODUCIBLE, not refuted.**
3. **The licence does not license what it is used for, and this is the substantive point.**
   I blacked out **every warm pixel** in the night frame and re-measured: **A2 stays at 17.**

   > **The fireball costs the arcade exactly 0 channel values.** Its colours are a subset of
   > those already in the frame. "A 33 %W fireball costs the arcade nothing" is literally true
   > and **evidentially empty** — it demonstrates nothing about whether a fireball can be held
   > inside a channel-value budget, because in that frame it consumes none of it.

   And a night frame is the *cheapest possible case*: the background is `#000000`. The **one
   daylight native in combat already sits at 31 of 32** — one value of margin — **with no
   explosion in it.** The lane's own "left unresolved #1" concedes there is no true-native
   daylight explosion frame. **So the arcade has never been shown to hold a daylight explosion
   inside the gate, and daylight-with-explosions is exactly the population our build is scored
   in.** The licence is an argument, not the measurement it is presented as.

### Row 26 — "top third" is the wrong statistic for gap 5: **arithmetic CONFIRMED, substance UNVERIFIED**

`1/61 = 1.639 %`, `0/48 = 0 %`, pooled `1/109 = 0.917 %` — the arithmetic is exact and the
conclusion (do not tune a scripted path to a 1-in-109 event) is correct reasoning. **I did not
re-do the 109-observation hand count and have no opinion on the observations themselves.** The
restatement as spread (p5 within ~3 of 36.4 %H, sd within ~1.0 of 7.73) is a sound repair.

**One thing I did verify, and it supports them**: full-up stick reaches **27.02 %H** exactly
(player NDC y +0.4597; `(1−0.4597)/2 = 27.017 %H`), which the lane quotes as "the arcade's own
minimum". That number is right.

### Rows 27 and 28 — not independently re-derived

Row 27 (the `%H` unit mismatch, pixel centroid vs bbox centre) is a labelling repair with no
measurement to refute; the arithmetic `49.47 + 3.3 = 52.77` vs `52.80` checks out, and the
lane's own caveat that "the conversion is doing all the work" is the right way to publish it.
Row 28 (flight time is not invariant to death-cycle length) was settled by a controlled
three-arm isolation; I did not re-run it. **Both recorded as ACCEPTED-AS-REPORTED, not verified.**

## 5. The open leads — all four CONFIRMED, two of them worse than described

### 5.1 The stage digit never exceeds 3: **CONFIRMED, and a player sees it inside 70 seconds**

`flow.js:320` is `this.hudState.stage = this.contentStageIndex + 1`, and
`contentStageIndex = stageIndex % STAGES.length` with `STAGES.length = 3`. So the HUD digit can
only ever be 1, 2 or 3.

Measured, not inferred — 60 frames over a **211 s** run, digit read by exact-ink Hamming match
on every frame:

| t (s) | 3.5–31.6 | 35.2–63.3 | 66.8–98.5 | 102.0–137.2 | 140.7–151.2 | 154.7–193.4 | 196.9–211.0 |
|---|---|---|---|---|---|---|---|
| **HUD digit** | **1** | **2** | **3** | **1** | **2** | **3** | **1** |
| true arcade stage | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Distinct digits over the entire run: {1, 2, 3}.** At t ≈ 197 s the player is on **stage 7**
and the HUD reads **"1"**. The segment lengths independently confirm the structure is right —
32 / 32 / 35 / 39 / 14 / 39 s against `STAGE_DURATIONS_S` 32 / 32 / 36 / 40 / **12** / 44 — so
**the 23-stage structure laps at 23 and the digit laps at 3.** The two were separated
deliberately (the source comment says so) and only the content needed wrapping.

This is a one-line fix (`this.stageIndex + 1`, with `STAGE_DURATIONS_S.length = 23` wrapping)
and it is the most player-visible single defect I found all round.

**Related, smaller**: `?debugtally=1` draws `nextStage: this.stageIndex + 2` (unwrapped) while
the real tally path draws `contentStageIndex + 1` (wrapped) — so the debug card a lane captures
to verify card layout shows a number the real card never shows.

### 5.2 `REACH_CEILING_NDC_Y` rests on a lock radius that does not exist: **CONFIRMED, and R7 made it worse**

`spawner.js:142` is `REACH_CEILING_NDC_Y = 0.64`, derived in its own comment from:
*"the player's sight sits at playerNdcY + 0.30 and the measured player ndcY ceiling on this
build is **+0.106** … lockSystem.js's lock radius is **8.3 %W**, which is … ±0.237 in y."*

**Both inputs are dead.**

| input | the comment's value | **the shipped value** |
|---|---|---|
| lock radius | 8.3 %W | `LOCK_RADIUS_FRAC = 0.22` = **22 %W** |
| player NDC y ceiling | +0.106 | **+0.4597** (measured; full-up stick, settled) |

`lockSystem.js:33` even says *"The prototype's ADOPTED 80 px … = 8.3 %W; **widened to 15 %W**
after measurement"* — and then sets the constant to **0.22**, i.e. 22 %W, eight lines later.
**Three different values for one quantity in one file: 8.3, 15, and 22.** And `combat.js:53`
says the assist cone is *"Wider than the missile lock radius (8.3 %W)"* while
`ASSIST_RADIUS_FRAC = 0.13` is **narrower** than 0.22 — the comment is wrong in direction.

Re-deriving the ceiling with the shipped numbers: sight tops out at `0.4597 + 0.30 = 0.7597`;
lock reach in y is `0.22 / 0.35 = 0.6286`; **ceiling = 1.388**. NDC y only runs to 1.0, so
**every on-screen altitude is now engageable and the reachability argument no longer binds at
all.** The clamp is not a reachability bound any more; it is undocumented suppression of the
enemy altitude distribution.

**R7 made this strictly worse and the code told it not to.** `player.js` raised
`ENVELOPE_Y_UP` 1.1 → 1.55 this round (commit `2f10a3b`, the "the player can climb" headline),
and its own comment says *"`src/game/spawner.js` derives its own `REACH_CEILING_NDC_Y` from this
number and its comment says **in capitals** to re-derive when this moves"*. `spawner.js` has
**not been touched since R6** (`git log -1 -- src/game/spawner.js` → `0e01464`).

**Measured consequence**: over 39 943 enemy-position samples the maximum enemy NDC y is
**0.649** — the clamp — and **1 826 samples (4.6 %) sit pinned against it.** Enemies that the
`FAR_BAND` table would place as high as 2 %H are being held at 18 %H.

### 5.3 The throttle has no gameplay consequence: **CONFIRMED, exactly**

`THROTTLE_SCROLL_MULT = [0.62, 1.0, 1.45]`. Tracing every consumer of `flow.scrollSpeed`:

- `game.js:358` → `this.ground.update(dt, this.flow.scrollSpeed)` — **the only one.**
- **Nothing** in `weapons/`, `game/spawner.js`, `entities/enemy.js`, `entities/player.js` or
  `render/clouds.js` reads it.
- `render/clouds.js:417` — `const CLOUD_SPEED = 9.5; // world units/s, **independent of ground
  scrollSpeed**`.

So the throttle moves the ground, the HUD bar and an audio mix level, and changes **nothing**
the player can win or lose with. And the cue it does give is internally incoherent:

| detent | ground (world u/s) | clouds (world u/s) | **ground ÷ clouds** |
|---|---|---|---|
| L | 42.737 | 9.5 | **4.50×** |
| M | 68.93 | 9.5 | 7.26× |
| H | 99.949 | 9.5 | **10.52×** |

The ground runs **2.34×** faster at H than at L while the **nearer** layer does not change at
all — reproducing the lead's 2.34× and 4.5–10.5× to three significant figures. A nearer layer
that moves slower than a farther one, and then fails to respond to speed, is a parallax cue
pointing the wrong way.

### 5.4 Enemy rounds live far too long: **CONFIRMED from source; the arcade side is NOT verified**

`enemyShots.js`: `SPEED = 10` world depth units/s, retired at `PASS_DEPTH = 1.6`, fired from the
52..24 depth band. Time of flight is therefore **(52−1.6)/10 = 5.04 s down to (24−1.6)/10 =
2.24 s** — bracketing the lead's measured 2.90–3.05 s.

**Two things to flag rather than one.**

1. **The file's own worked example is one revision stale.** It reasons *"At 15 units/s a round
   from the 52..24 band is in the air 1.49–3.36 s"* while the constant above it is **10**. The
   header does say "10, down from 15, down from 24", so the figure is not hidden — but the
   paragraph a later agent will read for the lag budget is computed on a dead value.
2. **I did not verify the arcade's ≤0.37 s and it is in tension with this repo's own
   reference.** `reference/stage7-enemy-shot-train-t330.png` is cited in the same file as
   showing **10–16 simultaneous fireballs** at ~0.11 s emission spacing — which requires a
   lifetime of order **1.1–1.8 s**, not 0.37 s. One of those two arcade-side facts is wrong.
   **Do not tune to either until someone counts frames from a muzzle flash to its impact on the
   60 fps longplay**, which is the measurement the file itself names as outranking the whole
   sweep and which still has not been taken.

## 6. Ranked gap list for Round 8

Every gap below has a reproduction I ran at HEAD, and every one has been checked against the
arcade before being written.

---

### Gap 1 — **The gun plays the game.** The vertical aim is given away and the kill rate is 5× the arcade's

**Arcade check**: HIT counter over four `STAGE_MAP`-verified spans, re-read by me
(`scratchpad/hit-sheet.png`): **0.420 kills/s** for an expert exhibition pilot.
**Ours**: **2.246 kills/s** with the stick centred (**5.35×**), 3.133 tracking (**7.46×**).
A null stick scores **71.7 %** of a tracking pilot; the vertical stick is worth **+7.2 %** on
top of lateral.

**Mechanism (source, not inference)**: `combat.js:_findAssistTarget` returns the target's own
`ndcY` as the round's vertical aim point, so vertical aim is **supplied by the gun** for any
target in a **±18.57 %H** cone (`ASSIST_RADIUS_FRAC 0.13 ÷ 0.35`), which covers 55 % of the
live enemy band. `vulcan.resolveHits` has **no reach cap** — unassisted rounds sweep to
`DEFAULT_TARGET_DEPTH = 55`, far past the assist's own `6..22` window.

**The cost is not just lethality — it is the game's readability.** A tracking pilot kills
**95.3 %** of all enemies before they ever reach 10 %W and spends **96.4 %** of flight looking
at an empty sky (a null-stick pilot: 56.7 % and 27.3 %). **The better you play, the less of
After Burner II you see.**

**Reproduce**: four stick policies × 4 seeds × 180 s, trigger held, `?fixed=1&invincible=1`,
driving `window.__setStick`; accumulate `__combatStats().hits` as **positive deltas** (it
resets at every stage boundary — this cost me one wrong run). Validate on a planted fault: a
second identically-constructed neutral policy must reproduce the neutral arm exactly.

**Do not fix this by nerfing damage.** The defect is that one axis of aim is not the player's.

---

### Gap 2 — **The HUD stage digit never exceeds 3**; the arcade's counts to 23

**Arcade check**: digits extracted from `ab2-longplay.mp4` at HIT-verified stage spans read
**1, 2, 3, 4, 6** at t100/140/175/220/280 (`r7judge-03-ARCADE-STAGE-DIGIT-1-2-3-4-6.png`).
The arcade counter does not wrap.
**Ours**: `flow.js:320` → `hudState.stage = stageIndex % 3 + 1`. Measured over 211 s:
**1 → 2 → 3 → 1 → 2 → 3 → 1**, so at t ≈ 197 s the player is on stage 7 and the HUD reads "1".

`STAGE_DURATIONS_S` already holds all **23** measured durations and the structure laps
correctly at 23 — only the *display* was given the content wrap. One line.

**Reproduce**: `node tools/capture.mjs --out <dir> --frames 60 --every 211 --url-params
"&invincible=1"`, then `python3 tools/measure_stage_identity.py --dir <dir>`.

---

### Gap 3 — **Criterion A fails at every stage boundary**, and no R7 capture was long enough to see it

**336 of 12 000 consecutive ticks (2.80 %) over the A2 gate, max 37 against 32, ~59 ticks at
six of seven stage transitions** — exactly the 1 s tally-card duration
(`flow.js:_startTally`, `duration = max(1, hits/7)`). The flow state stays `flight` throughout,
so no state filter excludes it. A1 never exceeds 95 against its 256 gate: **A2 only.**

The cause is the tally card's red/cyan/pink keylined text palette, which was never brought onto
the ladder the rest of the frame was quantized to.

**Binding process change owed**: **a Criterion A figure must come from a capture that crosses a
stage boundary, or state that it does not.** Four frames at 211-tick spacing is 14.1 s against
a 32 s stage — the entire round's Criterion A evidence, mine included, was blind by
construction.

**Reproduce**: capture ≥60 frames at `--every 97` (or step every tick) and split by digit;
`tools/out/judge-r7/play-long-{97,137}` already contain three such frames.

---

### Gap 4 — **The throttle has no gameplay consequence, and the parallax cue it does give points the wrong way**

**Arcade check**: not re-derived this round — flagged as the measurement owed below.
**Ours, from source**: `flow.scrollSpeed` has exactly one consumer, `ground.update()`
(`game.js:358`). Nothing in `weapons/`, `spawner.js`, `enemy.js`, `player.js` reads it.
`clouds.js:417` is `CLOUD_SPEED = 9.5; // independent of ground scrollSpeed`.

| detent | ground u/s | clouds u/s | ground ÷ clouds |
|---|---|---|---|
| L | 42.737 | 9.5 | 4.50× |
| H | 99.949 | 9.5 | 10.52× |

The ground runs **2.34×** faster at H while the *nearer* layer does not move at all.

**Owed first**: whether the arcade's throttle closes range on enemies. Until that is measured,
fix only the incoherence (scale cloud drift with `scrollSpeed`), not the gameplay.

---

### Gap 5 — **`REACH_CEILING_NDC_Y` is derived from numbers that no longer exist, and R7 made it worse**

`spawner.js:142` clamps every enemy's screen altitude at **0.64 NDC**, derived in its comment
from a lock radius of **8.3 %W** and a player ceiling of **+0.106**.

| input | comment | **shipped** |
|---|---|---|
| lock radius | 8.3 %W | `LOCK_RADIUS_FRAC = 0.22` = **22 %W** |
| player NDC y ceiling | +0.106 | **+0.4597** (measured, settled, full-up stick) |

Re-derived with the shipped values the ceiling is **1.388** — past the top of the screen — so
**the reachability argument no longer binds at all** and the clamp is undocumented suppression.
Measured: enemy NDC y maxes at **0.649** with **4.6 % of 39 943 samples pinned against it**.

**R7 raised `ENVELOPE_Y_UP` 1.1 → 1.55** (`2f10a3b`) while `player.js`'s own comment says
`spawner.js` *"says in capitals to re-derive when this moves"*. `spawner.js` has not been
touched since R6.

Three values for one quantity live in the tree: `lockSystem.js:33` says the radius was
*"widened to 15 %W"* eight lines above setting it to **0.22**, and `combat.js:53` calls the
0.13 assist cone *"wider than the missile lock radius (8.3 %W)"* when it is **narrower** than
the real 0.22.

**Fix the constant and the three comments together, or this recurs.**

---

### Gap 6 — **Three of REFERENCE's published figures are stale or broken, and one would send a lane to fix something already fixed**

| # | published | **shipped / true** |
|---|---|---|
| a | stage-identity operator `mean(RGB) > 170` over `y[200,207) x[184,192)` | **returns FALSE on 36/36 genuine stage-1 frames.** Ink is cream `#f7f794` (mean 214) on a 3-px glyph, so the box mean tracks the sky (99.8–135.9); and the box is 6 px off. `tools/measure_stage_identity.py` documents this failure in its own header and does exact-ink Hamming matching instead — **two operators in the repo, and the document publishes the broken one** |
| b | our daylight airframe VALUE-STAT reading A = **0.643**, *"still missed, at 0.643 against 0.78–0.92"* (4 places) | **0.839** on the shipped tree — **inside the band**. Measured at `e8fed58` before the sprite lane's sheet landed in the same tree |
| c | `?combatexpl=1` = **218** channel values ✗ | **19 / 19 / 21** at HEAD — **closed** |

(b) is the dangerous one: it is this project's documented failure mode (*"the R5 judge recorded
the throttle as wired with no player control — a gap that did not exist — and the R6 flow lane
spent part of its round disproving it"*).

---

### Gap 7 — **The near-field enemy sprite still breaks Criterion A2**, and the gun is hiding it

`?combatonly=enemies,shots` at HEAD: **A2 = 47** on 1 of 15 frames, against ≤32. I mapped the
29 non-baseline channel values to pixels and cropped at 7× — **a single near-field enemy
airframe, 28 distinct colours in its own box**. It is flat pixel art; its palette is simply not
on the shared ladder.

**It does not show up in play because the gun deletes enemies before they get that big** (gap
1: 95.3 % never reach 10 %W). **Close gap 1 and this becomes a live whole-frame failure.** Fix
the enemy palette first, or gap 1's fix will appear to cause a regression it merely exposed.

---

### Gap 8 — **Measurements owed, in priority order**

1. **Enemy round time of flight on the arcade.** Ours is `SPEED = 10` from the 52..24 band =
   **2.24–5.04 s**. The repo holds two incompatible arcade claims: "≤0.37 s" (the lead) and
   `stage7-enemy-shot-train-t330.png`'s **10–16 simultaneous fireballs** at ~0.11 s spacing,
   which needs ~1.1–1.8 s. `enemyShots.js` names the measurement — *count frames from a muzzle
   flash to its impact on the 60 fps longplay* — and says it outranks the whole sweep. **Do not
   tune to either number until it is taken.** (`enemyShots.js`'s own worked example is also one
   revision stale: it reasons at 15 u/s while the constant is 10.)
2. **A true-native daylight arcade frame holding an explosion.** The Criterion A licence
   currently rests on a *night* frame in which the fireball costs **0** channel values, plus a
   daylight combat frame at **31 of 32** with no explosion in it. §4.
3. **The 809 px / 33.4 %W night fireball figure needs its box published**, or withdrawing. §4.
4. **`ab2-arcade-night-banking.png`'s stage attribution**: I confirmed it is stage 3 by a
   non-circular route (longplay digit sequence 1,2,3,4,6 against HIT-verified spans) — **record
   that route**, because the glyph table used to verify it was transcribed from that same frame.

---

### Gap 9 — **Operator specifications that moved a published number**

- **REFERENCE contradicts itself within eight lines on the JET-SIL hue band.** Line 1546
  publishes "hue 5–55°"; line 1554 argues from `#840000` at **hue 0.0°**. Only
  `jetsil.py:112`'s unpublished wrap-around `(deg <= 55 or deg >= 355)` makes the argument
  work. **The ruling is right; publish the operator it actually used.**
- **The arcade rim operator** states neither connectivity nor mask: `#840000` share reads
  **49.5 %** (theirs) or **35.6 %** (mine) depending on the reading. The conclusion
  (0.0 % near-black) is robust to both; the percentage is not.
- **The airframe operator travels without its box.** Run as stated in the lane report
  ("`S<0.35` + largest 8-connected component"), the largest component on the desert native is
  **a cloud**, not the aircraft. The box is in REFERENCE; they must travel together.
- **`measure_value_stats.py --isolate largest` defaults to `V_MIN = 0.3`**, deleting the V = 0
  pixels that reading A exists to count — run that way our jet reads **1.000**, not 0.839.
- **Reading A's margin is 2.6 points from a step discontinuity.** Publish the black share
  (ours 18.9 %, stable window 6.5–21.5 %) beside the reading.
- **Ledger row 26's ACCEPT criterion names no regime.** The lane's own text says mixing cruise
  and canyon "would produce a number that means nothing", its tuning table is cruise-only
  (sd 8.16), and the gate it wrote is on the mixed distribution (sd 8.22). Name the regime.

## 7. Evidence index

**Tree measured**: `82365e99fcda921ed34ce2fd56ea1aab3dd7f7ab`. `src/` and `tools/` were
**unmodified** throughout — verified at start and end with `git status --short -- src/ tools/`
(empty). All untracked paths are under `judging/R7/` (this report, my three evidence images,
and the concurrently-running art critic's files). **I committed nothing.**

### Captures (all under `tools/out/judge-r7/`, all mine, all at HEAD)

| directory | what | n |
|---|---|---|
| `critA-play-{59,97,137,173,211,311}` | Criterion A, ordinary play, **six** tick spacings | 36 |
| `arm-{nocombat,enemies,enshots,expl,trail}-{29,71,113}` | isolation arms, three spacings each | 75 |
| `nc-long-{97,137,211}` | `?nocombat=1`, 60 frames each, spans stages 1–3+ | 180 |
| `play-long-{97,137,211}` | ordinary play, 60 frames each, spans stages 1–7 | 180 |
| `split-s{1,2,3}` | the above split by **verified digit** (75 / 47 / 58) | 180 |
| `expl-dump` | frames at 11 kill ticks under `?demo=1` | 11 |
| `jet-on`, `jet-off` | the jet-on/off difference mask | 2 |
| `sight` | `?combatonly=sight` nose-sight isolation | 2 |
| `arcade-hit`, `arcade-flash`, `arcade-death`, `digit-check` | ffmpeg extractions from the cached video | 290 |

**Hygiene**: 0 black frames, **0 cross-directory duplicate hash groups**, 3×3 block deviation
**0** on every frame, stage digit read by exact-ink Hamming match on every frame quoted.

### Probes (scratchpad — not written into `tools/`, per the brief)

| probe | what it does | its control |
|---|---|---|
| `jcrit.py` | my own Criterion A + cross-set duplicate/black/digit sweep | agrees with `measure_criterion_ab.py` on **every** frame |
| `dense_critA.mjs` | Criterion A **in-page, every tick** | exact match vs `measure_criterion_ab.py` at 6 matched ticks |
| `pilot.mjs` | four stick policies, trigger held | **planted fault**: a second identically-built neutral policy reproduces the neutral arm exactly (45 = 45); stick has effect (55 ≠ 45) |
| `envelope.mjs` | player NDC reach at full stick; enemy altitude census | full-up reach **27.02 %H** reproduces the criteria lane's published figure |
| `flow.mjs` | flight share, deaths/min, 7 seeds × 300 s, mortal | **determinism control passed**: after I rewrote the probe to chunk its `page.evaluate` (the single-call form hit puppeteer's `protocolTimeout` under load and died after two seeds), seeds 1 and 2 reproduced the original run's figures **bit for bit**. Result reproduces the lane exactly: 70.70 % ± 1.78, 2.114 ± 0.122 |
| `alt.mjs` | altitude distribution, 38 190 flight ticks, every tick | run **twice**, once per NDC field — the comparison in §2 claim 7 that exposed the pitch-only-basis trap |

### Instrument validations run before anything was believed

`measure_criterion_ab.py --selftest` PASS (arcade exact 138/31/68.7/68.5, 79/17/84.0/80.2) ·
`measure_stage_identity.py --selftest` PASS (incl. blank refusal and sea-cap contamination) ·
`measure_night_ground.py --selftest` PASS (reproduces the arcade control to 78.239/72.853) ·
`measure_value_stats.py --selftest` PASS.

### Figures written

| file | shows |
|---|---|
| `r7judge-01-OURS-TOP-ARCADE-BOT.png` | ours (stage-1 play, 6-kill fireball) over both arcade natives |
| `r7judge-02-TALLY-FRAMES-OVER-GATE.png` | the three over-gate play frames, one per stage — all tally cards |
| `r7judge-03-ARCADE-STAGE-DIGIT-1-2-3-4-6.png` | the arcade's stage digit at t100/140/175/220/280 |

### What I did NOT verify, stated so it is not read as checked

- The 109-observation arcade **player altitude** hand count (ledger row 26's substance).
- The **enemy** altitude column (its bar is still unmet; I add nothing).
- Ledger rows 27 and 28 — accepted as reported, not re-derived.
- Deaths/min 2.114 and flight share 70.70 % — my matched re-runs did not complete.
- The arcade's **enemy round time of flight**, the throttle's arcade gameplay role, audio,
  the title screen, the carrier, and anything on stages 4+ other than the stage digit.
- Ledger rows 1–19, 22, 23, 25 — no opinion.

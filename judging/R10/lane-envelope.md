# R10 — the effects lane: ENVELOPES IN TIME

**Lane files**: `src/effects/**`, `src/weapons/enemyShots.js`, `src/weapons/projectileSprites.js`.
Nothing else was touched. No commit, no stash, no checkout, no push.

**Tree state.** Started from `8725647`. **HEAD moved to `7265ba3` mid-round and other lanes
changed `player.js`, `combat.js`, `lockSystem.js` and `missiles.js` while I worked.** That cost
me an hour and it is worth recording how: my "before" and "after" captures of
`?fixed=1&seed=1&demo=2` diverged at tick 300 with **identical tick, identical score, identical
lives, and `jetNdcX` −0.353 against +0.196** — the player in a completely different place at the
same simulated instant. I bisected my own change set twice looking for a shared-PRNG shift
before running `git status` and finding the feel lane in `player.js`. *An our-side A/B is only an
A/B if the tree did not move under it* — the rule is already in STATUS.md and I still walked into
it. Every our-side figure below names which tree it was taken on.

**Instrument**: `judging/R10/envelope_r10.py`, new, `--selftest` **18/18**. Operator, control and
blind spots in §6 — read that before quoting any number here.

---

## 0. The headline in one line

> **The explosion was a 0.683 s plateau. It is now a 0.150 s flash followed by a 0.9 s peach
> smoke mass, and the arcade's own four events bracket every shape statistic of the new one.
> Criterion A is unmoved: 67–75 colours and 26–29 channel values on eight frames that
> `assert_population.py` confirms carry fire, smoke, player weapon and enemy fire.**

And the finding I did not expect to make: **the arcade's daylight kill leaves a large PEACH smoke
mass, and it is measurable.** R9 could only read it by eye because stage 1's cloud banks defeated
every mask. I found a kill that detonates over **open sea with no cloud in the frame**
(`tools/out/envelope-r10/arc-expl-99-opensea.png` — crop it and look) and measured the residue
directly: **mean RGB (236, 188, 162), V 0.925, S 0.312, 7.20 % of the frame.**
That settles a question `explosions.js` has carried open since R7, which argued — correctly, on
the evidence it had — that the one daylight arcade explosion in the repo has *no grey anywhere*.
It does not. The residue is not grey. It is peach, and we now draw it.

---

## 1. THE EXPLOSION — motion comparison first

`tools/out/envelope-r10/MOTION-explosion-arcade-vs-ours.png` — thirteen consecutive-frame
samples, arcade above, ours below, aligned at first light, labelled in milliseconds.
Per-side strips: `arc-expl-99-opensea.png` (arcade, 2-frame steps through one open-sea kill) and
`ours-r10-kill-strip.png` (ours, 3-tick steps through one kill).

**What the arcade does, read off consecutive frames:**

1. a **radial spike burst** — a dense spray of thin yellow/orange rays, far finer than our 11
   spikes, lasting 2–4 frames;
2. collapse to a **round dark red/maroon ball**, ~0.1 s;
3. a **peach/tan smoke mass** grows out of the ball and keeps growing for ~0.3 s;
4. the mass pales and persists **well over a second**.

**What we did:** a round lobed orange fireball appeared, sat at essentially constant size and
colour for **thirty-six consecutive ticks**, and vanished leaving nothing.

**What we do now:** white-hot flash → red mass → peach smoke that persists 0.9 s. Steps 1–4 in
the same order and at comparable durations, except that our smoke is deliberately smaller.

### 1.1 The envelope table

Operator: `envelope_r10.py`, r9 mask (`R>180, 60<G<235, B<90`), per-run persistence exclusion,
largest 8-connected component, 60 Hz on both sides. **Every figure is from consecutive frames.**

| | peak %¹ | t_rise | **w60** | **n60** | **r100** | t_half | **life10** |
|---|---|---|---|---|---|---|---|
| **arcade A** `arc-expl-96` ev 14–32 | 0.83 | 0.083 | 4 / 0.067 s | 4 | 0.036 | 0.050 | 8 / **0.133 s** |
| **arcade B** `arc-expl-96` ev 28–46 | 1.82 | 0.067 | 2 / 0.033 s | 3 | 0.137 | 0.033 | 12 / **0.200 s** |
| **arcade C** `arc-expl-96` ev 44–64 | 2.60 | 0.083 | 8 / 0.133 s | 8 | 0.699 | 0.117 | 18 / 0.300 s ᵗ |
| **arcade D** `arc-expl-99` ev 76–94 | 4.32 | 0.117 | 4 / 0.067 s | 4 | 0.157 | 0.017 | 14 / **0.233 s** |
| *arcade, R9 §2.4, independent* | *6.03* | — | *4 / 0.067 s* | — | *0.28* | — | — |
| **arcade range (n=4+1)** | — | 0.067–0.117 | **2–8** | 3–8 | **0.036–0.70**, median ≈0.15 | 0.017–0.117 | **8–18** |
| | | | | | | | |
| **OURS BEFORE** `8725647`, in-situ | 3.33 | 0.150 | 6 / 0.100 s | **16** | **0.512** | 0.133 | **41 / 0.683 s** |
| **OURS AFTER**, isolation harness | 2.02 | 0.083 | 8 / 0.133 s | 8 | **0.107** | 0.067 | **9 / 0.150 s** |
| **OURS AFTER**, in-situ, same tree | 2.04 | 0.083 | 8 / 0.133 s | 8 | 0.117 | 0.067 | 15 / 0.250 s |

¹ **peak % is NOT a cross-side quantity** — see blind spot 1. It is in the table because it is
what the mask returned, not because the columns are comparable.
ᵗ truncated: the event runs into the next kill, so its life10 is a lower bound.

**Before, ours failed on the two statistics that describe a plateau** — `n60` 16 against the
arcade's 3–8, `life10` 41 frames against 8–18 — and sat at the extreme of a third (`r100` 0.512
against a median of 0.15; the arcade's own 0.699 is event C, which is two overlapping kills and
should not be read as the arcade's upper bound).
**After, every statistic is inside the arcade's observed range.** `w60` 8 is at the top of it and
`life10` 9 is near the bottom; nothing is outside.

**Provenance.** Arcade: `.reference-cache/video/ab2-longplay-60fps.mp4`, `-ss 95.6` and `-ss 98.5`,
120 consecutive frames each, **stage digit read 1 on every frame** (visible in
`arc-expl-96-look.png`, `arc-expl-99-opensea.png`). Ours before:
`tools/out/envelope-r10/ours-base-demo2/`, URL `?demo=2&seed=1&fixed=1`, ticks 300–539, manifest
in the directory. Ours after: `ours-r10c-harness/` (`?combatexpl=1&seed=1`, ticks 60–95) and
`ours-final-insitu/` (`?demo=2&seed=1&fixed=1`, ticks 540–1139).

**The harness and in-situ readings disagree on `life10` (9 vs 15) and the harness is the one to
quote.** In play the largest component merges with a neighbouring enemy's nozzle disc once the
fireball has shrunk, which extends the measured tail; the harness has no enemies.
`?combatexpl=1` and in-situ agree to 0.02 points on peak, 0 frames on `w60`/`n60` and 0.010 on
`r100`, so the merge is confined to the tail. CLAUDE.md's "isolation harnesses beat in-situ
measurement", with the size of the difference published.

### 1.2 What changed in `explosions.js`

| | before | after | why |
|---|---|---|---|
| `LIFE_S` | 0.75 s | **16/60 = 0.267 s** | the plateau |
| phase boundaries | 0.76 / 0.90 → fire held 0.57 s | **5 / 5 / 6 ticks** | the fire-coloured area now collapses as the bands drop out |
| `BOIL_HZ` | 14 | **30** | the arcade swaps its explosion sprite every SECOND frame — the fire-mask area series alternates in 2-frame pairs over a ground that changes every frame |
| `grow` after peak | `1.0 − (t−0.18)·0.12` (**shrinks**) | `1.0 + (t−0.125)·0.21` (**expands**) | the arcade's mass keeps growing while its fire fraction collapses |
| debris life | shared `LIFE_S` | **own `CHUNK_LIFE_S` 0.45 s** | a 3× shorter fire would otherwise have taken the debris with it |
| residue | none | **3 peach smoke puffs, 0.9 s, 0.09 → 0.19 of frame width, scale capped at 1.6** | R9 §2.4's "ours leaves nothing"; the cap is §1.5 |

**16 ticks, not 14.** At 14 the measured `life10` was **7 frames against the arcade's 8 and 12**
— under the arcade on both events I could bound. Being short of the arcade is as much a miss as
being long, so the fire went to 16 and `life10` to 9.

**I did not touch `PEAK_FRAC`.** R9 reports ours peaking at 3.69 % against the arcade's 6.03 %
and it is tempting. Peak area scales with the killed target's screen size and depth and **no
pair of readings on the two sides is depth-matched** — the arcade's four events alone span
0.83–6.03 %, a factor of seven, on the same hardware in the same stage. Raising `PEAK_FRAC`
against that would be tuning to an uncontrolled variable.

### 1.3 The kill smoke, and its arcade measurement

`src/effects/smoke.js`, new `kill` kind. Palette **`#ce8c7b #deb59c #efb58c #ffc5a4`** — the
arcade residue's V-ordered p5 / p20 / p40 / p95 snapped to `SEGA_LADDER`. Area-weighted they
return `#efbda4` against the measurement's `#ebbca2`.

Ageing is a **band edit inside those four colours** (the dark rim drops, the bright core grows),
not a value ramp: the existing ramp machinery multiplies a grey by the caller's value, which on a
coloured ladder would put a continuum of peaches on screen — the Criterion A failure mode
`explosions.js` already paid for once.

| | arcade (n=1 event, open sea) | ours, final tree |
|---|---|---|
| dominant colour | `#f4c8b3`, mean RGB (236, 188, 162) | 4 authored colours, **exactly 4 render** |
| V / S | 0.925 / 0.312 | 0.808–1.000 / 0.297–0.414 |
| peak share of frame | **7.20 %** | **5.78 %**, typical 2.1–5.0 % |
| persistence | **≥0.8 s**, by eye; upper bound not obtainable | **1.067 s** at ≥10 % of peak |

Ours is measured by **exact palette match** (we author the colours, so the operator is exact on
our side and does not exist on the arcade's). Our `smoke` mask reading was discarded: our
player's cream airframe `#c5c5ad` passes `R > B+0.04, S<0.45, V>0.70` and puts a 0.3–0.5 % floor
under every frame. Cropped and looked at; not published.

**Deliberately under the arcade.** 7.20 % is one event whose decay I could not separate from
stage 1's cloud banks. Under-shooting a number measured once is the cheap error.

### 1.4 Criterion A — re-measured, and it holds

`tools/measure_criterion_ab.py` (selftest PASS), eight frames of `ours-final-insitu` spanning the
fireball, the red decay and 0.7 s of smoke:

```
colours        67 – 75     (gate ≤256)        median 70
channel values 26 – 29     (gate ≤32)         median 28
H-identity     74.4 – 76.0 %                  V-identity 64.9 – 73.6 %
```

`tools/assert_population.py` on the same eight frames: **EXPLOSION 4/8, PLAYER-WEAPON 8/8,
ENEMY-FIRE 8/8.** These are combat frames and the assertion says so from the pixels, not from the
invocation (R8 ledger row 32).

**The honest cost: the peach ladder adds up to +1 channel value in practice and the gate has 3
left.** Five of its ten channel rungs (123, 140, 181, 206, 222) are not in the explosion palette;
most were already on screen from the sea, clouds and airframe, so the measured cost is +1
(28 → 29 between a fire-only and a smoke-only frame). If A2 ever tightens, dropping `#deb59c`
and reusing a rung already on screen is the lever.

`tools/fx_palette_probe.mjs`: **0 partial-alpha texels, 0 off-palette colours, 0 off-ladder
channel values, 0 A3 ceiling breaches over 33 canvases** — but **it does not yet enumerate the
new `kill` textures**, because the probe lives in `tools/` and is not this lane's file. I exported
`killSmokeTexturesForProbe()` for it and verified the equivalent from the pixels instead: exactly
4 distinct peach colours render in three separate frames, with no off-palette seams.
**ASK: add `killSmokeTexturesForProbe()` to `tools/fx-probe.html`.**

---

### 1.5 A CONSEQUENCE IN ANOTHER LANE'S FILE, found by looking rather than by reasoning

`src/game/flow/deathSequence.js` holds `FIREBALL_S = 0.7` and `STARBURST_S = 1.3`, and both
phases just spawn an explosion and wait. Those were timed against a **0.75 s** fireball. Cutting
the fire to 0.267 s leaves, on the arithmetic alone, **0.43 s of nothing in the fireball phase
and 1.03 s of an EMPTY SCREEN in the starburst phase — where the jet is deliberately hidden.**
A lane that shipped the explosion change and stopped at its own file boundary would have put a
one-second hole in the player's death.

**Reproduced and then checked by eye** with the `?forcedeath=` hook nobody in this round's briefs
mentions: `?fixed=1&seed=1&demo=2&forcedeath=2.0`, 140 consecutive ticks,
`tools/out/envelope-r10/death-final-strip.png` (manifest confirms `fireball` at tick 122,
`starburst` 164, `tumble` 242).

**The hole does not open, because the residue covers it**: 0.267 s of fire + 0.9 s of smoke =
1.17 s per spawn, against phases of 0.7 s and 1.3 s. The only remaining gap is ~0.13 s at the end
of `starburst`, during which the tumbling hulk is about to appear anyway. The death now reads
flash → red → peach smoke → flash → red → peach smoke → hulk, which is closer to the arcade's
own sequence than the two long orange holds it replaced.

**It also forced a design decision I would otherwise have got wrong.** `deathSequence.js` spawns
its starburst at `scale = 2.7`. Scaling the smoke with it gives a puff **half the screen wide** —
an extrapolation of a single 7.20 % observation by a factor of seven in area, and at that
magnification the 32-texel canvas reads as a flat slab, not as pixel art. The smoke is therefore
capped at `min(scale, 1.6)`, the largest thing this lane actually measured. Before and after:
`death-after-strip.png` (uncapped) against `death-final-strip.png`.

Criterion A on seven death frames spanning both bursts and both smoke masses:
**colours 55–74, channel values 23–28** — comfortably inside the gates and *lower* than ordinary
combat frames, because the death clears the sky of enemies.

> **NOTE FOR THE GAME-FLOW LANE, not an ask**: `FIREBALL_S` and `STARBURST_S` are no longer
> matched to the thing they are waiting for. They happen to be covered now. If either the fire or
> the smoke life moves again, the cover goes with it, and the right fix is for the phase to end
> when the effect does rather than on a constant that remembers a value from three rounds ago.

---

## 2. ENEMY SHOTS — the 8× gap is real, and part of it was an OPERATOR MISMATCH

### 2.1 I re-confirmed the arcade bound at 1/60 s, and corrected the claim it rests on

R6 measured the stage-7 train entering and clearing in **0.37 s**, stepping at 1/30 s because
*"the file carries duplicate frames; 1/30 s is its effective unique rate, verified by hashing"*.

**That is wrong, and it matters for every future motion measurement in this project.** Over 119
consecutive pairs at t ≈ 96–102 and t ≈ 329–331, the mean per-channel |Δ| between consecutive
frames is **17.4–37.6** and **no pair is identical**. The 60 fps longplay is 60 unique frames per
second at both timestamps. (My own first test — "all 12 md5s differ" — proves nothing on an AV1
re-encode and I nearly published it; the pixel-difference test is the one that does.)

Re-read at 1/60 s, the train is present in frames **f024–f046** of the t = 329.4 burst and absent
either side: **0.367 s**, agreeing with R6 at twice the resolution. Strip:
`tools/out/envelope-r10/arc-shots-330-strip.png`.

### 2.2 The two "incompatible arcade claims" are BOTH TRUE. The missing term was ours

R7 §5 and R8's combat lane both flagged that the repo holds *"≤0.37 s screen life"* and
*"10–16 simultaneous fireballs at ~0.11 s emission spacing"*, and that one must be wrong.

**Neither is wrong. The 0.11 s is `enemy.js`'s spacing, projected onto the arcade.** Nine to ten
rounds crossing in 0.367 s requires an emission spacing of **~0.04 s, not 0.11 s** — the arcade
fires its train as a near-burst. The contradiction is an our-constant that walked into an
arcade-side inference. Ledger class: *a measured arcade figure combined with an unmeasured
assumption carried over from our own build.*

### 2.3 And the 8× is partly two different operators

> **The arcade's ≤0.37 s is the life of a VISIBLE fireball. Our 2.90–3.05 s is the life of a
> SPAWNED round. They are not the same quantity** — the same-name-different-operator class.

Measured, n = 48 rounds, r9 mask, every compact component in the sky box over the 23 frames the
train is up:

| arcade round width | min | p10 | median | p90 | max |
|---|---|---|---|---|---|
| video px (1028 wide) | 12 | 14.0 | 22.0 | 27.3 | 34 |
| **native px** | **3.74** | **4.36** | **6.85** | **8.50** | **10.58** |

**The distribution has no far tail.** Crop `arc-shots-330-zoom.png`: twelve consecutive 2× panels,
every oval the same chunky fireball. The arcade's rounds appear at essentially final size.

Ours, from the constants (`SPEED = 10`, band 52→1.6, the 1/d-proportional ramp):

| depth | 52 | 24 | 12 | 6 | 3 | 1.6 |
|---|---|---|---|---|---|---|
| drawn width, native px | **1.92** | **2.13** | **2.53** | 3.32 | 5.54 | 7.68 |

A sub-3-pixel dot for **~4.0 s of a 5.04 s flight**, then a readable fireball for the last 0.4 s.
So the honest statement of the gap is: *the arcade's threat is a 6–8 px fireball that exists for
0.37 s; ours is a 2 px speck for two and a half seconds and then a fireball for four tenths.*

### 2.4 What I changed, and what I refused to change

**Changed**: `FRAC_FAR` **0.006 → 0.014** (1.9 → 4.5 native px), the arcade's own p10 rounded
down. Every round we draw is now inside the measured 3.74–10.58 px band for its whole flight. No
gameplay constant moves; the hit test is on depth crossing, not on size, so `pHit` and
deaths/min are untouched by construction.

**Refused**: the envelope itself. Closing it means `SPEED` ≈ 130 (0.37 s flight), which cuts the
fairness lag from 3.24–6.04 s to ~1.37 s. On the displacement table in `enemyShots.js`'s own
header that moves `P(displacement < 0.05)` from 0.11 to 0.43 — roughly **4× the hit rate**, against
a gap-5 gate of ≤2.0 deaths/min that we currently miss at 2.114. The decoupling lever is an
**aim-error term in `enemy.js`**, which the R6 feel critique identified and which does not exist;
`enemy.js` is not this lane's file. Shipping the speed change alone would trade a passing gate for
a failing one and call it fidelity.

> **CROSS-LANE ASK (combat / enemy lane).** Three constants have to move together or not at all:
> `enemy.js` train spacing 0.11 s → ~0.04 s; `enemy.js` an aim-error term, so time-of-flight stops
> being the only miss mechanism; `enemyShots.js SPEED` 10 → ~130 with `FRAC_FAR`/`FRAC_NEAR`
> flattened to a near-constant 6–8 px (the arcade draws its rounds at constant size, the same
> decision `vulcan.js` already takes for the player's). I will make the `enemyShots.js` half on
> request; I will not make it alone.

---

## 3. THE MUZZLE FLASH — checked and cleared, with its sample stated

`.reference-cache/video/ab2-longplay-60fps.mp4` at t = 213.6, 90 consecutive frames, the player
holding the vulcan down on stage 4. `arc-vulcan-nose.png` and `arc-vulcan-nose2.png` are 2× and 3×
crops of the nose across 16 consecutive frames.

**There is no separable muzzle-flash sprite.** What sits at the nose while firing is the first
round of the vulcan stream — the same orange puff as the rest of the column — continuously
present. Nothing strobes at the muzzle on any frame of the burst.

Ours: `FLASH_LIFE_S = 0.05` at `FIRE_INTERVAL_S = 0.08` → lit 3 ticks in 5, a 60 % duty flicker at
the nose. That is close to "continuously present" and **I am recording this as no defect and
opening no gap.**

**The negative's sample is one stage, one burst, 90 frames, and that is weak.** This project
nearly retired the nose sight twice on exactly this kind of evidence, and the lane that got it
right chose its frames by a rule written before the question was asked. *Do not retire anything
on the strength of this paragraph.* `FLASH_LIFE_S` lives in `vulcan.js`, not this lane's file, so
nothing was changed either way.

---

## 4. THE MISSILE TRAIL AND THE POST-KILL PLUME SIZE — NOT CLOSED

**I could not measure the arcade's trail persistence and I am not publishing a number for it.**
The arcade's missile trail is a narrow white ribbon (visible climbing out of frame in
`arc-smoke-persist.png`, frames 92–116). Every mask that accepts it also accepts stage 1's cloud
banks, which are the same white and far larger; the `smoke` mask's largest component flips
between them frame to frame — **17.35 % in one frame and 0.09 % in the next**
(`arc-smoke-99` series). That is physically impossible for smoke and it is the mask failing, not
the smoke. This is the same blind spot R9 hit and reported, and I did not beat it either.

The one thing that *did* beat it for the kill residue — finding a detonation over open sea with
no cloud in frame — has no equivalent for the trail, because our own trail reference
(`stage1-missile-salvo-t100.75.png`) and every trail in the longplay I looked at have cloud in
them.

Ours, for the record and from the source: `missiles.js` spawns tail puffs at `life: 0.95 + rng()*0.2`
and launch billows at `life: 1.0`, aged through `SMOKE_VALUES` with **no alpha fade** — the value
thins, the sprite does not dissolve. Those constants are in **`missiles.js`, another lane's file**.
`smoke.js` owns the decay *shape* and I changed nothing about it.

> **ASK (whoever owns `missiles.js`), and it is an ask for a MEASUREMENT, not a change**: nobody
> has a bound on the arcade's trail persistence. The way to get one is the way the kill smoke was
> got — find a salvo that flies over open sea with no cloud bank anywhere in frame, then the
> white-vs-cloud confound disappears. I looked and did not find one in the windows I decoded.

---

## 5. Per-kill screen presence — a number a judge will reach for, with its warning

`assert_population.py`, EXPLOSION class:

| | frames with fire | per kill |
|---|---|---|
| before, `8725647`, 240 frames | 47.9 % | ≈45 frames of fire, 0 of residue |
| after, final tree, 600 frames | **4.5 %** | ≈15 frames of fire, **≈54 of smoke** |

**Do not read the 47.9 → 4.5 as a tenfold regression in presence.** The two runs are on different
trees with different kill counts (≈2.6 kills in 240 frames against ≈1.8 in 600). Normalised per
kill, the *aftermath* grew from 45 frames to about 69 — it changed shape, from a long fire to a
short fire plus a long residue, which is the arcade's shape. A presence percentage has no arcade
column and I am not offering one.

---

## 6. THE CRITERION — **ENVELOPE**, and what it cannot see

**Published here rather than in `REFERENCE.md`: the criteria lane owns the documents. This is the
operator, its control and its arcade column, ready to be lifted.**

### Definition

Given **N consecutive frames at a known frame rate** and a per-frame scalar `a(t)` = masked area
as a fraction of the frame:

| name | definition |
|---|---|
| `peak` | `max a`, % of frame pixels |
| `t_rise` | first-light → peak, seconds (first light walked BACK from the peak, so an earlier unrelated event cannot set it) |
| `w60` | the **contiguous** run containing the peak with `a ≥ 0.60·peak` |
| `n60` | **total** frames in the event with `a ≥ 0.60·peak` |
| `r100` | `a(t_peak + 0.100 s) / peak` |
| `t_half` | first time after the peak with `a < 0.50·peak` |
| `life10` | total frames with `a ≥ 0.10·peak` |

**`w60` and `n60` are published as a pair and neither is reportable alone.** A sprite that swaps
between arrangements of different area dips below the threshold for a single frame and collapses
the contiguous run; our build reads `w60 6 / n60 16` before the fix — a flickering plateau that
`w60` alone scores as a flash.

**The shape statistics are the comparable part.** `t_rise`, `w60`, `n60`, `r100`, `t_half` and
`life10` are times and ratios, invariant to how big the event is on screen. `peak` is not.

### Masks — two, run on both sides

| | definition | sees | blind to |
|---|---|---|---|
| `r9` | `R>180 ∧ 60<G<235 ∧ B<90` (R9 §2.4's, kept for continuity) | the orange/yellow fire body | the white-hot core, by construction — and therefore the white HUD, which is the reason to keep it |
| `fire` | REFERENCE's FIRE-MASK | the core too | **accepts white HUD and white smoke**; unusable here without the exclusion, and it read **48 % of frame** on an arcade frame that is mostly cloud |
| `smoke` | `V>0.70 ∧ R>B+0.04 ∧ S<0.45` | the arcade's peach residue | the least robust of the three — one ladder level of slack on a resampled source; **always `--marks` it and look** |

### The exclusion is derived per run, never hardcoded

A pixel that passes the mask in **more than 50 % of the window's frames** is not part of a
transient event — it is HUD, sun, ground, or the player's own afterburner nozzles, which are
orange and never go out. Those are removed; the **largest 8-connected component** of what is left
is the event. The tool **refuses** rather than reporting when the event occupies more than half
the window, and distinguishes "nothing there" from "the exclusion ate it".

### Control — `--selftest`, 18/18, and what each arm proves

1. a **4-frame flash** in a 120-frame window, areas prescribed in closed form: peak, `w60`,
   `t_rise`, `t_half`, `r100` and `life10` all recovered. *The expected values are read off the
   prescribed list, not off the operator.*
2. a **36-frame plateau** (our own defect, synthesised): `w60` 36, `r100` 1.00.
3. a **pure exponential**, half-life 6 frames: `t_half` recovered to the frame, including that
   the inequality is strict so the answer is 7 frames and not 6.
4. the **persistence exclusion**: a static white HUD bar and a static orange nozzle painted into
   every frame leave *nothing* after the exclusion — and the test is shown **non-vacuous** by
   asserting that FIRE-MASK does accept the HUD bar and r9 does not.
5. the **refusal path**: an event filling 50 of 60 frames is refused, not measured.
6. `tools/fire_mask.py --selftest` passes, i.e. the `fire` mask reproduces REFERENCE's own
   published control both ways.

The connected-component routine is **cross-validated against a slow per-pixel union-find on 60
random masks at densities 0.05–0.55, 0 mismatches**, plus a diagonally-stepped ring — the exact
8-vs-4 topology case that cost ledger row 38 seventy-eight pixels. (Two implementations agreeing
is weak evidence on its own — R9 ledger row 38 is precisely a cross-validation that agreed because
two errors cancelled — so the random-density sweep, not the single hand case, is the control.)

### WHAT THIS CRITERION CANNOT SEE

1. **`peak` is not a cross-side quantity.** It scales with the killed target's screen size and
   depth. The arcade's own four events span **0.83 % to 6.03 %, a factor of seven**, on the same
   hardware in the same stage. Quote `peak` against another reading of *our* build, or alongside
   the subject's screen span, never across sides.
2. **Neither fire mask measures smoke, and the smoke mask cannot be trusted over clouds.** The
   residue envelope is open (§4).
3. **A single event is a sample of one.** `w60` of a 0.067 s event is 4 frames; one frame of mask
   noise is 25 % of it. The arcade column above is n = 4 and its `w60` spans 2–8. **Do not gate
   on a single arcade event, in either direction.**
4. **The operator cannot attribute.** Two overlapping kills and the largest component jumps
   between them — arcade event C is exactly that and its `r100` 0.699 is the result. `--marks`
   writes the measured component for every frame; **crop it and look.**
5. **The arcade source is resampled** (1028×720 is not a multiple of 320×224). Valid for timing
   and area fraction. **No colour cardinality reading off it.**
6. **It says nothing about shape.** A sprite with the right envelope and the wrong silhouette
   passes. This criterion is *additional to* the palette and silhouette gates, not a replacement
   — and the reason it is worth adding is that those gates scored a nine-times-too-long explosion
   as a pass for nine rounds.

### 6.1 THE KNOWN-QUALITY TRIPLE — and it refutes the obvious gate

The criteria lane's JOB-1 rule: *a synthetic control proves the operator computes what it says;
it cannot prove a quality statistic RANKS correctly.* So: three arms, **matched harness, matched
depth, matched seed** (`?combatexpl=1&seed=1`, 60 consecutive ticks each), one constant set
changed at a time in `explosions.js`, the file restored from an in-memory copy in a `finally`
and verified byte-identical by md5 afterwards. **The quality ordering is settled by looking at
the crops, not by the statistic** — that is what keeps it non-circular.

| arm | what it is | peak % | t_rise | w60 | n60 | r100 | **life10** |
|---|---|---|---|---|---|---|---|
| `plateau` | the committed R9 behaviour: 0.75 s, fire held to 0.76, size shrinking, no residue | **1.445** | 0.533 | 6 | 8 | 0.144 | **40 f / 0.667 s** |
| `puff` | shipped timing, `PEAK_FRAC` 0.30 → 0.17, no residue — **criteria-r10's predicted third wrong answer** | **0.618** | 0.083 | 8 | 8 | 0.124 | 15 f / 0.250 s |
| `shipped` | what this lane ships | **2.016** | 0.083 | 8 | 8 | 0.107 | **9 f / 0.150 s** |

**Three results, and two of them are warnings about the criterion itself.**

1. **`w60` and `n60` DO NOT RANK THE PAIR THEY WERE CHOSEN FOR.** The plateau reads 6/8 against
   the flash's 8/8 — *the plateau scores better.* They are normalised by peak and our sprite
   boils, so the 60 % run is short on a mass that sits on screen for two thirds of a second.
   **The discriminating time statistics are `life10` (40 f vs 9 f) and `t_rise` (0.533 s vs
   0.083 s).** This is the DRAW-WEIGHT lesson again — *the statistic that reads most naturally
   as the defect is nearly blind to it* — and it lands on "ticks within 60 % of peak", which is
   the figure R9 §2.4 and the criteria lane both put at the centre of the gate.
2. **criteria-r10's "both axes or neither" warning is CONFIRMED BY EXPERIMENT.** `puff` and
   `shipped` are **identical on `t_rise`, `w60` and `n60` and differ by 0.017 on `r100`** — and
   `puff`'s fireball is **3.3× smaller in area**. No time statistic separates them. A
   duration-only gate passes a fireball a third the size.
3. **And the answer to "did you shrink it": no.** At matched depth the shipped envelope peaks
   **2.016 % against the plateau's 1.445 % — 39 % HIGHER.** The before/after rows in §1.1 read
   3.33 % → 2.04 % because they are *different kills at different depths on different trees*;
   that pair is not a peak comparison and must not be read as one. **The shipped change is
   shorter AND bigger, which is the direction a flash needs.**

### 6.2 THE MASKS, re-examined — r9 is a BAND mask and FIRE-MASK is unusable here

Ground truth exists on our side only (the authored palette), so this is the recovery test R9
ledger row 38 requires, run where it can be run:

| | fireball opaque px | **r9 recovers** |
|---|---|---|
| shipped, peak tick | 23 697 | **54.9 %** |
| shipped, one phase later | 25 884 | **18.5 %** |
| plateau, its measured peak | 19 188 | 56.8 % |

**The r9 mask is not a fireball mask. It is the orange/amber BAND of a fireball**, and that
band's share of the sprite changes threefold across one event, so part of what `r100` and
`life10` measure is a *palette transition*, not a size change. The direction is the same on both
sides — the arcade's fireball runs yellow → orange → red too — but **its recovery on the arcade
cannot be measured, because the arcade has no alpha channel.** Quote the envelope as
*envelope-under-r9*; that clause is load-bearing.

**FIRE-MASK cannot be substituted.** Its `(S<0.25 ∧ V>0.90)` clause accepts white, so on the
arcade it read **48.0 % of frame** on a cloud-filled frame and on our harness it ranks `puff`
(1.210 %) *above* `shipped` (0.891 %) and puts the `shipped` peak at frame 11, one tick **before
the explosion exists**. Both readings are the clouds. Published here only as the evidence that
the substitution fails; no envelope figure in this report uses it.

### 6.3 THE ATTRIBUTION HORIZON — and why `life10` is withdrawn and `r100` must not be licensed

criteria-r10 read `life10` 21 where I read 14 on arcade event D and diagnosed it as an undefined
event boundary. **It is not a boundary problem. It is attribution, and it is worse than either of
us thought.** Written up here because it invalidates a figure of mine and a gate candidate of
theirs.

**What is actually happening at arcade event D** (`arc-eventD-boundary.png`, eight frames with
the mask overlaid — crop it and look): the fireball peaks at f085 with its centroid at (140, 226).
By **f091 the selected component is at (470, 465)** and f094–f099 is a **different explosion in
the opposite corner**. "Largest component per frame" is a *selection*, and once the fireball
decays below the size of some other fire-coloured object the selection silently re-targets.

**Three repairs tried, three failed, all on measured evidence:**

| repair | result |
|---|---|
| criteria-r10's **debounce** — end the event after K consecutive sub-threshold frames | **diverges**: life10 = 14 / 14 / 26 / 26 / 84 / 84 / 84 / 84 for K = 1…8. No K is right; K=2 excludes the second kill, K=3 merges it |
| **track by nearest centroid within a radius** | **punches holes**: on arcade B it took a 39 px fragment at f034 over the 9 169 px mass beside it, and 106 px over 6 311 at f038 — tracked series 3988 / 39 / 7976 through an event that never dimmed |
| **track by largest component within a radius** | **walks**: hops blob to blob, each hop legal, and at `track_frac` 0.12 **arcade events A and C return byte-identical statistics** — A's anchor migrated into C's event |

So I am not shipping a tracker. What I am shipping is a **detector**, which only has to notice
that the selection broke rather than follow the subject, and therefore needs one threshold
instead of a motion model:

> **ATTRIBUTION HORIZON** — walking forward from the peak, the first lag at which the largest
> component's centroid jumps further than `T` of the frame width between consecutive frames.
> Any envelope statistic evaluated at a lag **beyond the horizon is unlicensed**: it is read off
> whatever object happened to be largest.

**The detector needs TWO conditions and I found the second one the hard way.** The jump test
alone reported a **28-frame horizon** on arcade peak f069 — and the crop
(`arc-event-longhorizon.png`, bottom row) shows the selection sitting on **the player's own
afterburner nozzles** from about lag 6. They are orange, they are in every frame, and they *move
smoothly*, so no jump ever fires; the persistence exclusion cannot remove them either, because it
only removes what is stationary.

> **A LONG HORIZON IS NOT EVIDENCE OF CLEAN ATTRIBUTION. It is only the absence of an ABRUPT
> break.** My own negative was weak in exactly the way this project's negatives usually are, and
> it was a crop that caught it, not a number.

So the second condition is a **size floor**: `clutter` = the median largest-component area over
the frames *before first light* — the frame's own background level of fire-coloured junk,
measured per run like the exclusion — and once the component has fallen to 2 × that, it is
indistinguishable from the junk whether or not it jumped. The horizon is the **earlier** of the
two. (The clutter window must stop at first light, not at the peak: measured from the peak it
swallows the event's own rise, which in `--selftest` put the floor *above* the peak and cut the
licence at lag 1 on both control arms.)

| horizon, frames after the peak | A | B | C | D | f069 | **ours** (harness / in-situ) |
|---|---|---|---|---|---|---|
| T = 5 %W | 3 | 2 | 1 | 1 | 1 | **>9 / 10** |
| T = 8 %W | 3 | 4 | 7 | 1 | 7 | **>9 / 10** |
| T = 10 %W | 3 | 4 | 9 | 1 | 7 | **>9 / 10** |
| T = 15 %W | 3 | 4 | 9 | 1 | 7 | **>9 / 10** |
| T = 20 %W | 3 | 4 | 9 | 1 | 7 | **>9 / 10** |
| size floor alone | 3 | >40 | 25 | 1 | **7** | >9 / 10 |

With the floor in, **the threshold stops being load-bearing**: every event is flat across
T = 0.08–0.20, and only T = 0.05 trips early on C, D and f069. Within-event jumps run
**0.0–3.2 %W** and breaks **9–52 %W**.

**CORRECTION TO MY OWN ROW, and it is ledger row 21's class inside my contribution to the box
that enforces it: "ours (harness / in-situ) >9 / 10" is TWO POPULATIONS, NOT TWO READINGS.**
Measured on one tree, over the 30 frames before first light:

| | competing components per frame | largest competitor | total masked |
|---|---|---|---|
| `?combatexpl=1` harness | **0** (max 0) | — | **0.000 % of frame** |
| `?demo=2` in-situ | **16** (max 19) | 459 px = 0.071 % | 0.287 % |

The harness has **no competitors at all**, so its ">9" is not a long horizon — it is the event
ending before anything could out-compete it. **Only the in-situ figure is comparable to the
arcade's 1–9**, and the harness figure should never have stood in the same column.

**Our competitor set, cropped** (`ours-competitor-set.png`, one pre-event frame, every component
painted): the two largest are **the player's own nozzle discs at 459 and 441 px**, ahead of the
vulcan column (63–117 px) and the enemy shots (45–63 px). **criteria-r10's persistent class is
not arcade-specific — it is the dominant competitor on our side too**, which upgrades the
nozzle-masking pre-step from an arcade-side convenience to the one fix that moves both sides.

**A worry of mine that the measurement killed.** I went looking because my own `FRAC_FAR` change
made each enemy shot ~5.6× larger in area and `#ff7733` is inside the r9 mask, so I expected to
have raised our own clutter floor and shortened our horizon. **Not confirmed**: the floor is set
by the *largest* competitor, that is a 459 px nozzle, and the largest shot is 143 px. The change
does not reach it. Recorded because I would have published the worry had I not checked.

> **Strengthened precondition: the attribution horizon is a property of the CAPTURE, not of the
> build and not of the operator.** It must be measured in the same capture as the figure it
> licenses; a harness horizon and an in-situ horizon are not interchangeable readings of one
> quantity.

**What it still cannot do**: separate a re-target from a genuine one-frame collapse. Arcade D's
+1 is a 9.1 %W jump with the area falling to 0.20 of peak and both explanations fit. That is not
a threshold to be tuned — *if you cannot tell, you cannot license the lag*, which is the
conservative direction.

**And the open-sea trick does not transfer.** It worked for the smoke because a kill over clean
sea removes the *clouds*; it cannot remove the player's own nozzles, which are in every frame of
every stage. I scanned all 14 candidate kills in both decoded windows for a long clean horizon
and the three that looked long were all the detector following the nozzles.

**Three consequences:**

1. **`r100` is at +6 frames and is OUTSIDE the arcade's horizon on three of five events
   (A 3, B 4, D 1) at every threshold ≥ 0.08, while being INSIDE ours at every threshold.** A gate on it compares a valid
   our-side number against an invalid arcade-side one — REFERENCE ledger row 38's licence
   condition, one level up from masks. Its two-implementation agreement to three digits is
   **shared-defect agreement**: both implementations run the same selection step. The synthetic
   control in `--selftest` control 6 makes this concrete — with a decoy present, untracked
   `r100` reads **0.836 where the prescribed truth is 0.068**.
2. **`life10` is withdrawn by me**, including from my own published arcade column. The 8 / 12 /
   18 / 14 in §1.1 is reliable only out to each event's horizon, which is 1–9 frames; **treat
   the arcade `life10` column as an upper bound of unknown tightness.** The build change does not
   rest on it — it rests on the crops and on `w60`/`n60`, which do.
3. **The irony, and it is the usable result**: `w60` and `n60` are confined to frames at ≥60 % of
   peak, so by construction the component is near-peak-sized and dominant, and they fall
   **inside the attribution horizon on all four arcade events.** The statistics the triple
   refuted as *rankers* (§6.1) are the only ones that are *attributable*; the statistics that
   rank are the ones that are not. Until someone builds and validates a tracker, that is the
   state of the gate.

### The arcade column, ready to lift

| effect | arcade | source |
|---|---|---|
| kill explosion, `w60` | **2–8 frames (0.033–0.133 s)**, median 4 | 4 events, 60 Hz, stage 1 digit-verified |
| kill explosion, `life10` | **8–18 frames (0.133–0.300 s)** | same |
| kill explosion, `r100` | **0.036–0.157** on three clean events (0.699 on an overlapping pair) | same |
| kill explosion, `t_rise` | **0.067–0.117 s** | same |
| post-kill smoke, colour | mean RGB (236, 188, 162), V 0.925, S 0.312, dominant `#f4c8b3` | 1 event, open sea, n = 53 282 px |
| post-kill smoke, peak share | **7.20 % of frame** (n = 1) | same |
| post-kill smoke, persistence | **≥0.8 s**, by eye; no upper bound obtainable | — |
| enemy round, width | **3.74–10.58 native px**, median 6.85 | n = 48 rounds, stage 7 |
| enemy round, whole-train screen life | **0.367 s** | f024–f046, re-confirmed at 1/60 s |
| enemy round, emission spacing | **~0.04 s** (inferred: ~9 rounds ÷ 0.367 s) | — |
| player muzzle flash | **no separable flash sprite found**, n = 1 burst / 90 frames | weak; do not act on it |
| missile trail persistence | **NOT MEASURED — no mask survives the clouds** | — |

### Method notes any future motion pass should inherit

- **The 60 fps longplay is genuinely 60 Hz.** Verified by consecutive-frame pixel difference, not
  by hashing: an AV1 re-encode gives every frame a distinct hash whether or not the content
  repeats, and I nearly published that as proof.
- **The arcade's sprite animation runs at 30 Hz inside 60 Hz logic.** Mask-area series alternate
  in 2-frame pairs over a ground that changes every frame. Our `BOIL_HZ` now matches.
- **A long window is not optional.** The persistence exclusion needs the window to be much longer
  than the event; `--event i0,i1` derives the exclusion from the whole directory and reports one
  event's envelope. Measuring a 20-frame window directly refuses, correctly.

---

## 7. What I could not close

1. **The enemy-shot envelope.** 0.367 s against 2.24–5.04 s. Not closable from this lane without
   breaking gap 5 — the ask is in §2.4 with the three constants named. The size half is done.
2. **The arcade's missile-trail persistence.** No number. §4.
3. **The arcade's post-kill smoke DECAY.** I have its colour, one peak area and a by-eye lower
   bound on its life. Its envelope needs a mask that separates white smoke from stage-1 cloud
   banks, and I did not build one.
4. **Whether our explosion's peak area is right.** Blind spot 1 — it needs a depth-matched pair
   and nothing in the repo has one.
5. **`tools/fx_palette_probe.mjs` does not cover the new `kill` textures.** Verified from the
   pixels instead; the accessor is exported and the one-line probe addition is an ask.
6. **A PEAK threshold.** §6.1 proves one is needed — no time statistic separates our build from
   a fireball a third its size — and §6.2 proves the obvious one is dangerous: a peak clause
   under r9 gates *the orange band's area*, which is 54.9 % of our fireball and an unknown
   share of the arcade's. The arcade's own peak spans **0.83–6.03 % over five events in one
   stage**, a factor of 7.3, because peak scales with the killed target's depth. I tried to
   remove that confound with a depth-matched ratio (fireball peak ÷ the killed aircraft's
   screen area) and **failed on the arcade side**: the stage-1 kills I can decode detonate at
   or behind the player, where the target is not separable in the frames before first light
   (`arc-eventA-target.png` — eighteen consecutive 2× frames, and what is in them is the
   player's own nozzles). **Reported as OPEN rather than thresholded.**
7. **The arcade's starburst is much finer than ours** — a dense spray of thin rays against our 11
   spikes at `SPIKE_HALF_W = 0.058`. Visible in every arcade strip here. That is a **silhouette**
   defect, not an envelope one, and I left it alone rather than changing the art this round on an
   observation I did not quantify.

## 8. Evidence index — everything under `tools/out/envelope-r10/`

| path | what |
|---|---|
| `MOTION-explosion-arcade-vs-ours.png` | the headline side-by-side, 13 consecutive-frame samples |
| `arc-expl-96/` `arc-expl-99/` `arc-smoke-99/` `arc-shots-330/` `arc-vulcan-214/` | arcade consecutive-frame decodes, 90–180 frames each |
| `arc-expl-99-opensea.png` | **the open-sea kill that unblocked the smoke measurement** |
| `arc-expl-96-roi-strip.png` | arcade explosion, crop + r9 mask overlay, 18 frames — the crop-and-look for §1.1 |
| `arc-expl-96-look.png`, `arc-smoke-persist.png` | stage digit and smoke persistence, by eye |
| `arc-shots-330-strip.png`, `arc-shots-330-zoom.png` | the enemy-shot train, whole frame and 2× |
| `arc-vulcan-nose.png`, `arc-vulcan-nose2.png` | the muzzle, 2× and 3×, 16 consecutive frames |
| `ours-base-demo2/` + `.csv` | ours BEFORE, `8725647`, 240 consecutive ticks, with manifest |
| `ours-final-insitu/` + `.csv` | ours AFTER, final tree, 600 consecutive ticks, with manifest |
| `ours-r10c-harness/` | ours AFTER, `?combatexpl=1` isolation, 36 consecutive ticks |
| `ours-r10-kill-strip.png` | ours, one kill: flash → red → peach smoke |
| `critA2/` | the 8 frames Criterion A and `assert_population` were run on |
| `death-after-strip.png`, `death-final-strip.png` | the death sequence, uncapped vs capped smoke, 140 consecutive ticks |
| `critA-death/` | the 7 death frames Criterion A was run on |
| `arm-plateau/` `arm-puff/` `arm-shipped/` | the known-quality triple, §6.1 — matched harness, matched depth, matched seed |
| `arc-eventD-boundary.png`, `arc-eventB-tracked.png` | the attribution failure and the tracker that punched holes, §6.3 |
| `arc-event-longhorizon.png` | the 28-frame "horizon" that was the detector following the player's nozzles, §6.3 |
| `ours-competitor-set.png` | our own competitor set in one pre-event frame — the two largest are the player's nozzles |
| `dbg-diff0.png`, `dbg-diff0b.png` | the tree-moved-under-me evidence in §0 |

# R8 — presentation / off-ladder lane

**Scope**: the three objects left off the arcade's hardware colour ladder (title, death hulk,
carrier launch) and **judge-R7 gap 3**, Criterion A failing at every stage boundary.

**Files changed**: `src/ui/ladder.js` (new), `src/game/flow/titleScreen.js`,
`src/game/flow/cards.js`, `src/game/flow/deathSequence.js`, `src/game/flow/carrier.js`
(granted by the TL this round, palette constants only). **No commit, no stash, no checkout.**

**Captures**: all mine, under `tools/out/ladder-r8/`. **819 frames swept: 0 black frames, 0
within-directory duplicates.** Cross-directory duplicates are accounted for below — they are
real and they change what some of these numbers are worth.

---

## 0. Instruments, and the controls they passed before any number below was trusted

Two independent implementations, deliberately: a Python one over decimated PNGs and an in-page
JavaScript one over `gl.readPixels`. They have to agree before either is quoted.

| instrument | control | result |
|---|---|---|
| `tools/out/ladder-r8/inst.py` | `--selftest`: flat fill, one planted off-ladder pixel (found, located to the exact pixel), a uniform-random field, a nearest-3x round trip, **a bilinear 3x control that must be REJECTED**, and the two ladder tables (`src/ui/ladder.js`, `tools/art/ladder.js`) asserted identical | **PASS**, including the negative control |
| `src/ui/ladder.js`'s own `assertOnLadder()` | fed known-bad input (`#ff1300`) | **throws, naming the colour and its nearest rung** — the guard is not a blind gate |
| same | both true-native arcade stills | **desert 138 colours / 31 channel values / 0 off-ladder; night 79 / 17 / 0** — it agrees with the hardware on the hardware's own output and reproduces REFERENCE.md's published figures exactly |
| `tools/out/ladder-r8/probe.mjs` (per-tick, in-page) | matched against `inst.py` on dumped ticks | **13/13 exact** across `before-probe-validate` (5), `after-boundary` (5) and `after-boundary-demo` (3) — A1, A2 and the off-ladder value list all identical on every one |
| `tools/measure_criterion_ab.py` (the project's existing instrument) | `--selftest` | PASS, 10/10 synthetics and both arcade frames |
| block-uniformity check | every capture | **worst within-3x3 spread 0 over all 819 frames** — the 960x672 captures decimate to true native losslessly |

**And the reproduction, before changing anything.** On a clean worktree of `82365e9` I reproduce
the R7 art critique's three figures exactly:

| object | critique | this lane |
|---|---|---|
| title | 26 colours / 53 channel values / 44 off-ladder | **26 / 53 / 44**, identical on every frame |
| death hulk | 47 channel values, 19 off-ladder, 61–72 colours, rows 108–146 cols 120–202 | **47 / 19 / 61–72**, same rows and columns, **byte-identical off-ladder hex list** |
| carrier launch | 19–31 channel values, 1–13 off-ladder | **19–31 / 1–13** |

---

## 1. The per-object census, before and after

"chan" is Criterion A2 — the **union** of the three channels' value sets, gate ≤ 32.

| object | capture | colours | **chan** | off-ladder | over gate |
|---|---|---|---|---|---|
| **title** before | `before-title-{7,31,97}` | 26 | **53** | **44** | **8/8** |
| **title** after | `after2-title-{7,31,97}` | **11** | **15** | **0** | **0/8** |
| **death hulk** before | `before-death-113` (the judge's own arm) | 61–72 | **26–47** | **1–19** | **2/5** |
| **death hulk** after | `after-death-113c` | 61–71 | **23–28** | **1** | **0/5** |
| **death cycle** before | `before-forcedeath-{7,13,29}`, 120 frames across the whole cycle at three spacings | 52–71 | **25–47** | **1–19** | **43/120** |
| **death cycle** after | `after-forcedeath-{7,29}` + `after2-forcedeath-13` | 52–71 | **22–29** | **1** | **0/120** |
| **carrier launch** before | `before-launch-{3,5,11}` | 47–79 | **19–31** | **1–13** | 0/120 |
| **carrier launch** after | `after-launch-{3,5,11}` | 47–68 | **19–26** | **1** | 0/120 |
| **tally card, isolated** before | `before-tally-{5,23,61}` | 55–73 | **29–46** | **1–19** | 3/24 |
| **tally card, isolated** after | `after-tally-{5,23,61}` | 54–72 | **24–30** | **1** | **0/24** |

**The single remaining off-ladder value everywhere is 159, and it is not a defect.** It is the
stage-1 sky `#009fff`; the arcade's own measured stage-1 sky is `#009eff` — **158, equally off
the ladder** — and REFERENCE.md records that there is no native stage-1 frame, so both sides
carry the video chain's level expansion. Left alone deliberately. Stage 1 therefore lands at a
ceiling of 32 and stages 2–3 at 31.

**Why the ceiling is structural now, which is the point of the whole exercise.** A2 is a set
cardinality over a 31-member ladder. Once every composited element draws only ladder values, the
frame **cannot** exceed 31 however many colours it holds. The gate stops being something to
measure and hope about. That is what `src/ui/ladder.js`'s `assertOnLadder()` now enforces at
module load, on the authored constants, in four files — the inputs, not the output.

### Two things in that table that are not what they look like

**The tally card passes in isolation and fails in play, and that is exactly ledger row 21
again.** `?debugtally=1` over an otherwise empty sky reads A2 **31** before the fix — under the
gate. The card's six off-ladder values only break it when they land on top of a frame that
already carries 25–30 values of ordinary play. **An isolation harness could not have found gap
3**, and I want that on the record because this lane's own first instinct was to reach for one.

**The title's 24 frames are 5 observations.** Across three tick spacings the 24 captured frames
hold **5 unique images**, because the title is still static — the art critique's "6
byte-identical frames over 100 ticks", confirmed. The figure is solid (the screen does not
change) but nobody should quote it as n = 24.

---

## 2. Gap 3 — the primary evidence

**Reproduction asked for: a capture crossing at least two stage boundaries, ≤32 on every frame
including the transition ticks.**

**4 200 consecutive ticks (70.0 s), Criterion A computed on EVERY tick**, `?fixed=1&seed=1&
invincible=1`, crossing the boundaries at tick 1 920 (32 s) and tick 3 840 (64 s), flow state
and stage index logged per tick.

| | ticks over the A2 gate | A2 min–max | off-ladder max |
|---|---|---|---|
| **before** (`tools/out/ladder-r8/before-boundary`, clean `82365e9`) | **118 / 4 200 (2.81 %)** | 25–**36** | 6 |
| **after** (`tools/out/ladder-r8/after-boundary`) | **0 / 4 200** | 22–**30** | 1 |

The before run localises the defect harder than the judge's own figure did. The 118 ticks are
**two contiguous runs of exactly 59**, beginning at tick **1 921** and tick **3 842** — one tick
after each boundary — and nowhere else in the run. The off-ladder values across both runs are

```
[19, 192, 198, 220, 238, 248]
```

which are precisely and only `#ff1300` (19), `#00dcc6` (198, 220) and `#eec0f8` (192, 238, 248):
`CARD_RED`, `CARD_CYAN`, `STAGE_LAVENDER` in `cards.js`. Not an alpha ramp, not glyph edges, not
the HUD. **Three authored constants.** 2.81 % against the judge's 2.80 % over 12 000 ticks, and
~59 ticks per transition against the judge's ~59.

Three runs on the current tree, each 4 200 ticks, Criterion A on every tick:

| run | population (states reached, read from the sim per tick) | ticks over gate | A2 range |
|---|---|---|---|
| `after-boundary` (`?invincible=1`) | `flight` stages 0→1→2: **two stage boundaries, two tally cards** | **0 / 4 200** | 22–30 |
| `after-boundary-demo` (`?demo=1`) | `launch` → `flight` → `death` → `flight` stage 1 → `death`: **the carrier launch, combat with its explosions, two deaths and a stage boundary in one continuous run** | **0 / 4 200** | 19–31 |
| `after-boundary-deaths` (`?seed=2`, **no** `invincible`) | `flight` → `death` → `continue`: the hulk, the READY card and the continue card | **0 / 4 200** | 19–29 |

That is **12 600 consecutive ticks (210 s) with Criterion A computed on every one of them, zero
over the gate**, across three populations that between them contain every object this lane owns.

The matched-tick cross-check: at ticks 1 925 and 1 950 — mid-tally, stage 1 — both instruments
independently read **A2 = 29 with ZERO off-ladder values**. Before, the same ticks read 35–36
with six.

---

## 3. What was actually wrong, per object

### 3.1 The title: more than half of it was antialiasing, not palette

The critique prescribed "snapping the whole screen, mechanical and visually nil".

> **The art critique's prescription would have fixed half the defect and the rest would have
> regenerated off the snapped colours on every redraw** — a fix that measures as working and
> silently re-breaks.

(TL ruling, R8: that sentence is kept verbatim because it belongs with CLAUDE.md's standing
**"Canvas2D fractional positions silently antialias chunky pixel art into blur"** lesson, of
which this is a live instance — and because the failure mode it names is the dangerous one. A
palette-only fix here would have measured as a *reduction* in off-ladder count, passed any
review that read the count, and left the generator of the other 24 values running.)

The screen holds **26 colours and only 12 of them are authored constants.** The other **14 are
exact 50/50 blends of pairs of them**, over **867 px**, carrying **24 of the 44 off-ladder
channel values**:

| blend | = |
|---|---|
| `#97a5e6` | (`SPHERE` + `SPHERE_HI`) / 2, to the level |
| `#5969bb` | (`SPHERE` + `SPHERE_RIM`) / 2 |
| `#39426c` | (`BLACK` + `SPHERE`) / 2 |
| `#ff5000` | (`MOLTEN` + `MOLTEN_HOT`) / 2 |
| …and ten more | |

Cause, one expression: `drawSphereII`'s row stagger is `(row % 2) * (SPHERE_PITCH / 2)` = **3.5**,
so every `fillRect` in the sphere drawing on half the rows landed on a half-pixel x and Canvas2D
feathered both vertical edges. **CLAUDE.md's named "Canvas2D fractional positions silently
antialias chunky pixel art into blur"**, and it is the same class as the alpha ramp the fx lane
killed in R7: *an operator that mixes authored colours puts new colours on screen no matter how
clean the authored ones are.*

Fixed to an integer stagger (3 — against a 7 px pitch, 3-vs-4 is half a pixel of asymmetry in a
7 px ball, below what native resolution can express) plus the palette snap. **26 → 11 colours,
53 → 15 channel values, 44 → 0 off-ladder.** Side-by-side at 3x:
`ladder-01-title-BEFORE-top-AFTER-bot-3x.png`, spheres at 6x:
`ladder-02-title-spheres-BEFORE-top-AFTER-bot-6x.png`. **No legibility is lost** — the balls read
as packed balls in both and the edges are cleaner, not softer.

### 3.2 The death hulk — and it is also the R7 judge's §2 claim 1b, confirmed

`deathSequence.js:158` ran `s.material.color.setRGB(...BURNT_TINT)` with
`BURNT_TINT = [0.55, 0.12, 0.08]` — **multiplying a quantized authored sheet by an arbitrary
float triple, which cannot land on the ladder.** It was the last `material.color` multiply on an
authored sheet anywhere in `src/`, and the last `setRGB` without a colour space on the render
path, which is CLAUDE.md's first named recurring bug.

**The art critique's correction to the judge is confirmed independently here.** I re-ran the
judge's `?combatonly=enemies,shots` arm at spacing 113 and reproduce **47 on `frame-0003`**, with
the off-ladder pixels at rows 108–146, cols 120–202, and the off-ladder hex list byte-identical
to the hulk's. That arm enables enemy shots and **no vulcan**, so the player is shot down and the
hulk enters frame. It is not an enemy airframe, and the remedy the misdiagnosis implies —
re-palette the enemy sheet — would have fixed neither finding.

**The fix is a palette remap, copying the explosion's model: a palette sequence, never a blend.**
Every opaque pixel of whichever sheet is live is mapped by luminance into a cached canvas
texture; nothing blends at any point, so the hulk's rendered pixels are a subset of a 21-value
on-ladder set *by construction*.

**And the hulk now has an arcade target for the first time.** Contiguous decode of
`ab2-gameplay.mp4` t202.4–206.8 at 30.00 fps — **133 frames, 0 duplicates**, which matters
because single-frame `-ss` seeks on this file return duplicates and that trap has cost this
project a frame before. Largest red-dominant component, HUD rows excluded, 23 frames at 0.1 s
spacing, **n = 12 297 px**:

```
R   p5 36 | p25 51 | p50 65 | p75 84 | p95 144 | max 191
mean G 7.0, mean B 6.3, mean S 0.93; 52-56% of pixels are exactly G = B = 0
```

**The arcade's hulk is pure red and DARK — median 65/255.** Ours was a desaturated mid-brown with
a median near 180 and S ≈ 0.7: wrong in value by ~2.7x and wrong in hue family. **Stage licence:
the HUD digit was read out of the frame itself at 8x and reads 3** — a night stage. MEASURED for
night, EXTRAPOLATED to daylight; `ab2-gameplay.mp4` has no stage map and this repo holds no
daylight death instance. Logged as an acquisition item.

**Two attempts failed before the shipped one, and each was caught by measuring the result rather
than by arguing:**

1. **Fixed luminance cuts** (Y = 90/150/200/235): returned **R median 148 against the arcade's
   65**. The day sheet puts ~48 % of its airframe above V 0.80, so any fixed cut sends that bulk
   to the top of the ramp.
2. **Matching the arcade's nearest-rung shares**: median 66 vs 65 and quartiles 49/82 vs 51/84 —
   but the brightest pixel came out at **99 where the arcade reaches 191**, because matching a
   codec-smeared continuum with nine flat tones forces the top tone down. It bought the
   percentile and lost the highlight, which is this project's named failure mode in miniature.

**What ships is a histogram match**: each *distinct* source luminance (not each pixel — splitting
one authored tone across two rungs would make noise where the sheet has flat shading) is placed
at the midpoint of its own share interval and given the arcade hulk's own R at that position.
Monotonic, so the sheet's value order survives; sheet-agnostic, which matters because the sprite
lane is changing the player sheets this same round.

| | p5 | p25 | p50 | p75 | p95 | max |
|---|---|---|---|---|---|---|
| **arcade** (n = 12 297) | 36 | 51 | 65 | 84 | 144 | 191 |
| **ours after** (frame-0003, 773 px) | **41** | **49** | **66** | **82** | 123 | 123 |
| ours before | ~160 | ~175 | ~180 | ~190 | ~196 | 196 |

Four of six percentiles land within one ladder rung. **The bright tail is still short and I am
not going to hide it**: p95 123 against 144 and max 123 against 191, because the sheet's
brightest authored tone is 23 % of its pixels and cannot be placed in the arcade's top 5 %
without splitting it. Closing it needs a brighter authored tone in the sheet, not a change here.
Crops: `ladder-03-hulk-BEFORE-top-AFTER-bot-5x.png` against
`ladder-06-hulk-ARCADE-t204.73-stage3-5x.png`.

### 3.3 The carrier and the cards: palette only

Six constants in `carrier.js` and eight in `cards.js`, snapped. Nothing structural moved, and the
carrier is visually identical: `ladder-05-carrier-BEFORE-top-AFTER-bot-3x.png`.

**One method decision worth stating, because I tried the clever thing first and withdrew it.**
All of these constants were read off video frames, and REFERENCE.md documents that the video
chain expands levels. The tempting fix is to divide the expansion back out. **REFERENCE's own two
measurements of that expansion disagree about its slope**: native/video `#f7f7f7` → `#ffffff` is
×0.969, while stage 2's sky `#e67300` → `#f27500` is ×0.950 ("12 levels brighter in R", that
document's words). A linear de-expansion is therefore a model this repo's own data contradicts. I
wrote it, measured it, and replaced it with measurements only:

1. where REFERENCE publishes the **native counterpart of that exact ink**, the published native
   value wins — board white `#f5f2f6` → `#f7f7f7`, board red `#ff1600`/`#ff1500`/`#ff1300` →
   `#f70000` (and `cards.js`'s own comment already said the tally label was "the same red as the
   HUD emblems", which `hud.js` draws as `#f70000`);
2. everything else gets the **minimal nearest-rung snap and nothing inferred** — deltas 1–4
   levels, which REFERENCE itself calls visually nil.

`COIN_RED` moved from `#ff0000` to `#f70000` although it was **already on the ladder**. That one
is not forced by the gate; it is here because the build should not carry two different reds for
one board ink. Flagged as a judgement call, not a measurement.

**Geometry in `cards.js` is byte-identical to R5c's.** Every measured position, advance,
alignment and glyph scale is unchanged: CONTINUE PLAY still lands exact on both edges, INSERT
COIN still measures 87 native px against 87 predicted, READY's right edge is unmoved.

---

## 4. The HUD re-check — and the published 1 118 / 1 118 does not reproduce as published

Asked for, run, and it turned up something.

**`tools/measure_hud_consensus.py` as its own docstring prescribes it (`throttle=0.5634`) returns
1 114 / 1 118 — on MY tree and on clean `82365e9` alike, from BYTE-IDENTICAL probe PNGs**
(md5 `b21ecb82…` both). So my change costs the HUD exactly nothing, which is the question that
was asked. But the published figure is 1 118.

The four missing pixels are all at **column 96** of the throttle bar. The tool derives
`f = 0.5634` from "the arcade fills the bar to x96" via `drawThrottleBar`'s
`end = 56 + round(71·f)` — but that `end` is **exclusive**, as hud.js's own comment says, so
`f = 0.5634` gives `end = 96` and paints `[56, 95]`, one column short of the arcade. Driving the
same harness at **`f = 0.5774`** (`end = 97`) returns:

```
SCORE emblem       610 /  610
HIT emblem         196 /  196
throttle widget    312 /  312
TOTAL             1118 / 1118
```

**The HUD bitmap is pixel-exact. The instrument's driving parameter was one column off**, and it
has been so since the figure was first published. I have not changed the tool — `tools/` is the
criteria lane's — and I did not simply adopt the f that gives the round number without saying
why. Raised in `ask-ladder.md`.

**Reticle / authored-canvas gate**, `tools/hud_palette_probe.mjs`, 120 (state × angle) canvases:

```
partial-alpha pixels, total .............. 0
off-palette opaque colours, union ........ 0
channel values over all canvases ......... 17, every one on the ladder
GATE  partial-alpha == 0  AND  off-palette == 0   -> PASS
```

---

## 5. Capture hygiene, stated rather than assumed

- **819 frames swept. 0 black frames. 0 within-directory duplicates.**
- **98 cross-directory duplicate groups, all accounted for**, and two of them change what a
  number is worth:
  - `after-death-113` / `-113b` / `-113c` are three iterations of one arm while the remap was
    being calibrated. **Only `-113c` is current; `-113` and `-113b` are superseded and must not
    enter any pooled figure.**
  - the three tick spacings sample one deterministic run, so they share ticks. Per group:
    **title 24 frames → 5 unique** (static screen); **launch 120 → 106 unique**; **tally
    24 → 24 unique**.
- **Controls, excluded from every figure above**: `hud-consensus-82365e9` (the clean-baseline
  HUD probe), `hud-consensus-f5774` (the exclusive-edge hypothesis test), `before-probe-validate`
  (the two-instrument agreement check) and `final-smoke-control`. The first three were not named
  `-control` at creation, which the standing rule asks for; they are named here instead.
- **One near-miss worth recording**, because it is the shape of a false alarm this project has
  paid for before. Mid-run I saw `after-boundary-demo/tick-01930.png` at **0 bytes** and wrote it
  down as a killed run. It was a write in progress. The run completed, the file is 54 KB, and its
  three dumps cross-validate against the per-tick probe **3/3 exact** (A1 68/53/79, A2 26/26/28,
  off-ladder `[159]`/`[159]`/`[]` — and the two `death`-state dumps are the burnt hulk reading 26
  with no off-ladder value). Looked before publishing; the finding was mine and it was wrong.
- **Tree state.** Every "before" figure is from a **clean worktree of `82365e9`**, so it is
  reproducible by anyone. "After" figures were taken twice: on the shared working tree (three
  other lanes live) **and** on a second worktree of `82365e9` carrying **only my five files**, to
  separate my change from theirs. The two agree on every verdict; the shared tree reads 1–4
  channel values *lower* across the board, which is the other lanes' palette work, not mine:

  | object | after, my files only | after, shared tree |
  |---|---|---|
  | title | 11 / 15 / 0 | 11 / 15 / 0 |
  | death hulk | 26–29 / off 1 | 23–28 / off 1 |
  | carrier launch | 19–30 / off 1 | 19–26 / off 1 |
  | tally | 26–31 / off 1 | 24–30 / off 1 |

  The isolation worktree carries one thing that is not mine: `cards.js` also holds the flow
  lane's `drawStageNumber()` helper, which landed in that file before the TL resolved the
  ownership overlap. It is in both columns.

---

## 6. Left open

1. **The hulk's bright tail**, §3.2: p95 123 against the arcade's 144, max 123 against 191.
   Needs a brighter authored tone in the player sheet; not fixable in `deathSequence.js`.
2. **The hulk's palette is licensed for NIGHT.** The only death instances in this repo are in
   `ab2-gameplay.mp4`, and the one I measured reads stage digit **3**. A daylight death instance
   is an acquisition item.
3. **The title is still static** — 5 unique frames over 100 ticks, flagged in R5, R6, R7 and now
   R8. Not in this lane's scope this round, but it is the reason the title's census is n = 5.
4. **The title lettering is still ~23 % short** (R6 §6.10, re-confirmed by the R7 critique and
   untouched here). Geometry, not palette; I stayed inside the brief rather than widening it.
5. **`carrier.js:357` still calls `addKeyline(buf, KEYLINE)`** — **HANDED ON, not open on this
   lane (TL ruling, R8).** The keyline *colour* is now on the ladder. Whether a **ship** should
   carry a 1-px outline at all is a silhouette question against `carrier-prelaunch-t84.png`, and
   removing an outline changes the silhouette's measured extent — which is the quantity the
   carrier is ranked on (aspect 1.54 against the arcade's 3.22). That is outside a palette-only
   grant, so it is deliberately **not actioned**. Carry it to whoever gets the carrier's
   silhouette; do not let it fall between two grants again, which is how the death hulk survived
   three rounds.
6. **The `©SEGA 1987` / `SEGA`-on-deck inconsistency** the art critique flagged (`titleScreen.js`
   prints the former; `carrier.js` explicitly declines the latter citing the same rule).
   **TL ruling, R8: leave it, and leave it recorded as an inconsistency with NO arcade
   adjudication.** Neither spelling is measured from a frame that settles it, and inventing
   consistency is how a MEASURED tag gets attached to a guess — this project has retired two
   "MEASURED" negatives exactly that way. Untouched in both directions.

## 7. TL rulings on this report, recorded so the next round does not re-open them

| | ruling |
|---|---|
| title half-pixel stagger | **this is the finding of the report, not the palette snap.** Sentence kept verbatim in §3.1 and filed against CLAUDE.md's Canvas2D fractional-position lesson |
| HUD `f` off-by-one | **the criteria lane's**, correctly left untouched here. A1 routed to criteria. Consequence worth stating: every prior "1 118 / 1 118" was either taken at a different `f` than the docstring prescribes, or was four short and nobody noticed |
| `carrier.js:357` keyline | **stays untouched**; logged as handed-on, not open on this lane — see item 5 |
| `©SEGA` inconsistency | **leave it, recorded as unadjudicated** — see item 6 |
| the withdrawn de-expansion | **kept as the round's method result.** A2 proposing "published native where it exists, minimal nearest-rung snap otherwise" as the standing rule is the correct escalation |

**Independent verification of gap 3 by the TL**, not a re-read of this table: frames captured at
ticks **1 930, 1 950 and 1 970** — inside the 59-tick window localised one tick past the first
boundary — read **24, 28 and 27** channel values against the ≤32 gate, plus twelve frames across
the first stage span with a worst case of 28.

One small disagreement, stated rather than smoothed over: **this lane's own per-tick probe reads
29 at tick 1 950 where the TL's capture reads 28.** One channel value, same verdict, and the most
likely cause is already quantified in §5 — the shared tree moved under both of us, and the
isolation-vs-shared-tree spread on these same objects is 1–4 values in exactly that direction.
It has **not** been run to ground, and by this project's own rule a stable small disagreement is
usually two definitions of one statistic rather than noise, so it is recorded as open rather than
waved through. It does not touch any pass/fail in this report: nothing in 12 600 ticks came
within two values of the gate.

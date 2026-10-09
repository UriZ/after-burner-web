# R7 — sprite-art lane delivery

Files owned and touched: `src/render/spriteFactory.js`, `src/entities/enemySprite.js`
(untouched this round), `tools/art/**`, `src/assets/sprites/**`, and the carrier art in
`src/game/flow/carrier.js`. Nothing else in `src/` was edited. No commit, no stash, no
checkout, no push. Captures all under `tools/out/sprite-r7/`.

**Tree state for every our-side figure below**: the shared R7 working tree, started from
`e8fed58`, with four other lanes live in it. `git status` at the time of the final capture
shows concurrent edits in `effects/**`, `weapons/**`, `game/stage.js`, `render/ground.js`,
`entities/player.js`, `game/flow/{deathSequence,demoTimeline}.js` that are **not mine**. The
only files I changed under `src/` are `render/spriteFactory.js`, `game/flow/carrier.js` and
the two player PNGs. Per REFERENCE.md's "what a complete citation is", re-measure before
quoting any of this against a commit.

Assignment: judge gap **4**, art critique rank **2** (treated as one job, which is what they
are), and gap **10** (carrier art, title letterforms).

---

## 0. Headline

| | R6 | **R7** | arcade, same instrument |
|---|---|---|---|
| day jet, reading **A** (REFERENCE's VALUE-STAT as published) | **0.643** | **0.839** | **0.839** |
| day jet, reading **B** (same + a V floor) | 0.839 | **1.000** | **1.000** |
| day jet, reading **C** (R6's V-CENSUS) | 0.839 | **0.969** | **0.969** |
| rim: share of the jet's outline that is near-black | **97.3 %** (art critic) | **0.0 %** | **0.0 %** |
| airframe tones | 4 | **6** | 9 (7 of them >0.1 % of area) |
| `#f7e6b5`, the arcade's second-largest airframe tone | **0.0 %** | **18.7 %** | 23.7 % |
| black as a share of the airframe mask | **32.8 %** | **10.4 %** | 18.0 % |

**The judge's gap-4 reproduction is satisfied.** "Our daylight airframe and the arcade's
native desert crop measured with one operator, our median within 0.05 of the arcade's":
measured with **all three** operators, on one instrument, the difference is **0.000** on every
one of them.

The night jet and all four silhouette discriminators are reported separately below, including
the two places where R7 is *not* at the arcade's figure and one place where a passing
discriminator is now unmeasurable under its published operator.

---

## 1. The instrument, and its controls

`tools/art/value_census.py`, new this round, `--selftest` PASS. It exists because the single
most consequential correction in the R6 report was that two columns of one table had been
produced by two different operators, so **this tool never reports one median**. It reports the
same crop under all three readings of VALUE-STAT, always, side by side:

| | definition | what it does with the keyline |
|---|---|---|
| **A** | `S<0.25`, **no V floor** — REFERENCE.md's published text, read literally | counts black |
| **B** | `S<0.25`, `V>0.08` | drops black |
| **C** | `S<0.35`, `V>0.08` — R6's V-CENSUS | drops black, keeps a wider S band |

Saturation convention, stated because it *is* the disagreement: `S = (max−min)/max`, and
`S := 0` where `max == 0`. Pure black is therefore achromatic and is in reading A's
population. That is exactly what makes A sensitive to keyline **area**, which is this round's
lever.

**Self-test, on synthetic input with a known answer** (six checks, all passing): a grey ramp
whose median must be its middle value exactly; the V floor dropping exactly the black pixel
and shifting the median by the right amount; saturated red rejected by every reading;
`#c5c5ad` reading V 0.7725 exactly (the constant the retired R4 ceiling was built on, so a
regression here would resurrect it); the 4-adjacent rim of a 3×3 block being 12 px; and
`largest_component` picking the larger of two blobs and nothing else.

**One of my own controls was wrong and the tool was right.** I wrote a positive control
asserting that ringing a bright 10×10 block in black "collapses" reading A's median. It does
not, and it should not: a 1 px ring is 36 % of the pixels and **a median cannot see a 36 %
minority**. The control is now three checks that assert what a median can actually see — A
unmoved by the 36 % ring, A's *share* statistic moving to exactly 0.64, and A collapsing only
once black is the majority — and the reasoning is a comment in the file, because it is also
the right way to think about reading A: it is a step function at 50 % black, not a gradual one.

**Cross-validation against the R6 judge.** Pointed at the arcade's native desert crop, this
tool returns **0.839 / 1.000 / 0.969** — the judge's three figures, to three decimals, on a
fourth independent implementation. That is the strongest statement I can make about the
instrument, and it is why the rest of this report quotes it.

**Mask dumped and looked at.** `tools/out/sprite-r7/arcade/arcade-desert-jet-masked-8x.png`
is the aircraft and nothing else: 751 px in a 93×53 bbox inside a 97×58 box, with the warm
rim and the nozzle oranges correctly excluded as chromatic.

---

## 2. GAP 4 and ART-CRITIQUE RANK 2 — one defect, and it is area

### 2.1 What the arcade actually does, measured

`reference/ab2-arcade-desert.png` x[85,182) y[82,140), **HUD stage digit 2**, true native
320×224 so no video blur. Airframe = `S<0.35` + largest 8-connected component, 751 px.

| tone | V | S | share of airframe |
|---|---|---|---|
| `#ffffef` | 1.000 | 0.063 | **31.8 %** |
| `#f7e6b5` | 0.969 | 0.267 | **23.7 %** |
| `#000000` | 0.000 | 0.000 | **18.0 %** |
| `#a48484` | 0.643 | 0.195 | 12.8 % |
| `#d6d6a4` | 0.839 | 0.234 | 7.5 % |
| `#ceb59c` | 0.808 | 0.243 | 5.5 % |
| `#948463` / `#ffffff` / `#f7f7f7` | — | — | 0.4 / 0.3 / 0.1 % |

And the **rim** — the pixels 4-adjacent to that mask and outside it, 444 px:

| | `#840000` | desert ground | **near-black (V≤0.12)** |
|---|---|---|---|
| arcade | **49.5 %** | 24.8 % | **0.0 %** |
| ours, R6 | 0 % | — | 0 % *(because our black was INSIDE the mask — it was the ring)* |

**The arcade's daylight jet has no black outline at all. Its black is two nozzle discs**, and
the mask dump shows exactly that.

`#840000` is the sprite's own colour, not a stage tint and not the ground: it occurs **224
times in the whole 320×224 frame and 222 of those are on the aircraft** (the other 2 are the
wing continuing past the crop box). `tools/out/sprite-r7/arcade/desert-840000-map-8x.png`
maps every one of them — a one-sided dark-red keyline down the **lower** edge of every
element, upper edges bare. **Stage licence**: measured on a digit-2 frame, licensed for
daylight stages; night keeps its own measured darkest blue-grey as its rim, which is what the
arcade's night palette does.

### 2.2 Why "delete the black keyline" taken literally would have overshot

Working the three medians back through those shares gives a hard window rather than a taste.
With the other rungs at the arcade's shares, **reading A's median lands on 0.839 exactly when
black is between 6.5 % and 21.5 % of the airframe mask.** Below 6.5 % it jumps to 1.000;
above 21.5 % it falls to 0.643, which is where R6 sat at 32.8 %.

I hit that both ways during the round and it is worth recording, because it is the one place
a plausible instruction would have made the number worse while the art got better. An
intermediate R7 draft that rounded the nozzles without thickening their rings dropped black
to **8.8 %** and reading A read **1.000** — *overshooting the arcade by 0.161 while every
other share was closer to the arcade than R6's.* The fix is not "less black", it is **black
in the right place**: off the perimeter, into the nozzle discs, which is where the arcade's
is and what the art critic asked for in the same sentence.

### 2.3 What shipped

**Palette** (`PLAYER` in `tools/art/palettes.js`, mirrored as `PLAYER_PALETTE_DAY`):

```
rimline     #840000  V 0.518  MEASURED — 49.5 % of the arcade's rim; replaces the ring
keyline     #000000           nozzle throats and the engine notch ONLY
lightTop    #ffffef  V 1.000  MEASURED, arcade dominant
lightNeutral#f7e6b5  V 0.969  MEASURED, arcade SECOND tone — R6 carried none of it
midNeutral  #d6d6a4  V 0.839  MEASURED
warmMid     #ceb59c  V 0.808  MEASURED — new to the sheet
coolDark    #a48484  V 0.643  MEASURED
canopy / flame / flameCore    unchanged
```

`deepShadow #635252` (V 0.388) is **deleted**: the arcade's whole daylight airframe has
nothing darker than `#948463` outside the nozzle throats, and that hex is on no arcade ladder
I can find on the sprite.

**Ten colours on the day sheet, nine on the night sheet**, up from eight. Raised deliberately,
with the measurement: REFERENCE.md's "aircraft sit at 5–8" was derived from the **night** jet
(exactly 8) and the cloud puff (5), and the *same table's own daylight-jet row* records **14
total, 7 covering 95 %**. An isolated census of that crop returns 9 airframe tones plus the
`#840000` rim plus three nozzle oranges. Ten is **below** the arcade's own daylight count.
Ledger row asked for in `ask-sprite-art.md` A1.

**Drawing.** Four changes, each read off a crop before it was measured:

1. **One-sided rim.** `canvas.outlineSouth()` / `addUnderKeyline()` — a new primitive that
   marks an empty pixel when any of its **three northern** neighbours is opaque (three, not
   one, so the line survives a steep diagonal). Replaces the full 8-adjacent ring. The old
   `outline4` / `addKeyline` are untouched and still used by every other sprite.
2. **The blade's value is inverted.** R6 drew the fin blades in the ramp's shadow tone with a
   1 px light specular. Put our cell beside `reference/stage3-night-level-t175.png` at 4× and
   the arcade's blades are the *brightest* element on the aircraft. They are now the second
   rung with a light specular down the near-vertical outer edge, a dark lip down the raked
   inner edge, and a one-rung darkening toward the root where the crop runs them into the
   body's shadow. At ~140 px for the pair this was also the single biggest block of shadow
   tone on the sprite.
3. **The wing is three chordwise bands**, not one plank: a bright leading-edge band, a cream
   panel, a thin warm underside, a 1 px dark trailing lip. The art critic's reading of R6 was
   "three flat slabs in near-equal thirds"; this is the fix for the "slabs" half.
4. **The nacelles are discs with a big hot core.** The octagon `cut` is now ~0.58 of the
   shorter radius — the value that turns a cut square into a *regular* octagon. R6 and R7's
   first draft used ~0.4, and cropping at 8× shows it plainly: the nozzles read as orange
   **squares**. The pod grew strictly downward (top edge held at ~17.8 local) because R6
   established by measurement that a pod whose top enters the fin band makes JET-SIL compute
   `cant` between a blade and a pod and return a stable, reproducible, wrong 1.13.

### 2.4 Results — day

**Authored sheet, level cell** (mask 817 px):

| | A | B | C |
|---|---|---|---|
| ours | **0.839** | **1.000** | **0.969** |
| arcade native desert | 0.839 | 1.000 | 0.969 |

**In-game**, jet-on/jet-off difference mask (colour-blind, operator I8), `?fixed=1&seed=1&
invincible=1&nocombat=1&noclouds=1`, jet span **348 px** — above the ~250 px floor below
which JET-SIL is meaningless. **HUD stage digit read 1** from the frame
(`tools/out/sprite-r7/stagedigit-day.png`), not inferred from the tick. Three tick spacings
(900 / 1200 / 1500), all three identical:

| | A | B | C | share V>0.80 | share V≥0.969 |
|---|---|---|---|---|---|
| **ours** | **0.839** | **1.000** | **0.969** | 63.4 % | 44.5 % |
| arcade | 0.839 | 1.000 | 0.969 | 59.5 % | 42.3 % |

**This is reported with its margins, because a median that lands on the right rung by three
pixels is not a result.** Cumulative share at and below the median rung, ours against the
arcade's:

| reading | ours | arcade | distance from the 50 % flip |
|---|---|---|---|
| A | 55.5 % | 57.5 % | 5.5 points |
| B | 45.1 % | 44.4 % | 4.9 points |
| C | 31.8 % → 61.3 % | 31.8 % → 60.7 % | 11.3 points |

Reading C's cumulative matches the arcade's to **0.6 points**. That is the sense in which
this is an area match rather than a median hit.

In-game colour census (13 617 px) against the arcade's, as shares of each side's own mask —
noting ours includes the chromatic rim and flames that the arcade's achromatic isolation
excluded, so the airframe rungs are the comparable rows:

| | ours in-game | arcade |
|---|---|---|
| `#ffffef` | 24.6 % | 31.8 % |
| `#f7e6b5` | 18.7 % | 23.7 % |
| `#840000` rim | 15.9 % | *(in its rim, not its mask)* |
| `#000000` | 10.4 % | 18.0 % |
| `#a48484` | 9.8 % | 12.8 % |
| `#d6d6a4` | 8.3 % | 7.5 % |
| `#ceb59c` | 2.1 % | 5.5 % |

**Rim, in-game, day**: 1 056 px, **0.0 % near-black**, 84.1 % bare `#009fff` sky — the arcade's
figure exactly. (The rim statistic is only interpretable over a non-black background; on the
night frame it reads 76.3 % near-black because the *sky* is black, not because anything is
outlined. Stated so the night row is not misread.)

### 2.5 Where R7 is deliberately NOT at the arcade's number

**Black is 10.4 % of our in-game mask against the arcade's 18.0 %, and I did not close it.**
The arcade's 18 % is measured on a **banked** pose, where the nozzle discs face the camera and
read as large filled circles. Our nine bank cells are a 2-D rotation of one planform — the
nozzles do not grow when the aircraft banks — so reproducing 18 % on a *level* cell would mean
drawing nozzle discs too big for the level pose, which is worse art for a better number. This
is the "nine genuinely drawn perspective bank poses" item STATUS.md already carries, and it is
the mechanism behind it. 10.4 % is comfortably inside the 6.5–21.5 % window, so nothing
depends on it.

**There is no true-native LEVEL astern arcade frame in this repo.** Both true-native PNGs
(`ab2-arcade-desert.png`, `ab2-arcade-night-banking.png`) are banked poses, and the
authoritative level crop (`stage3-night-level-t175.png`) is a 686×480 video upscale carrying
**3 133 unique colours over 5 147 px** — usable for *shape* and useless for a colour census. I
tried it and discarded it rather than publishing a number off it. Added to the open list.

### 2.6 Results — night, measured separately, including the one that moved the wrong way

The night sheet shares one drawing with the day sheet and differs only in which ladder it
indexes. The six measured blue-greys are now **all** used, mapped rung for rung:

```
lightTop  #c5d6f7 0.969 <-> #ffffef   warmMid  #7384b5 0.710 <-> #ceb59c
lightNtrl #a4b5e6 0.902 <-> #f7e6b5   coolDark #6373a4 0.643 <-> #a48484
midNeutrl #8494c5 0.773 <-> #d6d6a4   rim/key  #425284 0.518 <-> #840000 / #000000
```

In-game, span 348 px, **HUD stage digit read 3** (`tools/out/sprite-r7/stagedigit-night.png`),
three spacings (4800 / 5100 / 5400), all identical:

| | A | B | **C** | n for A/B |
|---|---|---|---|---|
| ours R7 | 0.969 | 0.969 | **0.902** | 3 348 (24.6 % of the sprite) |
| ours R6 (lane's figure) | — | — | 0.969 | — |
| **arcade** `ab2-arcade-night-banking.png`, tight isolation, 1 150 px | 0.969 | 0.969 | **0.969** | 338 |

**Reading C went from the arcade's figure to 0.067 below it, and I am not hiding that.** The
mechanism is measured, not guessed: the arcade's night jet spends **2.8 %** of its airframe on
`#a4b5e6` and 14.9 % on `#8494c5`; ours spends **18.7 %** and 8.3 %. Its night sprite does not
distribute its rungs the way its day sprite does, and ours cannot, because ours is one
drawing.

I could have closed it in one line — map night's second rung onto `#c5d6f7`, which would give
C 0.969 **and** take the night sheet to exactly 8 colours, the arcade's own count. I did not,
and the reason is the standing rule: night has **no published value gate** (REFERENCE.md says
in as many words "night is a different palette and is not covered"), collapsing the rung
costs a real value step across the blades, engine bodies and lower fuselage, and losing
modelling to hit an ungated number is this project's named failure mode. The crop is in
`tools/out/sprite-r7/ingame-night-2x.png`; it is the closest the night jet has read to t175.

The thin-population caveat R6 recorded still applies and is worse, not better: readings A and
B see **24.6 %** of the night sprite, because four of its six blue-greys sit outside S<0.25.

### 2.7 The wing direction — re-measured, not taken on authority

The lead's instruction was to measure this myself before drawing, and the gap text and my
predecessor disagree on the sign. Operator: `reference/stage3-night-level-t175.png`
x[207,487] y[227,306], mask `max(RGB)>30`, largest 8-connected component (SPAN 251, H 77),
topmost mask row per column outboard of the fin/body region:

| |x| % span | 21.1 | 24.3 | 27.5 | 33.9 | 37.1 | 40.2 | 46.6 |
|---|---|---|---|---|---|---|---|
| wing top edge, %H | 68.8 | 66.2 | 66.2 | 66.2 | 63.6 | 61.0 | 58.4 |

**The arcade's wing top edge rises ~10–14 %H from root to tip** — the tips sit *higher* on
screen than the roots. Chord narrows from ~22 %H at the root to ~10 %H at the tip. R6's gap
text, carried into R7's gap 4 as "also correct the gap-7 text", asks for **anhedral**, which
is the opposite. **The gap text is wrong and my predecessor was right.** Independently
reproduced; no geometry change was needed, and none was made.

---

## 3. The four silhouette discriminators — nothing lost, and one now unmeasurable

Re-run after every art change, day and night separately, on two masks, with the arcade
control first.

**(a) Colour-blind geometry mask** (jet-on/jet-off difference rendered as a binary
silhouette). This is the R6 judge's operator, and day and night are **byte-identical** on it,
as they must be — one drawing:

| | arcade t175 | R6 (judge's own measurement) | **R7 day AND night** | band |
|---|---|---|---|---|
| two-blade fin rows | 100 % | 95.2 % | **95.2 %** | 99–100 % |
| fin-pair extent | 35.5 % | 37.9 % | **37.9 %** | 30–40 % |
| blade cant | 1.28 | 1.25 | **1.25** | ≥1.15 |
| aspect SPAN/H | 3.26 | 3.05 | **3.14** | 3.0–3.6 |

**Unchanged where it was passing, and aspect moved toward the arcade.** The 95.2 % two-blade
shortfall is R6's, not R7's — I did not touch the blade geometry, only its tones — and it
remains below its band.

**(b) Brightness mask on the isolated jet** (`tools/art/jetsil.py`, the published form). Day
and night legitimately differ here because the day keyline fails `max(RGB)>30` and the night
one passes, which is the asymmetry R6 documented:

| | day | night | arcade t175 | band |
|---|---|---|---|---|
| two-blade | 100 % | 95.2 % | 100 % | 99–100 % |
| fin extent | 36.7 % | 37.9 % | 35.5 % | 30–40 % |
| cant | 1.21 | 1.25 | 1.28 | ≥1.15 |
| aspect | 3.14 | 3.14 | 3.26 | 3.0–3.6 |
| **nozzle separation** | **15.1 %** / 30.2 % | 30.2 % / 30.2 % | 30.0 % / 30.0 % | 25–35 % |

### 3.1 JET-SIL's nozzle mask collides with the arcade's own daylight keyline

This is the one discriminator R7 moves, and it is an operator defect rather than a drawing
one. **Demonstrated, not argued:**

REFERENCE.md publishes the afterburner mask as *hue 5–55°, S ≥ 0.45, **V ≥ 0.45***, and the
nozzle-separation figure it feeds was only ever taken on `stage3-night-level-t175.png` — a
**night** crop, whose keyline is the measured blue-grey `#425284` and cannot enter a red-hue
mask. `#840000` is V 0.518, S 1.000, hue 0: it passes. On our R7 day cell the two largest
8-connected components of that mask are

```
V >= 0.45 (published):  [128 px of #840000, 52 px of #ef7300]  ->  15.3 % of SPAN
V >= 0.70            :  [ 52 px of #ef7300, 52 px of #ef7300]  ->  30.6 % of SPAN
```

Nothing about the drawing differs between those two lines.

The 0.45 floor has **no measured support**: every afterburner colour this project has measured
on an arcade frame is V ≥ 0.902 (`#e67300` 0.902, `#f78400` and `#f7b500` 0.969 on the native
desert frame, `#ff7500` on t175), and ours are `#ef7308` 0.937 and `#ffd600` 1.000. A floor of
0.70 clears every measured glow by ≥0.20 and clears `#840000` by 0.18 — a gap in the middle of
nothing.

**I did not move the published operator.** `jetsil.py` still defaults to V ≥ 0.45 and now
prints **both** readings whenever they disagree, with the component sizes, so the figure that
fails is on the page next to the figure that passes. The control suite still runs first and
**the arcade's own reference returns 30.0 % under both floors** — the alternative changes
nothing on the arcade, which is the evidence that it is not a threshold tuned to our sprite.
Which one REFERENCE.md keeps is the criteria lane's call: `ask-sprite-art.md` A2.

I could have dodged this by picking a dark red with V < 0.45. `#840000` is the measured value
and the project's rule is that the measurement wins over the convenience.

### 3.2 The other standing gates

- `tools/art/sheet_visibility.py`: **0 invisible (sheet, cell, size) combinations** across all
  19 sheets, 6–24 px for enemies and 24–160 px for the player.
- `node tools/art/sheet_probe.mjs --ticks 4800 --every 600`: `selfTest {detected:true,
  before:0, after:1}`, **16/16 sheets decoded, 0 procedural detail fallbacks**, 0 page
  messages. The positive control fires, so the zero is instrumented rather than inferred.
- `python3 tools/art/mirror_check.py`: 16 anchor constants, `bladePoly` 20, `wingPoly` 14,
  `podPoly` 24, **drawing program 347 items** — all match. Re-validated on known-bad input this
  round: changing one `30.2` to `30.3` in the fallback is caught with both contexts printed.
  Its `ROLES` set and its keyline exclusion were updated for R7's ten roles and the
  `outlineSouth`/`addUnderKeyline` rename, and the old `outline4`/`addKeyline` pair is still
  stripped so the check keeps working on a pre-R7 tree.
- **Criterion A on the day capture at native** (`?fixed=1&seed=1&invincible=1&nocombat=1&
  noclouds=1`, three spacings, 3×3 blocks verified uniform before decimation): **48 colours,
  23 channel values** against gates of 256 and 32. Two extra sprite tones cost nothing here.
  This is a `nocombat` population and therefore says nothing about the judge's gap 1, which is
  about ordinary play.
- **Capture hygiene**: `final-on` and `final-off`, 18 frames each, **18 distinct md5s, 0 black
  frames** per set; means 9.0–122.8. Stage identity from the **HUD digit** in both regimes.

### 3.3 A sampling limitation in my own evidence

Three tick spacings of the day jet return **byte-identical** censuses, and so do three of the
night jet. The frames themselves differ (18 distinct md5s, the ground scrolls), but under
`?fixed=1` with no stick input the autopilot flies level and the jet is in the **same cell at
the same screen position at every tick**. So "sampled at ≥3 tick spacings" is satisfied in
form and buys nothing in substance for this statistic: it is three samples of one pose. The
bank cells are measured on the authored sheet instead, and a properly banked in-game sample
needs an input-injection path I do not own. Stated rather than left to look like replication.

---

## 3.4 I shipped a silent-erasure bug for about twenty minutes, and the gates did not catch it

Worth the space because the mechanism is reusable and three separate gates waved it through.

`tools/art/sheets/player-f14-roll.js` calls **the same `levelOps()`** as the level sheet, with
its own three role tables. R7 added `rim`, `lightNeutral` and `warmMid` to `levelOps` and did
not add them to those tables, so every polygon using a new role arrived with an **undefined**
hex. `PixelCanvas.set()` treats a null/undefined hex as **"erase to transparent"** — so the
roll sheet did not fail, it grew **holes**:

| opaque px per cell | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| R6 | 1176 | 834 | 407 | 834 | 1166 | 834 | 413 | 834 |
| R7, broken | 1072 | 759 | **368** | 759 | 1078 | 759 | **368** | 759 |
| R7, fixed | 1117 | 822 | 379 | 819 | 1117 | 818 | 376 | 824 |

**Why nothing caught it.** `assertPalette` passed because the colour **count went down**, not
up. `vite build` passed — it is a property access, not a syntax error, and R6 already paid for
"a green build is not a boot". `sheet_visibility.py` passed, because **a sprite with bites out
of it is still visible**, which is all that gate asks. And the sheet is **unwired**, so no
capture would ever have shown it.

**What actually caught it** was `git diff --stat` reporting that a sheet I had just asserted
in this very report was untouched had changed by 39 bytes — and then cropping it at 3× and
looking. The crop is unambiguous: cell 0's wings have bites out of them.

**Fixed, and now gated.** `LEVEL_OPS_ROLES` is exported from `player-f14.js` as data, and
`assertRoles(c, label)` is called by both the level sheet's `drawFrame` and the roll sheet's
`drawRollFrame`. **Validated on known-bad input**: deleting `lightNeutral` from the `DORSAL`
table exits 1 with
`[roles] player-f14-roll frame 3: levelOps() reads role(s) lightNeutral that this palette does
not define. An undefined hex ERASES pixels rather than failing...`

The roll sheet also now takes the `#840000` rim and the two new grey rungs (11 colours, up
from 8). A roll interrupts the level poses; if it keyed in black while they key in dark red it
would read as a different aircraft for the eight frames it is on screen. It is still unwired.

The generalisable form, for whoever writes the next primitive: **a drawing API where "no
colour" means "erase" cannot distinguish a deliberate erase from a typo, and every
count-based gate is blind to it.** Assert the inputs, not the output.

---

## 4. GAP 10a — the carrier

Judge: *"a grey wedge with one box beside the arcade's detailed ship."* That is fair and the
capture agrees.

**The palette was already right and I checked before changing anything.** Modal colours over
six regions of `reference/carrier-launch-t89.png`: deck `#c6c4e7` (the file's own
`DECK_LIGHT`), island face `#515163` (its `ISLAND_DARK` is `#505065`). Nothing in the palette
needed to move; the gap is **structure**, exactly as the judge worded it.

Redrawn against `carrier-launch-t89.png` x[470,686] y[110,340] at 3×
(`tools/out/sprite-r7/arcade/t89-island-3x.png`) — the **launch** shot, where the island is
~90 px tall, rather than the distant t84 the module was originally built from, where it is
~25 px and shows no structure. What that crop holds and what now exists:

| arcade feature | R6 | R7 |
|---|---|---|
| multi-storey bridge with a **regular grid of windows** | absent | 6 × 4 lights on a lit/shaded two-plane face |
| **two rounded tower caps**, aft one larger, vent rings | one flat rectangle | two flat-topped octagons with lit crowns and vent ticks |
| lattice mast, two yardarms, air-search radar bar, signal board | a 2 px line and two bars | all four |
| large pale **hull number** on a dark panel | two 3×5 white blocks | 6 × 9 seven-segment digits |
| parked aircraft **sized by depth** | 9 px dark chevrons, all one size | light bodies with dark outlines, 13 px × a 0.62–1.00 depth factor |
| a landing-strip **band**, not just a centreline | centreline only | pale band with dark edge lines over a darker deck |
| hull sheer line under the deck edge | absent | present |

The arcade's number is 128 and its deck carries SEGA/ENTERPRISE; **neither is reproduced**
(CLAUDE.md's assets rule). Ours is 07, drawn from a segment table in the file.

Two things the capture caught that the texture alone would not have:

- The hull number's first position was on the island's **base**, whose last rows sit behind
  the deck's near edge at the launch framing: the capture showed a dark panel with nothing in
  it. Lifted onto the face.
- R6's parked aircraft were dark chevrons with a light core. Against `#c6c4e7` at the opening
  scale a 9 px dark mark is one smudge; the arcade's are **pale bodies with a hard dark edge**,
  which is what survives the downscale. Inverted.

Before/after/arcade: `judging/R7/r7-02-carrier-R6-TOP-R7-MID-arcade-BOT.png`.

**No placement maths was touched.** `placeCarrier`, `TEX_W/TEX_H`, the ship bbox inside the
texture and `sprite.center` are unchanged, so the flow lane's four-landmark framing still
holds exactly.

**What I did not do, and it is the bigger finding.** `carrier.js`'s header says the ship is
*"seen from ASTERN and slightly above, looking forward along the deck"*, and draws a symmetric
trapezoid. **`reference/carrier-prelaunch-t84.png` is not that view**: the ship runs
left-to-right across the frame with the **bow to the left** and the stern to the right — a
high-oblique broadside. The launch shot t89 *is* a deck-level forward view, so the module is
drawing t89's camera with t84's measured proportions. Those are two different shots of two
different ships-on-screen, and the file does not say so. Re-deriving the geometry for one of
them is a bigger job than this round's gap and it touches the framing the flow lane solved, so
it is raised in `ask-sprite-art.md` B1 rather than done unilaterally.

---

## 5. GAP 10b — the title letterforms. **NOT MY FILE, measured and handed over.**

The title wordmark is drawn by `src/ui/titleFont.js` (glyph outlines) and
`src/game/flow/titleScreen.js` (layout) — **`src/ui/**` is the Player & HUD lane's**, not
mine. CLAUDE.md: *"cross-area changes are requested via message, not reached into."* So this
section is measurement and a hand-over spec, and the spec is in `ask-sprite-art.md` C1.

**I did find a decoy in my own files and defused it.** `tools/art/sheets/title-logo.js` is a
**second, complete, entirely unused copy** of the wordmark: nothing imports it,
`tools/art/build.js` does not list it, and there is no `title-logo.png`. It is the exact defect
class R6 spent a day removing from the enemy palettes, and the two copies have already
diverged from the arcade in the same direction. It now carries a shouting header saying it is
dead, naming `titleFont.js` as the live path, and pointing at this report. I did not delete it
— deleting another round's work unasked is not this lane's call.

**Measurement, one operator both sides.** Ink = `max(RGB) > 190` and `(max−min) < 40` (the
cream lettering; the blue A and red B are excluded by it, on both sides). Our capture is
`?fixed=1&seed=1&showtitle=1` decimated to native; the arcade is `title-screen-t74.png`
divided by its 686/320 = 2.144 upscale.

| | AFTER cap h | AFTER x | BURNER cap h | BURNER x | block top→bottom |
|---|---|---|---|---|---|
| **ours** | **42** | 107–256 (w 150) | **42** | 85–273 (w 189) | y 51–141 = **91** |
| **arcade** | **47.6** | 110.1–254.2 (w 144.6) | **54.1** | 86.3–277.6 (w 191.7) | y 52.2–166.5 = **114.3** |

- **The widths are already right** (+3.7 % and −1.4 %), and so is the block's **top** (51 vs
  52.2). The entire shortfall is at the bottom.
- **The block is 20.4 % short**, which corroborates the art critic's 23 % on an independent
  operator.
- **New, and the critic did not publish it: the arcade's two words are NOT the same height.**
  BURNER is **13.7 % taller** than AFTER (54.1 vs 47.6). Ours are both 42. Any fix that scales
  the face uniformly will still be wrong.
- The baseline gap is also short: arcade 13.5 px between AFTER's bottom and BURNER's top,
  ours 8.

**The "II" — the critic's overturning of R5 reproduces exactly.** Sphere mask
(`B>140`, `B−R>25`, `95<R<215`):

| | bbox | height | width | **sphere pixels in it** |
|---|---|---|---|---|
| ours | x[130, 227] y[51, 169] | 119 | 98 | **2 177** |
| arcade | x[130.1, 226.7] y[50.8, 171.2] | 120.8 | 97.0 | **15 767** |

**The II is the arcade's size in the arcade's position to within 2 px — and it has 7.2× fewer
sphere pixels inside that box.** The critic measured the bounding box and concluded the II is
right; it is right in *extent* and sparse in *fill*. The arcade's is a dense bubble slab that
the lettering interleaves with; ours is two outline I-forms with serif feet that protrude
below the lettering because the lettering is too short to meet them. That is a second,
separate defect and it is not in any gap list.

Side by side at native: `judging/R7/r7-03-title-ours-TOP-arcade-BOT.png`. What the crop shows
that no scalar above captures: the arcade's caps are **slanted**, with **cut corners** (the A's
apex is cut flat, the R's leg kicks out, the E and F arms end on an angle) and a visible
calligraphic weight shift. Ours are upright block caps with square terminals.

---

## 6. Open, carried forward

1. **Night reading C is 0.902 against the arcade's 0.969** — §2.6. The mechanism is measured
   (the arcade's night sprite distributes its rungs differently from its day sprite; ours is
   one drawing). The one-line fix costs a real value step and night has no published gate.
   Criteria-lane call.
2. **Two-blade fin rows read 95.2 % on the colour-blind mask**, below the 99–100 % band, day
   and night. **Unchanged from R6** — this is the judge's own figure, carried, not introduced.
   Either the operator needs a form that does not bridge the blade pair near the root, or the
   band needs re-deriving; both are criteria-lane calls.
3. **JET-SIL's nozzle mask is not usable on a daylight sprite carrying the arcade's own
   keyline** — §3.1. Both readings are published; the operator is unchanged pending a ruling.
4. **Black is 10.4 % of our airframe against the arcade's 18.0 %**, and cannot be closed on a
   level cell drawn from a 2-D-rotated planform — §2.5. Downstream of the "nine genuinely
   drawn perspective bank poses" item.
5. **There is no true-native LEVEL astern arcade frame in this repo.** Both native PNGs are
   banked; the authoritative level crop is a video upscale with 3 133 colours over 5 147 px.
   This is a second entry for STATUS.md's "a true-native screenshot is the highest-value
   acquisition" list.
6. **`carrier.js`'s stated camera does not match the frame it cites** — §4. Raised, not fixed.
7. **The title is still 4 byte-identical frames** and has no attract cycle. Not my file, and
   unchanged.
8. **The five authored enemy bank poses are still never selected** (`textureFor()` in
   `src/entities/enemy.js` does not pass `bankDeg`). R6 flagged it; it is still true; still one
   line in a file I do not own.
9. **The daylight nozzle is `#ef7300` and the measured night nozzle is `#ff7500`.** Still
   unreconciled, still outside the assigned gaps, still untouched.
10. **The barrel-roll sheet is still unwired**, but it is no longer stale: it took R7's rim,
    its two new grey rungs and the role guard (§3.4), so the first frame it is ever shown will
    be the same aircraft as the pose it interrupts. Its **dorsal** frames collapse five
    airframe rungs onto two blues, because only two survived the measurement of
    `stage4-barrel-roll-t222.png` as distinct bands. That is a real loss of modelling on those
    frames and it is the measurement's limit, not a shortcut; re-measuring the dorsal ladder
    needs a frame nobody has.

# R5b — sprite-art lane delivery

Files owned and touched: `src/render/spriteFactory.js`, `src/entities/enemySprite.js`,
`tools/art/**`, and the generated sheets under `src/assets/sprites/`. Nothing else in `src/`
was edited. No commit, no stash, no checkout. Captures all under
`tools/out/sprite-art-r5b/`.

---

## PRIORITY 0 — the daylight player jet

### Diagnosis

Not a draw-path bug, and **not** "the day variant was never redrawn to match the night art" —
that hypothesis is disproved below. The real split is **authored sheet vs procedural
drawing**, and it falls along day/night only because of where the sheet is wired in.

**The three things that decide which drawing you see:**

1. `src/entities/player.js`'s `update()` picks a cell from `player-f14.png` via
   `selectPoseCell`, guarded by `!this._night`. So **daylight flight = the authored sheet,
   night = the procedural `drawJetSilhouette()`** in `spriteFactory.js`.
2. `src/game/game.js:345` only calls `Player.update()` when `flow.playerControlled` is true,
   and it is **false during `'launch'`** (launchSequence.js owns the sprite transform that
   whole time). `selectPoseCell` is called from nowhere else, so during the carrier launch
   the sprite still carries the texture `createJetSprite()` built it with — the **procedural**
   one. That is why `day-launch.png` looked correct while `day-cruise.png` did not. It is not
   a scale effect and not an async-load race; it is fully determined by that one branch.
3. `JET_POSE_SHEET.cellHeight` was **40** while `JET_H` (the number the sprite quad's aspect
   is built from) was **31**, so every sheet cell was squashed vertically to 77.5% —
   flattening an already-flat drawing on top of its own defects.

So: everything that rendered the sheet was broken (daylight cruise); everything that rendered
the procedural drawing was fine (night, carrier launch). The lead's three crops are three
observations of that one branch.

A consequence worth naming: before this fix the jet **changed shape at the moment control was
handed over** — the carrier launch ended, `flow.playerControlled` went true, the first
`Player.update()` swapped the map to the sheet, and the aircraft went from the good drawing to
the bad one mid-sequence. That pop is gone now, not because the branch changed (it did not)
but because both drawings are the same art.

**Disproof of the "night art is newer, day was never redrawn" hypothesis.** Both committed
sheets are *the same drawing*:

```
committed player-f14.png       900x40
committed player-f14-night.png 900x40
alpha masks identical:      False
differing alpha pixels:     192 of 36000   (0.53%)
```

The 192 differing pixels are one wing's dither. `tools/art/sheets/player-f14-night.js`
imported `geometryFor` from `player-f14.js`, so the night PNG was the day PNG recoloured —
and it is **equally bad**, measured below. Side by side:
`<scratchpad>/OLD-day-top-night-bottom.png`.

And the night PNG was never on screen at all: `git show HEAD:src/render/spriteFactory.js |
grep player-f14` returns nothing, and nothing in the working tree imported it before this
pass. The good night sprite the lead saw is the **procedural** texture.

### Fix

- `tools/art/sheets/player-f14.js` rewritten. Its level cell is now the same drawing as
  `spriteFactory.js`'s `drawJetSilhouette()`; the eight banked cells are that planform
  rotated and foreshortened, **scan-converted fresh per cell** (no cell is a resampling of
  another, every cell lands on the pixel grid).
- Cell is now 100×72 and `JET_H` is 72 to match. The airframe still occupies ~31 rows, so
  one authored pixel is still one native pixel on screen — `worldHeight` tracks `JET_H`, so
  the change is scale-neutral. The extra rows are headroom for the hard-bank poses, which
  rotate a 100×31 planform by up to 65°.
- `tools/art/sheets/player-f14-night.js` now delegates to the daylight generator with the
  night palette, so the two sheets are the same drawing by construction.
- Both files carry a `*** MIRRORED IN ... ***` banner naming the other copy. Keeping one
  drawing in two files is the cost of the `tools/` ↔ `src/` split; this is the mechanism
  that failed.

### Before / after

| | path |
|---|---|
| before (lead's capture, stage 1) | `tools/out/dash-r5/s1-flight/frame-0000.png` |
| after | `tools/out/sprite-art-r5b/s1-flight/frame-0000.png` |
| before/after/arcade stack | `tools/out/sprite-art-r5b/cmp-jet-before-after-arcade.png` |
| procedural path (night/fallback) exercised in-game | `tools/out/sprite-art-r5b/proc-fallback/frame-0000.png` |
| banked, stick right / stick left | `tools/out/sprite-art-r5b/s1-bank-right/`, `s1-bank-left/` |

Both bank directions were checked by eye: stick right drops the **right** wing, matching the
world roll in the same frame. (The sheet's cell-index sign convention is inverted by
`player.js`'s `selectPoseCell(..., -poseDeg)` call; it is right, but it is right by
cancellation, so it was verified on a live capture rather than from the comment.)

---

## R5 gap 2 — player jet silhouette

Operator: **JET-SIL exactly as published in `REFERENCE.md`**, reimplemented in
`tools/art/jetsil.py` (committed, with its operator written out in the module docstring).

**The instrument was validated on the arcade before being pointed at our sprite.**
`python3 tools/art/jetsil.py` with no arguments runs that control:

| statistic | REFERENCE.md published (t175) | `jetsil.py` re-run |
|---|---|---|
| two-blade fin rows | 99–100% | **100.0%** |
| fin-pair extent, % of SPAN | 35.4–35.7% | **35.5%** |
| nozzle separation, % of SPAN | 30.1% | **30.0%** |
| blade cant | 1.29 | **1.28** |
| aspect SPAN/H | 3.24 | **3.26** |
| fin max row width, % of S | 16.2–16.4% | **16.4%** |

(One disagreement, stated rather than buried: the fin BAND comes out 45 rows where
REFERENCE.md reports 67–68. The band is defined by the 0.30·S wing-onset row and is
sensitive to the crop's exact bottom edge; the two-blade *fraction* is 100% either way, so
it does not move any acceptance number. Every other control is exact.)

### Day and night measured SEPARATELY, before and after

Four distinct drawings were in play before this pass. Quoting one number for "the player jet"
would have hidden that, so here is each one.

| drawing | where it rendered | two-blade ≥90% | fin extent 30–40% | nozzle sep 25–35% | cant ≥1.15 | aspect 3.0–3.6 |
|---|---|---|---|---|---|---|
| **BEFORE** day sheet, as rendered in-game (330 px span) | daylight cruise | 100% | 36.4% | 28.1% | **1.09 FAIL** | **4.58 FAIL** |
| **BEFORE** procedural (reconstructed, 94 px span †) | night, carrier launch | 100% | 38.3% | 27.7% | 1.23 | **3.62 FAIL** (just) |
| **BEFORE** committed `player-f14.png` cell 4 † | — | **71.4% FAIL** | **100.0% FAIL** | 27.7% | **0.36 FAIL** | 3.62 |
| **BEFORE** committed `player-f14-night.png` cell 4 † | never rendered | 100% | **97.9% FAIL** | **n/a FAIL** | **0.36 FAIL** | 3.43 |
| **AFTER** day, in-game (339 px span) | daylight, all states | **100%** | **37.2%** | **31.0%** | **1.22** | **3.23** |
| **AFTER** night sheet cell † | ready, not yet selected | 100% | 38.4% | 30.3% | 1.22 | 3.09 |

The lead's read is confirmed quantitatively: **the pre-fix night sprite was close to passing**
(4 of 5, aspect 0.02 over the sanity bound) **while the pre-fix day sprite failed cant and
failed aspect badly at 4.58** against the arcade's 3.24–3.30. Aspect 4.58 is the number behind
"collapses into one long thin horizontal bar": short stub fins, then the 31/40 squash on top.

The night sheet's "nozzle separation n/a" is not a measurement failure — it is the magenta
afterburner error (see I3 below). The JET-SIL nozzle mask is a warm-hue test, and that sheet
has no warm pixels at all.

**† Caveat, stated because two of my own instruments disagree.** JET-SIL's own text says it is
meaningless below ~250 px of jet span. The rows marked † are authored cells at 94–100 px span,
below that floor, and they are visibly unreliable: the committed day sheet reads fin extent
**100%** as an authored cell but **36.4%** rendered in-game at 3.3× — because at 100 px the fin
band is ~7 rows and the 0.30·S wing-onset row lands differently. **Only the in-game rows are
load-bearing.** For the new art the two routes agree to ≤0.1 pt (37.1 vs 37.2, 30.9 vs 31.0,
1.22 vs 1.22), which is corroboration that happens to hold, not a licence to measure authored
cells in general.

### Results — ours, R5b

Measured two independent ways. **Both at ≥250 px of jet span**, which the operator requires.

**(1) In-game**, `?fixed=1&seed=1&nocombat=1`, 960×672, tick 300. The jet is isolated on
black by a jet-on/jet-off difference mask (`&hidejet=1` companion capture), largest
8-connected component only — the same "isolated on black" condition as the arcade's t175.
Isolated sprite saved at `tools/out/sprite-art-r5b/jet-isolated.png`.

**(2) The authored sheet cell itself**, 100×72 cell 4, native — a corroboration only, below
the operator's 250 px validity floor (see the caveat above).

| statistic | target | arcade | **ours in-game** | **ours, authored cell** | R4 |
|---|---|---|---|---|---|
| two-blade fin rows | ≥90% | 99–100% | **100.0%** | **100.0%** | 38% |
| fin-pair extent, % SPAN | 30–40% | 35.4–35.7% | **37.2%** | **37.1%** | 12.6% |
| nozzle separation, % SPAN | 25–35% | 30.1% | **31.0%** | **30.9%** | 14.5% |
| blade cant | ≥1.15 | 1.23–1.29 | **1.22** | **1.22** | 1.00 |
| aspect SPAN/H (sanity) | 3.0–3.6 | 3.24–3.30 | **3.23** | **3.23** | 2.50 |

The night sheet (same geometry, night palette) reads 100% / 38.4% / 30.3% / 1.22 / 3.09 —
all in band. Its SPAN and H run 2 px larger because the night keyline `#425284` passes
`max(RGB)>30` and is therefore inside the mask, where the day keyline `#000008` is not.

### Span and centroid, with the operator stated (I8)

Operator: jet-on minus jet-off at the same tick, `|ΔRGB|max > 24`, largest 8-connected
component. Frame 960×672.

- bbox `x[306,650] y[315,425]`, 14 796 changed pixels
- **SPAN 345 px = 35.94%W** (band 34–38) — bbox extent
- **centroid 57.51%H** — **mean y of the changed pixels** (band 52–60)
- **centroid 55.06%H** — **bbox vertical centre** of the same mask

That 2.45-point gap is I8's open item, reproduced here on one frame with one mask. The two
numbers are the same pixels under two definitions, so this is the "same name, different
operator" case, not a bug in either. **The 52–60%H band was drawn against the judge's
difference-mask pixel centroid (57.08%H in R4), so the pixel-centroid number is the one that
belongs in the band**, and the published authoring-side figure running ~2 points low is
consistent with it having been a bbox-centre calculation. Recommend REFERENCE.md name
"pixel centroid of the jet-on/jet-off difference mask, largest component" explicitly.

### Honest limitation

The nine banked cells are a **rotated and foreshortened planform**, redrawn per cell rather
than a resampled bitmap. That removes the arbitrary-angle resampling the art critique
objected to, and the crisp per-cell pixel grid is visible in the captures. It does **not**
give true drawn perspective — the arcade's hard-bank frame
(`reference/stage1-hard-bank-t98.png`) shows the aircraft nose-up with the near wing
foreshortened differently from the far one, and ours does not. Nine genuinely drawn
foreshortened poses remain outstanding.

---

## R5 gap 1 — the enemy aircraft

Judged independently this round rather than inherited. Operator: `tools/art/enemysil.py`
(committed), which turns the R4 report's prose criteria into a stated operator. **Two of the
criteria were measurably failing on the uncommitted sheet** and a third was untested.

### The criterion that needed fixing first

R4 criterion (c) is "no single feature occupying >12% of silhouette area". Measured naively —
largest 8-connected single-colour component — **a wing fails it**, because a wing is one flat
colour and legitimately runs 22–28% of any aircraft sprite's area. Our own grey head-on read
27.3% on a perfectly reasonable wing. The defect the criterion exists to catch is a *mark*
("a large black-rimmed red disc"), not a structural member. So `enemysil.py` gates on the
largest **compact** component (bbox aspect ≤3:1 both ways and ≥50% bbox fill — admits discs,
rings and blobs; rejects wings, fins and spines) and prints the naive maximum alongside for
anyone who wants to re-derive it. Flagging this as a criteria defect in the R4 → R5 family.

Criterion (b) likewise needed its sign named: a head-on aircraft's leading edge rises
*inboard→outboard*, a rear-aspect one's rises *outboard*. The gate is |angle|.

### Before (uncommitted sheet) → after

| | fuselage %SPAN (≤35) | leading edge (≥15°) | compact feature (≤12%) |
|---|---|---|---|
| before, head-on | 9.5% | 16.9 / 15.9° | 1.6% |
| before, rear | 9.5% | **10.8 / 12.5° FAIL** | 6.6% |
| after, grey head-on | 12.9% | **20.4 / 20.5°** | 3.6% |
| after, grey rear | 12.9% | **17.5 / 19.0°** | 2.3% |
| after, interceptor head-on | 25.8% | **30.4 / 29.9°** | 1.4% |
| after, interceptor rear | 16.1% | **22.6 / 23.1°** | 10.5% |

Criterion (d), "≥2 distinguishable types by silhouette", was **not** met before: four
liveries recoloured one aeroplane. There are now two families —

- **`mig`** — slender body, thin high-aspect swept wings with chord taper, separate low
  tailplanes, one fin. Flown by `grey` (stage 1) and `camo` (stage 2).
- **`delta`** — one solid triangular wing, no tailplane, fatter body, taller fin. Flown by
  `interceptor` and `prop`.

Neither resembles the player's twin-nacelle twin-blade F-14.

The third fix is structural and is the one that actually changes how they read: **both
aspects previously had no fuselage.** Wings, a fin and a nose/nozzle feature, with nothing
joining them along the flight axis — which is why the head-on cell read as a gull. Both
reference crops (`ab2-arcade-closeup-enemies.jpg` lower-right MiG;
`stage1-missile-salvo-t100.75.png`'s three rear-aspect jets) show a slender body running the
whole length with the wings attached to its middle. That body is now drawn.

I2 is honoured: the rear nozzle is a **thick near-black ring** (r 4.0 key) with a small
orange core (r 2.4) and a hot centre (r 1.0), and the stage-1 `grey` airframe is mid-grey
(`#31313a` dominant), not white.

Evidence: `tools/out/sprite-art-r5b/enemy-after/` (14 frames, `?combatonly=enemies`), largest
single enemy 15.9%W at frame 11; `tools/out/art-zoom/enemy-*.zoom10x.png` for the authored
cells.

### Liveries now ship as real art

Eight sheets (4 liveries × 2 aspects), not one. `enemyTexture` serves an authored cell for
**every** daylight livery; before this, only `grey` had art and camo/interceptor/prop fell
back to the procedural draw, so a stage-2 camo enemy was a visibly different class of sprite
from a stage-1 grey one. Night still uses the procedural path.

`src/assets/sprites/enemy-mig-head.png` and `enemy-mig-rear.png` are **deleted** (superseded
by `enemy-grey-*`); they show as `D` in `git status`, deliberately.

### Popping-invariant re-check

`src/entities/enemySprite.js` carries a note that the hand-drawn sheets have no fully-opaque
full-width band, that this looked like a reintroduction of the R3 "enemy disappears" bug, and
that it was cleared by simulating NearestFilter point sampling over quad sizes 6–24 px — with
the script left in a scratch directory that did not survive. The art has now changed shape,
so the check was re-run, and **the script is committed this time**:
`tools/art/sheet_visibility.py`.

Result: **0 invisible (sheet, cell, size) combos** across all 10 sheets and all sizes 6–24 px.
Per the project rule about zero results, the instrument was validated on known inputs first: a
synthetic cell containing a single opaque pixel fails 12 of 19 sizes, an all-opaque cell fails
none.

---

## I1 — enemy livery API

**Already shipped** in the working tree and unchanged by this pass:
`export const LIVERIES` and `export function enemyTexture(aspect, livery, detail, night, bankDeg)`
in `src/entities/enemySprite.js`, with `enemyHeadOnTexture` / `enemyRearTexture` /
`enemyHeadOnFarTexture` / `enemyRearFarTexture` kept as thin no-arg wrappers. The combat
lane can drop its local fallback. The only behaviour change this pass: authored art is now
served for all four liveries in daylight, not just `grey`.

---

## I3 — night palette

The player night path works and is correct (`setJetNightPalette` swaps a cached texture; the
procedural night drawing is the one the lead's stage-3 capture showed rendering correctly).

One **measurement correction** inside it. `tools/art/palettes.js`'s `PLAYER_NIGHT` carried a
comment asserting "there is no warm hue in the verified 8-colour night set", and gave the
night afterburner a magenta `#c594f7`. That is wrong. On
`reference/stage3-night-level-t175.png`, over the authoritative jet crop `x[207,487]
y[227,306]`, the JET-SIL nozzle mask (hue ≤55° or ≥355°, S≥0.45, V≥0.45) returns **279
pixels, modal `#ff7500`** (next `#ff6f00`, `#ff6a00`, `#ff7600`). The arcade's night
afterburners are bright orange. `PLAYER_NIGHT.nozzleCore` is now `#ff7500`. The procedural
night texture had always used the daylight orange, which is why the in-game night jet looked
right while the night *sheet* did not.

---

---

## Barrel roll — drawn sheet shipped (added after player-feel wired A2)

`src/assets/sprites/player-f14-roll.png`, 8 frames, generated by
`tools/art/sheets/player-f14-roll.js`. Same 100×72 cell and the same quad as the pose sheet.
`spriteFactory.js` exports `JET_ROLL_SHEET` and
`selectRollCell(sprite, sheetTexture, rollPhase)`; `player.js` has not wired it yet — ask A5,
which also carries the one hazard (the rotation AND the span squish are baked into the art, so
`player.js` must drop its `scale.x * squish` line or it applies twice).

This closes the last spun-bitmap case in the player sprite. It is not only a resampling fix:
`reference/stage4-barrel-roll-t222.png` shows the **dorsal** surface in a blue-violet family
that appears nowhere in the astern view, so a rotated astern bitmap is wrong in COLOUR at every
phase but zero, not just in pixel grid.

**New measurement**, replacing the by-eye `PLAYER_DORSAL` that stood in `palettes.js`. Operator:
t222 airframe box `x[412,707] y[333,463]`, mask hue 200–300° ∧ S>0.08 (which excludes the
stage-4 teal sea and the red fireball in the same frame), 10 802 px, reported as **value-band
means over quintiles** — the decile-mean operator I6 specifies, because a single percentile
moves tens of levels on mask-boundary detail. Ladder: `#232d4d` → `#525f8b` → `#6474a1` →
`#6d7faf` → `#8f9fcf`. The old by-eye `#8c9ccb` was within 3 levels of the top band, so this
confirms it rather than overturning it. The frame is a 1028×720 upscale of a 320×224 native, so
it is **palette evidence, not proportion evidence**; the nozzle colour is deliberately NOT taken
from it (the warm pixels in that box are mostly the fireball, `#e03121`) and reuses the
afterburner orange verified at true native on two astern frames.

### A visibility failure found and NOT papered over

`tools/art/sheet_visibility.py` failed the roll sheet: the two edge-on cells sample zero opaque
texels at a **7 px quad**. Raising `SPAN_FLOOR` from 0.30 through 0.34 / 0.36 / 0.40 does not
fix it — I swept it. The cause is structural: a 100×72 cell holding a 31-row aircraft puts two
of the three sampled texel rows in transparent padding at that size.

I did not widen the band to make it green. I checked whether the player sprite ever renders
that small: it measures **115 native px** in level flight, `launchSequence.js` scales by 1.6→1.0,
`deathSequence.js` by 1.9→1.0, and the only sub-1.0 factor in the tree is the very
`scale.x * 0.15` the sheet supersedes (and even that floors around 17 native px). So the check
now carries **per-sheet ranges** — enemies 6–24 px, player 24–160 px — with that reasoning
written into the script, and the 7 px datum stated in ask A5 as a live limitation with a
standing offer to re-cut the cell.

---

## What I could not close

1. ~~A night pose sheet is built and correct but not selected.~~ **Closed by player-feel (A2).**
   Verified on the current tree: stage 3, tick 4920, night sheet in force — two-blade 100%,
   fin extent 38.3%, nozzle sep 30.4%, cant 1.22, aspect 3.11, span 35.94%W, centroid 57.51%H.
   All in band. Captures: `tools/out/sprite-art-r5c/s3-night/`, `s3-jetoff/`,
   `jet-isolated-night.png`.
2. **True drawn perspective bank poses.** See the limitation above.
3. **No night or far-LOD enemy sheets.** Both still procedural.
4. ~~I could not capture stage 3 or any long run (`clouds.js:381` ReferenceError).~~
   **Cleared by world-r5.** Stage 3 now captures; the night numbers above are from it.

### Provenance note (raised by player-feel)

player-feel found that `?demo=1`'s analog stick snapped the drawn jet to the 35.6° bank extreme
before their fix, so any figure taken from demo frames was measuring a banked cell. **No number
I published came from `?demo=1`.** Every player measurement used `?fixed=1&seed=1&nocombat=1`
with no stick input (level), with its `&hidejet=1` companion at the same tick; the only
`?debugstick` captures I took were the two bank-direction frames, used for an eyeball sign
check and never quoted. Re-run on the current tree after their `player.js` changes, the day
figures reproduce byte-identically (span 345 px / 35.94%W, pixel centroid 57.51%H, bbox centre
55.06%H; JET-SIL 100% / 37.2% / 31.0% / 1.22 / 3.23), and their independent implementation of
I8 reproduces the same three numbers to 0.01 points.

## Tools added (all under `tools/art/`, all with their operator in the docstring)

| file | what |
|---|---|
| `jetsil.py` | REFERENCE.md's JET-SIL operator + a control suite that reproduces the published arcade values before measuring anything of ours |
| `enemysil.py` | R4 gap-1 criteria as a stated operator, incl. the compact-feature gate |
| `sheet_visibility.py` | the NearestFilter point-sampling popping check, committed this time, with per-sheet size ranges and the reasoning for each |

---

# APPENDIX — night pose sheet verified in-game (r5c)

Narrow re-open. Everything below is a fresh capture under `tools/out/sprite-art-r5c/`,
taken **after** the `clouds.js` fix and **after** `hmr: false` landed in `tools/capture.mjs`.

**Why this needed redoing rather than restating.** I had published a night figure in the
previous pass, but it does not stand and I am withdrawing it: it was an authored-cell
measurement at 94–100 px span, below JET-SIL's own 250 px validity floor — the limitation I
flagged myself — and my one in-game night attempt was captured with HMR still on, so it could
have been measuring a silently reset simulation. Neither is evidence. Both are now replaced.

## Method

New tool, `tools/art/pose_probe.mjs` (mine, `tools/art/**`), because the central question is
not answerable from pixels: `selectPoseCell` returns `false` on a null texture, so a sheet
that failed to decode renders a perfectly plausible aircraft via the procedural fallback, and
a LEVEL jet looks the same either way. The probe captures the frame **and** reads
`window.__flowState()` on the same tick of the same page load — one PRNG stream, one frame, both
facts. It sets `hmr: false` for the reason capture.mjs now does.

Isolation and the I8 operator moved into `tools/art/isolate_jet.py`, with the operator in its
docstring, so the day and night numbers come from one instrument.

## The two cheap checks the lead asked for

**Sheet selection — confirmed, not inferred.** `poseSource` at the measured tick:

| capture | tick | `stageIndex` | `poseSource` | `spriteRotationDeg` |
|---|---|---|---|---|
| stage 1 day | 300 | 0 | **`sheet-day`** | 0 |
| stage 3 night | 4920 | 2 | **`sheet-night`** | 0 |

Not `procedural`. `spriteRotationDeg` is exactly 0, so nothing is being spun.

**Stage identity — read, not trusted.** The HUD bottom strip at tick 4920 reads `STAGE 3`
(cream digit right of the red label; crop in `tools/out/sprite-art-r5c/night-probe/frame.png`).
I did not take the tick's word for it.

**The `#ff7500` correction — renders, with a correction to my own earlier wording.** The night
afterburner is on screen as **`#ff7300`**, 486 px. I previously wrote that
`PLAYER_NIGHT.nozzleCore` "is now `#ff7500`" — that is the *authored* value; it ladder-snaps to
`#ff7300`, and `#ff7300` is what renders. One ladder step from the arcade's measured `#ff7500`,
which is inside the snap tolerance `palettes.js` documents. The day sprite's nozzle is
`#ef7300` over the same 486 px, so night is a shade brighter, as measured.

## Day and night, both in-game, both above the 250 px floor

Isolated by jet-on/jet-off difference, largest 8-connected component, as for daylight.

| statistic | target | arcade t175 | **day (339 px span)** | **night (345 px span)** |
|---|---|---|---|---|
| two-blade fin rows | ≥90% | 99–100% | **100.0%** | **100.0%** |
| fin-pair extent, % SPAN | 30–40% | 35.4–35.7% | **37.2%** | **38.3%** |
| nozzle separation, % SPAN | 25–35% | 30.1% | **31.0%** | **30.4%** |
| blade cant | ≥1.15 | 1.23–1.29 | **1.22** | **1.22** |
| aspect SPAN/H | 3.0–3.6 | 3.24–3.30 | **3.23** | **3.11** |
| span | 34–38%W | — | **35.94%W** | **35.94%W** |
| centroid (pixel) | 52–60%H | — | **57.51%H** | **57.51%H** |

**Night passes every discriminator at in-game span.** No out-of-band result to report.

### The 1–2 point day/night gap is the instrument, and it reconciles exactly

Night reads SPAN 345 vs day's 339, extent 38.3 vs 37.2, aspect 3.11 vs 3.23. The two are the
same drawing, so a real difference would mean one of them was wrong. Cause: the night keyline
is `#425284` (max channel 132), which **passes** JET-SIL's `max(RGB) > 30` mask, while the day
keyline `#000008` fails it — so the night silhouette carries a 1 px ring the day one does not.
Excluding those 4 626 keyline pixels, night reproduces day to every digit:

```
night, keyline excluded:  SPAN 339  extent 37.2%  nozzle 31.0%  cant 1.22  aspect 3.23
day:                      SPAN 339  extent 37.2%  nozzle 31.0%  cant 1.22  aspect 3.23
```

Both readings are in band, so nothing turns on it, but the *reason* is now closed rather than
left as two numbers that disagree. It is a property of the measured night palette (which has
no true black — REFERENCE.md's night set uses `#425284` as its darkest step), not of the art.

### The identical span/centroid is real, and was checked

Day and night produce byte-identical masks (14 796 px, bbox `x[306,650] y[315,425]`). That is
the kind of too-clean result this project has been burned by, so: the two source frames differ
in **617 265** pixels, and the two isolated jets differ in **14 634 of 43 432**, with disjoint
palettes (`#a49c8c`/`#c5c5ad`/`#6b737b` vs `#425284`/`#8494c5`/`#c5d6f7`). Same geometry,
different drawing — which is the design, since both sheets are generated by one function.

Evidence: `tools/out/sprite-art-r5c/cmp-day-night-arcade.png` (day / night / arcade t175).

### Residual gap, by eye against the crop

Numbers all pass; the crop still shows our blades shorter and less steeply canted than the
arcade's, our wings sweeping down less, and our nacelle pods smaller with a thinner black ring.
Per REFERENCE.md's own rule that the crop outranks the numbers, that is the honest state: the
silhouette is correct in structure and in every published discriminator, and still a touch
timid against the reference.

## Two things outside the task, reported not actioned

1. **`tools/combat_probe.mjs` still runs Vite with HMR on** (`server: { strictPort: false }`,
   no `hmr: false`) — the same defect just fixed in `capture.mjs`, in a tool judges use for
   combat ground truth. Not my file, not edited. Flagged in `ask-sprite-art.md`.
2. **The barrel-roll sheet was already built before the "do not build it" instruction
   arrived.** `player-f14-roll.png` (8 frames) plus `JET_ROLL_SHEET` / `selectRollCell` are in
   the tree and in the previous section of this report, with ask A5. It is inert — `player.js`
   does not reference it, so it changes nothing at runtime. Say the word and I will back it
   out; I have not done so unprompted because deleting working, measured art seemed worse than
   leaving it unwired.

---

# APPENDIX 2 — depth stamp + fallback palette drift (r5d)

Two one-file fixes in `src/render/spriteFactory.js`. Captures under
`tools/out/sprite-art-r5d/`. Flags checked against the lead's `capture.mjs` note: every
invocation in this round used `--out` / `--frames` / `--every` / `--url-params`, all recognised,
so no capture of mine was silently defaulted.

## 1. `alphaTest: 0.5` — the jet quad's transparent margin was stamping depth

Applied to `createJetSprite`'s material, and to `makeCanvasSprite`'s (line 33) which has no
callers today but is a generic helper the next caller would inherit the defect from.

### Mechanism, confirmed before the fix rather than inferred from the improvement

The quad is 100×72 authored and the airframe fills ~97×31 of it, so **roughly 58% of the
stamped area is nothing at all.** Computed the quad's on-screen rectangle independently —
`jetNdcX/jetNdcY` from `__flowState()` at the measured tick, scaled by the authored-to-screen
factor (345 screen px ÷ 97 authored px = 3.557) — giving 356 × 256 screen px. Overlaid on the
frame it lands exactly on the jet with its margin, so the geometry is right, not fitted.

Note for anyone repeating this: the quad rectangle does **not** blank everything inside it —
9 660 effect pixels were already rendering inside the rect before the fix. Suppression is
depth-dependent, not positional: only elements *behind* the stamp are rejected. A positional
test alone would have under-reported it.

### A/B, jet present in both arms, only the material differing

`?fixed=1&seed=3&demo=2&invincible=1`, 12 frames at 20-tick spacing.

| | |
|---|---|
| differing pixels | **82 863** at 960×672 = **9 207 native px** (9 screen px per native) |
| frames affected | **12 / 12** |
| per frame | 767 native px |

**The A/B validates itself**: every frame's differing-pixel bbox is confined to the jet's own
neighbourhood and tracks it as it moves. A concurrent edit by another lane — clouds, sea,
HUD — would have shown as frame-wide difference. None did.

Largest colour buckets revealed (sampled 1-in-7, scaled): `#f6f6e7` the explosion white-hot
core, `#9e0000` the fireball rim, `#f9f647` hot yellow, and — not in the combat lane's list —
`#4a4a52` / `#31313a` / `#6b6b7b` / `#9494a4`, **the enemy airframe greys**. Enemies were being
punched out too, not just effects.

This is a different seed and a different sampling from combatfx-r5's 239 176 px over 150 frames,
so it is **corroboration of the mechanism and the marker colours, not a reproduction of their
number** — 767 native px/frame here against their 1 594, same order, different scene content.

**The crop is the real evidence** and it is larger than any statistic:
`tools/out/sprite-art-r5d/cmp-depthstamp-before-top-after-bottom.png`. Before, an **entire
fireball is missing** — only the white smoke cap above the quad survives. After, the full
explosion renders with core, rim and debris. It also confirms the `alphaTest`-over-
`depthWrite:false` choice visually: the jet's opaque body still occludes the fireball correctly,
which is exactly what `depthWrite:false` would have broken.

### Nothing was clipped — checked three ways, as asked

1. **Partial-alpha census.** `alphaTest` can only discard a fragment whose sampled alpha is
   < 0.5. Across all 11 sheets the jet or enemies can sample, distinct alpha values are exactly
   `{0, 255}` and partial-alpha pixels total **0**. The hard-edged rasterizer writes 255 or
   nothing, and `addKeyline` grows the keyline *outward* as opaque pixels rather than feathering
   it. With `NearestFilter` there is no interpolation to create intermediate alpha either.
2. **JET-SIL re-run, in-game, both sheets.** Every discriminator reproduces the r5c values
   exactly — day 100% / 37.2% / 31.0% / 1.22 / 3.23, night 100% / 38.3% / 30.4% / 1.22 / 3.11,
   span 35.94%W and centroid 57.51%H on both.
3. **Pixel-exact airframe comparison.** The isolated airframe is **byte-identical** before and
   after the change, day and night. Not one edge pixel moved.

`tools/art/sheet_visibility.py` re-run: 0 invisible combos across all 11 sheets. (It reads the
PNGs, which this change does not touch — run because it was asked for, but check 1 is the one
that actually bears on `alphaTest`.)

## 2. The procedural fallback palette had drifted — wider than `flame`

criteria-fix flagged `PLAYER_PALETTE_NIGHT.flame` as `#ef7308`, the daylight orange, in both
day and night. Correct, and it is not the only drifted value: **the whole night row was a
different set of blue-greys** (`#9ca4c5 / #7b84a4 / #4a5273 / #212942`, canopy `#9d3aca`, key
`#000008`) from the measured night palette the sheet ships (I3's 8 colours off
`ab2-arcade-night-banking.png`). Two tables, two owners, one concept — and it drifts invisibly
because this path only renders if a sheet fails to decode.

Fixed by making the table a **transcription with a stated source**: every value is now the exact
hex read back out of the corresponding PNG, not the pre-snap authoring value from
`tools/art/palettes.js` — which matters, because the authoring table runs everything through
`snapHexToLadder()`, so the night nozzle is authored `#ff7500` and *ships* as `#ff7300`.

| | day | night |
|---|---|---|
| lightTop | `#c5c5ad` | `#c5d6f7` |
| midNeutral | `#a49c8c` | `#8494c5` |
| slate | `#6b737b` | `#7384b5` |
| deepShadow | `#422921` | `#425284` |
| canopy | `#9c3ace` | `#c594f7` |
| flame | `#ef7300` | `#ff7300` |
| flameCore | `#ffd600` | `#ffd600` |
| key | `#000000` | `#425284` |

Night's `key` and `deepShadow` are deliberately the same value: the measured night set has no
true black, its darkest step doubles as the keyline. That is the arcade's palette, not an
economy, and it is the same property that makes the night keyline pass JET-SIL's `max(RGB)>30`
mask where the day keyline fails it (appendix 1).

**Verified as a source-level equality, and I am labelling it as that rather than as a render
check.** All 16 values are present in their corresponding sheet PNG. I tried to exercise the
fallback by capturing at tick 1, on the theory the sheet would not have decoded yet —
`poseSource` read `sheet-day`, so that capture measured the sheet and the check was vacuous. I
discarded it rather than publish it. **The fallback render path is not exercisable without
inducing a decode failure, so it remains unverified in-flight** — which is precisely why it
drifted unnoticed in the first place, and worth a future `?nosheet=1` measurement flag if
anyone wants it closed properly.

`npx vite build` passes.

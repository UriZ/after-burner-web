# R7 — effects/weapons lane: the continuous-tone class

**Owns**: `src/effects/**`, `src/weapons/**`, `src/entities/enemy.js`, `src/game/spawner.js`.
`enemy.js` and `spawner.js` were read and audited and **not modified** — the audit found
nothing in them that composites.

**Gap**: R6 judge gap 1 / `art-critique.md` §3 rank 1 — *Criterion A fails in ordinary play,
and it is a CLASS, not an object.*

**Tree state, and it matters.** Started from the committed checkout `e8fed58`
(`git status --short` empty under `src/`). **Four other lanes went live under me during the
round** and `src/render/ground.js`, `sky.js`, `game/stage.js` and `spriteFactory.js` all
changed between my first and last capture. Every table below names which tree it was taken on,
and the `?nocombat=1` control is carried through all of them so the background's own movement
is visible rather than silently folded into my result. **I did not commit, stash, checkout or
reset.** Captures are under `tools/out/fx-r7/`.

---

## Headline

| arm | gate | **`e8fed58`, before** | **after (this tree)** |
|---|---|---|---|
| ordinary play `?fixed=1&seed=N&invincible=1` | ≤256 / ≤32 | 63–99 / **36–98**, **24 of 24 frames over** | 59–71 / **26–30**, **0 of 60 over** |
| `?combatonly=enemies,shots` | ≤256 / ≤32 | 62–98 / **35–98**, **24 of 24 over** | 58–70 / **26–30**, **0 of 60 over** |
| `?combatexpl=1` | ≤256 / ≤32 | **46–385** / **21–230**, 13 of 24 over, **colours gate also failed** | 47–60 / **20–22**, **0 of 30 over** |
| `?nocombat=1` (control, another lane's files) | — | 46–51 / 21 | 30–52 / 18–20 |
| arcade `ab2-arcade-desert.png` | — | 138 / 31 | 138 / 31 |

**Every arm passes both halves of Criterion A on every frame.** 300 digit-verified stage-1
frames, **five tick spacings (97 / 137 / 173 / 211 / 311) × two seeds (1, 3)**, 0 black
frames, 0 byte duplicates, 0 near-duplicates, sweep validated on a planted fault.
Reproduce with `python3 tools/measure_fx_gate.py --dirs tools/out/fx-r7/f-play-*`.

**Honest split of the credit.** The world lane snapped their sky/sea palette to the hardware
ladder partway through my round, which took the background from 23 channel values to 20.
On the tree where *only my fix* was in (`a2-*`, their old background) the play arm read
**29–33, 16 of 24 frames over the gate** — my lane's own contribution is a constant
**+10 channel values over whatever the background costs**, in every arm, before and after
their change. The arithmetic is in "The remaining budget" below.

---

## 0. Instrument validation, before any number above was trusted

| instrument | control | result |
|---|---|---|
| `tools/measure_criterion_ab.py --selftest` | 13 synthetic + both native arcade frames | **PASS**, 138/31/68.7/68.5 and 79/17/84.0/80.2 exact |
| `tools/measure_fx_gate.py --selftest` (new) | black frame + exact duplicate + **one-native-texel** near-duplicate planted into 4 real frames | **PASS**, all three found, the 4 clean frames still measured |
| `to_native` 3×3 block check | an off-grid 3 px plant | **correctly REFUSED** the frame — the first near-dup I planted was not block-aligned and the decimation guard caught it before the sweep could |
| `tools/fire_mask.py --selftest` (new) | REFERENCE's FIRE-MASK control **both ways** | **PASS** — verbatim 0.8989 / 53.1 % / **17.2 %** / 0.764 and with the three mandatory rects 0.9030 / 53.6 % / **9.1 %** / 0.8475, against published 0.8989/53.1/17.2/0.764 and 0.9028/53.6/9.4/0.847 |
| `tools/fire_mask.py` synthetic | white disc r=20 inside red disc r=40, core fraction must equal the area ratio | **PASS** to 1e-9 |
| `tools/fx_palette_probe.mjs --selftest` (new) | **planted** soft-arc perimeter alpha; **planted** interior seam that `hardAlpha` cannot see; the same canvas with a palette | **PASS** — 36 partial-alpha texels found, 5 off-palette seam colours found, snapped version clean *and still two colours* |

Reproducing FIRE-MASK **both** ways is deliberate. REFERENCE ledger row 19 says the verbatim
reading is the recognisable failure mode; an instrument that only reproduces the correct number
has not demonstrated it applied the whole operator.

**And I hit row 19's failure mode in our own frames.** FIRE-MASK pointed at a `?combatexpl=1`
capture with no explosion on screen returns a clean **253 px "fireball" at 100 % V>0.95 and
45.1 % core, stable across ten frames**. It is the bottom `SPEED`/`STAGE` strip —
`hud_mask.py`'s mask is zeroed below the horizon by construction and cannot see it. The fix in
`fire_mask.py` is derived, not a box: **every pixel FIRE-MASK selects in the same run's own
`?nocombat=1&hidejet=1&noclouds=1` frame, dilated 1 px, is excluded.** Nothing that is there
when no explosion is there can be part of an explosion. Exactly the class of clean, plausible,
stable number CLAUDE.md warns about.

---

## 1. The class — full membership, and it is FIVE members and TWO mechanisms

The judge named two members and said not to assume the count was final. It is five, and they
divide into two mechanisms that need different fixes. `hardAlpha` had been masking the second
since R3, which is why four rounds of palette work never found it.

### Mechanism A — runtime compositing (what the judge and the critic saw)

| # | member | what it did | fix |
|---|---|---|---|
| 1 | `weapons/telegraph.js` | `opacity = 0.45 + 0.55 * beat` — a continuously varying alpha over sky, cloud, sea or aircraft | two authored variants of the star, selected on the beat; opacity always 1 |
| 2 | `effects/explosions.js` fireball | `opacity = t<0.8 ? 1 : ramp` — the alpha dissolve | a **palette sequence**: 3 fire phases → 2 decay phases, opacity always 1 |
| 3 | `effects/explosions.js` debris | `opacity = 1 - t` | two authored chunk textures, bright → cooled dark red |
| 4 | `effects/smoke.js` | `color.setScalar(continuous v)` **and** an opacity fade — a chain of 30 puffs at 30 ages put 30 greys on screen from 5 authored ones | the value ramp is **pre-baked into textures**, quantised onto 5 discrete ages × a 7-rung grey ladder; opacity always 1 |
| 5 | `weapons/missiles.js` ribbon | `vertexColors` on **shared** vertices = gouraud interpolation, a different grey at every pixel along and across the ribbon | six **unshared** vertices per segment, one snapped grey per segment |

Worked example, reproduced offline to the exact byte: **`#7e5c96`, a lavender, is `#941114`
(the flare's measured dark rim) at alpha 0.70 over the `#009eff` sky, composited in LINEAR
space.** That is the family `art-critique.md` §3(c) describes the explosion decaying through,
found in a completely different object. three.js blends in the linear working space, so the
composite is not even a straight-line mix of the two colours — which is why no amount of
palette tuning could have predicted which colours would appear.

### Mechanism B — the authored canvas, and `hardAlpha` is blind to it

`hardAlpha` thresholds a texel's **alpha**. It fixes the PERIMETER, where a shape meets
transparency. It does nothing to the INTERIOR seam between two overlapping **opaque** fills:
`drawEnemyShot` is four concentric ellipses, so three of its four boundaries antialias against
an opaque fill underneath and come out as genuine two-colour mixtures **at alpha 255**.
`hardAlpha` sees alpha 255 and leaves them.

Measured on `e8fed58`, `?combatonly=enemies,shots`, 24 frames: **115 distinct off-palette
colours in 492 pixels** — 0.03 % of one frame's area, carrying a third of the channel-value
budget, because A2 is a **set cardinality** and 492 pixels cost exactly what 492 000 would.
The burst canvas carried ~300 unauthored colours on its own (`#9f0000` and `#9d0000`, one level
either side of `E_RIM #9e0000`, were the two most common pixels in the frame).

Fixed at the source: `makePixelTexture` takes a `palette` and snaps every surviving texel to
the nearest entry in sRGB. For a two-colour AA seam that always resolves to one of the two
colours that made it, so the shape is unchanged and the seam just picks a side.

### What is NOT in the class, having been checked

- `entities/enemy.js`, `game/spawner.js` — no compositing at all. The `?combatonly=enemies`
  arm was already inside the gate and still is.
- `weapons/vulcan.js`, `lockSystem.js` — no runtime alpha; their textures were already
  explicit grids or plain rects. They now declare palettes anyway, so the probe covers them.
- `entities/enemySprite.js` — **not my file.** Audited read-only: its liveries are all on the
  hardware ladder and it composites nothing. It costs 8 of the 10 channel values combat adds,
  legitimately, as authored art.
- The `#ff3a21 × 4 px` that appears in every single combat frame and no `?nocombat=1` frame is
  the HUD's `RED_LOCK` status dot. On the ladder, authored, not an artifact. I chased it
  because a constant 4 pixels is exactly the shape of a bug.

---

## 2. Per arm, per spacing, before and after

Digit-verified stage-1 frames only; frames whose HUD digit is not `1` are **excluded**, not
measured (REFERENCE ledger rows 11/12). `min/med/max` across all frames of the arm.

### Before — clean checkout `e8fed58`, 3 spacings (97/137/211), seed 1, 24 frames per arm

| arm | colours | channel values | frames over A2 | off-ladder values/frame |
|---|---|---|---|---|
| `?nocombat=1` | 46/51/51 | 21/21/21 | 0/24 | 4 |
| ordinary play | 63/71/99 | **36/54/98** | **24/24** | 10–71 |
| `?combatonly=enemies,shots` | 62/70/98 | **35/53/98** | **24/24** | 9–71 |
| `?combatexpl=1` | **46/169/385** | **21/108/230** | 13/24 | 4–200 |

### Intermediate — compositing fixed, palettes not yet on the ladder (`a1-*`)

| arm | colours | channel values | frames over |
|---|---|---|---|
| `?nocombat=1` | 48/53/53 | 23/23/23 | 0/24 |
| ordinary play | 63/67/72 | 35/38/42 | 24/24 |
| `?combatonly=enemies,shots` | 62/66/71 | 34/37/41 | 24/24 |
| `?combatexpl=1` | 48/53/61 | 23/28/37 | 9/24 |

Off-palette pixels went from **115 colours / 492 px to 1 colour / 4 px** (the HUD lock dot) —
i.e. mechanism A and B were both closed here. The gate still failed, and the reason was
arithmetic, not compositing: see §3.

### After — palettes snapped to the hardware ladder (`a2-*`, same background as `a1`)

| arm | colours | channel values | frames over |
|---|---|---|---|
| ordinary play | 63/67/72 | 29/33/33 | 16/24 |
| `?combatonly=enemies,shots` | 62/66/71 | 29/33/33 | 16/24 |
| `?combatexpl=1` | 48/53/61 | **23/23/25** | **0/24** |

### Final — this tree, 5 spacings × 2 seeds

| arm | n | colours | channel values | over A2 | over A1 | black / dup / near-dup |
|---|---|---|---|---|---|---|
| `?nocombat=1` control | 30 | 30/52/52 | 18/20/20 | 0 | 0 | 0/0/0 |
| **ordinary play** | 60 | 59/66/71 | **26/30/30** | **0** | 0 | 0/0/0 |
| **`?combatonly=enemies,shots`** | 60 | 58/65/70 | **26/30/30** | **0** | 0 | 0/0/0 |
| `?combatonly=enemies,telegraph` (new arm) | 60 | 55/64/69 | 25/28/29 | 0 | 0 | 0/0/0 |
| `?combatonly=enemies,shots,noflare` (new arm) | 60 | 58/64/69 | 25/30/30 | 0 | 0 | 0/0/0 |
| **`?combatexpl=1`** | 30 | 47/52/60 | **20/20/22** | **0** | 0 | 0/0/0 |

Per ledger row 18, each figure is reported with its **extremal** (`max`), not only the median,
and the gate is read on the max. No arm's worst frame exceeds 30 of a budget of 32.

**Two new isolation arms** were added to `weapons/combat.js` because the gap could not be
attributed without them. `?combatonly=enemies,shots` lights telegraphs exactly as it always
did, so **the judge's named reproduction arm means what it meant when the figure was taken**;
`?combatonly=enemies,telegraph` runs flares with no rounds in the air, and
`?combatonly=enemies,shots,noflare` runs rounds with no flares. The pair is what showed the
flare's opacity ramp and the shot sprite's antialiased interior to be two separate defects.

---

## 3. The remaining budget — where all 30 channel values go

Combat's contribution is **constant and entirely on the ladder**. Over 60 frames of each arm,
relative to the union of the `?nocombat=1` control's 20 values:

| arm | channel values added | all on the ladder? |
|---|---|---|
| ordinary play | **10** — 25, 41, 49, 58, 74, 107, 123, 140, 173, 189 | **yes, 10/10** |
| `?combatonly=enemies,shots` | 10, the same set | yes |
| `?combatonly=enemies,telegraph` | 9 (no 107 — that rung is the shot's salmon edge) | yes |
| `?combatexpl=1` | **2** — 74, 189 | yes |

Attributed to the art: the **grey** MiG livery owns 58/123/140/173/189, the **interceptor**
livery owns 25/41/74, and this lane's enemy-shot palette owns 49 (`#ff7331`) and 107
(`#e66b63`). None is discardable without changing measured art, and the interceptor livery on
stage 1 is a documented ADOPTED choice (`enemy.js` `LIVERY_BY_STAGE`, GAME_SPEC §4 t102.5), so
I did not remove it to buy rungs.

**Why the ladder snap was the whole second half of the fix.** A2 is the size of the UNION of
channel values over the frame, so a palette's cost is not how many colours it has — it is how
many ladder rungs it uses that nothing else was already standing on. Our seven-colour fireball
was spending 21 channel values of which 20 were its own, because every hex in it sat one or two
levels off a rung the sky and sea already used. Snapping the FX palettes took their union from
**43 values to 24**, and because the background is ladder-authored too, the frame total is then
bounded by 31 **by construction** — which is exactly how the arcade gets 31.

Every snap is ≤6/255 and almost all ≤4/255, and each constant keeps its measured pre-snap value
in a comment beside it. `E_RIM #9e0000→#9c0000`, `E_DEEP #c90000→#c50000`,
`E_ORANGE #e4770a→#e67310`, `E_AMBER #f1a60c→#efa410`, `E_GOLD #ffba04→#ffbd00`,
`E_YELLOW #f9f647→#f7f74a`, `E_HOT #f6f6e7→#f7f7e6`; shot/telegraph `#ffd570→#ffd673`,
`#ff7733→#ff7331`, `#941114→#941010`, `#e96c63→#e66b63`; vulcan, missile, muzzle and bracket
likewise. `SEGA_LADDER` is in `effects/pixelTexture.js` as REFERENCE's **enumerated table**,
not a formula — `round(k·255/31)` yields 90 for 91 and 165 for 164 and emits 8, which appears
in neither native frame. The probe asserts that.

**One off-ladder channel value survives in every frame of every arm, including `?nocombat=1`,
and it is not mine**: **159 = 0x9f**, the stage-1 sky `#009fff` (41 973 px). See
`judging/R7/ask-fx.md`.

---

## 4. The palette-subset probe — `tools/fx_palette_probe.mjs`

The "audit the class, not the object" deliverable, modelled on `tools/hud_palette_probe.mjs`.
`tools/fx-probe.html` + `tools/fx-probe.mjs` build every composited element's authored canvas
and read it back with `getImageData` **in the page**, so no PNG round-trip sits between the
canvas and the number (PNG round-tripping an un-premultiplied partial-alpha pixel can change
its RGB, and partial alpha is one of the two quantities under test).

The declared palette **travels on the texture** (`texture.userData.palette`), so the probe
cannot drift from the art the way a list in a tool would.

**GATE** (exit 3): partial-alpha texels == 0, off-declared-palette opaque texels == 0, and
every element declares a palette. **Advisory**: Criterion A3 per-sprite colour count, and
channel values off the hardware ladder.

Result over **33 authored canvases** — 5 projectile/bracket sprites, 2 telegraph variants, 9
burst phases × arrangements, 2 debris chunks, 15 smoke textures:

```
partial-alpha texels, total ............ 0
off-palette opaque colours, union ...... 0
elements with NO declared palette ...... 0
channel values over all elements ....... 24
of those, OFF the hardware ladder ...... 0
Criterion A3 over ceiling .............. 0
```

Largest per-sprite colour count is **7** (the fireball) against A3's ceiling of 16 for an
effect sprite; the enemy shot is 4, the telegraph 3–4, a smoke puff 3.

**I cropped and looked** rather than taking the clean pass on trust. The probe page draws every
canvas at 6× for exactly that; `judging/R7/fx-r7-0*.png` are the in-situ crops.

---

## 5. Did quantizing cost the fire? Measured, and one statistic regressed

`?combatexpl=1&hidejet=1&noclouds=1`, every 3 ticks over two full blasts, FIRE-MASK with the
derived clean-frame exclusion. Growth frames (component < 1500 px) excluded from the band —
they are the sprite at 35 % of full size.

| | arcade (`ab2-arcade-huge-explosion.jpg`, mandatory rects) | R6 committed (published) | **this build** |
|---|---|---|---|
| near-white core | **9.2 %** (my re-run: 9.1 %) | 9.1–12.3 % | **7.9–10.5 %** |
| mean S | **0.846** (my re-run: 0.8475) | 0.824–0.846 | **0.822–0.846** |
| mean V | 0.903 | — | 0.861–0.871 |
| **V > 0.95** | 53.6 % | **40.7–48.6 %** | **34.0–41.6 %** |

**Core and saturation are in band and on the arcade's own numbers. The bright fraction
regressed and I am reporting it rather than hiding it.** Cause isolated by A/B on my own file
(three builds, same capture parameters):

| cavity radius | V>0.95 median |
|---|---|
| 0.26 (the hole radius this started at) | 35.4 % |
| **0.18 (shipped)** | **37.9 %** |
| 0 (cavities removed entirely) | 41.3 % |

A transparent hole sits **outside** FIRE-MASK; an opaque dark-red one sits **inside** it. So
making the fireball opaque — which is the fidelity fix — necessarily moves this statistic down,
and the whole 3.4-point residual at 0.18 is that. It was already below the ≥45 % accept figure
before I touched it, and STATUS.md records R6 deciding not to chase it because the lever is
spike thickness and the spikes are a separately flagged art defect. **I did not touch the
spikes.** I shrank the cavities to 0.18 because the arcade's own interior is 8.8 % non-fire of
which only **1.8 %** is genuinely dark — less dark interior is the faithful direction, not just
the one that moves the number.

**The crop outranks the number and I looked at it**
(`fx-r7-01-explosion-BEFORE-AFTER-ARCADE.png`, ours-before / ours-after / arcade, 3×): white-hot
core, yellow lobes, orange body, ragged dark-red rim with spikes, and — the change — **no sky
showing through anywhere**. It still reads as fire.

---

## 6. Two measurements in `explosions.js` that do not reproduce, and one criterion I withdrew

### (a) "20.0 % of the arcade fireball is holes, 51.4 % of them sky" — WRONG, and the hole-punching it justified is removed

`explosions.js` justified punching ~8 % of the sprite to transparency with: *"the non-fire
pixels lying strictly inside its own silhouette on ab2-arcade-huge-explosion.jpg [are] 20.0 %
of the filled silhouette, and 51.4 % of those read as SKY (B > R + 0.05, median RGB 88/66/244)
against only 7.7 % genuinely dark."* `art-critique.md` §3(b) independently reported the
consequence from the other end: six holes of literal sky in our death starburst.

Re-run on the same frame with the same stated operator (V > 0.55 ∧ R > B + 0.10, largest
8-connected component, **n = 10 980 px — their own n, so it is the same component**), interior
found by flooding non-component pixels from the border:

| | published | **my re-run** |
|---|---|---|
| interior non-fire, % of filled silhouette | 20.0 % | **8.8 %** (1 060 of 12 040 px) |
| of those, SKY-like (B > R + 0.05) | 51.4 % | **12.9 %** — 137 px, **1.1 % of the silhouette** |
| of those, V ≤ 0.35 | 7.7 % | 1.8 % |
| dominant interior non-fire colours | — | **`#f7f3ff` `#f9f8ff` `#fbf4fc`** — near-WHITE |

The "holes" are overwhelmingly **the fireball's own near-white pixels**, which the warm mask
(`R > B + 0.10`) rejects because white is achromatic. The operator was counting its own
exclusions as background. The 137 sky-like pixels are scattered across rows 6–121 — JPEG
ringing in the spike gaps, not structure. **The crop agrees**: at 4× the arcade fireball is
solid and what reads as a hole is a white patch.

So the cavities stay — the interior genuinely has dark red streaks through the yellow — but
they are **drawn in `E_DEEP`, not punched to transparency**.

This is the same defect shape as ledger rows 15 and 19: a mask whose exclusions were read as a
property of the subject. It belongs in the ledger.

### (b) "decay into two or three dark smoke greys" — WITHDRAWN, with the reason

`art-critique.md` §3's fix (iii) asks for a palette sequence ending in dark smoke greys, on the
strength of the grey mass around the starburst in `reference/death-starburst-gp-t202.png`.

**I did not build it.** That frame is a dark stage: its sky is black, and its grey masses
cannot be separated from that stage's own clouds by any operator I could write. The one
unambiguously daylight arcade explosion this repo holds,
`reference/ab2-arcade-huge-explosion.jpg`, has **no grey anywhere in it** — it is red, orange,
yellow and white and its darkest material is a deep red. My own low-saturation sweep of that
frame finds **121 candidate "smoke" pixels of 22 987**, scattered, at JPEG noise level.

Authoring grey smoke for a daylight stage out of a night frame is **ledger row 12 exactly**.
So the decay runs into the fireball's own measured dark end instead: phase 1 drops the white
core and the two bright bands, phase 2 is `E_RIM`/`E_DEEP`/`E_ORANGE` only, spikes shortened
0.78× then 0.55×. The fire goes out, deep red last; the alpha dissolve — the part a 1987 board
genuinely cannot do — is gone either way. `fx-r7-04-explosion-decay-AFTER.png`.

**If the grey smoke is wanted, it needs a daylight arcade frame of a decaying explosion that
this repo does not currently hold.** Flagging rather than inventing.

### (c) The smoke ladder cannot have five steps, and that is the hardware

`smoke.js` authors a five-step near-white ladder (0.933 / 0.957 / 0.976 / 0.992 / 1.000,
area-weighted mean 0.9647 against the measured plume's 0.9674). Above V 0.90 the hardware
ladder has **three rungs** (239, 247, 255). 0.957 and 0.976 are the same rung. **A bright puff
comes back as three bands however it is authored.** The arcade's own five-colour cloud puff
(`#f7f7e6 #f7f7b5 #e6e6a4 #d6d694 #c5c584`) spans V 0.772–0.969 — it buys five steps with
RANGE, not with resolution it does not have. The shipped `SMOKE_RAMP` is seven consecutive
rungs 206–255; the puff's area-weighted mean after snapping is **0.9685** against the measured
0.9674 (the six-rung version I tried first read 0.9594).

---

## 7. The rest of the class audit — `?demo=2`, where the missiles are

Not one of the gate's named arms, but it is where the trail, the billow and real kills live.
38 frames at four spacings (97/173/311 plus a fine 11-tick run; none divides the 960-tick
attract cycle):

| | colours | channel values | frames over A2 |
|---|---|---|---|
| `?demo=2` | 52/71/90 | 25/29/**36** | **1 of 38** |

**The one frame over is a STAGE-2 TALLY CARD frame** — `HIT COUNTS 30 / POINTS 705322`, HUD
digit 2. Its excursion is `#ff1300` and `#00dcc6` (`game/flow/cards.js` `CARD_CYAN`) and
`#eec0f8`, none of them this lane's. It is out of population for a stage-1 gate and my
digit-verified sweeps correctly exclude that class. **Flagged to the flow lane in
`ask-fx.md`**, not fixed — not my file.

Every other `?demo=2` frame, with the launch billow, the ribbon, the aged puff chain, missiles,
explosions and debris all on screen at once, is at or under 30.

---

## 7a. The `?demo=2` figure against the criteria lane's own baseline

`lane-criteria.md` JOB 1 measured `?demo=2` at `e8fed58` on its own instrument. Same arm,
after:

| | n | colours min/med/max | channel values min/med/max | over A2 |
|---|---|---|---|---|
| criteria lane, `e8fed58` | 12 | 54 / 407 / **1 375** | 28 / 229 / **255** | 10 of 12 |
| **this build** | 38 | 52 / 71 / **90** | 25 / 29 / **36** | **1 of 38** |

And JOB 1's licence settles the thing this lane most needed settled: **the arcade's own
night frame holds a 33.4 %W × 18.3 %H fireball inside 79 colours and 17 channel values.** The
target was never a smaller or dimmer explosion, and nothing here made the fireball smaller —
`PEAK_FRAC` is untouched at 0.30 and the measured core and saturation are unchanged. The whole
218 → 20–22 came from how it is composited.

---

## 7b. The nose sight square — 3.750 %W → 1.562 %W, and it is now the arcade's glyph exactly

Add-on, after the main job. **Size only** — `SIGHT_NDC_Y_OFFSET` is untouched, per
`lane-criteria.md` JOB 2: the sight sits 7.8 %H and 8.8 %H *above* the airframe in two banked
frames and **12.0 %H below it** in a third, so no fixed screen offset can reproduce all three
and the constant must not move before a level frame **and** a hard-bank frame exist.

**The constant did not mean what it said.** `SIGHT_PX = 10` reads as 3.125 %W. Measured on
screen (`?combatonly=sight&hidejet=1&noclouds=1`, near-white assembly bbox minus the per-run
`hud_mask.py` mask, 4 frames identical): **12 × 12 px = 3.750 %W, 36 ink px.** `_placeCorners`
puts each bar's *centre* on the corner row, so half a stroke hangs outside and the rendered
assembly is `boxPx + strokePx` rounded up. Anything tuned against that constant has to be
measured on screen, not computed from it.

| | side | %W | ink px | glyph |
|---|---|---|---|---|
| ours, before | 12 px | **3.750** | 36 | solid-ish corners |
| **ours, after** | **5 px** | **1.562** | **12** | `##.##` / `#...#` / `.....` / `#...#` / `##.##` |
| **arcade**, `ab2-arcade-desert.png` x[127,131] y[91,95] | **5 px** | **1.563** | **12** | `##.##` / `#...#` / `.....` / `#...#` / `##.##` |
| published band (`lane-criteria` JOB 2) | — | 1.4–1.8 | — | — |

**Byte-for-byte the same 12-pixel glyph as the arcade**, verified by dumping both at
`min(RGB) ≥ 200`. `judging/R7/fx-r7-06-nose-sight-BEFORE-AFTER-ARCADE.png` (17×17 native tiles
at 16×, ours-before / ours-after / arcade).

Getting there needed two things beyond the number. `SIGHT_PX = 4` on the old convention
rendered a **solid 6 × 6 ring, 28 ink px** — the bracket's 1.3 px stroke is 26 % of a 5 px box
and closes the gaps the glyph is made of. So `_placeCorners` gained three options, all
defaulting to the existing behaviour: `outer` (bar centres inset by half a stroke, so `boxPx`
means the rendered outer side), `strokePx`, and `armPx`. The sight passes
`{ outer: true, strokePx: 1, armPx: 2 }`.

**The lock bracket is provably unchanged.** Captured `?combatonly=enemies,locks,brackets` with
my `lockSystem.js` and with `git show HEAD:src/weapons/lockSystem.js` swapped in (and swapped
back — verified), 4 frames each: **0 differing pixels on 4 of 4**. Its size is a published
R4-gap-10 acceptance number measured on rendered pixels, so it stays on the old convention
deliberately rather than being silently shrunk by 1.3 px in passing.

**It cannot have moved the lock cone**, and I checked rather than assumed: `_nearestLockable`
tests `LOCK_RADIUS_FRAC = 0.22` around the sight's *position*, which `combat.js` computes from
the airframe along screen-up (the R6 bank-independence fix). `SIGHT_PX` is only ever passed to
`_placeCorners`, which draws. Byte-identical bracket frames are the same evidence from the
other end — the tracked target did not change.

Criterion A re-verified after the change: ordinary play at three spacings, **18 of 18
digit-verified stage-1 frames, 26–30 channel values, 0 over the gate.**

---

## 8. What changed, file by file

| file | change |
|---|---|
| `effects/pixelTexture.js` | `makePixelTexture({ palette })` snaps every surviving texel to the declared palette (the mechanism-B fix); palette travels on `texture.userData`; `SEGA_LADDER` + `snapToLadder` published |
| `effects/explosions.js` | palette declared and snapped to the ladder; `PHASES` (3 fire + 2 decay) replace the opacity ramp; holes → opaque `E_DEEP` cavities at `CAVITY_R = 0.18`; chunks get two authored textures instead of an alpha fade; probe accessors |
| `effects/smoke.js` | `SMOKE_RAMP` (7 ladder rungs) + `SMOKE_VALUES` (5 ages); one texture baked per (kind, age); no `color.setScalar`, no opacity fade; `snapSmokeValue` exported for the ribbon |
| `effects/trailPalette.js` | `puffFadeFrom` / `billowFadeFrom` marked RETIRED, kept with their note because the note is the argument |
| `weapons/projectileSprites.js` | every texture declares a palette; all hexes snapped to the ladder with their measured values kept in comments; the missile body rect moved to integer coordinates |
| `weapons/telegraph.js` | two authored star variants replace the opacity pulse; `TELEGRAPH_PALETTE` exported; map set before `sizeSprite` |
| `weapons/missiles.js` | ribbon vertices unshared, one snapped grey per segment, `edgeMult` no longer applied; `fadeFrom` dropped from both smoke call sites |
| `weapons/combat.js` | `telegraph` / `noflare` isolation keys; the judge's `enemies,shots` arm unchanged. `SIGHT_NDC_Y_OFFSET` **untouched** |
| `weapons/lockSystem.js` | `SIGHT_PX` 10 → 5 with `{ outer, strokePx, armPx }`; `_placeCorners` gains those three options, all defaulting to the existing behaviour. Lock bracket byte-identical to HEAD on 4/4 frames |
| `entities/enemy.js`, `game/spawner.js` | **unchanged** — audited, nothing composites |
| `tools/fx-probe.html`, `tools/fx-probe.mjs`, `tools/fx_palette_probe.mjs` | NEW — the palette-subset probe and its planted-fault controls |
| `tools/fire_mask.py` | NEW — FIRE-MASK with both published controls and a derived clean-frame exclusion |
| `tools/measure_fx_gate.py` | NEW — the gap's reproduction: digit-verified Criterion A per arm, with a planted-fault-validated corruption sweep |

---

## 9. Open, with reasons

1. **The bright fraction (V > 0.95) is 34.0–41.6 % against an accept figure of ≥45 % and the
   arcade's 53.6 %.** 3.4 points of that is the cost of making the fireball opaque and is
   measured above; the rest predates this round. The lever is spike thickness and the mean V of
   the dark rim, both of which are the *art* and are a separately flagged defect. Not touched.
2. **The grey smoke decay is not built**, for want of a daylight arcade frame of a decaying
   explosion. §6(b).
3. **One off-ladder channel value remains in every frame and it is the stage-1 sky.** Not my
   file; `ask-fx.md`.
4. **`?demo=2`'s tally-card frame reads 36 channel values.** Not my file; `ask-fx.md`.
5. **Criterion B was not measured for this lane.** The world lane's own R7 work owns the ground
   band, and REFERENCE ledger row 21 separately establishes that B is population-*insensitive*
   (80.8→80.6 H, 56.4→56.3 V with combat on), so there is nothing here for an effects lane to
   move. Stated rather than silently skipped.
6. **The explosion's "UNATTRIBUTED stage" flag still stands** (REFERENCE's stage-attribution
   table). Every fireball figure in §5 inherits it: `ab2-gameplay.mp4` has no stage map and
   `ab2-arcade-huge-explosion.jpg` is an unlabelled third-party capture. I did not add a
   licence this evidence cannot support.
7. **`BRACKET_BOX_PX = 16.5` does not mean what it says either** — the lock bracket renders at
   ~17.8 px = **5.56 %W** against its own published 5.15 %W target, the same off-by-a-stroke the
   sight had. I did **not** fix it: that figure is a published R4-gap-10 acceptance number
   measured on rendered pixels, and correcting the convention would shrink a verified element
   by 1.3 px as a side effect of a sight resize. `_placeCorners` now has the `outer` option it
   would need. Whoever owns that measurement should decide.
8. **The ribbon's measured geometry was not re-measured.** The vertex-sharing rewrite writes
   identical positions (both copies of a sample come from one computation) and I verified the
   trail visually (`fx-r7-05-trail-AFTER.png`), but column occupancy and head width are
   published acceptance numbers and I did not re-run them. If a judge re-runs one number from
   this lane, make it that one.

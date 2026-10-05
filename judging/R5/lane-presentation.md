# Round 5 — presentation lane (HUD / fonts / flow cards / title typography)

Scope worked: **Priority 0** (the tree did not boot), **gap 3** (HUD typography, emblems,
throttle, life icons, and the criterion audit), **gap 9** (card sizing and colour), **the
typography half of gap 8** (title `INSERT COIN!`).

Files touched: `src/ui/hud.js`, `src/ui/font.js`, `src/game/flow/cards.js`,
`tools/cards-preview.{html,mjs}` (new, additive, uniquely named). Nothing outside the lane
was edited; `tools/art/sheets/title-logo.js` was not touched. No commit, stash, checkout or
reset. Captures all under `tools/out/presentation-r5c/`.

---

## Headline

**Both HUD emblems and the whole throttle widget are now pixel-exact against the arcade.**
Not "within tolerance" — identical. Over the 12 verification frames, **13,272 of 13,272**
pixels in those elements match the arcade byte for byte, on every pixel where the two native
reference frames agree with each other.

That was possible because the repo holds two frames at the board's own 320×224
(`reference/ab2-arcade-desert.png`, `reference/ab2-arcade-night-banking.png`), and over the
HUD they are **byte-identical to each other** — two different stages, two different ground
palettes, the same bitmap. Everything below is a transcription of that bitmap, not a fit to
it. Where a generative model and the measurement disagreed, the measurement is stored as
data (`inset` arrays, `M_BAR_TICKS`), exactly as `LIFE_SPRITE` already was.

Secondary, and the finding I would most like the judge to look at:
**R4's gap-3 acceptance criterion is failed by the arcade itself, on its own frames, on 4 of
its 5 HUD ink classes — including both elements that sit on the arcade's own white plate.**
§5 gives the numbers and proposes the replacement.

---

## 0. Priority 0 — the tree did not boot

`SCALE_EMBLEM_TEXT is not defined` at `hud.js:524`, thrown inside the `Hud` constructor,
which runs inside `Screen`, which runs inside `Game`. `window.__frameReady` was therefore
never set and **every capture and every probe on this tree failed, for every lane**.
`npx vite build` passed throughout — it is a runtime error, so the build was never a check.

The previous session had rewritten `drawEmblem` to take an options object and deleted five
`SCALE_*` array constants, without writing the options objects or updating the call sites.

Re-adding the five constants would have booted the page and then fed `undefined` into
`opts.body` / `opts.wing` / `opts.textDy`, i.e. NaN geometry drawn silently. I wrote the real
descriptors instead. In doing so I had to derive the geometry properly, which is what §1 is.

Boot verified with a capture, not the build:

```
node tools/capture.mjs --out tools/out/presentation-r5c/boot --frames 1 --every 300 \
     --url-params "seed=1&nocombat=1"
```

Clean exit, no page errors, frame opened and inspected: full scene, HUD drawn, mean luma
129, 223 distinct levels. Static scan of the whole file afterwards: **zero unresolved
identifiers, zero orphaned constants** — no second `ReferenceError` waiting behind the first.

---

## 1. The emblems (gap 3: red extent, swept chevrons)

Operator: exact-colour classification of every pixel in x[14,74] and x[156,220], y[13,27],
against the four authored HUD values `#0000f7 / #f7f7f7 / #f70000 / #000000`; anything else
is "world". Run on the desert frame, then re-run independently on the night frame. **The two
agree on every row of both emblems.**

### What the transcription changed

| | R5a model | measured | consequence |
|---|---|---|---|
| SCORE left edge per row | `round(6r/11)` → 0,1,1,2,2,3,3,4,4,5,5,6 | **0,0,1,1,2,2,3,3,4,4,5,6** | wrong on every odd row |
| HIT left edge per row | same formula | **0,1,1,2,2,3,3,4** | formula happens to be right here |
| wing colour, last two rows | red | **blue** | closes the chevron to a point instead of a frayed stub |
| HIT plate | white body | **no body at all** | the whole +41.8 % red-extent overrun |

The slope is floor-biased on SCORE and round-biased on HIT, so no single proportional slope
fits both. They are transcribed arrays now.

HIT having no plate is checkable rather than asserted: desert y19 reads
`...RRRk.RRRk....WWW`, with **ground pixels** at x165 and x183–186 between the T and the
right wing. Equally, the wings' white stripes on the odd rows are **authored pixels, not the
body showing through** — HIT has no body and still carries `#f7f7f7` at x[161,164]/[187,190]
on y17, x[162,164]/[187,189] on y19, x[163,164]/[187,188] on y21, in both frames, against
orange ground in one and black sky in the other. My first pass skipped them for the bodyless
emblem and rendered HIT as four detached red bars; the per-pixel diff caught it immediately.

### Result

| | arcade | ours | REFERENCE.md table | R4 |
|---|---|---|---|---|
| SCORE red extent | x[17,70] = 54 px = **16.88 %W** | identical | 16.76 %W (+0.7 %) | +20.1 % |
| HIT red extent | x[161,190] = 30 px = **9.38 %W** | identical | 8.9 %W (+5.3 %) | +41.8 % |

Pixel diff against the two-frame consensus: **SCORE 610/610 match, HIT 196/196 match.**
The ±20 % bound is met by construction, not by tuning.

### Alignment fixes found while in there

- `M_HIT_DIGITS.right` was **214**, the digit's *ink* edge, where `M_SCORE_DIGITS.right` is
  143, the *shadow* column. Right-aligning on it put every HIT digit one pixel left of the
  arcade's. Now 215: 215−7 = 208, where the desert "4" and the night "2" both start.
  (Score needed no change: 143−47 = 96 lands exactly on the desert frame's "248020".)
- Score digits, HIT digits and the stage digit now draw as **FACE_BIG at scale 1**. The five
  dead `SCALE_*` arrays were fractional scales on a 5×7 face, which cannot render a 2-px
  stroke. No fractional scale remains on any big-face element.

---

## 2. The throttle widget (gap 3: "scale digits inline with the bar")

The two native frames are **byte-identical over the whole rect x[54,131] y[200,207]** — fill
extent, gradient, all nine ticks, all four labels.

What R5a had, and what is actually there:

| | R5a | measured |
|---|---|---|
| scale labels | three pale-yellow ringed digits `0 2 3` floating above the bar | **four white 4×5 glyphs `0 1 2 3` at x56/78/100/123, drawn ON the fill** |
| bar shading | 3-stop highlight/mid/shadow | **one colour per row, six rows**, whose *second* row is the lightest (a tube highlight) |
| ticks | 2×2 black, pitch 5, inside the bar | **2×2 with an `#a4a4a4` top-left pixel, at nine measured columns, running the WHOLE track** including past the end of the fill |
| widget keyline | black box around the whole thing | **none** |

The last row is worth spelling out, because it is the one that was an *inference* and turned
out to be an artefact. R5a saw stray bar-coloured pixels inside the `0` label and read them
as a ragged left cap, then drew a black box to cover it. There is no cap and no box: applying
the arcade's ordinary right+below drop shadow to the 4×5 `0` grid and painting ink over it
reproduces x[55,62] y[200,207] **exactly, black for black**, including the two counter pixels
at (58,203)/(58,204) where the *bar*, not the shadow, shows through the glyph's hole. The
same check explains the "black seam" at x80–81 between the blue and amber halves: it is the
`1` label's drop shadow. There is no seam.

A new `FACE_TINY` (4×5, four glyphs) was added to `font.js` for these. Pixel diff against the
two-frame consensus, by element:

```
'0' + blue fill + 3 ticks   144/144   '2' + shadow            26/26
'1' + shadow                 12/12    '3' + shadow            28/28
amber fill x82-96            90/90    ticks past the fill     12/12
```

Zero mismatches. The one number that is **not** measured is the track's full width: both
frames sit at the same ~0.59 throttle and neither shows the bar full, so f=1 is set to fill
from the `0` label's left edge to the `3` label's right edge, and the code says so.

One correction I made to my own work: I first read the `3` label at x122 from a column count
and the per-pixel diff returned 9 mismatches. It is at x123 in both frames; the label pitch is
22/22/**23**, not uniform.

---

## 3. The life icons (gap 3: "the missing bottom-left aircraft-position icon")

Present and **pixel-exact**. The arcade's icons at x[16,22] and x[24,30], y[211,214] are an
identical 7×4 four-colour bitmap; `LIFE_SPRITE` reproduces it cell for cell, pitch 8
confirmed. The only difference is our additional keyline ring (see §5).

At 1× the icons read as a dark smear, which is what they look like in the arcade too at that
size; the transcription, not the impression, is the measurement.

---

## 4. Cards (gap 9) and title typography (gap 8)

Measured in isolation via a new harness, `tools/cards-preview.{html,mjs}` — the cards are
drawn onto a flat 320×224 canvas on an off-palette background, so every card pixel is
separable by exact colour. Reaching the real cards in-game needs a death and a timed
countdown; this measures the authored canvas, which is what the question is about.

All four of gap 9's named defects **verify as fixed**:

| gap 9 defect | arcade (measured) | ours | |
|---|---|---|---|
| "CONTINUE PLAY spans ~62 %W against ~35 %" | 32.8 %W | **31.2 %W** | −4.9 % |
| "INSERT COIN is cyan and should be red" | `#ff0000` | **`#ff0000`** | exact |
| "countdown digit drawn behind the player jet" | — | **in front** | §4a |
| "READY sits low enough to collide with the bottom HUD row" | top native y138.8, ink x[143.5,182.0] w=39.0 | **top y138, x[143,182] w=40** | HUD strip starts y199 |

Tally card: the arcade's label-red / number-cyan split is in place and visible in the in-situ
capture (`demo-long/frame-0056.png`).

One real defect found and fixed: the countdown was drawn at `pxY = 2.5`, rendering **20 px**
tall. Every card line the arcade draws measures ~15.6 native px including its keyline on
t261, and the tally card's two lines measure 13.7 and 14.0 native for the glyph body on t124
— an independent check at a different magnification (3.21× vs 2×). Now `pxY = 2`, giving 16.
All three continue-card lines are now the same height, as the arcade's are.

### 4c. The cards now draw in the arcade's own card face

Following the lead's ruling, §7 — which was a withdrawal in the first pass of this report —
is done. `cards.js` has **no fractional scale left in it**; every line is `FACE_BIG_CARD` at
pxX = 1, pxY = 2. Measured against the arcade:

| line | arcade (native) | ours | |
|---|---|---|---|
| CONTINUE PLAY | x[103.0, 207.5] w=105 | **x[103, 207] w=105** | both edges, exact |
| INSERT COIN | x[113.0, 199.5] w=87 | **x[112, 198] w=87** | width exact, 1 px left |
| countdown "10" | ink centre 159.5 | **centre 158.5** | 1 px |
| READY | x[143.5, 182.0] w=39.0 | **x[142, 182] w=41** | right edge exact; the extra 2 px is our keyline ring, which t207's threshold could not see against black |
| tally labels / numbers | labels from x39, numbers right-align x143 | **x[38, 143]** | right edge exact |
| tally STAGE line | label x[120.2, 158.4], digit x[184.9, 190.5] | **label x[119, 159], digit x[184, 192]** | both within the ring |

Two structural errors fell out of doing this properly:

- **The tally's "STAGE n" is two elements, not one centred string.** On t124 the lavender ink
  falls in groups at native x[120.2, 142.3], x[144.4, 158.4] (that gap is *inside the word*,
  between G and E) and then x[184.9, 190.5] — 26 px of empty sky away. The card reuses the
  bottom HUD row's own geometry: label at x120, digit ink-centred at x188. One centred string
  cannot produce that gap at any scale, which is how R5a ended up at pxX = 2.3.
- **The countdown is not on the other two lines' centre axis.** t261 puts CONTINUE PLAY's ink
  centre at 155.25 and INSERT COIN's at 156.25, but the "10" at 159.5.

### 4a. Z-order, verified in-situ rather than by reading the code

`screen.js` composites `overlays` after the game scene with `depthTest:false`, so the card is
structurally in front. Confirmed empirically: a 60-frame demo run
(`tools/out/presentation-r5c/demo-long/`, seed 4, 3600 ticks) caught five READY cards and one
tally card, and **frame-0011 shows READY drawn over the jet's fuselage**. Sweep of that set:
60 frames, **0 black, 0 duplicates**.

### 4b. Title `INSERT COIN!` (gap 8, typography half)

| | arcade t74 | ours |
|---|---|---|
| width | x[258,431] of 686 = **25.4 %W** | **24.7 %W** (0.97×) |
| top | 0.8208 H | **0.8214 H** |
| ink centre | native x160.7 | **x160.0** |

R4's "roughly 2× oversized" (58.8 %W) is resolved. The remaining gap-8 items — angular/italic
letterforms and the sphere-textured flaming "II" — are the sprite lane's `title-logo.js`.

---

## 5. Criterion audit: R4's ≥3:1 bar is failed by the arcade

The lead asked me to check gap 3's acceptance criterion against the arcade before tuning to
it. It does not survive the check, on two separate grounds.

### 5a. "white/black plate behind SPEED and STAGE" is half wrong

The arcade has a white plate behind **SPEED** (desert frame, x[15,53] y[200,207], a rounded
lozenge). It has **no plate behind STAGE** — red letters with a right+below black shadow
drawn straight onto the ground, on the very tan desert the stage-2 evidence complains about.
Building a plate behind STAGE would move us *away* from AB2, not toward it.

### 5b. "≥3:1 luminance contrast against the local background" — the arcade's own numbers

WCAG contrast of ink against the field (the surround, excluding the glyph's own keyline ring),
measured on `ab2-arcade-desert.png`:

| arcade element | ink/field | worst glyph px | ring is % black |
|---|---|---|---|
| STAGE digit (cream) | 4.44:1 | 2.47:1 | 57 % |
| STAGE label (red) | **1.05:1** | 1.06:1 | 61 % |
| score digits (cream) | **2.74:1** | 2.74:1 | 61 % |
| SCORE letters (red, on the white plate) | **1.85:1** | 1.05:1 | 62 % |
| SPEED label (red, on the white plate) | **1.57:1** | 1.05:1 | 65 % |

**Four of five fail, including both elements that sit on the arcade's own white plate** — the
exact treatment the criterion prescribes. It is not reachable for this palette: `#f70000` has
relative luminance 0.198, so 3:1 requires a field below 0.033 or above 0.69, i.e. near-black
or near-white. AB2 ships neither behind STAGE.

The criterion also fights gap 3's own next clause. "Glyphs carry a dark outline" and ">=3:1
against the local background" pull in opposite directions for dark ink: the outline *is* the
local background once it is drawn.

### 5c. Proposed replacement, and where we stand against it

The lead's suggestion — **ring-vs-field separation per ink class** — is the right measure: it
asks whether the glyph is *separated* from its surround, independent of the ink's own
luminance. Adding worst-glyph-pixel contrast covers the "a speck lands on the stroke" case.

Ours (stage 2, tan/gold ground, `demo-long/frame-0056.png`) against the arcade (its own tan
desert):

| ink class | ring/field, arcade | ring/field, **ours** | worst px, arcade | worst px, **ours** |
|---|---|---|---|---|
| STAGE digit (cream) | 1.36:1 | **2.92:1** | 2.47:1 | **6.00:1** |
| STAGE label (red) | 1.87:1 | **4.12:1** | 1.06:1 | **1.36:1** |
| score digits (cream) | 2.08:1 | **4.17:1** | 2.74:1 | **7.61:1** |

**Ours is roughly 2× the arcade's on every ink class, on both metrics.** This is the
I21-REVISED result (stage 3) extended to stage 2 and to the daylight ink classes. Our HUD is
*over*-separated relative to AB2, not under.

### 5d. The stage-2 complaint is real, but it is not a HUD defect

`evidence_hudbot_s2.png` is right that our cream digit sits poorly on stage 2. On ink/field
we measure 2.97:1 against the arcade's 4.44:1. The cause is the ground, not the glyph:

| behind STAGE, x[130,200] y[196,212] | mean L | median L | p90 L |
|---|---|---|---|
| arcade desert | 0.195 | **0.123** | 0.528 |
| ours, stage 2 | 0.290 | **0.308** | 0.528 |

The p90 matches exactly; the **median is 2.5× brighter**. Our stage-2 ground has no dark
dither floor, which is gap 6 ("stage 2 is undifferentiated brown/cream dither where the
arcade has a forest canopy cut by a pale road" — a canopy has shadow). No HUD treatment short
of a plate the arcade does not have can recover this. Ask W→P1 in `ask-presentation.md`.

---

## 6. I17 — the HUD mask moved, in the conservative direction

I added **no horizontal rules**. The mask shrank, because HIT lost its plate.

Emblem footprint in the sky band, computed from the geometry and confirmed against a fresh
`tools/hud_mask.py` run (`tools/out/presentation-r5c/hudmask/`):

| | HEAD (`db554e6`) | now |
|---|---|---|
| SCORE emblem plate | 612 px | **610 px** |
| HIT emblem | 312 px (filled trapezoid) | **196 px** (wings + letters only) |
| sky-band HUD mask, total | ~1378 px | **1260 px** (−8.6 %) |

The mask instrument agrees with the geometry to the pixel: the computed SCORE trapezoid area
from the measured inset array is 610, and `hud_mask.py` reports 610. HUD-bearing rows are now
y14–y51 (32 rows with any HUD pixel).

Direction of effect on the cloud lane's published bias (+3.1 % component over-count, −0.9 %
width): **smaller**, since there is less HUD to sever a bank. **The cloud lane's published
figures therefore do not need re-stating** — a shrinking mask can only move an over-count
down and an under-stated width up, so its numbers remain conservative rather than becoming
wrong. `hud_mask.py` derives the mask per run by design, so re-running it is sufficient; no
hardcoded box was introduced anywhere.

---

## 7. The card alphabet — eight glyphs, ADOPTED

The first pass of this report withdrew here and asked for a native-resolution card frame. The
lead ruled that correctly: **no such frame exists and none can be obtained** — every cached
source is an upscale (686×480, 1028×720, 640×360) — so I11's "a native frame outranks an
upscale" does not bind where no native exists, and the obligation is to state provenance, not
to refuse. Done, with the two conditions attached.

### A much better source than the card frames

Scanning the last 48 s of `ab2-longplay-60fps.mp4` for card-like text found the **high-score
name-entry screen**, which displays the **entire alphabet** `ABCDEFGHiJKLMNOPQRSTUVWXYZ.` in
this face, in flat pink on flat dark blue — no terrain, no dither, no sprite overlap. At
1028×720 that is 3.21×, the best magnification in the project, on the cleanest possible
background. Reproduce with:

```
ffmpeg -ss 970 -i .reference-cache/video/ab2-longplay-60fps.mp4 -vf fps=1 -frames:v 20 full-%02d.png
```

(frame 16). A copy is kept at `judging/R5/presentation-evidence/name-entry-1028x720.png`.

Two facts confirm it is the same face before any letterform is read off it: the glyph ink
measures **7 native px on an 8-px pitch**, and the dotted i's stem measures **3 px** —
independently equal to `BIG_WIDTHS.I = 3`, which was measured off the HUD's HIT emblem at
native resolution on a different screen.

### The instrument control

Seven glyphs — C, E, H, O, R, S, T — were already measured at the board's own 320×224 off
`ab2-arcade-desert.png`'s HUD. Running the transcription operator on the name-entry screen
reproduces all seven **exactly: 0 of 343 cells differ.**

That is the whole argument for the grade. The earlier attempt, off the tally card, scored
10–17 % cell error and was rightly refused; the difference is the background, not the
magnification. An instrument that returns seven independently-known glyphs cell-for-cell is
returning the other nineteen correctly.

### The two that look wrong, and are not

Per the lead's first condition, these were checked by hand rather than taken from the
sampler:

- **N has no diagonal.** It is a filled top bar over two straight stems. Checked directly:
  on t124 the counter of the N in "COUNTS" sits at native columns **3.11–4.05 and does not
  move across 30 consecutive image rows**. A diagonal would make that counter a parallelogram;
  the U beside it behaves identically with its counter open at the top instead of the bottom.
  Four independent instances agree — t124 line 1, t124 line 2, t261, and the name-entry
  screen. My first-pass suspicion that the missing diagonal was a sampling artefact was
  wrong, and it was wrong in the direction of caution.
- **A is a solid triangle**, with no counter and no legs, unlike the small face's A.
  Corroborated on t124's lower-centre "STAGE 2" — a different frame, a different screen, a
  different ink colour — where A's rows 2–6 and G's rows 2–6 reproduce, with the residual
  confined to rows 0–1 where the forest canopy defeats the threshold.

`D` and `P` share the face's blank-row-2 segment idiom on their left half only; that is in
the source on both.

### What was authored, and how it is marked

Eighteen letters were added to `BIG_GLYPHS` (A B D F G J K L M N P Q U V W X Y Z), completing
the alphabet. All eighteen are **transcribed** by the validated operator; none was
hand-drawn. The two with surprising structure were additionally hand-checked as above. They
are graded **ADOPTED, not MEASURED**, and `font.js` carries the source, the ffmpeg command,
the operator, the 0/343 control, the cross-check frame and the no-native-exists reason
immediately above them.

Per the lead's second condition, a side-by-side sheet of all eight glyphs the cards needed,
with the seven-glyph control beneath it, is published at
**`judging/R5/presentation-evidence/card-glyph-sheet.png`**.

### One genuine fork found: the dotted i has two layouts

The HUD and the cards disagree, and both are measured:

- **HUD** (`ab2-arcade-desert.png`, native): H x[166,172], i x[174,176], T x[178,184] — the i
  is left-aligned in a 3-px cell and T follows 4 px later. Reproducing this is what makes our
  HIT emblem pixel-exact.
- **Cards** (t124 "HiT COUNTS", and the name-entry alphabet): uniform 8-px pitch, the i's
  3-px stem centred in a full cell. On t124 the glyphs *after* the i land where a full cell
  puts them; on the name-entry screen the i's stem measures x[113.93, 116.73] in a cell
  starting at 112.

So `font.js` now exports two faces over one glyph table: `FACE_BIG` (kerned i, for the HUD)
and `FACE_BIG_CARD` (monospaced, for cards). Using the kerned face on cards would cost 4 px
per i, and "INSERT COIN" has two.

**HUD regression check after all of this: 11,060 of 11,060 arcade-consensus pixels still
match, over 10 frames.** Adding glyphs changed nothing that was already exact.

## Method note worth keeping

Two of this lane's errors were caught the same way, and neither would have been caught by
looking at a crop.

I rendered the HIT emblem as **four detached red bars** by reading its white wing stripes as
world showing through a plate-less emblem. At 1× that looks like a chevron. The per-pixel
diff against the two-frame arcade consensus returned the exact rows and columns in one run.
The same diff caught the `3` throttle label sitting one pixel left, which no eye would find.
Against that, the thing a crop *did* catch — and a number could not have — was the N's
missing diagonal, where a statistic said "artefact" and the pixels said "that is the
letterform".

Both directions are in CLAUDE.md already. The pairing is the point: **diff per pixel against
the reference to find where you are wrong; open the crop to find out what is actually there.**

---

## Captures

All under `tools/out/presentation-r5c/`:

| dir | what |
|---|---|
| `boot/` | Priority-0 proof: the tree boots |
| `throttle2/` | throttle widget after the label fix |
| `card-{continue,ready,tally}/` | cards before the height fix |
| `card2-{continue,ready}/` | cards after |
| `title/` | title screen, `INSERT COIN!` measurement |
| `demo-long/` | 60 frames × 60 ticks, seed 4 — READY/tally cards in-situ, stage 2 ground |
| `demo-ready/` | 40 frames × 12 ticks, seed 4 |
| `hudmask/` | `hud_mask.py` output for §6 |
| `final/` | 12-frame verification sweep, seed 3 |

Every set was swept for black and duplicate frames. **`final/`: 12/12 clean, 0 black, 0
duplicate, 13,272/13,272 arcade-consensus pixels matching. `demo-long/`: 60 frames, 0 black,
0 duplicate.**

# R9 — the drawing lane

> ## WHAT DRAW-WEIGHT CANNOT SEE
>
> **A density statistic cannot separate a slab from an X of separated blades.**
> At matched ink and matched span — one centred bar against four separated
> blades, which is the R4→R8 silhouette defect and item 3 of this lane's brief
> — `INK/SPAN` separates them **1.025×** and `DENS` **1.037×**. A build could
> go from four blades to a solid bar and DENS would move less than re-picking
> the mask's background tolerance does (17.3 % on a video anchor).
>
> **That is why SW, RSW and RP90 exist beside it, and why the gate is RP90
> (×1.811), not DENS.** DENS answers "is this drawing half-empty, or twice the
> arcade's weight?" — a real question, and not a silhouette question.
>
> **Three further blind spots, each measured:** the operator is blind to
> colour; every figure is a figure *under a named mask*, and the stroke
> statistics are the **most** mask-sensitive of the four (+40 % RSW, +30 %
> RP90 between two defensible rules); and it says nothing about animation.
> `jetsil.py`'s two-blade / fin-extent / cant statistics remain the topology
> gate and must keep passing beside it.
>
> Reproduction: `python3 tools/art/inkspan.py --selftest`, controls 6–8.
> Full detail in §2.5.

**Charter:** `judging/R8/art-critique.md`. *"The build's colour is now right nearly everywhere
and its drawing is wrong nearly everywhere that is not the sea, the HUD or the sky. Nothing the
project measures can tell the difference."*

**Tree:** started from committed `52edcc4`. **Files changed, all inside this lane's ownership:**
`tools/art/sheets/player-f14.js`, `tools/art/sheets/player-f14-roll.js`,
`tools/art/sheets/enemy-mig.js`, `tools/art/palettes.js`, `src/render/spriteFactory.js`,
`src/entities/enemySprite.js`, and the sheets they export under `src/assets/sprites/`.
New tools: `tools/art/{inkspan.py, inkspan_jet.py, rowdiff.py, jet_compare.py, jet_ingame.py,
hulk_probe.py, far_lod_preview.mjs, mirror_sync.py}`.
**Nothing else was touched.** `src/game/flow/deathSequence.js` is read by `hulk_probe.py` and
not written.

---

## 1. The crops, first

### 1.1 The player jet, level — arcade / R8 / R9
→ `r9-01-jet-LEVEL-ARCADE-top-R8-mid-R9-bottom-8x.png`

True native, matched span, 8× nearest. Top is the arcade
(`reference/stage3-night-level-t175.png` x[207,487] y[227,306], box-resampled from the 2.14375×
video to native-equivalent — **shape only, no colour claim**). Middle is `52edcc4`. Bottom is R9.

### 1.2 The player jet, banked — arcade / R8 / R9
→ `r9-02-jet-BANKED-ARCADE-top-R8-mid-R9-bottom-8x.png`

Top is **true native**, `reference/ab2-arcade-desert.png` x[80,180] y[82,142]. This is the panel
I would be judged on. The arcade's aircraft is four thin blades, each a cream stroke with a
`#840000` line beside it, and two heavy nozzle discs. R8's is a filled cream mass with a
perimeter outline. R9's is blades with sky between them.

### 1.3 The same aircraft on screen
→ `r9-05-jet-INGAME-native-day-night-banked-8x.png` — day (stage 1), night (stage 3, digit read
from the capture manifest), and a banked demo frame. Decimated to true native from 960×672, with
the 3× purity assertion (`block spread == 0`) in the figure script.

### 1.4 The far LOD — 44.8 % of the enemy sprites on screen
→ `r9-03-farLOD-R8-R9-rear-then-headon-22x.png` against `r9-03b-farLOD-ARCADE-stage2-22x.png`.
R8's cell measures **100.0 % fill — a rectangle, confirmed by an instrument and not only by
reading the source**. R9's is 56.3 % and reads as an aircraft.

### 1.5 The head-on delta liveries
→ `r9-04-headon-R8-then-R9-interceptor-then-prop-4x.png` against
`r9-04b-headon-ARCADE-stage2-native-18x.png`.

---

## 2. The operator, published with its control

`tools/art/inkspan.py` — **run `python3 tools/art/inkspan.py --selftest` before trusting any
number below.** Five controls, all passing.

### 2.1 What it computes

| | |
|---|---|
| `INK` | airframe-mask pixels, largest 8-connected component, **interior holes filled** |
| `SPAN` | maximum pairwise distance (Feret diameter) over the convex hull — not the max row extent, so it is readable on any pose |
| `INK/SPAN` | the R8 critic's statistic |
| **`DENS`** | `1000 × ink / span²` |
| **`SW`** | median stroke width `= 2 × median(EDT-to-background over ink)` |
| **`RSW`** | `100 × SW / span` |
| `P90SW` / `RP90` | the 90th percentile of the same distribution, raw and relative |

### 2.2 The correction the operator needed, and it is load-bearing

**`INK/SPAN` IS NOT SCALE-FREE.** Magnify a sprite by 1.16 and it rises by 1.16 with not one
pixel of the drawing changed. That is exactly the difference between our authored level cell
(`SPAN` 99) and the R8 critique's reading of the same cell on screen (`SPAN` 115, `INK/SPAN`
13.15). Quoting it requires quoting the span it was read at, every time. `DENS` and `RSW` are the
scale-free forms and are what this report gates on.

*(The criteria lane reached the same conclusion independently in `tools/inkspan_arcade.py`. I
messaged them my anchors so the round publishes one set, not two.)*

### 2.3 Controls

| control | result |
|---|---|
| 1 analytic 4-limb stroke figure, 3 px limbs, span 100 | `SW` **2.83** on a known 3 px stroke; span 101.8 |
| 2 **the same figure rotated 35°** | `INK/SPAN` moves **0.9 %**, `SW` moves **0.83 px** — the bank-invariance claim, tested rather than asserted |
| 3 a **filled** figure, same span, same four limbs | `DENS` **×1.96**, `P90SW` **×1.90** — separates in the right direction and by a wide margin |
| 4 `SPAN` on a disc of known diameter 61 | 60.0 |
| 5 the arcade's own daylight jet | `SPAN` **109.7 exactly**, reproducing the R8 critique |

**Mask-equivalence control** (`inkspan_jet.py --controls`): two masks are needed, because no
single one survives both a saturated desert and a black night sky. Each is controlled on the
sheet it is used on, against our own alpha channel as ground truth — **achromatic 0.76 % worst
error on the day sheet, value-threshold 0.00 % on the night sheet.** The value mask's 15.5 %
error on the *day* sheet is printed too, with its mechanism (a `#000000` nozzle throat fails
`max(RGB)>30` and the broken ring orphans the glow), so nobody quotes it on a black-throated
subject.

### 2.4 Reconciliation with the R8 critique — "same name, different operator"

The critic published ink 803 / span 109.7 / 7.32 on the same crop. This operator returns
984 / 109.7 / 8.97 (1016 after hole-filling). SPAN agrees exactly; INK does not. Resolved by
colour rather than left as a discrepancy: inside this mask `#840000` is **224 px** and `#000000`
is **135 px**, and the critic's published shares (27.9 % and 16.8 % of 803) are **224.0 and
134.9** — *the two masks hold exactly the same dark-accent pixels*. The whole 181 px difference
is one tone, **`#f7e6b5`, 178 px**, the arcade's measured second cream, which is in REFERENCE.md
and in `value_census.py`'s own arcade census but absent from the critic's denominator. This
operator keeps it. **The two anchors must never be mixed.** This assertion is control 5.

### 2.4c A topology error in my instrument, found by two implementations disagreeing

`criteria-r9` published a different arcade ink from the same crop and could not
account for the gap. Running **their** rule inside **my** code reproduced their
909 **exactly**, which localised the disagreement to one unstated choice:

> **`fill_holes` flooded the background 8-connected against an 8-connected
> foreground. That is topologically inconsistent and it under-fills.**

In digital topology one of the two must be 4-connected or the Jordan curve
property fails: with both at 8, a diagonal chain of foreground pixels does not
separate the plane, so background **leaks out through a ring that is diagonally
closed**. The arcade's nozzle discs are bounded by a diagonally-stepped black
ring, which is exactly that case. On the four-role mask: 8-connected flood
recovers **55 px**, 4-connected recovers **133** — **78 px, 8.6 % of the
subject, on a choice neither of us had written down.**

**Theirs was right and mine was wrong.** `fill_holes` is now 4-connected, and
**control 8** pins it on a one-pixel diamond ring where the 8-connected flood
leaves the disc empty (28 px) and the 4-connected one fills it (113 px).

*My first attempt at that control rasterized a circle, which came out
4-connected-closed, so both floods filled it identically and the control passed
vacuously* — the same failure `criteria-fix-2` had declared in its own control.
**Check what a synthetic actually builds, not what you meant it to build.**

With the mask rule and the connectivity both matched, the two independent
implementations now agree on the arcade jet to **ink exactly (909), RSW 0.02,
RP90 0.07**.

### 2.4d A blind spot in my control suite, found by `criteria-r9`

Control 7's blades are separated by gaps **open to the frame border**, so no
hole-fill rule touches them and **the control passes identically under both
connectivities**. It is a valid control that does not cover the case that cost
2× on the real subject. Recorded with their framing, which is the right one:
**a mask rule is fixed by looking at the subject, not by passing a synthetic**,
and **a gate on RP90 is a gate on RP90-under-a-named-mask** — cite the rule in
the same sentence, every time. Control 8 now covers the enclosure case.

### 2.4a The day mask's tone list, published

`criteria-fix-2` could not cross-validate the day anchor, and the reason is a
finding about the frame rather than a formality: its operator is a
not-background mask and **this crop has no background** — the jet sits on dense
desert, where `#e67300` is only 24 % of the crop. So the day mask is an
enumerated-tone mask and the enumeration has to be published. Full list is now
in `inkspan.py`'s header; the summary, 1016 px:

| in, by `sat<0.35` | | in, by name | | recovered by `fill_holes` |
|---|---|---|---|---|
| `#ffffef` 239, `#f7e6b5` 178, `#a48484` 96, `#d6d6a4` 60, `#ceb59c` 41, `#ffffff` 6, `#948463` 4, `#f7f7f7` 1 | | `#840000` 224, `#000000` 135 | | `#f78400` 13, `#f7b500` 11, `#f7e694` 8 (the afterburner glow) |

**Two exclusions declared rather than buried.** `#e694f7`, 9 px — **the canopy
fleck**; saturated magenta, so the rule rejects it and it is not enclosed, so
the hole-fill cannot recover it. **The day mask under-counts the arcade jet by
~0.9 % of ink.** The `#940000`/`#f70000` family is explosion debris elsewhere
in the crop, correctly dropped by the component step.

**The full membership rule, as a decision procedure** (`criteria-r9` asked for
this, and the tone list alone was not enough to close their 75 px):

1. a pixel is IN if `sat < 0.35 and V > 0.08`, **or** it is exactly `#840000`,
   `#000000` or `#425284`;
2. keep only the largest 8-connected component;
3. fill background regions not **4-connected** to the frame border.

**Their 909 and my 1056 now reconcile exactly**, and the whole difference is
step 1 — six mid-tones their four-role list omits: `#a48484` 96, `#d6d6a4` 60,
`#ceb59c` 41, `#ffffff` 6, `#948463` 4, `#f7f7f7` 1 = **208 px**, less the
enclosed pixels their rule recovers that mine had already counted directly.
All six are documented arcade airframe tones in REFERENCE's own census, which
is why this rule keeps them — but it is a **choice**.

**I first wrote here that "the stroke statistics do not care — RSW and RP90
agree across the two rules to 0.02 and 0.07". That label was wrong and the
truth is the opposite.** Those two deltas are across the two **implementations**
under **one** rule, not across the two rules. `criteria-r9` caught it, having
just withdrawn the same claim from REFERENCE for the same reason. Measured in
my own code, on one crop:

| | across **implementations**, one rule | across **mask rules**, one implementation |
|---|---|---|
| ink | **909 vs 909 — exact** | 909 → 1056, **+16 %** |
| INK/SPAN | — | 8.36 → 9.63, **+15 %** |
| DENS | — | 76.8 → 87.8, **+14 %** |
| **RSW** | 2.60 vs 2.58 (**0.8 %**) | 2.60 → **3.65, +40 %** |
| **RP90** | 7.58 vs 7.51 (**0.9 %**) | 7.58 → **9.82, +30 %** |

**The stroke statistics are the MOST mask-sensitive of the four, not the
least.** The mechanism is obvious once stated: SW measures *local thickness*,
so admitting six mid-tones thickens every drawn mass, while ink only grows by
the pixels themselves.

### 2.4e Which mask the criterion may name — the four-role rule fails on our side

Since the mask choice is worth 40 % on RSW, *which* rule the criterion names is
now load-bearing, so I tested both against the only ground truth that exists:
our own sheets' alpha channel.

| recovered vs `alpha>0`, day sheet | cell 0 | cell 2 | **cell 4 (level)** | cell 6 | cell 8 |
|---|---|---|---|---|---|
| four authored roles | 44.9 % | 75.4 % | **20.9 %** | 79.1 % | 49.9 % |
| this file's rule | 99.8 % | 99.6 % | **99.2 %** | 99.8 % | 99.8 % |

**The four-role rule recovers as little as a fifth of our airframe, and how
much depends on the pose.** It is a fair description of the *arcade's* jet —
that aircraft really is mostly those four tones, and the rule recovers 86.1 %
of the fuller mask there — but our sheet puts most of its body on `midNeutral`
and `coolDark`, which the list omits, and at bank 0 what remains fragments.

So: **a mask rule named in the criterion has to be validated against ground
truth on BOTH sides, and only our sheets have ground truth.** That is what
`inkspan_jet.py --controls` is for (worst error 0.76 %), and it is the reason
the criterion should name the achromatic rule rather than the four-role one —
a stronger reason than "mine includes more documented tones".

*This also explains an alarming intermediate number I nearly published: the
ours/arcade RATIO appears to move 300 % between the two rules. It does not.
That is the four-role rule collapsing on our side, not a property of the
statistic. Under one rule applied to both sides the ratio is stable.*

**This does not touch the gate recommendation, and the distinction matters.**
RP90 was never recommended on mask robustness — it rests on control 7
(distribution separation ×1.811 where DENS sees 3.7 %) and control 6 (rotation
CV 5.3 %). What falls is a *supporting* argument. What rises is the clause:
**a gate on RP90 is a gate on RP90-under-a-named-mask**, which stops being a
caveat and becomes load-bearing. Cite the rule in the same sentence as the
number, every time.

### 2.4b The bank-invariance control, and the claim it settles

The R8 critique replaced bbox fill with INK/SPAN because the latter is
"bank-invariant in a way that fill is not", on the evidence of two of our own
poses moving 13.15 → 10.93. That is one difference, not a demonstration.
`python3 tools/art/inkspan_jet.py --invariance`, two arms:

| | INK/SPAN CV | **bbox fill CV** | DENS CV | RSW CV | RP90 CV |
|---|---|---|---|---|---|
| **arm B — one drawing, 8 rotations** (the actual claim) | **1.2 %** | **28.7 %** | 1.7 % | 18.4 % | 5.3 % |
| arm A — our nine authored bank cells (as asked) | 9.9 % | 15.0 % | 5.7 % | 14.6 % | — |

**The critic's claim is correct and now has a control: 24× under pure
rotation.** Arm A only shows 1.5× because the nine authored cells differ in
*size* as well as bank — `poseTransform` applies `SHRINK = 0.34`, span 65→99 —
and INK/SPAN is dimensioned. **The 13.15 → 10.93 the critique quoted is
`SHRINK`, not invariance failing.** Which is a third argument for gating on the
scale-free forms.

### 2.4h A live bug in my own tool: the night sheet read with the day mask

`criteria-fix-2` ran my ground-truth test on the **night** sheet, which I had
not. The achromatic rule is a DAY-palette rule — the night blue-greys are not
achromatic (`#425284` sat **0.50**, `#6373a4` 0.39, `#7384b5` 0.36, all above
the 0.35 cutoff, together ~45 % of the sheet's ink) — and `inkspan_jet.py` was
applying it to our night sheet anyway.

| our night sheet, recovery vs `alpha>0` | |
|---|---|
| achromatic **without** `#425284` | 28.1–34.0 % |
| achromatic **with** it (my actual published rule) | 81.9–98.2 % |
| **value rule** (`max(RGB)>30`) | **100.0 % on every cell** |

Two things follow, and they point opposite ways.

**Their headline 28–34 % does not apply to my rule** — their reimplementation
omitted `#425284`, which is in my published `AIRFRAME_EXTRA`. Reconciled, not
disputed.

**But the finding lands anyway, and the bug is mine.** Even with the named
keyline the achromatic rule loses **18.1 % of the level cell** — the one every
night figure in this report was quoted from. My own mask-equivalence control
had *printed* that 23 % cross-term for two days and I had gated only the two
diagonal terms, so the control saw it and I did not read it. Fixed: the night
sheet now uses the value rule, and **both cross terms are asserted non-trivial
(> 5 %)** — if either ever collapses to zero the two rules have converged and
the control has stopped discriminating, which is a failure and not a success.

**Their clause is right and is adopted:** *a gate on RP90 is a gate on
RP90-under-a-named-mask, and the mask is named **per subject and per palette**,
ground-truth tested on every palette variant it will be applied to.* My
two-mask design already embodied that; I simply failed to apply it in one
place, which is the more common way a rule fails.

**Also pinned, from their reconciliation:** our `feret()` conventions differ by
**+1.0 for inclusive pixel extent**. Removing it, their column lands on mine to
three significant figures on every statistic. It is worth naming because it is
silent and systematic — 0.9 % on span, **1.8 % on DENS** (span squared).

### 2.4i The quantisation screen — and a claim of mine that was wrong one message after I made it

`criteria-fix-2` found that a stroke statistic's pose CV is about **half the
relative gap between the EDT levels the percentile straddles**. The
relationship is real and accurate **when the level set spans what you intend
to quote over** — which means gathering it across the poses, i.e. running the
sweep.

**They then published a single-pose form of it, I adopted it, and wrote "every
prediction bounds its observation" into this report. That was false on my own
data, and they withdrew the claim before I checked it.** Six cases, my
operator:

| subject | stat | single-pose prediction | observed CV | |
|---|---|---|---|---|
| arcade night-level @686 | SW | 0.00 % | 0.00 % | bounds |
| **arcade night-level @686** | **P90** | **0.00 %** | **0.46 %** | **EXCEEDED** |
| arcade day-banked | SW | 0.00 % | 0.00 % | bounds |
| arcade day-banked | P90 | 2.46 % | 2.44 % | bounds |
| our level cell | SW | 11.69 % | 3.77 % | bounds (over by 3×) |
| our level cell | P90 | 0.00 % | 0.00 % | bounds |

**A percentile sitting exactly ON a level at one pose can move to a straddle at
another**, so a tight single-pose gap certifies nothing — and the under-predict
is the dangerous direction. The converse fails too: a wide gap over-predicts
when the percentile never leaves its level.

**So: a SCREEN, not a licence.** Non-zero means go and run the sweep; zero
means nothing. The field is named `sw_pose_cv_screen` for that reason, and
**control 6 remains an eight-pose sweep over real subjects.** The one thing it
does license down stands: our level cell's RSW straddles two levels, so **4.52
must be quoted as a range.**

**And the scale finding, which is the part to carry forward.** Their claim that
the same subject's CV is a function of *measurement scale* reproduces exactly
on my pipeline:

| arcade night-level jet, one mask, 8 angles | SW levels | CV |
|---|---|---|
| **stored 686×480** | `{6.0}` — one level | **0.00 %** |
| native-converted (÷2.14375) | `{2.83, 4.0}` | **10.73 %** |

**One subject, one mask, one operator — 0 % to 10.7 % on scale alone.** My
original 18.4 % came from a synthetic; they reach 17.3 % on the *real* aircraft
by converting it to native. Same phenomenon, three sample points.

> **This contradicts a standing rule in this project and the box should say so.**
> "Native outranks the upscale" is a rule about **colour levels** — a video
> upscale invents intermediate hues. **EDT levels are not colour levels**, and
> for a *thickness* statistic the upscale has the finer quantisation and
> therefore the stabler reading. Measure stroke statistics at the scale where
> the level gap is smallest. Apply the colour rule here and you land on the
> 10–17 % reading instead of the 0 % one.

### 2.4j The two masks are a FORCED pair, and the day/night agreement is arithmetic

Two corrections from `criteria-fix-2`, both verified here, both sharper than
what I had written.

**(a) My "cross-check across two palettes and two masks" was arithmetic.** I
retracted the 86.3 figure (§2.4h) and replaced it with "night 107.6 against day
106.8, 0.7 % apart — a cross-check of the instrument". The two sheets' **alpha
planes are byte-identical** (verified: `np.array_equal` is `True`), so their
ground truth is *the same number*, not two numbers that agree. The 0.7 % is the
day mask's 0.8 % miss, arithmetically. Their consequence is stronger than my
retraction and I take it:

> **On our own sheets a day-vs-night DRAW-WEIGHT comparison can only ever
> measure mask recovery, never drawing weight**, because the geometry is
> identical by construction. It is a mask test wearing a drawing test's units,
> and it must never be upgraded into evidence about the art.

**(b) The two-mask design is forced, not convenient**, and they found the half
I had not:

| recovery vs `alpha>0` | achromatic + 3 named | value `max(RGB)>30` |
|---|---|---|
| day sheet | **99.2–100.0 %** | 84.4–98.3 % |
| night sheet | 81.9–98.2 % | **100.0 %** |

The value rule fails on *day* because the day keyline is `#000000`,
`max(RGB)=0`, below the `>30` cut — **581 px of outline dropped**, and the
night sheet has zero pixels under that threshold. Each rule wins on one sheet
and loses on the other by an identifiable mechanism. That is a better argument
for the pairing than the one I made.

**(c) Their caveat on the value rule, which applies to my own anchor.** Its
100 % is measured on the authored *sheet*, where the background is
transparent. On a night **frame** the black sky is correctly excluded but city
lights and the HUD are `>30`. Verified: the value rule over the **whole** t175
frame takes **50 290 px, 15 % of the frame.** My anchor survives only because
the crop is tight on the aircraft *and* `largest_component` discards the
remaining 181 px of speckle. **A wider crop would not survive**, and the rule
is licensed on the night sheet and on this crop, not on night frames
generally.

### 2.4f FIGURES THAT CHANGED AFTER THE TOPOLOGY FIX — read this before comparing

The `fill_holes` connectivity bug (§2.4c) was found late. **Every arcade figure
below is post-fix.** If an earlier draft or an earlier message of mine is in
circulation, these are the ones that moved:

| | pre-fix (wrong) | **post-fix (published)** |
|---|---|---|
| arcade day-bank ink | 1016 | **1056** |
| arcade day-bank DENS | 84.5 | **87.8** |
| arcade day-bank RSW | 2.58 | **3.65** |
| arcade day-bank RP90 | 9.12 | **9.82** |
| our level cell vs banked anchor | 1.26× | **1.22×** |
| **our NIGHT level cell DENS** | **86.3** (wrong mask, §2.4h) | **107.6** |

**Unchanged by the fix:** the night-LEVEL anchor (83.2 / 2.40 — its ring is
open to the sky, so no fill rule reaches it), every one of our own sheet cells
to within 2 px (our nozzle rings are authored as octagons and were already
4-connected-closed), and every JET-SIL / ENEMY-SIL / Criterion A figure.

This is the ledger's "two correct measurements of two different things" class;
the figures are only comparable within one side of that line.

### 2.4g The rotation claim I published, and its retraction

**I published "RSW is the least rotation-stable of the four at CV 18.4 %". That
is a property of my synthetic, not of RSW, and it is retired.** `criteria-fix-2`
could not reproduce it on a real aircraft and was right not to. Measured on
real subjects, eight angles (now control 6):

| subject | DENS | RSW | RP90 |
|---|---|---|---|
| arcade night-level jet | 0.35 % | **0.22 %** | 0.36 % |
| arcade day-banked jet | 0.83 % | **0.40 %** | 2.73 % |
| our level cell | 0.69 % | 3.84 % | **0.37 %** |
| *synthetic, 3 px blades* | *1.67 %* | *18.39 %* | *5.35 %* |
| *synthetic, 9 px blades* | *0.64 %* | *7.63 %* | *2.65 %* |

**On real subjects both are stable to ~4 %, and which one is more stable FLIPS
between subjects.** The mechanism is theirs and it is the useful part: the
stroke width *the author chooses* decides which percentile sits on an EDT
quantisation step. **Both lanes built a synthetic that condemned the other's
pick, in opposite directions, before either measured a real aircraft.**

**So the rotation axis does not arbitrate RSW against RP90. Control 7 does**,
and the recommendation stands on that alone — RP90 separates the
matched-ink/matched-span pair ×1.811 where RSW separates it ×1.430 and DENS
sees 3.7 %. New standing rule, adopted into control 6: **no stability claim
from a synthetic whose stroke width you chose; measure stability on the real
subject.**

**And control 7's own asymmetry, declared** (because `criteria-fix-2` declared
the mirror of it in theirs): if *both* subjects were uniform thickness,
`P90 = 2.00 × SW` on each by construction and the two ratios would be
identical — their slab/blades pair returns 3.112× and 3.112×, so it **cannot**
arbitrate. Mine escapes only because the blade figure has a **thick hub** where
the four blades meet (P90/SW 1.580 against the bar's 2.000). An aircraft has a
thick centre and thin blades, so the asymmetry is realistic — but it *is* the
source of the 1.43-vs-1.81 difference and a reader should know that.

**The quantisation licence, adopted from `criteria-fix-2`:** publish the
discrete EDT level set any SW/P90 figure lands on. More than one member across
poses or tolerances means the figure is on a knife-edge and must be quoted as a
range, not a point. Control 7 now prints it (blades `{1.0, 1.414, 2.0, 2.236,
3.0}`, bar `{1.0, 2.0, 3.0, 4.0}`). It costs one line and it is what diagnosed
both lanes' bad synthetics.

### 2.5 What this operator cannot see

- **Colour.** A correctly-weighted drawing in the wrong hues scores identically. Run
  `value_census.py` and the ladder beside it.
- **Where the ink is.** Four blades and one blob of equal total ink and equal local thickness
  read the same. `jetsil.py`'s two-blade / fin-extent / cant statistics cover that, and they
  must keep passing — this round they did, and one of them got *worse by 0.02*, see §4.
- **Quantisation.** On a 3 px stroke the EDT takes only the values 1 and 2, so `SW` lands on 2,
  3 or 4 and nothing between. Do not read a 0.3 difference as a change.
- **A stray pixel inflates SPAN** (convex hull) and deflates DENS. Always `--dump` and look.
- **Animation.** It says nothing about a sequence of poses.

### 2.6 The arcade anchors, and one frame that must not be used

| anchor | ink | span | DENS | RSW | RP90 | dark-accent |
|---|---|---|---|---|---|---|
| **day, banked, TRUE NATIVE** `ab2-arcade-desert.png` | 1056 | 109.7 | **87.8** | **3.65** | 9.82 | 34.0 % |
| night, **LEVEL**, 686×480 video → native-equivalent | 1131 | 116.6 | 83.2 | 2.40 | 5.60 | — |
| …the same, **nozzle rings repaired** (see below) | 1309 | 116.6 | **96.2** | 4.00 | 9.60 | — |

*(The day figures rose from 1016 / 84.5 / 2.58 after a connectivity fix in
`fill_holes` — §2.4c. Ours moved by ≤ 2 px, because our nozzle rings are
authored as octagons and were already 4-connected-closed.)*

**R8 listed a true-native LEVEL astern frame (acquisition item 2) as blocking the jet's drawing
figure. It no longer blocks the drawing weight** — t175 supplies a level pose and the two anchors
agree. It still blocks *colour*, which is the claim it was filed for.

**The night-LEVEL mask is missing both nozzle rings** and I nearly published it without noticing.
The ring is dark and **open to the black sky**, so hole-filling cannot close it: the raw mask
measures only the orange glow (14×13 on a 251 px span). A morphological closing at r=2 seals the
opening; the overlay (`tools/out/drawing-r9/mask-nl-close2.png`) shows it adds **exactly the two
rings and nothing else**, +177 native px. So the raw figure is a *lower* bound, not the upper
bound I first labelled it, and the repaired 96.2 is the one to compare a level pose against.

**`reference/ab2-arcade-night-banking.png` is true-native and is NOT USABLE for this statistic.**
The jet in it is flying through its own kill's explosion and the two are one 8-connected mass
under any mask that can see a blue-grey airframe on black. It read **DENS 189.5** against the
other two anchors' 84. The dump is `tools/out/drawing-r9/mask-arc-night-bank.png`. It is a good
shape crop and not a measurement. *(I published that 189.5 into my own working table before
cropping it, which is the failure CLAUDE.md names; it was caught by the rule, not by luck.)*

### 2.7 A second instrument, because DENS says "too heavy" and not "where"

`tools/art/rowdiff.py` prints the arcade's level silhouette and ours as span-normalised filled
pixels per row, so the two can be subtracted. It is what located the actual defect, and the
answer was not the one the headline implied — see §3.

---

## 3. The player jet

### 3.1 What was actually wrong, which was not what I assumed

The R8 headline is "1.80× the ink", which invites thinning everything. The row-diff says
otherwise, and **two of the three things I expected to be wrong were already right**:

- **The fin blades were correct.** Arcade 1.2 → 5.6 % of span tip-to-root; ours 2.2 → 5.6. The
  fin band measured 2.4× heavy only because **our dorsal deck started inside it**, at 50 %H
  against the arcade's 58 %.
- **The wing chord was approximately correct.** Per-station column chord, outboard half:
  arcade 4.0–5.6 local units, R8 4.8–5.8.
- What *was* wrong: the **wing sat one to two rows high** (row 17 of 31 held a full-span wing
  where the arcade holds only fin), the **deck position**, the **pod proportions**, and the fact
  that every element the arcade separates we had merged into one pale mass.

**I got the wing chord wrong first and shipped a wing 40 % too thin**, by reading the chord at
two stations — the extreme inner edge and the tip — and concluding "constant chord 2.4". Those
are the two least representative columns on the surface. The crop killed it on sight (a
red-lined glider) and per-station profiling fixed it. The table is in the source.

### 3.2 What changed

1. **Wings are lit edges, not filled paddles.** Leading edge `#ffffef` 1 px, body `#f7e6b5`,
   trailing `#a48484`, and `outlineSouth` lays the measured `#840000` beneath — which is the
   arcade's own white-line/dark-red-line pair.
2. **The dorsal deck moved down ~3 rows**, out of the fin band.
3. **The pod is the arcade's proportion**: 6.0 × 4.6 local (aspect 1.30 against the arcade's
   1.29), spanning 58–88 %H, which is its band to the row.
4. **Fin-root fillets** close the bare sky the critique called "two pale rabbit ears … separated
   from the nacelles".
5. **The body is no longer one bright slab**: the centre fuselage dropped a rung, the engine
   bodies two, with a bright dorsal centreline kept.
6. **The `#000000` slot became `#840000`** — `palettes.js`'s own measurement says the arcade's
   daylight airframe has nothing darker than `#948463` outside the nozzle throats, so a black
   slot was off the arcade's set, and it is also the "mouth" R8 shrank and did not close.
7. **A `#ffffff` specular**, §5.

### 3.3 Numbers — authored cells, one operator

| | DENS | RSW | RP90 | dark-accent |
|---|---|---|---|---|
| **arcade, day banked, native** | **87.8** | **3.65** | 9.82 | **34.0 %** |
| **arcade, night LEVEL, ring-repaired** | **96.2** | 4.00 | 9.60 | — |
| R8 level `52edcc4` | 113.1 | 4.52 | 11.78 | 26.5 % |
| **R9 level** | **106.8** | 4.52 | **10.10** | **28.7 %** |
| R8 bank −45 | 123.2 | 5.90 | 13.20 | 31.0 % |
| **R9 bank −45** | **116.6** | **5.28** | **10.89** | **33.7 %** |
| **R9 night level** | **107.6** | 4.52 | 10.30 | 28.5 % |

Against the **level** anchor our day level cell went **1.18× → 1.11×**; against the **banked**
native anchor (as re-measured under the corrected hole-fill), **1.29× → 1.22×**. The span-normalised row-diff excess fell from **266.6 to 208.7
points (1.32× → 1.25×)**. **`RSW` did not move at all** on the level cell and that is the honest
headline limit of this round: the body is still a thick mass and it owns the median.

**A claim I published here is RETRACTED.** I wrote that the night sheet "lands at DENS 86.3 —
on the arcade's banked anchor of 87.8", and inferred that the remaining day-sheet excess was
substantially the `#840000` rim rather than the planform. **Both the figure and the inference
were produced by a bug**, found by `criteria-fix-2` extending my own ground-truth test to the
night sheet: `inkspan_jet.py` was reading our NIGHT sheet with the DAY palette's achromatic
mask, which recovers only **81.9 %** of the level cell. The night column was short by 18 % of
the aeroplane. See §2.4h.

**Corrected, the night level cell reads DENS 107.6 against the day's 106.8** — 0.7 % apart,
which is the right answer and a better one: R5's interface I23 established that the two sheets
are *the same drawing* by construction, and the operator now says so, **across two palettes and
two different masks.** That is a cross-check of the instrument. It is not evidence about the
rim, and I have no evidence about the rim.

### 3.4 In-game, at engagement scale

`tools/art/jet_ingame.py`. The jet is the **difference against a `?hidejet=1` frame at the same
tick** (`?fixed=1&seed=1` is deterministic, so the two differ only where the sprite is). The HUD
is excluded by a mask derived per run from a live frame, restricted to the top 16 % and bottom
14 % bands — **the sea dither between them is kept, because the aircraft overlaps it.**

My first version masked by "the 24 commonest colours are background" and returned spans of 26 to
167 px on a sprite that is ~290. Clean, plausible, stable and wrong. Cropped and looked
(`tools/out/drawing-r9/look-day.png`), discarded, replaced.

**14 frames, 3 tick spacings (131 / 173 / 211) plus day and night at 37 and 1300, day stage 1 and
night stage 3 with the stage digit read from each capture's `capture-manifest.json`:**

| | n | span | DENS | RSW |
|---|---|---|---|---|
| in-game, span ≥ 302 px | 13 | 302–353 | **104.1 – 108.2** | 3.60 – 4.14 |
| authored level cell | — | 99 | 106.8 | 4.52 |

**The operator returns the same scale-free answer on the authored canvas and on the screen, to
~1.5 %.** Day and night are byte-identical in DENS, which is correct — same geometry, different
palette — and the night palette was separately confirmed live (9 colours, all on the measured
night ramp).

One frame excluded: `F-demo-173/frame-0002`, span **245.2**, DENS 153. It is below the brief's own
~250 px load-bearing floor **and it is a different sheet** — the barrel-roll strip at a steep roll
(`tools/out/drawing-r9/outlier.png`). Named rather than dropped silently.

**Captures:** `tools/out/drawing-r9/{F-day,F-dayhud,F-night,F-nighthud,F-demo-{131,173,211},
F-demohud-{131,173,211}}`, each with its `capture-manifest.json`; URLs
`?nocombat=1&noclouds=1[&invincible=1][&demo=1][&hidejet=1]` appended to `?fixed=1&seed=1`.

---

## 4. The discriminators, re-checked

| gate | R8 `52edcc4` | **R9** | target |
|---|---|---|---|
| JET-SIL two-blade fin rows | 100.0 % | **100.0 %** | 99–100 |
| JET-SIL fin-pair extent | 38.0 % | **36.0 %** | 35.4–35.7 (arcade 35.5) |
| JET-SIL blade cant | 1.21 | **1.19** | ≥ 1.15 (arcade 1.28) |
| JET-SIL nozzle separation (V≥0.70) | 30.0 % | **30.0 %** | 30.1 |
| JET-SIL aspect SPAN/H | 3.12 | **3.12** | 3.0–3.6 |
| ENEMY-SIL, all 8 sheets, fuselage width | ≤ 29.0 % | **≤ 16.1 %** | ≤ 35 |
| ENEMY-SIL wing sweep | ≥ 18.7° | **≥ 18.7°** | ≥ 15 |
| ENEMY-SIL largest compact feature | ≤ 10.0 % | **≤ 10.0 %** | ≤ 12 |
| `sheet_visibility.py` | 0 invisible | **0 invisible** | 0 |
| `sheet_probe.mjs` | — | **16/16 decoded, 0 procedural** | gate |
| `mirror_check.py` | OK | **OK** (447 drawing tokens) | OK |
| `assertRoles` / ROLE SYNC | — | **OK, 11 roles** | throws |
| **Criterion A**, 19 sheets | 0 off-ladder | **0 off-ladder, max per-channel 10** | ≤ 32 |
| `vite build` | OK | **OK** | OK |

Two honest notes. **`cant` fell 0.02** (1.21 → 1.19), still passing and still short of the
arcade's 1.28; the ceiling is resolution — the arcade reaches 1.28 with a 1.2 %-of-span fin tip,
which is 3 px at its 250 px span and 1.2 px at our 100, below `runs()`'s 2 px floor. **Fin-pair
extent was failing quietly at 38.0 for at least a round** and is now 36.0, still 0.3 over; the
cause was one pixel of outward-grown rim that the anchor did not account for.

**The ladder closure is intact.** 19 authored sheets, 0 off-ladder channel values, worst
per-channel 10 against a gate of 32. I did not break it.

---

## 5. The other three objects

### 5.0 A false citation in my own file, and it is the one that stopped the audits

`drawRearFar()`'s justification cited `reference/stage1-level-flight-t116.png`
— *"the bracketed enemy at ~(415,210) is a handful of dark pixels, no
silhouette."* **`criteria-r9` cropped it and it is not true. I re-cropped it
independently at native scale and agree.**

At 16×12 native-equivalent (`tools/out/drawing-r9/t116-farenemy-native-30x.png`;
theirs is `tools/out/criteria-r9/crit-r9-05-ARCADE-far-enemy-t116-12x.png`) the
aircraft is **a pale horizontal wing line about two rows tall and ten px wide,
clearly wider than its body, with a dark core, open sky above and below it, and
a separate fin stripe above.** It is a cross. It has a silhouette.

That sentence was the declared exception the R8 critique says *"every audit
that read the comment stopped reading"*. CLAUDE.md's rule — *a comment citing a
measurement that was never taken is worse than no comment* — cost four audits
here. **The comment is corrected in `enemySprite.js` with both crops cited and
the retraction quoted in full**, so the next reader sees what was claimed and
what is there.

`criteria-r9`'s independent arcade column prices it: at a matched span of
16–18 px the arcade's distant enemies read **bbox fill 30.6–34.6 % against this
cell's 100 %**. *The arcade keeps sky inside the aircraft's bounding box at nine
pixels of span.*

### 5.1 The far LOD — a rectangle by construction, in 44.8 % of enemy sprites

`drawRearFar()` / `drawHeadOnFar()` rewritten. **The opacity invariant is kept and is now
provable rather than asserted.**

The R3 constraint is real (27 of 80 frames at zero pixels) but it does not need a *full* cell —
it needs, for every quad height, at least one *sampled* row spanning the full texel width. With
nearest filtering a quad of height `h` samples rows `floor((i+0.5)·8/h)`, so **rows 2, 3 and 4
full-width satisfies every height**. `FAR_SPAN_INVARIANT_OK` re-derives that at module load and
throws; `tools/art/far_lod_preview.mjs` re-checks it independently by **evaluating the draw
functions' own source text** (they cannot be imported in node — three.js and sixteen PNGs), so
there is no second copy of the spec to drift.

| | fill | span == quad width, 2–10 px |
|---|---|---|
| R8 `52edcc4` | **100.0 %** | yes |
| **R9** | **56.3 %** | **yes, at every size; worst column coverage 100 %** |

**Value: a bounded change, and a criterion I would not take as written.** The critic's fix is "a
far-LOD cell in the livery's darkest tone", from an arcade distant enemy at mean V 0.289 — but
that frame is `ab2-arcade-desert.png`, **HUD digit 2, a stage-2 orange-sky camo livery**, and
`enemySprite.js`'s own R6 polarity note records that applying a stage-2 enemy value to stage 1 is
precisely the mistake R4 made and R6 undid. So the wingtips take the livery's own measured
`shadow` (`#949494`, V 0.58) where the cell was `dominant` (`#e6e6e6`, V 0.90) edge to edge:
**+0.32 of contrast against the stage-1 sky, no new tone, no palette change, and the near sheets
untouched** — REFERENCE row 12's "pale stage-1 enemies" is about the engagement-scale livery and
says nothing about the far LOD.

**I tried to put a number on the arcade's stage-1 distant enemy and withdrew it.** The only
clearly-distant stage-1 enemy in this repo's frames sits **inside the HUD reticle**, and a
threshold-against-sky mask returns the reticle's brackets with it — 163 px over a 29×26 bbox on
an aircraft that is about 12×10 (`tools/out/drawing-r9/mask-s1-far-enemy.png`). The crop is
unambiguous that it is dark against the sky; the mask is not quantitative. Direction from the
crop, magnitude from the livery ramp.

**Not closed:** the arcade's 26.3 % bbox fill is unreachable while the invariant stands — three
full rows of eight is 37.5 % before a single shaped pixel. The honest way to pay the remaining
~30 points is to lower `DETAIL_SWITCH_NATIVE_PX` so the shaped sheets cover more of the range,
which is a combat-lane call about the span gate. **Not made here.**

### 5.2 Head-on enemies — the swept V

`interceptor` and `prop` (the `delta` family) were **solid filled triangles**; the `interceptor`
one is also the object that hides the player in 19.5 % of play frames. Rewritten as swept blades
with a fuselage, keeping the family's identity (no tailplane, fatter body, taller fin).

| cell 2 | area | fuselage width | sweep | compact feature |
|---|---|---|---|---|
| R8 delta | 654 px | 29.0 % | 30.5° | 3.1 % |
| **R9 delta** | **523 px** | **12.9 %** | **25.0°** | **3.8 %** |

**The only arcade frame for this is stage 2 and it is a 1440×1080 video upscale of a 320×224
original** (`ab2-arcade-closeup-enemies.jpg`, HUD digit 2, dark-green camo on orange sky).
**Shape only — no colour, value or cardinality claim is taken from it**, and acquisition item 5
still blocks everything else about these cells. Said once in the source so it is not inherited
silently. What it shows (`r9-04b`, native-equivalent 47×22): a thin horizontal wing bar with a
dark lower edge, a compact central block carrying the red intake, a short fin stripe above, and
sky above and below the bar across most of the span. A cross, not a triangle.

R8's note that the two delta halves must stay on different rungs is kept; its stated reason (a
unified triangle trips the compact-feature gate at 12.9 %) is moot in the good direction now —
a blade is not compact.

### 5.3 The death hulk's missing highlight

The remap lives in `src/game/flow/deathSequence.js` (flow's file, **not written**). The lever is
the sheet. `tools/art/hulk_probe.py` reads `ARCADE_HULK_Q` and the luma out of that file's own
source and reports what the remap will make of a sheet.

The mechanism R8 diagnosed is exact: each distinct source luma is placed at the midpoint of its
own share interval, so a tone owning a large share has its midpoint dragged toward the middle and
**cannot reach the top rung however bright it is**. R8's brightest tone owned 23.0 % and landed
on R 123.

| | brightest tone share | remapped max |
|---|---|---|
| R8 `52edcc4` | 23.0 % | 123 |
| **R9** | **1.4 %** | **189** (arcade 191) |

**The tone is sized to the arcade, not to the percentile, and the order matters.** An isolated
census of the arcade's own daylight jet returns 984 airframe px of which `#ffffff` is 6 and
`#f7f7f7` is 1 — **0.7 %**. That is the licence for `PLAYER.specular`. The R8 critique argues
(§5a) *not* to chase the 144 p95, because the target is a night, 30 fps, video-decoded
measurement applied to a daylight object — the family this project has retired twice. **I agree
and did not chase it: our p95 is still 123 and I am not proposing to move it.** What changed is
that the hulk now has a highlight at all, which was the visible defect.

Day sheet: 10 → **11 colours**, still below the arcade daylight jet's own 14. **Night sheet
unchanged at 9** — its measured 8-colour set carries no white, so `specular` maps onto its
existing top rung and night gains a role and no colour.

**Not closed:** smoke and debris. `debris.png` and `smoke-puff.png` are this lane's files but
*wiring them into the death sequence is `game/flow/**`*. **Request to the flow lane: emit
`smoke-puff` and `debris` from the tumbling hulk.** The art exists.

---

## 6. Two guards this round earned

**`tools/art/mirror_sync.py`** regenerates `drawJetSilhouette()` from `levelOps()` instead of
hand-copying it, which is how R5 shipped a different daylight aircraft for a round.

More importantly it closes a hole that **caught me**. Both role-list guards (`JET_PALETTE_ROLES`,
`LEVEL_OPS_ROLES`) are hand-maintained, so they only check roles someone remembered to add. I
added `specular` to the drawing first; both lists stayed silent, and the game booted into exactly
the `TypeError: Cannot read properties of undefined (reading 'slice')` that `spriteFactory.js`'s
own comment describes. `vite build` passed it happily. The lists are now **derived from the
drawing program's text**, and every palette table that feeds the drawing is checked against them.
**The guard was validated by removing `specular` from one table and confirming it fails** (it
does, naming the table), then restoring it.

`assertRoles` on the sheet side also fired correctly on the roll sheet — the R7 hole bug it was
written for after it shipped undetected for a round.

---

## 6a. Open items between the lanes, with both positions

Carried forward rather than smoothed over, per the project's practice.

**(a) Which mask rule the criterion names. RESOLVED — the achromatic rule is
licensed.** `criteria-r9` reproduced the ground-truth test independently on all
nine day cells and my cell-4 figure of **20.9 % lands exactly**. They then
localised the mechanism more precisely than I had, and it matters:

> **the damage is step 2, not step 1.** The four-role mask *fragments* the
> level airframe, and the largest-component step — which is in **both** rules —
> discards all but one piece: 57.6 % → **20.9 %** from the component step
> alone.

So the four-role rule is not merely an incomplete colour list; it interacts
with a shared step, and the damage is **pose-dependent** in a way no statistic
in REFERENCE can see. The licensed reason is the ground-truth test, not the
tone census, and the binding rule now reads: *a mask rule is validated against
ground truth on both sides of a comparison; only our own sheets have ground
truth; the arcade side can only be checked by cropping and looking. A rule
never tested against our own alpha is untested.*

**Their residual reconciles to the pixel.** They read 92.4–94.3 % for my rule
where I read 99.2–100 %, and attributed the gap to step 3 (the enclosure fill)
being omitted. Verified: without the fill I get **cell 4 = 92.4 %, cell 0 =
94.3 %** — their figures exactly — and the fill recovers precisely
`#ef7300` 56 px and `#ffd600` 16 px on cell 4, the numbers they named. The only
pixels still missing afterwards are `#e694f7` × 8: **the canopy fleck, the same
tone the day mask drops on the arcade side.**

**And the symmetry is the point.** The enclosure fill recovers *our* afterburner
flame by exactly the mechanism it recovers the *arcade's* nozzle glow —
saturated colour inside a dark ring, rejected by `sat < 0.35`, restored because
it is enclosed. One rule, one failure mode, both sides. That is what makes the
comparison symmetric, and it is a better argument for the rule than either of
the two we started with.

**(b) Whether INK/SPAN can ever be a gate. Agreed NO, recorded for the judge.**
It is dimensioned (×1.999 under a 2× control) and it is mask-dependent (±15 %).
Reported-with-its-span and with its mask, never gated.

**(c) The day/night anchor agreement.** I led with "DENS agrees to 1.3 % across
day and night". `criteria-fix-2` is right that this sits inside both operators'
own discretion — ±17.3 % tolerance on one side, ±18 % tone-list on the other —
so it is *consistent with* a tight anchor, not evidence of one. Withdrawn as a
headline; the anchors stand on their own.

## 7. What I could not close, and why

1. **`RSW` did not move on the day level cell** (4.52, arcade 2.58). DENS and RP90 improved; the
   median stroke width did not, because the body below the nozzle line is still one thick mass.
   The night sheet reaching 2.86 on the same geometry says the day sheet's `#840000` rim is most
   of the remainder. **This is the first thing to attack next round.**
2. **The blade knee.** The arcade's blade is constant-width with a root flare, not a linear
   taper, and that is ~5 points of excess per row over thirteen rows. I drew it, measured
   `cant` 1.14, wrote it up as a gate failure — **and that reading was an artefact of a file a
   broken shell sweep of mine had corrupted** (`const FIN_ROOT_OUT = 15.0 9.6;`). The tell was
   that `cant` did not respond to *any* of fifteen root values, which I read as "the pod is in
   the fin band" when it meant "the constants are not reaching the drawing". **Every figure taken
   between that sweep and the repair was invalid and has been re-measured.** Re-measured
   honestly, the knee leaves `cant` at 1.19 and makes ink *slightly worse* (1.25× → 1.26×),
   because it pushes the blade's outer edge out at row 13 and the rim follows. Right shape,
   wrong parameters, and finding the right ones is a search I did not have budget to finish.
   Recorded in the source, not shipped.
   **The lesson, which nearly cost more than the knee: a statistic that will not respond to its
   own input is a broken instrument or a broken file before it is a finding.**
3. **The far LOD's 26 % fill** — blocked by the opacity invariant; see §5.1 for the one lever.
4. **Fin-pair extent 36.0 against 35.4–35.7**, and **cant 1.19 against the arcade's 1.28** — both
   passing, both resolution-limited at a 100 px authored span.
5. **Smoke and debris on the hulk** — cross-lane, requested above.
6. **The arcade's dark-accent share is 35.3 % and ours is 28.7 %.** Improved from 26.5, not
   closed. The remaining gap is interior line-work the arcade has and we do not.

### A criterion I would not tune to, for the criteria lane

**The far-LOD value target of V 0.289 / ΔV 0.613 should not be applied to stage 1.** It is
measured on a stage-2 orange-sky camo frame (HUD digit 2) and this repo's own R6 polarity
derivation retired that exact substitution once already. It is safe as a *stage-2* target.

### Acquisition

- Item 2 (true-native LEVEL astern arcade jet) **no longer blocks the drawing weight** — t175
  serves, and its figure agrees with the native banked frame to 1.3 % before the ring repair.
  It still blocks colour.
- Item 5 (true-native near-aspect arcade enemy) **still blocks everything about the head-on
  cells except their shape**.
- **New:** a *daylight* arcade death instance, still absent, still the reason the hulk's p95 is
  not chased.

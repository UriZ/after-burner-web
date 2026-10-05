# Cross-lane asks from the presentation lane (R5)

Full working and evidence in `judging/R5/lane-presentation.md`. The lead owns
`interfaces.md`; nothing here was written into it.

---

## P→C1 — to criteria-fix (and the lead): gap 3's acceptance criterion does not survive contact with the arcade

**This is the one that matters.** Gap 3 asks for two things that the arcade itself does not
do and cannot do.

**(a) "white/black plate behind SPEED *and STAGE*".** The arcade has a white lozenge behind
SPEED (`ab2-arcade-desert.png`, x[15,53] y[200,207]). It has **no plate behind STAGE** — red
letters with a right+below black drop shadow drawn straight onto the ground, on the exact tan
desert that `evidence_hudbot_s2.png` complains about. Building a plate behind STAGE moves us
away from AB2. Please retire that half of the clause.

**(b) "≥3:1 luminance contrast against the local background".** Measured on the arcade's own
desert frame, WCAG contrast of ink against its field:

| arcade element | ink/field | worst glyph px |
|---|---|---|
| STAGE digit (cream) | 4.44:1 | 2.47:1 |
| STAGE label (red) | **1.05:1** | 1.06:1 |
| score digits (cream) | **2.74:1** | 2.74:1 |
| SCORE letters (red, **on the arcade's white plate**) | **1.85:1** | 1.05:1 |
| SPEED label (red, **on the arcade's white plate**) | **1.57:1** | 1.05:1 |

**Four of five fail, including both elements sitting on the plate the criterion prescribes.**
It is unreachable for this palette: `#f70000` has relative luminance 0.198, so 3:1 needs a
field below 0.033 or above 0.69 — near-black or near-white, and AB2 ships neither behind
STAGE. The criterion also contradicts gap 3's own next clause: once "glyphs carry a dark
outline" is satisfied, the outline *is* the local background.

**Proposed replacement** (the lead's suggestion, with numbers): **ring-vs-field separation
per ink class**, plus worst-glyph-pixel contrast. Ours against the arcade's, on comparable
tan ground:

| ink class | ring/field arcade | ring/field **ours** | worst px arcade | worst px **ours** |
|---|---|---|---|---|
| STAGE digit (cream) | 1.36:1 | **2.92:1** | 2.47:1 | **6.00:1** |
| STAGE label (red) | 1.87:1 | **4.12:1** | 1.06:1 | **1.36:1** |
| score digits (cream) | 2.08:1 | **4.17:1** | 2.74:1 | **7.61:1** |

Ours is ~2× the arcade's on every class on both metrics. This extends I21-REVISED from
stage 3 to stage 2 and to the daylight ink classes: **our HUD is over-separated relative to
AB2, not under.** I would suggest the bar be stated as "ring/field separation ≥ the arcade's
measured value for that ink class", which we pass everywhere with margin.

---

## P→W1 — to the world lane: stage 2's ground has no dark floor, and that is what the HUD legibility complaint is actually measuring

`evidence_hudbot_s2.png` is right that our stage-2 cream stage-digit reads poorly. It is not
a HUD defect — see P→C1, our glyph separation is twice the arcade's. It is the ground.

Relative luminance behind STAGE, x[130,200] y[196,212]:

| | mean L | **median L** | p90 L |
|---|---|---|---|
| arcade desert (`ab2-arcade-desert.png`) | 0.195 | **0.123** | 0.528 |
| ours, stage 2 (`tools/out/presentation-r5c/demo-long/frame-0056.png`) | 0.290 | **0.308** | 0.528 |

**The p90 matches exactly; the median is 2.5× brighter.** The arcade's desert has a dark
dither floor our stage 2 does not. That is the same fact as gap 6 ("undifferentiated
brown/cream dither where the arcade has a forest canopy cut by a pale road" — a canopy has
shadow in it). Give stage 2 its dark floor and the HUD legibility number follows for free;
nothing in my lane can recover it short of a plate the arcade does not have.

No action needed from you if gap 6 is already being worked — this is just naming the
dependency so the judge does not score it against the HUD.

---

## P→S1 — CLOSED. The card glyphs are done; one note for whoever owns reference capture

**This was a blocker in the first version of this file; it is resolved and needs nothing from
anyone.** Recording the outcome because the ask was circulated.

I asked for a card frame at native 320×224. The lead established that none exists and none
can be obtained — every cached source is an upscale — and ruled that the glyphs be authored
from the best upscale and graded ADOPTED. Done. The source turned out to be far better than
the card frames themselves: the **high-score name-entry screen** at the end of
`ab2-longplay-60fps.mp4` shows the **entire alphabet** in this face, flat pink on flat dark
blue, at 3.21×, with no terrain or sprite overlap.

The transcription operator reproduces the seven glyphs already measured at native resolution
**exactly — 0 of 343 cells differ** — so the other nineteen are as reliable as the controls.
All 18 new letters are in `font.js` with the ffmpeg command, the operator, the control and
the no-native-exists reason written beside them; the crop sheet is at
`judging/R5/presentation-evidence/card-glyph-sheet.png`.

**The one note worth passing on:** that name-entry screen is the cleanest typography
reference in the project, and nothing was using it. If any lane needs AB2 letterforms or the
exact pink/blue of that screen, extract it with

```
ffmpeg -ss 970 -i .reference-cache/video/ab2-longplay-60fps.mp4 -vf fps=1 -frames:v 20 full-%02d.png
```

and take frame 16; a copy is already at
`judging/R5/presentation-evidence/name-entry-1028x720.png`. The same scan also turned up a
"MISSION COMPLETE" card and the "BEST FIGHTERS" high-score table, neither of which this
rebuild implements — flagging for gap 10's "still absent" list rather than claiming it.

---

## P→L1 — to the lead: `tools/cards-preview.{html,mjs}` is new

Additive, uniquely named, follows the existing `clouds-preview` pattern, and takes a
`?card=continue|ready|tally` param. It draws one flow card onto a flat 320×224 canvas on an
off-palette background so every card pixel is separable by exact colour — the cards cannot
otherwise be measured without a death and a live countdown. Worth a line in `README.md`'s
harness list if you keep it; I did not edit `README.md`, as it is not in my lane.

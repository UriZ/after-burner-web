# R7 — sprite-art lane, cross-lane asks

Evidence and operators for everything below are in `judging/R7/lane-sprite-art.md`. Nothing
here was acted on unilaterally.

---

## A. For the CRITERIA lane

### A1. The per-sprite colour bound contradicts its own table, and R7 is over the published figure

REFERENCE.md, "Per-sprite evidence", concludes **"Aircraft and clouds sit at 5–8"**. That is
derived from the **night** jet (exactly 8) and the cloud puff (5). The *same table's own
daylight-jet row* records **14 total colours, 7 covering 95 %** for
`ab2-arcade-desert.png` x[85,182) y[82,140).

My own isolated census of that crop (`tools/art/value_census.py`, `--selftest` PASS; mask =
`S<0.35` + largest 8-connected component, 751 px, mask dumped and looked at) returns **9
airframe tones**, plus `#840000` as 49.5 % of its rim, plus three nozzle oranges — i.e. **12–13
colours on and around the arcade's daylight player sprite**, consistent with the table's 14.

**Ask**: restate the aircraft bound so it does not fail the arcade's own daylight aircraft.
R7 ships the player at **10 (day) / 9 (night) / 11 (roll)**. The roll sheet is 11 because it
is the one sheet that must carry two surface families at once (the grey ventral ramp *and* the
measured dorsal blues) in a single palette.

I raised the gates in `buildStrip` deliberately rather than quietly: the numbers are in the
call sites with the measurement beside them.

### A2. JET-SIL's afterburner mask cannot be run on a daylight sprite that carries the arcade's own keyline

REFERENCE.md publishes the nozzle mask as **hue 5–55°, S ≥ 0.45, V ≥ 0.45**. The
nozzle-separation figure it feeds was only ever taken on `stage3-night-level-t175.png` — a
**night** crop, whose keyline is the measured blue-grey `#425284` and cannot enter a red-hue
mask.

The arcade's **daylight** jet is keylined in `#840000`: V 0.518, S 1.000, hue 0. It passes.
On our R7 day cell the two largest components of that mask are

```
V >= 0.45 (published):  [128 px of #840000, 52 px of #ef7300]  ->  15.3 % of SPAN
V >= 0.70            :  [ 52 px of #ef7300, 52 px of #ef7300]  ->  30.6 % of SPAN   (band 25-35)
```

Nothing about the drawing differs between those two lines.

**The 0.45 floor has no measured support.** Every afterburner colour this project has measured
on an arcade frame is **V ≥ 0.902** (`#e67300` 0.902, `#f78400` / `#f7b500` 0.969 on the native
desert frame; `#ff7500` on t175); ours are `#ef7308` 0.937 and `#ffd600` 1.000. A floor of 0.70
clears every measured glow by ≥ 0.20 and clears `#840000` by 0.18.

**And it changes nothing on the arcade**: `jetsil.py`'s control suite returns **30.0 % under
both floors** on t175. That is the evidence it is not a threshold tuned to our sprite.

**I did not move the published operator.** `jetsil.py` still defaults to 0.45 and now prints
**both** readings with their component sizes whenever they disagree, so the failing figure is
on the page next to the passing one. **Ask**: rule on which floor REFERENCE.md keeps, or
re-specify the step as "components of the afterburner GLOW", which is what the prose already
says and the thresholds do not implement.

### A3. Two-blade fin rows read 95.2 % on the colour-blind mask, day and night — unchanged from R6

This is the R6 judge's own figure, re-measured and reproduced, **not** something R7
introduced: I changed the blades' tones, not their geometry. It is below the published 99–100 %
band on both sheets. Either the operator needs a form that does not bridge the blade pair near
the root, or the band needs re-deriving against the arcade at our SPAN. Flagging that it is
still open so it is not re-attributed to this round's redraw.

### A4. REFERENCE.md records the arcade daylight-jet shares from a 672 px population; mine is 751 px

Minor but it will cause a disagreement if nobody writes it down. The `PLAYER` comment in
`tools/art/palettes.js` (R6) cites `n = 672` with `#ffffef` at 35.6 % and `#f7e6b5` at 26.5 %.
Under `S<0.35` **plus the largest-component step** (which removes a few stray desert pixels the
bare S filter keeps) the population is **751 px** and the same tones read **31.8 %** and
**23.7 %**. Same frame, same box, same S gate; the isolation step is the difference. I have
used the 751 px figures throughout and left the R6 comment's numbers in place with the new ones
beside them. Worth one ledger line so the next reader does not treat it as a contradiction.

---

## B. For the GAME-FLOW lane (`src/game/flow/launchSequence.js`, framing)

### B1. `carrier.js`'s stated camera does not match the frame it cites — I did not re-derive it

`src/game/flow/carrier.js`'s header says the ship is *"seen from ASTERN and slightly above,
looking forward along the deck, bow away from the camera"*, and the module draws a symmetric
trapezoid narrowing upward, with the proportions solved from four landmarks on
`reference/carrier-prelaunch-t84.png`.

**t84 is not that view.** In that frame the ship runs left-to-right across the screen with the
**bow to the left** and the stern to the right — a high-oblique broadside. The frame that *is*
a deck-level forward view is `carrier-launch-t89.png`. So the module currently draws t89's
camera using t84's measured proportions, and says neither.

I redrew the island, deck markings, parked aircraft and hull detail against **t89** this round
(that is where the structure is legible — the island is ~90 px there against ~25 px in t84) and
**changed no placement maths**: `TEX_W/TEX_H`, the ship bbox inside the texture,
`sprite.center` and `placeCarrier` are untouched, so your four-landmark framing still holds
exactly.

**Ask**: decide which shot the launch sequence is reproducing, and say so in both files. If it
is t89, the %W/%H landmarks should be re-derived from t89 rather than t84 — that is a framing
change and therefore yours, not mine. If it is t84, the texture wants a broadside redraw and I
will take it next round.

---

## C. For the PLAYER & HUD lane (`src/ui/titleFont.js`, `src/game/flow/titleScreen.js`)

### C1. The title letterform spec, measured, with one operator on both sides

Gap 10's second half is the title letterforms. **Those files are yours**, so this is a spec,
not a patch.

Operator: ink = `max(RGB) > 190` **and** `(max−min) < 40` — the cream lettering; it excludes
the blue A and the red B on both sides. Ours: `?fixed=1&seed=1&showtitle=1`, decimated to
native. Arcade: `reference/title-screen-t74.png` divided by its 686/320 = 2.144 upscale.

| | AFTER cap h | AFTER x | BURNER cap h | BURNER x | block top→bottom |
|---|---|---|---|---|---|
| **ours** | **42** | 107–256 (w 150) | **42** | 85–273 (w 189) | y 51–141 = **91** |
| **arcade** | **47.6** | 110.1–254.2 (w 144.6) | **54.1** | 86.3–277.6 (w 191.7) | y 52.2–166.5 = **114.3** |

What that says, in the order I would act on it:

1. **The widths are already right** (+3.7 % and −1.4 %) and so is the block's **top** (51 vs
   52.2). The whole shortfall is at the **bottom**. Do not re-centre; grow downward.
2. **The two words are NOT the same height in the arcade.** BURNER is **13.7 % taller** than
   AFTER (54.1 vs 47.6). Ours are both 42. **A uniform scale-up will still be wrong** — this
   is the part the art critique's single "grow the lettering ~29 %" figure hides.
   Per-word targets: AFTER **×1.13**, BURNER **×1.29**.
3. The baseline gap is short too: the arcade leaves **13.5 native px** between AFTER's bottom
   and BURNER's top; ours leaves 8.
4. **Letterform shape**, from the crop at 2×
   (`judging/R7/r7-03-title-ours-TOP-arcade-BOT.png`, and
   `tools/out/sprite-r7/arcade/t74-logo-2x.png` for the arcade alone): the arcade's caps are
   **slanted**, with **cut corners** — the A's apex is cut flat, the R's leg kicks out, the E
   and F arms end on an angle — and carry a visible calligraphic weight shift. Ours are upright
   block caps with square terminals. This is the half no scalar above captures.

### C2. The "II" is the right SIZE and the wrong DENSITY — a second defect, not on any gap list

The art critique overturned R5 by measuring the II's bounding box, and **that reproduces
exactly**. Sphere mask (`B>140`, `B−R>25`, `95<R<215`):

| | bbox | height | width | **sphere pixels inside it** |
|---|---|---|---|---|
| ours | x[130, 227] y[51, 169] | 119 | 98 | **2 177** |
| arcade | x[130.1, 226.7] y[50.8, 171.2] | 120.8 | 97.0 | **15 767** |

The II is the arcade's size in the arcade's position to within 2 px — **and has 7.2× fewer
sphere pixels in that box**. The arcade's II is a *dense bubble slab* that the lettering
interleaves with; ours is two outline I-forms with serif feet, and those feet protrude below
the lettering only because the lettering is too short to meet them. **Fixing the lettering
height alone will leave the II looking sparse.** Both halves are needed.

### C3. There is a second, unused copy of the wordmark in my files, and I have labelled it

`tools/art/sheets/title-logo.js` is a complete, **entirely unused** implementation of the same
wordmark: nothing imports it, `tools/art/build.js` does not list it, there is no
`title-logo.png`. It is the defect class R6 spent a day removing from the enemy palettes.

I have given it a header saying it is dead, naming `src/ui/titleFont.js` as the live path, and
pointing at this spec. **I did not delete it** — deleting another round's work unasked is not
this lane's call. **Ask**: either wire it up and delete `titleFont.js`'s glyphs, or delete it.
Do not edit both.

---

## D. For the COMBAT lane — carried from R6, still true

### D1. The five authored enemy bank poses are still never selected

`textureFor()` in `src/entities/enemy.js` does not pass `bankDeg`, so every enemy in the game
renders cell 2. The art exists and is measured. R6 flagged this; it is unchanged. One line, in
a file I do not own.

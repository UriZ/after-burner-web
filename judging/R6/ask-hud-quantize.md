# R6 — HUD quantize lane: things noticed, not acted on

Filed rather than fixed, per the lane's scope discipline. Ordered by what I think is worth
someone's time.

---

## 1. A new Canvas2D bug class, for CLAUDE.md's list

**Two overlapping collinear subpaths inside ONE `stroke()` do not union their coverage.** The
second subpath's butt cap writes a half-covered pixel *on top of ink the first subpath already
covered completely*, producing a 50 % seam in the middle of a solid figure.

This is distinct from the "Canvas2D fractional positions" entry already in CLAUDE.md, and it
is nastier, because **the pixel it corrupts is fully interior to the geometry.** Reading the
code and working out the extents says that pixel is solid. Only a capture disagrees. It cost
the old reticle six pixels of opaque `#7b7b7b` — an off-palette grey written at full alpha, so
not even a transparency artefact that a world-aware test would explain away.

Reproduction (fresh canvas, any of 40×12 / 40×40 / 320×224):

```js
ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(3.5, 6.5); ctx.lineTo(13.5, 6.5);   // covers x3..x13
ctx.moveTo(11.5, 6.5); ctx.lineTo(30.5, 6.5);  // starts inside the first
ctx.stroke();
// alpha at x=11 is 127, not 255. Stroke the two segments separately: 255.
```

**Caveat, and the reason it is not a gate.** It does not reproduce on a canvas that has
already been drawn to and cleared several times — `tools/hud-probe.mjs`'s own scratch canvas
returns 255. Some renderer-state difference decides which rasteriser runs. The case is in that
file's selftest as an INFO line that prints both numbers and gates on nothing; an instrument
control that fails for a reason unrelated to its subject is worse than no control. Someone
with a spare hour could pin down the trigger.

Suggested CLAUDE.md wording: *"Overlapping subpaths in one stroke(): coverage is per-subpath,
not unioned, so an overlap seams at 50 % even where the figure is solid. Stroke separately, or
rasterise to 1 bit. Found in the R6 reticle; invisible to code reading, visible only in a
capture."*

## 2. The reticle's status dot has no arcade measurement

`drawReticle` draws a 2×2 colour core on a 4×4 keyline. The 2×2 is now rendered exactly
(it used to be a 5×5 partial-coverage smear, which is why it looks smaller after this round —
see `lane-hud-quantize.md` §6). But **no part of it is measured**: not the size, not the
4-on-2 proportion, and not the colour. `RED_LOCK`'s comment has said so since R5, and
`REFERENCE.md` records only "amber dot `#ffcd21`" inside `BB_RETICLE`.

Two separate questions for whoever owns reference measurement:
- **Size.** 2×2 on a 19×19 bracket square is a guess. One frame of the arcade with a lock
  active would settle it.
- **Colour.** REFERENCE.md says `#ffcd21`; the code uses `AMBER = #f7b500` for locked and
  `RED_LOCK = #ff3a21` for tracking. Those are three different ambers/reds and at most one of
  them is right. I moved `RED_LOCK` from `#ff3b1f` to `#ff3a21` only to get it onto the Sega
  ladder (it was the HUD's single off-ladder colour); I did **not** try to make it correct,
  because there is nothing to make it correct against.

Also unmeasured, and a bigger question than the dot: **GAME_SPEC §3 reads the attitude line as
an artificial horizon, while REFERENCE.md says "The HUD does not rotate."** The line is the one
element exempted from that. Worth confirming against footage that the arcade has a rotating
line at all, before anyone tunes its length or thickness.

## 3. The `?debugstick` roll ceiling is a measurement blind spot

`?debugstick=±1` saturates `worldRoll` at 66.5°, so the in-situ sweeps in this lane cover
0°, ±30° and ±66.5° and nothing beyond. The authored-canvas sweep covers the full 360° in 15°
steps and is clean there, so I am not worried about the HUD — but **any future in-situ check of
a roll-dependent element has the same ceiling**, and a barrel roll (`player.isRolling()`)
actively suppresses world roll toward 0 rather than exceeding it. If a lane ever needs a
steep-bank in-situ frame, `?debugstick` cannot produce one.

## 4. Criterion A under combat is failed by a wide margin, and nobody owns the number

Not mine to fix, and I could not find it stated anywhere as a known gap, so: with combat live
(`seed=3`, 15 frames, 3 spacings) stage-1 whole-frame channel values run **31 to 238** and
unique colours **59 to 858**, against gates of ≤32 and ≤256. The HUD is clean throughout those
frames (0 unexplained colours in all three bands, status dot included), and the world lane has
stage-1 ground at 13, so it is effects — explosions and trails.

The published Criterion A scoreboard appears to be measured on `nocombat=1` captures
throughout. **That is a gate measured with the subject removed.** It is the same shape of
mistake as measuring a rotating element at one tick spacing: not wrong arithmetic, just a
population that excludes the hard case. Either the gate should be stated as "nocombat" on the
scoreboard, or effects need to come inside it.

## 5. Small

- **`tools/capture.mjs` cannot capture a specific stage directly.** There is no `?stage=N` on
  the main page (only on the ground-preview harness), so reaching stage 2 means stepping
  ~1,700 ticks and reading the HUD digit to find out where you landed. Three of my capture
  sets exist only to walk the transition. A `?stage=N` query param on `main.js` would save
  every future lane that time — flow lane's file, not mine.
- **`HUD_PALETTE` is now exported from `src/ui/hud.js`.** If you add a colour to the HUD, add
  it there too; `tools/hud_palette_probe.mjs` fails loudly otherwise. That is deliberate.
- **New tools in `tools/`.** `lane-criteria.md` claims new `tools/` scripts for the criteria
  lane. I added four (`hud-probe.{html,mjs}`, `hud_palette_probe.mjs`,
  `measure_hud_insitu.py`, `measure_hud_consensus.py`) because the measurements this lane was
  asked for did not exist. All uniquely named, all additive, none touching an existing tool.
  Re-home them if that ownership line is meant strictly.

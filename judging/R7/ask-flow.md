# R7 — asks from the game-flow / player-feel lane

All of these are in other lanes' files. Nothing below was edited by this lane.

---

## A1 — COMBAT/FX: `REACH_CEILING_NDC_Y` must move, and here is the number

`src/game/spawner.js`'s own comment says it: *"RAISE THIS when player.js ENVELOPE_Y does."*
It has now moved, and not the way that comment predicted — the envelope is **asymmetric**
from this round (`ENVELOPE_Y_UP = 1.55`, `ENVELOPE_Y_DOWN = 1.10`), because the arcade
evidence for climb and for dive points in opposite directions (`lane-flow.md` §3).

Re-deriving `REACH_CEILING_NDC_Y` with the spawner's own published arithmetic:

| | committed | now |
|---|---|---|
| player ndcY ceiling (full stick up) | +0.298 (35.09 %H) | **+0.460 (27.02 %H)** |
| player ndcY ceiling actually reached by `?demo=1` | +0.106 (44.7 %H) | **+0.296 (35.2 %H)** |
| sight = player + 0.30 | +0.406 | **+0.760** |
| + the 0.237 lock/assist reach in y | 0.643 → published **0.64** | **0.997** |

So the reachability bound is now **≈1.00, i.e. not binding at all** at the rail, and
**≈0.833** at the altitude the attract flight actually reaches. Your comment also says the
`ndcA` (far-field) clamp is kept only because the all-enemy top-third share already matches
at 34.9 % vs 32.5 % — that is still true on my measurement (29.4 % all-enemy, 31.9 %
readable, 40-cycle window, `tools/out/flow-r7/alt-AFTER.txt`), so **lift `ndcB` first and
re-measure before touching `ndcA`.**

**One more thing before you tune to the readable-enemy 47.4 % figure**: see A4. The arcade's
*player* top-third share, over 109 hand observations by two independent readers, is
**0.92 % — one observation**. The gap-5 line "our pilot occupies the top third 0.00 %" is
true, and the arcade pilot is there 1 % of the time. The gap is the **p5 and the spread**,
not the top third.

## A2 — COMBAT/FX: `playEnemyFlyPast` still has zero call sites (unchanged from R6 A2)

`src/audio/sfx.js:134` is a complete, enveloped, stereo-panned synth; `AudioBus.play(
'enemyFlyPast', {panFrom, panTo})` is registered at `sfx.js:362`. Unchanged since R4. The call
site is `spawner.js`'s despawn-past-the-camera path and it is yours:

```js
AudioBus.play('enemyFlyPast', { panFrom: Math.max(-1, Math.min(1, e.ndc.x)), panTo: Math.sign(e.ndc.x || 1) });
```

Still not done from `game.js` for the reason R6 gave: it would mean polling
`combat.spawner.enemies` for depth crossings from a file that should not know the spawner's
internals, and it would fire on the wrong edge or twice depending on despawn semantics that
are yours to know.

## A3 — COMBAT/FX: a `setSpawning(false)` is the one line that unblocks the resupply stages

This is the whole reason gap 11's resupply half is **not attempted** this round
(`lane-flow.md` §6). GAME_SPEC §5 measures the runway restock in detail and **every property
of it except one is this lane's**: score frozen for the whole pass, HIT stays 0, SPEED bar
near zero, stock held then refilled in a burst. The one that is not is **"no enemies"**.

`flow.js` can already stop combat being *updated* (`combatActive: false` on its return value,
which `game.js` honours) and can already empty the field (`combat.clear()`, public, already
called). What it cannot do is let the player keep the vulcan and the stick while the spawner
stays quiet — `combatActive: false` freezes the player's own weapons too, and a 12-second
stage where firing does nothing is a worse simulation than the generic stage we have now.

Ask: `setSpawning(enabled)` on `Combat` (or on `Spawner`, proxied), gating `spawner.update`'s
queueing only. With that I can land stages 5 and 13 as measured resupply stages in one change
on my side, and I will not build half of it without it.

## A4 — CRITERIA: the arcade player-altitude column now has an independent re-count, and the
## top-third framing of gap 5 should be corrected before anyone tunes to it

`judging/R6/report.md` gap 8 asks for an independent re-count of the R6 arcade hand count. I
did the **player** column of it (the enemy column is still unstarted — that one is still gap 8).

| | n | min | p5 | p50 | p95 | max | mean | sd | **top third** |
|---|---|---|---|---|---|---|---|---|---|
| R6 combat lane (stages 1,4,6,7,12,19, 3.00 s grid) | 61 | 27.0 | 36.0 | 49.0 | 63.0 | 67.0 | 49.16 | 8.11 | **1.64 %** |
| **R7 flow lane (stages 2,3,9,14,20, 3.50 s grid, different reader)** | **48** | **35** | **40.0** | **50.5** | **60.0** | **67** | **49.85** | **7.21** | **0.00 %** |
| pooled | 109 | 27.0 | 36.4 | 50.0 | 62.0 | 67.0 | 49.47 | 7.73 | **0.92 %** |

**The R6 column reproduces**: the two means are 0.69 points of H apart on 48 and 61
observations. That is a confirmation, and it is the first the project has for this quantity.

Two things that should go into REFERENCE/GAME_SPEC off the back of it:

**(a) The "top third" framing of gap 5 is a 1-in-109 event and should not be a target.** The
arcade's own player top-third share is **0.92 %**, one observation of 109. Gap 5 reads "our
pilot occupies the top third of the screen 0.00 % of 20 970 flight ticks against an arcade
pilot whose p5 is 36.0 %H" — both halves are true, but a reader takes away "the arcade pilot
is often up there" and he is not. The defensible statement of the same gap is **p5 and
spread**: arcade p5 36.4 / sd 7.73 against our committed 44.8 / 6.15.

**(b) REFERENCE #122's cruise `cy ≈ 52.8 %H` and these hand counts are the SAME number in
two units, and they agree.** #122 is in PIXEL-CENTROID units (REFERENCE.md "Centroid: which
pixels, and which average"); the hand counts read a BBOX CENTRE off a ruler. The published
offset is +1.3 to +3.3 points, so the hand counts' 49.5 bbox centre is 50.8–52.8 as a pixel
centroid. **There is no conflict between the ADOPTED roam target and the MEASURED hand
counts** — which matters, because for a while this round it looked like a 7-point
contradiction and like grounds for retiring one of them. Worth a REFERENCE line so the next
reader does not spend the hour.

**(c) Neither hand count samples a canyon stage.** R6 used stages 1,4,6,7,12,19 and I used
2,3,9,14,20; the arcade's canyons are **8 and 17**. So the 109-observation distribution is a
**cruise population**, and comparing it against a pooled `?demo=1` figure (31.25 % of which
is the canyon regime at 61.5 %H) mixes populations. Every comparison in `lane-flow.md` is
therefore made **cruise-regime against cruise-regime**, and the pooled figure is reported
beside it rather than instead of it.

## A5 — PRESENTATION: the life count is still drawn but unreadable (unchanged from R6 A3)

`ui/hud.js`'s `drawLives` renders a 7×4 px sprite at the extreme bottom-left, under the SPEED
label, over the moving sea. The *wiring* is this lane's and is verified correct
(`flow.js` writes `hudState.lives` every tick in every state; R6's continue probe reads
3 → 2 → 1 → 3 across a credit). Placement and size are `ui/**`. A player cannot tell at a
glance that they are on their last life, so the CONTINUE card still arrives as a surprise.

## A6 — SPRITE-ART: a NIGHT barrel-roll sheet, when convenient (unchanged from R6 A5)

The roll is drawn from `JET_ROLL_SHEET` in every stage including night, because there is no
night variant — a ~1.1 s hue pop on night stages. Wiring it afterwards is one line in
`player.js` (mine). Low priority.

## A7 — LEAD: the HUD stage digit, carried forward undecided ON PURPOSE

R6 left this and so do I, with both sides written down so the next person does not re-derive
them. The structure runs 23 measured durations; `STAGES` has 3 entries of content.

* **Draw the WRAPPED digit** (what we do): the digit on screen always matches the palette on
  screen. Honest about lapping. Diverges from the arcade, which draws the true counter
  (`reference/continue-card-gp-t261.png` reads STAGE 4).
* **Draw the TRUE digit**: matches the arcade exactly, and "STAGE 4" over stage 1's sea reads
  as a bug to a human. The usual counter-argument — that judges identify our stage from the
  digit — is weaker than it looks, because `window.__flowState()` already reports
  `stageIndex` AND the content stage, and that is what a `?fixed=1` judge should be reading.

It is a one-line change in my file either way. I am not flipping a reasoned R5 decision on my
own judgement; name the one you want.

## A8 — COMBAT/FX: `?demo=2`'s weave is vertically symmetric and now lands differently

`src/weapons/combatDemo.js:48` is `y = 0.34 * Math.sin(t * 0.73 + 0.4)` — symmetric about
neutral, which it was when the envelope was. It no longer is: the up half of that swing is now
1.41x larger in world units (reaching ~45.8 %H instead of 48.6 %H) and the down half is
unchanged. It is a small change and it is in YOUR harness, not mine, so I have not touched it.
Two options, both one line in your file: leave it (the weave is a convenience, not a measured
roam) or scale the positive half by 1.1/1.55 if any published `?demo=2` statistic depends on
the jet's altitude. `?demo=2` boots clean and reads `jetNdcY -0.2520` at tick 900
(`tools/out/flow-r7/boot_probe.mjs`).

## A9 — CRITERIA: GAME_SPEC §2's "no visible invincibility flash" is REFUTED, with the
## measurement, and it turns an ADOPTED constant into a supported one

GAME_SPEC §2: *"**No visible invincibility flash** after respawn in any of the four instances,
and two deaths occurred ~10 s apart — if post-respawn invincibility exists it is short and
unindicated. The prototype's 2 s flashing window stays ADOPTED as a usability choice, not
arcade-verified."*

**There is a flash.** `ab2-gameplay.mp4`, the gp t198–218 instance the section is built on,
decoded contiguously (not `-ss`-seeked — see below), the player jet blinks:

| | |
|---|---|
| starts | **t207.567**, the frame the respawn reaches normal scale |
| ends | **t209.233**, after which the jet is present in every frame for 6.77 s straight |
| **duration** | **1.67 s** |
| pattern | 8 clean on/off alternations, period **0.267 s** (8 frames at 30 fps), roughly 5 on / 3 off |

Operator: count bright-and-desaturated pixels (`max(RGB) > 120 ∧ max−min < 60`) in a jet-sized
box at x[180,480] y[100,250] of the 640×360 frame — the box excludes both HUD strips and the
READY row, so the trace is the airframe and nothing else. The per-frame counts go
~2 000–2 900 ↔ 0–60; there is no ambiguity in the middle. Trace and frames in
`tools/out/flow-r7/arcade-death-exact*/`.

**Why four passes over this footage missed it**: the blink is 0.1–0.13 s per state, so ANY
sampling coarser than ~0.1 s aliases it away, and every previous pass (including my own first
one, at 0.25 s) was coarser.

Three things follow:

1. **`flow.js`'s `RESPAWN_INVINCIBLE_S = 2.0` is now arcade-supported to within 0.33 s**, not
   an unverified usability choice. I have deliberately **not** changed it to 1.67: "it flashes"
   implies "it is invulnerable" by convention, not by measurement, and shortening a grace window
   on an inference while gap 5's lethality gate is already failing is the wrong direction to act
   in. Please record the flash as MEASURED and the invulnerability as the inference it is.
2. **We do not draw the flash at all**, so a player cannot see that he is protected. That is a
   real missing arcade behaviour, it is measured to a period, and the sprite is `player.js` and
   the window is `flow.js` — both mine. Flagged here so the criteria lane can decide whether it
   wants it before I write it.
3. **§2's "full hit→control-restored cycle ≈ 8–9 s" and the R6 judge's 7.8 s are both right**,
   about different boundaries, and the section should say which:
   `hit → normal scale 6.98 s`, `hit → READY gone 7.70 s`, `hit → flash off 8.67 s`.

## A10 — EVERYONE: `-ss <t> -i <file> -frames:v 1` returns duplicate frames on `ab2-gameplay.mp4`

CLAUDE.md prescribes single-frame extraction with `-frames:v 1` at an exact timestamp and warns
that **sequence** extraction on the AV1 60 fps file starts ~4 s early. There is a second,
quieter version of that hazard on the **VP9 30 fps `ab2-gameplay.mp4`**: single-frame extraction
input-seeks, and adjacent 1/30 s requests return **the same decoded picture**.

Measured: 22 frames extracted one at a time over t199.90–200.60 contain **7 duplicate pairs**,
which reads exactly like a ~20 fps source. It is not one — `ffprobe` says 30/1, and decoding the
same span **contiguously** gives **90 unique frames in 3.000 s, 0 duplicates**. The duplicates
are the seek.

It cost me a one-frame error in a published boundary (the death-cycle hit, recorded at t200.533,
actually t200.5667) and it would silently corrupt any frame-accurate claim anyone makes off this
file. **The sweep caught it**, which is the argument for sweeping arcade extractions and not only
our own captures.

The form that is exact, and names each PNG by its own PTS so the mapping cannot drift:

```
ffmpeg -copyts -ss <start-a-few-seconds-early> -i <file> \
       -vf "select='between(t,<lo>,<hi>)'" -vsync 0 -frame_pts 1 out%05d.png
# frame N is at exactly N/30 s
```

## A11 — CRITERIA: "deaths per minute of FLIGHT TIME is the denominator that is invariant to
## death-cycle length" is REFUTED by a controlled experiment

GAME_SPEC §2 makes flight time the PRIMARY lethality denominator on the stated grounds that
*"it is the denominator that is invariant to death-cycle length"*. It is not, on this build, and
the experiment that shows it is the cleanest one available: **change `DEATH_TOTAL_S` and
nothing else**, same seeds, same everything.

| 7 seeds × 300 s | `DEATH_TOTAL_S` 5.2 | `DEATH_TOTAL_S` 7.7 | change |
|---|---|---|---|
| deaths/min **WALL** | 2.229 | **2.086** | **−0.143** |
| deaths/min **FLIGHT** | 2.850 | **2.948** | **+0.098** |
| enemy rounds /min wall | 126.00 | 125.17 | — |
| enemy rounds /min flight | 161.12 | 176.89 | — |

Both denominators move, in opposite directions, and the flight-time one moves by more.

**The mechanism is not a mystery and it is not a bug.** Threats are produced on **wall** time —
`game.js` keeps calling `combat.update` during the `death` state (R5's "the world keeps flying,
not empty" fix, which matches the arcade: the world is still scrolling under the CONTINUE card
at gp t261) — while exposure is counted in **flight** ticks. Lengthening the death cycle
therefore leaves the threat schedule alone and shrinks the denominator. The enemy-rounds row is
the same effect on a quantity nobody is tuning: rounds per **wall** minute barely move, rounds
per **flight** minute rise by the same kind of margin the death rate does.

Neither denominator is invariant, so the published reason for preferring flight time is wrong
even though **preferring it may still be right**. What the section should say instead is which
quantity each one is comparable across: wall clock is comparable across builds with different
death cycles and is the one the arcade figures were taken in; flight time is comparable across
*pilots*. Both, always, on the same line — which §2 already requires and which this lane did.

## A12 — COMBAT/FX: the new vertical dimension has a difficulty gradient, and it is worth knowing
## about before you tune the spawner

Deaths attributed to the altitude of the player's **last flight tick**, 7 seeds × 300 s, shipped
configuration:

| band %H | flight minutes | deaths | **deaths / flight-minute** | share of flight time |
|---|---|---|---|---|
| 32–40 (the new high ground) | 1.92 | 1 | **0.520** | 7.77 % |
| 40–48 | 4.48 | 3 | 0.670 | 18.09 % |
| 48–56 | 4.24 | 3 | 0.708 | 17.12 % |
| 56–64 | 13.48 | 64 | **4.747** | 54.48 % |
| 64–72 | 0.63 | 3 | 4.770 | 2.54 % |

**Read the counts, not only the rates, before acting on any single row.** Only the 56–64 band
carries enough deaths (64) to be worth a percentage; the three bands above it hold 1, 3 and 3
deaths, so their rates carry roughly ±60 % of Poisson noise each and should be read together
(7 deaths over 10.64 flight-minutes = **0.658 / flight-min**) rather than row by row. Against
the 56–64 band's **4.747**, that is a **7.2×** difference, which survives the noise by a wide
margin. The same shape is present in both other arms (BEFORE: 4.105 in 56–64 against 1.890 and
1.443 above it; DEATH-ONLY: 4.181 against 2.721 and 0.992), so it is a property of the build,
not of one seed set.

**Altitude is now the strongest predictor of dying in this game**, by a factor of several, and
the dangerous band is the LOW one. I am reporting the gradient, not calling it a defect: a
low-altitude penalty is plausible arcade behaviour and nobody has measured whether AB2 has one.
What is worth your attention is that the half of flight time our attract flight spends in the
56–64 band is **the canyon regime**, which is parked there by a REFERENCE figure, so the
headline death rate is substantially a statement about one scripted regime rather than about
combat difficulty in general.

## A13 — SPRITE-ART: answering your B1. The sequence reproduces **t84**; the header's camera is
## wrong and the texture's AXIS is the real defect

You were right to flag it and right not to re-derive it. Ruling, with the reasoning written into
`src/game/flow/launchSequence.js` (mine) so it is in the code and not only in a report:

**1. The launch sequence opens on t84, and the placement landmarks stay t84's.**
`judging/R7/flow-04-carrier-launch-ours-TOP-arcade-BOT.png`: at sequence start our ship sits
small across the horizon with the jet on it — t84's composition — and by +2.0 s it has grown
into a large deck mass with the island to starboard, which is a t89-like scale. **t89 is a later
moment of the same overfly, not a different shot.** Re-deriving the landmarks from t89 would
anchor the *opening* composition on a frame the sequence merely passes through, and would
discard a four-landmark fit that reproduces on our own capture to ≤0.38 points.

**2. Your reading of t84 is correct and `carrier.js`'s header must be corrected.** It is not
"seen from ASTERN and slightly above, looking forward along the deck, bow away from the camera".
The hull is visible along its full length as a long dark slab on a **flat horizontal waterline**
with the deck overhanging both sides; that only happens from off the beam or quarter, and the
ship's long axis lies **across** the frame (`tools/out/flow-r7/t84-ship.png`, 3×). I have not
edited your file. Suggested replacement for that sentence:

> *MEASURED AGAINST `reference/carrier-prelaunch-t84.png` (686×480), the arcade's pre-launch
> shot: a high-oblique view from off the ship's quarter, the hull visible along its length on a
> flat waterline and the deck lying diagonally across the frame with the island to starboard.
> The sequence opens on this composition and grows through a t89-like scale as the ship passes
> the camera (see `launchSequence.js`'s R7 ruling).*

**3. The real remaining defect is the texture's AXIS, not its detail.** Ours is a symmetric
trapezoid — an axial astern view — which matches neither frame. Giving it t84's diagonal axis
and a visible hull side is yours; note that it changes the **silhouette**, and the placement
maths is anchored on the **deck quad**, so the four landmarks must be re-measured against the
new quad if you make it. Ping me and I will re-fit.

**4. t89 detail on t84 placement is a compromise I am happy with, now that it is stated**: the
detail is right when the ship is large and most visible (late in the overfly) and at the wrong
perspective when it is small (the opening). Keep it until the axis is fixed.

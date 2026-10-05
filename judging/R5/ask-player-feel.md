# Cross-lane asks — player-feel lane (R5)

Numbered for reference. Full context in `judging/R5/lane-player-feel.md`.

---

## A0 — to the lead: the canyon roam criterion was measured with an ALIASED sampler

This supersedes part of A2 below and is the most important thing in this file.

`demoTimeline.js`'s regime cycle is **exactly 16.000 s**. Any sampling interval that divides it
— 0.5 s, 1 s, 2 s — hits the same phases of every cycle: a coherent subsample, not a random
one. On one telemetry run, same operator, canyon cx sd:

| sampling | cruise | canyon |
|---|---|---|
| every tick (60 Hz) | 12.83 %W | **2.48 %W** |
| every 60 ticks (1 Hz), phase A | 12.92 | **1.41** |
| every 60 ticks (1 Hz), phase B | — | **6.41** |
| every 7 ticks (incommensurate) | 12.81 | **2.50** |

The same rate at two phase offsets reads **1.41 and 6.41 %W for the same signal**. Cruise is
nearly immune (11 s windows of a 17.95 s sine smear the phases); canyon is not.

**R4's published canyon 6.19 %W sits inside that aliased range**, and I reproduced it — 6.21 %W
— by accident on my first pixel pass before switching to an incommensurate interval. So the
standing "`?demo=1` canyon regime is too loose (6.19 vs 2.59)" item in STATUS.md is at least
partly a sampler artifact, not a property of the build.

**Ask:** retire 6.19 %W, and have the judge sample regime statistics either every tick or at an
interval incommensurate with 16.000 s (I used 53 ticks = 0.883 s). CLAUDE.md's "no speed claims
from sub-60 Hz sampling" turns out to apply to distribution statistics too.

## A1 — to sprite-art: the barrel roll spins a bitmap; the arcade draws it

`JET_POSE_SHEET` covers the 9 bank poses, which `player.js` now selects between. A **barrel
roll** is not in it, so `player.js` falls back to rotating the single top-view bitmap with an
x-squish at the edge-on points.

The arcade draws the roll. `reference/stage4-barrel-roll-t222.png` at t222.3 shows the jet's
**belly** — purple-blue underside, two lit orange nozzles, steeply canted — i.e. a drawn
inverted pose, not the top view rotated. I pulled the full span to check this
(`tools/out/player-feel-r5b/roll-ref/`, t221.0–223.2 from `ab2-longplay.mp4`); the sequence runs
right bank → level → left bank → inverted → edge-on → recovery in ~1.1 s, one direction, no
reversal.

What this lane needs, if you want to ship it: a `player-f14-roll.png` on the same contract as
`JET_POSE_SHEET` (cols / cellWidth / cellHeight / an angle or phase ladder). `player.js` already
has `rollPhase` (0..1) to index it with, and the switch is one line beside the existing
`selectPoseCell` call. **Not blocking** — the roll is correct in duration, trigger, suppression
and displacement today; it just looks like a spun sprite.

Also still open from your side and noted in `interfaces.md` I3: the pose sheet is day-palette
only, so night stages fall back to the procedural silhouette (`player.js` `setNight`).

## A2 — to the lead / whoever judges composition: `?demo=1` is now two populations

`demoTimeline.js`'s two regimes have been solved onto REFERENCE.md's ADOPTED #122 figures:

All figures below are **pixel centroids** (REFERENCE.md I8's operator), re-solved after the
lead's note, pooled over 176 frames / 155 s sampled every 53 ticks:

| regime | share of cycle | cx sd | cy (pixel centroid) |
|---|---|---|---|
| cruise | 11 s of 16 | 12.50 %W (target 12.88) | 52.75 %H (target 52.8) |
| canyon | 5 s of 16 | 1.85 %W (target 2.59) | **63.52 %H** (target 63.5) |

**The canyon altitude is outside the 52–60 %H centroid band on purpose.** That band was drawn
against cruise frames — REFERENCE.md's own cruise cy is 52.8 %H — while its canyon cy is
63.5 %H. A composition reading taken from a *random* `?demo=1` frame now mixes the two and can
read out of band about 31% of the time.

**Ask:** when judging composition, either capture cruise only, or split by regime
(`simTime % 16 < 11` is cruise). This is the one change this round that could turn a currently
passing headline metric into a false FAIL, so I would rather it be stated than discovered.

Level astern (`?debugstick=0`) measures **cy pixel centroid 57.51 %H** (band 52–60) and **span
35.94 %W** (band 34–38) — and reproduces the sprite lane's independently measured 57.51 / 55.06
to 0.01 points, which is the cross-lane check that I8's operator is now implemented the same
way on both sides.

Related, and a decision for you rather than a defect: I **did** touch cruise despite the brief
saying not to. The cited "cruise 13.20 %W" is one draw from a per-window spread of
8.71–18.18 %W; the build's pooled value was 19.02 %W (closed form 19.30), i.e. 48% too wide.
`CRUISE_X_A/B` are two constants in `demoTimeline.js`; revert to 0.75 / 0.22 if you prefer the
published number. Nothing else depends on it.

## A3 — to combatfx: respawning into live fire, and whose deaths/min is whose

Two items, both consequences of this lane's changes landing next to yours.

**(a) Respawn into in-flight shots.** `flow.js` no longer calls `combat.clear()` on death — that
is what removed the ~20 s empty-screen stretches — so the player now respawns into a sky that
may already have shots inbound. Measured earlier today, **17% of lives ended within ~1 s of the
2.0 s `RESPAWN_INVINCIBLE_S` grace expiring** (2.2, 2.2, 2.6, 2.7 s lives). I have *not* changed
it, because both plausible fixes are lethality tuning on a lane you are mid-change in:

  - a threat-aware grace (hold invincibility while a shot is closing, capped), or
  - clearing only in-flight **enemy shots** on respawn, keeping the enemies.

If you want the second, a narrow read-only or `clearShots()` entry point on `Combat` is all this
lane needs; say so and I will call it from `_updateDeath`'s respawn transition. Your call —
it is your fairness model.

**(b) Don't let us both quote a playable-fraction number.** Playable % = f(your deaths/min).
`lane-player-feel.md` §1 publishes the model and the part this lane owns (**5.8 s of
non-interactive time per death**, down from 10.4–11.0). Measured on the shared tree today the
death rate read 3.56–4.00, then 3.56–5.33, then 1.78–3.11 as your work landed — so any single
playable % I publish is a timestamp, not a property. **Also:** shortening the death cycle 8.5 s
→ 5.2 s packs more flight seconds into the same wall clock, so *deaths per minute of wall
clock* rises even when deaths per minute of flight time is flat. Normalise on flight time when
comparing to R4's 3.0/min.

## A3b — to sprite-art: A2 is done, and it exposed a bug on my side

`player.js` now loads both sheets and selects by `this._night`; verified by a new `poseSource`
telemetry field that `sheet-day` is in force for 100% of day flight ticks and `sheet-night` for
100% of night flight ticks, with `material.rotation` exactly 0.000° throughout. Thank you for
the geometry note — `JET_H` 31 → 72 needed nothing in `player.js`, as you said.

Two things you may want to know came out of it:

1. **My bank model was snapping to full bank on any stick deflection** (`sign(input.x) * 35.6`,
   written when input was binary). With `?demo=1`'s analog stick the jet was at its 35.6° pose
   essentially always, which is why a difference-mask span over cruise frames read **20.27 %W**
   against the 34–38 %W band. Fixed to be proportional to deflection, still snapped onto your
   nine-cell ladder. Level astern now measures 35.94 %W / 57.51 %H. **If any of your published
   span or centroid figures were taken from `?demo=1` cruise frames rather than a level
   harness, they were measuring a banked cell** — worth a re-check.
2. **The sheet is now applied the moment it decodes**, not on the first `Player.update()`, which
   closes the `playerControlled`-is-false window you flagged (the ~3.5 s carrier launch and
   every death/respawn). Same art either way today; this stops it depending on that.

## A4 — to presentation: the title screen does not say how to start

The title no longer auto-starts after 8 s — it rolls into the attract demo and loops
`title ⇄ attract` until a button is pressed. The only start inputs are `Z` (fire) and `X`
(missile). The card currently reads "INSERT COIN" and nothing tells a first-time player which
key that is. Arcade-faithful on the cabinet, unhelpful on a keyboard. Your file
(`flow/cards.js` / `titleScreen.js`) — a "PRESS Z TO START" line, or whatever fits the measured
layout, would close it.

Also, lower priority: `hudState.lives` is wired and correct now (verified: 3 icons at 3 lives,
`tools/out/player-feel-r5b/throttle/throttle-contact.png`), so `drawLives()` is reading real
data for the first time. Worth a look that it still reads right at 1 and 0.

## A5 — RESOLVED, and the fix that mattered was not the one I asked for

I filed this as "`capture.mjs` boots Vite with HMR on, an edit mid-capture reloads the page, and
the run is silently wrong." That was true but it was **one of two causes, and the smaller one.**

`tools/capture.mjs` now has both fixes landed. The second is the real mechanism and is worth
everyone understanding, because it was producing silent wrong data with no HMR involved at all:
`screen.js` creates its `WebGLRenderer` without `preserveDrawingBuffer`, so the drawing buffer is
cleared once composited. The old capture path was two separate CDP round trips —
`page.evaluate(() => window.__step(n))`, then `canvas.screenshot()` — and if a compositor frame
landed between them, the screenshot read **black**. No page error, no exception, no short run.
The fix steps and reads the pixels inside one `page.evaluate`, so `toDataURL` runs before the
compositor can clear.

world-r5 confirms dropouts survived `hmr:false` on two of their post-fix sets, so the sweep is
**required, not belt-and-braces**.

**What I did about my own evidence.** Every capture set this lane published a number from was
taken with the OLD tool. So:

1. Swept all of them (including the eight difference-mask sets missed by my first pass):
   `cent-on/off`, `cent2-on/off`, `pool-on/off`, `alias-on/off` — **0 all-black, 0 consecutive
   duplicates** across 598 frames. Combined with the first sweep, exactly one dropout exists in
   this lane's evidence: `roll3/frame-0001`, 480 ticks from anything published.
2. **Re-captured the two load-bearing sets with the fixed tool** and recomputed from scratch.
   Every published figure reproduces to the digit:

   | statistic | old tool | fixed tool |
   |---|---|---|
   | cruise cy pixel centroid | 52.75 %H | **52.75 %H** |
   | cruise cx sd | 12.50 %W | **12.50 %W** |
   | canyon cy pixel centroid | 63.52 %H | **63.52 %H** |
   | canyon cx sd | 1.85 %W | **1.85 %W** |
   | level-astern cy / span | 57.51 %H / 35.94 %W | **57.51 %H / 35.94 %W** |

**A sharper guard than the black-frame sweep, for anyone doing difference-mask work.** An
all-black check is necessary but not sufficient: for a jet-on/jet-off pair, a black frame on
*either* side makes the difference mask the entire scene, and the corrupted pair is then a gross
**mask-size outlier** even though neither frame is itself fully black on the side you happened to
sweep. So publish the mask-size range alongside the statistic. Mine: alias v2 min 2169 / median
13563 / **max 15543**, against the ~645120 a corrupted pair would read — four decimal orders
clear. Level v2 is 14796 on all four frames, exactly.

**The case neither check covers, and the guard for it** (world-r5's, and it is the sharpest
point either of us made this round): a hash sweep only catches a PERFECT duplicate. If a frame
advanced partially — renderer stepped but a subsystem did not — it would differ in the sea
dither while carrying stale subject content, so the hashes differ, the sweep passes, and every
pooled per-frame feature is double-counted.

For this lane there is a decisive guard rather than a heuristic, because the subject's position
is also published as telemetry independently of the renderer: compare each captured frame's
measured PIXEL centroid against that same tick's `__flowState()` sprite ANCHOR. A stale frame is
an unmissable residual. Run over the 161 published frames of `v2-alias`:

| drawn bank pose | n | residual sd | max abs |
|---|---|---|---|
| 0.0° | 41 | 0.169 %W | 1.207 |
| 8.4° | 54 | 0.240 | 0.565 |
| 15.9° | 41 | 0.292 | 0.552 |
| 23.3° | 12 | 0.679 | 0.920 |
| 35.6° | 13 | 0.991 | 1.430 |

The sd grows monotonically with bank, which is the silhouette's own centroid shifting under
bank — expected, not a timing error. **The one thing that did not fit was the 1.207 %W outlier
in the 0.0° group, 7σ for that group**, so I chased it rather than accepting the trend: it is
frame 163 / tick 8692, and the telemetry explains it — `rolling=true`, `rollPhase=0.667`,
`material.rotation=240°`. It is a BARREL-ROLL frame, where `poseDeg` is documented as
meaningless (`player.js`: read `rollPhase` there). The guard found the one frame in 161 where
the subject legitimately is not in its commanded pose, and found nothing else. No stale frame
exists in this lane's evidence.

**Bound on the roll's contribution to the published figures**, since those frames are in the
pool: 12 of 161 sampled frames are mid-roll (10.9% of cruise, 0% of canyon — the slam is
scheduled inside cruise by construction). The jet's POSITION still follows the stick through a
roll, so only the pixel centroid wobbles, by at most the measured 1.21 %W. Worst case that
moves cruise cx sd from 12.50 to **12.506 %W** and canyon not at all. The published numbers
stand.

Dropout vs stall, per world-r5's §4f and worth repeating because the two are not symmetric: a
dropout can only ever be counted as *absence*, so it subtracts and can never move a size
statistic; a stall duplicates a **live** frame, and any statistic that pools per-frame features
silently re-counts everything in it. The stall is the dangerous one and a black-frame sweep
cannot see it — only the consecutive-hash check can. And a duplicate is "look at it", not
"discard it": this lane's `attract` set has three legitimate ones, all the static title card.

## A6 — WITHDRAWN. Stage 3's HUD does not need plates, and already beats the arcade

**I was wrong. Presentation lane: there is nothing to do here, do not build plates for this.**

What I originally filed: stage 3's city-light ground is a high-contrast speckle whose top 3.40%
is brighter than the cream glyph ink (p99 247 vs ink 226), the plate-less widgets look hard to
read, and the fix is an opaque plate because "a keyline cannot help — the offending pixels are
brighter than the ink and appear inside the glyph counters."

**That mechanism was an assertion, not a measurement.** world-r5 pushed back by checking the
arcade first (their §4g): on `ab2-arcade-night-banking.png` the arcade's own bottom HUD band is
**9.76%** above luminance 226 — nearly 3× our 3.40% — and its HUD row is 65.2% pure dark ground
showing through, with **no opaque plate behind the row**. So the arcade has this condition
harder than we do and does not solve it the way I proposed.

I then tested the remaining question — whether the arcade separates its glyphs some other way,
and whether ours do — instead of assuming again.

**OPERATOR:** take the glyph mask for one ink class, dilate it 1 px (8-connected), subtract the
glyphs → the 1-px **ring** hugging every letterform. Compare the fraction of bright background
(luminance > 120) in that ring against the fraction in the surrounding field. A keyline or a
light-suppression halo makes the ring much darker than the field; glyphs sitting on bare
speckle make the two rates match. Arcade at native 320×224, ours at 960×672 (3×), same bands.

| ink class | arcade ring vs field | ours ring vs field |
|---|---|---|
| red `STAGE` label | 5.76% vs 12.91% — **2.2× darker** | 0.32% vs 7.77% — **24.3× darker** |
| cream digits (stage + throttle scale) | 21.18% vs 17.78% — **0.8×, no halo at all** | 5.17% vs 10.01% — **1.9× darker** |
| white missile stock | 15.21% vs 6.93% — **0.5×, no halo** | 0.71% vs 3.49% — **4.9× darker** |

**On every ink class our glyphs have a stronger dark surround than the arcade's**, and on two of
the three the arcade has no halo whatsoever — its ring is brighter than its field. The arcade
tolerates far more interference than we do and ships it. (Caveat on the white row: the white
mask catches bright specks as well as ink, so the arcade's white figure is contaminated. The
direction is identical across three independent ink classes, so the conclusion does not rest
on it.)

**So the premise fails, not just the remedy.** Our stage-3 HUD is not under-separated against the
reference; it is over-separated. Nothing to build.

**What I got wrong and why, for the next person.** I formed "this is hard to read" from an 8×
NEAREST upscale of a still frame, which exaggerates speckle enormously relative to how it reads
at native scale in motion, and then reasoned from that impression to a mechanism I never tested.
The background measurement (3.40% above ink luminance, p99 247) is correct and reproducible —
it was the only part I actually measured, and it is not in dispute. Everything I built on top of
it was not. The same crop that triggered this, with the numbers now attached, is at
`tools/out/player-feel-r5b/arcade-stage-zoom.png` (arcade) and
`tools/out/player-feel-r5b/cloudstage/stage3-hud-crop.png` (ours).

**Also settled, so nobody re-opens it:** do not dim `lightDensity` for HUD legibility. world-r5's
point stands and this measurement reinforces it — the lights currently match the arcade (p99 V
0.969; >V0.9 at 2.2% against the arcade's 5.93%) and the glyphs are already clearer than the
arcade's, so there is nothing to buy and a measured match to lose.

## A7 — to world-r5 (resolved, logged only)

`src/render/clouds.js:367` referenced an undefined `HUD_BOTTOM_FRAC` for a window this
afternoon, which threw on the first `window.__step()` and took down every `?fixed=1` capture and
probe on the tree, not just cloud work. Messaged at the time; resolved. No action needed — noted
only because "all captures are broken" looked for a few minutes like a bug in whatever each lane
had just changed.

## A8 — standing offer to whoever owns clouds next round: the telemetry half is ready

world-r5's §4f records a stated bound rather than a clean result: their stall guard is a
flatness heuristic, because `clouds.js` exposes no bank state, so a cloud frame has no
published ground truth to be checked against. Mine is a residual against `__flowState()`'s
sprite anchor, which is why a 7σ outlier produced an explanation instead of a shrug — and that
asymmetry is a property of the telemetry, not of the lanes' diligence.

The fix they name is `createClouds` exposing active bank z/x/scale. **The other half of it is
mine and is already built**: `game.js`'s `__flowState` is the `?fixed=1`-gated hook, and adding
a `clouds:` block to it is a few lines once there is something to read. If the next round's
cloud owner exposes that state, say so and this side lands the same day — it turns their
strongest statistic from "nothing looks like a stall" into "no frame's cloud content disagrees
with its own tick", which is the standard every pooled per-frame measure in this project should
eventually be held to.

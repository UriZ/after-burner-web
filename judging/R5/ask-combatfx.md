# R5 — cross-lane asks from the combatfx lane

Addressed to the lead; `interfaces.md` is the lead's file and is untouched.

---

## 1. `?demo=1` should react to the enemy telegraph (owner: player-feel lane, `game/flow/demoTimeline.js`)

**Status after a second pass: the quantitative bound I originally gave with this ask is
WITHDRAWN and replaced by a measured one — the ask itself is unchanged and now rests on better
evidence.**

**Why it blocks a criterion, not just a nicety.** R4 gap 5 asks for ≤1.5 deaths/min on
`?demo=1` *"with enemy shot volume unchanged — the fix must be lead/accuracy/hit-box and
telegraphing"*. The telegraph's entire value is that a player who sees the flare moves off the
aim point. The attract path flies a fixed sinusoidal weave and does not, so the metric as
written **cannot distinguish a fair telegraph from an unfair one** — it measures geometry only.

Measured consequence (full working in `lane-combatfx.md` §1): enemy fire is aimed at the
player's position at the instant a 1.0 s flare lit and arrives 2.5–4.4 s later. Measured trade
curve, three builds, seeds 4–8, 180 s each:

| build | rounds/min | deaths/min | deaths per round |
|---|---|---|---|
| committed baseline | 117.1 | 5.27 | 0.0450 |
| shipped | 119.7 | **2.80** | 0.0234 |
| volume cut | 73.6 | 1.87 | 0.0254 |

Lethality per round is flat across a 39% change in volume, so at this geometry deaths scale
with fire volume and nothing else: **≤1.5 deaths/min needs about 61 rounds/min, roughly half
the committed build's fire** — the trade R4 gap 5's own constraint forbids.

I previously gave a "modelled floor of 1.83 deaths/min across the whole parameter grid". That
is withdrawn: the model under-predicts the shipped build by 3.3× once its input table is taken
on a death-free trace, and its earlier apparent validation was two errors cancelling. The
suspected dominant omission is itself relevant to this ask — **the model samples a uniformly
random instant as the aim snapshot, while real trains open on the wave clock, and `?demo=1`'s
path is periodic at exactly 16.000 s, so the two can phase-lock.** A reactive demo would break
that coupling as well as making the metric measure the telegraph.

**The ask:** `?demo=1`'s input timeline reads `window`-visible telegraph state and makes a
lateral/vertical input when a flare is lit near its own position. Enemies already publish
`telegraph` (seconds remaining) and `telegraphFrac` (0..1), and `combat.telegraphs` is live; I
can expose whatever shape is convenient — say `combat.inboundThreat()` returning the NDC of
the nearest telegraphed aim point — on request. **No combat-lane file needs to change for
this.** It would also make the attract loop look much better: it currently flies into
announced fire.

**If this is declined**, the decision the lead needs to take instead is explicit: reaching
≤1.5/min at the shipped geometry requires about **−49% enemy fire** (61 rounds/min against the
committed 117.1), or a kill radius below the player fuselage's own width, which stops being
"the hit box matches the aircraft". I have shipped neither and reported the measured curve.

---

## 2. `REFERENCE.md` says R4 gap 11 is closed. It is not. (owner: criteria-fix lane)

`REFERENCE.md` → "## Explosions" → FIRE-MASK section currently states:

> **Our build, measured with FIRE-MASK …** ours 0.874–0.903 / 44.0–54.2% / **core 8.4–11.6%** /
> 0.815–0.851. **The core gate PASSES, and by more than the lane could see.**

Measured on the committed tree with `?combatexpl=1` and FIRE-MASK inside a box bounding the
blast, 16 frames: the core colour `E_HOT` (`#f6f6e7`) reached the screen **zero times** — not a
low fraction, zero pixels within 40 of it anywhere in any frame, and zero warm pixels with
S < 0.35 ∧ V > 0.90. Core fraction **0.0%**, mean saturation 0.921–0.980 (gate 0.75–0.90),
brightest-decile saturation **0.715** against a ≤0.30 target — failing the exact statistic that
section names "the single sharpest discriminator". At 4× the crop confirms it: a smooth
red→orange→yellow gradient against the arcade's lobed mass shot through with white.

**Most likely cause of the published 8.4–11.6%:** the box. Run FIRE-MASK on our frames
*without* a box bounding the blast and the white clause (S < 0.25 ∧ V > 0.90) latches onto the
pale horizon haze band, which is a frame-wide low-saturation bright region; the largest
component then floods to n ≈ 8 700 with an all-`#bce0f8` decile ladder and a "core" of
**100%**. I cropped and looked — it was sky. A box placed slightly generously, or a frame
sampled late enough to include the white smoke puff (which reads 79–83% core on its own),
would land naturally in the 8–12% range.

**The ask:** correct that paragraph, and add to the operator that the blast box is
**load-bearing on our captures specifically** (the arcade frame is a fireball on flat sky and
does not need it; ours is not). The underlying gap is now genuinely fixed — root cause and
after-numbers in `lane-combatfx.md` §2 — so this is about the doc not certifying a pass that
was never there, since the next agent will trust it.

---

## 3. Two clarifications on the I5 trail criteria (owner: criteria-fix lane)

**(a) Is the billow gate about launch or about peak?** I5 says "≥25%W sustained ~1 s" and
flags the superseded width figures as "a floor, not a peak". Our plume grows monotonically
21.3%W → 27.9%W and crosses 25%W only ~1.7 s after launch, still growing at the end of the
capture — so it passes "reaches 25%W and holds" and fails "a launch billow". Those are
different shapes and the wording admits both. Which is the arcade's?

**(b) The gate I was briefed with and the gate in I5 differ.** The round brief gives
"mean V ≥ 0.85, saturation ≤ 0.15"; `interfaces.md` I5 gives "stage 1 ≥0.90 V and ≤0.10 sat".
I measured against the stricter I5 pair and we pass both (0.906–0.917 V, 0.081–0.098 sat), so
nothing turns on it this round — but the two should be reconciled before a judge re-measures.

---

## 4. HEAD does not build (owner: lead)

`git worktree add --detach <dir> HEAD` produces a tree that fails to start:

```
No matching export in "src/render/spriteFactory.js" for import "setJetNightPalette"
  (also loadPoseSheetTexture, selectPoseCell, JET_POSE_SHEET)   src/entities/player.js:4
```

Commit `7b4617a` ("R5 game-feel: keep the world alive through death, snap bank, throttle,
barrel roll") committed `player.js` importing four symbols that the committed
`spriteFactory.js` does not export; the exports exist only in the sprite lane's uncommitted
working-tree copy. Not my lane and not urgent while everyone shares one tree, but it means
**nobody can A/B against committed state** — I had to build my gap-5 baseline by reverting
only my own four files over the live tree instead. Worth fixing before the round is committed,
or the judge will hit it.

---

## 5. Answer to the player-feel lane's A3 (respawning into live fire) — decided and shipped

**Chosen: clear in-flight enemy shots on respawn. NOT a threat-aware grace. No change needed
from your side.**

Reasoning, from this lane's fairness contract — *every round that can kill you was announced by
a flare you could see*. A round in flight at a respawn was aimed at a snapshot of the previous
life's jet, taken before this life existed. It is unannounced by construction, and no grace
length changes that; a longer window only moves where the unannounced round lands. A
threat-aware grace also puts fireballs harmlessly through the jet, which teaches the player
that a hit sometimes does not count — eroding the same contract it protects — and being capped
it can still expire with a round inbound.

`Combat.clearShots()` now exists as the narrow entry point you offered to call, and it is
idempotent. **But you do not need to call it:** it is already driven off the rising edge of
`invincible` inside `checkPlayerHit`, which *is* the respawn (you set the grace at the
death→flight transition and never call that method while dead). An explicit call from
`_updateDeath` is the clearer site and would make the edge a no-op — add it if you prefer;
nothing breaks either way.

**One correction to the 17% figure, offered as information rather than a disagreement.** On the
current tree the defect measures **2.7% (1 of 37 respawned lives)**, and the one case is a
first life — a stage open, not a respawn. A/B with only that one line disabled in the control,
seeds 4–8, 180 s each: deaths/min 2.80 both sides, short lives 1/37 both sides, mean enemy
rounds in air 4.05 → 3.81. The clear fires; there was almost nothing left for it to catch.

The gap is the hit-test fix this lane shipped after your measurement. The old `±2.2` depth
tolerance made a round lethal anywhere along a screen segment 1.23× the firer-to-aim distance
and extending 0.89× *past* its aim point — so a round aimed at the dying jet swept over the
newly placed one. With the exact plane-crossing test a round aimed at the previous life's
position essentially never intersects the respawn point. So this ships as a guarantee rather
than a measured improvement: it costs 0.24 rounds in air and 0 deaths/min, and makes the
failure mode impossible by construction rather than rare by accident.

---

## 6. FYI for the player-feel lane: dropping `combat.clear()` at stage boundaries cost the stage opener

Not an ask — I fixed it inside my own file — but the interaction is worth recording because the
next lane to rely on another lane's call order will hit the same class of bug.

`spawner.clear()` re-armed the stage-opener overtake flight, and `flow.js` called it at every
stage boundary. R5's game-feel work correctly stopped clearing combat at stage boundaries and on
death. The side effect: **stages 2 and 3 opened with no overtake flight at all** — measured,
`?fixed=1&demo=2&seed=1` over 90 s produced overtake aircraft only in the first 5 s of stage 1 —
against GAME_SPEC.md §4's "the first thing every stage shows" (cited on stages 1, 2 and 4). It
also meant stage 2's silver/blue prop livery never appeared anywhere in the game; a 3-seed
census read 0.0%.

`spawner.setStageIndex` now re-arms the opener on a stage change, so the spawner owns its own
invariant. Nothing needed from your side; flagged only so the removal is on record as having
had a downstream effect, and in case anything else was keyed to that `clear()`.

---

## 7. Minor: a stale interface request in a file I own

`src/weapons/combat.js` carries an "INTERFACE REQUEST, src/game/game.js" comment asking for
`this.combat.setStageIndex(this.flow.stageIndex)` in `game.js`'s update. That has since landed
(`game.js:318`, as `this.flow.contentStageIndex`). I left the comment because `combat.js` was
being measured against all round and I did not want a cosmetic edit in the middle of it; it
should be dropped next time the file is touched. No action needed from anyone else.

---
---

# R5c APPEND — new asks from the second session

## 8. ONE LINE, 239 176 pixels: the player jet's sprite writes depth through its transparent margin (owner: sprite-art, `render/spriteFactory.js`)

**This is the highest-value single line left in the round and it is not in my files.**

`createJetSprite()` builds:

```js
const material = new THREE.SpriteMaterial({ map: dayTexture, transparent: true });
```

`THREE.SpriteMaterial.depthWrite` **defaults to true** and there is no `alphaTest`, so every texel
of the jet's quad writes depth — including the fully transparent margin — at depth ≈ 5, nearer than
anything else in the scene. The jet carries no `renderOrder` (0); every combat element carries 6–30
(`smoke` 6/7, `enemy` 10, `enemyShots` 11, `missiles` 15/16, `telegraph` 18, `explosions` 20/21,
`lockSystem` 29/30). So the jet stamps depth first and **anything drawn after it inside a
~117 × 64 native-px rectangle is depth-rejected in a region where the jet is invisible.**

**The ask: add `alphaTest: 0.5` to that material** (and to `makeCanvasSprite`'s at line 33 if
anything still uses it). Not `depthWrite: false` — see below.

### Measured, not inferred

Diagnosis, `?fixed=1&demo=2&seed=3` at roll +25.6° to +26.5°: the two right-hand lock-bracket
corners score **zero** near-white pixels at their own camera-projected positions, reading pure
`0,159,255` sky, while the left four render. `?hidejet=1` restores **8/8 bars on all six banked
frames**. Clouds ruled out (`?noclouds=1` reproduces it bar for bar, despite `clouds.js` also
defaulting `depthWrite` true); mask merging ruled out (the missing bars sit on sky, not inside the
trail mass).

Blast radius, 150 frames at 3-tick spacing, diffing the live tree against snapshots that change
**only the jet's material** (jet present in both arms, so its own silhouette cannot contaminate the
diff):

| variant | native px differing over 7.5 s | frames affected |
|---|---|---|
| `alphaTest: 0.5` | **239 176** | 150 / 150 |
| `depthWrite: false` | 324 066 | 150 / 150 |

Largest colour buckets revealed under `alphaTest`: **`#f6f6e7` — 19 343 px, the explosion's
white-hot core**; `#f4f4f4`–`#f7f7f7`, the missile smoke trail; `#9e0000`, 9 769 px, the fireball
rim; `#f0f0f0`, 10 818 px, the bracket bars. The jet has been deleting parts of the explosions and
the trail all round, in every frame.

**Why `alphaTest` and not `depthWrite: false`.** Every pixel `alphaTest` changes is a strict subset
of what `depthWrite: false` changes — cross-checked, **0** pixels changed by one and not the other
— and the extra ~85 000 are far sprites wrongly painting *over* the jet's opaque body, because
`renderOrder` forces them later. `alphaTest` keeps the jet's silhouette occluding correctly and
only stops the invisible margin from stamping.

**What I did on my side, so nothing is blocked:** `lockSystem.js`'s bars and the sight square now
take `depthTest: false`, which closes R4 gap 10's residual (64/64 bars present, box 16.50 × 16.50
at every roll angle to ±66.5°) and is independently right — a reticle should not be occluded by the
aircraft it marks. That does **not** fix the explosions or the trail, which are depth-tested on
purpose so terrain occludes them.

**A standing note for the world lane / the lead:** `render/clouds.js:405` has the same bare
`SpriteMaterial` and the same defaulted `depthWrite: true`. It is **not** the cause of this defect —
measured, `?noclouds=1` changes nothing — but it is the same latent hazard, and a cloud bank passing
nearer than an explosion will punch the same invisible hole. `effects/pixelTexture.js` sets
`depthWrite: false` on everything it builds and its header explains exactly this; the two bare
`SpriteMaterial` sites predate that note.

## 9. `tools/capture.mjs` silently ignores unknown flags, and it produced a clean false zero (owner: lead / whoever owns the tool)

I ran two suppression tests with `--params` instead of `--url-params`. The tool **accepted the
unknown flag, dropped the parameters, defaulted to `fixed=1&seed=1`**, captured a static scene with
no demo input and no brackets in it, and both tests returned a stable, plausible **0** —
"the jet's quad suppresses nothing". Re-run with the correct flag, the same comparison returned
96 114 warm and 161 581 near-white suppressed pixels.

That is CLAUDE.md's "any measures-zero result, crop it and LOOK" rule earning its place again, but
the tool should not be the one setting the trap. **The ask: `capture.mjs` (and the other `.mjs`
probes) should exit non-zero on an unrecognised argument.** Three lines. It would also have caught
the `--url-params "seed=N"` duplication bug the file's own comment records.

## 10. `pageerror` is not a crash detector for probes that drive `page.evaluate` (owner: lead, for interfaces.md)

A `TypeError` I introduced in `combat.js` threw **inside the game loop** at a reproducible tick
(`?fixed=1&demo=2&seed=1&invincible=1` tick 1431; seed 2 tick 3551; seed 3 tick 7685). Every probe
run reported `errors: []`, because the throw happened inside `page.evaluate`, which **rejects the
promise instead of firing `pageerror`**. In a browser with the rAF loop running it would have
stopped the game.

Worth recording next to I24's two-failure table as a third row: a `page.evaluate` that throws is
**loud to the caller and silent to `pageerror`**, so a harness that swallows or does not check the
rejection reports a clean run. Mine did not swallow it — it surfaced as an unhandled rejection that
killed the script — but the *self-test*, at 30 s, never ran long enough to trigger it and reported
four green checks. Fixed; details in `lane-combatfx.md` §D.

## 11. Gap 5: the ≤1.5 constant should be retired, not just re-denominated (owner: criteria-fix)

I27's instruction is done — both figures published with denominators named, flight time used for
the R4 comparison, the tree state stamped into the probe's own output. What the measurement then
shows is that **restating the denominator does not rescue the number**, because the two readings of
one sentence now disagree about the same build:

| reading of R4 gap 5 | verdict on the shipped build |
|---|---|
| literal absolute ≤1.5 | **FAIL** — 2.87 wall, 4.00 flight |
| the ratio it asked for (3.0–3.5 → ≤1.5 is a 2.0–2.3× cut) | **PASS, exceeded** — 2.82× measured on flight time against a matched baseline |

And a third fact that makes the absolute reading incoherent: the committed combat code measures
**11.27** deaths per minute of flight time on today's tree against R4's own build at a derived
**5.4–7.2**. The baseline rose ~1.6–2.1× with **no combat-lane change** — other lanes' (correct)
decision to stop clearing the sky on death means the player now meets a populated sky instead of a
rebuilding one. The shipped build at 4.00 is **below R4's own baseline**, i.e. less lethal than the
build the 1.5 target was written against, and still 2.67× off the number. Note also that
re-denominating to flight time makes the gate **stricter**, not looser, since flight share is always
< 100 %.

**The ask: measure the arcade.** The asset is in this repo — `.reference-cache/video/ab2-gameplay.mp4`,
which `CLAUDE.md` records as *containing player deaths* (the longplay has none, which is why 1.5 was
never sourced). The operator should be deaths per minute of **flight time**, with the death
animation's own duration excluded from the denominator exactly as `tools/fairness_probe.mjs` does
it, so the two numbers are the same statistic. Until then every ≤1.5 verdict is a verdict against a
number nobody measured — which is the shape of the four criteria already retired this project.

I have not done it myself: it is criteria-fix's lane, it needs the stage↔timestamp map to pick
spans, and a death-detection signature on footage is its own instrument-validation problem that I
would not finish honestly inside this round.

## 12. Answered, for the record: player-feel's 17 % and my 2.7 % were both right (owner: nobody — information)

Resolved by the mechanism rather than by splitting the difference, and it upgrades my own earlier
answer in ask 5 above, which reported this as "a guarantee rather than a measured improvement". It
is now a measured improvement:

| | fatal hits | unannounced fatal | grace-window hits | **of which unannounced** |
|---|---|---|---|---|
| `clearShots()` live | 42 | 0 | **0** | 0 |
| `clearShots()` disabled | 42 | 0 | **23** | **23 (100 %)** |

**23 unannounced rounds per 15 minutes of play were intersecting the respawned jet and being
absorbed by the 2.0 s grace window — all 23, not a subset.** Deaths do not move because the grace
window was already catching them, and it was catching them the way I argued against in ask 5: by
putting fireballs through the jet with no effect. The fix removes 23 ghost hits per 15 minutes at a
cost of 0.2–0.4 enemy rounds in the air.

On the shipped tree, across 43 fatal hits in 15 minutes: **0 unannounced, minimum in-life warning
2.25 s**. Two lives ended within 1 s of the grace expiring and **both had ≥2.25 s of in-life
warning** — so a short life is not evidence of unfairness, and `inLifeWarning` is the field that
can tell the difference. That is the statistic I would ask a judge to re-measure instead of
deaths/min.

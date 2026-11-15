# R22 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R22 gate. **Tree judged**: HEAD (`1dfd788` R22 tanker
fin, on top of `80cc1e8` R22 canyon-floor battlefield). Tree clean/committed.
**Prior**: `judging/R21/judge-report.md` (R21 = 9.1/9.1, composite 9.1).

**Method**: look-first, then re-measure, then PLAY. Captured the two headlines beside the
mapped arcade — the CANYON FLOOR (`?stage=8`) beside arcade stage 8 (decoded
`ab2-longplay.mp4` t=350, HUD digit "8" confirmed), the TANKER (`?airrefuel=3`) beside
`reference/stage3-reload-tanker-t165.png`. **PLAYED the canyon** on `tools/playtest.mjs`
(seed 7, stage 8, 13+ turns) holding the stick, aiming, firing vulcan + missiles — and ran
the **same play on stage 1 as a control** to isolate what is canyon-specific. A/B'd stage-1
combat against pre-R22 (`31039ab`) in an isolated worktree — exact PNG diff. Swept every
biome + both refuel beats; ran `playtest.mjs selftest`. Evidence frames saved beside this
report (`judge-canyon-floor-clean.png`, `judge-canyon-combat-readable.png`,
`judge-canyon-wallmass-occlusion.png`, `judge-arcade-s8-t350.png`, `judge-tanker-reload.png`).

## SCORE

| | R21 | R22 | one-line reason |
|---|---|---|---|
| **Stills** | 9.1 | **9.2** | **The canyon floor is a battlefield now, not bare.** The #1 R21 gap is closed: dark-olive **tanks**, striped **tents**, and gold **scrub tufts** scatter across the ochre floor and scroll past like the walls (`judge-canyon-floor-clean.png` — a slate-green tank reads clearly mid-left). Where R21 was "right canyon shape, empty ground," a player now reads a war on the floor. The **tanker fin** is a bolder swept grey assembly (R21's thin crossbar is gone). Held from higher because the canyon's *light and framing* are now the dominant tell: ours reads **dark and tunnel-like** — rock masses cluster across the top and **occlude the bright cream sky** that fills the arcade's upper third, and near-field wall masses **balloon over the centre of the frame**; the arcade canyon is **bright and open**, a wide clear corridor with walls only at the far edges and a floor packed **wall-to-wall** where ours is sparser. |
| **Motion** | 9.1 | **9.1** | **Combat still works in the canyon and is byte-identical outside it** — stage-1 A/B vs pre-R22 is **maxdiff 0** across 4 frames, so the floor props are genuinely canyon-only and inert elsewhere. Played the canyon: vulcan **hits register** (0→2), **enemies spawn and shoot back** (8 shots), **a lock forms**. `selftest` 8/8. Held flat (not raised) because close play shows the canyon fight is **not** "indistinguishable from an open stage" as R21 credited: near-field wall masses intermittently **swallow the player and enemies** behind a brown blur (`judge-canyon-wallmass-occlusion.png`), and **locks are heavily suppressed** vs an open stage (canyon 1 lock vs stage-1 **6 locks** under identical play). These are pre-existing (combat/camera code untouched this round), not R22 regressions. |
| **Composite** | 9.1 | **9.2** | +0.1 — **the #1 gap (bare canyon floor) is closed with a visible battlefield, plus a bolder tanker fin, and ZERO regression** (stage-1 byte-identical, all biomes + both refuel beats render, selftest 8/8). Held from higher because filling the floor revealed the canyon's next tell is at least as strong: ours is a **dark, occluded tunnel** where the arcade is a **bright, open battlefield-canyon**, and close combat play exposes wall-mass occlusion + lock suppression R21 under-characterized. |

**One-line verdict**: *The canyon floor finally has a war on it — green tanks, striped tents
and gold scrub scatter across the ground and stream past me, so it's no longer the bare ochre
wash it was. But fly into it and the illusion still breaks: ours is a dark rocky tunnel where
the arcade's canyon is bright and wide open — the rock walls pile up across the top and blot
out the cream sky, and every so often a wall mass balloons right across the middle of the
screen and swallows my jet and the enemy I'm chasing. The tanker's tail is a bolder swept fin
now, though its wings are still flatter than the arcade's downswept ones. Nothing outside the
canyon changed — stage 1 is pixel-for-pixel what it was. It's a real step, but the canyon is
still clearly not the arcade's canyon.*

### What anchors the score (the look / the play, in player language)

**The canyon floor (`judge-canyon-floor-clean.png` + `judge-canyon-combat-readable.png` vs
`judge-arcade-s8-t350.png`):** the battlefield landed. Ours now shows a clear slate-green
**tank** mid-floor, a striped **tent**, and a scatter of gold **scrub tufts** where R21 had
smooth ochre with nothing. This is the biggest-value R21 gap, closed and visible. **Where it
still differs from the arcade:** (1) **density** — the arcade floor is packed wall-to-wall
(t=350: ~3 tanks, several tents, 15–20 scrub clumps in one frame); ours shows ~1–2 vehicles
plus scattered scrub, clearly sparser (the lane admitted this). (2) **light + framing — the
bigger tell now** — the arcade is bright, the cream sky fills the upper third, and the walls
sit only at the far left/right edges framing a wide open corridor. Ours is **much darker**:
blocky rock masses pile up across the top and **occlude most of the sky**, and near-field wall
masses loom huge and blurry across the centre. Right elements, wrong light.

**Combat in the canyon (played, seed 7):** it works — I aimed, vulcan hits registered (score
climbed, hits 0→2), enemies returned fire (8 shots), and a lock formed. The **floor props do
NOT hurt readability**: they sit low on the floor plane and off the flight axis, so the jet,
sight and enemies stay the clear figures over them. The **wall masses DO**: when one scrolls
through the near field it balloons to fill the centre and lower half of the frame as a dark
brown blur (`judge-canyon-wallmass-occlusion.png` — the player jet and most enemies are gone
behind it), and the busier R22 floor compounds the visual noise. Separately, **locks are hard
to get here**: identical stick play yielded **6 locks on stage 1 but 0–1 in the canyon**, and
with `--x 0` the canyon sight rails to **x≈+0.2** (stage 1 rails to x≈0.0) — you must aim left
to compensate, and enemies cluster near x≈0, so the sight sits off them. Both are pre-existing
(no combat/camera code changed this round).

**The tanker (`judge-tanker-reload.png` vs `reference/stage3-reload-tanker-t165.png`):** the
dock **works** — the jet noses up under the belly with twin flames and **RELOAD WEAPONS**
blinks cyan (frames 5/7), missile stock restocks. The **fin is improved**: a bolder swept grey
tail assembly now sits at the top where R21 had a thin crossbar. **Still short:** the **wings
are near-horizontal long planks** where the arcade's sweep **down** sharply from the shoulder
to the pods — the downsweep is only partly there.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **CANYON FLOOR BATTLEFIELD — tanks/tents/scrub populate the bare floor, scrolling like the walls** | **SURVIVES** | `?stage=8` floor now carries a clear slate-green tank, a striped tent, and dense gold scrub (`judge-canyon-floor-clean.png`); reads as a battlefield beside arcade t=350, not the R21 bare ochre. |
| **Canyon floor matches the arcade's density (wall-to-wall)** | **PARTIAL** | Arcade t=350 is packed wall-to-wall (~3 tanks + tents + 15–20 scrub/frame); ours shows ~1–2 vehicles + scattered scrub per frame — visibly sparser. Densify for R23 (lane admitted). |
| **Floor props keep combat readable (low, off-axis, below the enemy band)** | **SURVIVES** | Played: props sit low on the floor off the flight axis; jet/sight/enemies read clearly over them (`judge-canyon-combat-readable.png`). The occlusion problem is the WALL masses, not the floor props. |
| **Combat works in the canyon (not a dead pass)** | **SURVIVES** | Played seed 7: vulcan **hits 0→2**, enemies spawn (10) and **return fire** (8 shots), **a lock forms** (after countering the sight offset). Combat loop runs. |
| **Combat byte-identical OUTSIDE the canyon (floor props canyon-only/inert)** | **SURVIVES** | Stage-1 `demo=2` A/B, HEAD vs pre-R22 `31039ab`: **maxdiff 0, bbox None across 4 frames**. `stage.js` change is strictly `STAGE_8.canyonProps`; new `ground.js` code is a hidden/inert group on non-canyon stages. |
| **TANKER: bolder swept fin + dropped wings; dock untouched** | **PARTIAL** | **Fin SURVIVES** — a bolder swept grey tail assembly replaces R21's thin crossbar. **Wings PARTIAL** — still near-horizontal planks vs the arcade's pronounced downsweep. **Dock + RELOAD WEAPONS SURVIVE** (noses up, cyan blinks frames 5/7, stock restocks). |
| **REGRESSION: all biomes + both refuel beats render; selftest 8/8** | **SURVIVES** | Swept stages 2,4,5,13,11(=14),6(=16),1,8 — all render correct biomes; stage 5 refuel beat intact (runway + autumn tree tunnel + depot props + low-swoop jet); `selftest` **8/8**. |
| **(New, not an R22 claim) Canyon combat "indistinguishable from an open stage" (R21 motion basis)** | **REFUTED (pre-existing, not an R22 regression)** | Identical stick play: **stage 1 = 6 locks, canyon = 0–1**; canyon sight rails to x≈+0.2 off the enemies' x≈0 cluster; near-field wall masses occlude the fight. Combat/camera code unchanged since R21, so this is a pre-existing canyon tell R21 under-characterized. |

## Sampling rates (citation field 6)

- Arcade canyon: `ffmpeg -ss 350 -frames:v 1` single still from `ab2-longplay.mp4` (HUD digit
  "8" confirmed) — composition/palette, no motion figure.
- Arcade tanker: single `-frames:v 1` still (`reference/stage3-reload-tanker-t165.png`) — composition only.
- Ours canyon/tanker stills: `capture.mjs ?fixed=1` + `window.__step`, deterministic single/stepped frames.
- Canyon + stage-1 PLAY: `playtest.mjs` seed 7 (turn = sampling rate; 24–90 ticks/turn),
  telemetry from `__combatStats` (locks/hits/stock/enemyShots), not pixel inference; the lock
  control is identical stick input on both stages.
- Regression A/B: `capture.mjs ?stage=1&demo=2 --every 20`, HEAD vs worktree `31039ab` — exact PNG diff.

## Ranked gap list for R23 (player language — what most breaks the illusion now)

1. **LIGHTEN AND OPEN THE CANYON — it's a dark tunnel where the arcade is a bright, open
   battlefield.** The floor battlefield is in; the remaining tell is the canyon's *light and
   framing*. The arcade's cream sky fills the upper third and the walls sit only at the far
   edges framing a **wide, clear, bright corridor**; ours is darker, the rock masses pile up
   across the top and **blot out the sky**, and near-field wall masses **balloon over the
   centre** of the frame (`judge-canyon-wallmass-occlusion.png`). Pull the walls back toward
   the flanks, cap how large/close a near wall mass may get (it should never swallow the
   centre), and let the measured cream sky (`#faecb0`) actually show. Highest-value next move.
2. **FIX CANYON AIMING: the sight sits off-centre and locks barely form.** Close play: with
   `--x 0` the canyon sight rails to **x≈+0.2** (stage 1 rails to x≈0.0), while enemies cluster
   near x≈0 — so the sight sits off the targets and **locks are suppressed** (canyon 0–1 vs
   stage-1 6 under identical play). You can vulcan in the canyon but can barely lock/missile.
   Trace the canyon sight/camera retracking (the low-camera gate) for the lateral offset; this
   is pre-existing (R21 under-credited it), and it makes the headline biome play worse than the
   open stages. (Combat/framing.)
3. **DENSIFY THE CANYON FLOOR to the arcade's wall-to-wall packing.** Ours is ~1–2 vehicles +
   scattered scrub per frame; the arcade (t=350) is ~3 tanks + tents + 15–20 scrub clumps
   packed across the whole floor. Raise the prop/scrub counts toward that coverage. (World.)
4. **GIVE THE FLAT FIELD BIOMES (14 forest / 16 city) REAL STRUCTURE.** Stage 16 still reads as
   open azure water (`sweep-s6`), stage 14 a flat field — not the arcade's dense city/forest.
   Port the canyon's wall-mass + floor-prop treatment (hills/buildings/canopy). Standing
   next-structure item. (World + a stateless horizon gate.)
5. **FINISH THE TANKER WINGS.** The fin is bolder now; the wings are still near-flat planks vs
   the arcade's pronounced downsweep from the shoulder to the pods. Drop the wing tips.
   (Tanker: `render/tanker.js`.) Also still open: certify `STAGE_8.scrollSpeed` (ADOPTED).

**Kept as positives (do not regress):** the **canyon floor battlefield** (tanks/tents/scrub);
**combat byte-identical outside the canyon** (maxdiff 0); the canyon walls + low camera + live
combat; both refuel beats (runway tree tunnel + depot props + low-swoop; airborne tanker +
docking + RELOAD WEAPONS + restock); the **bolder tanker fin**; the upright "II" title; seven
combat biomes; every combat win (aim beats blind, the missile loop, enemies shoot back, the
white-cored fireball); the ~8 s death cycle. **Keep new camera work stateless; do NOT grow
`ENVELOPE_Y`.**

# R17 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R17 gate. **Tree judged**: HEAD `0db9748` (clean, committed —
includes `d2eb495` world refuel-base scenery, `54748a8` stage-13 green route, `0db9748` framing
wave-2 low-swoop). **Method**: look-first — decoded the mapped arcade refuel frames (`ab2-longplay.mp4`
t=252 stage 5, t=557/562 stage 13; STAGE_MAP spans 244–256 / 552–568) and put our `?stage=5` / `?stage=13`
beside them before measuring; then re-measured every shipped claim with my own captures (`capture.mjs`,
`?fixed=1`, seed 1), a horizon-fraction measurement for the combat-safety check, a stepped
progression capture for the 4→5 handoff, and a naive-climb playtest on `tools/playtest.mjs` (seed 7).

## SCORE

| | R16 | R17 | one-line reason |
|---|---|---|---|
| **Stills** | 8.5 | **8.7** | +0.2. R16's three weakest frames all improved at once: the refuel stage went from "a bare road" to a **refuel depot** (fuel tanker, A-frame tents, a colored barrel rack, military trucks scrolling past, under the now-clear low sky); **stage 13** is a **distinct green biome** (sage ground + sage sky), no longer the autumn stage-5 runway; and **stage 4** is **brighter with a real cyan river** up the middle, not a near-flat dark field. Held below more because the one signature that defines both arcade refuel stages — the dense **tree tunnel** walling the runway to the very top (autumn on 5, palm on 13) — is still absent: ours has flat orange/green scrub flanks with the props sitting as discrete billboards at the horizon, so a player can still tell our refuel stage from the arcade at a glance. |
| **Motion** | 8.6 | **8.7** | +0.1. R16's one named motion caveat — *"the low pass does not FEEL like the arcade's terrain-rushing swoop (we keep the cruise horizon)"* — is **closed and I measured it**: the resupply horizon is now **0.20** (arcade refuel ~0.13–0.20), so the jet drops into a terrain-filled frame instead of cruising over it. Critically it is **gated**: combat horizon is unchanged at **0.618** (the 0.625 cruise line), so the swoop does not leak into the fight. Combat feel otherwise unregressed. |
| **Composite** | 8.6 | **8.7** | +0.1 — a clean breadth/polish round. Four shipped items (refuel scenery, low-swoop framing, stage-13 biome, brighter forest + river) all land and nothing regresses; R16's #1 gap is **substantially** closed (depot, not road) and its named motion caveat is **fully** closed. Not more because the refuel stages still lack the tree-tunnel flanks that are their defining arcade signature, and breadth is still ~6 of 23 beats. |

**One-line verdict**: *The refuel beat is no longer a road — I drop low into a depot now, a fuel
tanker and tents and barrels and trucks sliding past under a clear sky, and stage 13 is its own
green world instead of a re-skin of stage 5; what still gives it away is that the arcade's refuel
stages are a tunnel of trees reaching the top of the screen and ours is open scrubland with props
parked beside the runway.*

### What anchors the score (the look / the play, in player language)

I looked first. **Arcade stage 5** (`arcade-s5-t252.png`): a tunnel of **autumn trees** reaching
the top edge on both flanks, orange dirt, a cluster of **ground crew + a fuel tanker** where the jet
lands, a **motorcycle on the road**, green military trucks on the verges; horizon ~0.13. **Arcade
stage 13** (`arcade-s13-t557.png`): the same framing but **palm trees** and green ground, pale green
sky, jeeps on the right. **Our stage 5** (`ours-s5-lowswoop-f5.png`, `ours-s5-tanker-f1.png`,
`ours-s5-barrels-tents-f3.png`): the jet now **drops low** (horizon 0.198) into a frame where the
runway fills the screen; a **grey fuel tanker**, beige **A-frame tents**, a **colored barrel rack**,
and **green/grey military trucks** scroll past under a **clear pale sky** (clouds correctly lifted).
It reads unmistakably as *landing at a depot* — the R16 "it's just a road" verdict is gone. What it
is NOT yet: the flanks are flat orange scrub, not the dense tree wall, and the props are spaced
billboards parked at the horizon rather than the arcade's packed installation. **Our stage 13**
(`ours-s13-green.png`): green sage ground, sage sky, its own barrel-rack prop — clearly a *different
place* from stage 5 now, though it has no palms. **Our stage 4** (`ours-s4-river.png`): a brighter
saturated green canopy with a bright **cyan river** running up the centre.

- **Real gains I saw/measured.** (1) The **refuel stage reads as a base**, not a road — props +
  low framing + clear sky together do it. (2) The **low-swoop is real and safely gated**: resupply
  horizon 0.198/0.213, combat horizon 0.618/0.637 — the swoop fires only in resupply and leaves the
  fight's framing untouched. (3) **Stage 13 is its own biome.** (4) **Stage 4 is brighter + has a
  river.** (5) The **4→resupply-5 handoff still fires** in normal progression, and a **naive climb
  still lands missile locks** in combat (seed 7, locks acquired by turn 6) — the R16 win is intact.
- **What still breaks the spell.** (1) **No tree tunnel.** Both arcade refuel stages are walled by
  dense foliage to the top of the frame; ours are open scrub with parked props. This is now the
  single biggest tell on the refuel stages. (2) **Stage 13 has no palms** — the biome colour is
  right, the vegetation shape is not. (3) Breadth is still ~6 of 23 beats; the airborne tanker is
  unbuilt.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **REFUEL BASE: the beat now reads as a base (props + low framing + clear sky), not a road** | **PARTIAL (substantially closed)** | My own `?stage=5` capture shows all three signifiers landing: **low framing** (measured horizon **0.198**, vs arcade refuel ~0.13–0.20 and R16's cruise 0.625), **ground props** that scroll past across the pass — a fuel **tanker** (`ours-s5-tanker-f1.png`), **A-frame tents** + a **barrel rack** (`ours-s5-barrels-tents-f3.png`), military **trucks** — and **clear sky** (clouds gated off). This is a real, large step past R16's "bare road." **Remaining gap vs arcade:** the defining **tree-tunnel flanks** (autumn/palm to the top of frame) are absent — ours are flat scrub — and the props read as discrete billboards parked at the horizon, not a dense installation. A player would still separate ours from the arcade at a glance, but on "road vs base" ours now reads as a base. |
| **COMBAT UNCHANGED: the resupply low-swoop does NOT leak into combat framing** | **SURVIVES** | Independently measured horizon fraction: **combat stage 1 = 0.618, stage 4 = 0.637** (both at the 0.625 cruise line), **resupply stage 5 = 0.198, stage 13 = 0.213**. The swoop is strictly gated to the resupply state; the fight's framing, jet placement and sight are the R15/R16 normal. Corroborates the lane's isolated byte-diff. |
| **STAGE 13 renders its own green biome, distinct from the autumn stage 5** | **SURVIVES (PARTIAL vs arcade)** | `?stage=13` lands in resupply and renders a **green sage ground + sage-green sky** with its own barrel-rack prop (`ours-s13-green.png`) — unmistakably a different place from stage 5's autumn/cream (`ours-s5-*`). Falls short of the arcade only in vegetation: STAGE_MAP + arcade t=557 give stage 13 **palm trees**; ours has no palms, just coloured flanks. |
| **STAGE 4 forest is brighter + has a cyan river** | **SURVIVES** | `?stage=4&nocombat=1`: the canopy is a brighter saturated green and a bright **cyan river** runs up the centre (`ours-s4-river.png`) — clearly past R16's "near-flat dark green field." Judged by look against the R16 frame + arcade teal-sky forest; I did not re-run the V-distribution measurement, so I verify the direction and the river feature, not the exact modal V. |
| **CLOUD GATE: clouds lifted on refuel stages, intact on combat** | **SURVIVES** | Refuel `?stage=5`/`?stage=13` render **clear sky** (no cloud bank); combat `?stage=1`/`?stage=4` still render the cloud bank. The per-stage gate works for the refuel case. (Note: combat stages 2–4 still show clouds where STAGE_MAP gives them `cloud_density 0.0` — a pre-existing, not-this-round gap; see R18 loose ends.) |
| **REGRESSION: combat/first-lock/handoff unregressed** | **SURVIVES** | Naive full-climb + missile-held on combat `?stage=1` (seed 7) acquired **locks (2 by turn 6)**; stage 1 renders enemies, the sight, and a kill fireball (`ours-s1-combat-cruise.png`). Stepping `?stage=4` to its end flipped **`[flight stage 4] → [resupply stage 5]`** — the handoff still fires. Combat files (`weapons/**`, `combat.js`) were untouched this round. |

## Sampling rates (citation field 6)

- Arcade refuel reference: single `-frames:v 1` stills at t=252 (stage 5), t=557/562 (stage 13) of
  `ab2-longplay.mp4` — pose/composition/scenery only, no motion claim.
- Our stage captures: `capture.mjs`, `?fixed=1&seed=1`, `--every 40`, state read from the tool's own
  `[resupply/flight stage N]` label; single frames — pose/scenery/horizon only, no motion claim.
- Horizon fractions: single-frame sky-coverage scan (modal top-band colour, tol 36, first sustained
  <40%-coverage row below 0.15H), one frame per stage — a composition figure, not a motion figure.
- First-lock / handoff: `playtest.mjs` seed 7 (60–120-tick turns, turn = sampling rate) and
  `capture.mjs` 320-tick steps; no speed claim finer than a turn/step.

## Ranked gap list for R18 (player language — what most breaks the illusion now)

1. **THE REFUEL STAGES NEED THEIR TREE TUNNEL.** The low framing and the depot props landed, but
   both arcade refuel stages are a **tunnel of trees walling the runway to the very top of the
   frame** — autumn on stage 5, **palm** on stage 13 — and ours are open scrub/grass flanks with
   props parked at the horizon. This is now the single thing that tells our refuel stages from the
   arcade at a glance. It also fixes stage 13's missing palms in the same stroke. Dense flanking
   vegetation that reaches the top edge, not more billboards. (World.)
2. **STILL ~6 OF 23 BEATS — THE AIRBORNE TANKER IS UNBUILT.** Breadth is still the biggest
   structural distance from the arcade. The runway refuel is one of **two** arcade refuel
   mechanisms; the **mid-air tanker** refuel is still absent, and more combat stages widen the game.
   Quality over quantity — the next beat wired as well as the runway, with the scenery this round
   proved we can build. (World + flow.)
3. **CLIMAXES READ SMALL; THE TITLE IS HAND-ROUNDED.** Carried and now rising, since the refuel
   headline is largely closed. Kill fireballs are sub-screen vs the arcade's half-screen blasts;
   the title wordmark is hand-rounded where the arcade's is brush-angular. A grouped polish pass.
   (Effects / ui.)

**Loose ends (low priority).** Combat stages 2–4 still render the cloud bank where STAGE_MAP gives
them `cloud_density 0.0` — the R17 gate lifted the refuel stages only; extending the per-stage density
to the combat stages is a cheap fidelity win. The blind-gun floor (~8–12 kills/90 s) and the
`SIGHT_NDC_Y_OFFSET` reconciliation stay the measure-first items they were; the resupply restock still
fires at every stage boundary rather than being caused by the runway (harmless, disclosed).

**Kept as positives (do not regress):** the refuel beat now reads as a depot (props + 0.20 low framing
+ clear sky); the low-swoop is gated so combat framing is byte-unchanged (combat horizon 0.618); stage
13 is its own green biome; stage 4 is brighter with a cyan river; clouds lifted on refuel; the naive
climb still lands the first lock; the 4→resupply handoff still fires; stages 1–4 combat intact.

## Instrument limits (stated plainly)

- The refuel LOOK and the tree-wall gap are judged against single arcade stills (scenery/horizon),
  which stills support; I did not motion-compare the swoop frame-for-frame.
- Stage 4 "brighter" is a look verdict against the R16 frame, not a fresh V-distribution re-measure;
  I verify the direction and the cyan-river feature, not the exact modal V.
- The first-lock check is one seed (7) naive climb confirming locks still acquire; I did not re-run
  the full R16 lock-per-wave count or the gun A/B, as combat files were untouched this round.
- Horizon fractions are a single-frame composition measurement per stage; the resupply 0.198–0.213
  and combat 0.618–0.637 are far enough apart that the gating conclusion is robust to the method.

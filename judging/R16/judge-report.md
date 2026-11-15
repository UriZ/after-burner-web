# R16 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R16 gate. **Tree judged**: HEAD `aab4168` (clean,
committed — includes the R16 breadth/resupply `b4a66bc` and the R16 combat/first-lock
`aab4168` commits). **Method**: look-first — extracted the mapped arcade stage-5 refuel
frames (`ab2-longplay.mp4` t=245–255, STAGE_MAP span t=244–256) and put our `?stage=5`
beside them before measuring anything; then re-measured every shipped claim with my own
instrument — a NAIVE-play first-lock test on `tools/playtest.mjs` (selftest 8/8 before
first use), a blind-protection test, the normal-progression handoff by stepping stage 4
through to 6, and the R15 gun aim-vs-blind A/B re-run on this tree.

## SCORE

| | R15 | R16 | one-line reason |
|---|---|---|---|
| **Stills** | 8.5 | **8.5** | Held. A whole new environment shipped (the refuel runway), but it is the game's **weakest-matching stage**, so it does not move the ceiling: the runway surface + dashed centreline + solid edge-lines read right, but the arcade stage 5 is a dense refuel BASE — autumn trees filling the frame to the very top, fuel **tankers and tents on the ground**, ground crew — where ours is a bare grey strip under a low cruise horizon with a cream cloud bank eating the upper 60% of the frame. A player would tell our stage 5 from the arcade's at a glance. Stages 1–4 are unregressed and unchanged; the stage-4 forest ground is still dark/flat (deferred again). |
| **Motion** | 8.5 | **8.6** | +0.1. R15's named held-below-9 caveat — *"acquiring the first lock is a trick you have to discover"* — is **closed, and I verified it by naive play**: climbing full-up at the wave (the natural instinct, no sweet-spot knowledge) lands **3 locks on the very first climb turn** and 2–4 per wave after, where the R15 judge flew ~15 empty passes. Blind protection is intact/stronger and the aim-beats-blind gun is unregressed. The new resupply low-pass is a structurally-correct calm beat (no combat, hands back automatically). Held below more: the low pass does not FEEL like the arcade's terrain-rushing swoop (we keep the cruise horizon), and the broader combat feel was already closed in R15. |
| **Composite** | 8.5 | **8.6** | +0.1 — a real but modest step. One named R15 residual (first-lock discoverability) is cleanly, measurably closed, and breadth went from 4 to **5 reachable beats** including a structurally-correct refuel interlude. It is not more because the round's headline breadth deliverable only **partially** lands on the look (bare runway, no refuel props, wrong framing) and the stills ceiling did not move. |

**One-line verdict**: *The first missile lock is no longer a trick — I climbed straight at
the wave the way anyone would and locks just appeared, three of them, first try — and the
game is now five beats wide with a real no-combat refuel pass between the fights; what holds
it back is that the refuel runway is a bare strip where the arcade is a tree-walled base
full of fuel tankers, and the forest floor is still dark.*

### What anchors the score (the look / the play, in player language)

I looked first. **Arcade stage 5** (`arcade-s5-t245/t250.png`): the jet skims low over a grey
runway, but the whole frame is a tunnel of **autumn trees reaching the top edge**, with a
silver **fuel tanker truck** rolling on the ground, **tents**, and little ground-crew figures —
it reads unmistakably as *flying into a refuel base*. **Our stage 5** (`ours-stage5/frame-0004.png`):
the runway and its markings are a clean match, but the horizon sits at the cruise line so the
top ~60% is pale sky plus the global cream cloud bank, the flanks are a flat autumn-orange
band (not trees), and there is **nothing on the ground** — no tankers, no tents. It reads as
"a road in autumn," not "the refuel base." Then I played seed 7 by hand (~30 turns) and re-ran
the deterministic gun A/B.

- **Real gains I felt.** (1) **The first lock just happens now.** I climbed full-up at the
  incoming wave with the missile held — the move a new player tries first — and locks came
  the instant the wave rose into frame: turn 3 **0→3 locks**, climbing to 5 (`play-seed7/turn-0003-final.png`
  shows the sight on the top cluster, white brackets around it, amber lock-pips lit). This is
  the exact move the R15 judge could not find for ~15 passes. (2) **The refuel beat is reachable
  and calm.** Stepping stage 4 to its end rolled me **combat-4 → resupply-5 → combat-6**
  automatically; the resupply has no enemies and nothing to die to, and hands back on its own.
- **What still breaks the spell.** (1) **The refuel stage is too empty.** It is missing the
  two things that make the arcade frame read as a refuel base — the trees-to-the-top framing
  and the ground-level fuel tankers/tents — so the single most iconic "new beat" of the round
  is also its least convincing frame. (2) **Stage 13's biome is wrong.** `?stage=13` correctly
  lands in the resupply beat, but it renders the autumn STAGE_5 runway; STAGE_MAP gives arcade
  stage 13 **palm trees and a sage sky**, so it looks like stage 5 again. (3) The **stage-4
  forest ground** is still dark and flat (carried, deferred twice now).

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **RESUPPLY beat: a no-combat low pass over the refuel runway, reachable in play, missiles restocked** | **PARTIAL** | **What survives:** the runway renders (grey strip, dashed centreline, solid white edges) under the pale measured sky; combat is OFF (empty sky, nothing to die to); the stock is full (5 pips / stock 50); the HUD reads STAGE 5. **Reachability CONFIRMED in normal progression**, not just `?stage=5`: stepping `?stage=4` to its 40 s end, the capture labels flipped `[flight stage 4] → [resupply stage 5] → [flight stage 6]` — the handoff works both ways. `?stage=13` also lands in the beat. **Where it falls short of the arcade:** no trees-to-top framing (deferred, disclosed); **no refuel tankers/tents/ground installation** (NOT flagged as deferred — this is the arcade's defining signifier of the stage and its absence is why the frame reads as a road, not a base); the global cloud bank fills the upper frame where the arcade has clear sky + trees; stage 13 shows the autumn biome instead of its measured palm/sage one. **On the restock:** honest per the lane's own note — the refill is NOT caused by the runway, `_enterStage` refills at every stage boundary, so entering stage 5 is simply always full. The beat is real and correctly wired; the LOOK is the game's weakest stage match. |
| **FIRST LOCK is discoverable now (raised bait 0.44–0.58 → 0.55–0.65 + "aim here" hint)** | **SURVIVES** | Played NAIVE (full climb y=1, missile held, no sweet-spot knowledge), seed 7 mortal: the sight pins at +0.760 and **locks appear on the first wave that rises into frame — turn 3 landed 3 locks, then 2/3/3/4/4 across the following climb turns** (`play-seed7/turns/`). The salvo fires on release (combat.js:992; stock dropped 50→46 when the held input zeroed). R15's ~15-empty-pass problem is gone — the naive instinct now works first try. The white brackets + amber pips are visible on the cluster (`turn-0003-final.png`). |
| **Blind protection intact/stronger (centred do-nothing pilot gets ~no locks)** | **SURVIVES (stronger)** | Worst-case test — centred stick (sight pinned at rest +0.188), **missile HELD**, 10 turns with 3–5 enemies on screen: **0 locks every turn, stock unchanged at 46**. Raising the bait further above the resting cone did strengthen this, as claimed. |
| **R15 win not regressed: aiming the gun BEATS the blind stick** | **SURVIVES** | Re-ran `gun_human_cadence.mjs` on THIS tree, seed 7: **aim 24 vs blind 12** — byte-identical to R15's figure. The bait-band change did not touch the burst wall, and I observed 8–10-jet waves in play. |
| **The "aim here" hint does not re-wallpaper the HUD (R11)** | **SURVIVES (by observation)** | Brackets appeared only on the lock-bait cluster and only while the missile was held; a cruising/gun-firing pilot saw none. Doubly-gated to the sparse bait population AND the held button, as designed. Judged by eye across the playtest frames, not a dedicated presence count. |
| **REGRESSION: stages 1–4 still render; burst wall present** | **SURVIVES** | `ours-stage1` (blue sea + island + kill fireball), `ours-stage4` (teal sky + forest + enemy fighters) both render correctly; HUD, jet, crisp afterburner all intact; 8–10-jet waves observed in seed-7 play. Zero page errors across the whole session. |

## Sampling rates (citation field 6)

- Arcade stage-5 reference: single `-frames:v 1` stills at t=245/248/250/252/255 of
  `ab2-longplay.mp4` (the map-keyed file) — pose/composition/scenery only, no motion claim.
- First-lock / blind-protection / progression: `tools/playtest.mjs` under `?fixed=1`,
  seed 7, 45–120-tick turns; my turn length is my sampling rate. No speed claim finer than a turn.
- Gun A/B: `gun_human_cadence.mjs`, 5400-tick (90 s) deterministic run, 0.9 s reaction
  cadence, invincible, kills by weapon, seed 7.
- Progression handoff: `capture.mjs`, `?stage=4&invincible=1`, 240-tick (4 s) steps, state
  read from the tool's own `__flowState` label.

## Ranked gap list for R17 (player language — what most breaks the illusion now)

1. **The refuel stage is a bare strip where the arcade is a refuel BASE.** The new beat is
   the round's headline and its weakest frame. It needs the two signifiers it is missing: the
   **autumn trees that fill the frame to the top** (the deferred low-altitude framing — a
   cross-lane camera-pitch change coordinated with the player sprite's screen placement) and
   the **ground props** — fuel tankers, tents, crew — beside the runway. Also: stage 13 should
   render its measured palm/sage biome, not the autumn stage-5 runway; and the global cloud
   bank should lift on the refuel stages (STAGE_MAP gives them cloud_density 0 — a per-stage
   cloud gate). Until then a player reads "a road," not "the refuel base." (World + flow.)
2. **Still only 5 of 23 beats, and the airborne tanker is unbuilt.** Breadth is the standing
   theme and it is still the biggest structural distance from the arcade. The runway refuel is
   one of two arcade resupply mechanisms; the **airborne tanker refuel** is still absent, and
   more combat stages widen the game. Quality over quantity — the next beat done as well as the
   runway's wiring (but with the scenery the runway lacks). (World + flow.)
3. **The stage-4 forest ground is dark and flat.** Carried from R15 and deferred twice now.
   The arcade's canopy is brighter and more mottled with a cyan river; ours is a near-flat dark
   green field. Needs the measured V-distribution re-centre the breadth lane scoped, not a
   by-eye nudge. (World.)
4. **Climaxes read small; the title is hand-rounded.** Kill fireballs are sub-screen vs the
   arcade's half-screen blasts; the title wordmark is hand-rounded where the arcade's is
   brush-angular. A grouped polish pass. (Effects / ui.)
5. **Loose ends (low priority).** The blind gun floor still banks ~8–12 kills/90 s (a known
   structural floor); the resupply restock is not actually tied to the runway (it fires at
   every boundary) — harmless but worth making the runway the in-fiction cause if a tanker
   animation ever lands; the `SIGHT_NDC_Y_OFFSET` reconciliation stays the measure-first item
   it was.

**Kept as positives (do not regress):** the first missile lock is now found by the naive
climb (0→3 on the first wave); blind protection is intact/stronger (centred + held = 0 locks);
the aim-beats-blind gun (24 vs 12, unchanged); the burst wall; the human-usable missile loop
(grace window + legible pips); the crisp afterburner; the ~8 s death cycle; stages 1–4; the
resupply beat's wiring (no-combat, reachable in progression, hands back automatically). **Do
NOT grow `ENVELOPE_Y`** (R15-refuted; the raised bait moved the target up into the existing
reach, which is the right lever).

## Instrument limits (stated plainly)

- One seed hand-played (7) plus the seed-7 gun A/B; the first-lock finding is robust (locks on
  every wave that rose into the cone across ~10 climb turns), but I did not hand-fly seed 19.
- The resupply LOOK is judged against single arcade stills (pose/scenery), not a motion
  comparison of the low pass — the framing gap is a still-frame fact (horizon height, props),
  which stills support.
- The "no HUD wallpaper" verdict on the hint is by-eye across playtest frames, not a bracket-
  presence count; the structural double-gate makes a regression unlikely but I did not quantify it.
- The stage-4 forest is judged by look against the mapped frame + the deferral's own analysis,
  not a fresh V-distribution measurement.

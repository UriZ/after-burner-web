# R21 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R21 gate. **Tree judged**: HEAD (clean, committed —
`528f850` R21 route stage 8 + livery fix, on top of the canyon / tanker / title lanes).
**Prior**: `judging/R20/judge-report.md` (R20 = 9.0/9.0, composite 9.0).

**Method**: look-first. Captured the three headlines beside the mapped arcade — the CANYON
(`?stage=8`) beside arcade stage 8 (decoded `ab2-longplay-60fps.mp4` t=350, HUD digit "8"
confirmed), the TANKER (`?airrefuel=3`) beside `reference/stage3-reload-tanker-t165.png`, the
TITLE (`?showtitle=1`, 12 stepped frames) beside `reference/title-screen-t74.png`. **PLAYED
the canyon** in a closed loop on `tools/playtest.mjs` (seed 7, stage 8): aimed, locked, fired
vulcan + missiles, scored kills, took return fire. **A/B'd stage-1 combat against pre-R21**
(`78b21ee`) in an isolated git worktree — exact PNG diff. Re-measured the livery fix (14/16/1
diffed HEAD vs pre-R21), swept every combat + refuel stage, ran `playtest.mjs selftest`.
Comparison frames saved beside this report (`cmp-canyon.png`, `cmp-tanker.png`,
`cmp-title.png`, `canyon-combat-kill.png`).

## SCORE

| | R20 | R21 | one-line reason |
|---|---|---|---|
| **Stills** | 9.0 | **9.1** | **The canyon exists** — the single highest-value unbuilt biome now renders: tan rock **wall masses on both flanks**, a **low combat camera** (horizon dropped between the walls), cream sky (`#faecb0`) over warm ochre floor. It reads unmistakably as the AB2 canyon. The **title** finally reads as the arcade's **upright "II" block** (an upright square ball-grid with the red roman-numeral II embedded), not R20's diagonal swoosh — the weakest R20 screen is now a genuine match. Held from higher because the **canyon FLOOR is bare**: the arcade canyon floor is a dense battlefield of tanks, trucks, striped tents and rock tufts packed wall-to-wall, where ours is a smooth ochre dither field with no ground props — the same "right structure, empty terrain" tell the R20 field biomes have. |
| **Motion** | 9.0 | **9.1** | **Combat works IN the canyon.** Played it: enemies spawn (10 on screen), the sight aims, **locks form**, **missiles fire** (stock 50→49), the vulcan fires, **kills register** (hits 0→3, score 8,250→28,050), **enemies shoot back** (8 shots), and the **kill fireball renders** in the dropped-camera canyon. The walls/ground **stream smoothly** at 60 Hz (~50k px/frame, no judder). And combat is **byte-identical outside the canyon** — stage-1 A/B vs pre-R21 is **maxdiff 0** across 6 frames, so the new low camera is genuinely canyon-only and stateless. Title still tumbles. `selftest` 8/8. |
| **Composite** | 9.0 | **9.1** | +0.1 — **the #1 R20 gap (the canyon) landed as a full flyable combat biome with a new camera, working combat, and ZERO regression**, plus the title's structural fix on the weakest screen and a real step on the tanker. Held from higher because every win is still "structure right, detail short": the canyon floor is bare where the arcade's is a battlefield, and the tanker tail is a thin T-crossbar where the arcade's is a bold swept fin. |

**One-line verdict**: *I fly the canyon now — tan rock walls rise on both sides, the camera
drops low between them, and I'm fighting inside it: I aim, I lock, missiles go, things blow up,
the enemy shoots back, exactly as on open stages. The title screen finally stacks the upright
"II" block the arcade does instead of a diagonal ball-swoosh. What still isn't the arcade: the
canyon floor is empty — the real stage 8 floor is crawling with tanks, trucks and tents and
scrubbed with rock tufts wall to wall, and ours is smooth ochre with nothing on it, so it reads
as the right canyon shape over bare ground.*

### What anchors the score (the look / the play, in player language)

**The canyon (`cmp-canyon.png`, ours `?stage=8` | arcade stage 8 t=350):** both are
unmistakably the AB2 canyon — **cream sky, tan rock walls rising on both flanks, a low camera,
warm ochre floor.** A player would name it the canyon. The gestalt lands. **Where it differs:**
(1) the arcade floor is a **dense battlefield** — tanks, camo trucks, striped tents, and rock
tufts packed across the whole floor; ours is a smooth ochre dither field with **no floor props**;
(2) the arcade walls are **tall, continuous, tightly-framing** rock faces, ours are **shorter,
blockier, more discrete** clumps with gaps of sky between them. Right shape, bare content.

**Combat in the canyon (`canyon-combat-kill.png`):** this is the critical claim and it holds.
Played seed 7: a wave of 10 enemy jets flies in, I aim the sight onto them, a lock forms,
missiles fire and the stock drops, the vulcan streams, enemies die and score climbs, and a big
white-cored kill fireball throws across the canyon floor while the enemies return fire. Combat
in the canyon is indistinguishable from combat on an open stage — it is **not** a refuel-style
dead pass.

**The title (`cmp-title.png`, ours | arcade t=74):** the R20 diagonal swoosh is **gone**. Ours is
now an **upright ball-grid block with the red "II" numeral** embedded, matching the arcade's
orientation; the AFTER BURNER wordmark keeps the SEGA blue-A / red-B coloring. Across 12 stepped
frames the plate **still tumbles** (upright dwell → rotates to a diamond and over), so the fix
is structural, not a freeze. The arcade plate is slightly diamond-tilted and its red II is two
diagonal bars where ours is a cleaner upright square with vertical bars — a hair off, but this
is now a match, not the round's weakest screen.

**The tanker (`cmp-tanker.png`, ours `?airrefuel=3` | arcade):** 4 orange nacelles, central
cockpit with red sensor dots, grey palette, the jet **docks** nosed-up under the belly with twin
flames, and **RELOAD WEAPONS** blinks cyan — all read right. A **vertical T-tail** now sits where
R20 had only a dorsal hump. **Still short:** our T-tail is a **thin grey horizontal crossbar**
that nearly vanishes against the black sky, where the arcade's tail is a **bold dark swept
triangular fin**; and our wings are **nearly flat** where the arcade's sweep **down** sharply to
the pods. The hump is gone, but the silhouette still isn't the arcade's winged KC-tanker.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **THE CANYON — rock wall masses + a low combat camera, measured horizon + palette, routed at stage 8** | **SURVIVES** | `?stage=8` → `[flight stage 8]` renders cream sky + tan wall masses on both flanks + a dropped horizon over ochre floor; reads as the AB2 canyon beside arcade t=350. Also reachable via the lap: `?stage=7` renders the same canyon. |
| **COMBAT WORKS IN THE CANYON (dropped camera, not a dead pass)** | **SURVIVES** | **Played** (seed 7, stage 8): 10 enemies on screen; sight aims with the stick; **lock forms** (1); **missile fires** (stock 50→49, in-flight 1); vulcan streams; **hits 0→3**, score 8,250→28,050; enemies 10→6 (killed); **enemy shots 8** (they fire back); kill fireball renders (`canyon-combat-kill.png`). |
| **COMBAT BYTE-IDENTICAL OUTSIDE THE CANYON (low camera canyon-only, stateless)** | **SURVIVES** | Stage-1 `demo=2` A/B, HEAD vs pre-R21 `78b21ee`, same seed: **maxdiff 0, bbox None across 6 frames**. The new low camera does not touch non-canyon framing; stage-1 horizon is normal cruise (identical to pre-R21). |
| **TANKER airframe: T-tail fin + down-swept wings (R20 hump fixed); docking kept** | **PARTIAL** | **Docking + RELOAD WEAPONS SURVIVE** (jet noses up under the belly, cyan cue blinks on frames 5/7). **Airframe improved but not matched** — a vertical T-tail now exists, but it reads as a **thin grey crossbar** vs the arcade's **bold dark swept fin**, and the wings are **nearly flat** vs the arcade's pronounced **downsweep**. |
| **TITLE: upright "II" block (not a diagonal swoosh), still tumbles** | **SURVIVES** | Plate is now an **upright ball-grid block with the red "II" numeral**, matching the arcade's orientation (vs R20's swoosh — see the lane's `title/plate-before-after-arcade.png`). 12 stepped frames confirm it **still tumbles** (upright dwell → diamond rotation). Weakest R20 screen is now a match. |
| **LIVERY FIX (flow `contentStageIndex`): 14/16 render their biome, 1-4 unchanged** | **SURVIVES** | Stage 1 A/B **maxdiff 0** (unchanged). Stage 16 A/B **maxdiff 0** (biome + enemies identical). Stage 14 A/B diff is **localized to the enemy-aircraft region only** (backdrop byte-identical) — consistent with an enemy-sprite-palette change, no backdrop regression. Both biomes render their correct biome (14 gold-dusk olive, 16 lavender coast). |
| **REGRESSION: all combat stages render; both refuel beats intact; selftest 8/8** | **SURVIVES** | Swept stages 1,2,3,4,7,8,14,16 (all flight, correct biomes) + 5,13 (`[resupply]` runway beat) + 3 (airborne tanker). Runway refuel renders (runway, dashes, depot props — pyramids/tents on 5, palms on 13). `playtest.mjs selftest` **8/8**. |

## Sampling rates (citation field 6)

- Arcade canyon: `ffmpeg -ss 350 -t 0.25 -vsync 0` consecutive **60 fps** decode from
  `ab2-longplay-60fps.mp4` (HUD digit "8" confirmed) — composition/palette, no motion figure.
- Arcade tanker/title: single `-frames:v 1` stills (`reference/stage3-reload-tanker-t165.png`,
  `title-screen-t74.png`) — composition only.
- Canyon play: `playtest.mjs` seed 7 (turn = sampling rate), 8 turns over ~510 ticks; telemetry
  from `__combatStats`, not pixel inference.
- Canyon motion: `capture.mjs ?stage=8&nocombat=1 --every 1` **60 Hz** consecutive 8-frame burst;
  frame-to-frame ground-band change (~50k px/frame) — a motion-present figure, not a speed claim.
- Regression A/B: `capture.mjs ?stage=1/14/16&demo=2 --every 20`, same seed, HEAD vs worktree
  `78b21ee` — exact PNG diff.
- Title: `?showtitle=1 --every 10`, 12 frames — tumble phase + upright dwell.

## Ranked gap list for R22 (player language — what most breaks the illusion now)

1. **THE CANYON FLOOR IS BARE — put the battlefield on it.** The canyon has the right walls, the
   right low camera, the right sky — but the floor is a smooth ochre field with **nothing on it**.
   The arcade stage-8 floor is **crawling**: tanks, camo trucks, striped tents, and rock tufts
   packed wall to wall (see `cmp-canyon.png`). This is the same "structure right, ground empty"
   tell as the R20 field biomes, now on the headline biome. Give the canyon floor **ground props**
   (the depot runway already has tents/trucks/palms — reuse that prop vocabulary on the canyon
   floor) and it goes from "right shape" to "the arcade canyon." Highest-value next move.
2. **GIVE THE R20 FIELD BIOMES (14/16) THE SAME STRUCTURE TREATMENT.** Stage 16 still reads as open
   azure water, not the arcade's dense blue hillside **city**; stage 14 lacks the arcade's dense
   olive **palm forest**. Now that the canyon proves wall-masses + floor-props work, port that to
   the flat fields — buildings/hills on 16, canopy on 14. (World + stages.)
3. **FINISH THE TANKER AIRFRAME — the tail and the wings.** The hump is gone (good), but the T-tail
   is a thin crossbar that disappears against the sky where the arcade's is a **bold dark swept
   triangular fin**, and our wings are flat where the arcade's **sweep down** to the pods. Fatten
   and darken the fin, drop the wings. (Tanker: `render/tanker.js`.)
4. **KEEP WIDENING TOWARD 23 — now ~7 of ~23 biomes.** The canyon lands the headline; the lap is
   still short. One or two more distinct measured combat stages per round, quality over quantity.
5. **CERTIFY THE CANYON SCROLL SPEED.** `STAGE_8.scrollSpeed = 19.79` is ADOPTED (a regime-ratio
   scale of cruise), with **no our-engine canyon flow measurement** behind it (canyon lane ask #4).
   Run the #139 120 fps-decode flow method against a `?stage=7` capture to certify or correct it.

**Kept as positives (do not regress):** the **canyon** (walls + low combat camera + working
combat, byte-identical outside — maxdiff 0); the **upright "II" title block** (still tumbling);
the **tanker docking** + RELOAD WEAPONS; both refuel beats; the six prior combat biomes (14/16
backdrops unregressed); every combat win (aim beats blind, locks, missile loop, enemies shoot
back, white-cored fireball). **Keep any new camera work stateless** (the canyon low horizon is
proven canyon-only — hold that standard). **Do NOT inflate the fireball vertically; do NOT grow
`ENVELOPE_Y`.**

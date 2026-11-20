# R39 gap list — seeded by the fresh-context playtest (6.5/10, DOWN from 7), judging/R39/playtest-verdict.md

The critique moved up a level: mechanics fire, but the player doesn't OWN the outcomes
(locks they didn't choose, kills they didn't place, deaths they didn't see coming).

| # | Gap (player language) | Lane | Files owned |
|---|---|---|---|
| 1 | "Missiles never feel mine — launch without lock, the bracket grabs top-of-screen enemies while I aim at the horizon, kills land far away I never earned." (~30 fired, 3-4 attributable) | missile-ownership | `src/weapons/lockSystem.js`, `src/weapons/missiles.js` |
| 2+3 | "Still half plays itself — 15 s of zero incoming then a 30-shot barrage" + "both active-flying deaths: fireball out of nowhere, never saw the shot or the plane" (4th consecutive fresh-player report — stop re-fixing the round's pixels; find the SOURCE: who fired, from where, was the firer on screen?) | threat-pacing | `src/game/spawner.js`, `src/entities/enemy.js`, `src/entities/groundBattery.js`, `src/weapons/enemyShots.js` |
| 4 | "Kills pop at my wingtip or the screen edge, almost never out in front where I'm aiming." Measure the arcade first: where do arcade gun kills sit relative to the sight? (R36 census has kill positions; crossers legitimately die at the wing.) | missile-ownership (gun-kill placement vs sight is lock/assist geometry) + threat-pacing (crosser share) — coordinate via notes | (as above) |
| 5 | Art clutter: "cloud mass glued to the jet hides the fight", "stage-3 night ground reads as RGB static", "head-on enemy reads as an orange asterisk" | art-clutter | `src/render/clouds.js`, `src/render/ground.js`, `src/entities/enemySprite.js`, `tools/art/**` |
| 6 | "Stage transition is instant — tally overlays live combat with no pause" + "~6.5 s death control lockout felt long" + hands-off score reaches ~1.1M by stage 3 (sanity-check scoring vs arcade) | flow-timing | `src/game/flow/flow.js`, `src/game/score.js` |

Standing constraints: aimed-easy (R26); hands-off ≤0.4× aimed re-verified per behavior lane;
fairness pooled 1.333 ±10 %, 0 unannounced, warning floor ≥1.167 s; fire VOLUME closed (R30) but
pacing SHAPE is open; enemy size closed (R27); dry-fire is GAME_SPEC §3 ADOPTED (soften its READ,
don't delete it without re-checking the spec); arcade first, always. TL commits.

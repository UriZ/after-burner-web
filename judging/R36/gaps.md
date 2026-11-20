# R36 gap list — seeded by the fresh-context playtest (7/10), judging/R36/playtest-verdict.md

Ranked by what breaks the illusion in the hands. Lane = background agent with disjoint files.

| # | Gap (player language) | Lane | Files owned |
|---|---|---|---|
| 1 | "I can never tell when I'm locked — the blue box hugs my own jet, and sometimes the missile button simply does nothing." | lock-clarity | `src/weapons/lockSystem.js`, `src/weapons/missiles.js`, `src/ui/**` |
| 2 | "Everything dies point-blank on my nose, never out at depth — aiming feels like holding a funnel, and hands-off play still cleared stage 2." | depth-combat (this round's missing-system item: arcade enemy attack patterns at range) | `src/game/spawner.js`, `src/entities/enemy.js`, `src/entities/enemySprite.js` |
| 3 | "I kept dying without ever seeing the shot that got me" (4 of 6 deaths, no visible incoming fire). Side find: score snaps to exactly 84755 at first death on BOTH seeds. | death-legibility | `src/weapons/enemyShots.js`, `src/weapons/combat.js`, `src/weapons/telegraph.js`, `src/weapons/projectileSprites.js`, `src/game/score.js`, `src/entities/groundBattery.js` |
| 4 | "Flying straight is a flat screensaver" vs the arcade's constant sway. | cruise-sway | `src/game/game.js`, `src/core/cameraGeom.js` |
| 5 | "My double-tap never gave me a barrel roll." | **NOT A GAP — instrument limitation.** `ROLL_SLAM_WINDOW_S = 0.35` requires two same-sign flicks within 0.35 s; the playtest harness decides every 1–10 s and cannot physically produce them. R34b code-verified the roll; the owner's hands have confirmed it since. No change. | — |

Contradiction to reconcile (lane 3): the R35 judge's fairness probe reported **0 unannounced
fatal hits**, while the playtest saw no incoming fire before 4 of 6 deaths. Two instruments
disagree → one is broken or they define "announced" differently (a telemetry telegraph vs a
round actually visible on screen for long enough to react). Reconcile before tuning.

Standing constraints: enemy SIZE is CLOSED (R27 measurement, do not bump). Enemy fire volume
is CLOSED (R30 — arcade fire is sparse; no bullet-hail). The afterburner flame stays REMOVED
(owner). Fairness: any spawner/shot change re-runs `tools/fairness_probe.mjs` and stays in
band. Developers do not commit.

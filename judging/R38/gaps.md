# R38 gap list — seeded by the fresh-context playtest (7/10), judging/R38/playtest-verdict.md

| # | Gap (player language) | Lane | Files owned |
|---|---|---|---|
| 1+3 | "Almost every gun kill explodes directly on my own nose — half the time a kill looks exactly like my own death" + "blind centered fire out-scored my aimed play" (same crosser-transit mechanism; arcade truth R36 §1: in-your-face fire is dead smoke ballooning past camera, not live kills at the nose) | kill-placement | `src/weapons/vulcan.js`, `src/effects/explosions.js`, `src/weapons/combat.js` |
| 2 | "I died without ever seeing the shot — the killer is one slow puff among dozens of identical puffs, or a plane that pops up full-size the instant I blow up." CAVEAT: the playtest is DEAF — the R37 whistle is invisible to it; the lane owns the visual-confusability + pop-in parts only. | death-legibility2 | `src/weapons/enemyShots.js`, `src/weapons/telegraph.js`, `src/effects/smoke.js`, `src/effects/hitFlash.js` |
| 4 | "Dying never costs anything — lives refilled 0→3 at a stage transition." Arcade truth FIRST (ab2-gameplay.mp4 has deaths + lives HUD; AB2 awards extended play — the rule may be bonus lives, not no-refill). R36's playtest saw a real game over, so this may be an R37 flow regression. | death-cost | `src/game/flow/flow.js`, `src/game/score.js` |
| 5 | "Stretches of totally empty sky, and some enemies park in formation next to me like wingmen" (likely R36's non-firing deep formation) + the old close-presence gap (~0.07 vs arcade 0.40–0.70; fix = enemies ARRIVING already large, pilot-pinned operator per R37 reconcile). | sky-density | `src/game/spawner.js`, `src/entities/enemy.js` |

Not cut this round: far-bin kill share (R37 honest residual — lock-formation depth) — not raised
by the playtest; attract-demo engagement (R30-deferred) — attract-only, below the in-game gaps.

Standing constraints: enemy size CLOSED; fire volume CLOSED; R36 depth routing + R37 skill
package stand (hands-off ≤0.4× aimed re-verified per lane); fairness pooled ~1.33 ±10 %,
0 unannounced, warning floor ≥1.167 s; any presence number pins its pilot. TL commits.

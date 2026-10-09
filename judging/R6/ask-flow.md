# R6 — asks from the game-flow / player-feel lane

All of these are in other lanes' files. Nothing below was edited by this lane.

---

## A1 — COMBAT: the sight square should probably not be drawn at all

**This is the JOB 3 item, and the arcade check reversed its direction.** Evidence:
`judging/R6/flow-03-sight-ours-TOP2-arcade-BOT3.png`.

The brief was "the sight swings 11.5 %W under bank — decide whether that is a defect or
arcade-correct." The swing is real and reproduced (top two panels: at 0° the dashed square sits
above the nose; at 66.5° it is off to the side). But looking for the arcade's version of it to
compare against, **I cannot find one.** Checked:

| frame | condition | sight square near the nose? |
|---|---|---|
| `stage1-climbout-t92.png` | flight, **no enemies at all** | **no** — only the fixed upper-right reticle |
| `stage1-level-flight-t116.png` | level, enemies present | **no** — the one dashed square is a lock bracket, on the distant enemy |
| `stage4-vulcan-stream-t214.png` | **firing the vulcan** | **no** |
| longplay t94.5–98.0, 8 frames through a full bank | level → hard bank | **no** — every dashed square found sits on an enemy |

GAME_SPEC.md §3 lock-display element 1 says: *"The small dashed SIGHT square leading the
player's nose — the aim point, **always present in flight**, separate from any lock indicator."*
It is tagged MEASURED. On the frames in this repo it is not there in any of the four conditions
above, including the two where it would be most expected (no enemies, so nothing else could be
drawing a square; and firing, when an aim point matters).

**The most likely reading is that element 1 is a lock bracket (element 3) that happened to sit
near the nose in the frame it was read from** — the same defect family the project has retired
nine criteria for. I am not asserting it is retired; I am a flow lane reading frames, and
criteria-fix owns GAME_SPEC. See A4.

**What I am asking combat for, which holds either way:**

1. **`lockSystem._nearestLockable(enemies, sight)` must not depend on bank angle.** This is the
   half that is a defect regardless of whether anything is drawn: `combat.js:350` sets
   `sight.y = playerNdc.y + 0.30` and the sight is projected through the un-rolled base
   quaternion, while `player.js` goes to explicit trouble (`_rollAxisWorld`) to cancel roll out
   of the *jet's* screen position. So the jet holds station and the aim point rotates around it
   — and **which enemy you lock is therefore a function of how hard you are banking.** That is
   true whether or not a square is visible, and it is wrong whether or not it is.
   The compensation player.js already does is the pattern to copy; `core/cameraGeom.js` (new
   this round) now holds the camera constants if you need them.
2. **Consider not drawing the square** (`combat.js:419`'s `this._on('sight') ? this.sight : null`)
   pending A4. Keep `this.sight` itself — vulcan convergence (`combat.js:519/527`) needs it.

## A2 — COMBAT: `playEnemyFlyPast` still has zero call sites

`src/audio/sfx.js:134` is a complete, enveloped, stereo-panned synth; `AudioBus.play('enemyFlyPast',
{panFrom, panTo})` is already registered at `sfx.js:362`. Unchanged since R4.

The call site is in `spawner.js`, where an enemy is removed for passing the camera (`spawner.js`
~396 / ~424), and it is yours. One line, with the pan taken from the enemy's own `ndc.x` so the
sweep goes the way the aircraft went:

```js
AudioBus.play('enemyFlyPast', { panFrom: Math.max(-1, Math.min(1, e.ndc.x)), panTo: Math.sign(e.ndc.x || 1) });
```

**I deliberately did not do this from `game.js`.** It would mean polling `combat.spawner.enemies`
every tick for depth crossings from a file that should not know the spawner's internals, and it
would fire on the wrong edge or twice depending on your despawn semantics, which are yours to
know.

## A3 — PRESENTATION: the life count is drawn but unreadable

`ui/hud.js`'s `drawLives` renders a 7×4 px sprite at the extreme bottom-left, under the SPEED
label, over the moving sea (feel-critique.md §7.5). The *wiring* is correct and is this lane's —
`flow.js`'s `update()` writes `hudState.lives` every tick in every state, and that is verified
(the continue probe reads `lives` 3 → 2 → 1 → 3 across a credit). What is wrong is placement and
size, which is `ui/**`.

A player cannot tell at a glance that they are on their last life, so the CONTINUE card still
arrives as a surprise. Worth noting for your contrast work: the arcade's own bottom strip is
*harder* than ours (I21-REVISED), so this is a size/position fix, not a plate fix.

## A4 — CRITERIA: two GAME_SPEC §§2–3 items this lane found, with evidence

**(a) §2's "continue resets the score to ~0 (gp t265–269 climb from ~600)" is a misread frame.**
Already known to the lead and to feel-critique.md §3.5; I re-read it independently at 4× before
deleting the line, and the digits are
`t256 485440 → t262 489540 (frozen through the death) → t265 490000 → t268 491000 → t277 497600`,
with `reference/continue-card-gp-t261.png` carrying **SCORE 489540 / HIT 4 / STAGE 4 on the
CONTINUE PLAY card itself**. Score, HIT and stage all survive the credit. The build now matches
(probe output in `lane-flow.md`). Three separate readings agree; the spec line should go.

**(b) §3's lock-display element 1, the SIGHT square, is tagged MEASURED and I cannot find it in
any frame.** Full evidence in A1 above. Please re-examine before anyone tunes to it — and note
that a lane *did* tune to it: our build draws the square because the spec says the arcade has one.

**(c) §1's "the barrel roll SUPPRESSES world roll — the horizon stays dead level through it" does
not survive its own reference frames, and I did not act on it.** `game.js`'s
`ROLL_SUPPRESS_RATE_RAD_PER_S` exists to satisfy that line and levels the horizon within 0.2 s of
a roll starting. Stepping the arcade's roll at `ab2-longplay.mp4` t221.6–223.1 (16 frames, 0.1 s
apart) the horizon is **visibly banked in every single frame**, the belly-up frames at
t222.0–222.3 included; it never goes level. I tried to put a number on it and **withdrew the
measurement** — a Theil-Sen horizon fit that passes synthetic controls to 0.08° returned swings
of 50° in 0.1 s on these frames, which is non-physical, and overlaying the detected points showed
why: big cloud banks sit below the horizon and the "lowest sky pixel per column" operator traces
the cloud tops instead. Validated operator, wrong population. **So: the claim is qualitative, from
frames, and it is that no frame of the arcade's roll has a level horizon.** That is enough to say
the criterion is suspect and not enough to say what should replace it. Left alone this round;
flagged so nobody tunes further to it. (It also makes `reference/stage4-barrel-roll-t222.png`'s
filename an unverified label — the belly pose holds for ~0.4 s, which is long for one eighth of a
1.1 s roll, so it may be an extreme bank rather than a roll.)

## A5 — SPRITE-ART: a NIGHT barrel-roll sheet, when convenient

The roll is now drawn from `JET_ROLL_SHEET` (`player-f14-roll.png`) in every stage, including
night, because there is no night variant. Day and night differ in hue at matching value
(`spriteFactory.js`'s `PLAYER_PALETTE_NIGHT` note), so it is a ~1.1 s hue pop on stage 3 rather
than a value pop, and I judged the drawn manoeuvre everywhere to beat a spun bitmap at night.
`player-f14-night.js` already delegates to the daylight generator, so a `player-f14-roll-night.png`
on the same pattern should be cheap. **Low priority** — it is 1.1 s, and only on night stages.

Wiring it afterwards is one line in `player.js` (mine): a `_rollTextureNight` beside
`_rollTexture`, picked by `this._night`, exactly like `_activeSheet()` already does for the bank
sheets.

## A6 — COMBAT + WORLD: the throttle changes the ground speed and nothing else

The throttle **is** a real player verb and has been since R5 — the judge's gap-6 line ("wired to
`scrollSpeed` with no player control") is not true on this tree; see `lane-flow.md` for the probe.
What it drives is ground scroll, engine gain and the HUD gauge. What it does **not** drive:

- **Enemy closure rate** (`spawner.js` / `enemy.js` `depthRate`) — combat's. `flow.js` already
  threads `input.throttleIndex` through untouched on `flight`'s returned input for you to read;
  that interface was built in R5 and nothing consumes it. This is the one that would make speed
  *matter* rather than merely look different.
- **Cloud drift** (`clouds.js` `CLOUD_SPEED = 9.5`) — world's, and feel-critique.md §7.4 ranks it
  8 on its own account: clouds drift 4.5–10.5× slower than the ground at the three detents
  (42.7 / 68.9 / 99.9). Cheapest unclaimed speed cue in the build.

## A7 — WORLD / anyone: `README.md` does not document the throttle keys

Not an ownership claim — I just did not want to edit a shared doc mid-round. README's "Controls"
section lists arrows/WASD, `Z`, `X` and stops. **`Q` and `E` step the throttle down and up**
(`core/input.js`, edge-triggered, three detents L/M/H). A verb nobody is told about is close to a
verb that does not exist, and this omission is the most likely reason the R5 judge recorded the
throttle as having no player control.

## A8 — WORLD: `STAGES` is still 3 entries, and the stage structure now outruns it

`flow.js`'s `STAGE_DURATIONS_S` now carries all **23** measured arcade stage durations from
`STAGE_MAP.md` (12 s to 48 s, mean 34.2 s), so the game's *structure* is 23 stages. The *content*
still laps every 3 because `STAGES` has 3 entries. If you extend `STAGES` this round the lap
recedes with no code change on my side — `_enterStage` and `contentStageIndex` already wrap on
`STAGES.length`.

Flagging one consequence for the lead rather than deciding it myself: with real per-stage
durations, the HUD digit question reopens. R5 chose to draw the **wrapped** stage number so the
digit always matches the palette on screen. At true stage 4 we now draw "STAGE 1" while the
structure really is stage 4, and the arcade draws "STAGE 4" (confirmed on
`reference/continue-card-gp-t261.png`). Neither digit is fully honest while content laps; the
real fix is more stages. I left R5's choice alone rather than flip a reasoned decision for a
coin-toss.

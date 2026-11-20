# R38 death-cost lane — "dying never costs anything" (playtest gap 4)

## TLDR

There is **no stage-transition life refill** in our code and never was. The playtest's
"lives refilled 0→3 at the stage-1→2 transition" was the continue coin at
`flow.js:_updateContinue` being **LEVEL-triggered**: a fire button still held from combat
(the normal posture, and since R37 also Space/Enter) bought the continue on the FIRST tick
of the continue state, so the CONTINUE card was on screen for ≤1 tick, lives silently went
0→3, play resumed in place, and the nearby stage boundary made it read as a
transition refill. Fixed by making the coin (and the title/attract start) a **rising
edge** — a press that begins after the state is up. No other rule changed; our state
machine already matched the arcade.

## The smoking gun (playtest telemetry, s1 seed 7)

`scratchpad/r38/s1/turns/turn-00{42,43}.json`:

| turn | ticks | state | stage | lives | fire |
|---|---|---|---|---|---|
| 42 | 2906–3146 | death | 1 | 0 | up |
| 43 | 3146–3386 | flight | **2** | **3** | **HELD all turn** |

Inside turn 43 the death sequence ended → `continue` → held fire read as a coin on tick 1
→ lives 3, resume in place → stage boundary → stage 2. R36's playtest reached game over
only because its buttons happened to be up during its final continue; R37's flow.js change
(music re-key only) did not touch this — the defect is original to the R12 continue code.

## Arcade rule (established, two independent operators)

**GAME_SPEC.md §2 (MEASURED, R5/R6):** lives per credit = 3, by the 9-continue partition
of all 27 deaths in `ab2-gameplay.mp4` — `[3,3,3,3,3,3,3,3,3]`, no exceptions. Exactly 3
deaths per credit across a 793 s playthrough that crosses many stage boundaries is
structurally incompatible with ANY mid-credit refill.

**Direct lives-digit read (this lane).** The reserve-lives display is the row of small
jet icons under the SPEED box (bottom-left). Read off `ab2-gameplay.mp4` across the
credit that starts with the continue at gp t261 (evidence PNGs in this directory):

| gp t | reserve icons | event | STAGE digit |
|---|---|---|---|
| 266 | **2** | fresh credit after the t261 continue (2 reserve + flying = 3) | 4 |
| 278, 280 | **1** | after the death at t271 | 4 |
| 288–330 (8 samples) | **0** | after the death at t281 — **held at 0 across the stage 4→5 (~t282) AND 5→6 (~t305) boundaries** | 5, then 6 |
| 334 | — | 3rd death of the credit | 6 |
| ~337.5 | — | **"CONTINUE PLAY / 10 / INSERT COIN"** card; coined in <1 s (consecutive decode t335–340.5 — 2 s sampling misses this card, which is why it hid at first) | 6 |
| 338 | **3** | new credit granted, jet not yet respawned | 6 |
| 340+ | **2** | READY → flight on the new credit | 6 |

So: deaths decrement, stage boundaries change NOTHING, the only refills are a new credit
and a continue, and the arcade's continue costs a deliberate physical act (coin + start).
Score ran 718850 frozen across the whole death→continue→respawn and resumed — matches
what we already ship.

- `arcade-reserve-icons-t266-338.png` — 8× zoom of the icon box at the 10 key timestamps
- `arcade-continue-card-t337.png` — consecutive-decode sheet t335–340.5 (0.5 s step), card visible
- `arcade-bottomstrip-scan-t262-340.png` — 2 s scan of SPEED/icons/STAGE strip (digit reads)

## The fix (src/game/flow/flow.js only; score.js untouched — already arcade-correct)

One rising-edge latch `_pressArmed`: armed by a button-up tick seen inside a
press-accepting state (title / attract / continue), disarmed at the two entries where a
held combat button carries over (death→continue, gameover→title) and at construction.
Consumers (`_updateTitle`, `_updateAttract`, `_updateContinue`) fire only on
`pressed && armed`. Release-then-press is the coinless stand-in for the arcade's coin
insert; the countdown running out is GAME OVER, exactly as before. Also closes the
sibling hole where a button held across the GAME OVER card silently started a new credit.

## Verification (deterministic, `verify_continue.mjs` → `verify_continue_result.json`)

`?fixed=1&lives=1&forcedeath=3`, stick injected via `__setStick`, all PASS:

- **A** fire held through the last-life death: state sits in `continue` with lives 0 for
  the full 10 s countdown (9 × 1 s samples) → `gameover` (4 s) → `title`. Score frozen
  at 10010 throughout. Pre-fix this refilled to 3 on the first tick.
- **B** release-then-press during the countdown: → `flight`, lives 3, SAME stage,
  score 10010→10230 monotone (no reset) — the arcade's continue.
- **C** `lives=2&invincible=1` across the stage-1→2 boundary: lives 2 → 2. No
  transition refill (there never was a refill path; `_enterStage`/`_startTally` never
  write `lives`).
- **D** fire still held at the post-gameover title: no silent start; release+press →
  `launch` with a fresh credit (lives 3, score 0).
- **Music re-key regression** (`judging/R37/start-time/variant_advance_fixed.mjs`):
  variant 0→1→2 across the stage 1→2→3 boundaries — unchanged.

Note for anyone re-running: a file write into the repo mid-run makes vite reload the
harness page ("execution context destroyed"); run it on a quiet tree.

## What this means for the playtest complaint

Dying now costs what the arcade charges: the run stops, the CONTINUE card and countdown
actually display, continuing is a deliberate press (and letting it lapse is GAME OVER),
and lives never come back at a stage boundary. The ~6 s death cutscene itself is
arcade-shaped (hit→control ≈ 8–9 s in the arcade, GAME_SPEC §2) and was not touched.

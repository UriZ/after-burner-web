# R12 GAME FLOW lane — cross-lane asks and findings

Files owned this round: `src/game/flow/**`, `src/game/score.js`, `src/game/game.js`,
`src/main.js`. Everything below is either a request to another lane (I did not reach into
their files) or a finding/decision the TL should see.

## Asks

### A1 — Audio lane: add a `gameOver` SFX event
The new GAME OVER state (`flow.js:_enterGameOver`) calls `AudioBus.play('gameOver')`.
`src/audio/sfx.js`'s `HANDLERS` has no such key, so `play()` no-ops it today (by design —
unknown names are a silent no-op, so this is harmless until you wire it). Please add a
`gameOver` handler — a short descending/defeated FM sting fits the moment. It fires once,
on credit exhaustion, with the idle engine bed still running underneath and music ducked to
`off`.

### A2 — Judge / reference: pull a GAME OVER frame and measure the card
`cards.js:drawGameOverCard` is the one card in that file whose geometry is **ASSUMED, not
measured** — no GAME OVER frame is cropped in this repo. The feel critic's lethality table
(GAME_SPEC §2) timestamps a GAME OVER card at `ab2-gameplay.mp4` gp t841.2 (end of the
measured credit). A crop of it would let the card get the same measured treatment the
continue/tally cards carry (line colour, scale, vertical position, whether "GAME" and
"OVER" stack on two lines). Until then it is one centred red line in the big card face at
the continue card's countdown row.

### A3 — World lane: expose a stage-transition cross-fade on `sky`/`ground` setStage
Gap 3's second half (stage 1→2 is a single-frame full-palette hard cut). The cut happens in
`flow.js:_enterStage`, which calls `sky.setStage()` / `ground.setStage()` — both instant
palette swaps, and both in **your** files. Flow owns the *timing* but cannot soften the swap
without a renderer-side tween. If you expose either (a) a `setStageBlend(fromStage, toStage,
t in [0,1])` on sky/ground, or (b) a short internal tween on `setStage`, I will drive a
~0.4–0.6 s transition from the tally boundary (where the overlay card is already up). I did
**not** hack a full-screen flash overlay to mask the cut — a flash is not clearly
arcade-accurate and risks looking worse than the cut. Deferred to this interface.

## Findings / decisions (no code change, with reasons)

### F1 — Passive score accrual is arcade-faithful; NOT killed (playtest gap 5a)
The playtest read "the score climbs from tick 0 with zero hits" as a stakes defect. Verified
against the longplay directly (`ab2-longplay.mp4`, single frames t92–96, score crop read by
eye):

| t (s) | SCORE | HIT |
|---|---|---|
| 92 | 0 | — |
| 93 | 0 | — |
| 94 | 0 | — |
| 95 | 1110 | 0 |
| 96 | 4410 | 0 |

The arcade score is **0 through the carrier launch** (t84–94, GAME_SPEC §5 bookend) and
begins accruing at ~t94.5 once flying, at **+3300/s with HIT still 0** (t95→96 is +3300
exactly; the t95 "1110" is GAME_SPEC §6's measured "first launch second +1110"). So passive
accrual during flight with zero kills is the arcade's own behaviour — it is MEASURED
(score.js header / GAME_SPEC §6) and killing or gating it would diverge.

Why the playtest saw it "from tick 0": `?fixed=1` skips the title+launch bookend and drops
straight into flight at tick 0, so the capture never sees the 0-score launch. In real
interactive play the score sits at 0 through title and the carrier launch, then climbs only
once flying — matching the table above. Our freeze states are already correct:
`_updateLaunch` does not accrue; death/continue/gameover freeze; flight accrues. No change.

The genuine half of the stakes complaint — "running out of lives silently refills to 3" —
is fixed by the game-over path below.

### F2 — Death cycle kept at 7.7 s; NOT cut to ~4 s (gap 3 / rank 7)
The playtest estimated the death cycle at "~7 s vs the arcade's ~4 s." The arcade figure is
wrong. `deathSequence.js` pins every phase boundary to a **contiguous 30 fps decode** of
`ab2-gameplay.mp4` t200.5–209.2: hit→normal-scale 6.98 s, hit→READY-gone **7.70 s** (what we
ship), hit→flash-off 8.67 s. R5 cut the cycle to 5.2 s and **R7 reversed it** because the
arcade's own playable share is MEASURED at 69.4–73.5 % and the short cycle put us at 78.2 %,
*above* the arcade band. Cutting to 4 s would re-introduce exactly the divergence R7 fixed,
and would discard frame-pinned arcade measurements to chase an eyeballed "~4 s" that no frame
supports. Per CLAUDE.md ("check the criterion against the arcade itself before tuning to
it"), this is a declined criterion, not an unfixed gap.

## What I changed (for the TL's commit)

- **Game over (rank 5b).** `flow.js`: the continue countdown now has two *different* exits.
  A press (fire/missile) is the only thing that continues — resume in place, lives refill to
  3, score/HIT preserved. The countdown **running out now goes to GAME OVER**, not a silent
  refill. New `gameover` state holds `drawGameOverCard` over the still-scrolling world for
  `GAME_OVER_S = 4 s` (ASSUMED duration), then falls back to `title`, which times out into
  the attract demo — the cabinet idle loop. New `drawGameOverCard` in `cards.js`.
- **Attract drama (rank 6).** `demoTimeline.js`: two choreographed hard-bank beats per 16 s
  cruise cycle (a climbing right bank, a diving left bank) injected as **raw stick gestures**
  (like the barrel roll), because under the position controller scaling the sine amplitudes
  cannot produce hard stick. Horizon now swings to ±63° (near the 66.5° saturation) and the
  jet sweeps +0.46/−0.55 NDC vertically each cycle, where before it cruised near-level. The
  barrel-roll count is unchanged — exactly 10 per 160 s at seed 3 invincible, zero spurious
  rolls added (verified).
- **Test hook.** `flow.js`: `?lives=N` sets the starting life count so the life-exhaustion →
  continue → game-over → attract path is reachable in one deterministic `?fixed=1` run
  (`?fixed=1&lives=1&forcedeath=S`). Same measurement-only family as `?forcedeath` /
  `?invincible`; never read in normal play.

### Verification (telemetry + frames, `?fixed=1`)
- Game over: `lives=1&forcedeath=1.5` → flight → death(1.5s) → continue(9.2s) →
  **gameover(19.2s, after the full 10 s countdown)** → **title(23.2s)**. Lives 1→0 and stays
  0 through game over (no silent refill). 0 page errors.
- Continue: same start, fire held during the countdown → flight at 9.3 s with **lives=3**.
  Refill happens only on the press.
- Drama: `demo=1&invincible=1`, max |worldRoll| = 63.2°, jetNdcY range [−0.55, 0.46] per
  cycle; roll count 10/160 s. Frame strip confirms the horizon swinging into steep diagonals
  during the beats.

# R5 — Game-feel critique

**Scope:** this build judged as a *game*. Fairness, difficulty, pacing, responsiveness, fun.
Pixel fidelity is `art-critique.md`'s job and is not re-litigated here.

**Tree state (REFERENCE.md "What a complete citation is"):** every our-side number below was
measured on the **committed** tree, `53ce86b`, with `git status --short -- src/` empty at the
start **and at the end** of measurement. No source file was modified. Nothing committed.

**Method — three sources, kept separate and labelled inline.**
1. **Code read as a designer** — `core/input.js`, `entities/player.js`, `entities/enemy.js`,
   `game/flow/**`, `weapons/**`, `game/spawner.js`, `game/game.js`, `audio/**`.
2. **My own per-tick telemetry** — `tools/out/feel-critic-r5/feel_probe_r5.mjs`, sampling
   `__flowState()`, `__combatStats()` and `__fairness()` **every fixed tick** (`?demo=1`,
   seeds 1–7, 180 s each, **1260.1 s pooled**). No sub-sampling at any interval, so the
   16.000 s attract-regime aliasing trap cannot apply. `__combatDebug()` was deliberately
   **not** polled — it draws from the shared PRNG stream, which would make the thing being
   measured depend on the sampling rate. **No number here is sourced from another lane's report.**
3. **Arcade footage** — `.reference-cache/video/ab2-gameplay.mp4` and `reference/`, measured
   here with a new instrument described in §3.

**Captures** are in `tools/out/feel-critic-r5/`, all swept for the two silent-corruption modes
with `sweep.py`, which **passes a planted-fault self-test first** (a planted all-black frame and
a planted byte-duplicate; `--selftest` → PASS). 0 black frames and 0 duplicates in every
gameplay set. The attract set reports 11 duplicate pairs, all within frames 0–5 — that is the
static title card, not a stalled capture, and the sweep locating it is the sweep working.

**I could not hold the controls and every capture is silent by construction.** §8 says which
conclusions are inferred.

---

## 1. Verdict

**R4's verdict no longer holds, and it does not hold by a wide margin.**

> R4: *"No. A player would not enjoy 60 seconds of this, because across 60 seconds they are
> only holding the controls for about 28 of them."*

They now hold the controls for **43 of every 60 seconds** (71.9 % of wall clock, pooled over
21 minutes). The 19.1-second stretches with nothing to shoot are gone — the worst case across
all seven seeds is **3.67 s**, and only two stretches in 21 minutes exceed 3 s. The 4.5-second
empty rectangle after every death is gone. The unskippable countdown is gone (1.34 % of wall
clock). `feel-01-one-minute.png` is the same 60-second grid R4 used to indict the build, and
**not one of its 72 tiles is empty**; R4's had 25.

**Would a player enjoy 60 seconds of it? Yes — the 60 seconds now work.** It is busy, it is
fast, it kills you fairly, and the attract loop is a real attract loop.

**Would they enjoy ten minutes? Not yet, and for one reason that no statistic in this round
measures: the game has no vertical dimension.** 21 940 readable-enemy samples put **0.1 % of
them in the top third of the screen**. Every fight, for the whole game, happens on one
horizontal line at the player's own altitude. After Burner is a game about climbing and diving
and this build is played on a wire. That is my #1 gap and it is §6.

The second reason is that **the player cannot find their own aircraft.** `feel-01` and
`frame-0013` show the F-14 at the same screen size as the enemies, in the same grey-tan value
range, routinely overlapped by two of them. In the arcade (`stage4-vulcan-stream-t214.png`) the
player's jet is the biggest, brightest, most central thing on screen and is never in doubt.

---

## 2. Fairness — judged separately from difficulty, as asked. **The defect is fixed.**

This is the finding I am most confident in, because I verified the *mechanism* rather than the
flag that reports on it.

**What the code does.** `flow.js:_triggerDeath` no longer calls `combat.clear()` — correct, and
it is what bought the playable share. The exposure that created is closed in
`combat.js:checkPlayerHit`, which calls `clearShots()` on the **rising edge of the grace
window**, i.e. the respawn, retiring every enemy round in the air while leaving the aircraft,
smoke and brackets alone. The fairness contract is one sentence and it is the right one: *every
round that can kill you was announced by a flare you could see, and the flare is honest because
the round is aimed at where you were when it lit* (`enemy.js TELEGRAPH_S = 1.0`, aim snapshotted
at ignition and never refreshed; `enemyShots.js SPEED = 15`).

**Independent verification (telemetry, not the flag).** Across **39 respawns in 7 seeds**, the
count of enemy rounds in the air goes to **0 exactly one tick after every single respawn**
(e.g. seed 2: `8,8,8 → [8] → 0,0,0,0`). The one-tick lag is `_updateDeath` setting
`state='flight'` on a tick that still returns `combatActive:false`; it is 1/60 s and harmless.
`clearShots()` is real, not asserted.

**The fairness statistic itself**, pooled over 7 seeds / 1260.1 s / **61 fatal hits**:

| | value |
|---|---|
| fatal hits whose announcing flare lit **before the life began** (`announced:false`) | **0 of 61** |
| hits taken inside the 2.0 s grace window | **0** |
| minimum warning available **within the life** that killed | **2.25 s** |
| median in-life warning | **2.38 s** |
| fatal hits with under 1.0 s of in-life warning | **0 %** |

**The 17 % figure is now 5.3 %, and the 5.3 % is not the same defect.** Of 38 post-respawn
lives, **0 ended inside the grace window** and **2 (5.3 %) ended within 1 s of it expiring** —
but both of those two had 2.30 s and 2.72 s of in-life warning. They are deaths the pilot flew
into, not deaths that were posted before the pilot existed. Shortest life in 21 minutes: 2.92 s.

**Honest residuals, all of which I found by looking for them:**

1. **Enemies mid-telegraph across the respawn boundary are not reset.** `clearShots()` retires
   rounds in the air; it does not touch `enemy.telegraph`, `burstLeft` or the aim snapshot. An
   enemy whose flare lit at the dying jet will pay out its train into the new life, aimed at a
   snapshot of a jet that no longer exists — `announced:false` by construction. Observed at **3
   of 39 respawns** (a flare already lit at the respawn tick, or a round spawned on it). It
   produced **0 of 61 fatal hits in 21 minutes** — the geometry saves it, because the aim point
   is wherever the previous life died and the respawn enters from the bottom. **It is a latent
   hole, not an active defect.** The fix is the same edge: clear telegraph/burst state there too.
2. **The sky re-arms immediately.** Median time from respawn to the first lit flare is **0.50 s**
   and **97 % of respawns have a flare lit inside the 2.0 s grace**. That is intense but it is
   *announced*, and the grace is doing nothing — which is the correct outcome once shots are
   cleared, and is the argument `combat.js` makes for preferring `clearShots()` over a longer
   threat-aware grace. I agree with that reasoning.
3. `hitLog` is capped at 256 entries. At 61 hits in 1260 s it never truncated here; a longer run
   would silently lose the early ones.

**Verdict: the respawn-into-live-fire defect is closed at the mechanism level, not papered
over.** This is the strongest piece of engineering in the round.

---

## 3. Difficulty — and **the arcade's own death rate, measured.**

The brief called this the highest-value item. I got it, with a cross-validation strong enough
that I would defend the number.

### 3.1 A better instrument than warm-fraction spikes

`criteria-fix`'s R5c attempt (GAME_SPEC §2) used a warm-pixel spike detector, got 43 events at
**~43 % precision**, and withdrew it with a bound of ~1.3/min. Its recall was structurally
suppressed in the bright-yellow stages, where the ground *is* the feature.

**I used a different signal: the score freezes while dead** (GAME_SPEC §2, MEASURED). That is a
fixed-position, high-contrast, polarity-independent region, so it is immune to the stage palette
that defeated the warm-fraction operator. Operator, in full:

- `ffmpeg -vf "crop=104:22:186:20,format=gray"` over the whole 866.43 s / 25 993-frame file —
  the score-digit region, located at x 191–281, y 26–37 of 640×360 by masking warm text in
  `reference/respawn-ready-gp-t207.png`.
- Per-frame change = count of pixels differing from the previous frame by > 40 grey levels.
- Zero-runs ≥ 20 frames (0.67 s), then clustered with a 4.0 s gap → **31 clusters**.
- **Every cluster cropped and read as a 6-frame filmstrip** at −1.0/+0.5/+1.5/+2.5/+3.5/+5.0 s
  (`feel-07-arcade-death-filmstrips.png`). A death is unmistakable in that form: screen-filling
  starburst → empty sky with the score pinned → **READY** card → oversized jet from the bottom.

**Instrument validated on known input before use:** it recovers **4 of the 4** deaths
hand-identified in GAME_SPEC §2 (gp t198–218, t257, t271, t281) as clusters #5, #7, #8, #9.

### 3.2 The count, and the cross-validation that makes it trustworthy

**27 deaths** in the play span. 2 clusters are the runway restock stages (t292.3, t760.1), 2 are
the attract/title/instruction screens and the game start, 1 is the final GAME OVER card — all
identified by eye on the filmstrips, not by threshold.

The cross-validation is the part worth keeping. The filmstrips independently show **9
CONTINUE PLAY screens**. Partitioning the 27 deaths by those 9 continues gives:

```
deaths per credit: [3, 3, 3, 3, 3, 3, 3, 3, 3]
```

**Nine groups of exactly three, with no exceptions.** A missed death would make some group read
2; a false positive would make one read 4. Neither occurs. This simultaneously establishes
precision ≈ 100 %, recall ≈ 100 %, **and measures the arcade's lives count as 3** — which
GAME_SPEC §2 currently carries as **ASSUMED** ("not derivable from this footage"). It is
derivable, and it is 3.

### 3.3 The denominators

The death cycle, measured by frame-stepping a clean death (cluster #6, `death-cycle.png`): hit
at ≈ t224.4 → control restored at ≈ t232.2 = **≈ 7.8 s**. GAME_SPEC §2 independently states
8–9 s across four instances. Two instruments agree; I use 7.8 s and give the 9 s variant as the
other end. Continue screens are *inside* the cycle, not added to it (cluster #7: starburst →
empty → CONTINUE PLAY → READY → flight).

Play span = carrier launch (t47.4, score 0) → GAME OVER (t841.2) = **793.8 s**.

| | **ARCADE** (measured here) | **OURS** (7 seeds, 1260.1 s) |
|---|---|---|
| deaths | 27 | 61 |
| **playable share of wall clock** | **69.4 – 73.5 %** | **71.9 %** |
| **deaths / min of WALL CLOCK** | **2.04** | **2.90** |
| **deaths / min of FLIGHT TIME** | **2.78 – 2.94** | **4.04** |
| non-interactive per death | 7.8 – 9.0 s | **5.12 s** |
| lives per credit | **3 (measured)** | 3 |

**Which denominator the criterion should use: flight time, primary, exactly as GAME_SPEC §2's
R5c restatement already says.** I used both and report both. The restatement's reasoning is
correct and my measurement confirms its mechanism — our wall-clock figure is held down *only*
by a death cycle 34 % shorter than the arcade's.

### 3.4 What this settles, and what it does not

**It retires the ≤1.5 gate outright.** The arcade fails it on both denominators, by 36 % on
wall clock and by 85–96 % on flight time, with a competent human at the controls. A lane tuning
to ≤1.5 would be building a game **half as lethal as After Burner II**. That is the ninth
criterion this project has had to retire, and it is the same defect family: a plausible number
that was never checked against the arcade.

**`criteria-fix`'s deeper point survives and I endorse it**: a deaths/min figure read off a
recording measures *that pilot*, not the game. But their two data points now bracket the
question instead of contradicting it:

| source | deaths/min wall | what it measures |
|---|---|---|
| `ab2-longplay.mp4` (988 s, 23 stages) | **0.00** | an expert exhibition clear — a superplay |
| `ab2-gameplay.mp4` (793.8 s, 9 credits) | **2.04** | an ordinary competent player paying to play |
| our `?demo=1` | **2.90** | a **non-reactive autopilot** |

**That bracket is the useful result, and it is decision-relevant.** Our pilot is a pure function
of `simTime` (`demoTimeline.js` — no RNG, no reaction, it cannot dodge). It dies **1.42×** as
often as a human who *can* dodge. A policy that cannot dodge should die *far* more than one that
can; it dies only 42 % more. **The honest reading is that for a player who actually reacts, this
build is at or below arcade lethality** — and that the remaining difference is mostly the
autopilot's. Use deaths/min as `criteria-fix` says: a **regression guard** on the flight-time
denominator, same seeds, same tree. Not a target.

**The flight-share number is the one that transfers cleanly**, because it is a property of the
game's structure rather than the pilot's skill: **arcade 69.4–73.5 %, ours 71.9 %.** That is a
match, and it closes R4 gap 5's pacing half.

### 3.5 A spec defect this turned up, with a build consequence

GAME_SPEC §2: *"Continuing resumes IN PLACE — same stage — with the score reset to ~0 (gp
t265–269 climb from ~600)."* **It does not reset.** Read off the digits at 8× across the
continue at t258–275 (`score-continue-check.png`): **485440 → 489540 (frozen through the
death) → 490000 → 497450.** It runs straight through. The cited "~600" is not on screen at
t265–269; 490000 is.

`flow.js:_updateContinue` calls `this.score.reset()` on that authority. We wipe the player's
whole score when they continue and the arcade does not — a strong disincentive to insert the
coin, built on a misread frame. **One line, and it should be deleted.**

### 3.6 A second criterion retired, by measurement

R4 §5/#10 called the vulcan "invisible" and asked for `PUFF_FRAC_NEAR 0.0125 → 0.022`, citing
"10–12 px puffs" on `stage4-vulcan-stream-t214.png`. That frame is **1028×720 — a 3.21× upscale
of the 320×224 native raster.** Measured by connected components and divided by 3.2125:

> **arcade median puff width = 4.05 native px. Ours = 4.00 native px** (`PUFF_FRAC_NEAR
> 0.0125` × 320). `feel-04-vulcan-ours-top-arcade-bottom.png`, both rescaled to a common 3.0×.

R4's target would have made our puffs **73 % larger than the arcade's**. Not acting on it was
correct. The same applies to R4's "the gun only works in the last 1.8 s" — the assist gate is
still `6 < d < 22`, and the kill rate is now **0.695 kills/s of flight against the arcade's
measured 0.54**. The gate is not starving anything; that criterion resolved itself.

**What *is* true about the vulcan and is not in R4:** the arcade ramps its puffs **1.2 → 7.5
native px** across the stream; ours ramps **3.0 → 4.0** (`PUFF_FRAC_FAR/NEAR`). The arcade's
rounds visibly rush away from you; ours are near-uniform dots. That is a size *ramp* fix, not a
size fix, and it is cheap.

---

## 4. What I confirmed of the flow lane's claims

Re-measured independently, every one of them holds. I am saying so explicitly because the
standing instruction is not to trust lane self-reports, and in this case they were accurate.

| claim | mine (7 seeds, per-tick) |
|---|---|
| playable share 70–78 % | **71.9 % pooled**; per seed 67.4–77.4 % ✓ |
| longest stretch with nothing to shoot ~4.3 s | **3.67 s** worst of 7 seeds ✓ (better) |
| continue screen under 3 % | **1.34 %** ✓ |
| non-interactive per death 5.8 s | **5.12 s** ✓ (`DEATH_TOTAL_S` = 5.2 s) |
| deaths/min 2.87 wall / 4.00 flight | **2.90 / 4.04** ✓ |
| working throttle | **41–46 detent changes per 180 s = 7.3–8.2 per 32 s stage**, `scrollSpeed` reads 42.7/68.9/99.9 ✓ |
| barrel roll | 9–12 per 180 s, `rolling` flag live ✓ |
| attract cycle | title 8 s → 24 s demo → title, verified end to end (`feel-05`) ✓ |

**Caveat that belongs on all of them: `?demo=1` is an autopilot.** "The throttle moves 8× per
stage" proves the plumbing is live, not that a player would move it. Nothing here measures a
human.

---

## 5. The death cycle is now 34 % shorter than the arcade's

`deathSequence.js`: `0.6 + 1.0 + 2.0 + 1.6 = 5.2 s`. The arcade is **7.8 s** (my measurement)
and GAME_SPEC §2 says **8–9 s, MEASURED**. `TUMBLE_S 4.5→2.0` and `RESPAWN_S 2.4→1.6` were taken
on R4's authority, and **R4's complaint was never about the duration** — it was about
`frequency × duration` and about the 4.5 s *empty rectangle*. Both of those were fixed by the
other two changes (don't clear combat; die less). The duration cut was an extra, and it moved a
constant away from a MEASURED arcade value to buy a statistic.

`feel-02-death-cycle.png` is the proof that the duration cut is no longer needed: from +1.25 s
to +3.0 s after the hit the world keeps flying, enemies are on screen, the score is pinned, and
it reads as a death rather than as a pause. That is exactly what the arcade's 7.8 s looks like.

**Recommendation: restore `DEATH_TOTAL_S` toward 7.8–8.5 s, and buy the playable share back by
dying less, not by cutting a measured constant.** Do the arithmetic first — at our current
2.90 deaths/min it costs ~5 points of flight share, which would put us at the bottom of the
arcade's own 69.4–73.5 % band rather than outside it.

---

## 6. The game has no vertical dimension — ranked #1

**Measured** (`band_probe.mjs`, 120 s of flight, `?demo=1&seed=1&invincible=1`, **21 940
readable-enemy samples**, every tick):

| enemy screen height, readable size (≥10 %W) | |
|---|---|
| p5 / median / p95 | **43.0 % / 54.4 % / 61.1 %H** |
| sd | 5.61 points of H |
| player's own median | 54.9 %H |
| **share in the top third (<33.3 %H)** | **0.1 %** |

The entire game is fought in an 18-point band centred **0.5 points off the player's own
altitude**. The top 43 % of the screen never contains anything you can shoot. R4's `feel-04`
said this impressionistically from 24 frames; it is now 21 940 samples and it has not moved.

Two causes, both still at their R4 values:

- `spawner.js` fans the echelon across a narrow `ndcY` band.
- **`player.js: ENVELOPE_Y = 1.1` against `ENVELOPE_X = 2.6`** — vertical authority is **42 % of
  lateral**. R4 asked for 1.9. Even if enemies arrived high, the player could barely climb to
  them.

**Arcade direction** (frames, not a systematic measurement — this one is honest about its
strength): `stage1-hard-bank-t98.png` has both enemies at ≈ 19–35 %H with the player at
≈ 42–58 %H — they are *above* him, in the top third, and he has to climb. **A systematic arcade
enemy-altitude distribution is unstarted and is the single best replacement criterion available**
— it is pilot-independent (unlike deaths/min), it is cheap to measure off the stage-mapped
longplay, and it is the thing this build is most obviously missing.

---

## 7. Other things I measured that damage the experience

### 7.1 The sight square swings 11.5 %W around the airframe under bank — **unfixed**

`combat.js:350` sets `sight.y = playerNdc.y + 0.30` with no roll compensation, and
`lockSystem._placeCorners` projects it through the un-rolled base quaternion — while
`player.js` goes to explicit trouble (`_rollAxisWorld`) to cancel roll out of the *jet's*
screen position. So the jet holds station and the sight rotates with the horizon.

Analytically: 0.30 NDC = 100.8 px of a 672-tall render; rotating that through 66.5° displaces it
`2 × 100.8 × sin(33.25°) = 110.7 px = 11.5 %W`. **That reproduces R4's measured 112 px / 11.7 %W
to within one pixel**, and `feel-03-sight-under-roll.png` shows it: at 0° the sight sits above
the nose, at 66.5° it is off to the side. GAME_SPEC §3 tags the sight square **MEASURED**, so it
is a real arcade element and must not simply be deleted.

**The concrete gameplay consequence is not aesthetic.** `lockSystem._nearestLockable(enemies,
sight)` selects the missile target *from the sight's position*. **Which enemy you lock therefore
depends on your bank angle.** Whether the arcade's own sight is roll-compensated is **not
resolvable in the frames in this repo** — but leaving it unexamined is not an option, because it
decides where the gun and the locks go during the manoeuvre the player spends most of their time
in. Settle it, then compensate or don't.

### 7.2 The carrier catapult launch has no carrier in it

`feel-06-opening-ours-top-arcade-bottom.png`. Ours: an F-14 with its gear down, hovering over
open sea, essentially static for **3.5 s**, score frozen at 0, with a cloud behind the tail that
reads as a smoke plume. Arcade t84: the SEGA ENTERPRISE filling the lower half of the frame,
approached from astern, deck markings, island, aircraft on deck.

This is the first 3.5 seconds a player ever sees and it is the highest-leverage 3.5 seconds in
the build. R5 shipped the *sequence* (rank 14) without the *subject*. In its current state it is
worse than no launch at all, because it spends the opening on nothing.

### 7.3 `playEnemyFlyPast` is still written and still never called

A grep of every `AudioBus.play` site in `src/` outside `src/audio/` finds `vulcan`, `lockOn`,
`missileLaunch` ×2, `explosion`, `menuStart`, `playerDeath`, `respawnReady`, `tallyTick`.
**`enemyFlyPast` has zero call sites** — unchanged from R4, and it is a complete, enveloped,
stereo-panned synth sitting unused. A jet roaring past the canopy is the single most spectacular
event in a rail shooter and it is silent. Zero new synthesis required.

### 7.4 `CLOUD_SPEED = 9.5` — unchanged

Against `scrollSpeed` 42.7/68.9/99.9. Clouds drift past **4.5–10.5× slower than the ground**.
R4 ranked this #9 at "1 constant" and it is still 9.5. In `feel-02` the same cloud holds
position and size across many consecutive tiles. It is the cheapest unclaimed speed cue in the
build. (Cloud *size* is the world lane's and is not my call; the *rate* is a feel constant.)

### 7.5 The life count is drawn but unreadable

`flow.js` now writes `hudState.lives` — R4's "the HUD actively lies" is fixed. But `drawLives`
renders a 7×4-pixel sprite at the extreme bottom-left, **underneath the SPEED label, over the
moving sea** (`hud-bottom.png`). At native 320×224 it is a smudge. You cannot tell at a glance
that you are on your last life, so there is no dread and the continue card still arrives as a
surprise. The wiring is right; the placement is not.

### 7.6 The attract demo shows one idea 24 times

`feel-05-attract-cycle.png`. The loop itself works — title (8 s) → gameplay (24 s) → title —
with real combat, real kills (HIT 0→13) and a climbing score. But frames 12 s–35 s are the same
echelon of three grey aircraft at the same altitude in the same screen region, over and over.
A passer-by watching the thing that is supposed to take their money sees one engagement
repeated. It is §6 viewed from the cabinet. It is also stage 1 for all 24 s, when two other
palettes exist.

---

## 8. Audio — read, not heard

**Inferred from code. I have heard nothing.** Captures are muted by construction.

**Fixed since R4:** the engine no longer cuts out on death (`DEATH_ENGINE_IDLE_FRAC = 0.2`
through the whole sequence). The afterburner layer is **no longer dead code** —
`smoothstep(0.75, 1.0, s) × 0.14` against `THROTTLE_ENGINE_GAIN = [0.30, 0.65, 1.0]` is now
reachable at the H detent. `setInboundWarning` is wired as the audio half of the fairness
telegraph.

**Plausibility, as asked:**

- **Vulcan rate.** `FIRE_INTERVAL_S = 0.08` → **12.5 shots/s**, each a ~40 ms pitched event. At
  80 ms spacing individual rounds are separable, so this will read as a *chatter*, not the
  continuous roar a Vulcan is remembered as. The rate is visually constrained (vulcan.js solved
  it against t214's measured 9.3 px muzzle spacing), so **the fix is to decouple the audio** —
  a looping ripping bed gated by the fire button, with the per-round transient on top — rather
  than to move `FIRE_INTERVAL_S`. **Plausible but probably thin.**
- **Vulcan timbre.** A 1100 Hz square ramping to ~500 Hz at gain 0.22, with the noise snap only
  at 0.15. **Tonal-dominant.** A gun should be noise-dominant; this will read closer to "pew"
  than to "brap". Invert that balance.
- **Explosion weight.** Lowpass-swept noise 4500→250 Hz over 0.65 s plus a sine 90→36 Hz. The
  recipe is right (noise body + sub boom), but the sub does most of its work below 100 Hz where
  laptop and cabinet speakers roll off, so the *perceived* weight is carried almost entirely by
  the noise layer. **Probably thin on small speakers.** The `big` (bomber) variant differs only
  in duration (1.7×) and level (~1.3×) — it should differ in **timbre** too (lower filter floor,
  longer tail), or a bomber will just sound like a louder fighter.
- **Afterburner swell.** Reachable, but `smoothstep(0.75, 1.0)` against three detents at
  0.30/0.65/1.0 means it is **0 at L and M and full at H**. It is a step, not a swell. The one
  thing the game is named after arrives as an on/off switch.
- **Inbound warning.** Two squares a minor third apart, 6 Hz warble, rising 650→1100 Hz, gain to
  0.16. Correct design. But my telemetry says a flare is lit in **32 % of flight frames** and the
  intensity floors at 0.25 whenever one is, so a 650 Hz square warble is sounding roughly a third
  of the time over an FM music bed. **Risk of fatigue, not of inaudibility.**
- **Still missing entirely:** any sound for an enemy round *leaving the barrel*, and the
  fly-past (§7.3).

**What a human should listen for, in priority order:**
1. Does the vulcan read as a weapon or as a typewriter? (hold fire for 3 s)
2. Does the inbound warble become unbearable over 2 minutes, or does it teach you?
3. Does an explosion have weight on laptop speakers, and can you tell a bomber from a fighter?
4. Is the L→M→H engine change audible as *speed*, and does H read as an afterburner?
5. Is there a hole where an enemy shooting at you should be?

---

## 9. Ranked by how much it damages the experience

| # | what | where | why this rank |
|---|---|---|---|
| **1** | **No vertical dimension** — 0.1 % of readable enemies above 33 %H; `ENVELOPE_Y 1.1` vs `ENVELOPE_X 2.6` | `spawner.js`, `player.js` | the whole game is one horizontal line; half of AB2's evasion vocabulary is unused. Measure the arcade's enemy-altitude distribution first — it is the best unstarted criterion in the project |
| **2** | **The player cannot find their own jet** — same size, same value range, routinely occluded by enemies | `spriteFactory.js`, `spawner.js` | `feel-01`; the arcade's F-14 is never in doubt. Scale/contrast/depth-order, not a redraw |
| **3** | **Death cycle 5.2 s against the arcade's 7.8 s** | `deathSequence.js` | a MEASURED constant was cut to buy a statistic that the other two fixes had already bought |
| **4** | **Score reset on continue** — the arcade does not do this | `flow.js` | one line; built on a misread frame (§3.5), and it actively punishes continuing |
| **5** | **The carrier launch has no carrier** | `launchSequence.js` | the first 3.5 s of every game, currently spent on nothing |
| **6** | **Sight swings 11.5 %W under bank and selects your lock target** | `combat.js`, `lockSystem.js` | decides where the gun goes during the manoeuvre you spend most of your time in |
| **7** | **Attract demo repeats one engagement for 24 s, stage 1 only** | `demoTimeline.js`, `spawner.js` | this is the thing that has to take the coin |
| **8** | **`CLOUD_SPEED 9.5`** against scroll 42.7–99.9 | `clouds.js` | one constant; cheapest unclaimed speed cue |
| **9** | **`enemyFlyPast` never called** | `spawner.js` | written, tested, free |
| **10** | **Life icons unreadable** — 7×4 px under the SPEED label over moving sea | `ui/hud.js` | no dread on the last life |
| **11** | **Telegraph state survives respawn** (latent, 0/61 hits) | `combat.js`, `enemy.js` | close the hole while the fairness model is fresh |
| **12** | **Vulcan size *ramp*** 3.0→4.0 px vs arcade 1.2→7.5 | `vulcan.js` | NOT a size fix — size already matches to 0.05 px (§3.6) |

**Criteria I am asking to retire, with the measurement that retires them:**
- **≤1.5 deaths/min** — the arcade itself reads **2.04 wall / 2.78–2.94 flight** (§3). Ninth
  retirement; same defect family.
- **R4's `PUFF_FRAC_NEAR → 0.022` / "the vulcan is invisible"** — arcade median puff **4.05
  native px**, ours **4.00** (§3.6). The "10–12 px" was read off a 3.21× upscale.
- **R4's assist-gate `22 → 55`** — kills are already **0.695/s of flight** against the arcade's
  0.54.

**Criteria I am asking to add to GAME_SPEC as MEASURED, from §3:**
- Arcade lives per credit = **3** (currently ASSUMED; 9 credits × exactly 3 deaths, n=27).
- Arcade playable share of wall clock = **69.4–73.5 %**.
- Arcade continue does **not** reset the score (§3.5 corrects GAME_SPEC §2).

---

## 10. Observed vs inferred

**Observed in frames** (`tools/out/feel-critic-r5/`, 5 capture sets, 123 frames, all swept):
every tile of a 60-second run containing aircraft; the death cycle keeping a live sky under the
tumbling hulk; the sight swinging off the nose across 0–66.5° of roll; the carrier launch with
no carrier; the attract loop completing title → demo → title; the vulcan at a common native
scale against t214; life icons illegible over the sea.

**Observed in the arcade footage:** 27 deaths and 9 continues in `ab2-gameplay.mp4`, each
cropped and read as a filmstrip; the 3-lives partition; the ≈7.8 s death cycle; the score
running straight through a continue; enemies above the player in t98.

**Measured by telemetry, not visible in frames** (7 seeds × 10 801 ticks + a 7 200-tick band
probe): the 71.9/24.8/1.34/1.95 % state split; 61 deaths and both rates; 0 unannounced fatal
hits and the 2.25 s minimum warning; enemy shots clearing at all 39 respawns; the 38
post-respawn life lengths; the 3.67 s worst drought; 0.1 % of readable enemies in the top third;
throttle and barrel-roll counts.

**Inferred from code only — not experienced:** all of §8, and §7.1's claim that the sight swing
is *disruptive* (the 11.5 %W displacement is arithmetic and confirmed in stills; whether it
ruins aiming in motion needs hands). Also not experienced: whether 12.5 rounds/s *feels* like
a weapon, and whether a 2.0 s grace that is almost always already under a lit flare reads as
generous or as cruel. **Someone has to hold the controls and put headphones on.** Everything in
§§2, 3, 6 stands without that; §8 does not.

**No source file was modified. Nothing committed, nothing pushed.**

### Evidence

| file | shows |
|---|---|
| `feel-01-one-minute.png` | 72 tiles = 60 s. R4's same grid; **zero empty tiles** (R4 had 25) |
| `feel-02-death-cycle.png` | one death at 0.25 s. Live sky under the hulk; the 4.5 s empty rectangle is gone |
| `feel-03-sight-under-roll.png` | the sight square swinging off the nose across 0 → 66.5° of world roll |
| `feel-04-vulcan-ours-top-arcade-bottom.png` | ours vs t214 at a **common 3.0× native scale** — 4.00 vs 4.05 px |
| `feel-05-attract-cycle.png` | title → 24 s demo → title, and its repetitiveness |
| `feel-06-opening-ours-top-arcade-bottom.png` | our carrier launch with no carrier, against arcade t84 |
| `feel-07-arcade-death-filmstrips.png` | all 29 arcade freeze clusters as filmstrips — the 27 deaths, 9 continues and 2 runway stages, read by eye |

Probes, raw data and the self-tested sweep are in `tools/out/feel-critic-r5/`
(`feel_probe_r5.mjs`, `band_probe.mjs`, `analyse.py`, `sweep.py`, `run-demo-s1..7.json`,
`score_strip.raw`, `cand-sheet*.png`, `death-cycle.png`, `score-continue-check.png`).

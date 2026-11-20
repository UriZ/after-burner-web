# R39 playtest verdict — fresh-context agent, hands on the stick

## The five sentences

1. Banking hard and watching the whole coastline roll over finally feels like After Burner, and the burnt jet tumbling into the sea when I die is the best moment in the game.
2. The guns feel generous, but the kills pop either right on my wingtip or way off at the edge of the screen — almost never out in front where I'm actually aiming.
3. Missiles leave the rail whenever I press the button, with or without a lock, then wander around the sky for ages and kill something far away that I never feel I earned.
4. Both times I died while actually flying, the fireball came out of nowhere — I never saw the shot or the plane that got me.
5. Long stretches of sky are empty, and the game racks up kills and score even when I let go of the stick, so it still feels like it half plays itself unless I force a fight.

**Score: 6.5 / 10** — playable and real, clearly better than "pretty bad", but the missile
loop, unexplained deaths, and the self-playing kill flow keep it out of "solid".

## What I did

- Arcade calibration first: 2 × 4 s consecutive 60 Hz bursts from `ab2-longplay-60fps.mp4`
  (t=100 s, t=110 s), viewed every ~10th frame (0.17 s step).
- Selftest 8/8 before play.
- **Session A** seed 7: 72 turns, ticks 0→6905 (~115 sim-seconds). Stage 1 → 2 → 3,
  three deaths, game over, CONTINUE PLAY screen.
  Session: scratchpad `r39-s7` (`commands.jsonl` re-derivable).
- **Session B** seed 3: 51 turns, ticks 0→3865 (~64 sim-seconds). Stage 1 → 2, two deaths,
  full death→respawn watched, double-tap roll, throttle L→H, deck dive + envelope climb.
  Session: scratchpad `r39-s3b`.
- Total ≈ 3 sim-minutes of play, two seeds, no invincibility.

## Aiming control experiment

- **Best play** (steering at enemies, both weapons): ~33 kills in ~47 s active play
  (seed 7, ticks 120→2945; stage-1 hits 0→18 plus stage-2 hits 0→15). ≈ 0.70 kills/s.
- **Blind control** (stick centered, fire held, 60 s, seed 7 ticks 2945→6545): ≥15 kills
  ≈ 0.25 kills/s — and I died three times (lives 3→0), reaching stage 3 anyway.
- Felt answer: aiming genuinely matters now (roughly 2–3× the blind rate — far better
  than R11's 91 % blind share), but a player holding nothing but the trigger still mows
  down an enemy every ~4 s, and the score ticks up ~3,300/minute by itself (1.1 M by
  stage 3 in the blind run). Kills and score still arrive without being earned.

## Ranked gaps (player language)

1. **The missile never feels like mine.** It launches with or without a lock (stock
   dropped firing into empty sky, seed 7 turn 11), locks form rarely and usually not
   where I'm pointing, missiles loiter in flight 3+ seconds, and the kill lands far away
   or inside a cloud. I fired ~30 missiles across both seeds and can honestly attribute
   maybe 3–4 kills to them. Evidence: `playtest-evidence/s3b-t15-missile-arc-top.png`
   (I aim at the horizon, lock bracket + missile trails arc to top of screen, no kill;
   seed 3 ticks 1015–1060); `s7-t15-missiles-no-lock.png`.
2. **It still half plays itself.** Blind hold killed ~15 enemies in 60 s; long stretches
   (seed 7 ticks 620–1490, ~15 s) had zero incoming shots, then a 30-shot barrage from
   one wave. Pressure is bursty, and between waves there is nothing to do. Evidence:
   seed 7 turns 65–70 telemetry (blind kills + 3 deaths); `s7-t34-headon-asterisk.png`
   (the barrage wave).
3. **Deaths while playing come out of nowhere.** Mid-climb in open sky the jet just
   fireballed (seed 3 ticks 300–450, `s3b-t4-death-from-nowhere.png`); in seed 7 turn 65
   a crossing enemy touched me and I exploded with no readable incoming shot. The death
   ANIMATION is great (fireball → charred jet tumbling, `s3b-t6-death-tumble.png`), but
   the CAUSE is never visible, and control lockout ran ~6.5 s (seed 3 ticks ~440→830),
   which felt long.
4. **Kills land at my wingtip or at the screen edge, not at the sight.** Gun kills
   repeatedly exploded directly on my own wing (seed 3 tick ~1240,
   `s3b-t19-wingtip-kill.png`; seed 7 turn 2) or far off at the edge — the arcade's
   mid-distance "kill out in front of you" picture almost never happened.
5. **A cloud is glued to my jet, and stage 3's ground reads as static.** The jet flies
   inside a white cloud mass most of the game, hiding the fight
   (`s3b-t51-cloud-glued-to-jet.png`); the stage-3 night ground is salt-and-pepper RGB
   noise (`s7-t70-night-static-respawn.png`); the head-on enemy sprite reads as an
   orange asterisk, not a plane (`s7-t34-headon-asterisk.png`).

## Per-weapon report

- **Vulcan**: held `--fire 1` most turns. Visibly streams rounds; kills register
  steadily — including with the stick untouched. Satisfying rate, wrong kill placement
  (wingtip / screen edge). Never ran out of ammo.
- **Missile**: held/pulsed `--missile 1` ~30 launches, both seeds. Launches regardless
  of lock; locks (telemetry + cyan bracket) appeared ~10 times, mostly when the sight
  sat low near the horizon; the bracket often grabbed an enemy I wasn't pointing at
  (top of screen). Kills: small distant explosions, 2 confirmed by in-flight-count drop
  + hit increment (seed 7 turns 7, 19). Stock restocks to 50 at stage transition — never
  felt scarce.
- **Verbs I never needed**: throttle (H closes faster but nothing demanded it), the
  barrel roll (works — jet visibly rolls through inverted, seed 7 turn 9, seed 3 turn 13 —
  but nothing ever made me need one), and dodging (I survived a 30-shot barrage banking
  randomly; incoming fire rarely threatened me when moving).

## What genuinely reads like AB2 now

World roll under hard bank (coastline tilts 30–45° and stays), the desert-sunset stage 2
with HIT COUNTS tally, the charred-jet death tumble, CONTINUE PLAY / INSERT COIN
countdown, SAM site firing from the coast (seed 7 turn 22), missile smoke trails.
The stage transition itself is instant — the tally overlays live combat with no pause
(`s7-t42-stage-transition.png`), where the arcade gives a breath.

## Instrument limits

No audio; ~0.5–1 s decision cadence (my turn length is my sampling rate — feel claims
finer than that are not mine to make); strips are 6 panels/turn, not video; arcade
calibration viewed at 0.17 s steps.

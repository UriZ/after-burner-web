# R38 playtest verdict — fresh-context naive player

## The five sentences

This finally plays like After Burner — the sea gives way to a desert and then a night
city, a tanker refuels me between stages, and when I slam the stick the whole world
rolls over hard enough to make me grin. The missiles actually work now: I point
roughly at a plane, a lock box snaps on, I press the button, and a second later that
plane is a fireball — that loop is satisfying and I did it over and over on purpose.
But almost every gun kill explodes directly on my own nose, so half the time a kill
looks exactly like my own death, and my jet spends whole seconds buried inside
someone else's fireball. I died again and again without ever seeing the shot that got
me — the killer is one slow orange puff among dozens of identical drifting puffs, or
a plane that pops up full-size the same instant I blow up — and then the game just
hands me fresh lives at the next stage, so dying never costs anything. Between the
brawls there are stretches of totally empty sky, and some enemies just park in
formation next to me like wingmen instead of attacking, which is where the arcade's
relentlessness still isn't here.

## Score: 7 / 10

Solid and playable with clear rough edges. Both weapons are usable by a naive player
(the missile loop is genuinely satisfying; the gun works too well without aiming),
there is real stage variety and a working death/respawn/bonus/refuel structure, and
the picture reads as After Burner II. What keeps it out of 8+: kills detonate on the
player's own jet, deaths are illegible and consequence-free, and the gun does not
reward aiming.

## What I did

- **Sessions**: seed 7 (`s1`, 4406 ticks ≈ 73 s, 52 turns), seed 11 (`s2b`, 5974
  ticks ≈ 100 s, 41 turns), seed 3 (`s3`, 720 ticks ≈ 12 s, 3 turns). Total ≈ 3.1
  sim-minutes. Session dirs (full `commands.jsonl` + strips, re-derivable):
  `/private/tmp/claude-501/-Users-urizonens-dev-afterburner-three/b41228a0-594b-4891-9d20-7b35150ada55/scratchpad/r38/{s1,s2b,s3}`
- Selftest 8/8 before play. Arcade calibration: two 60 Hz bursts from
  `ab2-longplay-60fps.mp4` at t=100 s and t=110 s, viewed every ~10th frame (0.17 s
  step).
- Reached stage 2 in both long sessions and stage 3 (night city) in s2b, through the
  air-refuel set-piece. Died 7 times total (4 in s1, 2 in s2b, 1 in s3). Never saw a
  game-over despite reaching lives 0 in s1.

## Weapons: what I tried, what visibly happened

- **Vulcan (fire held)**: yellow tracer stream visible from the jet. Kills come when
  enemies cross the center — explosions bloom AT my own jet nearly every time
  (s1 turn-0003, turn-0027: 3 kills in half a second, all point-blank). Works with no
  aiming at all.
- **Missiles (missile held)**: cyan lock box forms when the sight is near an enemy,
  missile launches with a visible smoke trail, kill explosion follows 1–2 s later at
  the target (s1 turn-0006 first missile kill; s2b turns 3–6, 13–15 repeated naive
  lock→launch→kill). ~20 missiles spent, roughly a dozen missile kills across
  sessions. Stock refills at the stage-3 tanker ("RELOAD WEAPONS", s2b turn-0035).
  **A naive player can use the missile by pointing and pressing — it works.**
- **Double-tap barrel roll**: two ±1 stick turns of 8 ticks each triggered a visible
  roll past vertical with the horizon slamming to ~50–60° (s1 turn-0009, s2b
  turn-0009). Holding full bank keeps the world dramatically rolled.
- **Throttle L/M/H**: edge-triggered per turn (s1 turns 23–24); at my ≥1 s cadence I
  could not feel a difference — no claim either way.

## Aiming control experiment (felt answer + numbers)

- Felt: **aiming matters for missiles only**. Locks formed only when I steered the
  sight near enemies, and missile kills followed. The gun killed whatever crossed the
  center regardless of my stick.
- Numbers: stick-centered + fire held: 0 kills in 8 s (s1 ticks 2186→2666), then
  +4 kills in ~4 s (s1 turn 43), and +4 kills in 8 s in stage 2 (s1 turns 44–46,
  hits 1→5). My best aimed gun+missile play in the matched stage-2 window: +3 kills
  in 16 s (s1 turns 49–52). **Blind fire out-scored aimed play per second.** The R11
  "aiming doesn't cause kills" finding still holds for the vulcan; it no longer holds
  for missiles.

## Ranked gaps (player language)

1. **Enemies die on my nose, not out in front.** Nearly every gun kill detonates at
   point-blank on my own jet; my plane vanishes inside the fireball and a kill is
   visually indistinguishable from my own death for a beat.
   Evidence: `judging/R38/evidence-kills-on-nose-s1t27.png` (s1 ticks 1616–1646);
   also s1 turn-0003 (ticks 240–270), s2b turn-0025.
2. **I die without seeing the killer.** 7 deaths in ~3 minutes; the fatal round is a
   slow orange puff identical to dozens of ambient ones, or a crosser that appears at
   full scale the instant it kills (s2b turn-0029 panel 1). Nothing distinct flashes,
   closes, or warns.
   Evidence: `judging/R38/evidence-illegible-death-s2bt29.png` (s2b ticks 2854–3094);
   also s1 turn-0032 (ticks 1766–1796), s3 turn-0002 (ticks 240–480).
3. **The gun doesn't care whether I aim.** Centered-stick fire-held play harvested
   kills as fast as (actually faster than) deliberate play; only the missile rewards
   pointing at things. Control numbers above.
   Evidence: s1 turns 36–46 telemetry vs turns 49–52 (session commands.jsonl).
4. **Dying costs nothing.** Lives refilled 0→3 at the stage-1→2 transition and I
   never saw a game over despite burning all three lives in stage 1; death is a ~6 s
   cutscene (hit ≈ tick 440 → respawn ≈ tick 800, s1 turns 10–13), then back to it.
   Evidence: `judging/R38/evidence-lives-refill-s1t43.png` (s1 ticks 3146–3386,
   lives 0→3, hit-bonus tally).
5. **Dead air and parked enemies between brawls.** Multiple 4+ s stretches with zero
   enemies on screen while I fire into nothing, and enemies that cruise in formation
   beside/ahead of me without attacking for seconds.
   Evidence: `judging/R38/evidence-empty-sky-s1t24.png` (s1 ticks 1376–1436, enemies
   0 for ~4 s across turns 21–24); parked wingman s1 turn-0014 (ticks 926–956), s2b
   turn-0002.

## Instrument limits

No audio, decision cadence 0.13–4 s per turn (mostly 0.5–2 s), six-panel strips not
video — any feel claim finer than my turn length is not mine to make; incoming-fire
dodgeability in particular is judged at a 1 s cadence, coarser than a human's.

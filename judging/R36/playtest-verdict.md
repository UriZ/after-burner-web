# R36 playtest verdict — fresh-context naive player

## The five sentences

It finally plays like a fight — I point at planes, hold the trigger, they blow up in big orange blooms, and when I bank hard the whole world tips over just like the arcade. The missile button works when a lock happens, but I can never tell when I'm locked — the little blue box hugs my own jet instead of the enemy, and sometimes the button simply does nothing. Almost everything dies right on my nose: enemies stream into my face and explode there instead of me hunting them out in the distance, so aiming feels less like hunting and more like holding a funnel. I died over and over without ever seeing the shot that got me, which made dying feel random instead of scary. Flying straight is a flat screensaver and my double-tap never gave me a barrel roll, but the stage changes, the night city, the midair refuel, the crash into the sea, and the INSERT COIN countdown all made it feel like a real arcade game I'd put another credit into.

## Score: 7 / 10

Solid and playable with clear rough edges (recalibrated play-experience scale). Both
weapons are usable by a naive player, aiming demonstrably matters, death/respawn/continue
and stage variety all read arcade. What keeps it out of 8+: lock-on illegibility and the
occasionally-inert missile button, the point-blank kill geometry, and unexplained deaths.

## What I did

- Sessions: seed 7 (ses1, 27 turns, ~120 s sim) and seed 42 (ses2, 15 turns, ~76 s sim),
  ~3.3 sim-minutes total, no invincibility. Selftest 8/8 before play.
- Command logs: `judging/R36/playtest-evidence/ses1-commands.jsonl`, `ses2-commands.jsonl`
  (sessions fully re-derivable from seed + log).
- Arcade calibration first: two 4 s consecutive 60 Hz bursts from the mapped longplay
  (t=100 s, t=110 s), viewed at 0.17 s steps.
- Experienced: stage 1 (sea) → tally → stage 2 (desert) → refuel (night tanker) →
  stage 3 (night city); six-plus deaths with fireball→tumble→sea-splash→READY respawn;
  game over → CONTINUE PLAY / INSERT COIN countdown; throttle L→H; envelope top and
  sea-level dive; double-tap slam for barrel roll (not seen).

## Aiming control experiment (owner's standing complaint)

- Aimed play (steering sight onto enemies, fire held): ~16 kills in ~17 s of aimed-fire
  turns (ses1 turns 2, 4, 11–14, 18).
- Stick-centered, fire held, hands off (ses1 turns 22–24, 45 s): 15 kills, two deaths,
  and the game cleared stage 2 on its own.
- Felt answer: aiming matters now — chasing targets kills visibly and roughly three times
  faster — but blind fire is still very productive because enemies converge onto the nose
  and die there. The funnel geometry, not the gun, is what makes blind fire work.

## Weapons — what I tried, what visibly happened

- **Gun**: held fire while steering at enemy flights. Tracers visible, kills immediate
  and plentiful, big orange blooms right in front of the jet (ses1 t2: 4 kills in 1 s;
  INT counter climbs fast). Entirely usable, satisfying.
- **Missile**: pointed at enemies and held the button like a naive player. Launches only
  when a lock forms: ses1 stock went 50→41 across the session with kills blooming above
  the nose (t3–t5); but in ses2 turn 5 I held the button for 4 s with 3–5 enemies on
  screen and NOTHING launched (stock stayed 50), then the next turn launched three. The
  cyan lock box mostly sits at/near my own jet's nose, so I never knew whether I was
  locked; when it did sit on a distant enemy (ses1 t12 final, t27 final) the missile
  killed. Verdict: works, but the lock cue is illegible and the button feels dead when
  no lock exists.

## Ranked gaps (player language, max 5)

1. **"I can't tell when I'm locked on, and sometimes the missile button does nothing at
   all."** The blue lock box hugs my own jet where enemies converge; with no lock the
   button is silently inert. Evidence: `playtest-evidence/ses1-t0003-missile-nolaunch-lockbox.png`
   (ses1 ticks 180–240); ses2 ticks 296–536 (4 s hold, zero launches, stock 50 unchanged).
2. **"Everything dies point-blank on my nose — I never kill anything out in the distance."**
   Kills cluster at the jet because enemies funnel into it; arcade kills happen across
   depth. Evidence: `playtest-evidence/ses1-t0005-pointblank-kills.png` (ses1 ticks
   300–360), `playtest-evidence/ses2-t0008-nose-kills-tracers.png` (ses2 ticks 1016–1256).
3. **"I kept dying without seeing the shot that got me."** Four of my six deaths had no
   visible incoming fire in the panels before the fireball (telemetry showed 0 enemy
   shots on screen at death). Evidence: `playtest-evidence/ses1-t0015-death-unseen-shot.png`
   (ses1 ticks 1370–1550); ses2 ticks 2156–2756. Side note for the round: score snapped
   to exactly 84755 at the first death in BOTH seeds — looks scripted or buggy.
4. **"Flying straight is a flat screensaver."** Stick centered, the horizon is dead level
   and static; the arcade longplay sways and rolls continuously even in cruise. Evidence:
   `playtest-evidence/ses2-t0001-flat-cruise.png` (ses2 ticks 0–240) vs arcade burst at
   t=110 s.
5. **"My double-tap never gave me a barrel roll — just a hard bank."** Full-left then
   full-right inside ~0.27 s produced a dramatic held world roll but no visible 360°
   aircraft roll. Evidence: `playtest-evidence/ses2-t0004-slam-no-barrelroll.png` (ses2
   ticks 240–296). Caveat: my panels are ~7 ticks apart; a very fast roll could hide
   between them.

## Instrument limits

No audio; decision cadence ~1–10 s per turn; strips are 6 panels per turn, not video —
any feel claim finer than my turn length (lock flash timing, roll animation frames,
sub-second hit feedback) is beyond this session's sampling.

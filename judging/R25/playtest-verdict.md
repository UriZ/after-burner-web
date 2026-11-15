# R25 playtest verdict — naive play, fresh context

## Five sentences (player language, outranks every scalar)

The missiles work now — I point at the enemies, press the button, and heat-seekers streak
out, lock on and blow them out of the sky in big orange fireballs, and clearing a wave feels
great. My jet and the enemy jets both look like real planes now — mine's a proper F-14 with a
body and tails instead of a bug face, and the grey MiGs read as crisp swept-wing fighters.
But my cannon is dead — I held the trigger right on top of a pack of enemies for a solid stretch
and killed exactly nothing, so half my guns do nothing and only the missiles actually fight.
Flying feels right: the world banks hard when I turn, I can get shot down, and the death-and-
tumble reads like the arcade. It went from "no weapons" to "one great weapon and one broken one" —
real and fun in bursts, but a first-timer who reaches for the gun first will feel the same
"my weapon does nothing" I'd have felt last build.

## What I did

- Fresh context. Watched 8 s of mapped arcade longplay at 60 Hz (0.17 s step) for feel calibration
  (busy sky, many jets, constant big orange fireballs, hard diagonal roll).
- Selftest 8/8 before play. Two seeds (7, 13), ~20 min sim-time, 42 turns, no invincibility.
- Session logs: `scratchpad/sess1` (seed 7) and `scratchpad/sess2` (seed 13), each
  `commands.jsonl` + `turns/` is fully re-derivable.
- Instrument limits: no audio, ~1 s decision cadence (20–120 ticks/turn), strips not video —
  no feel claim finer than a turn.

## The measured answers

### Missiles — USABLE (owner's #1 complaint FIXED)
Naive play, point-and-press, no band-camping:
- Seed 7 missile-only (`--missile 1`, stick roughly at enemies): **5 kills from 7 missiles**,
  sky cleared 6 enemies → 1 (turns 6–9). Earlier gun+missile pass took the first 4 kills the
  same way. Evidence: `pt-missile-kill.png` (fireball on a locked enemy, HIT 4).
- Seed 13 missile-only: **2 kills from 5 missiles**, kills land as soon as enemies are present.
- Locks form from just pointing near the enemies (dashed reticles appear; the `locks` telemetry
  reads transiently because it clears on fire). No insider move required. This is the headline fix.

### The gun — UNUSABLE (new #1 gap)
- **0 hits across ~11 gun turns on both seeds** (~550 ticks) against 2–10 enemies, spans up to
  **23.5 %W** (large, close). Tried the sight high at the rail, low near center, and precise
  short-turn placement — nothing. Evidence: `pt-gun-0hits.png` (three MiGs mid-screen, HIT 0).
- Decisive check: a "precise gun" stretch showed HIT 2→4, but stock held at 45 and
  missiles-in-flight drained 3→1 — those kills were **leftover in-flight missiles**, not the gun.
- A naive player mashing the rapid-fire cannon (the obvious first button) kills nothing. This is
  the *same class of failure the owner flagged for missiles*, now living on the gun.

### Sprites — GOOD ENOUGH now (owner's #2 complaint largely addressed)
- Player F-14 (`pt-crop-player.png`): central cream fuselage, pink canopy, canted twin tails,
  swept wings, twin big flame nozzles. The "insect face" is gone; it reads as a real jet and the
  hard-bank pose holds its mass. Minor: the palette leans heavily red/cream vs the arcade's
  grey-white-with-red-trim — a color-balance nit, not a "not a plane" problem.
- Enemy MiGs (`pt-crop-enemies.png`): crisp grey swept-wing fighters, red cockpit block, twin
  tails, nose antenna — clearly aircraft now, not flat darts. Red cockpit a touch large/bright.

### Feel — right
- World rolls hard and holds the bank when you turn (horizon tilts ~45°); cruising straight is a
  flat screensaver (expected — AB2 is calm until you steer).
- Death is real: flew passively into fire, lives 3→2, multi-phase fireball → starburst → tumble
  that reads like AB2 (`pt-death.png`). Enemies shoot back (enemy-shot count climbs into the teens).
- Minor: score accrues passively ~3 k/s regardless of kills, so SCORE is a weak feedback signal
  and HIT is the only honest one. AB2 does have a distance ticker, so this is a mild nit.

## Ranked R26 gaps (play language)

1. **THE GUN DOESN'T KILL — fix the vulcan the way R25 fixed the missile.** A naive player pointing
   the cannon at enemies and holding fire gets 0 kills across every engagement, both seeds. The gun
   is the rapid-fire primary and the button most players press first; right now only the missile
   fights. Give the rounds a usable convergence/hit volume at the reticle (a generous on-screen hit
   radius like the missile got), verified by NAIVE play — point and hold, enemies die. Evidence:
   `pt-gun-0hits.png`. (Combat lane — weapons/combat; this is the round's #1.)
2. **Missile balance — it may be slightly too strong / too easy.** Point-roughly-and-press clears a
   whole wave; there's little aiming skill in it (homing + generous lock paper over the same
   sight-cage-vs-enemy geometry that kills the gun). Not broken — satisfying — but once the gun
   works, re-tune so both weapons have a role and the missile is the special, not the only, tool.
3. **Player palette leans too red; enemy cockpit block a bit hot.** The shapes are good now; this is
   a color-balance pass — pull the player toward the arcade's grey-white F-14 with red trim, and
   calm the enemy's red canopy — to close the last of the owner's "not good enough" on sprites.

Deprioritized (not backdrop, but below the gun): passive-score feedback, respawn-into-fire timing
(didn't observe a cheap death). Backdrop/biomes/canyon are NOT on this list per the recalibration.

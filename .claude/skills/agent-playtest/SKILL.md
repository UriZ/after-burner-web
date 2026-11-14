---
name: agent-playtest
description: >
  PLAY the game in a closed loop — see frames, move the stick, see the consequence —
  then deliver the five-sentence player verdict the round loop runs on. This is the
  standing playtest gate of the R12 method ("look first, measure second"): it replaces
  waiting on the owner, and it is REQUIRED once per round, by a FRESH-CONTEXT agent,
  before build lanes are cut and again at the gate. Use it whenever anyone asks "does
  it feel like After Burner II", "does aiming matter", "is it fun", or wants a playtest
  without a human. Watching footage (youtube-reference) and capturing scripted pilots
  (capture.mjs) are NOT playing; only this skill holds the stick.
---

# Agent playtest — hands on the stick

You are about to play the actual game, not measure it. Your deliverable is a verdict a
player would give, in player language, that seeds the round's gap list. Numbers are
allowed only as evidence for something you felt and saw.

## The three phases, in order

### 1. WATCH the arcade first (10 minutes, once per session)

You cannot judge "does it feel like After Burner II" without knowing what AB2 feels
like. Decode two 60 Hz consecutive bursts from the mapped longplay and VIEW them:

```
ffmpeg -nostdin -loglevel error -ss 100 -t 4 -i .reference-cache/video/ab2-longplay-60fps.mp4 -vsync 0 <scratch>/arc-a/f%04d.png
ffmpeg -nostdin -loglevel error -ss 110 -t 4 -i .reference-cache/video/ab2-longplay-60fps.mp4 -vsync 0 <scratch>/arc-b/f%04d.png
```

View every ~10th frame of each burst (an 0.17 s step — fine for feel; cite it). Note:
how hard the world rolls and how long it stays rolled, how fast enemies grow and cross,
what a salvo and a kill look like, how busy the sky is. These are your calibration.

### 2. PLAY ours (the core; budget most of your time here)

Start the server in the background (unique session dir, your scratchpad):

```
node tools/playtest.mjs selftest                       # 8/8 before trusting anything
node tools/playtest.mjs serve --session <dir> --url-params "seed=7"   # run_in_background
```

Then loop — one `cmd` + one Read of the strip per turn:

```
node tools/playtest.mjs cmd --session <dir> --x -1 --y 0.5 --fire 1 --ticks 60
```

- `--x/--y` in [-1,1] (y positive = climb), `--fire/--missile` 0|1 (held for the turn),
  `--throttle L|M|H`, `--ticks` per turn (60 = 1 s; use 30 for dogfights, 120–240 for
  cruising). The printed line gives flow state, lives, score, hits, sight position,
  enemies on screen with the nearest span, locks, missiles, enemy shots, death phase.
- The strip PNG is six panels across the turn — READ it most turns; the telemetry line
  alone is not playing. The final PNG is the full-res last frame.
- `--quit` ends the session. The server idle-times-out at 15 min on its own.

**The protocol — all of it, minimum two sessions (two seeds), ≥3 sim-minutes total:**

1. **Fly it straight** for a few turns. Does cruising feel like AB2's rollercoaster or
   like a screensaver?
2. **Dogfight honestly**: chase targets with the sight, fire, launch missiles at locks.
   Does aiming feel like it causes the kills? (This was the owner's #1 complaint —
   blind share measured 91 % in R11.)
3. **Run the control experiment the complaint demands**: one stretch (≥60 s) playing
   your best, one stretch stick-centered with fire held. Compare hits. You now have a
   felt answer AND a number; report both.
4. **Slam the stick** hard left→right inside ~0.35 s (two fast turns at ±1): does a
   barrel roll happen? Does the world roll stay dramatic when you hold full bank?
5. **Use the verbs**: throttle L→H (edge-triggered per turn), missile salvos, climb to
   the top of the envelope, dive to the sea.
6. **Die.** Play without invincibility (the default), get hit, watch the death→respawn
   through the strips. Does the cycle read like AB2's? Do you respawn into live fire?
7. **Note what you never needed to do.** The strongest playtest finding is a verb the
   game never asked of you (R11: aiming).

### 3. REPORT — the five-sentence verdict, then evidence

Write `judging/R<n>/playtest-verdict.md`:

- **Five sentences, first person, player language, no numbers** — the kind of thing
  the owner would say after two minutes. This block outranks every scalar in gap
  ranking and must be quotable verbatim.
- Then: what you did (seeds, sim-minutes, turns, the command log path — the session is
  seed + `commands.jsonl` and is fully re-derivable), the aiming control result, and
  up to five ranked gaps in player language with one strip/final path each as evidence.
- State the instrument's limits in one line: no audio, ~1 s decision cadence, strips
  not video. A feel claim finer than your turn length is not yours to make.

## Hard rules

- **Session dirs are caller-unique** (capture.mjs's rule — shared paths are silent
  corruption). Use your scratchpad; copy only evidence strips into `judging/`.
- **Selftest before first use and after any src change to input/stepping hooks**
  (`__setStick`/`__step`/`__sight` in `src/main.js`, `src/weapons/combat.js`).
- **Play without `invincible=1`.** Dying is part of what you are judging. (The
  selftest uses it; a playtest must not.)
- **Do not tune anything.** You are a player, not a lane. File what you felt; the
  round decides what to do about it.
- Cite tick spans and seeds for every claim; your turn cadence is your sampling rate
  (citation field 6 applies to feel claims too).

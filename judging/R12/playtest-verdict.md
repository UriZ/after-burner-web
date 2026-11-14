# R12 playtest verdict — fresh-context agent, hands on the stick

## The verdict (five sentences, quotable verbatim)

When I slam the stick the world rolls hard, the horizon sweeps to near-vertical, and the
desert sunset looks the business — for stretches at a time this really is After Burner.
But my missiles might as well not be on the plane: I never saw a lock, never watched one
leave the rail, and the rocket count never moved no matter how fat the target sitting dead
ahead of me. Most of my gun kills happened TO me — planes flew into my wingtip and died
there while my crosshair was parked somewhere else, and my own tracer stream is so thin I
mostly can't tell I'm shooting. The crosshair itself lives in a tiny box around my nose, so
anything off-center means rolling the whole plane and hoping the target drifts through my
line of fire. Between furballs the sky goes dead, the score climbs on its own while I do
nothing, and when I lost my last life the game quietly handed me a fresh set — so nothing I
do, good or bad, feels like it matters as much as it should.

## What I did (method / provenance)

- **Arcade calibration first**: two 60 Hz consecutive-decode bursts from
  `.reference-cache/video/ab2-longplay-60fps.mp4` at t=100–104 s and t=110–114 s (stage 1
  per STAGE_MAP), viewed every 10th frame (0.17 s step). Calibration notes: horizon rolled
  hard for seconds at a time, enemies grow fast and cross close, kills are huge fireballs,
  hit counter climbs constantly during combat, big opaque clouds whip past.
- `node tools/playtest.mjs selftest` → 8/8 PASS before first session.
- **Three sessions, no invincibility, `?fixed=1`**, all run via `tools/playtest.mjs serve`
  + `cmd` turns, playing by the strip/final PNGs:
  - seed 7 free play: 39 turns, 2,922 ticks (48.7 s). 5 kills, 1 death. Verbs exercised:
    cruise, hard bank held, slam left→right in ~0.2 s (barrel roll confirmed, twice),
    dive to the deck, climb to the top, throttle L→H, vulcan, missile button (inert).
  - seed 11 "aim" session: 30 turns, 3,600 ticks (60.0 s), best-effort aiming. 11 kills
    (7 stage 1 + 4 stage 2), 2 deaths.
  - seed 11 "control" session: 21 turns, 4,380 ticks (73.0 s); the first 3,600 ticks are
    the control stretch — stick centered, fire held, zero decisions. 8 kills in the
    control window (4 + 4), 4 deaths, including losing the last life (see gap 5).
- Total: 90 turns, 10,902 ticks = **3.03 sim-minutes** of play plus arcade viewing.
- Command logs (sessions fully re-derivable as seed + commands.jsonl):
  `judging/R12/playtest-evidence/seed7-commands.jsonl`,
  `seed11-aim-commands.jsonl`, `seed11-ctrl-commands.jsonl` (copied from the
  session dirs in my scratchpad).

## The aiming control experiment (the R11 complaint, measured again)

Same seed (11), same deterministic start, two fresh sessions, 60 s each (ticks 0→3600):

| Stretch | Kills | Deaths |
|---|---|---|
| Best-effort aiming (read frame, move sight, fire) | **11** | 2 |
| Stick centered, fire held, no decisions | **8** | 4 |

Felt answer AND number: aiming is no longer worthless — my aimed dive onto a climbing
flight killed three in one pass (seed11-aim turn 26), and aiming halved my deaths — but a
player who never touches the stick still collects ~73% of the aimed kill count. The kills
that dominate both stretches are point-blank wingtip events, not sighted gunnery. "Aiming
matters" is now true of survival and of bursts, and still NOT true of the ordinary kill.

## Ranked gaps (player language, one evidence path each)

1. **The missile system never happened to me.** Three sessions, enemies parked dead ahead
   at close range, missile held for multi-second stretches: locks 0 the entire playtest,
   stock pinned at 50, nothing ever launched. Half of After Burner's verbs — lock warble,
   salvo, smoke trails converging — are absent from the shipped build as played.
   Evidence: `playtest-evidence/seed11ctrl-t20-missile-dead-final.png` (fat MiG dead
   ahead, locks 0, stock 50 after 2 s of missile held).
2. **Kills happen to me, not by me.** Two kills landed while my sight was parked in a
   corner untouched; enemies jump from horizon-dot to wingtip with almost no mid-range
   window where sighted gunnery could work, and the vulcan stream is a few faint dots, so
   cause-and-effect between my trigger and a fireball is mostly invisible.
   Evidence: `playtest-evidence/seed7-t39-wingtip-kills-strip.png`.
3. **The crosshair is caged.** The sight clamps to a small box around the nose (≈±0.2 of
   the screen horizontally); an enemy at mid-screen left simply cannot be aimed at without
   banking the whole plane. The arcade crosshair ranges across most of the screen.
   Evidence: `playtest-evidence/seed7-t21-enemy-beyond-sight-final.png` (enemy at left
   edge, sight at its clamp).
4. **Dead-sky lulls.** Repeated 10+ s stretches with zero enemies on screen (telemetry
   and frames agree), against an arcade reference where something crosses every second.
   Evidence: `playtest-evidence/seed11aim-t14-empty-sky-strip.png`.
5. **Stakes leak away.** The score rises steadily with zero hits from tick 0, and when the
   control run lost its last life the game continued silently with a fresh set of lives —
   no game-over moment, no decision, no sting. Evidence:
   `playtest-evidence/seed7-t01-score-selfclimb-strip.png` (score 1100→6600, HIT 0, no
   input); the silent refill is in the seed11-ctrl telemetry (turn 12 lives 0 →
   turn 14 lives 3, `seed11-ctrl-commands.jsonl`).

What went right, for the record: the sustained bank and the slam-triggered barrel roll are
genuinely dramatic (`playtest-evidence/seed7-t37-barrel-roll-strip.png`), the death
starburst→tumble→READY respawn cycle reads like the arcade (`seed11aim-t07-death-strip.png`,
though the full cycle runs ~7 s to AB2's ~4), stage 2's sunset desert composition is
excellent (`seed11aim-t25-flight-below-final.png`), and deaths felt fair — a collision and
a furball clip, both visible on screen. The stage 1→2 transition is a single-frame full
palette cut, which jars.

## Instrument limits (one line)

No audio, ~0.5–4 s decision cadence (my turn length is my sampling rate — feel claims
finer than that are not mine to make), strips are 6 samples/turn not video, and one agent
player; the aiming numbers are one 60 s pair per condition on one seed.

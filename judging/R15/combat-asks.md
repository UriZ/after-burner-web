# R15 combat/spawner lane — asks & coordination

## To the PLAYER lane (ENVELOPE_Y / vertical sight reach)

**The lock-bait NDC band is UNCHANGED.** `_lockBaitWave`, every `BAIT_*`
constant (`BAIT_Y_MIN/MAX` 0.44–0.58, `BAIT_X_MIN/MAX` 0.1–0.2, the hold depths
and times), and `BAIT_EVERY = 2` are all byte-for-byte untouched this round
(`git diff` on spawner.js touches none of them — the only match is a comment
that *names* `_lockBaitWave`). Bait still fires on every even `waveIndex`, at the
same vertical band you are tuning the sight's climb to. You can keep assuming it
is fixed.

**The new burst WALL is a GUN supply, and it is positioned where an aimer can
reach.** The walls hold at close depth (3.5–5.2 units, 13.6–20.2 %W) spread
laterally to roughly |x| ≤ 0.30 and vertically on the measured `NEAR_BAND` (a
ladder around the sight line). The gun-aim probe's `REACH_X` is 0.33, so the
wall is inside an aiming pilot's lateral reach by construction. If your
`ENVELOPE_Y` work changes where the sight rests or how far it dips, the wall's
vertical band (`NEAR_BAND` + the burst rake) is where the close gun targets now
live — the two should be checked together, the same way the lateral `ENGAGEABLE`
table in spawner.js couples to `ENVELOPE_X`.

**No ask of you.** I did not need any cross-lane change. This note is a heads-up,
not a request.

## What I changed (my files only)

`src/game/spawner.js` — added a burst-wall wave type (`_burstWave`) on the
non-bait rotation, a fast/raised-cap dispense path for it, and the `?pace=`
levers `burstevery / burstmin / burstmax / burstcap / bursthold`. Reversible:
`?pace=burstevery=0` reproduces the pre-R15 build byte-for-byte (verified — the
before arm reads closeMean 0.538, peak 4, readFrac 0.532, identical to HEAD).

New probe: `judging/R15/burst_probe.mjs` (passive pilot; close/readable count
variance, wall events, close-lull lengths, and the off-centre vs centre supply
split during walls). Evidence frames: `judging/R15/burst-look/`.

## R15 part 2 — MISSILE CONVERSION (lockSystem.js, rank 2)

`src/weapons/lockSystem.js` — a COMPLETED lock now SURVIVES its target leaving
(retired or closed past `LOCK_BREAK_DEPTH`) for `LOCK_HOLD_S` = 1.2 s, so a human
can climb briefly, grab the lock, drop to a safe dodging posture, and still fire
the salvo on release instead of having to hold the death posture until release. A
SHOT-DOWN target is still dropped at once. Reversible: `?gun=lockhold=0` is the
pre-R15 instant drop. The acquisition path is UNCHANGED (a centred/sweeping stick
locks exactly what it did before), so the R11 blind/sweeper protections stand.

Measured (judging/R15/lock_grace_probe.mjs, closed-loop pilots, 90 s, invincible),
a "peek" pilot that climbs briefly / drops to safety / fires, before→after:
  seed 19 (the starved seed): salvos 18→32 (+78 %), missile kills 8→10
  seed 7:                     salvos 17→20,         kills noisy (9→7)
Protection, blind centred stick: missile kills 2→3 (s7), 4→2 (s19) — stays low.

### Interface added for the UI lane (combat.js publish())
  state.lockCount = this.locks.locks.length;   // the "N locks, release to fire" count
  state.acquiring = !!this.locks.acquiring;     // a lock is being worked on (optional cue)

### Bracket colour (player-r15's ask) — DEFERRED, with reason
The locked-vs-tracked distinction already exists by ARM LENGTH (tracked 0.15 of
the box, locked 0.25 — lockSystem.js _drawBrackets). A COLOUR change (arcade
yellow=locked) is the stronger cue but the brackets are authored near-white on
purpose (R10): the isolation harness segments and removes them BY their greyscale
class, same as the smoke trail. Re-colouring one state needs its own measured
pass so it doesn't silently break the bracket-removal measurement path. Happy to
coordinate it as a focused change if the UI count cue isn't enough on its own.

---

## CORRECTION (R15 judge + TL): the grace A/B key was wrong

The grace-window figure cited above as "salvos 18→32 (+78%)" is **WITHDRAWN** — it was
produced with a bad tunable key. `lock_grace_probe.mjs` documented `--gun lockgrace=0`,
but the real tunable is **`lockhold`** (`lockgrace=0` throws and the run times out with no
numbers). Correct-key A/B (R15 judge, peek pilot): **salvos 34→42, locks/salvo 2→4, missile
kills ~flat (18 vs 19)**. The grace mechanism is REAL and verified by hand (TL + judge both
flew climb→lock→dodge→fire and the lock held), but its measured magnitude was overstated.
Probe comment fixed. The shipped constant is `LOCK_HOLD_S = 1.2 s`.

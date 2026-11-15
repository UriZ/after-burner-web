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

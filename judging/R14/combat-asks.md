# R14 combat lane — cross-lane asks

The R14 combat lane (gun + missile, ranks 1 & 2) shipped two measured changes
(see the lane report / the diffs in `src/weapons/combat.js` and
`src/game/spawner.js`). Two residual gaps surfaced that are OUTSIDE combat's
files and OUTSIDE its safe levers. Both reduce to ONE cross-lane fact.

## THE ONE FACT: the sight cannot reach low enough, and the lock cone is too tall for the climb range.

The sight sits `SIGHT_NDC_Y_OFFSET` = +0.30 NDC above the player's nose
(combat.js, MEASURED from the arcade vulcan-stream convergence — do not move it
here). The player's own vertical envelope (`player.js ENVELOPE_Y`, NOT combat's
file) tops the sight CENTRE out at roughly +0.40 NDC and floors it around the
airframe. Two separate R14 playtest findings are the same consequence of this:

### Ask 1 (gun) — the close, big enemies dwell BELOW the caged sight.
R14 playtest, verbatim: *"the closest, biggest jets cruise at or below the
player's altitude — out of the sight's reach entirely. I held the reticle as
low as it goes on a 29 %-span jet and still fired over its head."* The gun's
rank-1 fix (combat.js `GUN_KILL_SPAN_FRAC` 0.10->0.14) correctly stopped the gun
farming distant specks — a dead-centre stick's gun kills HALVED (20->10, gun-
only probe, playtest-confirmed "the HIT counter just stopped"). But it cannot
make AIMING clearly win while the only gun-killable targets (the close, big
ones) sit where the sight physically cannot point. The judge's R13 rank-1 named
this exact alternative: *"the readable traffic has to fly where the sight can
actually point, OR the sight has to reach the low row."* Combat cannot do
either from its own files without breaking a MEASURED fact:
  - raising the enemy fly-past band (spawner `NEAR_BAND` / `REACH_FLOOR_NDC_Y`)
    breaks the vertical distribution the world/criteria lanes have MATCHED to the
    arcade (all-enemy top-third 34.9 % vs arcade 32.5 %; the arcade genuinely
    puts enemies low);
  - lowering `SIGHT_NDC_Y_OFFSET` breaks the measured stream geometry.
  **Ask the PLAYER lane:** can `ENVELOPE_Y` give the sight more DOWN-reach (a
  sight that dips toward the waterline when the player pushes), so the gun can be
  brought onto the low close traffic? This is the half of the R6 vertical gap
  that was explicitly deferred to player.js (`judging/R6/ask-combat.md`) and is
  still open.

### Ask 2 (missile) — the lock-bait is reachable by a perfect tracker but not by a human.
R14 made a lock reachable on EVERY-OTHER wave on all seeds incl. the adverse
seed 19 that fired nothing before (probe salvos 32/43/40; blind missile stays
low at 2/3). That fixed AVAILABILITY. But the R14 playtest got **one lock in
~4 minutes and never a salvo** — the bottleneck is now lock EXECUTION, and it is
the same vertical fact. The bait must hold ABOVE the resting lock cone or a
dead-centre stick locks it for free (the blind-protection constraint); the
resting cone already reaches +0.537 NDC in y, while the climbing sight CENTRE
only reaches ~+0.40. So the band that is "above a resting cone but centre-
reachable by a climb" is nearly empty: the bait is parked where only the lock
cone's upper EDGE grazes it at full climb, which a human at a human cadence
cannot hold. Lowering the bait (spawner `BAIT_Y`) into true climb-reach was
analysed and rejected: anything the climbing sight can centre on (<= +0.40) is
also inside the RESTING cone (<= +0.537) and leaks to the blind pilot.
  **Ask the PLAYER lane (same lever as Ask 1):** more sight climb-range would
  let the bait sit where a human can centre the cone on it. Separately, if R10's
  FROZEN `LOCK_RADIUS_FRAC` is ever revisited (NOT this round — it is frozen), a
  wider or shorter-in-Y cone would relax the same squeeze; combat is not asking
  to move it, only recording that the bait placement is boxed by it.

## Not asks, just notes for the next combat lane
- The gun's residual ~10 blind kills are STRUCTURAL: the hit radius is span-
  scaled (`HIT_RADIUS_SPAN_MULT` = 0.5, floored by "visible centred hits must
  register"), so a centred sight is a wide net for CLOSE/BIG targets specifically
  — exactly the targets `GUN_KILL_SPAN_FRAC` leaves the gun with. Shrinking the
  multiplier is the one lever that would cut it and it is forbidden for a good
  reason. Treat ~10 as the floor achievable without the vertical fix above.
- A RELOCATED gun-dwell (hold off-centre up near the sight) was built and
  measured INERT (aim 21/19/18, blind 9/12/13 — unchanged) and reverted; the
  aimer's gun total is bounded by target SUPPLY, not placement. Do not re-run it.
  See the `GUN_DWELL` note in spawner.js.

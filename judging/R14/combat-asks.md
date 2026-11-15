# R14 combat lane — cross-lane asks

> **CORRECTION (R15 player lane, reconciled & confirmed by combat).** The
> original version of this doc made the vertical SIGHT-REACH the keystone and was
> **WRONG** — it computed the climbing sight's ceiling from a STALE player rail
> (+0.106, the ENVELOPE_Y=1.1 value the spawner's own `REACH_CEILING` table marks
> as superseded) and assumed a neutral `playerNdc.y = 0`. The SHIPPED values,
> read live three ways by the R15 player lane and re-confirmed independently by
> combat (`__sight().ndcY` / `__combatDebug().playerNdc.y`, settled):
>
> | posture | playerNdc.y | sight.y |
> |---|---|---|
> | full down | −0.546 | **−0.246** |
> | neutral   | −0.112 | **+0.188** |
> | full up   | +0.460 | **+0.760** |
>
> The climbing sight reaches **+0.76**, which OVERSHOOTS the lock-bait (ndcY
> 0.44–0.58) with reach to spare — not the +0.40 the old doc claimed. So **reach
> / ENVELOPE_Y is NOT the keystone** and the asks below are rewritten. The player
> lane confirmed empirically: a climb → hold-missile → 6 locks → release → salvo
> fires in normal play, and zero- and 180 ms-latency autopilots both land 31–34
> salvos/180 s onto the bait. Credit: R15 player lane, `tools/out/player-r15/`.

The R14 combat lane shipped two measured changes (gun `GUN_KILL_SPAN_FRAC` 0.14,
missile `BAIT_EVERY` 2 + lateral bait exit; diffs in `src/weapons/combat.js` and
`src/game/spawner.js`). Two residual FEEL gaps surfaced in the R14 playtest. The
corrected diagnosis of each, with the reach premise removed:

## Missile — reachable, but the lock costs you exposure, and the salvo is undiscoverable.
The R14 playtest got 1 lock in ~4 min and 0 salvos. With reach refuted, the real
blockers are:
  1. **The lock maneuver draws fire (combat/spawner + flow).** The bait holds up
     (ndcY 0.44–0.58, above the +0.425 resting cone so a parked stick can't farm
     it — that part of the old doc survives with the corrected numbers). Reaching
     it is a climb-and-hold, and the R15 player lane "ate 16 enemy shots holding
     the climb and died." This is the same climb-exposes-you tension R12/R13 hit
     with horizon-camping, now attached to the lock. It is a combat/spawner
     question (enemy fire geometry during the lock window; whether a lockable
     target can be presented without forcing a sustained exposed climb), NOT a
     player-envelope one. **This is the real rank-2 residual and it is in
     combat's own lane — carry it into R15 combat.**
  2. **Hold-to-lock / release-to-salvo is undiscoverable (UI lane).** The R14
     playtester held the missile button continuously through the one lock they
     got, so the release-edge never fired — correct AB2 design, invisible to a
     new player. Ask the UI lane for a lock/"FIRE" affordance that teaches the
     release. Cheap, and it alone may convert "1 lock, 0 salvos" into salvos.

## Gun — fixed; the residual is NOT reach.
The rank-1 defect is closed (blind gun 20→10, gun-only probe; playtest-confirmed
"the HIT counter just stopped"). The thin HUMAN aim margin has three causes, in
order, and reach is the smallest:
  1. **Span-scaled hit radius (structural, combat).** `HIT_RADIUS_SPAN_MULT`=0.5
     makes a centred sight a wide net for the CLOSE/BIG targets the 0.14 gate
     leaves the gun with, so ~10 blind kills is a floor; the multiplier is
     floored by "visible centred hits must register." This is the dominant cap
     and it is combat's, not the player lane's.
  2. **Sight RESPONSE dynamics (player lane, but not ENVELOPE_Y).** The playtest
     and the R15 lane both note the sight "settles slowly to its rails," so a
     human tracks worse than the probe's perfect pursuit. This is slew/settle
     tuning, a different lever from vertical RANGE.
  3. **A ~5 % low tail is genuinely below sight reach.** The sight floors at
     −0.246; NEAR_BAND puts ~4.5 % of fly-past endpoints below that, so the
     lowest close jets (the "fired over its head" case the playtest hit) can't be
     brought under the gun. This is the ONLY place a small ENVELOPE_Y DOWN-reach
     increase would help, and it is a minority tail, not a keystone — do not
     build R15 around it.

## Notes for the next combat lane
- A RELOCATED gun-dwell (hold off-centre up near the sight) was built, measured
  INERT (aim 21/19/18, blind 9/12/13 — unchanged) and reverted; the aimer's gun
  total is bounded by target SUPPLY, not placement. See the `GUN_DWELL` note in
  spawner.js. Do not re-run it.
- `ENVELOPE_X`, the sight rails, `LOCK_RADIUS_FRAC` and the death cycle were left
  untouched this round and none is implicated by the corrected diagnosis.

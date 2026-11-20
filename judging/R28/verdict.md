# R28 fresh-context judge verdict (naive play, recalibrated R24 scale)

**Score: 7/10.** Both core weapons are usable and the jet + enemies now read as real
aircraft matching the arcade — solid and playable, held below 8 by ugly explosions
(red-square confetti + oversized white smoke) and a gun that fires with no visible
round-stream.

## Shipped-this-round fixes — all verified working (none broken)
- **Afterburner attached:** ✓ follows the airframe through hard banks/rolls
  (demo2fine/frame-0009,0012,0013). No separation in any pose.
- **Missile lock usable:** ✓ `aim_lock_probe --jitter 0.5`: firstLockTick 16 (~0.27s),
  13 missiles fired over 18s on a wavering stick. A naive point-and-hold locks and fires.
- **Jet grey-white, not maroon:** ✓ demo1/frame-0020 — grey-white surfaces, red only on
  the outline rim.
- **Enemy jets twin-engine:** ✓ gunseq2/frame-0122,0125 — two black nacelles + orange
  burner, reads as a jet at game size.
- **Barrel roll double-tap:** mechanic present, world-roll visible in banks; could NOT
  isolate the double-tap in a scripted capture (feel unverified, not broken).
- **Gun hit-flash:** ✓ struck enemies flash white / explode (gunseq2 explosion frames).

Density is healthy (combat_probe: avg 3.46 enemies on-screen, peak 27%W) — confirming the
binding correction that enemies are NOT too small. Death/respawn NOT verifiable:
`forcedeath` is overridden by demo=2 capture-invincibility.

## Top 3 remaining gaps (ranked by "would a player mistake this for AB2")
1. **Explosions look wrong — red-square confetti + a giant white smoke ball.** Every kill
   scatters ~30 red pixel-squares across the sky and parks a ~35%W opaque white ball
   center-screen. Evidence: judging/R28/gunseq2/frame-0122.png vs
   reference/ab2-arcade-huge-explosion.jpg (clean orange fireball) and
   reference/ab2-arcade-desert-explosions.png (compact small puffs).
   Files: effects/explosions.js, effects/smoke.js.
2. **Gun fires with no visible round-stream.** The arcade shoots a bold column of orange
   rounds from the nose (reference/stage4-vulcan-stream-t214.png); ours shows nothing
   leave the jet, only a faint flash at the target (judging/R28/gunseq2/frame-0125.png).
   combat_probe shows ~8 vulcanRounds/tick exist in state but don't read on screen.
   Files: weapons/projectileSprites.js, weapons/combat.js, effects/screenSpace.js.
3. **Combat reads distant/thin in the demo.** The demo pilot kills sparingly (HIT reaches
   only ~2 over a 40s run; demo=1 attract stays HIT 0), so the naive first impression is a
   sparse dogfight. Real-player density is fine, so this is a demo-AI/engagement issue.
   Files: game/flow/demoTimeline.js, game/spawner.js.

**Single highest-value next fix:** replace the red-square confetti + oversized white
smoke with a compact arcade-style orange fireball (effects/explosions.js) — it is the most
visible per-kill break and touches every moment of combat.

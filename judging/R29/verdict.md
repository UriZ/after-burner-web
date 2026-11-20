# R29 fresh-context judge verdict (naive play, recalibrated R24 scale)

**Score: 7/10.** Both core weapons are usable, enemies read as real twin-engine jets, and
the explosion is now a clean orange fireball — solid and playable; held at 7 because the core
AB2 loop (weaving through a storm of enemy fire) is perceptually absent, the player jet's
belly is swamped in orange flame so it reads as on-fire, and the gun's rounds don't visibly
travel to the target.

## Shipped R27+R28 fixes — re-verified working (none broken)
- **Missiles usable on a hand-flown stick:** ✓ `aim_lock_probe --seed 7 --jitter 0.5`:
  firstLockTick 16 (~0.27s), firstLaunchTick 38, 13 missiles fired over 18s, stock 50→37.
  A naive point-and-hold locks and fires.
- **Afterburner attached in all poses:** ✓ follows the airframe through hard banks/rolls
  (judging/R29/enemyfire/frame-0002,0005 — burners stay on the nacelles).
- **Player jet grey-white, not maroon:** ✓ red is the outline rim only; surfaces read
  grey/cream (judging/R29/demo1/frame-0006 carrier-launch rear view).
- **Enemies redrawn twin-engine:** ✓ two black nacelles cored orange, reads as a fighter at
  game size (judging/R29/crop_gunstream.png, gunseq1hz/frame-0002).
- **Gun hit-flash:** ✓ struck enemies flash/explode (demo2 reaches HIT 20 in ~28s;
  combat_probe hits=20).
- **Bold gun round-stream:** PARTIAL — an orange muzzle burst now appears at the nose
  (better than R28's "nothing leaves the jet"), but it fuses onto the airframe and no column
  of rounds travels toward the enemy (see gap #2).
- **Explosion de-confettied:** ✓ compact orange fireball hugging the kill, no sky-wide red
  squares (judging/R29/demo2/frame-0010).
- **Barrel roll:** mechanic present; world-roll visible in banks (could not isolate the
  double-tap in a scripted capture — feel unverified, not broken).

## Top 3 remaining gaps (ranked by "would a player mistake this for AB2")

1. **You never feel shot at — the AB2 "weave through a hail of fire" loop is missing.**
   Enemy fire DOES render (combat_probe seed 7: ~8 shots in flight at simTime 5–7s, peak 16;
   crop judging/R29/crop_enemyfire.png shows tiny ~7px orange dots), but the rounds are
   small, few, and not clearly aimed at the player, so they vanish into the clutter of
   clouds, lock brackets and multiple jets — at no point in a naive playthrough did the
   player read as under threat. AB2 is fundamentally about dodging; without a visible,
   player-aimed stream to weave through, the game feels safe and thin.
   Files: `weapons/enemyShots.js`, `effects/telegraph.js`, `game/spawner.js` (density/aim).

2. **The player jet looks like it's on fire, and its gun rounds don't travel to the target.**
   The afterburner plume (rear) plus the gun muzzle burst (nose/belly) both render continuously
   and overlap, engulfing the whole belly in orange flame — judging/R29/crop_gunstream.png and
   crop_enemyfire.png show the player sprite swamped, reading as damaged/burning rather than a
   clean grey F-14. Separately, the gun shows a flash fused on the nose but no orange column
   streaming ahead to the enemy, unlike the arcade (reference/stage4-vulcan-stream-t214.png:
   discrete orange rounds spread toward the reticle, clearly off the airframe).
   Files: `render/spriteFactory.js` (afterburner/muzzle size), `weapons/projectileSprites.js`.

3. **The stage-1 cloud is an isolated opaque white ball parked mid-screen.** A ~30–35%W round
   solid-white cumulus floats in open blue sky beside the action in nearly every combat frame
   (judging/R29/demo2/frame-0010, gunseq1hz/frame-0002,0004). Stage 1 does have big clouds
   (reference/stage1-climbout-t92.png), but there they are horizon-anchored masses the jet
   flies between — not a discrete sphere hanging in clear sky. The composition, not the
   whiteness, is what breaks the illusion.
   File: `render/clouds.js`.

(Near-miss, not top-3: the explosion is much improved but still smaller and rounder than the
arcade's big spiky white-cored starburst — reference/ab2-arcade-huge-explosion.jpg. Grow + add
rays when #1–3 are done. effects/explosions.js.)

**Single highest-value next fix:** make enemy fire a readable, player-aimed, dodgeable stream
(bigger/brighter rounds, telegraphed, clearly converging on the player) — it is the one change
that would move the game from "looks like AB2" to "plays like AB2," which the recalibrated
scale weights above everything.

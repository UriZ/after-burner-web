# R35 fresh-judge verdict — NAIVE play, recalibrated scale

**Score: 8/10.** Both weapons verifiably work, the full arcade loop is present, and at
native game scale it reads as AB2. Held under 9 by art polish + feel/audio that captures
can't settle.

## R34 batch — VERIFIED working
- **Barrel roll = rigid whole-view roll (code-verified).** player.js:956-985 drives the jet
  `material.rotation = -worldRoll` on its LEVEL astern cell while game.js:538-547 rolls the
  world through a full 360, then normalises worldRoll mod 2π at roll-end → snaps level, no
  spin-back. Jet + horizon are one rigid body. Correct.
- **Afterburner baked + attached** — present in every pose captured (head-on frame-9, bank
  frame-10/11, carrier launch missiles/frame-8). Never detaches.
- **Weapons fire.** aim_lock_probe seed7 jitter0.5 18s: firstLock t84 (1.4s), firstLaunch
  t106, 10 missiles fired, 6 hits, hitRateAll 0.667 — missiles lock+launch+curve to hit with
  an imperfect wavering sight (heat-seeking works). Gun: HIT counter climbs 2→4, enemies
  explode (gun/flight frames). fairness_probe: 2.2 deaths/min, 0 unannounced fatal hits.
- **Ground batteries** present + firing from terrain (flight/frame-11, right emplacement).
- **7 varied stages** (STAGES array) + complete flow (title/launch/resupply/air-refuel/tally/
  RELOAD WEAPONS/death/continue/gameover). No missing major system.

## Top 3 remaining gaps (polish — rank by "mistake for AB2")
1. Afterburner lacks arcade's long white-hot speed plume in banks (compact orange bells).
   evidence: arcade-jet-crop.png (long trailing streak) vs jet-crop.png. files: entities/player.js, render/spriteFactory.js
2. Player airframe heavy dark-red outline reads grimier than arcade clean grey-white (minor
   at native scale). evidence: jet-crop vs arcade-jet-crop. files: render/spriteFactory.js
3. Gun tracer column reads faintly — kills register but the visible "dakka" stream is hard to
   catch mid-burst; worth a mid-burst confirmation. files: effects/, weapons/

Highest-value next input: a hands-on agent playtest + owner ear-check of the new R34 audio —
feel and sound are the only unverified axes between a confirmed 8 and a possible 9.

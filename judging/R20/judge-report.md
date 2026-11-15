# R20 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R20 gate. **Tree judged**: HEAD (clean, committed —
`368f357` R20 polish on top of the stages/tanker lanes). **Prior**: `judging/R19/judge-report.md`
(R19 = 8.9/8.9, composite 8.9).

**Method**: look-first. Extracted the two arcade biomes from the map-keyed longplay at their
HUD-verified spans (stage 16 t=674, stage 14 t=590 in `ab2-longplay.mp4`) and put our `?stage=16`
/ `?stage=14` beside them; captured the tanker beat (`?airrefuel=3`), the kill fireball
(`?combatexpl=1`), and the title (`?showtitle=1`); re-measured every regression surface with my own
captures; **played** a combat stretch on `tools/playtest.mjs` (seeds 7, 3); probed the lock/missile
loop over a 45 s scripted-combat run; and **A/B'd stage-1 combat against the pre-R20 commit in an
isolated git worktree**. Comparison frames saved beside this report (`cmp-stage14.png`,
`cmp-stage16.png`, `cmp-tanker.png`, `cmp-fireball.png`, `cmp-title.png`).

## SCORE

| | R19 | R20 | one-line reason |
|---|---|---|---|
| **Stills** | 8.9 | **9.0** | The arcade's **variety finally grows**: two new measured combat biomes now exist — a **gold-dusk sunset scrubland** (stage 14: gold `#ffc600` sky glowing to orange `#fd9008` at the horizon over olive ground) and a **lavender-sky coast** (stage 16: pale `#a9a8fd` sky over measured azure), both distinct new recognizable AB2 screens that lap into play and render at their true arcade numbers. The **tanker now docks** (jet noses up under the belly; the R19 gap is gone) and **kills throw hot-cored fireballs** (white-hot centre + yellow-hot flanking cores, no longer flat orange). Held from higher because the new biomes match on **sky/palette but their terrain is FLAT** — stage 16 reads as open azure water, not the arcade's dense blue hillside city; stage 14 lacks the arcade's dense palm forest. |
| **Motion** | 8.9 | **9.0** | +0.1. The two new biomes are **flyable combat content** (played them; enemies/HUD/vulcan all live in both), which is exactly the breadth the round asked for. The tanker beat still eases in, refills, and **hands back to flight** cleanly. Combat is **byte-identical** to pre-R20 on stage 1 (maxdiff 0 across 4 frames) and unregressed on play: aim beats blind (0 vs 0→2 hits), locks form (max 2), missiles fire (stock 50→45), enemies spawn and shoot back; selftest 8/8. |
| **Composite** | 8.9 | **9.0** | +0.1 — **the #1 R20 gap (breadth) got two measured biomes delivered cleanly, plus real progress on the tanker (#2) and fireball cores (#4), with ZERO regression**. Held from higher because every R20 win is "palette/direction right, detail short": the new terrain is flatter than the arcade, the tanker reads as a dorsal hump not a tail fin, and the flanking fireball cores are yellow where the arcade's are paler/white. |

**One-line verdict**: *The game finally stops lapping four palettes — I fly a sunset stage now, the
sky a sheet of gold burning to orange at the horizon over olive scrub, and a lavender-skied coast
I hadn't seen; when I reach the tanker my jet actually noses up and tucks under its belly instead of
hanging in a gap; and when I kill something the blast has a white-hot heart with yellow-cored puffs
instead of flat orange. What still isn't the arcade: the two new stages have the right SKY but the
ground underneath is smooth and empty where the arcade has a dense city on hills and a thick palm
forest — it reads as flying over water or a lawn, not over terrain.*

### What anchors the score (the look / the play, in player language)

**I looked first, side by side with the mapped arcade.**

- **Stage 14 (`cmp-stage14.png`, ours | arcade t=590):** both are an unmistakable **gold-dusk** stage —
  a gold sky burning down to an orange horizon band, olive ground below. Our sky gradient and the
  olive palette are a strong match (measured: our ground modal olive `(115,99,33)` vs stage 2's
  orange and stage 4's green — genuinely its own biome). **Where it differs:** the arcade ground is a
  dense dark-olive **palm/scrub forest** with individual crowns; ours is a smooth olive dither field
  with no tree structure.
- **Stage 16 (`cmp-stage16.png`, ours | arcade t=674):** both carry the distinctive **pale-lavender
  sky** (ours matches `#a9a8fd` well) and white cloud puffs. **Where it differs — the bigger tell:**
  the arcade ground is a **dense blue hillside CITY** (buildings/structures packed on rising hills);
  ours is **open azure water** (the measured azure `(0,82,132)` is correct and distinct from stage 1's
  sea blue `(0,16,214)`, but the terrain reads as flat sea, not a city). Of the two new biomes this is
  the weaker match — the sky sells it as new, the ground does not sell it as a city.
- **Tanker (`cmp-tanker.png`, ours | arcade):** 4 orange nacelles, central cockpit with red sensor
  dots, grey palette, cyan **RELOAD WEAPONS** all read right, and the **jet now docks** — nosed up and
  tucked under the belly (R19 had it floating in a gap; see `tanker-dock-r19-before.png` vs
  `tanker-dock-ours.png`). A **central raised fuselage** replaced R19's flat manta. **Still short:** the
  arcade has a sharp **triangular vertical tail fin** jutting up with swept horizontal stabilizers, and
  wings swept **down** to the pods; ours is a rounded dorsal hump over flat wings.
- **Fireball (`cmp-fireball.png`, ours peak frame 79 | arcade huge-explosion):** at the true white-hot
  peak the blast has a **white-hot central core** and the two flanking puffs carry **bright yellow-hot
  cores** (orange rim → yellow centre), red debris sprayed wide — the R19 "orange-only" tell is gone.
- **Title (`cmp-title.png`, ours | arcade):** a **forward italic lean** is now present. Still trails —
  our ball-cluster is a diagonal swoosh where the arcade stacks a vertical "II" numeral block, and our
  lean is subtler than the arcade's.

**Sampling trap I caught:** my first fireball pass (`--every 2`) kept landing in the orange/smoke
phase and straddling the brief white-hot peak — I measured the flanking cores at `(255,156,74)` pure
orange and nearly called the white-core claim refuted. A **dense `--every 1` 80-frame** pass found the
peak at frame 79, where the cores are genuinely hot. The peak flash is ~2–3 ticks; a 2-tick sampler
aliases past it. Always densify before a negative on a transient (README, R10).

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **TWO NEW COMBAT BIOMES — stage 16 blue city + stage 14 gold-dusk olive, measured palettes, routed into play** | **SURVIVES** | Both exist as new `groundMode: 'field'` stages in `stage.js` (STAGE_14 line 946, STAGE_16 line 1024) with measured palettes, and `flow.js` routes `stageNumber === 14 → STAGE_14`, `=== 16 → STAGE_16` (lines 520-521, alongside the stage-13 special-case). Reachable via `?stage=14`/`?stage=16` (labels `[flight stage 14/16]`) and via the lap. Measured grounds are distinct and correct (stage 14 olive `(115,99,33)`, stage 16 azure `(0,82,132)`, vs stage 1 sea `(0,16,214)`); skies match the STAGE_MAP values by eye (14 gold→orange glow, 16 lavender). They read as **distinct new arcade stages**. |
| **…but the new terrain is flatter than the arcade** | **CONFIRMED (honest limit)** | Stage 16 ground reads as **open azure water**, not the arcade's dense blue hillside city; stage 14 lacks the arcade's **dense olive palm forest**. The lane flagged geometry as ADOPTED/`field`-mode and the palettes as MEASURED — accurate. The match is sky+palette, not terrain content. |
| **TANKER: airframe closer (tail fin) + jet DOCKS to the belly** | **PARTIAL** | **Docking SURVIVES** — the jet now noses up and tucks under the belly, the R19 gap is closed (before/after in the lane's own `tanker-dock-*.png`, reproduced in my `?airrefuel=3` capture). **Airframe improved but not matched** — a central raised fuselage replaced the flat manta, but it reads as a rounded dorsal hump, not the arcade's distinct **vertical tail fin + down-swept winged-tanker** silhouette. |
| **FIREBALL: flanking puffs now have WHITE-HOT cores (not orange-only), not taller** | **SURVIVES (cores read yellow, not white)** | At the peak frame the flanking puffs carry bright **yellow-hot** cores and the **central** blast is white-hot `(255,255,239)` — the flat-orange tell is gone, direction matches the arcade's hot spray. Strictly the flanking cores measure **yellow** (brightest interior `~(255,156,74)`→yellow gradient), not white; the white-hot is reserved to the centre — which is arguably the more arcade-accurate placement. Height not inflated. |
| **TITLE: forward italic lean** | **PARTIAL** | A forward lean is present (improvement). Still short of the arcade's stronger italic and tighter letter packing, and the ball-cluster is a diagonal swoosh vs the arcade's vertical "II" numeral. Weakest-matching screen, as carried. |
| **REGRESSION: stages 1-4 render right; both refuel beats intact; combat framing byte-identical outside refuel; combat wins unregressed; selftest 8/8** | **SURVIVES** | Stages 1-4 render in their correct distinct biomes (sea / desert / night-speckle / teal-forest+river) with enemies+HUD — no new-stage leak. Runway `?stage=5` → `[resupply stage 5]`; tanker `?airrefuel=3` → enters/refills/hands back. **Stage-1 combat byte-identical to pre-R20 commit `b042fd5`** (git worktree A/B: maxdiff 0 across 4 frames, confirming the R20 game.js/flow.js/stage.js changes are stateless w.r.t. combat framing). **Played** (seed 7): blind straight fire → **0 hits**; aimed → hits **0→2**, score 6,600→18,150; enemies **8→10** spawn and **shoot back** (0→8 shots). Lock/missile loop confirmed over a 45 s demo run: **locks max 2** (first at 13.8 s), **missilesInFlight max 3**, stock 50→45, vulcan 9. `selftest` **8/8**. |

## Sampling rates (citation field 6)

- Arcade biome/tanker/title/fireball reference: single `-frames:v 1` stills from `ab2-longplay.mp4`
  at the HUD-verified spans — composition/palette only, no motion claim.
- New-biome capture: `capture.mjs`, `?stage=14`/`?stage=16&seed=1`, `--every 20`, 6 frames.
- Fireball: `?combatexpl=1&seed=1`, first pass `--every 2` (missed the peak), decisive pass
  `--every 1` 80 frames (≈0.0167 s) — peak white-hot at frame 79; interior-pixel sampling, an extent
  figure not a motion figure.
- Tanker lifecycle: `?airrefuel=3&seed=1`, `--every 12` (0.2 s) for the docked pose + RELOAD WEAPONS.
- Combat: `playtest.mjs` seeds 7/3 (turn = sampling rate) + `combat_probe.mjs` `?demo=2` `--every 6`
  over 2700 ticks for the lock/missile timing; no speed claim finer than a turn.
- Regression A/B: `capture.mjs --every 20`, same seed, HEAD vs worktree `b042fd5` — exact PNG diff.

## Ranked gap list for R21 (player language — what most breaks the illusion now)

1. **THE NEW BIOMES HAVE THE RIGHT SKY BUT FLAT, EMPTY GROUND.** Stage 16 reads as open azure water,
   not the arcade's dense blue hillside **CITY**; stage 14 lacks the arcade's dense olive **palm
   forest**. The palettes/skies are right — the ground CONTENT (buildings, hills, dense canopy) is
   missing, so the new stages read as flying over water or a lawn. Give the `field` biomes real
   terrain structure — **or build the CANYON (arcade stage 8)**, which the stages lane flagged as the
   single most distinct unbuilt biome (cream sky, warm-rock walls on both flanks, low horizon). Canyon
   needs a per-stage low horizon from `game.js` (a third camera pitch, kept stateless) + wall masses
   the stages lane can build. Highest-value next biome.
2. **KEEP ADDING BREADTH TOWARD 23 — now ~6 of ~23 biomes.** Two landed this round; the lap is still
   short. One or two more distinct measured combat stages per round, quality over quantity. Canyon
   (#1) is the strongest; after it, the mixed-biome coast/green-terrain stages.
3. **TANKER — FINISH THE AIRFRAME.** Docking is fixed. The silhouette still reads as a dorsal hump;
   give it the arcade's sharp **vertical TAIL FIN** jutting up (with swept horizontal stabilizers) and
   **down-swept wings** to the pods, so it reads as a winged KC-tanker, not a lumpy wing.
4. **FIREBALL — PUSH THE FLANKING CORES FROM YELLOW TO WHITE.** The hot cores are in now (big step),
   but the flanking puffs read **yellow** where the arcade's spray balls are paler/white. The central
   core is already white; warm the flanking cores the rest of the way. Not more height.
5. **TITLE — COMPOSITION PASS.** The lean is present but subtler than the arcade, and our ball-cluster
   is a diagonal swoosh where the arcade stacks a vertical "II" numeral block. Second pass once the
   bigger gaps are handled.

**Kept as positives (do not regress):** the **two new measured biomes** (stages 14/16, `field` mode,
routed at true arcade numbers + in the lap); the **tanker docking** (jet noses up to the belly) and
the whole airborne-tanker beat (enter/refill/handback, RELOAD WEAPONS, stages 3/9); the **hot-cored
fireball** (white centre + yellow flanking cores, horizontal spray, not taller); the runway tree
tunnel + low-swoop + depot props; **combat framing byte-identical outside the refuel states** (proven
by worktree A/B, maxdiff 0); every combat win (aim beats blind, locks, missile loop, enemies shoot
back); stages 1-4. **Do NOT inflate the fireball vertically** (the remaining fix is whiter flanking
cores, not height). **Do NOT grow `ENVELOPE_Y`** (R15-refuted).

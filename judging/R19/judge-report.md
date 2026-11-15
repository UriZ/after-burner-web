# R19 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R19 gate. **Tree judged**: HEAD (clean, committed). The two
R19 lanes hit the session limit before writing lane reports, so there are **no self-reports** —
this independent re-measurement is the only verification of what shipped.

**Method**: look-first. Captured the tanker beat (`?airrefuel=3`) as a time sequence and put it
beside `reference/stage3-reload-tanker-t165.png` (the arcade "RELOAD WEAPONS" tanker); captured a
kill blast (`?combatexpl=1`) and measured its width scale-matched against R18's arcade figure;
then re-measured every regression surface with my own captures and **played** a combat stretch on
`tools/playtest.mjs` (seed 7). Comparison frames saved beside this report
(`cmp-tanker.png`, `cmp-fireball.png`).

## SCORE

| | R18 | R19 | one-line reason |
|---|---|---|---|
| **Stills** | 8.9 | **8.9** | The arcade's **second refuel mechanism now exists** — a mid-air tanker beat with the grey four-nacelle tanker overhead, the F-14 tucked beneath, and cyan **RELOAD WEAPONS** blinking low-centre, a genuinely new recognizable AB2 screen — and the **kill fireball widened** to a horizontal spray. Both are real stills wins, but the tanker's silhouette is a **stylized manta** (no vertical tail fin, jet not docked to a boom) short of the arcade's winged KC-style tanker, and R18's **sparse tree tunnel** is unaddressed — so the band holds. |
| **Motion** | 8.8 | **8.9** | +0.1. The tanker beat is a **real motion beat**: the tanker eases in and grows/settles into formation, the stock refills across the pass, the prompt blinks, and it **hands back to combat flight** cleanly (not a dead-end) — a new ~5.5 s sequence that didn't exist. Combat is **unregressed** (played it: aim beats blind, locks form, missiles fire, enemies spawn and shoot back; selftest 8/8). |
| **Composite** | 8.8 | **8.9** | +0.1 — **two top-ranked R18 gaps closed in one round with zero regression**: the unbuilt airborne tanker (R18 #1) now works end-to-end, and the narrow fireball (R18 #2) widened to the arcade's spray. Held from higher by the tanker's manta silhouette, the still-sparse tunnel, and ~5 of 23 beats of breadth remaining. |

**One-line verdict**: *AB2's other refuel finally happens — I fly up behind a big grey tanker, it
settles into formation overhead, RELOAD WEAPONS blinks under it while my missile rack fills back up,
and then I'm handed back into the fight; and when I kill something now the blast throws a wide flat
row of orange puffs and red debris instead of a compact vertical puff. What still isn't the arcade:
the tanker reads like a stealth-manta where the arcade's is a winged tanker with a tail fin, and my
jet hangs below it instead of nosing up to the boom.*

### What anchors the score (the look / the play, in player language)

**I looked first.** `cmp-tanker.png` (ours | arcade): both carry the cyan **RELOAD WEAPONS** low-centre
and the player F-14 tucked beneath a grey tanker with multiple orange engine nacelles — the beat is
unmistakably the AB2 mid-air reload. **Where they differ:** the arcade tanker is a winged
KC-style aircraft with a **vertical tail fin** jutting up at top-centre and wings swept **down** to
engine pods, and the arcade jet **noses up and docks to a visible refuel boom**; ours is a flatter
**manta / flying-wing** with no tail fin, four nacelles flanking a big dark cockpit box, and the jet
sits level with a **gap** below it rather than docked.

**The fireball** (`cmp-fireball.png`, ours | arcade): ours is now a **wide horizontal row of orange
puffs** with red debris thrown left and right and flanking smoke — a clear step from R18's compact
vertical puff toward the arcade's wide spray.

**Sampling trap I caught:** my first tanker pass (`--every 30`, 0.5 s) showed **no** RELOAD WEAPONS
text — the overlay blinks on a 0.5 s period and I was aliasing onto its off-phase every frame. A
consecutive-frame capture (`--every 2`) in the docked window caught it immediately. The text is there.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **TANKER: a new `airrefuel` mid-air refuel beat — fly up behind a tanker, stock refills, hands back to flight** | **SURVIVES** | My `?airrefuel=3` sequence: frames labelled `[airrefuel stage 3]` for ~5 s then flip to `[flight stage 3]` — it **enters, holds, and hands back**, not a dead-end. The tanker **grows/settles** as the jet closes (approach ease-in, confirmed in code: span/centre lerp over `AIR_REFUEL_APPROACH_S`=1.2 s). **RELOAD WEAPONS** blinks once docked (caught at `--every 2`). **Stock refills** cold→full: code ramps `missileStock` from `round(START*0.3)` to full across the beat, snapped to exact full on handback; after handback I saw a **full 5-pip rack** and combat live again (enemies, flak). **Combat is off** during the beat (`combatActive:false`). **Reachable** via `?airrefuel` **and in normal progression** — `isAirRefuelStage` fires on stages **3 and 9**, entered from both launch and stage-advance, wired like the runway. |
| **TANKER silhouette matches the arcade reload tanker** | **PARTIAL** | Four orange nacelles, central cockpit with red sensor dots, grey palette, and the RELOAD-WEAPONS composition all read right. **But** ours is a flatter manta/flying-wing **missing the arcade's vertical tail fin** and down-swept winged-tanker read, and the jet **does not nose up / dock to a visible boom** (sits low with a gap). Recognizable as the beat; not a match of the airframe. |
| **FIREBALL: widened toward the arcade's ~37.8%W spray, with horizontal debris, WITHOUT being taller** | **SURVIVES** | Isolated fire/debris extent above the jet body across one blast cycle (`?combatexpl=1`, `--every 2`, 60 Hz): peak **~34%W** (frames 11–12), up from R18's ~19%W core, toward the arcade's 37.8%W. The peak frame is a **wide horizontal row of orange puffs + red debris sprayed left/right + flanking smoke** — a spray, not a vertical puff. Height band (~orange core 22%H) is **not inflated** vs R18 — the growth is horizontal, as instructed. |
| **REGRESSION: combat stages 1–4 render right; runway resupply intact; combat wins unregressed** | **SURVIVES** | Combat stages 1–4 render in their correct biomes (sea/islands, desert, night-city-lights, forest+cyan river) with enemies, HUD, vulcan — **no tree-tunnel leak**. **Runway resupply** (`?stage=5`) still drops into the **autumn tree tunnel** with the low-swoop and depot props (tents/tanker/barrel rack). **Played** seed 7: blind straight fire → **0 hits**; aimed bursts → hits climb **0→1→2**, score **6,600→39,600**, **locks form** (2), **missiles fire** (stock 50→48, one in flight), enemies **spawn** (8→10) and **shoot back** (8 shots). `playtest selftest` **8/8**. |

## Sampling rates (citation field 6)

- Arcade tanker/fireball reference: single `-frames:v 1` stills — composition/silhouette only, no motion claim.
- Tanker lifecycle: `capture.mjs`, `?airrefuel=3&seed=1`, `--every 30` (0.5 s) for the enter/hold/handback
  state-label sequence; `--every 2` (≈0.033 s) with `--warmup 90` for the docked RELOAD-WEAPONS blink.
  State read from the tool's own `[airrefuel/flight stage N]` label.
- Fireball extent: `?combatexpl=1&seed=1`, `--every 2` (≈0.033 s), 30 frames; peak-frame bounding box of
  fire/debris-hued pixels above 0.60 H (excludes the jet nozzle flames) — an extent figure, not a motion figure.
- Combat check: `playtest.mjs` seed 7, 60–150-tick turns (turn = sampling rate) + 8-assertion selftest; no
  speed claim finer than a turn.

## Ranked gap list for R20 (player language — what most breaks the illusion now)

1. **BREADTH IS STILL THE FLOOR — ~5 OF 23 BEATS, MOST STAGES ARE 4-PALETTE LAPS.** The two refuel
   mechanisms now both exist (runway + tanker), which is the big structural news. What's left is the
   **distinct combat stages** — beyond stages 1–4 the content laps the same four authored palettes.
   More authored biomes/set-pieces toward 23 is now the single biggest remaining distance from the arcade.
2. **THE TANKER IS THE RIGHT BEAT WITH THE WRONG AIRFRAME.** Give it the arcade's **vertical tail fin**
   and **down-swept winged-tanker** read (it currently reads as a stealth manta), and **dock the jet to it**
   — nose the F-14 up to a visible refuel boom instead of hanging it in a gap below. The composition and the
   RELOAD-WEAPONS prompt are already right; this is the airframe + docking pose.
3. **DENSIFY / CLEAN THE TREE TUNNEL (carried from R18 #3, unaddressed).** Still a sparser row of larger
   blobby canopies vs the arcade's dense continuous wall. Secondary: **measure the stage-5 refuel sky**
   (reads pale-cream vs arcade orange — STAGE_MAP flags it low-confidence; measure before tuning).
4. **FIREBALL — LAST STRETCH TO THE ARCADE PUFF.** Width is now close (~34%W vs ~37.8%W). The remaining
   tell is the puff **interior**: the arcade's spray balls carry **white-hot cores**; ours in the wide
   spread are orange-only. Add white cores to the flanking puffs (not more vertical height).
5. **TITLE STILL TRAILS THE ARCADE'S ITALIC LEAN (carried).** A second pass once the bigger gaps are handled.

**Kept as positives (do not regress):** the new **airborne tanker refuel** (enter/refill/handback,
RELOAD WEAPONS, wired into stages 3/9); the **wider fireball** (horizontal spray + debris, not taller);
the **refuel runway tree tunnel** (both biomes) + low-swoop + depot props; **combat framing byte-identical
outside the refuel states** (stateless `flow.state` gates); every combat win (aim-beats-blind, locks,
missile loop, enemies shoot back). **Do NOT inflate the fireball vertically** (measured fine — the R20
fix is white cores, not height). **Do NOT grow `ENVELOPE_Y`** (R15-refuted).

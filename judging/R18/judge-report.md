# R18 judge report — fresh context, look first, then re-measure

**Judge**: fresh-context agent, R18 gate. **Tree judged**: HEAD `a18e7c0` (clean, committed —
`9f5c54c` world tree-tunnel + selective cloud clearing, `a18e7c0` polish title + fireball finding).
**Method**: look-first — decoded the mapped arcade refuel frames (`ab2-longplay.mp4` t=246–255 stage 5,
t=554–564 stage 13; STAGE_MAP spans 244–256 / 552–568), the title (t=74), and arcade combat stages
2/3/4 (t=128–146 / 168–188 / 208–232), and put our `?stage=5` / `?stage=13` / `?showtitle=1` beside
them before measuring. Then re-measured every shipped claim with my own captures (`capture.mjs`,
`?fixed=1`, seed 1): a 6-frame scrolling refuel run per stage, an isolated fireball-extent measurement
on `?combatexpl=1`, a single-frame horizon-fraction per stage for the framing-gate check, and a scripted
combat session on `tools/playtest.mjs` (seed 7) + its 8/8 selftest.

## SCORE

| | R17 | R18 | one-line reason |
|---|---|---|---|
| **Stills** | 8.7 | **8.9** | +0.2. The R18 **#1 gap and "single biggest tell"** — the refuel runway's missing **tree tunnel** — is **substantially closed on both refuel stages at once**: stage 5 is now walled by dense **autumn** canopies and stage 13 by **palms** (which also closes R17's named "stage 13 has no palms" gap in the same stroke), with the depot props (tents, tanker, trucks, barrel rack) now sitting *inside* the tunnel instead of parked alone at the horizon. Both refuel stages now **pass the glance test** against the arcade where R17 said "a player can still separate it at a glance." Plus stage 4's sky is correctly **cleared** (arcade stage 4 is clean teal — I confirmed) and the title letterforms are **sharper** (chamfered A, knife-point terminals). Held below 9.0 because the tunnels are a **sparser row of larger, blobbier canopies** than the arcade's dense continuous receding wall, the **fireball** still reads narrow (below), and breadth is still ~6 of 23 beats. |
| **Motion** | 8.7 | **8.8** | +0.1. The tree tunnel is a **real scrolling tunnel** (world-space rows streaming past the dropped swoop frame — confirmed by frame-to-frame position change, not static billboards), which enriches the refuel pass's terrain-rush. The **framing gate is intact and I measured it**: combat horizon 0.57–0.66 (cruise regime), resupply 0.12–0.22 (low-swoop) — cleanly separated, the swoop does not leak into the fight. Combat unregressed (combat files untouched; selftest 8/8; enemies/score/hits all live). Modest because motion was not this round's focus. |
| **Composite** | 8.7 | **8.8** | +0.1 — a clean, focused round that closes the single biggest remaining refuel tell and regresses nothing. Not more because the tunnels still fall short of the arcade's dense wall, the kill fireball still reads narrower than the arcade's half-screen blast, and the breadth floor (~6 of 23 beats; the airborne tanker unbuilt) is unchanged. |

**One-line verdict**: *The refuel stages finally look like the arcade's — I drop low into a tunnel of
autumn trees on stage 5 and palms on stage 13, walls of foliage streaming past both sides of the strip
with the tents and trucks and barrels now tucked inside them; what still sets ours apart is that the
arcade's tree wall is denser and cleaner where ours is a sparser row of big blobby canopies, and the
kill fireball is still a compact puff where the arcade's is a wide flat spray of debris.*

### What anchors the score (the look / the play, in player language)

I looked first. **Arcade stage 5** (t=252): a tunnel of **autumn trees** to the top edge on both
flanks, a crew+tanker cluster at the landing point, a motorcycle, green trucks on the verges.
**Arcade stage 13** (t=557): the same framing in **palms** and green ground under a pale-green sky,
jeeps on the right. **Our stage 5** (`ours-s5/frame-0000`, `frame-0003`): the jet drops low
(measured horizon **0.12**) into a frame where dense **autumn canopies** wall both sides, **A-frame
tents**, a **green military truck**, a **barrel rack** and a **tanker** scrolling *within* the tunnel,
trees receding down the road — it reads unmistakably as the AB2 autumn refuel base. **Our stage 13**
(`ours-s13/frame-0003`): **palm trees** flanking a green strip under a sage sky, trucks and a barrel
rack — a distinct palm base, with the palms R17 said were missing now present. Both tunnels **scroll**
(tree screen positions change frame to frame — a world-space tunnel, not billboards).

- **Real gains I saw/measured.** (1) **Both refuel tunnels land** — autumn on 5, palm on 13 — the #1
  R18 gap substantially closed and the stage-13 palm gap closed with it. (2) The tunnel **scrolls** and
  the props sit **inside** it, not parked at the horizon. (3) **Stage 4's sky is correctly clear**
  (arcade stage 4 t=208–232 is clean teal — verified). (4) The **title is sharper** (chamfered A arch,
  knife-point F/E/T terminals — verified against the lane's before/after and arcade t=74). (5)
  **Nothing regressed**: framing gate measured intact, no tree leak into combat stages 1–4, combat
  plays (selftest 8/8, enemies/score/hits live).
- **What still breaks the spell.** (1) The tunnels are a **sparser row of larger, blobbier canopies**
  than the arcade's dense continuous receding wall — closer inspection still separates them. (2) The
  **kill fireball** is a compact vertical puff-cluster where the arcade blast is ~2× wider as a flat
  horizontal debris spray (below). (3) Breadth is still **~6 of 23 beats**; the airborne tanker is
  unbuilt.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **TREE TUNNEL: the refuel runways now read as the arcade's tree-walled bases (autumn 5, palm 13)** | **SURVIVES (substantially closes the #1 gap)** | My own scrolling `?stage=5` / `?stage=13` captures show dense flanking vegetation rising up the dropped frame on both — autumn canopies on 5, palms on 13 — with the depot props now *inside* the tunnel, and the tree positions change frame-to-frame so it is a real world-space scroll, not static billboards. This is the single biggest refuel tell from R17, closed, and it closes R17's "stage 13 has no palms" at the same time. **Remaining gap vs arcade:** ours is a sparser row of larger/blobbier canopies vs the arcade's dense continuous wall. |
| **TITLE: letterforms sharper / more arcade-angular** | **SURVIVES (modest)** | `?showtitle=1` vs the lane's before/after and arcade t=74: the A arch is now **chamfered** (was a rounded flat arch in the R9 before) and F/E/T carry **knife-point terminals**. A genuine step toward the arcade's brush-angular style. Still short of the arcade in overall italic lean and tighter letter-packing; the chrome-sphere plate shape was deliberately left unchanged. |
| **FIREBALL: ours is NOT smaller than the arcade scale-matched (gap is SHAPE, not size)** | **PARTIAL (the narrow claim holds; "not smaller" overstates)** | I isolated our explosion cloud on `?combatexpl=1` (masking out the jet's own twin nozzle flames, which contaminated a naive bbox to 59%H): peak **~19 %W × 24 %H**. Against the lane's arcade figure (37.8 %W × 22.8 %H spray / 15.6 %W core): our **core/height is comparable-or-bigger** than the arcade's bright core — so "ours is tiny" is refuted, the lane is right that height isn't the problem. **But** the arcade total blast is **~2× wider** than ours (37.8 vs ~19 %W) as a flat horizontal debris spray with flanking smoke, so to a player the arcade kill does **cover more screen / read bigger**. The reframe to "shape not size" is directionally right; the flat REFUTED is too strong. Real R19 gap: width + debris spread. |
| **CLOUD GATE: stage 4 cleared, stages 2/3 kept — correct vs STAGE_MAP/arcade** | **SURVIVES (stage 4 correct; 2/3 harmless)** | **Stage 4 clear is right** — arcade t=208–232 is clean teal, no banks; ours matches. **Stage 3 keep is defensible** — arcade stage 3 shows white cloud banks in flight (t=178), though the reload frame (t=168) is clean black. **Stage 2 keep is weakly justified** — arcade stage 2 (t=138, t=146) is clean orange with no banks, and STAGE_MAP sets it `cloud_density 0.0` — but ours renders **no visible clouds** on stage 2 in a clean frame either, so it is harmless, not a visible regression. |
| **REGRESSION: combat framing intact, no tree leak, combat wins unregressed** | **SURVIVES** | Measured horizon fractions: combat s1=0.625, s2=0.571, s4=0.665 (all cruise regime); resupply s5=0.121, s13=0.223 (low-swoop) — cleanly separated, the swoop stays gated. Combat stages 1–4 render normal (sea/islands/burst wall, desert, night city-lights, forest+cyan river) with **no tree-tunnel leak**. `playtest.mjs` seed 7: enemies spawn (8–10 on screen), score climbs 6600→13200, hits register; selftest 8/8. Combat files (`weapons/**`, `combat.js`) untouched this round. |

## Sampling rates (citation field 6)

- Arcade refuel/title/combat reference: single `-frames:v 1` stills of `ab2-longplay.mp4` at the
  timestamps cited — pose/composition/scenery only, no motion claim.
- Our stage captures: `capture.mjs`, `?fixed=1&seed=1`, `--every 30` (0.5 s apart at the tool's 60 Hz
  step) for the 6-frame refuel runs; state read from the tool's own `[resupply/flight stage N]` label.
  The "tunnel scrolls" claim is a frame-to-frame POSITION-CHANGE observation across those 0.5 s steps,
  not a speed figure.
- Fireball extent: `?combatexpl=1`, `--every 3` (≈0.05 s at 60 Hz), 12 frames; peak-frame bounding-box
  of fire-hued pixels above the jet body — an extent figure, not a motion figure.
- Horizon fractions: single-frame modal-top-sky coverage cut (tol 36, first sustained <40 % row below
  0.12 H), one frame per stage — a composition figure, not a motion figure.
- Combat check: `playtest.mjs` seed 7, 120-tick turns (turn = sampling rate) + 8-assertion selftest; no
  speed claim finer than a turn.

## Ranked gap list for R19 (player language — what most breaks the illusion now)

1. **STILL ~6 OF 23 BEATS — THE AIRBORNE TANKER IS UNBUILT.** With the refuel-runway look now
   largely finished, breadth is the biggest structural distance from the arcade. The runway refuel is
   one of **two** arcade refuel mechanisms; the **mid-air/airborne tanker** refuel is still absent, and
   more combat stages widen the game toward 23. Quality over quantity — wired as well as the runway,
   with the scenery pipeline this round proved out. (World + flow.)
2. **THE KILL FIREBALL READS NARROW.** Measured: the arcade kill spreads **~2× wider** than ours as a
   flat horizontal **debris spray** with flanking smoke puffs; ours is a compact vertical puff-cluster
   (our height/core is fine — it's width and debris that are missing). Give the blast a wider, flatter
   footprint with horizontal debris streaks so climaxes read as big as the arcade's. (Effects.)
3. **DENSIFY & CLEAN THE TREE TUNNEL.** The tunnels land but are a **sparser row of larger, blobbier
   canopies** than the arcade's dense continuous receding wall — more trees, smaller/cleaner canopy
   silhouettes, carried further up the frame, would close the last of the refuel-stage separation. A
   polish pass on the thing R18 just built. (World.) Secondary: the stage-5 refuel sky reads pale-cream
   vs the arcade's warmer orange (low-confidence thin-band value — measure before tuning).

**Loose ends (low priority).** Stage 2's cloud flag is on where arcade/STAGE_MAP say clear, but renders
nothing visible (harmless). The title still trails the arcade in italic lean / letter-packing. The
blind-gun floor and `SIGHT_NDC_Y_OFFSET` reconciliation remain the measure-first items they were.

**Kept as positives (do not regress):** the refuel tree tunnels (autumn 5 / palm 13, scrolling, props
inside); the low-swoop gated so combat framing stays cruise (measured combat 0.57–0.66 vs resupply
0.12–0.22); stage 13's green palm biome; stage 4 brighter with cyan river **and now clear sky**; the
sharper title; every combat win (combat files untouched); stages 1–4 combat intact.

## Instrument limits (stated plainly)

- The tree-tunnel and title verdicts are judged against single arcade stills (scenery/pose), which
  stills support; the "tunnel scrolls" claim is a 0.5 s-step position-change observation, not a
  frame-for-frame speed match.
- The fireball arcade figure (37.8 %W / 15.6 %W core) is the polish lane's measurement, corroborated by
  its composite's visible wide-flat-debris shape; I independently measured only OURS (~19 %W × 24 %H).
  The conclusion rests on a ~2× width gap, far wider than either measurement's error.
- The cloud-gate verdict is from single frames per stage; arcade stage 3's in-flight white masses
  (t=178) read as cloud banks but could not be fully disambiguated from combat smoke on one frame.
- The combat regression check is one seed (7) confirming combat plays + the selftest; I did not re-run
  the full lock-per-wave or gun A/B, as combat files were untouched.

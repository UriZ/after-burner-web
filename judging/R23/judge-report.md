# R23 judge report — fresh context, look first, then re-measure, then PLAY

**Judge**: fresh-context agent, R23 gate. **Tree judged**: HEAD (`8a7d0c4` R23 canyon
fix, on top of `e607f5f` R23 tanker swept-wedge wings). Tree clean/committed.
**Prior**: `judging/R22/judge-report.md` (R22 = 9.1 motion / 9.2 stills, composite 9.2).

**Method**: look-first, then re-measure, then PLAY. Captured the two headlines beside the
mapped arcade — the CANYON (`?stage=8`) beside arcade stage 8 (decoded `ab2-longplay.mp4`
t=344–368, HUD digit "8" confirmed), the TANKER (`?airrefuel=3`) beside
`reference/stage3-reload-tanker-t165.png`. **PLAYED the canyon and stage 1** on
`tools/playtest.mjs` (seed 7, holding the stick, aiming up into the enemy band, holding the
missile button) and counted locks on both. Ran the demo=2 scripted-aim comparison through
`tools/combat_probe.mjs` on both stages, reading `locks` and the sight/jet `ndcX` per tick.
**A/B'd stage-1 combat HEAD vs pre-canyon-fix `e607f5f`** in an isolated worktree — exact PNG
diff. **A/B'd the canyon itself HEAD vs `e607f5f`** (the pre-open-fix dark-tunnel version) —
the cleanest evidence for the open/lighten claim. Measured the tanker wing wedge on both the
arcade and ours. `playtest.mjs selftest` 8/8. Evidence beside this report.

## SCORE

| | R22 | R23 | one-line reason |
|---|---|---|---|
| **Stills** | 9.2 | **9.3** | **The canyon is bright and open now, not a dark tunnel, and the tanker airframe is finished.** Direct A/B of the same sim tick (score 10450): PRE-fix the rock masses pile across the top-centre and blot the cream sky — enemies silhouetted against a brown rock wall; POST-fix the rock is pulled to the flanks and the cream sky (`#faecb0`) is open across the top-centre with the enemies over open floor (`judge-canyon-open-f3.png` vs `judge-canyon-PREFIX-darktunnel-f3.png`). The **tanker** is now a swept-wedge winged transport: four level orange pods, central dome, and wings that rake UP from a deep root to thin high tips (measured below), matching the arcade silhouette. Held from higher because the canyon walls still read as **open-desert flank ridges**, not the arcade's **tall vertical walls rising floor-to-top** that make a narrow corridor, and the floor is still **sparser** than the arcade's wall-to-wall packing. |
| **Motion** | 9.1 | **9.3** | **Canyon aiming is fixed and combat is byte-identical outside it.** The R22 play-breaker — the sight railing off-centre so you could barely lock in the headline biome — is gone. Played both: with proper aim the **canyon accumulates 5 of 6 locks**, vs the **stage-1 control's 4** under the same style of play (R22: canyon 0–1 vs stage-1 6). The sight rails symmetrically to ±0.18 in the canyon (stage-1 ±0.19), and under demo=2 bank the canyon sight range (−0.248..+0.342) is *tighter* than stage-1 (−0.288..+0.420) — the R22 rail to −0.70 is gone. Stage-1 combat A/B vs pre-fix is **maxdiff 0** across 5 frames, so the roll-axis fix is genuinely canyon-gated. `selftest` 8/8. |
| **Composite** | 9.2 | **9.3** | +0.1 — **both R23-targeted headline breaks are fixed (canyon opened + made aimable) and the tanker airframe is finished, with ZERO regression** (stage-1 byte-identical, all 7 biomes + both refuel beats render, selftest 8/8). Held from higher because the canyon still isn't the arcade's canyon: walls read as flank ridges rather than a tall-walled corridor, and the floor is still sparse. |

**One-line verdict**: *The two things that broke the illusion last round are fixed. The canyon
used to be a dark rocky tunnel where the walls piled across the top and blotted out the sky —
now the rock sits to the sides and the cream desert sky is open across the middle, bright and
wide the way the arcade's is. And I can finally fight in it: last round the aim railed off to
one side and locks barely formed in the canyon, now I sweep the sight up onto the enemy jets
and the lock brackets snap on and stack up — five of them, better than I get on stage 1.
Nothing outside the canyon changed; stage 1 is pixel-for-pixel what it was. The tanker overhead
is a finished machine now — four engine pods and broad wings that sweep up to high thin tips,
just like the arcade's. It's still not a perfect copy of the arcade canyon — our walls are more
like rocky hills along the edges than the tall sheer cliffs that box you into a corridor, and
the ground isn't as packed with tanks and tents — but it reads and plays as the canyon now.*

### What anchors the score (the look / the play, in player language)

**The canyon opened and lightened (`judge-canyon-open-f3.png` + `-f0.png` vs the pre-fix
`judge-canyon-PREFIX-darktunnel-f3.png`, and arcade `judge-arcade-s8-t350.png`):** this is a
clean before/after at the *same sim tick*. PRE-fix (score 10450): a brown rock mass fills the
top-centre, the enemies hang in front of a wall of rock, and the cream sky is almost gone
(top-band cream 4.3%, mean luminance 88). POST-fix (same 10450): the rock is pulled to the
left/right flanks, the cream sky is open across the top-centre, enemies sit over open floor
(top-band cream 19.6%, mean luminance 113). Across all six captured canyon frames and the
played session, **no near-wall mass ever balloons across the centre** — the R22 "swallows the
jet and the enemy" defect is gone. **Still short of the arcade:** the arcade (t=350/t=362) has
**tall vertical rock walls** rising floor-to-top at the extreme edges, boxing a narrow bright
corridor; ours reads as open desert with **rocky ridges along the top edges** — brighter and
open, but not yet a walled corridor. And the floor is still sparser than the arcade's
wall-to-wall tanks/tents/scrub.

**Canyon aiming — PLAYED (`judge-canyon-locks.png`):** the headline fix. Holding the sight up
in the enemy band (y≈0.59) with the missile button down and sweeping across the enemy spread,
the **canyon accumulated 0→1→2→3→4→5 locks** (MAX is 6); the stage-1 control under the same
play reached 4. The lock brackets visibly snap onto both enemy jets in the canyon frame. Under
the deterministic demo=2 scripted aim, both stages cap at peak 1 lock (demo=2 is a weak
discriminator), but the canyon sight range is *tighter* than stage-1's — the geometry is at
parity. The rails match (canyon ±0.18 vs stage-1 ±0.19) and the R22 under-bank rail to −0.70 is
gone. A player now locks and missiles in the canyon the way they do on the open stages.

**The tanker (`judge-tanker-ours.png` vs `reference/stage3-reload-tanker-t165.png`):** the
airframe is finished — fin (R22) + wings (R23). Four level orange pods, central grey dome with
the red cockpit dots, and **swept-wedge wings**: a deep nacelle-cowl root with thin tips raking
UP to the top corners. The **dock works** — the jet noses up under the belly with twin flames
and the missile stock restocks (tanker lane touched only `render/tanker.js`; dock logic
untouched, and the pips refill across the sequence).

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **CANYON OPENED + LIGHTENED — walls to the flanks, centre open to the cream sky, never a dark tunnel** | **SURVIVES** | Same-tick A/B HEAD vs pre-fix `e607f5f`: PRE top-band cream 4.3% / meanL 88 (rock blots the sky), POST cream 19.6% / meanL 113 (cream sky open across the top-centre). No near-wall mass swallows the centre in any of 6 frames or in play. |
| **CANYON AIMING FIXED — locks like the open stages, sight centres** | **SURVIVES** | Played seed 7: canyon reached **5 locks** (of 6) vs stage-1 control **4** under the same play. Rails canyon ±0.18 vs stage-1 ±0.19; demo=2 under-bank canyon sight range (−0.248..+0.342) *tighter* than stage-1 (−0.288..+0.420). R22's rail to −0.70 / "canyon 0–1" is refuted. |
| **TANKER airframe finished — swept fin + swept-wedge wings (tips higher than root)** | **SURVIVES** | Measured both: ARCADE tip ABOVE root by **+0.065H** (both sides); OURS tip ABOVE root by **+0.038H** (both sides, symmetric). Same wedge direction as the arcade. Minor: ours up-sweep is shallower (0.038H vs 0.065H) — deepen for a full match. |
| **Dock still works (noses up, twin flames, RELOAD + restock)** | **SURVIVES** | `?airrefuel=3`: jet noses up under the belly with twin flames, stock pips refill across the sequence. Tanker lane touched render only. |
| **REGRESSION: combat byte-identical OUTSIDE the canyon** | **SURVIVES** | Stage-1 `demo=2` A/B, HEAD vs pre-canyon-fix `e607f5f`: **maxdiff 0, 0 nonzero px across 5 frames**. The roll-axis re-rotation is canyon-gated. |
| **All 7 biomes + both refuel beats render; selftest 8/8** | **SURVIVES** | Swept stages 1,2,5,8,13,14,16 — all render the correct biome (`judge-biome-sheet.png`); stages 5 & 13 render the runway refuel beat. `selftest` 8/8. |
| **(Criterion) Tanker wings "drooping tips / anhedral downsweep" (R22 wording)** | **RETIRE — REFUTED by the arcade** | The arcade wingtips sit measurably ABOVE the root (+0.065H my measure, +0.08H the lane's), the OPPOSITE of anhedral droop. The "droop" the eye reads is the deep nacelle root falling away from the high fuselage shoulder, not the tips falling. Accept the lane's correction; the target is a deep-root → high-thin-tip sweep. |

## Ruling on the tanker anhedral criterion

**Retire it.** The R22 "drooping tips / anhedral downsweep" acceptance language is contradicted
by the arcade. Independently measuring `reference/stage3-reload-tanker-t165.png` (grey wing
mass, left and right spans), the wingtip midline sits **above** the nacelle-root midline by
~0.065H on both sides — the wing rakes UP to thin high tips, it does not droop. This matches the
tankerwings lane's per-column measurement (tip 0.195H, root 0.275H). Building to "drooping tips"
would have moved the wing the wrong way. The correct criterion: **a deep nacelle-cowl root
sweeping UP to thin high tips, nacelles level on the shoulder.** This is the fourth criterion
this project has retired against the reference; log it in ARCHITECTURE/GAME_SPEC accordingly.

## Sampling rates (citation field 6)

- Arcade canyon: `ffmpeg -ss {344,350,356,362,368} -frames:v 1` single stills from
  `ab2-longplay.mp4` (HUD digit "8" confirmed) — composition/palette, no motion figure.
- Arcade tanker: single `-frames:v 1` still (`reference/stage3-reload-tanker-t165.png`) — composition only.
- Ours canyon/tanker/biome stills: `capture.mjs ?fixed=1` + `window.__step`, deterministic stepped frames.
- Canyon + stage-1 LOCK PLAY: `playtest.mjs` seed 7, 10-tick turns (the sampling rate), telemetry
  from `__combatStats().locks`, not pixel inference; identical hold-and-sweep input on both stages.
- demo=2 aiming comparison: `combat_probe.mjs --every 6 --debug`, `locks` + `playerNdc.x` per sample, both stages.
- Regression + canyon A/B: `capture.mjs`, HEAD vs worktree `e607f5f` — exact PNG diff.

## Ranked gap list for R24 (player language — what most breaks the illusion now)

1. **GIVE THE CANYON TALL VERTICAL WALLS — a corridor, not rocky ridges.** The canyon is bright
   and open now, but ours reads as open desert with rocky hills along the top edges; the arcade
   (t=350/t=362) has **tall rock walls rising floor-to-top at the extreme left/right**, boxing a
   narrow bright corridor you fly down. Raise the flank walls into real vertical cliffs while
   keeping the centre open and the cream sky showing (don't re-create the dark tunnel). Highest-
   value next move on the headline biome. (World: `ground.js` canyon wall geometry.)
2. **DENSIFY THE CANYON FLOOR to the arcade's wall-to-wall packing.** Carried from R22 #3: ours
   is ~1–2 vehicles + scattered scrub per frame; the arcade (t=350) is ~3 tanks + several tents +
   15–20 scrub clumps packed across the whole floor. Combat readability held, so there's room. (World.)
3. **GIVE THE FLAT FIELD BIOMES (14 orange field / 16 water) REAL STRUCTURE.** Carried: stage 14
   is still a flat orange field and stage 16 open water (`judge-biome-sheet.png`) vs the arcade's
   dense city/forest/sea traffic. The canyon's wall + floor-prop pattern is sound now, so it's
   ready to copy. (World + a stateless horizon gate.)

**Also open (minor):** deepen the tanker wing up-sweep from +0.038H toward the arcade's +0.065H
for a full match; certify `STAGE_8.scrollSpeed` (still ADOPTED).

**Kept as positives (do not regress):** the **bright, open canyon** (walls to the flanks, cream
sky showing); **canyon aiming at parity with the open stages** (5 locks, sight centred);
**combat byte-identical outside the canyon** (maxdiff 0); the **finished tanker airframe** (swept
fin + swept-wedge wings) + the working dock/RELOAD/restock; the canyon floor battlefield
(tanks/tents/scrub); both refuel beats; seven combat biomes; every combat win on the open stages;
the wider fireball + hot cores; the ~8 s death cycle. **Keep new camera/geometry work STATELESS
and prove byte-identical outside; do NOT grow `ENVELOPE_Y`.**

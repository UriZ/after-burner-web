# R24 judge report — fresh context, look first, then re-measure, then PLAY

**Judge**: fresh-context agent, R24 gate. **Tree judged**: HEAD (`ecdbbb3` R24 canyon
finish, on top of `8f3f258` R24 tanker withdrawal — no src change). Tree clean/committed.
**Prior**: `judging/R23/judge-report.md` (R23 = 9.3 motion / 9.3 stills, composite 9.3).

**Method**: look-first, then re-measure, then PLAY. Decoded my OWN arcade stage-8 frames
(`ab2-longplay.mp4` t=346/352/358/364, HUD digit "8" confirmed) rather than trust the lane's
single arcade PNG. Captured a 12-frame consecutive canyon burst under `?stage=8&invincible=1`
(level flight) and compared it to the arcade across the scroll. A/B'd centre-column openness
HEAD vs the pre-canyon-finish tree (`8f3f258`) in an isolated worktree at **identical ticks**
(HUD identical, so the delta is the sky change). PLAYED the canyon and stage-1 control with an
identical hold-and-aim input (seed 7, stick up into the enemy band + missile held) and counted
locks on both. A/B'd stage-1 combat HEAD vs `8f3f258` — exact PNG diff. Verified the docked
tanker wing against `reference/stage3-reload-tanker-t165.png`. `playtest.mjs selftest` 8/8.
Evidence in `judging/R24/judge-evidence/`.

## SCORE

| | R23 | R24 | one-line reason |
|---|---|---|---|
| **Stills** | 9.3 | **9.3** | **The canyon floor is genuinely denser and the walls are taller and more cliff-textured — but the headline goal (a tall-walled corridor) is only PARTIAL, and the centre-openness win eroded slightly.** The floor now carries tanks, trucks, striped tents and ~10-12 boulder/tuft clumps per frame (up from R23's ~1-2 vehicles + sparse scrub) — a clear, visible improvement toward the arcade's packed battlefield. The wall sprites are taller, with castellated rims, vertical rock edges and ledge striations — real cliff faces at the extreme edges. BUT across the consecutive burst our walls read as a **rock band riding the TOP of frame plus an intermittent single-side cliff block**, over a **wide-open floor**; the arcade boxes a **narrow corridor** with tall rock on **BOTH** flanks reaching down to mid-frame **every** frame. The "corridor, not hills" goal is not met. And the centre-column horizon cream band fell 37.8%→28.6% at identical ticks (still open, not a tunnel — but the taller walls encroach). Net flat: density up, wall-shape goal unmet, centre slightly narrower. |
| **Motion** | 9.3 | **9.3** | **Aiming survives the wall/floor changes at EXACT parity, and combat is byte-identical outside the canyon.** Held the stick up into the enemy band with the missile button down on both stages (seed 7): the canyon and the stage-1 control reach **6 locks** with an **identical lock sequence** (`…4,4,5,5,5,5,6,6`) — the R23 aiming fix is intact (expected: only `ground.js` changed; combat/camera code untouched). Stage-1 `demo=2` A/B vs pre-canyon-finish is **maxdiff 0** across 5 frames. `selftest` 8/8; all biomes + both refuel beats render; the tanker dock works. Nothing regressed; nothing in motion changed. |
| **Composite** | 9.3 | **9.3** | **HOLD.** The round delivered a real floor-density gain and ZERO regression, and aiming is proven intact — but the #1-ranked headline (tall cliff corridor) is only PARTIAL and the centre-openness win eroded measurably, so it does not earn +0.1. An honest hold. |

**One-line verdict**: *The canyon floor is more of a battlefield now — tanks, trucks, tents and
a thick scatter of rocks and scrub where last round it was mostly bare dirt — and that reads.
The rock on the edges is taller and genuinely cliff-like up close, with layered rock bands and a
jagged top. But it still isn't the arcade's canyon: in the arcade you fly down a narrow slot with
a tall rock wall standing on BOTH sides, every single moment; in ours the rock mostly sits as a
ridge along the top of the screen and a single cliff slides past on one edge or the other, while
the floor stays wide open on both sides. So it reads as rocky badlands, not a walled corridor —
better than R23's open desert, but not the thing the round set out to build. The centre is still
bright and open (good — it was NOT re-tunneled), though a touch less open than last round because
the taller walls lean in a little. And the important thing survived: I can still fight in here
exactly like on stage 1 — I swept the sight up and the locks stacked to a full six, the same as
the control. Nothing outside the canyon moved.*

### What anchors the score (the look / the play, in player language)

**Canyon floor density — SURVIVES (`judge-canyon-level-f10.png`).** The clearest win of the
round. A single level frame now shows two tanks, a green truck, a tent, and roughly a dozen
boulder/tuft clumps spread across the floor; R23's frame had ~1-2 vehicles and a thin sprinkle.
It moves toward the arcade's wall-to-wall packing (t=350 still has more armour, but the gap
closed a lot). Combat readability held — the props stay off the flight-axis centre.

**Canyon walls — PARTIAL (`judge-canyon-level-f5.png` / `-f10.png` vs `judge-arcade-s8-t352.png`
/ `-t364.png`).** The sprite art improved: a near wall at the frame edge is now a tall rock sheet
with a castellated rim and dark ledge bands, reading as a real cliff face rather than a rounded
lump. But the *composition* did not reach the arcade. In my 12-frame burst, the dominant structure
is a horizontal rock band across the top ~20-30% of frame, plus — on most frames — ONE cliff block
sliding past the extreme left OR right while the other flank is open floor. The arcade (t=352,
t=358, t=364) has tall rock on BOTH flanks, based low (down to mid-frame), framing a narrow floor.
Ours keeps a full-width open floor. A player sees "open rocky desert with a ridge along the
skyline," not "a corridor between two cliffs." Root cause looks like camera framing, not prop
count: the walls were pulled inward in `ground.js` (x=7.2-9.8) but the canyon camera still sits
high/wide enough that the near ground is off to the open sides, so walls attach near the horizon
and ride the top edge instead of standing on the near floor.

**Centre still open — SURVIVES WITH CAUTION.** Centre-column horizon-band cream (my operator:
bright warm pixels with blue channel >55 — excludes the b≈0 rock — over x∈[0.38,0.62], y∈[0.06,0.17])
measured **28.6%** on HEAD vs **37.8%** on the pre-canyon-finish tree at identical ticks. The
centre is clearly open every frame (cream sky shows across the top-centre; this is NOT R22's dark
tunnel — a tunnel reads near 0). But the taller walls encroached: the openness win is ~24% smaller
than R23's. Not a regression to flag as a break, but the R23 headline eroded slightly and should
be reclaimed (trim wall height a hair while keeping the density).

**Canyon aiming — PLAYED, SURVIVES at exact parity.** Holding the sight up (stick y=0.62) with the
missile button down and a gentle sweep, seed 7: the **canyon reached 6 locks**, and so did the
**stage-1 control**, with a byte-identical lock sequence. The R22 lock-suppression / R23 rail is
gone and stays gone. `combat_probe` confirms enemies spawn centred (approach fighters at ndcX≈0)
and brackets form in the canyon. Only `ground.js` changed, so this is expected — but verified by
play, per the standing rule that telemetry can pass what the hands fail.

**Tanker — withdrawal ACCEPTED (`judge-tanker-docked.png` vs `reference/stage3-reload-tanker-t165.png`).**
At the docked state ours is four level orange pods, a central grey dome with red cockpit dots, and
swept-wedge wings raking UP to thin high tips — a good silhouette match. If anything ours rakes
marginally STEEPER than the arcade, so deepening the up-sweep would overshoot. See ruling below.

## Shipped claims, re-measured independently

| Claim (lane) | Verdict | My evidence |
|---|---|---|
| **CANYON TALL CLIFF CORRIDOR WALLS — sheer walls floor-to-top both flanks, narrow corridor** | **PARTIAL** | Wall art is taller/cliff-textured (ledges, castellated rims) — real improvement. But across a 12-frame burst the read is a rock band on the TOP edge + an intermittent single-side cliff over a WIDE-open floor, not the arcade's continuous tall rock on BOTH flanks (t=352/358/364) boxing a narrow corridor. "Corridor, not hills" not achieved; looks camera-bound, not prop-count-bound. |
| **CENTRE STILL OPEN — not re-tunneled** | **SURVIVES (caution)** | Centre-horizon cream 28.6% (HEAD) vs 37.8% (pre-fix) at identical ticks. Clearly open every frame (not a tunnel), but ~24% narrower than R23 — the taller walls encroach. |
| **DENSER FLOOR — toward wall-to-wall** | **SURVIVES** | A level frame now shows 2 tanks + truck + tent + ~12 boulder/tuft clumps (R23: ~1-2 vehicles + sparse scrub). Closer to the arcade's packing; arcade still has more armour. |
| **AIMING STILL WORKS (R23 fix survives)** | **SURVIVES** | Played seed 7, identical hold-and-aim: canyon 6 locks, stage-1 control 6 locks, identical lock sequence. `combat_probe`: enemies centred, brackets form. |
| **REGRESSION: combat byte-identical OUTSIDE canyon** | **SURVIVES** | Stage-1 `demo=2` A/B HEAD vs `8f3f258`: maxdiff 0, 0 nonzero px across 5 frames. |
| **All biomes + both refuel beats render; selftest 8/8** | **SURVIVES** | Stages 1,2,14,16 render correct flight biome; 5 & 13 render the resupply beat; `?airrefuel=3` docks with twin flames; `selftest` 8/8. |
| **(Tanker) wing up-sweep already matches at dock — WITHDRAWAL, no change** | **ACCEPT** | Docked silhouette matches (ours marginally steeper). The R23 0.038H was a mid-approach small-span artifact; deepening would overshoot. The lane's re-measurement logic is sound. |

## Ruling on the tanker withdrawal

**Accept it.** The R24 task (deepen the wing up-sweep 0.038H→0.065H) was taken from the R23
judge's figure, which the lane re-identified as a **mid-approach-frame artifact**: at frame 0 the
tanker renders at ~0.70W span (un-docked, small/high), so the same correct wedge slope over a
smaller span yields a smaller H-fraction (the lane reproduced exactly 0.038H there). The arcade
reference is the **docked formation**, and at dock the lane measures ours +0.067..0.089H trailing-
edge up-sweep vs the arcade's +0.063..0.079H (midline slope ratio 0.98, ours marginally steeper).
My own docked capture confirms the silhouette match visually, with ours if anything raking steeper.
**Deepening would push past the arcade.** Declining to fabricate a slope change to a number taken
off the wrong frame is the correct, honest call (CLAUDE.md: "check the criterion against the
arcade"; "an honest withdrawal is an accepted deliverable"). The lane logged the real residual —
the up-sweep reads shallow *during the approach* because of render scale (`flow.js`
`TANKER_APPROACH_SPAN`), out of `tanker.js`'s lane — as a low-priority flow.js item.

## Sampling rates (citation field 6)

- Arcade canyon: `ffmpeg -ss {346,352,358,364} -frames:v 1` single stills from `ab2-longplay.mp4`
  (HUD digit "8" confirmed) — composition/palette, no motion figure.
- Arcade tanker: single `-frames:v 1` still (`reference/stage3-reload-tanker-t165.png`) — composition only.
- Ours canyon/tanker/biome stills: `capture.mjs ?fixed=1` + `window.__step`, deterministic stepped frames.
- Centre-openness A/B: `capture.mjs` HEAD vs worktree `8f3f258`, identical `--every 10` ticks, same HUD.
- Canyon + stage-1 LOCK PLAY: a hold-and-aim driver (boot = `combat_probe`'s, input via `__setStick`),
  seed 7, 40 turns of 6 ticks, `__combatStats().locks` telemetry — identical input on both stages.
- Regression A/B: `capture.mjs` HEAD vs `8f3f258` — exact PNG diff.

**Instrument caveat.** A crude "dark rock (max<120)" flank-coverage count mis-read the arcade's
BRIGHT tan rock as floor, so I did **not** publish flank percentages; the corridor ruling rests on
the direct visual comparison across 6+ frames per side.

## Ranked gap list for R25 (player language — what most breaks the illusion now)

1. **GIVE THE FLAT FIELD BIOMES (14 gold-dusk / 16 blue water) REAL STRUCTURE — now the clear
   headline.** These are still totally flat open fields with a bare horizon and no ground features
   (`judge-biome14.png`, `judge-biome16.png`) vs the arcade's dense city/forest/sea traffic. The
   canyon now has walls + a packed floor; these have nothing. With the canyon at diminishing
   returns, this is the biggest remaining tell. Copy the canyon's props + horizon-structure pattern
   (MEASURE each biome's arcade frames; keep any low camera stateless). (World + a `game.js` horizon gate.)
2. **THE CANYON IS ROCKY BADLANDS, NOT A CORRIDOR — and it's now a CAMERA problem, not a prop one.**
   Two rounds (R23, R24) of `ground.js` geometry have not produced the arcade's tall rock standing
   on BOTH flanks with a low base, because the canyon camera sits high/wide enough that the near
   ground is off to the open sides and walls attach near the horizon. Either (a) commit to a
   stateless canyon camera that drops/narrows so walls rise from the near floor on both flanks every
   frame (prove byte-identical outside; do NOT grow `ENVELOPE_Y`; do NOT re-tunnel the centre), or
   (b) declare the canyon "good-enough rocky desert" and stop spending rounds on it. I lean (a) is
   the only path to the arcade corridor, but it is higher-risk than gap 1. While here, reclaim the
   small centre-openness erosion (28.6% → back toward R23's 37.8%) by trimming wall height a hair.
3. **KEEP WIDENING TOWARD 23 biomes (~7 of ~23).** More measured biomes/set-pieces after 14/16 get
   structure. (World + flow.)

**Kept as positives (do not regress):** the **denser canyon floor** (tanks/trucks/tents/scrub); the
**open, bright canyon centre** (cream sky across the middle every frame — do NOT re-tunnel); **canyon
aiming at exact parity** (6 locks, identical to stage 1); **combat byte-identical outside the canyon**
(maxdiff 0); the **finished tanker airframe** (swept fin + swept-wedge wings) + the working
dock/RELOAD/restock; both refuel beats; seven combat biomes; every combat win on the open stages; the
wider fireball + hot cores; the ~8 s death cycle. **Keep new camera/geometry work STATELESS and prove
byte-identical outside; do NOT grow `ENVELOPE_Y`.**

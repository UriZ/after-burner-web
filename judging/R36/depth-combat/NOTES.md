# R36 depth-combat lane — arcade measurement, diagnosis, change, verification

Gap (rank 2, playtest R36): "Everything dies point-blank on my nose — aiming feels like
holding a funnel, and hands-off play still cleared stage 2." Files owned:
`src/game/spawner.js`, `src/entities/enemy.js`, `src/entities/enemySprite.js`.

## 1. Arcade measurement — where do kills actually happen?

**Operator.** 60 Hz consecutive decode (`ffmpeg -ss T -t D -i ab2-longplay-60fps.mp4
-vsync 0`) of STAGE_MAP-verified spans: stage 1 t=94–114 (1200 frames), stage 2
t=128–150 (1320 frames). An explosion-ONSET index built with
`judging/R36/depth-combat/explosion_onsets.py` (STAGE_MAP.md's own explosion-bright
operator: S>0.55, V>0.90, warm hue; components ≥400 px at 1028×720; onset = new blob not
present in prior 4 frames). The index is recall-only: **every candidate was cropped and
read by eye** (review sheets `scratchpad evcrops/s1-review-0*.png`, archived crops in this
dir), the kill count cross-checked against the SCORE/HIT counters visible in-frame, and
the published statistic (enemy span %W on the last frames before the fireball) is
hand-read. First warm-only mask ate stage 2's entire orange sky/ground (components of
300k+ px) — caught by crop-and-look, replaced with the S/V operator; stage 2 is therefore
read qualitatively from contact sheets, stage 1 quantitatively.

**Bins** (frame width 1028 px; 3.2125× native, so %W is scale-free): NEAR ≥12 %W,
MID 3–12 %W, FAR <3 %W.

**Stage-1 census** (t≈96–104.5, ~18 distinct kills after merging each kill's ballooning
smoke; the score ticking +110 per kill corroborates the multi-kill clusters):

| bin | kills | share | evidence (frames at 60 Hz from t=94) |
|---|---|---|---|
| NEAR (≥12 %W / at the player) | ~4 | ~22 % | f0129/f0133 (large white enemy, fireball on it), f0209–f0215 (eruption at the player's wing), f0235 (under the jet), f0370 |
| MID (3–12 %W) | ~10 | ~55 % | f0335 (missile visible in flight to the kill), f0339–f0351 salvo (score 16620→17060), f0457, f0473 (bracketed ~4 %W target), f0575, f0645 |
| FAR (<3 %W speck) | ~4 | ~22 % | f0393 ×2 (specks dying inside lock brackets), f0415/f0441–f0451 salvo (score 22230→22670, brackets on specks) |

**Stage-2 corroboration** (contact sheet t=142.3–143.8, HIT 6→8): both kills at mid
depth/size; far specks persist for seconds without converging on the nose; the only huge
nose-filling fireballs are kills already resolved at depth ballooning past the camera.

**Three structural findings:**
1. **~3/4 of arcade kills happen OUT at depth** (mid/far), mostly missile kills on
   bracketed targets the player visibly hunts — f0629 shows the player banked hard toward
   a ~2 %W bracketed speck. Point-blank kills exist (~1/4): close-pass drama is real but
   is the minority.
2. **The close-range spectacle is dead smoke, not live enemies dying at the nose.** A kill
   at mid depth leaves an orange smoke ball that balloons 1/d past the camera for ~2 s
   (f0339–f0357, f0575–f0587). The arcade gets its in-your-face fire WITHOUT routing live
   targets to the nose.
3. **Unkilled enemies cross and LEAVE.** f0407: a crosser passes the camera large and
   alive. f0457: the red elite delta passes close, never dies. Far specks outlive whole
   salvo cycles (f0860→f0948 stage 2).

No temporal/speed claims are made from these stills beyond event counts at 60 Hz;
pose/scale/composition only.

## 2. Diagnosis — ours (shipped build, measured with the same operator)

Instrument: `judging/R36/depth-combat/kill_depth_probe.mjs` — drains combat.js's
killLog (`window.__killDrain`; span is projected at the kill tick, the same quantity the
arcade census hand-reads) under two pilots: **aimed** (proportional steer of the sight
onto the nearest enemy — tools/aim_lock_probe.mjs's controller — fire+missile held) and
**hands-off** (stick centered, fire+missile held). Same NEAR/MID/FAR bins.

Baseline numbers: `killdepth-baseline.json` (seeds 7/42/3 × 120 s × both arms).

**Code paths that build the funnel** (all in src/game/spawner.js, shipped values):
- **Every non-crosser ordinary wave is a 6–9-ship BURST WALL** (`BURST_EVERY = 1`) that
  flies in and FREEZES at depth 3.5–5.2 = **13.6–20.2 %W** (NEAR bin) for ~1.3 s,
  centred on the frame (`baseB` jitter ±0.06): a standing wall of near-size targets
  delivered to the nose, with its central members inside a parked sight's assist cone.
  R15 sized that hold to the then gun-kill floor (≥14 %W); **R26 cut
  GUN_KILL_SPAN_FRAC 0.14 → 0.03**, so the wall's "must be ≥14 %W to be gunnable"
  rationale is obsolete — the gun now kills at 3 %W (depth ≈23).
- **Crossers and flybys dive to the nose**: `_crosserWave` ends at depth 3.0 (23.5 %W),
  `_flyby` at 2.9, both crossing the central column at the sight's own altitude
  (NEAR_BAND median +0.28 ≈ the rest sight line) — free kills for a centered stick.
- **The R32 close-drought clip force-feeds a nose crosser every ≥3 s** without close
  presence, so under any sustained fire the near field is perpetually restocked.
- Echelons (the arcade's own head-on pattern) also converge, but they are the pattern
  the arcade itself funnels at you; they are not the defect.

Net: essentially ALL patterns terminate at the player at 13–27 %W; nothing but the
lock-bait must be hunted at depth; a dead stick collects the wall centre + every
crosser/flyby/drought-fill crossing the cone.

## 3. Change (src/game/spawner.js ONLY; enemy.js/enemySprite.js untouched)

1. **NEW `_deepFormationWave` — the round's missing-system item.** A 3–5-ship formation
   that enters at mid depth (depthA 42–54), tracks across the upper sky ABOVE the
   parked sight's assist cone (whole pass held at ndcY ≥ 0.47; cone top +0.445), and
   exits the far side at depth 12–15 (≈5–6 %W) — it **crosses and leaves**; it never
   converges on the nose. Lockable the whole way (lock band is depth 16–88), gunnable
   near its exit only by a pilot who climbs onto it: a target you HUNT, matching the
   arcade's persisting bracketed formations (§1 finding 3). It does NOT fire — the
   firing variant was built and measured first: its early-band trains (eligible from
   spawn) held the 3-slot train budget on maximum-lag snapshots and dropped the fairness
   death rate to 1.0–1.33/min on seeds 5/6 (out of band); with fire removed the rate
   returned to exactly 2.00 on all three seeds. Verified behaving as authored:
   `deep_traj_probe.mjs` (enters d≈42–49 at one edge, y +0.42..0.62, exits past the
   other edge at d≈15, max span 4.7 %W) + screenshot `cap-final-deep-s7/frame-0002.png`.
2. **Walls demoted from "always" to one non-crosser ordinary wave in three**
   (`BURST_EVERY 1 → 3`, on a new `nonCrosserIndex` counter — at 3 the old
   `ordinaryIndex % BURST_EVERY` would have aliased against the crosser's % 3 and no
   wall would ever spawn). Non-crosser cycle is now deep / echelon / wall. The wall
   still exists (R15's wall-then-lull); it stops being the standing rhythm.
3. **Wall holds deeper and off the nose**: hold depth 3.5–5.2 → 4.6–6.4
   (**11.0–15.3 %W**, still a readable wall ≥ the R32 8 %W close threshold), and the
   hold ladder keeps a `BURST_CENTER_GAP` (no member holds inside ~|x| 0.15 on screen;
   step 0.072 → 0.05 so the outermost member keeps the R15 reach bound). Justified by
   R26's GUN_KILL_SPAN_FRAC 0.14 → 0.03: the R15 "wall must stand ≥14 %W to be
   gunnable" rationale expired ten rounds ago.
4. **Crossers and flybys cross at the PLAYER's altitude, not the sight's** (arcade
   t118–119: "right over the player"): crosser Y draws from NEAR_BAND's lower tail
   (u ∈ [0.75,1]) and both crosser and flyby endpoints are capped at ndcY ≤ −0.08,
   below the parked cone's −0.07 bottom edge — close-pass drama preserved, no longer a
   standing feed to a dead-centre stick. (Stated distortion: the cap piles a thin tail
   at −0.08; the quantile-matched vertical bands exist for the approach population,
   which is untouched.)
5. **Close-drought clip loosened 3.0 → 4.5 s** (system kept; the refill stops arriving
   faster than the arcade's own 2–4 s close-enemy gaps).

All five are in spawner.js; `?pace=burstevery=1,deepevery=0,closedrought=3.0` recovers
the R35 rotation for A/B (the Y-caps/wall-gap/hold-depth are not behind levers and are
active in both arms of that switch).

## 4. Verification (all probes in this directory; unique output dirs throughout)

**Same-tree A/B of the rotation levers** (kill_depth_probe, seeds 7/42 × 120 s, both
arms on the CURRENT tree — the only comparison not confounded by sibling lanes editing
their own files between runs):

| arm | aimed kills/min | hands-off kills/min | aim advantage |
|---|---|---|---|
| switch-back (R35 rotation) | 47.5 / 49 | 38.5 / 42 | 1.17–1.23× |
| shipped R36 defaults | 40 / 38 | 28 / 26 | 1.43–1.46× |

Hands-off productivity **−31 %**, aim advantage **1.2× → ~1.45×**. Hands-off deaths
8–9 per 120 s and maxStage 1 (both arms; vs aimed 1–4 deaths, maxStage 2–3) — a
hands-off run now dies ~3× more often than an aimed one and progresses less.
Full-history numbers: `killdepth-baseline.json` (pre-change tree: hands-off 30.5–35,
aimed 44–49), `killdepth-final.json` (final: hands-off 26–28 at p50 span 5.3–6.1 %W,
aimed 37–40 at p50 4.8–5.3 %W, near-bin share hands-off 0.23–0.27 vs aimed 0.09–0.14).

**Fairness** (tools/fairness_probe.mjs, seeds 4/5/6 × 180 s, ?demo=1):
baseline deaths/min **2.000 / 2.000 / 2.000** → final **2.000 / 2.000 / 2.000**
(`fairness-baseline.json`, `fairness-after2.json`) — inside the ±10 % band exactly;
0 unannounced fatal hits both sides. Enemy rounds/min 29.7/45.7/51.3 → 33.7/43/39
(pooled −8.6 %, inside the seed scatter but worth a glance next round; the intermediate
firing-deep-formation build is in `fairness-after.json` and is the arm that was out of
band on deaths).

**R32 close-presence re-check** (presence_probe.mjs, aim-and-fire pilot, ≥8 %W enemy
present): new build 0.086/0.047/0.117 vs same-tree switch-back 0.083/0.087/0.076 —
pooled 0.083 vs 0.082, unchanged; no regression chargeable to this lane. NOTE an
instrument disagreement: RESOLVED R37 (judging/R37/r32-reconcile/NOTES.md) — R32's
actually-published figure was 0.12–0.24 (which reproduces on the R32 build with this
probe); "0.33–0.40" was a spawner.js comment citing a sweep that never existed. The
build also really did decline ~0.15 → 0.11 (R33–R35 weapon buffs) → 0.07 (this lane's
non-levered routing changes).

**Kill-size mix vs arcade** (same bins both sides): arcade ~22 % NEAR / 78 % MID+FAR;
ours (aimed, final) ~12 % NEAR / 88 % MID+FAR; ours (hands-off) ~26 % NEAR. The
mid/far dominance is now real on the aimed path; the FAR share (arcade ~22 %) remains
small (0–5 %) because our missiles resolve after closure — see the residual below.

## 5. The measured residual — NOT fixable from this lane's files (request logged)

The round's acceptance ("hands-off must NOT come anywhere near aimed kill rates") is
**not met**: 1.45× is better than 1.2× but a dead stick still kills ~26–28/min. The
blocking mechanism is weapon geometry, not traffic routing, and the evidence is in the
owning files' own history:

- **src/weapons/vulcan.js `HIT_RADIUS_SPAN_MULT = 1.2`** (R26, owner's "the gun is
  dead" fix) + `HIT_RADIUS_FLOOR_FRAC = 0.05`: the kill circle is 2.4× the target's
  own wingspan (a 20 %W crosser carries a ~half-frame-wide kill disc; nothing routed
  anywhere near the frame centre can miss it). The R8 sweep IN THAT FILE'S COMMENT
  measured neutral/tracking kill ratio as a function of this constant: 0.8 → 77 %,
  0.5 → 64 %, 0.3 → 60 %. 1.2 is beyond the top of that sweep. My Y-cap/gap routing
  changes moved hands-off crosser kills barely (19→13-16/120 s) for exactly this
  reason — crop-level geometry cannot beat a 2.4×-span hit disc.
- **src/weapons/lockSystem.js auto-lock on central transits**: hands-off (button held,
  stick centred) fires 20–25 missile KILLS per 120 s — nearly the aimed arm's 17–23.
  Whatever transits the rest cone self-locks for a held button.

Request to the TL / owning lanes: re-run the R8 `hitmult` sweep on today's build
(keeping R26's usability — the 0.05 floor protects "point at it and it dies" for
AIMED fire), and let the lock lane decide whether a parked-stick lock should be free.
Until those move, the aim-advantage ceiling from pure spawner routing is ~1.45×.

## Files touched

- `src/game/spawner.js` (only src change; enemy.js/enemySprite.js untouched)
- Probes/evidence in `judging/R36/depth-combat/` (this directory); arcade review
  sheets built from 60 Hz decodes in the session scratchpad, kill-census crops
  documented in §1.

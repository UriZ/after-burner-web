# R38 sky-density lane — empty sky + parked wingmen

**Gap (playtest rank 5 + the R37-flagged old close-presence gap):** "Between the
brawls there are stretches of totally empty sky, and some enemies just park in
formation next to me like wingmen instead of attacking." Owned files:
`src/game/spawner.js`, `src/entities/enemy.js`.

## 1. What the playtest actually saw — replayed deterministically

Re-ran the two long playtest sessions' exact `commands.jsonl` on `?fixed=1`
at the matching seed (`replay_probe.mjs`, spawner telemetry, not pixels):

- **"Parked wingmen" = the slow crossing patterns.** Seed-11 replay ticks
  120-300 (playtest s2b turn-0002): a `crosser` fighter and later the
  `_deepFormationWave` members pace the player's right side for 3+ s, drifting
  slowly across the upper sky. Seed-7 replay ticks 920-960 (s1 turn-0014): TWO
  `_flyby` bombers at 25-30 %W ride beside the jet for a full turn. All three
  are the **crosser-family patterns at the pattern-default half rate** (crosser
  0.5, overtake 0.45): the flyby bomber at 0.5908·0.5 = 0.295 took **~7.9 s**
  to cross, the deep formation ~5 s, the crosser wave ~5.7 s. The arcade's own
  near-depth crosser is a **~1-1.5 s sweep** (60 Hz decode, stage-1 t=116-119.4;
  contact sheet `scratchpad/skyden/s1-crosser-02s.png`). Ours linger 4-6× too
  long → read as escorts.
- **"Totally empty sky" = the dead-sky clip was blind to visible emptiness.**
  Seed-7 replay ticks 1218-1438: **3.67 s of zero aircraft**, then ticks
  1438-1528 a lone depth-90 approach grows from 0.7→2 %W — a 2-3 px dot — for
  **~5 more s of visible-empty** (5.17 s total <2 %W). The R13 dead-sky clip
  only fired on `enemies.length === 0`, so a lone inbound speck kept it silent
  while the sky LOOKED empty. This is the r32-reconcile diagnosis verbatim:
  **ours arrive far and grow; the arcade arrives mid-large.**

## 2. Arcade anchor

60 Hz decode of STAGE_MAP stage-1 combat t=94-120 (`scratchpad/skyden/arc-s1`,
1560 frames). Hand-read the deepest lull t=105.5-113 at full res
(`s1-empty-candidates.png`): live aircraft are visible through most of the
HIT-counter pause (the lock bracket holds a distant target the whole time),
and the refill at t≈107.75 **enters already legible next to the player**, never
as a horizon dot growing for 5 s. Longest truly-empty stretch ~1.5-2 s. An
automated non-sky pixel count was tried and **withdrawn** — it conflated the
player's wingtips, sea foam and smoke (3450 "empty" px vs 82589 for a 5-ship
flight; the segmentation trap CLAUDE.md names). Presence targets therefore rest
on the prior hand-read arcade figures (R13/R32: readable present ~40-70 % of
stage-1 combat; distant specks nearly always present), not a new auto-count.

## 3. Changes (both files)

**`src/entities/enemy.js`** — one field, `rateMult`: an authored multiplier on
the type's depthRate that overrides the pattern default (crosser 0.5, overtake
0.45) when non-null. Visual/timing only; the telemetry-identity path is
unaffected when it is null.

**`src/game/spawner.js`:**
1. **Crossing tempo (the "wingmen" fix), GENTLE not maximal.** `rateMult` on
   the three crossing patterns: flyby **0.85** (bomber eff 0.502, crossing
   **4.65 s**), crosser wave **0.70** (interceptor eff 0.620, **4.05 s**), deep
   formation **0.65** (fighter eff 0.461, **2.75 s/member**, ~4 s event). Well
   clear of the 5.7-7.9 s dwell that read as an escort, but still lingering
   enough to keep the sky populated. A first cut at 1.0/0.75/0.8 (~2-4 s)
   killed the wingman read but emptied the sky faster than cadence could
   refill (zeroFrac 0.26→0.37) — backed off.
2. **Dead-sky clip keys on VISIBLE emptiness + fills with a non-firing RELIEF
   PAIR.** New `_reliefPair`: two fighters that slide in from just outside one
   edge at depth 20-28 (2.5-3.5 %W, legible on entry) and cross past the player
   to the far side — the arcade's "arrive mid-large from the side" shape, NOT a
   front-spawned pop-in (depth-20 front spawn would "appear" not "arrive"; the
   death-legibility2 lane's concern). The clip now fires when no on-screen enemy
   ≥2 %W has been present for `DEAD_SKY_MAX_S` (1.5 s, was 3.5), bridging the
   lone-speck gaps.
3. **The relief fill is ADDITIVE and GATED.** It does NOT touch `waveTimer`
   (firing waves keep their schedule → fire volume unchanged) and only fires
   when `aircraftAlive < 3` (leaves ≥half the MAX_ALIVE=6 budget for firing
   traffic). **This gate is load-bearing:** a first cut reset/extended
   `waveTimer` on each fill, which starved the firing echelons and collapsed
   enemy fire 28.5→5.1 rounds/flight-min (an R4-gap-5 violation) — caught and
   fixed before shipping.

Fairness by geometry (unchanged from R36): relief pairs and the sped crossers
**never fire** (fireDelay 1e9, or crosser geometry below FIRE_DEPTH_MIN=24), and
every one crosses at/below the player's altitude (y ≤ −0.08, the R36 crosser
cap), outside a parked sight's assist cone. No nose re-funnel; R36 routing
stands.

**A/B levers:** `?pace=r38tempo=0,relief=0,deadmax=3.5` recovers the pre-R38
build exactly (switch on this one tree). Readback via `window.__paceTunables()`.

## 4. Verification — all gates, pinned pilot, same operator both sides

**Empty-sky gap structure** (`gap_probe.mjs`, R36 aim-and-fire PINNED pilot —
the r32-reconcile mandate — `?invincible=1` for equal 134.5 s flight exposure,
seeds 7/11/3 × 120 s, pooled):

| metric | pre-R38 (switchback) | shipped | arcade anchor |
|---|---|---|---|
| **maxVisGap** (worst <2 %W stretch) | **6.5 s** | **2.23 s** | ~1.5-2 s |
| visEmptyFrac (<2 %W) | 0.315 | 0.271 | low (specks persist) |
| zeroFrac (no aircraft) | 0.272 | 0.234 | low |
| **presence8** (≥8 %W nominal) | **0.096** | **0.178** | 0.40-0.70 (drawn) |

The worst empty stretch is cut to a third; close presence nearly doubles. Note
`spanFrac` is NOMINAL span (~2× drawn width, R37 finding 4), so presence8 is
lenient vs the arcade's drawn-width 0.40-0.70 — the close-presence gap is
**dented, not closed**; fully closing it needs the arrival-pipeline redesign
r32-reconcile flagged (more side-entry mid-large arrivals, acceptance band on
drawn width), which risks the hard constraints and is out of this lane's scope.

**Enemy fire volume** (`fire_probe.mjs`, pinned pilot, `?invincible=1`, 5 seeds
7/11/3/42/19 × 120 s): shots 38.3 vs 34.7 /flight-min (+10 %, inside the
heavily-overlapping seed scatter), **telegraphs 11.1 vs 10.7 /flight-min (+4 %,
flat)**. Telegraph rate is the lethality driver (combat.js: lethality tracks
aim snapshots, not rounds); it is unchanged. The small shots delta is a
pilot-targeting artifact (more crossers to target), not a difficulty change.

**Fairness** (`tools/fairness_probe.mjs`, `?demo=1`, seeds 4/5/6 × 300 s):
deaths/min **1.0/1.6/1.6, pooled 1.4** (inside the 1.33 ±10 % = [1.197, 1.463]
band), **0 unannounced fatal hits**, warning floor 1.167-1.183 s, flight-share
71-80 %. NOTE: the demo `deaths/min` is confounded by flight-share — the pre-R38
build sends the demo into early game-over (flight-share 9 %, so deaths/min reads
an artificially low 0.6), while the shipped build keeps it flying (74 %). The
honest fairness read is 0 unannounced + the flat telegraph rate above.

**Aim advantage** (`kill_depth_probe.mjs`, seeds 7/42/3 × 120 s): hands-off
6.3 /min vs aimed 37.2 /min = **0.17** (≤0.4 ceiling — R36 depth routing
survives, in fact strengthened by the sibling R37 aim-skill lane).

**Boot/stage safety:** boots clean, reaches stage 2-3, 0 page errors across
every probe and a direct readback.

## 5. Residual (for a future lane)

Close presence by drawn width (~0.09 ours vs 0.40-0.70 arcade) is still the
largest open gap. It is NOT a traffic-routing problem — it is that ours arrive
at depth 90 and grow while the arcade arrives mid-large from the sides. This
lane's relief pair demonstrates the mechanism (side-entry at mid depth) but
only on the dead-sky trigger; generalising it to a share of the ordinary
rhythm, with an acceptance band defined on DRAWN width and a pinned pilot, is
the dedicated arrival-cadence lane r32-reconcile named.

## Files touched
- `src/game/spawner.js`, `src/entities/enemy.js` (owned)
- Probes + evidence in `judging/R38/sky-density/`; 60 Hz arcade decodes and
  before/after combat strips in the session scratchpad (`scratchpad/skyden/`).

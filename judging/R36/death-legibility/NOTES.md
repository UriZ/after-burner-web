# R36 death-legibility lane — notes

Gap #3: "I kept dying without ever seeing the shot that got me" (4 of 6 playtest deaths with
no visible incoming fire). Side find: score snaps to exactly 84755 at first death on both
seeds. Owned files: `src/weapons/enemyShots.js`, `combat.js`, `telegraph.js`,
`projectileSprites.js`, `src/game/score.js`, `src/entities/groundBattery.js`.

## 1. Reconciliation: which instrument lied, and why

**Both instruments reported truthfully under their own operators; the fairness probe's
operator was the wrong one for the question, and it also overstated battery warnings by
0.6 s.** Details:

- The probe's "announced" (combat.js `_logHit`) is a pure telemetry flag: *the firer's
  telegraph flare lit at some instant during the life that died*. It never required the
  flare — or the round — to be visible, any particular size, or on screen for any duration.
- It also assumed every flare runs `ENEMY_TELEGRAPH_S = 1.0 s`, but ground batteries flare
  for only `0.4 s` (groundBattery.js). Every battery kill's `warning` was therefore
  inflated by 0.6 s (reported 1.63 s; truth 1.03 s) and its `flareLit` back-dated. Fixed:
  the shot meta now carries the firer's true telegraph (`teleS`), its `type`, and its
  launch/aim geometry.
- The playtest's operator is the player's: *a round I can watch approach*. Under the
  corrected numbers the two instruments agree — see the taxonomy below.

**Corrected operator for "announced", stated per the lane brief:** a fatal hit is LEGIBLE
iff (a) its flare lit within the life it ended (the old flag, now with the true per-firer
telegraph), AND (b) the killing round is drawn at a READABLE size — ≥ ~7 native px of 320,
i.e. above the ~6 px the player's own vulcan puffs read and inside the arcade's measured
round-width band — for a window the player can notice and act in, ~0.75 s / 45 ticks or
more. Size is the binding clause, not duration: the air trains pass easily (1.0 s flare +
2.1–5.0 s of a 5.8–9.9 px fireball); the old battery round FAILS it — a flat ~6 px dot for a
0.64 s / 38-tick flight, right at the vulcan-puff size in ground clutter — which is exactly
the playtest's complaint. The old probe's "announced" flag ignored clause (b) entirely,
which is why it read 0 unannounced while the player saw nothing: the two instruments were
both right under their own operators, and the probe's was the wrong operator for the
question.

## 2. Death taxonomy (replayed playtest sessions, tick-exact)

Instrument: `replay_deaths.mjs` here — replays a session from seed + commands.jsonl via
`__setStick`/`__step`, 1 tick per evaluate, and reads the (new) hitLog attribution at each
flight→death transition. **Validated on a known input**: it reproduced the playtest's
independently observed first death at tick 1541 / score 84755 on BOTH seeds, to the tick.

Every death in the game is an enemy round through `combat.checkPlayerHit` (flow.js:840) —
there are no collision/terrain deaths. The 9 deaths across both sessions:

| session (seed) | death tick | killer | total warning | round flight (visible) |
|---|---|---|---|---|
| ses1 (7) | 1541 | battery | 1.00 s | 0.60 s |
| ses1 (7) | 2556 | battery | 1.00 s | 0.60 s |
| ses1 (7) | 3458 | battery | 1.00 s | 0.60 s |
| ses1 (7) | 4272 | battery | 1.03 s | 0.63 s |
| ses1 (7) | 5207 | battery | 1.03 s | 0.63 s |
| ses1 (7) | 5923 | fighter | 3.33 s | 2.33 s |
| ses2 (42) | 1541 | battery | 1.00 s | 0.60 s |
| ses2 (42) | 2558 | battery | 1.03 s | 0.63 s |
| ses2 (42) | 3766 | fighter | 3.10 s | 2.10 s |

**7 of 9 deaths were ground-battery rounds**, every one with ~1.0 s of total warning: a
0.4 s flare on a terrain turret in the ground clutter, then a round that left depth ~11.4
and crossed the player's plane 0.6 s (38 ticks) later, drawn at 5.8–6.7 native px the whole
way (the air rounds' size ramp tops out at PASS_DEPTH = 1.6, past the player, so a killing
round never reaches it). 60 Hz frames: `ses1-replay/frames/`, strip `death1-strip.png`,
zoom `ses1-replay/death1-round-zoom.png` — the round IS technically drawn, as a ~6 px dot
crossing a field full of the player's own point-blank kill explosions. The air-enemy
deaths, by contrast, carried 3.1–3.3 s of warning with a measured-envelope fireball —
R29's fix worked; the battery was the hole.

The baseline fairness probe corroborates on `?demo=1`: warningMedian = 1.033 s on all
three seeds — the MEDIAN fatal hit in the probe was already a battery round too.

## 3. The 84755 score snap — diagnosed, two causes, one fixed

`84755 = 3300 (passive score/s, measured, score.js) x 25.6833 s = tick 1541/60`. Kills pay
no immediate score (measured AB2 behaviour), so before the first stage tally the score is a
pure clock; it freezes at death. Identical score across seeds ⟺ identical first-death tick.

Why the tick was identical: `GroundBatteryManager` seeded its private PRNG with a FIXED
constant (`createPrng(0x8a77e27)`) — spawn time, placement, and aim spread of every battery
were a seed-independent timetable. The first battery round that connects crosses the player
plane at tick 1541 regardless of seed; both playtest sessions were near-centered then, so
both died on it. Fairness-probe corroboration: six deaths per 180 s run land at the SAME
six wall-times on seeds 4/5/6 (58.0, 79.9, 122.5, 141.3, 157.3 s) while air `shotsFired`
varies 89–154 — deaths in this build were literally a scripted battery metronome, and the
in-band "deathsPerMin 2.0" was that metronome, not emergent combat.

So: NOT a tally/display bug (score.js is correct and untouched beyond nothing); the fix is
the battery stream. `GroundBatteryManager` now XORs the URL seed into its PRNG — every
`?fixed&seed=N` run stays byte-deterministic, but different seeds are different games.

## 4. Change list

The gap has THREE causes and the fix addresses each; fire VOLUME is untouched (R30 CLOSED:
sparse fire) — same 1 round per battery pass, spawn cadence, and train budget.

- **Size (the load-bearing cause).** `src/weapons/enemyShots.js` gains a per-shot size
  profile: `fracFar`/`fracNear` endpoints and `progressSize`, which ramps the drawn size by
  FLIGHT PROGRESS toward the aim point instead of by absolute depth. The default air ramp
  only reaches its top at PASS_DEPTH = 1.6 (past the player at depth ~5), so a killing round
  was never drawn near full size — it was a flat ~6 px dot. Battery rounds now draw 7→9.9 px
  of 320 (the arcade stage-7 t330 round-width census median→p90: 6.85/8.50, max 10.58) over
  the approach the player watches. **Air rounds are byte-identical** — every new field
  defaults to the old constant and non-battery spawns pass no opts.
- **Speed (visibility margin).** `BATTERY_SHOT_PROFILE.speed` 10 → 8 u/s, so the round
  reaches the player plane in 0.80 s / 48 ticks instead of 0.64 s / 38 ticks — a bigger,
  longer-lived fireball to notice. NOT slower: dodge distance was never the limiter (the jet
  traverses ~19 %W in 0.5 s vs a 4 %W hit disc, so a player who SEES it clears it easily),
  and speed 6/64-tick drops deaths/min ~38 % out of band for reaction margin a human does
  not need. `combat.js` passes `BATTERY_SHOT_PROFILE` only for battery fires; the
  inbound-warning ETA now divides by the shot's own speed.
- **Determinism (the 84755 side find).** `GroundBatteryManager` PRNG seed-mixed
  (`0x8a77e27 ^ urlSeed`) — kills the seed-independent battery metronome. Every `?fixed&
  seed=N` run stays byte-deterministic; different seeds are now different games. ALSO: the
  first-spawn phase is now DRAWN (`4.0 + rng()*4`, constructor and reset()) — with a fixed
  4.0 first spawn and only a ±2 s interval band, battery PASSES stayed near-aligned across
  seeds even after the stream mix (probe still showed deaths at identical 94.5/109.2 s on
  all seeds); drawing the phase de-correlates the whole timetable.
- **Honest spread.** `SHOT_SPREAD_NDC` 0.06 → 0.025: the old wide spread was a crutch for an
  invisible round (it set the miss rate by unseen jitter, not by whether the player moved);
  the legible round aims essentially true, so a pilot who sees it and does not move is fairly
  hit and one who moves dodges. Measured flat on demo lethality across 0.012–0.035; this
  lever is stationary-pilot fairness, not lethality.
- **Instrument.** `combat.js` hitLog rows carry `type`, `fromX/Y/D`, `aimX/Y`, and per-firer
  `teleS`; `warning`/`flareLit`/`announced`/`inLifeWarning` are computed from the true
  telegraph (was hardcoded to the air 1.0 s). Added a BATTERY-only crossing census
  (`batteryCrossings`/`batteryHits`) to `__fairness`, since battery deaths are too few to
  tune the legibility/lethality trade on. All measurement-only.

## 5. Verification

**Instrument validated on a known input** (`validate_override.mjs`): a battery kill's
`warning` reads 0.4 + (fromD−5)/speed exactly — 1.98 s at `?battery=speed=4`, 1.03 s at the
old speed=10 — confirming the per-firer telegraph math. The death-replay tool reproduced the
playtest's first death at tick 1541 / score 84755 on both seeds, to the tick.

**Fairness probe** (`tools/fairness_probe.mjs`, seeds 4/5/6 × 180 s = 540 s):

| build | deaths/min | min warning | death times | unannounced fatal |
|---|---|---|---|---|
| BEFORE (orig, scripted) | 2.000 | 1.017 s | identical on all seeds | 0 |
| seed-mix only (isolates 84755 fix) | 1.778 | 1.017 s | first differs; passes still aligned | 0 |
| speed 8 + size + seed-mix (`probe-final8.json`) | 1.667 | 1.183 s | mostly differ | 0 |
| + lock-lane dry-fire patch (`probe-final8-dryfire.json`) | 2.000 | 1.183 s | some passes still tick-identical | 0 |
| **SHIPPED: + drawn spawn phase (`probe-final8v2.json`)** | **1.667** | **1.167 s** | **differ per seed** | **0** |

- **84755 fixed, verified at the original repro**: replaying BOTH playtest sessions on the
  shipped build, first deaths are ses1 (seed 7) tick 1641 / score 90255 vs ses2 (seed 42)
  tick 525 / score 28875 — fully de-correlated (was tick 1541 / 84755 on both). The probe's
  death times also no longer repeat across seeds (the stream mix alone left passes
  near-aligned — fixed 4.0 first-spawn phase — hence the additional drawn phase).
- **Deaths/min statistically unchanged**: 1.667 (shipped) vs 1.778 (de-scripted control) vs
  2.000 (scripted original / dry-fire rerun). With only 15–18 fatal hits per 540 s arm the
  Poisson sd on deaths/min is ~0.4, so ALL arms are within one sd; the honest high-N
  statement is the crossing census: per-round battery lethality 0.452 (old) → 0.517
  (speed 8, ~30 crossings each) — unchanged-to-slightly-up. The legibility change does NOT
  make the game easier. (Speed 6 would have halved it to 0.226 — rejected.)
- **Warning up** 1.017 → 1.167 s minimum; **0 unannounced fatal hits** in every arm under
  the corrected per-firer telegraph (the clearShots guarantee holds).
- **Dry-fire caveat**: the lock lane's dry missile draws from the shared gameplay PRNG, so
  arms before/after that patch differ by a stream shift as well (noted on the block).

**Visual** (`ab_capture.mjs`, seed 4, same battery round old vs new; `new-round-ascent.png`):
the new round is a hot white-cored, red-rimmed fireball that climbs visibly toward the
fuselage over its 48-tick / 0.80 s flight (N = 48), versus the true-old 6 px dot in
`death1-round-zoom.png` (captured under original ballistics). `ab-nearplayer.png` shows the
old round already gone while the new one is still a readable fireball at the jet.

**Honest trade stated**: speed 8 was chosen over the more-reactable speed 6 because dodge
distance was never the limiter (size was), and speed 6 would push deaths/min 38 % below
baseline — the wrong direction given the owner's standing "too easy" note. The fix makes the
killing round SEEABLE and keeps it as lethal as before; it does not make the game easier.

## 6. Cross-lane patch applied after the above: lock-clarity dry missile

TL routed the lock-clarity lane's dry-fire patch through this lane (combat.js single
writer): a missile press with NO lock now launches one unguided round up the sight line
(GAME_SPEC §3 "fire on button press, cooldown 0.4 s") on its own `dryCooldown`, and
`missiles.update` gets the enemy list for the dry shot's proximity fuse.

- The lock lane had ALSO edited combat.js directly, so the patch was present TWICE
  (double cooldown init/decrement, two fire blocks). De-duplicated to one copy.
- Verified (isolated `?combatonly=missiles,locks,sight`): 3 s hold with no lock = exactly
  ONE dry round; release + re-press = the next. Rising-edge semantics correct
  (`_wasHolding` is written at the end of `_updateMissiles`).
- **PRNG caveat, also commented on the block**: `missiles.launch` draws from the SHARED
  gameplay rng, so a conditional dry fire shifts every later draw — fairness numbers
  across this patch reflect a stream shift as well as the behaviour change. The
  re-baselined probe with the patch in is `probe-final8-dryfire.json`; §5's
  `probe-final8.json` is the pre-patch state of this lane's own changes.

# R40 threat-pacing lane — notes (incremental)

Gaps (R39 playtest ranks 2+3, build 6.5/10):
- "pressure is bursty — ~15 s stretches of zero incoming then a 30-shot barrage" (s7 t65–70)
- "both times I died while actually flying, the fireball came out of nowhere — I never saw
  the shot or the plane that got me" (s3b t4/t6; s7 t65) — **4th consecutive fresh player**,
  after R36 (size), R37 (sound) and R38 (strobe) each verified a fix to the ROUND's pixels.

Owned: `src/game/spawner.js`, `src/entities/enemy.js`, `src/entities/groundBattery.js`,
`src/weapons/enemyShots.js`.

## 0. Instruments

- `snapshot.sh <dir>` — freezes `index.html` + `vite.config.js` + `src/` into an isolated
  vite root (node_modules symlinked), so a 10-minute replay cannot be torn by another lane
  saving a file mid-run (R38 lost a probe run to a half-written `spawner.js`). Stamps
  `TREE_STATE.txt` with the HEAD sha + a src hash.
  BEFORE arm = `3b58a6e` with `src/` CLEAN (verified `git status --porcelain -- src` empty),
  i.e. exactly the build the R39 playtest played.
- `replay_firer.mjs` — the R36/R38 tick-exact session replay (seed + `commands.jsonl`),
  extended to record, EVERY TICK: the full `__fairness().enemies` roster (native-px screen
  position, type, depth, drawn width, telegraph, burstLeft), the player NDC, and the tick of
  every shot spawn (the cumulative `shotsFired` counter rising). `__fairness` and
  `__flowState` touch no RNG (combat.js:505); `__combatDebug` would and is never called.
- `analyze_death.mjs` — per-death firer attribution + the fire-schedule gap statistic.
- `scan_battery.mjs` — WITHDRAWN as an instrument (see §1.4): its nearest-neighbour battery
  tracker fragmented (41 "passes" where ≤15 are possible, negative depths, negative widths).
  Replaced by the trackless depth→screen-position census, which needs no identity.

**Instrument validated on a known input**: replaying the R39 playtest's seed-3 session
reproduces its first death at tick **441**, inside the playtest's independently reported
window (ticks 300–450, `judging/R39/playtest-evidence/s3b-t4-death-from-nowhere.png`) and
within 2 ticks of R38's independent replay of the same seed (tick 443, measured on R38's
in-flight tree). Seed 7 reproduces three deaths, matching the playtest's three.

## 1. WHO KILLED ME — all four R39 deaths, tick-exact

| session | impact tick | stage | killer | warning | round flight | launch NDC | launch depth |
|---|---|---|---|---|---|---|---|
| s3b (seed 3) | 441 | 1 | **battery** | 1.167 s | 0.767 s | (−0.593, **−0.412**) | **11.36** |
| s7 (seed 7) | 3343 | 2 | **battery** | 1.200 s | 0.800 s | (−0.557, **−0.412**) | **11.36** |
| s7 | 5160 | 3 | **battery** | 1.183 s | 0.783 s | (+0.626, **−0.412**) | **11.36** |
| s7 | 6173 | 3 | **battery** | 1.183 s | 0.783 s | (−0.361, **−0.412**) | **11.36** |

**4 of 4 are ground-battery rounds.** With R36's 7-of-9 and R38's 6-of-7 that is
**17 of 20 deaths across three rounds of fresh playtests**. The player is fighting
AIRCRAFT; the thing that kills them is, essentially always, a ground turret.

### 1.1 Was the firer on screen? YES — and that is the honest answer

Trackless census of every battery sample in both replays (1035 + 830 samples), binned by
depth — the battery's screen position is a pure function of its depth, so no identity
tracking is needed:

| depth | centre pxY (of 224) | drawn width (frac W) |
|---|---|---|
| 90 (spawn) | 142.3 | 0.022 (7 px) |
| 42 (flare lights) | 144.9 | 0.048 (15 px) |
| 20 | 150.1 | 0.099 (32 px) |
| **11.4 (fires)** | **160.2** | **0.197 (63 px)** |
| 7 (despawn) | 170.3 | 0.296 (95 px) |

The turret is **on screen for its entire life** — pxY 142→170 of 224, never off-frame, never
off the sides at fire time (fire-tick pxX 54.5 / 61 / 271 / 96 — all inside 0–320) — and it
is **63 px wide when it fires**. So "the firer was never on screen" is **REFUTED**. I am not
going to build a fix on it.

### 1.2 What IS wrong: the only firer that kills is the one nobody is watching, on the
### shortest fuse in the game

- The turret lives in a **28-px band at pxY 142–170**, the bottom third, in terrain clutter.
  Three of the four deaths happened with the player's jet at pxY 143/125/126 and one at
  **pxY 60** — mid-climb in open sky (the playtest's "death from nowhere" shot). The player
  is looking up the sight at aircraft; the killer is below the fight.
- **Total warning 1.167–1.200 s** — the project's own floor, hit to within 0.03 s on every
  death. Air-enemy kills, by contrast, carried **2.67–3.67 s** (R38 §1) and 3.10–3.33 s (R36
  §2). The class the player CAN'T see gives a third of the warning of the class they can.

### 1.3 The fatal geometry is a CONSTANT, not a distribution

Every fatal round launches from **depth 11.36 and ndcY −0.412, identical to the digit, on
four deaths across two seeds and three stages.** That is not coincidence — it is the design
collapsing to a point:

- The flare lights at `TELE_DEPTH_MAX = 42`; the ground scrolls 68.93 u/s = **1.149 u/tick**;
  `TELEGRAPH_S = 0.4` = 24 ticks = **27.6 depth units**. So a battery that lights its flare
  the first instant it is eligible has sunk to d ≈ 42 − 27.6 ≈ **14** when the flare expires,
  and the burst pays out a tick or two later at **d ≈ 11.4**.
- `FIRE_FLOOR_DEPTH = 12` is therefore not a floor with headroom above it — it is **1–2 ticks
  below where the telegraph always expires**. The "wide band" the module header describes
  (`TELE_DEPTH_MAX 42 … FIRE_FLOOR_DEPTH 12`) does not exist in play: there is exactly one
  firing geometry, and it is the minimum-warning, closest-launch, least-dodgeable one.
- Flight time is set by launch depth (`(d − playerDepth)/speed`, speed 8). Launch at 11.4 →
  0.78 s. Any launch farther out would give proportionally more warning — and the two
  batteries per pass that DO slip the eligibility window drop their burst entirely rather
  than fire late (groundBattery.js:289, deliberate). So the system's only outputs are
  "no shot" or "the 1.18 s shot".

### 1.4 Honest withdrawal

`scan_battery.mjs`'s battery-identity tracker is unreliable and its numbers are not used:
it reported 41 passes where the spawn cadence (7–11 s, max 2 alive) permits ≤ 15, plus
negative depths and a negative drawn width. Negative depth is itself REAL (a battery stays
in `spawner.enemies` while it scrolls behind the camera, z∈(0,7)), which is what defeated
the nearest-neighbour continuity. Everything in §1.1–§1.3 comes from the hitLog (exact,
per-death) and the trackless depth census (no identity required).

## 2. THE FIRE SCHEDULE IS BIMODAL — the "barrage then nothing" is measured

Operator: a FIRE EVENT is a tick on which `combat.shotsFired` rises (a round leaves an
enemy). Gaps are between consecutive fire events **during `state === 'flight'` only** (a
death or tally pause is not a drought the player lives through). Same operator both arms.

| session | play | fire events | rounds | gap med | gap p75 | gap p90 | gap max | **CV** |
|---|---|---|---|---|---|---|---|---|
| s3b (seed 3) | 64 s | 35 | 35 | 0.067 s | 0.083 s | 9.32 s | 10.08 s | **2.094** |
| s7 (seed 7) | 115 s | 44 | 54 | 0.083 s | 0.083 s | 7.53 s | **30.30 s** | **3.165** |

CV = sd/mean of the inter-event gaps: 0 is a metronome, **1.0 is Poisson (memoryless)**,
> 1 is CLUMPED. Ours is **2.1–3.2**.

Rounds per 10 s of play:
- seed 3: `[1, 1, 29, 1, 1, 1, 1]` — **29 of 35 rounds in one 10-second window.**
- seed 7: `[0, 1, 33, 0, 0, 1, 0, 0, 1, 1, 17, 0]` — **33 in one window, 17 in another,
  and eight of twelve windows hold 0 or 1 round.** Longest gap with zero enemy fire:
  **30.3 s.**

The playtest's sentence — "~15 s stretches of zero incoming then a 30-shot barrage" — is
not an impression. It is the schedule, to the round.

### 2.1 Mechanism (code, not inference)

- `enemy.js:490` **`TRAIN_LENGTHS = [8]`** and `enemy.js:349` **`SHOT_SPACING_S = 0.08`**:
  one air enemy's train is **8 rounds in 0.64 s**. The measured gap median (0.083 s) IS
  `SHOT_SPACING_S` — i.e. the typical gap between rounds in this game is the gap *inside*
  a burst, not between bursts.
- `spawner.js:748` `TRAIN_START_GAP_S = 0.15` and `:699` `MAX_CONCURRENT_TRAINS = 3`: three
  enemies may be in a train at once and only 0.15 s apart, so a wave can put **24 rounds in
  the air inside a second**.
- The droughts are the other half of the same mechanism, and `spawner.js:723-727` already
  says so: "candidate availability sets the rate… an approach is eligible to open a train
  for only ~1.09 s of its ~5 s life". Waves spawn together, so eligibility windows
  **coincide**; between waves there is no eligible shooter at all.
- `TRAIN_SWEEP_STEP_NDC = 0.012` × 8 rounds = a **0.084 NDC (13 px) total rake**: all eight
  rounds of a train land within 13 px of each other, from ONE aim snapshot. So the barrage
  is also **one decision**: move off the snapshot and all 8 miss; hold still and all 8 hit.
  That is why a 30-shot barrage was survivable "banking randomly" (playtest, per-weapon
  report) while a single 1.18 s battery round kills.

`spawner.js:742` flags the gap this leaves: *"It is blocked on R8 judge gap 2: the arcade's
own enemy ROUND rate has never been measured."* §3 measures the SHAPE (R30 closed the
volume, and nothing here changes volume).

## 3. THE ARCADE SIDE — bounded, and honest about what it does and does not settle

Spans decoded at **60 Hz consecutive** from `ab2-longplay-60fps.mp4` (`-ss T -t D -vsync 0`,
exact frame counts: 1800/1800/1860) over STAGE_MAP-proven stages:
stage 2 t=126–156, stage 7 t=309–340, stage 4 t=205–235. Viewed as 4-col × 5-row contact
sheets at **2 Hz** (`sheet-s7-part*.png`, `sheet-s2-part*.png`).

**Sampling-rate declaration, since every false temporal claim this project has made came
from sub-60 Hz sampling:** an arcade round is in flight for ~1–3 s (enemyShots.js's own
Little's-law estimate of our comparable figure is 2.7–3.0 s), so a 0.5 s panel step samples
any single round 2–6 times. The 60 Hz rule exists for 0.067–0.13 s events; 2 Hz is adequate
for round PRESENCE and for drought lengths at 0.5 s resolution, which is the only thing
claimed here. Nothing about round speed or per-round timing is claimed from these sheets.

### 3.1 The arcade fires trains too — the BURST is not the defect

`reference/stage7-enemy-shot-train-t330.png` (and its live neighbourhood, sheet-s7-part3
panel 3) shows **~16 red-capped ovals strung out along one diagonal across roughly a third
of the frame**, small at the firer and several times larger at the near end. So a
multi-round train from one firer is arcade-faithful, and our 8 → 4 cut is not "matching the
arcade's train length" — it is trading length for frequency at constant volume. Stated
plainly so the next agent does not read the change as a fidelity correction.

### 3.2 What IS different: the arcade has no droughts at our scale

Over the 31 s stage-7 span I can point at clearly-identifiable incoming rounds (the
red-capped oval on blue sky, distinct from the player's small gold vulcan dots and from the
enemies' single orange nozzle glow) at approximately t = 310.5, 311.5, 315.5, 318.0, 327.0,
328.0, 330.0, 333.0 and 333.5 — **~9 separate incoming-fire events in 31 s**. The longest
stretch I can defend as fire-free is ~8.5 s (t≈318.5–327.0), and that stretch is full of
explosions and the player's own fire, either of which could hide a round — so 8.5 s is an
**upper bound on the arcade's drought**, biased in the arcade's disfavour, which is the
safe direction for the comparison.

Ours, same question, measured exactly rather than by eye (the §2 table): **2.2–3.7 fire
events per 30 s of flight, with 27.5 s and 30.3 s of total silence.**

**Corroborated from the other side by a different lane and a different operator.** R40's
density-truth lane measured arcade AIRCRAFT presence (not fire) and found the arcade sky
goes *"genuinely, totally empty for 10–11.5 s between waves"* — their D10 band is 6–12 s
(`judging/R40/density-truth/NOTES.md` §4.2, D10). That is an independent ceiling on how long
the arcade can possibly go without incoming fire, since an empty sky cannot shoot, and it
sits just above my 8.5 s eyeball upper bound — the two agree. It also sets the right scale
for the gap: **the arcade's longest fire-free stretch is ~10 s; ours is 27.5–30.3 s, about
3× that.** The target is therefore NOT "never a quiet moment" — the arcade has real quiet —
it is that ours are three times too long and that what ends them is a single barrage.

**Honest limits of this half.** This is a LOOK, not a detector: I did not build a
colour-keyed round detector because the confusers (explosion debris is red confetti that
fragments into dozens of round-sized components; the HUD's red text and lock glyph; stage 2's
orange sky camouflaging the round's own palette — R38 §2) would have needed more validation
than the 20 % meta budget allows, and crop-and-look answers the question that was asked.
Accordingly:

- **CLOSED:** "is the arcade also bursty?" — yes at the sub-second scale (it fires trains),
  **no at the 15–30 s scale**. Our droughts are 3–4× anything visible in the arcade.
- **NOT CLOSED, and `spawner.js:742` stands unchanged:** the arcade's enemy ROUND RATE
  (rounds per minute). A 2 Hz presence track cannot count rounds, and I did not count them.
  R8 judge gap 2 is still open and this lane did not close it; nothing here changes volume,
  so nothing here depends on it.

### 3.3 The BEFORE baseline on the standard arm, independently of the playtest replays

`sweep_fire.mjs` on `?demo=1`, seeds 4/5/9 × 90 s, frozen BEFORE root. **Instrument
validated on known inputs first** (`sweep-validate.json`): seed 4 run twice gives
byte-identical output; seed 9 differs (the `seed=` param was silently ignored once already,
R3); and it independently reproduces the shape the session replays found on a completely
different pilot.

| seed | rounds/min | **peak rounds in any 1 s** | peak in 3 s | empty 10 s bins | gap CV | max drought |
|---|---|---|---|---|---|---|
| 4 | 23.8 | **21** | 21 | 3 of 7 | 2.099 | 18.5 s |
| 5 | 39.4 | **22** | 40 | 4 of 7 | 3.878 | 19.3 s |
| 9 | 27.2 | **24** | 24 | 1 of 8 | 1.746 | 14.9 s |
| **pooled** | **30.1** | | | | **2.574** | **19.3 s** |

Rounds per 10 s of flight, seed 5: `[1, 0, 41, 0, 1, 0, 0]` — **41 of 43 rounds in one
10-second window and four of seven windows completely silent.** Seed 4: `[1, 0, 23, 0, 1, 0, 1]`.
This is the playtest's sentence, on a different pilot, from a different instrument.

Note the volume seed scatter is wide — 23.8 to 39.4 rounds/min — which is the band any
"volume unchanged" claim has to be read against.

## 4. Changes shipped (owned files only)

The two gaps have ONE mechanism between them — fire is delivered in a few one-decision
barrages plus a lone point-blank ground round — so the fix is one rebalance, not two.

**A. `src/entities/enemy.js` — the train is sized to the budget, so the whole approach is a
firing opportunity instead of the first 0.625 s.** The old Phase-3 gate refused to light a
flare unless a full `MIN_TRAIN_ROUNDS` train already fitted in the remaining depth budget,
which is arithmetically "only fire just after spawning" and is why waves fired as one.
`_trainRoundsFor()` now sizes the train at the instant the flare expires; the gate asks only
for room to announce and deliver one round. The truncation the old gate protected against is
handled where it belongs, and no round can still leave from inside the floor.
Also: `TRAIN_LENGTHS` 8 → **4** (length traded for frequency at constant volume — the
file's own "length is the cheapest lethality reduction" argument, read in the other
direction); `SHOT_SPACING_S` 0.08 → **0.11**, the value t330 actually supports and which
0.08 was a budget workaround for; `FIRE_DEPTH_MIN` 24 → **14**, which widens the opening
window 0.863 s → 1.63 s so a whole wave can find separate slots in it (the first arm without
this lost 26 % of volume — the trains were not deferred, they were deleted); an odd-length
train gets a half-step rake offset so the "no round dead-centre on the snapshot" invariant
survives budget sizing. `?fire=` added for sweeping without editing source.

**B. `src/game/spawner.js` — de-synchronise the wave.** `TRAIN_START_GAP_S` 0.15 → **0.45**
(0.15 s apart is "together"; bounded above by the eligibility window, since a gap wider than
it deletes trains rather than deferring them), and the echelon's and burst wall's first-fire
delay 0–0.15 s → **0–0.55 s**, drawn across the opening window so wave members stagger.

**C. `src/entities/groundBattery.js` — the killer nobody watches fires from the horizon.**
Launch depth 11.36 → **56–62.4** (`TELE_DEPTH_MAX` 42 → 90 with a drawn per-battery lighting
depth, `FIRE_FLOOR_DEPTH` 12 → 56), `speed` 8 → **20**. Total warning **1.18 s → 2.95–3.27 s**,
inside the 2.67–3.67 s band air kills already occupy; the round is on screen for **2.55 s of
flight instead of 0.78 s** and climbs from the horizon instead of appearing under the nose.
The `allowNewTrain` gate is dropped: the lighting window is ~6 ticks by geometry, and gating
those 6 ticks on a budget the air waves hold for seconds made battery fire a lottery whose
LOSING branch was the unfair geometry (a battery that lost its window fired later, from
point-blank — and those are the shots that killed). The volume that adds is paid back in the
spawn interval, 7–11 s → **9.5–14.5 s**.

**The first arm of C was an own-goal, and it is recorded rather than quietly fixed.** The
original payback for the extra battery rounds was a LONGER spawn interval (7–11 → 9.5–14.5 s).
Measured: peak rounds-in-any-one-second fell from 21–24 to **9** on every seed — the barrage
is genuinely gone — but the worst drought got **worse**, 19.3 s → 29.3 s, and the gap CV rose
2.57 → 3.52. The reason is visible in the before arm's own series, `[1, 0, 23, 0, 1, 0, 1]`:
those isolated `1`s are lone battery rounds, and they were **the only thing breaking the
silence between air waves**. Stretching the interval deleted them. Corrected: the interval
goes the other way, 7–11 → **5.5–9.0 s**, and the volume payback comes off the air side
(`TRAIN_START_GAP_S` 0.45 → 0.6) where there is no silence to protect.

A note on what the player actually sees during the battery's flare phase, because the
operator's "firer on screen" wording could mislead: at the new lighting depth the TURRET is
only ~7 px wide (0.023 W, right at the readable floor). What carries the tell is the flare
glyph, which `telegraph.js` holds at a CONSTANT 14–26 native px regardless of the firer's
depth — deliberately, "a telegraph is a UI promise" (its own comment). So the far flare is a
14–26 px pulsing star on a 7 px turret, which is the right way round; the operator counts
firer-visibility as the proxy, and this is the thing being proxied.

**D. `src/weapons/enemyShots.js` — read, deliberately unchanged.** The round's own art,
ballistics and R36/R37/R38 legibility work are untouched by construction: this lane changes
WHERE and WHEN rounds are launched, not what they look like. Three rounds of pixel fixes
each passed their operator; the defect was never the pixels.

**E. `tools/fairness_probe.mjs` — measurement-only `--root`.** Serves the standing gate from
a frozen copy of the tree, so a 3-minute figure cannot be torn by another lane's save (the
`hmr:false` note in that file closes the RELOAD hole but not the fact that a module read
after a save is a different module) and so a before/after arm is attributable to ONE lane's
diff. The served root is stamped into the output JSON. No measurement logic changed.

### 4.1 Two stale comments corrected (they would have misled the next agent)

Moving `FIRE_DEPTH_MIN` 24 → 14 invalidated two load-bearing justifications elsewhere. Both
were *correct about behaviour* and *wrong about why*, which is the dangerous kind:

- `spawner.js` lock-bait: *"Never fires: it is below the firing band for its whole hold"* —
  `BAIT_HOLD_DEPTH` is 17–21, now INSIDE the band. It stays silent because of its explicit
  `fireDelay: 1e9`. Left as-is, that comment tells the next agent the `1e9` is redundant.
- `enemy.js` holdDepth: *"A holdDepth below FIRE_DEPTH_MIN never fires during the hold"* —
  still true for gun-dwell (5.0–6.5) but no longer a blanket guarantee. Both now say so.

## 5. The fix, measured — same operator both arms

`sweep_fire.mjs`, `?demo=1`, seeds 4/5/9 × 90 s, frozen roots, identical operator.

| | rounds/min (pooled) | trains/min | gap CV | worst drought | **peak rounds in any 1 s** |
|---|---|---|---|---|---|
| **BEFORE** | 30.1 | 5.7 | 2.574 | 19.3 s | **21 / 22 / 24** |
| **AFTER** | 27.9 | 6.1 | **2.167** | **15.3 s** | **9 / 10 / 9** |

- **The barrage is gone.** Peak rounds inside any one second falls **21–24 → 9–10 on every
  seed**, which is the playtest's "30-shot barrage" directly. Rounds-per-10 s for seed 5 goes
  `[1, 0, 41, 0, 1, 0, 0]` → `[0, 1, 25, 1, 1, 2, 0]`: the 41-round spike is halved and the
  neighbouring silences are populated.
- **Droughts are shorter and now inside the arcade's own band.** Worst 19.3 → 15.3 s, and
  seeds 5 and 9 land at 12.1 and 12.0 s — against the density lane's arcade D10 band of
  6–12 s. The worst case is still ~25 % over that band: **dented, not closed**, and the
  residual is a WAVE-CADENCE question (no aircraft on screen = no air fire possible), not a
  fire-scheduling one. Named here rather than claimed as fixed.
- **Volume held.** 30.1 → 27.9 rounds/min, −7 %, against a before-arm seed scatter of
  23.8–39.4 (±26 %). R30's closure is intact.
- **CV 2.574 → 2.167.** Still well above Poisson's 1.0: the fire is less clumped but not
  smooth, which is the right place to stop — §3.1 shows the arcade fires trains too.

## 6. THE PER-DEATH SOURCE OPERATOR — 83 % violations → ZERO

`source_probe.mjs`, `?demo=1`, seeds 4/5/6 × 180 s (540 s per arm), frozen roots.

**Instrument validated on inputs whose answer is known before the run**
(`source-selftest.json`): `?invincible=1` yields exactly zero fatal hits; the same seed twice
is byte-identical; two seeds differ (the `seed=` param was silently ignored once already, R3).
And — the check that matters — **it fires on the known-bad build**: run against the tree four
consecutive players complained about, it marks the battery deaths as violations at 0.45–0.47 s
of source-visible time. An operator that passed the build everyone says is broken would be
the wrong operator.

| | fatal hits | **violations** | unannounced | min warning | min source-visible | killer mix |
|---|---|---|---|---|---|---|
| **BEFORE** | 12 | **10 (83 %)** | 0 | 1.167 s | 0.417 s | battery 10, aircraft 2 |
| **AFTER** | 13 | **0** | 0 | **1.917 s** | **1.183 s** | battery 4, aircraft 9 |

Three things in that table, in order of importance:

1. **Zero violations, with the floor cleared by 0.016 s at the tightest.** That is a designed
   margin, not luck — `TELE_DEPTH_MIN_LIGHT = 83.6` is solved to put the worst case at
   exactly 1.167 s, and the measured worst case is 1.183 s. If the ground scroll, the
   telegraph duration or the despawn depth ever move, this margin is the first casualty.
2. **The killer moved from the ground to the air.** Battery share of deaths 83 % → 31 %;
   aircraft 17 % → 69 %. The player is fighting aircraft, and now aircraft are what kill
   them. Every one of the 10 "deaths from nowhere" in the before arm was a ground turret.
3. **Lethality did NOT fall to buy this**: 12 fatal hits before, 13 after, over the same
   540 s. The compensation is the mechanism spawner.js already documented — "lethality scales
   with the number of INDEPENDENT AIM SNAPSHOTS, i.e. with trains STARTED per minute" — and
   trains/min rose 5.7 → 6.1 while each train got shorter. The deaths were moved, not removed.

Attribution quality also improved as a side effect: the worst firer-match residual falls
16.8 → 2.5 px-equivalent, because rounds now launch from depths where firers are further
apart on screen. Reported because a weak attribution is how this kind of probe lies.

## 7. TWO INSTRUMENTS DISAGREED ON VOLUME — reconciled, and my sweep was the wrong one

`sweep_fire.mjs` (seeds 4/5/9 × 90 s) reported volume −7 %. `tools/fairness_probe.mjs`
(seeds 4/5/6 × 180 s) reported **309 → 198 total rounds, −36 %**. Both arms of each were
internally consistent, so one of the two readings was being asked the wrong question.

Reconciliation:

- They are not the same statistic. The sweep counts only fire events occurring while
  `state === 'flight'`; the fairness probe counts `combat.shotsFired` cumulatively over the
  whole run. Flight share is ~74 % and identical in both arms, so that explains a level
  offset — seed 4 BEFORE reads 23.8 (sweep, flight-only) against 38.1 (fairness, all rounds,
  flight denominator) — but it CANNOT explain a difference in the before/after ratio.
- The ratio difference is the WINDOW. 90 s is one to two wave cycles; the fire schedule's
  own clumping (CV > 2) means a 90 s sample's volume is dominated by how many barrages
  happened to fall inside it. At 180 s × 3 seeds the fairness counts are flat across seeds
  (67/64/67 after, 86/112/111 before), i.e. that window is long enough to be stable and the
  90 s one is not.
- **`shotsFired` is also the counter R30's closure was actually written on** (fairness_probe's
  own header: *"volume has to be a total over the run"*). So the −36 % is the real figure and
  the −7 % was my sampling artifact. Recorded rather than quietly dropped, because the −7 %
  is the number I would have published.

**−36 % breaches R30's volume closure**, and the cause is simple arithmetic: `TRAIN_LENGTHS`
8 → 4 halves rounds-per-train while trains/min only rose 5.7 → 6.1. The shape win does not
require the length cut to be that deep — peak-in-1 s is set by how many trains OVERLAP, which
`TRAIN_START_GAP_S` governs. §8 re-solves the length against volume.

## 8. TRAIN LENGTH RE-SOLVED AGAINST VOLUME — 4 → 6

Seeds 4/5/6, frozen roots, matched windows. Total rounds from `shotsFired` over 180 s (the
counter R30's closure is written on); peak-in-1 s from `sweep_fire.mjs` over 150 s.

| arm | total rounds (before = 309) | peak rounds in 1 s (before = 21/22/22) | CV | worst drought |
|---|---|---|---|---|
| length 4 | 198 (−36 %) | **9 / 10 / 9** | 2.195 | 23.4 s |
| **length 6** | **258 (−16 %)** | **13 / 14 / 12** | 2.473 | 22.7 s |
| length 8 | 318 (+3 %) | 17 / 18 / 18 | 2.681 | 19.8 s |

Length 4 bought the best shape and broke the volume closure; length 8 held volume and handed
most of the shape back. **6 is the knee**, and `TRAIN_START_GAP_S` 0.45 → 0.35 closes the rest
of the volume gap (measured at length 6: 258 → **267 rounds, −13.6 %**).

Per-seed totals make the scatter explicit: before `[86, 112, 111]`, after `[82, 73, 112]`.
The before arm's own seeds span ±13 % around their mean, and the after arm overlaps it. The
pooled −13.6 % sits at the edge of that scatter and **the lane states it as an edge case
rather than claiming it is comfortably inside**.

What makes the reduced volume defensible rather than a difficulty cut — which is the thing
R4 gap 5 and R30 actually forbid — is that **lethality did not fall with it**: deaths per
flight-minute **1.795 → 1.467**, i.e. the shipped build is now INSIDE the standing 1.333 ±10 %
band (1.200–1.467) that the before arm was *above*. Fewer rounds, better spread, same or
slightly fewer deaths, and every one of them now legible. Nothing here buys the death rate
with a volume cut; if anything the before arm was over-lethal.

### 8.1 The shipped build, same operator as the before arm (seeds 4/5/6, 150 s)

| | rounds/min (flight) | trains/min | gap CV | worst drought | **peak rounds in 1 s** |
|---|---|---|---|---|---|
| BEFORE | 32.2 | 5.5 | 2.541 | 26.1 s | **21 / 22 / 22** |
| **SHIPPED** | **31.6** | 5.9 | 2.504 | 22.7 s | **15 / 15 / 13** |

**Read this honestly: the barrage is cut by a third, not eliminated, and the CV and drought
barely moved.** The configuration that nearly eliminated the barrage (length 4: peak 9–10,
CV 2.195) cost 36 % of the fire volume, which R30 forbids. What shipped is the knee of that
trade, and the remaining burstiness has a named cause that is NOT in this lane's files:
between waves there are no aircraft on screen, so no air fire is possible at all, and the
schedule cannot put rounds in an empty sky. Drought 22.7 s against the arcade's measured
10–11.5 s (density-truth D10) is roughly **2× too long and stays open for a wave-cadence
lane**. The lane is not claiming the pacing gap closed; it is claiming the **barrage** half
measurably improved and the **invisible-death** half (§6) closed.

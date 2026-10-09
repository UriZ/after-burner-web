# R6 — Game-feel critique

**Scope:** this build judged as a *game*. Pacing, responsiveness, difficulty, fairness, the
verbs, and whether ten minutes of it would be enjoyable. Pixel fidelity is two other
reviewers' job and is not re-litigated here.

---

## Tree state — and the harness defect that nearly swapped my results for someone else's

**Subject: commit `e8fed58058dd9a0a9d28f11e01ccd88f2dec26ea`**, the commit the R6 judge and the
art critic both used. `git status --short` was **empty** when I started; it did not stay empty —
four R7 lanes are now building, and `src/entities/player.js`, which holds this critique's central
constant, is one of the files they have changed.

**Every figure below is confirmed to have been measured against `e8fed58`, by assertion rather
than by assumption.** Each run now fetches `/src/entities/player.js` from the server it is about
to drive and records what it got:

```
SERVED_CHECK {"ok":true,"envelope":["const ENVELOPE_Y = 1.1"],"bytes":136119}
```

`ENVELOPE_Y = 1.1` is e8fed58's value; the live tree has since replaced it with
`ENVELOPE_Y_UP = 1.55 / ENVELOPE_Y_DOWN = 1.1`. The runs are driven against a detached
`git worktree` pinned at `e8fed58` (`…/scratchpad/ab-e8fed58`), **nothing in the shared tree was
touched** — no stash, no checkout, no reset.

**The defect that made the assertion necessary, written up because it is worth more than any
number in this report.** My probe bound its vite server to `127.0.0.1` and then drove it at
`http://localhost:<port>`. On macOS `localhost` resolves **`::1` first**. Another agent's vite
was listening on `[::1]:5173`. So for an unknown subset of runs **my probe measured a different
agent's working tree**, over IPv6, with no error of any kind — the page loaded, the game ran, the
hooks answered, the numbers were plausible and stable.

It cost me a full set of arms before I caught it, and it caught me *in the act of being careful*:
I had spotted the R7 edits, re-run everything on a pinned worktree to be safe, and the re-runs
**disagreed** with the originals — a player vertical envelope of 50.29 points of H instead of
42.22. I spent the disagreement assuming the pinned runs were the good ones. They were the bad
ones: 50.29 is `ENVELOPE_Y_UP = 1.55`, i.e. R7's live fix, reached over IPv6 from a worktree that
contained no such line. **The originals were clean all along.** Three separate things had to be
true before I could tell which was which — the served-source assertion, an independent repeat,
and reading the two trees' constants side by side.

Two lessons for this repo's tooling, both cheap:

* `tools/capture.mjs`, `tools/fairness_probe.mjs` and `tools/combat_probe.mjs` **all use
  `http://localhost:${port}`** and all bind `127.0.0.1`. Every one of them is exposed to this
  whenever two agents run concurrently, which is every round. One character each.
* They also read the port from `server.config.server.port` — vite's **configured** 5173 — rather
  than from the bound socket, so a tool that *did* fail to bind would quietly drive whoever did.
  I hit that too, as a 404 I was lucky enough to see.

**Verification status of every arm quoted below** — all carry `SERVED_CHECK`
`["const ENVELOPE_Y = 1.1"]`, and all reproduce their pre-R7 originals **seed for seed**:

| arm | seeds × duration | verified |
|---|---|---|
| `demo` mortal | 5 × 300 s | ✓ 12/10/13/10/9 deaths, 259/230/222/247/242 kills |
| `evade` mortal | 5 × 300 s | ✓ 12/9/11/10/10 deaths |
| `jinkx` / `jinky` / `still` mortal | 5 × 300 s each | ✓ 103 / 128 / 139 deaths |
| `still` / `lat` / `trk` / `vert` invincible | 4 × 180 s each | ✓ 2 007 / 2 237 / 2 325 / 2 035 kills |
| `control_probe` envelope, latency, sight | 3 repeats | ✓ 42.2248 H range, three times |
| `b-*` arms (round life, occlusion, missile share) | 3 × 150 s each | ✓ round life 2.90–3.05 s, occlusion 0.736–0.757, 1 236 vs 992 kills |

**What this means for the numbers here**: everything is from runs carrying the assertion above,
or from a pre-R7 run that a verified re-run reproduced **seed for seed** (e.g. `still` seed 1 =
501 kills; `evade` seed 1 = 12 deaths / 504 kills, in both). Anything I could not confirm that
way is marked in place.

## Method

Three sources, kept separate and labelled inline. **No number here is taken from any lane report.**

1. **Code read as a designer** — `weapons/{combat,vulcan,lockSystem,enemyShots,missiles}.js`,
   `entities/{player,enemy}.js`, `game/{spawner,flow/*,score}.js`, `core/input.js`,
   `effects/screenSpace.js`, `audio/**`, `ui/hud.js`.
2. **My own per-tick telemetry** — `tools/out/feel-critic-r6/feel_probe_r6{,b,c}.mjs`. The whole
   tick loop and its aggregation run **inside the page** in one `page.evaluate`, so every tick is
   sampled and the 16.000 s attract-regime aliasing trap cannot apply at any spread, sd or
   percentile. Only the three RNG-safe hooks are polled (`__flowState`, `__combatStats`,
   `__fairness`); `__combatDebug` is never called, because its `rngSample` consumes a draw from
   the shared PRNG and would make the thing being measured depend on the sampling rate.
   **`window.__setStick` turns the probe into a pilot** — which is the only way to answer the
   round's central question, since `?demo=1` is a pure function of `simTime` and cannot respond
   to anything.
3. **Arcade footage** — `.reference-cache/video/ab2-longplay{,-60fps}.mp4`, with two new
   measurements described in §3 and §5.

**Instruments, and what each was validated on.** Everything below passed before it was used.

| instrument | validation | result |
|---|---|---|
| `feel_probe_r6 --selftest` | 4 arms: clock advances; stick has effect; **unknown mode must reproduce the neutral arm** (planted fault); unrolled→screen map | PASS |
| unrolled→screen rotation | the jet appears in BOTH hooks — unrolled in `__fairness().playerNdc`, true-screen in `__flowState().jetNdcY` — so the map is applied to the jet first. **Mean residual 0.000 milli-NDC, max 0.000 NDC, 1 200 samples, roll swept to 66.5°** | used |
| `pHit` (combat.js `_logMiss`) | crossings inside `PLAYER_HIT_RADIUS_FRAC` **must equal** `playerHitsTaken` | held **exactly** on all 8 arms |
| kill count | cross-validated against an independent channel: `score.js` adds **nothing** per kill, so `(scoreDelta − 3300·flight)/20 000` is the number of kills that were *tallied*. Probe count minus that leaves only the in-progress stage | held on every seed of every arm |
| `sweep.py` | plants one all-black frame and one byte-duplicate and refuses to report unless it finds both | PASS; **0 black, 0 duplicates in 121 frames / 3 sets** |
| `arcade/track_shots.py` | two planted-decoy arms (one rejected by the x exclusion, one by the sky-ring test) | PASS, then **superseded by reading the frames** (§5) |

**I could not hold the controls and every capture is silent by construction.** §9 says which
conclusions are observed, which are measured by telemetry, and which are inferred from code.

---

## 1. Verdict

**Sixty seconds is better than R5's sixty seconds. Ten minutes is not there, and the reason is
new: with the trigger held, the game largely plays itself.**

The round's two named gaps are genuinely different from how they were left.

* **The enemy altitude distribution is real and I reproduce it independently.** All-enemy top
  third **29.0 %** of 883 526 on-screen samples against the arcade's 32.5 %; sd 15.87 against
  19.22; median 42.8 %H against 40.0. The combat lane's headline holds.
* **The player's own jet is no longer hard to find.** It outspans every enemy on screen in
  **99.5 %** of flight ticks and it is near-white against grey. R5's rank 2 is substantially
  closed.

But neither of those is what decides whether the game is any good, and the thing that does has
not been measured before. **Hold the fire button and put the stick down**, and this build gives
you **2.79 kills per second** — **86.3 % of what a full two-axis tracking pilot scores**, and
**6.6× the arcade's own measured rate of 0.420 kills/s**. The vertical stick is worth **1.4 %**
of that score. The lateral stick is worth 11.5 %. Doing nothing at all is worth the rest.

The consequence is not just that it is easy. It is that **the sky empties**: with the trigger
held and a pilot tracking targets, **93.8 % of flight ticks contain nothing at readable size**,
with a worst run of **30.6 s**, against **14.1 %** under the `?demo=1` autopilot whose trigger is
down about a sixth of the time. The emptiness R5 spent a round removing comes straight back the
moment a real player holds the gun down, and no gate in the project can see it, because every
density figure in the project is measured on that autopilot.

On fairness, separately: **0 of 476 fatal hits across five pilot policies were unannounced**, and
the minimum warning any of them ever had was **2.88 s**. The build is not merely fair, it is
over-announced — and a reactive pilot that uses all that warning dies at **2.08/min** against the
non-reactive autopilot's **2.16**, i.e. **reacting buys about 4 %**. The usual framing, that our
autopilot overstates difficulty because it cannot dodge, does not hold here (§4.1).

**Would a player enjoy 60 seconds? Yes.** It is busy, loud, fast, legible, and it kills you
fairly.
**Would they enjoy ten minutes? No.** Because by minute two the gun has become automatic, the
stage number on the HUD has stopped going up (it never exceeds 3, for any length of run), the
same three palettes have cycled twice, and the one 63-second music loop has played twice.

---

## 2. Is the vertical dimension real, or a distribution statistic?

**The distribution is real. The engagement is not.** Those are separable and they came out
opposite ways.

### 2.1 The distribution — reproduced, including a trap that turned out not to bite

`?fixed=1&demo=1`, 5 seeds × 300 s, **every tick**, 883 526 on-screen enemy samples.

**First, a frame problem I went looking for and then had to report as harmless.**
`effects/screenSpace.js` authors everything in the camera's **pitch-only** basis, so
`__combatStats().enemies[].ndcY` is the **unrolled** frame — and when the world rolls, the drawn
image of that point rotates about screen centre. An arcade hand count read off frames is a
**screen** altitude. These are not the same statistic, and at p75 roll (21.8°) an enemy half a
frame off-axis moves ~18 points of H between them. So I computed both. The answer:

| | unrolled (what the hooks report) | **screen** (what a hand count measures) | arcade |
|---|---|---|---|
| all enemies p5 / p50 / p95 %H | 19.4 / 42.0 / 69.0 | **19.0 / 42.8 / 69.0** | 14.1 / 40.0 / 72.8 |
| sd | 15.53 | **15.87** | 19.22 |
| top third (<33.3 %H) | 30.1 % | **29.0 %** | 32.5 % |
| readable ≥10 %W, top third | 34.2 % | **34.0 %** | 47.4 % |

**The difference is 1.1 points and the lane's numbers survive it**, because mean |world roll| is
only 12.4° and the enemies cluster near the lateral centre. I report it because the next agent
who compares a hooked NDC against an arcade frame at a higher roll regime will not be so lucky.

So: the altitude histogram is right, the all-enemy top-third share lands on the arcade, and the
readable column undershoots exactly where the lane said it would.

### 2.2 The engagement — it does not use the vertical stick, and barely uses the stick

Four pilots, identical in every respect except which stick axes are live. All hold the fire
button continuously and pulse the missile button; all run `?fixed=1&invincible=1`, 4 seeds ×
180 s = 720 s of flight each, every tick.

| pilot | stick | kills / 720 s | **kills/s** | vs doing nothing |
|---|---|---|---|---|
| `still` | **nothing at all** | 2 007 | **2.788** | — |
| `vert` | vertical only | 2 035 | 2.826 | **+1.4 %** |
| `lat` | lateral only | 2 237 | 3.107 | +11.5 % |
| `trk` | both axes | 2 325 | **3.229** | +15.8 % |

> **The vertical stick is worth 1.4 % of the score on its own and 3.9 % on top of lateral
> tracking. A pilot who never touches the controls scores 86.3 % of what a two-axis tracking
> pilot scores.**

That is the answer to the question as asked. The spawner now satisfies the altitude histogram
and **the player still does not have to climb or dive**, because three separate mechanisms each
remove the need, and they stack:

1. **The gun's vertical aim is automated.** `combat.js:_findAssistTarget` returns
   `{ ndcX: this.sight.x, ndcY: best.ndc.y, … }` — the round's **vertical** target is snapped to
   the enemy's exact altitude, while the lateral target stays on the sight. The file says so in
   its own comment ("Lateral accuracy stays the player's job"). The cone it does this in is
   `ASSIST_RADIUS_FRAC = 0.13`, which after the `224/320` term the test applies is
   **±0.371 NDC = ±18.6 points of H.**
2. **That cone already covers the whole new enemy band from a neutral stick.** Sight sits
   `SIGHT_NDC_Y_OFFSET = 0.30` above the nose; at rest the nose is at 55.6 %H, so the cone spans
   **22.0–59.2 %H** — against a readable-enemy distribution of p5 18.4 / p50 40.0 / p95 65.0 %H.
   Measured: at least one enemy is inside the full assist cone on **67.3 %** of flight ticks and
   inside the missile lock cone on **83.3 %**, with the autopilot's stick.
3. **The gun has no range limit at all.** `vulcan.resolveHits` tests every round against every
   enemy. A round flies from the player's depth 5 to `DEFAULT_TARGET_DEPTH = 55` over
   `TRAVEL_S = 0.7`, with a hit radius of `max(spanFrac·0.8, 0.02)`. Meanwhile
   `ENEMY_WORLD_WIDTH = 1.05` means an enemy only reaches 10 %W ("readable") at **depth 7.06**.
   **The vulcan outranges readable size by about 8×.** R4's fix for "the gun deletes echelons
   while they are still 2–3 %W dots" was applied to the *assist cone* (`6 < d < 22`) and not to
   hit resolution, which is where the deletion actually happens.

The direct consequence, same four arms, as a share of flight ticks with **nothing at readable
size on screen**:

| pilot | drought share | worst single drought |
|---|---|---|
| `?demo=1` autopilot (trigger down ~16 % of the time) | **14.1 %** | 3.40 s |
| `still` (trigger held, stick centred) | **57.1 %** | 12.57 s |
| `lat` | **88.0 %** | 26.35 s |
| `trk` | **93.8 %** | **30.60 s** |

R3's size-qualified density criterion — ≥1 enemy at ≥10 %W in ≥60 % of combat frames — reads
**85.9 %** on the autopilot and **6.2 %** on a tracking pilot. It is a pilot-dependent gate and
nobody has said so.

### 2.3 The player's vertical envelope is nearly three times what two rounds have believed

This matters because it is load-bearing for `spawner.js`'s clamp, and because it has been quoted
twice as a fact about `player.js`.

**Measured, by holding the stick** (`control_probe.mjs`, `?fixed=1&invincible=1`, each phase
re-centred first and each sample confirmed to be in `state: 'flight'`; the jet's own projection
through the live camera):

| | %H |
|---|---|
| neutral | **55.60** |
| full climb held | **35.09** |
| full dive held | **77.31** |
| **vertical range** | **42.22 points of H** |
| full left / full right | 15.07 / 84.93 %W, lateral range **69.87 points of W** |

The published figure is "the measured player ndcY ceiling on this build is **+0.106 (44.7 %H),
the `ENVELOPE_Y = 1.1` limit**" (`spawner.js`, deriving `REACH_CEILING_NDC_Y`). The real limit is
**+0.311 NDC = 35.09 %H**. 44.7–62.6 %H is the **`?demo=1` autopilot's roam** — `demoTimeline.js`
commands `y = 0.205 + sin(…)·0.32` in cruise and `−0.349 + sin(…)·0.08` in canyon, so its stick
never exceeds **0.525** of full deflection. I reproduce 44.7–62.6 %H exactly under `?demo=1` and
35.09–77.31 %H under a full stick, on the same build in the same probe. *The operator was fine;
it was pointed at the autopilot and the result was written down as a property of the aircraft.*

**Direct response to the judge's finding, which arrived while I was measuring and bears on this
from the other side.** The judge reports *our pilot occupies the top third of the screen 0.00 %
of 20 970 flight ticks*, against an arcade pilot whose p5 is 36.0 %H. **I confirm the
observation independently and I disagree with what it is a fact about.**

* Confirmed: under `?demo=1`, across **71 057 flight ticks** (5 seeds × 300 s, every tick), the
  player's screen altitude runs **44.7 – 62.6 %H, sd 6.18, p5 45.0**. It never comes within
  **11 points of H** of the top third. 0.00 % is right.
* But that is a fact about `demoTimeline.js`, not about the aircraft. **Held at full up stick the
  jet reaches 35.09 %H** (three repeats, served-source asserted). The top third begins at
  **33.33 %H**.

> **The player misses the top third by 1.76 points of H — not by eleven.**

The judge's conclusion — *the enemies climb and the player cannot* — is **correct**, and it is
correct by a margin an order of magnitude smaller than the autopilot makes it look. That changes
what the fix costs: `ENVELOPE_Y` needs about 6 % more travel to put the airframe in the top
third, not 60 %. And it is worth noticing that the arcade pilot is barely in the top third
either — its **p5 is 36.0 %H**, so our full-deflection ceiling of 35.09 %H is already *past* the
arcade's 5th percentile. The arcade's own excursions below that are events (GAME_SPEC §1's
measured barrel roll sweeps to ~20 %H), not cruise.

So the honest shape of this gap is not "the player cannot climb". It is **"nothing ever makes the
player climb, and the one pilot everybody measures never tries"** — which is §2.2, and which no
change to `ENVELOPE_Y` alone will fix.

Two consequences:

* **`REACH_CEILING_NDC_Y = 0.64` rests on two wrong inputs and can be lifted now, without
  touching `ENVELOPE_Y`.** Its derivation uses a sight ceiling of +0.406 (the truth is
  +0.311 + 0.30 = **+0.611**) and a cone reach of ±0.237 from "a lock radius of 8.3 %W" — but
  `LOCK_RADIUS_FRAC` is **0.22** (vertical reach **±0.629**) and `ASSIST_RADIUS_FRAC` is **0.13**
  (**±0.371**). No constant of 0.083 exists in `lockSystem.js`. The lane's own stated residual —
  readable top third 33.5 % against the arcade's 47.4 % — is caused entirely by this clamp.
* **R5's rank 1 second clause is wrong and should not be carried forward.** "Even if enemies
  arrived high, the player could barely climb to them" is false: the player's 42.2 points of
  vertical range is *wider* than the arcade player's own observed p5–p95 (36–63 %H) and
  comparable to its full observed range. What is true is that our band sits **6.6 points lower**
  than the arcade's (median 55.6 against 49.0) and tops out 15 points short of the 20 %H the
  arcade's own barrel-roll instance reaches (GAME_SPEC §1, MEASURED). The ratio claim —
  vertical authority is 42 % of lateral in isotropic screen distance — is correct; the absolute
  claim was the autopilot's.

**So: the vertical dimension is a distribution statistic today.** Not because the spawner failed
— it did its half — but because the weapons resolve the vertical axis for you, over a cone that
spans most of the screen, at a range where nothing is even visible yet.

---

## 3. Is it fun? Sixty seconds yes, ten minutes no

### 3.1 The sixty seconds work

`feel-01-one-minute.png` — 72 tiles, 60 s of `?demo=1`, swept clean. **Not one tile is empty.**
Flight share **78.95 %** of wall clock over 1 500 s (arcade 69.4–73.5 %). Worst stretch with
nothing at readable size: **3.40 s**. Mean 12.4 enemies on screen, 2.8 of them at readable size.
The carrier is in the launch and reads as a carrier. The death cycle keeps a live sky under the
starburst (`feel-04-death-cycle.png`). The attract loop walks all three palettes. All of that is
real and it is better than R5's.

### 3.2 The ten minutes do not

**→ `feel-05-ten-minutes-30s.png`: 21 frames at 30 s intervals across 600 s of continuous play.**

*The stage number never exceeds 3.* `flow.js` drives both the HUD digit and the tally card from
`contentStageIndex + 1 = stageIndex % 3 + 1`. Telemetry: after 300 s the flow is on
`stageIndex` **7** (stage 8) in four of five seeds, and the HUD reads **STAGE 2**. After ten
minutes it is on stage ~16 and the HUD reads STAGE 1, 2 or 3. **A player cannot tell they have
got anywhere.** The 23 measured durations the flow lane wired in are real, and they are
invisible: structure laps at 23, content laps at 3, and only content is on screen.

*Everything else in the montage is the same picture.* Three palettes, four wave patterns
(`approach` / `overtake` / `crosser` / primed echelon), three flight models, four liveries. No
landmass, no island, no canyon, no resupply, no runway, no boss, no event. The 12 s "runway
restock" stage 5 is 12 seconds of desert. Minute two shows you everything minute ten will.

*And one 63-second music loop.* `music.js` renders a single 5-phrase flight track and
`setState` has exactly three states (`flight` / `title` / `off`). No per-stage variation, no
stage-clear fanfare. In ten minutes it plays through **9.5 times**.

### 3.3 Kill rate — a new arcade measurement, and we are well over it

**Arcade, MEASURED here.** The HIT counter is on the HUD, resets at every stage boundary, and is
legible at 4×. Operator in full: `ffmpeg -ss <t> -i ab2-longplay.mp4 -frames:v 1`, crop
`(330,18)-(500,56)` of 686×480 at 4× NEAREST, read by eye off `arcade/hit-sheet.png`, at
start + 3 s and end − 2 s of ten `STAGE_MAP.md`-verified spans.

| stage | span used | HIT start → end | kills/s |
|---|---|---|---|
| 1 | t91 → t118 | 0 → 12 | 0.444 |
| 2 | t127 → t154 | 1 → 12 | 0.407 |
| 3 | t163 → t194 | 0 → 10 | 0.323 |
| 4 | t203 → t238 | 0 → 17 | 0.486 |
| 6 | t263 → t302 | 0 → 26 | 0.667 |
| 7 | t311 → t338 | 0 → 8 | 0.296 |
| 9 | t379 → t422 | 0 → 10 | 0.233 |
| 12 | t515 → t546 | 2 → 12 | 0.323 |
| 16 | t659 → t690 | 2 → 26 | 0.774 |
| 19 | t771 → t806 | 6 → 15 | 0.257 |
| **pooled** | **326 s** | **137 kills** | **0.420** |

That is an expert exhibition pilot who clears the game without dying, so it is a generous upper
bound on a human.

**Ours**, same quantity, cross-validated against the score channel on every seed:

| | kills/s of flight |
|---|---|
| arcade (10 stages, measured above) | **0.420** |
| ours, `?demo=1` autopilot (trigger down ~16 %) | **1.013** — 2.4× |
| ours, stick centred, trigger held | **2.788** — 6.6× |
| ours, two-axis tracking, trigger held | **3.229** — 7.7× |

**A correction that matters, because it removes headroom the round thought it had.** The combat
lane reports "kill rate rose 0.078 → 0.23 per second of flight, still well under the arcade's
measured 0.54". `tools/fairness_probe.mjs:204` reads `kills: fair?.hits` — the **final value** of
`combat.hits`, a counter `_enterStage` **resets at every stage boundary**. It reports the kills
in whichever stage happened to be running when the probe stopped. My figure is 4.4× higher and
is cross-validated by a channel that cannot share the bug: `score.js` adds **nothing** per kill,
so `(scoreDelta − 3300·flightSeconds)/20 000` independently counts the kills that reached a
tally, and on every seed of every arm it equals my count minus the in-progress stage. (The
arcade's "0.54" has no citation in GAME_SPEC or REFERENCE either; my 0.420 does, above.)

### 3.4 Responsiveness

`control_probe.mjs`, from a settled standing start, both axes:

| | pitch (full up) | roll (full right) |
|---|---|---|
| ticks to move 1 native px | **1** (16.7 ms) | **1** (16.7 ms) |
| ticks to 50 % of the travel | 7 (117 ms) | 7 (117 ms) |
| ticks to 90 % | 23 (383 ms) | 24 (400 ms) |
| ticks to 99 % | 46 (767 ms) | 47 (783 ms) |

Instant onset, slow settle — `FOLLOW_RATE = 6.0` is an exponential, so "responsiveness" is two
numbers. The first is excellent and is what makes the stick feel connected. The second means a
full reposition takes about 0.4 s, which is the right order for AB2 and is **not** a problem; I
record it because it is the number any future input-latency claim has to be checked against, and
because it bears directly on §4 (0.4 s to move is nothing against a 2.9 s warning).

---

## 4. Fairness, judged separately from difficulty

**Fairness: it is not just fixed, it is over-delivered.** Pooled over **five different pilot
policies**, 7 500 s of wall clock, **476 fatal hits**:

| | value |
|---|---|
| fatal hits whose announcing flare lit **before the life began** (`announced:false`) | **0 of 476** |
| hits taken inside the 2.0 s respawn grace | **0** |
| **minimum** in-life warning across all 424 | **2.88 s** |
| median in-life warning | 3.03 – 3.88 s depending on policy |
| maximum | 5.17 s |
| `pHit` self-check (crossings inside radius == `playerHitsTaken`) | exact, all 8 arms |

The R5 residual — telegraph state surviving a respawn — is closed at the mechanism level
(`enemy.js abandonTrain()` on the same edge as `clearShots()`), and across every policy I threw
at it nothing got through. **This is the strongest engineering in the build and I could not
break it.**

**Now the part that is a problem, and it is a fairness problem dressed as a difficulty one.**

| | ours | arcade |
|---|---|---|
| enemy round's **mean screen life** | **2.90 – 3.05 s** | **≤ 0.37 s** |
| warning before a fatal hit | 2.88 – 5.17 s | — (bounded by the above) |

*Ours*, by Little's law on two independently-read quantities: `shotsFired / flightSeconds` =
2.29–2.49 rounds/s, mean `shotsInAir` = 6.72–7.22 → **2.90–3.05 s** per round. (Arithmetic from
`enemyShots.js SPEED = 10` over the 52→24 firing band predicts 2.24–5.04 s; the two agree.)

*Arcade*, measured — this is the measurement `enemyShots.js`'s own header asks for and says
"outranks this whole sweep". **→ `arcade/shot330/train-quadrant.png`**, 60 fps longplay stepped
at 1/30 s (the file carries duplicate frames; 1/30 s is its effective unique rate, verified by
hashing four consecutive 1/60 s extractions). The stage-7 train that `reference/stage7-enemy-
shot-train-t330.png` is cut from:

```
t329.733  no fireballs      t329.933  8
t329.767  1                 t329.967  ~12   (the whole train, as in the reference frame)
t329.800  3                 t330.000  ~12
t329.833  4                 t330.033  ~8
t329.867  6-7               t330.067  ~5
t329.900  7                 t330.100  2
                            t330.133  3 small, at the nose
```

**The entire 8–12-round train enters and clears in 12 consecutive 1/30 s frames — 0.37 s — and
is absent in the frames either side.** No individual round in it can have lived longer than
that. One train, one stage: it is a **bound**, not a distribution, and it is labelled as one.
It is corroborated by the reference frame's own geometry (10-16 fireballs strung across a third
of the frame at a single instant needs fast emission and short lives, not slow ones).

**So the arcade's threat is a thing that crosses the screen in a third of a second, and ours is
a thing that floats for three.** The telegraph is doing honest work and the contract holds — but
2.88 s of minimum warning against a 0.4 s reposition is not a dodge, it is a formality.

**And there is a cheaper lever than the one the round spent itself on.** The reason time of
flight *has* to carry the lethality is that **the aim carries no error at all**: `enemy.js`
snapshots the player's exact NDC at ignition and fires the train at
`aimX + sweepX·k·TRAIN_SWEEP_STEP_NDC` — a sweep *about an exact centre*, so the middle round of
every train is a perfect shot. That is why `still` reads `pHit` 100 %. The only miss mechanism in
the build is the player having moved, which is why the only way to make the game less lethal has
been to give the player more time to move, which is why the rounds are slow. **Give the aim an
error term and the two decouple**: `SPEED` could go back toward something that crosses the frame
in half a second — matching the one arcade number we now have — without returning to R5's death
rate. Nobody has tried that arm; it is not in `enemy.js`'s "MOVE NONE OF THESE FOUR ALONE" set
because it is a fifth thing that is not currently a constant at all.

### 4.1 Difficulty — and the bracket is the other way round from how it has been framed

Five pilot policies, 5 seeds × 300 s each, mortal:

| pilot | deaths/min **wall** | deaths/min **flight** | flight share | `pHit` |
|---|---|---|---|---|
| `still` — stick centred | **5.56** | 10.70 | 51.96 % | **100.0 %** (139/139) |
| `jinky` — full vertical reversals every 0.5 s | **5.12** | 9.22 | 55.52 % | 21.96 % |
| `jinkx` — full lateral reversals every 0.5 s | **4.12** | 6.43 | 64.12 % | 7.81 % |
| **`?demo=1` autopilot** | **2.16 ± 0.15** | 2.74 | 78.95 % | 2.48 % |
| **`evade` — reactive: commits 4 s away on every flare onset** | **2.08 ± 0.10** | 2.54 | 81.84 % | 2.29 % |
| *arcade, two independent measurements* | *1.91 / 2.04* | *2.78 – 2.94* | *69.4 – 73.5 %* | — |

**`still` reads `pHit` = 100 %: every single enemy round that reached the player's plane hit
him.** A clean 100 % is exactly the shape of this project's false alarms, so I did not take it on
the number: the arm's own control holds (116–139 crossings inside the kill radius, equal to
`playerHitsTaken` exactly), and the mechanism in `enemy.js` predicts it — the train is fired at a
snapshot of the player's NDC with **no error term**, so against a player who never moves the
centre round of every train is a perfect shot by construction. It is right, and it is the whole
difficulty model in one number: **the aim is perfect, and the only thing that ever makes a round
miss is the player having moved since the snapshot.** I did not inspect it in pixels; this is a
telemetry result with a mechanism behind it, not a frame reading.

**The standing framing — "an autopilot that cannot dodge should die far more than a human who
can, so our figure overstates difficulty" — is backwards on this build.** Of the four
non-reactive policies, the `?demo=1` autopilot is **the least lethal by a factor of two**.
Moving *more* makes it worse: a pilot reversing at full deflection twice a second dies **4.12**
times a minute, nearly double the autopilot. The mechanism is in the numbers: with a fairness
lag of 3.2–6.0 s, any **periodic** evasion returns to the aim point before the round arrives,
while the autopilot's slow incommensurate sinusoids (0.22 and 0.35 rad/s) drift monotonically
across the whole lag and never come back. **What defeats an aimed shot here is slow committed
displacement, not agility** — and the autopilot happens to do exactly that.

**So: by how much does `?demo=1` overstate difficulty for a real player? By about 4 %, and
that is the answer I would defend.** I built a pilot that does what a human does with a warning —
on every flare onset it commits to a full-deflection displacement away from where it is and
**holds it for 4 s**, long enough to cover the whole 3.2–6.0 s fairness lag, then goes back to
tracking targets. Over 5 seeds × 300 s it dies **2.08 ± 0.10 /min** against the autopilot's
**2.16 ± 0.15** — inside each other's error bars. Reacting buys almost nothing here, because the
thing that saves you is not reacting; it is **not re-crossing your own track**, and a slow
incommensurate sinusoid does that by accident.

That is worth stating plainly against the standing framing in STATUS.md gap 5, which carries
*0.00 (superplay) / 2.04 (human) / 2.90–3.00 (our non-reactive autopilot)* as "three pilots, not
three games" and reasons that a policy which cannot dodge should die far more than one that can.
**On this build it does not.** `?demo=1` is near the *best* non-reactive policy available, the
reactive one is no better, and a human at the controls should expect roughly the autopilot's
rate. **Our deaths/min figure is therefore close to honest, and 6–13 % above the arcade's
measured human rate — not comfortably below it once a human is assumed.** The one caveat I will
put on my own arm: `evade` also holds the trigger, so some of its survival is enemies it deleted
before they could fire. Its fire volume is the same as the autopilot's (132.8 against
132.9 rounds/min of wall clock), which bounds that effect but does not eliminate it.

I also reproduce the lane's lethality result on my own instrument: **2.16 ± 0.15 /min wall**
against their 2.229 ± 0.252, **2.74 /min flight** against their 2.850, **132.9 rounds/min of
wall clock** against their 133.3, `pHit` **2.484 %** against their 2.584 %. The gate
(≤2.0 wall) is missed by 0.16, 1.1 standard errors. **I would not spend another round on that
0.16.** It is inside the noise of *which pilot you measure*, and §2 says the difficulty problem
is not in the death rate at all.

---

## 5. The verbs

**Throttle — it has a consequence, just not a gameplay one, and that is worse than inert.**
The brief's framing ("nothing downstream consumes it") is not quite right, and the precise
version is the interesting one. `flow.js` threads `throttleIndex` into three places and they all
work: `scrollSpeed` (42.74 / 68.93 / 99.95 — the ground genuinely rushes), the HUD bar and
letter, and `THROTTLE_ENGINE_GAIN` into the audio. What it does **not** reach is anything that
changes play: `spawner.js THROTTLE_CLOSURE_MULT` is shipped `[1, 1, 1]` (a measured, documented
withdrawal — the lane's reasoning for it is sound and I would not overturn it), and
`clouds.js CLOUD_SPEED` is a fixed `9.5`.

The result is a **speed cue that disagrees with itself**. At H the ground runs **2.34×** faster
than at L; the clouds — the *nearer* objects, which should parallax faster — run at a constant
9.5 against a ground running 42.7–99.9, i.e. **4.5× to 10.5× slower**; and the enemies close at
exactly the same rate at all three detents. Push the throttle forward and one of the three
motion cues responds. That is not a throttle with no consequence; it is a throttle with an
*inconsistent* one, and a player will read the inconsistency before they read the speed.

**And `M` really is the datum — I checked, and nearly published the opposite.** At 686×480 and
under any resampling, the arcade's throttle glyph reads convincingly as **H**: two full-height
verticals with what looks like a mid crossbar. At source resolution it is unambiguously **M** —
the centre is filled at the *top* and empty at the *bottom*, which is this font's M, not an H's
middle bar. The criteria lane's "M in 27 of 27 samples" stands. **Recorded as a warning**: the
arcade's M is a false H at reduced resolution, and the letter that anchors every MEASURED flight
constant in this project must only ever be read at 1028×720.

**The sight is fixed and I verified it independently.** `control_probe.mjs` reads `__sight()`
(the drawn corners projected through the **live rolled** camera) against the jet's own projected
centre, every tick of a sweep into a hard bank:

| | roll swept | sight→jet lateral | **swing** | sight above nose |
|---|---|---|---|---|
| R4/R5 measured | 0 → 66.5° | — | **11.5 %W** | — |
| **e8fed58, mine** | **1.24° → 66.5°, 150 ticks** | 0.000 %W | **0.000 %W** | **15.0 %H, constant** |

R5's rank 6 is closed. The lock cone no longer depends on bank angle.

**One asymmetry left in the same area, flagged not costed.** `_findAssistTarget` centres its
cone laterally on `playerNdc.x` but vertically on `sight.y`. Since the R6 fix, `sight.x` under
bank is *not* `playerNdc.x`, so the assist cone's centre is a point that is neither the airframe
nor the sight — up to 0.105 NDC off at full deflection, against a cone radius of 0.26 NDC. Small,
but it is the kind of thing that should be one point or the other on purpose.

**Missiles are a fifth of the game.** Same pilot, same seeds, trigger held, 3 × 150 s: with
missiles **2.747 kills/s**, gun only **2.204 kills/s**. The vulcan does **80 %** of the killing.
The stock-limited, lock-accumulating, six-at-once salvo that is AB2's signature is a garnish on a
weapon that needs no aiming.

**Barrel roll**: drawn and verified by the flow lane; I did not re-measure it. It is also not a
verb with a consequence — there are no i-frames (GAME_SPEC §1 lists them as ASSUMED) and nothing
in `combat.js` reads `isRolling()`. It is an animation you can trigger.

---

## 6. The player's own aircraft — R5's rank 2, re-judged

**Mostly closed, and the remaining half is a different problem from the one that was named.**

| | measured |
|---|---|
| ticks where the player outspans **every** enemy on screen | **99.5 – 99.9 %** |
| biggest enemy on screen, p95 / max | **27–28 %W / 36.6 %W** (player 35.6 %W) |
| ticks with ≥1 enemy centre inside the jet's own drawn box | **74 %** (mean 1.9 aircraft) |

Operator for the last row, published because it is generous: the box is the jet's measured
35.6 %W span and, at its measured 3.3:1 bbox aspect, 10.8 %H tall, compared in the **screen**
frame; "inside" means the enemy's projected centre lands in it. That over-counts relative to
visible fuselage occlusion, but an aircraft whose centre is within 17.8 %W and 7.7 %H of yours is
on top of you.

So the jet is now the biggest and brightest thing on screen essentially always — R5's "same
screen size, same value range" is fixed — and it is still **occluded three ticks in four**.

The 36.6 %W maximum is worth naming because it is reproducible and it is one aircraft type: a
`bomber` carries `widthScale 1.35`, so at `FLY_PAST_DEPTH = 2.6` it draws
`1.05 × 1.35 / (1.4873 × 2.6)` = **36.7 %W** — above GAME_SPEC §4's MEASURED 25–30 %W fly-past
band, and above the player's own 35.6 %W. For the fraction of a second a bomber goes over your
head it is the biggest thing on screen. That is the 0.1–0.5 % of ticks in the first row.

**And one correction to the R5 critique's arcade claim, from the frames.** "In the arcade the
player's jet is the biggest, brightest, most central thing on screen and is never in doubt" is
not what stage 1 looks like. **→ `feel-06-jet-vs-arcade-common-native.png`** (both sides brought
to a common 320×224 native raster): at longplay t116.000 an enemy of **comparable size and
comparable value** sits directly overlapping the player. What separates them there is **hue** —
the enemy carries green camo wing markings the player does not — not size and not brightness.
Our stage-1 enemies are grey against a cream player. If this gap is worked again, the lever the
arcade actually uses is **colour separation on the enemy**, not more size or more value on the
player.

---

## 7. Audio — read, not heard

**Inferred from code. I have heard nothing; every capture is muted by construction.**

**Closed since R5:** `playEnemyFlyPast` now has a call site (`spawner.js:503`, gated on a near
despawn and panned from the aircraft's own `ndc.x`) — R5's rank 9 is done.

**Still open, and the first is the biggest:**

* **One 63-second loop for the whole game.** `music.js` renders a single 5 × 8-bar track at
  152 bpm, A natural minor, i–VI–VII–i, and `setState` has three states. There is **no per-stage
  music, no stage-clear fanfare, and no cue at a stage boundary at all** beyond the tally's
  `tallyTick` blips. Over ten minutes that loop plays 9.5 times under a game whose visuals
  already lap every three stages. *This is the single cheapest thing on this list and the one
  that most affects the ten-minute question.*
* **There is still no sound for an enemy round leaving the barrel.** `HANDLERS` has no entry for
  it. The 1.0 s telegraph — the mechanism the whole fairness model rests on — has a visual flare
  and **no audible onset**; the only threat audio is `setInboundWarning`, a continuous warble.
  A 1 s warning you can only see is half a warning.
* **The player's death shares its body with a bomber kill.** `playPlayerDeath` calls
  `playExplosion(true)`, and so does any `enemy.type === 'bomber'` kill. They differ only by an
  added descending saw wail. The most important sound in the game is a routine one plus a tail.
* **The afterburner is still a step, not a swell.** `smoothstep(0.75, 1.0, s) × 0.14` against
  `THROTTLE_ENGINE_GAIN = [0.30, 0.65, 1.0]` is **0 at L, 0 at M, full at H**. Unchanged from R5.
  The base layer does move usefully (filter 480 → 865 → 1250 Hz, gain 0.086 → 0.128 → 0.170), so
  L→M→H *is* audible as speed; it is the thing the game is named after that arrives as a switch.
* **The vulcan is still tonal-dominant**: a 1100 Hz square at gain 0.22 with the noise snap at
  0.15, 40 ms events at 80 ms spacing. Unchanged from R5, and the fix is still to decouple the
  audio rate from `FIRE_INTERVAL_S` rather than to move it.
* One R5 claim to correct: the `big` explosion variant does differ in **timbre**, not only in
  duration and level — its sub starts at 70 Hz rather than 90. The noise body's sweep
  (4500 → 250 Hz) is identical, which is why it still reads as the same event.

**What a human should listen for, in priority order:**
1. **Play for ten minutes and say when you notice the music has repeated.** That is the test.
2. Is there a hole where an enemy shooting at you should be? (Watch a flare light; listen.)
3. Does the vulcan read as a weapon or a typewriter? (Hold fire for 3 s.)
4. Can you tell your own death from a bomber kill with your eyes shut?
5. Does H read as an afterburner, or just as louder?
6. Does the inbound warble teach you or exhaust you over two minutes?

---

## 8. Ranked by how much it damages the experience

| # | what | where | why this rank |
|---|---|---|---|
| **1** | **The gun plays the game.** Trigger held, stick centred: 2.79 kills/s = 86.3 % of a tracking pilot's score, 6.6× the arcade's measured 0.420/s. `vulcan.resolveHits` has **no depth gate** — rounds reach depth 55 while "readable" starts at depth 7 | `weapons/vulcan.js`, `weapons/combat.js` | it removes the point of aiming, of missiles, and of the vertical axis at once, and it empties the sky: 93.8 % of flight ticks with nothing at readable size. R4's fix was applied to the assist cone, not to hit resolution |
| **2** | **No sense of progression.** The stage digit never exceeds 3 for any length of run; 23 real durations lap against 3 looks | `game/flow/flow.js` (`contentStageIndex + 1` drives both HUD and tally) | this is the ten-minute question in one line. Showing the true `stageIndex` is one expression |
| **3** | **The vertical stick is worth 1.4 % of the score.** The distribution is right; the engagement is not | `combat.js` assist cone (±18.6 points of H), `lockSystem.js` (±31.5), `spawner.js REACH_CEILING_NDC_Y` | the round's headline gap is half-closed and the half that is open is the half a player feels |
| **4** | **`REACH_CEILING_NDC_Y = 0.64` is derived from two wrong numbers** and is the entire readable-top-third residual; it can be lifted today without touching `ENVELOPE_Y` | `game/spawner.js` | one line, already costed, and the premise is now measured (§2.3) |
| **5** | **Enemy rounds live ~8× longer on screen than the arcade's** (2.90–3.05 s against a ≤0.37 s bound) and announce themselves 2.88–5.17 s ahead | `weapons/enemyShots.js SPEED`, `entities/enemy.js` aim snapshot | the threat reads as drifting, not as incoming. Do **not** act by raising `SPEED` alone — it is the lethality lever this round spent itself on. The lever that decouples them is an **aim error term**, which does not exist today: the train's centre round is a perfect shot, which is why `still` reads `pHit` 100 % (§4) |
| **6** | **One 63 s music loop, no stage-clear cue, no enemy-fire sound** | `audio/music.js`, `audio/sfx.js` | the cheapest item here that bears on ten minutes |
| **7** | **The throttle's one consequence disagrees with the other two cues** — ground ×2.34 across the range, clouds fixed at 9.5 (4.5–10.5× slower than the ground), enemy closure ×1 | `render/clouds.js CLOUD_SPEED`, `spawner.js THROTTLE_CLOSURE_MULT` | `CLOUD_SPEED` is one constant and is the cheapest unclaimed speed cue in the build, now for the third round running |
| **8** | **74 % of flight ticks have an enemy overlapping the player's own footprint** | `game/spawner.js`, depth order | the jet is now the biggest and brightest; what is left is traffic. The arcade separates by **hue** on the enemy (§6) |
| **9** | **Missiles are 20 % of the kills** | `weapons/missiles.js`, and #1 | the signature weapon is a garnish while the gun needs no aiming |
| **10** | **The barrel roll has no consequence** — drawn, triggerable, and read by nothing | `entities/player.js`, `weapons/combat.js` | i-frames are ASSUMED in GAME_SPEC; decide, then wire or document |
| **11** | **Last-life dread.** The icons are legible now (authored keyline, verified at 14×) but nothing escalates: no colour change, no sound, no HUD change | `ui/hud.js`, `game/flow/flow.js` | continues arrive every ~83 s, which matches the arcade's ~88 s — the pacing is right and the signalling is missing |
| **12** | **The death starburst is drawn at the jet's screen position, not screen-centred** | `game/flow/deathSequence.js` | minor; the arcade's fills the frame from wherever you were |

**Not on this list, deliberately — things I checked and would leave alone:**
the 0.16 deaths/min gate miss (§4.1); `DEATH_TOTAL_S = 5.2` (restoring it toward 7.8 s costs
flight share to fix a statistic that already matches, and R5's own argument for cutting it was
sound); the sight square (closed, §5); the respawn fairness hole (closed, §4); the attract loop
(works, walks three palettes); `?demo=1`'s roam amplitudes (they are solved against published
composition statistics — but see §2.3, they must never again be quoted as properties of the
aircraft).

---

## 9. Observed / measured / inferred

**Observed in frames** (`tools/out/feel-critic-r6/`, 121 frames in 3 sets, all swept with a
self-tested sweep, 0 black, 0 duplicates): every tile of a 60-second run containing aircraft; the
death cycle keeping a live sky under the starburst; ten minutes at 30 s intervals showing three
palettes and a stage digit that never passes 3; the life icons at 14×; our stage-1 frame against
the arcade's at a common native raster.

**Observed in the arcade footage**: the HIT counter at the start and end of ten stage spans; the
stage-7 shot train entering and clearing in 12 consecutive 1/30 s frames; an enemy of comparable
size and value overlapping the player at t116; the throttle glyph at source resolution.

**Measured by telemetry, not visible in frames** (8 arms, ~5.5 M enemy samples, every tick): all
four pilot kill rates and the 1.4 % / 11.5 % / 15.8 % split; the drought shares; the enemy
altitude distribution in both NDC frames; the player's 42.22-point vertical envelope and both
settle curves; cone occupancy; 424 fatal hits with 0 unannounced; `pHit` per policy including the
`still` arm's 100 %; the enemy round's 2.90–3.05 s mean life; the 74 % overlap share; the kill
counts and their score cross-validation.

**Inferred from code only — not experienced**: all of §7; the claim in §2.2 that the automated
vertical aim *feels* like the gun playing itself (the 1.4 % is measured, the feeling is not);
whether 2.88 s of warning reads as generous or as slack. **Someone has to hold the controls and
put headphones on.** §§2, 3, 4, 6 stand without that; §7 does not.

**Withdrawn before publishing**: a reading of the arcade's throttle letter as `H` (§5) — correct
at 686×480, wrong at source resolution, and it would have inverted a MEASURED datum that anchors
every flight constant in the project.

**No source file was modified. Nothing committed, nothing pushed.** The scratch worktree at
`…/scratchpad/ab-e8fed58` is detached-HEAD and can be removed with `git worktree remove`.

### Evidence

| file | shows |
|---|---|
| `feel-01-one-minute.png` | 72 tiles = 60 s of `?demo=1`; zero empty tiles |
| `feel-02-jet-prominence-OURS-top3-ARCADE-bot3.png` | our frames against arcade longplay t329–330 |
| `feel-03-lives-14x.png` | the life icons at 14×, 2 lives then 1, over sea and over desert |
| `feel-04-death-cycle.png` | the death at 0.25 s steps: fireball on the jet → screen starburst, world still flying, score pinned |
| `feel-05-ten-minutes-30s.png` | **600 s at 30 s intervals — three palettes, and a stage digit that never passes 3** |
| `feel-06-jet-vs-arcade-common-native.png` | ours vs arcade stage 1 at a common 320×224 raster |
| `feel-07-arcade-speed-letter-5x.png` | the throttle glyph that reads `H` until you look at it properly |
| `arcade/hit-sheet{-a,-b}.png` | the 20 HIT-counter reads behind the 0.420 kills/s |
| `arcade/shot330/train-quadrant.png` | the whole arcade shot train entering and clearing in 0.37 s |
| `arcade/shot117/grid.png` | arcade stage 1 at 1/30 s, for the jet-prominence and sea comparisons |

Probes, raw JSON and the self-tested sweep are in `tools/out/feel-critic-r6/`:
`feel_probe_r6{,b,c}.mjs`, `control_probe.mjs`, `analyse.py`, `sweep.py`,
`arcade/track_shots.py`, `selftest.json`, `run-*.json`, `wt-*.json`, `b-*.json`, `control.json`.
